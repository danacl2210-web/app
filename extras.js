// תוספות גמר: סיכום שיעור ודירוג, מבחנים, כיתה/מורה, תצוגת הורים, שעות שקטות, סרטון הסבר, ערכת נושא, חגיגות
import { esc, sheet, toast, confetti, sound } from './ui.js';
import { SUBJECTS, ICON } from './games.js';

const KTAGS = ['🎓 מסביר מצוין', '🧘 סבלני', '😄 מצחיק', '⏰ מגיע בזמן', '🤝 אמין', '💡 יצירתי'];
const pd = s => { const [y, m, d] = String(s || '').split('-').map(Number); return y ? new Date(y, m - 1, d) : null; };
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayDiff = (a, b) => Math.round((a - b) / 864e5);
const sod = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const he = d => d.toLocaleDateString('he-IL', {day:'numeric', month:'numeric'});

/* ---------- ערכת נושא ---------- */
export const getTheme = () => localStorage.getItem('cv_theme') || 'dark';
export function applyTheme(){
  const t = getTheme(), light = t === 'light' || (t === 'auto' && matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f4f5ff' : '#0e1028');
}
export function cycleTheme(){ const n = {dark:'light', light:'auto', auto:'dark'}[getTheme()] || 'dark'; localStorage.setItem('cv_theme', n); applyTheme(); return n; }
export const themeName = t => ({dark:'כהה 🌙', light:'בהיר ☀️', auto:'אוטומטי 🌗'})[t || getTheme()];

/* ---------- שעות שקטות ---------- */
export function quietNow(u){
  const q = u?.quiet; if(!q?.on) return false;
  const h = new Date().getHours(), a = q.from ?? 21, b = q.to ?? 7;
  return a > b ? (h >= a || h < b) : (h >= a && h < b);
}

export function createExtras(ctx){
  const me = () => ctx.me(), B = () => ctx.B(), myId = () => ctx.myId();
  const save = async patch => { Object.assign(me(), patch); try { await B().saveUser(myId(), patch); } catch {} };
  const celebrate = (msg, kind = 'win') => { confetti(); sound(kind); if(msg) toast(msg); };
  const otherOf = c => c.members.find(x => x !== myId());

  /* ---------- סיכום שיעור + דירוג ---------- */
  function lessonSheet(cid, secs = 0){
    const c = ctx.chats().find(x => x.id === cid); if(!c) return;
    const o = otherOf(c), nm = c.names?.[o] || 'החברותא';
    let stars = 0; const tags = new Set();
    sheet(`<div style="text-align:center"><div style="font-size:44px">🎉</div><h3>איך היה עם ${esc(nm)}?</h3>
      <div class="small muted">${secs ? `למדתם ${Math.max(1, Math.round(secs / 60))} דקות. ` : ''}הדירוג עוזר לאחרים לבחור, והסיכום נשמר לשניכם.</div></div>
      <div class="starsrow" id="ls" role="radiogroup" aria-label="דירוג">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-s="${i}" role="radio" aria-checked="false" aria-label="${i} כוכבים">★</button>`).join('')}</div>
      <div class="chips" id="lt">${KTAGS.map(t => `<button type="button" class="chip" data-t="${esc(t)}">${t}</button>`).join('')}</div>
      <label for="ll">📒 מה למדנו?</label><textarea id="ll" rows="2" maxlength="300" placeholder="למשל: כלל השרשרת בנגזרות"></textarea>
      <label for="lr">🔁 מה לחזור עליו?</label><input id="lr" maxlength="150">
      <label for="lh">📝 שיעורי בית / משימה לפעם הבאה</label><input id="lh" maxlength="150">
      <button type="button" class="btn alt sm" id="lai" style="margin-top:10px">✨ סכם ושפר בעזרת AI</button><div class="small muted" id="lqs"></div>
      <div class="row" style="margin-top:14px"><button class="btn grn grow" id="lsv">שמירה</button><button class="btn alt" data-x>דלג</button></div>`, (el, close) => {
      el.querySelector('[data-x]').onclick = close;
      el.querySelector('#ls').onclick = e => { const b = e.target.closest('[data-s]'); if(!b) return; stars = +b.dataset.s;
        el.querySelectorAll('#ls button').forEach(x => { const on = +x.dataset.s <= stars; x.classList.toggle('on', on); x.setAttribute('aria-checked', +x.dataset.s === stars); }); };
      el.querySelector('#lt').onclick = e => { const b = e.target.closest('[data-t]'); if(!b) return; const t = b.dataset.t; tags.has(t) ? tags.delete(t) : tags.add(t); b.classList.toggle('on'); };
      let aiQs = [];
      el.querySelector('#lai').onclick = async e => { const notes = el.querySelector('#ll').value.trim(); if(notes.length < 12) return toast('כתוב בכמה מילים מה למדתם, ואז אסכם');
        const b = e.target; b.disabled = true; b.textContent = 'מסכם…'; const r = await ctx.ai().summarize(notes, c.subject || '');
        b.disabled = false; b.textContent = '✨ סכם ושפר בעזרת AI'; if(r.err) return toast(r.err);
        el.querySelector('#ll').value = r.data.learned || notes; el.querySelector('#lr').value = r.data.review || ''; el.querySelector('#lh').value = r.data.hw || ''; aiQs = (r.data.questions || []).slice(0, 3);
        el.querySelector('#lqs').innerHTML = aiQs.length ? '❓ שאלות תרגול: ' + aiQs.map(x => esc(x)).join(' · ') : ''; };
      el.querySelector('#lsv').onclick = async () => {
        const learned = ctx.clean(el.querySelector('#ll').value.trim()), review = ctx.clean(el.querySelector('#lr').value.trim()), hw = ctx.clean(el.querySelector('#lh').value.trim());
        const patch = {};
        if(stars) patch[`kudos.${myId()}`] = {s:stars, tags:[...tags], at:Date.now()};
        if(learned || review || hw) patch[`lessons.${Date.now().toString(36)}`] = {by:myId(), at:Date.now(), secs, learned, review, hw, qs:aiQs, subject:c.subject || ''};
        close();
        if(!Object.keys(patch).length) return;
        try { await B().updateChat(cid, patch); celebrate(stars >= 4 ? 'תודה! זה ישמח את ' + nm + ' 💛' : 'נשמר 🙌'); } catch { toast('לא הצלחנו לשמור'); }
      };
    });
  }
  function lessonsSheet(cid){
    const c = ctx.chats().find(x => x.id === cid); if(!c) return;
    const ls = Object.entries(c.lessons || {}).map(([id, l]) => ({id, ...l})).sort((a, b) => b.at - a.at);
    sheet(`<h3>📒 סיכומי שיעורים</h3>${ls.length ? ls.map(l => `<div class="card" style="margin:8px 0"><div class="small muted">${new Date(l.at).toLocaleDateString('he-IL')} · ${esc(c.names?.[l.by] || '')}${l.secs ? ` · ${Math.round(l.secs / 60)} דק׳` : ''}</div>
      ${l.learned ? `<div><b>למדנו:</b> ${esc(l.learned)}</div>` : ''}${l.review ? `<div><b>לחזור על:</b> ${esc(l.review)}</div>` : ''}${l.hw ? `<div><b>משימה:</b> ${esc(l.hw)}</div>` : ''}${(l.qs || []).length ? `<div><b>שאלות תרגול:</b><ol style="margin:4px 0;padding-inline-start:20px">${l.qs.map(q => `<li>${esc(q)}</li>`).join('')}</ol></div>` : ''}</div>`).join('')
      : '<div class="card empty">עוד אין סיכומים. אחרי שיחת וידאו תוכלו לסכם בלחיצה.</div>'}<button class="btn" data-x>סגירה</button>`, (el, close) => { el.querySelector('[data-x]').onclick = close; });
  }
  function kudosStats(){
    let n = 0, sum = 0; const tg = {};
    ctx.chats().forEach(c => { const k = c.kudos?.[otherOf(c)]; if(!k) return; n++; sum += k.s || 0; (k.tags || []).forEach(t => tg[t] = (tg[t] || 0) + 1); });
    return {n, avg: n ? sum / n : 0, tags: Object.entries(tg).sort((a, b) => b[1] - a[1]).slice(0, 4)};
  }
  function kudosCard(){
    const k = kudosStats();
    return `<div class="card" id="kud"><div class="row between"><b class="fred big">💬 מה אומרים עליי</b>${k.n ? `<span class="pill stars">${k.avg.toFixed(1)} ★ <small>(${k.n})</small></span>` : ''}</div>
      ${k.n ? `<div class="chips" style="margin-top:8px">${k.tags.map(([t, c]) => `<span class="chip on">${esc(t)}${c > 1 ? ' ×' + c : ''}</span>`).join('') || '<span class="small muted">עוד אין תגיות</span>'}</div>`
      : '<div class="small muted" style="margin-top:4px">אחרי שיחה, החברותא שלך יכול/ה לדרג אותך. כאן יופיעו הכוכבים והתגיות שלך.</div>'}</div>`;
  }

  /* ---------- מבחנים ---------- */
  const exams = () => (me().exams || []).filter(e => pd(e.d) && dayDiff(pd(e.d), sod()) >= -1).sort((a, b) => a.d.localeCompare(b.d));
  function plan(e){
    const n = dayDiff(pd(e.d), sod()), t0 = sod();
    const at = k => he(new Date(t0.getTime() + Math.max(0, Math.round(n * k)) * 864e5));
    return [['base', `חזרה על החומר והסימון של מה לא ברור (עד ${at(.3)})`], ['pair', `חברותא ותרגול בעיות (עד ${at(.65)})`], ['mock', `מבחן דמה קצר וסיכום (עד ${at(.9)})`]];
  }
  function examCard(){
    const e = exams().find(x => dayDiff(pd(x.d), sod()) >= 0);
    if(!e) return `<button class="card gamecard" id="exadd"><div class="ic" style="background:var(--sky)">📅</div><div class="grow" style="text-align:start"><b class="fred big">יש מבחן קרוב?</b><div class="small muted">הוסף תאריך ונבנה לך תוכנית חזרה</div></div><span class="big">+</span></button>`;
    const n = dayDiff(pd(e.d), sod()), pl = plan(e), done = new Set(e.done || []);
    return `<div class="card" id="exc" style="border-color:var(--sky)"><div class="row between"><b class="fred big">📅 מבחן ב${ICON[e.s] || ''}${esc(e.s)}</b><span class="pill ${n <= 2 ? 'fire' : ''}">${n === 0 ? 'היום!' : n === 1 ? 'מחר' : `בעוד ${n} ימים`}</span></div>
      <div class="small muted">${he(pd(e.d))}${e.t ? ' · ' + esc(e.t) : ''}</div>
      <div class="prog" style="margin:8px 0"><i style="width:${Math.round(done.size / 3 * 100)}%;background:var(--grn)"></i></div>
      ${pl.map(([k, t]) => `<label class="row" style="gap:8px;align-items:flex-start;margin:4px 0"><input type="checkbox" data-pk="${k}" style="width:auto;margin-top:4px" ${done.has(k) ? 'checked' : ''}><span class="${done.has(k) ? 'muted' : ''}">${t}</span></label>`).join('')}
      <div class="row" style="margin-top:8px"><button class="btn sm grn grow" id="exfind">🔍 חברותא לחזרה</button><button class="btn sm alt" id="exall">ניהול</button></div></div>`;
  }
  function bindExam(root){
    root.querySelector('#exadd')?.addEventListener('click', examSheet);
    root.querySelector('#exall')?.addEventListener('click', examSheet);
    root.querySelector('#exfind')?.addEventListener('click', () => { const e = exams().find(x => dayDiff(pd(x.d), sod()) >= 0); if(e) ctx.find(e.s); });
    root.querySelectorAll('[data-pk]').forEach(cb => cb.onchange = async () => {
      const list = me().exams || [], e = exams().find(x => dayDiff(pd(x.d), sod()) >= 0); if(!e) return;
      const i = list.findIndex(x => x.id === e.id); const d = new Set(list[i].done || []); cb.checked ? d.add(cb.dataset.pk) : d.delete(cb.dataset.pk);
      list[i] = {...list[i], done:[...d]}; await save({exams:list}); if(d.size === 3) celebrate('כל הכבוד! התוכנית הושלמה 🎯'); ctx.rerender();
    });
  }
  function examSheet(){
    const list = () => exams();
    const draw = el => { el.querySelector('#exl').innerHTML = list().map(e => `<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${ICON[e.s] || ''} ${esc(e.s)} · ${he(pd(e.d))}${e.t ? ' · ' + esc(e.t) : ''}</span><button class="link" data-del="${e.id}" aria-label="מחיקת מבחן">🗑️</button></div>`).join('') || '<div class="small muted">אין מבחנים</div>'; };
    sheet(`<h3>📅 המבחנים שלי</h3><div id="exl"></div>
      <label for="xs">מקצוע</label><select id="xs">${SUBJECTS.map(s => `<option>${esc(s)}</option>`).join('')}</select>
      <label for="xd">תאריך</label><input id="xd" type="date" min="${iso(sod())}">
      <label for="xt">נושא (לא חובה)</label><input id="xt" maxlength="60" placeholder="נגזרות, בניינים, ספר בראשית…">
      <div class="err" id="xe"></div><div class="row"><button class="btn grn grow" id="xa">הוספה</button><button class="btn alt" data-x>סגירה</button></div>`, (el, close) => {
      draw(el); el.querySelector('[data-x]').onclick = close;
      el.querySelector('#exl').onclick = async e => { const b = e.target.closest('[data-del]'); if(!b) return; await save({exams:(me().exams || []).filter(x => x.id !== b.dataset.del)}); draw(el); ctx.rerender(); };
      el.querySelector('#xa').onclick = async () => {
        const d = el.querySelector('#xd').value; if(!d || dayDiff(pd(d), sod()) < 0) return el.querySelector('#xe').textContent = 'בחר תאריך עתידי';
        const e = {id:Date.now().toString(36), s:el.querySelector('#xs').value, d, t:ctx.clean(el.querySelector('#xt').value.trim()), done:[]};
        await save({exams:[...(me().exams || []).slice(-9), e]}); close(); celebrate('נבנתה לך תוכנית חזרה 📅'); ctx.rerender();
      };
    });
  }

  /* ---------- שעות שקטות ---------- */
  function quietSheet(){
    const q = {on:false, from:21, to:7, ...(me().quiet || {})}, hrs = v => Array.from({length:24}, (_, h) => `<option value="${h}" ${h === v ? 'selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('');
    sheet(`<div style="text-align:center"><div style="font-size:44px">🌙</div><h3>שעות שקטות</h3></div>
      <p class="muted" style="margin:4px 0 10px">בשעות האלה לא מוצגות בקשות עזרה מיידיות ולא מושמעים צלילים, כדי לא ללמוד באמצע הלילה.</p>
      <label class="row" style="gap:8px;font-weight:700"><input type="checkbox" id="qo" style="width:auto" ${q.on ? 'checked' : ''}> להפעיל שעות שקטות</label>
      <div class="row" style="gap:10px;margin-top:10px"><div class="grow"><label for="qf">מ-</label><select id="qf">${hrs(q.from)}</select></div><div class="grow"><label for="qt">עד</label><select id="qt">${hrs(q.to)}</select></div></div>
      <div style="height:12px"></div><button class="btn" id="qs">שמירה</button>`, (el, close) => {
      el.querySelector('#qs').onclick = async () => { await save({quiet:{on:el.querySelector('#qo').checked, from:+el.querySelector('#qf').value, to:+el.querySelector('#qt').value}}); window.CV_QUIET = quietNow(me()); close(); toast('נשמר'); ctx.rerender(); };
    });
  }

  /* ---------- תצוגת הורים ---------- */
  function parentSheet(){
    const pin = localStorage.getItem('cv_ppin');
    if(!pin) return sheet(`<div style="text-align:center"><div style="font-size:44px">🔐</div><h3>קוד להורים</h3></div><p class="muted">בחרו קוד בן 4 ספרות. הוא מגן על תצוגת ההורים. הוא נשמר רק במכשיר הזה.</p>
      <input id="pp" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="••••" style="text-align:center;font-size:24px;letter-spacing:8px"><div class="err" id="pe"></div><button class="btn" id="ps">שמירה והמשך</button>`, (el, close) => {
      el.querySelector('#ps').onclick = () => { const v = el.querySelector('#pp').value; if(!/^\d{4}$/.test(v)) return el.querySelector('#pe').textContent = '4 ספרות בלבד'; localStorage.setItem('cv_ppin', v); close(); parentSheet(); }; });
    const show = el => {
      const cs = ctx.chats(), wk = Date.now() - 7 * 864e5;
      const sess = cs.flatMap(c => Object.values(c.sessions || {})).filter(s => s.status !== 'no' && s.at > wk).length;
      const calls = cs.reduce((a, c) => a + (c.callCount || 0), 0);
      el.innerHTML = `<h3>👨‍👩‍👧 תצוגת הורים</h3><p class="small muted">מוצגים נתוני שימוש כלליים בלבד. תוכן ההודעות והשיחות פרטי ואינו מוצג.</p>
        <div class="statrow"><div class="stat"><b>${cs.length}</b><small>שיחות צ׳אט</small></div><div class="stat"><b>${sess}</b><small>מפגשים השבוע</small></div><div class="stat"><b>${calls}</b><small>שיחות וידאו</small></div></div>
        <div class="card" style="margin:10px 0"><div class="small muted">חברותות</div>${cs.map(c => esc(c.names?.[otherOf(c)] || '')).filter(Boolean).join(' · ') || '<span class="muted">אין עדיין</span>'}</div>
        <div class="card" style="margin:10px 0"><div class="small muted">אישור הורה</div>${me().parent ? `✅ ${esc(me().parent.name)} · ${new Date(me().parent.at).toLocaleDateString('he-IL')}` : 'לא נדרש בכיתה זו'}</div>
        <div class="row"><button class="btn alt grow" id="pq">🌙 שעות שקטות</button><button class="btn alt grow" id="pr">🚩 דיווח לצוות</button></div>
        <div style="height:8px"></div><button class="btn" data-x>סגירה</button>`;
    };
    sheet(`<h3>🔐 קוד הורים</h3><input id="pp" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="••••" style="text-align:center;font-size:24px;letter-spacing:8px"><div class="err" id="pe"></div><button class="btn" id="ps">כניסה</button>`, (el, close) => {
      el.querySelector('#ps').onclick = () => { if(el.querySelector('#pp').value !== localStorage.getItem('cv_ppin')) return el.querySelector('#pe').textContent = 'קוד שגוי';
        show(el); el.querySelector('[data-x]').onclick = close; el.querySelector('#pq').onclick = () => { close(); quietSheet(); }; el.querySelector('#pr').onclick = () => { close(); ctx.helpMenu(); }; };
    });
  }

  /* ---------- כיתה ומורה ---------- */
  function classSheet(){
    const cur = me().cls;
    sheet(`<div style="text-align:center"><div style="font-size:44px">🏫</div><h3>הכיתה שלי</h3></div>
      <p class="muted" style="margin:4px 0 10px">מורה או יועצת יכולים לראות סיכום כללי של הכיתה (כמה תלמידים, כמה שיעורים), בלי שמות ובלי תוכן הודעות.</p>
      ${cur ? `<div class="card" style="text-align:center">הצטרפת לכיתה <b>${esc(cur)}</b></div>` : ''}
      <label for="cc">קוד כיתה</label><input id="cc" maxlength="12" autocomplete="off" value="${esc(cur || '')}" placeholder="למשל DEMO1" style="text-transform:uppercase">
      <div class="err" id="ce"></div><div class="row"><button class="btn grn grow" id="cs">${cur ? 'עדכון' : 'הצטרפות'}</button>${cur ? '<button class="btn alt" id="cl">יציאה</button>' : ''}</div>`, (el, close) => {
      el.querySelector('#cs').onclick = async () => { const v = el.querySelector('#cc').value.trim().toUpperCase().replace(/[^A-Z0-9א-ת]/g, ''); if(v.length < 3) return el.querySelector('#ce').textContent = 'קוד קצר מדי'; await save({cls:v}); close(); celebrate('הצטרפת לכיתה ' + v + ' 🏫'); ctx.rerender(); };
      el.querySelector('#cl')?.addEventListener('click', async () => { await save({cls:null}); close(); toast('יצאת מהכיתה'); ctx.rerender(); });
    });
  }
  /* ---------- סרטון הסבר (30 שניות) ---------- */
  const SCENES = [['🙋', 'תקוע בשיעורי בית?', 'בלי מורה פרטי ובלי לחכות למחר.', '#ff6b8a'],
    ['🔎', 'מוצאים תלמיד שכבר הבין', 'מתאימים לפי מקצוע, נושא וכיתה קרובה.', '#5cc8ff'],
    ['🎥', 'וידאו, לוח משותף ושיתוף מסך', 'מסבירים ומציירים ביחד, כמו בכיתה.', '#a98bff'],
    ['🎮', 'משחקים וקבוצות', 'חידונים, איקס־עיגול וחזרה למבחן בקבוצה.', '#5ee0a0'],
    ['🛡️', 'בטוח לכל תלמיד', 'אישור הורים, זיהוי חרם, דיווח וקווי סיוע.', '#ffd65c'],
    ['🏆', 'ביחד עושים חברותא', 'כוכבים, תגים ושעות התנדבות. בחינם.', '#ff6b8a']];
  function explainer(onDone){
    const el = document.createElement('div'); el.className = 'xp'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'סרטון הסבר');
    document.body.appendChild(el); let i = 0, t = 0;
    const stop = () => clearTimeout(t), close = () => { stop(); el.remove(); onDone && onDone(); };
    const draw = () => { const s = SCENES[i];
      el.style.setProperty('--c', s[3]);
      el.innerHTML = `<div class="xpbar">${SCENES.map((_, k) => `<i class="${k < i ? 'd' : k === i ? 'a' : ''}"></i>`).join('')}</div><button class="xpx" aria-label="סגירה">✕</button>
        <div class="xpscene" key="${i}"><div class="xpe">${s[0]}</div><h2 class="fred">${s[1]}</h2><p>${s[2]}</p></div>
        ${i === SCENES.length - 1 ? '<button class="btn grn xpgo">בואו נתחיל 🚀</button><button class="link xpre">▶ שוב</button>' : '<div class="small" style="opacity:.6">לחיצה למעבר</div>'}`;
      el.querySelector('.xpx').onclick = e => { e.stopPropagation(); close(); };
      el.querySelector('.xpgo')?.addEventListener('click', e => { e.stopPropagation(); close(); });
      el.querySelector('.xpre')?.addEventListener('click', e => { e.stopPropagation(); i = 0; draw(); });
      stop(); if(i < SCENES.length - 1) t = setTimeout(() => { i++; draw(); }, 5000); };
    el.onclick = () => { if(i < SCENES.length - 1){ i++; draw(); } };
    draw(); return close;
  }

  /* ---------- אבני דרך וחגיגות ---------- */
  function milestones(streak, todayCnt, goal){
    const day = new Date().toDateString();
    if(todayCnt >= goal && localStorage.getItem('cv_goal_day') !== day){ localStorage.setItem('cv_goal_day', day); setTimeout(() => celebrate('השלמת את היעד היומי! 🎯'), 500); return; }
    if([3, 7, 14, 30, 60, 100].includes(streak) && localStorage.getItem('cv_ms_streak') !== String(streak)){ localStorage.setItem('cv_ms_streak', String(streak)); setTimeout(() => celebrate(`🔥 ${streak} ימים ברצף!`), 600); }
  }

  /* ---------- אריחי כלים לפרופיל ---------- */
  const toolsHtml = () => `<div class="toolgrid">
    <button class="tool" data-xt="theme"><span>🌓</span><b>מראה</b><small id="thn">${themeName()}</small></button>
    <button class="tool" data-xt="quiet"><span>🌙</span><b>שעות שקטות</b><small>${me().quiet?.on ? 'פעיל' : 'כבוי'}</small></button>
    <button class="tool" data-xt="class"><span>🏫</span><b>הכיתה שלי</b><small>${me().cls ? esc(me().cls) : 'הצטרפות'}</small></button>
    <button class="tool" data-xt="exam"><span>📅</span><b>מבחנים</b><small>${exams().length || 'הוספה'}</small></button>
    <button class="tool" data-xt="parent"><span>👨‍👩‍👧</span><b>הורים</b><small>תצוגה מוגנת</small></button>
    <button class="tool" data-xt="teacher"><span>👩‍🏫</span><b>מורים</b><small>סיכום כיתה</small></button>
    <button class="tool" data-xt="ai"><span>🤖</span><b>עוזר AI</b><small>רמזים ומערך שיעור</small></button>
    <button class="tool" data-xt="course"><span>🎓</span><b>הכשרת מסבירים</b><small>${me().cert ? 'הוסמכת ✅' : 'קורס 3 דקות'}</small></button>
    <button class="tool" data-xt="cert"><span>📜</span><b>תעודת התנדבות</b><small>${((me().callMins || 0) / 60).toFixed(1)} שעות</small></button>
    <button class="tool wide" data-xt="video"><span>🎬</span><b>איך זה עובד</b><small>סרטון 30 שניות</small></button></div>`;
  function bindTools(root){
    root.querySelectorAll('[data-xt]').forEach(b => b.onclick = () => { const k = b.dataset.xt;
      if(k === 'theme'){ cycleTheme(); b.querySelector('small').textContent = themeName(); }
      else ({quiet:quietSheet, class:classSheet, exam:examSheet, parent:parentSheet, teacher:() => ctx.more().teacherSheet(), ai:() => ctx.ai().open('hint'), course:() => ctx.more().courseSheet(), cert:() => ctx.more().volunteerSheet(), video:() => explainer()})[k](); });
  }

  return {lessonSheet, lessonsSheet, kudosCard, examCard, bindExam, examSheet, quietSheet, parentSheet, classSheet, explainer, milestones, celebrate, toolsHtml, bindTools, kudosStats};
}
