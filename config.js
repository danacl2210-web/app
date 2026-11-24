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
