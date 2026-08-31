// ═══════════════════════════════════════════════════════════════
// 관리자 패널 — 사용자 승인/거절 관리
// Music Creator - admin.js
// ═══════════════════════════════════════════════════════════════

(function () {
  "use strict";

  const COLLECTION_USERS = "users";

  // ─── 관리자 패널 열기/닫기 ──────────────────────────────────
  // showConfig: true면 ⚙️ API 설정 탭을 표시하고 해당 탭으로 이동
  //             false(기본)면 API 설정 탭 숨김 — 사용자 관리 탭만 표시
  window.openAdminPanel = function (showConfig) {
    const userData = window.currentUserData;
    if (!userData || userData.role !== "admin") {
      alert("⚠️ 관리자 권한이 필요합니다.");
      return;
    }
    const panel = document.getElementById("adminPanel");
    if (!panel) return;

    const configTabBtn = document.querySelector(".admin-tab-btn[data-tab='config']");
    if (configTabBtn) {
      if (showConfig) {
        configTabBtn.classList.remove("d-none");
      } else {
        configTabBtn.classList.add("d-none");
      }
    }

    panel.classList.remove("d-none");
    loadPendingUsers();
    loadAllUsers();

    // showConfig=true면 API 설정 탭으로 바로 이동, 아니면 승인 대기 탭으로
    if (showConfig) {
      setTimeout(function () {
        switchAdminTab("config");
      }, 150);
    } else {
      switchAdminTab("pending");
    }
  };

  window.closeAdminPanel = function () {
    const panel = document.getElementById("adminPanel");
    if (panel) panel.classList.add("d-none");
    // 닫을 때 ⚙️ API 설정 탭을 숨김 초기화 (다음 "사용자 관리" 진입 시 탭 미표시 보장)
    const configTabBtn = document.querySelector(
      ".admin-tab-btn[data-tab='config']",
    );
    if (configTabBtn) configTabBtn.classList.add("d-none");
  };

  // ─── 승인 대기 중 사용자 목록 불러오기 ──────────────────────
  async function loadPendingUsers() {
    const listEl = document.getElementById("pendingUsersList");
    if (!listEl) return;
    listEl.innerHTML =
      '<p style="color: var(--text-secondary); font-size:0.9rem;"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</p>';

    try {
      const snapshot = await window.firebaseDb
        .collection(COLLECTION_USERS)
        .where("approved", "==", false)
        .orderBy("createdAt", "desc")
        .get();

      if (snapshot.empty) {
        listEl.innerHTML =
          '<p style="color: var(--text-secondary); font-size:0.9rem;">🎉 승인 대기 중인 사용자가 없습니다.</p>';
        return;
      }

      listEl.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const card = createUserCard(doc.id, data, "pending");
        listEl.appendChild(card);
      });
    } catch (err) {
      listEl.innerHTML = `<p style="color:var(--error);">❌ 오류: ${escapeHtml(err.message)}</p>`;
    }
  }

  // ─── 전체 사용자 목록 불러오기 ──────────────────────────────
  async function loadAllUsers() {
    const listEl = document.getElementById("allUsersList");
    if (!listEl) return;
    listEl.innerHTML =
      '<p style="color: var(--text-secondary); font-size:0.9rem;"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</p>';

    try {
      const snapshot = await window.firebaseDb
        .collection(COLLECTION_USERS)
        .orderBy("createdAt", "desc")
        .get();

      if (snapshot.empty) {
        listEl.innerHTML =
          '<p style="color: var(--text-secondary); font-size:0.9rem;">아직 가입한 사용자가 없습니다.</p>';
        return;
      }

      listEl.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const card = createUserCard(doc.id, data, "all");
        listEl.appendChild(card);
      });
    } catch (err) {
      listEl.innerHTML = `<p style="color:var(--error);">❌ 오류: ${escapeHtml(err.message)}</p>`;
    }
  }

  // ─── 사용자 카드 생성 ────────────────────────────────────────
  function createUserCard(uid, data, mode) {
    const div = document.createElement("div");
    div.className = "admin-user-card";

    const createdAt = data.createdAt
      ? new Date(data.createdAt.seconds * 1000).toLocaleDateString("ko-KR")
      : "-";
    const statusBadge = data.approved
      ? '<span class="user-badge approved">✅ 승인됨</span>'
      : '<span class="user-badge pending">⏳ 대기중</span>';
    const roleBadge =
      data.role === "admin"
        ? '<span class="user-badge admin">👑 관리자</span>'
        : '<span class="user-badge user">👤 일반</span>';

    const usageGemini = data.usage_gemini || 0;
    const usageOpenAI = data.usage_openai || 0;

    div.innerHTML = `
      <div class="admin-user-info">
        <div class="admin-user-name">${escapeHtml(data.name || "이름 없음")}</div>
        <div class="admin-user-email">${escapeHtml(data.email || "")}</div>
        <div class="admin-user-meta">
          가입일: ${createdAt} &nbsp; ${statusBadge} ${roleBadge}<br>
          <span style="font-size:0.8rem; color:var(--text-secondary);">
            <i class="fas fa-robot"></i> Gemini: <strong>${usageGemini}</strong> &nbsp;
            <i class="fas fa-comment-dots"></i> OpenAI: <strong>${usageOpenAI}</strong>
          </span>
        </div>
      </div>
      <div class="admin-user-actions" id="actions-${uid}">
        ${renderUserActions(uid, data)}
      </div>
    `;
    return div;
  }

  function renderUserActions(uid, data) {
    // 현재 로그인한 관리자 자신은 조작 불가 (자기 자신 보호)
    const currentUid =
      window.firebaseAuth && window.firebaseAuth.currentUser
        ? window.firebaseAuth.currentUser.uid
        : null;
    if (uid === currentUid) {
      return '<span style="color:var(--text-secondary);font-size:0.85rem;">내 계정</span>';
    }

    let html = "";

    if (!data.approved) {
      // 승인 대기 중
      html += `<button class="btn btn-small" style="background:var(--success);color:white;" onclick="approveUser('${uid}')"><i class="fas fa-check"></i> 승인</button>`;
      html += `<button class="btn btn-small" style="background:var(--error);color:white;margin-left:6px;" onclick="rejectUser('${uid}')"><i class="fas fa-times"></i> 거절</button>`;
    } else {
      // 승인된 계정 → 승인 취소 가능
      html += `<button class="btn btn-small" style="background:var(--error);color:white;" onclick="revokeUser('${uid}')"><i class="fas fa-ban"></i> 승인 취소</button>`;
    }

    // 역할 변경 버튼
    if (data.role !== "admin") {
      html += `<button class="btn btn-small" style="background:var(--accent);color:white;margin-left:6px;" onclick="makeAdmin('${uid}')"><i class="fas fa-crown"></i> 관리자 지정</button>`;
    } else {
      // 관리자 → 일반 회원으로 강등
      html += `<button class="btn btn-small" style="background:var(--warning, #f59e0b);color:white;margin-left:6px;" onclick="demoteAdmin('${uid}')"><i class="fas fa-user-minus"></i> 일반 회원</button>`;
    }

    return html;
  }

  // ─── 사용자 승인 ────────────────────────────────────────────
  window.approveUser = async function (uid) {
    if (!confirm("이 사용자를 승인하시겠습니까?")) return;
    try {
      await window.firebaseDb
        .collection(COLLECTION_USERS)
        .doc(uid)
        .update({ approved: true });
      showAdminToast("✅ 사용자를 승인했습니다.");
      loadPendingUsers();
      loadAllUsers();
    } catch (err) {
      alert("❌ 오류: " + err.message);
    }
  };

  // ─── 사용자 거절 (계정 삭제 + Auth 로그인 차단) ─────────────
  window.rejectUser = async function (uid) {
    if (!confirm("이 사용자를 거절하고 삭제하시겠습니까?")) return;
    try {
      await window.firebaseDb.collection(COLLECTION_USERS).doc(uid).delete();

      // Firestore 문서 삭제만으로는 Auth 계정이 남아 로그인이 가능하므로
      // 서버 함수로 계정 자체를 비활성화한다.
      try {
        const token = await window.firebaseAuth.currentUser.getIdToken();
        const resp = await fetch("/api/admin/disable", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ uid, disabled: true }),
        });
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${resp.status}`);
        }
        showAdminToast("🗑️ 사용자를 삭제하고 로그인도 차단했습니다.");
      } catch (disableErr) {
        console.error("Auth 계정 비활성화 실패:", disableErr);
        showAdminToast("⚠️ 문서는 삭제했지만 로그인 차단에 실패했습니다: " + disableErr.message);
      }

      loadPendingUsers();
      loadAllUsers();
    } catch (err) {
      alert("❌ 오류: " + err.message);
    }
  };

  // ─── 승인 취소 ──────────────────────────────────────────────
  window.revokeUser = async function (uid) {
    if (!confirm("이 사용자의 승인을 취소하시겠습니까?")) return;
    try {
      await window.firebaseDb
        .collection(COLLECTION_USERS)
        .doc(uid)
        .update({ approved: false });
      showAdminToast("🚫 승인을 취소했습니다.");
      loadAllUsers();
    } catch (err) {
      alert("❌ 오류: " + err.message);
    }
  };

  // ─── 관리자 지정 ────────────────────────────────────────────
  window.makeAdmin = async function (uid) {
    if (!confirm("이 사용자를 관리자로 지정하시겠습니까?")) return;
    try {
      await window.firebaseDb
        .collection(COLLECTION_USERS)
        .doc(uid)
        .update({ role: "admin", approved: true });
      showAdminToast("👑 관리자로 지정했습니다.");
      loadAllUsers();
    } catch (err) {
      alert("❌ 오류: " + err.message);
    }
  };

  // ─── 관리자 → 일반 회원 강등 ────────────────────────────────
  window.demoteAdmin = async function (uid) {
    if (!confirm("이 관리자를 일반 회원으로 변경하시겠습니까?")) return;
    try {
      await window.firebaseDb
        .collection(COLLECTION_USERS)
        .doc(uid)
        .update({ role: "user" });
      showAdminToast("👤 일반 회원으로 변경했습니다.");
      loadAllUsers();
    } catch (err) {
      alert("❌ 오류: " + err.message);
    }
  };

  // ─── 새로고침 ───────────────────────────────────────────────
  window.refreshAdminPanel = function () {
    loadPendingUsers();
    loadAllUsers();
    showAdminToast("🔄 목록을 새로 불러왔습니다.");
  };

  // ─── 탭 전환 ────────────────────────────────────────────────
  window.switchAdminTab = function (tab) {
    document
      .querySelectorAll(".admin-tab-content")
      .forEach((c) => c.classList.add("d-none"));
    document
      .querySelectorAll(".admin-tab-btn")
      .forEach((b) => b.classList.remove("active"));
    const content = document.getElementById("adminTab-" + tab);
    if (content) content.classList.remove("d-none");
    const btn = document.querySelector(`.admin-tab-btn[data-tab="${tab}"]`);
    if (btn) btn.classList.add("active");

    // config 탭으로 전환 시 설정 불러오기
    if (tab === "config") {
      loadGlobalSettings();
    }
  };

  // ─── 모델 세팅 UI 매핑 헬퍼 ──────────────────────────────────
  function setModelUiValues(prefix, geminiModel, openaiModel) {
    const geminiSelect = document.getElementById(prefix + "GeminiModelSelect");
    const geminiCustom = document.getElementById(prefix + "GeminiModelCustom");
    const openaiSelect = document.getElementById(prefix + "OpenAIModelSelect");
    const openaiCustom = document.getElementById(prefix + "OpenAIModelCustom");

    // 서버 프록시(functions/index.js) 허용 목록과 일치해야 한다.
    const geminiPresets = ["gemini-2.5-flash", "gemini-2.0-flash"];
    const openaiPresets = ["gpt-4o-mini", "gpt-4o", "o1-mini", "o1"];

    if (geminiSelect) {
      if (!geminiModel) {
        geminiSelect.value = "gemini-2.5-flash";
        if (geminiCustom) {
          geminiCustom.classList.add("d-none");
          geminiCustom.value = "";
        }
      } else if (geminiPresets.includes(geminiModel)) {
        geminiSelect.value = geminiModel;
        if (geminiCustom) {
          geminiCustom.classList.add("d-none");
          geminiCustom.value = "";
        }
      } else {
        geminiSelect.value = "custom";
        if (geminiCustom) {
          geminiCustom.classList.remove("d-none");
          geminiCustom.value = geminiModel;
        }
      }
    }

    if (openaiSelect) {
      if (!openaiModel) {
        openaiSelect.value = "gpt-4o-mini";
        if (openaiCustom) {
          openaiCustom.classList.add("d-none");
          openaiCustom.value = "";
        }
      } else if (openaiPresets.includes(openaiModel)) {
        openaiSelect.value = openaiModel;
        if (openaiCustom) {
          openaiCustom.classList.add("d-none");
          openaiCustom.value = "";
        }
      } else {
        openaiSelect.value = "custom";
        if (openaiCustom) {
          openaiCustom.classList.remove("d-none");
          openaiCustom.value = openaiModel;
        }
      }
    }
  }

  // UI 토글 함수 전역 등록
  window.toggleCustomGeminiModelInput = function (selectEl) {
    const isCustom = selectEl.value === "custom";
    const prefix = selectEl.id.startsWith("modal") ? "modal" : "admin";
    const customInput = document.getElementById(prefix + "GeminiModelCustom");
    if (customInput) {
      if (isCustom) {
        customInput.classList.remove("d-none");
      } else {
        customInput.classList.add("d-none");
      }
    }
  };

  window.toggleCustomOpenAIModelInput = function (selectEl) {
    const isCustom = selectEl.value === "custom";
    const prefix = selectEl.id.startsWith("modal") ? "modal" : "admin";
    const customInput = document.getElementById(prefix + "OpenAIModelCustom");
    if (customInput) {
      if (isCustom) {
        customInput.classList.remove("d-none");
      } else {
        customInput.classList.add("d-none");
      }
    }
  };

  function getModelValuesFromUi(prefix) {
    const geminiSelect = document.getElementById(prefix + "GeminiModelSelect");
    const geminiCustom = document.getElementById(prefix + "GeminiModelCustom");
    const openaiSelect = document.getElementById(prefix + "OpenAIModelSelect");
    const openaiCustom = document.getElementById(prefix + "OpenAIModelCustom");

    let geminiModel = "gemini-2.5-flash";
    if (geminiSelect) {
      if (geminiSelect.value === "custom") {
        geminiModel = geminiCustom?.value.trim() || "gemini-2.5-flash";
      } else {
        geminiModel = geminiSelect.value;
      }
    }

    let openaiModel = "gpt-4o-mini";
    if (openaiSelect) {
      if (openaiSelect.value === "custom") {
        openaiModel = openaiCustom?.value.trim() || "gpt-4o-mini";
      } else {
        openaiModel = openaiSelect.value;
      }
    }

    return { geminiModel, openaiModel };
  }

  // ─── 전역 설정 불러오기 (API 키 등) ──────────────────────────
  async function loadGlobalSettings() {
    const inputGeminiEl = document.getElementById("adminGeminiApiKey");
    const inputOpenAIEl = document.getElementById("adminOpenAIApiKey");
    if (!inputGeminiEl && !inputOpenAIEl) return;

    try {
      const doc = await window.firebaseDb
        .collection("config")
        .doc("global_settings")
        .get();
      if (doc.exists) {
        const data = doc.data();
        if (inputGeminiEl) inputGeminiEl.value = data.gemini_api_key || "";
        if (inputOpenAIEl) inputOpenAIEl.value = data.openai_api_key || "";
        
        // 모델 정보 UI 세팅
        setModelUiValues("admin", data.gemini_model, data.openai_model);
        
        window.globalConfig = data; // 전역 스코프에도 보관
      }
    } catch (err) {
      console.error("전역 설정 로드 오류:", err);
    }
  }

  // ─── 전역 설정 저장하기 ──────────────────────────────────────
  window.saveGlobalSettings = async function () {
    const geminiKey = document.getElementById("adminGeminiApiKey")?.value || "";
    const openaiKey = document.getElementById("adminOpenAIApiKey")?.value || "";
    const { geminiModel, openaiModel } = getModelValuesFromUi("admin");

    if (
      !confirm(
        "전역 설정을 저장하시겠습니까?\n모든 사용자가 이 API 키들을 공유하게 됩니다.",
      )
    )
      return;

    try {
      await window.firebaseDb.collection("config").doc("global_settings").set(
        {
          gemini_api_key: geminiKey,
          openai_api_key: openaiKey,
          gemini_model: geminiModel,
          openai_model: openaiModel,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: window.firebaseAuth.currentUser.uid,
        },
        { merge: true },
      );

      showAdminToast("✅ 전역 설정이 성공적으로 저장되었습니다.");
      window.globalConfig = {
        ...window.globalConfig,
        gemini_api_key: geminiKey,
        openai_api_key: openaiKey,
        gemini_model: geminiModel,
        openai_model: openaiModel,
      };
    } catch (err) {
      alert("❌ 저장 오류: " + err.message);
    }
  };

  // ─── 토스트 메시지 ──────────────────────────────────────────
  function showAdminToast(msg) {
    const toast = document.getElementById("adminToast");
    if (!toast) return;
    toast.textContent = msg;
    toast.style.opacity = "1";
    setTimeout(() => (toast.style.opacity = "0"), 3000);
  }

  // ─── XSS 방지 (속성 컨텍스트까지 안전하도록 따옴표 포함 이스케이프) ───
  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ─── 공용 API 키 관리 전용 모달 ────────────────────────────
  /** "설정 > 공용 API 키 관리" 클릭 시 전용 모달을 엽니다. */
  window.openGlobalApiKeyModal = async function () {
    const userData = window.currentUserData;
    if (!userData || userData.role !== "admin") {
      alert("⚠️ 관리자 권한이 필요합니다.");
      return;
    }
    const modal = document.getElementById("globalApiKeyModal");
    if (!modal) return;

    // 기존 키 불러오기
    try {
      const doc = await window.firebaseDb
        .collection("config")
        .doc("global_settings")
        .get();
      if (doc.exists) {
        const data = doc.data();
        const openaiEl = document.getElementById("modalOpenAIApiKey");
        const geminiEl = document.getElementById("modalGeminiApiKey");
        if (openaiEl) openaiEl.value = data.openai_api_key || "";
        if (geminiEl) geminiEl.value = data.gemini_api_key || "";
        
        // 모델 UI 업데이트
        setModelUiValues("modal", data.gemini_model, data.openai_model);
      }
    } catch (err) {
      console.warn("공용 API 키 불러오기 오류:", err.message);
    }

    modal.classList.remove("d-none");
  };

  /** 모달 닫기 */
  window.closeGlobalApiKeyModal = function () {
    const modal = document.getElementById("globalApiKeyModal");
    if (modal) modal.classList.add("d-none");
  };

  /** 모달에서 저장하기 */
  window.saveGlobalApiKeyModal = async function () {
    const openaiKey = document.getElementById("modalOpenAIApiKey")?.value || "";
    const geminiKey = document.getElementById("modalGeminiApiKey")?.value || "";
    const { geminiModel, openaiModel } = getModelValuesFromUi("modal");

    if (
      !confirm(
        "공용 API 키를 저장하시겠습니까?\n모든 사용자가 이 키를 공유하게 됩니다.",
      )
    )
      return;

    try {
      await window.firebaseDb.collection("config").doc("global_settings").set(
        {
          openai_api_key: openaiKey,
          gemini_api_key: geminiKey,
          gemini_model: geminiModel,
          openai_model: openaiModel,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: window.firebaseAuth.currentUser.uid,
        },
        { merge: true },
      );
      // 전역 설정 갱신
      window.globalConfig = {
        ...window.globalConfig,
        openai_api_key: openaiKey,
        gemini_api_key: geminiKey,
        gemini_model: geminiModel,
        openai_model: openaiModel,
      };

      // 🔒 [FIX] 공용 키를 새로 저장할 때도, 임시 비활성화 락을 강제로 해제합니다.
      try {
        sessionStorage.removeItem("geminiDisabledUntil");
        sessionStorage.removeItem("geminiDisabledReason");
        sessionStorage.removeItem("openaiDisabledUntil");
        sessionStorage.removeItem("openaiDisabledReason");
        window.__geminiDisabledUntil = 0;
        window.__geminiDisabledReason = "";
      } catch (_) {}

      closeGlobalApiKeyModal();
      // 기존 showAdminToast가 있으면 활용
      const toast = document.getElementById("adminToast");
      if (toast) {
        toast.textContent = "✅ 공용 API 키가 저장되었습니다.";
        toast.style.opacity = "1";
        setTimeout(() => (toast.style.opacity = "0"), 3000);
      } else {
        alert("✅ 공용 API 키가 저장되었습니다.");
      }
    } catch (err) {
      alert("❌ 저장 오류: " + err.message);
    }
  };

  console.log("✅ admin.js 로드 완료");
})();
