// ==========================================
// js/step4.js - Music Creator
// ==========================================

// --- Utility Functions ---
function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.toString().replace(/[&<>"']/g, function (m) {
    return map[m];
  });
}

// --- Extracted displayImprovements ---
function displayImprovements(analysisData) {
  try {
    const suggestionsContainer = document.getElementById(
      "geminiSuggestionsSummary",
    );
    if (!suggestionsContainer) {
      console.warn("⚠️ geminiSuggestionsSummary 요소를 찾을 수 없습니다.");
      return;
    }

    const improvements = analysisData.improvements || [];
    const feedbacks = analysisData.feedbacks || [];

    console.log("📊 개선안 데이터:", { improvements, feedbacks });

    if (improvements.length === 0 && feedbacks.length === 0) {
      suggestionsContainer.innerHTML =
        '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">분석된 개선안이 없습니다.</div>';
      return;
    }

    let html = "";
    let itemIndex = 0;

    // 개선안 목록 표시
    if (improvements.length > 0) {
      improvements.forEach((improvement, index) => {
        // improvement가 문자열인지 객체인지 확인
        let improvementText = "";
        if (typeof improvement === "string") {
          improvementText = improvement;
        } else if (typeof improvement === "object" && improvement !== null) {
          // 객체인 경우 텍스트 추출 시도
          improvementText =
            improvement.text ||
            improvement.content ||
            improvement.suggestion ||
            JSON.stringify(improvement);
        } else {
          improvementText = String(improvement);
        }

        if (!improvementText || !improvementText.trim()) {
          return; // 빈 항목은 건너뛰기
        }

        const improvementId = `improvement_${itemIndex}`;
        html += `
                    <div style="padding: 12px; margin-bottom: 10px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border); display: flex; align-items: flex-start; gap: 12px; max-width: 100%; box-sizing: border-box; overflow: hidden;">
                        <input type="checkbox" id="${improvementId}" class="improvement-checkbox" data-index="${index}" data-type="improvement" style="margin-top: 4px; cursor: pointer; flex-shrink: 0; min-width: 18px; width: 18px; height: 18px;" onchange="if(typeof window.updateSelectedCount === 'function') { window.updateSelectedCount(); }">
                        <label for="${improvementId}" style="flex: 1; cursor: pointer; color: var(--text-primary); line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word; min-width: 0; max-width: 100%; box-sizing: border-box;">
                            ${escapeHtml(improvementText)}
                        </label>
                    </div>
                `;
        itemIndex++;
      });
    }

    // 피드백에서 제안 사항 추출
    if (feedbacks.length > 0) {
      feedbacks.forEach((feedback, index) => {
        if (!feedback || typeof feedback !== "object") {
          return; // 유효하지 않은 피드백 건너뛰기
        }

        // suggestion이 있으면 표시
        if (feedback.suggestion && feedback.suggestion.trim()) {
          const feedbackId = `feedback_${itemIndex}`;
          const category = escapeHtml(feedback.category || "제안");
          const suggestion = escapeHtml(feedback.suggestion);

          html += `
                        <div style="padding: 12px; margin-bottom: 10px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border); display: flex; align-items: flex-start; gap: 12px; max-width: 100%; box-sizing: border-box; overflow: hidden;">
                            <input type="checkbox" id="${feedbackId}" class="improvement-checkbox" data-type="feedback" data-index="${index}" style="margin-top: 4px; cursor: pointer; flex-shrink: 0; min-width: 18px; width: 18px; height: 18px;" onchange="if(typeof window.updateSelectedCount === 'function') { window.updateSelectedCount(); }">
                            <label for="${feedbackId}" style="flex: 1; cursor: pointer; min-width: 0; max-width: 100%; box-sizing: border-box;">
                                <div style="color: var(--text-primary); font-weight: 600; margin-bottom: 5px; word-wrap: break-word; overflow-wrap: break-word;">${category}</div>
                                <div style="color: var(--text-secondary); line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word;">${suggestion}</div>
                            </label>
                        </div>
                    `;
          itemIndex++;
        }
      });
    }

    if (!html) {
      suggestionsContainer.innerHTML =
        '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">표시할 개선안이 없습니다.</div>';
      return;
    }

    suggestionsContainer.innerHTML = html;

    // updateSelectedCount 함수 대체 적용 (DOM 생성 후 초기화)
    if (typeof window.updateSelectedCount === "function") {
      window.updateSelectedCount();
    }

    console.log(
      "✅ 개선안 표시 완료:",
      improvements.length +
        "개 개선안, " +
        feedbacks.length +
        "개 피드백, 총 " +
        itemIndex +
        "개 항목 표시",
    );
  } catch (error) {
    console.error("❌ 개선안 표시 오류:", error);
    const suggestionsContainer = document.getElementById(
      "geminiSuggestionsSummary",
    );
    if (suggestionsContainer) {
      suggestionsContainer.innerHTML = `<div style="padding: 20px; background: var(--bg-input); border-radius: 8px; color: var(--error);">
                <strong>오류:</strong> 개선안을 표시하는 중 오류가 발생했습니다.<br>
                ${escapeHtml(error.message)}
            </div>`;
    }
  }
}

window.displayImprovements = displayImprovements;
// --- Extracted confirmFinalizedContent ---
window.confirmFinalizedContent = function () {
  try {
    // "다음 단계로" 버튼 클릭 시 수정 모드 활성화 (데이터 수정 반영)
    window.editMode = true;
    if (typeof window.updateEditModeUI === "function") {
      window.updateEditModeUI();
    }
    if (typeof window.setReadOnlyMode === "function") {
      window.setReadOnlyMode(false);
    }

    const finalizedLyrics =
      document.getElementById("finalizedLyrics")?.value || "";
    const finalizedStyle =
      document.getElementById("finalizedStyle")?.value || "";

    // 제목 가져오기 (여러 소스에서 시도)
    const sunoTitle =
      document.getElementById("sunoTitle")?.value ||
      window.currentSunoTitle ||
      document.getElementById("songTitle")?.value ||
      "제목 없음";

    if (!finalizedLyrics.trim()) {
      alert("확정된 가사를 먼저 입력해주세요.");
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // 4단계 데이터를 5단계로 전달
    // ═══════════════════════════════════════════════════════════════

    // 5단계 제목 설정
    const finalTitleTextEl = document.getElementById("finalTitleText");
    if (finalTitleTextEl) {
      finalTitleTextEl.textContent = sunoTitle;
      console.log("✅ 5단계 제목 설정:", sunoTitle);
    }

    // 5단계 최종 가사 설정
    const finalLyricsEl = document.getElementById("finalLyrics");
    if (finalLyricsEl && finalizedLyrics) {
      finalLyricsEl.textContent = finalizedLyrics;
      console.log("✅ 5단계 최종 가사 설정 완료");
    }

    // 5단계 최종 스타일 설정
    const finalStyleEl = document.getElementById("finalStyle");
    if (finalStyleEl && finalizedStyle) {
      finalStyleEl.textContent = finalizedStyle;
      console.log("✅ 5단계 최종 스타일 설정 완료");
    }

    // 5단계 중간 프리뷰 필드도 업데이트 (Suno 복사용)
    const intermediateLyricsPreview = document.getElementById(
      "intermediateLyricsPreview",
    );
    const intermediateStylePreview = document.getElementById(
      "intermediateStylePreview",
    );

    if (intermediateLyricsPreview && finalizedLyrics) {
      intermediateLyricsPreview.textContent = finalizedLyrics;
      console.log("✅ 5단계 가사 프리뷰 설정 완료");
    }

    if (intermediateStylePreview && finalizedStyle) {
      intermediateStylePreview.textContent = finalizedStyle;
      console.log("✅ 5단계 스타일 프리뷰 설정 완료");
    }

    // 제목을 전역 변수에도 저장 (6단계에서 사용)
    window.currentSunoTitle = sunoTitle;
    window.currentFinalLyrics = finalizedLyrics;
    window.currentFinalStyle = finalizedStyle;

    // ═══════════════════════════════════════════════════════════════

    // 5단계로 이동
    if (typeof window.goToStep === "function") {
      window.goToStep(5, true, false);
      console.log(
        "✅ 4단계 → 5단계 이동 완료 (제목, 가사, 스타일 프롬프트 전달됨)",
      );
    }
  } catch (error) {
    console.error("❌ 4→5단계 이동 오류:", error);
    alert(
      "⚠️ 4단계 → 5단계 이동 중 오류가 발생했습니다.\n\n" +
        "원인: " +
        error.message +
        "\n\n" +
        "해결방법: 페이지를 새로고침(F5) 후 다시 시도해주세요.",
    );
  }
};

// --- Extracted applyAllImprovements ---
window.applyAllImprovements = async function () {
  try {
    // 모든 체크박스 선택
    const checkboxes = document.querySelectorAll(".improvement-checkbox");
    if (checkboxes.length === 0) {
      alert(
        "⚠️ 적용할 개선안이 없습니다.\n\n3단계에서 분석을 먼저 실행해주세요.",
      );
      return;
    }

    checkboxes.forEach((checkbox) => {
      checkbox.checked = true;
    });
    updateSelectedCount();

    // 선택한 항목만 적용 함수 호출 (async 함수이므로 await)
    await window.applySelectedImprovements();

    console.log("✅ 전체 개선안 적용 완료");
  } catch (error) {
    console.error("❌ 전체 개선안 적용 오류:", error);
    alert("⚠️ 전체 개선안 적용 중 오류가 발생했습니다.\n\n" + error.message);
  }
};

// --- Extracted applyExtractedLyrics ---
window.applyExtractedLyrics = async function (btnElement) {
  try {
    const extractedLyrics = window.extractedLyricsForApply;

    if (!extractedLyrics) {
      alert("⚠️ 반영할 가사가 없습니다.\n\n음원 분석을 먼저 실행해주세요.");
      return;
    }

    const finalLyricsEl = document.getElementById("finalLyrics");
    const finalizedLyricsEl = document.getElementById("finalizedLyrics");

    const applyPlainText = (text) => {
      if (finalLyricsEl) finalLyricsEl.textContent = text;
      if (finalizedLyricsEl) {
        finalizedLyricsEl.value = text;
        finalizedLyricsEl.readOnly = false; // 수정 가능하도록
      }
    };

    const geminiKey = window.getGeminiApiKey();
    if (!geminiKey || !geminiKey.startsWith("AIza")) {
      // API 키가 없으면 기존처럼 일반 텍스트만 복사
      applyPlainText(extractedLyrics);
      console.log(
        "✅ 추출된 가사가 최종 가사에 반영되었습니다. (AI 지시어 미적용)",
      );
      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          "✅ 추출된 가사가 최종 가사에 반영되었습니다!",
        );
      }
      return;
    }

    // AI가 지침서를 읽어 지시어 생성 상태 표시
    let originalBtnText = "✅ 추출된 가사를 최종 가사에 반영";
    if (btnElement) {
      originalBtnText = btnElement.innerHTML;
      btnElement.disabled = true;
      btnElement.innerHTML = "⏳ AI가 지침서를 분석하여 지시어 추가 중...";
    }

    const guidelines = localStorage.getItem("musicCreatorGuidelines") || "";

    // 프롬프트 작성
    const aiPrompt = `다음은 음원에서 추출된 순수 가사 원본입니다. 뮤직모리 제작 지침서를 참조하여, 5단계 최종 가사(Suno용)에 적합하게 각 절마다 적절한 Suno 지시어를 세밀하게 작성해 주세요.

=== 뮤직모리 제작 지침서 (반드시 참고) ===
${guidelines ? guidelines.substring(0, 2500) : "기본 지침서: [Intro], [Verse], [Chorus] 등의 구조와 [Tempo: ], [Vocal: ] 등의 스타일 지시어를 활용하세요."}

=== 추출된 가사 원본 ===
${extractedLyrics}

=== 요청 사항 ===
1. 원본 가사의 내용을 절대 임의로 삭제하거나 자명하게 변경하지 말고, 노래의 흐름과 문맥을 파악하여 적절한 구조적 지시어([Verse 1], [Chorus], [Pre-Chorus], [Bridge], [Outro] 등)를 추가하세요.
2. 지침서의 규정에 따라 보컬 톤, 감정, 장르, 악기 구성에 대한 묘사([Vocal: ...], [Instruments: ...], [Tempo: ...], [Reverb: ...] 등)를 섹션 시작 부분에 배치하세요.
3. 괄호 ( )는 Suno에서 발음 기호로 인식될 수 있으니 사용하지 말고, 대괄호 [ ] 만 사용하세요.
4. 어떤 설명이나 문구(예: '네, 제공해 드립니다') 또는 마크다운 코드 블록(\`\`\` 등)도 일절 포함하지 말고, 사용할 최종 가사 텍스트 결과만 바로 출력하세요.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

    try {
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: aiPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 3000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("API 연동 에러: " + response.status);
      }

      const data = await response.json();
      if (window.logApiUsage) window.logApiUsage("gemini");
      let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (aiResponse) {
        // 불필요한 마크다운 백틱 및 공백 제거
        aiResponse = aiResponse
          .replace(/^\`\`\`(text|lyrics)?\n|\n\`\`\`$/gm, "")
          .trim();
        applyPlainText(aiResponse);

        console.log("✅ AI 지시어가 포함된 가사가 반영되었습니다.");
        if (typeof window.showCopyIndicator === "function") {
          window.showCopyIndicator(
            "✅ AI가 지침서를 반영하여 성공적으로 가사와 지시어를 구성했습니다!",
          );
        }
      } else {
        throw new Error("AI 응답값이 비어있습니다.");
      }
    } catch (aiError) {
      console.error("❌ AI 지시어 생성 실패:", aiError);
      // 실패 시 폴백
      applyPlainText(extractedLyrics);
      alert(
        "⚠️ AI 지시어 생성에 실패하여 원본 텍스트만 반영되었습니다.\\n" +
          aiError.message,
      );
    } finally {
      // 버튼 상태 복구
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.innerHTML = originalBtnText;
      }
    }
  } catch (error) {
    console.error("❌ 가사 반영 오류:", error);
    alert("⚠️ 가사 반영 중 오류가 발생했습니다.\\n\\n" + error.message);
  }
};

// ═══════════════════════════════════════════════════════════════
// Step 4 추가 구현 함수들
// ═══════════════════════════════════════════════════════════════

// 선택된 개선안 개수 업데이트
window.updateSelectedCount = function () {
  const checked = document.querySelectorAll(
    ".improvement-checkbox:checked",
  ).length;
  const countEl = document.getElementById("selectedImprovementCount");
  if (countEl) {
    countEl.textContent = checked;
  }

  // 개수에 따라 적용 버튼 활성화/비활성화 (필요시)
  const applyBtn = document.getElementById("applySelectedBtn");
  if (applyBtn) {
    applyBtn.disabled = checked === 0;
  }
};

// 전체 선택
window.selectAllImprovements = function () {
  document
    .querySelectorAll(".improvement-checkbox")
    .forEach((cb) => (cb.checked = true));
  window.updateSelectedCount();
};

// 전체 해제
window.deselectAllImprovements = function () {
  document
    .querySelectorAll(".improvement-checkbox")
    .forEach((cb) => (cb.checked = false));
  window.updateSelectedCount();
};

// 가사 수동 수정 토글
window.toggleEditFinalizedLyrics = function () {
  const textarea = document.getElementById("finalizedLyrics");
  const button = document.getElementById("editFinalizedLyricsBtn");
  if (!textarea || !button) return;

  const isReadOnly = textarea.readOnly;
  textarea.readOnly = !isReadOnly;
  button.innerHTML = isReadOnly
    ? '<i class="fas fa-save"></i> 저장'
    : '<i class="fas fa-edit"></i> 수정하기';
  button.classList.toggle("btn-success", !isReadOnly);
  button.classList.toggle("btn-secondary", isReadOnly);

  if (!isReadOnly) {
    console.log("📝 가사 수정 모드로 전환됨");
    textarea.focus();
  } else {
    console.log("💾 가사 저장됨");
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator("✅ 가사 수정 내용이 반영되었습니다.");
    }
  }
};

// 스타일 수동 수정 토글
window.toggleEditFinalizedStyle = function () {
  const textarea = document.getElementById("finalizedStyle");
  const button = document.getElementById("editFinalizedStyleBtn");
  if (!textarea || !button) return;

  const isReadOnly = textarea.readOnly;
  textarea.readOnly = !isReadOnly;
  button.innerHTML = isReadOnly
    ? '<i class="fas fa-save"></i> 저장'
    : '<i class="fas fa-edit"></i> 수정하기';
  button.classList.toggle("btn-success", !isReadOnly);
  button.classList.toggle("btn-secondary", isReadOnly);

  if (!isReadOnly) {
    console.log("📝 스타일 수정 모드로 전환됨");
    textarea.focus();
  } else {
    console.log("💾 스타일 저장됨");
    if (typeof window.showCopyIndicator === "function") {
      window.showCopyIndicator("✅ 스타일 수정 내용이 반영되었습니다.");
    }
  }
};

// 선택된 개선안 적용 (AI 호출)
window.applySelectedImprovements = async function () {
  const checkedBoxes = document.querySelectorAll(
    ".improvement-checkbox:checked",
  );
  if (checkedBoxes.length === 0) {
    alert("적용할 개선안을 선택해주세요.");
    return;
  }

  const selectedImprovements = [];
  checkedBoxes.forEach((cb) => {
    const index = cb.getAttribute("data-index");
    const type = cb.getAttribute("data-type");
    let text = "";

    if (
      window.currentProject &&
      window.currentProject.data &&
      window.currentProject.data.analysis
    ) {
      const analysis = window.currentProject.data.analysis;
      if (type === "improvement") {
        const item = analysis.improvements[index];
        text =
          typeof item === "string"
            ? item
            : item.text || item.suggestion || JSON.stringify(item);
      } else if (type === "feedback") {
        const item = analysis.feedbacks[index];
        text = item.suggestion || item.text || JSON.stringify(item);
      }
    }
    if (text) selectedImprovements.push(text);
  });

  if (selectedImprovements.length === 0) {
    alert("선택된 개선안의 내용을 가져올 수 없습니다.");
    return;
  }

  const applyBtn = document.getElementById("applySelectedBtn");
  const originalText = applyBtn ? applyBtn.innerHTML : "";
  if (applyBtn) {
    applyBtn.disabled = true;
    applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 적용 중...';
  }

  try {
    const finalizedLyrics =
      document.getElementById("finalizedLyrics")?.value || "";
    const finalizedStyle =
      document.getElementById("finalizedStyle")?.value || "";

    const geminiKey = window.getGeminiApiKey();
    if (!geminiKey) throw new Error("API 키가 설정되지 않았습니다.");

    const prompt = `제시된 '현재 가사'와 '현재 스타일 프롬프트'에 '선택된 개선안'들을 모두 반영하여 최종 버전을 만들어주세요.

현재 가사:
${finalizedLyrics}

현재 스타일 프롬프트:
${finalizedStyle}

선택된 개선안:
${selectedImprovements.map((s, i) => `${i + 1}. ${s}`).join("\n")}

요구사항:
1. **언어 유지 (중요)**: 가사는 반드시 한국어 중심으로 작성되어야 합니다. 기존 가사의 한국어 표현을 보존하고, 개선안을 반영할 때도 한국어 정서를 유지하세요. 절대 가사 전체를 영어로 번역하지 마세요.
2. 개선안의 핵심 내용을 가사와 스타일에 자연스럽게 녹여내세요.
3. 가사 구조([Verse], [Chorus] 등)를 유지하면서 표현을 풍부하게 하세요.
4. 스타일 프롬프트는 Suno AI에서 잘 작동하도록 압축적이고 구체적인 영어 키워드를 보강하세요.
5. 설명 없이 JSON 형식으로만 출력하세요.

출력 형식:
{
  "lyrics": "개선된 가사 전체",
  "style": "개선된 스타일 프롬프트 전체"
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
      }),
    });

    if (!response.ok) throw new Error("API 호출 실패: " + response.status);

    const data = await response.json();
    if (window.logApiUsage) window.logApiUsage("gemini");
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);

      // 이력 저장
      window.saveToRegenerationHistory(
        finalizedLyrics,
        finalizedStyle,
        "개선안 적용",
      );

      if (result.lyrics)
        document.getElementById("finalizedLyrics").value = result.lyrics;
      if (result.style)
        document.getElementById("finalizedStyle").value = result.style;

      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          "✅ 선택한 개선안이 성공적으로 반영되었습니다!",
        );
      }
    }
  } catch (error) {
    console.error("개선안 적용 오류:", error);
    alert("개선안 적용 중 오류가 발생했습니다: " + error.message);
  } finally {
    if (applyBtn) {
      applyBtn.disabled = false;
      applyBtn.innerHTML = originalText;
    }
  }
};

// 다시 생성 (Placeholders for now, linked to applySelectedImprovements logic if needed)
window.regenerateFinalizedContent = async function () {
  if (
    !confirm(
      "현재 확정된 내용을 바탕으로 다시 생성하시겠습니까?\n(현재 내용은 이력에 저장됩니다.)",
    )
  )
    return;

  // 개선안이 하나도 선택 안되어 있으면 전체를 대상으로 다시 생성하는 로직으로 유도
  const checked = document.querySelectorAll(
    ".improvement-checkbox:checked",
  ).length;
  if (checked === 0) {
    window.selectAllImprovements();
  }
  await window.applySelectedImprovements();
};

// 이력 관리 관련
window.saveToRegenerationHistory = function (lyrics, style, type) {
  if (!window.currentProject || !window.currentProject.data) return;

  if (!window.currentProject.data.regenerationHistory) {
    window.currentProject.data.regenerationHistory = [];
  }

  window.currentProject.data.regenerationHistory.unshift({
    timestamp: new Date().toISOString(),
    lyrics: lyrics,
    style: style,
    type: type || "자동 저장",
  });

  // 최대 10개까지만 유지
  if (window.currentProject.data.regenerationHistory.length > 10) {
    window.currentProject.data.regenerationHistory.pop();
  }
};

window.showRegenerationHistory = function () {
  const history = window.currentProject?.data?.regenerationHistory || [];
  if (history.length === 0) {
    alert("이전 생성 이력이 없습니다.");
    return;
  }

  const historyModal = document.getElementById("historyModal");
  if (!historyModal) {
    // 모달이 없으면 간단히 얼럿으로 표시하거나 모달 동적 생성 필요
    // 여기서는 index.html에 모달이 있다고 가정하고 구현
    console.warn("historyModal 요소를 찾을 수 없습니다.");
    alert("이력 기능을 위한 모달 UI가 준비되지 않았습니다. (개발 중)");
    return;
  }

  const container = document.getElementById("historyItemsContainer");
  if (container) {
    container.innerHTML = history
      .map(
        (item, idx) => `
            <div class="history-item" style="padding: 15px; border-bottom: 1px solid var(--border); cursor: pointer;" onclick="window.restoreFromHistory(${idx})">
                <div style="font-weight: 600; margin-bottom: 5px;">#${history.length - idx} [${item.type}]</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(item.timestamp).toLocaleString()}</div>
                <div style="font-size: 0.85rem; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${item.lyrics.substring(0, 50)}...
                </div>
            </div>
        `,
      )
      .join("");
  }

  // 부트스트랩 모달인 경우
  if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
    const modal = new bootstrap.Modal(historyModal);
    modal.show();
  } else {
    historyModal.style.display = "block";
  }
};

window.restoreFromHistory = function (index) {
  const history = window.currentProject?.data?.regenerationHistory || [];
  const item = history[index];
  if (!item) return;

  if (
    !confirm("이 버전으로 복구하시겠습니까? (현재 내용은 이력에 추가됩니다.)")
  )
    return;

  const currentLyrics = document.getElementById("finalizedLyrics").value;
  const currentStyle = document.getElementById("finalizedStyle").value;
  window.saveToRegenerationHistory(currentLyrics, currentStyle, "복구 전 저장");

  document.getElementById("finalizedLyrics").value = item.lyrics;
  document.getElementById("finalizedStyle").value = item.style;

  // 모달 닫기
  const historyModal = document.getElementById("historyModal");
  if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
    const modal = bootstrap.Modal.getInstance(historyModal);
    if (modal) modal.hide();
  } else {
    historyModal.style.display = "none";
  }

  if (typeof window.showCopyIndicator === "function") {
    window.showCopyIndicator("✅ 선택한 이력 버전으로 복구되었습니다.");
  }
};
