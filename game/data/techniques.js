/* Temporary crafting recipes/materials and demo discoveries only.
 * Canonical learnsets and TM compatibility are in imported-techniques.js.
 * Executable move effects remain in moves.js.
 */
window.POKE_TECH_DATA=Object.freeze({
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
