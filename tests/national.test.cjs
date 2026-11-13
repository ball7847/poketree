const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const dir=path.resolve(__dirname,"../game"),ctx=vm.createContext({window:{addEventListener(){},localStorage:{getItem(){return null},setItem(){}}},performance:{now:()=>0},Date,console,Set,Map,Math});
for(const file of ["data/national-catalog.js","data/species.js","data/provenance.js","data/natures.js","data/type-chart.js","data.js","data/moves.js","data/techniques.js","data/tools.js","engine/experience.js","engine/pokemon.js","engine/damage.js","engine/battle-status.js","engine/core.js","engine/techniques.js","engine/regions.js","engine/tools.js","engine/save.js","engine/battle-experience.js","engine/targeting.js","engine/move-effects.js","engine/combat.js","engine/exploration.js"])
 vm.runInContext(fs.readFileSync(path.join(dir,file),"utf8"),ctx,{filename:file});
const c=ctx.window.POKE_NATIONAL_CATALOG,G=ctx.window.PokeTree;
test("full PokeAPI snapshot: 1025 contiguous species and 1351 varieties/1579 forms",()=>{
 const list=Object.values(c.species),dex=list.map(s=>s.dex).sort((a,b)=>a-b);
 assert.equal(list.length,1025);assert.deepEqual(dex,Array.from({length:1025},(_,i)=>i+1));
 assert.ok(list.every(s=>s.name&&s.forms.normal));
 assert.equal(list.reduce((n,s)=>n+Object.keys(s.forms).length,0),1351);
 assert.equal(Object.values(c.cosmeticForms).reduce((n,a)=>n+a.length,0),1579);
});
test("every species creates valid stats, verified demo encounters remain unchanged",()=>{
 assert.equal(G.Pokemon.validateSpecies().length,0);
 assert.equal(G.validateData().length,0);
 for(const [id,s] of Object.entries(c.species)){
  const p=G.Pokemon.create({id:"test-"+s.dex,species:id,level:10});
  assert.ok(p.maxHp>0&&p.attack>0);
 }
 assert.equal(G.db.species.bulbasaur.weight,0);
 assert.equal(G.db.regions.windy.locations.road.species.length,4);
});
test("passive abilities/evolution/form data and source lineage accessible",()=>{
 assert.equal(c.source.verifiedAgainstChampions,false);
 assert.equal(c.source.revision,"8a92bfa7dab2f12b84b5d151562f9857c133ff30");
 assert.equal(c.species.bulbasaur.name,"이상해씨");
 assert.equal(c.species.ivysaur.evolvesFrom,"bulbasaur");
 assert.ok(c.evolution.ivysaur.some(x=>x.trigger==="level-up"&&x.minimum_level===16));
 assert.ok(c.species.bulbasaur.forms.normal.abilities.some(x=>x.id==="overgrow"));
 assert.ok(c.species.charizard.forms["mega-x"]);
 assert.ok(c.cosmeticForms.unown.length>1);
});
test("existing saved Pokémon and region data restore unchanged",()=>{
 assert.equal(G.state.roster.length,3);
 const snapshot=JSON.parse(JSON.stringify(G.saveGame.snapshot()));
 assert.equal(G.saveGame.restore(snapshot),true);
 assert.equal(G.state.roster[0].species,"pikachu");
 assert.equal(G.state.unlockedRegions.includes("windy"),true);
});
