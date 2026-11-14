#!/usr/bin/env node
"use strict";
/* Read-only cross-reference scanner. Source snapshots are commit-pinned.
 * A match is CORROBORATION ONLY, not an edition-priority certification.
 * Node 22+ required. --write updates a report, NEVER game data.
 */
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const SHOWDOWN="7e743761cd13cdb361fc0f58eb5a866284894f5b";
const CHAMPIONS="cb874a3040174314f67642f382143cc8a401122a";
const SURL="https://raw.githubusercontent.com/smogon/pokemon-showdown/"+SHOWDOWN+"/data/pokedex.ts";
const CURL="https://raw.githubusercontent.com/otterlyclueless/pokemon-champions-data/"+CHAMPIONS+"/pokemon/";
const MC="fe8e533402e45b25e27eddd7f05db6bbf9940608";
const MCURL="https://raw.githubusercontent.com/Seancheey/PokeDD/"+MC+"/prisma/data/champions-mc.json";
const map={hp:"hp",attack:"atk",defense:"def",spAttack:"spa",spDefense:"spd",speed:"spe"};
const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,"");
async function json(url) {const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(url+": HTTP "+r.status);return r.json();}
async function txt(url) {const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(url+": HTTP "+r.status);return r.text();}
function local() {
 const context=vm.createContext({window:{}});
 vm.runInContext(fs.readFileSync(path.join(root,"game/data/national-catalog.js"),"utf8"),context);
 return context.window.POKE_NATIONAL_CATALOG.species;
}
function showdownObject(ts) {
 const start=ts.indexOf("= {");if(start<0)throw Error("Showdown source format unexpected");
 // The pinned source is a JavaScript object literal in a TypeScript wrapper.
 const expression=ts.slice(start+2).trim().replace(/;\s*$/,"");
 return vm.runInNewContext("("+expression+")",Object.create(null),{timeout:15000});
}
function championsForm(row,s) {
 const name=row.name.toLowerCase(),forms=Object.keys(s.forms);
 if(row.form==="Base")return "normal";
 if(name==="mega charizard x")return "mega-x";
 if(name==="mega charizard y")return "mega-y";
 if(name==="mega meowstic")return "male-mega"; // Candidate, check form detail manually.
 if(name.startsWith("mega ")||row.form==="Mega")return "mega";
 for(const [prefix,key]of [["alolan ","alola"],["galarian ","galar"],["hisuian ","hisui"]])if(name.startsWith(prefix))return key;
 if(name.startsWith("paldean ")) {const possible=forms.filter(x=>x.startsWith("paldea"));return possible.length===1?possible[0]:null;}
 if(name.includes("eternal"))return "eternal";
 if(name.includes("origin"))return "origin";
 const exact=forms.filter(x=>norm(name).endsWith(norm(x)));
 return exact.length===1?exact[0]:null;
}
function abilities(list) {
 return Object.entries(list).filter(([slot])=>["0","1","H"].includes(slot))
  .map(([slot,id])=>({id:norm(id),hidden:slot==="H",slot:slot==="H"?3:Number(slot)+1}))
  .sort((a,b)=>a.slot-b.slot);
}
function storedAbilities(form) {
 return form.abilities.map(x=>({id:norm(x.id),hidden:x.hidden,slot:x.slot})).sort((a,b)=>a.slot-b.slot);
}
function compareForm(localForm,refStats,refTypes,refAbilities,who) {
 const changes=[];
 for(const [field,sField] of Object.entries(map))if(refStats?.[sField]!==undefined&&localForm.base[field]!==refStats[sField])
  changes.push({...who,field:"base."+field,stored:localForm.base[field],reference:refStats[sField]});
 if(refTypes) {
  const types=refTypes.map(x=>x.toLowerCase());
  if(JSON.stringify(types)!==JSON.stringify(localForm.types))changes.push({...who,field:"types",stored:localForm.types,reference:types});
 }
 if(refAbilities) {
  const a=storedAbilities(localForm),b=abilities(refAbilities);
  if(JSON.stringify(a)!==JSON.stringify(b))changes.push({...who,field:"abilities",stored:a,reference:b,
   note:Object.keys(refAbilities).some(k=>!["0","1","H"].includes(k))?"reference contains nonstandard ability slots; not automatically wrong":undefined});
 }
 return changes;
}
async function run(){
 const [ts,roster,statRows,mc]=await Promise.all([txt(SURL),json(CURL+"roster.json"),json(CURL+"base-stats.json"),json(MCURL)]);
 const catalog=local(),show=showdownObject(ts);
 const byDex=new Map(Object.entries(catalog).map(([id,s])=>[s.dex,{id,s}]));
 const byStat=new Map(statRows.map(x=>[x.dexNumber+"/"+x.name,x]));
 const champions={sourceEntries:roster.length,matchedRows:0,comparedFields:0,unmatched:[],disagreements:[]};
 for(const row of roster) {
  const x=byDex.get(row.dexNumber),form=x&&championsForm(row,x.s),f=x?.s.forms?.[form];
  const stat=byStat.get(row.dexNumber+"/"+row.name);
  if(!f||!stat) {champions.unmatched.push({name:row.name,dex:row.dexNumber,reason:!f?"unmapped species/form":"missing stats"});continue;}
  champions.matchedRows++;champions.comparedFields+=8;
  const refAbilities=Object.fromEntries(Object.entries(row.abilities).filter(([k])=>["0","1","H"].includes(k)));
  champions.disagreements.push(...compareForm(f,stat,row.types,refAbilities,{name:row.name,id:x.id,form}));
  if(Object.keys(row.abilities).some(k=>!["0","1","H"].includes(k)))
   champions.unmatched.push({name:row.name,dex:row.dexNumber,reason:"nonstandard ability slot; slot not verified"});
 }
 const showdown={sourceEntries:Object.keys(show).length,matchedForms:0,comparedFields:0,unmatchedForms:[],disagreements:[]};
 for(const [id,s]of Object.entries(catalog))for(const [form,f]of Object.entries(s.forms)){
  const candidate=show[norm(id)+(form==="normal"?"":norm(form))];
  if(!candidate||candidate.num!==s.dex||id==="minior"&&form==="normal"){
   showdown.unmatchedForms.push({id,form,reason:id==="minior"&&form==="normal"?"form mapping ambiguous":"not a safe exact match"});continue;
  }
  showdown.matchedForms++;showdown.comparedFields+=8;
  showdown.disagreements.push(...compareForm(f,candidate.baseStats,candidate.types,candidate.abilities,{id,form,dex:s.dex}));
 }
 const championsSeptemberMC={sourceDate:"2026-09-16",comparedRows:0,comparedFields:0,disagreements:[],unmatched:[]};
 for(const row of mc.forms||[]){
  const f=catalog[row.baseSlug]?.forms?.[row.slug.slice(row.baseSlug.length+1)];
  if(!f){championsSeptemberMC.unmatched.push(row.slug);continue;}
  championsSeptemberMC.comparedRows++;championsSeptemberMC.comparedFields+=7;
  championsSeptemberMC.disagreements.push(...compareForm(f,row,[row.type1,row.type2].filter(Boolean),null,{id:row.baseSlug,form:row.slug}));
 }
 const species={matched:0,genderCompared:0,evolutionCompared:0,unmatched:[],differences:[]};
 for(const [id,s] of Object.entries(catalog)){
  const x=show[norm(id)];
  if(!x || x.num!==s.dex){species.unmatched.push(id);continue;}
  species.matched++;
  const female=x.gender==="N"?-1:x.gender==="M"?0:x.gender==="F"?8:
    x.genderRatio?Math.round(x.genderRatio.F*8):4;
  species.genderCompared++;
  if(s.genderRate!==female)species.differences.push({id,field:"genderRate",stored:s.genderRate,reference:female,
    classification:["meowstic","indeedee","basculegion"].includes(id)?"gender-form-model-difference":"requires-manual-check"});
  const prevo=x.prevo?norm(x.prevo):null,localPrevo=s.evolvesFrom?norm(s.evolvesFrom):null;
  species.evolutionCompared++;
  if(prevo!==localPrevo)species.differences.push({id,field:"evolvesFrom",stored:s.evolvesFrom,reference:x.prevo||null,
    classification:prevo&&localPrevo&&prevo.startsWith(localPrevo)?"evolution-form-vs-species-model":"requires-manual-check"});
 }
 return {runDate:new Date().toISOString().slice(0,10),scope:"full pass, partial source coverage; NOT full edition validation",
 sourceCommits:{showdown:SHOWDOWN,champions:CHAMPIONS,championsSeptemberMC:MC},
 sourceUrls:{showdown:SURL,championsRoster:CURL+"roster.json",championsStats:CURL+"base-stats.json",championsSeptemberMC:MCURL},
 champions,showdown,
 disclaimers:["April 2026 Champions roster is incomplete as of November 2026; absence is not proof of exclusion.",
 "Showdown main is a reference comparison, NOT pinned to Gen 9.",
 "A source match does not independently verify a given game edition; disputed fields need further research.",
 "Exact form mapping is required; unmatched forms are excluded from comparison.",
 "Gender, growth, evolution, cosmetic forms and experience cannot be edition-validated with these two source files."]};
}
if(require.main===module)run().then(data=>{
 if(process.argv.includes("--write"))fs.writeFileSync(path.join(root,"data-audit/full-scan-report.json"),JSON.stringify(data,null,2)+"\n");
 console.log(JSON.stringify({champions:{matched:data.champions.matchedRows,unmatched:data.champions.unmatched.length,disagreements:data.champions.disagreements.length},
 showdown:{matched:data.showdown.matchedForms,unmatched:data.showdown.unmatchedForms.length,disagreements:data.showdown.disagreements.length}},null,2));
}).catch(e=>{console.error(e);process.exitCode=1});
module.exports={run,championsForm,compareForm,showdownObject};
