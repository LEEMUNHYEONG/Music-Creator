// === MV Step 6: Legacy cross-step helpers ===
// 가사 작성 모드 전환 함수
window.switchLyricsMode = function (mode) {
  try {
    const manualMode = document.getElementById("manualMode");
    const aiMode = document.getElementById("aiMode");
    const commonOptions = document.getElementById("commonOptions");
    const manualTab = document.querySelector('.mode-tab[data-mode="manual"]');
    const aiTab = document.querySelector('.mode-tab[data-mode="ai"]');

    if (!manualMode || !aiMode) {
      console.warn("⚠️ 모드 요소를 찾을 수 없습니다.");
      return;
    }

    if (mode === "manual") {
      // 직접 작성 모드
      manualMode.classList.add("active");
      aiMode.classList.remove("active");
      if (manualTab) manualTab.classList.add("active");
      if (aiTab) aiTab.classList.remove("active");
      // 공통 옵션(장르·분위기·가사길이·AI 생성 버튼) 숨김
      if (commonOptions) commonOptions.style.display = "none";
      console.log("✅ 가사 작성 모드: 직접 작성");
    } else if (mode === "ai") {
      // AI 생성 모드
      manualMode.classList.remove("active");
      aiMode.classList.add("active");
      if (manualTab) manualTab.classList.remove("active");
      if (aiTab) aiTab.classList.add("active");
      // 공통 옵션(장르·분위기·가사길이·AI 생성 버튼) 표시
      if (commonOptions) commonOptions.style.display = "block";
      console.log("✅ 가사 작성 모드: AI 생성");

      // AI 모드로 전환 시 태그 버튼 이벤트 리스너 초기화
      initializeTagButtons();
    }
  } catch (error) {
    console.error("❌ 모드 전환 오류:", error);
    alert("모드 전환 중 오류가 발생했습니다:\n\n" + error.message);
  }
};

