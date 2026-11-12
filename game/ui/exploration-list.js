/* Region list cards are stable DOM nodes; only text/progress changes. */
(() => {
  "use strict";
  const G=window.PokeTree,$=G.$,state=G.state,db=G.db;
  const cards=new Map();
  function element(tag,cls,text) {
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(text!==undefined)el.textContent=text;
    return el;
  }
  function makeCard(id) {
    const info=db.regions[id];
    const button=element("button","region-card theme-"+(info.theme||"default"));
    button.type="button";button.dataset.region=id;
    button.setAttribute("aria-label",info.name+" 탐험 상세 열기");
    const shade=element("div","region-shade");
    const title=element("h2","region-title",info.name);
    const sprites=element("div","region-party");
    const status=element("div","region-status","탐험 대기");
    const meta=element("div","region-meta","포켓몬을 선택해 출발");
    const bar=element("div","region-progress");
    bar.appendChild(element("div","region-progress-fill"));
    const side=element("div","region-side");
    const box=element("span","region-loot","전리품 0");
    side.appendChild(box);
    shade.append(title,sprites,status,meta,bar);
    button.append(shade,side);
    button.addEventListener("click",()=>G.uiDetail.open(id,button));
    $("regionCards").appendChild(button);
    cards.set(id,{button,sprites,status,meta,bar:bar.firstElementChild,box});
  }
  function update(id) {
    const card=cards.get(id),exp=state.regions[id];if(!card)return;
    const modeNames={idle:"탐험 대기",exploration:"탐험 중",combat:"전투 중",recovery:"전원 기절 · 회복 중",error:"오류 · 탐험 일시 중지"};
    const status=exp.mode==="exploration"?exp.lastEvent:modeNames[exp.mode];
    if(card.status.textContent!==status)card.status.textContent=status;
    const sub=exp.mode==="idle"?"지역을 눌러 탐험 시작":
      exp.locationId?G.place(exp).name+" · "+modeNames[exp.mode]:"탐험 대기";
    if(card.meta.textContent!==sub)card.meta.textContent=sub;
    const bagCount=exp.party.reduce((a,u)=>a+u.bag.length,0);
    const text="전리품 "+bagCount;
    if(card.box.textContent!==text)card.box.textContent=text;
    const keys=exp.party.map(u=>u.id+":"+u.name).join(",");
    if(card.sprites.dataset.keys!==keys) {
      card.sprites.dataset.keys=keys;card.sprites.replaceChildren();
      for(const unit of exp.party) {
        const badge=element("span","pokemon-avatar",unit.name.slice(0,1));
        badge.title=unit.name;badge.setAttribute("aria-label",unit.name);
        card.sprites.appendChild(badge);
      }
    }
    updateProgress(id);
  }
  function updateProgress(id) {
    const card=cards.get(id),exp=state.regions[id];if(!card)return;
    const p=exp.mode==="idle"?0:100*(1-Math.max(0,exp.remainingMs)/state.speedMs);
    const width=Math.max(0,Math.min(100,p)).toFixed(1)+"%";
    if(card.bar.style.width!==width)card.bar.style.width=width;
  }
  for(const id of Object.keys(db.regions))makeCard(id);
  G.onChange((type,id)=>{
    if(type==="progress"){if(state.activeTab==="exploration"&&id)updateProgress(id);return;}
    if(["expedition","bags","log"].includes(type)&&id)update(id);
    if(type==="speed")for(const key of cards.keys())updateProgress(key);
    if(type==="nickname")for(const key of cards.keys())update(key);
  });
  for(const id of cards.keys())update(id);
})();
