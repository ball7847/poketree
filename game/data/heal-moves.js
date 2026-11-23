/* Seventh-stage self-healing moves from pinned PokeAPI effect 33.
 * Soft-Boiled 135, Milk Drink 208, Slack Off 303.
 * heals exactly floor(max HP * 0.5), capped at missing HP; no other effects.
 */
window.POKE_HEAL_MOVES=Object.freeze({
  "soft-boiled":{name:"알낳기",type:"normal",category:"status",power:null,accuracy:null,priority:0,target:"self",effect:"heal",healFraction:0.5,effectId:33,source:"pinned-PokeAPI"},
  "milk-drink":{name:"우유마시기",type:"normal",category:"status",power:null,accuracy:null,priority:0,target:"self",effect:"heal",healFraction:0.5,effectId:33,source:"pinned-PokeAPI"},
  "slack-off":{name:"게으름피우기",type:"normal",category:"status",power:null,accuracy:null,priority:0,target:"self",effect:"heal",healFraction:0.5,effectId:33,source:"pinned-PokeAPI"}
});
