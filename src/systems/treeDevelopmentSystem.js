import { TREE_DEVELOPMENTS } from "../data/treeDevelopmentData.js";
import { D } from "../core/numberSystem.js";

export function getTreeDevelopmentCost(id, level) {
  const data = TREE_DEVELOPMENTS[id];
  const multiplier = D(data.costMultiplier).pow(level);
  return Object.fromEntries(
    Object.entries(data.baseCost).map(([type, base]) => [type, D(base).times(multiplier)]),
  );
}

export function canBuyTreeDevelopment(state, id) {
  const data = TREE_DEVELOPMENTS[id];
  if (!data || state.progression.growth < data.unlockGrowth) return false;
  const level = state.upgrades.treeDevelopment[id] ?? 0;
  const cost = getTreeDevelopmentCost(id, level);
  return Object.entries(cost).every(([type, amount]) => D(state.resources.energy[type]).gte(amount));
}

export function buyTreeDevelopment(state, id) {
  if (!canBuyTreeDevelopment(state, id)) return false;
  const level = state.upgrades.treeDevelopment[id] ?? 0;
  const cost = getTreeDevelopmentCost(id, level);
  for (const [type, amount] of Object.entries(cost)) {
    state.resources.energy[type] = D(state.resources.energy[type]).minus(amount);
  }
  state.upgrades.treeDevelopment[id] = level + 1;
  return true;
}
