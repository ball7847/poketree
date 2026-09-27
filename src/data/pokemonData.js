export const POKEMON = [
  {
    id: "bulbasaur",
    name: "이상해씨",
    condition: { kind: "currentEnergy", type: "grass", amount: 100 },
    effects: [{ kind: "produce", type: "grass", amount: 2 }],
  },
  {
    id: "charmander",
    name: "파이리",
    condition: { kind: "currentEnergy", type: "fire", amount: 400 },
    effects: [{ kind: "produce", type: "fire", amount: 2 }],
  },
  {
    id: "squirtle",
    name: "꼬부기",
    condition: { kind: "currentEnergy", type: "water", amount: 700 },
    effects: [{ kind: "produce", type: "water", amount: 2 }],
  },
  {
    id: "rattata",
    name: "꼬렛",
    condition: { kind: "growth", amount: 19 },
    effects: [{ kind: "produce", type: "normal", amount: 1 }],
  },
  {
    id: "furret",
    name: "다꼬리",
    condition: { kind: "currentEnergy", type: "normal", amount: 200 },
    effects: [{ kind: "produce", type: "normal", amount: 1 }],
  },
  {
    id: "linoone",
    name: "직구리",
    condition: { kind: "currentEnergy", type: "normal", amount: 3000 },
    effects: [{ kind: "produce", type: "normal", amount: 1 }],
  },
  {
    id: "caterpie",
    name: "캐터피",
    condition: { kind: "currentEnergy", type: "grass", amount: 1000 },
    effects: [{ kind: "produce", type: "bug", amount: 1 }],
  },
  {
    id: "pidgey",
    name: "구구",
    condition: { kind: "currentEnergy", type: "bug", amount: 160 },
    effects: [
      { kind: "produce", type: "normal", amount: 1 },
      { kind: "produce", type: "flying", amount: 1 },
    ],
  },
  {
    id: "sunkern",
    name: "해너츠",
    condition: {
      kind: "stat",
      path: ["daytimeNaturalEnergy", "grass"],
      amount: 1000,
    },
    effects: [
      {
        kind: "productionIncrease",
        source: "natural",
        phase: "day",
        types: "*",
        amount: 0.5,
      },
    ],
  },
  {
    id: "hoothoot",
    name: "부우부",
    condition: {
      kind: "stat",
      path: ["nighttimePokemonEnergy", "normal"],
      amount: 163,
    },
    effects: [
      {
        kind: "productionIncrease",
        source: "pokemon",
        phase: "night",
        types: "*",
        amount: 0.5,
      },
    ],
  },
];

export const POKEMON_BY_ID = Object.fromEntries(
  POKEMON.map((pokemon) => [pokemon.id, pokemon]),
);
