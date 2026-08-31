const assert = require("assert");

const elements = new Map();
let requestedType = null;
let toastMessage = "";

function makeClassList(initial = []) {
  const set = new Set(initial);
  return {
    contains(name) {
      return set.has(name);
    },
    remove(name) {
      set.delete(name);
    },
  };
}

function addInput(id, value = "") {
  elements.set(id, { id, value });
}

function addButton(id, originalHTML) {
  const button = {
    id,
    dataset: { originalHTML },
    innerHTML: '<i class="fas fa-check"></i> 복사됨',
    disabled: true,
    classList: makeClassList(["copied"]),
  };
  elements.set(id, button);
  return button;
}

global.window = global;
global.document = {
  readyState: "loading",
  addEventListener() {},
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelector(selector) {
    if (selector === '.copy-mv-overview-btn[data-type="thumbnail"]') {
      return elements.get("overviewThumbnailCopyBtn") || null;
    }
    return null;
  },
  querySelectorAll() {
    return [];
  },
};
global.alert = function alertStub(message) {
  throw new Error(`Unexpected alert: ${message}`);
};

addInput("mvEra", "modern");
addInput("mvCountry", "Korea");
addInput("mvLocation", "city");
addInput("mvCharacterCount", "1");
addInput("mvCustomSettings", "rain");
addInput("mvLighting", "neon");
addInput("mvCameraWork", "tracking");
addInput("mvMood", "melancholy");
addInput("mvCharacter1_gender", "female");
addInput("mvCharacter1_appearance", "black coat");

const mainButton = addButton(
  "copyMVThumbnailBtn",
  '<i class="fas fa-copy"></i> 메인 복사',
);
const overviewButton = addButton(
  "overviewThumbnailCopyBtn",
  '<i class="fas fa-copy"></i> 개요 복사',
);

window.showCopyIndicator = function showCopyIndicator(message) {
  toastMessage = message;
};

require("../test-results/mv_modules.compat.js");

window.regenerateSingleStylePrompt = async function regenerateSingleStylePromptStub(
  type,
) {
  requestedType = type;
};

(async () => {
  await window.regenerateMVPrompt("thumbnail");

  assert.strictEqual(requestedType, "thumbnail");
  assert.ok(toastMessage.includes("thumbnail"));

  assert.strictEqual(mainButton.innerHTML, '<i class="fas fa-copy"></i> 메인 복사');
  assert.strictEqual(mainButton.disabled, false);
  assert.strictEqual(mainButton.classList.contains("copied"), false);

  assert.strictEqual(
    overviewButton.innerHTML,
    '<i class="fas fa-copy"></i> 개요 복사',
  );
  assert.strictEqual(overviewButton.disabled, false);
  assert.strictEqual(overviewButton.classList.contains("copied"), false);

  console.log("MV regenerate prompt ownership smoke test: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
