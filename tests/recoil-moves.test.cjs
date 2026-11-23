"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const specs={
 "take-down":{id:36,effectId:49,ratio:1/4,meta:-25},
 "submission":{id:66,effectId:49,ratio:1/4,meta:-25},
 "wild-charge":{id:528,effectId:49,ratio:1/4,meta:-25},
 "brave-bird":{id:413,effectId:199,ratio:1/3,meta:-33},
 "wood-hammer":{id:452,effectId:199,ratio:1/3,meta:-33}
};
function boot(roll=()=>0){
 const random=Object.create(Math);random.random=roll;
 const ctx=vm.createContext({window:{addEventListener(){},localStorage:{getItem(){return null},setItem(){}}},performance:{now:()=>0},Date,console,Set,Map,Math:random});
 const scripts=["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/simple-damage-moves.js","data/rank-moves.js","data/status-moves.js","data/drain-moves.js","data/heal-moves.js","data/recoil-moves.js","data/drain-75-moves.js","data/bulk-moves.js","data/stage12-moves.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"];
 for(const p of scripts)vm.runInContext(read("game/"+p),ctx,{filename:p});
 return {w:ctx.window,random};
}
function battle(w,{attacker="pikachu",defender="rattata",level=40}={}){
 const G=w.PokeTree,user=G.Pokemon.create({id:"recoil-user",species:attacker,level,side:"ally"});
 const enemy=G.Pokemon.create({id:"recoil-target",species:defender,level,side:"enemy"});
 return {G,user,enemy,exp:{id:"windy",party:[user],enemies:[enemy],logs:[],weather:null,terrain:null}};
}
function use(w,c,key,faint=()=>{}){
 return w.PokeMoveEffects.execute(c.exp,c.user,{moveId:key,move:w.POKE_MOVES[key],targetId:c.enemy.id},faint);
}
test("five new recoil moves match the pinned original 937-move snapshot and total 61",()=>{
 const manifest=JSON.parse(read("data-import/manifest.json"));
 const originals=new Map(manifest.files.moves.flatMap(f=>JSON.parse(read(f)).moves).map(m=>[m.key,m]));
 const {w}=boot();
 assert.equal(Object.keys(w.POKE_RECOIL_MOVES).length,5);
 assert.equal(Object.keys(w.POKE_MOVES).length,217);
 for(const [key,e] of Object.entries(specs)){
  const source=originals.get(key),move=w.POKE_MOVES[key];
  assert.ok(source&&move,key);
  assert.equal(source.id,e.id,key);assert.equal(source.effectId,e.effectId,key);
  assert.equal(source.meta.drain,e.meta,key);
  assert.equal(source.effectChance,null,key);
  assert.equal(source.target,"selected-pokemon",key);
  assert.equal(source.meta.ailment_chance,0,key);
  assert.equal(source.meta.flinch_chance,0,key);
  assert.equal(source.meta.stat_chance,0,key);
  for(const p of ["type","category","power","accuracy","priority"])assert.equal(move[p],source[p],key+"/"+p);
  assert.equal(move.name,source.ko,key);
  assert.equal(move.target,"enemy",key);assert.equal(move.effect,"recoil",key);
  assert.equal(move.recoil,e.ratio,key);assert.equal(move.effectId,e.effectId,key);
  assert.equal(move.secondary,undefined,key);
 }
 assert.equal(w.POKE_MOVES["flare-blitz"].recoil,1/3,"existing recoil unchanged");
});
test("all five learn/equip/execute, deal actual damage and recoil exactly 1/4 or 1/3, PP 100",()=>{
 const {w}=boot();
 for(const [key,e] of Object.entries(specs)){
  const c=battle(w);c.user.pp=100;c.user.hp=c.user.maxHp;
  assert.equal(c.G.techniques.learn(c.user,key),null,key);
  assert.equal(c.G.techniques.equip(c.user,key,0),null,key);
  const before=c.enemy.hp,ownBefore=c.user.hp;
  assert.equal(use(w,c,key).failed,false,key);
  const actual=before-c.enemy.hp;
  assert.ok(actual>0,key);
  const recoil=Math.max(1,Math.floor(actual*e.ratio));
  assert.equal(ownBefore-c.user.hp,recoil,key);
  assert.equal(c.user.pp,0,key);
 }
});
test("recoil uses actually removed HP when foe only has 3 HP and enforces minimum 1 recoil",()=>{
 const {w}=boot();
 for(const key of Object.keys(specs)){
  const c=battle(w);c.enemy.hp=3;c.user.pp=100;
  let enemyFaints=0;
  const hp=c.user.hp;
  const result=use(w,c,key,(target,flag)=>{if(flag&&target===c.enemy)enemyFaints++;});
  assert.equal(result.failed,false,key);
  assert.equal(c.enemy.hp,0,key);
  assert.equal(hp-c.user.hp,1,key);
  assert.equal(enemyFaints,1,key);
 }
});
test("miss and type immunity deal zero and cause no recoil even though PP is spent",()=>{
 const {w,random}=boot();
 const miss=battle(w);miss.user.pp=100;
 const original=miss.user.hp,targetBefore=miss.enemy.hp;
 random.random=()=>0.99;
 use(w,miss,"take-down");
 assert.equal(miss.enemy.hp,targetBefore);
 assert.equal(miss.user.hp,original);
 assert.equal(miss.user.pp,0);
 random.random=()=>0;
 const immune=battle(w,{defender:"gastly"});immune.user.pp=100;
 const userHP=immune.user.hp,enemyHP=immune.enemy.hp;
 use(w,immune,"submission");
 assert.equal(immune.enemy.hp,enemyHP);
 assert.equal(immune.user.hp,userHP);
 assert.equal(immune.user.pp,0);
});
test("a recoil KO calls self faint before foe faint; existing flare-blitz remains functional",()=>{
 const {w}=boot(),c=battle(w);
 c.enemy.hp=2;c.user.hp=1;c.user.pp=100;
 const faint=[];
 assert.equal(use(w,c,"wood-hammer",(unit,enemy)=>faint.push({unit,enemy})).failed,false);
 assert.equal(c.user.hp,0);
 assert.equal(c.enemy.hp,0);
 assert.equal(faint.length,2);
 assert.equal(faint[0].unit,c.user);assert.equal(faint[0].enemy,false);
 assert.equal(faint[1].unit,c.enemy);assert.equal(faint[1].enemy,true);
 const other=battle(w);other.user.pp=100;const before=other.user.hp;
 use(w,other,"flare-blitz");
 assert.ok(other.user.hp<before);
});
test("invalid area recoil and insufficient PP still reject without changing HP",()=>{
 const {w}=boot(),c=battle(w);c.user.pp=99;
 const before=c.enemy.hp,userHP=c.user.hp;
 const res=use(w,c,"brave-bird");
 assert.equal(res.failed,true);assert.equal(res.reason,"insufficient-pp");
 assert.equal(c.enemy.hp,before);assert.equal(c.user.hp,userHP);assert.equal(c.user.pp,99);
 assert.throws(()=>w.PokeMoveEffects.execute(c.exp,c.user,{move:{...w.POKE_MOVES["brave-bird"],target:"enemies"},targetId:c.enemy.id},()=>{}),/단일 적/);
});
