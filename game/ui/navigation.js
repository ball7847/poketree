/* Navigation and popups preserve per-tab state and scroll. */
(() => {
  "use strict";
  const G=window.PokeTree,$=G.$;
  const tabs=["village","pokemon","exploration","records"];
  const scroll=Object.fromEntries(tabs.map(id=>[id,0]));
  function switchTab(id) {
    if(!tabs.includes(id))return;
    const current=G.state.activeTab;
    if(current===id){
      $("tab-"+id).scrollTop=0;scroll[id]=0;return;
    }
    scroll[current]=$("tab-"+current).scrollTop;
    $("tab-"+current).hidden=true;
    $("nav-"+current).classList.remove("active");
    $("nav-"+current).removeAttribute("aria-current");
    const target=$("tab-"+id);
    target.hidden=false;
    $("nav-"+id).classList.add("active");
    $("nav-"+id).setAttribute("aria-current","page");
    G.state.activeTab=id;
    target.scrollTop=scroll[id];
  }
  document.querySelectorAll(".nav-button[data-tab]").forEach(button=>{
    button.addEventListener("click",()=>switchTab(button.dataset.tab));
  });
  let focusedBefore=null;
  function open(id,trigger) {
    const d=$(id); if(!d || d.open)return;
    focusedBefore=trigger||document.activeElement;
    if(d.showModal)d.showModal();else d.setAttribute("open","");
  }
  function close(id) {
    const d=$(id);if(!d?.open)return;
    if(d.close)d.close();else d.removeAttribute("open");
  }
  document.querySelectorAll("[data-close-dialog]").forEach(btn=>
    btn.addEventListener("click",()=>close(btn.dataset.closeDialog)));
  ["notificationsDialog","settingsDialog","explorationDialog"].forEach(id=>{
    const d=$(id);
    d.addEventListener("close",()=>{focusedBefore?.focus();focusedBefore=null;});
    d.addEventListener("click",event=>{
      if(event.target===d)close(id);
    });
  });
  $("openNotifications").addEventListener("click",e=>open("notificationsDialog",e.currentTarget));
  $("openSettings").addEventListener("click",e=>open("settingsDialog",e.currentTarget));
  G.uiNav={open,close,switchTab};
})();
