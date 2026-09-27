import { ENERGY_TYPES } from "../data/gameData.js";
import { getGrowthCost, getTreeStage, canGrow } from "../systems/growthSystem.js";
import {
  calculateNaturalProductionPerSecond,
  getBaseNaturalProduction,
} from "../systems/productionSystem.js";
import { getCycleState } from "../systems/timeSystem.js";

function formatNumber(value) {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) < 1000) return value.toFixed(2).replace(/\.00$/, "");
  return value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

export function renderGame(state, root) {
  const stage = getTreeStage(state.progression.growth);
  const cycle = getCycleState(state.time.totalElapsedSeconds);
  const growthCost = getGrowthCost(state.progression.growth);
  const naturalRates = calculateNaturalProductionPerSecond(state);

  root.innerHTML = `
    <section class="game-shell">
      <header class="hero">
        <div>
          <p class="eyebrow">POKETREE</p>
          <h1>${stage.name}</h1>
          <p>성장 ${state.progression.growth}</p>
        </div>
        <div class="phase-card">
          <strong>${cycle.isDay ? "낮" : "밤"}</strong>
          <span>다음 전환까지 ${formatNumber(cycle.secondsUntilPhaseChange)}초</span>
          <span>날씨: ${state.weather.current ?? "기본"}</span>
        </div>
      </header>

      <section class="panel">
        <div class="panel-title-row">
          <h2>에너지</h2>
          <span>기본 자연 획득량 ${formatNumber(getBaseNaturalProduction(state))}/s</span>
        </div>
        <div class="energy-grid">
          ${state.resources.unlockedEnergyTypes
            .map((type) => {
              const data = ENERGY_TYPES[type];
              return `
                <article class="energy-card">
                  <span>${data.name}</span>
                  <strong>${formatNumber(state.resources.energy[type])}</strong>
                  <small>자연 +${formatNumber(naturalRates[type] ?? 0)}/s</small>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-title-row">
          <div>
            <h2>성장</h2>
            <p>성장할수록 자연 획득량이 +0.1/s 증가한다.</p>
          </div>
          <button id="grow-button" ${canGrow(state) ? "" : "disabled"}>성장하기</button>
        </div>
        <div class="cost-row">
          <span>풀 ${formatNumber(growthCost.grass)}</span>
          <span>불꽃 ${formatNumber(growthCost.fire)}</span>
          <span>물 ${formatNumber(growthCost.water)}</span>
        </div>
      </section>

      <footer class="footer-actions">
        <button id="save-button" class="secondary">수동 저장</button>
        <span>세이브 v${state.saveVersion}</span>
      </footer>
    </section>
  `;
}
