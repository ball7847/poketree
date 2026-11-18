/* 4th-stage rank-only moves. Values: pinned PokeAPI moves snapshot;
 * rank directions and stage counts independently checked against published move descriptions.
 * Original ancillary ability/item immunities are not claimed to be implemented.
 */
window.POKE_RANK_MOVES=Object.freeze({
 "swords-dance":{name:"칼춤",type:"normal",category:"status",power:null,accuracy:null,priority:0,target:"self",effect:"rank",rank:{stat:"attack",stages:2},source:"pinned-PokeAPI",effectId:51},
 "iron-defense":{name:"철벽",type:"steel",category:"status",power:null,accuracy:null,priority:0,target:"self",effect:"rank",rank:{stat:"defense",stages:2},source:"pinned-PokeAPI",effectId:52},
 "nasty-plot":{name:"나쁜음모",type:"dark",category:"status",power:null,accuracy:null,priority:0,target:"self",effect:"rank",rank:{stat:"spAttack",stages:2},source:"pinned-PokeAPI",effectId:54},
 "growl":{name:"울음소리",type:"normal",category:"status",power:null,accuracy:100,priority:0,target:"enemies",effect:"rank",rank:{stat:"attack",stages:-1},source:"pinned-PokeAPI",effectId:19},
 "tail-whip":{name:"꼬리흔들기",type:"normal",category:"status",power:null,accuracy:100,priority:0,target:"enemies",effect:"rank",rank:{stat:"defense",stages:-1},source:"pinned-PokeAPI",effectId:20},
 "screech":{name:"싫은소리",type:"normal",category:"status",power:null,accuracy:85,priority:0,target:"enemy",effect:"rank",rank:{stat:"defense",stages:-2},source:"pinned-PokeAPI",effectId:60},
 "metal-sound":{name:"금속음",type:"steel",category:"status",power:null,accuracy:85,priority:0,target:"enemy",effect:"rank",rank:{stat:"spDefense",stages:-2},source:"pinned-PokeAPI",effectId:63},
 "sand-attack":{name:"모래뿌리기",type:"ground",category:"status",power:null,accuracy:100,priority:0,target:"enemy",effect:"rank",rank:{stat:"accuracy",stages:-1},source:"pinned-PokeAPI",effectId:24},
 "smokescreen":{name:"연막",type:"normal",category:"status",power:null,accuracy:100,priority:0,target:"enemy",effect:"rank",rank:{stat:"accuracy",stages:-1},source:"pinned-PokeAPI",effectId:24},
 "double-team":{name:"그림자분신",type:"normal",category:"status",power:null,accuracy:null,priority:0,target:"self",effect:"rank",rank:{stat:"evasion",stages:1},source:"pinned-PokeAPI",effectId:17}
});
