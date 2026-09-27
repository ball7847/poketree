import { POKEMON } from "../data/pokemonData.js";

function readPath(object, path) {
  return path.reduce((value, key) => value?.[key], object);
}

export function isSettlementConditionMet(state, condition) {
  switch (condition.kind) {
    case "currentEnergy":
      return (state.resources.energy[condition.type] ?? 0) >= condition.amount;
    case "growth":
      return state.progression.growth >= condition.amount;
    case "stat":
      return (readPath(state.stats, condition.path) ?? 0) >= condition.amount;
    default:
      return false;
  }
}

export function settleEligiblePokemon(state) {
  const newlySettled = [];

  for (const pokemon of POKEMON) {
    if (state.pokemon.settled.includes(pokemon.id)) continue;
    if (!isSettlementConditionMet(state, pokemon.condition)) continue;

    state.pokemon.settled.push(pokemon.id);
    newlySettled.push(pokemon.id);
  }

  return newlySettled;
}

export function getSettlementProgress(state, condition) {
  switch (condition.kind) {
    case "currentEnergy":
      return state.resources.energy[condition.type] ?? 0;
    case "growth":
      return state.progression.growth;
    case "stat":
      return readPath(state.stats, condition.path) ?? 0;
    default:
      return 0;
  }
}
