// ═══════════════════════════════════════════════════════════════
// Firebase Authentication & 사용자 관리 로직
// Music Creator - auth.js
// ═══════════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ─── 상수 ───────────────────────────────────────────────────
  const COLLECTION_USERS = "users";

  // ─── 내부 상태 ──────────────────────────────────────────────
  let currentUser = null;
  let currentUserData = null;

  // ─── 외부 노출용 게터 ──────────────────────────────────────────
  window.getCurrentUser = () => currentUser;
  window.getCurrentUserData = () => currentUserData;

  // ─── 유틸리티 ───────────────────────────────────────────────
  function showAuthMessage(elementId, message, type = "error") {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = "auth-message auth-message--" + type;
    el.style.display = "block";
    if (type === "success") {
      setTimeout(() => (el.style.display = "none"), 4000);
    }
  }

  function clearAuthMessage(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      el.style.display = "none";
      el.textContent = "";
    }
  }

  function setButtonLoading(buttonId, loading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...';
    } else {
      btn.innerHTML = btn.dataset.originalText || btn.textContent;
    }
  }

  // ─── 화면 전환 ──────────────────────────────────────────────
  window.showAuthOverlay = function () {
    const overlay = document.getElementById("authOverlay");
    const mainApp = document.getElementById("mainAppContent") || document.getElementById("mainWrapper");
    if (overlay) overlay.classList.remove("d-none");
    if (mainApp) mainApp.classList.add("d-none");
    // 화면 표시 시 버튼 상태와 비밀번호 초기화
    setButtonLoading("loginBtn", false);
    setButtonLoading("signupBtn", false);
    const loginPwd = document.getElementById("loginPassword");
    if (loginPwd) loginPwd.value = "";
    const signupPwd = document.getElementById("signupPassword");
    if (signupPwd) signupPwd.value = "";
    const signupPwdConfirm = document.getElementById("signupPasswordConfirm");
    if (signupPwdConfirm) signupPwdConfirm.value = "";
  };

  window.hideAuthOverlay = function () {
    const overlay = document.getElementById("authOverlay");
    const mainApp = document.getElementById("mainAppContent") || document.getElementById("mainWrapper");
    if (overlay) overlay.classList.add("d-none");
    if (mainApp) mainApp.classList.remove("d-none");
    // 앱 진입 시 버튼 상태 초기화
    setButtonLoading("loginBtn", false);
    setButtonLoading("signupBtn", false);
  };

  window.showPendingScreen = function () {
    const overlay = document.getElementById("authOverlay");
    if (overlay) overlay.classList.remove("d-none");
    showAuthTab("pending");
    const mainApp = document.getElementById("mainAppContent") || document.getElementById("mainWrapper");
    if (mainApp) mainApp.classList.add("d-none");
  };

  window.showAuthTab = function (tab) {
    document
      .querySelectorAll(".auth-panel")
      .forEach((p) => p.classList.add("d-none"));
    const target = document.getElementById("auth-" + tab);
    if (target) {
      target.classList.remove("d-none");
    }

    document
      .querySelectorAll(".auth-tab-btn")
      .forEach((b) => b.classList.remove("active"));
    const activeTab = document.querySelector(
      `.auth-tab-btn[data-tab="${tab}"]`,
    );
    if (activeTab) activeTab.classList.add("active");
  };

  // ─── 이메일 유효성 ──────────────────────────────────────────
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ─── 회원 가입 ──────────────────────────────────────────────
  window.doSignup = async function () {
    clearAuthMessage("signupMessage");
    const name = (document.getElementById("signupName") || {}).value?.trim();
    const email = (document.getElementById("signupEmail") || {}).value?.trim();
    const password = (document.getElementById("signupPassword") || {}).value;
    const passwordConfirm = (
      document.getElementById("signupPasswordConfirm") || {}
    ).value;

    if (!name || !email || !password) {
      return showAuthMessage("signupMessage", "⚠️ 모든 필드를 입력해 주세요.");
    }
    if (!isValidEmail(email)) {
      return showAuthMessage(
        "signupMessage",
        "⚠️ 올바른 이메일 형식을 입력해 주세요.",
      );
    }
    if (password.length < 6) {
      return showAuthMessage(
        "signupMessage",
        "⚠️ 비밀번호는 최소 6자 이상이어야 합니다.",
      );
    }
    if (password !== passwordConfirm) {
      return showAuthMessage(
        "signupMessage",
        "⚠️ 비밀번호가 일치하지 않습니다.",
      );
    }

    setButtonLoading("signupBtn", true);
    try {
      const cred = await window.firebaseAuth.createUserWithEmailAndPassword(
        email,
        password,
      );
      // 가입 요청은 실행 환경과 관계없이 항상 일반 사용자/승인 대기로 생성합니다.
      // 에뮬레이터 관리자 계정은 Emulator UI 또는 Admin SDK로 별도 생성해야 합니다.
      const autoApprove = false;
      
      // Firestore에 사용자 문서 생성
      await window.firebaseDb
        .collection(COLLECTION_USERS)
        .doc(cred.user.uid)
        .set({
          uid: cred.user.uid,
          email: email,
          name: name,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          approved: false,
          role: "user",
        });

      if (autoApprove) {
        showAuthMessage(
          "signupMessage",
          "✅ [로컬 테스트] 회원 가입이 완료되었습니다! 잠시 후 로그인 화면으로 이동합니다.",
          "success",
        );
      } else {
        showAuthMessage(
          "signupMessage",
          "✅ 회원 가입이 완료되었습니다! 관리자 승인 후 이용 가능합니다.",
          "success",
        );
      }
      // 이름 업데이트
      await cred.user.updateProfile({ displayName: name });
      
      // ✅ [FIX] 회원가입 시 자동 로그인된 세션을 바로 종료
      // 이렇게 해야 사용자가 명시적으로 로그인할 때 onAuthStateChanged가 정상적으로 다시 실행되어 Firestore 데이터를 제대로 읽어옵니다.
      await window.firebaseAuth.signOut();
      
      setTimeout(() => showAuthTab("login"), 2000);
    } catch (err) {
      const msg = getFirebaseErrorMessage(err.code);
      showAuthMessage("signupMessage", "❌ " + msg);
    } finally {
      setButtonLoading("signupBtn", false);
    }
  };

  // ─── 로그인 ─────────────────────────────────────────────────
  window.doLogin = async function () {
    clearAuthMessage("loginMessage");
    const email = (document.getElementById("loginEmail") || {}).value?.trim();
    const password = (document.getElementById("loginPassword") || {}).value;

    if (!email || !password) {
      return showAuthMessage(
        "loginMessage",
        "⚠️ 이메일과 비밀번호를 입력해 주세요.",
      );
    }

    setButtonLoading("loginBtn", true);
    try {
      await window.firebaseAuth.signInWithEmailAndPassword(email, password);
      // onAuthStateChanged가 상태 처리
    } catch (err) {
      const msg = getFirebaseErrorMessage(err.code);
      showAuthMessage("loginMessage", "❌ " + msg);
      setButtonLoading("loginBtn", false);
    }
  };

  // ─── 로그아웃 ───────────────────────────────────────────────
  window.doLogout = function () {
    // ux.js의 전역 커스텀 확인 모달 사용
    if (typeof window.showConfirm === "function") {
      window.showConfirm("로그아웃 하시겠습니까?", () => {
        window.doLogoutConfirmed();
      });
    } else {
      // fallback
      if (confirm("로그아웃 하시겠습니까?")) {
        window.doLogoutConfirmed();
      }
    }
  };

  window.doLogoutConfirmed = async function () {
    try {
      await window.firebaseAuth.signOut();
      currentUser = null;
      currentUserData = null;
      showAuthOverlay();
      showAuthTab("login");
    } catch (err) {
      console.error("로그아웃 오류:", err);
      alert("로그아웃 중 오류가 발생했습니다: " + err.message);
    }
  };

  window.doLogoutCancel = function () {
    const confirmEl = document.getElementById("logoutConfirmBox");
    if (confirmEl) confirmEl.style.setProperty("display", "none", "important");
  };

  // ─── 비밀번호 재설정 ────────────────────────────────────────
  window.doResetPassword = async function () {
    const email = prompt("가입한 이메일 주소를 입력해 주세요:");
    if (!email) return;
    if (!isValidEmail(email))
      return alert("⚠️ 올바른 이메일 형식을 입력해 주세요.");
    try {
      await window.firebaseAuth.sendPasswordResetEmail(email);
      alert(`✅ 비밀번호 재설정 이메일을 ${email}로 전송했습니다.`);
    } catch (err) {
      alert("❌ " + getFirebaseErrorMessage(err.code));
    }
  };

  // ─── 인증 상태 감지 ─────────────────────────────────────────
  window.firebaseAuth.onAuthStateChanged(async (user) => {
    if (!user) {
      currentUser = null;
      currentUserData = null;
      // showAuthOverlay(); // ⚠️ [변경] 자동 팝업 제거
      // showAuthTab("login");
      updateHeaderUserInfo(null);

      // ─── 로그아웃 시 읽기 전용 모드로 전환 ───
      window.editMode = false;
      if (typeof window.setReadOnlyMode === "function") {
        window.setReadOnlyMode(true);
      }
      return;
    }

    // ─── 인증 보장 헬퍼 ─────────────────────────────────────────
    window.ensureAuthenticated = function () {
      if (currentUser && currentUserData && currentUserData.approved) {
        return true;
      }
      showAuthOverlay();
      showAuthTab("login");
      if (currentUser && !currentUserData?.approved) {
        showPendingScreen();
      }
      return false;
    };

    currentUser = user;
    try {
      const doc = await window.firebaseDb
        .collection(COLLECTION_USERS)
        .doc(user.uid)
        .get();
      if (!doc.exists) {
        // Firestore 문서가 없는 경우 (구버전 사용자 또는 방금 가입한 경우)
        // ⚠️ 즉시 로그아웃 대신, 잠시 대기하거나 앱에서 처리하도록 함
        console.warn("⚠️ 사용자 정보를 Firestore에서 찾을 수 없습니다. (신규 가입 처리 중일 수 있음)");
        
        // 만약 로그인이 명시적으로 발생한 것이라면 (signup flow가 아니라면) 여기서 안내 메시지를 표시할 수 있습니다.
        // 여기서는 자동 로그아웃을 제거하고, 대신 showAuthOverlay를 통해 다시 시도하도록 유도합니다.
        // await window.firebaseAuth.signOut(); // ❌ 자동 로그아웃 제거
        
        updateHeaderUserInfo({ name: user.displayName || user.email, role: 'user' });
        showAuthOverlay();
        showAuthMessage(
          "loginMessage",
          "⚠️ 계정 정보를 Firestore에서 찾을 수 없습니다. 가입을 다시 시도하거나 잠시 기다려 주세요.",
        );
        return;
      }

      currentUserData = doc.data();
      window.currentUserData = currentUserData; // 전역 노출

      // ─── 사용자별 제작 지침서 로드 및 로컬 저장소 동기화 ───
      if (currentUserData && currentUserData.musicCreatorGuidelines) {
        const serverGuidelines = currentUserData.musicCreatorGuidelines.trim();
        if (serverGuidelines) {
          localStorage.setItem("musicCreatorGuidelines", serverGuidelines);
          localStorage.setItem("musicCreator_guidelines", serverGuidelines);
          console.log("📋 서버로부터 사용자별 제작 지침서 동기화 완료");
          
          const guidelinesText = document.getElementById("guidelinesText");
          if (guidelinesText) {
            guidelinesText.value = serverGuidelines;
          }
        }
      }

      if (!currentUserData.approved) {
        // 승인 대기 중
        showPendingScreen();
        updateHeaderUserInfo(currentUserData);
        return;
      }

      // 승인된 사용자 → 앱 진입
      hideAuthOverlay();
      updateHeaderUserInfo(currentUserData);
      buildHeaderMenu(currentUserData); // 설정 메뉴 항목 동적 생성

      // ─── 로그인 성공 시 수정 모드로 전환 ───
      window.editMode = true;
      if (typeof window.setReadOnlyMode === "function") {
        window.setReadOnlyMode(false);
      }

      // 공용 설정(API 키 등) 불러오기 (비동기 완료 대기)
      await fetchGlobalSettings();
      
      // ☁️ [클라우드 백업] 로그인 성공 시 클라우드에서 프로젝트 동기화 (비동기, 백그라운드)
      if (typeof window.syncProjectsFromCloud === "function") {
        window.syncProjectsFromCloud().then(async () => {
          // 🆕 신규 기기 감지: 클라우드에만 있는 프로젝트가 있으면 동기화 모달 팝업
          if (typeof window.getCloudOnlyProjects === "function") {
            const cloudOnly = await window.getCloudOnlyProjects();
            if (cloudOnly.length > 0) {
              // 약간의 딜레이로 앱이 완전히 로드된 후 모달 표시
              setTimeout(() => {
                if (typeof openCloudSyncModal === "function") {
                  openCloudSyncModal();
                }
              }, 1500);
            }
          }
        });
      }

      // 관리자 패널 및 설정 메뉴 표시 여부
      // 도움말 버튼: 관리자/일반 사용자 모두 표시
      const helpModalBtn = document.getElementById("helpModalBtn");
      if (helpModalBtn) helpModalBtn.style.display = "inline-flex";

      if (currentUserData.role === "admin") {
        // 헤더 "회원관리" 버튼은 설정 메뉴 "사용자 관리"로 대체됨 — 표시 안 함

        const adminMenuDropdown = document.getElementById("adminMenuDropdown");
        if (adminMenuDropdown) adminMenuDropdown.classList.remove("d-none");

        const apiKeyMenuBtn = document.getElementById("apiKeyMenuBtn");
        if (apiKeyMenuBtn) {
          apiKeyMenuBtn.classList.remove("d-none");
          apiKeyMenuBtn.classList.add("d-flex");
        }
      } else {
        const adminMenuDropdown = document.getElementById("adminMenuDropdown");
        if (adminMenuDropdown) adminMenuDropdown.classList.remove("d-none"); // 🌟 일반 사용자도 지침서/초기화 메뉴 접근 가능

        const apiKeyMenuBtn = document.getElementById("apiKeyMenuBtn");
        if (apiKeyMenuBtn) {
          apiKeyMenuBtn.classList.add("d-none");
          apiKeyMenuBtn.classList.remove("d-flex");
        }
      }

      console.log(
        `✅ 로그인 성공: ${currentUserData.name} (${currentUserData.role})`,
      );
    } catch (err) {
      console.error("사용자 데이터 로드 오류:", err);
      console.warn("⚠️ 통신 에러로 인해 오프라인 사용자 모드로 임시 세팅됩니다.");
      
      // 서버 연결 실패 시에도 기능을 작동할 수 있게 임시 사용자 세팅
      const fallbackUserData = { 
        uid: user.uid, 
        name: user.displayName || user.email || '오프라인 접속자', 
        role: 'user', 
        approved: true 
      };
      window.currentUserData = fallbackUserData;
      
      hideAuthOverlay();
      updateHeaderUserInfo(fallbackUserData);
      buildHeaderMenu(fallbackUserData);
      
      const adminMenuDropdown = document.getElementById("adminMenuDropdown");
      if (adminMenuDropdown) adminMenuDropdown.classList.remove("d-none");
      
      const apiKeyMenuBtn = document.getElementById("apiKeyMenuBtn");
      if (apiKeyMenuBtn) {
        apiKeyMenuBtn.classList.add("d-none");
        apiKeyMenuBtn.classList.remove("d-flex");
      }
      
      showAuthMessage(
        "loginMessage",
        "⚠️ 로컬 서버에서 파이어베이스 접속에 실패하여, 오프라인 권한으로 임시 접속되었습니다."
      );
    }
  });

  // ─── 공용 설정(API 키 등) 가져오기 ──────────────────────────
  async function fetchGlobalSettings() {
    if (currentUserData?.role !== "admin") {
      window.globalConfig = { useServerApiProxy: true };
      console.log("⚙️ 서버 API 프록시 설정 적용 완료");
      return;
    }

    try {
      const doc = await window.firebaseDb
        .collection("config")
        .doc("global_settings")
        .get();
      if (doc.exists) {
        window.globalConfig = doc.data();
        console.log("⚙️ 관리자 공용 설정 로드 완료");
      } else {
        window.globalConfig = {};
      }
    } catch (err) {
      console.error("공용 설정 로드 중 오류:", err);
      window.globalConfig = {};
    }
  }

  // ─── API 사용량 로깅 ────────────────────────────────────────
  window.logApiUsage = async function (provider) {
    const user = window.firebaseAuth.currentUser;
    if (!user) return;

    try {
      await window.firebaseDb.collection("api_usage").add({
        uid: user.uid,
        provider: provider,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      // 권한 부족이나 오프라인 상태일 때 과도한 에러 출력 방지
      // console.debug("📊 API 사용량 로깅 실패 (정상 동작 중):", err.message);
    }
  };

  // ─── 헤더 설정 메뉴 항목 동적 생성 ──────────────────────────
  function buildHeaderMenu(userData) {
    const menuContent = document.getElementById("headerMenuContent");
    if (!menuContent) return;
    menuContent.innerHTML = "";

    const isAdmin = userData && userData.role === "admin";

    // 복원 기능용 input 요소를 body에 안전하게 추가
    if (!document.getElementById("importFile")) {
      const input = document.createElement("input");
      input.type = "file";
      input.id = "importFile";
      input.accept = ".json";
      input.className = "d-none";
      input.onchange = function(event) { if (typeof window.handleImport === 'function') { window.handleImport(event); } this.value = ''; };
      input.title = "프로젝트 복원 파일(.json) 선택";
      document.body.appendChild(input);
    }

    const headerTitle = document.createElement("div");
    headerTitle.className = "admin-menu-header";
    headerTitle.textContent = isAdmin ? "관리자 설정 · 복구 · 초기화" : "설정 · 복구 · 초기화";
    menuContent.appendChild(headerTitle);

    // 메뉴 항목 목록 정의
    const menuItems = [];

    if (isAdmin) {
      menuItems.push(
        { icon: "fas fa-users-cog", label: "사용자 관리", action: "openAdminPanel()" },
        { icon: "fas fa-server", label: "공용 API 키 관리", action: "openGlobalApiKeyModal()" },
        { icon: "fas fa-key", label: "API 관리", action: "openAPISettings()", dividerAfter: true }
      );
    } else {
      menuItems.push(
        { icon: "fas fa-key", label: "API 설정", action: "openAPISettings()", dividerAfter: true }
      );
    }

    menuItems.push(
      { icon: "fas fa-book-open", label: "제작 지침서", action: "handleHeaderButtonClick('openGuidelinesModal', event)" },
      { icon: "fas fa-download", label: "백업", action: "handleHeaderButtonClick('manualBackup', event)" },
      { icon: "fas fa-history", label: "복원", action: "if(typeof openRestoreModal === 'function') { openRestoreModal(); }" },
      { icon: "fas fa-cloud", label: "클라우드 동기화", action: "if(typeof openCloudSyncModal === 'function') { openCloudSyncModal(); }", dividerAfter: true },
      { icon: "fas fa-undo", label: "단계 초기화", action: "handleHeaderButtonClick('resetCurrentStep', event)", danger: true },
      { icon: "fas fa-redo", label: "전체 초기화", action: "handleHeaderButtonClick('resetAllSteps', event)", danger: true },
      { icon: "fas fa-arrows-alt", label: "순서 초기화", action: "handleHeaderButtonClick('resetStepOrder', event)", danger: true },
      { icon: "fas fa-question-circle", label: "도움말", action: "handleHeaderButtonClick('openStepOrderHelp', event)" }
    );

    menuItems.forEach(({ icon, label, action, danger, dividerAfter }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "admin-menu-item" + (danger ? " danger" : "");
      
      btn.setAttribute(
        "onclick",
        "event.preventDefault(); event.stopPropagation(); " + action + "; if(typeof window.closeAdminMenu === 'function') { window.closeAdminMenu(); }"
      );
      btn.innerHTML = `<i class="${icon}"></i><span>${label}</span>`;
      menuContent.appendChild(btn);

      if (dividerAfter) {
        const hr = document.createElement("div");
        hr.className = "admin-menu-divider";
        menuContent.appendChild(hr);
      }
    });
  }

  // ─── 헤더 사용자 정보 업데이트 ──────────────────────────────
  function updateHeaderUserInfo(userData) {
    const userInfoDiv = document.getElementById("headerUserInfo");
    const userNameEl = document.getElementById("headerUserName");
    const userRoleEl = document.getElementById("headerUserRole");
    const logoutBtn = document.getElementById("headerLogoutBtn");
    const loginBtn = document.getElementById("headerLoginBtn");

    if (!userData) {
      // 로그아웃 상태: 로그인 버튼 보이기, 유저정보 숨기기
      if (loginBtn) loginBtn.classList.remove("d-none");
      if (userInfoDiv) userInfoDiv.classList.add("d-none");
      if (userNameEl) userNameEl.textContent = "";
      if (userRoleEl) userRoleEl.textContent = "";
      if (logoutBtn) logoutBtn.classList.add("d-none");
      
      const adminMenuDropdown = document.getElementById("adminMenuDropdown");
      if (adminMenuDropdown) adminMenuDropdown.classList.add("d-none");
      return;
    }

    // 로그인 상태: 로그인 버튼 숨기기, 유저정보 보이기
    if (loginBtn) loginBtn.classList.add("d-none");
    if (userInfoDiv) userInfoDiv.classList.remove("d-none");
    if (userNameEl) userNameEl.textContent = userData.name || userData.email;
    if (userRoleEl)
      userRoleEl.textContent = userData.role === "admin" ? "👑 관리자" : "";
    if (logoutBtn) logoutBtn.classList.remove("d-none");
  }

  // ─── Firebase 오류 메시지 한글화 ────────────────────────────
  function getFirebaseErrorMessage(code) {
    const messages = {
      "auth/user-not-found": "등록되지 않은 이메일입니다.",
      "auth/wrong-password": "비밀번호가 올바르지 않습니다.",
      "auth/email-already-in-use": "이미 사용 중인 이메일입니다.",
      "auth/weak-password": "비밀번호가 너무 약합니다. (6자 이상 필요)",
      "auth/invalid-email": "올바른 이메일 형식이 아닙니다.",
      "auth/too-many-requests":
        "너무 많은 시도를 했습니다. 잠시 후 다시 시도해 주세요.",
      "auth/network-request-failed":
        "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.",
      "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
      "auth/user-disabled":
        "이 계정은 비활성화되었습니다. 관리자에게 문의해 주세요.",
    };
    return messages[code] || "오류가 발생했습니다. (" + code + ")";
  }

  // ─── Enter 키 로그인 지원 ────────────────────────────────────
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const overlay = document.getElementById("authOverlay");
      if (overlay && !overlay.classList.contains("d-none")) {
        hideAuthOverlay();
        return;
      }
    }

    if (e.key === "Enter") {
      const loginPanel = document.getElementById("auth-login");
      const signupPanel = document.getElementById("auth-signup");
      if (loginPanel && !loginPanel.classList.contains("d-none")) {
        window.doLogin();
      } else if (signupPanel && !signupPanel.classList.contains("d-none")) {
        window.doSignup();
      }
    }
  });

  console.log("✅ auth.js 로드 완료");
})();
