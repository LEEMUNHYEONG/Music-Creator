// js/board.js (커뮤니티 게시판) 자동화 테스트
//
// 게시판(작성/수정/삭제/답변, 비공개 글, 페이지네이션, 이미지 첨부)에는
// 지금까지 자동화 테스트가 전혀 없었다. 특히 이번 세션에서 SVG 이미지
// 첨부를 통한 저장형 XSS를 막기 위해 storage.rules와 함께 클라이언트
// 단에도 방어 코드를 추가했던 자리라(setBoardImage의 image/svg+xml 거부),
// 회귀 방지 테스트가 특히 중요하다.
//
// Firebase Firestore/Storage/Auth SDK를 최소 목(mock)으로 대체해 검증한다.

const assert = require("assert");

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
    src: "",
    style: {},
    checked: false,
    disabled: false,
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
    appendChild() {},
    remove() {},
  };
}

const elementIds = [
  "boardPanel",
  "boardListSection",
  "boardDetailSection",
  "boardWriteForm",
  "boardReadForm",
  "boardNickname",
  "boardTitle",
  "boardContent",
  "boardIsPrivate",
  "boardImageInput",
  "boardImageFileName",
  "boardImagePreview",
  "boardImagePreviewImg",
  "boardContainer",
  "boardAnswerText",
  "viewBoardContent",
  "viewBoardImageContainer",
  "viewBoardImage",
  "adminAnswerSection",
  "viewBoardTitle",
  "viewBoardNickname",
  "viewBoardDate",
  "viewBoardAnswer",
  "adminAnswerInput",
];
const elements = new Map();
elementIds.forEach((id) => elements.set(id, createStubElement(id)));

// boardContainer는 실제로 카드(div)들을 appendChild로 쌓아 렌더링하므로,
// 각 자식의 innerHTML을 컨테이너 자신의 innerHTML에 이어붙여 실제 DOM과
// 유사하게 동작하도록 한다 ("더보기" 버튼처럼 querySelector로 다시 찾아야
// 하는 요소는 없으므로 문자열 이어붙이기만으로 충분하다).
elements.get("boardContainer").appendChild = function (child) {
  this.innerHTML += child.innerHTML || "";
};

const submitBtn = createStubElement();
submitBtn.className = "btn-primary";

global.window = global;
global.document = {
  getElementById(id) {
    return elements.has(id) ? elements.get(id) : null;
  },
  querySelector(selector) {
    if (selector === "#boardWriteForm .btn-primary") return submitBtn;
    return null;
  },
  createElement() {
    return createStubElement();
  },
  addEventListener() {}, // DOMContentLoaded 리스너 등록용
};

// ─── FileReader 목 (setBoardImage용) ───────────────────────────
global.FileReader = function () {
  this.onload = null;
};
global.FileReader.prototype.readAsDataURL = function (file) {
  const self = this;
  setTimeout(() => {
    if (self.onload) self.onload({ target: { result: "data:image/png;base64,FAKE" } });
  }, 0);
};

// ─── Firebase SDK 목 ──────────────────────────────────────────
global.firebase = { firestore: { FieldValue: { serverTimestamp: () => ({ seconds: ++window.__fakeClock }) } } };
window.__fakeClock = 1000;

const boardDocs = []; // [{id, data}]
function matchesFilters(data, filters) {
  return filters.every((f) => (f.op === "==" ? data[f.field] === f.val : true));
}
function makeBoardQuery(filters, sortDesc, limitN, afterDoc) {
  return {
    where(field, op, val) {
      return makeBoardQuery([...filters, { field, op, val }], sortDesc, limitN, afterDoc);
    },
    orderBy(field, dir) {
      return makeBoardQuery(filters, dir === "desc", limitN, afterDoc);
    },
    limit(n) {
      return makeBoardQuery(filters, sortDesc, n, afterDoc);
    },
    startAfter(doc) {
      return makeBoardQuery(filters, sortDesc, limitN, doc);
    },
    async get() {
      let results = boardDocs.filter((d) => matchesFilters(d.data, filters));
      results.sort((a, b) => {
        const at = a.data.createdAt?.seconds || 0;
        const bt = b.data.createdAt?.seconds || 0;
        return sortDesc ? bt - at : at - bt;
      });
      if (afterDoc) {
        const idx = results.findIndex((d) => d.id === afterDoc.id);
        results = idx >= 0 ? results.slice(idx + 1) : results;
      }
      if (limitN) results = results.slice(0, limitN);
      const docObjs = results.map((d) => ({ id: d.id, data: () => d.data }));
      return { docs: docObjs, forEach: (cb) => docObjs.forEach(cb) };
    },
  };
}
let addedDocCounter = 0;
function makeBoardCollection() {
  return {
    orderBy(field, dir) {
      return makeBoardQuery([], dir === "desc", null, null);
    },
    where(field, op, val) {
      return makeBoardQuery([{ field, op, val }], false, null, null);
    },
    doc(id) {
      return {
        async update(patch) {
          const found = boardDocs.find((d) => d.id === id);
          if (found) Object.assign(found.data, patch);
        },
        async delete() {
          const idx = boardDocs.findIndex((d) => d.id === id);
          if (idx >= 0) boardDocs.splice(idx, 1);
        },
      };
    },
    async add(data) {
      const id = "post_" + ++addedDocCounter;
      boardDocs.push({ id, data });
      return { id };
    },
  };
}
window.firebaseDb = {
  collection(name) {
    if (name !== "board") throw new Error("unexpected collection: " + name);
    return makeBoardCollection();
  },
};

let nextPutResult = null; // { ok:true, url } 또는 { ok:false, error }
const storagePutCalls = [];
window.firebaseStorage = {
  app: { options: { storageBucket: "fake-bucket" } },
  ref() {
    return {
      child(path) {
        return {
          async put(file) {
            storagePutCalls.push(path);
            if (nextPutResult && !nextPutResult.ok) throw nextPutResult.error;
            return {
              ref: {
                async getDownloadURL() {
                  return (nextPutResult && nextPutResult.url) || "https://fake.storage/image.png";
                },
              },
            };
          },
        };
      },
    };
  },
  refFromURL() {
    return { async delete() {} };
  },
};

window.firebaseAuth = { currentUser: { uid: "user_1" } };
window.currentUserData = { name: "테스터", role: "user" };
window.ensureAuthenticated = () => true;

const toastMessages = [];
window.showToast = (msg) => toastMessages.push(msg);
let nextConfirmResult = true;
window.showConfirmAsync = async () => nextConfirmResult;
let showAuthOverlayCalls = 0;
window.showAuthOverlay = () => showAuthOverlayCalls++;
window.showAuthTab = () => {};

require("../js/board.js");

assert.strictEqual(typeof window.openBoardPanel, "function");
assert.strictEqual(typeof window.submitBoardPost, "function");

function makeFile({ name = "photo.png", type = "image/png", size = 1024 }) {
  return { name, type, size };
}

(async () => {
  // ═══════════════════════════════════════════════════════════════
  // 1. showBoardWriteForm: 미로그인 시 차단
  // ═══════════════════════════════════════════════════════════════
  window.firebaseAuth.currentUser = null;
  toastMessages.length = 0;
  showAuthOverlayCalls = 0;
  window.showBoardWriteForm(false);
  assert.ok(toastMessages.some((m) => m.includes("로그인 후 이용할 수 있습니다")));
  assert.strictEqual(showAuthOverlayCalls, 1);
  assert.strictEqual(elements.get("boardWriteForm").style.display, undefined, "미로그인 시 작성폼이 열리면 안 됨");

  // ═══════════════════════════════════════════════════════════════
  // 2. showBoardWriteForm: 로그인 시 신규 작성 폼 초기화
  // ═══════════════════════════════════════════════════════════════
  window.firebaseAuth.currentUser = { uid: "user_1" };
  elements.get("boardTitle").value = "이전에 남아있던 값";
  elements.get("boardContent").value = "이전에 남아있던 내용";
  elements.get("boardIsPrivate").checked = true;
  window.showBoardWriteForm(false);
  assert.strictEqual(elements.get("boardDetailSection").style.display, "flex");
  assert.strictEqual(elements.get("boardWriteForm").style.display, "block");
  assert.strictEqual(elements.get("boardNickname").value, "테스터", "닉네임이 현재 사용자 이름으로 채워져야 함");
  assert.strictEqual(elements.get("boardTitle").value, "", "신규 작성 시 제목이 초기화되어야 함");
  assert.strictEqual(elements.get("boardContent").value, "", "신규 작성 시 내용이 초기화되어야 함");
  assert.strictEqual(elements.get("boardIsPrivate").checked, false);
  assert.strictEqual(submitBtn.textContent, "등록하기");

  // ═══════════════════════════════════════════════════════════════
  // 3. handleBoardImageSelect: SVG 첨부 거부 (★ 회귀 방지 - 저장형 XSS 차단)
  // ═══════════════════════════════════════════════════════════════
  toastMessages.length = 0;
  window.handleBoardImageSelect({
    target: { files: [makeFile({ name: "evil.svg", type: "image/svg+xml" })] },
  });
  assert.ok(
    toastMessages.some((m) => m.includes("SVG 형식은 지원하지 않습니다")),
    "SVG 이미지는 반드시 거부되어야 함(저장형 XSS 벡터)",
  );

  // ═══════════════════════════════════════════════════════════════
  // 4. handleBoardImageSelect: 이미지가 아닌 파일 거부, 5MB 초과 거부
  // ═══════════════════════════════════════════════════════════════
  toastMessages.length = 0;
  window.handleBoardImageSelect({ target: { files: [makeFile({ type: "application/pdf" })] } });
  assert.ok(toastMessages.some((m) => m.includes("이미지 파일만 첨부할 수 있습니다")));

  toastMessages.length = 0;
  window.handleBoardImageSelect({ target: { files: [makeFile({ size: 6 * 1024 * 1024 })] } });
  assert.ok(toastMessages.some((m) => m.includes("5MB 이하")));

  // ═══════════════════════════════════════════════════════════════
  // 5. handleBoardImageSelect: 정상 이미지는 미리보기 표시
  // ═══════════════════════════════════════════════════════════════
  window.handleBoardImageSelect({ target: { files: [makeFile({ name: "cover.png" })] } });
  assert.strictEqual(elements.get("boardImageFileName").textContent, "cover.png");
  await new Promise((r) => setTimeout(r, 10));
  assert.strictEqual(elements.get("boardImagePreview").style.display, "block");
  assert.strictEqual(elements.get("boardImagePreviewImg").src, "data:image/png;base64,FAKE");

  // ═══════════════════════════════════════════════════════════════
  // 6. clearBoardImageSelection
  // ═══════════════════════════════════════════════════════════════
  window.clearBoardImageSelection();
  assert.strictEqual(elements.get("boardImageInput").value, "");
  assert.strictEqual(elements.get("boardImageFileName").textContent, "선택된 파일 없음");
  assert.strictEqual(elements.get("boardImagePreview").style.display, "none");

  // ═══════════════════════════════════════════════════════════════
  // 7. showBoardEditForm: 작성자도 관리자도 아니면 차단
  // ═══════════════════════════════════════════════════════════════
  window.currentBoardPostData = { title: "제목", content: "내용", userId: "other_user" };
  window.currentBoardPostId = "post_x";
  window.currentUserData = { name: "테스터", role: "user" };
  toastMessages.length = 0;
  window.showBoardEditForm();
  assert.ok(toastMessages.some((m) => m.includes("작성자 또는 관리자만 게시글을 수정할 수 있습니다")));

  // ═══════════════════════════════════════════════════════════════
  // 8. showBoardEditForm: 작성자 본인이면 폼에 기존 데이터 채움
  // ═══════════════════════════════════════════════════════════════
  window.currentBoardPostData = {
    title: "기존 제목",
    content: "기존 내용",
    nickname: "작성자닉",
    isPrivate: true,
    imageUrl: "https://fake.storage/existing.png",
    userId: "user_1",
  };
  window.showBoardEditForm();
  assert.strictEqual(elements.get("boardTitle").value, "기존 제목");
  assert.strictEqual(elements.get("boardContent").value, "기존 내용");
  assert.strictEqual(elements.get("boardIsPrivate").checked, true);
  assert.strictEqual(submitBtn.textContent, "수정 완료");
  assert.strictEqual(elements.get("boardImagePreviewImg").src, "https://fake.storage/existing.png");
  assert.strictEqual(elements.get("boardImageFileName").textContent, "기존 이미지 유지됨");

  // ═══════════════════════════════════════════════════════════════
  // 9. submitBoardPost: 제목/내용 누락 차단
  // ═══════════════════════════════════════════════════════════════
  window.showBoardWriteForm(false); // isEditMode=false로 리셋
  elements.get("boardTitle").value = "";
  elements.get("boardContent").value = "";
  toastMessages.length = 0;
  await window.submitBoardPost();
  assert.ok(toastMessages.some((m) => m.includes("제목과 내용을 입력해 주세요")));
  assert.strictEqual(boardDocs.length, 0);

  // ═══════════════════════════════════════════════════════════════
  // 10. submitBoardPost: 인증 게이트 실패 시 차단
  // ═══════════════════════════════════════════════════════════════
  elements.get("boardTitle").value = "제목";
  elements.get("boardContent").value = "내용";
  window.ensureAuthenticated = () => false;
  await window.submitBoardPost();
  assert.strictEqual(boardDocs.length, 0, "인증 실패 시 게시글이 생성되면 안 됨");
  window.ensureAuthenticated = () => true;

  // ═══════════════════════════════════════════════════════════════
  // 11. submitBoardPost: 신규 등록 (이미지 없음)
  // ═══════════════════════════════════════════════════════════════
  toastMessages.length = 0;
  await window.submitBoardPost();
  assert.strictEqual(boardDocs.length, 1);
  assert.strictEqual(boardDocs[0].data.title, "제목");
  assert.strictEqual(boardDocs[0].data.userId, "user_1");
  assert.strictEqual(boardDocs[0].data.answered, false);
  assert.strictEqual(boardDocs[0].data.imageUrl, "");
  assert.ok(toastMessages.some((m) => m.includes("등록되었습니다")));
  assert.strictEqual(submitBtn.disabled, false, "완료 후 버튼이 다시 활성화되어야 함");

  // ═══════════════════════════════════════════════════════════════
  // 12. submitBoardPost: 이미지 첨부 업로드 성공
  // ═══════════════════════════════════════════════════════════════
  window.showBoardWriteForm(false);
  elements.get("boardTitle").value = "이미지 있는 글";
  elements.get("boardContent").value = "내용2";
  window.handleBoardImageSelect({ target: { files: [makeFile({ name: "pic.png" })] } });
  storagePutCalls.length = 0;
  nextPutResult = { ok: true, url: "https://fake.storage/uploaded.png" };
  await window.submitBoardPost();
  assert.strictEqual(storagePutCalls.length, 1, "Storage 업로드가 호출되어야 함");
  const withImagePost = boardDocs.find((d) => d.data.title === "이미지 있는 글");
  assert.strictEqual(withImagePost.data.imageUrl, "https://fake.storage/uploaded.png");

  // ═══════════════════════════════════════════════════════════════
  // 13. submitBoardPost: Storage 업로드 실패(권한 없음) 오류 메시지
  // ═══════════════════════════════════════════════════════════════
  window.showBoardWriteForm(false);
  elements.get("boardTitle").value = "업로드 실패 테스트";
  elements.get("boardContent").value = "내용3";
  window.handleBoardImageSelect({ target: { files: [makeFile({ name: "pic2.png" })] } });
  const unauthorizedErr = new Error("permission denied");
  unauthorizedErr.code = "storage/unauthorized";
  nextPutResult = { ok: false, error: unauthorizedErr };
  toastMessages.length = 0;
  const boardDocsCountBefore = boardDocs.length;
  await window.submitBoardPost();
  assert.ok(toastMessages.some((m) => m.includes("이미지 업로드 권한이 없습니다")));
  assert.strictEqual(boardDocs.length, boardDocsCountBefore, "업로드 실패 시 게시글도 저장되면 안 됨");

  // ═══════════════════════════════════════════════════════════════
  // 14. submitBoardPost: 수정 모드는 update()를 호출하고 기존 이미지 보존
  // ═══════════════════════════════════════════════════════════════
  window.currentBoardPostData = {
    title: "기존 제목",
    content: "기존 내용",
    imageUrl: "https://fake.storage/kept.png",
    userId: "user_1",
  };
  window.currentBoardPostId = boardDocs[0].id;
  window.showBoardEditForm();
  elements.get("boardTitle").value = "수정된 제목";
  toastMessages.length = 0;
  await window.submitBoardPost();
  assert.strictEqual(boardDocs[0].data.title, "수정된 제목");
  assert.strictEqual(boardDocs[0].data.imageUrl, "https://fake.storage/kept.png", "이미지를 새로 첨부하지 않으면 기존 이미지가 보존되어야 함");
  assert.ok(toastMessages.some((m) => m.includes("수정되었습니다")));

  // ═══════════════════════════════════════════════════════════════
  // 14-1. ★ 회귀 방지: "새 글쓰기"에서 이미지를 선택했다가 취소하고,
  //       이미지가 이미 있는 다른 글을 수정할 때 그 버려진 파일이
  //       조용히 재업로드되어 기존 이미지를 덮어쓰면 안 된다.
  //       (showBoardEditForm이 selectedFile을 초기화하지 않던 버그를
  //       이번 정밀 분석 중 테스트 작성으로 발견해 수정한 자리)
  // ═══════════════════════════════════════════════════════════════
  window.showBoardWriteForm(false); // "새 글쓰기" 진입
  window.handleBoardImageSelect({
    target: { files: [makeFile({ name: "abandoned.png" })] },
  }); // 이미지 선택
  window.showBoardList(); // "취소" 버튼과 동일하게 목록으로 복귀 (선택 파일은 그대로 남음)

  window.currentBoardPostData = {
    title: "이미지가 있는 다른 글",
    content: "본문",
    imageUrl: "https://fake.storage/should-stay.png",
    userId: "user_1",
  };
  window.currentBoardPostId = "unrelated_post_with_image";
  boardDocs.push({ id: "unrelated_post_with_image", data: { ...window.currentBoardPostData } });

  window.showBoardEditForm(); // 이미지가 있는 글의 수정 폼 진입
  storagePutCalls.length = 0;
  await window.submitBoardPost(); // 이미지 필드는 건드리지 않고 저장

  assert.strictEqual(
    storagePutCalls.length,
    0,
    "버려진 파일이 남아있어도 Storage 업로드가 다시 발생하면 안 됨",
  );
  const unrelatedPost = boardDocs.find((d) => d.id === "unrelated_post_with_image");
  assert.strictEqual(
    unrelatedPost.data.imageUrl,
    "https://fake.storage/should-stay.png",
    "관련 없는 이전 파일이 이 글의 이미지를 덮어쓰면 안 됨",
  );

  // ═══════════════════════════════════════════════════════════════
  // 15. deleteBoardPost: 권한 없으면 차단, 확인 취소 시 유지, 승인 시 삭제
  // ═══════════════════════════════════════════════════════════════
  window.currentBoardPostId = boardDocs[0].id;
  window.currentBoardPostData = { userId: "other_user" };
  window.currentUserData = { role: "user" };
  toastMessages.length = 0;
  const countBeforeDeleteAttempt = boardDocs.length;
  await window.deleteBoardPost();
  assert.ok(toastMessages.some((m) => m.includes("작성자 또는 관리자만 게시글을 삭제할 수 있습니다")));
  assert.strictEqual(boardDocs.length, countBeforeDeleteAttempt);

  window.currentBoardPostData = { userId: "user_1", imageUrl: "https://fake.storage/kept.png" };
  nextConfirmResult = false;
  await window.deleteBoardPost();
  assert.strictEqual(boardDocs.length, countBeforeDeleteAttempt, "확인 취소 시 삭제되면 안 됨");

  nextConfirmResult = true;
  toastMessages.length = 0;
  const targetId = window.currentBoardPostId;
  await window.deleteBoardPost();
  assert.ok(!boardDocs.some((d) => d.id === targetId), "확인 승인 시 게시글이 삭제되어야 함");
  assert.ok(toastMessages.some((m) => m.includes("삭제되었습니다")));
  // deleteBoardPost 내부의 showBoardList() → loadBoardPosts()는 await되지 않은
  // 채로 남아있으므로, 다음 시나리오와 경합하지 않도록 완료를 기다린다.
  await new Promise((r) => setTimeout(r, 10));

  // ═══════════════════════════════════════════════════════════════
  // 16. openBoardPanel → loadBoardPosts: 미로그인 시 잠금 안내
  // ═══════════════════════════════════════════════════════════════
  window.firebaseAuth.currentUser = null;
  window.openBoardPanel();
  await new Promise((r) => setTimeout(r, 10));
  assert.strictEqual(elements.get("boardPanel").style.display, "flex");
  assert.ok(elements.get("boardContainer").innerHTML.includes("로그인 후 이용할 수 있습니다"));

  // ═══════════════════════════════════════════════════════════════
  // 17. loadBoardPosts: 일반 사용자는 공개글+본인글만 병합해 렌더링
  //     (비공개 타인 글은 목록에 나타나면 안 됨)
  // ═══════════════════════════════════════════════════════════════
  boardDocs.length = 0;
  addedDocCounter = 0;
  window.firebaseAuth.currentUser = { uid: "user_1" };
  boardDocs.push({
    id: "pub_1",
    data: { title: "공개글<script>", nickname: "닉네임", isPrivate: false, userId: "someone_else", createdAt: { seconds: 100 }, answered: false },
  });
  boardDocs.push({
    id: "own_private_1",
    data: { title: "내 비공개글", nickname: "테스터", isPrivate: true, userId: "user_1", createdAt: { seconds: 200 }, answered: true },
  });
  boardDocs.push({
    id: "other_private_1",
    data: { title: "남의 비공개글", nickname: "다른사람", isPrivate: true, userId: "someone_else", createdAt: { seconds: 300 }, answered: false },
  });

  window.currentUserData = { name: "테스터", role: "user" };
  window.openBoardPanel();
  await new Promise((r) => setTimeout(r, 10));
  const containerHtml = elements.get("boardContainer").innerHTML;
  assert.ok(containerHtml.includes("&lt;script&gt;"), "게시글 제목이 이스케이프되어 렌더링되어야 함(XSS 방지)");
  assert.ok(!containerHtml.includes("<script>"), "이스케이프되지 않은 원본 스크립트 태그가 있으면 안 됨");
  assert.ok(containerHtml.includes("내 비공개글"), "본인의 비공개 글은 목록에 보여야 함");
  assert.ok(!containerHtml.includes("남의 비공개글"), "타인의 비공개 글은 쿼리 자체에서 제외되어야 함");

  // ═══════════════════════════════════════════════════════════════
  // 18. loadBoardPosts: 관리자는 전체 글(비공개 포함)을 볼 수 있음
  // ═══════════════════════════════════════════════════════════════
  window.currentUserData = { name: "관리자", role: "admin" };
  window.openBoardPanel();
  await new Promise((r) => setTimeout(r, 10));
  const adminHtml = elements.get("boardContainer").innerHTML;
  assert.ok(adminHtml.includes("남의 비공개글"), "관리자는 타인의 비공개 글도 볼 수 있어야 함");

  // ═══════════════════════════════════════════════════════════════
  // 19. submitBoardAnswer: postId/answer 없으면 아무 것도 안 함
  // ═══════════════════════════════════════════════════════════════
  window.currentBoardPostId = null;
  elements.get("boardAnswerText").value = "";
  await window.submitBoardAnswer(); // 예외 없이 조용히 종료되어야 함

  // ═══════════════════════════════════════════════════════════════
  // 20. submitBoardAnswer: 정상 답변 등록
  // ═══════════════════════════════════════════════════════════════
  boardDocs.length = 0;
  boardDocs.push({
    id: "answer_target",
    data: { title: "질문글", nickname: "테스터", isPrivate: false, userId: "user_1", createdAt: { seconds: 100 }, answered: false },
  });
  window.currentBoardPostId = "answer_target";
  window.currentBoardPostData = boardDocs[0].data;
  elements.get("boardAnswerText").value = "답변 내용입니다";
  toastMessages.length = 0;
  await window.submitBoardAnswer();
  assert.strictEqual(boardDocs[0].data.answer, "답변 내용입니다");
  assert.strictEqual(boardDocs[0].data.answered, true);
  assert.ok(toastMessages.some((m) => m.includes("답변이 등록되었습니다")));
  // viewPostDetail이 내부적으로 호출되어 답변 내용이 상세 화면에 반영되어야 함
  assert.strictEqual(elements.get("viewBoardAnswer").textContent, "답변 내용입니다");

  originalConsole.log("MV board flow smoke test: PASS");
  process.exit(0);
})().catch((err) => {
  originalConsole.error(err);
  process.exit(1);
});
