// js/step1.js - Extracted Logic

// --- Extracted insertDirectiveToLyrics ---
window.insertDirectiveToLyrics = function(directive) {
    try {
        const editedLyrics = document.getElementById('editedLyrics');
        if (!editedLyrics) {
            // editedLyrics가 없으면 originalLyrics에 삽입
            const originalLyrics = document.getElementById('originalLyrics');
            if (originalLyrics) {
                const cursorPos = originalLyrics.selectionStart || originalLyrics.value.length;
                const textBefore = originalLyrics.value.substring(0, cursorPos);
                const textAfter = originalLyrics.value.substring(cursorPos);
                originalLyrics.value = textBefore + directive + '\n' + textAfter;
                originalLyrics.focus();
                originalLyrics.setSelectionRange(cursorPos + directive.length + 1, cursorPos + directive.length + 1);
            }
        } else {
            const cursorPos = editedLyrics.selectionStart || editedLyrics.value.length;
            const textBefore = editedLyrics.value.substring(0, cursorPos);
            const textAfter = editedLyrics.value.substring(cursorPos);
            editedLyrics.value = textBefore + directive + '\n' + textAfter;
            editedLyrics.focus();
            editedLyrics.setSelectionRange(cursorPos + directive.length + 1, cursorPos + directive.length + 1);
        }
    } catch (error) {
        console.error('❌ 지시어 삽입 오류:', error);
    }
};


// --- Extracted getSelectedTags ---
function getSelectedTags(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    
    const activeTags = container.querySelectorAll('.tag-btn.active');
    const tags = [];
    
    activeTags.forEach(tag => {
        const text = tag.dataset.value || tag.textContent.trim();
        if (text && text !== '+' && text !== '+ 직접 입력' && !text.includes('기타(추가)')) {
            tags.push(text);
        }
    });
    
    return tags;
}

window.getSelectedTags = getSelectedTags;

// --- Extracted generateAILyrics ---
window.generateAILyrics = async function() {
    try {
        // 선택된 태그들 수집
        const selectedTags = {
            era: [],
            theme: [],
            perspective: [],
            time: [],
            special: [],
            region: [],
            genre: [],
            mood: []
        };
        
        // 각 태그 컨테이너에서 선택된 태그 수집
        const tagContainers = {
            era: document.getElementById('eraTags'),
            theme: document.getElementById('themeTags'),
            perspective: document.getElementById('perspectiveTags'),
            time: document.getElementById('timeTags'),
            special: document.getElementById('specialTags'),
            region: document.getElementById('regionTags'),
            genre: document.getElementById('genreTags'),
            mood: document.getElementById('moodTags')
        };
        
        Object.keys(tagContainers).forEach(key => {
            const container = tagContainers[key];
            if (container) {
                const activeTags = container.querySelectorAll('.tag-btn.active');
                activeTags.forEach(btn => {
                    const value = btn.getAttribute('data-value');
                    if (value && !btn.classList.contains('custom-tag-btn')) {
                        selectedTags[key].push(value);
                    }
                });
            }
        });
        
        // 추가 키워드
        const additionalKeywords = document.getElementById('additionalKeywords')?.value || '';
        
        // 가사 길이
        const lengthBtn = document.querySelector('.length-btn.active');
        const lyricsLength = lengthBtn ? lengthBtn.getAttribute('data-value') : '';
        
        // 참고 가사
        const referenceLyrics = document.getElementById('referenceLyrics')?.value || '';
        const referenceSongTitle = document.getElementById('referenceSongTitle')?.value || '';
        const referenceArtist = document.getElementById('referenceArtist')?.value || '';
        
        // 로딩 표시
        const aiGeneratedResults = document.getElementById('aiGeneratedResults');
        const aiLyricsLoading = document.getElementById('aiLyricsLoading');
        const aiLyricsOptions = document.getElementById('aiLyricsOptions');
        
        if (aiGeneratedResults) {
            aiGeneratedResults.style.display = 'block';
        }
        if (aiLyricsLoading) {
            aiLyricsLoading.style.display = 'block';
        }
        if (aiLyricsOptions) {
            aiLyricsOptions.style.display = 'none';
        }
        
        // ChatGPT(OpenAI) API 키 확인 (가사 생성은 항상 ChatGPT 사용)
        const apiKey = localStorage.getItem('openai_api_key') || '';
        
        if (!apiKey || !apiKey.startsWith('sk-')) {
            alert('ChatGPT API 키를 먼저 설정해주세요.\n\n설정 > API 설정에서 OpenAI API 키를 입력해주세요.');
            if (aiGeneratedResults) aiGeneratedResults.style.display = 'none';
            return;
        }
        
        // 태그 정보 문자열 생성
        let tagsInfo = '';
        if (selectedTags.era.length > 0) tagsInfo += `시대: ${selectedTags.era.join(', ')}\n`;
        if (selectedTags.theme.length > 0) tagsInfo += `테마/소재: ${selectedTags.theme.join(', ')}\n`;
        if (selectedTags.perspective.length > 0) tagsInfo += `화자 시점: ${selectedTags.perspective.join(', ')}\n`;
        if (selectedTags.time.length > 0) tagsInfo += `시간대: ${selectedTags.time.join(', ')}\n`;
        if (selectedTags.special.length > 0) tagsInfo += `특수 요소: ${selectedTags.special.join(', ')}\n`;
        if (selectedTags.region.length > 0) tagsInfo += `가사 지역: ${selectedTags.region.join(', ')}\n`;
        if (selectedTags.genre.length > 0) tagsInfo += `장르: ${selectedTags.genre.join(', ')}\n`;
        if (selectedTags.mood.length > 0) tagsInfo += `분위기: ${selectedTags.mood.join(', ')}\n`;
        if (additionalKeywords) tagsInfo += `추가 키워드: ${additionalKeywords}\n`;
        if (lyricsLength) {
            const lengthMap = {
                'short': '150-200자',
                'normal': '200-300자',
                'long': '300-450자',
                'very-long': '450-600자'
            };
            tagsInfo += `가사 길이: ${lengthMap[lyricsLength] || lyricsLength}\n`;
        }
        
        // 참고 가사 정보
        let referenceInfo = '';
        if (referenceSongTitle || referenceArtist || referenceLyrics) {
            referenceInfo = '\n【참고 가사】\n';
            if (referenceSongTitle) referenceInfo += `참고 노래 제목: ${referenceSongTitle}\n`;
            if (referenceArtist) referenceInfo += `참고 아티스트: ${referenceArtist}\n`;
            if (referenceLyrics) referenceInfo += `참고 가사:\n${referenceLyrics}\n`;
            referenceInfo += '\n위 참고 가사의 스타일과 구조를 참고하여 새로운 가사를 생성하세요.\n';
        }
        
        // 지침서 로드 (최신 상태로 항상 확인)
        console.log('📋 제작 지침서 검토 시작...');
        let guidelines = localStorage.getItem('musicCreatorGuidelines') || '';
        const guidelinesLength = guidelines.length;
        const hasGuidelines = guidelines.trim().length > 0;
        
        if (hasGuidelines) {
            console.log(`✅ 제작 지침서 확인 완료 (길이: ${guidelinesLength}자)`);
            console.log('📝 지침서 미리보기 (처음 200자):', guidelines.substring(0, 200) + '...');
        } else {
            console.warn('⚠️ 제작 지침서가 설정되지 않았습니다. 기본 지침을 적용합니다.');
            console.log('💡 상단 메뉴의 "지침서" 버튼에서 지침서를 설정하세요.');
        }
        
        // AI 프롬프트 생성 (지침서 내용 포함)
        console.log('📝 AI 프롬프트 생성 중... (지침서 반영)');
        
    const prompt = `당신은 전문 작사가입니다. **뮤직모리 제작 지침서**와 선택된 옵션을 바탕으로 **4개의 서로 다른 곡 제목과 가사**를 생성해주세요.

${guidelines.trim() ? `【뮤직모리 제작 지침서 - 반드시 준수】\n다음은 현재 설정된 뮤직모리 제작 지침서입니다. 이 지침서의 모든 내용을 반드시 준수하여 가사를 생성하세요:\n\n${guidelines}\n\n` : `【뮤직모리 제작 지침서 - 기본 지침】\n제작 지침서가 설정되지 않았습니다. 다음 기본 지침을 따라 작성하세요:\n\n1. 전체 제작 방향성:\n- 제목 표기: 한글(English) 형식 고정\n- 한글 중심 가사, 영어는 후렴·강조 등 보조적 사용만 허용 (20~30% 이내)\n- 중독성 강한 구조, 감정 몰입도 높은 가사 설계\n- 성별 시점 명확화\n- 기존 완성곡의 문장·표현 반복 최소화\n\n2. 가사 스타일:\n- 직접적 설명보다 비유적·시적 언어 사용\n- 스토리텔링 구조 권장 (과거 → 현재 → 미래)\n- 일상 언어 + 높은 감정 밀도\n\n3. Suno 가사란 지시어 구조:\n- 기본 구조: [Intro] [Verse 1] [Pre-Chorus] [Chorus] [Verse 2] [Bridge] [Final Chorus] [Outro]\n- 대괄호 [ ] 필수, 괄호 ( ) 사용 금지\n- 한 섹션당 3~6개 지시어 이내\n- 필수 지시어: [Tempo: ...], [Vocal: ...], [Breath: ...], [Reverb: ...], [Instruments: ...], [Mod: ...]\n\n`}

【선택된 옵션】
${tagsInfo || '없음'}

${referenceInfo}

【작업 요구사항 - 뮤직모리 제작 지침서 및 선택 옵션 반영】
1. **뮤직모리 제작 지침서를 반드시 준수**하여 **4개의 서로 다른 곡 제목과 가사**를 생성하세요
2. **"AI 생성" 매뉴의 모든 선택사항 반영**: 장르, 분위기/감정, 시대, 테마, 화자 시점, 시간대, 특수 요소, 가사 지역, 추가 키워드, 가사 길이를 모두 반영하세요
3. 각 곡은 독립적이고 창의적인 제목과 가사를 가져야 합니다
4. **⚠️ 매우 중요: 가사와 지시어를 모두 포함하여 작성하세요**
   - **가사 내용(한글 가사)과 Suno 지시어([Tempo: ...], [Vocal: ...], [Instruments: ...] 등)를 모두 포함**해야 합니다
   - 지시어만 작성하거나 가사만 작성하지 마세요
   - 각 섹션에는 지시어와 실제 가사 내용이 모두 포함되어야 합니다
   - 예: [Verse 1] 섹션에는 [Vocal: ...], [Instruments: ...] 등의 지시어와 함께 실제 가사 내용도 작성해야 합니다
5. **제목 형식**: 반드시 "한글(English)" 형식으로 작성 (예: "별빛 아래(Under the Starlight)")
6. **가사 구조**: 뮤직모리 지침서에 따라 다음 구조 사용 (지침서에 명시된 구조를 반드시 준수):
   - **[Intro]** - 권장 (지침서에 명시된 기본 구조에 포함)
   - [Verse 1] - 필수
   - [Pre-Chorus] - 선택 (필요시)
   - [Chorus] - 필수
   - [Verse 2] - 권장
   - [Bridge] - 선택 (필요시)
   - [Final Chorus] 또는 [Chorus] - 필수
   - [Outro] - 권장
   
   **중요**: 지침서에 명시된 기본 구조 [Intro] [Verse 1] [Pre-Chorus] [Chorus] [Verse 2] [Bridge] [Final Chorus] [Outro]를 최대한 반영하세요. 특히 [Intro]는 가사의 시작을 위한 중요한 섹션이므로 가능한 한 포함하세요.
7. **Suno 가사란 호환성 및 지시어 필수 포함**:
   - 가사는 **Suno.ai 가사란에 바로 복사하여 사용 가능한 형식**으로 작성
   - **⚠️ 매우 중요: 가사 내용(한글 가사)과 지시어를 모두 포함하여 작성하세요**
   - **각 섹션에는 지시어와 실제 가사 내용이 모두 포함되어야 합니다**
   - **중요**: 가사 내용에 괄호 "(", ")" 사용 금지 - Suno가 괄호 안 글자를 실제 가사로 인식
   - **대괄호 [ ]만 사용** (예: [Verse 1], [Chorus])
   - **한 섹션당 3~6개 지시어 이내** (지침서 규칙)
   - 다음 지시어들을 적절한 위치에 포함 (각 줄에 하나씩):
     * [Tempo: XX BPM] 또는 [Tempo: XX BPM → YY BPM] - 템포 설정 (**[Intro] 섹션 내부 또는 전체 가사 맨 앞**)
     * [Vocal: ...] - 보컬 스타일 (예: [Vocal: Male baritone, age 40, clean HIFI, intimate] 또는 [Vocal: Soft female voice, emotional])
     * [Instruments: ...] - 악기 구성 (예: [Instruments: Piano, warm strings])
     * [Mod: ...] - 분위기/감정 (예: [Mod: Melancholic and nostalgic])
     * [Breath: ...] - 보컬 호흡/쉼 (**필수**, 예: [Breath: Soft inhale before first word])
     * [Reverb: ...] - 공간감 설정 (**필수**, 예: [Reverb: Wide stereo, soft tail])
     * [Volume: ...] - 볼륨 변화 (예: [Volume: Chorus +1.5 dB])
     * [Final Fade: ...] - Outro에 적용 (예: [Final Fade: 4 s slow fade after last echo])
   - 지시어는 각 섹션 시작 부분에 배치
   - 동일 지시어 반복 남용 금지
8. **가사 스타일** (지침서 준수):
   - 직접적 설명보다 **비유적·시적 언어** 사용
   - **스토리텔링 구조** 권장 (과거 → 현재 → 미래)
   - 일상 언어 + 높은 감정 밀도
   - 한글 중심 가사, 영어는 후렴·강조 등 보조적 사용만 허용 (20~30% 이내)
   - 기존 완성곡의 문장·표현 반복 최소화
9. **보컬/사운드** (지침서 준수):
   - 자연스러운 숨소리(Breath) 필수
   - 보컬 명료도 최우선
   - 공간감 있는 보컬 믹싱 (Wide Stereo)
   - 부드러운 톤, 날카로운 톤 피함
10. 한국어 중심으로 작성
11. 감성적이고 전문적인 가사
12. 각 가사는 완성된 형태로 작성 (지시어와 가사 내용 모두 포함)
13. 제목과 가사만 출력 (설명이나 주석 없이)

【출력 형식】
다음 JSON 형식으로 출력하세요 (가사는 Suno.ai 가사란에 바로 복사 가능한 형식):
\`\`\`json
{
  "lyrics": [
    {
      "title": "별빛 아래(Under the Starlight)",
      "content": "[Intro]\n[Tempo: 72 BPM]\n[Instruments: Ambient pad, soft piano]\n[Mod: Melancholic and nostalgic]\n[Reverb: Wide stereo, soft tail]\n[Breath: Soft inhale before first word]\n\n[Verse 1]\n[Vocal: Soft female voice, emotional]\n[Instruments: Piano, warm strings]\n[Mod: Melancholic and nostalgic]\n[Reverb: Wide stereo, soft tail]\n새벽의 안개 속 너의 기억이 떠올라\n그때의 웃음소리 나를 감싸던 따스함\n은은한 향수 내 마음에 스며들어\n잊으려 해도 너는 나의 운명 같아\n\n[Pre-Chorus]\n[Volume: +0.5 dB]\n시간이 흘러도 변하지 않을\n\n[Chorus]\n[Vocal: Emotional female voice]\n[Instruments: Soft strings, gentle drums]\n[Volume: Chorus +1.5 dB]\n별빛 아래 우리의 약속\n너의 손길 떠난 후 난 홀로 남아\n잊지 못할 우리 그 시간이 그리워\n사랑이란 이름으로 내 마음에 남아\n\n[Verse 2]\n[Vocal: Soft female voice, emotional]\n[Instruments: Piano, warm strings]\n[Mod: Melancholic and nostalgic]\n[Reverb: Wide stereo, soft tail]\n벨기에의 하늘 별들이 반짝여\n너와 나의 추억 그곳에 남아있어\n새벽이 올 때마다 너를 찾아 헤매\n이별의 향기 영원히 지워지지 않아\n\n[Bridge]\n[Vocal: Intimate whisper]\n[Instruments: Ambient pad]\n[Breath: Long pause before rise]\n모든 것이 변해도\n우리의 사랑은 영원할 거야\n\n[Final Chorus]\n[Vocal: Emotional female voice]\n[Instruments: Full arrangement]\n[Volume: Chorus +1.5 dB]\n별빛 아래 우리의 약속\n함께한 기억을 간직할게\n\n[Outro]\n[Final Fade: 4 s slow fade after last echo]\n[Volume: Fade out to whisper]"
    },
    {
      "title": "한글 제목(English Title)",
      "content": "[Intro]\n[Tempo: XX BPM]\n[Instruments: ...]\n[Mod: ...]\n[Reverb: Wide stereo, soft tail]\n[Breath: Soft inhale before first word]\n\n[Verse 1]\n[Vocal: ...]\n[Instruments: ...]\n[Mod: ...]\n[Reverb: Wide stereo, soft tail]\n가사 내용...\n가사 내용...\n\n[Pre-Chorus]\n[Volume: +0.5 dB]\n가사 내용...\n\n[Chorus]\n[Vocal: ...]\n[Instruments: ...]\n[Volume: Chorus +1.5 dB]\n가사 내용...\n가사 내용..."
    },
    {
      "title": "한글 제목(English Title)",
      "content": "[Intro]\n[Tempo: XX BPM]\n[Instruments: ...]\n[Mod: ...]\n[Reverb: Wide stereo, soft tail]\n[Breath: Soft inhale before first word]\n\n[Verse 1]\n[Vocal: ...]\n[Instruments: ...]\n[Mod: ...]\n[Reverb: Wide stereo, soft tail]\n가사 내용...\n가사 내용...\n\n[Pre-Chorus]\n[Volume: +0.5 dB]\n가사 내용...\n\n[Chorus]\n[Vocal: ...]\n[Instruments: ...]\n[Volume: Chorus +1.5 dB]\n가사 내용...\n가사 내용..."
    },
    {
      "title": "한글 제목(English Title)",
      "content": "[Intro]\n[Tempo: XX BPM]\n[Instruments: ...]\n[Mod: ...]\n[Reverb: Wide stereo, soft tail]\n[Breath: Soft inhale before first word]\n\n[Verse 1]\n[Vocal: ...]\n[Instruments: ...]\n[Mod: ...]\n[Reverb: Wide stereo, soft tail]\n가사 내용...\n가사 내용...\n\n[Pre-Chorus]\n[Volume: +0.5 dB]\n가사 내용...\n\n[Chorus]\n[Vocal: ...]\n[Instruments: ...]\n[Volume: Chorus +1.5 dB]\n가사 내용...\n가사 내용..."
    }
  ]
}

\`;


// --- Extracted selectLyricsLength ---
window.selectLyricsLength = function(length, button, event) {
    try {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        // 같은 컨테이너의 다른 버튼들 해제
        const container = button.closest('.tag-container');
        if (container) {
            const otherButtons = container.querySelectorAll('.length-btn');
            otherButtons.forEach(btn => {
                if (btn !== button) {
                    btn.classList.remove('active');
                }
            });
        }
        
        // 현재 버튼 토글
        button.classList.toggle('active');
        
        console.log('✅ 가사 길이 선택:', length, button.classList.contains('active') ? '선택' : '해제');
    } catch (error) {
        console.error('❌ 가사 길이 선택 오류:', error);
    }
};


// --- Extracted generateStylePromptFromLyrics ---
window.generateStylePromptFromLyrics = function(lyrics, title = '') {
    try {
        const directives = [];
        const elements = [];
        
        // 가사에서 지시어 추출 (대괄호로 감싸진 부분)
        const directivePattern = /\[([^\]]+)\]/g;
        let match;
        
        while ((match = directivePattern.exec(lyrics)) !== null) {
            const directive = match[1].trim();
            
            // 섹션 마커는 제외 (Intro, Verse, Chorus 등)
            const sectionMarkers = ['Intro', 'Verse', 'Chorus', 'Pre-Chorus', 'Bridge', 'Outro', 'Hook', 'Interlude', 'Ad-lib', 'Break', 'Drop'];
            const isSection = sectionMarkers.some(marker => 
                directive.toLowerCase() === marker.toLowerCase() || 
                directive.toLowerCase().startsWith(marker.toLowerCase() + ' ')
            );
            
            if (!isSection && directive.includes(':')) {
                // 키: 값 형태의 지시어
                const [key, value] = directive.split(':').map(s => s.trim());
                
                // 중복 방지 및 주요 스타일 요소 추출
                if (key && value) {
                    switch (key.toLowerCase()) {
                        case 'tempo':
                            if (!elements.some(e => e.includes('BPM'))) {
                                elements.push(value);
                            }
                            break;
                        case 'vocal':
                        case 'vocals':
                            elements.push(value);
                            break;
                        case 'instruments':
                        case 'instrument':
                            elements.push(value);
                            break;
                        case 'mood':
                        case 'mod':
                            elements.push(value);
                            break;
                        case 'breath':
                        case 'reverb':
                        case 'effect':
                        case 'sound effect':
                            // 효과는 간단히 추가
                            if (!elements.includes(value)) {
                                elements.push(value);
                            }
                            break;
                        case 'volume':
                            // 볼륨 지시어는 스타일에 추가
                            elements.push(value);
                            break;
                        default:
                            // 기타 지시어도 추가
                            if (value.length < 50) { // 너무 긴 값은 제외
                                elements.push(value);
                            }
                    }
                }
            }
        }
        
        // AI 생성 모드에서 선택된 태그들도 가져오기
        const selectedTags = [];
        
        // 장르
        const genreContainer = document.getElementById('genreTags');
        if (genreContainer) {
            const activeTags = genreContainer.querySelectorAll('.tag-btn.active');
            activeTags.forEach(tag => {
                const tagText = tag.textContent.trim();
                if (tagText !== '+' && tagText !== '+ 직접 입력') {
                    selectedTags.push(tagText);
                }
            });
        }
        
        // 분위기/감정
        const moodContainer = document.getElementById('moodTags');
        if (moodContainer) {
            const activeTags = moodContainer.querySelectorAll('.tag-btn.active');
            activeTags.forEach(tag => {
                const tagText = tag.textContent.trim();
                if (tagText !== '+' && tagText !== '+ 직접 입력') {
                    selectedTags.push(tagText);
                }
            });
        }
        
        // 중복 제거
        const uniqueElements = [...new Set([...selectedTags, ...elements])];
        
        // 스타일 프롬프트 생성
        let stylePrompt = '';
        
        if (uniqueElements.length > 0) {
            stylePrompt = uniqueElements.join(', ');
        }
        
        // 기본 품질 태그 추가
        const qualityTags = ['emotional', 'studio quality'];
        const hasQuality = qualityTags.some(q => stylePrompt.toLowerCase().includes(q.toLowerCase()));
        
        if (!hasQuality && stylePrompt) {
            // 이미 충분한 요소가 있으면 품질 태그는 생략
            if (uniqueElements.length < 5) {
                stylePrompt += ', emotional, studio quality';
            }
        }
        
        console.log('✅ 스타일 프롬프트 생성:', stylePrompt);
        return stylePrompt;
        
    } catch (error) {
        console.error('❌ 스타일 프롬프트 생성 오류:', error);
        return '';
    }
};


// --- Extracted confirmSelectedLyrics ---
window.confirmSelectedLyrics = function() {
    try {
        const editedTitle = document.getElementById('editedTitle')?.value || '';
        const editedLyrics = document.getElementById('editedLyrics')?.value || '';
        
        if (!editedLyrics.trim()) {
            alert('가사를 입력해주세요.');
            return;
        }
        
        // 곡 제목 업데이트
        const songTitleEl = document.getElementById('songTitle');
        if (songTitleEl && editedTitle) {
            songTitleEl.value = editedTitle;
        }
        
        // 가사 업데이트
        const originalLyricsEl = document.getElementById('originalLyrics');
        if (originalLyricsEl) {
            originalLyricsEl.value = editedLyrics;
        }
        
        // 가사와 지시어에서 스타일 프롬프트 자동 생성
        const generatedStylePrompt = window.generateStylePromptFromLyrics(editedLyrics, editedTitle);
        const manualStylePromptEl = document.getElementById('manualStylePrompt');
        if (manualStylePromptEl && generatedStylePrompt) {
            manualStylePromptEl.value = generatedStylePrompt;
            console.log('✅ 수노 스타일 프롬프트 자동 설정:', generatedStylePrompt);
        }
        
        // AI 생성 결과 숨기기
        const aiGeneratedResults = document.getElementById('aiGeneratedResults');
        if (aiGeneratedResults) {
            aiGeneratedResults.style.display = 'none';
        }
        
        // 직접 작성 모드로 전환
        if (typeof window.switchLyricsMode === 'function') {
            window.switchLyricsMode('manual');
        }
        
        if (typeof window.showCopyIndicator === 'function') {
            window.showCopyIndicator('✅ 가사가 확정되었습니다! 스타일 프롬프트가 자동 생성되었습니다.');
        } else {
            alert('✅ 가사가 확정되었습니다! 스타일 프롬프트가 자동 생성되었습니다.');
        }
        
        console.log('✅ 가사 확정 완료');
    } catch (error) {
        console.error('❌ 가사 확정 오류:', error);
        alert('가사 확정 중 오류가 발생했습니다:\n\n' + error.message);
    }
};


// --- Extracted parseJSONManually ---
function parseJSONManually(jsonString) {
    const lyrics = [];
    try {
        // "lyrics" 배열 찾기
        const lyricsMatch = jsonString.match(/"lyrics"\s*:\s*\[([\s\S]*?)\]/);
        if (!lyricsMatch) return lyrics;
        
        const lyricsContent = lyricsMatch[1];
        
        // 각 객체 추출
        const objectPattern = /\{[\s\S]*?"title"[\s\S]*?"content"[\s\S]*?\}/g;
        let match;
        let objectCount = 0;
        
        while ((match = objectPattern.exec(lyricsContent)) !== null && objectCount < 4) {
            const objStr = match[0];
            
            // title 추출
            const titleMatch = objStr.match(/"title"\s*:\s*"([^"]+)"/);
            const title = titleMatch ? titleMatch[1] : 'AI 생성 곡 ' + (objectCount + 1);
            
            // content 추출 (여러 줄 처리)
            const contentMatch = objStr.match(/"content"\s*:\s*"([\s\S]*?)"(?:\s*[,}])/);
            let content = '';
            if (contentMatch && contentMatch[1]) {
                content = contentMatch[1]
                    .replace(/\\n/g, '\n')
                    .replace(/\\t/g, '\t')
                    .replace(/\\"/g, '"')
                    .replace(/\\'/g, "'")
                    .replace(/\\\\/g, '\\')
                    .replace(/\r\n/g, '\n')
                    .replace(/\r/g, '\n')
                    // 줄 끝의 불필요한 백슬래시 제거
                    .replace(/\\\s*\n/g, '\n')
                    .replace(/\\\s*$/gm, '')
                    // 연속된 줄바꿈 정리
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();
            }
            
            if (title || content) {
                lyrics.push({ title, content });
                objectCount++;
            }
        }
    } catch (error) {
        console.error('수동 JSON 파싱 오류:', error);
    }
    
    return lyrics;
}

window.parseJSONManually = parseJSONManually;

// --- Extracted selectLyricsOption ---
window.selectLyricsOption = function(index) {
    try {
        if (!window.generatedLyricsOptions || !window.generatedLyricsOptions[index]) {
            alert('선택할 가사를 찾을 수 없습니다.');
            return;
        }
        
        const selectedLyric = window.generatedLyricsOptions[index];
        const selectedLyricsEdit = document.getElementById('selectedLyricsEdit');
        const aiLyricsOptions = document.getElementById('aiLyricsOptions');
        
        if (selectedLyricsEdit) {
            const editedTitle = document.getElementById('editedTitle');
            const editedLyrics = document.getElementById('editedLyrics');
            
            if (editedTitle) {
                editedTitle.value = selectedLyric.title || document.getElementById('songTitle')?.value || '';
            }
            if (editedLyrics) {
                editedLyrics.value = selectedLyric.content || '';
            }
            
            selectedLyricsEdit.style.display = 'block';
        }
        
        if (aiLyricsOptions) {
            // 선택된 카드 강조
            const cards = aiLyricsOptions.querySelectorAll('.lyrics-option-card');
            cards.forEach((card, idx) => {
                if (idx === index) {
                    card.style.borderColor = 'var(--accent)';
                    card.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                } else {
                    card.style.borderColor = 'var(--border)';
                    card.style.boxShadow = 'none';
                }
            });
        }
        
        // 선택된 가사 저장
        window.selectedLyricsIndex = index;
        
        console.log('✅ 가사 옵션 선택:', index);
    } catch (error) {
        console.error('❌ 가사 옵션 선택 오류:', error);
        alert('가사 선택 중 오류가 발생했습니다:\n\n' + error.message);
    }
};


// --- Extracted backToOptions ---
window.backToOptions = function() {
    const selectedLyricsEdit = document.getElementById('selectedLyricsEdit');
    if (selectedLyricsEdit) {
        selectedLyricsEdit.style.display = 'none';
    }
    
    // 카드 강조 제거
    const aiLyricsOptions = document.getElementById('aiLyricsOptions');
    if (aiLyricsOptions) {
        const cards = aiLyricsOptions.querySelectorAll('.lyrics-option-card');
        cards.forEach(card => {
            card.style.borderColor = 'var(--border)';
            card.style.boxShadow = 'none';
        });
    }
    
    window.selectedLyricsIndex = null;
};

