// js/step6.js - Extracted Logic

/**
 * AI의 응답 문자열에서 JSON 데이터를 안전하게 추출하여 파싱합니다.
 * @param {string} str AI 응답 문자열
 * @param {any} fallback 파싱 실패 시 반환할 기본값
 * @returns {any} 파싱된 객체 또는 기본값
 */
function safeJsonParse(str, fallback = null) {
  if (!str) return fallback;
  try {
    let cleanStr = str.trim();
    // 마크다운 코드 블록 제거 (```json ... ```)
    if (cleanStr.includes("```")) {
      const startIdx = cleanStr.indexOf("```");
      const firstLineEnd = cleanStr.indexOf("\n", startIdx);
      const endIdx = cleanStr.lastIndexOf("```");
      if (endIdx > startIdx) {
        cleanStr = cleanStr
          .substring(firstLineEnd !== -1 ? firstLineEnd : startIdx + 3, endIdx)
          .trim();
      }
    }

    // JSON 시작과 끝 지점 찾기
    const firstBrace = cleanStr.indexOf("{");
    const firstBracket = cleanStr.indexOf("[");
    let start = -1;
    if (firstBrace !== -1 && firstBracket !== -1)
      start = Math.min(firstBrace, firstBracket);
    else if (firstBrace !== -1) start = firstBrace;
    else if (firstBracket !== -1) start = firstBracket;

    if (start !== -1) {
      const lastBrace = cleanStr.lastIndexOf("}");
      const lastBracket = cleanStr.lastIndexOf("]");
      const end = Math.max(lastBrace, lastBracket);
      if (end !== -1 && end > start) {
        cleanStr = cleanStr.substring(start, end + 1);
      }
    }

    return JSON.parse(cleanStr);
  } catch (e) {
    console.warn("⚠️ JSON 파싱 실패, 대체 시도:", e);
    // 제어 문자 및 줄바꿈 문제 해결 시도
    try {
      const fixedStr = str
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        .match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (fixedStr) return JSON.parse(fixedStr[0]);
    } catch (e2) {}
    return fallback;
  }
}

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
    const stylePrompt =
      document.getElementById("finalizedStylePrompt")?.value ||
      document.getElementById("stylePrompt")?.value ||
      "";
    const cleanLyrics = extractLyricsOnly(finalLyrics);

    // Gemini API를 사용하여 가사 내용을 반영한 프롬프트 생성
    const geminiKey = window.getGeminiApiKey();
    let combinedEn = "";
    let combinedKo = "";
    let backgroundEn = "";
    let backgroundKo = "";
    let characterEn = "";
    let characterKo = "";

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

【MV 설정】 (보조 참고용 - 가사 내용을 우선하되 자연스럽게 융합)
- 시대: ${era || "현대"}
- 국가: ${country || "한국"}
- 장소: ${location || "도시"}
- 조명: ${lighting || "자연광"}
- 카메라: ${cameraWork || "중간 샷"}
- 분위기: ${mood || "감성적"}
- 인물: ${characters && characters.length > 0 ? characters.map((c) => `${c.gender || ""} ${c.appearance || ""}`).join(", ") : "1명"}
${customSettings ? `- 추가: ${customSettings}` : ""}

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

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 4096,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (window.logApiUsage) window.logApiUsage("gemini");
          const aiResponse =
            data.candidates?.[0]?.content?.parts?.[0]?.text || "";

          console.log(
            "🤖 MV 상세 프롬프트 AI 응답 수신:",
            aiResponse.substring(0, 300) + "...",
          );

          // JSON 추출
          let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiPrompts = safeJsonParse(jsonMatch[0]);

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
    const combinedKoEl = document.getElementById("mvCombinedPromptKo");
    const combinedEnEl = document.getElementById("mvCombinedPromptEn");
    const backgroundKoEl = document.getElementById("mvBackgroundPromptKo");
    const backgroundEnEl = document.getElementById("mvBackgroundPromptEn");
    const characterKoEl = document.getElementById("mvCharacterPromptKo");
    const characterEnEl = document.getElementById("mvCharacterPromptEn");

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
    if (mvLoading) mvLoading.style.display = on ? "flex" : "none";
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
      alert("MV 로딩 영역을 찾을 수 없습니다. 페이지를 새로고침해주세요.");
      return;
    }
    if (mvSceneOverviewSection) {
      mvSceneOverviewSection.style.display = "none";
    }
    if (mvResultsSection) {
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
      alert("가사를 먼저 입력하거나 생성해주세요.");
      return;
    }

    // 스타일 프롬프트 가져오기
    const stylePrompt =
      document.getElementById("finalizedStylePrompt")?.value ||
      document.getElementById("stylePrompt")?.value ||
      "";

    // 가사에서 지시어 제거
    const cleanLyrics = extractLyricsOnly(finalLyrics);
    const lyricsLines = cleanLyrics.split("\n").filter((line) => line.trim());

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

        // Gemini API를 통한 가사 분석 및 씬 생성
        const analysisPrompt = `다음 음악 가사를 분석하여 Midjourney MV 제작용 씬을 생성하세요.

【가사】 (가장 중요 - 반드시 각 씬의 프롬프트에 반영하세요!)
${cleanLyrics}

【스타일】
${stylePrompt || "감성적인 발라드"}

【MV 설정】 (보조 참고용 - 가사 내용을 우선하되 자연스럽게 융합)
- 시대: ${era || "현대"}
- 국가: ${country || "한국"}
- 장소 유형 (사용자가 선택한 후보): ${location || "도시"}
  **다중 선택된 경우**: 각 씬마다 해당 씬의 가사(lyrics)에 가장 잘 맞는 장소를 위 목록에서 **한 가지** 골라, 그 유형을 구체적으로 묘사하세요. 씬마다 다른 배경을 추천하고, 가사 내용과 맞는 장소를 우선하세요.
- 조명: ${lighting || "자연광"}
- 카메라: ${cameraWork || "중간 샷"}
- 분위기: ${mood || "감성적"}
- 인물: ${characterInfoStr || (characters.length > 0 ? `${characters.length}명` : "1명")}
${customSettings ? `- 추가: ${customSettings}` : ""}

【작업 요구사항】
총 ${imageCount}개의 씬을 생성하세요. 각 씬은 ${interval}초 간격입니다.

**각 씬마다 다음 10개 필드를 반드시 작성하세요:**

1. **time**: "0:00-0:08" 형식
2. **lyrics**: 해당 구간의 가사 (있는 경우) - **이 가사 내용을 location, characterAction, promptKo에 반드시 반영하세요**
3. **emotion**: 감정 한 단어 (예: sad, joyful, nostalgic) - **가사에서 느껴지는 감정**
4. **location**: **가사 내용을 바탕으로** 장소를 **구체적으로** 20단어 이상 영어로 작성
   - 가사에서 언급되거나 암시되는 장소를 우선하세요
   - **사용자가 선택한 장소 유형이 여러 개일 때**: 각 씬의 가사(lyrics)에 가장 잘 맞는 유형 **하나**를 골라, 그 유형으로 구체적으로 묘사하세요. 모든 씬에 같은 장소를 쓰지 말고, 씬마다 가사에 맞는 배경을 선택하세요.
   - 예: "rain-soaked urban crosswalk at night with neon signs reflecting on wet pavement"
5. **characterAction**: **가사 내용을 바탕으로** 인물 동작을 **구체적으로** 15단어 이상 영어로 작성
   - 가사에서 묘사되는 인물의 행동이나 감정을 시각적으로 표현하세요
   - **인물 상세 정보 반드시 포함** (성별, 나이, 인종, 외모/스타일) - MV 설정의 인물 정보(${characterInfoStr || "없음"})를 반영하여 모든 씬에서 일관되게 묘사
   - 나이와 인종 정보를 반드시 포함하세요 (예: "30-year-old", "Asian", "Caucasian" 등)
   - 예: "a 30-year-old Asian male standing alone under streetlight with hands in pockets looking down"
6. **mood**: 분위기 영어로 (예: "melancholic and lonely") - **가사에서 느껴지는 분위기**
7. **lighting**: 조명 영어로 (예: "dramatic streetlight with soft shadows") - **가사 분위기에 맞는 조명**
8. **cameraWork**: 카메라 영어로 (예: "medium shot slowly zooming in") - **가사 감정을 강조하는 카메라 워크**
9. **promptKo**: **가사 내용과 장면 설명을 중심으로** 위의 모든 정보를 종합한 **완성된 Midjourney 고화질 실사진 프롬프트** (60단어 이상, **한글로 작성**)
   - **가사에서 묘사되는 장면, 감정, 상황을 구체적으로 포함하세요**
   - **장면 설명(scene description)의 내용을 반드시 반영하세요** - 각 씬의 장면 설명이 프롬프트에 구체적으로 포함되어야 함
   - **인물 상세 정보 반드시 포함** (성별, 나이, 인종, 외모/스타일) - MV 설정의 인물 정보(${characterInfoStr || "없음"})를 반영하여 모든 씬에서 일관되게 묘사
   - 나이와 인종 정보를 반드시 포함하세요 (예: "30대", "아시아인", "백인" 등)
   - **MV 프롬프트 상세 설정 반영**: 시대(${era || "현대"}), 국가(${country || "한국"}), 장소(${location || "도시"}), 조명(${lighting || "자연광"}), 카메라(${cameraWork || "중간 샷"}), 분위기(${mood || "감성적"})를 자연스럽게 융합
   - **미드저니 고화질 실사진 키워드 필수 포함**: "초고화질, 8k 해상도, 사진처럼 사실적, 시네마틱 조명, 자연스러운 포즈, 상세한 손과 얼굴 특징, 전문 사진, 선명한 초점, 깊이감, 색감 보정, 영화적 구도"
   - 예: "어두운 전당포 내부, 형광등 아래 먼지 쌓인 보석들이 줄지어 진열되어 있고, 30대 아시아인 남성(단정한 헤어스타일)이 유리 케이스 안의 반지를 슬프게 바라보며 과거의 약속을 기억하고 있다, 그의 얼굴에는 후회와 그리움이 새겨져 있다, 쓴 감정, 우울하고 후회스러운 분위기, 깊은 그림자와 함께 거친 형광등, 반지에 클로즈업한 후 남성의 얼굴로 팬업, 미국, 현대 시대, 강렬한 감정적 분위기, 시네마틱 조명, 와이드샷 구도, 초고화질, 8k 해상도, 사진처럼 사실적, 시네마틱 조명, 자연스러운 포즈, 상세한 손과 얼굴 특징, 전문 사진, 선명한 초점, 깊이감, 색감 보정"
10. **promptEn**: promptKo를 영어로 번역한 **완성된 Midjourney 고화질 실사진 프롬프트** (60단어 이상, 영어만)
   - **인물 상세 정보 반드시 포함** (성별, 나이, 인종, 외모/스타일) - MV 설정의 인물 정보(${characterInfoStr || "없음"})를 반영하여 모든 씬에서 인물이 일관되게 묘사되어야 함
   - 나이와 인종 정보를 반드시 포함하세요 (예: "30-year-old", "Asian", "Caucasian" 등)
   - **장면 설명(scene description)의 내용을 반드시 반영하세요**
   - **MV 프롬프트 상세 설정 반영**: era, country, location, lighting, camera work, mood를 자연스럽게 융합
   - **미드저니 고화질 실사진 키워드 필수 포함**: "ultra high quality, 8k resolution, photorealistic, cinematic lighting, natural pose, detailed hands, detailed facial features, professional photography, sharp focus, depth of field, color grading, cinematic composition"
   - 예: "a dimly lit pawn shop interior showcasing rows of dusty jewelry under harsh fluorescent lights, a 30-year-old Asian male with neat hairstyle sadly looks at a ring in a glass case, remembering a past promise, his face etched with regret and longing, bitter emotion, somber and regretful mood, harsh fluorescent lighting with deep shadows, close-up on the ring, then pans up to the man's face, USA, modern era, intense emotional atmosphere, cinematic lighting, wide-shot composition, ultra high quality, 8k resolution, photorealistic, cinematic lighting, natural pose, detailed hands and facial features, professional photography, sharp focus, depth of field, color grading"
11. **runwayPrompt**: **완성된 RunwayML 비디오 생성 프롬프트** (영어, 단일 문장 위주 묘사, 쉼표로 구조화)
    - **형식**: [Subject Description], [Action/Movement], [Environment/Setting], [Lighting], [Camera Movement], [Style/Atmosphere]
    - 시간의 흐름, 동작의 변화, 카메라 앵글을 구체적으로 명시하세요.
    - 피사체의 미세한 감정 변화나 환경의 역동성을 강조하세요.
    - 예: "A 30-year-old Asian male with a neat hairstyle looking sadly at a ring inside a glass case, his fingers tracing the glass, standing inside a dimly lit pawn shop with rows of dusty jewelry, harsh fluorescent lights casting deep shadows, close-up shot slowly panning up to reveal his face etched with regret, cinematic lighting, photorealistic, 8k resolution, melancholic and intense emotional atmosphere"
12. **runwayPromptKo**: **runwayPrompt를 한글로 번역한 내용**

**매우 중요 (반드시 지켜주세요):**
- **가사 내용을 가장 우선적으로 반영하세요** - location, characterAction, promptKo 모두에 가사에서 묘사되는 내용을 포함하세요
- location, characterAction, promptKo, promptEn은 **비워두지 마세요**
- **promptKo와 runwayPromptKo는 한글로 작성**하고, **가사의 감정과 내용을 세밀하게 반영**하세요
- **promptEn은 promptKo를 영어로 번역**한 것이며, **runwayPrompt는 영어로 작성**합니다
- promptKo와 promptEn은 **가사 내용 + location + characterAction + emotion + mood + lighting + cameraWork**를 모두 포함한 완성된 프롬프트여야 합니다
- **인물 상세 정보(성별, 나이, 인종, 외모/스타일)는 모든 씬의 characterAction, promptKo, promptEn, runwayPrompt에서 일관되게 반영되어야 합니다** - MV 설정의 인물 정보(${characterInfoStr || "없음"})를 참고하여 동일한 인물로 묘사하세요
- **나이와 인종 정보는 반드시 포함되어야 합니다** - 예: "30-year-old Asian male", "20대 아시아인 남성" 등
- 각 씬마다 배경을 다르게 설정하세요
- **가사의 감정과 내용을 location과 characterAction에 반드시 반영하세요** - MV 설정보다 가사 내용이 우선입니다
- 순수 JSON 배열만 출력하세요

**출력 형식:**
\`\`\`json
[
  {
    "time": "0:00-0:08",
    "lyrics": "별빛 아래 서있는 너와 나",
    "emotion": "nostalgic",
    "location": "moonlit park bench under cherry blossom trees with petals falling",
    "characterAction": "two people sitting close together looking at stars with gentle smiles",
    "mood": "romantic and peaceful",
    "lighting": "soft moonlight with warm ambient glow",
    "cameraWork": "wide shot slowly pushing in",
    "promptKo": "달빛이 비치는 벚꽃 나무 아래 벤치, 떨어지는 꽃잎들, 별을 바라보며 가까이 앉아 있는 두 사람, 부드러운 미소를 띤 향수적인 감정, 로맨틱하고 평화로운 분위기, 따뜻한 주변광과 함께 부드러운 달빛, 천천히 밀어 들어가는 와이드샷, 한국, 현대 시대, 로맨틱한 분위기, 시네마틱 조명, 와이드샷, 초고화질, 8k 해상도, 사진처럼 사실적, 시네마틱 조명, 자연스러운 포즈, 상세한 손과 얼굴 특징",
    "promptEn": "moonlit park bench under cherry blossom trees with petals falling, two people sitting close together looking at stars with gentle smiles, nostalgic emotion, romantic and peaceful, soft moonlight with warm ambient glow, wide shot slowly pushing in, Korea, modern era, romantic mood, cinematic lighting, wide-shot, ultra high quality, 8k resolution, photorealistic, cinematic lighting, natural pose, detailed hands and facial features",
    "runwayPrompt": "Two people sitting close together on a park bench under cherry blossom trees with petals gently falling around them, looking up at the stars with gentle and nostalgic smiles, soft moonlight casting a warm ambient glow over the scene, wide shot slowly pushing in to capture their peaceful and romantic mood, 8k resolution, photorealistic, highly detailed, cinematic lighting",
    "runwayPromptKo": "벚꽃이 부드럽게 떨어지는 나무 아래 벤치에 소중하게 앉아 별을 바라보며 부드럽고 아련한 미소를 짓고 있는 두 사람, 따뜻한 주변광을 드리우는 부드러운 달빛, 그들의 평화롭고 로맨틱한 감정을 포착하며 천천히 다가가는 와이드 샷, 8k 해상도, 사실적인 묘사, 매우 상세하고 영화적인 조명"
  },
  ...
]
\`\`\`

**중요:** 
- promptKo 및 runwayPromptKo 필드는 한글로 작성하고, 가사 내용과 MV 설정을 세밀하게 융합하여 작성하세요
- promptEn 필드는 promptKo를 영어로 번역한 것이며, runwayPrompt는 영어로 작성합니다

**지금 바로 JSON 배열을 생성하세요:**`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: analysisPrompt }] }],
            generationConfig: {
              temperature: 0.8,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (window.logApiUsage) window.logApiUsage("gemini");
          const aiResponse =
            data.candidates?.[0]?.content?.parts?.[0]?.text || "";

          console.log("🤖 AI 응답 수신:", aiResponse.substring(0, 300) + "...");

          // JSON 추출 - 코드 블록 제거 후 배열 찾기
          let cleanedResponse = aiResponse.trim();

          // 코드 블록 제거 (여러 패턴 시도)
          cleanedResponse = cleanedResponse.replace(/```json\s*/gi, "");
          cleanedResponse = cleanedResponse.replace(/```\s*/g, "");
          cleanedResponse = cleanedResponse.replace(/^json\s*/gi, "");
          cleanedResponse = cleanedResponse.trim();

          // 앞뒤 불필요한 텍스트 제거: 첫 번째 [ 위치부터 시작
          // JSON 파싱 (safeJsonParse 사용)

          cleanedResponse = cleanedResponse.trim();

          // JSON 배열 찾기
          let aiScenes = safeJsonParse(cleanedResponse);

          if (!aiScenes || !Array.isArray(aiScenes)) {
            // 중괄호로 감싸진 배열("scenes": [...]) 찾기 시도
            const wrappedMatch = cleanedResponse.match(
              /\{[\s\S]*"scenes"[\s\S]*:[\s\S]*\[[\s\S]*\]/,
            );
            if (wrappedMatch) {
              const wrappedJson = safeJsonParse(wrappedMatch[0]);
              if (
                wrappedJson &&
                wrappedJson.scenes &&
                Array.isArray(wrappedJson.scenes)
              ) {
                aiScenes = wrappedJson.scenes;
              }
            }
          }

          if (!aiScenes && cleanedResponse.includes("[")) {
            // 최후의 수단: 직접 배열 부분만 추출 시도
            const startIdx = cleanedResponse.indexOf("[");
            const endIdx = cleanedResponse.lastIndexOf("]");
            if (startIdx !== -1 && endIdx > startIdx) {
              aiScenes = safeJsonParse(
                cleanedResponse.substring(startIdx, endIdx + 1),
              );
            }
          }

          if (!aiScenes || (Array.isArray(aiScenes) && aiScenes.length === 0)) {
            console.error("❌ JSON 배열을 찾을 수 없습니다.");
            console.error(
              "cleanedResponse:",
              cleanedResponse.substring(0, 500),
            );
            console.error("AI 응답 전체:", aiResponse);
            throw new Error("JSON 배열을 찾을 수 없습니다");
          }

          if (!Array.isArray(aiScenes)) {
            aiScenes = [aiScenes];
          }

          if (Array.isArray(aiScenes) && aiScenes.length > 0) {
            // ========== AI 응답에서 프롬프트 생성 ==========
            // 각 씬에 대해 한글 프롬프트 생성 및 영어 번역을 순차적으로 처리
            scenes = [];

            console.log(`🔄 ${aiScenes.length}개 씬 처리 시작...`);

            for (let index = 0; index < aiScenes.length; index++) {
              try {
                const aiScene = aiScenes[index];
                const startTime = index * interval;
                const endTime = Math.min(startTime + interval, totalSeconds);
                const startMin = Math.floor(startTime / 60);
                const startSec = Math.floor(startTime % 60);
                const endMin = Math.floor(endTime / 60);
                const endSec = Math.floor(endTime % 60);
                const timeStr = `${startMin}:${String(startSec).padStart(2, "0")}-${endMin}:${String(endSec).padStart(2, "0")}`;

                // AI가 promptKo와 promptEn을 생성한 경우 (새 방식)
                let promptKo = aiScene.promptKo || "";
                let prompt = aiScene.promptEn || "";

                // promptKo와 promptEn이 모두 있으면 그대로 사용
                if (
                  promptKo &&
                  promptKo.length >= 50 &&
                  prompt &&
                  prompt.length >= 50
                ) {
                  if (index === 0) {
                    console.log(
                      `✅ 씬 ${index + 1} AI가 promptKo와 promptEn을 모두 생성함`,
                    );
                  }
                  // 그대로 사용
                } else if (promptKo && promptKo.length >= 50) {
                  // promptKo만 있으면 영어로 번역
                  try {
                    if (index === 0)
                      console.log(
                        `🔄 씬 ${index + 1} 한글 프롬프트 번역 중...`,
                      );
                    const translated = await translateKoreanToEnglishForScene(
                      "prompt",
                      promptKo,
                    );
                    if (translated && translated.length >= 50) {
                      prompt = translated.replace(/[가-힣]+/g, "").trim();
                      if (index === 0)
                        console.log(`✅ 씬 ${index + 1} 번역 완료`);
                    } else {
                      console.warn(`⚠️ 씬 ${index + 1} 번역 결과가 너무 짧음`);
                    }
                  } catch (transError) {
                    console.warn(
                      `⚠️ 씬 ${index + 1} 번역 실패, promptEn 사용:`,
                      transError,
                    );
                    // 번역 실패 시 promptEn 사용
                    if (aiScene.promptEn && aiScene.promptEn.length >= 50) {
                      prompt = aiScene.promptEn;
                    }
                  }
                } else if (prompt && prompt.length >= 50) {
                  // promptEn만 있으면 한글로 번역
                  try {
                    if (index === 0)
                      console.log(
                        `🔄 씬 ${index + 1} 영어 프롬프트 한글 번역 중...`,
                      );
                    const translated = await translateEnglishToKoreanForScene(
                      "prompt",
                      prompt,
                    );
                    if (translated && translated.length >= 50) {
                      promptKo = translated;
                      if (index === 0)
                        console.log(`✅ 씬 ${index + 1} 한글 번역 완료`);
                    }
                  } catch (transError) {
                    console.warn(
                      `⚠️ 씬 ${index + 1} 한글 번역 실패:`,
                      transError,
                    );
                  }
                } else if (index === 0) {
                  console.log(
                    `⚠️ 씬 ${index + 1} promptKo와 promptEn 모두 없음 (promptKo 길이: ${promptKo.length}, promptEn 길이: ${prompt ? prompt.length : 0})`,
                  );
                }

                // promptEn이 없거나 promptKo도 없으면 개별 필드로 조합 (기존 방식)
                if (!prompt || prompt.length < 50) {
                  // 첫 번째 씬에서만 경고 출력 (콘솔 스팸 방지)
                  if (index === 0) {
                    console.log(
                      `⚠️ AI가 promptEn을 생성하지 않아 개별 필드로 조합합니다. (${aiScenes.length}개 씬 모두 동일 처리)`,
                    );
                  }

                  let promptParts = []; // const가 아닌 let 사용!

                  // 유효한 값만 추가
                  const addIfValid = (value) => {
                    if (value && typeof value === "string") {
                      const t = value.trim();
                      if (t && t.length >= 2 && !/^[,.\s]+$/.test(t)) {
                        promptParts.push(t);
                        return true;
                      }
                    }
                    return false;
                  };

                  // AI 데이터에서 추출 (가사 맥락 우선 - 가사 내용이 반영된 location과 characterAction을 먼저)
                  // location과 characterAction은 가사 내용을 바탕으로 생성되었으므로 우선 추가
                  if (aiScene.location && aiScene.location.trim()) {
                    addIfValid(aiScene.location.trim());
                  }
                  if (
                    aiScene.characterAction &&
                    aiScene.characterAction.trim()
                  ) {
                    addIfValid(aiScene.characterAction.trim());
                  }
                  // 가사에서 느껴지는 감정과 분위기
                  if (aiScene.emotion) addIfValid(aiScene.emotion + " emotion");
                  if (aiScene.mood) addIfValid(aiScene.mood);
                  if (aiScene.lighting) addIfValid(aiScene.lighting);
                  if (aiScene.cameraWork) addIfValid(aiScene.cameraWork);

                  // 가사 내용도 포함 (가능한 경우)
                  if (
                    aiScene.lyrics &&
                    aiScene.lyrics.trim() &&
                    aiScene.lyrics.length > 5
                  ) {
                    // 가사 내용을 간단히 영어로 변환하여 포함
                    const lyricsEn = aiScene.lyrics
                      .replace(/[가-힣]/g, "")
                      .trim();
                    if (lyricsEn && lyricsEn.length > 5) {
                      // 가사 내용을 묘사로 변환
                      addIfValid(
                        `scene depicting: ${lyricsEn.substring(0, 50)}`,
                      );
                    }
                  }

                  // 인물 정보
                  if (characters.length > 0) {
                    promptParts.push(
                      characters.length === 1
                        ? "one person"
                        : characters.length === 2
                          ? "two people"
                          : "multiple people",
                    );
                    characters.forEach((char) => {
                      addIfValid(char.gender);
                      addIfValid(char.appearance);
                    });
                  }

                  // 사용자 설정 (한글을 영어로 변환)
                  const countryMap = {
                    한국: "Korea",
                    korea: "Korea",
                    Korea: "Korea",
                    일본: "Japan",
                    japan: "Japan",
                    Japan: "Japan",
                    미국: "USA",
                    usa: "USA",
                    USA: "USA",
                    영국: "UK",
                    uk: "UK",
                    UK: "UK",
                  };
                  const eraMap = {
                    현대: "modern",
                    modern: "modern",
                    Modern: "modern",
                    과거: "historical",
                    historical: "historical",
                    Historical: "historical",
                    미래: "futuristic",
                    futuristic: "futuristic",
                    Futuristic: "futuristic",
                    복고: "retro",
                    retro: "retro",
                    Retro: "retro",
                  };
                  const moodMap = {
                    로맨틱: "romantic mood",
                    romantic: "romantic mood",
                    우울한: "melancholic mood",
                    melancholic: "melancholic mood",
                    에너지틱: "energetic mood",
                    energetic: "energetic mood",
                    평화로운: "peaceful mood",
                    peaceful: "peaceful mood",
                    신비로운: "mysterious mood",
                    mysterious: "mysterious mood",
                    향수적인: "nostalgic mood",
                    nostalgic: "nostalgic mood",
                    드라마틱: "dramatic mood",
                    dramatic: "dramatic mood",
                    몽환적인: "dreamy mood",
                    dreamy: "dreamy mood",
                    강렬한: "intense mood",
                    intense: "intense mood",
                    부드러운: "gentle mood",
                    gentle: "gentle mood",
                    감성적: "emotional mood",
                    emotional: "emotional mood",
                  };
                  const lightingMap = {
                    자연광: "natural lighting",
                    natural: "natural lighting",
                    부드러운: "soft lighting",
                    soft: "soft lighting",
                    드라마틱: "dramatic lighting",
                    dramatic: "dramatic lighting",
                    따뜻한: "warm lighting",
                    warm: "warm lighting",
                    차가운: "cool lighting",
                    cool: "cool lighting",
                    네온: "neon lighting",
                    neon: "neon lighting",
                    골든아워: "golden hour lighting",
                    "golden-hour": "golden hour lighting",
                    블루아워: "blue hour lighting",
                    "blue-hour": "blue hour lighting",
                    스튜디오: "studio lighting",
                    studio: "studio lighting",
                    시네마틱: "cinematic lighting",
                    cinematic: "cinematic lighting",
                  };
                  const cameraMap = {
                    클로즈업: "close-up shot",
                    "close-up": "close-up shot",
                    와이드샷: "wide shot",
                    "wide-shot": "wide shot",
                    미디엄샷: "medium shot",
                    "medium-shot": "medium shot",
                    돌리: "dolly shot",
                    dolly: "dolly shot",
                    트래킹: "tracking shot",
                    tracking: "tracking shot",
                    팬: "pan shot",
                    pan: "pan shot",
                    틸트: "tilt shot",
                    tilt: "tilt shot",
                    핸드헬드: "handheld camera",
                    handheld: "handheld camera",
                    스테디캠: "steady cam",
                    "steady-cam": "steady cam",
                    드론: "drone shot",
                    drone: "drone shot",
                  };

                  if (country) {
                    const countryEn = countryMap[country] || country;
                    if (countryEn && !/[가-힣]/.test(countryEn)) {
                      promptParts.push(countryEn);
                    }
                  }
                  if (era) {
                    const eraEn = eraMap[era] || era;
                    if (eraEn && !/[가-힣]/.test(eraEn)) {
                      promptParts.push(eraEn + " era");
                    }
                  }
                  if (!promptParts.some((p) => p.includes("mood")) && mood) {
                    const moodEn = moodMap[mood] || mood + " mood";
                    if (moodEn && !/[가-힣]/.test(moodEn)) {
                      promptParts.push(moodEn);
                    }
                  }
                  if (
                    !promptParts.some((p) => p.includes("lighting")) &&
                    lighting
                  ) {
                    const lightingEn = lightingMap[lighting] || lighting;
                    if (lightingEn && !/[가-힣]/.test(lightingEn)) {
                      promptParts.push(lightingEn);
                    }
                  }
                  if (
                    !promptParts.some((p) => p.includes("shot")) &&
                    cameraWork
                  ) {
                    const cameraEn = cameraMap[cameraWork] || cameraWork;
                    if (cameraEn && !/[가-힣]/.test(cameraEn)) {
                      promptParts.push(cameraEn);
                    }
                  }
                  if (customSettings) {
                    // 커스텀 설정에서 한글 제거
                    const customEn = customSettings
                      .replace(/[가-힣]+/g, "")
                      .trim();
                    if (customEn) addIfValid(customEn);
                  }

                  // 고품질 키워드
                  [
                    "ultra high quality",
                    "8k resolution",
                    "photorealistic",
                    "cinematic lighting",
                    "natural pose",
                    "detailed hands",
                  ].forEach((k) => promptParts.push(k));

                  // 조합 (재할당 가능하도록)
                  const filteredParts = promptParts.filter((p) => {
                    if (!p || !p.trim() || p.trim().length < 2) return false;
                    // 한글이 포함된 항목 제거
                    if (/[가-힣]/.test(p)) return false;
                    return true;
                  });
                  prompt = filteredParts.join(", ").trim();

                  // 한글 완전 제거 (혹시 남아있는 경우)
                  prompt = prompt.replace(/[가-힣]+/g, "").trim();

                  // 불필요한 구두점 정리
                  prompt = prompt.replace(/,\s*,+/g, ", "); // 연속 쉼표
                  prompt = prompt.replace(/\s+/g, " "); // 연속 공백
                  prompt = prompt.trim();

                  if (!prompt.endsWith(".")) prompt += ".";
                }

                // promptEn 필드가 있으면 그대로 사용 (AI가 완성된 프롬프트 반환)
                if (
                  aiScene.promptEn &&
                  aiScene.promptEn.length >= 50 &&
                  !prompt
                ) {
                  prompt = aiScene.promptEn;
                  // 첫 번째 씬에서만 로그 출력
                  if (index === 0) {
                    console.log(
                      `✅ AI promptEn 사용 중 (${aiScenes.length}개 씬 모두 동일 처리)`,
                    );
                  }
                }

                // promptKo가 없으면 AI를 통해 한글 프롬프트 생성
                if (!promptKo || promptKo.length < 50) {
                  // Gemini API를 사용하여 한글 프롬프트 생성
                  try {
                    const geminiKey = window.getGeminiApiKey();
                    if (geminiKey && geminiKey.startsWith("AIza")) {
                      const sceneLyrics = aiScene.lyrics || "";

                      // 해당 씬의 가사 추출 (시간 기반)
                      let sceneLyricsFull = sceneLyrics;
                      if (!sceneLyricsFull && cleanLyrics) {
                        const timeMatch = timeStr.match(
                          /(\d+):(\d+)-(\d+):(\d+)/,
                        );
                        if (timeMatch) {
                          const startMin = parseInt(timeMatch[1]);
                          const startSec = parseInt(timeMatch[2]);
                          const startTotal = startMin * 60 + startSec;
                          const endMin = parseInt(timeMatch[3]);
                          const endSec = parseInt(timeMatch[4]);
                          const endTotal = endMin * 60 + endSec;

                          const lyricsLines = cleanLyrics
                            .split("\n")
                            .filter((l) => l.trim());
                          const estimatedLinesPerMinute =
                            lyricsLines.length / (totalSeconds / 60);
                          const startLine = Math.floor(
                            (startTotal / 60) * estimatedLinesPerMinute,
                          );
                          const endLine = Math.ceil(
                            (endTotal / 60) * estimatedLinesPerMinute,
                          );
                          sceneLyricsFull = lyricsLines
                            .slice(startLine, endLine + 1)
                            .join(" ")
                            .trim();
                        }
                      }

                      const koPrompt = `다음 정보를 기반으로 Midjourney용 상세한 한글 MV 씬 프롬프트를 생성해주세요.

【가사 내용】 (가장 중요 - 반드시 프롬프트에 구체적으로 반영하세요!)
"${sceneLyricsFull || sceneLyrics || "없음"}"

【전체 가사 맥락】 (참고용)
${cleanLyrics.substring(0, 300)}${cleanLyrics.length > 300 ? "..." : ""}

씬 정보:
- 시간: ${timeStr}
- 감정: ${aiScene.emotion || "없음"} (가사에서 느껴지는 감정)
- 장소: ${aiScene.location || "없음"} (가사 내용을 바탕으로)
- 인물 동작: ${aiScene.characterAction || "없음"} (가사 내용을 바탕으로)
- 분위기: ${aiScene.mood || "없음"} (가사에서 느껴지는 분위기)
- 조명: ${aiScene.lighting || "없음"} (가사 분위기에 맞는 조명)
- 카메라: ${aiScene.cameraWork || "없음"} (가사 감정을 강조하는 카메라)

MV 설정 (보조 참고용):
${era ? `- 시대: ${era}` : ""}
${country ? `- 국가: ${country}` : ""}
${location ? `- 기본 장소: ${location}` : ""}
${lighting ? `- 조명: ${lighting}` : ""}
${cameraWork ? `- 카메라 워크: ${cameraWork}` : ""}
${mood ? `- 분위기: ${mood}` : ""}

요구사항:
1. **가사 내용을 중심으로** Midjourney 이미지 생성용 한글 프롬프트 작성 (50단어 이상)
2. 가사에서 묘사되는 장면, 감정, 상황을 구체적으로 포함하세요
3. 가사 내용이 프롬프트의 핵심이 되어야 합니다
4. MV 설정은 가사 내용과 자연스럽게 융합하세요
5. 매우 상세하고 구체적인 묘사 포함
6. 자연스러운 한글 문장으로 작성
7. 프롬프트만 출력 (설명 없이)

**예시:**
가사가 "그날의 반지에 새겨진 맹세"라면:
"어두운 전당포 내부, 형광등 아래 먼지 쌓인 보석들이 줄지어 진열되어 있고, 30대 남성이 유리 케이스 안의 반지를 슬프게 바라보며 과거의 약속을 기억하고 있다, 그의 얼굴에는 후회와 그리움이 새겨져 있다, 쓴 감정, 우울하고 후회스러운 분위기, 깊은 그림자와 함께 거친 형광등, 반지에 클로즈업한 후 남성의 얼굴로 팬업, 미국, 현대 시대, 강렬한 감정적 분위기, 시네마틱 조명, 와이드샷 구도, 초고화질, 8k 해상도, 사진처럼 사실적, 시네마틱 조명, 자연스러운 포즈, 상세한 손과 얼굴 특징"`;

                      const koResponse = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            contents: [{ parts: [{ text: koPrompt }] }],
                            generationConfig: {
                              temperature: 0.8,
                              topK: 40,
                              topP: 0.95,
                              maxOutputTokens: 500,
                            },
                          }),
                        },
                      );

                      if (koResponse.ok) {
                        const koData = await koResponse.json();
                        const koText =
                          koData.candidates?.[0]?.content?.parts?.[0]?.text ||
                          "";
                        promptKo = koText
                          .trim()
                          .replace(/```json\s*/gi, "")
                          .replace(/```\s*/g, "")
                          .replace(/^["']|["']$/g, "")
                          .trim();
                        if (promptKo && promptKo.length >= 50) {
                          if (index === 0)
                            console.log(
                              `✅ 씬 ${index + 1} 한글 프롬프트 생성 완료`,
                            );
                        }
                      }
                    }
                  } catch (koError) {
                    console.warn(
                      `⚠️ 씬 ${index + 1} 한글 프롬프트 생성 실패:`,
                      koError,
                    );
                  }

                  // AI 생성 실패 시 개별 필드로 한글 프롬프트 조합
                  if (!promptKo || promptKo.length < 50) {
                    let promptKoParts = [];

                    const addIfValidKo = (value) => {
                      if (value && typeof value === "string") {
                        const t = value.trim();
                        if (t && t.length >= 2 && !/^[,.\s]+$/.test(t)) {
                          promptKoParts.push(t);
                          return true;
                        }
                      }
                      return false;
                    };

                    // 가사 내용을 먼저 포함 (가능한 경우)
                    const sceneLyrics = aiScene.lyrics || "";
                    if (
                      sceneLyrics &&
                      sceneLyrics.trim() &&
                      sceneLyrics.length > 3
                    ) {
                      // 가사 내용을 묘사로 변환
                      promptKoParts.push(`가사 내용: "${sceneLyrics.trim()}"`);
                    }

                    // AI 데이터에서 추출 (가사 내용이 반영된 location과 characterAction을 우선)
                    if (aiScene.location) addIfValidKo(aiScene.location);
                    if (aiScene.characterAction)
                      addIfValidKo(aiScene.characterAction);
                    if (aiScene.emotion)
                      addIfValidKo(aiScene.emotion + " 감정");
                    if (aiScene.mood) addIfValidKo(aiScene.mood);
                    if (aiScene.lighting) addIfValidKo(aiScene.lighting);
                    if (aiScene.cameraWork) addIfValidKo(aiScene.cameraWork);

                    // 사용자 설정 한글 변환 (보조)
                    if (country) {
                      const countryKoMap = {
                        korea: "한국",
                        Korea: "한국",
                        한국: "한국",
                        usa: "미국",
                        USA: "미국",
                        미국: "미국",
                      };
                      const countryKo = countryKoMap[country] || country;
                      if (countryKo) promptKoParts.push(countryKo);
                    }
                    if (era) {
                      const eraKoMap = {
                        modern: "현대",
                        현대: "현대",
                        historical: "과거",
                        과거: "과거",
                      };
                      const eraKo = eraKoMap[era] || era;
                      if (eraKo) promptKoParts.push(eraKo + " 시대");
                    }

                    promptKo = promptKoParts.join(", ").trim();
                    if (!promptKo.endsWith(".")) promptKo += ".";
                  }
                }

                // 한글 완전 제거 및 정리
                prompt = prompt.replace(/[가-힣]+/g, ""); // 한글 제거
                prompt = prompt.replace(/,\s*,+/g, ", "); // 연속 쉼표
                prompt = prompt.replace(/,\s*\./g, "."); // 쉼표+마침표
                prompt = prompt.replace(/\.+/g, "."); // 연속 마침표
                prompt = prompt.replace(/\s+/g, " "); // 공백
                prompt = prompt.trim();

                if (!prompt.endsWith(".")) prompt += ".";

                // 첫 번째 씬의 최종 프롬프트만 로그 출력 (디버깅용)
                if (index === 0) {
                  console.log(
                    `✅ 씬 1 한글 프롬프트 (${promptKo.length}자):`,
                    promptKo.substring(0, 100) + "...",
                  );
                  console.log(
                    `✅ 씬 1 영어 프롬프트 (${prompt.length}자):`,
                    prompt.substring(0, 150) + "...",
                  );
                }

                // 씬 번호 주석 추가 (Midjourney 복사용)
                const promptWithNumber = `/* Scene ${index + 1} */ ${prompt}`;

                scenes.push({
                  time: timeStr,
                  scene: aiScene.lyrics || `씬 ${index + 1}`, // 가사만 표시
                  prompt: promptWithNumber, // 씬 번호 주석 포함
                  promptKo: promptKo, // 한글 프롬프트 저장
                  runwayPrompt: aiScene.runwayPrompt || "",
                  runwayPromptKo: aiScene.runwayPromptKo || "",
                  location: aiScene.location,
                  emotion: aiScene.emotion,
                  mood: aiScene.mood,
                  lighting: aiScene.lighting,
                  characterAction: aiScene.characterAction,
                  cameraWork: aiScene.cameraWork,
                });
              } catch (sceneError) {
                console.error(`❌ 씬 ${index + 1} 처리 중 오류:`, sceneError);
                // 에러가 발생해도 기본 씬 추가
                const startTime = index * interval;
                const endTime = Math.min(startTime + interval, totalSeconds);
                const startMin = Math.floor(startTime / 60);
                const startSec = Math.floor(startTime % 60);
                const endMin = Math.floor(endTime / 60);
                const endSec = Math.floor(endTime % 60);
                const timeStr = `${startMin}:${String(startSec).padStart(2, "0")}-${endMin}:${String(endSec).padStart(2, "0")}`;

                scenes.push({
                  time: timeStr,
                  scene: `씬 ${index + 1}`,
                  prompt: `/* Scene ${index + 1} */ 기본 프롬프트`,
                  promptKo: `씬 ${index + 1} 기본 한글 프롬프트`,
                });
              }
            }

            console.log("✅ AI 기반 씬 생성 완료:", scenes.length, "개");
            if (scenes.length === 0) {
              throw new Error("생성된 씬이 없습니다");
            }
          } else {
            console.error("❌ JSON 배열이 비어있거나 유효하지 않습니다");
            throw new Error("JSON 배열이 비어있거나 유효하지 않습니다");
          }
        } else {
          console.error(
            "❌ API 응답 실패:",
            response.status,
            response.statusText,
          );
          throw new Error(`API 응답 실패: ${response.status}`);
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

            const prompt = `다음 음악 가사와 설정을 기반으로 Midjourney용 **매우 상세하고 자연스러운** 영어 프롬프트와 한글 프롬프트를 각각 생성해주세요.

【가사 내용】 (가장 중요 - 반드시 프롬프트의 핵심이 되어야 합니다!)
"${sceneLyrics}"

【전체 가사 맥락】 (참고용)
${cleanLyrics.substring(0, 500)}${cleanLyrics.length > 500 ? "..." : ""}

【MV 설정】 (보조 참고용 - 가사 내용을 우선하되 자연스럽게 융합)
- 시대: ${era || "현대"}
- 국가: ${country || "한국"}
- 장소: ${location || "도시"}
- 조명: ${lighting || "자연광"}
- 카메라: ${cameraWork || "중간 샷"}
- 분위기: ${mood || "감성적"}
- 인물: ${characterInfo || "1명"}
${customSettings ? `- 추가: ${customSettings}` : ""}

【작업 요구사항】
1. **가사 내용을 중심으로** 매우 구체적이고 상세한 영어 프롬프트와 한글 프롬프트를 각각 작성
2. **가사에서 묘사되는 장면, 감정, 상황을 구체적으로 포함**하세요
3. 가사의 감정과 분위기를 시각적으로 표현하는 묘사 포함
4. 위의 MV 설정(시대, 국가, 조명, 카메라, 분위기 등)을 **가사 내용과 자연스럽게 융합** (가사 내용이 우선)
5. 배경, 인물, 조명, 카메라 워크를 모두 포함한 완성된 프롬프트
6. 영어 프롬프트는 한글 없이 **순수 영어만** 작성
7. 한글 프롬프트는 자연스러운 한글로 작성
8. 각 프롬프트는 50단어 이상의 상세한 묘사
9. 고품질 키워드 포함 (ultra high quality, 8k resolution, photorealistic, cinematic lighting 등)
10. **프롬프트만 출력** (설명이나 주석 없이 순수 프롬프트만)

**출력 형식 (순수 JSON만):**
\`\`\`json
{
  "scenes": [
    {
      "time": "0:00-0:15",
      "lyrics": "해당 구간의 실제 가사 내용",
      "promptEn": "매우 상세한 Midjourney용 영어 프롬프트 (50단어 이상)",
      "promptKo": "위 영어 프롬프트를 자연스럽게 번역한 한글 프롬프트",
      "runwayPrompt": "Subject (누가), Action (무엇을 하는가), Emotion (감정), Environment (공간), Camera movement, Lighting, Style realism, Technical modifiers 형식을 따른 영문 비디오 프롬프트. 인물의 세밀한 동작과 카메라의 움직임, 조명을 중심으로 매우 상세히 작성",
      "runwayPromptKo": "위 Runway 영문 프롬프트를 한글로 번역한 내용",
      "location": "장소",
      "characterAction": "인물 동작",
      "lighting": "조명 설정"
    }
  ]
}
\`\`\`

**Runway Video Prompt 작성 지침 (가장 중요):**
1. **구성 요소 필수 포함**: Subject, Action, Emotion, Environment, Camera movement, Lighting, Style realism, Technical modifiers
2. **세밀한 묘사**: 인물의 아주 구체적이고 세밀한 동작 표현에 집중하세요.
3. **역동적 연출**: 카메라의 구체적인 움직임(Cinematic dolly, Pan, Tilt, Zoom 등)과 인상적인 조명(Cinematic lighting, Rim light, Volumetric, Golden hour 등)을 반드시 포함하세요.
4. **참조**: 전체 가사 맥락과 각 씬의 상황, Midjourney용 영어 프롬프트의 시각적 요소를 모두 조화롭게 반영하세요.

**지금 바로 JSON을 생성하세요:**`;

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
            const response = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.8,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: 2048,
                },
              }),
            });

            let promptEn = "";
            let promptKo = "";
            let aiScene_runwayPrompt = "";

            if (response.ok) {
              const data = await response.json();
              if (window.logApiUsage) window.logApiUsage("gemini");
              const aiResponse =
                data.candidates?.[0]?.content?.parts?.[0]?.text || "";

              // JSON 추출
              let cleanedResponse = aiResponse.trim();
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
                  var runwayPrompt = aiPrompts.runwayPrompt || "";
                  if (runwayPrompt) {
                    aiScene_runwayPrompt = runwayPrompt;
                  }
                } catch (e) {
                  console.warn(`씬 ${i + 1} JSON 파싱 실패:`, e);
                }
              }
            }

            // 해당 씬 가사에 맞는 장소 1개 (fallback/라벨용)
            let chosenLoc =
              (typeof window.pickBestLocationForScene === "function"
                ? window.pickBestLocationForScene(sceneLyrics, i, imageCount)
                : null) ||
              (location ? (location.split(",")[0] || location).trim() : null);

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
              if (lighting) promptParts.push(lighting + " lighting");
              if (cameraWork) promptParts.push(cameraWork);
              if (mood) promptParts.push(mood + " mood");

              promptParts.push(
                "ultra high quality",
                "8k resolution",
                "photorealistic",
                "cinematic lighting",
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

            scenes.push({
              time: timeStr,
              scene: sceneLyrics,
              prompt: promptWithNumber,
              promptKo: promptKo,
              runwayPrompt:
                typeof aiScene_runwayPrompt !== "undefined"
                  ? aiScene_runwayPrompt
                  : promptEn.replace(/\/\*.*?\*\//g, "").trim() +
                    ", cinematic motion, 8k, highly detailed",
              location: sceneLocationLabel,
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

    const container = document.getElementById("mvSceneOverviewContainer");
    if (container) {
      let html = "";

      // 썸네일/배경/인물 프롬프트 표시
      const reviewContainer = document.getElementById(
        "mvPromptsReviewContainer",
      );
      if (reviewContainer && thumbnailPrompts) {
        reviewContainer.innerHTML = `
            <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--primary);">
                <h3 style="margin: 0 0 15px 0; color: var(--text-primary); font-size: 1.1rem;">🖼️ 썸네일/배경/인물 프롬프트 리뷰</h3>
                <p style="margin: 0 0 15px 0; color: var(--text-secondary); font-size: 0.85rem;">전체 뮤직비디오의 스타일을 결정하는 주요 프롬프트입니다. 내용을 확인하고 수정하세요.</p>
                <div style="display: grid; grid-template-columns: 1fr; gap: 20px;">
                    <div style="padding: 15px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <label style="margin: 0; color: var(--text-primary); font-size: 0.95rem; font-weight: 700;">🎬 썸네일 이미지 프롬프트</label>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-small btn-primary" onclick="window.regenerateSingleStylePrompt('thumbnail')" title="썸네일 프롬프트만 파생성" style="padding: 4px 8px; font-size: 0.75rem;">
                                    <i class="fas fa-sync-alt"></i> 재생성
                                </button>
                                <button class="btn btn-small btn-secondary" onclick="window.editReviewPrompt('review_thumbnail_en')" title="수정 포커스" style="padding: 4px 8px; font-size: 0.75rem;">
                                    <i class="fas fa-edit"></i> 수정
                                </button>
                                <button class="btn btn-small btn-success" onclick="window.copyReviewPrompt('review_thumbnail_en')" title="Midjourney 영어 프롬프트 복사" style="padding: 4px 8px; font-size: 0.75rem;">
                                    <i class="fas fa-copy"></i> Midjourney 복사
                                </button>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.75rem;">Midjourney (EN)</label>
                                <textarea id="review_thumbnail_en" style="width: 100%; min-height: 80px; padding: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem; font-family: monospace; resize: vertical;">${thumbnailPrompts.thumbnailEn || ""}</textarea>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.75rem;">한글 번역</label>
                                <textarea id="review_thumbnail_ko" style="width: 100%; min-height: 80px; padding: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-secondary); font-size: 0.85rem; resize: vertical;">${thumbnailPrompts.thumbnailKo || ""}</textarea>
                            </div>
                        </div>
                    </div>
                    <div style="padding: 15px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <label style="margin: 0; color: var(--text-primary); font-size: 0.95rem; font-weight: 700;">🏞️ 배경 프롬프트 (상세)</label>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-small btn-primary" onclick="window.regenerateSingleStylePrompt('background')" title="배경 프롬프트만 재생성" style="padding: 4px 8px; font-size: 0.75rem;">
                                    <i class="fas fa-sync-alt"></i> 재생성
                                </button>
                                <button class="btn btn-small btn-secondary" onclick="window.editReviewPrompt('review_background_en')" title="수정 포커스" style="padding: 4px 8px; font-size: 0.75rem;">
                                    <i class="fas fa-edit"></i> 수정
                                </button>
                                <button class="btn btn-small btn-success" onclick="window.copyReviewPrompt('review_background_en')" title="Midjourney 영어 프롬프트 복사" style="padding: 4px 8px; font-size: 0.75rem;">
                                    <i class="fas fa-copy"></i> Midjourney 복사
                                </button>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.75rem;">Midjourney (EN)</label>
                                <textarea id="review_background_en" style="width: 100%; min-height: 80px; padding: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem; font-family: monospace; resize: vertical;">${thumbnailPrompts.backgroundEn || ""}</textarea>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.75rem;">한글 번역</label>
                                <textarea id="review_background_ko" style="width: 100%; min-height: 80px; padding: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-secondary); font-size: 0.85rem; resize: vertical;">${thumbnailPrompts.backgroundKo || ""}</textarea>
                            </div>
                        </div>
                    </div>
                    <div style="padding: 15px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <label style="margin: 0; color: var(--text-primary); font-size: 0.95rem; font-weight: 700;">👤 인물 프롬프트 (상세)</label>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-small btn-primary" onclick="window.regenerateSingleStylePrompt('character')" title="인물 프롬프트만 재생성" style="padding: 4px 8px; font-size: 0.75rem;">
                                    <i class="fas fa-sync-alt"></i> 재생성
                                </button>
                                <button class="btn btn-small btn-secondary" onclick="window.editReviewPrompt('review_character_en')" title="수정 포커스" style="padding: 4px 8px; font-size: 0.75rem;">
                                    <i class="fas fa-edit"></i> 수정
                                </button>
                                <button class="btn btn-small btn-success" onclick="window.copyReviewPrompt('review_character_en')" title="Midjourney 영어 프롬프트 복사" style="padding: 4px 8px; font-size: 0.75rem;">
                                    <i class="fas fa-copy"></i> Midjourney 복사
                                </button>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.75rem;">Midjourney (EN)</label>
                                <textarea id="review_character_en" style="width: 100%; min-height: 80px; padding: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem; font-family: monospace; resize: vertical;">${thumbnailPrompts.characterEn || ""}</textarea>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.75rem;">한글 번역</label>
                                <textarea id="review_character_ko" style="width: 100%; min-height: 80px; padding: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-secondary); font-size: 0.85rem; resize: vertical;">${thumbnailPrompts.characterKo || ""}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
      }

      html += `
          <div style="margin: 10px 0 30px 0; padding: 15px; background: var(--bg-card); border-radius: 8px; border-left: 4px solid var(--accent);">
              <h3 style="margin: 0 0 10px 0; color: var(--text-primary); font-size: 1.1rem;">
                  <i class="fas fa-film"></i> 씬별 세부 프롬프트 수정
              </h3>
              <p style="margin: 0; color: var(--text-secondary); font-size: 0.85rem;">각 씬의 이미지(Midjourney) 및 비디오(Runway) 프롬프트를 세부적으로 수정할 수 있습니다.</p>
          </div>
      `;
      scenes.forEach((scene, index) => {
        // 기존 프롬프트에서 영어와 한글 분리 (혼합되어 있을 수 있음)
        let existingPrompt = scene.prompt || "";
        // 영어 프롬프트에서 의도적으로 전달된 한글을 지우지 않음 (기본 방식/가사 전달용 보존)
        // 씬 번호 주석 제거 후 다시 추가 (한글 제거 후)
        existingPrompt = existingPrompt
          .replace(/\/\*\s*Scene\s+\d+\s*\*\//gi, "")
          .trim();
        if (existingPrompt && !existingPrompt.startsWith("/* Scene")) {
          existingPrompt = `/* Scene ${index + 1} */ ${existingPrompt}`;
        }
        const existingPromptKo = scene.promptKo || "";

        html += `
                    <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border);" data-scene-index="${index}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <h4 style="margin: 0; color: var(--text-primary);">씬 ${index + 1}</h4>
                                <span style="color: var(--accent); font-weight: 600;">${scene.time}</span>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-small btn-primary" onclick="regenerateSceneOverviewPrompt(${index})" title="이 씬의 프롬프트 재생성" style="padding: 6px 12px; font-size: 0.8rem;">
                                    <i class="fas fa-sync-alt"></i> 재생성
                                </button>
                                <button id="editSceneOverviewBtn_${index}" class="btn btn-small btn-secondary" onclick="editSceneOverview(${index}, this)" title="씬 수정" style="padding: 6px 12px; font-size: 0.8rem;" data-state="edit" data-original-en="${existingPrompt.replace(/"/g, "&quot;")}">
                                    <i class="fas fa-edit"></i> 수정
                                </button>
                                <button id="copySceneOverviewBtn_${index}" class="btn btn-small btn-success" onclick="copySceneOverviewPromptEn(${index}, event)" title="영어 프롬프트 복사 (Midjourney용)" style="padding: 6px 12px; font-size: 0.8rem;">
                                    <i class="fas fa-copy"></i> Midjourney 복사
                                </button>
                                <button id="copySceneOverviewRunwayBtn_${index}" class="btn btn-small btn-info" onclick="copySceneOverviewRunwayPrompt(${index}, event)" title="Runway 비디오 프롬프트 복사" style="padding: 6px 12px; font-size: 0.8rem; background-color: #3168E8; color: white;">
                                    <i class="fas fa-video"></i> Runway 복사
                                </button>
                            </div>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">📝 장면 설명:</label>
                            <textarea class="scene-description" data-index="${index}" data-scene-index="${index}" style="width: 100%; min-height: 80px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.9rem; resize: vertical;">${scene.scene || ""}</textarea>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">⛵ Midjourney Prompt (EN):</label>
                                <textarea id="scene_overview_${index}_en" class="scene-overview-en" data-index="${index}" data-scene-index="${index}" style="width: 100%; min-height: 100px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem; font-family: monospace; resize: vertical;">${existingPrompt}</textarea>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">🎬 Runway Prompt (EN):</label>
                                <textarea id="scene_overview_${index}_runway" class="scene-overview-runway" data-index="${index}" data-scene-index="${index}" style="width: 100%; min-height: 100px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem; font-family: monospace; resize: vertical;">${scene.runwayPrompt || ""}</textarea>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">⛵ Midjourney (한글):</label>
                                <textarea id="scene_overview_${index}_ko" class="scene-overview-ko" data-index="${index}" data-scene-index="${index}" style="width: 100%; min-height: 60px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-secondary); font-size: 0.85rem; resize: vertical;">${existingPromptKo}</textarea>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">🎬 Runway (한글):</label>
                                <textarea id="scene_overview_${index}_runway_ko" class="scene-overview-runway-ko" data-index="${index}" data-scene-index="${index}" style="width: 100%; min-height: 60px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-secondary); font-size: 0.85rem; resize: vertical;">${scene.runwayPromptKo || ""}</textarea>
                            </div>
                        </div>
                    </div>
                `;
      });
      container.innerHTML = html;

      // 씬에 promptKo가 있으면 한글 프롬프트에 설정, 없으면 영어에서 번역
      scenes.forEach((scene, index) => {
        const enEl = document.getElementById(`scene_overview_${index}_en`);
        const koEl = document.getElementById(`scene_overview_${index}_ko`);

        // 씬에 promptKo가 있으면 한글 프롬프트에 설정
        if (koEl && scene.promptKo) {
          koEl.value = scene.promptKo;
          // currentScenes도 업데이트
          if (window.currentScenes && window.currentScenes[index]) {
            window.currentScenes[index].promptKo = scene.promptKo;
          }
        }

        // 영어 프롬프트가 있고 한글 프롬프트가 없으면 한글로 번역
        if (enEl && enEl.value && (!koEl || !koEl.value)) {
          translateEnglishToKoreanForScene("prompt", enEl.value)
            .then((translated) => {
              if (koEl && translated) {
                koEl.value = translated;
                // currentScenes도 업데이트
                if (window.currentScenes && window.currentScenes[index]) {
                  window.currentScenes[index].promptKo = translated;
                }
              }
            })
            .catch((err) => {
              console.error("자동 번역 오류:", err);
            });
        }

        // 영어 프롬프트가 있고 Runway 프롬프트가 없으면 생성
        const runwayEl = document.getElementById(
          `scene_overview_${index}_runway`,
        );
        const runwayKoEl = document.getElementById(
          `scene_overview_${index}_runway_ko`,
        );

        if (runwayEl && !runwayEl.value.trim() && scene.prompt) {
          const derivedRunway =
            scene.prompt.replace(/\/\*.*?\*\//g, "").trim() +
            ", cinematic motion, 8k, highly detailed";
          runwayEl.value = derivedRunway;
          if (window.currentScenes && window.currentScenes[index]) {
            window.currentScenes[index].runwayPrompt = derivedRunway;
          }
        }

        // Runway 영어 프롬프트가 있고 한글 번역이 없으면 번역
        if (
          runwayEl &&
          runwayEl.value.trim() &&
          (!runwayKoEl || !runwayKoEl.value.trim())
        ) {
          translateEnglishToKoreanForScene("runwayPrompt", runwayEl.value).then(
            (translated) => {
              if (runwayKoEl && translated) {
                runwayKoEl.value = translated;
                if (window.currentScenes && window.currentScenes[index]) {
                  window.currentScenes[index].runwayPromptKo = translated;
                }
              }
            },
          );
        }
      });
    }

    if (mvSceneOverviewSection) {
      mvSceneOverviewSection.style.display = "block";
    }

    window.currentScenes = scenes;

    console.log(
      "✅ MV 프롬프트 생성 완료:",
      scenes.length,
      "개 씬",
      useAI ? "(AI 생성)" : "(기본 방식)",
    );
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
        alert(
          `${errorMessage}\n\n${errorInfo.userMessage || ""}\n\n상세: ${errorInfo.error || error.message}`,
        );
      } catch (e) {
        alert(errorMessage);
      }
    } else {
      alert(errorMessage);
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
    const stylePrompt =
      document.getElementById("finalizedStylePrompt")?.value ||
      document.getElementById("stylePrompt")?.value ||
      "";

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
        const prompt = `다음 음악 가사와 설정을 기반으로 Midjourney용 **세밀하고 상세한** 영어 프롬프트와 한글 프롬프트를 각각 3개씩 생성하세요.

【가사】 (가장 중요 - 반드시 각 프롬프트에 구체적으로 반영하세요!)
${cleanLyrics}

【스타일】
${stylePrompt || "감성적인 발라드"}

【MV 설정】 (보조 참고용 - 가사 내용을 우선하되 자연스럽게 융합)
- 시대: ${era || "현대"}
- 국가: ${country || "한국"}
- 장소: ${location || "도시"}
- 조명: ${lighting || "자연광"}
- 카메라: ${cameraWork || "중간 샷"}
- 분위기: ${mood || "감성적"}
- 인물: ${characterInfo || "1명"}
${customSettings ? `- 추가: ${customSettings}` : ""}

【작업 요구사항】
다음 3가지 프롬프트를 각각 **매우 상세하고 구체적으로** 작성하세요 (각 40단어 이상):

1. **썸네일 프롬프트 (Thumbnail Prompt)**: 
   - MV 썸네일 이미지용
   - **전체 가사의 핵심 감정과 분위기를 대표하는 이미지** (전체 가사 내용을 구체적으로 반영)
   - **MV 프롬프트 상세 설정 반영**: 시대(${era || "현대"}), 국가(${country || "한국"}), 장소(${location || "도시"}), 조명(${lighting || "자연광"}), 카메라(${cameraWork || "중간 샷"}), 분위기(${mood || "감성적"})를 자연스럽게 융합
   - 인물, 배경, 조명, 구도 모두 포함
   - **인물 상세 정보 포함** (성별, 나이, 인종, 외모/스타일) - MV 설정의 인물 정보를 반영하여 일관되게 묘사
   - 16:9 비율, 영화적 구도
   - **미드저니 고화질 실사진 키워드 필수 포함**: "ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio, professional photography, sharp focus, depth of field, color grading"

2. **배경 프롬프트 (Background Prompt)**:
   - 배경 중심 구성
   - **전체 가사와 분위기를 반영한 상세한 배경 묘사** (가사에서 묘사되는 장소나 분위기 반영)
   - **MV 프롬프트 상세 설정 반영**: 시대, 국가, 장소, 조명, 분위기를 자연스럽게 융합
   - 조명, 색감, 분위기 상세 묘사
   - 인물은 최소화하거나 실루엣만
   - **미드저니 고화질 실사진 키워드 필수 포함**: "background-focused composition, ultra high quality, 8k resolution, photorealistic, detailed background, professional photography"

3. **인물 프롬프트 (Character Prompt)**:
   - 인물 중심 구성
   - **전체 가사의 감정을 인물 표정에 반영** (전체 가사에서 느껴지는 감정을 시각적으로 표현)
   - **MV 프롬프트 상세 설정 반영**: 시대, 국가, 조명, 카메라, 분위기를 자연스럽게 융합
   - **인물 상세 정보 포함** (성별, 나이, 인종, 외모/스타일) - MV 설정의 인물 정보를 반영하여 일관되게 묘사
   - 인물의 표정, 포즈, 동작 상세 묘사
   - 자연스러운 포즈, 상세한 손가락, 얼굴 특징
   - **미드저니 고화질 실사진 키워드 필수 포함**: "character-focused composition, ultra high quality, 8k resolution, photorealistic, natural pose, detailed hands, detailed facial features, professional photography, sharp focus, depth of field"

**출력 형식 (순수 JSON만):**
\`\`\`json
{
  "thumbnailEn": "완성된 썸네일 영어 프롬프트 (60단어 이상, 전체 가사 내용 반영, MV 설정 융합, 고화질 실사진 키워드 포함)",
  "thumbnailKo": "완성된 썸네일 한글 프롬프트 (60단어 이상, 전체 가사 내용 반영, MV 설정 융합, 고화질 실사진 키워드 포함)",
  "backgroundEn": "완성된 배경 영어 프롬프트 (60단어 이상, 전체 가사 내용 반영, MV 설정 융합, 고화질 실사진 키워드 포함)",
  "backgroundKo": "완성된 배경 한글 프롬프트 (60단어 이상, 전체 가사 내용 반영, MV 설정 융합, 고화질 실사진 키워드 포함)",
  "characterEn": "완성된 인물 영어 프롬프트 (60단어 이상, 전체 가사 내용 반영, MV 설정 융합, 고화질 실사진 키워드 포함)",
  "characterKo": "완성된 인물 한글 프롬프트 (60단어 이상, 전체 가사 내용 반영, MV 설정 융합, 고화질 실사진 키워드 포함)"
}
\`\`\`

**매우 중요:**
- **전체 가사 내용을 가장 우선적으로 반영하세요** - 각 프롬프트에 전체 가사에서 묘사되는 장면, 감정, 상황을 구체적으로 포함하세요
- **MV 프롬프트 상세 설정을 반드시 반영하세요** - 시대, 국가, 장소, 조명, 카메라, 분위기, 인물 정보를 전체 가사 내용과 자연스럽게 융합
- 각 프롬프트는 60단어 이상의 상세한 묘사
- 가사의 감정과 내용을 시각적으로 표현
- **인물 상세 정보(성별, 나이, 인종, 외모/스타일)는 모든 프롬프트에서 일관되게 반영되어야 합니다**
- **미드저니 고화질 실사진 키워드는 필수로 포함**하세요 (각 프롬프트 설명에 명시된 키워드들)
- 영어 프롬프트는 순수 영어만 (한글 없음)
- 한글 프롬프트는 자연스러운 한글로 작성
- JSON 형식만 출력`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 4096,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (window.logApiUsage) window.logApiUsage("gemini");
          const aiResponse =
            data.candidates?.[0]?.content?.parts?.[0]?.text || "";

          console.log("🤖 AI 응답 수신:", aiResponse.substring(0, 300) + "...");

          // JSON 추출
          let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiPrompts = safeJsonParse(jsonMatch[0]);

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
      thumbnailEnEl.value = thumbnailEn || "설정된 내용이 없습니다.";
      console.log(
        "✅ 썸네일 영어 프롬프트 UI 업데이트:",
        thumbnailEn.substring(0, 50) + "...",
      );
    }
    if (thumbnailKoEl) {
      thumbnailKoEl.value = thumbnailKo || "설정된 내용이 없습니다.";
    }

    // 배경 프롬프트 UI 업데이트
    if (backgroundDetailEnEl) {
      backgroundDetailEnEl.value = backgroundEn || "설정된 내용이 없습니다.";
      console.log(
        "✅ 배경 영어 프롬프트 UI 업데이트:",
        backgroundEn.substring(0, 50) + "...",
      );
    }
    if (backgroundDetailKoEl) {
      backgroundDetailKoEl.value = backgroundKo || "설정된 내용이 없습니다.";
    }

    // 인물 프롬프트 UI 업데이트
    if (characterDetailEnEl) {
      characterDetailEnEl.value = characterEn || "설정된 내용이 없습니다.";
      console.log(
        "✅ 인물 영어 프롬프트 UI 업데이트:",
        characterEn.substring(0, 50) + "...",
      );
    }
    if (characterDetailKoEl) {
      characterDetailKoEl.value = characterKo || "설정된 내용이 없습니다.";
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

// --- Extracted getMVLocationValues ---
window.getMVLocationValues = function () {
  return getSelectedTags("mvLocationTags") || [];
};

// --- Extracted generateSRTPreview ---
window.generateSRTPreview = function () {
  try {
    // 최종 가사 가져오기
    const finalLyricsEl = document.getElementById("finalLyrics");
    if (!finalLyricsEl || !finalLyricsEl.textContent.trim()) {
      alert(
        "⚠️ 최종 가사가 없습니다.\n\n5단계에서 최종 가사를 먼저 확인해주세요.",
      );
      return;
    }

    const lyrics = finalLyricsEl.textContent.trim();

    // 설정 값 가져오기
    const displayDuration = parseInt(
      document.getElementById("srtDisplayDuration")?.value || "16",
      10,
    );
    const linesPerSubtitle = parseInt(
      document.getElementById("srtLinesPerSubtitle")?.value || "2",
      10,
    );

    // 가사에서 지시어 제거하고 실제 가사만 추출
    const lyricsLines = lyrics
      .split("\n")
      .map((line) => {
        // 대괄호와 그 안의 내용 제거 (모든 지시어 제거)
        let cleaned = line.replace(/\[[^\]]*\]/g, "").trim();
        return cleaned;
      })
      .filter((line) => {
        // 빈 줄 제거
        if (line.length === 0) {
          return false;
        }
        // 실제 가사만 포함
        return true;
      });

    if (lyricsLines.length === 0) {
      alert(
        "⚠️ 추출할 가사가 없습니다.\n\n가사에 지시어만 있고 실제 가사 내용이 없는 것 같습니다.",
      );
      return;
    }

    // SRT 형식으로 변환
    let srtContent = "";
    let subtitleIndex = 1;
    let currentTime = 0; // 시작 시간 (초)

    // 줄을 묶어서 자막 생성
    for (let i = 0; i < lyricsLines.length; i += linesPerSubtitle) {
      const subtitleLines = lyricsLines.slice(i, i + linesPerSubtitle);
      const subtitleText = subtitleLines.join("\n"); // SRT 형식에서 실제 줄바꿈 문자 사용

      // 시간 형식: HH:MM:SS,mmm -> HH:MM:SS,mmm
      const startHours = Math.floor(currentTime / 3600);
      const startMinutes = Math.floor((currentTime % 3600) / 60);
      const startSeconds = currentTime % 60;
      const startTimeStr = `${String(startHours).padStart(2, "0")}:${String(startMinutes).padStart(2, "0")}:${String(startSeconds).padStart(2, "0")},000`;

      const endTime = currentTime + displayDuration;
      const endHours = Math.floor(endTime / 3600);
      const endMinutes = Math.floor((endTime % 3600) / 60);
      const endSeconds = endTime % 60;
      const endTimeStr = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}:${String(endSeconds).padStart(2, "0")},000`;

      srtContent += `${subtitleIndex}\n`;
      srtContent += `${startTimeStr} --> ${endTimeStr}\n`;
      srtContent += `${subtitleText}\n\n`;

      subtitleIndex++;
      currentTime = endTime;
    }

    // 미리보기 표시
    const previewEl = document.getElementById("srtPreview");
    if (previewEl) {
      previewEl.innerHTML = `
                <div style="padding: 20px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border);">
                    <h4 style="margin: 0 0 15px 0; color: var(--text-primary); font-size: 1.1rem;">
                        <i class="fas fa-file-alt"></i> 생성된 SRT 자막 (${subtitleIndex - 1}개 자막)
                    </h4>
                    <pre style="background: var(--bg-input); padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 0.85rem; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; word-wrap: break-word; max-height: 400px; overflow-y: auto;">${escapeHtml(srtContent)}</pre>
                </div>
            `;
    }

    // 전역 변수에 저장 (복사/다운로드용)
    window.currentSRTContent = srtContent;

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ SRT 자막이 생성되었습니다! (${subtitleIndex - 1}개 자막)`,
      );
    } else {
      alert(`✅ SRT 자막이 생성되었습니다! (${subtitleIndex - 1}개 자막)`);
    }

    console.log("✅ SRT 자막 생성 완료:", subtitleIndex - 1, "개 자막");
  } catch (error) {
    console.error("❌ SRT 자막 생성 오류:", error);
    alert("SRT 자막 생성 중 오류가 발생했습니다:\n\n" + error.message);
  }
};
// --- Extracted copySceneOverviewRunwayPrompt ---
// --- Extracted copySceneOverviewRunwayPrompt ---
window.copySceneOverviewRunwayPrompt = async function (index, event) {
  try {
    const runwayEl = document.getElementById(`scene_overview_${index}_runway`);
    if (!runwayEl || !runwayEl.value.trim()) {
      alert("복사할 Runway 프롬프트가 없습니다.");
      return;
    }

    const promptText = runwayEl.value.trim();
    await navigator.clipboard.writeText(promptText);

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ 씬 ${index + 1} Runway 프롬프트가 복사되었습니다!`,
      );
    } else {
      alert(`✅ 씬 ${index + 1} Runway 프롬프트가 복사되었습니다!`);
    }
  } catch (error) {
    console.error("Runway 프롬프트 복사 오류:", error);
    alert("Runway 프롬프트 복사 중 오류가 발생했습니다:\n\n" + error.message);
  }
};

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
        const translated = await translateKoreanToEnglishForScene(koText);
        if (translated) {
          enEl.value = translated;
        }
      } else {
        enEl.value = "";
      }
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
        const translated = await translateKoreanToEnglishForScene(koText);
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
  } catch (error) {
    console.error("씬 프롬프트 상호 번역 오류:", error);
  }
};

// --- Restored Regeneration Functions ---
window.regenerateMVPrompt = async function (type) {
  try {
    const era = document.getElementById("mvEra")?.value || "";
    const country = document.getElementById("mvCountry")?.value || "";
    const location = document.getElementById("mvLocation")?.value || "";
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
    const stylePrompt =
      document.getElementById("finalizedStylePrompt")?.value || "";
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
   - MV 썸네일 이미지용
   - **전체 가사의 핵심 감정과 분위기를 대표하는 이미지** (전체 가사 내용을 구체적으로 반영)
   - **MV 프롬프트 상세 설정 반영**: 시대(${era}), 국가(${country}), 장소(${location}), 조명(${lighting}), 카메라(${cameraWork}), 분위기(${mood})를 자연스럽게 융합
   - 인물, 배경, 조명, 구도 모두 포함
   - **인물 상세 정보 포함** (성별, 나이, 인종, 외모/스타일) - MV 설정의 인물 정보를 반영하여 일관되게 묘사
   - 16:9 비율, 영화적 구도
   - **미드저니 고화질 실사진 키워드 필수 포함**: "ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio, professional photography, sharp focus, depth of field, color grading"`;
          jsonKeyEn = "thumbnailEn";
          jsonKeyKo = "thumbnailKo";
        } else if (type === "background") {
          taskDescription = `
1. **배경 프롬프트 (Background Prompt)**:
   - 배경 중심 구성
   - **전체 가사와 분위기를 반영한 상세한 배경 묘사** (가사에서 묘사되는 장소나 분위기 반영)
   - **MV 프롬프트 상세 설정 반영**: 시대(${era}), 국가(${country}), 장소(${location}), 조명(${lighting}), 분위기(${mood})를 자연스럽게 융합
   - 조명, 색감, 분위기 상세 묘사
   - 인물은 최소화하거나 실루엣만
   - **미드저니 고화질 실사진 키워드 필수 포함**: "background-focused composition, ultra high quality, 8k resolution, photorealistic, detailed background, professional photography"`;
          jsonKeyEn = "backgroundEn";
          jsonKeyKo = "backgroundKo";
        } else if (type === "character") {
          taskDescription = `
1. **인물 프롬프트 (Character Prompt)**:
   - 인물 중심 구성
   - **전체 가사의 감정을 인물 표정에 반영** (전체 가사에서 느껴지는 감정을 시각적으로 표현)
   - **MV 프롬프트 상세 설정 반영**: 시대(${era}), 국가(${country}), 조명(${lighting}), 카메라(${cameraWork}), 분위기(${mood})를 자연스럽게 융합
   - **인물 상세 정보 포함** (성별, 나이, 인종, 외모/스타일) - MV 설정의 인물 정보를 반영하여 일관되게 묘사
   - 인물의 표정, 포즈, 동작 상세 묘사
   - 자연스러운 포즈, 상세한 손가락, 얼굴 특징
   - **미드저니 고화질 실사진 키워드 필수 포함**: "character-focused composition, ultra high quality, 8k resolution, photorealistic, natural pose, detailed hands, detailed facial features, professional photography, sharp focus, depth of field"`;
          jsonKeyEn = "characterEn";
          jsonKeyKo = "characterKo";
        }

        const prompt = `다음 음악 가사와 설정을 기반으로 Midjourney용 **세밀하고 상세한** 영어 프롬프트와 한글 프롬프트를 1개만 생성하세요.

【가사】 (가장 중요 - 반드시 프롬프트에 구체적으로 반영하세요!)
${cleanLyrics}

【스타일】
${stylePrompt || "감성적인 발라드"}

【MV 설정】 (보조 참고용 - 가사 내용을 우선하되 자연스럽게 융합)
- 시대: ${era || "현대"}
- 국가: ${country || "한국"}
- 장소: ${location || "도시"}
- 조명: ${lighting || "자연광"}
- 카메라: ${cameraWork || "중간 샷"}
- 분위기: ${mood || "감성적"}
- 인물: ${characterInfo || "1명"}
${customSettings ? `- 추가: ${customSettings}` : ""}

【작업 요구사항】
해당 프롬프트를 **매우 상세하고 구체적으로** 작성하세요 (60단어 이상):
${taskDescription}

**출력 형식 (순수 JSON만):**
\`\`\`json
{
  "${jsonKeyEn}": "완성된 영어 프롬프트 (60단어 이상, 전체 가사 내용 반영, MV 설정 융합, 고화질 실사진 키워드 포함)",
  "${jsonKeyKo}": "완성된 한글 프롬프트 (60단어 이상, 전체 가사 내용 반영, MV 설정 융합, 고화질 실사진 키워드 포함)"
}
\`\`\`

**매우 중요:**
- **전체 가사 내용을 가장 우선적으로 반영하세요**
- **MV 프롬프트 상세 설정을 반드시 반영하세요**
- **미드저니 고화질 실사진 키워드는 필수로 포함**하세요
- 영어 프롬프트는 순수 영어만 (한글 없음)
- JSON 형식만 출력`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 2000 },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiResponse =
            data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiPrompts = safeJsonParse(jsonMatch[0]);
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
          }
        }
      } catch (aiError) {
        console.warn(`⚠️ ${type} 개별 AI 프롬프트 생성 실패:`, aiError);
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

    if (thumbnailPrompts) {
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
      const enEl = document.getElementById(`scene_overview_${index}_en`);
      const koEl = document.getElementById(`scene_overview_${index}_ko`);
      if (enEl) window.currentScenes[index].prompt = enEl.value;
      if (koEl) window.currentScenes[index].promptKo = koEl.value;
    });

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
      thumbnailEn:
        document.getElementById("review_thumbnail_en")?.value ||
        document.getElementById("mvThumbnailPromptEn")?.value ||
        "",
      thumbnailKo:
        document.getElementById("review_thumbnail_ko")?.value ||
        document.getElementById("mvThumbnailPromptKo")?.value ||
        "",
      backgroundDetailEn:
        document.getElementById("review_background_en")?.value ||
        document.getElementById("mvBackgroundDetailPromptEn")?.value ||
        "",
      backgroundDetailKo:
        document.getElementById("review_background_ko")?.value ||
        document.getElementById("mvBackgroundDetailPromptKo")?.value ||
        "",
      characterDetailEn:
        document.getElementById("review_character_en")?.value ||
        document.getElementById("mvCharacterDetailPromptEn")?.value ||
        "",
      characterDetailKo:
        document.getElementById("review_character_ko")?.value ||
        document.getElementById("mvCharacterDetailPromptKo")?.value ||
        "",
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
    window.currentProject.data.marketing.mvScenes = JSON.parse(
      JSON.stringify(window.currentScenes),
    );

    if (typeof window.saveCurrentProject === "function") {
      const saved = window.saveCurrentProject();
      if (!saved) {
        alert("프로젝트 저장에 실패했습니다.");
        return;
      }
    }

    const mvSceneOverviewSection = document.getElementById(
      "mvSceneOverviewSection",
    );
    const mvResultsSection = document.getElementById("mvResultsSection");
    if (mvSceneOverviewSection) mvSceneOverviewSection.style.display = "none";
    if (mvResultsSection) {
      mvResultsSection.style.display = "block";
      // Populate the results section (Placeholder for actual render logic if needed)
      if (typeof renderMVPrompts === "function") {
        renderMVPrompts(window.currentScenes, mvSettings);
      }
    }

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator("✅ 씬 및 프롬프트가 확정되었습니다.");
    } else {
      alert("씬 개요 및 프롬프트가 저장되었습니다.");
    }

    document
      .getElementById("mvResultsSection")
      ?.scrollIntoView({ behavior: "smooth" });
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

    const totalScenes = window.currentScenes ? window.currentScenes.length : 0;
    const sceneNumber = sceneIndex + 1;
    const sceneLabel =
      totalScenes > 0
        ? `[Scene ${sceneNumber} of ${totalScenes}]`
        : `[Scene ${sceneNumber}]`;
    promptText = `${sceneLabel}\n${promptText}`;

    await navigator.clipboard.writeText(promptText);

    const btn = event
      ? event.currentTarget
      : document.getElementById(`copySceneOverviewBtn_${sceneIndex}`);
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
    const finalLyrics =
      document.getElementById("finalLyrics")?.textContent ||
      document.getElementById("finalizedLyrics")?.value ||
      document.getElementById("sunoLyrics")?.value ||
      "";
    const stylePrompt =
      document.getElementById("finalizedStylePrompt")?.value ||
      document.getElementById("stylePrompt")?.value ||
      "";

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

    const geminiKey = window.getGeminiApiKey();
    if (geminiKey && geminiKey.startsWith("AIza")) {
      const cleanLyrics = extractLyricsOnly(finalLyrics);
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

      const eraEn = eraMap[era] || era || "modern";
      const countryEn = countryMap[country] || country || "Korea";
      const moodEn = moodMap[mood] || mood || "";
      const lightingEn = lightingMap[lighting] || lighting || "";
      const cameraEn = cameraMap[cameraWork] || cameraWork || "";

      let sceneLyrics = "";
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
      if (!sceneLyrics) sceneLyrics = scene.scene || "music scene";

      let characterInfoStr = characters
        .map((c, idx) => {
          return `인물${idx + 1}: ${c.gender || ""} ${c.age || ""} ${c.race || ""} ${c.appearance || ""}`;
        })
        .join("; ");

      const prompt = `Generate a detailed Midjourney prompt for a music video scene based on:
Lyrics: "${sceneLyrics}"
Scene description: "${scene.scene || ""}"
Style: ${stylePrompt || "cinematic"}
Settings: ${eraEn}, ${countryEn}, ${location}, ${lightingEn}, ${cameraEn}, ${moodEn}
Characters: ${characterInfoStr}
Output JSON: {"promptEn": "...", "promptKo": "..."}`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1000 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse =
          data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiPrompts = safeJsonParse(jsonMatch[0]);
          const newPromptEn = aiPrompts.promptEn || "";
          const newPromptKo = aiPrompts.promptKo || "";

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
              if (newPromptKo) koEl.value = newPromptKo;
              else
                await window.syncSceneOverviewPromptTranslation(
                  sceneIndex,
                  "en",
                );
            }
          }
        }
      }
    }
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ 씬 ${sceneIndex + 1} 프롬프트가 재생성되었습니다!`,
      );
    }
  } catch (error) {
    console.error("씬 개요 프롬프트 재생성 오류:", error);
  }
};

// --- Restored Copy and Focus Functions ---
window.copyAllMVPrompts = function (event) {
  if (!window.currentScenes || window.currentScenes.length === 0) {
    alert("복사할 프롬프트가 없습니다.");
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

    const enEl = document.getElementById(typeInfo.en);
    if (!enEl || !enEl.value.trim()) {
      alert(`${typeInfo.name} 영어 프롬프트가 없습니다.`);
      return;
    }

    const promptText = enEl.value.trim();
    await navigator.clipboard.writeText(promptText);

    let copyButton =
      event && event.target
        ? event.target.closest("button")
        : document.getElementById(typeInfo.btnId);

    if (copyButton) {
      if (!copyButton.dataset.originalHTML) {
        copyButton.dataset.originalHTML = copyButton.innerHTML;
      }
      copyButton.innerHTML = '<i class="fas fa-check"></i> 복사됨';
      copyButton.disabled = true;
      copyButton.classList.add("copied");
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
    const enEl = document.getElementById(typeInfo.en);
    if (!enEl || !enEl.value.trim()) {
      alert(typeInfo.name + " 영어 프롬프트가 없습니다.");
      return;
    }
    await navigator.clipboard.writeText(enEl.value.trim());
    var copyButton =
      event && event.target
        ? event.target.closest("button")
        : document.querySelector(
            '.copy-mv-overview-btn[data-type="' + type + '"]',
          );
    if (copyButton) {
      if (!copyButton.dataset.originalHTML)
        copyButton.dataset.originalHTML = copyButton.innerHTML;
      copyButton.innerHTML = '<i class="fas fa-check"></i> 복사됨';
      copyButton.disabled = true;
      copyButton.classList.add("copied");
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
    const enEl = document.getElementById(`scene_${sceneIndex}_en`);
    const koEl = document.getElementById(`scene_${sceneIndex}_ko`);

    if (!window.currentScenes || !window.currentScenes[sceneIndex]) {
      alert("저장할 씬 데이터를 찾을 수 없습니다.");
      return;
    }

    if (enEl) window.currentScenes[sceneIndex].prompt = enEl.value;
    if (koEl) window.currentScenes[sceneIndex].promptKo = koEl.value;

    if (typeof window.saveCurrentProject === "function") {
      window.saveCurrentProject(true);
    }

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ 씬 ${sceneIndex + 1} 프롬프트가 저장되었습니다.`,
      );
    }
  } catch (error) {
    console.error("씬 프롬프트 저장 오류:", error);
  }
};

// --- Restored Scene Prompt Regeneration Functions ---
window.regenerateScenePrompt = async function (sceneIndex) {
  try {
    if (!window.currentScenes || !window.currentScenes[sceneIndex]) {
      alert("재생성할 씬이 없습니다.");
      return;
    }

    const scene = window.currentScenes[sceneIndex];
    const finalLyrics =
      document.getElementById("finalLyrics")?.textContent ||
      document.getElementById("finalizedLyrics")?.value ||
      document.getElementById("sunoLyrics")?.value ||
      "";
    const stylePrompt =
      document.getElementById("finalizedStylePrompt")?.value ||
      document.getElementById("stylePrompt")?.value ||
      "";

    const geminiKey = window.getGeminiApiKey();
    if (geminiKey && geminiKey.startsWith("AIza")) {
      const cleanLyrics = extractLyricsOnly(finalLyrics);
      const prompt = `Generate a detailed Midjourney prompt for a music video scene based on:
Lyrics: "${scene.scene || cleanLyrics}"
Style: ${stylePrompt || "cinematic"}
Output: Pure English prompt only.`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 500 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse =
          data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const newPrompt = aiResponse.trim();

        if (newPrompt) {
          const sceneId = `scene_${sceneIndex}`;
          const enEl = document.getElementById(`${sceneId}_en`);
          if (enEl) {
            enEl.value = newPrompt;
            await window.syncScenePromptTranslation(sceneIndex, "en");
          }
        }
      }
    } else {
      const basicPrompt = `${scene.scene || "music scene"}, high quality, photorealistic, natural pose, detailed hands`;
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
      // 인라인 onclick 대신 이벤트 리스너 사용 (중복 방지 위해 초기화)
      container.onclick = null;
      container.addEventListener("click", function (e) {
        const tagBtn = e.target.closest(".tag-btn");
        if (tagBtn && !tagBtn.classList.contains("custom-tag-btn")) {
          e.preventDefault();
          e.stopPropagation();

          // active 클래스 토글
          tagBtn.classList.toggle("active");

          // 6단계 장소 유형 선택 시 설정 저장
          if (
            container.id === "mvLocationTags" &&
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
