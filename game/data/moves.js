/* Verified original move snapshots. Champions data preferred when available;
 * no move is invented to fill incomplete technical effects.
 * Sources: pokemon-zone.com/champions/moves and Bulbapedia (Gen IX).
 * PP in the PokeTree battle engine is a SHARED energy gauge, always costs 100.
 */
/* Only the ten explicitly approved custom techniques are executable.
 * The pinned original 937 move definitions and learnsets stay in imported-techniques.js.
 */
window.POKE_MOVES=Object.freeze({
  // Player-authored PokeTree move IDs; source learnset aliases are mapped below.
  "M010101":{name:"몸통박치기",type:"normal",category:"physical",power:40,accuracy:100,priority:0,target:"enemy",effect:"damage",tags:["접촉"],source:"poketree"},
  "M010102":{name:"막치기",type:"normal",category:"physical",power:40,accuracy:100,priority:0,target:"enemy",effect:"damage",tags:["접촉"],source:"poketree"},
  "M010103":{name:"할퀴기",type:"normal",category:"physical",power:40,accuracy:100,priority:0,target:"enemy",effect:"damage",tags:["접촉","베기"],source:"poketree"},
  "M010104":{name:"전광석화",type:"normal",category:"physical",power:40,accuracy:100,priority:1,target:"enemy",effect:"damage",tags:["접촉","선공기"],source:"poketree"},
  "M010201":{name:"에코보이스",type:"normal",category:"special",power:30,accuracy:100,priority:0,target:"enemy",effect:"multi",fixedHits:2,tags:["비접촉","소리","연속"],source:"poketree"},
  "M010105":{name:"더블어택",type:"normal",category:"physical",power:35,accuracy:90,priority:0,target:"enemy",effect:"multi",fixedHits:2,tags:["접촉","연속"],source:"poketree"},
  "M010106":{name:"풀베기",type:"normal",category:"physical",power:50,accuracy:95,priority:0,target:"enemy",effect:"damage",criticalAgainstTypes:["grass"],tags:["접촉","베기","급소"],source:"poketree"},
  "M010301":{name:"울음소리",type:"normal",category:"status",power:null,accuracy:100,priority:0,target:"enemies",effect:"rank",rank:{stat:"attack",stages:-1},tags:["랭크다운","광역-상대"],source:"poketree"},
  "M120101":{name:"덩굴채찍",type:"grass",category:"physical",power:45,accuracy:100,priority:0,target:"enemy",effect:"damage",tags:["접촉"],source:"poketree"},
  "M120301":{name:"성장",type:"grass",category:"status",power:null,accuracy:null,priority:0,target:"self",effect:"rank",ranks:[{stat:"attack",stages:1},{stat:"spAttack",stages:1}],sunStages:2,tags:["랭크업","자신"],source:"poketree"}
});
// Pinned original move IDs are retained for old saves and raw learnsets.
// New M IDs are additional canonical PokeTree learning/equipment options.
window.POKE_MOVE_CUSTOM_MAP=Object.freeze({
  "tackle":"M010101","pound":"M010102","scratch":"M010103",
  "quick-attack":"M010104","echoed-voice":"M010201",
  "double-hit":"M010105","cut":"M010106",
  "growl":"M010301","vine-whip":"M120101","growth":"M120301"
});