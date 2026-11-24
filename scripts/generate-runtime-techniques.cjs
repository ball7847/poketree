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
// Champions method 12 is not proven to be level-up or TM. Preserve the
// Champions source as metadata, but use the newest self-contained version
// with verified method 1/4 rows when Champions has no interpretable rows.
function select(versions){
 const usable=rows=>rows?.some(row=>row[1]===1||row[1]===4);
 if(usable(versions[32]))return {id:32,championsFallback:false};
 const list=Object.keys(versions).map(Number).filter(id=>id!==32&&usable(versions[id]))
  .map(id=>groupById.get(id)).filter(g=>g&&g.generation<=9)
  .sort((a,b)=>b.generation-a.generation||b.order-a.order||b.id-a.id);
 const selected=list[0]?.id??(versions[32]?.length?32:null);
 return {id:selected,championsFallback:!!versions[32]?.length&&selected!==32};
}
const forms={};let archiveRows=0,selectedRows=0,missing=0,formCount=0,unsupported=0,championsFallbackForms=0,unresolvedChampionsForms=0;
for(const file of history.files.filter(f=>/\/learnsets-/.test(f))){
 const doc=read(file);
 for(const species of doc.species)for(const form of species.pokemon){
  formCount++;
  for(const rows of Object.values(form.versions))archiveRows+=rows.length;
  const choice=select(form.versions),groupId=choice.id;
  if(groupId===null)missing++;
  if(choice.championsFallback)championsFallbackForms++;
  if(groupId===32&&!form.versions[32].some(row=>row[1]===1||row[1]===4))unresolvedChampionsForms++;
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
  forms[form.pokemonId]={groupId,championsProvisional:groupId===32,
   championsSourceAvailable:!!form.versions[32]?.length,
   championsFallback:choice.championsFallback,level,machine,
   sourceRowCount:rows.length,missing:groupId===null};
 }
}
if(moveIds.size!==movesManifest.stats.moves||archiveRows!==history.stats.indexedRows||
 formCount!==history.stats.forms||missing!==history.stats.formsWithoutRows)throw Error("source accounting mismatch");
const payload={schemaVersion:1,sourceRevision:history.sourceRevision,
 engineIntegrated:true,championsIndependentlyVerified:false,
 stats:{moves:moveIds.size,forms:formCount,sourceRows:archiveRows,selectedRows,missingForms:missing,championsFallbackForms,unresolvedChampionsForms},
 moves,forms};
const output="/* Generated from pinned data-import; not a combat effects registry. */\n"+
 "window.POKE_IMPORTED_TECHNIQUES=Object.freeze("+JSON.stringify(payload)+");\n";
const out=path.join(root,"game/data/imported-techniques.js");
if(process.argv.includes("--check")){
 if(fs.readFileSync(out,"utf8")!==output)throw Error("generated runtime techniques differ");
}else fs.writeFileSync(out,output);
console.log(JSON.stringify(payload.stats));
