/* Warehouse reads existing source-of-truth inventories; it never duplicates stock.
 * No capacity cap, item consumption, or storage migration introduced here.
 */
(() => {
 "use strict";
 const G=window.PokeTree, materialData=window.POKE_TECH_DATA.materials,
       moveData=window.POKE_MOVES, toolData=window.POKE_TOOL_DATA.items;
 const categories=Object.freeze({material:"재료",tool:"도구",tm:"기술머신"});
 function entries(category="all"){
   if(!["all",...Object.keys(categories)].includes(category))return [];
   const out=[];
   if(category==="all"||category==="material")
     for(const [id,data] of Object.entries(materialData)){
       const count=G.state.materials[id]||0;
       if(Number.isSafeInteger(count)&&count>0)
         out.push({key:"material:"+id,id,category:"material",name:data.name,count});
     }
   if(category==="all"||category==="tool")
     for(const [id,data] of Object.entries(toolData)){
       const count=G.tools.owned(id);
       if(Number.isSafeInteger(count)&&count>0)
         out.push({key:"tool:"+id,id,category:"tool",name:data.name,count});
     }
   if(category==="all"||category==="tm")
     for(const id of Object.keys(window.POKE_TECH_DATA.recipes))
       if(G.state.technicalMachines.includes(id))
         out.push({key:"tm:"+id,id,category:"tm",name:moveData[id]?.name||id,count:null});
   return out;
 }
 function detail(category,id){
   const entry=entries(category).find(x=>x.id===id);
   if(!entry)return null;
   const lines=[];
   if(category==="material"){
     lines.push(["보유 수량",entry.count+"개"]);
     lines.push(["용도","제작 재료"]);
   }else if(category==="tool"){
     const tool=toolData[id],equipped=G.tools.equipped(id);
     lines.push(["전체 보유",entry.count+"개"],["장착 중",equipped+"개"],["사용 가능",G.tools.available(id)+"개"]);
     const names={hp:"최대 HP",attack:"공격",defense:"방어",spAttack:"특수공격",spDefense:"특수방어",speed:"스피드"};
     for(const [stat,value] of Object.entries(tool.modifiers||{}))
       lines.push([names[stat]||stat,(value>=0?"+":"")+(value*100)+"%"]);
   }else if(category==="tm"){
     const m=moveData[id];
     lines.push(["획득 상태","영구 해금"]);
     if(m?.type)lines.push(["기술 타입",m.type]);
     if(m?.category)lines.push(["기술 분류",m.category]);
     if(Number.isFinite(m?.power))lines.push(["기술 위력",String(m.power)]);
   }
   return {...entry,categoryName:categories[category],lines,description:
     category==="material"?"도구 또는 기술머신을 제작할 때 사용하는 재료입니다.":
     category==="tool"?"포켓몬이 장착할 수 있는 도구입니다. 현재 효과는 시연용 데이터입니다.":
     "해금된 기술머신은 여러 포켓몬에게 반복해서 사용할 수 있습니다."};
 }
 G.warehouse={entries,detail,categories};
})();
