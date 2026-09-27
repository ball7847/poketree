import { D } from "../core/numberSystem.js";

export function addEnergy(state, type, amount, source, phase) {
  const gain = D(amount);
  if (!gain.isFinite() || gain.lte(0)) return;

  state.resources.energy[type] = D(state.resources.energy[type]).plus(gain);
  state.stats.totalEnergy[type] = D(state.stats.totalEnergy[type]).plus(gain);

  if (source === "natural") {
    state.stats.naturalEnergy[type] = D(state.stats.naturalEnergy[type]).plus(gain);
    const phaseStats = phase === "day"
      ? state.stats.daytimeNaturalEnergy
      : state.stats.nighttimeNaturalEnergy;
    phaseStats[type] = D(phaseStats[type]).plus(gain);
  }

  if (source === "pokemon") {
    state.stats.pokemonEnergy[type] = D(state.stats.pokemonEnergy[type]).plus(gain);
    const phaseStats = phase === "day"
      ? state.stats.daytimePokemonEnergy
      : state.stats.nighttimePokemonEnergy;
    phaseStats[type] = D(phaseStats[type]).plus(gain);
  }
}
