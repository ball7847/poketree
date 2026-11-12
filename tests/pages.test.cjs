// Node.js 22+ — run after bash scripts/prepare-pages.sh
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"../_site");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("Pages artifact includes required entry points and legacy redirect",()=>{
  for(const p of ["index.html","game/index.html","game/style.css","game/game.js","게임/index.html",".nojekyll","deploy-revision.txt"]){
    assert.ok(fs.existsSync(path.join(root,p)),`Missing Pages file: ${p}`);
  }
  assert.match(read("index.html"),/\.\/game\//);
  assert.match(read("게임/index.html"),/\.\.\/game\/index\.html/);
});
test("All local game JS/CSS references resolve inside artifact",()=>{
  const html=read("game/index.html");
  const urls=[...html.matchAll(/(?:src|href)="(\.\/[^"]+\.(?:js|css))"/g)].map(x=>x[1]);
  assert.ok(urls.length>0,"No assets found");
  for(const url of urls){
    const dest=path.resolve(root,"game",url);
    assert.ok(dest.startsWith(path.resolve(root,"game")+path.sep),"Asset escapes game directory");
    assert.ok(fs.existsSync(dest),`Broken asset reference: ${url}`);
  }
});
