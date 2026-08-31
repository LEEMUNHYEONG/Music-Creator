(function () {
  "use strict";

  const COLLECTION_BOARD = "board";
  let selectedFile = null;
  let isEditMode = false;
  let editingPostId = null;

  // --- 전역 함수 등록 ---
  window.openBoardPanel = function () {
    const panel = document.getElementById("boardPanel");
    if (panel) {
      panel.style.display = "flex";
      showBoardList();
    }
  };

  window.closeBoardPanel = function () {
    const panel = document.getElementById("boardPanel");
    if (panel) panel.style.display = "none";
  };

  window.showBoardWriteForm = function (isEdit = false) {
    if (!window.firebaseAuth?.currentUser) {
      window.showToast("게시판 글 작성은 로그인 후 이용할 수 있습니다.", "info");
      if (typeof window.showAuthOverlay === "function") {
        window.showAuthOverlay();
        window.showAuthTab?.("login");
      }
      return;
    }

    const listSection = document.getElementById("boardListSection");
    const detailSection = document.getElementById("boardDetailSection");
    const writeForm = document.getElementById("boardWriteForm");
    const readForm = document.getElementById("boardReadForm");

    if (listSection) listSection.style.display = "none";
    if (detailSection) detailSection.style.display = "flex";
    if (writeForm) writeForm.style.display = "block";
    if (readForm) readForm.style.display = "none";

    isEditMode = isEdit;
    const submitBtn = document.querySelector("#boardWriteForm .btn-primary");
    if (submitBtn) submitBtn.textContent = isEdit ? "수정 완료" : "등록하기";

    if (!isEdit) {
      editingPostId = null;
      // ─── 입력란 초기화 (기존 데이터 보존 로직 추가) ───
      // 기존에 입력된 데이터가 있고, 새로 쓰는 도중에 실수로 호출된 경우를 대비해
      // 제목이나 내용이 있을 때는 초기화를 건너뛰는 안전장치 (필요시)
      document.getElementById("boardNickname").value =
        window.currentUserData?.name || "";
      document.getElementById("boardTitle").value = "";
      document.getElementById("boardContent").value = "";
      document.getElementById("boardIsPrivate").checked = false;
      clearBoardImageSelection();
    }
  };

  // ─── 입력란 데이터 보존을 위한 리팩토링 ───
  function setBoardImage(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.showToast("이미지 파일만 첨부할 수 있습니다.", "info");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.showToast("파일 크기는 5MB 이하여야 합니다.", "info");
      return;
    }
    selectedFile = file;
    document.getElementById("boardImageFileName").textContent =
      file.name || "pasted_image.png";
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewImg = document.getElementById("boardImagePreviewImg");
      const previewContainer = document.getElementById("boardImagePreview");
      if (previewImg && previewContainer) {
        previewImg.src = e.target.result;
        previewContainer.style.display = "block";
      }
    };
    reader.readAsDataURL(file);
  }

  window.showBoardEditForm = function () {
    const data = window.currentBoardPostData;
    const id = window.currentBoardPostId;
    if (!data || !id) return;

    const isAdmin =
      window.currentUserData && window.currentUserData.role === "admin";
    const isAuthor =
      window.firebaseAuth?.currentUser?.uid === data.userId;
    if (!isAdmin && !isAuthor) {
      window.showToast("작성자 또는 관리자만 게시글을 수정할 수 있습니다.", "info");
      return;
    }

    showBoardWriteForm(true);
    editingPostId = id;

    document.getElementById("boardNickname").value = data.nickname || "";
    document.getElementById("boardTitle").value = data.title || "";
    document.getElementById("boardContent").value = data.content || "";
    document.getElementById("boardIsPrivate").checked = !!data.isPrivate;

    if (data.imageUrl) {
      const previewImg = document.getElementById("boardImagePreviewImg");
      const previewContainer = document.getElementById("boardImagePreview");
      if (previewImg && previewContainer) {
        previewImg.src = data.imageUrl;
        previewContainer.style.display = "block";
      }
      document.getElementById("boardImageFileName").textContent =
        "기존 이미지 유지됨";
    } else {
      clearBoardImageSelection();
    }
  };

  window.showBoardList = function () {
    const listSection = document.getElementById("boardListSection");
    const detailSection = document.getElementById("boardDetailSection");

    if (listSection) listSection.style.display = "flex";
    if (detailSection) detailSection.style.display = "none";

    loadBoardPosts();
  };

  // --- 이미지 관련 핸들러 ---
  window.handleBoardImageSelect = function (event) {
    setBoardImage(event.target.files[0]);
  };

  window.clearBoardImageSelection = function () {
    selectedFile = null;
    const fileInput = document.getElementById("boardImageInput");
    if (fileInput) fileInput.value = "";
    document.getElementById("boardImageFileName").textContent =
      "선택된 파일 없음";
    document.getElementById("boardImagePreview").style.display = "none";
  };

  // --- Firestore & Storage 데이터 관리 ---
  // 게시글은 한 번에 PAGE_SIZE개씩만 읽는다 (전체 컬렉션 조회는 글 수에
  // 비례해 읽기 비용과 DOM이 무한히 커지던 문제가 있었음).
  const BOARD_PAGE_SIZE = 20;
  const boardPager = {
    renderedIds: new Set(),
    adminCursor: null,
    publicCursor: null,
    ownCursor: null,
    exhausted: false,
    loading: false,
  };

  function resetBoardPager() {
    boardPager.renderedIds.clear();
    boardPager.adminCursor = null;
    boardPager.publicCursor = null;
    boardPager.ownCursor = null;
    boardPager.exhausted = false;
    boardPager.loading = false;
  }

  async function fetchNextBoardPage() {
    const collection = window.firebaseDb.collection(COLLECTION_BOARD);
    const isAdmin = window.currentUserData?.role === "admin";
    const uid = window.firebaseAuth.currentUser.uid;
    const byId = new Map();

    if (isAdmin) {
      let query = collection.orderBy("createdAt", "desc").limit(BOARD_PAGE_SIZE);
      if (boardPager.adminCursor) query = query.startAfter(boardPager.adminCursor);
      const snapshot = await query.get();
      snapshot.forEach((doc) => byId.set(doc.id, doc));
      if (snapshot.docs.length > 0) {
        boardPager.adminCursor = snapshot.docs[snapshot.docs.length - 1];
      }
      if (snapshot.docs.length < BOARD_PAGE_SIZE) boardPager.exhausted = true;
    } else {
      let publicQuery = collection
        .where("isPrivate", "==", false)
        .orderBy("createdAt", "desc")
        .limit(BOARD_PAGE_SIZE);
      if (boardPager.publicCursor) publicQuery = publicQuery.startAfter(boardPager.publicCursor);
      let ownQuery = collection
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(BOARD_PAGE_SIZE);
      if (boardPager.ownCursor) ownQuery = ownQuery.startAfter(boardPager.ownCursor);

      const [publicSnapshot, ownSnapshot] = await Promise.all([
        publicQuery.get(),
        ownQuery.get(),
      ]);
      publicSnapshot.forEach((doc) => byId.set(doc.id, doc));
      ownSnapshot.forEach((doc) => byId.set(doc.id, doc));
      if (publicSnapshot.docs.length > 0) {
        boardPager.publicCursor = publicSnapshot.docs[publicSnapshot.docs.length - 1];
      }
      if (ownSnapshot.docs.length > 0) {
        boardPager.ownCursor = ownSnapshot.docs[ownSnapshot.docs.length - 1];
      }
      if (
        publicSnapshot.docs.length < BOARD_PAGE_SIZE &&
        ownSnapshot.docs.length < BOARD_PAGE_SIZE
      ) {
        boardPager.exhausted = true;
      }
    }

    const documents = Array.from(byId.values()).filter(
      (doc) => !boardPager.renderedIds.has(doc.id),
    );
    documents.sort((a, b) => {
      const aTime = a.data().createdAt?.seconds || 0;
      const bTime = b.data().createdAt?.seconds || 0;
      return bTime - aTime;
    });
    return documents;
  }

  function renderBoardLoadMoreButton(container) {
    const existing = document.getElementById("boardLoadMoreBtn");
    if (existing) existing.remove();
    if (boardPager.exhausted) return;

    const btn = document.createElement("button");
    btn.id = "boardLoadMoreBtn";
    btn.type = "button";
    btn.className = "btn btn-secondary";
    btn.style.cssText = "display:block; margin:15px auto;";
    btn.innerHTML = '<i class="fas fa-chevron-down"></i> 더 보기';
    btn.onclick = () => loadMoreBoardPosts();
    container.appendChild(btn);
  }

  async function loadMoreBoardPosts() {
    const container = document.getElementById("boardContainer");
    if (!container || boardPager.loading || boardPager.exhausted) return;
    boardPager.loading = true;
    const btn = document.getElementById("boardLoadMoreBtn");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 불러오는 중...';
    }
    try {
      const documents = await fetchNextBoardPage();
      documents.forEach((doc) => {
        boardPager.renderedIds.add(doc.id);
        container.appendChild(createPostCard(doc.id, doc.data()));
      });
      renderBoardLoadMoreButton(container);
    } catch (err) {
      console.error("게시판 추가 로드 오류:", err);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-chevron-down"></i> 더 보기 (오류 - 다시 시도)';
      }
    } finally {
      boardPager.loading = false;
    }
  }

  async function loadBoardPosts() {
    const container = document.getElementById("boardContainer");
    if (!container) return;

    const currentUser = window.firebaseAuth?.currentUser;
    if (!currentUser) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text-secondary);">
          <i class="fas fa-lock fa-2x" style="opacity:0.45; margin-bottom:15px;"></i>
          <p style="margin:0;">게시판은 로그인 후 이용할 수 있습니다.</p>
        </div>
      `;
      return;
    }

    try {
      resetBoardPager();
      const documents = await fetchNextBoardPage();

      if (documents.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-secondary);"><i class="fas fa-inbox fa-3x" style="opacity: 0.3; margin-bottom: 15px;"></i><br>아직 등록된 게시글이 없습니다.</div>`;
        return;
      }

      container.innerHTML = "";
      documents.forEach((doc) => {
        boardPager.renderedIds.add(doc.id);
        container.appendChild(createPostCard(doc.id, doc.data()));
      });
      renderBoardLoadMoreButton(container);
    } catch (err) {
      console.error("게시판 로드 오류:", err);
      container.innerHTML = `<div style="color:var(--error); text-align:center; padding:20px;">❌ 데이터를 불러오지 못했습니다: ${escapeHtml(err.message)}</div>`;
    }
  }

  function createPostCard(id, data) {
    const card = document.createElement("div");
    card.className = "board-post-card";
    card.onclick = () => viewPostDetail(id, data);

    const date = data.createdAt
      ? new Date(data.createdAt.seconds * 1000).toLocaleDateString()
      : "-";
    const statusClass = data.answered ? "status-answered" : "status-pending";
    const statusText = data.answered ? "답변완료" : "대기중";
    const nickname = data.nickname || data.userName || "익명";
    const lockIcon = data.isPrivate
      ? '<i class="fas fa-lock board-post-lock"></i>'
      : "";

    card.innerHTML = `
      <div class="board-post-title">
        <span>${escapeHtml(data.title)} ${lockIcon}</span>
        <div style="display:flex; align-items:center; gap:8px;">
          ${data.imageUrl ? '<i class="fas fa-image" style="color:var(--text-secondary); font-size:0.8rem;"></i>' : ""}
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
      </div>
      <div class="board-post-meta">
        <span class="board-post-nickname"><i class="fas fa-user-circle"></i> ${escapeHtml(nickname)}</span>
        <span><i class="fas fa-calendar-alt"></i> ${date}</span>
      </div>
    `;
    return card;
  }

  async function viewPostDetail(id, data) {
    const listSection = document.getElementById("boardListSection");
    const detailSection = document.getElementById("boardDetailSection");
    const writeForm = document.getElementById("boardWriteForm");
    const readForm = document.getElementById("boardReadForm");

    listSection.style.display = "none";
    detailSection.style.display = "flex";
    writeForm.style.display = "none";
    readForm.style.display = "block";

    // 비공개 글은 Firestore 규칙에서 작성자와 관리자에게만 전달됩니다.
    const isAdmin =
      window.currentUserData && window.currentUserData.role === "admin";
    const isAuthor =
      window.firebaseAuth.currentUser &&
      window.firebaseAuth.currentUser.uid === data.userId;
    const canView = !data.isPrivate || isAdmin || isAuthor;

    const contentArea = document.getElementById("viewBoardContent");
    const imgContainer = document.getElementById("viewBoardImageContainer");
    const answerSection = document.getElementById("adminAnswerSection");

    if (!canView) {
      contentArea.innerHTML = `
        <div class="private-content-overlay">
          <i class="fas fa-lock fa-3x" style="color: var(--warning); margin-bottom: 15px;"></i>
          <p style="font-weight: 600; margin-bottom: 20px;">비공개 게시글입니다.</p>
          <p style="margin:0;">작성자 또는 관리자 계정으로 로그인해 주세요.</p>
        </div>
      `;
      imgContainer.style.display = "none";
      answerSection.style.display = "none";
    } else {
      contentArea.textContent = data.content;
      const imgEl = document.getElementById("viewBoardImage");
      if (data.imageUrl) {
        imgEl.src = data.imageUrl;
        imgContainer.style.display = "block";
      } else {
        imgContainer.style.display = "none";
      }
      answerSection.style.display = "block";
    }

    document.getElementById("viewBoardTitle").textContent =
      (data.isPrivate ? "🔒 " : "") + data.title;
    const date = data.createdAt
      ? new Date(data.createdAt.seconds * 1000).toLocaleString()
      : "-";
    document.getElementById("viewBoardNickname").textContent =
      data.nickname || data.userName || "익명";
    document.getElementById("viewBoardDate").textContent = date;

    const answerEl = document.getElementById("viewBoardAnswer");
    if (data.answer) {
      answerEl.textContent = data.answer;
      answerEl.style.color = "var(--text-primary)";
    } else {
      answerEl.textContent = "관리자의 답변을 기다리고 있습니다.";
      answerEl.style.color = "var(--text-secondary)";
    }

    const adminInput = document.getElementById("adminAnswerInput");
    if (adminInput) {
      adminInput.style.display = isAdmin ? "block" : "none";
      document.getElementById("boardAnswerText").value = data.answer || "";
    }

    window.currentBoardPostId = id;
    window.currentBoardPostData = data;
  }

  window.submitBoardPost = async function () {
    if (typeof window.ensureAuthenticated === "function") {
      if (!window.ensureAuthenticated()) return;
    }
    const nickname =
      document.getElementById("boardNickname").value.trim() || "익명";
    const title = document.getElementById("boardTitle").value.trim();
    const content = document.getElementById("boardContent").value.trim();
    const isPrivate = document.getElementById("boardIsPrivate").checked;

    if (!title || !content) {
      window.showToast("제목과 내용을 입력해 주세요.", "info");
      return;
    }

    const submitBtn = document.querySelector("#boardWriteForm .btn-primary");
    const originalBtnText = submitBtn ? submitBtn.innerHTML : "저장";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...';
    }

    try {
      console.log("🔄 게시글 등록 시작...");
      let imageUrl = isEditMode
        ? window.currentBoardPostData
          ? window.currentBoardPostData.imageUrl
          : ""
        : "";

      if (selectedFile) {
        console.log("📸 이미지 업로드 시도:", selectedFile.name);
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${selectedFile.name.split(".").pop()}`;

        try {
          const storageRef = window.firebaseStorage.ref();
          const uid = window.firebaseAuth.currentUser.uid;
          const imageRef = storageRef.child(`board_images/${uid}/${fileName}`);

          console.log(
            "📤 Storage 업로드 중... (Bucket: " +
              window.firebaseStorage.app.options.storageBucket +
              ")",
          );
          const uploadTask = await imageRef.put(selectedFile);
          console.log("✅ Storage 업로드 완료");

          imageUrl = await uploadTask.ref.getDownloadURL();
          console.log("🔗 이미지 URL 획득 완료:", imageUrl);
        } catch (storageErr) {
          console.error("❌ Storage 업로드 중 오류 발생:", storageErr);
          if (storageErr.code === "storage/unauthorized") {
            throw new Error(
              "이미지 업로드 권한이 없습니다. (보안 규칙 확인 필요)",
            );
          } else if (
            storageErr.name === "FirebaseError" &&
            storageErr.message.includes("CORS")
          ) {
            throw new Error(
              "이미지 서버(CORS) 설정 오류가 발생했습니다. 관리자에게 문의하세요.",
            );
          } else {
            throw new Error(
              "이미지 업로드에 실패했습니다: " +
                (storageErr.message || storageErr.code),
            );
          }
        }
      }

      const postData = {
        title,
        content,
        nickname,
        isPrivate,
        imageUrl,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      console.log("📝 Firestore 데이터 저장 중...");
      if (!isEditMode) {
        postData.userId = window.firebaseAuth.currentUser?.uid || "anonymous";
        postData.userName = window.currentUserData?.name || "익명";
        postData.answered = false;
        postData.answer = "";
        postData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await window.firebaseDb.collection(COLLECTION_BOARD).add(postData);
      } else {
        await window.firebaseDb
          .collection(COLLECTION_BOARD)
          .doc(editingPostId)
          .update(postData);
      }

      console.log("✅ 게시글 처리 완료");
      window.showToast(isEditMode ? "수정되었습니다." : "등록되었습니다.", "info");
      showBoardList();
    } catch (err) {
      console.error("❌ 게시글 등록 실패:", err);
      // alert는 브라우저를 블로킹하므로 showToast 등이 있으면 더 좋으나, 현재 alert 사용 중
      window.showToast(
        "❌ 오류 발생: " + (err.message || "알 수 없는 오류가 발생했습니다."), "error");
    } finally {
      console.log("🔚 버튼 상태 복원");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  };

  window.deleteBoardPost = async function () {
    const postId = window.currentBoardPostId;
    const postData = window.currentBoardPostData;
    if (!postId || !postData) return;

    const isAdmin = window.currentUserData?.role === "admin";
    const isAuthor =
      window.firebaseAuth?.currentUser?.uid === postData.userId;
    if (!isAdmin && !isAuthor) {
      window.showToast("작성자 또는 관리자만 게시글을 삭제할 수 있습니다.", "info");
      return;
    }

    if (!(await window.showConfirmAsync("정말 이 게시글을 삭제하시겠습니까?"))) return;

    try {
      await window.firebaseDb.collection(COLLECTION_BOARD).doc(postId).delete();
      if (postData.imageUrl) {
        try {
          await window.firebaseStorage.refFromURL(postData.imageUrl).delete();
        } catch (e) {}
      }
      window.showToast("삭제되었습니다.", "success");
      showBoardList();
    } catch (err) {
      window.showToast("❌ 삭제 오류: " + err.message, "error");
    }
  };

  window.submitBoardAnswer = async function () {
    const postId = window.currentBoardPostId;
    const answer = document.getElementById("boardAnswerText").value.trim();
    if (!postId || !answer) return;
    try {
      await window.firebaseDb.collection(COLLECTION_BOARD).doc(postId).update({
        answer,
        answered: true,
        answeredAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      window.showToast("답변이 등록되었습니다.", "info");
      viewPostDetail(postId, {
        ...window.currentBoardPostData,
        answer,
        answered: true,
      });
    } catch (err) {
      window.showToast("❌ 답변 등록 오류: " + err.message, "error");
    }
  };

  // 속성 컨텍스트까지 안전하도록 따옴표 포함 이스케이프
  function escapeHtml(str) {
    if (str === null || str === undefined || str === "") return "";
    return String(str).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  // ─── 붙여넣기 이벤트 바인딩 ───
  document.addEventListener("DOMContentLoaded", () => {
    const contentArea = document.getElementById("boardContent");
    if (contentArea) {
      contentArea.addEventListener("paste", function (e) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            const blob = items[i].getAsFile();
            setBoardImage(blob);
            // 이미지를 붙여넣었으므로 텍스트 입력을 막고 싶다면 e.preventDefault();
            // 하지만 텍스트와 함께 사용하는 경우가 많으므로 막지 않음
          }
        }
      });
    }
  });
})();
