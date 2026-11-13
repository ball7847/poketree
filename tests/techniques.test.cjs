const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
function boot(){
 const store=new Map();
 const ctx={window:{localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},addEventListener(){}},performance:{now:()=>0},Date,console,Set,Map,Math};
 const context=vm.createContext(ctx);
 const scripts=["data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/moves.js","data/techniques.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"];
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
test("levelup and new high level individual grant all eligible demo techniques",()=>{
 const {G}=boot(),u=G.Pokemon.create({id:"new",species:"pikachu",level:5});
 assert.equal(G.techniques.levelMoves(u.species,u.level).length,2);
 G.techniques.initialize(u);assert.ok(u.learnedMoves.includes("quick-attack"));assert.ok(u.learnedMoves.includes("thunderbolt"));
 const other=G.Pokemon.create({id:"low",species:"pikachu",level:1});
 G.techniques.initialize(other);assert.ok(!other.learnedMoves.includes("thunderbolt"));
 G.Pokemon.grantExperience(other,G.Experience.total(5,other.growth));
 assert.ok(other.learnedMoves.includes("thunderbolt"));
});
test("expedition equipment allowed only in exploration, not combat/recovery; item TM needs recall",()=>{
 const {G}=boot(),T=G.techniques,u=G.state.roster[0];
 T.unlock("thunderbolt");
 assert.equal(G.exploration.start("windy",[u.id]),null);
 assert.equal(T.equip(u,null,0),null);
 assert.match(T.useTM(u,"thunderbolt"),/귀환/);
 const exp=G.state.regions.windy;exp.mode="combat";assert.match(T.equip(u,"quick-attack",0),/전투/);
 exp.mode="recovery";assert.match(T.equip(u,"quick-attack",0),/회복/);
 G.exploration.recall("windy");assert.equal(T.useTM(u,"thunderbolt"),null);
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
