// עזרים לממשק: הגנה על טקסט, הודעות קופצות, חלונות מלמטה, קונפטי
export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COLORS = ['#ff6b8a','#ffd65c','#5ee0a0','#5cc8ff','#a98bff','#ff9f5c'];
export const colorOf = id => COLORS[[...String(id)].reduce((a,c) => a + c.charCodeAt(0), 0) % COLORS.length];
export const avatar = (id,name,size=46) => `<div class="avatar" style="background:${colorOf(id)};width:${size}px;height:${size}px;font-size:${size*.42}px">${esc((name||'?').trim()[0]||'?')}</div>`;
export const shuffle = a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };

export function toast(t){ const el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 2600); }

export function sheet(html, onMount){
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet">${html}</div>`;
  const close = () => bg.remove();
  bg.addEventListener('click', e => { if(e.target === bg) close(); });
  document.body.appendChild(bg); onMount?.(bg.firstChild, close);
  return close;
}

export function vibrate(p){ try { navigator.vibrate?.(p); } catch {} }

// צלילים קטנים בלי קבצים
let ac;
export function sound(kind){
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    const notes = {ok:[660,880], bad:[220,180], win:[523,659,784,1046], ring:[880,660]}[kind] || [440];
    notes.forEach((f,i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = kind === 'bad' ? 'square' : 'sine';
      o.frequency.value = f; g.gain.setValueAtTime(.0001, ac.currentTime + i*.09); g.gain.exponentialRampToValueAtTime(.12, ac.currentTime + i*.09 + .02);
      g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + i*.09 + .22); o.connect(g).connect(ac.destination); o.start(ac.currentTime + i*.09); o.stop(ac.currentTime + i*.09 + .25); });
  } catch {}
}

export function confetti(){
  const c = document.createElement('canvas'); c.id = 'cf'; document.body.appendChild(c);
  const x = c.getContext('2d'), W = c.width = innerWidth, H = c.height = innerHeight;
  const P = Array.from({length:140}, () => ({x:W/2 + (Math.random()-.5)*80, y:H*.35, vx:(Math.random()-.5)*12, vy:-Math.random()*13-4,
    s:6+Math.random()*7, r:Math.random()*6, vr:(Math.random()-.5)*.4, c:COLORS[Math.floor(Math.random()*COLORS.length)]}));
  let t = 0; (function f(){ x.clearRect(0,0,W,H);
    P.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x,p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2); x.restore(); });
    if(++t < 110) requestAnimationFrame(f); else c.remove(); })();
}

export function deco(){
  const d = $('#deco'); if(!d || d.childElementCount) return;
  const em = ['📐','⚛️','📚','✏️','🧪','🌍','💡','⭐','🧬','📝'];
  d.innerHTML = em.map((e,i) => `<span style="top:${(i*37)%92}%;left:${(i*53+7)%90}%;animation-delay:${-i*1.7}s;font-size:${26+(i%3)*10}px">${e}</span>`).join('');
}

// גל לחיצה על כפתורים
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.btn'); if(!b) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height), s = document.createElement('span');
  s.className = 'rip'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d/2}px;top:${e.clientY - r.top - d/2}px`;
  b.appendChild(s); setTimeout(() => s.remove(), 600);
}, {passive:true});

// מספרים שעולים בהדרגה
const lastNum = new Map();
export function countUp(root = document){
  root.querySelectorAll('[data-cu]').forEach(el => {
    const key = el.dataset.cu, to = parseFloat(el.dataset.to), from = key && lastNum.has(key) ? lastNum.get(key) : 0;
    if(key) lastNum.set(key, to);
    if(isNaN(to) || from === to){ return; }
    if(key && from && to > from) el.closest('.pill')?.classList.add('bump');
    const dec = String(el.dataset.to).includes('.') ? 1 : 0, t0 = performance.now(), dur = 700;
    const f = t => { const k = Math.min(1, (t - t0) / dur), v = from + (to - from) * (1 - Math.pow(1 - k, 3)); el.textContent = v.toFixed(dec); if(k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
}

// הקישוטים ברקע זזים קצת עם הגלילה וההטיה של הטלפון
let px = 0, py = 0;
const moveDeco = () => document.querySelectorAll('#deco span').forEach((s,i) => { const k = (i % 3 + 1) * .35; s.style.translate = `${px*k}px ${py*k - scrollY*k*.15}px`; });
addEventListener('scroll', moveDeco, {passive:true});
addEventListener('deviceorientation', e => { if(e.gamma == null) return; px = Math.max(-20, Math.min(20, e.gamma)) ; py = Math.max(-20, Math.min(20, (e.beta||0) - 40)); moveDeco(); });
addEventListener('pointermove', e => { if(e.pointerType !== 'mouse') return; px = (e.clientX / innerWidth - .5) * 30; py = (e.clientY / innerHeight - .5) * 30; moveDeco(); }, {passive:true});

export function floatXP(text, x, y){
  const el = document.createElement('div'); el.className = 'floatxp'; el.textContent = text;
  el.style.left = (x ?? innerWidth/2) + 'px'; el.style.top = (y ?? innerHeight/2) + 'px'; el.style.transform = 'translateX(-50%)';
  document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
}
// כוכבים שעפים אל מונה הכוכבים
export function flyStars(n = 6){
  const target = document.querySelector('.pill.stars'); if(!target) return;
  const t = target.getBoundingClientRect();
  for(let i = 0; i < n; i++) setTimeout(() => {
    const s = document.createElement('div'); s.className = 'flystar'; s.textContent = '⭐';
    s.style.left = innerWidth/2 + (Math.random()-.5)*120 + 'px'; s.style.top = innerHeight*.55 + (Math.random()-.5)*80 + 'px';
    document.body.appendChild(s);
    requestAnimationFrame(() => { const r = s.getBoundingClientRect(); s.style.transform = `translate(${t.left + t.width/2 - r.left - 13}px, ${t.top - r.top}px) scale(.5)`; s.style.opacity = '.2'; });
    setTimeout(() => { s.remove(); target.classList.remove('bump'); void target.offsetWidth; target.classList.add('bump'); }, 820);
  }, i * 90);
}

// הדמות של חברותא: שתי טבעות עם עיניים. מצבים: '' / happy / sad / wow
export const mascot = (mood = '', size = 1) =>
  `<div class="masc ${mood}" style="--s:${size}" aria-hidden="true"><i class="mr1"><b></b></i><i class="mr2"><b></b></i><span class="mm"></span></div>`;
export function setMood(el, mood){ if(!el) return; el.classList.remove('happy','sad','wow'); void el.offsetWidth; if(mood) el.classList.add(mood); }

// תמונה לשיתוף הישג (וואטסאפ, אינסטגרם...)
export async function shareCard({emoji = '🏆', title = '', sub = '', name = ''}){
  try { await document.fonts?.ready; } catch {}
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#5b3fd6'); g.addColorStop(.55, '#2b6fd8'); g.addColorStop(1, '#1aa3a0');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.globalAlpha = .18; x.fillStyle = '#fff'; x.beginPath(); x.arc(180, 160, 260, 0, 7); x.fill(); x.beginPath(); x.arc(950, 1200, 300, 0, 7); x.fill(); x.globalAlpha = 1;
  ['📐','⚛️','📚','✏️','🧪','⭐'].forEach((e,i) => { x.globalAlpha = .25; x.font = '70px serif'; x.fillText(e, 80 + (i*170) % 900, 260 + (i*290) % 900); }); x.globalAlpha = 1;
  // כרטיס לבן
  x.fillStyle = 'rgba(14,16,40,.55)'; const r = 60, bx = 90, by = 300, bw = W-180, bh = 760;
  x.beginPath(); x.roundRect ? x.roundRect(bx, by, bw, bh, r) : x.rect(bx, by, bw, bh); x.fill();
  x.textAlign = 'center'; x.direction = 'rtl'; x.fillStyle = '#fff';
  x.font = '240px serif'; x.fillText(emoji, W/2, by + 300);
  x.font = '700 84px Fredoka, Assistant, sans-serif'; x.fillText(title, W/2, by + 440);
  x.font = '600 50px Assistant, sans-serif'; x.fillStyle = '#ffd65c'; x.fillText(sub, W/2, by + 530);
  if(name){ x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '600 44px Assistant, sans-serif'; x.fillText(name, W/2, by + 640); }
  // לוגו ושם
  await new Promise(res => { const im = new Image(); im.onload = () => { x.drawImage(im, W/2 - 90, 80, 180, 180); res(); }; im.onerror = res; im.src = 'logo.svg'; });
  x.fillStyle = '#fff'; x.font = '700 72px Fredoka, Assistant, sans-serif'; x.fillText('חברותא', W/2, 1160);
  x.font = '600 40px Assistant, sans-serif'; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText('תלמידים עוזרים לתלמידים · chavruta-il-app.vercel.app', W/2, 1230);
  const blob = await new Promise(res => c.toBlob(res, 'image/png'));
  const file = new File([blob], 'chavruta.png', {type:'image/png'});
  const text = `${title} ${sub} בחברותא! בואו גם: https://chavruta-il-app.vercel.app/download.html`;
  try {
    if(navigator.canShare?.({files:[file]})) return await navigator.share({files:[file], text});
  } catch(e){ if(e?.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'chavruta.png'; a.click();
  toast('התמונה נשמרה. אפשר לשתף אותה 📤');
}

// סיור מודרך: מאירים כל לשונית עם הסבר קצר
export function tour(steps, done){
  let i = 0;
  const el = document.createElement('div'); el.className = 'tour'; document.body.appendChild(el);
  const draw = () => {
    const s = steps[i], t = document.querySelector(s.sel); if(!t){ next(); return; }
    const r = t.getBoundingClientRect(), pad = 6;
    el.innerHTML = `<div class="spot" style="left:${r.left-pad}px;top:${r.top-pad}px;width:${r.width+pad*2}px;height:${r.height+pad*2}px"></div>
      <div class="tip" style="bottom:${innerHeight - r.top + 18}px">
        <div class="row" style="gap:10px;align-items:flex-start">${mascot('happy', .38)}<div class="grow"><b class="fred big">${esc(s.title)}</b><div>${esc(s.text)}</div></div></div>
        <div class="row between" style="margin-top:12px"><button class="link" data-x>דלג</button><span class="small muted">${i+1}/${steps.length}</span><button class="btn sm" data-n>${i < steps.length-1 ? 'הבא' : 'יאללה! 🚀'}</button></div></div>`;
    el.querySelector('[data-n]').onclick = next; el.querySelector('[data-x]').onclick = end;
  };
  const next = () => { i++; i >= steps.length ? end() : draw(); };
  const end = () => { el.remove(); done?.(); };
  draw();
}
