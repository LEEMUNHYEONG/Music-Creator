// js/storage.js - Music Creator Data Persistence

/**
 * 프로젝트 데이터의 유효성을 검사합니다.
 */
window.validateProjectData = function (project) {
  const errors = [];
  const warnings = [];

  if (!project.title || project.title.trim() === "") {
    warnings.push("제목이 비어있습니다.");
  }

  if (project.lastStep && (project.lastStep < 1 || project.lastStep > 6)) {
    errors.push("잘못된 단계 번호입니다.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
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
    scenes: cloneData(scenesSource, []),
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
    scenes: cloneData(mv.scenes, []),
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

/**
 * 프로젝트 정보를 비교하여 더 최신이거나 데이터가 많은 프로젝트를 반환하기 위한 유틸리티
 */
function isNewerOrBetter(newProj, oldProj) {
  const nData = newProj.data || newProj;
  const oData = oldProj.data || oldProj;
  
  // 데이터 완성도 체크 (가사나 마케팅 자료가 있는지)
  const hasMore = !!(nData.finalLyrics || nData.marketing);
  const existingHas = !!(oData.finalLyrics || oData.marketing);
  
  const nDate = new Date(nData.savedAt || nData.updatedAt || 0);
  const oDate = new Date(oData.savedAt || oData.updatedAt || 0);

  if (hasMore && !existingHas) return true;
  if (!hasMore && existingHas) return false;
  return nDate > oDate;
}

/**
 * 저장된 프로젝트를 로드하여 UI에 복원합니다.
 */
window.loadProject = function (projectId) {
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
      alert("프로젝트를 찾을 수 없습니다. (ID: " + projectId + ")");
      window.isInitialLoading = false;
      return;
    }

    // 전역 상태 설정
    window.currentProject = foundProject;
    window.currentProjectId = projectId;
    
    // 데이터 구조 보정 (old format 지원)
    if (!window.currentProject.data) {
      window.currentProject.data = foundProject;
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
    console.log("🎊 프로젝트 로드 완료:", foundProject.title || "제목 없음");

  } catch (error) {
    console.error("❌ 프로젝트 로드 중 오류 발생:", error);
    alert("프로젝트 로드 중 오류가 발생했습니다.");
    window.isInitialLoading = false;
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
      projectId = "proj_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      window.currentProjectId = projectId;
    }

    // 기존 데이터 유지 (DOM에 없는 데이터 보존)
    const existing = (window.currentProject && window.currentProject.data) ? window.currentProject.data : {};
    
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
    const canSaveReview = (id) => document.getElementById(id);

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
      m.mvScenes = JSON.parse(JSON.stringify(window.currentScenes));
    }

    // 신규 MV 통합 모델 병행 저장 (기존 mvSettings/mvPrompts/mvScenes 보존)
    if (typeof window.syncMarketingMVModel === "function") {
      window.syncMarketingMVModel(m);
    }

    // 로컬 스토리지 업데이트
    const keys = ["musicCreatorProjects", "savedProjects"];
    keys.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        let list = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(list)) list = [];
        
        const idx = list.findIndex(p => p && p.id === projectId);
        if (idx !== -1) {
          list[idx] = projectToSave;
        } else {
          list.push(projectToSave);
        }
        localStorage.setItem(key, JSON.stringify(list));
      } catch (e) {
        console.warn(`${key} 저장 중 오류:`, e);
      }
    });

    window.currentProject = projectToSave;
    console.log("✅ 프로젝트 로컬 저장 완료!");

    // ☁️ Firestore 클라우드 자동 백업 (백그라운드 실행) - 자동 동기화 설정에 따라
    const cloudAutoSync = localStorage.getItem('cloudAutoSync') !== 'false'; // 기본: true
    if (cloudAutoSync && window.firebaseAuth && window.firebaseAuth.currentUser && window.firebaseDb) {
      const uid = window.firebaseAuth.currentUser.uid;
      try {
        window.firebaseDb.collection("users").doc(uid).collection("projects").doc(projectId)
          .set(projectToSave)
          .then(() => {
            console.log(`☁️ 프로젝트 클라우드 백업 완료: ${projectId}`);
            if (typeof window.updateSaveStatusUI === "function") {
              window.updateSaveStatusUI("success");
            }

            // ⏱️ 시간대별 히스토리 스냅샷 저장 (수량 제한 없이 전체 보관)
            const historyRef = window.firebaseDb
              .collection("users").doc(uid)
              .collection("projects").doc(projectId)
              .collection("history");
            const historyId = "snap_" + Date.now();
            historyRef.doc(historyId).set({
              ...projectToSave,
              _historyDocId: historyId,
              _savedAt: projectToSave.savedAt
            }).catch(() => {});
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
    
    return true;

  } catch (error) {
    console.error("❌ 저장 오류:", error);
    return false;
  }
};

/**
 * 헬퍼: HTML 탈출
 */
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

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
      localStorage.setItem(localKey, JSON.stringify(localProjects));
      console.log(`✅ ${mergedCount}개의 클라우드 프로젝트가 로컬에 병합되었습니다.`);
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

  localStorage.setItem(localKey, JSON.stringify(localProjects));

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
    localStorage.setItem(localKey, JSON.stringify(localProjects));
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
    try {
      await window.firebaseDb
        .collection("users").doc(uid)
        .collection("projects").doc(p.id)
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
      alert("해당 히스토리 스냅샷을 찾을 수 없습니다.");
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
    localStorage.setItem(localKey, JSON.stringify(localProjects));
    if (typeof window.loadProjectList === "function") window.loadProjectList();
    // 현재 프로젝트와 동일하면 즉시 UI 갱신
    if (window.currentProjectId === projectId && typeof window.loadProject === "function") {
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
