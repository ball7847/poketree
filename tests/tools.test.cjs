const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
function boot(){
 const store=new Map(),now={value:1000000};
 const CDate=class extends Date{static now(){return now.value;}};
 const ctx={window:{localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},addEventListener(){}},Date:CDate,performance:{now:()=>0},console,Set,Map,Math};
 const context=vm.createContext(ctx);
 for(const script of ["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/moves.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"])
   vm.runInContext(fs.readFileSync(path.join(__dirname,"../game",script),"utf8"),context,{filename:script});
 return {G:ctx.window.PokeTree,store,now};
}
function resources(G){G.techniques.discover("ore",200);G.techniques.discover("leaf",200);}
test("2 slots, duplicate type rejected, inventory availability and expedition lock",()=>{
 const {G}=boot(),T=G.tools,u=G.state.roster[0],other=G.state.roster[1];
 T.add("training-band",2);T.add("guard-charm");
 assert.equal(T.equip(u,"training-band",0),null);
 assert.equal(T.available("training-band"),1);
 assert.match(T.equip(u,"training-band",1),/중복/);
 assert.equal(T.equip(other,"training-band",0),null);
 assert.equal(T.available("training-band"),0);
 assert.match(T.equip(G.state.roster[2],"training-band",0),/도구가 없/);
 assert.equal(T.equip(u,"guard-charm",0),null);
 assert.equal(T.available("training-band"),1);
 G.exploration.start("windy",["partner1"]);
 assert.match(T.equip(u,null,0),/귀환/);
 G.exploration.recall("windy");assert.equal(T.equip(u,null,0),null);
});
test("tool bonus additive before rank, real-time stats and HP damage preserved, faint stays faint",()=>{
 const {G}=boot(),T=G.tools,u=G.state.roster[0];
 const base=G.Pokemon.stats(u);
 T.add("training-band");T.add("vital-amulet");
 u.hp-=5;assert.equal(T.equip(u,"training-band",0),null);
 assert.equal(u.attack,Math.floor(base.attack*1.1));
 assert.equal(T.equip(u,"vital-amulet",1),null);
 assert.equal(u.maxHp,Math.floor(base.hp*1.2));assert.equal(u.maxHp-u.hp,5);
 const expectedAttack=Math.floor(Math.floor(base.attack*1.1)*1.2);
 u.battleStatus.ranks.attack=1;
 const enemy=G.Pokemon.create({id:"test",species:"rattata",level:5,side:"enemy"});
 const damage=G.Damage.compute(u,enemy,{random:100});
 const baseDamage=Math.floor(Math.floor((Math.floor(2*u.level/5)+2)*10*expectedAttack/enemy.defense)/50)+2;
 assert.equal(damage.damage,Math.max(1,baseDamage));
 u.hp=0;T.equip(u,null,1);assert.equal(u.hp,0);assert.equal(u.maxHp,base.hp);
});
test("craft filters, immediate reservation material deduction, max count, three slots",()=>{
 const {G}=boot(),T=G.tools;assert.equal(G.state.toolQueueCapacity,3);
 assert.equal(T.recipeStatus("training-band"),"locked");
 resources(G);assert.equal(T.recipeStatus("training-band"),"available");
 const before=G.state.materials.ore;assert.equal(T.queue("training-band",2,1000000),null);
 assert.equal(G.state.materials.ore,before-4);
 assert.equal(T.queue("guard-charm",1,1000000),null);
 assert.equal(T.queue("vital-amulet",1,1000000),null);
 assert.match(T.queue("guard-charm",1,1000000),/가득/);
 assert.equal(G.state.toolQueue[0].status,"working");
 assert.equal(G.state.toolQueue[1].status,"waiting");
});
test("finished task keeps slot while next runs; individual and all claims compact list",()=>{
 const {G}=boot(),T=G.tools;resources(G);
 T.queue("training-band",1,1000000);T.queue("guard-charm",1,1000000);T.queue("vital-amulet",1,1000000);
 T.advance(1060000);
 assert.equal(G.state.toolQueue[0].status,"done");
 assert.equal(G.state.toolQueue[1].status,"working");
 assert.equal(G.state.toolQueue[1].remainingMs,90000);
 assert.equal(T.claim(G.state.toolQueue[0].uid,1060000),null);
 assert.equal(G.state.toolQueue.length,2);
 T.advance(1150000);assert.equal(G.state.toolQueue[0].status,"done");
 assert.equal(T.claimAll(1350000),2);assert.equal(G.state.toolQueue.length,0);
 assert.equal(T.owned("training-band"),1);assert.equal(T.owned("guard-charm"),1);assert.equal(T.owned("vital-amulet"),1);
});
test("cancel in-progress and queued both refund full cost and start next",()=>{
 const {G}=boot(),T=G.tools;resources(G);
 const beforeOre=G.state.materials.ore,beforeLeaf=G.state.materials.leaf;
 T.queue("training-band",2,1000000);T.queue("guard-charm",1,1000000);
 const first=G.state.toolQueue[0].uid;T.advance(1030000);
 assert.equal(T.cancel(first,1030000),null);
 assert.equal(G.state.toolQueue[0].status,"working");
 assert.equal(G.state.materials.ore,beforeOre-1);
 assert.equal(G.state.materials.leaf,beforeLeaf-3);
 assert.equal(T.cancel(G.state.toolQueue[0].uid,1030000),null);
 assert.equal(G.state.materials.ore,beforeOre);assert.equal(G.state.materials.leaf,beforeLeaf);
});
test("save compatibility for old save and offline progress on reload",()=>{
 const {G,store,now}=boot(),T=G.tools;resources(G);T.add("training-band");
 T.equip(G.state.roster[0],"training-band",0);
 T.queue("guard-charm",1,1000000);
 const raw=JSON.parse(JSON.stringify(G.saveGame.snapshot()));
 raw.toolLastAt=1000000;raw.toolQueue[0].remainingMs=90000;
 now.value=1090000;
 assert.equal(G.saveGame.restore(raw),true);
 assert.equal(G.state.toolQueue[0].status,"done");
 assert.equal(G.state.roster[0].toolSlots[0],"training-band");
 assert.equal(G.state.roster[0].maxHp,G.Pokemon.stats(G.state.roster[0]).hp);
 const legacy={...raw};delete legacy.toolInventory;delete legacy.toolQueue;delete legacy.toolQueueCapacity;
 assert.equal(G.saveGame.restore(legacy),true);
 assert.equal(G.state.toolQueue.length,0);assert.equal(G.state.toolQueueCapacity,3);
});
