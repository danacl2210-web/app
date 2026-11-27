// פונקציית שרת של Vercel: "עוזר חברותא" (AI). המפתח לא נחשף לדפדפן.
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
  if(!key) return res.status(503).json({error:'not_configured'});
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
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {method:'POST', headers:{'x-api-key':key, 'anthropic-version':'2023-06-01', 'content-type':'application/json'},
      body:JSON.stringify({model:process.env.AI_MODEL || 'claude-haiku-5-5', max_tokens:mode === 'plan' ? 1100 : 800, system:MODES[mode] + (ctxLine ? `\nהקשר: ${ctxLine}` : ''), messages:msgs}), signal:AbortSignal.timeout(25000)});
    const j = await r.json();
    if(!r.ok) return res.status(502).json({error:'upstream', detail:j.error?.message?.slice(0, 120)});
    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    return res.status(200).json({text});
  } catch(e){ return res.status(504).json({error:'timeout'}); }
};
