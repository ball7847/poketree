/* Pokémon data provenance and resolution policy.
 * provenance is developer-facing metadata, NOT game mechanics or a proof that
 * a particular Pokémon/form exists in an edition.
 * Unknown earlier source versions are recorded as unverified; never invent them.
 */
window.POKE_DATA_PROVENANCE = Object.freeze({
  priority:Object.freeze(["champions",9,8,7,6,5,4,3,2,1]),
  fields:Object.freeze(["base","types","genderRate","growth","baseExp"]),
  sources:Object.freeze({
    currentStats:"https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_base_stats_(present)",
    experience:"https://bulbapedia.bulbagarden.net/wiki/Experience"
  }),
  // Values checked against current published species stats; exact in-game
  // highest-priority source for EVERY field has not yet been established.
  species:Object.freeze({
    rattata:Object.freeze({
      "normal.base":Object.freeze({source:"currentStats",version:"current-national-list",checked:true}),
      "normal.types":Object.freeze({source:null,version:null,checked:false}),
      genderRate:Object.freeze({source:null,version:null,checked:false}),
      growth:Object.freeze({source:null,version:null,checked:false}),
      baseExp:Object.freeze({source:null,version:null,checked:false})
    }),
    pidgey:Object.freeze({
      "normal.base":Object.freeze({source:"currentStats",version:"current-national-list",checked:true}),
      "normal.types":Object.freeze({source:null,version:null,checked:false}),
      genderRate:Object.freeze({source:null,version:null,checked:false}),
      growth:Object.freeze({source:null,version:null,checked:false}),
      baseExp:Object.freeze({source:null,version:null,checked:false})
    }),
    caterpie:Object.freeze({
      "normal.base":Object.freeze({source:"currentStats",version:"current-national-list",checked:true}),
      "normal.types":Object.freeze({source:null,version:null,checked:false}),
      genderRate:Object.freeze({source:null,version:null,checked:false}),
      growth:Object.freeze({source:null,version:null,checked:false}),
      baseExp:Object.freeze({source:null,version:null,checked:false})
    }),
    weedle:Object.freeze({
      "normal.base":Object.freeze({source:"currentStats",version:"current-national-list",checked:true}),
      "normal.types":Object.freeze({source:null,version:null,checked:false}),
      genderRate:Object.freeze({source:null,version:null,checked:false}),
      growth:Object.freeze({source:null,version:null,checked:false}),
      baseExp:Object.freeze({source:null,version:null,checked:false})
    }),
    pikachu:Object.freeze({
      "normal.base":Object.freeze({source:"currentStats",version:"current-national-list",checked:true}),
      "normal.types":Object.freeze({source:null,version:null,checked:false}),
      genderRate:Object.freeze({source:null,version:null,checked:false}),
      growth:Object.freeze({source:null,version:null,checked:false}),
      baseExp:Object.freeze({source:null,version:null,checked:false})
    }),
    eevee:Object.freeze({
      "normal.base":Object.freeze({source:"currentStats",version:"current-national-list",checked:true}),
      "normal.types":Object.freeze({source:null,version:null,checked:false}),
      genderRate:Object.freeze({source:null,version:null,checked:false}),
      growth:Object.freeze({source:null,version:null,checked:false}),
      baseExp:Object.freeze({source:null,version:null,checked:false})
    })
  })
});
