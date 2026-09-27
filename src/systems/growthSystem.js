import { GROWTH_CONFIG, TREE_STAGES } from "../data/gameData.js";
import { D } from "../core/numberSystem.js";

export function getGrowthCost(growth) {
  const multiplier = D(GROWTH_CONFIG.COST_MULTIPLIER).pow(growth);
  return Object.fromEntries(
    Object.entries(GROWTH_CONFIG.BASE_COST).map(([type, base]) => [
      type, D(base).times(multiplier),
    ]),
  );
}

export function canGrow(state) {
  const cost = getGrowthCost(state.progression.growth);
  return Object.entries(cost).every(
    ([type, amount]) => D(state.resources.energy[type]).gte(amount),
  );
}

export function performGrowth(state) {
  if (!canGrow(state)) return false;
  const cost = getGrowthCost(state.progression.growth);
  for (const [type, amount] of Object.entries(cost)) {
    state.resources.energy[type] = D(state.resources.energy[type]).minus(amount);
  }
  state.progression.growth += 1;
  state.stats.growthCount += 1;
  return true;
}

export function getTreeStage(growth) {
  return [...TREE_STAGES].reverse().find((stage) => growth >= stage.minGrowth);
}
