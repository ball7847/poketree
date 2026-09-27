import { POKEMON } from "../data/pokemonData.js";
import { D } from "../core/numberSystem.js";

function readPath(object, path) {
  return path.reduce((value, key) => value?.[key], object);
}

export function isSettlementConditionMet(state, condition) {
  switch (condition.kind) {
    case "currentEnergy":
      return D(state.resources.energy[condition.type]).gte(condition.amount);
    case "growth":
      return state.progression.growth >= condition.amount;
    case "stat":
      return D(readPath(state.stats, condition.path)).gte(condition.amount);
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

    for (const effect of pokemon.effects) {
      if (effect.kind === "produce" && !state.resources.unlockedEnergyTypes.includes(effect.type)) {
        state.resources.unlockedEnergyTypes.push(effect.type);
      }
    }

    newlySettled.push(pokemon.id);
  }

  return newlySettled;
}

export function getSettlementProgress(state, condition) {
  switch (condition.kind) {
    case "currentEnergy":
      return D(state.resources.energy[condition.type]);
    case "growth":
      return state.progression.growth;
    case "stat":
      return D(readPath(state.stats, condition.path));
    default:
      return 0;
  }
}
