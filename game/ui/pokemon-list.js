/* Stable, selectable roster cards; independent from expedition picker. */
(() => {
  "use strict";
  const G=window.PokeTree,root=G.$("partySelect"),cards=new Map();
  function render(){
    const active=new Set(G.state.roster.map(u=>u.id));
    for(const [id,card] of cards)if(!active.has(id)){card.remove();cards.delete(id);}
    G.state.roster.forEach((u,i)=>{
      let card=cards.get(u.id);
      if(!card){
        card=document.createElement("button");card.type="button";card.className="select-unit pokemon-owned";
        card.addEventListener("click",()=>G.uiPokemonDetail?.open(u.id,card));
        const name=document.createElement("strong"),detail=document.createElement("small");
        card.append(name,detail);cards.set(u.id,card);
      }
      if(root.children[i]!==card)root.insertBefore(card,root.children[i]||null);
      const status=u.expedition?G.db.regions[u.expedition]?.name+" 탐험 중":u.hp<u.maxHp?"HP 회복 중":"대기";
      const label=u.name+" · Lv."+u.level;
      const info="HP "+u.hp+"/"+u.maxHp+" · "+status;
      if(card.children[0].textContent!==label)card.children[0].textContent=label;
      if(card.children[1].textContent!==info)card.children[1].textContent=info;
      card.setAttribute("aria-label",label+" 정보 보기");
    });
  }
  G.onChange((type)=>{if(["roster","expedition","nickname","level"].includes(type))render();});
  render();
})();