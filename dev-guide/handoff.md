undefined

## 2026-11-13 기술 시스템 초기 실제 전투 적용
- `game/data/moves.js`: 원작 기준 기술의 타입·위력·명중률·행동 우선도와 지원되는 효과만 등록.
- `game/engine/targeting.js`: TP 계산 및 재선정. `game/engine/battle-status.js`: 상태/랭크/필드 조건 상태. `game/engine/move-effects.js`: 액티브 기술 효과.
- `game/engine/combat.js`: 라운드 시작 예약 → 행동 우선도 정렬 → PP/대상 유효성 검사 → 행동/재정렬.
- `game/engine/exploration.js`: 비전투 탐험 턴마다 랭크·날씨·필드 남은 턴 감소.
- 시연용 포켓몬 3마리에 2개씩 **테스트용 원작 기술 장착**; 정식 습득/교체/해금 UI는 아직 없음.
- 원작의 모든 기술 효과가 구현된 것은 아니며, 특히 방어·설치·일격필살·특성·도구 효과는 미확정/미지원. 검증된 기술 이외를 임의 생성하지 않는다.
