"use strict";
// Read-only Node.js query layer for pinned original moves and complete learnset history.
// This file is intentionally not imported by the browser game.
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),"utf8"));
const positive=(v,label)=>{if(!Number.isSafeInteger(v)||v<1)throw Error("invalid "+label);return v;};
function createCatalog(){
 const moveManifest=read("data-import/manifest.json"),historyManifest=read("data-import/full-history/manifest.json");
 if(moveManifest.sourceRevision!==historyManifest.sourceRevision)throw Error("source revisions differ");
 const moves=new Map(),keys=new Map(),speciesCache=new Map();
 const groups=new Map(historyManifest.versionGroups.map(x=>[x.id,x]));
 for(const file of moveManifest.files.moves){
  const doc=read(file);if(doc.schemaVersion!==1)throw Error("invalid move shard");
  for(const move of doc.moves){
   if(moves.has(move.id)||keys.has(move.key))throw Error("duplicate move");
   moves.set(move.id,move);keys.set(move.key,move);
  }
 }
 function getMove(id){return typeof id==="number"?moves.get(positive(id,"move ID"))??null:
  typeof id==="string"?keys.get(id)??null:null;}
 function loadSpecies(id){
  positive(id,"species ID");if(id>1025)return null;
  if(speciesCache.has(id))return speciesCache.get(id);
  const first=Math.floor((id-1)/50)*50+1,last=Math.min(first+49,1025);
  const file="data-import/full-history/learnsets-"+String(first).padStart(4,"0")+"-"+String(last).padStart(4,"0")+".json";
  if(!historyManifest.files.includes(file))throw Error("unlisted learnset shard");
  const doc=read(file);
  if(doc.schemaVersion!==2||doc.firstDex!==first||doc.lastDex!==last)throw Error("invalid learnset shard");
  for(const s of doc.species)speciesCache.set(s.speciesId,s);
  return speciesCache.get(id)||null;
 }
 function getForms(id){return (loadSpecies(id)?.pokemon||[]).map(p=>({
  pokemonId:p.pokemonId,identifier:p.identifier,isDefault:p.isDefault,
  hasRows:Object.keys(p.versions).length>0
 }));}
 function selectVersion(versions){
  if(versions[32]?.length)return {groupId:32,reason:"champions-unverified"};
  const candidates=Object.keys(versions).map(Number).filter(id=>versions[id]?.length)
   .map(id=>groups.get(id)).filter(g=>g&&g.generation<=9);
  candidates.sort((a,b)=>b.generation-a.generation||b.order-a.order||b.id-a.id);
  return candidates.length?{groupId:candidates[0].id,reason:"latest-source-version"}:
   {groupId:null,reason:"no-source-rows"};
 }
 function getLearnset(speciesId,{pokemonId,methodId=null,groupId=null}={}){
  const s=loadSpecies(speciesId);if(!s)return null;
  positive(pokemonId,"pokemon ID");
  const p=s.pokemon.find(x=>x.pokemonId===pokemonId);
  if(!p)throw Error("pokemon ID does not belong to species");
  if(methodId!==null)positive(methodId,"method ID");
  if(groupId!==null&&!groups.has(groupId))throw Error("unknown version group");
  const selection=groupId===null?selectVersion(p.versions):{groupId,reason:"explicit-group"};
  const raw=selection.groupId===null?[]:p.versions[selection.groupId]||[];
  return {speciesId,pokemonId,identifier:p.identifier,groupId:selection.groupId,
   version:selection.groupId===null?null:groups.get(selection.groupId),
   reason:selection.reason,championsProvisional:selection.groupId===32,
   hasRows:Object.keys(p.versions).length>0,
   rows:raw.filter(row=>methodId===null||row[1]===methodId).map(row=>({
    moveId:row[0],methodId:row[1],level:row[2],order:row[3],mastery:row[4],
    move:getMove(row[0])
   }))};
 }
 return {getMove,getForms,getLearnset,selectVersion,moveCount:moves.size,
  moveManifest,historyManifest};
}
module.exports={createCatalog};
