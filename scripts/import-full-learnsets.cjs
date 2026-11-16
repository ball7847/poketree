#!/usr/bin/env node
"use strict";
/* Pinned-source import of complete historical learnsets. Never alters game/*. */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const {buildFullHistory}=require("./full-learnsets-transform.cjs");
const ROOT=path.resolve(__dirname,".."),BASE="data-import/full-history";
const source=JSON.parse(fs.readFileSync(path.join(ROOT,"data-import/manifest.json"),"utf8"));
const REV=source.sourceRevision,CSV=["pokemon","version_groups","pokemon_moves"];
async function fetchPinned(name){
 const url="https://raw.githubusercontent.com/PokeAPI/pokeapi/"+REV+"/data/v2/csv/"+name+".csv";
 const r=await fetch(url,{signal:AbortSignal.timeout(120000)});
 if(!r.ok)throw Error(name+" source HTTP "+r.status);
 const value=await r.text();
 const gitSha=crypto.createHash("sha1").update("blob "+Buffer.byteLength(value)+"\0").update(value).digest("hex");
 assert.equal(gitSha,source.sourceFiles[name+".csv"],name+" pinned blob mismatch");
 return value;
}
function generatedFiles(data){
 const files=data.shards.map(s=>[BASE+"/learnsets-"+String(s.firstDex).padStart(4,"0")+"-"+String(s.lastDex).padStart(4,"0")+".json",JSON.stringify(s)+"\n"]);
 files.push([BASE+"/unmapped.json",JSON.stringify({schemaVersion:2,rows:data.overflow})+"\n"]);
 const manifest={schemaVersion:2,sourceProvider:source.sourceProvider,sourceRevision:REV,sourceFileBlobs:Object.fromEntries(CSV.map(n=>[n+".csv",source.sourceFiles[n+".csv"]])),status:{engineIntegrated:false,liveChampionsVerified:false,allSourceVersionsRetained:true},format:{row:"[moveId,methodId,level,order]",group:"versions[versionGroupId]",methodMachine:4,defaultSelection:"Champions group 32 if present; otherwise most recent <= generation 9 by group order; do not merge groups"},versionGroups:data.groups,files:files.map(([name])=>name),stats:data.stats,limitations:["This is an exhaustive archive only of the pinned PokeAPI pokemon_moves.csv, not an independently verified exhaustive list of all real game learnsets.","Rows without a national-dex Pokémon form are retained in unmapped.json.","No inference of compatibility, source omissions, or current Champions validity.","Game runtime and existing data-import/moves and data-import/learnsets are untouched."]};
 files.push([BASE+"/manifest.json",JSON.stringify(manifest,null,2)+"\n"]);
 return files;
}
async function main(){
 const csv=Object.fromEntries(await Promise.all(CSV.map(async n=>[n,await fetchPinned(n)])));
 const data=buildFullHistory(csv),files=generatedFiles(data),check=process.argv.includes("--check");
 assert.equal(data.stats.sourceRows,source.stats.rawPokemonMoveRows);
 assert.equal(data.stats.archivedRows,data.stats.indexedRows+data.stats.unmappedRows);
 assert.equal(data.stats.forms,source.stats.sourcePokemonForms);
 const count=data.shards.reduce((n,s)=>n+s.species.reduce((a,x)=>a+x.pokemon.reduce((b,p)=>b+Object.values(p.versions).reduce((c,rows)=>c+rows.length,0),0),0),0);
 assert.equal(count,data.stats.indexedRows);
 for(const [name,contents]of files){
  const target=path.join(ROOT,name);
  if(check)assert.equal(fs.readFileSync(target,"utf8"),contents,name+" differs from pinned source");
  else {fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,contents);}
 }
 console.log(JSON.stringify({check,files:files.length,stats:data.stats}));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={generatedFiles};
