/* Versioned opt-in browser persistence. Existing prototype had no saved-game data.
 * Stores individual roster/progression and collects only; does not replay combat.
 */
(() => {
 "use strict";
 const G=window.PokeTree,KEY="poketree-save-v1",VERSION=1;
 let storage;
 try {storage=window.localStorage;}catch(e){storage=null;}
 const allowed=(list,valid)=>Array.isArray(list)?[...new Set(list.filter(valid))]:[];
 function snapshot(){
   return {version:VERSION,roster:G.state.roster.map(u=>({
     id:u.id,species:u.species,form:u.form,level:u.level,experience:u.experience,
     nature:u.nature,gender:u.gender,nickname:u.nickname,iv:u.iv,ev:u.ev,
     learnedMoves:[...u.learnedMoves],moves:[...u.moves],toolSlots:[...G.tools.slots(u)]
   })),technicalMachines:[...G.state.technicalMachines],materialDex:[...G.state.materialDex],
   materials:{...G.state.materials},collected:[...G.state.collected],unlockedRegions:[...G.state.unlockedRegions],bossFirstWins:[...G.state.bossFirstWins],...G.tools.snapshot()};
 }
 function restore(raw){
   if(!raw||raw.version!==VERSION||!Array.isArray(raw.roster))return false;
   const T=G.techniques,P=G.Pokemon;
   const rebuilt=[];
   for(const entry of raw.roster){
     if(!G.db.species[entry.species]||!entry.id||rebuilt.some(u=>u.id===entry.id))return false;
     const learned=allowed(entry.learnedMoves,id=>!!window.POKE_MOVES[id]);
     const moves=Array.isArray(entry.moves)?entry.moves.slice(0,2).map(id=>id===null||!!window.POKE_MOVES[id]?id:null):[];
     if(moves.length===2&&moves[0]!==null&&moves[0]===moves[1])moves[1]=null;
     const unit=P.create({...entry,learnedMoves:learned,moves,toolSlots:[null,null],side:"ally"});
     unit.toolSlots=Array.isArray(entry.toolSlots)?entry.toolSlots.slice(0,2):[null,null];
     T.initialize(unit);rebuilt.push(unit);
   }
   if(rebuilt.length!==G.state.roster.length||rebuilt.length===0)return false;
   G.state.roster.splice(0,G.state.roster.length,...rebuilt);
   G.state.technicalMachines=allowed(raw.technicalMachines,id=>!!T.data.recipes[id]);
   G.state.materialDex=allowed(raw.materialDex,id=>!!T.data.materials[id]);
   G.state.materials=Object.fromEntries(Object.keys(T.data.materials).map(id=>
      [id,G.state.materialDex.includes(id)&&Number.isSafeInteger(raw.materials?.[id])&&raw.materials[id]>=0?raw.materials[id]:0]));
   G.state.collected=allowed(raw.collected,x=>typeof x==="string");
   G.tools.restore(raw);
   // Expeditions and party steps are transient, not serialized. A restored save
   // must not retain references to a now-replaced roster or stale progress.
   for(const exp of Object.values(G.state.regions)){
     exp.mode="idle";exp.error=null;exp.locationId=null;
     exp.party=[];exp.enemies=[];exp.order=[];exp.turnIndex=0;
     exp.round=0;exp.actions=0;exp.steps=0;exp.remainingMs=G.state.speedMs;
   }
   for(const u of G.state.roster)u.expedition=null;
   G.regions.restore(raw.unlockedRegions,raw.bossFirstWins);
   G.change("roster");G.change("materials");G.change("tools");return true;
 }
 function load(){
   if(!storage)return false;
   try{const raw=storage.getItem(KEY);return raw?restore(JSON.parse(raw)):false;}catch(e){return false;}
 }
 function save(){
   if(!storage)return false;
   try{storage.setItem(KEY,JSON.stringify(snapshot()));return true;}catch(e){return false;}
 }
 G.saveGame={snapshot,restore,save,load,version:VERSION};
 load();
 // Saving after actual state changes avoids overwriting loading progress.
 G.onChange(type=>{if(["roster","level","materials","bags","expedition","nickname","tools","regions"].includes(type))save();});
 window.addEventListener?.("pagehide",save);
})();
