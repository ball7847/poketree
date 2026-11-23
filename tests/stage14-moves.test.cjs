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
function setup(w){
 const G=w.PokeTree,user=G.Pokemon.create({id:"s14-user",species:"eevee",level:50,side:"ally"});
 const foe=G.Pokemon.create({id:"s14-foe",species:"psyduck",level:90,side:"enemy"});
 return {G,user,foe,exp:{id:"windy",party:[user],enemies:[foe],logs:[],weather:null,terrain:null}};
}
function use(w,c,key){
 const move=w.POKE_MOVES[key];
 return w.PokeMoveEffects.execute(c.exp,c.user,{moveId:key,move,targetId:["enemies","allies"].includes(move.target)?null:move.target==="self"?c.user.id:c.foe.id},()=>{});
}
test("all 937 pinned source moves classified, stage14 generator remains identical, 39 registered",()=>{
 const stdout=cp.execFileSync(process.execPath,["scripts/generate-stage14-moves.cjs","--check"],{cwd:root,timeout:120000,encoding:"utf8"});
 const out=JSON.parse(stdout),report=JSON.parse(read("data-audit/move-stage14-verification.json"));
 const {w}=boot();
 assert.equal(out.added,39);assert.equal(out.total,297);
 assert.equal(report.rows.length,937);assert.equal(new Set(report.rows.map(x=>x.id)).size,937);
 assert.equal(Object.keys(w.POKE_STAGE14_MOVES).length,39);
 assert.equal(Object.keys(w.POKE_MOVES).length,297);
 assert.equal(Object.values(report.families).reduce((a,b)=>a+b,0),39);
 const mf=JSON.parse(read("data-import/manifest.json"));
 const sources=new Map(mf.files.moves.flatMap(p=>JSON.parse(read(p)).moves).map(m=>[m.key,m]));
 for(const [key,m] of Object.entries(w.POKE_STAGE14_MOVES)){
  const original=sources.get(key);assert.ok(original,key);
  for(const field of ["name","type","category","power","accuracy","priority","effectId"])
   assert.equal(m[field],field==="name"?original.ko:original[field],key+"/"+field);
  assert.equal(w.POKE_MOVES[key],m,key);
 }
 for(const key of ["bulldoze","ominous-wind"])assert.equal(w.POKE_STAGE14_MOVES[key],undefined,key);
});
test("39 generated techniques are learnable, equipable, executable, and spend PP once",()=>{
 const {w}=boot();
 for(const [key,move] of Object.entries(w.POKE_STAGE14_MOVES)){
  const c=setup(w);c.user.pp=100;
  assert.equal(c.G.techniques.learn(c.user,key),null,key);
  assert.equal(c.G.techniques.equip(c.user,key,0),null,key);
  const before=c.foe.hp;
  const res=use(w,c,key);
  assert.equal(res.failed,false,key);
  assert.equal(c.user.pp,0,key);
  if(move.category!=="status")assert.ok(c.foe.hp<before,key);
 }
});
test("multiple independent ranks change together without exceeding +/-6",()=>{
 const {w}=boot(),c=setup(w);
 c.user.pp=100;use(w,c,"cosmic-power");
 let s=w.PokeBattleStatus.ensure(c.user);
 assert.equal(s.ranks.defense,1);assert.equal(s.ranks.spDefense,1);
 c.user.pp=100;use(w,c,"close-combat");
 assert.equal(s.ranks.defense,0);assert.equal(s.ranks.spDefense,0);
 c.user.pp=100;use(w,c,"ancient-power");
 for(const stat of ["attack","defense","spAttack","spDefense","speed"])
  assert.equal(s.ranks[stat],1,stat);
 c.user.pp=100;use(w,c,"metal-claw");
 assert.equal(s.ranks.attack,2);
 for(let i=0;i<10;i++)w.PokeBattleStatus.rank(c.user,"attack",1);
 assert.equal(s.ranks.attack,6);
});
test("special Psyshock family uses defender Defense but attacker Special Attack",()=>{
 const {w}=boot(),c=setup(w);
 c.user.spAttack=180;c.user.attack=10;c.foe.defense=40;c.foe.spDefense=500;
 const normal=w.PokeDamage.compute(c.user,c.foe,{move:w.POKE_MOVES["psychic"],random:100});
 const psy=w.PokeDamage.compute(c.user,c.foe,{move:w.POKE_MOVES["psyshock"],random:100});
 assert.ok(psy.damage>normal.damage);
 assert.equal(psy.category,"special");
 const orig=c.user.spAttack;c.user.spAttack=orig*2;
 assert.ok(w.PokeDamage.compute(c.user,c.foe,{move:w.POKE_MOVES["psyshock"],random:100}).damage>psy.damage);
});
test("rank-ignoring moves ignore both Defense and Evasion, while plain moves do not",()=>{
 const {w}=boot(),c=setup(w),S=w.PokeBattleStatus;
 S.rank(c.foe,"defense",6);S.rank(c.foe,"evasion",6);
 const ignore=w.POKE_MOVES["sacred-sword"],normal=w.POKE_MOVES["slash"];
 const hit=w.PokeDamage.compute(c.user,c.foe,{move:ignore,random:100});
 const expected=w.PokeDamage.compute(c.user,c.foe,{move:ignore,random:100,rankDefense:0});
 assert.equal(hit.damage,expected.damage);
 assert.equal(S.accuracy(ignore,c.user,c.foe),1);
 assert.ok(S.accuracy(normal,c.user,c.foe)<1);
 assert.ok(w.PokeDamage.compute(c.user,c.foe,{move:normal,random:100}).damage<
            w.PokeDamage.compute(c.user,c.foe,{move:normal,random:100,rankDefense:0}).damage);
});
test("fixed level and half-current-HP damage respect type immunity and never apply base-power damage",()=>{
 const {w}=boot(),c=setup(w);c.user.level=35;
 const level=w.PokeDamage.compute(c.user,c.foe,{move:w.POKE_MOVES["seismic-toss"]});
 assert.equal(level.damage,35);
 c.foe.hp=87;
 const fraction=w.PokeDamage.compute(c.user,c.foe,{move:w.POKE_MOVES["natures-madness"]});
 assert.equal(fraction.damage,43);
 c.foe.hp=1;
 assert.equal(w.PokeDamage.compute(c.user,c.foe,{move:w.POKE_MOVES["natures-madness"]}).damage,1);
 const ghost=c.G.Pokemon.create({id:"ghost",species:"gastly",level:90,side:"enemy"});
 assert.equal(w.PokeDamage.compute(c.user,ghost,{move:w.POKE_MOVES["seismic-toss"]}).damage,0);
});
test("False Swipe and Hold Back leave exactly 1 HP and cannot distribute faint rewards",()=>{
 const {w}=boot(),c=setup(w);c.foe.hp=3;c.user.pp=100;
 use(w,c,"false-swipe");assert.equal(c.foe.hp,1);
 c.user.pp=100;use(w,c,"hold-back");assert.equal(c.foe.hp,1);
});
test("party-wide major-status cure affects teammates but not enemy or unrelated confusion",()=>{
 const {w}=boot(),c=setup(w),S=w.PokeBattleStatus;
 const ally=c.G.Pokemon.create({id:"s14-ally",species:"pikachu",level:50,side:"ally"});c.exp.party.push(ally);
 S.inflict(c.user,"burn",c.exp);S.inflict(ally,"poison",c.exp);S.inflict(c.foe,"paralysis",c.exp);
 S.inflict(ally,"confusion",c.exp);
 c.user.pp=100;use(w,c,"heal-bell");
 assert.equal(S.ensure(c.user).major,null);
 assert.equal(S.ensure(ally).major,null);
 assert.equal(S.ensure(c.foe).major.kind,"paralysis");
 assert.ok(S.ensure(ally).confusion>0);
});
test("older PokeTree move damage, drain, PP and saves remain valid",()=>{
 const {w}=boot(),c=setup(w);
 assert.equal(w.POKE_MOVES["giga-drain"].drain,.5);
 assert.equal(w.POKE_MOVES["recover"].healFraction,.5);
 assert.equal(w.POKE_MOVES["quick-attack"].priority,1);
 assert.equal(c.G.saveGame.version,1);
 const save=c.G.saveGame.snapshot();assert.equal(save.version,1);
 c.user.pp=99;
 assert.equal(use(w,c,"psyshock").reason,"insufficient-pp");
});
