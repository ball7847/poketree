const test=require("node:test");
const assert=require("node:assert/strict");
const {championsForm,compareForm,showdownObject}=require("../scripts/compare-pokemon-references.cjs");
test("Champions Mega X and Y never collapse to base mega",()=>{
 const forms={"normal":{},"mega-x":{},"mega-y":{},"mega":{}};
 assert.equal(championsForm({name:"Mega Charizard X",form:"Mega"},{forms}),"mega-x");
 assert.equal(championsForm({name:"Mega Charizard Y",form:"Mega"},{forms}),"mega-y");
});
test("ambiguous Paldean Tauros is not silently assigned a breed",()=>{
 const forms={"normal":{},"paldea-combat-breed":{},"paldea-blaze-breed":{},"paldea-aqua-breed":{}};
 assert.equal(championsForm({name:"Paldean Tauros",form:"Regional"},{forms}),null);
});
test("comparison checks all six stats, types, and ability slots independently",()=>{
 const f={base:{hp:78,attack:84,defense:78,spAttack:109,spDefense:85,speed:100},
 types:["fire","flying"],abilities:[{id:"blaze",hidden:false,slot:1},{id:"solar-power",hidden:true,slot:3}]};
 const stats={hp:78,atk:84,def:78,spa:109,spd:85,spe:100};
 assert.deepEqual(compareForm(f,stats,["Fire","Flying"],{"0":"Blaze","H":"Solar Power"},{id:"charizard"}),[]);
 assert.equal(compareForm(f,{...stats,atk:85},["Fire","Flying"],{"0":"Blaze","H":"Solar Power"},{}).length,1);
});
test("Showdown TypeScript wrapper extracts a literal without executing arbitrary module code",()=>{
 const p=showdownObject("export const Pokedex: Example = {bulbasaur:{num:1}};");
 assert.equal(p.bulbasaur.num,1);
});
