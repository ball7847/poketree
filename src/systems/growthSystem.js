import { GROWTH_CONFIG, TREE_STAGES } from "../data/gameData.js";

export function getGrowthCost(growth) {
  const multiplier = Math.pow(GROWTH_CONFIG.COST_MULTIPLIER, growth);

  return Object.fromEntries(
    Object.entries(GROWTH_CONFIG.BASE_COST).map(([type, base]) => [
      type,
      base * multiplier,
    ]),
  );
}

export function canGrow(state) {
  const cost = getGrowthCost(state.progression.growth);

  return Object.entries(cost).every(
    ([type, amount]) => state.resources.energy[type] >= amount,
  );
}

export function performGrowth(state) {
  if (!canGrow(state)) return false;

  const cost = getGrowthCost(state.progression.growth);

  for (const [type, amount] of Object.entries(cost)) {
    state.resources.energy[type] -= amount;
  }

  state.progression.growth += 1;
  state.stats.growthCount += 1;

  return true;
}

export function getTreeStage(growth) {
  return [...TREE_STAGES]
    .reverse()
    .find((stage) => growth >= stage.minGrowth);
}
