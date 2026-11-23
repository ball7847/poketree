"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const ids={"draining-kiss":577,"oblivion-wing":613};
function boot(roll=()=>0){
 const m=Object.create(Math);m.random=roll;
 const ctx=vm.createContext({window:{addEventListener(){},localStorage:{getItem(){return null},setItem(){}}},performance:{now:()=>0},Date,console,Set,Map,Math:m});
 const scripts=["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/simple-damage-moves.js","data/rank-moves.js","data/status-moves.js","data/drain-moves.js","data/heal-moves.js","data/recoil-moves.js","data/drain-75-moves.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"];
 for(const p of scripts)vm.runInContext(read("game/"+p),ctx,{filename:p});
 return {w:ctx.window,m};
}
function setup(w){
 const G=w.PokeTree,user=G.Pokemon.create({id:"drain-user",species:"eevee",level:45,side:"ally"}),foe=G.Pokemon.create({id:"drain-foe",species:"rattata",level:45,side:"enemy"});
 return {G,user,foe,exp:{id:"windy",party:[user],enemies:[foe],logs:[],weather:null,terrain:null}};
}
function apply(w,c,key){return w.PokeMoveEffects.execute(c.exp,c.user,{moveId:key,move:w.POKE_MOVES[key],targetId:c.foe.id},()=>{});}
test("two 75%-drain attacks match pinned source metadata without changing 50%-drain moves",()=>{
 const manifest=JSON.parse(read("data-import/manifest.json"));
 const originals=new Map(manifest.files.moves.flatMap(p=>JSON.parse(read(p)).moves).map(m=>[m.key,m]));
 const {w}=boot();
 assert.equal(Object.keys(w.POKE_DRAIN_75_MOVES).length,2);
 assert.equal(Object.keys(w.POKE_MOVES).length,74);
 for(const [key,id] of Object.entries(ids)){
  const source=originals.get(key),move=w.POKE_DRAIN_75_MOVES[key];
  assert.ok(source&&move,key);
  assert.equal(source.id,id,key);
  assert.equal(source.effectId,349,key);
  assert.equal(source.meta.drain,75,key);
  assert.equal(source.target,"selected-pokemon",key);
  assert.equal(source.category,"special",key);
  assert.equal(source.accuracy,100,key);
  assert.equal(source.priority,0,key);
  assert.equal(source.effectChance,null,key);
  assert.equal(source.meta.ailment_chance,0,key);
  assert.equal(source.meta.flinch_chance,0,key);
  assert.equal(source.meta.stat_chance,0,key);
  for(const field of ["type","category","power","accuracy","priority"]){assert.equal(move[field],source[field],key+"/"+field);}
  assert.equal(move.name,source.ko,key);
  assert.equal(move.target,"enemy",key);
  assert.equal(move.effect,"drain",key);
  assert.equal(move.drain,0.75,key);
  assert.equal(move.effectId,349,key);
  assert.equal(w.POKE_MOVES[key],move,key);
 }
 assert.equal(w.POKE_MOVES["giga-drain"].drain,0.5);
 for(const x of Object.values(w.POKE_DRAIN_MOVES))assert.equal(x.drain,0.5);
});
test("both 75%-drain moves learn, equip, hit, recover actual damage * 0.75 and use PP 100",()=>{
 const {w}=boot();
 for(const key of Object.keys(ids)){
  const c=setup(w);
  assert.equal(c.G.techniques.learn(c.user,key),null,key);
  assert.equal(c.G.techniques.equip(c.user,key,0),null,key);
  c.user.hp=Math.max(1,c.user.maxHp-120);c.user.pp=100;
  const beforeHP=c.user.hp,beforeFoe=c.foe.hp;
  const result=apply(w,c,key);
  assert.equal(result.failed,false,key);
  const actual=beforeFoe-c.foe.hp;
  assert.ok(actual>0,key);
  assert.equal(c.user.hp-beforeHP,Math.min(c.user.maxHp-beforeHP,Math.max(1,Math.floor(actual*.75))),key);
  assert.equal(c.user.pp,0,key);
  assert.ok(c.exp.logs.some(x=>x.message.includes("흡수")),key);
 }
});
test("75% recovery clamps at missing HP and at foe's actual remaining HP",()=>{
 const {w}=boot();
 for(const key of Object.keys(ids)){
  const small=setup(w);small.user.hp=small.user.maxHp-100;small.foe.hp=3;small.user.pp=100;
  const hp=small.user.hp;
  assert.equal(apply(w,small,key).failed,false,key);
  assert.equal(small.foe.hp,0,key);
  assert.equal(small.user.hp-hp,2,key+"/floor(3*0.75)");
  const capped=setup(w);capped.user.hp=capped.user.maxHp-1;capped.user.pp=100;
  assert.equal(apply(w,capped,key).failed,false,key);
  assert.equal(capped.user.hp,capped.user.maxHp,key);
  const full=setup(w);full.user.pp=100;
  assert.equal(apply(w,full,key).failed,false,key);
  assert.equal(full.user.hp,full.user.maxHp,key);
 }
});
test("accuracy miss yields no damage or healing but still spends 100 PP",()=>{
 const {w,m}=boot();
 for(const key of Object.keys(ids)){
  const c=setup(w);c.user.hp=c.user.maxHp-40;c.user.pp=100;
  w.PokeBattleStatus.rank(c.user,"accuracy",-6);
  m.random=()=>0.999;
  const hp=c.user.hp,foe=c.foe.hp;
  assert.equal(apply(w,c,key).failed,false,key);
  assert.equal(c.user.hp,hp,key);
  assert.equal(c.foe.hp,foe,key);
  assert.equal(c.user.pp,0,key);
  m.random=()=>0;
 }
});
test("insufficient PP blocks both moves; existing 50%-drain behavior remains intact",()=>{
 const {w}=boot(),c=setup(w);c.user.hp=c.user.maxHp-50;c.user.pp=99;
 const hp=c.user.hp,foe=c.foe.hp;
 const result=apply(w,c,"draining-kiss");
 assert.equal(result.failed,true);assert.equal(result.reason,"insufficient-pp");
 assert.equal(c.user.hp,hp);assert.equal(c.foe.hp,foe);assert.equal(c.user.pp,99);
 const old=setup(w);old.user.hp=old.user.maxHp-100;old.user.pp=100;
 const start=old.user.hp,enemy=old.foe.hp;
 assert.equal(apply(w,old,"giga-drain").failed,false);
 const actual=enemy-old.foe.hp;
 assert.equal(old.user.hp-start,Math.min(old.user.maxHp-start,Math.max(1,Math.floor(actual*.5))));
});
