/* Individual item inventory, 2 equipment slots, and sequential crafting with persistent wall-clock progress.
 * Demo item recipes are in data/tools.js. No upgrade costs or drop probabilities are invented.
 */
(() => {
 "use strict";
 const G=window.PokeTree, data=window.POKE_TOOL_DATA, state=G.state;
 const keys=["hp","attack","defense","spAttack","spDefense","speed"];
 const isCount=n=>Number.isSafeInteger(n)&&n>=0;
 const all=()=>state.roster;
 const emptySlots=()=>[null,null];
 const slots=u=>Array.isArray(u.toolSlots)?u.toolSlots:emptySlots();
 const item=id=>data.items[id];
 const owned=id=>state.toolInventory[id]||0;
 const equipped=id=>all().reduce((n,u)=>n+slots(u).filter(x=>x===id).length,0);
 const available=id=>owned(id)-equipped(id);
 const canEdit=u=>u?.side==="ally"&&u.expedition===null?null:"탐험에서 귀환한 포켓몬만 도구를 변경할 수 있습니다.";
 function modifiedStats(u,base){
   const total=Object.fromEntries(keys.map(k=>[k,0]));
   for(const id of slots(u))if(item(id))
     for(const [key,value] of Object.entries(item(id).modifiers||{}))
       if(keys.includes(key))total[key]+=value;
   return Object.fromEntries(keys.map(key=>[key,Math.max(1,Math.floor(base[key]*(1+total[key])))]));
 }
 function recalculate(u){
   const oldMax=u.maxHp,oldHp=u.hp;
   const stats=modifiedStats(u,G.Pokemon.stats(u));
   Object.assign(u,stats);
   u.maxHp=stats.hp;
   // Preserve damage, and never revive a fainted Pokémon through equipment.
   u.hp=oldHp===0?0:Math.min(stats.hp,Math.max(0,oldHp+stats.hp-oldMax));
 }
 function equip(u,id,slot){
   if(!Number.isInteger(slot)||slot<0||slot>1)return "도구 슬롯은 1~2만 가능합니다.";
   const blocked=canEdit(u);if(blocked)return blocked;
   if(id!==null&&!item(id))return "등록되지 않은 도구입니다.";
   const current=slots(u),old=current[slot];
   if(id!==null&&current.some((x,i)=>i!==slot&&x===id))return "동일한 도구는 중복 장착할 수 없습니다.";
   if(id!==null&&old!==id&&available(id)<1)return "사용 가능한 도구가 없습니다.";
   u.toolSlots=[...current];u.toolSlots[slot]=id;
   recalculate(u);G.change("roster");G.change("tools");
   return null;
 }
 function add(id,count=1){
   if(!item(id)||!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(owned(id)+count))return false;
   state.toolInventory[id]=owned(id)+count;G.change("tools");return true;
 }
 function collectLoot(loot){return typeof loot==="string"&&loot.startsWith("tool:")?add(loot.slice(5)):false;}
 function materialsKnown(id){
   const recipe=item(id)?.recipe;
   return recipe?Object.keys(recipe).every(mat=>state.materialDex.includes(mat)):false;
 }
 function maxCraft(id){
   const recipe=item(id)?.recipe;
   if(!recipe||!materialsKnown(id))return 0;
   return Math.min(...Object.entries(recipe).map(([mat,n])=>Math.floor((state.materials[mat]||0)/n)));
 }
 function recipeStatus(id){
   if(!item(id))return "unknown";
   return !materialsKnown(id)?"locked":maxCraft(id)>0?"available":"unavailable";
 }
 function running(){return state.toolQueue.find(x=>x.status==="working")||null;}
 function promote(){
   if(running())return;
   const next=state.toolQueue.find(x=>x.status==="waiting");
   if(next)next.status="working";
 }
 function advance(now=Date.now()){
   if(!Number.isFinite(now))return;
   if(!Number.isFinite(state.toolLastAt)){state.toolLastAt=now;return;}
   let delta=Math.max(0,now-state.toolLastAt);
   state.toolLastAt=Math.max(now,state.toolLastAt);
   let changed=false;
   promote();
   while(delta>0){
     const current=running();if(!current)break;
     if(delta<current.remainingMs){current.remainingMs-=delta;delta=0;changed=true;break;}
     delta-=current.remainingMs;current.remainingMs=0;current.status="done";
     changed=true;promote();
   }
   if(changed)G.change("tools");
 }
 function queue(id,count,now=Date.now()){
   advance(now);
   if(!item(id))return "등록되지 않은 도구입니다.";
   if(state.toolQueue.length>=state.toolQueueCapacity)return "제작 대기열이 가득 찼습니다.";
   if(!Number.isSafeInteger(count)||count<1)return "제작 수량은 1 이상의 정수여야 합니다.";
   if(recipeStatus(id)!=="available"||count>maxCraft(id))return "필요 재료가 부족하거나 미발견 재료가 있습니다.";
   const duration=item(id).craftMs*count;
   if(!Number.isSafeInteger(duration))return "제작 시간 범위를 초과했습니다.";
   // Reserve the full batch of materials atomically when enqueuing.
   for(const [mat,n] of Object.entries(item(id).recipe))state.materials[mat]-=n*count;
   const entry={uid:state.toolNextId++,id,count,durationMs:duration,remainingMs:duration,status:"waiting"};
   state.toolQueue.push(entry);promote();
   G.change("materials");G.change("tools");return null;
 }
 function cancel(uid,now=Date.now()){
   advance(now);
   const i=state.toolQueue.findIndex(x=>x.uid===uid);
   if(i<0)return "제작 작업이 없습니다.";
   const x=state.toolQueue[i];
   if(x.status==="done")return "완료된 작업은 취소할 수 없습니다.";
   for(const [mat,n] of Object.entries(item(x.id).recipe))state.materials[mat]=(state.materials[mat]||0)+n*x.count;
   state.toolQueue.splice(i,1);promote();
   G.change("materials");G.change("tools");return null;
 }
 function claim(uid,now=Date.now()){
   advance(now);
   const i=state.toolQueue.findIndex(x=>x.uid===uid);
   if(i<0||state.toolQueue[i].status!=="done")return "수령 가능한 작업이 아닙니다.";
   const x=state.toolQueue[i];
   if(!add(x.id,x.count))return "도구 수량 범위를 초과했습니다.";
   state.toolQueue.splice(i,1);
   G.change("tools");return null;
 }
 function claimAll(now=Date.now()){
   advance(now);
   let count=0;
   // Award entries and clear their slots one at a time; no other statuses are touched.
   for(const x of [...state.toolQueue])if(x.status==="done"&&claim(x.uid,now)===null)count++;
   return count;
 }
 function restore(raw,now=Date.now()){
   const savedInv=raw?.toolInventory||{};
   state.toolInventory=Object.fromEntries(Object.keys(data.items).map(id=>[id,isCount(savedInv[id])?savedInv[id]:0]));
   for(const u of all()){
     const saved=Array.isArray(u.toolSlots)?u.toolSlots.slice(0,2):[];
     const next=emptySlots();
     for(let i=0;i<2;i++)if(item(saved[i])&&saved[i]!==next[1-i]&&
        all().filter(v=>v!==u).reduce((n,v)=>n+slots(v).filter(s=>s===saved[i]).length,0)+next.filter(s=>s===saved[i]).length<owned(saved[i])){
       next[i]=saved[i];
     }
     u.toolSlots=next;
     recalculate(u);
   }
   const maxCap=Number.isSafeInteger(raw?.toolQueueCapacity)&&raw.toolQueueCapacity>=3?raw.toolQueueCapacity:3;
   state.toolQueueCapacity=maxCap;
   const source=Array.isArray(raw?.toolQueue)?raw.toolQueue:[];
   const ids=new Set();
   state.toolQueue=[];
   for(const q of source.slice(0,maxCap)){
     if(!item(q.id)||!isCount(q.uid)||ids.has(q.uid)||!Number.isSafeInteger(q.count)||q.count<1||
       !Number.isSafeInteger(q.durationMs)||q.durationMs!==item(q.id).craftMs*q.count||
       !Number.isSafeInteger(q.remainingMs)||q.remainingMs<0||q.remainingMs>q.durationMs||
       !["waiting","working","done"].includes(q.status))continue;
     ids.add(q.uid);state.toolQueue.push({...q});
   }
   // Normalize corrupt/old saves to exactly one active task; done slots stay complete.
   let seen=false;
   for(const q of state.toolQueue)if(q.status==="working"){if(seen)q.status="waiting";else seen=true;}
   state.toolNextId=Math.max(1,...ids)+1;
   state.toolLastAt=Number.isFinite(raw?.toolLastAt)&&raw.toolLastAt>=0?raw.toolLastAt:now;
   promote();advance(now);
 }
 function snapshot(){return {toolInventory:{...state.toolInventory},toolQueue:state.toolQueue.map(x=>({...x})),
   toolQueueCapacity:state.toolQueueCapacity,toolLastAt:state.toolLastAt};}
 state.toolInventory={};state.toolQueue=[];state.toolQueueCapacity=3;state.toolNextId=1;state.toolLastAt=Date.now();
 G.tools={data,slots,owned,equipped,available,canEdit,equip,add,collectLoot,modifiedStats,recalculate,
   recipeStatus,materialsKnown,maxCraft,queue,advance,cancel,claim,claimAll,restore,snapshot,running};
})();
