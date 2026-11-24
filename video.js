// שיחת וידאו מובנית (WebRTC). האיתות עובר דרך מסד הנתונים, והווידאו עצמו עובר ישירות בין שני הטלפונים.
import { esc, avatar, toast, sound } from './ui.js';
import { createBoard } from './board.js';
import { createGame } from './coplay.js';

const ICE = {iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}]};
let active = null;
export const inCall = () => !!active;

function ui(otherId, otherName, status){
  const el = document.createElement('div'); el.className = 'call';
  el.innerHTML = `<video id="rv" autoplay playsinline></video><video id="lv" autoplay playsinline muted></video>
    <div class="callwait" id="cw"><div>${avatar(otherId, otherName, 110)}<h2>${esc(otherName)}</h2><div class="muted" id="cs">${esc(status)}</div></div></div>
    <div class="callinfo"><b class="fred big">${esc(otherName)}</b><div class="small" id="ct"></div></div>
    <div class="callbar" id="cb"></div>`;
  document.body.appendChild(el); return el;
}

async function getMedia(){
  try { return await navigator.mediaDevices.getUserMedia({video:{facingMode:'user', width:{ideal:720}}, audio:{echoCancellation:true, noiseSuppression:true}}); }
  catch { try { return await navigator.mediaDevices.getUserMedia({audio:true}); } catch { return null; } }
}

function wire(B, cid, el, pc, stream, myRole, me, other){
  const unsubs = [];
  let started = 0, timer;
  const remote = new MediaStream();
  el.querySelector('#rv').srcObject = remote;
  pc.ontrack = e => { e.streams[0] ? e.streams[0].getTracks().forEach(t => remote.addTrack(t)) : remote.addTrack(e.track); };
  pc.onicecandidate = e => { if(e.candidate) B.callAddCand(cid, myRole, e.candidate.toJSON()).catch(() => {}); };
  pc.onconnectionstatechange = () => {
    const s = pc.connectionState;
    if(s === 'connected' && !started){ started = Date.now(); el.querySelector('#cw').style.display = 'none';
      timer = setInterval(() => { const t = Math.floor((Date.now()-started)/1000); el.querySelector('#ct').textContent = `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`; }, 1000); }
    if(s === 'failed') { toast('החיבור נכשל. נסו שוב, אולי ברשת Wi-Fi אחרת'); end(true); }
  };
  if(stream){ el.querySelector('#lv').srcObject = stream; stream.getTracks().forEach(t => pc.addTrack(t, stream)); }
  else { el.querySelector('#lv').style.display = 'none'; pc.addTransceiver('audio',{direction:'recvonly'}); pc.addTransceiver('video',{direction:'recvonly'}); }
  if(stream && !stream.getVideoTracks().length) pc.addTransceiver('video',{direction:'recvonly'});
  // מועמדי חיבור מהצד השני (שומרים בתור עד שיש תיאור מרוחק)
  const seen = new Set(), queue = [];
  const flush = () => { while(queue.length && pc.remoteDescription) pc.addIceCandidate(queue.shift()).catch(() => {}); };
  unsubs.push(B.onCallCands(cid, myRole === 'caller' ? 'callee' : 'caller', list => {
    list.forEach(c => { const k = JSON.stringify(c); if(!seen.has(k)){ seen.add(k); queue.push(new RTCIceCandidate(c)); } }); flush();
  }));
  const bar = el.querySelector('#cb');
  bar.innerHTML = `<button id="mu" aria-label="השתקה">🎤</button><button id="ca" aria-label="מצלמה">📷</button><button id="fl" aria-label="החלפת מצלמה">🔄</button><button class="end" id="hu" aria-label="ניתוק">📞</button>`;
  const toggle = (kind, btn) => { const t = stream?.getTracks().filter(x => x.kind === kind); if(!t?.length) return; const on = !t[0].enabled; t.forEach(x => x.enabled = on); btn.classList.toggle('off', !on); };
  bar.querySelector('#mu').onclick = e => toggle('audio', e.currentTarget);
  bar.querySelector('#ca').onclick = e => toggle('video', e.currentTarget);
  let facing = 'user';
  bar.querySelector('#fl').onclick = async () => {
    if(sharing) return toast('אי אפשר להחליף מצלמה בזמן שיתוף מסך');
    try { facing = facing === 'user' ? 'environment' : 'user';
      const ns = await navigator.mediaDevices.getUserMedia({video:{facingMode:facing}}); const nt = ns.getVideoTracks()[0];
      const sender = pc.getSenders().find(s => s.track?.kind === 'video'); await sender?.replaceTrack(nt);
      stream.getVideoTracks().forEach(t => { t.stop(); stream.removeTrack(t); }); stream.addTrack(nt);
      el.querySelector('#lv').style.transform = facing === 'user' ? 'scaleX(-1)' : 'none';
    } catch { toast('אין מצלמה נוספת'); }
  };
  bar.querySelector('#hu').onclick = () => end(true);

  // ===== כלים בשיחה: לוח ציור, שיתוף מסך, משחקים =====
  const myId = me?.id, otherName = other?.name || 'החברותא';
  const panel = document.createElement('div'); panel.className = 'callpanel';
  panel.innerHTML = '<div class="pb"></div><div class="pg"></div>';
  el.insertBefore(panel, el.querySelector('#cb'));
  const tools = document.createElement('div'); tools.className = 'calltools';
  tools.innerHTML = '<button data-t="board" aria-label="לוח ציור משותף">🖊️ לוח</button><button data-t="screen" aria-label="שיתוף מסך">🖥️ שיתוף מסך</button><button data-t="game" aria-label="משחקים">🎮 משחקים</button>';
  el.appendChild(tools);
  let tool = null, closedAt = 0, sharing = null;
  const open = t => {
    tool = t; panel.dataset.show = t || ''; el.classList.toggle('split', !!t);
    tools.querySelectorAll('[data-t="board"],[data-t="game"]').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    if(!t) closedAt = Date.now(); else if(t === 'board') setTimeout(() => board.fit(), 40);
  };
  const board = createBoard(panel.querySelector('.pb'), {
    add: d => B.callAddCand(cid, 'board', d).catch(() => {}),
    on: cb => B.onCallCands(cid, 'board', cb),
  }, {myId, onRemote: () => { if(tool !== 'board' && Date.now() - closedAt > 20000){ open('board'); toast(`🖊️ ${otherName} מצייר/ת על הלוח`); } }});
  const game = createGame(panel.querySelector('.pg'), {
    set: (patch, replace) => B.gameSet(cid, patch, replace).catch(() => {}),
    on: cb => B.onGame(cid, cb),
  }, {myId, otherId: other?.id, otherName, subject: other?.subject,
      onInvite: () => { if(tool !== 'game'){ open('game'); toast(`🎮 ${otherName} הזמין/ה אותך למשחק`); } }});
  unsubs.push(() => board.destroy(), () => game.destroy());

  async function stopShare(notify = true){
    if(!sharing) return;
    const s = sharing; sharing = null;
    s.track.onended = null; s.track.stop();
    const cam = stream?.getVideoTracks()[0], sender = pc.getSenders().find(x => x.track?.kind === 'video' || x === s.sender);
    try { await sender?.replaceTrack(cam || null); } catch {}
    el.querySelector('#lv').srcObject = stream || null; el.querySelector('#lv').style.transform = 'scaleX(-1)';
    tools.querySelector('[data-t="screen"]').classList.remove('on');
    if(notify) B.callSet(cid, {share:{by:myId, on:false}}).catch(() => {});
  }
  async function startShare(){
    if(!navigator.mediaDevices?.getDisplayMedia) return toast('שיתוף מסך זמין בדפדפן במחשב (Chrome, Edge, Safari). בטלפון הדפדפן לא תומך בזה');
    const sender = pc.getSenders().find(x => x.track?.kind === 'video');
    if(!sender) return toast('כדי לשתף מסך צריך מצלמה פעילה בשיחה');
    try {
      const ds = await navigator.mediaDevices.getDisplayMedia({video:true, audio:false}), track = ds.getVideoTracks()[0];
      await sender.replaceTrack(track); sharing = {track, sender};
      track.onended = () => stopShare();
      el.querySelector('#lv').srcObject = ds; el.querySelector('#lv').style.transform = 'none';
      tools.querySelector('[data-t="screen"]').classList.add('on');
      B.callSet(cid, {share:{by:myId, on:true}}).catch(() => {});
      toast('🖥️ אתה משתף את המסך. לעצירה לחץ שוב על הכפתור');
    } catch(e){ if(e?.name !== 'NotAllowedError') toast('לא הצלחנו לשתף את המסך'); }
  }
  tools.onclick = e => {
    const b = e.target.closest('[data-t]'); if(!b) return;
    if(b.dataset.t === 'screen') return sharing ? stopShare() : startShare();
    open(tool === b.dataset.t ? null : b.dataset.t);
  };
  // הצד השני משתף מסך: להציג אותו במלואו ולא חתוך
  unsubs.push(B.onCall(cid, d => {
    const rs = !!(d?.share?.on && d.share.by && d.share.by !== myId);
    if(rs && !el.classList.contains('rshare')) toast(`🖥️ ${otherName} משתף/ת מסך`);
    el.classList.toggle('rshare', rs);
  }));
  function end(notify){
    if(!active) return; active = null;
    clearInterval(timer); if(typeof sharing !== 'undefined' && sharing){ try { sharing.track.stop(); } catch {} sharing = null; }
    unsubs.forEach(f => f && f()); stream?.getTracks().forEach(t => t.stop()); try { pc.close(); } catch {}
    el.remove();
    if(notify){ B.callSet(cid, {state:'ended'}).catch(() => {}); B.updateChat(cid, {'call.active': false}).catch(() => {}); }
    if(started) toast(`השיחה הסתיימה · ${el.querySelector('#ct').textContent}`);
  }
  active = {end, cid};
  return {unsubs, end, setStatus: t => { const s = el.querySelector('#cs'); if(s) s.textContent = t; }};
}

export async function startCall(B, cid, me, other){
  if(active) return;
  if(!window.RTCPeerConnection) return toast('הדפדפן הזה לא תומך בשיחות וידאו');
  const el = ui(other.id, other.name, 'מתקשר…');
  active = {end(){}};
  const stream = await getMedia();
  if(!stream) toast('אין גישה למצלמה ולמיקרופון. אפשר לאשר בהגדרות הדפדפן');
  await B.callReset(cid);
  const pc = new RTCPeerConnection(ICE);
  active = null;
  const w = wire(B, cid, el, pc, stream, 'caller', me, other);
  const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
  await B.callSet(cid, {offer:{type:offer.type, sdp:offer.sdp}, from:me.id, state:'ringing', at:Date.now()}, true);
  await B.updateChat(cid, {call:{from:me.id, name:me.name, at:Date.now(), active:true}});
  let ring = setInterval(() => sound('ring'), 2500); sound('ring');
  const giveUp = setTimeout(() => { if(!pc.remoteDescription){ toast(`אין מענה מ${other.name}. אפשר לנסות שוב אחר כך`); w.end(true); } }, 45000);
  w.unsubs.push(() => { clearInterval(ring); clearTimeout(giveUp); });
  w.unsubs.push(B.onCall(cid, async d => {
    if(!d) return;
    if(d.state === 'declined'){ toast(`השיחה נדחתה. אפשר לנסות שוב אחר כך`); w.end(false); B.updateChat(cid,{'call.active':false}).catch(()=>{}); return; }
    if(d.state === 'ended'){ w.end(false); return; }
    if(d.answer && !pc.currentRemoteDescription){ clearInterval(ring); w.setStatus('מתחבר…');
      await pc.setRemoteDescription(new RTCSessionDescription(d.answer)); }
  }));
}

export async function answerCall(B, cid, me, other){
  if(active) return;
  const el = ui(other.id, other.name, 'מתחבר…');
  active = {end(){}};
  const stream = await getMedia();
  const pc = new RTCPeerConnection(ICE);
  active = null;
  const w = wire(B, cid, el, pc, stream, 'callee', me, other);
  const d = await B.getCall(cid);
  if(!d?.offer || d.state === 'ended'){ toast('השיחה כבר הסתיימה'); return w.end(false); }
  await pc.setRemoteDescription(new RTCSessionDescription(d.offer));
  const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
  await B.callSet(cid, {answer:{type:ans.type, sdp:ans.sdp}, state:'live'});
  w.unsubs.push(B.onCall(cid, x => { if(x?.state === 'ended') w.end(false); }));
}

export function declineCall(B, cid){
  B.callSet(cid, {state:'declined'}).catch(() => {});
  B.updateChat(cid, {'call.active': false}).catch(() => {});
}
