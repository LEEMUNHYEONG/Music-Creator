const assert = require("assert");

const originalConsole = { ...console };
let currentContainer;
let saveCount = 0;

console.log = function logStub() {};

function makeClassList(initial = []) {
  const set = new Set(initial);
  return {
    contains(name) {
      return set.has(name);
    },
    toggle(name) {
      if (set.has(name)) {
        set.delete(name);
        return false;
      }
      set.add(name);
      return true;
    },
  };
}

function makeTagButton() {
  return {
    classList: makeClassList(["tag-btn"]),
    getAttribute(name) {
      return name === "data-value" ? "city" : null;
    },
    closest(selector) {
      return selector === ".tag-btn" ? this : null;
    },
  };
}

function makeContainer() {
  return {
    id: "mvLocationTags",
    handler: null,
    parentNode: {
      replaceChild(newNode) {
        currentContainer = newNode;
      },
    },
    cloneNode() {
      return makeContainer();
    },
    addEventListener(type, handler) {
      if (type === "click") this.handler = handler;
    },
  };
}

global.window = global;
global.document = {
  readyState: "loading",
  addEventListener() {},
  getElementById() {
    return null;
  },
  querySelectorAll(selector) {
    return selector === ".tag-container" ? [currentContainer] : [];
  },
};

currentContainer = makeContainer();
require("../js/step6.js");

window.saveMVSettings = function saveMVSettingsStub() {
  saveCount += 1;
};

window.initializeTagButtons();
window.initializeTagButtons();

const tagButton = makeTagButton();
currentContainer.handler({
  target: tagButton,
  preventDefault() {},
  stopPropagation() {},
});

assert.strictEqual(saveCount, 1);
assert.strictEqual(tagButton.classList.contains("active"), true);

originalConsole.log("MV tag buttons smoke test: PASS");
