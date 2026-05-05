# MV 중복 함수 정리 계획

작성일: 2026-05-06  
대상: `app.js`, `js/step6.js`, `index.html`

## 1. 현재 로드 구조

`index.html`은 현재 `js/step6.js`를 먼저 로드하고, 마지막에 `app.js`를 로드합니다.

```html
<script src="js/step6.js?v=20260422m"></script>
<script src="app.js?v=20260422m"></script>
```

따라서 두 파일에 같은 이름의 `window.*` 함수가 있으면 **나중에 로드되는 `app.js` 구현이 최종 실행 함수가 됩니다.**

## 2. 중복 함수 정리 결과

초기에는 아래 함수들이 `app.js`와 `js/step6.js` 양쪽에 흩어져 있었습니다. 현재는 MV 관련 실행 함수의 소유권을 `js/step6.js`로 고정했고, `app.js`의 중복 전역 정의는 제거했습니다.

| 함수 | 현재 최종 실행 | 위험도 | 메모 |
| --- | --- | --- | --- |
| `copyAllMVPrompts` | `js/step6.js` | 정리됨 | 두 구현의 출력 포맷이 동일해 소유권만 이관 |
| `generateMVDetailPrompts` | `js/step6.js` | 정리됨 | `app.js` 레거시 중복 정의 삭제 |
| `syncMVPromptTranslation` | `js/step6.js` | 정리됨 | 번역 후 `saveCurrentProject()` 호출 흐름 유지 |
| `syncSceneOverviewPromptTranslation` | `js/step6.js` | 정리됨 | 씬 개요 번역 후 `currentScenes` 갱신 및 저장 유지 |
| `syncScenePromptTranslation` | `js/step6.js` | 정리됨 | 결과 섹션 씬 프롬프트 번역 후 저장 유지 |
| `regenerateMVPrompt` | `js/step6.js` | 정리됨 | 최신 단일 스타일 재생성 함수 호출 및 복사 버튼 상태 복원 |
| `saveScenePrompt` | `js/step6.js` | 정리됨 | `saveCurrentProject()` 경유로 `marketing.mv` 동기화 |
| `initializeTagButtons` | `js/step6.js` | 정리됨 | 중복 리스너 방지용 컨테이너 복제 방식으로 보강 |
| `getMVLocationValues` | `js/step6.js` | 정리됨 | `js/step6.js` 구현을 DOM 직접 조회 방식으로 보강 |

## 3. 현재 안전 판단

MV 함수 소유권 정리는 완료 상태입니다.

현재 기준:

1. `app.js`에는 MV 함수 정의가 아니라 단계 복원/공통 화면 흐름에서 `js/step6.js` 함수를 호출하는 코드만 남아 있습니다.
2. `tests/mv_duplicate_ownership_check.js`는 `app.js`와 `js/step6.js` 사이의 중복 전역 함수 재발을 차단합니다.
3. `npm run test:mv`는 문법 검사, 중복 소유권 검사, Chrome 런타임 검사, 저장/복원/번역/복사/다운로드/재생성 흐름을 한 번에 확인합니다.
4. 인라인 `onclick` 이름은 유지했기 때문에 화면 버튼 연결은 그대로 보존됩니다.

## 4. 권장 정리 순서

### 1단계: 소유권 고정

MV 화면/프롬프트/씬 관련 함수는 최종적으로 `js/step6.js`가 소유하도록 합니다.

단, 아래 공통/앱 전체 함수는 당분간 `app.js`에 둡니다.

- `restoreStepData`
- `goToStep`
- `generateMarketingMaterials`
- `showCopyIndicator`
- `copyToClipboard`
- 프로젝트 목록/백업/설정 관련 함수

### 2단계: 함수별 이관 우선순위

위험이 낮은 함수부터 정리합니다.

1. `generateMVDetailPrompts`
   - 완료: `app.js`가 더 이상 `window.generateMVDetailPrompts`를 덮어쓰지 않습니다.

2. `getMVLocationValues`
   - 완료: `js/step6.js` 구현을 `app.js`와 같은 DOM 직접 조회 방식으로 맞춘 뒤 소유권을 넘겼습니다.

3. `copyAllMVPrompts`
   - 완료: 복사 포맷을 유지한 채 `js/step6.js` 전담으로 정리했습니다.

4. `saveScenePrompt`
   - 완료: `js/step6.js` 구현이 `saveCurrentProject()`를 통해 통합 저장 로직을 타도록 유지했습니다.

5. `syncMVPromptTranslation`
   - 완료: `js/step6.js` 구현의 번역 후 즉시 저장 흐름을 유지하며 소유권을 넘겼습니다.

6. `syncSceneOverviewPromptTranslation`
   - 완료: `js/step6.js` 구현의 `currentScenes` 갱신 및 즉시 저장 흐름을 유지하며 소유권을 넘겼습니다.

7. `syncScenePromptTranslation`
   - 완료: `js/step6.js` 구현의 결과 섹션 씬 프롬프트 갱신 및 즉시 저장 흐름을 유지하며 소유권을 넘겼습니다.

8. `regenerateMVPrompt`
   - 완료: `js/step6.js` 구현의 `regenerateSingleStylePrompt()` 호출 흐름을 유지하고, 개요 섹션 복사 버튼 상태 복원도 보강했습니다.

9. `initializeTagButtons`
   - 완료: `js/step6.js` 구현을 중복 리스너 방지 방식으로 보강한 뒤 소유권을 넘겼습니다.

10. `updateMVImageCount`
    - 완료: MV 길이/이미지 수 계산을 `js/step6.js` 소유로 이관했습니다.

11. `saveMVSettings`
    - 완료: MV 설정과 캐릭터 정보를 `localStorage.mvSettings` 및 프로젝트 `marketing.mvSettings`에 저장하는 흐름을 `js/step6.js` 소유로 이관했습니다.

12. `loadMVSettings`
    - 완료: 전역 MV 설정 복원 흐름을 `js/step6.js` 소유로 이관했습니다.

13. `toggleCharacterSheet`
    - 완료: 캐릭터 시트 보기/숨기기 UI 보조 함수를 `js/step6.js` 소유로 이관했습니다.

14. `copyCharacterSheet`
    - 완료: 캐릭터 시트 복사 및 폴백 복사 흐름을 `js/step6.js` 소유로 이관했습니다.

15. `getCharacterSheetSummary`, `getCharacterSheetFull`, `getAllCharacterSheetsSummary`, `getAllCharacterSheetsFull`
    - 완료: MV 프롬프트 생성에 주입되는 캐릭터 시트 요약/원본 추출 함수를 `js/step6.js` 소유로 이관했습니다.

16. `updateCharacterInputs`
    - 완료: MV 캐릭터 입력 UI 생성 및 기존 입력/시트 복원 함수를 `js/step6.js` 소유로 이관했습니다.

17. `generateCharacterSheet`
    - 완료: Gemini/OpenAI 기반 MV 캐릭터 시트 생성 함수를 `js/step6.js` 소유로 이관했습니다.

18. `pickBestLocationForScene`, `getMVLocationEnString`, `getMVLocationKoString`
    - 완료: MV 장소 매핑 상수와 씬 가사 기반 장소 선택/문자열 변환 함수를 `js/step6.js` 소유로 이관했습니다.

19. `updateMVPromptTranslation`, `saveMVPrompt`, `copyMVPromptSection`
    - 완료: MV 프롬프트 간단 번역, 로컬 저장, 섹션 복사 함수를 `js/step6.js` 소유로 이관했습니다.

20. `saveSceneOverview`, `confirmSceneOverviewAndGenerate`
    - 완료: MV 씬 개요 저장과 결과 화면 렌더링/확정 함수를 `js/step6.js` 소유로 이관했습니다.

21. `downloadMVPrompts`
    - 완료: MV 프롬프트 TXT 다운로드 함수를 `js/step6.js` 소유로 이관했습니다.

22. `copySRTContent`, `downloadSRT`
    - 완료: SRT 자막 복사와 다운로드 함수를 `js/step6.js` 소유로 이관했습니다.

## 5. 추가된 보호 테스트

중복 상태를 실수로 바꾸지 않도록 다음 테스트를 추가했습니다.

```text
node tests/mv_duplicate_ownership_check.js
```

이 테스트는 다음을 확인합니다.

1. 현재 확인된 중복 함수 목록이 예상과 같은지
2. `index.html`에서 `js/step6.js`가 `app.js`보다 먼저 로드되는지
3. `app.js`와 `js/step6.js`에 `LegacyUnused` 레거시 함수가 다시 생기지 않는지

현재 기대 중복 함수 목록은 빈 목록입니다.

브라우저 런타임 보호 테스트도 추가했습니다.

```text
node tests/mv_chrome_runtime_check.js
```

이 테스트는 실제 Chrome에서 `index.html`을 로드한 뒤 MV 핵심 함수가 전역에 정상 등록되는지, `LegacyUnused` 전역 키가 없는지, 재생성 버튼과 핵심 textarea가 존재하는지 확인합니다.

테스트 자체가 `python3 -m http.server 4173`을 임시 실행하므로 별도 서버를 먼저 켤 필요는 없습니다.

단일 스타일 프롬프트 재생성 저장 흐름은 다음 테스트로 보호합니다.

```text
node tests/mv_regenerate_single_style_prompt_smoke.js
```

전체 스타일 프롬프트 재생성의 빈 결과 보호는 다음 테스트로 확인합니다.

```text
node tests/mv_regenerate_style_prompts_smoke.js
```

썸네일/배경/인물 프롬프트 생성기의 AI 응답 보정과 기본 폴백은 다음 테스트로 확인합니다.

```text
node tests/mv_generate_thumbnail_prompts_smoke.js
```

씬별 개별 프롬프트 재생성의 성공/폴백/실패 보존 흐름은 다음 테스트로 확인합니다.

```text
node tests/mv_regenerate_scene_prompt_smoke.js
```

씬 개요 프롬프트 재생성의 성공/번역 보완/폴백/실패 보존 흐름은 다음 테스트로 확인합니다.

```text
node tests/mv_regenerate_scene_overview_prompt_smoke.js
```

씬 개요 확정 후 결과 화면 렌더링과 기존 프롬프트 보존은 다음 테스트로 확인합니다.

```text
node tests/mv_confirm_scene_overview_smoke.js
```

전체 MV 보호 테스트는 다음 한 명령으로 실행합니다.

```text
npm run test:mv
```

## 6. 완료 후 다음 작업 제안

MV 함수 소유권 정리는 완료됐으므로, 다음 단계는 구조 정리보다 실제 제품 기능 고도화로 넘어가는 것이 좋습니다.

진행 상태:

1. 완료: `app.js`의 6단계 복원 로직을 `restoreMarketingMVStepData(projectData)` 헬퍼로 분리
2. 완료: `restoreMarketingMVStepData(projectData)` 내부를 설정/프롬프트/씬 표시 헬퍼로 세분화
3. 완료: `js/step6.js` 안의 MV 설정/캐릭터/씬/SRT 영역을 내부 섹션 단위로 표시하고 보호 테스트 추가
4. 완료: MV 씬 데이터 모델을 `marketing.mv.scenes` 기준으로 정규화
5. 완료: 가사 기반 씬 분할 헬퍼를 추가하고 씬 생성 흐름에 연결
6. 완료: 씬 카드/타임라인 프리뷰 UI 추가
7. 완료: 가사 감정 키워드 기반 장소/조명/카메라 톤 추천 고도화
8. 완료: MV 6단계 상세 설정 그리드의 모바일/태블릿 반응형 컬럼 보강
9. 완료: 씬별 시작/종료 시간과 가사 구간 미세 조정 UI 추가
10. 완료: 씬별 장소/감정/무드/조명/카메라 메타데이터 편집 UI 추가
11. 완료: 편집된 씬별 메타데이터를 재생성 프롬프트에 우선 반영
12. 완료: 씬별 메타데이터와 타임라인을 TXT/SRT/전체 복사 내보내기에 포함
13. 완료: 씬별 타임라인/메타데이터 편집 UI의 모바일 표시 보강
14. 완료: 씬 편집 UI에서 시간 역전/빈 메타데이터 입력 안내 표시
15. 완료: 씬별 시간/메타데이터 편집값 변경 시 타임라인 프리뷰 즉시 갱신
16. 완료: 씬 편집 UI 안내 메시지와 타임라인 프리뷰의 접근성/키보드 포커스 보강
17. 완료: 씬 개요 편집 카드의 저장/재생성 전 상태 요약 표시
18. 완료: 씬 개요 확정 전 전체 씬 품질 요약/누락 항목 집계 표시
19. 완료: 씬 품질 요약에서 확인 필요 씬으로 바로 이동하는 포커스 보강

다음 추천 순서:

1. 씬 품질 요약에서 누락 유형별 필터/하이라이트 표시
2. 인앱 브라우저 자동화가 안정화되면 실제 탭 스크린샷 기준 MV 6단계 시각 점검 재실행
