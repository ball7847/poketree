/* Equipment and TM UI. All texts escaped using textContent. */
(() => {
 "use strict";
 const G=window.PokeTree,$=G.$,T=G.techniques,moveData=window.POKE_MOVES;
 let activePokemon=null;
 const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
 const name=id=>moveData[id]?.name||id;
 function renderPokemon(unit){
   activePokemon=unit.id;T.initialize(unit);
   const root=$("pokemonMoveSlots"),list=$("pokemonLearnedMoves");
   root.replaceChildren();list.replaceChildren();
   const blocked=T.canEdit(unit);
   for(let i=0;i<2;i++){
     const line=el("div","technique-row");
     const title=el("span","", "슬롯 "+(i+1));
     const select=el("select");select.setAttribute("aria-label","슬롯 "+(i+1)+" 기술");
     const empty=el("option","","미장착");empty.value="";select.append(empty);
     for(const id of unit.learnedMoves){const opt=el("option","",name(id));opt.value=id;select.append(opt);}
     select.value=unit.moves[i]||"";select.disabled=!!blocked;
     select.addEventListener("change",()=>{const err=T.equip(unit,select.value||null,i);G.text("pokemonMoveMessage",err||"장착 변경 완료 · PP 유지");renderPokemon(unit);});
     line.append(title,select);root.append(line);
   }
   for(const id of unit.learnedMoves)list.append(el("div","technique-row",name(id)));
   if(!unit.learnedMoves.length)list.append(el("p","hint","습득 기술 없음"));
   G.text("pokemonMoveMessage",blocked||"");
 }
 function renderTM(){
   const filter=$("tmFilter").value,recipes=$("tmRecipes");recipes.replaceChildren();
   for(const [id,recipe] of Object.entries(T.data.recipes)){
     const status=T.recipeStatus(id);if(filter!=="all"&&filter!==status)continue;
     const row=el("div","technique-card");
     row.append(el("strong","",name(id)));
     const materials=el("small","",Object.entries(recipe).map(([mat,need])=>T.materialDisplay(mat)+" / 필요 "+need).join(" · "));
     row.append(materials);
     const btn=el("button","secondary",status==="available"?"제작":status==="locked"?"잠김":"제작 불가");
     btn.disabled=status!=="available";
     btn.addEventListener("click",()=>{const err=T.craft(id);G.text("tmMessage",err||name(id)+" 기술머신 해금");renderTM();});
     row.append(btn);recipes.append(row);
   }
   if(!recipes.children.length)recipes.append(el("p","hint","해당 필터의 기술머신이 없습니다."));
   const target=$("tmTarget"),old=target.value;target.replaceChildren();
   for(const u of G.state.roster){const opt=el("option","",u.name+" · Lv."+u.level+(u.expedition?" (탐험 중)":""));opt.value=u.id;target.append(opt);}
   if(G.state.roster.some(u=>u.id===old))target.value=old;
   const unit=G.state.roster.find(u=>u.id===target.value);
   const owned=$("tmOwned");owned.replaceChildren();
   for(const id of G.state.technicalMachines){
     const row=el("div","technique-row");row.append(el("span","",name(id)));
     const button=el("button","secondary",unit?.learnedMoves?.includes(id)?"습득 완료":"가르치기");
     button.disabled=!unit||!!T.canUseTM(unit,id)||unit.learnedMoves?.includes(id);
     button.addEventListener("click",()=>{const err=T.useTM(unit,id);G.text("tmMessage",err||unit.name+" · "+name(id)+" 습득");renderTM();});
     row.append(button);owned.append(row);
   }
   if(!owned.children.length)owned.append(el("p","hint","해금된 기술머신이 없습니다."));
 }
 $("openTmPanel").addEventListener("click",()=>{G.uiNav.open("tmDialog",$("openTmPanel"));renderTM();});
 $("tmFilter").addEventListener("change",renderTM);
 $("tmTarget").addEventListener("change",renderTM);
 G.onChange(type=>{if(["roster","materials","expedition"].includes(type)&&$("tmDialog").open)renderTM();});
 G.uiTechniques={renderPokemon,renderTM};
})();
