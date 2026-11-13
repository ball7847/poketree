/* Shared state and utilities. All balance numbers are DEMO ONLY. */
(() => {
  "use strict";
  const db = window.POKE_DATA;
  const $ = id => document.getElementById(id);
  const validationErrors=validateData();
  if(validationErrors.length)throw Error("PokeTree 데이터 오류: "+validationErrors.join("; "));
  const Pokemon=window.PokePokemon;
  const errors=Pokemon.validateSpecies();
  if(errors.length)throw Error("포켓몬 데이터 오류: "+errors.join(", "));
  const roster = db.demoParty.map((item,index)=>Pokemon.create({
    ...item,level:5,
    nature:["hardy","adamant","timid"][index]||"hardy",
    side:"ally"
  }));
  const state = {
    regions: Object.fromEntries(Object.keys(db.regions).map(id => [id, {
      id, mode: "idle", locationId: null, party: [], enemies: [],
      round: 0, order: [], turnIndex: 0, actions: 0, steps: 0,
      remainingMs: 3000, lastEvent: "탐험 대기", logs: [], wins: 0, error: null
    }])),
    unlockedRegions:["windy","meadow"],bossFirstWins:[],
    roster, speedMs: 3000, lastTime: performance.now(),
    activeTab: "village",
    log: [], notifications: [], collected: [],
    technicalMachines:[],materialDex:[],materials:{},
    toolInventory:{},toolQueue:[],toolQueueCapacity:3,toolNextId:1,toolLastAt:Date.now(),
    // Popup preparation state stays inside its UI module.
  };
  function validateData(data=db) {
    const errors=[];
    if(!data || !data.species || !data.regions || !Array.isArray(data.demoParty)) return ["기본 게임 데이터 누락"];
    const ids=new Set();
    for(const unit of data.demoParty){
      if(!unit.id || ids.has(unit.id))errors.push("중복 또는 누락된 보유 개체 ID: "+unit.id);
      ids.add(unit.id);
      if(!data.species[unit.species])errors.push("알 수 없는 보유 포켓몬 종족: "+unit.species);
    }
    for(const [sid,s] of Object.entries(data.species)){
      if(!Number.isFinite(s.weight)||s.weight<0)errors.push("종족 가중치 오류: "+sid);
      if(!s.forms?.normal || !s.growth)errors.push("종족 데이터 오류: "+sid);
    }
    for(const [rid,region] of Object.entries(data.regions)){
      if(!Array.isArray(region.levelRange)||region.levelRange.length!==2||region.levelRange.some(x=>!Number.isInteger(x)||x<1)||region.levelRange[0]>region.levelRange[1])errors.push("지역 레벨 범위 오류: "+rid);
      if(!Array.isArray(region.mainTypes)||region.mainTypes.length!==3)errors.push("지역 주타입 오류: "+rid);
      if(region.unlock){
        if(!data.regions[region.unlock.region])errors.push("지역 해금 선행 지역 누락: "+rid);
        if(!["steps","boss"].includes(region.unlock.type))errors.push("지역 해금 종류 오류: "+rid);
        if(region.unlock.type==="steps"&&(!Number.isSafeInteger(region.unlock.count)||region.unlock.count<1))errors.push("지역 해금 횟수 오류: "+rid);
      }
      if(!region.demoContent&&Object.keys(region.locations||{}).length===0)continue;
      if(!region.locations?.[region.start])errors.push("지역 시작 지점 누락: "+rid);
      for(const [lid,loc] of Object.entries(region.locations||{})){
        const context=rid+"/"+lid;
        if(!Array.isArray(loc.actions)||Math.abs(loc.actions.reduce((sum,a)=>sum+Number(a.weight||0),0)-100)>1e-9)errors.push("행동 확률 합계 오류: "+context);
        for(const a of loc.actions||[]){
          if(!Number.isFinite(a.weight)||a.weight<0)errors.push("행동 가중치 오류: "+context);
          if(a.type==="move"&&!region.locations[a.to])errors.push("없는 이동 목적지: "+context+" → "+a.to);
          if(!["walk","move","encounter","find","egg"].includes(a.type))errors.push("알 수 없는 행동: "+context+"/"+a.type);
        }
        if(!Array.isArray(loc.enemyCount)||Math.abs(loc.enemyCount.reduce((sum,a)=>sum+Number(a.weight||0),0)-100)>1e-9)errors.push("적 마릿수 확률 합계 오류: "+context);
        for(const a of loc.enemyCount||[])if(!Number.isInteger(a.value)||a.value<=0||!Number.isFinite(a.weight)||a.weight<0)errors.push("적 마릿수 가중치 오류: "+context);
        if(!Array.isArray(loc.species)||!loc.species.length)errors.push("등장 종족 없음: "+context);
        for(const id of loc.species||[])if(!data.species[id]||data.species[id].weight<=0)errors.push("출현 비율 미설정 종족: "+context+"/"+id);
      }
    }
    return errors;
  }
  function choose(items, weight) {
    const available = items.filter(x => Number(weight(x)) > 0);
    const total = available.reduce((a, x) => a + Number(weight(x)), 0);
    if (!total) throw Error("가중치 합계가 0입니다");
    let n = Math.random() * total;
    for (const item of available) if ((n -= Number(weight(item))) < 0) return item;
    return available.at(-1);
  }
  function region(exp) { return db.regions[exp.id]; }
  function place(exp) { return region(exp).locations[exp.locationId]; }
  function alive(unit) { return unit.hp > 0; }
  function time() { return new Date().toLocaleTimeString("ko-KR",{hour12:false}); }
  function text(id,value) {
    const el = $(id), str = String(value);
    if (el && el.textContent !== str) el.textContent = str;
  }
  const listeners = new Set();
  function change(type, regionId = null) {
    listeners.forEach(fn => fn(type, regionId));
  }
  function onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  function record(exp, message) {
    const item = {time:time(), regionId:exp?.id || null, message};
    if (exp) {
      exp.lastEvent = message;
      exp.logs.unshift(item);
      if (exp.logs.length > 60) exp.logs.pop();
    }
    state.log.unshift(item);
    if (state.log.length > 160) state.log.pop();
    change("log", exp?.id || null);
  }
  function notification(message) {
    state.notifications.unshift({time:time(),message});
    if (state.notifications.length > 30) state.notifications.pop();
    change("notification");
  }
  window.PokeTree = { db, $, state, choose, region, place, alive, text, change, onChange, record, notification,
    validateData,Pokemon,Experience:window.PokeExperience,Damage:window.PokeDamage, DEMO: {recovery:8, bagCapacity:100} };
})();
