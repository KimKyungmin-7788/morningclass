# 아침교실 작업 안내 (코딩 에이전트용)

전자칠판·태블릿용 특수교육 아침 루틴 웹앱. React 19 + TypeScript + Vite + Zustand, 시험은 Vitest, 배포는 Vercel(`main` = 운영).

## 먼저 읽을 것
- `docs/v2/01-구조.md` — 폴더 구조, 기능 추가 방법, 규칙
- `DESIGN.md` — 색·글자·모서리·부품·말투
- 진행 중인 기획: `docs/학생카드-기획.md`

## 명령
- `npm run dev` — 미리보기 (http://localhost:3000)
- `npm run check` — 형식 검사 + 시험. 끝내기 전에 반드시 통과시킨다
- `npm run build` — 배포 빌드 확인

## 규칙
- 새 기능은 `src/features/<이름>/` 에 `manifest.tsx` 로 등록하고, 계산은 `model.ts` + `model.test.ts` 로 화면과 떼어 시험한다.
- 저장은 `src/core/storage/db.ts`(IndexedDB)를 거친다. 기능 코드는 `core/data` 의 함수·store 를 쓴다. 형식을 바꾸면 `SCHEMA_VERSION` 을 올리고 변환을 넣는다. 새로 저장하는 값은 **백업 파일에 들어가는지** 시험한다.
- 학생 정보는 **이 기기에만** 저장한다. 서버·외부로 보내지 않는다.
- 저장·전송·외부 주소가 새로 생기면 `privacy.html`(개인정보처리방침)과 `vercel.json` 의 CSP 를 함께 고친다.
- 화면 글은 해요체, 짧게. 코드 주석도 한국어로, 주변 코드의 밀도를 따른다.
- 새 npm 패키지는 꼭 필요할 때만, 먼저 사용자에게 묻는다.

## 시험할 때 조심할 것
- localhost 저장소에 사용자의 시험 학급 자료가 있다. **지우거나 덮어쓰기 전에 백업하고, 끝나면 복원**한다.
- 운영 주소(morningclass.vercel.app)에서 시험할 때는 주소에 `?nocount` 를 붙인다. 학급 이름에 '테스트'를 넣어도 된다(함께한 학급 수 집계에서 빠진다).

## Git
- 작업은 브랜치에서 한다. `main` 에 합치거나 푸시하는 것은 운영 배포이므로 **매번 사용자에게 먼저 묻는다.**
