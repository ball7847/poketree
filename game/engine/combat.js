/* A turn consumes one common action interval; speed sorts at ROUND boundaries. */
(() => {
  "use strict";
  const G = window.PokeTree, {state,db,choose,alive,record,Pokemon,Damage} = G;
  function beginRound(exp) {
    const members = [...exp.party,...exp.enemies].filter(alive);
    const tiebreak = new Map(members.map(u => [u,Math.random()]));
    members.sort((a,b) => b.speed - a.speed || tiebreak.get(a) - tiebreak.get(b));
    exp.order = members;
    exp.turnIndex = 0;
    exp.round++;
    record(exp, exp.round + "라운드 시작");
  }
  function startCombat(exp) {
    const loc = G.place(exp);
    const count = choose(loc.enemyCount,item => item.weight).value;
    exp.enemies = Array.from({length:count},(_,i)=>{
      const species = choose(loc.species,id=>db.species[id].weight);
      // Lv.5 is an explicit prototype opponent value; not final balance.
      return Pokemon.create({id:exp.id+"-"+exp.actions+"-"+i,species,level:5,side:"enemy"});
    });
    exp.mode = "combat"; exp.round = 0; exp.order = []; exp.turnIndex = 0;
    record(exp,loc.name+"에서 "+exp.enemies.map(u=>u.name).join(", ")+"을(를) 마주쳤습니다.");
    beginRound(exp);
  }
  function faint(exp,unit) {
    if (unit.side === "ally") {
      unit.experience=0; // confirmed: lose current-level XP, never lower level
      const losses = Math.floor(unit.bag.length / 2);
      for(let i=0;i<losses;i++) unit.bag.splice(Math.floor(Math.random()*unit.bag.length),1);
      record(exp,unit.name+" 기절 · 전리품 "+losses+"개 손실");
      G.change("bags",exp.id);
    } else record(exp,unit.name+" 기절");
  }
  function finish(exp) {
    exp.wins++;
    record(exp,"전투 승리 (정식 경험치/드롭 미구현)");
    G.addLoot(exp,"시연용 전리품");
    exp.enemies=[];exp.order=[];exp.mode="exploration";exp.round=0;exp.turnIndex=0;
  }
  function step(exp) {
    // Every skipped fainted turn is removed without taking an extra timer tick.
    while (exp.turnIndex < exp.order.length && !alive(exp.order[exp.turnIndex])) exp.turnIndex++;
    if (exp.turnIndex >= exp.order.length) beginRound(exp);
    const unit = exp.order[exp.turnIndex++];
    if (!unit || !alive(unit)) return;
    const enemies = (unit.side==="ally" ? exp.enemies : exp.party).filter(alive);
    if (!enemies.length) return;
    const victim = enemies[Math.floor(Math.random()*enemies.length)];
    const result=Damage.roll(unit,victim);
    Pokemon.usedNormalAttack(unit); // rotate types even on immunity / zero damage
    const actual=Math.min(victim.hp,result.damage);
    victim.hp=Math.max(0,victim.hp-result.damage);
    // PP gain requires at least one equipped skill; skills themselves await design.
    if(unit.moves?.length&&actual>0)unit.pp+=Pokemon.ppGain(unit);
    record(exp,unit.name+" → "+victim.name+" · "+actual+" 피해"+(result.critical?" · 급소":"")+" ("+result.type+")");
    if(victim.hp===0) faint(exp,victim);
    if(!exp.enemies.some(alive)) finish(exp);
    else if(!exp.party.some(alive)) {
      exp.enemies=[];exp.order=[];exp.round=0;exp.turnIndex=0;exp.mode="recovery";
      record(exp,"전원 기절 · HP 회복 후 같은 지역에서 탐험 재개");
    }
  }
  G.combat={start:startCombat,step};
})();
