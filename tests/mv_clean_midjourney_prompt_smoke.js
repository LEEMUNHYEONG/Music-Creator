const assert = require("assert");
const fs = require("fs");
const path = require("path");

function runTest() {
  console.log("▶ Run: tests/mv_clean_midjourney_prompt_smoke.js");

  // Load core_utilities.js in a mock browser environment
  const coreUtilsPath = path.join(__dirname, "../js/mv/core_utilities.js");
  const coreUtilsCode = fs.readFileSync(coreUtilsPath, "utf8");

  global.window = {};
  const evalFunc = new Function("window", coreUtilsCode + "\nreturn { cleanMidjourneyPrompt: window.cleanMidjourneyPrompt, cleanEnglishMidjourneyPrompt: window.cleanEnglishMidjourneyPrompt };");
  const { cleanMidjourneyPrompt, cleanEnglishMidjourneyPrompt } = evalFunc(global.window);

  assert.strictEqual(typeof cleanMidjourneyPrompt, "function", "cleanMidjourneyPrompt should be a function");
  assert.strictEqual(typeof cleanEnglishMidjourneyPrompt, "function", "cleanEnglishMidjourneyPrompt should be a function");

  // Test 1: User reported dirty Suno prompt sample
  const dirtyPrompt = `[Scene 1 of 20] , . ., — — , , Korean acoustic folk-pop, whimsical chamber pop, 92 BPM, bright acoustic guitar strums, upright piano arpeggios, brushed snare kit, rounded electric bass, pizzicato string figures, glockenspiel accents, gentle handclaps, field ambience, wordless humming hook, clear young adult vocal, soft harmony replies, tape saturation, clean vocal-forward mix, 60s chamber pop, playful courage, bittersweet childhood, -harsh treble, -piercing high notes, -thin falsetto, -nasal vocal tone, -robotic voice, -excessive autotune, -metallic synth, -distorted clipping, -muddy low end, -lo-fi noise, -chaotic drums, -overly busy arrangement, -sudden genre switch, -unclear Korean pronunciation, -spoken narration, -comedy voice, -childish cartoon voice, -nursery rhyme feeling, -literal solfege singing, -overly sad ballad mood, -funeral mood, -heavy rock distortion, -EDM drop, -cheap club synth, a cozy village house with a charming wooden door, morning sunlight spilling over the threshold, the soft rustle of leaves in a gentle breeze, joyful, gentle warmth enveloping the crisp morning air, soft morning light filtering through the trees, casting dappled shadows on the ground, wide shot capturing the quaint house, slowly dolly in on the character's joyful expression as they step outside, ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio`;

  const cleaned = cleanMidjourneyPrompt(dirtyPrompt);

  assert(!cleaned.includes("-harsh treble"), "Should remove '-harsh treble'");
  assert(!cleaned.includes("-piercing high notes"), "Should remove '-piercing high notes'");
  assert(!cleaned.includes("92 BPM"), "Should remove '92 BPM'");
  assert(!cleaned.includes("clear young adult vocal"), "Should remove 'clear young adult vocal'");
  assert(!cleaned.includes("tape saturation"), "Should remove 'tape saturation'");
  assert(!cleaned.includes(", . ., — — , ,"), "Should remove punctuation fragments");

  assert(cleaned.includes("a cozy village house with a charming wooden door"), "Should keep visual scene location");
  assert(cleaned.includes("morning sunlight spilling over the threshold"), "Should keep visual lighting details");
  assert(cleaned.includes("ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio"), "Should keep visual quality keywords");

  // Test 2: English prompt mixed with Korean lyrics or descriptions
  const mixedKoreanPrompt = `/* Scene 1 */ scene depicting: "아침이 내 이마를 톡 건드리면 배고픈 꿈도 기지개를 켜고", 인물1: 여성 20대 한국인, a cozy village house, morning sunlight, ultra high quality, 8k resolution`;

  const pureEnglish = cleanEnglishMidjourneyPrompt(mixedKoreanPrompt);

  assert(!/[\u3131-\u318E\uAC00-\uD7A3]/.test(pureEnglish), "English prompt must not contain Korean characters");
  assert(pureEnglish.includes("a cozy village house"), "Should keep English visual location");
  assert(pureEnglish.includes("morning sunlight"), "Should keep English lighting");
  assert(pureEnglish.startsWith("/* Scene 1 */"), "Should keep scene header");

  console.log("MV clean Midjourney prompt smoke test: PASS");
}

try {
  runTest();
} catch (err) {
  console.error("❌ Test failed:", err);
  process.exit(1);
}
