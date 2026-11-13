/* PokeTree prototype data.
 * All species stats, encounter weights, probabilities and loot names here are
 * DEMONSTRATION PLACEHOLDERS, not approved final balancing.
 */
window.POKE_DATA = Object.freeze({
  demo: true,
  provenance: window.POKE_DATA_PROVENANCE,
  species: {
    rattata: { ...window.POKE_SPECIES.rattata, weight: 1000 },
    pidgey: { ...window.POKE_SPECIES.pidgey, weight: 1000 },
    caterpie: { ...window.POKE_SPECIES.caterpie, weight: 800 },
    weedle: { ...window.POKE_SPECIES.weedle, weight: 800 },
    pikachu: { ...window.POKE_SPECIES.pikachu, weight: 10 },
    eevee: { ...window.POKE_SPECIES.eevee, weight: 10 },
  },
  regions: {
    windy: {
      name: "바람의 들판",
      theme: "windy",
      start: "road",
      locations: {
        road: {
          name: "길",
          species: ["rattata", "pidgey", "pikachu", "eevee"],
          enemyCount: [{ value: 1, weight: 70 }, { value: 2, weight: 30 }],
          actions: [
            { type: "walk", weight: 30 },
            { type: "encounter", weight: 20 },
            { type: "move", to: "grass", weight: 40 },
            { type: "find", weight: 10 }
          ]
        },
        grass: {
          name: "풀숲",
          species: ["rattata", "pidgey", "caterpie", "weedle", "pikachu"],
          enemyCount: [{ value: 1, weight: 60 }, { value: 2, weight: 30 }, { value: 3, weight: 10 }],
          actions: [
            { type: "walk", weight: 30 },
            { type: "encounter", weight: 40 },
            { type: "move", to: "road", weight: 20 },
            { type: "find", weight: 9 },
            { type: "egg", weight: 1 }
          ]
        }
      }
    },
    meadow: {
      name: "시연용 초원",
      start: "trail",
      theme: "meadow",
      locations: {
        trail: {
          name: "오솔길",
          species: ["pidgey", "rattata", "eevee"],
          enemyCount: [{ value: 1, weight: 65 }, { value: 2, weight: 35 }],
          actions: [
            { type: "walk", weight: 30 },
            { type: "encounter", weight: 30 },
            { type: "move", to: "grove", weight: 30 },
            { type: "find", weight: 10 }
          ]
        },
        grove: {
          name: "나무그늘",
          species: ["caterpie", "weedle", "pikachu"],
          enemyCount: [{ value: 1, weight: 70 }, { value: 2, weight: 25 }, { value: 3, weight: 5 }],
          actions: [
            { type: "walk", weight: 35 },
            { type: "encounter", weight: 35 },
            { type: "move", to: "trail", weight: 20 },
            { type: "find", weight: 9 },
            { type: "egg", weight: 1 }
          ]
        }
      }
    }
  },
  demoParty: [
    { id: "partner1", species: "pikachu", name: "피카츄", moves: ["quick-attack","thunderbolt"] },
    { id: "partner2", species: "eevee", name: "이브이", moves: ["quick-attack","swift"] },
    { id: "partner3", species: "pidgey", name: "구구", moves: ["quick-attack","gust"] }
  ]
});
