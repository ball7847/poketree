import { SAVE_CONFIG } from "./data/gameData.js";
import { loadGame, saveGame, exportSave, importSave, resetSave } from "./persistence/saveSystem.js";
import { performGrowth } from "./systems/growthSystem.js";
import { simulate } from "./systems/gameLoop.js";
import { renderGame } from "./ui/render.js";
import {
  snapshotOfflineState,
  renderOfflineCalculating,
  renderOfflineResult,
} from "./ui/offlineModal.js";
import { buyEcosystemExpansion } from "./systems/upgradeSystem.js";
import { buyTreeDevelopment } from "./systems/treeDevelopmentSystem.js";

const root = document.querySelector("#app");
let state = loadGame();

const LOGIC_TICK_SECONDS = 0.1;
const OFFLINE_MODAL_THRESHOLD_SECONDS = 2;
let previousFrameAt = performance.now();
let logicAccumulator = 0;
let renderAccumulator = 0;
let pointerInteractionActive = false;
let offlineModalOpen = false;
let gameLoopStarted = false;

function nextPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function processOfflineProgress() {
  const now = Date.now();
  const offlineSeconds = Math.max(0, (now - state.time.lastUpdateAt) / 1000);

  if (offlineSeconds < OFFLINE_MODAL_THRESHOLD_SECONDS) {
    simulate(state, offlineSeconds);
    state.time.lastUpdateAt = now;
    renderGame(state, root);
    return;
  }

  const before = snapshotOfflineState(state);
  offlineModalOpen = true;
  renderOfflineCalculating(root, offlineSeconds);
  await nextPaint();

  simulate(state, offlineSeconds);
  state.time.lastUpdateAt = now;
  saveGame(state);
  renderOfflineResult(root, before, state, offlineSeconds);
}

function startGameLoop() {
  if (gameLoopStarted) return;
  gameLoopStarted = true;
  previousFrameAt = performance.now();
  requestAnimationFrame(tick);
}

function tick(frameAt) {
  const deltaSeconds = Math.min((frameAt - previousFrameAt) / 1000, 1);
  previousFrameAt = frameAt;

  if (!offlineModalOpen) {
    logicAccumulator += deltaSeconds;
    while (logicAccumulator >= LOGIC_TICK_SECONDS) {
      simulate(state, LOGIC_TICK_SECONDS);
      logicAccumulator -= LOGIC_TICK_SECONDS;
    }
    state.time.lastUpdateAt = Date.now();

    renderAccumulator += deltaSeconds;
    if (renderAccumulator >= 0.1 && !pointerInteractionActive) {
      renderGame(state, root);
      renderAccumulator = 0;
    }
  }

  requestAnimationFrame(tick);
}

root.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) pointerInteractionActive = true;
});

window.addEventListener("pointerup", () => {
  pointerInteractionActive = false;
});

window.addEventListener("pointercancel", () => {
  pointerInteractionActive = false;
});

root.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || !root.contains(button)) return;

  if (button.id === "offline-close-button") {
    offlineModalOpen = false;
    renderGame(state, root);
    return;
  }

  if (offlineModalOpen) return;

  if (button.id === "grow-button") {
    if (performGrowth(state)) renderGame(state, root);
  }

  if (button.id === "ecosystem-button") {
    if (buyEcosystemExpansion(state)) renderGame(state, root);
  }

  if (button.dataset.treeDevelopment) {
    if (buyTreeDevelopment(state, button.dataset.treeDevelopment)) renderGame(state, root);
  }

  if (button.id === "save-button") saveGame(state);

  if (button.id === "export-button") {
    navigator.clipboard?.writeText(exportSave(state));
  }

  if (button.id === "import-button") {
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

  if (button.id === "reset-button") {
    if (!confirm("현재 진행도를 초기화하시겠습니까?")) return;
    resetSave();
    location.reload();
  }
});

window.addEventListener("beforeunload", () => saveGame(state));
setInterval(() => {
  if (!offlineModalOpen) saveGame(state);
}, SAVE_CONFIG.AUTOSAVE_INTERVAL_MS);

renderGame(state, root);

processOfflineProgress()
  .catch((error) => {
    console.error("오프라인 진행 계산 실패:", error);
    offlineModalOpen = false;
    state.time.lastUpdateAt = Date.now();
    renderGame(state, root);
  })
  .finally(() => {
    startGameLoop();
  });
