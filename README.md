# PokeTree — 전투·탐험 중심 방치형 RPG

인간 없이 포켓몬만 존재하는 세계에서 오염된 세계수 **아르세우드**를 향해 진행하는 게임. **전투·탐험이 핵심**, 알 부화·포켓몬 육성·생활 생산은 탐험을 지원한다.

현재 **초기 실행형 웹게임 프로토타입 개발 단계**다. 탐험·전투의 기본 루프는 `game/`에 구현했지만, 실제 피해량/회복/지역 데이터 등 일부 수치는 **시연용 임시값**이다. 이전 PokeTree 프로토타입의 코드는 Git 기록에도 보존되어 있다.

## 브라우저에서 바로 실행 (GitHub Pages)
- 공개 주소: **https://ball7847.github.io/poketree/** (GitHub Pages 최초 설정 및 배포가 성공해야 접속 가능)
- GitHub 저장소 → **Settings → Pages → Build and deployment → Source: GitHub Actions**로 설정한다.
- 이후 `main` 브랜치에 `game/` 파일을 수정하면 `.github/workflows/deploy-pages.yml`이 자동으로 웹게임을 배포한다.
- GitHub → **Actions → Deploy PokeTree to GitHub Pages**에서 배포 성공 여부를 확인한다.
- GitHub 파일 뷰어가 아닌 **Pages 공개 주소**에서 실제 웹게임을 플레이한다.

## 다음 대화에서 이어서 개발

- **[2026-11-12 최신 인수인계 문서](dev-guide/handoff.md)** — 확정 UI·탐험 규칙, 코드 구조, 미정 기능, GitHub Pages 경로, 다음 작업 가이드.
- 이번 시점에는 탐험 지역 카드 목록, 상세창, 빈 지역 **3슬롯 준비창**, **4열 아이콘형/목록형 포켓몬 선택창**, 정렬 및 중복 파견 방지까지 프로토타입에 반영되었다.
- 404 이력: 배포 시 `game/` 폴더 경로를 유지해야 한다. `.github/workflows/deploy-pages.yml`에서 `_site/index.html`과 `_site/game/`을 함께 복사한다. 사용자가 수정 후 정상 접속을 확인했다.

## 개발 및 실행
- [브라우저 웹게임 실행 파일](game/index.html) — 저장소를 내려받아 `game/index.html`을 브라우저에서 열면 실행. (GitHub 파일 보기 페이지는 게임 실행 페이지가 아님)
- [개발가이드 및 구현 원칙](dev-guide/README.md)
- [개발 단계·테스트 및 미확정 분리](dev-guide/implementation-plan.md)

## 기획 문서
- [세계관·스토리](docs/STORY.md)
- [게임 콘셉트·성장·생활 배치](docs/GAME_DESIGN.md)
- [지역 탐험·귀환·HP 회복·전리품](docs/EXPLORATION.md)
- [전투·기술·경험치·부활](docs/COMBAT.md)
- [알·부화기·자동화·포켓몬 보관함](docs/EGGS_AND_STORAGE.md)
- [원작 Guild Master - Idle Dungeons 참고 분석](docs/GUILD_MASTER_IDLE_DUNGEONS_ANALYSIS.md)
- [주요 이벤트 알림·최근 30개 기록](docs/NOTIFICATIONS.md)
- [미확정 사항](docs/OPEN_QUESTIONS.md)

## 문서 관리 원칙
- 명시적으로 확정된 규칙만 확정 사항으로 기록한다.
- 예시 수치는 실제 설정값이 아니다. 수치/공식이 미정이면 미정으로 남긴다.
- **전투숙소·생활숙소 분리 여부는 미확정**이며, 확정된 탐험에는 별도 저장 파티 시스템이 없다.
- 원작 분석은 외부 참고 자료이며 PokeTree에 자동 도입하지 않는다.
