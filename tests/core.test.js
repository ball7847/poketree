import { createInitialState } from "../src/state/createInitialState.js";
import { getGrowthCost } from "../src/systems/growthSystem.js";
import { calculateNaturalProductionPerSecond, calculatePokemonProductionPerSecond } from "../src/systems/productionSystem.js";
import { settleEligiblePokemon } from "../src/systems/pokemonSystem.js";
import { getEcosystemExpansionCost } from "../src/systems/upgradeSystem.js";
import { getTreeDevelopmentCost } from "../src/systems/treeDevelopmentSystem.js";
import { rollWeatherAtNewDay } from "../src/systems/weatherSystem.js";
import { migrateSave } from "../src/persistence/saveSystem.js";

function close(actual, expected, epsilon = 1e-9) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const growth0 = getGrowthCost(0);
close(growth0.grass, 2);
close(growth0.fire, 1);
close(growth0.water, 1);
close(getGrowthCost(1).grass, 2.6);

const day = createInitialState(0);
day.time.totalElapsedSeconds = 0;
let natural = calculateNaturalProductionPerSecond(day);
close(natural.grass, 0.2);
close(natural.fire, 0.2);
close(natural.water, 0);

const night = createInitialState(0);
night.time.totalElapsedSeconds = 30;
natural = calculateNaturalProductionPerSecond(night);
close(natural.grass, 0.2);
close(natural.fire, 0);
close(natural.water, 0.2);

const starter = createInitialState(0);
starter.resources.energy.grass = 100;
settleEligiblePokemon(starter);
assert(starter.pokemon.settled.includes("bulbasaur"), "이상해씨 정착 실패");
close(calculatePokemonProductionPerSecond(starter).grass, 2);

const owl = createInitialState(0);
owl.pokemon.settled = ["rattata", "hoothoot"];
owl.resources.unlockedEnergyTypes.push("normal");
owl.upgrades.ecosystemExpansion = 1;
owl.time.totalElapsedSeconds = 30;
close(calculatePokemonProductionPerSecond(owl).normal, 2);

const sunny = createInitialState(0);
sunny.weather.current = "sunny";
natural = calculateNaturalProductionPerSecond(sunny);
close(natural.grass, 0.4);
close(natural.fire, 0.4);

const rain = createInitialState(0);
rain.time.totalElapsedSeconds = 0;
rain.weather.current = "rain";
natural = calculateNaturalProductionPerSecond(rain);
close(natural.water, 0.4);

const broad = createInitialState(0);
broad.progression.growth = 30;
broad.upgrades.treeDevelopment.broadLeaves = 1;
natural = calculateNaturalProductionPerSecond(broad);
close(natural.grass, 3.2 * 3.66);
close(natural.fire, 3.2 * 3.66);

close(getEcosystemExpansionCost(0).normal, 300);
close(getEcosystemExpansionCost(1).normal, Math.pow(300, 1.1));
close(getTreeDevelopmentCost("broadLeaves", 1).grass, 2800);

const weatherRoll = createInitialState(0);
rollWeatherAtNewDay(weatherRoll, (() => {
  const values = [0.01, 0.75];
  return () => values.shift();
})());
assert(weatherRoll.weather.current === "rain", "날씨 동일확률 선택 실패");
close(weatherRoll.weather.remainingSeconds, 300);

const oldSave = {
  saveVersion: 1,
  progression: { growth: 12 },
  resources: { energy: { grass: 9, fire: 8, water: 7 }, unlockedEnergyTypes: ["grass", "fire", "water"] },
};
const migrated = migrateSave(oldSave);
assert(migrated.saveVersion === 2, "세이브 버전 마이그레이션 실패");
assert(migrated.progression.growth === 12, "기존 성장 진행도 보존 실패");
assert(Array.isArray(migrated.weather.unlocked), "신규 날씨 필드 보충 실패");
assert(migrated.stats.totalEnergy.ice === 0, "신규 에너지 통계 필드 보충 실패");

console.log("PokeTree core tests passed");
