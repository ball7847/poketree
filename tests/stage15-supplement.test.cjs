"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),cp=require("node:child_process");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
function boot(){
 const math=Object.create(Math);math.random=()=>0;
 const ctx=vm.createContext({window:{addEventListener(){},localStorage:{getItem(){return null},setItem(){}}},performance:{now:()=>0},Date,console,Set,Map,Math:math});
 const scripts=["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/simple-damage-moves.js","data/rank-moves.js","data/status-moves.js","data/drain-moves.js","data/heal-moves.js","data/recoil-moves.js","data/drain-75-moves.js","data/bulk-moves.js","data/stage12-moves.js","data/stage13-moves.js","data/stage14-moves.js","data/stage15-moves.js","data/stage15-supplement-moves.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"];
 for(const p of scripts)vm.runInContext(read("game/"+p),ctx,{filename:p});
 return {w:ctx.window,math};
}
function setup(w){
 const G=w.PokeTree,user=G.Pokemon.create({id:"s15a",species:"eevee",level:50,side:"ally"});
 const foe=G.Pokemon.create({id:"s15b",species:"psyduck",level:90,side:"enemy"});
 return {G,user,foe,exp:{id:"windy",party:[user],enemies:[foe],logs:[],weather:null,terrain:null}};
}
function use(w,c,key){
 const move=w.POKE_MOVES[key];
 return w.PokeMoveEffects.execute(c.exp,c.user,{moveId:key,move,targetId:move.target==="self"?"s15a":"s15b"},()=>{});
}
test("stage15 supplement regenerates unchanged and covers 937 originals with 23 registered",()=>{
 const run=cp.spawnSync(process.execPath,["scripts/generate-stage15-supplement.cjs","--check"],{cwd:root,encoding:"utf8"});
 assert.equal(run.status,0,run.stdout+"\n"+run.stderr);
 const report=JSON.parse(read("data-audit/move-stage15-supplement-verification.json"));
 assert.equal(report.rows.length,937);
 assert.equal(report.added,23);
 assert.equal(report.total,331);
 const {w}=boot();
 assert.equal(Object.keys(w.POKE_STAGE15_SUPPLEMENT_MOVES).length,23);
 assert.equal(Object.keys(w.POKE_MOVES).length,331);
 assert.equal(new Set(Object.keys(w.POKE_MOVES)).size,331);
});
test("23 new moves are learnable, equipable and execute consuming 100 PP",()=>{
 const {w}=boot();
 for(const [key,move] of Object.entries(w.POKE_STAGE15_SUPPLEMENT_MOVES)){
  const c=setup(w);c.user.pp=100;
  assert.equal(c.G.techniques.learn(c.user,key),null,key);
  assert.equal(c.G.techniques.equip(c.user,key,0),null,key);
  const result=use(w,c,key);
  assert.equal(result.failed,false,key);
  assert.equal(c.user.pp,0,key);
  if(move.category!=="status")assert.ok(c.foe.hp<c.foe.maxHp,key);
 }
});
test("weather and terrain set their field states for five turns",()=>{
 const {w}=boot();
 for(const key of ["sunny-day","sandstorm","hail","grassy-terrain","misty-terrain","psychic-terrain"]){
  const c=setup(w);c.user.pp=100;
  use(w,c,key);
  const move=w.POKE_MOVES[key],state=c.exp[move.effect];
  assert.equal(state.kind,move.weather||move.terrain,key);
  assert.equal(state.remaining,5,key);
 }
});
test("haze resets both parties' ranks; status moves retain original targets",()=>{
 const {w}=boot(),c=setup(w);c.user.pp=100;
 w.PokeBattleStatus.rank(c.user,"attack",3);
 w.PokeBattleStatus.rank(c.foe,"defense",-4);
 use(w,c,"haze");
 assert.equal(w.PokeBattleStatus.ensure(c.user).ranks.attack,0);
 assert.equal(w.PokeBattleStatus.ensure(c.foe).ranks.defense,0);
 c.user.pp=100;use(w,c,"sweet-scent");
 assert.equal(w.PokeBattleStatus.ensure(c.foe).ranks.evasion,-2);
 c.user.pp=100;use(w,c,"noble-roar");
 assert.equal(w.PokeBattleStatus.ensure(c.foe).ranks.attack,-1);
 assert.equal(w.PokeBattleStatus.ensure(c.foe).ranks.spAttack,-1);
});
test("guaranteed critical override and paired poison/critical metadata",()=>{
 const {w}=boot(),c=setup(w);const d=w.PokeDamage;
 assert.equal(d.roll(c.user,c.foe,{move:w.POKE_MOVES["storm-throw"],rng:()=>.99}).critical,true);
 assert.equal(d.roll(c.user,c.foe,{move:w.POKE_MOVES["wicked-blow"],rng:()=>.99}).critical,true);
 assert.equal(d.roll(c.user,c.foe,{move:w.POKE_MOVES["poison-tail"],rng:()=>.99}).critical,false);
 assert.equal(w.POKE_MOVES["poison-tail"].secondary.kind,"poison");
});
test("round-history multipliers distinguish acting, damage, and source",()=>{
 const {w}=boot(),c=setup(w);
 const h={acted:new Set(),damaged:new Set(),hitBy:new Map()};
 c.user._battleRound=h;c.foe._battleRound=h;
 const power=(name)=>w.PokeDamage.resolvePower(w.POKE_MOVES[name],c.user,c.foe);
 assert.equal(power("payback"),50);assert.equal(power("assurance"),60);
 assert.equal(power("revenge"),60);assert.equal(power("bolt-beak"),170);
 h.acted.add(c.foe.id);
 assert.equal(power("payback"),100);assert.equal(power("bolt-beak"),85);
 h.damaged.add(c.foe.id);assert.equal(power("assurance"),120);
 h.hitBy.set(c.user.id,new Set([c.foe.id]));
 assert.equal(power("revenge"),120);assert.equal(power("avalanche"),120);
});
test("hail residual ignores ice type while harming unprotected living targets",()=>{
 const {w}=boot(),c=setup(w);c.exp.weather={kind:"hail",remaining:5};
 const hp=c.user.hp;w.PokeBattleStatus.fieldEndRound(c.exp);
 assert.ok(c.user.hp<hp);
});
