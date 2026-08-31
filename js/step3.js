// ==========================================
// js/step3.js - Music Creator
// ==========================================

// --- Extracted goToStep4AndApplyImprovements ---
window.goToStep4AndApplyImprovements = function () {
  try {
    // "다음 단계로" 버튼 클릭 시 수정 모드 활성화 (데이터 수정 반영)
    window.editMode = true;
    if (typeof window.updateEditModeUI === "function") {
      window.updateEditModeUI();
    }
    if (typeof window.setReadOnlyMode === "function") {
      window.setReadOnlyMode(false);
    }

    // 2단계 또는 3단계에서 가사와 스타일 가져오기
    const sunoLyrics = document.getElementById("sunoLyrics")?.value || "";
    const stylePrompt = document.getElementById("stylePrompt")?.value || "";
    const sunoTitle =
      document.getElementById("sunoTitle")?.value ||
      window.currentSunoTitle ||
      "";

    // ═══════════════════════════════════════════════════════════════
    // 3단계 데이터를 4단계로 전달 (최신화 보장)
    // ═══════════════════════════════════════════════════════════════

    // 4단계 확정 가사 필드 업데이트
    const finalizedLyricsEl = document.getElementById("finalizedLyrics");
    if (finalizedLyricsEl) {
      const currentFinalized = finalizedLyricsEl.value.trim();
      // 비어있거나, 사용자가 이전 단계 가사를 최신화하길 원하는 경우
      if (
        !currentFinalized ||
        (currentFinalized !== sunoLyrics &&
          confirm(
            "4단계의 기존 확정 가사가 현재 가사와 다릅니다. 현재 가사로 최신화하시겠습니까?",
          ))
      ) {
        finalizedLyricsEl.value = sunoLyrics;
        console.log("✅ 4단계 확정 가사 최신화 완료");
      }
    }

    // 4단계 확정 스타일 필드 업데이트
    const finalizedStyleEl = document.getElementById("finalizedStyle");
    if (finalizedStyleEl) {
      const currentStyle = finalizedStyleEl.value.trim();
      if (
        !currentStyle ||
        (currentStyle !== stylePrompt &&
          confirm(
            "4단계의 기존 확정 스타일이 현재 스타일과 다릅니다. 현재 스타일로 최신화하시겠습니까?",
          ))
      ) {
        finalizedStyleEl.value = stylePrompt;
        console.log("✅ 4단계 확정 스타일 최신화 완료");
      }
    }

    // 제목도 전역 변수에 저장 (이후 단계에서 사용)
    if (sunoTitle) {
      window.currentSunoTitle = sunoTitle;
    }

    // ═══════════════════════════════════════════════════════════════

    if (typeof window.goToStep === "function") {
      window.goToStep(4, true, false);
      console.log("✅ 3단계 → 4단계 이동 완료 (가사, 스타일 프롬프트 전달됨)");
    }

    // 개선안 카드 표시
    const improvementCard = document.getElementById("improvementCard");
    const improvementLoading = document.getElementById("improvementLoading");
    if (improvementCard && improvementLoading) {
      improvementLoading.style.display = "none";
      improvementCard.classList.remove("hidden");
      improvementCard.style.display = "block";
    }

    // 3단계 분석 결과에서 개선안 표시
    // currentProject.data.analysis 우선, 없으면 전역 백업(__lastAnalysisData) 사용
    const analysisData =
      (window.currentProject && window.currentProject.data && window.currentProject.data.analysis) ||
      window.__lastAnalysisData ||
      null;

    if (analysisData) {
      console.log("✅ 4단계 개선안 표시 - 데이터 소스:", 
        (window.currentProject && window.currentProject.data && window.currentProject.data.analysis)
          ? "currentProject.data.analysis" : "window.__lastAnalysisData");
      displayImprovements(analysisData);
    } else {
      console.warn("⚠️ 분석 데이터 없음: 3단계에서 분석을 먼저 실행해주세요.");
      const suggestionsContainer = document.getElementById("geminiSuggestionsSummary");
      if (suggestionsContainer) {
        suggestionsContainer.innerHTML =
          '<div style="text-align: center; padding: 20px; color: var(--warning);">⚠️ 3단계에서 AI 분석을 먼저 실행한 후 이 버튼을 클릭해주세요.</div>';
      }
    }
  } catch (error) {
    console.error("❌ 3→4단계 이동 오류:", error);
    alert(
      "⚠️ 3단계 → 4단계 이동 중 오류가 발생했습니다.\n\n" +
        "원인: " +
        error.message +
        "\n\n" +
        "해결방법: 페이지를 새로고침(F5) 후 다시 시도해주세요.",
    );
  }
};
