// js/auth.js 스모크 테스트
//
// js/auth.js는 IIFE + Firebase Auth/Firestore SDK에 직접 의존하는 파일이라
// 지금까지 자동화 테스트가 전혀 없었다. 이 테스트는 Firebase SDK를 최소
// 목(mock)으로 대체해 다음 동작을 검증한다:
//   - 회원가입/로그인 입력값 유효성 검사 (누락/형식/길이/불일치)
//   - Firebase 오류 코드 → 한글 메시지 매핑 (getFirebaseErrorMessage, 비공개 함수라
//     doLogin/doSignup의 catch 분기를 통해 간접 검증)
//   - onAuthStateChanged 콜백의 3가지 상태 분기 (로그아웃 / 승인 대기 / 승인된 로그인)
//   - 로그아웃, 비밀번호 재설정 플로우

const assert = require("assert");

const originalConsole = { ...console };
console.log = function () {};
console.info = function () {};
console.warn = function () {};
console.error = function () {};

// ─── DOM 스텁 ─────────────────────────────────────────────────
function createStubElement(id) {
  const classes = new Set();
  return {
    id: id || "",
    value: "",
    textContent: "",
    innerHTML: "",
    innerText: "",
    className: "",
    title: "",
    accept: "",
    type: "",
    disabled: false,
    style: {},
    dataset: {},
    onchange: null,
    _attrs: {},
    classList: {
      add(...cls) {
        cls.forEach((c) => classes.add(c));
      },
      remove(...cls) {
        cls.forEach((c) => classes.delete(c));
      },
      toggle(c) {
        classes.has(c) ? classes.delete(c) : classes.add(c);
      },
      contains(c) {
        return classes.has(c);
      },
    },
    setAttribute(k, v) {
      this._attrs[k] = v;
    },
    getAttribute(k) {
      return this._attrs[k] === undefined ? null : this._attrs[k];
    },
    appendChild() {},
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
  };
}

const elementIds = [
  "signupName",
  "signupEmail",
  "signupPassword",
  "signupPasswordConfirm",
  "signupMessage",
  "signupBtn",
  "loginEmail",
  "loginPassword",
  "loginMessage",
  "loginBtn",
  "authOverlay",
  "mainAppContent",
  "mainWrapper",
  "auth-login",
  "auth-signup",
  "auth-pending",
  "headerUserInfo",
  "headerUserName",
  "headerUserRole",
  "headerLogoutBtn",
  "headerLoginBtn",
  "adminMenuDropdown",
  "apiKeyMenuBtn",
  "helpModalBtn",
  "headerMenuContent",
  "guidelinesText",
  "logoutConfirmBox",
];

const elements = new Map();
elementIds.forEach((id) => elements.set(id, createStubElement(id)));

const authTabButtons = ["login", "signup", "pending"].map((tab) => {
  const el = createStubElement("tabbtn-" + tab);
  el.dataset.tab = tab;
  return el;
});
const authPanels = ["auth-login", "auth-signup", "auth-pending"].map((id) =>
  elements.get(id),
);

global.window = global;
global.document = {
  getElementById(id) {
    return elements.has(id) ? elements.get(id) : null;
  },
  querySelectorAll(selector) {
    if (selector === ".auth-panel") return authPanels;
    if (selector === ".auth-tab-btn") return authTabButtons;
    return [];
  },
  querySelector(selector) {
    const m = selector.match(/data-tab="([^"]+)"/);
    if (m) return authTabButtons.find((b) => b.dataset.tab === m[1]) || null;
    return null;
  },
  createElement() {
    return createStubElement();
  },
  addEventListener() {},
  body: { appendChild() {} },
};

const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  },
};

// ─── Firebase SDK 목 ──────────────────────────────────────────
global.firebase = {
  firestore: { FieldValue: { serverTimestamp: () => "SERVER_TIMESTAMP" } },
};

let authStateCallback = null;
const firestoreDocs = new Map(); // uid -> { exists, data }

function makeDocRef(uid) {
  return {
    async set(data) {
      firestoreDocs.set(uid, { exists: true, data: () => data });
    },
    async get() {
      return firestoreDocs.get(uid) || { exists: false, data: () => null };
    },
  };
}

let nextSignInResult = null; // { ok: true } 또는 { ok: false, code }
let nextSignUpResult = null;
let nextResetResult = null;
const calls = [];

window.firebaseAuth = {
  currentUser: null,
  onAuthStateChanged(cb) {
    authStateCallback = cb;
  },
  async createUserWithEmailAndPassword(email, password) {
    calls.push(["createUserWithEmailAndPassword", email, password]);
    if (nextSignUpResult && !nextSignUpResult.ok) {
      const err = new Error("signup failed");
      err.code = nextSignUpResult.code;
      throw err;
    }
    const uid = "uid_" + email;
    return {
      user: {
        uid,
        async updateProfile(profile) {
          calls.push(["updateProfile", uid, profile]);
        },
      },
    };
  },
  async signInWithEmailAndPassword(email, password) {
    calls.push(["signInWithEmailAndPassword", email, password]);
    if (nextSignInResult && !nextSignInResult.ok) {
      const err = new Error("login failed");
      err.code = nextSignInResult.code;
      throw err;
    }
  },
  async signOut() {
    calls.push(["signOut"]);
  },
  async sendPasswordResetEmail(email) {
    calls.push(["sendPasswordResetEmail", email]);
    if (nextResetResult && !nextResetResult.ok) {
      const err = new Error("reset failed");
      err.code = nextResetResult.code;
      throw err;
    }
  },
};

window.firebaseDb = {
  collection(name) {
    return {
      doc(id) {
        if (name === "users") return makeDocRef(id);
        return makeDocRef(name + ":" + id);
      },
    };
  },
};

let toastMessages = [];
window.showToast = function (msg) {
  toastMessages.push(msg);
};
window.showConfirm = null; // doLogout이 fallback(confirm)을 타지 않도록 아래에서 개별 지정
let promptAsyncReturn = null;
window.showPromptAsync = async function () {
  return promptAsyncReturn;
};

let readOnlyModeCalls = [];
window.setReadOnlyMode = function (v) {
  readOnlyModeCalls.push(v);
};

require("../js/auth.js");

assert.strictEqual(
  typeof authStateCallback,
  "function",
  "onAuthStateChanged 콜백이 등록되어야 함",
);

// ═══════════════════════════════════════════════════════════════
// 1. 회원가입(doSignup) 유효성 검사
// ═══════════════════════════════════════════════════════════════
async function resetSignupForm() {
  elements.get("signupName").value = "";
  elements.get("signupEmail").value = "";
  elements.get("signupPassword").value = "";
  elements.get("signupPasswordConfirm").value = "";
  elements.get("signupMessage").textContent = "";
}

(async () => {
  await resetSignupForm();
  await window.doSignup();
  assert.ok(
    elements.get("signupMessage").textContent.includes("모든 필드"),
    "필드 누락 시 안내 메시지",
  );

  await resetSignupForm();
  elements.get("signupName").value = "홍길동";
  elements.get("signupEmail").value = "not-an-email";
  elements.get("signupPassword").value = "123456";
  elements.get("signupPasswordConfirm").value = "123456";
  await window.doSignup();
  assert.ok(
    elements.get("signupMessage").textContent.includes("올바른 이메일"),
    "이메일 형식 오류 안내",
  );

  await resetSignupForm();
  elements.get("signupName").value = "홍길동";
  elements.get("signupEmail").value = "test@example.com";
  elements.get("signupPassword").value = "123";
  elements.get("signupPasswordConfirm").value = "123";
  await window.doSignup();
  assert.ok(
    elements.get("signupMessage").textContent.includes("6자 이상"),
    "비밀번호 길이 오류 안내",
  );

  await resetSignupForm();
  elements.get("signupName").value = "홍길동";
  elements.get("signupEmail").value = "test@example.com";
  elements.get("signupPassword").value = "123456";
  elements.get("signupPasswordConfirm").value = "654321";
  await window.doSignup();
  assert.ok(
    elements.get("signupMessage").textContent.includes("일치하지 않습니다"),
    "비밀번호 불일치 안내",
  );

  // 정상 가입: Firestore 문서가 approved:false, role:"user"로 생성되고
  // 가입 직후 자동 로그인 세션이 즉시 종료(signOut)되는지 확인
  await resetSignupForm();
  elements.get("signupName").value = "홍길동";
  elements.get("signupEmail").value = " new@example.com ";
  elements.get("signupPassword").value = "123456";
  elements.get("signupPasswordConfirm").value = "123456";
  nextSignUpResult = { ok: true };
  calls.length = 0;
  await window.doSignup();

  const createdUid = "uid_new@example.com";
  const savedDoc = firestoreDocs.get(createdUid);
  assert.ok(savedDoc, "가입 시 Firestore 사용자 문서가 생성되어야 함");
  const savedData = savedDoc.data();
  assert.strictEqual(savedData.approved, false, "신규 가입자는 승인 대기 상태여야 함");
  assert.strictEqual(savedData.role, "user", "신규 가입자 기본 role은 user");
  assert.strictEqual(savedData.email, "new@example.com", "이메일 trim 처리 확인");
  assert.ok(
    calls.some((c) => c[0] === "signOut"),
    "가입 직후 자동 로그인 세션을 종료해야 함",
  );
  assert.ok(
    elements.get("signupMessage").textContent.includes("회원 가입이 완료"),
    "가입 성공 메시지",
  );
  assert.strictEqual(elements.get("signupBtn").disabled, false, "가입 완료 후 버튼 로딩 해제");

  // ═══════════════════════════════════════════════════════════════
  // 2. 로그인(doLogin) 유효성 검사 + Firebase 오류 메시지 한글화
  // ═══════════════════════════════════════════════════════════════
  elements.get("loginEmail").value = "";
  elements.get("loginPassword").value = "";
  elements.get("loginMessage").textContent = "";
  await window.doLogin();
  assert.ok(
    elements.get("loginMessage").textContent.includes("이메일과 비밀번호"),
    "로그인 필드 누락 안내",
  );

  elements.get("loginEmail").value = " user@example.com ";
  elements.get("loginPassword").value = "wrongpass";
  elements.get("loginMessage").textContent = "";
  nextSignInResult = { ok: false, code: "auth/wrong-password" };
  calls.length = 0;
  await window.doLogin();
  assert.ok(
    calls.some(
      (c) =>
        c[0] === "signInWithEmailAndPassword" && c[1] === "user@example.com",
    ),
    "로그인 시 이메일 trim 후 전달",
  );
  assert.strictEqual(
    elements.get("loginMessage").textContent,
    "❌ 비밀번호가 올바르지 않습니다.",
    "Firebase 오류 코드가 한글 메시지로 매핑되어야 함",
  );
  assert.strictEqual(elements.get("loginBtn").disabled, false, "로그인 실패 후 버튼 로딩 해제");

  // 알 수 없는 오류 코드는 코드 원문을 포함한 기본 메시지로 폴백
  elements.get("loginMessage").textContent = "";
  nextSignInResult = { ok: false, code: "auth/some-unmapped-code" };
  await window.doLogin();
  assert.ok(
    elements.get("loginMessage").textContent.includes("auth/some-unmapped-code"),
    "미매핑 오류 코드는 코드 자체를 노출",
  );

  // 정상 로그인은 loginMessage를 건드리지 않고 onAuthStateChanged에 위임
  elements.get("loginEmail").value = "user@example.com";
  elements.get("loginPassword").value = "correctpass";
  elements.get("loginMessage").textContent = "";
  nextSignInResult = { ok: true };
  await window.doLogin();
  assert.strictEqual(
    elements.get("loginMessage").textContent,
    "",
    "로그인 성공 시 자체적으로 메시지를 표시하지 않음",
  );

  // ═══════════════════════════════════════════════════════════════
  // 3. onAuthStateChanged: 로그아웃 상태 → 읽기 전용 모드
  // ═══════════════════════════════════════════════════════════════
  window.editMode = true;
  readOnlyModeCalls.length = 0;
  await authStateCallback(null);
  assert.strictEqual(window.editMode, false, "로그아웃 시 editMode=false");
  assert.deepStrictEqual(
    readOnlyModeCalls,
    [true],
    "로그아웃 시 읽기 전용 모드로 전환",
  );
  assert.strictEqual(window.getCurrentUser(), null);
  assert.strictEqual(window.getCurrentUserData(), null);

  // ═══════════════════════════════════════════════════════════════
  // 4. onAuthStateChanged: 승인 대기 사용자
  // ═══════════════════════════════════════════════════════════════
  const pendingUid = "uid_pending_user";
  firestoreDocs.set(pendingUid, {
    exists: true,
    data: () => ({ uid: pendingUid, name: "대기중", role: "user", approved: false }),
  });
  elements.get("authOverlay").classList.add("d-none");
  await authStateCallback({ uid: pendingUid, email: "pending@example.com" });
  assert.strictEqual(
    window.getCurrentUserData().approved,
    false,
    "승인 대기 사용자 데이터 반영",
  );
  assert.ok(
    !elements.get("authOverlay").classList.contains("d-none"),
    "승인 대기 시 인증 오버레이가 다시 표시되어야 함",
  );
  assert.ok(
    !elements.get("auth-pending").classList.contains("d-none"),
    "승인 대기 패널이 활성화되어야 함",
  );

  // ═══════════════════════════════════════════════════════════════
  // 5. onAuthStateChanged: 승인된 사용자 → 앱 진입
  // ═══════════════════════════════════════════════════════════════
  const approvedUid = "uid_approved_admin";
  firestoreDocs.set(approvedUid, {
    exists: true,
    data: () => ({
      uid: approvedUid,
      name: "관리자",
      role: "admin",
      approved: true,
    }),
  });
  window.editMode = false;
  readOnlyModeCalls.length = 0;
  elements.get("mainAppContent").classList.add("d-none");
  await authStateCallback({ uid: approvedUid, email: "admin@example.com" });
  assert.strictEqual(window.editMode, true, "승인된 로그인 시 editMode=true");
  assert.deepStrictEqual(readOnlyModeCalls, [false], "승인된 로그인 시 수정 가능 모드로 전환");
  assert.ok(
    !elements.get("mainAppContent").classList.contains("d-none"),
    "승인된 로그인 시 메인 앱이 표시되어야 함",
  );
  assert.ok(
    !elements.get("adminMenuDropdown").classList.contains("d-none"),
    "관리자는 관리 메뉴가 표시되어야 함",
  );
  assert.strictEqual(elements.get("headerUserName").textContent, "관리자");
  assert.strictEqual(window.getCurrentUserData().role, "admin");

  // ═══════════════════════════════════════════════════════════════
  // 6. 로그아웃(doLogoutConfirmed)
  // ═══════════════════════════════════════════════════════════════
  calls.length = 0;
  await window.doLogoutConfirmed();
  assert.ok(calls.some((c) => c[0] === "signOut"), "로그아웃 시 signOut 호출");
  assert.strictEqual(window.getCurrentUser(), null, "로그아웃 후 currentUser 초기화");
  assert.strictEqual(window.getCurrentUserData(), null, "로그아웃 후 currentUserData 초기화");
  assert.ok(
    !elements.get("authOverlay").classList.contains("d-none"),
    "로그아웃 후 인증 오버레이 표시",
  );

  // ═══════════════════════════════════════════════════════════════
  // 7. 비밀번호 재설정(doResetPassword)
  // ═══════════════════════════════════════════════════════════════
  toastMessages = [];
  calls.length = 0;
  promptAsyncReturn = null; // 사용자가 입력을 취소한 경우
  await window.doResetPassword();
  assert.ok(
    !calls.some((c) => c[0] === "sendPasswordResetEmail"),
    "입력 취소 시 재설정 이메일을 보내지 않아야 함",
  );

  toastMessages = [];
  promptAsyncReturn = "not-an-email";
  await window.doResetPassword();
  assert.ok(
    !calls.some((c) => c[0] === "sendPasswordResetEmail"),
    "잘못된 이메일 형식은 재설정 이메일을 보내지 않아야 함",
  );
  assert.ok(
    toastMessages.some((m) => m.includes("올바른 이메일")),
    "잘못된 이메일 형식 토스트 안내",
  );

  toastMessages = [];
  calls.length = 0;
  promptAsyncReturn = "reset@example.com";
  nextResetResult = { ok: true };
  await window.doResetPassword();
  assert.ok(
    calls.some(
      (c) => c[0] === "sendPasswordResetEmail" && c[1] === "reset@example.com",
    ),
    "유효한 이메일은 재설정 이메일 발송 호출",
  );
  assert.ok(
    toastMessages.some((m) => m.includes("전송했습니다")),
    "재설정 이메일 발송 성공 토스트",
  );

  originalConsole.log("MV auth flow smoke test: PASS");
  process.exit(0);
})().catch((err) => {
  originalConsole.error(err);
  process.exit(1);
});
