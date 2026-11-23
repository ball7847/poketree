#!/usr/bin/env node
"use strict";
/* Stage 11: conservative bulk generation against the pinned PokeAPI snapshot.
 * No unknown effect is silently mapped to plain damage.
 * Additional hidden effects are a manual blacklist, not proof that all others are safe.
 */
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const manifest=read("data-import/manifest.json");
const moves=manifest.files.moves.flatMap(p=>read(p).moves).sort((a,b)=>a.id-b.id);
const registryFiles=["simple-damage-moves.js","rank-moves.js","status-moves.js","drain-moves.js","heal-moves.js","recoil-moves.js","drain-75-moves.js","moves.js"];
const existing=new Set(registryFiles.flatMap(f=>[...fs.readFileSync(path.join(root,"game/data",f),"utf8").matchAll(/"([a-z0-9-]+)"\s*:\s*\{/g)].map(x=>x[1])));
const HIDDEN_EXTRA=new Set([34,503,592,780,815,700,793]);
// Special move logic not yet expressible without dropping a condition:
// Body Slam vs Minimize; thawing moves; Z-Move; False Surrender always-hit extra.
const STATUS=Object.freeze({3:"poison",5:"burn",6:"freeze",7:"paralysis",77:"confusion"});
const RANK=Object.freeze({70:"defense",71:"speed",72:"spAttack",73:"spDefense",74:"accuracy"});
function base(m){
 return {name:m.ko,type:m.type,category:m.category,power:m.power,accuracy:m.accuracy,priority:m.priority,
  target:m.target==="user"?"self":"enemy",effect:"damage",effectId:m.effectId,source:"pinned-PokeAPI"};
}
function allZeroExcept(m,except=[]){
 const safe=new Set(["meta_category_id","meta_ailment_id",...except]);
 return Object.entries(m.meta).every(([k,v])=>safe.has(k)||v===0);
}
function select(m){
 if(existing.has(m.key))return {family:"already-registered",reason:"existing"};
 if(HIDDEN_EXTRA.has(m.id))return {family:"needs-complex-effect",reason:"documented-extra-rule"};
 if(!m.ko||m.type==="shadow"||m.effectId==null||!m.meta)return {family:"unverified-or-incomplete",reason:"missing-original-metadata"};
 const single=m.target==="selected-pokemon",attacking=single&&["physical","special"].includes(m.category)&&
  Number.isSafeInteger(m.power)&&m.power>0&&
  (m.accuracy===null||Number.isInteger(m.accuracy)&&m.accuracy>=1&&m.accuracy<=100);
 if(attacking){
  const result=base(m);
  if(Object.hasOwn(STATUS,m.effectId)&&m.priority===0&&m.effectChance===m.meta.ailment_chance&&
    m.effectChance>0&&m.effectChance<=100&&m.meta.meta_ailment_id>0&&
    allZeroExcept(m,["ailment_chance","min_turns","max_turns"])){
   const validAilment={3:5,5:4,6:3,7:1,77:6};
   if(m.meta.meta_ailment_id===validAilment[m.effectId]){
    result.secondary={kind:STATUS[m.effectId],chance:m.effectChance};
    return {family:"damage+status",move:result};
   }
  }
  if(Object.hasOwn(RANK,m.effectId)&&m.priority===0&&m.effectChance===m.meta.stat_chance&&
    m.effectChance>0&&m.effectChance<=100&&m.meta.meta_ailment_id===0&&
    allZeroExcept(m,["stat_chance"])){
   result.secondaryRank={stat:RANK[m.effectId],stages:-1,target:"enemy",chance:m.effectChance};
   return {family:"damage+target-rank",move:result};
  }
  if(m.effectId===205&&m.priority===0&&m.effectChance===100&&m.meta.stat_chance===100&&
    m.meta.meta_ailment_id===0&&allZeroExcept(m,["stat_chance"])){
   result.secondaryRank={stat:"spAttack",stages:-2,target:"self",chance:100};
   return {family:"damage+self-rank",move:result};
  }
  if(m.effectId===104&&m.priority>0&&m.effectChance===null&&
    m.meta.meta_ailment_id===0&&allZeroExcept(m)){
   return {family:"priority-damage",move:result};
  }
  if(m.effectId===18&&m.accuracy===null&&m.priority===0&&m.effectChance===null&&
    m.meta.meta_ailment_id===0&&allZeroExcept(m)){
   return {family:"always-hit-damage",move:result};
  }
  if([49,199].includes(m.effectId)&&m.priority===0&&m.effectChance===null&&
    m.meta.meta_ailment_id===0&&m.meta.drain===(m.effectId===49?-25:-33)&&
    allZeroExcept(m,["drain"])){
   result.effect="recoil";result.recoil=m.effectId===49?1/4:1/3;
   return {family:"recoil-damage",move:result};
  }
 }
 if(m.effectId===33&&m.category==="status"&&m.power===null&&m.target==="user"&&
   m.accuracy===null&&m.priority===0&&m.meta.healing===50&&m.effectChance===null&&
   m.meta.meta_ailment_id===0&&allZeroExcept(m,["healing"])){
  const result=base(m);result.effect="heal";result.healFraction=.5;
  return {family:"self-heal-half",move:result};
 }
 return {family:"requires-effect-implementation",reason:"not-proven-compatible"};
}
if(moves.length!==937||moves.length!==manifest.stats.moves)throw Error("source count differs");
const grouped={},chosen={},rows=[];
for(const m of moves){
 const result=select(m),effect=String(m.effectId);
 if(!grouped[effect])grouped[effect]={count:0,families:{}};
 grouped[effect].count++;
 grouped[effect].families[result.family]=(grouped[effect].families[result.family]||0)+1;
 rows.push({id:m.id,key:m.key,effectId:m.effectId,type:m.type,category:m.category,target:m.target,
  power:m.power,accuracy:m.accuracy,priority:m.priority,effectChance:m.effectChance,
  meta:m.meta,family:result.family,reason:result.reason||null,registered:!!result.move});
 if(result.move)chosen[m.key]=result.move;
}
const report={schemaVersion:1,sourceProvider:manifest.sourceProvider,sourceRevision:manifest.sourceRevision,
 sourceMoveCount:moves.length,effectIdGroups:Object.keys(grouped).length,registeredBefore:74,
 added:Object.keys(chosen).length,registeredAfter:74+Object.keys(chosen).length,
 scope:"pinned-source-backed explicit allowlist; unsupported originals not auto-executable",
 effectGroups:grouped,rows};
const output="/* Generated stage 11: pinned PokeAPI effects, explicit verified families only. */\n"+
 "window.POKE_BULK_MOVES=Object.freeze("+JSON.stringify(chosen)+");\n";
const artifacts=[["data-audit/move-effect-families.json",JSON.stringify(report,null,2)+"\n"],["game/data/bulk-moves.js",output]];
if(process.argv.includes("--check")){
 for(const [p,s] of artifacts)if(fs.readFileSync(path.join(root,p),"utf8")!==s)throw Error(p+" differs from generator");
}else for(const [p,s] of artifacts){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),s);}
console.log(JSON.stringify({source:moves.length,effectIdGroups:report.effectIdGroups,added:report.added,after:report.registeredAfter}));
module.exports={select,STATUS,RANK,HIDDEN_EXTRA};
