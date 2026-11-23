#!/usr/bin/env node
"use strict";
/* Stage14 explicit effect-group generator. No implicit fallback to damage. */
const fs=require("node:fs"),path=require("node:path"),root=path.resolve(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const mf=read("data-import/manifest.json");
const originals=mf.files.moves.flatMap(p=>read(p).moves).sort((a,b)=>a.id-b.id);
const sources=["simple-damage-moves.js","rank-moves.js","status-moves.js","drain-moves.js","heal-moves.js","recoil-moves.js","drain-75-moves.js","bulk-moves.js","stage12-moves.js","stage13-moves.js","moves.js"];
const existing=new Set(sources.flatMap(f=>[...fs.readFileSync(path.join(root,"game/data",f),"utf8").matchAll(/"([a-z0-9-]+)"\s*:\s*\{/g)].map(m=>m[1])));
const TARGET_RANK=Object.freeze({21:"speed",69:"attack",71:"speed",72:"spAttack",396:"attack"});
const SELF_RANK=Object.freeze({140:[["attack",1]],141:["attack","defense","spAttack","spDefense","speed"].map(stat=>[stat,1]),219:[["speed",-1]],230:[["defense",-1],["spDefense",-1]]});
const EXCLUDED=Object.freeze({"bulldoze":"targets all other Pokémon including allies; requires separate all-other resolver",
"ominous-wind":"source ailmentChance contradicts pure all-stat boost metadata; version confirmation pending"});
const groupIds=new Set([21,69,71,72,396,140,141,207,219,230,283,304,88,41,102,103,59,67]);
function extraZero(m,exceptions=[]){
 const skip=new Set(["meta_category_id","meta_ailment_id",...exceptions]);
 return Object.entries(m.meta).every(([key,val])=>skip.has(key)||val===0);
}
function base(m){
 return {name:m.ko,type:m.type,category:m.category,power:m.power,accuracy:m.accuracy,
 priority:m.priority,target:m.target==="selected-pokemon"?"enemy":m.target==="all-opponents"?"enemies":m.target==="user"?"self":"allies",
 effect:"damage",source:"pinned-PokeAPI",effectId:m.effectId};
}
function candidate(m){
 if(existing.has(m.key))return {state:"existing"};
 if(!groupIds.has(m.effectId))return {state:"outside-scope"};
 if(EXCLUDED[m.key])return {state:"deferred",reason:EXCLUDED[m.key]};
 if(!m.ko||m.type==="shadow"||!m.meta||m.priority!==0)return {state:"incomplete"};
 const single=m.target==="selected-pokemon",spread=m.target==="all-opponents";
 const physicalOrSpecial=["physical","special"].includes(m.category);
 const attack=physicalOrSpecial&&(single||spread)&&Number.isInteger(m.accuracy)&&m.accuracy>=1&&m.accuracy<=100;
 const hasPower=Number.isInteger(m.power)&&m.power>0;
 const x=base(m),mc=m.meta.meta_category_id,ma=m.meta.meta_ailment_id;
 if(Object.hasOwn(TARGET_RANK,m.effectId)){
  if(!attack||!hasPower||!((single||spread)&&m.key!=="bulldoze")||mc!==6||ma!==0||
     m.meta.stat_chance!==m.effectChance||m.effectChance<=0||!extraZero(m,["stat_chance"]))return {state:"complex-rank"};
  x.secondaryRank={stat:TARGET_RANK[m.effectId],stages:-1,target:"enemy",chance:m.effectChance};
  return {state:"verified",family:"target-rank-hit",move:x};
 }
 if(Object.hasOwn(SELF_RANK,m.effectId)){
  if(!attack||!single||!hasPower||mc!==7||ma!==0||m.effectChance!==m.meta.stat_chance||
    m.effectChance<=0||!extraZero(m,["stat_chance"]))return {state:"complex-self-rank"};
  x.secondaryRanks={target:"self",chance:m.effectChance,changes:SELF_RANK[m.effectId]};
  return {state:"verified",family:"self-multi-rank-hit",move:x};
 }
 if(m.effectId===207){
  if(m.category!=="status"||m.power!==null||m.accuracy!==null||m.target!=="user"||
     m.effectChance!==null||mc!==2||ma!==0||!extraZero(m))return {state:"complex-rank-status"};
  x.effect="multi-rank";x.ranks=[["defense",1],["spDefense",1]];
  return {state:"verified",family:"multi-rank-status",move:x};
 }
 if(m.effectId===283||m.effectId===304){
  if(!attack||!single||!hasPower||mc!==0||ma!==0||m.effectChance!==null||!extraZero(m))
   return {state:"complex-defense-mode"};
  if(m.effectId===283){if(m.category!=="special")return {state:"wrong-damage-class"};x.defenseStat="defense";}
  else {if(m.category!=="physical")return {state:"wrong-damage-class"};x.ignoreDefenseRank=true;x.ignoreEvasionRank=true;}
  return {state:"verified",family:m.effectId===283?"physical-defense-special":"ignore-target-stages",move:x};
 }
 if(m.effectId===88||m.effectId===41){
  if(!attack||!single||m.power!==null||mc!==0||ma!==0||m.effectChance!==null||!extraZero(m))
   return {state:"complex-fixed-damage"};
  x.fixedDamage=m.effectId===88?"user-level":"target-half-hp";
  return {state:"verified",family:m.effectId===88?"fixed-level":"target-hp-fraction",move:x};
 }
 if(m.effectId===102){
  if(!attack||!single||!hasPower||mc!==0||ma!==0||m.effectChance!==null||!extraZero(m))
   return {state:"complex-nonfaint"};
  x.minTargetHp=1;
  return {state:"verified",family:"leave-one-hp",move:x};
 }
 if(m.effectId===103){
  if(m.category!=="status"||m.power!==null||m.accuracy!==null||
     m.target!=="user-and-allies"||mc!==13||ma!==0||m.effectChance!==null||!extraZero(m))
   return {state:"complex-party-cure"};
  x.effect="party-cure";
  return {state:"verified",family:"party-cure",move:x};
 }
 if(m.effectId===59){
  if(m.category!=="status"||!single||m.power!==null||!attack&&m.accuracy===null||
     mc!==2||ma!==0||m.effectChance!==null||!extraZero(m))return {state:"complex-rank"};
  x.effect="rank";x.rank={stat:"attack",stages:-2};
  return {state:"verified",family:"target-rank-status",move:x};
 }
 if(m.effectId===67){
  if(m.category!=="status"||!(single||spread)||m.power!==null||
     m.accuracy===null||mc!==1||ma!==5||m.effectChance!==null||!extraZero(m))
   return {state:"complex-poison-status"};
  x.effect="status";x.status="poison";if(m.key==="poison-powder")x.powder=true;
  return {state:"verified",family:"poison-status",move:x};
 }
 return {state:"unsupported"};
}
if(originals.length!==937||mf.stats.moves!==937)throw Error("Pinned move count mismatch");
const chosen={},rows=[],families={};
for(const m of originals){const r=candidate(m);
 if(r.move){chosen[m.key]=r.move;families[r.family]=(families[r.family]||0)+1;}
 rows.push({id:m.id,key:m.key,effectId:m.effectId,state:r.state,family:r.family||null,reason:r.reason||null,
  sourceTarget:m.target,sourceEffectChance:m.effectChance});
}
const report={schemaVersion:1,sourceRevision:mf.sourceRevision,sourceCount:937,
 existingCount:258,added:Object.keys(chosen).length,total:258+Object.keys(chosen).length,
 families,excluded:EXCLUDED,rows};
const artifact=[["game/data/stage14-moves.js",
 "/* Generated stage14: explicit audited effects; unsupported moves not executable. */\nwindow.POKE_STAGE14_MOVES=Object.freeze("+JSON.stringify(chosen)+");\n"],
 ["data-audit/move-stage14-verification.json",JSON.stringify(report,null,2)+"\n"]];
if(process.argv.includes("--check")){for(const [p,s] of artifact)if(fs.readFileSync(path.join(root,p),"utf8")!==s)throw Error(p+" mismatch");}
else for(const [p,s] of artifact){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),s);}
console.log(JSON.stringify({added:report.added,total:report.total,families}));
module.exports={candidate,EXCLUDED};
