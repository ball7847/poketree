const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
function boot(){
  const ctx={window:{},performance:{now:()=>0},Date,console,Set,Map,Math};
  const cx=vm.createContext(ctx);
  for(const p of ["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","engine/move-tags.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"]){
    vm.runInContext(fs.readFileSync(path.join(__dirname,"../game",p),"utf8"),cx,{filename:p});
  }
  return {G:ctx.window.PokeTree,W:ctx.window};
}
test("ten custom moves are the ONLY executable IDs with approved stats/tags",()=>{
 const {W}=boot();
 assert.equal(Object.keys(W.POKE_MOVES).length,10);
 assert.equal(W.POKE_MOVES["giga-drain"],undefined);
 assert.equal(W.POKE_MOVES["bullet-seed"],undefined);
 assert.equal(W.POKE_MOVES["quick-attack"],undefined);
 const expected=[
 ["M010101","몸통박치기","physical",40,100,0,["접촉"]],
 ["M010102","막치기","physical",40,100,0,["접촉"]],
 ["M010103","할퀴기","physical",40,100,0,["접촉","베기"]],
 ["M010104","전광석화","physical",40,100,1,["접촉","선공기"]],
 ["M010201","에코보이스","special",30,100,0,["비접촉","소리","연속"]],
 ["M010105","더블어택","physical",35,90,0,["접촉","연속"]],
 ["M010106","풀베기","physical",50,95,0,["접촉","베기","급소"]]
 ];
 for(const [id,name,category,power,accuracy,priority,tags] of expected){
   const m=W.POKE_MOVES[id];assert.ok(m,id);assert.equal(m.name,name);
   assert.equal(m.type,"normal");assert.equal(m.category,category);assert.equal(m.power,power);
   assert.equal(m.accuracy,accuracy);assert.equal(m.priority,priority);assert.deepEqual([...m.tags],tags);
 }
 assert.equal(W.POKE_MOVES.M010201.fixedHits,2);
 assert.equal(W.POKE_MOVES.M010105.fixedHits,2);
 assert.deepEqual([...W.POKE_MOVES.M010106.criticalAgainstTypes],["grass"]);
});
test("source aliases grant M IDs without removing original learned move IDs",()=>{
 const {G,W}=boot(),T=G.techniques;
 for(const [old,id] of Object.entries(W.POKE_MOVE_CUSTOM_MAP)){
   assert.ok(T.imported.moves[old],"missing original source: "+old);
   assert.ok(T.knownMove(id)&&T.executable(id));
 }
 const bulba=G.Pokemon.create({id:"new",species:"bulbasaur",level:50});
 T.initialize(bulba);
 for(const [old,id] of Object.entries(W.POKE_MOVE_CUSTOM_MAP)){
   if(bulba.learnedMoves.includes(old))assert.ok(bulba.learnedMoves.includes(id),id);
 }
});
test("fixed two-hit attacks never use random hit distribution",()=>{
 const {W}=boot();
 assert.equal(W.PokeMoveEffects.hitCount(W.POKE_MOVES.M010201),2);
 assert.equal(W.PokeMoveEffects.hitCount(W.POKE_MOVES.M010105),2);
});
test("Cut guaranteed crit applies only against grass-type targets",()=>{
 const {G,W}=boot(),attacker=G.Pokemon.create({id:"a",species:"eevee",level:20}),grass=G.Pokemon.create({id:"g",species:"bulbasaur",level:20}),other=G.Pokemon.create({id:"o",species:"charmander",level:20});
 const roll=()=>.99;
 assert.equal(W.PokeDamage.roll(attacker,grass,{move:W.POKE_MOVES.M010106,rng:roll}).critical,true);
 assert.equal(W.PokeDamage.roll(attacker,other,{move:W.POKE_MOVES.M010106,rng:roll}).critical,false);
});
test("combat loadout changes immediately but current round keeps its original skill choices",()=>{
 const {G,W}=boot(),u=G.state.roster[0],T=G.techniques;
 assert.equal(G.exploration.start("windy",[u.id]),null);
 const exp=G.state.regions.windy;G.combat.start(exp);u.pp=100;
 const original=[...exp.roundMoves.get(u)];
 assert.equal(T.equip(u,null,0),null);
 assert.deepEqual([...exp.roundMoves.get(u)],original);
 assert.equal(T.canEdit(u),null);
 assert.equal(T.canEditTools(u)===null,false);
});

test("removed original move effects remain in learnsets but cannot be equipped or reloaded",()=>{
 const {G,W}=boot(),T=G.techniques,unit=G.state.roster[0];
 assert.ok(T.imported.moves["giga-drain"]&&T.imported.moves["bullet-seed"]);
 assert.equal(T.executable("giga-drain"),false);
 assert.equal(T.learn(unit,"giga-drain"),null);
 assert.match(T.equip(unit,"giga-drain",0),/구현되지 않은/);
 const saved=JSON.parse(JSON.stringify(G.saveGame.snapshot()));
 saved.roster[0].learnedMoves.push("giga-drain","bullet-seed");
 saved.roster[0].moves=["giga-drain","M010104"];
 assert.equal(G.saveGame.restore(saved),true);
 const after=G.state.roster[0];
 assert.ok(after.learnedMoves.includes("giga-drain")&&after.learnedMoves.includes("bullet-seed"));
 assert.deepEqual([...after.moves],[null,"M010104"]);
 assert.equal(after.level,unit.level);
});
test("all demo starter moves are user-approved M IDs",()=>{
 const {G,W}=boot();
 assert.equal(Object.keys(W.POKE_MOVES).length,10);
 for(const u of G.state.roster)for(const id of u.moves)assert.ok(Object.hasOwn(W.POKE_MOVES,id));
});

test("starter loadouts match original level requirements (no level-5 freebies)",()=>{
 const {G,W}=boot();
 for(const u of G.state.roster){
   const eligible=G.techniques.levelMoves(u.species,u.level,u.form);
   for(const m of u.moves)assert.ok(eligible.includes(m),u.species+" incorrectly equipped "+m);
 }
 assert.deepEqual([...G.state.roster[1].moves],["M010101"]);
 assert.deepEqual([...G.state.roster[2].moves],["M010101"]);
});
test("TM learning preserves original ID and grants executable mapped M ID exactly once",()=>{
 const {G,W}=boot(),T=G.techniques;
 // Rattata uses the pinned BDSP table, which permits the original Cut TM.
 const unit=G.Pokemon.create({id:"tm-test",species:"rattata",level:5,side:"ally"});
 T.initialize(unit);
 assert.ok(T.tmCompatibility(unit.species,unit.form).includes("cut"));
 G.state.technicalMachines.push("cut");
 assert.equal(T.useTM(unit,"cut"),null);
 assert.ok(unit.learnedMoves.includes("cut")&&unit.learnedMoves.includes("M010106"));
 assert.equal(T.useTM(unit,"cut"),null);
 assert.equal(unit.learnedMoves.filter(x=>x==="M010106").length,1);
 assert.equal(T.equip(unit,"M010106",0),null);

});
test("invisible tab elapsed time never disappears; pending actions catch up in batches",()=>{
 const {G}=boot();
 const loc=G.db.regions.windy.locations.road;
 loc.actions=[{type:"walk",weight:100}];
 assert.equal(G.exploration.start("windy",["partner1"]),null);
 const exp=G.state.regions.windy;
 const start=G.state.lastTime;
 G.exploration.frame(start+3_000*250);
 assert.equal(exp.actions,100);
 assert.ok(exp.remainingMs<0);
 G.exploration.frame(start+3_000*250);
 G.exploration.frame(start+3_000*250);
 assert.equal(exp.actions,250);
 assert.equal(exp.remainingMs,3_000);
});

test("evolution keeps learned history and learns eligible new form levels without custom interval",()=>{
 const {G}=boot(),T=G.techniques;
 const p=G.Pokemon.create({id:"evolve-test",species:"bulbasaur",level:16});
 T.initialize(p);
 const before=[...p.learnedMoves];
 assert.equal(T.evolve(p,"ivysaur"),null);
 for(const id of before)assert.ok(p.learnedMoves.includes(id));
 for(const id of T.levelMoves("ivysaur",16))assert.ok(p.learnedMoves.includes(id));
});

test("all approved damaging moves execute in combat, cost 100 PP and deal damage",()=>{
 const {G,W}=boot(),M=W.PokeMoveEffects,approved=Object.keys(W.POKE_MOVES).filter(id=>W.POKE_MOVES[id].category!=="status");
 const old=Math.random;
 try{
   Math.random=()=>0.01; // deterministic hit and damage rolls
   for(const id of approved){
     const user=G.Pokemon.create({id:"actor-"+id,species:"eevee",level:50,side:"ally"});
     const foe=G.Pokemon.create({id:"target-"+id,species:"snorlax",level:50,side:"enemy"});
     const exp={id:"test",party:[user],enemies:[foe],logs:[],terrain:null,weather:null};
     user.pp=100;const previous=foe.hp;
     const outcome=M.execute(exp,user,{moveId:id,move:W.POKE_MOVES[id],targetId:foe.id},()=>{});
     assert.equal(outcome.failed,false,id);
     assert.equal(user.pp,0,id);
     assert.ok(foe.hp<previous,id+" must inflict damage");
     const hits=exp.logs.filter(v=>v.message.includes(" → ")).length;
     assert.equal(hits,W.POKE_MOVES[id].fixedHits||1,id+" hit count");
   }
 }finally{Math.random=old;}
});
test("mid-battle equipment switches become effective at the next round only",()=>{
 const {G}=boot(),T=G.techniques,u=G.state.roster[0];
 assert.equal(T.learn(u,"M010101"),null);
 assert.equal(G.exploration.start("windy",[u.id]),null);
 const exp=G.state.regions.windy;G.combat.start(exp);
 for(const foe of exp.enemies){foe.maxHp=10000;foe.hp=10000;foe.attack=1;}
 assert.deepEqual([...exp.roundMoves.get(u)],["M010104"]);
 assert.equal(T.equip(u,"M010101",0),null);
 assert.deepEqual([...exp.roundMoves.get(u)],["M010104"]);
 let n=0;
 while(exp.round===1&&n++<20)G.combat.step(exp);
 assert.equal(exp.round,2);
 assert.deepEqual([...exp.roundMoves.get(u)],["M010101"]);
});

test("three new moves have the exact approved data and aliases",()=>{
 const {W}=boot(),m=W.POKE_MOVES;
 assert.deepEqual(Object.keys(m).sort(),["M010101","M010102","M010103","M010104","M010105","M010106","M010201","M010301","M120101","M120301"].sort());
 for(const [id,type,category,power,accuracy,target,tags,key] of [
 ["M010301","normal","status",null,100,"enemies",["랭크다운","광역-상대"],"growl"],
 ["M120101","grass","physical",45,100,"enemy",["접촉"],"vine-whip"],
 ["M120301","grass","status",null,null,"self",["랭크업","자신"],"growth"]]){
 const x=m[id];assert.equal(x.type,type);assert.equal(x.category,category);assert.equal(x.power,power);assert.equal(x.accuracy,accuracy);assert.equal(x.target,target);assert.deepEqual([...x.tags],tags);assert.equal(W.POKE_MOVE_CUSTOM_MAP[key],id);
 }
});
test("Growl lowers all living opponents only, no HP damage, one PP payment and capped ranks",()=>{
 const {G,W}=boot(),S=W.PokeBattleStatus,M=W.PokeMoveEffects;
 const make=(id,side)=>G.Pokemon.create({id,species:"bulbasaur",level:10,side});
 const user=make("u","ally"),ally=make("a","ally"),e1=make("e1","enemy"),e2=make("e2","enemy"),dead=make("dead","enemy");
 dead.hp=0;S.rank(e2,"attack",-6);const exp={id:"test",party:[user,ally],enemies:[e1,e2,dead],logs:[]};
 const hp=e1.hp,old=Math.random;user.pp=100;
 try{Math.random=()=>0;assert.equal(M.execute(exp,user,{move:W.POKE_MOVES.M010301,targetId:null},()=>{}).failed,false);}finally{Math.random=old;}
 assert.equal(user.pp,0);assert.equal(e1.hp,hp);
 assert.equal(S.ensure(e1).ranks.attack,-1);assert.equal(S.ensure(e2).ranks.attack,-6);
 for(const u of [user,ally,dead])assert.equal(S.ensure(u).ranks.attack,0);
});
test("Growth boosts both offensive ranks on self only, doubles in sun and respects cap",()=>{
 const {G,W}=boot(),S=W.PokeBattleStatus,M=W.PokeMoveEffects;
 const user=G.Pokemon.create({id:"u",species:"bulbasaur",level:10,side:"ally"});
 const foe=G.Pokemon.create({id:"e",species:"bulbasaur",level:10,side:"enemy"});
 const exp={id:"test",party:[user],enemies:[foe],logs:[],weather:null};
 for(const [weather,expected] of [[null,1],[{kind:"sun",remaining:3},3],[{kind:"rain",remaining:3},4],[{kind:"sun",remaining:3},6],[{kind:"sun",remaining:3},6]]){
 exp.weather=weather;user.pp=100;
 assert.equal(M.execute(exp,user,{move:W.POKE_MOVES.M120301,targetId:user.id},()=>{}).failed,false);
 assert.equal(user.pp,0);assert.equal(S.ensure(user).ranks.attack,expected);assert.equal(S.ensure(user).ranks.spAttack,expected);
 }
 assert.equal(S.ensure(foe).ranks.attack,0);assert.equal(S.ensure(foe).ranks.spAttack,0);
});
test("Bulbasaur TM override removes only three overlaps and preserves source, levels and other forms",()=>{
 const {G}=boot(),T=G.techniques,removed=["seed-bomb","take-down","solar-beam"];
 const original=T.imported.forms[1].machine;
 assert.equal(original.length,34);assert.equal(T.tmCompatibility("bulbasaur").length,31);
 for(const [id,level] of [["seed-bomb",18],["take-down",21],["solar-beam",36]]){
 assert.ok(original.includes(id));assert.ok(!T.tmCompatibility("bulbasaur").includes(id));assert.ok(T.levelMoves("bulbasaur",level).includes(id));assert.ok(!T.levelMoves("bulbasaur",level-1).includes(id));
 }
 for(const id of original.filter(x=>!removed.includes(x)))assert.ok(T.tmCompatibility("bulbasaur").includes(id));
 const p=G.Pokemon.create({id:"bulba",species:"bulbasaur",level:1,side:"ally"});T.initialize(p);
 for(const id of removed){G.state.technicalMachines.push(id);assert.match(T.useTM(p,id),/호환되지 않는/);}
 for(const [id,level] of [["M010301",1],["M120101",3],["M120301",6]]){assert.ok(T.levelMoves("bulbasaur",level).includes(id));if(level>1)assert.ok(!T.levelMoves("bulbasaur",level-1).includes(id));}
 for(const [species,s] of Object.entries(G.db.species))for(const [form,f] of Object.entries(s.forms)){if(species==="bulbasaur"&&form==="normal")continue;assert.deepEqual([...T.tmCompatibility(species,form)],[...(T.imported.forms[f.sourcePokemonId]?.machine||[])],species+"/"+form);}
});

test("tag compiler drives target, priority, hits, critical and rank without duplicated effect fields",()=>{
 const {W}=boot(),T=W.PokeMoveTags,R=W.POKE_MOVE_DEFINITIONS,M=W.POKE_MOVES;
 for(const [id,raw] of Object.entries(R)){
  assert.ok(!Object.hasOwn(raw,"target")&&!Object.hasOwn(raw,"effect"));
  assert.ok(Object.isFrozen(M[id])&&Object.isFrozen(M[id].tags));
  for(const tag of raw.tags)assert.equal(T.has(M[id],tag),true);
 }
 assert.equal(T.has(M.M010101,"접촉"),true);assert.equal(T.has(M.M010201,"비접촉"),true);
 assert.equal(T.has(M.M010103,"베기"),true);assert.equal(T.has(M.M010201,"소리"),true);
 assert.equal(T.compile({...R.M010301,tags:["랭크다운"]}).target,"enemy");
 const {priority,...normal}=R.M010104;assert.equal(T.compile({...normal,tags:["접촉"]}).priority,0);
});
test("tag compiler rejects conflicts, unknown/duplicate tags, missing details, and redundant overrides",()=>{
 const {W}=boot(),T=W.PokeMoveTags,R=W.POKE_MOVE_DEFINITIONS;
 for(const raw of [
 {...R.M010101,tags:["접촉","비접촉"]},{...R.M010101,tags:["접촉","접촉"]},
 {...R.M010101,tags:["unknown"]},{...R.M010301,tags:["랭크다운","자신","광역-상대"]},
 {...R.M010101,tags:["연속"]},{...R.M010101,tags:["급소"]},
 {...R.M010101,tags:["선공기"]},{...R.M010301,rank:undefined},
 {...R.M010101,target:"self"},{...R.M120301,conditions:{sun:{rank:{speed:2}}}}
 ])assert.throws(()=>T.compile(raw),/기술 태그 오류/);
});
