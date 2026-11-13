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
