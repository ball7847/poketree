/* One expedition per region, unlimited concurrent *different* regions. */
(() => {
  "use strict";
  const G=window.PokeTree,{state,db,choose,record,DEMO,alive}=G;
  function addLoot(exp,loot) {
    const available=exp.party.filter(u=>u.bag.length<DEMO.bagCapacity);
    if(!available.length) {record(exp,"보관함 가득 참 · 전리품 획득 실패");return;}
    const receiver=available[Math.floor(Math.random()*available.length)];
    receiver.bag.push(loot);
    record(exp,receiver.name+" 보관함: "+loot+" 획득");
    G.change("bags",exp.id);
  }
  G.addLoot=addLoot;
  function start(id, pokemonIds) {
    const exp=state.regions[id];
    if(!exp) return "존재하지 않는 지역입니다.";
    if(exp.mode!=="idle") return "이미 탐험 중입니다.";
    if(!Array.isArray(pokemonIds)||pokemonIds.length<1||pokemonIds.length>3||
       new Set(pokemonIds).size!==pokemonIds.length||
       pokemonIds.some(x=>typeof x!=="string"))return "중복 없이 포켓몬 1~3마리를 선택하세요.";
    const byId=new Map(state.roster.map(u=>[u.id,u]));
    if(pokemonIds.some(id=>!byId.has(id)))return "보유하지 않은 포켓몬이 포함되어 있습니다.";
    const party=pokemonIds.map(id=>byId.get(id));
    if(party.some(u=>u.expedition!==null)) return "다른 지역에 파견된 포켓몬은 선택할 수 없습니다.";
    if(party.some(u=>u.hp!==u.maxHp)) return "모든 포켓몬의 HP가 100%여야 출발할 수 있습니다.";
    exp.mode="exploration";exp.error=null;exp.locationId=G.region(exp).start;exp.party=party;exp.enemies=[];
    exp.round=0;exp.order=[];exp.turnIndex=0;exp.actions=0;exp.remainingMs=state.speedMs;
    party.forEach(u=>{u.expedition=id;u.bag=[];u.pp=0;u.normalAttackCount=0;window.PokeBattleStatus.endExpedition(u);});
    exp.weather=null;exp.terrain=null;
    record(exp,G.region(exp).name+" 탐험 출발 · "+G.place(exp).name);
    G.change("expedition",id);G.change("roster");
    return null;
  }
  function recall(id) {
    const exp=state.regions[id];if(!exp||exp.mode==="idle")return;
    const count=exp.party.reduce((n,u)=>n+u.bag.length,0);
    exp.party.forEach(u=>{state.collected.push(...u.bag);for(const loot of u.bag)G.techniques?.collectLoot(loot);u.bag=[];u.expedition=null;u.pp=0;u.normalAttackCount=0;window.PokeBattleStatus.endExpedition(u);});
    exp.weather=null;exp.terrain=null;
    record(exp,"후퇴 완료 · 아이템 "+count+"개 귀환 수령");
    exp.mode="idle";exp.error=null;exp.party=[];exp.enemies=[];exp.locationId=null;
    exp.round=0;exp.order=[];exp.turnIndex=0;exp.remainingMs=state.speedMs;
    G.change("expedition",id);G.change("roster");G.change("bags",id);
  }
  function explorationStep(exp) {
    // Noncombat turns decay ranks and battle-created field conditions.
    for(const u of exp.party)window.PokeBattleStatus.advanceExploration(u);
    for(const key of ["weather","terrain"]){
      if(exp[key]&&--exp[key].remaining<=0){record(exp,key+" 효과 종료");exp[key]=null;}
    }
    const loc=G.place(exp);
    const action=choose(loc.actions,item=>item.weight);
    switch(action.type) {
      case "walk": record(exp,loc.name+"을(를) 걷습니다.");break;
      case "move":
        if(!G.region(exp).locations[action.to]) throw Error("없는 세부 지역 연결");
        exp.locationId=action.to;record(exp,G.place(exp).name+"으로 이동합니다.");break;
      case "encounter":G.combat.start(exp);break;
      case "find":{const loot=G.techniques?.demoFind(exp);record(exp,loc.name+"에서 아이템을 발견했습니다.");addLoot(exp,loot||"시연용 발견 아이템");break;}
      case "egg":record(exp,loc.name+"에서 알을 발견했습니다.");addLoot(exp,"시연용 알");break;
      default: throw Error("알 수 없는 행동: "+action.type);
    }
  }
  function recoveryStep(exp) {
    for(const u of exp.party)u.hp=Math.min(u.maxHp,u.hp+DEMO.recovery);
    if(exp.party.every(u=>u.hp===u.maxHp)){
      exp.mode="exploration";record(exp,"전원 HP 회복 완료 · 탐험 재개");
    }
  }
  function tick(exp) {
    if(exp.mode==="idle")return;
    exp.actions++;
    if(exp.mode==="exploration")explorationStep(exp);
    else if(exp.mode==="combat")G.combat.step(exp);
    else if(exp.mode==="recovery")recoveryStep(exp);
    G.change("expedition",exp.id);
  }
  function healIdle() {
    let updated=false;
    for(const u of state.roster) {
      if(u.expedition!==null||u.hp>=u.maxHp)continue;
      u.hp=Math.min(u.maxHp,u.hp+DEMO.recovery);updated=true;
    }
    if(updated)G.change("roster");
  }
  // Each active region has its own elapsed counter, but all use the same
  // globally upgraded interval. Exploration and battle share the counter
  // *within* that region; no region's clock can interrupt another.
  let idleHealMs=0,lastProgressSignal=0;
  function frame(now) {
    const dt=Math.min(1000,Math.max(0,now-state.lastTime));state.lastTime=now;
    idleHealMs+=dt;
    for(const exp of Object.values(state.regions)) {
      if(exp.mode==="idle"||exp.mode==="error")continue;
      exp.remainingMs-=dt;
      if(exp.remainingMs<=0) {
        exp.remainingMs+=state.speedMs;
        if(exp.remainingMs<=0)exp.remainingMs=state.speedMs;
        try{tick(exp);}catch(e){
          // Preserve party HP, loot and location. Only this region is paused.
          exp.mode="error";
          exp.error=String(e?.message||e);
          record(exp,"탐험 일시 중지 · 오류: "+exp.error);
          G.change("expedition",exp.id);
        }
      }
      // Progress is visual only; engine ticks retain the 100 ms clock.
      if(now-lastProgressSignal>=200)G.change("progress",exp.id);
    }
    if(now-lastProgressSignal>=200)lastProgressSignal=now;
    if(idleHealMs>=state.speedMs){idleHealMs=0;healIdle();}
  }
  function setIntervalMs(ms) {
    if(![3000,2000,1000].includes(ms))return;
    const previous=state.speedMs;
    state.speedMs=ms;
    Object.values(state.regions).forEach(exp=>{
      exp.remainingMs=exp.remainingMs/previous*ms;
    });
    G.change("speed");
  }
  G.exploration={start,recall,frame,setIntervalMs};
})();
