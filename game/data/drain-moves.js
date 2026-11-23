/* Sixth-stage HP drain attacks, sourced from pinned PokeAPI move metadata.
 * Original IDs: 71, 72, 141, 409, 532. PokeAPI effect 4 = drain 50% of actual damage.
 * No other effects or interactions are added. All use the existing drain engine.
 */
window.POKE_DRAIN_MOVES=Object.freeze({
  "absorb":{name:"흡수",type:"grass",category:"special",power:20,accuracy:100,priority:0,target:"enemy",effect:"drain",drain:0.5,effectId:4,source:"pinned-PokeAPI"},
  "mega-drain":{name:"메가드레인",type:"grass",category:"special",power:40,accuracy:100,priority:0,target:"enemy",effect:"drain",drain:0.5,effectId:4,source:"pinned-PokeAPI"},
  "leech-life":{name:"흡혈",type:"bug",category:"physical",power:80,accuracy:100,priority:0,target:"enemy",effect:"drain",drain:0.5,effectId:4,source:"pinned-PokeAPI"},
  "drain-punch":{name:"드레인펀치",type:"fighting",category:"physical",power:75,accuracy:100,priority:0,target:"enemy",effect:"drain",drain:0.5,effectId:4,source:"pinned-PokeAPI"},
  "horn-leech":{name:"우드혼",type:"grass",category:"physical",power:75,accuracy:100,priority:0,target:"enemy",effect:"drain",drain:0.5,effectId:4,source:"pinned-PokeAPI"}
});
