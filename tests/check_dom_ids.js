// DOM ID 참조 정합성 회귀 게이트
//
// 정적 index.html에 없는 getElementById() 대상을 모두 찾아낸다. 다만 실제로
// 전수 조사해보면(2026-09) 현재 28건 전부가 진짜 버그는 아니었다:
//  - 9건은 `document.getElementById("A") || document.getElementById("B")`
//    형태의 방어적 폴백 체인이며 B가 실제 존재해 항상 정상 동작한다
//    (예: mainAppContent→mainWrapper, mvLocation→mvLocationTags 계열,
//    finalizedStylePrompt 등 6단 폴백 체인의 중간 죽은 링크).
//  - 19건은 JS 템플릿 리터럴이 런타임에 직접 만들어 붙이는 요소다
//    (toast-container, customConfirmModal, 클라우드 동기화 모달 등).
// 완벽한 정적 분류기를 만드는 대신, 이 파일은 실행되고 결과가 눈에 보이도록
// 러너에 연결하고, "발견 건수가 현재 알려진 기준선을 넘지 않는다"는 회귀
// 게이트로 동작한다 — 새 코드가 진짜로 깨진 getElementById 참조를
// 추가하면 건수가 늘어나 이 테스트가 실패한다.
const assert = require("assert");
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

// 2026-09 전수 조사 시점의 알려진 기준선. 이 이하로는 통과, 초과하면
// 새로운(미검증) getElementById 참조가 추가된 것이므로 실패시켜 알린다.
const KNOWN_BASELINE = 28;
assert.ok(
  missingInHtml.length <= KNOWN_BASELINE,
  `DOM ID 참조 불일치가 ${missingInHtml.length}건으로 기준선(${KNOWN_BASELINE}건)을 초과했습니다. ` +
    `위 목록에서 새로 추가된 항목이 폴백/동적 생성 패턴인지 확인하세요.`,
);

console.log(`\n✅ DOM ID 참조 회귀 게이트 통과 (${missingInHtml.length}/${KNOWN_BASELINE})`);
