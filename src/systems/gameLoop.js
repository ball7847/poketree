import { advanceTime, getCycleState } from "./timeSystem.js";
import { produceForInterval } from "./productionSystem.js";
import { settleEligiblePokemon } from "./pokemonSystem.js";
import { rollWeatherAtNewDay, updateWeatherDuration } from "./weatherSystem.js";
import { getSecondsUntilNextSettlement } from "./eventSystem.js";

const MIN_STEP_SECONDS = 1e-7;

export function simulate(state, deltaSeconds, random = Math.random) {
  let remaining = Math.max(0, deltaSeconds);
  settleEligiblePokemon(state);

  while (remaining > MIN_STEP_SECONDS) {
    const before = getCycleState(state.time.totalElapsedSeconds);
    const settlementBoundary = getSecondsUntilNextSettlement(state);
    const weatherBoundary = state.weather.current
      ? Math.max(MIN_STEP_SECONDS, state.weather.remainingSeconds)
      : Infinity;

    const step = Math.min(
      remaining,
      before.secondsUntilPhaseChange,
      settlementBoundary,
      weatherBoundary,
    );

    if (!Number.isFinite(step) || step <= MIN_STEP_SECONDS) {
      settleEligiblePokemon(state);
      const fallback = Math.min(remaining, before.secondsUntilPhaseChange);
      if (fallback <= MIN_STEP_SECONDS) break;
      produceForInterval(state, fallback);
      updateWeatherDuration(state, fallback);
      advanceTime(state, fallback);
      remaining -= fallback;
      continue;
    }

    produceForInterval(state, step);
    updateWeatherDuration(state, step);
    advanceTime(state, step);
    remaining -= step;

    const after = getCycleState(state.time.totalElapsedSeconds);
    if (before.phase === "night" && after.phase === "day") {
      rollWeatherAtNewDay(state, random);
    }

    settleEligiblePokemon(state);
  }

  if (remaining > 0) {
    produceForInterval(state, remaining);
    updateWeatherDuration(state, remaining);
    advanceTime(state, remaining);
  }
}
