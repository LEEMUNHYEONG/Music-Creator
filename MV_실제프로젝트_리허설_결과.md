# MV 실제 프로젝트 리허설 준비 결과

작성일: 2026-05-06

## 1. 이번 단계 목적

직전 단계에서 작성한 `MV_운영전_리허설_체크리스트.md`를 실제 사용자 프로젝트에 적용하기 전, 현재 작업 폴더 안에 리허설에 바로 사용할 수 있는 저장 프로젝트 데이터가 있는지 확인하고 자동 사전점검을 수행했습니다.

## 2. 확인 결과

1. 현재 프로젝트 폴더와 백업 폴더에서 JSON/문서 파일을 확인했습니다.
2. 코드와 문서 안에는 `musicCreatorProjects`, `savedProjects`, `marketing.mv`, `mvScenes` 관련 구조가 존재합니다.
3. 초기 확인 당시 실제 사용자가 저장한 프로젝트 데이터 JSON 파일은 현재 작업 폴더나 백업 폴더 안에서 별도로 발견되지 않았습니다.
4. 이후 인앱 브라우저에서 샘플 프로젝트 `Codex MV 리허설 샘플`을 생성해 저장 목록, 6단계 진입, MV 탭, 씬 저장/복원 흐름을 검증했습니다.
5. 실제 장기 작업 프로젝트 데이터는 앱 브라우저의 `localStorage` 또는 클라우드 동기화 데이터에 들어 있을 가능성이 높습니다.

## 3. 자동 사전점검

아래 명령으로 MV 보호 테스트를 실행했습니다.

```text
npm run test:mv
```

기대 결과:

```text
MV smoke test suite: PASS (97 checks)
```

최신 기준 커밋:

```text
98acbe6 Update MV rehearsal checklist baseline
3116aff Record MV stabilization release closeout
dd33517 Fix MV scene prompt restore persistence
```

## 4. 실제 화면 리허설을 진행하는 방법

실제 사용자 프로젝트 리허설은 다음 순서로 진행합니다.

1. 앱을 실행합니다.
2. 기존 저장 프로젝트를 하나 엽니다.
3. `MV_운영전_리허설_체크리스트.md`의 2번 절차를 따라 6단계 MV 프롬프트 탭을 점검합니다.
4. 씬 2개 이상을 수정하고 저장/확정합니다.
5. 프로젝트를 다시 열어 값이 유지되는지 확인합니다.
6. 문제가 있으면 체크리스트의 단계 번호와 증상을 기록합니다.

## 5. 현재 판정

자동 보호 테스트와 리허설 절차 준비는 완료됐습니다.

샘플 프로젝트 기준 핵심 MV 저장/복원 리허설은 통과했습니다.

실제 사용자 장기 작업 프로젝트 기반 리허설은 사용자가 앱 화면에서 기존 프로젝트를 선택한 뒤 수행해야 합니다.
현재 코드 기준으로는 그 리허설을 안전하게 수행할 수 있는 자동 보호 장치와 되돌림 기준이 준비되어 있습니다.

## 6. 2026-05-07 자동 리허설 보강 결과

최신 배포 버전 `v1.2.199` 기준으로 샘플 프로젝트 자동 리허설에 씬 카드 작업 상태 UI 확인을 추가했습니다.

```text
node tests/mv_preflight_rehearsal_runtime_check.js
MV preflight rehearsal runtime check: PASS

npm run test:mv
MV smoke test suite: PASS (97 checks)
```

추가 보호 범위:

- 씬 카드 상태 라인 렌더링
- `씬 저장` 버튼 문구와 역할 안내
- 복사 버튼의 저장 별개 안내
- 재생성 버튼의 다시 생성 안내

실제 사용자 장기 작업 프로젝트 리허설은 여전히 앱 화면에서 프로젝트 1개를 선택한 뒤 수행해야 합니다.

## 7. 2026-05-07 최신 검수/내보내기 리허설 보강 결과

사용자 체감 품질 개선 로드맵 완료 후 최신 샘플 프로젝트 자동 리허설에 아래 범위를 추가했습니다.

```text
node tests/mv_preflight_rehearsal_runtime_check.js
MV preflight rehearsal runtime check: PASS

npm run test:mv
MV smoke test suite: PASS (99 checks)
```

추가 확인 범위:

1. 대표 프로젝트 복원 후 씬 품질 요약이 준비 완료/확인 필요 개수를 반영하는지 확인
2. `확인 필요만 보기` 토글이 준비 완료 씬을 숨기고 확인 필요 씬만 남기는지 확인
3. 전체 MV 프롬프트 최종 확인 메시지가 프로젝트명, 씬 수, 포함 항목을 표시하는지 확인

판정:

자동 보호 테스트와 샘플 프로젝트 리허설 범위는 최신 검수/내보내기 기능까지 확장 완료했습니다. 실제 사용자 장기 작업 프로젝트 리허설은 앱 화면에서 프로젝트 1개를 선택한 뒤 수행해야 합니다.

## 8. 2026-05-07 실제 프로젝트 리허설 판정 보강 결과

실제 사용자 장기 프로젝트를 열었을 때 `MV 진단` 메시지만 보고도 리허설 진행 가능 여부를 판단할 수 있도록 진단 요약에 판정 섹션을 추가했습니다.

```text
node tests/mv_marketing_diagnostics_smoke.js
MV marketing diagnostics smoke test: PASS

npm run test:mv
MV smoke test suite: PASS (99 checks)
```

추가 확인 범위:

1. `MV 실제 프로젝트 리허설 판정` 섹션 표시
2. 씬 데이터 존재 여부 확인
3. canonical/legacy 씬 수 동기화 확인
4. 씬별 EN/KO 프롬프트 누락 확인
5. MV 설정과 공통 프롬프트 저장 여부 확인

판정 기준:

- `통과`: 실제 프로젝트 리허설 진행 가능
- `보류`: 리허설은 가능하나 일부 항목 확인 필요
- `실패`: 리허설 전에 데이터 보정 필요

추가 보강:

`MV 진단` 결과에는 `다음 조치` 문구가 포함되며, 보고서 전체가 클립보드에 자동 복사됩니다. 실제 장기 프로젝트 리허설 시 이 내용을 `MV_수동리허설_기록지.md`에 바로 붙여넣어 추적할 수 있습니다.

## 9. 2026-05-07 리허설 보고서 형식 보강 결과

`MV 진단` 클립보드 내용이 실제 기록지에 바로 붙여넣을 수 있는 보고서 형식으로 확장되었습니다.

```text
node tests/mv_marketing_diagnostics_smoke.js
MV marketing diagnostics smoke test: PASS

npm run test:mv
MV smoke test suite: PASS (99 checks)
```

추가된 보고서 항목:

1. 생성 시각과 앱 버전
2. 프로젝트명
3. 리허설 판정, 요약, 다음 조치
4. MV marketing.mv 진단 요약
5. 저장 전/후 비교
6. 기록지 붙여넣기 안내
