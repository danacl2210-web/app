// תרגום מסכי הפתיחה, הכניסה וההרשמה (עברית, אנגלית, רוסית, ערבית). שאר האפליקציה בעברית.
const D = {
  he:{sub:'תלמידים עוזרים לתלמידים. חינם.', loginT:'ברוך שובך 👋', regT:'הרשמה 🎉', phone:'מספר טלפון', pass:'סיסמה', passPh:'לפחות 6 תווים', pass2:'שוב את הסיסמה', create:'יצירת חשבון', login:'כניסה',
    noAcc:'אין לי חשבון – הרשמה', haveAcc:'כבר יש לי חשבון', forgot:'שכחתי סיסמה', demo:'🎬 מצב הדגמה (לשופטים)', how:'▶ איך זה עובד? (30 שניות)', agree:'קראתי ואני מסכים לכללי ההתנהגות', local:'מצב מקומי', localD:'הנתונים נשמרים רק במכשיר הזה',
    ePhone:'כתוב מספר נייד ישראלי, למשל 050-1234567', ePw:'הסיסמה צריכה לפחות 6 תווים', ePw2:'הסיסמאות לא זהות', eAgree:'צריך לאשר את כללי ההתנהגות',
    i1t:'תקוע בחומר?', i1d:'מצא תלמיד שכבר הבין את זה, והוא יסביר לך. בחינם.', i2t:'נפגשים בווידאו', i2d:'קובעים שעה שנוחה לשניכם ומדברים ישר מהאפליקציה.', i3t:'מתרגלים ומשחקים', i3d:'שיעורים קצרים, כוכבים, רצפים ותגים. כמו משחק.', next:'הבא', start:'בוא נתחיל 🚀', skip:'דלג', by:'נבנה בגאווה על ידי תלמידים'},
  en:{sub:'Students helping students. Free.', loginT:'Welcome back 👋', regT:'Sign up 🎉', phone:'Phone number', pass:'Password', passPh:'At least 6 characters', pass2:'Repeat password', create:'Create account', login:'Log in',
    noAcc:"I don't have an account – sign up", haveAcc:'I already have an account', forgot:'Forgot password', demo:'🎬 Demo mode (for judges)', how:'▶ How it works (30 sec)', agree:'I read and agree to the community rules', local:'Local mode', localD:'Data is saved on this device only',
    ePhone:'Enter an Israeli mobile number, e.g. 050-1234567', ePw:'Password must be at least 6 characters', ePw2:'Passwords do not match', eAgree:'Please accept the community rules',
    i1t:'Stuck on homework?', i1d:'Find a student who already got it, and they will explain. Free.', i2t:'Meet on video', i2d:'Pick a time that suits you both and talk right from the app.', i3t:'Practice and play', i3d:'Short lessons, stars, streaks and badges. Like a game.', next:'Next', start:"Let's start 🚀", skip:'Skip', by:'Proudly built by students'},
  ru:{sub:'Ученики помогают ученикам. Бесплатно.', loginT:'С возвращением 👋', regT:'Регистрация 🎉', phone:'Номер телефона', pass:'Пароль', passPh:'Не менее 6 символов', pass2:'Повторите пароль', create:'Создать аккаунт', login:'Войти',
    noAcc:'У меня нет аккаунта – регистрация', haveAcc:'У меня уже есть аккаунт', forgot:'Забыли пароль', demo:'🎬 Демо-режим (для жюри)', how:'▶ Как это работает (30 сек)', agree:'Я прочитал(а) и согласен(на) с правилами', local:'Локальный режим', localD:'Данные хранятся только на этом устройстве',
    ePhone:'Введите израильский мобильный номер, например 050-1234567', ePw:'Пароль должен быть не короче 6 символов', ePw2:'Пароли не совпадают', eAgree:'Нужно принять правила',
    i1t:'Не понимаешь тему?', i1d:'Найди ученика, который уже разобрался, и он объяснит. Бесплатно.', i2t:'Встречи по видео', i2d:'Выберите удобное время и общайтесь прямо в приложении.', i3t:'Тренируйся и играй', i3d:'Короткие уроки, звёзды, серии и значки. Как в игре.', next:'Далее', start:'Начнём 🚀', skip:'Пропустить', by:'С гордостью создано учениками'},
  ar:{sub:'طلاب يساعدون طلابًا. مجانًا.', loginT:'أهلًا بعودتك 👋', regT:'إنشاء حساب 🎉', phone:'رقم الهاتف', pass:'كلمة المرور', passPh:'6 أحرف على الأقل', pass2:'أعد كلمة المرور', create:'إنشاء حساب', login:'دخول',
    noAcc:'ليس لدي حساب – تسجيل', haveAcc:'لدي حساب بالفعل', forgot:'نسيت كلمة المرور', demo:'🎬 وضع العرض (للحكّام)', how:'▶ كيف يعمل؟ (30 ثانية)', agree:'قرأت وأوافق على قواعد السلوك', local:'وضع محلي', localD:'تُحفظ البيانات على هذا الجهاز فقط',
    ePhone:'أدخل رقم هاتف محمول إسرائيليًا، مثل 050-1234567', ePw:'يجب أن تكون كلمة المرور 6 أحرف على الأقل', ePw2:'كلمتا المرور غير متطابقتين', eAgree:'يجب الموافقة على قواعد السلوك',
    i1t:'عالق في المادة؟', i1d:'اعثر على طالب فهمها بالفعل وسيشرح لك. مجانًا.', i2t:'نلتقي بالفيديو', i2d:'اختاروا وقتًا مناسبًا وتحدثوا مباشرة من التطبيق.', i3t:'تدرّب والعب', i3d:'دروس قصيرة ونجوم وسلاسل وشارات. كأنها لعبة.', next:'التالي', start:'هيا نبدأ 🚀', skip:'تخطَّ', by:'صُنع بفخر على يد طلاب'},
};
export const LANG_BTNS = [['he', 'עברית'], ['en', 'English'], ['ru', 'Русский'], ['ar', 'العربية']];
export const lang = () => { const l = localStorage.getItem('cv_lang'); return D[l] ? l : 'he'; };
export const t = k => D[lang()][k] ?? D.he[k];
export const dirOf = () => ['he', 'ar'].includes(lang()) ? 'rtl' : 'ltr';
export const langPicker = () => `<div class="langpick" role="group" aria-label="Language">${LANG_BTNS.map(([c, n]) => `<button type="button" data-lang="${c}" class="${lang() === c ? 'on' : ''}" ${lang() === c ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${n}</button>`).join('')}</div>`;
export function bindLangPicker(root, onChange){ root.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { localStorage.setItem('cv_lang', b.dataset.lang); onChange(); }); }
