import { ENERGY_TYPES } from "../data/gameData.js";
import { D, formatDecimal } from "../core/numberSystem.js";
import { POKEMON_BY_ID } from "../data/pokemonData.js";

export function snapshotOfflineState(state) {
  return {
    energy: Object.fromEntries(
      Object.entries(state.resources.energy).map(([type, value]) => [type, D(value)]),
    ),
    settled: [...state.pokemon.settled],
  };
}

export function renderOfflineCalculating(root, offlineSeconds) {
  root.innerHTML = `
    <div class="offline-overlay" role="dialog" aria-modal="true" aria-labelledby="offline-title">
      <section class="offline-modal">
        <div class="offline-spinner" aria-hidden="true"></div>
        <h2 id="offline-title">오프라인 진행 계산 중</h2>
        <p>${formatDuration(offlineSeconds)} 동안의 진행을 계산하고 있습니다.</p>
      </section>
    </div>
  `;
}

export function renderOfflineResult(root, before, state, offlineSeconds) {
  const gains = state.resources.unlockedEnergyTypes
    .map((type) => ({
      type,
      amount: D(state.resources.energy[type]).minus(before.energy[type] ?? 0),
    }))
    .filter(({ amount }) => amount.gt(0));

  const newlySettled = state.pokemon.settled.filter(
    (id) => !before.settled.includes(id),
  );

  root.innerHTML = `
    <div class="offline-overlay" role="dialog" aria-modal="true" aria-labelledby="offline-title">
      <section class="offline-modal">
        <p class="eyebrow">OFFLINE PROGRESS</p>
        <h2 id="offline-title">오프라인 계산 완료</h2>
        <p class="offline-duration">${formatDuration(offlineSeconds)} 동안 진행되었습니다.</p>

        <div class="offline-results">
          <div>
            <strong>획득 에너지</strong>
            <div class="offline-gain-list">
              ${gains.length ? gains.map(({ type, amount }) => `
                <span>${ENERGY_TYPES[type]?.name ?? type} +${formatDecimal(amount)}</span>
              `).join("") : "<span>획득 없음</span>"}
            </div>
          </div>

          ${newlySettled.length ? `
            <div>
              <strong>새로 정착한 포켓몬</strong>
              <div class="offline-gain-list">
                ${newlySettled.map((id) => `<span>${POKEMON_BY_ID[id]?.name ?? id}</span>`).join("")}
              </div>
            </div>
          ` : ""}
        </div>

        <button id="offline-close-button" autofocus>확인</button>
      </section>
    </div>
  `;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const parts = [];
  if (days) parts.push(`${days}일`);
  if (hours) parts.push(`${hours}시간`);
  if (minutes) parts.push(`${minutes}분`);
  if (rest || parts.length === 0) parts.push(`${rest}초`);
  return parts.join(" ");
}
