"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
function boot(random=()=>0){
 const m=Object.create(Math);m.random=random;
 const ctx=vm.createContext({window:{addEventListener(){},localStorage:{getItem(){return null},setItem(){}}},performance:{now:()=>0},Date,console,Set,Map,Math:m});
 const files=["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/simple-damage-moves.js","data/rank-moves.js","data/status-moves.js","data/drain-moves.js","data/heal-moves.js","data/recoil-moves.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"];
 for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,"game",f),"utf8"),ctx,{filename:f});
 return {w:ctx.window,m};
}
const specs={
 "will-o-wisp":{id:261,effectId:168,accuracy:85,status:"burn",type:"fire"},
 "toxic":{id:92,effectId:34,accuracy:90,status:"toxic",type:"poison"},
 "hypnosis":{id:95,effectId:2,accuracy:60,status:"sleep",type:"psychic"},
 "confuse-ray":{id:109,effectId:50,accuracy:100,status:"confusion",type:"ghost"},
 "glare":{id:137,effectId:68,accuracy:100,status:"paralysis",type:"normal"}
};
function setup(w,species="pikachu"){
 const G=w.PokeTree;
 const user=G.Pokemon.create({id:"u",species,level:30,side:"ally"});
 const target=G.Pokemon.create({id:"t",species:"rattata",level:30,side:"enemy"});
 const exp={id:"windy",party:[user],enemies:[target],logs:[],weather:null,terrain:null};
 return {G,user,target,exp,S:w.PokeBattleStatus};
}
function apply(w,key,ctx){ctx.user.pp=100;return w.PokeMoveEffects.execute(ctx.exp,ctx.user,{move:w.POKE_MOVES[key],targetId:ctx.target.id},()=>{});}
test("five status-only moves match pinned catalog and previous 43 unchanged",()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,"data-import/manifest.json"),"utf8"));
 const source=new Map(manifest.files.moves.flatMap(p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8")).moves).map(m=>[m.key,m]));
 const {w}=boot();
 assert.equal(Object.keys(w.POKE_STATUS_MOVES).length,5);
 assert.equal(Object.keys(w.POKE_MOVES).length,61);
 for(const [key,s] of Object.entries(specs)){
  const original=source.get(key),move=w.POKE_MOVES[key];
  assert.equal(original.id,s.id,key);assert.equal(original.effectId,s.effectId,key);
  assert.equal(original.type,s.type,key);assert.equal(original.accuracy,s.accuracy,key);
  assert.equal(original.target,"selected-pokemon",key);assert.equal(original.priority,0,key);
  assert.equal(original.category,"status",key);assert.equal(original.power,null,key);
  assert.equal(move.name,original.ko,key);assert.equal(move.type,original.type,key);
  assert.equal(move.accuracy,original.accuracy,key);assert.equal(move.effectId,s.effectId,key);
  assert.equal(move.effect,"status",key);assert.equal(move.status,s.status,key);
  assert.equal(move.target,"enemy",key);
 }
 assert.equal(w.POKE_MOVES["thunder-wave"].status,"paralysis");
});
test("each status applies to one foe, consumes PP, causes no immediate attack damage",()=>{
 const {w}=boot();
 for(const [key,s] of Object.entries(specs)){
  const c=setup(w);const before=c.target.hp;
  assert.equal(c.G.techniques.learn(c.user,key),null);
  assert.equal(c.G.techniques.equip(c.user,key,0),null);
  assert.equal(apply(w,key,c).failed,false,key);
  assert.equal(c.user.pp,0,key);
  assert.equal(c.target.hp,before,key);
  if(s.status==="confusion"){assert.ok(c.target.battleStatus.confusion>0);assert.equal(c.target.battleStatus.major,null);}
  else assert.equal(c.target.battleStatus.major.kind,s.status,key);
 }
});
test("burn, toxic and paralysis use existing physical reduction, residual damage and speed rules",()=>{
 const {w}=boot(),c=setup(w),S=c.S;
 const baseline=c.G.Damage.compute(c.target,c.user,{move:w.POKE_MOVES.tackle,random:100}).damage;
 assert.equal(apply(w,"will-o-wisp",c).failed,false);
 const burned=c.G.Damage.compute(c.target,c.user,{move:w.POKE_MOVES.tackle,random:100}).damage;
 assert.ok(burned<=baseline,"burn reduces physical damage");
 assert.ok(S.afterAction(c.target)>0);
 c.target.battleStatus=S.create();
 assert.equal(apply(w,"toxic",c).failed,false);
 const first=S.afterAction(c.target),second=S.afterAction(c.target);
 assert.ok(second>first,"toxic residual damage increases");
 S.endBattle(c.target);
 assert.equal(c.target.battleStatus.major.counter,0);
 c.target.battleStatus=S.create();
 const speed=S.speed(c.target);
 assert.equal(apply(w,"glare",c).failed,false);
 assert.ok(S.speed(c.target)<speed);
 assert.equal(S.beforeAction(c.target,()=>0),"몸이 마비되어 행동하지 못했습니다.");
});
test("hypnosis blocks actions and confusion may cause self-damage via existing action handler",()=>{
 const {w}=boot(),c=setup(w),S=c.S;
 assert.equal(apply(w,"hypnosis",c).failed,false);
 assert.match(S.beforeAction(c.target),/잠들어/);
 c.target.battleStatus=S.create();
 assert.equal(apply(w,"confuse-ray",c).failed,false);
 assert.equal(S.beforeAction(c.target,()=>0),"confusion");
});
test("existing type immunity, duplicate status and terrain blocking are preserved",()=>{
 const {w}=boot(),c=setup(w),S=c.S;
 c.target=c.G.Pokemon.create({id:"fire",species:"charmander",level:20,side:"enemy"});c.exp.enemies=[c.target];
 apply(w,"will-o-wisp",c);assert.equal(c.target.battleStatus.major,null);
 c.target=c.G.Pokemon.create({id:"electric",species:"pikachu",level:20,side:"enemy"});c.exp.enemies=[c.target];
 apply(w,"glare",c);assert.equal(c.target.battleStatus.major,null);
 c.target=c.G.Pokemon.create({id:"steel",species:"magnemite",level:20,side:"enemy"});c.exp.enemies=[c.target];
 apply(w,"toxic",c);assert.equal(c.target.battleStatus.major,null);
 c.target=c.G.Pokemon.create({id:"regular",species:"rattata",level:20,side:"enemy"});c.exp.enemies=[c.target];
 apply(w,"glare",c);
 assert.equal(c.target.battleStatus.major.kind,"paralysis");
 apply(w,"will-o-wisp",c);
 assert.equal(c.target.battleStatus.major.kind,"paralysis");
 c.target.battleStatus=S.create();c.exp.terrain={kind:"electric",remaining:5};
 apply(w,"hypnosis",c);assert.equal(c.target.battleStatus.major,null);
 c.exp.terrain={kind:"misty",remaining:5};
 apply(w,"glare",c);assert.equal(c.target.battleStatus.major,null);
});
test("Toxic ignores accuracy only for poison-type user; other moves still can miss",()=>{
 const {w,m}=boot(),normal=setup(w),poison=setup(w,"bulbasaur");
 m.random=()=>0.99;
 normal.user.pp=100;
 apply(w,"toxic",normal);assert.equal(normal.target.battleStatus.major,null);
 assert.equal(normal.user.pp,0);
 apply(w,"toxic",poison);assert.equal(poison.target.battleStatus.major.kind,"toxic");
 assert.equal(poison.user.pp,0);
 apply(w,"hypnosis",poison);assert.equal(poison.target.battleStatus.major.kind,"toxic");
});
