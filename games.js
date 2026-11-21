// מיני משחקים בסגנון דואולינגו: שיעורים במסלול, נכון/לא נכון, התאמת זוגות, ואתגר 60 שניות
import { esc, shuffle, sound, confetti, vibrate, floatXP } from './ui.js';

export const ICON = {'מתמטיקה':'📐','פיזיקה':'⚛️','אנגלית':'🇬🇧','לשון':'✍️','היסטוריה':'🏛️','ביולוגיה':'🧬','כימיה':'🧪','מדעי המחשב':'💻','אזרחות':'⚖️','תנ״ך':'📜','ספרות':'📖','ערבית':'🌙'};

// כל שאלה: [שאלה, תשובה נכונה, הסחה, הסחה, הסחה]
export const BANK = {
  'מתמטיקה': {q:[
    ['הנגזרת של x²','2x','x','x³/3','2'],['כמה זה 15% מ-200?','30','15','20','35'],['הפתרון של 2x+6=14','x=4','x=10','x=3','x=8'],
    ['סכום הזוויות במשולש','180°','360°','90°','270°'],['log₂8 =','3','4','2','8'],['sin 30° =','½','1','√3/2','0'],
    ['שטח עיגול שרדיוסו r','πr²','2πr','πr','r²'],['(a+b)² =','a²+2ab+b²','a²+b²','a²+ab+b²','2a+2b']],
    p:[['5²','25'],['√81','9'],['2³','8'],['10⁰','1'],['½','0.5']]},
  'פיזיקה': {q:[
    ['יחידת המדידה של כוח','ניוטון','ג׳אול','ואט','פסקל'],['תאוצת הנפילה החופשית (בקירוב)','10 מ׳/ש²','1 מ׳/ש²','100 מ׳/ש²','3 מ׳/ש²'],
    ['החוק השני של ניוטון','F=ma','E=mc²','V=IR','P=mv'],['מהירות האור בריק (בקירוב)','300,000 ק״מ/ש׳','3,000 ק״מ/ש׳','340 מ׳/ש׳','30,000 ק״מ/ש׳'],
    ['מה נשמר בהתנגשות בלי כוחות חיצוניים?','התנע','המהירות','הגובה','הטמפרטורה'],['חוק אוהם','V=IR','F=ma','P=mv','Q=mcΔT'],
    ['אנרגיה קינטית =','½mv²','mgh','mv','ma']],
    p:[['כוח','ניוטון'],['אנרגיה','ג׳אול'],['הספק','ואט'],['מתח','וולט'],['זרם','אמפר']]},
  'אנגלית': {q:[
    ['מה התרגום של "library"?','ספרייה','חנות ספרים','מעבדה','כיתה'],['She ___ to school every day','goes','go','going','gone'],
    ['The past of "buy"','bought','buyed','brought','buys'],['ההפך של "ancient"','modern','old','huge','quiet'],
    ['If I ___ rich, I would travel','were','am','will be','be'],['מה פירוש "however"?','עם זאת','לכן','בנוסף','כי'],
    ['I have lived here ___ 2020','since','for','from','at']],
    p:[['happy','שמח'],['tired','עייף'],['brave','אמיץ'],['angry','כועס'],['careful','זהיר']]},
  'לשון': {q:[
    ['מה השורש של "התכתבו"?','כ-ת-ב','ת-כ-ת','ה-כ-ת','כ-ב-ו'],['באיזה בניין "הִתְלַבֵּשׁ"?','התפעל','פיעל','הפעיל','נפעל'],
    ['הרבים של "עיפרון"','עפרונות','עיפרונים','עפרונים','עיפרונות'],['איזו מילה היא שם תואר?','יפה','רץ','מהר','ספר'],
    ['הבניין הסביל של פיעל','פועל','הופעל','נפעל','התפעל'],['"הילדים ___ לטיול"','יצאו','יצא','יצאה','יצאנו']],
    p:[['כָּתַב','פעל'],['נִכְתַּב','נפעל'],['הִכְתִּיב','הפעיל'],['הִתְכַּתֵּב','התפעל'],['הוּכְתַּב','הופעל']]},
  'היסטוריה': {q:[
    ['מתי הוכרזה מדינת ישראל?','1948','1917','1967','1897'],['מי כינס את הקונגרס הציוני הראשון?','הרצל','בן גוריון','ויצמן','ז׳בוטינסקי'],
    ['הצהרת בלפור ניתנה בשנת','1917','1948','1922','1939'],['מלחמת העולם השנייה הסתיימה בשנת','1945','1939','1918','1950'],
    ['החלטת החלוקה של האו״ם התקבלה ב','29 בנובמבר 1947','14 במאי 1948','2 בנובמבר 1917','5 ביוני 1967'],
    ['היכן התכנס הקונגרס הציוני הראשון?','בזל','וינה','ירושלים','לונדון']],
    p:[['1897','הקונגרס הציוני'],['1917','הצהרת בלפור'],['1947','החלטת החלוקה'],['1948','הכרזת המדינה'],['1967','מלחמת ששת הימים']]},
  'ביולוגיה': {q:[
    ['איפה מתרחשת הפוטוסינתזה?','בכלורופלסט','במיטוכונדריה','בגרעין','בריבוזום'],['מה מכיל את המידע התורשתי?','DNA','ATP','גלוקוז','המוגלובין'],
    ['האברון שמפיק אנרגיה בתא','מיטוכונדריה','כלורופלסט','ליזוזום','גולג׳י'],['כמה כרומוזומים בתא גוף של אדם?','46','23','44','48'],
    ['אילו תאים נלחמים בזיהומים?','תאי דם לבנים','תאי דם אדומים','טסיות','פלזמה'],['האנזים ברוק שמפרק עמילן','עמילאז','פפסין','ליפאז','אינסולין']],
    p:[['ריבוזום','ייצור חלבונים'],['גרעין','מידע תורשתי'],['מיטוכונדריה','נשימה תאית'],['כלורופלסט','פוטוסינתזה'],['קרום התא','בקרת מעבר חומרים']]},
  'כימיה': {q:[
    ['הסמל הכימי של נתרן','Na','N','Ne','So'],['pH של מים טהורים','7','0','14','1'],['הנוסחה של מים','H₂O','HO₂','H₂O₂','OH'],
    ['מספר אבוגדרו (בקירוב)','6×10²³','3×10⁸','9.8','1.6×10⁻¹⁹'],['איזה קשר יש ב-NaCl?','יוני','קוולנטי','מתכתי','מימני'],['הסמל של זהב','Au','Ag','Gd','Go']],
    p:[['Fe','ברזל'],['Cu','נחושת'],['Ag','כסף'],['O','חמצן'],['C','פחמן']]},
  'מדעי המחשב': {q:[
    ['כמה ביטים בבית (byte)?','8','4','16','2'],['1010 בבינארי שווה','10','12','5','1010'],
    ['מה עובד לפי "נכנס אחרון, יוצא ראשון"?','מחסנית','תור','מערך','עץ'],['הסיבוכיות של חיפוש בינארי','O(log n)','O(n)','O(n²)','O(1)'],
    ['מה עושה לולאה?','חוזרת על קוד','מוחקת משתנה','שומרת קובץ','מתחברת לאינטרנט'],['true AND false =','false','true','null','1']],
    p:[['מחסנית','LIFO'],['תור','FIFO'],['if','תנאי'],['for','לולאה'],['int','מספר שלם']]},
  'אזרחות': {q:[
    ['כמה חברי כנסת יש?','120','100','150','61'],['מי מטיל את הרכבת הממשלה?','הנשיא','יו״ר הכנסת','נשיא העליון','ראש הממשלה'],
    ['מי מחוקק את החוקים?','הכנסת','הממשלה','בתי המשפט','הנשיא'],['איפה נחתמה מגילת העצמאות?','תל אביב','ירושלים','חיפה','בזל'],
    ['מה זה הפרדת רשויות?','חלוקת הכוח בין מחוקקת, מבצעת ושופטת','הפרדת דת ומדינה','בחירות כל 4 שנים','חופש הביטוי'],['גיל הבחירה לכנסת','18','16','21','17']],
    p:[['רשות מחוקקת','הכנסת'],['רשות מבצעת','הממשלה'],['רשות שופטת','בתי המשפט'],['ראש המדינה','הנשיא'],['ביקורת על השלטון','מבקר המדינה']]},
  'תנ״ך': {q:[
    ['מי הוביל את בני ישראל ממצרים?','משה','אהרן','יהושע','אברהם'],['כמה ספרים בחומש?','5','7','10','3'],['מי ניצח את גוליית?','דוד','שאול','שמשון','יהונתן'],
    ['מי בנה את בית המקדש הראשון?','שלמה','דוד','שאול','עזרא'],['מי בלע את יונה?','דג גדול','אריה','לווייתן כחול','נחש'],['הספר הראשון בתנ״ך','בראשית','שמות','יהושע','תהילים']],
    p:[['אברהם','שרה'],['יצחק','רבקה'],['יעקב','רחל'],['אלקנה','חנה'],['בועז','רות']]},
  'ספרות': {q:[
    ['מה זה "דמות עגולה"?','דמות מורכבת שמתפתחת','דמות שלא משתנה','המספר','דמות משנית'],['מי כתב את "הכניסיני תחת כנפך"?','ביאליק','רחל','טשרניחובסקי','עגנון'],
    ['מהי מטאפורה?','דימוי בלי מילת השוואה','חזרה על צליל','השוואה עם "כמו"','שאלה רטורית'],['מי כתב את "סיפור פשוט"?','ש״י עגנון','עמוס עוז','ביאליק','יהודה עמיחי'],
    ['שיר בן 14 שורות נקרא','סונטה','הייקו','בלדה','אודה'],['מה זה אירוניה?','פער בין הנאמר לכוונה','תיאור הטבע','סוף שמח','דמות ראשית']],
    p:[['דימוי','"כמו"'],['האנשה','תכונות אדם לדומם'],['חרוז','צליל דומה בסוף שורה'],['מספר יודע-כול','יודע מה כולם חושבים'],['שיא','רגע המתח הגבוה']]},
  'ערבית': {q:[
    ['מה פירוש "شكرا" (שוּכְּרַן)?','תודה','שלום','בבקשה','סליחה'],['איך אומרים "בית"?','بيت (בֵּית)','باب (בַּאבּ)','كتاب (כִּתַאבּ)','ولد (וַלַד)'],
    ['מה פירוש "مدرسة" (מַדְרַסֶה)?','בית ספר','מורה','ספרייה','עיר'],['"صباح الخير" (צַבַּאח אִלְח׳ֵיר)','בוקר טוב','לילה טוב','ערב טוב','להתראות'],
    ['מה פירוש "ماء" (מַיּ)?','מים','אוכל','אש','אוויר'],['מה פירוש "كبير" (כְּבִּיר)?','גדול','קטן','יפה','חדש']],
    p:[['واحد','1'],['اثنان','2'],['ثلاثة','3'],['أربعة','4'],['خمسة','5']]},
};
export const SUBJECTS = Object.keys(BANK);
export const LESSONS_PER_SUBJECT = 8;

const PRAISE = ['מעולה!','יפה מאוד!','בדיוק!','אלוף!','וואו!','כל הכבוד!'];
const pick = a => a[Math.floor(Math.random()*a.length)];

function buildLesson(subject){
  const b = BANK[subject], qs = shuffle(b.q);
  const steps = qs.slice(0,4).map(q => ({type:'mcq', q:q[0], right:q[1], opts:shuffle(q.slice(1,5))}));
  qs.slice(4,6).concat(qs.slice(0,2)).slice(0,2).forEach(q => {
    const truth = Math.random() < .5, shown = truth ? q[1] : pick(q.slice(2,5));
    steps.push({type:'tf', q:q[0], shown, right: truth});
  });
  steps.splice(2, 0, {type:'pairs', pairs: shuffle(b.p).slice(0,4)});
  return shuffle(steps.slice(0,2)).concat(steps.slice(2)); // הזוגות תמיד באמצע
}

function overlay(){
  document.querySelector('.lesson')?.remove();
  const el = document.createElement('div'); el.className = 'lesson'; document.body.appendChild(el); return el;
}

export function startLesson({subject, title, onFinish}){
  const steps = buildLesson(subject), el = overlay();
  let i = 0, hearts = 3, correct = 0, mistakes = 0, t0 = Date.now();
  el.innerHTML = `<div class="lhead"><button class="link" id="lx" aria-label="יציאה" style="font-size:24px;color:var(--mut)">✕</button>
    <div class="prog"><i id="pg" style="width:0"></i></div><b class="fred" id="hr" style="color:var(--pink)">❤️ 3</b></div>
    <div class="lbody" id="lb"></div>
    <div class="lfoot" id="lf"><div class="fb" id="fbt"></div><button class="btn grn" id="lc" disabled>בדיקה</button></div>`;
  const lb = el.querySelector('#lb'), lf = el.querySelector('#lf'), lc = el.querySelector('#lc'), fbt = el.querySelector('#fbt');
  el.querySelector('#lx').onclick = () => { if(confirm('לצאת מהשיעור? ההתקדמות לא תישמר')) el.remove(); };
  let check = null;
  const setProg = () => el.querySelector('#pg').style.width = (i / steps.length * 100) + '%';
  const feedback = (ok, msg) => {
    lf.className = 'lfoot ' + (ok ? 'ok' : 'bad'); fbt.textContent = msg; lc.disabled = false;
    lc.textContent = 'המשך'; lc.className = 'btn ' + (ok ? 'grn' : 'pink'); sound(ok ? 'ok' : 'bad'); vibrate(ok ? 20 : [40,40,40]);
    if(ok){ correct++; const r = lb.querySelector('.opt.right')?.getBoundingClientRect(); floatXP(pick(['+1 ⭐','🔥','✨','💪']), r ? r.left + r.width/2 : null, r ? r.top : null); } else { mistakes++; hearts--; el.querySelector('#hr').textContent = '❤️ ' + hearts; }
    check = () => { i++; hearts <= 0 ? fail() : next(); };
  };
  function next(){
    setProg(); lf.className = 'lfoot'; lc.className = 'btn grn'; lc.textContent = 'בדיקה'; lc.disabled = true;
    if(i >= steps.length) return finish();
    const s = steps[i];
    if(s.type === 'mcq'){
      let sel = null;
      lb.innerHTML = `<div class="small muted fred">בחר את התשובה הנכונה</div><div class="q">${esc(s.q)}</div>` +
        s.opts.map((o,k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join('');
      lb.onclick = e => { const b = e.target.closest('.opt'); if(!b || !check || check.done) return;
        lb.querySelectorAll('.opt').forEach(x => x.classList.toggle('sel', x === b)); sel = s.opts[b.dataset.k]; lc.disabled = false; };
      check = () => { check.done = true; const ok = sel === s.right;
        lb.querySelectorAll('.opt').forEach(x => { const v = s.opts[x.dataset.k]; if(v === s.right) x.classList.add('right'); else if(v === sel) x.classList.add('wrong'); });
        feedback(ok, ok ? pick(PRAISE) : 'התשובה הנכונה: ' + s.right); };
    } else if(s.type === 'tf'){
      let sel = null;
      lb.innerHTML = `<div class="small muted fred">נכון או לא נכון?</div><div class="q">${esc(s.q)}</div>
        <div class="card big fred" style="text-align:center;font-size:24px">${esc(s.shown)}</div>
        <div class="tf"><button class="opt" data-v="1">✓ נכון</button><button class="opt" data-v="0">✗ לא נכון</button></div>`;
      lb.onclick = e => { const b = e.target.closest('.opt'); if(!b || !check || check.done) return;
        lb.querySelectorAll('.opt').forEach(x => x.classList.toggle('sel', x === b)); sel = b.dataset.v === '1'; lc.disabled = false; };
      check = () => { check.done = true; const ok = sel === s.right;
        lb.querySelector(`.opt[data-v="${s.right?1:0}"]`).classList.add('right'); if(!ok) lb.querySelector(`.opt[data-v="${sel?1:0}"]`).classList.add('wrong');
        feedback(ok, ok ? pick(PRAISE) : (s.right ? 'זה דווקא נכון!' : 'לא נכון. ' + 'התשובה היא: ' + BANK[subject].q.find(q => q[0] === s.q)[1])); };
    } else {
      const L = shuffle(s.pairs.map((p,k) => ({t:p[0],k}))), R = shuffle(s.pairs.map((p,k) => ({t:p[1],k})));
      let a = null, left = s.pairs.length, miss = false;
      lb.innerHTML = `<div class="small muted fred">התאם את הזוגות</div><div class="q">לחץ על שני כרטיסים שמתאימים</div>
        <div class="pairs">${L.map((x,n) => `<button class="opt" data-s="L" data-k="${x.k}">${esc(x.t)}</button><button class="opt" data-s="R" data-k="${R[n].k}">${esc(R[n].t)}</button>`).join('')}</div>`;
      check = {done:true};
      lb.onclick = e => { const b = e.target.closest('.opt'); if(!b || b.classList.contains('gone')) return;
        if(!a || a.dataset.s === b.dataset.s){ lb.querySelectorAll('.opt.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); a = b; return; }
        if(a.dataset.k === b.dataset.k){ [a,b].forEach(x => { x.classList.remove('sel'); x.classList.add('right'); setTimeout(() => x.classList.add('gone'), 250); }); sound('ok'); a = null;
          if(--left === 0){ lc.disabled = false; lf.className = 'lfoot ok'; fbt.textContent = miss ? 'הצלחת!' : 'מושלם!'; lc.textContent = 'המשך';
            if(miss) mistakes++; else correct++; check = () => { i++; next(); }; }
        } else { const x = a; [x,b].forEach(y => { y.classList.remove('sel'); y.classList.add('wrong'); setTimeout(() => y.classList.remove('wrong'), 400); }); sound('bad'); miss = true; a = null; }
      };
    }
  }
  lc.onclick = () => check && check();
  function fail(){
    lb.innerHTML = `<div class="result"><div class="medal">💔</div><h2>נגמרו הלבבות</h2><p class="muted">זה בסדר! כל טעות היא חלק מהלמידה. אולי כדאי לבקש עזרה מחברותא ב${esc(subject)}?</p></div>`;
    lf.className = 'lfoot'; lc.disabled = false; lc.className = 'btn'; lc.textContent = 'נסה שוב';
    check = () => { el.remove(); startLesson({subject, title, onFinish}); };
    onFinish?.({passed:false, stars:0});
  }
  function finish(){
    const perfect = mistakes === 0, stars = 5 + (perfect ? 5 : 0) + hearts, secs = Math.round((Date.now() - t0) / 1000);
    sound('win'); confetti(); vibrate([30,60,30]);
    lb.innerHTML = `<div class="result"><div class="medal">${perfect ? '🏆' : '⭐'}</div>
      <h2 style="font-size:28px;color:var(--yel)">${perfect ? 'שיעור מושלם!' : 'השיעור הושלם!'}</h2>
      <div class="statrow"><div class="stat"><small>כוכבים</small><b>⭐ ${stars}</b></div>
      <div class="stat" style="border-color:var(--grn)"><small style="background:var(--grn)">דיוק</small><b>${Math.round(correct/(correct+mistakes)*100)}%</b></div>
      <div class="stat" style="border-color:var(--sky)"><small style="background:var(--sky)">זמן</small><b>${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}</b></div></div></div>`;
    lf.className = 'lfoot'; lc.disabled = false; lc.className = 'btn grn'; lc.textContent = 'המשך';
    check = () => el.remove();
    onFinish?.({passed:true, stars, perfect});
  }
  next();
}

// אתגר 60 שניות: כמה שיותר "נכון / לא נכון"
export function startSpeed({subjects, onFinish}){
  const el = overlay(), pool = (subjects?.length ? subjects : SUBJECTS).flatMap(s => BANK[s].q.map(q => [s,q]));
  let score = 0, streak = 0, best = 0, left = 60, cur, done = false;
  el.innerHTML = `<div class="lhead"><button class="link" id="lx" style="font-size:24px;color:var(--mut)">✕</button>
    <div class="prog"><i id="pg" style="width:100%;background:var(--yel)"></i></div><b class="timer" id="tm">60</b></div>
    <div class="lbody" id="lb"></div><div class="lfoot"><div class="row between"><b class="fred big">ניקוד: <span id="sc">0</span></b><b class="fred fire" id="st"></b></div></div>`;
  const lb = el.querySelector('#lb');
  const tick = setInterval(() => { left--; el.querySelector('#tm').textContent = left; el.querySelector('#pg').style.width = (left/60*100) + '%'; if(left <= 0) end(); }, 1000);
  el.querySelector('#lx').onclick = () => { clearInterval(tick); el.remove(); };
  function q(){
    const [s, x] = pick(pool), truth = Math.random() < .5; cur = truth;
    lb.innerHTML = `<div class="small muted fred">${ICON[s]||''} ${esc(s)}</div><div class="q">${esc(x[0])}</div>
      <div class="card fred" style="text-align:center;font-size:24px">${esc(truth ? x[1] : pick(x.slice(2,5)))}</div>
      <div class="tf"><button class="opt" data-v="1">✓ נכון</button><button class="opt" data-v="0">✗ לא נכון</button></div>`;
  }
  lb.onclick = e => { const b = e.target.closest('.opt'); if(!b || done) return; const ok = (b.dataset.v === '1') === cur;
    b.classList.add(ok ? 'right' : 'wrong'); sound(ok ? 'ok' : 'bad');
    if(ok){ streak++; score += streak >= 3 ? 2 : 1; } else { streak = 0; left = Math.max(1, left - 3); }
    best = Math.max(best, streak); el.querySelector('#sc').textContent = score; el.querySelector('#st').textContent = streak >= 3 ? `🔥 x2 (${streak})` : '';
    done = true; setTimeout(() => { done = false; q(); }, 280); };
  function end(){
    clearInterval(tick); done = true; sound('win'); if(score >= 10) confetti();
    lb.onclick = null;
    lb.innerHTML = `<div class="result"><div class="medal">⚡</div><h2 style="font-size:28px;color:var(--yel)">${score} נקודות!</h2>
      <p class="muted">רצף הכי ארוך: ${best} · קיבלת ⭐ ${score}</p><button class="btn yel" id="ag">שוב!</button><button class="btn alt" id="cl">סיום</button></div>`;
    el.querySelector('#ag').onclick = () => startSpeed({subjects, onFinish});
    el.querySelector('#cl').onclick = () => el.remove();
    onFinish?.({score});
  }
  q();
}
