// js/step1.js - Extracted Logic

function escapeGeneratedLyricsHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- Extracted insertDirectiveToLyrics ---
window.insertDirectiveToLyrics = function (directive) {
  try {
    const editedLyrics = document.getElementById("editedLyrics");
    let targetEl = null;

    // 현재 화면에 표시된(수정 컨텍스트에 맞는) textarea를 찾음
    if (editedLyrics && editedLyrics.offsetParent !== null) {
      targetEl = editedLyrics;
    } else {
      const originalLyrics = document.getElementById("originalLyrics");
      if (originalLyrics && originalLyrics.offsetParent !== null) {
        targetEl = originalLyrics;
      }
    }

    if (targetEl) {
      const cursorPos =
        typeof targetEl.selectionStart === "number"
          ? targetEl.selectionStart
          : targetEl.value.length;
      const textBefore = targetEl.value.substring(0, cursorPos);
      const textAfter = targetEl.value.substring(cursorPos);
      targetEl.value = textBefore + directive + "\n" + textAfter;
      targetEl.focus();
      targetEl.setSelectionRange(
        cursorPos + directive.length + 1,
        cursorPos + directive.length + 1,
      );
    }
  } catch (error) {
    console.error("❌ 지시어 삽입 오류:", error);
  }
};

// --- Extracted getSelectedTags ---
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

window.getSelectedTags = getSelectedTags;

// --- Extracted generateAILyrics ---
window.generateAILyrics = async function () {
  try {
    // 선택된 태그들 수집
    const selectedTags = {
      era: [],
      theme: [],
      perspective: [],
      time: [],
      special: [],
      region: [],
      genre: [],
      mood: [],
    };

    // 각 태그 컨테이너에서 선택된 태그 수집
    const tagContainers = {
      era: document.getElementById("eraTags"),
      theme: document.getElementById("themeTags"),
      perspective: document.getElementById("perspectiveTags"),
      time: document.getElementById("timeTags"),
      special: document.getElementById("specialTags"),
      region: document.getElementById("regionTags"),
      genre: document.getElementById("genreTags"),
      mood: document.getElementById("moodTags"),
    };

    Object.keys(tagContainers).forEach((key) => {
      const container = tagContainers[key];
      if (container) {
        const activeTags = container.querySelectorAll(".tag-btn.active");
        activeTags.forEach((btn) => {
          const value = btn.getAttribute("data-value");
          if (value && !btn.classList.contains("custom-tag-btn")) {
            selectedTags[key].push(value);
          }
        });
      }
    });

    // 추가 키워드
    const additionalKeywords =
      document.getElementById("additionalKeywords")?.value || "";

    // 가사 길이
    const lengthBtn = document.querySelector(".length-btn.active");
    const lyricsLength = lengthBtn ? lengthBtn.getAttribute("data-value") : "";

    // 참고 가사
    const referenceLyrics =
      document.getElementById("referenceLyrics")?.value || "";
    const referenceSongTitle =
      document.getElementById("referenceSongTitle")?.value || "";
    const referenceArtist =
      document.getElementById("referenceArtist")?.value || "";

    // 로딩 표시
    const aiGeneratedResults = document.getElementById("aiGeneratedResults");
    const aiLyricsLoading = document.getElementById("aiLyricsLoading");
    const aiLyricsOptions = document.getElementById("aiLyricsOptions");

    if (aiGeneratedResults) {
      aiGeneratedResults.style.display = "block";
    }
    if (aiLyricsLoading) {
      aiLyricsLoading.style.display = "block";
    }
    if (aiLyricsOptions) {
      aiLyricsOptions.style.display = "none";
    }

    // ChatGPT(OpenAI) API 키 확인 (공용 키 포함)
    const apiKey = (typeof window.getOpenAIApiKey === "function" ? window.getOpenAIApiKey() : localStorage.getItem("openai_api_key")) || "";

    if (!apiKey || !apiKey.startsWith("sk-")) {
      window.showToast(
        "ChatGPT API 키를 먼저 설정해주세요.\n\n설정 > API 설정에서 OpenAI API 키를 입력해주세요.", "info");
      if (aiGeneratedResults) aiGeneratedResults.style.display = "none";
      return;
    }

    // 태그 정보 문자열 생성
    let tagsInfo = "";
    if (selectedTags.era.length > 0)
      tagsInfo += `시대: ${selectedTags.era.join(", ")}\n`;
    if (selectedTags.theme.length > 0)
      tagsInfo += `테마/소재: ${selectedTags.theme.join(", ")}\n`;
    if (selectedTags.perspective.length > 0)
      tagsInfo += `화자 시점: ${selectedTags.perspective.join(", ")}\n`;
    if (selectedTags.time.length > 0)
      tagsInfo += `시간대: ${selectedTags.time.join(", ")}\n`;
    if (selectedTags.special.length > 0)
      tagsInfo += `특수 요소: ${selectedTags.special.join(", ")}\n`;
    if (selectedTags.region.length > 0)
      tagsInfo += `가사 지역: ${selectedTags.region.join(", ")}\n`;
    if (selectedTags.genre.length > 0)
      tagsInfo += `장르: ${selectedTags.genre.join(", ")}\n`;
    if (selectedTags.mood.length > 0)
      tagsInfo += `분위기: ${selectedTags.mood.join(", ")}\n`;
    if (additionalKeywords) tagsInfo += `추가 키워드: ${additionalKeywords}\n`;
    if (lyricsLength) {
      const lengthMap = {
        short: "150-200자",
        normal: "200-300자",
        long: "300-450자",
        "very-long": "450-600자",
      };
      tagsInfo += `가사 길이: ${lengthMap[lyricsLength] || lyricsLength}\n`;
    }

    // 참고 가사 정보
    let referenceInfo = "";
    if (referenceSongTitle || referenceArtist || referenceLyrics) {
      referenceInfo = "\n【참고 가사】\n";
      if (referenceSongTitle)
        referenceInfo += `참고 노래 제목: ${referenceSongTitle}\n`;
      if (referenceArtist)
        referenceInfo += `참고 아티스트: ${referenceArtist}\n`;
      if (referenceLyrics) referenceInfo += `참고 가사:\n${referenceLyrics}\n`;
      referenceInfo +=
        "\n위 참고 가사의 스타일과 구조를 참고하여 새로운 가사를 생성하세요.\n";
    }

    // 지침서 로드 (최신 상태로 항상 확인)
    console.log("📋 제작 지침서 검토 시작...");
    let guidelines =
      localStorage.getItem("musicCreatorGuidelines") ||
      localStorage.getItem("musicCreator_guidelines") ||
      "";
    const guidelinesLength = guidelines.length;
    const hasGuidelines = guidelines.trim().length > 0;

    if (hasGuidelines) {
      console.log(`✅ 제작 지침서 확인 완료 (길이: ${guidelinesLength}자)`);
      console.log(
        "📝 지침서 미리보기 (처음 200자):",
        guidelines.substring(0, 200) + "...",
      );
    } else {
      console.warn(
        "⚠️ 제작 지침서가 설정되지 않았습니다. 기본 지침을 적용합니다.",
      );
      console.log('💡 상단 메뉴의 "지침서" 버튼에서 지침서를 설정하세요.');
    }

    // AI 프롬프트 생성 (지침서 내용 포함)
    // ✅ prompt 변수 정의 (누락되었던 부분)
    const guidelinesSection = hasGuidelines
      ? `\n\n【제작 지침서】\n${guidelines}\n`
      : "";

    const prompt = `당신은 전문 작사가입니다. 아래 조건에 맞는 가사를 4가지 버전으로 작성해주세요.

【작성 조건】
${tagsInfo || "특별한 조건 없음"}
${referenceInfo}
${guidelinesSection}

【중요 지시사항 - 반드시 지킬 것!】
1. '제작 지침서'가 있다면 이를 **절대적으로 적극 준수**하세요 (작성 규칙, 금지어, 말투, 형식 등 어떠한 예외 없이 철저히 반영할 것).
2. 노래는 **최소 3절 구조** 이상으로 길고 완성도 있게 작성하세요. (예: [Intro] -> [Verse 1] -> [Chorus] -> [Verse 2] -> [Chorus] -> [Verse 3] -> [Bridge] -> [Chorus] -> [Outro] 등)
   - 지침서에 별도 언어 규칙이 있으면 그 규칙을 우선합니다.
   - 기본값: 한글 중심 가사, 영어는 후렴/강조/반복 훅 등 보조 표현으로만 사용하고 전체 단어의 약 20~30% 이내로 제한하세요.
   - 곡 제목은 title 필드에만 작성하고 content 가사 본문에는 절대 넣지 마세요.
3. **수노(Suno) 지시어(Directive) 작성 규칙**:
   - 모든 단락(섹션) 시작 시 반드시 지시어를 사용하세요.
   - **한 줄에는 반드시 하나의 지시어만 표기**하세요. 동일한 섹션에 여러 지시어가 필요한 경우 반드시 줄바꿈을 하여 각각 다른 줄에 작성하세요.
   - **절대 금지**: '[Intro] [Tempo: 72 BPM]' 처럼 한 줄에 여러 지시어를 나열하는 행위.
   - **올바른 방식**:
     [Intro]
     [Tempo: 72 BPM]
     [Instruments: acoustic guitar, warm strings]
   - 지시어는 최대한 **세밀하고 구체적으로** 작성하세요. 장르, 악기, 보컬 스타일, 효과, 템포 등을 적극 반영하세요. (예: '[Vocal: soft]', '[Final Fade: 4s slow fade]' 등)
   - 지시어 뒤에 가사가 올 때는 반드시 줄바꿈을 하여 가사와 분리하세요.
   - 대괄호 태그 구조 '[...]'를 정확하게 유지하세요.
4. 각 버전은 서로 다른 스타일, 시점 또는 분위기를 가지도록 창작하세요.
5. 모든 가사의 제목(title)은 반드시 "한글(English)" 형식을 엄격히 준수하세요. (예: "밤의 춤(Night Dance)", "기억의 조각(Pieces of Memory)")

【출력 형식】
반드시 아래 JSON 형식으로만 출력하세요 (다른 텍스트 없이):
{
  "lyrics": [
    {
      "title": "제목1",
      "content": "[Intro]\\n(가사 내용)\\n\\n[Verse 1]\\n(가사 내용)..."
    },
    {"title": "제목2", "content": "..."}
  ]
}`;

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
              "당신은 전문 작사가이자 음악 프로듀서입니다. 요청에 따라 반드시 유효한 JSON 형식으로만 응답하세요.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || `API 호출 오류: ${response.status}`,
      );
    }

    const data = await response.json();
    let result;

    try {
      // content가 문자열인 경우와 객체인 경우 모두 대응
      const content = data.choices[0].message.content;
      result = typeof content === "string" ? JSON.parse(content) : content;
    } catch (e) {
      console.warn("JSON 파싱 실패, 수동 파싱 시도:", e);
      result = {
        lyrics: window.parseJSONManually(data.choices[0].message.content),
      };
    }

    if (!result || !result.lyrics || !Array.isArray(result.lyrics)) {
      throw new Error("올바른 가사 형식을 생성하지 못했습니다.");
    }

    // 결과 저장 및 UI 표시
    window.generatedLyricsOptions = result.lyrics;

    if (aiLyricsLoading) aiLyricsLoading.style.display = "none";
    if (aiLyricsOptions) {
      // ✅ aiLyricsOptions 자체는 block으로만 표시 (innerHTML 초기화 금지 - h4, selectedLyricsEdit 등이 삭제됨)
      aiLyricsOptions.style.display = "block";

      // selectedLyricsEdit은 숨김 처리
      const selectedLyricsEditEl =
        document.getElementById("selectedLyricsEdit");
      if (selectedLyricsEditEl) selectedLyricsEditEl.style.display = "none";

      // ✅ 카드는 lyricsOptionsGrid에만 추가
      const lyricsOptionsGrid = document.getElementById("lyricsOptionsGrid");
      if (lyricsOptionsGrid) {
        lyricsOptionsGrid.innerHTML = ""; // 그리드만 초기화
        lyricsOptionsGrid.style.display = "grid";

        result.lyrics.forEach((option, index) => {
          const card = document.createElement("div");
          card.className = "lyrics-option-card";
          card.onclick = () => window.selectLyricsOption(index);
          const safeTitle = escapeGeneratedLyricsHtml(option.title || "제목 없음");
          const safePreview = escapeGeneratedLyricsHtml(
            (option.content || "").substring(0, 200),
          ).replace(/\n/g, "<br>");
          card.innerHTML = `
            <div class="lyrics-option-title">${safeTitle}</div>
            <div class="lyrics-option-preview">${safePreview}...</div>
          `;
          lyricsOptionsGrid.appendChild(card);
        });
      }
    }

    console.log("✅ 가사 생성 완료:", result.lyrics.length, "개 옵션");
  } catch (error) {
    console.error("❌ 가사 생성 오류:", error);
    window.showToast("가사 생성 중 오류가 발생했습니다:\n\n" + error.message, "error");
    const aiLyricsLoading = document.getElementById("aiLyricsLoading");
    if (aiLyricsLoading) aiLyricsLoading.style.display = "none";
  }
};

// --- Extracted selectLyricsLength ---
window.selectLyricsLength = function (length, button, event) {
  try {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // 같은 컨테이너의 다른 버튼들 해제
    const container = button.closest(".tag-container");
    if (container) {
      const otherButtons = container.querySelectorAll(".length-btn");
      otherButtons.forEach((btn) => {
        if (btn !== button) {
          btn.classList.remove("active");
        }
      });
    }

    // 현재 버튼 토글
    button.classList.toggle("active");

    console.log(
      "✅ 가사 길이 선택:",
      length,
      button.classList.contains("active") ? "선택" : "해제",
    );
  } catch (error) {
    console.error("❌ 가사 길이 선택 오류:", error);
  }
};

// --- Extracted generateStylePromptFromLyrics ---
window.generateStylePromptFromLyrics = function (lyrics, title = "") {
  try {
    const directives = [];
    const elements = [];

    // 가사에서 지시어 추출 (대괄호로 감싸진 부분)
    const directivePattern = /\[([^\]]+)\]/g;
    let match;

    while ((match = directivePattern.exec(lyrics)) !== null) {
      const directive = match[1].trim();

      // 섹션 마커는 제외 (Intro, Verse, Chorus 등)
      const sectionMarkers = [
        "Intro",
        "Verse",
        "Chorus",
        "Pre-Chorus",
        "Bridge",
        "Outro",
        "Hook",
        "Interlude",
        "Ad-lib",
        "Break",
        "Drop",
      ];
      const isSection = sectionMarkers.some(
        (marker) =>
          directive.toLowerCase() === marker.toLowerCase() ||
          directive.toLowerCase().startsWith(marker.toLowerCase() + " "),
      );

      if (!isSection && directive.includes(":")) {
        // 키: 값 형태의 지시어
        const [key, value] = directive.split(":").map((s) => s.trim());

        // 중복 방지 및 주요 스타일 요소 추출
        if (key && value) {
          switch (key.toLowerCase()) {
            case "tempo":
              if (!elements.some((e) => e.includes("BPM"))) {
                elements.push(value);
              }
              break;
            case "vocal":
            case "vocals":
              elements.push(value);
              break;
            case "instruments":
            case "instrument":
              elements.push(value);
              break;
            case "mood":
            case "mod":
              elements.push(value);
              break;
            case "breath":
            case "reverb":
            case "effect":
            case "sound effect":
              // 효과는 간단히 추가
              if (!elements.includes(value)) {
                elements.push(value);
              }
              break;
            case "volume":
              // 볼륨 지시어는 스타일에 추가
              elements.push(value);
              break;
            default:
              // 기타 지시어도 추가
              if (value.length < 50) {
                // 너무 긴 값은 제외
                elements.push(value);
              }
          }
        }
      }
    }

    // AI 생성 모드에서 선택된 태그들도 가져오기
    const selectedTags = [];

    // 장르
    const genreContainer = document.getElementById("genreTags");
    if (genreContainer) {
      const activeTags = genreContainer.querySelectorAll(".tag-btn.active");
      activeTags.forEach((tag) => {
        const tagText = tag.textContent.trim();
        if (tagText !== "+" && tagText !== "+ 직접 입력") {
          selectedTags.push(tagText);
        }
      });
    }

    // 분위기/감정
    const moodContainer = document.getElementById("moodTags");
    if (moodContainer) {
      const activeTags = moodContainer.querySelectorAll(".tag-btn.active");
      activeTags.forEach((tag) => {
        const tagText = tag.textContent.trim();
        if (tagText !== "+" && tagText !== "+ 직접 입력") {
          selectedTags.push(tagText);
        }
      });
    }

    // 중복 제거
    const uniqueElements = [...new Set([...selectedTags, ...elements])];

    // 스타일 프롬프트 생성
    let stylePrompt = "";

    if (uniqueElements.length > 0) {
      stylePrompt = uniqueElements.join(", ");
    }

    // 기본 품질 태그 추가
    const qualityTags = ["emotional", "studio quality"];
    const hasQuality = qualityTags.some((q) =>
      stylePrompt.toLowerCase().includes(q.toLowerCase()),
    );

    if (!hasQuality && stylePrompt) {
      // 이미 충분한 요소가 있으면 품질 태그는 생략
      if (uniqueElements.length < 5) {
        stylePrompt += ", emotional, studio quality";
      }
    }

    console.log("✅ 스타일 프롬프트 생성:", stylePrompt);
    return stylePrompt;
  } catch (error) {
    console.error("❌ 스타일 프롬프트 생성 오류:", error);
    return "";
  }
};

// --- Extracted confirmSelectedLyrics ---
window.confirmSelectedLyrics = async function () {
  try {
    const editedTitle = document.getElementById("editedTitle")?.value || "";
    const editedLyrics = document.getElementById("editedLyrics")?.value || "";

    if (!editedLyrics.trim()) {
      window.showToast("가사를 입력해주세요.", "info");
      return;
    }

    const confirmBtn = document.querySelector(
      'button[onclick="confirmSelectedLyrics()"]',
    );
    if (confirmBtn) {
      confirmBtn.dataset.originalText = confirmBtn.innerHTML;
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = "⏳ 수노 지시어 및 스타일 프롬프트 분석 중...";
    }

    // 곡 제목 업데이트
    const songTitleEl = document.getElementById("songTitle");
    if (songTitleEl && editedTitle) {
      songTitleEl.value = editedTitle;

      // UI 제목 즉시 업데이트
      const headerTitleEl = document.getElementById("songTitleText");
      if (headerTitleEl) headerTitleEl.textContent = editedTitle;

      const finalTitleEl = document.getElementById("finalTitleText");
      if (finalTitleEl) finalTitleEl.textContent = editedTitle;

      // 헤더 제목 컨테이너 노출
      const songTitleContainer = document.getElementById("currentSongTitle");
      if (songTitleContainer) songTitleContainer.style.display = "block";
    }

    const apiKey = (typeof window.getOpenAIApiKey === "function" ? window.getOpenAIApiKey() : localStorage.getItem("openai_api_key")) || "";
    let finalLyrics = editedLyrics;
    let finalStylePrompt = window.generateStylePromptFromLyrics(
      editedLyrics,
      editedTitle,
    );

    if (apiKey && apiKey.startsWith("sk-")) {
      try {
        const guidelines =
          localStorage.getItem("musicCreatorGuidelines") ||
          localStorage.getItem("musicCreator_guidelines") ||
          "";

        let tagsInfo = "";
        const tagKeys = [
          "era",
          "theme",
          "perspective",
          "time",
          "special",
          "region",
          "genre",
          "mood",
        ];
        tagKeys.forEach((k) => {
          const t = window.getSelectedTags
            ? window.getSelectedTags(k + "Tags")
            : [];
          if (t && t.length > 0) tagsInfo += `${k}: ${t.join(", ")}\n`;
        });
        const additionalKeywords =
          document.getElementById("additionalKeywords")?.value || "";
        if (additionalKeywords)
          tagsInfo += `추가 키워드: ${additionalKeywords}\n`;

        const guidelinesSection =
          guidelines.trim().length > 0
            ? `\n\n【제작 지침서】\n${guidelines}\n`
            : "";

        const prompt = `당신은 Suno AI 작곡 및 작사, 프롬프트 엔지니어링 전문가입니다.
사용자가 작성한 가사를 바탕으로 다음 두 가지를 수행하세요:
1. 전체 노래에 대한 수노용 스타일 프롬프트(Style Prompt)를 영문으로 작성하세요. 장르, 분위기, 악기 구성, 템포, 보컬 스타일, 오디오 품질 등을 120자 이내의 쉼표로 구분된 영문 키워드로 간결하게 작성하세요.
2. [Intro], [Verse], [Chorus], [Bridge], [Outro] 등 기존 구조를 유지하면서 곡의 흐름을 돕는 메타 지시어나 음악적 태그 ([Tempo: 72 BPM], [Vocal: soft], [Instruments: acoustic guitar], [Drop] 등)를 곡의 적절한 위치(섹션 사이나 시작 부분)에 세밀하게 추가하세요. 
가사의 원문 내용은 절대 훼손하지 마세요! 메타 태그만 가사 본문 중간에 추가/보강하는 것입니다.

【작성 조건】
${tagsInfo || "특별한 조건 없음"}
${guidelinesSection}

【원본 가사】
${editedLyrics}

【중요 지시사항 - 반드시 지킬 것!】
1. '제작 지침서'가 제공되었다면 지침서의 금지어, 작성 구조, 태그 방식 등을 최우선으로 따르세요.
2. 가사 본문은 한글 중심을 유지하고, 영어 표현은 지침서 기준에 맞는 보조 표현으로만 제한하세요.
3. 곡 제목은 가사 본문에 넣지 말고 전용 제목 필드에만 남기세요.
4. 응답은 오직 JSON 형식으로만 해야 합니다. 추가적인 설명 텍스트를 포함하지 마세요.
JSON 구조:
{
  "style_prompt": "스타일 프롬프트 내용 (영문, 120자 이내)",
  "lyrics": "세밀한 지시어가 적절히 추가된 전체 가사 내용 (줄바꿈 문자는 '\\\\n'을 사용하세요)"
}`;

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
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
                    "당신은 AI 가사 및 스타일 프롬프트 작성을 돕는 전문 시스템입니다. 오직 유효한 JSON 형식으로만 응답합니다.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.7,
              response_format: { type: "json_object" },
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0].message.content;
          const result =
            typeof content === "string" ? JSON.parse(content) : content;
          if (result && result.lyrics && result.style_prompt) {
            finalLyrics = result.lyrics;
            finalStylePrompt = result.style_prompt;
            console.log("✅ AI 지시어 추가 완료:", finalStylePrompt);
          }
        }
      } catch (e) {
        console.warn("AI 지시어 변환 실패, 수동 생성 적용:", e);
      }
    }

    // 가사 업데이트
    const originalLyricsEl = document.getElementById("originalLyrics");
    if (originalLyricsEl) {
      // 리터럴 \n 문자열이 포함된 경우 실제 줄바꿈으로 변환 (안전장치)
      if (typeof finalLyrics === "string") {
        finalLyrics = finalLyrics.replace(/\\n/g, "\n");
      }
      originalLyricsEl.value = finalLyrics;
    }

    // 스타일 프롬프트
    const manualStylePromptEl = document.getElementById("manualStylePrompt");
    if (manualStylePromptEl && finalStylePrompt) {
      manualStylePromptEl.value = finalStylePrompt;
    }

    // 버튼 상태 복구
    if (confirmBtn) {
      confirmBtn.innerHTML =
        confirmBtn.dataset.originalText || "✅ 이 가사로 확정";
      confirmBtn.disabled = false;
    }

    // AI 생성 결과 숨기기
    const aiGeneratedResults = document.getElementById("aiGeneratedResults");
    if (aiGeneratedResults) {
      aiGeneratedResults.style.display = "none";
    }

    // 직접 작성 모드로 전환
    if (typeof window.switchLyricsMode === "function") {
      window.switchLyricsMode("manual");
    }

    // 데이터 영구 저장 (자동 저장)
    if (typeof window.saveCurrentProject === "function") {
      window.saveCurrentProject();
      console.log("💾 확정된 가사 및 스타일 프롬프트 자동 저장 완료");
    }

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        "✅ 가사가 확정되었습니다! 수기로 내용을 수정한 후 '다음 단계로'를 클릭하세요.",
      );
    } else {
      window.showToast(
        "✅ 가사가 확정되었습니다! 수기로 내용을 수정한 후 '다음 단계로'를 클릭하세요.", "success");
    }

    console.log("✅ 가사 확정 완료");
  } catch (error) {
    console.error("❌ 가사 확정 오류:", error);
    window.showToast("가사 확정 중 오류가 발생했습니다:\n\n" + error.message, "error");
    const confirmBtn = document.querySelector(
      'button[onclick="confirmSelectedLyrics()"]',
    );
    if (confirmBtn) {
      confirmBtn.innerHTML = "✅ 이 가사로 확정";
      confirmBtn.disabled = false;
    }
  }
};

// --- Extracted parseJSONManually ---
function parseJSONManually(jsonString) {
  const lyrics = [];
  try {
    // "lyrics" 배열 찾기
    const lyricsMatch = jsonString.match(/"lyrics"\s*:\s*\[([\s\S]*?)\]/);
    if (!lyricsMatch) return lyrics;

    const lyricsContent = lyricsMatch[1];

    // 각 객체 추출
    const objectPattern = /\{[\s\S]*?"title"[\s\S]*?"content"[\s\S]*?\}/g;
    let match;
    let objectCount = 0;

    while (
      (match = objectPattern.exec(lyricsContent)) !== null &&
      objectCount < 4
    ) {
      const objStr = match[0];

      // title 추출
      const titleMatch = objStr.match(/"title"\s*:\s*"([^"]+)"/);
      const title = titleMatch
        ? titleMatch[1]
        : "AI 생성 곡 " + (objectCount + 1);

      // content 추출 (여러 줄 처리)
      const contentMatch = objStr.match(
        /"content"\s*:\s*"([\s\S]*?)"(?:\s*[,}])/,
      );
      let content = "";
      if (contentMatch && contentMatch[1]) {
        content = contentMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\\\/g, "\\")
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          // 줄 끝의 불필요한 백슬래시 제거
          .replace(/\\\s*\n/g, "\n")
          .replace(/\\\s*$/gm, "")
          // 연속된 줄바꿈 정리
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }

      if (title || content) {
        lyrics.push({ title, content });
        objectCount++;
      }
    }
  } catch (error) {
    console.error("수동 JSON 파싱 오류:", error);
  }

  return lyrics;
}

window.parseJSONManually = parseJSONManually;

// --- Extracted selectLyricsOption ---
window.selectLyricsOption = function (index) {
  try {
    if (
      !window.generatedLyricsOptions ||
      !window.generatedLyricsOptions[index]
    ) {
      window.showToast("선택할 가사를 찾을 수 없습니다.", "error");
      return;
    }

    const selectedLyric = window.generatedLyricsOptions[index];
    const selectedLyricsEdit = document.getElementById("selectedLyricsEdit");
    const aiLyricsOptions = document.getElementById("aiLyricsOptions");

    if (selectedLyricsEdit) {
      const editedTitle = document.getElementById("editedTitle");
      const editedLyrics = document.getElementById("editedLyrics");

      if (editedTitle) {
        editedTitle.value =
          selectedLyric.title ||
          document.getElementById("songTitle")?.value ||
          "";
      }
      if (editedLyrics) {
        // AI가 반환한 가사에 리터럴 \n 문자열이 포함된 경우 실제 줄바꿈으로 변환
        let lyricsContent = selectedLyric.content || "";
        if (typeof lyricsContent === "string") {
          lyricsContent = lyricsContent.replace(/\\n/g, "\n");
        }
        editedLyrics.value = lyricsContent;
      }

      selectedLyricsEdit.style.display = "block";
    }

    // ✅ 카드 강조는 lyricsOptionsGrid 기준으로 처리
    const lyricsGridEl = document.getElementById("lyricsOptionsGrid");
    if (lyricsGridEl) {
      const cards = lyricsGridEl.querySelectorAll(".lyrics-option-card");
      cards.forEach((card, idx) => {
        if (idx === index) {
          card.style.borderColor = "var(--accent)";
          card.style.boxShadow = "0 4px 12px rgba(139, 92, 246, 0.3)";
          card.style.transform = "scale(1.02)";
        } else {
          card.style.borderColor = "var(--border)";
          card.style.boxShadow = "none";
          card.style.transform = "";
        }
      });
    }

    // 선택된 가사 저장
    window.selectedLyricsIndex = index;

    console.log("✅ 가사 옵션 선택:", index);
  } catch (error) {
    console.error("❌ 가사 옵션 선택 오류:", error);
    window.showToast("가사 선택 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
};

// --- Extracted backToOptions ---
window.backToOptions = function () {
  const selectedLyricsEdit = document.getElementById("selectedLyricsEdit");
  if (selectedLyricsEdit) {
    selectedLyricsEdit.style.display = "none";
  }

  // 카드 강조 제거
  const lyricsGridEl2 = document.getElementById("lyricsOptionsGrid");
  if (lyricsGridEl2) {
    const cards = lyricsGridEl2.querySelectorAll(".lyrics-option-card");
    cards.forEach((card) => {
      card.style.borderColor = "var(--border)";
      card.style.boxShadow = "none";
    });
  }

  window.selectedLyricsIndex = null;
};

console.log("✅ step1.js 로드 완료");

// 실시간 제목 동기화 (Step 1 입력 시 헤더 및 Step 5 제목 업데이트)
(function () {
  const initSync = () => {
    const songTitleEl = document.getElementById("songTitle");
    const headerTitleEl = document.getElementById("songTitleText");
    const finalTitleEl = document.getElementById("finalTitleText");

    if (songTitleEl) {
      songTitleEl.addEventListener("input", (e) => {
        const newTitle = e.target.value.trim() || "제목 없음";
        if (headerTitleEl) headerTitleEl.textContent = newTitle;
        if (finalTitleEl) finalTitleEl.textContent = newTitle;

        // 첫 글자 입력 시 헤더 제목 컨테이너 노출
        const songTitleContainer = document.getElementById("currentSongTitle");
        if (songTitleContainer && newTitle !== "제목 없음") {
          songTitleContainer.style.display = "block";
        }
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSync);
  } else {
    initSync();
  }
})();
