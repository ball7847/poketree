import { TIME_CONFIG } from "../data/gameData.js";

export function getCycleState(totalElapsedSeconds) {
  const cyclePosition =
    ((totalElapsedSeconds % TIME_CONFIG.GAME_DAY_SECONDS) +
      TIME_CONFIG.GAME_DAY_SECONDS) %
    TIME_CONFIG.GAME_DAY_SECONDS;

  const isDay = cyclePosition < TIME_CONFIG.DAY_SECONDS;
  const phaseElapsed = isDay
    ? cyclePosition
    : cyclePosition - TIME_CONFIG.DAY_SECONDS;
  const phaseDuration = isDay
    ? TIME_CONFIG.DAY_SECONDS
    : TIME_CONFIG.NIGHT_SECONDS;

  return {
    phase: isDay ? "day" : "night",
    isDay,
    isNight: !isDay,
    cyclePosition,
    secondsUntilPhaseChange: phaseDuration - phaseElapsed,
  };
}

export function advanceTime(state, deltaSeconds) {
  if (deltaSeconds <= 0) return;

  state.time.totalElapsedSeconds += deltaSeconds;
  state.stats.totalPlayTimeSeconds += deltaSeconds;
}
