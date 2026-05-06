// js/step6.js - MV Step 6 Logic
//
// Section map:
// 1. Core utilities
// 2. Prompt and scene review rendering
// 3. MV generation flows
// 4. Location, settings, and character helpers
// 5. Prompt persistence and export
// 6. SRT export and preview
// 7. Translation, regeneration, copy, and tag actions

// === MV Step 6: Core utilities ===
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
      const parts = cleanStr.split("```");
      for (const part of parts) {
        const trimmedPart = part.trim();
        if (
          (trimmedPart.startsWith("{") && trimmedPart.includes("}")) ||
          (trimmedPart.startsWith("[") && trimmedPart.includes("]"))
        ) {
          cleanStr = trimmedPart;
          break;
        } else if (trimmedPart.startsWith("json")) {
          const jsonContent = trimmedPart.substring(4).trim();
          if (jsonContent.startsWith("{") || jsonContent.startsWith("[")) {
            cleanStr = jsonContent;
            break;
          }
        }
      }
    }

    // JSON 시작 지점 찾기
    const firstBrace = cleanStr.indexOf("{");
    const firstBracket = cleanStr.indexOf("[");
    let start = -1;
    if (firstBrace !== -1 && firstBracket !== -1)
      start = Math.min(firstBrace, firstBracket);
    else if (firstBrace !== -1) start = firstBrace;
    else if (firstBracket !== -1) start = firstBracket;

    if (start !== -1) {
      cleanStr = cleanStr.substring(start);
      const lastBrace = cleanStr.lastIndexOf("}");
      const lastBracket = cleanStr.lastIndexOf("]");
      const end = Math.max(lastBrace, lastBracket);

      if (end !== -1) {
        cleanStr = cleanStr.substring(0, end + 1);
      } else {
        // ⚠️ 닫는 괄호가 없는 경우 (응답 절단) 복구 시도
        console.warn("⚠️ JSON 응답이 잘린 것으로 보임. 복구 시도 중...");
        if (cleanStr.startsWith("[")) cleanStr += "]";
        else if (cleanStr.startsWith("{")) cleanStr += "}";
      }
    }

    try {
      return JSON.parse(cleanStr);
    } catch (e) {
      // ⚠️ 응답 절단으로 인해 파싱 실패 시, 마지막 온전한 객체까지만 살리기
      if (cleanStr.startsWith("[") && !cleanStr.endsWith("]")) {
        const lastValidObjectEnd = cleanStr.lastIndexOf("}");
        if (lastValidObjectEnd !== -1) {
          console.warn(
            "⚠️ 절단된 JSON 발견. 마지막 온전한 객체 지점까지 복구 시도.",
          );
          cleanStr = cleanStr.substring(0, lastValidObjectEnd + 1) + "]";
          try {
            return JSON.parse(cleanStr);
          } catch (innerE) {
            // 복구 시도 후에도 실패하면 아래 catch 블록으로 넘김
          }
        }
      }
      throw e;
    }
  } catch (e) {
    console.warn("⚠️ JSON 파싱 1차 실패, 심층 복구 시도:", e);
    try {
      // 제어 문자 제거
      let fixedStr = str.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      
      let candidate = "";
      const firstBrace = fixedStr.indexOf('{');
      const firstBracket = fixedStr.indexOf('[');
      let startIndex = -1;
      
      if (firstBrace !== -1 && firstBracket !== -1) {
        startIndex = Math.min(firstBrace, firstBracket);
      } else if (firstBrace !== -1) {
        startIndex = firstBrace;
      } else if (firstBracket !== -1) {
        startIndex = firstBracket;
      }

      if (startIndex !== -1) {
        candidate = fixedStr.substring(startIndex);
        
        // 1. 따옴표 짝 맞추기 (문자열 절단 복구)
        const unescapedQuotes = candidate.replace(/\\"/g, "").match(/"/g);
        if (unescapedQuotes && unescapedQuotes.length % 2 !== 0) {
          candidate += '"';
        }

        // 2. 괄호 짝 맞추기
        const openBraces = (candidate.match(/\{/g) || []).length;
        const closeBraces = (candidate.match(/\}/g) || []).length;
        const openBrackets = (candidate.match(/\[/g) || []).length;
        const closeBrackets = (candidate.match(/\]/g) || []).length;

        if (openBrackets > closeBrackets)
          candidate += "]".repeat(openBrackets - closeBrackets);
        if (openBraces > closeBraces)
          candidate += "}".repeat(openBraces - closeBraces);

        return JSON.parse(candidate);
      }
    } catch (e2) {
      console.error("❌ JSON 최종 파싱 실패:", e2);
    }
    return fallback;
  }
}

/**
 * 씬의 감정(emotion)에 따라 Midjourney 스타일 키워드를 동적으로 반환합니다.
 * 고정된 기술 키워드 대신 감정에 맞는 색채·질감·광학 키워드를 조합하여
 * 더 감각적이고 예술적인 이미지를 유도합니다.
 */
function getArtisticKeywords(emotion) {
  const emotionStyleMap = {
    nostalgic: "soft focus, fine film grain, warm golden palette, golden hour glow, Kodak Portra 400 aesthetic, gentle lens flare, 8k ultra detail",
    sad: "desaturated cool tones, shallow depth of field, rain-washed atmosphere, melancholic blue hour, muted colors, cinematic grain, 8k ultra detail",
    melancholic: "low-key lighting, subtle vignette, cold desaturated palette, overcast diffused light, wabi-sabi texture, 8k ultra detail",
    joyful: "vibrant saturated colors, dynamic lens flare, golden warm light, energetic composition, brilliant highlights, crystal clarity, 8k ultra detail",
    happy: "bright natural lighting, vivid color palette, sun-drenched warmth, cheerful composition, soft bokeh, pristine detail, 8k ultra detail",
    romantic: "rich bokeh background, warm amber and rose tones, soft candlelight diffusion, intimate close framing, silk-like skin tones, 8k ultra detail",
    intense: "high contrast chiaroscuro, dramatic angular shadows, bold complementary color grading, anamorphic lens flare, visceral detail, 8k ultra detail",
    angry: "harsh directional lighting, deep crimson accents, gritty texture, stark contrast, aggressive composition, raw intensity, 8k ultra detail",
    peaceful: "pastel watercolor palette, even soft lighting, harmonious symmetry, gentle shadows, ethereal calm atmosphere, serene clarity, 8k ultra detail",
    mysterious: "volumetric fog, dramatic silhouette rim lighting, deep teal and amber grade, noir atmosphere, enigmatic depth, 8k ultra detail",
    dreamy: "ethereal prismatic glow, soft iridescent pastels, double exposure layering, dreamlike gaussian haze, otherworldly luminance, 8k ultra detail",
    hopeful: "warm sunrise gradient, ascending golden rays, soft lens bloom, uplifting composition, luminous highlights, 8k ultra detail",
    lonely: "isolated framing, vast negative space, cold single-source light, muted earth tones, contemplative stillness, 8k ultra detail",
    energetic: "dynamic motion blur trails, electric neon accents, high saturation, fast shutter freeze, pulsing rhythm in composition, 8k ultra detail",
    tender: "soft wrap-around lighting, delicate skin tones, shallow focus intimacy, warm whisper-like haze, gentle embrace of light, 8k ultra detail",
  };
  return emotionStyleMap[emotion?.toLowerCase()] ||
    "cinematic lighting, rich color palette, masterful composition, photorealistic detail, fine art quality, 8k ultra detail";
}

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

  const summaryParts = [
    `저장/재생성 전 상태: ${timeSummary}`,
    `메타데이터 ${metadataCount}/5`,
    lyrics ? "가사 있음" : "가사 없음",
    enPrompt ? "EN 있음" : "EN 없음",
    koPrompt ? "KO 있음" : "KO 없음",
  ];
  if (
    window.currentMVSceneQualityFilter &&
    getMVSceneIssueIndexes([scene], window.currentMVSceneQualityFilter).length
  ) {
    summaryParts.push(
      `선택 필터: ${getMVSceneIssueLabel(window.currentMVSceneQualityFilter)} 확인`,
    );
  }
  return summaryParts.join(" · ");
}

function getMVSceneIssueLabel(issueType) {
  return (
    {
      invalidTime: "시간",
      missingMetadata: "메타데이터",
      missingLyrics: "가사",
      missingEnPrompt: "EN",
      missingKoPrompt: "KO",
      review: "확인 필요",
    }[issueType] || "확인 필요"
  );
}

function getMVSceneQualityStats(scenesArg) {
  const scenes = Array.isArray(scenesArg) ? scenesArg : [];
  const stats = {
    total: scenes.length,
    ready: 0,
    needsReview: 0,
    invalidTime: 0,
    missingMetadata: 0,
    missingLyrics: 0,
    missingEnPrompt: 0,
    missingKoPrompt: 0,
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

    if (!hasValidTime) stats.invalidTime += 1;
    if (metadataCount === 0) stats.missingMetadata += 1;
    if (!hasLyrics) stats.missingLyrics += 1;
    if (!hasEnPrompt) stats.missingEnPrompt += 1;
    if (!hasKoPrompt) stats.missingKoPrompt += 1;

    if (
      hasValidTime &&
      metadataCount > 0 &&
      hasLyrics &&
      hasEnPrompt &&
      hasKoPrompt
    ) {
      stats.ready += 1;
    }
  });

  stats.needsReview = stats.total - stats.ready;
  return stats;
}

function getMVSceneReviewIndexes(scenesArg) {
  const scenes = Array.isArray(scenesArg) ? scenesArg : [];
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

      return hasValidTime && hasMetadata && hasLyrics && hasEnPrompt && hasKoPrompt
        ? null
        : index;
    })
    .filter((index) => index !== null);
}

function getMVSceneIssueIndexes(scenesArg, issueType) {
  const scenes = Array.isArray(scenesArg) ? scenesArg : [];
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

      const issueMap = {
        invalidTime: !hasValidTime,
        missingMetadata: !hasMetadata,
        missingLyrics: !hasLyrics,
        missingEnPrompt: !hasEnPrompt,
        missingKoPrompt: !hasKoPrompt,
        review:
          !hasValidTime ||
          !hasMetadata ||
          !hasLyrics ||
          !hasEnPrompt ||
          !hasKoPrompt,
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
    `가사 없음 ${stats.missingLyrics}개`,
    `EN 없음 ${stats.missingEnPrompt}개`,
    `KO 없음 ${stats.missingKoPrompt}개`,
  ].join(" · ");
}

function getMVSceneQualityConfirmMessage(scenesArg) {
  const stats = getMVSceneQualityStats(scenesArg);
  if (!stats.needsReview) return "";
  return [
    `${stats.needsReview}개 씬에 확인 필요 항목이 남아 있습니다.`,
    `시간 확인 ${stats.invalidTime}개, 메타데이터 없음 ${stats.missingMetadata}개, 가사 없음 ${stats.missingLyrics}개, EN 없음 ${stats.missingEnPrompt}개, KO 없음 ${stats.missingKoPrompt}개`,
    "취소하면 첫 확인 필요 씬으로 이동합니다.",
    "이 상태로 확정하고 결과 화면으로 이동하려면 확인을 누르세요.",
  ].join("\n");
}

function renderMVSceneQualitySummary(scenesArg) {
  const stats = getMVSceneQualityStats(scenesArg);
  const filters = [
    ["invalidTime", "시간", stats.invalidTime],
    ["missingMetadata", "메타", stats.missingMetadata],
    ["missingLyrics", "가사", stats.missingLyrics],
    ["missingEnPrompt", "EN", stats.missingEnPrompt],
    ["missingKoPrompt", "KO", stats.missingKoPrompt],
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
      </div>
    </div>
  `;
}

function updateMVSceneQualitySummary() {
  const summaryEl = document.getElementById("mv_scene_quality_summary");
  if (!summaryEl || !Array.isArray(window.currentScenes)) return;
  const textEl = document.getElementById("mv_scene_quality_summary_text");
  const focusBtn = document.getElementById("mv_scene_quality_focus_btn");
  const summaryText = getMVSceneQualitySummaryText(window.currentScenes);
  const stats = getMVSceneQualityStats(window.currentScenes);
  if (textEl) {
    textEl.textContent = summaryText;
  } else {
    summaryEl.textContent = summaryText;
  }
  if (focusBtn) {
    focusBtn.disabled = stats.needsReview === 0;
  }
  [
    ["invalidTime", stats.invalidTime],
    ["missingMetadata", stats.missingMetadata],
    ["missingLyrics", stats.missingLyrics],
    ["missingEnPrompt", stats.missingEnPrompt],
    ["missingKoPrompt", stats.missingKoPrompt],
  ].forEach(([key, count]) => {
    const btn = document.getElementById(`mv_scene_quality_filter_${key}`);
    if (btn) {
      btn.disabled = count === 0;
      btn.textContent =
        {
          invalidTime: "시간",
          missingMetadata: "메타",
          missingLyrics: "가사",
          missingEnPrompt: "EN",
          missingKoPrompt: "KO",
        }[key] + ` ${count}`;
    }
  });
}

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
      ${getMVSceneEditorSummaryText(scene, index)}
    </div>
  `;
}

function updateMVSceneEditorSummary(scene, index) {
  const summaryEl = document.getElementById(`scene_editor_summary_${index}`);
  if (!summaryEl) return;
  summaryEl.textContent = getMVSceneEditorSummaryText(scene, index);
}

window.updateMVSceneTimelineFromEditor = function (scene, index) {
  if (!scene) return scene;

  const startEl = document.getElementById(`scene_time_start_${index}`);
  const endEl = document.getElementById(`scene_time_end_${index}`);
  const lyricsEl = document.getElementById(`scene_lyrics_${index}`);
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
    let existingPrompt = scene.prompt || "";
    existingPrompt = existingPrompt.replace(/\/\*\s*Scene\s+\d+\s*\*\//gi, "").trim();
    if (existingPrompt && !existingPrompt.startsWith("/* Scene")) {
      existingPrompt = `/* Scene ${index + 1} */ ${existingPrompt}`;
    }
    const existingPromptKo = scene.promptKo || "";
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
                        <textarea class="scene-description" data-index="${index}" style="width: 100%; min-height: 80px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.9rem; resize: vertical;">${scene.scene || ""}</textarea>
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
                            <textarea id="scene_lyrics_${index}" class="scene-lyrics" data-index="${index}" aria-describedby="scene_editor_notice_${index}" style="width: 100%; min-height: 52px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem; resize: vertical;">${scene.lyrics || ""}</textarea>
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

  // 번역 미비 사항 보완 로직은 필요에 따라 별도 호출
  if (typeof container.querySelectorAll === "function") {
    const previewFields = container.querySelectorAll(
      [
        ".scene-time-start",
        ".scene-time-end",
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

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
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
      alert("MV 로딩 영역을 찾을 수 없습니다. 페이지를 새로고침해주세요.");
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
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

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

【스타일】
${stylePrompt || "감성적인 발라드"}
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
3. **emotion**: 감정 한 단어 (예: sad, joyful, nostalgic, dreamy, intense, lonely, tender, hopeful)
4. **location**: **감정이 깃든 공간**으로 묘사하세요 (20단어 이상, 영어).
   ✗ 나쁜 예: "a park at night"
   ✓ 좋은 예: "rain-slicked cobblestone path through a quiet park, amber streetlights casting long reflections in shallow puddles, mist curling around wrought-iron benches"
5. **characterAction**: **내면 감정이 외면에 스며드는 동작**으로 묘사하세요 (15단어 이상, 영어).
   ✗ 나쁜 예: "walking sadly"
   ✓ 좋은 예: "trailing fingertips along a rain-beaded window, breath fogging the glass, gazing at blurred city lights below with distant eyes"
   - 인물 상세 정보 일관 반영: ${characterInfoStr || "없음"}
6. **mood**: 분위기를 색채·온도·질감으로 표현 (영어)
   예: "warm amber intimacy dissolving into cool blue solitude"
7. **lighting**: 빛의 방향·색·질감까지 묘사 (영어)
   예: "soft golden hour sidelight with long shadows and warm lens flare kissing the edges"
8. **cameraWork**: 카메라의 움직임·속도·프레이밍까지 표현 (영어)
   예: "slow cinematic dolly-in from wide establishing shot to intimate medium close-up"
9. **promptKo**: 가사 감정 중심의 완성된 Midjourney 한글 프롬프트 (150단어 내외의 방대하고 정밀한 서술형 문장)
   - **프롬프트 구조화 필수**: [핵심 장면 요약] -> [인물 외모/표정/미세 동작] -> [배경/날씨/질감 정밀 묘사] -> [조명/색채/분위기] -> [카메라 앵글/모션] -> [고화질 기술 키워드]
   - 인물 정보(${characterInfoStr || "없음"}) 일관 반영. (매우 중요: 기형 방지를 위해 손가락, 발가락, 손 모양, 발 모양, 팔, 다리 등 신체 구조를 해부학적으로 완벽하고 정밀하게 묘사할 것)
   - 씬 설명의 감정, 인물, 배경, 조명, 구도, 카메라가 움직이는 느낌(바람, 빛 반사 등)을 문학적이고 시각적으로 구체적 서술.
   - 마지막에 "초고화질, 8k 해상도, 시네마틱 구도, 역동적 카메라 무브먼트, 예리한 초점, 디테일한 조명" 포함
10. **promptEn**: promptKo를 영어로 번역한 매우 풍성하고 디테일한 프롬프트 (150단어 내외, 완벽한 문장과 쉼표가 조화된 긴 단락 필수)
    - 단순 단어 나열이 절대 아닙니다. 감정, 빛, 질감을 완벽한 문장(Sentence) 구조로 논리적이고 길게 묘사하세요.
    - 프롬프트 맨 끝에 반드시 다음 텍스트를 그대로 복사해 붙여넣으세요: "ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio, professional photography, cinematic motion, dynamic camera movement, sharp focus, detailed lighting"
11. **runwayPrompt**: RunwayML 비디오 생성용 영어 프롬프트 (매우 상세한 서술형, 3문장 이상)
    - 인물의 미세한 동작 (흔들리는 머리카락, 떨리는 손끝, 눈의 초점 변화, 피부의 질감 등) 및 해부학적으로 완벽하고 정밀한 손/발가락 묘사
    - 환경의 살아있는 요소 (바람, 빛 번짐, 입자 등)와 카메라 모션을 눈앞에 보이듯 묘사
    - 프롬프트 맨 끝에 반드시 다음 텍스트를 그대로 복사해 붙여넣으세요: "cinematic motion, fluid movement, photorealistic, highly detailed, 8k"
12. **runwayPromptKo**: runwayPrompt를 감각적이고 길게 번역한 한글 버전

**중요 원칙:**
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

          try {
            // ── 1차 API 시도 ──────────────────────────────────────────────
            let aiResponse = "";
            try {
              if (useGeminiFirst) {
                aiResponse = await window.callGeminiForScenes(
                  analysisPrompt,
                  geminiKey,
                );
              } else {
                aiResponse = await window.callChatGPTForScenes(
                  analysisPrompt,
                  openaiKey,
                );
              }
              console.log(
                `🤖 배치 ${batchIdx + 1}/${totalBatches} [${primaryApiName}] 응답 수신`,
              );
            } catch (primaryError) {
              // ── 폴백: 반대 API로 재시도 ────────────────────────────────
              const canFallback = useGeminiFirst ? hasChatGPT : true;
              if (canFallback) {
                console.warn(
                  `⚠️ 배치 ${batchIdx + 1} [${primaryApiName}] 실패 → [${fallbackApiName}] 폴백:`,
                  primaryError.message,
                );
                if (mvLoading) {
                  const loadingText = mvLoading.querySelector(".loading-text");
                  if (loadingText)
                    loadingText.textContent = `씬 생성 중... (배치 ${batchIdx + 1}/${totalBatches} · ${fallbackApiName} 폴백 · ${batchEnd}/${imageCount}개 완료)`;
                }
                if (useGeminiFirst) {
                  aiResponse = await window.callChatGPTForScenes(
                    analysisPrompt,
                    openaiKey,
                  );
                } else {
                  aiResponse = await window.callGeminiForScenes(
                    analysisPrompt,
                    geminiKey,
                  );
                }
                console.log(
                  `🔄 배치 ${batchIdx + 1}/${totalBatches} [${fallbackApiName}] 폴백 응답 수신`,
                );
              } else {
                throw primaryError; // 폴백 불가 → 자동보충으로 처리
              }
            }

            console.log(`✅ 배치 ${batchIdx + 1}/${totalBatches} AI 응답 완료`);

            // JSON 추출
            let cleanedResponse = aiResponse.trim();
            cleanedResponse = cleanedResponse.replace(/```json\s*/gi, "");
            cleanedResponse = cleanedResponse.replace(/```\s*/g, "");
            cleanedResponse = cleanedResponse.replace(/^json\s*/gi, "").trim();

            let aiScenes = safeJsonParse(cleanedResponse);

            if (!aiScenes || !Array.isArray(aiScenes)) {
              const wrappedMatch = cleanedResponse.match(
                /\{[\s\S]*"scenes"[\s\S]*:[\s\S]*\[[\s\S]*\]/,
              );
              if (wrappedMatch) {
                const wrappedJson = safeJsonParse(wrappedMatch[0]);
                if (wrappedJson?.scenes && Array.isArray(wrappedJson.scenes)) {
                  aiScenes = wrappedJson.scenes;
                }
              }
            }

            if (!aiScenes && cleanedResponse.includes("[")) {
              const startIdx = cleanedResponse.indexOf("[");
              const endIdx = cleanedResponse.lastIndexOf("]");
              if (startIdx !== -1 && endIdx > startIdx) {
                aiScenes = safeJsonParse(
                  cleanedResponse.substring(startIdx, endIdx + 1),
                );
              }
            }

            if (
              !aiScenes ||
              !Array.isArray(aiScenes) ||
              aiScenes.length === 0
            ) {
              console.warn(
                `⚠️ 배치 ${batchIdx + 1} JSON 파싱 실패 - 빈 씬으로 대체`,
              );
              aiScenes = [];
            }

            // 과다 반환 시 trim
            if (aiScenes.length > batchCount) {
              aiScenes = aiScenes.slice(0, batchCount);
            }

            // 각 AI 씬을 scenes 객체로 변환
            for (let localIdx = 0; localIdx < aiScenes.length; localIdx++) {
              const globalIdx = batchStart + localIdx;
              const aiScene = aiScenes[localIdx];
              const startTime = globalIdx * interval;
              const endTime = Math.min(startTime + interval, totalSeconds);
              const startMin = Math.floor(startTime / 60);
              const startSec = Math.floor(startTime % 60);
              const endMin = Math.floor(endTime / 60);
              const endSec = Math.floor(endTime % 60);
              const timeStr = `${startMin}:${String(startSec).padStart(2, "0")}-${endMin}:${String(endSec).padStart(2, "0")}`;

              let promptKo = aiScene.promptKo || "";
              let prompt = aiScene.promptEn || "";

              // promptKo/En이 짧은 경우 개별 필드 조합
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
                  aiScene.promptKo || aiScene.location || `씬 ${globalIdx + 1}`;
              }

              // 한글 제거 및 정리
              prompt = prompt
                .replace(/[가-힣]+/g, "")
                .replace(/,\s*,+/g, ", ")
                .replace(/\s+/g, " ")
                .trim();
              if (!prompt.endsWith(".")) prompt = prompt.replace(/,+$/, "") + ".";

              // 🌟 필수 품질 키워드 강제 병합 로직 (Midjourney)
              const mjKeywords = "ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio, professional photography, cinematic motion, dynamic camera movement, sharp focus, detailed lighting";
              if (!prompt.includes("cinematic composition") && !prompt.includes("sharp focus")) {
                 prompt = prompt.replace(/\.$/, ", ") + mjKeywords + ".";
              }

              // Runway 필수 통합 처리
              let finalRunwayPrompt = aiScene.runwayPrompt || "";
              if (finalRunwayPrompt) {
                 const rwKeywords = "cinematic motion, fluid movement, photorealistic, highly detailed, 8k";
                 if (!finalRunwayPrompt.includes("fluid movement")) {
                   finalRunwayPrompt = finalRunwayPrompt.trim().replace(/\.$/, "") + ", " + rwKeywords + ".";
                 }
              }

              batchScenes.push({
                time: timeStr,
                scene: (aiScene.lyrics && aiScene.lyrics !== `씬 ${globalIdx + 1}` && aiScene.lyrics.trim() !== "") ? aiScene.lyrics : (preAllocatedLyrics[globalIdx] || `씬 ${globalIdx + 1}`),
                prompt: `/* Scene ${globalIdx + 1} */ ${prompt}`,
                promptKo: promptKo,
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

            console.log(
              `✅ 배치 ${batchIdx + 1}/${totalBatches} 완료: ${batchScenes.length}개 씬 생성`,
            );
          } catch (batchError) {
            console.error(`❌ 배치 ${batchIdx + 1} 처리 실패:`, batchError);
            // 실패한 배치 → 빈 씬 placeholder로 채움 (후속 자동 보충에서 처리)
            batchScenes = [];
          }

          // 배치 씬이 batchCount보다 적으면 자동 보충
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
                scene: preAllocatedLyrics[globalIdx] || `씬 ${globalIdx + 1}`,
                prompt: `/* Scene ${globalIdx + 1} */ ${baseFillPrompt}`,
                promptKo: baseFillKo,
                runwayPrompt: "",
                runwayPromptKo: "",
                location: "",
                emotion: "",
                mood: "",
                lighting: "",
                characterAction: "",
                cameraWork: "",
                _isFilled: true,
              });
            }
          }

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
              scene: preAllocatedLyrics[fillIdx] || `씬 ${fillIdx + 1}`,
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

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
            const response = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.92,
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
        const promptParts = [
          sceneLyrics ? `scene depicting: "${sceneLyrics.trim()}"` : "",
          characterInfo,
          locationEn,
          country ? `${country} setting` : "",
          era ? `${era} era` : "",
          `${visualTone?.lighting || lighting || "cinematic"} lighting`,
          visualTone?.cameraWork || cameraWork || "slow cinematic camera movement",
          `${visualTone?.mood || mood || "emotional"} mood`,
          visualTone?.emotion ? `${visualTone.emotion} emotion` : "",
          getArtisticKeywords(visualTone?.emotion || mood || ""),
        ].filter(Boolean);
        const promptEn = `/* Scene ${i + 1} */ ${promptParts.join(", ")}.`;
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

        scenes.push({
          time: timeStr,
          scene: sceneLyrics,
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
        // 캐릭터 시트 원본 정보 수집
        const characterSheetsFull = typeof window.getAllCharacterSheetsFull === "function" ? window.getAllCharacterSheetsFull() : "";

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

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
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

// === MV Step 6: Location, settings, and character helpers ===
// --- Extracted getMVLocationValues ---
window.getMVLocationValues = function () {
  const container = document.getElementById("mvLocationTags");
  if (!container) return [];
  const activeTags = container.querySelectorAll(".tag-btn.active");
  return Array.from(activeTags)
    .map((btn) => btn.getAttribute("data-value"))
    .filter((v) => !!v);
};

// --- Extracted MV settings helpers ---
window.updateMVImageCount = function () {
  const minutes = parseInt(document.getElementById("mvMinutes")?.value || 3);
  const seconds = parseInt(document.getElementById("mvSeconds")?.value || 30);
  const interval = parseInt(document.getElementById("mvInterval")?.value || 8);

  const totalSeconds = minutes * 60 + seconds;
  const imageCount = Math.ceil(totalSeconds / interval);

  const resultEl = document.getElementById("mvImageCount");
  if (resultEl) {
    resultEl.textContent = imageCount;
  }

  const intervalDisplay = document.getElementById("mvIntervalDisplay");
  if (intervalDisplay) {
    intervalDisplay.textContent = interval;
  }

  const totalDuration = document.getElementById("mvTotalDuration");
  if (totalDuration) {
    totalDuration.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
};

window.saveMVSettings = function () {
  const characterCount =
    document.getElementById("mvCharacterCount")?.value || "1";
  const characters = [];
  for (let i = 1; i <= parseInt(characterCount); i++) {
    const gender =
      document.getElementById(`mvCharacter${i}_gender`)?.value || "";
    const age = document.getElementById(`mvCharacter${i}_age`)?.value || "";
    const race = document.getElementById(`mvCharacter${i}_race`)?.value || "";
    const appearance =
      document.getElementById(`mvCharacter${i}_appearance`)?.value || "";
    const artStyle =
      document.getElementById(`mvCharacter${i}_artStyle`)?.value || "photorealistic";
    const characterSheet =
      document.getElementById(`mvCharacter${i}_sheet`)?.value || "";
    characters.push({ gender, age, race, appearance, artStyle, characterSheet });
  }

  const settings = {
    minutes: document.getElementById("mvMinutes")?.value || 3,
    seconds: document.getElementById("mvSeconds")?.value || 30,
    interval: document.getElementById("mvInterval")?.value || 8,
    era: document.getElementById("mvEra")?.value || "",
    country: document.getElementById("mvCountry")?.value || "",
    location:
      typeof window.getMVLocationValues === "function"
        ? window.getMVLocationValues()
        : [],
    characterCount: characterCount,
    characters: characters,
    customSettings: document.getElementById("mvCustomSettings")?.value || "",
    lighting: document.getElementById("mvLighting")?.value || "",
    cameraWork: document.getElementById("mvCameraWork")?.value || "",
    mood: document.getElementById("mvMood")?.value || "",
  };

  localStorage.setItem("mvSettings", JSON.stringify(settings));

  if (window.currentProject && window.currentProject.data) {
    if (!window.currentProject.data.marketing) {
      window.currentProject.data.marketing = {};
    }
    window.currentProject.data.marketing.mvSettings = JSON.parse(
      JSON.stringify(settings),
    );

    if (typeof window.saveCurrentProject === "function") {
      window.saveCurrentProject();
    }
  }
};

window.loadMVSettings = function () {
  try {
    if (window.currentProject && window.currentProject.data) {
      console.log("ℹ️ 프로젝트 데이터가 존재하여 전역 설정 로드를 건너뜁니다.");
      return;
    }

    const saved = localStorage.getItem("mvSettings");
    if (saved) {
      const settings = JSON.parse(saved);
      if (document.getElementById("mvMinutes"))
        document.getElementById("mvMinutes").value = settings.minutes || 3;
      if (document.getElementById("mvSeconds"))
        document.getElementById("mvSeconds").value = settings.seconds || 30;
      if (document.getElementById("mvInterval"))
        document.getElementById("mvInterval").value = settings.interval || 8;
      if (document.getElementById("mvEra"))
        document.getElementById("mvEra").value = settings.era || "";
      if (document.getElementById("mvCountry"))
        document.getElementById("mvCountry").value = settings.country || "";

      const locationTagsContainer = document.getElementById("mvLocationTags");
      if (locationTagsContainer) {
        const locationArr = Array.isArray(settings.location)
          ? settings.location
          : settings.location
            ? [settings.location]
            : [];
        locationTagsContainer.querySelectorAll(".tag-btn").forEach((btn) => {
          const v = btn.getAttribute("data-value");
          if (locationArr.indexOf(v) !== -1) btn.classList.add("active");
          else btn.classList.remove("active");
        });
      }

      if (document.getElementById("mvCharacterCount"))
        document.getElementById("mvCharacterCount").value =
          settings.characterCount || "1";
      if (document.getElementById("mvCustomSettings"))
        document.getElementById("mvCustomSettings").value =
          settings.customSettings || "";
      if (document.getElementById("mvLighting"))
        document.getElementById("mvLighting").value = settings.lighting || "";
      if (document.getElementById("mvCameraWork"))
        document.getElementById("mvCameraWork").value =
          settings.cameraWork || "";
      if (document.getElementById("mvMood"))
        document.getElementById("mvMood").value = settings.mood || "";

      window.updateMVImageCount();
      window.updateCharacterInputs();

      if (settings.characters && Array.isArray(settings.characters)) {
        settings.characters.forEach((char, index) => {
          const i = index + 1;
          if (document.getElementById(`mvCharacter${i}_gender`))
            document.getElementById(`mvCharacter${i}_gender`).value =
              char.gender || "";
          if (document.getElementById(`mvCharacter${i}_age`))
            document.getElementById(`mvCharacter${i}_age`).value =
              char.age || "";
          if (document.getElementById(`mvCharacter${i}_race`))
            document.getElementById(`mvCharacter${i}_race`).value =
              char.race || "";
          if (document.getElementById(`mvCharacter${i}_appearance`))
            document.getElementById(`mvCharacter${i}_appearance`).value =
              char.appearance || "";
          if (char.artStyle && document.getElementById(`mvCharacter${i}_artStyle`))
            document.getElementById(`mvCharacter${i}_artStyle`).value =
              char.artStyle;
          if (char.characterSheet && document.getElementById(`mvCharacter${i}_sheet`)) {
            document.getElementById(`mvCharacter${i}_sheet`).value =
              char.characterSheet;
            const sheetArea = document.getElementById(`mvCharacter${i}_sheetArea`);
            if (sheetArea) sheetArea.style.display = "block";
            const sheetToggle = document.getElementById(`mvCharacter${i}_sheetToggle`);
            if (sheetToggle) sheetToggle.style.display = "inline-flex";
            const sheetCopy = document.getElementById(`mvCharacter${i}_sheetCopy`);
            if (sheetCopy) sheetCopy.style.display = "inline-flex";
          }
        });
      }
    }
  } catch (e) {
    console.warn("MV 설정 로드 실패:", e);
  }
};

window.updateCharacterInputs = function () {
  const characterCount =
    document.getElementById("mvCharacterCount")?.value || "1";
  const container = document.getElementById("mvCharacterInputs");

  if (!container) {
    console.warn("⚠️ mvCharacterInputs 컨테이너를 찾을 수 없습니다.");
    return;
  }

  console.log("🔄 updateCharacterInputs 호출됨, 인물 수:", characterCount);

  const count = parseInt(characterCount);
  const backups = [];
  for (let i = 1; i <= 10; i++) {
    const gender = document.getElementById(`mvCharacter${i}_gender`)?.value;
    const age = document.getElementById(`mvCharacter${i}_age`)?.value;
    const race = document.getElementById(`mvCharacter${i}_race`)?.value;
    const appearance = document.getElementById(
      `mvCharacter${i}_appearance`,
    )?.value;
    const artStyle = document.getElementById(`mvCharacter${i}_artStyle`)?.value;
    const charSheet = document.getElementById(`mvCharacter${i}_sheet`)?.value;
    if (gender !== undefined) {
      backups[i] = { gender, age, race, appearance, artStyle, characterSheet: charSheet };
    }
  }

  let html = "";
  for (let i = 1; i <= count; i++) {
    html += `
            <div style="margin-bottom: 15px; padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border);">
                <h5 style="margin: 0 0 10px 0; color: var(--text-primary);">인물 ${i}</h5>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; font-size: 0.85rem; color: var(--text-secondary);">성별</label>
                        <select id="mvCharacter${i}_gender" onchange="window.saveMVSettings()" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary);">
                            <option value="">선택 안 함</option>
                            <option value="male">남성</option>
                            <option value="female">여성</option>
                            <option value="non-binary">논바이너리</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; font-size: 0.85rem; color: var(--text-secondary);">나이</label>
                        <select id="mvCharacter${i}_age" onchange="window.saveMVSettings()" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary);">
                            <option value="">선택 안 함</option>
                            <option value="child">어린이 (10세 미만)</option>
                            <option value="teen">청소년 (10-19세)</option>
                            <option value="20s">20대</option>
                            <option value="30s">30대</option>
                            <option value="40s">40대</option>
                            <option value="50s">50대</option>
                            <option value="elder">장년 (60세 이상)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; font-size: 0.85rem; color: var(--text-secondary);">인종</label>
                        <select id="mvCharacter${i}_race" onchange="window.saveMVSettings()" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary);">
                            <option value="">선택 안 함</option>
                            <option value="asian">아시아인</option>
                            <option value="caucasian">백인</option>
                            <option value="african">아프리카인</option>
                            <option value="hispanic">히스패닉/라틴계</option>
                            <option value="middle-eastern">중동인</option>
                            <option value="mixed">혼혈</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; font-size: 0.85rem; color: var(--text-secondary);">외모/스타일</label>
                        <input type="text" id="mvCharacter${i}_appearance" oninput="window.saveMVSettings()" placeholder="예: 검은 단발, 차가운 느낌, 키 170cm, 마른 체형" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary);">
                    </div>
                </div>
                <!-- Art Style 선택 -->
                <div style="margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 0.85rem; color: var(--text-secondary);">🎨 Art Style</label>
                    <select id="mvCharacter${i}_artStyle" onchange="window.saveMVSettings()" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary);">
                        <option value="photorealistic">포토리얼리스틱 (실사)</option>
                        <option value="cinematic-photography">시네마틱 포토그래피</option>
                        <option value="anime">애니메이션 (아니메)</option>
                        <option value="3d-render">3D 렌더링</option>
                        <option value="digital-art">디지털 아트</option>
                        <option value="watercolor">수채화</option>
                        <option value="oil-painting">유화</option>
                        <option value="concept-art">컨셉 아트</option>
                        <option value="comic-book">코믹북 스타일</option>
                        <option value="pixel-art">픽셀 아트</option>
                        <option value="fashion-illustration">패션 일러스트</option>
                        <option value="hyperrealistic">하이퍼리얼리스틱</option>
                    </select>
                </div>
                <!-- 캐릭터 시트 생성 버튼 -->
                <div style="margin-top: 12px; display: flex; gap: 8px; align-items: center;">
                    <button type="button" class="btn btn-primary" id="mvCharacter${i}_sheetBtn"
                        onclick="window.generateCharacterSheet(${i})"
                        style="padding: 8px 16px; font-size: 0.85rem; border-radius: 6px; display: flex; align-items: center; gap: 6px;">
                        <span>🎨</span> <span>캐릭터 시트 생성</span>
                    </button>
                    <button type="button" class="btn btn-secondary" id="mvCharacter${i}_sheetToggle"
                        onclick="window.toggleCharacterSheet(${i})"
                        style="padding: 8px 12px; font-size: 0.8rem; border-radius: 6px; display: none;">
                        📋 시트 보기/숨기기
                    </button>
                    <button type="button" class="btn btn-success" id="mvCharacter${i}_sheetCopy"
                        onclick="window.copyCharacterSheet(${i}, event)"
                        style="padding: 8px 12px; font-size: 0.8rem; border-radius: 6px; display: none;">
                        📋 시트 복사
                    </button>
                </div>
                <!-- 캐릭터 시트 생성 진행 표시 -->
                <div id="mvCharacter${i}_sheetLoading" style="display: none; margin-top: 10px; padding: 10px; background: var(--bg-input); border-radius: 6px; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
                    ⏳ AI가 캐릭터 시트를 생성하는 중... (고정 요소 보존, 변형 요소 보완)
                </div>
                <!-- 캐릭터 시트 미리보기/편집 영역 -->
                <div id="mvCharacter${i}_sheetArea" style="display: none; margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 0.85rem; color: var(--text-secondary);">
                        📝 캐릭터 시트 (편집 가능 — 이 내용이 인물/썸네일/씬 프롬프트에 반영됩니다)
                    </label>
                    <textarea id="mvCharacter${i}_sheet"
                        onchange="window.saveMVSettings()"
                        placeholder="캐릭터 시트가 여기에 생성됩니다..."
                        style="width: 100%; min-height: 300px; padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); font-family: 'Courier New', monospace; font-size: 0.8rem; resize: vertical; line-height: 1.5; white-space: pre-wrap;"
                    ></textarea>
                </div>
            </div>
        `;
  }

  container.innerHTML = html;

  for (let i = 1; i <= count; i++) {
    if (backups[i]) {
      if (document.getElementById(`mvCharacter${i}_gender`))
        document.getElementById(`mvCharacter${i}_gender`).value =
          backups[i].gender;
      if (document.getElementById(`mvCharacter${i}_age`))
        document.getElementById(`mvCharacter${i}_age`).value = backups[i].age;
      if (document.getElementById(`mvCharacter${i}_race`))
        document.getElementById(`mvCharacter${i}_race`).value = backups[i].race;
      if (document.getElementById(`mvCharacter${i}_appearance`))
        document.getElementById(`mvCharacter${i}_appearance`).value =
          backups[i].appearance;
      if (backups[i].artStyle && document.getElementById(`mvCharacter${i}_artStyle`))
        document.getElementById(`mvCharacter${i}_artStyle`).value =
          backups[i].artStyle;
      if (backups[i].characterSheet && document.getElementById(`mvCharacter${i}_sheet`)) {
        document.getElementById(`mvCharacter${i}_sheet`).value = backups[i].characterSheet;
        document.getElementById(`mvCharacter${i}_sheetArea`).style.display = "block";
        document.getElementById(`mvCharacter${i}_sheetToggle`).style.display = "inline-flex";
        document.getElementById(`mvCharacter${i}_sheetCopy`).style.display = "inline-flex";
      }
    }
  }
};

/**
 * AI를 사용하여 완전한 캐릭터 시트 프롬프트를 생성합니다.
 * 사용자가 입력한 고정 요소는 절대 변경하지 않고,
 * 변형 가능 요소를 보완하여 완전한 스펙을 생성합니다.
 * @param {number} charIndex - 인물 인덱스 (1-based)
 */
window.generateCharacterSheet = async function (charIndex) {
  const btn = document.getElementById(`mvCharacter${charIndex}_sheetBtn`);
  const loadingEl = document.getElementById(`mvCharacter${charIndex}_sheetLoading`);
  const sheetArea = document.getElementById(`mvCharacter${charIndex}_sheetArea`);
  const sheetEl = document.getElementById(`mvCharacter${charIndex}_sheet`);
  const toggleBtn = document.getElementById(`mvCharacter${charIndex}_sheetToggle`);
  const copyBtn = document.getElementById(`mvCharacter${charIndex}_sheetCopy`);

  // 입력값 수집
  const gender = document.getElementById(`mvCharacter${charIndex}_gender`)?.value || "";
  const age = document.getElementById(`mvCharacter${charIndex}_age`)?.value || "";
  const race = document.getElementById(`mvCharacter${charIndex}_race`)?.value || "";
  const appearance = document.getElementById(`mvCharacter${charIndex}_appearance`)?.value || "";
  const artStyle = document.getElementById(`mvCharacter${charIndex}_artStyle`)?.value || "photorealistic";

  if (!gender && !age && !race && !appearance) {
    alert("인물 정보를 최소 1개 이상 입력해주세요.\n(성별, 나이, 인종, 외모/스타일 중 하나)");
    return;
  }

  // Gemini API 키 확인
  const geminiKey = window.getGeminiApiKey();
  if (!geminiKey || !geminiKey.startsWith("AIza")) {
    alert("Gemini API 키가 설정되지 않았습니다.\n설정 > API 키에서 Gemini API 키를 입력해주세요.");
    return;
  }

  // UI 상태 전환: 로딩
  if (btn) btn.disabled = true;
  if (loadingEl) loadingEl.style.display = "block";

  try {
    // 성별/나이/인종 매핑
    const genderMap = { male: "Male", female: "Female", "non-binary": "Non-binary" };
    const ageMap = {
      child: "Child (under 10)", teen: "Teenager (10-19)",
      "20s": "Young adult (early to late 20s)", "30s": "Adult (30s)",
      "40s": "Adult (40s)", "50s": "Mature adult (50s)", elder: "Elder (60+)"
    };
    // 인종 매핑 — 미드저니가 인식하는 구체적 신체 특징 키워드 포함
    const raceMap = {
      asian: "East Asian",
      caucasian: "Caucasian/White",
      african: "African/Black",
      hispanic: "Hispanic/Latino",
      "middle-eastern": "Middle Eastern",
      mixed: "Mixed ethnicity"
    };
    // 미드저니 전용 인종 강제 키워드 맵 (OVERALL COMPOSITION 상단에 삽입용)
    const genderSuffix = gender === "male" ? "man" : gender === "female" ? "woman" : "person";
    const raceMJMap = {
      asian: `East Asian ${genderSuffix}, Korean/Japanese/Chinese facial features, monolid or slightly hooded almond-shaped eyes, flat nasal bridge, high cheekbones, light to medium tan skin tone typical of East Asia, straight black hair`,
      caucasian: `Caucasian ${genderSuffix}, White European facial features, round to oval eyes, defined nasal bridge, fair to light skin tone`,
      african: `African/Black ${genderSuffix}, Sub-Saharan African facial features, full lips, broad nasal bridge, dark brown skin tone, tightly coiled dark hair`,
      hispanic: `Hispanic/Latino ${genderSuffix}, Latin American facial features, warm olive to tan skin tone, dark brown eyes and hair`,
      "middle-eastern": `Middle Eastern ${genderSuffix}, Arab/Persian facial features, strong brow ridge, prominent nose, olive to tan skin tone, dark hair`,
      mixed: `Mixed ethnicity ${genderSuffix}, blended facial features from multiple ethnic backgrounds`
    };
    const artStyleMap = {
      photorealistic: "photorealistic photography style",
      "cinematic-photography": "cinematic photography style, dramatic film-like quality",
      anime: "anime/Japanese animation style",
      "3d-render": "3D rendered, Pixar-quality CG style",
      "digital-art": "digital art illustration style",
      watercolor: "watercolor painting style",
      "oil-painting": "classical oil painting style",
      "concept-art": "conceptual art style, entertainment design",
      "comic-book": "comic book / graphic novel style",
      "pixel-art": "pixel art / retro game style",
      "fashion-illustration": "fashion illustration style",
      hyperrealistic: "hyperrealistic, ultra-detailed photographic style"
    };

    // 고정 요소 목록 생성
    const fixedTraits = [];
    if (gender) fixedTraits.push(`Gender: ${genderMap[gender] || gender}`);
    if (age) fixedTraits.push(`Age: ${ageMap[age] || age}`);
    if (race) fixedTraits.push(`Ethnicity: ${raceMap[race] || race} — MANDATORY, do not change to any other ethnicity`);
    if (appearance) fixedTraits.push(`User-described traits: "${appearance}"`);

    const artStyleEn = artStyleMap[artStyle] || artStyle;
    // 미드저니 인종 강제 키워드 (선택된 인종 또는 원문 그대로)
    const raceMJKeywords = race ? (raceMJMap[race] || (raceMap[race] || race)) : "";
    // 인종 강제 규칙 블록
    const ethnicityEnforcement = race ? `
⚠️ ETHNICITY ENFORCEMENT (MANDATORY — DO NOT IGNORE):
- The character's ethnicity is: ${raceMap[race] || race}
- Midjourney-specific descriptors to include: ${raceMJKeywords}
- FORBIDDEN: rendering the character as any other ethnicity (e.g., do NOT render as Caucasian/White, African/Black, or any non-${raceMap[race] || race} appearance)
- Every view and headshot MUST clearly show ${raceMap[race] || race} facial features
` : "";

    // MV 프롬프트 상세 설정 수집 (시대, 국가, 조명 등)
    const mvEra = document.getElementById("mvEra")?.value || "";
    const mvCountry = document.getElementById("mvCountry")?.value || "";
    const mvLocation = typeof window.getMVLocationEnString === "function" ? window.getMVLocationEnString() : document.getElementById("mvLocation")?.value || "";
    const mvLighting = document.getElementById("mvLighting")?.value || "";
    const mvCameraWork = document.getElementById("mvCameraWork")?.value || "";
    const mvMood = document.getElementById("mvMood")?.value || "";
    const mvCustomSettings = document.getElementById("mvCustomSettings")?.value || "";
    const mvCharacterCount = document.getElementById("mvCharacterCount")?.value || "1";

    const mvContextParts = [];
    if (mvEra) mvContextParts.push(`Era: ${mvEra}`);
    if (mvCountry) mvContextParts.push(`Country/Region: ${mvCountry}`);
    if (mvLocation) mvContextParts.push(`Location: ${mvLocation}`);
    if (mvLighting) mvContextParts.push(`Lighting: ${mvLighting}`);
    if (mvCameraWork) mvContextParts.push(`Camera Work: ${mvCameraWork}`);
    if (mvMood) mvContextParts.push(`Mood/Atmosphere: ${mvMood}`);
    if (mvCharacterCount) mvContextParts.push(`Total Characters in MV: ${mvCharacterCount} (Design this character to fit well in a group of ${mvCharacterCount})`);
    if (mvCustomSettings) mvContextParts.push(`Additional Settings: "${mvCustomSettings}"`);
    
    const mvContextStr = mvContextParts.length > 0 ? mvContextParts.join(" | ") : "Not specified";

    // 최종 가사 (수노용) 정보 수집
    const finalLyricsEl = document.getElementById("finalLyrics");
    const finalLyrics = finalLyricsEl ? finalLyricsEl.innerText.trim() : "";

    // 실사 계열 스타일 여부 판별 (만화/애니 방지 규칙 적용 대상)
    const photoRealisticStyles = ["photorealistic", "cinematic-photography", "hyperrealistic"];
    const isPhotoRealistic = photoRealisticStyles.includes(artStyle);

    // 실사 스타일 강제 규칙 블록
    const photoRealismRule = isPhotoRealistic
      ? `⚠️ ABSOLUTE PHOTO-REALISM ENFORCEMENT (HIGHEST PRIORITY — OVERRIDES ALL OTHER STYLE DECISIONS):
- This character MUST be rendered as a REAL HUMAN PHOTOGRAPH, NOT illustration, cartoon, anime, manga, 3D animation, or any drawn/painted style.
- REQUIRED: ultra-photorealistic, shot on high-end DSLR/mirrorless camera, visible skin pores, subsurface skin scattering, natural hair strands, real fabric texture, lens bokeh, 8K RAW photo quality.
- FORBIDDEN: anime, manga, cartoon, illustration, cel-shading, flat color, stylized, toon, animated, drawn, painted, digital art, 3D render.
- Skin: natural imperfections, pores, subtle veins — NOT airbrushed, plastic, or smooth.
- Eyes: iris detail, natural moisture/catchlights, realistic proportions — NOT oversized anime-style eyes.
`
      : "";

    // 가사 기반 인물 분석 블록
    const lyricsAnalysisBlock = finalLyrics
      ? `MANDATORY LYRICS-BASED CHARACTER ANALYSIS:
Analyze the song lyrics below and determine:
- CORE EMOTION (e.g., longing, heartbreak, euphoria, nostalgia, melancholy)
- CHARACTER'S NARRATIVE ROLE (who is this person? what are they experiencing?)
- IMPLIED RELATIONSHIP (lover, lost connection, self-reflection, stranger)
- AESTHETIC ATMOSPHERE (e.g., rainy city night, empty room, neon-lit alley)

Reflect ALL of the above into the design:
- FACIAL EXPRESSION: convey the song's core emotion (NOT a blank neutral face)
- CLOTHING & COLOR PALETTE: match the song's era, mood, and atmosphere
- HAIR & MAKEUP: reinforce the emotional state
- BODY LANGUAGE: subtle cues to the character's inner world
- PROPS/ACCESSORIES: hint at the song's story

SONG LYRICS:
"""
${finalLyrics}
"""`
      : "";

    // AI 프롬프트 구성 (실사 강제 + 가사 분석 강화)

    const prompt = `You are a professional character designer${isPhotoRealistic ? " and portrait photographer" : ""}. Generate a COMPLETE, highly detailed character design sheet. The output will be used as a prompt for an AI image generator.

${photoRealismRule}
${ethnicityEnforcement}
**CRITICAL RULES (OBEY IN THIS EXACT PRIORITY ORDER):**
1. ${isPhotoRealistic ? "⚠️ PHOTO-REALISM FIRST: See the ABSOLUTE PHOTO-REALISM ENFORCEMENT block above. NO cartoons, NO anime, NO illustration — ONLY real human photography quality at 8K or higher." : `Art Style: ${artStyleEn} — All details must faithfully reflect this style.`}
2. CORE CHARACTERISTICS (USER INPUTS - ABSOLUTE MANDATORY): ${fixedTraits.join("; ")} 
   -> You MUST strictly follow these traits. They are the core identity of the character. Do not change or alter them under any circumstances.
3. Art Style Technical Spec: ${artStyleEn}${isPhotoRealistic ? ", 8K ultra-resolution, RAW photo quality, professional studio lighting" : ""}
4. MV PRODUCTION CONTEXT: The character must naturally fit the following music video settings: ${mvContextStr}.
${lyricsAnalysisBlock ? `5. ${lyricsAnalysisBlock}\n6. VARIABLE ELEMENTS: Fill in ALL remaining details not specified by the user, guided by the lyrics analysis above.` : "5. VARIABLE ELEMENTS: Fill in ALL remaining details that the user did NOT specify."}

**INPUT INTERPRETATION RULES:**
- Explicit Traits (physical descriptions like hair color, height, body type): keep EXACTLY as stated
- Implicit Traits (mood, personality, aura like "cold feeling", "mysterious"): Do NOT write these abstractly. Convert them into PHYSICAL/VISUAL elements (e.g., "cold feeling" → sharp angular jawline, cool-toned eye color, minimal makeup, sleek straight hair)
- If explicit and implicit traits conflict, explicit traits ALWAYS take priority

**OUTPUT RULES:**
- Every spec must be defined with Position, Size, Shape, Material, and State where applicable
- NO vague or abstract expressions allowed - everything must be concrete and physical
- Character must stand in a natural, upright A-pose (no dramatic poses)
- Arms relaxed at sides unless holding a prop
- Fill in EVERY field in the template - leave nothing empty
- THE VERY FIRST SECTION you output MUST be a labeled Midjourney prompt block. It must look exactly like this:
  
  MIDJOURNEY PROMPT (COPY THIS):
  ${'```'}
  [single-line prompt following the rules below]
  ${'```'}

- Rules for the simple Midjourney prompt:
  * Start with: "character sheet, turnaround, full body, [ethnicity] [gender], [age],"
  * Add layout: "4 body views (front, 3/4, side, back) and 3 close-up headshots on right,"
  * Add style: ${isPhotoRealistic ? "ultra photographic, 8K resolution, high detail," : artStyleEn + ","}
  * End with: "neutral grey background"
  * CRITICAL: Do NOT include "--ar" or any other parameters. Keep it under 150 characters if possible.
  * Keep it in a single line inside the code block.

**OUTPUT THE COMPLETE CHARACTER SHEET BELOW. Use ONLY the following template structure. Do NOT add or remove any sections:**

MIDJOURNEY PROMPT (COPY THIS):
${'```'}
(Generate the simplified single-line prompt here)
${'```'}

**[OVERALL COMPOSITION - FIXED LAYOUT]**
${raceMJKeywords ? raceMJKeywords + "," : ""} ${genderMap[gender] || "character"}, character reference sheet, character turnaround, split view, 4 full body views arranged horizontally (front, 3/4 angle, profile, back), 3 vertical close-up headshot portraits on the right side showing different expressions, ${artStyleEn}${isPhotoRealistic ? ", 8K resolution, real photograph, professional lighting, visible skin texture, natural hair strands, absolutely no cartoon elements" : ", high-quality, 4K resolution"}, neutral grey studio background, wide aspect ratio, symmetrical layout.

[SECTION 1 - FULL BODY 1]
- Full body view, 3/4 angle

[SECTION 2 - FULL BODY 2]
- Full body view, opposite 3/4 angle

[SECTION 3 - FULL BODY 3]
- Full body view, from behind (back view)

[SECTION 4 - HEADSHOTS AND EXPRESSIONS]
- Multiple close-up portrait headshots
- Showing different facial angles (front view, side profile) and subtle expressions

[GLOBAL LAYOUT RULES]
- Character turnaround sheet format
- All views aligned on the same neutral backdrop
- Consistent character proportions and design across all angles
- Professional concept art layout with clean spacing

**[CHARACTER SPECIFICATION - FULL DEFINITION]**

[Identity]
- Gender: (fill based on fixed elements)
- Age: (fill based on fixed elements)
- Ethnicity: (fill based on fixed elements)

[Body]
- Height:
- Proportion:
- Build:
- Shoulder width:
- Waist:
- Hip:
- Posture:

[Pose]
- A-pose
- Arms:
- Elbows:
- Hands:
- Legs:
- Weight distribution:

[Face]
- Shape:
- Jaw:
- Chin:
- Eyes:
- Eye color:
- Eye size:
- Brows:
- Nose:
- Lips:
- Skin:
- Expression:

[Makeup]
- Base:
- Blush:
- Eyeshadow:
- Eyeliner:
- Mascara:
- Lips:

[Hair]
- Length:
- Part:
- Structure:
- Strand thickness:
- Layering:
- Volume:
- Flow:
- Color:
- Surface:
- State:

[Outfit] Top:
- Type:
- Length:
- Fit:
- Neckline:
- Sleeve:
- Fabric:
- Wrinkles:

Skirt:
- Type:
- Waist position:
- Length:
- Shape:
- Structure:
- Pleats:
- Fabric:
- Movement:

[Footwear]
- Type:
- Heel height:
- Sole thickness:
- Shape:
- Coverage:
- Material:
- Color:
- Fit:
- State:

[Accessories / Wear Position] Earrings:
- Type:
- Length:
- Material:
- Position:
- Movement:

Necklace:
- Type:
- Lengths:
- Position:
- Material:

Rings:
- Count:
- Placement:
- Material:

Bracelet:
- Wrist:
- Fit:
- Material:

[Props]
- (specify if any, based on character concept)

**[TECHNICAL SPECIFICATIONS]**

[Lighting]
- Key:
- Fill:
- Rim:
- Shadow:
${isPhotoRealistic ? "- Camera: (specify lens focal length, f-stop, ISO, shutter speed for realistic photography look)\n- Resolution: 8K minimum, ultra-sharp detail, no AI-generation artifacts" : ""}

[Rendering Style]
- (specify based on art style: ${artStyleEn}${isPhotoRealistic ? " — STRICTLY photo-realistic, zero tolerance for any illustration, cartoon, or anime rendering" : ""})

[Color Control]
- (specify color palette and grading${isPhotoRealistic ? " — natural color grading consistent with professional studio photography; no painterly, watercolor, or heavy filter effects" : ""})

[Consistency Rules]
- (specify rules to maintain visual consistency across all sections)

[Final Constraint]
- (specify any final rendering constraints)
${isPhotoRealistic ? `
[⚠️ ANTI-CARTOON ABSOLUTE CONSTRAINT]
- EXPLICITLY FORBIDDEN: anime-style eyes, manga features, cel-shading, flat color fills, illustration outlines, toon rendering, stylized proportions, cartoon skin smoothness.
- The character MUST be INDISTINGUISHABLE from a real photograph of a real human being.
- Minimum output quality: 8K, ultra-sharp, visible real-world detail in every element.` : ""}

**IMPORTANT: Output ONLY the completed character sheet. No explanations, no commentary, no markdown code blocks. Just the character sheet text.**`;

    let aiResponse = "";
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.75,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (window.logApiUsage) window.logApiUsage("gemini");
      aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (geminiError) {
      console.warn("⚠️ Gemini 캐릭터 시트 생성 실패, ChatGPT로 전환하여 재시도합니다:", geminiError.message);
      const openaiKey = window.getOpenAIApiKey ? window.getOpenAIApiKey() : "";
      if (!openaiKey) {
        throw new Error(`Gemini 캐릭터 시트 생성 실패 (${geminiError.message}) 후 ChatGPT 폴백을 시도했으나 OpenAI API 키가 없습니다.`);
      }

      const chatGPTResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an AI character concept artist." },
            { role: "user", content: prompt },
          ],
          temperature: 0.75,
        }),
      });

      if (!chatGPTResponse.ok) {
        const errorData = await chatGPTResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `ChatGPT API 오류: ${chatGPTResponse.status}`);
      }

      const chatGPTData = await chatGPTResponse.json();
      if (window.logApiUsage) window.logApiUsage("openai");
      aiResponse = chatGPTData.choices?.[0]?.message?.content || "";
    }

    if (!aiResponse.trim()) {
      throw new Error("AI 응답이 비어있습니다.");
    }

    // 마크다운 코드 블록 제거 (있는 경우)
    let cleanSheet = aiResponse.trim();
    if (cleanSheet.startsWith("```")) {
      cleanSheet = cleanSheet.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");
    }

    // textarea에 표시
    if (sheetEl) sheetEl.value = cleanSheet;
    if (sheetArea) sheetArea.style.display = "block";
    if (toggleBtn) toggleBtn.style.display = "inline-flex";
    if (copyBtn) copyBtn.style.display = "inline-flex";

    // 설정 저장
    if (typeof window.saveMVSettings === "function") {
      window.saveMVSettings();
    }

    console.log(`✅ 캐릭터 시트 생성 완료 (인물 ${charIndex})`);

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(`✅ 인물 ${charIndex} 캐릭터 시트가 생성되었습니다!`);
    }
  } catch (error) {
    console.error(`❌ 캐릭터 시트 생성 실패 (인물 ${charIndex}):`, error);
    alert(`캐릭터 시트 생성 중 오류가 발생했습니다:\n\n${error.message}`);
  } finally {
    if (btn) btn.disabled = false;
    if (loadingEl) loadingEl.style.display = "none";
  }
};

// --- Extracted character sheet helpers ---
window.toggleCharacterSheet = function (charIndex) {
  const sheetArea = document.getElementById(`mvCharacter${charIndex}_sheetArea`);
  if (sheetArea) {
    const isVisible = sheetArea.style.display !== "none";
    sheetArea.style.display = isVisible ? "none" : "block";
  }
};

window.copyCharacterSheet = function (charIndex, event) {
  const sheetEl = document.getElementById(`mvCharacter${charIndex}_sheet`);
  if (!sheetEl || !sheetEl.value.trim()) {
    alert("복사할 캐릭터 시트가 없습니다.");
    return;
  }
  navigator.clipboard.writeText(sheetEl.value).then(() => {
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(`📋 인물 ${charIndex} 캐릭터 시트가 복사되었습니다!`);
    }
  }).catch((err) => {
    console.error("복사 실패:", err);
    sheetEl.select();
    document.execCommand("copy");
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(`📋 인물 ${charIndex} 캐릭터 시트가 복사되었습니다!`);
    }
  });
};

window.getCharacterSheetSummary = function (charIndex) {
  const sheetEl = document.getElementById(`mvCharacter${charIndex}_sheet`);
  if (!sheetEl || !sheetEl.value.trim()) return "";

  const sheet = sheetEl.value;
  const sections = ["[Identity]", "[Body]", "[Face]", "[Hair]", "[Outfit]", "[Footwear]"];
  const lines = sheet.split("\n");
  let summary = "";
  let inSection = false;

  for (const line of lines) {
    const trimLine = line.trim();

    for (const sec of sections) {
      if (trimLine.startsWith(sec) || trimLine === sec) {
        inSection = true;
        summary += `\n${sec}\n`;
        break;
      }
    }

    if (inSection && trimLine.startsWith("-")) {
      summary += trimLine + "\n";
    }

    if (inSection && trimLine.startsWith("[") && !sections.some((s) => trimLine.startsWith(s))) {
      if (
        trimLine.startsWith("[Makeup]") ||
        trimLine.startsWith("[Pose]") ||
        trimLine.startsWith("[Accessories")
      ) {
        inSection = false;
      }
    }
  }

  return summary.trim();
};

window.getCharacterSheetFull = function (charIndex) {
  const sheetEl = document.getElementById(`mvCharacter${charIndex}_sheet`);
  return sheetEl?.value?.trim() || "";
};

window.getAllCharacterSheetsSummary = function () {
  const characterCount = parseInt(
    document.getElementById("mvCharacterCount")?.value || "1",
  );
  const summaries = [];
  for (let i = 1; i <= characterCount; i++) {
    const summary = window.getCharacterSheetSummary(i);
    if (summary) {
      summaries.push(`【인물 ${i} 캐릭터 시트 요약】\n${summary}`);
    }
  }
  return summaries.join("\n\n");
};

window.getAllCharacterSheetsFull = function () {
  const characterCount = parseInt(
    document.getElementById("mvCharacterCount")?.value || "1",
  );
  const fullSheets = [];
  for (let i = 1; i <= characterCount; i++) {
    const fullText = window.getCharacterSheetFull(i);
    if (fullText) {
      fullSheets.push(`【인물 ${i} 캐릭터 시트 전체 원본】\n${fullText}`);
    }
  }
  return fullSheets.join("\n\n---\n\n");
};

window.updateMVPromptTranslation = async function (type) {
  try {
    const koId = `mv${type.charAt(0).toUpperCase() + type.slice(1)}PromptKo`;
    const enId = `mv${type.charAt(0).toUpperCase() + type.slice(1)}PromptEn`;

    const koEl = document.getElementById(koId);
    const enEl = document.getElementById(enId);

    if (!koEl || !enEl) return;

    const koText = koEl.value.trim();
    if (!koText) {
      enEl.value = "";
      return;
    }

    // 번역 실행
    const translated = await translateKoreanToEnglishForScene(koText);
    if (translated) {
      enEl.value = translated;
    }
  } catch (error) {
    console.error("프롬프트 번역 오류:", error);
  }
};

// === MV Step 6: Prompt persistence and export ===
// window.generateMVThumbnailPrompts 함수는 js/step6.js에서 선언 및 구현됩니다. (중복 방지)

// 프롬프트 저장
window.saveMVPrompt = function (type) {
  try {
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
    };

    const ids = typeMap[type];
    if (!ids) return;

    const koEl = document.getElementById(ids.ko);
    const enEl = document.getElementById(ids.en);

    if (!koEl || !enEl) return;

    const data = {
      type: type,
      ko: koEl.value,
      en: enEl.value,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(`mvPrompt_${type}`, JSON.stringify(data));

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(`✅ ${type} 프롬프트가 저장되었습니다!`);
    } else {
      alert(`${type} 프롬프트가 저장되었습니다.`);
    }
  } catch (error) {
    console.error("프롬프트 저장 오류:", error);
    alert("프롬프트 저장 중 오류가 발생했습니다.");
  }
};

// 프롬프트 섹션 복사
window.copyMVPromptSection = function (type) {
  const koId = `mv${type.charAt(0).toUpperCase() + type.slice(1)}PromptKo`;
  const enId = `mv${type.charAt(0).toUpperCase() + type.slice(1)}PromptEn`;

  const koEl = document.getElementById(koId);
  const enEl = document.getElementById(enId);

  let text = "";
  const typeNames = {
    combined: "통합 프롬프트",
    background: "배경 프롬프트",
    character: "인물 프롬프트",
  };

  text += `=== ${typeNames[type]} ===\n\n`;

  if (koEl && koEl.value) {
    text += `[한글]\n${koEl.value}\n\n`;
  }
  if (enEl && enEl.value) {
    text += `[영어]\n${enEl.value}\n\n`;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => {
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          `✅ ${typeNames[type]}가 클립보드에 복사되었습니다!`,
        );
      } else {
        alert(`${typeNames[type]}가 클립보드에 복사되었습니다.`);
      }
    })
    .catch(() => {
      alert("복사 중 오류가 발생했습니다.");
    });
};

window.formatMVSceneExportMetadata = function (scene) {
  const lines = [];
  if (scene.lyrics) lines.push(`가사 구간: ${scene.lyrics}`);
  if (scene.location) lines.push(`장소: ${scene.location}`);
  if (scene.emotion) lines.push(`감정: ${scene.emotion}`);
  if (scene.mood) lines.push(`무드: ${scene.mood}`);
  if (scene.lighting) lines.push(`조명: ${scene.lighting}`);
  if (scene.cameraWork) lines.push(`카메라: ${scene.cameraWork}`);
  if (typeof scene.durationSeconds === "number") {
    lines.push(`길이: ${scene.durationSeconds}초`);
  }
  return lines.length ? `[씬 메타데이터]\n${lines.join("\n")}\n` : "";
};

window.getMVScenePromptForExport = function (scene, index, field = "prompt") {
  const textareaId = field === "promptKo" ? `scene_${index}_ko` : `scene_${index}_en`;
  const textareaValue = document.getElementById(textareaId)?.value || "";
  return textareaValue || scene[field] || "";
};

window.formatMVTableCell = function (value) {
  return String(value || "")
    .replace(/\t/g, " ")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

window.buildMVScenePromptTableText = function () {
  const scenes = Array.isArray(window.currentScenes) ? window.currentScenes : [];
  if (scenes.length === 0) return "";

  const headers = ["씬", "시간", "가사", "EN 프롬프트", "KO 설명"];
  const rows = scenes.map((scene, index) => {
    const enPrompt = window.getMVScenePromptForExport(scene, index, "prompt");
    const koPrompt = window.getMVScenePromptForExport(scene, index, "promptKo");
    return [
      index + 1,
      scene.time || "",
      scene.lyrics || "",
      enPrompt,
      koPrompt || scene.scene || "",
    ].map(window.formatMVTableCell);
  });

  return [headers, ...rows].map((row) => row.join("\t")).join("\n");
};

window.copyMVScenePromptTable = function () {
  const text = window.buildMVScenePromptTableText();
  if (!text) {
    alert("복사할 씬 프롬프트 표가 없습니다.");
    return;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => {
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          "✅ 씬 프롬프트 표가 클립보드에 복사되었습니다!",
        );
      } else {
        alert("씬 프롬프트 표가 클립보드에 복사되었습니다.");
      }
    })
    .catch((err) => {
      console.error("씬 프롬프트 표 복사 오류:", err);
      alert("씬 프롬프트 표 복사 중 오류가 발생했습니다.");
    });
};

window.getMVVideoToolConfig = function (tool) {
  const toolKey = String(tool || "runway").toLowerCase();
  const configs = {
    runway: {
      key: "runway",
      label: "Runway",
      filename: "mv-runway-prompts.txt",
      suffix:
        "cinematic motion, fluid movement, photorealistic, highly detailed, 8k, no text overlays, no watermark",
    },
    pika: {
      key: "pika",
      label: "Pika",
      filename: "mv-pika-prompts.txt",
      suffix:
        "animate as a polished music video shot, smooth subject motion, consistent character identity, no subtitles, no watermark",
    },
    kling: {
      key: "kling",
      label: "Kling",
      filename: "mv-kling-prompts.txt",
      suffix:
        "high-detail cinematic video, natural movement, stable subject identity, realistic camera motion, no text overlays, no watermark",
    },
  };
  return configs[toolKey] || configs.runway;
};

window.buildMVVideoToolScenePrompt = function (scene, index, tool) {
  const config = window.getMVVideoToolConfig(tool);
  const fallbackPrompt = window.getMVScenePromptForExport(scene, index, "prompt");
  const basePrompt =
    config.key === "runway" && scene.runwayPrompt
      ? scene.runwayPrompt
      : fallbackPrompt || scene.runwayPrompt || scene.scene || "cinematic music video scene";
  const promptParts = [basePrompt];

  if (scene.cameraWork) promptParts.push(`Camera: ${scene.cameraWork}`);
  if (scene.mood) promptParts.push(`Mood: ${scene.mood}`);
  if (scene.lighting) promptParts.push(`Lighting: ${scene.lighting}`);
  if (typeof scene.durationSeconds === "number") {
    promptParts.push(`Duration: ${scene.durationSeconds} seconds`);
  }
  promptParts.push(config.suffix);

  return promptParts.filter(Boolean).join(". ");
};

window.buildMVVideoToolPrompts = function (tool = "runway") {
  const config = window.getMVVideoToolConfig(tool);
  const scenes = Array.isArray(window.currentScenes) ? window.currentScenes : [];
  if (scenes.length === 0) return "";

  let text = `MV ${config.label} 영상 생성 프롬프트\n\n`;
  text += "공통 규칙: 같은 인물과 의상 정체성을 유지하고, 자막/워터마크/로고/왜곡된 손가락을 피합니다.\n\n";

  scenes.forEach((scene, index) => {
    text += `=== 씬 ${index + 1} (${scene.time || "시간 미정"}) ===\n`;
    text += `장면: ${scene.scene || ""}\n`;
    text += window.formatMVSceneExportMetadata(scene);
    text += `[${config.label} 프롬프트]\n`;
    text += `${window.buildMVVideoToolScenePrompt(scene, index, config.key)}\n\n`;

    const koPrompt = window.getMVScenePromptForExport(scene, index, "promptKo");
    if (koPrompt) {
      text += `[참고 한글]\n${koPrompt}\n\n`;
    }
  });

  return text;
};

window.copyMVVideoToolPrompts = function (tool = "runway") {
  const config = window.getMVVideoToolConfig(tool);
  const text = window.buildMVVideoToolPrompts(config.key);
  if (!text) {
    alert("복사할 영상 생성 프롬프트가 없습니다.");
    return;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => {
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          `✅ ${config.label} 영상 생성 프롬프트가 클립보드에 복사되었습니다!`,
        );
      } else {
        alert(`${config.label} 영상 생성 프롬프트가 클립보드에 복사되었습니다.`);
      }
    })
    .catch((err) => {
      console.error("영상 생성 프롬프트 복사 오류:", err);
      alert("영상 생성 프롬프트 복사 중 오류가 발생했습니다.");
    });
};

window.downloadMVVideoToolPrompts = function (tool = "runway") {
  const config = window.getMVVideoToolConfig(tool);
  const text = window.buildMVVideoToolPrompts(config.key);
  if (!text) {
    alert("다운로드할 영상 생성 프롬프트가 없습니다.");
    return;
  }

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = config.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.downloadMVPrompts = function () {
  if (!window.currentScenes || window.currentScenes.length === 0) {
    alert("다운로드할 프롬프트가 없습니다.");
    return;
  }

  let text = "MV 프롬프트\n\n";

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

  if (combinedKo || combinedEn) {
    text += "=== 통합 프롬프트 ===\n";
    if (combinedKo) text += `[한글]\n${combinedKo}\n\n`;
    if (combinedEn) text += `[영어]\n${combinedEn}\n\n`;
  }

  if (backgroundKo || backgroundEn) {
    text += "=== 배경 프롬프트 ===\n";
    if (backgroundKo) text += `[한글]\n${backgroundKo}\n\n`;
    if (backgroundEn) text += `[영어]\n${backgroundEn}\n\n`;
  }

  if (characterKo || characterEn) {
    text += "=== 인물 프롬프트 ===\n";
    if (characterKo) text += `[한글]\n${characterKo}\n\n`;
    if (characterEn) text += `[영어]\n${characterEn}\n\n`;
  }

  text += "=== 씬별 개별 프롬프트 ===\n\n";
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

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mv-prompts.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

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

// === MV Step 6: SRT export and preview ===

window.copySRTContent = function (event) {
  try {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (!window.currentSRTContent) {
      alert(
        '⚠️ 복사할 SRT 자막이 없습니다.\n\n먼저 "SRT 자막 생성" 버튼을 클릭하여 자막을 생성해주세요.',
      );
      return;
    }

    navigator.clipboard
      .writeText(window.currentSRTContent)
      .then(() => {
        if (typeof window.showCopyIndicator === "function") {
          window.showCopyIndicator("✅ SRT 자막이 클립보드에 복사되었습니다!");
        } else {
          alert("✅ SRT 자막이 클립보드에 복사되었습니다!");
        }
      })
      .catch(() => {
        // 폴백
        const textarea = document.createElement("textarea");
        textarea.value = window.currentSRTContent;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        if (typeof window.showCopyIndicator === "function") {
          window.showCopyIndicator("✅ SRT 자막이 클립보드에 복사되었습니다!");
        } else {
          alert("✅ SRT 자막이 클립보드에 복사되었습니다!");
        }
      });
  } catch (error) {
    console.error("❌ SRT 자막 복사 오류:", error);
    alert("SRT 자막 복사 중 오류가 발생했습니다:\n\n" + error.message);
  }
};

// SRT 파일 다운로드
window.downloadSRT = function (platform) {
  try {
    if (!window.currentSRTContent) {
      alert(
        '⚠️ 다운로드할 SRT 자막이 없습니다.\n\n먼저 "SRT 자막 생성" 버튼을 클릭하여 자막을 생성해주세요.',
      );
      return;
    }

    // 제목 가져오기
    const titleEl =
      document.getElementById("finalTitleText") ||
      document.getElementById("songTitle") ||
      document.getElementById("sunoTitle");
    const title = titleEl?.textContent || titleEl?.value || "자막";

    // 파일명 생성 (특수문자 제거)
    const safeTitle =
      title
        .replace(/[^a-zA-Z0-9가-힣\s]/g, "")
        .trim()
        .replace(/\s+/g, "_") || "subtitle";
    const filename = `${safeTitle}.srt`;

    // 플랫폼에 따라 줄바꿈 문자 결정
    const lineEnding = platform === "win" ? "\r\n" : "\n";

    // 줄바꿈 문자 변환
    let srtContent = window.currentSRTContent;
    if (platform === "win") {
      srtContent = srtContent.replace(/\n/g, "\r\n");
    }

    // Blob 생성 및 다운로드
    const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const platformName = platform === "win" ? "윈도우용" : "맥용";
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ ${platformName} SRT 파일이 다운로드되었습니다!\n\n파일명: ${filename}`,
      );
    } else {
      alert(
        `✅ ${platformName} SRT 파일이 다운로드되었습니다!\n\n파일명: ${filename}`,
      );
    }

    console.log("✅ SRT 파일 다운로드 완료:", filename);
  } catch (error) {
    console.error("❌ SRT 파일 다운로드 오류:", error);
    alert("SRT 파일 다운로드 중 오류가 발생했습니다:\n\n" + error.message);
  }
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

    const toSRTTime = (seconds) => {
      const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
      const hours = Math.floor(safeSeconds / 3600);
      const minutes = Math.floor((safeSeconds % 3600) / 60);
      const secs = safeSeconds % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},000`;
    };

    const sceneSubtitles = Array.isArray(window.currentScenes)
      ? window.currentScenes
          .filter(
            (scene) =>
              scene &&
              scene.lyrics &&
              typeof scene.startSeconds === "number" &&
              typeof scene.endSeconds === "number" &&
              scene.endSeconds > scene.startSeconds,
          )
          .map((scene) => {
            const meta = [scene.location, scene.emotion, scene.mood]
              .filter(Boolean)
              .join(" · ");
            return {
              startTime: toSRTTime(scene.startSeconds),
              endTime: toSRTTime(scene.endSeconds),
              text: meta ? `${scene.lyrics}\n[${meta}]` : scene.lyrics,
            };
          })
      : [];

    if (sceneSubtitles.length > 0) {
      let srtContent = "";
      sceneSubtitles.forEach((subtitle, index) => {
        srtContent += `${index + 1}\n`;
        srtContent += `${subtitle.startTime} --> ${subtitle.endTime}\n`;
        srtContent += `${subtitle.text}\n\n`;
      });

      const previewEl = document.getElementById("srtPreview");
      if (previewEl) {
        previewEl.innerHTML = `
                <div style="padding: 20px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border);">
                    <h4 style="margin: 0 0 15px 0; color: var(--text-primary); font-size: 1.1rem;">
                        <i class="fas fa-file-alt"></i> 생성된 SRT 자막 (${sceneSubtitles.length}개 자막)
                    </h4>
                    <pre style="background: var(--bg-input); padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 0.85rem; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; word-wrap: break-word; max-height: 400px; overflow-y: auto;">${escapeHtml(srtContent)}</pre>
                </div>
            `;
      }

      window.currentSRTContent = srtContent;

      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          `✅ SRT 자막이 생성되었습니다! (${sceneSubtitles.length}개 자막)`,
        );
      } else {
        alert(`✅ SRT 자막이 생성되었습니다! (${sceneSubtitles.length}개 자막)`);
      }

      console.log("✅ SRT 자막 생성 완료:", sceneSubtitles.length, "개 자막");
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
        const translated = await translateKoreanToEnglishForScene(koText);
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

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
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
          throw new Error(`API 오류: ${response.status} ${errData.error?.message || response.statusText}`);
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
                                <div style="font-size: 0.84rem; color: var(--text-secondary);">Runway, Pika, Kling용 씬별 프롬프트와 씬 표를 복사하거나 TXT로 저장합니다.</div>
                            </div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
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
                                <button class="btn btn-small btn-primary" onclick="regenerateScenePrompt(${index})" style="padding: 4px 8px; font-size: 0.75rem;">재생성</button>
                                <span id="scene_${index}_dirty" class="mv-scene-unsaved-badge" data-scene-index="${index}" data-dirty="false" style="display: none; padding: 3px 8px; border-radius: 999px; background: rgba(245, 158, 11, 0.14); border: 1px solid rgba(245, 158, 11, 0.45); color: #f59e0b; font-size: 0.72rem; font-weight: 700;">미저장</span>
                                <button id="saveScenePromptBtn_${index}" class="btn btn-small btn-success" onclick="saveScenePrompt(${index})" style="padding: 4px 8px; font-size: 0.75rem;">저장</button>
                                </div>
                            </div>
                        <div style="margin-bottom: 15px; padding: 12px; background: var(--bg-input); border-radius: 6px;">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">장면:</div>
                            <div style="color: var(--text-primary);">${scene.scene || "장면 설명"}</div>
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

【스타일】
${stylePrompt || "감성적인 발라드"}

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
- **가사 내용을 가장 우선적으로 상세히 시각화하세요**
- **미세한 카메라 워크와 피사체의 움직임을 필수로 묘사하세요**
- 영어 프롬프트는 단일 단락, 순수 영어만 (한글 없음)
- JSON 형식만 출력`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse =
          data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const aiPrompts = safeJsonParse(aiResponse);
        if (aiPrompts) {
          if (aiPrompts) {
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
            throw new Error("AI 응답을 JSON으로 파싱할 수 없습니다.");
          }
        } else {
          throw new Error("AI 응답에서 JSON 데이터를 찾을 수 없습니다.");
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`API 오류: ${response.status} ${errData.error?.message || response.statusText}`);
      }
    } else {
      const sceneContext = getMVSceneRegenerationContext(scene, {
        location,
        mood,
        lighting,
        cameraWork,
      });
      const sceneSeed = [scene.scene, scene.lyrics]
        .filter(Boolean)
        .filter((value, idx, arr) => arr.indexOf(value) === idx)
        .join(", ");
      const basicPrompt = `/* Scene ${sceneIndex + 1} */ ${sceneSeed || "music scene"}, ${stylePrompt || "cinematic"}, ${sceneContext.promptParts || location || "visual setting"}, ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio`;
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

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ 씬 ${sceneIndex + 1} 프롬프트가 저장되었습니다.`,
      );
    }
  } catch (error) {
    console.error("씬 프롬프트 저장 오류:", error);
  }
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
    badge.textContent = isDirty ? "미저장" : "";
  }

  if (saveButton) {
    saveButton.dataset.dirty = isDirty ? "true" : "false";
    saveButton.title = isDirty
      ? "이 씬에 저장되지 않은 변경이 있습니다"
      : "이 씬 프롬프트 저장";
  }

  if (card?.classList) {
    card.classList.toggle("mv-scene-dirty", !!isDirty);
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

    const scene = window.currentScenes[sceneIndex];
    if (typeof window.updateMVSceneTimelineFromEditor === "function") {
      window.updateMVSceneTimelineFromEditor(scene, sceneIndex);
    }
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
      const sceneContext = getMVSceneRegenerationContext(scene);
      const prompt = `다음 씬 설명을 기반으로 **세밀하고 상세한** 통합 영어 프롬프트를 1개 생성하세요.

【씬 설명 / 가사】
"${scene.lyrics || scene.scene || cleanLyrics}"

【스타일】
${stylePrompt || "감성적인 발라드"}

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

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
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
        } else {
          throw new Error("AI 응답이 비어있습니다.");
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`API 오류: ${response.status} ${errData.error?.message || response.statusText}`);
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
    alert(`씬 프롬프트 재생성 중 오류가 발생했습니다: ${error.message}`);
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
