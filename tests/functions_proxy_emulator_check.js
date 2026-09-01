// functions/index.js (Cloud Functions API 프록시) 에뮬레이터 기반 통합 테스트
//
// 이 프록시들은 openai_api_key/gemini_api_key를 서버에만 보관하고 클라이언트에는
// 절대 노출하지 않기 위한 보안 경계이자, 관리자 승인 게이트/일일 쿼터/CORS
// 화이트리스트를 강제하는 지점이라 자동화 테스트 가치가 특히 크다. 지금까지는
// 이번 세션 초반의 일회성 curl 수동 검증만 있었을 뿐 자동화 테스트는 없었다.
//
// 외부 OpenAI/Gemini API로 실제 요청이 나가는 "성공 경로"(정상 인증+쿼터 통과
// 이후 실제 AI 응답을 반환하는 부분)는 프록시 안에서 node-fetch가 하드코딩된
// 외부 호스트를 직접 호출하므로 네트워크 목 없이는 검증할 수 없다 — 대신
// 그 앞단의 보안/검증 로직(CORS, 메서드, 인증, 승인 여부, 일일 쿼터, 요청 바디
// 검증, 관리자 권한)을 전부 실제 Firebase 에뮬레이터(Functions+Firestore+Auth)에
// 대고 실제 HTTP 요청으로 검증한다 — 이 부분이 실제로 보안이 걸려있는 지점이다.
//
// 이 스크립트는 npm run test:mv(빠른 순수 로직 테스트 모음)에는 포함하지 않는다.
// Firebase CLI + Java(Firestore 에뮬레이터)가 필요하고 기동에 10초 이상 걸려
// 빠른 피드백 루프를 깨기 때문. 대신 `npm run test:functions`로 필요할 때만 실행한다.

const assert = require("assert");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const projectRoot = path.resolve(__dirname, "..");
const projectId = "music-creator-app-92d15";
const FUNCTIONS_PORT = 5003;
const FIRESTORE_PORT = 8082;
const AUTH_PORT = 9099;
const BASE_URL = `http://127.0.0.1:${FUNCTIONS_PORT}/${projectId}/asia-northeast3`;

function checkPrerequisites() {
  try {
    require.resolve(path.join(projectRoot, "functions/node_modules/firebase-admin/package.json"));
  } catch {
    return "functions/node_modules가 설치되어 있지 않습니다 (functions 디렉터리에서 npm install 필요)";
  }
  const secretFile = path.join(projectRoot, "functions/.secret.local");
  if (!fs.existsSync(secretFile)) {
    // 시크릿 값이 없어도 에뮬레이터 자체는 뜨지만, defineSecret().value()가
    // 빈 문자열을 반환할 뿐 이 테스트가 검증하는 인증/쿼터 로직에는 영향 없다.
    // (실제 외부 API 호출 경로는 이 테스트의 범위 밖이므로 문제 없음)
  }
  return null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForEmulators(logPath, retries = 90) {
  for (let i = 0; i < retries; i++) {
    if (fs.existsSync(logPath)) {
      const log = fs.readFileSync(logPath, "utf8");
      if (log.includes("All emulators ready")) return true;
      if (/Error|EADDRINUSE/i.test(log) && !log.includes("All emulators ready")) {
        // 계속 재시도 (일부 경고성 스택트레이스는 정상 기동 중에도 찍힘)
      }
    }
    await delay(500);
  }
  return false;
}

async function main() {
  const skipReason = checkPrerequisites();
  if (skipReason) {
    console.log(`functions proxy emulator check: SKIP (${skipReason})`);
    process.exit(0);
  }

  const logPath = path.join(projectRoot, ".functions-emulator-check.log");
  const logFd = fs.openSync(logPath, "w");

  console.log("🚀 Firebase 에뮬레이터(functions,firestore,auth) 기동 중...");
  const emulator = spawn(
    "npx",
    ["firebase", "emulators:start", "--only", "functions,firestore,auth"],
    {
      cwd: projectRoot,
      stdio: ["ignore", logFd, logFd],
      // firebase emulators:start는 Firestore(Java)/Auth/Functions 러너 등
      // 여러 하위 프로세스를 자체적으로 fork한다. detached:true로 이
      // 프로세스를 새 프로세스 그룹의 리더로 만들어두면, 종료 시
      // process.kill(-pid, sig)로 그 그룹 전체(하위 프로세스 포함)에
      // 신호를 보낼 수 있다 — detached 없이는 부모(이 스크립트)와 같은
      // 그룹에 속해 있어 하위 프로세스만 선택적으로 정리하기 어렵다.
      detached: true,
    },
  );

  let exitedEarly = false;
  let exited = false;
  emulator.on("exit", (code) => {
    exited = true;
    if (code !== 0 && !exitedEarly) {
      exitedEarly = true;
    }
  });

  function waitForExit(timeoutMs) {
    if (exited) return Promise.resolve(true);
    return Promise.race([
      new Promise((resolve) => emulator.once("exit", () => resolve(true))),
      delay(timeoutMs).then(() => exited),
    ]);
  }

  async function shutdown() {
    // 이전에는 SIGTERM 후 무조건 500ms만 기다리고 넘어가서, Firestore
    // 에뮬레이터(JVM이라 종료가 느릴 수 있음)가 그 안에 다 정리되지
    // 않으면 포트를 점유한 좀비 프로세스가 남을 수 있었다(정밀 재분석
    // 중 발견). 실제로 exit 이벤트를 기다리고, 그래도 안 끝나면
    // SIGKILL로 강제 종료한다.
    if (!exited) {
      try {
        process.kill(-emulator.pid, "SIGTERM");
      } catch {
        try {
          emulator.kill("SIGTERM");
        } catch {}
      }
      const gracefullyExited = await waitForExit(8000);
      if (!gracefullyExited) {
        console.warn("⚠️ 에뮬레이터가 SIGTERM으로 8초 내에 종료되지 않아 SIGKILL로 강제 종료합니다.");
        try {
          process.kill(-emulator.pid, "SIGKILL");
        } catch {
          try {
            emulator.kill("SIGKILL");
          } catch {}
        }
        await waitForExit(3000);
      }
    }
    try {
      fs.closeSync(logFd);
    } catch {}
    try {
      fs.unlinkSync(logPath);
    } catch {}
  }

  try {
    const ready = await waitForEmulators(logPath);
    if (!ready) {
      const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
      throw new Error("에뮬레이터가 90초 내에 준비되지 않았습니다.\n--- 로그 마지막 부분 ---\n" + log.slice(-2000));
    }
    console.log("✅ 에뮬레이터 준비 완료. 테스트 시작...");

    // ─── Firebase Admin SDK를 에뮬레이터에 연결 (보안 규칙 우회, 시드 데이터용) ───
    process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${FIRESTORE_PORT}`;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `127.0.0.1:${AUTH_PORT}`;
    // firebase-admin v14는 서브패스 export(firebase-admin/firestore 등)를
    // 쓰므로, functions/package.json을 기준으로 한 require를 만들어 정상적인
    // 패키지 exports 해석 경로를 통해 불러온다 (절대경로로 내부 파일을 직접
    // require하면 exports map을 우회해 모듈을 찾지 못한다).
    const Module = require("module");
    const functionsRequire = Module.createRequire(path.join(projectRoot, "functions", "package.json"));
    const admin = functionsRequire("firebase-admin/app");
    const { getFirestore } = functionsRequire("firebase-admin/firestore");
    const { getAuth } = functionsRequire("firebase-admin/auth");
    admin.initializeApp({ projectId });
    const db = getFirestore();
    const authAdmin = getAuth();

    async function signUpUser(email) {
      const res = await fetch(
        `http://127.0.0.1:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "password123!", returnSecureToken: true }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error("테스트 유저 생성 실패: " + JSON.stringify(data));
      return { uid: data.localId, idToken: data.idToken };
    }

    async function callFn(name, { method = "GET", body, token, origin } = {}) {
      const headers = {};
      if (body !== undefined) headers["Content-Type"] = "application/json";
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (origin) headers["Origin"] = origin;
      const res = await fetch(`${BASE_URL}/${name}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      let json = null;
      try {
        json = await res.json();
      } catch {}
      return { status: res.status, headers: res.headers, json };
    }

    // ═══════════════════════════════════════════════════════════════
    // 1. healthCheck: 인증 없이도 접근 가능
    // ═══════════════════════════════════════════════════════════════
    {
      const r = await callFn("healthCheck");
      assert.strictEqual(r.status, 200);
      assert.strictEqual(r.json.status, "ok");
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. CORS preflight(OPTIONS): 정상 응답 코드 확인
    // ═══════════════════════════════════════════════════════════════
    // ⚠️ 화이트리스트 밖 오리진이 실제로 차단되는지는 이 로컬 에뮬레이터로는
    // 검증할 수 없다 — firebase-tools의 Functions 에뮬레이터는 로컬 개발
    // 편의를 위해 모든 함수에 FIREBASE_DEBUG_FEATURES={enableCors:true}를
    // 강제로 주입해, onRequest 옵션에서 cors 키를 완전히 뺐어도 firebase-functions가
    // 항상 origin:true(요청 Origin을 그대로 반사) 모드로 감싸버린다
    // (프로덕션 Cloud Run에는 이 env가 설정되지 않으므로 코드의 onRequest
    // 옵션값만이 유일한 기준이 된다). 따라서 화이트리스트 강제 여부는
    // 배포 후 실제 엔드포인트에 대한 curl로만 검증 가능하다 — 이 세션에서는
    // 배포 후 실제로 검증했다(커밋 메시지 참고).
    {
      const allowed = await callFn("chatProxy", {
        method: "OPTIONS",
        origin: "https://music-creator-app-92d15.web.app",
      });
      assert.strictEqual(allowed.status, 204);
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. 허용되지 않은 HTTP 메서드
    // ═══════════════════════════════════════════════════════════════
    {
      const r = await callFn("chatProxy", { method: "GET" });
      assert.strictEqual(r.status, 405);
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. 인증 없음 / 잘못된 토큰
    // ═══════════════════════════════════════════════════════════════
    {
      const noAuth = await callFn("chatProxy", { method: "POST", body: {} });
      assert.strictEqual(noAuth.status, 401);

      const badToken = await callFn("chatProxy", {
        method: "POST",
        body: {},
        token: "this-is-not-a-real-jwt",
      });
      assert.strictEqual(badToken.status, 401);
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. 유효한 토큰이지만 Firestore에 승인 안 된 사용자
    // ═══════════════════════════════════════════════════════════════
    {
      const { uid, idToken } = await signUpUser("unapproved_user@test.local");
      await db.collection("users").doc(uid).set({ approved: false, role: "user" });
      const r = await callFn("chatProxy", { method: "POST", body: {}, token: idToken });
      assert.strictEqual(r.status, 401, "미승인 사용자는 유효한 토큰이 있어도 401이어야 함");
    }
    {
      // Firestore에 사용자 문서 자체가 없는 경우도 동일하게 차단되어야 함
      const { uid, idToken } = await signUpUser("no_doc_user@test.local");
      const r = await callFn("chatProxy", { method: "POST", body: {}, token: idToken });
      assert.strictEqual(r.status, 401, "Firestore 사용자 문서가 없으면 401이어야 함");
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. 승인된 사용자: 요청 바디 검증 (400)
    // ═══════════════════════════════════════════════════════════════
    let approvedUid, approvedToken;
    {
      const { uid, idToken } = await signUpUser("approved_user@test.local");
      approvedUid = uid;
      approvedToken = idToken;
      await db.collection("users").doc(uid).set({ approved: true, role: "user" });

      const badBody = await callFn("chatProxy", { method: "POST", body: {}, token: idToken });
      assert.strictEqual(badBody.status, 400, "messages 배열이 없으면 400이어야 함");

      const badGeminiBody = await callFn("geminiProxy", { method: "POST", body: {}, token: idToken });
      assert.strictEqual(badGeminiBody.status, 400, "prompt/contents가 없으면 400이어야 함");
    }

    // ═══════════════════════════════════════════════════════════════
    // 7. 일일 쿼터 초과 (429)
    // ═══════════════════════════════════════════════════════════════
    {
      const today = new Date().toISOString().slice(0, 10);
      await db
        .collection("api_usage_daily")
        .doc(`${approvedUid}_${today}`)
        .set({ uid: approvedUid, day: today, count: 300 });

      const r = await callFn("chatProxy", {
        method: "POST",
        body: { messages: [{ role: "user", content: "hi" }] },
        token: approvedToken,
      });
      assert.strictEqual(r.status, 429, "일일 한도(300회)를 초과하면 429여야 함");

      // 쿼터 리셋 (다음 시나리오에 영향 주지 않도록)
      await db.collection("api_usage_daily").doc(`${approvedUid}_${today}`).delete();
    }

    // ═══════════════════════════════════════════════════════════════
    // 8. adminSetUserDisabled: 인증 없음/일반유저/자기자신/성공 케이스
    // ═══════════════════════════════════════════════════════════════
    {
      const noAuth = await callFn("adminSetUserDisabled", { method: "POST", body: { uid: "x" } });
      assert.strictEqual(noAuth.status, 401);

      const nonAdmin = await callFn("adminSetUserDisabled", {
        method: "POST",
        body: { uid: "x" },
        token: approvedToken,
      });
      assert.strictEqual(nonAdmin.status, 403, "관리자가 아니면 403이어야 함");

      const { uid: adminUid, idToken: adminToken } = await signUpUser("admin_user@test.local");
      await db.collection("users").doc(adminUid).set({ approved: true, role: "admin" });

      const selfDisable = await callFn("adminSetUserDisabled", {
        method: "POST",
        body: { uid: adminUid },
        token: adminToken,
      });
      assert.strictEqual(selfDisable.status, 400, "자기 자신은 비활성화할 수 없어야 함");

      const missingUid = await callFn("adminSetUserDisabled", {
        method: "POST",
        body: {},
        token: adminToken,
      });
      assert.strictEqual(missingUid.status, 400);

      const { uid: targetUid } = await signUpUser("target_to_disable@test.local");
      const success = await callFn("adminSetUserDisabled", {
        method: "POST",
        body: { uid: targetUid, disabled: true },
        token: adminToken,
      });
      assert.strictEqual(success.status, 200);
      assert.strictEqual(success.json.ok, true);

      const targetRecord = await authAdmin.getUser(targetUid);
      assert.strictEqual(targetRecord.disabled, true, "Auth 계정이 실제로 비활성화되어야 함");

      // 재활성화도 확인
      const reEnable = await callFn("adminSetUserDisabled", {
        method: "POST",
        body: { uid: targetUid, disabled: false },
        token: adminToken,
      });
      assert.strictEqual(reEnable.status, 200);
      const targetRecordAfter = await authAdmin.getUser(targetUid);
      assert.strictEqual(targetRecordAfter.disabled, false);
    }

    console.log("functions proxy emulator check: PASS (8 scenarios)");
    await shutdown();
    process.exit(0);
  } catch (err) {
    console.error(err);
    await shutdown();
    process.exit(1);
  }
}

main();
