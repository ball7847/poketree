/* Automatic turn actions: priority first, then speed, then stable per-round tie. */
(() => {
  "use strict";
  const G=window.PokeTree,{db,choose,alive,record,Pokemon,Damage}=G;
  const S=window.PokeBattleStatus,T=window.PokeTargeting,M=window.PokeMoveEffects;
  function speed(u){return S.speed(u);}
  function priority(order){return order?.move?.priority??0;}
  function sortRemaining(exp){
    exp.order.sort((a,b)=>priority(exp.plans.get(b))-priority(exp.plans.get(a))||
      exp.speeds.get(b)-exp.speeds.get(a)||(exp.tiebreak.get(a)-exp.tiebreak.get(b)));
  }
  function beginRound(exp){
    const members=[...exp.party,...exp.enemies].filter(alive);
    // A previously fainted Pokémon may have been revived between rounds.
    // The next faint must apply its own experience/loot penalty exactly once.
    for(const member of members)member._faintedHandled=false;
    exp.plans=new Map();
    exp.tiebreak=new Map(members.map(u=>[u,Math.random()]));
    exp.speeds=new Map(members.map(u=>[u,speed(u)])); // fixed for this round
    for(const u of members){
      // Select the move by its current best TP; do not reserve a target.
      exp.plans.set(u,u.pp>=100&&u.moves?.length?T.selectMove(exp,u):null);
    }
    exp.order=members;sortRemaining(exp);exp.turnIndex=0;exp.round++;
    record(exp,exp.round+"라운드 시작");
  }
  function startCombat(exp){
    const loc=G.place(exp),count=choose(loc.enemyCount,x=>x.weight).value;
    exp.enemies=Array.from({length:count},(_,i)=>{
      const species=choose(loc.species,id=>db.species[id].weight);
      return Pokemon.create({id:exp.id+"-"+exp.actions+"-"+i,species,level:5,side:"enemy"});
    });
    // Revived allies can enter a later encounter with the same object identity.
    // Do not inherit the previous encounter's handled-faint marker.
    for(const member of exp.party)if(alive(member))member._faintedHandled=false;
    exp.mode="combat";exp.round=0;exp.order=[];exp.turnIndex=0;
    record(exp,loc.name+"에서 "+exp.enemies.map(u=>u.name).join(", ")+"을(를) 마주쳤습니다.");
    beginRound(exp);
  }
  function faint(exp,u){
    if(u.side==="ally"){
      u.experience=0;
      const losses=Math.floor(u.bag.length/2);
      for(let i=0;i<losses;i++)u.bag.splice(Math.floor(Math.random()*u.bag.length),1);
      record(exp,u.name+" 기절 · 전리품 "+losses+"개 손실");G.change("bags",exp.id);
    }else record(exp,u.name+" 기절");
  }
  function handleFaint(exp,u,award){
    if(u._faintedHandled)return;
    u._faintedHandled=true;faint(exp,u);
    if(award&&u.side==="enemy")G.battleExperience.award(exp,u);
  }
  function clear(exp){
    for(const u of [...exp.party,...exp.enemies])S.endBattle(u);
    exp.order=[];exp.plans=null;exp.tiebreak=null;exp.speeds=null;exp.turnIndex=0;exp.round=0;
  }
  function finish(exp){
    exp.wins++;record(exp,"전투 승리");G.addLoot(exp,"시연용 전리품");
    clear(exp);exp.enemies=[];exp.mode="exploration";
  }
  function fallbackAttack(exp,u){
    const enemies=(u.side==="ally"?exp.enemies:exp.party).filter(alive);
    if(!enemies.length)return;
    const victim=enemies[Math.floor(Math.random()*enemies.length)];
    const result=Damage.roll(u,victim,{weather:exp.weather,terrain:exp.terrain});
    Pokemon.usedNormalAttack(u);
    const actual=Math.min(victim.hp,result.damage);
    victim.hp=Math.max(0,victim.hp-result.damage);
    if(u.moves?.length&&actual>0)u.pp+=Pokemon.ppGain(u);
    record(exp,u.name+" → "+victim.name+" · "+actual+" 피해"+(result.critical?" · 급소":"")+" ("+result.type+")");
    if(victim.hp===0)handleFaint(exp,victim,victim.side==="enemy");
  }
  function finalize(exp){
    if(!exp.enemies.some(alive))finish(exp);
    else if(!exp.party.some(alive)){
      clear(exp);exp.enemies=[];exp.mode="recovery";
      record(exp,"전원 기절 · HP 회복 후 같은 지역에서 탐험 재개");
    }
  }
  function step(exp){
    if(!exp.plans)beginRound(exp);
    // Fainted members need no extra timer turn.
    while(exp.turnIndex<exp.order.length&&!alive(exp.order[exp.turnIndex]))exp.turnIndex++;
    if(exp.turnIndex>=exp.order.length)beginRound(exp);
    // Revalidate before acting: a move's PP may have changed while waiting.
    // Reordering never draws fresh tie-breakers; already-acted members stay
    // excluded, even when the actor's position moves earlier or later.
    let guard=exp.order.length+1;
    while(guard-->0){
      const u=exp.order[exp.turnIndex];
      if(!u||!alive(u)){exp.turnIndex++;continue;}
      const initial=exp.plans.get(u);
      if(initial&&u.pp<100){
        exp.plans.set(u,null);
        // Remove already fainted entries before reordering. Otherwise a dead
        // priority holder can occupy the next slot and waste a timer tick.
        const pending=exp.order.slice(exp.turnIndex).filter(alive);
        const saved=exp.order.slice(0,exp.turnIndex);
        exp.order=pending;sortRemaining(exp);exp.order=saved.concat(exp.order);
        if(exp.order[exp.turnIndex]!==u){record(exp,u.name+" PP 부족 · 행동 순서 재계산");continue;}
      }
      break;
    }
    const unit=exp.order[exp.turnIndex++];
    if(!unit||!alive(unit))return;
    const interruption=S.beforeAction(unit);
    if(interruption==="confusion"){
      const amount=Damage.confusionDamage(unit);
      unit.hp=Math.max(0,unit.hp-amount);
      record(exp,unit.name+" 혼란 자해 · "+amount+" 피해");
      if(unit.hp===0)handleFaint(exp,unit,false);
    } else if(interruption)record(exp,unit.name+" · "+interruption);
    else {
      let plan=exp.plans.get(unit);
      if(!plan&&unit.pp>=100&&unit.moves?.length)
        plan=T.selectMove(exp,unit); // PP recovered; priority/order never retroactively changes.
      if(plan&&unit.pp>=100){
        // Select the target NOW using current HP, status and living members.
        const withTarget=T.selectTarget(exp,unit,plan);
        if(withTarget)M.execute(exp,unit,withTarget,(u,award)=>handleFaint(exp,u,award));
        else record(exp,unit.name+" · 대상 없음 · 행동 실패 (PP 유지)");
      }else fallbackAttack(exp,unit);
    }
    finalize(exp);
    if(exp.mode!=="combat")return;
    // End-of-round effects apply after every living combatant has had its chance.
    // Fainted members cannot require an extra timer tick.
    let next=exp.turnIndex;
    while(next<exp.order.length&&!alive(exp.order[next]))next++;
    if(next<exp.order.length)return;
    for(const member of [...exp.party,...exp.enemies].filter(alive)){
      const residual=S.afterAction(member);
      if(residual){
        member.hp=Math.max(0,member.hp-residual);
        record(exp,member.name+" 상태이상 피해 "+residual);
        if(member.hp===0)handleFaint(exp,member,member.side==="enemy");
      }
    }
    for(const key of ["weather","terrain"]){
      if(exp[key]&&--exp[key].remaining<=0){record(exp,key+" 효과 종료");exp[key]=null;}
    }
    finalize(exp);
  }
  G.combat={start:startCombat,step};
})();