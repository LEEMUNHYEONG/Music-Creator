const assert = require("assert");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const url = "http://localhost:4176";
const port = 9226;
const serverPort = 4176;
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mv-visual-"));
const projectRoot = path.resolve(__dirname, "..");

if (!fs.existsSync(chromePath)) {
  console.log("MV step6 visual sanity check: SKIP (Google Chrome not found)");
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

async function inspectViewport(cdp, width, height) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const evaluation = await cdp.send("Runtime.evaluate", {
    returnByValue: true,
    awaitPromise: true,
    expression: `(() => {
      const mvSection = document.getElementById("marketing-mv");
      const panel = document.getElementById("panel6");
      const marketingResult = document.getElementById("marketingResult");
      const overview = document.getElementById("mvSceneOverviewSection");
      if (!panel || !marketingResult || !mvSection || !overview || typeof window.renderSceneOverview !== "function") {
        return { missingShell: true };
      }

      document.body.style.margin = "0";
      const mainWrapper = document.getElementById("mainWrapper");
      const appContainer = document.querySelector(".container");
      if (mainWrapper) mainWrapper.style.width = "100%";
      if (appContainer) appContainer.style.width = "100%";
      document.querySelectorAll(".panel.active").forEach((item) => item.classList.remove("active"));
      panel.classList.add("active");
      panel.style.display = "block";
      panel.style.width = "100%";
      marketingResult.classList.remove("hidden");
      marketingResult.style.display = "block";
      marketingResult.style.width = "100%";
      document.querySelectorAll(".marketing-content.active").forEach((item) => item.classList.remove("active"));
      mvSection.classList.add("active");
      mvSection.style.display = "block";
      mvSection.style.width = "100%";
      overview.classList.remove("hidden");
      overview.style.display = "block";
      overview.style.width = "100%";
      window.currentScenes = [
        {
          time: "0:00-0:08",
          startSeconds: 0,
          endSeconds: 8,
          durationSeconds: 8,
          scene: "A lonely singer crosses a rain-wet neon alley while reflections stretch across the pavement.",
          lyrics: "I keep walking through the blue rain",
          location: "rainy neon alley",
          emotion: "lonely",
          mood: "quiet negative space",
          lighting: "blue-hour side light with soft signs",
          cameraWork: "slow dolly-in from shoulder height",
          prompt: "cinematic music video scene, rain-wet neon alley, lonely singer, slow dolly-in",
          promptKo: "비 내리는 네온 골목을 걷는 외로운 보컬, 느린 돌리 인",
        },
        {
          time: "0:08-0:18",
          startSeconds: 8,
          endSeconds: 18,
          durationSeconds: 10,
          scene: "The chorus opens on a rooftop with dawn light cutting through mist and distant buildings.",
          lyrics: "When morning breaks, I remember your name",
          location: "misty rooftop",
          emotion: "hopeful",
          mood: "wide sunrise release",
          lighting: "warm rim light",
          cameraWork: "crane-up reveal",
          prompt: "wide rooftop chorus shot, dawn mist, hopeful singer, warm rim light, crane-up reveal",
          promptKo: "새벽 안개 루프톱 코러스, 희망적인 보컬, 따뜻한 림 라이트",
        },
      ];
      window.renderSceneOverview(window.currentScenes);

      const selectors = [
        "#mv_scene_quality_summary",
        ".mv-scene-timeline-preview",
        ".mv-scene-overview-card",
        ".mv-scene-card-header",
        ".mv-scene-timing-editor-grid",
        ".mv-scene-metadata-editor-grid",
        ".mv-scene-prompt-editor-grid",
      ];
      const missing = selectors.filter((selector) => !document.querySelector(selector));
      const overflowX = Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ) - window.innerWidth;

      const overflowingChildren = [];
      document.querySelectorAll(
        ".mv-scene-overview-card input, .mv-scene-overview-card textarea, .mv-scene-overview-card button, .mv-scene-overview-card [role='status']",
      ).forEach((child) => {
        if (getComputedStyle(child).display === "none") return;
        const card = child.closest(".mv-scene-overview-card, .mv-scene-timeline-preview");
        if (!card) return;
        const childRect = child.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        if (
          childRect.width <= 0 ||
          childRect.height <= 0 ||
          childRect.left < cardRect.left - 2 ||
          childRect.right > cardRect.right + 2
        ) {
          overflowingChildren.push({
            tag: child.tagName.toLowerCase(),
            id: child.id || "",
            className: String(child.className || ""),
            childLeft: Math.round(childRect.left),
            childRight: Math.round(childRect.right),
            childWidth: Math.round(childRect.width),
            cardLeft: Math.round(cardRect.left),
            cardRight: Math.round(cardRect.right),
            cardWidth: Math.round(cardRect.width),
          });
        }
      });

      return {
        missing,
        overflowX,
        overflowingChildren,
        layout: Array.from(
          document.querySelector(".mv-scene-overview-card")?.parentElement?.children || [],
        ).slice(0, 1).map((item) => {
          const rect = item.getBoundingClientRect();
          const parent = item.parentElement;
          const parentRect = parent.getBoundingClientRect();
          return {
            rectWidth: Math.round(rect.width),
            parentWidth: Math.round(parentRect.width),
            parentDisplay: getComputedStyle(parent).display,
            parentClassName: String(parent.className || ""),
            containerWidth: Math.round(document.querySelector(".container")?.getBoundingClientRect().width || 0),
            innerWidth: window.innerWidth,
            visualWidth: Math.round(window.visualViewport?.width || 0),
            bodyWidth: Math.round(document.body.getBoundingClientRect().width),
            htmlWidth: Math.round(document.documentElement.getBoundingClientRect().width),
            mainWidth: Math.round(document.getElementById("mainWrapper")?.getBoundingClientRect().width || 0),
            panelWidth: Math.round(panel.getBoundingClientRect().width),
            marketingWidth: Math.round(marketingResult.getBoundingClientRect().width),
            mvWidth: Math.round(mvSection.getBoundingClientRect().width),
            overviewWidth: Math.round(overview.getBoundingClientRect().width),
          };
        }),
        cards: document.querySelectorAll(".mv-scene-overview-card").length,
        buttons: document.querySelectorAll(".mv-scene-overview-card button").length,
        inputs: document.querySelectorAll(".mv-scene-overview-card input, .mv-scene-overview-card textarea").length,
      };
    })()`,
  });

  const result = evaluation.result.value;
  assert.deepStrictEqual(result.missing || [], [], `${width}px should render all MV visual sections`);
  assert.ok(result.cards >= 2, `${width}px should render scene cards`);
  assert.ok(result.buttons >= 4, `${width}px should render scene action buttons`);
  assert.ok(result.inputs >= 14, `${width}px should render scene editor inputs`);
  assert.ok(result.overflowX <= 2, `${width}px should not create horizontal page overflow`);
  assert.ok(
    result.layout[0] && result.layout[0].rectWidth > width * 0.5,
    `${width}px should render scene cards at a usable width: ${JSON.stringify(result.layout)}`,
  );
  assert.deepStrictEqual(
    result.overflowingChildren,
    [],
    `${width}px should not let scene editor controls escape their cards`,
  );

  const screenshot = await cdp.send("Page.captureScreenshot", {
    captureBeyondViewport: false,
    fromSurface: true,
    format: "png",
  });
  assert.ok(
    screenshot.data && screenshot.data.length > 10000,
    `${width}px should produce a non-empty MV screenshot`,
  );
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

    await inspectViewport(cdp, 390, 900);
    await inspectViewport(cdp, 700, 900);
    await inspectViewport(cdp, 1280, 900);

    cdp.close();
    console.log("MV step6 visual sanity check: PASS");
  } finally {
    await cleanup();
  }
})().catch((error) => {
  cleanup().finally(() => {
    console.error(error);
    process.exit(1);
  });
});
