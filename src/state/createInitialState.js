import { ENERGY_TYPES, SAVE_CONFIG } from "../data/gameData.js";
import { D } from "../core/numberSystem.js";

function createEnergyMap(defaultValue = 0) {
  return Object.fromEntries(
    Object.keys(ENERGY_TYPES).map((type) => [type, D(defaultValue)]),
  );
}

export function createInitialState(now = Date.now()) {
  const unlockedEnergyTypes = Object.values(ENERGY_TYPES)
    .filter((type) => type.initiallyUnlocked)
    .map((type) => type.id);

  return {
    saveVersion: SAVE_CONFIG.SAVE_VERSION,
    resources: { energy: createEnergyMap(), unlockedEnergyTypes },
    progression: { growth: 0 },
    time: { totalElapsedSeconds: 0, lastUpdateAt: now },
    pokemon: { settled: [] },
    upgrades: {
      ecosystemExpansion: 0,
      treeDevelopment: { broadLeaves: 0, deepRoots: 0 },
    },
    weather: { current: null, remainingSeconds: 0, unlocked: ["sunny", "rain"] },
    stats: {
      totalEnergy: createEnergyMap(),
      naturalEnergy: createEnergyMap(),
      pokemonEnergy: createEnergyMap(),
      daytimeNaturalEnergy: createEnergyMap(),
      nighttimeNaturalEnergy: createEnergyMap(),
      daytimePokemonEnergy: createEnergyMap(),
      nighttimePokemonEnergy: createEnergyMap(),
      totalPlayTimeSeconds: 0,
      growthCount: 0,
    },
  };
}
