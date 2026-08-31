// === MV Step 6: SRT export and preview ===

window.copySRTContent = function (event) {
  try {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (!window.currentSRTContent) {
      alert(
        '⚠️ 복사할 SRT 자막이 없습니다.\n\n먼저 "SRT 자막 생성" 버튼을 클릭하여 자막을 생성해주세요.',
      );
      return;
    }

    navigator.clipboard
      .writeText(window.currentSRTContent)
      .then(() => {
        if (typeof window.showCopyIndicator === "function") {
          window.showCopyIndicator("✅ SRT 자막이 클립보드에 복사되었습니다!");
        } else {
          alert("✅ SRT 자막이 클립보드에 복사되었습니다!");
        }
      })
      .catch(() => {
        // 폴백
        const textarea = document.createElement("textarea");
        textarea.value = window.currentSRTContent;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        if (typeof window.showCopyIndicator === "function") {
          window.showCopyIndicator("✅ SRT 자막이 클립보드에 복사되었습니다!");
        } else {
          alert("✅ SRT 자막이 클립보드에 복사되었습니다!");
        }
      });
  } catch (error) {
    console.error("❌ SRT 자막 복사 오류:", error);
    alert("SRT 자막 복사 중 오류가 발생했습니다:\n\n" + error.message);
  }
};

// SRT 파일 다운로드
window.downloadSRT = function (platform) {
  try {
    if (!window.currentSRTContent) {
      alert(
        '⚠️ 다운로드할 SRT 자막이 없습니다.\n\n먼저 "SRT 자막 생성" 버튼을 클릭하여 자막을 생성해주세요.',
      );
      return;
    }

    // 제목 가져오기
    const titleEl =
      document.getElementById("finalTitleText") ||
      document.getElementById("songTitle") ||
      document.getElementById("sunoTitle");
    const title = titleEl?.textContent || titleEl?.value || "자막";

    // 파일명 생성 (특수문자 제거)
    const safeTitle =
      title
        .replace(/[^a-zA-Z0-9가-힣\s]/g, "")
        .trim()
        .replace(/\s+/g, "_") || "subtitle";
    const filename = `${safeTitle}.srt`;

    // 플랫폼에 따라 줄바꿈 문자 결정
    const lineEnding = platform === "win" ? "\r\n" : "\n";

    // 💡 [FIX] SRT 형식은 반드시 숫자(1)로 시작해야 하므로 메타데이터 헤더를 파일 맨 앞에 붙이면 안 됩니다.
    let srtContent = window.currentSRTContent;
    if (platform === "win") {
      srtContent = srtContent.replace(/\n/g, "\r\n");
    }

    // Blob 생성 및 다운로드
    const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const platformName = platform === "win" ? "윈도우용" : "맥용";
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ ${platformName} SRT 파일이 다운로드되었습니다!\n\n파일명: ${filename}`,
      );
    } else {
      alert(
        `✅ ${platformName} SRT 파일이 다운로드되었습니다!\n\n파일명: ${filename}`,
      );
    }

    console.log("✅ SRT 파일 다운로드 완료:", filename);
  } catch (error) {
    console.error("❌ SRT 파일 다운로드 오류:", error);
    alert("SRT 파일 다운로드 중 오류가 발생했습니다:\n\n" + error.message);
  }
};

// --- Extracted generateSRTPreview ---
window.generateSRTPreview = function () {
  try {
    // 최종 가사 가져오기
    const finalLyricsEl = document.getElementById("finalLyrics");
    if (!finalLyricsEl || !finalLyricsEl.textContent.trim()) {
      alert(
        "⚠️ 최종 가사가 없습니다.\n\n5단계에서 최종 가사를 먼저 확인해주세요.",
      );
      return;
    }

    const lyrics = finalLyricsEl.textContent.trim();

    // 설정 값 가져오기
    const displayDuration = parseInt(
      document.getElementById("srtDisplayDuration")?.value || "16",
      10,
    );
    const linesPerSubtitle = parseInt(
      document.getElementById("srtLinesPerSubtitle")?.value || "2",
      10,
    );

    // 가사에서 지시어 제거하고 실제 가사만 추출
    const lyricsLines = lyrics
      .split("\n")
      .map((line) => {
        // 대괄호와 그 안의 내용 제거 (모든 지시어 제거)
        let cleaned = line.replace(/\[[^\]]*\]/g, "").trim();
        return cleaned;
      })
      .filter((line) => {
        // 빈 줄 제거
        if (line.length === 0) {
          return false;
        }
        // 실제 가사만 포함
        return true;
      });

    if (lyricsLines.length === 0) {
      alert(
        "⚠️ 추출할 가사가 없습니다.\n\n가사에 지시어만 있고 실제 가사 내용이 없는 것 같습니다.",
      );
      return;
    }

    const toSRTTime = (seconds) => {
      const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
      const hours = Math.floor(safeSeconds / 3600);
      const minutes = Math.floor((safeSeconds % 3600) / 60);
      const secs = safeSeconds % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},000`;
    };

    const sceneSubtitles = [];
    if (Array.isArray(window.currentScenes)) {
      window.currentScenes.forEach((scene) => {
        const start = Number(scene?.startSeconds);
        const end = Number(scene?.endSeconds);

        if (!scene || !scene.lyrics || isNaN(start) || isNaN(end) || end <= start) {
          return;
        }

        // 💡 [FIX] 씬 내부의 가사를 정제하고 설정된 줄 수(linesPerSubtitle)에 맞게 쪼갭니다.
        const sceneLyricsLines = scene.lyrics
          .split("\n")
          .map(line => line.replace(/\[[^\]]*\]/g, "").trim())
          .filter(line => line.length > 0);

        if (sceneLyricsLines.length === 0) return;

        // 설정된 linesPerSubtitle 단위로 가사 청크 분할
        const chunks = [];
        for (let i = 0; i < sceneLyricsLines.length; i += linesPerSubtitle) {
          chunks.push(sceneLyricsLines.slice(i, i + linesPerSubtitle).join("\n")); // 줄바꿈(\n) 명시
        }

        // 씬 전체 시간을 청크 개수만큼 등분하여 타이밍 배분
        const sceneDuration = end - start;
        const chunkDuration = sceneDuration / chunks.length;

        chunks.forEach((chunkText, idx) => {
          const chunkStart = start + (chunkDuration * idx);
          const chunkEnd = start + (chunkDuration * (idx + 1));
          
          sceneSubtitles.push({
            startTime: toSRTTime(chunkStart),
            endTime: toSRTTime(chunkEnd),
            text: chunkText
          });
        });
      });
    }

    if (sceneSubtitles.length > 0) {
      let srtContent = "";
      sceneSubtitles.forEach((subtitle, index) => {
        srtContent += `${index + 1}\n`;
        srtContent += `${subtitle.startTime} --> ${subtitle.endTime}\n`;
        srtContent += `${subtitle.text}\n\n`;
      });

      const previewEl = document.getElementById("srtPreview");
      if (previewEl) {
        previewEl.innerHTML = `
                <div style="padding: 20px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border);">
                    <h4 style="margin: 0 0 15px 0; color: var(--text-primary); font-size: 1.1rem;">
                        <i class="fas fa-file-alt"></i> 생성된 SRT 자막 (${sceneSubtitles.length}개 자막)
                    </h4>
                    <pre style="background: var(--bg-input); padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 0.85rem; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; word-wrap: break-word; max-height: 400px; overflow-y: auto;">${escapeHtml(srtContent)}</pre>
                </div>
            `;
      }

      window.currentSRTContent = srtContent;

      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          `✅ SRT 자막이 생성되었습니다! (${sceneSubtitles.length}개 자막)`,
        );
      } else {
        alert(`✅ SRT 자막이 생성되었습니다! (${sceneSubtitles.length}개 자막)`);
      }

      console.log("✅ SRT 자막 생성 완료:", sceneSubtitles.length, "개 자막");
      return;
    }

    // SRT 형식으로 변환
    let srtContent = "";
    let subtitleIndex = 1;
    let currentTime = 0; // 시작 시간 (초)

    // 줄을 묶어서 자막 생성
    for (let i = 0; i < lyricsLines.length; i += linesPerSubtitle) {
      const subtitleLines = lyricsLines.slice(i, i + linesPerSubtitle);
      const subtitleText = subtitleLines.join("\n"); // SRT 형식에서 실제 줄바꿈 문자 사용

      // 시간 형식: HH:MM:SS,mmm -> HH:MM:SS,mmm
      const startHours = Math.floor(currentTime / 3600);
      const startMinutes = Math.floor((currentTime % 3600) / 60);
      const startSeconds = currentTime % 60;
      const startTimeStr = `${String(startHours).padStart(2, "0")}:${String(startMinutes).padStart(2, "0")}:${String(startSeconds).padStart(2, "0")},000`;

      const endTime = currentTime + displayDuration;
      const endHours = Math.floor(endTime / 3600);
      const endMinutes = Math.floor((endTime % 3600) / 60);
      const endSeconds = endTime % 60;
      const endTimeStr = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}:${String(endSeconds).padStart(2, "0")},000`;

      srtContent += `${subtitleIndex}\n`;
      srtContent += `${startTimeStr} --> ${endTimeStr}\n`;
      srtContent += `${subtitleText}\n\n`;

      subtitleIndex++;
      currentTime = endTime;
    }

    // 미리보기 표시
    const previewEl = document.getElementById("srtPreview");
    if (previewEl) {
      previewEl.innerHTML = `
                <div style="padding: 20px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border);">
                    <h4 style="margin: 0 0 15px 0; color: var(--text-primary); font-size: 1.1rem;">
                        <i class="fas fa-file-alt"></i> 생성된 SRT 자막 (${subtitleIndex - 1}개 자막)
                    </h4>
                    <pre style="background: var(--bg-input); padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 0.85rem; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; word-wrap: break-word; max-height: 400px; overflow-y: auto;">${escapeHtml(srtContent)}</pre>
                </div>
            `;
    }

    // 전역 변수에 저장 (복사/다운로드용)
    window.currentSRTContent = srtContent;

    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator(
        `✅ SRT 자막이 생성되었습니다! (${subtitleIndex - 1}개 자막)`,
      );
    } else {
      alert(`✅ SRT 자막이 생성되었습니다! (${subtitleIndex - 1}개 자막)`);
    }

    console.log("✅ SRT 자막 생성 완료:", subtitleIndex - 1, "개 자막");
  } catch (error) {
    console.error("❌ SRT 자막 생성 오류:", error);
    alert("SRT 자막 생성 중 오류가 발생했습니다:\n\n" + error.message);
  }
};


