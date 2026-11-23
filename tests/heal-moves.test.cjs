"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const specs={"recover":105,"soft-boiled":135,"milk-drink":208,"slack-off":303};
function boot(){
 const random=Object.create(Math);random.random=()=>0;
 const ctx=vm.createContext({window:{addEventListener(){},localStorage:{getItem(){return null},setItem(){}}},performance:{now:()=>0},Date,console,Set,Map,Math:random});
 const scripts=["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/simple-damage-moves.js","data/rank-moves.js","data/status-moves.js","data/drain-moves.js","data/heal-moves.js","data/recoil-moves.js","data/drain-75-moves.js","data/bulk-moves.js","data/stage12-moves.js","data/stage13-moves.js","data/stage14-moves.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"];
 for(const p of scripts)vm.runInContext(read("game/"+p),ctx,{filename:p});
 return ctx.window;
}
function battle(w,species="pikachu"){
 const G=w.PokeTree,user=G.Pokemon.create({id:"healer",species,level:40,side:"ally"});
 const foe=G.Pokemon.create({id:"foe",species:"rattata",level:40,side:"enemy"});
 return {G,user,foe,exp:{id:"windy",party:[user],enemies:[foe],logs:[],weather:null,terrain:null}};
}
function apply(w,c,key){return w.PokeMoveEffects.execute(c.exp,c.user,{moveId:key,move:w.POKE_MOVES[key],targetId:c.user.id},()=>{});}
test("the three new heals and existing Recover share pinned original metadata and total 56 techniques",()=>{
 const manifest=JSON.parse(read("data-import/manifest.json"));
 const originals=new Map(manifest.files.moves.flatMap(p=>JSON.parse(read(p)).moves).map(m=>[m.key,m]));
 const w=boot();
 assert.equal(Object.keys(w.POKE_HEAL_MOVES).length,3);
 assert.equal(Object.keys(w.POKE_MOVES).length,297);
 for(const [key,id] of Object.entries(specs)){
  const a=originals.get(key),m=w.POKE_MOVES[key];
  assert.ok(a&&m,key);
  assert.equal(a.id,id,key);
  assert.equal(a.effectId,33,key);
  assert.equal(a.meta.healing,50,key);
  assert.equal(a.target,"user",key);
  assert.equal(a.category,"status",key);
  assert.equal(a.power,null,key);
  assert.equal(a.accuracy,null,key);
  assert.equal(a.priority,0,key);
  assert.equal(m.name,a.ko,key);
  assert.equal(m.type,a.type,key);
  assert.equal(m.category,a.category,key);
  assert.equal(m.accuracy,a.accuracy,key);
  assert.equal(m.priority,a.priority,key);
  assert.equal(m.target,"self",key);
  assert.equal(m.effect,"heal",key);
  assert.equal(m.healFraction,0.5,key);
  assert.equal(m.effectId,33,key);
 }
});
test("all four healing techniques are learnable, equipable and restore half max HP, not special-attack HP",()=>{
 const w=boot();
 for(const key of Object.keys(specs)){
  const c=battle(w),T=c.G.techniques;
  assert.equal(T.learn(c.user,key),null,key);
  assert.equal(T.equip(c.user,key,0),null,key);
  c.user.hp=Math.max(1,c.user.maxHp-100);
  c.user.pp=100;
  const pre=c.user.hp,enemyHP=c.foe.hp;
  const restored=Math.min(c.user.maxHp-pre,Math.max(1,Math.floor(c.user.maxHp/2)));
  assert.equal(apply(w,c,key).failed,false,key);
  assert.equal(c.user.hp,pre+restored,key);
  assert.equal(c.foe.hp,enemyHP,key);
  assert.equal(c.user.pp,0,key);
  assert.ok(c.exp.logs.some(x=>x.message.includes("HP")&&x.message.includes("회복")),key);
 }
});
test("half-max-HP rounding, missing HP cap and full HP cannot create extra health",()=>{
 const w=boot(),c=battle(w),m=w.PokeMoveEffects;
 const even={...c.user,maxHp:150,hp:50};
 const odd={...c.user,maxHp:151,hp:50};
 const move=w.POKE_MOVES.recover;
 assert.equal(m.healAmount(even,even,false,move),75);
 assert.equal(m.healAmount(odd,odd,false,move),75);
 for(const hp of [1,50,149,150]){
  c.user.maxHp=150;c.user.hp=hp;c.user.pp=100;
  assert.equal(apply(w,c,"soft-boiled").failed,false);
  assert.equal(c.user.hp,Math.min(150,hp+75));
  assert.equal(c.user.pp,0);
 }
});
test("healing cannot execute with PP below 100 and enemy-targeting rules are unchanged",()=>{
 const w=boot(),c=battle(w);
 c.user.hp=Math.max(1,c.user.maxHp-80);
 const start=c.user.hp;
 c.user.pp=99;
 const blocked=apply(w,c,"milk-drink");
 assert.equal(blocked.failed,true);
 assert.equal(blocked.reason,"insufficient-pp");
 assert.equal(c.user.hp,start);
 assert.equal(c.user.pp,99);
 const targetBefore=c.foe.hp;
 c.user.pp=100;
 const plan=w.PokeTargeting.selectTarget(c.exp,c.user,{moveId:"slack-off",move:w.POKE_MOVES["slack-off"]});
 assert.equal(plan.targetId,c.user.id);
 apply(w,c,"slack-off");
 assert.equal(c.foe.hp,targetBefore);
});
test("the old generic ally/area heal helper remains unchanged for non-marked moves",()=>{
 const w=boot(),M=w.PokeMoveEffects,a=battle(w,"pikachu").user,b=battle(w,"eevee").user;
 const original=Math.floor((b.maxHp+a.spAttack)/4);
 assert.equal(M.healAmount(a,b,true),Math.floor(original*2/3));
 assert.equal(M.healAmount(a,a),Math.floor((a.maxHp+a.spAttack)/4));
});
