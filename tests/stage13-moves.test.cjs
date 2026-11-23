"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),cp=require("node:child_process");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
function boot(){
 const math=Object.create(Math);math.random=()=>0;
 const ctx=vm.createContext({window:{addEventListener(){},localStorage:{getItem(){return null},setItem(){}}},performance:{now:()=>0},Date,console,Set,Map,Math:math});
 const scripts=["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/simple-damage-moves.js","data/rank-moves.js","data/status-moves.js","data/drain-moves.js","data/heal-moves.js","data/recoil-moves.js","data/drain-75-moves.js","data/bulk-moves.js","data/stage12-moves.js","data/stage13-moves.js","data/stage14-moves.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"];
 for(const p of scripts)vm.runInContext(read("game/"+p),ctx,{filename:p});
 return {w:ctx.window,math};
}
function setup(w,enemySpecies="psyduck"){
 const G=w.PokeTree,user=G.Pokemon.create({id:"s13-user",species:"eevee",level:50,side:"ally"});
 const foe=G.Pokemon.create({id:"s13-foe",species:enemySpecies,level:80,side:"enemy"});
 return {G,user,foe,exp:{id:"windy",party:[user],enemies:[foe],logs:[],weather:null,terrain:null}};
}
function run(w,c,key){const move=w.POKE_MOVES[key];return w.PokeMoveEffects.execute(c.exp,c.user,{moveId:key,move,targetId:["enemies","allies"].includes(move.target)?null:move.target==="self"?c.user.id:c.foe.id},()=>{});}
test("13th family generator and pinned 937-row audit are stable, without duplicates or omissions",()=>{
 const raw=cp.execFileSync(process.execPath,["scripts/generate-stage13-moves.cjs","--check"],{cwd:root,timeout:120000,encoding:"utf8"});
 const meta=JSON.parse(raw),report=JSON.parse(read("data-audit/move-stage13-verification.json")), {w}=boot();
 assert.equal(meta.added,41);assert.equal(meta.total,258);
 assert.equal(report.sourceCount,937);assert.equal(report.added,41);assert.equal(report.total,258);
 assert.equal(Object.keys(w.POKE_STAGE13_MOVES).length,41);
 assert.equal(Object.keys(w.POKE_MOVES).length,297);
 assert.equal(report.families["sleep-status"],5);assert.equal(report.families["confusion-status"],2);
 assert.equal(report.families["rank"],14);assert.equal(report.families["weather-heal"],3);
 assert.equal(report.families["recharge"],8);assert.equal(report.families["binding"],9);
 const mf=JSON.parse(read("data-import/manifest.json"));
 const orig=new Map(mf.files.moves.flatMap(p=>JSON.parse(read(p)).moves).map(m=>[m.key,m]));
 for(const [key,m] of Object.entries(w.POKE_STAGE13_MOVES)){
  const source=orig.get(key);assert.ok(source,key);
  for(const field of ["name","type","category","power","accuracy","priority","effectId"])
   assert.equal(m[field],field==="name"?source.ko:source[field],key+"/"+field);
  assert.equal(w.POKE_MOVES[key],m,key);
 }
 for(const key of ["dark-void","meteor-assault","eternabeam","shadow-panic"])
  assert.equal(w.POKE_STAGE13_MOVES[key],undefined,key);
});
test("each of 41 registered moves can be learned, equipped, executed and spends exactly 100 PP",()=>{
 const {w}=boot();
 for(const [key,move] of Object.entries(w.POKE_STAGE13_MOVES)){
  const c=setup(w);
  assert.equal(c.G.techniques.learn(c.user,key),null,key);
  assert.equal(c.G.techniques.equip(c.user,key,0),null,key);
  c.user.pp=100;
  if(move.effect==="heal")c.user.hp=Math.max(1,c.user.maxHp-70);
  const own=c.user.hp,before=c.foe.hp;
  const result=run(w,c,key);
  assert.equal(result.failed,false,key);
  assert.equal(c.user.pp,0,key);
  if(move.effect==="heal")assert.ok(c.user.hp>own,key);
  if(["recharge","bind"].includes(move.effect))assert.ok(c.foe.hp<before,key);
  if(move.effect==="rank"){
   const affected=move.target==="self"||move.target==="allies"?c.user:c.foe;
   assert.equal(w.PokeBattleStatus.ensure(affected).ranks[move.rank.stat],move.rank.stages,key);
  }
  if(move.effect==="status"){
   const s=w.PokeBattleStatus.ensure(c.foe);
   if(move.status==="sleep")assert.equal(s.major.kind,"sleep",key);
   else assert.ok(s.confusion>0,key);
  }
 }
});
test("powder sleep cannot affect Grass targets; other sleep and confusion use existing status constraints",()=>{
 const {w}=boot();let c=setup(w,"bulbasaur");c.user.pp=100;
 assert.equal(run(w,c,"sleep-powder").failed,false);
 assert.equal(w.PokeBattleStatus.ensure(c.foe).major,null);
 c=setup(w,"bulbasaur");c.user.pp=100;assert.equal(run(w,c,"sing").failed,false);
 assert.equal(w.PokeBattleStatus.ensure(c.foe).major.kind,"sleep");
 c=setup(w);c.exp.terrain={kind:"electric",remaining:5};c.user.pp=100;
 run(w,c,"spore");assert.equal(w.PokeBattleStatus.ensure(c.foe).major,null);
 c=setup(w);c.user.pp=99;const hp=c.foe.hp;
 assert.equal(run(w,c,"sing").reason,"insufficient-pp");assert.equal(c.foe.hp,hp);
});
test("weather-dependent healing respects clear, sun, rain, snow and sandstorm without altering standard Recover",()=>{
 const {w}=boot(),move=w.POKE_MOVES["synthesis"],regular=w.POKE_MOVES["recover"],c=setup(w);
 const amount=(weather)=>w.PokeMoveEffects.healAmount(c.user,c.user,false,move,weather?{kind:weather}:null);
 assert.equal(amount(null),Math.max(1,Math.floor(c.user.maxHp/2)));
 assert.equal(amount("sun"),Math.max(1,Math.floor(c.user.maxHp*2/3)));
 for(const kind of ["rain","snow","sandstorm"])
  assert.equal(amount(kind),Math.max(1,Math.floor(c.user.maxHp/4)),kind);
 assert.equal(w.PokeMoveEffects.healAmount(c.user,c.user,false,regular),Math.max(1,Math.floor(c.user.maxHp/2)));
 c.user.hp=1;c.user.pp=100;c.exp.weather={kind:"sun",remaining:2};
 const before=c.user.hp;run(w,c,"synthesis");
 assert.equal(c.user.hp-before,Math.min(c.user.maxHp-before,Math.max(1,Math.floor(c.user.maxHp*2/3))));
});
test("recharge skips precisely next pending personal action, clears after battle and is absent on misses",()=>{
 const {w,math}=boot();let c=setup(w);c.user.pp=100;
 run(w,c,"hyper-beam");
 assert.equal(w.PokeBattleStatus.ensure(c.user).volatile.recharge,true);
 assert.match(w.PokeBattleStatus.beforeAction(c.user),/재충전/);
 assert.equal(w.PokeBattleStatus.beforeAction(c.user),null);
 c=setup(w);c.user.pp=100;w.PokeBattleStatus.rank(c.user,"accuracy",-6);math.random=()=>.999;
 run(w,c,"hyper-beam");assert.equal(w.PokeBattleStatus.ensure(c.user).volatile.recharge,undefined);
 c=setup(w);c.user.pp=100;math.random=()=>0;run(w,c,"hyper-beam");
 w.PokeBattleStatus.endBattle(c.user);
 assert.equal(w.PokeBattleStatus.ensure(c.user).volatile.recharge,undefined);
});
test("binding is a separate per-target volatile condition, deals end-of-round damage and expires",()=>{
 const {w,math}=boot(),c=setup(w);
 c.user.pp=100;run(w,c,"wrap");
 const binding=w.PokeBattleStatus.ensure(c.foe).volatile.binding;
 assert.ok(binding);assert.equal(binding.sourceId,c.user.id);assert.ok(binding.remaining>=4&&binding.remaining<=5);
 let rounds=0;
 while(w.PokeBattleStatus.ensure(c.foe).volatile.binding&&rounds<5){
  const before=c.foe.hp;
  const damage=w.PokeBattleStatus.bindingAfterRound(c.foe,c.exp);
  assert.equal(damage,Math.min(before,Math.max(1,Math.floor(c.foe.maxHp/8))));
  rounds++;
 }
 assert.equal(rounds,4);
 assert.equal(w.PokeBattleStatus.ensure(c.foe).volatile.binding,undefined);
 c.user.pp=100;run(w,c,"wrap");
 c.user.hp=0;assert.equal(w.PokeBattleStatus.bindingAfterRound(c.foe,c.exp),0);
 assert.equal(w.PokeBattleStatus.ensure(c.foe).volatile.binding,undefined);
 c.user.hp=1;c.user.pp=100;run(w,c,"wrap");
 w.PokeBattleStatus.endBattle(c.foe);
 assert.equal(w.PokeBattleStatus.ensure(c.foe).volatile.binding,undefined);
});
test("allies-wide Howl boosts allies, and existing PP, rank caps and faint handling remain intact",()=>{
 const {w}=boot(),c=setup(w);
 const ally=c.G.Pokemon.create({id:"s13-ally",species:"pikachu",level:30,side:"ally"});
 c.exp.party.push(ally);c.user.pp=100;
 run(w,c,"howl");
 assert.equal(w.PokeBattleStatus.ensure(c.user).ranks.attack,1);
 assert.equal(w.PokeBattleStatus.ensure(ally).ranks.attack,1);
 assert.equal(w.PokeBattleStatus.ensure(c.foe).ranks.attack,0);
 assert.equal(w.POKE_MOVES["giga-drain"].drain,.5);
 assert.equal(w.POKE_MOVES["recover"].healFraction,.5);
});
