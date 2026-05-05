const assert = require("assert");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const url = "http://localhost:4174";
const port = 9224;
const serverPort = 4174;
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mv-responsive-"));
const projectRoot = path.resolve(__dirname, "..");

if (!fs.existsSync(chromePath)) {
  console.log("MV responsive layout smoke test: SKIP (Google Chrome not found)");
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

async function getMVGridColumns(cdp, width) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: width <= 480,
  });

  const evaluation = await cdp.send("Runtime.evaluate", {
    returnByValue: true,
    awaitPromise: true,
    expression: `(() => {
      const mvSection = document.getElementById("marketing-mv");
      const detailGrid = document.querySelector("#marketing-mv .mv-detail-grid");
      const settingsGrid = document.querySelector("#marketing-mv .mv-settings-grid");
      if (!mvSection || !detailGrid || !settingsGrid) {
        return { missing: true };
      }
      mvSection.classList.add("active");
      mvSection.style.display = "block";
      window.currentScenes = [{
        time: "0:00-0:08",
        startSeconds: 0,
        endSeconds: 8,
        durationSeconds: 8,
        scene: "responsive layout check scene",
        lyrics: "responsive lyric line",
        location: "rainy alley",
        emotion: "lonely",
        mood: "quiet negative space",
        lighting: "blue-hour side light",
        cameraWork: "slow dolly-in",
        prompt: "responsive prompt",
        promptKo: "반응형 프롬프트",
      }];
      if (typeof window.renderSceneOverview === "function") {
        window.renderSceneOverview(window.currentScenes);
      }
      const timingGrid = document.querySelector(".mv-scene-timing-editor-grid");
      const metadataGrid = document.querySelector(".mv-scene-metadata-editor-grid");
      const promptGrid = document.querySelector(".mv-scene-prompt-editor-grid");
      const countGridColumns = (grid) => {
        const columns = getComputedStyle(grid).gridTemplateColumns;
        let depth = 0;
        const tokens = [];
        let token = "";
        for (const char of columns) {
          if (char === "(") depth += 1;
          if (char === ")") depth -= 1;
          if (char === " " && depth === 0) {
            if (token.trim()) tokens.push(token.trim());
            token = "";
          } else {
            token += char;
          }
        }
        if (token.trim()) tokens.push(token.trim());
        return tokens.reduce((count, item) => {
          const repeatMatch = item.match(/^repeat\\((\\d+),/);
          return count + (repeatMatch ? Number(repeatMatch[1]) : 1);
        }, 0);
      };
      return {
        detailColumns: countGridColumns(detailGrid),
        settingsColumns: countGridColumns(settingsGrid),
        timingColumns: countGridColumns(timingGrid),
        metadataColumns: countGridColumns(metadataGrid),
        promptColumns: countGridColumns(promptGrid),
      };
    })()`,
  });

  return evaluation.result.value;
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

    const phone = await getMVGridColumns(cdp, 390);
    assert.deepStrictEqual(phone, {
      detailColumns: 1,
      settingsColumns: 1,
      timingColumns: 1,
      metadataColumns: 1,
      promptColumns: 1,
    });

    const tablet = await getMVGridColumns(cdp, 700);
    assert.deepStrictEqual(tablet, {
      detailColumns: 2,
      settingsColumns: 2,
      timingColumns: 1,
      metadataColumns: 1,
      promptColumns: 1,
    });

    const narrowDesktop = await getMVGridColumns(cdp, 850);
    assert.strictEqual(narrowDesktop.detailColumns, 3);
    assert.strictEqual(narrowDesktop.timingColumns, 3);
    assert.strictEqual(narrowDesktop.metadataColumns, 5);
    assert.strictEqual(narrowDesktop.promptColumns, 2);

    cdp.close();
    console.log("MV responsive layout smoke test: PASS");
  } finally {
    await cleanup();
  }
})().catch((error) => {
  cleanup().finally(() => {
    console.error(error);
    process.exit(1);
  });
});
