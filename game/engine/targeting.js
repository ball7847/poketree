/* TP scores move selection at round start; targets are chosen only at acting time. */
(() => {
  "use strict";
  function healPoints(u){
    const ratio=u.hp/u.maxHp;
    return ratio<=.25?5:ratio<=.5?3:ratio<=.75?1:-1;
  }
  function candidates(exp,unit,move){
    if(move.target==="field"||move.target==="self")return [unit];
    if(move.target==="ally"||move.target==="allies")
      return (unit.side==="ally"?exp.party:exp.enemies).filter(u=>u.hp>0);
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
  function best(choices){
    if(!choices.length)return null;
    const high=Math.max(...choices.map(x=>x.score));
    const tied=choices.filter(x=>x.score===high);
    return tied[Math.floor(Math.random()*tied.length)];
  }
  function chooseMove(choices,roll=Math.random){
    if(!choices.length)return null;
    const weights=choices.map(choice=>Math.max(0,choice.score));
    const sum=weights.reduce((total,weight)=>total+weight,0);
    if(sum===0){
      // All scores are non-positive: prefer the highest ORIGINAL TP.
      const high=Math.max(...choices.map(choice=>choice.score));
      const tied=choices.filter(choice=>choice.score===high);
      return tied[Math.min(tied.length-1,Math.floor(roll()*tied.length))];
    }
    // Positive TP: weighted random, zero/negative TP never selected.
    let threshold=roll()*sum;
    for(let i=0;i<choices.length;i++){
      if(weights[i]===0)continue;
      if(threshold<weights[i])return choices[i];
      threshold-=weights[i];
    }
    // Guard against a custom RNG returning 1 or floating rounding.
    for(let i=choices.length-1;i>=0;i--)if(weights[i]>0)return choices[i];
  }
  function selectMove(exp,unit,ids=unit.moves,roll=Math.random){
    const options=[];
    for(const moveId of ids||[]){
      const move=window.POKE_MOVES[moveId];
      if(!move)continue;
      const targets=candidates(exp,unit,move);
      if(targets.length===0)continue;
      // A move's score is its highest individual target TP; never reserve one.
      options.push({moveId,move,score:Math.max(...targets.map(target=>points(unit,move,target)))});
    }
    return chooseMove(options,roll);
  }
  function selectTarget(exp,unit,plan){
    if(!plan?.move)return null;
    const targets=candidates(exp,unit,plan.move);
    if(!targets.length)return null;
    if(["enemies","allies","field"].includes(plan.move.target))
      return {...plan,targetId:null};
    const target=best(targets.map(t=>({targetId:t.id,score:points(unit,plan.move,t)})));
    return {...plan,targetId:target.targetId};
  }
  // Historical API remains as a compatibility alias for older tests/callers.
  // It now always uses current HP and valid targets, not any reserved target.
  function retarget(exp,unit,plan){return selectTarget(exp,unit,plan);}
  function select(exp,unit,ids=unit.moves){return selectMove(exp,unit,ids);}
  window.PokeTargeting=Object.freeze({healPoints,candidates,points,chooseMove,selectMove,selectTarget,select,retarget});
})();