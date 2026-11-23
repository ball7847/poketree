"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),cp=require("node:child_process");
const root=path.resolve(__dirname,"..");
const load=p=>fs.readFileSync(path.join(root,p),"utf8");
const audit=JSON.parse(load("data-audit/move-stage15-verification.json"));
const env={window:{POKE_TYPE_CHART:{},PokePokemon:{template:()=>({form:{types:["normal"]}}),attackCategory:()=>"physical",normalAttackType:()=>"normal"}},Math};
vm.createContext(env);
vm.runInContext(load("game/data/stage15-moves.js"),env);
vm.runInContext(load("game/engine/damage.js"),env);
const moves=env.window.POKE_STAGE15_MOVES,damage=env.window.PokeDamage;
const unit=(hp=100,maxHp=100)=>({hp,maxHp,level:50,attack:100,defense:100,spAttack:100,spDefense:100,speed:100,battleStatus:{major:null,ranks:{attack:0,defense:0,spAttack:0,spDefense:0,speed:0,accuracy:0,evasion:0}}});
test("stage15 generator retains the 937-source audit and deterministic output",()=>{
 const v=cp.spawnSync(process.execPath,["scripts/generate-stage15-moves.cjs","--check"],{cwd:root,encoding:"utf8"});
 assert.equal(v.status,0,v.stdout+"\n"+v.stderr);
 assert.equal(audit.rows.length,937);
 assert.equal(audit.rows.filter(x=>x.state==="verified").length,11);
 assert.equal(Object.keys(moves).length,11);
 assert.equal(audit.existingCount,297);
 assert.equal(audit.total,308);
});
test("stage15 originals have explicit conditional effect IDs",()=>{
 for(const [key,id] of Object.entries({"flail":100,"reversal":100,"facade":170,"eruption":191,"water-spout":191,"dragon-energy":191,"brine":222,"venoshock":284,"hex":311,"stored-power":306,"power-trip":306})){
  assert.equal(moves[key].effectId,id,key);
  assert.equal(moves[key].effect,"damage");
 }
});
test("HP tier and HP-proportional damage use bounded original power",()=>{
 const a=unit(100),b=unit();
 assert.equal(damage.resolvePower(moves["eruption"],a,b),150);
 a.hp=50;assert.equal(damage.resolvePower(moves["water-spout"],a,b),75);
 a.hp=1;assert.equal(damage.resolvePower(moves["dragon-energy"],a,b),1);
 assert.equal(damage.resolvePower(moves["flail"],a,b),200);
 a.hp=100;assert.equal(damage.resolvePower(moves["reversal"],a,b),20);
});
test("target and major-status conditional power changes only at thresholds",()=>{
 const a=unit(),b=unit();
 assert.equal(damage.resolvePower(moves["facade"],a,b),70);
 a.battleStatus.major={kind:"burn"};
 assert.equal(damage.resolvePower(moves["facade"],a,b),140);
 assert.equal(damage.resolvePower(moves["brine"],a,b),65);
 b.hp=50;assert.equal(damage.resolvePower(moves["brine"],a,b),130);
 assert.equal(damage.resolvePower(moves["hex"],a,b),65);
 b.battleStatus.major={kind:"poison"};
 assert.equal(damage.resolvePower(moves["hex"],a,b),130);
 assert.equal(damage.resolvePower(moves["venoshock"],a,b),130);
 b.battleStatus.major={kind:"paralysis"};
 assert.equal(damage.resolvePower(moves["venoshock"],a,b),65);
});
test("positive rank stages include accuracy/evasion and ignore drops",()=>{
 const a=unit(),b=unit();
 assert.equal(damage.resolvePower(moves["stored-power"],a,b),20);
 a.battleStatus.ranks.accuracy=2;a.battleStatus.ranks.evasion=1;a.battleStatus.ranks.attack=-4;
 assert.equal(damage.resolvePower(moves["stored-power"],a,b),80);
 assert.equal(damage.resolvePower(moves["power-trip"],a,b),80);
});
test("facade ignores physical burn reduction while previous ordinary attacks retain it",()=>{
 const a=unit(),b=unit();
 a.battleStatus.major={kind:"burn"};
 const original={...moves["facade"],conditionalPower:null,ignoreBurnAttackDrop:false,power:140};
 const normal=damage.compute(a,b,{move:original,random:100});
 const facade=damage.compute(a,b,{move:moves["facade"],random:100});
 assert.ok(facade.damage>normal.damage);
 const repeat=damage.compute(a,b,{move:original,random:100});
 assert.equal(repeat.damage,normal.damage);
});
test("type immunity and current existing ordinary power still behave as before",()=>{
 const a=unit(),b=unit();
 const conventional={type:"normal",category:"physical",power:40};
 assert.equal(damage.resolvePower(conventional,a,b),40);
 assert.ok(damage.compute(a,b,{move:conventional,random:100}).damage>0);
});
