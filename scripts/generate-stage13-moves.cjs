#!/usr/bin/env node
"use strict";
/* Stage 13: strict effect-family definitions from pinned PokeAPI. */
const fs=require("node:fs"),path=require("node:path"),root=path.resolve(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const mf=read("data-import/manifest.json"),moves=mf.files.moves.flatMap(p=>read(p).moves).sort((a,b)=>a.id-b.id);
const sources=["simple-damage-moves.js","rank-moves.js","status-moves.js","drain-moves.js","heal-moves.js","recoil-moves.js","drain-75-moves.js","bulk-moves.js","stage12-moves.js","moves.js"];
const existing=new Set(sources.flatMap(file=>[...fs.readFileSync(path.join(root,"game/data",file),"utf8").matchAll(/"([a-z0-9-]+)"\s*:\s*\{/g)].map(x=>x[1])));
const RANKS=Object.freeze({11:["attack",1],12:["defense",1],20:["defense",-1],24:["accuracy",-1],52:["defense",2],61:["speed",-2],63:["spDefense",-2]});
const EXCLUDE=Object.freeze({"dark-void":"restricted special user and spread sleep mechanics","meteor-assault":"effectChance=100 despite no effect meta; source/version needs verification","eternabeam":"effectChance=100 despite no effect meta; source/version needs verification"});
function metadata(m,allowed=[],category=null,ailment=0){
 if(!m.meta||typeof m.meta!=="object")return false;
 if(category!==null&&m.meta.meta_category_id!==category)return false;
 if(m.meta.meta_ailment_id!==ailment)return false;
 const keys=new Set(["meta_category_id","meta_ailment_id",...allowed]);
 return Object.entries(m.meta).every(([k,v])=>keys.has(k)||v===0);
}
function base(m){return {name:m.ko,type:m.type,category:m.category,power:m.power,accuracy:m.accuracy,
 priority:m.priority,target:m.target==="user"?"self":m.target==="user-and-allies"?"allies":m.target==="all-opponents"?"enemies":"enemy",
 effect:"damage",source:"pinned-PokeAPI",effectId:m.effectId};}
function select(m){
 if(existing.has(m.key))return {state:"existing"};
 if(EXCLUDE[m.key])return {state:"excluded",reason:EXCLUDE[m.key]};
 if(![2,50,11,12,20,24,52,61,63,133,81,43].includes(m.effectId))return {state:"other-effect"};
 if(!m.ko||m.type==="shadow"||m.priority!==0)return {state:"incomplete"};
 const x=base(m),single=m.target==="selected-pokemon",self=m.target==="user",enemies=m.target==="all-opponents",allies=m.target==="user-and-allies";
 if([2,50].includes(m.effectId)){
  const sleep=m.effectId===2,kind=sleep?"sleep":"confusion",ailment=sleep?2:6;
  if(!single||m.category!=="status"||m.power!==null||!Number.isInteger(m.accuracy)||
     m.effectChance!==null||!metadata(m,["min_turns","max_turns"],1,ailment))
   return {state:"unsafe-status"};
  x.effect="status";x.status=kind;
  if(["sleep-powder","spore"].includes(m.key))x.powder=true;
  return {state:"registered",family:sleep?"sleep-status":"confusion-status",move:x};
 }
 if(Object.hasOwn(RANKS,m.effectId)){
  const [stat,stages]=RANKS[m.effectId],positive=stages>0;
  if(m.category!=="status"||m.power!==null||!metadata(m,[],2,0)||
    (positive?!self&&!allies:!single&&!enemies)||
    (m.accuracy===null?!positive:!Number.isInteger(m.accuracy))||
    (m.effectChance!==null&&!(m.effectChance===100&&m.meta.stat_chance===100)))
    return {state:"unsafe-rank"};
  x.effect="rank";x.rank={stat,stages};
  return {state:"registered",family:"rank",move:x};
 }
 if(m.effectId===133){
  if(!self||m.category!=="status"||m.power!==null||m.accuracy!==null||
   m.effectChance!==null||m.meta.healing!==50||!metadata(m,["healing"],3,0))
   return {state:"unsafe-weather-heal"};
  x.effect="heal";x.weatherHeal=true;
  return {state:"registered",family:"weather-heal",move:x};
 }
 if(m.effectId===81){
  if(!single||!["physical","special"].includes(m.category)||!Number.isSafeInteger(m.power)||
    m.power<=0||!Number.isInteger(m.accuracy)||m.effectChance!==null||!metadata(m,[],0,0))
    return {state:"unsafe-recharge"};
  x.effect="recharge";return {state:"registered",family:"recharge",move:x};
 }
 if(m.effectId===43){
  if(!single||!["physical","special"].includes(m.category)||!Number.isSafeInteger(m.power)||m.power<=0||
    !Number.isInteger(m.accuracy)||m.effectChance!==100||m.meta.ailment_chance!==100||
    !Number.isInteger(m.meta.min_turns)||!Number.isInteger(m.meta.max_turns)||
    m.meta.min_turns<1||m.meta.max_turns<m.meta.min_turns||
    !metadata(m,["min_turns","max_turns","ailment_chance"],4,8))
   return {state:"unsafe-binding"};
  x.effect="bind";x.bindDuration=[m.meta.min_turns,m.meta.max_turns];
  return {state:"registered",family:"binding",move:x};
 }
 return {state:"not-selected"};
}
if(moves.length!==937||mf.stats.moves!==937)throw Error("Pinned source count mismatch");
const chosen={},rows=[],families={};
for(const m of moves){const result=select(m);
 if(result.state==="other-effect"||result.state==="existing")continue;
 rows.push({id:m.id,key:m.key,effectId:m.effectId,state:result.state,family:result.family||null,reason:result.reason||null});
 if(result.move){chosen[m.key]=result.move;families[result.family]=(families[result.family]||0)+1;}
}
const report={schemaVersion:1,sourceRevision:mf.sourceRevision,sourceCount:937,previous:217,
 added:Object.keys(chosen).length,total:217+Object.keys(chosen).length,families,excluded:EXCLUDE,rows};
const artifacts=[["game/data/stage13-moves.js","/* Generated stage 13: verified status, rank, weather-heal, recharge and binding moves. */\nwindow.POKE_STAGE13_MOVES=Object.freeze("+JSON.stringify(chosen)+");\n"],
["data-audit/move-stage13-verification.json",JSON.stringify(report,null,2)+"\n"]];
if(process.argv.includes("--check")){
 for(const [p,c] of artifacts)if(fs.readFileSync(path.join(root,p),"utf8")!==c)throw Error(p+" differs from stage13 generator");
}else for(const [p,c] of artifacts){const full=path.join(root,p);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,c);}
console.log(JSON.stringify({added:report.added,total:report.total,families}));
module.exports={select,RANKS,EXCLUDE};
