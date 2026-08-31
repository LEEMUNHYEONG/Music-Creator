// ═══════════════════════════════════════════════════════════════
// Music Creator — Firebase Cloud Functions v6
// API Key 보안 프록시 (OpenAI + Gemini)
// ═══════════════════════════════════════════════════════════════

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

// 서울 리전으로 기본 설정
setGlobalOptions({ region: "asia-northeast3" });

// API 키를 Firebase Secret으로 정의
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// ─── CORS 헬퍼 ──────────────────────────────────────────────
function setCORSHeaders(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ─── Firebase 인증 + Approved 확인 ──────────────────────────
async function verifyApprovedUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const userDoc = await admin
      .firestore()
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
  { secrets: [OPENAI_API_KEY], cors: true },
  async (req, res) => {
    setCORSHeaders(res);
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    const user = await verifyApprovedUser(req);
    if (!user) {
      return res
        .status(401)
        .json({ error: "인증이 필요합니다. 로그인 후 이용해 주세요." });
    }

    const openaiKey = OPENAI_API_KEY.value();
    try {
      const body = req.body;
      if (!body.messages || !Array.isArray(body.messages)) {
        return res.status(400).json({ error: "messages 배열이 필요합니다." });
      }
      const openaiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: body.model || "gpt-4o",
            messages: body.messages,
            max_tokens: body.max_tokens || 4096,
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
  { secrets: [GEMINI_API_KEY], cors: true },
  async (req, res) => {
    setCORSHeaders(res);
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    const user = await verifyApprovedUser(req);
    if (!user) {
      return res
        .status(401)
        .json({ error: "인증이 필요합니다. 로그인 후 이용해 주세요." });
    }

    const geminiKey = GEMINI_API_KEY.value();
    try {
      const body = req.body;
      let model = body.model || "gemini-3.5-flash";
      if (model === "gemini-2.0-flash") {
        model = "gemini-3.5-flash";
      }
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
              maxOutputTokens:
                body.generationConfig?.maxOutputTokens ||
                body.maxOutputTokens ||
                8192,
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
exports.healthCheck = onRequest({ cors: true }, (req, res) => {
  res.json({
    status: "ok",
    service: "Music Creator API Proxy",
    timestamp: new Date().toISOString(),
  });
});
