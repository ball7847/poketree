import { advanceTime, getCycleState } from "./timeSystem.js";
import { produceForInterval } from "./productionSystem.js";

/**
 * 낮/밤 경계에서 생산 규칙이 달라지므로 긴 delta를 경계 단위로 분할한다.
 * DOM 렌더링 횟수와는 무관하며, 에너지 획득을 개별 이벤트로 반복하지 않는다.
 */
export function simulate(state, deltaSeconds) {
  let remaining = Math.max(0, deltaSeconds);

  while (remaining > 0) {
    const cycle = getCycleState(state.time.totalElapsedSeconds);
    const step = Math.min(remaining, cycle.secondsUntilPhaseChange);

    produceForInterval(state, step);
    advanceTime(state, step);

    remaining -= step;

    if (step <= 0) break;
  }
}
