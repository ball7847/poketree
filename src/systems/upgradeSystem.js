import { ECOSYSTEM_EXPANSION } from "../data/upgradeData.js";
import { D } from "../core/numberSystem.js";

export function getEcosystemExpansionCost(level) {
  const cost = Object.fromEntries(
    Object.entries(ECOSYSTEM_EXPANSION.baseCost).map(([type, value]) => [type, D(value)]),
  );
  for (let i = 0; i < level; i += 1) {
    for (const type of Object.keys(cost)) cost[type] = cost[type].pow(ECOSYSTEM_EXPANSION.costPower);
  }
  return cost;
}

export function canBuyEcosystemExpansion(state) {
  if (state.progression.growth < ECOSYSTEM_EXPANSION.unlockGrowth) return false;
  const cost = getEcosystemExpansionCost(state.upgrades.ecosystemExpansion);
  return Object.entries(cost).every(([type, amount]) => D(state.resources.energy[type]).gte(amount));
}

export function buyEcosystemExpansion(state) {
  if (!canBuyEcosystemExpansion(state)) return false;
  const cost = getEcosystemExpansionCost(state.upgrades.ecosystemExpansion);
  for (const [type, amount] of Object.entries(cost)) {
    state.resources.energy[type] = D(state.resources.energy[type]).minus(amount);
  }
  state.upgrades.ecosystemExpansion += 1;
  return true;
}
