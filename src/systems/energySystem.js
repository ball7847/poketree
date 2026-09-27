export function addEnergy(state, type, amount, source, phase) {
  if (!Number.isFinite(amount) || amount <= 0) return;

  state.resources.energy[type] = (state.resources.energy[type] ?? 0) + amount;
  state.stats.totalEnergy[type] = (state.stats.totalEnergy[type] ?? 0) + amount;

  if (source === "natural") {
    state.stats.naturalEnergy[type] = (state.stats.naturalEnergy[type] ?? 0) + amount;
    const phaseStats =
      phase === "day"
        ? state.stats.daytimeNaturalEnergy
        : state.stats.nighttimeNaturalEnergy;
    phaseStats[type] = (phaseStats[type] ?? 0) + amount;
  }

  if (source === "pokemon") {
    state.stats.pokemonEnergy[type] = (state.stats.pokemonEnergy[type] ?? 0) + amount;
    const phaseStats =
      phase === "day"
        ? state.stats.daytimePokemonEnergy
        : state.stats.nighttimePokemonEnergy;
    phaseStats[type] = (phaseStats[type] ?? 0) + amount;
  }
}
