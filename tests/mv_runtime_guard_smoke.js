const assert = require("assert");
const fs = require("fs");
const path = require("path");

const appSource = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
const apiSource = fs.readFileSync(path.resolve(__dirname, "../js/api.js"), "utf8");
const storageSource = fs.readFileSync(path.resolve(__dirname, "../js/storage.js"), "utf8");

assert.ok(apiSource.includes("markGeminiTemporarilyDisabled"));
assert.ok(apiSource.includes("isGeminiTemporarilyDisabled"));
assert.ok(apiSource.includes("handleGeminiApiFailure"));
assert.ok(apiSource.includes("sessionStorage.setItem(\"geminiDisabledUntil\""));
assert.ok(apiSource.includes("return \"\";"));

assert.ok(appSource.includes("window.handleGeminiApiFailure(geminiError)"));
assert.ok(storageSource.includes("window.__isLoadingProject"));
assert.ok(storageSource.includes("중복 프로젝트 로드 요청 무시"));
assert.ok(storageSource.includes("now - Number(window.__lastLoadProjectStartedAt || 0) < 1200"));

console.log("MV runtime guard smoke test: PASS");
process.exit(0);
