/* Executable effects for verified move IDs. Incomplete original mechanics
 * remain unregistered instead of guessed. */
(() => {
  "use strict";
  const S=window.PokeBattleStatus,D=window.PokeDamage;
  function healAmount(user,target,area=false,move=null,weather=null){
    // Explicit original 50%-max-HP self recovery; preserve other recovery effects.
    if(move?.healFraction===0.5)return Math.max(1,Math.floor(target.maxHp/2));
    if(move?.weatherHeal){
      const kind=weather?.kind||null;
      const fraction=kind==="sun"?2/3:kind&&["rain","sandstorm","snow","hail"].includes(kind)?1/4:1/2;
      return Math.max(1,Math.floor(target.maxHp*fraction));
    }
    const base=Math.floor((target.maxHp+user.spAttack)/4);
    return area||user!==target?Math.floor(base*2/3):base;
  }
  function hitCount(move){
    if(Number.isInteger(move.hits))return move.hits;
    if(!move.hits)return 1;
    const r=Math.random();
    return r<.35?2:r<.70?3:r<.85?4:5;
  }
  function execute(exp,user,plan,applyFaint){
    const G=window.PokeTree,move=plan.move;
    // Every recoil attack is single-target in PokeTree, including originally
    // spread moves. Reject invalid data rather than silently attacking a group.
    if(move.effect==="recoil"&&move.target!=="enemy")
      throw Error("반동 공격은 단일 적 대상이어야 합니다.");
    if(!Number.isFinite(user.pp)||user.pp<100)
      return {failed:true,reason:"insufficient-pp"};
    const targets=window.PokeTargeting.candidates(exp,user,move);
    let chosen=targets;
    if(!["enemies","allies","field"].includes(move.target)){
      const t=targets.find(u=>u.id===plan.targetId);
      if(!t)return {failed:true};
      chosen=[t];
    }
    if(!chosen.length)return {failed:true,reason:"no-target"};
    user.pp-=100;
    G.record(exp,user.name+" · "+move.name+" 사용 (PP -100)");
    const faintCandidates=new Set();
    let recoil=0,hitForRecharge=false;
    for(const target of chosen){
      // Psychic Terrain protects grounded foes from positive-priority attacks.
      if(exp.terrain?.kind==="psychic"&&move.priority>0&&
         (move.target==="enemy")&&S.grounded(target)){
        G.record(exp,target.name+" · 사이코필드로 우선도 기술 차단");continue;
      }
      // Toxic used by a Poison-type Pokémon bypasses accuracy checks in the source rule.
      // This is move-specific; all other PokeTree accuracy handling stays unchanged.
      const poisonUser=move.poisonTypeNeverMiss&&window.PokePokemon.template(user.species,user.form).form.types.includes("poison");
      const probability=poisonUser?1:S.accuracy(move,user,target);
      if(move.accuracyMode!=="per-hit"&&Math.random()>=probability){G.record(exp,move.name+" · "+target.name+"에게 빗나감");continue;}
      if(move.effect==="heal"){
        const actual=Math.min(target.maxHp-target.hp,healAmount(user,target,move.target==="allies",move,exp.weather));
        target.hp+=actual;G.record(exp,target.name+" HP "+actual+" 회복");continue;
      }
      if(move.effect==="rank"){S.rank(target,move.rank.stat,move.rank.stages);G.record(exp,target.name+"의 "+move.rank.stat+" 랭크 변화");continue;}
      if(move.effect==="multi-rank"){
        for(const [stat,stages] of move.ranks)S.rank(target,stat,stages);
        G.record(exp,target.name+" · 복합 랭크 변화");continue;
      }
      if(move.effect==="party-cure"){
        // Exp. party is the battle's active allied group; major statuses only.
        const status=S.ensure(target);
        if(status.major){status.major=null;G.record(exp,target.name+" · 주요 상태이상 치료");}
        continue;
      }
      if(move.effect==="status"&&move.powder&&
         window.PokePokemon.template(target.species,target.form).form.types.includes("grass")){
        G.record(exp,target.name+" · 가루 기술 무효");continue;
      }
      if(move.effect==="status"){
        // E.g. Thunder Wave cannot paralyze Ground targets (Electric immunity).
        if(move.type==="electric"&&D.effectiveness(move.type,target)===0){
          G.record(exp,target.name+"에게 "+move.name+" 효과 없음");continue;
        }
        if(S.inflict(target,move.status,exp))G.record(exp,target.name+" · "+move.status+" 상태이상");
        continue;
      }
      if(move.effect==="weather"){exp.weather={kind:move.weather,remaining:move.duration};G.record(exp,"날씨: "+move.weather);continue;}
      if(move.effect==="terrain"){exp.terrain={kind:move.terrain,remaining:move.duration};G.record(exp,"필드: "+move.terrain);continue;}
      const count=hitCount(move);
      for(let i=0;i<count;i++){
        // Certain original multi-hit moves check accuracy on every hit and
        // terminate on their first miss. Others check only once above.
        if(move.accuracyMode==="per-hit"&&Math.random()>=probability){
          G.record(exp,move.name+" · "+(i+1)+"타 빗나감 · 연속 공격 종료");break;
        }
        // Confirmed PokeTree rule: run every hit, even after reaching 0 HP.
        const result=D.roll(user,target,{move,weather:exp.weather,terrain:exp.terrain});
        const allowed=move.minTargetHp===1?Math.max(0,target.hp-1):target.hp;
        const actual=Math.min(allowed,result.damage);
        if(move.effect==="recharge"&&actual>0)hitForRecharge=true;
        target.hp=Math.max(move.minTargetHp===1?1:0,target.hp-actual);
        if(move.type==="fire"&&result.effectiveness>0&&S.thawFromFire(target))
          G.record(exp,target.name+" 얼음 상태 해제 (불꽃 기술)");
        G.record(exp,move.name+" → "+target.name+" "+(i+1)+"타 · "+actual+" 피해"+(result.critical?" · 급소":""));
        if(result.damage>0&&move.secondary&&Math.random()*100<move.secondary.chance&&S.inflict(target,move.secondary.kind,exp))
          G.record(exp,target.name+" · "+move.secondary.kind+" 상태이상");
        // Flinch only applies to a living defender whose personal turn is still
        // pending in the current round. A defender that already acted cannot
        // carry flinch into the next round.
        if(result.damage>0&&target.hp>0&&move.secondaryFlinch&&
           exp.order?.slice(exp.turnIndex).includes(target)&&
           Math.random()*100<move.secondaryFlinch.chance&&S.flinch(target))
          G.record(exp,target.name+" · 풀죽음");
        // Shared attack + stat-rank effect family. Non-damaging or immune hits
        // cannot trigger it; this does not alter existing status effects.
        if(result.damage>0&&move.secondaryRank&&Math.random()*100<move.secondaryRank.chance){
          const recipient=move.secondaryRank.target==="self"?user:target;
          if(recipient.hp>0){
            S.rank(recipient,move.secondaryRank.stat,move.secondaryRank.stages);
            G.record(exp,recipient.name+" · "+move.secondaryRank.stat+" "+move.secondaryRank.stages+"랭크");
          }
        }
        if(actual>0&&move.secondaryRanks&&user.hp>0&&
           Math.random()*100<move.secondaryRanks.chance){
          const recipient=move.secondaryRanks.target==="self"?user:target;
          for(const [stat,stages] of move.secondaryRanks.changes)
            S.rank(recipient,stat,stages);
          G.record(exp,recipient.name+" · 복합 랭크 변화");
        }
        if(move.effect==="drain"&&actual>0){
          const amount=Math.max(1,Math.floor(actual*move.drain));
          const recovered=Math.min(user.maxHp-user.hp,amount);
          user.hp+=recovered;G.record(exp,user.name+" HP "+recovered+" 흡수");
        }
        if(move.effect==="bind"&&actual>0&&target.hp>0&&
           S.bind(target,user,...move.bindDuration))
          G.record(exp,target.name+" · 속박 시작");
        if(move.effect==="recoil")recoil+=actual;
      }
      if(target.hp===0)faintCandidates.add(target);
    }
    if(move.effect==="recoil"&&recoil>0){
      const damage=Math.max(1,Math.floor(recoil*move.recoil));
      user.hp=Math.max(0,user.hp-damage);
      G.record(exp,user.name+" 반동 "+damage+" 피해");
    }
    if(move.effect==="recharge"&&hitForRecharge&&user.hp>0){
      S.recharge(user);G.record(exp,user.name+" · 다음 개인 턴 재충전");
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