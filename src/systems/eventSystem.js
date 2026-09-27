import { POKEMON } from "../data/pokemonData.js";
import { D } from "../core/numberSystem.js";
import {
  calculateNaturalProductionPerSecond,
  calculatePokemonProductionPerSecond,
} from "./productionSystem.js";

function readPath(object, path) {
  return path.reduce((value, key) => value?.[key], object);
}

function secondsToTarget(current, target, rate) {
  const perSecond = D(rate);
  const remaining = D(target).minus(current);
  if (remaining.lte(0)) return 0;
  if (perSecond.lte(0)) return Infinity;
  return remaining.div(perSecond).toNumber();
}

export function getSecondsUntilNextSettlement(state) {
  const natural = calculateNaturalProductionPerSecond(state);
  const pokemon = calculatePokemonProductionPerSecond(state);
  let next = Infinity;

  for (const candidate of POKEMON) {
    if (state.pokemon.settled.includes(candidate.id)) continue;
    const condition = candidate.condition;
    let seconds = Infinity;

    if (condition.kind === "currentEnergy") {
      const rate = D(natural[condition.type]).plus(pokemon[condition.type]);
      seconds = secondsToTarget(state.resources.energy[condition.type], condition.amount, rate);
    }

    if (condition.kind === "stat") {
      const [bucket, type] = condition.path;
      let rate = D(0);
      if (bucket === "daytimeNaturalEnergy") rate = natural[type];
      if (bucket === "nighttimeNaturalEnergy") rate = natural[type];
      if (bucket === "daytimePokemonEnergy") rate = pokemon[type];
      if (bucket === "nighttimePokemonEnergy") rate = pokemon[type];

      const isDayBucket = bucket?.startsWith("daytime");
      const isNightBucket = bucket?.startsWith("nighttime");
      const cyclePosition = state.time.totalElapsedSeconds % 60;
      const isDay = cyclePosition < 30;
      if ((isDayBucket && !isDay) || (isNightBucket && isDay)) rate = D(0);

      seconds = secondsToTarget(readPath(state.stats, condition.path), condition.amount, rate);
    }

    if (seconds > 1e-9 && seconds < next) next = seconds;
  }

  return next;
}
