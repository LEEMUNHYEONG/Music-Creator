# MV 6단계 릴리스 후보 판정

작성일: 2026-05-06

## 1. 판정 요약

MV 6단계 개선 작업은 자동 검증과 샘플 프로젝트 실제 화면 리허설 기준으로 릴리스 가능 상태입니다.

현재 판정:

```text
릴리스 후보: 가능
릴리스 판정: 가능
자동 검증: 통과
리허설 서버: 실행 확인
인앱 화면 확인: 앱 로드, 샘플 프로젝트 저장/재로드, MV 탭 씬 편집 저장/복원 확인
남은 작업: 실제 사용자 저장 프로젝트 1개로 장시간 사용 전 추가 확인 권장
```

## 2. 자동 검증 결과

최종 자동 검증 명령:

```text
npm run test:mv
```

수동 리허설 시작 명령:

```text
npm run rehearse:mv
```

기대 결과:

```text
MV smoke test suite: PASS (85 checks)
```

수동 리허설 사전 실행 확인:

```text
2026-05-06 07:33 KST
브랜치: codex/mv-data-model-stabilize
기준 커밋: 37b79e8 Add MV rehearsal start command
앱 주소: http://127.0.0.1:4180/index.html
서버 응답: HTTP 200 OK
```

인앱 브라우저 사전 화면 확인:

```text
2026-05-06 10:37 KST
현재 URL: http://127.0.0.1:4180/index.html
페이지 제목: Music Creator - AI 가사 & 수노 프롬프트 생성기
앱 버전 표시: Music Creator v1.2.190
프로젝트 사이드바: 저장된 프로젝트가 없습니다.
판정: 실제 사용자 프로젝트 수동 리허설 보류
```

샘플 프로젝트 리허설 보강 확인:

```text
2026-05-06 10:40 KST
샘플 프로젝트: Codex MV 리허설 샘플
확인: 프로젝트 저장 및 사이드바 표시
확인: 1단계 다음 버튼으로 2단계 이동
확인: 2단계 제목/가사 전달
조치: 진행바 2단계 마크업 보호 테스트 추가
자동 테스트: PASS (77 checks)
남은 작업: 6단계 MV 탭 실제 화면 리허설
```

6단계 진입 리허설 보강 확인:

```text
2026-05-06 10:52 KST
확인: 진행바 6단계 클릭 후 panel6 활성화
수정: 5/6단계 아이콘을 드래그 핸들 밖 step-icon으로 분리
자동 테스트: PASS (77 checks)
현재 차단: 샘플 프로젝트에 5단계 최종 가사가 없어 마케팅/MV 생성 중단
남은 작업: 최종 가사 포함 프로젝트로 MV 프롬프트 탭과 씬 편집 리허설
```

5→6단계 대체 가사 처리 확인:

```text
2026-05-06 11:07 KST
수정: 최종 가사가 없을 때 2단계 sunoLyrics를 6단계 입력으로 사용
수정: 최종 스타일이 없을 때 2단계 stylePrompt를 6단계 입력으로 사용
자동 테스트: PASS (79 checks)
남은 작업: MV 프롬프트 탭 내 씬 편집/저장/복원 실제 화면 리허설
```

API 키 없음 및 저장/복원 최종 리허설 확인:

```text
2026-05-06 11:35 KST
브랜치: codex/mv-data-model-stabilize
최신 커밋: dd33517 Fix MV scene prompt restore persistence
확인: Gemini API 키가 없어도 MV 프롬프트 탭 작업공간 접근 가능
확인: API 키 없이 로컬 기본 방식으로 27개 씬 카드 생성
확인: 씬 5 영어 프롬프트 편집 후 개별 저장 토스트 표시
확인: 새로고침 후 최신 샘플 프로젝트 재로드 시 편집한 씬 5 프롬프트 복원
자동 테스트: PASS (85 checks)
판정: 샘플 프로젝트 기준 핵심 릴리스 리허설 통과
```

현재 보호 범위에는 다음 항목이 포함됩니다.

1. MV 함수 소유권 중복 재발 방지
2. Chrome 실제 런타임 로딩
3. 모바일/태블릿/데스크톱 반응형 컬럼
4. 실제 Chrome 기준 시각 안정성
5. Chrome localStorage 대표 프로젝트 운영 전 리허설
6. 사용자 시나리오 기준 편집 확정, 저장, 복원 통합 흐름
7. 씬 시간/가사/메타데이터 편집
8. 씬 품질 요약, 필터, 포커스, 확정 전 확인 알림
9. TXT/SRT/복사 내보내기
10. 프롬프트 재생성, 번역 동기화, 저장 보호

## 3. 릴리스 후보 기준으로 완료된 것

1. `marketing.mv` 정규화 모델과 기존 `mvSettings`, `mvPrompts`, `mvScenes` 호환 유지
2. 6단계 복원 로직 분리와 보호 테스트 추가
3. 씬별 타임라인, 메타데이터, 품질 요약, 필터, 포커스 흐름 보강
4. 씬별 편집값을 재생성/내보내기/복원 흐름에 반영
5. 실제 Chrome 기반 화면/런타임 테스트 추가
6. 운영 전 리허설 체크리스트와 준비 결과 문서화

## 4. 릴리스 전 반드시 남은 수동 확인

핵심 릴리스 차단 항목은 해소됐습니다.

다만 샘플 프로젝트가 아닌 실제 사용자 장기 작업 프로젝트는 데이터량, 작성 이력, 중간 저장 상태가 다를 수 있으므로 배포 또는 장시간 사용 전 아래 확인을 권장합니다.

1. 앱 화면에서 사용자가 실제 저장 프로젝트 1개를 엽니다.
2. `MV_운영전_리허설_체크리스트.md` 순서대로 6단계 MV 탭을 확인합니다.
3. 씬 2개 이상을 수정하고 저장/확정합니다.
4. 프로젝트를 다시 열어 MV 설정, 공통 프롬프트, 씬별 시간/가사/메타데이터/EN·KO 프롬프트가 유지되는지 확인합니다.
5. 복사/TXT/SRT 내보내기에 씬별 타임라인과 메타데이터가 포함되는지 확인합니다.

## 5. 되돌림 기준

문제가 생기면 아래 순서로 되돌림 기준을 잡습니다.

1. 마지막 자동 검증 성공 커밋:
   ```text
   dd33517 Fix MV scene prompt restore persistence
   ```

2. 운영 전 문서화 기준 커밋:
   ```text
   5a79288 Record MV project rehearsal readiness
   2039845 Document MV preflight rehearsal
   ```

3. API 키 없음 및 씬 fallback 기준 커밋:
   ```text
   51b354f Add MV no-key scene fallback
   426c9a7 Keep MV workspace accessible without Gemini key
   4225d0a Add MV marketing fallback inputs
   ```

4. 원본 백업 폴더:
   ```text
   /Users/leemunhyeong/Music Creator Backups/backup_2026-05-06_before_mv_improvements
   ```

## 6. 최종 결론

현재 상태는 자동화된 릴리스 후보 기준과 샘플 프로젝트 실제 화면 리허설 기준을 충족합니다.

최신 기준 커밋은 다음과 같습니다.

```text
dd33517 Fix MV scene prompt restore persistence
```

실제 사용자 프로젝트 1개로 추가 리허설을 수행하면 그 결과는 `MV_수동리허설_기록지.md`에 이어서 남깁니다.
