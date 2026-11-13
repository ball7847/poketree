/* Damage supports normal attacks and original-type physical/special moves.
 * PokeTree-specific per-modifier flooring remains unchanged.
 */
(() => {
  "use strict";
  const chart=window.POKE_TYPE_CHART,P=window.PokePokemon;
  function effectiveness(attackType,defender){
    const defending=P.template(defender.species,defender.form).form.types;
    return defending.reduce((x,type)=>x*(chart[attackType]?.[type]??1),1);
  }
  function rankFactor(rank){
    if(!Number.isInteger(rank)||rank< -6||rank>6)throw Error("능력치 랭크는 -6~6");
    return rank>=0?1+0.2*rank:1/(1+0.2*Math.abs(rank));
  }
  function compute(attacker,defender,{random=100,critical=false,rankAttack,rankDefense,move=null,weather=null,terrain=null}={}){
    if(!Number.isInteger(random)||random<85||random>100)throw Error("난수는 85~100 사이 정수");
    const category=move?.category||P.attackCategory(attacker);
    if(!["physical","special"].includes(category))throw Error("피해 기술 분류 오류");
    const aKey=category==="physical"?"attack":"spAttack",dKey=category==="physical"?"defense":"spDefense";
    const aRank=rankAttack??attacker.battleStatus?.ranks?.[aKey]??0,dRank=rankDefense??defender.battleStatus?.ranks?.[dKey]??0;
    const atkRank=critical&&aRank<0?0:aRank;
    const defRank=critical&&dRank>0?0:dRank;
    let attack=Math.max(1,Math.floor(attacker[aKey]*rankFactor(atkRank)));
    if(category==="physical"&&attacker.battleStatus?.major?.kind==="burn")attack=Math.max(1,Math.floor(attack*.5));
    const defense=Math.max(1,Math.floor(defender[dKey]*rankFactor(defRank)));
    const type=move?.type||P.normalAttackType(attacker),types=P.template(attacker.species,attacker.form).form.types;
    const stab=types.includes(type)?1.5:1;
    const eff=effectiveness(type,defender);
    const power=move?.power??10;
    if(!Number.isSafeInteger(power)||power<=0)throw Error("위력 정보 오류");
    const levelTerm=Math.floor(2*attacker.level/5)+2;
    const base=Math.floor(Math.floor(levelTerm*power*attack/defense)/50)+2;
    if(eff===0)return {damage:0,category,type,stab,effectiveness:eff,critical,random};
    let damage=base;
    if(critical)damage=Math.floor(damage*1.5);
    damage=Math.floor(damage*random/100);
    damage=Math.floor(damage*stab);
    if(weather?.kind==="rain"){
      if(type==="water")damage=Math.floor(damage*1.5);
      if(type==="fire")damage=Math.floor(damage*.5);
    } else if(weather?.kind==="sun"){
      if(type==="fire")damage=Math.floor(damage*1.5);
      if(type==="water")damage=Math.floor(damage*.5);
    }
    // Grounded targets only; effects that depend on the attacker check attacker.
    const grounded=!P.template(attacker.species,attacker.form).form.types.includes("flying");
    if(grounded&&terrain?.kind==="electric"&&type==="electric")damage=Math.floor(damage*1.3);
    if(grounded&&terrain?.kind==="grassy"&&type==="grass")damage=Math.floor(damage*1.3);
    if(grounded&&terrain?.kind==="psychic"&&type==="psychic")damage=Math.floor(damage*1.3);
    for(const defendingType of P.template(defender.species,defender.form).form.types)
      damage=Math.floor(damage*(chart[type]?.[defendingType]??1));
    damage=Math.max(1,damage);
    return {damage,category,type,stab,effectiveness:eff,critical,random};
  }
  function roll(attacker,defender,options={}){
    const rng=options.rng||Math.random;
    const critical=rng()<.05;
    const random=85+Math.floor(rng()*16);
    return compute(attacker,defender,{...options,critical,random});
  }
  function confusionDamage(unit,rng=Math.random){
    // Original-style typeless, power 40 physical self-hit, never critical/STAB.
    const lvl=Math.floor(2*unit.level/5)+2;
    const atk=Math.max(1,Math.floor(unit.attack*rankFactor(unit.battleStatus?.ranks?.attack??0)));
    const def=Math.max(1,Math.floor(unit.defense*rankFactor(unit.battleStatus?.ranks?.defense??0)));
    const base=Math.floor(Math.floor(lvl*40*atk/def)/50)+2;
    return Math.max(1,Math.floor(base*(85+Math.floor(rng()*16))/100));
  }
  window.PokeDamage=Object.freeze({compute,roll,effectiveness,confusionDamage});
})();