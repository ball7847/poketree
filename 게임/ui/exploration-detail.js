/* A region-specific detail dialog; UI presentation remains provisional. */
(() => {
  "use strict";
  const G=window.PokeTree,$=G.$,db=G.db,state=G.state;
  const rosterChecks=new Map();
  let openRegion=null;
  function set(id,value){G.text(id,value);}
  function renderPartySelection() {
    const root=$("detailParty"),exp=state.regions[openRegion];
    const valid=state.roster.filter(u=>u.expedition===null);
    root.replaceChildren();
    if(!valid.length){
      root.textContent="사용할 수 있는 포켓몬이 없습니다. 다른 지역에서 귀환해야 합니다.";
      return;
    }
    for(const unit of valid){
      const label=document.createElement("label");label.className="select-unit";
      const input=document.createElement("input");input.type="checkbox";
      input.value=unit.id;input.checked=state.selectedParty.has(unit.id);
      input.disabled=unit.hp!==unit.maxHp;
      input.addEventListener("change",()=>{
        if(input.checked) {
          if(state.selectedParty.size>=3){input.checked=false;return;}
          state.selectedParty.add(unit.id);
        }else state.selectedParty.delete(unit.id);
      });
      const span=document.createElement("span");
      const name=document.createElement("strong");name.textContent=unit.name;
      const desc=document.createElement("small");
      desc.textContent="HP "+unit.hp+"/"+unit.maxHp+(input.disabled?" · 완전 회복 필요":"");
      span.append(name,desc);label.append(input,span);root.appendChild(label);
    }
  }
  function makeUnit(u) {
    const row=document.createElement("div");row.className="detail-unit";
    const name=document.createElement("span");name.textContent=u.name;
    const hp=document.createElement("small");hp.textContent=u.hp+"/"+u.maxHp;
    const meter=document.createElement("div");meter.className="detail-hp";
    const fill=document.createElement("div");
    fill.style.width=(100*u.hp/u.maxHp)+"%";meter.append(fill);
    if(u.hp<=0)row.classList.add("fainted");
    row.append(name,hp,meter);return row;
  }
  function reconcileRoster(root,units) {
    const signature=units.map(u=>u.id).join("|");
    if(root.dataset.signature!==signature){
      root.dataset.signature=signature;
      root.replaceChildren(...units.map(makeUnit));
    } else units.forEach((u,i)=>{
      const row=root.children[i];
      if(!row)return;
      const hp=u.hp+"/"+u.maxHp;
      if(row.children[1].textContent!==hp)row.children[1].textContent=hp;
      row.children[2].firstElementChild.style.width=(100*u.hp/u.maxHp)+"%";
      row.classList.toggle("fainted",u.hp<=0);
    });
  }
  function render() {
    if(!openRegion)return;
    const exp=state.regions[openRegion],region=db.regions[openRegion];
    set("detailTitle",region.name);
    $("detailScene").className="detail-scene theme-"+(region.theme||"default");
    const idle=exp.mode==="idle";
    $("detailSetup").hidden=!idle;
    $("detailActive").hidden=idle;
    $("detailStart").hidden=!idle;
    $("detailRetreat").hidden=idle;
    if(idle){
      set("detailLocation","출발 준비");
      set("detailMessage","포켓몬을 선택하여 탐험을 시작하세요.");
      renderPartySelection();
    }else{
      set("detailLocation",G.place(exp).name);
      set("detailMessage",exp.lastEvent);
      const modeNames={exploration:"탐험 중",combat:"전투 중",recovery:"전원 기절 · 회복 중"};
      set("detailMode",modeNames[exp.mode]||"");
      reconcileRoster($("detailAllies"),exp.party);
      reconcileRoster($("detailEnemies"),exp.enemies);
      $("detailEnemiesWrap").hidden=exp.mode!=="combat";
      set("detailRound",exp.mode==="combat"?"라운드 "+exp.round:"");
      set("detailBagCount",exp.party.reduce((n,u)=>n+u.bag.length,0)+"개");
    }
    progress();
  }
  function progress(){
    if(!openRegion)return;
    const exp=state.regions[openRegion],p=exp.mode==="idle"?0:100*(1-exp.remainingMs/state.speedMs);
    const width=Math.max(0,Math.min(100,p)).toFixed(1)+"%";
    $("detailProgressFill").style.width=width;
    set("detailCountdown",exp.mode==="idle"?"–":(Math.max(0,exp.remainingMs)/1000).toFixed(1)+"초");
  }
  function open(regionId,source) {
    openRegion=regionId;
    state.pendingRegion=regionId;
    // Selections are local to this preparation; cross-region expedition state is persistent.
    state.selectedParty.clear();
    render();
    G.uiNav.open("explorationDialog",source);
  }
  $("detailStart").addEventListener("click",()=>{
    if(!openRegion)return;
    const message=G.exploration.start(openRegion,[...state.selectedParty]);
    if(message){set("detailError",message);return;}
    set("detailError","");
    state.selectedParty.clear();
    render();
  });
  $("detailRetreat").addEventListener("click",()=>{
    if(!openRegion)return;
    G.exploration.recall(openRegion);
    state.selectedParty.clear();
    render();
  });
  $("explorationDialog").addEventListener("close",()=>{
    openRegion=null;state.pendingRegion=null;state.selectedParty.clear();
  });
  G.onChange((type,id)=>{
    if(!openRegion)return;
    if(type==="progress"&&id===openRegion)progress();
    if((type==="expedition"||type==="log"||type==="bags")&&id===openRegion) {
      // Don't reconstruct checkboxes on unrelated background updates.
      if(state.regions[openRegion].mode!=="idle")render();
    }
    if(type==="speed")progress();
  });
  G.uiDetail={open,render};
})();
