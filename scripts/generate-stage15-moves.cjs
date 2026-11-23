#!/usr/bin/env node
"use strict";
// Stage15 fixed candidate list. Original metadata must match before registration.
const fs=require("node:fs"),path=require("node:path"),root=path.resolve(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const manifest=read("data-import/manifest.json");
if(manifest.stats.moves!==937)throw Error("Original move count changed");
const originals=manifest.files.moves.flatMap(p=>read(p).moves).sort((a,b)=>a.id-b.id);
const spec={"flail":["low-hp-tier",100],"reversal":["low-hp-tier",100],"facade":["status-double",170],"eruption":["user-hp-scale",191],"water-spout":["user-hp-scale",191],"dragon-energy":["user-hp-scale",191],"brine":["target-half-hp-double",222],"venoshock":["target-poison-double",284],"hex":["target-status-double",311],"stored-power":["positive-ranks",306],"power-trip":["positive-ranks",306]};
const selected={},rows=[];
for(const m of originals){
  const s=spec[m.key];
  if(!s){rows.push({id:m.id,key:m.key,state:"outside-stage15-scope"});continue;}
  const ok=m.effectId===s[1]&&m.ko&&["physical","special"].includes(m.category)&&m.accuracy===100&&m.priority===0&&m.effectChance===null&&
   (m.target==="selected-pokemon"||(s[0]==="user-hp-scale"&&m.target==="all-opponents"))&&
   Object.entries(m.meta).every(([k,v])=>k==="meta_category_id"?v===0:v===0)&&
   ((s[0]==="low-hp-tier"&&m.power===null)||(s[0]!=="low-hp-tier"&&Number.isInteger(m.power)));
  if(!ok){rows.push({id:m.id,key:m.key,state:"deferred",reason:"metadata mismatch"});continue;}
  selected[m.key]={name:m.ko,type:m.type,category:m.category,power:m.power,accuracy:m.accuracy,priority:m.priority,
    target:m.target==="all-opponents"?"enemies":"enemy",effect:"damage",source:"pinned-PokeAPI",effectId:m.effectId,conditionalPower:s[0]};
  if(m.key==="facade")selected[m.key].ignoreBurnAttackDrop=true;
  rows.push({id:m.id,key:m.key,state:"verified",family:s[0]});
}
if(originals.length!==937||Object.keys(selected).length!==11)throw Error("Stage15 source audit failed");
const result=[["game/data/stage15-moves.js","/* Generated stage15: 11 verified conditional-power moves. */\nwindow.POKE_STAGE15_MOVES=Object.freeze("+JSON.stringify(selected)+");\n"],
["data-audit/move-stage15-verification.json",JSON.stringify({schemaVersion:1,sourceRevision:manifest.sourceRevision,sourceCount:937,existingCount:297,added:11,total:308,rows},null,2)+"\n"]];
for(const [p,s] of result){
  const full=path.join(root,p);
  if(process.argv.includes("--check")){if(fs.readFileSync(full,"utf8")!==s)throw Error(p+" mismatch");}
  else {fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,s);}
}
console.log("stage15 audit verified: 11; registered total: 308");
