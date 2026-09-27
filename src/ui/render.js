import { ENERGY_TYPES } from "../data/gameData.js";
import { POKEMON } from "../data/pokemonData.js";
import { getGrowthCost, getTreeStage, canGrow } from "../systems/growthSystem.js";
import {
  calculateNaturalProductionPerSecond,
  calculatePokemonProductionPerSecond,
  getBaseNaturalProduction,
} from "../systems/productionSystem.js";
import { getSettlementProgress } from "../systems/pokemonSystem.js";
import { getCycleState } from "../systems/timeSystem.js";

function formatNumber(value) {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) < 1000) return value.toFixed(2).replace(/\.00$/, "");
  return value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function describeCondition(condition) {
  if (condition.kind === "growth") return `성장 ${condition.amount}`;
  if (condition.kind === "currentEnergy") {
    return `${ENERGY_TYPES[condition.type]?.name ?? condition.type} 에너지 ${formatNumber(condition.amount)} 도달`;
  }
  if (condition.kind === "stat") {
    if (condition.path.join(".") === "daytimeNaturalEnergy.grass") {
      return `낮 동안 자연 풀 에너지 누적 ${formatNumber(condition.amount)}`;
    }
    if (condition.path.join(".") === "nighttimePokemonEnergy.normal") {
      return `밤 동안 포켓몬 노말 에너지 누적 ${formatNumber(condition.amount)}`;
    }
  }
  return "조건 확인";
}

function describeEffects(effects) {
  return effects.map((effect) => {
    if (effect.kind === "produce") {
      return `${ENERGY_TYPES[effect.type]?.name ?? effect.type} +${formatNumber(effect.amount)}/s`;
    }
    if (effect.kind === "productionIncrease") {
      const source = effect.source === "natural" ? "자연" : "포켓몬";
      const phase = effect.phase === "day" ? "낮 동안 " : effect.phase === "night" ? "밤 동안 " : "";
      return `${phase}모든 ${source} 에너지 +${formatNumber(effect.amount * 100)}%`;
    }
    return "";
  }).filter(Boolean).join(" · ");
}

export function renderGame(state, root) {
  const stage = getTreeStage(state.progression.growth);
  const cycle = getCycleState(state.time.totalElapsedSeconds);
  const growthCost = getGrowthCost(state.progression.growth);
  const naturalRates = calculateNaturalProductionPerSecond(state);
  const pokemonRates = calculatePokemonProductionPerSecond(state);
  const showPokemon = state.progression.growth >= 15;

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
          ${state.resources.unlockedEnergyTypes.map((type) => {
            const data = ENERGY_TYPES[type];
            return `
              <article class="energy-card">
                <span>${data.name}</span>
                <strong>${formatNumber(state.resources.energy[type])}</strong>
                <small>자연 +${formatNumber(naturalRates[type] ?? 0)}/s${(pokemonRates[type] ?? 0) > 0 ? ` · 포켓몬 +${formatNumber(pokemonRates[type])}/s` : ""}</small>
              </article>
            `;
          }).join("")}
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

      ${showPokemon ? `
        <section class="panel">
          <div class="panel-title-row">
            <div>
              <h2>정착 포켓몬</h2>
              <p>${state.pokemon.settled.length}마리 정착</p>
            </div>
          </div>
          <div class="pokemon-list">
            ${POKEMON.map((pokemon) => {
              const settled = state.pokemon.settled.includes(pokemon.id);
              const progress = getSettlementProgress(state, pokemon.condition);
              return `
                <article class="pokemon-card ${settled ? "settled" : ""}">
                  <div>
                    <strong>${pokemon.name}</strong>
                    <small>${settled ? describeEffects(pokemon.effects) : describeCondition(pokemon.condition)}</small>
                  </div>
                  <span>${settled ? "정착" : `${formatNumber(Math.min(progress, pokemon.condition.amount))} / ${formatNumber(pokemon.condition.amount)}`}</span>
                </article>
              `;
            }).join("")}
          </div>
        </section>
      ` : ""}

      <footer class="footer-actions">
        <button id="save-button" class="secondary">수동 저장</button>
        <span>세이브 v${state.saveVersion}</span>
      </footer>
    </section>
  `;
}
