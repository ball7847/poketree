#!/usr/bin/env node
/* Rebuild game/data/national-catalog.js from a pinned PokeAPI data revision.
 * Node 22+; requires internet ONLY for explicit regeneration, never at game runtime.
 * Run: node scripts/generate-national-catalog.cjs [--check]
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const REV="8a92bfa7dab2f12b84b5d151562f9857c133ff30";
const NAMES=["pokemon_species","pokemon","pokemon_stats","pokemon_types","pokemon_abilities","pokemon_species_names","pokemon_forms","pokemon_form_names","pokemon_evolution","growth_rates","types","abilities","evolution_triggers","items","moves"];
function parseCSV(s){
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(c==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
  else if(!quoted&&c===","){row.push(cell);cell=""}
  else if(!quoted&&(c==="\r"||c==="\n")){if(c==="\r"&&s[i+1]==="\n")i++;row.push(cell);if(row.some(v=>v!==""))rows.push(row);row=[];cell=""}
  else cell+=c;
 }
 if(row.length||cell){row.push(cell);rows.push(row)}
 const headers=rows.shift();
 return rows.map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]??""])));
}
function group(items,field){
 const m=new Map();for(const o of items){const a=m.get(o[field])||[];a.push(o);m.set(o[field],a)}return m;
}
function index(items){return new Map(items.map(o=>[o.id,o]))}
async function generate(){
 const data=await Promise.all(NAMES.map(async name=>{
  const url="https://raw.githubusercontent.com/PokeAPI/pokeapi/"+REV+"/data/v2/csv/"+name+".csv";
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(name+" returned HTTP "+response.status);
  return parseCSV(await response.text());
 }));
 const t=Object.fromEntries(NAMES.map((name,i)=>[name,data[i]]));
 const ps=group(t.pokemon,"species_id"),st=group(t.pokemon_stats,"pokemon_id"),ty=group(t.pokemon_types,"pokemon_id"),
  ab=group(t.pokemon_abilities,"pokemon_id"),fo=group(t.pokemon_forms,"pokemon_id"),fn=group(t.pokemon_form_names,"pokemon_form_id"),
  sn=group(t.pokemon_species_names,"pokemon_species_id"),ev=group(t.pokemon_evolution,"evolved_species_id");
 const si=index(t.pokemon_species),ti=index(t.types),ai=index(t.abilities),gi=index(t.growth_rates),
  tri=index(t.evolution_triggers),ii=index(t.items),mi=index(t.moves);
 const statNames={"1":"hp","2":"attack","3":"defense","4":"spAttack","5":"spDefense","6":"speed"};
 const growth={"slow":"slow","medium":"medium-fast","fast":"fast","medium-slow":"medium-slow","slow-then-very-fast":"erratic","fast-then-very-slow":"fluctuating"};
 const species={},cosmeticForms={},evolution={};let varietyCount=0,formCount=0;
 for(const s of t.pokemon_species){
  const id=s.identifier,variants=ps.get(s.id)||[],def=variants.find(p=>p.is_default==="1"),
   kr=(sn.get(s.id)||[]).find(o=>o.local_language_id==="3")?.name,groupName=growth[gi.get(s.growth_rate_id)?.identifier];
  assert.ok(def&&kr&&groupName,"missing species field: "+id);
  const battleForms={},displayForms=[];
  for(const p of variants){
   const key=p.id===def.id?"normal":p.identifier.startsWith(id+"-")?p.identifier.slice(id.length+1):p.identifier;
   assert.ok(!battleForms[key],"duplicate form: "+id+"/"+key);
   const base=Object.fromEntries((st.get(p.id)||[]).map(o=>[statNames[o.stat_id],+o.base_stat]));
   const types=(ty.get(p.id)||[]).sort((a,b)=>+a.slot- +b.slot).map(o=>ti.get(o.type_id)?.identifier);
   const abilities=(ab.get(p.id)||[]).sort((a,b)=>+a.slot- +b.slot).map(o=>({id:ai.get(o.ability_id)?.identifier,hidden:o.is_hidden==="1",slot:+o.slot}));
   assert.ok(Object.keys(base).length===6&&types.length&&types.every(Boolean)&&abilities.every(x=>x.id),"invalid form "+id+"/"+key);
   battleForms[key]={name:key==="normal"?"기본형":key,types,base,abilities,baseExp:p.base_experience===""?null:+p.base_experience,sourcePokemonId:+p.id};
   for(const f of fo.get(p.id)||[]){
    const localized=(fn.get(f.id)||[]).find(x=>x.local_language_id==="3");
    displayForms.push({id:+f.id,identifier:f.identifier,pokemonId:+p.id,battleForm:key,formIdentifier:f.form_identifier||null,name:localized?.form_name||null,formPokemonName:localized?.pokemon_name||null,battleOnly:f.is_battle_only==="1",mega:f.is_mega==="1",default:f.is_default==="1"});formCount++;
   }
   varietyCount++;
  }
  const previous=si.get(s.evolves_from_species_id);
  species[id]={name:kr,identifier:id,dex:+s.id,generation:+s.generation_id,baseExp:+def.base_experience,genderRate:+s.gender_rate,growth:groupName,forms:battleForms,evolvesFrom:previous?.identifier||null,evolutionChain:+s.evolution_chain_id};
  cosmeticForms[id]=displayForms;
  const raw=(ev.get(s.id)||[]).map(e=>{const x={};for(const [k,v] of Object.entries(e)){
   if(v==="")continue;
   if(k==="evolution_trigger_id")x.trigger=tri.get(v)?.identifier||null;
   else if(k==="trigger_item_id")x.triggerItem=ii.get(v)?.identifier||null;
   else if(k==="held_item_id")x.heldItem=ii.get(v)?.identifier||null;
   else if(k==="known_move_id")x.knownMove=mi.get(v)?.identifier||null;
   else if(k==="used_move_id")x.usedMove=mi.get(v)?.identifier||null;
   else x[k]=/^-?\d+$/.test(v)?+v:v;
  }return x});
  if(raw.length)evolution[id]=raw;
 }
 assert.equal(Object.keys(species).length,1025);
 assert.equal(varietyCount,1351);
 assert.equal(formCount,1579);
 assert.deepEqual(Object.values(species).map(s=>s.dex).sort((a,b)=>a-b),Array.from({length:1025},(_,i)=>i+1));
 const catalog={source:{provider:"PokeAPI/pokeapi",revision:REV,scope:"PokéAPI national species #1-1025, not Champions-verified",verifiedAgainstChampions:false,files:NAMES.map(n=>n+".csv")},species,cosmeticForms,evolution};
 return "/* National baseline from pinned PokeAPI CSV revision; no Champions verification claimed. */\nwindow.POKE_NATIONAL_CATALOG=Object.freeze("+JSON.stringify(catalog)+");\n";
}
(async()=>{
 const content=await generate(),target=path.resolve(__dirname,"../game/data/national-catalog.js");
 if(process.argv.includes("--check")){assert.equal(fs.readFileSync(target,"utf8"),content,"generated snapshot differs from pinned CSV");console.log("Pinned national catalog matches source")}
 else {fs.writeFileSync(target,content);console.log("Wrote national catalog from pinned source")}
})().catch(e=>{console.error(e);process.exitCode=1});
