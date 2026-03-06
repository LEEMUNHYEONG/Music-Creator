// js/storage.js - Extracted Logic

// --- Extracted validateProjectData ---
window.validateProjectData = function (project) {
  const errors = [];
  const warnings = [];

  // 필수 필드 검증
  if (!project.title || project.title.trim() === "") {
    warnings.push("제목이 없습니다");
  }

  // 단계 번호 검증
  if (project.lastStep !== undefined) {
    if (
      typeof project.lastStep !== "number" ||
      project.lastStep < 1 ||
      project.lastStep > 6
    ) {
      errors.push("잘못된 단계 번호입니다 (1-6 사이여야 함)");
    }
  }

  // 데이터 타입 검증
  if (project.genres !== undefined && !Array.isArray(project.genres)) {
    errors.push("장르는 배열이어야 합니다");
  }

  // 날짜 형식 검증
  const dateFields = ["savedAt", "createdAt", "updatedAt"];
  dateFields.forEach((field) => {
    if (project[field] && !isValidISOString(project[field])) {
      warnings.push(`${field} 날짜 형식이 올바르지 않습니다`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// --- Extracted loadProject ---
window.loadProject = function (projectId) {
  try {
    // 기존 MV 프롬프트 UI 초기화 (중복 방지)
    window.currentScenes = [];
    const mvSceneOverviewContainer = document.getElementById(
      "mvSceneOverviewContainer",
    );
    const mvPromptsContainer = document.getElementById("mvPromptsContainer");
    if (mvSceneOverviewContainer) {
      mvSceneOverviewContainer.innerHTML = "";
    }
    if (mvPromptsContainer) {
      mvPromptsContainer.innerHTML = "";
    }

    // localStorage에서 프로젝트 찾기 (우선순위: musicCreatorProjects > savedProjects > sunoLyricsHistory > stylePromptHistory)
    // 같은 프로젝트가 여러 키에 있으면 4·5단계 데이터가 있는 버전을 우선 사용
    let foundProject = null;
    const projectKeys = [
      "musicCreatorProjects",
      "savedProjects",
      "sunoLyricsHistory",
      "stylePromptHistory",
    ];

    for (const key of projectKeys) {
      try {
        const data = localStorage.getItem(key);
        if (!data) continue;

        if (data.trim().startsWith("[")) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            const project = parsed.find((p) => p && p.id === projectId);
            if (project) {
              if (!foundProject) {
                foundProject = project;
              } else {
                // 이미 찾은 버전보다 4·5단계 데이터가 더 완전하면 교체
                const pd = project.data || project;
                const existingPd = foundProject.data || foundProject;
                const hasMore = !!(
                  pd.finalLyrics ||
                  pd.finalizedLyrics ||
                  pd.finalStyle ||
                  pd.finalizedStyle
                );
                const existingHas = !!(
                  existingPd.finalLyrics ||
                  existingPd.finalizedLyrics ||
                  existingPd.finalStyle ||
                  existingPd.finalizedStyle
                );
                const newer =
                  new Date(pd.savedAt || project.savedAt || 0) >
                  new Date(existingPd.savedAt || foundProject.savedAt || 0);
                if (
                  (hasMore && !existingHas) ||
                  (hasMore && newer) ||
                  (!existingHas && newer)
                ) {
                  foundProject = project;
                }
              }
            }
          }
        } else if (data.trim().startsWith("{")) {
          const parsed = JSON.parse(data);
          if (parsed && parsed.id === projectId) {
            if (!foundProject) {
              foundProject = parsed;
            } else {
              const pd = parsed.data || parsed;
              const existingPd = foundProject.data || foundProject;
              const hasMore = !!(
                pd.finalLyrics ||
                pd.finalizedLyrics ||
                pd.finalStyle ||
                pd.finalizedStyle
              );
              const existingHas = !!(
                existingPd.finalLyrics ||
                existingPd.finalizedLyrics ||
                existingPd.finalStyle ||
                existingPd.finalizedStyle
              );
              const newer =
                new Date(pd.savedAt || parsed.savedAt || 0) >
                new Date(existingPd.savedAt || foundProject.savedAt || 0);
              if (
                (hasMore && !existingHas) ||
                (hasMore && newer) ||
                (!existingHas && newer)
              ) {
                foundProject = parsed;
              }
            }
          }
        }
      } catch (e) {
        // 무시
      }
    }

    // projectKeys에서 못 찾으면 기존 방식으로 전체 localStorage 검색 (호환)
    if (!foundProject) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || projectKeys.includes(key)) continue;
        try {
          const data = localStorage.getItem(key);
          if (!data) continue;
          if (data.trim().startsWith("[")) {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
              const project = parsed.find((p) => p && p.id === projectId);
              if (project) {
                foundProject = project;
                break;
              }
            }
          } else if (data.trim().startsWith("{")) {
            const parsed = JSON.parse(data);
            if (parsed && parsed.id === projectId) {
              foundProject = parsed;
              break;
            }
          }
        } catch (e) {}
      }
    }

    if (!foundProject) {
      alert("프로젝트를 찾을 수 없습니다.\n\n프로젝트 ID: " + projectId);
      return;
    }

    // 모든 키에서 같은 ID 프로젝트를 찾아 4·5단계 데이터가 있으면 병합 (누락 보완)
    const projectData = foundProject.data || foundProject;
    if (
      !projectData.finalLyrics &&
      !projectData.finalizedLyrics &&
      !projectData.finalStyle &&
      !projectData.finalizedStyle
    ) {
      for (const key of projectKeys) {
        try {
          const data = localStorage.getItem(key);
          if (!data || !data.trim().startsWith("[")) continue;
          const parsed = JSON.parse(data);
          if (!Array.isArray(parsed)) continue;
          const other = parsed.find((p) => p && p.id === projectId);
          if (!other) continue;
          const od = other.data || other;
          if (od.finalLyrics && !projectData.finalLyrics) {
            if (!foundProject.data) foundProject.data = {};
            foundProject.data.finalLyrics = od.finalLyrics;
            projectData.finalLyrics = od.finalLyrics;
          }
          if (od.finalizedLyrics && !projectData.finalizedLyrics) {
            if (!foundProject.data) foundProject.data = {};
            foundProject.data.finalizedLyrics = od.finalizedLyrics;
            projectData.finalizedLyrics = od.finalizedLyrics;
          }
          if (od.finalStyle && !projectData.finalStyle) {
            if (!foundProject.data) foundProject.data = {};
            foundProject.data.finalStyle = od.finalStyle;
            projectData.finalStyle = od.finalStyle;
          }
          if (od.finalizedStyle && !projectData.finalizedStyle) {
            if (!foundProject.data) foundProject.data = {};
            foundProject.data.finalizedStyle = od.finalizedStyle;
            projectData.finalizedStyle = od.finalizedStyle;
          }
          if (
            projectData.finalLyrics ||
            projectData.finalizedLyrics ||
            projectData.finalStyle ||
            projectData.finalizedStyle
          ) {
            console.log("✅ 4·5단계 데이터 병합:", key);
            break;
          }
        } catch (e) {}
      }
    }

    // 프로젝트 데이터를 UI에 로드
    console.log("✅ 프로젝트 로드 시작:", foundProject.title || "제목 없음");
    window.currentProject = foundProject;
    window.currentProjectId = projectId;

    // flat 저장 구조 호환: currentProject.data가 없으면 projectData로 보정 (restoreStepData, goToStep에서 사용)
    if (!window.currentProject.data) {
      window.currentProject.data = projectData;
    }

    // MV 프롬프트 데이터 정리 (최신 데이터만 사용)
    if (projectData.marketing) {
      // mvScenes가 배열의 배열인 경우 (중복 저장된 경우) 가장 최신 것만 사용
      if (
        projectData.marketing.mvScenes &&
        Array.isArray(projectData.marketing.mvScenes)
      ) {
        // 배열의 첫 번째 요소가 배열인 경우 (중첩 배열)
        if (
          projectData.marketing.mvScenes.length > 0 &&
          Array.isArray(projectData.marketing.mvScenes[0])
        ) {
          // 가장 마지막 배열을 사용 (최신 데이터)
          projectData.marketing.mvScenes =
            projectData.marketing.mvScenes[
              projectData.marketing.mvScenes.length - 1
            ];
          console.log("⚠️ 중첩된 MV 씬 데이터 발견, 최신 데이터만 사용");
        }
      }
    }

    // 1단계: 가사 작성
    const title =
      foundProject.title || projectData.songTitle || projectData.title;
    if (title) {
      const titleEl = document.getElementById("songTitle");
      if (titleEl) titleEl.value = title;
    }

    const originalLyrics =
      projectData.originalLyrics ||
      foundProject.originalLyrics ||
      foundProject.lyrics ||
      "";
    if (originalLyrics) {
      const lyricsEl = document.getElementById("originalLyrics");
      if (lyricsEl) lyricsEl.value = originalLyrics;
    }

    const manualStylePrompt =
      projectData.manualStylePrompt ||
      foundProject.manualStylePrompt ||
      projectData.stylePrompt ||
      foundProject.stylePrompt ||
      "";
    if (manualStylePrompt) {
      const styleEl = document.getElementById("manualStylePrompt");
      if (styleEl) styleEl.value = manualStylePrompt;
    }

    // 1단계 선택 태그 복원 (장르, 분위기, 시대 등)
    if (
      projectData.step1Tags &&
      typeof projectData.step1Tags === "object" &&
      typeof window.setTagSelections === "function"
    ) {
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
        if (
          projectData.step1Tags[key] &&
          Array.isArray(projectData.step1Tags[key])
        ) {
          window.setTagSelections(step1Map[key], projectData.step1Tags[key]);
        }
      });
    }

    // 추가 키워드 복원
    const additionalKeywords =
      projectData.additionalKeywords || foundProject.additionalKeywords || "";
    if (additionalKeywords) {
      const extraKeywordsEl = document.getElementById("additionalKeywords");
      if (extraKeywordsEl) extraKeywordsEl.value = additionalKeywords;
    }

    // 가사 길이 태그 복원
    const lyricsLength =
      projectData.lyricsLength || foundProject.lyricsLength || "";
    if (lyricsLength) {
      const lengthContainer = document.getElementById("lyricsLengthTags");
      if (lengthContainer) {
        const buttons = lengthContainer.querySelectorAll(".length-btn");
        buttons.forEach((btn) => {
          if (btn.getAttribute("data-value") === lyricsLength) {
            btn.classList.add("active");
          } else {
            btn.classList.remove("active");
          }
        });
      }
    }

    // 2단계: 수노 변환
    // 제목 복원 (2단계)
    if (title) {
      const sunoTitleEl = document.getElementById("sunoTitle");
      if (sunoTitleEl) sunoTitleEl.value = title;
    }

    const sunoLyrics = projectData.sunoLyrics || foundProject.sunoLyrics || "";
    if (sunoLyrics) {
      const sunoEl = document.getElementById("sunoLyrics");
      if (sunoEl) {
        sunoEl.value = sunoLyrics;
        if (typeof window.autoResizeTextarea === "function") {
          requestAnimationFrame(function () {
            window.autoResizeTextarea(sunoEl);
          });
        }
      }
    }

    const stylePrompt =
      projectData.stylePrompt || foundProject.stylePrompt || "";
    if (stylePrompt) {
      const stylePromptEl = document.getElementById("stylePrompt");
      if (stylePromptEl) stylePromptEl.value = stylePrompt;
    }

    // 2단계 파트별 보컬 스타일 지정 복원
    if (
      projectData.vocalPartAssignments &&
      typeof projectData.vocalPartAssignments === "object"
    ) {
      window.vocalPartAssignments = projectData.vocalPartAssignments;
      if (typeof window.renderVocalPartAssignments === "function") {
        window.renderVocalPartAssignments();
      }
    }

    // 2단계 선택 태그·템포 복원
    if (
      projectData.step2Tags &&
      typeof projectData.step2Tags === "object" &&
      typeof window.setTagSelections === "function"
    ) {
      const step2Map = {
        audioFormat: "audioFormatTags",
        venue: "sunoVenueTags",
        vocalStyle: "vocalStyle",
        instruments: "instrumentTags",
      };
      Object.keys(step2Map).forEach((key) => {
        if (
          projectData.step2Tags[key] &&
          Array.isArray(projectData.step2Tags[key])
        ) {
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

    // 3단계: AI 분석 결과 (저장된 분석이 있으면 로딩 숨기고 결과 표시)
    const analysisData = projectData.analysis || {};
    const hasAnalysis =
      analysisData.scores ||
      analysisData.feedbacks ||
      analysisData.improvements ||
      analysisData.raw ||
      projectData.analysisScores ||
      projectData.feedbacks;
    if (hasAnalysis) {
      // 분석 결과 표시
      const analysisResult = document.getElementById("analysisResult");
      const analysisLoading = document.getElementById("analysisLoading");
      const analysisError = document.getElementById("analysisError");

      if (analysisResult && analysisLoading) {
        analysisLoading.style.display = "none";
        if (analysisError) analysisError.style.display = "none";
        analysisResult.style.display = "block";

        // 분석 대상 표시
        const analysisTargetLyrics = document.getElementById(
          "analysisTargetLyrics",
        );
        if (analysisTargetLyrics && sunoLyrics) {
          analysisTargetLyrics.textContent = sunoLyrics;
        }

        const analysisTargetStyle = document.getElementById(
          "analysisTargetStyle",
        );
        if (analysisTargetStyle && stylePrompt) {
          analysisTargetStyle.textContent = stylePrompt;
        }

        // Gemini 분석 결과 표시 (점수, 피드백, 개선안)
        if (analysisData.scores) {
          // 점수 표시
          const overallScore =
            analysisData.scores.overall ||
            analysisData.scores.overallScore ||
            0;
          const lyricsScore = analysisData.scores.lyrics || 0;
          const styleScore = analysisData.scores.style || 0;
          const structureScore = analysisData.scores.structure || 0;

          const overallScoreEl = document.getElementById("overallScore");
          const lyricsScoreEl = document.getElementById("lyricsScore");
          const styleScoreEl = document.getElementById("styleScore");
          const structureScoreEl = document.getElementById("structureScore");

          if (overallScoreEl) overallScoreEl.textContent = overallScore;
          if (lyricsScoreEl) lyricsScoreEl.textContent = lyricsScore;
          if (styleScoreEl) styleScoreEl.textContent = styleScore;
          if (structureScoreEl) structureScoreEl.textContent = structureScore;
        }

        // 피드백 표시
        const feedbacks = analysisData.feedbacks || projectData.feedbacks || [];
        if (feedbacks.length > 0) {
          const geminiAnalysisCard =
            document.getElementById("geminiAnalysisCard");
          const geminiAnalysisResult = document.getElementById(
            "geminiAnalysisResult",
          );
          if (geminiAnalysisCard && geminiAnalysisResult) {
            geminiAnalysisCard.style.display = "block";

            let feedbackHtml = "";
            feedbacks.forEach((feedback, index) => {
              const feedbackText =
                typeof feedback === "string"
                  ? feedback
                  : feedback.suggestion ||
                    feedback.desc ||
                    feedback.text ||
                    JSON.stringify(feedback);
              feedbackHtml += `
                                <div style="margin-bottom: 15px; padding: 15px; background: var(--bg-input); border-radius: 8px; border-left: 4px solid var(--accent);">
                                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                        <span style="font-size: 1.5rem;">${feedback.icon || "💡"}</span>
                                        <h4 style="margin: 0; color: var(--text-primary);">${feedback.title || feedback.category || "피드백"}</h4>
                                    </div>
                                    <p style="margin: 0; color: var(--text-secondary); line-height: 1.6; font-size: 0.9rem;">${escapeHtml(feedbackText)}</p>
                                </div>
                            `;
            });
            geminiAnalysisResult.innerHTML = feedbackHtml;
          }
        }

        // 요약 표시
        if (analysisData.summary) {
          const summaryEl = document.getElementById("analysisSummary");
          if (summaryEl) {
            summaryEl.textContent = analysisData.summary;
          }
        }
        // raw만 있는 경우(텍스트 결과만 저장된 경우) 결과 영역에 표시
        if (
          analysisData.raw &&
          !analysisData.scores &&
          (!analysisData.feedbacks || analysisData.feedbacks.length === 0)
        ) {
          const geminiAnalysisCard =
            document.getElementById("geminiAnalysisCard");
          const geminiAnalysisResult = document.getElementById(
            "geminiAnalysisResult",
          );
          if (geminiAnalysisCard && geminiAnalysisResult) {
            geminiAnalysisCard.style.display = "block";
            geminiAnalysisResult.innerHTML =
              '<div style="white-space: pre-wrap; color: var(--text-secondary); line-height: 1.8;">' +
              escapeHtml(analysisData.raw) +
              "</div>";
          }
        }
      }
    }

    // 4단계: 개선안 반영 및 확정 (우선순위: finalizedLyrics > finalLyrics)
    const finalizedLyrics =
      projectData.finalizedLyrics ||
      foundProject.finalizedLyrics ||
      projectData.finalLyrics ||
      foundProject.finalLyrics ||
      "";
    const finalizedStyle =
      projectData.finalizedStyle ||
      foundProject.finalizedStyle ||
      projectData.finalStyle ||
      foundProject.finalStyle ||
      "";

    if (finalizedLyrics || finalizedStyle || projectData.improvements) {
      const improvementCard = document.getElementById("improvementCard");
      const improvementLoading = document.getElementById("improvementLoading");
      if (improvementCard && improvementLoading) {
        improvementLoading.style.display = "none";
        improvementCard.style.display = "block";

        // 확정된 가사
        if (finalizedLyrics) {
          const finalizedLyricsEl = document.getElementById("finalizedLyrics");
          if (finalizedLyricsEl) finalizedLyricsEl.value = finalizedLyrics;
        }

        // 확정된 스타일
        if (finalizedStyle) {
          const finalizedStyleEl = document.getElementById("finalizedStyle");
          if (finalizedStyleEl) finalizedStyleEl.value = finalizedStyle;
        }
      }
    }

    // 5단계: 최종 출력 (여러 소스에서 데이터 가져오기)
    // 우선순위: projectData.finalLyrics > foundProject.finalLyrics > finalizedLyrics (4단계)
    const finalLyrics =
      projectData.finalLyrics ||
      foundProject.finalLyrics ||
      finalizedLyrics ||
      "";
    const finalStyle =
      projectData.finalStyle || foundProject.finalStyle || finalizedStyle || "";
    const stepNum = foundProject.lastStep || projectData.lastStep || 1;
    const hasReachedStep5 = typeof stepNum === "number" && stepNum >= 5;

    // 5단계 데이터가 있거나, 프로젝트가 5단계 이상 진행된 경우에만 로그 (3단계 로드 시 경고 방지)
    if (finalLyrics || finalStyle || hasReachedStep5) {
      console.log("📊 5단계 데이터 로드:", {
        finalLyrics: finalLyrics
          ? `${finalLyrics.substring(0, 50)}...`
          : "없음",
        finalStyle: finalStyle ? `${finalStyle.substring(0, 50)}...` : "없음",
        lastStep: stepNum,
      });
    }

    // 5단계 최종 가사 표시
    if (finalLyrics) {
      const finalLyricsEl = document.getElementById("finalLyrics");
      if (finalLyricsEl) {
        finalLyricsEl.textContent = finalLyrics;
        console.log("✅ 5단계 최종 가사 복원 완료:", finalLyrics.length, "자");
      } else if (hasReachedStep5) {
        console.warn("⚠️ finalLyrics 요소를 찾을 수 없습니다.");
      }
    } else if (hasReachedStep5) {
      console.warn(
        "⚠️ 5단계 최종 가사 데이터가 없습니다. (다른 키에서 병합 시도했으나 없음)",
      );
    }

    // 5단계 최종 스타일 표시
    if (finalStyle) {
      const finalStyleEl = document.getElementById("finalStyle");
      if (finalStyleEl) {
        finalStyleEl.textContent = finalStyle;
        console.log("✅ 5단계 최종 스타일 복원 완료:", finalStyle.length, "자");
      } else if (hasReachedStep5) {
        console.warn("⚠️ finalStyle 요소를 찾을 수 없습니다.");
      }
    } else if (hasReachedStep5) {
      console.warn(
        "⚠️ 5단계 최종 스타일 데이터가 없습니다. (다른 키에서 병합 시도했으나 없음)",
      );
    }

    // 5단계 중간 버전 프리뷰도 복원
    if (finalLyrics) {
      const intermediateLyricsPreview = document.getElementById(
        "intermediateLyricsPreview",
      );
      if (intermediateLyricsPreview) {
        intermediateLyricsPreview.textContent = finalLyrics;
      }
    }

    if (finalStyle) {
      const intermediateStylePreview = document.getElementById(
        "intermediateStylePreview",
      );
      if (intermediateStylePreview) {
        intermediateStylePreview.textContent = finalStyle;
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
        projectData.afterScore !== undefined ? projectData.afterScore : before;
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
        if (beforeScoreEl) beforeScoreEl.textContent = before;
        if (afterScoreEl) afterScoreEl.textContent = after;
        if (projectData.aiComment != null && aiCommentEl)
          aiCommentEl.textContent = projectData.aiComment;
      }
    } else if (projectData.aiComment) {
      const aiCommentEl = document.getElementById("aiComment");
      if (aiCommentEl) aiCommentEl.textContent = projectData.aiComment;
    }

    // 제목 표시
    if (title) {
      const finalTitleText = document.getElementById("finalTitleText");
      if (finalTitleText) finalTitleText.textContent = title;
    }

    // 6단계: 마케팅 자료
    if (projectData.marketing) {
      const marketingResult = document.getElementById("marketingResult");
      const marketingLoading = document.getElementById("marketingLoading");
      if (marketingResult && marketingLoading) {
        marketingLoading.style.display = "none";
        marketingResult.style.display = "block";

        const marketing = projectData.marketing;

        // 유튜브 설명
        if (marketing.youtubeDesc) {
          const youtubeDescEl = document.getElementById("youtubeDesc");
          if (youtubeDescEl) youtubeDescEl.textContent = marketing.youtubeDesc;
        }

        // 틱톡 설명
        if (marketing.tiktokDesc) {
          const tiktokDescEl = document.getElementById("tiktokDesc");
          if (tiktokDescEl) tiktokDescEl.textContent = marketing.tiktokDesc;
        }

        // 해시태그
        if (marketing.hashtags) {
          const hashtagsEl = document.getElementById("hashtagsContent");
          if (hashtagsEl) hashtagsEl.textContent = marketing.hashtags;
        }

        // 썸네일 문구 복원
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
                                     onclick="if(typeof window.copyToClipboard === 'function') { window.copyToClipboard(null, '${escapeHtml(thumbnailText).replace(/'/g, "\\'")}', event); }">
                                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">${escapeHtml(thumbnailText)}</div>
                                    <button class="btn btn-small btn-success" onclick="event.stopPropagation(); if(typeof window.copyToClipboard === 'function') { window.copyToClipboard(null, '${escapeHtml(thumbnailText).replace(/'/g, "\\'")}', event); }">
                                        <i class="fas fa-copy"></i> 복사
                                    </button>
                                </div>
                            `;
            });
            thumbnailsGridEl.innerHTML = thumbnailsHtml;
            console.log(
              "✅ 썸네일 문구 복원 완료:",
              marketing.thumbnails.length,
              "개",
            );
          }
        }

        // MV 프롬프트
        if (marketing.mvPrompts && marketing.mvPrompts.length > 0) {
          window.currentMVPrompts = marketing.mvPrompts;
        }

        // MV 설정 및 씬 데이터 복원
        if (marketing.mvSettings) {
          const mvSettings = marketing.mvSettings;
          if (mvSettings.era) {
            const eraEl = document.getElementById("mvEra");
            if (eraEl) eraEl.value = mvSettings.era;
          }
          if (mvSettings.country) {
            const countryEl = document.getElementById("mvCountry");
            if (countryEl) countryEl.value = mvSettings.country;
          }
          if (mvSettings.location) {
            const locationTagsContainer =
              document.getElementById("mvLocationTags");
            if (locationTagsContainer) {
              const locationArr = Array.isArray(mvSettings.location)
                ? mvSettings.location
                : [mvSettings.location];
              locationTagsContainer
                .querySelectorAll(".tag-btn")
                .forEach((btn) => {
                  const v = btn.getAttribute("data-value");
                  if (locationArr.indexOf(v) !== -1)
                    btn.classList.add("active");
                  else btn.classList.remove("active");
                });
            }
          }
          if (mvSettings.characterCount) {
            const characterCountEl =
              document.getElementById("mvCharacterCount");
            if (characterCountEl) {
              characterCountEl.value = mvSettings.characterCount;
              // 인물 입력 필드 DOM 재생성 후 값 복원
              if (typeof window.updateCharacterInputs === "function") {
                window.updateCharacterInputs();
              }
            }
          }
          if (mvSettings.customSettings) {
            const customSettingsEl =
              document.getElementById("mvCustomSettings");
            if (customSettingsEl)
              customSettingsEl.value = mvSettings.customSettings;
          }
          if (mvSettings.lighting) {
            const lightingEl = document.getElementById("mvLighting");
            if (lightingEl) lightingEl.value = mvSettings.lighting;
          }
          if (mvSettings.cameraWork) {
            const cameraWorkEl = document.getElementById("mvCameraWork");
            if (cameraWorkEl) cameraWorkEl.value = mvSettings.cameraWork;
          }
          if (mvSettings.mood) {
            const moodEl = document.getElementById("mvMood");
            if (moodEl) moodEl.value = mvSettings.mood;
          }

          // 인물 정보 복원 (성별, 나이, 인종, 외모/스타일)
          if (mvSettings.characters && Array.isArray(mvSettings.characters)) {
            mvSettings.characters.forEach((char, index) => {
              const i = index + 1;
              const genderEl = document.getElementById(
                `mvCharacter${i}_gender`,
              );
              const ageEl = document.getElementById(`mvCharacter${i}_age`);
              const raceEl = document.getElementById(`mvCharacter${i}_race`);
              const appearanceEl = document.getElementById(
                `mvCharacter${i}_appearance`,
              );
              if (genderEl && char.gender) genderEl.value = char.gender;
              if (ageEl && char.age) ageEl.value = char.age;
              if (raceEl && char.race) raceEl.value = char.race;
              if (appearanceEl && char.appearance)
                appearanceEl.value = char.appearance;
            });
          }
        }

        // MV 씬 데이터 복원 (최신 데이터만 사용)
        if (
          marketing.mvScenes &&
          Array.isArray(marketing.mvScenes) &&
          marketing.mvScenes.length > 0
        ) {
          // 기존 씬 데이터 초기화
          window.currentScenes = [];

          // 최신 MV 씬 데이터로 교체 (깊은 복사)
          window.currentScenes = JSON.parse(JSON.stringify(marketing.mvScenes));
          console.log(
            "✅ MV 씬 데이터 복원:",
            window.currentScenes.length,
            "개 씬",
          );

          // 기존 UI 초기화 (중복 방지)
          const mvSceneOverviewContainer = document.getElementById(
            "mvSceneOverviewContainer",
          );
          const mvPromptsContainer =
            document.getElementById("mvPromptsContainer");
          if (mvSceneOverviewContainer) {
            mvSceneOverviewContainer.innerHTML = "";
          }
          if (mvPromptsContainer) {
            mvPromptsContainer.innerHTML = "";
          }

          // 씬 개요 섹션에 표시
          const mvSceneOverviewSection = document.getElementById(
            "mvSceneOverviewSection",
          );
          const mvResultsSection = document.getElementById("mvResultsSection");

          if (mvSceneOverviewSection && mvSceneOverviewContainer) {
            let html = `
                            <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border);">
                                <h3 style="margin: 0 0 10px 0; color: var(--text-primary); font-size: 1.1rem;">
                                    <i class="fas fa-film"></i> 씬별 개요
                                </h3>
                                <p style="margin: 0; color: var(--text-secondary); font-size: 0.85rem;">각 씬의 배경, 인물, 장소 등을 확인하고 수정할 수 있습니다.</p>
                            </div>
                        `;

            window.currentScenes.forEach((scene, index) => {
              const existingPrompt = (scene.prompt || "")
                .replace(/[가-힣]+/g, "")
                .trim();
              const existingPromptKo = scene.promptKo || "";

              html += `
                                <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border);" data-scene-index="${index}">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <h4 style="margin: 0; color: var(--text-primary);">씬 ${index + 1}</h4>
                                            <span style="color: var(--accent); font-weight: 600;">${scene.time || ""}</span>
                                        </div>
                                        <div style="display: flex; gap: 8px;">
                                            <button class="btn btn-small btn-primary" onclick="regenerateSceneOverviewPrompt(${index})" title="이 씬의 프롬프트 재생성" style="padding: 6px 12px; font-size: 0.8rem;">
                                                <i class="fas fa-sync-alt"></i> 재생성
                                            </button>
                                            <button class="btn btn-small btn-secondary" onclick="editSceneOverview(${index})" title="씬 수정" style="padding: 6px 12px; font-size: 0.8rem;">
                                                <i class="fas fa-edit"></i> 수정
                                            </button>
                                            <button id="copySceneOverviewBtn_${index}" class="btn btn-small btn-success" onclick="copySceneOverviewPromptEn(${index}, event)" title="영어 프롬프트 복사 (Midjourney용)" style="padding: 6px 12px; font-size: 0.8rem;">
                                                <i class="fas fa-copy"></i> 복사
                                            </button>
                                        </div>
                                    </div>
                                    <div style="margin-bottom: 10px;">
                                        <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">장면 설명:</label>
                                        <textarea class="scene-description" data-index="${index}" data-scene-index="${index}" style="width: 100%; min-height: 80px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.9rem; resize: vertical;">${escapeHtml(scene.scene || "")}</textarea>
                                    </div>
                                        <div style="margin-bottom: 10px;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                            <label style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">영어 프롬프트:</label>
                                            <button id="copySceneOverviewEnBtn_${index}" class="btn btn-small btn-success" onclick="copySceneOverviewPromptEn(${index}, event)" title="영어 프롬프트 복사 (Midjourney용)" style="padding: 4px 10px; font-size: 0.7rem;">
                                                <i class="fas fa-copy"></i> 복사
                                            </button>
                                        </div>
                                        <textarea 
                                            id="scene_overview_${index}_en" 
                                            class="scene-prompt-en-overview" 
                                            data-index="${index}"
                                            data-scene-index="${index}"
                                            onchange="syncSceneOverviewPromptTranslation(${index}, 'en')"
                                            style="width: 100%; min-height: 120px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.9rem; font-family: monospace; resize: vertical;"
                                            placeholder="영어 프롬프트를 입력하세요...">${escapeHtml(existingPrompt)}</textarea>
                                    </div>
                                    <div>
                                        <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">한글 프롬프트:</label>
                                        <textarea 
                                            id="scene_overview_${index}_ko" 
                                            class="scene-prompt-ko-overview" 
                                            data-index="${index}"
                                            data-scene-index="${index}"
                                            onchange="syncSceneOverviewPromptTranslation(${index}, 'ko')"
                                            style="width: 100%; min-height: 120px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.9rem; resize: vertical;"
                                            placeholder="한글 프롬프트를 입력하세요...">${escapeHtml(existingPromptKo)}</textarea>
                                    </div>
                                </div>
                            `;
            });
            mvSceneOverviewContainer.innerHTML = html;
          }

          // MV 결과 섹션도 표시 (확정된 프롬프트가 있으면)
          if (mvResultsSection && mvPromptsContainer) {
            mvResultsSection.style.display = "block";

            const totalImages = document.getElementById("mvTotalImages");
            if (totalImages) {
              totalImages.textContent = window.currentScenes.length;
            }

            // 개별 씬 프롬프트 표시
            let html = "";

            window.currentScenes.forEach((scene, index) => {
              const sceneId = `scene_${index}`;
              const scenePrompt = escapeHtml(scene.prompt || "");
              const scenePromptKo = escapeHtml(scene.promptKo || "");
              const sceneDescription = escapeHtml(scene.scene || "장면 설명");

              html += `
                                <div class="mv-prompt-item" style="margin-bottom: 25px; padding: 20px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                        <h4 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">씬 ${index + 1}</h4>
                                        <div style="display: flex; gap: 8px; align-items: center;">
                                            <span style="color: var(--accent); font-weight: 600; font-size: 0.9rem;">${scene.time || ""}</span>
                                            <button class="btn btn-small btn-primary" onclick="regenerateScenePrompt(${index})" style="padding: 4px 8px; font-size: 0.75rem;">재생성</button>
                                            <button class="btn btn-small btn-success" onclick="saveScenePrompt(${index})" style="padding: 4px 8px; font-size: 0.75rem;">저장</button>
                                        </div>
                                    </div>
                                    <div style="margin-bottom: 15px; padding: 12px; background: var(--bg-input); border-radius: 6px;">
                                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">장면:</div>
                                        <div style="color: var(--text-primary);">${sceneDescription}</div>
                                    </div>
                                    <div style="margin-bottom: 10px;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                            <label style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">영어 프롬프트</label>
                                            <button id="copyScenePromptBtn_${index}" class="btn btn-small btn-success" onclick="copyScenePromptEn(${index}, event)" title="영어 프롬프트 복사 (Midjourney용)" style="padding: 4px 10px; font-size: 0.75rem;">
                                                <i class="fas fa-copy"></i> 복사
                                            </button>
                                        </div>
                                        <textarea 
                                            id="${sceneId}_en" 
                                            class="scene-prompt-en"
                                            data-scene-index="${index}"
                                            style="width: 100%; min-height: 100px; padding: 12px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; font-family: monospace; font-size: 0.9rem; color: var(--text-primary); resize: vertical;"
                                            onchange="syncScenePromptTranslation(${index}, 'en')"
                                            placeholder="영어 프롬프트를 입력하세요...">${scenePrompt}</textarea>
                                    </div>
                                    <div>
                                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">한글 번역본</label>
                                        <textarea 
                                            id="${sceneId}_ko" 
                                            class="scene-prompt-ko"
                                            data-scene-index="${index}"
                                            style="width: 100%; min-height: 100px; padding: 12px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.9rem; color: var(--text-primary); resize: vertical;"
                                            onchange="syncScenePromptTranslation(${index}, 'ko')"
                                            placeholder="한글 프롬프트를 입력하세요...">${scenePromptKo}</textarea>
                                    </div>
                                </div>
                            `;
            });
            mvPromptsContainer.innerHTML = html;
          }
        }

        // 썸네일/배경/인물 프롬프트 복원
        if (marketing.mvPrompts) {
          const mvPrompts = marketing.mvPrompts;
          if (mvPrompts.thumbnailEn) {
            const el = document.getElementById("mvThumbnailPromptEn");
            if (el) el.value = mvPrompts.thumbnailEn;
          }
          if (mvPrompts.thumbnailKo) {
            const el = document.getElementById("mvThumbnailPromptKo");
            if (el) el.value = mvPrompts.thumbnailKo;
          }
          if (mvPrompts.backgroundDetailEn) {
            const el = document.getElementById("mvBackgroundDetailPromptEn");
            if (el) el.value = mvPrompts.backgroundDetailEn;
          }
          if (mvPrompts.backgroundDetailKo) {
            const el = document.getElementById("mvBackgroundDetailPromptKo");
            if (el) el.value = mvPrompts.backgroundDetailKo;
          }
          if (mvPrompts.characterDetailEn) {
            const el = document.getElementById("mvCharacterDetailPromptEn");
            if (el) el.value = mvPrompts.characterDetailEn;
          }
          if (mvPrompts.characterDetailKo) {
            const el = document.getElementById("mvCharacterDetailPromptKo");
            if (el) el.value = mvPrompts.characterDetailKo;
          }
        }
      }
    }

    // 수정 모드 비활성화 (읽기 전용 모드로 시작)
    window.editMode = false;
    if (typeof window.updateEditModeUI === "function") {
      window.updateEditModeUI();
    }
    if (typeof window.setReadOnlyMode === "function") {
      window.setReadOnlyMode(true);
    }

    // 마지막 단계로 이동하기 전에 모든 데이터 복원 확인
    console.log("📊 프로젝트 데이터 복원 상태:", {
      "1단계": {
        title: !!title,
        originalLyrics: !!originalLyrics,
        manualStylePrompt: !!manualStylePrompt,
      },
      "2단계": {
        sunoLyrics: !!sunoLyrics,
        stylePrompt: !!stylePrompt,
      },
      "4단계": {
        finalizedLyrics: !!finalizedLyrics,
        finalizedStyle: !!finalizedStyle,
      },
      "5단계": {
        finalLyrics: !!finalLyrics,
        finalStyle: !!finalStyle,
      },
    });

    // 마지막 단계로 이동
    const lastStep = foundProject.lastStep || 1;
    if (typeof window.goToStep === "function") {
      window.goToStep(lastStep, false, true);
    }
    // 로드 직후 단계 완료 배지 갱신 (4·5단계는 currentProject.data 기준으로도 표시)
    if (typeof window.updateStepProgress === "function") {
      window.updateStepProgress();
    }

    // 4단계 또는 5단계로 이동한 경우 추가 데이터 복원 확인
    if (lastStep === 4 || lastStep === 5) {
      setTimeout(() => {
        // 4단계 데이터 재검증
        if (lastStep >= 4) {
          const finalizedLyricsEl = document.getElementById("finalizedLyrics");
          const finalizedStyleEl = document.getElementById("finalizedStyle");

          if (
            finalizedLyricsEl &&
            !finalizedLyricsEl.value &&
            finalizedLyrics
          ) {
            console.log("⚠️ 4단계 가사가 비어있어 재복원 시도");
            finalizedLyricsEl.value = finalizedLyrics;
          }

          if (finalizedStyleEl && !finalizedStyleEl.value && finalizedStyle) {
            console.log("⚠️ 4단계 스타일이 비어있어 재복원 시도");
            finalizedStyleEl.value = finalizedStyle;
          }
        }

        // 5단계 데이터 재검증
        if (lastStep === 5) {
          const finalLyricsEl = document.getElementById("finalLyrics");
          const finalStyleEl = document.getElementById("finalStyle");

          if (finalLyricsEl && !finalLyricsEl.textContent && finalLyrics) {
            console.log("⚠️ 5단계 가사가 비어있어 재복원 시도");
            finalLyricsEl.textContent = finalLyrics;
          }

          if (finalStyleEl && !finalStyleEl.textContent && finalStyle) {
            console.log("⚠️ 5단계 스타일이 비어있어 재복원 시도");
            finalStyleEl.textContent = finalStyle;
          }
        }
        if (typeof window.updateStepProgress === "function") {
          window.updateStepProgress();
        }
      }, 500);
    }

    // MV 프롬프트가 있으면 MV 섹션 표시 (6단계인 경우)
    // 이미 위에서 처리했으므로 중복 표시 방지
    // (사이드바는 사용자가 닫을 때만 숨김 - 프로젝트 로드 시 자동으로 닫지 않음)

    console.log(
      "✅ 프로젝트 로드 완료 - 모든 단계 데이터 로드됨 (읽기 전용 모드)",
    );
  } catch (error) {
    console.error("프로젝트 로드 오류:", error);
    alert("프로젝트 로드 중 오류가 발생했습니다:\n\n" + error.message);
  }
};

// --- Extracted isValidISOString ---
function isValidISOString(str) {
  if (typeof str !== "string") return false;
  const date = new Date(str);
  return date instanceof Date && !isNaN(date);
}

window.isValidISOString = isValidISOString;

// --- Extracted normalizeProjectData ---
window.normalizeProjectData = function (project) {
  const normalized = { ...project };

  // 키 이름 통일 (최상위)
  if (normalized.finalLyrics && !normalized.finalizedLyrics) {
    normalized.finalizedLyrics = normalized.finalLyrics;
  }
  if (normalized.finalStyle && !normalized.finalizedStylePrompt) {
    normalized.finalizedStylePrompt = normalized.finalStyle;
  }

  // data 객체 내부 키 통일 (저장/로드 호환)
  if (normalized.data && typeof normalized.data === "object") {
    const d = normalized.data;
    if (d.finalLyrics && !d.finalizedLyrics) {
      d.finalizedLyrics = d.finalLyrics;
    }
    if (d.finalStyle && !d.finalizedStyle) {
      d.finalizedStyle = d.finalStyle;
    }
  }

  // 배열 보장
  if (normalized.genres && !Array.isArray(normalized.genres)) {
    normalized.genres = [normalized.genres];
  }

  // 날짜 보장
  const now = new Date().toISOString();
  if (!normalized.createdAt) {
    normalized.createdAt = now;
  }
  if (!normalized.updatedAt) {
    normalized.updatedAt = now;
  }

  return normalized;
};

// --- Extracted saveCurrentProject ---
window.saveCurrentProject = function () {
  try {
    // 각 단계에서 "저장" 버튼을 눌러도 1~6단계 전체 데이터가 수집·유지됩니다.
    // 현재 단계가 아닌 항목은 DOM이 비어 있으면 기존 저장값을 덮어쓰지 않아, 불러올 때 모든 상태가 그대로 복원됩니다.
    // 현재 프로젝트 ID가 없으면 새 프로젝트 생성
    let projectId = window.currentProjectId;
    if (!projectId) {
      projectId =
        "proj_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      window.currentProjectId = projectId;
    }

    // 현재 UI에서 프로젝트 데이터 수집 (모든 단계) — DOM 없으면 기존 값 유지
    const existing = window.currentProject?.data || {};

    const titleFromSongTitle =
      document.getElementById("songTitle")?.value || "";
    const titleFromSunoTitle =
      document.getElementById("sunoTitle")?.value || "";
    const titleFromFinalTitle =
      document.getElementById("finalTitleText")?.textContent || "";
    const projectTitle =
      titleFromSongTitle ||
      titleFromSunoTitle ||
      titleFromFinalTitle ||
      window.currentProject?.title ||
      "제목 없음";

    const project = {
      id: projectId,
      title: projectTitle,
      originalLyrics:
        document.getElementById("originalLyrics")?.value ||
        existing.originalLyrics ||
        "",
      manualStylePrompt:
        document.getElementById("manualStylePrompt")?.value ||
        existing.manualStylePrompt ||
        "",
      sunoLyrics:
        document.getElementById("sunoLyrics")?.value ||
        existing.sunoLyrics ||
        "",
      stylePrompt:
        document.getElementById("stylePrompt")?.value ||
        existing.stylePrompt ||
        "",
      savedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: window.currentProject?.createdAt || new Date().toISOString(),
      lastStep: window.currentProject?.lastStep || 1,
      data: {},
    };

    // 1단계: 가사 작성 (DOM 값이 있으면 사용, 없으면 기존 데이터 유지)
    project.data.originalLyrics =
      (document.getElementById("originalLyrics")?.value || "").trim() ||
      existing.originalLyrics ||
      "";
    project.data.manualStylePrompt =
      (document.getElementById("manualStylePrompt")?.value || "").trim() ||
      existing.manualStylePrompt ||
      "";

    // 1단계 선택 태그 저장 (장르, 분위기, 시대, 테마 등)
    const step1TagIds = [
      "genreTags",
      "moodTags",
      "eraTags",
      "themeTags",
      "perspectiveTags",
      "timeTags",
      "specialTags",
      "regionTags",
    ];
    project.data.step1Tags =
      existing.step1Tags && typeof existing.step1Tags === "object"
        ? { ...existing.step1Tags }
        : {};
    step1TagIds.forEach((id) => {
      const key = id.replace("Tags", "");
      if (document.getElementById(id)) {
        project.data.step1Tags[key] =
          typeof window.getSelectedTags === "function"
            ? window.getSelectedTags(id)
            : [];
      }
    });

    // 추가 키워드 저장
    const additionalKeywordsEl = document.getElementById("additionalKeywords");
    if (additionalKeywordsEl) {
      project.data.additionalKeywords = additionalKeywordsEl.value.trim();
    } else if (existing.additionalKeywords) {
      project.data.additionalKeywords = existing.additionalKeywords;
    }

    // 가사 길이 태그 저장
    const lengthContainer = document.getElementById("lyricsLengthTags");
    if (lengthContainer) {
      const activeLengthBtn =
        lengthContainer.querySelector(".length-btn.active");
      project.data.lyricsLength = activeLengthBtn
        ? activeLengthBtn.getAttribute("data-value")
        : "";
    } else if (existing.lyricsLength) {
      project.data.lyricsLength = existing.lyricsLength;
    }

    // 2단계: 수노 변환 (DOM 값이 있으면 사용, 없으면 기존 데이터 유지)
    const sunoTitle =
      document.getElementById("sunoTitle")?.value ||
      document.getElementById("songTitle")?.value ||
      "";
    project.data.sunoLyrics =
      (document.getElementById("sunoLyrics")?.value || "").trim() ||
      existing.sunoLyrics ||
      "";
    project.data.stylePrompt =
      (document.getElementById("stylePrompt")?.value || "").trim() ||
      existing.stylePrompt ||
      "";

    // 2단계 선택 태그·템포 저장
    const step2TagIds = [
      "audioFormatTags",
      "sunoVenueTags",
      "vocalStyle",
      "instrumentTags",
    ];
    project.data.step2Tags =
      existing.step2Tags && typeof existing.step2Tags === "object"
        ? { ...existing.step2Tags }
        : {};
    step2TagIds.forEach((id) => {
      const key =
        id === "sunoVenueTags"
          ? "venue"
          : id === "audioFormatTags"
            ? "audioFormat"
            : id === "instrumentTags"
              ? "instruments"
              : id === "vocalStyle"
                ? "vocalStyle"
                : id;
      if (document.getElementById(id)) {
        project.data.step2Tags[key] =
          typeof window.getSelectedTags === "function"
            ? window.getSelectedTags(id)
            : [];
      }
    });
    const tempoVal =
      document.getElementById("tempoSlider")?.value ||
      document.getElementById("tempoValue")?.textContent ||
      "";
    if (tempoVal) project.data.tempo = tempoVal;
    else if (existing.tempo) project.data.tempo = existing.tempo;

    // 2단계 파트별 보컬 스타일 지정 저장
    if (
      window.vocalPartAssignments &&
      typeof window.vocalPartAssignments === "object"
    ) {
      project.data.vocalPartAssignments = JSON.parse(
        JSON.stringify(window.vocalPartAssignments),
      );
    } else if (existing.vocalPartAssignments) {
      project.data.vocalPartAssignments = JSON.parse(
        JSON.stringify(existing.vocalPartAssignments),
      );
    }

    // 3단계: AI 분석 결과 (currentProject.data 또는 기존 data 유지)
    if (
      window.currentProject &&
      window.currentProject.data &&
      window.currentProject.data.analysis
    ) {
      project.data.analysis = JSON.parse(
        JSON.stringify(window.currentProject.data.analysis),
      );
    } else if (existing.analysis) {
      project.data.analysis = JSON.parse(JSON.stringify(existing.analysis));
    }
    if (
      window.currentProject &&
      window.currentProject.data &&
      window.currentProject.data.feedbacks
    ) {
      project.data.feedbacks = JSON.parse(
        JSON.stringify(window.currentProject.data.feedbacks),
      );
    } else if (existing.feedbacks) {
      project.data.feedbacks = JSON.parse(JSON.stringify(existing.feedbacks));
    }

    // 4단계: 최종 확정 데이터 (DOM 우선, 없으면 기존 데이터 보존 - 다른 단계에서 저장해도 덮어쓰지 않음)
    const finalizedLyricsDom = (
      document.getElementById("finalizedLyrics")?.value || ""
    ).trim();
    const finalizedStyleDom = (
      document.getElementById("finalizedStyle")?.value || ""
    ).trim();
    const finalizedLyricsValue =
      finalizedLyricsDom ||
      existing.finalizedLyrics ||
      existing.finalLyrics ||
      "";
    const finalizedStyleValue =
      finalizedStyleDom || existing.finalizedStyle || existing.finalStyle || "";
    project.data.finalizedLyrics = finalizedLyricsValue;
    project.data.finalizedStyle = finalizedStyleValue;

    // 5단계: 최종 출력 데이터 (DOM 우선, 없으면 4단계 또는 기존 데이터 보존)
    const finalLyricsEl = document.getElementById("finalLyrics");
    const finalStyleEl = document.getElementById("finalStyle");
    const finalLyricsDom = (finalLyricsEl?.textContent || "").trim();
    const finalStyleDom = (finalStyleEl?.textContent || "").trim();
    const finalLyricsValue =
      finalLyricsDom ||
      finalizedLyricsValue ||
      existing.finalLyrics ||
      existing.finalizedLyrics ||
      "";
    const finalStyleValue =
      finalStyleDom ||
      finalizedStyleValue ||
      existing.finalStyle ||
      existing.finalizedStyle ||
      "";

    project.data.finalLyrics = finalLyricsValue;
    project.data.finalStyle = finalStyleValue;

    // 5단계 데이터가 실제로 있을 때만 로그 (3단계에서 저장 시 콘솔 노이즈 감소)
    if (project.data.finalLyrics || project.data.finalStyle) {
      console.log("💾 5단계 데이터 저장:", {
        finalLyrics: project.data.finalLyrics
          ? project.data.finalLyrics.length + "자"
          : "없음",
        finalStyle: project.data.finalStyle
          ? project.data.finalStyle.length + "자"
          : "없음",
      });
    }

    // 6단계: 마케팅 자료 데이터 (DOM 값이 있으면 사용, 없으면 기존 데이터 유지)
    const existingMarketing = existing.marketing || {};
    project.data.marketing = { ...existingMarketing };

    // 현재 활성 단계 확인 (다른 단계에서 저장 시 6단계 데이터 덮어쓰기 방지)
    const activePanel = document.querySelector(".panel.active");
    const currentStep =
      activePanel && activePanel.id && activePanel.id.match(/panel(\d+)/)
        ? parseInt(activePanel.id.replace("panel", ""), 10)
        : 0;
    const isOnStep6 = currentStep === 6;

    const youtubeDescEl = document.getElementById("youtubeDesc");
    const youtubeVal = youtubeDescEl?.textContent?.trim() || "";
    if (youtubeVal) project.data.marketing.youtubeDesc = youtubeVal;
    else if (existingMarketing.youtubeDesc)
      project.data.marketing.youtubeDesc = existingMarketing.youtubeDesc;

    const tiktokDescEl = document.getElementById("tiktokDesc");
    const tiktokVal = tiktokDescEl?.textContent?.trim() || "";
    if (tiktokVal) project.data.marketing.tiktokDesc = tiktokVal;
    else if (existingMarketing.tiktokDesc)
      project.data.marketing.tiktokDesc = existingMarketing.tiktokDesc;

    const hashtagsEl = document.getElementById("hashtagsContent");
    const hashtagsVal = hashtagsEl?.textContent?.trim() || "";
    if (hashtagsVal) project.data.marketing.hashtags = hashtagsVal;
    else if (existingMarketing.hashtags)
      project.data.marketing.hashtags = existingMarketing.hashtags;

    const thumbnailsGridEl = document.getElementById("thumbnailsGrid");
    if (thumbnailsGridEl) {
      const thumbnailItems =
        thumbnailsGridEl.querySelectorAll(".thumbnail-item");
      if (thumbnailItems.length > 0) {
        const thumbnails = [];
        thumbnailItems.forEach((item) => {
          const textEl = item.querySelector('div[style*="font-weight: 600"]');
          if (textEl && textEl.textContent) {
            thumbnails.push(textEl.textContent.trim());
          }
        });
        if (thumbnails.length > 0) {
          project.data.marketing.thumbnails = thumbnails;
        }
      }
    }
    if (
      !project.data.marketing.thumbnails?.length &&
      existingMarketing.thumbnails?.length
    ) {
      project.data.marketing.thumbnails = existingMarketing.thumbnails;
    }

    // MV 설정/프롬프트/씬: 6단계일 때만 DOM에서 수집, 아니면 기존 저장값 유지
    if (isOnStep6) {
      const mvSettings = {
        era: document.getElementById("mvEra")?.value || "",
        country: document.getElementById("mvCountry")?.value || "",
        location:
          typeof window.getMVLocationValues === "function"
            ? window.getMVLocationValues()
            : [],
        characterCount:
          document.getElementById("mvCharacterCount")?.value || "1",
        customSettings:
          document.getElementById("mvCustomSettings")?.value || "",
        lighting: document.getElementById("mvLighting")?.value || "",
        cameraWork: document.getElementById("mvCameraWork")?.value || "",
        mood: document.getElementById("mvMood")?.value || "",
      };
      const characterCount = parseInt(mvSettings.characterCount) || 1;
      const characters = [];
      for (let i = 1; i <= characterCount; i++) {
        const gender =
          document.getElementById(`mvCharacter${i}_gender`)?.value || "";
        const age = document.getElementById(`mvCharacter${i}_age`)?.value || "";
        const race =
          document.getElementById(`mvCharacter${i}_race`)?.value || "";
        const appearance =
          document.getElementById(`mvCharacter${i}_appearance`)?.value || "";
        if (gender || age || race || appearance) {
          characters.push({ gender, age, race, appearance });
        }
      }
      mvSettings.characters = characters;
      project.data.marketing.mvSettings = mvSettings;

      const mvPrompts = {
        thumbnailEn:
          document.getElementById("mvThumbnailPromptEn")?.value || "",
        thumbnailKo:
          document.getElementById("mvThumbnailPromptKo")?.value || "",
        backgroundDetailEn:
          document.getElementById("mvBackgroundDetailPromptEn")?.value || "",
        backgroundDetailKo:
          document.getElementById("mvBackgroundDetailPromptKo")?.value || "",
        characterDetailEn:
          document.getElementById("mvCharacterDetailPromptEn")?.value || "",
        characterDetailKo:
          document.getElementById("mvCharacterDetailPromptKo")?.value || "",
      };
      project.data.marketing.mvPrompts = mvPrompts;

      if (window.currentScenes && window.currentScenes.length > 0) {
        const descriptions = document.querySelectorAll(".scene-description");
        descriptions.forEach((desc, index) => {
          if (window.currentScenes[index]) {
            window.currentScenes[index].scene = desc.value;
          }
        });
        window.currentScenes.forEach((scene, index) => {
          const enEl = document.getElementById(`scene_overview_${index}_en`);
          const koEl = document.getElementById(`scene_overview_${index}_ko`);
          if (enEl) window.currentScenes[index].prompt = enEl.value;
          if (koEl) window.currentScenes[index].promptKo = koEl.value;
        });
        project.data.marketing.mvScenes = JSON.parse(
          JSON.stringify(window.currentScenes),
        );
      }
    } else {
      if (existingMarketing.mvSettings)
        project.data.marketing.mvSettings = existingMarketing.mvSettings;
      if (existingMarketing.mvPrompts)
        project.data.marketing.mvPrompts = existingMarketing.mvPrompts;
      if (
        existingMarketing.mvScenes &&
        Array.isArray(existingMarketing.mvScenes)
      ) {
        project.data.marketing.mvScenes = existingMarketing.mvScenes;
      }
    }

    // 현재 활성화된 단계 확인 (이미 도달한 단계보다 낮은 값으로 덮어쓰지 않음)
    const activePanelForLastStep = document.querySelector(".panel.active");
    const existingLastStep = Math.max(1, parseInt(project.lastStep, 10) || 1);
    if (activePanelForLastStep) {
      const panelId = activePanelForLastStep.id;
      const stepMatch = panelId.match(/panel(\d+)/);
      if (stepMatch) {
        const currentStep = parseInt(stepMatch[1], 10);
        project.lastStep = Math.max(currentStep, existingLastStep);
      }
    } else {
      project.lastStep = existingLastStep;
    }

    // 기존 프로젝트 데이터 병합 (data 객체 구조 유지)
    if (window.currentProject) {
      // data 객체가 있으면 병합 (현재 수집한 데이터 우선)
      if (window.currentProject.data) {
        if (!project.data) {
          project.data = {};
        }
        // 기존 data와 현재 수집한 data 병합 (현재 수집한 데이터가 우선)
        Object.assign(project.data, window.currentProject.data, project.data);

        // 5단계 데이터가 있으면 명시적으로 저장 (중요!)
        if (project.data.finalLyrics) {
          // 이미 설정됨
        } else if (window.currentProject.data.finalLyrics) {
          project.data.finalLyrics = window.currentProject.data.finalLyrics;
        }

        if (project.data.finalStyle) {
          // 이미 설정됨
        } else if (window.currentProject.data.finalStyle) {
          project.data.finalStyle = window.currentProject.data.finalStyle;
        }
      }
      // 나머지 속성 병합 (현재 수집한 데이터 우선)
      Object.assign(project, window.currentProject, project);
      // data 객체는 현재 수집한 것으로 설정
      if (project.data) {
        // 이미 설정됨
      } else if (window.currentProject.data) {
        project.data = window.currentProject.data;
      }
    }

    // localStorage에 저장
    let saved = false;
    const keys = [
      "musicCreatorProjects",
      "savedProjects",
      "sunoLyricsHistory",
      "stylePromptHistory",
    ];

    for (const key of keys) {
      let projects = null; // 변수를 try 블록 밖에서 선언
      try {
        const existingData = localStorage.getItem(key);
        projects = existingData ? JSON.parse(existingData) : [];

        if (!Array.isArray(projects)) {
          projects = [];
        }

        // 기존 프로젝트 찾기
        const existingIndex = projects.findIndex(
          (p) => p && p.id === projectId,
        );
        if (existingIndex !== -1) {
          projects[existingIndex] = project;
        } else {
          projects.push(project);
        }

        localStorage.setItem(key, JSON.stringify(projects));
        saved = true;
      } catch (e) {
        console.warn(`${key} 저장 실패:`, e);
        // QuotaExceededError인 경우 오래된 프로젝트 정리 후 재시도
        if (
          e.name === "QuotaExceededError" ||
          e.message.includes("quota") ||
          e.message.includes("Quota")
        ) {
          console.log(`🔄 ${key} 용량 초과, 오래된 프로젝트 정리 중...`);

          // projects가 없으면 다시 로드
          if (!projects || !Array.isArray(projects)) {
            try {
              const existingData = localStorage.getItem(key);
              projects = existingData ? JSON.parse(existingData) : [];
              if (!Array.isArray(projects)) {
                projects = [];
              }
            } catch (loadError) {
              console.warn(`${key} 데이터 로드 실패:`, loadError);
              projects = [];
            }
          }

          // 현재 프로젝트 추가 (아직 추가되지 않았다면)
          const hasCurrentProject = projects.some(
            (p) => p && p.id === projectId,
          );
          if (!hasCurrentProject) {
            projects.push(project);
          } else {
            const existingIndex = projects.findIndex(
              (p) => p && p.id === projectId,
            );
            if (existingIndex !== -1) {
              projects[existingIndex] = project;
            }
          }

          // 오래된 프로젝트 정리
          const cleaned = window.cleanOldProjects(key, projects, projectId);
          if (cleaned && Array.isArray(cleaned)) {
            try {
              localStorage.setItem(key, JSON.stringify(cleaned));
              saved = true;
              console.log(`✅ ${key} 정리 후 저장 성공`);
            } catch (retryError) {
              console.warn(`${key} 재시도 저장 실패:`, retryError);
            }
          }
        }
      }
    }

    // 데이터 정규화
    const normalizedProject = window.normalizeProjectData(project);

    // 데이터 검증
    const validation = window.validateProjectData(normalizedProject);

    // 저장 성공 여부 확인
    if (!saved) {
      console.error("❌ 프로젝트 저장 실패");
      const errorMsg =
        "❌ 프로젝트 저장에 실패했습니다.\n\n" +
        "원인: localStorage 용량이 가득 찼습니다.\n\n" +
        "해결 방법:\n" +
        "1. 설정 → 프로젝트 관리에서 오래된 프로젝트 삭제\n" +
        "2. 브라우저 개발자 도구(F12) → Application → Local Storage에서 수동 정리\n" +
        "3. 브라우저 캐시 및 쿠키 정리";
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(errorMsg);
      } else {
        alert(errorMsg);
      }
      return false;
    }

    // window.currentProject 업데이트 (저장된 최신 데이터로)
    // UI에서 수집한 최신 데이터로 업데이트하여 다음 단계 이동 시 복원되지 않도록 함
    window.currentProject = {
      ...normalizedProject,
      id: projectId,
      title: project.title,
      originalLyrics: project.originalLyrics,
      manualStylePrompt: project.manualStylePrompt,
      sunoLyrics: project.sunoLyrics,
      stylePrompt: project.stylePrompt,
      savedAt: project.savedAt,
      updatedAt: project.updatedAt,
      createdAt: project.createdAt,
      lastStep: (() => {
        // 현재 활성화된 단계 찾기
        const activeStep = document.querySelector(".step.active");
        if (activeStep) {
          const stepNum =
            parseInt(activeStep.getAttribute("data-step")) || null;
          if (stepNum) return stepNum;
        }
        // 패널에서 찾기
        const activePanel = document.querySelector(".panel.active");
        if (activePanel) {
          const panelId = activePanel.id;
          const match = panelId.match(/panel(\d+)/);
          if (match) return parseInt(match[1]);
        }
        // 기본값
        return window.currentProject?.lastStep || 1;
      })(),
      data: {
        ...normalizedProject.data,
        // UI에서 수집한 최신 데이터로 업데이트
        originalLyrics: project.data.originalLyrics,
        manualStylePrompt: project.data.manualStylePrompt,
        sunoLyrics: project.data.sunoLyrics,
        stylePrompt: project.data.stylePrompt,
        finalizedLyrics: project.data.finalizedLyrics,
        finalizedStyle: project.data.finalizedStyle,
        finalLyrics: project.data.finalLyrics,
        finalStyle: project.data.finalStyle,
        vocalPartAssignments: project.data.vocalPartAssignments,
        additionalKeywords: project.data.additionalKeywords,
        lyricsLength: project.data.lyricsLength,
        // 기존 데이터도 유지 (analysis, marketing 등)
        ...(normalizedProject.data || {}),
      },
    };
    window.currentProjectId = projectId;

    console.log("✅ window.currentProject 업데이트 완료:", {
      title: window.currentProject.title,
      hasData: !!window.currentProject.data,
      editMode: window.editMode,
      dataKeys: Object.keys(window.currentProject.data || {}),
    });

    // 프로젝트 리스트 새로고침
    if (typeof window.loadProjectList === "function") {
      window.loadProjectList();
    }

    // 저장 성공 피드백
    const savedProjectTitle =
      normalizedProject.title || project.title || "프로젝트";
    const savedTime = new Date().toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    console.log("✅ 프로젝트 저장 완료:", savedProjectTitle);

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ 프로젝트 저장 완료!\n\n제목: ${savedProjectTitle}\n저장 시간: ${savedTime}`,
      );
    } else {
      alert(
        `✅ 프로젝트 저장 완료!\n\n제목: ${savedProjectTitle}\n저장 시간: ${savedTime}`,
      );
    }
    if (typeof window.updateStepProgress === "function") {
      window.updateStepProgress();
    }

    // 프로젝트 리스트 새로고침 (debounce 적용)
    if (typeof window.loadProjectList === "function") {
      // 중복 호출 방지를 위한 debounce
      if (window.loadProjectListTimeout) {
        clearTimeout(window.loadProjectListTimeout);
      }
      window.loadProjectListTimeout = setTimeout(() => {
        try {
          window.loadProjectList();
          console.log("✅ 프로젝트 목록 갱신 완료");

          // 사이드바가 열려있으면 새로 저장된 프로젝트로 스크롤
          const sidebar = document.getElementById("sidebar");
          if (sidebar && sidebar.classList.contains("open")) {
            const projectList = document.getElementById("projectList");
            if (projectList && projectId) {
              setTimeout(() => {
                const savedProjectItem = projectList.querySelector(
                  `[data-project-id="${projectId}"]`,
                );
                if (savedProjectItem) {
                  savedProjectItem.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  });
                  savedProjectItem.style.transition = "background-color 0.3s";
                  savedProjectItem.style.backgroundColor = "var(--accent)";
                  setTimeout(() => {
                    savedProjectItem.style.backgroundColor = "";
                  }, 1000);
                }
              }, 200);
            }
          }
        } catch (listError) {
          console.warn("⚠️ 프로젝트 목록 갱신 실패:", listError);
        }
      }, 300); // debounce: 300ms 지연
    }

    return true;
  } catch (error) {
    console.error("❌ 프로젝트 저장 오류:", error);

    const errorMsg = `프로젝트 저장 중 오류가 발생했습니다:\n\n${error.message || error}\n\n해결 방법:\n1. 브라우저를 새로고침(F5) 후 다시 시도\n2. localStorage 용량 확인\n3. 브라우저 개발자 도구(F12)에서 오류 확인`;

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(`❌ ${errorMsg}`);
    } else {
      alert(`❌ ${errorMsg}`);
    }
    if (typeof window.updateStepProgress === "function") {
      window.updateStepProgress();
    }

    return false;
  }
};
