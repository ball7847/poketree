const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
function boot(){
 const store=new Map(),rng={value:0};
 const math=Object.create(Math);math.random=()=>rng.value;
 const ctx={window:{localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},addEventListener(){}},performance:{now:()=>0},Date,console,Set,Map,Math:math};
 const context=vm.createContext(ctx);
 for(const file of ["data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/moves.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"])
   vm.runInContext(fs.readFileSync(path.join(__dirname,"../game",file),"utf8"),context,{filename:file});
 return {G:ctx.window.PokeTree,rng,store};
}
test("six region specifications and two initially playable demos",()=>{
 const {G}=boot(),regions=Object.values(G.db.regions);
 assert.deepEqual(regions.map(r=>r.name),["바람의평원","미끌바위언덕","아삭사과숲","찌릿돌동굴","어둑시니숲","깊은굴"]);
 assert.deepEqual(regions.map(r=>r.levelRange.join("-")),["1-6","1-9","5-15","8-13","10-25","12-26"]);
 assert.deepEqual(regions.map(r=>r.mainTypes.join("/")),["노말/비행/벌레","땅/바위/물","비행/벌레/풀","땅/바위/전기","노말/악/고스트","땅/바위/강철"]);
 assert.deepEqual(Array.from(G.state.unlockedRegions),["windy","meadow"]);
 assert.equal(G.regions.isPlayable("windy"),true);
 assert.equal(G.regions.isPlayable("meadow"),true);
 assert.equal(G.regions.isPlayable("apple"),false);
 assert.equal(G.validateData().length,0);
 assert.match(G.exploration.start("apple",["partner1"]),/해금되지 않은/);
});
test("noncombat steps are party-scoped, threshold immediately unlocks next region",()=>{
 const {G,rng}=boot(),exp=G.state.regions.windy;
 assert.equal(G.exploration.start("windy",["partner1","partner2"]),null);
 rng.value=0;
 for(let t=1000;t<=3000;t+=1000)G.exploration.frame(t);
 assert.equal(exp.steps,1);
 rng.value=0.99;
 for(let t=4000;t<=6000;t+=1000)G.exploration.frame(t);
 assert.equal(exp.steps,2);
 for(let i=2;i<50;i++)G.regions.addStep("windy");
 assert.equal(exp.steps,50);
 assert.equal(G.regions.isUnlocked("apple"),true);
 assert.equal(G.regions.isPlayable("apple"),false);
 assert.match(G.exploration.start("apple",["partner3"]),/개발되지 않은/);
 G.exploration.recall("windy");
 assert.equal(exp.steps,0);
 assert.equal(G.regions.isUnlocked("apple"),true);
});
test("each route tracks its own progress and boss hook is not a regular battle win",()=>{
 const {G}=boot();
 G.exploration.start("windy",["partner1"]);
 G.exploration.start("meadow",["partner2"]);
 for(let i=0;i<80;i++)G.regions.addStep("meadow");
 assert.equal(G.state.regions.windy.steps,0);
 assert.equal(G.regions.isUnlocked("spark"),true);
 assert.equal(G.regions.isUnlocked("deep"),false);
 assert.equal(G.regions.bossDefeated("spark"),true);
 assert.equal(G.regions.isUnlocked("deep"),true);
 assert.equal(G.regions.bossDefeated("spark"),false);
});
test("combat turn does not increment steps; victory once does",()=>{
 const {G}=boot(),exp=G.state.regions.windy;
 G.exploration.start("windy",["partner1"]);
 G.combat.start(exp);
 const before=exp.steps;
 for(const u of exp.enemies)u.hp=0;
 G.combat.step(exp);
 assert.equal(exp.steps,before+1);
 assert.equal(exp.mode,"exploration");
});
test("full defeat ends expedition, settles remaining loot and resets steps",()=>{
 const {G}=boot(),exp=G.state.regions.windy;
 G.exploration.start("windy",["partner1"]);
 G.regions.addStep("windy");
 exp.party[0].bag.push("material:ore");
 G.combat.start(exp);
 for(const member of exp.party)member.hp=0;
 // Keep enemies alive, so only the party is defeated.
 G.combat.step(exp);
 assert.equal(exp.mode,"idle");
 assert.equal(exp.steps,0);
 assert.equal(G.state.roster[0].expedition,null);
 assert.equal(G.state.roster[0].hp,0);
});
test("restoring old save preserves initial regions, new save persists permanent unlocks",()=>{
 const {G}=boot();
 const legacy=JSON.parse(JSON.stringify(G.saveGame.snapshot()));
 delete legacy.unlockedRegions;delete legacy.bossFirstWins;
 assert.equal(G.saveGame.restore(legacy),true);
 assert.deepEqual(Array.from(G.state.unlockedRegions),["windy","meadow"]);
 G.exploration.start("windy",["partner1"]);
 for(let i=0;i<50;i++)G.regions.addStep("windy");
 const upgraded=JSON.parse(JSON.stringify(G.saveGame.snapshot()));
 G.regions.restore([],[]);
 assert.equal(G.regions.isUnlocked("apple"),false);
 assert.equal(G.saveGame.restore(upgraded),true);
 assert.equal(G.regions.isUnlocked("apple"),true);
 assert.equal(G.state.regions.windy.steps,0);
});
