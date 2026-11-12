/* Battle XP: Gen VII scaled level factor + PokeTree's confirmed
 * distribution ordering. Apply EXP immediately when each enemy faints.
 *
 * References: Bulbapedia /wiki/Experience (Generation VII onwards);
 * /wiki/List_of_Pokémon_by_effort_value_yield_(Generation_VII) for base XP.
 *
 * Differences from the cartridge are intentional:
 * - all surviving allies receive evenly shared base EXP regardless of actions;
 * - ceil base EXP / survivors BEFORE applying each recipient's level modifier;
 * - no trainer, trading, Lucky Egg, affection or other bonus;
 * - current-level EXP is reset upon fainting, separately in combat.js.
 */
(() => {
  "use strict";
  const G=window.PokeTree,{db,Pokemon,record}=G;
  const roundGen7=value=>{
    // Gen V onward modifiers: nearest integer, exact halves round down.
    // For positive values, ceil(value - 0.5) implements ties-down.
    return Math.ceil(value-0.5);
  };
  function baseExperience(enemy){
    const form=db.species[enemy.species]?.forms?.[enemy.form];
    const b=form?.baseExp??db.species[enemy.species]?.baseExp;
    if(!Number.isSafeInteger(b)||b<=0)throw Error("적 종족 기본 경험치 정보 오류");
    if(!Number.isSafeInteger(enemy.level)||enemy.level<1)throw Error("적 레벨 오류");
    const value=Math.floor(b*enemy.level/5);
    if(!Number.isSafeInteger(value))throw Error("기본 경험치 안전 정수 범위 초과");
    return value;
  }
  function calculate(enemy,recipient,survivors){
    if(!Number.isSafeInteger(survivors)||survivors<1)throw Error("경험치 분배 인원 오류");
    if(!Number.isSafeInteger(recipient.level)||recipient.level<1)throw Error("아군 레벨 오류");
    const base=baseExperience(enemy);
    const share=Math.ceil(base/survivors);
    const enemyLevel=enemy.level;
    const ratio=(2*enemyLevel+10)/(enemyLevel+recipient.level+10);
    const scaled=share*Math.pow(ratio,2.5);
    if(!Number.isFinite(scaled)||scaled<0)throw Error("전투 경험치 계산 오류");
    const gained=roundGen7(scaled)+1;
    if(!Number.isSafeInteger(gained))throw Error("지급 경험치 안전 정수 범위 초과");
    return {base,share,ratio,gained};
  }
  function award(exp,enemy){
    if(enemy.side!=="enemy"||enemy.hp!==0)throw Error("기절한 적만 경험치를 지급할 수 있습니다");
    // Fainting is processed before this call, so a fainted ally cannot qualify.
    const recipients=exp.party.filter(u=>u.side==="ally"&&u.hp>0);
    if(!recipients.length)return [];
    // Compute all rewards using levels at the instant the opponent faints.
    const rewards=recipients.map(u=>({unit:u,...calculate(enemy,u,recipients.length)}));
    const results=[];
    for(const entry of rewards){
      const {unit,gained}=entry,oldLevel=unit.level;
      const outcome=Pokemon.grantExperience(unit,gained);
      record(exp,unit.name+"가 경험치 "+gained+"을(를) 획득했습니다.");
      if(outcome.levels)record(exp,unit.name+"가 Lv."+oldLevel+" → Lv."+unit.level+"로 성장했습니다.");
      if(outcome.unapplied)record(exp,unit.name+"의 경험치 "+outcome.unapplied+"은(는) 미확정 성장 공식으로 지급 보류되었습니다.");
      results.push({id:unit.id,experience:gained,levels:outcome.levels,unapplied:outcome.unapplied});
    }
    return results;
  }
  G.battleExperience={baseExperience,calculate,award};
})();