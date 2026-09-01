// js/cloud-sync-ui.js 스모크 테스트
//
// 클라우드 동기화/복원/히스토리 모달 UI(js/cloud-sync-ui.js)에는 지금까지
// 자동화 테스트가 전혀 없었다. 이 파일은 top-level 함수 선언들이
// window.* 로 노출되지 않고 브라우저 전역 스크립트 스코프에만 존재하므로
// (require()로는 접근 불가) 기존 MV 모듈 테스트들과 동일하게
// vm.runInThisContext로 실제 전역 스코프에 로드한다.
//
// 실제 체크박스 DOM 트리 대신, 프로덕션 코드가 사용하는
// document.querySelectorAll 선택자 패턴(.data-cs-upload-idx 등)만
// 최소로 흉내낸 "체크박스 레지스트리"를 사용해 사용자가 항목을
// 선택/해제한 상태를 재현한다. innerHTML로 렌더링되는 카드 내용은
// (admin.js 테스트와 동일하게) 문자열 내용을 직접 검사한다.

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const originalConsole = { ...console };
console.log = function () {};
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
    className: "",
    style: {},
    dataset: {},
    checked: false,
    disabled: false,
    classList: {
      add(...c) {
        c.forEach((x) => classes.add(x));
      },
      remove(...c) {
        c.forEach((x) => classes.delete(x));
      },
      toggle(c, force) {
        if (force === undefined) {
          classes.has(c) ? classes.delete(c) : classes.add(c);
        } else if (force) {
          classes.add(c);
        } else {
          classes.delete(c);
        }
      },
      contains(c) {
        return classes.has(c);
      },
    },
  };
}

const elementIds = [
  "cloudSyncModal",
  "cloudAutoSyncToggle",
  "csTabUpload",
  "csTabDownload",
  "csUploadPanel",
  "csDownloadPanel",
  "cloudSyncModalFooter",
  "csUploadProjectList",
  "csDownloadProjectList",
  "csUploadSelectAll",
  "csDownloadSelectAll",
  "csUploadCountLabel",
  "csDownloadCountLabel",
  "csUploadBtn",
  "csDownloadBtn",
  "restoreModal",
  "restoreTabCloud",
  "restoreTabLocal",
  "restoreTabCross",
  "restoreCloudTab",
  "restoreLocalTab",
  "restoreCrossTab",
  "restoreModalFooter",
  "restoreCloudProjectList",
  "restoreLocalPreviewList",
  "restoreLocalEmpty",
  "localRestoreSelectAll",
  "localRestoreCount",
  "localRestoreImportBtn",
  "crossAccountEmail",
  "crossAccountPw",
  "crossAccountError",
  "crossAccountProjectList",
  "crossAccountFetchBtn",
  "crossSelectAll",
  "crossCount",
  "crossImportBtn",
  "historyModalProjectTitle",
  "historyList",
  "cloudHistoryModal",
];
const elements = new Map();
elementIds.forEach((id) => elements.set(id, createStubElement(id)));
// 실제 마크업 기본 숨김 상태 반영
["cloudSyncModal", "restoreModal", "cloudHistoryModal"].forEach((id) =>
  elements.get(id).classList.add("sync-modal-hidden"),
);

// ─── 체크박스 레지스트리 (data-* 선택자만 최소 흉내) ─────────
let checkboxRegistry = [];
function resetCheckboxRegistry() {
  checkboxRegistry = [];
}
function addCheckbox(kind, dataset, checked) {
  const cb = createStubElement();
  cb.dataset = dataset;
  cb.checked = checked;
  cb._kind = kind;
  checkboxRegistry.push(cb);
  return cb;
}

global.window = global;
global.document = {
  getElementById(id) {
    return elements.has(id) ? elements.get(id) : null;
  },
  querySelectorAll(selector) {
    const wantsChecked = selector.includes(":checked");
    let kind = null;
    if (selector.includes("cs-upload-idx")) kind = "cs-upload";
    else if (selector.includes("cs-dl-idx")) kind = "cs-dl";
    else if (selector.includes("restoreLocalPreviewList")) kind = "local-restore";
    else if (selector.includes("cross-idx")) kind = "cross";
    return checkboxRegistry.filter(
      (cb) => cb._kind === kind && (!wantsChecked || cb.checked === true),
    );
  },
};

const localStore = {};
global.localStorage = {
  getItem: (k) => (k in localStore ? localStore[k] : null),
  setItem: (k, v) => {
    localStore[k] = String(v);
  },
  removeItem: (k) => {
    delete localStore[k];
  },
};

// ─── FileReader 목 (handleRestoreLocalFile용) ─────────────────
global.FileReader = function () {
  this.onload = null;
};
global.FileReader.prototype.readAsText = function (file) {
  const self = this;
  setTimeout(() => {
    if (self.onload) self.onload({ target: { result: file.__content } });
  }, 0);
};

// ─── Firebase / 앱 헬퍼 목 ────────────────────────────────────
window.firebaseAuth = { currentUser: null };

let nextUploadShouldFailFor = new Set();
const uploadedProjects = new Map(); // uid -> Map(id -> data)
window.firebaseDb = {
  collection(name) {
    if (name !== "users") throw new Error("unexpected collection: " + name);
    return {
      doc(uid) {
        return {
          collection(sub) {
            if (sub !== "projects") throw new Error("unexpected subcollection: " + sub);
            return {
              doc(id) {
                return {
                  async set(data) {
                    if (nextUploadShouldFailFor.has(String(id))) {
                      throw new Error("simulated upload failure: " + id);
                    }
                    if (!uploadedProjects.has(uid)) uploadedProjects.set(uid, new Map());
                    uploadedProjects.get(uid).set(String(id), data);
                  },
                };
              },
            };
          },
        };
      },
    };
  },
};

const toastMessages = [];
window.showToast = (msg) => toastMessages.push(msg);

let nextConfirmResult = true;
window.showConfirmAsync = async () => nextConfirmResult;

let nextCloudProjects = [];
window.getAllCloudProjects = async () => nextCloudProjects;

const downloadCalls = [];
let nextDownloadCount = 0;
window.downloadSelectedCloudProjects = async (ids) => {
  downloadCalls.push(ids);
  return nextDownloadCount;
};

let nextAnalyzeResult = null;
window.analyzeIncomingProjects = (projects) =>
  nextAnalyzeResult || projects.map((p) => ({ ...p, _mergeStatus: "new" }));

const smartMergeCalls = [];
let nextMergeResult = { newCount: 0, updateCount: 0 };
window.smartMergeToLocal = (list) => {
  smartMergeCalls.push(list);
  return nextMergeResult;
};

let nextFetchOtherAccountResult = null; // { ok:true, projects } 또는 { ok:false, message }
window.fetchProjectsFromOtherAccount = async (email, pw) => {
  if (nextFetchOtherAccountResult && !nextFetchOtherAccountResult.ok) {
    throw new Error(nextFetchOtherAccountResult.message);
  }
  return (nextFetchOtherAccountResult && nextFetchOtherAccountResult.projects) || [];
};

let nextHistoryList = [];
window.getCloudBackupHistory = async () => nextHistoryList;

const restoreHistoryCalls = [];
let nextRestoreHistoryResult = true;
window.restoreFromCloudHistory = async (projectId, historyDocId) => {
  restoreHistoryCalls.push([projectId, historyDocId]);
  return nextRestoreHistoryResult;
};

// ─── 파일 로드 (vm.runInThisContext — 기존 MV 모듈 테스트와 동일 패턴) ───
const source = fs.readFileSync(
  path.resolve(__dirname, "../js/cloud-sync-ui.js"),
  "utf8",
);
vm.runInThisContext(source, { filename: "js/cloud-sync-ui.js" });

(async () => {
  // ═══════════════════════════════════════════════════════════════
  // 1. 순수 유틸 함수
  // ═══════════════════════════════════════════════════════════════
  assert.strictEqual(window.formatDateTimeKo(null), "날짜 없음");
  assert.strictEqual(window.formatDateTimeKo("2026-03-05T09:07:00.000Z") !== "", true);
  assert.strictEqual(window.relativeTime(null), "");
  assert.strictEqual(window.relativeTime(new Date().toISOString()), "방금 전");
  assert.strictEqual(
    window.escapeHtmlStr(`<script>"'&`),
    "&lt;script&gt;&quot;&#039;&amp;",
  );
  assert.strictEqual(window.escapeHtmlStr(""), "");

  // ═══════════════════════════════════════════════════════════════
  // 2. 자동 동기화 설정
  // ═══════════════════════════════════════════════════════════════
  assert.strictEqual(window.getCloudAutoSync(), true, "기본값은 true");
  window.setCloudAutoSync(false);
  assert.strictEqual(window.getCloudAutoSync(), false);
  assert.strictEqual(elements.get("cloudAutoSyncToggle").checked, false);
  window.setCloudAutoSync(true);
  assert.strictEqual(window.getCloudAutoSync(), true);

  // ═══════════════════════════════════════════════════════════════
  // 3. 클라우드 동기화 모달 열기/탭 전환/업로드 목록 렌더링
  // ═══════════════════════════════════════════════════════════════
  localStorage.setItem(
    "musicCreatorProjects",
    JSON.stringify([
      { id: "old1", title: "오래된 곡", savedAt: "2026-01-01T00:00:00.000Z", lastStep: 2 },
      { id: "new1", title: "최신 곡", savedAt: "2026-06-01T00:00:00.000Z", lastStep: 4 },
    ]),
  );
  nextCloudProjects = [{ id: "new1", title: "최신 곡", savedAt: "2026-06-01T00:00:00.000Z" }];

  await window.openCloudSyncModal();
  await new Promise((r) => setTimeout(r, 10)); // getAllCloudProjects().then() 재렌더 대기

  assert.strictEqual(
    elements.get("cloudSyncModal").classList.contains("sync-modal-hidden"),
    false,
    "모달이 열려야 함",
  );
  assert.strictEqual(elements.get("csTabUpload").classList.contains("active"), true);
  assert.strictEqual(elements.get("csUploadPanel").classList.contains("sync-modal-hidden"), false);
  assert.strictEqual(elements.get("csDownloadPanel").classList.contains("sync-modal-hidden"), true);

  const uploadHtml = elements.get("csUploadProjectList").innerHTML;
  // savedAt 내림차순 정렬: "최신 곡"이 "오래된 곡"보다 먼저 나와야 함
  assert.ok(uploadHtml.indexOf("최신 곡") < uploadHtml.indexOf("오래된 곡"), "최신순 정렬 확인");
  assert.ok(uploadHtml.includes("동기화됨"), "클라우드에 있는 프로젝트는 동기화됨 배지");
  assert.ok(uploadHtml.includes("미동기화"), "클라우드에 없는 프로젝트는 미동기화 배지");
  assert.strictEqual(
    elements.get("cloudSyncModalFooter").innerHTML.includes('id="csUploadBtn"'),
    true,
  );

  window.switchCloudSyncTab("download");
  assert.strictEqual(elements.get("csTabDownload").classList.contains("active"), true);
  assert.strictEqual(elements.get("csDownloadPanel").classList.contains("sync-modal-hidden"), false);

  window.closeCloudSyncModal();
  assert.strictEqual(elements.get("cloudSyncModal").classList.contains("sync-modal-hidden"), true);

  // ═══════════════════════════════════════════════════════════════
  // 4. doCsUpload: 미로그인 시 업로드 차단
  // ═══════════════════════════════════════════════════════════════
  resetCheckboxRegistry();
  addCheckbox("cs-upload", { csUploadIdx: "0" }, true);
  toastMessages.length = 0;
  window.firebaseAuth.currentUser = null;
  await window.doCsUpload();
  assert.ok(
    toastMessages.some((m) => m.includes("로그인 후 이용 가능")),
    "미로그인 상태에서는 업로드가 차단되어야 함",
  );
  assert.strictEqual(uploadedProjects.size, 0, "미로그인 상태에서는 Firestore에 아무 것도 쓰지 않아야 함");

  // ═══════════════════════════════════════════════════════════════
  // 5. doCsUpload: 정상 업로드 + 부분 실패해도 나머지는 계속 진행
  // ═══════════════════════════════════════════════════════════════
  window.firebaseAuth.currentUser = { uid: "uploader_uid" };
  // renderCsUploadList가 채운 _csLocalProjects를 재사용하도록 목록을 다시 렌더링
  window.switchCloudSyncTab("upload"); // renderCsUploadList() 재호출 -> _csLocalProjects 최신화
  resetCheckboxRegistry();
  addCheckbox("cs-upload", { csUploadIdx: "0" }, true); // old1
  addCheckbox("cs-upload", { csUploadIdx: "1" }, true); // new1
  nextUploadShouldFailFor = new Set(["old1"]);
  toastMessages.length = 0;
  await window.doCsUpload();
  assert.ok(
    !uploadedProjects.get("uploader_uid")?.has("old1"),
    "실패한 프로젝트는 업로드되지 않아야 함",
  );
  assert.ok(
    uploadedProjects.get("uploader_uid")?.has("new1"),
    "성공한 프로젝트는 업로드되어야 함",
  );
  assert.ok(
    toastMessages.some((m) => m.includes("1개 프로젝트가 동기화")),
    "부분 실패 시에도 성공한 개수만큼 안내되어야 함: " + toastMessages.join(" | "),
  );
  assert.strictEqual(
    elements.get("cloudSyncModal").classList.contains("sync-modal-hidden"),
    true,
    "업로드 완료 후 모달이 닫혀야 함",
  );
  nextUploadShouldFailFor = new Set();

  // ═══════════════════════════════════════════════════════════════
  // 6. doCsDownload
  // ═══════════════════════════════════════════════════════════════
  await window.openCloudSyncModal();
  await new Promise((r) => setTimeout(r, 10));
  window.switchCloudSyncTab("download");
  await new Promise((r) => setTimeout(r, 10));

  resetCheckboxRegistry();
  addCheckbox("cs-dl", { csDlIdx: "0" }, true); // new1 (nextCloudProjects의 유일한 항목)
  downloadCalls.length = 0;
  nextDownloadCount = 1;
  toastMessages.length = 0;
  await window.doCsDownload();
  assert.deepStrictEqual(downloadCalls[downloadCalls.length - 1], ["new1"]);
  assert.ok(toastMessages.some((m) => m.includes("1개의 프로젝트가 이 기기에 다운로드")));

  // ═══════════════════════════════════════════════════════════════
  // 7. 통합 복원 모달: 클라우드 탭 목록 렌더링 + 최신본 복원
  // ═══════════════════════════════════════════════════════════════
  await window.openRestoreModal();
  await new Promise((r) => setTimeout(r, 10));
  assert.strictEqual(elements.get("restoreModal").classList.contains("sync-modal-hidden"), false);
  const cloudTabHtml = elements.get("restoreCloudProjectList").innerHTML;
  assert.ok(cloudTabHtml.includes("최신 곡"), "클라우드 프로젝트 카드가 렌더링되어야 함");
  assert.ok(cloudTabHtml.includes('data-project-id="new1"'));
  assert.ok(cloudTabHtml.includes("doRestoreFromCloud(this.dataset.projectId)"));
  assert.ok(cloudTabHtml.includes("openHistoryModal("));

  // 확인 취소 시 복원 실행 안됨
  nextConfirmResult = false;
  downloadCalls.length = 0;
  await window.doRestoreFromCloud("new1");
  assert.strictEqual(downloadCalls.length, 0, "확인 취소 시 다운로드 호출 안됨");

  // 확인 후 정상 복원
  nextConfirmResult = true;
  nextDownloadCount = 1;
  toastMessages.length = 0;
  await window.doRestoreFromCloud("new1");
  assert.deepStrictEqual(downloadCalls[downloadCalls.length - 1], ["new1"]);
  assert.ok(toastMessages.some((m) => m.includes("클라우드 최신 버전으로 복원 완료")));

  // ═══════════════════════════════════════════════════════════════
  // 8. 로컬 파일 복원: 스마트 병합 배지 + 선택 가져오기
  // ═══════════════════════════════════════════════════════════════
  const fakeUploadData = [
    { id: "a", title: "신규곡", savedAt: "2026-05-01T00:00:00.000Z", lastStep: 1 },
    { id: "b", title: "업데이트곡", savedAt: "2026-05-02T00:00:00.000Z", lastStep: 3 },
    { id: "c", title: "이미최신곡", savedAt: "2026-05-03T00:00:00.000Z", lastStep: 5 },
  ];
  nextAnalyzeResult = [
    { ...fakeUploadData[0], _mergeStatus: "new" },
    { ...fakeUploadData[1], _mergeStatus: "update" },
    { ...fakeUploadData[2], _mergeStatus: "current" },
  ];
  window.handleRestoreLocalFile({
    target: { files: [{ __content: JSON.stringify(fakeUploadData) }] },
  });
  await new Promise((r) => setTimeout(r, 10));

  assert.strictEqual(window._localRestoreProjects.length, 3);
  const localHtml = elements.get("restoreLocalPreviewList").innerHTML;
  assert.ok(localHtml.includes("신규/업데이트 2건"), "신규+업데이트 건수 집계 확인");
  assert.ok(localHtml.includes("🔵 신규"));
  assert.ok(localHtml.includes("🟢 업데이트"));
  assert.ok(localHtml.includes("🟡 이미 최신"));
  assert.ok(
    elements.get("restoreModalFooter").innerHTML.includes('id="localRestoreImportBtn"'),
    "가져오기 버튼이 footer에 추가되어야 함",
  );

  resetCheckboxRegistry();
  addCheckbox("local-restore", { idx: "0" }, true); // 신규
  addCheckbox("local-restore", { idx: "1" }, true); // 업데이트
  // idx 2("이미 최신")는 선택 안 함
  smartMergeCalls.length = 0;
  nextMergeResult = { newCount: 1, updateCount: 1 };
  toastMessages.length = 0;
  window.doLocalRestoreImport();
  assert.strictEqual(smartMergeCalls[smartMergeCalls.length - 1].length, 2, "선택된 2건만 병합 대상으로 전달");
  assert.ok(toastMessages.some((m) => m.includes("신규 추가: 1건") && m.includes("업데이트: 1건")));

  // 빈 JSON(유효 프로젝트 없음)은 오류 안내
  window.handleRestoreLocalFile({
    target: { files: [{ __content: JSON.stringify([{ noId: true }]) }] },
  });
  await new Promise((r) => setTimeout(r, 10));
  assert.strictEqual(
    elements.get("restoreLocalEmpty").classList.contains("sync-modal-hidden"),
    false,
    "유효한 프로젝트가 없으면 빈 안내가 표시되어야 함",
  );

  // ═══════════════════════════════════════════════════════════════
  // 9. 타계정 클라우드 불러오기
  // ═══════════════════════════════════════════════════════════════
  elements.get("crossAccountEmail").value = "";
  elements.get("crossAccountPw").value = "";
  await window.doCrossAccountFetch();
  assert.strictEqual(
    elements.get("crossAccountError").classList.contains("sync-modal-hidden"),
    false,
    "입력 누락 시 오류 표시",
  );

  elements.get("crossAccountEmail").value = "other@example.com";
  elements.get("crossAccountPw").value = "wrongpw";
  nextFetchOtherAccountResult = { ok: false, message: "auth/wrong-password" };
  elements.get("crossAccountError").classList.add("sync-modal-hidden");
  await window.doCrossAccountFetch();
  assert.strictEqual(
    elements.get("crossAccountError").textContent,
    "❌ 비밀번호가 올바르지 않습니다.",
    "Firebase 인증 오류가 한글 메시지로 매핑되어야 함",
  );

  nextFetchOtherAccountResult = { ok: false, message: "auth/user-not-found" };
  await window.doCrossAccountFetch();
  assert.strictEqual(elements.get("crossAccountError").textContent, "❌ 해당 이메일로 등록된 계정이 없습니다.");

  nextFetchOtherAccountResult = {
    ok: true,
    projects: [{ id: "x1", title: "타계정곡", savedAt: "2026-04-01T00:00:00.000Z" }],
  };
  nextAnalyzeResult = [{ id: "x1", title: "타계정곡", savedAt: "2026-04-01T00:00:00.000Z", _mergeStatus: "new" }];
  await window.doCrossAccountFetch();
  const crossHtml = elements.get("crossAccountProjectList").innerHTML;
  assert.ok(crossHtml.includes("타계정곡"), "타계정 프로젝트 카드가 렌더링되어야 함");
  assert.ok(
    elements.get("restoreModalFooter").innerHTML.includes('id="crossImportBtn"'),
    "타계정 가져오기 버튼이 footer에 추가되어야 함",
  );

  resetCheckboxRegistry();
  addCheckbox("cross", { crossIdx: "0" }, true);
  window.firebaseAuth.currentUser = { uid: "cross_importer_uid" };
  smartMergeCalls.length = 0;
  nextMergeResult = { newCount: 1, updateCount: 0 };
  toastMessages.length = 0;
  await window.doCrossImport();
  assert.strictEqual(smartMergeCalls[smartMergeCalls.length - 1].length, 1);
  assert.ok(uploadedProjects.get("cross_importer_uid")?.has("x1"), "타계정에서 가져온 프로젝트는 현재 계정 클라우드에도 백업되어야 함");
  assert.ok(toastMessages.some((m) => m.includes("타계정 프로젝트 가져오기 완료")));

  // ═══════════════════════════════════════════════════════════════
  // 10. 히스토리 복원
  // ═══════════════════════════════════════════════════════════════
  nextHistoryList = [
    { savedAt: "2026-06-01T00:00:00.000Z", lastStep: 3, _historyDocId: "h1" },
    { savedAt: "2026-05-01T00:00:00.000Z", lastStep: 2, _historyDocId: "h2" },
  ];
  await window.openHistoryModal("new1", "최신 곡");
  await new Promise((r) => setTimeout(r, 10));
  assert.strictEqual(elements.get("cloudHistoryModal").classList.contains("sync-modal-hidden"), false);
  const historyHtml = elements.get("historyList").innerHTML;
  assert.ok(historyHtml.includes("● 최신"), "가장 최근 항목에 최신 배지 표시");
  assert.ok(historyHtml.includes('data-history-doc-id="h1"'));
  assert.ok(historyHtml.includes("doRestoreHistory(this.dataset.historyDocId, this.dataset.timeLabel)"));

  nextConfirmResult = false;
  restoreHistoryCalls.length = 0;
  await window.doRestoreHistory("h1", "2026년 06월 01일 00:00");
  assert.strictEqual(restoreHistoryCalls.length, 0, "확인 취소 시 복원 호출 안됨");

  nextConfirmResult = true;
  nextRestoreHistoryResult = true;
  toastMessages.length = 0;
  await window.doRestoreHistory("h1", "2026년 06월 01일 00:00");
  assert.strictEqual(restoreHistoryCalls[restoreHistoryCalls.length - 1][1], "h1");
  assert.ok(toastMessages.some((m) => m.includes("복원 완료")));
  assert.strictEqual(elements.get("cloudHistoryModal").classList.contains("sync-modal-hidden"), true);

  nextRestoreHistoryResult = false;
  toastMessages.length = 0;
  elements.get("cloudHistoryModal").classList.remove("sync-modal-hidden");
  await window.doRestoreHistory("h1", "2026년 06월 01일 00:00");
  assert.ok(toastMessages.some((m) => m.includes("복원에 실패")), "복원 실패 시 오류 토스트");
  assert.strictEqual(
    elements.get("cloudHistoryModal").classList.contains("sync-modal-hidden"),
    false,
    "복원 실패 시 히스토리 모달은 닫히지 않아야 함",
  );

  originalConsole.log("MV cloud sync UI smoke test: PASS");
  process.exit(0);
})().catch((err) => {
  originalConsole.error(err);
  process.exit(1);
});
