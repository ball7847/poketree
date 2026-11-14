const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
function load(){
 const ctx=vm.createContext({window:{}});
 for(const file of ["national-catalog.js","species.js"])
  vm.runInContext(fs.readFileSync(path.join(__dirname,"../game/data",file),"utf8"),ctx,{filename:file});
 return ctx.window;
}
test("ORAS Cosplay Pikachu and five costume forms all have sole regular Lightning Rod",()=>{
 const {POKE_NATIONAL_CATALOG:n,POKE_SPECIES:s}=load();
 for(const id of ["rock-star","belle","pop-star","phd","libre","cosplay"]){
  assert.deepEqual(JSON.parse(JSON.stringify(s.pikachu.forms[id].abilities)),[
   {id:"lightning-rod",hidden:false,slot:1}
  ],id);
  assert.deepEqual(JSON.parse(JSON.stringify(n.species.pikachu.forms[id].abilities)),[
   {id:"static",hidden:false,slot:1},{id:"lightning-rod",hidden:true,slot:3}
  ],"Pinned snapshot remains unmodified");
  for(const k of ["types","base","baseExp","sourcePokemonId"])
   assert.deepEqual(JSON.parse(JSON.stringify(s.pikachu.forms[id][k])),JSON.parse(JSON.stringify(n.species.pikachu.forms[id][k])),id+"/"+k);
 }
});
test("ordinary Pikachu and all other species preserve original behavior",()=>{
 const {POKE_NATIONAL_CATALOG:n,POKE_SPECIES:s}=load();
 assert.deepEqual(JSON.parse(JSON.stringify(s.pikachu.forms.normal.abilities)),JSON.parse(JSON.stringify(n.species.pikachu.forms.normal.abilities)));
 assert.equal(Object.keys(s).length,1025);
 for(const [key,value] of Object.entries(n.species)){
  if(key==="pikachu")continue;
  assert.deepEqual(JSON.parse(JSON.stringify(s[key].forms)),JSON.parse(JSON.stringify(value.forms)),key);
 }
});
