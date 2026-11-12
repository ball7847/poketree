/* PokeTree web client bootstrap — state and UI components are modular. */
(() => {
  "use strict";
  const G=window.PokeTree,$=G.$,state=G.state;
  const MAX_LOG=160;
  function make(tag,cls,text) {
    const el=document.createElement(tag);if(cls)el.className=cls;
    if(text!==undefined)el.textContent=text;
    return el;
  }
  function logRow(item) {
    const row=make("div","logentry");
    const time=make("em","",item.time);
    const area=item.regionId?G.db.regions[item.regionId]?.name+" · ":"";
    row.append(time,document.createTextNode(area+item.message));
    return row;
  }
  function notificationRow(item) {
    return make("div","notification-row",item.time+"  "+item.message);
  }
  // Append only new entries, even when the bounded log is full.
  function addLog() {
    const el=$("eventLog");
    if(state.log.length) {
      el.prepend(logRow(state.log[0]));
      while(el.children.length>MAX_LOG)el.lastElementChild.remove();
    }
  }
  function addNotification() {
    const el=$("notifications");
    if(state.notifications.length===1)el.replaceChildren();
    if(state.notifications.length){
      el.prepend(notificationRow(state.notifications[0]));
      while(el.children.length>30)el.lastElementChild.remove();
    }
  }
  function updateActiveCount() {
    const active=Object.values(state.regions).filter(e=>e.mode!=="idle").length;
    G.text("activity","탐험 "+active+"곳");
  }
  function updateSpeedButtons() {
    document.querySelectorAll(".speed").forEach(b=>{
      b.classList.toggle("selected",Number(b.dataset.speed)===state.speedMs);
    });
  }
  G.onChange((type,id)=>{
    if(type==="log")addLog();
    if(type==="notification")addNotification();
    if(type==="expedition")updateActiveCount();
    if(type==="speed")updateSpeedButtons();
  });
  $("clearLog").addEventListener("click",()=>{
    state.log.length=0; $("eventLog").replaceChildren();
  });
  $("clearNotifications").addEventListener("click",()=>{
    state.notifications.length=0; 
    $("notifications").textContent="아직 알림이 없습니다.";
  });
  document.querySelectorAll(".speed").forEach(button=>{
    button.addEventListener("click",()=>{
      G.exploration.setIntervalMs(Number(button.dataset.speed));
    });
  });
  updateActiveCount();updateSpeedButtons();
  G.record(null,"PokeTree 탐험 프로토타입 시작 · 지역 카드를 눌러 탐험하세요.");
  // Ignore inactive period rather than fast-forwarding huge action bursts.
  // Timers keep running while another tab or dialog is shown.
  setInterval(()=>G.exploration.frame(performance.now()),100);
})();
