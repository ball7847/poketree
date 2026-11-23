"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),cp=require("node:child_process");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
function boot(roll=()=>0){
 const math=Object.create(Math);math.random=roll;
 const ctx=vm.createContext({window:{addEventListener(){},localStorage:{getItem(){return null},setItem(){}}},performance:{now:()=>0},Date,console,Set,Map,Math:math});
 const files=["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/simple-damage-moves.js","data/rank-moves.js","data/status-moves.js","data/drain-moves.js","data/heal-moves.js","data/recoil-moves.js","data/drain-75-moves.js","data/bulk-moves.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"];
 for(const file of files)vm.runInContext(read("game/"+file),ctx,{filename:file});
 return {w:ctx.window,math};
}
function source(){
 const mf=JSON.parse(read("data-import/manifest.json"));
 return new Map(mf.files.moves.flatMap(p=>JSON.parse(read(p)).moves).map(m=>[m.key,m]));
}
function setup(w){
 const G=w.PokeTree,user=G.Pokemon.create({id:"bulk-user",species:"eevee",level:30,side:"ally"});
 const foe=G.Pokemon.create({id:"bulk-foe",species:"rattata",level:80,side:"enemy"});
 return {G,user,foe,exp:{id:"windy",party:[user],enemies:[foe],logs:[],weather:null,terrain:null}};
}
function use(w,c,key,callback=()=>{}){return w.PokeMoveEffects.execute(c.exp,c.user,{moveId:key,move:w.POKE_MOVES[key],targetId:w.POKE_MOVES[key].target==="self"?c.user.id:c.foe.id},callback);}
test("rebuild 937 move effect families byte-for-byte; no dropped or invented registrations",()=>{
 const out=cp.execFileSync(process.execPath,["scripts/generate-move-families.cjs","--check"],{cwd:root,timeout:120000,encoding:"utf8"});
 const meta=JSON.parse(out);
 const report=JSON.parse(read("data-audit/move-effect-families.json"));
 const {w}=boot();
 assert.equal(meta.source,937);assert.equal(meta.effectIdGroups,453);
 assert.equal(meta.added,84);assert.equal(meta.after,158);
 assert.equal(report.rows.length,937);
 assert.equal(report.added,84);
 assert.equal(new Set(report.rows.map(x=>x.id)).size,937);
 assert.equal(Object.keys(w.POKE_BULK_MOVES).length,84);
 assert.equal(Object.keys(w.POKE_MOVES).length,158);
 assert.equal(report.rows.filter(x=>x.registered).length,84);
 const origins=source();
 for(const [key,move] of Object.entries(w.POKE_BULK_MOVES)){
  const original=origins.get(key);assert.ok(original,key);
  for(const field of ["type","category","power","accuracy","priority","effectId"]){
   assert.equal(move[field],original[field],key+"/"+field);
  }
  assert.equal(move.name,original.ko,key);
  assert.equal(w.POKE_MOVES[key],move,key);
 }
 for(const key of ["body-slam","scald","steam-eruption","pyro-ball","scorching-sands","stoked-sparksurfer","false-surrender"]){
  assert.equal(w.POKE_BULK_MOVES[key],undefined,key);
 }
});
test("every generated move can be learned, equipped and used with PP 100 and original effect family",()=>{
 const {w}=boot();
 for(const [key,move] of Object.entries(w.POKE_BULK_MOVES)){
  const c=setup(w),T=c.G.techniques;
  assert.equal(T.learn(c.user,key),null,key);
  assert.equal(T.equip(c.user,key,0),null,key);
  c.user.pp=100;
  if(move.effect==="heal")c.user.hp=Math.max(1,c.user.maxHp-15);
  const hp=c.user.hp,foeHp=c.foe.hp;
  const r=use(w,c,key);
  assert.equal(r.failed,false,key);
  assert.equal(c.user.pp,0,key);
  if(move.effect==="heal"){assert.ok(c.user.hp>hp,key);assert.equal(c.foe.hp,foeHp,key);}
  else{assert.ok(c.foe.hp<foeHp,key);if(move.effect==="recoil")assert.ok(c.user.hp<hp,key);}
  if(move.secondaryRank){
   const recipient=move.secondaryRank.target==="self"?c.user:c.foe;
   assert.equal(w.PokeBattleStatus.ensure(recipient).ranks[move.secondaryRank.stat],move.secondaryRank.stages,key);
  }
  if(move.secondary){
   const state=w.PokeBattleStatus.ensure(c.foe);
   if(move.secondary.kind==="confusion")assert.ok(state.confusion>0,key);
   else assert.equal(state.major?.kind,move.secondary.kind,key);
  }
 }
});
test("new rank-on-damage probability can fail; immunity and misses never apply stat drop",()=>{
 const {w,math}=boot();
 let c=setup(w);c.user.pp=100;
 math.random=()=>0.999;
 const before=w.PokeBattleStatus.ensure(c.foe).ranks.defense;
 use(w,c,"iron-tail");
 assert.equal(w.PokeBattleStatus.ensure(c.foe).ranks.defense,before);
 c=setup(w);c.user.pp=100;
 const h=c.foe.hp;
 w.PokeBattleStatus.rank(c.user,"accuracy",-6);
 use(w,c,"iron-tail");
 assert.equal(c.foe.hp,h);
 assert.equal(w.PokeBattleStatus.ensure(c.foe).ranks.defense,0);
 c=setup(w);c.user.pp=100;math.random=()=>0;
 c.foe=c.G.Pokemon.create({id:"immunity",species:"pidgey",level:80,side:"enemy"});
 c.exp.enemies=[c.foe];
 use(w,c,"mud-slap");
 assert.equal(w.PokeBattleStatus.ensure(c.foe).ranks.accuracy,0);
});
test("new status-on-damage never affects immune or missed targets and existing rules still govern",()=>{
 const {w,math}=boot();
 let c=setup(w);c.user.pp=100;math.random=()=>0.999;
 w.PokeBattleStatus.rank(c.user,"accuracy",-6);
 use(w,c,"fire-punch");
 assert.equal(w.PokeBattleStatus.ensure(c.foe).major,null);
 c=setup(w);c.foe=c.G.Pokemon.create({id:"immune",species:"charmander",level:80,side:"enemy"});
 c.exp.enemies=[c.foe];c.user.pp=100;math.random=()=>0;
 use(w,c,"fire-punch");
 assert.equal(w.PokeBattleStatus.ensure(c.foe).major,null);
 const original=w.POKE_MOVES["thunderbolt"];assert.equal(original.secondary.kind,"paralysis");
 assert.equal(w.POKE_MOVES["giga-drain"].drain,0.5);
});
