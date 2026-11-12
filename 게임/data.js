/* PokeTree prototype data.
 * All species stats, encounter weights, probabilities and loot names here are
 * DEMONSTRATION PLACEHOLDERS, not approved final balancing.
 */
window.POKE_DATA = Object.freeze({
  demo: true,
  species: {
    rattata: { name: "꼬렛", weight: 1000, speed: 72, maxHp: 35 },
    pidgey: { name: "구구", weight: 1000, speed: 56, maxHp: 38 },
    caterpie: { name: "캐터피", weight: 800, speed: 45, maxHp: 40 },
    weedle: { name: "뿔충이", weight: 800, speed: 50, maxHp: 40 },
    pikachu: { name: "피카츄", weight: 10, speed: 90, maxHp: 40 },
    eevee: { name: "이브이", weight: 10, speed: 55, maxHp: 46 }
  },
  regions: {
    windy: {
      name: "바람의 들판",
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
    }
  },
  demoParty: [
    { id: "partner1", species: "pikachu", name: "피카츄" },
    { id: "partner2", species: "eevee", name: "이브이" },
    { id: "partner3", species: "pidgey", name: "구구" }
  ]
});
