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
