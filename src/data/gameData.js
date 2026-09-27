export const ENERGY_TYPES = {
  grass: { id: "grass", name: "풀", initiallyUnlocked: true },
  fire: { id: "fire", name: "불꽃", initiallyUnlocked: true },
  water: { id: "water", name: "물", initiallyUnlocked: true },
  normal: { id: "normal", name: "노말", initiallyUnlocked: false },
  bug: { id: "bug", name: "벌레", initiallyUnlocked: false },
  flying: { id: "flying", name: "비행", initiallyUnlocked: false },
  ice: { id: "ice", name: "얼음", initiallyUnlocked: false },
  ground: { id: "ground", name: "땅", initiallyUnlocked: false },
  rock: { id: "rock", name: "바위", initiallyUnlocked: false },
  steel: { id: "steel", name: "강철", initiallyUnlocked: false },
};

export const TREE_STAGES = [
  { minGrowth: 0, id: "sprout", name: "새싹" },
  { minGrowth: 15, id: "sapling", name: "묘목" },
  { minGrowth: 30, id: "smallTree", name: "작은 나무" },
];

export const TIME_CONFIG = {
  GAME_DAY_SECONDS: 60,
  DAY_SECONDS: 30,
  NIGHT_SECONDS: 30,
};

export const GROWTH_CONFIG = {
  BASE_COST: {
    grass: 2,
    fire: 1,
    water: 1,
  },
  COST_MULTIPLIER: 1.3,
  NATURAL_PRODUCTION_BASE: 0.2,
  NATURAL_PRODUCTION_PER_GROWTH: 0.1,
};

export const SAVE_CONFIG = {
  SAVE_VERSION: 2,
  STORAGE_KEY: "poketree-save",
  AUTOSAVE_INTERVAL_MS: 10_000,
};
