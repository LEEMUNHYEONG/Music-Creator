// === MV Step 6: Prompt and scene review rendering ===
function getMVSceneTimelineLabel(scene, index) {
  const meta = [scene.emotion, scene.location]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" · ");
  const sceneText = scene.scene || scene.lyrics || `씬 ${index + 1}`;
  return {
    title: `씬 ${index + 1}`,
    time: scene.time || "",
    meta,
    sceneText,
  };
}

window.renderMVSceneTimelinePreview = function (scenesArg) {
  const scenes = Array.isArray(scenesArg) ? scenesArg : [];
  if (scenes.length === 0) return "";

  const items = scenes
    .map((scene, index) => {
      const label = getMVSceneTimelineLabel(scene || {}, index);
      return `
        <button
          type="button"
          class="mv-scene-timeline-item"
          data-scene-index="${index}"
          onclick="window.focusMVSceneCard(${index})"
          style="min-width: 170px; max-width: 220px; text-align: left; padding: 10px 12px; border: 1px solid var(--border); background: var(--bg-input); color: var(--text-primary); border-radius: 8px; cursor: pointer;"
          title="${label.sceneText.replace(/"/g, "&quot;")}"
          aria-label="${`${label.title} ${label.time} ${label.sceneText}`.replace(/"/g, "&quot;")}"
        >
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <strong style="font-size: 0.85rem; color: var(--text-primary);">${label.title}</strong>
            <span style="font-size: 0.75rem; color: var(--accent); white-space: nowrap;">${label.time}</span>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${label.sceneText}</div>
          ${label.meta ? `<div style="margin-top: 6px; font-size: 0.72rem; color: var(--text-secondary); opacity: 0.9; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${label.meta}</div>` : ""}
        </button>
      `;
    })
    .join("");

  return `
    <div class="mv-scene-timeline-preview" style="margin: 10px 0 20px 0;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px;">
        <h4 style="margin: 0; color: var(--text-primary); font-size: 0.95rem;">씬 타임라인</h4>
        <span style="color: var(--text-secondary); font-size: 0.8rem;">총 ${scenes.length}개 씬</span>
      </div>
      <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px;">
        ${items}
      </div>
    </div>
  `;
};

window.refreshMVSceneTimelinePreview = function () {
  const timelineEl =
    typeof document.querySelector === "function"
      ? document.querySelector(".mv-scene-timeline-preview")
      : null;
  if (
    !timelineEl ||
    typeof window.renderMVSceneTimelinePreview !== "function" ||
    !Array.isArray(window.currentScenes)
  ) {
    return false;
  }
  timelineEl.outerHTML = window.renderMVSceneTimelinePreview(window.currentScenes);
  return true;
};

window.focusMVSceneCard = function (sceneIndex) {
  const selectors = [
    `.mv-scene-overview-card[data-scene-index="${sceneIndex}"]`,
    `.mv-prompt-item[data-result-scene-index="${sceneIndex}"]`,
    `[data-result-scene-index="${sceneIndex}"]`,
  ];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof el.focus === "function") {
        el.focus({ preventScroll: true });
      }
      return;
    }
  }
};

function parseMVTimelineSeconds(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value || "").trim();
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);

  const parts = text.split(":").map((part) => part.trim());
  if (parts.length < 2 || parts.length > 3) return null;
  const numbers = parts.map(Number);
  if (numbers.some((part) => Number.isNaN(part) || part < 0)) return null;

  if (numbers.length === 2) {
    return numbers[0] * 60 + numbers[1];
  }
  return numbers[0] * 3600 + numbers[1] * 60 + numbers[2];
}

function formatMVTimelineSeconds(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function getMVSceneTimingParts(scene) {
  const timeText = String(scene?.time || "");
  const [startText = "", endText = ""] = timeText.split("-");
  const startSeconds =
    typeof scene?.startSeconds === "number"
      ? scene.startSeconds
      : parseMVTimelineSeconds(startText);
  const endSeconds =
    typeof scene?.endSeconds === "number"
      ? scene.endSeconds
      : parseMVTimelineSeconds(endText);

  return {
    startText:
      startSeconds !== null
        ? formatMVTimelineSeconds(startSeconds)
        : startText.trim(),
    endText:
      endSeconds !== null ? formatMVTimelineSeconds(endSeconds) : endText.trim(),
    startSeconds,
    endSeconds,
  };
}

function escapeMVAttribute(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeMVTextarea(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function looksLikeLyricLine(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  const words = text.split(/\s+/).filter(Boolean);
  const visualTerms =
    /(shot|camera|cinematic|lighting|background|foreground|composition|close-up|wide|dolly|pan|tilt|lens|bokeh|resolution|photorealistic|거리|하늘|조명|카메라|배경|구도|인물|장면|빛|클로즈업|와이드|달리|팬|렌즈|보케)/i;
  return words.length <= 24 && !visualTerms.test(text);
}

function getMVSceneLyricsText(scene) {
  const lyrics = String(scene?.lyrics || scene?.sourceLyrics || "").trim();
  if (lyrics) return lyrics;
  const sceneText = String(scene?.scene || "").trim();
  return looksLikeLyricLine(sceneText) ? sceneText : "";
}

function getPromptDescriptionSeed(scene) {
  const promptKo = String(scene?.promptKo || "").replace(/\/\*[\s\S]*?\*\//g, "").trim();
  const promptEn = String(scene?.prompt || scene?.promptEn || "")
    .replace(/\/\*\s*Scene\s+\d+\s*\*\//gi, "")
    .trim();
  return promptKo || promptEn;
}

function buildMVSceneVisualDescription(scene, index) {
  const existing =
    scene?.visualDescription ||
    scene?.description ||
    (scene?.scene && !looksLikeLyricLine(scene.scene) ? scene.scene : "");
  if (existing) return String(existing).trim();

  const promptSeed = getPromptDescriptionSeed(scene);
  if (promptSeed) {
    const firstSentence =
      promptSeed
        .split(/(?<=[.!?。！？])\s+/)
        .find((part) => part.trim().length > 20) || promptSeed;
    return firstSentence.replace(/\s+/g, " ").slice(0, 260).trim();
  }

  const parts = [
    scene?.location,
    scene?.characterAction,
    scene?.emotion,
    scene?.mood,
    scene?.lighting,
    scene?.cameraWork,
  ].filter((value) => String(value || "").trim());
  return parts.length ? parts.join(", ") : `씬 ${index + 1} 비주얼 장면`;
}

function getMVProductionGuidelinesText() {
  if (typeof localStorage === "undefined") return "";
  return String(
    localStorage.getItem("musicCreatorGuidelines") ||
      localStorage.getItem("musicCreator_guidelines") ||
      "",
  ).trim();
}

function getMVFinalStylePromptText() {
  if (typeof document === "undefined") return String(window.currentFinalStyle || "").trim();
  return String(
    document.getElementById("finalStyle")?.textContent ||
      document.getElementById("finalizedStyle")?.value ||
      document.getElementById("finalizedStylePrompt")?.value ||
      document.getElementById("intermediateStylePreview")?.textContent ||
      document.getElementById("stylePrompt")?.value ||
      window.currentFinalStyle ||
      "",
  ).trim();
}

function getMVProductionContextBlock() {
  const guidelines = getMVProductionGuidelinesText();
  const finalStyle = getMVFinalStylePromptText();
  return [
    guidelines
      ? `【뮤직모리 제작 지침서 - MV 프롬프트에도 반드시 반영】
${guidelines}`
      : "",
    finalStyle
      ? `【최종 스타일 프롬프트 - 음악 장르/보컬/악기/템포/질감 기준】
${finalStyle}`
      : "",
    `【MV 프롬프트 공통 준수 규칙】
- 제작 지침서가 있으면 금지어, 세계관, 톤, 인물 표현, 언어/표기 규칙을 MV 프롬프트에도 우선 적용하세요.
- 최종 스타일 프롬프트의 장르, 보컬 톤, 악기, 템포, 공간감, 감정 질감을 장면의 색감/조명/카메라/인물 동작에 시각적으로 변환하세요.
- 가사 구간은 그대로 보존하고, 장면 설명은 가사를 그대로 복사하지 말고 프롬프트 기반의 비주얼 설명으로 작성하세요.
- Midjourney/Runway용 영어 프롬프트는 순수 영어로, 한글 프롬프트는 자연스러운 한글로 작성하세요.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function updateMVSceneEditorNotice(index, messages) {
  const noticeEl = document.getElementById(`scene_editor_notice_${index}`);
  if (!noticeEl) return;
  const cleanMessages = Array.isArray(messages)
    ? messages.filter(Boolean)
    : [];
  noticeEl.textContent = cleanMessages.join(" ");
  if (typeof noticeEl.setAttribute === "function") {
    noticeEl.setAttribute("aria-hidden", cleanMessages.length ? "false" : "true");
  }
  if (noticeEl.style) {
    noticeEl.style.display = cleanMessages.length ? "block" : "none";
  }
}

function getMVSceneEditorSummaryText(scene, index) {
  const compact = getMVSceneCompactQualityInfo(scene, index);
  const compactSummary = [
    compact.statusText,
    `EN ${compact.promptWordCount}단어`,
    `메타 ${compact.metadataCount}/5`,
    compact.issueLabels.length
      ? `확인 ${compact.issueLabels.join(", ")}`
      : "품질 통과",
  ].join(" · ");
  const timing = getMVSceneTimingParts(scene);
  const metadataValues = [
    scene?.location,
    scene?.emotion,
    scene?.mood,
    scene?.lighting,
    scene?.cameraWork,
  ].map((value) => String(value || "").trim());
  const metadataCount = metadataValues.filter(Boolean).length;
  const duration =
    typeof scene?.durationSeconds === "number"
      ? scene.durationSeconds
      : timing.startSeconds !== null && timing.endSeconds !== null
        ? timing.endSeconds - timing.startSeconds
        : null;
  const timeSummary =
    duration !== null && duration >= 0
      ? `${timing.startText}-${timing.endText} / ${duration}초`
      : `${timing.startText || "시작 미정"}-${timing.endText || "종료 미정"}`;
  const enEl = document.getElementById(`scene_overview_${index}_en`);
  const koEl = document.getElementById(`scene_overview_${index}_ko`);
  const enPrompt = String(enEl?.value || scene?.prompt || "").trim();
  const koPrompt = String(koEl?.value || scene?.promptKo || "").trim();
  const lyrics = String(scene?.lyrics || "").trim();
  const promptQuality = getMVScenePromptQualityIssues(scene, index);
  const repeatedVisualPatternIndexes = Array.isArray(window.currentScenes)
    ? getMVRepeatedVisualPatternIndexes(window.currentScenes)
    : [];
  const missingCharacterKeywords = getMVMissingCharacterConsistencyKeywords(scene, index);
  const qualityNotes = [];
  if (promptQuality.missingLocation) qualityNotes.push("장소 없음");
  if (promptQuality.missingCamera) qualityNotes.push("카메라 없음");
  if (promptQuality.promptLength) {
    qualityNotes.push(`길이 확인 ${promptQuality.details.promptWordCount}단어`);
  }
  if (promptQuality.blockedTerms) {
    qualityNotes.push(`금지어 ${promptQuality.details.blockedTerms.join(", ")}`);
  }
  if (promptQuality.duplicatePrompt) {
    qualityNotes.push(`중복 ${promptQuality.details.repeatedExpressions.join(", ")}`);
  }
  if (repeatedVisualPatternIndexes.includes(index)) {
    qualityNotes.push("배경/구도/카메라 반복");
  }
  if (missingCharacterKeywords.length) {
    qualityNotes.push(`인물 키워드 누락 ${missingCharacterKeywords.join(", ")}`);
  }

  const summaryParts = [
    `저장/재생성 전 상태: ${timeSummary}`,
    `메타데이터 ${metadataCount}/5`,
    lyrics ? "가사 있음" : "가사 없음",
    enPrompt ? "EN 있음" : "EN 없음",
    koPrompt ? "KO 있음" : "KO 없음",
  ];
  if (qualityNotes.length) {
    summaryParts.push(`품질 확인: ${qualityNotes.join(" / ")}`);
  }
  if (
    window.currentMVSceneQualityFilter &&
    getMVSceneIssueIndexes(
      Array.isArray(window.currentScenes) ? window.currentScenes : [scene],
      window.currentMVSceneQualityFilter,
    ).includes(index)
  ) {
    summaryParts.push(
      `선택 필터: ${getMVSceneIssueLabel(window.currentMVSceneQualityFilter)} 확인`,
    );
  }
  return `${compactSummary} · ${summaryParts.join(" · ")}`;
}

function getMVSceneCompactQualityInfo(scene, index) {
  const timing = getMVSceneTimingParts(scene);
  const metadataCount = [
    scene?.location,
    scene?.emotion,
    scene?.mood,
    scene?.lighting,
    scene?.cameraWork,
  ].filter((value) => String(value || "").trim()).length;
  const enEl = document.getElementById(`scene_overview_${index}_en`);
  const koEl = document.getElementById(`scene_overview_${index}_ko`);
  const enPrompt = String(enEl?.value || scene?.prompt || "").trim();
  const koPrompt = String(koEl?.value || scene?.promptKo || "").trim();
  const promptQuality = getMVScenePromptQualityIssues(scene, index);
  const repeatedIndexes = Array.isArray(window.currentScenes)
    ? getMVRepeatedVisualPatternIndexes(window.currentScenes)
    : [];
  const missingCharacterKeywords = getMVMissingCharacterConsistencyKeywords(scene, index);
  const issueLabels = [];

  if (
    timing.startSeconds === null ||
    timing.endSeconds === null ||
    timing.endSeconds < timing.startSeconds
  ) {
    issueLabels.push("시간");
  }
  if (metadataCount === 0) issueLabels.push("메타");
  if (promptQuality.missingLocation) issueLabels.push("장소");
  if (promptQuality.missingCamera) issueLabels.push("카메라");
  if (!String(scene?.lyrics || "").trim()) issueLabels.push("가사");
  if (!enPrompt) issueLabels.push("EN");
  if (!koPrompt) issueLabels.push("KO");
  if (promptQuality.promptLength) issueLabels.push("길이");
  if (promptQuality.blockedTerms) issueLabels.push("금지어");
  if (promptQuality.duplicatePrompt) issueLabels.push("중복");
  if (repeatedIndexes.includes(index)) issueLabels.push("반복");
  if (missingCharacterKeywords.length) issueLabels.push("인물");

  return {
    status: issueLabels.length ? "review" : "ready",
    statusText: issueLabels.length ? `확인 필요 ${issueLabels.length}` : "준비 완료",
    metadataCount,
    promptWordCount: getMVPromptWordCount(enPrompt),
    issueLabels,
  };
}

function renderMVSceneQualityBadges(scene, index) {
  const info = getMVSceneCompactQualityInfo(scene, index);
  const statusStyle =
    info.status === "ready"
      ? "background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.35); color: var(--success);"
      : "background: rgba(245, 158, 11, 0.13); border-color: rgba(245, 158, 11, 0.42); color: #f59e0b;";
  const chip = (text, style = "") =>
    `<span style="display: inline-flex; align-items: center; min-height: 24px; padding: 3px 8px; border: 1px solid rgba(148, 163, 184, 0.28); border-radius: 999px; background: rgba(148, 163, 184, 0.08); color: var(--text-secondary); font-size: 0.74rem; font-weight: 700; white-space: nowrap; ${style}">${escapeMVTextarea(text)}</span>`;
  const issueChips = info.issueLabels
    .slice(0, 5)
    .map((label) =>
      chip(label, "background: rgba(245, 158, 11, 0.10); border-color: rgba(245, 158, 11, 0.30); color: #f59e0b;"),
    )
    .join("");

  return `
    <div class="mv-scene-quality-compact" id="scene_quality_compact_${index}" role="status" aria-live="polite" style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin: -2px 0 10px 0;">
      ${chip(info.statusText, statusStyle)}
      ${chip(`EN ${info.promptWordCount}단어`)}
      ${chip(`메타 ${info.metadataCount}/5`)}
      ${issueChips || chip("품질 통과", "background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.24); color: var(--success);")}
    </div>
  `;
}

function getMVSceneIssueLabel(issueType) {
  return (
    {
      invalidTime: "시간",
      missingMetadata: "메타데이터",
      missingLocation: "장소",
      missingCamera: "카메라",
      missingLyrics: "가사",
      missingEnPrompt: "EN",
      missingKoPrompt: "KO",
      promptLength: "프롬프트 길이",
      blockedTerms: "금지어",
      duplicatePrompt: "중복 표현",
      repeatedVisualPattern: "반복 패턴",
      characterConsistency: "인물 일관성",
      review: "확인 필요",
    }[issueType] || "확인 필요"
  );
}

function getMVPromptWordCount(promptText) {
  return String(promptText || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getMVRepeatedPromptExpressions(promptText) {
  const normalized = String(promptText || "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return [];

  const ignoredWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "into",
    "over",
    "under",
    "through",
    "around",
    "scene",
    "music",
    "video",
    "prompt",
    "cinematic",
    "composition",
    "quality",
    "resolution",
    "photorealistic",
    "professional",
    "photography",
    "motion",
    "dynamic",
    "camera",
    "movement",
    "sharp",
    "focus",
    "detailed",
    "lighting",
    "aspect",
    "ratio",
    "ultra",
    "high",
  ]);
  const words = normalized
    .split(" ")
    .filter((word) => word.length >= 4 && !ignoredWords.has(word));
  const counts = {};
  words.forEach((word) => {
    counts[word] = (counts[word] || 0) + 1;
  });

  return Object.entries(counts)
    .filter(([, count]) => count >= 5)
    .map(([word]) => word)
    .slice(0, 4);
}

function getMVBlockedPromptTerms(promptText) {
  const blockedTerms = [
    "watermark",
    "logo",
    "subtitle",
    "caption",
    "low quality",
    "blurry",
    "distorted",
    "deformed",
    "extra fingers",
    "bad anatomy",
  ];
  const text = String(promptText || "").toLowerCase();
  return blockedTerms.filter((term) => {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const allowedPrefix = new RegExp(`\\b(no|without|avoid)\\s+${escapedTerm}\\b`);
    const termPattern = new RegExp(`\\b${escapedTerm}\\b`);
    return termPattern.test(text) && !allowedPrefix.test(text);
  });
}

function getMVScenePromptQualityIssues(scene, index) {
  const getElementById =
    typeof document.getElementById === "function"
      ? document.getElementById.bind(document)
      : () => null;
  const enEl = getElementById(`scene_overview_${index}_en`);
  const koEl = getElementById(`scene_overview_${index}_ko`);
  const enPrompt = String(enEl?.value || scene?.prompt || "").trim();
  const koPrompt = String(koEl?.value || scene?.promptKo || "").trim();
  const promptWordCount = getMVPromptWordCount(enPrompt);
  const promptCharCount = enPrompt.length + koPrompt.length;
  const repeatedExpressions = getMVRepeatedPromptExpressions(enPrompt);
  const blockedTerms = getMVBlockedPromptTerms(`${enPrompt} ${koPrompt}`);

  return {
    missingLocation: !String(scene?.location || "").trim(),
    missingCamera: !String(scene?.cameraWork || "").trim(),
    promptLength:
      Boolean(enPrompt) &&
      (promptWordCount < 35 || promptWordCount > 180 || promptCharCount > 1800),
    blockedTerms: blockedTerms.length > 0,
    duplicatePrompt: repeatedExpressions.length > 0,
    details: {
      promptWordCount,
      repeatedExpressions,
      blockedTerms,
    },
  };
}

function normalizeMVVisualPatternValue(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMVSceneCompositionPattern(scene, index) {
  const getElementById =
    typeof document.getElementById === "function"
      ? document.getElementById.bind(document)
      : () => null;
  const enEl = getElementById(`scene_overview_${index}_en`);
  const prompt = normalizeMVVisualPatternValue(enEl?.value || scene?.prompt || "");
  const patterns = [
    ["extreme close-up", "extreme close-up"],
    ["close-up", "close-up"],
    ["medium close-up", "medium close-up"],
    ["medium shot", "medium shot"],
    ["wide shot", "wide shot"],
    ["long shot", "long shot"],
    ["overhead shot", "overhead shot"],
    ["low angle", "low angle"],
    ["high angle", "high angle"],
    ["profile shot", "profile shot"],
    ["centered composition", "centered composition"],
    ["symmetrical composition", "symmetrical composition"],
  ];
  const found = patterns.find(([keyword]) => prompt.includes(keyword));
  return found ? found[1] : "";
}

function getMVRepeatedVisualPatternIndexes(scenesArg) {
  const scenes = Array.isArray(scenesArg) ? scenesArg : [];
  if (scenes.length < 2) {
    return [];
  }

  const buckets = {};
  const addPattern = (type, value, index) => {
    const normalized = normalizeMVVisualPatternValue(value);
    if (!normalized) return;
    const key = `${type}:${normalized}`;
    if (!buckets[key]) {
      buckets[key] = { type, value: normalized, indexes: [] };
    }
    buckets[key].indexes.push(index);
  };

  scenes.forEach((scene, index) => {
    addPattern("background", scene?.location, index);
    addPattern("camera", scene?.cameraWork, index);
    addPattern("composition", getMVSceneCompositionPattern(scene, index), index);
  });

  const repeatedIndexes = new Set();
  const threshold = scenes.length <= 3 ? 2 : Math.ceil(scenes.length * 0.5);
  Object.values(buckets).forEach((bucket) => {
    const uniqueIndexes = [...new Set(bucket.indexes)];
    if (uniqueIndexes.length >= threshold) {
      uniqueIndexes.forEach((index) => repeatedIndexes.add(index));
    }
  });

  return [...repeatedIndexes].sort((a, b) => a - b);
}

function getMVCharacterConsistencyKeywords() {
  const getElementById =
    typeof document.getElementById === "function"
      ? document.getElementById.bind(document)
      : () => null;
  const characterCount = parseInt(getElementById("mvCharacterCount")?.value || "0", 10);
  const phrases = [];

  for (let i = 1; i <= characterCount; i += 1) {
    const appearance = String(getElementById(`mvCharacter${i}_appearance`)?.value || "");
    appearance
      .split(/[,;/\n]+/)
      .map((value) => normalizeMVVisualPatternValue(value))
      .filter((value) => value.length >= 3)
      .forEach((value) => phrases.push(value));
  }

  return [...new Set(phrases)].slice(0, 8);
}

function getMVMissingCharacterConsistencyKeywords(scene, index, keywordsArg) {
  const keywords = Array.isArray(keywordsArg)
    ? keywordsArg
    : getMVCharacterConsistencyKeywords();
  if (!keywords.length) return [];

  const getElementById =
    typeof document.getElementById === "function"
      ? document.getElementById.bind(document)
      : () => null;
  const enEl = getElementById(`scene_overview_${index}_en`);
  const koEl = getElementById(`scene_overview_${index}_ko`);
  const prompt = normalizeMVVisualPatternValue(
    [
      enEl?.value,
      koEl?.value,
      scene?.prompt,
      scene?.promptKo,
      scene?.characterAction,
    ].join(" "),
  );

  return keywords.filter((keyword) => {
    const words = keyword.split(" ").filter((word) => word.length > 1);
    if (!words.length) return false;
    return !words.every((word) => prompt.includes(word));
  });
}

function getMVSceneQualityStats(scenesArg) {
  const scenes = Array.isArray(scenesArg) ? scenesArg : [];
  const repeatedVisualPatternIndexes = getMVRepeatedVisualPatternIndexes(scenes);
  const characterKeywords = getMVCharacterConsistencyKeywords();
  const stats = {
    total: scenes.length,
    ready: 0,
    needsReview: 0,
    invalidTime: 0,
    missingMetadata: 0,
    missingLocation: 0,
    missingCamera: 0,
    missingLyrics: 0,
    missingEnPrompt: 0,
    missingKoPrompt: 0,
    promptLength: 0,
    blockedTerms: 0,
    duplicatePrompt: 0,
    repeatedVisualPattern: repeatedVisualPatternIndexes.length,
    characterConsistency: 0,
  };

  scenes.forEach((scene, index) => {
    const getElementById =
      typeof document.getElementById === "function"
        ? document.getElementById.bind(document)
        : () => null;
    const timing = getMVSceneTimingParts(scene);
    const hasValidTime =
      timing.startSeconds !== null &&
      timing.endSeconds !== null &&
      timing.endSeconds >= timing.startSeconds;
    const metadataCount = [
      scene?.location,
      scene?.emotion,
      scene?.mood,
      scene?.lighting,
      scene?.cameraWork,
    ].filter((value) => String(value || "").trim()).length;
    const enEl = getElementById(`scene_overview_${index}_en`);
    const koEl = getElementById(`scene_overview_${index}_ko`);
    const hasLyrics = Boolean(String(scene?.lyrics || "").trim());
    const hasEnPrompt = Boolean(String(enEl?.value || scene?.prompt || "").trim());
    const hasKoPrompt = Boolean(String(koEl?.value || scene?.promptKo || "").trim());
    const promptQuality = getMVScenePromptQualityIssues(scene, index);
    const hasRepeatedVisualPattern = repeatedVisualPatternIndexes.includes(index);
    const missingCharacterKeywords = getMVMissingCharacterConsistencyKeywords(
      scene,
      index,
      characterKeywords,
    );

    if (!hasValidTime) stats.invalidTime += 1;
    if (metadataCount === 0) stats.missingMetadata += 1;
    if (promptQuality.missingLocation) stats.missingLocation += 1;
    if (promptQuality.missingCamera) stats.missingCamera += 1;
    if (!hasLyrics) stats.missingLyrics += 1;
    if (!hasEnPrompt) stats.missingEnPrompt += 1;
    if (!hasKoPrompt) stats.missingKoPrompt += 1;
    if (promptQuality.promptLength) stats.promptLength += 1;
    if (promptQuality.blockedTerms) stats.blockedTerms += 1;
    if (promptQuality.duplicatePrompt) stats.duplicatePrompt += 1;
    if (missingCharacterKeywords.length) stats.characterConsistency += 1;

    if (
      hasValidTime &&
      metadataCount > 0 &&
      !promptQuality.missingLocation &&
      !promptQuality.missingCamera &&
      hasLyrics &&
      hasEnPrompt &&
      hasKoPrompt &&
      !promptQuality.promptLength &&
      !promptQuality.blockedTerms &&
      !promptQuality.duplicatePrompt &&
      !hasRepeatedVisualPattern &&
      missingCharacterKeywords.length === 0
    ) {
      stats.ready += 1;
    }
  });

  stats.needsReview = stats.total - stats.ready;
  return stats;
}

function getMVSceneReviewIndexes(scenesArg) {
  const scenes = Array.isArray(scenesArg) ? scenesArg : [];
  const repeatedVisualPatternIndexes = getMVRepeatedVisualPatternIndexes(scenes);
  const characterKeywords = getMVCharacterConsistencyKeywords();
  const getElementById =
    typeof document.getElementById === "function"
      ? document.getElementById.bind(document)
      : () => null;

  return scenes
    .map((scene, index) => {
      const timing = getMVSceneTimingParts(scene);
      const hasValidTime =
        timing.startSeconds !== null &&
        timing.endSeconds !== null &&
        timing.endSeconds >= timing.startSeconds;
      const hasMetadata = [
        scene?.location,
        scene?.emotion,
        scene?.mood,
        scene?.lighting,
        scene?.cameraWork,
      ].some((value) => String(value || "").trim());
      const enEl = getElementById(`scene_overview_${index}_en`);
      const koEl = getElementById(`scene_overview_${index}_ko`);
      const hasLyrics = Boolean(String(scene?.lyrics || "").trim());
      const hasEnPrompt = Boolean(String(enEl?.value || scene?.prompt || "").trim());
      const hasKoPrompt = Boolean(String(koEl?.value || scene?.promptKo || "").trim());
      const promptQuality = getMVScenePromptQualityIssues(scene, index);
      const hasRepeatedVisualPattern = repeatedVisualPatternIndexes.includes(index);
      const missingCharacterKeywords = getMVMissingCharacterConsistencyKeywords(
        scene,
        index,
        characterKeywords,
      );

      return hasValidTime &&
        hasMetadata &&
        !promptQuality.missingLocation &&
        !promptQuality.missingCamera &&
        hasLyrics &&
        hasEnPrompt &&
        hasKoPrompt &&
        !promptQuality.promptLength &&
        !promptQuality.blockedTerms &&
        !promptQuality.duplicatePrompt &&
        !hasRepeatedVisualPattern &&
        missingCharacterKeywords.length === 0
        ? null
        : index;
    })
    .filter((index) => index !== null);
}

function getMVSceneIssueIndexes(scenesArg, issueType) {
  const scenes = Array.isArray(scenesArg) ? scenesArg : [];
  const repeatedVisualPatternIndexes = getMVRepeatedVisualPatternIndexes(scenes);
  const characterKeywords = getMVCharacterConsistencyKeywords();
  const getElementById =
    typeof document.getElementById === "function"
      ? document.getElementById.bind(document)
      : () => null;

  return scenes
    .map((scene, index) => {
      const timing = getMVSceneTimingParts(scene);
      const hasValidTime =
        timing.startSeconds !== null &&
        timing.endSeconds !== null &&
        timing.endSeconds >= timing.startSeconds;
      const hasMetadata = [
        scene?.location,
        scene?.emotion,
        scene?.mood,
        scene?.lighting,
        scene?.cameraWork,
      ].some((value) => String(value || "").trim());
      const enEl = getElementById(`scene_overview_${index}_en`);
      const koEl = getElementById(`scene_overview_${index}_ko`);
      const hasLyrics = Boolean(String(scene?.lyrics || "").trim());
      const hasEnPrompt = Boolean(String(enEl?.value || scene?.prompt || "").trim());
      const hasKoPrompt = Boolean(String(koEl?.value || scene?.promptKo || "").trim());
      const promptQuality = getMVScenePromptQualityIssues(scene, index);
      const hasRepeatedVisualPattern = repeatedVisualPatternIndexes.includes(index);
      const missingCharacterKeywords = getMVMissingCharacterConsistencyKeywords(
        scene,
        index,
        characterKeywords,
      );

      const issueMap = {
        invalidTime: !hasValidTime,
        missingMetadata: !hasMetadata,
        missingLocation: promptQuality.missingLocation,
        missingCamera: promptQuality.missingCamera,
        missingLyrics: !hasLyrics,
        missingEnPrompt: !hasEnPrompt,
        missingKoPrompt: !hasKoPrompt,
        promptLength: promptQuality.promptLength,
        blockedTerms: promptQuality.blockedTerms,
        duplicatePrompt: promptQuality.duplicatePrompt,
        repeatedVisualPattern: hasRepeatedVisualPattern,
        characterConsistency: missingCharacterKeywords.length > 0,
        review:
          !hasValidTime ||
          !hasMetadata ||
          promptQuality.missingLocation ||
          promptQuality.missingCamera ||
          !hasLyrics ||
          !hasEnPrompt ||
          !hasKoPrompt ||
          promptQuality.promptLength ||
          promptQuality.blockedTerms ||
          promptQuality.duplicatePrompt ||
          hasRepeatedVisualPattern ||
          missingCharacterKeywords.length > 0,
      };
      return issueMap[issueType] ? index : null;
    })
    .filter((index) => index !== null);
}

function getMVSceneQualitySummaryText(scenesArg) {
  const stats = getMVSceneQualityStats(scenesArg);
  return [
    `전체 ${stats.total}개 씬`,
    `준비 완료 ${stats.ready}개`,
    `확인 필요 ${stats.needsReview}개`,
    `시간 확인 ${stats.invalidTime}개`,
    `메타데이터 없음 ${stats.missingMetadata}개`,
    `장소 없음 ${stats.missingLocation}개`,
    `카메라 없음 ${stats.missingCamera}개`,
    `가사 없음 ${stats.missingLyrics}개`,
    `EN 없음 ${stats.missingEnPrompt}개`,
    `KO 없음 ${stats.missingKoPrompt}개`,
    `길이 확인 ${stats.promptLength}개`,
    `금지어 ${stats.blockedTerms}개`,
    `중복 표현 ${stats.duplicatePrompt}개`,
    `반복 패턴 ${stats.repeatedVisualPattern}개`,
    `인물 누락 ${stats.characterConsistency}개`,
  ].join(" · ");
}

function getMVSceneQualityConfirmMessage(scenesArg) {
  const stats = getMVSceneQualityStats(scenesArg);
  if (!stats.needsReview) return "";
  return [
    `${stats.needsReview}개 씬에 확인 필요 항목이 남아 있습니다.`,
    `시간 확인 ${stats.invalidTime}개, 장소 없음 ${stats.missingLocation}개, 카메라 없음 ${stats.missingCamera}개, 가사 없음 ${stats.missingLyrics}개, EN 없음 ${stats.missingEnPrompt}개, KO 없음 ${stats.missingKoPrompt}개`,
    `프롬프트 길이 확인 ${stats.promptLength}개, 금지어 ${stats.blockedTerms}개, 중복 표현 ${stats.duplicatePrompt}개, 반복 패턴 ${stats.repeatedVisualPattern}개, 인물 누락 ${stats.characterConsistency}개`,
    "취소하면 첫 확인 필요 씬으로 이동합니다.",
    "이 상태로 확정하고 결과 화면으로 이동하려면 확인을 누르세요.",
  ].join("\n");
}

function renderMVSceneQualitySummary(scenesArg) {
  const stats = getMVSceneQualityStats(scenesArg);
  const filters = [
    ["invalidTime", "시간", stats.invalidTime],
    ["missingLocation", "장소", stats.missingLocation],
    ["missingCamera", "카메라", stats.missingCamera],
    ["missingLyrics", "가사", stats.missingLyrics],
    ["missingEnPrompt", "EN", stats.missingEnPrompt],
    ["missingKoPrompt", "KO", stats.missingKoPrompt],
    ["promptLength", "길이", stats.promptLength],
    ["blockedTerms", "금지어", stats.blockedTerms],
    ["duplicatePrompt", "중복", stats.duplicatePrompt],
    ["repeatedVisualPattern", "반복", stats.repeatedVisualPattern],
    ["characterConsistency", "인물", stats.characterConsistency],
  ];
  return `
    <div id="mv_scene_quality_summary" class="mv-scene-quality-summary" role="status" aria-live="polite" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 10px 0 18px 0; padding: 12px 14px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.24); border-radius: 8px; color: var(--text-secondary); font-size: 0.84rem; line-height: 1.5;">
      <span id="mv_scene_quality_summary_text">${getMVSceneQualitySummaryText(scenesArg)}</span>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        ${filters
          .map(
            ([key, label, count]) => `
              <button id="mv_scene_quality_filter_${key}" type="button" class="btn btn-small btn-secondary" onclick="window.focusMVSceneIssue('${key}')" ${count ? "" : "disabled"} style="padding: 6px 9px; font-size: 0.76rem;">
                ${label} ${count}
              </button>
            `,
          )
          .join("")}
        <button id="mv_scene_quality_focus_btn" type="button" class="btn btn-small btn-secondary" onclick="window.focusMVFirstReviewScene()" ${stats.needsReview ? "" : "disabled"} style="padding: 6px 10px; font-size: 0.78rem;">
          확인 필요 씬으로 이동
        </button>
        <button id="mv_scene_quality_review_only_btn" type="button" class="btn btn-small btn-secondary" onclick="window.toggleMVReviewOnlyScenes()" ${stats.needsReview ? "" : "disabled"} style="padding: 6px 10px; font-size: 0.78rem;">
          확인 필요만 보기
        </button>
        <span id="mv_scene_quality_review_only_status" style="align-self: center; color: var(--text-muted); font-size: 0.76rem; font-weight: 700;">
          전체 씬 표시
        </span>
      </div>
    </div>
  `;
}

function updateMVSceneQualitySummary() {
  const summaryEl = document.getElementById("mv_scene_quality_summary");
  if (!summaryEl || !Array.isArray(window.currentScenes)) return;
  const textEl = document.getElementById("mv_scene_quality_summary_text");
  const focusBtn = document.getElementById("mv_scene_quality_focus_btn");
  const reviewOnlyBtn = document.getElementById("mv_scene_quality_review_only_btn");
  const summaryText = getMVSceneQualitySummaryText(window.currentScenes);
  const stats = getMVSceneQualityStats(window.currentScenes);
  if (stats.needsReview === 0) {
    window.currentMVReviewOnlyMode = false;
  }
  if (textEl) {
    textEl.textContent = summaryText;
  } else {
    summaryEl.textContent = summaryText;
  }
  if (focusBtn) {
    focusBtn.disabled = stats.needsReview === 0;
  }
  if (reviewOnlyBtn) {
    reviewOnlyBtn.disabled = stats.needsReview === 0;
  }
  [
    ["invalidTime", stats.invalidTime],
    ["missingLocation", stats.missingLocation],
    ["missingCamera", stats.missingCamera],
    ["missingLyrics", stats.missingLyrics],
    ["missingEnPrompt", stats.missingEnPrompt],
    ["missingKoPrompt", stats.missingKoPrompt],
    ["promptLength", stats.promptLength],
    ["blockedTerms", stats.blockedTerms],
    ["duplicatePrompt", stats.duplicatePrompt],
    ["repeatedVisualPattern", stats.repeatedVisualPattern],
    ["characterConsistency", stats.characterConsistency],
  ].forEach(([key, count]) => {
    const btn = document.getElementById(`mv_scene_quality_filter_${key}`);
    if (btn) {
      btn.disabled = count === 0;
      btn.textContent =
        {
          invalidTime: "시간",
          missingLocation: "장소",
          missingCamera: "카메라",
          missingLyrics: "가사",
          missingEnPrompt: "EN",
          missingKoPrompt: "KO",
          promptLength: "길이",
          blockedTerms: "금지어",
          duplicatePrompt: "중복",
          repeatedVisualPattern: "반복",
          characterConsistency: "인물",
        }[key] + ` ${count}`;
    }
  });
  applyMVReviewOnlyVisibility();
}

function updateMVReviewOnlyControls(reviewCount) {
  const btn = document.getElementById("mv_scene_quality_review_only_btn");
  const statusEl = document.getElementById("mv_scene_quality_review_only_status");
  const isReviewOnly = Boolean(window.currentMVReviewOnlyMode);
  if (btn) {
    btn.disabled = reviewCount === 0;
    btn.textContent = isReviewOnly ? "전체 씬 보기" : "확인 필요만 보기";
  }
  if (statusEl) {
    statusEl.textContent = isReviewOnly
      ? `확인 필요 ${reviewCount}개 씬만 표시 중`
      : "전체 씬 표시";
  }
}

function applyMVReviewOnlyVisibility() {
  if (!Array.isArray(window.currentScenes)) return false;
  const reviewIndexes = getMVSceneReviewIndexes(window.currentScenes);
  const reviewIndexSet = new Set(reviewIndexes);
  if (!reviewIndexes.length) {
    window.currentMVReviewOnlyMode = false;
  }
  if (typeof document.querySelectorAll !== "function") {
    updateMVReviewOnlyControls(reviewIndexes.length);
    return false;
  }

  document.querySelectorAll(".mv-scene-overview-card").forEach((card) => {
    const index = Number(card?.dataset?.sceneIndex);
    const shouldHide =
      Boolean(window.currentMVReviewOnlyMode) &&
      Number.isInteger(index) &&
      !reviewIndexSet.has(index);
    if (card) {
      card.hidden = shouldHide;
    }
    if (card?.style) {
      card.style.display = shouldHide ? "none" : "";
    }
    if (card?.dataset) {
      if (shouldHide) {
        card.dataset.reviewOnlyHidden = "true";
      } else {
        delete card.dataset.reviewOnlyHidden;
      }
    }
  });

  updateMVReviewOnlyControls(reviewIndexes.length);
  return Boolean(window.currentMVReviewOnlyMode);
}

window.toggleMVReviewOnlyScenes = function () {
  if (!Array.isArray(window.currentScenes)) return false;
  const reviewIndexes = getMVSceneReviewIndexes(window.currentScenes);
  if (!reviewIndexes.length) {
    window.currentMVReviewOnlyMode = false;
    applyMVReviewOnlyVisibility();
    return false;
  }
  window.currentMVReviewOnlyMode = !window.currentMVReviewOnlyMode;
  if (window.currentMVReviewOnlyMode) {
    window.currentMVSceneQualityFilter = "review";
    highlightMVSceneIssueIndexes(reviewIndexes);
  }
  refreshMVSceneEditorSummaries();
  applyMVReviewOnlyVisibility();
  if (window.currentMVReviewOnlyMode && typeof window.focusMVSceneCard === "function") {
    window.focusMVSceneCard(reviewIndexes[0]);
  }
  return window.currentMVReviewOnlyMode;
};

function highlightMVSceneIssueIndexes(indexes) {
  if (typeof document.querySelectorAll !== "function") return;
  document.querySelectorAll(".mv-scene-overview-card").forEach((card) => {
    if (card?.style) {
      card.style.boxShadow = "";
      card.style.borderColor = "";
    }
    if (card?.dataset) {
      delete card.dataset.qualityHighlight;
    }
  });
  indexes.forEach((index) => {
    const card = document.querySelector(
      `.mv-scene-overview-card[data-scene-index="${index}"]`,
    );
    if (card?.style) {
      card.style.boxShadow = "0 0 0 2px rgba(245, 158, 11, 0.45)";
      card.style.borderColor = "rgba(245, 158, 11, 0.7)";
    }
    if (card?.dataset) {
      card.dataset.qualityHighlight = "true";
    }
  });
}

function refreshMVSceneEditorSummaries(indexes) {
  if (!Array.isArray(window.currentScenes)) return;
  const targetIndexes = Array.isArray(indexes)
    ? indexes
    : window.currentScenes.map((_, index) => index);
  targetIndexes.forEach((index) => {
    if (window.currentScenes[index]) {
      updateMVSceneEditorSummary(window.currentScenes[index], index);
    }
  });
}

window.focusMVFirstReviewScene = function () {
  if (!Array.isArray(window.currentScenes)) return false;
  const reviewIndexes = getMVSceneReviewIndexes(window.currentScenes);
  if (!reviewIndexes.length) return false;
  window.currentMVSceneQualityFilter = "review";
  highlightMVSceneIssueIndexes(reviewIndexes);
  refreshMVSceneEditorSummaries();
  if (typeof window.focusMVSceneCard === "function") {
    window.focusMVSceneCard(reviewIndexes[0]);
    return true;
  }
  return false;
};

window.focusMVSceneIssue = function (issueType) {
  if (!Array.isArray(window.currentScenes)) return false;
  const issueIndexes = getMVSceneIssueIndexes(window.currentScenes, issueType);
  if (!issueIndexes.length) return false;
  window.currentMVSceneQualityFilter = issueType;
  highlightMVSceneIssueIndexes(issueIndexes);
  refreshMVSceneEditorSummaries();
  if (typeof window.focusMVSceneCard === "function") {
    window.focusMVSceneCard(issueIndexes[0]);
    return true;
  }
  return false;
};

function renderMVSceneEditorSummary(scene, index) {
  return `
    <div id="scene_editor_summary_${index}" class="mv-scene-editor-summary" role="status" aria-live="polite" style="margin: -2px 0 15px 0; padding: 9px 12px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.22); border-radius: 6px; color: var(--text-secondary); font-size: 0.8rem; line-height: 1.45;">
      ${renderMVSceneQualityBadges(scene, index)}
      ${getMVSceneEditorSummaryText(scene, index)}
    </div>
  `;
}

function updateMVSceneEditorSummary(scene, index) {
  const summaryEl = document.getElementById(`scene_editor_summary_${index}`);
  if (!summaryEl) return;
  if ("innerHTML" in summaryEl) {
    summaryEl.innerHTML = `
      ${renderMVSceneQualityBadges(scene, index)}
      ${getMVSceneEditorSummaryText(scene, index)}
    `;
  } else {
    summaryEl.textContent = getMVSceneEditorSummaryText(scene, index);
  }
}

window.updateMVSceneTimelineFromEditor = function (scene, index) {
  if (!scene) return scene;

  const startEl = document.getElementById(`scene_time_start_${index}`);
  const endEl = document.getElementById(`scene_time_end_${index}`);
  const lyricsEl = document.getElementById(`scene_lyrics_${index}`);
  const descriptionEl =
    typeof document.querySelector === "function"
      ? document.querySelector(`.scene-description[data-index="${index}"]`)
      : null;
  const locationEl = document.getElementById(`scene_location_${index}`);
  const emotionEl = document.getElementById(`scene_emotion_${index}`);
  const moodEl = document.getElementById(`scene_mood_${index}`);
  const lightingEl = document.getElementById(`scene_lighting_${index}`);
  const cameraWorkEl = document.getElementById(`scene_camera_work_${index}`);
  const startSeconds = parseMVTimelineSeconds(startEl?.value);
  const endSeconds = parseMVTimelineSeconds(endEl?.value);
  const notices = [];

  if (
    startSeconds !== null &&
    endSeconds !== null &&
    endSeconds >= startSeconds
  ) {
    scene.startSeconds = startSeconds;
    scene.endSeconds = endSeconds;
    scene.durationSeconds = endSeconds - startSeconds;
    scene.time = `${formatMVTimelineSeconds(startSeconds)}-${formatMVTimelineSeconds(endSeconds)}`;
  } else if (startEl?.value || endEl?.value) {
    notices.push("종료 시간이 시작 시간보다 빠르거나 시간 형식이 올바르지 않아 기존 타임라인을 유지했습니다.");
  }

  if (lyricsEl) {
    scene.lyrics = lyricsEl.value;
  }
  if (descriptionEl) {
    scene.scene = descriptionEl.value;
    scene.visualDescription = descriptionEl.value;
  }
  if (locationEl) {
    scene.location = locationEl.value;
  }
  if (emotionEl) {
    scene.emotion = emotionEl.value;
  }
  if (moodEl) {
    scene.mood = moodEl.value;
  }
  if (lightingEl) {
    scene.lighting = lightingEl.value;
  }
  if (cameraWorkEl) {
    scene.cameraWork = cameraWorkEl.value;
  }

  const metadataValues = [
    scene.location,
    scene.emotion,
    scene.mood,
    scene.lighting,
    scene.cameraWork,
  ].map((value) => String(value || "").trim());
  if (metadataValues.every((value) => !value)) {
    notices.push("장소/감정/무드/조명/카메라 메타데이터가 비어 있습니다. 재생성 품질을 높이려면 최소 한 가지를 입력하세요.");
  }
  if (!String(scene.location || "").trim()) {
    notices.push("장소 값이 비어 있어 배경 일관성 점검에 표시됩니다.");
  }
  if (!String(scene.cameraWork || "").trim()) {
    notices.push("카메라 값이 비어 있어 영상 생성용 프롬프트 점검에 표시됩니다.");
  }
  updateMVSceneEditorNotice(index, notices);
  updateMVSceneEditorSummary(scene, index);
  updateMVSceneQualitySummary();

  return scene;
};

window.updateMVSceneEditorPreview = function (sceneIndex) {
  if (!window.currentScenes || !window.currentScenes[sceneIndex]) return;
  if (typeof window.updateMVSceneTimelineFromEditor === "function") {
    window.updateMVSceneTimelineFromEditor(
      window.currentScenes[sceneIndex],
      sceneIndex,
    );
  }
  if (typeof window.refreshMVSceneTimelinePreview === "function") {
    window.refreshMVSceneTimelinePreview();
  }
};

function getMVSceneRegenerationContext(scene, fallback = {}) {
  const location = String(scene?.location || fallback.location || "").trim();
  const emotion = String(scene?.emotion || "").trim();
  const mood = String(scene?.mood || fallback.mood || "").trim();
  const lighting = String(scene?.lighting || fallback.lighting || "").trim();
  const cameraWork = String(
    scene?.cameraWork || fallback.cameraWork || "",
  ).trim();
  const lyrics = String(scene?.lyrics || "").trim();

  return {
    location,
    emotion,
    mood,
    lighting,
    cameraWork,
    lyrics,
    promptLines: [
      location ? `- 씬 장소: ${location}` : "",
      emotion ? `- 씬 감정: ${emotion}` : "",
      mood ? `- 씬 무드: ${mood}` : "",
      lighting ? `- 씬 조명: ${lighting}` : "",
      cameraWork ? `- 씬 카메라: ${cameraWork}` : "",
      lyrics ? `- 씬 가사 구간: ${lyrics}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    promptParts: [location, emotion, mood, lighting, cameraWork]
      .filter(Boolean)
      .join(", "),
  };
}

// --- UI 렌더링 함수: MV 썸네일/배경/인물 프롬프트 표시 ---
window.renderMvThumbnailPromptsUI = function (prompts) {
  if (!prompts) return;
  const reviewContainer = document.getElementById("mvPromptsReviewContainer");
  if (!reviewContainer) return;

  // prompts 구조 보정 (m.mvPrompts는 {thumbnail: {en, ko}, ...} 형태임)
  const p = prompts;
  const thumbEn = p.thumbnailEn || p.thumbnail?.en || "";
  const thumbKo = p.thumbnailKo || p.thumbnail?.ko || "";
  const backEn = p.backgroundEn || p.background?.en || p.backgroundDetailEn || "";
  const backKo = p.backgroundKo || p.background?.ko || p.backgroundDetailKo || "";
  const charEn = p.characterEn || p.character?.en || p.characterDetailEn || "";
  const charKo = p.characterKo || p.character?.ko || p.characterDetailKo || "";

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
                        <button class="btn btn-small btn-success" onclick="window.copyReviewPrompt('review_thumbnail_en')" title="통합 영어 프롬프트 복사" style="padding: 4px 8px; font-size: 0.75rem;">
                            <i class="fas fa-copy"></i> 영어 프롬프트 복사
                        </button>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.75rem;">통합 프롬프트(EN)</label>
                        <textarea id="review_thumbnail_en" oninput="window.saveCurrentProject()" style="width: 100%; min-height: 80px; padding: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem; font-family: monospace; resize: vertical;">${thumbEn}</textarea>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.75rem;">한글 번역</label>
                        <textarea id="review_thumbnail_ko" oninput="window.saveCurrentProject()" style="width: 100%; min-height: 80px; padding: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-secondary); font-size: 0.85rem; resize: vertical;">${thumbKo}</textarea>
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
                        <button class="btn btn-small btn-success" onclick="window.copyReviewPrompt('review_background_en')" title="통합 영어 프롬프트 복사" style="padding: 4px 8px; font-size: 0.75rem;">
                            <i class="fas fa-copy"></i> 영어 프롬프트 복사
                        </button>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.75rem;">통합 프롬프트(EN)</label>
                        <textarea id="review_background_en" oninput="window.saveCurrentProject()" style="width: 100%; min-height: 80px; padding: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem; font-family: monospace; resize: vertical;">${backEn}</textarea>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.75rem;">한글 번역</label>
                        <textarea id="review_background_ko" oninput="window.saveCurrentProject()" style="width: 100%; min-height: 80px; padding: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-secondary); font-size: 0.85rem; resize: vertical;">${backKo}</textarea>
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
                        <button class="btn btn-small btn-success" onclick="window.copyReviewPrompt('review_character_en')" title="통합 영어 프롬프트 복사" style="padding: 4px 8px; font-size: 0.75rem;">
                            <i class="fas fa-copy"></i> 영어 프롬프트 복사
                        </button>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.75rem;">통합 프롬프트(EN)</label>
                        <textarea id="review_character_en" oninput="window.saveCurrentProject()" style="width: 100%; min-height: 80px; padding: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem; font-family: monospace; resize: vertical;">${charEn}</textarea>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.75rem;">한글 번역</label>
                        <textarea id="review_character_ko" oninput="window.saveCurrentProject()" style="width: 100%; min-height: 80px; padding: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-secondary); font-size: 0.85rem; resize: vertical;">${charKo}</textarea>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;
};

// app.js 호환을 위한 별칭 및 데이터 로드 지원 함수
window.renderMvPrompts = function () {
  const data = window.currentProject?.data || window.currentProject;
  if (!data) return;

  const m = data.marketing || {};
  const mvData =
    typeof window.getMarketingMVData === "function"
      ? window.getMarketingMVData(m)
      : {
          prompts: m.mvPrompts || {},
          scenes: m.mvScenes || [],
        };
  const prompts = mvData.prompts;
  
  // 1. 썸네일/배경/인물 프롬프트 UI 복원
  if (prompts && typeof window.renderMvThumbnailPromptsUI === "function") {
    window.renderMvThumbnailPromptsUI(prompts);
  }

  // 2. 씬별 개별 프롬프트 UI 복원
  const scenes = mvData.scenes;
  if (scenes && Array.isArray(scenes) && scenes.length > 0) {
    window.currentScenes = scenes;
    
    // 편집기(Overview) 렌더링
    if (typeof window.renderSceneOverview === "function") {
      window.renderSceneOverview(scenes);
    }
    
    // 결과창(Results) 렌더링 (Silent 모드로 호출하여 화면 이동 방지)
    if (typeof window.confirmSceneOverviewAndGenerate === "function") {
      window.confirmSceneOverviewAndGenerate(true);
    }
  }
};

// --- UI 렌더링 함수: MV 씬별 프롬프트 목록 표시 ---
window.renderSceneOverview = function (scenesArg) {
  const scenes = scenesArg || window.currentScenes;
  if (!scenes || !Array.isArray(scenes) || scenes.length === 0) return;
  window.currentScenes = scenes;

  const container = document.getElementById("mvSceneOverviewContainer");
  if (!container) return;

  let html = `
    <div style="margin: 10px 0 30px 0; padding: 15px; background: var(--bg-card); border-radius: 8px; border-left: 4px solid var(--accent);">
        <h3 style="margin: 0 0 10px 0; color: var(--text-primary); font-size: 1.1rem;">
            <i class="fas fa-film"></i> 씬별 세부 프롬프트 수정
        </h3>
        <p style="margin: 0; color: var(--text-secondary); font-size: 0.85rem;">각 씬의 이미지 및 비디오 통합 프롬프트를 세부적으로 수정할 수 있습니다.</p>
    </div>
    ${renderMVSceneQualitySummary(scenes)}
    ${typeof window.renderMVSceneTimelinePreview === "function" ? window.renderMVSceneTimelinePreview(scenes) : ""}
  `;

  scenes.forEach((scene, index) => {
    const sceneDescriptionText = buildMVSceneVisualDescription(scene, index);
    const sceneLyricsText = getMVSceneLyricsText(scene);
    scene.scene = sceneDescriptionText;
    scene.lyrics = sceneLyricsText;
    let existingPrompt = scene.prompt || "";
    if (typeof window.cleanEnglishMidjourneyPrompt === "function") {
      existingPrompt = window.cleanEnglishMidjourneyPrompt(existingPrompt);
    }
    existingPrompt = existingPrompt.replace(/\/\*\s*Scene\s+\d+\s*\*\//gi, "").trim();
    if (existingPrompt && !existingPrompt.startsWith("/* Scene")) {
      existingPrompt = `/* Scene ${index + 1} */ ${existingPrompt}`;
    }
    let existingPromptKo = scene.promptKo || "";
    if (typeof window.cleanMidjourneyPrompt === "function") {
      existingPromptKo = window.cleanMidjourneyPrompt(existingPromptKo);
    }
    const timing = getMVSceneTimingParts(scene);

    html += `
                <div class="mv-scene-overview-card" style="margin-bottom: 20px; padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border);" data-scene-index="${index}" tabindex="-1" aria-labelledby="scene_overview_title_${index}">
                    <div class="mv-scene-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <h4 id="scene_overview_title_${index}" style="margin: 0; color: var(--text-primary);">씬 ${index + 1}</h4>
                            <span style="color: var(--accent); font-weight: 600;">${scene.time}</span>
                            ${scene._isFilled ? `<span style="background: #e67e22; color: white; font-size: 0.7rem; padding: 2px 8px; border-radius: 12px; font-weight: 700;">⚠ 자동보충 (재생성 권장)</span>` : ""}
                        </div>
                        <div class="mv-scene-card-actions" style="display: flex; gap: 8px;">
                            <button class="btn btn-small btn-primary" onclick="regenerateSceneOverviewPrompt(${index})" title="이 씬의 프롬프트 재생성" style="padding: 6px 12px; font-size: 0.8rem;">
                                <i class="fas fa-sync-alt"></i> 재생성
                            </button>
                            <button id="editSceneOverviewBtn_${index}" class="btn btn-small btn-secondary" onclick="editSceneOverview(${index}, this)" title="씬 수정" style="padding: 6px 12px; font-size: 0.8rem;" data-state="edit" data-original-en="${existingPrompt.replace(/"/g, "&quot;")}">
                                <i class="fas fa-edit"></i> 수정
                            </button>
                            <button id="copySceneOverviewBtn_${index}" class="btn btn-small btn-success" onclick="copySceneOverviewPromptEn(${index}, event)" title="영어 프롬프트 복사" style="padding: 6px 12px; font-size: 0.8rem;">
                                <i class="fas fa-copy"></i> 영어 복사
                            </button>
                        </div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">📝 장면 설명:</label>
                        <textarea class="scene-description" data-index="${index}" style="width: 100%; min-height: 80px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.9rem; resize: vertical;">${escapeMVTextarea(sceneDescriptionText)}</textarea>
                    </div>
                    <div class="mv-scene-timing-editor-grid" style="display: grid; grid-template-columns: minmax(120px, 160px) minmax(120px, 160px) 1fr; gap: 12px; margin-bottom: 15px; align-items: end;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">시작 시간</label>
                            <input id="scene_time_start_${index}" class="scene-time-start" data-index="${index}" value="${timing.startText}" placeholder="0:00" aria-describedby="scene_editor_notice_${index}" style="width: 100%; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.9rem;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">종료 시간</label>
                            <input id="scene_time_end_${index}" class="scene-time-end" data-index="${index}" value="${timing.endText}" placeholder="0:08" aria-describedby="scene_editor_notice_${index}" style="width: 100%; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.9rem;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">가사 구간</label>
                            <textarea id="scene_lyrics_${index}" class="scene-lyrics" data-index="${index}" aria-describedby="scene_editor_notice_${index}" style="width: 100%; min-height: 52px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem; resize: vertical;">${escapeMVTextarea(sceneLyricsText)}</textarea>
                        </div>
                    </div>
                    <div class="mv-scene-metadata-editor-grid" style="display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)); gap: 12px; margin-bottom: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">장소</label>
                            <input id="scene_location_${index}" class="scene-location" data-index="${index}" value="${escapeMVAttribute(scene.location)}" placeholder="rainy alley" aria-describedby="scene_editor_notice_${index}" style="width: 100%; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">감정</label>
                            <input id="scene_emotion_${index}" class="scene-emotion" data-index="${index}" value="${escapeMVAttribute(scene.emotion)}" placeholder="hopeful" aria-describedby="scene_editor_notice_${index}" style="width: 100%; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">무드</label>
                            <input id="scene_mood_${index}" class="scene-mood" data-index="${index}" value="${escapeMVAttribute(scene.mood)}" placeholder="warm sunrise optimism" aria-describedby="scene_editor_notice_${index}" style="width: 100%; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">조명</label>
                            <input id="scene_lighting_${index}" class="scene-lighting" data-index="${index}" value="${escapeMVAttribute(scene.lighting)}" placeholder="blue-hour side light" aria-describedby="scene_editor_notice_${index}" style="width: 100%; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">카메라</label>
                            <input id="scene_camera_work_${index}" class="scene-camera-work" data-index="${index}" value="${escapeMVAttribute(scene.cameraWork)}" placeholder="slow dolly-in" aria-describedby="scene_editor_notice_${index}" style="width: 100%; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem;">
                        </div>
                    </div>
                    <div id="scene_editor_notice_${index}" class="mv-scene-editor-notice" role="status" aria-live="polite" aria-hidden="true" style="display: none; margin: -4px 0 15px 0; padding: 10px 12px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 6px; color: var(--text-primary); font-size: 0.82rem; line-height: 1.5;"></div>
                    ${renderMVSceneEditorSummary(scene, index)}

                    <div class="mv-scene-prompt-editor-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">⛵ 통합 프롬프트 (EN):</label>
                            <textarea id="scene_overview_${index}_en" class="scene-overview-en" data-index="${index}" style="width: 100%; min-height: 100px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem; font-family: monospace; resize: vertical;">${existingPrompt}</textarea>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">⛵ 통합 프롬프트 (한글):</label>
                            <textarea id="scene_overview_${index}_ko" class="scene-overview-ko" data-index="${index}" style="width: 100%; min-height: 100px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-secondary); font-size: 0.85rem; resize: vertical;">${existingPromptKo}</textarea>
                        </div>
                    </div>
                </div>
            `;
  });

  container.innerHTML = html;
  applyMVReviewOnlyVisibility();

  // 번역 미비 사항 보완 로직은 필요에 따라 별도 호출
  if (typeof container.querySelectorAll === "function") {
    const previewFields = container.querySelectorAll(
      [
        ".scene-time-start",
        ".scene-time-end",
        ".scene-description",
        ".scene-lyrics",
        ".scene-location",
        ".scene-emotion",
        ".scene-mood",
        ".scene-lighting",
        ".scene-camera-work",
      ].join(","),
    );
    previewFields.forEach((field) => {
      const syncTimelinePreview = (event) => {
        const index = Number(event.target?.dataset?.index);
        if (!Number.isInteger(index)) return;
        if (typeof window.updateMVSceneEditorPreview === "function") {
          window.updateMVSceneEditorPreview(index);
        }
      };
      field.addEventListener("input", syncTimelinePreview);
      field.addEventListener("change", syncTimelinePreview);
    });

    const summaryFields = container.querySelectorAll(
      ".scene-overview-en,.scene-overview-ko",
    );
    summaryFields.forEach((field) => {
      const syncEditorSummary = (event) => {
        const index = Number(event.target?.dataset?.index);
        if (!Number.isInteger(index) || !window.currentScenes?.[index]) return;
        updateMVSceneEditorSummary(window.currentScenes[index], index);
        updateMVSceneQualitySummary();
      };
      field.addEventListener("input", syncEditorSummary);
      field.addEventListener("change", syncEditorSummary);
    });
  }
  
  // 영어 프롬프트 직접 수정 시 자동 번역 이벤트 추가 (Debounce 적용)
  const enTextareas = container.querySelectorAll('.scene-overview-en');
  enTextareas.forEach(ta => {
    let timeoutId;
    ta.addEventListener('input', function(e) {
      clearTimeout(timeoutId);
      const index = e.target.dataset.index;
      const currentEn = e.target.value.trim();
      const koEl = document.getElementById(`scene_overview_${index}_ko`);
      
      timeoutId = setTimeout(async () => {
        if (!currentEn) {
          if (koEl) koEl.value = "";
          return;
        }
        
        if (koEl) {
           koEl.dataset.originalPlaceholder = koEl.placeholder || "";
           koEl.placeholder = "번역 중...";
        }
        
        try {
          if (typeof window.translateEnglishToKoreanForScene === "function") {
            const translatedKo = await window.translateEnglishToKoreanForScene("prompt", currentEn);
            if (translatedKo && koEl) {
              koEl.value = translatedKo;
              if (window.currentScenes && window.currentScenes[index]) {
                window.currentScenes[index].prompt = currentEn;
                window.currentScenes[index].promptKo = translatedKo;
                updateMVSceneEditorSummary(window.currentScenes[index], index);
                updateMVSceneQualitySummary();
              }
            }
          }
        } catch (error) {
          console.error("자동 번역 오류:", error);
        } finally {
          if (koEl) koEl.placeholder = koEl.dataset.originalPlaceholder || "";
        }
      }, 1500); // 1.5초 후 번역 (타이핑 중 잦은 API 호출 방지)
    });
  });
};

