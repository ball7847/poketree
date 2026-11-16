"use strict";
/* Pure importer. This does not implement move effects or alter gameplay. */
function parseCSV(input) {
 const lines=[];let row=[],field="",quoted=false;
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(c==='"'){if(quoted&&input[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&c===","){row.push(field);field="";}
  else if(!quoted&&(c==="\r"||c==="\n")){
   if(c==="\r"&&input[i+1]==="\n")i++;
   row.push(field);if(row.some(x=>x!==""))lines.push(row);
   row=[];field="";
  }else field+=c;
 }
 if(field||row.length){row.push(field);lines.push(row);}
 const columns=lines.shift();
 return lines.map(values=>Object.fromEntries(columns.map((name,i)=>[name,values[i]??""])));
}
const number=v=>v===""||v===undefined?null:Number(v);
function buildData(csv) {
 const read=name=>parseCSV(csv[name]);
 const moves=read("moves"), names=read("move_names"), meta=read("move_meta");
 const types=Object.fromEntries(read("types").map(x=>[x.id,x.identifier]));
 const targets=Object.fromEntries(read("move_targets").map(x=>[x.id,x.identifier]));
 const classes=Object.fromEntries(read("move_damage_classes").map(x=>[x.id,x.identifier]));
 const pokemon=read("pokemon"), vgroups=read("version_groups");
 const methods=Object.fromEntries(read("pokemon_move_methods").map(x=>[x.id,x.identifier]));
 const groups=Object.fromEntries(vgroups.map(v=>[v.id,{id:Number(v.id),name:v.identifier,generation:Number(v.generation_id),order:Number(v.order)}]));
 const namesById=new Map();
 for(const n of names) {
  let o=namesById.get(n.move_id);if(!o){o={};namesById.set(n.move_id,o);}
  if(n.local_language_id==="3")o.ko=n.name;
  else if(n.local_language_id==="9")o.en=n.name;
 }
 const metaById=new Map(meta.map(x=>[x.move_id,x]));
 const movesOut=moves.map(x=>{
  const m=metaById.get(x.id)||{};
  const detail={};
  for(const [key,value]of Object.entries(m))if(key!=="move_id"&&value!=="")detail[key]=Number(value);
  return {id:Number(x.id),key:x.identifier,ko:namesById.get(x.id)?.ko??null,en:namesById.get(x.id)?.en??null,
   generation:Number(x.generation_id),type:types[x.type_id]??null,
   category:classes[x.damage_class_id]??null,power:number(x.power),accuracy:number(x.accuracy),
   pp:number(x.pp),priority:Number(x.priority),target:targets[x.target_id]??null,
   effectId:number(x.effect_id),effectChance:number(x.effect_chance),meta:detail};
 }).sort((a,b)=>a.id-b.id);
 const species=new Map(),byPokemon=new Map();
 for(const p of pokemon) {
  const sid=Number(p.species_id),pid=Number(p.id);
  if(sid<1||sid>1025)continue;
  const s=species.get(sid)||[];s.push({pokemonId:pid,identifier:p.identifier,isDefault:p.is_default==="1"});species.set(sid,s);
  byPokemon.set(pid,{speciesId:sid});
 }
 const available=new Map(),lines=csv.pokemon_moves.trimEnd().split(/\r?\n/);
 let sourceRows=0,usableRows=0;
 for(let i=1;i<lines.length;i++){
  const p=lines[i].split(",");if(p.length<5)continue;sourceRows++;
  const pid=Number(p[0]),gid=Number(p[1]);if(!byPokemon.has(pid)||!groups[gid])continue;
  let set=available.get(pid);if(!set){set=new Set();available.set(pid,set);}set.add(gid);
  usableRows++;
 }
 const chosen=new Map();
 for(const [pid,vgids]of available){
  const ids=[...vgids];
  const champion=ids.includes(32)?32:null;
  const mainline=ids.filter(id=>id!==32).sort((a,b)=>groups[b].order-groups[a].order)[0]??null;
  chosen.set(pid,{champion,mainline,allGroups:ids.sort((a,b)=>a-b)});
 }
 const moveRows=new Map();
 for(let i=1;i<lines.length;i++){
  const p=lines[i].split(",");if(p.length<5)continue;
  const pid=Number(p[0]),gid=Number(p[1]),pick=chosen.get(pid);
  if(!pick||gid!==pick.champion&&gid!==pick.mainline)continue;
  let vals=moveRows.get(pid);if(!vals){vals={};moveRows.set(pid,vals);}
  const key=gid===pick.champion?"champions":"fallback";
  const rows=vals[key]||(vals[key]=[]);
  rows.push([Number(p[2]),Number(p[3]),Number(p[4])]);
 }
 const shards=[],stats={species:1025,pokemonForms:pokemon.length,sourceLearnsetRows:sourceRows,usableLearnsetRows:usableRows,
  distinctMoves:movesOut.length,koNames:movesOut.filter(x=>x.ko).length,
  formsWithAnySource:chosen.size,formsWithoutAnySource:1351-chosen.size,
  formsWithChampions:[...chosen.values()].filter(x=>x.champion===32).length,
  formsWithMainline:[...chosen.values()].filter(x=>x.mainline!==null).length,
  methodIds:methods};
 for(let first=1;first<=1025;first+=50){
  const last=Math.min(1025,first+49),entries=[];
  for(let sid=first;sid<=last;sid++){
   const forms=species.get(sid)||[];
   entries.push({speciesId:sid,pokemon:forms.map(p=>{
    const picked=chosen.get(p.pokemonId),rows=moveRows.get(p.pokemonId)||{};
    return {...p,champions:picked?.champion??null,
     fallback:picked?.mainline??null,availableGroups:picked?.allGroups??[],
     moves:{champions:rows.champions??[],fallback:rows.fallback??[]}};
   })});
  }
  shards.push({first,last,entries});
 }
 return {moves:movesOut,shards,stats,groups,methods};
}
module.exports={buildData,parseCSV};
