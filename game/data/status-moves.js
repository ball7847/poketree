/* Status-only moves from pinned PokeAPI snapshot.
 * Their combat status resolution is delegated to the existing PokeTree status engine.
 * Unique ability/item/substitute interactions are not globally implemented.
 */
window.POKE_STATUS_MOVES=Object.freeze({
 "will-o-wisp":{name:"도깨비불",type:"fire",category:"status",power:null,accuracy:85,priority:0,target:"enemy",effect:"status",status:"burn",effectId:168,source:"pinned-PokeAPI"},
 "toxic":{name:"맹독",type:"poison",category:"status",power:null,accuracy:90,priority:0,target:"enemy",effect:"status",status:"toxic",effectId:34,poisonTypeNeverMiss:true,source:"pinned-PokeAPI"},
 "hypnosis":{name:"최면술",type:"psychic",category:"status",power:null,accuracy:60,priority:0,target:"enemy",effect:"status",status:"sleep",effectId:2,source:"pinned-PokeAPI"},
 "confuse-ray":{name:"이상한빛",type:"ghost",category:"status",power:null,accuracy:100,priority:0,target:"enemy",effect:"status",status:"confusion",effectId:50,source:"pinned-PokeAPI"},
 "glare":{name:"뱀눈초리",type:"normal",category:"status",power:null,accuracy:100,priority:0,target:"enemy",effect:"status",status:"paralysis",effectId:68,source:"pinned-PokeAPI"}
});
