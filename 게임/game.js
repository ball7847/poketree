/* PokeTree first playable prototype. No production balancing implied.
   The exploration event scheduler and battle action scheduler share one clock.
*/
(function () {
  "use strict";
  const DB = window.POKE_DATA;
  const $ = (id) => document.getElementById(id);
  const MAX_LOG = 160;
  const BAG_CAPACITY = 100;
  const DEMO_DAMAGE_ALLY = 12;  // temporary: final damage formula is undecided
  const DEMO_DAMAGE_ENEMY = 9;  // temporary: final damage formula is undecided
  const DEMO_RECOVERY_PER_TICK = 8; // temporary: final HP recovery rate undecided
  const demoRoster = DB.demoParty.map((entry) => ({
    id: entry.id,
    species: entry.species,
    name: entry.name,
    speed: DB.species[entry.species].speed,
    maxHp: DB.species[entry.species].maxHp,
    hp: DB.species[entry.species].maxHp,
    bag: [],
    side: "ally"
  }));
  const state = {
    regionId: "windy",
    locationId: null,
    active: [],
    enemies: [],
    mode: "idle",
    speedMs: 3000,
    countdownMs: 3000,
    lastTimestamp: performance.now(),
    round: 0,
    order: [],
    turnIndex: 0,
    actions: 0,
    logs: [],
    notifications: [],
    collected: [],
    recoveryTicks: 0
  };
  function rand(max) { return Math.floor(Math.random() * max); }
  function weightedPick(options, getWeight) {
    const entries = options.filter((item) => Number(getWeight(item)) > 0);
    const total = entries.reduce((sum, entry) => sum + Number(getWeight(entry)), 0);
    if (!total) throw new Error("출현·행동 확률이 모두 0입니다.");
    let roll = Math.random() * total;
    for (const item of entries) {
      roll -= Number(getWeight(item));
      if (roll < 0) return item;
    }
    return entries[entries.length - 1];
  }
  function region() { return DB.regions[state.regionId]; }
  function location() { return region().locations[state.locationId]; }
  function isAlive(unit) { return unit.hp > 0; }
  function now() { return new Date().toLocaleTimeString("ko-KR", { hour12: false }); }
  // UI reads/writes are strictly scoped: only changed text, events and cards mutate.
  function setText(id, value) {
    const el = $(id);
    const next = String(value);
    if (el.textContent !== next) el.textContent = next;
  }
  function setDisabled(id, disabled) {
    const el = $(id);
    if (el.disabled !== disabled) el.disabled = disabled;
  }
  function prependEntry(root, className, item) {
    const el = document.createElement("div"); el.className = className;
    const clock = document.createElement("em"); clock.textContent = item.time;
    el.append(clock, document.createTextNode(item.message));
    root.prepend(el);
    return el;
  }
  function log(message) {
    const item = { time: now(), message };
    state.logs.unshift(item);
    const root = $("eventLog");
    prependEntry(root, "logentry", item);
    if (state.logs.length > MAX_LOG) {
      state.logs.pop();
      root.lastElementChild?.remove();
    }
  }
  function notify(message) {
    const item = { time: now(), message };
    const root = $("notifications");
    if (!state.notifications.length) root.replaceChildren();
    state.notifications.unshift(item);
    const el = document.createElement("div");
    el.className = "notification-row";
    el.textContent = item.time + "  " + item.message;
    root.prepend(el);
    if (state.notifications.length > 30) {
      state.notifications.pop();
      root.lastElementChild?.remove();
    }
  }
  function clearLog() {
    state.logs.length = 0;
    $("eventLog").replaceChildren();
  }
  function clearNotifications() {
    state.notifications.length = 0;
    const root = $("notifications");
    root.replaceChildren();
    root.textContent = "아직 알림이 없습니다.";
  }
  function renderRoster() {
    const container = $("partySelect"); container.replaceChildren();
    for (const unit of demoRoster) {
      const label = document.createElement("label"); label.className = "select-unit";
      const check = document.createElement("input"); check.type = "checkbox"; check.value = unit.id;
      check.name = "party"; check.disabled = state.mode !== "idle" || unit.hp < unit.maxHp;
      const text = document.createElement("span");
      const title = document.createElement("strong"); title.textContent = unit.name;
      const details = document.createElement("small");
      details.textContent = "HP " + unit.hp + "/" + unit.maxHp + " · 속도 " + unit.speed +
        (unit.hp < unit.maxHp ? " · 회복 대기" : "");
      text.append(title, details); label.append(check, text); container.appendChild(label);
    }
  }
  function createUnitCard(unit) {
    const box = document.createElement("div");
    box.className = "unit"; box.dataset.unitId = unit.id;
    const name = document.createElement("div"); name.className = "name";
    const health = document.createElement("div"); health.className = "health";
    const bar = document.createElement("div"); health.appendChild(bar);
    const info = document.createElement("div"); info.className = "unit-info";
    box.append(name, health, info);
    return box;
  }
  function updateUnitCard(card, unit) {
    const className = "unit" + (unit.hp <= 0 ? " fainted" : "");
    if (card.className !== className) card.className = className;
    const title = card.children[0], bar = card.children[1].firstElementChild, info = card.children[2];
    if (title.textContent !== unit.name) title.textContent = unit.name;
    const width = 100 * unit.hp / unit.maxHp + "%";
    if (bar.style.width !== width) bar.style.width = width;
    const lowClass = unit.hp / unit.maxHp <= .3 ? "low" : "";
    if (bar.className !== lowClass) bar.className = lowClass;
    const details = "속도 " + unit.speed + " · HP " + unit.hp + "/" + unit.maxHp;
    if (info.textContent !== details) info.textContent = details;
  }
  function reconcileUnits(id, units, emptyMessage) {
    const root = $(id);
    if (!units.length) {
      if (root.dataset.empty !== "true") {
        root.replaceChildren();
        const empty = document.createElement("span");
        empty.className = "empty"; empty.textContent = emptyMessage;
        root.appendChild(empty);
        root.dataset.empty = "true";
      }
      return;
    }
    if (root.dataset.empty === "true") {
      root.replaceChildren(); root.dataset.empty = "false";
    }
    const ids = new Set(units.map(unit => unit.id));
    for (const child of [...root.children]) {
      if (!ids.has(child.dataset.unitId)) child.remove();
    }
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      let card = [...root.children].find(child => child.dataset.unitId === unit.id);
      if (!card) card = createUnitCard(unit);
      if (root.children[i] !== card) root.insertBefore(card, root.children[i] || null);
      updateUnitCard(card, unit);
    }
  }
  function renderUnits() {
    reconcileUnits("allies", state.active, "아직 파견하지 않았습니다.");
    reconcileUnits("enemies", state.enemies, "전투 중이 아닙니다.");
  }
  function renderBags() {
    const count = state.active.reduce((sum, unit) => sum + unit.bag.length, 0);
    setText("bagCount", count + "개");
    const root = $("bags");
    if (!state.active.length) {
      const description = state.collected.length ? "귀환한 아이템 누적 " + state.collected.length + "개" : "탐험 중 포켓몬별로 보관됩니다.";
      if (root.textContent !== description || root.children.length) root.textContent = description;
      return;
    }
    if (root.dataset.mode !== "units") { root.replaceChildren(); root.dataset.mode = "units"; }
    const ids = new Set(state.active.map(u => u.id));
    for (const child of [...root.children]) if (!ids.has(child.dataset.unitId)) child.remove();
    state.active.forEach((unit, i) => {
      let el = [...root.children].find(child => child.dataset.unitId === unit.id);
      if (!el) {
        el = document.createElement("div");
        el.className = "bag-row"; el.dataset.unitId = unit.id;
      }
      if (root.children[i] !== el) root.insertBefore(el, root.children[i] || null);
      const text = unit.name + " · " + unit.bag.length + "/" + BAG_CAPACITY + "칸";
      if (el.textContent !== text) el.textContent = text;
    });
  }
  function renderStatus() {
    const activity = ({ idle:"대기", exploration:"탐험 중", combat:"전투 중", recovery:"전멸 회복 중" })[state.mode];
    setText("activity", activity);
    setText("modeLabel", activity);
    setText("regionLabel", region().name);
    setText("locationLabel", state.locationId ? location().name : "출발 준비 중");
    setText("sceneIcon", state.mode === "combat" ? "⚔" : state.mode === "recovery" ? "✚" : state.locationId === "grass" ? "♧" : "◇");
    setText("sceneDesc",
      state.mode === "combat" ? "스피드 내림차순으로 한 마리씩 행동합니다." :
      state.mode === "recovery" ? "모든 포켓몬이 완전히 회복되면 탐험이 다시 시작됩니다." :
      state.mode === "exploration" ? "현재 세부 지역의 확률에 따라 다음 행동이 결정됩니다." :
      "포켓몬을 선택해 탐험을 시작하세요.");
    setText("actionsCount", state.actions);
    setText("roundCount", state.mode === "combat" ? state.round : "–");
    setText("intervalLabel", (state.speedMs / 1000) + "초");
    setDisabled("recall", state.mode === "idle");
    setDisabled("start", state.mode !== "idle");
    setDisabled("region", state.mode !== "idle");
    setText("combatInfo", state.mode === "combat" ?
      "라운드 " + state.round + " · 다음 행동: " +
      (state.order[state.turnIndex] ? state.order[state.turnIndex].name : "라운드 갱신") +
      " · 생존 " + state.active.filter(isAlive).length + " vs " + state.enemies.filter(isAlive).length :
      "전투가 발생하면 라운드·행동 순서가 표시됩니다.");
  }
  // All these functions are idempotent; neither static page content nor unchanged
  // unit cards/log rows are recreated when a game action occurs.
  function render() {
    renderStatus();
    renderUnits();
    renderBags();
  }
  function addLoot(item) {
    const candidates = state.active.filter((unit) => unit.bag.length < BAG_CAPACITY);
    if (!candidates.length) { log("보관함이 가득 차서 " + item + "을(를) 획득하지 못했습니다."); return; }
    const target = candidates[rand(candidates.length)];
    target.bag.push(item);
    renderBags();
    log(target.name + "의 보관함에 " + item + "을(를) 넣었습니다.");
  }
  function loseLoot(unit) {
    const losses = Math.floor(unit.bag.length / 2);
    for (let i = 0; i < losses; i++) unit.bag.splice(rand(unit.bag.length), 1);
    renderBags();
    log(unit.name + " 기절! 전리품 " + losses + "개 손실 (임시 전투 피해).");
  }
  function faint(unit) {
    unit.hp = 0;
    if (unit.side === "ally") loseLoot(unit);
    else log(unit.name + "이(가) 기절했습니다.");
  }
  function buildRound() {
    // Alive units are sorted at round start. Ties are reshuffled each round.
    const tieRoll = new Map();
    const units = [...state.active, ...state.enemies].filter(isAlive);
    for (const unit of units) tieRoll.set(unit, Math.random());
    units.sort((a, b) => b.speed - a.speed || tieRoll.get(a) - tieRoll.get(b));
    state.order = units;
    state.turnIndex = 0;
    state.round += 1;
    log("전투 " + state.round + "라운드: " + units.map((unit) => unit.name).join(" → "));
  }
  function startBattle() {
    const place = location();
    const count = weightedPick(place.enemyCount, (entry) => entry.weight).value;
    state.enemies = Array.from({ length: count }, (_, index) => {
      const speciesId = weightedPick(place.species, (id) => DB.species[id].weight);
      const type = DB.species[speciesId];
      return { id: "enemy-" + state.actions + "-" + index, species: speciesId, name: type.name,
        hp: type.maxHp, maxHp: type.maxHp, speed: type.speed, side:"enemy", bag:[] };
    });
    state.mode = "combat"; state.round = 0; state.order = []; state.turnIndex = 0;
    log(place.name + "에서 " + state.enemies.map((unit) => unit.name).join(", ") + "을(를) 만났습니다.");
    buildRound();
  }
  function winBattle() {
    log("전투 승리! (경험치·정식 드롭은 아직 미구현)");
    addLoot("시연용 전리품");
    state.enemies = []; state.mode = "exploration"; state.order = []; state.round = 0;
  }
  function startRecovery() {
    state.mode = "recovery"; state.enemies = []; state.order = []; state.round = 0;
    state.recoveryTicks = 0;
    log("아군 전원 기절. 탐험 일시정지 후 HP 회복 시작.");
  }
  function combatAction() {
    while (state.turnIndex < state.order.length && !isAlive(state.order[state.turnIndex])) {
      state.turnIndex += 1; // no timer consumed for skipped fainted turns
    }
    if (state.turnIndex >= state.order.length) buildRound();
    const unit = state.order[state.turnIndex++];
    if (!unit || !isAlive(unit)) return;
    const foes = (unit.side === "ally" ? state.enemies : state.active).filter(isAlive);
    if (!foes.length) return;
    const target = foes[rand(foes.length)];
    const damage = unit.side === "ally" ? DEMO_DAMAGE_ALLY : DEMO_DAMAGE_ENEMY;
    target.hp = Math.max(0, target.hp - damage);
    log(unit.name + " → " + target.name + " · 시연용 피해 " + damage);
    if (target.hp === 0) faint(target);
    if (!state.enemies.some(isAlive)) winBattle();
    else if (!state.active.some(isAlive)) startRecovery();
  }
  function explorationAction() {
    const place = location();
    const action = weightedPick(place.actions, (entry) => entry.weight);
    if (action.type === "walk") log(place.name + "을(를) 걷습니다.");
    else if (action.type === "move") {
      if (!region().locations[action.to]) throw new Error("존재하지 않는 연결 목적지");
      state.locationId = action.to;
      log(location().name + "으로 이동합니다.");
    } else if (action.type === "encounter") startBattle();
    else if (action.type === "find") { log(place.name + "에서 아이템을 발견했습니다."); addLoot("시연용 발견 아이템"); }
    else if (action.type === "egg") { log(place.name + "에서 알을 발견했습니다."); addLoot("시연용 알"); }
  }
  function recoverStep() {
    state.recoveryTicks += 1;
    for (const unit of state.active) unit.hp = Math.min(unit.maxHp, unit.hp + DEMO_RECOVERY_PER_TICK);
    if (state.active.every((unit) => unit.hp === unit.maxHp)) {
      state.mode = "exploration";
      log("모든 포켓몬 HP 100% 회복. " + location().name + "에서 탐험을 재개합니다.");
    }
  }
  function backgroundRecovery() {
    // Idle Pokémon heal over time. This provisional rate is not final balancing.
    let changed = false;
    for (const unit of demoRoster) {
      if (state.active.includes(unit) || unit.hp >= unit.maxHp) continue;
      unit.hp = Math.min(unit.maxHp, unit.hp + DEMO_RECOVERY_PER_TICK);
      changed = true;
    }
    if (changed) renderRoster();
  }
  function tick() {
    if (state.mode === "idle") { backgroundRecovery(); return; }
    state.actions += 1;
    if (state.mode === "exploration") explorationAction();
    else if (state.mode === "combat") combatAction();
    else if (state.mode === "recovery") recoverStep();
    render();
  }
  function start() {
    const selected = Array.from(document.querySelectorAll('input[name="party"]:checked')).map((el) => demoRoster.find((unit) => unit.id === el.value));
    if (selected.length < 1 || selected.length > 3) { log("1~3마리를 선택해야 합니다."); return; }
    if (selected.some((unit) => unit.hp !== unit.maxHp)) { log("출발하려면 전원 HP 100%가 필요합니다."); return; }
    state.regionId = $("region").value;
    state.locationId = region().start;
    state.active = selected;
    state.active.forEach((unit) => { unit.bag = []; });
    state.enemies = [];
    state.mode = "exploration"; state.actions = 0; state.round = 0;
    state.order = []; state.countdownMs = state.speedMs; state.lastTimestamp = performance.now();
    log(region().name + " 탐험 출발. 시작 세부 지역: " + location().name);
    renderRoster(); render();
  }
  function recall() {
    if (state.mode === "idle") return;
    const collected = state.active.flatMap((unit) => unit.bag);
    state.collected.push(...collected);
    state.active.forEach((unit) => { unit.bag = []; });
    log("즉시 귀환. 아이템 " + collected.length + "개 획득. (시연용 보유 내역)");
    state.active = []; state.enemies = []; state.mode = "idle"; state.order = [];
    state.locationId = null; state.round = 0; state.countdownMs = state.speedMs;
    renderRoster(); render();
  }
  function populateRegions() {
    for (const [key, entry] of Object.entries(DB.regions)) {
      const option = document.createElement("option"); option.value = key; option.textContent = entry.name + " (시연)";
      $("region").appendChild(option);
    }
  }
  function startClock() {
    const timeNow = performance.now();
    const elapsed = Math.min(1000, Math.max(0, timeNow - state.lastTimestamp));
    state.lastTimestamp = timeNow;
    if (state.mode !== "idle") {
      state.countdownMs -= elapsed;
      // Never execute multiple delayed actions in one frame after tab suspension.
      if (state.countdownMs <= 0) {
        state.countdownMs = state.speedMs;
        try { tick(); } catch (error) {
          log("개발용 오류: " + error.message);
          recall();
        }
      }
    } else {
      // The idle roster can heal while a run is not active.
      state.countdownMs -= elapsed;
      if (state.countdownMs <= 0) {
        state.countdownMs = state.speedMs;
        backgroundRecovery();
      }
    }
    const fraction = Math.max(0, Math.min(1, 1 - state.countdownMs / state.speedMs));
    $("progressFill").style.width = (fraction * 100) + "%";
    $("countdown").textContent = (Math.max(0, state.countdownMs) / 1000).toFixed(1) + "초";
  }
  populateRegions();
  renderRoster(); render(); clearNotifications();
  $("start").addEventListener("click", start);
  $("recall").addEventListener("click", recall);
  $("clearLog").addEventListener("click", clearLog);
  $("clearNotifications").addEventListener("click", clearNotifications);
  $("region").addEventListener("change", (event) => {
    state.regionId = event.target.value; render();
  });
  document.querySelectorAll(".speed").forEach((button) => {
    button.addEventListener("click", () => {
      state.speedMs = Number(button.dataset.speed);
      state.countdownMs = state.speedMs;
      document.querySelectorAll(".speed").forEach((element) => {
        element.classList.toggle("selected", element === button);
      });
      render();
    });
  });
  log("PokeTree 시연 엔진 준비 완료. 1~3마리를 선택하세요.");
  setInterval(startClock, 100);
})();
