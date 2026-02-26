// ═══════════════════════════════════════════════════════════════
// Firebase 초기화 (CDN compat 모드)
// Music Creator - Firebase Auth & Firestore 연동
// ═══════════════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyCZ8yMQ0YTVgm-PiScljSdUOb4EAzprFd0",
  authDomain: "music-creator-app-92d15.firebaseapp.com",
  projectId: "music-creator-app-92d15",
  storageBucket: "music-creator-app-92d15.firebasestorage.app",
  messagingSenderId: "963222891558",
  appId: "1:963222891558:web:283be7a61d6f645feb0ae7",
  measurementId: "G-3WYBCGCKLT",
};

// Firebase 앱 초기화
firebase.initializeApp(firebaseConfig);

// 전역 참조
window.firebaseAuth = firebase.auth();
window.firebaseDb = firebase.firestore();
window.firebaseStorage = firebase.storage();

console.log("✅ Firebase 초기화 완료");
