/* Approved region progression only; undesigned areas remain unplayable. */
(() => {
 "use strict";
 const G=window.PokeTree,{state,db}=G;
 const initial=["windy","meadow"];
 const isUnlocked=id=>!!db.regions[id]&&state.unlockedRegions.includes(id);
 const isPlayable=id=>isUnlocked(id)&&!!db.regions[id].locations?.[db.regions[id].start];
 const steps=id=>state.regions[id]?.steps||0;
 const requirement=id=>{
   const r=db.regions[id];if(!r?.unlock)return "최초 개방";
   const source=db.regions[r.unlock.region]?.name||r.unlock.region;
   return r.unlock.type==="steps"?source+"에서 이동 "+r.unlock.count+"회":source+"에서 보스 최초 처치";
 };
 function unlock(id){
   if(!db.regions[id]||isUnlocked(id))return false;
   state.unlockedRegions.push(id);
   G.record(null,db.regions[id].name+" 지역 해금");
   G.notification(db.regions[id].name+" 지역 해금");
   G.change("regions",id);
   return true;
 }
 function addStep(id){
   const exp=state.regions[id];if(!exp||exp.mode==="idle"||exp.mode==="error")return false;
   exp.steps++;
   G.change("regionSteps",id);
   for(const [key,r] of Object.entries(db.regions))
     if(r.unlock?.type==="steps"&&r.unlock.region===id&&exp.steps>=r.unlock.count)unlock(key);
   return true;
 }
 // Only a future, approved boss victory implementation may invoke this hook.
 function bossDefeated(id){
   if(!isUnlocked(id)||state.bossFirstWins.includes(id))return false;
   state.bossFirstWins.push(id);
   for(const [key,r] of Object.entries(db.regions))
     if(r.unlock?.type==="boss"&&r.unlock.region===id)unlock(key);
   G.change("regions",id);
   return true;
 }
 function restore(unlocked,bosses){
   state.unlockedRegions=[...new Set([...initial,...(Array.isArray(unlocked)?unlocked:[]).filter(id=>!!db.regions[id])])];
   state.bossFirstWins=[...new Set((Array.isArray(bosses)?bosses:[]).filter(id=>!!db.regions[id]))];
   G.change("regions");
 }
 G.regions={isUnlocked,isPlayable,steps,requirement,addStep,bossDefeated,restore};
})();
