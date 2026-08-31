// js/storage.js - Music Creator Data Persistence

/**
 * 새 프로젝트 ID를 생성합니다.
 * (기존에 app.js 4곳 + 이 파일 1곳에 동일한 식이 복붙되어 있었음)
 */
window.generateProjectId = function () {
  return "proj_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11);
};

/**
 * ☁️ 백업 상태 UI 업데이트 함수
 */
window.updateSaveStatusUI = function(status, message = "") {
  const statusContainer = document.getElementById("globalSaveStatus");
  const statusText = document.getElementById("saveStatusText");
  if (!statusContainer || !statusText) return;

  statusContainer.className = "status-indicator"; // reset
  
  if (status === "saving") {
    statusContainer.classList.add("saving");
    statusContainer.innerHTML = `<i class="fas fa-sync fa-spin"></i> <span id="saveStatusText">클라우드 저장 중...</span>`;
  } else if (status === "success") {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    statusContainer.classList.add("success");
    statusContainer.innerHTML = `<i class="fas fa-cloud-check"></i> <span id="saveStatusText">마지막 백업: ${timeStr}</span>`;
  } else if (status === "error") {
    statusContainer.classList.add("error");
    statusContainer.innerHTML = `<i class="fas fa-exclamation-circle"></i> <span id="saveStatusText">백업 실패 (오프라인)</span>`;
  } else {
    // idle or custom
    statusContainer.innerHTML = `<i class="fas fa-cloud"></i> <span id="saveStatusText">${message || "저장 대기 중"}</span>`;
  }
};

function cloneData(value, fallback) {
  if (value === undefined || value === null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn("데이터 복제 실패:", error);
    return fallback;
  }
}

function isStorageQuotaError(error) {
  return (
    error &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014)
  );
}

function getProjectSortTime(project) {
  const raw = project?.updatedAt || project?.savedAt || project?.createdAt || 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

function compactProjectForLocalStorage(project, mode = "full") {
  const cloned = cloneData(project, project);
  if (!cloned || mode === "full") return cloned;

  const data = cloned.data || {};
  if (mode === "summary") {
    return {
      id: cloned.id,
      title: cloned.title || data.songTitle || "제목 없음",
      savedAt: cloned.savedAt,
      updatedAt: cloned.updatedAt,
      createdAt: cloned.createdAt,
      lastStep: cloned.lastStep,
      data: {
        songTitle: data.songTitle || cloned.title || "제목 없음",
        finalLyrics: data.finalLyrics || data.finalizedLyrics || "",
        finalStyle: data.finalStyle || data.finalizedStyle || "",
        beforeScore: data.beforeScore,
        afterScore: data.afterScore,
        aiComment: data.aiComment,
        marketing: data.marketing
          ? {
              mvSettings: data.marketing.mvSettings || data.marketing.mv?.settings || {},
              mvPrompts: data.marketing.mvPrompts || data.marketing.mv?.prompts || {},
              mvScenes: data.marketing.mvScenes || data.marketing.mv?.scenes || [],
              mv: data.marketing.mv,
            }
          : undefined,
      },
    };
  }

  return cloned;
}

function dedupeAndSortProjects(projects, currentProject) {
  const byId = new Map();
  [...(Array.isArray(projects) ? projects : []), currentProject]
    .filter(Boolean)
    .forEach((project) => {
      const id = project.id || `project_${getProjectSortTime(project)}`;
      const prev = byId.get(id);
      if (!prev || getProjectSortTime(project) >= getProjectSortTime(prev)) {
        byId.set(id, project);
      }
    });

  return Array.from(byId.values()).sort(
    (a, b) => getProjectSortTime(b) - getProjectSortTime(a),
  );
}

window.saveProjectListToLocalStorage = function (
  key,
  projects,
  currentProject,
  options = {},
) {
  const maxAttempts = options.maxAttempts || [Infinity, 80, 60, 40, 25, 15, 8, 3, 1];
  const list = dedupeAndSortProjects(projects, currentProject);
  const currentId = currentProject?.id;
  let lastError = null;

  for (const maxCount of maxAttempts) {
    const kept = Number.isFinite(maxCount)
      ? list
          .filter((project) => project?.id !== currentId)
          .slice(0, Math.max(maxCount - 1, 0))
      : list.filter((project) => project?.id !== currentId);
    if (currentProject) kept.unshift(currentProject);

    for (const mode of ["full", "summary"]) {
      const payload = kept.map((project) =>
        project?.id === currentId
          ? compactProjectForLocalStorage(project, mode)
          : compactProjectForLocalStorage(project, mode === "full" ? "full" : "summary"),
      );
      try {
        localStorage.setItem(key, JSON.stringify(payload));
        const compacted = payload.length < list.length || mode !== "full";
        if (compacted) {
          console.warn(
            `${key} 저장 용량 보호: ${payload.length}개 프로젝트로 압축 저장했습니다.`,
          );
        }
        return {
          ok: true,
          key,
          count: payload.length,
          compacted,
        };
      } catch (error) {
        lastError = error;
        if (!isStorageQuotaError(error)) break;
      }
    }
  }

  if (currentProject) {
    try {
      localStorage.removeItem(key);
      localStorage.setItem(key, JSON.stringify([compactProjectForLocalStorage(currentProject, "summary")]));
      return { ok: true, key, count: 1, compacted: true, fallback: "current-summary" };
    } catch (error) {
      lastError = error;
    }
  }

  return { ok: false, key, error: lastError };
};

function normalizeMVPrompts(marketing) {
  const legacyPrompts =
    marketing && !Array.isArray(marketing.mvPrompts)
      ? marketing.mvPrompts || {}
      : {};
  const mvPrompts = marketing?.mv?.prompts || {};

  const readPrompt = (key, enFlatKey, koFlatKey) => {
    const nested = {
      ...(legacyPrompts[key] || {}),
      ...(mvPrompts[key] || {}),
    };
    return {
      en:
        nested.en ||
        legacyPrompts[enFlatKey] ||
        mvPrompts[enFlatKey] ||
        "",
      ko:
        nested.ko ||
        legacyPrompts[koFlatKey] ||
        mvPrompts[koFlatKey] ||
        "",
    };
  };

  return {
    thumbnail: readPrompt("thumbnail", "thumbnailEn", "thumbnailKo"),
    background: readPrompt(
      "background",
      "backgroundDetailEn",
      "backgroundDetailKo",
    ),
    character: readPrompt(
      "character",
      "characterDetailEn",
      "characterDetailKo",
    ),
  };
}

function parseMVSceneTime(time) {
  if (typeof time !== "string" || !time.trim()) {
    return { startSeconds: null, endSeconds: null, durationSeconds: null };
  }

  const parsePart = (part) => {
    const segments = String(part || "")
      .trim()
      .split(":")
      .map((value) => parseInt(value, 10));
    if (segments.some((value) => Number.isNaN(value))) return null;
    if (segments.length === 2) return segments[0] * 60 + segments[1];
    if (segments.length === 3) return segments[0] * 3600 + segments[1] * 60 + segments[2];
    return null;
  };

  const [startPart, endPart] = time.split("-");
  const startSeconds = parsePart(startPart);
  const endSeconds = parsePart(endPart);
  const durationSeconds =
    startSeconds !== null && endSeconds !== null && endSeconds >= startSeconds
      ? endSeconds - startSeconds
      : null;

  return { startSeconds, endSeconds, durationSeconds };
}

function formatMVSceneTime(startSeconds, endSeconds) {
  if (
    typeof startSeconds !== "number" ||
    typeof endSeconds !== "number" ||
    Number.isNaN(startSeconds) ||
    Number.isNaN(endSeconds)
  ) {
    return "";
  }

  const formatPart = (seconds) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  };

  return `${formatPart(startSeconds)}-${formatPart(endSeconds)}`;
}

function normalizeMVScene(scene, index) {
  const source =
    scene && typeof scene === "object" && !Array.isArray(scene)
      ? cloneData(scene, {})
      : { scene: String(scene || "") };
  const parsedTime = parseMVSceneTime(source.time);
  const startSeconds =
    typeof source.startSeconds === "number" ? source.startSeconds : parsedTime.startSeconds;
  const endSeconds =
    typeof source.endSeconds === "number" ? source.endSeconds : parsedTime.endSeconds;
  const durationSeconds =
    typeof source.durationSeconds === "number"
      ? source.durationSeconds
      : startSeconds !== null && endSeconds !== null && endSeconds >= startSeconds
        ? endSeconds - startSeconds
        : parsedTime.durationSeconds;
  const time =
    typeof source.time === "string" && source.time.trim()
      ? source.time
      : formatMVSceneTime(startSeconds, endSeconds);

  return {
    ...source,
    id: source.id || `scene-${index + 1}`,
    index,
    sceneNumber: index + 1,
    time,
    startSeconds,
    endSeconds,
    durationSeconds,
    scene:
      source.scene ||
      source.visualDescription ||
      source.description ||
      `씬 ${index + 1}`,
    visualDescription:
      source.visualDescription || source.description || source.scene || "",
    lyrics: source.lyrics || source.sourceLyrics || "",
    prompt: typeof window.cleanEnglishMidjourneyPrompt === "function"
      ? window.cleanEnglishMidjourneyPrompt(source.prompt || source.promptEn || "")
      : (source.prompt || source.promptEn || ""),
    promptKo: typeof window.cleanMidjourneyPrompt === "function"
      ? window.cleanMidjourneyPrompt(source.promptKo || "")
      : (source.promptKo || ""),
    runwayPrompt: source.runwayPrompt || "",
    runwayPromptKo: source.runwayPromptKo || "",
    location: source.location || "",
    emotion: source.emotion || "",
    mood: source.mood || "",
    lighting: source.lighting || "",
    characterAction: source.characterAction || "",
    cameraWork: source.cameraWork || "",
    _isFilled: !!source._isFilled,
  };
}

window.normalizeMVScenes = function (scenes) {
  if (!Array.isArray(scenes)) return [];
  return scenes.map((scene, index) => normalizeMVScene(scene, index));
};

window.setMarketingMVScenes = function (marketing, scenes) {
  if (!marketing) return [];
  const normalizedScenes = window.normalizeMVScenes(scenes);
  marketing.mvScenes = cloneData(normalizedScenes, []);
  if (!marketing.mv) marketing.mv = {};
  marketing.mv.scenes = cloneData(normalizedScenes, []);
  return marketing.mvScenes;
};

/**
 * MV 데이터의 신규 구조(marketing.mv)와 기존 구조를 함께 지원합니다.
 * 기존 프로젝트가 깨지지 않도록 legacy 필드는 유지하고, 새 필드만 병행 생성합니다.
 */
window.getMarketingMVData = function (marketing) {
  const m = marketing || {};
  const mv = m.mv || {};
  const settings = cloneData(
    {
      ...(m.mvSettings || {}),
      ...(mv.settings || {}),
    },
    {},
  );
  const prompts = normalizeMVPrompts(m);
  const mvScenes = Array.isArray(mv.scenes) ? mv.scenes : [];
  const legacyScenes = Array.isArray(m.mvScenes) ? m.mvScenes : [];
  const promptScenes = Array.isArray(m.mvPrompts) ? m.mvPrompts : [];
  const scenesSource =
    mvScenes.length > 0
      ? mvScenes
      : legacyScenes.length > 0
        ? legacyScenes
        : promptScenes;

  return {
    settings,
    prompts,
    scenes: window.normalizeMVScenes(scenesSource),
    subtitles: cloneData(mv.subtitles || m.srtSubtitles || [], []),
    exports: cloneData(mv.exports || [], []),
    schemaVersion: mv.schemaVersion || 1,
  };
};

window.syncMarketingMVModel = function (marketing) {
  if (!marketing) return null;
  const mv = window.getMarketingMVData(marketing);

  marketing.mv = {
    schemaVersion: 1,
    settings: cloneData(mv.settings, {}),
    prompts: cloneData(mv.prompts, {}),
    scenes: window.normalizeMVScenes(mv.scenes),
    subtitles: cloneData(mv.subtitles, []),
    exports: cloneData(mv.exports, []),
    updatedAt: new Date().toISOString(),
  };

  // 기존 코드와 저장된 프로젝트 호환을 위한 legacy mirror.
  marketing.mvSettings = cloneData(marketing.mv.settings, {});
  marketing.mvPrompts = cloneData(marketing.mv.prompts, {});
  marketing.mvScenes = cloneData(marketing.mv.scenes, []);

  return marketing.mv;
};

window.buildMarketingMVSceneDiagnostics = function (scenesArg, limit = 10) {
  const scenes = window.normalizeMVScenes(scenesArg || []);
  const issueCounts = {};
  const issueScenes = [];
  const visualBuckets = new Map();

  const issueLabels = {
    invalidTime: "시간 확인",
    missingLocation: "장소 없음",
    missingCamera: "카메라 없음",
    missingLyrics: "가사 없음",
    missingEnPrompt: "EN 프롬프트 없음",
    missingKoPrompt: "KO 프롬프트 없음",
    repeatedVisualPattern: "배경/구도/카메라 반복",
  };
  const addCount = (key) => {
    issueCounts[key] = (issueCounts[key] || 0) + 1;
  };
  const compact = (value) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim();

  scenes.forEach((scene) => {
    const visualKey = [
      scene.location,
      scene.cameraWork,
      scene.lighting,
      scene.scene,
    ]
      .map((value) => compact(value).toLowerCase())
      .filter(Boolean)
      .join("|");
    if (!visualKey) return;
    if (!visualBuckets.has(visualKey)) visualBuckets.set(visualKey, []);
    visualBuckets.get(visualKey).push(scene.index);
  });

  const repeatedIndexes = new Set();
  visualBuckets.forEach((indexes) => {
    if (indexes.length > 1) {
      indexes.forEach((index) => repeatedIndexes.add(index));
    }
  });

  scenes.forEach((scene) => {
    const issues = [];
    const addIssue = (key) => {
      issues.push(issueLabels[key]);
      addCount(key);
    };

    const hasValidTime =
      scene.startSeconds !== null &&
      scene.endSeconds !== null &&
      scene.durationSeconds !== null &&
      scene.durationSeconds > 0;
    if (!hasValidTime) addIssue("invalidTime");
    if (!compact(scene.location)) addIssue("missingLocation");
    if (!compact(scene.cameraWork)) addIssue("missingCamera");
    if (!compact(scene.lyrics)) addIssue("missingLyrics");
    if (!compact(scene.prompt)) addIssue("missingEnPrompt");
    if (!compact(scene.promptKo)) addIssue("missingKoPrompt");
    if (repeatedIndexes.has(scene.index)) addIssue("repeatedVisualPattern");

    if (issues.length) {
      issueScenes.push({
        sceneNumber: scene.sceneNumber || scene.index + 1,
        time: scene.time || "시간 없음",
        scene: compact(scene.scene || scene.visualDescription) || "장면 없음",
        issues,
      });
    }
  });

  return {
    totalScenes: scenes.length,
    issueSceneCount: issueScenes.length,
    issueCounts,
    issueLabels,
    topScenes: issueScenes.slice(0, limit),
    hasMore: issueScenes.length > limit,
  };
};

window.buildMarketingMVDiagnostics = function (marketingArg, context = "manual") {
  const projectData = window.currentProject?.data || window.currentProject || {};
  const marketing =
    marketingArg || projectData.marketing || window.currentProject?.marketing || {};
  const mv =
    typeof window.getMarketingMVData === "function"
      ? window.getMarketingMVData(marketing)
      : {
          settings: marketing.mvSettings || {},
          prompts: marketing.mvPrompts || {},
          scenes: Array.isArray(marketing.mvScenes) ? marketing.mvScenes : [],
          schemaVersion: marketing.mv?.schemaVersion || 1,
        };
  const scenes = Array.isArray(mv.scenes) ? mv.scenes : [];
  const canonicalScenes = Array.isArray(marketing.mv?.scenes)
    ? marketing.mv.scenes
    : [];
  const legacyScenes = Array.isArray(marketing.mvScenes)
    ? marketing.mvScenes
    : [];
  const promptSections = Object.entries(mv.prompts || {}).filter(([, value]) => {
    if (!value || typeof value !== "object") return false;
    return Boolean(value.en || value.ko);
  });
  const issues = [];

  if (scenes.length === 0) issues.push("씬 데이터 없음");
  if (canonicalScenes.length !== legacyScenes.length) {
    issues.push(
      `canonical/legacy 씬 수 불일치 (${canonicalScenes.length}/${legacyScenes.length})`,
    );
  }
  if (scenes.some((scene) => !scene.prompt && !scene.promptKo)) {
    issues.push("프롬프트가 비어 있는 씬 있음");
  }
  const sceneDiagnostics =
    typeof window.buildMarketingMVSceneDiagnostics === "function"
      ? window.buildMarketingMVSceneDiagnostics(scenes)
      : null;

  return {
    context,
    projectTitle:
      projectData.title || projectData.songTitle || window.currentProject?.title || "제목 없음",
    schemaVersion: mv.schemaVersion || marketing.mv?.schemaVersion || 1,
    sceneCount: scenes.length,
    canonicalSceneCount: canonicalScenes.length,
    legacySceneCount: legacyScenes.length,
    settingsKeys: Object.keys(mv.settings || {}).sort(),
    promptSections: promptSections.map(([key]) => key).sort(),
    firstScene: scenes[0]
      ? {
          time: scenes[0].time || "",
          scene: scenes[0].scene || "",
          hasPrompt: Boolean(scenes[0].prompt || scenes[0].promptKo),
        }
      : null,
    lastScene: scenes.length
      ? {
          time: scenes[scenes.length - 1].time || "",
          scene: scenes[scenes.length - 1].scene || "",
          hasPrompt: Boolean(
            scenes[scenes.length - 1].prompt ||
              scenes[scenes.length - 1].promptKo,
          ),
        }
      : null,
    sceneDiagnostics,
    updatedAt: marketing.mv?.updatedAt || "",
    issues,
  };
};

window.buildMarketingMVRehearsalReadiness = function (diagnostics) {
  if (!diagnostics) {
    return {
      status: "보류",
      summary: "진단 데이터 없음",
      checks: ["진단 데이터를 먼저 생성해야 합니다."],
    };
  }

  const checks = [];
  const failures = [];
  const warnings = [];
  const addCheck = (passed, label, warningOnly = false) => {
    checks.push(`${passed ? "통과" : warningOnly ? "보류" : "실패"}: ${label}`);
    if (!passed) {
      if (warningOnly) warnings.push(label);
      else failures.push(label);
    }
  };

  addCheck(diagnostics.sceneCount > 0, "MV 씬 데이터 존재");
  addCheck(
    diagnostics.canonicalSceneCount === diagnostics.legacySceneCount,
    "canonical/legacy 씬 수 동기화",
  );
  addCheck(
    !diagnostics.issues.some((issue) => issue.includes("프롬프트가 비어")),
    "씬별 EN/KO 프롬프트 누락 없음",
  );
  addCheck(
    diagnostics.settingsKeys.length > 0,
    "MV 설정 저장됨",
    true,
  );
  addCheck(
    diagnostics.promptSections.length > 0,
    "썸네일/배경/인물 등 공통 프롬프트 저장됨",
    true,
  );
  addCheck(Boolean(diagnostics.firstScene), "첫 씬 복원 가능", true);
  addCheck(Boolean(diagnostics.lastScene), "마지막 씬 복원 가능", true);

  const status = failures.length ? "실패" : warnings.length ? "보류" : "통과";
  const summary =
    status === "통과"
      ? "실제 프로젝트 리허설 진행 가능"
      : status === "보류"
        ? "리허설 가능하나 일부 확인 필요"
        : "리허설 전 데이터 보정 필요";
  const nextAction =
    status === "통과"
      ? "체크리스트에 따라 씬 2개 이상 수정, 저장, 재진입, 내보내기 리허설을 진행하세요."
      : status === "보류"
        ? "보류 항목을 확인한 뒤 리허설을 진행하고, 결과를 수동 리허설 기록지에 남기세요."
        : "실패 항목을 먼저 보정한 뒤 MV 진단을 다시 실행하세요.";

  return {
    status,
    summary,
    nextAction,
    checks,
    failures,
    warnings,
  };
};

window.formatMarketingMVDiagnostics = function (diagnostics) {
  if (!diagnostics) return "MV 진단 데이터가 없습니다.";
  const readiness =
    typeof window.buildMarketingMVRehearsalReadiness === "function"
      ? window.buildMarketingMVRehearsalReadiness(diagnostics)
      : null;
  const lines = [
    "MV marketing.mv 진단 요약",
    `프로젝트: ${diagnostics.projectTitle}`,
    `컨텍스트: ${diagnostics.context}`,
    `스키마: v${diagnostics.schemaVersion}`,
    `씬 수: ${diagnostics.sceneCount} (canonical ${diagnostics.canonicalSceneCount}, legacy ${diagnostics.legacySceneCount})`,
    `설정 키: ${diagnostics.settingsKeys.length ? diagnostics.settingsKeys.join(", ") : "없음"}`,
    `프롬프트 섹션: ${diagnostics.promptSections.length ? diagnostics.promptSections.join(", ") : "없음"}`,
  ];

  if (diagnostics.firstScene) {
    lines.push(
      `첫 씬: ${diagnostics.firstScene.time || "시간 없음"} / ${diagnostics.firstScene.scene || "장면 없음"} / 프롬프트 ${diagnostics.firstScene.hasPrompt ? "있음" : "없음"}`,
    );
  }
  if (diagnostics.lastScene) {
    lines.push(
      `마지막 씬: ${diagnostics.lastScene.time || "시간 없음"} / ${diagnostics.lastScene.scene || "장면 없음"} / 프롬프트 ${diagnostics.lastScene.hasPrompt ? "있음" : "없음"}`,
    );
  }
  lines.push(
    `확인 사항: ${diagnostics.issues.length ? diagnostics.issues.join("; ") : "없음"}`,
  );
  if (diagnostics.sceneDiagnostics?.issueSceneCount > 0) {
    const sceneDiagnostics = diagnostics.sceneDiagnostics;
    const issueCountText = Object.entries(sceneDiagnostics.issueCounts || {})
      .map(([key, count]) => `${sceneDiagnostics.issueLabels?.[key] || key} ${count}개`)
      .join(", ");
    lines.push(
      "",
      "우선 확인 씬",
      `확인 필요 씬: ${sceneDiagnostics.issueSceneCount}/${sceneDiagnostics.totalScenes}${issueCountText ? ` (${issueCountText})` : ""}`,
      ...sceneDiagnostics.topScenes.map((scene) =>
        `- 씬 ${scene.sceneNumber} ${scene.time}: ${scene.issues.join(", ")} / ${scene.scene}`,
      ),
    );
    if (sceneDiagnostics.hasMore) {
      lines.push("- 추가 확인 씬은 화면의 확인 필요 필터에서 계속 확인하세요.");
    }
  }
  if (readiness) {
    lines.push(
      "",
      "MV 실제 프로젝트 리허설 판정",
      `판정: ${readiness.status}`,
      `요약: ${readiness.summary}`,
      `다음 조치: ${readiness.nextAction}`,
      ...readiness.checks.map((check) => `- ${check}`),
    );
  }
  return lines.join("\n");
};

window.compareMarketingMVDiagnostics = function (before, after) {
  if (!before || !after) return null;
  const sceneChanged = before.sceneCount !== after.sceneCount;
  const firstChanged =
    (before.firstScene?.time || "") !== (after.firstScene?.time || "") ||
    (before.firstScene?.scene || "") !== (after.firstScene?.scene || "");
  const lastChanged =
    (before.lastScene?.time || "") !== (after.lastScene?.time || "") ||
    (before.lastScene?.scene || "") !== (after.lastScene?.scene || "");
  const updatedAtChanged = (before.updatedAt || "") !== (after.updatedAt || "");

  return {
    before,
    after,
    sceneCount: {
      before: before.sceneCount,
      after: after.sceneCount,
      changed: sceneChanged,
    },
    firstScene: {
      before: before.firstScene,
      after: after.firstScene,
      changed: firstChanged,
    },
    lastScene: {
      before: before.lastScene,
      after: after.lastScene,
      changed: lastChanged,
    },
    updatedAt: {
      before: before.updatedAt || "",
      after: after.updatedAt || "",
      changed: updatedAtChanged,
    },
    changed: sceneChanged || firstChanged || lastChanged || updatedAtChanged,
  };
};

window.formatMarketingMVDiagnosticsComparison = function (comparison) {
  if (!comparison) return "MV 저장 비교 데이터가 없습니다.";
  return [
    "MV 저장 전/후 비교",
    `씬 수: ${comparison.sceneCount.before} -> ${comparison.sceneCount.after}${comparison.sceneCount.changed ? " (변경)" : ""}`,
    `첫 씬: ${comparison.firstScene.before?.scene || "없음"} -> ${comparison.firstScene.after?.scene || "없음"}${comparison.firstScene.changed ? " (변경)" : ""}`,
    `마지막 씬: ${comparison.lastScene.before?.scene || "없음"} -> ${comparison.lastScene.after?.scene || "없음"}${comparison.lastScene.changed ? " (변경)" : ""}`,
    `수정 시각: ${comparison.updatedAt.before || "없음"} -> ${comparison.updatedAt.after || "없음"}${comparison.updatedAt.changed ? " (변경)" : ""}`,
  ].join("\n");
};

window.buildMarketingMVRehearsalReport = function (
  diagnostics,
  comparison = null,
) {
  if (!diagnostics) return "MV 리허설 보고서 데이터가 없습니다.";
  const readiness =
    typeof window.buildMarketingMVRehearsalReadiness === "function"
      ? window.buildMarketingMVRehearsalReadiness(diagnostics)
      : null;
  const appVersion =
    typeof document !== "undefined"
      ? document.querySelector?.(".app-version")?.textContent || ""
      : "";
  const generatedAt = new Date().toISOString();
  const lines = [
    "MV 실제 프로젝트 리허설 보고서",
    `생성 시각: ${generatedAt}`,
    appVersion ? `앱 버전: ${appVersion}` : "",
    `프로젝트: ${diagnostics.projectTitle}`,
    readiness ? `판정: ${readiness.status}` : "",
    readiness ? `요약: ${readiness.summary}` : "",
    readiness ? `다음 조치: ${readiness.nextAction}` : "",
    "",
    window.formatMarketingMVDiagnostics(diagnostics),
  ].filter((line) => line !== "");

  if (comparison) {
    lines.push("", window.formatMarketingMVDiagnosticsComparison(comparison));
  }

  lines.push(
    "",
    "기록 방법:",
    "1. 이 보고서를 MV_수동리허설_기록지.md의 문제 기록 또는 최종 판정에 붙여넣습니다.",
    "2. 실제 화면에서 씬 2개 이상 수정, 저장, 재진입, 내보내기 확인 결과를 이어서 기록합니다.",
  );

  return lines.join("\n");
};

window.buildCurrentMarketingMVRehearsalReport = function () {
  const diagnostics = window.buildMarketingMVDiagnostics(null, "manual");
  const comparison = window.__lastMarketingMVSaveComparison || null;
  const text =
    typeof window.buildMarketingMVRehearsalReport === "function"
      ? window.buildMarketingMVRehearsalReport(diagnostics, comparison)
      : window.formatMarketingMVDiagnostics(diagnostics);
  window.__lastMarketingMVDiagnosticsText = text;
  window.__lastMarketingMVDiagnostics = diagnostics;
  return { diagnostics, comparison, text };
};

window.logMarketingMVDiagnostics = function (
  marketingArg,
  context = "pre-save",
) {
  const diagnostics = window.buildMarketingMVDiagnostics(marketingArg, context);
  console.info("MV marketing.mv diagnostics:", diagnostics);
  return diagnostics;
};

window.logMarketingMVSaveComparison = function (before, after) {
  const comparison = window.compareMarketingMVDiagnostics(before, after);
  console.info("MV marketing.mv save comparison:", comparison);
  return comparison;
};

window.ensureMarketingMVDiagnosticsModal = function () {
  if (typeof document === "undefined" || !document.body) return null;
  let modal = document.getElementById?.("marketingMVDiagnosticsModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "marketingMVDiagnosticsModal";
  modal.className = "modal-overlay";
  modal.setAttribute?.("role", "dialog");
  modal.setAttribute?.("aria-modal", "true");
  modal.setAttribute?.("aria-labelledby", "marketingMVDiagnosticsTitle");
  modal.onclick = function (event) {
    if (event.target === modal) {
      window.closeMarketingMVDiagnosticsModal();
    }
  };
  modal.innerHTML = `
    <div class="modal" style="width: min(920px, 94vw); max-height: 88vh;">
      <div class="modal-header">
        <h3 class="modal-title" id="marketingMVDiagnosticsTitle">MV 리허설 진단 보고서</h3>
        <button type="button" class="modal-close" onclick="closeMarketingMVDiagnosticsModal()" aria-label="닫기">×</button>
      </div>
      <div class="modal-body" style="padding: 0;">
        <pre id="marketingMVDiagnosticsText" style="margin: 0; padding: 20px; min-height: 320px; max-height: 62vh; overflow: auto; white-space: pre-wrap; word-break: keep-all; line-height: 1.55; color: var(--text-primary); background: var(--bg-secondary); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; font-size: 0.86rem;"></pre>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="focusFirstMarketingMVDiagnosticsScene()">첫 확인 씬으로 이동</button>
        <button type="button" class="btn btn-secondary" onclick="copyCurrentMarketingMVDiagnosticsReport()">복사</button>
        <button type="button" class="btn btn-secondary" onclick="downloadMarketingMVRehearsalReport()">TXT 저장</button>
        <button type="button" class="btn btn-primary" onclick="closeMarketingMVDiagnosticsModal()">닫기</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
};

window.openMarketingMVDiagnosticsModal = function (text) {
  const modal = window.ensureMarketingMVDiagnosticsModal();
  if (!modal) return false;
  const reportEl = document.getElementById?.("marketingMVDiagnosticsText");
  if (reportEl) reportEl.textContent = text || "";
  modal.style.display = "flex";
  modal.style.pointerEvents = "auto";
  modal.classList?.add("show");
  return true;
};

window.closeMarketingMVDiagnosticsModal = function () {
  const modal = document.getElementById?.("marketingMVDiagnosticsModal");
  if (!modal) return;
  modal.classList?.remove("show");
  modal.style.display = "none";
  modal.style.pointerEvents = "none";
};

window.copyCurrentMarketingMVDiagnosticsReport = function () {
  const text =
    window.__lastMarketingMVDiagnosticsText ||
    window.buildCurrentMarketingMVRehearsalReport().text;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
  if (typeof window.showCopyIndicator === "function") {
    window.showCopyIndicator("✅ MV 리허설 진단 보고서가 클립보드에 복사되었습니다.");
  }
  return text;
};

window.focusFirstMarketingMVDiagnosticsScene = function () {
  const diagnostics =
    window.__lastMarketingMVDiagnostics ||
    window.buildCurrentMarketingMVRehearsalReport().diagnostics;
  const firstScene = diagnostics?.sceneDiagnostics?.topScenes?.[0];
  if (!firstScene) {
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator("확인 필요 씬이 없습니다.");
    }
    return false;
  }

  window.closeMarketingMVDiagnosticsModal();
  if (typeof window.focusMVFirstReviewScene === "function") {
    const focused = window.focusMVFirstReviewScene();
    if (focused) return true;
  }
  if (typeof window.focusMVSceneCard === "function") {
    window.focusMVSceneCard(Math.max(0, Number(firstScene.sceneNumber) - 1));
    return true;
  }
  if (typeof window.showCopyIndicator === "function") {
    window.showCopyIndicator("씬 목록 화면을 연 뒤 다시 이동을 시도하세요.");
  }
  return false;
};

window.showMarketingMVDiagnostics = function () {
  const { diagnostics, text } = window.buildCurrentMarketingMVRehearsalReport();
  window.copyCurrentMarketingMVDiagnosticsReport();
  const opened = window.openMarketingMVDiagnosticsModal(text);
  if (!opened && typeof alert === "function") {
    window.showToast(text, "info");
  }
  return diagnostics;
};

window.downloadMarketingMVRehearsalReport = function () {
  const { diagnostics, text } = window.buildCurrentMarketingMVRehearsalReport();
  const title =
    diagnostics?.projectTitle ||
    window.currentProject?.title ||
    window.currentProject?.data?.songTitle ||
    "music-creator-project";
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${window.sanitizeProjectFilename(title)}-mv-rehearsal-report-${date}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (typeof window.showCopyIndicator === "function") {
    window.showCopyIndicator("✅ MV 리허설 진단 보고서 TXT가 저장되었습니다.");
  }
  return a.download;
};

window.sanitizeProjectFilename = function (title) {
  return String(title || "music-creator-project")
    .replace(/[^a-zA-Z0-9가-힣\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80) || "music-creator-project";
};

window.normalizeSingleProjectImportPayload = function (input) {
  const payload = typeof input === "string" ? JSON.parse(input) : input;
  const project = payload?.project || payload;
  if (!project || typeof project !== "object") {
    throw new Error("프로젝트 JSON 형식이 올바르지 않습니다.");
  }

  const normalized = cloneData(project, {});
  if (!normalized.id) {
    normalized.id = `imported_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
  if (!normalized.title) {
    normalized.title = normalized.data?.songTitle || "가져온 프로젝트";
  }
  if (!normalized.data) {
    normalized.data = cloneData(normalized, {});
  }
  if (!normalized.data.songTitle) {
    normalized.data.songTitle = normalized.title;
  }
  if (normalized.data.marketing && typeof window.syncMarketingMVModel === "function") {
    window.syncMarketingMVModel(normalized.data.marketing);
  }
  normalized.importedAt = new Date().toISOString();
  return normalized;
};

window.buildSingleProjectJSONExport = function (projectArg) {
  const project = cloneData(projectArg || window.currentProject, null);
  if (!project) {
    throw new Error("내보낼 현재 프로젝트가 없습니다.");
  }
  if (project.data?.marketing && typeof window.syncMarketingMVModel === "function") {
    window.syncMarketingMVModel(project.data.marketing);
  }

  return JSON.stringify(
    {
      type: "music-creator-single-project",
      version: 1,
      exportedAt: new Date().toISOString(),
      project,
    },
    null,
    2,
  );
};

window.downloadSingleProjectJSON = function (projectArg) {
  const project = projectArg || window.currentProject;
  const json = window.buildSingleProjectJSONExport(project);
  const title = project?.title || project?.data?.songTitle || "music-creator-project";
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${window.sanitizeProjectFilename(title)}-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return a.download;
};

window.exportCurrentProjectJSON = function () {
  if (typeof window.saveCurrentProject === "function") {
    const saved = window.saveCurrentProject();
    if (saved === false) {
      window.showToast("프로젝트 저장 후 내보내기를 다시 시도해주세요.", "info");
      return null;
    }
  }
  if (!window.currentProject) {
    window.showToast("내보낼 현재 프로젝트가 없습니다.", "error");
    return null;
  }

  const filename = window.downloadSingleProjectJSON(window.currentProject);
  if (typeof window.showCopyIndicator === "function") {
    window.showCopyIndicator(`✅ 단일 프로젝트 JSON이 저장되었습니다: ${filename}`);
  }
  return filename;
};

window.upsertSingleProjectToLocalStores = function (project) {
  const keys = ["musicCreatorProjects", "savedProjects"];
  keys.forEach((key) => {
    let list = [];
    try {
      const stored = localStorage.getItem(key);
      const parsed = stored ? JSON.parse(stored) : [];
      list = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn(`${key} 읽기 실패:`, error);
    }

    const index = list.findIndex((item) => item?.id === project.id);
    if (index >= 0) {
      list[index] = project;
    } else {
      list.push(project);
    }
    // 용량 초과 시 압축 재시도까지 처리하는 공용 저장 경로 사용
    const saveResult = window.saveProjectListToLocalStorage(key, list, project);
    if (!saveResult.ok) {
      console.error(`${key} 프로젝트 저장 실패:`, saveResult.error);
    }
  });
  return project;
};

window.importSingleProjectJSONFromText = function (jsonText, options = {}) {
  const project = window.normalizeSingleProjectImportPayload(jsonText);
  window.upsertSingleProjectToLocalStores(project);
  window.currentProject = project;
  window.currentProjectId = project.id;
  if (typeof window.loadProjectList === "function") {
    window.loadProjectList(true);
  }
  if (options.load !== false && typeof window.loadProject === "function") {
    window.loadProject(project.id);
  }
  if (typeof window.showCopyIndicator === "function") {
    window.showCopyIndicator(`✅ 단일 프로젝트를 가져왔습니다: ${project.title}`);
  }
  return project;
};

window.importSingleProjectJSON = function () {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.style.display = "none";
  fileInput.onchange = function (event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (loadEvent) {
      try {
        window.importSingleProjectJSONFromText(loadEvent.target.result);
      } catch (error) {
        console.error("단일 프로젝트 가져오기 오류:", error);
        window.showToast(`단일 프로젝트 가져오기 중 오류가 발생했습니다:\n\n${error.message}`, "error");
      }
    };
    reader.readAsText(file);
  };
  document.body.appendChild(fileInput);
  fileInput.click();
  document.body.removeChild(fileInput);
};

/**
 * 프로젝트 정보를 비교하여 더 최신이거나 데이터가 많은 프로젝트를 반환하기 위한 유틸리티
 */
function isNewerOrBetter(newProj, oldProj) {
  const nData = newProj.data || newProj;
  const oData = oldProj.data || oldProj;

  // 데이터 완성도 체크 (가사나 마케팅 자료가 있는지)
  const hasMore = !!(nData.finalLyrics || nData.marketing);
  const existingHas = !!(oData.finalLyrics || oData.marketing);

  // savedAt/updatedAt은 프로젝트 루트에 기록되므로 루트를 우선 조회한다.
  const nDate = new Date(newProj.savedAt || newProj.updatedAt || nData.savedAt || nData.updatedAt || 0);
  const oDate = new Date(oldProj.savedAt || oldProj.updatedAt || oData.savedAt || oData.updatedAt || 0);

  if (hasMore && !existingHas) return true;
  if (!hasMore && existingHas) return false;
  return nDate > oDate;
}

/**
 * 저장된 프로젝트를 로드하여 UI에 복원합니다.
 */
window.loadProject = function (projectId) {
  const now = Date.now();
  const isSameProject = window.__lastLoadProjectId === projectId;
  if (
    isSameProject &&
    (window.__isLoadingProject ||
      now - Number(window.__lastLoadProjectStartedAt || 0) < 1200)
  ) {
    console.log("⏭️ 중복 프로젝트 로드 요청 무시:", projectId);
    return;
  }
  window.__isLoadingProject = true;
  window.__lastLoadProjectId = projectId;
  window.__lastLoadProjectStartedAt = now;
  window.isInitialLoading = true;
  console.log("📂 프로젝트 로드 시작:", projectId);
  
  try {
    // 6단계 관련 UI 선제적 초기화 (이전 프로젝트 잔상 제거)
    window.currentScenes = [];
    window.currentCharacters = [];
    const containers = ["mvSceneOverviewContainer", "mvPromptsContainer"];
    containers.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });

    // 여러 저장소 키에서 프로젝트 검색
    let foundProject = null;
    const projectKeys = [
      "musicCreatorProjects",
      "savedProjects",
      "sunoLyricsHistory",
      "stylePromptHistory",
    ];

    for (const key of projectKeys) {
      const dataStr = localStorage.getItem(key);
      if (!dataStr) continue;
      try {
        const parsed = JSON.parse(dataStr);
        const project = Array.isArray(parsed) 
          ? parsed.find(p => p && p.id === projectId)
          : (parsed && parsed.id === projectId ? parsed : null);
        
        if (project) {
          if (!foundProject || isNewerOrBetter(project, foundProject)) {
            foundProject = project;
          }
        }
      } catch (e) {
        console.warn(`JSON 파싱 오류 (${key}):`, e);
      }
    }

    if (!foundProject) {
      window.showToast("프로젝트를 찾을 수 없습니다. (ID: " + projectId + ")", "error");
      window.isInitialLoading = false;
      return;
    }

    // 전역 상태 설정
    window.currentProject = foundProject;
    window.currentProjectId = projectId;
    
    // 데이터 구조 보정 (old format 지원)
    // 자기 자신을 참조시키면 순환 구조가 되어 JSON.stringify가 실패하므로
    // 얕은 복사본을 data로 넣는다.
    if (!window.currentProject.data) {
      window.currentProject.data = { ...foundProject };
      delete window.currentProject.data.data;
    }
    if (
      window.currentProject.data.marketing &&
      typeof window.syncMarketingMVModel === "function"
    ) {
      window.syncMarketingMVModel(window.currentProject.data.marketing);
    }

    // 1~6단계 데이터 전수 복원 (app.js의 restoreStepData 호출)
    console.log("🔄 UI 상태 복원 시작...");
    window.isRestoringStepData = true; // 루프 전체 보호
    try {
      for (let i = 1; i <= 6; i++) {
        if (typeof window.restoreStepData === "function") {
          window.restoreStepData(i);
        }
      }
    } finally {
      window.isRestoringStepData = false;
    }

    // 마지막으로 작업한 단계로 이동
    const lastStep = foundProject.lastStep || window.currentProject.data.lastStep || 1;
    if (typeof window.goToStep === "function") {
      window.goToStep(lastStep);
    }

    window.isInitialLoading = false;
    window.__isLoadingProject = false;
    console.log("🎊 프로젝트 로드 완료:", foundProject.title || "제목 없음");

  } catch (error) {
    console.error("❌ 프로젝트 로드 중 오류 발생:", error);
    window.showToast("프로젝트 로드 중 오류가 발생했습니다.", "error");
    window.isInitialLoading = false;
    window.__isLoadingProject = false;
  }
};

/**
 * 현재 UI 상태를 수집하여 로컬 스토리지에 저장합니다.
 */
window.saveCurrentProject = function () {
  if (window.isRestoringStepData) return;
  console.log("💾 프로젝트 저장 시작...");
  
  // UI: 저장 중 표시
  if (typeof window.updateSaveStatusUI === "function") {
    window.updateSaveStatusUI("saving");
  }

  try {
    let projectId = window.currentProjectId;
    if (!projectId) {
      projectId = window.generateProjectId();
      window.currentProjectId = projectId;
    }

    // 기존 데이터 유지 (DOM에 없는 데이터 보존)
    const existing = (window.currentProject && window.currentProject.data) ? window.currentProject.data : {};
    const preSaveMarketingSnapshot = cloneData(existing.marketing, {});
    
    // 제목 결정
    const songTitle = document.getElementById("songTitle")?.value?.trim() || "";
    const sunoTitle = document.getElementById("sunoTitle")?.value?.trim() || "";
    const finalTitle = document.getElementById("finalTitleText")?.textContent?.trim() || "";
    const currentTitle = songTitle || sunoTitle || finalTitle || existing.songTitle || "제목 없음";

    const now = new Date().toISOString();
    
    // 새 프로젝트 객체 구성
    const projectToSave = {
      id: projectId,
      title: currentTitle,
      savedAt: now,
      updatedAt: now,
      createdAt: window.currentProject?.createdAt || now,
      lastStep: window.currentStep || 1,
      data: {
        ...existing, // 기존 데이터 스프레드 (보존)
        songTitle: currentTitle
      }
    };

    const d = projectToSave.data;

    // 1단계: 가사 작성
    if (document.getElementById("originalLyrics")) d.originalLyrics = document.getElementById("originalLyrics").value;
    if (document.getElementById("manualStylePrompt")) d.manualStylePrompt = document.getElementById("manualStylePrompt").value;
    if (document.getElementById("additionalKeywords")) d.additionalKeywords = document.getElementById("additionalKeywords").value;
    
    // 1단계 태그
    if (typeof window.getSelectedTags === "function") {
      d.step1Tags = {
        genre: window.getSelectedTags("genreTags"),
        mood: window.getSelectedTags("moodTags"),
        era: window.getSelectedTags("eraTags"),
        theme: window.getSelectedTags("themeTags")
      };
    }

    // 2단계: 수노 변환
    if (document.getElementById("sunoLyrics")) d.sunoLyrics = document.getElementById("sunoLyrics").value;
    if (document.getElementById("stylePrompt")) d.stylePrompt = document.getElementById("stylePrompt").value;
    if (document.getElementById("tempoSlider")) d.tempo = document.getElementById("tempoSlider").value;
    if (window.vocalPartAssignments) d.vocalPartAssignments = JSON.parse(JSON.stringify(window.vocalPartAssignments));

    // 3~5단계 (AI 분석 및 확정)
    // 5단계 점수/피드백
    const beforeScore = document.getElementById("beforeScore")?.textContent;
    const afterScore = document.getElementById("afterScore")?.textContent;
    const aiComment = document.getElementById("aiComment")?.textContent;
    if (beforeScore && beforeScore !== "-") d.beforeScore = beforeScore;
    if (afterScore && afterScore !== "-") d.afterScore = afterScore;
    if (aiComment) d.aiComment = aiComment;

    // 최종 결과물
    const finalLyrics = document.getElementById("finalLyrics")?.innerText;
    const finalStyle = document.getElementById("finalStyle")?.innerText;
    if (finalLyrics) d.finalLyrics = finalLyrics;
    if (finalStyle) d.finalStyle = finalStyle;

    // 6단계: 마케팅 및 MV
    if (!d.marketing) d.marketing = {};
    const m = d.marketing;

    // 마케팅 텍스트 (YouTube, TikTok, 해시태그)
    const youtubeDesc = document.getElementById("youtubeDesc")?.textContent;
    const tiktokDesc = document.getElementById("tiktokDesc")?.textContent;
    const hashtags = document.getElementById("hashtagsContent")?.textContent;
    if (youtubeDesc) m.youtubeDesc = youtubeDesc;
    if (tiktokDesc) m.tiktokDesc = tiktokDesc;
    if (hashtags) m.hashtags = hashtags;

    // 썸네일 문구
    const thumbnailsGrid = document.getElementById("thumbnailsGrid");
    if (thumbnailsGrid) {
      const items = Array.from(thumbnailsGrid.querySelectorAll(".thumbnail-item div:first-child")).map(el => el.textContent);
      if (items.length > 0) m.thumbnails = items;
    }

    // MV 설정 (time, interval, era, country, characters, lighting 등)
    if (!m.mvSettings) m.mvSettings = {};
    const s = m.mvSettings;
    
    // 시간 및 재생 간격
    if (document.getElementById("mvMinutes")) s.minutes = document.getElementById("mvMinutes").value;
    if (document.getElementById("mvSeconds")) s.seconds = document.getElementById("mvSeconds").value;
    if (document.getElementById("mvInterval")) s.interval = document.getElementById("mvInterval").value;

    // 기본 설정
    if (document.getElementById("mvEra")) s.era = document.getElementById("mvEra").value;
    if (document.getElementById("mvCountry")) s.country = document.getElementById("mvCountry").value;
    if (document.getElementById("mvMood")) s.mood = document.getElementById("mvMood").value;
    if (document.getElementById("mvLighting")) s.lighting = document.getElementById("mvLighting").value;
    if (document.getElementById("mvCameraWork")) s.cameraWork = document.getElementById("mvCameraWork").value;
    if (document.getElementById("mvCharacterCount")) s.characterCount = document.getElementById("mvCharacterCount").value;
    if (document.getElementById("mvCustomSettings")) s.customSettings = document.getElementById("mvCustomSettings").value;

    // 태그 데이터
    if (typeof window.getSelectedTags === "function") {
      s.locationTags = window.getSelectedTags("mvLocationTags") || [];
      s.actionTags = window.getSelectedTags("mvActionTags") || [];
    }
    
    // 직접 입력 태그
    if (document.getElementById("mvLocationCustom")) s.locationCustom = document.getElementById("mvLocationCustom").value;
    if (document.getElementById("mvActionCustom")) s.actionCustom = document.getElementById("mvActionCustom").value;

    // 인물(캐릭터) 정보 수집
    const charCount = parseInt(s.characterCount || 0);
    if (charCount > 0) {
      s.characters = [];
      for (let i = 1; i <= charCount; i++) {
        const charData = {
          gender: document.getElementById(`mvCharacter${i}_gender`)?.value || "",
          age: document.getElementById(`mvCharacter${i}_age`)?.value || "",
          race: document.getElementById(`mvCharacter${i}_race`)?.value || "",
          appearance: document.getElementById(`mvCharacter${i}_appearance`)?.value || "",
          artStyle: document.getElementById(`mvCharacter${i}_artStyle`)?.value || "photorealistic",
          characterSheet: document.getElementById(`mvCharacter${i}_sheet`)?.value || ""
        };
        s.characters.push(charData);
      }
    }

    // 생성된 공통 프롬프트 (썸네일, 배경, 인물)
    if (!m.mvPrompts) m.mvPrompts = {};
    const p = m.mvPrompts;
    
    // 엘리먼트가 존재하는 경우에만 업데이트하여 데이터 유실 방지 (타 단계에서 저장 시 보존용)
    // 썸네일
    const tEn = document.getElementById("review_thumbnail_en")?.value || document.getElementById("mvThumbnailPromptEn")?.value || "";
    const tKo = document.getElementById("review_thumbnail_ko")?.value || document.getElementById("mvThumbnailPromptKo")?.value || "";
    if (tEn || tKo || !p.thumbnail) {
      p.thumbnail = { en: tEn || p.thumbnail?.en || "", ko: tKo || p.thumbnail?.ko || "" };
    }

    // 배경 (상세)
    const bEn = document.getElementById("review_background_en")?.value || document.getElementById("mvBackgroundDetailPromptEn")?.value || "";
    const bKo = document.getElementById("review_background_ko")?.value || document.getElementById("mvBackgroundDetailPromptKo")?.value || "";
    if (bEn || bKo || !p.background) {
      p.background = { en: bEn || p.background?.en || "", ko: bKo || p.background?.ko || "" };
    }

    // 인물 (상세)
    const cEn = document.getElementById("review_character_en")?.value || document.getElementById("mvCharacterDetailPromptEn")?.value || "";
    const cKo = document.getElementById("review_character_ko")?.value || document.getElementById("mvCharacterDetailPromptKo")?.value || "";
    if (cEn || cKo || !p.character) {
      p.character = { en: cEn || p.character?.en || "", ko: cKo || p.character?.ko || "" };
    }

    // 씬 데이터 (window.currentScenes가 업데이트되어 있어야 함)
    if (window.currentScenes && window.currentScenes.length > 0) {
      if (typeof window.setMarketingMVScenes === "function") {
        window.setMarketingMVScenes(m, window.currentScenes);
      } else {
        m.mvScenes = JSON.parse(JSON.stringify(window.currentScenes));
      }
    }

    // 신규 MV 통합 모델 병행 저장 (기존 mvSettings/mvPrompts/mvScenes 보존)
    if (typeof window.syncMarketingMVModel === "function") {
      window.syncMarketingMVModel(m);
    }
    let preSaveDiagnostics = null;
    let postSaveDiagnostics = null;
    if (
      typeof window.logMarketingMVDiagnostics === "function" &&
      (m.mv || (Array.isArray(m.mvScenes) && m.mvScenes.length > 0))
    ) {
      preSaveDiagnostics = window.buildMarketingMVDiagnostics(
        preSaveMarketingSnapshot,
        "pre-save-before",
      );
      postSaveDiagnostics = window.logMarketingMVDiagnostics(m, "pre-save-after");
      if (typeof window.logMarketingMVSaveComparison === "function") {
        window.__lastMarketingMVSaveComparison =
          window.logMarketingMVSaveComparison(
            preSaveDiagnostics,
            postSaveDiagnostics,
          );
      }
    }

    // 로컬 스토리지 업데이트
    const keys = ["musicCreatorProjects", "savedProjects"];
    const localSaveResults = keys.map((key) => {
      let list = [];
      try {
        const stored = localStorage.getItem(key);
        list = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(list)) list = [];
      } catch (error) {
        console.warn(`${key} 읽기 중 오류:`, error);
        list = [];
      }
      const attempts =
        key === "savedProjects"
          ? [20, 10, 5, 3, 1]
          : [Infinity, 80, 60, 40, 25, 15, 8, 3, 1];
      const result = window.saveProjectListToLocalStorage(
        key,
        list,
        projectToSave,
        { maxAttempts: attempts },
      );
      if (!result.ok) {
        console.warn(`${key} 저장 중 오류:`, result.error);
      }
      return result;
    });

    window.currentProject = projectToSave;
    const primarySaved = localSaveResults.find((result) => result.key === "musicCreatorProjects")?.ok;
    if (primarySaved) {
      const compacted = localSaveResults.some((result) => result.compacted);
      console.log(
        compacted
          ? "✅ 프로젝트 로컬 저장 완료! 용량 보호를 위해 일부 오래된 로컬 캐시를 압축했습니다."
          : "✅ 프로젝트 로컬 저장 완료!",
      );
      if (compacted && typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          "✅ 현재 프로젝트는 저장되었습니다. 브라우저 용량 보호를 위해 오래된 로컬 캐시 일부를 압축했습니다.",
        );
      }
    } else {
      console.error("❌ 프로젝트 로컬 저장 실패:", localSaveResults);
      if (typeof window.updateSaveStatusUI === "function") {
        window.updateSaveStatusUI("error");
      }
    }

    // ☁️ Firestore 클라우드 자동 백업 (백그라운드 실행) - 자동 동기화 설정에 따라
    const cloudAutoSync = localStorage.getItem('cloudAutoSync') !== 'false'; // 기본: true
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (cloudAutoSync && !isOnline) {
      console.warn("☁️ 네트워크 연결이 끊겨 로컬에만 저장하고 클라우드 백업을 건너뜁니다.");
      if (typeof window.updateSaveStatusUI === "function") {
        window.updateSaveStatusUI("error");
      }
    } else if (cloudAutoSync && window.firebaseAuth && window.firebaseAuth.currentUser && window.firebaseDb) {
      const uid = window.firebaseAuth.currentUser.uid;
      try {
        window.firebaseDb.collection("users").doc(uid).collection("projects").doc(projectId)
          .set(projectToSave, { merge: true })
          .then(() => {
            console.log(`☁️ 프로젝트 클라우드 백업 완료: ${projectId}`);
            if (typeof window.updateSaveStatusUI === "function") {
              window.updateSaveStatusUI("success");
            }

            // ⏱️ 시간대별 히스토리 스냅샷 저장
            // 자동저장(60초)마다 쌓이면 하루 최대 1,440개가 되므로
            // 최소 10분 간격으로만 기록하고 최근 30개만 보관한다.
            const HISTORY_MIN_INTERVAL_MS = 10 * 60 * 1000;
            const HISTORY_KEEP_COUNT = 30;
            window.__historySnapshotAt = window.__historySnapshotAt || {};
            const lastSnapAt = window.__historySnapshotAt[projectId] || 0;
            if (Date.now() - lastSnapAt >= HISTORY_MIN_INTERVAL_MS) {
              window.__historySnapshotAt[projectId] = Date.now();
              const historyRef = window.firebaseDb
                .collection("users").doc(uid)
                .collection("projects").doc(projectId)
                .collection("history");
              const historyId = "snap_" + Date.now();
              historyRef.doc(historyId).set({
                ...projectToSave,
                _historyDocId: historyId,
                _savedAt: projectToSave.savedAt
              }).then(() => {
                // 보관 상한 초과분 정리 (한 번에 최대 200개까지)
                return historyRef.get().then((snap) => {
                  const ids = snap.docs.map((d) => d.id).sort().reverse();
                  const excess = ids.slice(HISTORY_KEEP_COUNT, HISTORY_KEEP_COUNT + 200);
                  if (!excess.length) return;
                  const batch = window.firebaseDb.batch();
                  excess.forEach((id) => batch.delete(historyRef.doc(id)));
                  return batch.commit();
                });
              }).catch(() => {});
            }
          })
          .catch((err) => {
            console.error("☁️ 클라우드 백업 실패:", err);
            if (typeof window.updateSaveStatusUI === "function") {
              window.updateSaveStatusUI("error");
            }
          });
      } catch (e) {
        console.error("☁️ 클라우드 백업 시도 중 오류:", e);
        if (typeof window.updateSaveStatusUI === "function") {
          window.updateSaveStatusUI("error");
        }
      }
    } else {
      // 자동 동기화 꺼짐 또는 로컬 전용 모드
      if (typeof window.updateSaveStatusUI === "function") {
        window.updateSaveStatusUI("success");
      }
      if (!cloudAutoSync) {
        console.log("☁️ 자동 동기화 꺼짐 - 로컬에만 저장됨");
      }
    }

    // 저장 직후 사이드바 목록 즉시 갱신 (사용자 편의성 개선)
    if (typeof window.loadProjectList === "function") {
      window.loadProjectList();
    }
    
    return Boolean(primarySaved);

  } catch (error) {
    console.error("❌ 저장 오류:", error);
    return false;
  }
};

/**
 * ☁️ 클라우드 데이터 가져오기 및 로컬 스토리지 병합
 */
window.syncProjectsFromCloud = async function() {
  if (!window.firebaseAuth || !window.firebaseAuth.currentUser || !window.firebaseDb) {
    console.warn("☁️ 클라우드 동기화 실패: 로그인이 필요하거나 Firebase가 초기화되지 않았습니다.");
    return;
  }
  
  const uid = window.firebaseAuth.currentUser.uid;
  console.log("☁️ 클라우드에서 프로젝트 동기화 시작...");
  
  try {
    const snapshot = await window.firebaseDb.collection("users").doc(uid).collection("projects").get();
    if (snapshot.empty) {
      console.log("☁️ 클라우드에 저장된 프로젝트가 없습니다.");
      return;
    }
    
    const cloudProjects = [];
    snapshot.forEach(doc => {
      cloudProjects.push(doc.data());
    });
    
    console.log(`☁️ 클라우드에서 ${cloudProjects.length}개의 프로젝트를 가져왔습니다. 로컬 데이터와 병합합니다.`);
    
    // 로컬 스토리지 읽기
    const localKey = "musicCreatorProjects";
    let localProjects = [];
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        localProjects = JSON.parse(stored);
        if (!Array.isArray(localProjects)) localProjects = [];
      }
    } catch(e) {}
    
    let mergedCount = 0;
    
    // 클라우드 데이터를 로컬 배열에 병합
    cloudProjects.forEach(cloudProject => {
      const idx = localProjects.findIndex(p => p.id === cloudProject.id);
      if (idx !== -1) {
        // 이미 있으면 더 최신 데이터로 덮어쓰기
        const localDate = new Date(localProjects[idx].updatedAt || localProjects[idx].savedAt || 0);
        const cloudDate = new Date(cloudProject.updatedAt || cloudProject.savedAt || 0);
        if (cloudDate > localDate) {
          localProjects[idx] = cloudProject;
          mergedCount++;
        }
      } else {
        // 없으면 추가
        localProjects.push(cloudProject);
        mergedCount++;
      }
    });
    
    // 로컬 스토리지 갱신
    if (mergedCount > 0) {
      const result =
        typeof window.saveProjectListToLocalStorage === "function"
          ? window.saveProjectListToLocalStorage(
              localKey,
              localProjects,
              window.currentProject || null,
            )
          : { ok: false };
      if (!result.ok) {
        throw result.error || new Error("클라우드 병합 데이터를 로컬에 저장하지 못했습니다.");
      }
      console.log(
        result.compacted
          ? `✅ ${mergedCount}개의 클라우드 프로젝트를 병합했습니다. 로컬 용량 보호를 위해 ${result.count}개 캐시로 압축 저장했습니다.`
          : `✅ ${mergedCount}개의 클라우드 프로젝트가 로컬에 병합되었습니다.`,
      );
      // UI 갱신
      if (typeof window.loadProjectList === "function") {
        window.loadProjectList();
      }
      if (typeof window.updateSaveStatusUI === "function") {
        window.updateSaveStatusUI("success");
      }
    } else {
      console.log("✅ 이미 모든 프로젝트가 최신 상태입니다.");
      if (typeof window.updateSaveStatusUI === "function") {
        window.updateSaveStatusUI("success");
      }
    }
    
  } catch (err) {
    console.error("☁️ 클라우드 동기화 중 오류 발생:", err);
    if (typeof window.updateSaveStatusUI === "function") {
      window.updateSaveStatusUI("error");
    }
  }
};

/**
 * ⏱️ 주기적 자동 백업 타이머 (1분 간격)
 * 사용자가 저장 버튼을 누르지 않아도, 백그라운드에서 주기적으로 로컬과 클라우드에 자동 백업합니다.
 */
setInterval(() => {
  if (window.currentProject && typeof window.saveCurrentProject === "function") {
    window.saveCurrentProject();
  }
}, 60000);

// ============================================================
// 🌐 다중 기기 동기화 및 복원 기능
// ============================================================

/**
 * 📦 스마트 병합 유틸 함수
 * 가져오는 프로젝트 목록을 현재 로컬과 비교하여 병합 상태를 분석합니다.
 * @param {Array} incomingList - 가져올 프로젝트 배열
 * @returns {Array} - 각 항목에 _mergeStatus ('new'|'update'|'current') 필드 추가된 배열
 */
window.analyzeIncomingProjects = function(incomingList) {
  const localKey = "musicCreatorProjects";
  let localProjects = [];
  try {
    const stored = localStorage.getItem(localKey);
    if (stored) {
      localProjects = JSON.parse(stored);
      if (!Array.isArray(localProjects)) localProjects = [];
    }
  } catch(e) {}

  return incomingList.map(incoming => {
    const local = localProjects.find(lp => lp?.id === incoming.id);
    if (!local) {
      return { ...incoming, _mergeStatus: "new" };
    }
    const inDate = new Date(incoming.savedAt || incoming.updatedAt || 0);
    const loDate = new Date(local.savedAt || local.updatedAt || 0);
    if (inDate > loDate) {
      return { ...incoming, _mergeStatus: "update" };
    }
    return { ...incoming, _mergeStatus: "current" };
  });
};

/**
 * 📦 스마트 병합 적용 함수
 * analyzeIncomingProjects로 분석된 목록 중 선택된 항목을 로컬에 병합 저장합니다.
 * @param {Array} selectedProjects - 병합할 프로젝트 배열 (_mergeStatus 포함)
 * @returns {Object} - { newCount, updateCount, skipCount }
 */
window.smartMergeToLocal = function(selectedProjects) {
  const localKey = "musicCreatorProjects";
  let localProjects = [];
  try {
    const stored = localStorage.getItem(localKey);
    if (stored) {
      localProjects = JSON.parse(stored);
      if (!Array.isArray(localProjects)) localProjects = [];
    }
  } catch(e) {}

  let newCount = 0, updateCount = 0;
  selectedProjects.forEach(p => {
    const idx = localProjects.findIndex(lp => lp?.id === p.id);
    // _mergeStatus 필드 제거 후 저장
    const clean = { ...p };
    delete clean._mergeStatus;
    if (idx !== -1) {
      localProjects[idx] = clean;
      updateCount++;
    } else {
      localProjects.push(clean);
      newCount++;
    }
  });

  {
    // 용량 초과 시 압축 재시도까지 처리하는 공용 저장 경로 사용
    const saveResult = window.saveProjectListToLocalStorage(
      localKey,
      localProjects,
      window.currentProject,
    );
    if (!saveResult.ok) {
      console.error("스마트 병합 로컬 저장 실패:", saveResult.error);
    }
  }

  // projectOrder도 업데이트: 신규 프로젝트 ID를 savedAt 기준으로 올바른 위치에 삽입
  try {
    const savedOrderRaw = localStorage.getItem("projectOrder");
    let currentOrder = savedOrderRaw ? JSON.parse(savedOrderRaw) : [];
    if (!Array.isArray(currentOrder)) currentOrder = [];

    selectedProjects.forEach(p => {
      if (!currentOrder.includes(p.id)) {
        // savedAt 기준으로 삽입 위치 결정
        const newDate = new Date(p.savedAt || 0);
        const localSorted = localProjects
          .filter(lp => currentOrder.includes(lp.id))
          .sort((a, b) => currentOrder.indexOf(a.id) - currentOrder.indexOf(b.id));
        let insertIdx = currentOrder.findIndex(id => {
          const proj = localProjects.find(lp => lp.id === id);
          return proj && new Date(proj.savedAt || 0) < newDate;
        });
        if (insertIdx === -1) {
          currentOrder.push(p.id);
        } else {
          currentOrder.splice(insertIdx, 0, p.id);
        }
      }
    });
    localStorage.setItem("projectOrder", JSON.stringify(currentOrder));
  } catch(e) { /* projectOrder 업데이트 실패는 무시 */ }

  if (typeof window.loadProjectList === "function") window.loadProjectList();
  return { newCount, updateCount, skipCount: 0 };
};

/**
 * ☁️ 타계정 클라우드 프로젝트 불러오기
 * Firebase 보조 앱 인스턴스를 임시 생성하여 타계정 인증 후 데이터를 읽어옵니다.
 * 현재 로그인 세션에는 영향을 주지 않습니다.
 * @param {string} email - 타계정 이메일
 * @param {string} password - 타계정 비밀번호
 * @returns {Array} - 해당 계정의 프로젝트 목록
 */
window.fetchProjectsFromOtherAccount = async function(email, password) {
  const SEC_APP_NAME = "secondary-tmp-" + Date.now();
  let secApp = null;
  try {
    // 현재 앱 설정을 재사용하여 보조 앱 인스턴스 생성
    const config = firebase.app().options;
    secApp = firebase.initializeApp(config, SEC_APP_NAME);
    const secAuth = secApp.auth();
    const secDb = secApp.firestore();

    // 타계정 로그인
    const credential = await secAuth.signInWithEmailAndPassword(email, password);
    const uid = credential.user.uid;

    // 해당 계정의 프로젝트 목록 읽기 (서버 강제 읽기로 캐시 방지)
    const snapshot = await secDb
      .collection("users").doc(uid).collection("projects")
      .get({ source: 'server' });

    const projects = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data) return;
      // id 필드가 없으면 Firestore 문서 ID를 사용
      if (!data.id) data.id = doc.id;
      projects.push(data);
    });

    console.log(`☁️ 타계정 (${email}) Firestore 프로젝트 수: ${projects.length}개`);

    // 클라이언트에서 savedAt 기준 내림차순 정렬
    projects.sort((a, b) => new Date(b.savedAt || b.createdAt || 0) - new Date(a.savedAt || a.createdAt || 0));

    // 보조 앱 로그아웃 및 삭제
    await secAuth.signOut();
    await secApp.delete();
    secApp = null;

    return projects;
  } catch(e) {
    // 보조 앱 정리 보장
    if (secApp) {
      try { await secApp.delete(); } catch(_) {}
    }
    throw e;
  }
};


/**
 * 클라우드에만 있고 로컬에는 없는 프로젝트 목록을 반환합니다.
 */
window.getCloudOnlyProjects = async function() {
  if (!window.firebaseAuth?.currentUser || !window.firebaseDb) return [];
  const uid = window.firebaseAuth.currentUser.uid;
  try {
    const snapshot = await window.firebaseDb
      .collection("users").doc(uid).collection("projects").get();
    if (snapshot.empty) return [];

    // 로컬 프로젝트 ID 목록 수집
    const localKey = "musicCreatorProjects";
    let localIds = new Set();
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) arr.forEach(p => p?.id && localIds.add(p.id));
      }
    } catch(e) {}

    const cloudOnly = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data?.id && !localIds.has(data.id)) {
        cloudOnly.push(data);
      }
    });
    return cloudOnly;
  } catch(e) {
    console.error("☁️ 클라우드 전용 프로젝트 조회 오류:", e);
    return [];
  }
};

/**
 * 클라우드에서 선택된 프로젝트들을 로컬에 다운로드·병합합니다.
 */
window.downloadSelectedCloudProjects = async function(projectIds) {
  if (!window.firebaseAuth?.currentUser || !window.firebaseDb) return 0;
  const uid = window.firebaseAuth.currentUser.uid;
  const localKey = "musicCreatorProjects";
  let localProjects = [];
  try {
    const stored = localStorage.getItem(localKey);
    if (stored) {
      localProjects = JSON.parse(stored);
      if (!Array.isArray(localProjects)) localProjects = [];
    }
  } catch(e) {}

  let downloaded = 0;
  for (const pid of projectIds) {
    try {
      const doc = await window.firebaseDb
        .collection("users").doc(uid)
        .collection("projects").doc(pid).get();
      if (doc.exists) {
        const data = doc.data();
        const idx = localProjects.findIndex(p => p?.id === pid);
        if (idx !== -1) {
          localProjects[idx] = data;
        } else {
          localProjects.push(data);
        }
        downloaded++;
      }
    } catch(e) {
      console.warn(`☁️ 프로젝트 ${pid} 다운로드 실패:`, e);
    }
  }
  if (downloaded > 0) {
    // 용량 초과 시에도 안전하게 저장되도록 공용 저장 경로를 사용한다.
    const saveResult = window.saveProjectListToLocalStorage(
      localKey,
      localProjects,
      window.currentProject,
    );
    if (!saveResult.ok) {
      console.error("☁️ 다운로드 프로젝트 로컬 저장 실패:", saveResult.error);
    }

    // 현재 열려 있는 프로젝트가 방금 덮어써졌다면 메모리 상태도 갱신해
    // 다음 자동저장이 구버전으로 되돌리지 않게 한다.
    if (
      window.currentProject &&
      projectIds.includes(window.currentProject.id) &&
      typeof window.loadProject === "function"
    ) {
      window.__lastLoadProjectId = null; // 중복 로드 가드 해제
      window.loadProject(window.currentProject.id);
    }

    if (typeof window.loadProjectList === "function") window.loadProjectList();
    if (typeof window.updateSaveStatusUI === "function") window.updateSaveStatusUI("success");
  }
  return downloaded;
};

/**
 * 클라우드에 저장된 모든 프로젝트 목록을 가져옵니다. (복원 모달용)
 */
/**
 * ☁️ 로컬 전체 프로젝트를 클라우드에 일괄 업로드합니다.
 * 다른 기기/계정에서 불러올 수 있도록 사전에 동기화할 때 사용.
 */
window.uploadAllLocalToCloud = async function() {
  if (!window.firebaseAuth?.currentUser || !window.firebaseDb) return { ok: false, count: 0 };
  const uid = window.firebaseAuth.currentUser.uid;
  const localKey = "musicCreatorProjects";
  let localProjects = [];
  try {
    const stored = localStorage.getItem(localKey);
    if (stored) {
      localProjects = JSON.parse(stored);
      if (!Array.isArray(localProjects)) localProjects = [];
    }
  } catch(e) { return { ok: false, count: 0 }; }

  if (localProjects.length === 0) return { ok: true, count: 0 };

  let uploaded = 0;
  for (const p of localProjects) {
    if (!p || !p.id) continue;
    const docId = String(p.id);
    try {
      await window.firebaseDb
        .collection("users").doc(uid)
        .collection("projects").doc(docId)
        .set(p, { merge: true });
      uploaded++;
    } catch(e) {
      console.error("☁️ 개별 업로드 실패:", p.id, e);
    }
  }
  console.log(`☁️ 클라우드 일괄 업로드 완료: ${uploaded}/${localProjects.length}개`);
  return { ok: true, count: uploaded };
};

window.getAllCloudProjects = async function() {
  if (!window.firebaseAuth?.currentUser || !window.firebaseDb) return [];
  const uid = window.firebaseAuth.currentUser.uid;
  try {
    // orderBy 없이 전체 가져오기 (savedAt 없는 문서 누락 방지)
    const snapshot = await window.firebaseDb
      .collection("users").doc(uid).collection("projects").get();
    const results = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data && data.id) results.push(data);
    });
    // 클라이언트에서 savedAt 기준 내림차순 정렬
    results.sort((a, b) => new Date(b.savedAt || b.createdAt || 0) - new Date(a.savedAt || a.createdAt || 0));
    return results;
  } catch(e) {
    console.error("☁️ 클라우드 프로젝트 전체 조회 오류:", e);
    return [];
  }
};

/**
 * 특정 프로젝트의 시간대별 백업 히스토리 목록을 가져옵니다.
 */
window.getCloudBackupHistory = async function(projectId) {
  if (!window.firebaseAuth?.currentUser || !window.firebaseDb) return [];
  const uid = window.firebaseAuth.currentUser.uid;
  try {
    const snapshot = await window.firebaseDb
      .collection("users").doc(uid)
      .collection("projects").doc(projectId)
      .collection("history")
      .orderBy("savedAt", "desc")
      .get();
    const results = [];
    snapshot.forEach(doc => results.push({ _historyDocId: doc.id, ...doc.data() }));
    return results;
  } catch(e) {
    console.error("☁️ 히스토리 조회 오류:", e);
    return [];
  }
};

/**
 * 클라우드 히스토리 스냅샷으로 로컬을 복원합니다.
 */
window.restoreFromCloudHistory = async function(projectId, historyDocId) {
  if (!window.firebaseAuth?.currentUser || !window.firebaseDb) return false;
  const uid = window.firebaseAuth.currentUser.uid;
  try {
    const doc = await window.firebaseDb
      .collection("users").doc(uid)
      .collection("projects").doc(projectId)
      .collection("history").doc(historyDocId)
      .get();
    if (!doc.exists) {
      window.showToast("해당 히스토리 스냅샷을 찾을 수 없습니다.", "error");
      return false;
    }
    const snapshot = doc.data();
    // 로컬 스토리지에 덮어쓰기
    const localKey = "musicCreatorProjects";
    let localProjects = [];
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        localProjects = JSON.parse(stored);
        if (!Array.isArray(localProjects)) localProjects = [];
      }
    } catch(e) {}
    const idx = localProjects.findIndex(p => p?.id === projectId);
    if (idx !== -1) {
      localProjects[idx] = snapshot;
    } else {
      localProjects.push(snapshot);
    }
    // 용량 초과 시 압축 재시도까지 처리하는 공용 저장 경로 사용
    const saveResult = window.saveProjectListToLocalStorage(
      localKey,
      localProjects,
      window.currentProject,
    );
    if (!saveResult.ok) {
      console.error("히스토리 복원 로컬 저장 실패:", saveResult.error);
    }
    if (typeof window.loadProjectList === "function") window.loadProjectList();
    // 현재 프로젝트와 동일하면 즉시 UI 갱신
    if (window.currentProjectId === projectId && typeof window.loadProject === "function") {
      window.__lastLoadProjectId = null; // 중복 로드 가드 해제
      window.loadProject(projectId);
    }
    return true;
  } catch(e) {
    console.error("☁️ 히스토리 복원 오류:", e);
    return false;
  }
};

/**
 * 클라우드 프로젝트를 로컬에 직접 병합하고 즉시 열기 (단일 프로젝트).
 */
window.openCloudProject = async function(projectId) {
  const count = await window.downloadSelectedCloudProjects([projectId]);
  if (count > 0 && typeof window.loadProject === "function") {
    window.loadProject(projectId);
  }
};
