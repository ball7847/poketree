"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),cp=require("node:child_process");
const root=path.resolve(__dirname,"..");
function imported(){
 const ctx=vm.createContext({window:{}});
 for(const p of ["game/data/national-catalog.js","game/data/imported-techniques.js"])
  vm.runInContext(fs.readFileSync(path.join(root,p),"utf8"),ctx,{filename:p});
 return ctx.window;
}
test("browser projection is fully reproducible from pinned originals",()=>{
 cp.execFileSync(process.execPath,["scripts/generate-runtime-techniques.cjs","--check"],{cwd:root,timeout:120000});
});
test("all national default forms map to a pinned source form without inheritance",()=>{
 const {POKE_NATIONAL_CATALOG:n,POKE_IMPORTED_TECHNIQUES:t}=imported();
 assert.equal(t.sourceRevision,n.source.revision);
 assert.equal(t.stats.moves,937);
 assert.equal(t.stats.forms,1351);
 assert.equal(t.stats.sourceRows,638321);
 assert.equal(t.stats.missingForms,48);
 const forms=Object.values(t.forms);
 assert.equal(forms.length,1351);
 assert.equal(forms.filter(f=>f.missing).length,48);
 for(const s of Object.values(n.species)){
  assert.ok(t.forms[s.forms.normal.sourcePokemonId],s.identifier);
  for(const form of Object.values(s.forms)){
   if(form.sourcePokemonId!==undefined)assert.ok(t.forms[form.sourcePokemonId],s.identifier);
  }
 }
 for(const f of forms){
  assert.ok(f.groupId===null||Number.isInteger(f.groupId));
  if(f.groupId===32)assert.equal(f.championsProvisional,true);
  for(const [id,level] of f.level){assert.ok(t.moves[id]);assert.ok(Number.isInteger(level));}
  for(const id of f.machine)assert.ok(t.moves[id]);
 }
});
