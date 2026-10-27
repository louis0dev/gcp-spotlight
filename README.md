# GCP Spotlight

단축키로 GCP 콘솔 서비스 페이지를 검색해 바로 이동하는 Chrome 확장 프로그램. 설계와 결정 사항은 [PLAN.md](PLAN.md) 참고.

## 빌드 / 설치

```bash
npm install
npm run build   # dist/ 생성
```

1. `chrome://extensions` → 우측 상단 **개발자 모드** 켜기
2. **압축해제된 확장 프로그램을 로드합니다** → `dist/` 폴더 선택
3. 확장 프로그램 **세부정보 → 확장 프로그램 옵션**에서 프로젝트 등록

코드를 고친 뒤에는 `npm run build` 후 `chrome://extensions`에서 새로고침 버튼을 누른다.

## 사용법

| 키 | 동작 |
|---|---|
| `Cmd+Shift+K` | 열기 / 닫기 (`chrome://extensions/shortcuts`에서 변경) |
| 글자 입력 | 서비스 검색 (예: `bq`, `gcs`, `iam serv`) |
| `@별칭` + 공백 | 프로젝트 지정 (예: `@prod bq`) |
| `Tab` | 프로젝트 검색 모드로 전환 / 복귀. `@` 입력 중에는 자동완성 |
| `↑` `↓` | 결과 이동 |
| `Enter` / `Cmd+Enter` | 지금 탭 / 새 탭에서 열기 |
| `Ctrl+1~6` | 입력창 아래 자주 찾은 서비스 바로 열기 (설정에서 Alt·Option으로 바꾸거나 끌 수 있음) |
| `Esc` | 닫기 |

창을 열 때 프로젝트는 설정에 등록된 것 중에서 지금 보고 있는 콘솔 페이지의 `?project=` 값, 없으면 마지막으로 고른 프로젝트, 그것도 없으면 목록 첫 프로젝트로 정해진다. 검색어 없이 프로젝트만 고르면 지금 콘솔 페이지를 그 프로젝트로 다시 연다.

## 구조

| 파일 | 역할 |
|---|---|
| `src/background.ts` | 단축키 처리, 오버레이 주입, 대체 창 띄우기, 탭 이동 |
| `src/content.ts` | 현재 페이지에 Shadow DOM 오버레이 띄우기 |
| `src/palette-page.ts` | 오버레이를 띄울 수 없는 페이지용 대체 창 |
| `src/ui/palette.ts` | 입력창 UI (오버레이와 대체 창이 공유) |
| `src/products.ts` | 콘솔 `/products` 페이지에서 서비스 목록 가져오기, 숨김/직접 등록 반영 |
| `src/header.ts` | 콘솔 페이지에 자동으로 붙어 프로젝트별 헤더 색 칠하기 |
| `src/color.ts` | 배경색 밝기 판단 (글자색 결정) |
| `src/catalog.ts` | 목록을 아직 못 가져왔을 때 쓰는 내장 서비스 목록, URL 헬퍼 |
| `src/search.ts` | 퍼지 검색, 사용 빈도 반영 |
| `src/options.ts` | 설정 페이지 |
| `src/storage.ts` | `chrome.storage` 래퍼 |

서비스 목록은 설치 후 로그인된 콘솔 페이지를 처음 열 때 콘솔의 `/products` 페이지에서 자동으로 한 번 가져오고, 그 뒤에는 입력창 아래의 **Refresh**(또는 설정의 **Fetch now**)를 누를 때만 다시 가져온다. 숨기기와 직접 등록은 설정 페이지의 **Service list**에서 한다.

## 라이선스

[MIT](LICENSE)
