import { GROWTH_CONFIG } from "../data/gameData.js";
import { getCycleState } from "./timeSystem.js";
import { applyModifiers, createModifierBucket } from "./modifierSystem.js";

export function getBaseNaturalProduction(state) {
  return (
    GROWTH_CONFIG.NATURAL_PRODUCTION_BASE +
    GROWTH_CONFIG.NATURAL_PRODUCTION_PER_GROWTH *
      state.progression.growth
  );
}

function isNaturalTypeActive(type, cycleState) {
  if (type === "grass") return true;
  if (type === "fire") return cycleState.isDay;
  if (type === "water") return cycleState.isNight;
  return false;
}

export function collectProductionModifiers(_state, _context) {
  return createModifierBucket();
}

export function getTypeFinalMultiplier(_state, _type) {
  return 1;
}

export function calculateNaturalProductionPerSecond(state) {
  const cycleState = getCycleState(state.time.totalElapsedSeconds);
  const base = getBaseNaturalProduction(state);
  const result = {};

  for (const type of state.resources.unlockedEnergyTypes) {
    if (!isNaturalTypeActive(type, cycleState)) {
      result[type] = 0;
      continue;
    }

    const modifiers = collectProductionModifiers(state, {
      source: "natural",
      type,
      phase: cycleState.phase,
    });

    result[type] =
      applyModifiers(base, modifiers) * getTypeFinalMultiplier(state, type);
  }

  return result;
}

function addEnergy(state, type, amount, source, phase) {
  if (!amount) return;

  state.resources.energy[type] += amount;
  state.stats.totalEnergy[type] += amount;

  if (source === "natural") {
    state.stats.naturalEnergy[type] += amount;
    const phaseStats =
      phase === "day"
        ? state.stats.daytimeNaturalEnergy
        : state.stats.nighttimeNaturalEnergy;
    phaseStats[type] += amount;
  } else if (source === "pokemon") {
    state.stats.pokemonEnergy[type] += amount;
    const phaseStats =
      phase === "day"
        ? state.stats.daytimePokemonEnergy
        : state.stats.nighttimePokemonEnergy;
    phaseStats[type] += amount;
  }
}

export function produceForInterval(state, deltaSeconds) {
  if (deltaSeconds <= 0) return;

  const cycleState = getCycleState(state.time.totalElapsedSeconds);
  const naturalPerSecond = calculateNaturalProductionPerSecond(state);

  for (const [type, rate] of Object.entries(naturalPerSecond)) {
    addEnergy(state, type, rate * deltaSeconds, "natural", cycleState.phase);
  }
}
