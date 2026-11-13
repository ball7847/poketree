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
  function stage(value){return value>=0?(3+value)/3:3/(3-value);}
  function accuracy(move,attacker,defender){
    if(move.accuracy===null)return 1;
    const a=ensure(attacker).ranks.accuracy,d=ensure(defender).ranks.evasion;
    return Math.max(0,Math.min(1,move.accuracy/100*stage(a-d)));
  }
  function inflict(u,kind){
    const status=ensure(u);
    if(kind==="confusion"){status.confusion=Math.max(status.confusion,3);return true;}
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
    if(m?.kind==="sleep"){m.counter++;if(m.counter<=2)return "잠들어 행동하지 못했습니다.";s.major=null;}
    if(m?.kind==="freeze"){if(roll()>=0.2)return "얼어서 행동하지 못했습니다.";s.major=null;}
    if(m?.kind==="paralysis"&&roll()<0.25)return "몸이 마비되어 행동하지 못했습니다.";
    if(s.confusion>0){s.confusion--;if(roll()<1/3)return "confusion"; }
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
  function endBattle(u){ensure(u).volatile={};}
  function endExpedition(u){u.battleStatus=create();}
  function speed(u){
    const s=ensure(u),rank=s.ranks.speed;
    const factor=rank>=0?1+.2*rank:1/(1+.2*Math.abs(rank));
    return Math.floor(u.speed*factor*(s.major?.kind==="paralysis"?.5:1));
  }
  window.PokeBattleStatus=Object.freeze({create,ensure,rank,accuracy,inflict,beforeAction,afterAction,advanceExploration,endBattle,endExpedition,speed});
})();