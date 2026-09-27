import { ECOSYSTEM_EXPANSION } from "../data/upgradeData.js";

export function getEcosystemExpansionCost(level) {
  const cost = { ...ECOSYSTEM_EXPANSION.baseCost };

  for (let i = 0; i < level; i += 1) {
    for (const type of Object.keys(cost)) {
      cost[type] = Math.pow(cost[type], ECOSYSTEM_EXPANSION.costPower);
    }
  }

  return cost;
}

export function canBuyEcosystemExpansion(state) {
  if (state.progression.growth < ECOSYSTEM_EXPANSION.unlockGrowth) return false;
  const cost = getEcosystemExpansionCost(state.upgrades.ecosystemExpansion);
  return Object.entries(cost).every(
    ([type, amount]) => (state.resources.energy[type] ?? 0) >= amount,
  );
}

export function buyEcosystemExpansion(state) {
  if (!canBuyEcosystemExpansion(state)) return false;
  const cost = getEcosystemExpansionCost(state.upgrades.ecosystemExpansion);

  for (const [type, amount] of Object.entries(cost)) {
    state.resources.energy[type] -= amount;
  }

  state.upgrades.ecosystemExpansion += 1;
  return true;
}
