// משחקים לשניים בזמן שיחת וידאו: איקס־עיגול, ארבע בשורה ודו־קרב ידע.
// io = {set(patch, replace), on(cb) → unsub}. המצב המשותף נשמר במסמך אחד, ושני הצדדים רואים כל מהלך מיד.
import { esc, shuffle, toast, sound, confetti, vibrate } from './ui.js';
import { BANK, SUBJECTS, ICON } from './games.js';

const L3 = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export const win3 = b => { for(const [a,c,d] of L3) if(b[a] !== '_' && b[a] === b[c] && b[a] === b[d]) return b[a]; return b.includes('_') ? '' : 'D'; };
export function win4(g){            // 7 עמודות × 6 שורות, אינדקס = שורה*7 + עמודה
  const at = (r, c) => (r < 0 || r > 5 || c < 0 || c > 6) ? null : g[r * 7 + c];
  for(let r = 0; r < 6; r++) for(let c = 0; c < 7; c++){ const v = at(r, c); if(v === '_') continue;
    for(const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) if([1,2,3].every(k => at(r + dr * k, c + dc * k) === v)) return v; }
  return g.includes('_') ? '' : 'D';
}
const NQ = 6, QTIME = 12;

export function createGame(host, io, {myId, otherId, otherName, subject, onInvite}){
  let st = null, qz = null, seenInvite = '';
  const root = document.createElement('div'); root.className = 'gm'; host.appendChild(root);
  const score = (s, uid) => s.score?.[uid] || 0;
  const scoreLine = s => `<div class="gmscore"><span>אתה <b>${score(s, myId)}</b></span><span>·</span><span>${esc(otherName)} <b>${score(s, otherId)}</b></span></div>`;
  const closeBtn = '<button class="link gmx" data-act="close">✕ חזרה לבחירת משחק</button>';

  function picker(){
    const subs = [subject, ...SUBJECTS.filter(s => s !== subject)].filter(Boolean);
    root.innerHTML = `<div class="gmpick"><h3>🎮 משחקים עם ${esc(otherName)}</h3><p class="small muted" style="margin:2px 0 8px">${esc(otherName)} יקבל הזמנה אוטומטית.</p>
      <label style="margin-top:0">מקצוע למשחקים הלימודיים</label><select id="gqs" aria-label="מקצוע">${subs.map(s => `<option>${esc(s)}</option>`).join('')}</select>
      <div class="gmsec">🎓 לימודיים</div>
      <button class="gmcard" data-act="quiz"><b>🧠 דו־קרב ידע</b><span class="small muted">${NQ} שאלות, מי מדויק ומהיר יותר</span></button>
      <button class="gmcard" data-act="tttk"><b>❌⭕ איקס־עיגול ידע</b><span class="small muted">כדי לסמן משבצת צריך לענות נכון</span></button>
      <button class="gmcard" data-act="c4k"><b>🔴🟡 ארבע בשורה ידע</b><span class="small muted">תשובה נכונה = מפילים דיסקית</span></button>
      <div class="gmsec">🎉 סתם בכיף</div>
      <button class="gmcard" data-act="ttt"><b>❌⭕ איקס־עיגול</b><span class="small muted">קלאסי ומהיר</span></button>
      <button class="gmcard" data-act="c4"><b>🔴🟡 ארבע בשורה</b><span class="small muted">מי יחבר ארבעה קודם?</span></button></div>`;
  }
  const start = {
    ttt: study => io.set({study:study||'', type:'ttt', by:myId, X:myId, O:otherId, board:'_________', turn:'X', win:'', round:1, score:{[myId]:0, [otherId]:0}, at:Date.now()}, true),
    c4: study => io.set({study:study||'', type:'c4', by:myId, R:myId, Y:otherId, grid:'_'.repeat(42), turn:'R', win:'', round:1, score:{[myId]:0, [otherId]:0}, at:Date.now()}, true),
    quiz: sub => { const qs = shuffle(BANK[sub].q).slice(0, NQ).map(q => ({q:q[0], right:q[1], opts:shuffle(q.slice(1, 5))}));
      io.set({type:'quiz', by:myId, subject:sub, qs, at:Date.now(), prog:{[myId]:{i:0, score:0, ok:0, fin:false, tt:0}, [otherId]:{i:0, score:0, ok:0, fin:false, tt:0}}}, true); },
  };

  function ttt(s){
    const mark = s.X === myId ? 'X' : 'O', myTurn = !s.win && s.turn === mark;
    const status = s.win ? (s.win === 'D' ? 'תיקו 🤝' : s.win === mark ? 'ניצחת! 🎉' : `${esc(otherName)} ניצח/ה`) : myTurn ? '✨ התור שלך' : `התור של ${esc(otherName)}…`;
    root.innerHTML = `<div class="gmhead"><b>❌⭕ איקס־עיגול${s.study ? ' ידע' : ''}</b>${closeBtn}</div>${scoreLine(s)}<div class="gmstatus ${myTurn ? 'my' : ''}">${status}</div>
      <div class="ttt">${[...s.board].map((c, i) => `<button data-cell="${i}" class="${c === 'X' ? 'x' : c === 'O' ? 'o' : ''}" aria-label="משבצת ${i + 1}">${c === 'X' ? '✕' : c === 'O' ? '○' : ''}</button>`).join('')}</div>
      ${s.win ? '<button class="btn grn" data-act="again" style="margin-top:12px">🔁 עוד סיבוב</button>' : ''}`;
  }
  function c4(s){
    const mark = s.R === myId ? 'R' : 'Y', myTurn = !s.win && s.turn === mark;
    const status = s.win ? (s.win === 'D' ? 'תיקו 🤝' : s.win === mark ? 'ניצחת! 🎉' : `${esc(otherName)} ניצח/ה`) : myTurn ? '✨ התור שלך' : `התור של ${esc(otherName)}…`;
    root.innerHTML = `<div class="gmhead"><b>🔴🟡 ארבע בשורה${s.study ? ' ידע' : ''}</b>${closeBtn}</div>${scoreLine(s)}<div class="gmstatus ${myTurn ? 'my' : ''}">${status} <span class="small muted">(אתה ${mark === 'R' ? '🔴' : '🟡'})</span></div>
      <div class="c4">${[...s.grid].map((c, i) => `<button data-col="${i % 7}" class="${c === 'R' ? 'r' : c === 'Y' ? 'y' : ''}" aria-label="עמודה ${i % 7 + 1}"></button>`).join('')}</div>
      ${s.win ? '<button class="btn grn" data-act="again" style="margin-top:12px">🔁 עוד סיבוב</button>' : ''}`;
  }

  function quiz(s){
    const me = s.prog?.[myId] || {i:0, score:0, ok:0, fin:false, tt:0}, op = s.prog?.[otherId] || {i:0, score:0, ok:0, fin:false, tt:0};
    if(!qz || qz.id !== s.at){ qz = {id:s.at, i:me.i || 0, score:me.score || 0, ok:me.ok || 0, tt:me.tt || 0, timer:null, locked:false};
      root.innerHTML = `<div class="gmhead"><b>🧠 דו־קרב ידע · ${ICON[s.subject] || ''} ${esc(s.subject)}</b>${closeBtn}</div>
        <div class="qbars"><div><span>אתה</span><div class="qb"><i id="qm"></i></div><b id="qms">0</b></div><div><span>${esc(otherName)}</span><div class="qb"><i id="qo" style="background:var(--pink)"></i></div><b id="qos">0</b></div></div>
        <div id="qarea"></div>`;
      if(me.fin) finish(s); else ask(s); }
    bars(s);
    if(me.fin && op.fin) finish(s, true);
  }
  function bars(s){
    const me = s.prog?.[myId] || {}, op = s.prog?.[otherId] || {};
    const set = (id, v, sc) => { const e = root.querySelector(id), t = root.querySelector(id + 's'); if(e) e.style.width = (v / NQ * 100) + '%'; if(t) t.textContent = sc; };
    set('#qm', Math.max(me.i || 0, qz?.i || 0), Math.max(me.score || 0, qz?.score || 0)); set('#qo', op.i || 0, op.score || 0);
  }
  function ask(s){
    const area = root.querySelector('#qarea'); if(!area) return;
    if(qz.i >= NQ) return report(s);
    const q = s.qs[qz.i]; qz.locked = false; const t0 = Date.now(); clearInterval(qz.timer);
    area.innerHTML = `<div class="qn small muted">שאלה ${qz.i + 1} מתוך ${NQ} · <b id="qt">${QTIME}</b> שנ׳</div><div class="qq">${esc(q.q)}</div>
      <div class="qo">${q.opts.map((o, k) => `<button data-k="${k}">${esc(o)}</button>`).join('')}</div>`;
    const tick = () => { const left = QTIME - Math.floor((Date.now() - t0) / 1000), el = root.querySelector('#qt'); if(el) el.textContent = Math.max(0, left); if(left <= 0) pick(s, -1, t0); };
    qz.timer = setInterval(tick, 500);
    area.onclick = e => { const b = e.target.closest('[data-k]'); if(b) pick(s, +b.dataset.k, t0); };
  }
  function pick(s, k, t0){
    if(qz.locked) return; qz.locked = true; clearInterval(qz.timer);
    const q = s.qs[qz.i], sec = (Date.now() - t0) / 1000, good = k >= 0 && q.opts[k] === q.right;
    if(good){ qz.ok++; qz.score += 100 + Math.max(0, Math.round((QTIME - sec) * 8)); sound('ok'); } else { sound('no'); vibrate(40); }
    qz.tt += Math.min(QTIME, sec);
    root.querySelectorAll('.qo button').forEach((b, j) => { b.disabled = true; if(q.opts[j] === q.right) b.classList.add('good'); else if(j === k) b.classList.add('bad'); });
    qz.i++;
    io.set({prog:{[myId]:{i:qz.i, score:qz.score, ok:qz.ok, fin:qz.i >= NQ, tt:Math.round(qz.tt * 10) / 10}}});
    bars(s); setTimeout(() => { if(qz && root.querySelector('#qarea')) ask(s); }, 900);
  }
  function report(s){ finish(s); }
  function finish(s, both){
    clearInterval(qz?.timer);
    const me = s.prog?.[myId] || {}, op = s.prog?.[otherId] || {}, area = root.querySelector('#qarea'); if(!area) return;
    if(!(me.fin && op.fin)){ area.innerHTML = `<div class="gmstatus my">סיימת! ${me.ok ?? qz.ok}/${NQ} נכונות · ${me.score ?? qz.score} נקודות</div><p class="muted" style="text-align:center">ממתין ל${esc(otherName)}…</p>`; return; }
    const iWin = me.score > op.score || (me.score === op.score && me.tt < op.tt), tie = me.score === op.score && me.tt === op.tt;
    if(!area.dataset.done){ area.dataset.done = '1'; if(iWin && !tie){ confetti(); sound('win'); } }
    area.innerHTML = `<div class="gmstatus my">${tie ? 'תיקו! 🤝' : iWin ? 'ניצחת! 🏆' : `${esc(otherName)} ניצח/ה 👏`}</div>
      <div class="qres"><div><b>אתה</b><span>${me.score} נק׳</span><small>${me.ok}/${NQ} נכונות</small></div><div><b>${esc(otherName)}</b><span>${op.score} נק׳</span><small>${op.ok}/${NQ} נכונות</small></div></div>
      <button class="btn grn" data-act="rematch" style="margin-top:12px">🔁 סיבוב נוסף</button>`;
  }

  // משחק ידע: לפני מהלך צריך לענות נכון. טעות = התור עובר
  function gate(go, skip){
    if(!st.study) return go();
    const b = BANK[st.study]?.q; if(!b) return go();
    const q = shuffle(b)[0], opts = shuffle(q.slice(1, 5)), box = document.createElement('div'); box.className = 'gmq';
    box.innerHTML = `<div class="small muted">${ICON[st.study] || ''} ${esc(st.study)} · ענה נכון כדי לשחק</div><div class="qq">${esc(q[0])}</div><div class="qo">${opts.map((o, k) => `<button data-k="${k}">${esc(o)}</button>`).join('')}</div>`;
    root.appendChild(box);
    box.onclick = e => { const k = e.target.closest('[data-k]'); if(!k) return; const good = opts[+k.dataset.k] === q[1];
      box.querySelectorAll('button').forEach(x => { x.disabled = true; if(x.textContent === q[1]) x.classList.add('good'); });
      if(!good) k.classList.add('bad');
      setTimeout(() => { box.remove(); if(good) go(); else { toast('לא נכון. התור עובר'); sound('no'); io.set(skip); } }, 800); };
  }
  root.onclick = e => {
    if(root.querySelector('.gmq')) return;
    const a = e.target.closest('[data-act]')?.dataset.act, cell = e.target.closest('[data-cell]'), col = e.target.closest('[data-col]');
    if(a === 'close'){ io.set({type:null}, true); return; }
    const sub = () => root.querySelector('#gqs')?.value;
    if(a === 'ttt') return start.ttt();
    if(a === 'c4') return start.c4();
    if(a === 'tttk') return start.ttt(sub());
    if(a === 'c4k') return start.c4(sub());
    if(a === 'quiz') return start.quiz(sub());
    if(a === 'rematch') return start.quiz(st.subject);
    if(a === 'again' && st){
      if(st.type === 'ttt') io.set({board:'_________', win:'', turn:'X', round:(st.round || 1) + 1, X:st.O, O:st.X});
      if(st.type === 'c4') io.set({grid:'_'.repeat(42), win:'', turn:'R', round:(st.round || 1) + 1, R:st.Y, Y:st.R});
      return;
    }
    if(!st) return;
    if(cell && st.type === 'ttt'){
      const i = +cell.dataset.cell, mark = st.X === myId ? 'X' : 'O';
      if(st.win || st.turn !== mark || st.board[i] !== '_') return;
      const b = st.board.slice(0, i) + mark + st.board.slice(i + 1), w = win3(b);
      const patch = {board:b, turn:mark === 'X' ? 'O' : 'X', win:w}; if(w && w !== 'D') patch.score = {[myId]:score(st, myId) + 1};
      return gate(() => { sound('ok'); vibrate(10); io.set(patch); }, {turn:mark === 'X' ? 'O' : 'X'});
    }
    if(col && st.type === 'c4'){
      const c = +col.dataset.col, mark = st.R === myId ? 'R' : 'Y';
      if(st.win || st.turn !== mark) return;
      let r = 5; while(r >= 0 && st.grid[r * 7 + c] !== '_') r--; if(r < 0) return toast('העמודה מלאה');
      const g = st.grid.slice(0, r * 7 + c) + mark + st.grid.slice(r * 7 + c + 1), w = win4(g);
      const patch = {grid:g, turn:mark === 'R' ? 'Y' : 'R', win:w}; if(w && w !== 'D') patch.score = {[myId]:score(st, myId) + 1};
      return gate(() => { sound('ok'); vibrate(10); io.set(patch); }, {turn:mark === 'R' ? 'Y' : 'R'});
    }
  };

  let lastWin = '', lastSig = '';
  const unsub = io.on(s => {
    const sg = JSON.stringify(s); if(sg === lastSig) return; lastSig = sg;
    const prev = st; st = s && s.type ? s : null;
    if(!st){ qz = null; picker(); lastWin = ''; return; }
    if(st.by !== myId && (!prev || prev.at !== st.at) && st.at !== seenInvite){ seenInvite = st.at; onInvite?.(st); }
    if(st.type === 'ttt') ttt(st); else if(st.type === 'c4') c4(st); else if(st.type === 'quiz') quiz(st);
    const key = st.type + st.at + (st.round || 0) + st.win;
    if(st.win && st.win !== 'D' && key !== lastWin){ lastWin = key; const mine = (st.type === 'ttt' ? (st.X === myId ? 'X' : 'O') : (st.R === myId ? 'R' : 'Y')) === st.win; if(mine){ confetti(); sound('win'); } else sound('no'); }
  });
  picker();
  return {destroy(){ unsub && unsub(); clearInterval(qz?.timer); root.remove(); }, active: () => !!st};
}
