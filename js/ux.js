// ux.js - User Experience Enhancements
(function () {
  // 1. Toast Notification System
  window.showToast = function (message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.style.cssText =
        "position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");

    let bgColor = "var(--bg-card)";
    let textColor = "var(--text-primary)";
    let borderColor = "var(--border)";

    if (type === "success") {
      borderColor = "var(--success)";
    } else if (type === "error") {
      borderColor = "var(--error)";
    }

    toast.style.cssText = `
            background: ${bgColor};
            color: ${textColor};
            padding: 12px 20px;
            border-radius: 8px;
            border-left: 4px solid ${borderColor};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 0.9rem;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 340px;
            word-wrap: break-word;
            white-space: pre-line;
        `;
    toast.innerText = message;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(0)";
    });

    // 긴/여러 줄 메시지는 읽을 시간을 더 준다 (3~8초)
    const displayMs = Math.min(8000, Math.max(3000, String(message).length * 45));
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (container.contains(toast)) container.removeChild(toast);
      }, 300);
    }, displayMs);
  };

  // Replace ALL native alert() calls with showToast() for persistent visual feedback.
  // Native alert() is a blocking modal that vanishes immediately after clicking OK,
  // which users perceive as "flashing and disappearing". showToast() stays visible for 3 seconds.
  const originalAlert = window.alert;
  window.alert = function (message) {
    if (!message) return;
    const msg = String(message);

    // Determine toast type based on message content.
    // 오류 신호를 먼저 검사한다 — "저장 완료" 문구와 "오류"가 함께 있으면 오류다.
    let type = "info";
    if (
      msg.includes("❌") ||
      msg.includes("⚠️") ||
      msg.includes("오류") ||
      msg.includes("실패") ||
      msg.includes("없습니다") ||
      msg.includes("찾을 수 없") ||
      msg.includes("Error")
    ) {
      type = "error";
    } else if (
      msg.includes("✅") ||
      msg.includes("완료") ||
      msg.includes("성공") ||
      msg.includes("저장되었") ||
      msg.includes("복사되었") ||
      msg.includes("삭제되었") ||
      msg.includes("확정되었") ||
      msg.includes("복제되었")
    ) {
      type = "success";
    }

    // 이스케이프된 개행만 실제 개행으로 바꾸고 줄바꿈은 보존한다 (토스트가 pre-line 렌더링)
    const cleanMsg = msg.replace(/\\n/g, "\n").trim();

    window.showToast(cleanMsg, type);
  };

  // 2. Keyboard Shortcuts
  window.initShortcuts = function () {
    document.addEventListener("keydown", function (e) {
      // Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (typeof window.saveCurrentProject === "function") {
          window.saveCurrentProject();
          window.showToast("✅ 프로젝트가 저장되었습니다.", "success");
        }
      }

      // ESC to close modals
      if (e.key === "Escape") {
        const overlays = document.querySelectorAll(".modal-overlay.show");
        overlays.forEach((overlay) => {
          overlay.classList.remove("show");
        });
      }

      // Ctrl/Cmd + 1~6 for quick step navigation
      if ((e.ctrlKey || e.metaKey) && e.key >= "1" && e.key <= "6") {
        const step = parseInt(e.key);
        if (typeof window.goToStep === "function") {
          e.preventDefault();
          window.goToStep(step, true, true);
          window.showToast(`✅ ${step}단계로 이동했습니다.`, "success");
        }
      }
    });
  };

  // 3. Auto-save
  // 주기적 자동저장 타이머는 js/storage.js(60초)가 단일 담당한다.
  // 과거 이 파일에도 동일 주기 타이머가 있어 저장·히스토리 기록이 이중으로
  // 발생했으므로 여기서는 등록하지 않는다.
  window.initAutoSave = function () {};

  // 4. Suno One-click Copy (to be injected to UI later, function defined here)
  window.copyForSuno = function (lyricsId, styleId) {
    const lyrics =
      document.getElementById(lyricsId)?.value ||
      document.getElementById(lyricsId)?.textContent ||
      "";
    const style =
      document.getElementById(styleId)?.value ||
      document.getElementById(styleId)?.textContent ||
      "";

    const fullPrompt = `[Style Prompt]\n${style}\n\n[Lyrics]\n${lyrics}`;

    navigator.clipboard
      .writeText(fullPrompt)
      .then(() => {
        window.showToast(
          "✅ Suno용 가사와 프롬프트가 복사되었습니다.",
          "success",
        );
      })
      .catch((err) => {
        window.showToast("❌ 복사 실패: " + err, "error");
      });
  };

  // 5. Generic Copy to Clipboard, 6. Show Copy Indicator
  // → 둘 다 app.js가 나중에 로드되며 더 많은 호출 규약(elementId=null일 때
  //   직접 텍스트로 처리하는 경우 등)을 지원하는 자체 버전으로 덮어쓰므로
  //   여기 정의해도 항상 가려지는 죽은 코드였다. app.js 쪽 정의만 유지한다.
  window.copyTitleToClipboard = function (event) {
    window.copyToClipboard("finalTitleText", "제목", event);
  };

  // 7. Custom Confirmation Modal
  // 네이티브 window.confirm()을 대체 — JS 실행을 막지 않고, showToast처럼
  // 필요한 DOM을 그때그때 직접 생성한다 (정적 마크업 #customConfirmModal이
  // index.html에 실제로는 존재하지 않아 지금까지는 항상 네이티브로 폴백되고 있었음).
  window.showConfirm = function (message, onConfirm, onCancel) {
    let overlay = document.getElementById("customConfirmModal");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "customConfirmModal";
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 100000;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.5);
        opacity: 0; transition: opacity 0.15s ease;
      `;
      overlay.innerHTML = `
        <div style="
          background: var(--bg-card, #1e1e2e); color: var(--text-primary, #fff);
          border: 1px solid var(--border, rgba(255,255,255,0.12));
          border-radius: 12px; padding: 20px 24px; max-width: 400px; width: 90%;
          box-shadow: 0 12px 32px rgba(0,0,0,0.35);
          transform: translateY(8px); transition: transform 0.15s ease;
        ">
          <div id="confirmMessage" style="white-space: pre-line; line-height: 1.6; margin-bottom: 18px; font-size: 0.95rem;"></div>
          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="confirmNoBtn" type="button" class="btn btn-secondary" style="padding: 8px 16px; border-radius: 8px; cursor: pointer;">취소</button>
            <button id="confirmYesBtn" type="button" class="btn btn-primary" style="padding: 8px 16px; border-radius: 8px; cursor: pointer;">확인</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      // 배경 클릭으로 닫기 = 취소
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) overlay.__cancel && overlay.__cancel();
      });
    }

    const msgEl = overlay.querySelector("#confirmMessage");
    const yesBtn = overlay.querySelector("#confirmYesBtn");
    const noBtn = overlay.querySelector("#confirmNoBtn");
    const box = overlay.firstElementChild;

    msgEl.innerText = message;
    overlay.style.display = "flex";
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      box.style.transform = "translateY(0)";
    });

    let settled = false;
    function close() {
      overlay.style.opacity = "0";
      box.style.transform = "translateY(8px)";
      setTimeout(() => {
        overlay.style.display = "none";
      }, 150);
    }
    // Yes/No 버튼 클릭, 배경 클릭, Escape 중 어느 경로로 닫히든
    // keydown 리스너가 반드시 해제되도록 정리 함수를 한 곳에 모은다.
    // (이전에는 Escape 경로에서만 해제되어, 버튼으로 닫을 때마다
    //  document에 keydown 리스너가 영구히 누적되는 누수가 있었음)
    function handleYes(e) {
      if (e) e.preventDefault();
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKeydown);
      close();
      if (onConfirm) onConfirm();
    }
    function handleCancel(e) {
      if (e) e.preventDefault();
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKeydown);
      close();
      if (onCancel) onCancel();
    }
    overlay.__cancel = handleCancel;

    // 이전 리스너 정리를 위해 버튼을 매번 새로 붙인다
    const newYesBtn = yesBtn.cloneNode(true);
    const newNoBtn = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    noBtn.parentNode.replaceChild(newNoBtn, noBtn);
    newYesBtn.onclick = handleYes;
    newNoBtn.onclick = handleCancel;

    // Escape 키로 취소
    function onKeydown(e) {
      if (e.key === "Escape") handleCancel();
    }
    document.addEventListener("keydown", onKeydown);
  };

  // Promise 기반 버전 — `if (!(await window.showConfirmAsync(msg))) return;` 형태로
  // 기존 `if (!confirm(msg)) return;` 패턴을 그대로 치환할 수 있다.
  window.showConfirmAsync = function (message) {
    return new Promise((resolve) => {
      window.showConfirm(
        message,
        () => resolve(true),
        () => resolve(false),
      );
    });
  };

  // 8. Help Modal System
  window.openHelpModal = function () {
    const modal = document.getElementById("helpModal");
    if (modal) {
      // 강제 숨김 스크립트의 !important 파훼를 위해 인라인 속성 우선 적용 설정
      modal.style.setProperty("display", "flex", "important");
      modal.style.setProperty("pointer-events", "auto", "important");
      modal.style.setProperty("z-index", "100000", "important");
      modal.style.setProperty("opacity", "1", "important");
      modal.style.setProperty("visibility", "visible", "important");

      modal.classList.add("show");
      // Default to intro tab
      window.switchHelpTab("intro");
    }
  };

  window.closeHelpModal = function () {
    const modal = document.getElementById("helpModal");
    if (modal) {
      modal.classList.remove("show");
      modal.style.setProperty("display", "none", "important");
      modal.style.setProperty("pointer-events", "none", "important");
      modal.style.setProperty("opacity", "0", "important");
      modal.style.setProperty("visibility", "hidden", "important");
    }
  };

  window.switchHelpTab = function (tabName) {
    // Buttons
    document.querySelectorAll(".help-tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    const activeBtn = document.querySelector(
      `.help-tab-btn[onclick*="switchHelpTab('${tabName}')"]`,
    );
    if (activeBtn) activeBtn.classList.add("active");

    // Content
    document.querySelectorAll(".help-content").forEach((content) => {
      content.style.display = "none";
    });
    const targetContent = document.getElementById(`helpTab-${tabName}`);
    if (targetContent) targetContent.style.display = "block";
  };

  // Initialize after DOM load
  document.addEventListener("DOMContentLoaded", () => {
    window.initShortcuts();
    window.initAutoSave();
  });
})();
