# PokeTree — 기술/습득표 원본 데이터 가져오기 (2026-11-16)

## 2026-11-18 전체 버전별 기술/기술머신 습득표 아카이브 완료

- 전체 자료는 `data-import/full-history/`에 **별도 저장**함. 기존 이 폴더의 `moves/`, `learnsets/`(챔피언스+최신 대체 버전) 및 게임 실행 데이터는 변경하지 않음.
- 고정 PokeAPI `pokemon_moves.csv` **638,321행**을 전부 보존. 원본 7열 `pokemon_id,version_group_id,move_id,pokemon_move_method_id,level,order,mastery`를 올바르게 읽고, 결측 `order`/`mastery`를 `null`로 저장.
- 1,025종 / 1,351폼 / 전체 관계 638,321행, 미연결 행 0, 원본 관계가 없는 폼 48개. 저장소에 21개 도감 샤드, `unmapped.json`, `manifest.json` 업로드 후 다시 읽어 행 수/폼 수/파일 유효성을 검증함.
- 습득 방법별 원본 행: 레벨업 `1` = **161,805**, 기술머신 `4` = **371,571**, 그 외 방법도 원본 보존. 이는 중복 작품/버전이 포함된 *관계 행 수*이지 고유 기술 수나 기술머신 수가 아님.
- 원본의 `order` 비결측 **40,018행**, `mastery` 비결측 **1,882행**. 각 버전그룹은 별도 보존하며 원작 기술 습득 가능 여부를 다른 작품과 섞지 않음.
- 재생성/검증: `node scripts/import-full-learnsets.cjs --check`, `node --test tests/full-learnsets.test.cjs tests/pokemon-move-import.test.cjs`. 수집기 원본 7열 헤더 불일치 문제 수정. **GitHub Actions 최종 실행/통과 여부는 확인되지 않았으므로 별도 확인 필요**.
- 이 원본에 존재한다는 의미와 2026-11 현행 챔피언스에 실제 등장·습득 가능하다는 의미는 다름. 48폼의 데이터 결측과 챔피언스 독립 검수는 남아 있음.


본 디렉터리는 **게임 실행 코드와 분리된 원본 수집 저장소**이다. 기존 `game/data/moves.js` 기술 13개와 `game/data/techniques.js` 시연용 습득표, 전투 계산, 저장 구조를 수정하거나 확장하지 않는다.

## 현재 수집 내용

- 기술 총 **937개**: 기술 ID, 영문 식별자, 한국어·영어 이름(한국어 919건), 타입, 물리/특수/변화, 위력, 명중, 원작 PP, 우선도, 대상, 효과 ID/확률 및 부가 메타 정보.
- 포켓몬 전국도감 **1,025종**, 원본 포켓몬/폼 레코드 **1,351개**: 소스에서 각 폼에 기록된 기술 습득방법, 레벨, 기술 ID.
- 원본 Pokémon-move 관계 행 **638,321개**를 입력으로 읽고, **챔피언스와 각 폼에서 가장 최근 확보 가능한 비챔피언스 버전 한 개**를 따로 선택해 저장.
- 폼 기준 챔피언스 32번 버전그룹 정보 존재 **319개**, 기타 버전그룹 정보 존재 **1,268개**. 두 그룹은 중복될 수 있다. 출처에서 기술 습득표가 확인되지 않는 폼 **48개**는 빈 배열/버전 null로 유지.
- 실제 보관된 습득표 관계: 챔피언스 **19,810행** + 우선 선택한 이전 버전 그룹 **74,424행**. **원본 전체 638,321행을 그대로 중복 저장한 것은 아니다.**

## 출처와 한계

**출처**: `PokeAPI/pokeapi` 커밋 `8a92bfa7dab2f12b84b5d151562f9857c133ff30`의 CSV. 파일별 blob SHA는 [manifest.json](manifest.json) 참조.

- `data-import/moves/*.json` — 기술 카탈로그 4개 파일.
- `data-import/learnsets/*.json` — 도감번호 50개씩 21개 파일.
- 기술 효과 `effectId`와 `meta`는 **원본의 정형 데이터**일 뿐 게임이 실제로 해당 효과를 지원한다는 의미가 아니다.
- `pp`는 **원작 기술별 기본 PP**이다. PokeTree가 사용 중인 전투 공유 PP 자원 규칙과 자동 연결하지 않는다.
- `accuracy: null`은 원본 데이터상 빈 칸 등 **수치 미기재**를 뜻하며 모든 상황에서 필중한다고 추정하지 않는다.
- `moves.champions`은 PokeAPI **version_group_id=32**의 기록이며, **2026년 11월 현행 챔피언스 습득표 전체를 독립 검수했다는 의미가 아니다**.
- `moves.fallback`은 해당 포켓몬 원본 ID에서 챔피언스를 제외한 버전그룹 중 데이터가 존재하는 가장 최근 `order` 그룹이다. 반드시 9세대는 아니다.
- 기술 행은 `[moveId, methodId, level]` 배열. `methodId`는 manifest `moveMethods`에서 확인. 예컨대 `[85, 4, 0]`은 10만볼트(85), 기술머신(4), 레벨 0(비레벨업)을 의미한다.
- 챔피언스의 `train` 방법(12) 등을 `level-up`으로 임의 변환하지 않는다.
- 기존 전국도감 원본은 종족/능력치 중심이고 **개별 기술 습득표는 이 디렉터리에 별도** 저장한다.
- `pokemon_moves.csv`에는 이전 세대의 모든 버전과 폼 기술 이력이 들어 있지만, 현재 데이터는 그중 챔피언스 및 최우선 대체 버전 두 그룹만 남겼다. **전 세대 전체 습득 이력을 보유했다고 주장하지 않는다.**
- 파일 존재와 필드 유효성은 자동 테스트로 검증하되, 전체 기술의 **원작 정확성 및 전투 엔진 구현 상태는 별도** 검증해야 한다.

## 데이터 구조 예시

```json
{
  "speciesId": 1,
  "pokemon": [{
    "pokemonId": 1,
    "identifier": "bulbasaur",
    "isDefault": true,
    "champions": null,
    "fallback": 25,
    "availableGroups": [25],
    "moves": {
      "champions": [],
      "fallback": [[33, 1, 1], [14, 4, 0]]
    }
  }]
}
```

위 예시는 형식 설명을 위한 부분 예시이며, 포켓몬별 실제 기술 목록은 `learnsets/*.json`에 기록되어 있다.

## 재생성 및 테스트

Node.js 22 이상, GitHub 원본 다운로드 가능 환경:

```sh
node scripts/import-pokemon-moves.cjs --check
node tests/pokemon-move-import.test.cjs
```

`--check`는 저장된 스냅샷과 원본을 비교할 뿐 파일을 수정하지 않는다. `--check`를 생략하면 생성된 데이터 파일을 다시 쓰며, 게임 런타임 파일은 수정하지 않는다.
