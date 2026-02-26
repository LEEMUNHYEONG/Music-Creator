// js/api.js - Extracted Logic

// --- Extracted callAPIWithRetry ---
window.callAPIWithRetry = async function(apiCall, context, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await apiCall();
        } catch (error) {
            const errorInfo = await window.handleAPIError(error, context, maxRetries);
            
            if (!errorInfo.shouldRetry || attempt === maxRetries) {
                alert(`${errorInfo.userMessage}\n\n상세: ${errorInfo.error}`);
                throw error;
            }
            
            console.warn(`재시도 ${attempt}/${maxRetries} (${context}):`, errorInfo.error);
            await new Promise(resolve => setTimeout(resolve, errorInfo.retryDelay * attempt));
        }
    }
};


// --- Extracted handleAPIError ---
window.handleAPIError = async function(error, context, maxRetries = 3) {
    console.error(`API 오류 (${context}):`, error);
    
    let userMessage = '오류가 발생했습니다';
    let shouldRetry = false;
    let retryDelay = 1000;
    
    // 네트워크 오류
    if (error.message && error.message.includes('fetch')) {
        userMessage = '네트워크 연결을 확인해주세요';
        shouldRetry = true;
    }
    // API 키 오류
    else if (error.message && (error.message.includes('401') || error.message.includes('유효하지 않'))) {
        userMessage = 'API 키가 유효하지 않습니다. API 키 설정을 확인해주세요';
        shouldRetry = false;
    }
    // Rate limit
    else if (error.message && error.message.includes('429')) {
        userMessage = 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요';
        shouldRetry = true;
        retryDelay = 60000; // 1분 대기
    }
    // 타임아웃
    else if (error.message && error.message.includes('timeout')) {
        userMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요';
        shouldRetry = true;
    }
    // 서버 오류
    else if (error.message && (error.message.includes('500') || error.message.includes('503'))) {
        userMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요';
        shouldRetry = true;
        retryDelay = 5000;
    }
    
    return {
        userMessage,
        shouldRetry,
        retryDelay,
        error: error.message || error
    };
};


// --- Extracted translateEnglishToKoreanForScene ---
async function translateEnglishToKoreanForScene(fieldName, englishText) {
    if (!englishText || !englishText.trim()) return '';
    
    // 캐시 확인
    const cacheKey = `${fieldName}_${englishText}`;
    if (sceneOverviewTranslationCache[cacheKey]) {
        return sceneOverviewTranslationCache[cacheKey];
    }
    
    try {
        // API_CONFIG가 없으면 localStorage에서 직접 가져오기
        const openaiKey = (typeof API_CONFIG !== 'undefined' && API_CONFIG.openai?.key) || 
                          localStorage.getItem('openai_api_key') || '';
        
        if (!openaiKey || !openaiKey.startsWith('sk-')) {
            console.warn('OpenAI API 키가 없어 번역을 건너뜁니다.');
            return englishText; // 번역 실패 시 원본 반환
        }
        
        // 필드별 프롬프트
        const fieldPrompts = {
            location: '다음은 MV 프롬프트의 장소 설명입니다. 이를 자연스러운 한국어로 번역해주세요.',
            mood: '다음은 MV 프롬프트의 분위기 설명입니다. 이를 자연스러운 한국어로 번역해주세요.',
            lighting: '다음은 MV 프롬프트의 조명 설명입니다. 이를 자연스러운 한국어로 번역해주세요.',
            characterAction: '다음은 MV 프롬프트의 인물 동작 설명입니다. 이를 자연스러운 한국어로 번역해주세요.',
            expression: '다음은 MV 프롬프트의 표정 설명입니다. 이를 자연스러운 한국어로 번역해주세요.',
            cameraWork: '다음은 MV 프롬프트의 카메라 워크 설명입니다. 이를 자연스러운 한국어로 번역해주세요.'
        };
        
        const prompt = `${fieldPrompts[fieldName] || '다음 영어 텍스트를 자연스러운 한국어로 번역해주세요:'}

영어:
${englishText}

요구사항:
1. 자연스러운 한국어로 번역
2. 전문 용어는 이해하기 쉽게 번역
3. 설명 없이 번역만 출력

한국어:`;
        
        // callOpenAI 함수가 없으면 직접 호출
        let translation = '';
        if (typeof callOpenAI === 'function') {
            translation = await callOpenAI(prompt, 3);
        } else {
            // 직접 OpenAI API 호출
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: '당신은 번역 전문가입니다. 번역만 출력하세요.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 1000
                })
            });
            
            if (!response.ok) {
                throw new Error(`OpenAI API 오류: ${response.status}`);
            }
            
            const data = await response.json();
            translation = data.choices?.[0]?.message?.content || '';
        }
        
        translation = translation.trim();
        
        // 불필요한 설명 제거
        translation = translation
            .replace(/^한국어[:\s]*/gi, '')
            .replace(/^번역[:\s]*/gi, '')
            .replace(/^Korean[:\s]*/gi, '')
            .replace(/```[\s\S]*?```/g, '')
            .trim();
        
        if (translation) {
            sceneOverviewTranslationCache[cacheKey] = translation;
            return translation;
        }
        
        return englishText; // 번역 실패 시 원본 반환
    } catch (error) {
        console.error(`영어→한글 번역 오류 (${fieldName}):`, error);
        return englishText; // 번역 실패 시 원본 반환
    }
}

window.translateEnglishToKoreanForScene = translateEnglishToKoreanForScene;

// --- Extracted translateKoreanToEnglishForScene ---
async function translateKoreanToEnglishForScene(fieldName, koreanText) {
    if (!koreanText || !koreanText.trim()) return '';
    
    try {
        // API_CONFIG가 없으면 localStorage에서 직접 가져오기
        const openaiKey = (typeof API_CONFIG !== 'undefined' && API_CONFIG.openai?.key) || 
                          localStorage.getItem('openai_api_key') || '';
        
        if (!openaiKey || !openaiKey.startsWith('sk-')) {
            console.warn('OpenAI API 키가 없어 번역을 건너뜁니다.');
            return koreanText; // 번역 실패 시 원본 반환
        }
        
        // 필드별 프롬프트
        const fieldPrompts = {
            location: '다음은 MV 프롬프트의 장소 설명입니다. 이를 Midjourney 이미지 생성용 영어 프롬프트로 번역해주세요.',
            mood: '다음은 MV 프롬프트의 분위기 설명입니다. 이를 영어로 번역해주세요.',
            lighting: '다음은 MV 프롬프트의 조명 설명입니다. 이를 Midjourney 이미지 생성용 영어 프롬프트로 번역해주세요.',
            characterAction: '다음은 MV 프롬프트의 인물 동작 설명입니다. 이를 Midjourney 이미지 생성용 영어 프롬프트로 번역해주세요.',
            expression: '다음은 MV 프롬프트의 표정 설명입니다. 이를 Midjourney 이미지 생성용 영어 프롬프트로 번역해주세요.',
            cameraWork: '다음은 MV 프롬프트의 카메라 워크 설명입니다. 이를 Midjourney 이미지 생성용 영어 프롬프트로 번역해주세요.'
        };
        
        const prompt = `${fieldPrompts[fieldName] || '다음 한글 텍스트를 영어로 번역해주세요:'}

한글:
${koreanText}

요구사항:
1. 자연스러운 영어로 번역
2. Midjourney 프롬프트 형식으로 작성
3. 기술 용어는 정확히 번역
4. 설명 없이 번역만 출력

영어:`;
        
        // callOpenAI 함수가 없으면 직접 호출
        let translation = '';
        if (typeof callOpenAI === 'function') {
            translation = await callOpenAI(prompt, 3);
                } else {
            // 직접 OpenAI API 호출
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: '당신은 번역 전문가입니다. 번역만 출력하세요.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 1000
                })
            });
            
            if (!response.ok) {
                throw new Error(`OpenAI API 오류: ${response.status}`);
            }
            
            const data = await response.json();
            translation = data.choices?.[0]?.message?.content || '';
        }
        
        translation = translation.trim();
        
        // 불필요한 설명 제거
        translation = translation
            .replace(/^영어[:\s]*/gi, '')
            .replace(/^번역[:\s]*/gi, '')
            .replace(/^English[:\s]*/gi, '')
            .replace(/```[\s\S]*?```/g, '')
            .trim();
        
        return translation || koreanText; // 번역 실패 시 원본 반환
                    } catch (error) {
        console.error(`한글→영어 번역 오류 (${fieldName}):`, error);
        return koreanText; // 번역 실패 시 원본 반환
    }
}

window.translateKoreanToEnglishForScene = translateKoreanToEnglishForScene;

// --- Extracted changeAPI ---
window.changeAPI = function(value) {
    try {
        console.log('🔄 API 선택 변경:', value);
        
        const apiStatusText = document.getElementById('apiStatusText');
        if (apiStatusText) {
            if (value === 'gemini') {
                apiStatusText.textContent = 'Gemini AI 모드';
            } else if (value === 'openai') {
                apiStatusText.textContent = 'ChatGPT 모드';
            } else {
                apiStatusText.textContent = 'Dual AI 모드';
            }
        }
        
        // 선택된 값 저장
        localStorage.setItem('selectedAPI', value);
        
        console.log('✅ API 선택 변경 완료:', value);
    } catch (error) {
        console.error('API 선택 변경 오류:', error);
        alert('API 선택 변경 중 오류가 발생했습니다:\n\n' + error.message);
    }
};

