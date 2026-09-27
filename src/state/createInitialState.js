import { ENERGY_TYPES, SAVE_CONFIG } from "../data/gameData.js";

function createEnergyMap(defaultValue = 0) {
  return Object.fromEntries(
    Object.keys(ENERGY_TYPES).map((type) => [type, defaultValue]),
  );
}

export function createInitialState(now = Date.now()) {
  const unlockedEnergyTypes = Object.values(ENERGY_TYPES)
    .filter((type) => type.initiallyUnlocked)
    .map((type) => type.id);

  return {
    saveVersion: SAVE_CONFIG.SAVE_VERSION,
    resources: {
      energy: createEnergyMap(0),
      unlockedEnergyTypes,
    },
    progression: {
      growth: 0,
    },
    time: {
      totalElapsedSeconds: 0,
      lastUpdateAt: now,
    },
    pokemon: {
      settled: [],
    },
    upgrades: {
      ecosystemExpansion: 0,
      treeDevelopment: {
        broadLeaves: 0,
        deepRoots: 0,
      },
    },
    weather: {
      current: null,
      remainingSeconds: 0,
      unlocked: ["sunny", "rain"],
    },
    stats: {
      totalEnergy: createEnergyMap(0),
      naturalEnergy: createEnergyMap(0),
      pokemonEnergy: createEnergyMap(0),
      daytimeNaturalEnergy: createEnergyMap(0),
      nighttimeNaturalEnergy: createEnergyMap(0),
      daytimePokemonEnergy: createEnergyMap(0),
      nighttimePokemonEnergy: createEnergyMap(0),
      totalPlayTimeSeconds: 0,
      growthCount: 0,
    },
  };
}
