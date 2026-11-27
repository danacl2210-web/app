// חברותא קבוצתית: קבוצות לימוד לפי מקצוע ונושא, צ׳אט קבוצתי ושיחת וידאו לעד 4 משתתפים (רשת ישירה בין הטלפונים).
import { esc, avatar, toast, sheet, sound, confetti } from './ui.js';
import { ICON, SUBJECTS } from './games.js';
import { topicsOf } from './topics.js';
import { createBoard } from './board.js';

import { getIce } from './ice.js';
const MAXCALL = 4;
let gcall = null;
export const inGroupCall = () => !!gcall;
const timeStr = t => new Date(t).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'});
const whenStr = t => new Date(t).toLocaleString('he-IL', {weekday:'long', day:'numeric', month:'numeric', hour:'2-digit', minute:'2-digit'});

export function createGroups(ctx){
  const B = () => ctx.B(), me = () => ctx.me(), myId = () => ctx.myId();
  let list = [], unsubList = null;

  function watch(cb){ unsubList && unsubList(); unsubList = B().onGroups(l => { list = l; cb(l); }); return () => { unsubList && unsubList(); unsubList = null; }; }
  const isMember = g => (g.members || []).includes(myId());
  const live = g => Object.values(g.live || {}).filter(v => Date.now() - (v.h || 0) < 45000).length;

  const card = g => { const n = (g.members || []).length, full = n >= (g.max || 4), mem = isMember(g), l = live(g);
    return `<div class="card gcard" data-g="${esc(g.id)}"><div class="row between"><b>${ICON[g.subject] || '👥'} ${esc(g.title || g.subject)}</b>${l ? `<span class="tag help">🟢 ${l} בשיחה</span>` : ''}</div>
      <div class="small muted">${esc(g.subject)}${g.topic ? ' · ' + esc(g.topic) : ''} · מארח/ת: ${esc(g.hostName || '')}</div>
      <div class="small" style="margin-top:4px">${g.at ? '🗓️ ' + esc(whenStr(g.at)) : '⏱️ פתוחה כל הזמן'}</div>
      <div class="row between" style="margin-top:8px"><div class="row" style="gap:-6px">${(g.members || []).slice(0, 5).map(u => avatar(u, g.names?.[u] || '?', 30)).join('')}<span class="small muted" style="margin-inline-start:8px">${n}/${g.max || 4}</span></div>
      <button class="btn sm ${mem ? 'grn' : ''}" data-join="${esc(g.id)}" ${!mem && full ? 'disabled' : ''}>${mem ? 'כניסה' : full ? 'מלאה' : 'הצטרפות'}</button></div></div>`; };

  function renderTab(host){
    host.innerHTML = '<div class="skel"></div><div class="skel"></div>';
    let sig = '';
    const draw = l => {
      if(!host.isConnected) return;
      const sg = JSON.stringify(l.map(g => [g.id, g.members, g.live, g.at, g.title])); if(sg === sig) return; sig = sg;
      const vis = l.filter(g => !g.at || g.at > Date.now() - 3 * 3600e3 || isMember(g)).sort((a, b) => (isMember(b) - isMember(a)) || ((a.at || 0) - (b.at || 0)));
      host.innerHTML = `<button class="btn" id="gnew">＋ יצירת קבוצת לימוד</button>
        <p class="small muted" style="margin:0">לומדים ביחד עד ${MAXCALL} תלמידים: צ׳אט, וידאו, לוח ציור משותף ושיתוף מסך.</p>
        ${vis.length ? vis.map(card).join('') : `<div class="card empty">עוד אין קבוצות פעילות.<br>צור את הראשונה ותזמין חברים 💫</div>`}`;
      host.querySelector('#gnew').onclick = createSheet;
      host.querySelectorAll('[data-join]').forEach(b => b.onclick = () => joinOrOpen(b.dataset.join));
    };
    draw(list); return watch(draw);
  }

  async function joinOrOpen(gid){
    const g = list.find(x => x.id === gid); if(!g) return;
    if(!isMember(g)){
      if((g.members || []).length >= (g.max || 4)) return toast('הקבוצה מלאה');
      try { await B().joinGroup(gid, myId(), me().name); B().gSend(gid, {from:myId(), name:me().name, type:'sys', text:`${me().name} הצטרף/ה לקבוצה 👋`}).catch(() => {}); } catch(e){ return toast(ctx.errMsg(e)); }
    }
    openRoom(gid);
  }

  function createSheet(){
    const subs = [...new Set([...(me().need || []), ...(me().help || []), ...SUBJECTS])];
    sheet(`<h3>👥 קבוצת לימוד חדשה</h3>
      <label>מקצוע</label><select id="gs">${subs.map(s => `<option>${esc(s)}</option>`).join('')}</select>
      <label>נושא <span class="muted small">(לא חובה)</span></label><select id="gt"></select>
      <label for="gn">שם הקבוצה</label><input id="gn" maxlength="40" placeholder="למשל: חזרה למבחן בנגזרות">
      <label for="gw">מתי? <span class="muted small">(לא חובה, אפשר להשאיר פתוח)</span></label><input id="gw" type="datetime-local">
      <label>כמה משתתפים</label><div class="seg" id="gm">${[3, 4, 5, 6].map(n => `<button data-n="${n}" class="${n === 4 ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="small muted">בשיחת וידאו קבוצתית יכולים להיות עד ${MAXCALL} במקביל.</p>
      <button class="btn grn" id="gc">יצירה</button>`, (el, close) => {
        const gs = el.querySelector('#gs'), gt = el.querySelector('#gt'); let max = 4;
        const fill = () => gt.innerHTML = '<option value="">כל הנושאים</option>' + topicsOf(gs.value).map(t => `<option>${esc(t)}</option>`).join('');
        gs.onchange = fill; fill();
        el.querySelector('#gm').onclick = e => { const b = e.target.closest('[data-n]'); if(!b) return; max = +b.dataset.n; el.querySelectorAll('#gm button').forEach(x => x.classList.toggle('on', x === b)); };
        el.querySelector('#gc').onclick = async e => {
          const subject = gs.value, topic = gt.value, w = el.querySelector('#gw').value, at = w ? new Date(w).getTime() : 0;
          if(w && at < Date.now() - 60000) return toast('בחר זמן עתידי');
          const title = ctx.clean((el.querySelector('#gn').value.trim() || `${subject}${topic ? ': ' + topic : ''}`));
          e.target.disabled = true;
          try { const id = await B().createGroup({title, subject, topic, at, max, hostId:myId(), hostName:me().name, members:[myId()], names:{[myId()]:me().name}, createdAt:Date.now()});
            close(); confetti(); toast('הקבוצה נוצרה! שתף חברים 🎉'); openRoom(id); }
          catch(err){ e.target.disabled = false; toast(ctx.errMsg(err)); }
        };
      });
  }

  function openRoom(gid){
    ctx.cleanup();
    const app = ctx.app; let g = list.find(x => x.id === gid), msgs = [];
    app.innerHTML = `<div class="chatwrap"><div class="chathead"><button class="link" id="bk" aria-label="חזרה" style="font-size:22px">→</button>
      <div class="grow"><b id="hn">${esc(g?.title || '')}</b><div class="small muted" id="hs"></div></div>
      <button class="iconbtn vid" id="vc" aria-label="וידאו קבוצתי">🎥</button><button class="iconbtn" id="more" aria-label="עוד">⋯</button></div>
      <div class="gmembers" id="gm"></div><div class="msgs" id="ms"></div>
      <div class="composer"><textarea id="tx" placeholder="כתוב לקבוצה…" rows="1" aria-label="הודעה"></textarea><button class="iconbtn send" id="sd" aria-label="שליחה">➤</button></div></div>`;
    const $ = s => app.querySelector(s);
    const drawHead = () => { if(!g) return; $('#hn').textContent = g.title; const l = live(g);
      $('#hs').textContent = `${ICON[g.subject] || ''} ${g.subject}${g.topic ? ' · ' + g.topic : ''}${g.at ? ' · ' + whenStr(g.at) : ''}`;
      $('#gm').innerHTML = (g.members || []).map(u => `<span class="gmem">${avatar(u, g.names?.[u] || '?', 28)}<small>${esc(g.names?.[u] || '')}</small></span>`).join('') + (l ? `<span class="tag help">🟢 ${l} בשיחה</span>` : ''); };
    const drawMsgs = () => { const box = $('#ms'); if(!box) return; const bottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      box.innerHTML = msgs.length ? msgs.map(m => m.type === 'sys' ? `<div class="sys">${esc(m.text)}</div>`
        : `<div class="msg ${m.from === myId() ? 'me' : 'them'}">${m.from !== myId() ? `<b class="small" style="color:var(--sky)">${esc(m.name || '')}</b><br>` : ''}${esc(m.text)}<time>${timeStr(m.at)}</time></div>`).join('') : '<div class="empty">פתחו את השיחה 👋</div>';
      if(bottom || box.dataset.f !== '1'){ box.scrollTop = box.scrollHeight; box.dataset.f = '1'; } };
    ctx.view(B().onGroup(gid, x => { if(!x){ toast('הקבוצה נסגרה'); return ctx.exit(); } g = {id:gid, ...x}; drawHead(); }));
    ctx.view(B().onGMsgs(gid, m => { const n = m.length; msgs = m; drawMsgs(); if(n && m[n - 1].from !== myId() && m[n - 1].type !== 'sys') ctx.scanIn(m[n - 1].text, {id:m[n - 1].from, name:m[n - 1].name}, m[n - 1].at); }));
    drawHead(); drawMsgs();
    $('#bk').onclick = ctx.exit;
    const tx = $('#tx');
    const send = async () => { const raw = tx.value.trim(); if(!raw) return;
      const go = async () => { tx.value = ''; tx.style.height = ''; const t = ctx.clean(raw);
        try { await B().gSend(gid, {from:myId(), name:me().name, type:'text', text:t}); ctx.scanOut(raw); } catch(e){ toast(ctx.errMsg(e)); } };
      const hl = ctx.hurt(raw); if(hl) return ctx.nudge(hl, raw, go, () => tx.focus()); go(); };
    $('#sd').onclick = send; tx.onkeydown = e => { if(e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer:coarse)').matches){ e.preventDefault(); send(); } };
    tx.oninput = () => { tx.style.height = 'auto'; tx.style.height = Math.min(tx.scrollHeight, 120) + 'px'; };
    $('#vc').onclick = () => g && startGroupCall(g);
    $('#more').onclick = () => g && sheet(`<h3>${esc(g.title)}</h3><div class="list"><button class="btn alt" data-a="rep">🚩 דיווח על הקבוצה</button>
      <button class="btn alt" data-a="help">🫶 צריך עזרה?</button>
      <button class="btn alt" data-a="leave">${g.hostId === myId() ? '🗑️ סגירת הקבוצה' : '🚪 יציאה מהקבוצה'}</button></div>`, (el, close) => {
        el.onclick = async e => { const a = e.target.closest('[data-a]')?.dataset.a; if(!a) return; close();
          if(a === 'rep') ctx.report({id:g.hostId, name:g.hostName}, 'אחר', 'קבוצה: ' + g.title);
          if(a === 'help') ctx.helpMenu();
          if(a === 'leave'){ try { g.hostId === myId() ? await B().deleteGroup(gid) : await B().leaveGroup(gid, myId()); } catch(err){ toast(ctx.errMsg(err)); } ctx.exit(); } };
      });
  }

  // ===== שיחת וידאו קבוצתית (רשת: כל משתתף מחובר ישירות לכל אחד) =====
  async function startGroupCall(g){
    if(gcall) return;
    if(!window.RTCPeerConnection) return toast('הדפדפן הזה לא תומך בשיחות וידאו');
    const gid = g.id, ME = myId(), j0 = Date.now();
    if(live(g) >= MAXCALL && !(g.live || {})[ME]) return toast(`בשיחה כבר ${MAXCALL} משתתפים`);
    let stream = null;
    try { stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user', width:{ideal:480}}, audio:{echoCancellation:true, noiseSuppression:true}}); }
    catch { try { stream = await navigator.mediaDevices.getUserMedia({audio:true}); } catch { toast('אין גישה למצלמה ולמיקרופון. אפשר לאשר בהגדרות הדפדפן'); } }
    const el = document.createElement('div'); el.className = 'call gcall';
    el.innerHTML = `<div class="gtiles" id="gt"></div><div class="callpanel" style="display:none"><div class="pb"></div></div>
      <div class="calltools"><button data-t="board">🖊️ לוח</button><button data-t="screen">🖥️ שיתוף מסך</button></div>
      <div class="callbar" id="cb"><button id="mu" aria-label="השתקה">🎤</button><button id="ca" aria-label="מצלמה">📷</button><button class="end" id="hu" aria-label="יציאה">📞</button></div>`;
    document.body.appendChild(el);
    const tiles = el.querySelector('#gt'), peers = {}, unsubs = [];
    const tile = (id, name, self) => { const d = document.createElement('div'); d.className = 'gtile'; d.dataset.id = id;
      d.innerHTML = `<video autoplay playsinline ${self ? 'muted' : ''}></video><span class="gname">${esc(self ? 'אני' : name)}</span><div class="gav">${avatar(id, name, 64)}</div>`; tiles.appendChild(d); relayout(); return d; };
    const relayout = () => { tiles.dataset.n = tiles.children.length; };
    const mine = tile(ME, me().name, true);
    if(stream){ mine.querySelector('video').srcObject = stream; mine.querySelector('.gav').style.display = stream.getVideoTracks().length ? 'none' : ''; mine.querySelector('video').style.transform = 'scaleX(-1)'; }
    let board = null, tool = null, sharing = null;
    const panel = el.querySelector('.callpanel');
    board = createBoard(panel.querySelector('.pb'), {add: d => B().gBoardAdd(gid, d).catch(() => {}), on: cb => B().onGBoard(gid, cb)}, {myId:ME, onRemote: () => { if(tool !== 'board'){ openTool('board'); toast('🖊️ מישהו מצייר על הלוח'); } }});
    const openTool = t => { tool = t; panel.dataset.show = t ? 'board' : ''; panel.style.display = t ? 'flex' : 'none'; el.classList.toggle('split', !!t); el.querySelector('[data-t="board"]').classList.toggle('on', !!t); if(t) setTimeout(() => board.fit(), 40); };

    function connect(pid, pname, offerer, theirJ){
      if(peers[pid]) return;
      const pc = new RTCPeerConnection(getIce()), t = tile(pid, pname, false), remote = new MediaStream(), sid = offerer ? `${ME}_${pid}` : `${pid}_${ME}`;
      const P = peers[pid] = {pc, t, unsubs:[]};
      t.querySelector('video').srcObject = remote;
      pc.ontrack = e => { (e.streams[0] ? e.streams[0].getTracks() : [e.track]).forEach(x => { if(!remote.getTracks().includes(x)) remote.addTrack(x); }); t.querySelector('.gav').style.display = remote.getVideoTracks().length ? 'none' : ''; };
      if(stream) stream.getTracks().forEach(x => pc.addTrack(x, stream)); else { pc.addTransceiver('audio', {direction:'recvonly'}); pc.addTransceiver('video', {direction:'recvonly'}); }
      if(stream && !stream.getVideoTracks().length) pc.addTransceiver('video', {direction:'recvonly'});
      const myField = offerer ? 'co' : 'ca', theirField = offerer ? 'ca' : 'co', seen = new Set(), queue = [];
      const flush = () => { while(queue.length && pc.remoteDescription) pc.addIceCandidate(queue.shift()).catch(() => {}); };
      let ready = false; const pend = [];
      const ok = () => { ready = true; pend.splice(0).forEach(c => B().sigCand(gid, sid, myField, c).catch(() => {})); };
      pc.onicecandidate = e => { if(!e.candidate) return; const c = e.candidate.toJSON(); ready ? B().sigCand(gid, sid, myField, c).catch(() => {}) : pend.push(c); };
      let gotOffer = false, gotAnswer = false;
      P.unsubs.push(B().onSig(gid, sid, async d => {
        if(!d) return;
        (d[theirField] || []).forEach(c => { const k = JSON.stringify(c); if(!seen.has(k)){ seen.add(k); queue.push(new RTCIceCandidate(c)); } }); flush();
        if(!offerer && d.offer && !gotOffer && d.offer.t >= (theirJ || 0)){ gotOffer = true;
          await pc.setRemoteDescription(new RTCSessionDescription({type:d.offer.type, sdp:d.offer.sdp})); const a = await pc.createAnswer(); await pc.setLocalDescription(a);
          await B().sigSet(gid, sid, {answer:{type:a.type, sdp:a.sdp}}); ok(); flush(); }
        if(offerer && d.answer && !gotAnswer && !pc.currentRemoteDescription){ gotAnswer = true; await pc.setRemoteDescription(new RTCSessionDescription(d.answer)); flush(); }
      }));
      if(offerer) (async () => { const o = await pc.createOffer(); await pc.setLocalDescription(o); await B().sigSet(gid, sid, {offer:{type:o.type, sdp:o.sdp, t:Date.now()}, to:pid, from:ME}, true); ok(); })();
    }
    function drop(pid){ const P = peers[pid]; if(!P) return; P.unsubs.forEach(f => f && f()); try { P.pc.close(); } catch {} P.t.remove(); delete peers[pid]; relayout(); }

    // מי בשיחה עכשיו (מהמסמך של הקבוצה). מי שהצטרף מאוחר יותר הוא זה שמתקשר.
    let joined = false;
    unsubs.push(B().onGroup(gid, x => {
      if(!x) return end();
      const lv = x.live || {};
      Object.entries(lv).forEach(([pid, v]) => {
        if(pid === ME || peers[pid] || Date.now() - (v.h || 0) > 45000 || Object.keys(peers).length >= MAXCALL - 1) return;
        const offerer = (j0 > v.j) || (j0 === v.j && ME > pid);
        connect(pid, x.names?.[pid] || '', offerer, v.j);
      });
      Object.keys(peers).forEach(pid => { const v = lv[pid]; if(!v || Date.now() - (v.h || 0) > 45000) drop(pid); });
    }));
    const beat = () => B().gLive(gid, ME, {j:j0, h:Date.now()}).catch(() => {});
    await beat(); joined = true; const hb = setInterval(beat, 15000);

    const camTrack = () => stream?.getVideoTracks()[0];
    async function stopShare(){ if(!sharing) return; const s = sharing; sharing = null; s.track.onended = null; s.track.stop();
      for(const P of Object.values(peers)){ const sd = P.pc.getSenders().find(x => x.track?.kind === 'video'); try { await sd?.replaceTrack(camTrack() || null); } catch {} }
      mine.querySelector('video').srcObject = stream; mine.querySelector('video').style.transform = 'scaleX(-1)'; el.querySelector('[data-t="screen"]').classList.remove('on'); }
    async function startShare(){
      if(!navigator.mediaDevices?.getDisplayMedia) return toast('שיתוף מסך זמין בדפדפן במחשב. בטלפון הדפדפן לא תומך בזה');
      if(!camTrack()) return toast('כדי לשתף מסך צריך מצלמה פעילה בשיחה');
      try { const ds = await navigator.mediaDevices.getDisplayMedia({video:true, audio:false}), track = ds.getVideoTracks()[0]; sharing = {track};
        for(const P of Object.values(peers)){ const sd = P.pc.getSenders().find(x => x.track?.kind === 'video'); await sd?.replaceTrack(track); }
        track.onended = stopShare; mine.querySelector('video').srcObject = ds; mine.querySelector('video').style.transform = 'none'; el.querySelector('[data-t="screen"]').classList.add('on'); toast('🖥️ אתה משתף את המסך'); }
      catch(e){ if(e?.name !== 'NotAllowedError') toast('לא הצלחנו לשתף את המסך'); } }
    el.querySelector('.calltools').onclick = e => { const b = e.target.closest('[data-t]'); if(!b) return; if(b.dataset.t === 'screen') return sharing ? stopShare() : startShare(); openTool(tool ? null : 'board'); };
    const tog = (kind, btn) => { const t = stream?.getTracks().filter(x => x.kind === kind); if(!t?.length) return; const on = !t[0].enabled; t.forEach(x => x.enabled = on); btn.classList.toggle('off', !on); };
    el.querySelector('#mu').onclick = e => tog('audio', e.currentTarget);
    el.querySelector('#ca').onclick = e => tog('video', e.currentTarget);
    function end(){
      if(!gcall) return; gcall = null; clearInterval(hb);
      Object.keys(peers).forEach(drop); unsubs.forEach(f => f && f()); board.destroy(); sharing?.track.stop();
      stream?.getTracks().forEach(x => x.stop()); B().gLive(gid, ME, null).catch(() => {}); el.remove();
    }
    el.querySelector('#hu').onclick = end;
    gcall = {end};
  }

  return {renderTab, openRoom, joinOrOpen, watch, startGroupCall, get list(){ return list; }};
}
