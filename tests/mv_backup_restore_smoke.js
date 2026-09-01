// app.js의 백업/복원(backupFullProgram / handleImport) 자동화 테스트
//
// 이 두 함수에는 지금까지 자동화 테스트가 전혀 없었다. 특히 handleImport는
// 과거 "새 프로젝트 저장 경로가 quota 오류 시 catch에서 전체 배열을
// 방금 가져온 프로젝트 1개로 덮어써 기존 프로젝트가 전부 사라지는"
// 데이터 손실 버그가 있었던 자리라(이번 세션에서 수정됨), 회귀 방지를
// 위해 반드시 커버해야 한다.
//
// app.js는 거대한 단일 파일이라 통째로 require할 수 없으므로, 기존
// mv_restore_step6_smoke.js와 동일한 패턴으로 LEGACY_PROJECT_STORAGE_KEYS
// 선언부터 backupFullProgram 끝까지를 vm.runInThisContext로 실행한다.

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const originalConsole = { ...console };
console.log = function () {};
console.warn = function () {};
console.error = function () {};

// ─── DOM/브라우저 API 스텁 ────────────────────────────────────
function createStubElement(id) {
  const classes = new Set();
  return {
    id: id || "",
    value: "",
    textContent: "",
    innerHTML: "",
    href: "",
    download: "",
    style: {},
    classList: {
      add(...c) {
        c.forEach((x) => classes.add(x));
      },
      remove(...c) {
        c.forEach((x) => classes.delete(x));
      },
      contains(c) {
        return classes.has(c);
      },
    },
    click() {},
  };
}

let lastCreatedAnchor = null;
global.window = global;
global.document = {
  getElementById() {
    return null;
  },
  createElement(tag) {
    const el = createStubElement();
    if (tag === "a") lastCreatedAnchor = el;
    return el;
  },
  querySelector() {
    return null;
  },
  body: {
    appendChild() {},
    removeChild() {},
  },
  addEventListener() {},
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
  get length() {
    return Object.keys(store).length;
  },
  key(i) {
    return Object.keys(store)[i] || null;
  },
};

global.alert = function (msg) {
  throw new Error("Unexpected alert: " + msg);
};
global.matchMedia = () => ({ matches: false, addListener() {}, addEventListener() {} });
global.navigator = { userAgent: "node-test" };
global.addEventListener = function () {};
global.removeEventListener = function () {};
global.ResizeObserver = function () {
  return { observe() {}, disconnect() {} };
};

let lastBlobParts = null;
global.Blob = function (parts, opts) {
  lastBlobParts = parts;
  this.type = opts && opts.type;
};
global.URL = {
  createObjectURL() {
    return "blob:fake-url";
  },
  revokeObjectURL() {},
};

// ─── FileReader 목 (handleImport용) ───────────────────────────
global.FileReader = function () {
  this.onload = null;
  this.onerror = null;
};
global.FileReader.prototype.readAsText = function (file) {
  const self = this;
  setTimeout(() => {
    if (file.__shouldError) {
      if (self.onerror) self.onerror();
      return;
    }
    if (self.onload) self.onload({ target: { result: file.__content } });
  }, 0);
};

let nextConfirmResult = true;
const confirmPrompts = [];
window.showConfirmAsync = async (msg) => {
  confirmPrompts.push(msg);
  return nextConfirmResult;
};

const toastMessages = [];
window.showToast = (msg) => toastMessages.push(msg);

// ─── app.js 슬라이스 로드 (LEGACY_PROJECT_STORAGE_KEYS ~ backupFullProgram 끝) ───
const appSource = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
const sliceStart = appSource.indexOf("const LEGACY_PROJECT_STORAGE_KEYS = [");
const sliceEnd = appSource.indexOf("// 단계 초기화 함수들", sliceStart);
assert.ok(sliceStart !== -1, "LEGACY_PROJECT_STORAGE_KEYS 선언을 찾을 수 없음");
assert.ok(sliceEnd !== -1, "슬라이스 끝 지점을 찾을 수 없음");
vm.runInThisContext(appSource.slice(sliceStart, sliceEnd), {
  filename: "app.js.backup-import-slice",
});

// window.loadProjectList / window.showCopyIndicator는 이 슬라이스 안에서
// 실제 구현으로 다시 정의되므로(top-level 할당문이라 로드 시 즉시 실행됨),
// 반드시 vm.runInThisContext 이후에 목으로 덮어써야 한다.
toastMessages.length = 0;
window.showCopyIndicator = (msg) => toastMessages.push(msg);
let loadProjectListCalls = 0;
window.loadProjectList = () => {
  loadProjectListCalls++;
};

assert.strictEqual(typeof window.handleImport, "function");
assert.strictEqual(typeof window.backupFullProgram, "function");

function makeImportEvent(content) {
  let clearedValue = null;
  const target = {
    files: [{ __content: JSON.stringify(content) }],
    set value(v) {
      clearedValue = v;
    },
    get value() {
      return clearedValue;
    },
  };
  return { target };
}

(async () => {
  // ═══════════════════════════════════════════════════════════════
  // 1. backupFullProgram: 프로젝트/설정/기타 데이터 수집, 민감 키 제외
  // ═══════════════════════════════════════════════════════════════
  store.musicCreatorProjects = JSON.stringify([{ id: "p1", title: "곡1" }]);
  store.savedProjects = JSON.stringify([{ id: "p1", title: "곡1" }]);
  store.mvSettings = JSON.stringify({ minutes: "3" });
  store.someOtherAppKey = JSON.stringify({ foo: "bar" });
  store["firebase:authUser:XYZ"] = "SENSITIVE_SESSION_TOKEN";
  store["openai_api_key"] = "sk-should-not-leak";
  store["gemini_api_key"] = "gk-should-not-leak";

  toastMessages.length = 0;
  lastBlobParts = null;
  lastCreatedAnchor = null;
  window.backupFullProgram();

  assert.ok(lastBlobParts, "Blob이 생성되어야 함");
  const backup = JSON.parse(lastBlobParts[0]);
  assert.strictEqual(backup.backupVersion, "1.0");
  assert.deepStrictEqual(backup.projects.musicCreatorProjects, [{ id: "p1", title: "곡1" }]);
  assert.strictEqual(backup.settings.mvSettings, JSON.stringify({ minutes: "3" }));
  assert.deepStrictEqual(backup.other.someOtherAppKey, { foo: "bar" });
  assert.ok(
    !("firebase:authUser:XYZ" in backup.other),
    "firebase 세션 키는 백업 파일에 절대 포함되면 안 됨",
  );
  assert.ok(
    !("openai_api_key" in backup.other) && !("gemini_api_key" in backup.other),
    "API 키는 백업 파일에 절대 포함되면 안 됨",
  );
  assert.ok(lastCreatedAnchor.download.startsWith("music-creator-full-backup-"));
  assert.ok(toastMessages.some((m) => m.includes("전체 프로그램 백업")));

  // ═══════════════════════════════════════════════════════════════
  // 2. handleImport: 유효하지 않은 형식은 조용히 거부
  // ═══════════════════════════════════════════════════════════════
  toastMessages.length = 0;
  window.handleImport(makeImportEvent({ notAValidBackup: true }));
  await new Promise((r) => setTimeout(r, 10));
  assert.ok(
    toastMessages.some((m) => m.includes("유효하지 않은 가져오기 파일 형식")),
    "알 수 없는 형식은 오류 안내",
  );

  // ═══════════════════════════════════════════════════════════════
  // 3. handleImport: 확인 취소 시 아무 것도 가져오지 않음
  // ═══════════════════════════════════════════════════════════════
  store.musicCreatorProjects = JSON.stringify([]);
  nextConfirmResult = false;
  window.handleImport(makeImportEvent([{ id: "new_p1", title: "새 프로젝트" }]));
  await new Promise((r) => setTimeout(r, 10));
  assert.strictEqual(
    JSON.parse(store.musicCreatorProjects).length,
    0,
    "확인 취소 시 프로젝트가 추가되지 않아야 함",
  );

  // ═══════════════════════════════════════════════════════════════
  // 4. handleImport: 정상 가져오기 - 기존 프로젝트를 보존하며 새 항목 추가
  //    (★ 회귀 방지: quota 초과가 아닌 정상 상황에서도 기존 프로젝트가
  //    사라지지 않는지 확인)
  // ═══════════════════════════════════════════════════════════════
  store.musicCreatorProjects = JSON.stringify([
    { id: "existing_p1", title: "기존 프로젝트1" },
    { id: "existing_p2", title: "기존 프로젝트2" },
  ]);
  nextConfirmResult = true;
  loadProjectListCalls = 0;
  toastMessages.length = 0;
  window.handleImport(makeImportEvent([{ id: "brand_new_p3", title: "새 프로젝트3" }]));
  await new Promise((r) => setTimeout(r, 10));

  const afterImport = JSON.parse(store.musicCreatorProjects);
  assert.strictEqual(afterImport.length, 3, "기존 2개 + 신규 1개 = 3개가 보존되어야 함");
  assert.ok(afterImport.some((p) => p.id === "existing_p1"), "기존 프로젝트1이 보존되어야 함");
  assert.ok(afterImport.some((p) => p.id === "existing_p2"), "기존 프로젝트2가 보존되어야 함");
  assert.ok(afterImport.some((p) => p.id === "brand_new_p3"), "새 프로젝트가 추가되어야 함");
  assert.ok(toastMessages.some((m) => m.includes("새로 가져온 프로젝트: 1개")));
  assert.strictEqual(loadProjectListCalls, 1, "가져오기 후 프로젝트 목록을 새로고침해야 함");

  // ═══════════════════════════════════════════════════════════════
  // 5. handleImport: 기존 ID와 겹치면 덮어쓰기(업데이트)로 집계
  // ═══════════════════════════════════════════════════════════════
  toastMessages.length = 0;
  window.handleImport(
    makeImportEvent([{ id: "existing_p1", title: "기존 프로젝트1 (수정됨)" }]),
  );
  await new Promise((r) => setTimeout(r, 10));
  const afterUpdate = JSON.parse(store.musicCreatorProjects);
  assert.strictEqual(afterUpdate.length, 3, "업데이트는 개수를 늘리지 않아야 함");
  const updated = afterUpdate.find((p) => p.id === "existing_p1");
  assert.strictEqual(updated.title, "기존 프로젝트1 (수정됨)");
  assert.ok(toastMessages.some((m) => m.includes("업데이트된 프로젝트: 1개")));

  // ═══════════════════════════════════════════════════════════════
  // 6. handleImport: saveProjectListToLocalStorage 저장 실패 시
  //    (★ 회귀 방지) 기존 프로젝트 목록은 그대로 보존되고 오류로만 집계됨
  // ═══════════════════════════════════════════════════════════════
  store.musicCreatorProjects = JSON.stringify([
    { id: "keep_me_1", title: "보존되어야 할 프로젝트" },
  ]);
  window.saveProjectListToLocalStorage = function () {
    // 실무에서는 거의 항상 QuotaExceededError로 인한 실패를 흉내낸다.
    return { ok: false };
  };
  toastMessages.length = 0;
  window.handleImport(makeImportEvent([{ id: "wont_fit", title: "용량 부족으로 실패할 프로젝트" }]));
  await new Promise((r) => setTimeout(r, 10));

  const afterFailedSave = JSON.parse(store.musicCreatorProjects);
  assert.strictEqual(afterFailedSave.length, 1, "저장 실패 시에도 기존 프로젝트 목록 전체가 보존되어야 함");
  assert.strictEqual(afterFailedSave[0].id, "keep_me_1");
  assert.ok(toastMessages.some((m) => m.includes("오류 발생: 1개")));
  delete window.saveProjectListToLocalStorage;

  // ═══════════════════════════════════════════════════════════════
  // 7. handleImport: 전체 프로그램 백업 형식(backupFullProgram의 산출물) 왕복
  // ═══════════════════════════════════════════════════════════════
  store.musicCreatorProjects = JSON.stringify([]);
  store.savedProjects = JSON.stringify([]);
  store.sunoLyricsHistory = JSON.stringify([]);
  store.stylePromptHistory = JSON.stringify([]);
  const fullBackupPayload = {
    backupVersion: "1.0",
    projects: {
      musicCreatorProjects: [{ id: "restored_p1", title: "복원된 프로젝트" }],
    },
    settings: {
      mvSettings: JSON.stringify({ minutes: "5" }),
      // 허용 목록에 없는 임의 키는 무시되어야 함 (보안: 임의 localStorage 키 주입 차단)
      maliciousKey: "should-not-be-restored",
    },
    other: {
      // other는 절대 복원되면 안 됨
      "firebase:authUser:INJECTED": "attacker-controlled-session",
    },
  };
  nextConfirmResult = true;
  window.handleImport(makeImportEvent(fullBackupPayload));
  await new Promise((r) => setTimeout(r, 10));

  const restoredProjects = JSON.parse(store.musicCreatorProjects);
  assert.strictEqual(restoredProjects.length, 1);
  assert.strictEqual(restoredProjects[0].id, "restored_p1");
  assert.strictEqual(store.mvSettings, JSON.stringify({ minutes: "5" }));
  assert.strictEqual(
    store.maliciousKey,
    undefined,
    "허용 목록(IMPORT_SETTING_ALLOWLIST)에 없는 설정 키는 복원되면 안 됨",
  );
  assert.strictEqual(
    store["firebase:authUser:INJECTED"],
    undefined,
    "importData.other는 절대 복원되면 안 됨 (임의 키 주입 차단)",
  );

  // ═══════════════════════════════════════════════════════════════
  // 8. handleImport: 파일 읽기 오류
  // ═══════════════════════════════════════════════════════════════
  toastMessages.length = 0;
  window.handleImport({ target: { files: [{ __shouldError: true }] } });
  await new Promise((r) => setTimeout(r, 10));
  assert.ok(toastMessages.some((m) => m.includes("파일을 읽는 중 오류가 발생했습니다")));

  originalConsole.log("MV backup/restore smoke test: PASS");
  process.exit(0);
})().catch((err) => {
  originalConsole.error(err);
  process.exit(1);
});
