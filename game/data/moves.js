/* Verified original move snapshots. Champions data preferred when available;
 * no move is invented to fill incomplete technical effects.
 * Sources: pokemon-zone.com/champions/moves and Bulbapedia (Gen IX).
 * PP in the PokeTree battle engine is a SHARED energy gauge, always costs 100.
 */
window.POKE_MOVES=Object.freeze({
  "quick-attack":{name:"전광석화",type:"normal",category:"physical",power:40,accuracy:100,priority:1,target:"enemy",effect:"damage",source:"champions"},
  "thunderbolt":{name:"10만볼트",type:"electric",category:"special",power:90,accuracy:100,priority:0,target:"enemy",effect:"damage",secondary:{kind:"paralysis",chance:10},source:"champions"},
  "gust":{name:"바람일으키기",type:"flying",category:"special",power:40,accuracy:100,priority:0,target:"enemy",effect:"damage",source:"gen9"},
  "swift":{name:"스피드스타",type:"normal",category:"special",power:60,accuracy:null,priority:0,target:"enemies",effect:"damage",source:"champions"},
  "giga-drain":{name:"기가드레인",type:"grass",category:"special",power:75,accuracy:100,priority:0,target:"enemy",effect:"drain",drain:0.5,source:"champions"},
  "flare-blitz":{name:"플레어드라이브",type:"fire",category:"physical",power:120,accuracy:100,priority:0,target:"enemy",effect:"recoil",recoil:1/3,secondary:{kind:"burn",chance:10},source:"champions"},
  "self-destruct":{name:"자폭",type:"normal",category:"physical",power:200,accuracy:100,priority:0,target:"enemies",effect:"selfdestruct",source:"gen9"},
  "thunder-wave":{name:"전기자석파",type:"electric",category:"status",power:null,accuracy:90,priority:0,target:"enemy",effect:"status",status:"paralysis",source:"champions"},
  "agility":{name:"고속이동",type:"psychic",category:"status",power:null,accuracy:null,priority:0,target:"self",effect:"rank",rank:{stat:"speed",stages:2},source:"champions"},
  "rain-dance":{name:"비바라기",type:"water",category:"status",power:null,accuracy:null,priority:0,target:"field",effect:"weather",weather:"rain",duration:5,source:"champions"},
  "electric-terrain":{name:"일렉트릭필드",type:"electric",category:"status",power:null,accuracy:null,priority:0,target:"field",effect:"terrain",terrain:"electric",duration:5,source:"champions"},
  "recover":{name:"HP회복",type:"normal",category:"status",power:null,accuracy:null,priority:0,target:"self",effect:"heal",source:"champions"},
  "bullet-seed":{name:"기관총",type:"grass",category:"physical",power:25,accuracy:100,priority:0,target:"enemy",effect:"multi",hits:[2,3,4,5],source:"champions"}
});