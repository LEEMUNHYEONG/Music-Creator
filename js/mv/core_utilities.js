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

function extractMVSceneArrayFromAIResponse(aiResponse) {
  if (!aiResponse) return [];
  const cleanedResponse = String(aiResponse)
    .trim()
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/^json\s*/gi, "")
    .trim();

  const parsed = safeJsonParse(cleanedResponse);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.scenes)) return parsed.scenes;

  const arrayStart = cleanedResponse.indexOf("[");
  const arrayEnd = cleanedResponse.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    const arrayParsed = safeJsonParse(cleanedResponse.substring(arrayStart, arrayEnd + 1));
    if (Array.isArray(arrayParsed)) return arrayParsed;
  }

  const objectStart = cleanedResponse.indexOf("{");
  const objectEnd = cleanedResponse.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) {
    const objectParsed = safeJsonParse(cleanedResponse.substring(objectStart, objectEnd + 1));
    if (Array.isArray(objectParsed?.scenes)) return objectParsed.scenes;
  }

  return [];
}

function getMVGeneratedSceneTime(globalIdx, interval, totalSeconds) {
  const startTime = globalIdx * interval;
  const endTime = Math.min(startTime + interval, totalSeconds);
  const startMin = Math.floor(startTime / 60);
  const startSec = Math.floor(startTime % 60);
  const endMin = Math.floor(endTime / 60);
  const endSec = Math.floor(endTime % 60);
  return `${startMin}:${String(startSec).padStart(2, "0")}-${endMin}:${String(endSec).padStart(2, "0")}`;
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

/**
 * 미드저니 프롬프트에서 수노(Suno) 스타일 전용 음악 키워드, 수노 부정어(-...), 가사 추임새 특수문자를 정제합니다.
 * @param {string} promptText 정제할 프롬프트 텍스트
 * @returns {string} 수노 전용 요소가 필터링된 순수 미드저니 시각 프롬프트
 */
function cleanMidjourneyPrompt(promptText) {
  if (!promptText) return "";
  let clean = String(promptText);

  // 1. 특수 하이픈 정규화
  clean = clean.replace(/‑/g, "-");

  // 2. 수노 부정 프롬프트 전체 제거 (-harsh treble, -piercing high notes 등 -로 시작하는 항목)
  // 단, Midjourney 파라미터(--ar, --v, --no 등)는 유지
  clean = clean.replace(/(?:^|,|\s)-(?!-)[^\,\n\/\*]+/gi, "");

  // 3. 수노용 음악 기술/믹스/사운드/보컬/장르 키워드 패턴 제거
  const sunoMusicTerms = [
    /\b\d+\s*bpm\b/gi,
    /\b(korean\s+)?acoustic\s+folk-pop\b/gi,
    /\bwhimsical\s+chamber\s+pop\b/gi,
    /\b60s\s+chamber\s+pop\b/gi,
    /\bbright\s+acoustic\s+guitar\s+strums\b/gi,
    /\bupright\s+piano\s+arpeggios\b/gi,
    /\bbrushed\s+snare\s+kit\b/gi,
    /\brounded\s+electric\s+bass\b/gi,
    /\bpizzicato\s+string\s+figures\b/gi,
    /\bglockenspiel\s+accents\b/gi,
    /\bgentle\s+handclaps\b/gi,
    /\bfield\s+ambience\b/gi,
    /\bwordless\s+humming\s+hook\b/gi,
    /\bclear\s+young\s+adult\s+vocal\b/gi,
    /\bsoft\s+harmony\s+replies\b/gi,
    /\btape\s+saturation\b/gi,
    /\bclean\s+vocal-forward\s+mix\b/gi,
    /\bplayful\s+courage\b/gi,
    /\bbittersweet\s+childhood\b/gi,
    /\bautotune\b/gi,
    /\bmetallic\s+synth\b/gi,
    /\bdistorted\s+clipping\b/gi,
    /\bmuddy\s+low\s+end\b/gi,
    /\blo-fi\s+noise\b/gi,
    /\bchaotic\s+drums\b/gi,
    /\boverly\s+busy\s+arrangement\b/gi,
    /\bsudden\s+genre\s+switch\b/gi,
    /\bunclear\s+korean\s+pronunciation\b/gi,
    /\bspoken\s+narration\b/gi,
    /\bcomedy\s+voice\b/gi,
    /\bchildish\s+cartoon\s+voice\b/gi,
    /\bnursery\s+rhyme\s+feeling\b/gi,
    /\bliteral\s+solfege\s+singing\b/gi,
    /\boverly\s+sad\s+ballad\s+mood\b/gi,
    /\bfuneral\s+mood\b/gi,
    /\bheavy\s+rock\s+distortion\b/gi,
    /\bedm\s+drop\b/gi,
    /\bcheap\s+club\s+synth\b/gi,
  ];

  for (const termRegex of sunoMusicTerms) {
    clean = clean.replace(termRegex, "");
  }

  // 4. 한글 음악 프롬프트 키워드 제거
  const sunoKoreanTerms = [
    /한국의\s*어쿠스틱\s*포크\s*팝/g,
    /기발한\s*챔버\s*팝/g,
    /밝은\s*어쿠스틱\s*기타\s*스트럼/g,
    /업라이트\s*피아노\s*아르페지오/g,
    /브러시\s*스네어\s*드럼/g,
    /둥글둥글한\s*일렉트릭\s*베이스/g,
    /피치카토\s*스트링/g,
    /글로켄슈필\s*악센트/g,
    /부드러운\s*손뼉/g,
    /자연의\s*소리/g,
    /단어\s*없이\s*중얼거리는\s*훅/g,
    /맑은\s*청년\s*보컬/g,
    /부드러운\s*화음/g,
    /테이프\s*포화/g,
    /보컬\s*중심\s*믹스/g,
    /60년대\s*챔버\s*팝/g,
    /장난기\s*어린\s*용기/g,
    /달콤씁쓸한\s*어린\s*시절/g,
  ];

  for (const termRegex of sunoKoreanTerms) {
    clean = clean.replace(termRegex, "");
  }

  // 5. 가사 추임새/파편 및 불필요한 기호 정리
  clean = clean.replace(/음[\s—\-–,~.]*/gi, "");
  clean = clean.replace(/([,\s._—–-]{2,})/g, ", ");

  // 6. 구두점 및 연속 쉼표 정리
  clean = clean
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== "." && part !== "-" && part !== "—")
    .join(", ");

  clean = clean.replace(/^(,\s*)+/, "").replace(/(,\s*)+$/, "").trim();

  return clean;
}

/**
 * 미드저니 영어 프롬프트에서 수노 음악 요소를 제거함은 물론, 
 * 실수로 섞여 들어간 한글 단어/가사/문장을 100% 제거하여 pure English 상태로 만듭니다.
 * @param {string} promptText 정제할 프롬프트
 * @returns {string} 순수 영어로만 구성된 미드저니 프롬프트
 */
function cleanEnglishMidjourneyPrompt(promptText) {
  if (!promptText) return "";
  let clean = cleanMidjourneyPrompt(promptText);

  // 씬 라벨(/* Scene N */ 또는 [Scene N of M]) 보존
  let sceneHeader = "";
  const headerMatch = clean.match(/^(\/\*\s*Scene\s+\d+\s*(?:of\s+\d+)?\s*\*\/|\[\s*Scene\s+\d+\s*(?:of\s+\d+)?\s*\])\s*/i);
  if (headerMatch) {
    sceneHeader = headerMatch[0];
    clean = clean.substring(sceneHeader.length);
  }

  // 가사 구조 대괄호 태그([Verse], [Chorus] 등) 제거
  clean = clean.replace(/\[\s*(?:Verse|Chorus|Intro|Outro|Bridge|Pre-Chorus|Hook|Break|Solo|Interlude)\b[^\]]*\]/gi, "");

  // 한글(가-힣, ㄱ-ㅎ, ㅏ-ㅣ) 및 따옴표에 싸인 한글 문장 완전히 제거
  clean = clean.replace(/"[^"]*[\u3131-\u318E\uAC00-\uD7A3][^"]*"/g, "");
  clean = clean.replace(/[\u3131-\u318E\uAC00-\uD7A3]+/g, "");

  // 특수문자 파편 정리 및 연속 쉼표 정리
  clean = clean.replace(/scene depicting:\s*""/gi, "");
  clean = clean.replace(/scene depicting:\s*,/gi, "");
  clean = clean.replace(/([,\s._—–-]{2,})/g, ", ");

  clean = clean
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== "." && part !== "-" && part !== "—" && !/[\u3131-\u318E\uAC00-\uD7A3]/.test(part))
    .join(", ");

  clean = clean.replace(/^(,\s*)+/, "").replace(/(,\s*)+$/, "").trim();

  // 만약 한글 제거 후 영문 본문이 비어있거나 지나치게 짧다면 영문 기본 비주얼 묘사 추가
  if (clean.length < 10) {
    clean = "cinematic music video scene, atmospheric lighting, detailed background, professional photography, ultra high quality, 8k resolution, photorealistic, 16:9 aspect ratio";
  }

  return sceneHeader ? `${sceneHeader}${clean}` : clean;
}

window.cleanMidjourneyPrompt = cleanMidjourneyPrompt;
window.cleanEnglishMidjourneyPrompt = cleanEnglishMidjourneyPrompt;

/**
 * Gemini API를 호출합니다.
 * - 실제 개인 API 키가 있으면: generativelanguage.googleapis.com 직접 호출
 * - 플레이스홀더 키(프록시 인증)이면: /api/gemini 프록시 경로 호출
 *
 * @param {string} prompt - 전송할 프롬프트 텍스트
 * @param {object} generationConfig - Gemini generationConfig 객체
 * @param {string} [geminiKey] - Gemini API 키 (생략 시 window.getGeminiApiKey() 사용)
 * @returns {Promise<string>} AI 응답 텍스트
 */
async function callGeminiWithAutoRoute(prompt, generationConfig, geminiKey) {
  const key = geminiKey || (window.getGeminiApiKey ? window.getGeminiApiKey() : "");
  const model = window.getGeminiModel ? window.getGeminiModel() : "gemini-2.5-flash";

  // 실제 개인 키 여부 확인 (플레이스홀더 제외)
  const isRealKey = key && key.startsWith("AIza") && !key.includes("Proxy");

  if (isRealKey) {
    // 개인 키 보유 사용자: 직접 외부 API 호출 (fetch 인터셉터가 통과시킴)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: generationConfig || { temperature: 0.8, maxOutputTokens: 4096 },
      }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Gemini 직접 호출 오류 ${response.status}: ${errData?.error?.message || response.statusText}`);
    }
    const data = await response.json();
    if (window.logApiUsage) window.logApiUsage("gemini");
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) throw new Error("Gemini API 응답이 비어있습니다.");
    return text;
  } else {
    // 프록시 인증 사용자: /api/gemini 프록시 경로 호출
    const user = window.firebaseAuth?.currentUser || (window.firebase?.auth?.()?.currentUser);
    const headers = { "Content-Type": "application/json" };
    if (user) {
      headers["Authorization"] = `Bearer ${await user.getIdToken()}`;
    }
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt,
        model,
        generationConfig,
        temperature: generationConfig?.temperature ?? 0.8,
        maxOutputTokens: generationConfig?.maxOutputTokens ?? 4096,
      }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Gemini 프록시 오류 ${response.status}: ${errData?.error?.message || response.statusText}`);
    }
    const data = await response.json();
    if (window.logApiUsage) window.logApiUsage("gemini");
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) throw new Error("Gemini 프록시 응답이 비어있습니다.");
    return text;
  }
}

window.callGeminiWithAutoRoute = callGeminiWithAutoRoute;
