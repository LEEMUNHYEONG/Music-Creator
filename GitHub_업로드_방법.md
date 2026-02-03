# Music-Creator · GitHub 업로드/다운로드 방법

사무실 PC에서 GitHub에 올리고, 노트북에서 받아서 작업하는 방법입니다.

---

## 1. 처음 한 번만 설정 (사무실 PC / 노트북 각각)

### 1-1. Git 사용자 정보 설정

```powershell
git config --global user.name "이문형"
git config --global user.email "lsmehh@gmail.com"
```

### 1-2. GitHub 저장소 주소 확인

- 저장소: **https://github.com/LEEMUNHYEONG/Music-Creator**
- 브랜치: **main**

---

## 2. 사무실 PC → GitHub에 업로드 (Push)

작업한 내용을 GitHub에 올릴 때마다 아래 순서로 실행합니다.

### 2-1. 프로젝트 폴더로 이동

```powershell
cd "d:\개인자료\work\Music-Creator"
```

(노트북에서는 프로젝트를 둔 경로로 바꿔서 실행)

### 2-2. 변경된 파일 스테이징

```powershell
git add .
```

- `git add .` : 변경된 모든 파일을 스테이징
- 특정 파일만 올리려면: `git add app.js index.html styles.css` 처럼 파일명 지정

### 2-3. 커밋 (저장 메시지 남기기)

```powershell
git commit -m "작업 내용을 한 줄로 요약"
```

예시:
```powershell
git commit -m "지침서 모달 개선 및 프로젝트 저장 버그 수정"
```

### 2-4. 원격 최신 내용 가져오기 (충돌 방지)

```powershell
git pull origin main
```

- 다른 PC에서 올린 내용이 있으면 먼저 받아서 합친 뒤 푸시해야 합니다.
- “Already up to date” 나오면 그대로 다음 단계로.

### 2-5. GitHub에 업로드

```powershell
git push origin main
```

- 처음 push 시 로그인(또는 토큰) 요청이 나오면 GitHub 계정으로 인증합니다.

---

## 3. 노트북에서 처음 받을 때 (Clone)

노트북에서 **처음** 이 프로젝트를 받을 때는 **clone** 합니다.

### 3-1. 받을 폴더로 이동

예: 바탕화면 폴더에서 받으려면

```powershell
cd C:\Users\본인사용자명\Desktop
```

### 3-2. 저장소 복제

```powershell
git clone https://github.com/LEEMUNHYEONG/Music-Creator.git
```

- `Music-Creator` 폴더가 생기고, 그 안에 최신 코드가 들어옵니다.

### 3-3. 폴더로 들어가서 작업

```powershell
cd Music-Creator
```

이후 여기서 프로그램 수정하고, 아래 “4. 노트북에서 계속 작업할 때” 순서대로 push 하면 됩니다.

---

## 4. 노트북에서 계속 작업할 때 (Pull → 작업 → Push)

이미 clone 해 둔 노트북에서는 **당겨오기 → 수정 → 올리기**만 반복하면 됩니다.

### 4-1. 사무실에서 올린 최신 버전 받기

```powershell
cd "노트북의 Music-Creator 폴더 경로"
git pull origin main
```

### 4-2. 프로그램 수정 (에디터에서 작업)

- `index.html`, `app.js`, `styles.css` 등 수정

### 4-3. 다시 GitHub에 올리기

```powershell
git add .
git commit -m "노트북에서 수정한 내용 요약"
git pull origin main
git push origin main
```

---

## 5. 한 번에 복사해서 쓸 명령어 정리

### 사무실에서 올릴 때

```powershell
cd "d:\개인자료\work\Music-Creator"
git add .
git commit -m "오늘 작업 내용 요약"
git pull origin main
git push origin main
```

### 노트북에서 받을 때 (최신만 받기)

```powershell
cd "노트북의 Music-Creator 경로"
git pull origin main
```

### 노트북에서 수정 후 올릴 때

```powershell
cd "노트북의 Music-Creator 경로"
git add .
git commit -m "노트북에서 수정한 내용 요약"
git pull origin main
git push origin main
```

---

## 6. 자주 나오는 상황

### 6-1. Push 시 로그인/비밀번호 요청

- GitHub는 비밀번호 대신 **Personal Access Token** 사용을 권장합니다.
- 생성: GitHub → 우측 상단 프로필 → **Settings** → **Developer settings** → **Personal access tokens** → **Generate new token**
- Push 할 때 비밀번호 칸에 **토큰**을 입력하면 됩니다.

### 6-2. Merge 메시지 에디터가 열렸을 때 (Vim)

- **Esc** 누른 뒤 **`:wq`** 입력 후 **Enter** → 저장하고 나가면 머지 완료됩니다.

### 6-3. “충돌(conflict)”이 났을 때

- `git pull origin main` 후 “Merge conflict” 메시지가 나오면, VS Code/Cursor에서 해당 파일을 열어 `<<<<<<<`, `=======`, `>>>>>>>` 표시를 보고 수동으로 수정한 뒤:
  - `git add .`
  - `git commit -m "충돌 해결"`
  - `git push origin main`

---

## 7. 요약 흐름

| 위치       | 할 일 |
|------------|--------|
| **사무실** | 작업 → `git add .` → `git commit -m "메시지"` → `git pull origin main` → `git push origin main` |
| **노트북** | `git pull origin main` 으로 최신 받기 → 작업 → 같은 순서로 `add` → `commit` → `pull` → `push` |

매일 **사무실에서는 끝날 때 push**, **노트북에서는 시작할 때 pull** 하면 두 곳 내용이 맞게 유지됩니다.
