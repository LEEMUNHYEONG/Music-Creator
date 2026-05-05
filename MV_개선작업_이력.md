# MV 개선작업 이력

## 2026-05-06: 개선 전 안전장치 생성

### 작업 목적

6단계 MV 기능 개선을 시작하기 전에 기존 자료와 현재 작업 상태를 보존하기 위한 안전장치를 만들었습니다.

### 생성된 백업

- 백업 위치: `/Users/leemunhyeong/Music Creator Backups/backup_2026-05-06_before_mv_improvements`
- 백업 방식: 현재 프로젝트 폴더 복사
- 제외 항목: `.git`, `node_modules`
- 포함 항목: 소스 코드, 설정 파일, 문서, 오디오 파일, 현재 미추적 파일

### 작업 브랜치

- 원래 브랜치: `main`
- 개선 작업 브랜치: `codex/mv-data-model-stabilize`

### 복구 방법

문제가 생겼을 때는 다음 중 하나를 선택합니다.

1. 특정 코드 변경만 되돌리기
   - `git diff`로 변경 내용을 확인한 뒤, 필요한 파일만 이전 상태로 복구합니다.

2. 개선 브랜치 작업 중단
   - `main` 브랜치로 돌아가 개선 브랜치를 사용하지 않습니다.

3. 백업 폴더에서 복원
   - `/Users/leemunhyeong/Music Creator Backups/backup_2026-05-06_before_mv_improvements`의 파일을 기준으로 복원합니다.

### 다음 개선 예정

1. 현재 MV 저장/복원 흐름 재확인
2. `marketing.mv` 통합 데이터 모델 추가
3. 기존 `marketing.mvScenes`, `marketing.mvSettings`, `marketing.mvPrompts` 호환 유지
4. 저장/복원 코드 안정화
5. 문법 검사 및 브라우저 확인

## 2026-05-06: 1차 개선 - MV 데이터 모델 병행 저장

### 작업 목적

기존 프로젝트 자료를 깨지 않으면서, 향후 타임라인/씬 관리 기능으로 확장하기 쉬운 `marketing.mv` 통합 구조를 추가했습니다.

### 변경 파일

- `js/storage.js`
- `js/step6.js`
- `app.js`

### 변경 내용

1. `window.getMarketingMVData(marketing)` 헬퍼 추가
   - 신규 `marketing.mv` 구조와 기존 `mvSettings`, `mvPrompts`, `mvScenes` 구조를 모두 읽습니다.

2. `window.syncMarketingMVModel(marketing)` 헬퍼 추가
   - 기존 필드는 유지하면서 아래 신규 구조를 병행 생성합니다.

```javascript
marketing: {
  mv: {
    schemaVersion: 1,
    settings: {},
    prompts: {
      thumbnail: { en: "", ko: "" },
      background: { en: "", ko: "" },
      character: { en: "", ko: "" }
    },
    scenes: [],
    subtitles: [],
    exports: [],
    updatedAt: ""
  }
}
```

3. 저장 로직 연결
   - `saveCurrentProject()`에서 기존 MV 데이터를 저장한 뒤 `marketing.mv`도 함께 갱신합니다.
   - `saveAndConfirmMVPrompts()`에서도 동일한 동기화를 실행합니다.

4. 복원 로직 연결
   - 6단계 복원 시 `marketing.mv`가 있으면 우선 읽고, 없으면 기존 필드를 읽습니다.
   - 기존 `mvSettings`, `mvPrompts`, `mvScenes`만 있는 프로젝트도 계속 열 수 있습니다.

### 검증

- `node --check js/storage.js`: 통과
- `node --check app.js`: 통과
- `node --check js/step6.js`: 통과

### 복구 방법

이번 변경만 되돌리려면 아래 파일의 최근 변경분을 확인해 되돌리면 됩니다.

- `js/storage.js`
- `js/step6.js`
- `app.js`

전체 개선 전 상태로 돌아가야 하면 백업 폴더를 사용합니다.

- `/Users/leemunhyeong/Music Creator Backups/backup_2026-05-06_before_mv_improvements`

### 다음 개선 예정

1. 6단계 MV 저장/복원 동작을 브라우저에서 실제 확인
2. `app.js`에 남은 MV 중복 함수 목록화
3. 안전한 순서로 MV 함수 소유권을 `js/step6.js`로 이동

## 2026-05-06: 1차 개선 검증

### 실행한 검증

1. 로컬 서버 실행
   - URL: `http://127.0.0.1:5174`
   - 결과: HTTP 응답 정상

2. 서버 제공 파일 확인
   - `http://127.0.0.1:5174/js/storage.js`
   - `http://127.0.0.1:5174/js/step6.js`
   - `http://127.0.0.1:5174/app.js`
   - 결과: `getMarketingMVData`, `syncMarketingMVModel` 및 복원 연결 코드가 실제 제공 파일에 반영됨

3. MV 모델 호환성 테스트
   - 기존 `mvSettings`, `mvPrompts`, `mvScenes`만 있는 legacy 데이터를 입력
   - `syncMarketingMVModel()` 실행
   - 결과: `marketing.mv.settings`, `marketing.mv.prompts`, `marketing.mv.scenes`로 정상 변환되고 기존 필드도 유지됨

```text
MV model compatibility test: PASS
```

### 제한 사항

인앱 브라우저 자동화가 로컬 페이지 열기 단계에서 시간 초과되어, 실제 화면 클릭 기반 테스트는 완료하지 못했습니다. 서버와 코드 레벨 검증은 통과했으므로 다음에는 수동 브라우저 확인 또는 별도 자동화 환경을 통해 아래 흐름을 확인해야 합니다.

1. 기존 프로젝트 로드
2. 6단계 MV 설정 변경
3. 저장
4. 프로젝트 재로드
5. MV 설정/프롬프트/씬이 유지되는지 확인

## 2026-05-06: MV 저장 smoke test 추가

### 작업 목적

인앱 브라우저 자동화가 로컬 URL 이동에서 멈추는 상황에서도, MV 저장 로직의 핵심 회귀를 자동으로 잡을 수 있도록 Node 기반 smoke test를 추가했습니다.

### 추가 파일

- `tests/mv_model_storage_smoke.js`

### 검증 내용

가짜 DOM과 가짜 `localStorage`를 구성한 뒤 `saveCurrentProject()`를 실행하여 다음을 확인합니다.

1. 기존 6단계 필드가 저장되는지 확인
2. 신규 `marketing.mv` 구조가 생성되는지 확인
3. 기존 `mvSettings`, `mvPrompts`, `mvScenes` 필드가 계속 유지되는지 확인
4. MV 설정, 프롬프트, 씬 데이터가 양쪽 구조에 같은 의미로 들어가는지 확인

### 실행 결과

```text
node tests/mv_model_storage_smoke.js
MV storage smoke test: PASS
```

### 함께 실행한 문법 검사

- `node --check js/storage.js`: 통과
- `node --check app.js`: 통과
- `node --check js/step6.js`: 통과
- `node --check tests/mv_model_storage_smoke.js`: 통과

### 다음 개선 예정

1. `app.js`와 `js/step6.js`에 중복으로 남아 있는 MV 함수 목록을 문서화
2. 안전한 순서로 중복 함수의 실제 호출 소유권 확인
3. `js/step6.js` 중심으로 MV 함수 정리를 시작

## 2026-05-06: MV 중복 함수 소유권 점검

### 작업 목적

`app.js`와 `js/step6.js`에 동시에 정의된 MV 함수들을 바로 삭제하지 않고, 현재 실행 구조와 정리 우선순위를 먼저 고정했습니다.

### 추가 파일

- `MV_중복함수_정리계획.md`
- `tests/mv_duplicate_ownership_check.js`

### 확인 결과

현재 `index.html`은 `js/step6.js`를 먼저 로드하고, 이후 `app.js`를 로드합니다. 따라서 같은 이름의 `window.*` 함수는 `app.js` 구현이 최종 실행됩니다.

확인된 중복 함수는 9개입니다.

- `copyAllMVPrompts`
- `generateMVDetailPrompts`
- `getMVLocationValues`
- `initializeTagButtons`
- `regenerateMVPrompt`
- `saveScenePrompt`
- `syncMVPromptTranslation`
- `syncSceneOverviewPromptTranslation`
- `syncScenePromptTranslation`

### 추가된 보호 테스트

```text
node tests/mv_duplicate_ownership_check.js
MV duplicate ownership check: PASS
```

이 테스트는 중복 함수 목록과 `index.html`의 로드 순서가 예상대로 유지되는지 확인합니다. 중복 제거를 진행할 때는 이 테스트의 기대값도 함께 갱신해야 합니다.

### 함께 실행한 회귀 테스트

```text
node tests/mv_model_storage_smoke.js
MV storage smoke test: PASS
```

### 다음 개선 예정

1. `generateMVDetailPrompts` 실제 호출 여부 최종 확인
2. 가장 위험이 낮은 중복 함수부터 하나씩 정리
3. 정리할 때마다 중복 함수 테스트 기대값 갱신
4. MV 저장 smoke test 재실행

## 2026-05-06: 첫 중복 함수 정리 - generateMVDetailPrompts

### 작업 목적

`app.js`와 `js/step6.js`에 중복 정의되어 있던 `generateMVDetailPrompts`의 소유권을 `js/step6.js`로 넘겼습니다.

### 확인 내용

- 실제 호출은 현재 주석 처리되어 있음
  - `app.js` 안의 `await generateMVDetailPrompts(...)` 호출은 주석 상태
- `index.html`에서도 직접 호출하지 않음
- `js/step6.js` 구현이 더 완전한 AI 생성/기본 생성 흐름을 가지고 있음

### 변경 내용

1. `app.js`
   - `window.generateMVDetailPrompts`를 더 이상 덮어쓰지 않도록 변경
   - 기존 함수는 `window.generateMVDetailPromptsLegacyUnused`로 이름 변경

2. `index.html`
   - 주석 설명을 `js/step6.js 전담`으로 수정

3. `tests/mv_duplicate_ownership_check.js`
   - 중복 함수 기대 목록에서 `generateMVDetailPrompts` 제거

4. `MV_중복함수_정리계획.md`
   - `generateMVDetailPrompts` 정리 완료로 갱신

### 검증

```text
node tests/mv_duplicate_ownership_check.js
MV duplicate ownership check: PASS

node tests/mv_model_storage_smoke.js
MV storage smoke test: PASS
```

문법 검사:

```text
node --check app.js
node --check js/step6.js
node --check tests/mv_duplicate_ownership_check.js
node --check tests/mv_model_storage_smoke.js
```

모두 통과.

참고: `index.html`은 Node 문법 검사 대상이 아니므로 `node --check index.html`은 사용할 수 없습니다.

### 남은 중복 함수

- `copyAllMVPrompts`
- `getMVLocationValues`
- `initializeTagButtons`
- `regenerateMVPrompt`
- `saveScenePrompt`
- `syncMVPromptTranslation`
- `syncSceneOverviewPromptTranslation`
- `syncScenePromptTranslation`

### 다음 개선 예정

다음 후보는 `getMVLocationValues`입니다. 장소 태그 수집 함수라 영향 범위가 있지만, AI 호출 함수보다 위험이 낮고 MV 설정 저장/복원과 직접 연결되어 있어 정리 가치가 큽니다.

## 2026-05-06: 두 번째 중복 함수 정리 - getMVLocationValues

### 작업 목적

MV 장소 태그 수집 함수인 `getMVLocationValues`의 소유권을 `js/step6.js`로 넘겼습니다.

### 확인 내용

- 기존 `js/step6.js` 구현은 `getSelectedTags("mvLocationTags")`에 의존했습니다.
- 기존 `app.js` 구현은 실제 DOM의 `#mvLocationTags .tag-btn.active`를 직접 읽어 더 독립적이었습니다.
- MV 씬 생성/프롬프트 생성/설정 저장에서 모두 이 함수에 의존합니다.

### 변경 내용

1. `js/step6.js`
   - `getMVLocationValues()`를 DOM 직접 조회 방식으로 보강했습니다.

2. `app.js`
   - `window.getMVLocationValues`를 더 이상 덮어쓰지 않도록 변경했습니다.
   - 기존 함수는 `window.getMVLocationValuesLegacyUnused`로 이름 변경했습니다.

3. `tests/mv_duplicate_ownership_check.js`
   - 중복 함수 기대 목록에서 `getMVLocationValues` 제거

4. `tests/mv_model_storage_smoke.js`
   - 실제 태그 컨테이너를 흉내 내는 `mvLocationTags` 테스트 DOM 추가
   - 새 `getMVLocationValues()` 흐름으로도 MV 저장이 통과하는지 확인

5. `MV_중복함수_정리계획.md`
   - `getMVLocationValues` 정리 완료로 갱신

### 검증

```text
node tests/mv_duplicate_ownership_check.js
MV duplicate ownership check: PASS

node tests/mv_model_storage_smoke.js
MV storage smoke test: PASS
```

문법 검사:

```text
node --check app.js
node --check js/step6.js
node --check tests/mv_duplicate_ownership_check.js
node --check tests/mv_model_storage_smoke.js
```

모두 통과.

### 남은 중복 함수

- `copyAllMVPrompts`
- `initializeTagButtons`
- `regenerateMVPrompt`
- `saveScenePrompt`
- `syncMVPromptTranslation`
- `syncSceneOverviewPromptTranslation`
- `syncScenePromptTranslation`

### 다음 개선 예정

다음 후보는 `copyAllMVPrompts`입니다. 사용자 결과물을 복사하는 함수라 AI 호출 함수보다는 위험이 낮지만, 복사 포맷이 바뀌면 사용성이 달라질 수 있어 두 구현의 출력 차이를 먼저 비교해야 합니다.

## 2026-05-06: 세 번째 중복 함수 정리 - copyAllMVPrompts

### 작업 목적

모든 MV 프롬프트 복사 함수인 `copyAllMVPrompts`의 소유권을 `js/step6.js`로 넘겼습니다.

### 확인 내용

- `app.js`와 `js/step6.js`의 구현은 같은 복사 포맷을 사용하고 있었습니다.
- 버튼 호출은 모두 `copyAllMVPrompts(event)` 이름을 사용합니다.
- 사용자에게 전달되는 텍스트 포맷이 중요하므로 별도 smoke test를 추가했습니다.

### 변경 내용

1. `app.js`
   - `window.copyAllMVPrompts`를 더 이상 덮어쓰지 않도록 변경했습니다.
   - 기존 함수는 `window.copyAllMVPromptsLegacyUnused`로 이름 변경했습니다.

2. `tests/mv_duplicate_ownership_check.js`
   - 중복 함수 기대 목록에서 `copyAllMVPrompts` 제거

3. `tests/mv_copy_prompts_smoke.js`
   - 새 테스트 추가
   - `js/step6.js`의 `copyAllMVPrompts()`가 클립보드에 예상 포맷을 쓰는지 확인합니다.

4. `MV_중복함수_정리계획.md`
   - `copyAllMVPrompts` 정리 완료로 갱신

### 검증

```text
node tests/mv_copy_prompts_smoke.js
MV copy prompts smoke test: PASS

node tests/mv_duplicate_ownership_check.js
MV duplicate ownership check: PASS

node tests/mv_model_storage_smoke.js
MV storage smoke test: PASS
```

문법 검사:

```text
node --check app.js
node --check js/step6.js
node --check tests/mv_duplicate_ownership_check.js
node --check tests/mv_model_storage_smoke.js
node --check tests/mv_copy_prompts_smoke.js
```

모두 통과.

### 남은 중복 함수

- `initializeTagButtons`
- `regenerateMVPrompt`
- `saveScenePrompt`
- `syncMVPromptTranslation`
- `syncSceneOverviewPromptTranslation`
- `syncScenePromptTranslation`

### 다음 개선 예정

다음 후보는 `saveScenePrompt`입니다. 씬 단위 저장 함수이므로 `marketing.mv` 저장 구조와 맞는지 확인한 뒤 정리하는 것이 좋습니다.

## 2026-05-06: 네 번째 중복 함수 정리 - saveScenePrompt

### 작업 목적

씬 단위 프롬프트 저장 함수인 `saveScenePrompt`의 소유권을 `js/step6.js`로 넘겼습니다.

### 확인 내용

- `app.js` 구현은 씬 배열을 `marketing.mvPrompts`에 직접 넣는 오래된 저장 방식이었습니다.
- `js/step6.js` 구현은 `saveCurrentProject()`를 호출하므로, 기존 저장 로직과 신규 `marketing.mv` 동기화를 함께 타는 구조입니다.
- 따라서 `js/step6.js` 구현이 현재 데이터 모델에 더 안전합니다.

### 변경 내용

1. `app.js`
   - `window.saveScenePrompt`를 더 이상 덮어쓰지 않도록 변경했습니다.
   - 기존 함수는 `window.saveScenePromptLegacyUnused`로 이름 변경했습니다.

2. `tests/mv_duplicate_ownership_check.js`
   - 중복 함수 기대 목록에서 `saveScenePrompt` 제거

3. `tests/mv_save_scene_prompt_smoke.js`
   - 새 테스트 추가
   - 씬 textarea 값을 저장했을 때 `currentScenes`, legacy `mvScenes`, 신규 `marketing.mv.scenes`가 함께 갱신되는지 확인합니다.

4. `MV_중복함수_정리계획.md`
   - `saveScenePrompt` 정리 완료로 갱신

### 검증

```text
node tests/mv_save_scene_prompt_smoke.js
MV save scene prompt smoke test: PASS

node tests/mv_duplicate_ownership_check.js
MV duplicate ownership check: PASS

node tests/mv_model_storage_smoke.js
MV storage smoke test: PASS

node tests/mv_copy_prompts_smoke.js
MV copy prompts smoke test: PASS
```

문법 검사:

```text
node --check app.js
node --check js/step6.js
node --check tests/mv_save_scene_prompt_smoke.js
node --check tests/mv_duplicate_ownership_check.js
node --check tests/mv_model_storage_smoke.js
node --check tests/mv_copy_prompts_smoke.js
```

모두 통과.

### 남은 중복 함수

- `initializeTagButtons`
- `regenerateMVPrompt`
- `syncMVPromptTranslation`
- `syncSceneOverviewPromptTranslation`
- `syncScenePromptTranslation`

### 다음 개선 예정

다음 후보는 번역 계열보다 위험이 낮은 `initializeTagButtons`입니다. 다만 태그 UI 전체에 영향을 줄 수 있으므로 두 구현의 이벤트 처리 차이를 먼저 비교해야 합니다.

## 2026-05-06: 다섯 번째 중복 함수 정리 - initializeTagButtons

### 작업 목적

태그 버튼 클릭 이벤트 초기화 함수인 `initializeTagButtons`의 소유권을 `js/step6.js`로 넘겼습니다.

### 확인 내용

- `app.js` 구현은 태그 컨테이너를 복제한 뒤 이벤트 리스너를 다시 붙여 중복 리스너 누적을 방지했습니다.
- `js/step6.js` 구현은 `addEventListener`를 반복 호출할 수 있어, 초기화가 여러 번 실행될 경우 클릭 이벤트가 중복 실행될 위험이 있었습니다.
- 따라서 `js/step6.js` 구현을 `app.js` 방식처럼 컨테이너 복제 기반으로 보강했습니다.

### 변경 내용

1. `js/step6.js`
   - `initializeTagButtons()`를 컨테이너 복제 후 이벤트 리스너 재등록 방식으로 변경
   - `mvLocationTags` 클릭 시 `saveMVSettings()` 호출 흐름 유지

2. `app.js`
   - `window.initializeTagButtons`를 더 이상 덮어쓰지 않도록 변경했습니다.
   - 기존 함수는 `window.initializeTagButtonsLegacyUnused`로 이름 변경했습니다.

3. `tests/mv_duplicate_ownership_check.js`
   - 중복 함수 기대 목록에서 `initializeTagButtons` 제거

4. `tests/mv_tag_buttons_smoke.js`
   - 새 테스트 추가
   - 초기화를 여러 번 호출해도 태그 클릭 한 번에 `saveMVSettings()`가 한 번만 호출되는지 확인

5. `MV_중복함수_정리계획.md`
   - `initializeTagButtons` 정리 완료로 갱신

### 검증

```text
node tests/mv_tag_buttons_smoke.js
MV tag buttons smoke test: PASS

node tests/mv_duplicate_ownership_check.js
MV duplicate ownership check: PASS

node tests/mv_model_storage_smoke.js
MV storage smoke test: PASS

node tests/mv_copy_prompts_smoke.js
MV copy prompts smoke test: PASS

node tests/mv_save_scene_prompt_smoke.js
MV save scene prompt smoke test: PASS
```

문법 검사:

```text
node --check app.js
node --check js/step6.js
node --check tests/mv_tag_buttons_smoke.js
node --check tests/mv_duplicate_ownership_check.js
node --check tests/mv_model_storage_smoke.js
node --check tests/mv_copy_prompts_smoke.js
node --check tests/mv_save_scene_prompt_smoke.js
```

모두 통과.

### 남은 중복 함수

- `regenerateMVPrompt`
- `syncMVPromptTranslation`
- `syncSceneOverviewPromptTranslation`
- `syncScenePromptTranslation`

### 다음 개선 예정

남은 함수들은 AI 재생성/번역 계열입니다. 다음 후보는 `syncMVPromptTranslation`이며, 영어/한글 프롬프트 동기화와 저장 데이터에 직접 영향을 주므로 두 구현의 데이터 갱신 차이를 먼저 비교해야 합니다.

## 2026-05-06: 여섯 번째 중복 함수 정리 - syncMVPromptTranslation

### 작업 목적

MV 대표 프롬프트의 영어/한글 상호 번역 함수인 `syncMVPromptTranslation`의 소유권을 `js/step6.js`로 넘겼습니다.

### 확인 내용

- `app.js`와 `js/step6.js` 구현은 프롬프트 타입별 textarea 매핑과 번역 호출 흐름이 거의 동일했습니다.
- `js/step6.js` 구현에는 번역 후 `saveCurrentProject()` 호출이 있어, 사용자가 수정한 프롬프트가 통합 저장 로직과 `marketing.mv` 동기화 흐름을 타게 됩니다.
- 따라서 `js/step6.js` 구현을 실제 사용 함수로 유지했습니다.

### 변경 내용

1. `app.js`
   - `window.syncMVPromptTranslation`을 더 이상 덮어쓰지 않도록 변경했습니다.
   - 기존 함수는 `window.syncMVPromptTranslationLegacyUnused`로 이름 변경했습니다.

2. `tests/mv_duplicate_ownership_check.js`
   - 중복 함수 기대 목록에서 `syncMVPromptTranslation` 제거

3. `tests/mv_sync_prompt_translation_smoke.js`
   - 새 테스트 추가
   - 영어 수정 시 한글 번역이 반영되는지 확인
   - 한글 수정 시 영어 번역이 반영되는지 확인
   - 각 번역 후 `saveCurrentProject()`가 호출되는지 확인

4. `MV_중복함수_정리계획.md`
   - `syncMVPromptTranslation` 정리 완료로 갱신

### 검증

```text
node tests/mv_sync_prompt_translation_smoke.js
MV sync prompt translation smoke test: PASS

node tests/mv_duplicate_ownership_check.js
MV duplicate ownership check: PASS

node tests/mv_model_storage_smoke.js
MV storage smoke test: PASS

node tests/mv_copy_prompts_smoke.js
MV copy prompts smoke test: PASS

node tests/mv_save_scene_prompt_smoke.js
MV save scene prompt smoke test: PASS

node tests/mv_tag_buttons_smoke.js
MV tag buttons smoke test: PASS
```

문법 검사:

```text
node --check app.js
node --check js/step6.js
node --check tests/mv_sync_prompt_translation_smoke.js
node --check tests/mv_duplicate_ownership_check.js
node --check tests/mv_model_storage_smoke.js
node --check tests/mv_copy_prompts_smoke.js
node --check tests/mv_save_scene_prompt_smoke.js
node --check tests/mv_tag_buttons_smoke.js
```

모두 통과.

### 남은 중복 함수

- `regenerateMVPrompt`
- `syncSceneOverviewPromptTranslation`
- `syncScenePromptTranslation`

### 다음 개선 예정

다음 후보는 씬 개요 번역 함수인 `syncSceneOverviewPromptTranslation`입니다. 씬별 요약 프롬프트 저장에 직접 연결되므로, 두 구현의 저장 대상과 호출 시점을 먼저 비교한 뒤 진행합니다.

## 2026-05-06: 일곱 번째 중복 함수 정리 - syncSceneOverviewPromptTranslation

### 작업 목적

씬 개요 프롬프트의 영어/한글 상호 번역 함수인 `syncSceneOverviewPromptTranslation`의 소유권을 `js/step6.js`로 넘겼습니다.

### 확인 내용

- `app.js`와 `js/step6.js` 구현은 한글/영어 혼합 텍스트 정리, 번역 호출, `window.currentScenes` 갱신 방식이 동일했습니다.
- `js/step6.js` 구현에는 번역 작업 후 `saveCurrentProject()` 호출이 있어, 씬 개요 프롬프트 변경이 저장 흐름에 즉시 반영됩니다.
- 따라서 `js/step6.js` 구현을 실제 사용 함수로 유지했습니다.

### 변경 내용

1. `app.js`
   - `window.syncSceneOverviewPromptTranslation`을 더 이상 덮어쓰지 않도록 변경했습니다.
   - 기존 함수는 `window.syncSceneOverviewPromptTranslationLegacyUnused`로 이름 변경했습니다.

2. `tests/mv_duplicate_ownership_check.js`
   - 중복 함수 기대 목록에서 `syncSceneOverviewPromptTranslation` 제거

3. `tests/mv_sync_scene_overview_translation_smoke.js`
   - 새 테스트 추가
   - 영어 개요 수정 시 한글 번역, 한글 제거, `currentScenes` 갱신, 저장 호출을 확인
   - 한글 개요 수정 시 영어 번역, 영어 단어 제거, `currentScenes` 갱신, 저장 호출을 확인

4. `MV_중복함수_정리계획.md`
   - `syncSceneOverviewPromptTranslation` 정리 완료로 갱신

### 검증

```text
node tests/mv_sync_scene_overview_translation_smoke.js
MV sync scene overview translation smoke test: PASS

node tests/mv_duplicate_ownership_check.js
MV duplicate ownership check: PASS

node tests/mv_sync_prompt_translation_smoke.js
MV sync prompt translation smoke test: PASS

node tests/mv_model_storage_smoke.js
MV storage smoke test: PASS

node tests/mv_copy_prompts_smoke.js
MV copy prompts smoke test: PASS

node tests/mv_save_scene_prompt_smoke.js
MV save scene prompt smoke test: PASS

node tests/mv_tag_buttons_smoke.js
MV tag buttons smoke test: PASS
```

문법 검사:

```text
node --check app.js
node --check js/step6.js
node --check tests/mv_sync_scene_overview_translation_smoke.js
node --check tests/mv_duplicate_ownership_check.js
node --check tests/mv_sync_prompt_translation_smoke.js
node --check tests/mv_model_storage_smoke.js
node --check tests/mv_copy_prompts_smoke.js
node --check tests/mv_save_scene_prompt_smoke.js
node --check tests/mv_tag_buttons_smoke.js
```

모두 통과.

### 남은 중복 함수

- `regenerateMVPrompt`
- `syncScenePromptTranslation`

### 다음 개선 예정

다음 후보는 결과 섹션의 씬별 프롬프트 번역 함수인 `syncScenePromptTranslation`입니다. 씬 개요와 비슷하지만 다른 textarea ID를 사용하므로 별도 테스트로 저장 흐름을 확인한 뒤 진행합니다.

## 2026-05-06: 여덟 번째 중복 함수 정리 - syncScenePromptTranslation

### 작업 목적

결과 섹션의 씬별 프롬프트 영어/한글 상호 번역 함수인 `syncScenePromptTranslation`의 소유권을 `js/step6.js`로 넘겼습니다.

### 확인 내용

- `app.js`와 `js/step6.js` 구현은 `scene_{index}_en`, `scene_{index}_ko` textarea를 대상으로 같은 번역 및 `window.currentScenes` 갱신 흐름을 사용했습니다.
- `js/step6.js` 구현에는 번역 작업 후 `saveCurrentProject()` 호출이 있어, 사용자가 결과 섹션에서 수정한 씬 프롬프트가 즉시 저장 흐름에 반영됩니다.
- 따라서 `js/step6.js` 구현을 실제 사용 함수로 유지했습니다.

### 변경 내용

1. `app.js`
   - `window.syncScenePromptTranslation`을 더 이상 덮어쓰지 않도록 변경했습니다.
   - 기존 함수는 `window.syncScenePromptTranslationLegacyUnused`로 이름 변경했습니다.

2. `tests/mv_duplicate_ownership_check.js`
   - 중복 함수 기대 목록에서 `syncScenePromptTranslation` 제거

3. `tests/mv_sync_scene_prompt_translation_smoke.js`
   - 새 테스트 추가
   - 영어 씬 프롬프트 수정 시 한글 번역, `currentScenes` 갱신, 저장 호출을 확인
   - 한글 씬 프롬프트 수정 시 영어 번역, `currentScenes` 갱신, 저장 호출을 확인

4. `MV_중복함수_정리계획.md`
   - `syncScenePromptTranslation` 정리 완료로 갱신

### 검증

```text
node tests/mv_sync_scene_prompt_translation_smoke.js
MV sync scene prompt translation smoke test: PASS

node tests/mv_duplicate_ownership_check.js
MV duplicate ownership check: PASS

node tests/mv_sync_scene_overview_translation_smoke.js
MV sync scene overview translation smoke test: PASS

node tests/mv_sync_prompt_translation_smoke.js
MV sync prompt translation smoke test: PASS

node tests/mv_model_storage_smoke.js
MV storage smoke test: PASS

node tests/mv_copy_prompts_smoke.js
MV copy prompts smoke test: PASS

node tests/mv_save_scene_prompt_smoke.js
MV save scene prompt smoke test: PASS

node tests/mv_tag_buttons_smoke.js
MV tag buttons smoke test: PASS
```

문법 검사:

```text
node --check app.js
node --check js/step6.js
node --check tests/mv_sync_scene_prompt_translation_smoke.js
node --check tests/mv_duplicate_ownership_check.js
node --check tests/mv_sync_scene_overview_translation_smoke.js
node --check tests/mv_sync_prompt_translation_smoke.js
node --check tests/mv_model_storage_smoke.js
node --check tests/mv_copy_prompts_smoke.js
node --check tests/mv_save_scene_prompt_smoke.js
node --check tests/mv_tag_buttons_smoke.js
```

모두 통과.

### 남은 중복 함수

- `regenerateMVPrompt`

### 다음 개선 예정

마지막 남은 중복 함수는 `regenerateMVPrompt`입니다. AI 재생성 호출과 API 응답 처리에 닿는 함수라, 단순 소유권 이관 전에 두 구현의 프롬프트 생성 방식과 실패 처리 차이를 먼저 비교해야 합니다.

## 2026-05-06: 아홉 번째 중복 함수 정리 - regenerateMVPrompt

### 작업 목적

MV 대표/배경/인물 프롬프트 재생성 진입 함수인 `regenerateMVPrompt`의 소유권을 `js/step6.js`로 넘겼습니다.

### 확인 내용

- `app.js` 구현은 구형 `generateMVThumbnailPrompts()` 호출 흐름을 사용했습니다.
- `js/step6.js` 구현은 최신 `regenerateSingleStylePrompt(type)` 호출 흐름을 사용해 선택한 타입만 재생성합니다.
- `app.js` 구현에는 개요 섹션 복사 버튼 상태를 복원하는 처리가 있었으므로, 이 부분은 `js/step6.js` 구현에 보강했습니다.

### 변경 내용

1. `js/step6.js`
   - `regenerateMVPrompt()`에서 메인 복사 버튼뿐 아니라 개요 섹션 복사 버튼도 재생성 후 복사 가능 상태로 되돌리도록 보강

2. `app.js`
   - `window.regenerateMVPrompt`을 더 이상 덮어쓰지 않도록 변경했습니다.
   - 기존 함수는 `window.regenerateMVPromptLegacyUnused`로 이름 변경했습니다.

3. `tests/mv_duplicate_ownership_check.js`
   - 중복 함수 기대 목록을 빈 목록으로 갱신

4. `tests/mv_regenerate_prompt_ownership_smoke.js`
   - 새 테스트 추가
   - `regenerateMVPrompt("thumbnail")`이 `regenerateSingleStylePrompt("thumbnail")`을 호출하는지 확인
   - 메인 복사 버튼과 개요 섹션 복사 버튼 상태가 모두 복원되는지 확인

5. `MV_중복함수_정리계획.md`
   - `regenerateMVPrompt` 정리 완료로 갱신

### 검증

```text
node tests/mv_regenerate_prompt_ownership_smoke.js
MV regenerate prompt ownership smoke test: PASS

node tests/mv_duplicate_ownership_check.js
MV duplicate ownership check: PASS

node tests/mv_sync_scene_prompt_translation_smoke.js
MV sync scene prompt translation smoke test: PASS

node tests/mv_sync_scene_overview_translation_smoke.js
MV sync scene overview translation smoke test: PASS

node tests/mv_sync_prompt_translation_smoke.js
MV sync prompt translation smoke test: PASS

node tests/mv_model_storage_smoke.js
MV storage smoke test: PASS

node tests/mv_copy_prompts_smoke.js
MV copy prompts smoke test: PASS

node tests/mv_save_scene_prompt_smoke.js
MV save scene prompt smoke test: PASS

node tests/mv_tag_buttons_smoke.js
MV tag buttons smoke test: PASS
```

문법 검사:

```text
node --check app.js
node --check js/step6.js
node --check tests/mv_regenerate_prompt_ownership_smoke.js
node --check tests/mv_duplicate_ownership_check.js
node --check tests/mv_sync_scene_prompt_translation_smoke.js
node --check tests/mv_sync_scene_overview_translation_smoke.js
node --check tests/mv_sync_prompt_translation_smoke.js
node --check tests/mv_model_storage_smoke.js
node --check tests/mv_copy_prompts_smoke.js
node --check tests/mv_save_scene_prompt_smoke.js
node --check tests/mv_tag_buttons_smoke.js
```

모두 통과.

### 남은 중복 함수

확인된 MV 중복 전역 함수 정리는 완료되었습니다.

### 다음 개선 예정

다음 단계는 정리된 함수들이 실제 화면 로드 순서에서 `js/step6.js` 소유권으로 안정적으로 동작하는지 브라우저에서 확인하거나, `LegacyUnused`로 남긴 함수들을 삭제 가능한지 별도 정리 단계로 검토하는 것입니다.

## 2026-05-06: 레거시 중복 함수 삭제 정리

### 작업 목적

소유권 이관 후 `app.js`에 `LegacyUnused` 이름으로 남겨둔 MV 레거시 함수들을 삭제했습니다.

### 확인 내용

- `LegacyUnused` 함수들은 실제 코드, `index.html`, 테스트에서 호출되지 않았습니다.
- 실제 실행 함수는 모두 `js/step6.js`에 남아 있습니다.
- 삭제 후 `app.js` 문법 검사를 통과했습니다.

### 삭제한 레거시 함수

- `copyAllMVPromptsLegacyUnused`
- `generateMVDetailPromptsLegacyUnused`
- `syncMVPromptTranslationLegacyUnused`
- `syncSceneOverviewPromptTranslationLegacyUnused`
- `syncScenePromptTranslationLegacyUnused`
- `regenerateMVPromptLegacyUnused`
- `saveScenePromptLegacyUnused`
- `initializeTagButtonsLegacyUnused`
- `getMVLocationValuesLegacyUnused`

### 변경 내용

1. `app.js`
   - 위 레거시 함수 블록 삭제

2. `tests/mv_duplicate_ownership_check.js`
   - 중복 함수 기대 목록은 빈 목록으로 유지
   - `LegacyUnused` 문자열이 `app.js`, `js/step6.js`에 다시 생기면 실패하도록 보호 검사 추가

3. `MV_중복함수_정리계획.md`
   - 레거시 함수 삭제 상태 반영

### 검증

```text
node tests/mv_duplicate_ownership_check.js
MV duplicate ownership check: PASS
{}

node --check app.js
node --check js/step6.js
node --check tests/mv_duplicate_ownership_check.js
```

나머지 MV 보호 테스트도 함께 재실행했습니다.

## 2026-05-06: Chrome 런타임 로드 검증 추가

### 작업 목적

정적 코드 검사와 Node 스모크 테스트를 넘어, 실제 Chrome에서 `index.html`이 스크립트를 로드했을 때 MV 함수 소유권이 유지되는지 확인했습니다.

### 변경 내용

1. `tests/mv_chrome_runtime_check.js`
   - Google Chrome을 headless 모드로 실행
   - `http://localhost:4173` 페이지 로드
   - DevTools Protocol로 브라우저 런타임 값을 직접 검사
   - MV 핵심 전역 함수들이 모두 `function`으로 존재하는지 확인
   - `LegacyUnused` 전역 키가 없는지 확인
   - MV 재생성 버튼과 핵심 textarea가 DOM에 존재하는지 확인

2. 실패했던 Playwright spec 방식은 제거
   - 프로젝트에 `@playwright/test` 로컬 의존성이 없어 spec 방식 대신 의존성 없는 Chrome CDP 테스트로 전환했습니다.

### 검증

```text
node tests/mv_chrome_runtime_check.js
MV Chrome runtime check: PASS

node tests/mv_duplicate_ownership_check.js
MV duplicate ownership check: PASS
{}

node tests/mv_regenerate_prompt_ownership_smoke.js
MV regenerate prompt ownership smoke test: PASS
```

기존 MV 보호 테스트와 문법 검사도 함께 통과했습니다.

## 2026-05-06: 단일 스타일 프롬프트 재생성 저장 보강

### 작업 목적

`regenerateSingleStylePrompt()`가 AI 재생성 결과를 textarea에 프로그램으로 반영한 뒤 프로젝트 저장까지 수행하도록 보강했습니다.

### 확인 내용

- textarea의 `oninput`은 사용자가 직접 입력할 때만 실행됩니다.
- AI 재생성처럼 코드가 `.value`를 직접 변경하는 경우에는 저장이 자동으로 호출되지 않을 수 있습니다.
- 따라서 재생성 성공 후 `saveCurrentProject()`를 명시 호출하도록 변경했습니다.

### 변경 내용

1. `js/step6.js`
   - 단일 스타일 프롬프트 재생성 성공 시 `saveCurrentProject()` 호출 추가

2. `tests/mv_regenerate_single_style_prompt_smoke.js`
   - 새 테스트 추가
   - 성공 시 리뷰/메인 textarea가 모두 갱신되는지 확인
   - 성공 시 `saveCurrentProject()`가 호출되는지 확인
   - API 실패 시 기존 textarea 값이 유지되고 저장이 추가 호출되지 않는지 확인

### 검증

```text
node tests/mv_regenerate_single_style_prompt_smoke.js
MV regenerate single style prompt smoke test: PASS
```

## 2026-05-06: 전체 스타일 프롬프트 재생성 보호 보강

### 작업 목적

`regenerateStylePrompts()`가 빈 재생성 결과로 기존 리뷰 프롬프트를 덮어쓰지 않도록 보강했습니다.

### 확인 내용

- 전체 재생성은 `generateMVThumbnailPrompts()` 결과를 리뷰 textarea 6개에 반영합니다.
- 기존 구현은 반환 객체가 존재하기만 하면 각 값을 반영했기 때문에, 빈 결과 객체가 들어오면 기존 textarea가 빈 값으로 덮일 수 있었습니다.
- 이제 실제 프롬프트 값이 하나라도 있을 때만 갱신하고 저장합니다.

### 변경 내용

1. `js/step6.js`
   - `regenerateStylePrompts()`에서 생성 결과의 실제 텍스트 존재 여부 확인 추가
   - 빈 결과일 때 기존 textarea 값을 유지하고 안내 메시지만 표시

2. `tests/mv_regenerate_style_prompts_smoke.js`
   - 새 테스트 추가
   - 성공 시 리뷰 textarea 6개가 갱신되고 저장이 1회 호출되는지 확인
   - 빈 결과 시 기존 값이 유지되고 저장이 추가 호출되지 않는지 확인

### 검증

```text
node tests/mv_regenerate_style_prompts_smoke.js
MV regenerate style prompts smoke test: PASS
```

## 2026-05-06: 썸네일/배경/인물 프롬프트 생성기 보호 테스트 추가

### 작업 목적

`generateMVThumbnailPrompts()`의 AI 응답 보정과 기본 폴백 흐름을 테스트로 보호했습니다.

### 확인 내용

- Gemini 응답이 영어 프롬프트만 제공하는 경우, 한글 프롬프트는 `translateEnglishToKoreanForScene()`로 보완됩니다.
- Gemini API 키가 없거나 AI 생성이 불가능한 경우, 기본 프롬프트 생성 로직이 썸네일/배경/인물 영어 프롬프트를 만듭니다.
- 생성 결과는 메인 MV textarea에도 반영됩니다.

### 변경 내용

1. `tests/mv_generate_thumbnail_prompts_smoke.js`
   - 새 테스트 추가
   - AI 영어-only 응답에서 한글 번역 보완 확인
   - API 키 없음 상태에서 기본 프롬프트 폴백 확인
   - 메인 textarea 업데이트 확인

### 검증

```text
node tests/mv_generate_thumbnail_prompts_smoke.js
MV generate thumbnail prompts smoke test: PASS
```

## 2026-05-06: 씬별 프롬프트 재생성 보호 보강

### 작업 목적

`regenerateScenePrompt()`의 성공, 기본 폴백, API 실패, 빈 AI 응답 흐름을 테스트로 보호했습니다.

### 확인 내용

- Gemini 성공 시 영어 프롬프트가 갱신되고 `syncScenePromptTranslation()`을 통해 한글 번역과 `currentScenes` 갱신 흐름을 탑니다.
- Gemini API 키가 없으면 기본 프롬프트 폴백을 생성합니다.
- Gemini 실패 시 기존 textarea 값과 씬 데이터를 유지해야 합니다.
- Gemini가 빈 응답을 반환하면 성공 메시지를 표시하지 않고 오류로 처리해야 합니다.

### 변경 내용

1. `js/step6.js`
   - `regenerateScenePrompt()`에서 Gemini 응답이 비어 있으면 오류로 처리하도록 보강

2. `tests/mv_regenerate_scene_prompt_smoke.js`
   - 새 테스트 추가
   - Gemini 성공, API 키 없음 폴백, API 실패, 빈 응답 보존 흐름 확인

### 검증

```text
node tests/mv_regenerate_scene_prompt_smoke.js
MV regenerate scene prompt smoke test: PASS
```

## 2026-05-06: 씬 개요 프롬프트 재생성 보호 보강

### 작업 목적

`regenerateSceneOverviewPrompt()`의 성공 저장, 한글 누락 시 번역 보완, API 키 없음 폴백, 실패 보존 흐름을 테스트로 보호했습니다.

### 확인 내용

- AI가 영어/한글을 모두 반환하면 `currentScenes`와 프로젝트 저장까지 반영되어야 합니다.
- AI가 영어만 반환하면 `syncSceneOverviewPromptTranslation()`으로 한글 번역과 저장 흐름을 타야 합니다.
- API 키가 없을 때도 기본 개요 프롬프트를 생성해야 합니다.
- API 실패 또는 빈 응답에서는 기존 textarea 값을 보존해야 합니다.

### 변경 내용

1. `js/step6.js`
   - AI가 한글까지 반환한 경우에도 `currentScenes` 갱신 및 `saveCurrentProject()` 호출 추가
   - Gemini API 키가 없을 때 기본 개요 프롬프트 폴백 생성 추가

2. `tests/mv_regenerate_scene_overview_prompt_smoke.js`
   - 새 테스트 추가
   - AI 성공, 한글 누락 보완, API 키 없음 폴백, API 실패, 빈 응답 보존 확인

### 검증

```text
node tests/mv_regenerate_scene_overview_prompt_smoke.js
MV regenerate scene overview prompt smoke test: PASS
```

## 2026-05-06: 씬 개요 확정 및 결과 렌더링 보호 테스트 추가

### 작업 목적

`confirmSceneOverviewAndGenerate()`가 씬 개요 화면에서 결과 화면으로 넘어갈 때 기존 씬 프롬프트를 보존하고, 누락된 한글 프롬프트만 자동 번역하는지 테스트로 보호했습니다.

### 확인 내용

- 결과 섹션은 표시되고 씬 개요 섹션은 숨겨져야 합니다.
- silent 복원 모드에서는 스크롤이 발생하지 않아야 합니다.
- 기존 영어/한글 씬 프롬프트는 결과 textarea에 그대로 렌더링되어야 합니다.
- 영어만 있는 씬은 한글 번역을 보완해야 합니다.
- `currentProject.data.marketing.mvScenes`가 현재 씬 배열을 참조해야 합니다.

### 변경 내용

1. `tests/mv_confirm_scene_overview_smoke.js`
   - 새 테스트 추가
   - 결과 화면 표시/숨김 상태, 씬 textarea 값 보존, 한글 자동 번역, 프로젝트 데이터 반영 확인

### 검증

```text
node tests/mv_confirm_scene_overview_smoke.js
MV confirm scene overview smoke test: PASS
```

## 2026-05-06: MV 보호 테스트 통합 실행 스크립트 추가

### 작업 목적

MV 개선 작업 후 전체 보호 테스트를 한 명령으로 실행할 수 있도록 통합 러너를 추가했습니다.

### 변경 내용

1. `tests/run_mv_smoke_tests.js`
   - `app.js`, `js/step6.js` 문법 검사 실행
   - 모든 MV 보호 테스트 파일 문법 검사 실행
   - 모든 MV 보호 테스트 순차 실행
   - 중간 실패 시 즉시 종료

2. `package.json`
   - `npm run test:mv` 스크립트 추가

### 실행 방법

```text
npm run test:mv
```

### 검증

```text
npm run test:mv
MV smoke test suite: PASS (37 checks)
```

## 2026-05-06: MV 캐릭터 시트 보조 함수 보호 테스트 추가

### 작업 목적

캐릭터 시트 보조 함수를 향후 `js/step6.js`로 이관하기 전에 현재 동작을 테스트로 고정했습니다.

### 변경 내용

1. `tests/mv_character_sheet_helpers_smoke.js`
   - 캐릭터 시트 영역 보기/숨기기 토글 확인
   - 캐릭터 시트 클립보드 복사와 폴백 복사 확인
   - 빈 캐릭터 시트 복사 방지 확인
   - 프롬프트 주입용 요약 추출 확인
   - 전체 캐릭터 시트 원본 결합 확인

2. `tests/run_mv_smoke_tests.js`
   - 캐릭터 시트 보조 함수 테스트를 통합 실행 목록에 추가

3. `MV_테스트_실행_가이드.md`
   - 현재 보호 범위에 캐릭터 시트 보조 함수 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (39 checks)
```

## 2026-05-06: MV 캐릭터 입력 UI 보호 테스트 추가

### 작업 목적

`updateCharacterInputs`를 향후 `js/step6.js`로 이관하기 전에, 인물 수 변경과 UI 재생성 과정에서 기존 캐릭터 설정과 캐릭터 시트가 보존되는지 테스트로 고정했습니다.

### 변경 내용

1. `tests/mv_update_character_inputs_smoke.js`
   - 인물 수에 맞는 캐릭터 입력 UI 생성 확인
   - 캐릭터 시트 생성/토글/복사 버튼 연결 확인
   - 기존 성별, 나이, 인종, 외모, Art Style 복원 확인
   - 기존 캐릭터 시트 텍스트와 시트 영역 표시 상태 복원 확인
   - 인물 수 감소 시 남은 인물의 기존 시트 보존 확인

2. `tests/run_mv_smoke_tests.js`
   - 캐릭터 입력 UI 보호 테스트를 통합 실행 목록에 추가

3. `MV_테스트_실행_가이드.md`
   - 현재 보호 범위에 캐릭터 입력 UI 생성/복원 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (41 checks)
```

## 2026-05-06: MV 캐릭터 시트 생성 보호 테스트 추가

### 작업 목적

`generateCharacterSheet`를 향후 `js/step6.js`로 이관하기 전에, AI 캐릭터 시트 생성의 핵심 성공/가드/저장 흐름을 테스트로 고정했습니다.

### 변경 내용

1. `tests/mv_generate_character_sheet_smoke.js`
   - Gemini 요청 프롬프트에 캐릭터 고정 요소, MV 장소, 가사 맥락이 포함되는지 확인
   - AI 응답 코드 블록 정리 후 캐릭터 시트 textarea에 반영되는지 확인
   - 시트 영역/토글/복사 버튼 표시 상태 확인
   - 생성 후 `saveMVSettings` 호출 확인
   - 입력값이 없는 경우 생성 차단 확인
   - Gemini API 키가 없는 경우 생성 차단 확인

2. `tests/run_mv_smoke_tests.js`
   - 캐릭터 시트 생성 보호 테스트를 통합 실행 목록에 추가

3. `MV_테스트_실행_가이드.md`
   - 현재 보호 범위에 캐릭터 시트 생성 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (43 checks)
```

## 2026-05-06: MV 장소 헬퍼 보호 테스트 추가

### 작업 목적

`pickBestLocationForScene`, `getMVLocationEnString`, `getMVLocationKoString`을 향후 `js/step6.js`로 이관하기 전에 장소 매핑과 씬 가사 기반 장소 선택 동작을 테스트로 고정했습니다.

### 변경 내용

1. `tests/mv_location_helpers_smoke.js`
   - 선택된 장소 태그의 영어 문자열 변환 확인
   - 선택된 장소 태그의 한글 문자열 변환 확인
   - 씬 가사 키워드 기반 최적 장소 선택 확인
   - 키워드가 없을 때 씬 인덱스 기반 순환 선택 확인
   - 선택 장소가 없거나 1개만 있는 경우의 경계값 확인

2. `tests/run_mv_smoke_tests.js`
   - 장소 헬퍼 보호 테스트를 통합 실행 목록에 추가

3. `MV_테스트_실행_가이드.md`
   - 현재 보호 범위에 MV 장소 헬퍼 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (45 checks)
```

## 2026-05-06: MV 프롬프트 보조 함수 보호 테스트 추가

### 작업 목적

`updateMVPromptTranslation`, `saveMVPrompt`, `copyMVPromptSection`을 향후 `js/step6.js`로 이관하기 전에 로컬 저장 키, 복사 포맷, 간단 번역 흐름을 테스트로 고정했습니다.

### 변경 내용

1. `tests/mv_prompt_helpers_smoke.js`
   - 한글 프롬프트 입력 시 영어 프롬프트 자동 번역 확인
   - 한글 프롬프트가 비어 있을 때 영어 필드 초기화 확인
   - 프롬프트 저장 시 `mvPrompt_{type}` localStorage 키와 저장 payload 확인
   - 프롬프트 섹션 복사 포맷 확인
   - 클립보드 복사 실패 시 오류 알림 확인

2. `tests/run_mv_smoke_tests.js`
   - MV 프롬프트 보조 함수 테스트를 통합 실행 목록에 추가

3. `MV_테스트_실행_가이드.md`
   - 현재 보호 범위에 MV 프롬프트 저장/복사/간단 번역 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (47 checks)
```

## 2026-05-06: MV 씬 개요 저장/확정 함수 step6.js 이관

### 작업 목적

MV 씬 개요 저장과 결과 화면 렌더링을 담당하는 `saveSceneOverview`, `confirmSceneOverviewAndGenerate`를 `js/step6.js`로 옮겨 씬 생성 이후 흐름의 소유권을 정리했습니다.

### 변경 내용

1. `js/step6.js`
   - `saveSceneOverview` 추가
   - `confirmSceneOverviewAndGenerate` 추가

2. `app.js`
   - 위 2개 함수의 중복 전역 정의 제거

3. `tests/mv_confirm_scene_overview_smoke.js`
   - 테스트 기준 파일을 `app.js`에서 `js/step6.js`로 변경
   - 씬 개요 설명/영어/한글 프롬프트 저장 검증 추가
   - 저장된 씬 개요가 결과 화면 textarea에 반영되는지 확인

4. `MV_중복함수_정리계획.md`
   - 씬 개요 저장/확정 함수 이관 완료 기록 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (49 checks)
```

## 2026-05-06: MV SRT 내보내기 보호 테스트 추가

### 작업 목적

`copySRTContent`, `downloadSRT`를 향후 `js/step6.js`로 이관하기 전에 SRT 복사/다운로드 동작을 테스트로 고정했습니다.

### 변경 내용

1. `tests/mv_srt_export_smoke.js`
   - SRT 클립보드 복사 성공 흐름 확인
   - 클립보드 실패 시 textarea 폴백 복사 확인
   - SRT 다운로드 파일명 정리 확인
   - 윈도우용 CRLF 줄바꿈 변환 확인
   - 빈 SRT 콘텐츠 다운로드 차단 확인

2. `tests/run_mv_smoke_tests.js`
   - SRT 내보내기 보호 테스트를 통합 실행 목록에 추가

3. `MV_테스트_실행_가이드.md`
   - 현재 보호 범위에 SRT 자막 복사/다운로드 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (51 checks)
```

## 2026-05-06: MV SRT 내보내기 함수 step6.js 이관

### 작업 목적

SRT 자막 복사/다운로드 함수 `copySRTContent`, `downloadSRT`를 `js/step6.js`로 옮겨 MV/SRT 결과물 내보내기 흐름을 MV 소유 파일에서 관리하도록 정리했습니다.

### 변경 내용

1. `js/step6.js`
   - `copySRTContent` 추가
   - `downloadSRT` 추가

2. `app.js`
   - 위 2개 함수의 중복 전역 정의 제거

3. `tests/mv_srt_export_smoke.js`
   - 테스트 기준 파일을 `app.js`에서 `js/step6.js`로 변경

4. `MV_중복함수_정리계획.md`
   - SRT 내보내기 함수 이관 완료 기록 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (51 checks)
```

## 2026-05-06: MV 프롬프트 다운로드 함수 step6.js 이관

### 작업 목적

MV 프롬프트 TXT 다운로드 함수 `downloadMVPrompts`를 `js/step6.js`로 옮겨 MV 결과물 내보내기 흐름을 MV 소유 파일에서 관리하도록 정리했습니다.

### 변경 내용

1. `js/step6.js`
   - `downloadMVPrompts` 추가

2. `app.js`
   - `downloadMVPrompts` 중복 전역 정의 제거

3. `tests/mv_download_prompts_smoke.js`
   - 테스트 기준 파일을 `app.js`에서 `js/step6.js`로 변경

4. `MV_중복함수_정리계획.md`
   - MV 프롬프트 다운로드 함수 이관 완료 기록 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (49 checks)
```

## 2026-05-06: MV 프롬프트 다운로드 보호 테스트 추가

### 작업 목적

`downloadMVPrompts`를 향후 `js/step6.js`로 이관하기 전에 TXT 다운로드 포맷과 빈 씬 가드 동작을 테스트로 고정했습니다.

### 변경 내용

1. `tests/mv_download_prompts_smoke.js`
   - 통합/배경/인물 프롬프트 다운로드 텍스트 포함 확인
   - 씬별 textarea 값 우선 사용 확인
   - textarea가 없을 때 `currentScenes` 값 fallback 확인
   - 다운로드 파일명 `mv-prompts.txt` 확인
   - 빈 씬 목록일 때 경고 알림 확인

2. `tests/run_mv_smoke_tests.js`
   - MV 프롬프트 다운로드 보호 테스트를 통합 실행 목록에 추가

3. `MV_테스트_실행_가이드.md`
   - 현재 보호 범위에 MV 프롬프트 TXT 다운로드 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS
```

## 2026-05-06: MV 프롬프트 보조 함수 step6.js 이관

### 작업 목적

MV 프롬프트 간단 번역, 저장, 섹션 복사 함수를 `js/step6.js`로 옮겨 MV 프롬프트 관련 조작 함수의 소유권을 더 일관되게 정리했습니다.

### 변경 내용

1. `js/step6.js`
   - `updateMVPromptTranslation` 추가
   - `saveMVPrompt` 추가
   - `copyMVPromptSection` 추가

2. `app.js`
   - 위 3개 함수의 중복 전역 정의 제거

3. `tests/mv_prompt_helpers_smoke.js`
   - 테스트 기준 파일을 `app.js`에서 `js/step6.js`로 변경

4. `MV_중복함수_정리계획.md`
   - 프롬프트 보조 함수 이관 완료 기록 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (47 checks)
```

## 2026-05-06: MV 장소 헬퍼 step6.js 이관

### 작업 목적

MV 씬 생성과 캐릭터 시트 생성에서 사용하는 장소 매핑/선택 헬퍼를 `js/step6.js`로 옮겨 MV 프롬프트 생성 흐름의 소유권을 더 일관되게 정리했습니다.

### 변경 내용

1. `js/step6.js`
   - `MV_LOCATION_MAP` 추가
   - `MV_LOCATION_KEYWORDS` 추가
   - `pickBestLocationForScene` 추가
   - `getMVLocationEnString` 추가
   - `getMVLocationKoString` 추가

2. `app.js`
   - 위 상수/함수의 중복 정의 제거

3. `tests/mv_location_helpers_smoke.js`
   - 테스트 기준 파일을 `app.js`에서 `js/step6.js`로 변경

4. `MV_중복함수_정리계획.md`
   - 장소 헬퍼 이관 완료 기록 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (45 checks)
```

## 2026-05-06: MV 캐릭터 시트 생성 함수 step6.js 이관

### 작업 목적

AI 기반 캐릭터 시트 생성 함수 `generateCharacterSheet`를 `js/step6.js`로 옮겨, MV 캐릭터 입력 UI와 캐릭터 시트 보조 함수가 같은 소유 파일에서 관리되도록 정리했습니다.

### 변경 내용

1. `js/step6.js`
   - `generateCharacterSheet` 추가
   - Gemini 생성, OpenAI 폴백, 시트 UI 반영, 설정 저장 흐름 유지

2. `app.js`
   - `generateCharacterSheet` 중복 전역 정의 제거

3. `tests/mv_generate_character_sheet_smoke.js`
   - 테스트 기준 파일을 `app.js`에서 `js/step6.js`로 변경

4. `MV_중복함수_정리계획.md`
   - `generateCharacterSheet` 이관 완료 기록 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (43 checks)
```

## 2026-05-06: MV 캐릭터 입력 UI 함수 step6.js 이관

### 작업 목적

MV 캐릭터 입력 UI 생성 함수 `updateCharacterInputs`를 `js/step6.js`로 옮겨, MV 설정/캐릭터 시트 보조 함수와 같은 소유 파일에서 관리되도록 정리했습니다.

### 변경 내용

1. `js/step6.js`
   - `updateCharacterInputs` 추가
   - 기존 입력값 백업/복원 흐름 유지
   - 캐릭터 시트 텍스트와 시트 버튼 표시 상태 복원 흐름 유지

2. `app.js`
   - `updateCharacterInputs` 중복 전역 정의 제거
   - AI 캐릭터 시트 생성 함수 `generateCharacterSheet`는 기존 위치 유지

3. `tests/mv_update_character_inputs_smoke.js`
   - 테스트 기준 파일을 `app.js`에서 `js/step6.js`로 변경

4. `MV_중복함수_정리계획.md`
   - `updateCharacterInputs` 이관 완료 기록 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (41 checks)
```

## 2026-05-06: MV 캐릭터 시트 보조 함수 step6.js 이관

### 작업 목적

MV 캐릭터 시트 보조 함수의 소유권을 `js/step6.js`로 옮겨, 캐릭터 시트 정보가 MV 프롬프트 생성 흐름과 같은 파일에서 관리되도록 정리했습니다.

### 변경 내용

1. `js/step6.js`
   - `toggleCharacterSheet` 추가
   - `copyCharacterSheet` 추가
   - `getCharacterSheetSummary` 추가
   - `getCharacterSheetFull` 추가
   - `getAllCharacterSheetsSummary` 추가
   - `getAllCharacterSheetsFull` 추가

2. `app.js`
   - 위 6개 함수의 중복 전역 정의 제거
   - AI 캐릭터 시트 생성 함수 `generateCharacterSheet`와 캐릭터 입력 UI 생성 함수 `updateCharacterInputs`는 기존 위치 유지

3. `tests/mv_character_sheet_helpers_smoke.js`
   - 테스트 기준 파일을 `app.js`에서 `js/step6.js`로 변경

4. `MV_중복함수_정리계획.md`
   - 캐릭터 시트 보조 함수 이관 완료 기록 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (39 checks)
```

## 2026-05-06: MV 설정 함수 step6.js 이관

### 작업 목적

MV 화면 설정 함수의 소유권을 `js/step6.js`로 옮겨, `app.js`는 공통 앱 흐름에 더 집중하도록 정리했습니다.

### 변경 내용

1. `js/step6.js`
   - `updateMVImageCount` 추가
   - `saveMVSettings` 추가
   - `loadMVSettings` 추가

2. `app.js`
   - 위 3개 함수의 중복 전역 정의 제거
   - `updateCharacterInputs` 등 나머지 캐릭터 UI 생성 함수는 기존 위치 유지

3. `tests/mv_settings_smoke.js`
   - 테스트 기준 파일을 `app.js`에서 `js/step6.js`로 변경

4. `MV_중복함수_정리계획.md`
   - MV 설정 함수 3개의 이관 완료 기록 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (37 checks)
```

## 2026-05-06: MV 테스트 정상 로그 추가 정리

### 작업 목적

통합 테스트 결과에서 정상 저장, 복사, 태그 초기화 로그가 핵심 결과를 흐리지 않도록 남은 출력 잡음을 정리했습니다.

### 변경 내용

1. 아래 테스트에서 정상 동작 중 발생하는 `console.log`를 숨기고, 최종 PASS 메시지만 출력하도록 정리했습니다.
   - `tests/mv_model_storage_smoke.js`
   - `tests/mv_copy_prompts_smoke.js`
   - `tests/mv_save_scene_prompt_smoke.js`
   - `tests/mv_tag_buttons_smoke.js`

2. `tests/mv_duplicate_ownership_check.js`에서 중복 없음 상태를 의미하는 빈 객체 `{}` 출력도 제거했습니다.

### 검증

```text
npm run test:mv
MV smoke test suite: PASS (35 checks)
```

## 2026-05-06: MV 테스트 실행 가이드 추가

### 작업 목적

개선 작업 전후에 어떤 명령으로 안정성을 확인해야 하는지, 실패 시 어떤 순서로 원인을 확인해야 하는지 문서화했습니다.

### 변경 내용

1. `MV_테스트_실행_가이드.md`
   - `npm run test:mv` 실행 방법 정리
   - 정상 결과 기준 정리
   - 현재 보호 테스트 범위 정리
   - 실패 시 확인 순서 정리
   - Chrome 런타임 테스트 참고사항 정리

### 검증 기준

가이드 기준 정상 결과:

```text
MV smoke test suite: PASS (35 checks)
```

## 2026-05-06: MV 설정 보호 테스트 추가

### 작업 목적

`saveMVSettings`, `loadMVSettings`, `updateMVImageCount`를 향후 `step6.js` 쪽으로 이관하기 전에 현재 동작을 테스트로 고정했습니다.

### 변경 내용

1. `tests/mv_settings_smoke.js`
   - MV 길이와 이미지 간격 기준 이미지 수 계산 확인
   - MV 설정이 `localStorage.mvSettings`와 현재 프로젝트 `marketing.mvSettings`에 저장되는지 확인
   - 캐릭터 상세 정보와 캐릭터 시트 저장 확인
   - 전역 설정 불러오기 시 태그 선택, 캐릭터 정보, 총 길이 표시 복원 확인

2. `tests/run_mv_smoke_tests.js`
   - MV 설정 보호 테스트를 통합 실행 목록에 추가

3. `MV_테스트_실행_가이드.md`
   - 현재 보호 범위에 MV 설정 저장/불러오기와 이미지 수 계산 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS
```

## 2026-05-06: MV 테스트 출력 정리

### 작업 목적

통합 테스트 실행 시 의도된 실패 경로 검증 로그가 실제 오류처럼 보이지 않도록 테스트 출력 품질을 정리했습니다.

### 변경 내용

1. 아래 테스트에서 예상된 `console.error`, `console.warn`, 진행 로그를 캡처하거나 숨김 처리했습니다.
   - `tests/mv_regenerate_single_style_prompt_smoke.js`
   - `tests/mv_regenerate_scene_prompt_smoke.js`
   - `tests/mv_regenerate_scene_overview_prompt_smoke.js`
   - `tests/mv_generate_thumbnail_prompts_smoke.js`
   - `tests/mv_confirm_scene_overview_smoke.js`

2. 테스트 자체가 실패할 경우에는 원래 `console.error`로 실패 내용을 출력하도록 유지했습니다.

### 검증

```text
npm run test:mv
MV smoke test suite: PASS
```

## 2026-05-06: MV 6단계 복원 로직 보호 테스트 추가

### 작업 목적

`restoreStepData(6)` 내부를 정리하기 전에 프로젝트 재진입 시 마케팅/MV 데이터가 현재처럼 복원되는지 테스트로 고정했습니다.

### 변경 내용

1. `tests/mv_restore_step6_smoke.js`
   - 유튜브/틱톡 설명, 해시태그, 썸네일 복원 확인
   - MV 설정값, 장소/동작 태그, 캐릭터 입력과 캐릭터 시트 복원 확인
   - 썸네일/배경/인물 프롬프트의 결과 영역과 검토 영역 동시 복원 확인
   - 씬 데이터 deep copy, 씬 개요 렌더링, 결과/개요 섹션 표시 상태 확인
   - 수정 모드와 프로젝트 미선택 상태에서는 안전하게 복원을 건너뛰는지 확인

2. `tests/run_mv_smoke_tests.js`
   - 6단계 복원 보호 테스트를 통합 실행 목록에 추가

3. `MV_테스트_실행_가이드.md`
   - 현재 보호 범위에 6단계 마케팅/MV 데이터 복원 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (53 checks)
```
