/* Canonical Generation I base stats, types, ratios and growth groups for six demo species.
 * genderRate = female eighths; -1 means genderless. The encounter WEIGHTS remain demo only.
 * Sources: PokeAPI species/pokemon database and original game data.
 */
window.POKE_SPECIES = Object.freeze({
  rattata:{name:"꼬렛",dex:19,genderRate:4,growth:"medium-fast",forms:{normal:{name:"기본형",types:["normal"],base:{hp:30,attack:56,defense:35,spAttack:25,spDefense:35,speed:72}}}},
  pidgey:{name:"구구",dex:16,genderRate:4,growth:"medium-slow",forms:{normal:{name:"기본형",types:["normal","flying"],base:{hp:40,attack:45,defense:40,spAttack:35,spDefense:35,speed:56}}}},
  caterpie:{name:"캐터피",dex:10,genderRate:4,growth:"medium-fast",forms:{normal:{name:"기본형",types:["bug"],base:{hp:45,attack:30,defense:35,spAttack:20,spDefense:20,speed:45}}}},
  weedle:{name:"뿔충이",dex:13,genderRate:4,growth:"medium-fast",forms:{normal:{name:"기본형",types:["bug","poison"],base:{hp:40,attack:35,defense:30,spAttack:20,spDefense:20,speed:50}}}},
  pikachu:{name:"피카츄",dex:25,genderRate:4,growth:"medium-fast",forms:{normal:{name:"기본형",types:["electric"],base:{hp:35,attack:55,defense:40,spAttack:50,spDefense:50,speed:90}}}},
  eevee:{name:"이브이",dex:133,genderRate:1,growth:"medium-fast",forms:{normal:{name:"기본형",types:["normal"],base:{hp:55,attack:55,defense:50,spAttack:45,spDefense:65,speed:55}}}}
});