import { advanceTime, getCycleState } from "./timeSystem.js";
import { produceForInterval } from "./productionSystem.js";
import { settleEligiblePokemon } from "./pokemonSystem.js";

/**
 * 낮/밤 경계와 포켓몬 정착 조건을 보존하면서 긴 delta를 처리한다.
 * 현재는 최대 1초 단위로 조건을 검사한다. 에너지 획득 자체는 묶어서 계산한다.
 */
export function simulate(state, deltaSeconds) {
  let remaining = Math.max(0, deltaSeconds);

  settleEligiblePokemon(state);

  while (remaining > 0) {
    const cycle = getCycleState(state.time.totalElapsedSeconds);
    const step = Math.min(remaining, cycle.secondsUntilPhaseChange, 1);

    produceForInterval(state, step);
    advanceTime(state, step);
    settleEligiblePokemon(state);

    remaining -= step;
    if (step <= 0) break;
  }
}
