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
  `;

  scenes.forEach((scene, index) => {
    let existingPrompt = scene.prompt || "";
    existingPrompt = existingPrompt.replace(/\/\*\s*Scene\s+\d+\s*\*\//gi, "").trim();
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
                            ${scene._isFilled ? `<span style="background: #e67e22; color: white; font-size: 0.7rem; padding: 2px 8px; border-radius: 12px; font-weight: 700;">⚠ 자동보충 (재생성 권장)</span>` : ""}
                        </div>
                        <div style="display: flex; gap: 8px;">
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

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
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

    // 전체 씬에 매핑할 가사 사전 배분 (1:1 매치 유지)
    const preAllocatedLyrics = [];
    for (let i = 0; i < imageCount; i++) {
        const startIdx = Math.floor((i / imageCount) * lyricsLines.length);
        const endIdx = Math.max(startIdx + 1, Math.floor(((i + 1) / imageCount) * lyricsLines.length));
        let allocated = lyricsLines.slice(startIdx, endIdx).join(" ").trim();
        if (!allocated && lyricsLines.length > 0) {
            allocated = lyricsLines[Math.min(startIdx, lyricsLines.length - 1)] || "";
        }
        preAllocatedLyrics.push(allocated);
    }

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
                getArtisticKeywords(mood || ""),
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

// --- Extracted getMVLocationValues ---
window.getMVLocationValues = function () {
  const container = document.getElementById("mvLocationTags");
  if (!container) return [];
  const activeTags = container.querySelectorAll(".tag-btn.active");
  return Array.from(activeTags)
    .map((btn) => btn.getAttribute("data-value"))
    .filter((v) => !!v);
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
    window.currentProject.data.marketing.mvScenes = JSON.parse(
      JSON.stringify(window.currentScenes),
    );
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
      let sceneLyrics = scene.scene || "";
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
      const basicPrompt = `/* Scene ${sceneIndex + 1} */ ${scene.scene || "music scene"}, ${stylePrompt || "cinematic"}, ${location || "visual setting"}, ${lighting || "natural lighting"}, ${cameraWork || "medium shot"}, ${mood || "emotional mood"}, ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio`;
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
      const prompt = `다음 씬 설명을 기반으로 **세밀하고 상세한** 통합 영어 프롬프트를 1개 생성하세요.

【씬 설명 / 가사】
"${scene.scene || cleanLyrics}"

【스타일】
${stylePrompt || "감성적인 발라드"}

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
