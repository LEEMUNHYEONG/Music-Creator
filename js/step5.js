// ==========================================
// js/step5.js - Music Creator
// ==========================================

// --- Extracted setTagSelections ---
window.setTagSelections = function(containerId, values) {
    if (!values || !Array.isArray(values) || values.length === 0) return;
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.tag-btn').forEach(btn => {
        if (btn.classList.contains('custom-tag-btn')) return;
        const v = btn.getAttribute('data-value') || btn.textContent.trim();
        btn.classList.toggle('active', values.indexOf(v) !== -1);
    });
};

