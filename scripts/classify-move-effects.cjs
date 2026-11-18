#!/usr/bin/env node
"use strict";
// Static, read-only classification of pinned PokeAPI move effects.
// PokeAPI effect 1: regular damage with no additional effect.
// Strict candidate filter prevents special or unknown mechanics being silently simplified.
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const manifest=read("data-import/manifest.json");
const moves=manifest.files.moves.flatMap(p=>read(p).moves).sort((a,b)=>a.id-b.id);
const SELECTED=[1,5,10,11,15,17,21,22,25,30,33,55,56,64,65,70,88,121,224,337];
function eligible(m){
 return m.effectId===1&&["physical","special"].includes(m.category)
  &&Number.isSafeInteger(m.power)&&m.power>0
  &&Number.isInteger(m.accuracy)&&m.accuracy>0&&m.accuracy<=100
  &&m.priority===0&&m.target==="selected-pokemon"
  &&m.effectChance===null&&Object.values(m.meta||{}).every(value=>value===0)
  &&m.ko!=null&&m.type!=="shadow";
}
function classify(m){
 if(eligible(m))return "simple-damage-eligible";
 if(m.category==="status")return "status-or-support";
 if(m.effectId===1)return "simple-effect-special-metadata-or-target";
 if(["physical","special"].includes(m.category))return "damage-with-additional-or-unverified-effect";
 return "unknown-or-unsupported";
}
if(moves.length!==manifest.stats.moves||moves.length!==937)throw Error("move count mismatch");
const all=moves.map(m=>({id:m.id,key:m.key,effectId:m.effectId,classification:classify(m)}));
const totals={};for(const r of all)totals[r.classification]=(totals[r.classification]||0)+1;
const byId=new Map(moves.map(m=>[m.id,m]));
if(SELECTED.length!==20||new Set(SELECTED).size!==20)throw Error("selected count/duplicates");
const chosen=SELECTED.map(id=>{
 const m=byId.get(id);
 if(!m||!eligible(m))throw Error("chosen move not safely eligible: "+id);
 return m;
});
const report={schemaVersion:1,sourceRevision:manifest.sourceRevision,sourceMoveCount:moves.length,
 sourceRule:"effectId=1 and physical/special with positive power, finite accuracy, normal single-target, neutral meta, priority 0",
 verifiedEffectMeaning:"PokeAPI move effect 1: regular damage without additional effects",
 categories:totals,selectedIds:SELECTED,entries:all};
const js="/* Generated pinned simple damage moves: no game rule/engine changes. */\n"+
 "window.POKE_SIMPLE_DAMAGE_MOVES=Object.freeze("+JSON.stringify(Object.fromEntries(chosen.map(m=>[
 m.key,{name:m.ko,type:m.type,category:m.category,power:m.power,accuracy:m.accuracy,
 priority:m.priority,target:"enemy",effect:"damage",source:"pinned-PokeAPI",effectId:m.effectId}
 ])))+");\n";
const files=[["data-audit/move-effects-classification.json",JSON.stringify(report,null,2)+"\n"],
 ["game/data/simple-damage-moves.js",js]];
if(process.argv.includes("--check")){
 for(const [name,content] of files)if(fs.readFileSync(path.join(root,name),"utf8")!==content)throw Error(name+" differs from classification");
}else for(const [name,content] of files){const p=path.join(root,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,content);}
console.log(JSON.stringify({sourceMoves:moves.length,selected:SELECTED.length,categories:totals}));
module.exports={eligible,classify,SELECTED};
