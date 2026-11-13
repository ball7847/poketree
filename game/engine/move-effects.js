/* Executable effects for verified move IDs. Incomplete original mechanics
 * remain unregistered instead of guessed. */
(() => {
  "use strict";
  const S=window.PokeBattleStatus,D=window.PokeDamage;
  function healAmount(user,target,area=false){
    const base=Math.floor((target.maxHp+user.spAttack)/4);
    return area||user!==target?Math.floor(base*2/3):base;
  }
  function hitCount(move){
    if(!move.hits)return 1;
    const r=Math.random();
    return r<.35?2:r<.70?3:r<.85?4:5;
  }
  function execute(exp,user,plan,applyFaint){
    const G=window.PokeTree,move=plan.move;
    const targets=window.PokeTargeting.candidates(exp,user,move);
    let chosen=targets;
    if(!["enemies","allies","field"].includes(move.target)){
      const t=targets.find(u=>u.id===plan.targetId);
      if(!t)return {failed:true};
      chosen=[t];
    }
    user.pp-=100;
    G.record(exp,user.name+" · "+move.name+" 사용 (PP -100)");
    const faintCandidates=new Set(),recoilTargets=[];
    let recoil=0;
    for(const target of chosen){
      const probability=S.accuracy(move,user,target);
      if(Math.random()>=probability){G.record(exp,move.name+" · "+target.name+"에게 빗나감");continue;}
      if(move.effect==="heal"){
        const actual=Math.min(target.maxHp-target.hp,healAmount(user,target,move.target==="allies"));
        target.hp+=actual;G.record(exp,target.name+" HP "+actual+" 회복");continue;
      }
      if(move.effect==="rank"){S.rank(target,move.rank.stat,move.rank.stages);G.record(exp,target.name+"의 "+move.rank.stat+" 랭크 변화");continue;}
      if(move.effect==="status"){if(S.inflict(target,move.status))G.record(exp,target.name+" · "+move.status+" 상태이상");continue;}
      if(move.effect==="weather"){exp.weather={kind:move.weather,remaining:move.duration};G.record(exp,"날씨: "+move.weather);continue;}
      if(move.effect==="terrain"){exp.terrain={kind:move.terrain,remaining:move.duration};G.record(exp,"필드: "+move.terrain);continue;}
      const count=hitCount(move);
      for(let i=0;i<count;i++){
        // Confirmed PokeTree rule: run every hit, even after reaching 0 HP.
        const result=D.roll(user,target,{move,weather:exp.weather,terrain:exp.terrain});
        const actual=Math.min(target.hp,result.damage);
        target.hp=Math.max(0,target.hp-result.damage);
        G.record(exp,move.name+" → "+target.name+" "+(i+1)+"타 · "+actual+" 피해"+(result.critical?" · 급소":""));
        if(move.secondary&&Math.random()*100<move.secondary.chance&&S.inflict(target,move.secondary.kind))
          G.record(exp,target.name+" · "+move.secondary.kind+" 상태이상");
        if(move.effect==="drain"&&actual>0){
          const amount=Math.max(1,Math.floor(actual*move.drain));
          const recovered=Math.min(user.maxHp-user.hp,amount);
          user.hp+=recovered;G.record(exp,user.name+" HP "+recovered+" 흡수");
        }
        if(move.effect==="recoil")recoil+=actual;
      }
      if(target.hp===0)faintCandidates.add(target);
    }
    if(move.effect==="recoil"&&recoil>0){
      const damage=Math.max(1,Math.floor(recoil*move.recoil));
      user.hp=Math.max(0,user.hp-damage);
      G.record(exp,user.name+" 반동 "+damage+" 피해");
    }
    if(move.effect==="selfdestruct"){
      user.hp=0;G.record(exp,user.name+" 자폭");
    }
    // All self-inflicted fainting resolves before enemy experience distribution.
    if(user.hp===0)applyFaint(user,false);
    for(const enemy of faintCandidates)if(enemy.hp===0)applyFaint(enemy,true);
    return {failed:false};
  }
  window.PokeMoveEffects=Object.freeze({execute,healAmount,hitCount});
})();