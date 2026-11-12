/* Generation III+ six experience groups. No unapproved >100 extrapolation for
 * erratic/fluctuating: their original piecewise definitions end at level 100.
 */
(() => {
  "use strict";
  const groups=new Set(["fast","medium-fast","medium-slow","slow","erratic","fluctuating"]);
  function total(level,group){
    if(!groups.has(group)||!Number.isSafeInteger(level)||level<1)throw Error("경험치 유형 또는 레벨 오류");
    if(level===1)return 0;
    const n=level;
    if(level>100&&["erratic","fluctuating"].includes(group))return null;
    let value;
    switch(group){
      case "fast":value=4*n**3/5;break;
      case "medium-fast":value=n**3;break;
      case "medium-slow":value=6*n**3/5-15*n**2+100*n-140;break;
      case "slow":value=5*n**3/4;break;
      case "erratic":
        // Gen III+ piecewise XP table boundaries: 50 / 68 / 98.
        if(n<50)value=n**3*(100-n)/50;
        else if(n<68)value=n**3*(150-n)/100;
        else if(n<98)value=n**3*Math.floor((1911-10*n)/3)/500;
        else value=n**3*(160-n)/100;
        break;
      case "fluctuating":
        // Gen III+ piecewise XP table boundaries: 15 / 36.
        if(n<15)value=n**3*(Math.floor((n+1)/3)+24)/50;
        else if(n<36)value=n**3*(n+14)/50;
        else value=n**3*(Math.floor(n/2)+32)/50;
        break;
    }
    const result=Math.max(0,Math.floor(value));
    if(!Number.isSafeInteger(result))throw Error("경험치 정수 안전 범위 초과");
    return result;
  }
  function next(level,group){
    const a=total(level,group),b=total(level+1,group);
    return a===null||b===null?null:b-a;
  }
  // experience represents XP earned WITHIN the current level.
  function remaining(unit){
    const cost=next(unit.level,unit.growth);
    return cost===null?null:Math.max(0,cost-unit.experience);
  }
  function gain(unit,amount,onLevel){
    if(!Number.isSafeInteger(amount)||amount<0)throw Error("경험치는 0 이상의 안전한 정수여야 합니다");
    if(!Number.isSafeInteger(unit.experience)||unit.experience<0||!Number.isSafeInteger(unit.level)||unit.level<1)throw Error("기존 경험치 또는 레벨 오류");
    let pending=amount,levels=0;
    while(pending>0){
      const cost=next(unit.level,unit.growth);
      if(cost===null)break; // require explicit policy for 100+ erratic/fluctuating
      if(!Number.isSafeInteger(cost)||cost<=0)throw Error("레벨별 필요 경험치 오류");
      // Compare by subtraction to avoid overflow in unit.experience + pending.
      if(pending<cost-unit.experience){unit.experience+=pending;pending=0;break;}
      pending-=cost-unit.experience;
      unit.experience=0;
      unit.level++;levels++;
      onLevel?.(unit);
      if(levels>100000)throw Error("한 번에 너무 많은 레벨업");
    }
    return {levels,unapplied:pending};
  }
  window.PokeExperience=Object.freeze({total,next,remaining,gain,groups});
})();