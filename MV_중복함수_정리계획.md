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

## 2. 확인된 중복 함수

아래 함수들은 `app.js`와 `js/step6.js` 양쪽에 모두 정의되어 있습니다.

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

당장 중복 함수를 삭제하지 않는 것이 안전합니다.

이유:

1. `app.js`가 최종 덮어쓰기 역할을 하고 있어, 삭제 순서를 잘못 잡으면 실제 동작 함수가 바뀔 수 있습니다.
2. `js/step6.js` 안의 일부 함수는 `app.js` 함수에 의존합니다. 예: `saveAndConfirmMVPrompts()`가 `confirmSceneOverviewAndGenerate()`를 호출합니다.
3. 인라인 `onclick`이 많아, 함수 이름을 바꾸거나 제거하면 화면 버튼이 바로 깨질 수 있습니다.

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

## 6. 다음 실제 코드 작업 제안

첫 코드 정리로 `generateMVDetailPrompts` 소유권을 `js/step6.js`로 넘겼습니다.

추천 방식:

1. 실제 호출 위치 재확인
2. 사용되지 않는다면 `app.js` 쪽 중복 정의를 제거하거나 주석화하지 말고, 먼저 `js/step6.js` 함수만 사용하도록 가드 추가
3. 문법 검사
4. `mv_duplicate_ownership_check.js` 기대값 갱신
5. `mv_model_storage_smoke.js` 재실행
