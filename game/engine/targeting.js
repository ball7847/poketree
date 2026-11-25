/* TP scores move selection at round start; targets are chosen only at acting time. */
(() => {
  "use strict";
  function healPoints(u){
    const ratio=u.hp/u.maxHp;
    return ratio<=.25?5:ratio<=.5?3:ratio<=.75?1:-1;
  }
  function candidates(exp,unit,move){
    if(move.target==="field"||move.target==="self")return unit.hp>0?[unit]:[];
    const allies=(unit.side==="ally"?exp.party:exp.enemies).filter(u=>u.hp>0);
    const enemies=(unit.side==="ally"?exp.enemies:exp.party).filter(u=>u.hp>0);
    if(move.target==="others")return [...allies.filter(u=>u!==unit),...enemies];
    if(move.target==="otherAlly")return allies.filter(u=>u!==unit);
    if(move.target==="ally"||move.target==="allies")return allies;
    if(["enemy","enemies","twoEnemies"].includes(move.target))return enemies;
    return [];
  }
  const rankKeys=["attack","defense","spAttack","spDefense","speed","accuracy","evasion"];
  function rankSum(unit){return rankKeys.reduce((total,key)=>total+(unit.battleStatus?.ranks?.[key]??0),0);}
  function roundPoints(round){return round===1?4:round===2?2:0;}
  function enemyHpPoints(target){
    const ratio=target.hp/target.maxHp;
    return ratio<=.25?2:ratio<=.5?1:0;
  }
  function rankUpPoints(sum){return sum<=0?2:sum>24?-6:sum>12?-4:sum>6?-2:0;}
  function rankDownPoints(sum){return sum<=0?-3:sum>6?2:1;}
  function fieldPoints(current,desired){return current?.kind===desired?-4:2;}
  function statusPoints(target){return target.battleStatus?.major||target.battleStatus?.confusion>0?-1:1;}
  function points(unit,move,target,exp={}){
    if(move.effect==="heal")return healPoints(target);
    const round=roundPoints(exp.round??1);
    if(move.effect==="rank"){
      const ranks=move.ranks||[move.rank];
      const up=window.PokeMoveTags.has(move,"랭크업")||ranks.some(r=>r?.stages>0);
      const down=window.PokeMoveTags.has(move,"랭크다운")||ranks.some(r=>r?.stages<0);
      return round+(up?rankUpPoints(rankSum(unit)):0)+(down?rankDownPoints(rankSum(target)):0);
    }
    if(move.effect==="weather")return round+fieldPoints(exp.weather,move.weather);
    if(move.effect==="terrain")return round+fieldPoints(exp.terrain,move.terrain);
    if(move.effect==="status")return statusPoints(target);
    if(move.category==="status")return 0;
    const multiplier=window.PokeDamage.effectiveness(move.type,target);
    const type=multiplier===0?-4:multiplier===.25?-2:multiplier===.5?-1:multiplier===2?1:multiplier>=4?2:0;
    return type+(unit.side!==target.side?enemyHpPoints(target):0);
  }
  function weighted(choices,roll,power){
    if(!choices.length)return null;
    const weights=choices.map(choice=>Math.max(0,choice.score)**power);
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
  function chooseMove(choices,roll=Math.random){return weighted(choices,roll,1);}
  function chooseTarget(choices,roll=Math.random){return weighted(choices,roll,2);}
  function selectMove(exp,unit,ids=unit.moves,roll=Math.random){
    const options=[];
    for(const moveId of ids||[]){
      const move=window.POKE_MOVES[moveId];
      if(!move)continue;
      const targets=candidates(exp,unit,move);
      if(targets.length===0)continue;
      // A move's score is its highest individual target TP; never reserve one.
      options.push({moveId,move,score:Math.max(...targets.map(target=>points(unit,move,target,exp)))});
    }
    return chooseMove(options,roll);
  }
  function selectTarget(exp,unit,plan,roll=Math.random){
    if(!plan?.move)return null;
    const targets=candidates(exp,unit,plan.move);
    if(!targets.length)return null;
    if(["enemies","allies","others","field"].includes(plan.move.target))
      return {...plan,targetId:null};
    const choices=targets.map(t=>({targetId:t.id,score:points(unit,plan.move,t,exp)}));
    if(plan.move.target==="twoEnemies"){
      const first=chooseTarget(choices,roll),second=chooseTarget(choices.filter(t=>t.targetId!==first.targetId),roll);
      return {...plan,targetId:null,targetIds:second?[first.targetId,second.targetId]:[first.targetId]};
    }
    const target=chooseTarget(choices,roll);
    return {...plan,targetId:target.targetId};
  }
  // Historical API remains as a compatibility alias for older tests/callers.
  // It now always uses current HP and valid targets, not any reserved target.
  function retarget(exp,unit,plan){return selectTarget(exp,unit,plan);}
  function select(exp,unit,ids=unit.moves){return selectMove(exp,unit,ids);}
  window.PokeTargeting=Object.freeze({healPoints,rankSum,roundPoints,enemyHpPoints,rankUpPoints,rankDownPoints,fieldPoints,statusPoints,candidates,points,chooseMove,chooseTarget,selectMove,selectTarget,select,retarget});
})();