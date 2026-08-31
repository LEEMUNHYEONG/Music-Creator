const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const htmlContent = fs.readFileSync(path.join(root, "index.html"), "utf8");

// HTML 내 모든 id="xxx" 추출
const htmlIds = new Set();
const htmlIdRegex = /\bid=["']([^"']+)["']/g;
let match;
while ((match = htmlIdRegex.exec(htmlContent)) !== null) {
  htmlIds.add(match[1]);
}

// JS 파일들
const jsDir = path.join(root, "js");
function getJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getJsFiles(filePath));
    } else if (file.endsWith(".js")) {
      results.push(filePath);
    }
  });
  return results;
}

const jsFiles = getJsFiles(jsDir);
const jsReferencedIds = new Map(); // id -> [file:line]

const getElementByIdRegex = /getElementById\s*\(\s*["']([^"']+)["']\s*\)/g;

jsFiles.forEach((file) => {
  const relPath = path.relative(root, file);
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    let m;
    while ((m = getElementByIdRegex.exec(line)) !== null) {
      const id = m[1];
      if (!jsReferencedIds.has(id)) {
        jsReferencedIds.set(id, []);
      }
      jsReferencedIds.get(id).push(`${relPath}:${idx + 1}`);
    }
  });
});

console.log(`📊 HTML에 정의된 총 ID 수: ${htmlIds.size}`);
console.log(`📊 JS에서 참조된 총 ID 수: ${jsReferencedIds.size}`);

const missingInHtml = [];
const dynamicIdPatterns = [
  /^scene_/,
  /^scene_overview_/,
  /^mvCharacter\d+/,
  /^step\d+/,
  /^char\d+/,
  /^vocal_/,
  /^history_/,
  /^preset_/,
  /^tag_/,
  /^user_/,
  /^project_/,
  /^tab_/,
  /^btn_/,
  /^\${/,
];

for (const [id, locations] of jsReferencedIds.entries()) {
  if (!htmlIds.has(id)) {
    const isDynamic = dynamicIdPatterns.some((pattern) => pattern.test(id));
    if (!isDynamic) {
      missingInHtml.push({ id, locations });
    }
  }
}

console.log(`\n🔍 정적 HTML에 없고 동적 패턴으로도 분류되지 않는 참조 ID (${missingInHtml.length}개):`);
missingInHtml.forEach(({ id, locations }) => {
  console.log(`- [${id}] in: ${locations.slice(0, 3).join(", ")}`);
});
