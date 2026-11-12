/* Expedition detail + three-slot preparation + Pokémon picker.
 * Prototype presentation; no unapproved battle/level rules are introduced.
 */
(() => {
  "use strict";
  const G=window.PokeTree, $=G.$, db=G.db, state=G.state;
  const slots=[null,null,null];
  const picker={open:false,slot:null,view:"icon",sort:"acquired",ascending:true};
  let regionId=null;
  const $set=(id,value)=>G.text(id,value);
  const create=(tag,cls,text)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(text!==undefined)el.textContent=text;
    return el;
  };
  const pokemonPicture=(unit)=>{
    const img=create("img","picker-sprite");
    const dex=db.species[unit.species]?.dex;
    img.alt=unit.name;
    img.loading="lazy";
    if(Number.isInteger(dex)){
      // Public PokeAPI demo sprites; local image mapping can replace these URLs later.
      img.src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/"+dex+".png";
    }
    img.addEventListener("error",()=>{
      img.hidden=true;
      if(!img.nextElementSibling)img.after(create("span","sprite-fallback","◇"));
    },{once:true});
    return img;
  };
  const getUnit=id=>state.roster.find(u=>u.id===id);
  const selectedIds=()=>slots.filter(Boolean);
  function disabledReason(unit){
    if(unit.expedition!==null)return "다른 지역에서 탐험 중인 포켓몬입니다.";
    if(unit.hp!==unit.maxHp)return "HP가 가득 차야 탐험에 배치할 수 있습니다.";
    if(slots.includes(unit.id))return "이미 배치된 포켓몬입니다.";
    return "";
  }
  function renderSlots(){
    const root=$("detailParty");
    // Stable slot buttons to preserve focus; update only their content.
    while(root.children.length<3){
      const i=root.children.length;
      const b=create("button","party-slot");
      b.type="button";
      b.dataset.slot=String(i);
      b.addEventListener("click",()=>{
        if(slots[i]){
          slots[i]=null;
          $set("detailError","");
          renderSlots();
        } else openPicker(i);
      });
      root.appendChild(b);
    }
    slots.forEach((id,i)=>{
      const btn=root.children[i];
      const u=id&&getUnit(id);
      const label=(i+1)+"번 슬롯";
      const signature=u ? "unit:"+u.id : "empty";
      if(btn.dataset.signature===signature)return;
      btn.dataset.signature=signature;
      btn.classList.toggle("filled",!!u);
      btn.replaceChildren();
      const index=create("span","slot-index",label);
      const body=create("span","slot-body");
      if(u){
        body.append(pokemonPicture(u),create("span","slot-name",u.name));
        const sub=create("small","slot-description","HP "+u.hp+"/"+u.maxHp+" · 클릭 시 해제");
        body.appendChild(sub);
        btn.setAttribute("aria-label",label+": "+u.name+" 배치됨. 클릭하여 해제");
      } else {
        body.append(create("span","slot-plus","+"),create("span","slot-empty","포켓몬 선택"));
        btn.setAttribute("aria-label",label+": 비어 있음. 클릭하여 포켓몬 선택");
      }
      btn.append(index,body);
    });
    const count=selectedIds().length;
    $set("detailSelectedCount",count+"/3");
    $("detailStart").disabled=count===0;
  }
  function openPicker(i){
    if(!regionId||state.regions[regionId].mode!=="idle")return;
    picker.slot=i;picker.open=true;
    $("pokemonPicker").hidden=false;
    $("pickerSort").value=picker.sort;
    renderPicker();
    $("pickerBack").focus();
  }
  function closePicker(){
    picker.open=false;const i=picker.slot;
    picker.slot=null;
    $("pokemonPicker").hidden=true;
    $set("pickerMessage","");
    if(i!==null)$("detailParty").children[i]?.focus();
  }
  function sortedRoster(){
    return state.roster.map((unit,index)=>({unit,index})).sort((a,b)=>{
      let compare=0;
      if(picker.sort==="dex"){
        compare=(db.species[a.unit.species].dex??Infinity)-(db.species[b.unit.species].dex??Infinity);
      }else if(picker.sort==="level"){
        // Level data is not implemented yet; equal/unknown levels preserve acquisition order.
        const x=a.unit.level,y=b.unit.level;
        if(Number.isFinite(x)&&Number.isFinite(y))compare=x-y;
      }
      if(compare===0)compare=a.index-b.index;
      return (picker.ascending?1:-1)*compare;
    }).map(item=>item.unit);
  }
  function renderPicker(){
    if(!picker.open)return;
    const root=$("pickerPokemonList");
    root.className="picker-pokemon-list "+(picker.view==="icon"?"icon-view":"list-view");
    const toggle=$("pickerViewToggle");
    toggle.textContent=picker.view==="icon"?"☷":"▦";
    toggle.setAttribute("aria-label",picker.view==="icon"?"목록형으로 전환":"아이콘형으로 전환");
    const direction=$("pickerDirection");
    direction.textContent=picker.ascending?"↑":"↓";
    direction.setAttribute("aria-label",picker.ascending?"오름차순 (누르면 내림차순)":"내림차순 (누르면 오름차순)");
    root.replaceChildren();
    for(const unit of sortedRoster()){
      const reason=disabledReason(unit);
      const btn=create("button","picker-pokemon"+(reason?" unavailable":""));
      btn.type="button";
      btn.title=reason ? unit.name+" · "+reason : unit.name;
      btn.setAttribute("aria-label",unit.name+(reason?" · 선택 불가: "+reason:" · 선택"));
      btn.setAttribute("aria-disabled",reason?"true":"false");
      btn.appendChild(pokemonPicture(unit));
      if(picker.view==="list"){
        const info=create("span","picker-row-info");
        info.append(create("strong","",unit.name));
        const dex=db.species[unit.species]?.dex;
        const level=Number.isFinite(unit.level)?"Lv."+unit.level:"레벨 미구현";
        const sub=reason||"HP "+unit.hp+"/"+unit.maxHp+" · "+level+(dex?" · No."+dex:"");
        info.append(create("small","",sub));
        btn.appendChild(info);
      }
      btn.addEventListener("click",()=>{
        if(reason){
          $set("pickerMessage",reason);
          return;
        }
        if(picker.slot===null)return;
        // Revalidate at the moment of selection, since game state updates continuously.
        const latest=disabledReason(unit);
        if(latest){$set("pickerMessage",latest);renderPicker();return;}
        slots[picker.slot]=unit.id;
        closePicker();
        renderSlots();
        $set("detailError","");
      });
      root.appendChild(btn);
    }
  }
  $("pickerBack").addEventListener("click",closePicker);
  $("pickerSort").addEventListener("change",e=>{
    picker.sort=e.target.value;
    renderPicker();
  });
  $("pickerDirection").addEventListener("click",()=>{
    picker.ascending=!picker.ascending;
    renderPicker();
  });
  $("pickerViewToggle").addEventListener("click",()=>{
    picker.view=picker.view==="icon"?"list":"icon";
    renderPicker();
  });
  function makeUnit(u){
    const row=create("div","detail-unit");
    const name=create("span","",u.name);
    const hp=create("small","",u.hp+"/"+u.maxHp);
    const meter=create("div","detail-hp");
    const fill=create("div");
    fill.style.width=100*u.hp/u.maxHp+"%";
    meter.append(fill);row.append(name,hp,meter);
    if(u.hp<=0)row.classList.add("fainted");
    return row;
  }
  function reconcileRoster(root,units){
    const signature=units.map(u=>u.id).join("|");
    if(root.dataset.signature!==signature){
      root.dataset.signature=signature;
      root.replaceChildren(...units.map(makeUnit));
    }else units.forEach((u,i)=>{
      const row=root.children[i];if(!row)return;
      const value=u.hp+"/"+u.maxHp;
      if(row.children[1].textContent!==value)row.children[1].textContent=value;
      const width=100*u.hp/u.maxHp+"%";
      if(row.children[2].firstElementChild.style.width!==width)row.children[2].firstElementChild.style.width=width;
      row.classList.toggle("fainted",u.hp<=0);
    });
  }
  function progress(){
    if(!regionId)return;
    const exp=state.regions[regionId];
    const value=exp.mode==="idle"?0:100*(1-exp.remainingMs/state.speedMs);
    const width=Math.max(0,Math.min(100,value)).toFixed(1)+"%";
    if($("detailProgressFill").style.width!==width)$("detailProgressFill").style.width=width;
    $set("detailCountdown",exp.mode==="idle"?"–":(Math.max(0,exp.remainingMs)/1000).toFixed(1)+"초");
  }
  function render(){
    if(!regionId)return;
    const exp=state.regions[regionId],region=db.regions[regionId];
    $set("detailTitle",region.name);
    const classname="detail-scene theme-"+(region.theme||"default");
    if($("detailScene").className!==classname)$("detailScene").className=classname;
    const idle=exp.mode==="idle";
    $("detailSetup").hidden=!idle;
    $("detailStart").hidden=!idle;
    $("detailRetreat").hidden=idle;
    if(idle){
      $set("detailLocation","출발 준비");
      $set("detailMode","");
      $set("detailMessage","포켓몬을 선택하여 탐험을 시작하세요.");
      $set("detailRound","");
      $set("detailBagCount","0개");
      reconcileRoster($("detailAllies"),[]);
      reconcileRoster($("detailEnemies"),[]);
      $("detailEnemiesWrap").hidden=true;
      renderSlots();
    }else{
      $set("detailLocation",G.place(exp).name);
      $set("detailMessage",exp.lastEvent);
      const modes={exploration:"탐험 중",combat:"전투 중",recovery:"전원 기절 · 회복 중"};
      $set("detailMode",modes[exp.mode]||"");
      reconcileRoster($("detailAllies"),exp.party);
      reconcileRoster($("detailEnemies"),exp.enemies);
      $("detailEnemiesWrap").hidden=exp.mode!=="combat";
      $set("detailRound",exp.mode==="combat"?"라운드 "+exp.round:"");
      $set("detailBagCount",exp.party.reduce((n,u)=>n+u.bag.length,0)+"개");
    }
    progress();
  }
  function resetPreparation(){
    slots.fill(null);
    state.selectedParty.clear();
    picker.open=false;
    picker.slot=null;
    $("pokemonPicker").hidden=true;
    $set("pickerMessage","");
    $set("detailError","");
  }
  function open(id,source){
    regionId=id;state.pendingRegion=id;
    resetPreparation();render();
    G.uiNav.open("explorationDialog",source);
  }
  $("detailStart").addEventListener("click",()=>{
    if(!regionId)return;
    const ids=selectedIds();
    if(!ids.length){$set("detailError","포켓몬을 1마리 이상 배치하세요.");return;}
    const message=G.exploration.start(regionId,ids);
    if(message){$set("detailError",message);return;}
    resetPreparation();render();
  });
  $("detailRetreat").addEventListener("click",()=>{
    if(!regionId)return;
    G.exploration.recall(regionId);
    resetPreparation();render();
  });
  $("explorationDialog").addEventListener("cancel",event=>{
    // Escape/Android back closes the picker first instead of discarding the prep.
    if(picker.open){event.preventDefault();closePicker();}
  });
  $("explorationDialog").addEventListener("close",()=>{
    resetPreparation();regionId=null;state.pendingRegion=null;
  });
  G.onChange((type,id)=>{
    if(!regionId)return;
    if(type==="progress"&&id===regionId)progress();
    if((type==="expedition"||type==="log"||type==="bags")&&id===regionId){
      if(state.regions[regionId].mode!=="idle")render();
    }
    if(type==="roster"&&state.regions[regionId].mode==="idle"&&picker.open)renderPicker();
    if(type==="speed")progress();
  });
  G.uiDetail={open,render};
})();
