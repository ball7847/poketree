#!/usr/bin/env node
"use strict";
// Supplementary stage15 registry: explicitly checked effect families, no implicit damage fallback.
const fs=require("node:fs"),path=require("node:path"),root=path.resolve(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const mf=read("data-import/manifest.json"),raw=mf.files.moves.flatMap(p=>read(p).moves).sort((a,b)=>a.id-b.id);
const expected={"haze":26,"sandstorm":116,"sweet-scent":25,"sunny-day":138,"hail":165,"revenge":186,"poison-tail":210,"payback":231,"assurance":232,"avalanche":186,"cross-poison":210,"charge-beam":277,"storm-throw":289,"fiery-dance":277,"noble-roar":344,"grassy-terrain":352,"misty-terrain":353,"psychic-terrain":395,"fire-lash":397,"bolt-beak":453,"fishious-rend":453,"wicked-blow":289,"thunderous-kick":397};
const descriptors={"sunny-day":{"effect":"weather","weather":"sun","duration":5},"sandstorm":{"effect":"weather","weather":"sandstorm","duration":5},"hail":{"effect":"weather","weather":"hail","duration":5},"grassy-terrain":{"effect":"terrain","terrain":"grassy","duration":5},"misty-terrain":{"effect":"terrain","terrain":"misty","duration":5},"psychic-terrain":{"effect":"terrain","terrain":"psychic","duration":5},"storm-throw":{"alwaysCrit":true},"wicked-blow":{"alwaysCrit":true},"charge-beam":{"secondaryRank":{"target":"self","stat":"spAttack","stages":1,"chance":70}},"fiery-dance":{"secondaryRank":{"target":"self","stat":"spAttack","stages":1,"chance":50}},"poison-tail":{"critRate":1,"secondary":{"kind":"poison","chance":10}},"cross-poison":{"critRate":1,"secondary":{"kind":"poison","chance":10}},"fire-lash":{"secondaryRank":{"target":"enemy","stat":"defense","stages":-1,"chance":100}},"thunderous-kick":{"secondaryRank":{"target":"enemy","stat":"defense","stages":-1,"chance":100}},"haze":{"effect":"clear-ranks"},"sweet-scent":{"effect":"rank","rank":{"stat":"evasion","stages":-2}},"noble-roar":{"effect":"multi-rank","ranks":[["attack",-1],["spAttack",-1]]},"payback":{"conditionalPower":"target-acted-double"},"assurance":{"conditionalPower":"target-damaged-double"},"revenge":{"conditionalPower":"user-hit-by-target-double"},"avalanche":{"conditionalPower":"user-hit-by-target-double"},"bolt-beak":{"conditionalPower":"target-not-acted-double"},"fishious-rend":{"conditionalPower":"target-not-acted-double"}};
if(raw.length!==937||mf.stats.moves!==937)throw Error("Source inventory changed");
const moves={},rows=[],groups={};
for(const m of raw){
 const desc=descriptors[m.key];
 if(!desc){rows.push({id:m.id,key:m.key,effectId:m.effectId,state:"outside-supplement-scope"});continue;}
 const base=desc.effect||"damage",isStatus=m.category==="status",area=m.target==="entire-field";
 const schemaValid=Object.keys(expected).includes(m.key)&&m.effectId===expected[m.key]&&m.ko&&m.priority===0||false;
 const priorityValid=["revenge","avalanche"].includes(m.key)?m.priority===-4:m.priority===0;
 const meta=Object.entries(m.meta||{}).every(([k,v])=>{
  if(k==="meta_category_id"||k==="crit_rate"||k==="stat_chance"||k==="ailment_chance")return true;
  return v===0;
 });
 const valid=Boolean(m.ko)&&m.type!=="shadow"&&m.effectId===expected[m.key]&&priorityValid&&meta&&
 (isStatus?m.power===null&&((area&&m.accuracy===null)||Number.isInteger(m.accuracy)):
 ["physical","special"].includes(m.category)&&Number.isInteger(m.power)&&m.power>0&&m.accuracy>0)&&
 (area||["selected-pokemon","all-opponents"].includes(m.target));
 const specific=(["storm-throw","wicked-blow"].includes(m.key)?m.meta.crit_rate===6:
 ["poison-tail","cross-poison"].includes(m.key)?m.meta.crit_rate===1&&m.meta.ailment_chance===10:
 ["charge-beam","fiery-dance","fire-lash","thunderous-kick"].includes(m.key)?m.meta.stat_chance===desc.secondaryRank.chance:
 ["haze","sunny-day","sandstorm","hail","grassy-terrain","misty-terrain","psychic-terrain"].includes(m.key)?m.meta.meta_category_id===10:true);
 if(!valid||!specific){rows.push({id:m.id,key:m.key,effectId:m.effectId,state:"deferred",reason:"source metadata or target validation failed"});continue;}
 moves[m.key]={name:m.ko,type:m.type,category:m.category,power:m.power,accuracy:m.accuracy,priority:m.priority,
  target:area?"field":m.target==="all-opponents"?"enemies":"enemy",effect:"damage",source:"pinned-PokeAPI",effectId:m.effectId,...desc};
 rows.push({id:m.id,key:m.key,effectId:m.effectId,state:"verified",family:desc.effect||desc.conditionalPower||"attack-secondary"});
 const label=desc.effect||desc.conditionalPower||"attack-secondary";groups[label]=(groups[label]||0)+1;
}
if(Object.keys(moves).length!==23)throw Error("Expected 23 validated moves; got "+Object.keys(moves).length);
const report={schemaVersion:1,sourceRevision:mf.sourceRevision,sourceCount:937,stage15PreviouslyAdded:11,added:23,total:331,families:{"weather":3,"terrain":3,"clear-ranks":1,"rank":1,"multi-rank":1,"attack-secondary":8,"target-acted-double":1,"target-damaged-double":1,"user-hit-by-target-double":2,"target-not-acted-double":2},rows};
const artifacts=[["game/data/stage15-supplement-moves.js","/* Generated from pinned PokeAPI; requires explicit stage15 effect handlers. */\nwindow.POKE_STAGE15_SUPPLEMENT_MOVES=Object.freeze("+JSON.stringify(moves)+");\n"],
["data-audit/move-stage15-supplement-verification.json",JSON.stringify(report,null,2)+"\n"]];
for(const [p,s] of artifacts){const f=path.join(root,p);if(process.argv.includes("--check")){if(fs.readFileSync(f,"utf8")!==s)throw Error("Mismatch "+p);}else{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s);}}
console.log("Verified stage15 supplement "+Object.keys(moves).length+" (total "+report.total+")");
