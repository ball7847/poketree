"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),cp=require("node:child_process");
const ROOT=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const EXPECTED={"high-critical":15,"damage-flinch":19,"multi-2-to-5":12,"fixed-2-hits":5,"plain-spread":8};
const scripts=["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/simple-damage-moves.js","data/rank-moves.js","data/status-moves.js","data/drain-moves.js","data/heal-moves.js","data/recoil-moves.js","data/drain-75-moves.js","data/bulk-moves.js","data/stage12-moves.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"];
function boot(){
 const M=Object.create(Math);M.random=()=>0;
 const ctx=vm.createContext({window:{addEventListener(){},localStorage:{getItem(){return null},setItem(){}}},performance:{now:()=>0},Date,console,Set,Map,Math:M});
 for(const p of scripts)vm.runInContext(read("game/"+p),ctx,{filename:p});
 return {w:ctx.window,math:M};
}
function team(w,{foe="psyduck",level=80}={}){
 const G=w.PokeTree,user=G.Pokemon.create({id:"s12-user",species:"eevee",level:30,side:"ally"});
 const enemy=G.Pokemon.create({id:"s12-enemy",species:foe,level,side:"enemy"});
 return {G,user,enemy,exp:{id:"windy",party:[user],enemies:[enemy],logs:[],weather:null,terrain:null}};
}
function execute(w,c,key,callback=()=>{}){const move=w.POKE_MOVES[key];return w.PokeMoveEffects.execute(c.exp,c.user,{moveId:key,move,targetId:move.target==="enemies"?null:c.enemy.id},callback);}
test("stage-12 generator is reproducible and 59 source-backed moves are registered",()=>{
 const log=cp.execFileSync(process.execPath,["scripts/generate-stage12-moves.cjs","--check"],{cwd:ROOT,encoding:"utf8",timeout:120000});
 const result=JSON.parse(log);
 const report=JSON.parse(read("data-audit/move-stage12-verification.json"));
 const {w}=boot();
 assert.equal(result.registered,59);assert.equal(result.total,217);
 assert.equal(report.sourceCount,937);assert.equal(report.added,59);
 assert.equal(Object.keys(w.POKE_STAGE12_MOVES).length,59);
 assert.equal(Object.keys(w.POKE_MOVES).length,217);
 for(const [family,count] of Object.entries(EXPECTED))assert.equal(report.families[family],count,family);
 const manifest=JSON.parse(read("data-import/manifest.json"));
 const originals=new Map(manifest.files.moves.flatMap(p=>JSON.parse(read(p)).moves).map(m=>[m.key,m]));
 for(const [key,m] of Object.entries(w.POKE_STAGE12_MOVES)){
  const source=originals.get(key);
  assert.ok(source,key);
  for(const field of ["name","type","category","power","accuracy","priority","effectId"]){
   assert.equal(m[field],field==="name"?source.ko:source[field],key+"/"+field);
  }
  assert.equal(m.target,source.target==="all-opponents"?"enemies":"enemy");
  assert.equal(w.POKE_MOVES[key],m,key);
 }
 for(const key of ["double-iron-bash","dual-wingbeat","shadow-blast"]){
  assert.equal(w.POKE_STAGE12_MOVES[key],undefined,key);
 }
});
test("all 59 moves learn, equip, execute and spend exactly 100 PP",()=>{
 const {w}=boot();
 for(const [key,move] of Object.entries(w.POKE_STAGE12_MOVES)){
  const c=team(w);
  assert.equal(c.G.techniques.learn(c.user,key),null,key);
  assert.equal(c.G.techniques.equip(c.user,key,0),null,key);
  c.user.pp=100;
  const before=c.enemy.hp;
  const done=execute(w,c,key);
  assert.equal(done.failed,false,key);
  assert.equal(c.user.pp,0,key);
  assert.ok(c.enemy.hp<before,key);
  if(move.critRate)assert.equal(move.critRate,1,key);
  if(move.secondaryFlinch)assert.ok(move.secondaryFlinch.chance>0,key);
 }
});
test("ordinary critical stays at 5%; marked high-crit moves use 12.5%",()=>{
 const {w}=boot(),c=team(w),D=w.PokeDamage;
 const normal=w.POKE_MOVES["water-gun"],high=w.POKE_MOVES["slash"];
 assert.equal(normal.critRate,undefined);assert.equal(high.critRate,1);
 const rng=()=>.10;
 const normalResult=D.roll(c.user,c.enemy,{move:normal,rng});
 const highResult=D.roll(c.user,c.enemy,{move:high,rng});
 assert.equal(normalResult.critical,false);assert.equal(highResult.critical,true);
 assert.equal(D.roll(c.user,c.enemy,{move:normal,rng:()=>.049}).critical,true);
 assert.equal(D.roll(c.user,c.enemy,{move:high,rng:()=>.125}).critical,false);
});
test("fixed-2 and 2-5 attacks have correct hit distributions and PP once per use",()=>{
 const {w,math}=boot();
 assert.equal(w.PokeMoveEffects.hitCount(w.POKE_MOVES["double-kick"]),2);
 for(const [random,hits] of [[0,2],[.3499,2],[.35,3],[.6999,3],[.7,4],[.8499,4],[.85,5]]){
  math.random=()=>random;
  assert.equal(w.PokeMoveEffects.hitCount(w.POKE_MOVES["double-slap"]),hits);
 }
 math.random=()=>0;
 const two=team(w),variable=team(w);
 for(const [key,c,count] of [["double-kick",two,2],["double-slap",variable,2]]){
  c.user.pp=100;
  execute(w,c,key);
  assert.equal(c.exp.logs.filter(x=>x.message.includes("타 ·")).length,count,key);
  assert.equal(c.user.pp,0,key);
 }
});
test("flinch applies only to a pending personal turn and is consumed exactly once",()=>{
 const {w}=boot();
 let c=team(w);
 c.exp.order=[c.user,c.enemy];c.exp.turnIndex=1;c.user.pp=100;
 execute(w,c,"headbutt");
 assert.equal(w.PokeBattleStatus.ensure(c.enemy).volatile.flinch,true);
 assert.match(w.PokeBattleStatus.beforeAction(c.enemy),/풀죽음/);
 assert.equal(w.PokeBattleStatus.ensure(c.enemy).volatile.flinch,false);
 assert.equal(w.PokeBattleStatus.beforeAction(c.enemy),null);
 c=team(w);c.exp.order=[c.enemy,c.user];c.exp.turnIndex=2;c.user.pp=100;
 execute(w,c,"headbutt");
 assert.equal(w.PokeBattleStatus.ensure(c.enemy).volatile.flinch,undefined);
});
test("spread attack hits each alive enemy, does not hit allied party, and spends PP once",()=>{
 const {w}=boot(),c=team(w);
 const enemy2=c.G.Pokemon.create({id:"s12-second",species:"pikachu",level:80,side:"enemy"});
 c.exp.enemies.push(enemy2);
 c.user.pp=100;
 const own=c.user.hp,first=c.enemy.hp,second=enemy2.hp;
 const result=execute(w,c,"dazzling-gleam");
 assert.equal(result.failed,false);
 assert.ok(c.enemy.hp<first);assert.ok(enemy2.hp<second);
 assert.equal(c.user.hp,own);assert.equal(c.user.pp,0);
});
test("flinch is absent after immunity/miss, and original move PP and targeting still work",()=>{
 const {w,math}=boot();
 let c=team(w,{foe:"gastly"});c.exp.order=[c.user,c.enemy];c.exp.turnIndex=1;c.user.pp=100;
 execute(w,c,"headbutt");
 assert.equal(w.PokeBattleStatus.ensure(c.enemy).volatile.flinch,undefined);
 c=team(w);c.exp.order=[c.user,c.enemy];c.exp.turnIndex=1;c.user.pp=100;
 w.PokeBattleStatus.rank(c.user,"accuracy",-6);math.random=()=>.999;
 execute(w,c,"rolling-kick");
 assert.equal(w.PokeBattleStatus.ensure(c.enemy).volatile.flinch,undefined);
 const original=w.POKE_MOVES["giga-drain"];
 assert.equal(original.drain,.5);
 assert.equal(w.POKE_MOVES["recover"].healFraction,.5);
});
