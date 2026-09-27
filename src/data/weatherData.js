export const WEATHER = {
  sunny: {
    id: "sunny",
    name: "쾌청",
    typeMultipliers: { grass: 2, fire: 2, water: 0.5, ice: 0.5 },
  },
  rain: {
    id: "rain",
    name: "비",
    typeMultipliers: { water: 2 },
    naturalAvailability: { water: "always" },
  },
  sandstorm: {
    id: "sandstorm",
    name: "모래바람",
    typeMultipliers: { grass: 0.5, water: 0.5, ground: 2, rock: 2, steel: 2 },
  },
  hail: {
    id: "hail",
    name: "싸라기눈",
    typeMultipliers: { grass: 0.5, fire: 0.5, water: 2, ice: 2 },
  },
};

export const WEATHER_CONFIG = {
  CHANGE_CHANCE: 0.05,
  DURATION_SECONDS: 300,
  initiallyUnlocked: ["sunny", "rain"],
};
