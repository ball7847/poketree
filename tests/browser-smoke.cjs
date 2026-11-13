/* Chromium UI smoke regression: actual clicks against the deployed-layout local static build.
 * Run: npm install --no-save playwright-core && node tests/browser-smoke.cjs
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const http=require("node:http");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const {chromium}=require("playwright-core");
const root=path.resolve(__dirname,"../_site");
function chromePath(){
 for(const cmd of ["google-chrome","google-chrome-stable","chromium","chromium-browser"]){
  try{return execFileSync("which",[cmd],{encoding:"utf8"}).trim();}catch{}
 }
 throw Error("Chromium/Chrome executable not found on runner");
}
function server(){
 return http.createServer((req,res)=>{
   const url=new URL(req.url,"http://localhost");
   const rel=decodeURIComponent(url.pathname).replace(/^\/+/, "")||"index.html";
   const target=path.resolve(root,rel);
   if(!(target===root||target.startsWith(root+path.sep))){res.writeHead(403);res.end();return;}
   fs.readFile(target,(err,buf)=>{
     if(err){res.writeHead(404);res.end();return;}
     const ext=path.extname(target);
     const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"};
     res.writeHead(200,{"content-type":mime[ext]||"application/octet-stream"});res.end(buf);
   });
 });
}
(async()=>{
 const srv=server();await new Promise(resolve=>srv.listen(0,"127.0.0.1",resolve));
 let browser;
 try{
  browser=await chromium.launch({executablePath:chromePath(),headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("http://127.0.0.1:"+srv.address().port+"/game/index.html",{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.PokeTree?.uiWarehouse && !!window.PokeTree?.uiTools);
  assert.deepEqual(errors,[],"Initial boot must not throw");
  assert.equal(await page.evaluate(()=>Object.keys(window.POKE_SPECIES).length),1025);
  assert.equal(await page.evaluate(()=>window.PokeTree.Pokemon.validateSpecies().length),0);
  // Region cards: two playable demos and four explicitly undesigned locked regions.
  await page.locator("#nav-exploration").click();
  assert.equal(await page.locator(".region-card").count(),6);
  assert.equal(await page.locator(".region-card:not([disabled])").count(),2);
  assert.equal(await page.locator(".region-card[disabled]").count(),4);
  await page.locator("#nav-village").click();
  // Village > warehouse > filter > sort > detail > close.
  await page.locator("#openWarehouse").click();
  assert.equal(await page.locator("#warehouseDialog").evaluate(x=>x.open),true);
  await page.locator('.warehouse-filter[data-category="consumable"]').click();
  assert.equal(await page.locator("#warehouseEmpty").isVisible(),true);
  await page.locator('.warehouse-filter[data-category="material"]').click();
  await page.evaluate(()=>window.PokeTree.techniques.discover("ore",4));
  assert.equal(await page.locator(".warehouse-cell").count(),1);
  await page.locator("#warehouseSort").selectOption("desc");
  await page.locator(".warehouse-cell").click();
  assert.equal(await page.locator("#warehouseDetailDialog").evaluate(x=>x.open),true);
  assert.equal(await page.locator("#warehouseEquip").isVisible(),false);
  await page.locator("#warehouseDetailClose").click();
  await page.locator('#warehouseDialog [data-close-dialog="warehouseDialog"]').click();
  // Pokémon > equip slot > tool-only warehouse > tool detail > equip > back to Pokémon.
  await page.evaluate(()=>window.PokeTree.tools.add("training-band",1));
  await page.locator("#nav-pokemon").click();
  await page.locator("#partySelect button").first().click();
  assert.equal(await page.locator("#pokemonDetailDialog").evaluate(x=>x.open),true);
  await page.locator('button[aria-label="도구 슬롯 1 변경"]').click();
  assert.equal(await page.locator("#warehouseDialog").evaluate(x=>x.open),true);
  assert.equal(await page.locator('.warehouse-filter[data-category="tool"]').getAttribute("aria-pressed"),"true");
  assert.equal(await page.locator('.warehouse-filter[data-category="material"]').isDisabled(),true);
  await page.locator(".warehouse-cell").click();
  await page.locator("#warehouseEquip").click();
  const equipped=await page.evaluate(()=>window.PokeTree.state.roster[0].toolSlots[0]);
  assert.equal(equipped,"training-band");
  await page.waitForFunction(()=>!document.getElementById("warehouseDialog").open);
  assert.equal(await page.locator("#pokemonDetailDialog").evaluate(x=>x.open),true);
  await page.locator("#pokemonDetailDialog [data-close-dialog]").first().click();
  // Workshop > queue > cancellation confirmation > full material refund.
  await page.locator("#nav-village").click();
  await page.evaluate(()=>window.PokeTree.techniques.discover("leaf",4));
  await page.locator("#openWorkshop").click();
  assert.equal(await page.locator("#toolDialog").evaluate(x=>x.open),true);
  const prev=await page.evaluate(()=>window.PokeTree.state.materials.ore);
  await page.locator("#toolRecipes button").first().click();
  assert.equal(await page.evaluate(()=>window.PokeTree.state.toolQueue.length),1);
  await page.locator("#toolQueue button").first().click();
  assert.equal(await page.locator("#toolCancelDialog").evaluate(x=>x.open),true);
  await page.locator("#toolCancelYes").click();
  assert.equal(await page.evaluate(()=>window.PokeTree.state.toolQueue.length),0);
  assert.equal(await page.evaluate(()=>window.PokeTree.state.materials.ore),prev);
  assert.deepEqual(errors,[],"No browser script exceptions in click flows");
  console.log("Chromium smoke: village warehouse filters/modal, Pokémon item equip, workshop queue/cancel PASS");
 }finally{
   if(browser)await browser.close();
   await new Promise(resolve=>srv.close(resolve));
 }
})().catch(err=>{console.error(err);process.exitCode=1;});
