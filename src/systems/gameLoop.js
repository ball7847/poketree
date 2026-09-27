import { advanceTime, getCycleState } from "./timeSystem.js";
import { produceForInterval } from "./productionSystem.js";
import { settleEligiblePokemon } from "./pokemonSystem.js";
import { rollWeatherAtNewDay, updateWeatherDuration } from "./weatherSystem.js";

export function simulate(state, deltaSeconds) {
  let remaining = Math.max(0, deltaSeconds);
  settleEligiblePokemon(state);

  while (remaining > 0) {
    const before = getCycleState(state.time.totalElapsedSeconds);
    const step = Math.min(remaining, before.secondsUntilPhaseChange, 1);

    produceForInterval(state, step);
    updateWeatherDuration(state, step);
    advanceTime(state, step);

    const after = getCycleState(state.time.totalElapsedSeconds);
    if (before.phase === "night" && after.phase === "day") {
      rollWeatherAtNewDay(state);
    }

    settleEligiblePokemon(state);
    remaining -= step;
    if (step <= 0) break;
  }
}
