/* DEMONSTRATION ITEM DATA ONLY. Replace names, balance, recipes, and craft times after approval.
 * Effects are additive percentages applied to base stats before combat rank.
 */
window.POKE_TOOL_DATA=Object.freeze({
  items:{
    "training-band":{name:"시연용 훈련밴드",modifiers:{attack:0.10},recipe:{ore:2,leaf:1},craftMs:60000},
    "guard-charm":{name:"시연용 보호장식",modifiers:{defense:0.15},recipe:{ore:1,leaf:3},craftMs:90000},
    "vital-amulet":{name:"시연용 생명부적",modifiers:{hp:0.20},recipe:{ore:3,leaf:2},craftMs:120000}
  },
  demoDrops:["tool:training-band","material:ore","material:leaf","tool:guard-charm"]
});
