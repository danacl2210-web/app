// תוספות גמר 2: הכשרת מסבירים, תעודת התנדבות, אתגרי כיתה למורים, שפות, הודעות קוליות
import { esc, sheet, toast, confetti, sound } from './ui.js';
import { SUBJECTS, ICON } from './games.js';

export const LANGS = ['עברית', 'English', 'Русский', 'العربية', 'Français', 'Español', 'አማርኛ', 'Українська'];
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('chv:' + s)))].map(b => b.toString(16).padStart(2, '0')).join('');
export const totalWork = u => Object.values(u?.progress || {}).reduce((a, b) => a + b, 0) + (u?.calls || 0);
const pd = s => { const [y, m, d] = String(s || '').split('-').map(Number); return y ? new Date(y, m - 1, d) : null; };

const TIPS = [['❓', 'קודם שואלים', 'לפני שמסבירים, שאל: "מה כבר ניסית?" ו"איפה נתקעת?". ככה מסבירים בדיוק את מה שחסר.'],
  ['🪜', 'צעדים קטנים', 'חלק את ההסבר לצעדים קצרים. אחרי כל צעד, בדוק שהחבר איתך.'],
  ['💡', 'דוגמה לפני כלל', 'התחל בדוגמה פשוטה, ורק אחר כך הסבר את הכלל. אנשים מבינים מדוגמאות.'],
  ['🔁', 'שהוא יסביר חזרה', 'בקש מהחבר להסביר לך במילים שלו. אם הוא מצליח, הוא באמת הבין.']];
const QUIZ = [['חבר אומר שהוא לא מבין תרגיל. מה הצעד הראשון הכי טוב?', ['לפתור את התרגיל בשבילו', 'לשאול מה כבר ניסה ואיפה נתקע', 'להגיד שזה קל'], 1],
  ['איך בודקים שהחבר הבין?', ['שואלים "הבנת?" והוא אומר כן', 'מבקשים שיסביר חזרה או יפתור תרגיל דומה', 'ממשיכים לנושא הבא'], 1],
  ['החבר מתקשה והתעצבן. מה עושים?', ['מפסיקים את השיחה', 'מורידים קצב, מעודדים ומחלקים לצעדים קטנים', 'מסבירים מהר יותר'], 1]];

export function createMore(ctx){
  const me = () => ctx.me(), B = () => ctx.B();
  const save = async patch => { Object.assign(me(), patch); try { await B().saveUser(ctx.myId(), patch); } catch {} };
  const win = msg => { confetti(); sound('win'); msg && toast(msg); };

  /* ---------- הכשרת מסבירים ---------- */
  function courseSheet(){
    let i = 0, q = 0, score = 0;
    const shell = (html, mount) => sheet(html, mount);
    const tip = () => { const t = TIPS[i];
      shell(`<div style="text-align:center"><div style="font-size:54px">${t[0]}</div><h3>${t[1]}</h3><p class="muted" style="font-size:17px">${t[2]}</p><div class="dots">${TIPS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div></div>
        <button class="btn" id="nx">${i < TIPS.length - 1 ? 'הבא' : 'למבחן קצר 🎓'}</button>`, (el, close) => { el.querySelector('#nx').onclick = () => { close(); if(i < TIPS.length - 1){ i++; tip(); } else quiz(); }; }); };
    const quiz = () => { const [t, opts, ok] = QUIZ[q];
      shell(`<div class="small muted">שאלה ${q + 1} מתוך ${QUIZ.length}</div><h3 style="margin:6px 0 10px">${esc(t)}</h3><div class="list">${opts.map((o, k) => `<button class="btn alt" data-k="${k}" style="text-align:start">${esc(o)}</button>`).join('')}</div>`, (el, close) => {
        el.querySelector('.list').onclick = e => { const b = e.target.closest('[data-k]'); if(!b) return; if(+b.dataset.k === ok) score++; close(); if(q < QUIZ.length - 1){ q++; quiz(); } else done(); }; }); };
    const done = async () => {
      if(score >= 2){ await save({cert:{at:Date.now()}}); win('🎓 הוסמכת כמסביר חברותא!'); ctx.rerender(); }
      else sheet(`<div style="text-align:center"><div style="font-size:50px">📚</div><h3>כמעט!</h3><p class="muted">ענית נכון על ${score} מתוך ${QUIZ.length}. אפשר לנסות שוב.</p></div><button class="btn" data-x>סגירה</button>`, (el, close) => { el.querySelector('[data-x]').onclick = close; });
    };
    tip();
  }
  const certHtml = () => `<div class="card" id="cert"><div class="row between"><b class="fred big">🎓 מסביר מוסמך</b>${me().cert ? '<span class="pill">✅ הוסמכת</span>' : ''}</div>
    <div class="small muted" style="margin:4px 0 8px">${me().cert ? 'התג מוצג לאחרים בחיפוש. כל הכבוד!' : 'מיני-קורס של 3 דקות: איך מסבירים בלי לתת תשובה. מקבלים תג שמוצג בחיפוש.'}</div>
    <button class="btn sm ${me().cert ? 'alt' : 'grn'}" id="crs">${me().cert ? 'לחזור על הקורס' : 'להתחיל קורס'}</button></div>`;

  /* ---------- תעודת התנדבות ---------- */
  const hours = () => (me().callMins || 0) / 60;
  function drawCert(){
    const u = me(), c = document.createElement('canvas'); c.width = 1080; c.height = 1440; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 1080, 1440); bg.addColorStop(0, '#2a2470'); bg.addColorStop(1, '#0e1028'); g.fillStyle = bg; g.fillRect(0, 0, 1080, 1440);
    const rb = g.createLinearGradient(0, 0, 1080, 0); ['#ff6b8a', '#ffd65c', '#5ee0a0', '#5cc8ff', '#a98bff'].forEach((x, i) => rb.addColorStop(i / 4, x)); g.fillStyle = rb; g.fillRect(0, 0, 1080, 18); g.fillRect(0, 1422, 1080, 18);
    g.fillStyle = '#fffdf7'; g.beginPath(); g.roundRect(60, 80, 960, 1280, 36); g.fill(); g.strokeStyle = '#ffd65c'; g.lineWidth = 8; g.beginPath(); g.roundRect(84, 104, 912, 1232, 26); g.stroke();
    g.direction = 'rtl'; g.textAlign = 'center'; const F = 'Fredoka, Assistant, Arial, sans-serif';
    g.fillStyle = '#6f52c9'; g.font = `700 64px ${F}`; g.fillText('חברותא', 540, 220);
    g.fillStyle = '#1b1e45'; g.font = `800 92px ${F}`; g.fillText('תעודת הערכה', 540, 360);
    g.font = `400 42px ${F}`; g.fillStyle = '#5a5e93'; g.fillText('מוענקת בגאווה ל', 540, 470);
    g.fillStyle = '#c9405f'; g.font = `800 96px ${F}`; g.fillText(u.name || '', 540, 600, 820);
    g.fillStyle = '#1b1e45'; g.font = `500 44px ${F}`; g.fillText('על התנדבות והסברה לתלמידים אחרים', 540, 720); g.fillText('בקהילת חברותא, במשך', 540, 785);
    g.fillStyle = '#2f9a68'; g.font = `800 190px ${F}`; g.fillText(hours().toFixed(1), 540, 990); g.fillStyle = '#1b1e45'; g.font = `600 52px ${F}`; g.fillText('שעות', 540, 1060);
    g.font = `400 40px ${F}`; g.fillStyle = '#5a5e93'; g.fillText(`⭐ ${(u.stars || 0) + (u.gameStars || 0)} כוכבים${u.cert ? '  ·  🎓 מסביר מוסמך' : ''}`, 540, 1150);
    g.fillText(new Date().toLocaleDateString('he-IL'), 540, 1230); g.fillStyle = '#6f52c9'; g.font = `700 40px ${F}`; g.fillText('צוות חברותא 💙', 540, 1295);
    return c;
  }
  function volunteerSheet(){
    const h = hours(); if(h < 0.1) return sheet(`<div style="text-align:center"><div style="font-size:50px">📜</div><h3>תעודת התנדבות</h3><p class="muted">התעודה נוצרת מהשעות שעזרת בשיחות וידאו. עוד אין שעות, אז בוא נתחיל לעזור!</p></div><button class="btn" data-x>סגירה</button>`, (el, close) => el.querySelector('[data-x]').onclick = close);
    const c = drawCert(), url = c.toDataURL('image/png');
    sheet(`<h3>📜 תעודת התנדבות</h3><img src="${url}" alt="תעודת התנדבות של ${esc(me().name)}" style="width:100%;border-radius:14px;margin:8px 0"><div class="small muted">${h.toFixed(1)} שעות עזרה מתועדות בחברותא${h < 10 ? ' (היעד: 10 שעות)' : ''}</div>
      <div class="row" style="margin-top:10px"><a class="btn grn grow" id="dl" download="chavruta-certificate.png" href="${url}" style="text-align:center;text-decoration:none">⬇ הורדה</a><button class="btn alt" id="sh">שיתוף</button></div>`, el => {
      el.querySelector('#sh').onclick = async () => { try { const b = await new Promise(r => c.toBlob(r)); const f = new File([b], 'chavruta-certificate.png', {type:'image/png'});
        if(navigator.canShare?.({files:[f]})) await navigator.share({files:[f], title:'תעודת התנדבות בחברותא'}); else toast('אפשר להוריד ולשתף ידנית'); } catch {} };
    });
  }
  const volHtml = () => { const h = hours(); return `<div class="card" id="vol"><div class="row between"><b class="fred big">📜 שעות התנדבות</b><span class="pill">${h.toFixed(1)}h</span></div>
    <div class="prog" style="margin:8px 0"><i style="width:${Math.min(100, h * 10)}%;background:var(--grn)"></i></div>
    <div class="small muted">${h >= 10 ? 'הגעת ליעד! אפשר להוריד תעודה.' : `עוד ${(10 - h).toFixed(1)} שעות לתעודה מלאה (10 שעות)`}</div><button class="btn sm alt" id="volb" style="margin-top:8px">צפייה בתעודה</button></div>`; };

  /* ---------- אתגרי כיתה ---------- */
  let cache = {code:null, at:0, cls:null};
  async function prime(){
    const code = me()?.cls; if(!code || !B().getClass) return;
    if(cache.code === code && Date.now() - cache.at < 60000) return;
    const before = JSON.stringify(cache.cls?.challenge || null);
    try { const cls = await B().getClass(code); cache = {code, at:Date.now(), cls}; } catch { return; }
    if(JSON.stringify(cache.cls?.challenge || null) !== before) ctx.rerender();
  }
  const activeChal = () => { const ch = cache.code === me()?.cls ? cache.cls?.challenge : null; return ch && ch.until > Date.now() ? ch : null; };
  function challengeHtml(){
    const ch = activeChal(); if(!ch) return '';
    const mine = me().chal?.id === ch.id ? Math.max(0, totalWork(me()) - (me().chal.base || 0)) : null, left = Math.max(0, Math.ceil((ch.until - Date.now()) / 864e5));
    return `<div class="card" id="chal" style="border-color:var(--yel)"><div class="row between"><b class="fred big">🏆 אתגר הכיתה</b><span class="pill">${left} ימים</span></div>
      <div style="margin:4px 0">${esc(ch.title)}</div><div class="small muted">יעד אישי: ${ch.goal} פעולות לימוד (שיעורי תרגול ושיחות)</div>
      ${mine === null ? '<button class="btn sm grn" id="chj" style="margin-top:8px">מצטרף לאתגר</button>' : `<div class="prog" style="margin:8px 0"><i style="width:${Math.min(100, mine / ch.goal * 100)}%;background:var(--yel)"></i></div><div class="small">${Math.min(mine, ch.goal)}/${ch.goal} ${mine >= ch.goal ? '🎉 הושלם!' : ''}</div>`}</div>`;
  }
  function bindChallenge(root){
    root.querySelector('#chj')?.addEventListener('click', async () => { const ch = activeChal(); if(!ch) return; await save({chal:{id:ch.id, base:totalWork(me())}}); win('הצטרפת לאתגר! 🏆'); ctx.rerender(); });
    if(me()?.chal && activeChal() && me().chal.id === activeChal().id && totalWork(me()) - me().chal.base >= activeChal().goal && localStorage.getItem('cv_chal_done') !== activeChal().id){ localStorage.setItem('cv_chal_done', activeChal().id); setTimeout(() => win('השלמת את אתגר הכיתה! 🏆'), 600); }
  }
  function teacherSheet(){
    sheet(`<div style="text-align:center"><div style="font-size:44px">👩‍🏫</div><h3>מבט למורים ולייעוץ</h3></div>
      <p class="small muted">קוד כיתה חדש ייווצר עם הקוד שתבחרו. נתונים מצטברים בלבד: בלי שמות ובלי הודעות.</p>
      <label for="tc">קוד כיתה</label><input id="tc" maxlength="12" autocomplete="off" placeholder="DEMO1" style="text-transform:uppercase">
      <label for="tp">קוד מורה (4 ספרות)</label><input id="tp" inputmode="numeric" maxlength="4" autocomplete="off" type="password" placeholder="••••">
      <div class="small muted" style="margin-top:4px">להדגמה: DEMO1 וקוד מורה 1234</div>
      <div class="err" id="te"></div><button class="btn" id="tg">כניסה</button><div id="tr"></div>`, (el, close) => {
      const er = el.querySelector('#te');
      el.querySelector('#tg').onclick = async () => {
        const code = el.querySelector('#tc').value.trim().toUpperCase().replace(/[^A-Z0-9א-ת]/g, ''), pin = el.querySelector('#tp').value; er.textContent = '';
        if(code.length < 3) return er.textContent = 'קוד כיתה קצר מדי'; if(!/^\d{4}$/.test(pin)) return er.textContent = 'קוד מורה: 4 ספרות';
        let cls; try { cls = await B().getClass(code); } catch { return er.textContent = 'לא הצלחנו לטעון'; }
        const h = await sha(code + pin);
        if(!cls){ cls = {pin:h, created:Date.now()}; try { await B().setClass(code, cls); } catch { return er.textContent = 'לא הצלחנו ליצור כיתה'; } toast('נוצרה כיתה חדשה ' + code); }
        else if(cls.pin !== h) return er.textContent = 'קוד מורה שגוי';
        dash(el, code, cls, close);
      };
    });
  }
  async function dash(el, code, cls, close){
    let us = []; try { us = (await B().listUsers()).filter(u => (u.cls || '').toUpperCase() === code && u.name); } catch {}
    const wk = new Date(); wk.setHours(0, 0, 0, 0); const w0 = wk.getTime() - 6 * 864e5, act = us.filter(u => { const d = pd(u.lastDay); return d && d.getTime() >= w0; }).length;
    const lessons = us.reduce((a, u) => a + Object.values(u.progress || {}).reduce((p, q) => p + q, 0), 0), stars = us.reduce((a, u) => a + (u.stars || 0) + (u.gameStars || 0), 0);
    const need = {}; us.forEach(u => (u.need || []).forEach(s => need[s] = (need[s] || 0) + 1)); const top = Object.entries(need).sort((a, b) => b[1] - a[1]).slice(0, 4), mx = top[0]?.[1] || 1;
    const ch = cls.challenge && cls.challenge.until > Date.now() ? cls.challenge : null;
    const part = ch ? us.filter(u => u.chal?.id === ch.id) : [], done = part.filter(u => totalWork(u) - u.chal.base >= ch.goal).length;
    el.innerHTML = `<h3>👩‍🏫 כיתה ${esc(code)}</h3>
      <div class="statrow"><div class="stat"><b>${us.length}</b><small>תלמידים</small></div><div class="stat"><b>${act}</b><small>פעילים השבוע</small></div><div class="stat"><b>${lessons}</b><small>שיעורי תרגול</small></div><div class="stat"><b>${stars}</b><small>כוכבים</small></div></div>
      ${us.length ? `<div class="card" style="margin-top:10px"><b>איפה צריכים הכי הרבה עזרה</b>${top.map(([s, n]) => `<div class="row" style="gap:8px;margin-top:6px"><span style="width:90px">${ICON[s] || ''} ${esc(s)}</span><div class="prog grow"><i style="width:${Math.round(n / mx * 100)}%;background:var(--pink)"></i></div><span class="small">${n}</span></div>`).join('')}</div>` : '<div class="card empty" style="margin-top:10px">עוד אין תלמידים בכיתה. שתפו את הקוד ' + esc(code) + ' בכיתה.</div>'}
      <div class="card" style="margin-top:10px"><b>🏆 אתגר לכיתה</b>${ch ? `<div style="margin:6px 0">${esc(ch.title)} · יעד ${ch.goal}</div><div class="small muted">${part.length} מצטרפים · ${done} השלימו · עד ${new Date(ch.until).toLocaleDateString('he-IL')}</div>` : '<div class="small muted">אין אתגר פעיל</div>'}
        <label for="cn">שם האתגר</label><input id="cn" maxlength="60" placeholder="חזרה למבחן: 5 שיעורי תרגול">
        <div class="row" style="gap:10px"><div class="grow"><label for="cg">יעד (פעולות לתלמיד)</label><input id="cg" type="number" min="1" max="50" value="5"></div><div class="grow"><label for="cd">ימים</label><input id="cd" type="number" min="1" max="30" value="7"></div></div>
        <div class="err" id="ce"></div><button class="btn grn" id="cp">פרסום אתגר</button></div>
      <p class="small muted">נתונים מצטברים בלבד: ללא שמות, הודעות או שיחות.</p><button class="btn alt" data-x>סגירה</button>`;
    el.querySelector('[data-x]').onclick = close;
    el.querySelector('#cp').onclick = async () => {
      const t = ctx.clean(el.querySelector('#cn').value.trim()), goal = +el.querySelector('#cg').value, days = +el.querySelector('#cd').value;
      if(t.length < 3) return el.querySelector('#ce').textContent = 'כתוב שם לאתגר'; if(!(goal >= 1 && days >= 1)) return el.querySelector('#ce').textContent = 'יעד וימים חייבים להיות מספרים';
      const c2 = {...cls, challenge:{id:Date.now().toString(36), title:t, goal:Math.min(50, goal), start:Date.now(), until:Date.now() + Math.min(30, days) * 864e5}};
      try { await B().setClass(code, c2); cache = {code:'', at:0, cls:null}; win('האתגר פורסם 🏆'); dash(el, code, c2, close); } catch { el.querySelector('#ce').textContent = 'לא הצלחנו לפרסם'; }
    };
  }

  /* ---------- שפות ---------- */
  const langHtml = L => `<div class="card" id="lgc"><h3>🌍 שפות</h3><p class="legend">באילו שפות אתה יכול לדבר ולהסביר? עולים חדשים יתאימו אליך לפי השפה.</p>
    <div class="chips" id="lgs">${LANGS.map(l => `<span class="chip ${L.langs.has(l) ? 'hon' : ''}" data-l="${esc(l)}">${esc(l)}</span>`).join('')}</div>
    <label class="row" style="gap:8px;font-weight:600;margin-top:12px;align-items:flex-start"><input type="checkbox" id="olm" style="width:auto;margin-top:3px" ${L.olim ? 'checked' : ''}><span>🌱 אני עולה חדש/ה ואשמח למסביר שמדבר/ת את השפה שלי</span></label>
    <div id="lgp" style="display:${L.olim ? 'block' : 'none'}"><label for="lgx">השפה שלי</label><select id="lgx">${LANGS.slice(1).map(l => `<option ${L.pref === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>`;
  function langBind(root, L){
    root.querySelector('#lgs').onclick = e => { const c = e.target.closest('[data-l]'); if(!c) return; const l = c.dataset.l; L.langs.has(l) ? L.langs.delete(l) : L.langs.add(l); c.classList.toggle('hon'); };
    const upd = () => { L.olim = root.querySelector('#olm').checked; root.querySelector('#lgp').style.display = L.olim ? 'block' : 'none'; L.pref = L.olim ? root.querySelector('#lgx').value : ''; };
    root.querySelector('#olm').onchange = upd; root.querySelector('#lgx').onchange = upd; upd();
  }

  /* ---------- הודעות קוליות ---------- */
  async function recordSheet(onSend){
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('הדפדפן לא תומך בהקלטה');
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({audio:true}); } catch { return toast('צריך לאשר גישה למיקרופון'); }
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, mime ? {mimeType:mime, audioBitsPerSecond:24000} : {audioBitsPerSecond:24000}), chunks = []; let t0 = Date.now(), tm, blob = null;
    const stopTracks = () => stream.getTracks().forEach(x => x.stop());
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    sheet(`<div style="text-align:center"><div style="font-size:50px" id="mc">🎤</div><h3 id="mt">מקליט… 0:00</h3><p class="small muted" id="mh">עד 45 שניות. לחץ עצור כשסיימת.</p></div>
      <div id="mb"><button class="btn pink" id="ms2">⏹ עצירה</button></div>`, (el, close) => {
      const fin = () => { clearInterval(tm); stopTracks(); };
      rec.onstop = () => { blob = new Blob(chunks, {type:rec.mimeType || 'audio/webm'}); const url = URL.createObjectURL(blob);
        el.querySelector('#mc').textContent = '▶'; el.querySelector('#mt').textContent = 'האזנה לפני שליחה'; el.querySelector('#mh').textContent = 'שלח רק אם אתה מרוצה. הודעות קוליות כפופות לכללי חברותא ואפשר לדווח עליהן.';
        el.querySelector('#mb').innerHTML = `<audio controls src="${url}" style="width:100%"></audio><div class="row" style="margin-top:10px"><button class="btn grn grow" id="mok">שליחה</button><button class="btn alt" id="mno">ביטול</button></div>`;
        el.querySelector('#mno').onclick = () => close();
        el.querySelector('#mok').onclick = () => { const fr = new FileReader(); fr.onload = () => { const data = String(fr.result); if(data.length > 450000){ toast('ההודעה ארוכה מדי'); return; } close(); onSend(data, Math.round((Date.now() - t0) / 1000)); }; fr.readAsDataURL(blob); }; };
      rec.start(); t0 = Date.now();
      tm = setInterval(() => { if(!el.isConnected){ fin(); try { rec.state !== 'inactive' && rec.stop(); } catch {} return; } const s = Math.floor((Date.now() - t0) / 1000);
        const e = el.querySelector('#mt'); if(e && rec.state === 'recording') e.textContent = `מקליט… ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if(s >= 45) el.querySelector('#ms2')?.click(); }, 400);
      el.querySelector('#ms2').onclick = () => { t0 = t0; fin(); try { rec.stop(); } catch {} };
    });
  }

  return {courseSheet, certHtml, volunteerSheet, volHtml, hours, prime, challengeHtml, bindChallenge, teacherSheet, langHtml, langBind, recordSheet};
}
