#!/usr/bin/env node
"use strict";
/* Rebuild the imported, non-runtime move and learnset snapshots.
 * Node >=22; downloads only a pinned PokeAPI revision; --check is read-only.
 */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {buildData}=require("./pokemon-move-transform.cjs");
const ROOT=path.resolve(__dirname,".."),REV="8a92bfa7dab2f12b84b5d151562f9857c133ff30";
const NAMES=["moves","move_names","move_meta","types","move_targets","move_damage_classes","version_groups","pokemon_move_methods","pokemon","pokemon_moves"];
async function loadCSV(name){
 const url="https://raw.githubusercontent.com/PokeAPI/pokeapi/"+REV+"/data/v2/csv/"+name+".csv";
 const r=await fetch(url,{signal:AbortSignal.timeout(120000)});
 if(!r.ok)throw Error(name+" HTTP "+r.status);
 return r.text();
}
function generatedFiles(data){
 const list=[];
 for(let i=0;i<data.moves.length;i+=250){
  const rows=data.moves.slice(i,i+250);
  list.push(["data-import/moves/moves-"+String(rows[0].id).padStart(5,"0")+"-"+String(rows.at(-1).id).padStart(5,"0")+".json",
   JSON.stringify({schemaVersion:1,moves:rows})+"\n"]);
 }
 for(const shard of data.shards)
  list.push(["data-import/learnsets/learnsets-"+String(shard.first).padStart(4,"0")+"-"+String(shard.last).padStart(4,"0")+".json",
    JSON.stringify({schemaVersion:1,firstDex:shard.first,lastDex:shard.last,species:shard.entries})+"\n"]);
 return list;
}
async function main(){
 const downloaded=await Promise.all(NAMES.map(async name=>[name,await loadCSV(name)]));
 const data=buildData(Object.fromEntries(downloaded)),files=generatedFiles(data);
 const expected=JSON.parse(fs.readFileSync(path.join(ROOT,"data-import/manifest.json"),"utf8"));
 assert.equal(data.moves.length,expected.stats.moves);
 assert.equal(data.stats.sourceLearnsetRows,expected.stats.rawPokemonMoveRows);
 assert.equal(data.stats.formsWithAnySource,expected.stats.pokemonFormsWithAnyLearnsets);
 assert.deepEqual(files.map(([name])=>name),[...expected.files.moves,...expected.files.learnsets]);
 for(const [relative,content]of files){
  const output=path.join(ROOT,relative);
  if(process.argv.includes("--check"))assert.equal(fs.readFileSync(output,"utf8"),content,relative+" differs from pinned source");
  else {fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,content);}
 }
 console.log(JSON.stringify({checked:process.argv.includes("--check"),moveCount:data.moves.length,sourceRows:data.stats.sourceLearnsetRows,files:files.length}));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={generatedFiles};
