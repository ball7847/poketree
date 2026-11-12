/* Generation V+ inspired ordinary attack: base power=10, move type rotates for dual types.
 * Round DOWN at integer boundaries. Crit default 5%, multiplier x1.5.
 * For exact cartridge parity, future special modifiers/rounding rules need separate data.
 */
(() => {
  "use strict";
  const chart=window.POKE_TYPE_CHART,P=window.PokePokemon;
  function effectiveness(attackType,defender){
    const defending=P.template(defender.species,defender.form).form.types;
    return defending.reduce((x,type)=>x*(chart[attackType]?.[type]??1),1);
  }
  function compute(attacker,defender,{random=100,critical=false,rankAttack=0,rankDefense=0}={}){
    if(!Number.isInteger(random)||random<85||random>100)throw Error("난수는 85~100 사이 정수");
    const category=P.attackCategory(attacker);
    const aKey=category==="physical"?"attack":"spAttack",dKey=category==="physical"?"defense":"spDefense";
    const rankFactor=r=>r>=0?1+0.2*r:1/(1+0.2*Math.abs(r));
    const atkRank=critical&&rankAttack<0?0:rankAttack;
    const defRank=critical&&rankDefense>0?0:rankDefense;
    const attack=Math.max(1,Math.floor(attacker[aKey]*rankFactor(atkRank)));
    const defense=Math.max(1,Math.floor(defender[dKey]*rankFactor(defRank)));
    const type=P.normalAttackType(attacker),types=P.template(attacker.species,attacker.form).form.types;
    const stab=types.includes(type)?1.5:1;
    const eff=effectiveness(type,defender);
    const base=Math.floor(Math.floor((Math.floor(2*attacker.level/5)+2)*10*attack/defense)/50)+2;
    const damage=eff===0?0:Math.max(1,Math.floor(Math.floor(Math.floor(base*stab)*eff)*(critical?1.5:1)*random/100));
    return {damage,category,type,stab,effectiveness:eff,critical,random};
  }
  function roll(attacker,defender,{rng=Math.random}={}){
    const critical=rng()<.05;
    const random=85+Math.floor(rng()*16);
    return compute(attacker,defender,{critical,random});
  }
  window.PokeDamage=Object.freeze({compute,roll,effectiveness});
})();