const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
function boot(){
 const store=new Map(),ctx={window:{localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},addEventListener(){}},performance:{now:()=>0},Date,console,Set,Map,Math};
 const context=vm.createContext(ctx);
 for(const file of ["data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/moves.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/tools.js","engine/save.js","engine/warehouse.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"])
   vm.runInContext(fs.readFileSync(path.join(__dirname,"../game",file),"utf8"),context,{filename:file});
 return ctx.window.PokeTree;
}
test("warehouse empty by default, categories filter independent and count zero excluded",()=>{
 const G=boot(),W=G.warehouse;assert.equal(W.entries().length,0);
 G.techniques.discover("ore",3);G.techniques.discover("leaf",1);
 G.tools.add("training-band",2);G.techniques.unlock("gust");
 assert.equal(W.entries().length,4);
 assert.equal(W.entries("material").length,2);
 assert.equal(W.entries("tool").length,1);
 assert.equal(W.entries("tm").length,1);
 assert.equal(W.entries("unknown").length,0);
 assert.equal(W.entries("tm")[0].count,null);
 G.state.materials.leaf=0;assert.equal(W.entries("material").length,1);
});
test("detail reports total/equipped/available stock without duplicating inventory",()=>{
 const G=boot(),W=G.warehouse,u=G.state.roster[0];
 G.tools.add("training-band",3);G.tools.equip(u,"training-band",0);
 const item=W.detail("tool","training-band");
 assert.equal(item.count,3);assert.equal(item.lines[1][1],"1개");assert.equal(item.lines[2][1],"2개");
 assert.equal(G.tools.owned("training-band"),3);
 assert.equal(W.detail("material","ore"),null);
});
test("expedition bag items not in warehouse until recalled",()=>{
 const G=boot(),W=G.warehouse;
 G.exploration.start("windy",["partner1"]);
 G.state.roster[0].bag.push("material:ore","tool:guard-charm");
 assert.equal(W.entries().length,0);
 G.exploration.recall("windy");
 assert.equal(W.entries("material")[0].count,1);
 assert.equal(W.entries("tool")[0].count,1);
});
test("reserved materials decrement immediately; crafted tools wait until claimed",()=>{
 const G=boot(),W=G.warehouse;
 G.techniques.discover("ore",5);G.techniques.discover("leaf",5);
 const start=Date.now();assert.equal(G.tools.queue("training-band",1,start),null);
 assert.equal(W.detail("material","ore").count,3);
 assert.equal(W.entries("tool").length,0);
 G.tools.advance(start+60000);
 assert.equal(W.entries("tool").length,0);
 assert.equal(G.tools.claimAll(start+60000),1);
 assert.equal(W.entries("tool")[0].count,1);
});
test("existing save restoration preserves warehouse inventory without a separate warehouse store",()=>{
 const G=boot(),W=G.warehouse;
 G.techniques.discover("ore",4);G.tools.add("guard-charm",2);G.techniques.unlock("swift");
 const save=JSON.parse(JSON.stringify(G.saveGame.snapshot()));
 G.state.materials.ore=0;G.state.toolInventory["guard-charm"]=0;G.state.technicalMachines=[];
 assert.equal(G.saveGame.restore(save),true);
 assert.equal(W.entries("material")[0].count,4);
 assert.equal(W.entries("tool")[0].count,2);
 assert.equal(W.entries("tm")[0].name,"스피드스타");
});
test("HTML includes fifth navigation tab and matching modal, CSS grid fixed four",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../game/index.html"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../game/style.css"),"utf8");
 const nav=fs.readFileSync(path.join(__dirname,"../game/ui/navigation.js"),"utf8");
 assert.match(html,/id="nav-warehouse"/);assert.match(html,/id="tab-warehouse"/);
 assert.match(html,/id="warehouseDetailDialog"/);assert.match(html,/id="warehouseItems"/);
 assert.match(nav,/warehouseDetailDialog/);assert.match(nav,/warehouse.*exploration/);
 assert.match(css,/\.warehouse-grid\{[^}]*grid-template-columns:repeat\(4/);
});
