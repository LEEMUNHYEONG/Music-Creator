// js/api.js - Extracted Logic

// AI 공급자 직접 호출을 인증된 Firebase Functions 프록시로 전환합니다.
// 기존 기능의 요청/응답 형식은 유지하면서 공용 API 키가 브라우저에 노출되지 않게 합니다.
(function installSecureAIProxyFetch() {
  if (window.__secureAIProxyFetchInstalled || typeof window.fetch !== "function") return;

  const nativeFetch = window.fetch.bind(window);
  window.__nativeFetch = nativeFetch;
  const hostedOrigin = "https://music-creator-app-92d15.web.app";

  function getProxyUrl(path) {
    const isHostedApp =
      location.hostname === "music-creator-app-92d15.web.app" ||
      location.hostname === "music-creator-app-92d15.firebaseapp.com";
    return `${isHostedApp ? "" : hostedOrigin}${path}`;
  }

  async function getAuthHeaders(initHeaders) {
    const headers = new Headers(initHeaders || {});
    headers.set("Content-Type", "application/json");
    const user = window.firebaseAuth?.currentUser;
    if (user) {
      headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
    }
    return headers;
  }

  window.fetch = async function secureAIProxyFetch(input, init = {}) {
    const url = typeof input === "string" ? input : input?.url || "";
    const isOpenAI = url.startsWith(
      "https://api.openai.com/v1/chat/completions",
    );
    const isGemini =
      url.startsWith("https://generativelanguage.googleapis.com/") &&
      url.includes(":generateContent");

    if (!isOpenAI && !isGemini) {
      return nativeFetch(input, init);
    }

    const user = window.firebaseAuth?.currentUser;
    
    // 로컬스토리지 또는 전역 설정에 등록된 실제 사용자 개인 API 키 확인
    const localOpenAIKey = localStorage.getItem("openai_api_key") || (window.globalConfig && window.globalConfig.openai_api_key) || "";
    const localGeminiKey = localStorage.getItem("gemini_api_key") || (window.globalConfig && window.globalConfig.gemini_api_key) || "";
    
    const hasRealLocalOpenAIKey = localOpenAIKey && localOpenAIKey.startsWith("sk-") && !localOpenAIKey.includes("proxy");
    const hasRealLocalGeminiKey = localGeminiKey && localGeminiKey.startsWith("AIza") && !localGeminiKey.includes("proxy");

    // 개인 키를 직접 사용해 브라우저 다이렉트 호출을 의도한 경우: 로그인 여부와 관계없이 nativeFetch 허용
    if (isOpenAI && hasRealLocalOpenAIKey) {
      return nativeFetch(input, init);
    }
    if (isGemini && hasRealLocalGeminiKey) {
      return nativeFetch(input, init);
    }

    // 그렇지 않고 프록시 서버 호출이 기본값인데 로그인이 안 된 경우: 다이렉트 외부 호출 차단 및 401 Unauthorized 에러 모사 응답
    if (!user) {
      console.error(`[SecureAIProxy] 로그인 정보가 유실되어 다이렉트 API 호출을 차단했습니다. URL: ${url}`);
      return new Response(JSON.stringify({
        error: {
          message: "로그인 세션이 유실되었거나 유효하지 않습니다. 로그인 상태를 확인해 주세요.",
          status: "UNAUTHENTICATED"
        }
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const headers = await getAuthHeaders(init.headers);
    const rawBody = typeof init.body === "string" ? init.body : "{}";
    const body = JSON.parse(rawBody || "{}");

    if (isOpenAI) {
      headers.delete("Authorization");
      headers.set(
        "Authorization",
        `Bearer ${await window.firebaseAuth.currentUser.getIdToken()}`,
      );
      return nativeFetch(getProxyUrl("/api/chat"), {
        ...init,
        headers,
        body: JSON.stringify(body),
      });
    }

    const modelMatch = url.match(/\/models\/([^:/?]+):generateContent/);
    return nativeFetch(getProxyUrl("/api/gemini"), {
      ...init,
      headers,
      body: JSON.stringify({
        model: modelMatch?.[1] || body.model || (window.getGeminiModel ? window.getGeminiModel() : "gemini-2.0-flash"),
        contents: body.contents,
        prompt: body.prompt,
        generationConfig: body.generationConfig,
      }),
    });
  };

  window.__secureAIProxyFetchInstalled = true;
})();

window.testServerAIProxy = async function (provider, customKey = "") {
  const isGemini = provider === "gemini";
  const hasRealKey = isGemini 
    ? (customKey && customKey.startsWith("AIza") && !customKey.includes("proxy"))
    : (customKey && customKey.startsWith("sk-") && !customKey.includes("proxy"));

  if (hasRealKey) {
    const fetchFunc = window.__nativeFetch || window.fetch;
    if (isGemini) {
      const currentGeminiModel = window.getGeminiModel ? window.getGeminiModel() : "gemini-2.0-flash";
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentGeminiModel}:generateContent?key=${customKey}`;
      const response = await fetchFunc(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with OK only." }] }],
          generationConfig: {
            maxOutputTokens: 8,
            temperature: 0
          }
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errMsg = data.error?.message || data.error || `${provider} API 직접 호출 오류: ${response.status}`;
        throw new Error(errMsg);
      }
      return true;
    } else {
      const openaiUrl = "https://api.openai.com/v1/chat/completions";
      const currentOpenAIModel = window.getOpenAIModel ? window.getOpenAIModel() : "gpt-4o-mini";
      const response = await fetchFunc(openaiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${customKey}`
        },
        body: JSON.stringify({
          model: currentOpenAIModel,
          messages: [{ role: "user", content: "Reply with OK only." }],
          max_tokens: 8,
          temperature: 0
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errMsg = data.error?.message || data.error || `${provider} API 직접 호출 오류: ${response.status}`;
        throw new Error(errMsg);
      }
      return true;
    }
  }

  const user = window.firebaseAuth?.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");

  const origin =
    location.hostname === "music-creator-app-92d15.web.app" ||
    location.hostname === "music-creator-app-92d15.firebaseapp.com"
      ? ""
      : "https://music-creator-app-92d15.web.app";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${await user.getIdToken()}`,
  };
  const response = await fetch(`${origin}${isGemini ? "/api/gemini" : "/api/chat"}`, {
    method: "POST",
    headers,
    body: JSON.stringify(
      isGemini
        ? {
            model: (window.getGeminiModel ? window.getGeminiModel() : "gemini-2.0-flash"),
            prompt: "Reply with OK only.",
            maxOutputTokens: 8,
            temperature: 0,
          }
        : {
            model: (window.getOpenAIModel ? window.getOpenAIModel() : "gpt-4o-mini"),
            messages: [{ role: "user", content: "Reply with OK only." }],
            max_tokens: 8,
            temperature: 0,
          },
    ),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const errMsg = data.error?.message || data.error || `${provider} 프록시 오류: ${response.status}`;
    throw new Error(errMsg);
  }
  return true;
};

// --- Extracted callAPIWithRetry ---
window.callAPIWithRetry = async function (apiCall, context, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      const errorInfo = await window.handleAPIError(error, context, maxRetries);

      if (!errorInfo.shouldRetry || attempt === maxRetries) {
        window.showToast(`${errorInfo.userMessage}\n\n상세: ${errorInfo.error}`, "info");
        throw error;
      }

      console.warn(
        `재시도 ${attempt}/${maxRetries} (${context}):`,
        errorInfo.error,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, errorInfo.retryDelay * attempt),
      );
    }
  }
};

// --- Extracted handleAPIError ---
window.handleAPIError = async function (error, context, maxRetries = 3) {
  console.error(`API 오류 (${context}):`, error);

  let userMessage = "오류가 발생했습니다";
  let shouldRetry = false;
  let retryDelay = 1000;

  // 네트워크 오류
  if (error.message && error.message.includes("fetch")) {
    userMessage = "네트워크 연결을 확인해주세요";
    shouldRetry = true;
  }
  // API 키 오류
  else if (
    error.message &&
    (error.message.includes("401") || error.message.includes("유효하지 않"))
  ) {
    userMessage = "API 키가 유효하지 않습니다. API 키 설정을 확인해주세요";
    shouldRetry = false;
  }
  // Rate limit
  else if (error.message && error.message.includes("429")) {
    userMessage = "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요";
    shouldRetry = true;
    retryDelay = 60000; // 1분 대기
  }
  // 타임아웃
  else if (error.message && error.message.includes("timeout")) {
    userMessage = "요청 시간이 초과되었습니다. 다시 시도해주세요";
    shouldRetry = true;
  }
  // 서버 오류
  else if (
    error.message &&
    (error.message.includes("500") || error.message.includes("503"))
  ) {
    userMessage = "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요";
    shouldRetry = true;
    retryDelay = 5000;
  }

  return {
    userMessage,
    shouldRetry,
    retryDelay,
    error: error.message || error,
  };
};

// --- Utilities ---
window.extractLyricsOnly = function (lyrics) {
  if (!lyrics) return "";
  return lyrics
    .replace(/\[[\s\S]*?\]/g, "")
    .replace(/\([\s\S]*?\)/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join("\n");
};

// --- Extracted translateEnglishToKoreanForScene ---
const sceneOverviewTranslationCache = {};
async function translateEnglishToKoreanForScene(fieldName, englishText) {
  if (!englishText || !englishText.trim()) return "";

  // 캐시 확인
  const cacheKey = `${fieldName}_${englishText}`;
  if (sceneOverviewTranslationCache[cacheKey]) {
    return sceneOverviewTranslationCache[cacheKey];
  }

  try {
    // 공용 키 또는 개인 키 가져오기 (admin 설정값 포함)
    const openaiKey = (typeof window.getOpenAIApiKey === "function") ? window.getOpenAIApiKey() : (localStorage.getItem("openai_api_key") || "");
    const geminiKey = (typeof window.getGeminiApiKey === "function") ? window.getGeminiApiKey() : (localStorage.getItem("gemini_api_key") || "");

    if ((!openaiKey || !openaiKey.startsWith("sk-")) && (!geminiKey || !geminiKey.startsWith("AIza"))) {
      console.warn("번역 API 키가 없어 번역을 건너뜁니다.");
      return englishText; // 번역 실패 시 원본 반환
    }

    // 필드별 프롬프트
    const fieldPrompts = {
      location:
        "다음은 MV 프롬프트의 장소 설명입니다. 이를 자연스러운 한국어로 번역해주세요.",
      mood: "다음은 MV 프롬프트의 분위기 설명입니다. 이를 자연스러운 한국어로 번역해주세요.",
      lighting:
        "다음은 MV 프롬프트의 조명 설명입니다. 이를 자연스러운 한국어로 번역해주세요.",
      characterAction:
        "다음은 MV 프롬프트의 인물 동작 설명입니다. 이를 자연스러운 한국어로 번역해주세요.",
      expression:
        "다음은 MV 프롬프트의 표정 설명입니다. 이를 자연스러운 한국어로 번역해주세요.",
      cameraWork:
        "다음은 MV 프롬프트의 카메라 워크 설명입니다. 이를 자연스러운 한국어로 번역해주세요.",
    };

    const prompt = `${fieldPrompts[fieldName] || "다음 영어 텍스트를 자연스러운 한국어로 번역해주세요:"}

영어:
${englishText}

요구사항:
1. 자연스러운 한국어로 번역
2. 전문 용어는 이해하기 쉽게 번역
3. 설명 없이 번역만 출력

한국어:`;

    let translation = "";
    try {
      const token = (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) 
        ? await window.firebase.auth().currentUser.getIdToken() 
        : null;
      
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // OpenAI 우선 사용 (기본값)
      let useGemini = false;
      const selectedAPI = localStorage.getItem("selectedAPI") || "openai";
      if (selectedAPI === "gemini") useGemini = true;

      if (!useGemini) {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: (window.getOpenAIModel ? window.getOpenAIModel() : "gpt-4o-mini"),
            messages: [
              { role: "system", content: "당신은 번역 전문가입니다. 번역만 출력하세요." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 1000,
          }),
        });
        if (!response.ok) throw new Error(`OpenAI Proxy 오류: ${response.status}`);
        const data = await response.json();
        translation = data.choices?.[0]?.message?.content || "";
      } else {
        const response = await fetch("/api/gemini", {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt: prompt,
            model: (window.getGeminiModel ? window.getGeminiModel() : "gemini-2.0-flash"),
            temperature: 0.3,
            maxOutputTokens: 1000,
          }),
        });
        if (!response.ok) throw new Error(`Gemini Proxy 오류: ${response.status}`);
        const data = await response.json();
        translation = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } catch (apiErr) {
      console.warn("Proxy 번역 실패, 원본 유지:", apiErr);
      return englishText;
    }

    translation = translation.trim();

    // 불필요한 설명 제거
    translation = translation
      .replace(/^한국어[:\s]*/gi, "")
      .replace(/^번역[:\s]*/gi, "")
      .replace(/^Korean[:\s]*/gi, "")
      .replace(/```[\s\S]*?```/g, "")
      .trim();

    if (translation) {
      sceneOverviewTranslationCache[cacheKey] = translation;
      return translation;
    }

    return englishText; // 번역 실패 시 원본 반환
  } catch (error) {
    console.error(`영어→한글 번역 오류 (${fieldName}):`, error);
    return englishText; // 번역 실패 시 원본 반환
  }
}

window.translateEnglishToKoreanForScene = translateEnglishToKoreanForScene;

// --- Extracted translateKoreanToEnglishForScene ---
async function translateKoreanToEnglishForScene(fieldName, koreanText) {
  if (!koreanText || !koreanText.trim()) return "";

  try {
    // 공용 키 또는 개인 키 가져오기 (admin 설정값 포함)
    const openaiKey = (typeof window.getOpenAIApiKey === "function") ? window.getOpenAIApiKey() : (localStorage.getItem("openai_api_key") || "");
    const geminiKey = (typeof window.getGeminiApiKey === "function") ? window.getGeminiApiKey() : (localStorage.getItem("gemini_api_key") || "");

    if ((!openaiKey || !openaiKey.startsWith("sk-")) && (!geminiKey || !geminiKey.startsWith("AIza"))) {
      console.warn("번역 API 키가 없어 번역을 건너뜁니다.");
      return koreanText; // 번역 실패 시 원본 반환
    }

    // 필드별 프롬프트
    const fieldPrompts = {
      location:
        "다음은 MV 프롬프트의 장소 설명입니다. 이를 Midjourney 이미지 생성용 영어 프롬프트로 번역해주세요.",
      mood: "다음은 MV 프롬프트의 분위기 설명입니다. 이를 영어로 번역해주세요.",
      lighting:
        "다음은 MV 프롬프트의 조명 설명입니다. 이를 Midjourney 이미지 생성용 영어 프롬프트로 번역해주세요.",
      characterAction:
        "다음은 MV 프롬프트의 인물 동작 설명입니다. 이를 Midjourney 이미지 생성용 영어 프롬프트로 번역해주세요.",
      expression:
        "다음은 MV 프롬프트의 표정 설명입니다. 이를 Midjourney 이미지 생성용 영어 프롬프트로 번역해주세요.",
      cameraWork:
        "다음은 MV 프롬프트의 카메라 워크 설명입니다. 이를 Midjourney 이미지 생성용 영어 프롬프트로 번역해주세요.",
    };

    const prompt = `${fieldPrompts[fieldName] || "다음 한글 텍스트를 영어로 번역해주세요:"}

한글:
${koreanText}

요구사항:
1. 자연스러운 영어로 번역
2. Midjourney 프롬프트 형식으로 작성
3. 기술 용어는 정확히 번역
4. 설명 없이 번역만 출력

영어:`;

    let translation = "";
    try {
      const token = (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) 
        ? await window.firebase.auth().currentUser.getIdToken() 
        : null;
      
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let useGemini = false;
      const selectedAPI = localStorage.getItem("selectedAPI") || "openai";
      if (selectedAPI === "gemini") useGemini = true;

      if (!useGemini) {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: (window.getOpenAIModel ? window.getOpenAIModel() : "gpt-4o-mini"),
            messages: [
              { role: "system", content: "당신은 번역 전문가입니다. 번역만 출력하세요." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 1000,
          }),
        });
        if (!response.ok) throw new Error(`OpenAI Proxy 오류: ${response.status}`);
        const data = await response.json();
        translation = data.choices?.[0]?.message?.content || "";
      } else {
        const response = await fetch("/api/gemini", {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt: prompt,
            model: (window.getGeminiModel ? window.getGeminiModel() : "gemini-2.0-flash"),
            temperature: 0.3,
            maxOutputTokens: 1000,
          }),
        });
        if (!response.ok) throw new Error(`Gemini Proxy 오류: ${response.status}`);
        const data = await response.json();
        translation = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } catch (apiErr) {
      console.warn("Proxy 번역 실패, 원본 유지:", apiErr);
      return koreanText;
    }

    translation = translation.trim();

    // 불필요한 설명 제거
    translation = translation
      .replace(/^영어[:\s]*/gi, "")
      .replace(/^번역[:\s]*/gi, "")
      .replace(/^English[:\s]*/gi, "")
      .replace(/```[\s\S]*?```/g, "")
      .trim();

    return translation || koreanText; // 번역 실패 시 원본 반환
  } catch (error) {
    console.error(`한글→영어 번역 오류 (${fieldName}):`, error);
    return koreanText; // 번역 실패 시 원본 반환
  }
}

window.translateKoreanToEnglishForScene = translateKoreanToEnglishForScene;

// --- Extracted changeAPI ---
window.changeAPI = function (value) {
  try {
    console.log("🔄 API 선택 변경:", value);

    const apiStatusText = document.getElementById("apiStatusText");
    if (apiStatusText) {
      if (value === "gemini") {
        apiStatusText.textContent = "Gemini AI 모드";
      } else if (value === "openai") {
        apiStatusText.textContent = "ChatGPT 모드";
      } else {
        apiStatusText.textContent = "Dual AI 모드";
      }
    }

    // 선택된 값 저장
    localStorage.setItem("selectedAPI", value);

    console.log("✅ API 선택 변경 완료:", value);
  } catch (error) {
    console.error("API 선택 변경 오류:", error);
    window.showToast("API 선택 변경 중 오류가 발생했습니다:\n\n" + error.message, "error");
  }
};

// --- API Model Getters ---
// 모델 기본값 단일 출처. 서버 프록시(functions/index.js)의 허용 목록과 일치해야 한다.
window.AI_DEFAULTS = Object.freeze({
  GEMINI_MODEL: "gemini-2.5-flash",
  OPENAI_MODEL: "gpt-4o-mini",
});

window.getGeminiModel = function () {
  return (
    (window.globalConfig && window.globalConfig.gemini_model) ||
    window.AI_DEFAULTS.GEMINI_MODEL
  );
};

window.getOpenAIModel = function () {
  return (
    (window.globalConfig && window.globalConfig.openai_model) ||
    window.AI_DEFAULTS.OPENAI_MODEL
  );
};

// --- API Key Getters ---
window.getGeminiApiKey = function () {
  if (typeof window.isGeminiTemporarilyDisabled === "function" && window.isGeminiTemporarilyDisabled()) {
    return "";
  }
  return (
    localStorage.getItem("gemini_api_key") ||
    (window.globalConfig && window.globalConfig.gemini_api_key) ||
    (window.firebaseAuth?.currentUser ? "AIzaProxyAuthenticatedUser" : "") ||
    ""
  );
};

window.markGeminiTemporarilyDisabled = function (reason, durationMs = 30 * 60 * 1000) {
  const until = Date.now() + durationMs;
  window.__geminiDisabledUntil = until;
  window.__geminiDisabledReason = reason || "Gemini API 오류";
  try {
    sessionStorage.setItem("geminiDisabledUntil", String(until));
    sessionStorage.setItem("geminiDisabledReason", window.__geminiDisabledReason);
  } catch (_) {}
  console.warn(
    `⚠️ Gemini API를 임시 비활성화합니다: ${window.__geminiDisabledReason}`,
  );
};

window.isGeminiTemporarilyDisabled = function () {
  const storedUntil = (() => {
    try {
      return Number(sessionStorage.getItem("geminiDisabledUntil") || 0);
    } catch (_) {
      return 0;
    }
  })();
  const until = Math.max(Number(window.__geminiDisabledUntil || 0), storedUntil);
  if (!until || Date.now() >= until) return false;
  return true;
};

window.handleGeminiApiFailure = function (error) {
  const message = String(error?.message || error || "");
  if (/expired|API key|400|401|403/i.test(message)) {
    window.markGeminiTemporarilyDisabled(message);
  }
};

window.getOpenAIApiKey = function () {
  return (
    localStorage.getItem("openai_api_key") ||
    (window.globalConfig && window.globalConfig.openai_api_key) ||
    (window.firebaseAuth?.currentUser ? "sk-proxy-authenticated-user" : "") ||
    ""
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MV 씬 생성 전용 API 헬퍼 (배치 분산 처리용)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gemini 2.0 Flash로 씬 배치를 생성하고 AI 응답 텍스트를 반환합니다.
 * @param {string} prompt  - 씬 생성 프롬프트
 * @param {string} geminiKey - Gemini API 키
 * @returns {Promise<string>} AI 응답 텍스트
 */
window.callGeminiForScenes = async function (prompt, geminiKey) {
  if (typeof window.isGeminiTemporarilyDisabled === "function" && window.isGeminiTemporarilyDisabled()) {
    throw new Error("Gemini API가 임시 비활성화되어 ChatGPT로 전환합니다.");
  }
  
  const token = (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) 
        ? await window.firebase.auth().currentUser.getIdToken() : null;
        
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch("/api/gemini", {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt: prompt,
      model: (window.getGeminiModel ? window.getGeminiModel() : "gemini-2.0-flash"),
      temperature: 0.92,
      maxOutputTokens: 8192,
    }),
  });

  if (!response.ok) {
    const error = new Error(`Gemini Proxy 오류: ${response.status} ${response.statusText}`);
    if (typeof window.handleGeminiApiFailure === "function") {
      window.handleGeminiApiFailure(error);
    }
    throw error;
  }

  const data = await response.json();
  if (window.logApiUsage) window.logApiUsage("gemini");

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) throw new Error("Gemini API 응답이 비어있습니다.");
  return text;
};

/**
 * ChatGPT gpt-4o-mini로 씬 배치를 생성하고 AI 응답 텍스트를 반환합니다.
 * @param {string} prompt    - 씬 생성 프롬프트
 * @param {string} openaiKey - OpenAI API 키
 * @returns {Promise<string>} AI 응답 텍스트
 */
window.callChatGPTForScenes = async function (prompt, openaiKey) {
  const token = (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) 
        ? await window.firebase.auth().currentUser.getIdToken() : null;
        
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: (window.getOpenAIModel ? window.getOpenAIModel() : "gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content:
            "당신은 세계적인 뮤직비디오 감독이자 시각 예술 디렉터입니다. 가사의 감정과 서사를 영화적 시각 언어로 변환하는 것이 당신의 전문 영역입니다. 각 씬은 하나의 독립된 예술 작품처럼 구성하되, 전체 시퀀스는 음악의 감정 아크를 따라 유기적으로 흘러야 합니다. 단순한 배경 나열이 아니라, 빛·색채·질감·공간감을 활용한 감각적 묘사로 씬을 설계하세요. Midjourney와 Runway에서 최고 품질의 결과를 만들어내는 프롬프트 엔지니어링에 정통합니다. 반드시 요청한 개수만큼 정확히 씬을 생성하고, 순수 JSON 배열만 출력하세요.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.92,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    throw new Error(`ChatGPT Proxy 오류: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (window.logApiUsage) window.logApiUsage("openai");

  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("ChatGPT API 응답이 비어있습니다.");
  return text;
};

console.log("✅ api.js 로드 완료 및 API 키 함수 등록");
