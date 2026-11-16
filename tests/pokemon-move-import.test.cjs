"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const manifest=read("data-import/manifest.json");
test("imported move catalog covers 937 uniquely identified moves, preserving Korean names",()=>{
 const moves=manifest.files.moves.flatMap(file=>read(file).moves);
 assert.equal(moves.length,937);
 assert.equal(new Set(moves.map(x=>x.id)).size,937);
 assert.equal(new Set(moves.map(x=>x.key)).size,937);
 assert.equal(moves.filter(x=>x.ko!==null).length,919);
 const electric=moves.find(x=>x.key==="thunderbolt");
 assert.equal(electric.ko,"10만볼트");
 assert.equal(electric.power,90);
 assert.equal(electric.pp,15);
 assert.equal(electric.effectChance,10);
});
test("learnset import covers all 1025 species and all 1351 form rows without invented data",()=>{
 const shards=manifest.files.learnsets.map(read);
 const pokemon=shards.flatMap(s=>s.species.flatMap(x=>x.pokemon));
 const speciesIds=shards.flatMap(s=>s.species.map(x=>x.speciesId));
 assert.equal(new Set(speciesIds).size,1025);
 assert.deepEqual([...speciesIds].sort((a,b)=>a-b),Array.from({length:1025},(_,i)=>i+1));
 assert.equal(pokemon.length,1351);
 assert.equal(new Set(pokemon.map(x=>x.pokemonId)).size,1351);
 assert.equal(pokemon.filter(x=>x.champions!==null).length,319);
 assert.equal(pokemon.filter(x=>x.fallback!==null).length,1268);
 assert.equal(pokemon.filter(x=>x.champions===null&&x.fallback===null).length,48);
 assert.equal(pokemon.reduce((n,p)=>n+p.moves.champions.length,0),19810);
 assert.equal(pokemon.reduce((n,p)=>n+p.moves.fallback.length,0),74424);
});
test("every imported learnset move ID is defined in the imported catalog",()=>{
 const ids=new Set(manifest.files.moves.flatMap(p=>read(p).moves.map(m=>m.id)));
 for(const file of manifest.files.learnsets)
 for(const species of read(file).species)
 for(const pokemon of species.pokemon)
 for(const rows of Object.values(pokemon.moves))
 for(const [move,method,level] of rows){
  assert.ok(ids.has(move),"unknown move "+move);
  assert.ok(manifest.moveMethods[String(method)],"unknown method "+method);
  assert.ok(Number.isInteger(level)&&level>=0);
 }
});
test("import files remain separate from demo combat and techniques definitions",()=>{
 assert.equal(manifest.status.engineIntegrated,false);
 assert.equal(manifest.status.effectsImplemented,false);
 assert.equal(manifest.status.liveChampionsVerified,false);
 const moves=fs.readFileSync(path.join(root,"game/data/moves.js"),"utf8");
 assert.match(moves,/window.POKE_MOVES/);
});
