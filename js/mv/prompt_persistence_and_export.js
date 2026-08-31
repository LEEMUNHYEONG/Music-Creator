// === MV Step 6: Prompt persistence and export ===
// window.generateMVThumbnailPrompts 함수는 js/step6.js에서 선언 및 구현됩니다. (중복 방지)

// 프롬프트 저장
window.saveMVPrompt = function (type) {
  try {
    const typeMap = {
      thumbnail: { ko: "mvThumbnailPromptKo", en: "mvThumbnailPromptEn" },
      backgroundDetail: {
        ko: "mvBackgroundDetailPromptKo",
        en: "mvBackgroundDetailPromptEn",
      },
      characterDetail: {
        ko: "mvCharacterDetailPromptKo",
        en: "mvCharacterDetailPromptEn",
      },
    };

    const ids = typeMap[type];
    if (!ids) return;

    const koEl = document.getElementById(ids.ko);
    const enEl = document.getElementById(ids.en);

    if (!koEl || !enEl) return;

    const data = {
      type: type,
      ko: koEl.value,
      en: enEl.value,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(`mvPrompt_${type}`, JSON.stringify(data));

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(`✅ ${type} 프롬프트가 저장되었습니다!`);
    } else {
      alert(`${type} 프롬프트가 저장되었습니다.`);
    }
  } catch (error) {
    console.error("프롬프트 저장 오류:", error);
    alert("프롬프트 저장 중 오류가 발생했습니다.");
  }
};

// 프롬프트 섹션 복사
window.copyMVPromptSection = function (type) {
  const koId = `mv${type.charAt(0).toUpperCase() + type.slice(1)}PromptKo`;
  const enId = `mv${type.charAt(0).toUpperCase() + type.slice(1)}PromptEn`;

  const koEl = document.getElementById(koId);
  const enEl = document.getElementById(enId);

  let text = "";
  const typeNames = {
    combined: "통합 프롬프트",
    background: "배경 프롬프트",
    character: "인물 프롬프트",
  };

  text += `=== ${typeNames[type]} ===\n\n`;

  if (koEl && koEl.value) {
    text += `[한글]\n${koEl.value}\n\n`;
  }
  if (enEl && enEl.value) {
    text += `[영어]\n${enEl.value}\n\n`;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => {
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          `✅ ${typeNames[type]}가 클립보드에 복사되었습니다!`,
        );
      } else {
        alert(`${typeNames[type]}가 클립보드에 복사되었습니다.`);
      }
    })
    .catch(() => {
      alert("복사 중 오류가 발생했습니다.");
    });
};

window.formatMVSceneExportMetadata = function (scene) {
  const lines = [];
  if (scene.lyrics) lines.push(`가사 구간: ${scene.lyrics}`);
  if (scene.location) lines.push(`장소: ${scene.location}`);
  if (scene.emotion) lines.push(`감정: ${scene.emotion}`);
  if (scene.mood) lines.push(`무드: ${scene.mood}`);
  if (scene.lighting) lines.push(`조명: ${scene.lighting}`);
  if (scene.cameraWork) lines.push(`카메라: ${scene.cameraWork}`);
  if (typeof scene.durationSeconds === "number") {
    lines.push(`길이: ${scene.durationSeconds}초`);
  }
  return lines.length ? `[씬 메타데이터]\n${lines.join("\n")}\n` : "";
};

window.MV_RELEASE_BASELINE = "mv-stabilization-2026-05-06";

window.getMVProjectTitleForExport = function () {
  const projectData = window.currentProject?.data || window.currentProject || {};
  const titleFromProject =
    projectData.title || window.currentProject?.title || projectData.songTitle || "";
  if (titleFromProject) return titleFromProject;

  const titleEl =
    document.getElementById("finalTitleText") ||
    document.getElementById("songTitle") ||
    document.getElementById("sunoTitle");
  return titleEl?.textContent || titleEl?.value || "제목 없음";
};

window.buildMVExportMetadataHeader = function (format = "text") {
  const projectTitle = window.getMVProjectTitleForExport();
  const releaseBaseline = window.MV_RELEASE_BASELINE;
  if (format === "srt") {
    return [
      `NOTE Project: ${projectTitle}`,
      `NOTE Release Baseline: ${releaseBaseline}`,
      "",
    ].join("\n");
  }

  return [
    `프로젝트: ${projectTitle}`,
    `릴리스 기준: ${releaseBaseline}`,
    "",
  ].join("\n");
};

window.buildMVExportQualityChecklist = function (scenesArg) {
  const scenes = Array.isArray(scenesArg)
    ? scenesArg
    : Array.isArray(window.currentScenes)
      ? window.currentScenes
      : [];
  if (!scenes.length || typeof getMVSceneQualityStats !== "function") {
    return "";
  }

  const stats = getMVSceneQualityStats(scenes);
  const status = stats.needsReview ? "확인 필요" : "내보내기 준비 완료";
  const items = [
    ["시간", stats.invalidTime],
    ["장소", stats.missingLocation],
    ["카메라", stats.missingCamera],
    ["가사", stats.missingLyrics],
    ["EN 프롬프트", stats.missingEnPrompt],
    ["KO 설명", stats.missingKoPrompt],
    ["프롬프트 길이", stats.promptLength],
    ["금지어", stats.blockedTerms],
    ["중복 표현", stats.duplicatePrompt],
    ["반복 패턴", stats.repeatedVisualPattern],
    ["인물 일관성", stats.characterConsistency],
  ];

  return [
    "=== MV 최종 품질 체크리스트 ===",
    `내보내기 판정: ${status}`,
    `전체 씬: ${stats.total}개 / 준비 완료: ${stats.ready}개 / 확인 필요: ${stats.needsReview}개`,
    ...items.map(([label, count]) => `- ${label}: ${count ? `확인 필요 ${count}개` : "통과"}`),
    "",
  ].join("\n");
};

window.getMVScenePromptForExport = function (scene, index, field = "prompt") {
  const textareaId = field === "promptKo" ? `scene_${index}_ko` : `scene_${index}_en`;
  const textareaValue = document.getElementById(textareaId)?.value || "";
  const rawPrompt = textareaValue || scene[field] || "";
  if (field === "prompt" && typeof window.cleanEnglishMidjourneyPrompt === "function") {
    return window.cleanEnglishMidjourneyPrompt(rawPrompt);
  }
  if (typeof window.cleanMidjourneyPrompt === "function") {
    return window.cleanMidjourneyPrompt(rawPrompt);
  }
  return rawPrompt;
};

window.formatMVTableCell = function (value) {
  return String(value || "")
    .replace(/\t/g, " ")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

window.buildMVScenePromptTableText = function () {
  const scenes = Array.isArray(window.currentScenes) ? window.currentScenes : [];
  if (scenes.length === 0) return "";

  const headers = ["씬", "시간", "가사", "EN 프롬프트", "KO 설명"];
  const rows = scenes.map((scene, index) => {
    const enPrompt = window.getMVScenePromptForExport(scene, index, "prompt");
    const koPrompt = window.getMVScenePromptForExport(scene, index, "promptKo");
    return [
      index + 1,
      scene.time || "",
      scene.lyrics || "",
      enPrompt,
      koPrompt || scene.scene || "",
    ].map(window.formatMVTableCell);
  });

  return [headers, ...rows].map((row) => row.join("\t")).join("\n");
};

window.getMVUnsavedSceneIndexes = function () {
  const badges = Array.from(
    document.querySelectorAll?.('.mv-scene-unsaved-badge[data-dirty="true"]') ||
      [],
  );
  return badges
    .map((badge) => Number(badge?.dataset?.sceneIndex))
    .filter((index) => Number.isInteger(index) && index >= 0);
};

window.buildMVUnsavedSceneExportMessage = function (actionLabel) {
  const indexes =
    typeof window.getMVUnsavedSceneIndexes === "function"
      ? window.getMVUnsavedSceneIndexes()
      : [];
  const sceneLabels = indexes.map((index) => index + 1).join(", ");
  const target = actionLabel || "복사/내보내기";
  return [
    `수정 미저장 씬 ${indexes.length}개가 있습니다.`,
    sceneLabels ? `대상 씬: ${sceneLabels}` : "",
    `${target}에는 현재 화면의 편집 내용이 포함되지만, 프로젝트 저장본에는 아직 반영되지 않았을 수 있습니다.`,
    "먼저 저장하려면 취소 후 미저장 씬을 저장해 주세요.",
    "",
    "그래도 계속 진행할까요?",
  ]
    .filter((line) => line !== "")
    .join("\n");
};

window.confirmMVExportWithUnsavedScenes = function (actionLabel) {
  const indexes =
    typeof window.getMVUnsavedSceneIndexes === "function"
      ? window.getMVUnsavedSceneIndexes()
      : [];
  if (indexes.length === 0) return true;

  const message =
    typeof window.buildMVUnsavedSceneExportMessage === "function"
      ? window.buildMVUnsavedSceneExportMessage(actionLabel)
      : "수정 미저장 씬이 있습니다. 계속 진행할까요?";
  const shouldContinue =
    typeof window.confirm === "function" ? window.confirm(message) : true;
  if (shouldContinue) return true;

  if (typeof window.focusMVFirstDirtyScene === "function") {
    window.focusMVFirstDirtyScene();
  }
  if (typeof window.showCopyIndicator === "function") {
    window.showCopyIndicator(
      "저장되지 않은 씬을 먼저 확인한 뒤 다시 복사/내보내기 해주세요.",
    );
  }
  return false;
};

window.buildMVFinalExportConfirmMessage = function (actionLabel, options = {}) {
  const scenes = Array.isArray(window.currentScenes) ? window.currentScenes : [];
  const projectTitle =
    typeof window.getMVProjectTitleForExport === "function"
      ? window.getMVProjectTitleForExport()
      : "제목 없음";
  const stats =
    typeof getMVSceneQualityStats === "function"
      ? getMVSceneQualityStats(scenes)
      : {
          total: scenes.length,
          ready: 0,
          needsReview: 0,
          invalidTime: 0,
          missingLocation: 0,
          missingCamera: 0,
          missingLyrics: 0,
          missingEnPrompt: 0,
          missingKoPrompt: 0,
          promptLength: 0,
          blockedTerms: 0,
          duplicatePrompt: 0,
          repeatedVisualPattern: 0,
          characterConsistency: 0,
        };
  const unsavedIndexes =
    typeof window.getMVUnsavedSceneIndexes === "function"
      ? window.getMVUnsavedSceneIndexes()
      : [];
  const includeItems =
    Array.isArray(options.includeItems) && options.includeItems.length
      ? options.includeItems
      : [
          "통합/배경/인물 프롬프트",
          "씬별 개별 프롬프트",
          "씬 메타데이터",
          "최종 품질 체크리스트",
        ];
  const issueSummary = [
    ["시간", stats.invalidTime],
    ["장소", stats.missingLocation],
    ["카메라", stats.missingCamera],
    ["가사", stats.missingLyrics],
    ["EN", stats.missingEnPrompt],
    ["KO", stats.missingKoPrompt],
    ["길이", stats.promptLength],
    ["금지어", stats.blockedTerms],
    ["중복", stats.duplicatePrompt],
    ["반복", stats.repeatedVisualPattern],
    ["인물", stats.characterConsistency],
  ]
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${label} ${count}개`);
  const unsavedLabel = unsavedIndexes.length
    ? `수정 미저장 씬: ${unsavedIndexes.length}개 (씬 ${unsavedIndexes
        .map((index) => index + 1)
        .join(", ")})`
    : "수정 미저장 씬: 없음";

  return [
    "전체 MV 프롬프트 최종 확인",
    "",
    `작업: ${actionLabel || "전체 MV 프롬프트 내보내기"}`,
    `프로젝트: ${projectTitle}`,
    `씬 수: 전체 ${stats.total}개 / 준비 완료 ${stats.ready}개 / 확인 필요 ${stats.needsReview}개`,
    unsavedLabel,
    `품질 확인 항목: ${issueSummary.length ? issueSummary.join(" · ") : "모두 통과"}`,
    "",
    "포함 항목:",
    ...includeItems.map((item) => `- ${item}`),
    "",
    stats.needsReview
      ? "확인 필요 항목이 남아 있습니다. 그래도 현재 상태로 내보낼까요?"
      : "현재 상태로 내보내도 좋습니다. 계속 진행할까요?",
  ].join("\n");
};

window.confirmMVFinalPromptExport = function (actionLabel, options = {}) {
  if (options.skipConfirm) return true;
  const message =
    typeof window.buildMVFinalExportConfirmMessage === "function"
      ? window.buildMVFinalExportConfirmMessage(actionLabel, options)
      : "전체 MV 프롬프트를 내보낼까요?";
  const shouldContinue =
    typeof window.confirm === "function" ? window.confirm(message) : true;
  if (shouldContinue) return true;

  const scenes = Array.isArray(window.currentScenes) ? window.currentScenes : [];
  const reviewIndexes =
    typeof getMVSceneReviewIndexes === "function"
      ? getMVSceneReviewIndexes(scenes)
      : [];
  if (reviewIndexes.length && typeof window.focusMVFirstReviewScene === "function") {
    window.focusMVFirstReviewScene();
  } else if (typeof window.focusMVFirstDirtyScene === "function") {
    window.focusMVFirstDirtyScene();
  }
  if (typeof window.showCopyIndicator === "function") {
    window.showCopyIndicator("최종 확인에서 내보내기를 취소했습니다.");
  }
  return false;
};

window.copyMVScenePromptTable = function () {
  const text = window.buildMVScenePromptTableText();
  if (!text) {
    alert("복사할 씬 프롬프트 표가 없습니다.");
    return;
  }
  if (!window.confirmMVExportWithUnsavedScenes("씬 프롬프트 표 복사")) {
    return;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => {
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          "✅ 씬 프롬프트 표가 클립보드에 복사되었습니다!",
        );
      } else {
        alert("씬 프롬프트 표가 클립보드에 복사되었습니다.");
      }
    })
    .catch((err) => {
      console.error("씬 프롬프트 표 복사 오류:", err);
      alert("씬 프롬프트 표 복사 중 오류가 발생했습니다.");
    });
};

window.getMVPromptInputValue = function (id) {
  return document.getElementById(id)?.value || "";
};

window.buildMVImagePromptBundle = function () {
  const scenes = Array.isArray(window.currentScenes) ? window.currentScenes : [];
  const sections = [];

  const addPromptSection = (title, ko, en) => {
    if (!ko && !en) return;
    let section = `=== ${title} ===\n`;
    if (en) section += `[EN]\n${en}\n\n`;
    if (ko) section += `[KO]\n${ko}\n\n`;
    sections.push(section.trim());
  };

  addPromptSection(
    "대표 썸네일 이미지 프롬프트",
    window.getMVPromptInputValue("mvThumbnailPromptKo"),
    window.getMVPromptInputValue("mvThumbnailPromptEn"),
  );
  addPromptSection(
    "배경 이미지 프롬프트",
    window.getMVPromptInputValue("mvBackgroundDetailPromptKo") ||
      window.getMVPromptInputValue("mvBackgroundPromptKo"),
    window.getMVPromptInputValue("mvBackgroundDetailPromptEn") ||
      window.getMVPromptInputValue("mvBackgroundPromptEn"),
  );
  addPromptSection(
    "인물 이미지 프롬프트",
    window.getMVPromptInputValue("mvCharacterDetailPromptKo") ||
      window.getMVPromptInputValue("mvCharacterPromptKo"),
    window.getMVPromptInputValue("mvCharacterDetailPromptEn") ||
      window.getMVPromptInputValue("mvCharacterPromptEn"),
  );
  addPromptSection(
    "통합 이미지 스타일 프롬프트",
    window.getMVPromptInputValue("mvCombinedPromptKo"),
    window.getMVPromptInputValue("mvCombinedPromptEn"),
  );

  if (scenes.length > 0) {
    let sceneSection = "=== 씬별 이미지 생성 프롬프트 ===\n\n";
    sceneSection +=
      "공통 규칙: 16:9 aspect ratio, cinematic composition, consistent character identity, no text, no watermark, high detail.\n\n";

    scenes.forEach((scene, index) => {
      const enPrompt = window.getMVScenePromptForExport(scene, index, "prompt");
      const koPrompt = window.getMVScenePromptForExport(scene, index, "promptKo");
      sceneSection += `--- 씬 ${index + 1} (${scene.time || "시간 미정"}) ---\n`;
      sceneSection += `장면: ${scene.scene || ""}\n`;
      sceneSection += window.formatMVSceneExportMetadata(scene);
      if (enPrompt) {
        sceneSection += `[이미지 생성 EN]\n${enPrompt}, 16:9 aspect ratio, cinematic composition, high detail, no text, no watermark\n\n`;
      }
      if (koPrompt) {
        sceneSection += `[참고 KO]\n${koPrompt}\n\n`;
      }
    });

    sections.push(sceneSection.trim());
  }

  if (sections.length === 0) return "";
  return `MV 이미지 생성 프롬프트 번들\n\n${window.buildMVExportMetadataHeader()}${window.buildMVExportQualityChecklist(scenes)}${sections.join("\n\n")}\n`;
};

window.copyMVImagePromptBundle = function () {
  const text = window.buildMVImagePromptBundle();
  if (!text) {
    alert("복사할 이미지 생성 프롬프트가 없습니다.");
    return;
  }
  if (!window.confirmMVExportWithUnsavedScenes("이미지 프롬프트 번들 복사")) {
    return;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => {
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          "✅ 이미지 생성 프롬프트 번들이 클립보드에 복사되었습니다!",
        );
      } else {
        alert("이미지 생성 프롬프트 번들이 클립보드에 복사되었습니다.");
      }
    })
    .catch((err) => {
      console.error("이미지 생성 프롬프트 번들 복사 오류:", err);
      alert("이미지 생성 프롬프트 번들 복사 중 오류가 발생했습니다.");
    });
};

window.downloadMVImagePromptBundle = function () {
  const text = window.buildMVImagePromptBundle();
  if (!text) {
    alert("다운로드할 이미지 생성 프롬프트가 없습니다.");
    return;
  }
  if (!window.confirmMVExportWithUnsavedScenes("이미지 프롬프트 TXT 다운로드")) {
    return;
  }

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mv-image-prompts.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.getMVVideoToolConfig = function (tool) {
  const toolKey = String(tool || "runway").toLowerCase();
  const configs = {
    runway: {
      key: "runway",
      label: "Runway",
      filename: "mv-runway-prompts.txt",
      suffix:
        "cinematic motion, fluid movement, photorealistic, highly detailed, 8k, no text overlays, no watermark",
    },
    pika: {
      key: "pika",
      label: "Pika",
      filename: "mv-pika-prompts.txt",
      suffix:
        "animate as a polished music video shot, smooth subject motion, consistent character identity, no subtitles, no watermark",
    },
    kling: {
      key: "kling",
      label: "Kling",
      filename: "mv-kling-prompts.txt",
      suffix:
        "high-detail cinematic video, natural movement, stable subject identity, realistic camera motion, no text overlays, no watermark",
    },
  };
  return configs[toolKey] || configs.runway;
};

window.buildMVVideoToolScenePrompt = function (scene, index, tool) {
  const config = window.getMVVideoToolConfig(tool);
  const fallbackPrompt = window.getMVScenePromptForExport(scene, index, "prompt");
  const basePrompt =
    config.key === "runway" && scene.runwayPrompt
      ? scene.runwayPrompt
      : fallbackPrompt || scene.runwayPrompt || scene.scene || "cinematic music video scene";
  const promptParts = [basePrompt];

  if (scene.cameraWork) promptParts.push(`Camera: ${scene.cameraWork}`);
  if (scene.mood) promptParts.push(`Mood: ${scene.mood}`);
  if (scene.lighting) promptParts.push(`Lighting: ${scene.lighting}`);
  if (typeof scene.durationSeconds === "number") {
    promptParts.push(`Duration: ${scene.durationSeconds} seconds`);
  }
  promptParts.push(config.suffix);

  return promptParts.filter(Boolean).join(". ");
};

window.buildMVVideoToolPrompts = function (tool = "runway") {
  const config = window.getMVVideoToolConfig(tool);
  const scenes = Array.isArray(window.currentScenes) ? window.currentScenes : [];
  if (scenes.length === 0) return "";

  let text = `MV ${config.label} 영상 생성 프롬프트\n\n`;
  text += window.buildMVExportMetadataHeader();
  text += window.buildMVExportQualityChecklist(scenes);
  text += "공통 규칙: 같은 인물과 의상 정체성을 유지하고, 자막/워터마크/로고/왜곡된 손가락을 피합니다.\n\n";

  scenes.forEach((scene, index) => {
    text += `=== 씬 ${index + 1} (${scene.time || "시간 미정"}) ===\n`;
    text += `장면: ${scene.scene || ""}\n`;
    text += window.formatMVSceneExportMetadata(scene);
    text += `[${config.label} 프롬프트]\n`;
    text += `${window.buildMVVideoToolScenePrompt(scene, index, config.key)}\n\n`;

    const koPrompt = window.getMVScenePromptForExport(scene, index, "promptKo");
    if (koPrompt) {
      text += `[참고 한글]\n${koPrompt}\n\n`;
    }
  });

  return text;
};

window.copyMVVideoToolPrompts = function (tool = "runway") {
  const config = window.getMVVideoToolConfig(tool);
  const text = window.buildMVVideoToolPrompts(config.key);
  if (!text) {
    alert("복사할 영상 생성 프롬프트가 없습니다.");
    return;
  }
  if (!window.confirmMVExportWithUnsavedScenes(`${config.label} 영상 프롬프트 복사`)) {
    return;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => {
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          `✅ ${config.label} 영상 생성 프롬프트가 클립보드에 복사되었습니다!`,
        );
      } else {
        alert(`${config.label} 영상 생성 프롬프트가 클립보드에 복사되었습니다.`);
      }
    })
    .catch((err) => {
      console.error("영상 생성 프롬프트 복사 오류:", err);
      alert("영상 생성 프롬프트 복사 중 오류가 발생했습니다.");
    });
};

window.downloadMVVideoToolPrompts = function (tool = "runway") {
  const config = window.getMVVideoToolConfig(tool);
  const text = window.buildMVVideoToolPrompts(config.key);
  if (!text) {
    alert("다운로드할 영상 생성 프롬프트가 없습니다.");
    return;
  }
  if (
    !window.confirmMVExportWithUnsavedScenes(
      `${config.label} 영상 프롬프트 TXT 다운로드`,
    )
  ) {
    return;
  }

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = config.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.downloadMVPrompts = function () {
  if (!window.currentScenes || window.currentScenes.length === 0) {
    alert("다운로드할 프롬프트가 없습니다.");
    return;
  }
  if (!window.confirmMVExportWithUnsavedScenes("전체 MV 프롬프트 다운로드")) {
    return;
  }
  if (!window.confirmMVFinalPromptExport("전체 MV 프롬프트 다운로드")) {
    return;
  }

  let text = "MV 프롬프트\n\n";
  text += window.buildMVExportMetadataHeader();
  text += window.buildMVExportQualityChecklist(window.currentScenes);

  // 통합/배경/인물 프롬프트 추가
  const combinedKo =
    document.getElementById("mvCombinedPromptKo")?.value ||
    document.getElementById("mvThumbnailPromptKo")?.value ||
    "";
  const combinedEn =
    document.getElementById("mvCombinedPromptEn")?.value ||
    document.getElementById("mvThumbnailPromptEn")?.value ||
    "";
  const backgroundKo =
    document.getElementById("mvBackgroundPromptKo")?.value ||
    document.getElementById("mvBackgroundDetailPromptKo")?.value ||
    "";
  const backgroundEn =
    document.getElementById("mvBackgroundPromptEn")?.value ||
    document.getElementById("mvBackgroundDetailPromptEn")?.value ||
    "";
  const characterKo =
    document.getElementById("mvCharacterPromptKo")?.value ||
    document.getElementById("mvCharacterDetailPromptKo")?.value ||
    "";
  const characterEn =
    document.getElementById("mvCharacterPromptEn")?.value ||
    document.getElementById("mvCharacterDetailPromptEn")?.value ||
    "";

  if (combinedKo || combinedEn) {
    text += "=== 통합 프롬프트 ===\n";
    if (combinedKo) text += `[한글]\n${combinedKo}\n\n`;
    if (combinedEn) text += `[영어]\n${combinedEn}\n\n`;
  }

  if (backgroundKo || backgroundEn) {
    text += "=== 배경 프롬프트 ===\n";
    if (backgroundKo) text += `[한글]\n${backgroundKo}\n\n`;
    if (backgroundEn) text += `[영어]\n${backgroundEn}\n\n`;
  }

  if (characterKo || characterEn) {
    text += "=== 인물 프롬프트 ===\n";
    if (characterKo) text += `[한글]\n${characterKo}\n\n`;
    if (characterEn) text += `[영어]\n${characterEn}\n\n`;
  }

  text += "=== 씬별 개별 프롬프트 ===\n\n";
  window.currentScenes.forEach((scene, index) => {
    const sceneId = `scene_${index}`;
    const enEl = document.getElementById(`${sceneId}_en`);
    const koEl = document.getElementById(`${sceneId}_ko`);

    text += `씬 ${index + 1} (${scene.time})\n`;
    text += `장면: ${scene.scene || ""}\n`;
    text += window.formatMVSceneExportMetadata(scene);
    if (enEl && enEl.value) {
      text += `[영어 프롬프트]\n${enEl.value}\n\n`;
    } else if (scene.prompt) {
      text += `[영어 프롬프트]\n${scene.prompt}\n\n`;
    }
    if (koEl && koEl.value) {
      text += `[한글 프롬프트]\n${koEl.value}\n\n`;
    } else if (scene.promptKo) {
      text += `[한글 프롬프트]\n${scene.promptKo}\n\n`;
    }
    text += "\n";
  });

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mv-prompts.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

