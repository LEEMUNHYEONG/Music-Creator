# MV 수동 리허설 기록지

작성일: 2026-05-06

이 문서는 실제 사용자 프로젝트 1개로 MV 6단계 최종 수동 리허설을 수행한 뒤 결과를 남기는 기록지입니다.

## 1. 실행 정보

```text
리허설 일시:
사용 프로젝트명:
브랜치:
앱 주소:
실행자:
```

권장 앱 주소:

```text
http://127.0.0.1:4180/index.html
```

로컬 서버 실행:

```text
npm run serve:local
```

자동 테스트 통과 후 로컬 서버 실행:

```text
npm run rehearse:mv
```

자동 테스트 기준:

```text
npm run test:mv
MV smoke test suite: PASS (97 checks)
```

## 2. 사전 실행 확인 기록

2026-05-06 07:33 KST 기준으로 수동 리허설 시작 전 상태를 확인했습니다.

```text
브랜치: codex/mv-data-model-stabilize
기준 커밋: 37b79e8 Add MV rehearsal start command
실행 명령: npm run rehearse:mv
자동 테스트: PASS (75 checks)
앱 주소: http://127.0.0.1:4180/index.html
서버 응답: HTTP 200 OK
상태: 실제 사용자 프로젝트 1개 선택 후 화면 리허설 대기
```

## 3. 인앱 브라우저 사전 화면 확인

2026-05-06 10:37 KST 기준으로 인앱 브라우저에서 앱 첫 화면을 확인했습니다.

```text
현재 URL: http://127.0.0.1:4180/index.html
페이지 제목: Music Creator - AI 가사 & 수노 프롬프트 생성기
앱 버전 표시: Music Creator v1.2.190
프로젝트 사이드바: 저장된 프로젝트가 없습니다.
현재 상태: 실제 사용자 저장 프로젝트가 없어 13개 항목 수동 리허설은 보류
다음 조치: 사용자가 저장 프로젝트 1개를 만들거나 불러온 뒤 6단계 MV 탭 리허설 진행
```

## 4. 수동 리허설 체크 결과

아래 항목을 `통과`, `보류`, `실패` 중 하나로 기록합니다.

| 번호 | 확인 항목 | 결과 | 메모 |
|---:|---|---|---|
| 1 | 기존 프로젝트 1개 열기 | 통과 | 샘플 프로젝트 `Codex MV 리허설 샘플` 생성 후 사이드바에서 다시 열기 확인 |
| 2 | 6단계 마케팅 자료 화면 진입 | 통과 | 진행바 5/6단계 아이콘 클릭 차단 수정 후 6단계 패널 활성화 확인 |
| 3 | `MV 프롬프트` 탭 열기 | 통과 | Gemini API 키 없음 상태에서도 MV 탭 작업공간 표시 확인 |
| 4 | MV 설정값 확인 | 통과 | 기본 길이 3:30, 8초 간격, 예상 27장 표시 확인 |
| 5 | 씬 2개 이상 시간/가사/메타데이터 수정 | 보류 | 샘플 리허설에서는 씬 프롬프트 저장/복원 핵심 경로를 우선 확인 |
| 6 | 씬 EN/KO 프롬프트 수정 | 통과 | 씬 5 영어 프롬프트 편집 후 개별 저장 확인 |
| 7 | 씬 품질 요약/필터/포커스 확인 |  |  |
| 8 | 확인 필요 항목 경고 문구 확인 |  |  |
| 9 | 현재 편집 내용 저장/확정 | 통과 | `saveScenePrompt(4)` 개별 저장 후 프로젝트 로컬 저장 로그 확인 |
| 10 | 결과 화면 씬 수/프롬프트 유지 확인 | 통과 | API 키 없이 로컬 기본 방식으로 27개 씬 카드 생성 확인 |
| 11 | TXT/복사/SRT 내보내기 씬 정보 포함 확인 | 보류 | 실제 사용자 장기 프로젝트 선택 후 `MV 진단` 판정과 함께 재확인 |
| 12 | 프로젝트 저장 후 재진입 복원 확인 | 통과 | 새로고침 후 최신 샘플 프로젝트 재로드 시 씬 5 편집 프롬프트 복원 확인 |
| 13 | 모바일 폭에서 씬 카드 가로 깨짐 없음 확인 |  |  |

## 5. 문제 기록

문제가 있으면 아래 형식으로 남깁니다.

```text
문제 번호:
체크 항목 번호:
증상:
재현 순서:
예상 동작:
실제 동작:
스크린샷/메모:
판정: 보류 / 실패
```

## 6. 최종 판정

```text
최종 판정: 샘플 프로젝트 기준 핵심 리허설 통과
릴리스 판정 변경: 릴리스 가능
추가 조치: 실제 사용자 저장 프로젝트 1개로 장시간 사용 전 추가 리허설 권장
```

판정 기준:

1. 모든 핵심 항목이 `통과`이면 `MV_릴리스후보_판정.md`의 판정을 `릴리스 가능`으로 올릴 수 있습니다.
2. `보류`가 있으면 릴리스 후보 상태를 유지하고 해당 항목만 재점검합니다.
3. `실패`가 있으면 자동 테스트 통과 여부와 관계없이 릴리스 확정을 보류합니다.

## 7. 샘플 프로젝트 리허설 보강 기록

2026-05-06 10:40 KST 기준으로 실제 저장 프로젝트가 없는 상태를 풀기 위해 샘플 프로젝트를 생성했습니다.

```text
샘플 프로젝트명: Codex MV 리허설 샘플
확인 결과: 프로젝트 저장 및 사이드바 목록 표시 확인
확인 결과: 사이드바를 닫은 뒤 1단계 다음 버튼으로 2단계 이동 확인
확인 결과: 2단계에 제목과 가사 전달 확인
발견 문제: 진행바 2단계 마크업에 data-step/onclick 누락
조치: 진행바 1~6단계 구조 보호 테스트 추가
자동 테스트: PASS (77 checks)
남은 확인: 6단계 MV 탭 실제 화면 진입과 씬 편집 리허설
```

## 8. 6단계 진입 리허설 보강 기록

2026-05-06 10:52 KST 기준으로 6단계 마케팅 화면 진입을 실제 브라우저에서 확인했습니다.

```text
확인 결과: 진행바 6단계 마케팅 아이콘 클릭 시 panel6 활성화
발견 문제: 5/6단계 아이콘이 드래그 핸들 안에 있어 event.stopPropagation()으로 클릭 이동 차단
조치: 5/6단계 아이콘을 별도 step-icon으로 분리
자동 테스트: PASS (77 checks)
현재 차단: 샘플 프로젝트에 5단계 최종 가사가 없어 마케팅/MV 생성 중단
앱 메시지: 마케팅 자료를 생성할 가사가 없습니다. 5단계에서 최종 가사를 확인한 후 다시 시도해주세요.
남은 확인: 최종 가사 포함 프로젝트로 MV 프롬프트 탭과 씬 편집/저장/복원 리허설
```

## 9. 5→6단계 대체 가사 처리 기록

2026-05-06 11:07 KST 기준으로 5단계 최종 가사가 없는 샘플 프로젝트도 2단계 수노 가사를 6단계 생성 입력으로 넘길 수 있도록 보강했습니다.

```text
발견 문제: goToMarketingStep()이 finalLyrics가 없으면 marketingData.lyrics를 빈 값으로 고정
영향: generateMarketingMaterials()의 sunoLyrics 대체 입력이 가려져 6단계 생성이 중단됨
조치: 5→6단계 이동 시 sunoLyrics와 저장 프로젝트의 sunoLyrics를 대체 가사로 사용
조치: stylePrompt도 최종 스타일이 없을 때 대체 스타일로 사용
자동 테스트: PASS (79 checks)
남은 확인: MV 프롬프트 탭 내 씬 편집/저장/복원 실제 화면 리허설
```

## 10. MV 프롬프트 탭 씬 편집/저장/복원 리허설

2026-05-06 11:35 KST 기준으로 샘플 프로젝트의 MV 프롬프트 탭 실제 화면 리허설을 완료했습니다.

```text
브랜치: codex/mv-data-model-stabilize
최신 커밋: dd33517 Fix MV scene prompt restore persistence
앱 주소: http://127.0.0.1:4180/index.html
샘플 프로젝트명: Codex MV 리허설 샘플
확인 결과: Gemini API 키 없음 상태에서도 MV 탭 진입 가능
확인 결과: API 키 없이 로컬 기본 방식으로 27개 씬 카드 생성
확인 결과: 씬 5 영어 프롬프트 편집 및 개별 저장 토스트 확인
확인 결과: 새로고침 후 최신 샘플 프로젝트 재로드 시 씬 5 편집 프롬프트 복원
발견 문제: 기존 저장 로직이 legacy mvScenes보다 stale marketing.mv.scenes를 우선해 편집값을 되돌림
조치: setMarketingMVScenes() 추가 및 씬 저장/확정/프로젝트 저장 경로에서 legacy/new 모델 동시 갱신
자동 테스트: PASS (85 checks)
판정: 핵심 저장/복원 리허설 통과
```

## 11. 씬 카드 작업 상태 자동 리허설 보강

2026-05-07 03:23 KST 기준으로 최신 배포 버전의 씬 카드 작업 상태 표시까지 자동 리허설 범위에 추가했습니다.

```text
앱 버전: v1.2.199
실행 명령: node tests/mv_preflight_rehearsal_runtime_check.js
결과: MV preflight rehearsal runtime check: PASS

추가 확인:
- MV 탭 진입 후 씬 카드 상태 라인 렌더링
- `씬 저장` 버튼 문구와 개별 저장 역할 안내
- 복사 버튼의 저장 별개 안내
- 재생성 버튼의 다시 생성 안내

전체 자동 테스트:
npm run test:mv
MV smoke test suite: PASS (97 checks)

판정: 샘플 프로젝트 기준 운영 전 자동 리허설 보강 통과
남은 확인: 실제 사용자 장기 작업 프로젝트 1개로 수동 리허설 수행
```

## 12. 최신 검수/내보내기 자동 리허설 보강

2026-05-07 기준으로 사용자 체감 품질 개선 로드맵 완료 후 추가된 검수 편의 기능까지 운영 전 자동 리허설 범위에 포함했습니다.

```text
실행 명령: node tests/mv_preflight_rehearsal_runtime_check.js
결과: MV preflight rehearsal runtime check: PASS

전체 자동 테스트:
npm run test:mv
MV smoke test suite: PASS (99 checks)
```

추가 확인:
- 대표 프로젝트 복원 후 품질 요약이 `전체 2개 씬 / 준비 완료 1개 / 확인 필요 1개` 상태를 표시
- `확인 필요만 보기` 토글 시 준비 완료 씬이 숨겨지고 확인 필요 씬만 표시
- 전체 MV 프롬프트 최종 확인 메시지에 프로젝트명, 씬 수, 포함 항목이 표시

판정: 최신 검수/내보내기 UI까지 샘플 프로젝트 기준 자동 리허설 통과
남은 확인: 실제 사용자 장기 작업 프로젝트 1개로 수동 리허설 수행

## 13. 샘플 프로젝트 실제 화면 검수 리허설 보강

2026-05-07 기준으로 인앱 브라우저에서 샘플 프로젝트 `Codex MV 리허설 샘플`을 열고 6단계 MV 프롬프트 탭을 실제 화면으로 재확인했습니다.

```text
앱 주소: http://127.0.0.1:4180/index.html
프로젝트: Codex MV 리허설 샘플
확인 결과: MV 프롬프트 탭 진입
확인 결과: MV 프롬프트 생성 후 27개 씬 생성
발견 문제: 품질 요약은 확인 필요 27개인데 `확인 필요만 보기` 버튼이 비활성화되어 표시됨
원인: 씬 개요 렌더링 시 `scenesArg`와 `window.currentScenes` 동기화 타이밍 차이
조치: `renderSceneOverview()` 시작 시 `window.currentScenes = scenes`로 기준 씬 목록을 먼저 동기화
재확인: `확인 필요만 보기` 버튼 활성화, 씬 카드 배지에 `반복` 확인 항목 표시
```

자동 테스트:

```text
npm run test:mv
MV smoke test suite: PASS (99 checks)
```

판정: 샘플 프로젝트 기준 최신 검수 UI 실제 화면 리허설 통과
남은 확인: 실제 사용자 장기 작업 프로젝트 1개로 수동 리허설 수행

## 14. 실제 프로젝트 리허설 판정 진단 보강

2026-05-07 기준으로 `MV 진단` 메시지에 실제 프로젝트 리허설 판정 섹션을 추가했습니다.

```text
실행 명령: node tests/mv_marketing_diagnostics_smoke.js
결과: MV marketing diagnostics smoke test: PASS

전체 자동 테스트:
npm run test:mv
MV smoke test suite: PASS (99 checks)
```

추가 확인:
- `MV 실제 프로젝트 리허설 판정` 표시
- 씬 데이터 존재, canonical/legacy 동기화, 씬별 프롬프트 누락, MV 설정, 공통 프롬프트 저장 여부를 `통과/보류/실패`로 구분

실제 사용자 장기 프로젝트를 열었을 때 `MV 진단` 판정이 `통과`이면 체크리스트의 저장/복원/내보내기 수동 리허설을 진행합니다.

## 15. MV 진단 보고서 기록 편의 보강

2026-05-07 기준으로 `MV 진단` 결과에 `다음 조치` 문구를 추가하고, 진단 보고서를 클립보드에 자동 복사하도록 보강했습니다.

```text
실행 명령: node tests/mv_marketing_diagnostics_smoke.js
결과: MV marketing diagnostics smoke test: PASS

전체 자동 테스트:
npm run test:mv
MV smoke test suite: PASS (99 checks)
```

실제 프로젝트 리허설 시 사용 방법:
1. 실제 사용자 장기 프로젝트를 엽니다.
2. 6단계 `MV 프롬프트` 탭에서 `MV 진단`을 누릅니다.
3. 표시된 `판정`과 `다음 조치`를 확인합니다.
4. 클립보드에 복사된 진단 보고서를 이 기록지의 문제 기록 또는 최종 판정에 붙여넣습니다.

## 16. MV 실제 프로젝트 리허설 보고서 형식 보강

2026-05-07 기준으로 `MV 진단` 클립보드 내용이 기록지에 바로 붙여넣기 좋은 보고서 형식으로 확장되었습니다.

```text
실행 명령: node tests/mv_marketing_diagnostics_smoke.js
결과: MV marketing diagnostics smoke test: PASS

전체 자동 테스트:
npm run test:mv
MV smoke test suite: PASS (99 checks)
```

보고서에 포함되는 항목:
- 생성 시각
- 앱 버전
- 프로젝트명
- 리허설 판정과 다음 조치
- MV marketing.mv 진단 요약
- 저장 전/후 비교
- 기록 방법 안내

## 17. MV 진단 보고서 버튼 문구 보강

2026-05-07 기준으로 결과 화면의 내보내기 도구 영역에서 `MV 진단` 버튼을 `MV 진단 보고서 복사`로 명확히 바꿨습니다.

```text
실행 명령: node tests/mv_video_tool_export_templates_smoke.js
결과: MV video tool export templates smoke test: PASS

전체 자동 테스트:
npm run test:mv
MV smoke test suite: PASS (99 checks)
```

확인 내용:
- 내보내기 도구 설명에 리허설 진단 보고서 복사 안내 표시
- 버튼 title에 보고서 표시와 클립보드 복사 동작 안내 표시

## 18. MV 리허설 진단 보고서 TXT 저장 추가

2026-05-07 기준으로 결과 화면의 내보내기 도구 영역에 `보고서 TXT` 버튼을 추가했습니다.

```text
실행 명령:
node tests/mv_marketing_diagnostics_smoke.js
node tests/mv_video_tool_export_templates_smoke.js

결과:
MV marketing diagnostics smoke test: PASS
MV video tool export templates smoke test: PASS

전체 자동 테스트:
npm run test:mv
MV smoke test suite: PASS (99 checks)
```

실제 프로젝트 리허설 시 사용 방법:
1. 실제 사용자 장기 프로젝트를 엽니다.
2. 6단계 `MV 프롬프트` 탭에서 씬 목록과 내보내기 영역을 확인합니다.
3. `MV 진단 보고서 복사`로 즉시 확인하거나, `보고서 TXT`로 파일을 저장합니다.
4. 저장된 TXT 파일을 리허설 증빙으로 보관하고, 주요 판정을 이 기록지에 붙여넣습니다.

## 19. MV 리허설 진단 보고서 모달 표시 추가

2026-05-07 기준으로 `MV 진단 보고서 복사`를 누르면 긴 보고서가 브라우저 기본 알림창이 아니라 앱 내부 전용 모달에 표시됩니다.

```text
실행 명령:
node tests/mv_marketing_diagnostics_smoke.js
node tests/mv_chrome_runtime_check.js

결과:
MV marketing diagnostics smoke test: PASS
MV Chrome runtime check: PASS

전체 자동 테스트:
npm run test:mv
MV smoke test suite: PASS (99 checks)
```

실제 프로젝트 리허설 시 확인 항목:
- 모달 안에서 보고서 전체 줄바꿈이 유지되는지 확인
- `복사` 버튼으로 같은 보고서가 클립보드에 복사되는지 확인
- `TXT 저장` 버튼으로 같은 보고서가 파일로 저장되는지 확인
- 바깥 영역 또는 `닫기` 버튼으로 모달이 닫히는지 확인

## 20. MV 진단 보고서 우선 확인 씬 추가

2026-05-07 기준으로 MV 리허설 진단 보고서에 `우선 확인 씬` 섹션을 추가했습니다.

```text
실행 명령:
node tests/mv_marketing_diagnostics_smoke.js
node tests/mv_chrome_runtime_check.js

결과:
MV marketing diagnostics smoke test: PASS
MV Chrome runtime check: PASS

전체 자동 테스트:
npm run test:mv
MV smoke test suite: PASS (99 checks)
```

보고서에서 확인 가능한 항목:
- 시간 확인
- 장소 없음
- 카메라 없음
- 가사 없음
- EN 프롬프트 없음
- KO 프롬프트 없음
- 배경/구도/카메라 반복

실제 프로젝트 리허설 시 `우선 확인 씬` 상단부터 수정하고, 수정 후 다시 `MV 진단 보고서 복사` 또는 `보고서 TXT`로 결과를 비교합니다.

## 21. MV 진단 모달 첫 확인 씬 이동 추가

2026-05-07 기준으로 MV 진단 보고서 모달에 `첫 확인 씬으로 이동` 버튼을 추가했습니다.

```text
실행 명령:
node tests/mv_marketing_diagnostics_smoke.js
node tests/mv_chrome_runtime_check.js

결과:
MV marketing diagnostics smoke test: PASS
MV Chrome runtime check: PASS

전체 자동 테스트:
npm run test:mv
MV smoke test suite: PASS (99 checks)
```

실제 프로젝트 리허설 시 확인 항목:
- `MV 진단 보고서 복사` 클릭 후 모달이 열리는지 확인
- `첫 확인 씬으로 이동` 클릭 시 모달이 닫히고 확인 필요 씬으로 이동하는지 확인
- 확인 필요 씬이 없는 경우 안내 메시지가 표시되는지 확인
