// חברותא – תלמידים עוזרים לתלמידים
// מצב ענן (Firebase, משתמשים אמיתיים) או מצב מקומי (localStorage, לבדיקה במכשיר אחד)
import { $, esc, avatar, toast, sheet, confetti, sound, deco, vibrate, countUp, flyStars, mascot, shareCard, tour } from './ui.js';
import { ICON, SUBJECTS, LESSONS_PER_SUBJECT, startLesson, startSpeed, startMemory, startBubbles } from './games.js';
import { startCall as _startCall, answerCall as _answerCall, declineCall, inCall } from './video.js';
const countCall = () => { me.calls = (me.calls||0) + 1; B.saveUser(myId, {calls: me.calls}).catch(() => {}); setTimeout(checkBadges, 4000); };
const startCall = (...a) => { countCall(); B.incChat(a[1], 'callCount').catch(() => {}); return _startCall(...a); };
const answerCall = (...a) => { countCall(); return _answerCall(...a); };

const GRADES = ['ז׳','ח׳','ט׳','י׳','י״א','י״ב'];
const DAYS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const DAYNAMES = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const BLOCKS = [{n:'בוקר',h:[8,9,10,11]},{n:'צהריים',h:[12,13,14,15]},{n:'אחה״צ',h:[16,17,18]},{n:'ערב',h:[19,20,21]}];
const PLACES = [['video','🎥 וידאו בחברותא'],['library','📚 ספרייה'],['school','🏫 בית הספר']];
const placeName = k => (PLACES.find(p => p[0] === k) || [0,k])[1];
const DAILY_GOAL = 3;

/* =============== backends =============== */

async function firebaseBackend(cfg){
  const b = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const [{initializeApp}, A, F] = await Promise.all([import(b+'firebase-app.js'), import(b+'firebase-auth.js'), import(b+'firebase-firestore.js')]);
  const app = initializeApp(cfg), auth = A.getAuth(app), db = F.getFirestore(app);
  const ms = v => v && v.toMillis ? v.toMillis() : (typeof v === 'number' ? v : Date.now());
  const data = d => d.data({serverTimestamps:'estimate'});
  const chatOf = d => { const x = data(d); return x ? {id:d.id, ...x, updatedAt:ms(x.updatedAt)} : null; };
  return {
    mode:'cloud',
    onAuth: cb => A.onAuthStateChanged(auth, u => cb(u ? u.uid : null)),
    register: (e,p) => A.createUserWithEmailAndPassword(auth,e,p),
    login: (e,p) => A.signInWithEmailAndPassword(auth,e,p),
    logout: () => A.signOut(auth),
    async deleteAccount(){ const u = auth.currentUser; await F.deleteDoc(F.doc(db,'users',u.uid)); await A.deleteUser(u); },
    async getUser(uid){ const s = await F.getDoc(F.doc(db,'users',uid)); return s.exists() ? {id:uid, ...s.data()} : null; },
    onUser: (uid,cb) => F.onSnapshot(F.doc(db,'users',uid), s => s.exists() && cb({id:uid, ...s.data()})),
    saveUser: (uid,d) => F.setDoc(F.doc(db,'users',uid), d, {merge:true}),
    async listUsers(){ const s = await F.getDocs(F.query(F.collection(db,'users'), F.limit(500))); return s.docs.map(d => ({id:d.id, ...d.data()})); },
    async openChat(me, other, names, subject){
      const id = [me,other].sort().join('_'), r = F.doc(db,'chats',id), s = await F.getDoc(r);
      if(!s.exists()) await F.setDoc(r, {members:[me,other].sort(), names, subject, lastText:'', lastFrom:'', updatedAt:F.serverTimestamp(), read:{}, starred:{}, sessions:{}});
      return id;
    },
    onChats: (uid,cb) => F.onSnapshot(F.query(F.collection(db,'chats'), F.where('members','array-contains',uid)), s => cb(s.docs.map(chatOf))),
    onChat: (cid,cb) => F.onSnapshot(F.doc(db,'chats',cid), d => cb(chatOf(d))),
    onMessages: (cid,cb) => F.onSnapshot(F.query(F.collection(db,'chats',cid,'messages'), F.orderBy('at'), F.limitToLast(300)),
      s => cb(s.docs.map(d => { const x = data(d); return {id:d.id, ...x, at:ms(x.at)}; }))),
    async send(cid, m){
      await F.addDoc(F.collection(db,'chats',cid,'messages'), {...m, at:F.serverTimestamp()});
      await F.updateDoc(F.doc(db,'chats',cid), {lastText:m.text, lastFrom:m.from, updatedAt:F.serverTimestamp()});
    },
    updateChat: (cid,patch) => F.updateDoc(F.doc(db,'chats',cid), patch),
    giveStar: uid => F.updateDoc(F.doc(db,'users',uid), {stars:F.increment(1)}),
    incChat: (cid,f) => F.updateDoc(F.doc(db,'chats',cid), {[f]:F.increment(1)}),
    setRating: (uid,d) => F.setDoc(F.doc(db,'ratings',uid), d),
    addThanks: d => F.addDoc(F.collection(db,'thanks'), d),
    addReport: d => F.addDoc(F.collection(db,'reports'), d),
    async listReports(){ const s = await F.getDocs(F.query(F.collection(db,'reports'), F.limit(300))); return s.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b) => b.at - a.at); },
    resolveReport: id => F.updateDoc(F.doc(db,'reports',id), {status:'done'}),
    setBan: (uid,v) => F.updateDoc(F.doc(db,'users',uid), {banned:v}),
    async listThanks(uid){ const s = await F.getDocs(F.query(F.collection(db,'thanks'), F.where('to','==',uid), F.limit(50))); return s.docs.map(d => d.data()).sort((a,b) => b.at - a.at); },
    async listRatings(){ const s = await F.getDocs(F.query(F.collection(db,'ratings'), F.limit(500))); return s.docs.map(d => ({id:d.id, ...d.data()})); },
    async isAdmin(uid){ try { return (await F.getDoc(F.doc(db,'admins',uid))).exists(); } catch { return false; } },
    async listAllChats(){ const s = await F.getDocs(F.query(F.collection(db,'chats'), F.limit(3000))); return s.docs.map(chatOf); },
    // שיחות וידאו
    async callReset(cid){ for(const r of ['caller','callee']){ const s = await F.getDocs(F.collection(db,'calls',cid,r)); await Promise.all(s.docs.map(d => F.deleteDoc(d.ref))); } },
    callSet: (cid,d,overwrite) => F.setDoc(F.doc(db,'calls',cid), d, overwrite ? {} : {merge:true}),
    async getCall(cid){ const s = await F.getDoc(F.doc(db,'calls',cid)); return s.exists() ? s.data() : null; },
    onCall: (cid,cb) => F.onSnapshot(F.doc(db,'calls',cid), s => cb(s.exists() ? s.data() : null)),
    callAddCand: (cid,role,c) => F.addDoc(F.collection(db,'calls',cid,role), c),
    onCallCands: (cid,role,cb) => F.onSnapshot(F.collection(db,'calls',cid,role), s => cb(s.docs.map(d => d.data()))),
  };
}

function localBackend(){
  const K = 'chavruta_local_v2';
  const load = () => { try { return JSON.parse(localStorage.getItem(K)) || null; } catch { return null; } };
  let S = load() || {uid:null, accounts:{}, users:{}, chats:{}, msgs:{}, calls:{}};
  S.calls ||= {};
  if(!Object.keys(S.users).length){
    const all = Array.from({length:7}, (_,d) => [`${d}-2`,`${d}-3`]).flat();
    [['s1','נועה','י״ב',['מתמטיקה','פיזיקה'],['היסטוריה'],'5 יח״ל מתמטיקה ופיזיקה, אוהבת להסביר עם ציורים',34],
     ['s2','איתי','י״א',['אנגלית','מדעי המחשב'],['כימיה'],'מתכנת בשעות הפנאי, אנגלית שפת אם',21],
     ['s3','מאיה','י׳',['ביולוגיה','לשון'],['מתמטיקה'],'מגמת ביולוגיה, סבלנית מאוד',12],
     ['s4','דניאל','י״ב',['היסטוריה','אזרחות','תנ״ך'],['אנגלית'],'עברתי בגרות בהיסטוריה עם 100',27],
    ].forEach(([id,name,grade,help,need,bio,stars],i) => S.users[id] = {name,grade,help,need,bio,stars,gameStars:i*40+15,streak:i+2,lastDay:today(),avail:all.filter((_,k) => (k+i)%3),seed:true,createdAt:Date.now()});
  }
  const subs = new Set();
  const save = () => { localStorage.setItem(K, JSON.stringify(S)); subs.forEach(f => f()); };
  const mut = fn => { S = load() || S; S.calls ||= {}; fn(S); save(); };   // קורא את המצב העדכני לפני כל שינוי
  addEventListener('storage', e => { if(e.key === K){ S = load() || S; subs.forEach(f => f()); } });
  const watch = f => { subs.add(f); f(); return () => subs.delete(f); };
  const fail = code => { const e = new Error(code); e.code = code; throw e; };
  const setPath = (o, path, v) => { const k = path.split('.'); while(k.length > 1){ const p = k.shift(); o = o[p] ||= {}; } o[k[0]] = v; };
  let authCb = () => {};
  const api = {
    mode:'local',
    onAuth(cb){ authCb = cb; cb(S.uid); return () => {}; },
    async register(e,p){
      if(p.length < 6) fail('auth/weak-password');
      if(S.accounts[e]) fail('auth/email-already-in-use');
      const uid = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
      mut(s => { s.accounts[e] = {uid,p}; s.uid = uid; }); authCb(uid);
    },
    async login(e,p){ const a = S.accounts[e]; if(!a || a.p !== p) fail('auth/invalid-credential'); mut(s => s.uid = a.uid); authCb(a.uid); },
    async logout(){ mut(s => s.uid = null); authCb(null); },
    async deleteAccount(){ const uid = S.uid; mut(s => { delete s.users[uid]; Object.keys(s.accounts).forEach(k => s.accounts[k].uid === uid && delete s.accounts[k]); s.uid = null; }); authCb(null); },
    async getUser(uid){ return S.users[uid] ? {id:uid, ...S.users[uid]} : null; },
    onUser: (uid,cb) => watch(() => S.users[uid] && cb({id:uid, ...S.users[uid]})),
    async saveUser(uid,d){ mut(s => s.users[uid] = {...(s.users[uid]||{}), ...d}); },
    async listUsers(){ return Object.entries(S.users).map(([id,u]) => ({id, ...u})); },
    async openChat(me,other,names,subject){
      const id = [me,other].sort().join('_');
      if(!S.chats[id]) mut(s => { s.chats[id] = {members:[me,other].sort(), names, subject, lastText:'', lastFrom:'', updatedAt:Date.now(), read:{}, starred:{}, sessions:{}}; s.msgs[id] = []; });
      return id;
    },
    onChats: (uid,cb) => watch(() => cb(Object.entries(S.chats).filter(([,c]) => c.members.includes(uid)).map(([id,c]) => ({id, ...c})))),
    onChat: (cid,cb) => watch(() => cb(S.chats[cid] ? {id:cid, ...S.chats[cid]} : null)),
    onMessages: (cid,cb) => watch(() => cb((S.msgs[cid]||[]).slice())),
    async send(cid,m){
      const at = Date.now();
      mut(s => { (s.msgs[cid] ||= []).push({...m, id:'m'+at+Math.random().toString(36).slice(2,6), at}); Object.assign(s.chats[cid], {lastText:m.text, lastFrom:m.from, updatedAt:at}); });
      // תלמידים לדוגמה עונים, כדי שאפשר יהיה לבדוק לבד
      const other = S.chats[cid].members.find(x => x !== m.from);
      if(!S.users[other]?.seed) return;
      if(m.type === 'text' && !S.msgs[cid].some(x => x.from === other))
        setTimeout(() => api.send(cid, {from:other, type:'text', text:'היי! בשמחה 😊 אפשר לקבוע לנו מפגש בכפתור 📅 ולדבר בווידאו.'}), 1400);
      if(m.type === 'session') setTimeout(async () => { await api.updateChat(cid, {[`sessions.${m.sid}.status`]:'ok'}); api.send(cid, {from:other, type:'text', text:'אישרתי! נתראה 👋'}); }, 1600);
    },
    async updateChat(cid,patch){ mut(s => Object.entries(patch).forEach(([k,v]) => setPath(s.chats[cid], k, v))); },
    async giveStar(uid){ mut(s => s.users[uid].stars = (s.users[uid].stars||0) + 1); },
    async incChat(cid,f){ mut(s => s.chats[cid][f] = (s.chats[cid][f]||0) + 1); },
    async setRating(uid,d){ mut(s => (s.ratings ||= {})[uid] = d); },
    async addThanks(d){ mut(s => (s.thanks ||= []).push(d)); },
    async addReport(d){ mut(s => (s.reports ||= []).push({...d, id:'r'+Date.now()})); },
    async listReports(){ return (S.reports||[]).slice().sort((a,b) => b.at - a.at); },
    async resolveReport(id){ mut(s => (s.reports||[]).forEach(r => { if(r.id === id) r.status = 'done'; })); },
    async setBan(uid,v){ mut(s => s.users[uid] && (s.users[uid].banned = v)); },
    async listThanks(uid){ return (S.thanks||[]).filter(t => t.to === uid).sort((a,b) => b.at - a.at); },
    async listRatings(){ return Object.entries(S.ratings||{}).map(([id,r]) => ({id, ...r})); },
    async isAdmin(){ return true; },
    async listAllChats(){ return Object.entries(S.chats).map(([id,c]) => ({id, ...c})); },
    async callReset(cid){ mut(s => s.calls[cid] = {doc:null, caller:[], callee:[]}); },
    async callSet(cid,d,overwrite){ mut(s => { const c = s.calls[cid] ||= {doc:null, caller:[], callee:[]}; c.doc = overwrite ? {...d} : {...(c.doc||{}), ...d}; }); },
    async getCall(cid){ return S.calls[cid]?.doc || null; },
    onCall: (cid,cb) => watch(() => cb(S.calls[cid]?.doc || null)),
    async callAddCand(cid,role,c){ mut(s => (s.calls[cid] ||= {doc:null, caller:[], callee:[]})[role].push(c)); },
    onCallCands: (cid,role,cb) => watch(() => cb(S.calls[cid]?.[role] || [])),
  };
  return api;
}

/* =============== helpers =============== */

const app = $('#app');
function today(d = new Date()){ return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
const yesterday = () => today(new Date(Date.now() - 864e5));
const totalStars = u => (u?.stars||0) + (u?.gameStars||0);
const level = u => 1 + Math.floor(totalStars(u) / 50);
const streakOf = u => (u?.lastDay === today() || u?.lastDay === yesterday()) ? (u.streak||0) : 0;
const todayCount = u => u?.todayDay === today() ? (u.todayCount||0) : 0;
const timeStr = t => { const d = new Date(t), n = new Date();
  return d.toDateString() === n.toDateString() ? d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}) : d.toLocaleDateString('he-IL',{day:'numeric',month:'numeric'}); };
const whenStr = t => new Date(t).toLocaleString('he-IL',{weekday:'long', day:'numeric', month:'numeric', hour:'2-digit', minute:'2-digit'});
function relStr(t){ const m = Math.round((t - Date.now()) / 60000);
  if(m <= 0) return 'עכשיו!'; if(m < 60) return `בעוד ${m} דק׳`; const h = Math.round(m/60); if(h < 24) return `בעוד ${h} שע׳`; const d = Math.round(h/24); return d === 1 ? 'מחר' : `בעוד ${d} ימים`; }
const canJoin = s => s.place === 'video' && s.status === 'ok' && Date.now() > s.at - 15*60000 && Date.now() < s.at + 90*60000;

// טלפון ← מזהה התחברות. מספר הטלפון לא מוצג לאף אחד.
function phoneKey(p){
  let d = String(p).replace(/\D/g, '');
  if(d.startsWith('972')) d = '0' + d.slice(3);
  return /^05\d{8}$/.test(d) ? `972${d.slice(1)}@phone.chavruta.app` : null;
}
const ERR = {
  'auth/weak-password':'הסיסמה צריכה לפחות 6 תווים','auth/email-already-in-use':'המספר הזה כבר רשום. נסה להתחבר',
  'auth/invalid-credential':'מספר או סיסמה לא נכונים','auth/wrong-password':'מספר או סיסמה לא נכונים','auth/user-not-found':'מספר או סיסמה לא נכונים',
  'auth/invalid-email':'מספר הטלפון לא תקין','auth/too-many-requests':'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות',
  'auth/network-request-failed':'אין חיבור לאינטרנט','auth/requires-recent-login':'מטעמי אבטחה, צא והתחבר שוב ואז נסה שוב',
};
const errMsg = e => ERR[e?.code] || 'משהו השתבש. נסה שוב';

/* =============== state =============== */

let isAdm = false, B, me = null, myId = null, tab = 'home', findMode = 'need', findSubject = '', pathSubject = '';
let chats = [], unsubChats = null, unsubMe = null, unsubView = [];
const cleanupView = () => { unsubView.forEach(f => f && f()); unsubView = []; };
const overlayOpen = () => $('.sheet-bg') || $('.lesson') || $('.call') || $('.chatwrap');

/* =============== install =============== */

let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
async function doInstall(){
  if(installEvt){ installEvt.prompt(); await installEvt.userChoice; installEvt = null; renderMain(); return; }
  sheet(`<h3>התקנת חברותא 📲</h3>
    <p class="muted">${isIOS() ? 'באייפון: לחץ על כפתור השיתוף <b>⬆️</b> בתחתית ספארי, ואז <b>"הוספה למסך הבית"</b>.'
      : 'בתפריט הדפדפן (⋮) בחר <b>"התקנת אפליקציה"</b> או <b>"הוספה למסך הבית"</b>.'}</p><button class="btn" data-x>הבנתי</button>`,
    (el,close) => el.querySelector('[data-x]').onclick = close);
}
const installBanner = () => (isStandalone() || localStorage.getItem('cv_hide_install')) ? '' :
  `<div class="banner"><div style="font-size:30px">📲</div><div class="grow"><b>התקן את חברותא</b><div class="small muted">ישר מהמסך של הטלפון, בלי לחפש</div></div>
   <button class="btn sm" id="inst">התקנה</button><button class="link" id="instx" aria-label="סגירה">✕</button></div>`;
function bindInstall(){ $('#inst') && ($('#inst').onclick = doInstall); $('#instx') && ($('#instx').onclick = () => { localStorage.setItem('cv_hide_install','1'); renderMain(); }); }

/* =============== auth =============== */

function renderAuth(mode = 'login'){
  cleanupView();
  const reg = mode === 'register';
  app.innerHTML = `<div class="page center">
    <img class="logo" src="logo.svg" alt=""><div class="brand">חברותא</div>
    <p class="sub">תלמידים עוזרים לתלמידים. חינם.</p>
    <form class="card" id="f" novalidate><div class="rainbar"></div>
      <h2 style="font-size:24px">${reg ? 'הרשמה 🎉' : 'ברוך שובך 👋'}</h2>
      <label for="ph">מספר טלפון</label><input id="ph" class="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="050-1234567" required>
      <label for="pw">סיסמה</label><input id="pw" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" minlength="6" placeholder="לפחות 6 תווים" required>
      ${reg ? '<label for="pw2">שוב את הסיסמה</label><input id="pw2" type="password" autocomplete="new-password" required>' : ''}
      <div class="err" id="er"></div>
      <button class="btn" id="go">${reg ? 'יצירת חשבון' : 'כניסה'}</button>
      <div class="row between" style="margin-top:8px"><button type="button" class="link" id="sw">${reg ? 'כבר יש לי חשבון' : 'אין לי חשבון – הרשמה'}</button>
        ${reg ? '' : '<button type="button" class="link" id="fp">שכחתי סיסמה</button>'}</div>
      ${reg ? '<label class="row small" style="gap:8px;font-weight:600;margin-top:10px;align-items:flex-start"><input type="checkbox" id="agree" style="width:auto;margin-top:3px"><span>קראתי ואני מסכים ל<a href="#" id="rl" style="color:var(--sky)">כללי ההתנהגות</a> ול<a href="privacy.html" style="color:var(--sky)">מדיניות הפרטיות</a>. מספר הטלפון שלי לא מוצג לאף אחד.</span></label>' : ''}
    </form>
    ${B.mode === 'local' ? '<p class="mode"><span class="badge-local">מצב מקומי</span> הנתונים נשמרים רק במכשיר הזה</p>' : ''}
  </div>`;
  $('#sw').onclick = () => renderAuth(reg ? 'login' : 'register');
  $('#rl') && ($('#rl').onclick = e => { e.preventDefault(); rulesSheet(); });
  $('#fp') && ($('#fp').onclick = () => sheet(`<h3>שכחת סיסמה?</h3><p class="muted">שלח הודעה לצוות חברותא מהמספר שאיתו נרשמת, ונאפס לך את הסיסמה.</p><button class="btn" data-x>הבנתי</button>`,
    (el,close) => el.querySelector('[data-x]').onclick = close));
  $('#f').onsubmit = async e => {
    e.preventDefault(); const er = $('#er'); er.textContent = '';
    const key = phoneKey($('#ph').value), pw = $('#pw').value;
    if(!key) return er.textContent = 'כתוב מספר נייד ישראלי, למשל 050-1234567';
    if(pw.length < 6) return er.textContent = 'הסיסמה צריכה לפחות 6 תווים';
    if(reg && pw !== $('#pw2').value) return er.textContent = 'הסיסמאות לא זהות';
    if(reg && !$('#agree').checked) return er.textContent = 'צריך לאשר את כללי ההתנהגות';
    const btn = $('#go'); btn.disabled = true;
    try { await (reg ? B.register : B.login)(key, pw); } catch(err){ er.textContent = errMsg(err); btn.disabled = false; }
  };
}

/* =============== onboarding / edit profile =============== */

function availGrid(sel){
  return `<div class="avail" id="av"><span></span>${BLOCKS.map(b => `<span class="h">${b.n}<br><span style="font-weight:400">${b.h[0]}–${b.h[b.h.length-1]+1}</span></span>`).join('')}
    ${DAYS.map((d,i) => `<span class="h">${d}</span>${BLOCKS.map((_,k) => `<button type="button" class="c ${sel.has(`${i}-${k}`)?'on':''}" data-a="${i}-${k}" aria-label="יום ${DAYNAMES[i]} ${BLOCKS[k].n}"></button>`).join('')}`).join('')}</div>`;
}

function renderOnboard(){
  cleanupView();
  const editing = !!me;
  const subj = {}; (me?.need||[]).forEach(s => subj[s] = 'need'); (me?.help||[]).forEach(s => subj[s] = 'help');
  const av = new Set(me?.avail || []);
  app.innerHTML = `<div class="page">
    ${editing ? '<button class="link" id="back" style="align-self:flex-start">→ חזרה</button>' : '<div class="brand" style="font-size:36px">ברוך הבא! ✨</div><p class="sub">עוד דקה ומוצאים לך חברותא</p>'}
    <div class="card"><div class="rainbar"></div>
      <label for="nm" style="margin-top:0">שם</label><input id="nm" maxlength="30" value="${esc(me?.name||'')}" placeholder="איך יקראו לך באפליקציה">
      <label for="gr">כיתה</label><select id="gr"><option value="">בחר כיתה</option>${GRADES.map(g => `<option ${g===me?.grade?'selected':''}>${g}</option>`).join('')}</select>
      <label for="bi">כמה מילים עליך <span class="muted small">(לא חובה)</span></label>
      <input id="bi" maxlength="90" value="${esc(me?.bio||'')}" placeholder="למשל: 5 יח״ל מתמטיקה, אוהב להסביר">
    </div>
    <div class="card"><h3>📚 מקצועות</h3>
      <p class="legend">לחיצה אחת: <span class="tag need">צריך עזרה</span> · שנייה: <span class="tag help">יכול לעזור</span> · שלישית: ביטול</p>
      <div class="chips" id="ch"></div></div>
    <div class="card"><h3>🕐 מתי נוח לך?</h3><p class="legend">סמן את הזמנים שאתה בדרך כלל פנוי. כך יציעו לך מפגשים רק בשעות שמתאימות.</p>${availGrid(av)}</div>
    <div class="err" id="er"></div><button class="btn" id="sv">${editing ? 'שמירה' : 'בוא נתחיל 🚀'}</button>
  </div>`;
  const draw = () => $('#ch').innerHTML = SUBJECTS.map(s => `<span class="chip ${subj[s]||''}" data-s="${esc(s)}">${ICON[s]} ${esc(s)}</span>`).join('');
  draw();
  $('#ch').onclick = e => { const s = e.target.closest('[data-s]')?.dataset.s; if(!s) return; subj[s] = subj[s] === 'need' ? 'help' : subj[s] === 'help' ? undefined : 'need'; draw(); };
  $('#av').onclick = e => { const c = e.target.closest('[data-a]'); if(!c) return; const k = c.dataset.a; av.has(k) ? av.delete(k) : av.add(k); c.classList.toggle('on'); };
  $('#back') && ($('#back').onclick = () => { tab = 'profile'; renderMain(); });
  $('#sv').onclick = async () => {
    const name = cleanText($('#nm').value.trim()), grade = $('#gr').value, bio = cleanText($('#bi').value.trim());
    const need = SUBJECTS.filter(s => subj[s] === 'need'), help = SUBJECTS.filter(s => subj[s] === 'help'), avail = [...av];
    const er = $('#er');
    if(!name) return er.textContent = 'כתוב את השם שלך';
    if(!grade) return er.textContent = 'בחר כיתה';
    if(!need.length && !help.length) return er.textContent = 'בחר לפחות מקצוע אחד';
    $('#sv').disabled = true;
    const d = editing ? {name, grade, bio, need, help, avail} : {name, grade, bio, need, help, avail, stars:0, gameStars:0, streak:0, createdAt:Date.now()};
    try { await B.saveUser(myId, d); me = {...(me||{}), id:myId, ...d}; tab = editing ? 'profile' : 'home'; editing ? renderMain() : (enterApp(), confetti(), toast('הפרופיל מוכן! 🎉')); }
    catch(e){ er.textContent = errMsg(e); $('#sv').disabled = false; }
  };
}

/* =============== main + tabs =============== */

const isUnread = c => c.lastFrom && c.lastFrom !== myId && (c.updatedAt||0) > (c.read?.[myId]||0);
function tabsBar(){
  const T = [['home','🏠','בית'],['find','🔍','חברותא'],['practice','🎮','תרגול'],['chats','💬','צ׳אטים'],['profile','⭐','פרופיל']];
  return `<nav class="tabs"><div>${T.map(([k,i,n]) => `<button data-t="${k}" class="${tab===k?'on':''}">${k==='chats' && chats.some(isUnread) ? '<span class="dot"></span>' : ''}<b>${i}</b>${n}</button>`).join('')}</div></nav>`;
}
function bindTabs(){ app.querySelectorAll('.tabs [data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; vibrate(8); renderMain(); }); }
function renderMain(){
  cleanupView(); window.scrollTo(0,0);
  ({home:renderHome, find:renderFind, practice:renderPractice, chats:renderChats, profile:renderProfile})[tab]();
  app.insertAdjacentHTML('beforeend', tabsBar()); bindTabs(); bindInstall();
  countUp(app);
  if(pendingFly){ const n = pendingFly; pendingFly = 0; setTimeout(() => flyStars(Math.min(10, Math.max(3, Math.round(n/2)))), 350); }
}
const pills = () => `<div class="row"><span class="pill fire" title="ימים ברצף">🔥 <span data-cu="streak" data-to="${streakOf(me)}">${streakOf(me)}</span></span><span class="pill stars" title="כוכבים">⭐ <span data-cu="stars" data-to="${totalStars(me)}">${totalStars(me)}</span></span></div>`;
let pendingFly = 0, scrollToPath = false;

function allSessions(){
  return chats.flatMap(c => Object.entries(c.sessions||{}).map(([sid,s]) => ({...s, sid, cid:c.id, other:c.members.find(x => x !== myId), name:c.names?.[c.members.find(x => x !== myId)]})))
    .filter(s => s.status !== 'no' && s.at > Date.now() - 90*60000).sort((a,b) => a.at - b.at);
}
function sessionCard(s){
  const d = new Date(s.at);
  return `<div class="card sess" data-cid="${esc(s.cid)}">
    <div class="when"><span class="small muted">${DAYS[d.getDay()]}</span><b>${d.getDate()}.${d.getMonth()+1}</b></div>
    <div class="grow"><b>${esc(s.subject||'')} עם ${esc(s.name||'')}</b>
      <div class="small muted">${d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})} · ${placeName(s.place)} · <b style="color:${s.status==='ok'?'var(--grn)':'var(--yel)'}">${s.status==='ok' ? relStr(s.at) : 'ממתין לאישור'}</b></div></div>
    ${canJoin(s) ? `<button class="btn grn sm" data-join="${esc(s.cid)}">🎥 הצטרף</button>` : `<button class="iconbtn" data-ics="${esc(s.cid)}|${esc(s.sid)}" aria-label="הוספה ליומן" title="הוספה ליומן">🗓️</button>`}</div>`;
}
function bindSessions(root){
  root.onclick = e => {
    const j = e.target.closest('[data-join]'), ic = e.target.closest('[data-ics]'), c = e.target.closest('[data-cid]');
    if(j){ const ch = chats.find(x => x.id === j.dataset.join); const o = ch.members.find(x => x !== myId); return startCall(B, ch.id, me, {id:o, name:ch.names?.[o]}); }
    if(ic){ const [cid,sid] = ic.dataset.ics.split('|'); const s = allSessions().find(x => x.cid === cid && x.sid === sid); return s && addToCalendar(s); }
    if(c) renderChat(c.dataset.cid);
  };
}
function addToCalendar(s){
  const f = t => new Date(t).toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Chavruta//HE','BEGIN:VEVENT',`UID:${s.sid}@chavruta`,`DTSTAMP:${f(Date.now())}`,
    `DTSTART:${f(s.at)}`,`DTEND:${f(s.at + 45*60000)}`,`SUMMARY:חברותא: ${s.subject} עם ${s.name}`,`LOCATION:${placeName(s.place).replace(/^\S+ /,'')}`,
    'BEGIN:VALARM','TRIGGER:-PT15M','ACTION:DISPLAY','DESCRIPTION:מפגש חברותא בעוד 15 דקות','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], {type:'text/calendar'})); a.download = 'chavruta.ics'; a.click();
}

function renderHome(){
  const h = new Date().getHours(), hi = h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : h < 21 ? 'ערב טוב' : 'לילה טוב';
  const ses = allSessions().slice(0,3), tc = todayCount(me), pct = Math.min(100, tc / DAILY_GOAL * 100);
  const nextSubj = (me.need||[])[0] || (me.help||[])[0] || SUBJECTS[0];
  app.innerHTML = `<div class="page">
    <div class="hero">
      <div class="row between"><div><div class="small" style="opacity:.85">${hi},</div><h2 style="font-size:28px">${esc(me.name)} 👋</h2></div>${pills()}</div>
      <div class="row" style="margin-top:14px;gap:14px">
        <div class="ring big2" style="--p:${pct}"><span><b>${tc}/${DAILY_GOAL}</b><small>היום</small></span></div>
        <div class="grow"><b class="fred big">${tc >= DAILY_GOAL ? 'השלמת את היעד היומי! 🎉' : 'היעד היומי שלך'}</b>
          <div class="small" style="opacity:.85">${tc >= DAILY_GOAL ? 'אפשר להמשיך לצבור כוכבים' : `עוד ${DAILY_GOAL - tc} שיעורים קצרים ב${ICON[nextSubj]} ${esc(nextSubj)}`}</div>
          <div class="lvl"><span>רמה ${level(me)}</span><div class="prog"><i style="width:${(totalStars(me) % 50) * 2}%;background:var(--rain)"></i></div></div></div>
      </div>
      <button class="btn grn" id="daily" style="margin-top:14px">▶ ${tc ? 'להמשיך לשחק' : 'להתחיל שיעור'}</button>
    </div>
    ${me.welcomed ? '' : `<div class="card welcome" id="wel"><div class="row between"><b class="fred big">💌 ברוך הבא לחברותא!</b><button class="link" id="welx" aria-label="סגירה">✕</button></div>
      <div class="small" style="margin-top:4px">כמה טיפים כדי להתחיל:</div>
      <ul class="small"><li>🔍 בלשונית <b>חברותא</b> מוצאים מי יעזור לך, או למי אתה יכול לעזור</li><li>📅 בצ׳אט קובעים מפגש בשעה שנוחה לשניכם, ומדברים ב-🎥 וידאו</li><li>🎮 שיעור קצר כל יום שומר על הרצף 🔥 ומביא כוכבים</li></ul>
      <div class="small muted" style="margin-top:6px">בהצלחה! צוות חברותא 💙</div></div>`}
    ${questsHtml()}
    ${installBanner()}
    <div class="head"><h3>📅 המפגשים הקרובים</h3>${ses.length ? '' : ''}</div>
    <div class="list" id="ses">${ses.length ? ses.map(sessionCard).join('') : `<div class="card empty">${mascot('', .6)}<br>עוד אין מפגשים.<br>מצא חברותא, ואז קבעו זמן בכפתור 📅 בצ׳אט.</div>`}</div>
    <div class="card gamecard" id="gofind"><div class="ic" style="background:var(--sky)">🔍</div><div class="grow"><b class="fred big">${(me.need||[]).length ? 'מצא מי יעזור לך' : 'מצא למי לעזור'}</b>
      <div class="small muted">${esc(((me.need||[]).length ? me.need : me.help||[]).slice(0,3).join(' · '))}</div></div><span class="big">←</span></div>
    <div class="card gamecard" id="gospeed"><div class="ic" style="background:var(--yel)">⚡</div><div class="grow"><b class="fred big">אתגר 60 שניות</b><div class="small muted">נכון או לא נכון, הכי מהר שאפשר</div></div><span class="big">←</span></div>
    <div id="onl"></div>
    ${!me.rated && (Object.keys(me.progress||{}).length || chats.length) ? `<div class="card gamecard" id="rate" style="background:linear-gradient(120deg,#3b2f0e,#1d2150)"><div class="ic" style="background:var(--yel)">💛</div><div class="grow"><b class="fred big">איך חברותא בשבילך?</b><div class="small muted">דרג אותנו בשתי שניות</div></div><span class="stars big">★★★★★</span></div>` : ''}
  </div>`;
  $('#rate') && ($('#rate').onclick = rateSheet);
  $('#chest').onclick = openChest;
  $('#welx') && ($('#welx').onclick = () => { me.welcomed = true; B.saveUser(myId, {welcomed:true}).catch(() => {}); $('#wel')?.remove(); });
  B.listUsers().then(us => { const on = us.filter(u => u.id !== myId && u.name && online(u)).slice(0,8), el = $('#onl'); if(!el || !on.length) return;
    el.innerHTML = `<div class="card"><b class="small" style="color:var(--grn)">● מחוברים עכשיו</b><div class="row" style="margin-top:8px;overflow-x:auto;gap:12px">${on.map(u => `<div style="text-align:center;flex:none">${avatarOn(u,44)}<div class="small">${esc(u.name)}</div></div>`).join('')}</div></div>`; }).catch(() => {});
  $('#daily').onclick = () => { pathSubject = nextSubj; const d = me.progress?.[nextSubj] || 0;
    if(d < LESSONS_PER_SUBJECT){ tab = 'practice'; renderMain(); lesson(nextSubj, true); } else { tab = 'practice'; scrollToPath = true; renderMain(); } };
  $('#gofind').onclick = () => { findMode = (me.need||[]).length ? 'need' : 'help'; tab = 'find'; renderMain(); };
  $('#gospeed').onclick = speed;
  bindSessions($('#ses'));
}

/* =============== find =============== */

async function renderFind(){
  const mine = findMode === 'need' ? (me.need||[]) : (me.help||[]);
  if(findSubject && !mine.includes(findSubject)) findSubject = '';
  app.innerHTML = `<div class="page">
    <div class="head"><h2 style="font-size:26px">מצא חברותא</h2>${pills()}</div>
    <div class="seg"><button data-m="need" class="${findMode==='need'?'on':''}">🙋 מי יעזור לי</button><button data-m="help" class="${findMode==='help'?'on':''}">🤝 למי אני יכול לעזור</button></div>
    ${mine.length ? `<div class="chips" id="fs"><span class="chip ${!findSubject?'on':''}" data-s="">הכול</span>${mine.map(s => `<span class="chip ${findSubject===s?'on':''}" data-s="${esc(s)}">${ICON[s]} ${esc(s)}</span>`).join('')}</div>` : ''}
    <div class="list" id="res"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></div>`;
  app.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { findMode = b.dataset.m; findSubject = ''; renderMain(); });
  $('#fs') && ($('#fs').onclick = e => { const c = e.target.closest('[data-s]'); if(!c) return; findSubject = c.dataset.s; renderMain(); });
  if(!mine.length){
    $('#res').innerHTML = `<div class="card empty">${findMode==='need' ? 'לא סימנת מקצועות שאתה צריך בהם עזרה.' : 'לא סימנת מקצועות שאתה יכול לעזור בהם.'}<br><button class="link" id="ed">עדכון מקצועות</button></div>`;
    $('#ed').onclick = renderOnboard; return;
  }
  let users; try { users = await B.listUsers(); } catch { $('#res') && ($('#res').innerHTML = '<div class="card empty">לא הצלחנו לטעון. בדוק את החיבור לאינטרנט.</div>'); return; }
  if(!$('#res') || tab !== 'find') return;
  const want = findSubject ? [findSubject] : mine, field = findMode === 'need' ? 'help' : 'need', myAv = new Set(me.avail||[]);
  const res = users.filter(u => u.id !== myId && u.name && !u.banned && !isBlocked(u.id) && !(u.blocked||[]).includes(myId)).map(u => {
    const match = (u[field]||[]).filter(s => want.includes(s));
    const back = findMode === 'need' ? (u.need||[]).filter(s => (me.help||[]).includes(s)) : [];
    const common = (u.avail||[]).filter(a => myAv.has(a)).length;
    return {u, match, back, common, score: match.length*10 + back.length*3 + Math.min(common,6) + Math.min(totalStars(u),100)/25};
  }).filter(x => x.match.length).sort((a,b) => b.score - a.score);
  if(!res.length){
    $('#res').innerHTML = `<div class="card empty">עוד אין כאן תלמידים ${findMode==='need'?'שיכולים לעזור':'שצריכים עזרה'} ב${esc(want.join(', '))}.<br>שתף את חברותא עם חברים מהכיתה 💫<br><button class="btn sm" id="sh" style="margin-top:12px">שיתוף</button></div>`;
    $('#sh').onclick = share; return;
  }
  const onl = users.filter(u => u.id !== myId && u.name && online(u)).length;
  $('#res').insertAdjacentHTML('beforebegin', onl ? `<div class="small" style="color:var(--grn);font-weight:700">● ${onl} באפליקציה עכשיו</div>` : '');
  $('#res').innerHTML = res.sort((a,b) => online(b.u) - online(a.u) || b.score - a.score).map(({u,match,back,common}) => `<div class="card item" data-u="${esc(u.id)}">${avatarOn(u)}
    <div class="grow"><div class="row between"><b>${esc(u.name)} <span class="muted small">· ${esc(u.grade||'')}</span></b><span class="score">${online(u) ? '<span style="color:var(--grn)">🟢 עכשיו · </span>' : ''}⭐ ${totalStars(u)}</span></div>
      ${u.bio ? `<div class="small muted ellipsis">${esc(u.bio)}</div>` : ''}
      <div>${match.map(s => `<span class="tag ${findMode==='need'?'help':'need'}">${ICON[s]} ${esc(s)}</span>`).join('')}${back.length ? `<span class="tag need">ואתה עוזר ב${esc(back[0])}</span>` : ''}${common ? `<span class="tag sky">🕐 ${common} זמנים משותפים</span>` : ''}</div>
    </div></div>`).join('');
  $('#res').onclick = e => { const c = e.target.closest('[data-u]'); if(!c) return; const r = res.find(x => x.u.id === c.dataset.u); requestSheet(r.u, r.match); };
}

function requestSheet(u, match){
  const ask = findMode === 'need';
  const def = s => ask ? `היי ${u.name}! ראיתי שאפשר לקבל ממך עזרה ב${s}. אשמח מאוד 🙏` : `היי ${u.name}! ראיתי שצריך עזרה ב${s}. אשמח לעזור 😊`;
  sheet(`<div class="row" style="margin-bottom:10px">${avatar(u.id,u.name,58)}<div><h3>${esc(u.name)}</h3><div class="muted small">כיתה ${esc(u.grade||'')} · ⭐ ${totalStars(u)} · רמה ${level(u)} · 🔥 ${streakOf(u)}</div></div></div>
    ${u.bio ? `<p class="muted" style="margin:6px 0">${esc(u.bio)}</p>` : ''}
    <div id="uthx"></div>
    <label for="rs">מקצוע</label><select id="rs">${match.map(s => `<option>${esc(s)}</option>`).join('')}</select>
    <label for="rt">הודעה ראשונה</label><textarea id="rt" rows="3">${esc(def(match[0]))}</textarea>
    <div style="height:14px"></div><button class="btn" id="rg">${ask ? '🙋 בקשת עזרה' : '🤝 הצעת עזרה'}</button>
    <div class="row between" style="margin-top:8px"><button class="link small" id="rrules">🛡️ כללי ההתנהגות</button><button class="link small" id="rrep" style="color:var(--pink)">🚩 דיווח</button></div>`, (el, close) => {
      el.querySelector('#rrules').onclick = () => { close(); rulesSheet(); };
      el.querySelector('#rrep').onclick = () => { close(); reportSheet({id:u.id, name:u.name}); };
      const rs = el.querySelector('#rs'), rt = el.querySelector('#rt'); rs.onchange = () => rt.value = def(rs.value);
      B.listThanks(u.id).then(ts => { const box = el.querySelector('#uthx'); if(box && ts.length) box.innerHTML = `<b class="small">💛 מה אומרים על ${esc(u.name)}</b>` + ts.slice(0,3).map(t => `<div class="thx">"${esc(t.text)}" <span class="muted small">· ${esc(t.fromName||'')}</span></div>`).join(''); }).catch(() => {});
      el.querySelector('#rg').onclick = async e => { const text = rt.value.trim(); if(!text) return; e.target.disabled = true;
        try { const cid = await B.openChat(myId, u.id, {[myId]:me.name, [u.id]:u.name}, rs.value); await B.send(cid, {from:myId, type:'text', text}); markDay('msgDay'); close(); renderChat(cid); }
        catch(err){ e.target.disabled = false; toast(errMsg(err)); } };
    });
}

/* =============== practice (mini games) =============== */

function practiceSubjects(){ const m = [...(me.need||[]), ...(me.help||[])]; return [...m, ...SUBJECTS.filter(s => !m.includes(s))]; }
function renderPractice(){
  const subs = practiceSubjects(); if(!pathSubject) pathSubject = subs[0];
  const done = me.progress?.[pathSubject] || 0, tc = todayCount(me);
  const off = [0,55,85,55,0,-55,-85,-55];
  app.innerHTML = `<div class="page">
    <div class="head"><h2 style="font-size:26px">תרגול 🎮</h2>${pills()}</div>
    <div class="card gamecard"><div class="ring" style="--p:${Math.min(100,tc/DAILY_GOAL*100)}"><span>${tc}/${DAILY_GOAL}</span></div>
      <div class="grow"><b class="fred">יעד יומי</b><div class="small muted">${tc >= DAILY_GOAL ? 'השלמת היום! 🔥 הרצף נשמר' : 'שיעור אחד ביום שומר על הרצף 🔥'}</div>${weekStrip()}</div></div>
    <div class="head"><h3>🕹️ ארקייד</h3><span class="small muted">כל משחק = כוכבים</span></div>
    <div class="arcade">
      <button class="arc" id="gospeed" style="--a:#ffd65c;--b:#ff9f5c"><span class="ai">⚡</span><b>60 שניות</b><small>נכון או לא נכון</small>${me.best?.speed ? `<em>שיא ${me.best.speed}</em>` : ''}</button>
      <button class="arc" id="gobub" style="--a:#5cc8ff;--b:#a98bff"><span class="ai">🫧</span><b>בועות</b><small>פוצץ את התשובה</small>${me.best?.bubbles ? `<em>שיא ${me.best.bubbles}</em>` : ''}</button>
      <button class="arc" id="gomem" style="--a:#ff6b8a;--b:#a98bff"><span class="ai">🧠</span><b>זיכרון</b><small>מצא את הזוגות</small>${me.best?.memory ? `<em>שיא ⭐${me.best.memory}</em>` : ''}</button>
      <button class="arc" id="golb" style="--a:#5ee0a0;--b:#5cc8ff"><span class="ai">🏅</span><b>אלופים</b><small>טבלת הכוכבים</small></button>
    </div>
    <div class="head" style="margin-top:4px"><h3>🗺️ המסלול שלי</h3></div>
    <div class="chips" id="ps" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px">${subs.map(s => `<span class="chip ${s===pathSubject?'on':''}" style="flex:none" data-s="${esc(s)}">${ICON[s]} ${esc(s)}</span>`).join('')}</div>
    <div class="card" style="text-align:center;background:linear-gradient(120deg,#1f6b4f,#1d2150)"><b class="fred big">${ICON[pathSubject]} ${esc(pathSubject)}</b>
      <div class="small">שיעור ${Math.min(done+1, LESSONS_PER_SUBJECT)} מתוך ${LESSONS_PER_SUBJECT}${done >= LESSONS_PER_SUBJECT ? ' · סיימת את המסלול! 🏆' : ''}</div></div>
    <div class="path" id="path">${Array.from({length:LESSONS_PER_SUBJECT}, (_,i) => {
      const st = i < done ? 'done' : i === done ? 'cur' : 'lock', ic = i === LESSONS_PER_SUBJECT-1 ? '🏆' : i % 3 === 2 ? '🎁' : st === 'done' ? '✓' : '⭐';
      return `<button class="node ${st}" data-i="${i}" style="left:${off[i%8]}px" aria-label="שיעור ${i+1}">${ic}</button>`; }).join('')}</div>
  </div>`;
  $('#ps').onclick = e => { const c = e.target.closest('[data-s]'); if(!c) return; pathSubject = c.dataset.s; renderMain(); };
  $('#path').onclick = e => { const n = e.target.closest('.node'); if(!n) return; const i = +n.dataset.i;
    if(i > done) return toast('🔒 קודם צריך לסיים את השיעור הקודם');
    lesson(pathSubject, i >= done); };
  $('#gospeed').onclick = speed; $('#golb').onclick = leaderboard; $('#gobub').onclick = bubbles; $('#gomem').onclick = memory;
  if(scrollToPath){ scrollToPath = false; setTimeout(() => $('.node.cur')?.scrollIntoView({block:'center', behavior:'smooth'}), 120); }
}

async function reward(stars, advanceSubject, perfect){
  const t = today(), wasToday = me.lastDay === t;
  const d = {gameStars:(me.gameStars||0) + stars, todayDay:t, todayCount:todayCount(me) + 1, lastDay:t, days:[...new Set([...(me.days||[]), t])].slice(-14),
    streak: wasToday ? (me.streak||1) : (me.lastDay === yesterday() ? (me.streak||0) + 1 : 1)};
  if(perfect) d.perfects = (me.perfects||0) + 1;
  if(advanceSubject) d.progress = {...(me.progress||{}), [advanceSubject]: Math.min(LESSONS_PER_SUBJECT, (me.progress?.[advanceSubject]||0) + 1)};
  pendingFly += stars;
  me = {...me, ...d};
  try { await B.saveUser(myId, d); } catch {}
  if(!wasToday) setTimeout(() => toast(d.streak === 1 ? '🔥 התחלת רצף! תחזור מחר כדי להמשיך' : `🔥 רצף של ${d.streak} ימים!`), 1200);
  setTimeout(checkBadges, 300);
  if(!$('.lesson')) renderMain();
}
function lesson(subject, advance){
  startLesson({subject, onFinish: r => { if(r.passed) reward(r.stars, advance ? subject : null, r.perfect); } });
  // כשהשיעור נסגר – מרעננים את המסך
  const obs = new MutationObserver(() => { if(!$('.lesson')){ obs.disconnect(); renderMain(); } }); obs.observe(document.body, {childList:true});
}
function saveBest(k, v){
  if(!(v > (me.best?.[k] || 0))) return;
  const had = me.best?.[k]; me.best = {...(me.best||{}), [k]: v}; B.saveUser(myId, {best: me.best}).catch(() => {});
  if(had) setTimeout(() => toast(`🏆 שיא אישי חדש: ${v}!`), 900);
}
function whenClosed(){ const obs = new MutationObserver(() => { if(!$('.lesson')){ obs.disconnect(); renderMain(); } }); obs.observe(document.body, {childList:true}); }
function speed(){ startSpeed({subjects: practiceSubjects().slice(0,4), onFinish: r => { saveBest('speed', r.score); markDay('arcDay'); r.score > 0 && reward(r.score, null); }}); whenClosed(); }
function bubbles(){ startBubbles({subjects: practiceSubjects().slice(0,4), onFinish: r => { saveBest('bubbles', r.score); markDay('arcDay'); r.score > 0 && reward(r.score, null); }}); whenClosed(); }
function memory(){ startMemory({subjects: practiceSubjects().slice(0,3), onFinish: r => { saveBest('memory', r.stars); markDay('arcDay'); reward(r.stars, null); }}); whenClosed(); }
async function leaderboard(){
  const close = sheet('<h3>🏅 טבלת האלופים</h3><div id="lb"><div class="spin"></div></div>');
  let users = []; try { users = await B.listUsers(); } catch {}
  const top = users.filter(u => u.name && !u.banned).sort((a,b) => totalStars(b) - totalStars(a)).slice(0,15);
  const el = $('#lb'); if(!el) return;
  const pod = [top[1], top[0], top[2]].map((u,k) => u ? `<div class="p${[2,1,3][k]}">${k === 1 ? '<div style="font-size:26px">👑</div>' : ''}${avatar(u.id,u.name,[48,60,44][k])}<div class="small" style="font-weight:700;margin-top:4px">${esc(u.name)}</div><div class="score small">⭐ ${totalStars(u)}</div><div class="blk">${[2,1,3][k]}</div></div>` : '<div></div>').join('');
  el.innerHTML = `<div class="podium">${pod}</div><div class="list" style="margin-top:12px">${top.slice(3).map((u,j) => { const i = j + 3; return `<div class="row" style="padding:6px 4px;${u.id===myId?'background:#123150;border-radius:12px':''}">
    <b class="fred" style="width:28px;text-align:center">${['🥇','🥈','🥉'][i] || i+1}</b>${avatar(u.id,u.name,38)}<b class="grow">${esc(u.name)}${u.id===myId?' (אתה)':''}</b><span class="score">⭐ ${totalStars(u)}</span></div>`; }).join('')}</div>
    <div style="height:12px"></div><button class="btn alt" id="lbx">סגירה</button>`;
  $('#lbx').onclick = close;
}

/* =============== chats =============== */

function renderChats(){
  const list = chats.filter(c => !isBlocked(c.members.find(x => x !== myId))).sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
  app.innerHTML = `<div class="page"><div class="head"><h2 style="font-size:26px">צ׳אטים</h2>${pills()}</div>
    <div class="list">${list.length ? list.map(c => { const o = c.members.find(x => x !== myId), nm = c.names?.[o] || 'חברותא';
      return `<div class="card item" data-c="${esc(c.id)}">${avatar(o,nm)}<div class="grow">
        <div class="row between"><b>${esc(nm)}</b><span class="small muted">${c.updatedAt ? timeStr(c.updatedAt) : ''}</span></div>
        <div class="small ${isUnread(c)?'':'muted'} ellipsis">${isUnread(c)?'<b style="color:var(--pink)">●</b> ':''}${ICON[c.subject]||''} ${esc(c.subject)} · ${esc(c.lastText||'')}</div></div></div>`; }).join('')
      : `<div class="card empty">${mascot('', .7)}<br>עוד אין צ׳אטים.<br>מצא חברותא בלשונית 🔍</div>`}</div></div>`;
  app.querySelector('.list').onclick = e => { const c = e.target.closest('[data-c]'); if(c) renderChat(c.dataset.c); };
}

function renderChat(cid){
  cleanupView();
  let chat = null, msgs = [];
  app.innerHTML = `<div class="chatwrap">
    <div class="chathead"><button class="link" id="bk" aria-label="חזרה" style="font-size:22px">→</button><div id="ha"></div>
      <div class="grow"><b id="hn"></b><div class="small muted" id="hs"></div></div>
      <button class="iconbtn vid" id="vc" aria-label="שיחת וידאו" title="שיחת וידאו">🎥</button>
      <button class="iconbtn" id="star" aria-label="תן כוכב" title="תודה – תן כוכב">⭐</button>
      <button class="iconbtn" id="more" aria-label="עוד אפשרויות" title="דיווח, חסימה וכללים">⋯</button></div>
    <div class="msgs" id="ms"></div>
    <div class="quick" id="qk">${['היי! 👋','מתי נוח לך?','תודה רבה! 🙏','יש לי שאלה 🤔','בוא נדבר בווידאו 🎥','הבנתי! 💡'].map(q => `<button>${q}</button>`).join('')}</div>
    <div class="composer"><button class="iconbtn" id="cal" aria-label="קביעת מפגש" title="קביעת מפגש">📅</button>
      <textarea id="tx" placeholder="כתוב הודעה…" rows="1" aria-label="הודעה"></textarea>
      <button class="iconbtn send" id="sd" aria-label="שליחה">➤</button></div></div>`;
  const other = () => chat?.members.find(x => x !== myId);
  const otherObj = () => ({id:other(), name:chat?.names?.[other()] || ''});
  const markRead = () => chat && isUnread(chat) && B.updateChat(cid, {['read.'+myId]: Date.now()}).catch(() => {});
  const drawHead = () => { if(!chat) return; const o = otherObj();
    if(isBlocked(o.id) && !$('#blk')) $('.chathead').insertAdjacentHTML('afterend', `<div id="blk" class="sys" style="margin:8px auto">🚫 חסמת את ${esc(o.name)}. <button class="link" id="ublk">ביטול חסימה</button></div>`), $('#ublk').onclick = async () => { await toggleBlock(o.id, o.name); renderChat(cid); };
    $('#ha').innerHTML = avatar(o.id,o.name,38); $('#hn').textContent = o.name; $('#hs').textContent = `${ICON[chat.subject]||''} ${chat.subject||''}`;
    $('#star').style.opacity = chat.starred?.[myId] ? .35 : 1; };
  const sessHtml = m => {
    const s = chat?.sessions?.[m.sid] || {at:m.at2, place:m.place, status:'pending'}, mine = s.by === myId;
    const st = s.status === 'ok' ? '<b style="color:var(--grn)">✓ נקבע!</b>' : s.status === 'no' ? '<b style="color:var(--pink)">✗ לא מתאים</b>' : mine ? '<span class="muted">ממתין לאישור…</span>' : '';
    const acts = s.status === 'pending' && !mine ? `<div class="row"><button class="btn grn sm" data-ok="${esc(m.sid)}">✓ מתאים לי</button><button class="btn alt sm" data-no="${esc(m.sid)}">✗ לא מתאים</button></div>`
      : s.status === 'ok' ? `<div class="row">${canJoin(s) ? `<button class="btn grn sm" data-join="1">🎥 הצטרף לשיחה</button>` : ''}<button class="btn alt sm" data-ics="${esc(m.sid)}">🗓️ ליומן</button></div>` : '';
    return `<div class="sys">📅 <b>הצעה למפגש</b><br>${esc(whenStr(s.at))}<br>${placeName(s.place)}<br>${st}${acts}</div>`;
  };
  const drawMsgs = () => { const box = $('#ms'); if(!box) return; const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.innerHTML = msgs.length ? msgs.map(m => m.type === 'session' ? sessHtml(m)
      : m.type === 'star' ? `<div class="sys">⭐ ${esc(m.text)}</div>` : m.type === 'call' ? `<div class="sys">🎥 ${esc(m.text)}</div>`
      : `<div class="msg ${m.from===myId?'me':'them'}">${esc(m.text)}<time>${timeStr(m.at)}</time></div>`).join('') : '<div class="empty">תגידו שלום 👋</div>';
    if(atBottom || box.dataset.first !== '1'){ box.scrollTop = box.scrollHeight; box.dataset.first = '1'; } };
  unsubView.push(B.onChat(cid, c => { chat = c; drawHead(); drawMsgs(); markRead(); }));
  unsubView.push(B.onMessages(cid, m => { msgs = m; drawMsgs(); markRead(); }));
  $('#ms').onclick = async e => {
    const ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]'), j = e.target.closest('[data-join]'), ic = e.target.closest('[data-ics]');
    if(ok || no){ const sid = (ok||no).dataset[ok?'ok':'no'];
      await B.updateChat(cid, {[`sessions.${sid}.status`]: ok ? 'ok' : 'no'});
      await B.send(cid, {from:myId, type:'text', text: ok ? 'מתאים לי! נתראה 👋' : 'הזמן הזה לא מתאים לי, אולי נקבע זמן אחר? 📅'});
      if(ok){ confetti(); sound('win'); } }
    if(j) startCall(B, cid, me, otherObj());
    if(ic){ const s = chat.sessions[ic.dataset.ics]; addToCalendar({...s, sid:ic.dataset.ics, name:otherObj().name}); }
  };
  $('#bk').onclick = () => { tab = 'chats'; renderMain(); };
  $('#more').onclick = () => chat && chatMenu(cid, otherObj());
  $('#vc').onclick = () => chat && startCall(B, cid, me, otherObj());
  const tx = $('#tx');
  const send = async () => { const raw = tx.value.trim(); if(!raw) return; tx.value = ''; tx.style.height = '';
    if(chat && isBlocked(otherObj().id)) return toast('חסמת את המשתמש הזה. אפשר לבטל ב-⋯');
    const t = cleanText(raw).replace(/(\+972[-\s]?|0)5\d[-\s]?\d{3}[-\s]?\d{4}/g, '📵'); if(t !== raw) toast('🛡️ חלק מההודעה הוסתר. בחברותא מדברים בכבוד ושומרים על פרטיות');
    if(hasPersonal(raw)) setTimeout(() => toast('🔒 שומרים על פרטיות: עדיף לא לשתף טלפון, כתובת או רשתות'), t !== raw ? 2700 : 0);
    try { await B.send(cid, {from:myId, type:'text', text:t}); markDay('msgDay'); } catch(e){ tx.value = t; toast(errMsg(e)); } };
  $('#sd').onclick = send;
  $('#qk').onclick = e => { const b = e.target.closest('button'); if(!b) return; tx.value = b.textContent; send(); vibrate(8); };
  tx.onkeydown = e => { if(e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer:coarse)').matches){ e.preventDefault(); send(); } };
  tx.oninput = () => { tx.style.height = 'auto'; tx.style.height = Math.min(tx.scrollHeight,120) + 'px'; };
  $('#star').onclick = () => {
    if(!chat) return; if(chat.starred?.[myId]) return toast('כבר נתת כוכב בצ׳אט הזה');
    const o = otherObj();
    sheet(`<div style="text-align:center"><div style="font-size:54px">⭐</div><h3>תודה ל${esc(o.name)}</h3><p class="small muted" style="margin:4px 0">הכוכב והמילים שלך יופיעו בפרופיל של ${esc(o.name)}</p></div>
      <div class="chips" id="tq" style="justify-content:center;margin:10px 0">${['הסברת מעולה! 💡','סבלנות של מלאך 😇','סוף סוף הבנתי! 🙌','עזרת לי לפני המבחן 💪'].map(t => `<span class="chip">${t}</span>`).join('')}</div>
      <textarea id="tn" rows="2" maxlength="140" placeholder="מילה טובה (לא חובה)"></textarea><div style="height:12px"></div><button class="btn yel" id="tg">⭐ לתת כוכב</button>`, (el, close) => {
        el.querySelector('#tq').onclick = e => { const c = e.target.closest('.chip'); if(c) el.querySelector('#tn').value = c.textContent; };
        el.querySelector('#tg').onclick = async e => { e.target.disabled = true; const note = el.querySelector('#tn').value.trim();
          try { await B.giveStar(o.id); await B.updateChat(cid, {['starred.'+myId]: true});
            if(note) B.addThanks({to:o.id, from:myId, fromName:me.name, text:note, subject:chat.subject||'', at:Date.now()}).catch(() => {});
            await B.send(cid, {from:myId, type:'star', text:`כוכב מ${me.name} ל${o.name}${note ? `: "${note}"` : ' על העזרה!'}`}); close(); confetti(); sound('win'); }
          catch(err){ e.target.disabled = false; toast(errMsg(err)); } };
      });
  };
  $('#cal').onclick = async () => { if(!chat) return; let ou = null; try { ou = await B.getUser(other()); } catch {} scheduleSheet(cid, chat, ou); };
}

// בחירת זמן מראש: רק שעות שבהן החברותא פנויים (ומסומן מה מתאים לשניכם)
function scheduleSheet(cid, chat, ou){
  const theirs = new Set(ou?.avail||[]), mine = new Set(me.avail||[]), now = Date.now();
  const hoursFor = d => { const day = d.getDay(); const out = [];
    BLOCKS.forEach((b,k) => { const key = `${day}-${k}`; const theyOk = !theirs.size || theirs.has(key);
      if(theyOk) b.h.forEach(h => { const t = new Date(d); t.setHours(h,0,0,0); if(t.getTime() > now + 30*60000) out.push({t:t.getTime(), h, both: theirs.has(key) && mine.has(key)}); }); });
    return out; };
  const days = Array.from({length:14}, (_,i) => { const d = new Date(); d.setDate(d.getDate()+i); d.setHours(0,0,0,0); return d; }).filter(d => hoursFor(d).length).slice(0,7);
  let di = 0, pick = null, place = 'video';
  const name = chat.names?.[chat.members.find(x => x !== myId)] || '';
  sheet(`<h3>📅 קביעת מפגש עם ${esc(name)}</h3>
    <p class="small muted" style="margin:4px 0 0">${theirs.size ? `מוצגות רק השעות הפנויות של ${esc(name)}. ⭐ = מתאים לשניכם` : `בפרופיל של ${esc(name)} עוד אין זמנים פנויים, אז מוצגות כל השעות`}</p>
    <label>יום</label><div class="chips" id="dd" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px"></div>
    <label>שעה</label><div class="chips" id="hh"></div>
    <label>איפה</label><div class="seg" id="sp">${PLACES.map(([k,n]) => `<button data-p="${k}" class="${k===place?'on':''}">${n}</button>`).join('')}</div>
    <div style="height:16px"></div><button class="btn grn" id="so" disabled>שליחת הצעה</button>`, (el, close) => {
      const drawDays = () => el.querySelector('#dd').innerHTML = days.length ? days.map((d,i) => { const lbl = i === 0 && d.toDateString() === new Date().toDateString() ? 'היום' : d.getTime() - new Date().setHours(0,0,0,0) === 864e5 ? 'מחר' : `${DAYS[d.getDay()]} ${d.getDate()}.${d.getMonth()+1}`;
        return `<span class="chip ${i===di?'on':''}" style="flex:none" data-d="${i}">${lbl}${hoursFor(d).some(x => x.both) ? ' ⭐' : ''}</span>`; }).join('') : '<span class="muted small">אין זמנים פנויים בשבועיים הקרובים</span>';
      const drawHours = () => { const hs = days[di] ? hoursFor(days[di]) : [];
        el.querySelector('#hh').innerHTML = hs.map(x => `<span class="chip ${pick===x.t?'on':''}" data-t="${x.t}">${x.both?'⭐ ':''}${String(x.h).padStart(2,'0')}:00</span>`).join(''); };
      drawDays(); drawHours();
      el.querySelector('#dd').onclick = e => { const c = e.target.closest('[data-d]'); if(!c) return; di = +c.dataset.d; pick = null; el.querySelector('#so').disabled = true; drawDays(); drawHours(); };
      el.querySelector('#hh').onclick = e => { const c = e.target.closest('[data-t]'); if(!c) return; pick = +c.dataset.t; el.querySelector('#so').disabled = false; drawHours(); };
      el.querySelector('#sp').onclick = e => { const b = e.target.closest('[data-p]'); if(!b) return; place = b.dataset.p; el.querySelectorAll('#sp button').forEach(x => x.classList.toggle('on', x === b)); };
      el.querySelector('#so').onclick = async () => {
        if(!pick) return; const sid = 's' + Date.now().toString(36);
        try { await B.updateChat(cid, {[`sessions.${sid}`]: {at:pick, place, by:myId, status:'pending', subject:chat.subject}});
          await B.send(cid, {from:myId, type:'session', sid, at2:pick, place, text:`📅 הצעה למפגש: ${whenStr(pick)}`}); close(); }
        catch(e){ toast(errMsg(e)); }
      };
    });
}

/* =============== incoming call =============== */

let firstTab = ['home','find','practice','chats','profile'].find(t => t === new URLSearchParams(location.search).get('tab'));
const seenCalls = new Set();
let ringEl = null, ringTimer = null;
function checkIncoming(){
  const c = chats.find(c => c.call?.active && c.call.from !== myId && !isBlocked(c.call.from) && Date.now() - c.call.at < 60000);
  if(!c || inCall()){ if(ringEl && (!c || inCall())){ ringEl.remove(); ringEl = null; clearInterval(ringTimer); } return; }
  const key = c.id + c.call.at; if(seenCalls.has(key) || ringEl) return; seenCalls.add(key);
  const o = {id:c.call.from, name:c.names?.[c.call.from] || c.call.name || ''};
  ringEl = document.createElement('div'); ringEl.className = 'call';
  ringEl.innerHTML = `<div class="callwait"><div>${avatar(o.id,o.name,120)}<h2 style="font-size:28px">${esc(o.name)}</h2><div class="muted">שיחת וידאו נכנסת · ${ICON[c.subject]||''} ${esc(c.subject||'')}</div></div></div>
    <div class="callbar"><button class="end" id="dcl" aria-label="דחייה">✕</button><button class="ans" id="acc" aria-label="מענה">🎥</button></div>`;
  document.body.appendChild(ringEl); sound('ring'); vibrate([300,200,300]); ringTimer = setInterval(() => { sound('ring'); vibrate([300,200,300]); }, 2500);
  const stop = () => { clearInterval(ringTimer); ringEl?.remove(); ringEl = null; };
  ringEl.querySelector('#acc').onclick = () => { stop(); answerCall(B, c.id, me, o); };
  ringEl.querySelector('#dcl').onclick = () => { stop(); declineCall(B, c.id); };
}

/* =============== profile =============== */

function renderProfile(){
  const ts = totalStars(me), lv = level(me), prog = (ts % 50) / 50 * 100;
  const lessons = Object.values(me.progress||{}).reduce((a,b) => a+b, 0);
  const avTxt = DAYS.map((d,i) => { const bs = BLOCKS.filter((_,k) => (me.avail||[]).includes(`${i}-${k}`)).map(b => b.n); return bs.length ? `${d}: ${bs.join(', ')}` : null; }).filter(Boolean);
  app.innerHTML = `<div class="page">
    <div class="card" style="text-align:center"><div class="rainbar"></div>
      <div style="display:flex;justify-content:center">${avatar(myId, me.name, 88)}</div>
      <h2 style="margin-top:10px">${esc(me.name)}</h2><div class="muted">כיתה ${esc(me.grade)}</div>${me.bio ? `<p style="margin:8px 0 0">${esc(me.bio)}</p>` : ''}</div>
    <div class="statrow"><div class="stat"><small>כוכבים</small><b>⭐ <span data-to="${ts}">${ts}</span></b></div>
      <div class="stat" style="border-color:#ff9f5c"><small style="background:#ff9f5c">רצף</small><b>🔥 <span data-to="${streakOf(me)}">${streakOf(me)}</span></b></div>
      <div class="stat" style="border-color:var(--grn)"><small style="background:var(--grn)">עזרתי</small><b>🤝 <span data-to="${me.stars||0}">${me.stars||0}</span></b></div>
      <div class="stat" style="border-color:var(--sky)"><small style="background:var(--sky)">שיעורים</small><b>🎮 <span data-to="${lessons}">${lessons}</span></b></div></div>
    <div class="card"><div class="row between"><b class="fred big">רמה ${lv}</b><span class="score">${ts % 50}/50</span></div>
      <div class="prog" style="margin-top:8px"><i style="width:${prog}%;background:var(--rain)"></i></div>
      <div class="small muted" style="margin-top:6px">כוכבים מקבלים מתרגול, ומחברותא שמודים לך על עזרה.</div></div>
    <div class="card"><b>צריך עזרה ב:</b><div>${(me.need||[]).map(s => `<span class="tag need">${ICON[s]} ${esc(s)}</span>`).join('') || '<span class="muted small">—</span>'}</div>
      <b style="display:block;margin-top:8px">יכול לעזור ב:</b><div>${(me.help||[]).map(s => `<span class="tag help">${ICON[s]} ${esc(s)}</span>`).join('') || '<span class="muted small">—</span>'}</div>
      <b style="display:block;margin-top:8px">🕐 זמנים פנויים:</b><div class="small muted">${avTxt.length ? esc(avTxt.join(' · ')) : 'לא סימנת'}</div></div>
    <div id="mythx"></div>
    <div class="card"><div class="row between"><b class="fred big">🏅 התגים שלי</b><span class="small muted">${(me.badges||[]).length}/${BADGES.length}</span></div>${badgesHtml()}</div>
    <div class="card gamecard" id="rate"><div class="ic" style="background:var(--yel)">⭐</div><div class="grow"><b class="fred big">${me.rated ? `דירגת ${'★'.repeat(me.rated)}` : 'דרג את חברותא'}</b><div class="small muted">ולראות מה אחרים אומרים</div></div><span class="big">←</span></div>
    ${isAdm ? '<button class="btn yel" id="adm">📊 לוח ניהול</button>' : ''}
    ${(me.help||[]).length ? `<div class="card gamecard" id="cert"><div class="ic" style="background:var(--grn)">📜</div><div class="grow"><b class="fred big">אישור שעות עזרה</b><div class="small muted">${helpedSessions().length} מפגשי עזרה · למחויבות אישית</div></div><span class="big">←</span></div>` : ''}
    <button class="btn alt" id="ed">✏️ עריכת פרופיל וזמנים</button>
    ${isStandalone() ? '' : '<button class="btn" id="in">📲 התקנת האפליקציה</button>'}
    <button class="btn alt" id="sh">💫 שיתוף עם חברים</button>
    <button class="btn alt" id="lo">יציאה</button>
    <div class="row between"><a class="link small" href="privacy.html">מדיניות פרטיות</a><button class="link small" id="prules">🛡️ כללי ההתנהגות</button><button class="link small" id="del" style="color:var(--pink)">מחיקת החשבון</button></div>
    ${B.mode === 'local' ? '<p class="mode"><span class="badge-local">מצב מקומי</span> הנתונים נשמרים רק במכשיר הזה</p>' : ''}
  </div>`;
  $('#rate').onclick = () => me.rated ? reviewsSheet() : rateSheet();
  B.listThanks(myId).then(ts => { const box = $('#mythx'); if(box && ts.length) box.innerHTML = `<div class="card"><b class="fred big">💛 מה אומרים עליי</b>${ts.slice(0,5).map(t => `<div class="thx">"${esc(t.text)}" <span class="muted small">· ${esc(t.fromName||'')}${t.subject ? ' · ' + esc(t.subject) : ''}</span></div>`).join('')}</div>`; }).catch(() => {}); $('#adm') && ($('#adm').onclick = renderAdmin);
  app.querySelectorAll('.bdg').forEach(b => b.onclick = () => toast(b.title));
  $('#prules').onclick = rulesSheet;
  $('#cert') && ($('#cert').onclick = certificate);
  $('#ed').onclick = renderOnboard; $('#in') && ($('#in').onclick = doInstall); $('#sh').onclick = share; $('#lo').onclick = () => B.logout();
  $('#del').onclick = () => sheet(`<h3>למחוק את החשבון?</h3><p class="muted">הפרופיל, הכוכבים וההתקדמות יימחקו לתמיד. אי אפשר לבטל.</p>
    <button class="btn pink" id="yes">כן, למחוק</button><div style="height:10px"></div><button class="btn alt" id="nope">ביטול</button>`, (el, close) => {
      el.querySelector('#nope').onclick = close;
      el.querySelector('#yes').onclick = async () => { try { await B.deleteAccount(); close(); toast('החשבון נמחק'); } catch(e){ toast(errMsg(e)); } };
    });
}

async function share(){
  const data = {title:'חברותא', text:'תלמידים עוזרים לתלמידים – בחינם. בואו לחברותא!', url: location.origin + location.pathname};
  try { if(navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.url); toast('הקישור הועתק'); } } catch {}
}

/* =============== presence (who's online) =============== */

const online = u => Date.now() - (u?.lastSeen||0) < 3*60000;
let beatT = null;
function heartbeat(){
  const beat = () => { if(myId && me && document.visibilityState === 'visible') B.saveUser(myId, {lastSeen: Date.now()}).catch(() => {}); };
  clearInterval(beatT); beat(); beatT = setInterval(beat, 60000);
  if(!heartbeat.bound){ heartbeat.bound = true; document.addEventListener('visibilitychange', beat); }
}
const avatarOn = (u, size=46) => `<span style="position:relative;display:inline-block;flex:none">${avatar(u.id,u.name,size)}${online(u) ? '<i class="ondot" title="באפליקציה עכשיו"></i>' : ''}</span>`;

/* =============== badges =============== */

const BADGES = [
  ['first','🎯','צעד ראשון','סיימת שיעור ראשון', s => s.lessons >= 1],
  ['perfect','💎','מושלם','שיעור בלי אף טעות', s => s.perfects >= 1],
  ['streak3','🔥','3 ימים ברצף','תרגלת 3 ימים ברצף', s => s.streak >= 3],
  ['streak7','🌋','שבוע ברצף','תרגלת 7 ימים ברצף', s => s.streak >= 7],
  ['allround','🧠','רב-תחומי','שיעורים ב-3 מקצועות', s => s.subjects >= 3],
  ['meet','📅','מפגש ראשון','מפגש שאושר', s => s.sessions >= 1],
  ['video','🎥','פנים מול פנים','שיחת וידאו ראשונה', s => s.calls >= 1],
  ['helper','🤝','יד עוזרת','קיבלת כוכב על עזרה', s => s.helpStars >= 1],
  ['mentor','🦸','גיבור העזרה','10 כוכבי עזרה', s => s.helpStars >= 10],
  ['stars100','🌟','100 כוכבים','צברת 100 כוכבים', s => s.total >= 100],
  ['stars500','👑','500 כוכבים','צברת 500 כוכבים', s => s.total >= 500],
  ['critic','💬','קול התלמידים','דירגת את חברותא', s => s.rated],
];
function badgeStats(){
  const pr = me.progress || {};
  return {lessons:Object.values(pr).reduce((a,b) => a+b, 0), subjects:Object.values(pr).filter(x => x > 0).length, streak:streakOf(me),
    perfects:me.perfects||0, helpStars:me.stars||0, total:totalStars(me), calls:me.calls||0, rated:!!me.rated,
    sessions: chats.reduce((n,c) => n + Object.values(c.sessions||{}).filter(x => x.status === 'ok').length, 0)};
}
let badgeQueue = [];
function checkBadges(){
  if(!me || !myId) return;
  const s = badgeStats(), have = new Set(me.badges||[]), nw = BADGES.filter(b => !have.has(b[0]) && b[4](s));
  if(!nw.length) return;
  me.badges = [...have, ...nw.map(b => b[0])]; B.saveUser(myId, {badges: me.badges}).catch(() => {});
  badgeQueue.push(...nw); if(badgeQueue.length === nw.length) nextBadge();
}
function nextBadge(){
  const b = badgeQueue[0]; if(!b) return;
  if($('.lesson') || $('.call') || $('.chatwrap') || $('.sheet-bg')) return setTimeout(nextBadge, 1500);
  const el = document.createElement('div'); el.className = 'badgepop';
  el.innerHTML = `<div class="bp"><div class="small fred" style="color:var(--yel);letter-spacing:2px">תג חדש!</div><div class="bpi">${b[1]}</div><h2>${esc(b[2])}</h2><div class="muted">${esc(b[3])}</div><button class="btn yel" style="margin-top:16px">יש! 🎉</button><button class="link" data-share style="margin-top:8px">📤 שתף</button></div>`;
  document.body.appendChild(el); confetti(); sound('win'); vibrate([30,50,30]);
  const close = () => { el.remove(); badgeQueue.shift(); setTimeout(nextBadge, 400); };
  el.onclick = e => { if(e.target.closest('[data-share]')) return shareCard({emoji:b[1], title:`תג חדש: ${b[2]}`, sub:b[3], name:me.name}); close(); };
}
const badgesHtml = () => { const have = new Set(me.badges||[]);
  return `<div class="badges">${BADGES.map(b => `<div class="bdg ${have.has(b[0])?'':'off'}" title="${esc(b[3])}"><span>${b[1]}</span><small>${esc(b[2])}</small></div>`).join('')}</div>`; };

/* =============== ratings =============== */

const FACES = ['😞 לא טוב','😕 ככה ככה','🙂 בסדר','😀 טוב מאוד','🤩 מעולה!'];
function rateSheet(){
  let st = me.rated || 0;
  sheet(`<div style="text-align:center"><h3 style="font-size:22px">מה דעתך על חברותא?</h3><p class="muted small" style="margin:4px 0 10px">הדירוג שלך עוזר לנו לשפר. ${me.rated ? 'אפשר לשנות אותו מתי שרוצים.' : ''}</p>
    <div class="starsel" id="ss">${[1,2,3,4,5].map(i => `<button data-v="${i}" aria-label="${i} כוכבים">★</button>`).join('')}</div>
    <div class="fred big" id="sf" style="min-height:30px">${st ? FACES[st-1] : ''}</div></div>
    <label for="rtx">מה הכי אהבת? מה כדאי לשפר? <span class="muted small">(לא חובה)</span></label>
    <textarea id="rtx" rows="3" maxlength="400" placeholder="למשל: המשחקים ממכרים! הייתי רוצה עוד מקצועות"></textarea>
    <div class="small muted" style="margin-top:6px">השם והכיתה שלך יוצגו ליד הדירוג.</div>
    <div style="height:14px"></div><button class="btn yel" id="rs" ${st ? '' : 'disabled'}>שליחת דירוג</button>`, (el, close) => {
      const draw = () => { el.querySelectorAll('#ss button').forEach(b => b.classList.toggle('on', +b.dataset.v <= st)); el.querySelector('#sf').textContent = st ? FACES[st-1] : ''; };
      draw();
      el.querySelector('#ss').onclick = e => { const b = e.target.closest('[data-v]'); if(!b) return; st = +b.dataset.v; draw(); sound('ok'); vibrate(10); el.querySelector('#rs').disabled = false; };
      el.querySelector('#rs').onclick = async () => {
        const text = el.querySelector('#rtx').value.trim();
        try { await B.setRating(myId, {stars:st, text, at:Date.now(), name:me.name, grade:me.grade||''}); me.rated = st; await B.saveUser(myId, {rated:st});
          close(); confetti(); toast('תודה על הדירוג! 💛'); checkBadges(); if(!overlayOpen()) renderMain(); }
        catch(e){ toast(errMsg(e)); }
      };
    });
}
async function reviewsSheet(){
  const close = sheet('<h3>💬 מה אומרים על חברותא</h3><div id="rvw"><div class="spin"></div></div>');
  let rs = []; try { rs = await B.listRatings(); } catch {}
  const el = $('#rvw'); if(!el) return;
  if(!rs.length){ el.innerHTML = `<div class="empty">עוד אין דירוגים. תהיה הראשון!</div><button class="btn yel" id="r1">⭐ לדרג</button>`; $('#r1').onclick = () => { close(); rateSheet(); }; return; }
  const avg = rs.reduce((a,r) => a + r.stars, 0) / rs.length, dist = [5,4,3,2,1].map(n => rs.filter(r => r.stars === n).length);
  el.innerHTML = `<div class="row" style="margin:12px 0;gap:16px"><div style="text-align:center"><div class="fred" style="font-size:44px;color:var(--yel);line-height:1">${avg.toFixed(1)}</div><div class="stars">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5-Math.round(avg))}</div><div class="small muted">${rs.length} דירוגים</div></div>
    <div class="grow">${dist.map((c,i) => `<div class="row small" style="gap:6px"><span style="width:12px">${5-i}</span><div class="prog" style="height:9px"><i style="width:${c/rs.length*100}%;background:var(--yel)"></i></div><span style="width:18px">${c}</span></div>`).join('')}</div></div>
    <div class="list">${rs.filter(r => r.text).sort((a,b) => b.at - a.at).slice(0,30).map(r => `<div class="card" style="padding:12px"><div class="row between"><b>${esc(r.name||'')} <span class="muted small">${esc(r.grade||'')}</span></b><span class="stars small">${'★'.repeat(r.stars)}</span></div><div style="margin-top:4px">${esc(r.text)}</div></div>`).join('')}</div>
    <div style="height:12px"></div><button class="btn yel" id="r1">${me.rated ? '✏️ עדכון הדירוג שלי' : '⭐ לדרג'}</button>`;
  $('#r1').onclick = () => { close(); rateSheet(); };
}

/* =============== admin dashboard =============== */

async function renderAdmin(){
  cleanupView();
  app.innerHTML = `<div class="page"><div class="head"><button class="link" id="bk" style="font-size:20px">→ חזרה</button><h2>📊 לוח ניהול</h2><button class="iconbtn" id="rf" aria-label="רענון">🔄</button></div><button class="btn yel" id="snap">📸 תמונת מצב להצגה</button><div id="ad"><div class="spin"></div></div></div>`;
  $('#bk').onclick = () => { tab = 'profile'; renderMain(); };
  $('#rf').onclick = renderAdmin;
  let users = [], all = [], rs = [], reps = [];
  try { [users, all, rs, reps] = await Promise.all([B.listUsers(), B.listAllChats(), B.listRatings(), B.listReports().catch(() => [])]); }
  catch(e){ $('#ad').innerHTML = '<div class="card empty">אין הרשאת ניהול לחשבון הזה.</div>'; return; }
  users = users.filter(u => u.name && !u.seed);
  const now = Date.now(), dayMs = 864e5, t0 = new Date().setHours(0,0,0,0);
  const sessions = all.flatMap(c => Object.values(c.sessions||{}));
  const ok = sessions.filter(s => s.status === 'ok'), pend = sessions.filter(s => s.status === 'pending'), no = sessions.filter(s => s.status === 'no');
  const upcoming = ok.filter(s => s.at > now).length, calls = all.reduce((a,c) => a + (c.callCount||0), 0);
  const lessons = users.reduce((a,u) => a + Object.values(u.progress||{}).reduce((x,y) => x+y, 0), 0);
  const avg = rs.length ? (rs.reduce((a,r) => a + r.stars, 0) / rs.length).toFixed(1) : '—';
  const days = Array.from({length:14}, (_,i) => { const d = new Date(t0 - (13-i)*dayMs); return {d, n: users.filter(u => u.createdAt >= d.getTime() && u.createdAt < d.getTime() + dayMs).length}; });
  const maxD = Math.max(1, ...days.map(x => x.n));
  const subjStat = SUBJECTS.map(s => ({s, need: users.filter(u => (u.need||[]).includes(s)).length, help: users.filter(u => (u.help||[]).includes(s)).length})).filter(x => x.need || x.help).sort((a,b) => (b.need+b.help) - (a.need+a.help));
  const maxS = Math.max(1, ...subjStat.map(x => Math.max(x.need, x.help)));
  const grades = GRADES.map(g => ({g, n: users.filter(u => u.grade === g).length})), maxG = Math.max(1, ...grades.map(x => x.n));
  const kpi = (n,l,c='var(--sky)') => `<div class="kpi"><b style="color:${c}">${typeof n === 'number' ? `<span data-to="${n}">0</span>` : n}</b><small>${l}</small></div>`;
  const seen = u => !u.lastSeen ? '—' : online(u) ? '<b style="color:var(--grn)">● עכשיו</b>' : timeStr(u.lastSeen);
  const openReps = reps.filter(r => r.status !== 'done'), byId = Object.fromEntries(users.map(u => [u.id, u]));
  $('#ad').innerHTML = `
    <div class="card" style="${openReps.length ? 'border-color:var(--pink)' : ''}"><div class="row between"><h3>🚩 דיווחים ${openReps.length ? `<span class="tag need">${openReps.length} פתוחים</span>` : ''}</h3></div>
      ${reps.length ? reps.slice(0,20).map(r => `<div class="thx" style="${r.status === 'done' ? 'opacity:.5' : ''}"><div class="row between"><b>${esc(r.reason)}</b><span class="small muted">${timeStr(r.at)}</span></div>
        <div class="small">על: <b>${esc(r.targetName||'')}</b> · מאת: ${esc(r.byName||'')}${byId[r.target]?.banned ? ' · <span style="color:var(--pink)">מושעה</span>' : ''}</div>${r.text ? `<div class="small" style="margin-top:4px">"${esc(r.text)}"</div>` : ''}
        ${r.status === 'done' ? '<div class="small muted">✓ טופל</div>' : `<div class="row" style="margin-top:6px"><button class="btn sm grn" data-done="${esc(r.id)}">✓ טופל</button><button class="btn sm pink" data-ban="${esc(r.target)}" data-v="${byId[r.target]?.banned ? '0' : '1'}">${byId[r.target]?.banned ? 'ביטול השעיה' : '⛔ השעיית משתמש'}</button></div>`}</div>`).join('') : '<div class="muted small">אין דיווחים 🎉</div>'}</div>
    <div class="kpis">${kpi(users.length,'נרשמו')}${kpi(users.filter(online).length,'מחוברים עכשיו','var(--grn)')}${kpi(users.filter(u => (u.lastSeen||0) >= t0).length,'פעילים היום','var(--grn)')}
      ${kpi(users.filter(u => u.createdAt >= now - 7*dayMs).length,'חדשים השבוע','var(--vio)')}${kpi(all.length,'צ׳אטים','var(--pink)')}${kpi(sessions.length,'מפגשים שהוצעו','var(--yel)')}
      ${kpi(ok.length,'מפגשים שאושרו','var(--yel)')}${kpi(upcoming,'מפגשים קרובים','var(--yel)')}${kpi(calls,'שיחות וידאו','var(--pink)')}
      ${kpi(lessons,'שיעורי תרגול','var(--grn)')}${kpi(users.reduce((a,u) => a + (u.stars||0), 0),'כוכבי עזרה','var(--yel)')}${kpi(avg + (rs.length ? ` <span class="small">(${rs.length})</span>` : ''),'דירוג ממוצע','var(--yel)')}</div>
    <div class="card"><h3>📈 הרשמות ב-14 הימים האחרונים</h3><div class="bars">${days.map(x => `<div title="${x.d.toLocaleDateString('he-IL')}: ${x.n}"><span>${x.n||''}</span><i style="height:${x.n/maxD*100}%"></i><small>${x.d.getDate()}.${x.d.getMonth()+1}</small></div>`).join('')}</div></div>
    <div class="card"><h3>📚 מקצועות: <span style="color:var(--pink)">צריכים עזרה</span> מול <span style="color:var(--grn)">יכולים לעזור</span></h3>
      ${subjStat.length ? subjStat.map(x => `<div class="hb"><span>${ICON[x.s]} ${esc(x.s)}</span><div><i style="width:${x.need/maxS*100}%;background:var(--pink)"></i><i style="width:${x.help/maxS*100}%;background:var(--grn)"></i></div><small>${x.need} / ${x.help}</small></div>`).join('') : '<div class="muted small">עוד אין נתונים</div>'}
      ${subjStat.filter(x => x.need > x.help).length ? `<p class="small" style="color:var(--yel);margin:10px 0 0">⚠️ חסרים עוזרים ב: ${esc(subjStat.filter(x => x.need > x.help).map(x => x.s).join(', '))}</p>` : ''}</div>
    <div class="card"><h3>🎓 לפי כיתה</h3>${grades.map(x => `<div class="hb"><span>${x.g}</span><div><i style="width:${x.n/maxG*100}%;background:var(--sky)"></i></div><small>${x.n}</small></div>`).join('')}</div>
    <div class="card"><div class="row between"><h3>👥 משתמשים</h3><button class="btn sm alt" id="csv">⬇️ אקסל (CSV)</button></div>
      <input id="us" placeholder="חיפוש לפי שם…" style="margin:10px 0">
      <div class="tbl"><table><thead><tr><th>שם</th><th>כיתה</th><th>הצטרפות</th><th>פעילות אחרונה</th><th>⭐</th><th>שיעורים</th></tr></thead><tbody id="ut"></tbody></table></div></div>
    <div class="card"><h3>📅 מפגשים קרובים</h3>${ok.filter(s => s.at > now).sort((a,b) => a.at - b.at).slice(0,15).map(s => `<div class="small" style="padding:4px 0;border-bottom:1px solid var(--line)">${esc(whenStr(s.at))} · ${ICON[s.subject]||''} ${esc(s.subject||'')} · ${placeName(s.place)}</div>`).join('') || '<div class="muted small">אין מפגשים קרובים</div>'}
      <div class="small muted" style="margin-top:8px">ממתינים לאישור: ${pend.length} · נדחו: ${no.length}</div></div>
    <div class="card"><div class="row between"><h3>💬 דירוגים</h3><button class="btn sm alt" id="rvs">לכל הדירוגים</button></div>
      ${rs.sort((a,b) => b.at - a.at).slice(0,5).map(r => `<div class="small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span class="stars">${'★'.repeat(r.stars)}</span> <b>${esc(r.name||'')}</b> ${esc(r.text||'')}</div>`).join('') || '<div class="muted small">עוד אין דירוגים</div>'}</div>
    <p class="mode">התוכן של הצ׳אטים פרטי ולא מוצג כאן, רק מספרים.</p>`;
  const drawU = q => { $('#ut').innerHTML = users.filter(u => !q || u.name.includes(q)).sort((a,b) => (b.lastSeen||0) - (a.lastSeen||0)).map(u =>
    `<tr><td>${esc(u.name)}</td><td>${esc(u.grade||'')}</td><td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('he-IL') : ''}</td><td>${seen(u)}</td><td>${totalStars(u)}</td><td>${Object.values(u.progress||{}).reduce((a,b) => a+b, 0)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">אין משתמשים</td></tr>'; };
  $('#ad').addEventListener('click', async e => {
    const d = e.target.closest('[data-done]'), bn = e.target.closest('[data-ban]');
    if(d){ await B.resolveReport(d.dataset.done).catch(err => toast(errMsg(err))); renderAdmin(); }
    if(bn){ const v = bn.dataset.v === '1'; if(v && !confirm('להשעות את המשתמש? הוא לא יוכל להשתמש באפליקציה עד ביטול ההשעיה.')) return;
      await B.setBan(bn.dataset.ban, v).catch(err => toast(errMsg(err))); toast(v ? 'המשתמש הושעה' : 'ההשעיה בוטלה'); renderAdmin(); }
  });
  $('#snap').onclick = () => snapshot(users, all, rs);
  countUp($('#ad'));
  drawU(''); $('#us').oninput = e => drawU(e.target.value.trim());
  $('#rvs').onclick = reviewsSheet;
  $('#csv').onclick = () => {
    const rows = [['שם','כיתה','צריך עזרה','יכול לעזור','נרשם','נראה לאחרונה','כוכבים','כוכבי עזרה','שיעורים','רצף']].concat(users.map(u => [u.name, u.grade, (u.need||[]).join(' / '), (u.help||[]).join(' / '),
      u.createdAt ? new Date(u.createdAt).toLocaleDateString('he-IL') : '', u.lastSeen ? new Date(u.lastSeen).toLocaleString('he-IL') : '', totalStars(u), u.stars||0, Object.values(u.progress||{}).reduce((a,b) => a+b, 0), streakOf(u)]));
    const csv = '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'})); a.download = `chavruta-users-${today()}.csv`; a.click();
  };
}

/* =============== intro =============== */

function renderIntro(done){
  const S = [['🙋','תקוע בחומר?','מצא תלמיד שכבר הבין את זה, והוא יסביר לך. בחינם.','var(--pink)'],
    ['🎥','נפגשים בווידאו','קובעים שעה שנוחה לשניכם ומדברים ישר מהאפליקציה.','var(--sky)'],
    ['🎮','מתרגלים ומשחקים','שיעורים קצרים, כוכבים, רצפים ותגים. כמו משחק.','var(--grn)']];
  let i = 0;
  const draw = () => { app.innerHTML = `<div class="page center intro">
    <div class="introbg" style="--c:${S[i][3]}"><div class="introi">${S[i][0]}</div></div>
    <h1 class="fred" style="font-size:32px;text-align:center">${S[i][1]}</h1><p class="sub" style="font-size:18px;margin:0">${S[i][2]}</p>
    <div class="dots">${S.map((_,k) => `<i class="${k===i?'on':''}"></i>`).join('')}</div>
    <button class="btn" id="nx">${i < S.length-1 ? 'הבא' : 'בוא נתחיל 🚀'}</button>${i < S.length-1 ? '<button class="link" id="sk">דלג</button>' : ''}</div>`;
    $('#nx').onclick = () => { if(i < S.length-1){ i++; vibrate(8); draw(); } else finish(); };
    $('#sk') && ($('#sk').onclick = finish); };
  const finish = () => { localStorage.setItem('cv_intro','1'); done(); };
  let x0 = null;
  app.ontouchstart = e => x0 = e.touches[0].clientX;
  app.ontouchend = e => { if(x0 === null || !$('.intro')) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if(dx < -50 && i > 0){ i--; draw(); } else if(dx > 50 && i < S.length-1){ i++; draw(); } };
  draw();
}


/* =============== v5: streak week, quests, splash =============== */

function hideSplash(){
  const sp = $('#splash'); if(!sp || sp.dataset.out) return; sp.dataset.out = 1;
  setTimeout(() => { sp.classList.add('out'); setTimeout(() => sp.remove(), 500); }, Math.max(0, 1100 - performance.now()));
}
function markDay(k){ const t = today(); if(me?.[k] === t) return; me[k] = t; B.saveUser(myId, {[k]: t}).catch(() => {}); }
function weekStrip(){
  const days = new Set(me.days || []);
  return `<div class="week">${Array.from({length:7}, (_,i) => { const d = new Date(Date.now() - (6-i)*864e5), k = today(d);
    return `<div class="${days.has(k) ? 'on' : ''} ${i === 6 ? 'today' : ''}"><span>${days.has(k) ? '🔥' : ''}</span>${DAYS[d.getDay()]}</div>`; }).join('')}</div>`;
}
function questsHtml(){
  const t = today(), tc = todayCount(me);
  const Q = [['📚','2 תרגולים היום', Math.min(tc,2), 2], ['🕹️','משחק ארקייד אחד', me.arcDay === t ? 1 : 0, 1], ['💬','הודעה לחברותא', me.msgDay === t ? 1 : 0, 1]];
  const all = Q.every(q => q[2] >= q[3]), claimed = me.chestDay === t;
  return `<div class="card"><div class="row between"><b class="fred big">🎯 משימות היום</b><button class="chest ${claimed ? 'open' : all ? 'ready' : ''}" id="chest" aria-label="תיבת פרס">${claimed ? '📭' : '🎁'}</button></div>
    ${Q.map(q => { const ok = q[2] >= q[3]; return `<div class="quest ${ok ? 'done' : ''}"><div class="qi">${ok ? '✓' : q[0]}</div><div class="grow"><div class="small" style="font-weight:700">${q[1]}</div><div class="prog" style="height:9px;margin-top:3px"><i style="width:${q[2]/q[3]*100}%;background:${ok ? 'var(--grn)' : 'var(--yel)'}"></i></div></div><span class="small muted">${q[2]}/${q[3]}</span></div>`; }).join('')}
    <div class="small muted" style="margin-top:4px">${claimed ? 'פתחת את התיבה של היום! מחר מחכה תיבה חדשה 🌙' : all ? 'לחץ על התיבה ותקבל 15 ⭐' : 'סיים את שלוש המשימות ופתח את התיבה: 15 ⭐'}</div></div>`;
}
async function openChest(){
  const t = today(), tc = todayCount(me), all = tc >= 2 && me.arcDay === t && me.msgDay === t;
  if(me.chestDay === t) return toast('כבר פתחת את התיבה היום 🌙');
  if(!all) return toast('קודם צריך לסיים את שלוש המשימות 💪');
  me.chestDay = t; me.gameStars = (me.gameStars||0) + 15; pendingFly += 15;
  try { await B.saveUser(myId, {chestDay:t, gameStars:me.gameStars}); } catch {}
  confetti(); sound('win'); vibrate([30,60,30]); toast('🎁 קיבלת 15 כוכבים!'); renderMain(); setTimeout(checkBadges, 900);
}

/* =============== safety: rules, filter, report, block =============== */

const RULES = [
  ['🤝','מכבדים את כולם','בלי קללות, עלבונות או לעג. כולנו כאן כדי ללמוד.'],
  ['🔒','שומרים על פרטיות','לא משתפים מספר טלפון, כתובת או סיסמה, ולא מבקשים אותם מאחרים.'],
  ['📚','רק לימודים','החברותא נועדה לעזרה בלימודים. שיחות וידאו רק בנושא הלימודים.'],
  ['🚩','משהו מרגיש לא בסדר?','לוחצים על ⋯ בצ׳אט ובוחרים "דיווח" או "חסימה". הצוות בודק כל דיווח.'],
  ['👨‍👩‍👧','מספרים למבוגר','אם מישהו מטריד או מבקש משהו מוזר, ספרו להורה או למורה.'],
];
function rulesSheet(){
  sheet(`<div style="text-align:center"><div style="font-size:44px">🛡️</div><h3>כללי ההתנהגות בחברותא</h3></div>
    <div class="list" style="margin-top:12px">${RULES.map(r => `<div class="row" style="align-items:flex-start;gap:12px"><div style="font-size:26px">${r[0]}</div><div><b>${r[1]}</b><div class="small muted">${r[2]}</div></div></div>`).join('')}</div>
    <div style="height:14px"></div><button class="btn" data-x>הבנתי 👍</button>`, (el, close) => el.querySelector('[data-x]').onclick = close);
}
const BAD = ['זונה','שרמוטה','מניאק','כוס','זין','חרא','מטומטם','מטומטמת','מפגר','מפגרת','אידיוט','דביל','דבילית','סתום','סתמי','תזדיין','תזדייני','בן זונה','בת זונה','כוסית','fuck','fucking','shit','bitch','dick','pussy','asshole','bastard','idiot','stupid','retard'];
const badRe = new RegExp(`(^|[^א-תa-z])([והשבכלמ]?)(${BAD.map(w => w.replace(/ /g,'\\s+')).join('|')})(?=$|[^א-תa-z])`, 'gi');
const cleanText = t => String(t).replace(badRe, (m, a, b, w) => a + b + '★'.repeat(Math.min(5, w.length)));
const hasPersonal = t => /(0[5-9]\d[-\s]?\d{3}[-\s]?\d{4}|\+972|\bכתובת\b|\bרחוב\b|סיסמה|סיסמא|instagram|אינסטגרם|טיקטוק|tiktok|snap|סנאפ)/i.test(t);
const isBlocked = uid => (me?.blocked || []).includes(uid);

async function toggleBlock(uid, name){
  const bl = new Set(me.blocked || []), was = bl.has(uid);
  was ? bl.delete(uid) : bl.add(uid);
  me.blocked = [...bl]; try { await B.saveUser(myId, {blocked: me.blocked}); } catch {}
  toast(was ? `ביטלת את החסימה של ${name}` : `🚫 חסמת את ${name}. לא תראו יותר זה את זה`);
}
function reportSheet(target, cid){
  const R = ['הטרדה','שפה פוגענית','בקשה לפרטים אישיים','תוכן לא לימודי','התחזות','אחר'];
  let reason = '';
  sheet(`<div style="text-align:center"><div style="font-size:44px">🚩</div><h3>דיווח על ${esc(target.name)}</h3><p class="small muted" style="margin:4px 0">הדיווח נשלח לצוות חברותא בלבד. ${esc(target.name)} לא יידע מי דיווח.</p></div>
    <label>מה קרה?</label><div class="chips" id="rr">${R.map(r => `<span class="chip" data-r="${r}">${r}</span>`).join('')}</div>
    <label for="rd">פרטים <span class="muted small">(לא חובה)</span></label><textarea id="rd" rows="3" maxlength="500" placeholder="מה בדיוק קרה?"></textarea>
    <label class="row" style="gap:8px;font-weight:600"><input type="checkbox" id="rb" checked style="width:auto"> לחסום גם את ${esc(target.name)}</label>
    <div style="height:10px"></div><button class="btn pink" id="rs" disabled>שליחת דיווח</button>
    <p class="small muted" style="margin:10px 0 0">אם מישהו מאיים עליך או מבקש משהו מפחיד, ספרו מיד להורה או למורה.</p>`, (el, close) => {
      el.querySelector('#rr').onclick = e => { const c = e.target.closest('[data-r]'); if(!c) return; reason = c.dataset.r; el.querySelectorAll('#rr .chip').forEach(x => x.classList.toggle('need', x === c)); el.querySelector('#rs').disabled = false; };
      el.querySelector('#rs').onclick = async e => { e.target.disabled = true;
        try { await B.addReport({by:myId, byName:me.name, target:target.id, targetName:target.name, reason, text:el.querySelector('#rd').value.trim().slice(0,500), cid:cid||'', at:Date.now(), status:'open'});
          if(el.querySelector('#rb').checked && !isBlocked(target.id)) await toggleBlock(target.id, target.name);
          close(); toast('תודה על הדיווח. הצוות יבדוק בהקדם 🛡️'); if(el.querySelector('#rb').checked && $('.chatwrap')){ tab = 'chats'; renderMain(); } }
        catch(err){ e.target.disabled = false; toast(errMsg(err)); } };
    });
}
function chatMenu(cid, o){
  const bl = isBlocked(o.id);
  sheet(`<h3 style="margin-bottom:12px">${esc(o.name)}</h3><div class="list">
    <button class="btn alt" data-a="report">🚩 דיווח</button>
    <button class="btn alt" data-a="block">${bl ? '✅ ביטול חסימה' : '🚫 חסימה'}</button>
    <button class="btn alt" data-a="rules">🛡️ כללי ההתנהגות</button></div>`, (el, close) => {
      el.onclick = async e => { const a = e.target.closest('[data-a]')?.dataset.a; if(!a) return; close();
        if(a === 'report') reportSheet(o, cid);
        if(a === 'rules') rulesSheet();
        if(a === 'block'){ await toggleBlock(o.id, o.name); if(!bl){ tab = 'chats'; renderMain(); } else renderChat(cid); } };
    });
}

/* =============== certificate & stats snapshot =============== */

const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
async function saveCanvas(c, name, text){
  const blob = await new Promise(r => c.toBlob(r, 'image/png')), file = new File([blob], name, {type:'image/png'});
  try { if(navigator.canShare?.({files:[file]})) return await navigator.share({files:[file], text}); } catch(e){ if(e?.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); toast('התמונה נשמרה 📥');
}
function helpedSessions(){
  const now = Date.now();
  return chats.flatMap(c => Object.values(c.sessions||{}).map(s => ({...s, cid:c.id})))
    .filter(s => s.status === 'ok' && s.at < now && (me.help||[]).includes(s.subject));
}
async function certificate(){
  const ss = helpedSessions(), hours = Math.round(ss.length * 0.75 * 10) / 10;
  if(!ss.length && !(me.stars > 0)) return toast('עוד אין מפגשי עזרה שהתקיימו. אחרי המפגש הראשון יהיה כאן אישור 💪');
  try { await document.fonts?.ready; } catch {}
  const W = 1754, H = 1240, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#fffdf6'; x.fillRect(0, 0, W, H);
  const g = x.createLinearGradient(0, 0, W, 0); ['#ff6b8a','#ffd65c','#5ee0a0','#5cc8ff','#a98bff'].forEach((col,i) => g.addColorStop(i/4, col));
  x.fillStyle = g; x.fillRect(0, 0, W, 26); x.fillRect(0, H-26, W, 26);
  x.strokeStyle = '#c9b77a'; x.lineWidth = 4; x.strokeRect(60, 70, W-120, H-140); x.lineWidth = 1.5; x.strokeRect(78, 88, W-156, H-176);
  const logo = await loadImg('logo.svg'); if(logo) x.drawImage(logo, W/2 - 85, 130, 170, 170);
  x.textAlign = 'center'; x.direction = 'rtl'; x.fillStyle = '#14173a';
  x.font = '700 86px Fredoka, Assistant, serif'; x.fillText('אישור על עזרה לימודית', W/2, 400);
  x.font = '500 40px Assistant, serif'; x.fillStyle = '#4a4f80'; x.fillText('בתוכנית חברותא · תלמידים עוזרים לתלמידים', W/2, 465);
  x.fillStyle = '#14173a'; x.font = '600 44px Assistant, serif'; x.fillText('מאשרים בזאת כי', W/2, 580);
  x.font = '700 92px Fredoka, Assistant, serif'; x.fillStyle = '#2b6fd8'; x.fillText(me.name + (me.grade ? `, כיתה ${me.grade}` : ''), W/2, 690);
  x.fillStyle = '#14173a'; x.font = '600 46px Assistant, serif';
  x.fillText(`השתתפות פעילה בעזרה לתלמידים אחרים ב${(me.help||[]).slice(0,3).join(', ')}`, W/2, 790);
  x.font = '700 58px Fredoka, Assistant, serif'; x.fillStyle = '#2f9a68';
  x.fillText(`${ss.length} מפגשים · כ-${hours} שעות${me.stars ? ` · ${me.stars} כוכבי תודה` : ''}`, W/2, 890);
  x.fillStyle = '#4a4f80'; x.font = '500 36px Assistant, serif';
  x.fillText(`הופק מאפליקציית חברותא בתאריך ${new Date().toLocaleDateString('he-IL')}`, W/2, 990);
  x.strokeStyle = '#14173a'; x.lineWidth = 2; x.beginPath(); x.moveTo(W/2 - 220, 1080); x.lineTo(W/2 + 220, 1080); x.stroke();
  x.font = '600 34px Assistant, serif'; x.fillStyle = '#14173a'; x.fillText('צוות חברותא', W/2, 1125);
  saveCanvas(c, 'chavruta-certificate.png', `אישור עזרה לימודית בחברותא – ${me.name}`);
}
async function snapshot(users, all, rs){
  try { await document.fonts?.ready; } catch {}
  const W = 1600, H = 900, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1b1650'); g.addColorStop(1, '#0e1028'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const logo = await loadImg('logo.svg'); if(logo) x.drawImage(logo, W - 190, 40, 130, 130);
  x.direction = 'rtl'; x.textAlign = 'right'; x.fillStyle = '#fff'; x.font = '700 64px Fredoka, Assistant'; x.fillText('חברותא · נתונים', W - 220, 110);
  x.font = '500 32px Assistant'; x.fillStyle = '#a4a8d6'; x.fillText(new Date().toLocaleDateString('he-IL', {day:'numeric', month:'long', year:'numeric'}), W - 220, 160);
  const ses = all.flatMap(c => Object.values(c.sessions||{})), ok = ses.filter(s => s.status === 'ok').length;
  const avg = rs.length ? (rs.reduce((a,r) => a + r.stars, 0) / rs.length).toFixed(1) : '—';
  const K = [[users.length,'תלמידים נרשמו','#5cc8ff'],[all.length,'חברותות נוצרו','#ff6b8a'],[ok,'מפגשים שאושרו','#ffd65c'],
    [all.reduce((a,c) => a + (c.callCount||0), 0),'שיחות וידאו','#a98bff'],[users.reduce((a,u) => a + Object.values(u.progress||{}).reduce((p,q) => p+q, 0), 0),'שיעורי תרגול','#5ee0a0'],[avg + ' ★','דירוג ממוצע' + (rs.length ? ` (${rs.length})` : ''),'#ffd65c']];
  K.forEach(([n,l,col],i) => { const cx = W - 80 - (i % 3) * 490, cy = 230 + Math.floor(i/3) * 300;
    x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.roundRect ? x.roundRect(cx - 450, cy, 450, 260, 36) : x.rect(cx - 450, cy, 450, 260); x.fill();
    x.textAlign = 'center'; x.fillStyle = col; x.font = '700 110px Fredoka, Assistant'; x.fillText(String(n), cx - 225, cy + 150);
    x.fillStyle = '#e6e8ff'; x.font = '600 36px Assistant'; x.fillText(l, cx - 225, cy + 215); });
  x.textAlign = 'center'; x.fillStyle = '#a4a8d6'; x.font = '500 28px Assistant'; x.fillText('chavruta-il-app.vercel.app · תלמידים עוזרים לתלמידים', W/2, H - 40);
  saveCanvas(c, `chavruta-stats-${today()}.png`, 'הנתונים של חברותא');
}

/* =============== boot =============== */

function enterApp(){
  unsubChats && unsubChats(); unsubMe && unsubMe();
  unsubChats = B.onChats(myId, list => {
    const before = chats.filter(isUnread).length; chats = list;
    if(['chats','home'].includes(tab) && !overlayOpen()) renderMain();
    else if($('.tabs')){ $('.tabs').outerHTML = tabsBar(); bindTabs(); }
    if(chats.filter(isUnread).length > before && !$('.chatwrap')){ toast('💬 הודעה חדשה'); sound('ok'); }
    checkIncoming(); checkBadges();
  });
  unsubMe = B.onUser(myId, u => { const changed = totalStars(u) !== totalStars(me); me = {...me, ...u}; if(changed){ checkBadges(); if(!overlayOpen() && $('.tabs')) renderMain(); } });
  window.CV_NAME = me.name;
  if(!localStorage.getItem('cv_tour')) setTimeout(() => { if(overlayOpen()) return; localStorage.setItem('cv_tour','1'); tour([
    {sel:'.tabs [data-t=home]', title:'🏠 בית', text:'היעד היומי, המשימות והמפגשים הקרובים שלך.'},
    {sel:'.tabs [data-t=find]', title:'🔍 חברותא', text:'כאן מוצאים מי יעזור לך, או למי אתה יכול לעזור.'},
    {sel:'.tabs [data-t=practice]', title:'🎮 תרגול', text:'שיעורים קצרים ומשחקים: בועות, זיכרון ו-60 שניות.'},
    {sel:'.tabs [data-t=chats]', title:'💬 צ׳אטים', text:'הודעות, קביעת מפגשים ושיחות וידאו.'},
    {sel:'.tabs [data-t=profile]', title:'⭐ פרופיל', text:'הכוכבים, התגים ומה אומרים עליך.'}]); }, 1400);
  heartbeat(); B.isAdmin(myId).then(v => { isAdm = v; if(v && tab === 'profile' && !overlayOpen()) renderMain(); });
  renderMain();
}

async function boot(){
  deco();
  try { B = window.CHAVRUTA_FIREBASE ? await firebaseBackend(window.CHAVRUTA_FIREBASE) : localBackend(); }
  catch(e){ console.error(e); hideSplash(); app.innerHTML = '<div class="page center"><div class="brand">חברותא</div><div class="card empty">לא הצלחנו להתחבר. בדוק את החיבור לאינטרנט.<br><button class="btn sm" onclick="location.reload()" style="margin-top:12px">נסה שוב</button></div></div>'; return; }
  B.onAuth(async uid => {
    unsubChats && unsubChats(); unsubMe && unsubMe(); unsubChats = unsubMe = null; cleanupView();
    myId = uid; me = null; chats = []; tab = firstTab || 'home'; firstTab = null;
    isAdm = false;
    if(!uid){ hideSplash(); return localStorage.getItem('cv_intro') ? renderAuth() : renderIntro(() => renderAuth('register')); }
    app.innerHTML = '<div class="page center"><img class="logo" src="logo.svg" alt=""><div class="brand">חברותא</div><div class="spin"></div></div>';
    try { me = await B.getUser(uid); } catch(e){ console.error(e); }
    hideSplash();
    if(me?.banned){ app.innerHTML = `<div class="page center" style="text-align:center">${mascot('sad',1)}<h2>החשבון הושעה</h2><p class="muted">בעקבות דיווח, החשבון הושעה זמנית. לשאלות: chavruta.il.app@gmail.com</p><button class="btn alt" id="lo2">יציאה</button></div>`; $('#lo2').onclick = () => B.logout(); return; }
    if(!me || !me.name){ me = null; return renderOnboard(); }
    enterApp();
  });
}
setInterval(() => { if(tab === 'home' && !overlayOpen() && me) renderMain(); }, 60000); // רענון ספירה לאחור של מפגשים
if('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
boot();
