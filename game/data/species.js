/* National catalog is the source of species data.
 * Per-field provenance and unverified status are kept in data/provenance.js.
 * Demo encounter weights and the initial party remain in game/data.js.
 * Only the verified ORAS Cosplay Pikachu ability exception is applied here.
 */
const cosplayForms=["rock-star","belle","pop-star","phd","libre","cosplay"];
const cosplayAbility=Object.freeze([{id:"lightning-rod",hidden:false,slot:1}]);
const applyCosplayAbilities=species=>({
  ...species,
  forms:{
    ...species.forms,
    ...Object.fromEntries(cosplayForms.map(id=>[
      id,{...species.forms[id],abilities:cosplayAbility}
    ]))
  }
});
window.POKE_SPECIES=Object.freeze(Object.fromEntries(
  Object.entries(window.POKE_NATIONAL_CATALOG.species).map(([id,species])=>[
    id,id==="pikachu"?applyCosplayAbilities(species):species
  ])
));
