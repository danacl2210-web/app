// רשת ביטחון: מזהה (רק במכשיר, בלי לשלוח לאף אחד) הודעות שמרמזות על מצוקה נפשית או חרם,
// ומציע עזרה מיד: קווי סיוע, מבוגר שסומכים עליו, ודיווח לצוות. המשתמש תמיד בוחר מה לעשות.
import { esc, sheet, toast } from './ui.js';

const norm = t => String(t || '').replace(/[֑-ׇ]/g, '').replace(/[׳'`´"״]/g, '')
  .replace(/[^֐-׿a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

// רמה 2: חשש לפגיעה עצמית
const CRISIS = [
  /(רוצה|רוצים|מתחשק לי|בא לי|חושב(ת)? על|חושב(ת)? ל|מתכנ(ן|נת)|החלטתי|עדיף ש?)\s*(למות|אמות|להתאבד|לסיים)/,
  /(אתאבד|אתאבדי|אפגע בעצמי|לפגוע בעצמי|פוגע בעצמי|פוגעת בעצמי|חותך את עצמי|חותכת את עצמי|חותך לעצמי|חותכת לעצמי|חתכתי את עצמי|אני מתאבד|אני מתאבדת)/,
  /(לא רוצה לחיות|אין טעם לחיות|אין לי טעם לחיות|לא רוצה להיות כאן יותר|נמאס לי לחיות|נמאס לי מהחיים|עדיף שלא הייתי|עדיף שלא נולדתי|כולם יסתדרו טוב יותר בלעדיי|כולם יהיו טובים יותר בלעדיי|אף אחד לא יתגעגע אלי)/,
  /(kill myself|want to die|wanna die|end my life|suicide)/,
];
const CRISIS_OK = /למות (מ|על|בשביל|כבר מ)/;   // "למות מצחוק", "למות על שוקולד"
// רמה 1: חרם והצקות
const BULLY = [
  /(עושים|עשו|עושה|עשתה|עושות) (לי|עליי|עלי) חרם/, /חרם (עליי|עלי)\b/, /חרם על /,
  /(הוציאו|העיפו|זרקו) אותי מ(ה)?(קבוצה|קבוצת|וואטסאפ|כיתה|צאט|צ׳אט)/, /(הדירו|מדירים|מדירות) אותי/,
  /(מציקים|מציקות|מציק|מציקה|הציקו|הציקה) לי/, /(מקניטים|מקניטות|הקניטו|קוראים לי שמות)/, /(צוחקים|צוחקות|לועגים|לועגות|לעגו|צחקו) (עליי|עלי)\b/,
  /(מתעללים|מתעללת|מתעלל|התעללו) בי/, /(מאיימים|איימו|מאיים|מאיימת) (עליי|עלי)\b/, /(מכים|הכו|מרביצים|הרביצו|דוחפים|דחפו) אותי/,
  /(מתנכלים|מתנכל|מתנכלת|התנכלו) לי/, /(הפיצו|מפיצים|מפיץ|מפיצה) (עליי|עלי|תמונה שלי|שמועות)/, /(צילמו|מצלמים) אותי (ופרסמו|ושלחו)/,
  /בריונות|סייבר בולינג|כולם נגדי|כל הכיתה נגדי/,
];
// רמה 1: מצוקה
const DISTRESS = [
  /מרגיש(ה|ים)? (ממש |כל כך |כזה |כזאת )?(לבד|בודד|בודדה|שקוף|שקופה|חסר ערך|חסרת ערך|מיותר|מיותרת|אבוד|אבודה|ריק|ריקה)/,
  /(אף אחד|אף אחת) (לא )?(אוהב|אוהבת|רוצה|מבין|מבינה|מדבר|מדברת|איכפת)/,
  /אין לי (אף אחד|חברים|חברה|חבר|עם מי לדבר|כוח לכלום|כוח לחיות)/,
  /(שונא|שונאת) (את עצמי|את החיים)/, /(בוכה|בוכים) (כל יום|כל לילה|הרבה)/,
  /(לא מסוגל|לא מסוגלת) יותר/, /(לא עומד|לא עומדת) בזה/,
  /(מדוכא|מדוכאת|דיכאון|התקף חרדה|התקפי חרדה)/, /(פוחד|פוחדת|מפחד|מפחדת) (ללכת|לבוא|להגיע) (לבית ספר|לבית הספר|לכיתה)/,
];

export function scan(text){
  const t = norm(text);
  if(!t) return {level:0, kind:null};
  if(CRISIS.some(r => r.test(t)) && !(CRISIS_OK.test(t) && !CRISIS.slice(1).some(r => r.test(t)))) return {level:2, kind:'crisis'};
  if(BULLY.some(r => r.test(t))) return {level:1, kind:'bully'};
  if(DISTRESS.some(r => r.test(t))) return {level:1, kind:'distress'};
  return {level:0, kind:null};
}

// הודעות שעלולות לפגוע בצד השני (לפני שליחה)
const SEVERE = /(^|\s)(תמות|תמותי|שתמות|שתמותי|תתאבד|תתאבדי|תעשה לעצמך משהו|תעשי לעצמך משהו)(\s|$)/;
const HURT = /(אתה לוזר|את לוזרית|אתה מכוער|את מכוערת|אתה מגעיל|את מגעילה|אף אחד לא (אוהב|רוצה|סובל) אותך|שונאים אותך|כולם שונאים אותך|אין לך חברים|תעלם|תיעלמי|אתה טיפש|את טיפשה|אתה אפס|את אפס|תסתום|תסתמי|אתה דפוק|את דפוקה)/;
export function hurtLevel(text){
  const t = norm(text);
  if(SEVERE.test(` ${t} `)) return 2;
  if(HURT.test(t)) return 1;
  return 0;
}

const CALL = (num, label, sub) => `<a class="hline" href="tel:${num}"><b>📞 ${label}</b><span class="small muted">${sub}</span></a>`;
const LINES = `<div class="hlines">
  ${CALL('1201', 'ער״ן 1201', 'עזרה ראשונה נפשית, חינם ואנונימי. בטלפון 24/7, ובצ׳אט באתר eran.org.il')}
  <a class="hline" href="https://sahar.org.il" target="_blank" rel="noopener"><b>💬 סה״ר – שיחה בצ׳אט</b><span class="small muted">הקשבה ותמיכה אנונימית ברשת, sahar.org.il</span></a>
  ${CALL('105', 'מוקד 105', 'פגיעה, איומים או הטרדה ברשת. מוקד משטרתי ייעודי לילדים ונוער, 24/7')}
  ${CALL('100', 'סכנה מיידית: 100 / 101', 'משטרה / מד״א. אם מישהו בסכנה עכשיו')}</div>`;

export function createWelfare(ctx){
  const me = () => ctx.me(), B = () => ctx.B();

  // הודעה מוכנה למבוגר שסומכים עליו
  async function tellAdult(kind){
    const text = kind === 'bully' ? 'היי, אני צריך לספר לך משהו. מציקים לי / עושים לי חרם ואני לא יודע מה לעשות. אפשר לדבר?'
      : 'היי, אני צריך לדבר איתך. עובר עלי תקופה קשה ואני צריך עזרה. אפשר לדבר?';
    try { if(navigator.share) return await navigator.share({text}); } catch(e){ if(e?.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('ההודעה הועתקה. אפשר להדביק ולשלוח להורה או למורה 💙'); } catch { toast(text); }
  }

  // מוצג למי שכתב על עצמו משהו קשה
  function supportSheet(kind = 'distress'){
    const crisis = kind === 'crisis', bully = kind === 'bully';
    const head = crisis ? ['💙','אנחנו כאן איתך', 'נשמע שקשה לך מאוד עכשיו. תודה שכתבת. אתה לא לבד, וזה בסדר לבקש עזרה. כדאי לדבר עם מישהו עוד היום.']
      : bully ? ['🛡️','זה לא באשמתך', 'חרם והצקות פוגעים, ומגיע לך שזה יפסיק. אפשר לעשות משהו, ואתה לא צריך להתמודד עם זה לבד.']
      : ['💙','שמנו לב שקשה לך', 'לפעמים כבר עוזר לדבר עם מישהו. הנה כמה דרכים, כולן בחינם.'];
    sheet(`<div style="text-align:center"><div style="font-size:52px">${head[0]}</div><h3>${head[1]}</h3><p class="muted" style="margin:6px 0 12px">${head[2]}</p></div>
      ${bully ? `<div class="hsteps"><div>1️⃣ <b>שמור הוכחות</b> – צילומי מסך של ההודעות</div><div>2️⃣ <b>ספר למבוגר</b> – הורה, מחנך או יועצת. זה לא סתם "לספר".</div><div>3️⃣ <b>אל תגיב</b> למציקים. אפשר לחסום ולדווח.</div></div>` : ''}
      ${LINES}
      <button class="btn grn" id="wt">👨‍👩‍👧 לשלוח הודעה למבוגר שאני סומך עליו</button>
      ${bully ? '<div style="height:8px"></div><button class="btn alt" id="wr">🚩 מישהו בחברותא פוגע בי – דיווח לצוות</button>' : ''}
      <div style="height:8px"></div><button class="btn alt" data-x>תודה, אני בסדר</button>
      <p class="small muted" style="margin:10px 0 0">🔒 הזיהוי קורה רק במכשיר שלך. לא שלחנו את ההודעה שלך לאף אחד, ואנחנו לא יודעים שקיבלת את ההודעה הזו.</p>`, (el, close) => {
        el.querySelector('[data-x]').onclick = close;
        el.querySelector('#wt').onclick = () => tellAdult(bully ? 'bully' : 'distress');
        el.querySelector('#wr') && (el.querySelector('#wr').onclick = () => { close(); ctx.pickReport(); });
      });
  }

  // מוצג למי שקיבל הודעה כזו מחבר
  function friendSheet(other, kind, onReply){
    const nm = esc(other?.name || 'החברותא');
    const replies = ['אני כאן ושומע אותך 💙','תודה שסיפרת לי. זה לא באשמתך','רוצה שנדבר עם מבוגר ביחד?','ער״ן 1201 זמינים כל הזמן, שווה להתקשר 💙'];
    sheet(`<div style="text-align:center"><div style="font-size:48px">💙</div><h3>${nm} אולי עובר/ת משהו קשה</h3><p class="muted" style="margin:6px 0 10px">${kind === 'bully' ? 'נשמע שמישהו מציק או עושה חרם.' : kind === 'crisis' ? 'ההודעה נשמעת מדאיגה.' : 'ההודעה נשמעת כמו מצוקה.'} אתה לא צריך לפתור את זה לבד, אבל מילה טובה עושה הרבה.</p></div>
      <div class="hsteps"><div>👂 <b>הקשב</b> בלי לשפוט ובלי למהר לתת עצות</div><div>🤍 <b>אל תשאיר לבד</b>: שאל איך הוא/היא מרגיש/ה ושב איתו/ה</div>
      <div>👨‍👩‍👧 <b>אל תבטיח לשמור סוד</b> אם יש חשש לסכנה. ספר למבוגר שסומכים עליו</div></div>
      <label>הודעות מוכנות</label><div class="chips" id="wq">${replies.map(r => `<span class="chip">${esc(r)}</span>`).join('')}</div>
      <div style="height:12px"></div>${LINES}
      ${kind === 'crisis' ? '<p class="small" style="color:var(--yel);margin:8px 0">אם נראה שיש סכנה מיידית – חייג 100/101 וספר למבוגר עכשיו.</p>' : ''}
      <button class="btn alt" id="wrep">🚩 דיווח לצוות חברותא</button><div style="height:8px"></div><button class="btn" data-x>סגירה</button>`, (el, close) => {
        el.querySelector('[data-x]').onclick = close;
        el.querySelector('#wq').onclick = e => { const c = e.target.closest('.chip'); if(!c) return; close(); onReply?.(c.textContent); };
        el.querySelector('#wrep').onclick = () => { close(); ctx.report(other, kind === 'bully' ? 'חרם או הצקות' : 'מצוקה נפשית'); };
      });
  }

  // כפתור "צריך עזרה" קבוע
  function helpMenu(){
    sheet(`<div style="text-align:center"><div style="font-size:48px">🫶</div><h3>צריך עזרה?</h3><p class="muted" style="margin:4px 0 12px">בחר מה הכי קרוב למה שקורה. אף אחד לא יידע שלחצת כאן.</p></div>
      <div class="list"><button class="btn alt" data-a="bully">🛡️ מציקים לי או עושים לי חרם</button><button class="btn alt" data-a="distress">💙 קשה לי נפשית</button>
      <button class="btn alt" data-a="app">🚩 מישהו בחברותא פוגע בי</button><button class="btn alt" data-a="friend">🤝 אני דואג/ת לחבר/ה</button></div>`, (el, close) => {
        el.onclick = e => { const a = e.target.closest('[data-a]')?.dataset.a; if(!a) return; close();
          if(a === 'app') return ctx.pickReport();
          if(a === 'friend') return friendSheet(null, 'distress');
          supportSheet(a); };
      });
  }

  // לפני שליחה: הודעה שעלולה לפגוע
  function hurtNudge(level, text, send, edit){
    if(level >= 2){
      sheet(`<div style="text-align:center"><div style="font-size:48px">🛑</div><h3>את ההודעה הזו לא שולחים</h3><p class="muted" style="margin:6px 0 12px">משפטים כאלה יכולים לפגוע מאוד, גם אם זה נכתב בכעס. בחברותא לא שולחים הודעות כאלה.</p></div>
        <button class="btn" data-x>הבנתי, אכתוב אחרת</button>`, (el, close) => el.querySelector('[data-x]').onclick = () => { close(); edit(); });
      return;
    }
    sheet(`<div style="text-align:center"><div style="font-size:48px">💭</div><h3>רגע לפני שליחה</h3><p class="muted" style="margin:6px 0 12px">ההודעה הזו עלולה לפגוע במי שיקבל אותה. רוצה לנסח אותה מחדש?</p></div>
      <button class="btn" id="e">✏️ לנסח מחדש</button><div style="height:8px"></div><button class="btn alt" id="s">לשלוח בכל זאת</button>`, (el, close) => {
        el.querySelector('#e').onclick = () => { close(); edit(); };
        el.querySelector('#s').onclick = () => { close(); send(); };
      });
  }

  // בדיקת מצב רוח יומית. נשמר רק במכשיר.
  const MOODS = [['😞',1],['😕',2],['🙂',3],['😀',4],['🤩',5]];
  const moodLog = () => { try { return JSON.parse(localStorage.getItem('cv_mood') || '[]'); } catch { return []; } };
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  const moodToday = () => moodLog().find(m => m.d === dayKey());
  function saveMood(v){
    const log = moodLog().filter(m => m.d !== dayKey()); log.push({d:dayKey(), v});
    try { localStorage.setItem('cv_mood', JSON.stringify(log.slice(-14))); } catch {}
    const last3 = log.slice(-3);
    return v <= 1 || (last3.length === 3 && last3.every(m => m.v <= 2));
  }
  const moodCard = () => moodToday() ? '' : `<div class="card" id="mood"><b class="fred big">איך עבר היום? 💭</b><div class="small muted">רק אתה רואה. נשמר במכשיר שלך.</div>
    <div class="row" style="justify-content:space-around;margin-top:10px">${MOODS.map(([e,v]) => `<button class="moodb" data-v="${v}" aria-label="מצב רוח ${v} מתוך 5">${e}</button>`).join('')}</div></div>`;

  function safetySheet(){
    sheet(`<div style="text-align:center"><div style="font-size:46px">🛡️</div><h3>איך אנחנו שומרים עליך</h3></div>
      <div class="hsteps" style="margin:10px 0">
        <div>🔒 <b>הטלפון שלך לא מוצג.</b> אחרים רואים רק שם וכיתה.</div>
        <div>🎓 <b>רק כיתות קרובות.</b> תלמידי ז׳–ח׳ מותאמים רק לכיתה אחת מעל או מתחת, ודורשים אישור הורה.</div>
        <div>💬 <b>זיהוי הודעות פוגעות</b> מתבצע במכשיר, והודעה פוגענית מקבלת הצעה לשנות לפני השליחה.</div>
        <div>💙 <b>עזרה למי שנפגע.</b> קווי סיוע, אפשרות לספר למבוגר מהימן, ודיווח בלחיצה.</div>
        <div>🚩 <b>דיווח וחסימה</b> בצ׳אט ובשיחת וידאו. דיווחים דחופים מגיעים למנהלים קודם.</div>
        <div>📝 <b>מצב רוח יומי</b> נשמר רק אצלך במכשיר.</div></div>
      <p class="small muted">במצב סכנה מיידית פונים ל-100 או 101.</p><button class="btn" data-x>הבנתי</button>`, (el, close) => { el.querySelector('[data-x]').onclick = close; });
  }
  return {scan, hurtLevel, supportSheet, friendSheet, helpMenu, hurtNudge, moodCard, saveMood, safetySheet};
}
