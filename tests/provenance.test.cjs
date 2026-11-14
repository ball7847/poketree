const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {audit,loadCatalog,loadRecords,key,sourceRank}=require("../scripts/audit-pokemon-data.cjs");
const root=path.resolve(__dirname,"..");
const catalog=loadCatalog();
const evidence=loadRecords(root);
test("audit covers national species and each actual registered form",()=>{
 const report=audit(evidence,catalog);
 assert.equal(report.speciesCount,1025);
 assert.equal(report.formCount,1351);\n assert.equal(report.cosmeticFormCount,1579);\n assert.equal(report.evolutionRowCount,676);
 assert.equal(report.errors.length,0,report.errors.slice(0,10).join("\n"));
 assert.equal(report.totalFields,report.verified+report.mismatch+report.unavailable+report.notApplicable+report.unverified);
});
test("existing six demo overrides remain intact",()=>{
 for(const id of ["rattata","pidgey","caterpie","weedle","pikachu","eevee"]){
  assert.ok(catalog.POKE_SPECIES[id]);
  assert.equal(catalog.POKE_SPECIES[id].dex,catalog.POKE_NATIONAL_CATALOG.species[id].dex);
 }
});
test("field and form evidence keys cannot collide",()=>{
 assert.notEqual(key("charizard","normal","base.speed"),key("charizard","mega-x","base.speed"));
 assert.notEqual(key("charizard",null,"baseExp"),key("charizard","normal","baseExp"));
});
test("source order prioritizes Champions and never infers an unverified edition",()=>{
 assert.equal(sourceRank("champions"),0);
 assert.equal(sourceRank(9),1);
 assert.equal(sourceRank("8"),2);
 assert.equal(sourceRank("unknown"),Infinity);
});
test("invalid fabricated or unsupported evidence is rejected",()=>{
 const bad={schemaVersion:1,records:[{species:"pikachu",form:"normal",field:"base.speed",status:"verified",checked:true,source:"unknown",version:"champions",reference:null}]};
 assert.match(audit(bad,catalog).errors.join(" "),/lacks source/);
 const wrong={schemaVersion:1,records:[{species:"pikachu",form:"normal",field:"base.badstat",status:"unverified",checked:false,source:null,version:null,reference:null}]};
 assert.match(audit(wrong,catalog).errors.join(" "),/unknown field target/);
});

test("verified values must match the game snapshot and cited expected value",()=>{
 const valid={schemaVersion:1,records:[{
 species:"starmie",form:"mega",field:"base.attack",status:"verified",checked:true,
 source:"champions-reference",version:"champions",reference:"https://bulbapedia.bulbagarden.net/wiki/Base_stats",
 observedValue:100,expectedValue:100
 }]};
 assert.equal(audit(valid,catalog).errors.length,0);
 valid.records[0].expectedValue=140;
 assert.match(audit(valid,catalog).errors.join(" "),/value\/status conflict/);
 valid.records[0].status="mismatch";
 assert.equal(audit(valid,catalog).errors.length,0);
 valid.records[0].observedValue=999;
 assert.match(audit(valid,catalog).errors.join(" "),/snapshot changed/);
});
