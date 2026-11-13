/* Owned Pokemon information panel. No speculative ability/EV gain rules. */
(() => {
  "use strict";
  const G=window.PokeTree,$=G.$,P=G.Pokemon,Exp=G.Experience,db=G.db;
  const dialog=$("pokemonDetailDialog");
  let selected=null;
  const typeKo={normal:"노말",fire:"불꽃",water:"물",electric:"전기",grass:"풀",ice:"얼음",fighting:"격투",poison:"독",ground:"땅",flying:"비행",psychic:"에스퍼",bug:"벌레",rock:"바위",ghost:"고스트",dragon:"드래곤",dark:"악",steel:"강철",fairy:"페어리"};
  const find=()=>G.state.roster.find(u=>u.id===selected);
  function render(syncNickname=false){
    const u=find();if(!u)return;
    const spec=db.species[u.species],form=spec.forms[u.form];
    G.text("pokemonInfoName",u.name);
    G.text("pokemonInfoSpecies",spec.name+" · No."+spec.dex);
    G.text("pokemonInfoIdentity",P.natures[u.nature].name+" / "+({male:"♂",female:"♀",genderless:"무성"}[u.gender]||"—")+" / "+form.name);
    G.text("pokemonInfoTypes",form.types.map(t=>typeKo[t]||t).join(" / "));
    G.text("pokemonInfoLevel","Lv."+u.level);
    G.text("pokemonInfoExp",u.experience.toLocaleString("ko-KR"));
    const remain=Exp.remaining(u);
    G.text("pokemonInfoRemaining",remain===null?"101레벨 이상 공식 미정":remain.toLocaleString("ko-KR"));
    G.text("pokemonInfoHP",u.hp+"/"+u.maxHp);
    G.text("pokemonInfoPP",P.ppGain(u));
    G.text("pokemonInfoAttack",u.attack);
    G.text("pokemonInfoDefense",u.defense);
    G.text("pokemonInfoSpAttack",u.spAttack);
    G.text("pokemonInfoSpDefense",u.spDefense);
    G.text("pokemonInfoSpeed",u.speed);
    G.text("pokemonInfoCategory",P.attackCategory(u)==="physical"?"물리":"특수");
    const img=$("pokemonInfoImage");
    const src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/"+spec.dex+".png";
    if(img.getAttribute("src")!==src){img.hidden=false;img.src=src;}
    img.alt=spec.name;
    img.onerror=()=>{img.hidden=true;};
    G.uiTechniques?.renderPokemon?.(u);
    G.uiTools?.renderPokemon?.(u);
    if(syncNickname)$("pokemonNickname").value=u.nickname||"";
    if(syncNickname)G.text("pokemonNicknameMessage","");
  }
  function open(id,trigger){selected=id;render(true);G.uiNav.open("pokemonDetailDialog",trigger);}
  $("savePokemonNickname").addEventListener("click",()=>{
    const u=find();if(!u)return;
    try{
      P.setNickname(u,$("pokemonNickname").value);
      G.change("nickname");G.change("roster");render(true);
      G.text("pokemonNicknameMessage","별명을 저장했습니다.");
    }catch(e){G.text("pokemonNicknameMessage",e.message);}
  });
  dialog.addEventListener("close",()=>{selected=null;});
  G.onChange(type=>{if(selected&&["roster","level","expedition"].includes(type)&&dialog.open)render();});
  G.uiPokemonDetail={open,render};
})();