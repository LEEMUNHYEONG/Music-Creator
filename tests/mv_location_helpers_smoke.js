const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

global.window = global;

const appSource = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
const start = appSource.indexOf("const MV_LOCATION_MAP = {");
const end = appSource.indexOf("if (typeof document !== \"undefined\")", start);
assert.ok(start !== -1, "MV_LOCATION_MAP should exist in app.js");
assert.ok(end !== -1, "MV location helper block should end before DOM init");
vm.runInThisContext(appSource.slice(start, end), {
  filename: "app.js.mv-location-helper-slice",
});

window.getMVLocationValues = function getMVLocationValuesStub() {
  return ["city", "rain", "unknown-location"];
};

assert.strictEqual(
  window.getMVLocationEnString(),
  "urban cityscape, rain, rainy street, unknown-location",
);
assert.strictEqual(
  window.getMVLocationKoString(),
  "도시 (도심, 거리), 비, 빗속, unknown-location",
);

window.getMVLocationValues = function selectedLocationValues() {
  return ["beach", "subway", "rain"];
};
assert.strictEqual(
  window.pickBestLocationForScene("지하철 역 플랫폼에서 비를 기다린다", 0, 3),
  "subway",
);
assert.strictEqual(
  window.pickBestLocationForScene("우산 없이 빗속을 걷는다", 1, 3),
  "rain",
);
assert.strictEqual(
  window.pickBestLocationForScene("아무 키워드 없는 추상적인 장면", 2, 3),
  "rain",
);

window.getMVLocationValues = function emptyLocationValues() {
  return [];
};
assert.strictEqual(window.pickBestLocationForScene("도시", 0, 1), null);

window.getMVLocationValues = function oneLocationValue() {
  return ["forest"];
};
assert.strictEqual(window.pickBestLocationForScene("도시", 0, 1), "forest");

console.log("MV location helpers smoke test: PASS");
process.exit(0);
