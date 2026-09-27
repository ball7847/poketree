import { GROWTH_CONFIG } from "../data/gameData.js";
import { POKEMON_BY_ID } from "../data/pokemonData.js";
import { addEnergy } from "./energySystem.js";
import { getCycleState } from "./timeSystem.js";
import { applyModifiers, createModifierBucket } from "./modifierSystem.js";

export function getBaseNaturalProduction(state) {
  return (
    GROWTH_CONFIG.NATURAL_PRODUCTION_BASE +
    GROWTH_CONFIG.NATURAL_PRODUCTION_PER_GROWTH * state.progression.growth
  );
}

function isNaturalTypeActive(type, cycleState) {
  if (type === "grass") return true;
  if (type === "fire") return cycleState.isDay;
  if (type === "water") return cycleState.isNight;
  return false;
}

function effectMatchesContext(effect, context) {
  if (effect.source && effect.source !== context.source) return false;
  if (effect.phase && effect.phase !== context.phase) return false;
  if (effect.types !== "*" && !effect.types?.includes(context.type)) return false;
  return true;
}

export function collectProductionModifiers(state, context) {
  const bucket = createModifierBucket();

  for (const pokemonId of state.pokemon.settled) {
    const pokemon = POKEMON_BY_ID[pokemonId];
    if (!pokemon) continue;

    for (const effect of pokemon.effects) {
      if (!effectMatchesContext(effect, context)) continue;

      if (effect.kind === "productionIncrease") bucket.additive += effect.amount;
      if (effect.kind === "productionAmplification") {
        bucket.multiplicative.push(effect.multiplier);
      }
    }
  }

  return bucket;
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

export function calculatePokemonProductionPerSecond(state) {
  const cycleState = getCycleState(state.time.totalElapsedSeconds);
  const baseByType = {};

  for (const pokemonId of state.pokemon.settled) {
    const pokemon = POKEMON_BY_ID[pokemonId];
    if (!pokemon) continue;

    for (const effect of pokemon.effects) {
      if (effect.kind !== "produce") continue;
      baseByType[effect.type] = (baseByType[effect.type] ?? 0) + effect.amount;
    }
  }

  const result = {};
  for (const [type, base] of Object.entries(baseByType)) {
    const modifiers = collectProductionModifiers(state, {
      source: "pokemon",
      type,
      phase: cycleState.phase,
    });
    result[type] =
      applyModifiers(base, modifiers) * getTypeFinalMultiplier(state, type);
  }

  return result;
}

export function produceForInterval(state, deltaSeconds) {
  if (deltaSeconds <= 0) return;

  const cycleState = getCycleState(state.time.totalElapsedSeconds);
  const naturalPerSecond = calculateNaturalProductionPerSecond(state);
  const pokemonPerSecond = calculatePokemonProductionPerSecond(state);

  for (const [type, rate] of Object.entries(naturalPerSecond)) {
    addEnergy(state, type, rate * deltaSeconds, "natural", cycleState.phase);
  }

  for (const [type, rate] of Object.entries(pokemonPerSecond)) {
    addEnergy(state, type, rate * deltaSeconds, "pokemon", cycleState.phase);
  }
}
