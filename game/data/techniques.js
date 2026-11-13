/* DEMO ONLY: learnsets, TM compatibility and recipes are placeholders.
 * Move effects come exclusively from data/moves.js; no canonical learnsets claimed.
 */
window.POKE_TECH_DATA=Object.freeze({
  learnsets:{
    pikachu:[{level:1,move:"quick-attack"},{level:5,move:"thunderbolt"}],
    eevee:[{level:1,move:"quick-attack"},{level:5,move:"swift"}],
    pidgey:[{level:1,move:"quick-attack"},{level:5,move:"gust"}]
  },
  tmCompatibility:{
    pikachu:["thunderbolt","quick-attack"],
    eevee:["swift","quick-attack"],
    pidgey:["gust","quick-attack"]
  },
  recipes:{
    "thunderbolt":{ore:3,leaf:2},
    "swift":{ore:2,leaf:3},
    "gust":{leaf:4},
    "quick-attack":{ore:2}
  },
  materials:{
    ore:{name:"시연용 광석"},
    leaf:{name:"시연용 잎"}
  },
  // Uses existing demo "find" events; this is not a final drop table.
  demoFinds:["ore","leaf","tm:gust","tool:training-band","ore","leaf","tm:swift","tool:guard-charm"]
});
