/* Individual Pokemon model and stat calculation: data is independent of UI. */
(() => {
  "use strict";
  const keys=["hp","attack","defense","spAttack","spDefense","speed"];
  const normalTypes=window.POKE_SPECIES,natures=window.POKE_NATURES,experience=window.PokeExperience;
  const natureKeys=Object.keys(natures);
  const named=(unit)=>unit.nickname||normalTypes[unit.species]?.name||unit.name||"포켓몬";
  function template(species,form="normal"){
    const s=normalTypes[species];if(!s||!s.forms[form])throw Error("알 수 없는 종족 또는 폼: "+species+"/"+form);
    return {species:s,form:s.forms[form]};
  }
  function stats(unit){
    const {form}=template(unit.species,unit.form);
    const n=natures[unit.nature];if(!n)throw Error("알 수 없는 성격");
    const out={};
    for(const key of keys){
      const iv=unit.iv[key],ev=unit.ev[key],base=form.base[key];
      if(!Number.isInteger(iv)||iv<0||iv>31||!Number.isSafeInteger(ev)||ev<0)throw Error("개체값/노력치 범위 오류: "+key);
      const v=Math.floor((2*base+iv+Math.floor(ev/4))*unit.level/100);
      if(key==="hp")out.hp=unit.species==="shedinja"?1:v+unit.level+10;
      else{
        const raw=v+5;
        out[key]=Math.floor(raw*(n.up===key?1.1:n.down===key?.9:1));
      }
      if(!Number.isSafeInteger(out[key]))throw Error("능력치 안전 정수 범위 초과");
    }
    return out;
  }
  function ppGain(unit){
    const value=10+Math.sqrt(unit.attack+unit.spAttack)/10;
    return Math.floor(value); // ability-specific modifications are not implemented yet.
  }
  function create(config){
    const species=normalTypes[config.species];if(!species)throw Error("종족 정보 없음");
    const form=config.form||"normal";template(config.species,form);
    const nature=config.nature||"hardy";if(!natures[nature])throw Error("성격 정보 없음");
    const gender=config.gender??(species.genderRate===-1?"genderless":species.genderRate===0?"male":species.genderRate===8?"female":Math.random()*8<species.genderRate?"female":"male");
    if(!["male","female","genderless"].includes(gender)||species.genderRate===-1&&gender!=="genderless")throw Error("성별 정보 오류");
    const iv=Object.fromEntries(keys.map(k=>[k,config.iv?.[k]??Math.floor(Math.random()*32)]));
    const ev=Object.fromEntries(keys.map(k=>[k,config.ev?.[k]??0]));
    const unit={
      id:config.id,species:config.species,form,nickname:config.nickname??null,name:species.name,
      nature,gender,growth:species.growth,level:config.level??1,experience:config.experience??0,
      iv,ev,pp:0,bag:[],expedition:null,side:config.side||"ally",normalAttackCount:0
    };
    if(!unit.id||!Number.isSafeInteger(unit.level)||unit.level<1)throw Error("포켓몬 ID 또는 레벨 오류");
    if(!Number.isSafeInteger(unit.experience)||unit.experience<0)throw Error("경험치 오류");
    const cost=experience.next(unit.level,unit.growth);
    if(cost!==null&&unit.experience>=cost)throw Error("레벨별 경험치 범위 오류");
    Object.assign(unit,stats(unit));
    unit.maxHp=unit.hp; // current HP initialized at max
    return unit;
  }
  function gainExp(unit,amount){
    const result=experience.gain(unit,amount,(u)=>{
      const wasMax=u.maxHp;
      Object.assign(u,stats(u));
      u.maxHp=u.hp;
      u.hp=Math.min(u.maxHp,wasMaxDamage(u,wasMax));
    });
    return result;
  }
  function wasMaxDamage(u,oldMax){
    // u.hp was just recalculated in stats(); preserve previous HP via wrapper below.
    return u.maxHp; // overwritten by wrapped gainExp below
  }
  function grantExperience(unit,amount){
    const beforeHP=unit.hp,beforeMax=unit.maxHp;
    const result=experience.gain(unit,amount);
    if(result.levels){
      const updated=stats(unit);
      Object.assign(unit,updated);
      unit.maxHp=updated.hp;
      unit.hp=Math.min(unit.maxHp,beforeHP+(updated.hp-beforeMax));
    }
    return result;
  }
  function setNickname(unit,nickname){
    if(typeof nickname!=="string")throw Error("별명 형식 오류");
    const trimmed=nickname.trim();
    if(trimmed.length>128)throw Error("별명이 너무 깁니다 (최대 128자)");
    unit.nickname=trimmed||null;
    unit.name=named(unit);
  }
  function attackCategory(unit){return unit.attack>=unit.spAttack?"physical":"special";}
  function normalAttackType(unit){
    const types=template(unit.species,unit.form).form.types;
    return types[unit.normalAttackCount%types.length];
  }
  function usedNormalAttack(unit){unit.normalAttackCount++;}
  function validateSpecies(){
    const errors=[];
    for(const [id,s] of Object.entries(normalTypes)){
      if(!Number.isInteger(s.genderRate)||s.genderRate < -1 || s.genderRate>8)errors.push(id+" 성비");
      if(!experience.groups.has(s.growth))errors.push(id+" 경험치 그룹");
      for(const [form,shape] of Object.entries(s.forms||{})){
        if(!Array.isArray(shape.types)||shape.types.length<1||shape.types.length>2||shape.types.some(t=>!window.POKE_TYPE_CHART[t]))errors.push(id+"/"+form+" 타입");
        if(keys.some(k=>!Number.isSafeInteger(shape.base[k])||shape.base[k]<=0))errors.push(id+"/"+form+" 종족값");
      }
    }
    return errors;
  }
  window.PokePokemon=Object.freeze({keys,stats,create,named,ppGain,grantExperience,setNickname,attackCategory,normalAttackType,usedNormalAttack,validateSpecies,template,natures});
})();