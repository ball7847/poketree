/* Warehouse presentation with image mapping and a central item detail dialog.
 * Missing images use a visible, labelled icon without loading arbitrary external assets.
 */
(() => {
 "use strict";
 const G=window.PokeTree,$=G.$,W=G.warehouse;
 let category="all",selected=null;
 // Asset mapping layer: add verified owned icons by setting a relative src here later.
 const icons={
   material:{"ore":{symbol:"◆",src:null},"leaf":{symbol:"❧",src:null}},
   tool:{"training-band":{symbol:"◈",src:null},"guard-charm":{symbol:"◇",src:null},"vital-amulet":{symbol:"✦",src:null}},
   tm:{}
 };
 const defaults={material:"◆",tool:"◈",tm:"▣"};
 function el(tag,cls,value){
   const node=document.createElement(tag);if(cls)node.className=cls;
   if(value!==undefined)node.textContent=value;
   return node;
 }
 function iconFor(item,large=false){
   const config=icons[item.category]?.[item.id]||{};
   const icon=el("span",large?"warehouse-detail-icon":"warehouse-icon");
   icon.setAttribute("aria-hidden","true");
   icon.textContent=config.symbol||defaults[item.category]||"□";
   if(config.src){
     const img=document.createElement("img");
     img.alt="";
     img.loading="lazy";
     img.addEventListener("error",()=>img.remove());
     icon.append(img);
     img.src=config.src;
   }
   return icon;
 }
 function render(){
   const root=$("warehouseItems");
   root.replaceChildren();
   const items=W.entries(category);
   for(const item of items){
     const button=el("button","warehouse-cell");
     button.type="button";
     button.setAttribute("aria-label",item.name+(item.count===null?" · 해금":(" · "+item.count+"개")));
     button.append(iconFor(item),el("span","warehouse-cell-name",item.name),
       el("span","warehouse-cell-quantity",item.count===null?"해금":"×"+item.count));
     button.addEventListener("click",()=>openDetail(item,button));
     root.append(button);
   }
   $("warehouseEmpty").hidden=items.length!==0;
   document.querySelectorAll(".warehouse-filter").forEach(b=>{
     const active=b.dataset.category===category;
     b.classList.toggle("selected",active);
     b.setAttribute("aria-pressed",String(active));
   });
   if($("warehouseDetailDialog").open&&selected)renderDetail();
 }
 function renderDetail(){
   const info=W.detail(selected.category,selected.id);
   if(!info){G.uiNav.close("warehouseDetailDialog");return;}
   G.text("warehouseDetailName",info.name);
   G.text("warehouseDetailCategory",info.categoryName);
   $("warehouseDetailIcon").replaceChildren();
   // Central modal owns outer icon container; reuse content without nesting a second frame.
   const icon=iconFor(info);
   icon.className="warehouse-icon";
   $("warehouseDetailIcon").append(icon);
   const box=$("warehouseDetailInfo");box.replaceChildren();
   for(const [name,value] of info.lines){
     const row=el("div");
     row.append(el("span","",name),el("strong","",value));
     box.append(row);
   }
   box.append(el("p","",info.description));
 }
 function openDetail(item,button){
   selected={category:item.category,id:item.id};
   renderDetail();
   G.uiNav.open("warehouseDetailDialog",button);
 }
 document.querySelectorAll(".warehouse-filter").forEach(b=>b.addEventListener("click",()=>{
   if(category!==b.dataset.category){
     category=b.dataset.category;render();$("warehouseItems").scrollTop=0;
   }
 }));
 $("warehouseDetailClose").addEventListener("click",()=>G.uiNav.close("warehouseDetailDialog"));
 $("warehouseDetailDialog").addEventListener("close",()=>{selected=null;});
 G.onChange(type=>{
   if(["materials","tools","roster","bags"].includes(type)&&
      (G.state.activeTab==="warehouse"||$("warehouseDetailDialog").open))render();
 });
 G.uiWarehouse={render,openDetail};
})();
