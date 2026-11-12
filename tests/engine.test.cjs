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
  for(const name of ["data.js","engine/core.js","engine/combat.js","engine/exploration.js"]){
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
