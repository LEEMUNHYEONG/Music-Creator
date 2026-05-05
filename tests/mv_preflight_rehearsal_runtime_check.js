const assert = require("assert");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const url = "http://localhost:4177";
const port = 9227;
const serverPort = 4177;
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mv-preflight-"));
const projectRoot = path.resolve(__dirname, "..");

if (!fs.existsSync(chromePath)) {
  console.log("MV preflight rehearsal runtime check: SKIP (Google Chrome not found)");
  process.exit(0);
}

const server = spawn("python3", ["-m", "http.server", String(serverPort)], {
  cwd: projectRoot,
  stdio: "ignore",
});

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  url,
], {
  stdio: "ignore",
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(endpoint, retries = 50) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return;
    } catch (_) {
      // Static server may still be starting.
    }
    await delay(100);
  }
  throw new Error(`Local static server did not become ready: ${endpoint}`);
}

async function waitForJsonEndpoint(endpoint, retries = 50) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return response.json();
    } catch (_) {
      // Chrome may still be starting.
    }
    await delay(100);
  }
  throw new Error(`Chrome DevTools endpoint did not become ready: ${endpoint}`);
}

function connectCdp(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();
  const events = [];

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result || {});
      return;
    }
    if (message.method) events.push(message.method);
  };

  const opened = new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  return {
    async ready() {
      await opened;
    },
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },
    async waitForEvent(method, retries = 100) {
      for (let i = 0; i < retries; i += 1) {
        if (events.includes(method)) return;
        await delay(100);
      }
      throw new Error(`Timed out waiting for CDP event: ${method}`);
    },
    close() {
      ws.close();
    },
  };
}

async function cleanup() {
  chrome.kill();
  server.kill();
  await delay(300);
  fs.rmSync(userDataDir, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}

(async () => {
  try {
    await waitForHttp(url);
    const tabs = await waitForJsonEndpoint(`http://127.0.0.1:${port}/json`);
    const pageTab = tabs.find((tab) => tab.type === "page");
    assert.ok(pageTab, "Chrome should expose a page target");

    const cdp = connectCdp(pageTab.webSocketDebuggerUrl);
    await cdp.ready();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.waitForEvent("Page.loadEventFired");

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const evaluation = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      awaitPromise: true,
      expression: `(() => {
        const project = {
          id: "proj_mv_preflight_rehearsal",
          title: "MV 운영 전 리허설 샘플",
          lastStep: 6,
          createdAt: "2026-05-06T00:00:00.000Z",
          updatedAt: "2026-05-06T00:00:00.000Z",
          data: {
            songTitle: "MV 운영 전 리허설 샘플",
            marketing: {
              youtubeDesc: "운영 전 리허설용 유튜브 설명",
              tiktokDesc: "운영 전 리허설용 숏폼 설명",
              hashtags: "#musicvideo #preflight #rehearsal",
              mv: {
                schemaVersion: 1,
                settings: {
                  minutes: "3",
                  seconds: "20",
                  interval: "8",
                  era: "modern",
                  country: "korea",
                  characterCount: "1",
                  lighting: "soft blue-hour light",
                  cameraWork: "slow dolly-in",
                  mood: "dreamy",
                  locationCustom: "서울 골목, 새벽 루프탑",
                  actionCustom: "천천히 걷기, 하늘 보기",
                  customSettings: "주인공 의상과 색감을 모든 씬에서 유지",
                  locationTags: ["city", "rain"],
                  actionTags: ["walking"],
                  characters: [
                    {
                      gender: "female",
                      age: "20s",
                      race: "asian",
                      appearance: "black bob hair, long coat",
                      artStyle: "photorealistic",
                      characterSheet: "consistent heroine sheet",
                    },
                  ],
                },
                prompts: {
                  thumbnail: {
                    en: "preflight thumbnail prompt en",
                    ko: "운영 전 리허설 썸네일 프롬프트",
                  },
                  background: {
                    en: "preflight background prompt en",
                    ko: "운영 전 리허설 배경 프롬프트",
                  },
                  character: {
                    en: "preflight character prompt en",
                    ko: "운영 전 리허설 인물 프롬프트",
                  },
                },
                scenes: [
                  {
                    id: "scene-1",
                    index: 0,
                    sceneNumber: 1,
                    time: "0:00-0:08",
                    startSeconds: 0,
                    endSeconds: 8,
                    durationSeconds: 8,
                    scene: "비 내리는 네온 골목에서 보컬이 천천히 걷는다.",
                    lyrics: "blue rain keeps falling",
                    location: "rainy neon alley",
                    emotion: "lonely",
                    mood: "quiet negative space",
                    lighting: "blue-hour side light",
                    cameraWork: "slow dolly-in",
                    prompt: "preflight scene 1 prompt en",
                    promptKo: "운영 전 리허설 씬 1 프롬프트",
                  },
                  {
                    id: "scene-2",
                    index: 1,
                    sceneNumber: 2,
                    time: "0:08-0:18",
                    startSeconds: 8,
                    endSeconds: 18,
                    durationSeconds: 10,
                    scene: "새벽 루프탑에서 후렴이 열리며 도시가 밝아진다.",
                    lyrics: "morning opens above us",
                    location: "misty rooftop",
                    emotion: "hopeful",
                    mood: "wide sunrise release",
                    lighting: "warm rim light",
                    cameraWork: "crane-up reveal",
                    prompt: "preflight scene 2 prompt en",
                    promptKo: "운영 전 리허설 씬 2 프롬프트",
                  },
                ],
              },
            },
          },
        };

        localStorage.setItem("musicCreatorProjects", JSON.stringify([project]));
        localStorage.setItem("savedProjects", JSON.stringify([project]));
        localStorage.setItem("currentProjectId", project.id);

        if (typeof window.loadProject !== "function") {
          return { missingLoadProject: true };
        }
        window.loadProject(project.id);
        if (typeof window.showMarketingTab === "function") {
          window.showMarketingTab("mv");
        }

        const marketing = window.currentProject?.data?.marketing || {};
        const mvData =
          typeof window.getMarketingMVData === "function"
            ? window.getMarketingMVData(marketing)
            : marketing.mv;
        const pageOverflowX = Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ) - window.innerWidth;

        return {
          currentProjectId: window.currentProjectId,
          mvSettings: {
            minutes: document.getElementById("mvMinutes")?.value || "",
            mood: document.getElementById("mvMood")?.value || "",
            characterCount: document.getElementById("mvCharacterCount")?.value || "",
          },
          promptFields: {
            thumbnailEn: document.getElementById("mvThumbnailPromptEn")?.value || "",
            backgroundKo: document.getElementById("mvBackgroundDetailPromptKo")?.value || "",
            characterEn: document.getElementById("mvCharacterDetailPromptEn")?.value || "",
          },
          sceneState: {
            currentScenes: Array.isArray(window.currentScenes) ? window.currentScenes.length : 0,
            normalizedScenes: Array.isArray(mvData?.scenes) ? mvData.scenes.length : 0,
            firstLocation: window.currentScenes?.[0]?.location || "",
            secondPromptKo: window.currentScenes?.[1]?.promptKo || "",
          },
          visibility: {
            panel6: document.getElementById("panel6")?.classList.contains("active") || false,
            marketingResultHidden: document.getElementById("marketingResult")?.classList.contains("hidden") || false,
            mvTabActive: document.getElementById("marketing-mv")?.classList.contains("active") || false,
            resultsDisplay: document.getElementById("mvResultsSection")?.style.display || "",
            overviewDisplay: document.getElementById("mvSceneOverviewSection")?.style.display || "",
          },
          rendered: {
            overviewCards: document.querySelectorAll(".mv-scene-overview-card").length,
            resultPrompts: document.querySelectorAll(".mv-prompt-item").length,
            timeline: !!document.querySelector(".mv-scene-timeline-preview"),
          },
          storage: {
            projects: JSON.parse(localStorage.getItem("musicCreatorProjects") || "[]").length,
            hasNormalizedMv: !!JSON.parse(localStorage.getItem("musicCreatorProjects") || "[]")[0]?.data?.marketing?.mv,
          },
          pageOverflowX,
        };
      })()`,
    });

    const result = evaluation.result.value;
    assert.strictEqual(result.currentProjectId, "proj_mv_preflight_rehearsal");
    assert.deepStrictEqual(result.mvSettings, {
      minutes: "3",
      mood: "dreamy",
      characterCount: "1",
    });
    assert.strictEqual(result.promptFields.thumbnailEn, "preflight thumbnail prompt en");
    assert.strictEqual(result.promptFields.backgroundKo, "운영 전 리허설 배경 프롬프트");
    assert.strictEqual(result.promptFields.characterEn, "preflight character prompt en");
    assert.deepStrictEqual(result.sceneState, {
      currentScenes: 2,
      normalizedScenes: 2,
      firstLocation: "rainy neon alley",
      secondPromptKo: "운영 전 리허설 씬 2 프롬프트",
    });
    assert.deepStrictEqual(result.visibility, {
      panel6: true,
      marketingResultHidden: false,
      mvTabActive: true,
      resultsDisplay: "block",
      overviewDisplay: "none",
    });
    assert.strictEqual(result.rendered.timeline, true);
    assert.ok(result.rendered.overviewCards >= 2);
    assert.ok(result.rendered.resultPrompts >= 2);
    assert.deepStrictEqual(result.storage, {
      projects: 1,
      hasNormalizedMv: true,
    });
    assert.ok(result.pageOverflowX <= 2, "preflight rehearsal should not create page overflow");

    const screenshot = await cdp.send("Page.captureScreenshot", {
      captureBeyondViewport: false,
      fromSurface: true,
      format: "png",
    });
    assert.ok(
      screenshot.data && screenshot.data.length > 10000,
      "preflight rehearsal should produce a non-empty screenshot",
    );

    cdp.close();
    console.log("MV preflight rehearsal runtime check: PASS");
  } finally {
    await cleanup();
  }
})().catch((error) => {
  cleanup().finally(() => {
    console.error(error);
    process.exit(1);
  });
});
