const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const originalConsole = { ...console };
const alerts = [];
const toasts = [];
let clipboardText = "";
let fallbackText = "";
let blobText = "";
let clickedDownload = "";
let revokedUrl = "";
let preventCount = 0;
let stopCount = 0;

console.log = function logStub() {};
console.error = function errorStub() {};

global.window = global;
global.document = {
  getElementById(id) {
    if (id === "finalTitleText") {
      return { textContent: "My Song! 2026", value: "" };
    }
    return null;
  },
  createElement(tag) {
    if (tag === "textarea") {
      return {
        value: "",
        style: {},
        select() {
          fallbackText = this.value;
        },
      };
    }
    if (tag === "a") {
      return {
        href: "",
        download: "",
        click() {
          clickedDownload = this.download;
        },
      };
    }
    throw new Error(`Unexpected element: ${tag}`);
  },
  execCommand(command) {
    return command === "copy";
  },
  body: {
    appendChild() {},
    removeChild() {},
  },
};
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    clipboard: {
      writeText(text) {
        clipboardText = text;
        return Promise.resolve();
      },
    },
  },
});
global.Blob = class BlobStub {
  constructor(parts, options) {
    blobText = parts.join("");
    this.options = options;
  }
};
global.URL = {
  createObjectURL() {
    return "blob:srt";
  },
  revokeObjectURL(url) {
    revokedUrl = url;
  },
};
global.alert = function alertStub(message) {
  alerts.push(message);
};
window.showCopyIndicator = function showCopyIndicatorStub(message) {
  toasts.push(message);
};

const appSource = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
const start = appSource.indexOf("window.copySRTContent = function");
const end = appSource.indexOf("// ═══════════════════════════════════════════════════════════════\n// localStorage 용량 관리 함수", start);
assert.ok(start !== -1, "copySRTContent should exist in app.js");
assert.ok(end !== -1, "SRT export block should end before storage helpers");
vm.runInThisContext(appSource.slice(start, end), {
  filename: "app.js.srt-export-slice",
});

window.currentSRTContent = "1\n00:00:00,000 --> 00:00:02,000\nHello\n";

window.copySRTContent({
  stopPropagation() {
    stopCount += 1;
  },
  preventDefault() {
    preventCount += 1;
  },
});

setImmediate(() => {
  assert.strictEqual(stopCount, 1);
  assert.strictEqual(preventCount, 1);
  assert.strictEqual(clipboardText, window.currentSRTContent);
  assert.ok(toasts.some((message) => message.includes("클립보드")));

  navigator.clipboard.writeText = function rejectWriteText() {
    return Promise.reject(new Error("denied"));
  };
  window.copySRTContent();

  setImmediate(() => {
    assert.strictEqual(fallbackText, window.currentSRTContent);

    window.downloadSRT("win");
    assert.strictEqual(clickedDownload, "My_Song_2026.srt");
    assert.ok(blobText.includes("\r\n"));
    assert.strictEqual(revokedUrl, "blob:srt");
    assert.ok(toasts.some((message) => message.includes("윈도우용")));

    window.currentSRTContent = "";
    window.downloadSRT("mac");
    assert.ok(alerts.some((message) => message.includes("다운로드할 SRT")));

    originalConsole.log("MV SRT export smoke test: PASS");
    process.exit(0);
  });
});
