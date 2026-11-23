"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
function boot(roll=()=>0){
 const random=Object.create(Math);random.random=roll;
 const ctx=vm.createContext({window:{addEventListener(){},localStorage:{getItem(){return null},setItem(){}}},performance:{now:()=>0},Date,console,Set,Map,Math:random});
 const scripts=["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/simple-damage-moves.js","data/rank-moves.js","data/status-moves.js","data/drain-moves.js","data/heal-moves.js","data/recoil-moves.js","data/drain-75-moves.js","data/bulk-moves.js","data/stage12-moves.js","data/stage13-moves.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"];
 for(const p of scripts)vm.runInContext(read("game/"+p),ctx,{filename:p});
 return {w:ctx.window,random};
}
const IDs={"absorb":71,"mega-drain":72,"leech-life":141,"drain-punch":409,"horn-leech":532};
function battle(w,{userSpecies="bulbasaur",targetSpecies="rattata",level=45}={}){
 const G=w.PokeTree,user=G.Pokemon.create({id:"drainer",species:userSpecies,level,side:"ally"});
 const target=G.Pokemon.create({id:"victim",species:targetSpecies,level,side:"enemy"});
 const exp={id:"windy",party:[user],enemies:[target],logs:[],weather:null,terrain:null};
 return {G,user,target,exp};
}
function execute(w,c,key){
 c.user.pp=100;
 return w.PokeMoveEffects.execute(c.exp,c.user,{move:w.POKE_MOVES[key],targetId:c.target.id},()=>{});
}
test("five drain techniques exactly match pinned source metadata and registry count",()=>{
 const manifest=JSON.parse(read("data-import/manifest.json"));
 const original=new Map(manifest.files.moves.flatMap(f=>JSON.parse(read(f)).moves).map(m=>[m.key,m]));
 const {w}=boot();
 assert.equal(Object.keys(w.POKE_DRAIN_MOVES).length,5);
 assert.equal(Object.keys(w.POKE_MOVES).length,258);
 for(const [key,id] of Object.entries(IDs)){
  const source=original.get(key),move=w.POKE_DRAIN_MOVES[key];
  assert.ok(source&&move,key);
  assert.equal(source.id,id,key);assert.equal(source.effectId,4,key);
  assert.equal(source.meta.drain,50,key);
  assert.equal(source.target,"selected-pokemon",key);
  assert.equal(source.effectChance,null,key);
  assert.equal(source.meta.ailment_chance,0,key);
  assert.equal(source.meta.flinch_chance,0,key);
  assert.equal(source.meta.stat_chance,0,key);
  for(const field of ["name","type","category","power","accuracy","priority"]){
   assert.equal(move[field],field==="name"?source.ko:source[field],key+"/"+field);
  }
  assert.equal(move.target,"enemy",key);assert.equal(move.effect,"drain",key);assert.equal(move.drain,0.5,key);
  assert.equal(move.effectId,4,key);assert.equal(w.POKE_MOVES[key],move,key);
 }
 assert.equal(w.POKE_MOVES["giga-drain"].drain,0.5,"existing Giga Drain unchanged");
});
test("every new drain move is learnable, equippable, consumes PP 100, and heals half actual damage",()=>{
 const {w}=boot();
 for(const key of Object.keys(IDs)){
  const c=battle(w);
  const T=c.G.techniques;
  assert.equal(T.learn(c.user,key),null,key);
  assert.equal(T.equip(c.user,key,0),null,key);
  c.user.hp=Math.max(1,c.user.maxHp-120);
  const hpBefore=c.user.hp,enemyBefore=c.target.hp;
  assert.equal(execute(w,c,key).failed,false,key);
  const actual=enemyBefore-c.target.hp;
  assert.ok(actual>0,key);
  const expected=Math.min(c.user.maxHp-hpBefore,Math.max(1,Math.floor(actual/2)));
  assert.equal(c.user.hp-hpBefore,expected,key);
  assert.equal(c.user.pp,0,key);
  assert.ok(c.exp.logs.some(row=>row.message.includes("흡수")),key);
 }
});
test("healing clamps to missing HP and to opponent's actual remaining HP",()=>{
 const {w}=boot(),c=battle(w);
 c.user.hp=c.user.maxHp-1;
 const cap=c.user.maxHp;
 c.target.hp=3;
 const targetBefore=c.target.hp;
 assert.equal(execute(w,c,"leech-life").failed,false);
 assert.equal(targetBefore-c.target.hp,3);
 assert.equal(c.user.hp,cap,"healing cannot exceed max HP");
 assert.equal(c.user.pp,0);
 const d=battle(w);
 d.user.hp=d.user.maxHp-20;d.target.hp=3;
 execute(w,d,"leech-life");
 assert.equal(d.user.hp,d.user.maxHp-19,"floor 3/2 is 1");
});
test("zero-damage type immunity and a miss never heal, although PP is consumed",()=>{
 const {w,random}=boot(),immune=battle(w,{targetSpecies:"gastly"});
 immune.user.hp=immune.user.maxHp-20;
 const before=immune.user.hp;
 assert.equal(execute(w,immune,"drain-punch").failed,false);
 assert.equal(immune.target.hp,immune.target.maxHp);
 assert.equal(immune.user.hp,before);
 assert.equal(immune.user.pp,0);
 random.random=()=>0.999;
 const miss=battle(w),oldHP=miss.user.maxHp-15;
 w.PokeBattleStatus.rank(miss.user,"accuracy",-6);
 miss.user.hp=oldHP;
 const oldTarget=miss.target.hp;
 const result=execute(w,miss,"absorb");
 assert.equal(result.failed,false);
 assert.equal(miss.user.hp,oldHP);
 assert.equal(miss.target.hp,oldTarget);
 assert.equal(miss.user.pp,0);
});
test("already-full HP does not increase; existing Giga Drain uses same code path",()=>{
 const {w}=boot(),c=battle(w);
 const before=c.target.hp;
 assert.equal(execute(w,c,"absorb").failed,false);
 assert.ok(c.target.hp<before);
 assert.equal(c.user.hp,c.user.maxHp);
 const d=battle(w);
 d.user.hp=d.user.maxHp-50;
 const hp=d.user.hp,enemy=d.target.hp;
 assert.equal(execute(w,d,"giga-drain").failed,false);
 const actual=enemy-d.target.hp;
 assert.equal(d.user.hp-hp,Math.min(50,Math.max(1,Math.floor(actual*.5))));
});
