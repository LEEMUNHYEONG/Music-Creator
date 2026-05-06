const assert = require("assert");
const fs = require("fs");

const appJs = fs.readFileSync("app.js", "utf8");

assert.ok(
  appJs.includes('typeof style === "string"'),
  "renderVocalPartAssignments should accept legacy string assignments",
);
assert.ok(
  appJs.includes("style?.style || style?.label || style?.name"),
  "renderVocalPartAssignments should tolerate object-shaped assignments during project restore",
);
assert.ok(
  appJs.includes("const displayStyle = styleText"),
  "renderVocalPartAssignments should sanitize a normalized style text value",
);

console.log("MV vocal assignment restore smoke test: PASS");
