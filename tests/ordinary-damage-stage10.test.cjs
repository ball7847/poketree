"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),cp=require("node:child_process");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const approved=[401,402,404,406,408,438,584,667,670,692,785];
const excluded=[722,736,737,739,740];
function boot(){
 const math=Object.create(Math);math.random=()=>0;
 const ctx=vm.createContext({window:{addEventListener(){},localStorage:{getItem(){return null},setItem(){}}},performance:{now:()=>0},Date,console,Set,Map,Math:math});
 const scripts=["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/simple-damage-moves.js","data/rank-moves.js","data/status-moves.js","data/drain-moves.js","data/heal-moves.js","data/recoil-moves.js","data/drain-75-moves.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"];
 for(const p of scripts)vm.runInContext(read("game/"+p),ctx,{filename:p});
 return {w:ctx.window,math};
}
function originalMoves(){
 const manifest=JSON.parse(read("data-import/manifest.json"));
 return new Map(manifest.files.moves.flatMap(p=>JSON.parse(read(p)).moves).map(m=>[m.id,m]));
}
function setup(w){
 const G=w.PokeTree,user=G.Pokemon.create({id:"stage10-user",species:"eevee",level:50,side:"ally"});
 const target=G.Pokemon.create({id:"stage10-foe",species:"rattata",level:50,side:"enemy"});
 return {G,user,target,exp:{id:"windy",party:[user],enemies:[target],logs:[],weather:null,terrain:null}};
}
test("stage 10 source verification and exact 31/74 registry counts",()=>{
 cp.execFileSync(process.execPath,["scripts/classify-move-effects.cjs","--check"],{cwd:root,timeout:120000});
 const report=JSON.parse(read("data-audit/move-effects-classification.json"));
 const source=originalMoves(),{w}=boot();
 assert.equal(report.entries.length,937);
 assert.equal(report.selectedIds.length,31);
 assert.equal(report.categories["simple-damage-eligible"],31);
 assert.equal(Object.keys(w.POKE_SIMPLE_DAMAGE_MOVES).length,31);
 assert.equal(Object.keys(w.POKE_MOVES).length,74);
 for(const id of approved){
  const m=source.get(id),actual=w.POKE_MOVES[m.key],entry=report.entries.find(x=>x.id===id);
  assert.ok(m&&actual&&entry,id);
  assert.equal(m.effectId,1,id);assert.equal(entry.classification,"simple-damage-eligible",id);
  assert.equal(m.target,"selected-pokemon",id);assert.equal(m.effectChance,null,id);
  assert.equal(m.priority,0,id);
  assert.ok(Object.values(m.meta).every(x=>x===0),id);
  for(const prop of ["type","category","power","accuracy","priority"])assert.equal(actual[prop],m[prop],m.key+"/"+prop);
  assert.equal(actual.name,m.ko,m.key);assert.equal(actual.effectId,1,m.key);
  assert.equal(actual.target,"enemy",m.key);assert.equal(actual.effect,"damage",m.key);
  assert.equal(actual.secondary,undefined,m.key);
 }
 for(const id of excluded){
  const m=source.get(id),entry=report.entries.find(x=>x.id===id);
  assert.equal(m.effectId,1,id);
  assert.equal(entry.classification,"damage-with-additional-or-unverified-effect",id);
  assert.ok(!report.selectedIds.includes(id),id);
  assert.equal(w.POKE_MOVES[m.key],undefined,m.key);
 }
});
test("11 source-backed moves can all be learned, equipped, and deal physical/special damage for PP 100",()=>{
 const source=originalMoves(),{w}=boot();
 for(const id of approved){
  const key=source.get(id).key,c=setup(w);
  assert.equal(c.G.techniques.learn(c.user,key),null,key);
  assert.equal(c.G.techniques.equip(c.user,key,0),null,key);
  c.user.pp=100;
  const before=c.target.hp,own=c.user.hp;
  const out=w.PokeMoveEffects.execute(c.exp,c.user,{moveId:key,move:w.POKE_MOVES[key],targetId:c.target.id},()=>{});
  assert.equal(out.failed,false,key);assert.ok(c.target.hp<before,key);
  assert.equal(c.user.hp,own,key);assert.equal(c.user.pp,0,key);
 }
});
test("ordinary attacks retain type immunity, accuracy misses and insufficient PP rules",()=>{
 const {w,math}=boot(),source=originalMoves();
 const p=setup(w);p.user.pp=100;
 const originalHP=p.target.hp;
 w.PokeBattleStatus.rank(p.user,"accuracy",-6);
 math.random=()=>0.999;
 const miss=w.PokeMoveEffects.execute(p.exp,p.user,{moveId:"aqua-tail",move:w.POKE_MOVES["aqua-tail"],targetId:p.target.id},()=>{});
 assert.equal(miss.failed,false);
 assert.equal(p.target.hp,originalHP);assert.equal(p.user.pp,0);
 const noPP=setup(w);noPP.user.pp=99;
 const start=noPP.target.hp;
 const fail=w.PokeMoveEffects.execute(noPP.exp,noPP.user,{moveId:"seed-bomb",move:w.POKE_MOVES["seed-bomb"],targetId:noPP.target.id},()=>{});
 assert.equal(fail.failed,true);assert.equal(fail.reason,"insufficient-pp");assert.equal(noPP.target.hp,start);
 const immune=setup(w);immune.target=immune.G.Pokemon.create({id:"immune",species:"pidgey",level:50,side:"enemy"});
 immune.exp.enemies=[immune.target];immune.user.pp=100;math.random=()=>0;
 const before=immune.target.hp;
 const hit=w.PokeMoveEffects.execute(immune.exp,immune.user,{moveId:"high-horsepower",move:w.POKE_MOVES["high-horsepower"],targetId:immune.target.id},()=>{});
 assert.equal(hit.failed,false);assert.equal(immune.target.hp,before);assert.equal(immune.user.pp,0);
});
