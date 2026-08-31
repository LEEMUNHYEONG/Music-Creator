// ==========================================
// js/step2.js - Music Creator
// ==========================================

// --- Extracted convertToSuno ---
window.convertToSuno = function () {
  const originalLyrics = document.getElementById("originalLyrics")?.value || "";
  const stylePrompt = document.getElementById("manualStylePrompt")?.value || "";

  if (!originalLyrics.trim()) {
    window.showToast("가사를 먼저 입력해주세요.", "info");
    return;
  }

  // 실제 구현은 AI API 호출 필요
  const sunoEl = document.getElementById("sunoLyrics");
  const styleEl = document.getElementById("stylePrompt");

  if (sunoEl) {
    sunoEl.value = originalLyrics; // 임시
    if (typeof window.autoResizeTextarea === "function") {
      requestAnimationFrame(function () {
        window.autoResizeTextarea(sunoEl);
      });
    }
  }
  if (styleEl && stylePrompt) {
    styleEl.value = stylePrompt;
  }

  window.showToast("수노 변환 기능은 구현 중입니다.", "info");
};

// --- Extracted showCustomTagInput ---
window.showCustomTagInput = async function (containerId) {
  try {
    const container = document.getElementById(containerId);
    if (!container) {
      window.showToast("태그 컨테이너를 찾을 수 없습니다.", "error");
      return;
    }

    const customTag = await window.showPromptAsync("추가할 태그를 입력하세요:");
    if (customTag && customTag.trim()) {
      // 새 태그 버튼 생성
      const newTagBtn = document.createElement("button");
      newTagBtn.className = "tag-btn";
      newTagBtn.setAttribute("data-value", customTag.trim());
      newTagBtn.textContent = customTag.trim();
      newTagBtn.style.margin = "4px";

      // 커스텀 태그 버튼 앞에 삽입
      const customTagBtn = container.querySelector(".custom-tag-btn");
      if (customTagBtn) {
        container.insertBefore(newTagBtn, customTagBtn);
      } else {
        container.appendChild(newTagBtn);
      }

      // 태그 버튼 이벤트 리스너 재초기화
      if (typeof window.initializeTagButtons === "function") {
        window.initializeTagButtons();
      }

      console.log("✅ 커스텀 태그 추가:", customTag.trim());
    }
  } catch (error) {
    console.error("❌ 커스텀 태그 추가 오류:", error);
    window.showToast("태그 추가 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
};

// --- Extracted goToNextStep ---
window.goToNextStep = async function () {
  try {
    // "다음 단계로" 버튼 클릭 시 수정 모드 활성화 (데이터 수정 반영)
    window.editMode = true;
    if (typeof window.updateEditModeUI === "function") {
      window.updateEditModeUI();
    }
    if (typeof window.setReadOnlyMode === "function") {
      window.setReadOnlyMode(false);
    }

    // 가사 확인 ("직접 작성" 또는 "AI 생성" 모드 모두)
    const originalLyrics =
      document.getElementById("originalLyrics")?.value || "";
    const songTitle = document.getElementById("songTitle")?.value || "";
    const manualStylePrompt =
      document.getElementById("manualStylePrompt")?.value || "";

    // 가사가 없으면 경고
    if (!originalLyrics.trim()) {
      window.showToast(
        '가사를 먼저 입력하거나 생성해주세요.\n\n- "직접 작성" 모드: 가사란에 직접 입력\n- "AI 생성" 모드: "AI로 4개 가사 생성하기" 버튼으로 가사 생성 후 선택', "info");
      return;
    }

    // 곡 제목 확인 (선택사항이지만 있으면 좋음)
    if (!songTitle.trim()) {
      const confirmContinue = await window.showConfirmAsync(
        "곡 제목이 입력되지 않았습니다.\n\n제목 없이 진행하시겠습니까?",
      );
      if (!confirmContinue) {
        const titleInput = document.getElementById("songTitle");
        if (titleInput) {
          titleInput.focus();
        }
        return;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 1단계 데이터를 2단계로 전달
    // ═══════════════════════════════════════════════════════════════

    // 제목을 전역 변수에 저장 (이후 모든 단계에서 사용)
    if (songTitle) {
      window.currentSunoTitle = songTitle;
      console.log("✅ 제목 전역 변수 저장:", songTitle);
    }

    // 2단계 제목 필드에 1단계 제목 복사
    const sunoTitleEl = document.getElementById("sunoTitle");
    if (sunoTitleEl && songTitle) {
      sunoTitleEl.value = songTitle;
      console.log("✅ 2단계 제목 설정:", songTitle);
    }

    // 2단계 가사 필드에 1단계 가사 복사
    const sunoLyricsEl = document.getElementById("sunoLyrics");
    if (sunoLyricsEl && originalLyrics) {
      sunoLyricsEl.value = originalLyrics;
      if (typeof window.autoResizeTextarea === "function") {
        requestAnimationFrame(function () {
          window.autoResizeTextarea(sunoLyricsEl);
        });
      }
      console.log(
        "✅ 2단계 가사 설정:",
        originalLyrics.substring(0, 100) + "...",
      );
    }

    // 2단계 스타일 프롬프트 필드에 1단계 스타일 프롬프트 복사
    const stylePromptEl = document.getElementById("stylePrompt");
    if (stylePromptEl && manualStylePrompt) {
      stylePromptEl.value = manualStylePrompt;
      console.log("✅ 2단계 스타일 프롬프트 설정:", manualStylePrompt);
    }

    // 데이터 영구 저장
    if (typeof window.saveCurrentProject === "function") {
      window.saveCurrentProject();
    }

    // 2단계로 이동
    if (typeof window.goToStep === "function") {
      window.goToStep(2, true, false);
      console.log(
        "✅ 1단계 → 2단계 이동 완료 (제목, 가사, 스타일 프롬프트 전달됨)",
      );

      // 스타일 프롬프트 한글 해석 자동 실행
      if (
        manualStylePrompt &&
        typeof window.generateStylePromptTranslation === "function"
      ) {
        setTimeout(() => {
          window.generateStylePromptTranslation();
        }, 500);
      }
    } else {
      console.error("❌ goToStep 함수를 찾을 수 없습니다.");
      window.showToast("단계 이동 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.", "error");
    }
  } catch (error) {
    console.error("❌ 1→2단계 이동 오류:", error);
    window.showToast(
      "⚠️ 1단계 → 2단계 이동 중 오류가 발생했습니다.\n\n" +
        "원인: " +
        error.message +
        "\n\n" +
        "해결방법: 페이지를 새로고침(F5) 후 다시 시도해주세요.", "error");
  }
};

// --- Extracted goToStep2To3 ---
window.goToStep2To3 = function () {
  try {
    // "다음 단계로" 버튼 클릭 시 수정 모드 활성화 (데이터 수정 반영)
    window.editMode = true;
    if (typeof window.updateEditModeUI === "function") {
      window.updateEditModeUI();
    }
    if (typeof window.setReadOnlyMode === "function") {
      window.setReadOnlyMode(false);
    }

    // 2단계 데이터 수집
    const sunoTitle = document.getElementById("sunoTitle")?.value || "";
    const sunoLyrics = document.getElementById("sunoLyrics")?.value || "";
    const stylePrompt = document.getElementById("stylePrompt")?.value || "";

    if (!sunoLyrics.trim()) {
      window.showToast("수노 가사를 먼저 생성해주세요.", "info");
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // 2단계 데이터를 3단계로 전달
    // ═══════════════════════════════════════════════════════════════

    // 3단계 분석 대상 영역에 데이터 표시
    const analysisTargetLyrics = document.getElementById(
      "analysisTargetLyrics",
    );
    const analysisTargetStyle = document.getElementById("analysisTargetStyle");

    if (analysisTargetLyrics) {
      analysisTargetLyrics.textContent = sunoLyrics;
      console.log("✅ 3단계 분석 대상 가사 설정 완료");
    }

    if (analysisTargetStyle) {
      analysisTargetStyle.textContent = stylePrompt;
      console.log("✅ 3단계 분석 대상 스타일 설정 완료");
    }

    // 제목도 전역 변수에 저장 (이후 단계에서 사용)
    window.currentSunoTitle = sunoTitle;

    // ═══════════════════════════════════════════════════════════════

    if (typeof window.goToStep === "function") {
      window.goToStep(3, true, false);
      console.log(
        "✅ 2단계 → 3단계 이동 완료 (제목, 가사, 스타일 프롬프트 전달됨)",
      );
    }
  } catch (error) {
    console.error("❌ 2→3단계 이동 오류:", error);
    window.showToast(
      "⚠️ 2단계 → 3단계 이동 중 오류가 발생했습니다.\n\n" +
        "원인: " +
        error.message +
        "\n\n" +
        "해결방법: 페이지를 새로고침(F5) 후 다시 시도해주세요.", "error");
  }
};
