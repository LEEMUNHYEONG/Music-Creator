# MV 개선작업 이력

## 2026-05-06: MV 2차 고도화 - 인물 일관성 키워드 누락 경고

### 작업 목적

씬별 프롬프트가 인물 외형 설정을 빠뜨려 캐릭터가 흔들리는 문제를 줄이기 위해, 인물 외형 핵심 키워드 누락을 품질 요약에서 확인할 수 있도록 했습니다.

### 변경 내용

1. `js/step6.js`
   - `mvCharacter*_appearance` 입력값을 쉼표 단위 핵심 문구로 정리
   - 씬별 EN/KO 프롬프트와 인물 동작 텍스트에서 외형 키워드 누락 여부 확인
   - 품질 요약, 확인 팝업, 필터 버튼, 씬별 편집 요약에 `인물 누락` 표시

2. 테스트
   - `tests/mv_scene_timing_editor_smoke.js`에서 인물 키워드 누락 집계, 확인 필요 판정, 필터 이동 보호
   - `tests/mv_user_flow_integration_smoke.js`의 완료 씬 샘플을 인물 일관성 기준에 맞게 갱신

3. 문서
   - `MV_2차_고도화_로드맵.md`의 4단계 3번 완료 상태와 다음 후보 갱신
   - `MV_테스트_실행_가이드.md`와 `MV_운영_인계_요약.md`의 보호 범위 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (97 checks)
```

## 2026-05-06: MV 2차 고도화 - 씬 간 반복 패턴 경고

### 작업 목적

뮤직비디오 전체가 같은 배경, 구도, 카메라 움직임으로 단조롭게 반복되는 문제를 씬 확정 전에 확인할 수 있도록 품질 요약에 반복 패턴 경고를 추가했습니다.

### 변경 내용

1. `js/step6.js`
   - 씬 전체에서 반복되는 배경(`location`), 카메라(`cameraWork`), 구도 키워드를 집계
   - 반복 패턴이 일정 비율 이상 나타나면 해당 씬들을 확인 필요 항목으로 분류
   - 품질 요약, 확인 팝업, 필터 버튼, 씬별 편집 요약에 `반복 패턴` 표시
   - 반복 패턴 필터 선택 시 해당 씬 카드와 요약이 함께 갱신되도록 연결

2. 테스트
   - `tests/mv_scene_timing_editor_smoke.js`에서 반복 패턴 집계, 확인 필요 판정, 필터 이동 보호

3. 문서
   - `MV_2차_고도화_로드맵.md`의 4단계 2번 완료 상태와 다음 후보 갱신
   - `MV_테스트_실행_가이드.md`와 `MV_운영_인계_요약.md`의 보호 범위 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (97 checks)
```

## 2026-05-06: MV 2차 고도화 - 프롬프트 품질 정밀 점검

### 작업 목적

씬 확정 전에 영상 제작에 바로 쓰기 어려운 프롬프트를 더 빨리 찾을 수 있도록 길이, 금지어, 중복 표현, 장소/카메라 누락 점검을 품질 요약에 추가했습니다.

### 변경 내용

1. `js/step6.js`
   - 씬별 EN 프롬프트 단어 수, 금지어, 반복 표현을 품질 점검 항목으로 집계
   - 장소와 카메라 값을 별도 필수 점검 항목으로 분리
   - 품질 요약, 확인 팝업, 필터 버튼, 씬별 편집 요약에 새 확인 항목 표시
   - 장소/카메라가 비어 있을 때 편집 안내 문구 표시

2. 테스트
   - `tests/mv_confirm_scene_overview_smoke.js`에서 길이/금지어/중복/장소/카메라 확인 팝업 보호
   - `tests/mv_scene_timing_editor_smoke.js`에서 새 품질 요약과 필터 보호
   - `tests/mv_user_flow_integration_smoke.js`의 완료 씬 샘플을 새 품질 기준에 맞게 갱신

3. 문서
   - `MV_2차_고도화_로드맵.md`의 4단계 1번 완료 상태와 다음 후보 갱신
   - `MV_테스트_실행_가이드.md`와 `MV_운영_인계_요약.md`의 보호 범위 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (97 checks)
```

## 2026-05-06: MV 2차 고도화 - 단일 프로젝트 JSON 내보내기/가져오기

### 작업 목적

장기 MV 제작 프로젝트를 파일 하나로 백업하고 다시 가져올 수 있도록 단일 프로젝트 JSON 내보내기/가져오기 흐름을 정리했습니다.

### 변경 내용

1. `js/storage.js`
   - `buildSingleProjectJSONExport()`로 현재 프로젝트를 `music-creator-single-project` JSON 포맷으로 생성
   - `downloadSingleProjectJSON()`과 `exportCurrentProjectJSON()`으로 파일명 정리, 저장 전 저장 시도, 완료 안내 지원
   - `normalizeSingleProjectImportPayload()`와 `importSingleProjectJSONFromText()`로 가져오기 데이터 정규화, `marketing.mv` 보존, 로컬 프로젝트 저장소 반영
   - `importSingleProjectJSON()`로 파일 선택 기반 가져오기 흐름 지원

2. 테스트
   - `tests/mv_single_project_json_smoke.js`에서 JSON 내보내기, 파일명 정리, 저장 호출, 가져오기 저장소 반영 보호
   - `tests/mv_chrome_runtime_check.js`에서 새 전역 함수 노출 보호
   - `tests/run_mv_smoke_tests.js`에 단일 프로젝트 JSON 보호 테스트 추가

3. 문서
   - `MV_2차_고도화_로드맵.md`의 3단계 완료 상태와 다음 후보 갱신
   - `MV_테스트_실행_가이드.md`와 `MV_운영_인계_요약.md`의 자동 테스트 기준을 `PASS (97 checks)`로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (97 checks)
```

## 2026-05-06: MV 2차 고도화 - 저장 전후 씬 비교

### 작업 목적

프로젝트 저장 시 `marketing.mv`의 씬 개수, 첫 씬, 마지막 씬, 수정 시각이 저장 전후에 어떻게 달라졌는지 바로 확인할 수 있도록 비교 로그와 수동 진단 표시를 확장했습니다.

### 변경 내용

1. `js/storage.js`
   - `compareMarketingMVDiagnostics()`로 저장 전/후 진단 스냅샷 비교
   - `formatMarketingMVDiagnosticsComparison()`으로 사람이 읽는 비교 문구 생성
   - `saveCurrentProject()`에서 저장 전 스냅샷과 저장 후 스냅샷을 비교해 `MV marketing.mv save comparison` 로그 기록
   - 마지막 저장 비교 결과를 `showMarketingMVDiagnostics()` 수동 진단에 함께 표시

2. 테스트
   - `tests/mv_marketing_diagnostics_smoke.js`에서 비교 생성/포맷/수동 표시 보호
   - `tests/mv_model_storage_smoke.js`에서 저장 전후 비교 로그 보호
   - `tests/mv_chrome_runtime_check.js`에서 새 비교 헬퍼 노출 보호

3. 문서
   - `MV_2차_고도화_로드맵.md`의 3단계 진행 상태 갱신
   - `MV_테스트_실행_가이드.md`와 `MV_운영_인계_요약.md`의 보호 범위 문구 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (95 checks)
```

## 2026-05-06: MV 2차 고도화 - marketing.mv 진단 요약

### 작업 목적

장기 프로젝트 저장 전 `marketing.mv` 구조가 정상인지 빠르게 확인할 수 있도록 자동 진단 로그와 수동 진단 버튼을 추가했습니다.

### 변경 내용

1. `js/storage.js`
   - `buildMarketingMVDiagnostics()`로 프로젝트 제목, 스키마, 씬 수, 설정 키, 프롬프트 섹션, 첫/마지막 씬, 확인 사항을 구조화
   - `formatMarketingMVDiagnostics()`로 사람이 읽는 진단 요약 생성
   - `logMarketingMVDiagnostics()`를 저장 직전 호출해 콘솔에 `marketing.mv` 상태 기록
   - `showMarketingMVDiagnostics()`로 수동 진단 확인 지원

2. `js/step6.js`
   - MV 결과 프롬프트 화면 상단 내보내기 영역에 `MV 진단` 버튼 추가

3. 테스트
   - `tests/mv_marketing_diagnostics_smoke.js` 추가
   - `tests/mv_model_storage_smoke.js`에서 저장 전 진단 로그 보호
   - `tests/mv_chrome_runtime_check.js`, `tests/run_mv_smoke_tests.js`에 새 보호 범위 추가

4. 문서
   - `MV_2차_고도화_로드맵.md`의 3단계 진행 상태 갱신
   - `MV_테스트_실행_가이드.md`와 `MV_운영_인계_요약.md`의 자동 테스트 기준을 `PASS (95 checks)`로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (95 checks)
```

## 2026-05-06: MV 2차 고도화 - 내보내기 기준 헤더

### 작업 목적

TXT/SRT 내보내기 파일만 따로 전달되더라도 어떤 프로젝트와 릴리스 기준에서 나온 산출물인지 확인할 수 있도록 프로젝트 제목과 릴리스 기준 정보를 포함했습니다.

### 변경 내용

1. `js/step6.js`
   - `MV_RELEASE_BASELINE`와 `buildMVExportMetadataHeader()` 추가
   - TXT 계열 내보내기 본문에 프로젝트 제목과 `mv-stabilization-2026-05-06` 릴리스 기준 표시
   - SRT 다운로드 결과에는 `NOTE Project`, `NOTE Release Baseline` 헤더 추가
   - 프로젝트 제목은 저장 프로젝트 정보, 최종 제목, 노래 제목 입력 순서로 가져오도록 정리

2. 테스트
   - `tests/mv_download_prompts_smoke.js`에서 TXT 헤더 보호
   - `tests/mv_srt_export_smoke.js`에서 SRT NOTE 헤더와 줄바꿈 변환 보호
   - `tests/mv_image_prompt_bundle_smoke.js`, `tests/mv_video_tool_export_templates_smoke.js`에서 이미지/영상 TXT 헤더 보호
   - `tests/mv_chrome_runtime_check.js`에서 새 전역 헬퍼 노출 보호

3. 문서
   - `MV_2차_고도화_로드맵.md`의 2단계 내보내기 품질 강화 완료 상태 갱신
   - `MV_테스트_실행_가이드.md`와 `MV_운영_인계_요약.md`의 보호 범위 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (93 checks)
```

## 2026-05-06: MV 2차 고도화 - 이미지 생성 프롬프트 번들

### 작업 목적

썸네일, 배경, 인물, 통합 스타일, 씬별 이미지 생성 프롬프트를 한 번에 외부 이미지 생성기로 옮길 수 있도록 이미지 생성용 전체 프롬프트 번들 복사와 TXT 다운로드 기능을 추가했습니다.

### 변경 내용

1. `js/step6.js`
   - `buildMVImagePromptBundle()`로 이미지 생성용 전체 프롬프트 묶음 생성
   - `copyMVImagePromptBundle()`와 `downloadMVImagePromptBundle()` 추가
   - 대표 썸네일, 배경, 인물, 통합 스타일, 씬별 이미지 프롬프트와 씬 메타데이터를 같은 번들에 포함
   - MV 결과 프롬프트 화면 상단 내보내기 영역에 이미지 번들 복사/TXT 버튼 추가

2. `tests/mv_image_prompt_bundle_smoke.js`
   - 프롬프트 섹션 구성, 씬 메타데이터, textarea 편집값 우선 반영, 복사/다운로드 파일명을 보호

3. `tests/mv_chrome_runtime_check.js`, `tests/run_mv_smoke_tests.js`
   - 새 전역 함수와 통합 테스트 러너에 보호 범위 추가

4. 문서
   - `MV_2차_고도화_로드맵.md`의 2단계 진행 상태 갱신
   - `MV_테스트_실행_가이드.md`와 `MV_운영_인계_요약.md`의 자동 테스트 기준을 `PASS (93 checks)`로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (93 checks)
```

## 2026-05-06: MV 2차 고도화 - 씬 프롬프트 표 복사

### 작업 목적

씬 번호, 시간, 가사, EN 프롬프트, KO 설명을 외부 스프레드시트나 문서에 바로 붙여넣을 수 있도록 TSV 표 복사 기능을 추가했습니다.

### 변경 내용

1. `js/step6.js`
   - `buildMVScenePromptTableText()`로 씬별 TSV 표 생성
   - `copyMVScenePromptTable()`로 클립보드 복사 지원
   - 탭/줄바꿈이 표 셀을 깨뜨리지 않도록 `formatMVTableCell()` 추가
   - MV 결과 프롬프트 화면 상단 내보내기 영역에 `표 복사` 버튼 추가

2. `tests/mv_scene_prompt_table_copy_smoke.js`
   - 표 헤더, textarea 편집값 우선 반영, 탭/줄바꿈 정리, 클립보드 복사 동작 보호

3. `tests/mv_chrome_runtime_check.js`, `tests/run_mv_smoke_tests.js`
   - 새 전역 함수와 통합 테스트 러너에 보호 범위 추가

4. 문서
   - `MV_2차_고도화_로드맵.md`의 2단계 진행 상태 갱신
   - `MV_테스트_실행_가이드.md`와 `MV_운영_인계_요약.md`의 자동 테스트 기준을 `PASS (91 checks)`로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (91 checks)
```

## 2026-05-06: MV 2차 고도화 - 영상 생성 도구별 내보내기 템플릿

### 작업 목적

MV 씬 프롬프트를 Runway, Pika, Kling 같은 영상 생성 도구로 옮길 때 매번 수동으로 문구를 다듬지 않아도 되도록 도구별 템플릿 복사와 TXT 다운로드 기능을 추가했습니다.

### 변경 내용

1. `js/step6.js`
   - 씬 메타데이터 포맷을 공용 `formatMVSceneExportMetadata()`로 정리
   - `buildMVVideoToolPrompts()`로 Runway/Pika/Kling별 영상 생성 프롬프트 본문 생성
   - `copyMVVideoToolPrompts()`와 `downloadMVVideoToolPrompts()` 추가
   - MV 결과 프롬프트 화면 상단에 Runway/Pika/Kling 복사 및 TXT 저장 버튼 추가

2. `tests/mv_video_tool_export_templates_smoke.js`
   - 도구별 템플릿, 씬 메타데이터, textarea 편집값 우선 반영, 복사/다운로드 파일명을 보호

3. `tests/mv_download_prompts_smoke.js`, `tests/mv_chrome_runtime_check.js`, `tests/run_mv_smoke_tests.js`
   - 공용 내보내기 헬퍼와 새 전역 함수 보호 범위 추가

4. 문서
   - `MV_2차_고도화_로드맵.md`의 2단계 진행 상태 갱신
   - `MV_테스트_실행_가이드.md`와 `MV_운영_인계_요약.md`의 자동 테스트 기준을 `PASS (89 checks)`로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (89 checks)
```

## 2026-05-06: MV 2차 고도화 - 씬 미저장 표시와 저장 단축키

### 작업 목적

MV 결과 씬 카드에서 EN/KO 프롬프트를 수정했을 때 저장 전 상태를 바로 알 수 있도록 `미저장` 표시를 추가하고, 편집 중 `Ctrl+S` 또는 `Cmd+S`가 현재 씬 저장으로 동작하도록 보강했습니다.

### 변경 내용

1. `js/step6.js`
   - 결과 씬 카드 헤더에 씬별 `미저장` 배지 추가
   - 씬 프롬프트 textarea 입력/변경 이벤트에서 미저장 상태 표시
   - `saveScenePrompt()` 완료 후 미저장 상태 해제
   - MV 씬 프롬프트에 포커스가 있거나 미저장 씬이 있을 때 `Ctrl+S`/`Cmd+S`로 해당 씬 저장

2. `tests/mv_scene_dirty_shortcut_smoke.js`
   - 미저장 표시/해제와 현재 씬 저장 단축키 동작 보호

3. `tests/mv_chrome_runtime_check.js`, `tests/run_mv_smoke_tests.js`
   - 새 전역 헬퍼와 통합 테스트 러너에 보호 범위 추가

4. 문서
   - `MV_2차_고도화_로드맵.md`의 1단계 진행 상태 갱신
   - `MV_테스트_실행_가이드.md`와 `MV_운영_인계_요약.md`의 자동 테스트 기준을 `PASS (87 checks)`로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (87 checks)
```

## 2026-05-06: MV 안정화 마감 및 씬 저장/복원 확정

### 작업 목적

MV 프롬프트 탭에서 씬별 프롬프트를 편집하고 저장한 뒤, 새로고침과 프로젝트 재로드를 거쳐도 편집값이 유지되는지 최종 리허설로 확인했습니다.

### 변경 내용

1. `js/storage.js`
   - `setMarketingMVScenes()`를 추가해 기존 `mvScenes`와 신규 `marketing.mv.scenes`를 같은 정규화 데이터로 동시에 갱신
   - 프로젝트 저장 시 현재 씬 데이터가 stale `marketing.mv.scenes`에 덮이지 않도록 보강

2. `js/step6.js`
   - 씬 개요 확정, 전체 MV 프롬프트 저장, 개별 씬 저장 경로에서 `setMarketingMVScenes()`를 사용
   - 씬 5 개별 저장 후 새로고침/재로드 복원 리허설 통과

3. `tests/mv_model_storage_smoke.js`
   - stale `marketing.mv.scenes`가 있어도 최신 `window.currentScenes`가 저장 모델에 반영되는지 보호

4. 리허설/판정 문서
   - `MV_릴리스후보_판정.md`, `MV_수동리허설_기록지.md`, `MV_중복함수_정리계획.md`에 최종 결과 반영

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (85 checks)
```

### 기준 커밋

```text
dd33517 Fix MV scene prompt restore persistence
```

## 2026-05-06: MV 5→6단계 대체 가사 처리 추가

### 작업 목적

샘플 프로젝트처럼 5단계 최종 가사가 아직 확정되지 않은 상태에서도 2단계 수노 가사를 사용해 6단계 마케팅/MV 생성 흐름으로 넘어갈 수 있도록 보강했습니다.

### 변경 내용

1. `app.js`
   - `goToMarketingStep()`의 가사 수집 우선순위에 `sunoLyrics`와 저장 프로젝트의 `sunoLyrics` 추가
   - 최종 스타일이 없을 때 `stylePrompt`와 저장 프로젝트의 `stylePrompt`를 대체 입력으로 사용

2. `tests/mv_marketing_step_fallback_smoke.js`, `tests/run_mv_smoke_tests.js`
   - 5→6단계 이동 함수가 수노 가사/스타일 대체 입력을 유지하는지 확인

3. 리허설 문서
   - 최종 가사 부재로 인한 6단계 생성 중단 원인과 대체 입력 처리 기록

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (79 checks)
```

## 2026-05-06: MV 6단계 진행바 클릭 차단 수정

### 작업 목적

인앱 브라우저 리허설에서 6단계 마케팅 아이콘을 눌러도 화면 전환이 되지 않는 문제를 해결했습니다.

### 변경 내용

1. `index.html`
   - 5단계와 6단계의 실제 단계 아이콘을 드래그 핸들 밖 `step-icon`으로 분리
   - 드래그 핸들은 `fa-grip-vertical`만 갖도록 정리
   - `event.stopPropagation()`이 단계 이동 클릭을 막지 않도록 구조 수정

2. `tests/mv_progress_steps_smoke.js`
   - 각 단계가 `data-step`과 `goToStep` 클릭 연결을 갖는지 확인
   - 각 단계의 드래그 핸들과 실제 단계 아이콘이 분리되어 있는지 확인

3. 리허설 문서
   - 샘플 프로젝트 기준 6단계 패널 진입 확인 기록
   - 남은 차단 조건을 5단계 최종 가사 부재로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (77 checks)
```

## 2026-05-06: MV 샘플 리허설 프로젝트와 진행바 보호 테스트 추가

### 작업 목적

저장 프로젝트가 없는 상태에서 샘플 프로젝트를 만들어 실제 앱 저장 목록과 1→2단계 이동을 확인하고, 리허설 중 발견한 진행바 마크업 결함을 재발하지 않도록 보호했습니다.

### 변경 내용

1. `index.html`
   - 진행바 2단계에 `data-step="2"`와 `goToStep(2, false, true)` 클릭 연결 복원

2. `tests/mv_progress_steps_smoke.js`, `tests/run_mv_smoke_tests.js`
   - 진행바 1~6단계가 모두 `data-step`과 `goToStep` 클릭 연결을 갖는지 확인
   - 진행바 step div가 닫히기 전에 child span이 시작되는 마크업 파손 재발 방지

3. 리허설 문서
   - 샘플 프로젝트 생성, 저장 목록 표시, 1→2단계 이동, 2단계 제목/가사 전달 확인 기록
   - 남은 확인을 6단계 MV 탭 실제 화면 리허설로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (77 checks)
```

## 2026-05-06: MV 인앱 브라우저 리허설 진입 상태 기록

### 작업 목적

인앱 브라우저에서 실제 앱 화면을 확인하고, 최종 수동 리허설이 왜 아직 완료되지 않았는지 추적 가능한 상태로 남겼습니다.

### 변경 내용

1. `MV_수동리허설_기록지.md`
   - 인앱 브라우저 현재 URL, 페이지 제목, 앱 버전, 프로젝트 사이드바 상태 기록
   - 저장된 프로젝트가 없어 기존 프로젝트 열기 항목을 `보류`로 표시
   - 최종 판정을 `보류`로 기록하고 다음 조치를 실제 저장 프로젝트 확보로 명시

2. `MV_릴리스후보_판정.md`
   - 자동 검증과 앱 로드는 통과했지만, 실제 사용자 저장 프로젝트가 없어 화면 수동 리허설은 보류 상태임을 반영

3. `MV_중복함수_정리계획.md`
   - 진행 항목에 인앱 브라우저 앱 로드와 저장 프로젝트 없음 상태 기록 완료 추가

### 확인 기준

```text
현재 URL: http://127.0.0.1:4180/index.html
페이지 제목: Music Creator - AI 가사 & 수노 프롬프트 생성기
프로젝트 사이드바: 저장된 프로젝트가 없습니다.
```

## 2026-05-06: MV 수동 리허설 사전 실행 상태 기록

### 작업 목적

실제 프로젝트를 고르기 직전의 기준 상태를 남겨, 이후 화면 리허설에서 문제가 생겼을 때 어떤 커밋과 서버 상태에서 시작했는지 추적할 수 있게 했습니다.

### 변경 내용

1. `MV_수동리허설_기록지.md`
   - 브랜치, 기준 커밋, 실행 명령, 자동 테스트 결과, 앱 주소, 서버 응답 상태 기록

2. `MV_릴리스후보_판정.md`
   - 리허설 서버 실행 확인 상태와 남은 화면 수동 리허설 항목 반영

3. `MV_중복함수_정리계획.md`
   - 진행 항목에 수동 리허설 시작 전 서버 응답 기록 완료 추가

### 검증 기준

```text
npm run rehearse:mv
MV smoke test suite: PASS (75 checks)
HTTP 200 OK http://127.0.0.1:4180/index.html
```

## 2026-05-06: MV 수동 리허설 시작 명령 추가

### 작업 목적

실제 프로젝트 수동 리허설을 시작할 때 자동 테스트 통과 여부를 먼저 확인하고, 통과한 경우에만 로컬 앱 서버를 열 수 있도록 실행 명령을 정리했습니다.

### 변경 내용

1. `package.json`
   - `npm run rehearse:mv` 명령 추가
   - 내부 흐름을 `npm run test:mv && npm run serve:local`로 구성

2. `MV_수동리허설_기록지.md`, `MV_운영전_리허설_체크리스트.md`
   - 수동 리허설 시작 명령과 앱 주소 확인 절차 추가

3. `MV_테스트_실행_가이드.md`, `MV_릴리스후보_판정.md`, `MV_중복함수_정리계획.md`
   - 새 리허설 명령과 남은 최종 수동 확인 기준 반영

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (75 checks)
```

## 2026-05-06: 씬 개요 확정 전 확인 알림 안내 문구 보강

### 작업 목적

확정 전 확인 알림에서 확인/취소 버튼을 눌렀을 때 어떤 일이 일어나는지 더 분명히 알 수 있도록 안내 문구를 보강했습니다.

### 변경 내용

1. `js/step6.js`
   - 확인 필요 항목이 남은 상태에서 취소하면 첫 확인 필요 씬으로 이동한다는 문구 추가
   - 계속 확정하려면 확인을 누르면 된다는 문구 추가

2. `tests/mv_scene_timing_editor_smoke.js`
   - 확인 메시지에 취소 시 첫 확인 필요 씬 이동 안내가 포함되는지 확인

3. `tests/mv_confirm_scene_overview_smoke.js`
   - 실제 확정 흐름의 확인 메시지에도 같은 이동 안내가 표시되는지 확인

4. `MV_테스트_실행_가이드.md`, `MV_중복함수_정리계획.md`
   - 보호 범위와 진행 상태에 확인 알림 안내 문구 보강 항목 추가
   - 다음 추천 작업을 실제 화면 기준 최종 시각 점검으로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (69 checks)
```

## 2026-05-06: 씬 개요 확정 전 확인 알림 추가

### 작업 목적

씬 개요를 확정하기 전에 시간, 메타데이터, 가사, EN, KO 누락 항목이 남아 있으면 사용자가 한 번 확인하고 계속 진행할 수 있도록 개선했습니다.

### 변경 내용

1. `js/step6.js`
   - `getMVSceneQualityConfirmMessage(scenesArg)` 추가
   - `saveAndConfirmMVPrompts()`에서 최신 편집값 반영 후 품질 확인 메시지 생성
   - 확인 필요 항목이 남아 있고 사용자가 취소하면 첫 확인 필요 씬으로 이동하고 확정을 중단
   - 사용자가 계속 진행을 선택하면 기존 저장/확정 흐름 유지

2. `tests/mv_scene_timing_editor_smoke.js`
   - 확인 필요 항목이 있을 때 확정 전 확인 메시지가 생성되는지 확인
   - 준비 완료 상태에서는 확인 메시지가 비어 있는지 확인

3. `tests/mv_confirm_scene_overview_smoke.js`
   - 사용자가 확인 알림에서 취소하면 결과 생성 단계로 넘어가지 않는지 확인

4. `MV_테스트_실행_가이드.md`, `MV_중복함수_정리계획.md`
   - 보호 범위와 진행 상태에 확정 전 확인 알림 항목 추가
   - 다음 추천 작업을 확인 알림의 문제 씬 이동 안내 보강으로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (69 checks)
```

## 2026-05-06: 씬 품질 필터 선택 상태를 카드 요약에 연결

### 작업 목적

품질 요약에서 특정 누락 유형을 선택했을 때, 강조된 씬 카드 안에서도 어떤 기준으로 확인 중인지 바로 알 수 있도록 개선했습니다.

### 변경 내용

1. `js/step6.js`
   - `currentMVSceneQualityFilter` 선택 상태 저장
   - `getMVSceneIssueLabel(issueType)` 추가
   - 선택된 필터가 해당 씬에 적용될 때 카드 요약에 `선택 필터: ... 확인` 문구 표시
   - 확인 필요 전체 이동과 유형별 필터 이동 모두 카드 요약을 갱신하도록 연결
   - `review` 유형도 씬 이슈 계산에 포함

2. `tests/mv_scene_timing_editor_smoke.js`
   - 확인 필요 전체 이동 시 카드 요약에 선택 필터 문구가 표시되는지 확인
   - 메타데이터 누락 필터 선택 시 카드 요약 문구가 갱신되는지 확인

3. `MV_테스트_실행_가이드.md`, `MV_중복함수_정리계획.md`
   - 보호 범위와 진행 상태에 필터 선택 상태 반영 항목 추가
   - 다음 추천 작업을 확정 전 확인 알림으로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (69 checks)
```

## 2026-05-06: 씬 품질 요약 누락 유형별 필터/하이라이트 표시

### 작업 목적

전체 품질 요약에서 시간, 메타데이터, 가사, EN, KO 누락 유형별로 문제 씬을 빠르게 찾고 화면에서 강조할 수 있도록 개선했습니다.

### 변경 내용

1. `js/step6.js`
   - `getMVSceneIssueIndexes(scenesArg, issueType)` 추가
   - `focusMVSceneIssue(issueType)` 추가
   - `highlightMVSceneIssueIndexes(indexes)` 추가
   - 전체 품질 요약에 시간/메타/가사/EN/KO 필터 버튼 추가
   - 입력 변경 시 필터 버튼의 카운트와 비활성화 상태 갱신
   - 필터 클릭 시 해당 누락 유형의 씬 카드를 하이라이트하고 첫 씬으로 이동

2. `tests/mv_scene_timing_editor_smoke.js`
   - 준비 완료 상태에서 유형별 필터 버튼이 비활성화되는지 확인
   - 누락 유형별 씬 인덱스 계산이 정확한지 확인
   - `focusMVSceneIssue(issueType)`가 첫 문제 씬으로 포커스 이동을 요청하는지 확인

3. `MV_테스트_실행_가이드.md`, `MV_중복함수_정리계획.md`
   - 보호 범위와 진행 상태에 누락 유형별 필터/하이라이트 항목 추가
   - 다음 추천 작업을 필터 선택 상태와 카드 안내 문구 연결로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (69 checks)
```

## 2026-05-06: 씬 품질 요약의 확인 필요 씬 이동 보강

### 작업 목적

전체 씬 품질 요약에서 확인 필요 개수를 보는 데서 끝나지 않고, 첫 번째 확인 필요 씬 카드로 바로 이동할 수 있도록 개선했습니다.

### 변경 내용

1. `js/step6.js`
   - `getMVSceneReviewIndexes(scenesArg)` 추가
   - `focusMVFirstReviewScene()` 추가
   - 전체 품질 요약에 `확인 필요 씬으로 이동` 버튼 추가
   - 확인 필요 씬이 없으면 이동 버튼이 비활성화되도록 갱신
   - 요약 갱신 시 텍스트와 버튼 상태를 함께 갱신

2. `tests/mv_scene_timing_editor_smoke.js`
   - 준비 완료 상태에서 이동 버튼이 비활성화되는지 확인
   - 확인 필요 씬 인덱스 계산이 누락/오류 씬을 정확히 찾는지 확인
   - `focusMVFirstReviewScene()`이 첫 확인 필요 씬으로 포커스 이동을 요청하는지 확인

3. `MV_테스트_실행_가이드.md`, `MV_중복함수_정리계획.md`
   - 보호 범위와 진행 상태에 확인 필요 씬 이동 항목 추가
   - 다음 추천 작업을 누락 유형별 필터/하이라이트 표시로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (69 checks)
```

## 2026-05-06: 씬 개요 전체 품질 요약 표시

### 작업 목적

씬 개요를 확정하기 전에 전체 씬 중 준비 완료와 확인 필요 개수를 확인하고, 시간/메타데이터/가사/EN/KO 프롬프트 누락 항목을 한눈에 볼 수 있도록 개선했습니다.

### 변경 내용

1. `js/step6.js`
   - `getMVSceneQualityStats(scenesArg)` 추가
   - `getMVSceneQualitySummaryText(scenesArg)` 추가
   - `renderMVSceneQualitySummary(scenesArg)` 추가
   - `updateMVSceneQualitySummary()` 추가
   - 씬 개요 상단에 전체 품질 요약 표시
   - 시간/가사/메타데이터/EN/KO 입력 변경 시 전체 요약도 즉시 갱신

2. `tests/mv_scene_timing_editor_smoke.js`
   - 전체 품질 요약이 준비 완료/확인 필요 개수를 반영하는지 확인
   - 시간/메타데이터/가사/EN/KO 누락 집계가 유지되는지 확인
   - 씬 개요 렌더링에 전체 품질 요약 마커가 남아 있는지 확인

3. `MV_테스트_실행_가이드.md`, `MV_중복함수_정리계획.md`
   - 보호 범위와 진행 상태에 전체 씬 품질 요약 항목 추가
   - 다음 추천 작업을 확인 필요 씬 필터/포커스 보강으로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (69 checks)
```

## 2026-05-06: 씬 개요 편집 카드 상태 요약 표시

### 작업 목적

씬을 저장하거나 재생성하기 전에 현재 카드의 시간, 메타데이터, 가사, 영어/한글 프롬프트 준비 상태를 한 줄로 확인할 수 있도록 개선했습니다.

### 변경 내용

1. `js/step6.js`
   - `getMVSceneEditorSummaryText(scene, index)` 추가
   - `renderMVSceneEditorSummary(scene, index)` 추가
   - `updateMVSceneEditorSummary(scene, index)` 추가
   - 시간/가사/메타데이터 입력 변경 시 상태 요약도 즉시 갱신
   - 영어/한글 씬 개요 프롬프트 입력 변경 시 EN/KO 준비 상태 갱신

2. `tests/mv_scene_timing_editor_smoke.js`
   - 상태 요약이 최신 시간, 메타데이터 개수, 가사/EN/KO 상태를 반영하는지 확인
   - 씬 개요 렌더링 구간에 상태 요약 마커와 프롬프트 입력 리스너가 유지되는지 확인

3. `MV_테스트_실행_가이드.md`, `MV_중복함수_정리계획.md`
   - 보호 범위와 진행 상태에 씬 카드 상태 요약 항목 추가
   - 다음 추천 작업을 전체 씬 품질 요약/누락 항목 집계로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (69 checks)
```

## 2026-05-06: 씬 편집 UI 접근성/키보드 포커스 보강

### 작업 목적

타임라인 프리뷰에서 특정 씬으로 이동할 때 키보드 포커스도 함께 이동하고, 시간/메타데이터 편집 안내 메시지가 보조기기에 자연스럽게 전달되도록 개선했습니다.

### 변경 내용

1. `js/step6.js`
   - 타임라인 씬 버튼에 씬 번호, 시간, 설명을 포함한 `aria-label` 추가
   - `focusMVSceneCard(sceneIndex)`가 스크롤뿐 아니라 해당 씬 카드에 키보드 포커스를 이동하도록 보강
   - 씬 카드에 `tabindex="-1"`과 `aria-labelledby` 추가
   - 시간/가사/메타데이터 입력에 안내 메시지 `aria-describedby` 연결
   - 안내 메시지에 `role="status"`, `aria-live="polite"`, `aria-hidden` 상태 갱신 추가

2. `tests/mv_scene_timeline_preview_smoke.js`
   - 타임라인 버튼의 `aria-label` 유지 확인
   - 타임라인 버튼 이동 시 씬 카드 스크롤과 포커스가 함께 호출되는지 확인

3. `tests/mv_scene_timing_editor_smoke.js`
   - 안내 메시지 표시/숨김 상태에 따라 `aria-hidden`이 갱신되는지 확인
   - 씬 편집 카드와 입력 필드의 접근성 속성 마커 유지 확인

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (69 checks)
```

## 2026-05-06: 씬 편집값 기반 타임라인 프리뷰 즉시 갱신

### 작업 목적

씬별 시작/종료 시간, 가사 구간, 장소/감정/무드/조명/카메라 값을 수정할 때 저장 전에도 상단 타임라인 프리뷰가 즉시 최신 값으로 바뀌도록 개선했습니다.

### 변경 내용

1. `js/step6.js`
   - `refreshMVSceneTimelinePreview()` 추가
   - `updateMVSceneEditorPreview(sceneIndex)` 추가
   - 시간/가사/장소/감정/무드/조명/카메라 입력의 `input`, `change` 이벤트를 타임라인 프리뷰 갱신과 연결
   - 프리뷰 영역이 없거나 테스트 환경의 DOM 기능이 제한된 경우 조용히 중단하도록 보호

2. `tests/mv_scene_timeline_preview_smoke.js`
   - 타임라인 프리뷰 재렌더링 헬퍼가 현재 씬 데이터 기준으로 HTML을 갱신하는지 확인
   - 프리뷰 영역이 없을 때 실패하지 않고 `false`를 반환하는지 확인

3. `MV_테스트_실행_가이드.md`, `MV_중복함수_정리계획.md`
   - 보호 범위와 진행 상태에 즉시 갱신 항목 추가
   - 다음 작업 추천을 접근성/키보드 포커스 보강으로 갱신

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (69 checks)
```

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

## 2026-05-06: MV 6단계 복원 로직 헬퍼 분리

### 작업 목적

`restoreStepData`가 모든 단계의 복원 세부 구현을 직접 들고 있어 커지고 있었기 때문에, 6단계 마케팅/MV 복원 로직을 별도 헬퍼로 분리했습니다.

### 변경 내용

1. `app.js`
   - `restoreMarketingMVStepData(projectData)` 헬퍼 추가
   - `restoreStepData(6)`는 6단계 분기 후 헬퍼 호출만 담당하도록 축소
   - 기존 복원 동작은 유지

2. `tests/mv_restore_step6_smoke.js`
   - 분리된 헬퍼까지 포함해 테스트하도록 검사 범위 조정

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (53 checks)
```

## 2026-05-06: MV 6단계 복원 내부 헬퍼 세분화

### 작업 목적

`restoreMarketingMVStepData(projectData)` 안에 다시 모여 있던 설정/프롬프트/씬 표시 복원 책임을 더 작은 함수로 나눠 다음 기능 고도화 작업의 변경 범위를 줄였습니다.

### 변경 내용

1. `app.js`
   - 마케팅 요약 복원: `restoreMarketingSummaryData(marketing)`
   - 썸네일 복원: `restoreMarketingThumbnails(marketing)`
   - MV 데이터 선택: `getMarketingMVRestoreData(marketing)`
   - 설정 필드 복원: `restoreMVSettingsFields(settings)`
   - 태그 선택 복원: `restoreMVTagSelections(settings)`
   - 캐릭터 복원: `restoreMVCharacters(settings)`
   - 프롬프트 필드 복원: `restoreMVPromptFields(prompts)`
   - 결과/씬 개요 섹션 복원: `restoreMVResultSections(mvData, prompts)`

2. `tests/mv_restore_step6_smoke.js`
   - 세분화된 헬퍼까지 포함해 복원 테스트가 실행되도록 코드 슬라이스 기준 조정

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (53 checks)
```

## 2026-05-06: step6.js 내부 섹션 경계 정리

### 작업 목적

`js/step6.js`가 MV 6단계의 설정, 캐릭터, 씬, SRT, 번역/재생성 기능을 모두 담고 있어 다음 작업자가 파일 구조를 빠르게 파악하기 어려웠습니다. 기능 이동 없이 섹션 경계를 먼저 명확히 해서 이후 실제 분리 작업의 기준선을 만들었습니다.

### 변경 내용

1. `js/step6.js`
   - 파일 상단에 섹션 맵 추가
   - 핵심 유틸, 프롬프트/씬 리뷰 렌더링, MV 생성 흐름, 장소/설정/캐릭터 헬퍼, 프롬프트 저장/내보내기, SRT, 번역/재생성/복사/태그 액션 섹션 경계 추가
   - 기존 테스트가 의존하는 `// --- Extracted ... ---`, `// --- Restored ... ---` 보호 마커는 유지

2. `tests/mv_step6_section_order_check.js`
   - 섹션 경계가 지정된 순서로 유지되는지 확인
   - 기존 slice 기반 테스트가 사용하는 보호 마커가 사라지지 않는지 확인
   - MV 설정/캐릭터/SRT 블록의 상대 위치가 깨지지 않는지 확인

3. `tests/run_mv_smoke_tests.js`
   - step6 섹션 순서 체크를 통합 테스트에 추가

4. `MV_테스트_실행_가이드.md`
   - 현재 정상 기준을 `PASS (55 checks)`로 갱신
   - 보호 범위에 `js/step6.js` 내부 섹션 경계/보호 마커 유지 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (55 checks)
```

## 2026-05-06: MV 씬 데이터 모델 정규화

### 작업 목적

`marketing.mv.scenes`를 앞으로 타임라인/프리뷰 UI와 가사 기반 씬 분할 고도화의 기준 데이터로 쓰기 위해, 저장 시 씬별 공통 필드가 항상 보정되도록 정규화 계층을 추가했습니다.

### 변경 내용

1. `js/storage.js`
   - `window.normalizeMVScenes(scenes)` 추가
   - 씬별 `id`, `index`, `sceneNumber` 자동 부여
   - `time` 문자열에서 `startSeconds`, `endSeconds`, `durationSeconds` 계산
   - `startSeconds/endSeconds`만 있는 씬은 `time` 문자열 자동 생성
   - 기존 `promptEn`, `description`, `lyrics` 같은 과거/대체 필드를 `prompt`, `scene`으로 보정
   - 알 수 없는 기존 필드는 그대로 보존
   - `getMarketingMVData()`와 `syncMarketingMVModel()`이 항상 정규화된 씬 배열을 반환/저장하도록 연결

2. `tests/mv_scene_model_normalization_smoke.js`
   - 기존 `mvScenes`만 있는 프로젝트가 신규 `marketing.mv.scenes`로 안전하게 변환되는지 확인
   - 문자열 형태의 오래된 씬 데이터도 안전하게 씬 객체로 보정되는지 확인
   - 신규 `marketing.mv.scenes`가 legacy `mvScenes`보다 우선되는지 확인
   - 초 단위 시간 필드와 `time` 문자열 상호 보정 확인

3. `tests/mv_model_storage_smoke.js`
   - 저장된 MV 씬에 `id`, `index`, `sceneNumber`가 포함되는지 추가 확인

4. `MV_테스트_실행_가이드.md`
   - 현재 정상 기준을 `PASS (57 checks)`로 갱신
   - 보호 범위에 `marketing.mv.scenes` 정규화 모델 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (57 checks)
```

## 2026-05-06: 가사 기반 씬 분할 1차 고도화

### 작업 목적

기존 씬 생성은 가사를 줄 수 기준으로 단순 균등 분배했습니다. 후렴/벌스 같은 파트 라벨이나 줄 길이 차이가 반영되지 않아 씬별 가사 맥락이 어색해질 수 있었습니다. 이를 개선하기 위해 가사 분배 전용 헬퍼를 추가했습니다.

### 변경 내용

1. `js/step6.js`
   - `window.allocateLyricsToMVScenes(lyrics, sceneCount)` 추가
   - `[Verse]`, `[Chorus]`, `(Bridge)`, `후렴`, `벌스` 같은 파트 라벨 제거
   - 씬 수가 가사 줄 수보다 적을 때는 줄 길이 가중치 기반으로 연속 구간 배분
   - 씬 수가 가사 줄 수보다 많을 때는 전체 흐름 기준으로 가사 줄을 비례 배치
   - `generateSceneOverview()`의 `preAllocatedLyrics` 생성 로직을 새 헬퍼로 연결

2. `tests/mv_lyrics_scene_allocation_smoke.js`
   - 파트 라벨 제거 확인
   - 2개/4개 씬 배분에서 처음과 마지막 가사 흐름 보존 확인
   - 씬 수가 가사 줄 수보다 많은 경우의 비례 배치 확인
   - 빈 가사와 0개 씬 입력 가드 확인

3. `tests/run_mv_smoke_tests.js`
   - 가사 기반 씬 분할 보호 테스트를 통합 실행 목록에 추가

4. `MV_테스트_실행_가이드.md`
   - 현재 정상 기준을 `PASS (59 checks)`로 갱신
   - 보호 범위에 가사 기반 씬 분할 헬퍼 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (59 checks)
```

## 2026-05-06: 씬 타임라인 프리뷰 UI 추가

### 작업 목적

MV 씬이 여러 개 생성되면 결과 화면에서 전체 흐름을 한눈에 파악하기 어려웠습니다. 개별 씬 카드로 바로 이동할 수 있는 가로 타임라인 프리뷰를 추가해 씬 순서, 시간, 장면 요약, 감정/장소 흐름을 빠르게 훑을 수 있게 했습니다.

### 변경 내용

1. `js/step6.js`
   - `renderMVSceneTimelinePreview(scenes)` 추가
   - `focusMVSceneCard(sceneIndex)` 추가
   - 씬 개요 화면 상단에 타임라인 프리뷰 표시
   - 씬 확정 후 결과 화면 상단에도 같은 타임라인 프리뷰 표시
   - 개요 카드와 결과 카드에 포커스용 데이터 속성 추가

2. `tests/mv_scene_timeline_preview_smoke.js`
   - 타임라인 HTML 렌더링 확인
   - 씬 수, 시간, 장면 요약, 감정/장소 메타 표시 확인
   - 타임라인 클릭 시 해당 씬 카드로 스크롤하는 포커스 헬퍼 확인

3. `tests/mv_confirm_scene_overview_smoke.js`
   - 씬 확정 후 결과 화면에 타임라인 프리뷰가 함께 렌더링되는지 확인

4. `MV_테스트_실행_가이드.md`
   - 현재 정상 기준을 `PASS (61 checks)`로 갱신
   - 보호 범위에 씬 카드/타임라인 프리뷰 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (61 checks)
```

## 2026-05-06: 가사 감정 기반 장소/조명 추천 고도화

### 작업 목적

AI 씬 생성이 실패하거나 기본 생성 흐름을 사용할 때도 가사의 감정 흐름이 장소, 조명, 카메라 톤에 반영되도록 보강했습니다. 이를 통해 슬픈 장면은 비 오는 거리/푸른 조명, 희망적인 장면은 루프탑/일출 톤처럼 더 일관된 뮤직비디오 콘셉트가 나오도록 했습니다.

### 변경 내용

1. `js/step6.js`
   - `MV_EMOTION_VISUAL_PRESETS` 추가
   - `recommendMVSceneVisualTone(sceneText, selectedLocations)` 추가
   - 가사/장면 텍스트의 감정 키워드를 기준으로 장소 힌트, 조명, 카메라워크, 무드 추천
   - 사용자가 선택한 장소 후보가 있으면 추천 장소와 자연스럽게 매칭
   - 기본 씬 생성 프롬프트에 추천 장소/조명/카메라/무드/감정 키워드 반영
   - 생성된 씬 데이터에 `emotion`, `mood`, `lighting`, `cameraWork` 메타데이터 저장

2. `tests/mv_emotion_visual_tone_smoke.js`
   - 슬픔/희망/긴장/사랑 계열 키워드 추천 확인
   - 선택 장소 후보가 추천 장소에 반영되는지 확인
   - 빈 입력에서도 안전한 기본 톤을 반환하는지 확인

3. `tests/run_mv_smoke_tests.js`
   - 감정 기반 비주얼 톤 추천 테스트를 MV 통합 테스트에 추가

4. `MV_테스트_실행_가이드.md`
   - 현재 정상 기준을 `PASS (63 checks)`로 갱신
   - 보호 범위에 가사 감정 키워드 기반 장소/조명/카메라 톤 추천 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (63 checks)
```

## 2026-05-06: MV 6단계 반응형 레이아웃 보강

### 작업 목적

MV 6단계 상세 설정 화면을 실제 브라우저 폭 기준으로 점검하면서, 스마트폰 폭에서 상세 설정 그리드가 1열이 아니라 3열로 다시 덮일 수 있는 CSS 우선순위 문제를 수정했습니다.

### 변경 내용

1. `styles.css`
   - `900px 이하` MV 상세 설정 3열 규칙을 `769px~900px` 구간에만 적용하도록 제한
   - 기존 `768px 이하=2열`, `480px 이하=1열` 규칙이 작은 화면에서 정상 유지되도록 보강

2. `tests/mv_responsive_layout_smoke.js`
   - Chrome headless에서 실제 페이지를 열고 뷰포트 폭별 CSS 계산 결과 확인
   - 390px: MV 상세 설정 1열, 설정 요약 1열 확인
   - 700px: MV 상세 설정 2열, 설정 요약 2열 확인
   - 850px: MV 상세 설정 3열 확인

3. `tests/run_mv_smoke_tests.js`
   - 반응형 레이아웃 보호 테스트를 MV 통합 테스트에 추가

4. `MV_테스트_실행_가이드.md`
   - 현재 정상 기준을 `PASS (65 checks)`로 갱신
   - 보호 범위에 MV 6단계 반응형 컬럼 유지 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (65 checks)
```

### 참고

인앱 브라우저 자동화는 초기화 단계에서 시간 초과되어 직접 탭 스크린샷 확인은 완료하지 못했습니다. 대신 동일 페이지를 Chrome headless로 열어 실제 CSS 미디어쿼리 계산 결과를 검증했습니다.

## 2026-05-06: 씬별 타임라인/가사 구간 편집 UI 추가

### 작업 목적

생성된 MV 씬을 사용자가 실제 영상 흐름에 맞게 다듬을 수 있도록, 씬 개요 편집 카드에서 시작 시간, 종료 시간, 가사 구간을 직접 수정하고 저장할 수 있게 했습니다.

### 변경 내용

1. `js/step6.js`
   - 씬 개요 카드에 시작 시간, 종료 시간, 가사 구간 입력 영역 추가
   - `parseMVTimelineSeconds()`, `formatMVTimelineSeconds()`, `getMVSceneTimingParts()` 추가
   - `updateMVSceneTimelineFromEditor(scene, index)` 추가
   - 저장 시 `time`, `startSeconds`, `endSeconds`, `durationSeconds`, `lyrics`를 함께 갱신
   - 종료 시간이 시작 시간보다 앞서는 잘못된 입력은 기존 시간 데이터를 보존

2. `tests/mv_scene_timing_editor_smoke.js`
   - `0:08`, `0:17` 같은 분:초 입력이 초 단위 필드와 `time` 문자열로 저장되는지 확인
   - 잘못된 역전 시간 입력은 기존 타임라인을 덮어쓰지 않는지 확인
   - 가사 구간은 시간 입력 유효성과 별개로 저장되는지 확인

3. `tests/mv_confirm_scene_overview_smoke.js`
   - 씬 개요 저장/확정 흐름에서 시간과 가사 구간이 실제 `currentScenes`에 반영되는지 추가 확인

4. `MV_테스트_실행_가이드.md`
   - 현재 정상 기준을 `PASS (67 checks)`로 갱신
   - 보호 범위에 씬별 시작/종료 시간과 가사 구간 편집 저장 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (67 checks)
```

## 2026-05-06: 씬별 타임라인/메타데이터 내보내기 반영

### 작업 목적

사용자가 편집한 씬별 시간, 가사 구간, 장소, 감정, 무드, 조명, 카메라 정보가 복사나 파일 다운로드 과정에서 빠지지 않도록 내보내기 포맷을 보강했습니다.

### 변경 내용

1. `js/step6.js`
   - `downloadMVPrompts()`의 씬별 TXT 출력에 `[씬 메타데이터]` 블록 추가
   - `copyAllMVPrompts()`의 전체 복사 출력에도 같은 메타데이터 블록 추가
   - `generateSRTPreview()`가 씬별 `startSeconds/endSeconds/lyrics`가 있는 경우 해당 타임라인을 우선 사용
   - SRT 씬 자막에 장소/감정/무드 요약을 함께 포함

2. `tests/mv_download_prompts_smoke.js`
   - TXT 다운로드에 가사 구간, 장소, 감정, 조명, 카메라, 길이가 포함되는지 확인

3. `tests/mv_copy_prompts_smoke.js`
   - 전체 복사 결과에 씬별 메타데이터가 포함되는지 확인

4. `tests/mv_srt_scene_timeline_smoke.js`
   - 씬별 타임라인 기반 SRT 생성 확인
   - SRT 자막 본문에 장소/감정/무드 요약이 포함되는지 확인

5. `MV_테스트_실행_가이드.md`
   - 현재 정상 기준을 `PASS (69 checks)`로 갱신
   - 보호 범위에 TXT/전체 복사/SRT 내보내기 메타데이터 반영 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (69 checks)
```

## 2026-05-06: 씬 편집 입력 안내 표시 추가

### 작업 목적

씬별 시작/종료 시간이 역전되거나 잘못된 형식으로 입력되었을 때 조용히 무시되는 것처럼 보이지 않도록, 카드 안에 안내 메시지를 표시하도록 개선했습니다. 장소/감정/무드/조명/카메라 메타데이터가 모두 비어 있는 경우에도 재생성 품질을 높이기 위한 입력 안내를 보여줍니다.

### 변경 내용

1. `js/step6.js`
   - `updateMVSceneEditorNotice(index, messages)` 추가
   - 씬 카드에 `scene_editor_notice_{index}` 안내 영역 추가
   - 종료 시간이 시작 시간보다 빠르거나 시간 형식이 잘못되면 기존 타임라인을 유지하고 안내 표시
   - 씬별 메타데이터가 모두 비어 있으면 최소 한 가지 입력을 권장하는 안내 표시
   - 정상 입력이면 안내 영역을 숨김

2. `tests/mv_scene_timing_editor_smoke.js`
   - 정상 시간/메타데이터 입력에서는 안내가 숨겨지는지 확인
   - 시간 역전 입력에서 기존 타임라인을 보존하고 안내가 표시되는지 확인
   - 빈 메타데이터 입력에서 안내가 표시되는지 확인

3. `MV_테스트_실행_가이드.md`
   - 보호 범위에 씬별 시간 역전/잘못된 시간 형식과 빈 메타데이터 입력 안내 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (69 checks)
```

## 2026-05-06: 씬 편집 UI 모바일 표시 보강

### 작업 목적

씬별 타임라인, 가사 구간, 메타데이터, 프롬프트 편집 영역이 작은 화면에서 가로로 눌리거나 넘치지 않도록 모바일 레이아웃을 보강했습니다.

### 변경 내용

1. `js/step6.js`
   - 씬 카드 헤더와 버튼 영역에 반응형 제어용 클래스 추가
   - 타임라인/가사 구간 그리드에 `mv-scene-timing-editor-grid` 클래스 추가
   - 장소/감정/무드/조명/카메라 그리드에 `mv-scene-metadata-editor-grid` 클래스 추가
   - 영어/한글 프롬프트 편집 그리드에 `mv-scene-prompt-editor-grid` 클래스 추가

2. `styles.css`
   - 768px 이하에서 씬 카드 헤더를 세로 배치
   - 씬 카드 버튼을 줄바꿈 가능한 폭으로 조정
   - 타임라인/메타데이터/프롬프트 편집 그리드를 모바일에서 1열로 전환
   - 입력 필드가 부모 폭을 밀어내지 않도록 `min-width: 0` 보강

3. `tests/mv_responsive_layout_smoke.js`
   - Chrome headless에서 390px, 700px, 850px 폭을 실제 계산
   - 390px/700px에서는 씬 편집 그리드가 1열인지 확인
   - 850px에서는 데스크톱 편집 그리드 컬럼이 유지되는지 확인

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (69 checks)
```

## 2026-05-06: MV 수동 리허설 기록지와 로컬 실행 스크립트 추가

### 작업 목적

실제 사용자 프로젝트 1개로 마지막 수동 리허설을 진행할 때 결과를 구조적으로 남길 수 있도록 기록지를 추가하고, 로컬 앱 실행 명령을 `package.json`에 표준화했습니다.

### 변경 내용

1. `MV_수동리허설_기록지.md`
   - 실제 프로젝트명, 앱 주소, 실행자, 자동 테스트 기준 기록 영역 추가
   - 13개 수동 확인 항목의 통과/보류/실패 기록 표 추가
   - 문제 발생 시 재현 순서와 최종 판정을 남기는 양식 추가

2. `package.json`
   - `npm run serve:local` 스크립트 추가
   - 내부 명령은 `python3 -m http.server 4180`

3. `MV_운영전_리허설_체크리스트.md`, `MV_릴리스후보_판정.md`, `MV_중복함수_정리계획.md`, `MV_테스트_실행_가이드.md`
   - 최신 자동 검증 기준 `PASS (75 checks)` 반영
   - 수동 리허설 기록지 연결

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (75 checks)
```

## 2026-05-06: MV 6단계 릴리스 후보 판정 문서 작성

### 작업 목적

자동 검증과 운영 전 리허설 자동화가 완료된 상태를 기준으로, MV 6단계가 릴리스 후보 상태인지 판단할 수 있는 요약 문서를 작성했습니다.

### 변경 내용

1. `MV_릴리스후보_판정.md`
   - 자동 검증 기준 `PASS (75 checks)` 기록
   - 릴리스 후보 완료 항목 정리
   - 실제 사용자 프로젝트 1개로 남은 수동 리허설 항목 분리
   - 문제 발생 시 되돌림 기준 커밋과 백업 위치 기록

2. `MV_중복함수_정리계획.md`, `MV_테스트_실행_가이드.md`
   - 릴리스 후보 판정 문서를 진행 상태와 관련 문서 목록에 연결

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (75 checks)
```

## 2026-05-06: MV 운영 전 리허설 런타임 자동화

### 작업 목적

사용자가 직접 프로젝트를 선택하기 전에도 실제 브라우저 저장소 복원 흐름을 검증할 수 있도록, 대표 프로젝트를 Chrome `localStorage`에 넣고 6단계 MV 화면을 복원하는 운영 전 리허설 테스트를 추가했습니다.

### 변경 내용

1. `tests/mv_preflight_rehearsal_runtime_check.js`
   - 실제 Chrome headless에서 `index.html` 로드
   - 대표 프로젝트를 `musicCreatorProjects`, `savedProjects`, `currentProjectId`에 저장
   - `loadProject()`로 6단계 프로젝트 복원 실행
   - MV 탭 활성화, MV 설정, 공통 프롬프트, 씬 데이터, 결과 화면 표시 확인
   - 비어 있지 않은 스크린샷과 페이지 가로 넘침 없음 확인

2. `tests/run_mv_smoke_tests.js`
   - MV 통합 테스트에 운영 전 리허설 런타임 점검 포함

3. `MV_중복함수_정리계획.md`, `MV_테스트_실행_가이드.md`
   - 진행 상태와 보호 범위에 운영 전 리허설 런타임 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (75 checks)
```

## 2026-05-06: MV 실제 프로젝트 리허설 준비 결과 기록

### 작업 목적

실제 사용자 프로젝트로 운영 전 리허설을 수행하기 전에, 현재 작업 폴더와 백업 폴더 안에 바로 사용할 수 있는 저장 프로젝트 데이터가 있는지 확인하고 결과를 문서화했습니다.

### 변경 내용

1. `MV_실제프로젝트_리허설_결과.md`
   - 프로젝트/백업 폴더 내 저장 프로젝트 데이터 탐색 결과 기록
   - 실제 프로젝트 데이터는 앱 브라우저 `localStorage` 또는 클라우드 동기화 데이터에 있을 가능성이 높다는 점 명시
   - 자동 보호 테스트 실행 기준과 실제 화면 리허설 수행 순서 정리

2. `MV_중복함수_정리계획.md`, `MV_테스트_실행_가이드.md`
   - 실제 프로젝트 리허설 준비 결과 문서를 관련 문서 목록과 진행 상태에 연결

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (73 checks)
```

## 2026-05-06: MV 운영 전 리허설 체크리스트 작성

### 작업 목적

자동 테스트로 보호된 MV 6단계 개선 내용을 실제 사용자 데이터로 운영하기 전에, 사람이 그대로 따라 할 수 있는 리허설 절차와 통과 기준을 문서화했습니다.

### 변경 내용

1. `MV_운영전_리허설_체크리스트.md`
   - 시작 전 브랜치/테스트/백업 확인 절차 추가
   - 실제 프로젝트를 열어 MV 설정, 씬 편집, 품질 요약, 저장/확정, 결과 화면, 프로젝트 재진입을 확인하는 순서 정리
   - 자동 테스트 통과 기준과 수동 리허설 통과 기준 분리
   - 문제 발생 시 최근 성공 커밋과 백업 폴더를 기준으로 되돌리는 절차 기록

2. `MV_중복함수_정리계획.md`, `MV_테스트_실행_가이드.md`
   - 운영 전 리허설 체크리스트를 다음 단계 기준 문서로 연결

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (73 checks)
```

## 2026-05-06: MV 6단계 사용자 시나리오 최종 통합 점검

### 작업 목적

MV 6단계 개선 작업의 마지막 확인 단계로, 사용자가 실제로 거치는 편집 확정, 프로젝트 저장, 6단계 복원 흐름이 하나로 이어지는지 보호 테스트를 추가했습니다.

### 변경 내용

1. `tests/mv_user_flow_integration_smoke.js`
   - 씬별 설명, 시간, 가사, 장소, 감정, 무드, 조명, 카메라, EN/KO 프롬프트 편집값을 확정
   - 확정 후 결과 화면 표시와 `mvTotalImages` 반영 확인
   - `saveCurrentProject()`를 통한 `marketing.mv` 정규화 저장 확인
   - 저장된 프로젝트를 `restoreStepData(6)`로 다시 복원해 MV 설정, 프롬프트, 씬 데이터가 유지되는지 확인

2. `tests/run_mv_smoke_tests.js`
   - MV 통합 테스트에 사용자 시나리오 최종 점검 포함

3. `MV_중복함수_정리계획.md`, `MV_테스트_실행_가이드.md`
   - 진행 상태와 보호 범위에 사용자 시나리오 통합 점검 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (73 checks)
```

## 2026-05-06: 실제 Chrome 기준 MV 6단계 시각 안정성 점검 자동화

### 작업 목적

인앱 브라우저 자동 연결이 불안정한 상황에서도 MV 6단계 씬 카드가 실제 렌더링에서 깨지지 않는지 반복 확인할 수 있도록, Chrome headless 기반 시각 안정성 테스트를 추가했습니다.

### 변경 내용

1. `tests/mv_step6_visual_sanity_check.js`
   - 실제 Chrome에서 `index.html`을 로드한 뒤 MV 6단계 씬 개요 화면을 렌더링
   - 390px, 700px, 1280px 화면 폭에서 품질 요약, 타임라인, 씬 카드, 시간/메타데이터/프롬프트 편집 그리드 존재 확인
   - 페이지 가로 넘침과 카드 밖으로 빠지는 입력/버튼/상태 요소가 없는지 확인
   - 각 화면 폭에서 비어 있지 않은 PNG 스크린샷이 생성되는지 확인

2. `tests/run_mv_smoke_tests.js`
   - MV 통합 테스트에 시각 안정성 점검을 포함

3. `MV_중복함수_정리계획.md`, `MV_테스트_실행_가이드.md`
   - 진행 상태와 보호 범위에 실제 Chrome 렌더링 기준 시각 점검 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (71 checks)
```

## 2026-05-06: 편집된 씬 메타데이터의 재생성 프롬프트 우선 반영

### 작업 목적

사용자가 씬별 장소, 감정, 무드, 조명, 카메라, 가사 구간을 직접 수정한 뒤 재생성을 눌렀을 때, 기존 MV 전체 설정보다 씬별 편집값이 우선 반영되도록 개선했습니다.

### 변경 내용

1. `js/step6.js`
   - `getMVSceneRegenerationContext(scene, fallback)` 추가
   - 씬 개요 프롬프트 재생성 전에 편집 폼의 최신 값을 `currentScenes`에 반영
   - 씬별 편집 메타데이터를 Gemini 요청 본문에 별도 섹션으로 추가
   - API 키가 없는 기본 프롬프트 생성에서도 씬별 장소/감정/무드/조명/카메라를 우선 사용
   - 씬 설명과 편집된 가사 구간을 함께 보존해 기본 프롬프트가 장면 맥락을 잃지 않도록 보강

2. `tests/mv_regenerate_scene_overview_prompt_smoke.js`
   - 씬 개요 재생성 요청 본문에 편집된 장소/감정/조명/카메라/가사 구간이 포함되는지 확인
   - 재생성 직전 편집 폼 값이 `currentScenes`에 반영되는지 확인

3. `tests/mv_regenerate_scene_prompt_smoke.js`
   - 결과 화면 씬 프롬프트 재생성 요청에도 씬별 메타데이터가 포함되는지 확인
   - API 키 없는 기본 재생성 흐름에서도 씬 설명과 편집 가사 구간이 함께 유지되는지 확인

4. `MV_테스트_실행_가이드.md`
   - 보호 범위에 편집된 씬별 메타데이터의 프롬프트 재생성 우선 반영 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (67 checks)
```

## 2026-05-06: 씬별 장소/감정/조명 메타데이터 편집 UI 추가

### 작업 목적

감정 기반 추천으로 자동 생성된 씬 메타데이터를 사용자가 직접 다듬을 수 있도록, 씬 개요 편집 카드에 장소, 감정, 무드, 조명, 카메라 입력 영역을 추가했습니다.

### 변경 내용

1. `js/step6.js`
   - 씬 개요 카드에 `장소`, `감정`, `무드`, `조명`, `카메라` 입력 추가
   - 저장 시 `location`, `emotion`, `mood`, `lighting`, `cameraWork`를 씬 데이터에 반영
   - 입력값이 따옴표나 HTML 특수문자를 포함해도 속성 값이 깨지지 않도록 보정

2. `tests/mv_scene_timing_editor_smoke.js`
   - 시간/가사 구간 편집과 함께 장소/감정/무드/조명/카메라 값 저장 확인
   - 잘못된 시간 입력이 있어도 메타데이터는 사용자의 최신 입력으로 저장되는지 확인

3. `tests/mv_confirm_scene_overview_smoke.js`
   - 씬 개요 저장/확정 흐름에서 메타데이터가 실제 `currentScenes`에 반영되는지 추가 확인

4. `MV_테스트_실행_가이드.md`
   - 보호 범위에 씬별 장소/감정/무드/조명/카메라 메타데이터 편집 저장 항목 추가

### 검증 기준

```text
npm run test:mv
MV smoke test suite: PASS (67 checks)
```
