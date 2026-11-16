"use strict";
// Lossless, non-runtime archive of every pokemon_moves.csv relation for all source versions.
// No fallback inheritance or TM activation is performed here.
const {parseCSV}=require("./pokemon-move-transform.cjs");
const num=(value,label)=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<0)throw Error("invalid "+label+": "+value);return n;};
function buildFullHistory(csv){
 const groups=parseCSV(csv.version_groups).map(g=>({id:num(g.id,"group"),name:g.identifier,generation:num(g.generation_id,"generation"),order:num(g.order,"order")}));
 const groupById=new Map(groups.map(g=>[g.id,g]));
 const species=new Map(),byPokemon=new Map();
 for(const p of parseCSV(csv.pokemon)){
  const sid=num(p.species_id,"species"),pid=num(p.id,"pokemon");
  if(sid<1||sid>1025)continue;
  if(byPokemon.has(pid))throw Error("duplicate Pokémon id "+pid);
  byPokemon.set(pid,sid);
  const forms=species.get(sid)||[];
  forms.push({pokemonId:pid,identifier:p.identifier,isDefault:p.is_default==="1",versions:{}});
  species.set(sid,forms);
 }
 const formById=new Map([...species.values()].flat().map(p=>[p.pokemonId,p]));
 const overflow=[],stats={sourceRows:0,archivedRows:0,indexedRows:0,unmappedRows:0,byMethod:{},byGroup:{},byGeneration:{},formsWithRows:0,formsWithoutRows:0};
 const lines=csv.pokemon_moves.trimEnd().split(/\r?\n/);
 const header=lines.shift();
 if(header!=="pokemon_id,version_group_id,move_id,pokemon_move_method_id,level,order")throw Error("unexpected pokemon_moves header: "+header);
 for(const line of lines){
  if(!line)continue;
  const v=line.split(",");
  if(v.length!==6)throw Error("malformed source row "+(stats.sourceRows+1));
  const [pid,gid,move,method,level,order]=v.map((x,i)=>num(x,["pokemon","group","move","method","level","order"][i]));
  stats.sourceRows++;
  stats.archivedRows++;
  const group=groupById.get(gid);
  if(!group)throw Error("unknown source version group "+gid);
  stats.byMethod[method]=(stats.byMethod[method]||0)+1;
  stats.byGroup[gid]=(stats.byGroup[gid]||0)+1;
  stats.byGeneration[group.generation]=(stats.byGeneration[group.generation]||0)+1;
  const form=formById.get(pid);
  // Retain even rows outside the national dex scope, never silently discard.
  if(!form){overflow.push([pid,gid,move,method,level,order]);stats.unmappedRows++;continue;}
  (form.versions[gid]??=[]).push([move,method,level,order]);
  stats.indexedRows++;
 }
 const shards=[];
 for(let first=1;first<=1025;first+=50){
  const last=Math.min(first+49,1025),entries=[];
  for(let sid=first;sid<=last;sid++)entries.push({speciesId:sid,pokemon:species.get(sid)||[]});
  shards.push({schemaVersion:2,firstDex:first,lastDex:last,species:entries});
 }
 const forms=[...formById.values()];
 stats.formsWithRows=forms.filter(p=>Object.keys(p.versions).length>0).length;
 stats.formsWithoutRows=forms.length-stats.formsWithRows;
 stats.species=1025;stats.forms=forms.length;
 return {shards,overflow,groups,stats};
}
function selectVersion(versions,groupsById){
 const ids=Object.keys(versions).map(Number).filter(id=>versions[id].length>0);
 if(ids.includes(32))return {groupId:32,reason:"champions-source-unverified"};
 const candidates=ids.map(id=>groupsById[id]).filter(g=>g&&g.generation<=9);
 candidates.sort((a,b)=>b.generation-a.generation||b.order-a.order||b.id-a.id);
 return candidates.length?{groupId:candidates[0].id,reason:"latest-available-source-version"}:{groupId:null,reason:"no-supported-version"};
}
function queryLearnset(form,groupsById,methodId=null){
 const chosen=selectVersion(form.versions,groupsById);
 const rows=chosen.groupId===null?[]:form.versions[chosen.groupId]||[];
 return {...chosen,rows:methodId===null?rows:rows.filter(r=>r[1]===methodId)};
}
module.exports={buildFullHistory,selectVersion,queryLearnset};
