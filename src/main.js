import { SAVE_CONFIG } from "./data/gameData.js";
import { loadGame, saveGame, exportSave, importSave, resetSave } from "./persistence/saveSystem.js";
import { performGrowth } from "./systems/growthSystem.js";
import { simulate } from "./systems/gameLoop.js";
import { renderGame } from "./ui/render.js";
import { buyEcosystemExpansion } from "./systems/upgradeSystem.js";
import { buyTreeDevelopment } from "./systems/treeDevelopmentSystem.js";

const root = document.querySelector("#app");
let state = loadGame();

const now = Date.now();
const offlineSeconds = Math.max(0, (now - state.time.lastUpdateAt) / 1000);
simulate(state, offlineSeconds);
state.time.lastUpdateAt = now;

let previousFrameAt = performance.now();
let renderAccumulator = 0;

function tick(frameAt) {
  const deltaSeconds = Math.min((frameAt - previousFrameAt) / 1000, 1);
  previousFrameAt = frameAt;

  simulate(state, deltaSeconds);
  state.time.lastUpdateAt = Date.now();

  renderAccumulator += deltaSeconds;
  if (renderAccumulator >= 0.1) {
    renderGame(state, root);
    renderAccumulator = 0;
  }

  requestAnimationFrame(tick);
}

root.addEventListener("click", (event) => {
  if (event.target.id === "grow-button") {
    if (performGrowth(state)) renderGame(state, root);
  }

  if (event.target.id === "ecosystem-button") {
    if (buyEcosystemExpansion(state)) renderGame(state, root);
  }

  if (event.target.dataset.treeDevelopment) {
    if (buyTreeDevelopment(state, event.target.dataset.treeDevelopment)) renderGame(state, root);
  }

  if (event.target.id === "save-button") saveGame(state);

  if (event.target.id === "export-button") {
    navigator.clipboard?.writeText(exportSave(state));
  }

  if (event.target.id === "import-button") {
    const encoded = prompt("세이브 문자열을 붙여넣으세요.");
    if (!encoded) return;
    try {
      state = importSave(encoded);
      saveGame(state);
      renderGame(state, root);
    } catch {
      alert("올바른 세이브 데이터가 아닙니다.");
    }
  }

  if (event.target.id === "reset-button") {
    if (!confirm("현재 진행도를 초기화하시겠습니까?")) return;
    resetSave();
    location.reload();
  }
});

window.addEventListener("beforeunload", () => saveGame(state));
setInterval(() => saveGame(state), SAVE_CONFIG.AUTOSAVE_INTERVAL_MS);

renderGame(state, root);
requestAnimationFrame(tick);
