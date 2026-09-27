import { advanceTime, getCycleState } from "./timeSystem.js";
import { produceForInterval } from "./productionSystem.js";
import { settleEligiblePokemon } from "./pokemonSystem.js";
import { rollWeatherAtNewDay, updateWeatherDuration } from "./weatherSystem.js";
import { getSecondsUntilNextSettlement } from "./eventSystem.js";

const MIN_STEP_SECONDS = 1e-7;

function advanceSegment(state, seconds, random) {
  const before = getCycleState(state.time.totalElapsedSeconds);
  produceForInterval(state, seconds);
  updateWeatherDuration(state, seconds);
  advanceTime(state, seconds);

  const after = getCycleState(state.time.totalElapsedSeconds);
  if (before.phase === "night" && after.phase === "day") {
    rollWeatherAtNewDay(state, random);
  }
}

export function simulate(state, deltaSeconds, random = Math.random) {
  let remaining = Math.max(0, deltaSeconds);
  settleEligiblePokemon(state);

  while (remaining > MIN_STEP_SECONDS) {
    const cycle = getCycleState(state.time.totalElapsedSeconds);
    const settlementBoundary = getSecondsUntilNextSettlement(state);
    const weatherBoundary = state.weather.current
      ? Math.max(MIN_STEP_SECONDS, state.weather.remainingSeconds)
      : Infinity;

    let step = Math.min(
      remaining,
      cycle.secondsUntilPhaseChange,
      settlementBoundary,
      weatherBoundary,
    );

    if (!Number.isFinite(step) || step <= MIN_STEP_SECONDS) {
      settleEligiblePokemon(state);
      step = Math.min(remaining, cycle.secondsUntilPhaseChange);
      if (step <= MIN_STEP_SECONDS) break;
    }

    advanceSegment(state, step, random);
    remaining -= step;
    settleEligiblePokemon(state);
  }

  if (remaining > 0) advanceSegment(state, remaining, random);
}
