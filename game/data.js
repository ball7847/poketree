/* PokeTree prototype data.
 * All species stats, encounter weights, probabilities and loot names here are
 * DEMONSTRATION PLACEHOLDERS, not approved final balancing.
 */
window.POKE_DATA = Object.freeze({
  demo: true,
  provenance: window.POKE_DATA_PROVENANCE,
  // Undesigned national species never spawn without approved region encounter weights.
  species:Object.fromEntries(Object.entries(window.POKE_SPECIES).map(([id,entry])=>
    [id,{...entry,weight:({rattata:1000,pidgey:1000,caterpie:800,weedle:800,pikachu:10,eevee:10})[id]||0}])),
  regions: {
    windy: {
      name: "바람의평원", levelRange:[1,6],mainTypes:["노말","비행","벌레"],demoContent:true,unlock:null,
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
      name: "미끌바위언덕", levelRange:[1,9],mainTypes:["땅","바위","물"],demoContent:true,unlock:null,
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
    },
    apple:{name:"아삭사과숲",levelRange:[5,15],mainTypes:["비행","벌레","풀"],unlock:{type:"steps",region:"windy",count:50},start:null,locations:{},demoContent:false},
    spark:{name:"찌릿돌동굴",levelRange:[8,13],mainTypes:["땅","바위","전기"],unlock:{type:"steps",region:"meadow",count:80},start:null,locations:{},demoContent:false},
    dusk:{name:"어둑시니숲",levelRange:[10,25],mainTypes:["노말","악","고스트"],unlock:{type:"steps",region:"apple",count:150},start:null,locations:{},demoContent:false},
    deep:{name:"깊은굴",levelRange:[12,26],mainTypes:["땅","바위","강철"],unlock:{type:"boss",region:"spark"},start:null,locations:{},demoContent:false}
  },
  demoParty: [
    { id: "partner1", species: "pikachu", name: "피카츄", moves: ["quick-attack","thunderbolt"] },
    { id: "partner2", species: "eevee", name: "이브이", moves: ["quick-attack","swift"] },
    { id: "partner3", species: "pidgey", name: "구구", moves: ["quick-attack","gust"] }
  ]
});
