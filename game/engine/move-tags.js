/* Compile approved tag data once at startup. Runtime consumers retain the
 * established combat contract; legacy engine fixtures are not registered here. */
(()=>{
 "use strict";
 const names=Object.freeze(["접촉","비접촉","베기","소리","선공기","광역-상대","자신","연속","급소","랭크업","랭크다운"]);
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
   if(!["physical","special","status"].includes(raw.category))fail("분류");
   if(["effect","target","ranks","sunStages","fixedHits","criticalAgainstTypes"].some(k=>Object.hasOwn(raw,k)))fail("파생 필드 직접 지정");
   const rank=h("랭크업")||h("랭크다운"),damage=raw.category!=="status";
   if(rank===damage)fail("현재 지원되는 변화/공격 태그 조합 아님");
   if(!damage&&(h("연속")||h("급소")))fail("변화 기술 공격 태그");
   if(h("선공기")?(!Number.isInteger(raw.priority)||raw.priority<=0):Object.hasOwn(raw,"priority"))fail("선공기 우선도");
   if(h("연속")?(!Number.isSafeInteger(raw.hitCount)||raw.hitCount<2):Object.hasOwn(raw,"hitCount"))fail("연속 횟수");
   if(h("급소")?(!Array.isArray(raw.criticalTypes)||!raw.criticalTypes.length||raw.criticalTypes.some(t=>!Object.hasOwn(window.POKE_TYPE_CHART,t))):Object.hasOwn(raw,"criticalTypes"))fail("급소 조건");
   if(!rank&&(Object.hasOwn(raw,"rank")||Object.hasOwn(raw,"conditions")))fail("랭크 태그 누락");
   const {rank:rankMap,conditions,hitCount,criticalTypes,...fields}=raw;
   const result={...fields,tags:Object.freeze([...raw.tags]),priority:h("선공기")?raw.priority:0,target:h("자신")?"self":h("광역-상대")?"enemies":"enemy",effect:rank?"rank":h("연속")?"multi":"damage"};
   if(h("연속"))result.fixedHits=hitCount;
   if(h("급소"))result.criticalAgainstTypes=Object.freeze([...criticalTypes]);
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
