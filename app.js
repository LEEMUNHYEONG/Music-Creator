// ═══════════════════════════════════════════════════════════════
// 2단계 수노용 가사 textarea 세로 자동 조절 (가사 길이에 맞춤)
// ═══════════════════════════════════════════════════════════════
window.autoResizeTextarea = function (ta) {
  if (!ta || !ta.nodeName || ta.nodeName !== "TEXTAREA") return;
  var minH = 120;
  var maxH = Math.min(2400, (window.innerHeight || 600) * 0.85);
  ta.style.overflowY = "hidden";
  ta.style.height = "0px";
  var sh = ta.scrollHeight;
  var h = Math.max(minH, Math.min(maxH, sh));
  ta.style.height = h + "px";
  ta.style.overflowY = sh > maxH ? "auto" : "hidden";
};

// ═══════════════════════════════════════════════════════════════
// 전역 프로젝트 상태
// ═══════════════════════════════════════════════════════════════
window.currentProject = null;
window.currentProjectId = null;
window.editMode = false; // 수정 모드 상태 (false = 읽기 전용, true = 수정 가능)

// 프로젝트가 저장될 수 있는 localStorage 키(현재 + 레거시 이름).
// 이 정확한 4개짜리 배열이 여러 함수(삭제/복제/필터/내보내기/가져오기 등)에
// 개별적으로 복붙되어 있었다 - 키를 추가/제거할 때 한 곳만 고치고
// 다른 곳을 놓치기 쉬운 상태였다. 어느 곳도 이 배열 자체를 변형(push 등)
// 하지 않으므로 하나의 공유 상수로 안전하게 통합했다.
const LEGACY_PROJECT_STORAGE_KEYS = [
  "musicCreatorProjects",
  "savedProjects",
  "sunoLyricsHistory",
  "stylePromptHistory",
];

// ═══════════════════════════════════════════════════════════════
// 단계 이동 함수
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// goToStep 헬퍼 함수들 (순수 추출 리팩터링, 동작 동일)
// 각 단계별 특별 처리 블록을 그대로 이름 붙은 함수로 옮겼다.
// ═══════════════════════════════════════════════════════════════

// 4단계 특별 처리: 개선안 표시
function handleGoToStepFour() {
  const improvementCard = document.getElementById("improvementCard");
  const improvementLoading = document.getElementById("improvementLoading");

  if (improvementCard && improvementLoading) {
    improvementLoading.style.display = "none";
    improvementCard.classList.remove("hidden");
    improvementCard.style.display = "block";
  }

  // 3단계 분석 결과에서 개선안 표시
  if (window.currentProject && window.currentProject.data) {
    const analysisData = window.currentProject.data.analysis;
    if (analysisData) {
      displayImprovements(analysisData);
    }
  }
}

// 5단계 특별 처리: 최종 평가 요약 생성 및 데이터 복원
function handleGoToStepFive() {
  // 저장된 프로젝트 데이터가 있으면 5단계 데이터 복원 (항상 복원 시도)
  if (window.currentProject && window.currentProject.data) {
    const projectData = window.currentProject.data;

    // 5단계 최종 가사 복원 (우선순위: finalLyrics > finalizedLyrics)
    const lyrics5 =
      projectData.finalLyrics || projectData.finalizedLyrics || "";
    if (lyrics5) {
      const finalLyricsEl = document.getElementById("finalLyrics");
      if (finalLyricsEl) {
        finalLyricsEl.textContent = lyrics5;
        console.log("✅ 5단계 가사 복원 (goToStep):", lyrics5.length, "자");
      }
      // 중간 버전 프리뷰도 복원
      const intermediateLyricsPreview = document.getElementById(
        "intermediateLyricsPreview",
      );
      if (intermediateLyricsPreview) {
        intermediateLyricsPreview.textContent = lyrics5;
      }
    }

    // 5단계 최종 스타일 복원 (우선순위: finalStyle > finalizedStyle)
    const style5 =
      projectData.finalStyle || projectData.finalizedStyle || "";
    if (style5) {
      const finalStyleEl = document.getElementById("finalStyle");
      if (finalStyleEl) {
        finalStyleEl.textContent = style5;
        console.log(
          "✅ 5단계 스타일 복원 (goToStep):",
          style5.length,
          "자",
        );
      }
      // 중간 버전 프리뷰도 복원
      const intermediateStylePreview = document.getElementById(
        "intermediateStylePreview",
      );
      if (intermediateStylePreview) {
        intermediateStylePreview.textContent = style5;
      }
    }

    // 제목 복원
    const title = window.currentProject.title || projectData.title || "";
    if (title) {
      const finalTitleTextEl = document.getElementById("finalTitleText");
      if (finalTitleTextEl) {
        finalTitleTextEl.textContent = title;
      }
    }

    // 최종 평가 점수·등급·프로그레스 바 복원
    if (
      projectData.beforeScore !== undefined ||
      projectData.afterScore !== undefined
    ) {
      const before =
        projectData.beforeScore !== undefined ? projectData.beforeScore : 0;
      const after =
        projectData.afterScore !== undefined
          ? projectData.afterScore
          : before;
      if (typeof window.updateFinalEvaluationUI === "function") {
        window.updateFinalEvaluationUI(
          before,
          after,
          projectData.aiComment != null ? projectData.aiComment : undefined,
        );
      } else {
        const beforeScoreEl = document.getElementById("beforeScore");
        const afterScoreEl = document.getElementById("afterScore");
        const aiCommentEl = document.getElementById("aiComment");
        if (beforeScoreEl && !beforeScoreEl.textContent)
          beforeScoreEl.textContent = before;
        if (afterScoreEl && !afterScoreEl.textContent)
          afterScoreEl.textContent = after;
        if (
          projectData.aiComment &&
          aiCommentEl &&
          !aiCommentEl.textContent
        )
          aiCommentEl.textContent = projectData.aiComment;
      }
    } else if (projectData.aiComment) {
      const aiCommentEl = document.getElementById("aiComment");
      if (aiCommentEl && !aiCommentEl.textContent)
        aiCommentEl.textContent = projectData.aiComment;
    }
  }

  // 최종 평가 요약 자동 생성 (데이터가 있는 경우)
  if (typeof window.generateFinalEvaluation === "function") {
    setTimeout(() => {
      window.generateFinalEvaluation();
    }, 500);
  }
}

// 6단계 특별 처리: 마케팅 자료 표시 또는 생성
function handleGoToStepSix() {
  const marketingResult = document.getElementById("marketingResult");
  const marketingLoading = document.getElementById("marketingLoading");

  if (marketingResult && marketingLoading) {
    // 저장된 마케팅 자료가 있으면 표시
    if (
      window.currentProject &&
      window.currentProject.data &&
      window.currentProject.data.marketing
    ) {
      const marketing = window.currentProject.data.marketing;

      // 마케팅 자료 표시
      if (marketing.youtubeDesc) {
        const youtubeDescEl = document.getElementById("youtubeDesc");
        if (youtubeDescEl)
          youtubeDescEl.textContent = marketing.youtubeDesc;
      }

      if (marketing.tiktokDesc) {
        const tiktokDescEl = document.getElementById("tiktokDesc");
        if (tiktokDescEl) tiktokDescEl.textContent = marketing.tiktokDesc;
      }

      if (marketing.hashtags) {
        const hashtagsEl = document.getElementById("hashtagsContent");
        if (hashtagsEl) hashtagsEl.textContent = marketing.hashtags;
      }

      // 썸네일 문구 표시
      if (
        marketing.thumbnails &&
        Array.isArray(marketing.thumbnails) &&
        marketing.thumbnails.length > 0
      ) {
        const thumbnailsGridEl = document.getElementById("thumbnailsGrid");
        if (thumbnailsGridEl) {
          let thumbnailsHtml = "";
          marketing.thumbnails.forEach((thumb, index) => {
            const thumbnailText =
              typeof thumb === "string"
                ? thumb
                : thumb.text || thumb.content || String(thumb);
            thumbnailsHtml += `
                                    <div class="thumbnail-item" style="padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s;"
                                         onclick="if(typeof window.copyToClipboard === 'function') { window.copyToClipboard(null, this.querySelector('.thumbnail-text').textContent, event); }">
                                        <div class="thumbnail-text" style="font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">${escapeHtml(thumbnailText)}</div>
                                        <button class="btn btn-small btn-success" onclick="event.stopPropagation(); if(typeof window.copyToClipboard === 'function') { window.copyToClipboard(null, this.closest('.thumbnail-item').querySelector('.thumbnail-text').textContent, event); }">
                                            <i class="fas fa-copy"></i> 복사
                                        </button>
                                    </div>
                                `;
          });
          thumbnailsGridEl.innerHTML = thumbnailsHtml;
        }
      }

      marketingLoading.style.display = "none";
      marketingResult.style.display = "block";
      marketingResult.classList.remove("hidden");
      console.log("✅ 저장된 마케팅 자료 표시 완료");
    } else {
      // 저장된 자료가 없으면 자동 생성
      if (typeof window.generateMarketingMaterials === "function") {
        setTimeout(() => {
          window.generateMarketingMaterials();
        }, 500);
      } else {
        // 생성 함수가 없으면 로딩 화면 유지
        console.warn("⚠️ 마케팅 자료 생성 함수를 찾을 수 없습니다.");
      }
    }
  }
}

// 3단계 특별 처리: UI 제어 및 2단계 데이터 동기화
function handleGoToStepThree() {
  const analysisResult = document.getElementById("analysisResult");
  const analysisLoading = document.getElementById("analysisLoading");
  const analysisError = document.getElementById("analysisError");
  const analysisTargetLyrics = document.getElementById("analysisTargetLyrics");
  const analysisTargetStyle = document.getElementById("analysisTargetStyle");

  // 2단계 최신 데이터를 3단계 분석 대상에 강제 동기화 (탭 전환 시 빈 화면 방지)
  const currentSunoLyrics = document.getElementById("sunoLyrics")?.value || "";
  const currentStylePrompt = document.getElementById("stylePrompt")?.value || "";

  if (analysisTargetLyrics && currentSunoLyrics.trim()) {
    analysisTargetLyrics.textContent = currentSunoLyrics;
  }
  if (analysisTargetStyle && currentStylePrompt.trim()) {
    analysisTargetStyle.textContent = currentStylePrompt;
  }

  const hasTargetData =
    analysisTargetLyrics &&
    analysisTargetLyrics.textContent.trim() &&
    analysisTargetStyle &&
    analysisTargetStyle.textContent.trim();

  // 저장된 분석 데이터 확인
  const projectData =
    window.currentProject && window.currentProject.data
      ? window.currentProject.data
      : null;
  const analysisData =
    projectData && projectData.analysis ? projectData.analysis : {};
  const hasSavedAnalysis = !!(
    analysisData.scores ||
    analysisData.feedbacks ||
    analysisData.improvements ||
    analysisData.raw ||
    (projectData && (projectData.analysisScores || projectData.feedbacks))
  );

  // 로딩/에러 화면 숨기고 결과 영역은 항상 표시
  if (analysisLoading) analysisLoading.style.display = "none";
  if (analysisError) analysisError.style.display = "none";

  if (analysisResult) {
    analysisResult.style.display = "block";
    analysisResult.classList.remove("hidden");
    console.log(hasSavedAnalysis || hasTargetData ? "✅ 3단계 분석 결과 영역 표시 완료" : "✅ 3단계 데이터 대기 중");
  }
}

window.goToStep = function (step, saveBefore = false, skipValidation = false) {
  try {
    // 단계를 벗어나기 전에는 항상 저장한다. (이전에는 saveBefore=true인
    // "다음 단계로" 버튼에서만 저장하고, 상단 단계 탭/"이전" 버튼
    // (saveBefore=false)으로 이동할 때는 저장을 건너뛰었다. 60초 자동저장
    // 간격보다 빠르게 다른 단계를 눌렀다가 돌아오면 restoreStepData가
    // 옛 데이터로 방금 입력한 내용을 덮어써 편집 내용이 조용히
    // 유실되는 데이터 손실 버그가 있었음 - saveBefore 값과 무관하게
    // 저장하도록 분리했다.)
    if (window.currentProject && typeof window.saveCurrentProject === "function") {
      window.saveCurrentProject();
    }

    // 상단 메뉴 클릭 시 읽기 전용 모드로 설정 (수정 모드 비활성화)
    // "다음 단계로" 버튼 클릭 시에는 saveBefore=true로 호출되므로 수정 모드 유지
    if (!saveBefore && window.currentProject) {
      window.editMode = false;
      if (typeof window.updateEditModeUI === "function") {
        window.updateEditModeUI();
      }
      if (typeof window.setReadOnlyMode === "function") {
        window.setReadOnlyMode(true);
      }
    }

    // 모든 패널 비활성화
    document.querySelectorAll(".panel").forEach((panel) => {
      panel.classList.remove("active");
    });

    // 모든 단계 비활성화
    document.querySelectorAll(".step").forEach((stepEl) => {
      stepEl.classList.remove("active");
    });

    // 선택한 패널 활성화
    const panel = document.getElementById("panel" + step);
    if (panel) {
      panel.classList.add("active");
      // 단계 전환 시 화면 최상단으로 스크롤
      window.scrollTo({ top: 0, behavior: "smooth" });
      // 2단계: 수노용 가사 textarea 높이를 내용에 맞춰 자동 조절
      if (step === 2 && typeof window.autoResizeTextarea === "function") {
        var sunoTa = document.getElementById("sunoLyrics");
        if (sunoTa && sunoTa.value) {
          requestAnimationFrame(function () {
            window.autoResizeTextarea(sunoTa);
          });
        }
      }
    }

    // 선택한 단계 활성화
    const stepEl = document.querySelector('.step[data-step="' + step + '"]');
    if (stepEl) {
      stepEl.classList.add("active");
    }

    // 프로젝트 데이터가 있으면 해당 단계 데이터 복원
    // 단, 수정 모드일 때는 복원하지 않음 (사용자가 수정 중인 데이터를 보존)
    if (
      window.currentProject &&
      window.currentProject.data &&
      !window.editMode
    ) {
      if (typeof window.restoreStepData === "function") {
        window.restoreStepData(step);
      }
    }

    // 4단계 특별 처리: 개선안 표시
    if (step === 4) {
      handleGoToStepFour();
    }

    // 5단계 특별 처리: 최종 평가 요약 생성 및 데이터 복원
    if (step === 5) {
      handleGoToStepFive();
    }

    // 6단계 특별 처리: 마케팅 자료 표시 또는 생성
    if (step === 6) {
      handleGoToStepSix();
    }

    // 3단계 특별 처리: UI 제어 및 2단계 데이터 동기화
    if (step === 3) {
      handleGoToStepThree();
    }

    if (typeof window.updateStepProgress === "function") {
      window.updateStepProgress();
    }
    console.log("✅ 단계 이동:", step);
  } catch (error) {
    console.error("단계 이동 오류:", error);
  }
};

// ═══════════════════════════════════════════════════════════════
// 수정 모드 UI 업데이트
// ═══════════════════════════════════════════════════════════════
window.updateEditModeUI = function () {
  const editBtn = document.getElementById("editModeToggleBtn");
  const editText = document.getElementById("editModeToggleText");

  if (editBtn && editText) {
    if (window.editMode) {
      editBtn.classList.add("active");
      editBtn.style.background = "var(--accent)";
      editText.textContent = "수정 중";
    } else {
      editBtn.classList.remove("active");
      editBtn.style.background = "";
      editText.textContent = "수정";
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// 읽기 전용 모드 설정
// ═══════════════════════════════════════════════════════════════
window.setReadOnlyMode = function (readonly) {
  try {
    // 모든 input, textarea 요소 찾기
    const inputs = document.querySelectorAll(
      'input[type="text"], textarea, select',
    );

    inputs.forEach((input) => {
      // 특정 요소는 제외 (검색, 정렬 등)
      const id = input.id || "";
      const excludeIds = [
        "projectSearch",
        "projectSort",
        "importFile",
        "backupFileInput",
        "intermediateAudioFileInput",
        "mvAudioFileInput",
        "mvCustomSettings",
        "mvLocationCustom",
        "mvActionCustom",
      ];
      // MV 인물 외모/스타일, 기타 항목은 항상 수정 가능
      if (excludeIds.some((excludeId) => id.includes(excludeId))) {
        return;
      }
      if (id.indexOf("mvCharacter") === 0 && id.indexOf("_appearance") !== -1) {
        return;
      }

      // readonly 속성 설정
      if (readonly) {
        input.setAttribute("readonly", "readonly");
        input.style.cursor = "not-allowed";
        input.style.opacity = "0.8";
      } else {
        input.removeAttribute("readonly");
        input.style.cursor = "";
        input.style.opacity = "";
      }
    });

    // 버튼 비활성화 (읽기 전용일 때)
    if (readonly) {
      // AI 생성 버튼 등은 비활성화하지 않음 (읽기 전용에서도 사용 가능)
      const editButtons = document.querySelectorAll(
        'button[onclick*="generate"], button[onclick*="apply"], button[onclick*="regenerate"]',
      );
      // 필요시 특정 버튼만 비활성화
    }

    console.log("✅ 읽기 전용 모드 설정:", readonly);
  } catch (error) {
    console.error("읽기 전용 모드 설정 오류:", error);
  }
};

// ═══════════════════════════════════════════════════════════════
// 단계별 데이터 복원 함수
// ═══════════════════════════════════════════════════════════════
function setMVRestoreValue(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) el.value = val;
}

// HTML 이스케이프 헬퍼 함수 (전역 단일 구현)
// 주의: 속성 컨텍스트 삽입까지 안전하도록 따옴표(" ')도 반드시 이스케이프한다.
// (기존 DOM 기반 구현은 따옴표를 통과시켜 onclick 속성 주입 XSS의 원인이었음)
// 이 위치(setMVRestoreValue 바로 뒤)에 둔 이유: 일부 테스트 하네스가
// app.js를 "function setMVRestoreValue(id, val) {" 문자열부터 문자열
// 슬라이스로 잘라 vm에서 재실행한다(tests/mv_restore_step6_smoke.js,
// tests/mv_user_flow_integration_smoke.js). escapeHtml이 그 마커보다
// 앞에 있으면 슬라이스 범위 밖으로 잘려나가, 슬라이스 안의
// restoreMarketingThumbnails 등이 escapeHtml을 호출할 때 ReferenceError가
// 난다. 함수 선언은 어차피 호이스팅되어 실제 프로덕션 동작(전체 app.js
// 로드)에는 위치가 영향을 주지 않으므로, 슬라이스 호환성을 위해 이
// 마커 바로 뒤에 둔다.
function escapeHtml(text) {
  if (text === null || text === undefined || text === "") return "";
  return String(text).replace(/[&<>"']/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
  });
}
window.escapeHtml = escapeHtml;

function restoreMarketingSummaryData(marketing) {
  const mResult = document.getElementById("marketingResult");
  if (mResult) {
    mResult.classList.remove("hidden");
    mResult.style.display = "block";
  }

  if (marketing.youtubeDesc) {
    const el = document.getElementById("youtubeDesc");
    if (el) el.textContent = marketing.youtubeDesc;
  }
  if (marketing.tiktokDesc) {
    const el = document.getElementById("tiktokDesc");
    if (el) el.textContent = marketing.tiktokDesc;
  }
  if (marketing.hashtags) {
    const el = document.getElementById("hashtagsContent");
    if (el) el.textContent = marketing.hashtags;
  }
}

function restoreMarketingThumbnails(marketing) {
  const tGrid = document.getElementById("thumbnailsGrid");
  if (!tGrid) return;

  const thumbs = marketing.thumbnailsData || marketing.thumbnails || [];
  if (thumbs.length === 0) return;

  let html = "";
  thumbs.forEach(t => {
    const img = typeof t === 'object' ? t.img : "";
    const text = typeof t === 'object' ? t.text : t;
    html += `<div class="thumbnail-card" style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden;">
      ${img ? `<img src="${escapeHtml(img)}" style="width:100%;height:160px;object-fit:cover;">` : `<div style="width:100%;height:160px;background:var(--bg-input);display:flex;align-items:center;justify-content:center;"><i class="fas fa-image" style="font-size:2rem;color:var(--text-secondary);"></i></div>`}
      <div style="padding:12px;">
        <div class="thumbnail-text" style="font-weight:600;margin-bottom:8px;font-size:0.9rem;color:var(--text-primary);cursor:pointer;" onclick="if(typeof window.copyToClipboard === 'function') { window.copyToClipboard(null, this.textContent, event); }">${escapeHtml(text)}</div>
        <button class="btn btn-small btn-success" style="width:100%;" onclick="if(typeof window.copyToClipboard === 'function') { window.copyToClipboard(null, this.closest('.thumbnail-card').querySelector('.thumbnail-text').textContent, event); }">복사</button>
      </div>
    </div>`;
  });
  tGrid.innerHTML = html;
}

function getMarketingMVRestoreData(marketing) {
  if (typeof window.getMarketingMVData === "function") {
    return window.getMarketingMVData(marketing);
  }

  return {
    settings: marketing.mvSettings || {},
    prompts: marketing.mvPrompts || {},
    scenes: marketing.mvScenes || [],
  };
}

function restoreMVSettingsFields(settings) {
  setMVRestoreValue("mvMinutes", settings.minutes);
  setMVRestoreValue("mvSeconds", settings.seconds);
  setMVRestoreValue("mvInterval", settings.interval);
  setMVRestoreValue("mvEra", settings.era);
  setMVRestoreValue("mvCountry", settings.country);
  setMVRestoreValue("mvCharacterCount", settings.characterCount || "1");
  setMVRestoreValue("mvLighting", settings.lighting);
  setMVRestoreValue("mvCameraWork", settings.cameraWork);
  setMVRestoreValue("mvMood", settings.mood);
  setMVRestoreValue("mvLocationCustom", settings.locationCustom || settings.location || "");
  setMVRestoreValue("mvActionCustom", settings.actionCustom || "");
  setMVRestoreValue("mvCustomSettings", settings.customSettings || "");
}

function restoreMVTagSelections(settings) {
  const locationTags = Array.isArray(settings.locationTags)
    ? settings.locationTags
    : Array.isArray(settings.location)
      ? settings.location
      : [];
  if (locationTags.length > 0) {
    document.querySelectorAll('#mvLocationTags .tag-btn').forEach(btn => {
      btn.classList.toggle('active', locationTags.includes(btn.dataset.value));
    });
  }
  if (settings.actionTags && Array.isArray(settings.actionTags)) {
    document.querySelectorAll('#mvActionTags .tag-btn').forEach(btn => {
      btn.classList.toggle('active', settings.actionTags.includes(btn.dataset.value));
    });
  }
}

function restoreMVCharacters(settings) {
  if (typeof window.updateCharacterInputs !== "function") return;

  window.updateCharacterInputs(); // 먼저 입력 필드들을 생성
  if (!settings.characters || !Array.isArray(settings.characters)) return;

  settings.characters.forEach((c, idx) => {
    const i = idx + 1;
    setMVRestoreValue(`mvCharacter${i}_gender`, c.gender);
    setMVRestoreValue(`mvCharacter${i}_age`, c.age);
    setMVRestoreValue(`mvCharacter${i}_race`, c.race);
    setMVRestoreValue(`mvCharacter${i}_appearance`, c.appearance);
    setMVRestoreValue(`mvCharacter${i}_artStyle`, c.artStyle || "photorealistic");

    const sheetEl = document.getElementById(`mvCharacter${i}_sheet`);
    if (sheetEl && c.characterSheet) {
      sheetEl.value = c.characterSheet;
      const sheetArea = document.getElementById(`mvCharacter${i}_sheetArea`);
      if (sheetArea) sheetArea.style.display = "block";
      const sheetToggle = document.getElementById(`mvCharacter${i}_sheetToggle`);
      if (sheetToggle) sheetToggle.style.display = "inline-flex";
      const sheetCopy = document.getElementById(`mvCharacter${i}_sheetCopy`);
      if (sheetCopy) sheetCopy.style.display = "inline-flex";
    }
  });
}

function getMVPromptValue(prompts, nestedKey, flatKey) {
  if (prompts[nestedKey]) {
    return prompts[nestedKey].en || prompts[nestedKey].ko || prompts[nestedKey][flatKey] || "";
  }
  return prompts[flatKey] || "";
}

function getMVPromptKoValue(prompts, nestedKey, flatKeyKo) {
  if (prompts[nestedKey]) return prompts[nestedKey].ko || prompts[nestedKey][flatKeyKo] || "";
  return prompts[flatKeyKo] || "";
}

function restoreMVPromptFields(prompts) {
  const tEn = getMVPromptValue(prompts, 'thumbnail', 'thumbnailEn');
  const tKo = getMVPromptKoValue(prompts, 'thumbnail', 'thumbnailKo');
  setMVRestoreValue("mvThumbnailPromptEn", tEn);
  setMVRestoreValue("mvThumbnailPromptKo", tKo);
  if (document.getElementById("review_thumbnail_en")) setMVRestoreValue("review_thumbnail_en", tEn);
  if (document.getElementById("review_thumbnail_ko")) setMVRestoreValue("review_thumbnail_ko", tKo);

  const bEn = getMVPromptValue(prompts, 'background', 'backgroundDetailEn');
  const bKo = getMVPromptKoValue(prompts, 'background', 'backgroundDetailKo');
  setMVRestoreValue("mvBackgroundDetailPromptEn", bEn);
  setMVRestoreValue("mvBackgroundDetailPromptKo", bKo);
  if (document.getElementById("review_background_en")) setMVRestoreValue("review_background_en", bEn);
  if (document.getElementById("review_background_ko")) setMVRestoreValue("review_background_ko", bKo);

  const cEn = getMVPromptValue(prompts, 'character', 'characterDetailEn');
  const cKo = getMVPromptKoValue(prompts, 'character', 'characterDetailKo');
  setMVRestoreValue("mvCharacterDetailPromptEn", cEn);
  setMVRestoreValue("mvCharacterDetailPromptKo", cKo);
  if (document.getElementById("review_character_en")) setMVRestoreValue("review_character_en", cEn);
  if (document.getElementById("review_character_ko")) setMVRestoreValue("review_character_ko", cKo);

  if (typeof window.renderMvPrompts === 'function') {
    window.renderMvPrompts();
  }
}

function restoreMVResultSections(mvData, prompts) {
  const resSec = document.getElementById("mvResultsSection");
  const overviewSec = document.getElementById("mvSceneOverviewSection");
  const scenes = Array.isArray(mvData.scenes) ? mvData.scenes : [];
  const hasMvData = !!(prompts.thumbnail?.en || prompts.thumbnailEn || scenes.length > 0);

  if (hasMvData) {
    if (resSec) {
      resSec.classList.remove("hidden");
      resSec.style.display = "block";
    }
    if (overviewSec) {
      overviewSec.classList.add("hidden");
      overviewSec.style.display = "none";
    }
    if (scenes.length > 0) {
      window.currentScenes = JSON.parse(JSON.stringify(scenes));
      if (typeof window.renderSceneOverview === "function") {
        window.renderSceneOverview(window.currentScenes);
      }
    }
    if (typeof window.updateMVImageCount === "function") window.updateMVImageCount();
    return;
  }

  if (overviewSec) {
    overviewSec.classList.remove("hidden");
    overviewSec.style.display = "block";
  }
  if (resSec) {
    resSec.classList.add("hidden");
    resSec.style.display = "none";
  }
}

function restoreMarketingMVStepData(projectData) {
  if (!projectData.marketing) return;

  window.isRestoringStepData = true; // 복원 중 자동 저장 방지

  const marketing = projectData.marketing;
  const mvData = getMarketingMVRestoreData(marketing);
  const settings = mvData.settings || {};
  const prompts = mvData.prompts || {};

  restoreMarketingSummaryData(marketing);
  restoreMarketingThumbnails(marketing);
  restoreMVSettingsFields(settings);
  restoreMVTagSelections(settings);
  restoreMVCharacters(settings);
  restoreMVPromptFields(prompts);
  restoreMVResultSections(mvData, prompts);
}

// ═══════════════════════════════════════════════════════════════
// restoreStepData 헬퍼 함수들 (순수 추출 리팩터링, 동작 동일)
// switch의 각 case를 그대로 이름 붙은 함수로 옮겼다.
// ═══════════════════════════════════════════════════════════════

// 1단계: 가사 작성 + 선택 태그
function restoreStep1Data(projectData) {
  const title1 = window.currentProject?.title || projectData.title || "";
  if (title1) {
    const titleEl = document.getElementById("songTitle");
    if (titleEl) titleEl.value = title1;
  }
  if (projectData.originalLyrics) {
    const lyricsEl = document.getElementById("originalLyrics");
    if (lyricsEl) lyricsEl.value = projectData.originalLyrics;
  }
  if (projectData.manualStylePrompt) {
    const styleEl = document.getElementById("manualStylePrompt");
    if (styleEl) styleEl.value = projectData.manualStylePrompt;
  }
  if (projectData.step1Tags && typeof projectData.step1Tags === "object" && typeof window.setTagSelections === "function") {
    const step1Map = {
      genre: "genreTags",
      mood: "moodTags",
      era: "eraTags",
      theme: "themeTags",
      perspective: "perspectiveTags",
      time: "timeTags",
      special: "specialTags",
      region: "regionTags",
    };
    Object.keys(step1Map).forEach((key) => {
      if (projectData.step1Tags[key] && Array.isArray(projectData.step1Tags[key])) {
        window.setTagSelections(step1Map[key], projectData.step1Tags[key]);
      }
    });
  }
}

// 2단계: 수노 변환 + 선택 태그·템포
function restoreStep2Data(projectData) {
  const title2 = window.currentProject?.title || projectData.title || "";
  if (title2) {
    const sunoTitleEl = document.getElementById("sunoTitle");
    if (sunoTitleEl) sunoTitleEl.value = title2;
  }
  if (projectData.sunoLyrics) {
    const sunoEl = document.getElementById("sunoLyrics");
    if (sunoEl) {
      sunoEl.value = projectData.sunoLyrics;
      if (typeof window.autoResizeTextarea === "function") {
        requestAnimationFrame(() => window.autoResizeTextarea(sunoEl));
      }
    }
  }
  if (projectData.stylePrompt) {
    const stylePromptEl = document.getElementById("stylePrompt");
    if (stylePromptEl) stylePromptEl.value = projectData.stylePrompt;
  }
  if (projectData.step2Tags && typeof projectData.step2Tags === "object" && typeof window.setTagSelections === "function") {
    const step2Map = {
      audioFormat: "audioFormatTags",
      venue: "sunoVenueTags",
      vocalStyle: "vocalStyle",
      instruments: "instrumentTags",
    };
    Object.keys(step2Map).forEach((key) => {
      if (projectData.step2Tags[key] && Array.isArray(projectData.step2Tags[key])) {
        window.setTagSelections(step2Map[key], projectData.step2Tags[key]);
      }
    });
  }
  if (projectData.tempo) {
    const tempoSlider = document.getElementById("tempoSlider");
    const tempoValue = document.getElementById("tempoValue");
    if (tempoSlider) tempoSlider.value = projectData.tempo;
    if (tempoValue) tempoValue.textContent = projectData.tempo;
  }
  if (projectData.vocalPartAssignments && typeof projectData.vocalPartAssignments === "object") {
    window.vocalPartAssignments = projectData.vocalPartAssignments;
    if (typeof window.renderVocalPartAssignments === "function") {
      window.renderVocalPartAssignments();
    }
  }
}

// 3단계: AI 분석
function restoreStep3Data(projectData) {
  if (projectData.sunoLyrics) {
    const targetLyrics = document.getElementById("analysisTargetLyrics");
    if (targetLyrics) targetLyrics.textContent = projectData.sunoLyrics;
  }
  if (projectData.stylePrompt) {
    const targetStyle = document.getElementById("analysisTargetStyle");
    if (targetStyle) targetStyle.textContent = projectData.stylePrompt;
  }

  const analysisData = projectData.analysis || {};
  if (analysisData.scores || analysisData.feedbacks || analysisData.raw) {
    const analysisResult = document.getElementById("analysisResult");
    const analysisLoading = document.getElementById("analysisLoading");
    if (analysisResult && analysisLoading) {
      analysisLoading.style.display = "none";
      analysisResult.style.display = "block";

      if (analysisData.scores) {
        const s = analysisData.scores;
        const setScore = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.textContent = val || 0;
        };
        setScore("overallScore", s.overall || s.overallScore);
        setScore("lyricsScore", s.lyrics);
        setScore("styleScore", s.style);
        setScore("structureScore", s.structure);
      }

      const feedbacks = analysisData.feedbacks || [];
      const geminiResult = document.getElementById("geminiAnalysisResult");
      const geminiCard = document.getElementById("geminiAnalysisCard");
      if (geminiResult && geminiCard && (feedbacks.length > 0 || analysisData.raw)) {
        geminiCard.style.display = "block";
        if (feedbacks.length > 0) {
          let html = "";
          feedbacks.forEach(f => {
            html += `<div style="margin-bottom:15px;padding:15px;background:var(--bg-input);border-radius:8px;border-left:4px solid var(--accent);">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                      <span>${escapeHtml(f.icon || "💡")}</span>
                      <h4 style="margin:0;color:var(--text-primary);font-size:1rem;">${escapeHtml(f.title || f.category || "피드백")}</h4>
                    </div>
                    <p style="margin:0;color:var(--text-secondary);line-height:1.6;font-size:0.9rem;">${escapeHtml(f.suggestion || f.desc || f.text || "")}</p>
                  </div>`;
          });
          geminiResult.innerHTML = html;
        } else if (analysisData.raw) {
          geminiResult.innerHTML = `<div style="white-space:pre-wrap;color:var(--text-secondary);line-height:1.8;">${escapeHtml(analysisData.raw)}</div>`;
        }
      }
    }
  }
}

// 4단계: 최종 확정
function restoreStep4Data(projectData) {
  const fl4 = projectData.finalizedLyrics || projectData.finalLyrics || "";
  const fs4 = projectData.finalizedStyle || projectData.finalStyle || "";
  if (fl4) {
    const el = document.getElementById("finalizedLyrics");
    if (el) el.value = fl4;
  }
  if (fs4) {
    const el = document.getElementById("finalizedStyle");
    if (el) el.value = fs4;
  }
}

// 5단계: 최종 출력 & 평가
function restoreStep5Data(projectData) {
  const evalData = projectData.evaluation || {};
  const title5 = evalData.finalTitle || projectData.finalTitle || projectData.title || "";
  const lyrics5 = evalData.finalLyrics || projectData.finalLyrics || projectData.finalizedLyrics || "";
  const style5 = evalData.finalStyle || projectData.finalStyle || projectData.finalizedStyle || "";

  if (title5) {
    const el = document.getElementById("finalTitleText");
    if (el) el.textContent = title5;
  }
  if (lyrics5) {
    const el = document.getElementById("finalLyrics");
    // 저장된 프로젝트/가져온 백업의 내용이므로 HTML로 해석하지 않는다
    if (el) el.textContent = lyrics5;
  }
  if (style5) {
    const el = document.getElementById("finalStyle");
    if (el) el.textContent = style5;
  }

  const bScore = evalData.beforeScore || projectData.beforeScore || "0";
  const aScore = evalData.afterScore || projectData.afterScore || "0";
  const comment = evalData.aiComment || projectData.aiComment || "";
  const grade = evalData.finalGrade || projectData.finalGrade || "-";

  if (typeof window.updateFinalEvaluationUI === "function") {
    window.updateFinalEvaluationUI(bScore, aScore, comment);
    const gEl = document.getElementById("finalGrade");
    if (gEl && grade !== "-") gEl.textContent = grade;
  } else {
    const bEl = document.getElementById("beforeScore");
    const aEl = document.getElementById("afterScore");
    const cEl = document.getElementById("aiComment");
    const gEl = document.getElementById("finalGrade");
    if (bEl) bEl.textContent = bScore;
    if (aEl) aEl.textContent = aScore;
    if (cEl) cEl.textContent = comment;
    if (gEl) gEl.textContent = grade;
  }
}

window.restoreStepData = function (step) {
  try {
    window.isRestoringStepData = true;

    // 수정 모드일 때는 복원하지 않음 (사용자가 수정 중인 데이터를 보존)
    if (window.editMode && !window.isInitialLoading) {
      console.log(`⏭️ 수정 모드 활성화 중 - ${step}단계 데이터 복원 건너뜀`);
      window.isRestoringStepData = false;
      return;
    }

    if (!window.currentProject || !window.currentProject.data) {
      window.isRestoringStepData = false;
      return;
    }

    const projectData = window.currentProject.data;

    switch (step) {
      case 1:
        restoreStep1Data(projectData);
        break;
      case 2:
        restoreStep2Data(projectData);
        break;
      case 3:
        restoreStep3Data(projectData);
        break;
      case 4:
        restoreStep4Data(projectData);
        break;
      case 5:
        restoreStep5Data(projectData);
        break;
      case 6:
        // 6단계: 마케팅 & MV
        restoreMarketingMVStepData(projectData);
        break;
    }

    // 데이터 복원 완료 후 플래그 해제
    window.isRestoringStepData = false;
    console.log(`✅ ${step}단계 데이터 복원 완료`);
  } catch (error) {
    window.isRestoringStepData = false;
    console.error("단계 데이터 복원 오류:", error);
  }
};

// 저장 후 닫기: 모든 내용 저장 후 창 닫기 (브라우저 정책상 창이 닫히지 않을 수 있음)
window.saveAndClose = function () {
  try {
    if (typeof window.saveCurrentProject !== "function") {
      window.showToast("저장 기능을 사용할 수 없습니다.", "error");
      return;
    }
    if (!window.currentProjectId) {
      const hasContent =
        (document.getElementById("songTitle")?.value || "").trim() ||
        (document.getElementById("originalLyrics")?.value || "").trim() ||
        (document.getElementById("sunoLyrics")?.value || "").trim();
      if (!hasContent) {
        if (typeof window.showCopyIndicator === "function") {
          window.showCopyIndicator("저장할 내용이 없습니다. 창을 닫아 주세요.");
        } else {
          window.showToast("저장할 내용이 없습니다.\n\n창을 닫아 주세요.", "error");
        }
        window.close();
        return;
      }
      window.currentProjectId =
        window.generateProjectId();
    }
    const saved = window.saveCurrentProject();
    if (saved) {
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          "✅ 모든 내용이 저장되었습니다. 이제 브라우저 창을 닫아도 됩니다.",
        );
      } else {
        window.showToast(
          "✅ 모든 내용이 저장되었습니다.\n\n이제 브라우저 창을 닫아도 됩니다.", "success");
      }
      window.close();
    } else {
      window.showToast("저장에 실패했습니다. 다시 시도해 주세요.", "error");
    }
  } catch (e) {
    console.error("저장 후 닫기 오류:", e);
    window.showToast("저장 후 닫기 중 오류가 발생했습니다.", "error");
  }
};

// ═══════════════════════════════════════════════════════════════
// 사이드바 토글 함수
// ═══════════════════════════════════════════════════════════════
window.toggleSidebar = function () {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar) {
    const isOpen = sidebar.classList.contains("open");
    if (isOpen) {
      sidebar.classList.remove("open");
      if (overlay) overlay.style.display = "none";
    } else {
      sidebar.classList.add("open");
      if (overlay) overlay.style.display = "block";
    }
  }
};

window.syncSidebarForViewport = function () {
  if (!window.matchMedia("(max-width: 768px)").matches) return;
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const toggle = document.getElementById("sidebarToggle");
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.style.display = "none";
  if (toggle) toggle.setAttribute("aria-expanded", "false");
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", window.syncSidebarForViewport);
} else {
  window.syncSidebarForViewport();
}

// ═══════════════════════════════════════════════════════════════
// 사이드바 드래그 기능
// ═══════════════════════════════════════════════════════════════
window.initSidebarDrag = function () {
  const sidebar = document.getElementById("sidebar");
  const sidebarHeader = document.getElementById("sidebarHeader");
  const dragHandle = sidebarHeader?.querySelector(".sidebar-drag-handle");

  if (!sidebar || !sidebarHeader) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startRight = 0;
  let startTop = 0;

  // 드래그 시작 (드래그 핸들에서만)
  const handleMouseDown = (e) => {
    // 드래그 핸들에서만 드래그 시작 (헤더 전체가 아닌 핸들만)
    const dragHandle = e.target.closest(".sidebar-drag-handle");
    if (!dragHandle) return;

    // 닫기 버튼 클릭은 무시
    if (e.target.closest(".sidebar-close")) return;

    isDragging = true;
    sidebar.classList.add("dragging");

    const rect = sidebar.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    // 좌측 기준으로 저장
    startRight = rect.left; // 좌측 위치
    startTop = rect.top;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    e.preventDefault();
    e.stopPropagation();
  };

  // 드래그 중
  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX; // 마우스가 오른쪽으로 이동하면 양수
    const deltaY = e.clientY - startY; // 마우스가 아래로 이동하면 양수

    // 좌측 기준으로 위치 계산
    const sidebarWidth = sidebar.offsetWidth || 320;
    const sidebarHeight = sidebar.offsetHeight || window.innerHeight;

    let newLeft = startRight + deltaX; // startRight는 실제로는 startLeft
    let newTop = startTop + deltaY;

    // 화면 경계 체크
    const maxLeft = window.innerWidth - 50; // 최소 50px는 보이도록
    const minLeft = -sidebarWidth + 50; // 대부분 숨길 수 있지만 일부는 보이도록
    const maxTop = window.innerHeight - 50; // 최소 50px는 보이도록
    const minTop = -sidebarHeight + 50; // 대부분 숨길 수 있지만 일부는 보이도록

    newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
    newTop = Math.max(minTop, Math.min(maxTop, newTop));

    sidebar.style.left = `${newLeft}px`;
    sidebar.style.right = "auto";
    sidebar.style.top = `${newTop}px`;
    sidebar.style.bottom = "auto";

    // 사이드바를 독립적인 플로팅 패널로 만들기 (메인 화면과 분리)
    sidebar.style.position = "fixed";
    sidebar.style.zIndex = "10000";

    // 위치 저장 (좌측 기준)
    const savedSize = localStorage.getItem("sidebarSize");
    const size = savedSize
      ? JSON.parse(savedSize)
      : { width: 350, height: "100vh" };
    localStorage.setItem(
      "sidebarPosition",
      JSON.stringify({
        left: newLeft,
        top: newTop,
        width: size.width,
        height: size.height,
        detached: true, // 분리된 상태로 표시
      }),
    );
  };

  // 드래그 종료
  const handleMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      sidebar.classList.remove("dragging");

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }
  };

  // 드래그 핸들에만 드래그 이벤트 리스너 추가 (헤더 전체가 아닌 핸들만)
  if (dragHandle) {
    dragHandle.addEventListener("mousedown", handleMouseDown);
  }

  // 드래그 핸들 호버 효과
  if (dragHandle) {
    dragHandle.addEventListener("mouseenter", () => {
      dragHandle.style.opacity = "1";
    });
    dragHandle.addEventListener("mouseleave", () => {
      if (!isDragging) {
        dragHandle.style.opacity = "0.5";
      }
    });
  }

  // 사이드바를 항상 좌측에 강제 배치 (저장된 위치 무시)
  sidebar.style.position = "fixed";
  sidebar.style.zIndex = "10000";
  sidebar.style.left = "0";
  sidebar.style.right = "auto";
  sidebar.style.top = "0";
  sidebar.style.bottom = "auto";

  // 저장된 위치에서 크기만 복원 (위치는 항상 좌측)
  const savedPosition = localStorage.getItem("sidebarPosition");
  if (savedPosition) {
    try {
      const pos = JSON.parse(savedPosition);
      // 크기만 복원
      if (pos.width) {
        sidebar.style.width = `${pos.width}px`;
      } else {
        sidebar.style.width = "320px"; // 기본 너비
      }
      if (pos.height) {
        sidebar.style.height =
          pos.height === "100vh" ? "100vh" : `${pos.height}px`;
      } else {
        sidebar.style.height = "100vh"; // 기본 높이
      }
    } catch (e) {
      console.warn("저장된 사이드바 크기 복원 실패:", e);
      sidebar.style.width = "350px";
      sidebar.style.height = "100vh";
    }
  } else {
    sidebar.style.width = "350px";
    sidebar.style.height = "100vh";
  }

  // 리사이즈 기능 초기화 (별도로 초기화하므로 여기서는 호출하지 않음)
  // initSidebarResize()는 페이지 로드 시 별도로 호출됨
};

// 사이드바 리사이즈 기능 초기화
window.initSidebarResize = function () {
  const sidebar = document.getElementById("sidebar");
  const resizeHandle = document.getElementById("sidebarResizeHandle");

  if (!sidebar || !resizeHandle) return;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  let startLeft = 0;

  // 리사이즈 시작
  resizeHandle.addEventListener("mousedown", function (e) {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    const rect = sidebar.getBoundingClientRect();
    startLeft = rect.left; // 좌측 위치

    sidebar.classList.add("resizing");
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);

    e.preventDefault();
    e.stopPropagation();
  });

  // 리사이즈 중
  function handleResizeMove(e) {
    if (!isResizing) return;

    const deltaX = e.clientX - startX; // 우측으로 드래그하면 너비 증가
    const newWidth = Math.max(280, Math.min(600, startWidth + deltaX)); // 최소 280px, 최대 600px

    sidebar.style.width = `${newWidth}px`;
    sidebar.style.transition = "none"; // 리사이즈 중에는 transition 비활성화
    // 좌측 위치는 항상 0으로 유지
    sidebar.style.left = "0";

    // 메인 화면 위치 실시간 조정
    if (typeof window.updateMainContentPosition === "function") {
      window.updateMainContentPosition();
    }
  }

  // 리사이즈 종료
  function handleResizeEnd() {
    if (isResizing) {
      isResizing = false;
      sidebar.classList.remove("resizing");
      sidebar.style.transition = ""; // transition 복원
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      // 크기 저장 (좌측 기준, 항상 left: 0)
      const position = {
        left: 0,
        top: 0,
        width: sidebar.offsetWidth,
        height: sidebar.style.height || "100vh",
      };
      localStorage.setItem("sidebarPosition", JSON.stringify(position));
      localStorage.setItem(
        "sidebarSize",
        JSON.stringify({
          width: sidebar.offsetWidth,
          height: sidebar.style.height || "100vh",
        }),
      );

      // 메인 화면 위치 최종 조정
      if (typeof window.updateMainContentPosition === "function") {
        window.updateMainContentPosition();
      }

      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);

      console.log(`✅ 사이드바 크기 조정 완료: ${sidebar.offsetWidth}px`);
    }
  }
};

// 메인 화면 위치 조정 함수 (사이드바는 좌측 고정, 메인은 우측 고정)
window.updateMainContentPosition = function () {
  const sidebar = document.getElementById("sidebar");
  const mainWrapper = document.getElementById("mainWrapper");
  const header = document.querySelector("header");
  const container = document.querySelector(".container");
  const progressSteps = document.getElementById("progressSteps");

  if (!sidebar) return;

  // 모바일 사이드바는 본문을 밀지 않는 오버레이이므로 데스크톱 너비 보정을 적용하지 않는다.
  if (window.matchMedia("(max-width: 768px)").matches) {
    if (mainWrapper) {
      mainWrapper.style.marginLeft = "0";
      mainWrapper.style.marginRight = "0";
      mainWrapper.style.width = "100%";
      mainWrapper.style.maxWidth = "none";
      mainWrapper.style.overflowX = "clip";
    }

    if (header) {
      header.style.marginLeft = "0";
      header.style.width = "100%";
      header.style.maxWidth = "none";
      header.style.position = "fixed";
      header.style.left = "0";
      header.style.right = "0";
      header.style.zIndex = "1000";
    }

    if (container) {
      container.style.marginLeft = "0";
      container.style.marginRight = "0";
      container.style.width = "100%";
      container.style.maxWidth = "100%";
      container.style.paddingLeft = "12px";
      container.style.paddingRight = "12px";
      container.style.boxSizing = "border-box";
      container.style.paddingTop = `${(header ? header.offsetHeight : 150) + 62}px`;
    }

    document.documentElement.style.setProperty(
      "--header-height",
      `${header ? header.offsetHeight : 150}px`,
    );
    document.documentElement.style.setProperty("--sidebar-width", "0px");

    if (progressSteps && header) {
      progressSteps.style.top = `${header.offsetHeight + 8}px`;
      progressSteps.style.left = "12px";
      progressSteps.style.right = "12px";
      progressSteps.style.width = "auto";
      progressSteps.style.transform = "none";
    }
    return;
  }

  // 사이드바는 항상 좌측에 고정, 메인 화면은 우측에 고정
  const sidebarWidth = sidebar.offsetWidth || 320;

  // 메인 화면을 우측에 고정 (사이드바 너비만큼 좌측 마진)
  if (mainWrapper) {
    mainWrapper.style.marginLeft = `${sidebarWidth}px`;
    mainWrapper.style.marginRight = "0";
    mainWrapper.style.width = `calc(100% - ${sidebarWidth}px)`;
    mainWrapper.style.maxWidth = "none";
    mainWrapper.style.overflowX = "clip"; // 가로 스크롤 방지 (sticky 오작동 방지 위해 clip 사용)
  }

  // 헤더도 사이드바 너비에 맞춰 조정
  if (header) {
    header.style.marginLeft = `${sidebarWidth}px`;
    header.style.width = `calc(100% - ${sidebarWidth}px)`;
    header.style.maxWidth = "none";
    header.style.position = "fixed";
    header.style.left = "0";
    header.style.right = "0";
    header.style.zIndex = "1000";
  }

  if (container) {
    container.style.marginLeft = "0";
    container.style.marginRight = "0";
    container.style.width = "100%";
    container.style.maxWidth = "100%";
    container.style.paddingLeft = "var(--spacing-lg)";
    container.style.paddingRight = "var(--spacing-lg)";
    container.style.boxSizing = "border-box";

    // 헤더 높이에 맞춰 컨테이너 상단 패딩 동적 조정
    if (header) {
      const headerHeight = header.offsetHeight || 180;
      container.style.paddingTop = `${headerHeight + 62}px`; // 헤더 + 네비게이션 바 높이
    }
  }

  // CSS 변수 업데이트 — position: fixed인 .progress-steps 위치 계산에 사용
  document.documentElement.style.setProperty(
    "--header-height",
    `${header ? header.offsetHeight : 68}px`,
  );
  document.documentElement.style.setProperty(
    "--sidebar-width",
    `${sidebarWidth}px`,
  );

  // .progress-steps (position: fixed) 위치 직접 계산
  if (progressSteps && header) {
    const headerH = header.offsetHeight;
    const sw = sidebarWidth || 0;
    const availableWidth = window.innerWidth - sw;
    progressSteps.style.top = `${headerH + 8}px`; // 헤더 바로 아래 + 8px 여백
    progressSteps.style.left = `${sw + availableWidth / 2}px`; // 메인 영역 중앙
    progressSteps.style.transform = "translateX(-50%)";
  }
};

// 페이지 로드 시 드래그 및 리사이즈 기능 초기화
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      if (typeof window.initSidebarDrag === "function") {
        window.initSidebarDrag();
      }

      // ═══════════════════════════════════════════════════════════════
      // 사이드바 리사이즈 기능 초기화
      // ═══════════════════════════════════════════════════════════════
      if (typeof window.initSidebarResize === "function") {
        window.initSidebarResize();
        console.log("✅ 사이드바 리사이즈 기능 초기화 완료");
      }

      // 사이드바를 좌측에 강제 고정
      const sidebar = document.getElementById("sidebar");
      if (sidebar) {
        sidebar.style.position = "fixed";
        sidebar.style.zIndex = "10000";
        // 저장된 위치와 관계없이 항상 좌측에 강제 배치
        sidebar.style.left = "0";
        sidebar.style.right = "auto";
        sidebar.style.top = "0";

        // 저장된 크기 복원 (없으면 기본값)
        const savedPosition = localStorage.getItem("sidebarPosition");
        if (savedPosition) {
          try {
            const pos = JSON.parse(savedPosition);
            if (pos.width) {
              sidebar.style.width = `${pos.width}px`;
            } else {
              sidebar.style.width = "350px";
            }
          } catch (e) {
            sidebar.style.width = "350px";
          }
        } else {
          sidebar.style.width = "350px";
        }

        sidebar.style.height = "100vh";

        // localStorage에 좌측 위치 저장
        const currentWidth = sidebar.offsetWidth || 350;
        localStorage.setItem(
          "sidebarPosition",
          JSON.stringify({
            left: 0,
            top: 0,
            width: currentWidth,
            height: "100vh",
          }),
        );
      }
      // 메인 화면을 우측에 고정
      if (typeof window.updateMainContentPosition === "function") {
        window.updateMainContentPosition();
      }

      // ═══════════════════════════════════════════════════════════════
      // 최초 실행시 프로젝트 리스트 로드
      // ═══════════════════════════════════════════════════════════════
      if (typeof window.loadProjectList === "function") {
        setTimeout(() => {
          try {
            window.loadProjectList();
            console.log("✅ 최초 실행: 프로젝트 리스트 로드 완료");
          } catch (error) {
            console.error("⚠️ 최초 실행: 프로젝트 리스트 로드 실패:", error);
          }
        }, 300);
      }

      // 사이드바 크기 변경 시 메인 화면 위치 업데이트
      if (typeof window.ResizeObserver !== "undefined") {
        const resizeObserver = new ResizeObserver(() => {
          if (typeof window.updateMainContentPosition === "function") {
            window.updateMainContentPosition();
          }
        });
        resizeObserver.observe(sidebar);
      }
    }, 500);
  });
} else {
  setTimeout(() => {
    if (typeof window.initSidebarDrag === "function") {
      window.initSidebarDrag();
    }
    // 초기 메인 화면 위치 조정
    if (typeof window.updateMainContentPosition === "function") {
      window.updateMainContentPosition();
    }
  }, 500);
}

// 윈도우 리사이즈 시 메인 화면 위치 조정
window.addEventListener("resize", function () {
  if (typeof window.updateMainContentPosition === "function") {
    window.updateMainContentPosition();
  }
});

// 브라우저 닫기/탭 닫기/새로고침 시 자동 저장 — 각 단계 작성 중이어도 모든 내용이 저장됨
window.addEventListener("beforeunload", function () {
  try {
    if (typeof window.saveCurrentProject !== "function") return;
    if (window.currentProjectId) {
      window.saveCurrentProject();
      return;
    }
    // 프로젝트 없어도 1단계 이상 내용이 있으면 새 프로젝트 생성 후 저장
    const hasContent =
      (document.getElementById("songTitle")?.value || "").trim() ||
      (document.getElementById("originalLyrics")?.value || "").trim() ||
      (document.getElementById("sunoLyrics")?.value || "").trim();
    if (hasContent) {
      window.currentProjectId =
        window.generateProjectId();
      window.saveCurrentProject();
    }
  } catch (e) {
    console.warn("자동 저장 실패:", e);
  }
});

// 사이드바 크기 변경 시 메인 화면 위치 조정
const sidebarResizeObserver = new ResizeObserver(function (entries) {
  if (typeof window.updateMainContentPosition === "function") {
    window.updateMainContentPosition();
  }
});

// 사이드바 리사이즈 관찰 시작
setTimeout(() => {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebarResizeObserver.observe(sidebar);
  }
}, 1000);

// ═══════════════════════════════════════════════════════════════
// 3단계: Gemini 정밀 분석 함수
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// startGeminiAnalysis 헬퍼 함수들 (순수 추출 리팩터링, 동작 동일)
// ═══════════════════════════════════════════════════════════════

// AI에게 보낼 가사/스타일 분석 요청 프롬프트를 만든다.
function buildGeminiAnalysisPrompt(lyrics, stylePrompt) {
  return `다음 가사와 스타일 프롬프트를 정밀 분석하고 평가해주세요.

=== 분석 대상 ===

📝 수노 가사 (지시어 포함):
${lyrics}

🎨 스타일 프롬프트:
${stylePrompt}

=== 분석 요청 ===

다음 항목을 각각 1-100점으로 평가하고, 구체적인 피드백과 개선 사항을 제안해주세요:

1. **구조 (Structure)**: Verse, Chorus, Bridge 등의 구성이 적절한지
2. **감정 표현 (Emotion)**: 가사가 전달하는 감정이 명확하고 효과적인지
3. **운율 및 리듬 (Rhythm)**: 가사의 운율과 리듬감이 좋은지
4. **창의성 (Creativity)**: 가사의 독창성과 참신함
5. **전달력 (Impact)**: 메시지가 명확하게 전달되는지
6. **스타일 프롬프트 적합성 (Style Compatibility)**: 가사와 스타일 프롬프트가 잘 어울리는지
7. **전체 평가 (Overall Score)**: 종합적인 평가 점수

=== 응답 형식 ===

다음 JSON 형식으로 응답해주세요:

{
  "scores": {
    "structure": 85,
    "emotion": 90,
    "rhythm": 80,
    "creativity": 75,
    "impact": 88,
    "styleCompatibility": 82,
    "overall": 83
  },
  "feedbacks": [
    {
      "category": "구조",
      "score": 85,
      "strength": "Verse-Chorus 구조가 명확하고 반복되는 후렴구가 효과적입니다.",
      "weakness": "Bridge 부분이 부족하여 곡의 변화가 적습니다.",
      "suggestion": "Bridge를 추가하여 곡의 긴장감을 높이는 것을 권장합니다."
    },
    {
      "category": "감정 표현",
      "score": 90,
      "strength": "감정이 매우 명확하고 진정성 있게 전달됩니다.",
      "weakness": "일부 구절에서 감정 전달이 다소 직설적입니다.",
      "suggestion": "은유와 비유를 활용하여 감정을 더욱 풍부하게 표현해보세요."
    }
  ],
  "improvements": [
    "Bridge 섹션 추가를 고려해보세요",
    "은유적 표현을 더 활용하면 감정 전달이 더욱 효과적일 것입니다",
    "스타일 프롬프트의 템포와 가사의 리듬을 더욱 조화롭게 맞춰보세요"
  ],
  "summary": "전반적으로 우수한 가사입니다. 구조와 감정 표현이 뛰어나며, 스타일 프롬프트와도 잘 어울립니다. Bridge 추가와 은유적 표현 활용을 통해 더욱 완성도 높은 작품이 될 수 있을 것입니다."
}

**중요**: JSON 형식만 출력하고, 다른 설명이나 텍스트는 포함하지 마세요.`;
}

// AI 응답을 다단계로 파싱한다: 표준 JSON → 후행 콤마 제거 → 부분(정규식)
// 추출 → 그래도 실패하면 원본 텍스트를 담은 에러 객체. 기존 로직 그대로.
function parseGeminiAnalysisResponse(aiResponse) {
  let analysisData;
  try {
    // 1단계: 마크다운 코드 블록 제거
    let cleanedResponse = aiResponse.trim();
    cleanedResponse = cleanedResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // 2단계: JSON 블록 전체 추출
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      // 2-1) 표준 파싱 시도
      try {
        analysisData = JSON.parse(jsonMatch[0]);
      } catch (e1) {
        // 2-2) 후행 콤마 제거 후 재시도
        const fixed = jsonMatch[0].replace(/,\s*([}\]])/g, '$1');
        try {
          analysisData = JSON.parse(fixed);
          console.log('✅ 후행 콤마 제거 후 파싱 성공');
        } catch (e2) {
          // 2-3) 부분 추출 (feedbacks, improvements, scores 개별 추출)
          console.warn('⚠️ 전체 JSON 파싱 실패 - 부분 추출 시도:', e2.message);
          const partialData = {};

          // scores 추출
          try {
            const sm = jsonMatch[0].match(/"scores"\s*:\s*(\{[^}]+\})/);
            if (sm) partialData.scores = JSON.parse(sm[1].replace(/,\s*([}\]])/g, '$1'));
          } catch (e) {}

          // feedbacks 배열 추출 (각 객체를 개별 파싱)
          try {
            const fbBlock = jsonMatch[0].match(/"feedbacks"\s*:\s*\[([\s\S]*?)\]\s*,?\s*"improvements"/);
            const fbSrc = fbBlock ? fbBlock[1] : jsonMatch[0];
            const feedbacks = [];
            const singleFb = /\{([^{}]*)"category"([^{}]*)\}/g;
            let fm;
            while ((fm = singleFb.exec(fbSrc)) !== null) {
              try {
                const cleaned = fm[0].replace(/,\s*([}\]])/g, '$1');
                feedbacks.push(JSON.parse(cleaned));
              } catch (e) {
                // 개별 객체 파싱 실패 시 suggestion 직접 추출
                const catM = fm[0].match(/"category"\s*:\s*"([^"]+)"/);
                const sugM = fm[0].match(/"suggestion"\s*:\s*"([^"]+)"/);
                if (catM || sugM) {
                  feedbacks.push({
                    category: catM ? catM[1] : '제안',
                    suggestion: sugM ? sugM[1] : ''
                  });
                }
              }
            }
            if (feedbacks.length > 0) partialData.feedbacks = feedbacks;
          } catch (e) {}

          // improvements 배열 추출
          try {
            const im = jsonMatch[0].match(/"improvements"\s*:\s*\[([\s\S]*?)\]/);
            if (im) {
              const items = im[1].match(/"([^"]+)"/g);
              if (items) partialData.improvements = items.map(s => s.replace(/^"|"$/g, ''));
            }
          } catch (e) {}

          // summary 추출
          try {
            const sum = jsonMatch[0].match(/"summary"\s*:\s*"([^"]+)"/);
            if (sum) partialData.summary = sum[1];
          } catch (e) {}

          if (partialData.feedbacks || partialData.improvements || partialData.scores) {
            analysisData = partialData;
            console.log('✅ 부분 추출 성공 - feedbacks:', (partialData.feedbacks || []).length, '개');
          } else {
            throw new Error('부분 추출도 실패: ' + e2.message);
          }
        }
      }
    } else {
      throw new Error('JSON 형식을 찾을 수 없습니다.');
    }
  } catch (parseError) {
    console.error('JSON 파싱 최종 실패:', parseError);
    console.error('AI 응답:', aiResponse);
    analysisData = {
      raw: aiResponse,
      error: 'JSON 파싱 실패',
    };
  }
  return analysisData;
}

// 분석 결과 데이터를 결과 패널용 HTML 문자열로 렌더링한다.
function renderGeminiAnalysisResultHtml(analysisData) {
  let resultHtml = "";

  if (analysisData.error) {
    // 파싱 실패 시 원본 텍스트 표시
    resultHtml = `
                    <div style="padding: 20px; background: var(--bg-input); border-radius: 8px; margin-bottom: 15px;">
                        <h4 style="margin-bottom: 10px; color: var(--text-primary);">⚠️ 분석 결과 (텍스트 형식)</h4>
                        <div style="white-space: pre-wrap; color: var(--text-secondary); line-height: 1.8;">${escapeHtml(analysisData.raw)}</div>
                    </div>
                `;
    return resultHtml;
  }

  // 점수 표시
  if (analysisData.scores) {
    const scores = analysisData.scores;
    const overallScore = scores.overall || scores.overallScore || 0;

    resultHtml += `
                        <div style="padding: 20px; background: var(--bg-input); border-radius: 8px; margin-bottom: 20px;">
                            <h4 style="margin-bottom: 15px; color: var(--text-primary);">📊 종합 평가</h4>
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                                <div style="font-size: 3rem; font-weight: bold; color: var(--accent);">${overallScore}</div>
                                <div style="flex: 1;">
                                    <div style="background: var(--bg-card); height: 20px; border-radius: 10px; overflow: hidden; margin-bottom: 5px;">
                                        <div style="background: linear-gradient(90deg, var(--accent), var(--success)); height: 100%; width: ${overallScore}%; transition: width 0.3s;"></div>
                                    </div>
                                    <div style="font-size: 0.85rem; color: var(--text-secondary);">100점 만점</div>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px;">
                                <div style="padding: 15px; background: var(--bg-card); border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">구조</div>
                                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">${scores.structure || 0}</div>
                                </div>
                                <div style="padding: 15px; background: var(--bg-card); border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">감정 표현</div>
                                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">${scores.emotion || 0}</div>
                                </div>
                                <div style="padding: 15px; background: var(--bg-card); border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">운율/리듬</div>
                                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">${scores.rhythm || 0}</div>
                                </div>
                                <div style="padding: 15px; background: var(--bg-card); border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">창의성</div>
                                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">${scores.creativity || 0}</div>
                                </div>
                                <div style="padding: 15px; background: var(--bg-card); border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">전달력</div>
                                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">${scores.impact || 0}</div>
                                </div>
                                <div style="padding: 15px; background: var(--bg-card); border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">스타일 적합성</div>
                                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">${scores.styleCompatibility || 0}</div>
                                </div>
                            </div>
                        </div>
                    `;
  }

  // 피드백 표시
  if (analysisData.feedbacks && analysisData.feedbacks.length > 0) {
    resultHtml += `
                        <div style="padding: 20px; background: var(--bg-input); border-radius: 8px; margin-bottom: 20px;">
                            <h4 style="margin-bottom: 15px; color: var(--text-primary);">💬 상세 피드백</h4>
                    `;

    analysisData.feedbacks.forEach((feedback, index) => {
      resultHtml += `
                            <div style="padding: 15px; background: var(--bg-card); border-radius: 8px; margin-bottom: 15px; border-left: 4px solid var(--accent);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <h5 style="margin: 0; color: var(--text-primary);">${escapeHtml(feedback.category || "분류 없음")}</h5>
                                    <span style="font-size: 1.2rem; font-weight: bold; color: var(--accent);">${feedback.score || 0}점</span>
                                </div>
                                ${feedback.strength ? `<div style="margin-bottom: 10px;"><strong style="color: var(--success);">✅ 강점:</strong> <span style="color: var(--text-secondary);">${escapeHtml(feedback.strength)}</span></div>` : ""}
                                ${feedback.weakness ? `<div style="margin-bottom: 10px;"><strong style="color: var(--warning);">⚠️ 개선점:</strong> <span style="color: var(--text-secondary);">${escapeHtml(feedback.weakness)}</span></div>` : ""}
                                ${feedback.suggestion ? `<div><strong style="color: var(--accent);">💡 제안:</strong> <span style="color: var(--text-secondary);">${escapeHtml(feedback.suggestion)}</span></div>` : ""}
                            </div>
                        `;
    });

    resultHtml += `</div>`;
  }

  // 개선 사항 표시
  if (analysisData.improvements && analysisData.improvements.length > 0) {
    resultHtml += `
                        <div style="padding: 20px; background: var(--bg-input); border-radius: 8px; margin-bottom: 20px;">
                            <h4 style="margin-bottom: 15px; color: var(--text-primary);">🔧 개선 사항</h4>
                            <ul style="margin: 0; padding-left: 20px; line-height: 2;">
                    `;

    analysisData.improvements.forEach((improvement) => {
      resultHtml += `<li style="color: var(--text-secondary); margin-bottom: 8px;">${escapeHtml(improvement)}</li>`;
    });

    resultHtml += `</ul></div>`;
  }

  // 요약 표시
  if (analysisData.summary) {
    resultHtml += `
                        <div style="padding: 20px; background: linear-gradient(135deg, var(--bg-input), var(--bg-card)); border-radius: 8px; border: 2px solid var(--accent);">
                            <h4 style="margin-bottom: 10px; color: var(--text-primary);">📝 종합 요약</h4>
                            <p style="color: var(--text-secondary); line-height: 1.8; margin: 0;">${escapeHtml(analysisData.summary)}</p>
                        </div>
                    `;
  }

  return resultHtml;
}

// 분석 결과를 현재 프로젝트 데이터에 저장한다 (프로젝트가 없으면 DOM
// 기준으로 새로 생성). 기존 로직 그대로.
function saveGeminiAnalysisToProject(analysisData) {
  if (!window.currentProject) {
    const pid = window.currentProjectId || window.generateProjectId();
    window.currentProjectId = pid;
    window.currentProject = {
      id: pid,
      title:
        document.getElementById("songTitle")?.value ||
        document.getElementById("sunoTitle")?.value ||
        "제목 없음",
      lastStep: 3,
      data: {},
    };
  }
  if (!window.currentProject.data) {
    window.currentProject.data = {};
  }
  window.currentProject.data.analysis = analysisData;
  window.currentProject.data.feedbacks = analysisData.feedbacks || [];
  // 전역 백업 저장 (4단계에서 currentProject 참조 실패 시 사용)
  window.__lastAnalysisData = analysisData;
  // 2단계 데이터도 있으면 유지 (다음 저장 시 포함되도록)
  if (
    !window.currentProject.data.sunoLyrics &&
    document.getElementById("sunoLyrics")?.value
  ) {
    window.currentProject.data.sunoLyrics =
      document.getElementById("sunoLyrics").value;
  }
  if (
    !window.currentProject.data.stylePrompt &&
    document.getElementById("stylePrompt")?.value
  ) {
    window.currentProject.data.stylePrompt =
      document.getElementById("stylePrompt").value;
  }
}

window.startGeminiAnalysis = async function () {
  try {
    // 분석 대상 데이터 가져오기
    const analysisTargetLyrics = document.getElementById(
      "analysisTargetLyrics",
    );
    const analysisTargetStyle = document.getElementById("analysisTargetStyle");
    const geminiAnalysisCard = document.getElementById("geminiAnalysisCard");
    const geminiAnalysisResult = document.getElementById(
      "geminiAnalysisResult",
    );
    const geminiStatus = document.getElementById("geminiStatus");
    const startAnalysisBtn = document.getElementById("startAnalysisBtn");

    if (!analysisTargetLyrics || !analysisTargetStyle) {
      window.showToast(
        "⚠️ 분석할 가사와 스타일 프롬프트가 없습니다.\n\n2단계에서 가사와 스타일 프롬프트를 생성한 후 다시 시도해주세요.", "error");
      return;
    }

    const lyrics = analysisTargetLyrics.textContent.trim();
    const stylePrompt = analysisTargetStyle.textContent.trim();

    if (!lyrics || !stylePrompt) {
      window.showToast(
        "⚠️ 분석할 가사와 스타일 프롬프트가 비어있습니다.\n\n2단계에서 가사와 스타일 프롬프트를 생성한 후 다시 시도해주세요.", "error");
      return;
    }

    // Gemini API 키 확인
    const geminiKey = (typeof window.getGeminiApiKey === "function" ? window.getGeminiApiKey() : localStorage.getItem("gemini_api_key")) || "";
    if (!geminiKey || !geminiKey.startsWith("AIza")) {
      window.showToast(
        '⚠️ Gemini API 키가 설정되지 않았습니다.\n\n"API 키" 버튼을 클릭하여 Gemini API 키를 설정해주세요.', "error");
      if (typeof window.openAPISettings === "function") {
        window.openAPISettings();
      }
      return;
    }

    // UI 업데이트: 분석 시작
    if (startAnalysisBtn) {
      startAnalysisBtn.disabled = true;
      startAnalysisBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> 분석 중...';
    }

    if (geminiAnalysisCard) {
      geminiAnalysisCard.style.display = "block";
    }

    if (geminiStatus) {
      geminiStatus.textContent = "분석 중...";
      geminiStatus.style.color = "var(--accent)";
    }

    if (geminiAnalysisResult) {
      geminiAnalysisResult.innerHTML =
        '<div style="text-align: center; padding: 40px;"><div class="spinner" style="margin: 0 auto 20px;"></div><p>🤖 Gemini가 가사와 스타일 프롬프트를 분석 중입니다...</p></div>';
    }

    const analysisPrompt = buildGeminiAnalysisPrompt(lyrics, stylePrompt);

    const aiResponse = await window.callAIWithTextFallback({
      prompt: analysisPrompt,
      geminiKey,
      contextLabel: "분석",
      temperature: 0.7,
      maxOutputTokens: 6000,
      openaiSystemMessage:
        "You are an AI songwriter that strictly responds with valid JSON matching the user's requested format.",
    });

    if (!aiResponse.trim()) {
      throw new Error("Gemini API에서 응답을 받지 못했습니다.");
    }

    const analysisData = parseGeminiAnalysisResponse(aiResponse);

    // 분석 결과 표시
    if (geminiAnalysisResult) {
      geminiAnalysisResult.innerHTML = renderGeminiAnalysisResultHtml(analysisData);
    }

    // 상태 업데이트
    if (geminiStatus) {
      geminiStatus.textContent = "분석 완료";
      geminiStatus.style.color = "var(--success)";
    }

    if (startAnalysisBtn) {
      startAnalysisBtn.disabled = false;
      startAnalysisBtn.innerHTML = '<i class="fas fa-redo"></i> 다시 분석';
    }

    // 분석 결과를 프로젝트 데이터에 저장 (currentProject 없으면 DOM 기준으로 생성해 저장)
    saveGeminiAnalysisToProject(analysisData);

    console.log("✅ Gemini 분석 완료:", analysisData);
    console.log("✅ 전역 백업 저장 완료 (window.__lastAnalysisData)");

    // Step 4 제안 사항 목록 미리 표시 (js/step4.js) - 4단계 이동 전에도 호출
    if (typeof window.displayImprovements === "function") {
      window.displayImprovements(analysisData);
    }

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator("✅ Gemini 정밀 분석이 완료되었습니다!");
    }
  } catch (error) {
    console.error("❌ Gemini 분석 오류:", error);

    let errorMessage = error.message;
    if (error.name === "AbortError") {
      errorMessage = "API 요청 시간이 초과되었습니다. (60초)";
    }

    if (geminiStatus) {
      geminiStatus.textContent = "분석 실패";
      geminiStatus.style.color = "var(--error)";
    }

    if (geminiAnalysisResult) {
      geminiAnalysisResult.innerHTML = `
                <div style="padding: 20px; background: var(--bg-input); border-radius: 8px; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                    <h4 style="margin-bottom: 10px; color: var(--error);">분석 중 오류가 발생했습니다</h4>
                    <p style="color: var(--text-secondary); margin-bottom: 15px;">${escapeHtml(errorMessage)}</p>
                    <button class="btn btn-primary" onclick="if(typeof window.startGeminiAnalysis === 'function') { window.startGeminiAnalysis(); }">
                        <i class="fas fa-redo"></i> 다시 시도
                    </button>
                </div>
            `;
    }

    if (startAnalysisBtn) {
      startAnalysisBtn.disabled = false;
      startAnalysisBtn.innerHTML = '<i class="fas fa-magic"></i> 분석 시작';
    }

    // 전역 로딩 상태 명시적 해제
    const analysisLoading = document.getElementById("analysisLoading");
    if (analysisLoading) analysisLoading.style.display = "none";

    window.showToast(
      "⚠️ Gemini 분석 중 오류가 발생했습니다.\n\n" +
        "원인: " +
        errorMessage +
        "\n\n" +
        "해결방법:\n" +
        "1. API 키가 올바른지 확인하세요\n" +
        "2. 네트워크 연결을 확인하세요\n" +
        "3. 잠시 후 다시 시도해주세요", "error");
  }
};

// ═══════════════════════════════════════════════════════════════
// 공용 AI 호출 헬퍼: Gemini 시도 → 실패 시 ChatGPT 폴백
// (기존에 동일 구조의 폴백 블록이 함수마다 복붙되어 타임아웃/사용량 로깅이
//  제각각이던 것을 단일 경로로 통합. 텍스트 프롬프트 전용 — 오디오 등
//  멀티모달 입력은 폴백이 불가능하므로 이 헬퍼를 쓰지 않는다.)
// ═══════════════════════════════════════════════════════════════
window.callAIWithTextFallback = async function ({
  prompt,
  geminiKey,
  contextLabel = "AI 요청",
  temperature = 0.7,
  maxOutputTokens = 3000,
  geminiJsonMime = true,
  openaiSystemMessage = "You are an AI assistant that strictly responds with valid JSON matching the user's requested format.",
  timeoutMs = 60000,
}) {
  try {
    if (!geminiKey || !geminiKey.startsWith("AIza")) {
      throw new Error("Gemini API 키가 없습니다.");
    }
    const currentGeminiModel = window.getGeminiModel
      ? window.getGeminiModel()
      : (window.AI_DEFAULTS && window.AI_DEFAULTS.GEMINI_MODEL) || "gemini-2.5-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentGeminiModel}:generateContent?key=${geminiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            topK: 40,
            topP: 0.95,
            maxOutputTokens,
            ...(geminiJsonMime ? { responseMimeType: "application/json" } : {}),
          },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
    }

    const data = await response.json();
    if (window.logApiUsage) window.logApiUsage("gemini");
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text.trim()) throw new Error("Gemini 응답이 비어있습니다.");
    return text;
  } catch (geminiError) {
    if (typeof window.handleGeminiApiFailure === "function") {
      window.handleGeminiApiFailure(geminiError);
    }
    console.warn(`⚠️ Gemini ${contextLabel} 실패, ChatGPT로 전환하여 재시도합니다:`, geminiError.message);
    const openaiKey = window.getOpenAIApiKey ? window.getOpenAIApiKey() : "";
    if (!openaiKey) {
      throw new Error(`Gemini ${contextLabel} 실패 (${geminiError.message}) 후 ChatGPT 폴백을 시도했으나 OpenAI API 키가 없습니다.`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let chatGPTResponse;
    try {
      chatGPTResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: window.getOpenAIModel ? window.getOpenAIModel() : "gpt-4o-mini",
          messages: [
            { role: "system", content: openaiSystemMessage },
            { role: "user", content: prompt },
          ],
          temperature,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!chatGPTResponse.ok) {
      const errorData = await chatGPTResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `ChatGPT API 오류: ${chatGPTResponse.status}`);
    }

    const chatGPTData = await chatGPTResponse.json();
    if (window.logApiUsage) window.logApiUsage("openai");
    return chatGPTData.choices?.[0]?.message?.content || "";
  }
};

// Step 4 관련 중복 함수 제거됨 (js/step4.js에서 관리)
// updateSelectedCount, selectAllImprovements, deselectAllImprovements, applySelectedImprovements 등

// ═══════════════════════════════════════════════════════════════
// 5단계: 음원 업로드 및 분석 함수들
// ═══════════════════════════════════════════════════════════════

// 음원 파일 업로드 처리
window.handleIntermediateAudioUpload = function (event) {
  try {
    const fileInput = event.target;
    const file = fileInput.files[0];

    if (!file) {
      console.warn("⚠️ 파일이 선택되지 않았습니다.");
      return;
    }

    // 파일 타입 검증
    const validAudioTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/mp4",
      "audio/m4a",
      "audio/x-m4a",
      "audio/ogg",
      "audio/webm",
    ];
    const fileType = file.type || "";
    const fileName = file.name.toLowerCase();
    const isValidType =
      validAudioTypes.includes(fileType) ||
      fileName.endsWith(".mp3") ||
      fileName.endsWith(".wav") ||
      fileName.endsWith(".m4a") ||
      fileName.endsWith(".ogg") ||
      fileName.endsWith(".webm");

    if (!isValidType) {
      window.showToast(
        "⚠️ 지원하지 않는 파일 형식입니다.\n\n지원 형식: MP3, WAV, M4A, OGG, WEBM", "error");
      fileInput.value = ""; // 파일 선택 초기화
      return;
    }

    // 파일 크기 검증
    // Gemini 인라인 요청 한도(~20MB, base64 팽창 포함)를 넘으면 어차피 실패하므로
    // 업로드 단계에서 15MB로 제한해 대용량 메모리 낭비와 확정 실패를 막는다.
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      window.showToast(
        "⚠️ 파일 크기가 너무 큽니다.\n\n최대 크기: 15MB (AI 오디오 분석 한도)\n현재 크기: " +
          (file.size / 1024 / 1024).toFixed(2) +
          "MB\n\n💡 MP3(128kbps 내외)로 변환하면 대부분의 곡이 15MB 이하가 됩니다.", "error");
      fileInput.value = "";
      return;
    }

    console.log(
      "✅ 음원 파일 선택됨:",
      file.name,
      "크기:",
      (file.size / 1024 / 1024).toFixed(2) + "MB",
    );

    // 파일을 전역 변수에 저장
    window.intermediateAudioFile = file;

    // 업로드 영역 업데이트
    const innerUI = document.getElementById("intermediateAudioUploadUI");
    if (innerUI) {
      const uploadArea = innerUI.closest(".audio-upload-area");
      if (uploadArea) {
        uploadArea.style.borderColor = "var(--success)";
        uploadArea.style.backgroundColor = "var(--bg-card)";
      }
      innerUI.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 15px;">✅</div>
                <div style="color: var(--text-primary); font-weight: 600; margin-bottom: 5px;">${escapeHtml(file.name)}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 10px; cursor: pointer; text-decoration: underline;" onclick="event.stopPropagation(); if(typeof window.resetIntermediateAudioUpload === 'function') { window.resetIntermediateAudioUpload(); } else { location.reload(); }">다른 파일 선택</div>
            `;
    }

    // 분석 버튼 표시
    const analyzeBtn = document.getElementById("analyzeIntermediateAudioBtn");
    if (analyzeBtn) {
      analyzeBtn.classList.remove("hidden");
      analyzeBtn.style.display = "block";
    }

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator("✅ 음원 파일이 업로드되었습니다!");
    }
  } catch (error) {
    console.error("❌ 음원 업로드 오류:", error);
    window.showToast("⚠️ 음원 파일 업로드 중 오류가 발생했습니다.\n\n" + error.message, "error");
  }
};

/**
 * Step 5 음원 업로드 영역 초기화 (다른 파일 선택 시)
 */
window.resetIntermediateAudioUpload = function () {
  try {
    const innerUI = document.getElementById("intermediateAudioUploadUI");
    const fileInput = document.getElementById("intermediateAudioFileInput");

    if (fileInput) {
      fileInput.value = "";
    }
    window.intermediateAudioFile = null;

    if (innerUI) {
      const uploadArea = innerUI.closest(".audio-upload-area");
      if (uploadArea) {
        uploadArea.style.borderColor = "var(--border)";
        uploadArea.style.backgroundColor = "var(--bg-input)";
      }
      innerUI.innerHTML = `
                <div style="font-size: 2.5rem; margin-bottom: 15px; filter: drop-shadow(0 0 10px rgba(108, 92, 231, 0.3));">📤</div>
                <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">클릭하여 음원 파일 업로드</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">MP3, WAV, M4A (최대 20MB)</div>
            `;
    }

    const analyzeBtn = document.getElementById("analyzeIntermediateAudioBtn");
    if (analyzeBtn) {
      analyzeBtn.style.display = "none";
      analyzeBtn.classList.add("hidden");
    }

    console.log("✅ 음원 업로드 영역이 초기화되었습니다.");
  } catch (error) {
    console.error("❌ 업로드 초기화 중 오류:", error);
  }
};

// 음원 분석 및 최종 가사 반영
// ═══════════════════════════════════════════════════════════════
// analyzeIntermediateAudio 헬퍼 함수들 (순수 추출 리팩터링, 동작 동일)
// ═══════════════════════════════════════════════════════════════

// 음원 분석 요청 프롬프트를 만든다.
function buildAudioAnalysisPrompt(sunoLyricsForCopy, sunoStyleForCopy, guidelines) {
  return `다음 음원 파일을 분석하여 다음을 수행해주세요:

1. **가사 추출**: 음원에서 들리는 가사를 정확하게 추출해주세요
2. **지시어 포함 가사 형식**: 추출한 가사를 "Suno 가사란에 복사할 내용" 형식(지시어 포함)으로 변환해주세요
3. **가사 분석**: 추출한 가사가 원본 가사와 일치하는지 확인하고, 차이점이 있으면 알려주세요
4. **스타일 프롬프트 분석**: 음원의 스타일이 원본 스타일 프롬프트와 일치하는지 확인해주세요
5. **개선 제안**: 음원을 듣고 가사나 스타일 프롬프트에 대한 개선 제안을 해주세요
6. **음원 반영 평가 점수**: 실제 업로드 음원 기준으로 최종 평가에 반영할 점수를 0-100점으로 산정해주세요

${
  sunoLyricsForCopy
    ? `=== 참고: Suno 가사란에 복사할 내용 (원본 가사 - 지시어 포함) ===
${sunoLyricsForCopy}

`
    : ""
}${
          sunoStyleForCopy
            ? `=== 참고: Suno 스타일란에 복사할 내용 (원본 스타일 프롬프트) ===
${sunoStyleForCopy}

`
            : ""
        }${
          guidelines
            ? `=== 참고: 뮤직모리 제작 지침서 ===
${guidelines.substring(0, 2000)}${guidelines.length > 2000 ? "..." : ""}

`
            : ""
        }=== 분석 요청 사항 ===

1. **가사 추출 및 형식 변환**:
   - 음원에서 들리는 가사를 정확하게 추출
   - 추출한 가사를 "Suno 가사란에 복사할 내용" 형식으로 변환
   - 지시어([Tempo:], [Vocal:], [Instruments:], [Mod:], [Reverb:] 등)를 적절히 포함
   - 원본 가사의 구조([Intro], [Verse 1], [Chorus] 등)를 참고하여 유사한 구조로 작성
   - 지침서의 가사 구조 규칙을 준수

2. **원본 가사와 비교**:
   - 추출한 가사가 원본 가사와 일치하는지 확인
   - 차이점이 있으면 구체적으로 설명
   - 지시어의 차이점도 포함하여 설명

3. **스타일 프롬프트 분석**:
   - 음원의 스타일이 원본 스타일 프롬프트와 일치하는지 확인
   - 차이점이 있으면 구체적으로 설명

4. **개선 제안**:
   - 가사 개선 제안 (구조, 내용, 지시어 등)
   - 스타일 프롬프트 개선 제안
   - 지침서를 참고하여 구체적인 개선 방안 제시

5. **점수 산정**:
   - audioScore: 실제 음원의 보컬 전달력, 멜로디/편곡 완성도, 음질, 몰입감 종합 점수
   - lyricDeliveryScore: 실제 음원에서 가사가 명확하게 전달되는 정도
   - styleMatchScore: 실제 음원과 스타일 프롬프트의 일치도
   - recommendedFinalScore: 최종 평가 요약의 "개선 후" 점수에 반영할 권장 점수

=== 응답 형식 ===
다음 JSON 형식으로 응답해주세요:

{
  "extractedLyrics": "추출된 가사 (지시어 포함, Suno 가사란 형식)",
  "extractedLyricsPlain": "추출된 가사 (지시어 제외, 순수 가사만)",
  "matchesOriginal": true/false,
  "differences": "원본과의 차이점 설명 (가사 내용, 지시어, 구조 등)",
  "styleMatches": true/false,
  "styleDifferences": "스타일 프롬프트 차이점 설명",
  "audioScore": 88,
  "lyricDeliveryScore": 86,
  "styleMatchScore": 90,
  "recommendedFinalScore": 89,
  "suggestions": [
    "가사 개선 제안 1",
    "가사 개선 제안 2",
    "스타일 프롬프트 개선 제안 1"
  ],
  "analysis": "음원 분석 결과 및 평가 (전체적인 평가, 품질, 개선점 등)"
}

**중요**: 
- JSON 형식만 출력하고, 다른 설명이나 텍스트는 포함하지 마세요.
- "extractedLyrics"는 반드시 지시어가 포함된 "Suno 가사란에 복사할 내용" 형식으로 작성해주세요.
- **중요**: 곡 제목은 별도 필드에서 관리하므로 가사 텍스트 내에 제목을 절대 포함하지 마세요. 가사와 지시어만 출력하세요.
- 지침서의 가사 구조 규칙을 준수하여 작성해주세요.`;
}

// Gemini에 음원 파일과 프롬프트를 보내 분석 텍스트를 받아온다.
// 실패 시 (Gemini 폴백 처리 후) 안내 메시지를 담은 Error를 던진다.
async function callGeminiAudioAnalysisAPI(prompt, file, base64Audio, geminiKey) {
  try {
    // Gemini API 호출 (음원 파일 포함)
    const currentGeminiModel = window.getGeminiModel ? window.getGeminiModel() : (window.AI_DEFAULTS && window.AI_DEFAULTS.GEMINI_MODEL) || "gemini-2.5-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentGeminiModel}:generateContent?key=${geminiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: file.type || "audio/mpeg",
                  data: base64Audio,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 16000,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API 오류: ${response.status}`,
      );
    }

    const data = await response.json();
    if (window.logApiUsage) window.logApiUsage("gemini");
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (geminiError) {
    if (typeof window.handleGeminiApiFailure === "function") {
      window.handleGeminiApiFailure(geminiError);
    }
    // ChatGPT 텍스트 폴백은 오디오를 들을 수 없어 가사·점수를 지어내므로
    // (환각 결과가 실제 평가에 반영되는 데이터 무결성 문제) 수행하지 않는다.
    throw new Error(
      "Gemini 오디오 분석에 실패했습니다: " + geminiError.message +
      "\n\n오디오를 직접 분석할 수 없는 텍스트 모델로는 대체 분석이 불가능합니다." +
      "\n잠시 후 다시 시도하거나, 파일 용량(15MB 이하)과 API 상태를 확인해 주세요.",
    );
  }
}

// AI 응답을 다단계로 파싱한다: 표준 JSON → 후행 콤마 제거 → 잘린 JSON
// 필드별 직접 추출 → 그래도 실패하면 { _rawJson } 최종 폴백.
function parseAudioAnalysisResponse(aiResponse) {
  let analysisData;
  const extractJsonField = (key, src) => {
    // key: "value" 패턴 추출 (잘린 JSON 대응)
    const re = new RegExp('"' + key + '"\\s*:\\s*"([\\s\\S]*?)(?<!\\\\)"(?=\\s*[,}]|\\s*"[a-z])', 'i');
    const m = src.match(re);
    return m ? m[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"') : null;
  };
  try {
    let cleanedResponse = aiResponse.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // 1차 표준 파싱
    try {
      analysisData = JSON.parse(cleanedResponse);
      console.log('✅ 음원 분석 JSON 파싱 성공');
    } catch (e1) {
      // 2차: 후행 콤마 제거
      try {
        analysisData = JSON.parse(cleanedResponse.replace(/,\s*([}\]])/g, '$1'));
        console.log('✅ 후행 콤마 제거 후 파싱 성공');
      } catch (e2) {
        // 3차: 잘린 JSON에서 필드별 직접 추출
        console.warn('⚠️ JSON 잘림 감지 - 필드 직접 추출:', e2.message);
        const pd = {};
        ['extractedLyrics','extractedLyricsPlain','differences','styleDifferences','analysis'].forEach(k => {
          const v = extractJsonField(k, cleanedResponse);
          if (v) pd[k] = v;
        });
        // suggestions 배열 추출
        const sm = cleanedResponse.match(/"suggestions"\s*:\s*\[([\s\S]*?)\]/);
        if (sm) {
          const items = [];
          const ir = /"((?:[^"\\]|\\.)*)"/g;
          let im;
          while ((im = ir.exec(sm[1])) !== null) {
            items.push(im[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'));
          }
          if (items.length) pd.suggestions = items;
        }
        analysisData = Object.keys(pd).length > 0 ? pd : { _rawJson: aiResponse };
        console.log('✅ 부분 추출 결과 키:', Object.keys(analysisData));
      }
    }
  } catch (parseError) {
    console.error('음원 분석 JSON 파싱 최종 실패:', parseError);
    analysisData = { _rawJson: aiResponse };
  }
  return analysisData;
}

// 분석 결과 데이터를 결과 패널용 HTML 문자열로 렌더링한다.
// (extractedLyrics가 있으면 window.extractedLyricsForApply에도 저장 - 원본 동작 그대로)
function renderAudioAnalysisResultHtml(analysisData) {
  let resultHtml = '<div style="padding: 20px;">';
  resultHtml +=
    '<h4 style="margin-bottom: 15px; color: var(--text-primary);">🎵 음원 분석 결과</h4>';

  // _rawJson 폴백: 파싱 완전 실패 시
  if (analysisData._rawJson && !analysisData.extractedLyrics) {
    resultHtml += `
            <div style="padding: 15px; background: var(--bg-input); border-radius: 8px; margin-bottom: 15px;">
              <h5 style="color: var(--warning); margin-bottom: 10px;">⚠️ 응답 파싱 실패 - 원본 응답</h5>
              <div style="white-space: pre-wrap; color: var(--text-secondary); font-family: monospace; font-size: 0.85rem; max-height: 300px; overflow-y: auto;">${escapeHtml(analysisData._rawJson.substring(0, 2000))}</div>
            </div>`;
  }

  // 추출된 가사 (지시어 포함) 표시
  if (analysisData.extractedLyrics) {
    resultHtml += `
            <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
              <h5 style="margin-bottom: 10px; color: var(--accent);">📝 추출된 가사 (지시어 포함 - Suno 가사란 형식)</h5>
              <div style="white-space: pre-wrap; color: var(--text-secondary); line-height: 1.8; font-family: monospace; font-size: 0.9rem; background: var(--bg-card); padding: 15px; border-radius: 6px; border: 1px solid var(--border);">${escapeHtml(analysisData.extractedLyrics)}</div>
              <div style="margin-top: 10px; font-size: 0.85rem; color: var(--text-secondary);">
                  💡 이 가사는 "Suno 가사란에 복사할 내용" 형식으로 작성되었습니다. 지시어가 포함되어 있어 Suno에 바로 사용할 수 있습니다.
              </div>
            </div>`;
  }

  // 추출된 가사 (순수 가사만) 표시
  if (analysisData.extractedLyricsPlain) {
    resultHtml += `
            <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
              <h5 style="margin-bottom: 10px; color: var(--accent);">📝 추출된 가사 (순수 가사만)</h5>
              <div style="white-space: pre-wrap; color: var(--text-secondary); line-height: 1.8; font-family: monospace; font-size: 0.9rem;">${escapeHtml(analysisData.extractedLyricsPlain)}</div>
            </div>`;
  }

  const audioScoreValue = getAudioAnalysisScoreValue(analysisData, 0);
  if (audioScoreValue) {
    resultHtml += `
            <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
              <h5 style="margin-bottom: 10px; color: var(--accent);">📈 음원 반영 평가 점수</h5>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">
                <div><strong>${audioScoreValue}</strong>점<br><span style="color:var(--text-secondary);font-size:0.85rem;">최종 반영 권장</span></div>
                <div><strong>${analysisData.audioScore ?? "-"}</strong>점<br><span style="color:var(--text-secondary);font-size:0.85rem;">음원 종합</span></div>
                <div><strong>${analysisData.lyricDeliveryScore ?? "-"}</strong>점<br><span style="color:var(--text-secondary);font-size:0.85rem;">가사 전달</span></div>
                <div><strong>${analysisData.styleMatchScore ?? "-"}</strong>점<br><span style="color:var(--text-secondary);font-size:0.85rem;">스타일 일치</span></div>
              </div>
            </div>`;
  }

  if (analysisData.matchesOriginal !== undefined) {
    resultHtml += `
                        <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
                            <h5 style="margin-bottom: 10px; color: var(--accent);">✅ 원본 일치 여부</h5>
                            <div style="color: var(--text-primary); font-size: 1.1rem; font-weight: 600;">
                                ${analysisData.matchesOriginal ? "✅ 원본 가사와 일치합니다" : "⚠️ 원본 가사와 차이가 있습니다"}
                            </div>
                        </div>
                    `;
  }

  if (analysisData.differences) {
    resultHtml += `
                        <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
                            <h5 style="margin-bottom: 10px; color: var(--accent);">📊 가사 차이점</h5>
                            <div style="white-space: pre-wrap; color: var(--text-secondary); line-height: 1.8;">${escapeHtml(analysisData.differences)}</div>
                        </div>
                    `;
  }

  // 스타일 프롬프트 차이점 표시
  if (analysisData.styleMatches !== undefined) {
    resultHtml += `
                        <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
                            <h5 style="margin-bottom: 10px; color: var(--accent);">🎨 스타일 프롬프트 일치 여부</h5>
                            <div style="color: var(--text-primary); font-size: 1.1rem; font-weight: 600; margin-bottom: 10px;">
                                ${analysisData.styleMatches ? "✅ 원본 스타일 프롬프트와 일치합니다" : "⚠️ 원본 스타일 프롬프트와 차이가 있습니다"}
                            </div>
                            ${analysisData.styleDifferences ? `<div style="white-space: pre-wrap; color: var(--text-secondary); line-height: 1.8; margin-top: 10px;">${escapeHtml(analysisData.styleDifferences)}</div>` : ""}
                        </div>
                    `;
  }

  if (analysisData.suggestions && analysisData.suggestions.length > 0) {
    resultHtml += `
                        <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
                            <h5 style="margin-bottom: 10px; color: var(--accent);">💡 개선 제안</h5>
                            <ul style="margin: 0; padding-left: 20px; line-height: 2;">
                    `;
    analysisData.suggestions.forEach((suggestion) => {
      resultHtml += `<li style="color: var(--text-secondary); margin-bottom: 8px;">${escapeHtml(suggestion)}</li>`;
    });
    resultHtml += `</ul></div>`;
  }

  if (analysisData.analysis) {
    resultHtml += `
                        <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
                            <h5 style="margin-bottom: 10px; color: var(--accent);">🔍 분석 결과</h5>
                            <div style="white-space: pre-wrap; color: var(--text-secondary); line-height: 1.8;">${escapeHtml(analysisData.analysis)}</div>
                        </div>
                    `;
  }

  // 추출된 가사를 최종 가사에 반영 버튼
  if (analysisData.extractedLyrics) {
    // 전역 변수에 저장
    window.extractedLyricsForApply = analysisData.extractedLyrics;

    resultHtml += `
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);">
                            <button class="btn btn-success" onclick="if(typeof window.applyExtractedLyrics === 'function') { window.applyExtractedLyrics(this); } else { window.showToast('⚠️ 기능을 사용할 수 없습니다.', "error"); }" style="width: 100%;">
                                ✅ 추출된 가사를 최종 가사에 반영
                            </button>
                        </div>
                    `;
  }

  resultHtml += "</div>";
  return resultHtml;
}

// 분석 결과를 화면에 반영하고, 프로젝트 데이터 저장 + 후속 알림까지 마무리한다.
function finishAudioAnalysisSuccess(analyzeBtn, progressDiv, analysisData, resultHtml) {
  progressDiv.innerHTML = resultHtml;

  // 분석 결과를 전역 변수에 저장
  window.intermediateAudioAnalysis = analysisData;
  if (window.currentProject) {
    if (!window.currentProject.data) window.currentProject.data = {};
    window.currentProject.data.intermediateAudioAnalysis = analysisData;
  }

  // 버튼 복원
  analyzeBtn.disabled = false;
  analyzeBtn.innerHTML = "🔍 음원 분석 및 최종 가사 반영";

  console.log("✅ 음원 분석 완료:", analysisData);

  if (typeof window.updateIntermediateAudioFeedback === "function") {
    window.updateIntermediateAudioFeedback(analysisData);
  }

  if (typeof window.requestFinalEvaluationRefresh === "function") {
    window.requestFinalEvaluationRefresh("audio-analysis-complete", {
      audioAnalysisData: analysisData,
      message:
        "음원 분석이 완료되었습니다. 최신 음원 분석 결과를 반영해 평가 점수를 다시 계산 중입니다...",
    });
  }

  if (typeof window.showCopyIndicator === "function") {
    window.showCopyIndicator("✅ 음원 분석이 완료되었습니다!");
  }
}

window.analyzeIntermediateAudio = async function () {
  try {
    if (!window.intermediateAudioFile) {
      window.showToast("⚠️ 음원 파일을 먼저 업로드해주세요.", "error");
      return;
    }

    const analyzeBtn = document.getElementById("analyzeIntermediateAudioBtn");
    const progressDiv = document.getElementById("intermediateVersionProgress");

    if (!analyzeBtn || !progressDiv) {
      window.showToast("⚠️ 분석 UI 요소를 찾을 수 없습니다.", "error");
      return;
    }

    // 버튼 비활성화 및 로딩 표시
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 분석 중...';
    progressDiv.classList.remove("hidden");
    progressDiv.style.display = "block";
    progressDiv.innerHTML =
      '<div style="text-align: center; padding: 20px;"><div class="spinner" style="margin: 0 auto 20px;"></div><p>🎵 음원을 분석하고 가사를 추출하는 중...</p></div>';

    // Gemini API 키 확인
    const geminiKey = (typeof window.getGeminiApiKey === "function" ? window.getGeminiApiKey() : localStorage.getItem("gemini_api_key")) || "";
    if (!geminiKey || !geminiKey.startsWith("AIza")) {
      window.showToast(
        '⚠️ Gemini API 키가 설정되지 않았습니다.\n\n"API 키" 버튼을 클릭하여 Gemini API 키를 설정해주세요.', "error");
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = "🔍 음원 분석 및 최종 가사 반영";
      progressDiv.classList.add("hidden");
      progressDiv.style.display = "none";
      return;
    }

    // 음원 파일을 Base64로 변환
    const file = window.intermediateAudioFile;
    const reader = new FileReader();

    reader.onload = async function (e) {
      try {
        const base64Audio = e.target.result.split(",")[1]; // data:audio/...;base64, 부분 제거

        progressDiv.innerHTML =
          '<div style="text-align: center; padding: 20px;"><div class="spinner" style="margin: 0 auto 20px;"></div><p>🤖 Gemini가 음원을 분석하고 가사를 추출하는 중...</p></div>';

        // 현재 가사와 스타일 가져오기 (Suno 가사란/스타일란 참조)
        const sunoLyricsForCopy =
          document.getElementById("intermediateLyricsPreview")?.textContent ||
          document.getElementById("finalLyrics")?.textContent ||
          document.getElementById("finalizedLyrics")?.value ||
          document.getElementById("sunoLyrics")?.value ||
          "";

        const sunoStyleForCopy =
          document.getElementById("intermediateStylePreview")?.textContent ||
          document.getElementById("finalStyle")?.textContent ||
          document.getElementById("finalizedStyle")?.value ||
          document.getElementById("stylePrompt")?.value ||
          "";

        // 지침서 가져오기
        const guidelines = localStorage.getItem("musicCreatorGuidelines") || "";

        // Gemini API를 사용하여 음원에서 가사 추출 및 분석
        const prompt = buildAudioAnalysisPrompt(sunoLyricsForCopy, sunoStyleForCopy, guidelines);

        const aiResponse = await callGeminiAudioAnalysisAPI(prompt, file, base64Audio, geminiKey);

        if (!aiResponse.trim()) {
          throw new Error("Gemini API에서 응답을 받지 못했습니다.");
        }

        // JSON 파싱 시도 (강건한 다단계 파싱)
        const analysisData = parseAudioAnalysisResponse(aiResponse);

        // 분석 결과 표시
        const resultHtml = renderAudioAnalysisResultHtml(analysisData);

        finishAudioAnalysisSuccess(analyzeBtn, progressDiv, analysisData, resultHtml);
      } catch (error) {
        console.error("❌ 음원 분석 오류:", error);

        progressDiv.innerHTML = `
                    <div style="padding: 20px; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                        <h4 style="margin-bottom: 10px; color: var(--error);">분석 중 오류가 발생했습니다</h4>
                        <p style="color: var(--text-secondary); margin-bottom: 15px;">${escapeHtml(error.message)}</p>
                        <button class="btn btn-primary" onclick="if(typeof window.analyzeIntermediateAudio === 'function') { window.analyzeIntermediateAudio(); }">
                            <i class="fas fa-redo"></i> 다시 시도
                        </button>
                    </div>
                `;

        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = "🔍 음원 분석 및 최종 가사 반영";

        window.showToast(
          "⚠️ 음원 분석 중 오류가 발생했습니다.\n\n" +
            "원인: " +
            error.message +
            "\n\n" +
            "해결방법:\n" +
            "1. API 키가 올바른지 확인하세요\n" +
            "2. 파일 형식이 지원되는지 확인하세요\n" +
            "3. 네트워크 연결을 확인하세요\n" +
            "4. 잠시 후 다시 시도해주세요", "error");
      }
    };

    reader.onerror = function (error) {
      console.error("❌ 파일 읽기 오류:", error);
      window.showToast("⚠️ 파일을 읽는 중 오류가 발생했습니다.", "error");
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = "🔍 음원 분석 및 최종 가사 반영";
      progressDiv.classList.add("hidden");
      progressDiv.style.display = "none";
    };

    // 파일을 Base64로 읽기
    reader.readAsDataURL(file);
  } catch (error) {
    console.error("❌ 음원 분석 오류:", error);
    window.showToast("⚠️ 음원 분석 중 오류가 발생했습니다.\n\n" + error.message, "error");

    const analyzeBtn = document.getElementById("analyzeIntermediateAudioBtn");
    if (analyzeBtn) {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = "🔍 음원 분석 및 최종 가사 반영";
    }

    const progressDiv = document.getElementById("intermediateVersionProgress");
    if (progressDiv) {
      progressDiv.classList.add("hidden");
      progressDiv.style.display = "none";
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// 5단계: 최종 평가 요약 생성 함수
// ═══════════════════════════════════════════════════════════════
/** 점수(0-100)로 등급 문자열 반환 */
function getGradeFromScore(score) {
  const n = Math.min(100, Math.max(0, parseInt(score, 10) || 0));
  if (n >= 95) return "S+";
  if (n >= 90) return "S";
  if (n >= 85) return "A+";
  if (n >= 80) return "A";
  if (n >= 75) return "B+";
  if (n >= 70) return "B";
  if (n >= 65) return "C+";
  if (n >= 60) return "C";
  if (n >= 50) return "D";
  return "F";
}

function clampEvaluationScore(score, fallback) {
  const parsed = parseInt(score, 10);
  if (Number.isFinite(parsed)) {
    return Math.min(100, Math.max(0, parsed));
  }
  const fallbackParsed = parseInt(fallback, 10);
  return Number.isFinite(fallbackParsed)
    ? Math.min(100, Math.max(0, fallbackParsed))
    : 0;
}

function getAudioAnalysisScoreValue(audioAnalysisData, fallbackScore) {
  if (!audioAnalysisData || typeof audioAnalysisData !== "object") {
    return clampEvaluationScore(fallbackScore, 0);
  }

  const directScore =
    audioAnalysisData.recommendedFinalScore ??
    audioAnalysisData.audioScore ??
    audioAnalysisData.overallScore ??
    audioAnalysisData.score ??
    audioAnalysisData.scores?.overall ??
    audioAnalysisData.scores?.audio ??
    audioAnalysisData.scores?.performance;

  if (directScore !== undefined && directScore !== null && directScore !== "") {
    return clampEvaluationScore(directScore, fallbackScore);
  }

  let estimated = clampEvaluationScore(fallbackScore, 82);
  if (audioAnalysisData.matchesOriginal === true) estimated += 3;
  if (audioAnalysisData.matchesOriginal === false) estimated -= 4;
  if (audioAnalysisData.styleMatches === true) estimated += 3;
  if (audioAnalysisData.styleMatches === false) estimated -= 4;
  if (Array.isArray(audioAnalysisData.suggestions)) {
    estimated -= Math.min(6, audioAnalysisData.suggestions.length);
  }
  if (audioAnalysisData.differences) estimated -= 2;
  if (audioAnalysisData.styleDifferences) estimated -= 2;

  return Math.min(100, Math.max(0, estimated));
}

function buildAudioAnalysisEvaluationComment(audioAnalysisData) {
  if (!audioAnalysisData || typeof audioAnalysisData !== "object") {
    return "";
  }

  const parts = [];
  const score = getAudioAnalysisScoreValue(audioAnalysisData, null);
  if (score) parts.push(`음원 분석 반영 점수: ${score}점`);
  if (audioAnalysisData.matchesOriginal !== undefined) {
    parts.push(
      audioAnalysisData.matchesOriginal
        ? "가사는 원본과 대체로 일치합니다."
        : "가사에 원본과 다른 지점이 감지되었습니다.",
    );
  }
  if (audioAnalysisData.styleMatches !== undefined) {
    parts.push(
      audioAnalysisData.styleMatches
        ? "스타일 프롬프트와 음원 분위기가 대체로 일치합니다."
        : "스타일 프롬프트와 실제 음원 사이에 차이가 있습니다.",
    );
  }
  if (audioAnalysisData.analysis) {
    parts.push(String(audioAnalysisData.analysis).slice(0, 220));
  }
  return parts.join(" ");
}

window.updateIntermediateAudioFeedback = function (analysisData) {
  const feedbackEl = document.getElementById("intermediateAudioFeedback");
  if (!feedbackEl) return;

  if (!analysisData || typeof analysisData !== "object") {
    feedbackEl.textContent = "업로드된 음원 분석 결과가 아직 없습니다.";
    return;
  }

  const score = getAudioAnalysisScoreValue(
    analysisData,
    document.getElementById("afterScore")?.textContent || 0,
  );
  const suggestions = Array.isArray(analysisData.suggestions)
    ? analysisData.suggestions.slice(0, 3)
    : [];

  feedbackEl.innerHTML = `
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
      <strong style="color:var(--accent);">음원 반영 평가 ${score}점</strong>
      <span>${analysisData.matchesOriginal === false ? "가사 차이 감지" : "가사 확인 완료"}</span>
      <span>${analysisData.styleMatches === false ? "스타일 차이 감지" : "스타일 확인 완료"}</span>
    </div>
    ${
      analysisData.analysis
        ? `<div style="margin-bottom:8px;">${escapeHtml(String(analysisData.analysis).slice(0, 350))}</div>`
        : ""
    }
    ${
      suggestions.length
        ? `<ul style="margin:8px 0 0;padding-left:20px;">${suggestions
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join("")}</ul>`
        : ""
    }
  `;
};

/** 최종 평가 요약 UI만 갱신 (수치, 등급, 프로그레스 바) */
window.updateFinalEvaluationUI = function (
  beforeScoreVal,
  afterScoreVal,
  aiCommentText,
) {
  const beforeScoreEl = document.getElementById("beforeScore");
  const afterScoreEl = document.getElementById("afterScore");
  const finalGradeEl = document.getElementById("finalGrade");
  const beforeBar = document.getElementById("beforeScoreBar");
  const afterBar = document.getElementById("afterScoreBar");
  const aiCommentEl = document.getElementById("aiComment");
  const before = Math.min(100, Math.max(0, parseInt(beforeScoreVal, 10) || 0));
  const after = Math.min(100, Math.max(0, parseInt(afterScoreVal, 10) || 0));
  if (beforeScoreEl) beforeScoreEl.textContent = before;
  if (afterScoreEl) afterScoreEl.textContent = after;
  if (finalGradeEl) finalGradeEl.textContent = getGradeFromScore(after);
  if (beforeBar) beforeBar.style.width = before + "%";
  if (afterBar) afterBar.style.width = after + "%";
  if (aiCommentText != null && aiCommentEl)
    aiCommentEl.textContent = aiCommentText;
};

function getCurrentFinalEvaluationScores() {
  const beforeScore =
    window.currentProject?.data?.beforeScore ??
    document.getElementById("beforeScore")?.textContent ??
    0;
  const afterScore =
    window.currentProject?.data?.afterScore ??
    document.getElementById("afterScore")?.textContent ??
    beforeScore;
  return { beforeScore, afterScore };
}

window.requestFinalEvaluationRefresh = function (reason, options) {
  const delay = Math.max(0, Number(options?.delay ?? 80));
  const message =
    options?.message ||
    "음원 분석 결과를 반영해 최종 평가 점수를 다시 계산 중입니다...";
  const { beforeScore, afterScore } = getCurrentFinalEvaluationScores();
  const audioAnalysisData =
    options?.audioAnalysisData ||
    window.intermediateAudioAnalysis ||
    window.currentProject?.data?.intermediateAudioAnalysis ||
    null;
  const immediateAfterScore = audioAnalysisData
    ? getAudioAnalysisScoreValue(audioAnalysisData, afterScore)
    : afterScore;
  const immediateComment =
    audioAnalysisData
      ? buildAudioAnalysisEvaluationComment(audioAnalysisData) || message
      : message;

  if (typeof window.updateFinalEvaluationUI === "function") {
    window.updateFinalEvaluationUI(
      beforeScore,
      immediateAfterScore,
      immediateComment,
    );
  }

  clearTimeout(window.__finalEvaluationRefreshTimer);
  window.__finalEvaluationRefreshTimer = setTimeout(() => {
    if (typeof window.generateFinalEvaluation === "function") {
      window.generateFinalEvaluation({ reason: reason || "manual-refresh" });
    }
  }, delay);
};

// ═══════════════════════════════════════════════════════════════
// generateFinalEvaluation 헬퍼 함수들 (순수 추출 리팩터링, 동작 동일)
// ═══════════════════════════════════════════════════════════════

// 최종 평가 생성에 필요한 데이터를 화면/전역 상태에서 모두 모은다.
function collectFinalEvaluationSourceData() {
  const analysisData = window.currentProject?.data?.analysis;
  const beforeScore =
    analysisData?.scores?.overall || analysisData?.scores?.overallScore || 0;
  const audioAnalysisData =
    window.intermediateAudioAnalysis ||
    window.currentProject?.data?.intermediateAudioAnalysis ||
    null;
  if (
    audioAnalysisData &&
    typeof window.updateIntermediateAudioFeedback === "function"
  ) {
    window.updateIntermediateAudioFeedback(audioAnalysisData);
  }

  const finalLyrics =
    document.getElementById("finalLyrics")?.textContent ||
    document.getElementById("finalizedLyrics")?.value ||
    "";
  const finalStyle =
    document.getElementById("finalStyle")?.textContent ||
    document.getElementById("finalizedStyle")?.value ||
    "";

  const originalLyrics = document.getElementById("sunoLyrics")?.value || "";
  const originalStyle = document.getElementById("stylePrompt")?.value || "";

  return {
    analysisData,
    beforeScore,
    audioAnalysisData,
    finalLyrics,
    finalStyle,
    originalLyrics,
    originalStyle,
  };
}

// AI에게 보낼 최종 평가 요청 프롬프트를 만든다.
function buildFinalEvaluationPrompt(data, guidelines) {
  const {
    analysisData,
    beforeScore,
    audioAnalysisData,
    finalLyrics,
    finalStyle,
    originalLyrics,
    originalStyle,
  } = data;

  return `다음 정보를 바탕으로 최종 평가를 생성해주세요.

=== 개선 전 가사 (2단계 원본) ===
${originalLyrics || "없음"}

=== 개선 전 스타일 프롬프트 (2단계 원본) ===
${originalStyle || "없음"}

=== 개선 후 가사 (4-5단계 최종) ===
${finalLyrics}

=== 개선 후 스타일 프롬프트 (4-5단계 최종) ===
${finalStyle || "없음"}

${
  analysisData
    ? `=== 3단계 분석 결과 ===
종합 점수: ${beforeScore}점
${analysisData.feedbacks ? `피드백: ${JSON.stringify(analysisData.feedbacks).substring(0, 500)}` : ""}
${analysisData.improvements ? `개선안: ${JSON.stringify(analysisData.improvements).substring(0, 500)}` : ""}

`
    : ""
}${
      guidelines
        ? `=== 제작 지침서 (참고) ===
${guidelines.substring(0, 1000)}${guidelines.length > 1000 ? "..." : ""}

`
        : ""
    }${
      audioAnalysisData
        ? `=== 업로드 음원 분석 결과 (최신 반영 대상) ===
${JSON.stringify(audioAnalysisData).substring(0, 1800)}

`
        : ""
    }=== 평가 요청 사항 ===

1. **개선 전 점수 (beforeScore)**: 3단계 분석 결과의 종합 점수를 사용하거나, 개선 전 가사와 스타일을 평가하여 0-100점으로 점수를 매겨주세요.

2. **개선 후 점수 (afterScore)**: 개선 후 최종 가사와 스타일 프롬프트를 평가하여 0-100점으로 점수를 매겨주세요. 업로드 음원 분석 결과가 제공된 경우, 실제 음원에서 추출된 가사/스타일 일치 여부/차이점/개선 제안까지 반드시 반영해 점수를 재산정해주세요.

3. **AI 최종 코멘트**: 개선 전후의 변화를 분석하고, 장점과 개선점을 포함한 격려와 조언이 담긴 코멘트를 작성해주세요.

=== 응답 형식 ===
다음 JSON 형식으로 응답해주세요:

{
  "beforeScore": 85,
  "afterScore": 92,
  "aiComment": "개선 전 가사도 이미 좋은 품질이었지만, 개선안을 반영한 후 더욱 완성도 높은 작품이 되었습니다. 특히 가사의 구조와 감정 표현이 더욱 명확해졌고, 스타일 프롬프트도 더욱 구체화되었습니다. 계속 이렇게 노력하시면 더욱 훌륭한 작품을 만들 수 있을 것입니다!"
}

**중요**: JSON 형식만 출력하고, 다른 설명이나 텍스트는 포함하지 마세요.`;
}

// AI 응답을 다단계로 파싱한다 (표준 파싱 → 후행 콤마 제거 → 정규식 직접
// 추출 → 그래도 실패하면 기본값). 기존 로직 그대로 옮김.
function parseFinalEvaluationResponse(aiResponse, beforeScore) {
  let evaluationData;
  try {
    let cleanedResponse = aiResponse.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      evaluationData = JSON.parse(cleanedResponse);
      console.log('✅ 평가 JSON 파싱 성공');
    } catch (e1) {
      try {
        evaluationData = JSON.parse(cleanedResponse.replace(/,\s*([}\]])/g, '$1'));
        console.log('✅ 코마 제거 후 파싱 성공');
      } catch (e2) {
        console.warn('⚠️ 평가 JSON 부분 추출 시도:', e2.message);
        const bsM = cleanedResponse.match(/"beforeScore"\s*:\s*(\d+)/);
        const asM = cleanedResponse.match(/"afterScore"\s*:\s*(\d+)/);
        const cmM = cleanedResponse.match(/"aiComment"\s*:\s*"([\s\S]*?)(?<!\\)"/);
        evaluationData = {
          beforeScore: bsM ? parseInt(bsM[1], 10) : (beforeScore || 70),
          afterScore: asM ? parseInt(asM[1], 10) : null,
          aiComment: cmM ? cmM[1].replace(/\\n/g, '\n') : '파싱 실패하여 기본값을 사용합니다.',
        };
        if (evaluationData.afterScore === null) {
          evaluationData.afterScore = Math.min(100, (evaluationData.beforeScore || 70) + 5);
        }
      }
    }
  } catch (parseError) {
    console.error('JSON 파싱 최종 실패:', parseError);
    evaluationData = {
      beforeScore: beforeScore || 70,
      afterScore: Math.min(100, (beforeScore || 70) + 5),
      aiComment: '평가 생성 중 오류가 발생했습니다. 재시도해주세요.',
    };
  }
  return evaluationData;
}

window.generateFinalEvaluation = async function (options) {
  const evaluationRunId = (window.__finalEvaluationRunId || 0) + 1;
  window.__finalEvaluationRunId = evaluationRunId;
  const isLatestEvaluationRun = () =>
    window.__finalEvaluationRunId === evaluationRunId;

  try {
    const beforeScoreEl = document.getElementById("beforeScore");
    const afterScoreEl = document.getElementById("afterScore");
    const aiCommentEl = document.getElementById("aiComment");
    const finalGradeEl = document.getElementById("finalGrade");

    if (!beforeScoreEl || !afterScoreEl || !aiCommentEl) {
      console.warn("⚠️ 최종 평가 UI 요소를 찾을 수 없습니다.");
      return;
    }

    const srcData = collectFinalEvaluationSourceData();
    const { beforeScore, audioAnalysisData, finalLyrics } = srcData;

    if (!finalLyrics.trim()) {
      console.warn("⚠️ 최종 가사가 없어 평가를 생성할 수 없습니다.");
      const def = Math.min(100, Math.max(0, parseInt(beforeScore, 10) || 0));
      if (typeof window.updateFinalEvaluationUI === "function") {
        window.updateFinalEvaluationUI(
          def,
          def,
          "최종 가사가 없어 평가를 생성할 수 없습니다.\n\n4-5단계에서 최종 가사를 확인한 후 다시 시도해주세요.",
        );
      } else {
        if (beforeScoreEl) beforeScoreEl.textContent = def;
        if (afterScoreEl) afterScoreEl.textContent = def;
        if (aiCommentEl)
          aiCommentEl.textContent =
            "최종 가사가 없어 평가를 생성할 수 없습니다.\n\n4-5단계에서 최종 가사를 확인한 후 다시 시도해주세요.";
        if (finalGradeEl) finalGradeEl.textContent = getGradeFromScore(def);
      }
      return;
    }

    // Gemini API 키 확인
    const geminiKey = (typeof window.getGeminiApiKey === "function" ? window.getGeminiApiKey() : localStorage.getItem("gemini_api_key")) || "";
    if (!geminiKey || !geminiKey.startsWith("AIza")) {
      console.warn("⚠️ Gemini API 키가 없어 평가를 생성할 수 없습니다.");
      const def = Math.min(100, Math.max(0, parseInt(beforeScore, 10) || 0));
      if (typeof window.updateFinalEvaluationUI === "function") {
        window.updateFinalEvaluationUI(
          def,
          def,
          "Gemini API 키를 설정하면 자동으로 최종 평가를 생성할 수 있습니다.",
        );
      } else {
        if (beforeScoreEl) beforeScoreEl.textContent = def;
        if (afterScoreEl) afterScoreEl.textContent = def;
        if (aiCommentEl)
          aiCommentEl.textContent =
            "Gemini API 키를 설정하면 자동으로 최종 평가를 생성할 수 있습니다.";
      }
      return;
    }

    // 지침서 가져오기
    const guidelines = localStorage.getItem("musicCreatorGuidelines") || "";

    const evaluationPrompt = buildFinalEvaluationPrompt(srcData, guidelines);

    const aiResponse = await window.callAIWithTextFallback({
      prompt: evaluationPrompt,
      geminiKey,
      contextLabel: "최종 평가",
      temperature: 0.7,
      maxOutputTokens: 3000,
      openaiSystemMessage: "You are an AI songwriter evaluating lyrics quality.",
    });

    if (!aiResponse.trim()) {
      throw new Error("Gemini API에서 응답을 받지 못했습니다.");
    }

    const evaluationData = parseFinalEvaluationResponse(aiResponse, beforeScore);

    // 점수 정수화 (0-100) 후 UI 갱신 (수치·등급·프로그레스 바)
    const beforeScoreValue = Math.min(
      100,
      Math.max(0, parseInt(evaluationData.beforeScore ?? beforeScore, 10) || 0),
    );
    const audioScoreValue = audioAnalysisData
      ? getAudioAnalysisScoreValue(audioAnalysisData, evaluationData.afterScore)
      : null;
    const afterScoreValue = Math.min(
      100,
      Math.max(
        0,
        parseInt(
          audioScoreValue ?? evaluationData.afterScore ?? beforeScore,
          10,
        ) || 0,
      ),
    );
    const audioComment = audioAnalysisData
      ? buildAudioAnalysisEvaluationComment(audioAnalysisData)
      : "";
    const finalEvaluationComment = audioComment
      ? `${audioComment}\n\n${evaluationData.aiComment || ""}`.trim()
      : evaluationData.aiComment || "";

    if (!isLatestEvaluationRun()) {
      console.log("ℹ️ 이전 최종 평가 응답은 최신 요청이 아니어서 무시합니다.", {
        reason: options?.reason || "auto",
        runId: evaluationRunId,
      });
      return;
    }

    if (typeof window.updateFinalEvaluationUI === "function") {
      window.updateFinalEvaluationUI(
        beforeScoreValue,
        afterScoreValue,
        finalEvaluationComment || "평가 코멘트를 생성할 수 없습니다.",
      );
    } else {
      if (beforeScoreEl) beforeScoreEl.textContent = beforeScoreValue;
      if (afterScoreEl) afterScoreEl.textContent = afterScoreValue;
      if (finalGradeEl)
        finalGradeEl.textContent = getGradeFromScore(afterScoreValue);
      if (aiCommentEl)
        aiCommentEl.textContent =
          finalEvaluationComment || "평가 코멘트를 생성할 수 없습니다.";
    }

    // 프로젝트 데이터에 저장
    if (window.currentProject) {
      if (!window.currentProject.data) {
        window.currentProject.data = {};
      }
      window.currentProject.data.beforeScore = beforeScoreValue;
      window.currentProject.data.afterScore = afterScoreValue;
      window.currentProject.data.aiComment = finalEvaluationComment || "";
      if (audioAnalysisData) {
        window.currentProject.data.intermediateAudioAnalysis =
          audioAnalysisData;
      }
    }

    console.log("✅ 최종 평가 요약 생성 완료:", {
      beforeScore: beforeScoreValue,
      afterScore: afterScoreValue,
    });
  } catch (error) {
    if (!isLatestEvaluationRun()) {
      console.log("ℹ️ 이전 최종 평가 오류 응답은 최신 요청이 아니어서 무시합니다.", {
        reason: options?.reason || "auto",
        runId: evaluationRunId,
      });
      return;
    }
    console.error("❌ 최종 평가 생성 오류:", error);
    const analysisData = window.currentProject?.data?.analysis;
    const defaultScore = Math.min(
      100,
      Math.max(
        0,
        parseInt(
          analysisData?.scores?.overall ??
            analysisData?.scores?.overallScore ??
            0,
          10,
        ) || 0,
      ),
    );
    if (typeof window.updateFinalEvaluationUI === "function") {
      window.updateFinalEvaluationUI(
        defaultScore,
        defaultScore,
        "평가를 생성하는 중 오류가 발생했습니다. " + error.message,
      );
    } else {
      const beforeScoreEl = document.getElementById("beforeScore");
      const afterScoreEl = document.getElementById("afterScore");
      const aiCommentEl = document.getElementById("aiComment");
      if (beforeScoreEl) beforeScoreEl.textContent = defaultScore;
      if (afterScoreEl) afterScoreEl.textContent = defaultScore;
      if (aiCommentEl)
        aiCommentEl.textContent =
          "평가를 생성하는 중 오류가 발생했습니다. " + error.message;
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// 5단계 → 6단계 이동 (데이터 전달 포함)
// ═══════════════════════════════════════════════════════════════
window.goToMarketingStep = function () {
  try {
    // "다음 단계로" 버튼 클릭 시 수정 모드 활성화 (데이터 수정 반영)
    window.editMode = true;
    if (typeof window.updateEditModeUI === "function") {
      window.updateEditModeUI();
    }
    if (typeof window.setReadOnlyMode === "function") {
      window.setReadOnlyMode(false);
    }

    // 5단계 데이터 수집 (여러 소스에서 시도)
    const finalTitle =
      document.getElementById("finalTitleText")?.textContent ||
      window.currentSunoTitle ||
      document.getElementById("sunoTitle")?.value ||
      document.getElementById("songTitle")?.value ||
      "제목 없음";

    const finalLyrics =
      document.getElementById("finalLyrics")?.textContent ||
      window.currentFinalLyrics ||
      document.getElementById("finalizedLyrics")?.value ||
      document.getElementById("sunoLyrics")?.value ||
      window.currentProject?.data?.finalLyrics ||
      window.currentProject?.data?.finalizedLyrics ||
      window.currentProject?.data?.sunoLyrics ||
      "";

    const finalStyle =
      document.getElementById("finalStyle")?.textContent ||
      window.currentFinalStyle ||
      document.getElementById("finalizedStyle")?.value ||
      document.getElementById("stylePrompt")?.value ||
      window.currentProject?.data?.finalStyle ||
      window.currentProject?.data?.stylePrompt ||
      "";

    // ═══════════════════════════════════════════════════════════════
    // 5단계 데이터를 전역 변수에 저장 (마케팅 생성 시 사용)
    // ═══════════════════════════════════════════════════════════════

    window.marketingData = {
      title: finalTitle,
      lyrics: finalLyrics,
      style: finalStyle,
    };

    console.log("✅ 6단계 마케팅 데이터 준비:", {
      title: finalTitle,
      lyricsLength: finalLyrics.length,
      styleLength: finalStyle.length,
    });

    // ═══════════════════════════════════════════════════════════════

    // 6단계로 이동
    if (typeof window.goToStep === "function") {
      window.goToStep(6, true, false);
      console.log(
        "✅ 5단계 → 6단계 이동 완료 (제목, 가사, 스타일 프롬프트 전달됨)",
      );
    }

    // 마케팅 자료 자동 생성 (저장된 자료가 없는 경우)
    if (typeof window.generateMarketingMaterials === "function") {
      setTimeout(() => {
        window.generateMarketingMaterials();
      }, 500);
    } else {
      // 생성 함수가 없으면 로딩 화면 유지
      const marketingLoading = document.getElementById("marketingLoading");
      if (marketingLoading) {
        marketingLoading.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                        <h4 style="margin-bottom: 10px; color: var(--error);">마케팅 자료 생성 기능을 사용할 수 없습니다</h4>
                        <p style="color: var(--text-secondary);">페이지를 새로고침(F5) 후 다시 시도해주세요.</p>
                    </div>
                `;
      }
    }
  } catch (error) {
    console.error("❌ 5→6단계 이동 오류:", error);
    window.showToast(
      "⚠️ 5단계 → 6단계 이동 중 오류가 발생했습니다.\n\n" +
        "원인: " +
        error.message +
        "\n\n" +
        "해결방법: 페이지를 새로고침(F5) 후 다시 시도해주세요.", "error");
  }
};

// ═══════════════════════════════════════════════════════════════
// 복사 함수
// ═══════════════════════════════════════════════════════════════
window.copyToClipboard = function (elementId, labelOrText, event) {
  try {
    let text = "";
    let label = "";

    // 두 번째 인자가 문자열이고 elementId가 null이면 직접 텍스트로 간주
    if (
      !elementId &&
      typeof labelOrText === "string" &&
      labelOrText.length > 0
    ) {
      // elementId가 null이고 labelOrText가 긴 문자열이면 직접 복사할 텍스트로 간주
      // 하지만 label이 짧은 경우(예: "썸네일")는 label로 간주
      if (labelOrText.length > 50 || !document.getElementById(labelOrText)) {
        text = labelOrText;
        label = "내용";
      } else {
        // elementId로 시도
        const el = document.getElementById(labelOrText);
        if (el) {
          text = el.value || el.textContent || el.innerText || "";
          label = "내용";
        }
      }
    } else if (elementId) {
      // elementId가 제공된 경우
      const el = document.getElementById(elementId);
      if (el) {
        text = el.value || el.textContent || el.innerText || "";
      }
      label = labelOrText || "내용";
    } else if (event && event.target) {
      // event를 통해 부모 요소에서 텍스트 가져오기
      const parent = event.target.closest(
        ".thumbnail-item, .output-box, .card",
      );
      if (parent) {
        text = parent.textContent || parent.innerText || "";
      }
      label = labelOrText || "내용";
    }

    if (!text.trim()) {
      window.showToast("복사할 내용이 없습니다.", "error");
      return;
    }

    // event 전파 중지
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log(`✅ ${label || "내용"}이 클립보드에 복사되었습니다!`);
        if (typeof window.showCopyIndicator === "function") {
          window.showCopyIndicator(
            `✅ ${label || "내용"}이 클립보드에 복사되었습니다!`,
          );
        } else {
          window.showToast(`${label || "내용"}이 클립보드에 복사되었습니다.`, "success");
        }
      })
      .catch(() => {
        // 폴백
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        console.log(`✅ ${label || "내용"}이 클립보드에 복사되었습니다!`);
        if (typeof window.showCopyIndicator === "function") {
          window.showCopyIndicator(
            `✅ ${label || "내용"}이 클립보드에 복사되었습니다!`,
          );
        } else {
          window.showToast(`${label || "내용"}이 클립보드에 복사되었습니다.`, "success");
        }
      });
  } catch (error) {
    console.error("복사 오류:", error);
    window.showToast("복사 중 오류가 발생했습니다.", "error");
  }
};

// ═══════════════════════════════════════════════════════════════
// 유틸리티 함수들
// ═══════════════════════════════════════════════════════════════
// js/ux.js의 공용 토스트로 위임한다. 이전에는 여기서 별도의 고정 초록색
// 알림 박스를 직접 그렸는데, 실패 메시지("❌ 복사 실패" 등)도 항상
// --success(초록) 배경으로 표시되던 버그가 있었다 — showToast는 메시지
// 내용에 따라 성공/오류 색상을 올바르게 구분한다.
window.showCopyIndicator = function (message) {
  if (!message) return;
  window.showToast(message, message.includes("❌") ? "error" : "success");
};

// ═══════════════════════════════════════════════════════════════
// 템포 (BPM) 관련 함수들
// ═══════════════════════════════════════════════════════════════

// 템포 슬라이더 및 프리셋 버튼 초기화
window.initTempoControls = function () {
  const tempoSlider = document.getElementById("tempoSlider");
  const tempoValue = document.getElementById("tempoValue");
  const tempoPresetBtns = document.querySelectorAll(".tempo-preset-btn");

  if (tempoSlider && tempoValue) {
    // 슬라이더 변경 이벤트
    tempoSlider.addEventListener("input", function () {
      tempoValue.textContent = this.value;

      // 프리셋 버튼 활성화 상태 업데이트
      tempoPresetBtns.forEach((btn) => {
        const btnTempo = parseInt(btn.dataset.tempo);
        if (btnTempo === parseInt(this.value)) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    });
  }

  // 프리셋 버튼 클릭 이벤트
  tempoPresetBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const tempo = this.dataset.tempo;
      if (tempo && tempoSlider && tempoValue) {
        tempoSlider.value = tempo;
        tempoValue.textContent = tempo;

        // 모든 버튼에서 active 제거 후 현재 버튼에 추가
        tempoPresetBtns.forEach((b) => b.classList.remove("active"));
        this.classList.add("active");

        console.log("✅ 템포 설정:", tempo, "BPM");
      }
    });
  });

  console.log("✅ 템포 컨트롤 초기화 완료");
};

// 현재 템포 값 가져오기


// 템포 설정


// 페이지 로드 시 템포 컨트롤 초기화
document.addEventListener("DOMContentLoaded", function () {
  // 약간의 지연 후 초기화 (다른 스크립트들이 먼저 로드되도록)
  setTimeout(() => {
    if (typeof window.initTempoControls === "function") {
      window.initTempoControls();
    }
  }, 500);
});

// ═══════════════════════════════════════════════════════════════
// AI로 스타일 프롬프트 생성 함수
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// generateStylePromptAI 헬퍼 함수들 (순수 추출 리팩터링, 동작 동일)
// ═══════════════════════════════════════════════════════════════

// 1~2단계 화면에서 스타일 프롬프트 생성에 필요한 데이터를 모두 모은다.
function collectStylePromptGenerationData() {
  const songTitle =
    document.getElementById("sunoTitle")?.value ||
    document.getElementById("songTitle")?.value ||
    "";
  const sunoLyrics = document.getElementById("sunoLyrics")?.value || "";
  const manualStylePrompt = document.getElementById("manualStylePrompt")?.value || "";

  const step1Tags = {
    genre: getSelectedTags("genreTags"),
    mood: getSelectedTags("moodTags"),
    era: getSelectedTags("eraTags"),
    theme: getSelectedTags("themeTags"),
    perspective: getSelectedTags("perspectiveTags"),
    time: getSelectedTags("timeTags"),
    special: getSelectedTags("specialTags"),
    region: getSelectedTags("regionTags"),
  };

  const step2Tags = {
    audioFormat: getSelectedTags("audioFormatTags"),
    venue: getSelectedTags("sunoVenueTags"),
    vocalStyle: getSelectedTags("vocalStyle"),
    instruments: getSelectedTags("instrumentTags"),
  };

  const tempo = document.getElementById("tempoSlider")?.value || "80";

  const vocalPartAssignments = window.vocalPartAssignments || {};
  const vocalPartAssignmentsList = Object.keys(vocalPartAssignments)
    .map((part) => `${part}: ${vocalPartAssignments[part]}`)
    .join(", ");

  const guidelines = localStorage.getItem("musicCreatorGuidelines") || "";

  return {
    songTitle,
    sunoLyrics,
    manualStylePrompt,
    step1Tags,
    step2Tags,
    tempo,
    vocalPartAssignments,
    vocalPartAssignmentsList,
    guidelines,
  };
}

// 수집한 데이터로 AI에게 보낼 스타일 프롬프트 생성 요청 텍스트를 만든다.
function buildStylePromptGenerationRequest(data) {
  const {
    songTitle,
    sunoLyrics,
    manualStylePrompt,
    step1Tags,
    step2Tags,
    tempo,
    vocalPartAssignments,
    vocalPartAssignmentsList,
  } = data;

  return `당신은 Suno AI 음악 생성을 위한 스타일 프롬프트 전문가입니다.
아래 정보를 바탕으로 Suno AI의 스타일란에 입력할 최적의 영문 스타일 프롬프트를 생성해주세요.

## 곡 정보
- 제목: ${songTitle || "미정"}
- 기존 스타일 프롬프트: ${manualStylePrompt || "없음"}

## 가사 (분석용)
${sunoLyrics ? sunoLyrics.substring(0, 500) + "..." : "가사 없음"}

## 1단계 선택사항
- 장르: ${step1Tags.genre.join(", ") || "미선택"}
- 분위기/감정: ${step1Tags.mood.join(", ") || "미선택"}
- 시대: ${step1Tags.era.join(", ") || "미선택"}
- 주제: ${step1Tags.theme.join(", ") || "미선택"}
- 시점/관점: ${step1Tags.perspective.join(", ") || "미선택"}
- 시간대: ${step1Tags.time.join(", ") || "미선택"}
- 특별 요소: ${step1Tags.special.join(", ") || "미선택"}
- 지역: ${step1Tags.region.join(", ") || "미선택"}

## 2단계 선택사항
- 음향 포맷: ${step2Tags.audioFormat.join(", ") || "미선택"}
- 연주 장소: ${step2Tags.venue.join(", ") || "미선택"}
- 보컬 스타일: ${step2Tags.vocalStyle.join(", ") || "미선택"}
- 악기 구성: ${step2Tags.instruments.join(", ") || "미선택"}
- 템포: ${tempo} BPM
${
  vocalPartAssignmentsList
    ? "- 파트별 보컬 지정:\n  " +
      Object.keys(vocalPartAssignments)
        .map((part) => `${part}: ${vocalPartAssignments[part]}`)
        .join("\n  ")
    : ""
}

## 생성 규칙
1. 영문으로 작성 (Suno AI 호환)
2. 쉼표로 구분된 키워드 나열 형식
3. 장르, 분위기, 템포, 보컬 스타일, 악기, 음향 효과 순서로 작성
4. 1,000자 이내
5. 가사의 감정과 분위기를 반영
6. 선택된 연주 장소의 음향 특성(리버브, 에코, 공간감) 반영
7. 전문적이고 구체적인 음악 용어 사용
8. 파트별 보컬 지정이 있으면 해당 정보를 스타일 프롬프트에 반영

## 출력 형식
스타일 프롬프트만 출력 (설명 없이 프롬프트만)

예시:
K-Pop Ballad, emotional, melancholic, 75 BPM, soft female vocals, breathy tone, piano, gentle strings, ambient pads, wide stereo, studio reverb, intimate atmosphere, cinematic, heartfelt, nostalgic undertones`;
}

// ChatGPT를 호출해 생성된 스타일 프롬프트 문자열을 반환한다.
async function callOpenAIForStylePromptGeneration(prompt, apiKey, guidelines) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: window.getOpenAIModel ? window.getOpenAIModel() : "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: guidelines
            ? `당신은 Suno AI 스타일 프롬프트 전문가입니다. 다음 제작 지침서를 참고하세요:\n\n${guidelines.substring(0, 1000)}`
            : "당신은 Suno AI 스타일 프롬프트 전문가입니다.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
  }

  const data = await response.json();
  const generatedPrompt = data.choices?.[0]?.message?.content?.trim() || "";
  if (!generatedPrompt) {
    throw new Error("생성된 프롬프트가 없습니다.");
  }
  return generatedPrompt;
}

window.generateStylePromptAI = async function () {
  try {
    // 로딩 표시
    const stylePromptEl = document.getElementById("stylePrompt");
    if (!stylePromptEl) {
      window.showToast("스타일 프롬프트 입력란을 찾을 수 없습니다.", "error");
      return;
    }

    // 기존 값 백업
    const previousValue = stylePromptEl.value;
    stylePromptEl.value = "🔄 AI가 스타일 프롬프트를 생성 중입니다...";
    stylePromptEl.disabled = true;

    // API 키 확인
    const apiKey = (typeof window.getOpenAIApiKey === "function" ? window.getOpenAIApiKey() : localStorage.getItem("openai_api_key"));
    if (!apiKey) {
      stylePromptEl.value = previousValue;
      stylePromptEl.disabled = false;
      window.showToast(
        "OpenAI API 키가 설정되지 않았습니다.\n\n설정 → API 키 설정에서 키를 입력해주세요.", "info");
      return;
    }

    const genData = collectStylePromptGenerationData();
    const prompt = buildStylePromptGenerationRequest(genData);

    console.log("🤖 AI 스타일 프롬프트 생성 시작...");
    const generatedPrompt = await callOpenAIForStylePromptGeneration(
      prompt,
      apiKey,
      genData.guidelines,
    );

    // 스타일 프롬프트 설정
    stylePromptEl.value = generatedPrompt;
    stylePromptEl.disabled = false;

    console.log("✅ AI 스타일 프롬프트 생성 완료:", generatedPrompt);

    // 한글 해석 자동 생성
    if (typeof window.generateStylePromptTranslation === "function") {
      setTimeout(() => {
        window.generateStylePromptTranslation();
      }, 300);
    }

    // 성공 메시지
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator("✅ 스타일 프롬프트가 AI로 생성되었습니다!");
    }
  } catch (error) {
    console.error("❌ AI 스타일 프롬프트 생성 오류:", error);

    const stylePromptEl = document.getElementById("stylePrompt");
    if (stylePromptEl) {
      stylePromptEl.disabled = false;
      // 이전 값 복원 시도
      if (!stylePromptEl.value || stylePromptEl.value.includes("생성 중")) {
        stylePromptEl.value = "";
      }
    }

    window.showToast(
      "⚠️ 스타일 프롬프트 생성 중 오류가 발생했습니다.\n\n" +
        "원인: " +
        error.message +
        "\n\n" +
        "해결방법: API 키를 확인하고 다시 시도해주세요.", "error");
  }
};

// ═══════════════════════════════════════════════════════════════
// 파트별 보컬 스타일 지정 함수들
// ═══════════════════════════════════════════════════════════════

// 파트별 보컬 스타일 지정 데이터 저장 (전역 변수)
window.vocalPartAssignments = window.vocalPartAssignments || {};

// 파트에 보컬 스타일 지정
window.assignVocalToPart = function () {
  try {
    const partSelect = document.getElementById("vocalPartSelect");
    const styleSelect = document.getElementById("vocalStyleSelect");
    const assignmentsContainer = document.getElementById(
      "vocalPartAssignments",
    );

    if (!partSelect || !styleSelect || !assignmentsContainer) {
      window.showToast("파트별 보컬 스타일 지정 요소를 찾을 수 없습니다.", "error");
      return;
    }

    const selectedPart = partSelect.value;
    let selectedStyle = styleSelect.value;

    // 파트 선택 확인
    if (!selectedPart) {
      window.showToast("파트를 선택해주세요.", "info");
      partSelect.focus();
      return;
    }

    // 보컬 스타일 선택 확인
    if (!selectedStyle) {
      window.showToast("보컬 스타일을 선택해주세요.", "info");
      styleSelect.focus();
      return;
    }

    // 커스텀 보컬 스타일 처리
    if (selectedStyle === "__CUSTOM__") {
      const customInput = document.getElementById("customVocalStyleText");
      if (customInput && customInput.value.trim()) {
        selectedStyle = customInput.value.trim();
      } else {
        window.showToast("커스텀 보컬 스타일을 입력해주세요.", "info");
        const customInputDiv = document.getElementById("customVocalStyleInput");
        if (customInputDiv) {
          customInputDiv.style.display = "block";
        }
        if (customInput) {
          customInput.focus();
        }
        return;
      }
    }

    // 전역 변수에 저장
    window.vocalPartAssignments[selectedPart] = selectedStyle;

    // UI에 표시
    renderVocalPartAssignments();

    // 선택 초기화
    partSelect.value = "";
    styleSelect.value = "";
    const customInput = document.getElementById("customVocalStyleText");
    if (customInput) {
      customInput.value = "";
    }
    const customInputDiv = document.getElementById("customVocalStyleInput");
    if (customInputDiv) {
      customInputDiv.style.display = "none";
    }

    console.log(
      "✅ 파트별 보컬 스타일 지정 완료:",
      selectedPart,
      "→",
      selectedStyle,
    );

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ ${selectedPart}에 보컬 스타일이 지정되었습니다!`,
      );
    }
  } catch (error) {
    console.error("❌ 파트별 보컬 스타일 지정 오류:", error);
    window.showToast(
      "파트별 보컬 스타일 지정 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
};

// 파트별 보컬 스타일 지정 목록 렌더링
function renderVocalPartAssignments() {
  const assignmentsContainer = document.getElementById("vocalPartAssignments");
  if (!assignmentsContainer) return;

  const assignments = window.vocalPartAssignments || {};
  const parts = Object.keys(assignments);

  if (parts.length === 0) {
    assignmentsContainer.innerHTML =
      '<div style="padding: 10px; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">지정된 보컬 스타일이 없습니다.</div>';
    return;
  }

  let html = "";
  parts.forEach((part) => {
    const style = assignments[part];
    const styleText =
      typeof style === "string"
        ? style
        : style?.style || style?.label || style?.name || "";
    // 이모지 제거 (표시용)
    const displayStyle = styleText
      .replace(/[👩👨👫🎵👥🎤💨👩‍🎤👨‍🎤👩‍🦰👩‍💼👨‍🎨]/g, "")
      .trim();

    html += `
            <div class="vocal-assignment-item"
                 data-part="${escapeHtml(part)}"
                 style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin-bottom: 5px; background: var(--bg-input); border-radius: 6px; border: 1px solid var(--border);">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem; margin-bottom: 3px;">${escapeHtml(part)}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(displayStyle)}</div>
                </div>
                <button class="btn btn-small btn-danger"
                        onclick="removeVocalPartAssignment(this.closest('.vocal-assignment-item').dataset.part)"
                        style="padding: 4px 8px; font-size: 0.75rem; margin-left: 10px;"
                        title="삭제">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
  });

  assignmentsContainer.innerHTML = html;
}

// 파트별 보컬 스타일 지정 제거
window.removeVocalPartAssignment = function (part) {
  try {
    if (window.vocalPartAssignments && window.vocalPartAssignments[part]) {
      delete window.vocalPartAssignments[part];
      renderVocalPartAssignments();
      console.log("✅ 파트별 보컬 스타일 제거:", part);
    }
  } catch (error) {
    console.error("❌ 파트별 보컬 스타일 제거 오류:", error);
  }
};

// 커스텀 보컬 스타일 추가
window.addCustomVocalStyle = function () {
  const customInput = document.getElementById("customVocalStyleText");
  const styleSelect = document.getElementById("vocalStyleSelect");

  if (!customInput || !styleSelect) return;

  const customStyle = customInput.value.trim();
  if (!customStyle) {
    window.showToast("보컬 스타일을 입력해주세요.", "info");
    customInput.focus();
    return;
  }

  // select에 옵션 추가
  const option = document.createElement("option");
  option.value = customStyle;
  option.textContent = customStyle;
  styleSelect.appendChild(option);

  // 선택
  styleSelect.value = customStyle;

  // 입력 필드 초기화 및 숨기기
  customInput.value = "";
  const customInputDiv = document.getElementById("customVocalStyleInput");
  if (customInputDiv) {
    customInputDiv.style.display = "none";
  }

  // 커스텀 옵션 선택 해제
  styleSelect.value = customStyle;

  console.log("✅ 커스텀 보컬 스타일 추가:", customStyle);
};

// 보컬 스타일 선택 시 커스텀 입력 필드 표시 및 초기화
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", function () {
    const styleSelect = document.getElementById("vocalStyleSelect");
    const customInputDiv = document.getElementById("customVocalStyleInput");

    if (styleSelect && customInputDiv) {
      styleSelect.addEventListener("change", function () {
        if (this.value === "__CUSTOM__") {
          customInputDiv.style.display = "block";
          const customInput = document.getElementById("customVocalStyleText");
          if (customInput) {
            customInput.focus();
          }
        } else {
          customInputDiv.style.display = "none";
        }
      });
    }

    // 페이지 로드 시 파트별 보컬 지정 목록 렌더링
    setTimeout(() => {
      if (typeof renderVocalPartAssignments === "function") {
        renderVocalPartAssignments();
      }
    }, 500);
  });
}

// ═══════════════════════════════════════════════════════════════
// 스타일 프롬프트 한글 해석 함수들
// ═══════════════════════════════════════════════════════════════

// 디바운스 타이머
let stylePromptTranslationTimer = null;

// 디바운스된 번역 업데이트 (입력 중 호출 방지)
window.debounceUpdateStylePromptTranslation = function () {
  if (stylePromptTranslationTimer) {
    clearTimeout(stylePromptTranslationTimer);
  }
  stylePromptTranslationTimer = setTimeout(() => {
    window.updateStylePromptTranslation();
  }, 1000); // 1초 후 실행
};

// 스타일 프롬프트 번역 업데이트
window.updateStylePromptTranslation = function () {
  const stylePrompt = document.getElementById("stylePrompt")?.value || "";

  if (!stylePrompt.trim()) {
    const translationEl = document.getElementById("stylePromptTranslation");
    if (translationEl) {
      translationEl.innerHTML =
        '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">스타일 프롬프트를 입력하면 한글 해석이 표시됩니다.</div>';
    }
    return;
  }

  window.generateStylePromptTranslation();
};

// 스타일 프롬프트 한글 해석 생성 (AI 사용)
window.generateStylePromptTranslation = async function () {
  const stylePrompt = document.getElementById("stylePrompt")?.value || "";
  const translationEl = document.getElementById("stylePromptTranslation");

  if (!translationEl) return;

  if (!stylePrompt.trim()) {
    translationEl.innerHTML =
      '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">스타일 프롬프트를 입력하면 한글 해석이 표시됩니다.</div>';
    return;
  }

  // file:// 또는 origin 'null' 환경에서는 API 호출 시 CORS 오류 발생 → 기본 번역만 사용
  const isFileOrNullOrigin =
    typeof window.location !== "undefined" &&
    (window.location.protocol === "file:" ||
      window.location.origin === "null" ||
      String(window.location.href).startsWith("file://"));
  if (isFileOrNullOrigin) {
    const translation = translateStylePromptBasic(stylePrompt);
    translationEl.innerHTML =
      translation +
      '<p style="margin-top: 12px; padding: 10px; background: rgba(245, 158, 11, 0.15); border-radius: 8px; font-size: 0.8rem; color: var(--warning);">💡 파일로 열어서 API 호출이 제한됩니다. 로컬 서버(<code>http://</code>)에서 실행하면 ChatGPT 번역을 사용할 수 있습니다.</p>';
    return;
  }

  // 로딩 표시
  translationEl.innerHTML =
    '<div style="color: var(--text-secondary); text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> 한글 해석 생성 중...</div>';

  try {
    // OpenAI API 키 확인
    const apiKey = (typeof window.getOpenAIApiKey === "function" ? window.getOpenAIApiKey() : localStorage.getItem("openai_api_key"));

    if (!apiKey) {
      // API 키가 없으면 간단한 용어 사전 기반 번역
      const translation = translateStylePromptBasic(stylePrompt);
      translationEl.innerHTML = translation;
      return;
    }

    // ChatGPT로 번역
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: (window.getOpenAIModel ? window.getOpenAIModel() : "gpt-4o-mini"),
        messages: [
          {
            role: "system",
            content:
              "당신은 음악 스타일 프롬프트를 한글로 해석하는 전문가입니다. 영어 음악 용어를 한글로 자연스럽게 번역하고, 각 요소가 음악에서 어떤 의미인지 간단히 설명해주세요. 답변은 HTML 형식 없이 순수 텍스트로 작성하세요.",
          },
          {
            role: "user",
            content: `다음 음악 스타일 프롬프트를 한글로 해석해주세요:\n\n${stylePrompt}\n\n형식:\n- 각 요소를 쉼표로 구분하여 한글로 번역\n- 전문 용어는 괄호 안에 원어 표기\n- 간결하게 작성`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error("API 요청 실패");
    }

    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content || "";

    if (translation) {
      translationEl.innerHTML = `<div style="line-height: 1.8; white-space: pre-line;">${escapeHtml(translation)}</div>`;
      console.log("✅ 스타일 프롬프트 한글 해석 완료");
    } else {
      throw new Error("번역 결과 없음");
    }
  } catch (error) {
    const isCorsOrFetch =
      error instanceof TypeError &&
      (error.message === "Failed to fetch" || error.message.includes("fetch"));
    if (isCorsOrFetch) {
      // CORS/네트워크 오류 시 콘솔에만 간단 로그, 사용자에게는 기본 번역 + 안내
      console.warn(
        "⚠️ 스타일 프롬프트 ChatGPT 번역이 이 환경에서 제한됩니다. 기본 번역을 표시합니다.",
      );
    } else {
      console.error("❌ 스타일 프롬프트 번역 오류:", error);
    }
    const translation = translateStylePromptBasic(stylePrompt);
    const notice = isCorsOrFetch
      ? '<p style="margin-top: 12px; padding: 10px; background: rgba(245, 158, 11, 0.15); border-radius: 8px; font-size: 0.8rem; color: var(--warning);">💡 API 호출이 제한된 환경입니다. 로컬 서버(<code>http://</code>)에서 실행하면 ChatGPT 번역을 사용할 수 있습니다.</p>'
      : "";
    translationEl.innerHTML = translation + notice;
  }
};

// 기본 용어 사전 기반 번역 (API 없을 때 사용)
function translateStylePromptBasic(stylePrompt) {
  const dictionary = {
    // 장르
    pop: "팝",
    rock: "록",
    ballad: "발라드",
    jazz: "재즈",
    "r&b": "알앤비",
    "hip hop": "힙합",
    "hip-hop": "힙합",
    edm: "EDM",
    electronic: "일렉트로닉",
    classical: "클래식",
    folk: "포크",
    country: "컨트리",
    blues: "블루스",
    soul: "소울",
    funk: "펑크",
    reggae: "레게",
    metal: "메탈",
    punk: "펑크",
    indie: "인디",
    alternative: "얼터너티브",
    "k-pop": "케이팝",
    synth: "신스",
    synthwave: "신스웨이브",
    ambient: "앰비언트",

    // 분위기
    emotional: "감성적인",
    melancholic: "우울한",
    sad: "슬픈",
    happy: "행복한",
    energetic: "에너지 넘치는",
    calm: "차분한",
    peaceful: "평화로운",
    dramatic: "드라마틱한",
    intense: "강렬한",
    romantic: "로맨틱한",
    nostalgic: "향수어린",
    dreamy: "몽환적인",
    dark: "어두운",
    bright: "밝은",
    warm: "따뜻한",
    cool: "시원한",
    intimate: "친밀한",
    epic: "웅장한",
    cinematic: "영화같은",
    atmospheric: "분위기 있는",
    heartfelt: "진심어린",

    // 보컬
    vocal: "보컬",
    vocals: "보컬",
    "female vocal": "여성 보컬",
    "male vocal": "남성 보컬",
    soft: "부드러운",
    powerful: "파워풀한",
    breathy: "숨결 있는",
    husky: "허스키한",
    "high range": "고음역",
    "low range": "저음역",
    falsetto: "팔세토",
    whisper: "속삭임",
    "korean vocals": "한국어 보컬",
    korean: "한국어",

    // 악기
    piano: "피아노",
    guitar: "기타",
    "acoustic guitar": "어쿠스틱 기타",
    "electric guitar": "일렉트릭 기타",
    bass: "베이스",
    drums: "드럼",
    strings: "현악기",
    violin: "바이올린",
    cello: "첼로",
    orchestra: "오케스트라",
    "synth pad": "신스 패드",
    pad: "패드",
    synthesizer: "신디사이저",

    // 음향
    stereo: "스테레오",
    "wide stereo": "와이드 스테레오",
    mono: "모노",
    reverb: "리버브",
    echo: "에코",
    delay: "딜레이",
    chorus: "코러스",
    "studio quality": "스튜디오 퀄리티",
    "high quality": "고품질",

    // 템포
    bpm: "BPM",
    slow: "느린",
    fast: "빠른",
    "mid-tempo": "중간 템포",
    uptempo: "업템포",
    downtempo: "다운템포",

    // 기타
    atmosphere: "분위기",
    gentle: "부드러운",
    smooth: "부드러운",
    natural: "자연스러운",
    undertones: "뉘앙스",
    tone: "톤",
  };

  let result = stylePrompt.toLowerCase();
  let translations = [];

  // 쉼표로 구분된 각 요소 번역
  const parts = stylePrompt.split(",").map((p) => p.trim());

  parts.forEach((part) => {
    let translated = part.toLowerCase();
    let found = false;

    // 사전에서 매칭되는 용어 찾기
    for (const [eng, kor] of Object.entries(dictionary)) {
      if (translated.includes(eng)) {
        translated = translated.replace(new RegExp(eng, "gi"), kor);
        found = true;
      }
    }

    // BPM 숫자 처리
    const bpmMatch = part.match(/(\d+)\s*bpm/i);
    if (bpmMatch) {
      translated = `${bpmMatch[1]} BPM (분당 비트)`;
    }

    translations.push(translated);
  });

  return `<div style="line-height: 1.8;">
        <div style="margin-bottom: 10px; color: var(--text-secondary); font-size: 0.85rem;">
            <i class="fas fa-info-circle"></i> 기본 번역 (API 키 설정 시 더 정확한 해석 제공)
        </div>
        <div>${escapeHtml(translations.join(", "))}</div>
    </div>`;
}

function showMarketingMVWorkspace() {
  const marketingResult = document.getElementById("marketingResult");
  if (marketingResult) {
    marketingResult.style.display = "block";
    marketingResult.classList.remove("hidden");
  }

  if (typeof window.showMarketingTab === "function") {
    window.showMarketingTab("mv");
  }
}

// ═══════════════════════════════════════════════════════════════
// 6단계: 마케팅 자료 생성 함수
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// generateMarketingMaterials 헬퍼 함수들 (순수 추출 리팩터링, 동작 동일)
// ═══════════════════════════════════════════════════════════════

// 화면/전역 상태에서 마케팅 자료 생성에 쓸 제목·가사·스타일을 모은다.
function collectMarketingSourceData() {
  const marketingData = window.marketingData || {};
  const title =
    marketingData.title ||
    document.getElementById("finalTitleText")?.textContent ||
    window.currentSunoTitle ||
    document.getElementById("sunoTitle")?.value ||
    document.getElementById("songTitle")?.value ||
    "제목 없음";

  const lyrics =
    marketingData.lyrics ||
    document.getElementById("finalLyrics")?.textContent ||
    document.getElementById("finalizedLyrics")?.value ||
    document.getElementById("sunoLyrics")?.value ||
    "";

  const style =
    marketingData.style ||
    document.getElementById("finalStyle")?.textContent ||
    document.getElementById("finalizedStyle")?.value ||
    document.getElementById("stylePrompt")?.value ||
    "";

  return { title, lyrics, style };
}

// AI에게 보낼 마케팅 자료 생성 요청 프롬프트를 만든다.
function buildMarketingMaterialsPrompt(title, lyrics, style, guidelines) {
  return `다음 정보를 바탕으로 뮤직모리 채널용 마케팅 자료를 생성해주세요.

=== 곡 정보 ===
제목: ${title}
가사: ${lyrics.substring(0, 1000)}${lyrics.length > 1000 ? "..." : ""}
스타일 프롬프트: ${style.substring(0, 500)}${style.length > 500 ? "..." : ""}

${
  guidelines
    ? `=== 제작 지침서 (참고) ===
${guidelines.substring(0, 1000)}${guidelines.length > 1000 ? "..." : ""}

`
    : ""
}=== 생성 요청 사항 ===

다음 마케팅 자료를 생성해주세요:

1. **유튜브 설명란 (youtubeDesc)**: 
   - 곡의 감성과 스토리를 담은 매력적인 설명
   - 이모지와 해시태그 포함
   - 뮤직모리 채널 구독 및 좋아요 유도 문구 포함
   - 길이: 200-500자

2. **틱톡 설명란 (tiktokDesc)**:
   - 짧고 임팩트 있는 설명
   - 핵심 키워드와 해시태그 포함
   - 길이: 50-150자

3. **해시태그 (hashtags)**:
   - 곡 제목, 장르, 감정, 키워드 관련 해시태그
   - 한글과 영어 해시태그 혼합
   - 콤마로 구분된 형식
   - 15-25개 정도

4. **썸네일 문구 (thumbnails)**:
   - 유튜브 썸네일용 문구 10개 생성
   - 곡의 감성, 스토리, 핵심 키워드를 담은 짧고 임팩트 있는 문구
   - 각 문구는 10-30자 정도로 간결하게
   - 감정적이고 시각적으로 표현력 있는 문구
   - 예: "뉴욕 야경 속 애절한 그리움", "Time is cruel, 잃어버린 너" 등

=== 응답 형식 ===
다음 JSON 형식으로 응답해주세요:

{
  "youtubeDesc": "유튜브 설명란 내용",
  "tiktokDesc": "틱톡 설명란 내용",
  "hashtags": "#해시태그1,#해시태그2,#해시태그3",
  "thumbnails": [
    "썸네일 문구 1",
    "썸네일 문구 2",
    "썸네일 문구 3",
    "... (총 10개)"
  ]
}

**중요**: JSON 형식만 출력하고, 다른 설명이나 텍스트는 포함하지 마세요.`;
}

// AI 응답 텍스트를 파싱해 마케팅 자료 객체로 만든다. 파싱 실패 시
// 원본 텍스트/제목 기반 기본값으로 대체한다 (기존 동작과 동일).
function parseMarketingMaterialsResponse(aiResponse, title) {
  try {
    let cleanedResponse = aiResponse.trim();
    if (cleanedResponse.includes("```json")) {
      cleanedResponse = cleanedResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
    } else if (cleanedResponse.includes("```")) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, "").trim();
    }

    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("JSON 형식을 찾을 수 없습니다.");
  } catch (parseError) {
    console.error("JSON 파싱 오류:", parseError);
    return {
      youtubeDesc:
        aiResponse.substring(0, 500) || "마케팅 자료를 생성할 수 없습니다.",
      tiktokDesc:
        aiResponse.substring(0, 150) || "마케팅 자료를 생성할 수 없습니다.",
      hashtags: "#뮤직모리,#MusicMori",
      thumbnails: [
        `${title} - 뮤직모리`,
        "감성적인 멜로디",
        "깊은 울림",
        "마음을 울리는 음악",
        "뮤직모리 채널",
        "새로운 음악",
        "감동적인 스토리",
        "음악과 함께",
        "특별한 순간",
        "음악의 힘",
      ],
    };
  }
}

// 파싱된 마케팅 자료를 결과 화면 DOM에 반영한다 (썸네일 카드 포함).
function renderMarketingMaterials(marketingMaterials) {
  const youtubeDescEl = document.getElementById("youtubeDesc");
  const tiktokDescEl = document.getElementById("tiktokDesc");
  const hashtagsEl = document.getElementById("hashtagsContent");
  const thumbnailsGridEl = document.getElementById("thumbnailsGrid");

  if (youtubeDescEl && marketingMaterials.youtubeDesc) {
    youtubeDescEl.textContent = marketingMaterials.youtubeDesc;
  }

  if (tiktokDescEl && marketingMaterials.tiktokDesc) {
    tiktokDescEl.textContent = marketingMaterials.tiktokDesc;
  }

  if (hashtagsEl && marketingMaterials.hashtags) {
    hashtagsEl.textContent = marketingMaterials.hashtags;
  }

  if (
    thumbnailsGridEl &&
    marketingMaterials.thumbnails &&
    Array.isArray(marketingMaterials.thumbnails)
  ) {
    let thumbnailsHtml = "";
    marketingMaterials.thumbnails.forEach((thumb, index) => {
      const thumbnailText =
        typeof thumb === "string"
          ? thumb
          : thumb.text || thumb.content || String(thumb);
      thumbnailsHtml += `
                    <div class="thumbnail-item" style="padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s;"
                         onclick="if(typeof window.copyToClipboard === 'function') { window.copyToClipboard(null, this.querySelector('.thumbnail-text').textContent, event); }">
                        <div class="thumbnail-text" style="font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">${escapeHtml(thumbnailText)}</div>
                        <button class="btn btn-small btn-success" onclick="event.stopPropagation(); if(typeof window.copyToClipboard === 'function') { window.copyToClipboard(null, this.closest('.thumbnail-item').querySelector('.thumbnail-text').textContent, event); }">
                            <i class="fas fa-copy"></i> 복사
                        </button>
                    </div>
                `;
    });
    thumbnailsGridEl.innerHTML = thumbnailsHtml;
  }
}

// 생성된 마케팅 자료를 현재 프로젝트 데이터에 저장한다.
function saveMarketingMaterialsToProject(marketingMaterials) {
  if (!window.currentProject) return;
  if (!window.currentProject.data) {
    window.currentProject.data = {};
  }
  if (!window.currentProject.data.marketing) {
    window.currentProject.data.marketing = {};
  }
  window.currentProject.data.marketing.youtubeDesc =
    marketingMaterials.youtubeDesc || "";
  window.currentProject.data.marketing.tiktokDesc =
    marketingMaterials.tiktokDesc || "";
  window.currentProject.data.marketing.hashtags =
    marketingMaterials.hashtags || "";
  if (
    marketingMaterials.thumbnails &&
    Array.isArray(marketingMaterials.thumbnails)
  ) {
    window.currentProject.data.marketing.thumbnails =
      marketingMaterials.thumbnails.map((thumb) =>
        typeof thumb === "string"
          ? thumb
          : thumb.text || thumb.content || String(thumb),
      );
  }
}

window.generateMarketingMaterials = async function () {
  try {
    const marketingResult = document.getElementById("marketingResult");
    const marketingLoading = document.getElementById("marketingLoading");

    if (!marketingResult || !marketingLoading) {
      console.warn("⚠️ 마케팅 UI 요소를 찾을 수 없습니다.");
      return;
    }

    // 마케팅 데이터 가져오기
    const { title, lyrics, style } = collectMarketingSourceData();

    if (!lyrics.trim()) {
      window.showToast(
        "⚠️ 마케팅 자료를 생성할 가사가 없습니다.\n\n5단계에서 최종 가사를 확인한 후 다시 시도해주세요.", "error");
      return;
    }

    // 로딩 화면 표시
    marketingLoading.style.display = "block";
    marketingResult.style.display = "none";

    // Gemini API 키 확인 (공용 키 포함)
    const geminiKey = (typeof window.getGeminiApiKey === "function" ? window.getGeminiApiKey() : localStorage.getItem("gemini_api_key")) || "";
    if (!geminiKey || !geminiKey.startsWith("AIza")) {
      showMarketingMVWorkspace();
      marketingLoading.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                    <h4 style="margin-bottom: 10px; color: var(--error);">Gemini API 키가 필요합니다</h4>
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">마케팅 설명 자동 생성에는 Gemini API 키가 필요합니다.<br>MV 프롬프트 탭은 계속 사용할 수 있으니 씬 구성과 프롬프트 작업을 먼저 진행할 수 있습니다.</p>
                    <button class="btn btn-primary" onclick="if(typeof window.openAPISettings === 'function') { window.openAPISettings(); }">
                        <i class="fas fa-key"></i> API 키 설정
                    </button>
                </div>
            `;
      return;
    }

    // 지침서 가져오기
    const guidelines = localStorage.getItem("musicCreatorGuidelines") || "";

    // 마케팅 자료 생성 프롬프트
    const marketingPrompt = buildMarketingMaterialsPrompt(title, lyrics, style, guidelines);

    const aiResponse = await window.callAIWithTextFallback({
      prompt: marketingPrompt,
      geminiKey,
      contextLabel: "마케팅 생성",
      temperature: 0.8,
      maxOutputTokens: 3000,
      geminiJsonMime: false,
      openaiSystemMessage:
        "You are an AI marketer creating promotional texts matching the requested JSON format.",
    });

    if (!aiResponse.trim()) {
      throw new Error("Gemini API에서 응답을 받지 못했습니다.");
    }

    const marketingMaterials = parseMarketingMaterialsResponse(aiResponse, title);

    renderMarketingMaterials(marketingMaterials);

    // 로딩 숨기고 결과 표시
    marketingLoading.style.display = "none";
    marketingResult.style.display = "block";
    marketingResult.classList.remove("hidden");

    saveMarketingMaterialsToProject(marketingMaterials);

    console.log("✅ 마케팅 자료 생성 완료:", marketingMaterials);

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator("✅ 마케팅 자료가 생성되었습니다!");
    }
  } catch (error) {
    console.error("❌ 마케팅 자료 생성 오류:", error);

    const marketingLoading = document.getElementById("marketingLoading");
    if (marketingLoading) {
      marketingLoading.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                    <h4 style="margin-bottom: 10px; color: var(--error);">마케팅 자료 생성 중 오류가 발생했습니다</h4>
                    <p style="color: var(--text-secondary); margin-bottom: 15px;">${escapeHtml(error.message)}</p>
                    <button class="btn btn-primary" onclick="if(typeof window.generateMarketingMaterials === 'function') { window.generateMarketingMaterials(); }">
                        <i class="fas fa-redo"></i> 다시 시도
                    </button>
                </div>
            `;
    }

    window.showToast(
      "⚠️ 마케팅 자료 생성 중 오류가 발생했습니다.\n\n" +
        "원인: " +
        error.message +
        "\n\n" +
        "해결방법:\n" +
        "1. API 키가 올바른지 확인하세요\n" +
        "2. 네트워크 연결을 확인하세요\n" +
        "3. 잠시 후 다시 시도해주세요", "error");
  }
};

// ═══════════════════════════════════════════════════════════════
// 씬 다양성 보장 함수
// ═══════════════════════════════════════════════════════════════
function ensureSceneDiversity(scenes) {
  const usedLocations = new Set();
  const locationAlternatives = {
    "도시 거리": ["도시 야경", "도시 공원", "도시 카페"],
    "도시 야경": ["도시 거리", "옥상", "야경 전망대"],
    해변: ["강변", "호수", "바다 전망대"],
    산: ["공원", "숲", "야외 산책로"],
    숲: ["공원", "산", "야외 정원"],
    실내: ["카페", "도서관", "스튜디오"],
    카페: ["도서관", "실내", "공원 벤치"],
  };

  return scenes.map((scene, index) => {
    const location = scene.location || "";

    // 중복 체크
    if (usedLocations.has(location) && index > 0) {
      // 대체 배경 제안
      const alternatives = locationAlternatives[location] || [];
      const available = alternatives.filter((alt) => !usedLocations.has(alt));

      if (available.length > 0) {
        scene.location = available[0];
        scene.prompt = scene.prompt.replace(location, available[0]);
        scene.scene = scene.scene.replace(location, available[0]);
      }
    }

    usedLocations.add(scene.location || location);
    return scene;
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(() => {
        if (typeof window.loadMVSettings === "function")
          window.loadMVSettings();
        if (typeof window.updateMVImageCount === "function")
          window.updateMVImageCount();
        if (typeof window.updateCharacterInputs === "function")
          window.updateCharacterInputs();
      }, 500);
    });
  } else {
    setTimeout(() => {
      if (typeof window.loadMVSettings === "function") window.loadMVSettings();
      if (typeof window.updateMVImageCount === "function")
        window.updateMVImageCount();
      if (typeof window.updateCharacterInputs === "function")
        window.updateCharacterInputs();
    }, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// 프로젝트 목록 로드 함수 (debounce 적용)
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// loadProjectList 헬퍼 함수들 (원래 함수 내부에 중첩되어 있던 것을
// 모듈 스코프로 끌어올리고, 단계별로 이름 붙여 분리함 — 동작은
// 원본과 완전히 동일하게 유지한다. 순수 추출 리팩터링.)
// ═══════════════════════════════════════════════════════════════

// 한글 제목 분리 헬퍼 (정렬 시 제목 비교용)
function getKoreanTitle(fullTitle) {
  if (!fullTitle) return "";
  const match = fullTitle.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : fullTitle.trim();
}

// 한글 제목과 영어 제목 분리 ("한글제목 (English Title)" 형식 파싱)
function splitTitle(fullTitle) {
  if (!fullTitle) return { korean: "제목 없음", english: "" };
  const match = fullTitle.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return { korean: match[1].trim(), english: match[2].trim() };
  }
  return { korean: fullTitle.trim(), english: "" };
}

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// localStorage 전체를 훑어 프로젝트로 보이는 데이터를 모두 모으고,
// 같은 id는 "유효한 제목 우선 → 더 최신 우선" 규칙으로 중복 제거한다.
function collectAllStoredProjects() {
  let allProjects = [];
  const foundKeys = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    try {
      const data = localStorage.getItem(key);
      if (!data) continue;

      if (data.trim().startsWith("[")) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const firstItem = parsed[0];
          if (firstItem && typeof firstItem === "object" && firstItem.id) {
            allProjects = allProjects.concat(parsed);
            foundKeys.push(key);
            console.log(`✅ ${key} 키에서 ${parsed.length}개 프로젝트 발견`);
          }
        }
      } else if (data.trim().startsWith("{")) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object" && parsed.id) {
          allProjects.push(parsed);
          foundKeys.push(key);
          console.log(`✅ ${key} 키에서 단일 프로젝트 발견`);
        }
      }
    } catch (e) {
      // JSON 파싱 실패는 무시
    }
  }

  const projectMap = new Map();
  const isValidTitle = (t) => t && t !== "제목 없음" && t !== "undefined";

  allProjects.forEach((project) => {
    if (!project.id) return;

    const existing = projectMap.get(project.id);
    if (!existing) {
      projectMap.set(project.id, project);
    } else {
      const existingHasValidTitle = isValidTitle(existing.title);
      const nextHasValidTitle = isValidTitle(project.title);

      if (!existingHasValidTitle && nextHasValidTitle) {
        projectMap.set(project.id, project);
      } else if (existingHasValidTitle && !nextHasValidTitle) {
        return;
      } else {
        const existingDate = new Date(existing.savedAt || existing.createdAt || 0);
        const newDate = new Date(project.savedAt || project.createdAt || 0);
        if (newDate > existingDate) {
          projectMap.set(project.id, project);
        }
      }
    }
  });

  const projects = Array.from(projectMap.values());
  console.log(`✅ 총 ${projects.length}개 프로젝트 발견 (${foundKeys.length}개 키에서)`);
  return projects;
}

// #projectSearch 입력값으로 프로젝트 목록을 필터링한다.
function filterProjectsBySearchInput(projects) {
  const searchInput = document.getElementById("projectSearch");
  if (!searchInput || !searchInput.value.trim()) return projects;

  const searchTerm = searchInput.value.trim().toLowerCase();
  return projects.filter((project) => {
    const title = (project.title || "").toLowerCase();
    const genres = (project.genres || []).join(" ").toLowerCase();
    return title.includes(searchTerm) || genres.includes(searchTerm);
  });
}

// #projectSort 드롭다운 값을 읽어 정렬을 적용한다.
// { sorted, sortField, sortOrder, sortValue } 를 반환한다.
function sortProjectsForList(projects) {
  const sortSelect = document.getElementById("projectSort");
  const sortValue = sortSelect && sortSelect.value ? sortSelect.value : "savedAt-desc";
  const [sortField, sortOrder] = sortValue.split("-");

  const sorted = projects.slice().sort((a, b) => {
    let valueA, valueB;

    if (sortField === "savedAt" || sortField === "createdAt") {
      valueA = new Date(a[sortField] || a.createdAt || a.savedAt || 0);
      valueB = new Date(b[sortField] || b.createdAt || b.savedAt || 0);
    } else if (sortField === "title") {
      valueA = getKoreanTitle(a.title || "").toLowerCase();
      valueB = getKoreanTitle(b.title || "").toLowerCase();
    } else if (sortField === "genre") {
      valueA = (a.genres || []).join(", ").toLowerCase();
      valueB = (b.genres || []).join(", ").toLowerCase();
    } else if (sortField === "step") {
      const stepA = a.lastStep || "";
      const stepB = b.lastStep || "";
      valueA = parseInt(stepA.toString().replace(/[^0-9]/g, "")) || 0;
      valueB = parseInt(stepB.toString().replace(/[^0-9]/g, "")) || 0;
    } else {
      valueA = new Date(a.savedAt || a.createdAt || a.updatedAt || 0);
      valueB = new Date(b.savedAt || b.createdAt || b.updatedAt || 0);
    }

    if (sortOrder === "asc") {
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    }
    return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
  });

  console.log(`✅ 정렬 적용 완료: ${sortValue} (${sortField}-${sortOrder})`);
  return { sorted, sortField, sortOrder, sortValue };
}

// 사이드바 "최근 프로젝트" 5개 영역을 갱신한다.
function renderRecentProjectsList(filteredProjects) {
  const recentEl = document.getElementById("recentProjectsList");
  if (!recentEl) return;

  const recent = filteredProjects.slice(0, 5);
  let recentHtml =
    '<div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px;">📌 최근 프로젝트</div>';
  recent.forEach(function (proj) {
    const t = escapeHtml(proj.title || "제목 없음");
    const safeRecentId = String(proj.id).replace(/[^\w.-]/g, "");
    recentHtml +=
      '<button type="button" class="btn btn-small" style="width: 100%; margin-bottom: 6px; justify-content: flex-start; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem;" onclick="event.stopPropagation(); if(typeof window.loadProject === \'function\') { window.loadProject(\'' +
      safeRecentId +
      "'); }\">" +
      t +
      "</button>";
  });
  recentEl.innerHTML = recentHtml;
  recentEl.style.display = "block";
}

// 정렬 기준(sortField)에 따라 이 항목에 어떤 부가 정보를 보여줄지 결정한다.
// isSortMode는 loadProjectList에서 항상 true로 고정되어 있으므로 그대로 전달받는다.
function getProjectListItemDisplayFlags(project, sortField, isSortMode, createdDateStr, savedDateStr, savedAt, genresStr, stepStr) {
  let showCreatedDate = false;
  let showSavedDate = false;
  let showGenres = false;
  let showStep = false;

  if (isSortMode) {
    switch (sortField) {
      case "createdAt":
        showCreatedDate = true;
        break;
      case "savedAt":
        showSavedDate = true;
        break;
      case "genre":
        showGenres = true;
        break;
      case "step":
        showStep = true;
        break;
      case "title":
        break;
    }
  } else {
    showCreatedDate = !!createdDateStr;
    showSavedDate = !!(savedDateStr && savedAt);
    showGenres = !!genresStr;
    showStep = !!stepStr;
  }

  return { showCreatedDate, showSavedDate, showGenres, showStep };
}

// 프로젝트 하나에 대한 목록 항목 HTML을 만든다.
function buildProjectListItemHtml(project, sortField, isSortMode) {
  const titleParts = splitTitle(project.title);
  const koreanTitle = titleParts.korean;

  const createdAt = project.createdAt || null;
  const savedAt = project.savedAt || project.updatedAt || null;
  const savedDate = savedAt || createdAt || Date.now();

  const createdDateStr = formatDate(createdAt);
  const savedDateStr = formatDate(savedAt || savedDate);

  const genresStr =
    project.genres && project.genres.length > 0 ? project.genres.join(", ") : "";
  const stepStr = project.lastStep ? project.lastStep : "";

  const { showCreatedDate, showSavedDate, showGenres, showStep } =
    getProjectListItemDisplayFlags(
      project,
      sortField,
      isSortMode,
      createdDateStr,
      savedDateStr,
      savedAt,
      genresStr,
      stepStr,
    );

  // 가져오기(import)로 유입될 수 있는 임의 ID가 onclick/속성 컨텍스트를
  // 깨뜨리지 않도록 안전한 문자만 남긴다.
  const safeId = String(project.id).replace(/[^\w.-]/g, "");

  return `
                <div class="project-item"
                     data-project-id="${safeId}"
                     draggable="true"
                     style="padding: 12px 15px; margin-bottom: 10px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border); cursor: move; transition: all 0.2s; position: relative; min-height: 50px; display: flex; align-items: center;"
                     onmouseover="if(!this.classList.contains('dragging')) this.style.background='var(--bg-input)'"
                     onmouseout="if(!this.classList.contains('dragging')) this.style.background='var(--bg-card)'">
                    <span class="project-drag-handle" style="position: absolute; left: 3px; top: 50%; transform: translateY(-50%); opacity: 0.3; cursor: grab; font-size: 0.85rem; color: var(--text-secondary); z-index: 10; flex-shrink: 0; width: 18px;" title="드래그하여 순서 변경" onmousedown="event.stopPropagation();">
                        <i class="fas fa-grip-vertical"></i>
                    </span>
                    <button class="project-duplicate"
                            onclick="event.stopPropagation(); duplicateProject('${safeId}');"
                            style="position: absolute; right: 58px; top: 50%; transform: translateY(-50%); background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 6px; padding: 5px 8px; cursor: pointer; opacity: 0.6; transition: all 0.2s; color: var(--accent); font-size: 0.75rem; z-index: 10; flex-shrink: 0; white-space: nowrap;"
                            onmouseover="this.style.opacity='1'; this.style.background='rgba(139, 92, 246, 0.2)'"
                            onmouseout="this.style.opacity='0.6'; this.style.background='rgba(139, 92, 246, 0.1)'"
                            title="프로젝트 복제">
                        <i class="fas fa-copy"></i> 복제
                    </button>
                    <button class="project-delete"
                            onclick="event.stopPropagation(); deleteProject('${safeId}');"
                            style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 5px 8px; cursor: pointer; opacity: 0.6; transition: all 0.2s; color: var(--error); font-size: 0.75rem; z-index: 10; flex-shrink: 0; white-space: nowrap;"
                            onmouseover="this.style.opacity='1'; this.style.background='rgba(239, 68, 68, 0.2)'"
                            onmouseout="this.style.opacity='0.6'; this.style.background='rgba(239, 68, 68, 0.1)'"
                            title="프로젝트 삭제">
                        <i class="fas fa-trash-alt"></i> 삭제
                    </button>
                    <div style="padding-left: 22px; padding-right: 125px; cursor: pointer; word-wrap: break-word; overflow-wrap: break-word; min-width: 0; flex: 1; width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; text-align: left; display: flex; flex-direction: column; justify-content: center;" onclick="event.stopPropagation(); loadProject('${safeId}');">
                        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: ${isSortMode && !showCreatedDate && !showSavedDate && !showGenres && !showStep ? "0" : "4px"}; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; text-align: left;">${escapeHtml(koreanTitle)}</div>
                        ${showCreatedDate && createdDateStr ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 2px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;"><span style="opacity: 0.7;">📅 작성일시:</span> <span>${createdDateStr}</span></div>` : ""}
                        ${showSavedDate && savedDateStr && savedAt ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 2px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;"><span style="opacity: 0.7;">✏️ 수정일시:</span> <span>${savedDateStr}</span></div>` : ""}
                        ${showGenres && genresStr ? `<div style="font-size: 0.75rem; color: var(--accent); margin-top: 2px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;"><span style="opacity: 0.8;">🎵 장르:</span> ${escapeHtml(genresStr)}</div>` : ""}
                        ${showStep && stepStr ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;"><span style="opacity: 0.7;">📍 진행 단계:</span> ${escapeHtml(stepStr)}</div>` : ""}
                    </div>
                </div>
            `;
}

window.loadProjectList = function (force = false) {
  try {
    // 디바운스: 연속 호출 시 마지막 호출만 실행 (150ms)
    if (!force) {
      clearTimeout(window.loadProjectListDebounceTimer);
      window.loadProjectListDebounceTimer = setTimeout(function () {
        window.loadProjectList(true);
      }, 150);
      return;
    }
    // 중복 호출 방지 (로딩 중이 아닐 때만 실행)
    if (window.loadProjectListLoading) {
      console.log("⏳ 프로젝트 목록 로드 중... (중복 호출 무시)");
      return;
    }

    window.loadProjectListLoading = true;

    const projectListEl = document.getElementById("projectList");
    if (!projectListEl) {
      console.error("projectList 요소를 찾을 수 없습니다.");
      window.loadProjectListLoading = false;
      return;
    }

    const projects = collectAllStoredProjects();

    if (projects.length === 0) {
      projectListEl.innerHTML =
        '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">저장된 프로젝트가 없습니다.<br><br><small style="color: var(--text-secondary);">프로젝트를 저장하면 여기에 표시됩니다.</small></div>';
      const recentEl = document.getElementById("recentProjectsList");
      if (recentEl) {
        recentEl.innerHTML = "";
        recentEl.style.display = "none";
      }
      console.warn("⚠️ 프로젝트 데이터를 찾을 수 없습니다.");
      window.loadProjectListLoading = false;
      return;
    }

    const searchFiltered = filterProjectsBySearchInput(projects);
    const { sorted, sortField, sortValue } = sortProjectsForList(searchFiltered);
    let filteredProjects = sorted;

    if (filteredProjects.length === 0) {
      projectListEl.innerHTML =
        '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">검색 결과가 없습니다.</div>';
      const recentEl = document.getElementById("recentProjectsList");
      if (recentEl) {
        recentEl.innerHTML = "";
        recentEl.style.display = "none";
      }
      window.loadProjectListLoading = false;
      return;
    }

    renderRecentProjectsList(filteredProjects);

    // ═══════════════════════════════════════════════════════════════
    // 프로젝트 순서 복원 (정렬이 선택된 경우에는 건너뛰기)
    // ═══════════════════════════════════════════════════════════════
    const hasSortSelected = sortValue && sortValue !== "savedAt-desc";
    if (!hasSortSelected && typeof restoreProjectOrder === "function") {
      filteredProjects = restoreProjectOrder(filteredProjects);
    }

    // 정렬 드롭다운이 있으면 항상 정렬 모드 활성화 (기본값 포함)
    const isSortMode = true;

    let html = "";
    filteredProjects.forEach((project) => {
      html += buildProjectListItemHtml(project, sortField, isSortMode);
    });

    projectListEl.innerHTML = html;

    // 프로젝트 항목 드래그 앤 드롭 초기화
    initProjectDragAndDrop();

    console.log(`✅ ${filteredProjects.length}개 프로젝트 표시 완료`);

    // 로딩 완료 플래그 해제
    window.loadProjectListLoading = false;
  } catch (error) {
    console.error("프로젝트 로드 오류:", error);
    // 오류 발생 시에도 플래그 해제
    window.loadProjectListLoading = false;
    const projectListEl = document.getElementById("projectList");
    if (projectListEl) {
      projectListEl.innerHTML =
        '<div style="padding: 20px; text-align: center; color: var(--error);">프로젝트를 불러올 수 없습니다.<br>오류: ' +
        error.message +
        "</div>";
    }
  }
};

// 프로젝트 검색 필터링
window.filterProjects = function () {
  if (typeof window.loadProjectList === "function") {
    window.loadProjectList();
  }
};

// 프로젝트 정렬
window.sortProjects = function () {
  if (typeof window.loadProjectList === "function") {
    window.loadProjectList();
  }
};

// 공통 터치 드래그 앤 드롭 폴리필
// HTML5의 dragstart/dragover/drop 이벤트는 모바일 터치에서 발생하지 않으므로,
// 같은 "핸들을 눌러서 끌면 순서가 바뀐다" 동작을 touchstart/touchmove/touchend로
// 재현한다. 실제 순서 저장/재초기화는 각 호출부의 onReorderComplete 콜백에 위임한다.
function enableTouchDragReorder(handle, item, container, itemSelector, onReorderComplete) {
  if (!handle || !item || !container) return;

  let dragging = false;
  let startX = 0;
  let startY = 0;
  const MOVE_THRESHOLD = 8; // 이 값 미만 이동은 탭(스크롤 시도 등)으로 간주해 드래그로 취급하지 않음

  function clearHighlights() {
    Array.from(container.querySelectorAll(itemSelector)).forEach((el) =>
      el.classList.remove("drag-over"),
    );
  }

  handle.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      dragging = false;
    },
    { passive: true },
  );

  handle.addEventListener(
    "touchmove",
    function (e) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];

      if (!dragging) {
        const dx = Math.abs(touch.clientX - startX);
        const dy = Math.abs(touch.clientY - startY);
        if (dx < MOVE_THRESHOLD && dy < MOVE_THRESHOLD) return;
        dragging = true;
        item.classList.add("dragging");
      }

      // 드래그가 확정되면 페이지 스크롤 대신 재정렬 동작을 수행
      e.preventDefault();

      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetItem =
        target && target.closest ? target.closest(itemSelector) : null;

      clearHighlights();

      if (
        targetItem &&
        targetItem !== item &&
        container.contains(targetItem)
      ) {
        targetItem.classList.add("drag-over");
        const rect = targetItem.getBoundingClientRect();
        const insertBefore = touch.clientY < rect.top + rect.height / 2;
        if (insertBefore) {
          container.insertBefore(item, targetItem);
        } else if (targetItem.nextSibling) {
          container.insertBefore(item, targetItem.nextSibling);
        } else {
          container.appendChild(item);
        }
      }
    },
    { passive: false },
  );

  function finish() {
    const wasDragging = dragging;
    dragging = false;
    item.classList.remove("dragging");
    clearHighlights();
    if (wasDragging && typeof onReorderComplete === "function") {
      onReorderComplete();
    }
  }

  handle.addEventListener("touchend", finish, { passive: true });
  handle.addEventListener("touchcancel", finish, { passive: true });
}

// 프로젝트 순서를 저장하고 드래그 앤 드롭을 재초기화한다.
// (마우스 drop 핸들러와 터치 재정렬 완료 시 공통으로 사용)
function saveAndReinitProjectOrder() {
  saveProjectOrder();
  setTimeout(() => {
    window.initProjectDragAndDrop();
  }, 100);
}

// 프로젝트 목록 드래그 앤 드롭 초기화
window.initProjectDragAndDrop = function () {
  const projectList = document.getElementById("projectList");
  if (!projectList) return;

  const projectItems = projectList.querySelectorAll(".project-item");
  let draggedElement = null;

  projectItems.forEach((item) => {
    let isDragging = false;
    let dragStartTime = 0;
    let dragStartX = 0;
    let dragStartY = 0;

    // 마우스 다운 (드래그 시작 감지)
    item.addEventListener("mousedown", function (e) {
      // 드래그 핸들이 아닌 경우에만
      if (!e.target.closest(".project-drag-handle")) {
        dragStartTime = Date.now();
        dragStartX = e.clientX;
        dragStartY = e.clientY;
      }
    });

    // 드래그 시작
    item.addEventListener("dragstart", function (e) {
      // 삭제 버튼 클릭 시 드래그 방지
      if (e.target.closest(".project-delete")) {
        e.preventDefault();
        return false;
      }

      // 드래그 핸들에서만 드래그 시작
      if (!e.target.closest(".project-drag-handle") && !isDragging) {
        e.preventDefault();
        return false;
      }

      isDragging = true;
      draggedElement = this;
      this.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/html", this.innerHTML);

      // 드래그 이미지 설정
      const dragImage = this.cloneNode(true);
      dragImage.style.opacity = "0.5";
      dragImage.style.position = "absolute";
      dragImage.style.top = "-1000px";
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    });

    // 드래그 종료
    item.addEventListener("dragend", function (e) {
      isDragging = false;
      this.classList.remove("dragging");
      projectItems.forEach((i) => i.classList.remove("drag-over"));
      draggedElement = null;
    });

    // 클릭 이벤트 (드래그가 아닌 경우에만)
    item.addEventListener("click", function (e) {
      // 드래그 핸들 클릭은 무시
      if (e.target.closest(".project-drag-handle")) {
        return;
      }

      // 드래그가 아닌 경우에만 프로젝트 로드
      const timeDiff = Date.now() - dragStartTime;
      const xDiff = Math.abs(e.clientX - dragStartX);
      const yDiff = Math.abs(e.clientY - dragStartY);

      if (timeDiff < 300 && xDiff < 5 && yDiff < 5 && !isDragging) {
        const projectId = this.getAttribute("data-project-id");
        if (projectId && typeof window.loadProject === "function") {
          window.loadProject(projectId);
        }
      }
    });

    // 드래그 오버
    item.addEventListener("dragover", function (e) {
      if (draggedElement && draggedElement !== this) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        this.classList.add("drag-over");
      }
    });

    // 드래그 리브
    item.addEventListener("dragleave", function (e) {
      this.classList.remove("drag-over");
    });

    // 드롭
    item.addEventListener("drop", function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (draggedElement && draggedElement !== this) {
        const allItems = Array.from(
          projectList.querySelectorAll(".project-item"),
        );
        const draggedIndex = allItems.indexOf(draggedElement);
        const targetIndex = allItems.indexOf(this);

        if (draggedIndex < targetIndex) {
          // 아래로 이동
          this.parentNode.insertBefore(draggedElement, this.nextSibling);
        } else {
          // 위로 이동
          this.parentNode.insertBefore(draggedElement, this);
        }

        // 프로젝트 순서 저장 및 재초기화
        saveAndReinitProjectOrder();
      }

      this.classList.remove("drag-over");
    });

    // 모바일 터치 드래그 지원 (드래그 핸들에서 끌어서 재정렬)
    const projectDragHandle = item.querySelector(".project-drag-handle");
    if (projectDragHandle) {
      enableTouchDragReorder(
        projectDragHandle,
        item,
        projectList,
        ".project-item",
        saveAndReinitProjectOrder,
      );
    }
  });

  // 프로젝트 목록 전체 드롭 영역 허용
  projectList.addEventListener("dragover", function (e) {
    e.preventDefault();
  });
};

// 프로젝트 순서 저장
window.saveProjectOrder = function () {
  const projectList = document.getElementById("projectList");
  if (!projectList) return;

  const projectItems = projectList.querySelectorAll(".project-item");
  const projectOrder = Array.from(projectItems)
    .map((item) => {
      return item.getAttribute("data-project-id");
    })
    .filter((id) => id);

  if (projectOrder.length > 0) {
    localStorage.setItem("projectOrder", JSON.stringify(projectOrder));
    console.log("✅ 프로젝트 순서 저장 완료:", projectOrder.length, "개");

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator("✅ 프로젝트 순서가 저장되었습니다!");
    }
  }
};

// 프로젝트 순서 복원
window.restoreProjectOrder = function (projects) {
  const savedOrder = localStorage.getItem("projectOrder");
  if (!savedOrder) return projects;

  try {
    const order = JSON.parse(savedOrder);
    const orderedProjects = [];

    // 기존 저장 순서대로 배치
    order.forEach((id) => {
      const project = projects.find((p) => p.id === id);
      if (project) orderedProjects.push(project);
    });

    // 순서에 없는 프로젝트 (타기기/타계정에서 가져온 신규 프로젝트)
    const unorderedProjects = projects.filter((p) => !order.includes(p.id));

    if (unorderedProjects.length === 0) return orderedProjects;

    // 신규 프로젝트를 savedAt 기준으로 기존 목록의 올바른 위치에 삽입
    const result = [...orderedProjects];
    unorderedProjects
      .slice()
      .sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0))
      .forEach((newP) => {
        const newDate = new Date(newP.savedAt || 0);
        const insertIdx = result.findIndex(
          (p) => new Date(p.savedAt || 0) < newDate
        );
        if (insertIdx === -1) {
          result.push(newP);
        } else {
          result.splice(insertIdx, 0, newP);
        }
      });

    return result;
  } catch (error) {
    console.error("프로젝트 순서 복원 오류:", error);
    return projects;
  }
};

// 프로젝트 삭제 함수
window.deleteProject = function (projectId) {
  if (!projectId) {
    window.showToast("프로젝트 ID가 없습니다.", "error");
    return;
  }

  // 프로젝트 정보 찾기 (삭제 확인 메시지에 제목 표시용)
  let projectTitle = "이 프로젝트";
  try {
    const keys = LEGACY_PROJECT_STORAGE_KEYS;
    for (const key of keys) {
      try {
        const data = localStorage.getItem(key);
        if (!data) continue;

        if (data.trim().startsWith("[")) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            const found = parsed.find((p) => p.id === projectId);
            if (found && found.title) {
              projectTitle = `"${found.title}"`;
              break;
            }
          }
        } else if (data.trim().startsWith("{")) {
          const parsed = JSON.parse(data);
          if (parsed && parsed.id === projectId && parsed.title) {
            projectTitle = `"${parsed.title}"`;
            break;
          }
        }
      } catch (e) {
        // 무시
      }
    }
  } catch (e) {
    // 무시
  }

  // ⚠️ setTimeout으로 확인 대화상자를 다음 이벤트 루프로 지연
  // 크롬에서 draggable 요소 안의 버튼 클릭 시 mousedown→confirm→mouseup 순서로
  // 진행되면 mouseup이 확인창 위에서 발생하는 문제를 우회하기 위한 안전장치.
  // (showConfirmAsync는 네이티브 모달이 아니라 이 정확한 버그에는 영향받지
  //  않지만, 지연 자체는 드래그 종료를 확실히 마친 뒤 열리도록 유지한다.)
  setTimeout(async () => {
    const confirmDelete = await window.showConfirmAsync(
      `${projectTitle} 프로젝트를 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`,
    );
    if (!confirmDelete) {
      return;
    }

  try {
    let deleted = false;
    const keys = LEGACY_PROJECT_STORAGE_KEYS;

    // 모든 localStorage 키에서 프로젝트 검색 및 삭제
    keys.forEach((key) => {
      try {
        const data = localStorage.getItem(key);
        if (!data) return;

        // JSON 배열인지 확인
        if (data.trim().startsWith("[")) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((p) => p.id !== projectId);
            if (filtered.length !== parsed.length) {
              localStorage.setItem(key, JSON.stringify(filtered));
              deleted = true;
              console.log(`✅ ${key}에서 프로젝트 삭제됨`);
            }
          }
        }
        // 단일 프로젝트 객체인지 확인
        else if (data.trim().startsWith("{")) {
          const parsed = JSON.parse(data);
          if (parsed && parsed.id === projectId) {
            localStorage.removeItem(key);
            deleted = true;
            console.log(`✅ ${key}에서 프로젝트 삭제됨`);
          }
        }
      } catch (e) {
        console.warn(`${key} 처리 중 오류:`, e);
      }
    });

    // 모든 localStorage 키를 확인하여 프로젝트 검색 및 삭제 (다른 키에도 있을 수 있음)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || keys.includes(key)) continue;

      try {
        const data = localStorage.getItem(key);
        if (!data) continue;

        if (data.trim().startsWith("[")) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const firstItem = parsed[0];
            if (firstItem && typeof firstItem === "object" && firstItem.id) {
              const filtered = parsed.filter((p) => p.id !== projectId);
              if (filtered.length !== parsed.length) {
                localStorage.setItem(key, JSON.stringify(filtered));
                deleted = true;
                console.log(`✅ ${key}에서 프로젝트 삭제됨`);
              }
            }
          }
        } else if (data.trim().startsWith("{")) {
          const parsed = JSON.parse(data);
          if (parsed && parsed.id === projectId) {
            localStorage.removeItem(key);
            deleted = true;
            console.log(`✅ ${key}에서 프로젝트 삭제됨`);
          }
        }
      } catch (e) {
        // 무시
      }
    }

    // 프로젝트 순서에서도 제거
    const savedOrder = localStorage.getItem("projectOrder");
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        const filteredOrder = order.filter((id) => id !== projectId);
        if (filteredOrder.length !== order.length) {
          localStorage.setItem("projectOrder", JSON.stringify(filteredOrder));
          console.log("✅ 프로젝트 순서에서 제거됨");
        }
      } catch (e) {
        console.warn("프로젝트 순서 업데이트 오류:", e);
      }
    }

    if (deleted) {
      window.showToast("✅ 프로젝트가 삭제되었습니다.", "success");

      // 프로젝트 목록 새로고침
      if (typeof window.loadProjectList === "function") {
        window.loadProjectList();
      }

      // 현재 프로젝트가 삭제된 프로젝트인 경우 초기화
      if (window.currentProjectId === projectId) {
        window.currentProjectId = null;
        window.currentProject = null;
      }
    } else {
      window.showToast("⚠️ 삭제할 프로젝트를 찾을 수 없습니다.", "error");
    }
  } catch (error) {
    console.error("프로젝트 삭제 오류:", error);
    window.showToast("프로젝트 삭제 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
  }, 0); // setTimeout 종료 — 크롬 draggable+confirm 버그 우회
};

// ═══════════════════════════════════════════════════════════════
// 프로젝트 내보내기/가져오기 함수들
// ═══════════════════════════════════════════════════════════════
window.exportAllProjects = function () {
  try {
    // localStorage에서 모든 프로젝트 수집
    let allProjects = [];
    const keys = LEGACY_PROJECT_STORAGE_KEYS;

    keys.forEach((key) => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            allProjects = allProjects.concat(parsed);
          }
        }
      } catch (e) {
        console.warn(`${key} 읽기 실패:`, e);
      }
    });

    // 중복 제거
    const projectMap = new Map();
    allProjects.forEach((project) => {
      if (project && project.id) {
        const existing = projectMap.get(project.id);
        if (!existing) {
          projectMap.set(project.id, project);
        } else {
          const existingDate = new Date(
            existing.savedAt || existing.createdAt || 0,
          );
          const newDate = new Date(project.savedAt || project.createdAt || 0);
          if (newDate > existingDate) {
            projectMap.set(project.id, project);
          }
        }
      }
    });

    const uniqueProjects = Array.from(projectMap.values());

    if (uniqueProjects.length === 0) {
      window.showToast("내보낼 프로젝트가 없습니다.", "error");
      return;
    }

    // JSON 파일로 다운로드
    const json = JSON.stringify(uniqueProjects, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `music-creator-projects-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.showToast(`✅ ${uniqueProjects.length}개 프로젝트가 내보내기되었습니다.`, "success");
  } catch (error) {
    console.error("프로젝트 내보내기 오류:", error);
    window.showToast("프로젝트 내보내기 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
};



window.handleImport = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const importData = JSON.parse(e.target.result);
      console.log("✅ 가져오기 파일 읽기 완료:", file.name);

      // 프로젝트 배열 추출
      let projects = [];
      let isFullBackup = false;

      // 전체 프로그램 백업 형식 처리
      if (importData.backupVersion && importData.projects) {
        isFullBackup = true;
        const projectKeys = LEGACY_PROJECT_STORAGE_KEYS;
        projectKeys.forEach(key => {
          if (importData.projects[key] && Array.isArray(importData.projects[key])) {
            projects = projects.concat(importData.projects[key]);
          }
        });
        
        // 설정 데이터 복원 — 허용 목록에 있는 키만 복원한다.
        // (API 키, firebase:* 세션 키 등 임의 키 덮어쓰기는 세션 탈취/키 유출 벡터)
        const IMPORT_SETTING_ALLOWLIST = [
          "mvSettings",
          "musicCreatorGuidelines",
          "selectedAPI",
          "stepOrder",
          "sidebarPosition",
          "sidebarSize",
          "projectOrder",
        ];
        if (importData.settings) {
          Object.keys(importData.settings).forEach(k => {
            if (!IMPORT_SETTING_ALLOWLIST.includes(k)) return;
            const v = importData.settings[k];
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          });
        }
        // importData.other는 복원하지 않는다 (임의 localStorage 키 주입 차단)
      } 
      // 기존 백업 형식 처리
      else if (Array.isArray(importData)) {
        projects = importData;
      } else if (importData.projects && Array.isArray(importData.projects)) {
        projects = importData.projects;
      } else if (
        importData.musicCreatorProjects &&
        Array.isArray(importData.musicCreatorProjects)
      ) {
        projects = importData.musicCreatorProjects;
      } else {
        window.showToast("유효하지 않은 가져오기 파일 형식입니다.", "info");
        return;
      }

      if (projects.length === 0) {
        window.showToast("가져올 프로젝트가 없습니다.", "error");
        return;
      }

      // 가져오기 확인
      if (
        !(await window.showConfirmAsync(
          `가져오기 파일에서 ${projects.length}개의 프로젝트를 찾았습니다.\n\n가져오시겠습니까?\n\n주의: 기존 프로젝트와 ID가 같으면 덮어씌워집니다.`,
        ))
      ) {
        return;
      }

      // localStorage에 프로젝트 저장
      let importedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      projects.forEach((project) => {
        try {
          if (!project.id) {
            console.warn("프로젝트 ID가 없어 건너뜁니다:", project);
            errorCount++;
            return;
          }

          const now = new Date().toISOString();
          if (!project.savedAt) {
            project.savedAt = now;
          }
          if (!project.updatedAt) {
            project.updatedAt = now;
          }

          const existingKeys = LEGACY_PROJECT_STORAGE_KEYS;

          let isUpdate = false;
          for (const key of existingKeys) {
            try {
              const existingData = localStorage.getItem(key);
              if (existingData) {
                const existingProjects = JSON.parse(existingData);
                if (Array.isArray(existingProjects)) {
                  const existingIndex = existingProjects.findIndex(
                    (p) => p.id === project.id,
                  );
                  if (existingIndex !== -1) {
                    existingProjects[existingIndex] = project;
                    localStorage.setItem(key, JSON.stringify(existingProjects));
                    isUpdate = true;
                    updatedCount++;
                    break;
                  }
                }
              }
            } catch (err) {
              continue;
            }
          }

          if (!isUpdate) {
            // 기존 프로젝트 목록은 최대한 보존한 채로 새 프로젝트를 추가한다.
            // (이전에는 localStorage.setItem이 실패하면 - 실무에서는 거의
            // 항상 용량 초과(QuotaExceededError) - catch 블록이
            // localStorage.setItem("musicCreatorProjects", JSON.stringify([project]))로
            // 전체 배열을 방금 가져온 프로젝트 1개로 덮어써, 용량이 빠듯한
            // 상태에서 여러 프로젝트를 복원하면 기존 로컬 프로젝트 전체가
            // 조용히 사라지는 데이터 손실 버그가 있었다. 대신 이미 검증된
            // 용량 보호 저장 함수(js/storage.js)로 압축·폴백 저장을 시도하고,
            // 그래도 실패하면 기존 데이터는 그대로 둔 채 이 프로젝트만
            // 오류로 집계한다.)
            let existingProjects = [];
            try {
              const existingData = localStorage.getItem("musicCreatorProjects");
              const parsed = existingData ? JSON.parse(existingData) : [];
              if (Array.isArray(parsed)) existingProjects = parsed;
            } catch (err) {
              console.error("기존 프로젝트 목록 파싱 실패, 빈 목록으로 시작합니다:", err);
            }

            existingProjects.push(project);

            let saveOk = false;
            if (typeof window.saveProjectListToLocalStorage === "function") {
              const result = window.saveProjectListToLocalStorage(
                "musicCreatorProjects",
                existingProjects,
                null,
              );
              saveOk = !!result?.ok;
            } else {
              try {
                localStorage.setItem(
                  "musicCreatorProjects",
                  JSON.stringify(existingProjects),
                );
                saveOk = true;
              } catch (err) {
                saveOk = false;
              }
            }

            if (saveOk) {
              importedCount++;
            } else {
              errorCount++;
              console.error(
                "프로젝트 저장 실패(저장 공간 부족 등) - 기존 프로젝트는 보존됩니다:",
                project.id,
              );
            }
          }
        } catch (err) {
          console.error("프로젝트 가져오기 오류:", project.id, err);
          errorCount++;
        }
      });

      // 결과 메시지
      let resultMessage = `✅ 가져오기 완료!\n\n`;
      resultMessage += `• 새로 가져온 프로젝트: ${importedCount}개\n`;
      resultMessage += `• 업데이트된 프로젝트: ${updatedCount}개\n`;
      if (errorCount > 0) {
        resultMessage += `• 오류 발생: ${errorCount}개\n`;
      }
      resultMessage += `\n페이지를 새로고침하여 프로젝트 목록을 확인하세요.`;

      window.showToast(resultMessage, "info");

      // 프로젝트 목록 새로고침
      if (typeof window.loadProjectList === "function") {
        window.loadProjectList();
      }

      // 파일 입력 초기화
      event.target.value = "";
    } catch (error) {
      console.error("가져오기 오류:", error);
      window.showToast(
        "프로젝트 가져오기 중 오류가 발생했습니다:\n\n" +
          error.message +
          "\n\n파일 형식을 확인해주세요.", "error");
    }
  };

  reader.onerror = function () {
    window.showToast("파일을 읽는 중 오류가 발생했습니다.", "error");
  };

  reader.readAsText(file);
};

window.manualBackup = function () {
  // exportAllProjects와 동일하게 작동
  window.exportAllProjects();
};

// 전체 프로그램 백업 (프로젝트 데이터 + 설정)
window.backupFullProgram = function () {
  try {
    console.log("💾 전체 프로그램 백업 시작...");

    // 모든 localStorage 데이터 수집
    const allData = {
      backupDate: new Date().toISOString(),
      backupVersion: "1.0",
      projects: {},
      settings: {},
      other: {},
    };

    // 프로젝트 데이터 수집
    const projectKeys = LEGACY_PROJECT_STORAGE_KEYS;
    projectKeys.forEach((key) => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          allData.projects[key] = JSON.parse(data);
        }
      } catch (e) {
        console.warn(`${key} 백업 중 오류:`, e);
      }
    });

    // 설정 데이터 수집 (API 키는 백업 파일에 절대 포함하지 않는다)
    const settingKeys = [
      "mvSettings",
      "musicCreatorGuidelines",
      "selectedAPI",
      "stepOrder",
      "sidebarPosition",
      "sidebarSize",
      "projectOrder",
    ];
    settingKeys.forEach((key) => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          allData.settings[key] = data;
        }
      } catch (e) {
        console.warn(`${key} 백업 중 오류:`, e);
      }
    });

    // 기타 localStorage 데이터 수집
    // 민감 키(세션 토큰, API 키)는 백업 파일에 포함하지 않는다.
    const EXPORT_DENYLIST = /^(firebase:|openai_api_key$|gemini_api_key$)/;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 이미 수집한 키·민감 키는 제외
      if (projectKeys.includes(key) || settingKeys.includes(key)) continue;
      if (EXPORT_DENYLIST.test(key)) continue;

      try {
        const data = localStorage.getItem(key);
        if (data) {
          // JSON인지 확인
          try {
            allData.other[key] = JSON.parse(data);
          } catch {
            allData.other[key] = data;
          }
        }
      } catch (e) {
        console.warn(`${key} 백업 중 오류:`, e);
      }
    }

    // 백업 파일 생성
    const backupJson = JSON.stringify(allData, null, 2);
    const blob = new Blob([backupJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `music-creator-full-backup-${timestamp}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("✅ 전체 프로그램 백업 완료:", filename);

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ 전체 프로그램 백업 완료!\n\n파일명: ${filename}`,
      );
    } else {
      window.showToast(
        `✅ 전체 프로그램 백업이 완료되었습니다!\n\n파일명: ${filename}\n\n이 파일에는 모든 프로젝트 데이터와 설정이 포함되어 있습니다.`, "success");
    }
  } catch (error) {
    console.error("❌ 전체 프로그램 백업 오류:", error);
    window.showToast("전체 프로그램 백업 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
};


// ═══════════════════════════════════════════════════════════════
// 단계 초기화 함수들
// ═══════════════════════════════════════════════════════════════
window.resetCurrentStep = async function () {
  if (
    !(await window.showConfirmAsync(
      "현재 단계의 모든 데이터를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.",
    ))
  ) {
    return;
  }

  try {
    const activeStep = document.querySelector(".step.active");
    if (!activeStep) return;

    const stepNumber = activeStep.getAttribute("data-step");
    if (!stepNumber) return;

    const step = parseInt(stepNumber);

    // 단계별 필드 초기화
    switch (step) {
      case 1:
        // 가사 작성 단계 초기화
        document.getElementById("songTitle")?.value &&
          (document.getElementById("songTitle").value = "");
        document.getElementById("genres")?.value &&
          (document.getElementById("genres").value = "");
        document.getElementById("mood")?.value &&
          (document.getElementById("mood").value = "");
        document.getElementById("theme")?.value &&
          (document.getElementById("theme").value = "");
        document.getElementById("lyrics")?.value &&
          (document.getElementById("lyrics").value = "");
        break;
      case 2:
        // 수노 변환 단계 초기화
        document.getElementById("sunoLyrics")?.value &&
          (document.getElementById("sunoLyrics").value = "");
        document.getElementById("stylePrompt")?.value &&
          (document.getElementById("stylePrompt").value = "");
        break;
      case 3:
        // AI 분석 단계 초기화
        const analysisResult = document.getElementById("analysisResult");
        if (analysisResult) {
          analysisResult.style.display = "none";
          analysisResult.innerHTML = "";
        }
        break;
      case 4:
        // 개선안 단계 초기화
        document.getElementById("finalizedLyrics")?.value &&
          (document.getElementById("finalizedLyrics").value = "");
        document.getElementById("finalizedStylePrompt")?.value &&
          (document.getElementById("finalizedStylePrompt").value = "");
        break;
      case 5:
        // 최종 출력 단계 초기화
        document.getElementById("finalLyrics")?.textContent &&
          (document.getElementById("finalLyrics").textContent = "");
        break;
      case 6:
        // 마케팅 단계 초기화
        document.getElementById("youtubeDescription")?.value &&
          (document.getElementById("youtubeDescription").value = "");
        document.getElementById("instagramPost")?.value &&
          (document.getElementById("instagramPost").value = "");
        document.getElementById("twitterPost")?.value &&
          (document.getElementById("twitterPost").value = "");
        break;
    }

    // 프로젝트 저장 (빈 상태로)
    if (typeof window.saveCurrentProject === "function") {
      window.saveCurrentProject();
    }

    window.showToast("✅ 현재 단계가 초기화되었습니다.", "success");
  } catch (error) {
    console.error("단계 초기화 오류:", error);
    window.showToast("단계 초기화 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
};

window.resetAllSteps = async function (skipConfirm = false) {
  if (!skipConfirm) {
    if (
      !(await window.showConfirmAsync(
        "모든 단계의 데이터를 초기화하고 처음부터 다시 시작하시겠습니까?\n\n⚠️ 경고: 현재 작성 중인 모든 내용이 삭제됩니다.",
      ))
    ) {
      return;
    }
  }

  try {
    console.log("🧹 앱 전체 초기화 시작...");

    // 1. 전역 상태 초기화
    window.currentProject = null;
    window.currentProjectId = null;
    window.currentScenes = [];
    window.currentCharacters = [];
    window.vocalPartAssignments = {};
    if (window.vocalPartHistory) window.vocalPartHistory = [];

    // 2. 모든 입력 필드 초기화 (텍스트, 체크박스, 셀렉트)
    const allInputs = document.querySelectorAll("input, textarea, select");
    allInputs.forEach((input) => {
      // API 키나 지침서는 초기화에서 제외
      const skipIds = ["openaiApiKey", "geminiApiKey", "musicCreatorGuidelines", "importFile"];
      if (skipIds.includes(input.id)) return;

      if (input.type === "checkbox" || input.type === "radio") {
        input.checked = false;
      } else if (input.type === "range") {
        input.value = input.defaultValue || 50;
      } else {
        input.value = "";
      }
    });

    // 3. 태그 버튼 초기화 (.tag-btn의 active 클래스 제거)
    const allTagButtons = document.querySelectorAll(".tag-btn, .genre-tag, .mood-tag, .era-tag, .theme-tag");
    allTagButtons.forEach((btn) => btn.classList.remove("active"));

    // 4. 결과 영역 및 컨테이너 초기화
    const containersToClear = [
      "aiLyricsOptions",          // 1단계 AI 가사 후보
      "analysisResult",           // 3단계 분석 결과
      "geminiAnalysisResult",     // 3단계 상세 분석
      "improvementResults",       // 4단계 개선안 리스트
      "thumbnailsGrid",           // 6단계 썸네일
      "mvSceneOverviewContainer", // 6단계 MV 씬 그리드
      "mvPromptsContainer",       // 6단계 MV 상세 프롬프트
    ];
    containersToClear.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });

    // 5. 점수 및 상태 텍스트 초기화
    const elementsToResetText = [
      "beforeScore", "afterScore", "aiComment", "gradeText",
      "finalLyrics", "finalStyle", "finalTitleText", "songTitleText"
    ];
    elementsToResetText.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = id.includes("Score") ? "-" : (id.includes("Title") ? "제목 없음" : "");
    });

    // 6. 가시성 초기화 (결과 카드들 숨기기)
    const panelsToHide = ["analysisLoading", "analysisResult", "improvementCard", "marketingResult"];
    panelsToHide.forEach((id) => {
       const el = document.getElementById(id);
       if (el) el.style.display = "none";
    });

    // 7. 6단계 전용 UI 필드 보정
    if (typeof window.updateMVImageCount === "function") window.updateMVImageCount();
    if (typeof window.updateCharacterInputs === "function") window.updateCharacterInputs();

    // 8. 로컬 스토리지 관련 상태 정리 (현재 프로젝트 ID 등)
    localStorage.removeItem("currentProjectId");

    // 9. 1단계로 이동 및 화면 상단 스크롤
    if (typeof window.goToStep === "function") {
      window.goToStep(1, false, true);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });

    // 10. 수정 모드 보정
    window.editMode = false;
    if (typeof window.updateEditModeUI === "function") window.updateEditModeUI();
    if (typeof window.setReadOnlyMode === "function") window.setReadOnlyMode(false);

    console.log("✅ 앱 전체 초기화 완료!");
    if (!skipConfirm) window.showToast("✅ 모든 내용이 초기화되었습니다. 새로 시작합니다!", "success");

  } catch (error) {
    console.error("전체 초기화 중 오류 발생:", error);
    window.showToast("초기화 중 일부 오류가 발생했습니다. 페이지를 새로고침하는 것을 권장합니다.", "error");
  }
};

window.testAPIConnection = async function () {
  try {
    const gc = window.globalConfig || {};
    
    // 💡 [FIX] 모달 창에 사용자가 방금 입력한 값이 있다면, 저장(localStorage)된 값보다 우선해서 테스트합니다.
    const openaiInput = document.getElementById("openaiKeyInput");
    const geminiInput = document.getElementById("geminiKeyInput");
    
    // .offsetParent !== null 은 모달이 화면에 표시되어 있는 상태인지 확인하는 용도입니다.
    const inputOpenAIVal = (openaiInput && openaiInput.offsetParent !== null) ? openaiInput.value.trim() : "";
    const inputGeminiVal = (geminiInput && geminiInput.offsetParent !== null) ? geminiInput.value.trim() : "";

    const openaiKey =
      inputOpenAIVal || (typeof window.getOpenAIApiKey === "function" ? window.getOpenAIApiKey() : localStorage.getItem("openai_api_key")) || gc.openai_api_key || "";
    const geminiKey =
      inputGeminiVal || (typeof window.getGeminiApiKey === "function" ? window.getGeminiApiKey() : localStorage.getItem("gemini_api_key")) || gc.gemini_api_key || "";

    if (!openaiKey && !geminiKey) {
      window.showToast(
        '⚠️ API 키가 설정되지 않았습니다.\n\n설정 > "API 관리" 에서 키를 입력해주세요.', "error");
      if (typeof window.openAPISettings === "function") {
        window.openAPISettings();
      }
      return;
    }

    // 진행 중 알림
    const resultDiv = document.getElementById("apiTestResult");
    if (resultDiv) {
      resultDiv.style.display = "block";
      resultDiv.style.color = "var(--text-secondary)";
      resultDiv.textContent = "🔄 연결 테스트 중...";
    }

    let results = [];
    let allSuccess = true;

    // OpenAI 서버 프록시 테스트
    if (openaiKey) {
      try {
        await window.testServerAIProxy("openai", openaiKey);
        results.push("✅ ChatGPT API: 연결 성공");
      } catch (error) {
        results.push(`❌ ChatGPT API: 오류 발생 - ${error.message}`);
        allSuccess = false;
      }
    } else {
      results.push("⚠️ ChatGPT API: 키가 설정되지 않음");
    }

    // Gemini 서버 프록시 테스트
    if (geminiKey) {
      try {
        await window.testServerAIProxy("gemini", geminiKey);
        results.push("✅ Gemini API: 연결 성공");
      } catch (error) {
        results.push(`❌ Gemini API: 오류 발생 - ${error.message}`);
        allSuccess = false;
      }
    } else {
      results.push("⚠️ Gemini API: 키가 설정되지 않음");
    }

    // 결과를 모달 내 div에 표시
    if (resultDiv) {
      resultDiv.style.color = allSuccess
        ? "var(--success, #22c55e)"
        : "var(--warning, #f59e0b)";
      // ChatGPT / Gemini 결과를 2줄로 분리 표시
      resultDiv.innerHTML =
        results.map((r) => `<span>${r}</span>`).join("<br>") +
        `<br><span style="color:${allSuccess ? "var(--success, #22c55e)" : "var(--error, #ef4444)"};font-weight:600;">${allSuccess ? "✅ 모두 정상!" : "⚠️ 일부 오류 있음"}</span>`;
    }

    // 결과 알림 팝업
    const message = `🔌 API 연결 테스트 결과\n\n${results.join("\n")}\n\n${allSuccess ? "✅ 모든 API가 정상적으로 연결되었습니다." : "⚠️ 일부 API 연결에 문제가 있습니다."}`;
    window.showToast(message, "info");
  } catch (error) {
    console.error("API 테스트 오류:", error);
    window.showToast("API 테스트 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
};

// ═══════════════════════════════════════════════════════════════
// API 설정 모달 함수들
// ═══════════════════════════════════════════════════════════════
window.openAPISettings = function () {
  try {
    // 🔐 권한 확인: 승인된 사용자만 접근 가능 (관리자 전용 제한 해제)
    const userData =
      typeof window.getCurrentUserData === "function"
        ? window.getCurrentUserData()
        : null;
    if (!userData || !userData.approved) {
      window.showToast("⚠️ 승인된 사용자만 API 설정에 접근할 수 있습니다.", "error");
      return;
    }

    console.log("🔑 openAPISettings 함수 호출됨");
    const modal = document.getElementById("apiSettingsModal");
    if (!modal) {
      console.error("❌ apiSettingsModal 요소를 찾을 수 없습니다.");
      window.showToast("API 설정 모달을 찾을 수 없습니다.", "error");
      return;
    }

    console.log("✅ apiSettingsModal 요소 발견:", modal);

    // 저장된 API 키 로드
    const openaiKey = (typeof window.getOpenAIApiKey === "function" ? window.getOpenAIApiKey() : localStorage.getItem("openai_api_key")) || "";
    const geminiKey = (typeof window.getGeminiApiKey === "function" ? window.getGeminiApiKey() : localStorage.getItem("gemini_api_key")) || "";

    const openaiInput = document.getElementById("openaiKeyInput");
    const geminiInput = document.getElementById("geminiKeyInput");

    // 공용 키 상태 표시 업데이트
    const gc = window.globalConfig || {};
    const openaiSharedBadge = document.getElementById("openaiSharedBadge");
    const geminiSharedBadge = document.getElementById("geminiSharedBadge");

    if (openaiSharedBadge) {
      if (gc.openai_api_key && gc.openai_api_key.startsWith("sk-")) {
        openaiSharedBadge.classList.remove("d-none");
      } else {
        openaiSharedBadge.classList.add("d-none");
      }
    }
    if (geminiSharedBadge) {
      if (gc.gemini_api_key && gc.gemini_api_key.startsWith("AIza")) {
        geminiSharedBadge.classList.remove("d-none");
      } else {
        geminiSharedBadge.classList.add("d-none");
      }
    }

    if (openaiInput) {
      // 일반 사용자는 마스킹 및 수정 금지 처리
      if (userData && userData.role !== "admin") {
        openaiInput.value = "**************************************************";
        openaiInput.readOnly = true;
        openaiInput.placeholder = "공용 키가 안전하게 보호되고 있습니다.";
      } else {
        openaiInput.value = localStorage.getItem("openai_api_key") || "";
        openaiInput.readOnly = false;
        if (gc.openai_api_key && gc.openai_api_key.startsWith("sk-")) {
          openaiInput.placeholder = "공용 키 사용 중 (개인 키를 입력하면 우선 적용됩니다)";
        } else {
          openaiInput.placeholder = "sk-...";
        }
      }
      if (openaiInput.value && typeof window.validateOpenAIKey === "function") {
        window.validateOpenAIKey(openaiInput);
      }
    }
    if (geminiInput) {
      if (userData && userData.role !== "admin") {
        geminiInput.value = "**************************************************";
        geminiInput.readOnly = true;
        geminiInput.placeholder = "공용 키가 안전하게 보호되고 있습니다.";
      } else {
        geminiInput.value = localStorage.getItem("gemini_api_key") || "";
        geminiInput.readOnly = false;
        if (gc.gemini_api_key && gc.gemini_api_key.startsWith("AIza")) {
          geminiInput.placeholder = "공용 키 사용 중 (개인 키를 입력하면 우선 적용됩니다)";
        } else {
          geminiInput.placeholder = "AIza...";
        }
      }
      if (geminiInput.value && typeof window.validateGeminiKey === "function") {
        window.validateGeminiKey(geminiInput);
      }
    }

    // 일반 사용자의 경우 저장/초기화 버튼 비활성화
    const saveBtn = document.querySelector("#apiSettingsModal .modal-footer .btn-primary");
    const resetBtn = document.querySelector("#apiSettingsModal .modal-body .btn-secondary") || document.getElementById("resetAPIKeysBtn");
    if (userData && userData.role !== "admin") {
      if (saveBtn) saveBtn.style.display = "none";
      if (resetBtn) resetBtn.style.display = "none";
    } else {
      if (saveBtn) saveBtn.style.display = "inline-block";
      if (resetBtn) resetBtn.style.display = "inline-block";
    }

    // 모달 강제 표시 (CSS !important 우회)
    modal.classList.add("show");
    modal.classList.remove("hidden");

    // 인라인 스타일로 강제 표시 (항상 최상단, 불투명 배경으로 뒤 화면 비침 방지)
    modal.setAttribute(
      "style",
      "display: flex !important; visibility: visible !important; opacity: 1 !important; z-index: 2147483647 !important; pointer-events: auto !important; position: fixed !important; inset: 0 !important; align-items: center !important; justify-content: center !important; background: rgba(0,0,0,0.82) !important;",
    );
    var innerModal = modal.querySelector(".modal");
    if (innerModal) {
      var bg =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--bg-card")
          .trim() || "#ffffff";
      if (document.body.classList.contains("theme-dark"))
        bg =
          getComputedStyle(document.documentElement)
            .getPropertyValue("--bg-card")
            .trim() || "#0f3460";
      innerModal.style.setProperty("background", bg, "important");
    }
    // body 스크롤 방지
    document.body.style.overflow = "hidden";

    console.log("✅ API 설정 모달 표시 완료");
    console.log("모달 클래스:", modal.className);
    console.log("모달 computed style:", window.getComputedStyle(modal).display);
  } catch (error) {
    console.error("❌ API 설정 모달 열기 오류:", error);
    window.showToast("API 설정 모달을 열 수 없습니다:\n\n" + error.message, "error");
  }
};

window.closeAPISettings = function () {
  try {
    const modal = document.getElementById("apiSettingsModal");
    if (modal) {
      modal.classList.remove("show");
      modal.setAttribute(
        "style",
        "display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important;",
      );
      document.body.style.overflow = "";
      console.log("✅ API 설정 모달 닫기 완료");
    }
  } catch (error) {
    console.error("❌ API 설정 모달 닫기 오류:", error);
  }
};

// API 키 저장 함수 (모달 내부 버튼에서 호출)


window.saveAPIKeys = function () {
  try {
    const userData = typeof window.getCurrentUserData === "function" ? window.getCurrentUserData() : null;
    if (userData && userData.role !== "admin") {
      window.showToast("⚠️ 일반 사용자는 API 키를 직접 수정하거나 저장할 수 없습니다.", "error");
      window.closeAPISettings();
      return;
    }

    // index.html에서 사용하는 ID 확인
    const openaiInput = document.getElementById("openaiKeyInput");
    const geminiInput = document.getElementById("geminiKeyInput");

    if (!openaiInput && !geminiInput) {
      window.showToast("API 키 입력 필드를 찾을 수 없습니다.", "error");
      return;
    }

    const openaiKey = openaiInput ? openaiInput.value.trim() : "";
    const geminiKey = geminiInput ? geminiInput.value.trim() : "";

    // API 키 저장
    if (openaiKey) {
      localStorage.setItem("openai_api_key", openaiKey);
    } else {
      localStorage.removeItem("openai_api_key");
    }

    if (geminiKey) {
      localStorage.setItem("gemini_api_key", geminiKey);
    } else {
      localStorage.removeItem("gemini_api_key");
    }

    // 🔒 [FIX] API 키를 새로 저장할 때, 임시 비활성화 락을 강제로 해제합니다.
    try {
      sessionStorage.removeItem("geminiDisabledUntil");
      sessionStorage.removeItem("geminiDisabledReason");
      sessionStorage.removeItem("openaiDisabledUntil");
      sessionStorage.removeItem("openaiDisabledReason");
      window.__geminiDisabledUntil = 0;
      window.__geminiDisabledReason = "";
    } catch (_) {}

    // API_CONFIG 업데이트 (전역 객체가 있는 경우)
    if (typeof API_CONFIG !== "undefined") {
      if (API_CONFIG.openai) {
        API_CONFIG.openai.key = openaiKey;
      }
      if (API_CONFIG.gemini) {
        API_CONFIG.gemini.key = geminiKey;
      }
    }

    window.showToast("✅ API 키가 저장되었습니다.", "success");
    window.closeAPISettings();
  } catch (error) {
    console.error("API 키 저장 오류:", error);
    window.showToast("API 키 저장 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
};

window.resetAPIKeys = async function () {
  const userData = typeof window.getCurrentUserData === "function" ? window.getCurrentUserData() : null;
  if (userData && userData.role !== "admin") {
    window.showToast("⚠️ 일반 사용자는 API 키를 초기화할 수 없습니다.", "error");
    return;
  }

  if (
    !(await window.showConfirmAsync("API 키를 초기화하시겠습니까?\n\n저장된 모든 API 키가 삭제됩니다."))
  ) {
    return;
  }

  try {
    const openaiInput = document.getElementById("openaiKeyInput");
    const geminiInput = document.getElementById("geminiKeyInput");

    if (openaiInput) {
      openaiInput.value = "";
    }
    if (geminiInput) {
      geminiInput.value = "";
    }

    localStorage.removeItem("openai_api_key");
    localStorage.removeItem("gemini_api_key");

    // API_CONFIG 업데이트
    if (typeof API_CONFIG !== "undefined") {
      if (API_CONFIG.openai) {
        API_CONFIG.openai.key = "";
      }
      if (API_CONFIG.gemini) {
        API_CONFIG.gemini.key = "";
      }
    }

    window.showToast("✅ API 키가 초기화되었습니다.", "success");
  } catch (error) {
    console.error("API 키 초기화 오류:", error);
    window.showToast("API 키 초기화 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
};

window.validateGeminiKey = function (input) {
  const value = input.value.trim();
  const errorDiv = document.getElementById("geminiKeyError");
  const successDiv = document.getElementById("geminiKeySuccess");

  if (!errorDiv || !successDiv) return;

  if (!value) {
    errorDiv.style.display = "none";
    successDiv.style.display = "none";
    return;
  }

  // Gemini API 키 형식 검증 (AIzaSy로 시작)
  if (value.startsWith("AIzaSy") && value.length > 30) {
    errorDiv.style.display = "none";
    successDiv.style.display = "block";
  } else {
    errorDiv.style.display = "block";
    successDiv.style.display = "none";
    errorDiv.textContent =
      "⚠️ 올바른 형식의 Gemini API 키가 아닙니다. (AIzaSy... 형식)";
  }
};

window.validateOpenAIKey = function (input) {
  const value = input.value.trim();
  const errorDiv = document.getElementById("openaiKeyError");
  const successDiv = document.getElementById("openaiKeySuccess");

  if (!errorDiv || !successDiv) return;

  if (!value) {
    errorDiv.style.display = "none";
    successDiv.style.display = "none";
    return;
  }

  // OpenAI API 키 형식 검증 (sk-로 시작)
  if (value.startsWith("sk-") && value.length > 40) {
    errorDiv.style.display = "none";
    successDiv.style.display = "block";
  } else {
    errorDiv.style.display = "block";
    successDiv.style.display = "none";
    errorDiv.textContent =
      "⚠️ 올바른 형식의 OpenAI API 키가 아닙니다. (sk-... 형식)";
  }
};

// ═══════════════════════════════════════════════════════════════
// 지침서 모달 함수들
// ═══════════════════════════════════════════════════════════════
window.openGuidelinesModal = function () {
  try {
    console.log("📋 openGuidelinesModal 함수 호출됨");
    const modal = document.getElementById("guidelinesModal");
    if (!modal) {
      console.error("❌ guidelinesModal 요소를 찾을 수 없습니다.");
      window.showToast("지침서 모달을 찾을 수 없습니다.", "error");
      return;
    }

    console.log("✅ guidelinesModal 요소 발견:", modal);

    // 저장된 지침서 로드 (저장된 값 우선, 없을 때만 기본값)
    const guidelinesText = document.getElementById("guidelinesText");
    if (guidelinesText) {
      const savedGuidelines = (
        localStorage.getItem("musicCreatorGuidelines") ||
        localStorage.getItem("musicCreator_guidelines") ||
        ""
      ).trim();
      if (savedGuidelines.length > 0) {
        guidelinesText.value = savedGuidelines;
      } else {
        const defaultGuidelines = `# 뮤직모리 제작 지침서

## 기본 원칙
- 감정을 진솔하게 표현
- 리듬감 있는 가사 구성
- 일상적이면서도 특별한 순간을 담기

## 인물 및 시각 묘사 (MV 프롬프트용)
- 인물 생성 시 기형적인 배치를 지양하고, 손가락, 발가락, 손 모양, 발 모양, 팔, 다리 등 인체 구조를 매우 정밀하고 자연스럽게 묘사합니다.
- 해부학적으로 정확하고 완벽한 관절 및 신체 부위 표현을 지속적으로 유지합니다.

## 구조
- Verse (주제 전개)
- Chorus (메시지 강조)
- Bridge (감정 고조)

## 어조
- 자연스럽고 친근한 언어
- 비유와 은유 활용
- 듣는 이의 감정을 자극하는 표현`;
        guidelinesText.value = defaultGuidelines;
      }
    }

    // 모달 강제 표시 (CSS !important 우회)
    modal.classList.add("show");
    modal.classList.remove("hidden");

    // 인라인 스타일로 강제 표시 (CSS !important 우회를 위해 setAttribute 사용)
    modal.setAttribute(
      "style",
      "display: flex !important; visibility: visible !important; opacity: 1 !important; z-index: 10000 !important; pointer-events: auto !important;",
    );

    // body 스크롤 방지
    document.body.style.overflow = "hidden";

    console.log("✅ 지침서 모달 표시 완료");
    console.log("모달 클래스:", modal.className);
    console.log("모달 computed style:", window.getComputedStyle(modal).display);
  } catch (error) {
    console.error("❌ 지침서 모달 열기 오류:", error);
    window.showToast("지침서 모달을 열 수 없습니다:\n\n" + error.message, "error");
  }
};

window.closeGuidelinesModal = function () {
  try {
    const modal = document.getElementById("guidelinesModal");
    if (modal) {
      modal.classList.remove("show");
      modal.setAttribute(
        "style",
        "display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important;",
      );
      document.body.style.overflow = "";
      console.log("✅ 지침서 모달 닫기 완료");
    }
  } catch (error) {
    console.error("❌ 지침서 모달 닫기 오류:", error);
  }
};

window.saveGuidelines = async function () {
  try {
    const guidelinesText = document.getElementById("guidelinesText");
    if (!guidelinesText) {
      window.showToast("지침서 입력 필드를 찾을 수 없습니다.", "error");
      return;
    }

    const guidelines = guidelinesText.value.trim();
    localStorage.setItem("musicCreatorGuidelines", guidelines);
    localStorage.setItem("musicCreator_guidelines", guidelines);

    // 로그인된 사용자 정보가 있으면 Firestore에도 동기화 저장
    const user = window.firebaseAuth?.currentUser;
    if (user && window.firebaseDb) {
      const saveBtn = document.querySelector("#guidelinesModal .modal-footer .btn-primary");
      let originalText = "💾 저장";
      
      try {
        if (saveBtn) {
          originalText = saveBtn.innerHTML;
          saveBtn.disabled = true;
          saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';
        }

        await window.firebaseDb.collection("users").doc(user.uid).set({
          musicCreatorGuidelines: guidelines,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log("☁️ 지침서가 Firestore에 동기화 저장되었습니다.");
        
        // 메모리 상의 사용자 데이터도 최신화
        if (window.currentUserData) {
          window.currentUserData.musicCreatorGuidelines = guidelines;
        }
      } catch (err) {
        console.error("서버 지침서 저장 실패:", err);
        window.showToast("⚠️ 로컬에는 저장되었으나, 서버 동기화에 실패했습니다: " + err.message, "error");
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalText;
        }
      }
    }

    window.showToast("✅ 지침서가 저장되었습니다.", "success");
    if (typeof window.closeGuidelinesModal === "function") {
      window.closeGuidelinesModal();
    }
  } catch (error) {
    console.error("지침서 저장 오류:", error);
    window.showToast("지침서 저장 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
};

window.getGuidelinesBackupPayload = function () {
  const guidelinesText = document.getElementById("guidelinesText");
  const content = String(
    guidelinesText?.value ||
      localStorage.getItem("musicCreatorGuidelines") ||
      localStorage.getItem("musicCreator_guidelines") ||
      "",
  );
  return {
    type: "music-creator-guidelines-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    title: "뮤직모리 제작 지침서",
    content,
  };
};

window.applyGuidelinesBackupPayload = function (payload) {
  const content =
    typeof payload === "string"
      ? payload
      : payload?.content || payload?.guidelines || payload?.text || "";
  if (!String(content).trim()) {
    throw new Error("복원할 지침서 내용이 비어 있습니다.");
  }

  const guidelinesText = document.getElementById("guidelinesText");
  if (guidelinesText) {
    guidelinesText.value = content;
  }
  localStorage.setItem("musicCreatorGuidelines", content);
  localStorage.setItem("musicCreator_guidelines", content);
  return content;
};

window.saveGuidelinesBackupToServer = async function (payload) {
  const user = window.firebaseAuth?.currentUser;
  if (!user || !window.firebaseDb) {
    return { ok: false, reason: "로그인 후 서버 백업을 사용할 수 있습니다." };
  }

  const backupId = `guidelines_${Date.now()}`;
  const backup = {
    ...payload,
    id: backupId,
    userId: user.uid,
    savedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await window.firebaseDb
    .collection("users")
    .doc(user.uid)
    .set({
      guidelinesBackupLatest: backup,
    }, { merge: true });
  return { ok: true, id: backupId };
};

window.exportGuidelines = async function () {
  try {
    const payload = window.getGuidelinesBackupPayload();
    if (!payload.content.trim()) {
      window.showToast("백업할 지침서 내용이 없습니다.", "error");
      return;
    }

    localStorage.setItem("musicCreatorGuidelines", payload.content);
    localStorage.setItem("musicCreator_guidelines", payload.content);

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `music-creator-guidelines-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const serverResult = await window.saveGuidelinesBackupToServer(payload);
    if (serverResult.ok) {
      window.showToast("✅ 지침서를 로컬 파일과 서버에 백업했습니다.", "success");
    } else {
      window.showToast(`✅ 지침서를 로컬 파일로 백업했습니다.\n\n⚠️ 서버 백업: ${serverResult.reason}`, "error");
    }
  } catch (error) {
    console.error("지침서 백업 오류:", error);
    window.showToast("지침서 백업 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
};

window.triggerImportGuidelines = async function () {
  const mode = await window.showPromptAsync(
    "지침서 복원 방식을 선택하세요.\n\n1: 로컬 백업 파일 선택\n2: 서버 최신 백업 복원",
    "1",
  );
  if (mode === null) return;
  if (mode.trim() === "2") {
    window.restoreGuidelinesFromServer();
    return;
  }

  const input = document.getElementById("importGuidelinesFile");
  if (!input) {
    window.showToast("지침서 백업 파일 입력 요소를 찾을 수 없습니다.", "error");
    return;
  }
  input.value = "";
  input.click();
};

window.handleImportGuidelines = function (event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (loadEvent) {
    try {
      const text = String(loadEvent.target?.result || "");
      const payload = JSON.parse(text);
      window.applyGuidelinesBackupPayload(payload);
      window.showToast("✅ 로컬 백업 파일에서 지침서를 복원했습니다.", "success");
    } catch (error) {
      console.error("지침서 로컬 복원 오류:", error);
      window.showToast("지침서 복원 중 오류가 발생했습니다:\n\n" + error.message, "error");
    }
  };
  reader.readAsText(file, "utf-8");
};

window.restoreGuidelinesFromServer = async function () {
  try {
    const user = window.firebaseAuth?.currentUser;
    if (!user || !window.firebaseDb) {
      window.showToast("서버 백업을 복원하려면 먼저 로그인해야 합니다.", "info");
      return;
    }

    const doc = await window.firebaseDb
      .collection("users")
      .doc(user.uid)
      .get();
    const backup = doc.data()?.guidelinesBackupLatest;

    if (!backup?.content) {
      window.showToast("서버에 저장된 지침서 백업이 없습니다.", "error");
      return;
    }

    window.applyGuidelinesBackupPayload(backup);
    window.showToast(`✅ 서버 백업에서 지침서를 복원했습니다.\n\n백업 시각: ${backup.savedAt || "알 수 없음"}`, "success");
  } catch (error) {
    console.error("지침서 서버 복원 오류:", error);
    window.showToast("서버 지침서 복원 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
};

window.resetGuidelines = async function () {
  if (
    !(await window.showConfirmAsync(
      "지침서를 기본값으로 복원하시겠습니까?\n\n현재 작성 중인 내용이 삭제됩니다.",
    ))
  ) {
    return;
  }

  try {
    const guidelinesText = document.getElementById("guidelinesText");
    if (guidelinesText) {
      // 기본 지침서 내용
      const defaultGuidelines = `# 뮤직모리 제작 지침서

## 기본 원칙
- 감정을 진솔하게 표현
- 리듬감 있는 가사 구성
- 일상적이면서도 특별한 순간을 담기

## 인물 및 시각 묘사 (MV 프롬프트용)
- 인물 생성 시 기형적인 배치를 지양하고, 손가락, 발가락, 손 모양, 발 모양, 팔, 다리 등 인체 구조를 매우 정밀하고 자연스럽게 묘사합니다.
- 해부학적으로 정확하고 완벽한 관절 및 신체 부위 표현을 지속적으로 유지합니다.

## 구조
- Verse (주제 전개)
- Chorus (메시지 강조)
- Bridge (감정 고조)

## 어조
- 자연스럽고 친근한 언어
- 비유와 은유 활용
- 듣는 이의 감정을 자극하는 표현`;

      guidelinesText.value = defaultGuidelines;
    }
  } catch (error) {
    console.error("지침서 초기화 오류:", error);
    window.showToast("지침서 초기화 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
};

// ═══════════════════════════════════════════════════════════════
// 드래그 앤 드롭으로 단계 순서 변경 기능
// ═══════════════════════════════════════════════════════════════
// 전역 변수로 드래그 중인 step 추적
let draggedStepElement = null;

// ═══════════════════════════════════════════════════════════════
// initStepDragAndDrop 헬퍼 함수들 (순수 추출 리팩터링, 동작 동일)
// ═══════════════════════════════════════════════════════════════

// localStorage에 저장된 단계 순서가 있으면 progressSteps DOM을 그 순서로 재배치한다.
function restoreSavedStepOrder(progressSteps, steps) {
  const savedOrder = localStorage.getItem("stepOrder");
  if (savedOrder) {
    try {
      const order = JSON.parse(savedOrder);
      if (Array.isArray(order) && order.length === steps.length) {
        // 순서대로 재배치
        const stepMap = new Map();
        steps.forEach((step) => {
          const stepNum = parseInt(step.getAttribute("data-step"));
          stepMap.set(stepNum, step);
        });

        // progress-steps 비우기
        while (progressSteps.firstChild) {
          progressSteps.removeChild(progressSteps.firstChild);
        }

        // 저장된 순서대로 다시 추가
        order.forEach((stepNum) => {
          const stepEl = stepMap.get(stepNum);
          if (stepEl) {
            progressSteps.appendChild(stepEl);
          }
        });

        // steps 배열 업데이트
        const updatedSteps = Array.from(
          progressSteps.querySelectorAll(".step"),
        );
        updatedSteps.forEach((step) => {
          // 기존 이벤트 리스너 제거 (중복 방지)
          const newDragHandle = step.querySelector(".step-drag-handle");
          if (newDragHandle) {
            const newHandle = newDragHandle.cloneNode(true);
            newDragHandle.parentNode.replaceChild(newHandle, newDragHandle);
          }
        });

        console.log("✅ 저장된 단계 순서 복원:", order);
      }
    } catch (e) {
      console.warn("단계 순서 로드 실패:", e);
    }
  }
}

// step 순서를 localStorage에 저장하고 사용자에게 알린 뒤 드래그 앤 드롭을 재초기화한다.
// (마우스 drop 핸들러와 터치 재정렬 완료 시 공통으로 사용)
function saveAndReinitStepOrder(progressSteps) {
  const newOrder = Array.from(progressSteps.querySelectorAll(".step")).map(
    (s) => parseInt(s.getAttribute("data-step")),
  );
  localStorage.setItem("stepOrder", JSON.stringify(newOrder));

  console.log("✅ 단계 순서 변경 및 저장 완료:", newOrder);

  if (typeof window.showCopyIndicator === "function") {
    window.showCopyIndicator("✅ 단계 순서가 저장되었습니다!");
  }

  // 드래그 앤 드롭 다시 초기화 (이벤트 리스너 재설정)
  setTimeout(() => {
    window.initStepDragAndDrop();
  }, 100);
}

// 하나의 step 요소에 드래그 앤 드롭 이벤트 리스너 전체(dragstart/dragend/
// dragover/dragleave/drop)를 붙인다.
function attachStepDragHandlers(step, currentSteps, progressSteps) {
  const dragHandle = step.querySelector(".step-drag-handle");
  if (!dragHandle) return;

  // 드래그 핸들에서 드래그 시작
  dragHandle.addEventListener("dragstart", function (e) {
    e.stopPropagation();
    draggedStepElement = step;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", step.getAttribute("data-step"));
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ step: step.getAttribute("data-step") }),
    );
    step.classList.add("dragging");

    // 드래그 이미지 생성
    const dragImage = step.cloneNode(true);
    dragImage.style.opacity = "0.8";
    dragImage.style.transform = "rotate(2deg)";
    dragImage.style.width = step.offsetWidth + "px";
    dragImage.style.backgroundColor = "var(--bg-card)";
    dragImage.style.border = "2px solid var(--accent)";
    document.body.appendChild(dragImage);
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
    setTimeout(() => {
      if (dragImage.parentNode) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  });

  // 드래그 종료
  dragHandle.addEventListener("dragend", function (e) {
    if (draggedStepElement) {
      draggedStepElement.classList.remove("dragging");
    }

    // 모든 드롭존 하이라이트 제거
    currentSteps.forEach((s) => {
      s.classList.remove("drag-over");
    });

    draggedStepElement = null;
  });

  // 다른 step 위에 드래그할 때
  step.addEventListener("dragover", function (e) {
    if (!draggedStepElement || draggedStepElement === step) return;

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    // 삽입 위치 결정 (마우스 위치 기준)
    const rect = step.getBoundingClientRect();
    const mouseY = e.clientY;
    const stepCenter = rect.top + rect.height / 2;

    // 드롭존 하이라이트
    step.classList.add("drag-over");
  });

  // 드래그 떠날 때
  step.addEventListener("dragleave", function (e) {
    // relatedTarget이 step 내부에 있지 않으면 하이라이트 제거
    const relatedTarget = e.relatedTarget;
    if (!relatedTarget || !step.contains(relatedTarget)) {
      step.classList.remove("drag-over");
    }
  });

  // 드롭
  step.addEventListener("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedStepElement || draggedStepElement === step) {
      step.classList.remove("drag-over");
      return;
    }

    // 삽입 위치 결정
    const rect = step.getBoundingClientRect();
    const mouseY = e.clientY;
    const stepCenter = rect.top + rect.height / 2;
    const insertBefore = mouseY < stepCenter;

    // 요소 이동
    if (insertBefore) {
      progressSteps.insertBefore(draggedStepElement, step);
    } else {
      if (step.nextSibling) {
        progressSteps.insertBefore(draggedStepElement, step.nextSibling);
      } else {
        progressSteps.appendChild(draggedStepElement);
      }
    }

    step.classList.remove("drag-over");
    draggedStepElement.classList.remove("dragging");

    // 순서 저장 및 재초기화
    saveAndReinitStepOrder(progressSteps);

    draggedStepElement = null;
  });

  // 모바일 터치 드래그 지원 (드래그 핸들에서 끌어서 재정렬)
  enableTouchDragReorder(dragHandle, step, progressSteps, ".step", function () {
    saveAndReinitStepOrder(progressSteps);
  });
}

window.initStepDragAndDrop = function () {
  const progressSteps =
    document.querySelector(".progress-steps") ||
    document.getElementById("progressSteps");
  if (!progressSteps) {
    console.warn("progress-steps 요소를 찾을 수 없습니다.");
    return;
  }

  const steps = Array.from(progressSteps.querySelectorAll(".step"));
  if (steps.length === 0) {
    console.warn("step 요소를 찾을 수 없습니다.");
    return;
  }

  // 저장된 순서 로드
  restoreSavedStepOrder(progressSteps, steps);

  // 현재 steps 가져오기 (순서 복원 후)
  const currentSteps = Array.from(progressSteps.querySelectorAll(".step"));

  // 드래그 이벤트 설정
  currentSteps.forEach((step) => {
    attachStepDragHandlers(step, currentSteps, progressSteps);
  });

  // progress-steps 전체 드롭 영역 허용
  progressSteps.addEventListener("dragover", function (e) {
    e.preventDefault();
  });

  progressSteps.addEventListener("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
  });
};

// 단계 순서 초기화
window.resetStepOrder = async function () {
  if (!(await window.showConfirmAsync("단계 순서를 기본값(1-6)으로 초기화하시겠습니까?"))) {
    return;
  }

  localStorage.removeItem("stepOrder");

  const progressSteps =
    document.querySelector(".progress-steps") ||
    document.getElementById("progressSteps");
  if (progressSteps) {
    const steps = Array.from(progressSteps.querySelectorAll(".step"));
    const defaultOrder = [1, 2, 3, 4, 5, 6];

    const stepMap = new Map();
    steps.forEach((step) => {
      const stepNum = parseInt(step.getAttribute("data-step"));
      stepMap.set(stepNum, step);
    });

    // progress-steps 비우기
    while (progressSteps.firstChild) {
      progressSteps.removeChild(progressSteps.firstChild);
    }

    // 기본 순서대로 다시 추가
    defaultOrder.forEach((stepNum) => {
      const stepEl = stepMap.get(stepNum);
      if (stepEl) {
        progressSteps.appendChild(stepEl);
      }
    });
  }

  // 드래그 앤 드롭 다시 초기화
  if (typeof window.initStepDragAndDrop === "function") {
    window.initStepDragAndDrop();
  }

  window.showToast("✅ 단계 순서가 기본값으로 초기화되었습니다.", "success");
};

// 페이지 로드 시 드래그 앤 드롭 초기화 및 수정 모드 초기화
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(() => {
        if (typeof window.initStepDragAndDrop === "function") {
          window.initStepDragAndDrop();
        }

        // 초기 수정 모드 설정 (프로젝트가 없으면 수정 가능, 있으면 읽기 전용)
        window.editMode = false;
        if (typeof window.updateEditModeUI === "function") {
          window.updateEditModeUI();
        }
        if (typeof window.setReadOnlyMode === "function") {
          // 프로젝트가 로드되지 않았으면 수정 가능, 로드되었으면 읽기 전용
          window.setReadOnlyMode(window.currentProject !== null);
        }
      }, 500);
    });
  } else {
    setTimeout(() => {
      if (typeof window.initStepDragAndDrop === "function") {
        window.initStepDragAndDrop();
      }
    }, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// 다크/라이트 테마 전환
// ═══════════════════════════════════════════════════════════════
window.toggleTheme = function () {
  try {
    var body = document.body;
    var isDark = body.classList.contains("theme-dark");
    body.classList.toggle("theme-dark", !isDark);
    var next = isDark ? "light" : "dark";
    try {
      localStorage.setItem("musicCreatorTheme", next);
    } catch (e) {}
    var icon = document.getElementById("themeToggleIcon");
    var text = document.getElementById("themeToggleText");
    if (icon) {
      icon.className = next === "dark" ? "fas fa-moon" : "fas fa-sun";
    }
    if (text) {
      text.textContent = next === "dark" ? "다크" : "라이트";
    }
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        next === "dark" ? "🌙 다크 모드" : "☀️ 라이트 모드",
      );
    }
  } catch (e) {}
};

// 페이지 로드 시 저장된 테마 적용 (버튼 라벨 = 다음 모드)
function applySavedTheme() {
  try {
    var theme = localStorage.getItem("musicCreatorTheme");
    if (theme === "dark") {
      document.body.classList.add("theme-dark");
      var icon = document.getElementById("themeToggleIcon");
      var text = document.getElementById("themeToggleText");
      if (icon) icon.className = "fas fa-sun";
      if (text) text.textContent = "라이트";
    } else if (theme === "light") {
      document.body.classList.remove("theme-dark");
      var icon = document.getElementById("themeToggleIcon");
      var text = document.getElementById("themeToggleText");
      if (icon) icon.className = "fas fa-moon";
      if (text) text.textContent = "다크";
    }
  } catch (e) {}
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applySavedTheme);
} else {
  applySavedTheme();
}

// ═══════════════════════════════════════════════════════════════
// 사용자 편의: 키보드 단축키 (Ctrl+S 저장, Ctrl+1~6 단계 이동, Esc 모달/사이드바 닫기)
// ═══════════════════════════════════════════════════════════════
document.addEventListener("keydown", function (e) {
  // Ctrl+1~6: 단계 이동 (Mac: Cmd+1~6)
  if ((e.ctrlKey || e.metaKey) && e.key >= "1" && e.key <= "6") {
    e.preventDefault();
    const step = parseInt(e.key, 10);
    if (typeof window.goToStep === "function") {
      window.goToStep(step, false, true);
    }
    return;
  }
  // Ctrl+S: 저장 (Mac: Cmd+S)
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    if (typeof window.saveCurrentProject === "function") {
      const saved = window.saveCurrentProject();
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          saved ? "✅ 저장되었습니다" : "❌ 저장에 실패했습니다",
        );
      }
    }
    return;
  }
  // Esc: 모달/사이드바 닫기
  if (e.key === "Escape") {
    const sidebar = document.getElementById("sidebar");
    if (sidebar && sidebar.classList.contains("open")) {
      if (typeof window.toggleSidebar === "function") {
        window.toggleSidebar();
      }
    }
    document
      .querySelectorAll('.modal-overlay, [role="dialog"]')
      .forEach(function (modal) {
        if (modal && modal.style.display !== "none") {
          modal.style.display = "none";
          modal.style.pointerEvents = "none";
        }
      });
    ["guidelinesModal", "projectReferenceModal", "apiSettingsModal"].forEach(
      function (id) {
        const el = document.getElementById(id);
        if (el) {
          el.style.display = "none";
          el.classList.remove("show");
        }
      },
    );
  }
});

// ═══════════════════════════════════════════════════════════════
// Suno용 한 번에 복사 (가사 + 스타일)
// ═══════════════════════════════════════════════════════════════
window.copySunoLyricsAndStyle = async function () {
  const lyricsEl = document.getElementById("finalLyrics");
  const styleEl = document.getElementById("finalStyle");
  const lyrics =
    lyricsEl && lyricsEl.textContent ? lyricsEl.textContent.trim() : "";
  const style =
    styleEl && styleEl.textContent ? styleEl.textContent.trim() : "";
  if (!lyrics && !style) {
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator("❌ 복사할 가사/스타일이 없습니다");
    } else {
      window.showToast("복사할 가사 또는 스타일이 없습니다.", "error");
    }
    return;
  }
  if (typeof window.renderGuidelineComplianceStatus === "function") {
    window.renderGuidelineComplianceStatus(lyrics, style, "Suno 복사 직전");
  }
  if (typeof window.getGuidelineComplianceIssues === "function") {
    const compliance = window.getGuidelineComplianceIssues(lyrics, style);
    if (compliance.issues && compliance.issues.length > 0) {
      const proceed = await window.showConfirmAsync(
        "제작 지침서 확인 항목이 남아 있습니다.\n\n" +
          compliance.issues.join("\n") +
          "\n\n그래도 Suno용으로 복사할까요?",
      );
      if (!proceed) return;
    }
  }
  const text = "【가사】\n" + lyrics + "\n\n【스타일】\n" + style;
  // navigator.clipboard.writeText()는 Promise를 반환하므로, 클립보드
  // 권한 거부 등으로 그 Promise가 reject돼도 동기 try/catch로는 절대
  // 잡히지 않는다 — 아래 catch{}의 "복사 실패" 분기는 사실상 도달 불가능한
  // 죽은 코드였고, 실패 시 사용자는 성공도 실패도 못 보는 무반응 상태였다
  // (정밀 재분석 중 발견). Promise 체인에 .catch를 붙여 실제로 실패를
  // 감지하도록 수정.
  navigator.clipboard
    .writeText(text)
    .then(function () {
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          "✅ Suno용 가사+스타일이 클립보드에 복사되었습니다",
        );
      }
    })
    .catch(function () {
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator("❌ 복사 실패");
      }
    });
};

// ═══════════════════════════════════════════════════════════════
// 프로젝트 복제
// ═══════════════════════════════════════════════════════════════
window.duplicateProject = function (projectId) {
  if (typeof window.loadProject !== "function") return;
  try {
    var foundProject = null;
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!key) continue;
      try {
        var data = localStorage.getItem(key);
        if (!data || !data.trim()) continue;
        if (data.trim().startsWith("[")) {
          var parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            foundProject = parsed.find(function (p) {
              return p && p.id === projectId;
            });
            if (foundProject) break;
          }
        } else if (data.trim().startsWith("{")) {
          var p = JSON.parse(data);
          if (p && p.id === projectId) {
            foundProject = p;
            break;
          }
        }
      } catch (e) {}
    }
    if (!foundProject) {
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator("❌ 프로젝트를 찾을 수 없습니다");
      }
      return;
    }
    var copy = JSON.parse(JSON.stringify(foundProject));
    copy.id =
      window.generateProjectId();
    copy.title = (foundProject.title || "제목 없음") + " (복사본)";
    copy.savedAt = new Date().toISOString();
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.savedAt;
    window.currentProjectId = null;
    window.currentProject = null;
    // 원시 localStorage.setItem을 직접 호출하면 용량 초과(QuotaExceededError)
    // 시 그대로 조용히 실패하는데도(빈 catch) 아래에서 무조건 "복제되었습니다"
    // 성공 토스트를 띄우고 있었다 — 정밀 재분석 중 발견. handleImport와
    // 동일하게 이미 검증된 용량 보호 저장 함수(js/storage.js)를 사용해,
    // 두 키 중 하나라도 실제로 저장에 실패하면 정확한 결과를 안내한다.
    var keys = ["musicCreatorProjects", "savedProjects"];
    var saveOk = true;
    for (var k = 0; k < keys.length; k++) {
      try {
        var raw = localStorage.getItem(keys[k]);
        var arr = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(arr)) arr = [];
        arr.push(copy);
        if (typeof window.saveProjectListToLocalStorage === "function") {
          var result = window.saveProjectListToLocalStorage(keys[k], arr, null);
          if (!result || !result.ok) saveOk = false;
        } else {
          localStorage.setItem(keys[k], JSON.stringify(arr));
        }
      } catch (e) {
        saveOk = false;
      }
    }
    if (typeof window.loadProjectList === "function") {
      window.loadProjectList(true);
    }
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        saveOk
          ? "✅ 프로젝트가 복제되었습니다"
          : "⚠️ 저장 공간이 부족해 복제본이 저장되지 못했을 수 있습니다. 프로젝트 목록을 확인해 주세요.",
      );
    }
  } catch (err) {
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator("❌ 복제 실패");
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// 단계별 진행률 표시
// ═══════════════════════════════════════════════════════════════
window.updateStepProgress = function () {
  try {
    var steps = document.querySelectorAll(".step[data-step]");
    if (!steps.length) return;
    var checks = {
      1: function () {
        var t = document.getElementById("songTitle");
        var l = document.getElementById("originalLyrics");
        return (t && t.value.trim()) || (l && l.value.trim());
      },
      2: function () {
        var l = document.getElementById("sunoLyrics");
        return l && l.value.trim();
      },
      3: function () {
        var r = document.getElementById("analysisResult");
        return r && r.style.display !== "none" && r.textContent.trim();
      },
      4: function () {
        var l = document.getElementById("finalizedLyrics");
        if (l && l.value.trim()) return true;
        var d =
          window.currentProject &&
          (window.currentProject.data || window.currentProject);
        return !!(d && (d.finalizedLyrics || d.finalLyrics));
      },
      5: function () {
        var l = document.getElementById("finalLyrics");
        if (l && l.textContent.trim()) return true;
        var d =
          window.currentProject &&
          (window.currentProject.data || window.currentProject);
        return !!(d && (d.finalLyrics || d.finalizedLyrics));
      },
      6: function () {
        var y = document.getElementById("youtubeDesc");
        return y && y.textContent.trim();
      },
    };
    steps.forEach(function (stepEl) {
      var step = parseInt(stepEl.getAttribute("data-step"), 10);
      var fn = checks[step];
      if (fn && fn()) {
        stepEl.classList.add("step-complete");
      } else {
        stepEl.classList.remove("step-complete");
      }
    });
  } catch (e) {}
};

console.log("✅ app.js 로드 완료 - 모든 핵심 함수 등록됨");
