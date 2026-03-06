// ==========================================
// js/step5.js - Music Creator
// ==========================================

// --- Extracted setTagSelections ---
window.setTagSelections = function (containerId, values) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 기존 활성화된 태그 초기화
  container.querySelectorAll(".tag-btn").forEach((btn) => {
    if (!btn.classList.contains("custom-tag-btn")) {
      btn.classList.remove("active");
    }
  });

  // 적용할 값이 없으면 스킵
  if (!values || !Array.isArray(values) || values.length === 0) return;

  // 전달받은 값 다시 활성화
  container.querySelectorAll(".tag-btn").forEach((btn) => {
    if (btn.classList.contains("custom-tag-btn")) return;
    const v = btn.getAttribute("data-value") || btn.textContent.trim();
    if (values.indexOf(v) !== -1) {
      btn.classList.add("active");
    }
  });
};
