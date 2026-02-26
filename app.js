// ═══════════════════════════════════════════════════════════════
// 2단계 수노용 가사 textarea 세로 자동 조절 (가사 길이에 맞춤)
// ═══════════════════════════════════════════════════════════════
window.autoResizeTextarea = function(ta) {
    if (!ta || !ta.nodeName || ta.nodeName !== 'TEXTAREA') return;
    var minH = 120;
    var maxH = Math.min(2400, (window.innerHeight || 600) * 0.85);
    ta.style.overflowY = 'hidden';
    ta.style.height = '0px';
    var sh = ta.scrollHeight;
    var h = Math.max(minH, Math.min(maxH, sh));
    ta.style.height = h + 'px';
    ta.style.overflowY = sh > maxH ? 'auto' : 'hidden';
};

// ═══════════════════════════════════════════════════════════════
// 가사에서 지시어 제거 (순수 가사만 추출)
// ═══════════════════════════════════════════════════════════════
function extractLyricsOnly(lyrics) {
    if (!lyrics) return '';
    
    const lines = lyrics.split('\n');
    const lyricsOnly = [];
    
    lines.forEach((line) => {
        const trimmed = line.trim();
        
        // 빈 줄은 그대로 유지
        if (!trimmed) {
            if (lyricsOnly.length > 0 && lyricsOnly[lyricsOnly.length - 1] !== '') {
                lyricsOnly.push('');
            }
            return;
        }
        
        // [ ] 형식으로 시작하고 끝나는 줄은 지시어로 간주하여 제외
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            return; // 지시어 제외
        }
        
        // 실제 가사 줄만 추가
        lyricsOnly.push(trimmed);
    });
    
    // 가사만 추출한 내용
    let lyricsContent = lyricsOnly.join('\n');
    
    // 연속된 빈 줄을 하나로 정리
    lyricsContent = lyricsContent.replace(/\n{3,}/g, '\n\n');
    
    // 앞뒤 공백 제거
    return lyricsContent.trim();
}

// ═══════════════════════════════════════════════════════════════
// 영어→한글 번역 (씬별 개요 필드용)
// ═══════════════════════════════════════════════════════════════
let sceneOverviewTranslationCache = {}; // 번역 캐시 (성능 향상)
// [MOVED] extraction block

// ═══════════════════════════════════════════════════════════════
// 전역 프로젝트 상태
// ═══════════════════════════════════════════════════════════════
window.currentProject = null;
window.currentProjectId = null;
window.editMode = false;  // 수정 모드 상태 (false = 읽기 전용, true = 수정 가능)
// [MOVED] extraction block

// ═══════════════════════════════════════════════════════════════
// 단계 이동 함수
// ═══════════════════════════════════════════════════════════════
window.goToStep = function(step, saveBefore = false, skipValidation = false) {
    try {
        // 저장이 필요한 경우
        if (saveBefore && typeof window.saveCurrentProject === 'function') {
            window.saveCurrentProject();
        }
        
        // 상단 메뉴 클릭 시 읽기 전용 모드로 설정 (수정 모드 비활성화)
        // "다음 단계로" 버튼 클릭 시에는 saveBefore=true로 호출되므로 수정 모드 유지
        if (!saveBefore && window.currentProject) {
            window.editMode = false;
            if (typeof window.updateEditModeUI === 'function') {
                window.updateEditModeUI();
            }
            if (typeof window.setReadOnlyMode === 'function') {
                window.setReadOnlyMode(true);
            }
        }
        
        // 모든 패널 비활성화
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // 모든 단계 비활성화
        document.querySelectorAll('.step').forEach(stepEl => {
            stepEl.classList.remove('active');
        });
        
        // 선택한 패널 활성화
        const panel = document.getElementById('panel' + step);
        if (panel) {
            panel.classList.add('active');
            // 패널로 스크롤
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // 2단계: 수노용 가사 textarea 높이를 내용에 맞춰 자동 조절
            if (step === 2 && typeof window.autoResizeTextarea === 'function') {
                var sunoTa = document.getElementById('sunoLyrics');
                if (sunoTa && sunoTa.value) {
                    requestAnimationFrame(function() { window.autoResizeTextarea(sunoTa); });
                }
            }
        }
        
        // 선택한 단계 활성화
        const stepEl = document.querySelector('.step[data-step="' + step + '"]');
        if (stepEl) {
            stepEl.classList.add('active');
        }
        
        // 프로젝트 데이터가 있으면 해당 단계 데이터 복원
        // 단, 수정 모드일 때는 복원하지 않음 (사용자가 수정 중인 데이터를 보존)
        if (window.currentProject && window.currentProject.data && !window.editMode) {
            if (typeof window.restoreStepData === 'function') {
                window.restoreStepData(step);
            }
        }
        
        // 4단계 특별 처리: 개선안 표시
        if (step === 4) {
            const improvementCard = document.getElementById('improvementCard');
            const improvementLoading = document.getElementById('improvementLoading');
            
            if (improvementCard && improvementLoading) {
                improvementLoading.style.display = 'none';
                improvementCard.style.display = 'block';
            }
            
            // 3단계 분석 결과에서 개선안 표시
            if (window.currentProject && window.currentProject.data) {
                const analysisData = window.currentProject.data.analysis;
                if (analysisData) {
                    displayImprovements(analysisData);
                }
            }
        }
        
        // 5단계 특별 처리: 최종 평가 요약 생성 및 데이터 복원
        if (step === 5) {
            // 저장된 프로젝트 데이터가 있으면 5단계 데이터 복원 (항상 복원 시도)
            if (window.currentProject && window.currentProject.data) {
                const projectData = window.currentProject.data;
                
                // 5단계 최종 가사 복원 (우선순위: finalLyrics > finalizedLyrics)
                const lyrics5 = projectData.finalLyrics || projectData.finalizedLyrics || '';
                if (lyrics5) {
                    const finalLyricsEl = document.getElementById('finalLyrics');
                    if (finalLyricsEl) {
                        finalLyricsEl.textContent = lyrics5;
                        console.log('✅ 5단계 가사 복원 (goToStep):', lyrics5.length, '자');
                    }
                    // 중간 버전 프리뷰도 복원
                    const intermediateLyricsPreview = document.getElementById('intermediateLyricsPreview');
                    if (intermediateLyricsPreview) {
                        intermediateLyricsPreview.textContent = lyrics5;
                    }
                }
                
                // 5단계 최종 스타일 복원 (우선순위: finalStyle > finalizedStyle)
                const style5 = projectData.finalStyle || projectData.finalizedStyle || '';
                if (style5) {
                    const finalStyleEl = document.getElementById('finalStyle');
                    if (finalStyleEl) {
                        finalStyleEl.textContent = style5;
                        console.log('✅ 5단계 스타일 복원 (goToStep):', style5.length, '자');
                    }
                    // 중간 버전 프리뷰도 복원
                    const intermediateStylePreview = document.getElementById('intermediateStylePreview');
                    if (intermediateStylePreview) {
                        intermediateStylePreview.textContent = style5;
                    }
                }
                
                // 제목 복원
                const title = window.currentProject.title || projectData.title || '';
                if (title) {
                    const finalTitleTextEl = document.getElementById('finalTitleText');
                    if (finalTitleTextEl) {
                        finalTitleTextEl.textContent = title;
                    }
                }
                
                // 최종 평가 점수·등급·프로그레스 바 복원
                if (projectData.beforeScore !== undefined || projectData.afterScore !== undefined) {
                    const before = projectData.beforeScore !== undefined ? projectData.beforeScore : 0;
                    const after = projectData.afterScore !== undefined ? projectData.afterScore : before;
                    if (typeof window.updateFinalEvaluationUI === 'function') {
                        window.updateFinalEvaluationUI(before, after, projectData.aiComment != null ? projectData.aiComment : undefined);
                    } else {
                        const beforeScoreEl = document.getElementById('beforeScore');
                        const afterScoreEl = document.getElementById('afterScore');
                        const aiCommentEl = document.getElementById('aiComment');
                        if (beforeScoreEl && !beforeScoreEl.textContent) beforeScoreEl.textContent = before;
                        if (afterScoreEl && !afterScoreEl.textContent) afterScoreEl.textContent = after;
                        if (projectData.aiComment && aiCommentEl && !aiCommentEl.textContent) aiCommentEl.textContent = projectData.aiComment;
                    }
                } else if (projectData.aiComment) {
                    const aiCommentEl = document.getElementById('aiComment');
                    if (aiCommentEl && !aiCommentEl.textContent) aiCommentEl.textContent = projectData.aiComment;
                }
            }
            
            // 최종 평가 요약 자동 생성 (데이터가 있는 경우)
            if (typeof window.generateFinalEvaluation === 'function') {
                setTimeout(() => {
                    window.generateFinalEvaluation();
                }, 500);
            }
        }
        
        // 6단계 특별 처리: 마케팅 자료 표시 또는 생성
        if (step === 6) {
            const marketingResult = document.getElementById('marketingResult');
            const marketingLoading = document.getElementById('marketingLoading');
            
            if (marketingResult && marketingLoading) {
                // 저장된 마케팅 자료가 있으면 표시
                if (window.currentProject && window.currentProject.data && window.currentProject.data.marketing) {
                    const marketing = window.currentProject.data.marketing;
                    
                    // 마케팅 자료 표시
                    if (marketing.youtubeDesc) {
                        const youtubeDescEl = document.getElementById('youtubeDesc');
                        if (youtubeDescEl) youtubeDescEl.textContent = marketing.youtubeDesc;
                    }
                    
                    if (marketing.tiktokDesc) {
                        const tiktokDescEl = document.getElementById('tiktokDesc');
                        if (tiktokDescEl) tiktokDescEl.textContent = marketing.tiktokDesc;
                    }
                    
                    if (marketing.hashtags) {
                        const hashtagsEl = document.getElementById('hashtagsContent');
                        if (hashtagsEl) hashtagsEl.textContent = marketing.hashtags;
                    }
                    
                    // 썸네일 문구 표시
                    if (marketing.thumbnails && Array.isArray(marketing.thumbnails) && marketing.thumbnails.length > 0) {
                        const thumbnailsGridEl = document.getElementById('thumbnailsGrid');
                        if (thumbnailsGridEl) {
                            let thumbnailsHtml = '';
                            marketing.thumbnails.forEach((thumb, index) => {
                                const thumbnailText = typeof thumb === 'string' ? thumb : (thumb.text || thumb.content || String(thumb));
                                thumbnailsHtml += `
                                    <div class="thumbnail-item" style="padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s;" 
                                         onclick="if(typeof window.copyToClipboard === 'function') { window.copyToClipboard(null, '${escapeHtml(thumbnailText).replace(/'/g, "\\'")}', event); }">
                                        <div style="font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">${escapeHtml(thumbnailText)}</div>
                                        <button class="btn btn-small btn-success" onclick="event.stopPropagation(); if(typeof window.copyToClipboard === 'function') { window.copyToClipboard(null, '${escapeHtml(thumbnailText).replace(/'/g, "\\'")}', event); }">
                                            <i class="fas fa-copy"></i> 복사
                                        </button>
                                    </div>
                                `;
                            });
                            thumbnailsGridEl.innerHTML = thumbnailsHtml;
                        }
                    }
                    
                    marketingLoading.style.display = 'none';
                    marketingResult.style.display = 'block';
                    console.log('✅ 저장된 마케팅 자료 표시 완료');
                } else {
                    // 저장된 자료가 없으면 자동 생성
                    if (typeof window.generateMarketingMaterials === 'function') {
                        setTimeout(() => {
                            window.generateMarketingMaterials();
                        }, 500);
                    } else {
                        // 생성 함수가 없으면 로딩 화면 유지
                        console.warn('⚠️ 마케팅 자료 생성 함수를 찾을 수 없습니다.');
                    }
                }
            }
        }
        
        // 3단계 특별 처리: 저장된 분석 결과가 있으면 로딩 숨기고 결과 표시 (불러오기 시 정지 현상 방지)
        if (step === 3) {
            const analysisLoading = document.getElementById('analysisLoading');
            const analysisError = document.getElementById('analysisError');
            const analysisResult = document.getElementById('analysisResult');
            
            const analysisTargetLyrics = document.getElementById('analysisTargetLyrics');
            const analysisTargetStyle = document.getElementById('analysisTargetStyle');
            const hasTargetData = analysisTargetLyrics && analysisTargetLyrics.textContent.trim() && 
                analysisTargetStyle && analysisTargetStyle.textContent.trim();
            
            // 저장된 분석 데이터가 있으면 무조건 결과 영역 표시 (로딩 메시지 정지 방지)
            const projectData = window.currentProject && window.currentProject.data ? window.currentProject.data : null;
            const analysisData = projectData && projectData.analysis ? projectData.analysis : {};
            const hasSavedAnalysis = !!(analysisData.scores || analysisData.feedbacks || analysisData.improvements || 
                analysisData.raw || (projectData && (projectData.analysisScores || projectData.feedbacks)));
            
            if (hasSavedAnalysis || hasTargetData) {
                if (analysisLoading) analysisLoading.style.display = 'none';
                if (analysisError) analysisError.style.display = 'none';
                if (analysisResult) {
                    analysisResult.style.display = 'block';
                    console.log('✅ 3단계 분석 결과 영역 표시 완료');
                }
            } else {
                if (analysisLoading) analysisLoading.style.display = 'block';
                if (analysisError) analysisError.style.display = 'none';
                if (analysisResult) analysisResult.style.display = 'none';
            }
        }
        
        if (typeof window.updateStepProgress === 'function') {
            window.updateStepProgress();
        }
        console.log('✅ 단계 이동:', step);
    } catch (error) {
        console.error('단계 이동 오류:', error);
    }
};

// ═══════════════════════════════════════════════════════════════
// 수정 모드 토글 함수
// ═══════════════════════════════════════════════════════════════
window.toggleEditMode = function() {
    try {
        window.editMode = !window.editMode;
        if (typeof window.updateEditModeUI === 'function') {
            window.updateEditModeUI();
        }
        if (typeof window.setReadOnlyMode === 'function') {
            window.setReadOnlyMode(!window.editMode);
        }
        
        const modeText = window.editMode ? '수정 모드 활성화' : '읽기 전용 모드 활성화';
        console.log('✅', modeText);
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(window.editMode ? '✏️ 수정 모드가 활성화되었습니다' : '👁️ 읽기 전용 모드가 활성화되었습니다');
        }
    } catch (error) {
        console.error('수정 모드 토글 오류:', error);
    }
};

// ═══════════════════════════════════════════════════════════════
// 수정 모드 UI 업데이트
// ═══════════════════════════════════════════════════════════════
window.updateEditModeUI = function() {
    const editBtn = document.getElementById('editModeToggleBtn');
    const editText = document.getElementById('editModeToggleText');
    
    if (editBtn && editText) {
        if (window.editMode) {
            editBtn.classList.add('active');
            editBtn.style.background = 'var(--accent)';
            editText.textContent = '수정 중';
        } else {
            editBtn.classList.remove('active');
            editBtn.style.background = '';
            editText.textContent = '수정';
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// 읽기 전용 모드 설정
// ═══════════════════════════════════════════════════════════════
window.setReadOnlyMode = function(readonly) {
    try {
        // 모든 input, textarea 요소 찾기
        const inputs = document.querySelectorAll('input[type="text"], textarea, select');
        
        inputs.forEach(input => {
            // 특정 요소는 제외 (검색, 정렬 등)
            const id = input.id || '';
            const excludeIds = ['projectSearch', 'projectSort', 'importFile', 'backupFileInput', 'intermediateAudioFileInput', 'mvAudioFileInput', 'mvCustomSettings'];
            // MV 인물 외모/스타일, 기타 항목은 항상 수정 가능
            if (excludeIds.some(excludeId => id.includes(excludeId))) {
                return;
            }
            if (id.indexOf('mvCharacter') === 0 && id.indexOf('_appearance') !== -1) {
                return;
            }

            // readonly 속성 설정
            if (readonly) {
                input.setAttribute('readonly', 'readonly');
                input.style.cursor = 'not-allowed';
                input.style.opacity = '0.8';
            } else {
                input.removeAttribute('readonly');
                input.style.cursor = '';
                input.style.opacity = '';
            }
        });
        
        // 버튼 비활성화 (읽기 전용일 때)
        if (readonly) {
            // AI 생성 버튼 등은 비활성화하지 않음 (읽기 전용에서도 사용 가능)
            const editButtons = document.querySelectorAll('button[onclick*="generate"], button[onclick*="apply"], button[onclick*="regenerate"]');
            // 필요시 특정 버튼만 비활성화
        }
        
        console.log('✅ 읽기 전용 모드 설정:', readonly);
    } catch (error) {
        console.error('읽기 전용 모드 설정 오류:', error);
    }
};

// ═══════════════════════════════════════════════════════════════
// 단계별 데이터 복원 함수
// ═══════════════════════════════════════════════════════════════
window.restoreStepData = function(step) {
    try {
        // 수정 모드일 때는 복원하지 않음 (사용자가 수정 중인 데이터를 보존)
        if (window.editMode) {
            console.log(`⏭️ 수정 모드 활성화 중 - ${step}단계 데이터 복원 건너뜀`);
            return;
        }
        
        if (!window.currentProject || !window.currentProject.data) {
            return;
        }
        
        const projectData = window.currentProject.data;
        
        switch (step) {
            case 1:
                // 1단계: 가사 작성 + 선택 태그
                const title1 = window.currentProject?.title || projectData.title || '';
                if (title1) {
                    const titleEl = document.getElementById('songTitle');
                    if (titleEl) titleEl.value = title1;
                }
                if (projectData.originalLyrics) {
                    const lyricsEl = document.getElementById('originalLyrics');
                    if (lyricsEl) lyricsEl.value = projectData.originalLyrics;
                }
                if (projectData.manualStylePrompt) {
                    const styleEl = document.getElementById('manualStylePrompt');
                    if (styleEl) styleEl.value = projectData.manualStylePrompt;
                }
                if (projectData.step1Tags && typeof projectData.step1Tags === 'object' && typeof window.setTagSelections === 'function') {
                    const step1Map = { genre: 'genreTags', mood: 'moodTags', era: 'eraTags', theme: 'themeTags', perspective: 'perspectiveTags', time: 'timeTags', special: 'specialTags', region: 'regionTags' };
                    Object.keys(step1Map).forEach(key => {
                        if (projectData.step1Tags[key] && Array.isArray(projectData.step1Tags[key])) {
                            window.setTagSelections(step1Map[key], projectData.step1Tags[key]);
                        }
                    });
                }
                break;
                
            case 2:
                // 2단계: 수노 변환 + 선택 태그·템포
                const title2 = window.currentProject?.title || projectData.title || '';
                if (title2) {
                    const sunoTitleEl = document.getElementById('sunoTitle');
                    if (sunoTitleEl) sunoTitleEl.value = title2;
                }
                if (projectData.sunoLyrics) {
                    const sunoEl = document.getElementById('sunoLyrics');
                    if (sunoEl) {
                        sunoEl.value = projectData.sunoLyrics;
                        if (typeof window.autoResizeTextarea === 'function') {
                            requestAnimationFrame(function() { window.autoResizeTextarea(sunoEl); });
                        }
                    }
                }
                if (projectData.stylePrompt) {
                    const stylePromptEl = document.getElementById('stylePrompt');
                    if (stylePromptEl) stylePromptEl.value = projectData.stylePrompt;
                }
                if (projectData.step2Tags && typeof projectData.step2Tags === 'object' && typeof window.setTagSelections === 'function') {
                    const step2Map = { audioFormat: 'audioFormatTags', venue: 'sunoVenueTags', vocalStyle: 'vocalStyle', instruments: 'instrumentTags' };
                    Object.keys(step2Map).forEach(key => {
                        if (projectData.step2Tags[key] && Array.isArray(projectData.step2Tags[key])) {
                            window.setTagSelections(step2Map[key], projectData.step2Tags[key]);
                        }
                    });
                }
                if (projectData.tempo) {
                    const tempoSlider = document.getElementById('tempoSlider');
                    const tempoValue = document.getElementById('tempoValue');
                    if (tempoSlider) tempoSlider.value = projectData.tempo;
                    if (tempoValue) tempoValue.textContent = projectData.tempo;
                }
                if (projectData.vocalPartAssignments && typeof projectData.vocalPartAssignments === 'object') {
                    window.vocalPartAssignments = projectData.vocalPartAssignments;
                    if (typeof window.renderVocalPartAssignments === 'function') {
                        window.renderVocalPartAssignments();
                    }
                }
                break;
                
            case 3:
                // 3단계: AI 분석
                // 분석 대상 데이터 복원
                if (projectData.sunoLyrics) {
                    const analysisTargetLyrics = document.getElementById('analysisTargetLyrics');
                    if (analysisTargetLyrics) {
                        analysisTargetLyrics.textContent = projectData.sunoLyrics;
                    }
                }
                if (projectData.stylePrompt) {
                    const analysisTargetStyle = document.getElementById('analysisTargetStyle');
                    if (analysisTargetStyle) {
                        analysisTargetStyle.textContent = projectData.stylePrompt;
                    }
                }
                // 분석 결과 표시 (scores/feedbacks/improvements/raw 중 하나라도 있으면 로딩 숨김)
                const analysisData = projectData.analysis || {};
                const hasAnalysisData = analysisData.scores || analysisData.feedbacks || analysisData.improvements || analysisData.raw;
                if (hasAnalysisData) {
                    const analysisResult = document.getElementById('analysisResult');
                    const analysisLoading = document.getElementById('analysisLoading');
                    const analysisError = document.getElementById('analysisError');
                    
                    if (analysisResult && analysisLoading) {
                        analysisLoading.style.display = 'none';
                        if (analysisError) analysisError.style.display = 'none';
                        analysisResult.style.display = 'block';
                        
                        // 점수 표시
                        if (analysisData.scores) {
                            const overallScore = analysisData.scores.overall || analysisData.scores.overallScore || 0;
                            const lyricsScore = analysisData.scores.lyrics || 0;
                            const styleScore = analysisData.scores.style || 0;
                            const structureScore = analysisData.scores.structure || 0;
                            
                            const overallScoreEl = document.getElementById('overallScore');
                            const lyricsScoreEl = document.getElementById('lyricsScore');
                            const styleScoreEl = document.getElementById('styleScore');
                            const structureScoreEl = document.getElementById('structureScore');
                            
                            if (overallScoreEl) overallScoreEl.textContent = overallScore;
                            if (lyricsScoreEl) lyricsScoreEl.textContent = lyricsScore;
                            if (styleScoreEl) styleScoreEl.textContent = styleScore;
                            if (structureScoreEl) structureScoreEl.textContent = structureScore;
                        }
                        
                        // 피드백 표시
                        const feedbacks = analysisData.feedbacks || [];
                        if (feedbacks.length > 0) {
                            const geminiAnalysisCard = document.getElementById('geminiAnalysisCard');
                            const geminiAnalysisResult = document.getElementById('geminiAnalysisResult');
                            if (geminiAnalysisCard && geminiAnalysisResult) {
                                geminiAnalysisCard.style.display = 'block';
                                
                                let feedbackHtml = '';
                                feedbacks.forEach((feedback, index) => {
                                    const feedbackText = typeof feedback === 'string' ? feedback : 
                                                       (feedback.suggestion || feedback.desc || feedback.text || JSON.stringify(feedback));
                                    feedbackHtml += `
                                        <div style="margin-bottom: 15px; padding: 15px; background: var(--bg-input); border-radius: 8px; border-left: 4px solid var(--accent);">
                                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                                <span style="font-size: 1.5rem;">${feedback.icon || '💡'}</span>
                                                <h4 style="margin: 0; color: var(--text-primary);">${feedback.title || feedback.category || '피드백'}</h4>
                                            </div>
                                            <p style="margin: 0; color: var(--text-secondary); line-height: 1.6; font-size: 0.9rem;">${escapeHtml(feedbackText)}</p>
                                        </div>
                                    `;
                                });
                                geminiAnalysisResult.innerHTML = feedbackHtml;
                            }
                        }
                        
                        // 요약 표시
                        if (analysisData.summary) {
                            const summaryEl = document.getElementById('analysisSummary');
                            if (summaryEl) {
                                summaryEl.textContent = analysisData.summary;
                            }
                        }
                        // raw만 있는 경우 결과 영역에 표시
                        if (analysisData.raw && (!analysisData.scores && (!analysisData.feedbacks || analysisData.feedbacks.length === 0))) {
                            const geminiAnalysisCard = document.getElementById('geminiAnalysisCard');
                            const geminiAnalysisResult = document.getElementById('geminiAnalysisResult');
                            if (geminiAnalysisCard && geminiAnalysisResult) {
                                geminiAnalysisCard.style.display = 'block';
                                geminiAnalysisResult.innerHTML = '<div style="white-space: pre-wrap; color: var(--text-secondary); line-height: 1.8;">' + escapeHtml(analysisData.raw) + '</div>';
                            }
                        }
                    }
                }
                break;
                
            case 4:
                // 4단계: 최종 확정 (저장 시 finalizedLyrics/finalizedStyle 사용, 호환으로 finalLyrics/finalStyle도 지원)
                const lyrics4 = projectData.finalizedLyrics || projectData.finalLyrics || '';
                if (lyrics4) {
                    const finalizedLyricsEl = document.getElementById('finalizedLyrics');
                    if (finalizedLyricsEl) finalizedLyricsEl.value = lyrics4;
                }
                const style4 = projectData.finalizedStyle || projectData.finalStyle || '';
                if (style4) {
                    const finalizedStyleEl = document.getElementById('finalizedStyle');
                    if (finalizedStyleEl) finalizedStyleEl.value = style4;
                }
                break;
                
            case 5:
                // 5단계: 최종 출력 (finalLyrics/finalStyle 우선, 없으면 finalizedLyrics/finalizedStyle 사용)
                const finalLyrics5 = projectData.finalLyrics || projectData.finalizedLyrics || '';
                const finalStyle5 = projectData.finalStyle || projectData.finalizedStyle || '';
                if (finalLyrics5) {
                    const finalLyricsEl = document.getElementById('finalLyrics');
                    if (finalLyricsEl) finalLyricsEl.textContent = finalLyrics5;
                    const intermediateLyricsPreview = document.getElementById('intermediateLyricsPreview');
                    if (intermediateLyricsPreview) intermediateLyricsPreview.textContent = finalLyrics5;
                }
                if (finalStyle5) {
                    const finalStyleEl = document.getElementById('finalStyle');
                    if (finalStyleEl) finalStyleEl.textContent = finalStyle5;
                    const intermediateStylePreview = document.getElementById('intermediateStylePreview');
                    if (intermediateStylePreview) intermediateStylePreview.textContent = finalStyle5;
                }
                const title5 = window.currentProject?.title || projectData.title || '';
                if (title5) {
                    const finalTitleTextEl = document.getElementById('finalTitleText');
                    if (finalTitleTextEl) finalTitleTextEl.textContent = title5;
                }
                if (projectData.beforeScore !== undefined || projectData.afterScore !== undefined) {
                    const before = projectData.beforeScore !== undefined ? projectData.beforeScore : 0;
                    const after = projectData.afterScore !== undefined ? projectData.afterScore : before;
                    if (typeof window.updateFinalEvaluationUI === 'function') {
                        window.updateFinalEvaluationUI(before, after, projectData.aiComment != null ? projectData.aiComment : undefined);
                    } else {
                        const beforeScoreEl = document.getElementById('beforeScore');
                        const afterScoreEl = document.getElementById('afterScore');
                        const aiCommentEl = document.getElementById('aiComment');
                        if (beforeScoreEl) beforeScoreEl.textContent = before;
                        if (afterScoreEl) afterScoreEl.textContent = after;
                        if (projectData.aiComment != null && aiCommentEl) aiCommentEl.textContent = projectData.aiComment;
                    }
                } else if (projectData.aiComment) {
                    const aiCommentEl = document.getElementById('aiComment');
                    if (aiCommentEl) aiCommentEl.textContent = projectData.aiComment;
                }
                break;
                
            case 6:
                // 6단계: 마케팅 자료 (유튜브/틱톡/해시태그/썸네일 + MV 설정/썸네일·배경·인물 프롬프트/씬 개요)
                if (projectData.marketing) {
                    const marketing = projectData.marketing;
                    
                    if (marketing.youtubeDesc) {
                        const youtubeDescEl = document.getElementById('youtubeDesc');
                        if (youtubeDescEl) youtubeDescEl.textContent = marketing.youtubeDesc;
                    }
                    if (marketing.tiktokDesc) {
                        const tiktokDescEl = document.getElementById('tiktokDesc');
                        if (tiktokDescEl) tiktokDescEl.textContent = marketing.tiktokDesc;
                    }
                    if (marketing.hashtags) {
                        const hashtagsEl = document.getElementById('hashtagsContent');
                        if (hashtagsEl) hashtagsEl.textContent = marketing.hashtags;
                    }
                    if (marketing.thumbnails && Array.isArray(marketing.thumbnails) && marketing.thumbnails.length > 0) {
                        const thumbnailsGridEl = document.getElementById('thumbnailsGrid');
                        if (thumbnailsGridEl) {
                            let thumbnailsHtml = '';
                            marketing.thumbnails.forEach((thumb) => {
                                const thumbnailText = typeof thumb === 'string' ? thumb : (thumb.text || thumb.content || String(thumb));
                                thumbnailsHtml += `
                                    <div class="thumbnail-item" style="padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s;" 
                                         onclick="if(typeof window.copyToClipboard === 'function') { window.copyToClipboard(null, '${escapeHtml(thumbnailText).replace(/'/g, "\\'")}', event); }">
                                        <div style="font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">${escapeHtml(thumbnailText)}</div>
                                        <button class="btn btn-small btn-success" onclick="event.stopPropagation(); if(typeof window.copyToClipboard === 'function') { window.copyToClipboard(null, '${escapeHtml(thumbnailText).replace(/'/g, "\\'")}', event); }">
                                            <i class="fas fa-copy"></i> 복사
                                        </button>
                                    </div>
                                `;
                            });
                            thumbnailsGridEl.innerHTML = thumbnailsHtml;
                        }
                    }
                    
                    // MV 설정 복원 (시대, 국가, 장소 유형, 인물 수, 조명, 카메라, 분위기, 인물 정보)
                    if (marketing.mvSettings) {
                        const mvSettings = marketing.mvSettings;
                        const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== '') el.value = val; };
                        setVal('mvEra', mvSettings.era);
                        setVal('mvCountry', mvSettings.country);
                        setVal('mvCharacterCount', mvSettings.characterCount || '1');
                        setVal('mvCustomSettings', mvSettings.customSettings);
                        setVal('mvLighting', mvSettings.lighting);
                        setVal('mvCameraWork', mvSettings.cameraWork);
                        setVal('mvMood', mvSettings.mood);
                        const locationTagsContainer = document.getElementById('mvLocationTags');
                        if (locationTagsContainer && Array.isArray(mvSettings.location)) {
                            locationTagsContainer.querySelectorAll('.tag-btn').forEach(btn => {
                                const v = btn.getAttribute('data-value');
                                btn.classList.toggle('active', mvSettings.location.indexOf(v) !== -1);
                            });
                        }
                        if (typeof window.updateCharacterInputs === 'function') window.updateCharacterInputs();
                        if (mvSettings.characters && Array.isArray(mvSettings.characters)) {
                            mvSettings.characters.forEach((char, idx) => {
                                const i = idx + 1;
                                setVal('mvCharacter' + i + '_gender', char.gender);
                                setVal('mvCharacter' + i + '_age', char.age);
                                setVal('mvCharacter' + i + '_race', char.race);
                                setVal('mvCharacter' + i + '_appearance', char.appearance);
                            });
                        }
                        if (typeof window.saveMVSettings === 'function') window.saveMVSettings();
                    }
                    
                    // 썸네일/배경/인물 프롬프트 복원
                    if (marketing.mvPrompts) {
                        const mp = marketing.mvPrompts;
                        const setPrompt = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
                        setPrompt('mvThumbnailPromptEn', mp.thumbnailEn);
                        setPrompt('mvThumbnailPromptKo', mp.thumbnailKo);
                        setPrompt('mvBackgroundDetailPromptEn', mp.backgroundDetailEn);
                        setPrompt('mvBackgroundDetailPromptKo', mp.backgroundDetailKo);
                        setPrompt('mvCharacterDetailPromptEn', mp.characterDetailEn);
                        setPrompt('mvCharacterDetailPromptKo', mp.characterDetailKo);
                    }
                    
                    // MV 씬 데이터 복원 및 씬 개요/결과 UI 렌더링 (중복 방지)
                    if (marketing.mvScenes && Array.isArray(marketing.mvScenes) && marketing.mvScenes.length > 0) {
                        const mvSceneOverviewContainer = document.getElementById('mvSceneOverviewContainer');
                        const mvPromptsContainer = document.getElementById('mvPromptsContainer');
                        const mvSceneOverviewSection = document.getElementById('mvSceneOverviewSection');
                        const mvResultsSection = document.getElementById('mvResultsSection');
                        
                        // 이미 렌더링되어 있으면 중복 렌더링 방지 (loadProject에서 이미 렌더링된 경우)
                        const alreadyRendered = (mvSceneOverviewContainer && mvSceneOverviewContainer.innerHTML.trim()) ||
                            (window.currentScenes && window.currentScenes.length > 0 && mvPromptsContainer && mvPromptsContainer.children.length >= window.currentScenes.length);
                        if (alreadyRendered) {
                            if (mvSceneOverviewSection) mvSceneOverviewSection.style.display = 'block';
                            if (mvResultsSection) mvResultsSection.style.display = 'block';
                            const totalImagesEl = document.getElementById('mvTotalImages');
                            if (totalImagesEl && window.currentScenes && window.currentScenes.length > 0) totalImagesEl.textContent = window.currentScenes.length;
                        } else {
                            window.currentScenes = JSON.parse(JSON.stringify(marketing.mvScenes));
                            if (mvSceneOverviewContainer) {
                                let html = `
                                <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border);">
                                    <h3 style="margin: 0 0 10px 0; color: var(--text-primary); font-size: 1.1rem;">
                                        <i class="fas fa-film"></i> 씬별 개요
                                    </h3>
                                    <p style="margin: 0; color: var(--text-secondary); font-size: 0.85rem;">각 씬의 배경, 인물, 장소 등을 확인하고 수정할 수 있습니다.</p>
                                </div>
                            `;
                            window.currentScenes.forEach((scene, index) => {
                                const existingPrompt = (scene.prompt || '').replace(/[가-힣]+/g, '').trim();
                                const existingPromptKo = scene.promptKo || '';
                                html += `
                                    <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border);" data-scene-index="${index}">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                            <div style="display: flex; align-items: center; gap: 10px;">
                                                <h4 style="margin: 0; color: var(--text-primary);">씬 ${index + 1}</h4>
                                                <span style="color: var(--accent); font-weight: 600;">${scene.time || ''}</span>
                                            </div>
                                            <div style="display: flex; gap: 8px;">
                                                <button class="btn btn-small btn-primary" onclick="regenerateSceneOverviewPrompt(${index})" style="padding: 6px 12px; font-size: 0.8rem;"><i class="fas fa-sync-alt"></i> 재생성</button>
                                                <button class="btn btn-small btn-secondary" onclick="editSceneOverview(${index})" style="padding: 6px 12px; font-size: 0.8rem;"><i class="fas fa-edit"></i> 수정</button>
                                                <button id="copySceneOverviewBtn_${index}" class="btn btn-small btn-success" onclick="copySceneOverviewPromptEn(${index}, event)" style="padding: 6px 12px; font-size: 0.8rem;"><i class="fas fa-copy"></i> 복사</button>
                                            </div>
                                        </div>
                                        <div style="margin-bottom: 10px;">
                                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">장면 설명:</label>
                                            <textarea class="scene-description" data-index="${index}" data-scene-index="${index}" style="width: 100%; min-height: 80px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.9rem; resize: vertical;">${escapeHtml(scene.scene || '')}</textarea>
                                        </div>
                                        <div style="margin-bottom: 10px;">
                                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">영어 프롬프트:</label>
                                            <textarea id="scene_overview_${index}_en" class="scene-prompt-en-overview" data-index="${index}" data-scene-index="${index}" style="width: 100%; min-height: 120px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.9rem; font-family: monospace; resize: vertical;">${escapeHtml(existingPrompt)}</textarea>
                                        </div>
                                        <div>
                                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">한글 프롬프트:</label>
                                            <textarea id="scene_overview_${index}_ko" class="scene-prompt-ko-overview" data-index="${index}" data-scene-index="${index}" style="width: 100%; min-height: 120px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.9rem; resize: vertical;">${escapeHtml(existingPromptKo)}</textarea>
                                        </div>
                                    </div>
                                `;
                            });
                                if (mvSceneOverviewContainer) mvSceneOverviewContainer.innerHTML = html;
                            }
                            if (mvSceneOverviewSection) mvSceneOverviewSection.style.display = 'block';
                            if (mvResultsSection) mvResultsSection.style.display = 'block';
                            if (mvPromptsContainer && window.currentScenes.length > 0) {
                                let resultHtml = '';
                                window.currentScenes.forEach((scene, index) => {
                                    const sceneId = 'scene_' + index;
                                    const scenePromptEn = (scene.prompt || '').replace(/\/\*\s*Scene\s+\d+\s*\*\/\s*/gi, '').trim();
                                    const scenePromptKo = scene.promptKo || '';
                                    resultHtml += `
                                        <div class="mv-prompt-item" style="margin-bottom: 25px; padding: 20px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border);">
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                                <h4 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">씬 ${index + 1}</h4>
                                                <div style="display: flex; gap: 8px; align-items: center;">
                                                    <span style="color: var(--accent); font-weight: 600; font-size: 0.9rem;">${scene.time || ''}</span>
                                                    <button class="btn btn-small btn-primary" onclick="regenerateScenePrompt(${index})" style="padding: 4px 8px; font-size: 0.75rem;">재생성</button>
                                                    <button class="btn btn-small btn-success" onclick="saveScenePrompt(${index})" style="padding: 4px 8px; font-size: 0.75rem;">저장</button>
                                                </div>
                                            </div>
                                            <div style="margin-bottom: 15px; padding: 12px; background: var(--bg-input); border-radius: 6px;">
                                                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">장면:</div>
                                                <div style="color: var(--text-primary);">${escapeHtml(scene.scene || '')}</div>
                                            </div>
                                            <div style="margin-bottom: 10px;">
                                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                                    <label style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">영어 프롬프트</label>
                                                    <button id="copyScenePromptBtn_${index}" class="btn btn-small btn-success" onclick="copyScenePromptEn(${index}, event)" style="padding: 4px 10px; font-size: 0.75rem;"><i class="fas fa-copy"></i> 복사</button>
                                                </div>
                                                <textarea id="${sceneId}_en" class="scene-prompt-en" data-scene-index="${index}" style="width: 100%; min-height: 100px; padding: 12px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; font-family: monospace; font-size: 0.9rem; color: var(--text-primary); resize: vertical;">${escapeHtml(scenePromptEn)}</textarea>
                                            </div>
                                            <div>
                                                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">한글 번역본</label>
                                                <textarea id="${sceneId}_ko" class="scene-prompt-ko" data-scene-index="${index}" style="width: 100%; min-height: 100px; padding: 12px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem; color: var(--text-primary); resize: vertical;">${escapeHtml(scenePromptKo)}</textarea>
                                            </div>
                                        </div>
                                    `;
                                });
                                mvPromptsContainer.innerHTML = resultHtml;
                            }
                            const totalImagesEl = document.getElementById('mvTotalImages');
                            if (totalImagesEl) totalImagesEl.textContent = window.currentScenes.length;
                        }
                    }
                }
                break;
        }
        
        console.log(`✅ ${step}단계 데이터 복원 완료`);
    } catch (error) {
        console.error('단계 데이터 복원 오류:', error);
    }
};
// [MOVED] extraction block

// 저장 후 닫기: 모든 내용 저장 후 창 닫기 (브라우저 정책상 창이 닫히지 않을 수 있음)
window.saveAndClose = function() {
    try {
        if (typeof window.saveCurrentProject !== 'function') {
            alert('저장 기능을 사용할 수 없습니다.');
            return;
        }
        if (!window.currentProjectId) {
            const hasContent = (document.getElementById('songTitle')?.value || '').trim() ||
                (document.getElementById('originalLyrics')?.value || '').trim() ||
                (document.getElementById('sunoLyrics')?.value || '').trim();
            if (!hasContent) {
                if (typeof window.showCopyIndicator === 'function') {
                    window.showCopyIndicator('저장할 내용이 없습니다. 창을 닫아 주세요.');
                } else {
                    alert('저장할 내용이 없습니다.\n\n창을 닫아 주세요.');
                }
                window.close();
                return;
            }
            window.currentProjectId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        const saved = window.saveCurrentProject();
        if (saved) {
            if (typeof window.showCopyIndicator === 'function') {
                window.showCopyIndicator('✅ 모든 내용이 저장되었습니다. 이제 브라우저 창을 닫아도 됩니다.');
            } else {
                alert('✅ 모든 내용이 저장되었습니다.\n\n이제 브라우저 창을 닫아도 됩니다.');
            }
            window.close();
        } else {
            alert('저장에 실패했습니다. 다시 시도해 주세요.');
        }
    } catch (e) {
        console.error('저장 후 닫기 오류:', e);
        alert('저장 후 닫기 중 오류가 발생했습니다.');
    }
};

// ═══════════════════════════════════════════════════════════════
// 사이드바 토글 함수
// ═══════════════════════════════════════════════════════════════
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) {
        const isOpen = sidebar.classList.contains('open');
        if (isOpen) {
            sidebar.classList.remove('open');
            if (overlay) overlay.style.display = 'none';
            } else {
            sidebar.classList.add('open');
            if (overlay) overlay.style.display = 'block';
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// 사이드바 드래그 기능
// ═══════════════════════════════════════════════════════════════
window.initSidebarDrag = function() {
    const sidebar = document.getElementById('sidebar');
    const sidebarHeader = document.getElementById('sidebarHeader');
    const dragHandle = sidebarHeader?.querySelector('.sidebar-drag-handle');
    
    if (!sidebar || !sidebarHeader) return;
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startRight = 0;
    let startTop = 0;
    
    // 드래그 시작 (드래그 핸들에서만)
    const handleMouseDown = (e) => {
        // 드래그 핸들에서만 드래그 시작 (헤더 전체가 아닌 핸들만)
        const dragHandle = e.target.closest('.sidebar-drag-handle');
        if (!dragHandle) return;
        
        // 닫기 버튼 클릭은 무시
        if (e.target.closest('.sidebar-close')) return;
        
        isDragging = true;
        sidebar.classList.add('dragging');
        
        const rect = sidebar.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        // 좌측 기준으로 저장
        startRight = rect.left; // 좌측 위치
        startTop = rect.top;
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        e.preventDefault();
        e.stopPropagation();
    };
    
    // 드래그 중
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX; // 마우스가 오른쪽으로 이동하면 양수
        const deltaY = e.clientY - startY; // 마우스가 아래로 이동하면 양수
        
        // 좌측 기준으로 위치 계산
        const sidebarWidth = sidebar.offsetWidth || 320;
        const sidebarHeight = sidebar.offsetHeight || window.innerHeight;
        
        let newLeft = startRight + deltaX; // startRight는 실제로는 startLeft
        let newTop = startTop + deltaY;
        
        // 화면 경계 체크
        const maxLeft = window.innerWidth - 50; // 최소 50px는 보이도록
        const minLeft = -sidebarWidth + 50; // 대부분 숨길 수 있지만 일부는 보이도록
        const maxTop = window.innerHeight - 50; // 최소 50px는 보이도록
        const minTop = -sidebarHeight + 50; // 대부분 숨길 수 있지만 일부는 보이도록
        
        newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
        newTop = Math.max(minTop, Math.min(maxTop, newTop));
        
        sidebar.style.left = `${newLeft}px`;
        sidebar.style.right = 'auto';
        sidebar.style.top = `${newTop}px`;
        sidebar.style.bottom = 'auto';
        
        // 사이드바를 독립적인 플로팅 패널로 만들기 (메인 화면과 분리)
        sidebar.style.position = 'fixed';
        sidebar.style.zIndex = '10000';
        
        // 위치 저장 (좌측 기준)
        const savedSize = localStorage.getItem('sidebarSize');
        const size = savedSize ? JSON.parse(savedSize) : { width: 350, height: '100vh' };
        localStorage.setItem('sidebarPosition', JSON.stringify({
            left: newLeft,
            top: newTop,
            width: size.width,
            height: size.height,
            detached: true // 분리된 상태로 표시
        }));
    };
    
    // 드래그 종료
    const handleMouseUp = () => {
        if (isDragging) {
            isDragging = false;
            sidebar.classList.remove('dragging');
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    };
    
    // 드래그 핸들에만 드래그 이벤트 리스너 추가 (헤더 전체가 아닌 핸들만)
    if (dragHandle) {
        dragHandle.addEventListener('mousedown', handleMouseDown);
    }
    
    // 드래그 핸들 호버 효과
    if (dragHandle) {
        dragHandle.addEventListener('mouseenter', () => {
            dragHandle.style.opacity = '1';
        });
        dragHandle.addEventListener('mouseleave', () => {
            if (!isDragging) {
                dragHandle.style.opacity = '0.5';
            }
        });
    }
    
    // 사이드바를 항상 좌측에 강제 배치 (저장된 위치 무시)
    sidebar.style.position = 'fixed';
    sidebar.style.zIndex = '10000';
    sidebar.style.left = '0';
    sidebar.style.right = 'auto';
    sidebar.style.top = '0';
    sidebar.style.bottom = 'auto';
    
    // 저장된 위치에서 크기만 복원 (위치는 항상 좌측)
    const savedPosition = localStorage.getItem('sidebarPosition');
    if (savedPosition) {
        try {
            const pos = JSON.parse(savedPosition);
            // 크기만 복원
            if (pos.width) {
                sidebar.style.width = `${pos.width}px`;
                } else {
                sidebar.style.width = '320px'; // 기본 너비
            }
            if (pos.height) {
                sidebar.style.height = pos.height === '100vh' ? '100vh' : `${pos.height}px`;
                } else {
                sidebar.style.height = '100vh'; // 기본 높이
            }
        } catch (e) {
            console.warn('저장된 사이드바 크기 복원 실패:', e);
            sidebar.style.width = '350px';
            sidebar.style.height = '100vh';
            }
        } else {
        sidebar.style.width = '350px';
        sidebar.style.height = '100vh';
    }
    
    // 리사이즈 기능 초기화 (별도로 초기화하므로 여기서는 호출하지 않음)
    // initSidebarResize()는 페이지 로드 시 별도로 호출됨
};

// 사이드바 리사이즈 기능 초기화
window.initSidebarResize = function() {
        const sidebar = document.getElementById('sidebar');
    const resizeHandle = document.getElementById('sidebarResizeHandle');
    
    if (!sidebar || !resizeHandle) return;
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    let startLeft = 0;
    
    // 리사이즈 시작
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        const rect = sidebar.getBoundingClientRect();
        startLeft = rect.left; // 좌측 위치
        
        sidebar.classList.add('resizing');
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
        
        e.preventDefault();
        e.stopPropagation();
    });
    
        // 리사이즈 중
    function handleResizeMove(e) {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX; // 우측으로 드래그하면 너비 증가
        const newWidth = Math.max(280, Math.min(600, startWidth + deltaX)); // 최소 280px, 최대 600px
        
        sidebar.style.width = `${newWidth}px`;
        sidebar.style.transition = 'none'; // 리사이즈 중에는 transition 비활성화
        // 좌측 위치는 항상 0으로 유지
        sidebar.style.left = '0';
        
        // 메인 화면 위치 실시간 조정
        if (typeof window.updateMainContentPosition === 'function') {
            window.updateMainContentPosition();
        }
    }
    
    // 리사이즈 종료
    function handleResizeEnd() {
        if (isResizing) {
            isResizing = false;
            sidebar.classList.remove('resizing');
            sidebar.style.transition = ''; // transition 복원
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // 크기 저장 (좌측 기준, 항상 left: 0)
            const position = {
                left: 0,
                top: 0,
                width: sidebar.offsetWidth,
                height: sidebar.style.height || '100vh'
            };
            localStorage.setItem('sidebarPosition', JSON.stringify(position));
            localStorage.setItem('sidebarSize', JSON.stringify({
                width: sidebar.offsetWidth,
                height: sidebar.style.height || '100vh'
            }));
            
            // 메인 화면 위치 최종 조정
            if (typeof window.updateMainContentPosition === 'function') {
                window.updateMainContentPosition();
            }
            
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
            
            console.log(`✅ 사이드바 크기 조정 완료: ${sidebar.offsetWidth}px`);
        }
    }
};

// 메인 화면 위치 조정 함수 (사이드바는 좌측 고정, 메인은 우측 고정)
window.updateMainContentPosition = function() {
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.getElementById('mainWrapper');
    const header = document.querySelector('header');
    const container = document.querySelector('.container');
    
    if (!sidebar) return;
    
    // 사이드바는 항상 좌측에 고정, 메인 화면은 우측에 고정
    const sidebarWidth = sidebar.offsetWidth || 320;
    
    // 메인 화면을 우측에 고정 (사이드바 너비만큼 좌측 마진)
    if (mainWrapper) {
        mainWrapper.style.marginLeft = `${sidebarWidth}px`;
        mainWrapper.style.marginRight = '0';
        mainWrapper.style.width = `calc(100% - ${sidebarWidth}px)`;
        mainWrapper.style.maxWidth = 'none';
        mainWrapper.style.overflowX = 'hidden'; // 가로 스크롤 방지
    }
    
    // 헤더도 사이드바 너비에 맞춰 조정
    if (header) {
        header.style.marginLeft = `${sidebarWidth}px`;
        header.style.width = `calc(100% - ${sidebarWidth}px)`;
        header.style.maxWidth = 'none';
        header.style.position = 'fixed';
        header.style.left = '0';
        header.style.right = '0';
        header.style.zIndex = '1000';
    }
    
            if (container) {
        container.style.marginLeft = '0';
        container.style.marginRight = '0';
        container.style.width = '100%';
        container.style.maxWidth = '100%';
        container.style.paddingLeft = 'var(--spacing-lg)';
        container.style.paddingRight = 'var(--spacing-lg)';
        container.style.boxSizing = 'border-box';
        
        // 헤더 높이에 맞춰 컨테이너 상단 패딩 동적 조정
        if (header) {
            const headerHeight = header.offsetHeight || 180;
            container.style.paddingTop = `${headerHeight + 20}px`;
        }
    }
};

// 페이지 로드 시 드래그 및 리사이즈 기능 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (typeof window.initSidebarDrag === 'function') {
                window.initSidebarDrag();
            }
            
            // ═══════════════════════════════════════════════════════════════
            // 사이드바 리사이즈 기능 초기화
            // ═══════════════════════════════════════════════════════════════
            if (typeof window.initSidebarResize === 'function') {
                window.initSidebarResize();
                console.log('✅ 사이드바 리사이즈 기능 초기화 완료');
            }
            
            // 사이드바를 좌측에 강제 고정
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.style.position = 'fixed';
                sidebar.style.zIndex = '10000';
                // 저장된 위치와 관계없이 항상 좌측에 강제 배치
                    sidebar.style.left = '0';
                    sidebar.style.right = 'auto';
                    sidebar.style.top = '0';
                
                // 저장된 크기 복원 (없으면 기본값)
                const savedPosition = localStorage.getItem('sidebarPosition');
                if (savedPosition) {
                    try {
                        const pos = JSON.parse(savedPosition);
                        if (pos.width) {
                            sidebar.style.width = `${pos.width}px`;
                        } else {
                            sidebar.style.width = '350px';
                        }
                    } catch (e) {
                        sidebar.style.width = '350px';
                    }
                } else {
                    sidebar.style.width = '350px';
                }
                
                sidebar.style.height = '100vh';
                
                // localStorage에 좌측 위치 저장
                const currentWidth = sidebar.offsetWidth || 350;
                localStorage.setItem('sidebarPosition', JSON.stringify({
                    left: 0,
                    top: 0,
                    width: currentWidth,
                    height: '100vh'
                }));
            }
            // 메인 화면을 우측에 고정
            if (typeof window.updateMainContentPosition === 'function') {
                window.updateMainContentPosition();
            }
            
            // ═══════════════════════════════════════════════════════════════
            // 최초 실행시 프로젝트 리스트 로드
            // ═══════════════════════════════════════════════════════════════
            if (typeof window.loadProjectList === 'function') {
                setTimeout(() => {
                    try {
                        window.loadProjectList();
                        console.log('✅ 최초 실행: 프로젝트 리스트 로드 완료');
                    } catch (error) {
                        console.error('⚠️ 최초 실행: 프로젝트 리스트 로드 실패:', error);
                    }
                }, 300);
            }
            
            // 사이드바 크기 변경 시 메인 화면 위치 업데이트
            if (typeof window.ResizeObserver !== 'undefined') {
                const resizeObserver = new ResizeObserver(() => {
                    if (typeof window.updateMainContentPosition === 'function') {
                        window.updateMainContentPosition();
                    }
                });
                resizeObserver.observe(sidebar);
            }
        }, 500);
    });
                    } else {
    setTimeout(() => {
        if (typeof window.initSidebarDrag === 'function') {
            window.initSidebarDrag();
        }
        // 초기 메인 화면 위치 조정
        if (typeof window.updateMainContentPosition === 'function') {
            window.updateMainContentPosition();
        }
    }, 500);
}

// 윈도우 리사이즈 시 메인 화면 위치 조정
window.addEventListener('resize', function() {
    if (typeof window.updateMainContentPosition === 'function') {
        window.updateMainContentPosition();
    }
});

// 브라우저 닫기/탭 닫기/새로고침 시 자동 저장 — 각 단계 작성 중이어도 모든 내용이 저장됨
window.addEventListener('beforeunload', function() {
    try {
        if (typeof window.saveCurrentProject !== 'function') return;
        if (window.currentProjectId) {
            window.saveCurrentProject();
            return;
        }
        // 프로젝트 없어도 1단계 이상 내용이 있으면 새 프로젝트 생성 후 저장
        const hasContent = (document.getElementById('songTitle')?.value || '').trim() ||
            (document.getElementById('originalLyrics')?.value || '').trim() ||
            (document.getElementById('sunoLyrics')?.value || '').trim();
        if (hasContent) {
            window.currentProjectId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            window.saveCurrentProject();
        }
    } catch (e) {
        console.warn('자동 저장 실패:', e);
    }
});

// 사이드바 크기 변경 시 메인 화면 위치 조정
const sidebarResizeObserver = new ResizeObserver(function(entries) {
    if (typeof window.updateMainContentPosition === 'function') {
        window.updateMainContentPosition();
    }
});

// 사이드바 리사이즈 관찰 시작
        setTimeout(() => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebarResizeObserver.observe(sidebar);
    }
}, 1000);
// [MOVED] extraction block
// [MOVED] extraction block

// ═══════════════════════════════════════════════════════════════
// 3단계: Gemini 정밀 분석 함수
// ═══════════════════════════════════════════════════════════════
window.startGeminiAnalysis = async function() {
    try {
        // 분석 대상 데이터 가져오기
        const analysisTargetLyrics = document.getElementById('analysisTargetLyrics');
        const analysisTargetStyle = document.getElementById('analysisTargetStyle');
        const geminiAnalysisCard = document.getElementById('geminiAnalysisCard');
        const geminiAnalysisResult = document.getElementById('geminiAnalysisResult');
        const geminiStatus = document.getElementById('geminiStatus');
        const startAnalysisBtn = document.getElementById('startAnalysisBtn');
        
        if (!analysisTargetLyrics || !analysisTargetStyle) {
            alert('⚠️ 분석할 가사와 스타일 프롬프트가 없습니다.\n\n2단계에서 가사와 스타일 프롬프트를 생성한 후 다시 시도해주세요.');
            return;
        }
        
        const lyrics = analysisTargetLyrics.textContent.trim();
        const stylePrompt = analysisTargetStyle.textContent.trim();
        
        if (!lyrics || !stylePrompt) {
            alert('⚠️ 분석할 가사와 스타일 프롬프트가 비어있습니다.\n\n2단계에서 가사와 스타일 프롬프트를 생성한 후 다시 시도해주세요.');
            return;
        }
        
        // Gemini API 키 확인
        const geminiKey = localStorage.getItem('gemini_api_key') || '';
        if (!geminiKey || !geminiKey.startsWith('AIza')) {
            alert('⚠️ Gemini API 키가 설정되지 않았습니다.\n\n"API 키" 버튼을 클릭하여 Gemini API 키를 설정해주세요.');
            if (typeof window.openAPISettings === 'function') {
                window.openAPISettings();
            }
            return;
        }
        
        // UI 업데이트: 분석 시작
        if (startAnalysisBtn) {
            startAnalysisBtn.disabled = true;
            startAnalysisBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 분석 중...';
        }
        
        if (geminiAnalysisCard) {
            geminiAnalysisCard.style.display = 'block';
        }
        
        if (geminiStatus) {
            geminiStatus.textContent = '분석 중...';
            geminiStatus.style.color = 'var(--accent)';
        }
        
        if (geminiAnalysisResult) {
            geminiAnalysisResult.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="spinner" style="margin: 0 auto 20px;"></div><p>🤖 Gemini가 가사와 스타일 프롬프트를 분석 중입니다...</p></div>';
        }
        
        // 분석 프롬프트 생성
        const analysisPrompt = `다음 가사와 스타일 프롬프트를 정밀 분석하고 평가해주세요.

=== 분석 대상 ===

📝 수노 가사 (지시어 포함):
${lyrics}

🎨 스타일 프롬프트:
${stylePrompt}

=== 분석 요청 ===

다음 항목을 각각 1-100점으로 평가하고, 구체적인 피드백과 개선 사항을 제안해주세요:

1. **구조 (Structure)**: Verse, Chorus, Bridge 등의 구성이 적절한지
2. **감정 표현 (Emotion)**: 가사가 전달하는 감정이 명확하고 효과적인지
3. **운율 및 리듬 (Rhythm)**: 가사의 운율과 리듬감이 좋은지
4. **창의성 (Creativity)**: 가사의 독창성과 참신함
5. **전달력 (Impact)**: 메시지가 명확하게 전달되는지
6. **스타일 프롬프트 적합성 (Style Compatibility)**: 가사와 스타일 프롬프트가 잘 어울리는지
7. **전체 평가 (Overall Score)**: 종합적인 평가 점수

=== 응답 형식 ===

다음 JSON 형식으로 응답해주세요:

{
  "scores": {
    "structure": 85,
    "emotion": 90,
    "rhythm": 80,
    "creativity": 75,
    "impact": 88,
    "styleCompatibility": 82,
    "overall": 83
  },
  "feedbacks": [
    {
      "category": "구조",
      "score": 85,
      "strength": "Verse-Chorus 구조가 명확하고 반복되는 후렴구가 효과적입니다.",
      "weakness": "Bridge 부분이 부족하여 곡의 변화가 적습니다.",
      "suggestion": "Bridge를 추가하여 곡의 긴장감을 높이는 것을 권장합니다."
    },
    {
      "category": "감정 표현",
      "score": 90,
      "strength": "감정이 매우 명확하고 진정성 있게 전달됩니다.",
      "weakness": "일부 구절에서 감정 전달이 다소 직설적입니다.",
      "suggestion": "은유와 비유를 활용하여 감정을 더욱 풍부하게 표현해보세요."
    }
  ],
  "improvements": [
    "Bridge 섹션 추가를 고려해보세요",
    "은유적 표현을 더 활용하면 감정 전달이 더욱 효과적일 것입니다",
    "스타일 프롬프트의 템포와 가사의 리듬을 더욱 조화롭게 맞춰보세요"
  ],
  "summary": "전반적으로 우수한 가사입니다. 구조와 감정 표현이 뛰어나며, 스타일 프롬프트와도 잘 어울립니다. Bridge 추가와 은유적 표현 활용을 통해 더욱 완성도 높은 작품이 될 수 있을 것입니다."
}

**중요**: JSON 형식만 출력하고, 다른 설명이나 텍스트는 포함하지 마세요.`;

        // Gemini API 호출
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: analysisPrompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 4000
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
        }
        
        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!aiResponse.trim()) {
            throw new Error('Gemini API에서 응답을 받지 못했습니다.');
        }
        
        // JSON 파싱 시도
        let analysisData;
        try {
            // JSON 코드 블록 제거
            let cleanedResponse = aiResponse.trim();
            if (cleanedResponse.includes('```json')) {
                cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            } else if (cleanedResponse.includes('```')) {
                cleanedResponse = cleanedResponse.replace(/```\n?/g, '').trim();
            }
            
            // JSON 추출
            const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysisData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('JSON 형식을 찾을 수 없습니다.');
            }
        } catch (parseError) {
            console.error('JSON 파싱 오류:', parseError);
            console.error('AI 응답:', aiResponse);
            // 파싱 실패 시 텍스트로 표시
            analysisData = {
                raw: aiResponse,
                error: 'JSON 파싱 실패'
            };
        }
        
        // 분석 결과 표시
        if (geminiAnalysisResult) {
            let resultHtml = '';
            
            if (analysisData.error) {
                // 파싱 실패 시 원본 텍스트 표시
                resultHtml = `
                    <div style="padding: 20px; background: var(--bg-input); border-radius: 8px; margin-bottom: 15px;">
                        <h4 style="margin-bottom: 10px; color: var(--text-primary);">⚠️ 분석 결과 (텍스트 형식)</h4>
                        <div style="white-space: pre-wrap; color: var(--text-secondary); line-height: 1.8;">${escapeHtml(analysisData.raw)}</div>
                    </div>
                `;
            } else {
                // 점수 표시
                if (analysisData.scores) {
                    const scores = analysisData.scores;
                    const overallScore = scores.overall || scores.overallScore || 0;
                    
                    resultHtml += `
                        <div style="padding: 20px; background: var(--bg-input); border-radius: 8px; margin-bottom: 20px;">
                            <h4 style="margin-bottom: 15px; color: var(--text-primary);">📊 종합 평가</h4>
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                                <div style="font-size: 3rem; font-weight: bold; color: var(--accent);">${overallScore}</div>
                                <div style="flex: 1;">
                                    <div style="background: var(--bg-card); height: 20px; border-radius: 10px; overflow: hidden; margin-bottom: 5px;">
                                        <div style="background: linear-gradient(90deg, var(--accent), var(--success)); height: 100%; width: ${overallScore}%; transition: width 0.3s;"></div>
                                    </div>
                                    <div style="font-size: 0.85rem; color: var(--text-secondary);">100점 만점</div>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px;">
                                <div style="padding: 15px; background: var(--bg-card); border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">구조</div>
                                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">${scores.structure || 0}</div>
                                </div>
                                <div style="padding: 15px; background: var(--bg-card); border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">감정 표현</div>
                                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">${scores.emotion || 0}</div>
                                </div>
                                <div style="padding: 15px; background: var(--bg-card); border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">운율/리듬</div>
                                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">${scores.rhythm || 0}</div>
                                </div>
                                <div style="padding: 15px; background: var(--bg-card); border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">창의성</div>
                                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">${scores.creativity || 0}</div>
                                </div>
                                <div style="padding: 15px; background: var(--bg-card); border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">전달력</div>
                                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">${scores.impact || 0}</div>
                                </div>
                                <div style="padding: 15px; background: var(--bg-card); border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">스타일 적합성</div>
                                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">${scores.styleCompatibility || 0}</div>
                                </div>
                            </div>
                        </div>
                    `;
                }
                
                // 피드백 표시
                if (analysisData.feedbacks && analysisData.feedbacks.length > 0) {
                    resultHtml += `
                        <div style="padding: 20px; background: var(--bg-input); border-radius: 8px; margin-bottom: 20px;">
                            <h4 style="margin-bottom: 15px; color: var(--text-primary);">💬 상세 피드백</h4>
                    `;
                    
                    analysisData.feedbacks.forEach((feedback, index) => {
                        resultHtml += `
                            <div style="padding: 15px; background: var(--bg-card); border-radius: 8px; margin-bottom: 15px; border-left: 4px solid var(--accent);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <h5 style="margin: 0; color: var(--text-primary);">${feedback.category || '분류 없음'}</h5>
                                    <span style="font-size: 1.2rem; font-weight: bold; color: var(--accent);">${feedback.score || 0}점</span>
                                </div>
                                ${feedback.strength ? `<div style="margin-bottom: 10px;"><strong style="color: var(--success);">✅ 강점:</strong> <span style="color: var(--text-secondary);">${escapeHtml(feedback.strength)}</span></div>` : ''}
                                ${feedback.weakness ? `<div style="margin-bottom: 10px;"><strong style="color: var(--warning);">⚠️ 개선점:</strong> <span style="color: var(--text-secondary);">${escapeHtml(feedback.weakness)}</span></div>` : ''}
                                ${feedback.suggestion ? `<div><strong style="color: var(--accent);">💡 제안:</strong> <span style="color: var(--text-secondary);">${escapeHtml(feedback.suggestion)}</span></div>` : ''}
                            </div>
                        `;
                    });
                    
                    resultHtml += `</div>`;
                }
                
                // 개선 사항 표시
                if (analysisData.improvements && analysisData.improvements.length > 0) {
                    resultHtml += `
                        <div style="padding: 20px; background: var(--bg-input); border-radius: 8px; margin-bottom: 20px;">
                            <h4 style="margin-bottom: 15px; color: var(--text-primary);">🔧 개선 사항</h4>
                            <ul style="margin: 0; padding-left: 20px; line-height: 2;">
                    `;
                    
                    analysisData.improvements.forEach(improvement => {
                        resultHtml += `<li style="color: var(--text-secondary); margin-bottom: 8px;">${escapeHtml(improvement)}</li>`;
                    });
                    
                    resultHtml += `</ul></div>`;
                }
                
                // 요약 표시
                if (analysisData.summary) {
                    resultHtml += `
                        <div style="padding: 20px; background: linear-gradient(135deg, var(--bg-input), var(--bg-card)); border-radius: 8px; border: 2px solid var(--accent);">
                            <h4 style="margin-bottom: 10px; color: var(--text-primary);">📝 종합 요약</h4>
                            <p style="color: var(--text-secondary); line-height: 1.8; margin: 0;">${escapeHtml(analysisData.summary)}</p>
                        </div>
                    `;
                }
            }
            
            geminiAnalysisResult.innerHTML = resultHtml;
        }
        
        // 상태 업데이트
        if (geminiStatus) {
            geminiStatus.textContent = '분석 완료';
            geminiStatus.style.color = 'var(--success)';
        }
        
        if (startAnalysisBtn) {
            startAnalysisBtn.disabled = false;
            startAnalysisBtn.innerHTML = '<i class="fas fa-redo"></i> 다시 분석';
        }
        
        // 분석 결과를 프로젝트 데이터에 저장 (currentProject 없으면 DOM 기준으로 생성해 저장)
        if (!window.currentProject) {
            const pid = window.currentProjectId || ('proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
            window.currentProjectId = pid;
            window.currentProject = {
                id: pid,
                title: document.getElementById('songTitle')?.value || document.getElementById('sunoTitle')?.value || '제목 없음',
                lastStep: 3,
                data: {}
            };
        }
        if (!window.currentProject.data) {
            window.currentProject.data = {};
        }
        window.currentProject.data.analysis = analysisData;
        window.currentProject.data.feedbacks = analysisData.feedbacks || [];
        // 2단계 데이터도 있으면 유지 (다음 저장 시 포함되도록)
        if (!window.currentProject.data.sunoLyrics && document.getElementById('sunoLyrics')?.value) {
            window.currentProject.data.sunoLyrics = document.getElementById('sunoLyrics').value;
        }
        if (!window.currentProject.data.stylePrompt && document.getElementById('stylePrompt')?.value) {
            window.currentProject.data.stylePrompt = document.getElementById('stylePrompt').value;
        }
        
        console.log('✅ Gemini 분석 완료:', analysisData);
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator('✅ Gemini 정밀 분석이 완료되었습니다!');
        }
        
    } catch (error) {
        console.error('❌ Gemini 분석 오류:', error);
        
        const geminiStatus = document.getElementById('geminiStatus');
        const geminiAnalysisResult = document.getElementById('geminiAnalysisResult');
        const startAnalysisBtn = document.getElementById('startAnalysisBtn');
        
        if (geminiStatus) {
            geminiStatus.textContent = '분석 실패';
            geminiStatus.style.color = 'var(--error)';
        }
        
        if (geminiAnalysisResult) {
            geminiAnalysisResult.innerHTML = `
                <div style="padding: 20px; background: var(--bg-input); border-radius: 8px; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                    <h4 style="margin-bottom: 10px; color: var(--error);">분석 중 오류가 발생했습니다</h4>
                    <p style="color: var(--text-secondary); margin-bottom: 15px;">${escapeHtml(error.message)}</p>
                    <button class="btn btn-primary" onclick="if(typeof window.startGeminiAnalysis === 'function') { window.startGeminiAnalysis(); }">
                        <i class="fas fa-redo"></i> 다시 시도
                    </button>
                </div>
            `;
        }
        
        if (startAnalysisBtn) {
            startAnalysisBtn.disabled = false;
            startAnalysisBtn.innerHTML = '<i class="fas fa-magic"></i> 분석 시작';
        }
        
        alert('⚠️ Gemini 분석 중 오류가 발생했습니다.\n\n' +
              '원인: ' + error.message + '\n\n' +
              '해결방법:\n' +
              '1. API 키가 올바른지 확인하세요\n' +
              '2. 네트워크 연결을 확인하세요\n' +
              '3. 잠시 후 다시 시도해주세요');
    }
};

// HTML 이스케이프 헬퍼 함수
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
// [MOVED] extraction block

// 선택된 개선안 개수 업데이트
window.updateSelectedCount = function() {
    const checkboxes = document.querySelectorAll('.improvement-checkbox:checked');
    const countEl = document.getElementById('selectedImprovementsCount');
    if (countEl) {
        countEl.textContent = checkboxes.length;
    }
};

// 전체 선택
window.selectAllImprovements = function() {
    const checkboxes = document.querySelectorAll('.improvement-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    updateSelectedCount();
    console.log('✅ 전체 개선안 선택 완료');
};

// 전체 해제
window.deselectAllImprovements = function() {
    const checkboxes = document.querySelectorAll('.improvement-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectedCount();
    console.log('✅ 전체 개선안 해제 완료');
};

// 선택한 항목만 적용
window.applySelectedImprovements = async function() {
    try {
        const checkboxes = document.querySelectorAll('.improvement-checkbox:checked');
        if (checkboxes.length === 0) {
            alert('⚠️ 적용할 개선안을 선택해주세요.');
            return;
        }
        
        const finalizedLyricsEl = document.getElementById('finalizedLyrics');
        const finalizedStyleEl = document.getElementById('finalizedStyle');
        const applySelectedBtn = document.getElementById('applySelectedBtn');
        
        if (!finalizedLyricsEl || !finalizedStyleEl) {
            alert('⚠️ 확정 가사 또는 스타일 필드를 찾을 수 없습니다.');
            return;
        }
        
        // 현재 가사와 스타일 가져오기
        let currentLyrics = finalizedLyricsEl.value || '';
        let currentStyle = finalizedStyleEl.value || '';
        
        // 2단계에서 원본 가져오기 (없으면 현재 값 사용)
        if (!currentLyrics) {
            currentLyrics = document.getElementById('sunoLyrics')?.value || '';
        }
        if (!currentStyle) {
            currentStyle = document.getElementById('stylePrompt')?.value || '';
        }
        
        if (!currentLyrics.trim()) {
            alert('⚠️ 적용할 가사가 없습니다.\n\n2단계에서 가사를 생성한 후 다시 시도해주세요.');
            return;
        }
        
        // 선택된 개선안 수집
        const selectedImprovements = [];
        const analysisData = window.currentProject?.data?.analysis;
        
        checkboxes.forEach(checkbox => {
            const index = parseInt(checkbox.dataset.index);
            const type = checkbox.dataset.type;
            
            if (type === 'feedback') {
                if (analysisData && analysisData.feedbacks && analysisData.feedbacks[index]) {
                    const feedback = analysisData.feedbacks[index];
                    if (feedback.suggestion) {
                        selectedImprovements.push({
                            type: 'feedback',
                            category: feedback.category || '제안',
                            suggestion: feedback.suggestion
                        });
                    }
                }
            } else {
                if (analysisData && analysisData.improvements && analysisData.improvements[index]) {
                    let improvement = analysisData.improvements[index];
                    if (typeof improvement === 'string') {
                        selectedImprovements.push({
                            type: 'improvement',
                            text: improvement
                        });
                    } else if (typeof improvement === 'object' && improvement !== null) {
                        selectedImprovements.push({
                            type: 'improvement',
                            text: improvement.text || improvement.content || improvement.suggestion || JSON.stringify(improvement)
                        });
                    }
                }
            }
        });
        
        if (selectedImprovements.length === 0) {
            alert('⚠️ 선택한 개선안을 찾을 수 없습니다.');
            return;
        }
        
        // 버튼 비활성화 및 로딩 표시
        if (applySelectedBtn) {
            applySelectedBtn.disabled = true;
            applySelectedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 적용 중...';
        }
        
        // Gemini API를 사용하여 개선안 반영
        const geminiKey = localStorage.getItem('gemini_api_key') || '';
        if (!geminiKey || !geminiKey.startsWith('AIza')) {
            alert('⚠️ Gemini API 키가 설정되지 않았습니다.\n\n"API 키" 버튼을 클릭하여 Gemini API 키를 설정해주세요.');
            if (applySelectedBtn) {
                applySelectedBtn.disabled = false;
                applySelectedBtn.innerHTML = '✅ 선택한 항목만 적용';
            }
            return;
        }
        
        // 개선안 텍스트 생성
        const improvementsText = selectedImprovements.map((item, idx) => {
            if (item.type === 'feedback') {
                return `${idx + 1}. [${item.category}] ${item.suggestion}`;
            } else {
                return `${idx + 1}. ${item.text}`;
            }
        }).join('\n');
        
        // 가사 개선 프롬프트
        const lyricsPrompt = `다음 가사에 아래 개선안을 반영하여 개선된 가사를 작성해주세요.

=== 현재 가사 ===
${currentLyrics}

=== 적용할 개선안 ===
${improvementsText}

=== 요청 사항 ===
1. 개선안을 자연스럽게 반영하여 가사를 개선해주세요
2. 지시어([Tempo:], [Instruments:], [Mod:], [Reverb:] 등)는 그대로 유지해주세요
3. 가사의 구조와 흐름을 유지하면서 개선안을 반영해주세요
4. 개선된 가사만 출력해주세요 (설명 없이)

=== 개선된 가사 ===`;

        // 스타일 프롬프트 개선 프롬프트
        const stylePrompt = `다음 스타일 프롬프트에 아래 개선안을 반영하여 개선된 스타일 프롬프트를 작성해주세요.

=== 현재 스타일 프롬프트 ===
${currentStyle}

=== 적용할 개선안 ===
${improvementsText}

=== 요청 사항 ===
1. 개선안을 자연스럽게 반영하여 스타일 프롬프트를 개선해주세요
2. 기존 스타일 요소들은 유지하면서 개선안을 반영해주세요
3. 개선된 스타일 프롬프트만 출력해주세요 (설명 없이)

=== 개선된 스타일 프롬프트 ===`;

        // Gemini API 호출 (가사와 스타일 동시 개선)
        const combinedPrompt = `다음 가사와 스타일 프롬프트에 아래 개선안을 반영하여 개선된 버전을 작성해주세요.

=== 현재 가사 ===
${currentLyrics}

=== 현재 스타일 프롬프트 ===
${currentStyle}

=== 적용할 개선안 ===
${improvementsText}

=== 요청 사항 ===
1. 개선안을 자연스럽게 반영하여 가사와 스타일 프롬프트를 개선해주세요
2. 가사의 지시어([Tempo:], [Instruments:], [Mod:], [Reverb:] 등)는 그대로 유지해주세요
3. 가사의 구조와 흐름을 유지하면서 개선안을 반영해주세요
4. 기존 스타일 요소들은 유지하면서 개선안을 반영해주세요

=== 응답 형식 ===
다음 JSON 형식으로 응답해주세요:

{
  "improvedLyrics": "개선된 가사 (지시어 포함)",
  "improvedStyle": "개선된 스타일 프롬프트"
}

**중요**: JSON 형식만 출력하고, 다른 설명이나 텍스트는 포함하지 마세요.`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: combinedPrompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 4000
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
        }
        
        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!aiResponse.trim()) {
            throw new Error('Gemini API에서 응답을 받지 못했습니다.');
        }
        
        // JSON 파싱 시도
        let improvedData;
        try {
            let cleanedResponse = aiResponse.trim();
            if (cleanedResponse.includes('```json')) {
                cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            } else if (cleanedResponse.includes('```')) {
                cleanedResponse = cleanedResponse.replace(/```\n?/g, '').trim();
            }
            
            const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                improvedData = JSON.parse(jsonMatch[0]);
            } else {
                // JSON이 아닌 경우 텍스트로 처리
                improvedData = {
                    improvedLyrics: aiResponse,
                    improvedStyle: currentStyle
                };
            }
        } catch (parseError) {
            console.error('JSON 파싱 오류:', parseError);
            // 파싱 실패 시 원본 텍스트 사용
            improvedData = {
                improvedLyrics: aiResponse,
                improvedStyle: currentStyle
            };
        }
        
        // 개선된 가사와 스타일 적용
        if (improvedData.improvedLyrics) {
            finalizedLyricsEl.value = improvedData.improvedLyrics;
            finalizedLyricsEl.readOnly = false; // 수정 가능하도록
        }
        
        if (improvedData.improvedStyle) {
            finalizedStyleEl.value = improvedData.improvedStyle;
            finalizedStyleEl.readOnly = false; // 수정 가능하도록
        }
        
        // 선택 해제
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        updateSelectedCount();
        
        // 버튼 복원
        if (applySelectedBtn) {
            applySelectedBtn.disabled = false;
            applySelectedBtn.innerHTML = '✅ 선택한 항목만 적용';
        }
        
        console.log('✅ 선택한 개선안 적용 완료:', selectedImprovements.length + '개');
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(`✅ ${selectedImprovements.length}개 개선안이 적용되었습니다!`);
        }
        
    } catch (error) {
        console.error('❌ 개선안 적용 오류:', error);
        
        const applySelectedBtn = document.getElementById('applySelectedBtn');
        if (applySelectedBtn) {
            applySelectedBtn.disabled = false;
            applySelectedBtn.innerHTML = '✅ 선택한 항목만 적용';
        }
        
        alert('⚠️ 개선안 적용 중 오류가 발생했습니다.\n\n' +
              '원인: ' + error.message + '\n\n' +
              '해결방법:\n' +
              '1. API 키가 올바른지 확인하세요\n' +
              '2. 네트워크 연결을 확인하세요\n' +
              '3. 잠시 후 다시 시도해주세요');
    }
};
// [MOVED] extraction block

// ═══════════════════════════════════════════════════════════════
// 5단계: 음원 업로드 및 분석 함수들
// ═══════════════════════════════════════════════════════════════

// 음원 파일 업로드 처리
window.handleIntermediateAudioUpload = function(event) {
    try {
        const fileInput = event.target;
        const file = fileInput.files[0];
        
        if (!file) {
            console.warn('⚠️ 파일이 선택되지 않았습니다.');
            return;
        }
        
        // 파일 타입 검증
        const validAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/webm'];
        const fileType = file.type || '';
        const fileName = file.name.toLowerCase();
        const isValidType = validAudioTypes.includes(fileType) || 
                           fileName.endsWith('.mp3') || 
                           fileName.endsWith('.wav') || 
                           fileName.endsWith('.m4a') || 
                           fileName.endsWith('.ogg') || 
                           fileName.endsWith('.webm');
        
        if (!isValidType) {
            alert('⚠️ 지원하지 않는 파일 형식입니다.\n\n지원 형식: MP3, WAV, M4A, OGG, WEBM');
            fileInput.value = ''; // 파일 선택 초기화
            return;
        }
        
        // 파일 크기 검증 (100MB 제한)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            alert('⚠️ 파일 크기가 너무 큽니다.\n\n최대 크기: 100MB\n현재 크기: ' + (file.size / 1024 / 1024).toFixed(2) + 'MB');
            fileInput.value = '';
            return;
        }
        
        console.log('✅ 음원 파일 선택됨:', file.name, '크기:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
        
        // 파일을 전역 변수에 저장
        window.intermediateAudioFile = file;
        
        // 업로드 영역 업데이트
        const uploadArea = fileInput.closest('.audio-upload-area');
        if (uploadArea) {
            uploadArea.style.borderColor = 'var(--success)';
            uploadArea.style.backgroundColor = 'var(--bg-card)';
            uploadArea.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 10px;">✅</div>
                <div style="color: var(--text-primary); font-weight: 600; margin-bottom: 5px;">${escapeHtml(file.name)}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 5px; cursor: pointer; text-decoration: underline;" onclick="event.stopPropagation(); document.getElementById('intermediateAudioFileInput').value = ''; window.intermediateAudioFile = null; location.reload();">다른 파일 선택</div>
            `;
        }
        
        // 분석 버튼 표시
        const analyzeBtn = document.getElementById('analyzeIntermediateAudioBtn');
        if (analyzeBtn) {
            analyzeBtn.style.display = 'block';
        }
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator('✅ 음원 파일이 업로드되었습니다!');
        }
        
    } catch (error) {
        console.error('❌ 음원 업로드 오류:', error);
        alert('⚠️ 음원 파일 업로드 중 오류가 발생했습니다.\n\n' + error.message);
    }
};

// 음원 분석 및 최종 가사 반영
window.analyzeIntermediateAudio = async function() {
    try {
        if (!window.intermediateAudioFile) {
            alert('⚠️ 음원 파일을 먼저 업로드해주세요.');
            return;
        }
        
        const analyzeBtn = document.getElementById('analyzeIntermediateAudioBtn');
        const progressDiv = document.getElementById('intermediateVersionProgress');
        
        if (!analyzeBtn || !progressDiv) {
            alert('⚠️ 분석 UI 요소를 찾을 수 없습니다.');
            return;
        }
        
        // 버튼 비활성화 및 로딩 표시
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 분석 중...';
        progressDiv.style.display = 'block';
        progressDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner" style="margin: 0 auto 20px;"></div><p>🎵 음원을 분석하고 가사를 추출하는 중...</p></div>';
        
        // Gemini API 키 확인
        const geminiKey = localStorage.getItem('gemini_api_key') || '';
        if (!geminiKey || !geminiKey.startsWith('AIza')) {
            alert('⚠️ Gemini API 키가 설정되지 않았습니다.\n\n"API 키" 버튼을 클릭하여 Gemini API 키를 설정해주세요.');
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '🔍 음원 분석 및 최종 가사 반영';
            progressDiv.style.display = 'none';
            return;
        }
        
        // 음원 파일을 Base64로 변환
        const file = window.intermediateAudioFile;
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const base64Audio = e.target.result.split(',')[1]; // data:audio/...;base64, 부분 제거
                
                progressDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner" style="margin: 0 auto 20px;"></div><p>🤖 Gemini가 음원을 분석하고 가사를 추출하는 중...</p></div>';
                
                // 현재 가사와 스타일 가져오기 (Suno 가사란/스타일란 참조)
                const sunoLyricsForCopy = document.getElementById('intermediateLyricsPreview')?.textContent || 
                                         document.getElementById('finalLyrics')?.textContent || 
                                         document.getElementById('finalizedLyrics')?.value || 
                                         document.getElementById('sunoLyrics')?.value || '';
                
                const sunoStyleForCopy = document.getElementById('intermediateStylePreview')?.textContent || 
                                       document.getElementById('finalStyle')?.textContent || 
                                       document.getElementById('finalizedStyle')?.value || 
                                       document.getElementById('stylePrompt')?.value || '';
                
                // 지침서 가져오기
                const guidelines = localStorage.getItem('musicCreatorGuidelines') || '';
                
                // Gemini API를 사용하여 음원에서 가사 추출 및 분석
                const prompt = `다음 음원 파일을 분석하여 다음을 수행해주세요:

1. **가사 추출**: 음원에서 들리는 가사를 정확하게 추출해주세요
2. **지시어 포함 가사 형식**: 추출한 가사를 "Suno 가사란에 복사할 내용" 형식(지시어 포함)으로 변환해주세요
3. **가사 분석**: 추출한 가사가 원본 가사와 일치하는지 확인하고, 차이점이 있으면 알려주세요
4. **스타일 프롬프트 분석**: 음원의 스타일이 원본 스타일 프롬프트와 일치하는지 확인해주세요
5. **개선 제안**: 음원을 듣고 가사나 스타일 프롬프트에 대한 개선 제안을 해주세요

${sunoLyricsForCopy ? `=== 참고: Suno 가사란에 복사할 내용 (원본 가사 - 지시어 포함) ===
${sunoLyricsForCopy}

` : ''}${sunoStyleForCopy ? `=== 참고: Suno 스타일란에 복사할 내용 (원본 스타일 프롬프트) ===
${sunoStyleForCopy}

` : ''}${guidelines ? `=== 참고: 뮤직모리 제작 지침서 ===
${guidelines.substring(0, 2000)}${guidelines.length > 2000 ? '...' : ''}

` : ''}=== 분석 요청 사항 ===

1. **가사 추출 및 형식 변환**:
   - 음원에서 들리는 가사를 정확하게 추출
   - 추출한 가사를 "Suno 가사란에 복사할 내용" 형식으로 변환
   - 지시어([Tempo:], [Vocal:], [Instruments:], [Mod:], [Reverb:] 등)를 적절히 포함
   - 원본 가사의 구조([Intro], [Verse 1], [Chorus] 등)를 참고하여 유사한 구조로 작성
   - 지침서의 가사 구조 규칙을 준수

2. **원본 가사와 비교**:
   - 추출한 가사가 원본 가사와 일치하는지 확인
   - 차이점이 있으면 구체적으로 설명
   - 지시어의 차이점도 포함하여 설명

3. **스타일 프롬프트 분석**:
   - 음원의 스타일이 원본 스타일 프롬프트와 일치하는지 확인
   - 차이점이 있으면 구체적으로 설명

4. **개선 제안**:
   - 가사 개선 제안 (구조, 내용, 지시어 등)
   - 스타일 프롬프트 개선 제안
   - 지침서를 참고하여 구체적인 개선 방안 제시

=== 응답 형식 ===
다음 JSON 형식으로 응답해주세요:

{
  "extractedLyrics": "추출된 가사 (지시어 포함, Suno 가사란 형식)",
  "extractedLyricsPlain": "추출된 가사 (지시어 제외, 순수 가사만)",
  "matchesOriginal": true/false,
  "differences": "원본과의 차이점 설명 (가사 내용, 지시어, 구조 등)",
  "styleMatches": true/false,
  "styleDifferences": "스타일 프롬프트 차이점 설명",
  "suggestions": [
    "가사 개선 제안 1",
    "가사 개선 제안 2",
    "스타일 프롬프트 개선 제안 1"
  ],
  "analysis": "음원 분석 결과 및 평가 (전체적인 평가, 품질, 개선점 등)"
}

**중요**: 
- JSON 형식만 출력하고, 다른 설명이나 텍스트는 포함하지 마세요.
- "extractedLyrics"는 반드시 지시어가 포함된 "Suno 가사란에 복사할 내용" 형식으로 작성해주세요.
- 지침서의 가사 구조 규칙을 준수하여 작성해주세요.`;

                // Gemini API 호출 (음원 파일 포함)
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
                
                const response = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                {
                                    inlineData: {
                                        mimeType: file.type || 'audio/mpeg',
                                        data: base64Audio
                                    }
                                }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 4000
                        }
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
                }
                
                const data = await response.json();
                const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                
                if (!aiResponse.trim()) {
                    throw new Error('Gemini API에서 응답을 받지 못했습니다.');
                }
                
                // JSON 파싱 시도
                let analysisData;
                try {
                    let cleanedResponse = aiResponse.trim();
                    if (cleanedResponse.includes('```json')) {
                        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    } else if (cleanedResponse.includes('```')) {
                        cleanedResponse = cleanedResponse.replace(/```\n?/g, '').trim();
                    }
                    
                    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        analysisData = JSON.parse(jsonMatch[0]);
                    } else {
                        // JSON이 아닌 경우 텍스트로 처리
                        analysisData = {
                            extractedLyrics: aiResponse,
                            analysis: aiResponse
                        };
                    }
                } catch (parseError) {
                    console.error('JSON 파싱 오류:', parseError);
                    analysisData = {
                        extractedLyrics: aiResponse,
                        analysis: aiResponse
                    };
                }
                
                // 분석 결과 표시
                let resultHtml = '<div style="padding: 20px;">';
                resultHtml += '<h4 style="margin-bottom: 15px; color: var(--text-primary);">🎵 음원 분석 결과</h4>';
                
                // 추출된 가사 (지시어 포함) 표시
                if (analysisData.extractedLyrics) {
                    resultHtml += `
                        <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
                            <h5 style="margin-bottom: 10px; color: var(--accent);">📝 추출된 가사 (지시어 포함 - Suno 가사란 형식)</h5>
                            <div style="white-space: pre-wrap; color: var(--text-secondary); line-height: 1.8; font-family: monospace; font-size: 0.9rem; background: var(--bg-card); padding: 15px; border-radius: 6px; border: 1px solid var(--border);">${escapeHtml(analysisData.extractedLyrics)}</div>
                            <div style="margin-top: 10px; font-size: 0.85rem; color: var(--text-secondary);">
                                💡 이 가사는 "Suno 가사란에 복사할 내용" 형식으로 작성되었습니다. 지시어가 포함되어 있어 Suno에 바로 사용할 수 있습니다.
                            </div>
                        </div>
                    `;
                }
                
                // 추출된 가사 (순수 가사만) 표시
                if (analysisData.extractedLyricsPlain) {
                    resultHtml += `
                        <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
                            <h5 style="margin-bottom: 10px; color: var(--accent);">📝 추출된 가사 (순수 가사만)</h5>
                            <div style="white-space: pre-wrap; color: var(--text-secondary); line-height: 1.8; font-family: monospace; font-size: 0.9rem;">${escapeHtml(analysisData.extractedLyricsPlain)}</div>
                        </div>
                    `;
                }
                
                if (analysisData.matchesOriginal !== undefined) {
                    resultHtml += `
                        <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
                            <h5 style="margin-bottom: 10px; color: var(--accent);">✅ 원본 일치 여부</h5>
                            <div style="color: var(--text-primary); font-size: 1.1rem; font-weight: 600;">
                                ${analysisData.matchesOriginal ? '✅ 원본 가사와 일치합니다' : '⚠️ 원본 가사와 차이가 있습니다'}
                            </div>
                        </div>
                    `;
                }
                
                if (analysisData.differences) {
                    resultHtml += `
                        <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
                            <h5 style="margin-bottom: 10px; color: var(--accent);">📊 가사 차이점</h5>
                            <div style="white-space: pre-wrap; color: var(--text-secondary); line-height: 1.8;">${escapeHtml(analysisData.differences)}</div>
                        </div>
                    `;
                }
                
                // 스타일 프롬프트 차이점 표시
                if (analysisData.styleMatches !== undefined) {
                    resultHtml += `
                        <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
                            <h5 style="margin-bottom: 10px; color: var(--accent);">🎨 스타일 프롬프트 일치 여부</h5>
                            <div style="color: var(--text-primary); font-size: 1.1rem; font-weight: 600; margin-bottom: 10px;">
                                ${analysisData.styleMatches ? '✅ 원본 스타일 프롬프트와 일치합니다' : '⚠️ 원본 스타일 프롬프트와 차이가 있습니다'}
                            </div>
                            ${analysisData.styleDifferences ? `<div style="white-space: pre-wrap; color: var(--text-secondary); line-height: 1.8; margin-top: 10px;">${escapeHtml(analysisData.styleDifferences)}</div>` : ''}
                        </div>
                    `;
                }
                
                if (analysisData.suggestions && analysisData.suggestions.length > 0) {
                    resultHtml += `
                        <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
                            <h5 style="margin-bottom: 10px; color: var(--accent);">💡 개선 제안</h5>
                            <ul style="margin: 0; padding-left: 20px; line-height: 2;">
                    `;
                    analysisData.suggestions.forEach(suggestion => {
                        resultHtml += `<li style="color: var(--text-secondary); margin-bottom: 8px;">${escapeHtml(suggestion)}</li>`;
                    });
                    resultHtml += `</ul></div>`;
                }
                
                if (analysisData.analysis) {
                    resultHtml += `
                        <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-input); border-radius: 8px;">
                            <h5 style="margin-bottom: 10px; color: var(--accent);">🔍 분석 결과</h5>
                            <div style="white-space: pre-wrap; color: var(--text-secondary); line-height: 1.8;">${escapeHtml(analysisData.analysis)}</div>
                        </div>
                    `;
                }
                
                // 추출된 가사를 최종 가사에 반영 버튼
                if (analysisData.extractedLyrics) {
                    // 전역 변수에 저장
                    window.extractedLyricsForApply = analysisData.extractedLyrics;
                    
                    resultHtml += `
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);">
                            <button class="btn btn-success" onclick="if(typeof window.applyExtractedLyrics === 'function') { window.applyExtractedLyrics(); } else { alert('⚠️ 기능을 사용할 수 없습니다.'); }" style="width: 100%;">
                                ✅ 추출된 가사를 최종 가사에 반영
                            </button>
                        </div>
                    `;
                }
                
                resultHtml += '</div>';
                progressDiv.innerHTML = resultHtml;
                
                // 분석 결과를 전역 변수에 저장
                window.intermediateAudioAnalysis = analysisData;
                
                // 버튼 복원
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = '🔍 음원 분석 및 최종 가사 반영';
                
                console.log('✅ 음원 분석 완료:', analysisData);
                
                if (typeof window.showCopyIndicator === 'function') {
                    window.showCopyIndicator('✅ 음원 분석이 완료되었습니다!');
                }
                
            } catch (error) {
                console.error('❌ 음원 분석 오류:', error);
                
                progressDiv.innerHTML = `
                    <div style="padding: 20px; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                        <h4 style="margin-bottom: 10px; color: var(--error);">분석 중 오류가 발생했습니다</h4>
                        <p style="color: var(--text-secondary); margin-bottom: 15px;">${escapeHtml(error.message)}</p>
                        <button class="btn btn-primary" onclick="if(typeof window.analyzeIntermediateAudio === 'function') { window.analyzeIntermediateAudio(); }">
                            <i class="fas fa-redo"></i> 다시 시도
                        </button>
                    </div>
                `;
                
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = '🔍 음원 분석 및 최종 가사 반영';
                
                alert('⚠️ 음원 분석 중 오류가 발생했습니다.\n\n' +
                      '원인: ' + error.message + '\n\n' +
                      '해결방법:\n' +
                      '1. API 키가 올바른지 확인하세요\n' +
                      '2. 파일 형식이 지원되는지 확인하세요\n' +
                      '3. 네트워크 연결을 확인하세요\n' +
                      '4. 잠시 후 다시 시도해주세요');
            }
        };
        
        reader.onerror = function(error) {
            console.error('❌ 파일 읽기 오류:', error);
            alert('⚠️ 파일을 읽는 중 오류가 발생했습니다.');
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '🔍 음원 분석 및 최종 가사 반영';
            progressDiv.style.display = 'none';
        };
        
        // 파일을 Base64로 읽기
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error('❌ 음원 분석 오류:', error);
        alert('⚠️ 음원 분석 중 오류가 발생했습니다.\n\n' + error.message);
        
        const analyzeBtn = document.getElementById('analyzeIntermediateAudioBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '🔍 음원 분석 및 최종 가사 반영';
        }
        
        const progressDiv = document.getElementById('intermediateVersionProgress');
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }
    }
};
// [MOVED] extraction block

// ═══════════════════════════════════════════════════════════════
// 5단계: 최종 평가 요약 생성 함수
// ═══════════════════════════════════════════════════════════════
/** 점수(0-100)로 등급 문자열 반환 */
function getGradeFromScore(score) {
    const n = Math.min(100, Math.max(0, parseInt(score, 10) || 0));
    if (n >= 95) return 'S+';
    if (n >= 90) return 'S';
    if (n >= 85) return 'A+';
    if (n >= 80) return 'A';
    if (n >= 75) return 'B+';
    if (n >= 70) return 'B';
    if (n >= 65) return 'C+';
    if (n >= 60) return 'C';
    if (n >= 50) return 'D';
    return 'F';
}

/** 최종 평가 요약 UI만 갱신 (수치, 등급, 프로그레스 바) */
window.updateFinalEvaluationUI = function(beforeScoreVal, afterScoreVal, aiCommentText) {
    const beforeScoreEl = document.getElementById('beforeScore');
    const afterScoreEl = document.getElementById('afterScore');
    const finalGradeEl = document.getElementById('finalGrade');
    const beforeBar = document.getElementById('beforeScoreBar');
    const afterBar = document.getElementById('afterScoreBar');
    const aiCommentEl = document.getElementById('aiComment');
    const before = Math.min(100, Math.max(0, parseInt(beforeScoreVal, 10) || 0));
    const after = Math.min(100, Math.max(0, parseInt(afterScoreVal, 10) || 0));
    if (beforeScoreEl) beforeScoreEl.textContent = before;
    if (afterScoreEl) afterScoreEl.textContent = after;
    if (finalGradeEl) finalGradeEl.textContent = getGradeFromScore(after);
    if (beforeBar) beforeBar.style.width = before + '%';
    if (afterBar) afterBar.style.width = after + '%';
    if (aiCommentText != null && aiCommentEl) aiCommentEl.textContent = aiCommentText;
};

window.generateFinalEvaluation = async function() {
    try {
        const beforeScoreEl = document.getElementById('beforeScore');
        const afterScoreEl = document.getElementById('afterScore');
        const aiCommentEl = document.getElementById('aiComment');
        const finalGradeEl = document.getElementById('finalGrade');
        
        if (!beforeScoreEl || !afterScoreEl || !aiCommentEl) {
            console.warn('⚠️ 최종 평가 UI 요소를 찾을 수 없습니다.');
            return;
        }
        
        // 3단계 분석 결과 가져오기
        const analysisData = window.currentProject?.data?.analysis;
        const beforeScore = analysisData?.scores?.overall || analysisData?.scores?.overallScore || 0;
        
        // 현재 최종 가사와 스타일 가져오기
        const finalLyrics = document.getElementById('finalLyrics')?.textContent || 
                           document.getElementById('finalizedLyrics')?.value || '';
        const finalStyle = document.getElementById('finalStyle')?.textContent || 
                          document.getElementById('finalizedStyle')?.value || '';
        
        // 2단계 원본 가사와 스타일 가져오기 (비교용)
        const originalLyrics = document.getElementById('sunoLyrics')?.value || '';
        const originalStyle = document.getElementById('stylePrompt')?.value || '';
        
        if (!finalLyrics.trim()) {
            console.warn('⚠️ 최종 가사가 없어 평가를 생성할 수 없습니다.');
            const def = Math.min(100, Math.max(0, parseInt(beforeScore, 10) || 0));
            if (typeof window.updateFinalEvaluationUI === 'function') {
                window.updateFinalEvaluationUI(def, def, '최종 가사가 없어 평가를 생성할 수 없습니다.\n\n4-5단계에서 최종 가사를 확인한 후 다시 시도해주세요.');
            } else {
                if (beforeScoreEl) beforeScoreEl.textContent = def;
                if (afterScoreEl) afterScoreEl.textContent = def;
                if (aiCommentEl) aiCommentEl.textContent = '최종 가사가 없어 평가를 생성할 수 없습니다.\n\n4-5단계에서 최종 가사를 확인한 후 다시 시도해주세요.';
                if (finalGradeEl) finalGradeEl.textContent = getGradeFromScore(def);
            }
            return;
        }
        
        // Gemini API 키 확인
        const geminiKey = localStorage.getItem('gemini_api_key') || '';
        if (!geminiKey || !geminiKey.startsWith('AIza')) {
            console.warn('⚠️ Gemini API 키가 없어 평가를 생성할 수 없습니다.');
            const def = Math.min(100, Math.max(0, parseInt(beforeScore, 10) || 0));
            if (typeof window.updateFinalEvaluationUI === 'function') {
                window.updateFinalEvaluationUI(def, def, 'Gemini API 키를 설정하면 자동으로 최종 평가를 생성할 수 있습니다.');
            } else {
                if (beforeScoreEl) beforeScoreEl.textContent = def;
                if (afterScoreEl) afterScoreEl.textContent = def;
                if (aiCommentEl) aiCommentEl.textContent = 'Gemini API 키를 설정하면 자동으로 최종 평가를 생성할 수 있습니다.';
            }
            return;
        }
        
        // 지침서 가져오기
        const guidelines = localStorage.getItem('musicCreatorGuidelines') || '';
        
        // 최종 평가 생성 프롬프트
        const evaluationPrompt = `다음 정보를 바탕으로 최종 평가를 생성해주세요.

=== 개선 전 가사 (2단계 원본) ===
${originalLyrics || '없음'}

=== 개선 전 스타일 프롬프트 (2단계 원본) ===
${originalStyle || '없음'}

=== 개선 후 가사 (4-5단계 최종) ===
${finalLyrics}

=== 개선 후 스타일 프롬프트 (4-5단계 최종) ===
${finalStyle || '없음'}

${analysisData ? `=== 3단계 분석 결과 ===
종합 점수: ${beforeScore}점
${analysisData.feedbacks ? `피드백: ${JSON.stringify(analysisData.feedbacks).substring(0, 500)}` : ''}
${analysisData.improvements ? `개선안: ${JSON.stringify(analysisData.improvements).substring(0, 500)}` : ''}

` : ''}${guidelines ? `=== 제작 지침서 (참고) ===
${guidelines.substring(0, 1000)}${guidelines.length > 1000 ? '...' : ''}

` : ''}=== 평가 요청 사항 ===

1. **개선 전 점수 (beforeScore)**: 3단계 분석 결과의 종합 점수를 사용하거나, 개선 전 가사와 스타일을 평가하여 0-100점으로 점수를 매겨주세요.

2. **개선 후 점수 (afterScore)**: 개선 후 최종 가사와 스타일 프롬프트를 평가하여 0-100점으로 점수를 매겨주세요. 개선안이 잘 반영되었는지, 가사의 품질이 향상되었는지를 종합적으로 평가해주세요.

3. **AI 최종 코멘트**: 개선 전후의 변화를 분석하고, 장점과 개선점을 포함한 격려와 조언이 담긴 코멘트를 작성해주세요.

=== 응답 형식 ===
다음 JSON 형식으로 응답해주세요:

{
  "beforeScore": 85,
  "afterScore": 92,
  "aiComment": "개선 전 가사도 이미 좋은 품질이었지만, 개선안을 반영한 후 더욱 완성도 높은 작품이 되었습니다. 특히 가사의 구조와 감정 표현이 더욱 명확해졌고, 스타일 프롬프트도 더욱 구체화되었습니다. 계속 이렇게 노력하시면 더욱 훌륭한 작품을 만들 수 있을 것입니다!"
}

**중요**: JSON 형식만 출력하고, 다른 설명이나 텍스트는 포함하지 마세요.`;

        // Gemini API 호출
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: evaluationPrompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2000
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
        }
        
        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!aiResponse.trim()) {
            throw new Error('Gemini API에서 응답을 받지 못했습니다.');
        }
        
        // JSON 파싱 시도
        let evaluationData;
        try {
            let cleanedResponse = aiResponse.trim();
            if (cleanedResponse.includes('```json')) {
                cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            } else if (cleanedResponse.includes('```')) {
                cleanedResponse = cleanedResponse.replace(/```\n?/g, '').trim();
            }
            
            const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                evaluationData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('JSON 형식을 찾을 수 없습니다.');
            }
        } catch (parseError) {
            console.error('JSON 파싱 오류:', parseError);
            // 파싱 실패 시 기본값 사용
            evaluationData = {
                beforeScore: beforeScore || 0,
                afterScore: beforeScore || 0,
                aiComment: aiResponse.substring(0, 500) || '평가를 생성할 수 없습니다.'
            };
        }
        
        // 점수 정수화 (0-100) 후 UI 갱신 (수치·등급·프로그레스 바)
        const beforeScoreValue = Math.min(100, Math.max(0, parseInt(evaluationData.beforeScore ?? beforeScore, 10) || 0));
        const afterScoreValue = Math.min(100, Math.max(0, parseInt(evaluationData.afterScore ?? beforeScore, 10) || 0));
        
        if (typeof window.updateFinalEvaluationUI === 'function') {
            window.updateFinalEvaluationUI(beforeScoreValue, afterScoreValue, evaluationData.aiComment || '평가 코멘트를 생성할 수 없습니다.');
        } else {
            if (beforeScoreEl) beforeScoreEl.textContent = beforeScoreValue;
            if (afterScoreEl) afterScoreEl.textContent = afterScoreValue;
            if (finalGradeEl) finalGradeEl.textContent = getGradeFromScore(afterScoreValue);
            if (aiCommentEl) aiCommentEl.textContent = evaluationData.aiComment || '평가 코멘트를 생성할 수 없습니다.';
        }
        
        // 프로젝트 데이터에 저장
        if (window.currentProject) {
            if (!window.currentProject.data) {
                window.currentProject.data = {};
            }
            window.currentProject.data.beforeScore = beforeScoreValue;
            window.currentProject.data.afterScore = afterScoreValue;
            window.currentProject.data.aiComment = evaluationData.aiComment || '';
        }
        
        console.log('✅ 최종 평가 요약 생성 완료:', {
            beforeScore: beforeScoreValue,
            afterScore: afterScoreValue
        });
        
    } catch (error) {
        console.error('❌ 최종 평가 생성 오류:', error);
        const analysisData = window.currentProject?.data?.analysis;
        const defaultScore = Math.min(100, Math.max(0, parseInt(analysisData?.scores?.overall ?? analysisData?.scores?.overallScore ?? 0, 10) || 0));
        if (typeof window.updateFinalEvaluationUI === 'function') {
            window.updateFinalEvaluationUI(defaultScore, defaultScore, '평가를 생성하는 중 오류가 발생했습니다. ' + error.message);
        } else {
            const beforeScoreEl = document.getElementById('beforeScore');
            const afterScoreEl = document.getElementById('afterScore');
            const aiCommentEl = document.getElementById('aiComment');
            if (beforeScoreEl) beforeScoreEl.textContent = defaultScore;
            if (afterScoreEl) afterScoreEl.textContent = defaultScore;
            if (aiCommentEl) aiCommentEl.textContent = '평가를 생성하는 중 오류가 발생했습니다. ' + error.message;
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// 5단계 → 6단계 이동 (데이터 전달 포함)
// ═══════════════════════════════════════════════════════════════
window.goToMarketingStep = function() {
    try {
        // "다음 단계로" 버튼 클릭 시 수정 모드 활성화 (데이터 수정 반영)
        window.editMode = true;
        if (typeof window.updateEditModeUI === 'function') {
            window.updateEditModeUI();
        }
        if (typeof window.setReadOnlyMode === 'function') {
            window.setReadOnlyMode(false);
        }
        
        // 5단계 데이터 수집 (여러 소스에서 시도)
        const finalTitle = document.getElementById('finalTitleText')?.textContent || 
                          window.currentSunoTitle || 
                          document.getElementById('sunoTitle')?.value || 
                          document.getElementById('songTitle')?.value || 
                          '제목 없음';
        
        const finalLyrics = document.getElementById('finalLyrics')?.textContent || 
                           window.currentFinalLyrics || 
                           document.getElementById('finalizedLyrics')?.value || 
                           '';
        
        const finalStyle = document.getElementById('finalStyle')?.textContent || 
                          window.currentFinalStyle || 
                          document.getElementById('finalizedStyle')?.value || 
                          '';
        
        // ═══════════════════════════════════════════════════════════════
        // 5단계 데이터를 전역 변수에 저장 (마케팅 생성 시 사용)
        // ═══════════════════════════════════════════════════════════════
        
        window.marketingData = {
            title: finalTitle,
            lyrics: finalLyrics,
            style: finalStyle
        };
        
        console.log('✅ 6단계 마케팅 데이터 준비:', {
            title: finalTitle,
            lyricsLength: finalLyrics.length,
            styleLength: finalStyle.length
        });
        
        // ═══════════════════════════════════════════════════════════════
        
        // 6단계로 이동
        if (typeof window.goToStep === 'function') {
            window.goToStep(6, true, false);
            console.log('✅ 5단계 → 6단계 이동 완료 (제목, 가사, 스타일 프롬프트 전달됨)');
        }
        
        // 마케팅 자료 자동 생성 (저장된 자료가 없는 경우)
        if (typeof window.generateMarketingMaterials === 'function') {
            setTimeout(() => {
                window.generateMarketingMaterials();
            }, 500);
        } else {
            // 생성 함수가 없으면 로딩 화면 유지
            const marketingLoading = document.getElementById('marketingLoading');
            if (marketingLoading) {
                marketingLoading.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                        <h4 style="margin-bottom: 10px; color: var(--error);">마케팅 자료 생성 기능을 사용할 수 없습니다</h4>
                        <p style="color: var(--text-secondary);">페이지를 새로고침(F5) 후 다시 시도해주세요.</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('❌ 5→6단계 이동 오류:', error);
        alert('⚠️ 5단계 → 6단계 이동 중 오류가 발생했습니다.\n\n' +
              '원인: ' + error.message + '\n\n' +
              '해결방법: 페이지를 새로고침(F5) 후 다시 시도해주세요.');
    }
};

// ═══════════════════════════════════════════════════════════════
// 복사 함수
// ═══════════════════════════════════════════════════════════════
window.copyToClipboard = function(elementId, labelOrText, event) {
    try {
        let text = '';
        let label = '';
        
        // 두 번째 인자가 문자열이고 elementId가 null이면 직접 텍스트로 간주
        if (!elementId && typeof labelOrText === 'string' && labelOrText.length > 0) {
            // elementId가 null이고 labelOrText가 긴 문자열이면 직접 복사할 텍스트로 간주
            // 하지만 label이 짧은 경우(예: "썸네일")는 label로 간주
            if (labelOrText.length > 50 || !document.getElementById(labelOrText)) {
                text = labelOrText;
                label = '내용';
            } else {
                // elementId로 시도
                const el = document.getElementById(labelOrText);
                if (el) {
                    text = el.value || el.textContent || el.innerText || '';
                    label = '내용';
                }
            }
        } else if (elementId) {
            // elementId가 제공된 경우
            const el = document.getElementById(elementId);
            if (el) {
                text = el.value || el.textContent || el.innerText || '';
            }
            label = labelOrText || '내용';
        } else if (event && event.target) {
            // event를 통해 부모 요소에서 텍스트 가져오기
            const parent = event.target.closest('.thumbnail-item, .output-box, .card');
            if (parent) {
                text = parent.textContent || parent.innerText || '';
            }
            label = labelOrText || '내용';
        }
        
        if (!text.trim()) {
            alert('복사할 내용이 없습니다.');
            return;
        }
        
        // event 전파 중지
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        
        navigator.clipboard.writeText(text).then(() => {
            console.log(`✅ ${label || '내용'}이 클립보드에 복사되었습니다!`);
            if (typeof window.showCopyIndicator === 'function') {
                window.showCopyIndicator(`✅ ${label || '내용'}이 클립보드에 복사되었습니다!`);
            } else {
                alert(`${label || '내용'}이 클립보드에 복사되었습니다.`);
            }
        }).catch(() => {
            // 폴백
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            console.log(`✅ ${label || '내용'}이 클립보드에 복사되었습니다!`);
            if (typeof window.showCopyIndicator === 'function') {
                window.showCopyIndicator(`✅ ${label || '내용'}이 클립보드에 복사되었습니다!`);
            } else {
                alert(`${label || '내용'}이 클립보드에 복사되었습니다.`);
            }
        });
    } catch (error) {
        console.error('복사 오류:', error);
        alert('복사 중 오류가 발생했습니다.');
    }
};

// ═══════════════════════════════════════════════════════════════
// 유틸리티 함수들
// ═══════════════════════════════════════════════════════════════
window.showCopyIndicator = function(message) {
    console.log(message);
    if (message) {
        const indicator = document.createElement('div');
        indicator.textContent = message;
        indicator.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--success); color: white; padding: 15px 20px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
        document.body.appendChild(indicator);
                setTimeout(() => {
            indicator.remove();
        }, 3000);
    }
};

// ═══════════════════════════════════════════════════════════════
// 6단계 → 새로 시작 (전체 초기화)
// ═══════════════════════════════════════════════════════════════
window.resetAll = function() {
    if (confirm('모든 내용을 초기화하시겠습니까?')) {
        try {
            // 수정 모드 비활성화
            window.editMode = false;
            if (typeof window.updateEditModeUI === 'function') {
                window.updateEditModeUI();
            }
            if (typeof window.setReadOnlyMode === 'function') {
                window.setReadOnlyMode(false); // 새 프로젝트는 수정 가능
            }
            
            // 모든 input과 textarea 초기화
            const inputs = document.querySelectorAll('input[type="text"], textarea');
            inputs.forEach(input => {
                if (input.id !== 'importFile' && input.id !== 'backupFileInput') {
                    input.value = '';
                }
            });
            
            // 모든 표시용 div 초기화
            const displayElements = [
                'analysisTargetLyrics', 'analysisTargetStyle',
                'finalLyrics', 'finalStyle', 'finalTitleText',
                'intermediateLyricsPreview', 'intermediateStylePreview',
                'youtubeDesc', 'tiktokDesc', 'hashtagsContent'
            ];
            
            displayElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = '';
                }
            });
            
            // 전역 변수 초기화
            window.currentProject = null;
            window.currentProjectId = null;
            window.currentSunoTitle = null;
            window.currentFinalLyrics = null;
            window.currentFinalStyle = null;
            window.marketingData = null;
            window.selectedLyricsIndex = null;
            window.generatedLyricsOptions = null;
            window.vocalPartAssignments = {}; // 파트별 보컬 스타일 지정 초기화
            
            // 태그 버튼 선택 해제
            const tagBtns = document.querySelectorAll('.tag-btn.active');
            tagBtns.forEach(btn => {
                // 기본 선택 태그는 유지 (예: Wide Stereo)
                if (btn.dataset.value !== 'Wide Stereo') {
                    btn.classList.remove('active');
                }
            });
            
            // AI 생성 결과 숨기기
            const aiGeneratedResults = document.getElementById('aiGeneratedResults');
            if (aiGeneratedResults) {
                aiGeneratedResults.style.display = 'none';
            }
            
            // 1단계로 이동
            if (typeof window.goToStep === 'function') {
                window.goToStep(1, false, true);
            }
            
            console.log('✅ 전체 초기화 완료 → 1단계로 이동');
            alert('✅ 모든 내용이 초기화되었습니다. 새로운 프로젝트를 시작하세요!');
        } catch (error) {
            console.error('❌ 초기화 오류:', error);
            alert('⚠️ 초기화 중 오류가 발생했습니다.\n\n' +
                  '원인: ' + error.message + '\n\n' +
                  '해결방법: 페이지를 새로고침(F5) 후 다시 시도해주세요.');
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// 템포 (BPM) 관련 함수들
// ═══════════════════════════════════════════════════════════════

// 템포 슬라이더 및 프리셋 버튼 초기화
window.initTempoControls = function() {
    const tempoSlider = document.getElementById('tempoSlider');
    const tempoValue = document.getElementById('tempoValue');
    const tempoPresetBtns = document.querySelectorAll('.tempo-preset-btn');
    
    if (tempoSlider && tempoValue) {
        // 슬라이더 변경 이벤트
        tempoSlider.addEventListener('input', function() {
            tempoValue.textContent = this.value;
            
            // 프리셋 버튼 활성화 상태 업데이트
            tempoPresetBtns.forEach(btn => {
                const btnTempo = parseInt(btn.dataset.tempo);
                if (btnTempo === parseInt(this.value)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });
    }
    
    // 프리셋 버튼 클릭 이벤트
    tempoPresetBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tempo = this.dataset.tempo;
            if (tempo && tempoSlider && tempoValue) {
                tempoSlider.value = tempo;
                tempoValue.textContent = tempo;
                
                // 모든 버튼에서 active 제거 후 현재 버튼에 추가
                tempoPresetBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                console.log('✅ 템포 설정:', tempo, 'BPM');
            }
        });
    });
    
    console.log('✅ 템포 컨트롤 초기화 완료');
};

// 현재 템포 값 가져오기
window.getCurrentTempo = function() {
    const tempoSlider = document.getElementById('tempoSlider');
    return tempoSlider ? parseInt(tempoSlider.value) : 80;
};

// 템포 설정
window.setTempo = function(bpm) {
    const tempoSlider = document.getElementById('tempoSlider');
    const tempoValue = document.getElementById('tempoValue');
    const tempoPresetBtns = document.querySelectorAll('.tempo-preset-btn');
    
    if (tempoSlider && tempoValue) {
        tempoSlider.value = bpm;
        tempoValue.textContent = bpm;
        
        // 프리셋 버튼 활성화 상태 업데이트
        tempoPresetBtns.forEach(btn => {
            const btnTempo = parseInt(btn.dataset.tempo);
            if (btnTempo === parseInt(bpm)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
};

// 페이지 로드 시 템포 컨트롤 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 약간의 지연 후 초기화 (다른 스크립트들이 먼저 로드되도록)
    setTimeout(() => {
        if (typeof window.initTempoControls === 'function') {
            window.initTempoControls();
        }
    }, 500);
});

// ═══════════════════════════════════════════════════════════════
// AI로 스타일 프롬프트 생성 함수
// ═══════════════════════════════════════════════════════════════
window.generateStylePromptAI = async function() {
    try {
        // 로딩 표시
        const stylePromptEl = document.getElementById('stylePrompt');
        if (!stylePromptEl) {
            alert('스타일 프롬프트 입력란을 찾을 수 없습니다.');
            return;
        }
        
        // 기존 값 백업
        const previousValue = stylePromptEl.value;
        stylePromptEl.value = '🔄 AI가 스타일 프롬프트를 생성 중입니다...';
        stylePromptEl.disabled = true;
        
        // API 키 확인
        const apiKey = localStorage.getItem('openai_api_key');
        if (!apiKey) {
            stylePromptEl.value = previousValue;
            stylePromptEl.disabled = false;
            alert('OpenAI API 키가 설정되지 않았습니다.\n\n설정 → API 키 설정에서 키를 입력해주세요.');
            return;
        }
        
        // ═══════════════════════════════════════════════════════════════
        // 1단계 데이터 수집
        // ═══════════════════════════════════════════════════════════════
        const songTitle = document.getElementById('sunoTitle')?.value || 
                         document.getElementById('songTitle')?.value || '';
        const sunoLyrics = document.getElementById('sunoLyrics')?.value || '';
        const manualStylePrompt = document.getElementById('manualStylePrompt')?.value || '';
        
        // 1단계 선택 태그들
        const step1Tags = {
            genre: getSelectedTags('genreTags'),
            mood: getSelectedTags('moodTags'),
            era: getSelectedTags('eraTags'),
            theme: getSelectedTags('themeTags'),
            perspective: getSelectedTags('perspectiveTags'),
            time: getSelectedTags('timeTags'),
            special: getSelectedTags('specialTags'),
            region: getSelectedTags('regionTags')
        };
        
        // ═══════════════════════════════════════════════════════════════
        // 2단계 데이터 수집
        // ═══════════════════════════════════════════════════════════════
        const step2Tags = {
            audioFormat: getSelectedTags('audioFormatTags'),
            venue: getSelectedTags('sunoVenueTags'),
            vocalStyle: getSelectedTags('vocalStyle'),
            instruments: getSelectedTags('instrumentTags')
        };
        
        // 템포
        const tempo = document.getElementById('tempoSlider')?.value || '80';
        
        // 파트별 보컬 지정 (전역 변수에서 가져오기)
        const vocalPartAssignments = window.vocalPartAssignments || {};
        const vocalPartAssignmentsList = Object.keys(vocalPartAssignments).map(part => {
            return `${part}: ${vocalPartAssignments[part]}`;
        }).join(', ');
        
        // 지침서
        const guidelines = localStorage.getItem('musicCreatorGuidelines') || '';
        
        // ═══════════════════════════════════════════════════════════════
        // AI 프롬프트 구성
        // ═══════════════════════════════════════════════════════════════
        const prompt = `당신은 Suno AI 음악 생성을 위한 스타일 프롬프트 전문가입니다.
아래 정보를 바탕으로 Suno AI의 스타일란에 입력할 최적의 영문 스타일 프롬프트를 생성해주세요.

## 곡 정보
- 제목: ${songTitle || '미정'}
- 기존 스타일 프롬프트: ${manualStylePrompt || '없음'}

## 가사 (분석용)
${sunoLyrics ? sunoLyrics.substring(0, 500) + '...' : '가사 없음'}

## 1단계 선택사항
- 장르: ${step1Tags.genre.join(', ') || '미선택'}
- 분위기/감정: ${step1Tags.mood.join(', ') || '미선택'}
- 시대: ${step1Tags.era.join(', ') || '미선택'}
- 주제: ${step1Tags.theme.join(', ') || '미선택'}
- 시점/관점: ${step1Tags.perspective.join(', ') || '미선택'}
- 시간대: ${step1Tags.time.join(', ') || '미선택'}
- 특별 요소: ${step1Tags.special.join(', ') || '미선택'}
- 지역: ${step1Tags.region.join(', ') || '미선택'}

## 2단계 선택사항
- 음향 포맷: ${step2Tags.audioFormat.join(', ') || '미선택'}
- 연주 장소: ${step2Tags.venue.join(', ') || '미선택'}
- 보컬 스타일: ${step2Tags.vocalStyle.join(', ') || '미선택'}
- 악기 구성: ${step2Tags.instruments.join(', ') || '미선택'}
- 템포: ${tempo} BPM
${vocalPartAssignmentsList ? '- 파트별 보컬 지정:\n  ' + Object.keys(vocalPartAssignments).map(part => `${part}: ${vocalPartAssignments[part]}`).join('\n  ') : ''}

## 생성 규칙
1. 영문으로 작성 (Suno AI 호환)
2. 쉼표로 구분된 키워드 나열 형식
3. 장르, 분위기, 템포, 보컬 스타일, 악기, 음향 효과 순서로 작성
4. 1,000자 이내
5. 가사의 감정과 분위기를 반영
6. 선택된 연주 장소의 음향 특성(리버브, 에코, 공간감) 반영
7. 전문적이고 구체적인 음악 용어 사용
8. 파트별 보컬 지정이 있으면 해당 정보를 스타일 프롬프트에 반영

## 출력 형식
스타일 프롬프트만 출력 (설명 없이 프롬프트만)

예시:
K-Pop Ballad, emotional, melancholic, 75 BPM, soft female vocals, breathy tone, piano, gentle strings, ambient pads, wide stereo, studio reverb, intimate atmosphere, cinematic, heartfelt, nostalgic undertones`;

        // ChatGPT API 호출
        console.log('🤖 AI 스타일 프롬프트 생성 시작...');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: guidelines ? 
                            `당신은 Suno AI 스타일 프롬프트 전문가입니다. 다음 제작 지침서를 참고하세요:\n\n${guidelines.substring(0, 1000)}` :
                            '당신은 Suno AI 스타일 프롬프트 전문가입니다.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
        }
        
        const data = await response.json();
        const generatedPrompt = data.choices?.[0]?.message?.content?.trim() || '';
        
        if (!generatedPrompt) {
            throw new Error('생성된 프롬프트가 없습니다.');
        }
        
        // 스타일 프롬프트 설정
        stylePromptEl.value = generatedPrompt;
        stylePromptEl.disabled = false;
        
        console.log('✅ AI 스타일 프롬프트 생성 완료:', generatedPrompt);
        
        // 한글 해석 자동 생성
        if (typeof window.generateStylePromptTranslation === 'function') {
            setTimeout(() => {
                window.generateStylePromptTranslation();
            }, 300);
        }
        
        // 성공 메시지
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator('✅ 스타일 프롬프트가 AI로 생성되었습니다!');
        }
        
    } catch (error) {
        console.error('❌ AI 스타일 프롬프트 생성 오류:', error);
        
        const stylePromptEl = document.getElementById('stylePrompt');
        if (stylePromptEl) {
            stylePromptEl.disabled = false;
            // 이전 값 복원 시도
            if (!stylePromptEl.value || stylePromptEl.value.includes('생성 중')) {
                stylePromptEl.value = '';
            }
        }
        
        alert('⚠️ 스타일 프롬프트 생성 중 오류가 발생했습니다.\n\n' +
              '원인: ' + error.message + '\n\n' +
              '해결방법: API 키를 확인하고 다시 시도해주세요.');
    }
};
// [MOVED] extraction block

// ═══════════════════════════════════════════════════════════════
// 파트별 보컬 스타일 지정 함수들
// ═══════════════════════════════════════════════════════════════

// 파트별 보컬 스타일 지정 데이터 저장 (전역 변수)
window.vocalPartAssignments = window.vocalPartAssignments || {};

// 파트에 보컬 스타일 지정
window.assignVocalToPart = function() {
    try {
        const partSelect = document.getElementById('vocalPartSelect');
        const styleSelect = document.getElementById('vocalStyleSelect');
        const assignmentsContainer = document.getElementById('vocalPartAssignments');
        
        if (!partSelect || !styleSelect || !assignmentsContainer) {
            alert('파트별 보컬 스타일 지정 요소를 찾을 수 없습니다.');
            return;
        }
        
        const selectedPart = partSelect.value;
        let selectedStyle = styleSelect.value;
        
        // 파트 선택 확인
        if (!selectedPart) {
            alert('파트를 선택해주세요.');
            partSelect.focus();
            return;
        }
        
        // 보컬 스타일 선택 확인
        if (!selectedStyle) {
            alert('보컬 스타일을 선택해주세요.');
            styleSelect.focus();
            return;
        }
        
        // 커스텀 보컬 스타일 처리
        if (selectedStyle === '__CUSTOM__') {
            const customInput = document.getElementById('customVocalStyleText');
            if (customInput && customInput.value.trim()) {
                selectedStyle = customInput.value.trim();
            } else {
                alert('커스텀 보컬 스타일을 입력해주세요.');
                const customInputDiv = document.getElementById('customVocalStyleInput');
                if (customInputDiv) {
                    customInputDiv.style.display = 'block';
                }
                if (customInput) {
                    customInput.focus();
                }
                return;
            }
        }
        
        // 전역 변수에 저장
        window.vocalPartAssignments[selectedPart] = selectedStyle;
        
        // UI에 표시
        renderVocalPartAssignments();
        
        // 선택 초기화
        partSelect.value = '';
        styleSelect.value = '';
        const customInput = document.getElementById('customVocalStyleText');
        if (customInput) {
            customInput.value = '';
        }
        const customInputDiv = document.getElementById('customVocalStyleInput');
        if (customInputDiv) {
            customInputDiv.style.display = 'none';
        }
        
        console.log('✅ 파트별 보컬 스타일 지정 완료:', selectedPart, '→', selectedStyle);
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(`✅ ${selectedPart}에 보컬 스타일이 지정되었습니다!`);
        }
        
    } catch (error) {
        console.error('❌ 파트별 보컬 스타일 지정 오류:', error);
        alert('파트별 보컬 스타일 지정 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

// 파트별 보컬 스타일 지정 목록 렌더링
function renderVocalPartAssignments() {
    const assignmentsContainer = document.getElementById('vocalPartAssignments');
    if (!assignmentsContainer) return;
    
    const assignments = window.vocalPartAssignments || {};
    const parts = Object.keys(assignments);
    
    if (parts.length === 0) {
        assignmentsContainer.innerHTML = '<div style="padding: 10px; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">지정된 보컬 스타일이 없습니다.</div>';
        return;
    }
    
    let html = '';
    parts.forEach(part => {
        const style = assignments[part];
        // 이모지 제거 (표시용)
        const displayStyle = style.replace(/[👩👨👫🎵👥🎤💨👩‍🎤👨‍🎤👩‍🦰👩‍💼👨‍🎨]/g, '').trim();
        
        html += `
            <div class="vocal-assignment-item" 
                 data-part="${part}" 
                 style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin-bottom: 5px; background: var(--bg-input); border-radius: 6px; border: 1px solid var(--border);">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem; margin-bottom: 3px;">${part}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${displayStyle}</div>
                </div>
                <button class="btn btn-small btn-danger" 
                        onclick="removeVocalPartAssignment('${part}')" 
                        style="padding: 4px 8px; font-size: 0.75rem; margin-left: 10px;"
                        title="삭제">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    assignmentsContainer.innerHTML = html;
}

// 파트별 보컬 스타일 지정 제거
window.removeVocalPartAssignment = function(part) {
    try {
        if (window.vocalPartAssignments && window.vocalPartAssignments[part]) {
            delete window.vocalPartAssignments[part];
            renderVocalPartAssignments();
            console.log('✅ 파트별 보컬 스타일 제거:', part);
        }
    } catch (error) {
        console.error('❌ 파트별 보컬 스타일 제거 오류:', error);
    }
};

// 커스텀 보컬 스타일 추가
window.addCustomVocalStyle = function() {
    const customInput = document.getElementById('customVocalStyleText');
    const styleSelect = document.getElementById('vocalStyleSelect');
    
    if (!customInput || !styleSelect) return;
    
    const customStyle = customInput.value.trim();
    if (!customStyle) {
        alert('보컬 스타일을 입력해주세요.');
        customInput.focus();
        return;
    }
    
    // select에 옵션 추가
    const option = document.createElement('option');
    option.value = customStyle;
    option.textContent = customStyle;
    styleSelect.appendChild(option);
    
    // 선택
    styleSelect.value = customStyle;
    
    // 입력 필드 초기화 및 숨기기
    customInput.value = '';
    const customInputDiv = document.getElementById('customVocalStyleInput');
    if (customInputDiv) {
        customInputDiv.style.display = 'none';
    }
    
    // 커스텀 옵션 선택 해제
    styleSelect.value = customStyle;
    
    console.log('✅ 커스텀 보컬 스타일 추가:', customStyle);
};

// 보컬 스타일 선택 시 커스텀 입력 필드 표시 및 초기화
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        const styleSelect = document.getElementById('vocalStyleSelect');
        const customInputDiv = document.getElementById('customVocalStyleInput');
        
        if (styleSelect && customInputDiv) {
            styleSelect.addEventListener('change', function() {
                if (this.value === '__CUSTOM__') {
                    customInputDiv.style.display = 'block';
                    const customInput = document.getElementById('customVocalStyleText');
                    if (customInput) {
                        customInput.focus();
                    }
                } else {
                    customInputDiv.style.display = 'none';
                }
            });
        }
        
        // 페이지 로드 시 파트별 보컬 지정 목록 렌더링
        setTimeout(() => {
            if (typeof renderVocalPartAssignments === 'function') {
                renderVocalPartAssignments();
            }
        }, 500);
    });
}

// ═══════════════════════════════════════════════════════════════
// 스타일 프롬프트 한글 해석 함수들
// ═══════════════════════════════════════════════════════════════

// 디바운스 타이머
let stylePromptTranslationTimer = null;

// 디바운스된 번역 업데이트 (입력 중 호출 방지)
window.debounceUpdateStylePromptTranslation = function() {
    if (stylePromptTranslationTimer) {
        clearTimeout(stylePromptTranslationTimer);
    }
    stylePromptTranslationTimer = setTimeout(() => {
        window.updateStylePromptTranslation();
    }, 1000); // 1초 후 실행
};

// 스타일 프롬프트 번역 업데이트
window.updateStylePromptTranslation = function() {
    const stylePrompt = document.getElementById('stylePrompt')?.value || '';
    
    if (!stylePrompt.trim()) {
        const translationEl = document.getElementById('stylePromptTranslation');
        if (translationEl) {
            translationEl.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">스타일 프롬프트를 입력하면 한글 해석이 표시됩니다.</div>';
        }
        return;
    }
    
    window.generateStylePromptTranslation();
};

// 스타일 프롬프트 한글 해석 생성 (AI 사용)
window.generateStylePromptTranslation = async function() {
    const stylePrompt = document.getElementById('stylePrompt')?.value || '';
    const translationEl = document.getElementById('stylePromptTranslation');
    
    if (!translationEl) return;
    
    if (!stylePrompt.trim()) {
        translationEl.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">스타일 프롬프트를 입력하면 한글 해석이 표시됩니다.</div>';
        return;
    }
    
    // file:// 또는 origin 'null' 환경에서는 API 호출 시 CORS 오류 발생 → 기본 번역만 사용
    const isFileOrNullOrigin = typeof window.location !== 'undefined' &&
        (window.location.protocol === 'file:' || window.location.origin === 'null' || String(window.location.href).startsWith('file://'));
    if (isFileOrNullOrigin) {
        const translation = translateStylePromptBasic(stylePrompt);
        translationEl.innerHTML = translation + '<p style="margin-top: 12px; padding: 10px; background: rgba(245, 158, 11, 0.15); border-radius: 8px; font-size: 0.8rem; color: var(--warning);">💡 파일로 열어서 API 호출이 제한됩니다. 로컬 서버(<code>http://</code>)에서 실행하면 ChatGPT 번역을 사용할 수 있습니다.</p>';
        return;
    }
    
    // 로딩 표시
    translationEl.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> 한글 해석 생성 중...</div>';
    
    try {
        // OpenAI API 키 확인
        const apiKey = localStorage.getItem('openai_api_key');
        
        if (!apiKey) {
            // API 키가 없으면 간단한 용어 사전 기반 번역
            const translation = translateStylePromptBasic(stylePrompt);
            translationEl.innerHTML = translation;
            return;
        }
        
        // ChatGPT로 번역
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: '당신은 음악 스타일 프롬프트를 한글로 해석하는 전문가입니다. 영어 음악 용어를 한글로 자연스럽게 번역하고, 각 요소가 음악에서 어떤 의미인지 간단히 설명해주세요. 답변은 HTML 형식 없이 순수 텍스트로 작성하세요.'
                    },
                    {
                        role: 'user',
                        content: `다음 음악 스타일 프롬프트를 한글로 해석해주세요:\n\n${stylePrompt}\n\n형식:\n- 각 요소를 쉼표로 구분하여 한글로 번역\n- 전문 용어는 괄호 안에 원어 표기\n- 간결하게 작성`
                    }
                ],
                temperature: 0.3,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            throw new Error('API 요청 실패');
        }
        
        const data = await response.json();
        const translation = data.choices?.[0]?.message?.content || '';
        
        if (translation) {
            translationEl.innerHTML = `<div style="line-height: 1.8;">${translation.replace(/\n/g, '<br>')}</div>`;
            console.log('✅ 스타일 프롬프트 한글 해석 완료');
        } else {
            throw new Error('번역 결과 없음');
        }
        
    } catch (error) {
        const isCorsOrFetch = error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('fetch'));
        if (isCorsOrFetch) {
            // CORS/네트워크 오류 시 콘솔에만 간단 로그, 사용자에게는 기본 번역 + 안내
            console.warn('⚠️ 스타일 프롬프트 ChatGPT 번역이 이 환경에서 제한됩니다. 기본 번역을 표시합니다.');
        } else {
            console.error('❌ 스타일 프롬프트 번역 오류:', error);
        }
        const translation = translateStylePromptBasic(stylePrompt);
        const notice = isCorsOrFetch
            ? '<p style="margin-top: 12px; padding: 10px; background: rgba(245, 158, 11, 0.15); border-radius: 8px; font-size: 0.8rem; color: var(--warning);">💡 API 호출이 제한된 환경입니다. 로컬 서버(<code>http://</code>)에서 실행하면 ChatGPT 번역을 사용할 수 있습니다.</p>'
            : '';
        translationEl.innerHTML = translation + notice;
    }
};

// 기본 용어 사전 기반 번역 (API 없을 때 사용)
function translateStylePromptBasic(stylePrompt) {
    const dictionary = {
        // 장르
        'pop': '팝', 'rock': '록', 'ballad': '발라드', 'jazz': '재즈', 'r&b': '알앤비',
        'hip hop': '힙합', 'hip-hop': '힙합', 'edm': 'EDM', 'electronic': '일렉트로닉',
        'classical': '클래식', 'folk': '포크', 'country': '컨트리', 'blues': '블루스',
        'soul': '소울', 'funk': '펑크', 'reggae': '레게', 'metal': '메탈',
        'punk': '펑크', 'indie': '인디', 'alternative': '얼터너티브', 'k-pop': '케이팝',
        'synth': '신스', 'synthwave': '신스웨이브', 'ambient': '앰비언트',
        
        // 분위기
        'emotional': '감성적인', 'melancholic': '우울한', 'sad': '슬픈', 'happy': '행복한',
        'energetic': '에너지 넘치는', 'calm': '차분한', 'peaceful': '평화로운',
        'dramatic': '드라마틱한', 'intense': '강렬한', 'romantic': '로맨틱한',
        'nostalgic': '향수어린', 'dreamy': '몽환적인', 'dark': '어두운', 'bright': '밝은',
        'warm': '따뜻한', 'cool': '시원한', 'intimate': '친밀한', 'epic': '웅장한',
        'cinematic': '영화같은', 'atmospheric': '분위기 있는', 'heartfelt': '진심어린',
        
        // 보컬
        'vocal': '보컬', 'vocals': '보컬', 'female vocal': '여성 보컬', 'male vocal': '남성 보컬',
        'soft': '부드러운', 'powerful': '파워풀한', 'breathy': '숨결 있는', 'husky': '허스키한',
        'high range': '고음역', 'low range': '저음역', 'falsetto': '팔세토', 'whisper': '속삭임',
        'korean vocals': '한국어 보컬', 'korean': '한국어',
        
        // 악기
        'piano': '피아노', 'guitar': '기타', 'acoustic guitar': '어쿠스틱 기타',
        'electric guitar': '일렉트릭 기타', 'bass': '베이스', 'drums': '드럼',
        'strings': '현악기', 'violin': '바이올린', 'cello': '첼로', 'orchestra': '오케스트라',
        'synth pad': '신스 패드', 'pad': '패드', 'synthesizer': '신디사이저',
        
        // 음향
        'stereo': '스테레오', 'wide stereo': '와이드 스테레오', 'mono': '모노',
        'reverb': '리버브', 'echo': '에코', 'delay': '딜레이', 'chorus': '코러스',
        'studio quality': '스튜디오 퀄리티', 'high quality': '고품질',
        
        // 템포
        'bpm': 'BPM', 'slow': '느린', 'fast': '빠른', 'mid-tempo': '중간 템포',
        'uptempo': '업템포', 'downtempo': '다운템포',
        
        // 기타
        'atmosphere': '분위기', 'gentle': '부드러운', 'smooth': '부드러운',
        'natural': '자연스러운', 'undertones': '뉘앙스', 'tone': '톤'
    };
    
    let result = stylePrompt.toLowerCase();
    let translations = [];
    
    // 쉼표로 구분된 각 요소 번역
    const parts = stylePrompt.split(',').map(p => p.trim());
    
    parts.forEach(part => {
        let translated = part.toLowerCase();
        let found = false;
        
        // 사전에서 매칭되는 용어 찾기
        for (const [eng, kor] of Object.entries(dictionary)) {
            if (translated.includes(eng)) {
                translated = translated.replace(new RegExp(eng, 'gi'), kor);
                found = true;
            }
        }
        
        // BPM 숫자 처리
        const bpmMatch = part.match(/(\d+)\s*bpm/i);
        if (bpmMatch) {
            translated = `${bpmMatch[1]} BPM (분당 비트)`;
        }
        
        translations.push(translated);
    });
    
    return `<div style="line-height: 1.8;">
        <div style="margin-bottom: 10px; color: var(--text-secondary); font-size: 0.85rem;">
            <i class="fas fa-info-circle"></i> 기본 번역 (API 키 설정 시 더 정확한 해석 제공)
        </div>
        <div>${translations.join(', ')}</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// 6단계: 마케팅 자료 생성 함수
// ═══════════════════════════════════════════════════════════════
window.generateMarketingMaterials = async function() {
    try {
        const marketingResult = document.getElementById('marketingResult');
        const marketingLoading = document.getElementById('marketingLoading');
        
        if (!marketingResult || !marketingLoading) {
            console.warn('⚠️ 마케팅 UI 요소를 찾을 수 없습니다.');
            return;
        }
        
        // 마케팅 데이터 가져오기
        const marketingData = window.marketingData || {};
        const title = marketingData.title || 
                     document.getElementById('finalTitleText')?.textContent || 
                     window.currentSunoTitle || 
                     document.getElementById('sunoTitle')?.value || 
                     document.getElementById('songTitle')?.value || 
                     '제목 없음';
        
        const lyrics = marketingData.lyrics || 
                      document.getElementById('finalLyrics')?.textContent || 
                      document.getElementById('finalizedLyrics')?.value || 
                      document.getElementById('sunoLyrics')?.value || '';
        
        const style = marketingData.style || 
                     document.getElementById('finalStyle')?.textContent || 
                     document.getElementById('finalizedStyle')?.value || 
                     document.getElementById('stylePrompt')?.value || '';
        
        if (!lyrics.trim()) {
            alert('⚠️ 마케팅 자료를 생성할 가사가 없습니다.\n\n5단계에서 최종 가사를 확인한 후 다시 시도해주세요.');
            return;
        }
        
        // 로딩 화면 표시
        marketingLoading.style.display = 'block';
        marketingResult.style.display = 'none';
        
        // Gemini API 키 확인
        const geminiKey = localStorage.getItem('gemini_api_key') || '';
        if (!geminiKey || !geminiKey.startsWith('AIza')) {
            marketingLoading.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                    <h4 style="margin-bottom: 10px; color: var(--error);">Gemini API 키가 필요합니다</h4>
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">마케팅 자료를 생성하려면 Gemini API 키를 설정해주세요.</p>
                    <button class="btn btn-primary" onclick="if(typeof window.openAPISettings === 'function') { window.openAPISettings(); }">
                        <i class="fas fa-key"></i> API 키 설정
                    </button>
                </div>
            `;
            return;
        }
        
        // 지침서 가져오기
        const guidelines = localStorage.getItem('musicCreatorGuidelines') || '';
        
        // 마케팅 자료 생성 프롬프트
        const marketingPrompt = `다음 정보를 바탕으로 뮤직모리 채널용 마케팅 자료를 생성해주세요.

=== 곡 정보 ===
제목: ${title}
가사: ${lyrics.substring(0, 1000)}${lyrics.length > 1000 ? '...' : ''}
스타일 프롬프트: ${style.substring(0, 500)}${style.length > 500 ? '...' : ''}

${guidelines ? `=== 제작 지침서 (참고) ===
${guidelines.substring(0, 1000)}${guidelines.length > 1000 ? '...' : ''}

` : ''}=== 생성 요청 사항 ===

다음 마케팅 자료를 생성해주세요:

1. **유튜브 설명란 (youtubeDesc)**: 
   - 곡의 감성과 스토리를 담은 매력적인 설명
   - 이모지와 해시태그 포함
   - 뮤직모리 채널 구독 및 좋아요 유도 문구 포함
   - 길이: 200-500자

2. **틱톡 설명란 (tiktokDesc)**:
   - 짧고 임팩트 있는 설명
   - 핵심 키워드와 해시태그 포함
   - 길이: 50-150자

3. **해시태그 (hashtags)**:
   - 곡 제목, 장르, 감정, 키워드 관련 해시태그
   - 한글과 영어 해시태그 혼합
   - 콤마로 구분된 형식
   - 15-25개 정도

4. **썸네일 문구 (thumbnails)**:
   - 유튜브 썸네일용 문구 10개 생성
   - 곡의 감성, 스토리, 핵심 키워드를 담은 짧고 임팩트 있는 문구
   - 각 문구는 10-30자 정도로 간결하게
   - 감정적이고 시각적으로 표현력 있는 문구
   - 예: "뉴욕 야경 속 애절한 그리움", "Time is cruel, 잃어버린 너" 등

=== 응답 형식 ===
다음 JSON 형식으로 응답해주세요:

{
  "youtubeDesc": "유튜브 설명란 내용",
  "tiktokDesc": "틱톡 설명란 내용",
  "hashtags": "#해시태그1,#해시태그2,#해시태그3",
  "thumbnails": [
    "썸네일 문구 1",
    "썸네일 문구 2",
    "썸네일 문구 3",
    "... (총 10개)"
  ]
}

**중요**: JSON 형식만 출력하고, 다른 설명이나 텍스트는 포함하지 마세요.`;

        // Gemini API 호출
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: marketingPrompt }] }],
                generationConfig: {
                    temperature: 0.8,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 3000
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
        }
        
        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!aiResponse.trim()) {
            throw new Error('Gemini API에서 응답을 받지 못했습니다.');
        }
        
        // JSON 파싱 시도
        let marketingMaterials;
        try {
            let cleanedResponse = aiResponse.trim();
            if (cleanedResponse.includes('```json')) {
                cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            } else if (cleanedResponse.includes('```')) {
                cleanedResponse = cleanedResponse.replace(/```\n?/g, '').trim();
            }
            
            const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                marketingMaterials = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('JSON 형식을 찾을 수 없습니다.');
            }
        } catch (parseError) {
            console.error('JSON 파싱 오류:', parseError);
            // 파싱 실패 시 기본값 사용
            marketingMaterials = {
                youtubeDesc: aiResponse.substring(0, 500) || '마케팅 자료를 생성할 수 없습니다.',
                tiktokDesc: aiResponse.substring(0, 150) || '마케팅 자료를 생성할 수 없습니다.',
                hashtags: '#뮤직모리,#MusicMori',
                thumbnails: [
                    `${title} - 뮤직모리`,
                    '감성적인 멜로디',
                    '깊은 울림',
                    '마음을 울리는 음악',
                    '뮤직모리 채널',
                    '새로운 음악',
                    '감동적인 스토리',
                    '음악과 함께',
                    '특별한 순간',
                    '음악의 힘'
                ]
            };
        }
        
        // 마케팅 자료 표시
        const youtubeDescEl = document.getElementById('youtubeDesc');
        const tiktokDescEl = document.getElementById('tiktokDesc');
        const hashtagsEl = document.getElementById('hashtagsContent');
        const thumbnailsGridEl = document.getElementById('thumbnailsGrid');
        
        if (youtubeDescEl && marketingMaterials.youtubeDesc) {
            youtubeDescEl.textContent = marketingMaterials.youtubeDesc;
        }
        
        if (tiktokDescEl && marketingMaterials.tiktokDesc) {
            tiktokDescEl.textContent = marketingMaterials.tiktokDesc;
        }
        
        if (hashtagsEl && marketingMaterials.hashtags) {
            hashtagsEl.textContent = marketingMaterials.hashtags;
        }
        
        // 썸네일 문구 표시
        if (thumbnailsGridEl && marketingMaterials.thumbnails && Array.isArray(marketingMaterials.thumbnails)) {
            let thumbnailsHtml = '';
            marketingMaterials.thumbnails.forEach((thumb, index) => {
                const thumbnailText = typeof thumb === 'string' ? thumb : (thumb.text || thumb.content || String(thumb));
                thumbnailsHtml += `
                    <div class="thumbnail-item" style="padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s;" 
                         onclick="if(typeof window.copyToClipboard === 'function') { window.copyToClipboard(null, '${escapeHtml(thumbnailText).replace(/'/g, "\\'")}', event); }">
                        <div style="font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">${escapeHtml(thumbnailText)}</div>
                        <button class="btn btn-small btn-success" onclick="event.stopPropagation(); if(typeof window.copyToClipboard === 'function') { window.copyToClipboard(null, '${escapeHtml(thumbnailText).replace(/'/g, "\\'")}', event); }">
                            <i class="fas fa-copy"></i> 복사
                        </button>
                    </div>
                `;
            });
            thumbnailsGridEl.innerHTML = thumbnailsHtml;
        }
        
        // 로딩 숨기고 결과 표시
        marketingLoading.style.display = 'none';
        marketingResult.style.display = 'block';
        
        // 프로젝트 데이터에 저장
        if (window.currentProject) {
            if (!window.currentProject.data) {
                window.currentProject.data = {};
            }
            if (!window.currentProject.data.marketing) {
                window.currentProject.data.marketing = {};
            }
            window.currentProject.data.marketing.youtubeDesc = marketingMaterials.youtubeDesc || '';
            window.currentProject.data.marketing.tiktokDesc = marketingMaterials.tiktokDesc || '';
            window.currentProject.data.marketing.hashtags = marketingMaterials.hashtags || '';
            if (marketingMaterials.thumbnails && Array.isArray(marketingMaterials.thumbnails)) {
                window.currentProject.data.marketing.thumbnails = marketingMaterials.thumbnails.map(thumb => 
                    typeof thumb === 'string' ? thumb : (thumb.text || thumb.content || String(thumb))
                );
            }
        }
        
        console.log('✅ 마케팅 자료 생성 완료:', marketingMaterials);
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator('✅ 마케팅 자료가 생성되었습니다!');
        }
        
    } catch (error) {
        console.error('❌ 마케팅 자료 생성 오류:', error);
        
        const marketingLoading = document.getElementById('marketingLoading');
        if (marketingLoading) {
            marketingLoading.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                    <h4 style="margin-bottom: 10px; color: var(--error);">마케팅 자료 생성 중 오류가 발생했습니다</h4>
                    <p style="color: var(--text-secondary); margin-bottom: 15px;">${escapeHtml(error.message)}</p>
                    <button class="btn btn-primary" onclick="if(typeof window.generateMarketingMaterials === 'function') { window.generateMarketingMaterials(); }">
                        <i class="fas fa-redo"></i> 다시 시도
                    </button>
                </div>
            `;
        }
        
        alert('⚠️ 마케팅 자료 생성 중 오류가 발생했습니다.\n\n' +
              '원인: ' + error.message + '\n\n' +
              '해결방법:\n' +
              '1. API 키가 올바른지 확인하세요\n' +
              '2. 네트워크 연결을 확인하세요\n' +
              '3. 잠시 후 다시 시도해주세요');
    }
};
// [MOVED] extraction block
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">한글 프롬프트:</label>
                            <textarea 
                                id="scene_overview_${index}_ko" 
                                class="scene-prompt-ko-overview" 
                                data-index="${index}"
                                data-scene-index="${index}"
                                onchange="syncSceneOverviewPromptTranslation(${index}, 'ko')"
                                style="width: 100%; min-height: 120px; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.9rem; resize: vertical;"
                                placeholder="한글 프롬프트를 입력하세요...">${existingPromptKo}</textarea>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
            
            // 씬에 promptKo가 있으면 한글 프롬프트에 설정, 없으면 영어에서 번역
            scenes.forEach((scene, index) => {
                const enEl = document.getElementById(`scene_overview_${index}_en`);
                const koEl = document.getElementById(`scene_overview_${index}_ko`);
                
                // 씬에 promptKo가 있으면 한글 프롬프트에 설정
                if (koEl && scene.promptKo) {
                    koEl.value = scene.promptKo;
                    // currentScenes도 업데이트
                    if (window.currentScenes && window.currentScenes[index]) {
                        window.currentScenes[index].promptKo = scene.promptKo;
                    }
                }
                
                // 영어 프롬프트가 있고 한글 프롬프트가 없으면 한글로 번역
                if (enEl && enEl.value && (!koEl || !koEl.value)) {
                    translateEnglishToKoreanForScene('prompt', enEl.value).then(translated => {
                        if (koEl && translated) {
                            koEl.value = translated;
                            // currentScenes도 업데이트
                            if (window.currentScenes && window.currentScenes[index]) {
                                window.currentScenes[index].promptKo = translated;
                            }
                        }
                    }).catch(err => {
                        console.error('자동 번역 오류:', err);
                    });
                }
            });
        }
        
        if (mvSceneOverviewSection) {
            mvSceneOverviewSection.style.display = 'block';
        }
        
        window.currentScenes = scenes;
        
        console.log('✅ MV 프롬프트 생성 완료:', scenes.length, '개 씬', useAI ? '(AI 생성)' : '(기본 방식)');
        
    } catch (error) {
        console.error('❌ MV 프롬프트 생성 오류:', error);
        console.error('오류 스택:', error.stack);
        setGeneratingUI(false);

        let errorMessage = 'MV 프롬프트 생성 중 오류가 발생했습니다.';
        if (error.message) {
            errorMessage += `\n\n오류: ${error.message}`;
        }
        
        // handleAPIError가 있으면 사용, 없으면 기본 메시지
        if (typeof window.handleAPIError === 'function') {
            try {
                const errorInfo = await window.handleAPIError(error, 'MV 프롬프트 생성');
                alert(`${errorMessage}\n\n${errorInfo.userMessage || ''}\n\n상세: ${errorInfo.error || error.message}`);
            } catch (e) {
                alert(errorMessage);
            }
        } else {
            alert(errorMessage);
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// 씬 다양성 보장 함수
// ═══════════════════════════════════════════════════════════════
function ensureSceneDiversity(scenes) {
    const usedLocations = new Set();
    const locationAlternatives = {
        '도시 거리': ['도시 야경', '도시 공원', '도시 카페'],
        '도시 야경': ['도시 거리', '옥상', '야경 전망대'],
        '해변': ['강변', '호수', '바다 전망대'],
        '산': ['공원', '숲', '야외 산책로'],
        '숲': ['공원', '산', '야외 정원'],
        '실내': ['카페', '도서관', '스튜디오'],
        '카페': ['도서관', '실내', '공원 벤치']
    };
    
    return scenes.map((scene, index) => {
        const location = scene.location || '';
        
        // 중복 체크
        if (usedLocations.has(location) && index > 0) {
            // 대체 배경 제안
            const alternatives = locationAlternatives[location] || [];
            const available = alternatives.filter(alt => !usedLocations.has(alt));
            
            if (available.length > 0) {
                scene.location = available[0];
                scene.prompt = scene.prompt.replace(location, available[0]);
                scene.scene = scene.scene.replace(location, available[0]);
            }
        }
        
        usedLocations.add(scene.location || location);
        return scene;
    });
}

window.saveSceneOverview = function() {
    if (!window.currentScenes) {
        alert('저장할 씬이 없습니다.');
        return;
    }
    
    const descriptions = document.querySelectorAll('.scene-description');
    
    descriptions.forEach((desc, index) => {
        if (window.currentScenes[index]) {
            window.currentScenes[index].scene = desc.value;
        }
    });
    
    // 영어 프롬프트와 한글 프롬프트 각각 저장
    window.currentScenes.forEach((scene, index) => {
        const enEl = document.getElementById(`scene_overview_${index}_en`);
        const koEl = document.getElementById(`scene_overview_${index}_ko`);
        
        if (enEl) {
            window.currentScenes[index].prompt = enEl.value;
        }
        if (koEl) {
            window.currentScenes[index].promptKo = koEl.value;
        }
    });
    
    alert('씬 개요가 저장되었습니다.');
};

// 저장 및 확정 통합 함수
window.saveAndConfirmMVPrompts = async function() {
    try {
        // 1. 씬 개요 저장 (saveSceneOverview 기능)
        if (!window.currentScenes) {
            alert('저장할 씬이 없습니다.');
            return;
        }
        
        const descriptions = document.querySelectorAll('.scene-description');
        
        descriptions.forEach((desc, index) => {
            if (window.currentScenes[index]) {
                window.currentScenes[index].scene = desc.value;
            }
        });
        
        // 영어 프롬프트와 한글 프롬프트 각각 저장
        window.currentScenes.forEach((scene, index) => {
            const enEl = document.getElementById(`scene_overview_${index}_en`);
            const koEl = document.getElementById(`scene_overview_${index}_ko`);
            
            if (enEl) {
                window.currentScenes[index].prompt = enEl.value;
            }
            if (koEl) {
                window.currentScenes[index].promptKo = koEl.value;
            }
        });
        
        // 2. MV 설정 수집
        const mvSettings = {
            era: document.getElementById('mvEra')?.value || '',
            country: document.getElementById('mvCountry')?.value || '',
            location: (typeof window.getMVLocationValues === 'function' ? window.getMVLocationValues() : []),
            characterCount: document.getElementById('mvCharacterCount')?.value || '1',
            customSettings: document.getElementById('mvCustomSettings')?.value || '',
            lighting: document.getElementById('mvLighting')?.value || '',
            cameraWork: document.getElementById('mvCameraWork')?.value || '',
            mood: document.getElementById('mvMood')?.value || ''
        };
        
        // 인물 정보 수집 (성별, 나이, 인종, 외모/스타일)
        const characters = [];
        for (let i = 1; i <= parseInt(mvSettings.characterCount); i++) {
            const gender = document.getElementById(`mvCharacter${i}_gender`)?.value || '';
            const age = document.getElementById(`mvCharacter${i}_age`)?.value || '';
            const race = document.getElementById(`mvCharacter${i}_race`)?.value || '';
            const appearance = document.getElementById(`mvCharacter${i}_appearance`)?.value || '';
            if (gender || age || race || appearance) {
                characters.push({ gender, age, race, appearance });
            }
        }
        mvSettings.characters = characters;
        
        // 3. 썸네일/배경/인물 프롬프트 수집
        const mvPrompts = {
            thumbnailEn: document.getElementById('mvThumbnailPromptEn')?.value || '',
            thumbnailKo: document.getElementById('mvThumbnailPromptKo')?.value || '',
            backgroundDetailEn: document.getElementById('mvBackgroundDetailPromptEn')?.value || '',
            backgroundDetailKo: document.getElementById('mvBackgroundDetailPromptKo')?.value || '',
            characterDetailEn: document.getElementById('mvCharacterDetailPromptEn')?.value || '',
            characterDetailKo: document.getElementById('mvCharacterDetailPromptKo')?.value || ''
        };
        
        // 4. 프로젝트에 MV 프롬프트 데이터 저장 (기존 데이터 덮어쓰기)
        if (!window.currentProject) {
            window.currentProject = {};
        }
        if (!window.currentProject.data) {
            window.currentProject.data = {};
        }
        if (!window.currentProject.data.marketing) {
            window.currentProject.data.marketing = {};
        }
        
        // MV 데이터 저장 (깊은 복사로 최신 데이터만 저장, 중복 방지)
        window.currentProject.data.marketing.mvSettings = JSON.parse(JSON.stringify(mvSettings));
        window.currentProject.data.marketing.mvPrompts = JSON.parse(JSON.stringify(mvPrompts));
        window.currentProject.data.marketing.mvScenes = JSON.parse(JSON.stringify(window.currentScenes));
        
        console.log('✅ MV 프롬프트 데이터 저장:', {
            settings: Object.keys(mvSettings).length,
            prompts: Object.keys(mvPrompts).length,
            scenes: window.currentScenes.length
        });
        
        // 5. 프로젝트 저장
        const saved = window.saveCurrentProject();
        if (!saved) {
            alert('프로젝트 저장에 실패했습니다.');
            return;
        }
        
        // 6. 결과 섹션 표시 (confirmSceneOverviewAndGenerate 기능)
        const mvSceneOverviewSection = document.getElementById('mvSceneOverviewSection');
        const mvResultsSection = document.getElementById('mvResultsSection');
        
        if (mvSceneOverviewSection) {
            mvSceneOverviewSection.style.display = 'none';
        }
        
        if (mvResultsSection) {
            mvResultsSection.style.display = 'block';
            
            const totalImages = document.getElementById('mvTotalImages');
            if (totalImages) {
                totalImages.textContent = window.currentScenes.length;
            }
            
            // 개별 씬 프롬프트 표시 (영어/한글 상호 번역 지원)
            const container = document.getElementById('mvPromptsContainer');
            if (container) {
                let html = '';
                
                window.currentScenes.forEach((scene, index) => {
                    const sceneId = `scene_${index}`;
                    html += `
                        <div class="mv-prompt-item" style="margin-bottom: 25px; padding: 20px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h4 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">씬 ${index + 1}</h4>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <span style="color: var(--accent); font-weight: 600; font-size: 0.9rem;">${scene.time}</span>
                                    <button class="btn btn-small btn-primary" onclick="regenerateScenePrompt(${index})" style="padding: 4px 8px; font-size: 0.75rem;">재생성</button>
                                    <button class="btn btn-small btn-success" onclick="saveScenePrompt(${index})" style="padding: 4px 8px; font-size: 0.75rem;">저장</button>
                                </div>
                            </div>
                            <div style="margin-bottom: 15px; padding: 12px; background: var(--bg-input); border-radius: 6px;">
                                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">장면:</div>
                                <div style="color: var(--text-primary);">${scene.scene || '장면 설명'}</div>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <label style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">영어 프롬프트</label>
                                    <button id="copyScenePromptBtn_${index}" class="btn btn-small btn-success" onclick="copyScenePromptEn(${index}, event)" title="영어 프롬프트 복사 (Midjourney용)" style="padding: 4px 10px; font-size: 0.75rem;">
                                        <i class="fas fa-copy"></i> 복사
                                    </button>
                                </div>
                                <textarea 
                                    id="${sceneId}_en" 
                                    class="scene-prompt-en"
                                    data-scene-index="${index}"
                                    style="width: 100%; min-height: 100px; padding: 12px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; font-family: monospace; font-size: 0.9rem; color: var(--text-primary); resize: vertical;"
                                    onchange="syncScenePromptTranslation(${index}, 'en')"
                                    placeholder="영어 프롬프트를 입력하세요...">${scene.prompt || ''}</textarea>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">한글 번역본</label>
                                <textarea 
                                    id="${sceneId}_ko" 
                                    class="scene-prompt-ko"
                                    data-scene-index="${index}"
                                    style="width: 100%; min-height: 100px; padding: 12px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.9rem; color: var(--text-primary); resize: vertical;"
                                    onchange="syncScenePromptTranslation(${index}, 'ko')"
                                    placeholder="한글 프롬프트를 입력하세요...">${scene.promptKo || ''}</textarea>
                            </div>
                        </div>
                    `;
                });
                container.innerHTML = html;
                
                // 각 씬의 한글 프롬프트 자동 생성 (영어가 있으면)
                window.currentScenes.forEach((scene, index) => {
                    const sceneId = `scene_${index}`;
                    const enEl = document.getElementById(`${sceneId}_en`);
                    const koEl = document.getElementById(`${sceneId}_ko`);
                    
                    if (enEl && enEl.value && !koEl.value) {
                        // 영어 프롬프트가 있으면 한글로 번역
                        translateEnglishToKoreanForScene('prompt', enEl.value).then(translated => {
                            if (koEl && translated) {
                                koEl.value = translated;
                            }
                        });
                    }
                });
            }
            
            mvResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // 복사 버튼들 원래대로 복원 (씬별 개요 섹션)
        if (window.currentScenes) {
            window.currentScenes.forEach((scene, index) => {
                const overviewCopyBtn = document.getElementById(`copySceneOverviewBtn_${index}`);
                if (overviewCopyBtn && overviewCopyBtn.dataset.originalHTML) {
                    overviewCopyBtn.innerHTML = overviewCopyBtn.dataset.originalHTML;
                    overviewCopyBtn.disabled = false;
                    overviewCopyBtn.classList.remove('copied');
                }
            });
        }
        
        // 복사 버튼들 원래대로 복원 (씬별 개별 프롬프트 섹션)
        const allCopyButtons = document.querySelectorAll('[id^="copyScenePromptBtn_"]');
        allCopyButtons.forEach(btn => {
            if (btn.dataset.originalHTML) {
                btn.innerHTML = btn.dataset.originalHTML;
                btn.disabled = false;
                btn.classList.remove('copied');
            }
        });
        
        // 복사 버튼들 원래대로 복원 (썸네일/배경/인물 프롬프트 섹션)
        const mvCopyButtonIds = ['copyMVThumbnailBtn', 'copyMVBackgroundBtn', 'copyMVCharacterBtn'];
        mvCopyButtonIds.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn && btn.dataset.originalHTML) {
                btn.innerHTML = btn.dataset.originalHTML;
                btn.disabled = false;
                btn.classList.remove('copied');
            }
        });
        
        // 성공 메시지
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator('✅ MV 프롬프트가 저장 및 확정되었습니다!');
        } else {
            alert('✅ MV 프롬프트가 저장 및 확정되었습니다!');
        }
        
    } catch (error) {
        console.error('저장 및 확정 오류:', error);
        alert('저장 및 확정 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

window.confirmSceneOverviewAndGenerate = async function() {
    if (!window.currentScenes || window.currentScenes.length === 0) {
        alert('생성된 씬이 없습니다.');
        return;
    }
    
    const mvSceneOverviewSection = document.getElementById('mvSceneOverviewSection');
    const mvResultsSection = document.getElementById('mvResultsSection');
    
    if (mvSceneOverviewSection) {
        mvSceneOverviewSection.style.display = 'none';
    }
    
    if (mvResultsSection) {
        mvResultsSection.style.display = 'block';
        
        const totalImages = document.getElementById('mvTotalImages');
        if (totalImages) {
            totalImages.textContent = window.currentScenes.length;
        }
        
        // MV 설정 가져오기
        const era = document.getElementById('mvEra')?.value || '';
        const country = document.getElementById('mvCountry')?.value || '';
        const location = (typeof window.getMVLocationEnString === 'function' ? window.getMVLocationEnString() : (document.getElementById('mvLocation')?.value || ''));
        const characterCount = document.getElementById('mvCharacterCount')?.value || '1';
        const customSettings = document.getElementById('mvCustomSettings')?.value || '';
        const lighting = document.getElementById('mvLighting')?.value || '';
        const cameraWork = document.getElementById('mvCameraWork')?.value || '';
        const mood = document.getElementById('mvMood')?.value || '';
        
        // 인물 정보 수집
        const characters = [];
        for (let i = 1; i <= parseInt(characterCount); i++) {
            const gender = document.getElementById(`mvCharacter${i}_gender`)?.value || '';
            const appearance = document.getElementById(`mvCharacter${i}_appearance`)?.value || '';
            if (gender || appearance) {
                characters.push({ gender, appearance });
            }
        }
        
        // 통합/배경/인물 프롬프트 생성
        // generateMVDetailPrompts 함수는 "MV 프롬프트 상세" 섹션이 제거되어 더 이상 필요하지 않음
        // await generateMVDetailPrompts(era, country, location, characters, customSettings, lighting, cameraWork, mood);
        
        // 개별 씬 프롬프트 표시 (영어/한글 상호 번역 지원)
        const container = document.getElementById('mvPromptsContainer');
        if (container) {
            let html = '';
            
            window.currentScenes.forEach((scene, index) => {
                const sceneId = `scene_${index}`;
                html += `
                    <div class="mv-prompt-item" style="margin-bottom: 25px; padding: 20px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h4 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">씬 ${index + 1}</h4>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <span style="color: var(--accent); font-weight: 600; font-size: 0.9rem;">${scene.time}</span>
                                <button class="btn btn-small btn-primary" onclick="regenerateScenePrompt(${index})" style="padding: 4px 8px; font-size: 0.75rem;">재생성</button>
                                <button class="btn btn-small btn-success" onclick="saveScenePrompt(${index})" style="padding: 4px 8px; font-size: 0.75rem;">저장</button>
                                </div>
                            </div>
                        <div style="margin-bottom: 15px; padding: 12px; background: var(--bg-input); border-radius: 6px;">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">장면:</div>
                            <div style="color: var(--text-primary);">${scene.scene || '장면 설명'}</div>
                                    </div>
                            <div style="margin-bottom: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <label style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">영어 프롬프트</label>
                                    <button id="copyScenePromptBtn_${index}" class="btn btn-small btn-success" onclick="copyScenePromptEn(${index}, event)" title="영어 프롬프트 복사 (Midjourney용)" style="padding: 4px 10px; font-size: 0.75rem;">
                                        <i class="fas fa-copy"></i> 복사
                                    </button>
                                </div>
                                <textarea 
                                    id="${sceneId}_en" 
                                    class="scene-prompt-en"
                                    data-scene-index="${index}"
                                    style="width: 100%; min-height: 100px; padding: 12px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; font-family: monospace; font-size: 0.9rem; color: var(--text-primary); resize: vertical;"
                                    onchange="syncScenePromptTranslation(${index}, 'en')"
                                    placeholder="영어 프롬프트를 입력하세요...">${scene.prompt || ''}</textarea>
                            </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">한글 번역본</label>
                            <textarea 
                                id="${sceneId}_ko" 
                                class="scene-prompt-ko"
                                data-scene-index="${index}"
                                style="width: 100%; min-height: 100px; padding: 12px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.9rem; color: var(--text-primary); resize: vertical;"
                                onchange="syncScenePromptTranslation(${index}, 'ko')"
                                placeholder="한글 프롬프트를 입력하세요...">${scene.promptKo || ''}</textarea>
                                    </div>
                                </div>
                            `;
                        });
            container.innerHTML = html;
            
            // 각 씬의 한글 프롬프트 자동 생성 (영어가 있으면)
            window.currentScenes.forEach((scene, index) => {
                const sceneId = `scene_${index}`;
                const enEl = document.getElementById(`${sceneId}_en`);
                const koEl = document.getElementById(`${sceneId}_ko`);
                
                if (enEl && enEl.value && !koEl.value) {
                    // 영어 프롬프트가 있으면 한글로 번역
                    translateEnglishToKoreanForScene('prompt', enEl.value).then(translated => {
                        if (koEl && translated) {
                            koEl.value = translated;
                        }
                    });
                }
            });
        }
        
        mvResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    if (window.currentProject) {
        if (!window.currentProject.data) {
            window.currentProject.data = {};
        }
        if (!window.currentProject.data.marketing) {
            window.currentProject.data.marketing = {};
        }
        window.currentProject.data.marketing.mvPrompts = window.currentScenes;
    }
};

window.copyAllMVPrompts = function(event) {
    if (!window.currentScenes || window.currentScenes.length === 0) {
        alert('복사할 프롬프트가 없습니다.');
        return;
    }
    
    let text = '';
    
    // 통합/배경/인물 프롬프트 추가
    const combinedKo = document.getElementById('mvCombinedPromptKo')?.value || '';
    const combinedEn = document.getElementById('mvCombinedPromptEn')?.value || '';
    const backgroundKo = document.getElementById('mvBackgroundPromptKo')?.value || '';
    const backgroundEn = document.getElementById('mvBackgroundPromptEn')?.value || '';
    const characterKo = document.getElementById('mvCharacterPromptKo')?.value || '';
    const characterEn = document.getElementById('mvCharacterPromptEn')?.value || '';
    
    // 썸네일/배경/인물 상세 프롬프트
    const thumbnailKo = document.getElementById('mvThumbnailPromptKo')?.value || '';
    const thumbnailEn = document.getElementById('mvThumbnailPromptEn')?.value || '';
    const backgroundDetailKo = document.getElementById('mvBackgroundDetailPromptKo')?.value || '';
    const backgroundDetailEn = document.getElementById('mvBackgroundDetailPromptEn')?.value || '';
    const characterDetailKo = document.getElementById('mvCharacterDetailPromptKo')?.value || '';
    const characterDetailEn = document.getElementById('mvCharacterDetailPromptEn')?.value || '';
    
    if (combinedKo || combinedEn || backgroundKo || backgroundEn || characterKo || characterEn || 
        thumbnailKo || thumbnailEn || backgroundDetailKo || backgroundDetailEn || characterDetailKo || characterDetailEn) {
        text += '=== MV 프롬프트 상세 ===\n\n';
        
        if (thumbnailKo || thumbnailEn) {
            text += '🎬 썸네일 이미지 프롬프트\n';
            if (thumbnailKo) text += `[한글]\n${thumbnailKo}\n\n`;
            if (thumbnailEn) text += `[영어]\n${thumbnailEn}\n\n`;
        }
        
        if (combinedKo || combinedEn) {
            text += '📝 통합 프롬프트\n';
            if (combinedKo) text += `[한글]\n${combinedKo}\n\n`;
            if (combinedEn) text += `[영어]\n${combinedEn}\n\n`;
        }
        
        if (backgroundDetailKo || backgroundDetailEn) {
            text += '🏞️ 배경 프롬프트 (상세)\n';
            if (backgroundDetailKo) text += `[한글]\n${backgroundDetailKo}\n\n`;
            if (backgroundDetailEn) text += `[영어]\n${backgroundDetailEn}\n\n`;
        } else if (backgroundKo || backgroundEn) {
            text += '🏞️ 배경 프롬프트\n';
            if (backgroundKo) text += `[한글]\n${backgroundKo}\n\n`;
            if (backgroundEn) text += `[영어]\n${backgroundEn}\n\n`;
        }
        
        if (characterDetailKo || characterDetailEn) {
            text += '👤 인물 프롬프트 (상세)\n';
            if (characterDetailKo) text += `[한글]\n${characterDetailKo}\n\n`;
            if (characterDetailEn) text += `[영어]\n${characterDetailEn}\n\n`;
        } else if (characterKo || characterEn) {
            text += '👤 인물 프롬프트\n';
            if (characterKo) text += `[한글]\n${characterKo}\n\n`;
            if (characterEn) text += `[영어]\n${characterEn}\n\n`;
        }
        
        text += '=== 씬별 개별 프롬프트 ===\n\n';
    }
    
    window.currentScenes.forEach((scene, index) => {
        const sceneId = `scene_${index}`;
        const enEl = document.getElementById(`${sceneId}_en`);
        const koEl = document.getElementById(`${sceneId}_ko`);
        
        text += `씬 ${index + 1} (${scene.time})\n`;
        text += `장면: ${scene.scene || ''}\n`;
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
        text += '\n';
    });
    
    navigator.clipboard.writeText(text).then(() => {
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator('✅ 모든 MV 프롬프트가 클립보드에 복사되었습니다!');
            } else {
            alert('모든 MV 프롬프트가 클립보드에 복사되었습니다.');
        }
    }).catch(() => {
        alert('복사 중 오류가 발생했습니다.');
    });
};

window.downloadMVPrompts = function() {
    if (!window.currentScenes || window.currentScenes.length === 0) {
        alert('다운로드할 프롬프트가 없습니다.');
        return;
    }
    
    let text = 'MV 프롬프트\n\n';
    
    // 통합/배경/인물 프롬프트 추가
    const combinedKo = document.getElementById('mvCombinedPromptKo')?.value || '';
    const combinedEn = document.getElementById('mvCombinedPromptEn')?.value || '';
    const backgroundKo = document.getElementById('mvBackgroundPromptKo')?.value || '';
    const backgroundEn = document.getElementById('mvBackgroundPromptEn')?.value || '';
    const characterKo = document.getElementById('mvCharacterPromptKo')?.value || '';
    const characterEn = document.getElementById('mvCharacterPromptEn')?.value || '';
    
    if (combinedKo || combinedEn) {
        text += '=== 통합 프롬프트 ===\n';
        if (combinedKo) text += `[한글]\n${combinedKo}\n\n`;
        if (combinedEn) text += `[영어]\n${combinedEn}\n\n`;
    }
    
    if (backgroundKo || backgroundEn) {
        text += '=== 배경 프롬프트 ===\n';
        if (backgroundKo) text += `[한글]\n${backgroundKo}\n\n`;
        if (backgroundEn) text += `[영어]\n${backgroundEn}\n\n`;
    }
    
    if (characterKo || characterEn) {
        text += '=== 인물 프롬프트 ===\n';
        if (characterKo) text += `[한글]\n${characterKo}\n\n`;
        if (characterEn) text += `[영어]\n${characterEn}\n\n`;
    }
    
    text += '=== 씬별 개별 프롬프트 ===\n\n';
    window.currentScenes.forEach((scene, index) => {
        const sceneId = `scene_${index}`;
        const enEl = document.getElementById(`${sceneId}_en`);
        const koEl = document.getElementById(`${sceneId}_ko`);
        
        text += `씬 ${index + 1} (${scene.time})\n`;
        text += `장면: ${scene.scene || ''}\n`;
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
        text += '\n';
    });
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mv-prompts.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
// [MOVED] extraction block
\`\`\`

**매우 중요:**
- **가사 내용을 가장 우선적으로 반영하세요** - 각 프롬프트에 가사에서 묘사되는 장면, 감정, 상황을 구체적으로 포함하세요
- 각 프롬프트는 40단어 이상
- 가사의 감정과 내용을 시각적으로 표현
- 설정값(시대, 국가, 장소, 조명, 카메라, 분위기, 인물)은 가사 내용과 자연스럽게 융합
- 영어 프롬프트는 순수 영어만 (한글 없음)
- 한글 프롬프트는 자연스러운 한글로 작성
- JSON 형식만 출력`;

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
                const response = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.8,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 4096,
                        }
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    
                    console.log('🤖 MV 상세 프롬프트 AI 응답 수신:', aiResponse.substring(0, 300) + '...');
                    
                    // JSON 추출
                    let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const aiPrompts = JSON.parse(jsonMatch[0]);
                        
                        combinedEn = aiPrompts.combinedEn || '';
                        combinedKo = aiPrompts.combinedKo || '';
                        backgroundEn = aiPrompts.backgroundEn || '';
                        backgroundKo = aiPrompts.backgroundKo || '';
                        characterEn = aiPrompts.characterEn || '';
                        characterKo = aiPrompts.characterKo || '';
                        
                        console.log('✅ MV 상세 프롬프트 AI 생성 완료');
                        
                        // 한글 프롬프트가 없으면 영어에서 번역
                        if (!combinedKo && combinedEn) {
                            combinedKo = await translateEnglishToKoreanForScene('prompt', combinedEn) || '';
                        }
                        if (!backgroundKo && backgroundEn) {
                            backgroundKo = await translateEnglishToKoreanForScene('background', backgroundEn) || '';
                        }
                        if (!characterKo && characterEn) {
                            characterKo = await translateEnglishToKoreanForScene('character', characterEn) || '';
                        }
                    }
                }
            } catch (aiError) {
                console.warn('⚠️ MV 상세 프롬프트 AI 생성 실패, 기본 방식으로 전환:', aiError);
            }
        }
        
        // AI 생성 실패 시 기본 방식으로 생성
        if (!combinedEn || !backgroundEn || !characterEn) {
            // 설정 정보를 기반으로 프롬프트 구성 요소 생성
            const settingParts = [];
            const settingPartsKo = [];
        
        // 시대
        if (era) {
            const eraMap = {
                'modern': { en: 'modern (2020s)', ko: '현대 (2020년대)' },
                '2010s': { en: '2010s', ko: '2010년대' },
                '2000s': { en: '2000s', ko: '2000년대' },
                '1990s': { en: '1990s', ko: '1990년대' },
                '1980s': { en: '1980s', ko: '1980년대' },
                '1970s': { en: '1970s', ko: '1970년대' },
                '1960s': { en: '1960s', ko: '1960년대' },
                '1950s': { en: '1950s', ko: '1950년대' },
                'vintage': { en: 'vintage (retro style)', ko: '빈티지 (복고풍)' },
                'future': { en: 'futuristic', ko: '미래' },
                'timeless': { en: 'timeless (no specific era)', ko: '시대 불명 (시대적 특성 없음)' }
            };
            const eraInfo = eraMap[era] || { en: era, ko: era };
            settingParts.push(eraInfo.en);
            settingPartsKo.push(eraInfo.ko);
        }
        
        // 국가/지역
        if (country) {
            const countryMap = {
                'korea': { en: 'Korea', ko: '한국' },
                'japan': { en: 'Japan', ko: '일본' },
                'china': { en: 'China', ko: '중국' },
                'usa': { en: 'USA', ko: '미국' },
                'uk': { en: 'UK', ko: '영국' },
                'france': { en: 'France', ko: '프랑스' },
                'italy': { en: 'Italy', ko: '이탈리아' },
                'spain': { en: 'Spain', ko: '스페인' },
                'germany': { en: 'Germany', ko: '독일' },
                'europe': { en: 'Europe', ko: '유럽' },
                'asia': { en: 'Asia', ko: '아시아' },
                'latin': { en: 'Latin America', ko: '라틴 아메리카' },
                'middle-east': { en: 'Middle East', ko: '중동' },
                'africa': { en: 'Africa', ko: '아프리카' },
                'generic': { en: 'generic location', ko: '지역 불명 (일반적 배경)' }
            };
            const countryInfo = countryMap[country] || { en: country, ko: country };
            settingParts.push(countryInfo.en);
            settingPartsKo.push(countryInfo.ko);
        }
        
        // 장소 유형 (다중 선택 반영)
        const locationVals = (typeof window.getMVLocationValues === 'function' ? window.getMVLocationValues() : []);
        if (locationVals.length > 0) {
            locationVals.forEach(loc => {
                const info = (typeof MV_LOCATION_MAP !== 'undefined' && MV_LOCATION_MAP[loc]) ? MV_LOCATION_MAP[loc] : { en: loc, ko: loc };
                settingParts.push(info.en);
                settingPartsKo.push(info.ko);
            });
        }
        
        // 인물 정보
        let characterParts = [];
        let characterPartsKo = [];
        if (characters && characters.length > 0) {
            characters.forEach((char, index) => {
                if (char.gender) {
                    // 성별/나이 정보를 정확히 반영
                    const genderText = char.gender.trim();
                    characterParts.push(genderText);
                    characterPartsKo.push(genderText);
                }
                if (char.appearance) {
                    characterParts.push(char.appearance.trim());
                    characterPartsKo.push(char.appearance.trim());
                }
            });
        }
        
        // 통합 프롬프트 생성
        let combinedKo = '';
        let combinedEn = '';
        
        if (settingPartsKo.length > 0) {
            combinedKo += settingPartsKo.join(', ') + ' 배경';
        }
        if (characterPartsKo.length > 0) {
            if (combinedKo) combinedKo += ', ';
            combinedKo += characterPartsKo.join(', ') + ' 인물';
        }
        if (customSettings) {
            if (combinedKo) combinedKo += ', ';
            combinedKo += customSettings;
        }
        
        if (settingParts.length > 0) {
            combinedEn += settingParts.join(', ') + ' background';
        }
        if (characterParts.length > 0) {
            if (combinedEn) combinedEn += ', ';
            combinedEn += characterParts.join(', ') + ' character';
        }
        if (customSettings) {
            if (combinedEn) combinedEn += ', ';
            combinedEn += customSettings;
        }
        
        // 조명 추가
        if (lighting) {
            const lightingMap = {
                'natural': { en: 'natural lighting', ko: '자연광' },
                'soft': { en: 'soft lighting', ko: '부드러운 조명' },
                'dramatic': { en: 'dramatic lighting', ko: '드라마틱한 조명' },
                'warm': { en: 'warm lighting', ko: '따뜻한 조명' },
                'cool': { en: 'cool lighting', ko: '차가운 조명' },
                'neon': { en: 'neon lighting', ko: '네온 조명' },
                'golden-hour': { en: 'golden hour lighting', ko: '골든 아워 조명' },
                'blue-hour': { en: 'blue hour lighting', ko: '블루 아워 조명' },
                'studio': { en: 'studio lighting', ko: '스튜디오 조명' },
                'cinematic': { en: 'cinematic lighting', ko: '시네마틱 조명' }
            };
            const lightingInfo = lightingMap[lighting] || { en: lighting, ko: lighting };
            if (combinedEn) combinedEn += ', ';
            combinedEn += lightingInfo.en;
            if (combinedKo) combinedKo += ', ';
            combinedKo += lightingInfo.ko;
        }
        
        // 카메라 워크 추가
        if (cameraWork) {
            const cameraMap = {
                'close-up': { en: 'close-up shot', ko: '클로즈업' },
                'wide-shot': { en: 'wide shot', ko: '와이드 샷' },
                'medium-shot': { en: 'medium shot', ko: '미디엄 샷' },
                'dolly': { en: 'dolly shot', ko: '돌리 촬영' },
                'tracking': { en: 'tracking shot', ko: '트래킹 촬영' },
                'pan': { en: 'pan shot', ko: '팬 촬영' },
                'tilt': { en: 'tilt shot', ko: '틸트 촬영' },
                'handheld': { en: 'handheld camera', ko: '핸드헬드' },
                'steady-cam': { en: 'steady cam', ko: '스테디캠' },
                'drone': { en: 'drone shot', ko: '드론 촬영' }
            };
            const cameraInfo = cameraMap[cameraWork] || { en: cameraWork, ko: cameraWork };
            if (combinedEn) combinedEn += ', ';
            combinedEn += cameraInfo.en;
            if (combinedKo) combinedKo += ', ';
            combinedKo += cameraInfo.ko;
        }
        
        // 분위기 추가
        if (mood) {
        const moodMap = {
                'romantic': { en: 'romantic mood', ko: '로맨틱한 분위기' },
                'melancholic': { en: 'melancholic mood', ko: '멜랑꼴릭한 분위기' },
                'energetic': { en: 'energetic mood', ko: '에너제틱한 분위기' },
                'peaceful': { en: 'peaceful mood', ko: '평화로운 분위기' },
                'mysterious': { en: 'mysterious mood', ko: '신비로운 분위기' },
                'nostalgic': { en: 'nostalgic mood', ko: '노스탤지어 분위기' },
                'dramatic': { en: 'dramatic mood', ko: '드라마틱한 분위기' },
                'dreamy': { en: 'dreamy mood', ko: '드리미한 분위기' },
                'intense': { en: 'intense mood', ko: '강렬한 분위기' },
                'gentle': { en: 'gentle mood', ko: '부드러운 분위기' }
            };
            const moodInfo = moodMap[mood] || { en: mood, ko: mood };
            if (combinedEn) combinedEn += ', ';
            combinedEn += moodInfo.en;
            if (combinedKo) combinedKo += ', ';
            combinedKo += moodInfo.ko;
        }
        
        combinedEn += ', high quality, photorealistic, detailed';
        
        // 배경 프롬프트 생성
        let backgroundKo = '';
        let backgroundEn = '';
        
        if (settingPartsKo.length > 0) {
            backgroundKo = settingPartsKo.join(', ') + ' 배경';
        }
        // 장소 유형은 이미 settingParts/settingPartsKo에 다중 선택으로 반영됨
        if (customSettings) {
            if (backgroundKo) backgroundKo += ', ' + customSettings;
            else backgroundKo = customSettings;
            if (backgroundEn) backgroundEn += ', ' + customSettings;
            else backgroundEn = customSettings;
        }
        backgroundEn += ', high quality, photorealistic, detailed background';
        
        // 인물 프롬프트 생성
        let characterKo = '';
        let characterEn = '';
        
        if (characterPartsKo.length > 0) {
            characterKo = characterPartsKo.join(', ') + ' 인물';
        }
        if (characterParts.length > 0) {
            characterEn = characterParts.join(', ') + ' person';
        }
        if (customSettings) {
            if (characterKo) characterKo += ', ' + customSettings;
            else characterKo = customSettings;
            if (characterEn) characterEn += ', ' + customSettings;
            else characterEn = customSettings;
        }
            characterEn += ', high quality, photorealistic, natural pose, detailed hands';
            
            // 한글 프롬프트 생성
            if (!combinedKo && combinedEn) {
                combinedKo = await translateEnglishToKoreanForScene('prompt', combinedEn) || '';
            }
            if (!backgroundKo && backgroundEn) {
                backgroundKo = await translateEnglishToKoreanForScene('background', backgroundEn) || '';
            }
            if (!characterKo && characterEn) {
                characterKo = await translateEnglishToKoreanForScene('character', characterEn) || '';
            }
        }
        
        // UI에 표시
        const combinedKoEl = document.getElementById('mvCombinedPromptKo');
        const combinedEnEl = document.getElementById('mvCombinedPromptEn');
        const backgroundKoEl = document.getElementById('mvBackgroundPromptKo');
        const backgroundEnEl = document.getElementById('mvBackgroundPromptEn');
        const characterKoEl = document.getElementById('mvCharacterPromptKo');
        const characterEnEl = document.getElementById('mvCharacterPromptEn');
        
        if (combinedKoEl) combinedKoEl.value = combinedKo || '설정된 내용이 없습니다.';
        if (combinedEnEl) {
            if (combinedEn) {
                combinedEnEl.value = combinedEn;
            } else if (combinedKo) {
                // 한글이 있으면 번역
                const translated = await translateKoreanToEnglishForScene('prompt', combinedKo);
                combinedEnEl.value = translated || combinedKo;
            } else {
                combinedEnEl.value = 'No settings configured.';
            }
        }
        
        if (backgroundKoEl) backgroundKoEl.value = backgroundKo || '설정된 내용이 없습니다.';
        if (backgroundEnEl) {
            if (backgroundEn) {
                backgroundEnEl.value = backgroundEn;
            } else if (backgroundKo) {
                const translated = await translateKoreanToEnglishForScene('background', backgroundKo);
                backgroundEnEl.value = translated || backgroundKo;
            } else {
                backgroundEnEl.value = 'No settings configured.';
            }
        }
        
        if (characterKoEl) characterKoEl.value = characterKo || '설정된 내용이 없습니다.';
        if (characterEnEl) {
            if (characterEn) {
                characterEnEl.value = characterEn;
            } else if (characterKo) {
                const translated = await translateKoreanToEnglishForScene('character', characterKo);
                characterEnEl.value = translated || characterKo;
            } else {
                characterEnEl.value = 'No settings configured.';
            }
        }
        
    } catch (error) {
        console.error('MV 상세 프롬프트 생성 오류:', error);
    }
};

// 한글 프롬프트 수정 시 자동 영어 번역 (또는 그 반대)
window.updateMVPromptTranslation = async function(type) {
    try {
        const koId = `mv${type.charAt(0).toUpperCase() + type.slice(1)}PromptKo`;
        const enId = `mv${type.charAt(0).toUpperCase() + type.slice(1)}PromptEn`;
        
        const koEl = document.getElementById(koId);
        const enEl = document.getElementById(enId);
        
        if (!koEl || !enEl) return;
        
        const koText = koEl.value.trim();
        if (!koText) {
            enEl.value = '';
            return;
        }
        
        // 번역 실행
        const translated = await translateKoreanToEnglishForScene(koText);
        if (translated) {
            enEl.value = translated;
        }
    } catch (error) {
        console.error('프롬프트 번역 오류:', error);
    }
};

// 프롬프트 상호 번역 (영어↔한글)
window.syncMVPromptTranslation = async function(type, sourceLang) {
    try {
        let koId, enId;
        
        // 타입에 따라 ID 결정
        const typeMap = {
            'thumbnail': { ko: 'mvThumbnailPromptKo', en: 'mvThumbnailPromptEn' },
            'backgroundDetail': { ko: 'mvBackgroundDetailPromptKo', en: 'mvBackgroundDetailPromptEn' },
            'characterDetail': { ko: 'mvCharacterDetailPromptKo', en: 'mvCharacterDetailPromptEn' },
            'combined': { ko: 'mvCombinedPromptKo', en: 'mvCombinedPromptEn' },
            'background': { ko: 'mvBackgroundPromptKo', en: 'mvBackgroundPromptEn' },
            'character': { ko: 'mvCharacterPromptKo', en: 'mvCharacterPromptEn' }
        };
        
        const ids = typeMap[type];
        if (!ids) return;
        
        koId = ids.ko;
        enId = ids.en;
        
        const koEl = document.getElementById(koId);
        const enEl = document.getElementById(enId);
        
        if (!koEl || !enEl) return;
        
        if (sourceLang === 'en') {
            // 영어를 수정했으면 한글로 번역
            const enText = enEl.value.trim();
            if (enText) {
                const translated = await translateEnglishToKoreanForScene('prompt', enText);
                if (translated) {
                    koEl.value = translated;
                }
            } else {
                koEl.value = '';
            }
        } else if (sourceLang === 'ko') {
            // 한글을 수정했으면 영어로 번역
            const koText = koEl.value.trim();
            if (koText) {
                const translated = await translateKoreanToEnglishForScene(koText);
                if (translated) {
                    enEl.value = translated;
                }
                    } else {
                enEl.value = '';
            }
        }
    } catch (error) {
        console.error('프롬프트 상호 번역 오류:', error);
    }
};

// 씬별 개요 섹션 프롬프트 상호 번역
window.syncSceneOverviewPromptTranslation = async function(sceneIndex, sourceLang) {
    try {
        const enEl = document.getElementById(`scene_overview_${sceneIndex}_en`);
        const koEl = document.getElementById(`scene_overview_${sceneIndex}_ko`);
        
        if (!enEl || !koEl) {
            console.warn(`씬 ${sceneIndex}의 프롬프트 요소를 찾을 수 없습니다.`);
        return;
    }
    
        // 번역 중 플래그로 무한 루프 방지
        if (enEl.dataset.translating === 'true' || koEl.dataset.translating === 'true') {
        return;
    }
        
        if (sourceLang === 'en') {
            // 영어를 수정했으면 한글로 번역
            let enText = enEl.value.trim();
            
            // 영어 프롬프트에서 한글 제거
            const koreanPattern = /[가-힣]+/g;
            if (koreanPattern.test(enText)) {
                enText = enText.replace(koreanPattern, '').trim();
                enText = enText.replace(/\s+/g, ' ').trim();
                enEl.value = enText;
            }
            
            if (enText) {
                enEl.dataset.translating = 'true';
                try {
                    const translated = await translateEnglishToKoreanForScene('prompt', enText);
                    if (translated && koEl) {
                        koEl.value = translated;
                        // window.currentScenes도 업데이트
                        if (window.currentScenes && window.currentScenes[sceneIndex]) {
                            window.currentScenes[sceneIndex].prompt = enText;
                            window.currentScenes[sceneIndex].promptKo = translated;
                        }
                    }
                } catch (error) {
                    console.error('영어→한글 번역 오류:', error);
                } finally {
                    enEl.dataset.translating = 'false';
                }
        } else {
                koEl.value = '';
            }
        } else if (sourceLang === 'ko') {
            // 한글을 수정했으면 영어로 번역
            let koText = koEl.value.trim();
            
            // 한글 프롬프트에서 영어 제거 (한글만 유지)
            const englishPattern = /[a-zA-Z]+(?:\s+[a-zA-Z]+)*/g;
            if (englishPattern.test(koText)) {
                // 영어 단어들을 제거하되, 한글과 섞인 경우는 유지
                // 단순히 영어만 있는 경우만 제거
                const words = koText.split(/\s+/);
                const koreanWords = words.filter(word => /[가-힣]/.test(word));
                if (koreanWords.length > 0) {
                    koText = koreanWords.join(' ');
                }
                koEl.value = koText;
            }
            
            if (koText) {
                koEl.dataset.translating = 'true';
                try {
                    const translated = await translateKoreanToEnglishForScene('prompt', koText);
                    if (translated && enEl) {
                        // 번역된 영어에서 한글 제거
                        let cleanTranslated = translated.replace(/[가-힣]+/g, '').trim();
                        cleanTranslated = cleanTranslated.replace(/\s+/g, ' ').trim();
                        enEl.value = cleanTranslated;
                        // window.currentScenes도 업데이트
                        if (window.currentScenes && window.currentScenes[sceneIndex]) {
                            window.currentScenes[sceneIndex].prompt = cleanTranslated;
                            window.currentScenes[sceneIndex].promptKo = koText;
                        }
                    }
                } catch (error) {
                    console.error('한글→영어 번역 오류:', error);
                } finally {
                    koEl.dataset.translating = 'false';
                }
            } else {
                enEl.value = '';
            }
        }
        } catch (error) {
        console.error('씬 개요 프롬프트 상호 번역 오류:', error);
    }
};

// 씬별 프롬프트 상호 번역 (결과 섹션용)
window.syncScenePromptTranslation = async function(sceneIndex, sourceLang) {
    try {
        const sceneId = `scene_${sceneIndex}`;
        const enEl = document.getElementById(`${sceneId}_en`);
        const koEl = document.getElementById(`${sceneId}_ko`);
        
        if (!enEl || !koEl) return;
        
        if (sourceLang === 'en') {
            // 영어를 수정했으면 한글로 번역
            const enText = enEl.value.trim();
            if (enText) {
                const translated = await translateEnglishToKoreanForScene('prompt', enText);
                if (translated) {
                    koEl.value = translated;
                    // window.currentScenes도 업데이트
                    if (window.currentScenes && window.currentScenes[sceneIndex]) {
                        window.currentScenes[sceneIndex].prompt = enText;
                        window.currentScenes[sceneIndex].promptKo = translated;
                    }
                }
                } else {
                koEl.value = '';
            }
        } else if (sourceLang === 'ko') {
            // 한글을 수정했으면 영어로 번역
            const koText = koEl.value.trim();
            if (koText) {
                const translated = await translateKoreanToEnglishForScene(koText);
                if (translated) {
                    enEl.value = translated;
                    // window.currentScenes도 업데이트
                    if (window.currentScenes && window.currentScenes[sceneIndex]) {
                        window.currentScenes[sceneIndex].prompt = translated;
                        window.currentScenes[sceneIndex].promptKo = koText;
                    }
                }
                } else {
                enEl.value = '';
            }
        }
    } catch (error) {
        console.error('씬 프롬프트 상호 번역 오류:', error);
    }
};
// [MOVED] extraction block
\`\`\`

**매우 중요:**
- **전체 가사 내용을 가장 우선적으로 반영하세요** - 각 프롬프트에 전체 가사에서 묘사되는 장면, 감정, 상황을 구체적으로 포함하세요
- **MV 프롬프트 상세 설정을 반드시 반영하세요** - 시대, 국가, 장소, 조명, 카메라, 분위기, 인물 정보를 전체 가사 내용과 자연스럽게 융합
- 각 프롬프트는 60단어 이상의 상세한 묘사
- 가사의 감정과 내용을 시각적으로 표현
- **인물 상세 정보(성별, 나이, 인종, 외모/스타일)는 모든 프롬프트에서 일관되게 반영되어야 합니다**
- **미드저니 고화질 실사진 키워드는 필수로 포함**하세요 (각 프롬프트 설명에 명시된 키워드들)
- 영어 프롬프트는 순수 영어만 (한글 없음)
- 한글 프롬프트는 자연스러운 한글로 작성
- JSON 형식만 출력`;

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
                const response = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.8,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 4096,
                        }
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    
                    console.log('🤖 AI 응답 수신:', aiResponse.substring(0, 300) + '...');
                    
                    // JSON 추출
                    let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const aiPrompts = JSON.parse(jsonMatch[0]);
                        
                        // 영어 프롬프트
                        thumbnailEn = aiPrompts.thumbnailEn || aiPrompts.thumbnail || '';
                        backgroundEn = aiPrompts.backgroundEn || aiPrompts.background || '';
                        characterEn = aiPrompts.characterEn || aiPrompts.character || '';
                        
                        // 한글 프롬프트
                        thumbnailKo = aiPrompts.thumbnailKo || '';
                        backgroundKo = aiPrompts.backgroundKo || '';
                        characterKo = aiPrompts.characterKo || '';
                        
                        console.log('✅ AI 프롬프트 생성 완료');
                        
                        // 한글 프롬프트가 없으면 영어에서 번역
                        if (!thumbnailKo && thumbnailEn) {
                            thumbnailKo = await translateEnglishToKoreanForScene('thumbnail', thumbnailEn) || '';
                        }
                        if (!backgroundKo && backgroundEn) {
                            backgroundKo = await translateEnglishToKoreanForScene('background', backgroundEn) || '';
                        }
                        if (!characterKo && characterEn) {
                            characterKo = await translateEnglishToKoreanForScene('character', characterEn) || '';
                        }
                    }
                }
            } catch (aiError) {
                console.warn('⚠️ AI 프롬프트 생성 실패, 기본 방식으로 전환:', aiError);
            }
        }
        
        // AI 생성 실패 시 기본 방식으로 생성
        if (!thumbnailEn || !backgroundEn || !characterEn) {
            console.log('📝 기본 방식으로 프롬프트 생성...');
            
            // 설정 정보를 기반으로 프롬프트 구성
            const settingParts = [];
            
            if (era) {
                const eraMap = {
                    'modern': 'modern (2020s)',
                    '2010s': '2010s',
                    '2000s': '2000s',
                    '1990s': '1990s',
                    'vintage': 'vintage (retro style)',
                    'future': 'futuristic',
                    'timeless': 'timeless'
                };
                settingParts.push(eraMap[era] || era);
            }
            
            if (country) {
                const countryMap = {
                    'korea': 'Korea',
                    'japan': 'Japan',
                    'usa': 'USA',
                    'uk': 'UK'
                };
                settingParts.push(countryMap[country] || country);
            }
            
            const locationVals = (typeof window.getMVLocationValues === 'function' ? window.getMVLocationValues() : []);
            if (locationVals.length > 0) {
                locationVals.forEach(loc => {
                    const en = (typeof MV_LOCATION_MAP !== 'undefined' && MV_LOCATION_MAP[loc]) ? MV_LOCATION_MAP[loc].en : loc;
                    settingParts.push(en);
                });
            }
            
            if (lighting) {
                const lightingMap = {
                    'natural': 'natural lighting',
                    'soft': 'soft lighting',
                    'dramatic': 'dramatic lighting',
                    'warm': 'warm lighting',
                    'cool': 'cool lighting',
                    'neon': 'neon lighting',
                    'cinematic': 'cinematic lighting'
                };
                settingParts.push(lightingMap[lighting] || lighting);
            }
            
            if (cameraWork) {
                const cameraMap = {
                    'close-up': 'close-up shot',
                    'wide-shot': 'wide shot',
                    'medium-shot': 'medium shot'
                };
                settingParts.push(cameraMap[cameraWork] || cameraWork);
            }
            
            if (mood) {
                const moodMap = {
                    'romantic': 'romantic mood',
                    'melancholic': 'melancholic mood',
                    'energetic': 'energetic mood',
                    'peaceful': 'peaceful mood'
                };
                settingParts.push(moodMap[mood] || mood);
            }
            
            // 썸네일 프롬프트
            if (!thumbnailEn) {
                thumbnailEn = [characterInfo, ...settingParts, customSettings].filter(s => s && s.trim()).join(', ');
                thumbnailEn += ', ultra high quality, 8k resolution, photorealistic, cinematic composition, 16:9 aspect ratio, representative thumbnail image';
            }
            
            // 배경 프롬프트
            if (!backgroundEn) {
                backgroundEn = [...settingParts, customSettings].filter(s => s && s.trim()).join(', ');
                backgroundEn += ', background-focused composition, ultra high quality, 8k resolution, photorealistic, detailed background';
            }
            
            // 인물 프롬프트
            if (!characterEn) {
                characterEn = [characterInfo, ...settingParts, customSettings].filter(s => s && s.trim()).join(', ');
                characterEn += ', character-focused composition, ultra high quality, 8k resolution, photorealistic, natural pose, detailed hands, detailed facial features';
            }
        }
        
        // 한글 프롬프트가 없으면 영어에서 번역
        if (!thumbnailKo && thumbnailEn) {
            thumbnailKo = await translateEnglishToKoreanForScene('thumbnail', thumbnailEn) || '';
        }
        if (!backgroundKo && backgroundEn) {
            backgroundKo = await translateEnglishToKoreanForScene('background', backgroundEn) || '';
        }
        if (!characterKo && characterEn) {
            characterKo = await translateEnglishToKoreanForScene('character', characterEn) || '';
        }
        
        // ========== UI에 표시 ==========
        console.log('🎨 썸네일/배경/인물 프롬프트 UI 업데이트 시작...');
        
        const thumbnailEnEl = document.getElementById('mvThumbnailPromptEn');
        const thumbnailKoEl = document.getElementById('mvThumbnailPromptKo');
        const backgroundDetailEnEl = document.getElementById('mvBackgroundDetailPromptEn');
        const backgroundDetailKoEl = document.getElementById('mvBackgroundDetailPromptKo');
        const characterDetailEnEl = document.getElementById('mvCharacterDetailPromptEn');
        const characterDetailKoEl = document.getElementById('mvCharacterDetailPromptKo');
        
        // 썸네일 프롬프트 UI 업데이트
        if (thumbnailEnEl) {
            thumbnailEnEl.value = thumbnailEn || '설정된 내용이 없습니다.';
            console.log('✅ 썸네일 영어 프롬프트 UI 업데이트:', thumbnailEn.substring(0, 50) + '...');
        }
        if (thumbnailKoEl) {
            thumbnailKoEl.value = thumbnailKo || '설정된 내용이 없습니다.';
        }
        
        // 배경 프롬프트 UI 업데이트
        if (backgroundDetailEnEl) {
            backgroundDetailEnEl.value = backgroundEn || '설정된 내용이 없습니다.';
            console.log('✅ 배경 영어 프롬프트 UI 업데이트:', backgroundEn.substring(0, 50) + '...');
        }
        if (backgroundDetailKoEl) {
            backgroundDetailKoEl.value = backgroundKo || '설정된 내용이 없습니다.';
        }
        
        // 인물 프롬프트 UI 업데이트
        if (characterDetailEnEl) {
            characterDetailEnEl.value = characterEn || '설정된 내용이 없습니다.';
            console.log('✅ 인물 영어 프롬프트 UI 업데이트:', characterEn.substring(0, 50) + '...');
        }
        if (characterDetailKoEl) {
            characterDetailKoEl.value = characterKo || '설정된 내용이 없습니다.';
        }
        
        console.log('✅ 썸네일/배경/인물 프롬프트 생성 및 UI 업데이트 완료!');
        
        // 반환값 추가
        return {
            thumbnailEn,
            thumbnailKo,
            backgroundEn,
            backgroundKo,
            characterEn,
            characterKo
        };
        
    } catch (error) {
        console.error('썸네일 프롬프트 생성 오류:', error);
        return {
            thumbnailEn: '',
            thumbnailKo: '',
            backgroundEn: '',
            backgroundKo: '',
            characterEn: '',
            characterKo: ''
        };
    }
};

// 프롬프트 재생성
window.regenerateMVPrompt = async function(type) {
    try {
        const era = document.getElementById('mvEra')?.value || '';
        const country = document.getElementById('mvCountry')?.value || '';
        const location = document.getElementById('mvLocation')?.value || '';
        const characterCount = document.getElementById('mvCharacterCount')?.value || '1';
        const customSettings = document.getElementById('mvCustomSettings')?.value || '';
        const lighting = document.getElementById('mvLighting')?.value || '';
        const cameraWork = document.getElementById('mvCameraWork')?.value || '';
        const mood = document.getElementById('mvMood')?.value || '';
        
        const characters = [];
        for (let i = 1; i <= parseInt(characterCount); i++) {
            const gender = document.getElementById(`mvCharacter${i}_gender`)?.value || '';
            const appearance = document.getElementById(`mvCharacter${i}_appearance`)?.value || '';
            if (gender || appearance) {
                characters.push({ gender, appearance });
            }
        }
        
        if (type === 'thumbnail' || type === 'background' || type === 'character') {
            await generateMVThumbnailPrompts(era, country, location, characters, customSettings, lighting, cameraWork, mood);
        }
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(`✅ ${type} 프롬프트가 재생성되었습니다!`);
        }
        
        // 재생성 시 해당 타입의 복사 버튼을 "복사"로 복원 (메인 섹션 + 씬 개요 섹션)
        const btnIdMap = { thumbnail: 'copyMVThumbnailBtn', background: 'copyMVBackgroundBtn', character: 'copyMVCharacterBtn' };
        const mainBtn = document.getElementById(btnIdMap[type]);
        if (mainBtn) {
            mainBtn.innerHTML = mainBtn.dataset.originalHTML || '<i class="fas fa-copy"></i> 복사';
            mainBtn.disabled = false;
            mainBtn.classList.remove('copied');
        }
        const overviewBtn = document.querySelector('.copy-mv-overview-btn[data-type="' + type + '"]');
        if (overviewBtn) {
            overviewBtn.innerHTML = overviewBtn.dataset.originalHTML || '<i class="fas fa-copy"></i> 복사';
            overviewBtn.disabled = false;
            overviewBtn.classList.remove('copied');
        }
    } catch (error) {
        console.error('프롬프트 재생성 오류:', error);
        alert('프롬프트 재생성 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

// 씬별 개요 섹션 프롬프트 재생성
window.regenerateSceneOverviewPrompt = async function(sceneIndex) {
    try {
        if (!window.currentScenes || !window.currentScenes[sceneIndex]) {
            alert('재생성할 씬이 없습니다.');
            return;
        }
        
        const scene = window.currentScenes[sceneIndex];
        const finalLyrics = document.getElementById('finalLyrics')?.textContent || 
                           document.getElementById('finalizedLyrics')?.value || 
                           document.getElementById('sunoLyrics')?.value || '';
        const stylePrompt = document.getElementById('finalizedStylePrompt')?.value || 
                           document.getElementById('stylePrompt')?.value || '';
        
        // MV 시간 설정 가져오기 (가사 추출용)
        const minutes = parseInt(document.getElementById('mvMinutes')?.value || 3);
        const seconds = parseInt(document.getElementById('mvSeconds')?.value || 30);
        const totalSeconds = minutes * 60 + seconds;
        
        // MV 설정 가져오기
        const era = document.getElementById('mvEra')?.value || '';
        const country = document.getElementById('mvCountry')?.value || '';
        const location = (typeof window.getMVLocationEnString === 'function' ? window.getMVLocationEnString() : (document.getElementById('mvLocation')?.value || ''));
        const characterCount = document.getElementById('mvCharacterCount')?.value || '1';
        const customSettings = document.getElementById('mvCustomSettings')?.value || '';
        const lighting = document.getElementById('mvLighting')?.value || '';
        const cameraWork = document.getElementById('mvCameraWork')?.value || '';
        const mood = document.getElementById('mvMood')?.value || '';
        
        // 인물 정보 수집 (성별, 나이, 인종, 외모/스타일)
        const characters = [];
        for (let i = 1; i <= parseInt(characterCount); i++) {
            const gender = document.getElementById(`mvCharacter${i}_gender`)?.value || '';
            const age = document.getElementById(`mvCharacter${i}_age`)?.value || '';
            const race = document.getElementById(`mvCharacter${i}_race`)?.value || '';
            const appearance = document.getElementById(`mvCharacter${i}_appearance`)?.value || '';
            if (gender || age || race || appearance) {
                characters.push({ gender, age, race, appearance });
            }
        }
        
        // Gemini API를 사용하여 상세한 씬 프롬프트 재생성
        const geminiKey = localStorage.getItem('gemini_api_key') || '';
        if (geminiKey && geminiKey.startsWith('AIza')) {
            const cleanLyrics = extractLyricsOnly(finalLyrics);
            
            // 한글 선택사항을 영어로 변환하는 맵
            const eraMap = {
                '현대': 'modern', 'modern': 'modern',
                '과거': 'historical', 'historical': 'historical',
                '미래': 'futuristic', 'futuristic': 'futuristic',
                '복고': 'retro', 'retro': 'retro'
            };
            const countryMap = {
                '한국': 'Korea', 'korea': 'Korea',
                '일본': 'Japan', 'japan': 'Japan',
                '미국': 'USA', 'usa': 'USA',
                '영국': 'UK', 'uk': 'UK'
            };
            const moodMap = {
                '로맨틱': 'romantic', 'romantic': 'romantic',
                '우울한': 'melancholic', 'melancholic': 'melancholic',
                '에너지틱': 'energetic', 'energetic': 'energetic',
                '평화로운': 'peaceful', 'peaceful': 'peaceful',
                '신비로운': 'mysterious', 'mysterious': 'mysterious',
                '향수적인': 'nostalgic', 'nostalgic': 'nostalgic',
                '드라마틱': 'dramatic', 'dramatic': 'dramatic',
                '몽환적인': 'dreamy', 'dreamy': 'dreamy',
                '강렬한': 'intense', 'intense': 'intense',
                '부드러운': 'gentle', 'gentle': 'gentle',
                '감성적': 'emotional', 'emotional': 'emotional'
            };
            const lightingMap = {
                '자연광': 'natural lighting', 'natural': 'natural lighting',
                '부드러운': 'soft lighting', 'soft': 'soft lighting',
                '드라마틱': 'dramatic lighting', 'dramatic': 'dramatic lighting',
                '따뜻한': 'warm lighting', 'warm': 'warm lighting',
                '차가운': 'cool lighting', 'cool': 'cool lighting',
                '네온': 'neon lighting', 'neon': 'neon lighting',
                '골든아워': 'golden hour lighting', 'golden-hour': 'golden hour lighting',
                '블루아워': 'blue hour lighting', 'blue-hour': 'blue hour lighting',
                '스튜디오': 'studio lighting', 'studio': 'studio lighting',
                '시네마틱': 'cinematic lighting', 'cinematic': 'cinematic lighting'
            };
            const cameraMap = {
                '클로즈업': 'close-up shot', 'close-up': 'close-up shot',
                '와이드샷': 'wide shot', 'wide-shot': 'wide shot',
                '미디엄샷': 'medium shot', 'medium-shot': 'medium shot',
                '돌리': 'dolly shot', 'dolly': 'dolly shot',
                '트래킹': 'tracking shot', 'tracking': 'tracking shot',
                '팬': 'pan shot', 'pan': 'pan shot',
                '틸트': 'tilt shot', 'tilt': 'tilt shot',
                '핸드헬드': 'handheld camera', 'handheld': 'handheld camera',
                '스테디캠': 'steady cam', 'steady-cam': 'steady cam',
                '드론': 'drone shot', 'drone': 'drone shot'
            };
            
            // 영어로 변환
            const eraEn = eraMap[era] || era || 'modern';
            const countryEn = countryMap[country] || country || 'Korea';
            const moodEn = moodMap[mood] || mood || '';
            const lightingEn = lightingMap[lighting] || lighting || '';
            const cameraEn = cameraMap[cameraWork] || cameraWork || '';
            
            // 해당 씬의 가사 추출 (시간 기반)
            let sceneLyrics = '';
            if (scene.time && cleanLyrics) {
                const timeMatch = scene.time.match(/(\d+):(\d+)-(\d+):(\d+)/);
                if (timeMatch) {
                    const startMin = parseInt(timeMatch[1]);
                    const startSec = parseInt(timeMatch[2]);
                    const startTotal = startMin * 60 + startSec;
                    const endMin = parseInt(timeMatch[3]);
                    const endSec = parseInt(timeMatch[4]);
                    const endTotal = endMin * 60 + endSec;
                    
                    // 가사를 시간에 맞춰 추출 (대략적인 추정)
                    const lyricsLines = cleanLyrics.split('\n').filter(l => l.trim());
                    const estimatedLinesPerMinute = lyricsLines.length / (totalSeconds / 60);
                    const startLine = Math.floor((startTotal / 60) * estimatedLinesPerMinute);
                    const endLine = Math.ceil((endTotal / 60) * estimatedLinesPerMinute);
                    sceneLyrics = lyricsLines.slice(startLine, endLine + 1).join(' ').trim();
                }
            }
            if (!sceneLyrics && scene.scene) {
                sceneLyrics = scene.scene;
            }
            
            // 인물 정보 문자열 생성
            let characterInfoStr = '';
            if (characters.length > 0) {
                const genderMap = { 'male': '남성', 'female': '여성', 'non-binary': '논바이너리' };
                const ageMap = { 'child': '어린이', 'teen': '청소년', '20s': '20대', '30s': '30대', '40s': '40대', '50s': '50대', 'elder': '장년' };
                const raceMap = { 'asian': '아시아인', 'caucasian': '백인', 'african': '아프리카인', 'hispanic': '히스패닉/라틴계', 'middle-eastern': '중동인', 'mixed': '혼혈' };
                
                characterInfoStr = characters.map((c, idx) => {
                    const parts = [];
                    if (c.gender) parts.push(genderMap[c.gender] || c.gender);
                    if (c.age) parts.push(ageMap[c.age] || c.age);
                    if (c.race) parts.push(raceMap[c.race] || c.race);
                    if (c.appearance) parts.push(c.appearance);
                    return parts.length > 0 ? `인물${idx + 1}: ${parts.join(', ')}` : '';
                }).filter(s => s.trim()).join('; ');
            }
            
            const prompt = `다음 정보를 기반으로 Midjourney용 **매우 상세하고 자연스러운 고화질 실사진** 영어 프롬프트와 한글 프롬프트를 각각 생성해주세요.

【가사 내용】 (가장 중요 - 반드시 프롬프트의 핵심이 되어야 합니다!)
${sceneLyrics ? `"${sceneLyrics}"` : `"${scene.scene || '없음'}"`}

【전체 가사 맥락】 (참고용 - 전체 가사의 흐름과 감정을 이해하세요)
${cleanLyrics.substring(0, 500)}${cleanLyrics.length > 500 ? '...' : ''}

【씬 정보】
- **장면 설명 (반드시 반영)**: "${scene.scene || '없음'}" - 이 장면 설명의 내용을 프롬프트에 구체적으로 포함하세요
- 시간: ${scene.time || '없음'}

【스타일】
${stylePrompt || '감성적인 발라드'}

【MV 프롬프트 상세 설정】 (가사 내용과 장면 설명을 우선하되 자연스럽게 융합)
${eraEn ? `- 시대: ${eraEn} era` : ''}
${countryEn ? `- 국가: ${countryEn}` : ''}
${location ? `- 기본 장소: ${location}` : ''}
${lightingEn ? `- 조명: ${lightingEn}` : ''}
${cameraEn ? `- 카메라: ${cameraEn}` : ''}
${moodEn ? `- 분위기: ${moodEn} mood` : ''}
${characterInfoStr ? `- 인물: ${characterInfoStr}` : ''}
${customSettings ? `- 추가: ${customSettings}` : ''}

【작업 요구사항】
1. **가사 내용과 장면 설명을 중심으로** 매우 구체적이고 상세한 영어 프롬프트와 한글 프롬프트를 각각 작성 (60단어 이상)
2. **가사에서 묘사되는 장면, 감정, 상황을 구체적으로 포함**하세요
3. **장면 설명("${scene.scene}")의 내용을 반드시 프롬프트에 구체적으로 반영**하세요 - 장면 설명이 프롬프트의 핵심 요소가 되어야 합니다
4. 가사의 감정과 분위기를 시각적으로 표현하는 묘사 포함
5. 위의 MV 프롬프트 상세 설정(시대, 국가, 조명, 카메라, 분위기, 인물 등)을 **가사 내용과 장면 설명과 자연스럽게 융합** (가사 내용과 장면 설명이 우선)
6. **인물 상세 정보 반드시 포함** (성별, 나이, 인종, 외모/스타일) - MV 설정의 인물 정보(${characterInfoStr || '없음'})를 반영하여 일관되게 묘사
   - **나이와 인종 정보는 반드시 포함되어야 합니다** - 예: "30-year-old Asian male" (영어), "30대 아시아인 남성" (한글)
   - MV 설정에 나이와 인종이 있으면 반드시 프롬프트에 포함하세요
7. 배경, 인물, 조명, 카메라 워크를 모두 포함한 완성된 프롬프트
8. 영어 프롬프트는 한글 없이 **순수 영어만** 작성
9. 한글 프롬프트는 자연스러운 한글로 작성
10. **미드저니 고화질 실사진 키워드 필수 포함**: "ultra high quality, 8k resolution, photorealistic, cinematic lighting, natural pose, detailed hands, detailed facial features, professional photography, sharp focus, depth of field, color grading, cinematic composition" (영어) / "초고화질, 8k 해상도, 사진처럼 사실적, 시네마틱 조명, 자연스러운 포즈, 상세한 손과 얼굴 특징, 전문 사진, 선명한 초점, 깊이감, 색감 보정, 영화적 구도" (한글)
11. **프롬프트만 출력** (설명이나 주석 없이 순수 프롬프트만)

**출력 형식 (순수 JSON만):**
\`\`\`json
{
  "promptEn": "완성된 영어 프롬프트 (60단어 이상, 가사 내용과 장면 설명 반영, MV 설정 융합, 고화질 실사진 키워드 포함)",
  "promptKo": "완성된 한글 프롬프트 (60단어 이상, 가사 내용과 장면 설명 반영, MV 설정 융합, 고화질 실사진 키워드 포함)"
}
\`\`\`

**예시 (나이와 인종 정보 포함):**
{
  "promptEn": "a dimly lit pawn shop interior showcasing rows of dusty jewelry under harsh fluorescent lights, a 30-year-old Asian male with neat hairstyle sadly looks at a ring in a glass case, remembering a past promise, his face etched with regret and longing, bitter emotion, somber and regretful mood, harsh fluorescent lighting with deep shadows, close-up shot slowly panning up to the man's face, USA, modern era, intense emotional atmosphere, cinematic lighting, wide-shot composition, ultra high quality, 8k resolution, photorealistic, cinematic lighting, natural pose, detailed hands and facial features, professional photography, sharp focus, depth of field, color grading",
  "promptKo": "어두운 전당포 내부, 형광등 아래 먼지 쌓인 보석들이 줄지어 진열되어 있고, 30대 아시아인 남성(단정한 헤어스타일)이 유리 케이스 안의 반지를 슬프게 바라보며 과거의 약속을 기억하고 있다, 그의 얼굴에는 후회와 그리움이 새겨져 있다, 쓴 감정, 우울하고 후회스러운 분위기, 깊은 그림자와 함께 거친 형광등, 반지에 클로즈업한 후 남성의 얼굴로 팬업, 미국, 현대 시대, 강렬한 감정적 분위기, 시네마틱 조명, 와이드샷 구도, 초고화질, 8k 해상도, 사진처럼 사실적, 시네마틱 조명, 자연스러운 포즈, 상세한 손과 얼굴 특징, 전문 사진, 선명한 초점, 깊이감, 색감 보정"
}

**중요:**
- MV 설정의 인물 정보(${characterInfoStr || '없음'})에 나이와 인종이 포함되어 있으면, 반드시 프롬프트에 포함하세요
- 나이 정보: "30-year-old", "20s", "30대", "20대" 등
- 인종 정보: "Asian", "Caucasian", "African", "아시아인", "백인", "아프리카인" 등

**지금 바로 JSON을 생성하세요:**`;

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
            const response = await fetch(geminiUrl, {
            method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1000,
                    }
            })
        });
        
            if (response.ok) {
                const data = await response.json();
                const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                
                console.log('🤖 씬 프롬프트 재생성 AI 응답 수신:', aiResponse.substring(0, 300) + '...');
                
                // JSON 추출
                let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                let newPromptEn = '';
                let newPromptKo = '';
                
                if (jsonMatch) {
                    try {
                        const aiPrompts = JSON.parse(jsonMatch[0]);
                        newPromptEn = aiPrompts.promptEn || '';
                        newPromptKo = aiPrompts.promptKo || '';
                    } catch (parseError) {
                        console.warn('⚠️ JSON 파싱 실패, 텍스트에서 추출 시도:', parseError);
                        // JSON 파싱 실패 시 텍스트에서 직접 추출
                        newPromptEn = aiResponse.trim();
                    }
                } else {
                    // JSON이 없으면 전체 응답을 영어 프롬프트로 사용
                    newPromptEn = aiResponse.trim();
                }
                
                // JSON 코드 블록이나 마크다운 제거
                newPromptEn = newPromptEn.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                newPromptEn = newPromptEn.replace(/^["']|["']$/g, '').trim(); // 따옴표 제거
                newPromptKo = newPromptKo.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                newPromptKo = newPromptKo.replace(/^["']|["']$/g, '').trim(); // 따옴표 제거
                
                // 영어 프롬프트에서 한글 완전 제거
                newPromptEn = newPromptEn.replace(/[가-힣]+/g, '').trim();
                
                // 불필요한 공백 및 특수문자 정리
                newPromptEn = newPromptEn.replace(/\s+/g, ' ').trim();
                newPromptEn = newPromptEn.replace(/,\s*,+/g, ', '); // 연속 쉼표
                newPromptEn = newPromptEn.replace(/\.\s*\.+/g, '.'); // 연속 마침표
                
                if (newPromptEn && newPromptEn.length > 20) {
                    // 마지막 정리
                    if (!newPromptEn.endsWith('.')) {
                        newPromptEn += '.';
                    }
                    
                    const enEl = document.getElementById(`scene_overview_${sceneIndex}_en`);
                    const koEl = document.getElementById(`scene_overview_${sceneIndex}_ko`);
                    
                    if (enEl) {
                        // 씬 번호 주석이 없으면 추가
                        if (!newPromptEn.includes('/* Scene')) {
                            newPromptEn = `/* Scene ${sceneIndex + 1} */ ${newPromptEn}`;
                        }
                        enEl.value = newPromptEn;
                    }
                    
                    // 한글 프롬프트 설정
                    if (koEl) {
                        if (newPromptKo && newPromptKo.length > 20) {
                            koEl.value = newPromptKo;
                        } else {
                            // 한글 프롬프트가 없으면 영어에서 번역
                            await syncSceneOverviewPromptTranslation(sceneIndex, 'en');
                        }
                    }
                    
                    // currentScenes 업데이트
                    if (window.currentScenes && window.currentScenes[sceneIndex]) {
                        window.currentScenes[sceneIndex].prompt = newPromptEn;
                        if (newPromptKo) {
                            window.currentScenes[sceneIndex].promptKo = newPromptKo;
                        }
                    }
                    
                    if (typeof window.showCopyIndicator === 'function') {
                        window.showCopyIndicator(`✅ 씬 ${sceneIndex + 1} 프롬프트가 재생성되었습니다!`);
                    } else {
                        alert(`✅ 씬 ${sceneIndex + 1} 프롬프트가 재생성되었습니다!`);
                    }
                    // 재생성 시 해당 씬의 복사 버튼을 "복사"로 복원
                    const overviewCopyBtn = document.getElementById(`copySceneOverviewBtn_${sceneIndex}`);
                    if (overviewCopyBtn) {
                        overviewCopyBtn.innerHTML = overviewCopyBtn.dataset.originalHTML || '<i class="fas fa-copy"></i> 복사';
                        overviewCopyBtn.disabled = false;
                        overviewCopyBtn.classList.remove('copied');
                    }
                } else {
                    console.warn('⚠️ AI가 생성한 프롬프트가 너무 짧거나 비어있습니다.');
                    alert('프롬프트 생성에 실패했습니다. 다시 시도해주세요.');
                }
            }
        } else {
            // AI 없으면 기본 상세 프롬프트 생성
            let promptParts = [];
            
            // 유효한 값만 추가하는 헬퍼 함수
            const addIfValid = (value) => {
                if (value && typeof value === 'string' && value.trim()) {
                    const trimmed = value.trim();
                    if (trimmed && trimmed !== ',' && trimmed !== '.') {
                        promptParts.push(trimmed);
                    }
                }
            };
            
            if (characters.length > 0) {
                if (characters.length === 1) {
                    promptParts.push('one person');
                } else if (characters.length === 2) {
                    promptParts.push('two people');
            } else {
                    promptParts.push('multiple people');
                }
                characters.forEach(char => {
                    if (char.gender) addIfValid(char.gender);
                    if (char.appearance) addIfValid(char.appearance);
                });
            } else {
                promptParts.push(characterCount === '1' ? 'one person' : characterCount === '2' ? 'two people' : 'multiple people');
            }
            
            if (scene.location) {
                // location에서 한글 제거
                const locationEn = scene.location.replace(/[가-힣]+/g, '').trim();
                if (locationEn) addIfValid(locationEn);
            }
            if (country && country.trim()) {
                const countryMap = {
                    '한국': 'Korea', 'korea': 'Korea', 'Korea': 'Korea',
                    '일본': 'Japan', 'japan': 'Japan', 'Japan': 'Japan',
                    '미국': 'USA', 'usa': 'USA', 'USA': 'USA',
                    '영국': 'UK', 'uk': 'UK', 'UK': 'UK'
                };
                const countryValue = countryMap[country] || country;
                if (countryValue && countryValue.trim() && !/[가-힣]/.test(countryValue)) {
                    promptParts.push(countryValue.trim());
                }
            }
            if (era && era.trim()) {
                const eraMap = {
                    '현대': 'modern', 'modern': 'modern', 'Modern': 'modern',
                    '과거': 'historical', 'historical': 'historical', 'Historical': 'historical',
                    '미래': 'futuristic', 'futuristic': 'futuristic', 'Futuristic': 'futuristic',
                    '복고': 'retro', 'retro': 'retro', 'Retro': 'retro'
                };
                const eraValue = eraMap[era] || era;
                if (eraValue && eraValue.trim() && !/[가-힣]/.test(eraValue)) {
                    promptParts.push(eraValue.trim() + ' era');
                }
            }
            if (mood && mood.trim()) {
                const moodMap = {
                    '로맨틱': 'romantic mood', 'romantic': 'romantic mood',
                    '우울한': 'melancholic mood', 'melancholic': 'melancholic mood',
                    '에너지틱': 'energetic mood', 'energetic': 'energetic mood',
                    '평화로운': 'peaceful mood', 'peaceful': 'peaceful mood',
                    '신비로운': 'mysterious mood', 'mysterious': 'mysterious mood',
                    '향수적인': 'nostalgic mood', 'nostalgic': 'nostalgic mood',
                    '드라마틱': 'dramatic mood', 'dramatic': 'dramatic mood',
                    '몽환적인': 'dreamy mood', 'dreamy': 'dreamy mood',
                    '강렬한': 'intense mood', 'intense': 'intense mood',
                    '부드러운': 'gentle mood', 'gentle': 'gentle mood',
                    '감성적': 'emotional mood', 'emotional': 'emotional mood'
                };
                const moodValue = moodMap[mood] || (mood + ' mood');
                if (moodValue && moodValue.trim() && !/[가-힣]/.test(moodValue)) {
                    promptParts.push(moodValue.trim());
                }
            }
            if (lighting && lighting.trim()) {
                const lightingMap = {
                    '자연광': 'natural lighting', 'natural': 'natural lighting',
                    '부드러운': 'soft lighting', 'soft': 'soft lighting',
                    '드라마틱': 'dramatic lighting', 'dramatic': 'dramatic lighting',
                    '따뜻한': 'warm lighting', 'warm': 'warm lighting',
                    '차가운': 'cool lighting', 'cool': 'cool lighting',
                    '네온': 'neon lighting', 'neon': 'neon lighting',
                    '골든아워': 'golden hour lighting', 'golden-hour': 'golden hour lighting',
                    '블루아워': 'blue hour lighting', 'blue-hour': 'blue hour lighting',
                    '스튜디오': 'studio lighting', 'studio': 'studio lighting',
                    '시네마틱': 'cinematic lighting', 'cinematic': 'cinematic lighting'
                };
                const lightingValue = lightingMap[lighting] || lighting;
                if (lightingValue && lightingValue.trim() && !/[가-힣]/.test(lightingValue)) {
                    promptParts.push(lightingValue.trim());
                }
            }
            if (cameraWork && cameraWork.trim()) {
                const cameraMap = {
                    '클로즈업': 'close-up shot', 'close-up': 'close-up shot',
                    '와이드샷': 'wide shot', 'wide-shot': 'wide shot',
                    '미디엄샷': 'medium shot', 'medium-shot': 'medium shot',
                    '돌리': 'dolly shot', 'dolly': 'dolly shot',
                    '트래킹': 'tracking shot', 'tracking': 'tracking shot',
                    '팬': 'pan shot', 'pan': 'pan shot',
                    '틸트': 'tilt shot', 'tilt': 'tilt shot',
                    '핸드헬드': 'handheld camera', 'handheld': 'handheld camera',
                    '스테디캠': 'steady cam', 'steady-cam': 'steady cam',
                    '드론': 'drone shot', 'drone': 'drone shot'
                };
                const cameraValue = cameraMap[cameraWork] || cameraWork;
                if (cameraValue && cameraValue.trim() && !/[가-힣]/.test(cameraValue)) {
                    promptParts.push(cameraValue.trim());
                }
            }
            
            promptParts.push(
                'ultra high quality', '8k resolution', 'photorealistic',
                'cinematic lighting', 'natural pose', 'detailed hands',
                'detailed facial features', 'sharp focus', 'professional photography',
                'depth of field', 'color grading', 'cinematic composition'
            );
            
            if (customSettings) {
                // 커스텀 설정에서 한글 제거
                const customEn = customSettings.replace(/[가-힣]+/g, '').trim();
                if (customEn) addIfValid(customEn);
            }
            
            // 빈 값 제거 및 정리
            promptParts = promptParts.filter(part => {
                if (!part || !part.trim() || part.trim() === ',' || part.trim() === '.') return false;
                // 한글이 포함된 항목 제거
                if (/[가-힣]/.test(part)) return false;
                return true;
            });
            
            let basicPrompt = promptParts.join(', ') + '.';
            
            // 한글 완전 제거 (혹시 남아있는 경우)
            basicPrompt = basicPrompt.replace(/[가-힣]+/g, '').trim();
            
            // 연속된 쉼표 제거
            basicPrompt = basicPrompt.replace(/,\s*,+/g, ', ').trim();
            // 쉼표 다음 마침표 제거
            basicPrompt = basicPrompt.replace(/,\s*\./g, '.').trim();
            // 연속된 마침표 제거
            basicPrompt = basicPrompt.replace(/\.+/g, '.').trim();
            // 불필요한 공백 정리
            basicPrompt = basicPrompt.replace(/\s+/g, ' ').trim();
            const enEl = document.getElementById(`scene_overview_${sceneIndex}_en`);
            if (enEl) {
                enEl.value = basicPrompt;
                await syncSceneOverviewPromptTranslation(sceneIndex, 'en');
            }
            // 재생성 시 해당 씬의 복사 버튼을 "복사"로 복원
            const overviewCopyBtn = document.getElementById(`copySceneOverviewBtn_${sceneIndex}`);
            if (overviewCopyBtn) {
                overviewCopyBtn.innerHTML = overviewCopyBtn.dataset.originalHTML || '<i class="fas fa-copy"></i> 복사';
                overviewCopyBtn.disabled = false;
                overviewCopyBtn.classList.remove('copied');
            }
        }
            } catch (error) {
        console.error('씬 개요 프롬프트 재생성 오류:', error);
        alert('씬 프롬프트 재생성 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

// 씬 수정 (편집 모드 토글)
window.editSceneOverview = function(sceneIndex) {
    const sceneDiv = document.querySelector(`[data-scene-index="${sceneIndex}"]`)?.closest('div[style*="margin-bottom: 20px"]');
    if (!sceneDiv) {
        alert('씬을 찾을 수 없습니다.');
        return;
    }
    
    const descriptionEl = sceneDiv.querySelector('.scene-description');
    const enEl = document.getElementById(`scene_overview_${sceneIndex}_en`);
    const koEl = document.getElementById(`scene_overview_${sceneIndex}_ko`);
    
    if (descriptionEl && enEl && koEl) {
        // 편집 가능 상태로 만들기 (이미 편집 가능하지만 포커스)
        descriptionEl.focus();
        descriptionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(`✏️ 씬 ${sceneIndex + 1} 편집 모드`);
        }
    }
};

// 씬 프롬프트 복사
window.copySceneOverviewPrompt = async function(sceneIndex) {
    try {
        if (!window.currentScenes || !window.currentScenes[sceneIndex]) {
            alert('복사할 씬이 없습니다.');
            return;
        }
        
        const scene = window.currentScenes[sceneIndex];
        const enEl = document.getElementById(`scene_overview_${sceneIndex}_en`);
        const koEl = document.getElementById(`scene_overview_${sceneIndex}_ko`);
        const descriptionEl = document.querySelector(`.scene-description[data-index="${sceneIndex}"]`);
        
        let text = `씬 ${sceneIndex + 1} (${scene.time})\n\n`;
        text += `장면 설명:\n${descriptionEl?.value || scene.scene || ''}\n\n`;
        text += `영어 프롬프트:\n${enEl?.value || scene.prompt || ''}\n\n`;
        text += `한글 프롬프트:\n${koEl?.value || scene.promptKo || ''}`;
        
        await navigator.clipboard.writeText(text);
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(`✅ 씬 ${sceneIndex + 1} 프롬프트가 클립보드에 복사되었습니다!`);
        } else {
            alert(`✅ 씬 ${sceneIndex + 1} 프롬프트가 클립보드에 복사되었습니다!`);
        }
    } catch (error) {
        console.error('프롬프트 복사 오류:', error);
        alert('프롬프트 복사 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

// 씬별 개요 섹션의 영어 프롬프트만 복사 (Midjourney용)
window.copySceneOverviewPromptEn = async function(sceneIndex, event) {
    try {
        const enEl = document.getElementById(`scene_overview_${sceneIndex}_en`);
        if (!enEl || !enEl.value.trim()) {
            alert('복사할 영어 프롬프트가 없습니다.');
            return;
        }
        
        // 기존 주석 제거 후 [Scene N of Total] 형식으로 씬 번호 추가
        let promptText = enEl.value.trim();
        
        // 기존 주석 제거 (/* Scene N */, [Scene N], // 등)
        promptText = promptText.replace(/\/\*\s*Scene\s+\d+\s*(of\s+\d+)?\s*\*\/\s*/gi, '').trim();
        promptText = promptText.replace(/\[\s*Scene\s+\d+\s*(of\s+\d+)?\s*\]\s*/gi, '').trim();
        promptText = promptText.replace(/\/\/.*$/gm, '').trim(); // 단일 라인 주석
        promptText = promptText.replace(/\/\*[\s\S]*?\*\//g, '').trim(); // 다중 라인 주석
        
        // 총 씬 개수 확인
        const totalScenes = window.currentScenes ? window.currentScenes.length : 0;
        const sceneNumber = sceneIndex + 1;
        
        // [Scene N of Total] 형식으로 씬 번호 추가
        const sceneLabel = totalScenes > 0 ? `[Scene ${sceneNumber} of ${totalScenes}]` : `[Scene ${sceneNumber}]`;
        promptText = `${sceneLabel}\n${promptText}`;
        
        await navigator.clipboard.writeText(promptText);
        
        // 복사 버튼 찾기 및 텍스트 변경
        let copyButton = null;
        if (event && event.target) {
            copyButton = event.target.closest('button');
        }
        if (!copyButton) {
            // 이벤트가 없으면 ID로 찾기
            const buttonId = `copySceneOverviewBtn_${sceneIndex}`;
            copyButton = document.getElementById(buttonId);
        }
        
        if (copyButton) {
            // 원래 HTML을 data 속성에 저장 (최종 확정 시 복원용)
            if (!copyButton.dataset.originalHTML) {
                copyButton.dataset.originalHTML = copyButton.innerHTML;
            }
            copyButton.innerHTML = '<i class="fas fa-check"></i> 복사됨';
            copyButton.disabled = true;
            // 복사 상태 표시를 위한 클래스 추가
            copyButton.classList.add('copied');
        }
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(`✅ 씬 ${sceneIndex + 1} 영어 프롬프트가 클립보드에 복사되었습니다! (Midjourney용)`);
        } else {
            alert(`✅ 씬 ${sceneIndex + 1} 영어 프롬프트가 클립보드에 복사되었습니다!`);
        }
    } catch (error) {
        console.error('영어 프롬프트 복사 오류:', error);
        alert('영어 프롬프트 복사 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

// 씬별 개별 프롬프트 섹션의 영어 프롬프트만 복사 (Midjourney용)
window.copyScenePromptEn = async function(sceneIndex, event) {
    try {
        const enEl = document.getElementById(`scene_${sceneIndex}_en`);
        if (!enEl || !enEl.value.trim()) {
            alert('복사할 영어 프롬프트가 없습니다.');
            return;
        }
        
        // 기존 주석 제거 후 [Scene N of Total] 형식으로 씬 번호 추가
        let promptText = enEl.value.trim();
        
        // 기존 주석 제거 (/* Scene N */, [Scene N], // 등)
        promptText = promptText.replace(/\/\*\s*Scene\s+\d+\s*(of\s+\d+)?\s*\*\/\s*/gi, '').trim();
        promptText = promptText.replace(/\[\s*Scene\s+\d+\s*(of\s+\d+)?\s*\]\s*/gi, '').trim();
        promptText = promptText.replace(/\/\/.*$/gm, '').trim(); // 단일 라인 주석
        promptText = promptText.replace(/\/\*[\s\S]*?\*\//g, '').trim(); // 다중 라인 주석
        
        // 총 씬 개수 확인
        const totalScenes = window.currentScenes ? window.currentScenes.length : 0;
        const sceneNumber = sceneIndex + 1;
        
        // [Scene N of Total] 형식으로 씬 번호 추가
        const sceneLabel = totalScenes > 0 ? `[Scene ${sceneNumber} of ${totalScenes}]` : `[Scene ${sceneNumber}]`;
        promptText = `${sceneLabel}\n${promptText}`;
        
        await navigator.clipboard.writeText(promptText);
        
        // 복사 버튼 찾기 및 텍스트 변경
        let copyButton = null;
        if (event && event.target) {
            copyButton = event.target.closest('button');
        }
        if (!copyButton) {
            // 이벤트가 없으면 ID로 찾기
            const buttonId = `copyScenePromptBtn_${sceneIndex}`;
            copyButton = document.getElementById(buttonId);
        }
        
        if (copyButton) {
            // 원래 HTML을 data 속성에 저장 (최종 확정 시 복원용)
            if (!copyButton.dataset.originalHTML) {
                copyButton.dataset.originalHTML = copyButton.innerHTML;
            }
            copyButton.innerHTML = '<i class="fas fa-check"></i> 복사됨';
            copyButton.disabled = true;
            // 복사 상태 표시를 위한 클래스 추가
            copyButton.classList.add('copied');
        }
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(`✅ 씬 ${sceneIndex + 1} 영어 프롬프트가 클립보드에 복사되었습니다! (Midjourney용)`);
        } else {
            alert(`✅ 씬 ${sceneIndex + 1} 영어 프롬프트가 클립보드에 복사되었습니다!`);
        }
    } catch (error) {
        console.error('영어 프롬프트 복사 오류:', error);
        alert('영어 프롬프트 복사 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

// 썸네일/배경/인물 프롬프트의 영어 프롬프트만 복사 (Midjourney용) — 복사 후 "복사됨" 표시, 재생성 버튼 클릭 시에만 복원
window.copyMVPromptEn = async function(type, event) {
    try {
        const typeMap = {
            'thumbnail': { en: 'mvThumbnailPromptEn', name: '썸네일', btnId: 'copyMVThumbnailBtn' },
            'background': { en: 'mvBackgroundDetailPromptEn', name: '배경', btnId: 'copyMVBackgroundBtn' },
            'character': { en: 'mvCharacterDetailPromptEn', name: '인물', btnId: 'copyMVCharacterBtn' }
        };
        
        const typeInfo = typeMap[type];
        if (!typeInfo) {
            alert('알 수 없는 프롬프트 타입입니다.');
            return;
        }
        
        const enEl = document.getElementById(typeInfo.en);
        if (!enEl || !enEl.value.trim()) {
            alert(`${typeInfo.name} 영어 프롬프트가 없습니다.`);
            return;
        }
        
        const promptText = enEl.value.trim();
        await navigator.clipboard.writeText(promptText);
        
        let copyButton = null;
        if (event && event.target) {
            copyButton = event.target.closest('button');
        }
        if (!copyButton) {
            copyButton = document.getElementById(typeInfo.btnId);
        }
        
        if (copyButton) {
            if (!copyButton.dataset.originalHTML) {
                copyButton.dataset.originalHTML = copyButton.innerHTML;
            }
            copyButton.innerHTML = '<i class="fas fa-check"></i> 복사됨';
            copyButton.disabled = true;
            copyButton.classList.add('copied');
        }
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(`✅ ${typeInfo.name} 영어 프롬프트가 클립보드에 복사되었습니다! (Midjourney용)`);
        } else {
            alert(`✅ ${typeInfo.name} 영어 프롬프트가 클립보드에 복사되었습니다!`);
        }
    } catch (error) {
        console.error('영어 프롬프트 복사 오류:', error);
        alert('영어 프롬프트 복사 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

// 썸네일/배경/인물 프롬프트 수정 — 해당 영어 텍스트영역에 포커스
window.focusMVPromptTextarea = function(type) {
    const typeMap = {
        'thumbnail': 'mvThumbnailPromptEn',
        'background': 'mvBackgroundDetailPromptEn',
        'character': 'mvCharacterDetailPromptEn'
    };
    const id = typeMap[type];
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

// 씬 개요 섹션 내 썸네일/배경/인물 overview 텍스트영역 포커스
window.focusMVPromptOverviewTextarea = function(type) {
    const typeMap = {
        'thumbnail': 'mv_thumbnail_en_overview',
        'background': 'mv_background_en_overview',
        'character': 'mv_character_en_overview'
    };
    const id = typeMap[type];
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

// 씬 개요 섹션 내 썸네일/배경/인물 영어 프롬프트 복사 — 복사 후 "복사됨" 표시, 재생성 버튼 클릭 시에만 복원
window.copyMVPromptEnOverview = async function(type, event) {
    try {
        const typeMap = {
            'thumbnail': { en: 'mv_thumbnail_en_overview', name: '썸네일' },
            'background': { en: 'mv_background_en_overview', name: '배경' },
            'character': { en: 'mv_character_en_overview', name: '인물' }
        };
        const typeInfo = typeMap[type];
        if (!typeInfo) return;
        const enEl = document.getElementById(typeInfo.en);
        if (!enEl || !enEl.value.trim()) {
            alert(typeInfo.name + ' 영어 프롬프트가 없습니다.');
            return;
        }
        await navigator.clipboard.writeText(enEl.value.trim());
        var copyButton = (event && event.target) ? event.target.closest('button') : document.querySelector('.copy-mv-overview-btn[data-type="' + type + '"]');
        if (copyButton) {
            if (!copyButton.dataset.originalHTML) copyButton.dataset.originalHTML = copyButton.innerHTML;
            copyButton.innerHTML = '<i class="fas fa-check"></i> 복사됨';
            copyButton.disabled = true;
            copyButton.classList.add('copied');
        }
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator('✅ ' + typeInfo.name + ' 영어 프롬프트가 클립보드에 복사되었습니다!');
        }
    } catch (err) {
        console.error('영어 프롬프트 복사 오류:', err);
        alert('영어 프롬프트 복사 중 오류가 발생했습니다.');
    }
};

// 씬 프롬프트 재생성 (결과 섹션용)
window.regenerateScenePrompt = async function(sceneIndex) {
    try {
        if (!window.currentScenes || !window.currentScenes[sceneIndex]) {
            alert('재생성할 씬이 없습니다.');
        return;
    }
    
        const scene = window.currentScenes[sceneIndex];
        const finalLyrics = document.getElementById('finalLyrics')?.textContent || 
                           document.getElementById('finalizedLyrics')?.value || 
                           document.getElementById('sunoLyrics')?.value || '';
        const stylePrompt = document.getElementById('finalizedStylePrompt')?.value || 
                           document.getElementById('stylePrompt')?.value || '';
        
        // Gemini API를 사용하여 씬 프롬프트 재생성
        const geminiKey = localStorage.getItem('gemini_api_key') || '';
        if (geminiKey && geminiKey.startsWith('AIza')) {
            const cleanLyrics = extractLyricsOnly(finalLyrics);
            const prompt = `다음 가사와 스타일 프롬프트를 기반으로 MV 씬 프롬프트를 생성해주세요.

가사:
${scene.scene || cleanLyrics}

스타일 프롬프트: ${stylePrompt || '없음'}

요구사항:
1. Midjourney 이미지 생성용 영어 프롬프트 작성
2. 고화질, 실사진 스타일
3. 자연스러운 포즈, 상세한 손가락
4. 배경 중심 구성

프롬프트만 출력하세요 (설명 없이):`;
            
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
            const response = await fetch(geminiUrl, {
            method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 500,
                }
            })
        });
        
            if (response.ok) {
                const data = await response.json();
                const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const newPrompt = aiResponse.trim();
                
                if (newPrompt) {
                    const sceneId = `scene_${sceneIndex}`;
                    const enEl = document.getElementById(`${sceneId}_en`);
                    if (enEl) {
                        enEl.value = newPrompt;
                        // 한글 자동 번역
                        await syncScenePromptTranslation(sceneIndex, 'en');
                    }
                }
            }
        } else {
            // AI 없으면 기본 프롬프트 생성
            const basicPrompt = `${scene.scene || 'music scene'}, high quality, photorealistic, natural pose, detailed hands`;
            const sceneId = `scene_${sceneIndex}`;
            const enEl = document.getElementById(`${sceneId}_en`);
            if (enEl) {
                enEl.value = basicPrompt;
                await syncScenePromptTranslation(sceneIndex, 'en');
            }
        }
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(`✅ 씬 ${sceneIndex + 1} 프롬프트가 재생성되었습니다!`);
        }
        
        // 재생성 시 해당 씬의 복사 버튼을 "복사"로 복원
        const sceneCopyBtn = document.getElementById(`copyScenePromptBtn_${sceneIndex}`);
        if (sceneCopyBtn) {
            sceneCopyBtn.innerHTML = sceneCopyBtn.dataset.originalHTML || '<i class="fas fa-copy"></i> 복사';
            sceneCopyBtn.disabled = false;
            sceneCopyBtn.classList.remove('copied');
        }
    } catch (error) {
        console.error('씬 프롬프트 재생성 오류:', error);
        alert('씬 프롬프트 재생성 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

// 프롬프트 저장
window.saveMVPrompt = function(type) {
    try {
        const typeMap = {
            'thumbnail': { ko: 'mvThumbnailPromptKo', en: 'mvThumbnailPromptEn' },
            'backgroundDetail': { ko: 'mvBackgroundDetailPromptKo', en: 'mvBackgroundDetailPromptEn' },
            'characterDetail': { ko: 'mvCharacterDetailPromptKo', en: 'mvCharacterDetailPromptEn' }
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
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`mvPrompt_${type}`, JSON.stringify(data));
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(`✅ ${type} 프롬프트가 저장되었습니다!`);
            } else {
            alert(`${type} 프롬프트가 저장되었습니다.`);
        }
    } catch (error) {
        console.error('프롬프트 저장 오류:', error);
        alert('프롬프트 저장 중 오류가 발생했습니다.');
    }
};

// 씬 프롬프트 저장
window.saveScenePrompt = function(sceneIndex) {
    try {
        if (!window.currentScenes || !window.currentScenes[sceneIndex]) {
            alert('저장할 씬이 없습니다.');
            return;
        }
        
        const sceneId = `scene_${sceneIndex}`;
        const enEl = document.getElementById(`${sceneId}_en`);
        const koEl = document.getElementById(`${sceneId}_ko`);
        
        if (enEl && koEl) {
            window.currentScenes[sceneIndex].prompt = enEl.value;
            window.currentScenes[sceneIndex].promptKo = koEl.value;
            
            // 프로젝트에 저장
            if (window.currentProject) {
                if (!window.currentProject.data) {
                    window.currentProject.data = {};
                }
                if (!window.currentProject.data.marketing) {
                    window.currentProject.data.marketing = {};
                }
                window.currentProject.data.marketing.mvPrompts = window.currentScenes;
            }
            
            if (typeof window.showCopyIndicator === 'function') {
                window.showCopyIndicator(`✅ 씬 ${sceneIndex + 1} 프롬프트가 저장되었습니다!`);
            } else {
                alert(`씬 ${sceneIndex + 1} 프롬프트가 저장되었습니다.`);
            }
        }
    } catch (error) {
        console.error('씬 프롬프트 저장 오류:', error);
        alert('씬 프롬프트 저장 중 오류가 발생했습니다.');
    }
};

// 프롬프트 섹션 복사
window.copyMVPromptSection = function(type) {
    const koId = `mv${type.charAt(0).toUpperCase() + type.slice(1)}PromptKo`;
    const enId = `mv${type.charAt(0).toUpperCase() + type.slice(1)}PromptEn`;
    
    const koEl = document.getElementById(koId);
    const enEl = document.getElementById(enId);
    
    let text = '';
    const typeNames = {
        'combined': '통합 프롬프트',
        'background': '배경 프롬프트',
        'character': '인물 프롬프트'
    };
    
    text += `=== ${typeNames[type]} ===\n\n`;
    
    if (koEl && koEl.value) {
        text += `[한글]\n${koEl.value}\n\n`;
    }
    if (enEl && enEl.value) {
        text += `[영어]\n${enEl.value}\n\n`;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(`✅ ${typeNames[type]}가 클립보드에 복사되었습니다!`);
        } else {
            alert(`${typeNames[type]}가 클립보드에 복사되었습니다.`);
        }
    }).catch(() => {
        alert('복사 중 오류가 발생했습니다.');
    });
};

// ═══════════════════════════════════════════════════════════════
// 가사 작성 모드 전환 함수
// ═══════════════════════════════════════════════════════════════
window.switchLyricsMode = function(mode) {
    try {
        const manualMode = document.getElementById('manualMode');
        const aiMode = document.getElementById('aiMode');
        const manualTab = document.querySelector('.mode-tab[data-mode="manual"]');
        const aiTab = document.querySelector('.mode-tab[data-mode="ai"]');
        
        if (!manualMode || !aiMode) {
            console.warn('⚠️ 모드 요소를 찾을 수 없습니다.');
            return;
        }
        
        if (mode === 'manual') {
            // 직접 작성 모드
            manualMode.classList.add('active');
            aiMode.classList.remove('active');
            if (manualTab) manualTab.classList.add('active');
            if (aiTab) aiTab.classList.remove('active');
            console.log('✅ 가사 작성 모드: 직접 작성');
        } else if (mode === 'ai') {
            // AI 생성 모드
            manualMode.classList.remove('active');
            aiMode.classList.add('active');
            if (manualTab) manualTab.classList.remove('active');
            if (aiTab) aiTab.classList.add('active');
            console.log('✅ 가사 작성 모드: AI 생성');
            
            // AI 모드로 전환 시 태그 버튼 이벤트 리스너 초기화
            initializeTagButtons();
        }
    } catch (error) {
        console.error('❌ 모드 전환 오류:', error);
        alert('모드 전환 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

// 태그 버튼 클릭 이벤트 초기화 함수
window.initializeTagButtons = function() {
    try {
        // 모든 태그 컨테이너에 이벤트 위임
        const tagContainers = document.querySelectorAll('.tag-container');
        
        tagContainers.forEach(container => {
            // 기존 이벤트 리스너 제거 (중복 방지)
            const newContainer = container.cloneNode(true);
            container.parentNode.replaceChild(newContainer, container);
            
            // 새 컨테이너에 이벤트 리스너 추가
            newContainer.addEventListener('click', function(e) {
                const tagBtn = e.target.closest('.tag-btn');
                if (tagBtn && !tagBtn.classList.contains('custom-tag-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // active 클래스 토글
                    tagBtn.classList.toggle('active');
                    
                    // 6단계 장소 유형 선택 시 설정 저장
                    if (newContainer.id === 'mvLocationTags' && typeof window.saveMVSettings === 'function') {
                        window.saveMVSettings();
                    }
                    
                    // 선택된 태그 값 로그 (디버깅용)
                    const tagValue = tagBtn.getAttribute('data-value');
                    const isActive = tagBtn.classList.contains('active');
                    console.log(`🏷️ 태그 ${isActive ? '선택' : '해제'}: ${tagValue}`);
                }
            });
        });
        
        console.log('✅ 태그 버튼 이벤트 리스너 초기화 완료');
    } catch (error) {
        console.error('❌ 태그 버튼 초기화 오류:', error);
    }
};

// ═══════════════════════════════════════════════════════════════
// MV 설정 관련 함수들
// ═══════════════════════════════════════════════════════════════
// 장소 유형 다중 선택: value -> { en, ko } (씬 프롬프트 반영용)
const MV_LOCATION_MAP = {
    'city': { en: 'urban cityscape', ko: '도시 (도심, 거리)' },
    'urban-night': { en: 'urban nightscape with neon lights', ko: '도시 야경 (네온)' },
    'beach': { en: 'beach', ko: '해변' },
    'mountain': { en: 'mountain, nature', ko: '산, 자연' },
    'forest': { en: 'forest', ko: '숲' },
    'desert': { en: 'desert', ko: '사막' },
    'indoor': { en: 'indoor (room, studio)', ko: '실내 (방, 스튜디오)' },
    'rooftop': { en: 'rooftop', ko: '옥상' },
    'subway': { en: 'subway, underground', ko: '지하철, 지하' },
    'cafe': { en: 'cafe', ko: '카페' },
    'restaurant': { en: 'restaurant', ko: '레스토랑' },
    'park': { en: 'park', ko: '공원' },
    'bridge': { en: 'bridge', ko: '다리' },
    'warehouse': { en: 'warehouse, factory', ko: '창고, 공장' },
    'abandoned': { en: 'abandoned place', ko: '버려진 장소' },
    'abstract': { en: 'abstract background', ko: '추상적 배경' },
    'river': { en: 'river, riverside', ko: '강, 강변' },
    'lake': { en: 'lake', ko: '호수' },
    'sea': { en: 'sea, ocean', ko: '바다, 해상' },
    'sky': { en: 'sky, clouds', ko: '하늘, 구름' },
    'street': { en: 'street, alley', ko: '거리, 골목' },
    'alley': { en: 'narrow alley', ko: '골목길' },
    'building': { en: 'building', ko: '빌딩, 건물' },
    'rooftop-night': { en: 'rooftop at night', ko: '옥상 야경' },
    'station': { en: 'station, terminal', ko: '역, 터미널' },
    'airport': { en: 'airport', ko: '공항' },
    'car': { en: 'inside car, vehicle', ko: '차 안, 이동 수단' },
    'train': { en: 'inside train', ko: '기차 안' },
    'bar': { en: 'bar, pub', ko: '바, 펍' },
    'club': { en: 'club, nightclub', ko: '클럽, 나이트' },
    'concert': { en: 'concert venue, live stage', ko: '공연장, 라이브' },
    'school': { en: 'school, classroom', ko: '학교, 교실' },
    'library': { en: 'library', ko: '도서관' },
    'museum': { en: 'museum, art gallery', ko: '미술관, 박물관' },
    'church': { en: 'church, cathedral', ko: '교회, 성당' },
    'temple': { en: 'temple, shrine', ko: '사찰, 절' },
    'hospital': { en: 'hospital', ko: '병원' },
    'hotel': { en: 'hotel lobby', ko: '호텔, 로비' },
    'bedroom': { en: 'bedroom, bed', ko: '침실, 침대' },
    'kitchen': { en: 'kitchen', ko: '주방' },
    'bathroom': { en: 'bathroom', ko: '욕실' },
    'balcony': { en: 'balcony, terrace', ko: '발코니, 테라스' },
    'garden': { en: 'garden, yard', ko: '정원, 뜰' },
    'farm': { en: 'farm, field', ko: '농장, 들판' },
    'vineyard': { en: 'vineyard', ko: '포도밭' },
    'snow': { en: 'snow, snowy landscape', ko: '눈, 설원' },
    'rain': { en: 'rain, rainy street', ko: '비, 빗속' },
    'sunset': { en: 'sunset, golden hour', ko: '일몰, 석양' },
    'sunrise': { en: 'sunrise', ko: '일출' },
    'night-sky': { en: 'night sky, stars', ko: '밤하늘, 별' },
    'underwater': { en: 'underwater', ko: '수중, 물속' },
    'stadium': { en: 'stadium', ko: '경기장, 스타디움' },
    'parking': { en: 'parking lot', ko: '주차장' },
    'bridge-night': { en: 'bridge at night', ko: '다리 야경' },
    'rooftop-pool': { en: 'rooftop pool', ko: '루프탑 풀' },
    'rooftop-garden': { en: 'rooftop garden', ko: '옥상 정원' }
};

// 장소 유형별 가사 키워드 (씬별로 가사에 맞는 장소 선택용)
const MV_LOCATION_KEYWORDS = {
    'city': ['도시', '거리', '건물', 'urban', 'street', 'city', 'building', '골목', '번화가'],
    'urban-night': ['밤', '야경', '네온', '불빛', 'night', 'neon', 'light', '야밤', '밤거리'],
    'beach': ['바다', '해변', '파도', '모래', 'beach', 'sea', 'ocean', 'surf', '해수욕'],
    'mountain': ['산', '산길', '자연', 'mountain', 'hill', 'peak', '등산', '숲길'],
    'forest': ['숲', '나무', '숲속', 'forest', 'tree', 'woods', '정글'],
    'desert': ['사막', 'desert', 'sand', '황야'],
    'indoor': ['실내', '방', '스튜디오', 'indoor', 'room', 'studio', '실내'],
    'rooftop': ['옥상', 'rooftop', '루프탑', '지붕'],
    'subway': ['지하철', '지하', 'subway', 'metro', '전철', '역'],
    'cafe': ['카페', '커피', 'cafe', 'coffee', '다방'],
    'restaurant': ['레스토랑', '식당', 'restaurant', '맛집', '밥', '음식'],
    'park': ['공원', '벤치', '잔디', 'park', 'bench', '벚꽃', '산책'],
    'bridge': ['다리', 'bridge', '강변', '횡단'],
    'warehouse': ['창고', '공장', 'warehouse', 'factory', '창고'],
    'abandoned': ['버려진', '폐허', 'abandoned', 'empty', '허름'],
    'abstract': ['추상', 'abstract', '몽환'],
    'river': ['강', '강변', 'river', '강가', '물'],
    'lake': ['호수', 'lake', '호반'],
    'sea': ['바다', '해상', 'sea', 'ocean', '항구'],
    'sky': ['하늘', '구름', 'sky', 'cloud', '날씨'],
    'street': ['거리', '골목', 'street', 'alley', '도로'],
    'alley': ['골목', 'alley', '좁은', '골목길'],
    'building': ['빌딩', '건물', 'building', '타워', '오피스'],
    'rooftop-night': ['옥상', '야경', '밤', 'rooftop', 'night'],
    'station': ['역', '터미널', 'station', 'terminal', '기차역', '버스'],
    'airport': ['공항', 'airport', '비행기', '출국'],
    'car': ['차', '자동차', 'car', '운전', '드라이브', '백시트'],
    'train': ['기차', '열차', 'train', 'KTX', '전철'],
    'bar': ['바', '펍', 'bar', 'pub', '술집', '클럽'],
    'club': ['클럽', '나이트', 'club', '디스코'],
    'concert': ['공연', '라이브', '콘서트', 'concert', '무대', '공연장'],
    'school': ['학교', '교실', 'school', 'classroom', '선생', '수업'],
    'library': ['도서관', 'library', '책', '열람실'],
    'museum': ['미술관', '박물관', 'museum', '갤러리', '전시'],
    'church': ['교회', '성당', 'church', 'cathedral', '기도'],
    'temple': ['사찰', '절', 'temple', '절', '스님'],
    'hospital': ['병원', 'hospital', '의원', '침대'],
    'hotel': ['호텔', '로비', 'hotel', 'lobby', '체크인'],
    'bedroom': ['침실', '침대', 'bedroom', 'bed', '잠', '방'],
    'kitchen': ['주방', '키친', 'kitchen', '요리', '밥'],
    'bathroom': ['욕실', '화장실', 'bathroom', '샤워'],
    'balcony': ['발코니', '테라스', 'balcony', 'terrace'],
    'garden': ['정원', '뜰', 'garden', 'yard', '꽃', '정원'],
    'farm': ['농장', '들판', 'farm', 'field', '농촌', '시골'],
    'vineyard': ['포도밭', 'vineyard', '와인'],
    'snow': ['눈', '설원', 'snow', '겨울', '눈길'],
    'rain': ['비', '빗속', 'rain', 'rainy', '우산', '젖은'],
    'sunset': ['일몰', '석양', 'sunset', '저녁노을', '황혼'],
    'sunrise': ['일출', 'sunrise', '새벽', '아침'],
    'night-sky': ['밤하늘', '별', 'night', 'star', '별빛', '星座'],
    'underwater': ['수중', '물속', 'underwater', '바다속', '다이빙'],
    'stadium': ['경기장', '스타디움', 'stadium', '경기', '관중'],
    'parking': ['주차장', 'parking', '차량'],
    'bridge-night': ['다리', '야경', '밤', 'bridge', 'night'],
    'rooftop-pool': ['옥상', '풀', '수영', 'rooftop', 'pool'],
    'rooftop-garden': ['옥상', '정원', 'rooftop', 'garden']
};

/**
 * 해당 씬 가사에 가장 잘 맞는 장소 유형 1개를 선택된 장소 목록에서 골라 반환.
 * 키워드 매칭 점수가 높은 것 우선, 동점이면 씬 인덱스로 순환하여 다양하게 배분.
 */
window.pickBestLocationForScene = function(sceneLyrics, sceneIndex, totalScenes) {
    const selected = (typeof window.getMVLocationValues === 'function' ? window.getMVLocationValues() : []);
    if (!selected.length) return null;
    if (selected.length === 1) return selected[0];
    const text = (sceneLyrics || '').toLowerCase().replace(/\s+/g, ' ');
    let bestScore = -1;
    let bestLoc = null;
    const scores = {};
    selected.forEach(loc => {
        const keywords = (typeof MV_LOCATION_KEYWORDS !== 'undefined' && MV_LOCATION_KEYWORDS[loc]) ? MV_LOCATION_KEYWORDS[loc] : [];
        let score = 0;
        keywords.forEach(kw => {
            if (text.indexOf(kw.toLowerCase()) !== -1) score += 1;
        });
        scores[loc] = score;
        if (score > bestScore) {
            bestScore = score;
            bestLoc = loc;
        }
    });
    if (bestLoc && bestScore > 0) return bestLoc;
    return selected[sceneIndex % selected.length];
};
window.getMVLocationValues = function() {
    const container = document.getElementById('mvLocationTags');
    if (!container) return [];
    const activeTags = container.querySelectorAll('.tag-btn.active');
    return Array.from(activeTags).map(btn => btn.getAttribute('data-value')).filter(v => !!v);
};

// [MOVED] extraction block

window.getMVLocationEnString = function() {
    const vals = window.getMVLocationValues();
    if (!vals.length) return '';
    return vals.map(v => (MV_LOCATION_MAP[v] && MV_LOCATION_MAP[v].en) || v).join(', ');
};

window.getMVLocationKoString = function() {
    const vals = window.getMVLocationValues();
    if (!vals.length) return '';
    return vals.map(v => (MV_LOCATION_MAP[v] && MV_LOCATION_MAP[v].ko) || v).join(', ');
};

window.updateMVImageCount = function() {
    const minutes = parseInt(document.getElementById('mvMinutes')?.value || 3);
    const seconds = parseInt(document.getElementById('mvSeconds')?.value || 30);
    const interval = parseInt(document.getElementById('mvInterval')?.value || 8);
    
    const totalSeconds = minutes * 60 + seconds;
    const imageCount = Math.ceil(totalSeconds / interval);
    
    const resultEl = document.getElementById('mvImageCount');
    if (resultEl) {
        resultEl.textContent = imageCount;
    }
    
    const intervalDisplay = document.getElementById('mvIntervalDisplay');
    if (intervalDisplay) {
        intervalDisplay.textContent = interval;
    }
    
    const totalDuration = document.getElementById('mvTotalDuration');
    if (totalDuration) {
        totalDuration.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
};

window.saveMVSettings = function() {
    const characterCount = document.getElementById('mvCharacterCount')?.value || '1';
    const characters = [];
    for (let i = 1; i <= parseInt(characterCount); i++) {
        const gender = document.getElementById(`mvCharacter${i}_gender`)?.value || '';
        const age = document.getElementById(`mvCharacter${i}_age`)?.value || '';
        const race = document.getElementById(`mvCharacter${i}_race`)?.value || '';
        const appearance = document.getElementById(`mvCharacter${i}_appearance`)?.value || '';
        characters.push({ gender, age, race, appearance });
    }

    const settings = {
        minutes: document.getElementById('mvMinutes')?.value || 3,
        seconds: document.getElementById('mvSeconds')?.value || 30,
        interval: document.getElementById('mvInterval')?.value || 8,
        era: document.getElementById('mvEra')?.value || '',
        country: document.getElementById('mvCountry')?.value || '',
        location: (typeof window.getMVLocationValues === 'function' ? window.getMVLocationValues() : []),
        characterCount: characterCount,
        characters: characters,
        customSettings: document.getElementById('mvCustomSettings')?.value || '',
        lighting: document.getElementById('mvLighting')?.value || '',
        cameraWork: document.getElementById('mvCameraWork')?.value || '',
        mood: document.getElementById('mvMood')?.value || ''
    };
    
    // 로컬 스토리지 호환성 유지
    localStorage.setItem('mvSettings', JSON.stringify(settings));

    // 프로젝트 데이터 통합 저장
    if (window.currentProject && window.currentProject.data) {
        if (!window.currentProject.data.marketing) window.currentProject.data.marketing = {};
        window.currentProject.data.marketing.mvSettings = JSON.parse(JSON.stringify(settings));
        
        if (typeof window.saveCurrentProject === 'function') {
            window.saveCurrentProject();
        }
    }
};

window.loadMVSettings = function() {
    try {
        const saved = localStorage.getItem('mvSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            if (document.getElementById('mvMinutes')) document.getElementById('mvMinutes').value = settings.minutes || 3;
            if (document.getElementById('mvSeconds')) document.getElementById('mvSeconds').value = settings.seconds || 30;
            if (document.getElementById('mvInterval')) document.getElementById('mvInterval').value = settings.interval || 8;
            if (document.getElementById('mvEra')) document.getElementById('mvEra').value = settings.era || '';
            if (document.getElementById('mvCountry')) document.getElementById('mvCountry').value = settings.country || '';
            // 장소 유형 다중 선택 복원
            const locationTagsContainer = document.getElementById('mvLocationTags');
            if (locationTagsContainer) {
                const locationArr = Array.isArray(settings.location) ? settings.location : (settings.location ? [settings.location] : []);
                locationTagsContainer.querySelectorAll('.tag-btn').forEach(btn => {
                    const v = btn.getAttribute('data-value');
                    if (locationArr.indexOf(v) !== -1) btn.classList.add('active'); else btn.classList.remove('active');
                });
            }
            if (document.getElementById('mvCharacterCount')) document.getElementById('mvCharacterCount').value = settings.characterCount || '1';
            if (document.getElementById('mvCustomSettings')) document.getElementById('mvCustomSettings').value = settings.customSettings || '';
            if (document.getElementById('mvLighting')) document.getElementById('mvLighting').value = settings.lighting || '';
            if (document.getElementById('mvCameraWork')) document.getElementById('mvCameraWork').value = settings.cameraWork || '';
            if (document.getElementById('mvMood')) document.getElementById('mvMood').value = settings.mood || '';
            
            window.updateMVImageCount();
            window.updateCharacterInputs();

            // 인물 상세 정보 복원
            if (settings.characters && Array.isArray(settings.characters)) {
                settings.characters.forEach((char, index) => {
                    const i = index + 1;
                    if (document.getElementById(`mvCharacter${i}_gender`)) document.getElementById(`mvCharacter${i}_gender`).value = char.gender || '';
                    if (document.getElementById(`mvCharacter${i}_age`)) document.getElementById(`mvCharacter${i}_age`).value = char.age || '';
                    if (document.getElementById(`mvCharacter${i}_race`)) document.getElementById(`mvCharacter${i}_race`).value = char.race || '';
                    if (document.getElementById(`mvCharacter${i}_appearance`)) document.getElementById(`mvCharacter${i}_appearance`).value = char.appearance || '';
                });
            }
        }
            } catch (e) {
        console.warn('MV 설정 로드 실패:', e);
    }
};

window.updateCharacterInputs = function() {
    const characterCount = document.getElementById('mvCharacterCount')?.value || '1';
    const container = document.getElementById('mvCharacterInputs');
    
    if (!container) {
        console.warn('⚠️ mvCharacterInputs 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    console.log('🔄 updateCharacterInputs 호출됨, 인물 수:', characterCount);
    
    // 기존 값 백업
    const count = parseInt(characterCount);
    const backups = [];
    for (let i = 1; i <= 10; i++) { // 최대 10명까지 가정
        const gender = document.getElementById(`mvCharacter${i}_gender`)?.value;
        const age = document.getElementById(`mvCharacter${i}_age`)?.value;
        const race = document.getElementById(`mvCharacter${i}_race`)?.value;
        const appearance = document.getElementById(`mvCharacter${i}_appearance`)?.value;
        if (gender !== undefined) {
            backups[i] = { gender, age, race, appearance };
        }
    }
    
    let html = '';
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
                        <input type="text" id="mvCharacter${i}_appearance" oninput="window.saveMVSettings()" placeholder="예: 단정한 헤어스타일, 키가 큰, 마른 체형" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary);">
                    </div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;

    // 백업 값 복원
    for (let i = 1; i <= count; i++) {
        if (backups[i]) {
            if (document.getElementById(`mvCharacter${i}_gender`)) document.getElementById(`mvCharacter${i}_gender`).value = backups[i].gender;
            if (document.getElementById(`mvCharacter${i}_age`)) document.getElementById(`mvCharacter${i}_age`).value = backups[i].age;
            if (document.getElementById(`mvCharacter${i}_race`)) document.getElementById(`mvCharacter${i}_race`).value = backups[i].race;
            if (document.getElementById(`mvCharacter${i}_appearance`)) document.getElementById(`mvCharacter${i}_appearance`).value = backups[i].appearance;
        }
    }
};

// 페이지 로드 시 MV 설정 로드
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                if (typeof window.loadMVSettings === 'function') window.loadMVSettings();
                if (typeof window.updateMVImageCount === 'function') window.updateMVImageCount();
                if (typeof window.updateCharacterInputs === 'function') window.updateCharacterInputs();
            }, 500);
        });
    } else {
            setTimeout(() => {
            if (typeof window.loadMVSettings === 'function') window.loadMVSettings();
            if (typeof window.updateMVImageCount === 'function') window.updateMVImageCount();
            if (typeof window.updateCharacterInputs === 'function') window.updateCharacterInputs();
            }, 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// 프로젝트 목록 로드 함수 (debounce 적용)
// ═══════════════════════════════════════════════════════════════
window.loadProjectList = function(force = false) {
    try {
        // 디바운스: 연속 호출 시 마지막 호출만 실행 (150ms)
        if (!force) {
            clearTimeout(window.loadProjectListDebounceTimer);
            window.loadProjectListDebounceTimer = setTimeout(function() {
                window.loadProjectList(true);
            }, 150);
            return;
        }
        // 중복 호출 방지 (로딩 중이 아닐 때만 실행)
        if (window.loadProjectListLoading) {
            console.log('⏳ 프로젝트 목록 로드 중... (중복 호출 무시)');
            return;
        }
        
        window.loadProjectListLoading = true;
        
        const projectListEl = document.getElementById('projectList');
        if (!projectListEl) {
            console.error('projectList 요소를 찾을 수 없습니다.');
            window.loadProjectListLoading = false;
            return;
        }
        
        // localStorage에서 모든 프로젝트 데이터 수집
        let allProjects = [];
        const foundKeys = [];
        
        // 모든 localStorage 키를 확인하여 프로젝트 데이터 찾기
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            
            try {
                const data = localStorage.getItem(key);
                if (!data) continue;
                
                // JSON 배열인지 확인
                if (data.trim().startsWith('[')) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        // 프로젝트 객체인지 확인 (id와 title이 있는지)
                        const firstItem = parsed[0];
                        if (firstItem && typeof firstItem === 'object' && firstItem.id && firstItem.title) {
                            allProjects = allProjects.concat(parsed);
                            foundKeys.push(key);
                            console.log(`✅ ${key} 키에서 ${parsed.length}개 프로젝트 발견`);
                        }
                    }
                }
                // 단일 프로젝트 객체인지 확인
                else if (data.trim().startsWith('{')) {
                    const parsed = JSON.parse(data);
                    if (parsed && typeof parsed === 'object' && parsed.id && parsed.title) {
                        allProjects.push(parsed);
                        foundKeys.push(key);
                        console.log(`✅ ${key} 키에서 단일 프로젝트 발견`);
                    }
                }
            } catch (e) {
                // JSON 파싱 실패는 무시
            }
        }
        
        // 중복 제거 (같은 id를 가진 프로젝트는 가장 최신 것만 유지)
        const projectMap = new Map();
        allProjects.forEach(project => {
            if (!project.id) return;
            
            const existing = projectMap.get(project.id);
            if (!existing) {
                projectMap.set(project.id, project);
            } else {
                // 더 최신 프로젝트로 교체
                const existingDate = new Date(existing.savedAt || existing.createdAt || 0);
                const newDate = new Date(project.savedAt || project.createdAt || 0);
                if (newDate > existingDate) {
                    projectMap.set(project.id, project);
                }
            }
        });
        
        const projects = Array.from(projectMap.values());
        
        if (projects.length === 0) {
            projectListEl.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">저장된 프로젝트가 없습니다.<br><br><small style="color: var(--text-secondary);">프로젝트를 저장하면 여기에 표시됩니다.</small></div>';
            var recentEl = document.getElementById('recentProjectsList');
            if (recentEl) { recentEl.innerHTML = ''; recentEl.style.display = 'none'; }
            console.warn('⚠️ 프로젝트 데이터를 찾을 수 없습니다.');
            window.loadProjectListLoading = false;
            return;
        }
    
        console.log(`✅ 총 ${projects.length}개 프로젝트 발견 (${foundKeys.length}개 키에서)`);
        
        // 검색어 필터링
        const searchInput = document.getElementById('projectSearch');
        let filteredProjects = projects;
        if (searchInput && searchInput.value.trim()) {
            const searchTerm = searchInput.value.trim().toLowerCase();
            filteredProjects = projects.filter(project => {
                const title = (project.title || '').toLowerCase();
                const genres = (project.genres || []).join(' ').toLowerCase();
                return title.includes(searchTerm) || genres.includes(searchTerm);
            });
        }
        
        // ═══════════════════════════════════════════════════════════════
        // 정렬 옵션 적용 (항상 정렬 드롭다운의 값을 우선 적용)
        // ═══════════════════════════════════════════════════════════════
        const sortSelect = document.getElementById('projectSort');
        // 정렬 드롭다운이 없거나 값이 없으면 기본값 사용
        const sortValue = sortSelect && sortSelect.value ? sortSelect.value : 'savedAt-desc';
        const [sortField, sortOrder] = sortValue.split('-');
        
        // 한글 제목 분리 헬퍼 함수
        function getKoreanTitle(fullTitle) {
            if (!fullTitle) return '';
            const match = fullTitle.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
            return match ? match[1].trim() : fullTitle.trim();
        }
        
        // 정렬 적용 (항상 적용)
        filteredProjects.sort((a, b) => {
            let valueA, valueB;
            
            if (sortField === 'savedAt' || sortField === 'createdAt') {
                valueA = new Date(a[sortField] || a.createdAt || a.savedAt || 0);
                valueB = new Date(b[sortField] || b.createdAt || b.savedAt || 0);
            } else if (sortField === 'title') {
                // 한글 제목만 사용하여 정렬
                valueA = getKoreanTitle(a.title || '').toLowerCase();
                valueB = getKoreanTitle(b.title || '').toLowerCase();
            } else if (sortField === 'genre') {
                valueA = (a.genres || []).join(', ').toLowerCase();
                valueB = (b.genres || []).join(', ').toLowerCase();
            } else if (sortField === 'step') {
                // 진행 단계를 숫자로 변환 (예: "6단계" -> 6)
                const stepA = a.lastStep || '';
                const stepB = b.lastStep || '';
                valueA = parseInt(stepA.toString().replace(/[^0-9]/g, '')) || 0;
                valueB = parseInt(stepB.toString().replace(/[^0-9]/g, '')) || 0;
            } else {
                // 기본값: 수정일시 최신순
                valueA = new Date(a.savedAt || a.createdAt || a.updatedAt || 0);
                valueB = new Date(b.savedAt || b.createdAt || b.updatedAt || 0);
            }
            
            if (sortOrder === 'asc') {
                return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            } else {
                return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
            }
        });
        
        console.log(`✅ 정렬 적용 완료: ${sortValue} (${sortField}-${sortOrder})`);
        
        if (filteredProjects.length === 0) {
            projectListEl.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">검색 결과가 없습니다.</div>';
            var recentEl = document.getElementById('recentProjectsList');
            if (recentEl) { recentEl.innerHTML = ''; recentEl.style.display = 'none'; }
            window.loadProjectListLoading = false;
            return;
        }
        
        // 최근 프로젝트 5개 표시
        var recentEl = document.getElementById('recentProjectsList');
        if (recentEl) {
            var recent = filteredProjects.slice(0, 5);
            var recentHtml = '<div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px;">📌 최근 프로젝트</div>';
            recent.forEach(function(proj) {
                var t = (proj.title || '제목 없음').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                recentHtml += '<button type="button" class="btn btn-small" style="width: 100%; margin-bottom: 6px; justify-content: flex-start; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem;" onclick="event.stopPropagation(); if(typeof window.loadProject === \'function\') { window.loadProject(\'' + proj.id + '\'); }">' + t + '</button>';
            });
            recentEl.innerHTML = recentHtml;
            recentEl.style.display = 'block';
        }
        
        // ═══════════════════════════════════════════════════════════════
        // 프로젝트 순서 복원 (정렬이 선택된 경우에는 건너뛰기)
        // ═══════════════════════════════════════════════════════════════
        const hasSortSelected = sortValue && sortValue !== 'savedAt-desc';
        
        // 정렬이 명시적으로 선택된 경우에만 순서 복원을 건너뛰기
        // 기본값(savedAt-desc)이 아닌 경우에는 사용자가 정렬을 선택한 것으로 간주
        if (!hasSortSelected && typeof restoreProjectOrder === 'function') {
            filteredProjects = restoreProjectOrder(filteredProjects);
        }
        
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function formatDate(date) {
            if (!date) return '';
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
        
        // ═══════════════════════════════════════════════════════════════
        // 정렬 기준에 따라 표시할 정보 결정
        // ═══════════════════════════════════════════════════════════════
        // sortSelect는 이미 위에서 선언되었으므로 재사용
        // const sortSelect = document.getElementById('projectSort'); // 중복 선언 제거
        // sortValue와 sortField, sortOrder도 이미 위에서 선언되었으므로 재사용
        
        // 정렬 드롭다운이 있으면 항상 정렬 모드 활성화 (기본값 포함)
        // 정렬 모드에서는 한글 제목 + 선택한 정렬 기준 정보만 표시
        const isSortMode = true; // 항상 정렬 모드로 동작
        
        // 한글 제목과 영어 제목 분리 함수
        function splitTitle(fullTitle) {
            if (!fullTitle) return { korean: '제목 없음', english: '' };
            
            // "한글제목 (English Title)" 형식 파싱
            const match = fullTitle.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
            if (match) {
                return {
                    korean: match[1].trim(),
                    english: match[2].trim()
                };
            }
            
            // 괄호가 없으면 전체를 한글 제목으로 간주
            return {
                korean: fullTitle.trim(),
                english: ''
            };
        }
        
        let html = '';
        filteredProjects.forEach(project => {
            // 제목 분리
            const titleParts = splitTitle(project.title);
            const koreanTitle = titleParts.korean;
            const englishTitle = titleParts.english;
            
            // 작성일시와 수정일시 구분
            const createdAt = project.createdAt || null;
            const savedAt = project.savedAt || project.updatedAt || null;
            const savedDate = savedAt || createdAt || Date.now();
            
            const createdDateStr = formatDate(createdAt);
            const savedDateStr = formatDate(savedAt || savedDate);
            
            // 장르 정보
            const genresStr = project.genres && project.genres.length > 0 
                ? project.genres.join(', ') 
                : '';
            
            // 진행 단계
            const stepStr = project.lastStep ? project.lastStep : '';
            
            // ═══════════════════════════════════════════════════════════════
            // 정렬 모드에 따라 표시할 정보 결정
            // ═══════════════════════════════════════════════════════════════
            let showCreatedDate = false;
            let showSavedDate = false;
            let showGenres = false;
            let showStep = false;
            let showEnglishTitle = false;
            
            if (isSortMode) {
                // 정렬 모드: 한글 제목 + 선택한 정렬 기준 정보만 표시
                switch (sortField) {
                    case 'createdAt':
                        showCreatedDate = true;
                        break;
                    case 'savedAt':
                        showSavedDate = true;
                        break;
                    case 'genre':
                        showGenres = true;
                        break;
                    case 'step':
                        showStep = true;
                        break;
                    case 'title':
                        // 제목 정렬 시에는 제목만 표시
                        break;
                }
            } else {
                // 기본 모드: 모든 정보 표시 (영어 제목 제외)
                showCreatedDate = !!createdDateStr;
                showSavedDate = !!(savedDateStr && savedAt);
                showGenres = !!genresStr;
                showStep = !!stepStr;
            }
            
            html += `
                <div class="project-item" 
                     data-project-id="${project.id}"
                     draggable="true"
                     style="padding: 12px 15px; margin-bottom: 10px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border); cursor: move; transition: all 0.2s; position: relative; min-height: 50px; display: flex; align-items: center;" 
                     onmouseover="if(!this.classList.contains('dragging')) this.style.background='var(--bg-input)'" 
                     onmouseout="if(!this.classList.contains('dragging')) this.style.background='var(--bg-card)'">
                    <span class="project-drag-handle" style="position: absolute; left: 3px; top: 50%; transform: translateY(-50%); opacity: 0.3; cursor: grab; font-size: 0.85rem; color: var(--text-secondary); z-index: 10; flex-shrink: 0; width: 18px;" title="드래그하여 순서 변경" onmousedown="event.stopPropagation();">
                        <i class="fas fa-grip-vertical"></i>
                    </span>
                    <button class="project-duplicate" 
                            onclick="event.stopPropagation(); duplicateProject('${project.id}');" 
                            style="position: absolute; right: 58px; top: 50%; transform: translateY(-50%); background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 6px; padding: 5px 8px; cursor: pointer; opacity: 0.6; transition: all 0.2s; color: var(--accent); font-size: 0.75rem; z-index: 10; flex-shrink: 0; white-space: nowrap;" 
                            onmouseover="this.style.opacity='1'; this.style.background='rgba(139, 92, 246, 0.2)'" 
                            onmouseout="this.style.opacity='0.6'; this.style.background='rgba(139, 92, 246, 0.1)'"
                            title="프로젝트 복제">
                        <i class="fas fa-copy"></i> 복제
                    </button>
                    <button class="project-delete" 
                            onclick="event.stopPropagation(); deleteProject('${project.id}');" 
                            style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 5px 8px; cursor: pointer; opacity: 0.6; transition: all 0.2s; color: var(--error); font-size: 0.75rem; z-index: 10; flex-shrink: 0; white-space: nowrap;" 
                            onmouseover="this.style.opacity='1'; this.style.background='rgba(239, 68, 68, 0.2)'" 
                            onmouseout="this.style.opacity='0.6'; this.style.background='rgba(239, 68, 68, 0.1)'"
                            title="프로젝트 삭제">
                        <i class="fas fa-trash-alt"></i> 삭제
                    </button>
                    <div style="padding-left: 22px; padding-right: 125px; cursor: pointer; word-wrap: break-word; overflow-wrap: break-word; min-width: 0; flex: 1; width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; text-align: left; display: flex; flex-direction: column; justify-content: center;" onclick="event.stopPropagation(); loadProject('${project.id}');">
                        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: ${isSortMode && !showCreatedDate && !showSavedDate && !showGenres && !showStep ? '0' : '4px'}; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; text-align: left;">${escapeHtml(koreanTitle)}</div>
                        ${showCreatedDate && createdDateStr ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 2px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;"><span style="opacity: 0.7;">📅 작성일시:</span> <span>${createdDateStr}</span></div>` : ''}
                        ${showSavedDate && savedDateStr && savedAt ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 2px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;"><span style="opacity: 0.7;">✏️ 수정일시:</span> <span>${savedDateStr}</span></div>` : ''}
                        ${showGenres && genresStr ? `<div style="font-size: 0.75rem; color: var(--accent); margin-top: 2px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;"><span style="opacity: 0.8;">🎵 장르:</span> ${escapeHtml(genresStr)}</div>` : ''}
                        ${showStep && stepStr ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;"><span style="opacity: 0.7;">📍 진행 단계:</span> ${escapeHtml(stepStr)}</div>` : ''}
                    </div>
                </div>
            `;
        });
        
        projectListEl.innerHTML = html;
        
        // 프로젝트 항목 드래그 앤 드롭 초기화
        initProjectDragAndDrop();
        
        console.log(`✅ ${filteredProjects.length}개 프로젝트 표시 완료`);
        
        // 로딩 완료 플래그 해제
        window.loadProjectListLoading = false;
    } catch (error) {
        console.error('프로젝트 로드 오류:', error);
        // 오류 발생 시에도 플래그 해제
        window.loadProjectListLoading = false;
        const projectListEl = document.getElementById('projectList');
        if (projectListEl) {
            projectListEl.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--error);">프로젝트를 불러올 수 없습니다.<br>오류: ' + error.message + '</div>';
        }
    }
};

// 프로젝트 검색 필터링
window.filterProjects = function() {
    if (typeof window.loadProjectList === 'function') {
        window.loadProjectList();
    }
};

// 프로젝트 정렬
window.sortProjects = function() {
    if (typeof window.loadProjectList === 'function') {
        window.loadProjectList();
    }
};

// 프로젝트 목록 드래그 앤 드롭 초기화
window.initProjectDragAndDrop = function() {
    const projectList = document.getElementById('projectList');
    if (!projectList) return;
    
    const projectItems = projectList.querySelectorAll('.project-item');
    let draggedElement = null;
    
    projectItems.forEach(item => {
        let isDragging = false;
        let dragStartTime = 0;
        let dragStartX = 0;
        let dragStartY = 0;
        
        // 마우스 다운 (드래그 시작 감지)
        item.addEventListener('mousedown', function(e) {
            // 드래그 핸들이 아닌 경우에만
            if (!e.target.closest('.project-drag-handle')) {
                dragStartTime = Date.now();
                dragStartX = e.clientX;
                dragStartY = e.clientY;
            }
        });
        
        // 드래그 시작
        item.addEventListener('dragstart', function(e) {
            // 삭제 버튼 클릭 시 드래그 방지
            if (e.target.closest('.project-delete')) {
                e.preventDefault();
                return false;
            }
            
            // 드래그 핸들에서만 드래그 시작
            if (!e.target.closest('.project-drag-handle') && !isDragging) {
                e.preventDefault();
                return false;
            }
            
            isDragging = true;
            draggedElement = this;
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.innerHTML);
            
            // 드래그 이미지 설정
            const dragImage = this.cloneNode(true);
            dragImage.style.opacity = '0.5';
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, 0, 0);
            setTimeout(() => document.body.removeChild(dragImage), 0);
        });
        
        // 드래그 종료
        item.addEventListener('dragend', function(e) {
            isDragging = false;
            this.classList.remove('dragging');
            projectItems.forEach(i => i.classList.remove('drag-over'));
            draggedElement = null;
        });
        
        // 클릭 이벤트 (드래그가 아닌 경우에만)
        item.addEventListener('click', function(e) {
            // 드래그 핸들 클릭은 무시
            if (e.target.closest('.project-drag-handle')) {
                return;
            }
            
            // 드래그가 아닌 경우에만 프로젝트 로드
            const timeDiff = Date.now() - dragStartTime;
            const xDiff = Math.abs(e.clientX - dragStartX);
            const yDiff = Math.abs(e.clientY - dragStartY);
            
            if (timeDiff < 300 && xDiff < 5 && yDiff < 5 && !isDragging) {
                const projectId = this.getAttribute('data-project-id');
                if (projectId && typeof window.loadProject === 'function') {
                    window.loadProject(projectId);
                }
            }
        });
        
        // 드래그 오버
        item.addEventListener('dragover', function(e) {
            if (draggedElement && draggedElement !== this) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                this.classList.add('drag-over');
            }
        });
        
        // 드래그 리브
        item.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });
        
        // 드롭
        item.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (draggedElement && draggedElement !== this) {
                const allItems = Array.from(projectList.querySelectorAll('.project-item'));
                const draggedIndex = allItems.indexOf(draggedElement);
                const targetIndex = allItems.indexOf(this);
                
                if (draggedIndex < targetIndex) {
                    // 아래로 이동
                    this.parentNode.insertBefore(draggedElement, this.nextSibling);
                } else {
                    // 위로 이동
                    this.parentNode.insertBefore(draggedElement, this);
                }
                
                // 프로젝트 순서 저장
                saveProjectOrder();
                
                // 드래그 앤 드롭 다시 초기화
                setTimeout(() => {
                    window.initProjectDragAndDrop();
                }, 100);
            }
            
            this.classList.remove('drag-over');
        });
    });
    
    // 프로젝트 목록 전체 드롭 영역 허용
    projectList.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
};

// 프로젝트 순서 저장
window.saveProjectOrder = function() {
    const projectList = document.getElementById('projectList');
    if (!projectList) return;
    
    const projectItems = projectList.querySelectorAll('.project-item');
    const projectOrder = Array.from(projectItems).map(item => {
        return item.getAttribute('data-project-id');
    }).filter(id => id);
    
    if (projectOrder.length > 0) {
        localStorage.setItem('projectOrder', JSON.stringify(projectOrder));
        console.log('✅ 프로젝트 순서 저장 완료:', projectOrder.length, '개');
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator('✅ 프로젝트 순서가 저장되었습니다!');
        }
    }
};

// 프로젝트 순서 복원
window.restoreProjectOrder = function(projects) {
    const savedOrder = localStorage.getItem('projectOrder');
    if (!savedOrder) return projects;
    
    try {
        const order = JSON.parse(savedOrder);
        const orderedProjects = [];
        const unorderedProjects = [];
        
        // 순서대로 정렬
        order.forEach(id => {
            const project = projects.find(p => p.id === id);
            if (project) {
                orderedProjects.push(project);
            }
        });
        
        // 순서에 없는 프로젝트 추가
        projects.forEach(project => {
            if (!order.includes(project.id)) {
                unorderedProjects.push(project);
            }
        });
        
        return [...orderedProjects, ...unorderedProjects];
    } catch (error) {
        console.error('프로젝트 순서 복원 오류:', error);
        return projects;
    }
};

// 프로젝트 삭제 함수
window.deleteProject = function(projectId) {
    if (!projectId) {
        alert('프로젝트 ID가 없습니다.');
        return;
    }
    
    // 프로젝트 정보 찾기 (삭제 확인 메시지에 제목 표시용)
    let projectTitle = '이 프로젝트';
    try {
        const keys = ['musicCreatorProjects', 'savedProjects', 'sunoLyricsHistory', 'stylePromptHistory'];
        for (const key of keys) {
            try {
                const data = localStorage.getItem(key);
                if (!data) continue;
                
                if (data.trim().startsWith('[')) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) {
                        const found = parsed.find(p => p.id === projectId);
                        if (found && found.title) {
                            projectTitle = `"${found.title}"`;
                            break;
                        }
                    }
                } else if (data.trim().startsWith('{')) {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.id === projectId && parsed.title) {
                        projectTitle = `"${parsed.title}"`;
                        break;
                    }
                }
            } catch (e) {
                // 무시
            }
        }
    } catch (e) {
        // 무시
    }
    
    // 삭제 확인
    const confirmDelete = confirm(`${projectTitle} 프로젝트를 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`);
    if (!confirmDelete) {
        return;
    }
    
    try {
        let deleted = false;
        const keys = ['musicCreatorProjects', 'savedProjects', 'sunoLyricsHistory', 'stylePromptHistory'];
        
        // 모든 localStorage 키에서 프로젝트 검색 및 삭제
        keys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (!data) return;
                
                // JSON 배열인지 확인
                if (data.trim().startsWith('[')) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) {
                        const filtered = parsed.filter(p => p.id !== projectId);
                        if (filtered.length !== parsed.length) {
                            localStorage.setItem(key, JSON.stringify(filtered));
                            deleted = true;
                            console.log(`✅ ${key}에서 프로젝트 삭제됨`);
                        }
                    }
                }
                // 단일 프로젝트 객체인지 확인
                else if (data.trim().startsWith('{')) {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.id === projectId) {
                        localStorage.removeItem(key);
                        deleted = true;
                        console.log(`✅ ${key}에서 프로젝트 삭제됨`);
                    }
                }
            } catch (e) {
                console.warn(`${key} 처리 중 오류:`, e);
            }
        });
        
        // 모든 localStorage 키를 확인하여 프로젝트 검색 및 삭제 (다른 키에도 있을 수 있음)
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || keys.includes(key)) continue;
            
            try {
                const data = localStorage.getItem(key);
                if (!data) continue;
                
                if (data.trim().startsWith('[')) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const firstItem = parsed[0];
                        if (firstItem && typeof firstItem === 'object' && firstItem.id) {
                            const filtered = parsed.filter(p => p.id !== projectId);
                            if (filtered.length !== parsed.length) {
                                localStorage.setItem(key, JSON.stringify(filtered));
                                deleted = true;
                                console.log(`✅ ${key}에서 프로젝트 삭제됨`);
                            }
                        }
                    }
                } else if (data.trim().startsWith('{')) {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.id === projectId) {
                        localStorage.removeItem(key);
                        deleted = true;
                        console.log(`✅ ${key}에서 프로젝트 삭제됨`);
                    }
                }
            } catch (e) {
                // 무시
            }
        }
        
        // 프로젝트 순서에서도 제거
        const savedOrder = localStorage.getItem('projectOrder');
        if (savedOrder) {
            try {
                const order = JSON.parse(savedOrder);
                const filteredOrder = order.filter(id => id !== projectId);
                if (filteredOrder.length !== order.length) {
                    localStorage.setItem('projectOrder', JSON.stringify(filteredOrder));
                    console.log('✅ 프로젝트 순서에서 제거됨');
                }
            } catch (e) {
                console.warn('프로젝트 순서 업데이트 오류:', e);
            }
        }
        
        if (deleted) {
            alert('✅ 프로젝트가 삭제되었습니다.');
            
            // 프로젝트 목록 새로고침
            if (typeof window.loadProjectList === 'function') {
                window.loadProjectList();
            }
            
            // 현재 프로젝트가 삭제된 프로젝트인 경우 초기화
            if (window.currentProjectId === projectId) {
                window.currentProjectId = null;
                window.currentProject = null;
            }
    } else {
            alert('⚠️ 삭제할 프로젝트를 찾을 수 없습니다.');
        }
    } catch (error) {
        console.error('프로젝트 삭제 오류:', error);
        alert('프로젝트 삭제 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

// ═══════════════════════════════════════════════════════════════
// 프로젝트 내보내기/가져오기 함수들
// ═══════════════════════════════════════════════════════════════
window.exportAllProjects = function() {
    try {
        // localStorage에서 모든 프로젝트 수집
        let allProjects = [];
        const keys = ['musicCreatorProjects', 'savedProjects', 'sunoLyricsHistory', 'stylePromptHistory'];
        
        keys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) {
                        allProjects = allProjects.concat(parsed);
                    }
                }
            } catch (e) {
                console.warn(`${key} 읽기 실패:`, e);
            }
        });
        
        // 중복 제거
        const projectMap = new Map();
        allProjects.forEach(project => {
            if (project && project.id) {
                const existing = projectMap.get(project.id);
                if (!existing) {
                    projectMap.set(project.id, project);
    } else {
                    const existingDate = new Date(existing.savedAt || existing.createdAt || 0);
                    const newDate = new Date(project.savedAt || project.createdAt || 0);
                    if (newDate > existingDate) {
                        projectMap.set(project.id, project);
                    }
                }
            }
        });
        
        const uniqueProjects = Array.from(projectMap.values());
        
        if (uniqueProjects.length === 0) {
            alert('내보낼 프로젝트가 없습니다.');
        return;
    }
    
        // JSON 파일로 다운로드
        const json = JSON.stringify(uniqueProjects, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `music-creator-projects-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`✅ ${uniqueProjects.length}개 프로젝트가 내보내기되었습니다.`);
    } catch (error) {
        console.error('프로젝트 내보내기 오류:', error);
        alert('프로젝트 내보내기 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

window.importProjects = function() {
    const fileInput = document.getElementById('importFile');
    if (fileInput) {
        fileInput.click();
    }
};

window.handleImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            console.log('✅ 가져오기 파일 읽기 완료:', file.name);
            
            // 프로젝트 배열 추출
            let projects = [];
            if (Array.isArray(importData)) {
                projects = importData;
            } else if (importData.projects && Array.isArray(importData.projects)) {
                projects = importData.projects;
            } else if (importData.musicCreatorProjects && Array.isArray(importData.musicCreatorProjects)) {
                projects = importData.musicCreatorProjects;
            } else {
                alert('유효하지 않은 가져오기 파일 형식입니다.');
        return;
    }
    
            if (projects.length === 0) {
                alert('가져올 프로젝트가 없습니다.');
        return;
    }
    
            // 가져오기 확인
            if (!confirm(`가져오기 파일에서 ${projects.length}개의 프로젝트를 찾았습니다.\n\n가져오시겠습니까?\n\n주의: 기존 프로젝트와 ID가 같으면 덮어씌워집니다.`)) {
        return;
    }
    
            // localStorage에 프로젝트 저장
            let importedCount = 0;
            let updatedCount = 0;
            let errorCount = 0;
            
            projects.forEach(project => {
                try {
                    if (!project.id) {
                        console.warn('프로젝트 ID가 없어 건너뜁니다:', project);
                        errorCount++;
        return;
    }
    
                    const now = new Date().toISOString();
                    if (!project.savedAt) {
                        project.savedAt = now;
                    }
                    if (!project.updatedAt) {
                        project.updatedAt = now;
                    }
                    
                    const existingKeys = ['musicCreatorProjects', 'savedProjects', 'sunoLyricsHistory', 'stylePromptHistory'];
                    
                    let isUpdate = false;
                    for (const key of existingKeys) {
                        try {
                            const existingData = localStorage.getItem(key);
                            if (existingData) {
                                const existingProjects = JSON.parse(existingData);
                                if (Array.isArray(existingProjects)) {
                                    const existingIndex = existingProjects.findIndex(p => p.id === project.id);
                                    if (existingIndex !== -1) {
                                        existingProjects[existingIndex] = project;
                                        localStorage.setItem(key, JSON.stringify(existingProjects));
                                        isUpdate = true;
                                        updatedCount++;
                                        break;
                                    }
                                }
                            }
                        } catch (err) {
                            continue;
                        }
                    }
                    
                    if (!isUpdate) {
                        try {
                            const existingData = localStorage.getItem('musicCreatorProjects');
                            const existingProjects = existingData ? JSON.parse(existingData) : [];
                            if (Array.isArray(existingProjects)) {
                                existingProjects.push(project);
                                localStorage.setItem('musicCreatorProjects', JSON.stringify(existingProjects));
                                importedCount++;
                            }
                        } catch (err) {
                            localStorage.setItem('musicCreatorProjects', JSON.stringify([project]));
                            importedCount++;
                        }
                    }
                } catch (err) {
                    console.error('프로젝트 가져오기 오류:', project.id, err);
                    errorCount++;
                }
            });
            
            // 결과 메시지
            let resultMessage = `✅ 가져오기 완료!\n\n`;
            resultMessage += `• 새로 가져온 프로젝트: ${importedCount}개\n`;
            resultMessage += `• 업데이트된 프로젝트: ${updatedCount}개\n`;
            if (errorCount > 0) {
                resultMessage += `• 오류 발생: ${errorCount}개\n`;
            }
            resultMessage += `\n페이지를 새로고침하여 프로젝트 목록을 확인하세요.`;
            
            alert(resultMessage);
            
            // 프로젝트 목록 새로고침
            if (typeof window.loadProjectList === 'function') {
                window.loadProjectList();
            }
            
            // 파일 입력 초기화
            event.target.value = '';
        } catch (error) {
            console.error('가져오기 오류:', error);
            alert('프로젝트 가져오기 중 오류가 발생했습니다:\n\n' + error.message + '\n\n파일 형식을 확인해주세요.');
        }
    };
    
    reader.onerror = function() {
        alert('파일을 읽는 중 오류가 발생했습니다.');
    };
    
    reader.readAsText(file);
};

window.manualBackup = function() {
    // exportAllProjects와 동일하게 작동
    window.exportAllProjects();
};

// 전체 프로그램 백업 (프로젝트 데이터 + 설정)
window.backupFullProgram = function() {
    try {
        console.log('💾 전체 프로그램 백업 시작...');
        
        // 모든 localStorage 데이터 수집
        const allData = {
            backupDate: new Date().toISOString(),
            backupVersion: '1.0',
            projects: {},
            settings: {},
            other: {}
        };
        
        // 프로젝트 데이터 수집
        const projectKeys = ['musicCreatorProjects', 'savedProjects', 'sunoLyricsHistory', 'stylePromptHistory'];
        projectKeys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    allData.projects[key] = JSON.parse(data);
                }
            } catch (e) {
                console.warn(`${key} 백업 중 오류:`, e);
            }
        });
        
        // 설정 데이터 수집
        const settingKeys = ['mvSettings', 'musicCreatorGuidelines', 'openai_api_key', 'gemini_api_key', 'selectedAPI', 'stepOrder', 'sidebarPosition', 'sidebarSize', 'projectOrder'];
        settingKeys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    allData.settings[key] = data;
                }
            } catch (e) {
                console.warn(`${key} 백업 중 오류:`, e);
            }
        });
        
        // 기타 localStorage 데이터 수집
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            
            // 이미 수집한 키는 제외
            if (projectKeys.includes(key) || settingKeys.includes(key)) continue;
            
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    // JSON인지 확인
                    try {
                        allData.other[key] = JSON.parse(data);
                    } catch {
                        allData.other[key] = data;
                    }
                }
            } catch (e) {
                console.warn(`${key} 백업 중 오류:`, e);
            }
        }
        
        // 백업 파일 생성
        const backupJson = JSON.stringify(allData, null, 2);
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `music-creator-full-backup-${timestamp}.json`;
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ 전체 프로그램 백업 완료:', filename);
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(`✅ 전체 프로그램 백업 완료!\n\n파일명: ${filename}`);
        } else {
            alert(`✅ 전체 프로그램 백업이 완료되었습니다!\n\n파일명: ${filename}\n\n이 파일에는 모든 프로젝트 데이터와 설정이 포함되어 있습니다.`);
        }
        
    } catch (error) {
        console.error('❌ 전체 프로그램 백업 오류:', error);
        alert('전체 프로그램 백업 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

// ═══════════════════════════════════════════════════════════════
// 백업 파일에서 복구 함수
// ═══════════════════════════════════════════════════════════════
window.restoreFromBackupFile = function() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    fileInput.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const backupData = JSON.parse(e.target.result);
                console.log('✅ 백업 파일 읽기 완료:', file.name);
                
                if (!backupData || typeof backupData !== 'object') {
                    throw new Error('유효하지 않은 백업 파일 형식입니다.');
                }
                
                let projects = [];
                if (Array.isArray(backupData)) {
                    projects = backupData;
                } else if (backupData.projects && Array.isArray(backupData.projects)) {
                    projects = backupData.projects;
                } else if (backupData.musicCreatorProjects && Array.isArray(backupData.musicCreatorProjects)) {
                    projects = backupData.musicCreatorProjects;
            } else {
                    if (backupData.id || backupData.title) {
                        projects = [backupData];
                    } else {
                        throw new Error('백업 파일에서 프로젝트를 찾을 수 없습니다.');
                    }
                }
                
                if (projects.length === 0) {
                    throw new Error('백업 파일에 프로젝트가 없습니다.');
                }
                
                const confirmMessage = `백업 파일에서 ${projects.length}개의 프로젝트를 찾았습니다.\n\n복구하시겠습니까?\n\n주의: 기존 프로젝트와 ID가 같으면 덮어씌워집니다.`;
                if (!confirm(confirmMessage)) {
            return;
        }
        
                let restoredCount = 0;
                let updatedCount = 0;
                let errorCount = 0;
                
                projects.forEach(project => {
                    try {
                        if (!project.id) {
                            console.warn('프로젝트 ID가 없어 건너뜁니다:', project);
                            errorCount++;
        return;
    }
    
                        const now = new Date().toISOString();
                        if (!project.savedAt) {
                            project.savedAt = now;
                        }
                        if (!project.updatedAt) {
                            project.updatedAt = now;
                        }
                        
                        const existingKeys = ['musicCreatorProjects', 'savedProjects', 'sunoLyricsHistory', 'stylePromptHistory'];
                        
                        let isUpdate = false;
                        for (const key of existingKeys) {
                            try {
                                const existingData = localStorage.getItem(key);
                                if (existingData) {
                                    const existingProjects = JSON.parse(existingData);
                                    if (Array.isArray(existingProjects)) {
                                        const existingIndex = existingProjects.findIndex(p => p.id === project.id);
                                        if (existingIndex !== -1) {
                                            existingProjects[existingIndex] = project;
                                            localStorage.setItem(key, JSON.stringify(existingProjects));
                                            isUpdate = true;
                                            updatedCount++;
                                            break;
                                        }
                                    }
                                }
                            } catch (err) {
                                continue;
                            }
                        }
                        
                        if (!isUpdate) {
                            try {
                                const existingData = localStorage.getItem('musicCreatorProjects');
                                const existingProjects = existingData ? JSON.parse(existingData) : [];
                                if (Array.isArray(existingProjects)) {
                                    existingProjects.push(project);
                                    localStorage.setItem('musicCreatorProjects', JSON.stringify(existingProjects));
                                    restoredCount++;
                                }
                            } catch (err) {
                                localStorage.setItem('musicCreatorProjects', JSON.stringify([project]));
                                restoredCount++;
                            }
                        }
                    } catch (err) {
                        console.error('프로젝트 복구 오류:', project.id, err);
                        errorCount++;
                    }
                });
                
                let resultMessage = `✅ 복구 완료!\n\n`;
                resultMessage += `• 새로 복구된 프로젝트: ${restoredCount}개\n`;
                resultMessage += `• 업데이트된 프로젝트: ${updatedCount}개\n`;
                if (errorCount > 0) {
                    resultMessage += `• 오류 발생: ${errorCount}개\n`;
                }
                resultMessage += `\n페이지를 새로고침하여 프로젝트 목록을 확인하세요.`;
                
                alert(resultMessage);
                
                if (typeof window.loadProjectList === 'function') {
                    window.loadProjectList();
                }
            } catch (error) {
                console.error('백업 파일 복구 오류:', error);
                alert('백업 파일 복구 중 오류가 발생했습니다:\n\n' + error.message + '\n\n파일 형식을 확인해주세요.');
            }
        };
        
        reader.onerror = function() {
            alert('파일을 읽는 중 오류가 발생했습니다.');
        };
        
        reader.readAsText(file);
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
};
    
    // ═══════════════════════════════════════════════════════════════
// 단계 초기화 함수들
    // ═══════════════════════════════════════════════════════════════
window.resetCurrentStep = function() {
    if (!confirm('현재 단계의 모든 데이터를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
        return;
    }
    
    try {
        const activeStep = document.querySelector('.step.active');
        if (!activeStep) return;
        
        const stepNumber = activeStep.getAttribute('data-step');
        if (!stepNumber) return;
        
        const step = parseInt(stepNumber);
        
        // 단계별 필드 초기화
        switch(step) {
            case 1:
                // 가사 작성 단계 초기화
                document.getElementById('songTitle')?.value && (document.getElementById('songTitle').value = '');
                document.getElementById('genres')?.value && (document.getElementById('genres').value = '');
                document.getElementById('mood')?.value && (document.getElementById('mood').value = '');
                document.getElementById('theme')?.value && (document.getElementById('theme').value = '');
                document.getElementById('lyrics')?.value && (document.getElementById('lyrics').value = '');
                break;
            case 2:
                // 수노 변환 단계 초기화
                document.getElementById('sunoLyrics')?.value && (document.getElementById('sunoLyrics').value = '');
                document.getElementById('stylePrompt')?.value && (document.getElementById('stylePrompt').value = '');
                break;
            case 3:
                // AI 분석 단계 초기화
                const analysisResult = document.getElementById('analysisResult');
                if (analysisResult) {
                    analysisResult.style.display = 'none';
                    analysisResult.innerHTML = '';
                }
                break;
            case 4:
                // 개선안 단계 초기화
                document.getElementById('finalizedLyrics')?.value && (document.getElementById('finalizedLyrics').value = '');
                document.getElementById('finalizedStylePrompt')?.value && (document.getElementById('finalizedStylePrompt').value = '');
                break;
            case 5:
                // 최종 출력 단계 초기화
                document.getElementById('finalLyrics')?.textContent && (document.getElementById('finalLyrics').textContent = '');
                break;
            case 6:
                // 마케팅 단계 초기화
                document.getElementById('youtubeDescription')?.value && (document.getElementById('youtubeDescription').value = '');
                document.getElementById('instagramPost')?.value && (document.getElementById('instagramPost').value = '');
                document.getElementById('twitterPost')?.value && (document.getElementById('twitterPost').value = '');
                break;
        }
        
        // 프로젝트 저장 (빈 상태로)
        if (typeof window.saveCurrentProject === 'function') {
            window.saveCurrentProject();
        }
        
        alert('✅ 현재 단계가 초기화되었습니다.');
    } catch (error) {
        console.error('단계 초기화 오류:', error);
        alert('단계 초기화 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

window.resetAllSteps = function() {
    if (!confirm('모든 단계의 데이터를 초기화하시겠습니까?\n\n⚠️ 경고: 이 작업은 되돌릴 수 없으며 모든 데이터가 삭제됩니다.\n\n계속하시겠습니까?')) {
        return;
    }
    
    if (!confirm('정말로 모든 데이터를 초기화하시겠습니까?\n\n마지막 확인입니다.')) {
            return;
        }
        
    try {
        // 모든 입력 필드 초기화
        const allInputs = document.querySelectorAll('input, textarea, select');
        allInputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
        
        // 결과 영역 초기화
        const resultElements = ['analysisResult', 'finalLyrics', 'youtubeDescription', 'instagramPost', 'twitterPost'];
        resultElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = '';
                el.style.display = 'none';
            }
        });
        
        // 단계를 1단계로 이동
        if (typeof window.goToStep === 'function') {
            window.goToStep(1, false, true);
        }
        
        // 전역 프로젝트 상태 초기화
        window.currentProject = null;
        window.currentProjectId = null;
        window.currentScenes = null;
        
        // 수정 모드 비활성화
        window.editMode = false;
        updateEditModeUI();
        setReadOnlyMode(false); // 새 프로젝트는 수정 가능
        
        // 프로젝트 저장
        if (typeof window.saveCurrentProject === 'function') {
            window.saveCurrentProject();
        }
        
        alert('✅ 모든 단계가 초기화되었습니다.');
    } catch (error) {
        console.error('전체 초기화 오류:', error);
        alert('전체 초기화 중 오류가 발생했습니다:\n\n' + error.message);
    }
};
// [MOVED] extraction block

window.testAPIConnection = async function() {
    try {
        // API 설정 확인
        const openaiKey = localStorage.getItem('openai_api_key') || '';
        const geminiKey = localStorage.getItem('gemini_api_key') || '';
        
        if (!openaiKey && !geminiKey) {
            alert('⚠️ API 키가 설정되지 않았습니다.\n\n"API 키" 버튼을 클릭하여 API 키를 설정해주세요.');
            if (typeof window.openAPISettings === 'function') {
                window.openAPISettings();
            }
        return;
    }
    
        let results = [];
        let allSuccess = true;
        
        // OpenAI API 테스트
        if (openaiKey) {
            try {
                const response = await fetch('https://api.openai.com/v1/models', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${openaiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    results.push('✅ ChatGPT API: 연결 성공');
    } else {
                    results.push(`❌ ChatGPT API: 연결 실패 (${response.status})`);
                    allSuccess = false;
                }
            } catch (error) {
                results.push(`❌ ChatGPT API: 오류 발생 - ${error.message}`);
                allSuccess = false;
            }
        } else {
            results.push('⚠️ ChatGPT API: 키가 설정되지 않음');
        }
        
        // Gemini API 테스트
        if (geminiKey) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${geminiKey}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    results.push('✅ Gemini API: 연결 성공');
                } else {
                    results.push(`❌ Gemini API: 연결 실패 (${response.status})`);
                    allSuccess = false;
                }
            } catch (error) {
                results.push(`❌ Gemini API: 오류 발생 - ${error.message}`);
                allSuccess = false;
            }
        } else {
            results.push('⚠️ Gemini API: 키가 설정되지 않음');
        }
        
        // 결과 표시
        const message = `🔌 API 연결 테스트 결과\n\n${results.join('\n')}\n\n${allSuccess ? '✅ 모든 API가 정상적으로 연결되었습니다.' : '⚠️ 일부 API 연결에 문제가 있습니다.'}`;
        alert(message);
    } catch (error) {
        console.error('API 테스트 오류:', error);
        alert('API 테스트 중 오류가 발생했습니다:\n\n' + error.message);
    }
};
    
    // ═══════════════════════════════════════════════════════════════
// API 설정 모달 함수들
    // ═══════════════════════════════════════════════════════════════
window.openAPISettings = function() {
    try {
        console.log('🔑 openAPISettings 함수 호출됨');
        const modal = document.getElementById('apiSettingsModal');
        if (!modal) {
            console.error('❌ apiSettingsModal 요소를 찾을 수 없습니다.');
            alert('API 설정 모달을 찾을 수 없습니다.');
        return;
    }
    
        console.log('✅ apiSettingsModal 요소 발견:', modal);
        
        // 저장된 API 키 로드
        const openaiKey = localStorage.getItem('openai_api_key') || '';
        const geminiKey = localStorage.getItem('gemini_api_key') || '';
        
        const openaiInput = document.getElementById('openaiKeyInput');
        const geminiInput = document.getElementById('geminiKeyInput');
        
        if (openaiInput) {
            openaiInput.value = openaiKey;
            if (openaiKey && typeof window.validateOpenAIKey === 'function') {
                window.validateOpenAIKey(openaiInput);
            }
        }
        if (geminiInput) {
            geminiInput.value = geminiKey;
            if (geminiKey && typeof window.validateGeminiKey === 'function') {
                window.validateGeminiKey(geminiInput);
            }
        }
        
        // 모달 강제 표시 (CSS !important 우회)
        modal.classList.add('show');
        modal.classList.remove('hidden');
        
        // 인라인 스타일로 강제 표시 (항상 최상단, 불투명 배경으로 뒤 화면 비침 방지)
        modal.setAttribute('style', 'display: flex !important; visibility: visible !important; opacity: 1 !important; z-index: 2147483647 !important; pointer-events: auto !important; position: fixed !important; inset: 0 !important; align-items: center !important; justify-content: center !important; background: rgba(0,0,0,0.82) !important;');
        var innerModal = modal.querySelector('.modal');
        if (innerModal) {
            var bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#ffffff';
            if (document.body.classList.contains('theme-dark')) bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#0f3460';
            innerModal.style.setProperty('background', bg, 'important');
        }
        // body 스크롤 방지
        document.body.style.overflow = 'hidden';
        
        console.log('✅ API 설정 모달 표시 완료');
        console.log('모달 클래스:', modal.className);
        console.log('모달 computed style:', window.getComputedStyle(modal).display);
    } catch (error) {
        console.error('❌ API 설정 모달 열기 오류:', error);
        alert('API 설정 모달을 열 수 없습니다:\n\n' + error.message);
    }
};

window.closeAPISettings = function() {
    try {
        const modal = document.getElementById('apiSettingsModal');
        if (modal) {
            modal.classList.remove('show');
            modal.setAttribute('style', 'display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important;');
            document.body.style.overflow = '';
            console.log('✅ API 설정 모달 닫기 완료');
        }
    } catch (error) {
        console.error('❌ API 설정 모달 닫기 오류:', error);
    }
};

// API 키 저장 함수 (모달 내부 버튼에서 호출)
window.saveAPISettings = function() {
    window.saveAPIKeys();
};

window.saveAPIKeys = function() {
    try {
        // index.html에서 사용하는 ID 확인
        const openaiInput = document.getElementById('openaiKeyInput');
        const geminiInput = document.getElementById('geminiKeyInput');
        
        if (!openaiInput && !geminiInput) {
            alert('API 키 입력 필드를 찾을 수 없습니다.');
        return;
    }
    
        const openaiKey = openaiInput ? openaiInput.value.trim() : '';
        const geminiKey = geminiInput ? geminiInput.value.trim() : '';
        
        // API 키 저장
        if (openaiKey) {
            localStorage.setItem('openai_api_key', openaiKey);
        } else {
            localStorage.removeItem('openai_api_key');
        }
        
        if (geminiKey) {
            localStorage.setItem('gemini_api_key', geminiKey);
        } else {
            localStorage.removeItem('gemini_api_key');
        }
        
        // API_CONFIG 업데이트 (전역 객체가 있는 경우)
        if (typeof API_CONFIG !== 'undefined') {
            if (API_CONFIG.openai) {
                API_CONFIG.openai.key = openaiKey;
            }
            if (API_CONFIG.gemini) {
                API_CONFIG.gemini.key = geminiKey;
            }
        }
        
        alert('✅ API 키가 저장되었습니다.');
        window.closeAPISettings();
    } catch (error) {
        console.error('API 키 저장 오류:', error);
        alert('API 키 저장 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

window.resetAPIKeys = function() {
    if (!confirm('API 키를 초기화하시겠습니까?\n\n저장된 모든 API 키가 삭제됩니다.')) {
        return;
    }
    
    try {
        const openaiInput = document.getElementById('openaiKeyInput');
        const geminiInput = document.getElementById('geminiKeyInput');
        
        if (openaiInput) {
            openaiInput.value = '';
        }
        if (geminiInput) {
            geminiInput.value = '';
        }
        
        localStorage.removeItem('openai_api_key');
        localStorage.removeItem('gemini_api_key');
        
        // API_CONFIG 업데이트
        if (typeof API_CONFIG !== 'undefined') {
            if (API_CONFIG.openai) {
                API_CONFIG.openai.key = '';
            }
            if (API_CONFIG.gemini) {
                API_CONFIG.gemini.key = '';
            }
        }
        
        alert('✅ API 키가 초기화되었습니다.');
    } catch (error) {
        console.error('API 키 초기화 오류:', error);
        alert('API 키 초기화 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

window.validateGeminiKey = function(input) {
    const value = input.value.trim();
    const errorDiv = document.getElementById('geminiKeyError');
    const successDiv = document.getElementById('geminiKeySuccess');
    
    if (!errorDiv || !successDiv) return;
    
    if (!value) {
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';
        return;
    }
    
    // Gemini API 키 형식 검증 (AIzaSy로 시작)
    if (value.startsWith('AIzaSy') && value.length > 30) {
        errorDiv.style.display = 'none';
        successDiv.style.display = 'block';
        } else {
        errorDiv.style.display = 'block';
        successDiv.style.display = 'none';
        errorDiv.textContent = '⚠️ 올바른 형식의 Gemini API 키가 아닙니다. (AIzaSy... 형식)';
    }
};

window.validateOpenAIKey = function(input) {
    const value = input.value.trim();
    const errorDiv = document.getElementById('openaiKeyError');
    const successDiv = document.getElementById('openaiKeySuccess');
    
    if (!errorDiv || !successDiv) return;
    
    if (!value) {
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';
        return;
    }
    
    // OpenAI API 키 형식 검증 (sk-로 시작)
    if (value.startsWith('sk-') && value.length > 40) {
        errorDiv.style.display = 'none';
        successDiv.style.display = 'block';
        } else {
        errorDiv.style.display = 'block';
        successDiv.style.display = 'none';
        errorDiv.textContent = '⚠️ 올바른 형식의 OpenAI API 키가 아닙니다. (sk-... 형식)';
    }
};

// ═══════════════════════════════════════════════════════════════
// 지침서 모달 함수들
// ═══════════════════════════════════════════════════════════════
window.openGuidelinesModal = function() {
    try {
        console.log('📋 openGuidelinesModal 함수 호출됨');
        const modal = document.getElementById('guidelinesModal');
        if (!modal) {
            console.error('❌ guidelinesModal 요소를 찾을 수 없습니다.');
            alert('지침서 모달을 찾을 수 없습니다.');
        return;
    }
    
        console.log('✅ guidelinesModal 요소 발견:', modal);
        
        // 저장된 지침서 로드 (저장된 값 우선, 없을 때만 기본값)
        const guidelinesText = document.getElementById('guidelinesText');
        if (guidelinesText) {
            const savedGuidelines = (localStorage.getItem('musicCreatorGuidelines') || localStorage.getItem('musicCreator_guidelines') || '').trim();
            if (savedGuidelines.length > 0) {
                guidelinesText.value = savedGuidelines;
            } else {
                const defaultGuidelines = `# 뮤직모리 제작 지침서

## 기본 원칙
- 감정을 진솔하게 표현
- 리듬감 있는 가사 구성
- 일상적이면서도 특별한 순간을 담기

## 구조
- Verse (주제 전개)
- Chorus (메시지 강조)
- Bridge (감정 고조)

## 어조
- 자연스럽고 친근한 언어
- 비유와 은유 활용
- 듣는 이의 감정을 자극하는 표현`;
                guidelinesText.value = defaultGuidelines;
            }
        }
        
        // 모달 강제 표시 (CSS !important 우회)
        modal.classList.add('show');
        modal.classList.remove('hidden');
        
        // 인라인 스타일로 강제 표시 (CSS !important 우회를 위해 setAttribute 사용)
        modal.setAttribute('style', 'display: flex !important; visibility: visible !important; opacity: 1 !important; z-index: 10000 !important; pointer-events: auto !important;');
        
        // body 스크롤 방지
        document.body.style.overflow = 'hidden';
        
        console.log('✅ 지침서 모달 표시 완료');
        console.log('모달 클래스:', modal.className);
        console.log('모달 computed style:', window.getComputedStyle(modal).display);
    } catch (error) {
        console.error('❌ 지침서 모달 열기 오류:', error);
        alert('지침서 모달을 열 수 없습니다:\n\n' + error.message);
    }
};

window.closeGuidelinesModal = function() {
    try {
        const modal = document.getElementById('guidelinesModal');
        if (modal) {
            modal.classList.remove('show');
            modal.setAttribute('style', 'display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important;');
            document.body.style.overflow = '';
            console.log('✅ 지침서 모달 닫기 완료');
            }
        } catch (error) {
        console.error('❌ 지침서 모달 닫기 오류:', error);
    }
};

window.saveGuidelines = function() {
    try {
        const guidelinesText = document.getElementById('guidelinesText');
        if (!guidelinesText) {
            alert('지침서 입력 필드를 찾을 수 없습니다.');
        return;
    }
    
        const guidelines = guidelinesText.value.trim();
        localStorage.setItem('musicCreatorGuidelines', guidelines);
        
        alert('✅ 지침서가 저장되었습니다.');
        } catch (error) {
        console.error('지침서 저장 오류:', error);
        alert('지침서 저장 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

window.resetGuidelines = function() {
    if (!confirm('지침서를 기본값으로 복원하시겠습니까?\n\n현재 작성 중인 내용이 삭제됩니다.')) {
        return;
    }
    
    try {
        const guidelinesText = document.getElementById('guidelinesText');
        if (guidelinesText) {
            // 기본 지침서 내용
            const defaultGuidelines = `# 뮤직모리 제작 지침서

## 기본 원칙
- 감정을 진솔하게 표현
- 리듬감 있는 가사 구성
- 일상적이면서도 특별한 순간을 담기

## 구조
- Verse (주제 전개)
- Chorus (메시지 강조)
- Bridge (감정 고조)

## 어조
- 자연스럽고 친근한 언어
- 비유와 은유 활용
- 듣는 이의 감정을 자극하는 표현`;
            
            guidelinesText.value = defaultGuidelines;
        }
    } catch (error) {
        console.error('지침서 초기화 오류:', error);
        alert('지침서 초기화 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

// ═══════════════════════════════════════════════════════════════
// 드래그 앤 드롭으로 단계 순서 변경 기능
// ═══════════════════════════════════════════════════════════════
// 전역 변수로 드래그 중인 step 추적
let draggedStepElement = null;

window.initStepDragAndDrop = function() {
    const progressSteps = document.querySelector('.progress-steps') || document.getElementById('progressSteps');
    if (!progressSteps) {
        console.warn('progress-steps 요소를 찾을 수 없습니다.');
        return;
    }
    
    const steps = Array.from(progressSteps.querySelectorAll('.step'));
    if (steps.length === 0) {
        console.warn('step 요소를 찾을 수 없습니다.');
        return;
    }
    
    // 저장된 순서 로드
    const savedOrder = localStorage.getItem('stepOrder');
    if (savedOrder) {
        try {
            const order = JSON.parse(savedOrder);
            if (Array.isArray(order) && order.length === steps.length) {
                // 순서대로 재배치
                const stepMap = new Map();
                steps.forEach(step => {
                    const stepNum = parseInt(step.getAttribute('data-step'));
                    stepMap.set(stepNum, step);
                });
                
                // progress-steps 비우기
                while (progressSteps.firstChild) {
                    progressSteps.removeChild(progressSteps.firstChild);
                }
                
                // 저장된 순서대로 다시 추가
                order.forEach(stepNum => {
                    const stepEl = stepMap.get(stepNum);
                    if (stepEl) {
                        progressSteps.appendChild(stepEl);
                    }
                });
                
                // steps 배열 업데이트
                const updatedSteps = Array.from(progressSteps.querySelectorAll('.step'));
                updatedSteps.forEach(step => {
                    // 기존 이벤트 리스너 제거 (중복 방지)
                    const newDragHandle = step.querySelector('.step-drag-handle');
                    if (newDragHandle) {
                        const newHandle = newDragHandle.cloneNode(true);
                        newDragHandle.parentNode.replaceChild(newHandle, newDragHandle);
                    }
                });
                
                console.log('✅ 저장된 단계 순서 복원:', order);
            }
        } catch (e) {
            console.warn('단계 순서 로드 실패:', e);
        }
    }
    
    // 현재 steps 가져오기 (순서 복원 후)
    const currentSteps = Array.from(progressSteps.querySelectorAll('.step'));
    
    // 드래그 이벤트 설정
    currentSteps.forEach(step => {
        const dragHandle = step.querySelector('.step-drag-handle');
        if (!dragHandle) return;
        
        // 드래그 핸들에서 드래그 시작
        dragHandle.addEventListener('dragstart', function(e) {
            e.stopPropagation();
            draggedStepElement = step;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', step.getAttribute('data-step'));
            e.dataTransfer.setData('application/json', JSON.stringify({ step: step.getAttribute('data-step') }));
            step.classList.add('dragging');
            
            // 드래그 이미지 생성
            const dragImage = step.cloneNode(true);
            dragImage.style.opacity = '0.8';
            dragImage.style.transform = 'rotate(2deg)';
            dragImage.style.width = step.offsetWidth + 'px';
            dragImage.style.backgroundColor = 'var(--bg-card)';
            dragImage.style.border = '2px solid var(--accent)';
            document.body.appendChild(dragImage);
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
            setTimeout(() => {
                if (dragImage.parentNode) {
                    document.body.removeChild(dragImage);
                }
            }, 0);
        });
        
        // 드래그 종료
        dragHandle.addEventListener('dragend', function(e) {
            if (draggedStepElement) {
                draggedStepElement.classList.remove('dragging');
            }
            
            // 모든 드롭존 하이라이트 제거
            currentSteps.forEach(s => {
                s.classList.remove('drag-over');
            });
            
            draggedStepElement = null;
        });
        
        // 다른 step 위에 드래그할 때
        step.addEventListener('dragover', function(e) {
            if (!draggedStepElement || draggedStepElement === step) return;
            
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            
            // 삽입 위치 결정 (마우스 위치 기준)
            const rect = step.getBoundingClientRect();
            const mouseY = e.clientY;
            const stepCenter = rect.top + rect.height / 2;
            
            // 드롭존 하이라이트
            step.classList.add('drag-over');
        });
        
        // 드래그 떠날 때
        step.addEventListener('dragleave', function(e) {
            // relatedTarget이 step 내부에 있지 않으면 하이라이트 제거
            const relatedTarget = e.relatedTarget;
            if (!relatedTarget || !step.contains(relatedTarget)) {
                step.classList.remove('drag-over');
            }
        });
        
        // 드롭
        step.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (!draggedStepElement || draggedStepElement === step) {
                step.classList.remove('drag-over');
                return;
            }
            
            // 삽입 위치 결정
            const rect = step.getBoundingClientRect();
            const mouseY = e.clientY;
            const stepCenter = rect.top + rect.height / 2;
            const insertBefore = mouseY < stepCenter;
            
            // 요소 이동
            if (insertBefore) {
                progressSteps.insertBefore(draggedStepElement, step);
            } else {
                if (step.nextSibling) {
                    progressSteps.insertBefore(draggedStepElement, step.nextSibling);
                } else {
                    progressSteps.appendChild(draggedStepElement);
                }
            }
            
            step.classList.remove('drag-over');
            draggedStepElement.classList.remove('dragging');
            
            // 순서 저장
            const newOrder = Array.from(progressSteps.querySelectorAll('.step')).map(s => 
                parseInt(s.getAttribute('data-step'))
            );
            localStorage.setItem('stepOrder', JSON.stringify(newOrder));
            
            console.log('✅ 단계 순서 변경 및 저장 완료:', newOrder);
            
            // 사용자 피드백
            if (typeof window.showCopyIndicator === 'function') {
                window.showCopyIndicator('✅ 단계 순서가 저장되었습니다!');
            }
            
            // 드래그 앤 드롭 다시 초기화 (이벤트 리스너 재설정)
                setTimeout(() => {
                window.initStepDragAndDrop();
                }, 100);
            
            draggedStepElement = null;
        });
    });
    
    // progress-steps 전체 드롭 영역 허용
    progressSteps.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    
    progressSteps.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
};

// 단계 순서 초기화
window.resetStepOrder = function() {
    if (!confirm('단계 순서를 기본값(1-6)으로 초기화하시겠습니까?')) {
        return;
    }
    
    localStorage.removeItem('stepOrder');
    
    const progressSteps = document.querySelector('.progress-steps') || document.getElementById('progressSteps');
    if (progressSteps) {
        const steps = Array.from(progressSteps.querySelectorAll('.step'));
        const defaultOrder = [1, 2, 3, 4, 5, 6];
        
        const stepMap = new Map();
        steps.forEach(step => {
            const stepNum = parseInt(step.getAttribute('data-step'));
            stepMap.set(stepNum, step);
        });
        
        // progress-steps 비우기
        while (progressSteps.firstChild) {
            progressSteps.removeChild(progressSteps.firstChild);
        }
        
        // 기본 순서대로 다시 추가
        defaultOrder.forEach(stepNum => {
            const stepEl = stepMap.get(stepNum);
            if (stepEl) {
                progressSteps.appendChild(stepEl);
            }
        });
    }
    
    // 드래그 앤 드롭 다시 초기화
    if (typeof window.initStepDragAndDrop === 'function') {
        window.initStepDragAndDrop();
    }
    
    alert('✅ 단계 순서가 기본값으로 초기화되었습니다.');
};

// 페이지 로드 시 드래그 앤 드롭 초기화 및 수정 모드 초기화
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                if (typeof window.initStepDragAndDrop === 'function') {
                    window.initStepDragAndDrop();
                }
                
                // 초기 수정 모드 설정 (프로젝트가 없으면 수정 가능, 있으면 읽기 전용)
                window.editMode = false;
                if (typeof window.updateEditModeUI === 'function') {
                    window.updateEditModeUI();
                }
                if (typeof window.setReadOnlyMode === 'function') {
                    // 프로젝트가 로드되지 않았으면 수정 가능, 로드되었으면 읽기 전용
                    window.setReadOnlyMode(window.currentProject !== null);
                }
            }, 500);
        });
    } else {
        setTimeout(() => {
            if (typeof window.initStepDragAndDrop === 'function') {
                window.initStepDragAndDrop();
            }
        }, 500);
    }
}
// [MOVED] extraction block

// SRT 자막 내용 복사
window.copySRTContent = function(event) {
    try {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        
        if (!window.currentSRTContent) {
            alert('⚠️ 복사할 SRT 자막이 없습니다.\n\n먼저 "SRT 자막 생성" 버튼을 클릭하여 자막을 생성해주세요.');
            return;
        }
        
        navigator.clipboard.writeText(window.currentSRTContent).then(() => {
            if (typeof window.showCopyIndicator === 'function') {
                window.showCopyIndicator('✅ SRT 자막이 클립보드에 복사되었습니다!');
            } else {
                alert('✅ SRT 자막이 클립보드에 복사되었습니다!');
            }
        }).catch(() => {
            // 폴백
            const textarea = document.createElement('textarea');
            textarea.value = window.currentSRTContent;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            if (typeof window.showCopyIndicator === 'function') {
                window.showCopyIndicator('✅ SRT 자막이 클립보드에 복사되었습니다!');
            } else {
                alert('✅ SRT 자막이 클립보드에 복사되었습니다!');
            }
        });
    } catch (error) {
        console.error('❌ SRT 자막 복사 오류:', error);
        alert('SRT 자막 복사 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

// SRT 파일 다운로드
window.downloadSRT = function(platform) {
    try {
        if (!window.currentSRTContent) {
            alert('⚠️ 다운로드할 SRT 자막이 없습니다.\n\n먼저 "SRT 자막 생성" 버튼을 클릭하여 자막을 생성해주세요.');
            return;
        }
        
        // 제목 가져오기
        const titleEl = document.getElementById('finalTitleText') || 
                       document.getElementById('songTitle') || 
                       document.getElementById('sunoTitle');
        const title = titleEl?.textContent || titleEl?.value || '자막';
        
        // 파일명 생성 (특수문자 제거)
        const safeTitle = title.replace(/[^a-zA-Z0-9가-힣\s]/g, '').trim().replace(/\s+/g, '_') || 'subtitle';
        const filename = `${safeTitle}.srt`;
        
        // 플랫폼에 따라 줄바꿈 문자 결정
        const lineEnding = platform === 'win' ? '\r\n' : '\n';
        
        // 줄바꿈 문자 변환
        let srtContent = window.currentSRTContent;
        if (platform === 'win') {
            srtContent = srtContent.replace(/\n/g, '\r\n');
        }
        
        // Blob 생성 및 다운로드
        const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        const platformName = platform === 'win' ? '윈도우용' : '맥용';
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(`✅ ${platformName} SRT 파일이 다운로드되었습니다!\n\n파일명: ${filename}`);
        } else {
            alert(`✅ ${platformName} SRT 파일이 다운로드되었습니다!\n\n파일명: ${filename}`);
        }
        
        console.log('✅ SRT 파일 다운로드 완료:', filename);
    } catch (error) {
        console.error('❌ SRT 파일 다운로드 오류:', error);
        alert('SRT 파일 다운로드 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

// ═══════════════════════════════════════════════════════════════
// localStorage 용량 관리 함수
// ═══════════════════════════════════════════════════════════════

// 오래된 프로젝트 정리 (용량 초과 시)
window.cleanOldProjects = function(key, projects, currentProjectId) {
    try {
        if (!Array.isArray(projects) || projects.length === 0) {
            return projects;
        }
        
        // 현재 프로젝트는 제외하고 정렬
        const otherProjects = projects.filter(p => p && p.id !== currentProjectId);
        const currentProject = projects.find(p => p && p.id === currentProjectId);
        
        // 수정일시 기준으로 정렬 (오래된 것부터)
        otherProjects.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.savedAt || a.createdAt || 0);
            const dateB = new Date(b.updatedAt || b.savedAt || b.createdAt || 0);
            return dateA - dateB;
        });
        
        // 최신 20개만 유지 (현재 프로젝트 제외)
        const keepCount = 20;
        const keptProjects = otherProjects.slice(-keepCount);
        
        // 현재 프로젝트 추가
        if (currentProject) {
            keptProjects.push(currentProject);
        }
        
        const removedCount = projects.length - keptProjects.length;
        if (removedCount > 0) {
            console.log(`🗑️ ${key}: 오래된 프로젝트 ${removedCount}개 삭제 (최신 ${keepCount}개 유지)`);
        }
        
        return keptProjects;
    } catch (error) {
        console.error('❌ 오래된 프로젝트 정리 오류:', error);
        return projects;
    }
};

// localStorage 용량 체크 및 정리
window.checkAndCleanStorage = function() {
    try {
        let totalSize = 0;
        const keySizes = {};
        
        // 모든 키의 크기 계산
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                const size = new Blob([value]).size;
                keySizes[key] = size;
                totalSize += size;
            }
        }
        
        // 용량이 4MB 이상이면 경고 (5MB 제한 대비)
        const maxSize = 4 * 1024 * 1024; // 4MB
        if (totalSize > maxSize) {
            console.warn(`⚠️ localStorage 용량 경고: ${(totalSize / 1024 / 1024).toFixed(2)}MB 사용 중`);
            
            // 가장 큰 키부터 정리 대상 확인
            const sortedKeys = Object.keys(keySizes).sort((a, b) => keySizes[b] - keySizes[a]);
            
            for (const key of sortedKeys) {
                if (key.includes('Project') || key.includes('History')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key) || '[]');
                        if (Array.isArray(data) && data.length > 30) {
                            // 오래된 항목 정리 (최신 30개만 유지)
                            const cleaned = data
                                .filter(p => p && (p.updatedAt || p.savedAt || p.createdAt))
                                .sort((a, b) => {
                                    const dateA = new Date(a.updatedAt || a.savedAt || a.createdAt || 0);
                                    const dateB = new Date(b.updatedAt || b.savedAt || b.createdAt || 0);
                                    return dateB - dateA; // 최신순
                                })
                                .slice(0, 30);
                            
                            localStorage.setItem(key, JSON.stringify(cleaned));
                            console.log(`✅ ${key} 정리 완료: ${data.length}개 → ${cleaned.length}개`);
                        }
                    } catch (e) {
                        console.warn(`⚠️ ${key} 정리 실패:`, e);
                    }
                }
            }
        }
        
        return {
            totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            keySizes
        };
    } catch (error) {
        console.error('❌ localStorage 용량 체크 오류:', error);
        return null;
    }
};

// ═══════════════════════════════════════════════════════════════
// 다크/라이트 테마 전환
// ═══════════════════════════════════════════════════════════════
window.toggleTheme = function() {
    try {
        var body = document.body;
        var isDark = body.classList.contains('theme-dark');
        body.classList.toggle('theme-dark', !isDark);
        var next = isDark ? 'light' : 'dark';
        try {
            localStorage.setItem('musicCreatorTheme', next);
        } catch (e) {}
        var icon = document.getElementById('themeToggleIcon');
        var text = document.getElementById('themeToggleText');
        if (icon) {
            icon.className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
        if (text) {
            text.textContent = next === 'dark' ? '다크' : '라이트';
        }
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator(next === 'dark' ? '🌙 다크 모드' : '☀️ 라이트 모드');
        }
    } catch (e) {}
};

// 페이지 로드 시 저장된 테마 적용 (버튼 라벨 = 다음 모드)
function applySavedTheme() {
    try {
        var theme = localStorage.getItem('musicCreatorTheme');
        if (theme === 'dark') {
            document.body.classList.add('theme-dark');
            var icon = document.getElementById('themeToggleIcon');
            var text = document.getElementById('themeToggleText');
            if (icon) icon.className = 'fas fa-sun';
            if (text) text.textContent = '라이트';
        } else if (theme === 'light') {
            document.body.classList.remove('theme-dark');
            var icon = document.getElementById('themeToggleIcon');
            var text = document.getElementById('themeToggleText');
            if (icon) icon.className = 'fas fa-moon';
            if (text) text.textContent = '다크';
        }
    } catch (e) {}
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySavedTheme);
} else {
    applySavedTheme();
}

// ═══════════════════════════════════════════════════════════════
// 스타일 프리셋 (1단계 수노 스타일 프롬프트)
// ═══════════════════════════════════════════════════════════════
window.applyStylePreset = function(preset) {
    var el = document.getElementById('manualStylePrompt');
    if (!el) return;
    var presets = {
        ballad: 'K-Pop Ballad, emotional, 72 BPM, soft and warm vocals, piano and strings, intimate atmosphere, studio quality, gentle reverb, cinematic, heartfelt, melancholic undertones',
        poprock: 'Pop Rock, energetic, 128 BPM, powerful vocals, electric guitar and drums, stadium atmosphere, dynamic, punchy, anthemic',
        rnb: 'R&B, smooth, 90 BPM, soulful vocals, bass and keys, urban atmosphere, modern, groovy, sensual',
        kpop: 'K-Pop, catchy, 120 BPM, clear vocals, synth and percussion, bright atmosphere, dynamic, polished, trendy',
        acoustic: 'Acoustic, organic, 80 BPM, natural vocals, guitar and piano, warm atmosphere, intimate, stripped-down, heartfelt'
    };
    var text = presets[preset] || presets.ballad;
    el.value = text;
    if (typeof window.showCopyIndicator === 'function') {
        window.showCopyIndicator('✅ 스타일 프리셋 적용됨');
    }
};

// ═══════════════════════════════════════════════════════════════
// 사용자 편의: 키보드 단축키 (Ctrl+S 저장, Ctrl+1~6 단계 이동, Esc 모달/사이드바 닫기)
// ═══════════════════════════════════════════════════════════════
document.addEventListener('keydown', function(e) {
    // Ctrl+1~6: 단계 이동 (Mac: Cmd+1~6)
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const step = parseInt(e.key, 10);
        if (typeof window.goToStep === 'function') {
            window.goToStep(step, false, true);
        }
        return;
    }
    // Ctrl+S: 저장 (Mac: Cmd+S)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (typeof window.saveCurrentProject === 'function') {
            const saved = window.saveCurrentProject();
            if (typeof window.showCopyIndicator === 'function') {
                window.showCopyIndicator(saved ? '✅ 저장되었습니다' : '❌ 저장에 실패했습니다');
            }
        }
        return;
    }
    // Esc: 모달/사이드바 닫기
    if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            if (typeof window.toggleSidebar === 'function') {
                window.toggleSidebar();
            }
        }
        document.querySelectorAll('.modal-overlay, [role="dialog"]').forEach(function(modal) {
            if (modal && modal.style.display !== 'none') {
                modal.style.display = 'none';
                modal.style.pointerEvents = 'none';
            }
        });
        ['guidelinesModal', 'projectReferenceModal', 'apiSettingsModal'].forEach(function(id) {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                el.classList.remove('show');
            }
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// Suno용 한 번에 복사 (가사 + 스타일)
// ═══════════════════════════════════════════════════════════════
window.copySunoLyricsAndStyle = function() {
    const lyricsEl = document.getElementById('finalLyrics');
    const styleEl = document.getElementById('finalStyle');
    const lyrics = (lyricsEl && lyricsEl.textContent) ? lyricsEl.textContent.trim() : '';
    const style = (styleEl && styleEl.textContent) ? styleEl.textContent.trim() : '';
    if (!lyrics && !style) {
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator('❌ 복사할 가사/스타일이 없습니다');
        } else {
            alert('복사할 가사 또는 스타일이 없습니다.');
        }
        return;
    }
    const text = '【가사】\n' + lyrics + '\n\n【스타일】\n' + style;
    try {
        navigator.clipboard.writeText(text).then(function() {
            if (typeof window.showCopyIndicator === 'function') {
                window.showCopyIndicator('✅ Suno용 가사+스타일이 클립보드에 복사되었습니다');
            }
        });
    } catch (err) {
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator('❌ 복사 실패');
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// 프로젝트 복제
// ═══════════════════════════════════════════════════════════════
window.duplicateProject = function(projectId) {
    if (typeof window.loadProject !== 'function') return;
    try {
        var foundProject = null;
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (!key) continue;
            try {
                var data = localStorage.getItem(key);
                if (!data || !data.trim()) continue;
                if (data.trim().startsWith('[')) {
                    var parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) {
                        foundProject = parsed.find(function(p) { return p && p.id === projectId; });
                        if (foundProject) break;
                    }
                } else if (data.trim().startsWith('{')) {
                    var p = JSON.parse(data);
                    if (p && p.id === projectId) {
                        foundProject = p;
                        break;
                    }
                }
            } catch (e) {}
        }
        if (!foundProject) {
            if (typeof window.showCopyIndicator === 'function') {
                window.showCopyIndicator('❌ 프로젝트를 찾을 수 없습니다');
            }
            return;
        }
        var copy = JSON.parse(JSON.stringify(foundProject));
        copy.id = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        copy.title = (foundProject.title || '제목 없음') + ' (복사본)';
        copy.savedAt = new Date().toISOString();
        copy.createdAt = new Date().toISOString();
        copy.updatedAt = copy.savedAt;
        window.currentProjectId = null;
        window.currentProject = null;
        var keys = ['musicCreatorProjects', 'savedProjects'];
        for (var k = 0; k < keys.length; k++) {
            try {
                var raw = localStorage.getItem(keys[k]);
                var arr = raw ? JSON.parse(raw) : [];
                if (!Array.isArray(arr)) arr = [];
                arr.push(copy);
                localStorage.setItem(keys[k], JSON.stringify(arr));
            } catch (e) {}
        }
        if (typeof window.loadProjectList === 'function') {
            window.loadProjectList(true);
        }
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator('✅ 프로젝트가 복제되었습니다');
        }
    } catch (err) {
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator('❌ 복제 실패');
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// 단계별 진행률 표시
// ═══════════════════════════════════════════════════════════════
window.updateStepProgress = function() {
    try {
        var steps = document.querySelectorAll('.step[data-step]');
        if (!steps.length) return;
        var checks = {
            1: function() {
                var t = document.getElementById('songTitle');
                var l = document.getElementById('originalLyrics');
                return (t && t.value.trim()) || (l && l.value.trim());
            },
            2: function() {
                var l = document.getElementById('sunoLyrics');
                return l && l.value.trim();
            },
            3: function() {
                var r = document.getElementById('analysisResult');
                return r && r.style.display !== 'none' && r.textContent.trim();
            },
            4: function() {
                var l = document.getElementById('finalizedLyrics');
                if (l && l.value.trim()) return true;
                var d = window.currentProject && (window.currentProject.data || window.currentProject);
                return !!(d && (d.finalizedLyrics || d.finalLyrics));
            },
            5: function() {
                var l = document.getElementById('finalLyrics');
                if (l && l.textContent.trim()) return true;
                var d = window.currentProject && (window.currentProject.data || window.currentProject);
                return !!(d && (d.finalLyrics || d.finalizedLyrics));
            },
            6: function() {
                var y = document.getElementById('youtubeDesc');
                return y && y.textContent.trim();
            }
        };
        steps.forEach(function(stepEl) {
            var step = parseInt(stepEl.getAttribute('data-step'), 10);
            var fn = checks[step];
            if (fn && fn()) {
                stepEl.classList.add('step-complete');
            } else {
                stepEl.classList.remove('step-complete');
            }
        });
    } catch (e) {}
};

console.log('✅ app.js 로드 완료 - 모든 핵심 함수 등록됨');
