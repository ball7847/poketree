const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
function boot(){
  const ctx={window:{},performance:{now:()=>0},Date,console,Set,Map,Math};
  const cx=vm.createContext(ctx);
  for(const p of ["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"]){
    vm.runInContext(fs.readFileSync(path.join(__dirname,"../game",p),"utf8"),cx,{filename:p});
  }
  return {G:ctx.window.PokeTree,W:ctx.window};
}
test("seven custom moves have approved IDs, stats, tags and separate per-class numbering",()=>{
 const {W}=boot();
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
