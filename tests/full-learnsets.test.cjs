"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {buildFullHistory,selectVersion,queryLearnset}=require("../scripts/full-learnsets-transform.cjs");
const root=path.resolve(__dirname,".."),base=path.join(root,"data-import/full-history");
const exists=fs.existsSync(path.join(base,"manifest.json"));
const fixture={
 pokemon:"id,identifier,species_id,height,weight,base_experience,order,is_default\n1,bulbasaur,1,7,69,64,1,1\n2,ivysaur,2,10,130,142,2,1\n",
 version_groups:"id,identifier,generation_id,order\n1,red-blue,1,1\n25,scarlet-violet,9,25\n32,champions,9,32\n",
 pokemon_moves:"pokemon_id,version_group_id,move_id,pokemon_move_method_id,level,order\n1,1,10,1,5,1\n1,25,20,4,0,\n1,32,30,12,0,3\n2,25,40,1,3,1\n99999,1,50,3,0,1\n"
};
test("full import retains every source row, all versions, and unmapped rows",()=>{
 const d=buildFullHistory(fixture);
 assert.equal(d.stats.sourceRows,5);assert.equal(d.stats.archivedRows,5);
 assert.equal(d.stats.indexedRows,4);assert.equal(d.stats.unmappedRows,1);
 assert.equal(d.stats.byMethod[4],1);
 const form=d.shards[0].species[0].pokemon[0];
 assert.deepEqual(form.versions["25"],[[20,4,0,null,null]]);
 assert.deepEqual(form.versions["1"],[[10,1,5,1,null]]);
 assert.deepEqual(form.versions["32"],[[30,12,0,3,9]]);
 assert.equal(queryLearnset(form,Object.fromEntries(d.groups.map(g=>[g.id,g]))).groupId,32);
 assert.deepEqual(queryLearnset(form,Object.fromEntries(d.groups.map(g=>[g.id,g])),4).rows,[]);
 const fallback=d.shards[0].species[1].pokemon[0];
 assert.equal(queryLearnset(fallback,Object.fromEntries(d.groups.map(g=>[g.id,g])),1).rows.length,1);
 assert.equal(d.overflow.length,1);
});
test("selection does not treat missing moves as inheritance from older versions",()=>{
 const g={1:{id:1,generation:1,order:1},25:{id:25,generation:9,order:25},32:{id:32,generation:9,order:32}};
 assert.equal(selectVersion({1:[[10,4,0,1]],25:[[20,1,1,1]]},g).groupId,25);
 assert.equal(selectVersion({1:[[10,4,0,1]],32:[[30,12,0,1]]},g).groupId,32);
 assert.equal(selectVersion({},g).groupId,null);
});
test("generated archive preserves pinned total, methods, groups, and excludes runtime", ()=>{
 assert.ok(exists,"Full-history manifest missing: import has not completed");
 const m=JSON.parse(fs.readFileSync(path.join(base,"manifest.json"),"utf8"));
 assert.equal(m.stats.sourceRows,638321);
 assert.equal(m.stats.archivedRows,m.stats.indexedRows+m.stats.unmappedRows);
 assert.equal(m.stats.forms,1351);
 assert.equal(m.status.engineIntegrated,false);
 let count=0,formIds=new Set(),speciesIds=new Set();
 for(const filename of m.files.filter(x=>x.includes("/learnsets-"))){
  const doc=JSON.parse(fs.readFileSync(path.join(root,filename),"utf8"));
  for(const s of doc.species){speciesIds.add(s.speciesId);for(const p of s.pokemon){
   assert.ok(!formIds.has(p.pokemonId));formIds.add(p.pokemonId);
   for(const [gid,rows]of Object.entries(p.versions)){
    assert.ok(m.versionGroups.some(g=>g.id===Number(gid)));
    for(const row of rows){assert.equal(row.length,5);assert.ok(row.slice(0,3).every(Number.isSafeInteger));assert.ok(row[3]===null||Number.isSafeInteger(row[3]));assert.ok(row[4]===null||Number.isSafeInteger(row[4]));count++;}
   }
  }}
 }
 const overflow=JSON.parse(fs.readFileSync(path.join(base,"unmapped.json"),"utf8")).rows;
 assert.equal(count,m.stats.indexedRows);assert.equal(overflow.length,m.stats.unmappedRows);
 assert.equal(count+overflow.length,638321);assert.equal(formIds.size,1351);assert.equal(speciesIds.size,1025);
});
