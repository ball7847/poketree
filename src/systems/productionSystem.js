import { GROWTH_CONFIG } from "../data/gameData.js";
import { D } from "../core/numberSystem.js";
import { POKEMON_BY_ID } from "../data/pokemonData.js";
import { ECOSYSTEM_EXPANSION } from "../data/upgradeData.js";
import { TREE_DEVELOPMENTS } from "../data/treeDevelopmentData.js";
import { addEnergy } from "./energySystem.js";
import { getCycleState } from "./timeSystem.js";
import { applyModifiers, createModifierBucket } from "./modifierSystem.js";
import { getCurrentWeather } from "./weatherSystem.js";

export function getBaseNaturalProduction(state) {
  return D(GROWTH_CONFIG.NATURAL_PRODUCTION_BASE)
    .plus(D(GROWTH_CONFIG.NATURAL_PRODUCTION_PER_GROWTH).times(state.progression.growth));
}

function isNaturalTypeActive(state, type, cycleState) {
  const weather = getCurrentWeather(state);
  if (weather?.naturalAvailability?.[type] === "always") return true;
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

  if (context.source === "natural") {
    for (const development of Object.values(TREE_DEVELOPMENTS)) {
      if (!development.types.includes(context.type)) continue;
      const level = state.upgrades.treeDevelopment[development.id] ?? 0;
      bucket.additive += level * development.naturalIncreasePerLevel;
    }
  }

  if (context.source === "pokemon") {
    bucket.additive +=
      state.upgrades.ecosystemExpansion *
      ECOSYSTEM_EXPANSION.pokemonProductionIncreasePerLevel;
  }

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

export function getTypeFinalMultiplier(state, type) {
  const weather = getCurrentWeather(state);
  return weather?.typeMultipliers?.[type] ?? 1;
}

export function calculateNaturalProductionPerSecond(state) {
  const cycleState = getCycleState(state.time.totalElapsedSeconds);
  const base = getBaseNaturalProduction(state);
  const result = {};

  for (const type of state.resources.unlockedEnergyTypes) {
    if (!isNaturalTypeActive(state, type, cycleState)) {
      result[type] = D(0);
      continue;
    }

    const modifiers = collectProductionModifiers(state, {
      source: "natural", type, phase: cycleState.phase,
    });
    result[type] = applyModifiers(base, modifiers).times(getTypeFinalMultiplier(state, type));
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
      baseByType[effect.type] = D(baseByType[effect.type]).plus(effect.amount);
    }
  }

  const result = {};
  for (const [type, base] of Object.entries(baseByType)) {
    const modifiers = collectProductionModifiers(state, {
      source: "pokemon", type, phase: cycleState.phase,
    });
    result[type] = applyModifiers(base, modifiers).times(getTypeFinalMultiplier(state, type));
  }
  return result;
}

export function produceForInterval(state, deltaSeconds) {
  if (deltaSeconds <= 0) return;
  const cycleState = getCycleState(state.time.totalElapsedSeconds);
  const natural = calculateNaturalProductionPerSecond(state);
  const pokemon = calculatePokemonProductionPerSecond(state);

  for (const [type, rate] of Object.entries(natural)) {
    addEnergy(state, type, D(rate).times(deltaSeconds), "natural", cycleState.phase);
  }
  for (const [type, rate] of Object.entries(pokemon)) {
    addEnergy(state, type, D(rate).times(deltaSeconds), "pokemon", cycleState.phase);
  }
}
