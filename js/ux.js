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
            max-width: 300px;
            word-wrap: break-word;
        `;
    toast.innerText = message;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(0)";
    });

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (container.contains(toast)) container.removeChild(toast);
      }, 300);
    }, 3000);
  };

  // Replace ALL native alert() calls with showToast() for persistent visual feedback.
  // Native alert() is a blocking modal that vanishes immediately after clicking OK,
  // which users perceive as "flashing and disappearing". showToast() stays visible for 3 seconds.
  const originalAlert = window.alert;
  window.alert = function (message) {
    if (!message) return;
    const msg = String(message);

    // Determine toast type based on message content
    let type = "info";
    if (
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
    } else if (
      msg.includes("❌") ||
      msg.includes("⚠️") ||
      msg.includes("오류") ||
      msg.includes("실패") ||
      msg.includes("없습니다") ||
      msg.includes("찾을 수 없") ||
      msg.includes("Error")
    ) {
      type = "error";
    }

    // Convert newlines to spaces for toast display (toast is single-line friendly)
    const cleanMsg = msg.replace(/\\n/g, " ").replace(/\n/g, " ").trim();

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

  // 3. Auto-save (Drafting)
  window.initAutoSave = function () {
    setInterval(() => {
      if (
        window.currentProjectId &&
        typeof window.saveCurrentProject === "function" &&
        window.editMode !== false
      ) {
        // save in background quietly
        const activeEl = document.activeElement;
        if (
          activeEl &&
          (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")
        ) {
          // Only autosave if user is actively typing? Actually just save periodically.
          window.saveCurrentProject(true); // maybe pass a flag to not alert
          // Update a subtle UI indicator
          const header = document.querySelector(".header-title");
          if (header && !header.innerHTML.includes("autosave-indicator")) {
            const ind = document.createElement("span");
            ind.id = "autosave-indicator";
            ind.style.cssText =
              "font-size: 0.75rem; color: var(--text-secondary); margin-left: 10px; opacity: 0;";
            ind.innerText = "저장됨";
            header.appendChild(ind);
          }
          const ind = document.getElementById("autosave-indicator");
          if (ind) {
            ind.style.opacity = "1";
            setTimeout(() => (ind.style.opacity = "0"), 2000);
          }
        }
      }
    }, 60000); // every 60 seconds
  };

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

  // 5. Generic Copy to Clipboard
  window.copyToClipboard = function (elementId, labelName, event) {
    if (event) event.stopPropagation();
    const el = document.getElementById(elementId);
    let textToCopy = "";

    if (el) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        textToCopy = el.value || "";
      } else {
        textToCopy = el.textContent || "";
      }
    }

    if (!textToCopy) {
      window.showToast(`⚠️ 복사할 ${labelName} 내용이 없습니다.`, "error");
      return;
    }

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        window.showToast(`✅ ${labelName} 복사되었습니다.`, "success");
      })
      .catch((err) => {
        window.showToast(`❌ ${labelName} 복사 실패: ` + err, "error");
      });
  };

  window.copyTitleToClipboard = function (event) {
    window.copyToClipboard("finalTitleText", "제목", event);
  };

  // 6. Show Copy Indicator (used extensively in index.html for save/copy feedback)
  window.showCopyIndicator = function (message) {
    window.showToast(message, message.includes("❌") ? "error" : "success");
  };

  // 7. Custom Confirmation Modal
  // Replaces native window.confirm() to prevent blocking and accidental page reloads.
  window.showConfirm = function (message, onConfirm, onCancel) {
    const modal = document.getElementById("customConfirmModal");
    const msgEl = document.getElementById("confirmMessage");
    const yesBtn = document.getElementById("confirmYesBtn");
    const noBtn = document.getElementById("confirmNoBtn");

    if (!modal || !msgEl || !yesBtn || !noBtn) {
      // Fallback if HTML is not yet present
      if (window.confirm(message)) {
        if (onConfirm) onConfirm();
      } else {
        if (onCancel) onCancel();
      }
      return;
    }

    msgEl.innerText = message;
    // 인덱스의 강제 숨김 스크립트가 추가한 인라인 스타일(display: none !important 등) 제거
    modal.style.cssText = "";
    modal.classList.add("show");

    // Clean up previous listeners
    const newYesBtn = yesBtn.cloneNode(true);
    const newNoBtn = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    noBtn.parentNode.replaceChild(newNoBtn, noBtn);

    newYesBtn.onclick = function (e) {
      if (e) e.preventDefault();
      modal.classList.remove("show");
      if (onConfirm) onConfirm();
    };

    newNoBtn.onclick = function (e) {
      if (e) e.preventDefault();
      modal.classList.remove("show");
      if (onCancel) onCancel();
    };
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
