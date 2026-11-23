#!/usr/bin/env node
"use strict";
/* Stage 12: explicitly-verified effect families, no silent simplification. */
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const mf=read("data-import/manifest.json");
const moves=mf.files.moves.flatMap(p=>read(p).moves).sort((a,b)=>a.id-b.id);
const existingFiles=["simple-damage-moves.js","rank-moves.js","status-moves.js","drain-moves.js","heal-moves.js","recoil-moves.js","drain-75-moves.js","bulk-moves.js","moves.js"];
const existing=new Set(existingFiles.flatMap(f=>[...fs.readFileSync(path.join(root,"game/data",f),"utf8").matchAll(/"([a-z0-9-]+)"\s*:\s*\{/g)].map(a=>a[1])));
const EXCLUDED=Object.freeze({
  10002:"shadow special unsupported; lacks Korean name",
  742:"Double Iron Bash: flinch separately per hit, not plain two hits",
  814:"Dual Wingbeat: anomalous source effectChance=100 despite zero-effect metadata; version check required"
});
const families=Object.freeze({
  1:"plain-spread",32:"damage-flinch",44:"high-critical",
  30:"multi-2-to-5",45:"fixed-2-hits"
});
function metaExact(m,extra=[]){
 const allowed=new Set(["meta_category_id","meta_ailment_id",...extra]);
 return Object.entries(m.meta).every(([k,v])=>allowed.has(k)||v===0)&&
  m.meta.meta_category_id===0&&m.meta.meta_ailment_id===0;
}
function select(m){
 if(existing.has(m.key))return {state:"existing"};
 if(Object.hasOwn(EXCLUDED,m.id))return {state:"excluded",why:EXCLUDED[m.id]};
 if(!Object.hasOwn(families,m.effectId))return {state:"other-effect"};
 if(!m.ko||m.type==="shadow"||!m.meta||
  !["physical","special"].includes(m.category)||
  !Number.isSafeInteger(m.power)||m.power<=0||
  !Number.isInteger(m.accuracy)||m.accuracy<1||m.accuracy>100||
  m.priority!==0||m.effectChance!==null&&m.effectId!==32)
  return {state:"incomplete-or-complex"};
 const spread=m.target==="all-opponents",single=m.target==="selected-pokemon";
 if(!spread&&!single)return {state:"unsupported-target"};
 const result={name:m.ko,type:m.type,category:m.category,power:m.power,accuracy:m.accuracy,
  priority:m.priority,target:spread?"enemies":"enemy",effect:"damage",
  source:"pinned-PokeAPI",effectId:m.effectId};
 switch(m.effectId){
  case 1:
   if(!spread||m.effectChance!==null||!metaExact(m))return {state:"not-safe-plain-spread"};
   return {state:"registered",family:"plain-spread",move:result};
  case 32:
   if(m.effectChance!==m.meta.flinch_chance||m.effectChance<=0||
    !metaExact(m,["flinch_chance"]))return {state:"not-safe-flinch"};
   result.secondaryFlinch={chance:m.effectChance};
   return {state:"registered",family:"damage-flinch",move:result};
  case 44:
   if(m.effectChance!==null||m.meta.crit_rate!==1||
    !metaExact(m,["crit_rate"]))return {state:"not-safe-critical"};
   result.critRate=1;
   return {state:"registered",family:"high-critical",move:result};
  case 30:
  case 45: {
   const fixed=m.effectId===45;
   const low=2,high=fixed?2:5;
   if(!single||m.effectChance!==null||m.meta.min_hits!==low||
    m.meta.max_hits!==high||!metaExact(m,["min_hits","max_hits"]))
    return {state:"not-safe-multi-hit"};
   result.effect="multi";result.hits=fixed?2:[2,3,4,5];
   return {state:"registered",family:fixed?"fixed-2-hits":"multi-2-to-5",move:result};
  }
 }
 throw Error("Unexpected family");
}
if(moves.length!==937||mf.stats.moves!==937)throw Error("Pinned source count mismatch");
const chosen={},rows=[],counts={};
for(const m of moves){
 const x=select(m);
 if(x.state==="other-effect"||x.state==="existing")continue;
 rows.push({id:m.id,key:m.key,effectId:m.effectId,state:x.state,
  family:x.family||null,reason:x.why||null});
 if(x.move){chosen[m.key]=x.move;counts[x.family]=(counts[x.family]||0)+1;}
}
const report={schemaVersion:1,sourceRevision:mf.sourceRevision,sourceCount:moves.length,
 previous:158,added:Object.keys(chosen).length,total:158+Object.keys(chosen).length,
 families:counts,excluded:EXCLUDED,rows};
const output="/* Generated stage 12: verified critical, flinch, multi-hit, and spread moves. */\n"+
 "window.POKE_STAGE12_MOVES=Object.freeze("+JSON.stringify(chosen)+");\n";
const artifacts=[["game/data/stage12-moves.js",output],
 ["data-audit/move-stage12-verification.json",JSON.stringify(report,null,2)+"\n"]];
if(process.argv.includes("--check")){
 for(const [p,c] of artifacts)
  if(fs.readFileSync(path.join(root,p),"utf8")!==c)throw Error(p+" differs from stage12 generator");
}else for(const [p,c] of artifacts){const full=path.join(root,p);
 fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,c);}
console.log(JSON.stringify({registered:report.added,total:report.total,families:counts}));
module.exports={select,EXCLUDED};
