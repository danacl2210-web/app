// ===== הגדרות חברותא =====
// מחובר לפרויקט Firebase "chavruta". כדי לחזור למצב מקומי (בדיקה במכשיר אחד), שנו ל: window.CHAVRUTA_FIREBASE = null;
window.CHAVRUTA_FIREBASE = {
  apiKey: "AIzaSyA9DBbzcj88z0WQVUITzvMEsMecmmjMfOk",
  authDomain: "chavruta-e9ba5.firebaseapp.com",
  projectId: "chavruta-e9ba5",
  storageBucket: "chavruta-e9ba5.firebasestorage.app",
  messagingSenderId: "1089716327885",
  appId: "1:1089716327885:web:e64790efc4b7aa2c34e084"
};

// אימות טלפון: false = מצב הדגמה (הקוד מוצג בהודעה על המסך, בלי SMS אמיתי).
// true = SMS אמיתי דרך Firebase Phone Auth. צריך להפעיל ב-Firebase: Authentication → Sign-in method → Phone,
// ולהוסיף את הדומיין ב-Authorized domains. ייתכן שיידרש מעבר לחבילת Blaze (תשלום לפי הודעה).
window.CHAVRUTA_PHONE_AUTH = false;

// שרת TURN: מעביר שיחות וידאו גם כשהרשת חוסמת חיבור ישיר (סלולר, בתי ספר, אולמות). מומלץ מאוד לפני הצגה.
// אפשרות חינמית: נרשמים ב-metered.ca (Open Relay, 20GB בחודש בחינם), ומעתיקים לכאן את ה-urls, username ו-credential.
// ברירת המחדל כאן היא שרת ציבורי לבדיקות. הוא עלול להיות איטי או לא זמין, ולכן עדיף מפתח משלכם.
window.CHAVRUTA_TURN = [
  {urls:['turn:openrelay.metered.ca:80','turn:openrelay.metered.ca:443','turns:openrelay.metered.ca:443?transport=tcp'], username:'openrelayproject', credential:'openrelayproject'},
];
