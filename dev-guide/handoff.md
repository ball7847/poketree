undefined

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
