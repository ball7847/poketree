/* Shared state and utilities. All balance numbers are DEMO ONLY. */
(() => {
  "use strict";
  const db = window.POKE_DATA;
  const $ = id => document.getElementById(id);
  const roster = db.demoParty.map(item => ({
    ...item, hp: db.species[item.species].maxHp,
    maxHp: db.species[item.species].maxHp,
    speed: db.species[item.species].speed,
    bag: [], side: "ally", expedition: null
  }));
  const state = {
    regions: Object.fromEntries(Object.keys(db.regions).map(id => [id, {
      id, mode: "idle", locationId: null, party: [], enemies: [],
      round: 0, order: [], turnIndex: 0, actions: 0,
      remainingMs: 3000, lastEvent: "탐험 대기", logs: [], wins: 0
    }])),
    roster, speedMs: 3000, lastTime: performance.now(),
    activeTab: "village", currentDetail: null,
    log: [], notifications: [], collected: [],
    selectedParty: new Set(), pendingRegion: null
  };
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
    DEMO: {allyDamage:12, enemyDamage:9, recovery:8, bagCapacity:100} };
})();
