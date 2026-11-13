/* Persistent per-expedition status, with per-battle transient effects. */
(() => {
  "use strict";
  const stats=["attack","defense","spAttack","spDefense","speed","accuracy","evasion"];
  const create=()=>({ranks:Object.fromEntries(stats.map(k=>[k,0])),major:null,confusion:0,volatile:{}});
  function ensure(u){return u.battleStatus||(u.battleStatus=create());}
  function rank(u,key,delta){
    if(!stats.includes(key)||!Number.isInteger(delta))throw Error("랭크 변경 오류");
    const s=ensure(u);s.ranks[key]=Math.max(-6,Math.min(6,s.ranks[key]+delta));
    return s.ranks[key];
  }
  function stage(value){
    const rank=Math.max(-6,Math.min(6,value));
    return rank>=0?(3+rank)/3:3/(3-rank);
  }
  function accuracy(move,attacker,defender){
    if(move.accuracy===null)return 1;
    const a=ensure(attacker).ranks.accuracy,d=ensure(defender).ranks.evasion;
    return Math.max(0,Math.min(1,move.accuracy/100*stage(a-d)));
  }
  function grounded(u){
    // Flying typing is supported; Levitate, Air Balloon and forced grounding
    // require their own confirmed ability/item/move implementations.
    return !window.PokePokemon.template(u.species,u.form).form.types.includes("flying");
  }
  function inflict(u,kind,field={}){
    if(u.hp<=0)return false;
    if(field.terrain?.kind==="misty"&&grounded(u))return false;
    if(kind==="sleep"&&field.terrain?.kind==="electric"&&grounded(u))return false;
    if(kind==="freeze"&&field.weather?.kind==="sun")return false;
    const status=ensure(u);
    if(kind==="confusion"){
      if(status.confusion>0)return false;
      status.confusion=1+Math.floor(Math.random()*4); // Champions: 1–4 attempts
      return true;
    }
    if(status.major)return false;
    const types=window.PokePokemon.template(u.species,u.form).form.types;
    if((kind==="burn"&&types.includes("fire"))||
       (kind==="paralysis"&&types.includes("electric"))||
       ((kind==="poison"||kind==="toxic")&&(types.includes("steel")||types.includes("poison")))||
       (kind==="freeze"&&types.includes("ice")))return false;
    status.major={kind,counter:0};
    return true;
  }
  function beforeAction(u,roll=Math.random){
    const s=ensure(u),m=s.major;
    if(m?.kind==="sleep"){
      m.counter++;
      if(m.counter===1||(m.counter===2&&roll()>=1/3))return "잠들어 행동하지 못했습니다.";
      s.major=null; // Champions: 1st blocked, 2nd 1/3 wake, 3rd guaranteed
    }
    if(m?.kind==="freeze"){
      m.counter++;
      if(m.counter<3&&roll()>=.25)return "얼어서 행동하지 못했습니다.";
      s.major=null;
    }
    if(m?.kind==="paralysis"&&roll()<.125)return "몸이 마비되어 행동하지 못했습니다.";
    if(s.confusion>0){
      // The final confused attempt can also trigger self-damage.
      s.confusion--;
      if(roll()<1/3)return "confusion";
    }
    return null;
  }
  function afterAction(u){
    const m=ensure(u).major;if(!m)return 0;
    if(!["burn","poison","toxic"].includes(m.kind))return 0;
    m.counter++;
    const ratio=m.kind==="burn"?1/16:m.kind==="poison"?1/8:Math.min(15,m.counter)/16;
    return Math.min(u.hp,Math.max(1,Math.floor(u.maxHp*ratio)));
  }
  function advanceExploration(u){
    const s=ensure(u);
    for(const stat of stats)s.ranks[stat]-=Math.sign(s.ranks[stat]);
  }
  function thawFromFire(u){
    const s=ensure(u);
    if(s.major?.kind!=="freeze")return false;
    s.major=null;
    return true;
  }
  function endBattle(u){
    const s=ensure(u);
    s.volatile={};
    // In a new encounter the Toxic damage sequence restarts at 1/16.
    if(s.major?.kind==="toxic")s.major.counter=0;
  }
  function fieldEndRound(exp){
    const effects=[];
    for(const u of [...exp.party,...exp.enemies].filter(x=>x.hp>0)){
      const types=window.PokePokemon.template(u.species,u.form).form.types;
      if(exp.weather?.kind==="sandstorm"&&!types.some(t=>["rock","ground","steel"].includes(t))){
        const amount=Math.min(u.hp,Math.max(1,Math.floor(u.maxHp/16)));
        u.hp-=amount;effects.push({unit:u,amount,kind:"sandstorm"});
      }
      if(u.hp>0&&exp.terrain?.kind==="grassy"&&grounded(u)){
        const amount=Math.min(u.maxHp-u.hp,Math.max(1,Math.floor(u.maxHp/16)));
        u.hp+=amount;if(amount)effects.push({unit:u,amount,kind:"grassy"});
      }
    }
    return effects;
  }
  function endExpedition(u){u.battleStatus=create();}
  function speed(u){
    const s=ensure(u),rank=s.ranks.speed;
    const factor=rank>=0?1+.2*rank:1/(1+.2*Math.abs(rank));
    return Math.floor(u.speed*factor*(s.major?.kind==="paralysis"?.5:1));
  }
  window.PokeBattleStatus=Object.freeze({create,ensure,rank,accuracy,inflict,beforeAction,afterAction,advanceExploration,thawFromFire,endBattle,endExpedition,speed,grounded,fieldEndRound});
})();