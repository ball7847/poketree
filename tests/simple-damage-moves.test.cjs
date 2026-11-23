"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),cp=require("node:child_process");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
function load(){
 const context=vm.createContext({window:{addEventListener(){},localStorage:{getItem(){return null},setItem(){}}},performance:{now:()=>0},Date,console,Set,Map,Math});
 const scripts=["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/simple-damage-moves.js","data/rank-moves.js","data/status-moves.js","data/drain-moves.js","data/heal-moves.js","data/recoil-moves.js","data/drain-75-moves.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"];
 for(const name of scripts)vm.runInContext(read("game/"+name),context,{filename:name});
 return context.window;
}
test("937 effect classifications and 20 pinned ordinary damage moves reproduce exactly",()=>{
 cp.execFileSync(process.execPath,["scripts/classify-move-effects.cjs","--check"],{cwd:root,timeout:120000});
 const report=JSON.parse(read("data-audit/move-effects-classification.json"));
 assert.equal(report.entries.length,937);
 assert.equal(Object.values(report.categories).reduce((a,b)=>a+b,0),937);
 assert.equal(report.selectedIds.length,20);
 const w=load();
 assert.equal(Object.keys(w.POKE_SIMPLE_DAMAGE_MOVES).length,20);
 assert.equal(Object.keys(w.POKE_MOVES).length,63);
 for(const [id,m] of Object.entries(w.POKE_SIMPLE_DAMAGE_MOVES)){
  assert.ok(w.POKE_IMPORTED_TECHNIQUES.moves[id]);
  assert.equal(m.effect,"damage");
  assert.equal(m.effectId,1);
  assert.equal(m.target,"enemy");
  assert.ok(m.power>0&&m.accuracy>0);
 }
});
test("new source-backed Tackle can be learned, equipped, and deal damage without changing PP rules",()=>{
 const w=load(),G=w.PokeTree,T=G.techniques;
 const u=G.state.roster[0];
 assert.equal(T.learn(u,"tackle"),null);
 assert.equal(T.equip(u,"tackle",0),null);
 const enemy=G.Pokemon.create({id:"test-target",species:"rattata",level:5,side:"enemy"});
 const exp={id:"windy",party:[u],enemies:[enemy],logs:[],weather:null,terrain:null};
 u.pp=100;
 const before=enemy.hp;
 const result=w.PokeMoveEffects.execute(exp,u,{move:w.POKE_MOVES.tackle,targetId:enemy.id},()=>{});
 assert.equal(result.failed,false);
 assert.equal(u.pp,0);
 assert.ok(enemy.hp<before);
 assert.ok(exp.logs.some(line=>line.message.includes("몸통박치기")));
});
test("unknown special-effect move remains learned-only and is not upgraded to a simple attack",()=>{
 const w=load(),G=w.PokeTree,T=G.techniques,u=G.state.roster[0];
 const key="solar-beam";
 assert.ok(w.POKE_IMPORTED_TECHNIQUES.moves[key]);
 assert.equal(w.POKE_MOVES[key],undefined);
 assert.equal(T.learn(u,key),null);
 assert.match(T.equip(u,key,0),/전투 효과가 구현되지 않은/);
});
