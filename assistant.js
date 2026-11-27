// עוזר חברותא: צ׳אט AI (רמזים, מערך שיעור, סיכום, עבודות). הקריאה עוברת לפונקציית שרת /api/ai כדי שהמפתח לא ייחשף.
import { esc, toast } from './ui.js';

const MODES = [
  ['hint', '🧩', 'רמזים', 'תקוע בתרגיל? כתוב מה ניסית, ואכוון אותך בלי לתת את התשובה.', 'למשל: איך גוזרים (x²+1)³? ניסיתי ולא הצלחתי'],
  ['plan', '🧑‍🏫', 'מערך שיעור', 'מכין מערך קצר למסביר: פתיחה, הסבר, תרגול וטעויות נפוצות.', 'למשל: מערך של 20 דקות על כלל השרשרת לכיתה י׳'],
  ['summary', '📒', 'סיכום שיעור', 'מדביקים מה למדתם ומקבלים סיכום ושלוש שאלות תרגול.', 'כתוב בכמה מילים מה למדתם היום'],
  ['writing', '✍️', 'עבודה', 'עוזר לתכנן עבודה: מבנה, שאלות מנחות ובדיקת ניסוח. לא כותב במקומך.', 'למשל: אני צריך לכתוב עבודה על מהפכת התעשייה'],
];
const DAILY = 30;
const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^#{1,3}\s*(.+)$/gm, '<b>$1</b>').replace(/^\s*[-•*]\s+/gm, '• ').replace(/\n/g, '<br>');
const quota = () => { const k = 'cv_ai_' + new Date().toDateString(); return {k, n:+localStorage.getItem(k) || 0}; };

export function createAssistant(ctx){
  async function call(mode, messages, extra = {}){
    const q = quota(); if(q.n >= DAILY) return {err:'הגעת למגבלה היומית של העוזר. נחזור מחר 🌙'};
    let idToken = null; try { idToken = await ctx.B().idToken?.(); } catch {}
    const me = ctx.me();
    try {
      const r = await fetch('/api/ai', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({mode, messages, idToken, grade:me?.grade, subject:extra.subject || ''})});
      if(r.status === 429) return {err:'הגעת למגבלת השימוש להיום. נסה שוב מחר.'};
      if(r.status === 503 || r.status === 404) return {err:'העוזר עדיין לא הופעל באתר הזה. (מנהל האתר צריך להוסיף מפתח AI ב-Vercel.)'};
      if(!r.ok) return {err:'העוזר לא זמין כרגע. נסה שוב בעוד רגע.'};
      const j = await r.json(); localStorage.setItem(q.k, String(q.n + 1)); return {text:j.text || ''};
    } catch { return {err:'אין חיבור לעוזר. בדוק את החיבור לאינטרנט.'}; }
  }

  // סיכום מובנה לדף סיכום השיעור
  async function summarize(notes, subject){
    const r = await call('summary_json', [{role:'user', content:notes}], {subject}); if(r.err) return r;
    try { const j = JSON.parse(r.text.replace(/^```(json)?|```$/g, '').trim()); return {data:j}; } catch { return {err:'לא הצלחתי לנסח סיכום מובנה. נסה לכתוב קצת יותר.'}; }
  }

  function open(mode = 'hint', seed = ''){
    const el = document.createElement('div'); el.className = 'aiov'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'עוזר חברותא');
    document.body.appendChild(el);
    const hist = {}; MODES.forEach(m => hist[m[0]] = []);
    let cur = mode, busy = false;
    const subs = [...new Set([...(ctx.me().need || []), ...(ctx.me().help || [])])];
    const shell = () => { const m = MODES.find(x => x[0] === cur);
      el.innerHTML = `<div class="aihead"><button class="link" id="aib" aria-label="סגירה" style="font-size:22px">→</button><b class="fred big grow">🤖 עוזר חברותא</b>${subs.length ? `<select id="ais" aria-label="מקצוע"><option value="">מקצוע</option>${subs.map(s => `<option>${esc(s)}</option>`).join('')}</select>` : ''}</div>
        <div class="aimodes" role="tablist">${MODES.map(x => `<button role="tab" aria-selected="${x[0] === cur}" class="${x[0] === cur ? 'on' : ''}" data-m="${x[0]}">${x[1]} ${x[2]}</button>`).join('')}</div>
        <div class="aimsgs" id="aim" aria-live="polite"></div>
        <div class="ainote">🛈 העוזר הוא AI ועלול לטעות. הוא מכוון ולא פותר במקומך. לא משתפים פרטים אישיים.</div>
        <div class="composer"><textarea id="aix" rows="1" placeholder="${esc(m[4])}" aria-label="הודעה לעוזר"></textarea><button class="iconbtn send" id="ais2" aria-label="שליחה">➤</button></div>`;
      draw(); bind(); };
    const draw = () => { const box = el.querySelector('#aim'), m = MODES.find(x => x[0] === cur), h = hist[cur];
      box.innerHTML = (h.length ? '' : `<div class="aiintro"><div style="font-size:48px">${m[1]}</div><b class="fred big">${m[2]}</b><p class="muted">${esc(m[3])}</p></div>`)
        + h.map(x => `<div class="msg ${x.role === 'user' ? 'me' : 'them aib'}">${x.role === 'user' ? esc(x.content) : md(x.content)}</div>`).join('') + (busy ? '<div class="msg them aib"><span class="dots"><i></i><i></i><i></i></span></div>' : '');
      box.scrollTop = box.scrollHeight; };
    const send = async () => { const tx = el.querySelector('#aix'), t = tx.value.trim(); if(!t || busy) return;
      if(ctx.hurt && ctx.hurt(t)) { toast('נסח מחדש בכבוד 🙏'); return; }
      tx.value = ''; hist[cur].push({role:'user', content:t}); busy = true; draw(); ctx.scanOut?.(t);
      const r = await call(cur, hist[cur].slice(-10), {subject:el.querySelector('#ais')?.value || ''});
      busy = false; if(r.err){ hist[cur].pop(); tx.value = t; toast(r.err); } else hist[cur].push({role:'assistant', content:r.text}); draw(); };
    const bind = () => {
      el.querySelector('#aib').onclick = () => el.remove();
      el.querySelector('.aimodes').onclick = e => { const b = e.target.closest('[data-m]'); if(!b) return; cur = b.dataset.m; shell(); };
      el.querySelector('#ais2').onclick = send;
      const tx = el.querySelector('#aix'); tx.onkeydown = e => { if(e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer:coarse)').matches){ e.preventDefault(); send(); } };
      tx.oninput = () => { tx.style.height = 'auto'; tx.style.height = Math.min(tx.scrollHeight, 120) + 'px'; };
    };
    shell(); if(seed){ el.querySelector('#aix').value = seed; }
    return () => el.remove();
  }
  return {open, summarize, call};
}
