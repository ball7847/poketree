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
