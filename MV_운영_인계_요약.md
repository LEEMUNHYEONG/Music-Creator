# MV 운영 인계 요약

작성일: 2026-05-06

## 1. 현재 판정

```text
상태: 릴리스 가능
브랜치: codex/mv-data-model-stabilize
운영 기준 태그: mv-stabilization-2026-05-06
최신 문서 기준 커밋: 6edb6f3 Refresh MV rehearsal documentation baseline
체크리스트 기준 커밋: 98acbe6 Update MV rehearsal checklist baseline
마감 기록 커밋: 3116aff Record MV stabilization release closeout
저장/복원 수정 커밋: dd33517 Fix MV scene prompt restore persistence
자동 테스트: npm run test:mv -> PASS (93 checks)
```

## 2. 완료된 핵심 범위

1. `app.js`와 `js/step6.js` 사이의 MV 전역 함수 중복 소유권 정리
2. 6단계 MV 설정, 캐릭터, 씬, SRT 영역을 `js/step6.js` 중심으로 안정화
3. `marketing.mv` 정규화 모델과 기존 `mvSettings`, `mvPrompts`, `mvScenes` 호환 유지
4. API 키가 없어도 MV 프롬프트 탭 작업공간 접근 가능
5. API 키 없이 로컬 기본 방식으로 MV 씬 카드 생성 가능
6. 씬별 시간, 가사, 메타데이터, EN/KO 프롬프트 편집/저장/복원 보호
7. 씬 5 프롬프트 개별 저장 후 새로고침/프로젝트 재로드 복원 실제 화면 확인
8. Runway/Pika/Kling 영상 생성 도구별 프롬프트 복사와 TXT 다운로드 지원
9. 씬 번호, 시간, 가사, EN 프롬프트, KO 설명을 TSV 표로 복사 가능
10. 썸네일/배경/인물/통합/씬별 이미지 생성 프롬프트 번들 복사와 TXT 다운로드 지원
11. TXT/SRT 내보내기 결과에 프로젝트 제목과 릴리스 기준 정보 포함
12. 자동 테스트, Chrome 런타임, 샘플 프로젝트 리허설 문서화 완료

## 3. 바로 쓰는 실행 명령

```text
cd "/Users/leemunhyeong/Music Creator"
npm run test:mv
```

수동 리허설 서버까지 열 때:

```text
cd "/Users/leemunhyeong/Music Creator"
npm run rehearse:mv
```

앱 주소:

```text
http://127.0.0.1:4180/index.html
```

## 4. 운영 전 마지막 권장 확인

샘플 프로젝트 기준 핵심 저장/복원은 통과했습니다.

실제 장기 작업 프로젝트로 운영 전 한 번 더 확인할 항목은 아래와 같습니다.

1. 기존 저장 프로젝트 1개 열기
2. 6단계 `MV 프롬프트` 탭 진입
3. 씬 2개 이상 시간, 가사, 메타데이터, EN/KO 프롬프트 수정
4. 현재 편집 내용 저장/확정
5. 새로고침 후 같은 프로젝트 재로드
6. MV 설정, 공통 프롬프트, 씬별 편집값, 결과 화면 유지 확인
7. 복사, TXT, SRT 내보내기 결과에 씬별 타임라인과 메타데이터 포함 확인

상세 절차는 `MV_운영전_리허설_체크리스트.md`를 기준으로 합니다.

## 5. 문제 발생 시 되돌림 기준

최근 안정 기준:

```text
mv-stabilization-2026-05-06
6edb6f3 Refresh MV rehearsal documentation baseline
98acbe6 Update MV rehearsal checklist baseline
3116aff Record MV stabilization release closeout
dd33517 Fix MV scene prompt restore persistence
```

API 키 없음 및 fallback 기준:

```text
51b354f Add MV no-key scene fallback
426c9a7 Keep MV workspace accessible without Gemini key
4225d0a Add MV marketing fallback inputs
```

원본 백업:

```text
/Users/leemunhyeong/Music Creator Backups/backup_2026-05-06_before_mv_improvements
```

## 6. 관련 문서

1. `MV_중복함수_정리계획.md`: 전체 40개 완료 항목
2. `MV_릴리스후보_판정.md`: 릴리스 가능 판정과 되돌림 기준
3. `MV_릴리스_노트_2026-05-06.md`: 이번 릴리스 변경 사항과 검증 결과
4. `MV_수동리허설_기록지.md`: 실제 화면 리허설 기록
5. `MV_운영전_리허설_체크리스트.md`: 실제 사용자 프로젝트 점검 절차
6. `MV_테스트_실행_가이드.md`: 자동 테스트 보호 범위
7. `MV_실제프로젝트_리허설_결과.md`: 샘플/실제 프로젝트 리허설 준비 결과
8. `MV_2차_고도화_로드맵.md`: 안정화 이후 제품 고도화 순서
9. `MV_개선작업_이력.md`: 날짜별 개선 이력
