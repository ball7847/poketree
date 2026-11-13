/* Region cards show unlock state and avoid running undesigned upper regions. */
(() => {
 "use strict";
 const G=window.PokeTree,$=G.$,state=G.state,db=G.db;
 const cards=new Map();
 const el=(tag,cls,txt)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node;};
 function make(id){
   const r=db.regions[id],button=el("button","region-card theme-"+(r.theme||"default"));
   button.type="button";button.dataset.region=id;
   const shade=el("div","region-shade"),title=el("h2","region-title",r.name);
   const types=el("div","region-meta","Lv."+r.levelRange.join("~")+" · "+r.mainTypes.join(" / "));
   const sprites=el("div","region-party"),status=el("div","region-status","");
   const meta=el("div","region-meta",""),progress=el("div","region-progress"),fill=el("div","region-progress-fill");
   progress.append(fill);
   const side=el("div","region-side"),box=el("span","region-loot");
   side.append(box);shade.append(title,types,sprites,status,meta,progress);button.append(shade,side);
   button.addEventListener("click",()=>{if(G.regions.isPlayable(id))G.uiDetail.open(id,button);});
   $("regionCards").append(button);
   cards.set(id,{button,sprites,status,meta,bar:fill,box});
 }
 function update(id){
   const c=cards.get(id),e=state.regions[id],r=db.regions[id],unlocked=G.regions.isUnlocked(id),playable=G.regions.isPlayable(id);
   if(!c)return;
   c.button.disabled=!playable;
   c.button.classList.toggle("region-locked",!unlocked);
   c.button.classList.toggle("region-unfinished",unlocked&&!playable);
   c.button.setAttribute("aria-label",r.name+(unlocked?(playable?" 탐험 상세 열기":" · 세부지역 준비 중"):" · "+G.regions.requirement(id)));
   if(!unlocked){
     c.status.textContent="잠김";c.meta.textContent=G.regions.requirement(id);c.box.textContent="잠김";
   }else if(!playable){
     c.status.textContent="해금 완료 · 세부지역 준비 중";
     c.meta.textContent="세부지역·출현 포켓몬 미확정";c.box.textContent="준비 중";
   }else{
     const names={idle:"탐험 대기",exploration:"탐험 중",combat:"전투 중",error:"오류 · 일시 중지"};
     c.status.textContent=e.mode==="exploration"?e.lastEvent:names[e.mode]||"탐험 중";
     const next=Object.entries(db.regions).find(([key,v])=>v.unlock?.type==="steps"&&v.unlock.region===id&&!G.regions.isUnlocked(key));
     c.meta.textContent=e.mode==="idle"?"지역을 눌러 탐험 시작":G.place(e).name+" · 이동 "+e.steps+(next?"/"+next[1].unlock.count:"")+"회";
     c.box.textContent="전리품 "+e.party.reduce((n,u)=>n+u.bag.length,0);
   }
   const keys=e.party.map(u=>u.id+":"+u.name).join(",");
   if(c.sprites.dataset.keys!==keys){
     c.sprites.dataset.keys=keys;c.sprites.replaceChildren();
     for(const u of e.party){const sprite=el("span","pokemon-avatar",u.name.slice(0,1));sprite.title=u.name;c.sprites.append(sprite);}
   }
   progress(id);
 }
 function progress(id){
   const c=cards.get(id),exp=state.regions[id];if(!c)return;
   const p=exp.mode==="idle"?0:100*(1-Math.max(0,exp.remainingMs)/state.speedMs);
   c.bar.style.width=Math.max(0,Math.min(100,p)).toFixed(1)+"%";
 }
 for(const id of Object.keys(db.regions))make(id);
 G.onChange((type,id)=>{
   if(type==="progress"){if(state.activeTab==="exploration"&&id)progress(id);return;}
   if(type==="regions"){for(const key of cards.keys())update(key);return;}
   if(["expedition","bags","log","regionSteps"].includes(type)&&id)update(id);
   if(["speed","nickname"].includes(type))for(const key of cards.keys())update(key);
 });
 for(const id of cards.keys())update(id);
})();
