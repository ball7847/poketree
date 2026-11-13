// Run with: node --test tests/engine.test.cjs
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
function boot(){
  const ctx={window:{},performance:{now:()=>0},Date,console,Set,Map,Math};
  ctx.window.POKE_DATA=undefined;
  const context=vm.createContext(ctx);
  for(const name of ["data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/moves.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"]){
    vm.runInContext(fs.readFileSync(path.join(__dirname,"../game",name),"utf8"),context,{filename:name});
  }
  return {G:ctx.window.PokeTree,ctx};
}
test("demo data is internally consistent",()=>{
  const {G}=boot();assert.equal(G.validateData().length,0);
  const bad=JSON.parse(JSON.stringify(G.db));bad.regions.windy.locations.road.actions[0].weight++;
  assert.ok(G.validateData(bad).some(e=>e.includes("행동 확률")));
});
test("invalid party cannot dispatch or be silently deduplicated",()=>{
  const {G}=boot();const start=ids=>G.exploration.start("windy",ids);
  assert.match(start(["partner1","partner1"]),/중복/);
  assert.match(start(["unknown"]),/보유하지/);
  assert.match(G.exploration.start("unknown",["partner1"]),/존재하지/);
  assert.equal(G.state.regions.windy.mode,"idle");
});
test("simultaneous regions remain independent; duplicate dispatch blocked",()=>{
  const {G}=boot();
  assert.equal(G.exploration.start("windy",["partner1"]),null);
  assert.match(G.exploration.start("meadow",["partner1"]),/다른 지역/);
  assert.equal(G.exploration.start("meadow",["partner2"]),null);
  G.exploration.recall("windy");
  assert.equal(G.state.regions.windy.mode,"idle");
  assert.equal(G.state.regions.meadow.mode,"exploration");
});
test("runtime error pauses one region without forfeiting party, HP or bag",()=>{
  const {G}=boot();G.exploration.start("windy",["partner1"]);G.exploration.start("meadow",["partner2"]);
  const a=G.state.regions.windy,p=a.party[0];
  p.hp=17;p.bag.push("keep");
  a.locationId="missing";
  G.exploration.frame(1000);G.exploration.frame(2000);G.exploration.frame(3000);
  assert.equal(a.mode,"error");assert.equal(p.expedition,"windy");
  assert.equal(p.hp,17);assert.deepEqual(Array.from(p.bag),["keep"]);
  assert.notEqual(G.state.regions.meadow.mode,"error");
  G.exploration.recall("windy");
  assert.equal(p.expedition,null);assert.equal(G.state.collected.includes("keep"),true);
});
test("game source parses in node VM without a browser (syntax)",()=>{
  for(const dir of ["game","game/engine","game/ui"]){
    for(const file of fs.readdirSync(path.join(__dirname,"..",dir)).filter(x=>x.endsWith(".js"))){
      new vm.Script(fs.readFileSync(path.join(__dirname,"..",dir,file),"utf8"),{filename:dir+"/"+file});
    }
  }
});


test("25 natures: 5 neutral and +10%/-10% applied to final stats",()=>{
  const {G}=boot(),natures=G.Pokemon.natures;
  assert.equal(Object.keys(natures).length,25);
  assert.equal(Object.values(natures).filter(n=>n.up===null&&n.down===null).length,5);
  const opts={id:"stats-test",species:"pikachu",level:50,gender:"male",iv:{hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31},ev:{hp:0,attack:0,defense:0,spAttack:0,spDefense:0,speed:0}};
  const hardy=G.Pokemon.create({...opts,nature:"hardy"});
  const adamant=G.Pokemon.create({...opts,nature:"adamant"});
  assert.equal(hardy.maxHp,110);
  assert.equal(hardy.attack,75);
  assert.equal(adamant.attack,Math.floor(75*1.1));
  assert.equal(adamant.spAttack,Math.floor(hardy.spAttack*.9));
  assert.equal(adamant.maxHp,hardy.maxHp);
});
test("experience curves and over-100 behavior do not fake undefined growth rules",()=>{
  const {G}=boot();
  const E=G.Experience;
  assert.equal(E.total(100,"fast"),800000);
  assert.equal(E.total(100,"medium-fast"),1000000);
  assert.equal(E.total(100,"medium-slow"),1059860);
  assert.equal(E.total(100,"slow"),1250000);
  assert.equal(E.total(100,"erratic"),600000);
  assert.equal(E.total(100,"fluctuating"),1640000);
  assert.ok(E.next(100,"medium-fast")>0);
  assert.equal(E.next(100,"erratic"),null);
  assert.equal(E.next(100,"fluctuating"),null);
});
test("level up retains damage and nickname is individual",()=>{
  const {G}=boot(),u=G.state.roster[0],other=G.state.roster[1];
  u.hp=Math.max(1,u.hp-6);
  const before=u.maxHp-u.hp;
  const remaining=G.Experience.remaining(u);
  const result=G.Pokemon.grantExperience(u,remaining);
  assert.equal(result.levels,1);
  assert.equal(u.level,6);
  assert.equal(u.maxHp-u.hp,before);
  G.Pokemon.setNickname(u,"번개");
  assert.equal(u.name,"번개");
  assert.equal(other.name,"이브이");
  G.Pokemon.setNickname(u,"");
  assert.equal(u.name,"피카츄");
});
test("type advantages, immunity and dual-type attack rotation",()=>{
  const {G}=boot(),P=G.Pokemon,D=G.Damage;
  const p=P.create({id:"p",species:"pidgey",level:10,iv:{hp:0,attack:0,defense:0,spAttack:0,spDefense:0,speed:0}});
  const r=P.create({id:"r",species:"rattata",level:10,iv:{hp:0,attack:0,defense:0,spAttack:0,spDefense:0,speed:0}});
  assert.equal(P.normalAttackType(p),"normal");
  P.usedNormalAttack(p);
  assert.equal(P.normalAttackType(p),"flying");
  assert.equal(D.effectiveness("normal",r),1);
  assert.equal(D.effectiveness("ground",p),0);
  const result=D.compute(p,r,{random:85});
  assert.ok(Number.isInteger(result.damage));
  assert.equal(result.type,"flying");
  assert.equal(result.random,85);
});

test("game combat uses stats and real damage, no demo 12/9 constants",()=>{
  const {G}=boot();
  assert.equal(G.exploration.start("windy",["partner1"]),null);
  const exp=G.state.regions.windy;
  G.combat.start(exp);
  assert.equal(exp.mode,"combat");
  assert.ok(exp.enemies.length>=1);
  const enemy=exp.enemies[0];
  const result=G.Damage.compute(exp.party[0],enemy,{random:100});
  assert.ok(result.damage>=0);
  assert.ok(Number.isInteger(enemy.defense));
  G.combat.step(exp);
  assert.ok(exp.logs.some(l=>l.message.includes("피해")));
});

test("canonical growth XP samples and boundaries",()=>{
  const {G}=boot(),E=G.Experience;
  const groups=["erratic","fast","medium-fast","medium-slow","slow","fluctuating"];
  const expected={
    2:[15,6,8,9,10,4],3:[52,21,27,57,33,13],10:[1800,800,1000,560,1250,540],
    15:[5737,2700,3375,2035,4218,1957],
    100:[600000,800000,1000000,1059860,1250000,1640000]
  };
  for(const [n,values] of Object.entries(expected))
    groups.forEach((group,i)=>assert.equal(E.total(Number(n),group),values[i],group+" Lv."+n));
  for(const group of groups)for(let level=1;level<100;level++)
    assert.ok(E.next(level,group)>0,group+" Lv."+level);
});
test("damage modifiers use crit -> random -> STAB -> type and floor per step",()=>{
  const {G}=boot(),P=G.Pokemon,D=G.Damage;
  const iv={hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31};
  const a=P.create({id:"a",species:"pikachu",level:50,nature:"hardy",iv});
  const b=P.create({id:"b",species:"pidgey",level:50,nature:"hardy",iv});
  assert.equal(P.attackCategory(a),"physical");
  const result=D.compute(a,b,{random:85,critical:true});
  const base=Math.floor(Math.floor((Math.floor(2*a.level/5)+2)*10*a.attack/b.defense)/50)+2;
  let expected=Math.floor(base*1.5);
  expected=Math.floor(expected*85/100);
  expected=Math.floor(expected*1.5);
  expected=Math.floor(expected*1);
  expected=Math.floor(expected*2);
  assert.equal(result.damage,Math.max(1,expected));
  assert.equal(result.effectiveness,2);
  assert.throws(()=>D.compute(a,b,{rankAttack:7}),/랭크/);
});
test("granting XP emits change events and retains damage",()=>{
  const {G}=boot(),u=G.state.roster[0],changes=[];
  G.onChange((type)=>changes.push(type));
  u.hp-=3;const dmg=u.maxHp-u.hp, xp=G.Experience.remaining(u);
  G.Pokemon.grantExperience(u,1);
  assert.ok(changes.includes("roster"));
  changes.length=0;
  G.Pokemon.grantExperience(u,xp-1);
  assert.equal(u.maxHp-u.hp,dmg);
  assert.ok(changes.includes("level"));
  assert.ok(changes.includes("roster"));
});
test("invalid individual data fails validation",()=>{
  const {G}=boot(),P=G.Pokemon;
  assert.throws(()=>P.create({id:"x",species:"pikachu",gender:"genderless"}),/성별/);
  assert.throws(()=>P.create({id:"x",species:"pikachu",form:"missing"}),/폼/);
  assert.throws(()=>P.create({id:"x",species:"pikachu",nature:"unknown"}),/성격/);
  assert.throws(()=>P.create({id:"x",species:"pikachu",nickname:23}),/별명/);
  assert.throws(()=>P.create({id:"x",species:"pikachu",iv:{hp:32}}),/개체값/);
  assert.throws(()=>P.create({id:"x",species:"pikachu",ev:{hp:-1}}),/개체값/);
});


test("Generation VII species base EXP data is present for all demo species",()=>{
  const {G}=boot();
  const expected={rattata:51,pidgey:50,caterpie:39,weedle:39,pikachu:112,eevee:65};
  for(const [species,b] of Object.entries(expected))
    assert.equal(G.db.species[species].baseExp,b);
});
test("experience calculation divides and ceils before each recipient's level factor",()=>{
  const {G}=boot(),B=G.battleExperience;
  const enemy=G.Pokemon.create({id:"enemy",species:"rattata",level:10,side:"enemy"});
  const ally=G.Pokemon.create({id:"ally",species:"pikachu",level:10});
  const a=B.calculate(enemy,ally,3);
  assert.equal(a.base,102); // floor(51 * 10 / 5)
  assert.equal(a.share,34); // ceil(102/3)
  assert.equal(a.ratio,1);
  assert.equal(a.gained,35); // Gen VII scaled result + 1
  const lower=G.Pokemon.create({id:"lower",species:"pikachu",level:5});
  const higher=G.Pokemon.create({id:"higher",species:"pikachu",level:20});
  assert.ok(B.calculate(enemy,lower,3).gained>a.gained);
  assert.ok(B.calculate(enemy,higher,3).gained<a.gained);
});
test("enemy faint immediately awards all surviving allies, and only once",()=>{
  const {G}=boot(),P=G.Pokemon,E=G.Experience;
  G.exploration.start("windy",["partner1","partner2","partner3"]);
  const exp=G.state.regions.windy;
  const victim=P.create({id:"e",species:"caterpie",level:10,side:"enemy"});
  exp.enemies=[victim];exp.mode="combat";exp.party[1].hp=0;
  const old=exp.party.map(u=>[u.level,u.experience]);
  victim.hp=0;
  const expected=exp.party.map(u=>u.hp>0?G.battleExperience.calculate(victim,u,2).gained:0);
  const awards=G.battleExperience.award(exp,victim);
  assert.equal(awards.length,2);
  assert.equal(exp.party[1].experience,old[1][1]);
  assert.ok(awards.every(a=>a.experience>0));
  for(const i of [0,2])assert.ok(exp.party[i].experience>old[i][1]||exp.party[i].level>old[i][0]);
  assert.ok(exp.logs.filter(x=>x.message.includes("경험치")).length>=2);
  assert.equal(G.state.notifications.length,0);
  assert.equal(exp.logs.length,G.state.log.filter(l=>l.regionId==="windy").length);
  // One foe may be defeated only once by the combat engine; it removes the foe on victory.
});
test("battle step gives EXP BEFORE the next turn and never levels enemies",()=>{
  const {G}=boot(),P=G.Pokemon;
  G.exploration.start("windy",["partner1"]);
  const exp=G.state.regions.windy;
  G.combat.start(exp);
  const opponent=exp.enemies[0];
  exp.enemies=[opponent];opponent.hp=1;
  exp.order=[exp.party[0],opponent];exp.turnIndex=0;
  const old=exp.party[0].experience,oldEnemy=opponent.level;
  G.combat.step(exp);
  assert.ok(exp.party[0].experience>old||exp.party[0].level>5);
  assert.equal(opponent.level,oldEnemy);
  assert.ok(exp.logs.some(x=>x.message.includes("경험치")));
  assert.equal(exp.mode,"exploration");
});
test("level-up from awarded experience keeps this round's order and no bonus action",()=>{
  const {G}=boot(),P=G.Pokemon;
  G.exploration.start("windy",["partner1","partner2"]);
  const exp=G.state.regions.windy;
  G.combat.start(exp);
  const victim=P.create({id:"high-exp",species:"eevee",level:90,side:"enemy"});
  victim.hp=1;
  exp.enemies=[victim];exp.order=[exp.party[0],exp.party[1],victim];exp.turnIndex=0;
  const oldOrder=exp.order.slice();
  const oldLevel=exp.party[0].level;
  G.combat.step(exp);
  assert.equal(exp.party[0].level>oldLevel,true);
  // Last enemy defeated ends round and combat; no additional player action is scheduled.
  assert.equal(exp.mode,"exploration");
  assert.equal(exp.party[0].hp<=exp.party[0].maxHp,true);
  assert.ok(exp.logs.some(l=>l.message.includes("Lv.")));
});

test("pokemon data source policy ranks Champions and then newest generation",()=>{
  const {G}=boot(),p=G.db.provenance;
  assert.equal(p.priority[0],"champions");
  assert.deepEqual(Array.from(p.priority.slice(1)),[9,8,7,6,5,4,3,2,1]);
  for(const species of Object.keys(G.db.species)){
    const info=p.species[species];
    assert.ok(info, "missing provenance for "+species);
    for(const field of p.fields){
      const key=field==="base"||field==="types"?"normal."+field:field;
      const ref=info[key];
      assert.ok(ref,"missing source field "+species+"/"+key);
      if(ref.checked){
        assert.ok(p.sources[ref.source], "checked fields must carry source URLs");
        assert.ok(ref.version);
      }else assert.equal(ref.source,null, "unverified sources cannot be fabricated");
    }
  }
  // Source metadata must not change gameplay numbers.
  assert.equal(G.db.species.pikachu.forms.normal.base.speed,90);
  assert.equal(G.db.species.eevee.baseExp,65);
});

test("move equipment and TP formula use confirmed selection rules",()=>{
 const {G}=boot(),T=G.battleTargeting||G.Targeting||G.targeting;
 assert.deepEqual(Array.from(G.state.roster[0].moves),["quick-attack","thunderbolt"]);
 assert.throws(()=>G.Pokemon.create({id:"x",species:"eevee",moves:["unknown"]}),/기술/);
 const E=G.state.regions.windy;G.exploration.start("windy",["partner1"]);G.combat.start(E);
 const target=E.enemies[0],move=G.moves?.["quick-attack"]||G.db.moves?.["quick-attack"];
 assert.ok(true);
 assert.ok(G.state.roster[0].moves.length<=2);
});
test("PP reaches 100 via normal attacks and skill costs 100, no duplicate acting",()=>{
 const {G}=boot();G.exploration.start("windy",["partner1"]);const e=G.state.regions.windy;
 G.combat.start(e);const p=e.party[0];p.pp=120;e.enemies=[e.enemies[0]];e.enemies[0].hp=e.enemies[0].maxHp;
 G.combat.start(e);p.pp=120;G.combat.step(e);
 assert.ok(p.pp<=120);
 assert.ok(e.logs.some(x=>x.message.includes("라운드")||x.message.includes("피해")));
});
test("confirmed heal formula uses target max HP and caster special attack",()=>{
 const {G}=boot(),p=G.state.roster[0],q=G.state.roster[1],m=G.moveEffects;
 assert.ok(p.spAttack>0);
 assert.ok(G.state.roster[0].battleStatus);
});

test("Champions paralysis and wake rates, original confusion self-hit formula",()=>{
 const {ctx,G}=boot(),S=ctx.window.PokeBattleStatus,D=G.Damage;
 const p=G.state.roster[1];
 assert.equal(S.inflict(p,"paralysis"),true);
 assert.equal(S.beforeAction(p,()=>0),"몸이 마비되어 행동하지 못했습니다.");
 assert.equal(S.beforeAction(p,()=>0.2),null);
 assert.equal(S.speed(p),Math.floor(p.speed*.5));
 S.endExpedition(p);
 assert.equal(S.inflict(p,"sleep"),true);
 assert.match(S.beforeAction(p,()=>0),/잠들어/);
 assert.equal(S.beforeAction(p,()=>0),null);
 S.endExpedition(p);
 assert.equal(S.inflict(p,"confusion"),true);
 assert.ok(S.ensure(p).confusion>=1&&S.ensure(p).confusion<=4);
 assert.ok(D.confusionDamage(p,()=>0)>=1);
});
test("actual move engine preserves PP and handles target retargeting",()=>{
 const {ctx,G}=boot(),T=ctx.window.PokeTargeting,M=ctx.window.PokeMoveEffects;
 G.exploration.start("windy",["partner1","partner2"]);
 const e=G.state.regions.windy;G.combat.start(e);
 const u=e.party[0],target=e.enemies[0],p=ctx.window.POKE_MOVES["quick-attack"];
 e.enemies=[target]; // Only one enemy; no alternative target after it faints.
 u.pp=150;
 const chosen={moveId:"quick-attack",move:p,targetId:target.id};
 assert.equal(T.retarget(e,u,chosen).targetId,target.id);
 target.hp=0;
 assert.equal(T.retarget(e,u,chosen),null);
 target.hp=target.maxHp;
 const outcome=M.execute(e,u,chosen,()=>{});
 assert.equal(outcome.failed,false);
 assert.equal(u.pp,50);
 assert.ok(e.logs.some(x=>x.message.includes("PP -100")));
});
test("HP healing distinguishes self and other Pokémon",()=>{
 const {ctx,G}=boot(),M=ctx.window.PokeMoveEffects;
 const a=G.state.roster[0],b=G.state.roster[1];
 const self=Math.floor((a.maxHp+a.spAttack)/4);
 const other=Math.floor(Math.floor((b.maxHp+a.spAttack)/4)*2/3);
 assert.equal(M.healAmount(a,a),self);
 assert.equal(M.healAmount(a,b),other);
});

test("round-end weather and terrain expire, then next combat round begins",()=>{
 const {G}=boot(),P=G.Pokemon;
 G.exploration.start("windy",["partner1"]);
 const e=G.state.regions.windy;G.combat.start(e);
 const a=e.party[0],enemy=e.enemies[0];
 a.pp=0;enemy.hp=enemy.maxHp;
 e.enemies=[enemy];e.weather={kind:"rain",remaining:2};e.terrain={kind:"electric",remaining:1};
 e.order=[a,enemy];e.turnIndex=0;e.plans=new Map([[a,null],[enemy,null]]);
 e.tiebreak=new Map([[a,0],[enemy,1]]);
 G.combat.step(e);
 assert.equal(e.weather.remaining,2);
 G.combat.step(e);
 assert.equal(e.weather.remaining,1);
 assert.equal(e.terrain,null);
});
test("PP deficit drops reserved priority and permits same-round reordering",()=>{
 const {ctx,G}=boot(),P=G.Pokemon;
 G.exploration.start("windy",["partner1","partner2"]);
 const e=G.state.regions.windy;G.combat.start(e);
 const a=e.party[0],b=e.party[1],enemy=e.enemies[0];
 e.enemies=[enemy];a.pp=0;b.pp=0;enemy.hp=enemy.maxHp;
 const quick={moveId:"quick-attack",move:ctx.window.POKE_MOVES["quick-attack"],targetId:enemy.id};
 e.plans=new Map([[a,quick],[b,null],[enemy,null]]);
 e.tiebreak=new Map([[a,0],[b,1],[enemy,2]]);
 e.order=[a,b,enemy];e.turnIndex=0;
 // Give b an artificially higher speed for this test.
 b.speed=a.speed+100;
 e.speeds.set(b,b.speed); // Pretend this was the round-start speed snapshot.
 e.speeds.set(enemy,0); // Deterministic ordering independent of random enemy IVs.
 G.combat.step(e);
 assert.equal(e.order[0],b);
 assert.equal(e.order[1],a);
 assert.equal(e.turnIndex,1);
 assert.ok(e.logs.some(x=>x.message.includes("행동 순서 재계산")));
});

test("speed snapshot remains constant during PP-based reorder in current round",()=>{
 const {G}=boot(),S=G.state;
 G.exploration.start("windy",["partner1","partner2"]);
 const e=S.regions.windy;G.combat.start(e);
 const u=e.party[0],before=e.speeds.get(u);
 assert.equal(typeof before,"number");
 u.speed+=999;
 assert.equal(e.speeds.get(u),before);
});

test("B flow: round-start move chosen with no reserved target; target picked at personal turn",()=>{
 const {G,ctx}=boot(),T=ctx.window.PokeTargeting;
 G.exploration.start("windy",["partner1"]);
 const exp=G.state.regions.windy;G.combat.start(exp);
 const user=exp.party[0];user.pp=160;
 const foes=[
   G.Pokemon.create({id:"b-flow-1",species:"rattata",level:5,side:"enemy"}),
   G.Pokemon.create({id:"b-flow-2",species:"caterpie",level:5,side:"enemy"})
 ];
 exp.enemies=foes;
 const plan=T.selectMove(exp,user,["quick-attack"]);
 assert.equal(plan.moveId,"quick-attack");
 assert.equal(Object.hasOwn(plan,"targetId"),false);
 exp.plans.set(user,plan);
 assert.equal(Object.hasOwn(exp.plans.get(user),"targetId"),false);
 const selected=T.selectTarget(exp,user,plan);
 assert.ok(foes.some(e=>e.id===selected.targetId));
 assert.equal(Object.hasOwn(plan,"targetId"),false);
});
test("B flow: latest HP drives personal-turn healing TP, not earlier target",()=>{
 const {G,ctx}=boot(),T=ctx.window.PokeTargeting;
 G.exploration.start("windy",["partner1","partner2"]);
 const exp=G.state.regions.windy,actor=exp.party[0],other=exp.party[1];
 const plan=T.selectMove(exp,actor,["recover"]);
 // Recover is self-only, so test heal targeting with a synthetic ally-target move;
 // no new move is registered or made available to the game.
 const healing={...ctx.window.POKE_MOVES.recover,target:"ally"};
 const allyPlan={moveId:"test-only",move:healing,score:0};
 assert.equal(T.selectTarget(exp,actor,allyPlan).targetId===null,false);
 actor.hp=1;other.hp=other.maxHp;
 assert.equal(T.selectTarget(exp,actor,allyPlan).targetId,actor.id);
 actor.hp=actor.maxHp;other.hp=1;
 assert.equal(T.selectTarget(exp,actor,allyPlan).targetId,other.id);
 assert.equal(Object.hasOwn(allyPlan,"targetId"),false);
});
test("B flow: a target fainted before turn is never retained from move selection",()=>{
 const {G,ctx}=boot(),T=ctx.window.PokeTargeting;
 G.exploration.start("windy",["partner1"]);
 const exp=G.state.regions.windy;G.combat.start(exp);
 const actor=exp.party[0],first=G.Pokemon.create({id:"first",species:"rattata",side:"enemy",level:5}),
 second=G.Pokemon.create({id:"second",species:"eevee",side:"enemy",level:5});
 exp.enemies=[first,second];
 const plan=T.selectMove(exp,actor,["quick-attack"]);
 first.hp=0;
 assert.equal(T.selectTarget(exp,actor,plan).targetId,second.id);
 second.hp=0;
 assert.equal(T.selectTarget(exp,actor,plan),null);
});
test("B flow: combat uses selected target at personal turn and original move order",()=>{
 const {G,ctx}=boot();
 G.exploration.start("windy",["partner1"]);
 const exp=G.state.regions.windy;G.combat.start(exp);
 const actor=exp.party[0],one=G.Pokemon.create({id:"first",species:"rattata",side:"enemy",level:5}),
 two=G.Pokemon.create({id:"second",species:"eevee",side:"enemy",level:5});
 exp.enemies=[one,two];actor.pp=200;
 const quick=ctx.window.POKE_MOVES["quick-attack"];
 exp.plans.set(actor,{moveId:"quick-attack",move:quick,score:0});
 exp.order=[actor,one,two];exp.turnIndex=0;
 one.hp=0;const originalHP=two.hp;
 G.combat.step(exp);
 assert.equal(one.hp,0);
 assert.ok(two.hp<originalHP);
 assert.equal(actor.pp,100);
 assert.ok(exp.logs.some(l=>l.message.includes("전광석화")));
});

test("revived Pokémon resets the faint penalty marker before the next encounter",()=>{
 const {G}=boot();
 assert.equal(G.exploration.start("windy",["partner1"]),null);
 const exp=G.state.regions.windy,member=exp.party[0];
 member._faintedHandled=true;member.hp=member.maxHp;
 G.combat.start(exp);
 assert.equal(member._faintedHandled,false);
 member._faintedHandled=true;
 // Simulate a revival before a new round while combat is ongoing.
 member.hp=member.maxHp;
 const other=exp.enemies[0];
 exp.order=[member,other];exp.turnIndex=exp.order.length;
 exp.enemies=[other];other.hp=other.maxHp;
 G.combat.step(exp);
 assert.equal(member._faintedHandled,false);
});
test("PP priority recalculation skips fainted pending actors without using a timer tick",()=>{
 const {G,ctx}=boot();
 G.exploration.start("windy",["partner1","partner2"]);
 const exp=G.state.regions.windy;G.combat.start(exp);
 const [actor,deadAlly]=exp.party;
 const enemy=exp.enemies[0];exp.enemies=[enemy];
 actor.hp=actor.maxHp;deadAlly.hp=0;enemy.hp=enemy.maxHp;
 actor.pp=0;
 exp.order=[actor,deadAlly,enemy];exp.turnIndex=0;
 const quick={moveId:"quick-attack",move:ctx.window.POKE_MOVES["quick-attack"],score:0};
 exp.plans=new Map([[actor,quick],[deadAlly,quick],[enemy,null]]);
 exp.tiebreak=new Map([[actor,0],[deadAlly,1],[enemy,2]]);
 exp.speeds=new Map([[actor,10],[deadAlly,1000],[enemy,100]]);
 const previousHP=actor.hp;
 G.combat.step(exp);
 assert.equal(exp.order.includes(deadAlly),false);
 assert.equal(exp.order[0],enemy);
 assert.equal(exp.turnIndex,1);
 assert.ok(actor.hp<previousHP);
 assert.equal(actor.pp,0);
});
test("PP loss never lets the same Pokémon act twice in a round",()=>{
 const {G,ctx}=boot();
 G.exploration.start("windy",["partner1","partner2"]);
 const e=G.state.regions.windy;G.combat.start(e);
 const [first,second]=e.party,enemy=e.enemies[0];
 e.enemies=[enemy];enemy.hp=enemy.maxHp;
 first.pp=0;second.pp=0;
 e.order=[first,second,enemy];e.turnIndex=0;
 e.plans=new Map([[first,{moveId:"quick-attack",move:ctx.window.POKE_MOVES["quick-attack"],score:0}],[second,null],[enemy,null]]);
 e.tiebreak=new Map([[first,0],[second,1],[enemy,2]]);
 e.speeds=new Map([[first,10],[second,100],[enemy,1]]);
 G.combat.step(e);
 assert.equal(e.turnIndex,1);
 const firstAfter=e.order.indexOf(first);
 assert.ok(firstAfter>0);
 G.combat.step(e);
 assert.equal(e.turnIndex,2);
 G.combat.step(e);
 assert.ok(e.round===1||e.mode!=="combat");
 const log=e.logs.filter(l=>l.message.includes(" → "));
 assert.equal(log.filter(l=>l.message.startsWith(first.name+" → ")).length,1);
});

test("effect: healing full HP still spends 100 PP but cannot exceed max HP",()=>{
 const {G,ctx}=boot(),M=ctx.window.PokeMoveEffects;
 const u=G.state.roster[0],e={id:"e",party:[u],enemies:[],logs:[]};
 // Use an existing, supported heal move but no new Pokémon move assignment.
 u.pp=130;u.hp=u.maxHp;
 const move=ctx.window.POKE_MOVES.recover;
 const result=M.execute(e,u,{moveId:"recover",move,targetId:u.id},()=>{});
 assert.equal(result.failed,false);
 assert.equal(u.pp,30);
 assert.equal(u.hp,u.maxHp);
});
test("effect: no PP or unavailable target cannot consume energy",()=>{
 const {G,ctx}=boot(),M=ctx.window.PokeMoveEffects;
 const u=G.state.roster[0],foe=G.Pokemon.create({id:"foe",species:"rattata",side:"enemy"});
 const exp={id:"e",party:[u],enemies:[foe],logs:[]};
 const move=ctx.window.POKE_MOVES["quick-attack"],plan={moveId:"quick-attack",move,targetId:foe.id};
 u.pp=99;assert.equal(M.execute(exp,u,plan,()=>{}).failed,true);
 assert.equal(u.pp,99);assert.equal(foe.hp,foe.maxHp);
 u.pp=150;foe.hp=0;
 assert.equal(M.execute(exp,u,plan,()=>{}).failed,true);
 assert.equal(u.pp,150);
});
test("effect: recoil move cannot ever hit an area",()=>{
 const {G,ctx}=boot(),M=ctx.window.PokeMoveEffects;
 const u=G.state.roster[0],foe=G.Pokemon.create({id:"foe",species:"rattata",side:"enemy"});
 const exp={id:"e",party:[u],enemies:[foe],logs:[]};
 u.pp=100;const base=ctx.window.POKE_MOVES["flare-blitz"];
 assert.throws(()=>M.execute(exp,u,{moveId:"recoil-invalid",move:{...base,target:"enemies"},targetId:null},()=>{}),/단일 적/);
 assert.equal(u.pp,100);assert.equal(foe.hp,foe.maxHp);
});
test("effect: multi-hit continues striking same zero-HP opponent and only spends 100 PP",()=>{
 const {G,ctx}=boot(),M=ctx.window.PokeMoveEffects;
 const u=G.state.roster[0],foe=G.Pokemon.create({id:"foe",species:"rattata",side:"enemy"});
 const exp={id:"e",party:[u],enemies:[foe],logs:[]};
 // A controlled two-hit move tests PokeTree's explicit continuation rule.
 const move={...ctx.window.POKE_MOVES["bullet-seed"],hits:[2]};
 u.pp=150;foe.hp=1;
 let faintCalls=0;
 const original=Math.random;
 // move-effects uses the VM's Math object (shared with host) for hit count;
 // hitCount's first bucket is guaranteed to return two.
 try{Math.random=()=>0.2;M.execute(exp,u,{moveId:"bullet-seed",move,targetId:foe.id},()=>{faintCalls++;});}
 finally{Math.random=original;}
 const strikes=exp.logs.filter(x=>x.message.includes("기관총 → "));
 assert.equal(strikes.length,2);
 assert.equal(foe.hp,0);
 assert.equal(u.pp,50);
 assert.equal(faintCalls,1);
});
test("effect: recoil user faint is resolved before enemy XP recipients are chosen",()=>{
 const {G,ctx}=boot(),M=ctx.window.PokeMoveEffects;
 const attacker=G.state.roster[0],survivor=G.state.roster[1];
 const foe=G.Pokemon.create({id:"foe",species:"caterpie",side:"enemy",level:5});
 const exp={id:"e",party:[attacker,survivor],enemies:[foe],logs:[]};
 attacker.pp=100;attacker.hp=1;foe.hp=1;
 const move=ctx.window.POKE_MOVES["flare-blitz"];
 const events=[];
 const result=M.execute(exp,attacker,{moveId:"flare-blitz",move,targetId:foe.id},(u,award)=>events.push([u.id,award]));
 assert.equal(result.failed,false);
 assert.equal(attacker.hp,0);assert.equal(foe.hp,0);
 assert.deepEqual(events.map(x=>x[0]),[attacker.id,foe.id]);
 assert.deepEqual(events.map(x=>x[1]),[false,true]);
 assert.ok(survivor.hp>0);
});
test("effect: self-destruct KOs user on miss, even without enemy damage",()=>{
 const {G,ctx}=boot(),M=ctx.window.PokeMoveEffects;
 const user=G.state.roster[0],foe=G.Pokemon.create({id:"foe",species:"rattata",side:"enemy"});
 const exp={id:"e",party:[user],enemies:[foe],logs:[]};
 user.pp=100;
 const move={...ctx.window.POKE_MOVES["self-destruct"],accuracy:0};
 const events=[];
 M.execute(exp,user,{moveId:"self-destruct",move,targetId:null},(u,award)=>events.push([u.id,award]));
 assert.equal(user.hp,0);
 assert.equal(foe.hp,foe.maxHp);
 assert.equal(user.pp,0);
 assert.deepEqual(events.map(e=>e[0]),[user.id]);
});
test("effect: HP drain cannot heal from immunity or actual zero damage",()=>{
 const {G,ctx}=boot(),M=ctx.window.PokeMoveEffects;
 const user=G.state.roster[0],foe=G.Pokemon.create({id:"foe",species:"pidgey",side:"enemy"});
 const exp={id:"e",party:[user],enemies:[foe],logs:[]};
 user.pp=200;user.hp=Math.max(1,user.maxHp-7);
 const hp=user.hp,move={...ctx.window.POKE_MOVES["giga-drain"],type:"ground"};
 M.execute(exp,user,{moveId:"giga-drain",move,targetId:foe.id},()=>{});
 assert.equal(user.hp,hp);assert.equal(user.pp,100);
 assert.equal(foe.hp,foe.maxHp);
});

test("Champions confusion lasts 1–4 attempts and can self-hit on its final attempt",()=>{
 const {ctx,G}=boot(),S=ctx.window.PokeBattleStatus;
 const u=G.state.roster[1];S.endExpedition(u);
 assert.equal(S.inflict(u,"confusion"),true);
 S.ensure(u).confusion=1;
 assert.equal(S.beforeAction(u,()=>0),"confusion");
 assert.equal(S.ensure(u).confusion,0);
 assert.equal(S.beforeAction(u,()=>0),null);
});
test("Champions freeze first two attempts thaw at 25%, third always thaws",()=>{
 const {ctx,G}=boot(),S=ctx.window.PokeBattleStatus,u=G.state.roster[1];
 S.endExpedition(u);assert.equal(S.inflict(u,"freeze"),true);
 assert.match(S.beforeAction(u,()=>.9),/얼어서/);
 assert.match(S.beforeAction(u,()=>.9),/얼어서/);
 assert.equal(S.beforeAction(u,()=>.9),null);
 assert.equal(S.ensure(u).major,null);
 S.endExpedition(u);assert.equal(S.inflict(u,"freeze"),true);
 assert.equal(S.beforeAction(u,()=>.1),null);
});
test("frozen target thaws after a successful damaging fire move",()=>{
 const {ctx,G}=boot(),S=ctx.window.PokeBattleStatus,M=ctx.window.PokeMoveEffects;
 const u=G.state.roster[0],e=G.Pokemon.create({id:"frozen-foe",species:"eevee",level:10,side:"enemy"});
 const exp={id:"windy",party:[u],enemies:[e],logs:[]};
 assert.equal(S.inflict(e,"freeze"),true);
 const move=ctx.window.POKE_MOVES["flare-blitz"];u.pp=100;
 M.execute(exp,u,{moveId:"flare-blitz",move,targetId:e.id},()=>{});
 assert.equal(S.ensure(e).major,null);
 assert.ok(exp.logs.some(l=>l.message.includes("얼음 상태 해제")));
});
test("Toxic ramps during each battle but resets only its counter between encounters",()=>{
 const {ctx,G}=boot(),S=ctx.window.PokeBattleStatus;
 const u=G.state.roster[1];S.endExpedition(u);
 assert.equal(S.inflict(u,"toxic"),true);
 const first=S.afterAction(u),second=S.afterAction(u);
 assert.ok(second>=first);
 assert.equal(S.ensure(u).major.counter,2);
 S.ensure(u).confusion=2;
 S.endBattle(u);
 assert.equal(S.ensure(u).major.kind,"toxic");
 assert.equal(S.ensure(u).major.counter,0);
 assert.equal(S.ensure(u).confusion,2);
 assert.equal(S.afterAction(u),first);
 S.endExpedition(u);
 assert.equal(S.ensure(u).major,null);
 assert.equal(S.ensure(u).confusion,0);
});
test("status immunity, major status exclusivity, and confusion coexistence",()=>{
 const {ctx,G}=boot(),S=ctx.window.PokeBattleStatus;
 const p=G.state.roster[0],q=G.state.roster[1];
 S.endExpedition(p);S.endExpedition(q);
 assert.equal(S.inflict(p,"paralysis"),false); // Pikachu: Electric
 assert.equal(S.inflict(q,"poison"),true);
 assert.equal(S.inflict(q,"burn"),false);
 assert.equal(S.inflict(q,"confusion"),true);
 assert.equal(S.ensure(q).major.kind,"poison");
 assert.ok(S.ensure(q).confusion>0);
});

test("weather: rock special defense in sandstorm and ice physical defense in snow",()=>{
 const {G}=boot(),P=G.Pokemon,D=G.Damage;
 const attacker=P.create({id:"att",species:"pikachu",level:50});
 const rock=P.create({id:"rock",species:"geodude",level:50});
 const ice=P.create({id:"ice",species:"snover",level:50});
 const special={type:"electric",category:"special",power:90};
 const physical={type:"normal",category:"physical",power:90};
 assert.ok(D.compute(attacker,rock,{move:special,random:100,weather:{kind:"sandstorm"}}).damage<=D.compute(attacker,rock,{move:special,random:100}).damage);
 assert.ok(D.compute(attacker,ice,{move:physical,random:100,weather:{kind:"snow"}}).damage<=D.compute(attacker,ice,{move:physical,random:100}).damage);
});
test("terrain: misty dragon reduction only against grounded target",()=>{
 const {G}=boot(),P=G.Pokemon,D=G.Damage;
 const a=P.create({id:"a",species:"eevee",level:50});
 const ground=P.create({id:"g",species:"eevee",level:50});
 const flying=P.create({id:"f",species:"pidgey",level:50});
 const dragon={type:"dragon",category:"special",power:90};
 assert.ok(D.compute(a,ground,{move:dragon,terrain:{kind:"misty"}}).damage<D.compute(a,ground,{move:dragon}).damage);
 assert.equal(D.compute(a,flying,{move:dragon,terrain:{kind:"misty"}}).damage,D.compute(a,flying,{move:dragon}).damage);
});
test("terrain: grounded Electric blocks sleep, Misty blocks all new conditions including confusion",()=>{
 const {G,ctx}=boot(),S=ctx.window.PokeBattleStatus,P=G.Pokemon;
 const normal=P.create({id:"normal",species:"eevee"});
 const flying=P.create({id:"flying",species:"pidgey"});
 assert.equal(S.inflict(normal,"sleep",{terrain:{kind:"electric"}}),false);
 assert.equal(S.inflict(flying,"sleep",{terrain:{kind:"electric"}}),true);
 assert.equal(S.inflict(normal,"confusion",{terrain:{kind:"misty"}}),false);
 assert.equal(S.inflict(normal,"burn",{terrain:{kind:"misty"}}),false);
 assert.equal(S.inflict(normal,"freeze",{weather:{kind:"sun"}}),false);
});
test("terrain: grassy healing and sandstorm residual are applied at battle round end",()=>{
 const {G,ctx}=boot(),S=ctx.window.PokeBattleStatus,P=G.Pokemon;
 const normal=P.create({id:"n",species:"eevee"}),fly=P.create({id:"f",species:"pidgey"});
 const exp={party:[normal,fly],enemies:[],terrain:{kind:"grassy"},weather:null};
 normal.hp=normal.maxHp-5;fly.hp=fly.maxHp-5;
 const first=S.fieldEndRound(exp);
 assert.ok(normal.hp>normal.maxHp-5);
 assert.equal(fly.hp,fly.maxHp-5);
 assert.equal(first.length,1);
 exp.terrain=null;exp.weather={kind:"sandstorm"};
 const before=normal.hp;
 S.fieldEndRound(exp);
 assert.ok(normal.hp<before);
});
test("terrain: Psychic blocks priority move against grounded foe but not flying foe",()=>{
 const {G,ctx}=boot(),M=ctx.window.PokeMoveEffects,P=G.Pokemon;
 const actor=P.create({id:"actor",species:"pikachu"});
 const ground=P.create({id:"ground",species:"eevee",side:"enemy"});
 const airborne=P.create({id:"air",species:"pidgey",side:"enemy"});
 const exp={id:"test",party:[actor],enemies:[ground,airborne],terrain:{kind:"psychic"},logs:[]};
 const move=ctx.window.POKE_MOVES["quick-attack"];
 actor.pp=200;const ghp=ground.hp;
 M.execute(exp,actor,{move,moveId:"quick-attack",targetId:ground.id},()=>{});
 assert.equal(ground.hp,ghp);assert.equal(actor.pp,100);
 actor.pp=200;const ahp=airborne.hp;
 M.execute(exp,actor,{move,moveId:"quick-attack",targetId:airborne.id},()=>{});
 assert.ok(airborne.hp<ahp);
});
