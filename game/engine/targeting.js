/* TP is move/target selection score, never action priority. */
(() => {
  "use strict";
  function healPoints(u){
    const ratio=u.hp/u.maxHp;
    return ratio<=.25?5:ratio<=.5?3:ratio<=.75?1:-1;
  }
  function candidates(exp,unit,move){
    if(move.target==="field"||move.target==="self")return [unit];
    if(move.target==="ally"||move.target==="allies")return exp.party.filter(u=>u.hp>0);
    if(move.target==="enemy"||move.target==="enemies")
      return (unit.side==="ally"?exp.enemies:exp.party).filter(u=>u.hp>0);
    return [];
  }
  function points(unit,move,target){
    if(move.effect==="heal")return healPoints(target);
    if(move.category==="status")return 0;
    const multiplier=window.PokeDamage.effectiveness(move.type,target);
    return multiplier===0?-4:multiplier===.25?-2:multiplier===.5?-1:multiplier===2?1:multiplier>=4?2:0;
  }
  function select(exp,u,ids=u.moves){
    const choices=[];
    for(const id of ids||[]){
      const move=window.POKE_MOVES[id];if(!move)continue;
      const targets=candidates(exp,u,move);
      if(!targets.length)continue;
      if(["enemies","allies","field"].includes(move.target)){
        const score=Math.max(...targets.map(t=>points(u,move,t)));
        choices.push({moveId:id,move,targetId:null,score});
      }else for(const t of targets)choices.push({moveId:id,move,targetId:t.id,score:points(u,move,t)});
    }
    if(!choices.length)return null;
    const high=Math.max(...choices.map(x=>x.score));
    const tied=choices.filter(x=>x.score===high);
    return tied[Math.floor(Math.random()*tied.length)];
  }
  function retarget(exp,u,planned){
    if(!planned?.move)return null;
    const move=planned.move;
    const aliveTargets=candidates(exp,u,move);
    if(!aliveTargets.length)return null;
    if(["enemies","allies","field"].includes(move.target))return {...planned,targetId:null};
    if(aliveTargets.some(t=>t.id===planned.targetId))return planned;
    return select(exp,u,[planned.moveId]);
  }
  window.PokeTargeting=Object.freeze({healPoints,candidates,points,select,retarget});
})();