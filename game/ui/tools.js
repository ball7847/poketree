/* Tool UI: 2-slot equipment, recipes, three filters, sequential queue, confirm/cancel/claim.
 * All display strings are inserted via textContent.
 */
(() => {
 "use strict";
 const G=window.PokeTree,$=G.$,T=G.tools;
 const element=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
 const label=id=>T.data.items[id]?.name||id;
 let pendingCancel=null;
 const selectedQuantity=new Map();
 const fmt=ms=>{const sec=Math.ceil(ms/1000);return Math.floor(sec/3600)+"시간 "+Math.floor((sec%3600)/60)+"분 "+sec%60+"초";};
 function renderPokemon(unit){
   const root=$("pokemonToolSlots");root.replaceChildren();
   for(let slot=0;slot<2;slot++){
     const row=element("div","technique-row"),assigned=T.slots(unit)[slot];
     const choose=element("button","secondary",assigned?label(assigned)+" · 변경":"도구 선택");
     choose.type="button";choose.setAttribute("aria-label","도구 슬롯 "+(slot+1)+" 변경");
     choose.disabled=!!T.canEdit(unit);
     choose.addEventListener("click",()=>G.uiWarehouse.openForEquip(unit.id,slot,choose));
     row.append(element("span","","슬롯 "+(slot+1)),choose);
     if(assigned){
       const remove=element("button","secondary","해제");
       remove.type="button";remove.disabled=!!T.canEdit(unit);
       remove.addEventListener("click",()=>{
         const err=T.equip(unit,null,slot);
         G.text("pokemonToolMessage",err||"도구 해제 완료");
         G.uiPokemonDetail?.render?.();
       });
       row.append(remove);
     }
     root.append(row);
   }
   G.text("pokemonToolMessage",T.canEdit(unit)||"");
 }
 function renderRecipes(){
   const root=$("toolRecipes"),filter=$("toolFilter").value;root.replaceChildren();
   for(const [id,tool] of Object.entries(T.data.items)){
     const status=T.recipeStatus(id);if(filter!=="all"&&filter!==status)continue;
     const row=element("div","technique-card"),title=element("strong","",tool.name);
     row.append(title);
     const small=element("small","",Object.entries(tool.recipe).map(([mat,n])=>G.techniques.materialDisplay(mat)+" / 필요 "+n).join(" · ")+" · 1개 "+fmt(tool.craftMs));
     row.append(small);
     const controls=element("div","tool-recipe-controls");
     const amount=element("input");amount.type="number";amount.min="1";amount.step="1";amount.setAttribute("aria-label",tool.name+" 제작 수량");
     const max=T.maxCraft(id);amount.max=String(Math.max(1,max));
     const quantity=Math.max(1,Math.min(max,selectedQuantity.get(id)||1));
     selectedQuantity.set(id,quantity);amount.value=String(quantity);
     const btn=element("button","secondary","예약");btn.disabled=status!=="available"||G.state.toolQueue.length>=G.state.toolQueueCapacity;
     amount.disabled=status!=="available";
     amount.addEventListener("input",()=>{
       if(amount.value==="")return;
       const v=Number(amount.value);
       if(!Number.isFinite(v))amount.value="1";
       else amount.value=String(Math.max(1,Math.min(max,Math.floor(v))));
       selectedQuantity.set(id,Number(amount.value)||1);
     });
     btn.addEventListener("click",()=>{
       const n=Math.max(1,Math.min(T.maxCraft(id),Math.floor(Number(amount.value)||1)));
       selectedQuantity.set(id,n);
       const err=T.queue(id,n);
       G.text("toolMessage",err||tool.name+" × "+n+" 제작 예약");
       render();
     });
     controls.append(amount,btn);row.append(controls);root.append(row);
   }
   if(!root.children.length)root.append(element("p","hint","조건에 해당하는 제작법이 없습니다."));
 }
 function renderQueue(){
   const current=T.running();G.text("toolCapacity",G.state.toolQueue.length+" / "+G.state.toolQueueCapacity+"칸");
   G.text("toolCurrent",current?label(current.id)+" × "+current.count+" 제작 중":"현재 제작 중인 작업 없음");
   G.text("toolTimeLeft",current?"남은 시간 "+fmt(current.remainingMs):"대기 중");
   $("toolProgressFill").style.width=current?(100*(1-current.remainingMs/current.durationMs)).toFixed(2)+"%":"0%";
   const root=$("toolQueue");root.replaceChildren();
   G.state.toolQueue.forEach((q,i)=>{
     const button=element("button","tool-queue-row");
     const status=q.status==="done"?"수령 가능":q.status==="working"?"제작 중 · "+fmt(q.remainingMs):"대기 중";
     button.append(element("strong","",(i+1)+"번칸 · "+label(q.id)+" × "+q.count),element("small","",status));
     button.addEventListener("click",()=>{
       if(q.status==="done"){const err=T.claim(q.uid);G.text("toolMessage",err||"수령 완료");render();return;}
       pendingCancel=q.uid;
       G.text("toolCancelText",label(q.id)+" × "+q.count+" 제작을 취소할까요? 재료는 100% 반환됩니다.");
       G.uiNav.open("toolCancelDialog",button);
     });
     root.append(button);
   });
   for(let i=G.state.toolQueue.length;i<G.state.toolQueueCapacity;i++)
     root.append(element("div","tool-empty-slot",(i+1)+"번칸 · 비어 있음"));
   $("toolClaimAll").disabled=!G.state.toolQueue.some(x=>x.status==="done");
 }
 function render(){renderQueue();renderRecipes();}
 $("openWorkshop").addEventListener("click",()=>{G.uiNav.open("toolDialog",$("openWorkshop"));T.advance(Date.now());render();});
 $("toolFilter").addEventListener("change",render);
 $("toolClaimAll").addEventListener("click",()=>{const n=T.claimAll();G.text("toolMessage",n+"개 작업 수령 완료");render();});
 $("toolCancelNo").addEventListener("click",()=>{pendingCancel=null;G.uiNav.close("toolCancelDialog");});
 $("toolCancelYes").addEventListener("click",()=>{
   const err=T.cancel(pendingCancel);pendingCancel=null;
   G.uiNav.close("toolCancelDialog");G.text("toolMessage",err||"제작 취소 · 재료 100% 반환");render();
 });
 $("toolCancelDialog").addEventListener("close",()=>{pendingCancel=null;});
 // Rebuild while open on progression changes; a clock refresh also updates remaining time.
 G.onChange(type=>{if(["tools","materials","roster"].includes(type)&&$("toolDialog").open)render();});
 setInterval(()=>{if($("toolDialog").open)renderQueue();},1000);
 G.uiTools={renderPokemon,render};
})();
