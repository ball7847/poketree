/* Stage 8: five single-target recoil moves, pinned PokeAPI effects 49/199.
 * Source metadata uses -25 and -33 for recoil percentages; original rule for
 * effect 199 is one third of actual damage, not the decimal approximation .33.
 * No secondary effects, special self-damage, or area targeting are added.
 */
window.POKE_RECOIL_MOVES=Object.freeze({
  "take-down":{name:"돌진",type:"normal",category:"physical",power:90,accuracy:85,priority:0,target:"enemy",effect:"recoil",recoil:1/4,effectId:49,source:"pinned-PokeAPI"},
  "submission":{name:"지옥의바퀴",type:"fighting",category:"physical",power:80,accuracy:80,priority:0,target:"enemy",effect:"recoil",recoil:1/4,effectId:49,source:"pinned-PokeAPI"},
  "wild-charge":{name:"와일드볼트",type:"electric",category:"physical",power:90,accuracy:100,priority:0,target:"enemy",effect:"recoil",recoil:1/4,effectId:49,source:"pinned-PokeAPI"},
  "brave-bird":{name:"브레이브버드",type:"flying",category:"physical",power:120,accuracy:100,priority:0,target:"enemy",effect:"recoil",recoil:1/3,effectId:199,source:"pinned-PokeAPI"},
  "wood-hammer":{name:"우드해머",type:"grass",category:"physical",power:120,accuracy:100,priority:0,target:"enemy",effect:"recoil",recoil:1/3,effectId:199,source:"pinned-PokeAPI"}
});
