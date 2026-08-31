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

// 4단계 완료 배너 표시 함수
function showStep4CompleteBanner(message, type) {
  // 기존 배너 제거
  const existing = document.getElementById('step4CompleteBanner');
  if (existing) existing.remove();

  const isSuccess = type !== 'error';
  const banner = document.createElement('div');
  banner.id = 'step4CompleteBanner';
  banner.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99999;
    background: ${isSuccess ? 'linear-gradient(135deg, #1a472a, #2d6a4f)' : 'linear-gradient(135deg, #7b1e1e, #c0392b)'};
    color: #fff;
    padding: 16px 28px;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    border: 1px solid ${isSuccess ? '#52b788' : '#e74c3c'};
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideDown 0.3s ease;
    max-width: 90vw;
    text-align: center;
  `;
  banner.innerHTML = `
    <span style="font-size:1.4rem">${isSuccess ? '✅' : '❌'}</span>
    <span>${escapeHtml(message)}</span>
    <button onclick="this.parentElement.remove()" style="
      background: rgba(255,255,255,0.2);
      border: none;
      color: #fff;
      border-radius: 6px;
      padding: 4px 10px;
      cursor: pointer;
      font-size: 0.85rem;
      margin-left: 8px;
    ">닫기</button>
  `;

  // 슬라이드 애니메이션 추가
  if (!document.getElementById('step4BannerStyle')) {
    const style = document.createElement('style');
    style.id = 'step4BannerStyle';
    style.textContent = '@keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }';
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);

  // 5초 후 자동 제거
  setTimeout(() => { if (banner.parentElement) banner.remove(); }, 5000);
}

function getProductionGuidelinesText() {
  return (
    localStorage.getItem("musicCreatorGuidelines") ||
    localStorage.getItem("musicCreator_guidelines") ||
    ""
  ).trim();
}

function getPlainLyricsForGuidelineCheck(lyrics) {
  return String(lyrics || "")
    .split(/\n+/)
    .filter((line) => !/^\s*\[[^\]]+\]\s*$/.test(line.trim()))
    .join("\n")
    .trim();
}

function getEnglishWordRatio(lyrics) {
  const plainLyrics = getPlainLyricsForGuidelineCheck(lyrics);
  const words = plainLyrics.match(/[A-Za-z가-힣]+/g) || [];
  if (!words.length) return 0;
  const englishWords = words.filter((word) => /[A-Za-z]/.test(word));
  return englishWords.length / words.length;
}

function getGuidelineComplianceIssues(lyrics, style) {
  const issues = [];
  const plainLyrics = getPlainLyricsForGuidelineCheck(lyrics);
  const englishRatio = getEnglishWordRatio(lyrics);

  if (englishRatio > 0.32) {
    issues.push(`영어 표현 비율 높음 ${Math.round(englishRatio * 100)}%`);
  }
  if (!/\[[^\]]+\]/.test(String(lyrics || ""))) {
    issues.push("Suno 지시어 없음");
  }
  if (/\((?:[^)]{1,80})\)/.test(String(lyrics || ""))) {
    issues.push("가사 본문 괄호 표현 확인");
  }
  if (/\b(?:he|she|boy|girl|man|woman)\b/i.test(plainLyrics)) {
    issues.push("성별 시점 영어 표현 확인");
  }
  if (!String(style || "").trim()) {
    issues.push("스타일 프롬프트 없음");
  }

  return { issues, englishRatio };
}

function renderGuidelineComplianceStatus(lyrics, style, sourceLabel = "최종 가사") {
  const statusEl = document.getElementById("finalLyricsStatus");
  if (!statusEl) return;

  const guidelines = getProductionGuidelinesText();
  const { issues, englishRatio } = getGuidelineComplianceIssues(lyrics, style);
  const hasIssues = issues.length > 0;

  statusEl.classList.remove("hidden");
  statusEl.style.display = "block";
  statusEl.style.border = hasIssues
    ? "1px solid rgba(251, 191, 36, 0.45)"
    : "1px solid rgba(52, 211, 153, 0.35)";
  statusEl.style.color = hasIssues ? "#fbbf24" : "#34d399";
  statusEl.innerHTML = `
    <strong>${hasIssues ? "⚠️ 지침서 확인 필요" : "✅ 지침서 기본 점검 통과"}</strong>
    <div style="margin-top:6px;color:var(--text-secondary);line-height:1.55;">
      ${guidelines ? "제작 지침서가 적용된 상태입니다." : "저장된 제작 지침서가 없어 기본 점검만 수행했습니다."}
      ${sourceLabel ? ` (${escapeHtml(sourceLabel)})` : ""}
      <br>영어 표현 비율: ${Math.round(englishRatio * 100)}%
      ${hasIssues ? `<br>확인 항목: ${issues.map(escapeHtml).join(" / ")}` : ""}
    </div>
  `;
}

async function callGuidelineEnforcementAI(prompt) {
  const geminiKey = window.getGeminiApiKey ? window.getGeminiApiKey() : "";
  if (geminiKey && geminiKey.startsWith("AIza")) {
    try {
      // callGeminiWithAutoRoute: 실제 키는 직접 호출, 프록시 인증은 /api/gemini 사용
      const geminiText = await (window.callGeminiWithAutoRoute || callGeminiWithAutoRoute)(
        prompt,
        { temperature: 0.55, topK: 40, topP: 0.9, maxOutputTokens: 5000 },
        geminiKey,
      );
      if (window.logApiUsage) window.logApiUsage("gemini");
      return geminiText;
    } catch (geminiError) {
      if (typeof window.handleGeminiApiFailure === "function") {
        window.handleGeminiApiFailure(geminiError);
      }
      console.warn(
        "⚠️ Gemini 지침서 검수 실패, ChatGPT로 전환하여 재시도합니다:",
        geminiError.message,
      );
    }
  }

  const openaiKey = window.getOpenAIApiKey ? window.getOpenAIApiKey() : "";
  if (!openaiKey || !openaiKey.startsWith("sk-")) {
    throw new Error("지침서 자동 검수에 사용할 AI API 키가 없습니다.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: (window.getOpenAIModel ? window.getOpenAIModel() : "gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content:
            "You are a Korean Suno lyric editor. Return only valid JSON matching the requested schema.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.55,
      max_tokens: 3500,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) throw new Error("OpenAI 지침서 검수 실패: " + response.status);
  const data = await response.json();
  if (window.logApiUsage) window.logApiUsage("openai");
  return data.choices?.[0]?.message?.content || "";
}

async function callExtractedLyricsInstructionAI(prompt) {
  const geminiKey = window.getGeminiApiKey ? window.getGeminiApiKey() : "";
  if (geminiKey && geminiKey.startsWith("AIza")) {
    try {
      // callGeminiWithAutoRoute: 실제 키는 직접 호출, 프록시 인증은 /api/gemini 사용
      const geminiText2 = await (window.callGeminiWithAutoRoute || callGeminiWithAutoRoute)(
        prompt,
        { temperature: 0.7, maxOutputTokens: 8000 },
        geminiKey,
      );
      if (window.logApiUsage) window.logApiUsage("gemini");
      return geminiText2;
    } catch (geminiError) {
      if (typeof window.handleGeminiApiFailure === "function") {
        window.handleGeminiApiFailure(geminiError);
      }
      console.warn(
        "⚠️ Gemini 추출 가사 지시어 생성 실패, ChatGPT로 전환하여 재시도합니다:",
        geminiError.message,
      );
    }
  }

  const openaiKey = window.getOpenAIApiKey ? window.getOpenAIApiKey() : "";
  if (!openaiKey || !openaiKey.startsWith("sk-")) {
    throw new Error("추출 가사 지시어 생성에 사용할 AI API 키가 없습니다.");
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: (window.getOpenAIModel ? window.getOpenAIModel() : "gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content:
            "You are a Korean Suno lyric editor. Return only the final lyrics text without markdown.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });
  if (!response.ok) throw new Error("OpenAI 추출 가사 지시어 생성 실패: " + response.status);
  const data = await response.json();
  if (window.logApiUsage) window.logApiUsage("openai");
  return data.choices?.[0]?.message?.content || "";
}

async function enforceGuidelinesOnFinalContent(lyrics, style, contextLabel = "최종 가사") {
  const guidelines = getProductionGuidelinesText();
  const localCheck = getGuidelineComplianceIssues(lyrics, style);
  if (!guidelines) {
    return { lyrics, style, compliance: "no-guidelines", issues: localCheck.issues };
  }

  const prompt = `다음 최종 Suno용 가사와 스타일 프롬프트를 뮤직모리 제작 지침서 기준으로 검수하고 필요하면 수정하세요.

=== 제작 지침서 - 반드시 준수 ===
${guidelines}

=== 현재 최종 가사 ===
${lyrics}

=== 현재 스타일 프롬프트 ===
${style || "없음"}

=== 강제 검수 규칙 ===
1. 가사는 한글 중심이어야 합니다.
2. 영어는 후렴, 강조, 반복 훅 등 보조 표현으로만 사용하고 전체 가사 단어 기준 약 20~30% 이내로 제한하세요.
3. 기존 가사의 핵심 의미, 감정, 서사, 섹션 구조는 보존하세요.
4. 제작 지침서의 금지어, 제목 형식, 성별 시점, Suno 지시어 표기 방식을 모두 우선 적용하세요.
5. 한 줄에는 하나의 Suno 지시어만 두고, 지시어와 가사는 줄바꿈으로 분리하세요.
6. 곡 제목은 가사 본문에 넣지 마세요.
7. 스타일 프롬프트는 Suno 스타일란에 맞는 영어 키워드 형식으로 유지하되 지침서와 가사 분위기에 맞게 보정하세요.

출력은 반드시 JSON 하나만 반환하세요.
{
  "lyrics": "지침서 준수 상태로 보정된 최종 가사",
  "style": "지침서 준수 상태로 보정된 스타일 프롬프트",
  "compliance": "pass 또는 corrected",
  "issues": ["수정 또는 확인한 항목"]
}`;

  try {
    const aiResponse = await callGuidelineEnforcementAI(prompt);
    const jsonMatch = String(aiResponse || "").match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("지침서 검수 AI 응답 JSON을 찾을 수 없습니다.");
    const result = JSON.parse(jsonMatch[0]);
    return {
      lyrics: result.lyrics || lyrics,
      style: result.style || style,
      compliance: result.compliance || "checked",
      issues: Array.isArray(result.issues) ? result.issues : localCheck.issues,
    };
  } catch (error) {
    console.warn("⚠️ 지침서 자동 검수 실패, 로컬 점검 결과만 반영:", error);
    return {
      lyrics,
      style,
      compliance: "local-check-only",
      issues: localCheck.issues.concat(`AI 검수 실패: ${error.message}`),
    };
  }
}

window.getGuidelineComplianceIssues = getGuidelineComplianceIssues;
window.renderGuidelineComplianceStatus = renderGuidelineComplianceStatus;
window.enforceGuidelinesOnFinalContent = enforceGuidelinesOnFinalContent;

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

    // ── 단일 소스 전략 ──────────────────────────────────────────
    // feedbacks에 suggestion이 있으면 feedbacks만 사용 (카테고리+제안, 더 구조적)
    // feedbacks가 없거나 suggestion이 없으면 improvements 사용 (단순 텍스트)
    // → 두 배열을 동시에 표시하지 않아 의미상 중복을 원천 차단합니다.
    // ─────────────────────────────────────────────────────────────

    const feedbacksWithSuggestion = feedbacks.filter(
      (f) => f && f.suggestion && f.suggestion.trim(),
    );
    const useFeedbacks = feedbacksWithSuggestion.length > 0;

    if (useFeedbacks) {
      // feedbacks 소스: 카테고리 제목 + 제안 내용 형식
      feedbacksWithSuggestion.forEach((feedback, index) => {
        const feedbackId = `feedback_${itemIndex}`;
        const category = escapeHtml(feedback.category || "제안");
        const suggestion = escapeHtml(feedback.suggestion);

        html += `
                    <div class="improvement-item" onclick="const cb = this.querySelector('.improvement-checkbox'); cb.checked = !cb.checked; window.updateSelectedCount();">
                        <input type="checkbox" id="${feedbackId}" class="improvement-checkbox" data-type="feedback" data-index="${index}" onclick="event.stopPropagation();" onchange="window.updateSelectedCount();">
                        <label for="${feedbackId}" onclick="event.stopPropagation();">
                            <div style="color: var(--text-primary); font-weight: 600; margin-bottom: 5px; word-wrap: break-word; overflow-wrap: break-word;">${category}</div>
                            <div style="color: var(--text-secondary); line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word;">${suggestion}</div>
                        </label>
                    </div>
                `;
        itemIndex++;
      });
    } else {
      // improvements 소스: 단순 텍스트 형식 (fallback)
      improvements.forEach((improvement, index) => {
        let improvementText = "";
        if (typeof improvement === "string") {
          improvementText = improvement;
        } else if (typeof improvement === "object" && improvement !== null) {
          improvementText =
            improvement.text ||
            improvement.content ||
            improvement.suggestion ||
            JSON.stringify(improvement);
        } else {
          improvementText = String(improvement);
        }

        if (!improvementText || !improvementText.trim()) return;

        const improvementId = `improvement_${itemIndex}`;
        html += `
                    <div class="improvement-item" onclick="const cb = this.querySelector('.improvement-checkbox'); cb.checked = !cb.checked; window.updateSelectedCount();">
                        <input type="checkbox" id="${improvementId}" class="improvement-checkbox" data-index="${index}" data-type="improvement" onclick="event.stopPropagation();" onchange="window.updateSelectedCount();">
                        <label for="${improvementId}" onclick="event.stopPropagation();">
                            ${escapeHtml(improvementText)}
                        </label>
                    </div>
                `;
        itemIndex++;
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

    const sourceType = useFeedbacks ? "feedbacks" : "improvements";
    console.log(
      `✅ 개선안 표시 완료 [소스: ${sourceType}]: 총 ${itemIndex}개 항목 표시`,
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
    renderGuidelineComplianceStatus(
      finalizedLyrics,
      finalizedStyle,
      "4단계 확정 후 5단계 전달",
    );

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

    const success = await window.applySelectedImprovements();
    if (success) {
      console.log("✅ 전체 개선안 적용 완료");
      showStep4CompleteBanner(`🎉 전체 ${checkboxes.length}개 개선안이 가사와 스타일 프롬프트에 반영되었습니다!`);
    } else {
      console.error("❌ 전체 개선안 적용 실패");
    }
  } catch (error) {
    console.error("❌ 전체 개선안 적용 오류:", error);
    showStep4CompleteBanner('전체 개선안 적용 중 오류가 발생했습니다: ' + error.message, 'error');
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
      const currentStyle =
        document.getElementById("finalizedStyle")?.value ||
        document.getElementById("finalStyle")?.textContent ||
        "";
      // 5단계 div (finalLyrics)
      if (finalLyricsEl) {
        finalLyricsEl.textContent = text;
        finalLyricsEl.style.whiteSpace = 'pre-wrap';
        finalLyricsEl.style.maxHeight = 'none';  // 높이 제한 해제
        finalLyricsEl.style.overflow = 'visible';
      }
      // 4단계 textarea (finalizedLyrics)
      if (finalizedLyricsEl) {
        finalizedLyricsEl.value = text;
        finalizedLyricsEl.readOnly = false;
        // 내용 길이에 따라 textarea 높이 자동 확장
        finalizedLyricsEl.style.height = 'auto';
        finalizedLyricsEl.style.height = Math.max(200, finalizedLyricsEl.scrollHeight + 20) + 'px';
        finalizedLyricsEl.style.maxHeight = 'none';
        finalizedLyricsEl.style.overflow = 'visible';
      }
      renderGuidelineComplianceStatus(text, currentStyle, "추출 가사 반영");
      if (window.currentProject) {
        if (!window.currentProject.data) window.currentProject.data = {};
        window.currentProject.data.finalLyrics = text;
        window.currentProject.data.finalizedLyrics = text;
        window.currentProject.data.finalStyle = currentStyle;
        window.currentProject.data.finalizedStyle = currentStyle;
        if (window.intermediateAudioAnalysis) {
          window.currentProject.data.intermediateAudioAnalysis =
            window.intermediateAudioAnalysis;
        }
      }
      if (typeof window.requestFinalEvaluationRefresh === "function") {
        window.requestFinalEvaluationRefresh("extracted-lyrics-applied", {
          message:
            "추출 가사가 반영되었습니다. 음원 분석 결과까지 포함해 평가 점수를 다시 계산 중입니다...",
        });
      }
    };

    const geminiKey = window.getGeminiApiKey ? window.getGeminiApiKey() : "";
    const openaiKey = window.getOpenAIApiKey ? window.getOpenAIApiKey() : "";
    if (
      (!geminiKey || !geminiKey.startsWith("AIza")) &&
      (!openaiKey || !openaiKey.startsWith("sk-"))
    ) {
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
    const aiPrompt = `다음은 음원에서 추출된 순수 가사 원본입니다. 뮤직모리 제작 지침서와 Suno AI 가창 인식 최적화 가이드라인을 참조하여, 5단계 최종 가사(Suno용)에 적합하게 각 절마다 적절한 Suno 지시어를 세밀하게 작성해 적용해 주세요.

=== 뮤직모리 제작 지침서 (반드시 참고) ===
${guidelines ? guidelines.substring(0, 2500) : "기본 지침서: [Intro], [Verse], [Chorus] 등의 구조와 [Tempo: ], [Vocal: ] 등의 스타일 지시어를 활용하세요."}

=== 추출된 가사 원본 ===
${extractedLyrics}

=== Suno AI 인식 최적화 세부 지침 (반드시 철저히 준수) ===
1. **구조적 대괄호 지시어 세밀화**:
   - 가사의 감정 변화와 멜로디 전개 흐름을 세분화하여, 명확한 영문 대괄호 지시어([Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Guitar Solo], [Chorus], [Outro] 등)를 단독 줄로 추가하세요.
2. **보컬 및 악기 세부 지시어 삽입 (인식률 극대화 핵심)**:
   - 각 노래 절(Section)이 시작되는 바로 위 줄에 보컬의 창법 지시어(예: [Male Vocal], [Female Vocal], [Soft Singing], [Whispering], [Melancholic Vocals], [Powerful Chorus], [Spoken Word], [Rap])를 세밀하게 기입하여 가창 방식의 변화를 유도하세요.
   - 간주나 섹션 전개부에는 연주 및 효과 지시어(예: [Acoustic Guitar Intro], [Drum Roll], [Bass Drop], [Synthesizer Break], [Beat Drop], [Silence])를 추가하여 Suno가 정밀하게 사운드를 연출하도록 하세요.
3. **가사와 지시어의 철저한 분리**:
   - 대괄호 지시어는 무조건 한 줄에 하나씩만 단독 배치하고 가사는 다음 줄에 적어주세요. 절대 지시어와 가사를 같은 줄에 이어서 표기하지 마세요.
   - 대괄호 [ ] 내부에는 절대 한글을 사용하지 않고, 오직 영어로만 작성해 주세요. (예: [후렴] 대신 [Chorus] 사용)
4. **발음 노이즈 제거**:
   - 소괄호 ( )는 Suno에서 발음 기호나 코러스용 노이즈로 인식되어 오작동할 수 있으니 절대 사용하지 말고, 가창을 조율하는 모든 기호는 대괄호 [ ]만 사용하세요.
5. **텍스트 포맷 제약**:
   - 곡 제목(Title)은 가사 본문에 포함시키지 말고, 첫 번째 지시어(예: [Intro] 또는 [Verse 1])부터 곧바로 가사 본문이 시작되도록 구성하세요.
   - 마크다운 백틱(\`\`\`)이나 부연 설명(예: "제안해 드립니다")은 일절 제외하고, 오직 Suno에 바로 복사하여 가사란에 입력할 텍스트 결과물만 출력하세요.`;

    try {
      let aiResponse = await callExtractedLyricsInstructionAI(aiPrompt);

      if (aiResponse) {
        // 불필요한 마크다운 백틱 및 공백 제거
        aiResponse = aiResponse
          .replace(/^\`\`\`(text|lyrics)?\n|\n\`\`\`$/gm, "")
          .trim();
        const currentStyle =
          document.getElementById("finalizedStyle")?.value ||
          document.getElementById("finalStyle")?.textContent ||
          "";
        const enforcedResult = await enforceGuidelinesOnFinalContent(
          aiResponse,
          currentStyle,
          "추출 가사 지침서 보정",
        );
        applyPlainText(enforcedResult.lyrics || aiResponse);
        if (enforcedResult.style && document.getElementById("finalizedStyle")) {
          document.getElementById("finalizedStyle").value = enforcedResult.style;
        }

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

// 선택된 개선안 개수 업데이트 및 시각적 피드백 처리
window.updateSelectedCount = function () {
  const checkboxes = document.querySelectorAll(".improvement-checkbox");
  let checkedCount = 0;

  checkboxes.forEach((cb) => {
    const parent = cb.closest(".improvement-item");
    if (cb.checked) {
      checkedCount++;
      if (parent) parent.classList.add("selected");
    } else {
      if (parent) parent.classList.remove("selected");
    }
  });

  const countEl = document.getElementById("selectedImprovementCount");
  if (countEl) {
    countEl.textContent = checkedCount;
  }

  // 개수에 따라 적용 버튼 활성화/비활성화
  const applyBtn = document.getElementById("applySelectedBtn");
  if (applyBtn) {
    applyBtn.disabled = checkedCount === 0;
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
    const guidelines = getProductionGuidelinesText();

    const geminiKey = window.getGeminiApiKey ? window.getGeminiApiKey() : "";

    const prompt = `제시된 '현재 가사'와 '현재 스타일 프롬프트'에 '선택된 개선안'들을 모두 반영하여 최종 버전을 만들어주세요.

현재 가사:
${finalizedLyrics}

현재 스타일 프롬프트:
${finalizedStyle}

선택된 개선안:
${selectedImprovements.map((s, i) => `${i + 1}. ${s}`).join("\n")}

${guidelines ? `제작 지침서 - 반드시 최우선 준수:
${guidelines}

` : ""}
요구사항:
1. **제작 지침서 최우선 준수**: 지침서가 제공된 경우 금지어, 구조, 말투, 제목 형식, 영어 사용 방식, 성별 시점 규칙을 반드시 지키세요.
2. **언어 유지 (중요)**: 가사는 반드시 한국어 중심으로 작성되어야 합니다. 기존 가사의 한국어 표현을 보존하고, 개선안을 반영할 때도 한국어 정서를 유지하세요. 절대 가사 전체를 영어로 번역하지 마세요.
3. 영어 표현은 지침서 기준에 맞게 후렴, 강조, 반복 훅 등 보조 용도로만 제한하고 전체 가사 단어 기준 약 20~30% 이내로 유지하세요.
4. 곡 제목은 가사 본문에 넣지 마세요.
5. 한 줄에는 하나의 Suno 지시어만 두고, 지시어와 가사는 줄바꿈으로 분리하세요.
6. 개선안의 핵심 내용을 가사와 스타일에 자연스럽게 녹여내세요.
7. 가사 구조([Verse], [Chorus] 등)를 유지하면서 표현을 풍부하게 하세요.
8. 스타일 프롬프트는 Suno AI에서 잘 작동하도록 압축적이고 구체적인 영어 키워드를 보강하세요.
9. 설명 없이 JSON 형식으로만 출력하세요.

출력 형식:
{
  "lyrics": "개선된 가사 전체",
  "style": "개선된 스타일 프롬프트 전체"
}`;

    let aiResponse = "";
    try {
      // callGeminiWithAutoRoute: 실제 키는 직접 호출, 프록시 인증은 /api/gemini 사용
      aiResponse = await (window.callGeminiWithAutoRoute || callGeminiWithAutoRoute)(
        prompt,
        { temperature: 0.7, maxOutputTokens: 2000 },
        geminiKey,
      );
      if (window.logApiUsage) window.logApiUsage("gemini");
    } catch (geminiError) {
      if (typeof window.handleGeminiApiFailure === "function") {
        window.handleGeminiApiFailure(geminiError);
      }
      console.warn("⚠️ Gemini 개선안 적용 실패, ChatGPT로 전환하여 재시도합니다:", geminiError.message);
      const openaiKey = window.getOpenAIApiKey ? window.getOpenAIApiKey() : "";
      if (!openaiKey) {
        throw new Error(`Gemini 개선안 적용 실패 (${geminiError.message}) 후 ChatGPT 폴백을 시도했으나 OpenAI API 키가 없습니다.`);
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
            { role: "system", content: "You are an AI songwriter that strictly responds with valid JSON matching the requested format." },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
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

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      const enforcedResult = await enforceGuidelinesOnFinalContent(
        result.lyrics || finalizedLyrics,
        result.style || finalizedStyle,
        "개선안 적용 결과",
      );

      // 이력 저장
      window.saveToRegenerationHistory(
        finalizedLyrics,
        finalizedStyle,
        "개선안 적용",
      );

      const appliedCount = checkedBoxes.length;
      if (enforcedResult.lyrics)
        document.getElementById("finalizedLyrics").value = enforcedResult.lyrics;
      if (enforcedResult.style)
        document.getElementById("finalizedStyle").value = enforcedResult.style;
      renderGuidelineComplianceStatus(
        enforcedResult.lyrics,
        enforcedResult.style,
        enforcedResult.compliance === "corrected"
          ? "AI 지침서 자동 보정 완료"
          : "AI 지침서 검수 완료",
      );

      // 완료 배너 표시
      showStep4CompleteBanner(
        `✅ ${appliedCount}개 개선안과 제작 지침서 검수가 반영되었습니다!`
      );

      if (typeof window.showCopyIndicator === "function") {
        window.showCopyIndicator(
          "✅ 선택한 개선안이 성공적으로 반영되었습니다!",
        );
      }
      return true;
    }
  } catch (error) {
    console.error("개선안 적용 오류:", error);
    alert("개선안 적용 중 오류가 발생했습니다: " + error.message);
    return false;
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

  const historyModal = document.getElementById("regenerationHistoryModal");
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
            <div class="history-item" style="padding: 15px; border-bottom: 1px solid var(--border); cursor: pointer;" onclick="window.restoreFromHistory(${Number(idx)})">
                <div style="font-weight: 600; margin-bottom: 5px;">#${history.length - idx} [${escapeHtml(item.type || "")}]</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(item.timestamp).toLocaleString()}</div>
                <div style="font-size: 0.85rem; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(String(item.lyrics || "").substring(0, 50))}...
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
  const historyModal = document.getElementById("regenerationHistoryModal");
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
