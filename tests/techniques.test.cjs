const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
function boot(){
 const store=new Map();
 const ctx={window:{localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},addEventListener(){}},performance:{now:()=>0},Date,console,Set,Map,Math};
 const context=vm.createContext(ctx);
 const scripts=["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/simple-damage-moves.js","data/rank-moves.js","data/status-moves.js","data/drain-moves.js","data/heal-moves.js","data/recoil-moves.js","data/moves.js","data/imported-techniques.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"];
 for(const script of scripts)vm.runInContext(fs.readFileSync(path.join(__dirname,"../game",script),"utf8"),context,{filename:script});
 return {G:ctx.window.PokeTree,store};
}
test("individual learning and equipment do not share state or reset PP",()=>{
 const {G}=boot(),T=G.techniques,u=G.state.roster[0],other=G.state.roster[1];
 assert.ok(u.learnedMoves.includes("thunderbolt"));assert.ok(!other.learnedMoves.includes("thunderbolt"));
 u.pp=86;assert.equal(T.equip(u,null,1),null);assert.equal(u.pp,86);
 assert.equal(T.equip(u,"unknown",0),"습득하지 않은 기술입니다.");
 assert.equal(T.equip(u,"quick-attack",0),null);
 assert.match(T.equip(u,"quick-attack",1),/같은 기술/);
});
test("levelup grants pinned source moves without demo learnset injection",()=>{
 const {G}=boot(),T=G.techniques;
 const beginner=T.levelMoves("bulbasaur",1),advanced=T.levelMoves("bulbasaur",15);
 assert.ok(advanced.length>beginner.length,"original Bulbasaur level-up data must advance");
 const newcomer=G.Pokemon.create({id:"new",species:"bulbasaur",level:15});
 T.initialize(newcomer);
 assert.deepEqual([...newcomer.learnedMoves].sort(),[...advanced].sort());
 const other=G.Pokemon.create({id:"low",species:"bulbasaur",level:1});
 T.initialize(other);
 assert.deepEqual([...other.learnedMoves].sort(),[...beginner].sort());
 G.Pokemon.grantExperience(other,G.Experience.total(15,other.growth));
 for(const id of advanced)assert.ok(other.learnedMoves.includes(id),id);
 assert.equal(T.sourceInfo("bulbasaur").missing,false);
});
test("expedition equipment allowed only in exploration, not combat/recovery; item TM needs recall",()=>{
 const {G}=boot(),T=G.techniques,u=G.state.roster[0];
 T.unlock("thunderbolt");
 assert.equal(G.exploration.start("windy",[u.id]),null);
 assert.equal(T.equip(u,null,0),null);
 assert.match(T.useTM(u,"thunderbolt"),/귀환/);
 const exp=G.state.regions.windy;exp.mode="combat";assert.match(T.equip(u,"quick-attack",0),/전투/);
 exp.mode="recovery";assert.match(T.equip(u,"quick-attack",0),/회복/);
 G.exploration.recall("windy");
 const compatible=T.tmCompatibility(u.species,u.form).includes("thunderbolt");
 assert.equal(T.useTM(u,"thunderbolt"),compatible?null:"이 포켓몬과 호환되지 않는 기술머신입니다.");
});
test("material codex ???, recipe states, irreversible unlock and duplicate immunity",()=>{
 const {G}=boot(),T=G.techniques;
 assert.equal(T.recipeStatus("gust"),"locked");
 assert.equal(T.materialDisplay("leaf"),"???");
 T.discover("leaf",1);assert.equal(T.recipeStatus("gust"),"unavailable");
 T.discover("leaf",3);assert.equal(T.recipeStatus("gust"),"available");
 assert.equal(T.craft("gust"),null);assert.equal(T.recipeStatus("gust"),"unavailable");
 assert.equal(G.state.materials.leaf,0);assert.ok(T.materialDisplay("leaf").includes("시연용"));
 assert.match(T.craft("gust"),/제작할 수 없는/);
 assert.equal(T.unlock("gust"),false);
});
test("loot from expedition is credited only on recall, duplicate TMs excluded",()=>{
 const {G}=boot(),T=G.techniques,u=G.state.roster[0];
 G.exploration.start("windy",[u.id]);
 u.bag.push("material:ore","tm:gust");
 assert.equal(G.state.materials.ore,undefined);G.exploration.recall("windy");
 assert.equal(G.state.materials.ore,1);assert.equal(G.state.technicalMachines.includes("gust"),true);
 assert.equal(T.demoFind({actions:2,party:[{bag:[]}]}).startsWith("tm:gust"),false);
});
test("save/load restores learned skills and TM codex while excluding runtime combat",()=>{
 const {G,store}=boot(),T=G.techniques,u=G.state.roster[0],S=G.saveGame;
 T.discover("ore",4);T.unlock("gust");T.equip(u,null,1);
 assert.equal(S.save(),true);const saved=store.get("poketree-save-v1");
 assert.ok(saved);
 G.state.materials.ore=0;G.state.technicalMachines=[];u.moves=["thunderbolt"];
 assert.equal(S.restore(JSON.parse(saved)),true);
 assert.equal(G.state.materials.ore,4);
 assert.equal(G.state.technicalMachines.includes("gust"),true);
 assert.equal(G.state.roster[0].moves.includes("thunderbolt"),false);
 assert.equal(G.state.roster[0].expedition,null);
});

test("slot 2 remains in slot 2 through a save/restore, and tool guard blocks expedition",()=>{
 const {G}=boot(),T=G.techniques,u=G.state.roster[0];
 assert.equal(T.equip(u,null,0),null);
 assert.equal(u.moves[0],null);assert.equal(u.moves[1],"thunderbolt");
 const raw=JSON.parse(JSON.stringify(G.saveGame.snapshot()));
 assert.equal(G.saveGame.restore(raw),true);
 assert.equal(G.state.roster[0].moves[0],null);
 assert.equal(G.state.roster[0].moves[1],"thunderbolt");
 assert.equal(G.exploration.start("windy",["partner1"]),null);
 assert.match(T.canEditTools(G.state.roster[0]),/귀환/);
 G.exploration.recall("windy");assert.equal(T.canEditTools(G.state.roster[0]),null);
});

test("save restore does not add null entries to learned moves; duplicate TM pending in any region excluded",()=>{
 const {G}=boot(),T=G.techniques,u=G.state.roster[0];
 T.equip(u,null,0);G.saveGame.restore(JSON.parse(JSON.stringify(G.saveGame.snapshot())));
 assert.ok(!G.state.roster[0].learnedMoves.includes(null));
 G.exploration.start("windy",["partner1"]);
 G.state.roster[0].bag.push("tm:gust");
 const choice=T.demoFind({actions:2,party:[]});assert.notEqual(choice,"tm:gust");
});

test("unimplemented original moves may be learned and saved, but never equipped",()=>{
 const {G}=boot(),T=G.techniques,u=G.state.roster[0];
 const id=Object.keys(T.imported.moves).find(key=>!T.executable(key));
 assert.ok(id,"test requires at least one original move without an engine effect");
 const oldMoves=[...u.moves];
 assert.equal(T.learn(u,id),null);
 assert.ok(u.learnedMoves.includes(id));
 assert.match(T.equip(u,id,0),/전투 효과가 구현되지 않은/);
 assert.deepEqual([...u.moves],oldMoves);
 const snapshot=JSON.parse(JSON.stringify(G.saveGame.snapshot()));
 assert.equal(G.saveGame.restore(snapshot),true);
 assert.ok(G.state.roster[0].learnedMoves.includes(id));
 assert.deepEqual([...G.state.roster[0].moves],oldMoves);
});
