// js/admin.js 스모크 테스트
//
// 관리자 패널(사용자 승인/거절/역할 변경, 공용 API 키 설정)에는 지금까지
// 자동화 테스트가 전혀 없었다. Firebase Firestore/Auth SDK와 fetch를
// 최소 목(mock)으로 대체해 다음을 검증한다:
//   - 관리자 권한 게이트 (일반 사용자는 패널을 열 수 없음)
//   - 사용자 카드 렌더링: 자기 자신 보호("내 계정"), 승인 대기/승인됨,
//     일반/관리자 각 상태에 맞는 액션 버튼 노출
//   - approveUser/rejectUser/revokeUser/makeAdmin/demoteAdmin: 확인
//     다이얼로그를 취소하면 아무 것도 실행되지 않는지, 승인 시
//     Firestore에 정확한 값이 반영되는지
//   - rejectUser: Firestore 문서 삭제 + 서버 API로 Auth 계정 비활성화
//     요청까지 이어지는지, 비활성화 실패 시에도 문서 삭제 결과는
//     남아있고 사용자에게 경고 토스트가 뜨는지
//   - 탭 전환 시 config 탭에서 전역 설정(API 키/모델)을 불러오는지
//   - saveGlobalSettings/saveGlobalApiKeyModal: 확인 다이얼로그 게이팅과
//     프리셋/커스텀 모델 값이 올바르게 저장되는지

const assert = require("assert");

const originalConsole = { ...console };
console.log = function () {};
console.info = function () {};
console.warn = function () {};
console.error = function () {};

// ─── DOM 스텁 ─────────────────────────────────────────────────
function createStubElement(id) {
  const classes = new Set();
  const el = {
    id: id || "",
    value: "",
    textContent: "",
    innerHTML: "",
    className: "",
    style: {},
    dataset: {},
    _children: [],
    classList: {
      add(...c) {
        c.forEach((x) => classes.add(x));
      },
      remove(...c) {
        c.forEach((x) => classes.delete(x));
      },
      toggle(c) {
        classes.has(c) ? classes.delete(c) : classes.add(c);
      },
      contains(c) {
        return classes.has(c);
      },
    },
    appendChild(child) {
      el._children.push(child);
    },
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    addEventListener() {},
    getAttribute() {
      return null;
    },
    setAttribute() {},
  };
  return el;
}

const elementIds = [
  "adminPanel",
  "pendingUsersList",
  "allUsersList",
  "adminToast",
  "adminGeminiApiKey",
  "adminOpenAIApiKey",
  "adminGeminiModelSelect",
  "adminGeminiModelCustom",
  "adminOpenAIModelSelect",
  "adminOpenAIModelCustom",
  "modalOpenAIApiKey",
  "modalGeminiApiKey",
  "modalGeminiModelSelect",
  "modalGeminiModelCustom",
  "modalOpenAIModelSelect",
  "modalOpenAIModelCustom",
  "globalApiKeyModal",
  "adminTab-pending",
  "adminTab-all",
  "adminTab-config",
];
const elements = new Map();
elementIds.forEach((id) => elements.set(id, createStubElement(id)));
// 실제 마크업에서 기본적으로 숨김 상태(d-none)인 요소들을 동일하게 초기화한다.
["adminPanel", "globalApiKeyModal", "adminTab-pending", "adminTab-all", "adminTab-config"].forEach(
  (id) => elements.get(id).classList.add("d-none"),
);

const adminTabContents = ["adminTab-pending", "adminTab-all", "adminTab-config"].map(
  (id) => elements.get(id),
);
const adminTabButtons = ["pending", "all", "config"].map((tab) => {
  const el = createStubElement("tabbtn-" + tab);
  el.dataset.tab = tab;
  return el;
});

global.window = global;
global.document = {
  getElementById(id) {
    return elements.has(id) ? elements.get(id) : null;
  },
  querySelectorAll(selector) {
    if (selector === ".admin-tab-content") return adminTabContents;
    if (selector === ".admin-tab-btn") return adminTabButtons;
    return [];
  },
  querySelector(selector) {
    const m = selector.match(/data-tab=['"]([^'"]+)['"]/);
    if (m) return adminTabButtons.find((b) => b.dataset.tab === m[1]) || null;
    return null;
  },
  createElement() {
    return createStubElement();
  },
};

global.sessionStorage = {
  removeItem() {},
};

// ─── Firebase SDK 목 ──────────────────────────────────────────
global.firebase = {
  firestore: { FieldValue: { serverTimestamp: () => "SERVER_TIMESTAMP" } },
};

function makeSnapshot(docs) {
  return {
    empty: docs.length === 0,
    forEach(cb) {
      docs.forEach(cb);
    },
  };
}
function makeQueryDoc(id, data) {
  return { id, data: () => data };
}

const usersStore = new Map(); // uid -> data
function makeUsersCollection() {
  return {
    where(field, op, val) {
      return {
        orderBy() {
          return {
            async get() {
              const entries = Array.from(usersStore.entries()).filter(
                ([, d]) => d[field] === val,
              );
              return makeSnapshot(entries.map(([id, d]) => makeQueryDoc(id, d)));
            },
          };
        },
      };
    },
    orderBy() {
      return {
        async get() {
          const entries = Array.from(usersStore.entries());
          return makeSnapshot(entries.map(([id, d]) => makeQueryDoc(id, d)));
        },
      };
    },
    doc(uid) {
      return {
        async get() {
          return usersStore.has(uid)
            ? { exists: true, data: () => usersStore.get(uid) }
            : { exists: false, data: () => null };
        },
        async update(patch) {
          const cur = usersStore.get(uid) || {};
          usersStore.set(uid, { ...cur, ...patch });
        },
        async delete() {
          usersStore.delete(uid);
        },
      };
    },
  };
}

let globalSettingsDoc = null;
function makeConfigCollection() {
  return {
    doc() {
      return {
        async get() {
          return globalSettingsDoc
            ? { exists: true, data: () => globalSettingsDoc }
            : { exists: false, data: () => null };
        },
        async set(data, opts) {
          if (opts && opts.merge && globalSettingsDoc) {
            globalSettingsDoc = { ...globalSettingsDoc, ...data };
          } else {
            globalSettingsDoc = { ...data };
          }
        },
      };
    },
  };
}

window.firebaseDb = {
  collection(name) {
    if (name === "users") return makeUsersCollection();
    if (name === "config") return makeConfigCollection();
    throw new Error("unexpected collection: " + name);
  },
};

const ADMIN_SELF_UID = "admin_self_uid";
window.firebaseAuth = {
  currentUser: {
    uid: ADMIN_SELF_UID,
    async getIdToken() {
      return "FAKE_TOKEN";
    },
  },
};

const toastMessages = [];
window.showToast = function (msg) {
  toastMessages.push(msg);
};

let nextConfirmResult = true;
const confirmPrompts = [];
window.showConfirmAsync = async function (msg) {
  confirmPrompts.push(msg);
  return nextConfirmResult;
};

const fetchCalls = [];
let nextFetchResponse = { ok: true, status: 200, json: async () => ({}) };
global.fetch = async function (url, opts) {
  fetchCalls.push({ url, opts });
  return nextFetchResponse;
};

require("../js/admin.js");

(async () => {
  // ═══════════════════════════════════════════════════════════════
  // 1. 관리자 권한 게이트
  // ═══════════════════════════════════════════════════════════════
  window.currentUserData = { uid: "u1", role: "user" };
  toastMessages.length = 0;
  window.openAdminPanel();
  assert.strictEqual(
    elements.get("adminPanel").classList.contains("d-none"),
    true,
    "일반 사용자는 관리자 패널이 열리지 않아야 함(d-none 유지)",
  );
  assert.ok(
    toastMessages.some((m) => m.includes("관리자 권한")),
    "일반 사용자에게 권한 부족 토스트를 표시해야 함",
  );

  // ═══════════════════════════════════════════════════════════════
  // 2. 사용자 카드 렌더링: 자기 자신 보호 / 상태별 액션 버튼
  // ═══════════════════════════════════════════════════════════════
  usersStore.set(ADMIN_SELF_UID, {
    name: "나",
    email: "self@example.com",
    role: "admin",
    approved: true,
  });
  usersStore.set("pending_uid", {
    name: "대기자",
    email: "pending@example.com",
    role: "user",
    approved: false,
  });
  usersStore.set("approved_user_uid", {
    name: "승인유저",
    email: "approved@example.com",
    role: "user",
    approved: true,
  });
  usersStore.set("approved_admin_uid", {
    name: "다른관리자",
    email: "otheradmin@example.com",
    role: "admin",
    approved: true,
  });

  window.currentUserData = { uid: ADMIN_SELF_UID, role: "admin" };
  window.openAdminPanel();
  // loadPendingUsers/loadAllUsers는 async 함수이므로 마이크로태스크가 처리될 시간을 준다.
  await new Promise((r) => setTimeout(r, 20));

  assert.strictEqual(
    elements.get("adminPanel").classList.contains("d-none"),
    false,
    "관리자는 패널이 열려야 함",
  );

  const pendingCards = elements.get("pendingUsersList")._children;
  assert.strictEqual(pendingCards.length, 1, "승인 대기 목록에는 대기자 1명만 표시");
  assert.ok(
    pendingCards[0].innerHTML.includes("approveUser('pending_uid')"),
    "대기자 카드에 승인 버튼이 있어야 함",
  );
  assert.ok(
    pendingCards[0].innerHTML.includes("rejectUser('pending_uid')"),
    "대기자 카드에 거절 버튼이 있어야 함",
  );

  const allCards = elements.get("allUsersList")._children;
  assert.strictEqual(allCards.length, 4, "전체 목록에는 4명이 표시되어야 함");

  const selfCardHtml = allCards
    .map((c) => c.innerHTML)
    .find((html) => html.includes("self@example.com"));
  assert.ok(selfCardHtml.includes("내 계정"), "자기 자신 카드는 조작 버튼 대신 안내 문구만 표시");
  assert.ok(
    !selfCardHtml.includes("revokeUser") && !selfCardHtml.includes("demoteAdmin"),
    "자기 자신 카드에는 조작 버튼(action)이 없어야 함",
  );

  const approvedUserHtml = allCards
    .map((c) => c.innerHTML)
    .find((html) => html.includes("approved@example.com"));
  assert.ok(
    approvedUserHtml.includes("revokeUser('approved_user_uid')"),
    "승인된 일반 유저는 승인 취소 버튼",
  );
  assert.ok(
    approvedUserHtml.includes("makeAdmin('approved_user_uid')"),
    "일반 유저는 관리자 지정 버튼",
  );

  const otherAdminHtml = allCards
    .map((c) => c.innerHTML)
    .find((html) => html.includes("otheradmin@example.com"));
  assert.ok(
    otherAdminHtml.includes("demoteAdmin('approved_admin_uid')"),
    "다른 관리자는 일반 회원 강등 버튼이 있어야 함",
  );
  assert.ok(
    !otherAdminHtml.includes("makeAdmin("),
    "이미 관리자인 유저에게 관리자 지정 버튼은 없어야 함",
  );

  // ═══════════════════════════════════════════════════════════════
  // 3. approveUser: 확인 취소 시 아무 것도 실행되지 않음
  // ═══════════════════════════════════════════════════════════════
  nextConfirmResult = false;
  toastMessages.length = 0;
  await window.approveUser("pending_uid");
  assert.strictEqual(
    usersStore.get("pending_uid").approved,
    false,
    "확인을 취소하면 승인 상태가 바뀌지 않아야 함",
  );

  // 확인 시 정상 승인
  nextConfirmResult = true;
  await window.approveUser("pending_uid");
  assert.strictEqual(
    usersStore.get("pending_uid").approved,
    true,
    "확인 후 승인 상태로 변경되어야 함",
  );
  assert.strictEqual(elements.get("adminToast").textContent, "✅ 사용자를 승인했습니다.");

  // ═══════════════════════════════════════════════════════════════
  // 4. revokeUser / makeAdmin / demoteAdmin
  // ═══════════════════════════════════════════════════════════════
  await window.revokeUser("pending_uid");
  assert.strictEqual(usersStore.get("pending_uid").approved, false, "승인 취소 반영");

  await window.makeAdmin("approved_user_uid");
  assert.strictEqual(usersStore.get("approved_user_uid").role, "admin", "관리자 지정 반영");
  assert.strictEqual(
    usersStore.get("approved_user_uid").approved,
    true,
    "관리자 지정 시 승인 상태도 true로 보정",
  );

  await window.demoteAdmin("approved_admin_uid");
  assert.strictEqual(usersStore.get("approved_admin_uid").role, "user", "일반 회원 강등 반영");

  // ═══════════════════════════════════════════════════════════════
  // 5. rejectUser: Firestore 삭제 + Auth 비활성화 API 호출
  // ═══════════════════════════════════════════════════════════════
  usersStore.set("reject_uid", {
    name: "거절대상",
    email: "reject@example.com",
    role: "user",
    approved: false,
  });
  fetchCalls.length = 0;
  toastMessages.length = 0;
  nextFetchResponse = { ok: true, status: 200, json: async () => ({}) };
  await window.rejectUser("reject_uid");
  assert.ok(!usersStore.has("reject_uid"), "거절 시 Firestore 문서가 삭제되어야 함");
  assert.strictEqual(fetchCalls.length, 1, "Auth 비활성화 API가 호출되어야 함");
  assert.strictEqual(fetchCalls[0].url, "/api/admin/disable");
  assert.strictEqual(fetchCalls[0].opts.headers.Authorization, "Bearer FAKE_TOKEN");
  const disableBody = JSON.parse(fetchCalls[0].opts.body);
  assert.deepStrictEqual(disableBody, { uid: "reject_uid", disabled: true });
  assert.strictEqual(
    elements.get("adminToast").textContent,
    "🗑️ 사용자를 삭제하고 로그인도 차단했습니다.",
  );

  // 비활성화 API가 실패해도 문서 삭제 자체는 이미 반영되어 있고, 경고 토스트가 떠야 함
  usersStore.set("reject_uid2", {
    name: "거절대상2",
    email: "reject2@example.com",
    role: "user",
    approved: false,
  });
  nextFetchResponse = {
    ok: false,
    status: 500,
    json: async () => ({ error: "internal" }),
  };
  await window.rejectUser("reject_uid2");
  assert.ok(!usersStore.has("reject_uid2"), "비활성화 API 실패와 무관하게 문서는 삭제됨");
  assert.ok(
    elements.get("adminToast").textContent.includes("로그인 차단에 실패"),
    "비활성화 실패 시 경고 토스트를 표시해야 함",
  );

  // ═══════════════════════════════════════════════════════════════
  // 6. 탭 전환 → config 탭에서 전역 설정 로드 (프리셋/커스텀 모델)
  // ═══════════════════════════════════════════════════════════════
  globalSettingsDoc = {
    gemini_api_key: "gk_123",
    openai_api_key: "ok_456",
    gemini_model: "gemini-2.5-flash", // 프리셋
    openai_model: "gpt-custom-mini", // 커스텀(허용 목록에 없음)
  };
  window.switchAdminTab("config");
  await new Promise((r) => setTimeout(r, 20));

  assert.strictEqual(
    elements.get("adminTab-config").classList.contains("d-none"),
    false,
    "config 탭 콘텐츠가 표시되어야 함",
  );
  assert.strictEqual(
    elements.get("adminTab-pending").classList.contains("d-none"),
    true,
    "다른 탭 콘텐츠는 숨겨져야 함",
  );
  assert.strictEqual(elements.get("adminGeminiApiKey").value, "gk_123");
  assert.strictEqual(elements.get("adminOpenAIApiKey").value, "ok_456");
  assert.strictEqual(
    elements.get("adminGeminiModelSelect").value,
    "gemini-2.5-flash",
    "프리셋 모델은 select에 그대로 반영",
  );
  assert.strictEqual(
    elements.get("adminGeminiModelCustom").classList.contains("d-none"),
    true,
    "프리셋 모델이면 커스텀 입력창은 숨김",
  );
  assert.strictEqual(
    elements.get("adminOpenAIModelSelect").value,
    "custom",
    "허용 목록에 없는 모델은 select가 custom으로 전환",
  );
  assert.strictEqual(
    elements.get("adminOpenAIModelCustom").classList.contains("d-none"),
    false,
    "커스텀 모델이면 커스텀 입력창이 노출되어야 함",
  );
  assert.strictEqual(elements.get("adminOpenAIModelCustom").value, "gpt-custom-mini");

  // ═══════════════════════════════════════════════════════════════
  // 7. saveGlobalSettings: 확인 게이팅 + 프리셋/커스텀 값 저장
  // ═══════════════════════════════════════════════════════════════
  elements.get("adminGeminiApiKey").value = "new_gemini_key";
  elements.get("adminOpenAIApiKey").value = "new_openai_key";
  elements.get("adminGeminiModelSelect").value = "custom";
  elements.get("adminGeminiModelCustom").value = "gemini-custom-9000";
  elements.get("adminOpenAIModelSelect").value = "gpt-4o";

  nextConfirmResult = false;
  const beforeSave = { ...globalSettingsDoc };
  await window.saveGlobalSettings();
  assert.deepStrictEqual(
    globalSettingsDoc,
    beforeSave,
    "확인을 취소하면 전역 설정이 변경되지 않아야 함",
  );

  nextConfirmResult = true;
  await window.saveGlobalSettings();
  assert.strictEqual(globalSettingsDoc.gemini_api_key, "new_gemini_key");
  assert.strictEqual(globalSettingsDoc.openai_api_key, "new_openai_key");
  assert.strictEqual(
    globalSettingsDoc.gemini_model,
    "gemini-custom-9000",
    "커스텀 모델 입력값이 그대로 저장되어야 함",
  );
  assert.strictEqual(globalSettingsDoc.openai_model, "gpt-4o");
  assert.strictEqual(globalSettingsDoc.updatedBy, ADMIN_SELF_UID);

  // ═══════════════════════════════════════════════════════════════
  // 8. saveGlobalApiKeyModal: 저장 성공 시 모달을 닫고 disabled 락 해제
  // ═══════════════════════════════════════════════════════════════
  elements.get("modalOpenAIApiKey").value = "modal_openai_key";
  elements.get("modalGeminiApiKey").value = "modal_gemini_key";
  elements.get("modalGeminiModelSelect").value = "gemini-2.0-flash";
  elements.get("modalOpenAIModelSelect").value = "o1";
  elements.get("globalApiKeyModal").classList.remove("d-none");

  nextConfirmResult = true;
  await window.saveGlobalApiKeyModal();
  assert.strictEqual(globalSettingsDoc.openai_api_key, "modal_openai_key");
  assert.strictEqual(globalSettingsDoc.gemini_api_key, "modal_gemini_key");
  assert.strictEqual(
    elements.get("globalApiKeyModal").classList.contains("d-none"),
    true,
    "저장 성공 시 모달이 닫혀야 함",
  );

  originalConsole.log("MV admin panel smoke test: PASS");
  process.exit(0);
})().catch((err) => {
  originalConsole.error(err);
  process.exit(1);
});
