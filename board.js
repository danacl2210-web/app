// לוח ציור משותף בזמן אמת (כמו ב-Zoom). כל משיכת עט נשלחת בחתיכות קטנות, ושני הצדדים רואים את הציור מיד.
// io = {add(doc), on(cb) → unsub}. כל המסמכים: {k:'s', sid, seq, by, c, w, e, t, p:[x,y,...]} | {k:'clear', by, t} | {k:'undo', sid, by, t}
import { toast } from './ui.js';

const W = 1000, H = 700;                           // מערכת קואורדינטות קבועה, כך שהציור נראה זהה בכל מסך
const COLORS = ['#ffffff', '#ff6b8a', '#ffd65c', '#5ee0a0', '#5cc8ff', '#a98bff'];
const BGS = ['plain', 'grid', 'axes'];

export function createBoard(host, io, {myId, onRemote}){
  let docs = [], color = COLORS[0], width = 5, eraser = false, bg = 0, cur = null, flushT = null, remoteCount = 0, clearArm = 0;
  const mine = new Map();
  host.innerHTML = `<div class="bd">
    <div class="bdtools" role="toolbar" aria-label="כלי ציור">
      ${COLORS.map((c, i) => `<button class="bdcol ${i === 0 ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="צבע ${i + 1}"></button>`).join('')}
      <span class="bdsep"></span>
      <button data-w="5" class="bdt on" aria-label="קו דק">✏️</button><button data-w="12" class="bdt" aria-label="קו עבה">🖌️</button>
      <button id="bder" class="bdt" aria-label="מחק">🧽</button>
      <span class="bdsep"></span>
      <button id="bdun" class="bdt" aria-label="ביטול צעד אחרון">↶</button>
      <button id="bdbg" class="bdt" aria-label="רקע">▦</button>
      <button id="bdsv" class="bdt" aria-label="שמירה כתמונה">💾</button>
      <button id="bdcl" class="bdt" aria-label="ניקוי הלוח">🗑️</button>
    </div>
    <div class="bdwrap"><canvas class="bdc plain" aria-label="לוח ציור משותף"></canvas></div></div>`;
  const cv = host.querySelector('canvas'), g = cv.getContext('2d'), wrap = host.querySelector('.bdwrap');

  const fit = () => {
    const r = wrap.getBoundingClientRect(); if(r.width < 20 || r.height < 20) return;
    const s = Math.min(r.width / W, r.height / H), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
    cv.width = Math.round(W * s * dpr); cv.height = Math.round(H * s * dpr); redraw();
  };
  const scale = () => cv.width / W;

  function derive(){
    const strokes = new Map(), clears = [], undone = new Set();
    for(const d of docs){
      if(d.k === 'clear') clears.push(d.t);
      else if(d.k === 'undo') undone.add(d.sid);
      else if(d.k === 's' && !mine.has(d.sid)){
        let s = strokes.get(d.sid);
        if(!s){ s = {sid:d.sid, by:d.by, c:d.c, w:d.w, e:d.e, t:d.t, ch:[]}; strokes.set(d.sid, s); }
        s.ch.push([d.seq, d.p]);
      }
    }
    const out = [];
    strokes.forEach(s => { s.ch.sort((a, b) => a[0] - b[0]); s.p = s.ch.flatMap(x => x[1]); out.push(s); });
    mine.forEach(s => out.push(s));
    const lastClear = clears.length ? Math.max(...clears) : 0;
    return out.filter(s => s.t > lastClear && !undone.has(s.sid)).sort((a, b) => a.t - b.t);
  }
  function drawStroke(s, from = 0){
    const k = scale(), p = s.p; if(!p.length) return;
    g.globalCompositeOperation = s.e ? 'destination-out' : 'source-over';
    g.strokeStyle = g.fillStyle = s.c || '#fff'; g.lineWidth = (s.e ? s.w * 3 : s.w) * k; g.lineCap = g.lineJoin = 'round';
    if(p.length === 2){ g.beginPath(); g.arc(p[0] * k, p[1] * k, g.lineWidth / 2, 0, 7); g.fill(); return; }
    g.beginPath(); const i0 = Math.max(0, from - 2); g.moveTo(p[i0] * k, p[i0 + 1] * k);
    for(let i = i0 + 2; i < p.length; i += 2) g.lineTo(p[i] * k, p[i + 1] * k);
    g.stroke();
  }
  function redraw(){ g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, cv.width, cv.height); derive().forEach(s => drawStroke(s)); }

  const pos = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * W), Math.round((e.clientY - r.top) / r.height * H)]; };
  const send = d => io.add(d);
  const flush = () => { if(!cur || cur.sent >= cur.p.length) return;
    const chunk = cur.p.slice(Math.max(0, cur.sent - 2)); cur.sent = cur.p.length;
    send({k:'s', sid:cur.sid, seq:cur.seq++, by:myId, c:cur.c, w:cur.w, e:cur.e, t:cur.t, p:chunk}); };
  cv.onpointerdown = e => {
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    cur = {sid:myId.slice(0, 4) + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), by:myId, c:color, w:width, e:eraser, t:Date.now(), p:[x, y], sent:0, seq:0};
    mine.set(cur.sid, cur); drawStroke(cur); clearInterval(flushT); flushT = setInterval(flush, 110);
  };
  cv.onpointermove = e => {
    if(!cur) return; e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for(const ev of evs){ const [x, y] = pos(ev), n = cur.p.length;
      if(Math.abs(x - cur.p[n - 2]) + Math.abs(y - cur.p[n - 1]) < 3) continue;
      cur.p.push(x, y); drawStroke(cur, n); }
  };
  const up = () => { if(!cur) return; clearInterval(flushT); flush(); cur = null; };
  cv.onpointerup = cv.onpointercancel = up;

  const bar = host.querySelector('.bdtools');
  bar.onclick = e => {
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.c){ color = b.dataset.c; eraser = false; bar.querySelectorAll('.bdcol').forEach(x => x.classList.toggle('on', x === b)); host.querySelector('#bder').classList.remove('on'); }
    if(b.dataset.w){ width = +b.dataset.w; bar.querySelectorAll('[data-w]').forEach(x => x.classList.toggle('on', x === b)); }
    if(b.id === 'bder'){ eraser = !eraser; b.classList.toggle('on', eraser); }
    if(b.id === 'bdun'){ const last = derive().filter(s => s.by === myId).pop(); if(!last) return toast('אין מה לבטל');
      const d = {k:'undo', sid:last.sid, by:myId, t:Date.now()}; docs.push(d); redraw(); send(d); }
    if(b.id === 'bdbg'){ bg = (bg + 1) % BGS.length; cv.className = 'bdc ' + BGS[bg]; }
    if(b.id === 'bdsv') save();
    if(b.id === 'bdcl'){ if(Date.now() - clearArm > 2500){ clearArm = Date.now(); b.textContent = 'בטוח?'; setTimeout(() => b.textContent = '🗑️', 2500); return toast('לחץ שוב כדי לנקות את הלוח לשני הצדדים'); }
      b.textContent = '🗑️'; clearArm = 0; const d = {k:'clear', by:myId, t:Date.now()}; docs.push(d); redraw(); send(d); }
  };

  async function save(){
    const o = document.createElement('canvas'); o.width = W; o.height = H; const c = o.getContext('2d');
    c.fillStyle = '#141735'; c.fillRect(0, 0, W, H);
    if(bg) { c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1; for(let x = 0; x <= W; x += 40){ c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for(let y = 0; y <= H; y += 40){ c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } }
    const layer = document.createElement('canvas'); layer.width = W; layer.height = H; const lg = layer.getContext('2d');
    derive().forEach(s => { lg.globalCompositeOperation = s.e ? 'destination-out' : 'source-over'; lg.strokeStyle = lg.fillStyle = s.c || '#fff'; lg.lineWidth = s.e ? s.w * 3 : s.w; lg.lineCap = lg.lineJoin = 'round';
      const p = s.p; if(p.length === 2){ lg.beginPath(); lg.arc(p[0], p[1], lg.lineWidth / 2, 0, 7); lg.fill(); return; } lg.beginPath(); lg.moveTo(p[0], p[1]); for(let i = 2; i < p.length; i += 2) lg.lineTo(p[i], p[i + 1]); lg.stroke(); });
    c.drawImage(layer, 0, 0);
    const blob = await new Promise(r => o.toBlob(r, 'image/png')), file = new File([blob], 'chavruta-board.png', {type:'image/png'});
    try { if(navigator.canShare?.({files:[file]})) return await navigator.share({files:[file]}); } catch(e){ if(e?.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'chavruta-board.png'; a.click(); toast('הלוח נשמר כתמונה 📥');
  }

  const unsub = io.on(list => {
    docs = list.slice();
    const rc = docs.filter(d => d.by !== myId).length;
    if(rc > remoteCount){ remoteCount = rc; onRemote?.(); }
    redraw();
  });
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null; ro?.observe(wrap);
  setTimeout(fit, 30);
  return {fit, destroy(){ clearInterval(flushT); unsub && unsub(); ro?.disconnect(); }, count: () => derive().length};
}
