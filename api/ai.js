// פונקציית שרת של Vercel: "עוזר חברותא" (AI). המפתח לא נחשף לדפדפן.
// אפשר להשתמש ב-GEMINI_API_KEY (מפתח חינמי מ-Google AI Studio) במקום או בנוסף ל-ANTHROPIC_API_KEY.
// הגדרה: ב-Vercel › Settings › Environment Variables להוסיף ANTHROPIC_API_KEY (ואופציונלית FIREBASE_API_KEY, AI_MODEL).
const hits = new Map();
const LIMIT_USER = 60, LIMIT_ANON = 25, DAY = 864e5;

const BASE = `אתה "עוזר חברותא", עוזר לימודים ידידותי לתלמידי חטיבה ותיכון בישראל.
כללים קבועים:
- עונה בשפה שבה התלמיד כותב (ברירת מחדל: עברית), בקצרה, בבהירות ובטון חם ומעודד. מתאים לגיל ולכיתה.
- לא עושה שיעורי בית ועבודות במקום התלמיד. עוזר להבין ולהתקדם.
- לא מבקש ולא אוסף פרטים אישיים (טלפון, כתובת, בית ספר, רשתות חברתיות). אם התלמיד משתף, מזכיר בעדינות לא לשתף.
- אם התלמיד כותב על מצוקה, פגיעה בעצמו, אלימות, הצקות או חרם: מגיב באמפתיה, מעודד לפנות למבוגר מהימן, ומציין את ער"ן בטלפון 1201 או קו 105 להגנה על ילדים ברשת. בסכנה מיידית 100 או 101. לא ממשיך למשימת הלימוד באותה הודעה.
- מסרב בנימוס לתוכן מיני, אלים, מסוכן או לא מתאים לגיל ומחזיר לנושא הלימוד.
- אם לא בטוח בעובדה, אומר זאת. לא ממציא מקורות.`;

const MODES = {
  hint: BASE + `\nמצב רמזים: אל תיתן את התשובה הסופית. שאל שאלה מכוונת או תן רמז אחד, ובקש מהתלמיד לנסות. אם התלמיד תקוע אחרי כמה ניסיונות, פרק את הבעיה לצעדים קטנים. רק בסוף, אחרי שניסה, אשר או תקן את התשובה שלו.`,
  plan: BASE + `\nמצב מערך שיעור: התלמיד הוא מסביר-עמית (תלמיד שמלמד תלמיד). בנה מערך שיעור קצר של 20 דקות עם כותרות: מטרה, פתיחה (3 דק׳), הסבר בצעדים עם דוגמה, תרגול (2-3 שאלות עם תשובות למסביר בלבד), טעויות נפוצות, ובדיקת הבנה בסוף. השתמש ברשימות קצרות.`,
  summary: BASE + `\nמצב סיכום: סכם את מה שהתלמיד תיאר ל: מה למדנו (2-3 נקודות), מה לחזור עליו, ו-3 שאלות תרגול קצרות. בלי תשובות מלאות לשאלות.`,
  summary_json: BASE + `\nמצב סיכום מובנה: החזר אך ורק JSON תקין, בלי טקסט נוסף ובלי גדרות קוד, במבנה: {"learned":"עד 200 תווים","review":"עד 120 תווים","hw":"עד 120 תווים","questions":["שאלה 1","שאלה 2","שאלה 3"]}. הכול בשפת התלמיד.`,
  writing: BASE + `\nמצב עבודות כתיבה: עזור לתלמיד לתכנן: שאלות מנחות, מבנה (פתיחה, גוף, סיכום), רעיונות לחיפוש מקורות ובדיקת ניסוח. אל תכתוב את העבודה במקומו ואל תכתוב פסקאות שלמות להעתקה.`,
};

async function verify(idToken){
  const key = process.env.FIREBASE_API_KEY; if(!key || !idToken) return null;
  try { const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({idToken})});
    const j = await r.json(); return j.users?.[0]?.localId || null; } catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if(req.method !== 'POST') return res.status(405).json({error:'method'});
  const key = process.env.ANTHROPIC_API_KEY;
  if(!key && !process.env.GEMINI_API_KEY) return res.status(503).json({error:'not_configured'});
  let b = req.body; if(typeof b === 'string'){ try { b = JSON.parse(b); } catch { b = {}; } } b ||= {};
  const mode = MODES[b.mode] ? b.mode : 'hint';
  const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-12).map(m => ({role:m.role === 'assistant' ? 'assistant' : 'user', content:String(m.content || '').slice(0, 1800)})).filter(m => m.content.trim());
  while(msgs.length && msgs[0].role !== 'user') msgs.shift();
  if(!msgs.length) return res.status(400).json({error:'empty'});

  const uid = await verify(b.idToken);
  if(process.env.AI_REQUIRE_AUTH === '1' && !uid) return res.status(401).json({error:'auth'});
  const who = uid || 'ip:' + String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), h = (hits.get(who) || []).filter(t => now - t < DAY);
  if(h.length >= (uid ? LIMIT_USER : LIMIT_ANON)) return res.status(429).json({error:'limit'});
  h.push(now); hits.set(who, h); if(hits.size > 5000) hits.clear();

  const ctxLine = [b.grade && `כיתה: ${String(b.grade).slice(0, 8)}`, b.subject && `מקצוע: ${String(b.subject).slice(0, 30)}`].filter(Boolean).join(' · ');
  const system = MODES[mode] + (ctxLine ? `\nהקשר: ${ctxLine}` : '');
  const maxTokens = mode === 'plan' ? 1100 : 800;
  const tryAnthropic = async () => {
    const models = process.env.AI_MODEL ? [process.env.AI_MODEL] : ['claude-haiku-5-5', 'claude-haiku-4-5', 'claude-sonnet-4-5'];
    let last = null;
    for(const model of models){
      try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {method:'POST', headers:{'x-api-key':key, 'anthropic-version':'2023-06-01', 'content-type':'application/json'},
          body:JSON.stringify({model, max_tokens:maxTokens, system, messages:msgs}), signal:AbortSignal.timeout(25000)});
        const j = await r.json();
        if(r.ok) return {text:(j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim()};
        last = {status:r.status, detail:`${model}: ${j.error?.type || ''} ${j.error?.message || ''}`.slice(0, 160)};
        if(r.status !== 404 && j.error?.type !== 'not_found_error') break;
      } catch(e){ last = {status:504, detail:'timeout'}; break; }
    }
    return {fail:last};
  };
  const tryGemini = async () => {
    const gk = process.env.GEMINI_API_KEY; if(!gk) return {fail:null};
    let last = null;
    const run = async (model, think = true) => {
      const gc = {maxOutputTokens:maxTokens}; if(think) gc.thinkingConfig = {thinkingBudget:0};   // בלי "חשיבה" ארוכה: מהיר יותר
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gk}`, {method:'POST', headers:{'content-type':'application/json'},
        body:JSON.stringify({systemInstruction:{parts:[{text:system}]}, contents:msgs.map(m => ({role:m.role === 'assistant' ? 'model' : 'user', parts:[{text:m.content}]})), generationConfig:gc}), signal:AbortSignal.timeout(20000)});
      const j = await r.json();
      if(r.ok){ const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('\n').trim(); return text ? {text} : {status:200, detail:`${model}: empty (${j.candidates?.[0]?.finishReason || j.promptFeedback?.blockReason || '?'})`}; }
      if(r.status === 400 && think && /think/i.test(j.error?.message || '')) return run(model, false);
      return {status:r.status, detail:`gemini ${model}: ${j.error?.status || ''} ${j.error?.message || ''}`.slice(0, 160)};
    };
    try {
      let tried = new Set(), list = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : ['gemini-flash-latest', 'gemini-2.5-flash'];
      for(const m of list){ tried.add(m); const x = await run(m); if(x.text) return x; last = x; if(x.status !== 404) return {fail:last}; }
      // כל הדגמים שניסינו לא קיימים: מגלים אילו דגמים זמינים למפתח הזה ומנסים את החדשים ביותר מסוג flash
      const lr = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${gk}`, {signal:AbortSignal.timeout(10000)});
      const lj = await lr.json();
      const found = (lj.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name.replace('models/', ''))
        .filter(n => /^gemini-[\d.]+-flash(-lite)?$/.test(n) && !tried.has(n)).sort((x, y) => parseFloat(y.split('-')[1]) - parseFloat(x.split('-')[1]) || (x.includes('lite') ? 1 : -1)).slice(0, 3);
      for(const m of found){ const x = await run(m); if(x.text) return x; last = x; }
    } catch(e){ last = {status:504, detail:`gemini ${e?.name || 'error'}: ${String(e?.message || e).slice(0, 90)}`}; }
    return {fail:last};
  };
  // קודם Anthropic (אם יש מפתח), ואם אין קרדיט או שיש תקלה, עוברים ל-Gemini (אם הוגדר GEMINI_API_KEY)
  let a1 = key ? await tryAnthropic() : {fail:null};
  if(a1.text) return res.status(200).json({text:a1.text});
  const a2 = await tryGemini();
  if(a2.text) return res.status(200).json({text:a2.text});
  const last = a2.fail || a1.fail;
  return res.status(502).json({error:'upstream ' + (last?.status || ''), detail:last?.detail || ''});
};
