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
    const mainApp = document.getElementById("mainAppContent");
    if (overlay) overlay.style.display = "flex";
    if (mainApp) mainApp.style.display = "none";
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
    const mainApp = document.getElementById("mainAppContent");
    if (overlay) overlay.style.display = "none";
    if (mainApp) mainApp.style.display = "block";
    // 앱 진입 시 버튼 상태 초기화
    setButtonLoading("loginBtn", false);
    setButtonLoading("signupBtn", false);
  };

  window.showPendingScreen = function () {
    const overlay = document.getElementById("authOverlay");
    if (overlay) overlay.style.display = "flex";
    showAuthTab("pending");
    const mainApp = document.getElementById("mainAppContent");
    if (mainApp) mainApp.style.display = "none";
  };

  window.showAuthTab = function (tab) {
    document
      .querySelectorAll(".auth-panel")
      .forEach((p) => (p.style.display = "none"));
    const target = document.getElementById("auth-" + tab);
    if (target) target.style.display = "block";

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
      showAuthMessage(
        "signupMessage",
        "✅ 회원 가입이 완료되었습니다! 관리자 승인 후 이용 가능합니다.",
        "success",
      );
      // 이름 업데이트
      await cred.user.updateProfile({ displayName: name });
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
        // Firestore 문서가 없는 경우 (구버전 사용자 등)
        await window.firebaseAuth.signOut();
        showAuthOverlay();
        showAuthMessage(
          "loginMessage",
          "⚠️ 계정 정보를 찾을 수 없습니다. 다시 가입해 주세요.",
        );
        return;
      }

      currentUserData = doc.data();
      window.currentUserData = currentUserData; // 전역 노출

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

      // 공용 설정(API 키 등) 불러오기
      fetchGlobalSettings();

      // 관리자 패널 및 설정 메뉴 표시 여부
      // 도움말 버튼: 관리자/일반 사용자 모두 표시
      const helpModalBtn = document.getElementById("helpModalBtn");
      if (helpModalBtn) helpModalBtn.style.display = "inline-flex";

      if (currentUserData.role === "admin") {
        // 헤더 "회원관리" 버튼은 설정 메뉴 "사용자 관리"로 대체됨 — 표시 안 함

        const adminMenuDropdown = document.getElementById("adminMenuDropdown");
        if (adminMenuDropdown) adminMenuDropdown.style.display = "block";

        const apiKeyMenuBtn = document.getElementById("apiKeyMenuBtn");
        if (apiKeyMenuBtn) apiKeyMenuBtn.style.display = "flex";
      } else {
        const adminMenuDropdown = document.getElementById("adminMenuDropdown");
        if (adminMenuDropdown) adminMenuDropdown.style.display = "block"; // 🌟 일반 사용자도 지침서/초기화 메뉴 접근 가능

        const apiKeyMenuBtn = document.getElementById("apiKeyMenuBtn");
        if (apiKeyMenuBtn) apiKeyMenuBtn.style.display = "none";
      }

      console.log(
        `✅ 로그인 성공: ${currentUserData.name} (${currentUserData.role})`,
      );
    } catch (err) {
      console.error("사용자 데이터 로드 오류:", err);
      // showAuthOverlay(); // ⚠️ [변경] 자동 팝업 제거
      showAuthMessage(
        "loginMessage",
        "❌ 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
  });

  // ─── 공용 설정(API 키 등) 가져오기 ──────────────────────────
  async function fetchGlobalSettings() {
    try {
      const doc = await window.firebaseDb
        .collection("config")
        .doc("global_settings")
        .get();
      if (doc.exists) {
        window.globalConfig = doc.data();
        console.log("⚙️ 공용 설정 로드 완료 (API 키 포함)");
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
      // ⚠️ 권한 부족 등 비정상 상황이더라도 앱 동작에는 지장이 없으므로 trace 정보만 남김
      if (err.code === "permission-denied") {
        console.debug("📊 API 사용량 로깅 권한 없음 (무시됨)");
      } else {
        console.warn("📊 API 사용량 로깅 실패:", err.message);
      }
    }
  };

  // ─── 헤더 설정 메뉴 항목 동적 생성 ──────────────────────────
  function buildHeaderMenu(userData) {
    const menuContent = document.getElementById("headerMenuContent");
    if (!menuContent) return;
    menuContent.innerHTML = "";

    const isAdmin = userData && userData.role === "admin";

    // 메뉴 항목 목록 정의
    const menuItems = [];

    if (isAdmin) {
      menuItems.push(
        {
          icon: "fas fa-users-cog",
          label: "사용자 관리",
          action: "openAdminPanel()",
        },
        {
          icon: "fas fa-server",
          label: "공용 API 키 관리",
          action: "openGlobalApiKeyModal()",
        },
        {
          icon: "fas fa-key",
          label: "API 관리",
          action: "openAPISettings()",
          dividerAfter: true,
        },
      );
    }

    menuItems.push(
      {
        icon: "fas fa-book-open",
        label: "제작 지침서",
        action: "openGuidelinesModal()",
      },
      {
        icon: "fas fa-undo-alt",
        label: "현재단계 초기화",
        action: "resetCurrentStep()",
        danger: true,
      },
      {
        icon: "fas fa-trash-alt",
        label: "전체 초기화",
        action: "resetAllSteps()",
        danger: true,
      },
    );

    menuItems.forEach(({ icon, label, action, danger, dividerAfter }) => {
      const btn = document.createElement("button");
      btn.className = "admin-menu-item" + (danger ? " danger" : "");
      btn.setAttribute(
        "onclick",
        action + "; window.closeAdminMenu && window.closeAdminMenu();",
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
      if (loginBtn) loginBtn.style.display = "inline-flex";
      if (userInfoDiv) userInfoDiv.style.display = "none";
      if (userNameEl) userNameEl.textContent = "";
      if (userRoleEl) userRoleEl.textContent = "";
      if (logoutBtn) logoutBtn.style.display = "none";
      return;
    }

    // 로그인 상태: 로그인 버튼 숨기기, 유저정보 보이기
    if (loginBtn) loginBtn.style.display = "none";
    if (userInfoDiv) userInfoDiv.style.display = "flex";
    if (userNameEl) userNameEl.textContent = userData.name || userData.email;
    if (userRoleEl)
      userRoleEl.textContent = userData.role === "admin" ? "👑 관리자" : "";
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
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
    if (e.key === "Enter") {
      const loginPanel = document.getElementById("auth-login");
      const signupPanel = document.getElementById("auth-signup");
      if (loginPanel && loginPanel.style.display !== "none") {
        window.doLogin();
      } else if (signupPanel && signupPanel.style.display !== "none") {
        window.doSignup();
      }
    }
  });

  console.log("✅ auth.js 로드 완료");
})();
