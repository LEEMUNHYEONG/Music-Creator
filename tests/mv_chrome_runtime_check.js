const assert = require("assert");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const chromePath =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const url = "http://localhost:4173";
const port = 9223;
const serverPort = 4173;
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mv-chrome-"));
const projectRoot = path.resolve(__dirname, "..");

if (!fs.existsSync(chromePath)) {
  console.log("MV Chrome runtime check: SKIP (Google Chrome not found)");
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
  fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
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

    const evaluation = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      awaitPromise: true,
      expression: `(() => {
        const names = [
          "copyAllMVPrompts",
          "generateMVDetailPrompts",
          "syncMVPromptTranslation",
          "syncSceneOverviewPromptTranslation",
          "syncScenePromptTranslation",
          "regenerateMVPrompt",
          "saveScenePrompt",
          "markMVScenePromptDirty",
          "saveFocusedMVScenePrompt",
          "buildMVExportMetadataHeader",
          "getMVProjectTitleForExport",
          "buildMVImagePromptBundle",
          "copyMVImagePromptBundle",
          "downloadMVImagePromptBundle",
          "buildMarketingMVDiagnostics",
          "compareMarketingMVDiagnostics",
          "formatMarketingMVDiagnosticsComparison",
          "logMarketingMVSaveComparison",
          "showMarketingMVDiagnostics",
          "buildSingleProjectJSONExport",
          "exportCurrentProjectJSON",
          "importSingleProjectJSONFromText",
          "buildMVScenePromptTableText",
          "copyMVScenePromptTable",
          "buildMVVideoToolPrompts",
          "copyMVVideoToolPrompts",
          "downloadMVVideoToolPrompts",
          "initializeTagButtons",
          "getMVLocationValues",
        ];
        return {
          readyState: document.readyState,
          functions: Object.fromEntries(names.map((name) => [name, typeof window[name]])),
          legacyKeys: Object.keys(window).filter((key) => key.includes("LegacyUnused")),
          mvControls: {
            thumbnailButton: !!document.querySelector("button[onclick=\\"regenerateMVPrompt('thumbnail')\\"]"),
            backgroundButton: !!document.querySelector("button[onclick=\\"regenerateMVPrompt('background')\\"]"),
            characterButton: !!document.querySelector("button[onclick=\\"regenerateMVPrompt('character')\\"]"),
            thumbnailEn: !!document.getElementById("mvThumbnailPromptEn"),
            thumbnailKo: !!document.getElementById("mvThumbnailPromptKo"),
            backgroundEn: !!document.getElementById("mvBackgroundDetailPromptEn"),
            characterEn: !!document.getElementById("mvCharacterDetailPromptEn"),
          },
        };
      })()`,
    });

    const result = evaluation.result.value;
    assert.strictEqual(result.readyState, "complete");
    assert.deepStrictEqual(result.legacyKeys, []);
    assert.deepStrictEqual(
      Object.values(result.functions),
      Object.keys(result.functions).map(() => "function"),
    );
    assert.deepStrictEqual(result.mvControls, {
      thumbnailButton: true,
      backgroundButton: true,
      characterButton: true,
      thumbnailEn: true,
      thumbnailKo: true,
      backgroundEn: true,
      characterEn: true,
    });

    cdp.close();
    console.log("MV Chrome runtime check: PASS");
  } finally {
    await cleanup();
  }
})().catch((error) => {
  cleanup().finally(() => {
  console.error(error);
  process.exit(1);
  });
});
