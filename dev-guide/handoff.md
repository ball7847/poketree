# 다음 대화 개발 인수인계 — 2026-11-13 최신

## 2026-11-14 원작 데이터 검수 2차 (추가 승인에 따른 진행)

- Serebii 포켓몬 챔피언스 기술도감 종족값 표 `https://www.serebii.net/attackdex-champions/substitute.shtml`을 근거로 8종 기본 폼(이상해꽃/리자몽/거북왕/독침붕/피죤투/아보크/피카츄/라이츄)의 능력치 6종씩 **48필드**를 추가 대조. 현재 저장값과 일치.
- 누적 기록 **66 / 38,534필드**. 미검증 38,468개, 수치 불일치 기록 0건, 검증 기록 구조 오류 0건. 원작 자료에 나타나지 않은 챔피언스 등장 여부는 임의 판정하지 않음.
- Serebii 챔피언스 사용 포켓몬 목록 `https://www.serebii.net/pokemonchampions/pokemon.shtml`을 출현 여부 판단의 참고 자료로 확보. 해당 목록의 **모든 종을 자동 대조 완료한 것은 아님**.
- 참고: 챔피언스 외부 도감 페이지의 기본 경험치 표기가 기존 카탈로그와 다른 경우가 있어 검토 필요(예: 이상해꽃 263 대 기존 236). 챔피언스 게임 내 경험치 획득 규칙이 검증되지 않아 이번에는 불일치 확정으로 기록하거나 수치를 변경하지 않음.
- `game/data/national-catalog.js`, `game/data/species.js` 및 전투/저장은 변경하지 않음. 감사 스크립트 자체를 이용한 검증 기록 검사에서 오류 0건. 최신 GitHub Actions 전체 테스트 통과 여부는 별도 확인 필요.

## 2026-11-14 원작 데이터 검수 1차 진행

- 신규 증거 기록 `data-audit/verification-records.json`: 챔피언스 메가폼 3종(메가스타미, 메가입치트, 메가요가램) 6개 종족값씩 **18개 필드** 원작 참고 문헌 대조 및 기록. 외부 출처는 팬 위키·챔피언스 데이터베이스이며 게임 파일 수치와 일치. 게임 데이터 **수정 없음**.
- 최신 집계: 검증대상 38,534개 중 자료 대조 18개, 미검증 38,516개, 불일치 0, 구조 오류 0. 이는 전수 검증 완료가 아님.
- 9세대 `cresselia`, `zacian`, `zamazenta` 등 일부 필드는 원작 변경 이력을 대조했지만 상위 작품 부재 판정 전이므로 검증 완료 기록에는 포함하지 않음.
- 감사 엔진은 `observedValue`와 실제 스냅샷 값, `expectedValue`와 기록 상태가 맞는지 검사하도록 강화.
- 메가입치트의 레전드 Z-A 공격 147과 챔피언스 공격 105는 작품별 차이로 **챔피언스 105 우선**, 단순 최신 세대 표를 무조건 채택하지 않음.
- 전체 `node --test tests/*.test.cjs` / 실제 브라우저 테스트 / 최신 배포 통과는 별도 확인 필요. 이후 필드 검증 및 오류 보고를 계속할 것.

## 2026-11-14 포켓몬 데이터 검수 구조 확장 (승인 후 반영)

- 검수 **구조만** 확장. 게임 종족값·포켓몬 데이터·기존 저장 형식 및 실제 전투 계산은 수정하지 않음.
- `data-audit/verification-schema.json`: 개별 종족·폼·필드 증거/상태 스키마.
- `data-audit/verification-records.json`: 빈 배열에서 시작하는 **희소 검증 기록**. 없음은 미검증이지 원작 일치가 아님.
- `scripts/audit-pokemon-data.cjs`: 오프라인 구조 검사와 `--write` 보고서 생성. `tests/provenance.test.cjs`와 CI 테스트 워크플로 추가.
- `game/data/provenance.js`: 감사 스키마 및 파일 경로만 추가; 레거시 검증 항목 보존.
- 초기 구조 검사: 종족 1,025종, 능력치 폼 1,351개, 검증 대상 필드 38,534개, 검증된 출처 레코드 0건, 구조 오류 0건. **작품별 데이터 정확성 검수는 아직 시작하지 않음.**
- 원본 폼 1,579개와 진화 원본 행 676개도 독립 필드 검증 구조로 등록됨. 실제 원작 근거 대조는 미착수. `data-audit/README.md` 참조.
- 새 커밋은 테스트·Pages 배포를 기존 2026-11-13 성공으로 간주할 수 없음. CI 실행 결과 별도 확인 필요.

**이 절을 반드시 먼저 읽고 GitHub `main` 현재 HEAD를 확인할 것.** 아래의 상태는 이 문서 하단 과거 이력과 기존 `/docs`의 낡은 구현 현황 설명보다 최신이다. 확정 기획은 사용자의 최신 명시적 결정이 기준이다. 개발 요청 시 승인 범위를 먼저 제시하고 승인을 받은 후에만 **게임 코드**를 변경한다. 개발을 요청하지 않았으면 변경 금지. 세부 기획은 결정이 필요한 질문만 한 번에 하나씩 하며, 당연하거나 이미 답한 질문은 금지.

- 저장소: https://github.com/ball7847/poketree
- 대표 실행: https://ball7847.github.io/poketree/
- 2026-11-13 마지막 **게임 코드** 커밋: `65c6404742647507d13b261fc93166464c8552ca`. 이후 문서만 갱신했더라도 HEAD와 게임 코드 변경 여부를 별도 확인할 것.
- 종족 데이터 B-1: `game/data/national-catalog.js`에 PokéAPI/pokeapi 고정 커밋 `8a92bfa7dab2f12b84b5d151562f9857c133ff30`의 종족 **1,025종(1~1025)**, 능력치 변형 **1,351개**, 원본 폼 항목 **1,579개**. 한국어 종족명·타입·종족값·성비·성장그룹·기본 경험치·폼·일반/숨겨진 특성 식별자·진화 관계/조건 원본 저장. `game/data/species.js`가 기존 6종 데모 레코드를 우선 유지. 다른 1,019종의 지역 출현 가중치는 **0**. 능력/진화 효과·전체 기술/습득표/전국도감 이미지·야생 출현을 임의 구현하지 않는다.
- **출처 정확도**: 핀 고정 PokeAPI 원본 재생성 일치와 구조 검증은 완료. **모든 종의 챔피언스 > 9세대 > 8세대 ... 우선순위별 수치 대조는 미완료**. `game/data/provenance.js`는 신규 종의 개별 필드 `checked:false`; `nationalSnapshot`에 원본 SHA 기록. 값이 없는 일부 폼 기본 경험치는 `null`로 남겨둠. 자료 출처와 공식 게임 버전 검증을 혼동하지 않는다.
- 재생성: `node scripts/generate-national-catalog.cjs --check` (Node 22+, 네트워크 필요). 원본 대조 CI: `.github/workflows/verify-national-source.yml`; 실제 게임은 정적 로컬 데이터만 사용.
- 6개 승인 지역: **바람의평원** (`windy`, Lv.1~6, 노말/비행/벌레, 처음 개방); **미끌바위언덕** (`meadow`, Lv.1~9, 땅/바위/물, 처음 개방); **아삭사과숲** (`apple`, Lv.5~15, 비행/벌레/풀, windy에서 이동 50회); **찌릿돌동굴** (`spark`, Lv.8~13, 땅/바위/전기, meadow에서 이동 80회); **어둑시니숲** (`dusk`, Lv.10~25, 노말/악/고스트, apple에서 이동 150회); **깊은굴** (`deep`, Lv.12~26, 땅/바위/강철, spark의 보스 최초 처치).
- 최초 두 지역만 기존 **시연용 세부지역·출현표**로 탐험 가능. 다른 네 지역은 해금 조건/카드만 구현. 해금되어도 설계 전에는 **'세부지역 준비 중'으로 출발 불가**. 확정 Lv 범위는 현재 조우 적 레벨 자동 적용과 다름(현재 `combat.js`에서 시연 적 레벨 5 생성).
- 이동 횟수는 **각 파티의 탐험 1회** 기준. 이동·걷기·채집/아이템/알 발견 등 비전투 탐험 행동 **각 +1회**. 전투 승리 **전투 종료 때 +1회**, 전투 중 개별 턴 0회. 탐험 시작·정상 귀환·파티 전멸 시 **0회로 초기화**. 조건 만족 순간 영구 개방, 해금 상태는 브라우저에 저장. 서로 다른 지역의 탐험은 독립.
- **파티 전멸 = 탐험 종료**, 이동 횟수 0, 각 기절자 경험치 소멸/개별 보관함 절반 손실 유지, 남은 전리품 정산 및 포켓몬 비파견 복귀. **전멸 뒤 HP 회복 및 자동 재탐험**이라는 옛 문서는 폐기. `G.regions.bossDefeated("spark")`는 이후 승인된 보스 승리 처리에 사용할 훅일 뿐 보스 자체는 미구현이며 일반 전투 승리로 발동하면 안 됨.
- 저장 키: `poketree-save-v1` 그대로. 기존 포켓몬·아이템·제작·영구 지역 해금 유지. 실시간 탐험과 파티 이동 횟수는 영구 저장하지 않아 로드 시 초기화. 이전 저장 형식 호환.
- 구현된 기존 시스템: 포켓몬 능력치(종족값/IV/EV/성격), 레벨/경험치, 기본공격과 일부 원작 기술·PP, 자동 전투/타겟팅 포인트, 상태이상, 도구 2칸, 창고/제작소 모달, 지역 6개 표시. **모든 특성/기술/진화가 구현된 것은 아님.** 오래된 '레벨 미구현', '피해량 모두 고정 시연' 문구는 폐기.
- 검증: [전체 엔진·Chromium](https://github.com/ball7847/poketree/actions/runs/43396278211), [원본 생성 일치](https://github.com/ball7847/poketree/actions/runs/43396278149), [GitHub Pages 최종 배포](https://github.com/ball7847/poketree/actions/runs/43396278218) 모두 해당 코드 커밋에 대해 성공 확인. 신규 수정 때는 **별도 재검증** 필수.

## 현재 미구현 및 후속 후보 (아직 승인되지 않은 개발 착수 금지)
1. 전국도감 1,025종의 **챔피언스 우선 필드별 실제 작품 검증**, 특수 폼 결측값 검토.
2. 전 종의 기술/레벨업 습득표/TM 호환성, 미지원 기술 효과 및 특성 전투 효과, 진화 조건의 실제 실행.
3. 지역별 세부지역·이동 경로·행동 확률·출현 종족/레벨 확률·전리품 및 보스 설계. 기존 2개 지역도 세부 콘텐츠는 데모.
4. 알 부화·포켓몬 획득·이미지 매핑과 기타 생활/경제. 승인되지 않은 수치·기능·보상을 임의로 넣지 말 것.

## 다음 개발의 검증 명령
```sh
bash scripts/prepare-pages.sh
node --test tests/*.test.cjs
# CI Chrome 및 playwright-core 설치 환경에서
node tests/browser-smoke.cjs
# 전국도감 원본 대조 (네트워크 필요)
node scripts/generate-national-catalog.cjs --check
```
- 관련 파일: `game/data/national-catalog.js`, `game/data/species.js`, `game/data/provenance.js`, `game/data.js`, `game/engine/pokemon.js`, `game/engine/regions.js`, `game/engine/exploration.js`, `game/engine/combat.js`, `game/engine/save.js`.
- CI: `.github/workflows/test.yml`, `.github/workflows/verify-national-source.yml`, `.github/workflows/deploy-pages.yml`. 테스트/배포 실패 시 성공을 주장하지 말고 로그 확인 및 수정.

---

## 과거 작업 이력 (최신 규칙과 충돌하는 설명은 위 내용을 우선)


## 2026-11-13 기술 시스템 초기 실제 전투 적용
- `game/data/moves.js`: 원작 기준 기술의 타입·위력·명중률·행동 우선도와 지원되는 효과만 등록.
- `game/engine/targeting.js`: TP 계산 및 재선정. `game/engine/battle-status.js`: 상태/랭크/필드 조건 상태. `game/engine/move-effects.js`: 액티브 기술 효과.
- `game/engine/combat.js`: 라운드 시작 **기술만 예약(대상 ID 없음)** → 행동 우선도 정렬 → 개인 턴 PP/순서 확인 → 개인 턴 현시점 TP 대상 선정 → 행동 실행.
- `game/engine/exploration.js`: 비전투 탐험 턴마다 랭크·날씨·필드 남은 턴 감소.
- 시연용 포켓몬 3마리에 2개씩 **테스트용 원작 기술 장착**; 정식 습득/교체/해금 UI는 아직 없음.
- 원작의 모든 기술 효과가 구현된 것은 아니며, 특히 방어·설치·일격필살·특성·도구 효과는 미확정/미지원. 검증된 기술 이외를 임의 생성하지 않는다.

- 포켓몬 챔피언스 상태이상 수치 우선 반영(마비 행동불가 12.5%, 얼음 해제 25% 및 3번째 차례 확정, 잠듦 첫 차례 불가·둘째 1/3 확률 해제·셋째 확정). 확인: https://www.pokemon-zone.com/champions/status/
- 혼란은 2~5회 및 약 1/3 자해, 자해 시 자기 물리공격/방어 기반 위력 40 무타입 공격 계산으로 처리. https://bulbapedia.bulbagarden.net/wiki/Confusion_(status_condition)

- 상태이상 지속 피해와 날씨·필드 남은 시간은 전투 시 라운드 종료에 일괄 처리. 비전투에서는 기존 탐험 턴마다 남은 시간 감소.
- 검증: https://www.pokemon-zone.com/champions/status/ ; https://www.pokemon-zone.com/champions/battle-effects/

- PP 사유 재정렬 시 스피드는 **라운드 시작 스냅샷**을 적용한다. 스피드 상승·감소는 다음 라운드부터 반영.
- `accuracyMode:"per-hit"` 기술 데이터는 타격마다 명중 판정 후 빗나가면 중단한다. 기본 연속기술은 최초 1회 판정.
- 땅 타입에는 전기자석파 무효를 별도 적용하고, 전기/그래스/사이코 필드의 화력 보정은 지면에 있는 사용자에게만 적용(부유 특성 등 미구현은 별도).


## 2026-11-13 대상 선정 시점 개편(B안, 확정)
- `game/engine/targeting.js`는 `selectMove(exp,u,ids)`와 `selectTarget(exp,u,plan)`으로 분리됨. 예약 plan에는 `targetId`가 없으며 `selectTarget`만 현재 유효한 대상 ID를 생성한다.
- 라운드 시작에 기술별 최고 TP를 기준으로 기술을 선택하지만, 최초 대상은 예약하지 않는다.
- 개인 턴 시작 시 PP와 행동 순서를 확인한 후, 실제 행동하는 시점의 HP/상성/유효 대상을 기준으로 대상 TP를 다시 계산한다.
- PP가 100 이상이 되어 기술을 새로 선택해도 해당 라운드 행동 우선도는 소급 적용하지 않는다.
- 과거 `select`, `retarget` 함수는 기존 호출부 호환용 별칭이며, `retarget`도 예약 대상 유지 없이 현시점 TP로 새 대상 선택.
- 광역 기술은 전체 유효 대상에 적용하며 TP는 가장 높은 개별 대상 점수에 따른다.


## 2026-11-13 전투 안정화 패치
- `combat.js`의 `beginRound`와 `startCombat`에서 생존 포켓몬의 `_faintedHandled`를 재설정함. 기절-회복-재기절에 대한 페널티 누락 방지.
- PP 재정렬의 미행동 목록은 `.filter(alive)`로 기절자를 제외하고 정렬함. 기절자에 대한 공통 타이머 낭비 방지.
- `tests/engine.test.cjs`에 부활 후 재기절 상태 표식, 기절자 재정렬, 라운드 내 중복 행동 방지 검증 추가.


## 기술 효과 회귀 검수 (2026-11-13)
- `move-effects.js`: 반동 공격은 반드시 단일 적 대상(광역 데이터 입력 시 안전하게 오류). PP 100 미만/유효 대상 없음 직접 실행 차단.
- 회복 최대HP 제한·PP 소모, 연속타 HP0 후 타격 지속·단일 기절 처리, 반동 자해 기절 선처리, 자폭 빗나감에도 자해, 무효 상성 흡수 HP0을 추가 자동 테스트.
- 부활 기술의 회복 수치/비율은 미정이므로 이번 변경에서 신규 기술을 만들어 넣지 않음.


## 2026-11-13 상태이상 정확도 보정
- `battle-status.js`: 혼란 횟수 1~4(마지막 행동 시도 자해 판정 포함). `thawFromFire` 추가. `endBattle`은 맹독 카운터만 초기화하며 주요 상태이상·혼란을 유지.
- `move-effects.js`: 명중한 피해 불꽃 기술이 얼음 상태를 해제.
- 회귀 테스트: 혼란 마지막 턴, 얼음 해제, 불꽃 명중 해제, 맹독 전투 간 횟수 초기화, 타입 면역/상태 중복.
- 근거: https://www.pokemon-zone.com/champions/status/ ; https://www.serebii.net/pokemonchampions/statusconditions.shtml


## 2026-11-13 환경 효과 안정화
- `battle-status.js`의 `grounded`, `fieldEndRound`로 지면 판정 및 모래바람/그래스필드 종료 효과 공통 처리. 지면 판정은 **비행 타입만** 우선 반영(특성·도구 미구현).
- `damage.js`는 설경 얼음타입 물리방어 +50%, 모래바람 바위타입 특수방어 +50%, 미스트필드 지면 대상 드래곤 피해 반감 추가.
- `move-effects.js`는 지면 대상 사이코필드 단일 우선도 공격 차단, 수면·상태·혼란 방지 적용.
- `combat.js` 라운드 종료에서 날씨·필드 잔여시간 감소 전 모래바람 피해/그래스필드 회복 수행, 기절은 기존 경험치 지급 흐름으로 전달.
- 근거: https://www.pokemon-zone.com/champions/terrain/ , https://bulbapedia.bulbagarden.net/wiki/Weather


## 2026-11-13 기술 TP 비례 확률 선택 확정
- 라운드 시작 `selectMove`: 기술별 유효 대상 최고 TP를 계산, `max(0, TP)`를 확률 가중치로 사용한다. 양수 가중치 합계가 0이면 원래 TP 최고 기술을 선택하고 동점 시 균등 선택.
- 개인 턴 `selectTarget`: 기존 최고 TP 대상 선택 및 동률 무작위 방식 유지. PP 충전/소모, 우선도, 행동 순서 로직 변경 없음.
- `chooseMove(choices,roll)`를 순수 확률 선택 검증 함수로 분리, `selectMove` 네 번째 파라미터로 테스트 RNG 주입 가능.


## 2026-11-13: Approved first-stage technique/TM implementation
- Data: `game/data/techniques.js` **DEMO ONLY** learnsets, compatibility, recipes, material drops. Actual 1000+ species/recipes/drop rates are not established.
- Model: `game/engine/techniques.js` per-individual permanent learn list, 0–2 manual equipment; level-up and acquisition learning; evolution API with no unapproved evolution trigger; reusable TM unlocks; discovered-material codex and three mutually exclusive crafting states. Owned TM always unavailable.
- Technical machine use is idle-only, equipment change is forbidden in combat/recovery; expedition exploration permits changes without resetting PP. Item tool equip/edit in expedition remains unimplemented (no item-equipment UI/model yet).
- UI: Pokémon detail equipment list and TM/crafting dialog, `game/ui/techniques.js`.
- Loot: existing *demo find* events now offer demo materials/TMs, credited upon expedition recall; existing combat loot remains demo placeholders. Never treat these as finalized rewards.
- Save: `game/engine/save.js` stores validated player progression to browser localStorage, key `poketree-save-v1`. Preexisting prototype had no persistence. Active battles/loot/HP are not persisted; refresh resumes idle. Incompatible saves ignored.
- Tests: `tests/techniques.test.cjs`; CI must pass before marking deploy successful.


## 2026-11-13: Typeless basic attack
- Basic attack always emits type `???`, ignores type matchups and STAB (both fixed at 1x); base power 10, physical/special category choice, PP-on-damage and random target unchanged. Move (active skill) damage still uses standard type matchup and STAB. Previous two-type basic attack rotation is deprecated; legacy `normalAttackCount` is retained only for compatibility with the existing runtime.


## 2026-11-13 approved tools v1
- Two manual equipment slots per Pokémon; duplicate item types forbidden on one Pokémon, individual inventory shared across roster; expedition equipment editing forbidden. Replacing an item releases stock immediately.
- Tool stat percentage bonuses are added per stat, applied/floored before battle ranks; changes recalculate max HP keeping damage and HP=0 remains fainted. Special PP/damage effect data can be added later; no unconfirmed final rules invented.
- `game/data/tools.js` contains **DEMO ONLY** 3 tool effects, recipes, time values, and demonstration drops. No official item balance or rates.
- Workshop: sequential queue initial 3 slots, reservations consume ingredients immediately; queued/running cancellation fully refunds; completed jobs occupy slots until individually or collectively claimed, later jobs auto-run. Wall-clock progress including offline time saved under existing `poketree-save-v1` without invalidating older saves. Upgrade price/max undefined; no free upgrade UI.
- UI: Pokémon info equipment selectors, Pokémon tab workshop, per-slot progress, cancel confirmation, recipe status filters, inventory counts.
- Test suite `tests/tools.test.cjs`. All running game data remains explicitly prototype-only.


## 2026-11-13 Warehouse v1 (user-approved)
- New bottom-navigation **창고** tab, 4-column icon-only style with name and count, pinned filters 전체/재료/도구/기술머신, internal list scrolling, no slot cap. Selecting an entry opens a **small central dialog**, close returns to warehouse.
- `game/engine/warehouse.js` is a **read-only aggregation** of current `state.materials`, `state.toolInventory`, `state.technicalMachines`. Do not store independent warehouse stock. Zero-count items absent; equipped tool count is included in total and split in detail; TMs are permanent unlocks and show 해금 instead of count.
- Expedition bag loot appears only after recall, materials decrease on crafting reservation, tools increase on crafting claim. Existing save (`poketree-save-v1`) persists underlying inventories unchanged.
- `game/ui/warehouse.js` contains a standalone per-item icon mapping layer. It has fallback symbols while approved original image files are unavailable; no third-party artwork is fetched or made canonical. Exact text is inserted using textContent. No sale/delete/transfer/search/upgrades.
- Validation: `tests/warehouse.test.cjs` covers inventory filtering and stock equality, expedition recall, crafting changes, saves, and static UI wiring. Full browser interaction may need separate manual verification.


## 2026-11-13 village-modal warehouse / equipment / workshop v2 (approved)
- Bottom tabs restored to 4: 마을/포켓몬/탐험/기록. Warehouse and item workshop are two central **village facility buttons**, each opens its own modal; warehouse is not a tab. Hide the old capacity label.
- Warehouse category filters: 전체/재료/도구/소모품/기술머신. Consumables category is currently empty, pending approved item data. Asc/desc sorting is by Korean item names; stock quantity is drawn as a badge *over the icon*. Four-column grid and small central item-detail modal stay.
- Pokémon item slots launch the **same warehouse modal** in equipment mode: category fixed to 도구, all other category filters disabled; clicking tool opens its detail modal with 장착 button. Existing item engine validates inventory, no duplicates, and no expedition changes. Manual unequip remains available from Pokémon detail. Success closes both warehouse dialogs and retains the Pokémon dialog.
- Workshop now only opens from village button, original three-slot crafting engine/queue/cancel/refund/claim saved data unchanged. TM crafting remains at its existing button in Pokémon tab.
- No changes to game save schema or inventories; text-based fallback icons until verified item images are provided.


## 2026-11-13 integrated audit follow-up
- UI focus fallback on nested modal close with stale removed trigger; successful equipment changes refocus the rebuilt Pokémon equipment-slot control.
- Workshop requested batch quantity input normalizes finite values to an integer via floor and clamps to currently craftable maximum.
- Added regression checks for navigation wiring plus combined material reservation/cancel/claim/equip/save round trip. CI covers engine and static UI checks; true human browser testing is not implied.


## 2026-11-13 actual Chromium interaction verification
- CI test workflow now executes `tests/browser-smoke.cjs` via Playwright-core and installed Chrome/Chromium after building `_site`.
- Browser clicks verify village warehouse modal, filters, empty consumable, sorting, item details; Pokémon equipment modal with locked tool category, detail/equip and return; workshop queue/cancel and material refund. Errors from page script exceptions fail smoke.
- No player saves touched: smoke runs on ephemeral GitHub Actions checkout and separate HTTP server.


## 2026-11-13 Six approved regions and permanent unlock gates
- Six named region cards registered; initial windy/meadow playable with existing demo encounters only. Four later regions have no invented locations/species, cannot depart while undisigned. Unlock status is permanent but does not imply content is implemented.
- Internal timer ticks `actions` remain separate from expedition-party `steps`, which count noncombat actions +1 and victory +1, not individual combat turns. Counter reset on start, retreat, full faint. Region unlock occurs immediately and saves under existing save v1 using optional `unlockedRegions` field; legacy save remains accepted.
- `G.regions.bossDefeated("spark")` hook is reserved for future actual boss victory; currently no approved boss encounter exists. Never call it from ordinary combat.
- Full-party wipe now ends expedition and settles remaining bags using existing recall, preserving already-applied per-Pokémon faint loot/XP penalties. Browser smoke asserts six region cards and two initially playable areas.

- Save restore now explicitly clears transient active expeditions and party steps, because the saved-game snapshot persists permanent progression but not live expedition sessions. Ensures old/new saves cannot retain stale object references on in-process restore.


## 2026-11-13 전국도감 B-1 데이터
- PokeAPI/pokeapi CSV rev `8a92bfa7dab2f12b84b5d151562f9857c133ff30` 기반 `game/data/national-catalog.js` 정적 로딩. 1,025종, 배틀형 개체 변형 1,351개, 폼 원본 1,579항목과 특성 및 진화 원본 조건. **Champions 최신값 검증을 완료한 데이터가 아니며**, 별도 source/verifiedAgainstChampions=false 표시.
- 기존 6종의 기본폼/종족값은 데모 레코드 우선 유지. 신규 1,019종의 탐험 출현 가중치는 0; 기술 습득·특성 효과·진화 자동 처리·보상 확장 금지.
- `game/data/national-catalog.js` 는 로컬 정적 파일이므로 런타임 API 의존 없음.

- National species provenance records default to `source:null,checked:false` for every existing field until Champions/version-order validation; the original six have their previous exact field provenance overlaid. `nationalSnapshot` separately records the source CSV commit.

- Rebuild/check pinned source: `node scripts/generate-national-catalog.cjs` or `node scripts/generate-national-catalog.cjs --check` (Node 22+, network required only for regeneration). Dedicated GitHub workflow `.github/workflows/verify-national-source.yml` runs pinned-source comparison on catalog changes or manually.
