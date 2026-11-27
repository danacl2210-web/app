// הגדרות חיבור לשיחות וידאו. STUN מספיק ברוב הרשתות; ברשת סלולרית או בבתי ספר נדרש גם שרת TURN (ראו config.js).
const STUN = {urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']};
export const getIce = () => ({iceServers:[STUN, ...(Array.isArray(window.CHAVRUTA_TURN) ? window.CHAVRUTA_TURN : [])], iceCandidatePoolSize:2});
