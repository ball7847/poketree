#!/usr/bin/env node
"use strict";
/* Produce a static browser-readable projection of the pinned catalog.
 * The full 638321-record source is kept unchanged in data-import/full-history.
 * Never invent moves, inherit a form, or merge different version groups.
 */
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const history=read("data-import/full-history/manifest.json");
const movesManifest=read("data-import/manifest.json");
if(history.sourceRevision!==movesManifest.sourceRevision)throw Error("source revision mismatch");
const moves={},moveIds=new Map();
for(const file of movesManifest.files.moves)for(const move of read(file).moves){
 if(moveIds.has(move.id)||moves[move.key])throw Error("duplicate move");
 moveIds.set(move.id,move.key);
 moves[move.key]={id:move.id,name:move.ko||move.en||move.key,ko:move.ko,en:move.en,
  type:move.type,category:move.category,power:move.power,accuracy:move.accuracy,
  priority:move.priority,target:move.target,effectId:move.effectId,source:"pinned-PokeAPI"};
}
const groupById=new Map(history.versionGroups.map(g=>[g.id,g]));
function select(versions){
 if(versions[32]?.length)return 32;
 const list=Object.keys(versions).map(Number).filter(id=>versions[id]?.length)
  .map(id=>groupById.get(id)).filter(g=>g&&g.generation<=9)
  .sort((a,b)=>b.generation-a.generation||b.order-a.order||b.id-a.id);
 return list[0]?.id??null;
}
const forms={};let archiveRows=0,selectedRows=0,missing=0,formCount=0,unsupported=0;
for(const file of history.files.filter(f=>/\/learnsets-/.test(f))){
 const doc=read(file);
 for(const species of doc.species)for(const form of species.pokemon){
  formCount++;
  for(const rows of Object.values(form.versions))archiveRows+=rows.length;
  const groupId=select(form.versions);
  if(groupId===null)missing++;
  const rows=groupId===null?[]:form.versions[groupId];
  selectedRows+=rows.length;
  const level=[],machine=[];
  for(const [id,method,at] of rows){
   const key=moveIds.get(id);
   if(!key)throw Error("unknown move ID "+id);
   if(method===1)level.push([key,at]);
   if(method===4)machine.push(key);
   if(method!==1&&method!==4)unsupported++;
  }
  forms[form.pokemonId]={groupId,championsProvisional:groupId===32,level,machine,
   sourceRowCount:rows.length,missing:groupId===null};
 }
}
if(moveIds.size!==movesManifest.stats.moves||archiveRows!==history.stats.indexedRows||
 formCount!==history.stats.forms||missing!==history.stats.formsWithoutRows)throw Error("source accounting mismatch");
const payload={schemaVersion:1,sourceRevision:history.sourceRevision,
 engineIntegrated:true,championsIndependentlyVerified:false,
 stats:{moves:moveIds.size,forms:formCount,sourceRows:archiveRows,selectedRows,missingForms:missing},
 moves,forms};
const output="/* Generated from pinned data-import; not a combat effects registry. */\n"+
 "window.POKE_IMPORTED_TECHNIQUES=Object.freeze("+JSON.stringify(payload)+");\n";
const out=path.join(root,"game/data/imported-techniques.js");
if(process.argv.includes("--check")){
 if(fs.readFileSync(out,"utf8")!==output)throw Error("generated runtime techniques differ");
}else fs.writeFileSync(out,output);
console.log(JSON.stringify(payload.stats));
