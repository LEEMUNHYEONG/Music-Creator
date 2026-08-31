// === MV Step 6: Location, settings, and character helpers ===
// --- Extracted getMVLocationValues ---
window.getMVLocationValues = function () {
  const container = document.getElementById("mvLocationTags");
  if (!container) return [];
  const activeTags = container.querySelectorAll(".tag-btn.active");
  return Array.from(activeTags)
    .map((btn) => btn.getAttribute("data-value"))
    .filter((v) => !!v);
};

// --- Extracted MV settings helpers ---
window.updateMVImageCount = function () {
  const minutes = parseInt(document.getElementById("mvMinutes")?.value || 3);
  const seconds = parseInt(document.getElementById("mvSeconds")?.value || 30);
  const interval = parseInt(document.getElementById("mvInterval")?.value || 8);

  const totalSeconds = minutes * 60 + seconds;
  const imageCount = Math.ceil(totalSeconds / interval);

  const resultEl = document.getElementById("mvImageCount");
  if (resultEl) {
    resultEl.textContent = imageCount;
  }

  const intervalDisplay = document.getElementById("mvIntervalDisplay");
  if (intervalDisplay) {
    intervalDisplay.textContent = interval;
  }

  const totalDuration = document.getElementById("mvTotalDuration");
  if (totalDuration) {
    totalDuration.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  if (typeof window.updateMVWorkflowSummary === "function") {
    window.updateMVWorkflowSummary();
  }
};

window.updateMVWorkflowSummary = function () {
  const summaryEl = document.getElementById("mvWorkflowSummary");
  const titleEl = document.getElementById("mvWorkflowSummaryTitle");
  const textEl = document.getElementById("mvWorkflowSummaryText");
  const badgesEl = document.getElementById("mvWorkflowSummaryBadges");
  const actionsEl = document.getElementById("mvWorkflowSummaryActions");
  if (!summaryEl || !titleEl || !textEl || !badgesEl) return;

  const minutes = parseInt(document.getElementById("mvMinutes")?.value || 0, 10);
  const seconds = parseInt(document.getElementById("mvSeconds")?.value || 0, 10);
  const interval = parseInt(document.getElementById("mvInterval")?.value || 8, 10);
  const totalSeconds = Math.max(0, minutes * 60 + seconds);
  const expectedScenes = interval > 0 ? Math.ceil(totalSeconds / interval) : 0;
  const scenes = Array.isArray(window.currentScenes) ? window.currentScenes : [];
  const sceneCount = scenes.length;
  const dirtyCount = document.querySelectorAll?.(
    '.mv-scene-unsaved-badge[data-dirty="true"]',
  ).length || 0;
  const overviewSection = document.getElementById("mvSceneOverviewSection");
  const resultsSection = document.getElementById("mvResultsSection");
  const overviewVisible =
    overviewSection &&
    !overviewSection.classList.contains("hidden") &&
    overviewSection.style.display !== "none";
  const resultsVisible =
    resultsSection &&
    !resultsSection.classList.contains("hidden") &&
    resultsSection.style.display !== "none";

  let state = "settings";
  let title = "MV 작업 상태";
  let text = "노래 길이와 장면 전환 간격을 확인한 뒤 MV 프롬프트를 생성하세요.";
  let primaryAction = "generate";
  let primaryLabel = "다음: 프롬프트 생성";
  let secondaryAction = "";
  let secondaryLabel = "";

  if (dirtyCount > 0) {
    state = "dirty";
    title = "저장 필요한 씬이 있습니다";
    text = `수정 미저장 씬 ${dirtyCount}개가 있습니다. 복사/내보내기 전에 씬 저장 또는 현재 편집 내용 전체 저장을 권장합니다.`;
    primaryAction = "save-dirty";
    primaryLabel = "다음: 미저장 씬 저장";
    secondaryAction = "focus-dirty";
    secondaryLabel = "미저장 씬 보기";
  } else if (overviewVisible) {
    state = "review";
    title = "씬 개요 확인 단계";
    text = "시간, 가사 구간, 장소/감정/카메라와 EN/KO 프롬프트를 확인한 뒤 현재 편집 내용 전체 저장을 누르세요.";
    primaryAction = "confirm";
    primaryLabel = "다음: 전체 저장";
    secondaryAction = "focus-review";
    secondaryLabel = "확인 필요 씬 보기";
  } else if (resultsVisible || sceneCount > 0) {
    state = "ready";
    title = "MV 프롬프트 사용 가능";
    text = "씬별 프롬프트가 준비되었습니다. 필요한 씬을 복사하거나 이미지/영상 도구별 템플릿으로 내보내세요.";
    primaryAction = "copy-image";
    primaryLabel = "다음: 이미지 번들 복사";
    secondaryAction = "copy-table";
    secondaryLabel = "씬 표 복사";
  }

  const badgeItems = [
    `${expectedScenes || 0}장 예상`,
    `${sceneCount}씬 생성`,
    dirtyCount > 0 ? `${dirtyCount}개 미저장` : "저장 상태 정상",
  ];

  summaryEl.dataset.state = state;
  titleEl.textContent = title;
  textEl.textContent = text;
  summaryEl.dataset.primaryAction = primaryAction;
  summaryEl.dataset.secondaryAction = secondaryAction;
  badgesEl.innerHTML = badgeItems
    .map((item, index) => {
      const isWarning = item.includes("미저장");
      const background = isWarning
        ? "rgba(245, 158, 11, 0.12)"
        : index === 1 && sceneCount > 0
          ? "rgba(16, 185, 129, 0.10)"
          : "rgba(96, 165, 250, 0.10)";
      const color = isWarning
        ? "#f59e0b"
        : index === 1 && sceneCount > 0
          ? "var(--success)"
          : "var(--accent)";
      return `<span style="padding: 4px 8px; border-radius: 999px; background: ${background}; color: ${color}; font-size: 0.76rem; font-weight: 700;">${escapeMVTextarea(item)}</span>`;
    })
    .join("");

  if (actionsEl) {
    const buttonStyle = 'style="padding: 5px 10px; font-size: 0.78rem;"';
    const buttons = [
      `<button type="button" class="btn btn-small btn-primary" onclick="if(typeof window.runMVWorkflowPrimaryAction==='function')window.runMVWorkflowPrimaryAction()" title="현재 MV 작업 상태에 맞는 다음 동작을 실행합니다" ${buttonStyle}>${escapeMVTextarea(primaryLabel)}</button>`,
    ];
    if (secondaryAction && secondaryLabel) {
      buttons.push(
        `<button type="button" class="btn btn-small btn-secondary" onclick="if(typeof window.runMVWorkflowSecondaryAction==='function')window.runMVWorkflowSecondaryAction()" title="보조 동작을 실행합니다" ${buttonStyle}>${escapeMVTextarea(secondaryLabel)}</button>`,
      );
    }
    actionsEl.innerHTML = buttons.join("");
  }
};

window.runMVWorkflowAction = function (action) {
  switch (action) {
    case "generate": {
      const btn = document.getElementById("mvGenerateBtn");
      if (btn && typeof btn.click === "function") btn.click();
      else if (typeof window.generateSceneOverview === "function") window.generateSceneOverview();
      break;
    }
    case "save-dirty":
      if (typeof window.saveFocusedMVScenePrompt === "function") {
        window.saveFocusedMVScenePrompt();
      }
      break;
    case "focus-dirty":
      if (typeof window.focusMVFirstDirtyScene === "function") {
        window.focusMVFirstDirtyScene();
      }
      break;
    case "confirm":
      if (typeof window.saveAndConfirmMVPrompts === "function") {
        window.saveAndConfirmMVPrompts();
      }
      break;
    case "focus-review":
      if (typeof window.focusMVFirstReviewScene === "function") {
        window.focusMVFirstReviewScene();
      }
      break;
    case "copy-table":
      if (typeof window.copyMVScenePromptTable === "function") {
        window.copyMVScenePromptTable();
      }
      break;
    case "copy-image":
      if (typeof window.copyMVImagePromptBundle === "function") {
        window.copyMVImagePromptBundle();
      } else if (typeof window.copyAllMVPrompts === "function") {
        window.copyAllMVPrompts();
      }
      break;
    default:
      break;
  }
};

window.runMVWorkflowPrimaryAction = function () {
  const action = document.getElementById("mvWorkflowSummary")?.dataset?.primaryAction;
  window.runMVWorkflowAction(action);
};

window.runMVWorkflowSecondaryAction = function () {
  const action = document.getElementById("mvWorkflowSummary")?.dataset?.secondaryAction;
  window.runMVWorkflowAction(action);
};

const MV_SETTINGS_PRESETS_KEY = "mvSettingsPresets";

const MV_SETTING_COMBO_RECOMMENDATIONS = [
  {
    id: "rainy-city",
    name: "빗속 도시 감성",
    description: "네온, 비, 골목, 느린 돌리 촬영",
    locationTags: ["urban-night", "street", "alley", "rain"],
    actionTags: ["walking", "looking-away", "close-up-face"],
    lighting: "neon",
    cameraWork: "dolly",
    mood: "melancholic",
  },
  {
    id: "dream-rooftop",
    name: "몽환 옥상 야경",
    description: "옥상, 밤하늘, 부드러운 팬 촬영",
    locationTags: ["rooftop-night", "night-sky", "city"],
    actionTags: ["looking-up", "silhouette", "back-view"],
    lighting: "blue-hour",
    cameraWork: "pan",
    mood: "dreamy",
  },
  {
    id: "live-stage",
    name: "라이브 공연 무드",
    description: "공연장, 스튜디오 조명, 와이드 샷",
    locationTags: ["concert", "stadium", "club"],
    actionTags: ["singing", "playing-instrument", "dancing"],
    lighting: "studio",
    cameraWork: "wide-shot",
    mood: "energetic",
  },
  {
    id: "quiet-room",
    name: "고요한 실내 독백",
    description: "침실/카페, 자연광, 얼굴 클로즈업",
    locationTags: ["bedroom", "cafe", "indoor"],
    actionTags: ["sitting", "reading", "close-up-face"],
    lighting: "natural",
    cameraWork: "close-up",
    mood: "peaceful",
  },
  {
    id: "hopeful-sunset",
    name: "희망적인 석양 길",
    description: "공원/다리/석양, 트래킹 촬영",
    locationTags: ["park", "bridge", "sunset"],
    actionTags: ["running-toward", "smiling", "wave"],
    lighting: "golden-hour",
    cameraWork: "tracking",
    mood: "gentle",
  },
];

window.getMVTagValues = function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll(".tag-btn.active"))
    .map((btn) => btn.getAttribute("data-value") || btn.dataset?.value)
    .filter(Boolean);
};

window.collectMVSettingsSnapshot = function () {
  const characterCount =
    document.getElementById("mvCharacterCount")?.value || "1";
  const characters = [];
  for (let i = 1; i <= parseInt(characterCount); i++) {
    const gender =
      document.getElementById(`mvCharacter${i}_gender`)?.value || "";
    const age = document.getElementById(`mvCharacter${i}_age`)?.value || "";
    const race = document.getElementById(`mvCharacter${i}_race`)?.value || "";
    const appearance =
      document.getElementById(`mvCharacter${i}_appearance`)?.value || "";
    const artStyle =
      document.getElementById(`mvCharacter${i}_artStyle`)?.value || "photorealistic";
    const characterSheet =
      document.getElementById(`mvCharacter${i}_sheet`)?.value || "";
    characters.push({ gender, age, race, appearance, artStyle, characterSheet });
  }
  const locationTags =
    typeof window.getMVLocationValues === "function"
      ? window.getMVLocationValues()
      : window.getMVTagValues("mvLocationTags");
  const actionTags =
    typeof window.getSelectedTags === "function"
      ? window.getSelectedTags("mvActionTags")
      : window.getMVTagValues("mvActionTags");

  return {
    minutes: document.getElementById("mvMinutes")?.value || 3,
    seconds: document.getElementById("mvSeconds")?.value || 30,
    interval: document.getElementById("mvInterval")?.value || 8,
    era: document.getElementById("mvEra")?.value || "",
    country: document.getElementById("mvCountry")?.value || "",
    location: locationTags,
    locationTags,
    locationCustom: document.getElementById("mvLocationCustom")?.value || "",
    actionTags,
    actionCustom: document.getElementById("mvActionCustom")?.value || "",
    characterCount: characterCount,
    characters: characters,
    customSettings: document.getElementById("mvCustomSettings")?.value || "",
    lighting: document.getElementById("mvLighting")?.value || "",
    cameraWork: document.getElementById("mvCameraWork")?.value || "",
    mood: document.getElementById("mvMood")?.value || "",
  };
};

window.applyMVTagSelections = function (containerId, values) {
  const selectedValues = Array.isArray(values) ? values : values ? [values] : [];
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll(".tag-btn").forEach((btn) => {
    const value = btn.getAttribute("data-value") || btn.dataset?.value;
    if (selectedValues.includes(value)) btn.classList.add("active");
    else btn.classList.remove("active");
  });
};

window.applyMVSettingsToForm = function (settings = {}) {
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  };

  setValue("mvMinutes", settings.minutes || 3);
  setValue("mvSeconds", settings.seconds || 30);
  setValue("mvInterval", settings.interval || 8);
  setValue("mvEra", settings.era || "");
  setValue("mvCountry", settings.country || "");
  setValue("mvCharacterCount", settings.characterCount || "1");
  setValue("mvCustomSettings", settings.customSettings || "");
  setValue("mvLighting", settings.lighting || "");
  setValue("mvCameraWork", settings.cameraWork || "");
  setValue("mvMood", settings.mood || "");
  setValue("mvLocationCustom", settings.locationCustom || "");
  setValue("mvActionCustom", settings.actionCustom || "");

  const locationValues = Array.isArray(settings.locationTags)
    ? settings.locationTags
    : Array.isArray(settings.location)
      ? settings.location
      : [];
  window.applyMVTagSelections("mvLocationTags", locationValues);
  window.applyMVTagSelections("mvActionTags", settings.actionTags || []);

  if (typeof window.updateCharacterInputs === "function") {
    window.updateCharacterInputs();
  }

  if (Array.isArray(settings.characters)) {
    settings.characters.forEach((char, index) => {
      const i = index + 1;
      setValue(`mvCharacter${i}_gender`, char.gender || "");
      setValue(`mvCharacter${i}_age`, char.age || "");
      setValue(`mvCharacter${i}_race`, char.race || "");
      setValue(`mvCharacter${i}_appearance`, char.appearance || "");
      setValue(`mvCharacter${i}_artStyle`, char.artStyle || "");
      setValue(`mvCharacter${i}_sheet`, char.characterSheet || "");

      const sheetArea = document.getElementById(`mvCharacter${i}_sheetArea`);
      if (sheetArea && char.characterSheet) sheetArea.style.display = "block";
      const sheetToggle = document.getElementById(`mvCharacter${i}_sheetToggle`);
      if (sheetToggle && char.characterSheet) sheetToggle.style.display = "inline-flex";
      const sheetCopy = document.getElementById(`mvCharacter${i}_sheetCopy`);
      if (sheetCopy && char.characterSheet) sheetCopy.style.display = "inline-flex";
    });
  }

  if (typeof window.updateMVImageCount === "function") {
    window.updateMVImageCount();
  }
};

window.getMVSettingsPresets = function () {
  const parsePresets = (value) => {
    try {
      const parsed = JSON.parse(value || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };
  const localPresets = parsePresets(localStorage.getItem(MV_SETTINGS_PRESETS_KEY));
  const projectPresets =
    window.currentProject?.data?.marketing?.mvSettingPresets || [];
  const merged = [...projectPresets, ...localPresets].filter(
    (preset) => preset && preset.id && preset.settings,
  );
  const seen = new Set();
  return merged.filter((preset) => {
    if (seen.has(preset.id)) return false;
    seen.add(preset.id);
    return true;
  });
};

window.saveMVSettingsPresets = function (presets) {
  const safePresets = Array.isArray(presets) ? presets.slice(0, 20) : [];
  localStorage.setItem(MV_SETTINGS_PRESETS_KEY, JSON.stringify(safePresets));
  if (window.currentProject?.data) {
    if (!window.currentProject.data.marketing) {
      window.currentProject.data.marketing = {};
    }
    window.currentProject.data.marketing.mvSettingPresets = JSON.parse(
      JSON.stringify(safePresets),
    );
    if (typeof window.saveCurrentProject === "function") {
      window.saveCurrentProject();
    }
  }
  return safePresets;
};

window.renderMVSettingsPresetControls = function () {
  const select = document.getElementById("mvSettingsPresetSelect");
  const status = document.getElementById("mvSettingsPresetStatus");
  if (!select) return;

  const presets = window.getMVSettingsPresets();
  const currentValue = select.value;
  select.innerHTML =
    '<option value="">저장된 프리셋 선택</option>' +
    presets
      .map(
        (preset) =>
          `<option value="${escapeMVTextarea(preset.id)}">${escapeMVTextarea(preset.name)}</option>`,
      )
      .join("");
  if (presets.some((preset) => preset.id === currentValue)) {
    select.value = currentValue;
  }
  if (status) {
    status.textContent =
      presets.length > 0
        ? `저장된 프리셋 ${presets.length}개`
        : "아직 저장된 프리셋이 없습니다.";
  }
};

window.saveCurrentMVSettingsPreset = function () {
  const defaultName = `MV 프리셋 ${new Date().toLocaleString("ko-KR")}`;
  const name =
    typeof window.prompt === "function"
      ? window.prompt("저장할 MV 설정 프리셋 이름을 입력하세요.", defaultName)
      : defaultName;
  if (!name || !name.trim()) return;

  const preset = {
    id: `mv-preset-${Date.now()}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    settings: window.collectMVSettingsSnapshot(),
  };
  const presets = window.getMVSettingsPresets();
  window.saveMVSettingsPresets([preset, ...presets]);
  window.renderMVSettingsPresetControls();
  if (typeof window.showCopyIndicator === "function") {
    window.showCopyIndicator("✅ MV 설정 프리셋을 저장했습니다.");
  }
};

window.applySelectedMVSettingsPreset = function () {
  const select = document.getElementById("mvSettingsPresetSelect");
  const presetId = select?.value || "";
  if (!presetId) {
    window.showToast("불러올 MV 설정 프리셋을 선택해 주세요.", "info");
    return;
  }
  const preset = window.getMVSettingsPresets().find((item) => item.id === presetId);
  if (!preset) {
    window.showToast("선택한 MV 설정 프리셋을 찾을 수 없습니다.", "error");
    return;
  }
  window.applyMVSettingsToForm(preset.settings);
  window.saveMVSettings();
  if (typeof window.showCopyIndicator === "function") {
    window.showCopyIndicator(`✅ '${preset.name}' 프리셋을 적용했습니다.`);
  }
};

window.deleteSelectedMVSettingsPreset = async function () {
  const select = document.getElementById("mvSettingsPresetSelect");
  const presetId = select?.value || "";
  if (!presetId) {
    window.showToast("삭제할 MV 설정 프리셋을 선택해 주세요.", "info");
    return;
  }
  const preset = window.getMVSettingsPresets().find((item) => item.id === presetId);
  if (!preset) return;
  if (!(await window.showConfirmAsync(`'${preset.name}' 프리셋을 삭제할까요?`))) {
    return;
  }
  const presets = window.getMVSettingsPresets().filter((item) => item.id !== presetId);
  window.saveMVSettingsPresets(presets);
  window.renderMVSettingsPresetControls();
  if (typeof window.showCopyIndicator === "function") {
    window.showCopyIndicator("MV 설정 프리셋을 삭제했습니다.");
  }
};

window.getMVSettingComboRecommendations = function () {
  return MV_SETTING_COMBO_RECOMMENDATIONS;
};

window.renderMVSettingComboRecommendations = function () {
  const container = document.getElementById("mvSettingComboRecommendations");
  if (!container) return;
  container.innerHTML = window
    .getMVSettingComboRecommendations()
    .map(
      (combo) => `
        <button type="button" class="btn btn-small btn-secondary" onclick="if(typeof window.applyMVSettingCombo==='function')window.applyMVSettingCombo('${escapeMVTextarea(combo.id)}')" title="${escapeMVTextarea(combo.description)}" style="padding: 6px 10px; font-size: 0.78rem; text-align: left;">
          ${escapeMVTextarea(combo.name)}
        </button>
      `,
    )
    .join("");
};

window.applyMVSettingCombo = function (comboId) {
  const combo = window
    .getMVSettingComboRecommendations()
    .find((item) => item.id === comboId);
  if (!combo) {
    window.showToast("적용할 MV 추천 조합을 찾을 수 없습니다.", "error");
    return;
  }

  const currentSettings =
    typeof window.collectMVSettingsSnapshot === "function"
      ? window.collectMVSettingsSnapshot()
      : {};
  window.applyMVSettingsToForm({
    ...currentSettings,
    location: combo.locationTags,
    locationTags: combo.locationTags,
    actionTags: combo.actionTags,
    lighting: combo.lighting,
    cameraWork: combo.cameraWork,
    mood: combo.mood,
  });
  window.saveMVSettings();

  const status = document.getElementById("mvSettingComboStatus");
  if (status) {
    status.textContent = `${combo.name} 조합을 적용했습니다.`;
  }
  if (typeof window.showCopyIndicator === "function") {
    window.showCopyIndicator(`✅ '${combo.name}' MV 조합을 적용했습니다.`);
  }
};

window.saveMVSettings = function () {
  const settings = window.collectMVSettingsSnapshot();

  localStorage.setItem("mvSettings", JSON.stringify(settings));

  if (window.currentProject && window.currentProject.data) {
    if (!window.currentProject.data.marketing) {
      window.currentProject.data.marketing = {};
    }
    window.currentProject.data.marketing.mvSettings = JSON.parse(
      JSON.stringify(settings),
    );

    if (typeof window.saveCurrentProject === "function") {
      window.saveCurrentProject();
    }
  }
};

window.loadMVSettings = function () {
  try {
    if (window.currentProject && window.currentProject.data) {
      console.log("ℹ️ 프로젝트 데이터가 존재하여 전역 설정 로드를 건너뜁니다.");
      window.renderMVSettingsPresetControls();
      window.renderMVSettingComboRecommendations();
      return;
    }

    const saved = localStorage.getItem("mvSettings");
    if (saved) {
      const settings = JSON.parse(saved);
      window.applyMVSettingsToForm(settings);
    }
    window.renderMVSettingsPresetControls();
    window.renderMVSettingComboRecommendations();
  } catch (e) {
    console.warn("MV 설정 로드 실패:", e);
  }
};

window.updateCharacterInputs = function () {
  const characterCount =
    document.getElementById("mvCharacterCount")?.value || "1";
  const container = document.getElementById("mvCharacterInputs");

  if (!container) {
    console.warn("⚠️ mvCharacterInputs 컨테이너를 찾을 수 없습니다.");
    return;
  }

  console.log("🔄 updateCharacterInputs 호출됨, 인물 수:", characterCount);

  const count = parseInt(characterCount);
  const backups = [];
  for (let i = 1; i <= 10; i++) {
    const gender = document.getElementById(`mvCharacter${i}_gender`)?.value;
    const age = document.getElementById(`mvCharacter${i}_age`)?.value;
    const race = document.getElementById(`mvCharacter${i}_race`)?.value;
    const appearance = document.getElementById(
      `mvCharacter${i}_appearance`,
    )?.value;
    const artStyle = document.getElementById(`mvCharacter${i}_artStyle`)?.value;
    const charSheet = document.getElementById(`mvCharacter${i}_sheet`)?.value;
    if (gender !== undefined) {
      backups[i] = { gender, age, race, appearance, artStyle, characterSheet: charSheet };
    }
  }

  let html = "";
  for (let i = 1; i <= count; i++) {
    html += `
            <div style="margin-bottom: 15px; padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border);">
                <h5 style="margin: 0 0 10px 0; color: var(--text-primary);">인물 ${i}</h5>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; font-size: 0.85rem; color: var(--text-secondary);">성별</label>
                        <select id="mvCharacter${i}_gender" onchange="window.saveMVSettings()" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary);">
                            <option value="">선택 안 함</option>
                            <option value="male">남성</option>
                            <option value="female">여성</option>
                            <option value="non-binary">논바이너리</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; font-size: 0.85rem; color: var(--text-secondary);">나이</label>
                        <select id="mvCharacter${i}_age" onchange="window.saveMVSettings()" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary);">
                            <option value="">선택 안 함</option>
                            <option value="child">어린이 (10세 미만)</option>
                            <option value="teen">청소년 (10-19세)</option>
                            <option value="20s">20대</option>
                            <option value="30s">30대</option>
                            <option value="40s">40대</option>
                            <option value="50s">50대</option>
                            <option value="elder">장년 (60세 이상)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; font-size: 0.85rem; color: var(--text-secondary);">인종</label>
                        <select id="mvCharacter${i}_race" onchange="window.saveMVSettings()" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary);">
                            <option value="">선택 안 함</option>
                            <option value="asian">아시아인</option>
                            <option value="caucasian">백인</option>
                            <option value="african">아프리카인</option>
                            <option value="hispanic">히스패닉/라틴계</option>
                            <option value="middle-eastern">중동인</option>
                            <option value="mixed">혼혈</option>
                        </select>
                    </div>
	                    <div class="form-group">
	                        <label style="display: block; margin-bottom: 5px; font-size: 0.85rem; color: var(--text-secondary);">외모/스타일</label>
	                        <input type="text" id="mvCharacter${i}_appearance" oninput="window.saveMVSettings()" placeholder="예: 검은 단발, 차가운 느낌, 키 170cm, 마른 체형" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary);">
	                    </div>
	                </div>
	                <div style="margin-top: 10px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px;">
	                    <label style="display: block; margin-bottom: 6px; font-size: 0.82rem; color: var(--text-secondary);">외형 키워드 재사용</label>
	                    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
	                        <select id="mvCharacter${i}_appearancePresetSelect" style="min-width: 180px; flex: 1; padding: 7px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-card); color: var(--text-primary); font-size: 0.82rem;">
	                            <option value="">저장된 외형 선택</option>
	                        </select>
	                        <button type="button" class="btn btn-small btn-primary" onclick="window.saveCurrentCharacterAppearancePreset(${i})" title="현재 인물의 성별, 나이, 인종, 외모, 아트 스타일을 재사용 키워드로 저장합니다" style="padding: 6px 10px; font-size: 0.78rem;">외형 저장</button>
	                        <button type="button" class="btn btn-small btn-secondary" onclick="window.applyCharacterAppearancePreset(${i})" title="선택한 외형 키워드를 이 인물에 적용합니다" style="padding: 6px 10px; font-size: 0.78rem;">재사용</button>
	                    </div>
	                </div>
	                <!-- Art Style 선택 -->
	                <div style="margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 0.85rem; color: var(--text-secondary);">🎨 Art Style</label>
                    <select id="mvCharacter${i}_artStyle" onchange="window.saveMVSettings()" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary);">
                        <option value="photorealistic">포토리얼리스틱 (실사)</option>
                        <option value="cinematic-photography">시네마틱 포토그래피</option>
                        <option value="anime">애니메이션 (아니메)</option>
                        <option value="3d-render">3D 렌더링</option>
                        <option value="digital-art">디지털 아트</option>
                        <option value="watercolor">수채화</option>
                        <option value="oil-painting">유화</option>
                        <option value="concept-art">컨셉 아트</option>
                        <option value="comic-book">코믹북 스타일</option>
                        <option value="pixel-art">픽셀 아트</option>
                        <option value="fashion-illustration">패션 일러스트</option>
                        <option value="hyperrealistic">하이퍼리얼리스틱</option>
                    </select>
                </div>
                <!-- 캐릭터 시트 생성 버튼 -->
                <div style="margin-top: 12px; display: flex; gap: 8px; align-items: center;">
                    <button type="button" class="btn btn-primary" id="mvCharacter${i}_sheetBtn"
                        onclick="window.generateCharacterSheet(${i})"
                        style="padding: 8px 16px; font-size: 0.85rem; border-radius: 6px; display: flex; align-items: center; gap: 6px;">
                        <span>🎨</span> <span>캐릭터 시트 생성</span>
                    </button>
                    <button type="button" class="btn btn-secondary" id="mvCharacter${i}_sheetToggle"
                        onclick="window.toggleCharacterSheet(${i})"
                        style="padding: 8px 12px; font-size: 0.8rem; border-radius: 6px; display: none;">
                        📋 시트 보기/숨기기
                    </button>
                    <button type="button" class="btn btn-success" id="mvCharacter${i}_sheetCopy"
                        onclick="window.copyCharacterSheet(${i}, event)"
                        style="padding: 8px 12px; font-size: 0.8rem; border-radius: 6px; display: none;">
                        📋 시트 복사
                    </button>
                </div>
                <!-- 캐릭터 시트 생성 진행 표시 -->
                <div id="mvCharacter${i}_sheetLoading" style="display: none; margin-top: 10px; padding: 10px; background: var(--bg-input); border-radius: 6px; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
                    ⏳ AI가 캐릭터 시트를 생성하는 중... (고정 요소 보존, 변형 요소 보완)
                </div>
                <!-- 캐릭터 시트 미리보기/편집 영역 -->
                <div id="mvCharacter${i}_sheetArea" style="display: none; margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 0.85rem; color: var(--text-secondary);">
                        📝 캐릭터 시트 (편집 가능 — 이 내용이 인물/썸네일/씬 프롬프트에 반영됩니다)
                    </label>
                    <textarea id="mvCharacter${i}_sheet"
                        onchange="window.saveMVSettings()"
                        placeholder="캐릭터 시트가 여기에 생성됩니다..."
                        style="width: 100%; min-height: 300px; padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); font-family: 'Courier New', monospace; font-size: 0.8rem; resize: vertical; line-height: 1.5; white-space: pre-wrap;"
                    ></textarea>
                </div>
            </div>
        `;
  }

  container.innerHTML = html;

	  for (let i = 1; i <= count; i++) {
    if (backups[i]) {
      if (document.getElementById(`mvCharacter${i}_gender`))
        document.getElementById(`mvCharacter${i}_gender`).value =
          backups[i].gender;
      if (document.getElementById(`mvCharacter${i}_age`))
        document.getElementById(`mvCharacter${i}_age`).value = backups[i].age;
      if (document.getElementById(`mvCharacter${i}_race`))
        document.getElementById(`mvCharacter${i}_race`).value = backups[i].race;
      if (document.getElementById(`mvCharacter${i}_appearance`))
        document.getElementById(`mvCharacter${i}_appearance`).value =
          backups[i].appearance;
      if (backups[i].artStyle && document.getElementById(`mvCharacter${i}_artStyle`))
        document.getElementById(`mvCharacter${i}_artStyle`).value =
          backups[i].artStyle;
      if (backups[i].characterSheet && document.getElementById(`mvCharacter${i}_sheet`)) {
        document.getElementById(`mvCharacter${i}_sheet`).value = backups[i].characterSheet;
        document.getElementById(`mvCharacter${i}_sheetArea`).style.display = "block";
        document.getElementById(`mvCharacter${i}_sheetToggle`).style.display = "inline-flex";
        document.getElementById(`mvCharacter${i}_sheetCopy`).style.display = "inline-flex";
	      }
	    }
	  }
	  if (typeof window.renderCharacterAppearancePresetSelects === "function") {
	    window.renderCharacterAppearancePresetSelects();
	  }
	};

	window.getCharacterAppearancePresets = function () {
	  const parsePresets = (value) => {
	    try {
	      const parsed = JSON.parse(value || "[]");
	      return Array.isArray(parsed) ? parsed : [];
	    } catch (error) {
	      return [];
	    }
	  };
	  const localPresets =
	    typeof localStorage !== "undefined"
	      ? parsePresets(localStorage.getItem("mvCharacterAppearancePresets"))
	      : [];
	  const projectPresets =
	    window.currentProject?.data?.marketing?.mvCharacterAppearancePresets || [];
	  const merged = [...projectPresets, ...localPresets].filter(
	    (preset) => preset && preset.id && preset.appearance,
	  );
	  const seen = new Set();
	  return merged.filter((preset) => {
	    const key = `${preset.name}|${preset.appearance}`;
	    if (seen.has(key)) return false;
	    seen.add(key);
	    return true;
	  });
	};

	window.saveCharacterAppearancePresets = function (presets) {
	  const safePresets = Array.isArray(presets) ? presets.slice(0, 30) : [];
	  if (typeof localStorage !== "undefined") {
	    localStorage.setItem(
	      "mvCharacterAppearancePresets",
	      JSON.stringify(safePresets),
	    );
	  }
	  if (window.currentProject?.data) {
	    if (!window.currentProject.data.marketing) {
	      window.currentProject.data.marketing = {};
	    }
	    window.currentProject.data.marketing.mvCharacterAppearancePresets =
	      JSON.parse(JSON.stringify(safePresets));
	    if (typeof window.saveCurrentProject === "function") {
	      window.saveCurrentProject();
	    }
	  }
	  return safePresets;
	};

	window.getCharacterAppearanceSnapshot = function (charIndex) {
	  return {
	    gender: document.getElementById(`mvCharacter${charIndex}_gender`)?.value || "",
	    age: document.getElementById(`mvCharacter${charIndex}_age`)?.value || "",
	    race: document.getElementById(`mvCharacter${charIndex}_race`)?.value || "",
	    appearance:
	      document.getElementById(`mvCharacter${charIndex}_appearance`)?.value || "",
	    artStyle:
	      document.getElementById(`mvCharacter${charIndex}_artStyle`)?.value ||
	      "photorealistic",
	  };
	};

	window.renderCharacterAppearancePresetSelects = function () {
	  const presets = window.getCharacterAppearancePresets();
	  const escapeValue =
	    typeof escapeMVTextarea === "function"
	      ? escapeMVTextarea
	      : (value) => String(value || "");
	  const options =
	    '<option value="">저장된 외형 선택</option>' +
	    presets
	      .map(
	        (preset) =>
	          `<option value="${escapeValue(preset.id)}">${escapeValue(preset.name)}</option>`,
	      )
	      .join("");
	  const count = parseInt(document.getElementById("mvCharacterCount")?.value || "1");
	  for (let i = 1; i <= count; i++) {
	    const select = document.getElementById(
	      `mvCharacter${i}_appearancePresetSelect`,
	    );
	    if (!select) continue;
	    const currentValue = select.value;
	    select.innerHTML = options;
	    if (presets.some((preset) => preset.id === currentValue)) {
	      select.value = currentValue;
	    }
	  }
	};

	window.saveCurrentCharacterAppearancePreset = function (charIndex) {
	  const snapshot = window.getCharacterAppearanceSnapshot(charIndex);
	  if (!snapshot.appearance.trim()) {
	    window.showToast("저장할 외모/스타일 키워드를 먼저 입력해 주세요.", "info");
	    return;
	  }
	  const defaultName = `인물 ${charIndex}: ${snapshot.appearance.trim().slice(0, 24)}`;
	  const name =
	    typeof window.prompt === "function"
	      ? window.prompt("저장할 외형 키워드 이름을 입력하세요.", defaultName)
	      : defaultName;
	  if (!name || !name.trim()) return;

	  const preset = {
	    id: `mv-character-appearance-${Date.now()}`,
	    name: name.trim(),
	    createdAt: new Date().toISOString(),
	    ...snapshot,
	  };
	  const presets = window.getCharacterAppearancePresets();
	  window.saveCharacterAppearancePresets([preset, ...presets]);
	  window.renderCharacterAppearancePresetSelects();
	  const select = document.getElementById(
	    `mvCharacter${charIndex}_appearancePresetSelect`,
	  );
	  if (select) select.value = preset.id;
	  if (typeof window.showCopyIndicator === "function") {
	    window.showCopyIndicator("✅ 인물 외형 키워드를 저장했습니다.");
	  }
	};

	window.applyCharacterAppearancePreset = function (charIndex) {
	  const select = document.getElementById(
	    `mvCharacter${charIndex}_appearancePresetSelect`,
	  );
	  const presetId = select?.value || "";
	  if (!presetId) {
	    window.showToast("재사용할 외형 키워드를 선택해 주세요.", "info");
	    return;
	  }
	  const preset = window
	    .getCharacterAppearancePresets()
	    .find((item) => item.id === presetId);
	  if (!preset) {
	    window.showToast("선택한 외형 키워드를 찾을 수 없습니다.", "error");
	    return;
	  }
	  const setValue = (id, value) => {
	    const el = document.getElementById(id);
	    if (el) el.value = value || "";
	  };
	  setValue(`mvCharacter${charIndex}_gender`, preset.gender);
	  setValue(`mvCharacter${charIndex}_age`, preset.age);
	  setValue(`mvCharacter${charIndex}_race`, preset.race);
	  setValue(`mvCharacter${charIndex}_appearance`, preset.appearance);
	  setValue(`mvCharacter${charIndex}_artStyle`, preset.artStyle);
	  if (typeof window.saveMVSettings === "function") {
	    window.saveMVSettings();
	  }
	  if (typeof window.showCopyIndicator === "function") {
	    window.showCopyIndicator(`✅ '${preset.name}' 외형을 적용했습니다.`);
	  }
	};

/**
 * AI를 사용하여 완전한 캐릭터 시트 프롬프트를 생성합니다.
 * 사용자가 입력한 고정 요소는 절대 변경하지 않고,
 * 변형 가능 요소를 보완하여 완전한 스펙을 생성합니다.
 * @param {number} charIndex - 인물 인덱스 (1-based)
 */
window.generateCharacterSheet = async function (charIndex) {
  const btn = document.getElementById(`mvCharacter${charIndex}_sheetBtn`);
  const loadingEl = document.getElementById(`mvCharacter${charIndex}_sheetLoading`);
  const sheetArea = document.getElementById(`mvCharacter${charIndex}_sheetArea`);
  const sheetEl = document.getElementById(`mvCharacter${charIndex}_sheet`);
  const toggleBtn = document.getElementById(`mvCharacter${charIndex}_sheetToggle`);
  const copyBtn = document.getElementById(`mvCharacter${charIndex}_sheetCopy`);

  // 입력값 수집
  const gender = document.getElementById(`mvCharacter${charIndex}_gender`)?.value || "";
  const age = document.getElementById(`mvCharacter${charIndex}_age`)?.value || "";
  const race = document.getElementById(`mvCharacter${charIndex}_race`)?.value || "";
  const appearance = document.getElementById(`mvCharacter${charIndex}_appearance`)?.value || "";
  const artStyle = document.getElementById(`mvCharacter${charIndex}_artStyle`)?.value || "photorealistic";

  if (!gender && !age && !race && !appearance) {
    window.showToast("인물 정보를 최소 1개 이상 입력해주세요.\n(성별, 나이, 인종, 외모/스타일 중 하나)", "info");
    return;
  }

  // Gemini API 키 확인
  const geminiKey = window.getGeminiApiKey();
  if (!geminiKey || !geminiKey.startsWith("AIza")) {
    window.showToast("Gemini API 키가 설정되지 않았습니다.\n설정 > API 키에서 Gemini API 키를 입력해주세요.", "info");
    return;
  }

  // UI 상태 전환: 로딩
  if (btn) btn.disabled = true;
  if (loadingEl) loadingEl.style.display = "block";

  try {
    // 성별/나이/인종 매핑
    const genderMap = { male: "Male", female: "Female", "non-binary": "Non-binary" };
    const ageMap = {
      child: "Child (under 10)", teen: "Teenager (10-19)",
      "20s": "Young adult (early to late 20s)", "30s": "Adult (30s)",
      "40s": "Adult (40s)", "50s": "Mature adult (50s)", elder: "Elder (60+)"
    };
    // 인종 매핑 — 미드저니가 인식하는 구체적 신체 특징 키워드 포함
    const raceMap = {
      asian: "East Asian",
      caucasian: "Caucasian/White",
      african: "African/Black",
      hispanic: "Hispanic/Latino",
      "middle-eastern": "Middle Eastern",
      mixed: "Mixed ethnicity"
    };
    // 미드저니 전용 인종 강제 키워드 맵 (OVERALL COMPOSITION 상단에 삽입용)
    const genderSuffix = gender === "male" ? "man" : gender === "female" ? "woman" : "person";
    const raceMJMap = {
      asian: `East Asian ${genderSuffix}, Korean/Japanese/Chinese facial features, monolid or slightly hooded almond-shaped eyes, flat nasal bridge, high cheekbones, light to medium tan skin tone typical of East Asia, straight black hair`,
      caucasian: `Caucasian ${genderSuffix}, White European facial features, round to oval eyes, defined nasal bridge, fair to light skin tone`,
      african: `African/Black ${genderSuffix}, Sub-Saharan African facial features, full lips, broad nasal bridge, dark brown skin tone, tightly coiled dark hair`,
      hispanic: `Hispanic/Latino ${genderSuffix}, Latin American facial features, warm olive to tan skin tone, dark brown eyes and hair`,
      "middle-eastern": `Middle Eastern ${genderSuffix}, Arab/Persian facial features, strong brow ridge, prominent nose, olive to tan skin tone, dark hair`,
      mixed: `Mixed ethnicity ${genderSuffix}, blended facial features from multiple ethnic backgrounds`
    };
    const artStyleMap = {
      photorealistic: "photorealistic photography style",
      "cinematic-photography": "cinematic photography style, dramatic film-like quality",
      anime: "anime/Japanese animation style",
      "3d-render": "3D rendered, Pixar-quality CG style",
      "digital-art": "digital art illustration style",
      watercolor: "watercolor painting style",
      "oil-painting": "classical oil painting style",
      "concept-art": "conceptual art style, entertainment design",
      "comic-book": "comic book / graphic novel style",
      "pixel-art": "pixel art / retro game style",
      "fashion-illustration": "fashion illustration style",
      hyperrealistic: "hyperrealistic, ultra-detailed photographic style"
    };

    // 고정 요소 목록 생성
    const fixedTraits = [];
    if (gender) fixedTraits.push(`Gender: ${genderMap[gender] || gender}`);
    if (age) fixedTraits.push(`Age: ${ageMap[age] || age}`);
    if (race) fixedTraits.push(`Ethnicity: ${raceMap[race] || race} — MANDATORY, do not change to any other ethnicity`);
    if (appearance) fixedTraits.push(`User-described traits: "${appearance}"`);

    const artStyleEn = artStyleMap[artStyle] || artStyle;
    // 미드저니 인종 강제 키워드 (선택된 인종 또는 원문 그대로)
    const raceMJKeywords = race ? (raceMJMap[race] || (raceMap[race] || race)) : "";
    // 인종 강제 규칙 블록
    const ethnicityEnforcement = race ? `
⚠️ ETHNICITY ENFORCEMENT (MANDATORY — DO NOT IGNORE):
- The character's ethnicity is: ${raceMap[race] || race}
- Midjourney-specific descriptors to include: ${raceMJKeywords}
- FORBIDDEN: rendering the character as any other ethnicity (e.g., do NOT render as Caucasian/White, African/Black, or any non-${raceMap[race] || race} appearance)
- Every view and headshot MUST clearly show ${raceMap[race] || race} facial features
` : "";

    // MV 프롬프트 상세 설정 수집 (시대, 국가, 조명 등)
    const mvEra = document.getElementById("mvEra")?.value || "";
    const mvCountry = document.getElementById("mvCountry")?.value || "";
    const mvLocation = typeof window.getMVLocationEnString === "function" ? window.getMVLocationEnString() : document.getElementById("mvLocation")?.value || "";
    const mvLighting = document.getElementById("mvLighting")?.value || "";
    const mvCameraWork = document.getElementById("mvCameraWork")?.value || "";
    const mvMood = document.getElementById("mvMood")?.value || "";
    const mvCustomSettings = document.getElementById("mvCustomSettings")?.value || "";
    const mvCharacterCount = document.getElementById("mvCharacterCount")?.value || "1";

    const mvContextParts = [];
    if (mvEra) mvContextParts.push(`Era: ${mvEra}`);
    if (mvCountry) mvContextParts.push(`Country/Region: ${mvCountry}`);
    if (mvLocation) mvContextParts.push(`Location: ${mvLocation}`);
    if (mvLighting) mvContextParts.push(`Lighting: ${mvLighting}`);
    if (mvCameraWork) mvContextParts.push(`Camera Work: ${mvCameraWork}`);
    if (mvMood) mvContextParts.push(`Mood/Atmosphere: ${mvMood}`);
    if (mvCharacterCount) mvContextParts.push(`Total Characters in MV: ${mvCharacterCount} (Design this character to fit well in a group of ${mvCharacterCount})`);
    if (mvCustomSettings) mvContextParts.push(`Additional Settings: "${mvCustomSettings}"`);
    
    const mvContextStr = mvContextParts.length > 0 ? mvContextParts.join(" | ") : "Not specified";

    // 최종 가사 (수노용) 정보 수집
    const finalLyricsEl = document.getElementById("finalLyrics");
    const finalLyrics = finalLyricsEl ? finalLyricsEl.innerText.trim() : "";

    // 실사 계열 스타일 여부 판별 (만화/애니 방지 규칙 적용 대상)
    const photoRealisticStyles = ["photorealistic", "cinematic-photography", "hyperrealistic"];
    const isPhotoRealistic = photoRealisticStyles.includes(artStyle);

    // 실사 스타일 강제 규칙 블록
    const photoRealismRule = isPhotoRealistic
      ? `⚠️ ABSOLUTE PHOTO-REALISM ENFORCEMENT (HIGHEST PRIORITY — OVERRIDES ALL OTHER STYLE DECISIONS):
- This character MUST be rendered as a REAL HUMAN PHOTOGRAPH, NOT illustration, cartoon, anime, manga, 3D animation, or any drawn/painted style.
- REQUIRED: ultra-photorealistic, shot on high-end DSLR/mirrorless camera, visible skin pores, subsurface skin scattering, natural hair strands, real fabric texture, lens bokeh, 8K RAW photo quality.
- FORBIDDEN: anime, manga, cartoon, illustration, cel-shading, flat color, stylized, toon, animated, drawn, painted, digital art, 3D render.
- Skin: natural imperfections, pores, subtle veins — NOT airbrushed, plastic, or smooth.
- Eyes: iris detail, natural moisture/catchlights, realistic proportions — NOT oversized anime-style eyes.
`
      : "";

    // 가사 기반 인물 분석 블록
    const lyricsAnalysisBlock = finalLyrics
      ? `MANDATORY LYRICS-BASED CHARACTER ANALYSIS:
Analyze the song lyrics below and determine:
- CORE EMOTION (e.g., longing, heartbreak, euphoria, nostalgia, melancholy)
- CHARACTER'S NARRATIVE ROLE (who is this person? what are they experiencing?)
- IMPLIED RELATIONSHIP (lover, lost connection, self-reflection, stranger)
- AESTHETIC ATMOSPHERE (e.g., rainy city night, empty room, neon-lit alley)

Reflect ALL of the above into the design:
- FACIAL EXPRESSION: convey the song's core emotion (NOT a blank neutral face)
- CLOTHING & COLOR PALETTE: match the song's era, mood, and atmosphere
- HAIR & MAKEUP: reinforce the emotional state
- BODY LANGUAGE: subtle cues to the character's inner world
- PROPS/ACCESSORIES: hint at the song's story

SONG LYRICS:
"""
${finalLyrics}
"""`
      : "";

    // AI 프롬프트 구성 (실사 강제 + 가사 분석 강화)

    const prompt = `You are a professional character designer${isPhotoRealistic ? " and portrait photographer" : ""}. Generate a COMPLETE, highly detailed character design sheet. The output will be used as a prompt for an AI image generator.

${photoRealismRule}
${ethnicityEnforcement}
**CRITICAL RULES (OBEY IN THIS EXACT PRIORITY ORDER):**
1. ${isPhotoRealistic ? "⚠️ PHOTO-REALISM FIRST: See the ABSOLUTE PHOTO-REALISM ENFORCEMENT block above. NO cartoons, NO anime, NO illustration — ONLY real human photography quality at 8K or higher." : `Art Style: ${artStyleEn} — All details must faithfully reflect this style.`}
2. CORE CHARACTERISTICS (USER INPUTS - ABSOLUTE MANDATORY): ${fixedTraits.join("; ")} 
   -> You MUST strictly follow these traits. They are the core identity of the character. Do not change or alter them under any circumstances.
3. Art Style Technical Spec: ${artStyleEn}${isPhotoRealistic ? ", 8K ultra-resolution, RAW photo quality, professional studio lighting" : ""}
4. MV PRODUCTION CONTEXT: The character must naturally fit the following music video settings: ${mvContextStr}.
${lyricsAnalysisBlock ? `5. ${lyricsAnalysisBlock}\n6. VARIABLE ELEMENTS: Fill in ALL remaining details not specified by the user, guided by the lyrics analysis above.` : "5. VARIABLE ELEMENTS: Fill in ALL remaining details that the user did NOT specify."}

**INPUT INTERPRETATION RULES:**
- Explicit Traits (physical descriptions like hair color, height, body type): keep EXACTLY as stated
- Implicit Traits (mood, personality, aura like "cold feeling", "mysterious"): Do NOT write these abstractly. Convert them into PHYSICAL/VISUAL elements (e.g., "cold feeling" → sharp angular jawline, cool-toned eye color, minimal makeup, sleek straight hair)
- If explicit and implicit traits conflict, explicit traits ALWAYS take priority

**OUTPUT RULES:**
- Every spec must be defined with Position, Size, Shape, Material, and State where applicable
- NO vague or abstract expressions allowed - everything must be concrete and physical
- Character must stand in a natural, upright A-pose (no dramatic poses)
- Arms relaxed at sides unless holding a prop
- Fill in EVERY field in the template - leave nothing empty
- THE VERY FIRST SECTION you output MUST be a labeled Midjourney prompt block. It must look exactly like this:
  
  MIDJOURNEY PROMPT (COPY THIS):
  ${'```'}
  [single-line prompt following the rules below]
  ${'```'}

- Rules for the simple Midjourney prompt:
  * Start with: "character sheet, turnaround, full body, [ethnicity] [gender], [age],"
  * Add layout: "4 body views (front, 3/4, side, back) and 3 close-up headshots on right,"
  * Add style: ${isPhotoRealistic ? "ultra photographic, 8K resolution, high detail," : artStyleEn + ","}
  * End with: "neutral grey background"
  * CRITICAL: Do NOT include "--ar" or any other parameters. Keep it under 150 characters if possible.
  * Keep it in a single line inside the code block.

**OUTPUT THE COMPLETE CHARACTER SHEET BELOW. Use ONLY the following template structure. Do NOT add or remove any sections:**

MIDJOURNEY PROMPT (COPY THIS):
${'```'}
(Generate the simplified single-line prompt here)
${'```'}

**[OVERALL COMPOSITION - FIXED LAYOUT]**
${raceMJKeywords ? raceMJKeywords + "," : ""} ${genderMap[gender] || "character"}, character reference sheet, character turnaround, split view, 4 full body views arranged horizontally (front, 3/4 angle, profile, back), 3 vertical close-up headshot portraits on the right side showing different expressions, ${artStyleEn}${isPhotoRealistic ? ", 8K resolution, real photograph, professional lighting, visible skin texture, natural hair strands, absolutely no cartoon elements" : ", high-quality, 4K resolution"}, neutral grey studio background, wide aspect ratio, symmetrical layout.

[SECTION 1 - FULL BODY 1]
- Full body view, 3/4 angle

[SECTION 2 - FULL BODY 2]
- Full body view, opposite 3/4 angle

[SECTION 3 - FULL BODY 3]
- Full body view, from behind (back view)

[SECTION 4 - HEADSHOTS AND EXPRESSIONS]
- Multiple close-up portrait headshots
- Showing different facial angles (front view, side profile) and subtle expressions

[GLOBAL LAYOUT RULES]
- Character turnaround sheet format
- All views aligned on the same neutral backdrop
- Consistent character proportions and design across all angles
- Professional concept art layout with clean spacing

**[CHARACTER SPECIFICATION - FULL DEFINITION]**

[Identity]
- Gender: (fill based on fixed elements)
- Age: (fill based on fixed elements)
- Ethnicity: (fill based on fixed elements)

[Body]
- Height:
- Proportion:
- Build:
- Shoulder width:
- Waist:
- Hip:
- Posture:

[Pose]
- A-pose
- Arms:
- Elbows:
- Hands:
- Legs:
- Weight distribution:

[Face]
- Shape:
- Jaw:
- Chin:
- Eyes:
- Eye color:
- Eye size:
- Brows:
- Nose:
- Lips:
- Skin:
- Expression:

[Makeup]
- Base:
- Blush:
- Eyeshadow:
- Eyeliner:
- Mascara:
- Lips:

[Hair]
- Length:
- Part:
- Structure:
- Strand thickness:
- Layering:
- Volume:
- Flow:
- Color:
- Surface:
- State:

[Outfit] Top:
- Type:
- Length:
- Fit:
- Neckline:
- Sleeve:
- Fabric:
- Wrinkles:

Skirt:
- Type:
- Waist position:
- Length:
- Shape:
- Structure:
- Pleats:
- Fabric:
- Movement:

[Footwear]
- Type:
- Heel height:
- Sole thickness:
- Shape:
- Coverage:
- Material:
- Color:
- Fit:
- State:

[Accessories / Wear Position] Earrings:
- Type:
- Length:
- Material:
- Position:
- Movement:

Necklace:
- Type:
- Lengths:
- Position:
- Material:

Rings:
- Count:
- Placement:
- Material:

Bracelet:
- Wrist:
- Fit:
- Material:

[Props]
- (specify if any, based on character concept)

**[TECHNICAL SPECIFICATIONS]**

[Lighting]
- Key:
- Fill:
- Rim:
- Shadow:
${isPhotoRealistic ? "- Camera: (specify lens focal length, f-stop, ISO, shutter speed for realistic photography look)\n- Resolution: 8K minimum, ultra-sharp detail, no AI-generation artifacts" : ""}

[Rendering Style]
- (specify based on art style: ${artStyleEn}${isPhotoRealistic ? " — STRICTLY photo-realistic, zero tolerance for any illustration, cartoon, or anime rendering" : ""})

[Color Control]
- (specify color palette and grading${isPhotoRealistic ? " — natural color grading consistent with professional studio photography; no painterly, watercolor, or heavy filter effects" : ""})

[Consistency Rules]
- (specify rules to maintain visual consistency across all sections)

[Final Constraint]
- (specify any final rendering constraints)
${isPhotoRealistic ? `
[⚠️ ANTI-CARTOON ABSOLUTE CONSTRAINT]
- EXPLICITLY FORBIDDEN: anime-style eyes, manga features, cel-shading, flat color fills, illustration outlines, toon rendering, stylized proportions, cartoon skin smoothness.
- The character MUST be INDISTINGUISHABLE from a real photograph of a real human being.
- Minimum output quality: 8K, ultra-sharp, visible real-world detail in every element.` : ""}

**IMPORTANT: Output ONLY the completed character sheet. No explanations, no commentary, no markdown code blocks. Just the character sheet text.**`;

    let aiResponse = "";
    try {
      // callGeminiWithAutoRoute: 실제 키는 직접 호출, 프록시 인증은 /api/gemini 사용
      aiResponse = await (window.callGeminiWithAutoRoute || callGeminiWithAutoRoute)(
        prompt,
        { temperature: 0.75, topK: 40, topP: 0.95, maxOutputTokens: 8192 },
        geminiKey,
      );
      if (window.logApiUsage) window.logApiUsage("gemini");
      // aiResponse는 callGeminiWithAutoRoute에서 이미 text 문자열로 반환됨
    } catch (geminiError) {
      console.warn("⚠️ Gemini 캐릭터 시트 생성 실패, ChatGPT로 전환하여 재시도합니다:", geminiError.message);
      const openaiKey = window.getOpenAIApiKey ? window.getOpenAIApiKey() : "";
      if (!openaiKey) {
        throw new Error(`Gemini 캐릭터 시트 생성 실패 (${geminiError.message}) 후 ChatGPT 폴백을 시도했으나 OpenAI API 키가 없습니다.`);
      }

      const chatGPTResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: (window.getOpenAIModel ? window.getOpenAIModel() : "gpt-4o-mini"),
          messages: [
            { role: "system", content: "You are an AI character concept artist." },
            { role: "user", content: prompt },
          ],
          temperature: 0.75,
        }),
      });

      if (!chatGPTResponse.ok) {
        const errorData = await chatGPTResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `ChatGPT API 오류: ${chatGPTResponse.status}`);
      }

      const chatGPTData = await chatGPTResponse.json();
      if (window.logApiUsage) window.logApiUsage("openai");
      aiResponse = chatGPTData.choices?.[0]?.message?.content || "";
    }

    if (!aiResponse.trim()) {
      throw new Error("AI 응답이 비어있습니다.");
    }

    // 마크다운 코드 블록 제거 (있는 경우)
    let cleanSheet = aiResponse.trim();
    if (cleanSheet.startsWith("```")) {
      cleanSheet = cleanSheet.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");
    }

    // textarea에 표시
    if (sheetEl) sheetEl.value = cleanSheet;
    if (sheetArea) sheetArea.style.display = "block";
    if (toggleBtn) toggleBtn.style.display = "inline-flex";
    if (copyBtn) copyBtn.style.display = "inline-flex";

    // 설정 저장
    if (typeof window.saveMVSettings === "function") {
      window.saveMVSettings();
    }

    console.log(`✅ 캐릭터 시트 생성 완료 (인물 ${charIndex})`);

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(`✅ 인물 ${charIndex} 캐릭터 시트가 생성되었습니다!`);
    }
  } catch (error) {
    console.error(`❌ 캐릭터 시트 생성 실패 (인물 ${charIndex}):`, error);
    window.showToast(`캐릭터 시트 생성 중 오류가 발생했습니다:\n\n${error.message}`, "error");
  } finally {
    if (btn) btn.disabled = false;
    if (loadingEl) loadingEl.style.display = "none";
  }
};

// --- Extracted character sheet helpers ---
window.toggleCharacterSheet = function (charIndex) {
  const sheetArea = document.getElementById(`mvCharacter${charIndex}_sheetArea`);
  if (sheetArea) {
    const isVisible = sheetArea.style.display !== "none";
    sheetArea.style.display = isVisible ? "none" : "block";
  }
};

window.copyCharacterSheet = function (charIndex, event) {
  const sheetEl = document.getElementById(`mvCharacter${charIndex}_sheet`);
  if (!sheetEl || !sheetEl.value.trim()) {
    window.showToast("복사할 캐릭터 시트가 없습니다.", "error");
    return;
  }
  navigator.clipboard.writeText(sheetEl.value).then(() => {
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(`📋 인물 ${charIndex} 캐릭터 시트가 복사되었습니다!`);
    }
  }).catch((err) => {
    console.error("복사 실패:", err);
    sheetEl.select();
    document.execCommand("copy");
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(`📋 인물 ${charIndex} 캐릭터 시트가 복사되었습니다!`);
    }
  });
};

window.getCharacterSheetSummary = function (charIndex) {
  const sheetEl = document.getElementById(`mvCharacter${charIndex}_sheet`);
  if (!sheetEl || !sheetEl.value.trim()) return "";

  const sheet = sheetEl.value;
  const sections = ["[Identity]", "[Body]", "[Face]", "[Hair]", "[Outfit]", "[Footwear]"];
  const lines = sheet.split("\n");
  let summary = "";
  let inSection = false;

  for (const line of lines) {
    const trimLine = line.trim();

    for (const sec of sections) {
      if (trimLine.startsWith(sec) || trimLine === sec) {
        inSection = true;
        summary += `\n${sec}\n`;
        break;
      }
    }

    if (inSection && trimLine.startsWith("-")) {
      summary += trimLine + "\n";
    }

    if (inSection && trimLine.startsWith("[") && !sections.some((s) => trimLine.startsWith(s))) {
      if (
        trimLine.startsWith("[Makeup]") ||
        trimLine.startsWith("[Pose]") ||
        trimLine.startsWith("[Accessories")
      ) {
        inSection = false;
      }
    }
  }

  return summary.trim();
};

window.getCharacterSheetFull = function (charIndex) {
  const sheetEl = document.getElementById(`mvCharacter${charIndex}_sheet`);
  return sheetEl?.value?.trim() || "";
};

window.getAllCharacterSheetsSummary = function () {
  const characterCount = parseInt(
    document.getElementById("mvCharacterCount")?.value || "1",
  );
  const summaries = [];
  for (let i = 1; i <= characterCount; i++) {
    const summary = window.getCharacterSheetSummary(i);
    if (summary) {
      summaries.push(`【인물 ${i} 캐릭터 시트 요약】\n${summary}`);
    }
  }
  return summaries.join("\n\n");
};

window.getAllCharacterSheetsFull = function () {
  const characterCount = parseInt(
    document.getElementById("mvCharacterCount")?.value || "1",
  );
  const fullSheets = [];
  for (let i = 1; i <= characterCount; i++) {
    const fullText = window.getCharacterSheetFull(i);
    if (fullText) {
      fullSheets.push(`【인물 ${i} 캐릭터 시트 전체 원본】\n${fullText}`);
    }
  }
  return fullSheets.join("\n\n---\n\n");
};

window.updateMVPromptTranslation = async function (type) {
  try {
    const koId = `mv${type.charAt(0).toUpperCase() + type.slice(1)}PromptKo`;
    const enId = `mv${type.charAt(0).toUpperCase() + type.slice(1)}PromptEn`;

    const koEl = document.getElementById(koId);
    const enEl = document.getElementById(enId);

    if (!koEl || !enEl) return;

    const koText = koEl.value.trim();
    if (!koText) {
      enEl.value = "";
      return;
    }

    // 번역 실행
    const translated = await translateKoreanToEnglishForScene("location", koText);
    if (translated) {
      enEl.value = translated;
    }
  } catch (error) {
    console.error("프롬프트 번역 오류:", error);
  }
};

