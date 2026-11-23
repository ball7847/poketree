"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const expected={
 "swords-dance":{id:14,effectId:51,target:"user",stat:"attack",stages:2},
 "iron-defense":{id:334,effectId:52,target:"user",stat:"defense",stages:2},
 "nasty-plot":{id:417,effectId:54,target:"user",stat:"spAttack",stages:2},
 "growl":{id:45,effectId:19,target:"all-opponents",stat:"attack",stages:-1},
 "tail-whip":{id:39,effectId:20,target:"all-opponents",stat:"defense",stages:-1},
 "screech":{id:103,effectId:60,target:"selected-pokemon",stat:"defense",stages:-2},
 "metal-sound":{id:319,effectId:63,target:"selected-pokemon",stat:"spDefense",stages:-2},
 "sand-attack":{id:28,effectId:24,target:"selected-pokemon",stat:"accuracy",stages:-1},
 "smokescreen":{id:108,effectId:24,target:"selected-pokemon",stat:"accuracy",stages:-1},
 "double-team":{id:104,effectId:17,target:"user",stat:"evasion",stages:1}
};
function boot(){
 const fakeMath=Object.create(Math);fakeMath.random=()=>0;
 const ctx=vm.createContext({window:{addEventListener(){},localStorage:{getItem(){return null},setItem(){}}},performance:{now:()=>0},Date,console,Set,Map,Math:fakeMath});
 const files=["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/simple-damage-moves.js","data/rank-moves.js","data/status-moves.js","data/drain-moves.js","data/heal-moves.js","data/recoil-moves.js","data/drain-75-moves.js","data/bulk-moves.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"];
 for(const file of files)vm.runInContext(read("game/"+file),ctx,{filename:file});
 return {w:ctx.window,math:fakeMath};
}
test("10 rank-only moves match pinned source stats and independently checked rank directions",()=>{
 const m=JSON.parse(read("data-import/manifest.json"));
 const originals=m.files.moves.flatMap(p=>JSON.parse(read(p)).moves);
 const byKey=new Map(originals.map(x=>[x.key,x]));
 const {w}=boot();
 assert.equal(Object.keys(w.POKE_RANK_MOVES).length,10);
 assert.equal(Object.keys(w.POKE_MOVES).length,158);
 for(const [key,rule] of Object.entries(expected)){
  const src=byKey.get(key),actual=w.POKE_RANK_MOVES[key];
  assert.ok(src&&actual,key);
  assert.equal(src.id,rule.id,key);
  assert.equal(src.effectId,rule.effectId,key);
  assert.equal(src.target,rule.target,key);
  assert.equal(src.category,"status",key);
  assert.equal(src.power,null,key);
  assert.equal(actual.name,src.ko,key);
  assert.equal(actual.type,src.type,key);
  assert.equal(actual.accuracy,src.accuracy,key);
  assert.equal(actual.priority,src.priority,key);
  assert.equal(actual.effectId,rule.effectId,key);
  assert.equal(actual.effect,"rank",key);
  assert.equal(actual.rank.stat,rule.stat,key);
  assert.equal(actual.rank.stages,rule.stages,key);
  assert.equal(actual.target,rule.target==="user"?"self":rule.target==="all-opponents"?"enemies":"enemy",key);
  assert.equal(w.POKE_MOVES[key],actual,key);
 }
 assert.equal(w.POKE_MOVES.agility.rank.stages,2,"pre-existing agility unchanged");
});
test("all ten execute only their correct self, single-foe, or spread rank effects",()=>{
 const {w}=boot(),G=w.PokeTree,T=G.techniques,S=w.PokeBattleStatus,user=G.state.roster[0];
 const enemies=[G.Pokemon.create({id:"enemy-one",species:"rattata",level:5,side:"enemy"}),
  G.Pokemon.create({id:"enemy-two",species:"pidgey",level:5,side:"enemy"})];
 const exp={id:"windy",party:[user],enemies,weather:null,terrain:null,logs:[]};
 for(const [key,rule] of Object.entries(expected)){
  for(const u of [user,...enemies])u.battleStatus=S.create();
  const move=w.POKE_MOVES[key];
  assert.equal(T.learn(user,key),null);
  assert.equal(T.equip(user,key,0),null);
  user.pp=100;
  const health=[user,...enemies].map(u=>u.hp);
  const targeted=move.target==="self"?[user]:move.target==="enemies"?enemies:[enemies[0]];
  const planned=w.PokeTargeting.selectTarget(exp,user,{moveId:key,move});
  assert.ok(planned,key);
  assert.equal(w.PokeMoveEffects.execute(exp,user,planned,()=>{}).failed,false,key);
  assert.equal(user.pp,0,key);
  for(const u of [user,...enemies]){
   const actual=u.battleStatus.ranks[rule.stat];
   assert.equal(actual,targeted.includes(u)?rule.stages:0,key+"/"+u.id);
  }
  assert.deepEqual([user,...enemies].map(u=>u.hp),health,key+"/HP");
 }
});
test("rank caps, damage, speed, accuracy and existing agility remain governed by unchanged engine",()=>{
 const {w,math}=boot(),G=w.PokeTree,S=w.PokeBattleStatus,user=G.state.roster[0];
 const target=G.Pokemon.create({id:"foe",species:"rattata",level:5,side:"enemy"});
 const exp={id:"windy",party:[user],enemies:[target],weather:null,terrain:null,logs:[]};
 const attack=w.POKE_MOVES.tackle;
 const dmgBefore=G.Damage.compute(user,target,{move:attack,critical:false,random:100}).damage;
 S.rank(user,"attack",2);
 assert.equal(user.battleStatus.ranks.attack,2);
 const dmgAfter=G.Damage.compute(user,target,{move:attack,critical:false,random:100}).damage;
 assert.ok(dmgAfter>dmgBefore,"higher attack rank increases damage");
 S.rank(user,"attack",10);assert.equal(user.battleStatus.ranks.attack,6);
 S.rank(target,"defense",-10);assert.equal(target.battleStatus.ranks.defense,-6);
 S.rank(target,"defense",-2);assert.equal(target.battleStatus.ranks.defense,-6);
 const speedBefore=S.speed(user);
 user.pp=100;w.PokeMoveEffects.execute(exp,user,{move:w.POKE_MOVES.agility,targetId:user.id},()=>{});
 assert.equal(user.battleStatus.ranks.speed,2);
 assert.ok(S.speed(user)>speedBefore);
 assert.equal(user.pp,0);
 const check={accuracy:100};const baseline=S.accuracy(check,user,target);
 S.rank(user,"accuracy",-1);assert.ok(S.accuracy(check,user,target)<baseline);
 S.rank(target,"evasion",1);assert.ok(S.accuracy(check,user,target)<baseline);
 math.random=()=>0.99;
 const move=w.POKE_MOVES.screech;
 const old=target.battleStatus.ranks.defense;user.pp=100;
 w.PokeMoveEffects.execute(exp,user,{move,targetId:target.id},()=>{});
 assert.equal(target.battleStatus.ranks.defense,old,"inaccurate rank move must miss");
 assert.equal(user.pp,0,"miss still pays the PP cost");
});
