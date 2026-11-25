/* Compile approved tag data once at startup. Runtime consumers retain the
 * established combat contract; legacy engine fixtures are not registered here. */
(()=>{
 "use strict";
 const targets=Object.freeze({"광역-전체":"others","광역-아군":"allies","광역-상대":"enemies","단일-아군1체":"otherAlly","단일-적1체":"enemy","단일-적2체":"twoEnemies","자신":"self"});
 const names=Object.freeze(["접촉","비접촉","베기","소리","선공기",...Object.keys(targets),"연속","급소","랭크업","랭크다운"]);
 const stats=["attack","defense","spAttack","spDefense","speed","accuracy","evasion"];
 const fail=message=>{throw Error("기술 태그 오류: "+message);};
 const has=(move,tag)=>Array.isArray(move?.tags)&&move.tags.includes(tag);
 const rankList=(map,sign)=>{
   if(!map||typeof map!=="object"||Array.isArray(map)||!Object.keys(map).length)fail("랭크 상세값 누락");
   return Object.entries(map).map(([stat,n])=>{
     if(!stats.includes(stat)||!Number.isInteger(n)||n<1||n>6)fail("랭크 상세값 "+stat);
     return Object.freeze({stat,stages:sign*n});
   });
 };
 function compile(raw){
   if(!Array.isArray(raw.tags)||raw.tags.some(t=>!names.includes(t))||new Set(raw.tags).size!==raw.tags.length)fail("미등록 또는 중복 태그");
   const h=t=>has(raw,t);
   for(const [a,b] of [["접촉","비접촉"],["자신","광역-상대"],["랭크업","랭크다운"]])if(h(a)&&h(b))fail(a+" / "+b+" 충돌");
   const targetTags=raw.tags.filter(t=>Object.hasOwn(targets,t));
   if(targetTags.length!==1)fail("대상 태그는 정확히 하나");
   if(!["physical","special","status"].includes(raw.category))fail("분류");
   if(["effect","target","ranks","sunStages","sunRanks","fixedHits","criticalAgainstTypes","criticalAlways","criticalRankBonus","hitCount","criticalTypes"].some(k=>Object.hasOwn(raw,k)))fail("파생 필드 직접 지정");
   const rank=h("랭크업")||h("랭크다운"),damage=raw.category!=="status";
   if(rank===damage)fail("현재 지원되는 변화/공격 태그 조합 아님");
   if(!damage&&(h("연속")||h("급소")))fail("변화 기술 공격 태그");
   if(h("단일-적2체")&&h("연속"))fail("적 2체와 연속의 결합 규칙 미확정");
   if(h("선공기")?(!Number.isInteger(raw.priority)||raw.priority<=0):Object.hasOwn(raw,"priority"))fail("선공기 우선도");
   const hits=raw.hits,critical=raw.critical;
   const exact=(v,keys)=>v&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
   if(h("연속")){
     if(!(exact(hits,["mode","count"])&&hits.mode==="fixed"&&Number.isSafeInteger(hits.count)&&hits.count>=2)&&!(exact(hits,["mode","min","max"])&&hits.mode==="random"&&hits.min===2&&hits.max===5))fail("연속 횟수");
   }else if(Object.hasOwn(raw,"hits"))fail("연속 태그 누락");
   if(h("급소")){
     const valid=exact(critical,["mode"])&&critical.mode==="always"||
       exact(critical,["mode","targetTypes"])&&critical.mode==="conditional"&&Array.isArray(critical.targetTypes)&&critical.targetTypes.length>0&&critical.targetTypes.every(t=>Object.hasOwn(window.POKE_TYPE_CHART,t))||
       exact(critical,["mode","bonus"])&&critical.mode==="rank"&&critical.bonus===1;
     if(!valid)fail("급소 조건");
   }else if(Object.hasOwn(raw,"critical"))fail("급소 태그 누락");
   if(!rank&&(Object.hasOwn(raw,"rank")||Object.hasOwn(raw,"conditions")))fail("랭크 태그 누락");
   const {rank:rankMap,conditions,hits:hitSpec,critical:critSpec,...fields}=raw;
   const result={...fields,tags:Object.freeze([...raw.tags]),priority:h("선공기")?raw.priority:0,target:targets[targetTags[0]],effect:rank?"rank":h("연속")?"multi":"damage"};
   if(h("연속")){
     if(hitSpec.mode==="fixed")result.fixedHits=hitSpec.count;
     else result.hits=Object.freeze([2,3,4,5]);
   }
   if(h("급소")){
     if(critSpec.mode==="always")result.criticalAlways=true;
     else if(critSpec.mode==="rank")result.criticalRankBonus=critSpec.bonus;
     else result.criticalAgainstTypes=Object.freeze([...critSpec.targetTypes]);
   }
   if(rank){
     const sign=h("랭크업")?1:-1;
     result.ranks=Object.freeze(rankList(rankMap,sign));
     if(conditions!==undefined){
       if(!conditions||typeof conditions!=="object"||Object.keys(conditions).some(k=>k!=="sun")||!conditions.sun||Object.keys(conditions.sun).some(k=>k!=="rank"))fail("지원하지 않는 조건");
       result.sunRanks=Object.freeze(rankList(conditions.sun.rank,sign));
       if(result.sunRanks.map(x=>x.stat).sort().join()!==result.ranks.map(x=>x.stat).sort().join())fail("조건부 랭크 대상 불일치");
     }
   }
   return Object.freeze(result);
 }
 function registry(raw){return Object.freeze(Object.fromEntries(Object.entries(raw).map(([id,m])=>[id,compile(m)])));}
 window.PokeMoveTags=Object.freeze({names,has,compile,registry});
})();
