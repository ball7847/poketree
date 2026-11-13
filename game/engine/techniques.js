/* Move learning, equipment, reusable TM unlocks and recipe/material codex.
 * All progression is state based; no DOM dependency. */
(() => {
 "use strict";
 const G=window.PokeTree, data=window.POKE_TECH_DATA, moves=window.POKE_MOVES;
 const unique=ids=>[...new Set(ids)];
 function levelMoves(species,level){
   return unique((data.learnsets[species]||[]).filter(x=>x.level<=level).map(x=>x.move));
 }
 function initialize(unit){
   if(!Array.isArray(unit.learnedMoves))unit.learnedMoves=[];
   unit.learnedMoves=unique([...levelMoves(unit.species,unit.level),...unit.learnedMoves,...unit.moves].filter(id=>!!moves[id]));
   return unit.learnedMoves;
 }
 function learn(unit,id){
   if(!moves[id])return "존재하지 않는 기술입니다.";
   initialize(unit);
   if(unit.learnedMoves.includes(id))return null;
   unit.learnedMoves.push(id);G.change("roster");return null;
 }
 function onLevel(unit){initialize(unit);G.change("roster");}
 function evolve(unit,newSpecies,newForm="normal"){
   // Only call after evolution's eligibility/trigger is defined elsewhere.
   // This module deliberately does not define an evolution trigger.
   if(!G.db.species[newSpecies]?.forms?.[newForm])return "진화 종족/폼 정보가 없습니다.";
   initialize(unit);
   const oldHp=unit.hp,oldMax=unit.maxHp;
   unit.species=newSpecies;unit.form=newForm;unit.name=G.Pokemon.named(unit);
   const updated=G.Pokemon.stats(unit);Object.assign(unit,updated);
   unit.maxHp=updated.hp;unit.hp=Math.max(0,Math.min(updated.hp,oldHp+updated.hp-oldMax));
   initialize(unit);G.change("roster");return null;
 }
 function canEditTools(unit){
   if(unit.side!=="ally")return "보유 포켓몬만 도구를 변경할 수 있습니다.";
   return unit.expedition===null?null:"탐험에서 귀환한 뒤에만 도구를 변경할 수 있습니다.";
 }
 function canEdit(unit){
   if(unit.side!=="ally")return "보유 포켓몬만 변경할 수 있습니다.";
   if(unit.expedition===null)return null;
   const exp=G.state.regions[unit.expedition];
   return exp?.mode==="exploration"?null:"전투 또는 회복 중에는 기술을 변경할 수 없습니다.";
 }
 function equip(unit,id,slot){
   if(!Number.isInteger(slot)||slot<0||slot>1)return "기술 슬롯은 1~2만 가능합니다.";
   const blocked=canEdit(unit);if(blocked)return blocked;
   initialize(unit);
   if(id!==null&&(!moves[id]||!unit.learnedMoves.includes(id)))return "습득하지 않은 기술입니다.";
   if(id!==null&&unit.moves.includes(id)&&unit.moves.indexOf(id)!==slot)return "같은 기술을 두 번 장착할 수 없습니다.";
   const next=[...unit.moves];while(next.length<=slot)next.push(null);
   next[slot]=id;
   while(next.length&&next[next.length-1]===null)next.pop();
   unit.moves=next;G.change("roster");return null; // PP intentionally unchanged
 }
 function canUseTM(unit,move){
   if(unit.side!=="ally"||unit.expedition!==null)return "탐험에서 귀환한 포켓몬만 기술머신을 사용할 수 있습니다.";
   if(!G.state.technicalMachines.includes(move))return "해금되지 않은 기술머신입니다.";
   if(!(data.tmCompatibility[unit.species]||[]).includes(move))return "이 포켓몬과 호환되지 않는 기술머신입니다.";
   return null;
 }
 function useTM(unit,move){const err=canUseTM(unit,move);return err||learn(unit,move);}
 function materialStatus(id){
   const amount=G.state.materials[id]||0;
   return {known:G.state.materialDex.includes(id),amount};
 }
 function recipeStatus(id){
   const recipe=data.recipes[id];if(!recipe)return "unknown";
   if(G.state.technicalMachines.includes(id))return "unavailable";
   if(Object.keys(recipe).some(mat=>!materialStatus(mat).known))return "locked";
   return Object.entries(recipe).every(([mat,count])=>materialStatus(mat).amount>=count)?"available":"unavailable";
 }
 function discover(id,amount=1){
   if(!data.materials[id]||!Number.isSafeInteger(amount)||amount<=0)return false;
   G.state.materials[id]=(G.state.materials[id]||0)+amount;
   if(!G.state.materialDex.includes(id))G.state.materialDex.push(id);
   G.change("materials");return true;
 }
 function unlock(id){
   if(!data.recipes[id]||G.state.technicalMachines.includes(id))return false;
   G.state.technicalMachines.push(id);G.change("materials");return true;
 }
 function craft(id){
   if(recipeStatus(id)!=="available")return "제작할 수 없는 기술머신입니다.";
   for(const [mat,count] of Object.entries(data.recipes[id]))G.state.materials[mat]-=count;
   unlock(id);G.change("materials");return null;
 }
 function materialDisplay(id){
   const m=data.materials[id];if(!m)return "잘못된 재료";
   const s=materialStatus(id);
   return s.known?m.name+" "+s.amount:"???";
 }
 function collectLoot(loot){
   if(typeof loot!=="string")return false;
   if(loot.startsWith("material:"))return discover(loot.slice(9));
   if(loot.startsWith("tm:"))return unlock(loot.slice(3));
   return false;
 }
 function demoFind(exp){
   const pending=new Set(Object.values(G.state.regions).flatMap(region=>region.party.flatMap(unit=>unit.bag)));
   const choices=data.demoFinds.filter(item=>!item.startsWith("tm:")||!G.state.technicalMachines.includes(item.slice(3))&&!pending.has(item));
   if(!choices.length)return null;
   // Deterministic demo sequence; no invented balancing probability.
   const pick=choices[exp.actions%choices.length];
   return pick.startsWith("tm:")?pick:"material:"+pick;
 }
 G.techniques={initialize,levelMoves,learn,onLevel,evolve,canEdit,canEditTools,equip,canUseTM,useTM,
   materialStatus,recipeStatus,discover,unlock,craft,materialDisplay,collectLoot,demoFind,data};
 for(const u of G.state.roster)initialize(u);
})();
