"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {createCatalog}=require("../scripts/query-pokemon-data.cjs");
const root=path.resolve(__dirname,"..");
const catalog=createCatalog();
test("full move catalog has exact pinned entries and preserves null metadata",()=>{
 assert.equal(catalog.moveCount,937);
 const manifest=catalog.moveManifest;
 assert.equal(manifest.stats.moves,937);
 assert.equal(manifest.stats.movesWithKoreanNames,919);
 for(const file of manifest.files.moves){
  const doc=JSON.parse(fs.readFileSync(path.join(root,file),"utf8"));
  for(const move of doc.moves){
   assert.deepEqual(catalog.getMove(move.id),move);
   assert.deepEqual(catalog.getMove(move.key),move);
  }
 }
 assert.equal(catalog.getMove("nonexistent"),null);
});
test("all 638321 source relationships remain reachable without mixing groups",()=>{
 const manifest=catalog.historyManifest;
 let count=0,formCount=0,missing=0,invalidMoves=0,method1=0,method4=0;
 for(let speciesId=1;speciesId<=1025;speciesId++){
  const forms=catalog.getForms(speciesId);
  for(const form of forms){
   formCount++;
   const found=new Set();
   for(const group of manifest.versionGroups){
    const result=catalog.getLearnset(speciesId,{pokemonId:form.pokemonId,groupId:group.id});
    assert.equal(result.groupId,group.id);
    for(const row of result.rows){
     count++;found.add(group.id);
     assert.ok(Number.isSafeInteger(row.level));
     assert.ok(row.order===null||Number.isSafeInteger(row.order));
     assert.ok(row.mastery===null||Number.isSafeInteger(row.mastery));
     if(!row.move)invalidMoves++;
     if(row.methodId===1)method1++;
     if(row.methodId===4)method4++;
    }
   }
   if(found.size===0)missing++;
  }
 }
 assert.equal(formCount,1351);
 assert.equal(missing,48);
 assert.equal(count,manifest.stats.indexedRows);
 assert.equal(count+manifest.stats.unmappedRows,638321);
 assert.equal(method1,manifest.stats.byMethod["1"]);
 assert.equal(method4,manifest.stats.byMethod["4"]);
 assert.equal(invalidMoves,0,"archived move IDs absent from pinned move catalog");
});
test("version selection, method filtering and empty forms are explicit",()=>{
 const groups=catalog.historyManifest.versionGroups;
 const sample=catalog.getForms(3).find(p=>p.isDefault);
 assert.ok(sample);
 const selected=catalog.getLearnset(3,{pokemonId:sample.pokemonId});
 assert.equal(selected.groupId,32);
 assert.equal(selected.championsProvisional,true);
 const level=catalog.getLearnset(3,{pokemonId:sample.pokemonId,methodId:1});
 assert.ok(level.rows.every(r=>r.methodId===1));
 const machine=catalog.getLearnset(3,{pokemonId:sample.pokemonId,methodId:4});
 assert.ok(machine.rows.every(r=>r.methodId===4));
 assert.deepEqual(catalog.selectVersion({1:[[1,1,1,null,null]],25:[[2,1,1,null,null]]}),{groupId:25,reason:"latest-source-version"});
 assert.deepEqual(catalog.selectVersion({1:[[1,1,1,null,null]],32:[[2,12,0,null,null]]}),{groupId:32,reason:"champions-unverified"});
 assert.deepEqual(catalog.selectVersion({}),{groupId:null,reason:"no-source-rows"});
 assert.throws(()=>catalog.getLearnset(3,{}),/pokemon ID/);
 assert.throws(()=>catalog.getLearnset(3,{pokemonId:99999}),/does not belong/);
 assert.equal(catalog.getLearnset(1026,{pokemonId:99999}),null);
 assert.ok(groups.length>0);
});
