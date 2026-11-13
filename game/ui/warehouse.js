/* Modal warehouse UI: village inventory and Pokémon equipment share a single catalog.
 * All mutable inventory stays in the existing tool / material / TM systems.
 */
(() => {
 "use strict";
 const G=window.PokeTree,$=G.$,W=G.warehouse,T=G.tools;
 let category="all",sort="asc",selected=null,context=null;
 const icons={
   material:{"ore":{symbol:"◆",src:null},"leaf":{symbol:"❧",src:null}},
   tool:{"training-band":{symbol:"◈",src:null},"guard-charm":{symbol:"◇",src:null},"vital-amulet":{symbol:"✦",src:null}},
   consumable:{},tm:{}
 };
 const defaults={material:"◆",tool:"◈",consumable:"✚",tm:"▣"};
 function el(tag,cls,value){
   const node=document.createElement(tag);if(cls)node.className=cls;
   if(value!==undefined)node.textContent=value;
   return node;
 }
 function iconFor(item){
   const config=icons[item.category]?.[item.id]||{};
   const icon=el("span","warehouse-icon",config.symbol||defaults[item.category]||"□");
   icon.setAttribute("aria-hidden","true");
   if(config.src){
     const img=document.createElement("img");img.alt="";img.loading="lazy";
     img.addEventListener("error",()=>img.remove());img.src=config.src;icon.append(img);
   }
   return icon;
 }
 function itemOrder(items){
   return [...items].sort((a,b)=>{
     const n=a.name.localeCompare(b.name,"ko");
     const stable=n||a.key.localeCompare(b.key);
     return sort==="desc"?-stable:stable;
   });
 }
 function contextUnit(){
   return context?G.state.roster.find(u=>u.id===context.unitId):null;
 }
 function equipError(item){
   if(!context||item.category!=="tool")return "도구 장착 모드가 아닙니다.";
   const unit=contextUnit();
   if(!unit)return "포켓몬을 찾을 수 없습니다.";
   const blocked=T.canEdit(unit);if(blocked)return blocked;
   const assigned=T.slots(unit);
   if(assigned.some((x,i)=>i!==context.slot&&x===item.id))return "같은 도구를 중복 장착할 수 없습니다.";
   if(T.available(item.id)<=0&&assigned[context.slot]!==item.id)return "사용 가능한 도구가 없습니다.";
   return null;
 }
 function render(){
   const root=$("warehouseItems");root.replaceChildren();
   const items=itemOrder(W.entries(category));
   for(const item of items){
     const button=el("button","warehouse-cell");
     button.type="button";
     button.setAttribute("aria-label",item.name+(item.count===null?" · 해금":" · "+item.count+"개"));
     const icon=iconFor(item);
     icon.append(el("span","warehouse-count-badge",item.count===null?"✓":String(item.count)));
     button.append(icon,el("span","warehouse-cell-name",item.name));
     button.addEventListener("click",()=>openDetail(item,button));
     root.append(button);
   }
   $("warehouseEmpty").hidden=items.length!==0;
   document.querySelectorAll(".warehouse-filter").forEach(b=>{
     const active=b.dataset.category===category;
     b.classList.toggle("selected",active);
     b.setAttribute("aria-pressed",String(active));
     b.disabled=!!context&&b.dataset.category!=="tool";
   });
   $("warehouseSort").value=sort;
   if($("warehouseDetailDialog").open&&selected)renderDetail();
 }
 function renderDetail(){
   const info=selected&&W.detail(selected.category,selected.id);
   if(!info){G.uiNav.close("warehouseDetailDialog");return;}
   G.text("warehouseDetailName",info.name);
   G.text("warehouseDetailCategory",info.categoryName);
   $("warehouseDetailIcon").replaceChildren(iconFor(info));
   const infoRoot=$("warehouseDetailInfo");infoRoot.replaceChildren();
   for(const [label,value] of info.lines){
     const row=el("div");row.append(el("span","",label),el("strong","",value));infoRoot.append(row);
   }
   infoRoot.append(el("p","",info.description));
   const action=$("warehouseEquip");
   action.hidden=!context||info.category!=="tool";
   if(!action.hidden){
     const unit=contextUnit();
     action.textContent=unit&&T.slots(unit)[context.slot]===info.id?"이미 장착 중":"장착";
     const error=equipError(info);
     action.disabled=!!error||action.textContent==="이미 장착 중";
     G.text("warehouseEquipMessage",error||"");
   }else G.text("warehouseEquipMessage","");
 }
 function openDetail(item,trigger){
   selected={category:item.category,id:item.id};
   renderDetail();
   G.uiNav.open("warehouseDetailDialog",trigger);
 }
 function openWarehouse(trigger,mode=null){
   // Keep the Pokémon detail dialog open behind the two nested modal dialogs.
   context=mode;
   category=mode?"tool":"all";
   sort="asc";
   $("warehouseItems").scrollTop=0;
   G.text("warehouseTitle",mode?"도구 선택":"창고");
   render();
   G.uiNav.open("warehouseDialog",trigger);
 }
 function openForEquip(unitId,slot,trigger){
   const unit=G.state.roster.find(u=>u.id===unitId);
   if(!unit||![0,1].includes(slot)||T.canEdit(unit))return;
   openWarehouse(trigger,{unitId,slot});
 }
 $("openWarehouse").addEventListener("click",()=>openWarehouse($("openWarehouse")));
 document.querySelectorAll(".warehouse-filter").forEach(b=>b.addEventListener("click",()=>{
   if(context||category===b.dataset.category)return;
   category=b.dataset.category;render();$("warehouseItems").scrollTop=0;
 }));
 $("warehouseSort").addEventListener("change",event=>{
   sort=event.target.value==="desc"?"desc":"asc";
   render();$("warehouseItems").scrollTop=0;
 });
 $("warehouseEquip").addEventListener("click",()=>{
   const info=selected&&W.detail(selected.category,selected.id);
   const error=info?equipError(info):"아이템을 찾을 수 없습니다.";
   if(error){G.text("warehouseEquipMessage",error);renderDetail();return;}
   const unit=contextUnit();
   const result=T.equip(unit,info.id,context.slot);
   if(result){G.text("warehouseEquipMessage",result);return;}
   // Closing the nested warehouse restores focus to the original Pokémon dialog.
   G.uiNav.close("warehouseDetailDialog");
   G.uiNav.close("warehouseDialog");
   G.uiPokemonDetail?.render?.();
   G.text("pokemonToolMessage","도구 장착 완료");
 });
 $("warehouseDetailClose").addEventListener("click",()=>G.uiNav.close("warehouseDetailDialog"));
 $("warehouseDetailDialog").addEventListener("close",()=>{selected=null;});
 $("warehouseDialog").addEventListener("close",()=>{context=null;category="all";selected=null;});
 G.onChange(type=>{
   if(["materials","tools","roster","bags"].includes(type)&&$("warehouseDialog").open)render();
 });
 G.uiWarehouse={render,openWarehouse,openForEquip};
})();
