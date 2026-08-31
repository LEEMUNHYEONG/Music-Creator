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

// [FIX] 로컬 파일 시스템(file://) 환경에서 Firestore 연결 안정성 강화
if (window.location.protocol === 'file:') {
  window.firebaseDb.settings({ experimentalForceLongPolling: true });
}

window.firebaseStorage = firebase.storage();

// 로컬 테스트 환경에서 에뮬레이터는 명시적으로 요청한 경우에만 연결
const isLocalHost =
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.hostname.startsWith("192.168.");
const useFirebaseEmulator =
  isLocalHost &&
  new URLSearchParams(location.search).get("emulator") === "1";

window.isFirebaseEmulatorActive = useFirebaseEmulator;

if (useFirebaseEmulator) {
  console.log("🛠️ 로컬 에뮬레이터 환경 감지: 에뮬레이터에 연결합니다.");
  window.firebaseAuth.useEmulator("http://127.0.0.1:9099");
  window.firebaseDb.useEmulator("127.0.0.1", 8082);
  window.firebaseStorage.useEmulator("127.0.0.1", 9199);
} else if (isLocalHost) {
  console.log("🛠️ 로컬 실행 감지: 실제 Firebase 서비스에 연결합니다. 에뮬레이터를 쓰려면 ?emulator=1을 붙이세요.");
}

console.log("✅ Firebase 초기화 완료");
