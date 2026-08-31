// === MV Step 6: MV generation flows ===
window.allocateLyricsToMVScenes = function (lyrics, sceneCount) {
  const count = Math.max(parseInt(sceneCount, 10) || 0, 0);
  if (count === 0) return [];

  const rawLines = String(lyrics || "")
    .replace(/\r\n/g, "\n")
    .split("\n");
  const sectionLabelPattern =
    /^\s*(?:\[[^\]]+\]|\([^)]+\)|(?:verse|chorus|bridge|intro|outro|pre-chorus|hook|refrain|간주|전주|후렴|벌스|브릿지)\s*\d*\s*:?)\s*$/i;
  const lines = rawLines
    .map((line) => line.trim())
    .filter((line) => line && !sectionLabelPattern.test(line));

  if (lines.length === 0) return Array(count).fill("");

  if (count >= lines.length) {
    return Array.from({ length: count }, (_, index) => {
      const lineIndex = Math.min(
        lines.length - 1,
        Math.floor((index / count) * lines.length),
      );
      return lines[lineIndex] || "";
    });
  }

  const weights = lines.map((line) => Math.max(line.length, 1));
  let cursor = 0;
  let remainingWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const allocated = [];

  for (let sceneIndex = 0; sceneIndex < count; sceneIndex++) {
    const remainingScenes = count - sceneIndex;
    const remainingLines = lines.length - cursor;
    const targetWeight = remainingWeight / remainingScenes;
    const chunk = [];
    let chunkWeight = 0;

    while (cursor < lines.length && remainingLines - chunk.length > remainingScenes - 1) {
      chunk.push(lines[cursor]);
      chunkWeight += weights[cursor];
      cursor += 1;
      if (chunkWeight >= targetWeight) break;
    }

    if (chunk.length === 0 && cursor < lines.length) {
      chunk.push(lines[cursor]);
      chunkWeight += weights[cursor];
      cursor += 1;
    }

    remainingWeight -= chunkWeight;
    allocated.push(chunk.join(" ").trim());
  }

  return allocated;
};

// --- Extracted generateMVDetailPrompts ---
window.generateMVDetailPrompts = async function (
  era,
  country,
  location,
  characters,
  customSettings,
  lighting,
  cameraWork,
  mood,
) {
  try {
    // 가사 내용 가져오기
    const finalLyrics =
      document.getElementById("finalLyrics")?.textContent ||
      document.getElementById("finalizedLyrics")?.value ||
      document.getElementById("sunoLyrics")?.value ||
      "";
    const stylePrompt = getMVFinalStylePromptText();
    const productionContextBlock = getMVProductionContextBlock();
    const cleanLyrics = extractLyricsOnly(finalLyrics);

    // Gemini API를 사용하여 가사 내용을 반영한 프롬프트 생성
    const geminiKey = window.getGeminiApiKey();
    let combinedEn = "";
    let combinedKo = "";
    let backgroundEn = "";
    let backgroundKo = "";
    let characterEn = "";
    let characterKo = "";

    // 캐릭터 시트 정보 사전 수집 (프롬프트에 주입용)
    const charSheetInfoForPrompt =
      typeof window.getAllCharacterSheetsSummary === "function"
        ? window.getAllCharacterSheetsSummary()
        : "";
    const charSheetSection = charSheetInfoForPrompt
      ? `\n【캐릭터 시트 — 인물 외형 일관성 유지】\n아래 캐릭터 시트의 외형 정보를 인물 프롬프트에 정확히 반영하세요.\n${charSheetInfoForPrompt}\n`
      : "";

    if (
      geminiKey &&
      geminiKey.startsWith("AIza") &&
      cleanLyrics &&
      cleanLyrics.trim()
    ) {
      try {
        const prompt = `다음 음악 가사와 설정을 기반으로 Midjourney용 **세밀하고 상세한** 영어 프롬프트와 한글 프롬프트를 각각 3개씩 생성하세요.

【가사】 (가장 중요 - 반드시 각 프롬프트에 구체적으로 반영하세요!)
${cleanLyrics}

【스타일】
${stylePrompt || "감성적인 발라드"}

${productionContextBlock}

【MV 설정】 (보조 참고용 - 가사 내용을 우선하되 자연스럽게 융합)
- 시대: ${era || "현대"}
- 국가: ${country || "한국"}
- 장소: ${location || "도시"}
- 조명: ${lighting || "자연광"}
- 카메라: ${cameraWork || "중간 샷"}
- 분위기: ${mood || "감성적"}
- 인물: ${characters && characters.length > 0 ? characters.map((c) => `${c.gender || ""} ${c.appearance || ""}`).join(", ") : "1명"}
${customSettings ? `- 추가: ${customSettings}` : ""}
${charSheetSection}
【작업 요구사항】
다음 3가지 프롬프트를 각각 **매우 상세하고 구체적으로** 작성하세요 (각 40단어 이상):

1. **통합 프롬프트 (Combined Prompt)**: 
   - 전체 MV를 대표하는 통합 프롬프트
   - **가사의 핵심 감정과 분위기를 대표하는 이미지** (가사 내용을 구체적으로 반영)
   - 인물, 배경, 조명, 구도 모두 포함

2. **배경 프롬프트 (Background Prompt)**:
   - 배경 중심 구성
   - **가사와 분위기를 반영한 상세한 배경 묘사** (가사에서 묘사되는 장소나 분위기 반영)
   - 조명, 색감, 분위기 상세 묘사
   - 인물은 최소화하거나 실루엣만

3. **인물 프롬프트 (Character Prompt)**:
   - 인물 중심 구성
   - 인물의 표정, 포즈, 동작 상세 묘사
   - **가사 감정을 인물 표정에 반영** (가사에서 느껴지는 감정을 시각적으로 표현)
   - 자연스러운 포즈, 상세한 손가락, 얼굴 특징

**출력 형식 (순수 JSON만):**
\`\`\`json
{
  "combinedEn": "완성된 통합 영어 프롬프트 (40단어 이상, 가사 내용 반영, ultra high quality, 8k resolution, photorealistic, cinematic composition 포함)",
  "combinedKo": "완성된 통합 한글 프롬프트 (40단어 이상, 가사 내용 반영)",
  "backgroundEn": "완성된 배경 영어 프롬프트 (40단어 이상, 가사 내용 반영, background-focused composition, ultra high quality, 8k resolution, photorealistic, detailed background 포함)",
  "backgroundKo": "완성된 배경 한글 프롬프트 (40단어 이상, 가사 내용 반영)",
  "characterEn": "완성된 인물 영어 프롬프트 (40단어 이상, 가사 내용 반영, character-focused composition, ultra high quality, 8k resolution, photorealistic, natural pose, detailed hands, detailed facial features 포함)",
  "characterKo": "완성된 인물 한글 프롬프트 (40단어 이상, 가사 내용 반영)"
}
\`\`\`

**매우 중요:**
- **가사 내용을 가장 우선적으로 반영하세요** - 각 프롬프트에 가사에서 묘사되는 장면, 감정, 상황을 구체적으로 포함하세요
- 각 프롬프트는 40단어 이상
- 가사의 감정과 내용을 시각적으로 표현
- 설정값(시대, 국가, 장소, 조명, 카메라, 분위기, 인물)은 가사 내용과 자연스럽게 융합
- 영어 프롬프트는 순수 영어만 (한글 없음)
- 한글 프롬프트는 자연스러운 한글로 작성
- JSON 형식만 출력`;

        // callGeminiWithAutoRoute: 실제 키는 직접 호출, 프록시 인증은 /api/gemini 사용
        const aiResponse = await (window.callGeminiWithAutoRoute || callGeminiWithAutoRoute)(
          prompt,
          { temperature: 0.8, topK: 40, topP: 0.95, maxOutputTokens: 4096 },
          geminiKey,
        );

        {
          if (window.logApiUsage) window.logApiUsage("gemini");

          console.log(
            "🤖 MV 상세 프롬프트 AI 응답 수신:",
            aiResponse.substring(0, 300) + "...",
          );

          // JSON 추출
          const aiPrompts = safeJsonParse(aiResponse);
          if (aiPrompts) {

            combinedEn = aiPrompts.combinedEn || "";
            combinedKo = aiPrompts.combinedKo || "";
            backgroundEn = aiPrompts.backgroundEn || "";
            backgroundKo = aiPrompts.backgroundKo || "";
            characterEn = aiPrompts.characterEn || "";
            characterKo = aiPrompts.characterKo || "";

            console.log("✅ MV 상세 프롬프트 AI 생성 완료");

            // 한글 프롬프트가 없으면 영어에서 번역
            if (!combinedKo && combinedEn) {
              combinedKo =
                (await translateEnglishToKoreanForScene(
                  "prompt",
                  combinedEn,
                )) || "";
            }
            if (!backgroundKo && backgroundEn) {
              backgroundKo =
                (await translateEnglishToKoreanForScene(
                  "background",
                  backgroundEn,
                )) || "";
            }
            if (!characterKo && characterEn) {
              characterKo =
                (await translateEnglishToKoreanForScene(
                  "character",
                  characterEn,
                )) || "";
            }
          }
        }
      } catch (aiError) {
        console.warn(
          "⚠️ MV 상세 프롬프트 AI 생성 실패, 기본 방식으로 전환:",
          aiError,
        );
      }
    }

    // AI 생성 실패 시 기본 방식으로 생성
    if (!combinedEn || !backgroundEn || !characterEn) {
      // 설정 정보를 기반으로 프롬프트 구성 요소 생성
      const settingParts = [];
      const settingPartsKo = [];

      // 시대
      if (era) {
        const eraMap = {
          modern: { en: "modern (2020s)", ko: "현대 (2020년대)" },
          "2010s": { en: "2010s", ko: "2010년대" },
          "2000s": { en: "2000s", ko: "2000년대" },
          "1990s": { en: "1990s", ko: "1990년대" },
          "1980s": { en: "1980s", ko: "1980년대" },
          "1970s": { en: "1970s", ko: "1970년대" },
          "1960s": { en: "1960s", ko: "1960년대" },
          "1950s": { en: "1950s", ko: "1950년대" },
          vintage: { en: "vintage (retro style)", ko: "빈티지 (복고풍)" },
          future: { en: "futuristic", ko: "미래" },
          timeless: {
            en: "timeless (no specific era)",
            ko: "시대 불명 (시대적 특성 없음)",
          },
        };
        const eraInfo = eraMap[era] || { en: era, ko: era };
        settingParts.push(eraInfo.en);
        settingPartsKo.push(eraInfo.ko);
      }

      // 국가/지역
      if (country) {
        const countryMap = {
          korea: { en: "Korea", ko: "한국" },
          japan: { en: "Japan", ko: "일본" },
          china: { en: "China", ko: "중국" },
          usa: { en: "USA", ko: "미국" },
          uk: { en: "UK", ko: "영국" },
          france: { en: "France", ko: "프랑스" },
          italy: { en: "Italy", ko: "이탈리아" },
          spain: { en: "Spain", ko: "스페인" },
          germany: { en: "Germany", ko: "독일" },
          europe: { en: "Europe", ko: "유럽" },
          asia: { en: "Asia", ko: "아시아" },
          latin: { en: "Latin America", ko: "라틴 아메리카" },
          "middle-east": { en: "Middle East", ko: "중동" },
          africa: { en: "Africa", ko: "아프리카" },
          generic: { en: "generic location", ko: "지역 불명 (일반적 배경)" },
        };
        const countryInfo = countryMap[country] || { en: country, ko: country };
        settingParts.push(countryInfo.en);
        settingPartsKo.push(countryInfo.ko);
      }

      // 장소 유형 (다중 선택 반영)
      const locationVals =
        typeof window.getMVLocationValues === "function"
          ? window.getMVLocationValues()
          : [];
      if (locationVals.length > 0) {
        locationVals.forEach((loc) => {
          const info =
            typeof MV_LOCATION_MAP !== "undefined" && MV_LOCATION_MAP[loc]
              ? MV_LOCATION_MAP[loc]
              : { en: loc, ko: loc };
          settingParts.push(info.en);
          settingPartsKo.push(info.ko);
        });
      }

      // 인물 정보
      let characterParts = [];
      let characterPartsKo = [];
      if (characters && characters.length > 0) {
        characters.forEach((char, index) => {
          if (char.gender) {
            // 성별/나이 정보를 정확히 반영
            const genderText = char.gender.trim();
            characterParts.push(genderText);
            characterPartsKo.push(genderText);
          }
          if (char.appearance) {
            characterParts.push(char.appearance.trim());
            characterPartsKo.push(char.appearance.trim());
          }
        });
      }

      // 통합 프롬프트 생성
      let combinedKo = "";
      let combinedEn = "";

      if (settingPartsKo.length > 0) {
        combinedKo += settingPartsKo.join(", ") + " 배경";
      }
      if (characterPartsKo.length > 0) {
        if (combinedKo) combinedKo += ", ";
        combinedKo += characterPartsKo.join(", ") + " 인물";
      }
      if (customSettings) {
        if (combinedKo) combinedKo += ", ";
        combinedKo += customSettings;
      }

      if (settingParts.length > 0) {
        combinedEn += settingParts.join(", ") + " background";
      }
      if (characterParts.length > 0) {
        if (combinedEn) combinedEn += ", ";
        combinedEn += characterParts.join(", ") + " character";
      }
      if (customSettings) {
        if (combinedEn) combinedEn += ", ";
        combinedEn += customSettings;
      }

      // 조명 추가
      if (lighting) {
        const lightingMap = {
          natural: { en: "natural lighting", ko: "자연광" },
          soft: { en: "soft lighting", ko: "부드러운 조명" },
          dramatic: { en: "dramatic lighting", ko: "드라마틱한 조명" },
          warm: { en: "warm lighting", ko: "따뜻한 조명" },
          cool: { en: "cool lighting", ko: "차가운 조명" },
          neon: { en: "neon lighting", ko: "네온 조명" },
          "golden-hour": { en: "golden hour lighting", ko: "골든 아워 조명" },
          "blue-hour": { en: "blue hour lighting", ko: "블루 아워 조명" },
          studio: { en: "studio lighting", ko: "스튜디오 조명" },
          cinematic: { en: "cinematic lighting", ko: "시네마틱 조명" },
        };
        const lightingInfo = lightingMap[lighting] || {
          en: lighting,
          ko: lighting,
        };
        if (combinedEn) combinedEn += ", ";
        combinedEn += lightingInfo.en;
        if (combinedKo) combinedKo += ", ";
        combinedKo += lightingInfo.ko;
      }

      // 카메라 워크 추가
      if (cameraWork) {
        const cameraMap = {
          "close-up": { en: "close-up shot", ko: "클로즈업" },
          "wide-shot": { en: "wide shot", ko: "와이드 샷" },
          "medium-shot": { en: "medium shot", ko: "미디엄 샷" },
          dolly: { en: "dolly shot", ko: "돌리 촬영" },
          tracking: { en: "tracking shot", ko: "트래킹 촬영" },
          pan: { en: "pan shot", ko: "팬 촬영" },
          tilt: { en: "tilt shot", ko: "틸트 촬영" },
          handheld: { en: "handheld camera", ko: "핸드헬드" },
          "steady-cam": { en: "steady cam", ko: "스테디캠" },
          drone: { en: "drone shot", ko: "드론 촬영" },
        };
        const cameraInfo = cameraMap[cameraWork] || {
          en: cameraWork,
          ko: cameraWork,
        };
        if (combinedEn) combinedEn += ", ";
        combinedEn += cameraInfo.en;
        if (combinedKo) combinedKo += ", ";
        combinedKo += cameraInfo.ko;
      }

      // 분위기 추가
      if (mood) {
        const moodMap = {
          romantic: { en: "romantic mood", ko: "로맨틱한 분위기" },
          melancholic: { en: "melancholic mood", ko: "멜랑꼴릭한 분위기" },
          energetic: { en: "energetic mood", ko: "에너제틱한 분위기" },
          peaceful: { en: "peaceful mood", ko: "평화로운 분위기" },
          mysterious: { en: "mysterious mood", ko: "신비로운 분위기" },
          nostalgic: { en: "nostalgic mood", ko: "노스탤지어 분위기" },
          dramatic: { en: "dramatic mood", ko: "드라마틱한 분위기" },
          dreamy: { en: "dreamy mood", ko: "드리미한 분위기" },
          intense: { en: "intense mood", ko: "강렬한 분위기" },
          gentle: { en: "gentle mood", ko: "부드러운 분위기" },
        };
        const moodInfo = moodMap[mood] || { en: mood, ko: mood };
        if (combinedEn) combinedEn += ", ";
        combinedEn += moodInfo.en;
        if (combinedKo) combinedKo += ", ";
        combinedKo += moodInfo.ko;
      }

      combinedEn += ", high quality, photorealistic, detailed";

      // 배경 프롬프트 생성
      let backgroundKo = "";
      let backgroundEn = "";

      if (settingPartsKo.length > 0) {
        backgroundKo = settingPartsKo.join(", ") + " 배경";
      }
      // 장소 유형은 이미 settingParts/settingPartsKo에 다중 선택으로 반영됨
      if (customSettings) {
        if (backgroundKo) backgroundKo += ", " + customSettings;
        else backgroundKo = customSettings;
        if (backgroundEn) backgroundEn += ", " + customSettings;
        else backgroundEn = customSettings;
      }
      backgroundEn += ", high quality, photorealistic, detailed background";

      // 인물 프롬프트 생성
      let characterKo = "";
      let characterEn = "";

      if (characterPartsKo.length > 0) {
        characterKo = characterPartsKo.join(", ") + " 인물";
      }
      if (characterParts.length > 0) {
        characterEn = characterParts.join(", ") + " person";
      }
      if (customSettings) {
        if (characterKo) characterKo += ", " + customSettings;
        else characterKo = customSettings;
        if (characterEn) characterEn += ", " + customSettings;
        else characterEn = customSettings;
      }
      characterEn +=
        ", high quality, photorealistic, natural pose, detailed hands";

      // 한글 프롬프트 생성
      if (!combinedKo && combinedEn) {
        combinedKo =
          (await translateEnglishToKoreanForScene("prompt", combinedEn)) || "";
      }
      if (!backgroundKo && backgroundEn) {
        backgroundKo =
          (await translateEnglishToKoreanForScene(
            "background",
            backgroundEn,
          )) || "";
      }
      if (!characterKo && characterEn) {
        characterKo =
          (await translateEnglishToKoreanForScene("character", characterEn)) ||
          "";
      }
    }

    // UI에 표시
    const combinedKoEl =
      document.getElementById("mvCombinedPromptKo") ||
      document.getElementById("mvThumbnailPromptKo");
    const combinedEnEl =
      document.getElementById("mvCombinedPromptEn") ||
      document.getElementById("mvThumbnailPromptEn");
    const backgroundKoEl =
      document.getElementById("mvBackgroundPromptKo") ||
      document.getElementById("mvBackgroundDetailPromptKo");
    const backgroundEnEl =
      document.getElementById("mvBackgroundPromptEn") ||
      document.getElementById("mvBackgroundDetailPromptEn");
    const characterKoEl =
      document.getElementById("mvCharacterPromptKo") ||
      document.getElementById("mvCharacterDetailPromptKo");
    const characterEnEl =
      document.getElementById("mvCharacterPromptEn") ||
      document.getElementById("mvCharacterDetailPromptEn");

    if (combinedKoEl)
      combinedKoEl.value = combinedKo || "설정된 내용이 없습니다.";
    if (combinedEnEl) {
      if (combinedEn) {
        combinedEnEl.value = combinedEn;
      } else if (combinedKo) {
        // 한글이 있으면 번역
        const translated = await translateKoreanToEnglishForScene(
          "prompt",
          combinedKo,
        );
        combinedEnEl.value = translated || combinedKo;
      } else {
        combinedEnEl.value = "No settings configured.";
      }
    }

    if (backgroundKoEl)
      backgroundKoEl.value = backgroundKo || "설정된 내용이 없습니다.";
    if (backgroundEnEl) {
      if (backgroundEn) {
        backgroundEnEl.value = backgroundEn;
      } else if (backgroundKo) {
        const translated = await translateKoreanToEnglishForScene(
          "background",
          backgroundKo,
        );
        backgroundEnEl.value = translated || backgroundKo;
      } else {
        backgroundEnEl.value = "No settings configured.";
      }
    }

    if (characterKoEl)
      characterKoEl.value = characterKo || "설정된 내용이 없습니다.";
    if (characterEnEl) {
      if (characterEn) {
        characterEnEl.value = characterEn;
      } else if (characterKo) {
        const translated = await translateKoreanToEnglishForScene(
          "character",
          characterKo,
        );
        characterEnEl.value = translated || characterKo;
      } else {
        characterEnEl.value = "No settings configured.";
      }
    }
  } catch (error) {
    console.error("MV 상세 프롬프트 생성 오류:", error);
  }
};

// --- Extracted generateSceneOverview ---
window.generateSceneOverview = async function () {
  console.log("🎬 MV 프롬프트 생성 함수 호출됨");
  console.log("함수 정의 확인:", typeof window.generateSceneOverview);

  var mvGenerateBtn = document.getElementById("mvGenerateBtn");
  var btnTextEl = mvGenerateBtn
    ? mvGenerateBtn.querySelector(".mv-generate-btn-text")
    : null;
  var originalBtnText = btnTextEl ? btnTextEl.innerHTML : "🎬 MV 프롬프트 생성";

  function setGeneratingUI(on) {
    if (mvGenerateBtn) {
      mvGenerateBtn.disabled = on;
      if (btnTextEl)
        btnTextEl.innerHTML = on ? "⏳ 생성 중..." : originalBtnText;
    }
    var mvLoading = document.getElementById("mvLoading");

    // [수정] 초기 설정 섹션을 숨기지 않고 그대로 둡니다. (사용자 요청: 재생성 버튼 유지)
    // var mvSettingsSection = document.getElementById("mvSettingsSection");
    // if (mvSettingsSection && on) {
    //   mvSettingsSection.classList.add("hidden");
    //   mvSettingsSection.style.display = "none";
    // }

    if (mvLoading) {
      if (on) {
        mvLoading.classList.remove("hidden");
        mvLoading.style.display = "flex";
      } else {
        mvLoading.classList.add("hidden");
        mvLoading.style.display = "none";
      }
    }
  }

  try {
    console.log("🎬 MV 프롬프트 생성 시작...");
    setGeneratingUI(true);

    const mvLoading = document.getElementById("mvLoading");
    const mvSceneOverviewSection = document.getElementById(
      "mvSceneOverviewSection",
    );
    const mvResultsSection = document.getElementById("mvResultsSection");

    console.log("DOM 요소 확인:", {
      mvLoading: !!mvLoading,
      mvSceneOverviewSection: !!mvSceneOverviewSection,
      mvResultsSection: !!mvResultsSection,
    });

    if (!mvLoading) {
      console.error("❌ mvLoading 요소를 찾을 수 없습니다.");
      setGeneratingUI(false);
      window.showToast("MV 로딩 영역을 찾을 수 없습니다. 페이지를 새로고침해주세요.", "error");
      return;
    }
    if (mvSceneOverviewSection) {
      mvSceneOverviewSection.classList.add("hidden");
      mvSceneOverviewSection.style.display = "none";
    }
    if (mvResultsSection) {
      mvResultsSection.classList.add("hidden");
      mvResultsSection.style.display = "none";
    }

    const minutes = parseInt(document.getElementById("mvMinutes")?.value || 3);
    const seconds = parseInt(document.getElementById("mvSeconds")?.value || 30);
    const interval = parseInt(
      document.getElementById("mvInterval")?.value || 8,
    );
    const totalSeconds = minutes * 60 + seconds;
    const imageCount = Math.ceil(totalSeconds / interval);

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

    // 인물 정보 수집 (성별, 나이, 인종, 외모/스타일)
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

    // 캐릭터 시트 전체 원본 정보 수집 (씬 프롬프트에 주입)
    const characterSheetsFull =
      typeof window.getAllCharacterSheetsFull === "function"
        ? window.getAllCharacterSheetsFull()
        : "";

    // 인물 정보 문자열 생성 (AI 프롬프트에 사용)
    let characterInfoStr = "";
    if (characters.length > 0) {
      const genderMap = {
        male: "남성",
        female: "여성",
        "non-binary": "논바이너리",
      };
      const ageMap = {
        child: "어린이",
        teen: "청소년",
        "20s": "20대",
        "30s": "30대",
        "40s": "40대",
        "50s": "50대",
        elder: "장년",
      };
      const raceMap = {
        asian: "아시아인",
        caucasian: "백인",
        african: "아프리카인",
        hispanic: "히스패닉/라틴계",
        "middle-eastern": "중동인",
        mixed: "혼혈",
      };

      characterInfoStr = characters
        .map((c, idx) => {
          const parts = [];
          if (c.gender) parts.push(genderMap[c.gender] || c.gender);
          if (c.age) parts.push(ageMap[c.age] || c.age);
          if (c.race) parts.push(raceMap[c.race] || c.race);
          if (c.appearance) parts.push(c.appearance);
          return parts.length > 0 ? `인물${idx + 1}: ${parts.join(", ")}` : "";
        })
        .filter((s) => s.trim())
        .join("; ");
    }

    const finalLyrics =
      document.getElementById("finalLyrics")?.textContent ||
      document.getElementById("finalizedLyrics")?.value ||
      document.getElementById("sunoLyrics")?.value ||
      "";

    if (!finalLyrics.trim()) {
      setGeneratingUI(false);
      window.showToast("가사를 먼저 입력하거나 생성해주세요.", "info");
      return;
    }

    // 스타일 프롬프트 가져오기
    const stylePrompt = getMVFinalStylePromptText();
    const productionContextBlock = getMVProductionContextBlock();

    // 가사에서 지시어 제거
    const cleanLyrics = extractLyricsOnly(finalLyrics);
    const lyricsLines = cleanLyrics.split("\n").filter((line) => line.trim());
    const preAllocatedLyrics =
      typeof window.allocateLyricsToMVScenes === "function"
        ? window.allocateLyricsToMVScenes(cleanLyrics, imageCount)
        : lyricsLines.slice(0, imageCount);

    // AI 기반 씬 생성 시도 (Gemini API 사용)
    let scenes = [];
    let useAI = false;

    // Gemini API 키 확인
    const geminiKey = window.getGeminiApiKey();
    if (geminiKey && geminiKey.startsWith("AIza")) {
      useAI = true;
      try {
        console.log("🤖 AI 기반 MV 프롬프트 생성 시작...");

        // 진행 상태 업데이트
        if (mvLoading) {
          const loadingText = mvLoading.querySelector(".loading-text");
          if (loadingText)
            loadingText.textContent =
              "AI가 가사를 분석하고 씬을 생성하는 중...";
        }

        // ═══════════════════════════════════════════════════════════════
        // 배치 분할 처리: 토큰 한도(8192) 초과 방지를 위해 7개씩 나눠 요청
        // ═══════════════════════════════════════════════════════════════
        const BATCH_SIZE = 7;
        const totalBatches = Math.ceil(imageCount / BATCH_SIZE);
        const currentGeminiModel = window.getGeminiModel ? window.getGeminiModel() : (window.AI_DEFAULTS && window.AI_DEFAULTS.GEMINI_MODEL) || "gemini-2.5-flash";
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentGeminiModel}:generateContent?key=${geminiKey}`;

        // ChatGPT API 키 확인 (배치 홀짝 교대에 사용)
        const openaiKey = window.getOpenAIApiKey
          ? window.getOpenAIApiKey()
          : "";
        const hasChatGPT = openaiKey && openaiKey.startsWith("sk-");
        if (hasChatGPT) {
          console.log(
            "✅ ChatGPT API 키 확인 — 짝수 배치:Gemini / 홀수 배치:ChatGPT 교대 처리",
          );
        } else {
          console.log("ℹ️ ChatGPT API 키 없음 — 전 배치 Gemini만 사용");
        }

        scenes = [];

        console.log(
          `📦 배치 처리 시작: 총 ${imageCount}개 씬, ${totalBatches}개 배치 (배치당 최대 ${BATCH_SIZE}개)`,
        );

        for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
          const batchStart = batchIdx * BATCH_SIZE; // 이 배치의 첫 번째 씬 인덱스 (0-based)
          const batchEnd = Math.min(batchStart + BATCH_SIZE, imageCount); // 마지막+1 (exclusive)
          const batchCount = batchEnd - batchStart;

          // 이번 배치에 사용할 1차 API 결정 (짝수:Gemini, 홀수:ChatGPT)
          const useGeminiFirst = batchIdx % 2 === 0 || !hasChatGPT;
          const primaryApiName = useGeminiFirst ? "Gemini" : "ChatGPT";
          const fallbackApiName = useGeminiFirst ? "ChatGPT" : "Gemini";

          // 로딩 텍스트 업데이트 (사용 중인 AI 이름 표시)
          if (mvLoading) {
            const loadingText = mvLoading.querySelector(".loading-text");
            if (loadingText)
              loadingText.textContent = `씬 생성 중... (배치 ${batchIdx + 1}/${totalBatches} · ${primaryApiName} · ${batchEnd}/${imageCount}개 완료)`;
          }

          // 이 배치의 씬별 시간대 및 가사 목록 생성
          const batchTimeList = [];
          for (let si = batchStart; si < batchEnd; si++) {
            const st = si * interval;
            const et = Math.min(st + interval, totalSeconds);
            const sm = Math.floor(st / 60);
            const ss = Math.floor(st % 60);
            const em = Math.floor(et / 60);
            const es = Math.floor(et % 60);
            const allocatedLyric = preAllocatedLyrics[si] || "";
            batchTimeList.push(
              `[씬 ${si + 1}] 시간: ${sm}:${String(ss).padStart(2, "0")}-${em}:${String(es).padStart(2, "0")} | 배정된 가사: "${allocatedLyric}"`
            );
          }

          // 이전 배치의 마지막 씬 맥락 (연속성 전달용)
          let previousBatchContext = "";
          if (batchIdx > 0 && scenes.length > 0) {
            const lastScene = scenes[scenes.length - 1];
            previousBatchContext = `
【이전 씬 맥락 — 연속성 유지를 위한 참고】
직전 씬(씬 ${scenes.length})의 상태:
- 감정: ${lastScene.emotion || "미정"}
- 분위기: ${lastScene.mood || "미정"}
- 장소: ${lastScene.location || "미정"}
- 인물 동작: ${lastScene.characterAction || "미정"}
- 영어 프롬프트 요약: ${(lastScene.prompt || "").substring(0, 200)}
→ 이 씬의 분위기를 자연스럽게 이어받거나, 가사 감정 변화에 따라 의도적으로 대조·전환하세요.
`;
          }

          const analysisPrompt = `당신은 이 뮤직비디오의 감독입니다. 가사의 감정 흐름을 하나의 영화적 서사 아크로 설계하세요.
각 씬을 단순 배경 묘사가 아니라, 감정을 시각적 메타포로 전환한 '한 편의 그림'으로 구성하세요.
빛·색채·질감·공간감·인물의 미세한 감정 표현에 집중하여, Midjourney에서 예술 작품 수준의 이미지가 나오도록 프롬프트를 설계하세요.

【전체 가사 맥락】 (서사 아크 파악 및 감정 추출용)
${cleanLyrics.substring(0, 600)}${cleanLyrics.length > 600 ? "..." : ""}

【스타일 (수노 음악 스타일 — 비주얼/색감/분위기 변환 참고용으로만 사용하며 텍스트 그대로 쓰지 마세요)】
${(typeof window.cleanMidjourneyPrompt === "function" ? window.cleanMidjourneyPrompt(stylePrompt) : stylePrompt) || stylePrompt || "감성적인 발라드"}

${productionContextBlock}
${previousBatchContext}
【MV 설정】 (가사 감정과 자연스럽게 융합하세요)
- 시대: ${era || "현대"}
- 국가: ${country || "한국"}
- 장소 유형 후보: ${location || "도시"}
  → 다중 선택된 경우, 각 씬의 가사 감정에 가장 어울리는 장소를 하나 골라 구체적으로 묘사
- 조명: ${lighting || "자연광"}
- 카메라: ${cameraWork || "중간 샷"}
- 분위기: ${mood || "감성적"}
- 인물: ${characterInfoStr || (characters.length > 0 ? `${characters.length}명` : "1명")}
${customSettings ? `- 추가: ${customSettings}` : ""}
${characterSheetsFull ? `
【캐릭터 디자인 시트 원본 — 인물 외형 및 스타일 100% 일관성 유지 필수】
아래는 사용자가 확정한 캐릭터 디자인 시트 원본 전체 내용입니다.
각 씬 프롬프트에서 인물이 등장할 때, 이 시트의 외형(이목구비, 머리스타일, 의상, 질감 등)과 분위기가 100% 일치하도록 가장 우선순위로 강하게 반영하세요. 단순한 요약이 아니라 원본 디테일 전체를 프롬프트에 그대로 살려야 합니다.
${characterSheetsFull}
` : ""}

【작업 요구사항】
이번 배치에서 **반드시 정확히 ${batchCount}개의 씬**을 생성하세요. (전체 ${imageCount}개 중 씬 ${batchStart + 1}번~${batchEnd}번)

생성할 씬 번호와 시간대, 그리고 배정된 가사:
${batchTimeList.join("\n")}

**각 씬마다 다음 필드를 반드시 작성하세요 (예술적 품질 기준):**

1. **time**: 위 시간대 목록에서 해당 씬의 시간
2. **lyrics**: 위에서 [씬 N]에 '배정된 가사'를 그대로 작성. (1글자도 변경하거나 누락하지 마세요)
3. **sceneDescription**: 생성된 프롬프트의 핵심 비주얼을 설명하는 한국어 장면 설명. 가사 원문을 그대로 쓰지 말고 배경, 인물, 조명, 카메라가 보이는 장면 설명으로 작성하세요.
4. **emotion**: 감정 한 단어 (예: sad, joyful, nostalgic, dreamy, intense, lonely, tender, hopeful)
5. **location**: **감정이 깃든 공간**으로 묘사하세요 (20단어 이상, 영어).
   ✗ 나쁜 예: "a park at night"
   ✓ 좋은 예: "rain-slicked cobblestone path through a quiet park, amber streetlights casting long reflections in shallow puddles, mist curling around wrought-iron benches"
6. **characterAction**: **내면 감정이 외면에 스며드는 동작**으로 묘사하세요 (15단어 이상, 영어).
   ✗ 나쁜 예: "walking sadly"
   ✓ 좋은 예: "trailing fingertips along a rain-beaded window, breath fogging the glass, gazing at blurred city lights below with distant eyes"
   - 인물 상세 정보 일관 반영: ${characterInfoStr || "없음"}
7. **mood**: 분위기를 색채·온도·질감으로 표현 (영어)
   예: "warm amber intimacy dissolving into cool blue solitude"
8. **lighting**: 빛의 방향·색·질감까지 묘사 (영어)
   예: "soft golden hour sidelight with long shadows and warm lens flare kissing the edges"
9. **cameraWork**: 카메라의 움직임·속도·프레이밍까지 표현 (영어)
   예: "slow cinematic dolly-in from wide establishing shot to intimate medium close-up"
10. **promptKo**: 가사 감정 중심의 완성된 Midjourney 한글 프롬프트 (150단어 내외의 방대하고 정밀한 서술형 문장)
   - **프롬프트 구조화 필수**: [핵심 장면 요약] -> [인물 외모/표정/미세 동작] -> [배경/날씨/질감 정밀 묘사] -> [조명/색채/분위기] -> [카메라 앵글/모션] -> [고화질 기술 키워드]
   - 인물 정보(${characterInfoStr || "없음"}) 일관 반영. (매우 중요: 기형 방지를 위해 손가락, 발가락, 손 모양, 발 모양, 팔, 다리 등 신체 구조를 해부학적으로 완벽하고 정밀하게 묘사할 것)
   - 씬 설명의 감정, 인물, 배경, 조명, 구도, 카메라가 움직이는 느낌(바람, 빛 반사 등)을 문학적이고 시각적으로 구체적 서술.
   - 마지막에 "초고화질, 8k 해상도, 시네마틱 구도, 역동적 카메라 무브먼트, 예리한 초점, 디테일한 조명" 포함
11. **promptEn**: promptKo를 영어로 번역한 매우 풍성하고 디테일한 프롬프트 (150단어 내외, 완벽한 문장과 쉼표가 조화된 긴 단락 필수)
    - 단순 단어 나열이 절대 아닙니다. 감정, 빛, 질감을 완벽한 문장(Sentence) 구조로 논리적이고 길게 묘사하세요.
    - 프롬프트 맨 끝에 반드시 다음 텍스트를 그대로 복사해 붙여넣으세요: "ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio, professional photography, cinematic motion, dynamic camera movement, sharp focus, detailed lighting"
12. **runwayPrompt**: RunwayML 비디오 생성용 영어 프롬프트 (매우 상세한 서술형, 3문장 이상)
    - 인물의 미세한 동작 (흔들리는 머리카락, 떨리는 손끝, 눈의 초점 변화, 피부의 질감 등) 및 해부학적으로 완벽하고 정밀한 손/발가락 묘사
    - 환경의 살아있는 요소 (바람, 빛 번짐, 입자 등)와 카메라 모션을 눈앞에 보이듯 묘사
    - 프롬프트 맨 끝에 반드시 다음 텍스트를 그대로 복사해 붙여넣으세요: "cinematic motion, fluid movement, photorealistic, highly detailed, 8k"
13. **runwayPromptKo**: runwayPrompt를 감각적이고 길게 번역한 한글 버전

**중요 원칙:**
- 📌 **[최우선 지침 1: MV 프롬프트 상세 설정 100% 시각 반영]**: 사용자가 입력한 시대(${era || "현대"}), 국가(${country || "한국"}), 장소(${location || "도시"}), 조명(${lighting || "자연광"}), 카메라(${cameraWork || "중간 샷"}), 분위기(${mood || "감성적"}), 인물(${characterInfoStr || "인물"}), 추가 설정(${customSettings || "없음"})은 모든 씬의 배경/인물/색채/카메라 묘사에 1:1로 정확히 포함되어야 합니다.
- 📌 **[최우선 지침 2: 가사 서사 시각화]**: 해당 씬의 [배정된 가사] 상황과 인물의 내면 감정/행동을 시각적 스토리로 전환하여 프롬프트에 깊이 있게 서술하세요. (영어 프롬프트 'promptEn'에는 가사 상황의 완벽한 영어 비주얼 묘사가 한글 단어 없이 100% 영문으로 포함되어야 함)
- ⚠️ **[필수 금지 조건]** Suno의 음악 스타일(BPM, 보컬, 믹스, 악기 명칭, '-harsh treble' 등의 부정어, 추임새 파편)을 Midjourney 프롬프트('promptEn', 'promptKo')에 텍스트 그대로 절대 쓰지 마세요. 오직 순수 시각적 비주얼(장소, 인물, 조명, 구도, 색감, 화질) 요소만 작성해야 합니다.

- 반드시 ${batchCount}개 정확히 생성 (더 적게도, 더 많게도 안 됨)
- 각 씬은 독립된 예술 작품이면서, 전체 시퀀스는 감정의 흐름을 따라 유기적으로 연결
- promptKo/runwayPromptKo는 한글, promptEn/runwayPrompt는 영어
- 순수 JSON 배열만 출력 (설명이나 주석 없이)

**출력 형식:**
\`\`\`json
[
  {
    "time": "0:00-0:07",
    "lyrics": "가사 내용",
    "sceneDescription": "비에 젖은 공원 길 위에서 인물이 창백한 가로등 아래 멀어진 기억을 바라보는 장면",
    "emotion": "nostalgic",
    "location": "rain-slicked cobblestone path through a quiet park, amber streetlights casting reflections in shallow puddles, mist curling around wrought-iron benches",
    "characterAction": "trailing fingertips along a rain-beaded window, breath fogging the glass, gazing at blurred city lights with distant longing eyes",
    "mood": "warm amber intimacy dissolving into cool blue solitude",
    "lighting": "soft golden hour sidelight with long shadows and warm lens flare kissing the edges",
    "cameraWork": "slow cinematic dolly-in from wide shot to intimate medium close-up, shallow depth of field",
    "promptKo": "비에 젖은 조약돌 길 위로 호박색 가로등 불빛이 웅덩이에 길게 반사되는 고요한 공원, 안개가 낡은 벤치 사이로 피어오르고...",
    "promptEn": "rain-slicked cobblestone path through a hushed park, amber streetlights reflecting in shallow puddles, mist curling around weathered wrought-iron benches...",
    "runwayPrompt": "A person trailing fingertips along a rain-beaded window, breath slowly fogging the cold glass, soft golden sidelight catching each droplet, gentle wind stirring nearby curtains, slow cinematic dolly pushing in, shallow depth of field with bokeh city lights dancing in the background...",
    "runwayPromptKo": "빗물 맺힌 창문을 따라 손끝을 천천히 흘리는 사람, 차가운 유리에 서서히 입김이 서리고..."
  }
]
\`\`\`

**지금 바로 JSON 배열 ${batchCount}개를 생성하세요:**`;

          let batchScenes = [];
          let bestPartialScenes = [];

          const normalizeBatchScenes = (aiScenes) => {
            const normalized = [];
            const scenesToUse = Array.isArray(aiScenes)
              ? aiScenes.slice(0, batchCount)
              : [];

            for (let localIdx = 0; localIdx < scenesToUse.length; localIdx++) {
              const globalIdx = batchStart + localIdx;
              const aiScene = scenesToUse[localIdx] || {};
              const timeStr = getMVGeneratedSceneTime(
                globalIdx,
                interval,
                totalSeconds,
              );

              let promptKo = typeof window.cleanMidjourneyPrompt === "function"
                ? window.cleanMidjourneyPrompt(aiScene.promptKo || "")
                : (aiScene.promptKo || "");
              let prompt = typeof window.cleanEnglishMidjourneyPrompt === "function"
                ? window.cleanEnglishMidjourneyPrompt(aiScene.promptEn || aiScene.prompt || "")
                : (aiScene.promptEn || aiScene.prompt || "");

              if (!prompt || prompt.length < 50) {
                const parts = [
                  aiScene.location,
                  aiScene.characterAction,
                  aiScene.emotion ? aiScene.emotion + " emotion" : "",
                  aiScene.mood,
                  aiScene.lighting,
                  aiScene.cameraWork,
                  country || "",
                  era ? era + " era" : "",
                  getArtisticKeywords(aiScene.emotion),
                ].filter((p) => p && p.trim() && !/[가-힣]/.test(p));
                prompt = parts.join(", ").trim();
                if (!prompt.endsWith(".")) prompt += ".";
              }

              if (!promptKo || promptKo.length < 20) {
                promptKo =
                  aiScene.promptKo ||
                  aiScene.location ||
                  preAllocatedLyrics[globalIdx] ||
                  `씬 ${globalIdx + 1}`;
              }

              prompt = prompt
                .replace(/[가-힣]+/g, "")
                .replace(/,\s*,+/g, ", ")
                .replace(/\s+/g, " ")
                .trim();
              if (!prompt.endsWith(".")) prompt = prompt.replace(/,+$/, "") + ".";

              const mjKeywords =
                "ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio, professional photography, cinematic motion, dynamic camera movement, sharp focus, detailed lighting";
              if (
                !prompt.includes("cinematic composition") &&
                !prompt.includes("sharp focus")
              ) {
                prompt = prompt.replace(/\.$/, ", ") + mjKeywords + ".";
              }

              let finalRunwayPrompt = aiScene.runwayPrompt || "";
              if (finalRunwayPrompt) {
                const rwKeywords =
                  "cinematic motion, fluid movement, photorealistic, highly detailed, 8k";
                if (!finalRunwayPrompt.includes("fluid movement")) {
                  finalRunwayPrompt =
                    finalRunwayPrompt.trim().replace(/\.$/, "") +
                    ", " +
                    rwKeywords +
                    ".";
                }
              }

              const sceneLyrics =
                aiScene.lyrics &&
                aiScene.lyrics !== `씬 ${globalIdx + 1}` &&
                aiScene.lyrics.trim() !== ""
                  ? aiScene.lyrics
                  : preAllocatedLyrics[globalIdx] || "";
              const sceneDescription =
                aiScene.sceneDescription ||
                aiScene.visualDescription ||
                aiScene.description ||
                buildMVSceneVisualDescription(
                  {
                    ...aiScene,
                    prompt,
                    promptKo,
                    lyrics: sceneLyrics,
                    scene: "",
                  },
                  globalIdx,
                );

              normalized.push({
                time: timeStr,
                scene: sceneDescription,
                visualDescription: sceneDescription,
                lyrics: sceneLyrics,
                prompt: `/* Scene ${globalIdx + 1} */ ${prompt}`,
                promptKo,
                runwayPrompt: finalRunwayPrompt,
                runwayPromptKo: aiScene.runwayPromptKo || "",
                location: aiScene.location || "",
                emotion: aiScene.emotion || "",
                mood: aiScene.mood || "",
                lighting: aiScene.lighting || "",
                characterAction: aiScene.characterAction || "",
                cameraWork: aiScene.cameraWork || "",
              });
            }

            return normalized;
          };

          const callSceneBatchApi = async (apiName, promptText) => {
            if (apiName === "Gemini") {
              return window.callGeminiForScenes(promptText, geminiKey);
            }
            return window.callChatGPTForScenes(promptText, openaiKey);
          };

          const apiSequence = useGeminiFirst
            ? ["Gemini", hasChatGPT ? "ChatGPT" : null].filter(Boolean)
            : ["ChatGPT", "Gemini"].filter((apiName) =>
                apiName === "ChatGPT" ? hasChatGPT : true,
              );
          const retryPromptSuffix = `

【재시도 지시】
이전 응답은 JSON 파싱 또는 씬 개수 검증에 실패했습니다.
반드시 설명 없이 순수 JSON 배열만 출력하고, 배열 길이는 정확히 ${batchCount}개여야 합니다.
각 객체는 time, lyrics, sceneDescription, emotion, location, characterAction, mood, lighting, cameraWork, promptKo, promptEn, runwayPrompt, runwayPromptKo 필드를 모두 포함해야 합니다.`;

          for (let attempt = 0; attempt < 2; attempt++) {
            for (const apiName of apiSequence) {
              const promptForAttempt =
                attempt === 0 ? analysisPrompt : analysisPrompt + retryPromptSuffix;

              try {
                if (mvLoading) {
                  const loadingText = mvLoading.querySelector(".loading-text");
                  if (loadingText) {
                    loadingText.textContent = `씬 생성 중... (배치 ${batchIdx + 1}/${totalBatches} · ${apiName}${attempt > 0 ? " 재시도" : ""} · ${batchEnd}/${imageCount}개 완료)`;
                  }
                }

                const aiResponse = await callSceneBatchApi(apiName, promptForAttempt);
                console.log(
                  `🤖 배치 ${batchIdx + 1}/${totalBatches} [${apiName}${attempt > 0 ? " 재시도" : ""}] 응답 수신`,
                );

                const aiScenes = extractMVSceneArrayFromAIResponse(aiResponse);
                const normalizedScenes = normalizeBatchScenes(aiScenes);
                if (normalizedScenes.length > bestPartialScenes.length) {
                  bestPartialScenes = normalizedScenes;
                }

                if (normalizedScenes.length >= batchCount) {
                  batchScenes = normalizedScenes.slice(0, batchCount);
                  break;
                }

                console.warn(
                  `⚠️ 배치 ${batchIdx + 1} [${apiName}] 씬 개수 부족: ${normalizedScenes.length}/${batchCount}`,
                );
              } catch (batchApiError) {
                console.warn(
                  `⚠️ 배치 ${batchIdx + 1} [${apiName}${attempt > 0 ? " 재시도" : ""}] 실패:`,
                  batchApiError.message || batchApiError,
                );
              }
            }

            if (batchScenes.length >= batchCount) break;
            if (attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 250));
            }
          }

          if (batchScenes.length < batchCount && bestPartialScenes.length > 0) {
            batchScenes = bestPartialScenes;
            console.warn(
              `⚠️ 배치 ${batchIdx + 1} 부분 응답 사용: ${batchScenes.length}/${batchCount}`,
            );
          }

          if (batchScenes.length < batchCount) {
            const baseFillPrompt =
              batchScenes.length > 0
                ? (batchScenes[batchScenes.length - 1].prompt || "")
                    .replace(/\/\*\s*Scene\s+\d+\s*\*\//gi, "")
                    .trim()
                : "cinematic scene, ultra high quality, 8k resolution, photorealistic.";
            const baseFillKo =
              batchScenes.length > 0
                ? batchScenes[batchScenes.length - 1].promptKo || ""
                : "";

            for (
              let fillIdx = batchScenes.length;
              fillIdx < batchCount;
              fillIdx++
            ) {
              const globalIdx = batchStart + fillIdx;
              const startTime = globalIdx * interval;
              const endTime = Math.min(startTime + interval, totalSeconds);
              const sMin = Math.floor(startTime / 60);
              const sSec = Math.floor(startTime % 60);
              const eMin = Math.floor(endTime / 60);
              const eSec = Math.floor(endTime % 60);
              const fillTimeStr = `${sMin}:${String(sSec).padStart(2, "0")}-${eMin}:${String(eSec).padStart(2, "0")}`;

              batchScenes.push({
                time: fillTimeStr,
                scene: buildMVSceneVisualDescription(
                  {
                    prompt: baseFillPrompt,
                    promptKo: baseFillKo,
                    location,
                    mood,
                    lighting,
                    cameraWork,
                  },
                  globalIdx,
                ),
                visualDescription: buildMVSceneVisualDescription(
                  {
                    prompt: baseFillPrompt,
                    promptKo: baseFillKo,
                    location,
                    mood,
                    lighting,
                    cameraWork,
                  },
                  globalIdx,
                ),
                lyrics: preAllocatedLyrics[globalIdx] || "",
                prompt: `/* Scene ${globalIdx + 1} */ ${baseFillPrompt}`,
                promptKo: baseFillKo,
                runwayPrompt: "",
                runwayPromptKo: "",
                location: location || "",
                emotion: "",
                mood: mood || "",
                lighting: lighting || "",
                characterAction: "",
                cameraWork: cameraWork || "",
                _isFilled: true,
                _fillReason: "AI 응답 개수 부족 또는 JSON 파싱 실패",
              });
            }
          }

          console.log(
            `✅ 배치 ${batchIdx + 1}/${totalBatches} 완료: ${batchScenes.length}개 씬 생성`,
          );

          // 배치 결과를 scenes에 병합
          scenes.push(...batchScenes);

          // 배치 간 짧은 딜레이 (API rate limit 회피)
          if (batchIdx < totalBatches - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        } // end for batchIdx

        // ═══════════════════════════════════════════════════════════════
        // 자동 검증: scenes.length === imageCount 확인
        // ═══════════════════════════════════════════════════════════════
        console.log(
          `🔍 자동 검증: 생성된 씬(${scenes.length}) vs 예상 씬(${imageCount})`,
        );

        if (scenes.length > imageCount) {
          console.warn(`✂️ 초과 씬 제거: ${scenes.length}개 → ${imageCount}개`);
          scenes = scenes.slice(0, imageCount);
        }

        if (scenes.length < imageCount) {
          console.warn(`⚠️ 씬 부족 보충: ${scenes.length}개 → ${imageCount}개`);
          const lastScene =
            scenes.length > 0 ? scenes[scenes.length - 1] : null;
          for (let fillIdx = scenes.length; fillIdx < imageCount; fillIdx++) {
            const startTime = fillIdx * interval;
            const endTime = Math.min(startTime + interval, totalSeconds);
            const sMin = Math.floor(startTime / 60);
            const sSec = Math.floor(startTime % 60);
            const eMin = Math.floor(endTime / 60);
            const eSec = Math.floor(endTime % 60);
            const fillTimeStr = `${sMin}:${String(sSec).padStart(2, "0")}-${eMin}:${String(eSec).padStart(2, "0")}`;
            const baseEn = lastScene
              ? (lastScene.prompt || "")
                  .replace(/\/\*\s*Scene\s+\d+\s*\*\//gi, "")
                  .trim()
              : "cinematic scene, photorealistic.";
            scenes.push({
              time: fillTimeStr,
              scene: buildMVSceneVisualDescription(
                {
                  prompt: baseEn,
                  promptKo: lastScene?.promptKo || "",
                  location: lastScene?.location || "",
                  mood: lastScene?.mood || "",
                  lighting: lastScene?.lighting || "",
                  cameraWork: lastScene?.cameraWork || "",
                },
                fillIdx,
              ),
              visualDescription: buildMVSceneVisualDescription(
                {
                  prompt: baseEn,
                  promptKo: lastScene?.promptKo || "",
                  location: lastScene?.location || "",
                  mood: lastScene?.mood || "",
                  lighting: lastScene?.lighting || "",
                  cameraWork: lastScene?.cameraWork || "",
                },
                fillIdx,
              ),
              lyrics: preAllocatedLyrics[fillIdx] || "",
              prompt: `/* Scene ${fillIdx + 1} */ ${baseEn}`,
              promptKo: lastScene?.promptKo || "",
              runwayPrompt: lastScene?.runwayPrompt || "",
              runwayPromptKo: lastScene?.runwayPromptKo || "",
              location: lastScene?.location || "",
              emotion: lastScene?.emotion || "",
              mood: lastScene?.mood || "",
              lighting: lastScene?.lighting || "",
              characterAction: lastScene?.characterAction || "",
              cameraWork: lastScene?.cameraWork || "",
              _isFilled: true,
            });
          }
        }

        if (scenes.length === imageCount) {
          console.log(
            `✅ 최종 씬 수 검증 통과: ${scenes.length}개 / 예상 ${imageCount}개`,
          );
        } else {
          console.error(
            `❌ 씬 수 불일치: ${scenes.length}개 / 예상 ${imageCount}개`,
          );
        }

        if (scenes.length === 0) {
          throw new Error("생성된 씬이 없습니다");
        }
      } catch (aiError) {
        console.error("❌ AI 씬 생성 실패, 기본 방식으로 전환:", aiError);
        console.error("에러 상세:", aiError.stack);
        useAI = false;
      }
    } else {
      console.log("⚠️ Gemini API 키가 없어 기본 방식으로 씬 생성합니다.");
    }

    // AI 생성 실패 시 기본 방식 사용 (가사 내용 반영하여 AI로 생성)
    if (!useAI || scenes.length === 0) {
      console.log("📝 기본 방식으로 씬 생성 (가사 내용 반영)...");

      // Gemini API를 사용하여 가사 내용을 반영한 프롬프트 생성
      const geminiKey = window.getGeminiApiKey();

      if (
        geminiKey &&
        geminiKey.startsWith("AIza") &&
        cleanLyrics &&
        cleanLyrics.trim()
      ) {
        try {
          // 각 씬별로 가사 내용을 반영하여 프롬프트 생성
          let currentTime = 0;

          for (let i = 0; i < imageCount; i++) {
            const startTime = currentTime;
            const endTime = Math.min(currentTime + interval, totalSeconds);

            const startMin = Math.floor(startTime / 60);
            const startSec = Math.floor(startTime % 60);
            const endMin = Math.floor(endTime / 60);
            const endSec = Math.floor(endTime % 60);
            const timeStr = `${startMin}:${String(startSec).padStart(2, "0")}-${endMin}:${String(endSec).padStart(2, "0")}`;

            // 해당 구간의 가사 추출
            const progress = i / imageCount;
            const lyricsIndex = Math.floor(progress * lyricsLines.length);
            const sceneLyrics =
              lyricsLines[lyricsIndex] || lyricsLines[0] || "";

            // 인물 정보 문자열 생성
            let characterInfo = "";
            if (characters && characters.length > 0) {
              characterInfo = characters
                .map((c) => `${c.gender || ""} ${c.appearance || ""}`)
                .filter((s) => s.trim())
                .join(", ");
            }

            const prompt = `당신은 세계적인 뮤직비디오 감독입니다. 가사의 감정을 영화적 시각 언어로 변환하여, 예술 작품 수준의 Midjourney 프롬프트를 설계하세요.

【가사 내용】 (가장 중요 — 감정과 서사를 여기서 추출하세요)
"${sceneLyrics}"

【전체 가사 맥락】 (서사 아크 파악용)
${cleanLyrics.substring(0, 500)}${cleanLyrics.length > 500 ? "..." : ""}

【MV 설정】 (가사 감정과 자연스럽게 융합하세요)
- 시대: ${era || "현대"}
- 국가: ${country || "한국"}
- 장소: ${location || "도시"}
- 조명: ${lighting || "자연광"}
- 카메라: ${cameraWork || "중간 샷"}
- 분위기: ${mood || "감성적"}
- 인물: ${characterInfo || "1명"}
${customSettings ? `- 추가: ${customSettings}` : ""}

【작업 요구사항 — 예술적 품질 기준】
1. 가사의 감정을 **시각적 메타포**로 전환하세요 (추상적 감정 → 구체적 시각 요소)
2. 장소를 단순 나열이 아닌 **감정이 깃든 공간**으로 묘사 (빛·그림자·질감·공기의 느낌까지 표현)
3. 인물 동작은 **내면 감정이 외면에 스며드는** 미세한 제스처로 표현하고, 기형이 없도록 손가락, 발가락, 손 모양, 발 모양, 팔, 다리 등 인체 구조를 매우 정밀하고 자연스럽게 묘사
4. 빛·색채·질감을 감정에 맞게 세밀히 설정 (예: 부드러운 필름 결, 황금빛 렌즈 플레어, 보케 배경 등)
5. 배경, 인물, 조명, 카메라 워크를 모두 포함한 완성된 프롬프트
6. 영어 프롬프트('promptEn')는 한글 없이 순수 영어만 사용하며, 단순 단어 나열이 아닌 **최소 3~4문장의 긴 시각적 묘사 단락(Paragraph)**으로 작성.
   - 마지막에 콤마(,)와 함께 다음 키워드를 반드시 붙여넣으세요: "ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio, professional photography, cinematic motion, dynamic camera movement, sharp focus, detailed lighting"
7. 한글 프롬프트('promptKo')는 위 영문을 바탕으로 매우 감각적이고 디테일한 한글 3문장 이상으로 작성.
8. Runway 프롬프트('runwayPrompt')는 인물과 환경의 미세 애니메이션을 구체적으로 길게 서술. 마지막에 "cinematic motion, fluid movement, photorealistic, highly detailed, 8k" 를 붙여넣기.
9. **프롬프트만 출력** (설명이나 주석 없이)

**출력 형식 (순수 JSON만):**
\`\`\`json
{
  "scenes": [
    {
	      "time": "0:00-0:15",
	      "lyrics": "해당 구간의 실제 가사 내용",
	      "sceneDescription": "프롬프트를 요약한 한국어 비주얼 장면 설명",
	      "promptEn": "감정·빛·질감·공간감이 살아있는 60단어 이상의 Midjourney 영어 프롬프트",
      "promptKo": "위 영어 프롬프트를 감각적으로 번역한 한글 프롬프트",
      "runwayPrompt": "인물의 미세한 동작(머리카락 흔들림, 눈 초점 변화, 호흡)과 환경 모션(나뭇잎, 빛 변화, 구름), 카메라 모션(dolly, pan, parallax), 조명 변화까지 포함한 영문 비디오 프롬프트",
      "runwayPromptKo": "위 Runway 프롬프트의 한글 번역",
	      "location": "감정이 스며든 공간 묘사",
      "characterAction": "내면이 드러나는 섬세한 동작",
	      "lighting": "빛의 방향·색·질감 묘사"
    }
  ]
}
\`\`\`

**Runway Video Prompt 작성 지침:**
1. **미세한 인물 동작** 필수: 바람에 흔들리는 머리카락, 떨리는 손끝, 눈의 초점 변화, 호흡에 따른 미세한 움직임
2. **환경의 살아있는 요소** 필수: 흔들리는 나뭇잎, 흐르는 물, 떨어지는 빗방울, 이동하는 구름, 먼지의 움직임
3. **카메라 모션**: slow dolly, gentle pan, subtle parallax, floating steadicam 등 구체적 동작
4. **조명 변화**: shifting shadows, flickering light, drifting sun rays 등 동적 조명

**지금 바로 JSON을 생성하세요:**`;

            // callGeminiWithAutoRoute: 실제 키는 직접 호출, 프록시 인증은 /api/gemini 사용
            let promptEn = "";
	            let promptKo = "";
	            let aiScene_runwayPrompt = "";
	            let aiSceneDescription = "";
            try {
              const aiSceneText = await (window.callGeminiWithAutoRoute || callGeminiWithAutoRoute)(
                prompt,
                { temperature: 0.92, topK: 40, topP: 0.95, maxOutputTokens: 2048 },
                geminiKey,
              );
              if (window.logApiUsage) window.logApiUsage("gemini");

              // JSON 추출
              let cleanedResponse = aiSceneText.trim();
              cleanedResponse = cleanedResponse
                .replace(/```json\s*/gi, "")
                .replace(/```\s*/g, "")
                .trim();

              const firstBrace = cleanedResponse.indexOf("{");
              const lastBrace = cleanedResponse.lastIndexOf("}");
              if (firstBrace !== -1 && lastBrace !== -1) {
                try {
                  const jsonStr = cleanedResponse.substring(
                    firstBrace,
                    lastBrace + 1,
                  );
                  const aiJson = JSON.parse(jsonStr);
                  const aiPrompts =
                    aiJson.scenes && aiJson.scenes.length > 0
                      ? aiJson.scenes[0]
                      : aiJson;
	                  promptEn = aiPrompts.promptEn || "";
	                  promptKo = aiPrompts.promptKo || "";
	                  aiSceneDescription =
	                    aiPrompts.sceneDescription ||
	                    aiPrompts.visualDescription ||
	                    aiPrompts.description ||
	                    "";
                  var runwayPrompt = aiPrompts.runwayPrompt || "";
                  if (runwayPrompt) {
                    aiScene_runwayPrompt = runwayPrompt;
                  }
                } catch (e) {
                  console.warn(`씬 ${i + 1} JSON 파싱 실패:`, e);
                }
              }
            } catch (aiErr) {
              console.warn(`씬 ${i + 1} AI 호출 실패:`, aiErr.message);
            }

            // 해당 씬 가사에 맞는 장소 1개 (fallback/라벨용)
            let chosenLoc =
              (typeof window.pickBestLocationForScene === "function"
                ? window.pickBestLocationForScene(sceneLyrics, i, imageCount)
                : null) ||
              (location ? (location.split(",")[0] || location).trim() : null);
            const selectedLocationValues =
              typeof window.getMVLocationValues === "function"
                ? window.getMVLocationValues()
                : [];
            const visualTone =
              typeof window.recommendMVSceneVisualTone === "function"
                ? window.recommendMVSceneVisualTone(sceneLyrics, selectedLocationValues)
                : null;
            if (visualTone?.locationHint) {
              chosenLoc = visualTone.locationHint;
            }

            // AI 생성 실패 시 기본 조합
            if (!promptEn || promptEn.length < 50) {
              // 가사 내용을 포함한 기본 프롬프트 생성
              let promptParts = [];

              // 가사 내용을 먼저 포함
              if (sceneLyrics && sceneLyrics.trim()) {
                promptParts.push(`scene depicting: "${sceneLyrics.trim()}"`);
              }

              // 인물 정보
              if (characterInfo) {
                promptParts.push(characterInfo);
              }

              // 배경: 해당 씬 가사에 맞는 장소 1개만 선택하여 반영 (chosenLoc 사용)
              if (chosenLoc) {
                const en =
                  typeof MV_LOCATION_MAP !== "undefined" &&
                  MV_LOCATION_MAP[chosenLoc]
                    ? MV_LOCATION_MAP[chosenLoc].en
                    : chosenLoc;
                promptParts.push(en);
              } else if (location) {
                promptParts.push(
                  typeof MV_LOCATION_MAP !== "undefined" &&
                    MV_LOCATION_MAP[location]
                    ? MV_LOCATION_MAP[location].en
                    : location,
                );
              }

              // 설정 추가
              if (country) {
                const countryMap = {
                  korea: "Korea",
                  japan: "Japan",
                  usa: "USA",
                  uk: "UK",
                };
                promptParts.push(countryMap[country] || country);
              }
              if (era) promptParts.push(era + " era");
              promptParts.push((visualTone?.lighting || lighting || "cinematic") + " lighting");
              promptParts.push(visualTone?.cameraWork || cameraWork || "slow cinematic camera movement");
              promptParts.push((visualTone?.mood || mood || "emotional") + " mood");
              if (visualTone?.emotion) promptParts.push(visualTone.emotion + " emotion");

              promptParts.push(
                getArtisticKeywords(visualTone?.emotion || mood || ""),
              );

              promptEn = promptParts.join(", ").trim();
              if (!promptEn.endsWith(".")) promptEn += ".";

              // 한글 프롬프트 생성
              if (!promptKo || promptKo.length < 50) {
                try {
                  promptKo =
                    (await translateEnglishToKoreanForScene(
                      "prompt",
                      promptEn,
                    )) || "";
                } catch (e) {
                  // 번역 실패 시 기본 한글 조합
                  const locForKo =
                    typeof MV_LOCATION_MAP !== "undefined" &&
                    chosenLoc &&
                    MV_LOCATION_MAP[chosenLoc]
                      ? MV_LOCATION_MAP[chosenLoc].ko
                      : location || "배경";
                  promptKo =
                    sceneLyrics +
                    ", " +
                    (characterInfo || "인물") +
                    ", " +
                    locForKo;
                }
              }
            }

            // 씬 번호 주석 추가
            const promptWithNumber = `/* Scene ${i + 1} */ ${promptEn}`;
            const sceneLocationLabel =
              chosenLoc &&
              typeof MV_LOCATION_MAP !== "undefined" &&
              MV_LOCATION_MAP[chosenLoc]
                ? MV_LOCATION_MAP[chosenLoc].ko
                : location || "배경";
            const sceneDescription =
              aiSceneDescription ||
              buildMVSceneVisualDescription(
                {
                  prompt: promptEn,
                  promptKo,
                  location: sceneLocationLabel,
                  emotion: visualTone?.emotion || "",
                  mood: visualTone?.mood || mood || "",
                  lighting: visualTone?.lighting || lighting || "",
                  cameraWork: visualTone?.cameraWork || cameraWork || "",
                },
                i,
              );

            scenes.push({
              time: timeStr,
              scene: sceneDescription,
              visualDescription: sceneDescription,
              lyrics: sceneLyrics,
              prompt: promptWithNumber,
              promptKo: promptKo,
              runwayPrompt:
                typeof aiScene_runwayPrompt !== "undefined"
                  ? aiScene_runwayPrompt
                  : promptEn.replace(/\/\*.*?\*\//g, "").trim() +
                    ", cinematic motion, 8k, highly detailed",
              location: sceneLocationLabel,
              emotion: visualTone?.emotion || "",
              mood: visualTone?.mood || mood || "",
              lighting: visualTone?.lighting || lighting || "",
              cameraWork: visualTone?.cameraWork || cameraWork || "",
            });

            currentTime = endTime;

            // API 호출 제한을 고려하여 약간의 지연
            if (i < imageCount - 1) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }

          console.log(`✅ ${scenes.length}개 씬 생성 완료 (가사 내용 반영)`);
        } catch (error) {
          console.error("❌ 기본 방식 AI 생성 실패:", error);
          // 완전 기본 방식으로 전환하지 않고, 생성된 씬이 있으면 사용
        }
      } else {
        console.warn(
          "⚠️ Gemini API 키가 없어 기본 조합 방식으로 씬 생성합니다.",
        );
        // API 키가 없을 때만 완전 기본 방식 사용
      }
    }

    if (scenes.length === 0 && cleanLyrics && cleanLyrics.trim()) {
      console.log("📝 API 키 없이 로컬 기본 방식으로 씬 생성합니다.");
      let currentTime = 0;

      for (let i = 0; i < imageCount; i++) {
        const startTime = currentTime;
        const endTime = Math.min(currentTime + interval, totalSeconds);
        const startMin = Math.floor(startTime / 60);
        const startSec = Math.floor(startTime % 60);
        const endMin = Math.floor(endTime / 60);
        const endSec = Math.floor(endTime % 60);
        const timeStr = `${startMin}:${String(startSec).padStart(2, "0")}-${endMin}:${String(endSec).padStart(2, "0")}`;
        const sceneLyrics =
          preAllocatedLyrics[i] ||
          lyricsLines[Math.floor((i / imageCount) * lyricsLines.length)] ||
          lyricsLines[0] ||
          `씬 ${i + 1}`;
        let chosenLoc =
          (typeof window.pickBestLocationForScene === "function"
            ? window.pickBestLocationForScene(sceneLyrics, i, imageCount)
            : null) ||
          (location ? (location.split(",")[0] || location).trim() : null);
        const selectedLocationValues =
          typeof window.getMVLocationValues === "function"
            ? window.getMVLocationValues()
            : [];
        const visualTone =
          typeof window.recommendMVSceneVisualTone === "function"
            ? window.recommendMVSceneVisualTone(sceneLyrics, selectedLocationValues)
            : null;
        if (visualTone?.locationHint) {
          chosenLoc = visualTone.locationHint;
        }
        const characterInfo = characters
          .map((c) => `${c.gender || ""} ${c.appearance || ""}`.trim())
          .filter(Boolean)
          .join(", ");
        const locationEn =
          chosenLoc &&
          typeof MV_LOCATION_MAP !== "undefined" &&
          MV_LOCATION_MAP[chosenLoc]
            ? MV_LOCATION_MAP[chosenLoc].en
            : chosenLoc || location || "cinematic music video location";
        const locationKo =
          chosenLoc &&
          typeof MV_LOCATION_MAP !== "undefined" &&
          MV_LOCATION_MAP[chosenLoc]
            ? MV_LOCATION_MAP[chosenLoc].ko
            : chosenLoc || location || "뮤직비디오 배경";
        const characterInfoEn = characters
          .map((c, idx) => {
            const genderEn = c.gender === "여성" ? "female" : c.gender === "남성" ? "male" : c.gender || "";
            const raceEn = c.race === "한국인" || c.race === "동양인" ? "Asian" : c.race || "";
            return `Character ${idx + 1}: ${genderEn} ${c.age || ""} ${raceEn} ${c.appearance || ""}`.trim();
          })
          .filter(Boolean)
          .join("; ");

        const promptParts = [
          locationEn,
          characterInfoEn,
          country ? `${country} setting` : "",
          era ? `${era} era` : "",
          `${visualTone?.lighting || lighting || "cinematic"} lighting`,
          visualTone?.cameraWork || cameraWork || "slow cinematic camera movement",
          `${visualTone?.mood || mood || "emotional"} mood`,
          visualTone?.emotion ? `${visualTone.emotion} emotion` : "",
          getArtisticKeywords(visualTone?.emotion || mood || ""),
        ].filter(Boolean);
        let promptEn = `/* Scene ${i + 1} */ ${promptParts.join(", ")}.`;
        if (typeof window.cleanEnglishMidjourneyPrompt === "function") {
          promptEn = window.cleanEnglishMidjourneyPrompt(promptEn);
        }
        const promptKo = [
          sceneLyrics,
          characterInfo || "인물",
          locationKo,
          visualTone?.lighting || lighting || "시네마틱 조명",
          visualTone?.cameraWork || cameraWork || "느린 카메라 움직임",
          visualTone?.mood || mood || "감성적인 분위기",
          "초고화질, 8k 해상도, 시네마틱 구도",
        ]
          .filter(Boolean)
          .join(", ");
        const sceneDescription = buildMVSceneVisualDescription(
          {
            prompt: promptEn,
            promptKo,
            location: locationKo,
            emotion: visualTone?.emotion || "",
            mood: visualTone?.mood || mood || "",
            lighting: visualTone?.lighting || lighting || "",
            cameraWork: visualTone?.cameraWork || cameraWork || "",
          },
          i,
        );

        scenes.push({
          time: timeStr,
          scene: sceneDescription,
          visualDescription: sceneDescription,
          lyrics: sceneLyrics,
          prompt: promptEn,
          promptKo,
          runwayPrompt:
            promptEn.replace(/\/\*\s*Scene\s+\d+\s*\//gi, "").trim() +
            " cinematic motion, fluid movement, photorealistic, highly detailed, 8k.",
          runwayPromptKo: `${promptKo}, 자연스러운 움직임과 카메라 모션`,
          location: locationKo,
          emotion: visualTone?.emotion || "",
          mood: visualTone?.mood || mood || "",
          lighting: visualTone?.lighting || lighting || "",
          characterAction: "",
          cameraWork: visualTone?.cameraWork || cameraWork || "",
          _isLocalFallback: true,
        });

        currentTime = endTime;
      }

      console.log(`✅ 로컬 기본 방식 씬 생성 완료: ${scenes.length}개`);
    }

    // 씬 중복 검증 및 개선
    scenes = ensureSceneDiversity(scenes);

    // UI 업데이트 (로딩 숨기고 버튼 복구)
    setGeneratingUI(false);

    // 썸네일/배경/인물 프롬프트 생성 (이미 선언된 변수들 재사용)
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

    // [신규] 분리된 렌더링 함수 호출
    if (typeof window.renderMvThumbnailPromptsUI === "function") {
      window.renderMvThumbnailPromptsUI(thumbnailPrompts);
    }
    if (typeof window.renderSceneOverview === "function") {
      window.renderSceneOverview(scenes);
    }

    if (mvSceneOverviewSection) {
      mvSceneOverviewSection.classList.remove("hidden");
      mvSceneOverviewSection.style.display = "block";
    }

    // 결과 섹션(mvResultsSection)은 이 단계(초안 작성)에서는 숨겨둠 (저장 후에만 표시)
    if (mvResultsSection) {
      mvResultsSection.classList.add("hidden");
      mvResultsSection.style.display = "none";
    }

    if (typeof window.updateMVWorkflowSummary === "function") {
      window.updateMVWorkflowSummary();
    }

    // 총 이미지 수 및 길이 업데이트
    const totalImagesEl = document.getElementById("mvTotalImages");
    const totalDurationEl = document.getElementById("mvTotalDuration");
    const intervalDisplayEl = document.getElementById("mvIntervalDisplay");
    if (totalImagesEl) totalImagesEl.textContent = scenes.length;
    if (totalDurationEl)
      totalDurationEl.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
    if (intervalDisplayEl) intervalDisplayEl.textContent = interval;

    window.currentScenes = scenes;

    console.log(
      "✅ MV 프롬프트 생성 완료:",
      scenes.length,
      "개 씬",
      useAI ? "(AI 생성)" : "(기본 방식)",
    );

    // 썸네일/배경/인물 프롬프트 자동 생성
    if (typeof window.generateMVThumbnailPrompts === "function") {
      try {
        console.log("🎨 썸네일/배경/인물 프롬프트 자동 생성 시작...");
        await window.generateMVThumbnailPrompts(
          era,
          country,
          location,
          characters,
          customSettings,
          lighting,
          cameraWork,
          mood,
        );
        console.log("✅ 썸네일/배경/인물 프롬프트 자동 생성 완료");
      } catch (thumbErr) {
        console.warn("⚠️ 썸네일 프롬프트 자동 생성 실패:", thumbErr);
      }
    }

    // [중요] 모든 생성이 완료된 후 즉시 프로젝트 자동 저장 (영속성 확보)
    if (typeof window.saveCurrentProject === "function") {
      console.log("💾 MV 프롬프트 생성 결과 자동 저장 중...");
      window.saveCurrentProject();
    }

    if (typeof window.updateMVWorkflowSummary === "function") {
      window.updateMVWorkflowSummary();
    }

    // 생성 완료 후 버튼 상태 복원
    setGeneratingUI(false);

  } catch (error) {
    console.error("❌ MV 프롬프트 생성 오류:", error);
    console.error("오류 스택:", error.stack);
    setGeneratingUI(false);

    let errorMessage = "MV 프롬프트 생성 중 오류가 발생했습니다.";
    if (error.message) {
      errorMessage += `\n\n오류: ${error.message}`;
    }

    // handleAPIError가 있으면 사용, 없으면 기본 메시지
    if (typeof window.handleAPIError === "function") {
      try {
        const errorInfo = await window.handleAPIError(
          error,
          "MV 프롬프트 생성",
        );
        window.showToast(
          `${errorMessage}\n\n${errorInfo.userMessage || ""}\n\n상세: ${errorInfo.error || error.message}`, "info");
      } catch (e) {
        window.showToast(errorMessage, "info");
      }
    } else {
      window.showToast(errorMessage, "info");
    }
  }
};

// --- Extracted generateMVThumbnailPrompts ---
window.generateMVThumbnailPrompts = async function (
  era,
  country,
  location,
  characters,
  customSettings,
  lighting,
  cameraWork,
  mood,
) {
  try {
    console.log("🎨 썸네일/배경/인물 프롬프트 생성 시작 (AI 기반)...");

    const finalLyrics =
      document.getElementById("finalLyrics")?.textContent ||
      document.getElementById("finalizedLyrics")?.value ||
      document.getElementById("sunoLyrics")?.value ||
      "";
    const stylePrompt = getMVFinalStylePromptText();
    const productionContextBlock = getMVProductionContextBlock();

    if (!finalLyrics.trim()) {
      console.warn("가사가 없어 썸네일 프롬프트를 생성할 수 없습니다.");
      return {
        thumbnailEn: "",
        thumbnailKo: "",
        backgroundEn: "",
        backgroundKo: "",
        characterEn: "",
        characterKo: "",
      };
    }

    const cleanLyrics = extractLyricsOnly(finalLyrics);
    console.log("📝 가사 분석:", cleanLyrics.substring(0, 100) + "...");

    // 인물 정보 문자열 생성 (성별, 나이, 인종, 외모/스타일)
    let characterInfo = "";
    if (characters && characters.length > 0) {
      const genderMap = {
        male: "남성",
        female: "여성",
        "non-binary": "논바이너리",
      };
      const ageMap = {
        child: "어린이",
        teen: "청소년",
        "20s": "20대",
        "30s": "30대",
        "40s": "40대",
        "50s": "50대",
        elder: "장년",
      };
      const raceMap = {
        asian: "아시아인",
        caucasian: "백인",
        african: "아프리카인",
        hispanic: "히스패닉/라틴계",
        "middle-eastern": "중동인",
        mixed: "혼혈",
      };

      characterInfo = characters
        .map((c, idx) => {
          const parts = [];
          if (c.gender) parts.push(genderMap[c.gender] || c.gender);
          if (c.age) parts.push(ageMap[c.age] || c.age);
          if (c.race) parts.push(raceMap[c.race] || c.race);
          if (c.appearance) parts.push(c.appearance);
          return parts.length > 0 ? `인물${idx + 1}: ${parts.join(", ")}` : "";
        })
        .filter((s) => s.trim())
        .join("; ");
    }

    // Gemini API를 사용하여 세밀한 프롬프트 생성
    const geminiKey = window.getGeminiApiKey();
    let thumbnailEn = "";
    let thumbnailKo = "";
    let backgroundEn = "";
    let backgroundKo = "";
    let characterEn = "";
    let characterKo = "";

    if (geminiKey && geminiKey.startsWith("AIza")) {
      try {
        // 캐릭터 시트 원본 정보 수집
        const characterSheetsFull = typeof window.getAllCharacterSheetsFull === "function" ? window.getAllCharacterSheetsFull() : "";

        const prompt = `다음 음악 가사와 설정을 기반으로 Midjourney용 **세밀하고 상세한** 영어 프롬프트와 한글 프롬프트를 각각 3개씩 생성하세요.

【가사】 (가장 중요 - 반드시 각 프롬프트에 구체적으로 반영하세요!)
${cleanLyrics}

【스타일】
${stylePrompt || "감성적인 발라드"}

${productionContextBlock}

【MV 설정】 (보조 참고용 - 가사 내용을 우선하되 자연스럽게 융합)
- 시대: ${era || "현대"}
- 국가: ${country || "한국"}
- 장소: ${location || "도시"}
- 조명: ${lighting || "자연광"}
- 카메라: ${cameraWork || "중간 샷"}
- 분위기: ${mood || "감성적"}
${characterSheetsFull ? `
【캐릭터 디자인 시트 원본 — 외형 묘사 일관성 100% 원칙】
아래는 확정된 캐릭터들의 디자인 시트 원본(Full Data)입니다. 
생성하는 모든 프롬프트(썸네일, 배경, 인물 프롬프트)에서, 인물의 외모, 머리카락, 의상, 질감, 색상 등을 **정확하고 구체적으로 100% 일치하도록 최우선으로 반영**하세요.
${characterSheetsFull}
` : `- 인물: ${characterInfo || "1명"}`}
${customSettings ? `- 추가: ${customSettings}` : ""}

【작업 요구사항】
다음 3가지 프롬프트를 각각 **매우 상세하고 구체적으로** 영어 한 단락으로 작성하세요 (각 150단어 내외의 긴 서술형 문장):
- **프롬프트 구조화 필수**: [핵심 피사체/장면 요약] -> [피사체의 외모, 표정, 미세한 동작] -> [배경, 환경, 날씨, 질감의 정밀 묘사] -> [조명, 색채, 분위기] -> [카메라 앵글 및 모션] -> [고화질 기술 키워드] 순으로 논리적이고 풍부하게 작성.
- 단순 단어 나열(쉼표 나열)을 지양하고, 완벽한 문장(Sentence)과 쉼표를 결합하여 문학적이고 시각적인 묘사로 채우세요.

1. **썸네일 프롬프트 (Thumbnail Prompt)**: 
   - MV 썸네일 이미지이자 대표 영상 소스용
   - **전체 가사의 핵심 감정과 분위기를 대표하는 장면** (전체 가사 내용을 구체적으로 반영)
   - **MV 프롬프트 상세 설정 반영**: 시대(${era || "현대"}), 국가(${country || "한국"}), 장소(${location || "도시"}), 조명(${lighting || "자연광"}), 카메라(${cameraWork || "중간 샷"}), 분위기(${mood || "감성적"})를 융합
   - 인물, 배경, 조명, 구도 및 미세한 모션을 모두 포함
   - **인물 상세 정보 포함** (성별, 나이, 인종, 외모/스타일) - 설정의 인물 정보를 반영
   - **이미지/비디오 통합 고화질 키워드 필수 포함**: "ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio, professional photography, cinematic motion, dynamic camera movement, sharp focus, detailed lighting"

2. **배경 프롬프트 (Background Prompt)**:
   - 배경 요소 중심 (인물은 없거나 원경 처럼 작게)
   - **전체 가사와 분위기를 반영한 장소 묘사 및 날씨/환경의 변화(바람, 빛 반사, 입자 흩날림 등 정밀 묘사)**
   - **MV 프롬프트 상세 설정 반영**: 시대, 국가, 장소, 조명, 분위기 융합
   - 조명, 색감, 질감 상세 묘사 및 느리고 부드러운 카메라 전환 모션(slow panoramic panning, tracking shot) 포함
   - **이미지/비디오 통합 고화질 키워드 필수 포함**: "background-focused composition, ultra high quality, 8k resolution, photorealistic, detailed background, atmospheric lighting, slow panoramic panning, cinematic motion"

3. **인물 프롬프트 (Character Prompt)**:
   - 인물 중심 구성 및 세밀한 동작 묘사
   - **전체 가사의 감정을 인물 표정과 제스처에 세밀하게 반영**
   - **MV 프롬프트 상세 설정 반영**: 시대, 국가, 조명, 카메라, 분위기 융합
   - **인물 상세 정보 포함** (성별, 나이, 인종, 외모/스타일)
   - 인물의 눈빛 변화, 미세한 입술 움직임, 자연스러운 포즈, 바람에 날리는 머릿결, 눈물이나 땀방울 등 구체적 동작(motion)과 피부 질감 명시
   - **이미지/비디오 통합 고화질 키워드 필수 포함**: "character-focused composition, ultra high quality, 8k resolution, photorealistic, natural pose, detailed facial features, subtle emotive motion, close-up tracking, sharp focus, beautiful lighting"

**출력 형식 (순수 JSON만):**
\`\`\`json
{
  "thumbnailEn": "완성된 썸네일 영어 프롬프트 (150단어 내외, 전체 가사 내용 반영, MV 설정 융합, 고화질 실사진 키워드 포함)",
  "thumbnailKo": "완성된 썸네일 한글 프롬프트 (150단어 내외, 전체 가사 내용 반영, MV 설정 융합, 고화질 실사진 키워드 포함)",
  "backgroundEn": "완성된 배경 영어 프롬프트 (150단어 내외, 전체 가사 내용 반영, MV 설정 융합, 고화질 실사진 키워드 포함)",
  "backgroundKo": "완성된 배경 한글 프롬프트 (150단어 내외, 전체 가사 내용 반영, MV 설정 융합, 고화질 실사진 키워드 포함)",
  "characterEn": "완성된 인물 영어 프롬프트 (150단어 내외, 전체 가사 내용 반영, MV 설정 융합, 고화질 실사진 키워드 포함)",
  "characterKo": "완성된 인물 한글 프롬프트 (150단어 내외, 전체 가사 내용 반영, MV 설정 융합, 고화질 실사진 키워드 포함)"
}
\`\`\`

**매우 중요:**
- **전체 가사 내용을 가장 우선적으로 깊이 있게 분석하여 반영하세요**
- **MV 프롬프트 상세 설정을 반드시 반영하세요** - 시대, 국가, 장소, 조명, 카메라, 분위기, 인물 정보를 자연스럽게 융합
- 각 프롬프트는 150단어 내외의 세밀하고 방대한 묘사 (사진 묘사뿐만 아니라 피사체의 미세한 동작, 조명 변화, 카메라 움직임, 렌즈 플레어 등의 비디오 생성 요소 포함)
- 인물의 감정과 장면의 분위기를 시각적 모션과 함께 문학적으로 표현
- **인물 상세 정보(성별, 나이, 인종, 외모/스타일)는 가능한 일관되게 반영**
- **이미지/비디오 통합 고화질 키워드는 필수로 포함**하세요
- 영어 프롬프트는 단일 단락으로 구성하며, 완벽한 문장과 콤마(,) 구분자를 조화롭게 활용해 최적화 요소를 나열
- 한글 프롬프트는 영어 프롬프트의 의미를 충실히 번역
- JSON 형식만 출력`;

        // callGeminiWithAutoRoute: 실제 키는 직접 호출, 프록시 인증은 /api/gemini 사용
        const aiResponse = await (window.callGeminiWithAutoRoute || callGeminiWithAutoRoute)(
          prompt,
          { temperature: 0.8, topK: 40, topP: 0.95, maxOutputTokens: 4096 },
          geminiKey,
        );

        {
          if (window.logApiUsage) window.logApiUsage("gemini");

          console.log("🤖 AI 응답 수신:", aiResponse.substring(0, 300) + "...");

          // JSON 추출
          const aiPrompts = safeJsonParse(aiResponse);
          if (aiPrompts) {

            // 영어 프롬프트
            thumbnailEn = aiPrompts.thumbnailEn || aiPrompts.thumbnail || "";
            backgroundEn = aiPrompts.backgroundEn || aiPrompts.background || "";
            characterEn = aiPrompts.characterEn || aiPrompts.character || "";

            // 한글 프롬프트
            thumbnailKo = aiPrompts.thumbnailKo || "";
            backgroundKo = aiPrompts.backgroundKo || "";
            characterKo = aiPrompts.characterKo || "";

            console.log("✅ AI 프롬프트 생성 완료");

            // 한글 프롬프트가 없으면 영어에서 번역
            if (!thumbnailKo && thumbnailEn) {
              thumbnailKo =
                (await translateEnglishToKoreanForScene(
                  "thumbnail",
                  thumbnailEn,
                )) || "";
            }
            if (!backgroundKo && backgroundEn) {
              backgroundKo =
                (await translateEnglishToKoreanForScene(
                  "background",
                  backgroundEn,
                )) || "";
            }
            if (!characterKo && characterEn) {
              characterKo =
                (await translateEnglishToKoreanForScene(
                  "character",
                  characterEn,
                )) || "";
            }
          }
        }
      } catch (aiError) {
        console.warn("⚠️ AI 프롬프트 생성 실패, 기본 방식으로 전환:", aiError);
      }
    }

    // AI 생성 실패 시 기본 방식으로 생성
    if (!thumbnailEn || !backgroundEn || !characterEn) {
      console.log("📝 기본 방식으로 프롬프트 생성...");

      // 설정 정보를 기반으로 프롬프트 구성
      const settingParts = [];

      if (era) {
        const eraMap = {
          modern: "modern (2020s)",
          "2010s": "2010s",
          "2000s": "2000s",
          "1990s": "1990s",
          vintage: "vintage (retro style)",
          future: "futuristic",
          timeless: "timeless",
        };
        settingParts.push(eraMap[era] || era);
      }

      if (country) {
        const countryMap = {
          korea: "Korea",
          japan: "Japan",
          usa: "USA",
          uk: "UK",
        };
        settingParts.push(countryMap[country] || country);
      }

      const locationVals =
        typeof window.getMVLocationValues === "function"
          ? window.getMVLocationValues()
          : [];
      if (locationVals.length > 0) {
        locationVals.forEach((loc) => {
          const en =
            typeof MV_LOCATION_MAP !== "undefined" && MV_LOCATION_MAP[loc]
              ? MV_LOCATION_MAP[loc].en
              : loc;
          settingParts.push(en);
        });
      }

      if (lighting) {
        const lightingMap = {
          natural: "natural lighting",
          soft: "soft lighting",
          dramatic: "dramatic lighting",
          warm: "warm lighting",
          cool: "cool lighting",
          neon: "neon lighting",
          cinematic: "cinematic lighting",
        };
        settingParts.push(lightingMap[lighting] || lighting);
      }

      if (cameraWork) {
        const cameraMap = {
          "close-up": "close-up shot",
          "wide-shot": "wide shot",
          "medium-shot": "medium shot",
        };
        settingParts.push(cameraMap[cameraWork] || cameraWork);
      }

      if (mood) {
        const moodMap = {
          romantic: "romantic mood",
          melancholic: "melancholic mood",
          energetic: "energetic mood",
          peaceful: "peaceful mood",
        };
        settingParts.push(moodMap[mood] || mood);
      }

      // 썸네일 프롬프트
      if (!thumbnailEn) {
        thumbnailEn = [characterInfo, ...settingParts, customSettings]
          .filter((s) => s && s.trim())
          .join(", ");
        thumbnailEn +=
          ", ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio, representative thumbnail image";
      }

      // 배경 프롬프트
      if (!backgroundEn) {
        backgroundEn = [...settingParts, customSettings]
          .filter((s) => s && s.trim())
          .join(", ");
        backgroundEn +=
          ", background-focused composition, ultra high quality, 8k resolution, photorealistic, detailed background";
      }

      // 인물 프롬프트
      if (!characterEn) {
        characterEn = [characterInfo, ...settingParts, customSettings]
          .filter((s) => s && s.trim())
          .join(", ");
        characterEn +=
          ", character-focused composition, ultra high quality, 8k resolution, photorealistic, natural pose, detailed hands, detailed facial features";
      }
    }

    // 한글 프롬프트가 없으면 영어에서 번역
    if (!thumbnailKo && thumbnailEn) {
      thumbnailKo =
        (await translateEnglishToKoreanForScene("thumbnail", thumbnailEn)) ||
        "";
    }
    if (!backgroundKo && backgroundEn) {
      backgroundKo =
        (await translateEnglishToKoreanForScene("background", backgroundEn)) ||
        "";
    }
    if (!characterKo && characterEn) {
      characterKo =
        (await translateEnglishToKoreanForScene("character", characterEn)) ||
        "";
    }

    // ========== UI에 표시 ==========
    console.log("🎨 썸네일/배경/인물 프롬프트 UI 업데이트 시작...");

    const thumbnailEnEl = document.getElementById("mvThumbnailPromptEn");
    const thumbnailKoEl = document.getElementById("mvThumbnailPromptKo");
    const backgroundDetailEnEl = document.getElementById(
      "mvBackgroundDetailPromptEn",
    );
    const backgroundDetailKoEl = document.getElementById(
      "mvBackgroundDetailPromptKo",
    );
    const characterDetailEnEl = document.getElementById(
      "mvCharacterDetailPromptEn",
    );
    const characterDetailKoEl = document.getElementById(
      "mvCharacterDetailPromptKo",
    );

    // 썸네일 프롬프트 UI 업데이트
    if (thumbnailEnEl) {
      const valEn = typeof thumbnailEn === 'string' ? thumbnailEn : JSON.stringify(thumbnailEn || "");
      thumbnailEnEl.value = valEn || "설정된 내용이 없습니다.";
      console.log("✅ 썸네일 영어 프롬프트 UI 업데이트:", valEn.substring(0, 50) + "...");
    }
    if (thumbnailKoEl) {
      const valKo = typeof thumbnailKo === 'string' ? thumbnailKo : JSON.stringify(thumbnailKo || "");
      thumbnailKoEl.value = valKo || "설정된 내용이 없습니다.";
    }

    // 배경 프롬프트 UI 업데이트
    if (backgroundDetailEnEl) {
      const valEn = typeof backgroundEn === 'string' ? backgroundEn : JSON.stringify(backgroundEn || "");
      backgroundDetailEnEl.value = valEn || "설정된 내용이 없습니다.";
      console.log("✅ 배경 영어 프롬프트 UI 업데이트:", valEn.substring(0, 50) + "...");
    }
    if (backgroundDetailKoEl) {
      const valKo = typeof backgroundKo === 'string' ? backgroundKo : JSON.stringify(backgroundKo || "");
      backgroundDetailKoEl.value = valKo || "설정된 내용이 없습니다.";
    }

    // 인물 프롬프트 UI 업데이트
    if (characterDetailEnEl) {
      const valEn = typeof characterEn === 'string' ? characterEn : JSON.stringify(characterEn || "");
      characterDetailEnEl.value = valEn || "설정된 내용이 없습니다.";
      console.log("✅ 인물 영어 프롬프트 UI 업데이트:", valEn.substring(0, 50) + "...");
    }
    if (characterDetailKoEl) {
      const valKo = typeof characterKo === 'string' ? characterKo : JSON.stringify(characterKo || "");
      characterDetailKoEl.value = valKo || "설정된 내용이 없습니다.";
    }

    console.log("✅ 썸네일/배경/인물 프롬프트 생성 및 UI 업데이트 완료!");

    // 반환값 추가
    return {
      thumbnailEn,
      thumbnailKo,
      backgroundEn,
      backgroundKo,
      characterEn,
      characterKo,
    };
  } catch (error) {
    console.error("썸네일 프롬프트 생성 오류:", error);
    return {
      thumbnailEn: "",
      thumbnailKo: "",
      backgroundEn: "",
      backgroundKo: "",
      characterEn: "",
      characterKo: "",
    };
  }
};

const MV_LOCATION_MAP = {
  city: { en: "urban cityscape", ko: "도시 (도심, 거리)" },
  "urban-night": {
    en: "urban nightscape with neon lights",
    ko: "도시 야경 (네온)",
  },
  beach: { en: "beach", ko: "해변" },
  mountain: { en: "mountain, nature", ko: "산, 자연" },
  forest: { en: "forest", ko: "숲" },
  desert: { en: "desert", ko: "사막" },
  indoor: { en: "indoor (room, studio)", ko: "실내 (방, 스튜디오)" },
  rooftop: { en: "rooftop", ko: "옥상" },
  subway: { en: "subway, underground", ko: "지하철, 지하" },
  cafe: { en: "cafe", ko: "카페" },
  restaurant: { en: "restaurant", ko: "레스토랑" },
  park: { en: "park", ko: "공원" },
  bridge: { en: "bridge", ko: "다리" },
  warehouse: { en: "warehouse, factory", ko: "창고, 공장" },
  abandoned: { en: "abandoned place", ko: "버려진 장소" },
  abstract: { en: "abstract background", ko: "추상적 배경" },
  river: { en: "river, riverside", ko: "강, 강변" },
  lake: { en: "lake", ko: "호수" },
  sea: { en: "sea, ocean", ko: "바다, 해상" },
  sky: { en: "sky, clouds", ko: "하늘, 구름" },
  street: { en: "street, alley", ko: "거리, 골목" },
  alley: { en: "narrow alley", ko: "골목길" },
  building: { en: "building", ko: "빌딩, 건물" },
  "rooftop-night": { en: "rooftop at night", ko: "옥상 야경" },
  station: { en: "station, terminal", ko: "역, 터미널" },
  airport: { en: "airport", ko: "공항" },
  car: { en: "inside car, vehicle", ko: "차 안, 이동 수단" },
  train: { en: "inside train", ko: "기차 안" },
  bar: { en: "bar, pub", ko: "바, 펍" },
  club: { en: "club, nightclub", ko: "클럽, 나이트" },
  concert: { en: "concert venue, live stage", ko: "공연장, 라이브" },
  school: { en: "school, classroom", ko: "학교, 교실" },
  library: { en: "library", ko: "도서관" },
  museum: { en: "museum, art gallery", ko: "미술관, 박물관" },
  church: { en: "church, cathedral", ko: "교회, 성당" },
  temple: { en: "temple, shrine", ko: "사찰, 절" },
  hospital: { en: "hospital", ko: "병원" },
  hotel: { en: "hotel lobby", ko: "호텔, 로비" },
  bedroom: { en: "bedroom, bed", ko: "침실, 침대" },
  kitchen: { en: "kitchen", ko: "주방" },
  bathroom: { en: "bathroom", ko: "욕실" },
  balcony: { en: "balcony, terrace", ko: "발코니, 테라스" },
  garden: { en: "garden, yard", ko: "정원, 뜰" },
  farm: { en: "farm, field", ko: "농장, 들판" },
  vineyard: { en: "vineyard", ko: "포도밭" },
  snow: { en: "snow, snowy landscape", ko: "눈, 설원" },
  rain: { en: "rain, rainy street", ko: "비, 빗속" },
  sunset: { en: "sunset, golden hour", ko: "일몰, 석양" },
  sunrise: { en: "sunrise", ko: "일출" },
  "night-sky": { en: "night sky, stars", ko: "밤하늘, 별" },
  underwater: { en: "underwater", ko: "수중, 물속" },
  stadium: { en: "stadium", ko: "경기장, 스타디움" },
  parking: { en: "parking lot", ko: "주차장" },
  "bridge-night": { en: "bridge at night", ko: "다리 야경" },
  "rooftop-pool": { en: "rooftop pool", ko: "루프탑 풀" },
  "rooftop-garden": { en: "rooftop garden", ko: "옥상 정원" },
};

// 장소 유형별 가사 키워드 (씬별로 가사에 맞는 장소 선택용)
const MV_LOCATION_KEYWORDS = {
  city: [
    "도시",
    "거리",
    "건물",
    "urban",
    "street",
    "city",
    "building",
    "골목",
    "번화가",
  ],
  "urban-night": [
    "밤",
    "야경",
    "네온",
    "불빛",
    "night",
    "neon",
    "light",
    "야밤",
    "밤거리",
  ],
  beach: [
    "바다",
    "해변",
    "파도",
    "모래",
    "beach",
    "sea",
    "ocean",
    "surf",
    "해수욕",
  ],
  mountain: ["산", "산길", "자연", "mountain", "hill", "peak", "등산", "숲길"],
  forest: ["숲", "나무", "숲속", "forest", "tree", "woods", "정글"],
  desert: ["사막", "desert", "sand", "황야"],
  indoor: ["실내", "방", "스튜디오", "indoor", "room", "studio", "실내"],
  rooftop: ["옥상", "rooftop", "루프탑", "지붕"],
  subway: ["지하철", "지하", "subway", "metro", "전철", "역"],
  cafe: ["카페", "커피", "cafe", "coffee", "다방"],
  restaurant: ["레스토랑", "식당", "restaurant", "맛집", "밥", "음식"],
  park: ["공원", "벤치", "잔디", "park", "bench", "벚꽃", "산책"],
  bridge: ["다리", "bridge", "강변", "횡단"],
  warehouse: ["창고", "공장", "warehouse", "factory", "창고"],
  abandoned: ["버려진", "폐허", "abandoned", "empty", "허름"],
  abstract: ["추상", "abstract", "몽환"],
  river: ["강", "강변", "river", "강가", "물"],
  lake: ["호수", "lake", "호반"],
  sea: ["바다", "해상", "sea", "ocean", "항구"],
  sky: ["하늘", "구름", "sky", "cloud", "날씨"],
  street: ["거리", "골목", "street", "alley", "도로"],
  alley: ["골목", "alley", "좁은", "골목길"],
  building: ["빌딩", "건물", "building", "타워", "오피스"],
  "rooftop-night": ["옥상", "야경", "밤", "rooftop", "night"],
  station: ["역", "터미널", "station", "terminal", "기차역", "버스"],
  airport: ["공항", "airport", "비행기", "출국"],
  car: ["차", "자동차", "car", "운전", "드라이브", "백시트"],
  train: ["기차", "열차", "train", "KTX", "전철"],
  bar: ["바", "펍", "bar", "pub", "술집", "클럽"],
  club: ["클럽", "나이트", "club", "디스코"],
  concert: ["공연", "라이브", "콘서트", "concert", "무대", "공연장"],
  school: ["학교", "교실", "school", "classroom", "선생", "수업"],
  library: ["도서관", "library", "책", "열람실"],
  museum: ["미술관", "박물관", "museum", "갤러리", "전시"],
  church: ["교회", "성당", "church", "cathedral", "기도"],
  temple: ["사찰", "절", "temple", "절", "스님"],
  hospital: ["병원", "hospital", "의원", "침대"],
  hotel: ["호텔", "로비", "hotel", "lobby", "체크인"],
  bedroom: ["침실", "침대", "bedroom", "bed", "잠", "방"],
  kitchen: ["주방", "키친", "kitchen", "요리", "밥"],
  bathroom: ["욕실", "화장실", "bathroom", "샤워"],
  balcony: ["발코니", "테라스", "balcony", "terrace"],
  garden: ["정원", "뜰", "garden", "yard", "꽃", "정원"],
  farm: ["농장", "들판", "farm", "field", "농촌", "시골"],
  vineyard: ["포도밭", "vineyard", "와인"],
  snow: ["눈", "설원", "snow", "겨울", "눈길"],
  rain: ["비", "빗속", "rain", "rainy", "우산", "젖은"],
  sunset: ["일몰", "석양", "sunset", "저녁노을", "황혼"],
  sunrise: ["일출", "sunrise", "새벽", "아침"],
  "night-sky": ["밤하늘", "별", "night", "star", "별빛", "星座"],
  underwater: ["수중", "물속", "underwater", "바다속", "다이빙"],
  stadium: ["경기장", "스타디움", "stadium", "경기", "관중"],
  parking: ["주차장", "parking", "차량"],
  "bridge-night": ["다리", "야경", "밤", "bridge", "night"],
  "rooftop-pool": ["옥상", "풀", "수영", "rooftop", "pool"],
  "rooftop-garden": ["옥상", "정원", "rooftop", "garden"],
};

const MV_EMOTION_VISUAL_PRESETS = {
  sad: {
    keywords: ["슬퍼", "눈물", "이별", "아파", "외로", "그리", "sad", "cry", "tears", "goodbye", "lonely"],
    emotion: "sad",
    mood: "desaturated cool solitude",
    lighting: "soft blue-hour side light with rain-muted contrast",
    cameraWork: "slow dolly-in with shallow depth of field",
    locationHints: ["rain", "street", "alley", "bedroom", "bridge-night"],
  },
  lonely: {
    keywords: ["혼자", "홀로", "공허", "빈", "외로", "alone", "empty", "lonely", "silent"],
    emotion: "lonely",
    mood: "quiet negative space and muted blue grey atmosphere",
    lighting: "single practical light surrounded by deep soft shadows",
    cameraWork: "locked wide shot slowly pushing toward the subject",
    locationHints: ["rooftop-night", "station", "bedroom", "street"],
  },
  hopeful: {
    keywords: ["희망", "다시", "빛", "내일", "괜찮", "일어나", "hope", "again", "light", "tomorrow"],
    emotion: "hopeful",
    mood: "warm sunrise optimism with clean airy texture",
    lighting: "golden sunrise backlight with gentle lens bloom",
    cameraWork: "gradual crane-up revealing a wider horizon",
    locationHints: ["sunrise", "sky", "rooftop", "bridge", "park"],
  },
  romantic: {
    keywords: ["사랑", "입맞춤", "품", "설레", "너와", "love", "kiss", "romance", "together"],
    emotion: "romantic",
    mood: "warm intimate glow with soft rose and amber tones",
    lighting: "diffused warm practical lights with creamy bokeh",
    cameraWork: "gentle handheld close-up with intimate framing",
    locationHints: ["cafe", "bedroom", "park", "sunset", "street"],
  },
  intense: {
    keywords: ["불타", "소리쳐", "미쳐", "폭발", "달려", "fire", "scream", "run", "burn", "intense"],
    emotion: "intense",
    mood: "high contrast urgency with electric saturated accents",
    lighting: "hard directional light with sharp shadows and neon edges",
    cameraWork: "fast tracking shot with controlled motion blur",
    locationHints: ["club", "concert", "urban-night", "warehouse", "parking"],
  },
  peaceful: {
    keywords: ["평온", "고요", "쉬어", "바람", "잔잔", "calm", "peace", "quiet", "breeze"],
    emotion: "peaceful",
    mood: "soft spacious calm with pastel natural color",
    lighting: "even natural light with delicate soft shadows",
    cameraWork: "slow panoramic pan with stable meditative rhythm",
    locationHints: ["forest", "lake", "park", "garden", "sea"],
  },
};

window.recommendMVSceneVisualTone = function (sceneText, selectedLocations) {
  const text = String(sceneText || "").toLowerCase();
  const locations = Array.isArray(selectedLocations) ? selectedLocations : [];
  let bestPreset = null;
  let bestScore = 0;

  Object.values(MV_EMOTION_VISUAL_PRESETS).forEach((preset) => {
    const score = preset.keywords.reduce(
      (sum, keyword) => sum + (text.includes(String(keyword).toLowerCase()) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestPreset = preset;
    }
  });

  const preset = bestPreset || {
    emotion: "cinematic",
    mood: "balanced cinematic atmosphere",
    lighting: "cinematic natural light with detailed texture",
    cameraWork: "slow cinematic dolly with stable composition",
    locationHints: [],
  };
  const selectedLocation =
    locations.find((loc) => preset.locationHints.includes(loc)) ||
    locations[0] ||
    null;

  return {
    emotion: preset.emotion,
    mood: preset.mood,
    lighting: preset.lighting,
    cameraWork: preset.cameraWork,
    locationHint: selectedLocation,
  };
};

/**
 * 해당 씬 가사에 가장 잘 맞는 장소 유형 1개를 선택된 장소 목록에서 골라 반환.
 * 키워드 매칭 점수가 높은 것 우선, 동점이면 씬 인덱스로 순환하여 다양하게 배분.
 */
window.pickBestLocationForScene = function (
  sceneLyrics,
  sceneIndex,
  totalScenes,
) {
  const selected =
    typeof window.getMVLocationValues === "function"
      ? window.getMVLocationValues()
      : [];
  if (!selected.length) return null;
  if (selected.length === 1) return selected[0];
  const text = (sceneLyrics || "").toLowerCase().replace(/\s+/g, " ");
  let bestScore = -1;
  let bestLoc = null;
  const scores = {};
  selected.forEach((loc) => {
    const keywords =
      typeof MV_LOCATION_KEYWORDS !== "undefined" && MV_LOCATION_KEYWORDS[loc]
        ? MV_LOCATION_KEYWORDS[loc]
        : [];
    let score = 0;
    keywords.forEach((kw) => {
      if (text.indexOf(kw.toLowerCase()) !== -1) score += 1;
    });
    scores[loc] = score;
    if (score > bestScore) {
      bestScore = score;
      bestLoc = loc;
    }
  });
  if (bestLoc && bestScore > 0) return bestLoc;
  return selected[sceneIndex % selected.length];
};

window.getMVLocationEnString = function () {
  const vals = window.getMVLocationValues();
  if (!vals.length) return "";
  return vals
    .map((v) => (MV_LOCATION_MAP[v] && MV_LOCATION_MAP[v].en) || v)
    .join(", ");
};

window.getMVLocationKoString = function () {
  const vals = window.getMVLocationValues();
  if (!vals.length) return "";
  return vals
    .map((v) => (MV_LOCATION_MAP[v] && MV_LOCATION_MAP[v].ko) || v)
    .join(", ");
};

