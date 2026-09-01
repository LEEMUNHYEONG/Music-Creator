// ═══════════════════════════════════════════════════════════════
// Music Creator — Firebase Cloud Functions v6
// API Key 보안 프록시 (OpenAI + Gemini)
// ═══════════════════════════════════════════════════════════════

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
// firebase-admin@13부터 최상위 네임스페이스(admin.firestore()/admin.auth())가
// 제거되고 모듈형 API(getFirestore()/getAuth())만 남았다. 이 파일은 Node 22/
// firebase-admin 14 업그레이드 당시 이 API 변경을 반영하지 못한 채
// `admin.firestore()`/`admin.auth()`를 그대로 호출하고 있었는데, 두 호출부
// 모두 try/catch로 감싸져 있어 배포 이후 모든 인증된 요청이 "TypeError:
// admin.auth is not a function"으로 조용히 실패하며 401만 반환했다(로그도
// 남지 않음) — 실사용자 관점에서는 로그인 여부와 무관하게 AI 생성 기능
// 전체와 회원 비활성화 기능이 완전히 먹통이었던 셈이다. functions/index.js
// 테스트를 새로 작성하는 과정에서 로컬 에뮬레이터로 실제 인증된 요청을
// 재현해보다가 발견했다.
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const fetch = require("node-fetch");

initializeApp();

// 서울 리전으로 기본 설정
setGlobalOptions({ region: "asia-northeast3" });

// API 키를 Firebase Secret으로 정의
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// ─── CORS 헬퍼 (허용 오리진 화이트리스트) ───────────────────
// ⚠️ onRequest 옵션에 cors:true(또는 cors 키 자체)를 전달하면
// firebase-functions v2가 이 핸들러 전체를 npm `cors` 패키지 미들웨어로
// 감싸버리는데, cors:true는 그 미들웨어의 origin:true(=요청 Origin을
// 그대로 반사) 모드로 해석된다. 이 미들웨어가 우리 핸들러보다 먼저
// 실행되며 OPTIONS 프리플라이트까지 가로채 응답해버리므로, 아래
// setCORSHeaders의 화이트리스트 검사는 실행조차 되지 않고 사실상 모든
// 오리진에 Access-Control-Allow-Origin이 반사되는 데드 코드였다
// (테스트 작성 중 실제로 재현해 발견). onRequest 옵션에서 cors 키를
// 아예 빼야만 firebase-functions가 이 래핑을 건너뛰고 아래 함수가
// CORS를 전담하게 된다.
const ALLOWED_ORIGINS = new Set([
  "https://music-creator-app-92d15.web.app",
  "https://music-creator-app-92d15.firebaseapp.com",
  "http://localhost:4180",
  "http://127.0.0.1:4180",
]);

function setCORSHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ─── 모델 허용 목록 / 사용량 상한 ───────────────────────────
const ALLOWED_OPENAI_MODELS = new Set(["gpt-4o-mini", "gpt-4o"]);
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const ALLOWED_GEMINI_MODELS = new Set(["gemini-2.5-flash", "gemini-2.0-flash"]);
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const MAX_TOKENS_CAP = 8192;
const DAILY_REQUEST_LIMIT = 300; // 사용자당 하루 프록시 호출 상한

async function checkDailyQuota(uid) {
  const day = new Date().toISOString().slice(0, 10);
  const ref = getFirestore()
    .collection("api_usage_daily")
    .doc(`${uid}_${day}`);
  try {
    return await getFirestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const count = (snap.exists ? snap.data().count || 0 : 0) + 1;
      if (count > DAILY_REQUEST_LIMIT) return false;
      tx.set(ref, { uid, day, count }, { merge: true });
      return true;
    });
  } catch (err) {
    // 쿼터 카운터 장애가 서비스 전체를 막지 않도록 허용 쪽으로 완화
    console.error("checkDailyQuota error:", err);
    return true;
  }
}

// ─── Firebase 인증 + Approved 확인 ──────────────────────────
async function verifyApprovedUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await getAuth().verifyIdToken(token);
    const userDoc = await getFirestore()
      .collection("users")
      .doc(decoded.uid)
      .get();
    if (!userDoc.exists || !userDoc.data().approved) return null;
    return decoded;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// 1) ChatGPT (OpenAI) 프록시 — POST /api/chat
// ═══════════════════════════════════════════════════════════════
exports.chatProxy = onRequest(
  { secrets: [OPENAI_API_KEY] },
  async (req, res) => {
    setCORSHeaders(req, res);
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    const user = await verifyApprovedUser(req);
    if (!user) {
      return res
        .status(401)
        .json({ error: "인증이 필요합니다. 로그인 후 이용해 주세요." });
    }

    if (!(await checkDailyQuota(user.uid))) {
      return res
        .status(429)
        .json({ error: "일일 사용 한도를 초과했습니다. 내일 다시 이용해 주세요." });
    }

    const openaiKey = OPENAI_API_KEY.value();
    try {
      const body = req.body;
      if (!body.messages || !Array.isArray(body.messages)) {
        return res.status(400).json({ error: "messages 배열이 필요합니다." });
      }
      const model = ALLOWED_OPENAI_MODELS.has(body.model)
        ? body.model
        : DEFAULT_OPENAI_MODEL;
      const openaiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: body.messages,
            max_tokens: Math.min(body.max_tokens || 4096, MAX_TOKENS_CAP),
            temperature: body.temperature ?? 0.8,
          }),
        },
      );
      const data = await openaiRes.json();
      if (!openaiRes.ok) {
        console.error("OpenAI API Error:", data);
        return res
          .status(openaiRes.status)
          .json({ error: data.error?.message || "OpenAI API 오류" });
      }
      return res.json(data);
    } catch (err) {
      console.error("chatProxy error:", err);
      return res.status(500).json({ error: "서버 내부 오류: " + err.message });
    }
  },
);

// ═══════════════════════════════════════════════════════════════
// 2) Gemini (Google AI) 프록시 — POST /api/gemini
// ═══════════════════════════════════════════════════════════════
exports.geminiProxy = onRequest(
  { secrets: [GEMINI_API_KEY] },
  async (req, res) => {
    setCORSHeaders(req, res);
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    const user = await verifyApprovedUser(req);
    if (!user) {
      return res
        .status(401)
        .json({ error: "인증이 필요합니다. 로그인 후 이용해 주세요." });
    }

    if (!(await checkDailyQuota(user.uid))) {
      return res
        .status(429)
        .json({ error: "일일 사용 한도를 초과했습니다. 내일 다시 이용해 주세요." });
    }

    const geminiKey = GEMINI_API_KEY.value();
    try {
      const body = req.body;
      const model = ALLOWED_GEMINI_MODELS.has(body.model)
        ? body.model
        : DEFAULT_GEMINI_MODEL;
      const prompt = body.prompt || body.contents;
      if (!prompt) {
        return res
          .status(400)
          .json({ error: "prompt 또는 contents가 필요합니다." });
      }
      const contents =
        typeof prompt === "string"
          ? [{ parts: [{ text: prompt }], role: "user" }]
          : prompt;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              ...(body.generationConfig || {}),
              // OpenAI 경로(max_tokens)와 동일하게 상한을 적용한다.
              // (이전에는 캡 없이 호출자가 요청한 값을 그대로 전달해
              // 비정상적으로 큰 값을 보내는 비용 남용 벡터가 될 수 있었음)
              maxOutputTokens: Math.min(
                body.generationConfig?.maxOutputTokens ||
                  body.maxOutputTokens ||
                  8192,
                MAX_TOKENS_CAP,
              ),
              temperature:
                body.generationConfig?.temperature ??
                body.temperature ??
                0.7,
            },
          }),
        },
      );
      const data = await geminiRes.json();
      if (!geminiRes.ok) {
        console.error("Gemini API Error:", data);
        return res
          .status(geminiRes.status)
          .json({ error: data.error?.message || "Gemini API 오류" });
      }
      return res.json(data);
    } catch (err) {
      console.error("geminiProxy error:", err);
      return res.status(500).json({ error: "서버 내부 오류: " + err.message });
    }
  },
);

// ═══════════════════════════════════════════════════════════════
// 3) 헬스 체크 — GET /api/health
// ═══════════════════════════════════════════════════════════════
exports.healthCheck = onRequest({}, (req, res) => {
  setCORSHeaders(req, res);
  res.json({
    status: "ok",
    service: "Music Creator API Proxy",
    timestamp: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════
// 4) 관리자 전용: 계정 비활성화/재활성화 — POST /api/admin/disable
//    (가입 거절 시 Firestore 문서 삭제만으로는 Auth 계정이 남아
//     로그인·쓰기가 가능하던 문제를 서버에서 차단)
// ═══════════════════════════════════════════════════════════════
exports.adminSetUserDisabled = onRequest({}, async (req, res) => {
  setCORSHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const caller = await verifyApprovedUser(req);
  if (!caller) {
    return res.status(401).json({ error: "인증이 필요합니다." });
  }
  const callerDoc = await getFirestore()
    .collection("users")
    .doc(caller.uid)
    .get();
  if (!callerDoc.exists || callerDoc.data().role !== "admin") {
    return res.status(403).json({ error: "관리자만 사용할 수 있습니다." });
  }

  const { uid, disabled } = req.body || {};
  if (!uid || typeof uid !== "string") {
    return res.status(400).json({ error: "uid가 필요합니다." });
  }
  if (uid === caller.uid) {
    return res.status(400).json({ error: "자기 자신은 비활성화할 수 없습니다." });
  }

  try {
    await getAuth().updateUser(uid, { disabled: disabled !== false });
    await getAuth().revokeRefreshTokens(uid);
    return res.json({ ok: true, uid, disabled: disabled !== false });
  } catch (err) {
    console.error("adminSetUserDisabled error:", err);
    return res.status(500).json({ error: "계정 상태 변경 실패: " + err.message });
  }
});
