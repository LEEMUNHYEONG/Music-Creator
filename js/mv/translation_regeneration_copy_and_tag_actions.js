// === MV Step 6: Translation, regeneration, copy, and tag actions ===
// --- Restored Translation Sync Functions ---
window.syncMVPromptTranslation = async function (type, sourceLang) {
  try {
    let koId, enId;

    // 타입에 따라 ID 결정
    const typeMap = {
      thumbnail: { ko: "mvThumbnailPromptKo", en: "mvThumbnailPromptEn" },
      backgroundDetail: {
        ko: "mvBackgroundDetailPromptKo",
        en: "mvBackgroundDetailPromptEn",
      },
      characterDetail: {
        ko: "mvCharacterDetailPromptKo",
        en: "mvCharacterDetailPromptEn",
      },
      combined: { ko: "mvCombinedPromptKo", en: "mvCombinedPromptEn" },
      background: { ko: "mvBackgroundPromptKo", en: "mvBackgroundPromptEn" },
      character: { ko: "mvCharacterPromptKo", en: "mvCharacterPromptEn" },
    };

    const ids = typeMap[type];
    if (!ids) return;

    koId = ids.ko;
    enId = ids.en;

    const koEl = document.getElementById(koId);
    const enEl = document.getElementById(enId);

    if (!koEl || !enEl) return;

    if (sourceLang === "en") {
      const enText = enEl.value.trim();
      if (enText) {
        const translated = await translateEnglishToKoreanForScene(
          "prompt",
          enText,
        );
        if (translated) {
          koEl.value = translated;
        }
      } else {
        koEl.value = "";
      }
    } else if (sourceLang === "ko") {
      const koText = koEl.value.trim();
      if (koText) {
        const translated = await translateKoreanToEnglishForScene("prompt", koText);
        if (translated) {
          enEl.value = translated;
        }
      } else {
        enEl.value = "";
      }
    }
    
    // 수정 내용 실시간 저장
    if (typeof window.saveCurrentProject === "function") {
      window.saveCurrentProject();
    }
  } catch (error) {
    console.error("프롬프트 상호 번역 오류:", error);
  }
};

window.syncSceneOverviewPromptTranslation = async function (
  sceneIndex,
  sourceLang,
) {
  try {
    const enEl = document.getElementById(`scene_overview_${sceneIndex}_en`);
    const koEl = document.getElementById(`scene_overview_${sceneIndex}_ko`);

    if (!enEl || !koEl) {
      console.warn(`씬 ${sceneIndex}의 프롬프트 요소를 찾을 수 없습니다.`);
      return;
    }

    if (
      enEl.dataset.translating === "true" ||
      koEl.dataset.translating === "true"
    ) {
      return;
    }

    if (sourceLang === "en") {
      let enText = enEl.value.trim();
      const koreanPattern = /[가-힣]+/g;
      if (koreanPattern.test(enText)) {
        enText = enText.replace(koreanPattern, "").trim();
        enText = enText.replace(/\s+/g, " ").trim();
        enEl.value = enText;
      }

      if (enText) {
        enEl.dataset.translating = "true";
        try {
          const translated = await translateEnglishToKoreanForScene(
            "prompt",
            enText,
          );
          if (translated && koEl) {
            koEl.value = translated;
            if (window.currentScenes && window.currentScenes[sceneIndex]) {
              window.currentScenes[sceneIndex].prompt = enText;
              window.currentScenes[sceneIndex].promptKo = translated;
            }
          }
        } catch (error) {
          console.error("영어→한글 번역 오류:", error);
        } finally {
          enEl.dataset.translating = "false";
        }
      } else {
        koEl.value = "";
      }
    } else if (sourceLang === "ko") {
      let koText = koEl.value.trim();
      const englishPattern = /[a-zA-Z]+(?:\s+[a-zA-Z]+)*/g;
      if (englishPattern.test(koText)) {
        const words = koText.split(/\s+/);
        const koreanWords = words.filter((word) => /[가-힣]/.test(word));
        if (koreanWords.length > 0) {
          koText = koreanWords.join(" ");
        }
        koEl.value = koText;
      }

      if (koText) {
        koEl.dataset.translating = "true";
        try {
          const translated = await translateKoreanToEnglishForScene(
            "prompt",
            koText,
          );
          if (translated && enEl) {
            let cleanTranslated = translated.replace(/[가-힣]+/g, "").trim();
            cleanTranslated = cleanTranslated.replace(/\s+/g, " ").trim();
            enEl.value = cleanTranslated;
            if (window.currentScenes && window.currentScenes[sceneIndex]) {
              window.currentScenes[sceneIndex].prompt = cleanTranslated;
              window.currentScenes[sceneIndex].promptKo = koText;
            }
          }
        } catch (error) {
          console.error("한글→영어 번역 오류:", error);
        } finally {
          koEl.dataset.translating = "false";
        }
      } else {
        enEl.value = "";
      }
    }
    
    // 수정 내용 즉시 저장
    if (typeof window.saveCurrentProject === "function") {
      window.saveCurrentProject();
    }
  } catch (error) {
    console.error("씬 개요 프롬프트 상호 번역 오류:", error);
  }
};

window.syncScenePromptTranslation = async function (sceneIndex, sourceLang) {
  try {
    const sceneId = `scene_${sceneIndex}`;
    const enEl = document.getElementById(`${sceneId}_en`);
    const koEl = document.getElementById(`${sceneId}_ko`);

    if (!enEl || !koEl) return;

    if (sourceLang === "en") {
      const enText = enEl.value.trim();
      if (enText) {
        const translated = await translateEnglishToKoreanForScene(
          "prompt",
          enText,
        );
        if (translated) {
          koEl.value = translated;
          if (window.currentScenes && window.currentScenes[sceneIndex]) {
            window.currentScenes[sceneIndex].prompt = enText;
            window.currentScenes[sceneIndex].promptKo = translated;
          }
        }
      } else {
        koEl.value = "";
      }
    } else if (sourceLang === "ko") {
      const koText = koEl.value.trim();
      if (koText) {
        const translated = await translateKoreanToEnglishForScene("prompt", koText);
        if (translated) {
          enEl.value = translated;
          if (window.currentScenes && window.currentScenes[sceneIndex]) {
            window.currentScenes[sceneIndex].prompt = translated;
            window.currentScenes[sceneIndex].promptKo = koText;
          }
        }
      } else {
        enEl.value = "";
      }
    }
    
    // 수정 내용 즉시 저장
    if (typeof window.saveCurrentProject === "function") {
      window.saveCurrentProject();
    }
  } catch (error) {
    console.error("씬 프롬프트 상호 번역 오류:", error);
  }
};

// --- Restored Regeneration Functions ---
window.regenerateMVPrompt = async function (type) {
  try {
    const era = document.getElementById("mvEra")?.value || "";
    const country = document.getElementById("mvCountry")?.value || "";
    const location =
      typeof window.getMVLocationEnString === "function"
        ? window.getMVLocationEnString()
        : document.getElementById("mvLocation")?.value || "";
    const characterCount =
      document.getElementById("mvCharacterCount")?.value || "1";
    const customSettings =
      document.getElementById("mvCustomSettings")?.value || "";
    const lighting = document.getElementById("mvLighting")?.value || "";
    const cameraWork = document.getElementById("mvCameraWork")?.value || "";
    const mood = document.getElementById("mvMood")?.value || "";

    const characters = [];
    for (let i = 1; i <= parseInt(characterCount); i++) {
      const gender =
        document.getElementById(`mvCharacter${i}_gender`)?.value || "";
      const appearance =
        document.getElementById(`mvCharacter${i}_appearance`)?.value || "";
      if (gender || appearance) {
        characters.push({ gender, appearance });
      }
    }

    if (type === "thumbnail" || type === "background" || type === "character") {
      await window.regenerateSingleStylePrompt(type);
    }

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(`✅ ${type} 프롬프트가 재생성되었습니다!`);
    }

    const btnIdMap = {
      thumbnail: "copyMVThumbnailBtn",
      background: "copyMVBackgroundBtn",
      character: "copyMVCharacterBtn",
    };
    const mainBtn = document.getElementById(btnIdMap[type]);
    if (mainBtn) {
      mainBtn.innerHTML =
        mainBtn.dataset.originalHTML || '<i class="fas fa-copy"></i> 복사';
      mainBtn.disabled = false;
      mainBtn.classList.remove("copied");
    }
    const overviewBtn = document.querySelector(
      '.copy-mv-overview-btn[data-type="' + type + '"]',
    );
    if (overviewBtn) {
      overviewBtn.innerHTML =
        overviewBtn.dataset.originalHTML || '<i class="fas fa-copy"></i> 복사';
      overviewBtn.disabled = false;
      overviewBtn.classList.remove("copied");
    }
  } catch (error) {
    console.error("프롬프트 재생성 오류:", error);
    alert("프롬프트 재생성 중 오류가 발생했습니다:\n\n" + error.message);
  }
};

window.regenerateSingleStylePrompt = async function (type) {
  try {
    const era = document.getElementById("mvEra")?.value || "";
    const country = document.getElementById("mvCountry")?.value || "";
    const location =
      typeof window.getMVLocationEnString === "function"
        ? window.getMVLocationEnString()
        : document.getElementById("mvLocation")?.value || "";
    const characterCount =
      document.getElementById("mvCharacterCount")?.value || "1";
    const customSettings =
      document.getElementById("mvCustomSettings")?.value || "";
    const lighting = document.getElementById("mvLighting")?.value || "";
    const cameraWork = document.getElementById("mvCameraWork")?.value || "";
    const mood = document.getElementById("mvMood")?.value || "";

    const characters = [];
    for (let i = 1; i <= parseInt(characterCount); i++) {
      const gender =
        document.getElementById(`mvCharacter${i}_gender`)?.value || "";
      const age = document.getElementById(`mvCharacter${i}_age`)?.value || "";
      const race = document.getElementById(`mvCharacter${i}_race`)?.value || "";
      const appearance =
        document.getElementById(`mvCharacter${i}_appearance`)?.value || "";
      if (gender || age || race || appearance) {
        characters.push({ gender, age, race, appearance });
      }
    }

    if (typeof window.showCopyIndicator === "function") {
      const typeLabels = {
        thumbnail: "썸네일",
        background: "배경",
        character: "인물",
      };
      window.showCopyIndicator(`⏳ ${typeLabels[type]} 프롬프트 재생성 중...`);
    }

    const finalLyrics =
      document.getElementById("finalLyrics")?.textContent ||
      document.getElementById("finalizedLyrics")?.value ||
      "";
    const stylePrompt = getMVFinalStylePromptText();
    const productionContextBlock = getMVProductionContextBlock();
    const cleanLyrics =
      typeof extractLyricsOnly === "function"
        ? extractLyricsOnly(finalLyrics)
        : finalLyrics;

    let characterInfo = "";
    if (characters && characters.length > 0) {
      characterInfo = characters
        .map((c, idx) => {
          const parts = [];
          if (c.gender) parts.push(c.gender);
          if (c.age) parts.push(c.age);
          if (c.race) parts.push(c.race);
          if (c.appearance) parts.push(c.appearance);
          return parts.length > 0 ? `인물${idx + 1}: ${parts.join(", ")}` : "";
        })
        .filter((s) => s.trim())
        .join("; ");
    }

    const geminiKey = window.getGeminiApiKey();
    let promptEn = "";
    let promptKo = "";

    if (geminiKey && geminiKey.startsWith("AIza")) {
      try {
        let taskDescription = "";
        let jsonKeyEn = "";
        let jsonKeyKo = "";

        if (type === "thumbnail") {
          taskDescription = `
1. **썸네일 프롬프트 (Thumbnail Prompt)**: 
   - MV 썸네일 이미지이자 대표 영상 소스용
   - **전체 가사의 핵심 감정과 분위기를 대표하는 장면** (전체 가사 내용을 구체적으로 반영)
   - **MV 프롬프트 상세 설정 반영**: 시대(${era}), 국가(${country}), 장소(${location}), 조명(${lighting}), 카메라(${cameraWork}), 분위기(${mood})를 융합
   - 인물, 배경, 조명, 구도 및 미세한 모션을 모두 포함
   - **인물 상세 정보 포함** (성별, 나이, 인종, 외모/스타일) - 설정의 인물 정보를 반영
   - **이미지/비디오 통합 고화질 키워드 필수 포함**: "ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio, professional photography, cinematic motion, dynamic camera movement, sharp focus, detailed lighting"`;
          jsonKeyEn = "thumbnailEn";
          jsonKeyKo = "thumbnailKo";
        } else if (type === "background") {
          taskDescription = `
1. **배경 프롬프트 (Background Prompt)**:
   - 배경 요소 중심 (인물은 없거나 원경 처럼 작게)
   - **전체 가사와 분위기를 반영한 장소 묘사 및 날씨/환경의 변화(바람, 입자 흩날림 등)**
   - **MV 프롬프트 상세 설정 반영**: 시대(${era}), 국가(${country}), 장소(${location}), 조명(${lighting}), 분위기(${mood})를 융합
   - 조명, 색감, 질감 상세 묘사 및 느리고 부드러운 카메라 전환 모션 포함
   - **이미지/비디오 통합 고화질 키워드 필수 포함**: "background-focused composition, ultra high quality, 8k resolution, photorealistic, detailed background, atmospheric lighting, slow panoramic panning, cinematic motion"`;
          jsonKeyEn = "backgroundEn";
          jsonKeyKo = "backgroundKo";
        } else if (type === "character") {
          // 캐릭터 시트 정보 수집
          let charSheetInfo = "";
          if (typeof window.getAllCharacterSheetsFull === "function") {
            charSheetInfo = window.getAllCharacterSheetsFull();
          }
          taskDescription = `
1. **인물 프롬프트 (Character Prompt)**:
   - 인물 중심 구성 및 세밀한 동작 묘사
   - **전체 가사의 감정을 인물 표정과 제스처에 세밀하게 반영**
   - **MV 프롬프트 상세 설정 반영**: 시대(${era}), 국가(${country}), 조명(${lighting}), 카메라(${cameraWork}), 분위기(${mood})를 융합
   - **인물 상세 정보 포함** (성별, 나이, 인종, 외모/스타일)
   - 인물의 눈빛 변화, 미세한 입술 움직임, 자연스러운 포즈 등 구체적 동작(motion) 명시
   - **이미지/비디오 통합 고화질 키워드 필수 포함**: "character-focused composition, ultra high quality, 8k resolution, photorealistic, natural pose, detailed facial features, subtle emotive motion, close-up tracking, sharp focus, beautiful lighting"
${charSheetInfo ? `   - **【캐릭터 디자인 시트 원본 — 외형 100% 일관성 유지 필수】 아래 캐릭터 시트의 외형(얼굴, 머리카락, 의상, 체형 등)을 정확하게 전부 반영하세요:**
${charSheetInfo}` : ""}`;
          jsonKeyEn = "characterEn";
          jsonKeyKo = "characterKo";
        }

        const prompt = `다음 음악 가사와 설정을 기반으로 **세밀하고 상세한** 영어 프롬프트와 한글 프롬프트를 1개만 생성하세요.

【가사】 (가장 중요 - 반드시 프롬프트에 구체적으로 반영하세요!)
${cleanLyrics}

【스타일】
${stylePrompt || "감성적인 발라드"}

${productionContextBlock}

【MV 설정】 (보조 참고용 - 가사 내용을 우선하되 융합)
- 시대: ${era || "현대"}
- 국가: ${country || "한국"}
- 장소: ${location || "도시"}
- 조명: ${lighting || "자연광"}
- 카메라: ${cameraWork || "중간 샷"}
- 분위기: ${mood || "감성적"}
- 인물: ${characterInfo || "1명"}
${customSettings ? `- 추가: ${customSettings}` : ""}

【작업 요구사항】
해당 프롬프트를 **매우 상세하고 구체적으로** 영어 한 단락으로 작성하세요 (150단어 내외의 긴 서술형 문장):
- **프롬프트 구조화 필수**: [핵심 피사체/장면 요약] -> [피사체의 외모, 표정, 동작] -> [배경, 환경, 날씨, 빛 반사 등 질감의 정밀 묘사] -> [조명, 색채, 분위기] -> [카메라 앵글 및 모션] -> [고화질 기술 키워드] 순으로 논리적이고 풍부하게 작성.
- 단순 단어 나열(쉼표 나열)을 지양하고, 완벽한 문장(Sentence)과 쉼표를 결합하여 문학적이고 시각적인 묘사로 채우세요.
${taskDescription}

**출력 형식 (순수 JSON만):**
\`\`\`json
{
  "${jsonKeyEn}": "완성된 영어 프롬프트 (150단어 내외, 전체 가사 내용 심층 반영, MV 설정 융합, 이미지+비디오 고화질 키워드 포함)",
  "${jsonKeyKo}": "완성된 한글 프롬프트 (150단어 내외, 전체 가사 내용 심층 반영, MV 설정 융합, 번역본)"
}
\`\`\`

**매우 중요:**
- **전체 가사 내용을 가장 우선적으로 깊이 있게 분석하여 반영하세요**
- **MV 프롬프트 상세 설정과 모션(카메라 워크 및 피사체의 움직임, 바람, 렌즈 플레어 등)을 반드시 정밀하게 묘사하세요**
- **이미지/비디오 통합 고화질 키워드는 필수로 포함**하세요
- 영어 프롬프트는 단일 단락, 순수 영어만 (한글 없음)
- JSON 형식만 출력`;

        // callGeminiWithAutoRoute: 실제 키는 직접 호출, 프록시 인증은 /api/gemini 사용
        const aiRawText = await (window.callGeminiWithAutoRoute || callGeminiWithAutoRoute)(
          prompt,
          { temperature: 0.8, maxOutputTokens: 2000 },
          geminiKey,
        );
        if (window.logApiUsage) window.logApiUsage("gemini");

        if (aiRawText) {
          const aiResponse = aiRawText;
          const aiPrompts = safeJsonParse(aiResponse);
          if (aiPrompts) {
            if (aiPrompts) {
              promptEn =
                aiPrompts[jsonKeyEn] ||
                aiPrompts[`${type}En`] ||
                aiPrompts[type] ||
                "";
              promptKo = aiPrompts[jsonKeyKo] || aiPrompts[`${type}Ko`] || "";

              if (
                !promptKo &&
                promptEn &&
                typeof translateEnglishToKoreanForScene === "function"
              ) {
                promptKo =
                  (await translateEnglishToKoreanForScene(type, promptEn)) || "";
              }
            } else {
               throw new Error("AI 응답을 JSON으로 파싱할 수 없습니다.");
            }
          } else {
            throw new Error("AI 응답에서 JSON 데이터를 찾을 수 없습니다.");
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          const detailedError = errData.error?.message || errData.error || response.statusText || "알 수 없는 API 오류";
          throw new Error(`API 오류: ${response.status} (${detailedError})`);
        }
      } catch (aiError) {
        console.warn(`⚠️ ${type} 개별 AI 프롬프트 생성 실패:`, aiError);
        alert(`프롬프트 재생성 실패: ${aiError.message}`);
        return;
      }
    }

    if (promptEn || promptKo) {
      // 리뷰 섹션 업데이트
      const reviewEnEl = document.getElementById(`review_${type}_en`);
      const reviewKoEl = document.getElementById(`review_${type}_ko`);
      if (reviewEnEl) reviewEnEl.value = promptEn;
      if (reviewKoEl) reviewKoEl.value = promptKo;

      // 메인 섹션 동기화 (기존 텍스트영역도 업데이트)
      const typeMap = {
        thumbnail: { en: "mvThumbnailPromptEn", ko: "mvThumbnailPromptKo" },
        background: {
          en: "mvBackgroundDetailPromptEn",
          ko: "mvBackgroundDetailPromptKo",
        },
        character: {
          en: "mvCharacterDetailPromptEn",
          ko: "mvCharacterDetailPromptKo",
        },
      };
      const mainEnEl = document.getElementById(typeMap[type].en);
      const mainKoEl = document.getElementById(typeMap[type].ko);
      if (mainEnEl) mainEnEl.value = promptEn;
      if (mainKoEl) mainKoEl.value = promptKo;

      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(`✅ 재생성 완료!`);
      }

      if (typeof window.saveCurrentProject === "function") {
        window.saveCurrentProject();
      }
    } else {
      alert("재생성 결과가 비어있습니다.");
    }
  } catch (error) {
    console.error(`스타일 프롬프트(${type}) 재생성 오류:`, error);
    alert("재생성 중 오류가 발생했습니다.");
  }
};

window.regenerateStylePrompts = async function () {
  try {
    const era = document.getElementById("mvEra")?.value || "";
    const country = document.getElementById("mvCountry")?.value || "";
    const location =
      typeof window.getMVLocationEnString === "function"
        ? window.getMVLocationEnString()
        : document.getElementById("mvLocation")?.value || "";
    const characterCount =
      document.getElementById("mvCharacterCount")?.value || "1";
    const customSettings =
      document.getElementById("mvCustomSettings")?.value || "";
    const lighting = document.getElementById("mvLighting")?.value || "";
    const cameraWork = document.getElementById("mvCameraWork")?.value || "";
    const mood = document.getElementById("mvMood")?.value || "";

    const characters = [];
    for (let i = 1; i <= parseInt(characterCount); i++) {
      const gender =
        document.getElementById(`mvCharacter${i}_gender`)?.value || "";
      const age = document.getElementById(`mvCharacter${i}_age`)?.value || "";
      const race = document.getElementById(`mvCharacter${i}_race`)?.value || "";
      const appearance =
        document.getElementById(`mvCharacter${i}_appearance`)?.value || "";
      if (gender || age || race || appearance) {
        characters.push({ gender, age, race, appearance });
      }
    }

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator("⏳ 스타일 프롬프트 재생성 중...");
    }

    const thumbnailPrompts = await generateMVThumbnailPrompts(
      era,
      country,
      location,
      characters,
      customSettings,
      lighting,
      cameraWork,
      mood,
    );

    const hasGeneratedPrompts =
      thumbnailPrompts &&
      [
        thumbnailPrompts.thumbnailEn,
        thumbnailPrompts.thumbnailKo,
        thumbnailPrompts.backgroundEn,
        thumbnailPrompts.backgroundKo,
        thumbnailPrompts.characterEn,
        thumbnailPrompts.characterKo,
      ].some((value) => typeof value === "string" && value.trim());

    if (hasGeneratedPrompts) {
      const enThumb = document.getElementById("review_thumbnail_en");
      const koThumb = document.getElementById("review_thumbnail_ko");
      if (enThumb) enThumb.value = thumbnailPrompts.thumbnailEn || "";
      if (koThumb) koThumb.value = thumbnailPrompts.thumbnailKo || "";

      const enBg = document.getElementById("review_background_en");
      const koBg = document.getElementById("review_background_ko");
      if (enBg) enBg.value = thumbnailPrompts.backgroundEn || "";
      if (koBg) koBg.value = thumbnailPrompts.backgroundKo || "";

      const enChar = document.getElementById("review_character_en");
      const koChar = document.getElementById("review_character_ko");
      if (enChar) enChar.value = thumbnailPrompts.characterEn || "";
      if (koChar) koChar.value = thumbnailPrompts.characterKo || "";
      
      // 저장 호출 (oninput은 수동 입력 시만 발생하므로 프로그램 변경 시 명시적 호출 필요)
      if (typeof window.saveCurrentProject === "function") {
          window.saveCurrentProject();
      }
    } else {
      alert("재생성 결과가 비어있습니다.");
    }
  } catch (error) {
    console.error("스타일 프롬프트 재생성 오류:", error);
    alert("재생성 중 오류가 발생했습니다.");
  }
};

window.editReviewPrompt = function (textareaId) {
  const el = document.getElementById(textareaId);
  if (el) {
    el.focus();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

window.copyReviewPrompt = async function (textareaId) {
  try {
    const el = document.getElementById(textareaId);
    if (!el || !el.value.trim()) {
      alert("복사할 내용이 없습니다.");
      return;
    }
    await navigator.clipboard.writeText(el.value);
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator("✅ 클립보드에 복사되었습니다!");
    } else {
      alert("✅ 클립보드에 복사되었습니다!");
    }
  } catch (err) {
    console.error("복사 오류:", err);
  }
};

window.saveSceneOverview = function () {
  if (!window.currentScenes) {
    alert("저장할 씬이 없습니다.");
    return;
  }

  const descriptions = document.querySelectorAll(".scene-description");

  descriptions.forEach((desc, index) => {
    if (window.currentScenes[index]) {
      window.currentScenes[index].scene = desc.value;
      window.currentScenes[index].visualDescription = desc.value;
    }
  });

  // 영어 프롬프트와 한글 프롬프트 각각 저장
  window.currentScenes.forEach((scene, index) => {
    if (typeof window.updateMVSceneTimelineFromEditor === "function") {
      window.updateMVSceneTimelineFromEditor(scene, index);
    }
    const enEl = document.getElementById(`scene_overview_${index}_en`);
    const koEl = document.getElementById(`scene_overview_${index}_ko`);

    if (enEl) {
      window.currentScenes[index].prompt = enEl.value;
    }
    if (koEl) {
      window.currentScenes[index].promptKo = koEl.value;
    }
  });

  alert("씬 개요가 저장되었습니다.");
};

// 저장 및 확정 통합 함수
// [제거됨] window.saveAndConfirmMVPrompts는 이제 js/step6.js에서 전담 관리합니다.

window.confirmSceneOverviewAndGenerate = async function (isSilent = false) {
  if (!window.currentScenes || window.currentScenes.length === 0) {
    if (!isSilent) alert("생성된 씬이 없습니다.");
    return;
  }

  const mvSceneOverviewSection = document.getElementById(
    "mvSceneOverviewSection",
  );
  const mvResultsSection = document.getElementById("mvResultsSection");

  if (mvSceneOverviewSection) {
    mvSceneOverviewSection.style.display = "none";
    mvSceneOverviewSection.classList.add("hidden");
  }

  // [수정] 초기 설정 섹션은 숨기지 않고 유지합니다. (사용자 요청: 재생성 버튼 유지)
  // const mvSettingsSection = document.getElementById("mvSettingsSection");
  // if (mvSettingsSection) {
  //   mvSettingsSection.style.display = "none";
  //   mvSettingsSection.classList.add("hidden");
  // }

  if (mvResultsSection) {
    mvResultsSection.style.display = "block";
    mvResultsSection.classList.remove("hidden");
    
    // 복원 중인 경우(silent) 화면 스크롤 생략
    if (!isSilent) {
      mvResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const totalImages = document.getElementById("mvTotalImages");
    if (totalImages) {
      totalImages.textContent = window.currentScenes.length;
    }

    if (typeof window.updateMVWorkflowSummary === "function") {
      window.updateMVWorkflowSummary();
    }

    // MV 설정 가져오기
    const era = document.getElementById("mvEra")?.value || "";
    const country = document.getElementById("mvCountry")?.value || "";
    const location =
      typeof window.getMVLocationEnString === "function"
        ? window.getMVLocationEnString()
        : document.getElementById("mvLocation")?.value || "";
    const characterCount =
      document.getElementById("mvCharacterCount")?.value || "1";
    const customSettings =
      document.getElementById("mvCustomSettings")?.value || "";
    const lighting = document.getElementById("mvLighting")?.value || "";
    const cameraWork = document.getElementById("mvCameraWork")?.value || "";
    const mood = document.getElementById("mvMood")?.value || "";

    // 인물 정보 수집
    const characters = [];
    for (let i = 1; i <= parseInt(characterCount); i++) {
      const gender =
        document.getElementById(`mvCharacter${i}_gender`)?.value || "";
      const appearance =
        document.getElementById(`mvCharacter${i}_appearance`)?.value || "";
      if (gender || appearance) {
        characters.push({ gender, appearance });
      }
    }

    // 통합/배경/인물 프롬프트 생성
    // generateMVDetailPrompts 함수는 "MV 프롬프트 상세" 섹션이 제거되어 더 이상 필요하지 않음
    // await generateMVDetailPrompts(era, country, location, characters, customSettings, lighting, cameraWork, mood);

    // 개별 씬 프롬프트 표시 (영어/한글 상호 번역 지원)
    const container = document.getElementById("mvPromptsContainer");
    if (container) {
      let html =
        typeof window.renderMVSceneTimelinePreview === "function"
          ? window.renderMVSceneTimelinePreview(window.currentScenes)
          : "";

      html += `
                    <div class="mv-video-tool-export-actions" style="margin: 0 0 18px; padding: 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center;">
                            <div>
                                <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">영상 생성 도구별 내보내기</div>
                                <div style="font-size: 0.84rem; color: var(--text-secondary);">이미지 번들, Runway/Pika/Kling용 씬별 프롬프트, 씬 표, 리허설 진단 보고서를 복사하거나 TXT로 저장합니다.</div>
                            </div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
                                <button class="btn btn-small btn-primary" onclick="copyMVImagePromptBundle()" style="padding: 6px 10px; font-size: 0.78rem;">이미지 복사</button>
                                <button class="btn btn-small btn-secondary" onclick="downloadMVImagePromptBundle()" style="padding: 6px 10px; font-size: 0.78rem;">이미지 TXT</button>
                                <button class="btn btn-small btn-secondary" onclick="showMarketingMVDiagnostics()" title="현재 프로젝트의 MV 리허설 진단 보고서를 표시하고 클립보드에 복사합니다." style="padding: 6px 10px; font-size: 0.78rem;">MV 진단 보고서 복사</button>
                                <button class="btn btn-small btn-secondary" onclick="downloadMarketingMVRehearsalReport()" title="현재 프로젝트의 MV 리허설 진단 보고서를 TXT 파일로 저장합니다." style="padding: 6px 10px; font-size: 0.78rem;">보고서 TXT</button>
                                <button class="btn btn-small btn-success" onclick="copyMVScenePromptTable()" style="padding: 6px 10px; font-size: 0.78rem;">표 복사</button>
                                <button class="btn btn-small btn-primary" onclick="copyMVVideoToolPrompts('runway')" style="padding: 6px 10px; font-size: 0.78rem;">Runway 복사</button>
                                <button class="btn btn-small btn-secondary" onclick="downloadMVVideoToolPrompts('runway')" style="padding: 6px 10px; font-size: 0.78rem;">TXT</button>
                                <button class="btn btn-small btn-primary" onclick="copyMVVideoToolPrompts('pika')" style="padding: 6px 10px; font-size: 0.78rem;">Pika 복사</button>
                                <button class="btn btn-small btn-secondary" onclick="downloadMVVideoToolPrompts('pika')" style="padding: 6px 10px; font-size: 0.78rem;">TXT</button>
                                <button class="btn btn-small btn-primary" onclick="copyMVVideoToolPrompts('kling')" style="padding: 6px 10px; font-size: 0.78rem;">Kling 복사</button>
                                <button class="btn btn-small btn-secondary" onclick="downloadMVVideoToolPrompts('kling')" style="padding: 6px 10px; font-size: 0.78rem;">TXT</button>
                            </div>
                        </div>
                    </div>
                `;

      window.currentScenes.forEach((scene, index) => {
        const sceneId = `scene_${index}`;
        html += `
                    <div class="mv-prompt-item" style="margin-bottom: 25px; padding: 20px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border);" data-result-scene-index="${index}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h4 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">씬 ${index + 1}</h4>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <span style="color: var(--accent); font-weight: 600; font-size: 0.9rem;">${scene.time}</span>
                                <button id="regenerateScenePromptBtn_${index}" class="btn btn-small btn-primary" onclick="regenerateScenePrompt(${index})" title="이 씬의 영어/한글 프롬프트를 다시 생성합니다. 생성 후 씬 데이터에 반영됩니다." style="padding: 4px 8px; font-size: 0.75rem;">재생성</button>
                                <span id="scene_${index}_dirty" class="mv-scene-unsaved-badge" data-scene-index="${index}" data-dirty="false" style="display: none; padding: 3px 8px; border-radius: 999px; background: rgba(245, 158, 11, 0.14); border: 1px solid rgba(245, 158, 11, 0.45); color: #f59e0b; font-size: 0.72rem; font-weight: 700;">수정 미저장</span>
                                <button id="saveScenePromptBtn_${index}" class="btn btn-small btn-success" onclick="saveScenePrompt(${index})" title="이 씬 카드의 영어/한글 프롬프트만 저장합니다. 전체 씬 확정은 상단의 현재 편집 내용 저장을 사용하세요." style="padding: 4px 8px; font-size: 0.75rem;">씬 저장</button>
                                </div>
                            </div>
                        <div style="margin-bottom: 15px; padding: 12px; background: var(--bg-input); border-radius: 6px;">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">장면:</div>
                            <div style="color: var(--text-primary);">${scene.scene || "장면 설명"}</div>
                                    </div>
                            <div style="margin-bottom: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <label style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">영어 프롬프트</label>
                                    <button id="copyScenePromptBtn_${index}" class="btn btn-small btn-success" onclick="copyScenePromptEn(${index}, event)" title="이 씬의 영어 프롬프트만 복사합니다. 복사는 저장과 별개입니다." style="padding: 4px 10px; font-size: 0.75rem;">
                                        <i class="fas fa-copy"></i> 복사
                                    </button>
                                </div>
                                <textarea 
                                    id="${sceneId}_en" 
                                    class="scene-prompt-en"
                                    data-scene-index="${index}"
                                    style="width: 100%; min-height: 100px; padding: 12px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; font-family: monospace; font-size: 0.9rem; color: var(--text-primary); resize: vertical;"
                                    onchange="syncScenePromptTranslation(${index}, 'en')"
                                    placeholder="영어 프롬프트를 입력하세요...">${scene.prompt || ""}</textarea>
                            </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">한글 번역본</label>
                            <textarea 
                                id="${sceneId}_ko" 
                                class="scene-prompt-ko"
                                data-scene-index="${index}"
                                style="width: 100%; min-height: 100px; padding: 12px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.9rem; color: var(--text-primary); resize: vertical;"
                                onchange="syncScenePromptTranslation(${index}, 'ko')"
                                placeholder="한글 프롬프트를 입력하세요...">${scene.promptKo || ""}</textarea>
                                    </div>
                            <div id="scene_${index}_action_status" class="mv-scene-action-status" data-state="saved" style="margin-top: 10px; padding: 8px 10px; border-radius: 6px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); color: var(--text-secondary); font-size: 0.78rem;">
                                저장 완료 상태입니다. 복사는 저장하지 않고 클립보드에만 보냅니다.
                            </div>
                                </div>
                            `;
      });
      container.innerHTML = html;
      if (typeof window.bindMVScenePromptDirtyTracking === "function") {
        window.bindMVScenePromptDirtyTracking(container);
      }

      // 각 씬의 한글 프롬프트 자동 생성 (영어가 있으면)
      window.currentScenes.forEach((scene, index) => {
        const sceneId = `scene_${index}`;
        const enEl = document.getElementById(`${sceneId}_en`);
        const koEl = document.getElementById(`${sceneId}_ko`);

        if (enEl && enEl.value && !koEl.value) {
          // 영어 프롬프트가 있으면 한글로 번역
          translateEnglishToKoreanForScene("prompt", enEl.value).then(
            (translated) => {
              if (koEl && translated) {
                koEl.value = translated;
              }
            },
          );
        }
      });
    }

    if (!isSilent) {
      mvResultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (window.currentProject) {
    if (!window.currentProject.data) {
      window.currentProject.data = {};
    }
    if (!window.currentProject.data.marketing) {
      window.currentProject.data.marketing = {};
    }
    if (typeof window.setMarketingMVScenes === "function") {
      window.setMarketingMVScenes(
        window.currentProject.data.marketing,
        window.currentScenes,
      );
    } else {
      window.currentProject.data.marketing.mvScenes = window.currentScenes;
    }
  }
};

window.saveAndConfirmMVPrompts = async function () {
  try {
    if (!window.currentScenes) {
      alert("저장할 씬이 없습니다.");
      return;
    }

    const descriptions = document.querySelectorAll(".scene-description");
    descriptions.forEach((desc, index) => {
      if (window.currentScenes[index]) {
        window.currentScenes[index].scene = desc.value;
      }
    });

    window.currentScenes.forEach((scene, index) => {
      if (typeof window.updateMVSceneTimelineFromEditor === "function") {
        window.updateMVSceneTimelineFromEditor(scene, index);
      }
      const enEl = document.getElementById(`scene_overview_${index}_en`);
      const koEl = document.getElementById(`scene_overview_${index}_ko`);
      if (enEl) window.currentScenes[index].prompt = enEl.value;
      if (koEl) window.currentScenes[index].promptKo = koEl.value;
    });

    const reviewMessage = getMVSceneQualityConfirmMessage(window.currentScenes);
    if (
      reviewMessage &&
      typeof window.confirm === "function" &&
      !window.confirm(reviewMessage)
    ) {
      if (typeof window.focusMVFirstReviewScene === "function") {
        window.focusMVFirstReviewScene();
      }
      return;
    }

    const mvSettings = {
      era: document.getElementById("mvEra")?.value || "",
      country: document.getElementById("mvCountry")?.value || "",
      location:
        typeof window.getMVLocationValues === "function"
          ? window.getMVLocationValues()
          : [],
      characterCount: document.getElementById("mvCharacterCount")?.value || "1",
      customSettings: document.getElementById("mvCustomSettings")?.value || "",
      lighting: document.getElementById("mvLighting")?.value || "",
      cameraWork: document.getElementById("mvCameraWork")?.value || "",
      mood: document.getElementById("mvMood")?.value || "",
    };

    const characters = [];
    for (let i = 1; i <= parseInt(mvSettings.characterCount); i++) {
      const gender =
        document.getElementById(`mvCharacter${i}_gender`)?.value || "";
      const age = document.getElementById(`mvCharacter${i}_age`)?.value || "";
      const race = document.getElementById(`mvCharacter${i}_race`)?.value || "";
      const appearance =
        document.getElementById(`mvCharacter${i}_appearance`)?.value || "";
      if (gender || age || race || appearance) {
        characters.push({ gender, age, race, appearance });
      }
    }
    mvSettings.characters = characters;

    const mvPrompts = {
      thumbnail: {
        en: document.getElementById("review_thumbnail_en")?.value || document.getElementById("mvThumbnailPromptEn")?.value || "",
        ko: document.getElementById("review_thumbnail_ko")?.value || document.getElementById("mvThumbnailPromptKo")?.value || ""
      },
      background: {
        en: document.getElementById("review_background_en")?.value || document.getElementById("mvBackgroundDetailPromptEn")?.value || "",
        ko: document.getElementById("review_background_ko")?.value || document.getElementById("mvBackgroundDetailPromptKo")?.value || ""
      },
      character: {
        en: document.getElementById("review_character_en")?.value || document.getElementById("mvCharacterDetailPromptEn")?.value || "",
        ko: document.getElementById("review_character_ko")?.value || document.getElementById("mvCharacterDetailPromptKo")?.value || ""
      }
    };

    if (!window.currentProject) window.currentProject = {};
    if (!window.currentProject.data) window.currentProject.data = {};
    if (!window.currentProject.data.marketing)
      window.currentProject.data.marketing = {};

    window.currentProject.data.marketing.mvSettings = JSON.parse(
      JSON.stringify(mvSettings),
    );
    window.currentProject.data.marketing.mvPrompts = JSON.parse(
      JSON.stringify(mvPrompts),
    );
    if (typeof window.setMarketingMVScenes === "function") {
      window.setMarketingMVScenes(
        window.currentProject.data.marketing,
        window.currentScenes,
      );
    } else {
      window.currentProject.data.marketing.mvScenes = JSON.parse(
        JSON.stringify(window.currentScenes),
      );
    }
    if (typeof window.syncMarketingMVModel === "function") {
      window.syncMarketingMVModel(window.currentProject.data.marketing);
    }

    if (typeof window.saveCurrentProject === "function") {
      const saved = window.saveCurrentProject();
      if (!saved) {
        alert("프로젝트 저장에 실패했습니다.");
        return;
      }
    }

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator("✅ 현재 편집 내용이 저장되었습니다.");
    } else {
      alert("현재 편집 내용이 저장되었습니다.");
    }

    // DOM 업데이트 (수정 영역의 값을 결과 영역의 텍스트 에어리어에 반영)
    if (document.getElementById("mvThumbnailPromptEn")) document.getElementById("mvThumbnailPromptEn").value = mvPrompts.thumbnail.en;
    if (document.getElementById("mvThumbnailPromptKo")) document.getElementById("mvThumbnailPromptKo").value = mvPrompts.thumbnail.ko;
    if (document.getElementById("mvBackgroundDetailPromptEn")) document.getElementById("mvBackgroundDetailPromptEn").value = mvPrompts.background.en;
    if (document.getElementById("mvBackgroundDetailPromptKo")) document.getElementById("mvBackgroundDetailPromptKo").value = mvPrompts.background.ko;
    if (document.getElementById("mvCharacterDetailPromptEn")) document.getElementById("mvCharacterDetailPromptEn").value = mvPrompts.character.en;
    if (document.getElementById("mvCharacterDetailPromptKo")) document.getElementById("mvCharacterDetailPromptKo").value = mvPrompts.character.ko;

    // app.js의 confirmSceneOverviewAndGenerate()를 호출하여 나머지 씬들을 렌더링하고 결과창 활성화
    if (typeof window.confirmSceneOverviewAndGenerate === 'function') {
      await window.confirmSceneOverviewAndGenerate();
    }

    // 결과창 가시성 최종 확인 (hidden 클래스 제거 필수)
    const mvResultsSection = document.getElementById("mvResultsSection");
    const marketingResult = document.getElementById("marketingResult");
    const mvSceneOverviewSection = document.getElementById("mvSceneOverviewSection");

    if (marketingResult) {
      marketingResult.classList.remove("hidden");
      marketingResult.style.display = "block";
    }
    if (mvResultsSection) {
      mvResultsSection.classList.remove("hidden");
      mvResultsSection.style.display = "block";
    }
    if (mvSceneOverviewSection) {
      mvSceneOverviewSection.classList.add("hidden");
      mvSceneOverviewSection.style.display = "none";
    }

    // MV 탭으로 전환하여 즉시 결과 확인 가능하게 함
    const mvTabBtn = document.querySelector('.tab-btn[data-tab="marketing-mv"]');
    if (mvTabBtn && typeof mvTabBtn.click === 'function') {
      mvTabBtn.click();
    }
  } catch (error) {
    console.error("저장 오류:", error);
    alert("저장 중 오류가 발생했습니다.");
  }
};

window.editSceneOverview = async function (sceneIndex, btnElement) {
  const sceneDiv = document
    .querySelector(`[data-scene-index="${sceneIndex}"]`)
    ?.closest('div[style*="margin-bottom: 20px"]');
  if (!sceneDiv) return;

  const enEl = document.getElementById(`scene_overview_${sceneIndex}_en`);
  const koEl = document.getElementById(`scene_overview_${sceneIndex}_ko`);
  if (!enEl) return;

  const btn =
    btnElement || document.getElementById(`editSceneOverviewBtn_${sceneIndex}`);
  if (!btn) return;

  const currentState = btn.dataset.state || "edit";

  if (currentState === "edit") {
    // 상태를 "수정중"으로 변경
    btn.dataset.state = "editing";
    btn.innerHTML = '<i class="fas fa-pencil-alt"></i> 수정중';
    btn.classList.remove("btn-secondary");
    btn.classList.add("btn-warning"); // Bootstrap warning class (yellowish) if available, or just rely on text
    btn.style.backgroundColor = "#ffc107"; // Yellow
    btn.style.color = "#000";
    btn.dataset.originalEn = enEl.value; // 원래 값 기억

    enEl.focus();
    enEl.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✏️ 씬 ${sceneIndex + 1} 영어 프롬프트 수정 모드`,
      );
    }
  } else if (currentState === "editing") {
    // 상태를 "수정완료"로 잠시 변경 후 원래 "수정"으로 복귀
    btn.dataset.state = "saving";
    btn.innerHTML = '<i class="fas fa-check"></i> 수정완료';
    btn.style.backgroundColor = "#198754"; // Green
    btn.style.color = "#fff";

    const originalEn = btn.dataset.originalEn;
    const currentEn = enEl.value.trim();

    // 입력 내용이 원본과 다르고 내용이 있으면 번역 실행
    if (currentEn !== originalEn && currentEn !== "") {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 번역 중...';
      try {
        if (typeof window.translateEnglishToKoreanForScene === "function") {
          const translatedKo = await window.translateEnglishToKoreanForScene(
            "prompt",
            currentEn,
          );
          if (translatedKo && koEl) {
            koEl.value = translatedKo;
            if (window.currentScenes && window.currentScenes[sceneIndex]) {
              window.currentScenes[sceneIndex].promptKo = translatedKo;
            }
          }
        }
      } catch (error) {
        console.error("수정 후 자동 번역 오류:", error);
      }
      btn.innerHTML = '<i class="fas fa-check"></i> 수정완료';
    }

    // 변경된 내용 저장
    if (window.currentScenes && window.currentScenes[sceneIndex]) {
      window.currentScenes[sceneIndex].prompt = currentEn;
      const descEl = document.querySelector(
        `.scene-description[data-scene-index="${sceneIndex}"]`,
      );
      if (descEl) {
        window.currentScenes[sceneIndex].scene = descEl.value;
      }
      const runwayEl = document.getElementById(
        `scene_overview_${sceneIndex}_runway`,
      );
      if (runwayEl) {
        window.currentScenes[sceneIndex].runwayPrompt = runwayEl.value;
      }
    }

    // 2초 후 다시 "수정" 상태로 원복
    setTimeout(() => {
      btn.dataset.state = "edit";
      btn.innerHTML = '<i class="fas fa-edit"></i> 수정';
      btn.classList.remove("btn-warning");
      btn.classList.add("btn-secondary");
      btn.style.backgroundColor = "";
      btn.style.color = "";
      btn.dataset.originalEn = currentEn; // 원본 업데이트
    }, 2000);
  }
};

window.copySceneOverviewPromptEn = async function (sceneIndex, event) {
  try {
    const btn = event
      ? (event.currentTarget || event.target.closest("button"))
      : document.getElementById(`copySceneOverviewBtn_${sceneIndex}`);

    const enEl = document.getElementById(`scene_overview_${sceneIndex}_en`);
    if (!enEl || !enEl.value.trim()) {
      alert("복사할 영어 프롬프트가 없습니다.");
      return;
    }

    let promptText = enEl.value.trim();
    promptText = promptText
      .replace(/\/\*\s*Scene\s+\d+\s*(of\s+\d+)?\s*\*\/\s*/gi, "")
      .trim();
    promptText = promptText
      .replace(/\[\s*Scene\s+\d+\s*(of\s+\d+)?\s*\]\s*/gi, "")
      .trim();
    promptText = promptText.replace(/\/\/.*$/gm, "").trim();
    promptText = promptText.replace(/\/\*[\s\S]*?\*\//g, "").trim();

    if (typeof window.cleanEnglishMidjourneyPrompt === "function") {
      promptText = window.cleanEnglishMidjourneyPrompt(promptText);
    }

    const totalScenes = window.currentScenes ? window.currentScenes.length : 0;
    const sceneNumber = sceneIndex + 1;
    const sceneLabel =
      totalScenes > 0
        ? `[Scene ${sceneNumber} of ${totalScenes}]`
        : `[Scene ${sceneNumber}]`;
    promptText = `${sceneLabel}\n${promptText}`;

    await navigator.clipboard.writeText(promptText);

    if (btn) {
      if (!btn.dataset.originalHTML) btn.dataset.originalHTML = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> 복사됨';
      btn.classList.add("copied");
      setTimeout(() => {
        btn.innerHTML = btn.dataset.originalHTML;
        btn.classList.remove("copied");
      }, 2000);
    }
  } catch (error) {
    console.error("프롬프트 복사 오류:", error);
  }
};

window.copySceneOverviewRunwayPrompt = async function (sceneIndex, event) {
  try {
    const enEl = document.getElementById(`scene_overview_${sceneIndex}_runway`);
    if (!enEl || !enEl.value.trim()) {
      alert("복사할 비디오 프롬프트가 없습니다.");
      return;
    }

    await navigator.clipboard.writeText(enEl.value.trim());

    const btn = event
      ? event.currentTarget
      : document.getElementById(`copySceneOverviewRunwayBtn_${sceneIndex}`);
    if (btn) {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = "✅ 복사됨";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove("copied");
      }, 2000);
    }
  } catch (error) {
    console.error("비디오 프롬프트 복사 오류:", error);
  }
};

window.regenerateSceneOverviewPrompt = async function (sceneIndex) {
  try {
    if (!window.currentScenes || !window.currentScenes[sceneIndex]) {
      alert("재생성할 씬이 없습니다.");
      return;
    }

    const scene = window.currentScenes[sceneIndex];
    if (typeof window.updateMVSceneTimelineFromEditor === "function") {
      window.updateMVSceneTimelineFromEditor(scene, sceneIndex);
    }
    const finalLyrics =
      document.getElementById("finalLyrics")?.textContent ||
      document.getElementById("finalizedLyrics")?.value ||
      document.getElementById("sunoLyrics")?.value ||
      "";
    const stylePrompt = getMVFinalStylePromptText();
    const productionContextBlock = getMVProductionContextBlock();

    const minutes = parseInt(document.getElementById("mvMinutes")?.value || 3);
    const seconds = parseInt(document.getElementById("mvSeconds")?.value || 30);
    const totalSeconds = minutes * 60 + seconds;

    const era = document.getElementById("mvEra")?.value || "";
    const country = document.getElementById("mvCountry")?.value || "";
    const location =
      typeof window.getMVLocationEnString === "function"
        ? window.getMVLocationEnString()
        : document.getElementById("mvLocation")?.value || "";
    const characterCount =
      document.getElementById("mvCharacterCount")?.value || "1";
    const customSettings =
      document.getElementById("mvCustomSettings")?.value || "";
    const lighting = document.getElementById("mvLighting")?.value || "";
    const cameraWork = document.getElementById("mvCameraWork")?.value || "";
    const mood = document.getElementById("mvMood")?.value || "";

    const characters = [];
    for (let i = 1; i <= parseInt(characterCount); i++) {
      const gender =
        document.getElementById(`mvCharacter${i}_gender`)?.value || "";
      const age = document.getElementById(`mvCharacter${i}_age`)?.value || "";
      const race = document.getElementById(`mvCharacter${i}_race`)?.value || "";
      const appearance =
        document.getElementById(`mvCharacter${i}_appearance`)?.value || "";
      if (gender || age || race || appearance) {
        characters.push({ gender, age, race, appearance });
      }
    }

    const eraMap = {
      현대: "modern",
      과거: "historical",
      미래: "futuristic",
      복고: "retro",
    };
    const countryMap = {
      한국: "Korea",
      일본: "Japan",
      미국: "USA",
      영국: "UK",
    };
    const moodMap = {
      로맨틱: "romantic",
      우울한: "melancholic",
      에너지틱: "energetic",
      평화로운: "peaceful",
    };
    const lightingMap = {
      자연광: "natural lighting",
      부드러운: "soft lighting",
      드라마틱: "dramatic lighting",
    };
    const cameraMap = {
      클로즈업: "close-up shot",
      와이드샷: "wide shot",
      미디엄샷: "medium shot",
    };

    const geminiKey = window.getGeminiApiKey();
    if (geminiKey && geminiKey.startsWith("AIza")) {
      const cleanLyrics = extractLyricsOnly(finalLyrics);

      const eraEn = eraMap[era] || era || "modern";
      const countryEn = countryMap[country] || country || "Korea";
      const moodEn = moodMap[mood] || mood || "";
      const lightingEn = lightingMap[lighting] || lighting || "";
      const cameraEn = cameraMap[cameraWork] || cameraWork || "";

      // 가사는 이미 1:1 사전 매핑되어 scene.scene에 저장되어 있음. 
      // 만약 없거나 "씬 N" 형태인 경우 fallback으로 시간비례 추출 사용 (예외 대비)
      let sceneLyrics = scene.lyrics || scene.scene || "";
      if (!sceneLyrics || sceneLyrics.startsWith("씬 ")) {
        if (scene.time && cleanLyrics) {
          const timeMatch = scene.time.match(/(\d+):(\d+)-(\d+):(\d+)/);
          if (timeMatch) {
            const startTotal =
              parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
            const endTotal = parseInt(timeMatch[3]) * 60 + parseInt(timeMatch[4]);
            const lyricsLines = cleanLyrics.split("\n").filter((l) => l.trim());
            const estimatedLinesPerMinute =
              lyricsLines.length / (totalSeconds / 60);
            const startLine = Math.floor(
              (startTotal / 60) * estimatedLinesPerMinute,
            );
            const endLine = Math.ceil((endTotal / 60) * estimatedLinesPerMinute);
            sceneLyrics = lyricsLines
              .slice(startLine, endLine + 1)
              .join(" ")
              .trim();
          }
        }
      }
      if (!sceneLyrics) sceneLyrics = "music scene";

      let characterInfoStr = characters
        .map((c, idx) => {
          return `인물${idx + 1}: ${c.gender || ""} ${c.age || ""} ${c.race || ""} ${c.appearance || ""}`;
        })
        .join("; ");

      const prompt = `다음 음악 가사와 설정을 기반으로 **세밀하고 상세한** 통합 영어 프롬프트와 한글 프롬프트를 1개만 생성하세요.

【가사】 (가장 중요 - 반드시 프롬프트에 구체적으로 시각화하여 반영하세요!)
"${sceneLyrics}"

【현재 씬 설명】
"${scene.scene || "음악 씬"}"

【스타일 (수노 음악 스타일 — 비주얼/색감/분위기 변환 참고용으로만 사용하며 텍스트 그대로 쓰지 마세요)】
${(typeof window.cleanMidjourneyPrompt === "function" ? window.cleanMidjourneyPrompt(stylePrompt) : stylePrompt) || stylePrompt || "감성적인 발라드"}

${productionContextBlock}

【MV 설정】 (가사 내용을 우선하되 융합)
- 시대: ${era || "현대"}
- 국가: ${country || "한국"}
- 장소: ${location || "도시"}
- 조명: ${lighting || "자연광"}
- 카메라: ${cameraWork || "중간 샷"}
- 분위기: ${mood || "감성적"}
- 인물 정보: ${characterInfoStr}
${customSettings ? `- 추가: ${customSettings}` : ""}

【씬별 편집 메타데이터】 (사용자가 직접 조정한 값이므로 MV 전체 설정보다 우선 반영)
${getMVSceneRegenerationContext(scene, { location, mood, lighting, cameraWork }).promptLines || "- 없음"}

【작업 요구사항】
해당 씬의 비주얼을 **매우 상세하고 구체적으로** 영어 한 단락으로 묘사하세요 (최소 150단어 이상의 방대하고 정밀한 서술형 문장):
- **프롬프트 구조화 필수**: [핵심 피사체/장면 요약] -> [피사체의 외모, 표정, 동작] -> [배경, 환경, 날씨, 빛 반사 등 질감의 정밀 묘사] -> [조명, 색채, 분위기] -> [카메라 앵글 및 모션] -> [고화질 기술 키워드] 순으로 논리적이고 풍부하게 작성.
- 단순 단어 나열을 지양하고, 완벽한 문장(Sentence)과 쉼표를 결합하여 문학적이고 시각적인 묘사로 채우세요.
- 가사의 감정과 디테일을 눈에 보이듯 깊이 있게 묘사
- 인물, 배경, 조명, 구도 및 미세한 대상의 움직임(모션)을 모두 포함
- 느리고 자연스러운 카메라 워크 추가
- **이미지/비디오 통합 고화질 키워드 필수 포함**: "ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio, professional photography, cinematic motion, dynamic camera movement, sharp focus, detailed lighting"

**출력 형식 (순수 JSON만):**
\`\`\`json
{
  "promptEn": "완성된 영어 프롬프트 (최소 150단어 이상, 가사 내용 기반 심층 묘사 및 모션 포함)",
  "promptKo": "완성된 한글 프롬프트 (최소 150단어 이상, 번역본)"
}
\`\`\`

**매우 중요:**
- 📌 **['MV 프롬프트 상세 설정' 100% 시각 반영]**: 사용자가 입력한 시대(${era || "현대"}), 국가(${country || "한국"}), 장소(${location || "도시"}), 조명(${lighting || "자연광"}), 카메라(${cameraWork || "중간 샷"}), 분위기(${mood || "감성적"}), 인물 정보(${characterInfoStr || "인물"}), 추가 설정(${customSettings || "없음"})을 씬 비주얼에 1:1로 정확하게 묘사하세요.
- 📌 **[가사 서사 시각화]**: 배정된 가사("${sceneLyrics}")의 상황과 인물의 심리/행동을 시각적 스토리로 전환하여 프롬프트에 깊이 있게 서술하세요. (영어 프롬프트 'promptEn'에는 가사 상황의 완벽한 영어 비주얼 묘사가 한글 단어 없이 100% 영문으로 포함되어야 함)
- ⚠️ **[필수 금지 조건]** Suno의 음악 스타일(BPM, 보컬, 믹스, 악기 명칭, '-harsh treble' 등의 부정어, 추임새 파편)을 Midjourney 프롬프트에 텍스트 그대로 절대 쓰지 마세요. 오직 순수 시각적 비주얼 요소만 작성해야 합니다.
- **미세한 카메라 워크와 피사체의 움직임을 필수로 묘사하세요**
- 영어 프롬프트는 단일 단락, 순수 영어만 (한글 없음)
- JSON 형식만 출력`;

      // callGeminiWithAutoRoute: 실제 키는 직접 호출, 프록시 인증은 /api/gemini 사용
      const aiRawText2 = await (window.callGeminiWithAutoRoute || callGeminiWithAutoRoute)(
        prompt,
        { temperature: 0.8, maxOutputTokens: 4096 },
        geminiKey,
      );
      if (window.logApiUsage) window.logApiUsage("gemini");

      if (aiRawText2) {
        const aiResponse = aiRawText2;
        const aiPrompts = safeJsonParse(aiResponse);
        if (aiPrompts) {
          let newPromptEn = aiPrompts.promptEn || "";
          let newPromptKo = aiPrompts.promptKo || "";

          if (typeof window.cleanEnglishMidjourneyPrompt === "function") {
            newPromptEn = window.cleanEnglishMidjourneyPrompt(newPromptEn);
          }
          if (typeof window.cleanMidjourneyPrompt === "function") {
            newPromptKo = window.cleanMidjourneyPrompt(newPromptKo);
          }

          if (newPromptEn) {
            const enEl = document.getElementById(
              `scene_overview_${sceneIndex}_en`,
            );
            const koEl = document.getElementById(
              `scene_overview_${sceneIndex}_ko`,
            );
            if (enEl)
              enEl.value = `/* Scene ${sceneIndex + 1} */ ${newPromptEn}`;
            if (koEl) {
              if (newPromptKo) {
                koEl.value = newPromptKo;
                if (window.currentScenes && window.currentScenes[sceneIndex]) {
                  window.currentScenes[sceneIndex].prompt = enEl
                    ? enEl.value
                    : `/* Scene ${sceneIndex + 1} */ ${newPromptEn}`;
                  window.currentScenes[sceneIndex].promptKo = newPromptKo;
                }
                if (typeof window.saveCurrentProject === "function") {
                  window.saveCurrentProject();
                }
              } else {
                await window.syncSceneOverviewPromptTranslation(
                  sceneIndex,
                  "en",
                );
              }
            }
          } else {
            throw new Error("AI 응답에 영어 프롬프트가 포함되어 있지 않습니다.");
          }
        } else {
          throw new Error("AI 응답에서 JSON 데이터를 찾을 수 없습니다.");
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        const detailedError = errData.error?.message || errData.error || response.statusText || "알 수 없는 API 오류";
        throw new Error(`API 오류: ${response.status} (${detailedError})`);
      }
    } else {
      const sceneContext = getMVSceneRegenerationContext(scene, {
        location,
        mood,
        lighting,
        cameraWork,
      });
      const eraEn = eraMap[era] || era || "modern";
      const countryEn = countryMap[country] || country || "Korea";
      const moodEn = moodMap[mood] || mood || "emotional";
      const lightingEn = lightingMap[lighting] || lighting || "natural lighting";
      const cameraEn = cameraMap[cameraWork] || cameraWork || "cinematic movement";

      const characterInfoEn = characters
        .map((c, idx) => {
          const genderEn = c.gender === "여성" ? "female" : c.gender === "남성" ? "male" : c.gender || "";
          const raceEn = c.race === "한국인" || c.race === "동양인" ? "Asian" : c.race || "";
          return `Character ${idx + 1}: ${genderEn} ${c.age || ""} ${raceEn} ${c.appearance || ""}`.trim();
        })
        .filter(Boolean)
        .join("; ");

      const domLyrics = document.getElementById(`scene_lyrics_${sceneIndex}`)?.value || "";
      const domLocation = document.getElementById(`scene_location_${sceneIndex}`)?.value || "";
      const finalLyricsVal = document.getElementById("finalLyrics")?.value || "";
      const rawSeed = [scene.scene, scene.lyrics, domLyrics, domLocation, finalLyricsVal]
        .filter(Boolean)
        .join(", ");
      const englishSeed = rawSeed
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !/[\u3131-\u318E\uAC00-\uD7A3]/.test(s))
        .join(", ");

      const visualStyle = (typeof window.cleanEnglishMidjourneyPrompt === "function" ? window.cleanEnglishMidjourneyPrompt(stylePrompt) : "") || "cinematic visual mood";
      const detailedSettingsEn = [
        englishSeed,
        location ? `${location} setting` : "",
        ...(sceneContext.promptParts ? (Array.isArray(sceneContext.promptParts) ? sceneContext.promptParts : [sceneContext.promptParts]) : []),
        characterInfoEn,
        countryEn ? `${countryEn} country aesthetic` : "",
        eraEn ? `${eraEn} era` : "",
        `${lightingEn} lighting`,
        `${cameraEn} camera framing`,
        `${moodEn} atmosphere`,
        customSettings ? `details: ${customSettings}` : "",
      ].filter(Boolean).join(", ");

      let basicPrompt = `/* Scene ${sceneIndex + 1} */ ${detailedSettingsEn}, ${visualStyle}, ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio`;
      if (typeof window.cleanEnglishMidjourneyPrompt === "function") {
        basicPrompt = window.cleanEnglishMidjourneyPrompt(basicPrompt);
      }
      const enEl = document.getElementById(`scene_overview_${sceneIndex}_en`);
      if (enEl) {
        enEl.value = basicPrompt;
        await window.syncSceneOverviewPromptTranslation(sceneIndex, "en");
      }
    }
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ 씬 ${sceneIndex + 1} 프롬프트가 재생성되었습니다!`,
      );
    }
  } catch (error) {
    console.error("씬 개요 프롬프트 재생성 오류:", error);
    alert(`씬 개요 프롬프트 재생성 중 오류가 발생했습니다:\n${error.message}`);
  }
};

// --- Restored Copy and Focus Functions ---
window.copyAllMVPrompts = function (event) {
  if (!window.currentScenes || window.currentScenes.length === 0) {
    alert("복사할 프롬프트가 없습니다.");
    return;
  }
  if (!window.confirmMVExportWithUnsavedScenes("전체 MV 프롬프트 복사")) {
    return;
  }
  if (!window.confirmMVFinalPromptExport("전체 MV 프롬프트 복사")) {
    return;
  }

  let text = "";

  // 통합/배경/인물 프롬프트 추가
  const combinedKo = document.getElementById("mvCombinedPromptKo")?.value || "";
  const combinedEn = document.getElementById("mvCombinedPromptEn")?.value || "";
  const backgroundKo =
    document.getElementById("mvBackgroundPromptKo")?.value || "";
  const backgroundEn =
    document.getElementById("mvBackgroundPromptEn")?.value || "";
  const characterKo =
    document.getElementById("mvCharacterPromptKo")?.value || "";
  const characterEn =
    document.getElementById("mvCharacterPromptEn")?.value || "";

  // 썸네일/배경/인물 상세 프롬프트
  const thumbnailKo =
    document.getElementById("mvThumbnailPromptKo")?.value || "";
  const thumbnailEn =
    document.getElementById("mvThumbnailPromptEn")?.value || "";
  const backgroundDetailKo =
    document.getElementById("mvBackgroundDetailPromptKo")?.value || "";
  const backgroundDetailEn =
    document.getElementById("mvBackgroundDetailPromptEn")?.value || "";
  const characterDetailKo =
    document.getElementById("mvCharacterDetailPromptKo")?.value || "";
  const characterDetailEn =
    document.getElementById("mvCharacterDetailPromptEn")?.value || "";

  if (
    combinedKo ||
    combinedEn ||
    backgroundKo ||
    backgroundEn ||
    characterKo ||
    characterEn ||
    thumbnailKo ||
    thumbnailEn ||
    backgroundDetailKo ||
    backgroundDetailEn ||
    characterDetailKo ||
    characterDetailEn
  ) {
    text += "=== MV 프롬프트 상세 ===\n\n";

    if (thumbnailKo || thumbnailEn) {
      text += "🎬 썸네일 이미지 프롬프트\n";
      if (thumbnailKo) text += `[한글]\n${thumbnailKo}\n\n`;
      if (thumbnailEn) text += `[영어]\n${thumbnailEn}\n\n`;
    }

    if (combinedKo || combinedEn) {
      text += "📝 통합 프롬프트\n";
      if (combinedKo) text += `[한글]\n${combinedKo}\n\n`;
      if (combinedEn) text += `[영어]\n${combinedEn}\n\n`;
    }

    if (backgroundDetailKo || backgroundDetailEn) {
      text += "🏞️ 배경 프롬프트 (상세)\n";
      if (backgroundDetailKo) text += `[한글]\n${backgroundDetailKo}\n\n`;
      if (backgroundDetailEn) text += `[영어]\n${backgroundDetailEn}\n\n`;
    } else if (backgroundKo || backgroundEn) {
      text += "🏞️ 배경 프롬프트\n";
      if (backgroundKo) text += `[한글]\n${backgroundKo}\n\n`;
      if (backgroundEn) text += `[영어]\n${backgroundEn}\n\n`;
    }

    if (characterDetailKo || characterDetailEn) {
      text += "👤 인물 프롬프트 (상세)\n";
      if (characterDetailKo) text += `[한글]\n${characterDetailKo}\n\n`;
      if (characterDetailEn) text += `[영어]\n${characterDetailEn}\n\n`;
    } else if (characterKo || characterEn) {
      text += "👤 인물 프롬프트\n";
      if (characterKo) text += `[한글]\n${characterKo}\n\n`;
      if (characterEn) text += `[영어]\n${characterEn}\n\n`;
    }

    text += "=== 씬별 개별 프롬프트 ===\n\n";
  }

  window.currentScenes.forEach((scene, index) => {
    const sceneId = `scene_${index}`;
    const enEl = document.getElementById(`${sceneId}_en`);
    const koEl = document.getElementById(`${sceneId}_ko`);

    text += `씬 ${index + 1} (${scene.time})\n`;
    text += `장면: ${scene.scene || ""}\n`;
    text += window.formatMVSceneExportMetadata(scene);
    if (enEl && enEl.value) {
      text += `[영어 프롬프트]\n${enEl.value}\n\n`;
    } else if (scene.prompt) {
      text += `[영어 프롬프트]\n${scene.prompt}\n\n`;
    }
    if (koEl && koEl.value) {
      text += `[한글 프롬프트]\n${koEl.value}\n\n`;
    } else if (scene.promptKo) {
      text += `[한글 프롬프트]\n${scene.promptKo}\n\n`;
    }
    text += "\n";
  });

  navigator.clipboard
    .writeText(text)
    .then(() => {
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          "✅ 모든 MV 프롬프트가 클립보드에 복사되었습니다!",
        );
      } else {
        alert("모든 MV 프롬프트가 클립보드에 복사되었습니다.");
      }
    })
    .catch((err) => {
      console.error("클립보드 복사 오류:", err);
    });
};

// Bulk Copy Aliases (to ensure index.html buttons work)
window.copyAllMVProductionData = function (event) {
  if (typeof window.copyAllMVPrompts === "function") {
    return window.copyAllMVPrompts(event);
  }
  alert("기능을 준비 중입니다.");
};

window.copyAllMarketingMaterials = function () {
  alert("마케팅 자료 전체 복사 기능은 곧 업데이트될 예정입니다.");
};

window.copyMVPromptEn = async function (type, event) {
  try {
    const typeMap = {
      thumbnail: {
        en: "mvThumbnailPromptEn",
        name: "썸네일",
        btnId: "copyMVThumbnailBtn",
      },
      background: {
        en: "mvBackgroundDetailPromptEn",
        name: "배경",
        btnId: "copyMVBackgroundBtn",
      },
      character: {
        en: "mvCharacterDetailPromptEn",
        name: "인물",
        btnId: "copyMVCharacterBtn",
      },
    };

    const typeInfo = typeMap[type];
    if (!typeInfo) {
      alert("알 수 없는 프롬프트 타입입니다.");
      return;
    }

    let copyButton =
      event
        ? (event.currentTarget || event.target.closest("button"))
        : document.getElementById(typeInfo.btnId);

    const enEl = document.getElementById(typeInfo.en);
    if (!enEl || !enEl.value.trim()) {
      alert(`${typeInfo.name} 영어 프롬프트가 없습니다.`);
      return;
    }

    const promptText = enEl.value.trim();
    await navigator.clipboard.writeText(promptText);

    if (copyButton) {
      if (!copyButton.dataset.originalHTML) {
        copyButton.dataset.originalHTML = copyButton.innerHTML;
      }
      copyButton.innerHTML = '<i class="fas fa-check"></i> 복사됨';
      copyButton.classList.add("copied");
      setTimeout(() => {
        copyButton.innerHTML = copyButton.dataset.originalHTML;
        copyButton.classList.remove("copied");
      }, 2000);
    }

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ ${typeInfo.name} 영어 프롬프트가 클립보드에 복사되었습니다! (Midjourney용)`,
      );
    } else {
      alert(`✅ ${typeInfo.name} 영어 프롬프트가 클립보드에 복사되었습니다!`);
    }
  } catch (error) {
    console.error("영어 프롬프트 복사 오류:", error);
  }
};

window.focusMVPromptTextarea = function (type) {
  const typeMap = {
    thumbnail: "mvThumbnailPromptEn",
    background: "mvBackgroundDetailPromptEn",
    character: "mvCharacterDetailPromptEn",
  };
  const id = typeMap[type];
  if (!id) return;
  const el = document.getElementById(id);
  if (el) {
    el.focus();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

window.focusMVPromptOverviewTextarea = function (type) {
  const typeMap = {
    thumbnail: "mv_thumbnail_en_overview",
    background: "mv_background_en_overview",
    character: "mv_character_en_overview",
  };
  const id = typeMap[type];
  if (!id) return;
  const el = document.getElementById(id);
  if (el) {
    el.focus();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

window.copyMVPromptEnOverview = async function (type, event) {
  try {
    const typeMap = {
      thumbnail: { en: "mv_thumbnail_en_overview", name: "썸네일" },
      background: { en: "mv_background_en_overview", name: "배경" },
      character: { en: "mv_character_en_overview", name: "인물" },
    };
    const typeInfo = typeMap[type];
    if (!typeInfo) return;
    var copyButton =
      event
        ? (event.currentTarget || event.target.closest("button"))
        : document.querySelector(
            '.copy-mv-overview-btn[data-type="' + type + '"]',
          );

    const enEl = document.getElementById(typeInfo.en);
    if (!enEl || !enEl.value.trim()) {
      alert(typeInfo.name + " 영어 프롬프트가 없습니다.");
      return;
    }
    await navigator.clipboard.writeText(enEl.value.trim());
    
    if (copyButton) {
      if (!copyButton.dataset.originalHTML) {
        copyButton.dataset.originalHTML = copyButton.innerHTML;
      }
      copyButton.innerHTML = '<i class="fas fa-check"></i> 복사됨';
      copyButton.classList.add("copied");
      setTimeout(() => {
        copyButton.innerHTML = copyButton.dataset.originalHTML;
        copyButton.classList.remove("copied");
      }, 2000);
    }
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        "✅ " + typeInfo.name + " 영어 프롬프트가 클립보드에 복사되었습니다!",
      );
    }
  } catch (err) {
    console.error("영어 프롬프트 복사 오류:", err);
  }
};

// 씬별 개별 프롬프트 섹션의 영어 프롬프트만 복사 (Midjourney용)
window.copyScenePromptEn = async function (sceneIndex, event) {
  try {
    const enEl = document.getElementById(`scene_${sceneIndex}_en`);
    if (!enEl || !enEl.value.trim()) {
      alert("복사할 영어 프롬프트가 없습니다.");
      return;
    }

    let promptText = enEl.value.trim();
    promptText = promptText
      .replace(/\/\*\s*Scene\s+\d+\s*(of\s+\d+)?\s*\*\/\s*/gi, "")
      .trim();
    promptText = promptText
      .replace(/\[\s*Scene\s+\d+\s*(of\s+\d+)?\s*\]\s*/gi, "")
      .trim();
    promptText = promptText.replace(/\/\/.*$/gm, "").trim();
    promptText = promptText.replace(/\/\*[\s\S]*?\*\//g, "").trim();

    const totalScenes = window.currentScenes ? window.currentScenes.length : 0;
    const sceneNumber = sceneIndex + 1;
    const sceneLabel =
      totalScenes > 0
        ? `[Scene ${sceneNumber} of ${totalScenes}]`
        : `[Scene ${sceneNumber}]`;
    promptText = `${sceneLabel}\n${promptText}`;

    await navigator.clipboard.writeText(promptText);

    let copyButton = null;
    if (event && event.target) {
      copyButton = event.target.closest("button");
    }
    if (!copyButton) {
      copyButton = document.getElementById(`copyScenePromptBtn_${sceneIndex}`);
    }

    if (copyButton) {
      if (!copyButton.dataset.originalHTML) {
        copyButton.dataset.originalHTML = copyButton.innerHTML;
      }
      copyButton.innerHTML = '<i class="fas fa-check"></i> 복사됨';
      copyButton.disabled = true;
      copyButton.classList.add("copied");
      setTimeout(() => {
        copyButton.innerHTML =
          copyButton.dataset.originalHTML || '<i class="fas fa-copy"></i> 복사';
        copyButton.disabled = false;
        copyButton.classList.remove("copied");
      }, 1600);
    }

    if (typeof window.setMVSceneActionStatus === "function") {
      const isDirty =
        document.getElementById(`scene_${sceneIndex}_dirty`)?.dataset?.dirty ===
        "true";
      window.setMVSceneActionStatus(
        sceneIndex,
        "copied",
        isDirty
          ? "복사 완료. 단, 이 씬에는 저장되지 않은 수정이 남아 있습니다."
          : "복사 완료. 저장된 영어 프롬프트를 클립보드에 보냈습니다.",
      );
    }

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ 씬 ${sceneIndex + 1} 영어 프롬프트가 복사되었습니다!`,
      );
    }
  } catch (error) {
    console.error("영어 프롬프트 복사 오류:", error);
  }
};

window.saveScenePrompt = function (sceneIndex) {
  try {
    if (typeof window.setMVSceneActionStatus === "function") {
      window.setMVSceneActionStatus(sceneIndex, "saving", "이 씬 프롬프트 저장 중...");
    }
    const enEl = document.getElementById(`scene_${sceneIndex}_en`);
    const koEl = document.getElementById(`scene_${sceneIndex}_ko`);

    if (!window.currentScenes || !window.currentScenes[sceneIndex]) {
      alert("저장할 씬 데이터를 찾을 수 없습니다.");
      return;
    }

    if (enEl) window.currentScenes[sceneIndex].prompt = enEl.value;
    if (koEl) window.currentScenes[sceneIndex].promptKo = koEl.value;

    if (window.currentProject?.data?.marketing) {
      if (typeof window.setMarketingMVScenes === "function") {
        window.setMarketingMVScenes(
          window.currentProject.data.marketing,
          window.currentScenes,
        );
      } else {
        window.currentProject.data.marketing.mvScenes = JSON.parse(
          JSON.stringify(window.currentScenes),
        );
      }
    }

    if (typeof window.saveCurrentProject === "function") {
      window.saveCurrentProject(true);
    }

    if (typeof window.markMVScenePromptDirty === "function") {
      window.markMVScenePromptDirty(sceneIndex, false);
    }
    if (typeof window.setMVSceneActionStatus === "function") {
      window.setMVSceneActionStatus(
        sceneIndex,
        "saved",
        "이 씬 프롬프트가 저장되었습니다. 전체 씬 확정은 상단의 현재 편집 내용 저장을 사용하세요.",
      );
    }

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ 씬 ${sceneIndex + 1} 프롬프트가 저장되었습니다.`,
      );
    }
  } catch (error) {
    console.error("씬 프롬프트 저장 오류:", error);
    if (typeof window.setMVSceneActionStatus === "function") {
      window.setMVSceneActionStatus(
        sceneIndex,
        "error",
        "씬 프롬프트 저장 중 오류가 발생했습니다.",
      );
    }
  }
};

window.setMVSceneActionStatus = function (sceneIndex, state, message) {
  const statusEl = document.getElementById(`scene_${sceneIndex}_action_status`);
  if (!statusEl) return;

  const stateStyles = {
    dirty: {
      background: "rgba(245, 158, 11, 0.10)",
      border: "1px solid rgba(245, 158, 11, 0.35)",
      color: "#f59e0b",
    },
    saving: {
      background: "rgba(96, 165, 250, 0.10)",
      border: "1px solid rgba(96, 165, 250, 0.35)",
      color: "var(--accent)",
    },
    saved: {
      background: "rgba(16, 185, 129, 0.08)",
      border: "1px solid rgba(16, 185, 129, 0.25)",
      color: "var(--text-secondary)",
    },
    copied: {
      background: "rgba(16, 185, 129, 0.08)",
      border: "1px solid rgba(16, 185, 129, 0.25)",
      color: "var(--success)",
    },
    regenerating: {
      background: "rgba(96, 165, 250, 0.10)",
      border: "1px solid rgba(96, 165, 250, 0.35)",
      color: "var(--accent)",
    },
    error: {
      background: "rgba(239, 68, 68, 0.10)",
      border: "1px solid rgba(239, 68, 68, 0.35)",
      color: "var(--error)",
    },
  };
  const style = stateStyles[state] || stateStyles.saved;
  statusEl.dataset.state = state || "saved";
  statusEl.textContent = message || "";
  statusEl.style.background = style.background;
  statusEl.style.border = style.border;
  statusEl.style.color = style.color;
};

window.markMVScenePromptDirty = function (sceneIndex, isDirty = true) {
  const badge = document.getElementById(`scene_${sceneIndex}_dirty`);
  const saveButton = document.getElementById(`saveScenePromptBtn_${sceneIndex}`);
  const card = document.querySelector?.(
    `.mv-prompt-item[data-result-scene-index="${sceneIndex}"]`,
  );

  if (badge) {
    badge.dataset.dirty = isDirty ? "true" : "false";
    badge.style.display = isDirty ? "inline-flex" : "none";
    badge.textContent = isDirty ? "수정 미저장" : "";
  }

  if (saveButton) {
    saveButton.dataset.dirty = isDirty ? "true" : "false";
    saveButton.title = isDirty
      ? "이 씬에 저장되지 않은 변경이 있습니다. 이 씬 저장 버튼 또는 Ctrl/Cmd+S로 저장하세요."
      : "이 씬 카드의 영어/한글 프롬프트만 저장합니다. 전체 씬 확정은 상단의 현재 편집 내용 저장을 사용하세요.";
    saveButton.innerHTML = isDirty ? "씬 저장 필요" : "씬 저장";
  }

  if (card?.classList) {
    card.classList.toggle("mv-scene-dirty", !!isDirty);
  }

  if (typeof window.setMVSceneActionStatus === "function") {
    window.setMVSceneActionStatus(
      sceneIndex,
      isDirty ? "dirty" : "saved",
      isDirty
        ? "수정 후 아직 이 씬에 저장되지 않았습니다. 복사 전에 씬 저장을 권장합니다."
        : "저장 완료 상태입니다. 복사는 저장하지 않고 클립보드에만 보냅니다.",
    );
  }

  if (typeof window.updateMVWorkflowSummary === "function") {
    window.updateMVWorkflowSummary();
  }
};

window.bindMVScenePromptDirtyTracking = function (containerArg) {
  const container = containerArg || document;
  if (!container?.querySelectorAll) return;

  container
    .querySelectorAll(".scene-prompt-en,.scene-prompt-ko")
    .forEach((field) => {
      if (field.dataset.mvDirtyTrackingBound === "true") return;
      field.dataset.mvDirtyTrackingBound = "true";

      const markDirty = (event) => {
        const index = Number(event.target?.dataset?.sceneIndex);
        if (!Number.isInteger(index)) return;
        window.markMVScenePromptDirty(index, true);
      };

      field.addEventListener("input", markDirty);
      field.addEventListener("change", markDirty);
    });
};

window.saveFocusedMVScenePrompt = function () {
  const active = document.activeElement;
  const activeIndex = Number(active?.dataset?.sceneIndex);

  if (
    Number.isInteger(activeIndex) &&
    active?.classList &&
    (active.classList.contains("scene-prompt-en") ||
      active.classList.contains("scene-prompt-ko"))
  ) {
    window.saveScenePrompt(activeIndex);
    return true;
  }

  const dirtyBadge = document.querySelector?.(
    '.mv-scene-unsaved-badge[data-dirty="true"]',
  );
  const dirtyIndex = Number(dirtyBadge?.dataset?.sceneIndex);
  if (Number.isInteger(dirtyIndex)) {
    window.saveScenePrompt(dirtyIndex);
    return true;
  }

  return false;
};

window.focusMVFirstDirtyScene = function () {
  const dirtyBadge = document.querySelector?.(
    '.mv-scene-unsaved-badge[data-dirty="true"]',
  );
  const dirtyIndex = Number(dirtyBadge?.dataset?.sceneIndex);
  if (!Number.isInteger(dirtyIndex)) return false;

  const target =
    document.getElementById(`scene_${dirtyIndex}_en`) ||
    document.querySelector?.(
      `.mv-prompt-item[data-result-scene-index="${dirtyIndex}"]`,
    );
  if (target?.scrollIntoView) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (target?.focus) target.focus();
  return true;
};

if (
  typeof document !== "undefined" &&
  typeof document.addEventListener === "function" &&
  !window.__mvScenePromptShortcutBound
) {
  window.__mvScenePromptShortcutBound = true;
  document.addEventListener(
    "keydown",
    function handleMVScenePromptShortcut(event) {
      if (!(event.ctrlKey || event.metaKey) || event.key?.toLowerCase() !== "s") {
        return;
      }

      if (typeof window.saveFocusedMVScenePrompt !== "function") return;
      if (!window.saveFocusedMVScenePrompt()) return;

      event.preventDefault?.();
      event.stopImmediatePropagation?.();
    },
    true,
  );
}

// --- Restored Scene Prompt Regeneration Functions ---
window.regenerateScenePrompt = async function (sceneIndex) {
  try {
    if (!window.currentScenes || !window.currentScenes[sceneIndex]) {
      alert("재생성할 씬이 없습니다.");
      return;
    }

    const regenerateBtn = document.getElementById(
      `regenerateScenePromptBtn_${sceneIndex}`,
    );
    if (regenerateBtn) {
      if (!regenerateBtn.dataset.originalHTML) {
        regenerateBtn.dataset.originalHTML = regenerateBtn.innerHTML;
      }
      regenerateBtn.disabled = true;
      regenerateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 생성 중';
    }
    if (typeof window.setMVSceneActionStatus === "function") {
      window.setMVSceneActionStatus(
        sceneIndex,
        "regenerating",
        "이 씬의 프롬프트를 재생성하고 있습니다...",
      );
    }

    const scene = window.currentScenes[sceneIndex];
    if (typeof window.updateMVSceneTimelineFromEditor === "function") {
      window.updateMVSceneTimelineFromEditor(scene, sceneIndex);
    }
    const finalLyrics =
      document.getElementById("finalLyrics")?.textContent ||
      document.getElementById("finalizedLyrics")?.value ||
      document.getElementById("sunoLyrics")?.value ||
      "";
    const stylePrompt = getMVFinalStylePromptText();
    const productionContextBlock = getMVProductionContextBlock();

    const geminiKey = window.getGeminiApiKey();
    if (geminiKey && geminiKey.startsWith("AIza")) {
      const cleanLyrics = extractLyricsOnly(finalLyrics);
      const sceneContext = getMVSceneRegenerationContext(scene);
      const prompt = `다음 씬 설명을 기반으로 **세밀하고 상세한** 통합 영어 프롬프트를 1개 생성하세요.

【씬 설명 / 가사】
"${scene.lyrics || scene.scene || cleanLyrics}"

【스타일】
${stylePrompt || "감성적인 발라드"}

${productionContextBlock}

【씬별 편집 메타데이터】 (사용자가 직접 조정한 값이므로 반드시 우선 반영)
${sceneContext.promptLines || "- 없음"}

【작업 요구사항】
해당 씬의 비주얼을 **매우 상세하고 구체적으로** 영어 한 단락으로 묘사하세요:
- 씬 설명의 감정과 디테일을 눈에 보이듯 묘사
- 인물, 배경, 조명, 구도 및 미세한 대상의 움직임(모션)을 모두 포함
- 느리고 자연스러운 카메라 워크 추가
- **이미지/비디오 통합 고화질 키워드 필수 포함**: "ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio, professional photography, cinematic motion, dynamic camera movement, sharp focus, detailed lighting"

**출력 형식:**
순수하게 완성된 영어 단일 프롬프트 텍스트만 출력하세요. (따옴표, 설명, JSON 형식 등 불필요한 텍스트 없이 프롬프트 본문만 출력)`;

      // callGeminiWithAutoRoute: 실제 키는 직접 호출, 프록시 인증은 /api/gemini 사용
      const aiRawText3 = await (window.callGeminiWithAutoRoute || callGeminiWithAutoRoute)(
        prompt,
        { temperature: 0.8, maxOutputTokens: 500 },
        geminiKey,
      );
      if (window.logApiUsage) window.logApiUsage("gemini");

      if (aiRawText3) {
        const aiResponse = aiRawText3;
        const newPrompt = aiResponse.trim();

        if (newPrompt) {
          const sceneId = `scene_${sceneIndex}`;
          const enEl = document.getElementById(`${sceneId}_en`);
          if (enEl) {
            enEl.value = newPrompt;
            await window.syncScenePromptTranslation(sceneIndex, "en");
          }
        } else {
          throw new Error("AI 응답이 비어있습니다.");
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        const detailedError = errData.error?.message || errData.error || response.statusText || "알 수 없는 API 오류";
        throw new Error(`API 오류: ${response.status} (${detailedError})`);
      }
    } else {
      const sceneContext = getMVSceneRegenerationContext(scene);
      const sceneSeed = [scene.scene, scene.lyrics]
        .filter(Boolean)
        .filter((value, idx, arr) => arr.indexOf(value) === idx)
        .join(", ");
      const basicPrompt = `${sceneSeed || "music scene"}, ${sceneContext.promptParts || "cinematic visual setting"}, high quality, photorealistic, natural pose, detailed hands`;
      const sceneId = `scene_${sceneIndex}`;
      const enEl = document.getElementById(`${sceneId}_en`);
      if (enEl) {
        enEl.value = basicPrompt;
        await window.syncScenePromptTranslation(sceneIndex, "en");
      }
    }

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ 씬 ${sceneIndex + 1} 프롬프트가 재생성되었습니다!`,
      );
    }

    if (typeof window.markMVScenePromptDirty === "function") {
      window.markMVScenePromptDirty(sceneIndex, false);
    }
    if (typeof window.setMVSceneActionStatus === "function") {
      window.setMVSceneActionStatus(
        sceneIndex,
        "saved",
        "재생성 완료. 새 프롬프트가 씬 데이터에 반영되었습니다.",
      );
    }

    const sceneCopyBtn = document.getElementById(
      `copyScenePromptBtn_${sceneIndex}`,
    );
    if (sceneCopyBtn) {
      sceneCopyBtn.innerHTML =
        sceneCopyBtn.dataset.originalHTML || '<i class="fas fa-copy"></i> 복사';
      sceneCopyBtn.disabled = false;
      sceneCopyBtn.classList.remove("copied");
    }
  } catch (error) {
    console.error("씬 프롬프트 재생성 오류:", error);
    if (typeof window.setMVSceneActionStatus === "function") {
      window.setMVSceneActionStatus(
        sceneIndex,
        "error",
        "씬 프롬프트 재생성 중 오류가 발생했습니다.",
      );
    }
    alert(`씬 프롬프트 재생성 중 오류가 발생했습니다: ${error.message}`);
  } finally {
    const regenerateBtn = document.getElementById(
      `regenerateScenePromptBtn_${sceneIndex}`,
    );
    if (regenerateBtn) {
      regenerateBtn.disabled = false;
      regenerateBtn.innerHTML =
        regenerateBtn.dataset.originalHTML || "재생성";
    }
  }
};

// 선택된 태그들 가져오기 헬퍼 함수
function getSelectedTags(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];

  const activeTags = container.querySelectorAll(".tag-btn.active");
  const tags = [];

  activeTags.forEach((tag) => {
    const text = tag.dataset.value || tag.textContent.trim();
    if (
      text &&
      text !== "+" &&
      text !== "+ 직접 입력" &&
      !text.includes("기타(추가)")
    ) {
      tags.push(text);
    }
  });

  return tags;
}

// 태그 버튼 클릭 이벤트 초기화 함수
window.initializeTagButtons = function () {
  try {
    // 모든 태그 컨테이너에 이벤트 위임
    const tagContainers = document.querySelectorAll(".tag-container");

    tagContainers.forEach((container) => {
      // 기존 이벤트 리스너 제거 (중복 방지)
      const newContainer = container.cloneNode(true);
      container.parentNode.replaceChild(newContainer, container);

      newContainer.addEventListener("click", function (e) {
        const tagBtn = e.target.closest(".tag-btn");
        if (tagBtn && !tagBtn.classList.contains("custom-tag-btn")) {
          e.preventDefault();
          e.stopPropagation();

          // active 클래스 토글
          tagBtn.classList.toggle("active");

          // 6단계 장소 유형 선택 시 설정 저장
          if (
            newContainer.id === "mvLocationTags" &&
            typeof window.saveMVSettings === "function"
          ) {
            window.saveMVSettings();
          }

          // 선택된 태그 값 로그 (디버깅용)
          const tagValue = tagBtn.getAttribute("data-value");
          const isActive = tagBtn.classList.contains("active");
          console.log(`🏷️ 태그 ${isActive ? "선택" : "해제"}: ${tagValue}`);
        }
      });
    });

    console.log("✅ 태그 버튼 이벤트 리스너 초기화 완료");
  } catch (error) {
    console.error("❌ 태그 버튼 초기화 오류:", error);
  }
};

// 페이지 로드 시 또는 Step 6 이동 시 초기화하도록 함
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", window.initializeTagButtons);
} else {
  window.initializeTagButtons();
}
