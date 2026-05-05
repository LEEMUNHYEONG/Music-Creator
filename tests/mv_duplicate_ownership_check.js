const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const files = ["app.js", "js/step6.js"];
const definitions = new Map();

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  assert.ok(
    !source.includes("LegacyUnused"),
    `${file} should not keep LegacyUnused MV function definitions`,
  );
  const re = /^window\.([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?function/gm;
  let match;
  while ((match = re.exec(source))) {
    const line = source.slice(0, match.index).split("\n").length;
    const name = match[1];
    if (!definitions.has(name)) definitions.set(name, []);
    definitions.get(name).push({ file, line });
  }
}

const duplicates = Object.fromEntries(
  Array.from(definitions.entries())
    .filter(([, defs]) => defs.length > 1)
    .map(([name, defs]) => [name, defs.map((def) => `${def.file}:${def.line}`)]),
);

const expectedDuplicates = [];

assert.deepStrictEqual(Object.keys(duplicates).sort(), expectedDuplicates.sort());

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const step6ScriptIndex = html.indexOf('src="js/step6.js');
const appScriptIndex = html.indexOf('src="app.js');
assert.ok(step6ScriptIndex !== -1, "index.html should load js/step6.js");
assert.ok(appScriptIndex !== -1, "index.html should load app.js");
assert.ok(
  step6ScriptIndex < appScriptIndex,
  "index.html should currently load js/step6.js before app.js",
);

for (const name of expectedDuplicates) {
  assert.ok(
    duplicates[name].some((entry) => entry.startsWith("app.js:")),
    `${name} should have a current app.js definition`,
  );
  assert.ok(
    duplicates[name].some((entry) => entry.startsWith("js/step6.js:")),
    `${name} should have a current step6.js definition`,
  );
}

console.log("MV duplicate ownership check: PASS");
