import { createInitialState } from "../src/state/createInitialState.js";
import { D } from "../src/core/numberSystem.js";
import { getGrowthCost, canGrow, performGrowth } from "../src/systems/growthSystem.js";
import { calculateNaturalProductionPerSecond, calculatePokemonProductionPerSecond } from "../src/systems/productionSystem.js";
import { settleEligiblePokemon } from "../src/systems/pokemonSystem.js";
import { getEcosystemExpansionCost } from "../src/systems/upgradeSystem.js";
import { getTreeDevelopmentCost } from "../src/systems/treeDevelopmentSystem.js";
import { rollWeatherAtNewDay } from "../src/systems/weatherSystem.js";
import { migrateSave } from "../src/persistence/saveSystem.js";
import { simulate } from "../src/systems/gameLoop.js";
import { getSecondsUntilNextSettlement } from "../src/systems/eventSystem.js";

function close(actual, expected, epsilon = 1e-9) {
  const difference = D(actual).minus(expected).abs();
  if (difference.gt(epsilon)) {
    throw new Error(`Expected ${expected}, got ${D(actual).toString()}`);
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

const growthReady = createInitialState(0);
growthReady.resources.energy.grass = 2;
growthReady.resources.energy.fire = 1;
growthReady.resources.energy.water = 1;
assert(canGrow(growthReady), "성장 가능 판정 실패");
assert(performGrowth(growthReady), "성장 실행 실패");
assert(growthReady.progression.growth === 1, "성장 수치 증가 실패");
close(growthReady.resources.energy.grass, 0);
close(growthReady.resources.energy.fire, 0);
close(growthReady.resources.energy.water, 0);

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
assert(migrated.saveVersion === 3, "세이브 버전 마이그레이션 실패");
assert(migrated.progression.growth === 12, "기존 성장 진행도 보존 실패");
assert(Array.isArray(migrated.weather.unlocked), "신규 날씨 필드 보충 실패");
assert(D(migrated.stats.totalEnergy.ice).eq(0), "신규 에너지 통계 필드 보충 실패");

const huge = createInitialState(0);
huge.resources.energy.grass = D("1e310");
assert(huge.resources.energy.grass.gt("1e309"), "1e310 초과 Decimal 표현 실패");
huge.resources.energy.grass = huge.resources.energy.grass.plus("1e310");
assert(huge.resources.energy.grass.eq("2e310"), "초거대 수 덧셈 실패");

const decimalSave = migrateSave({
  saveVersion: 3,
  resources: {
    energy: { grass: "1e1000", fire: "2", water: "3" },
    unlockedEnergyTypes: ["grass", "fire", "water"],
  },
});
assert(decimalSave.resources.energy.grass.eq("1e1000"), "Decimal 문자열 세이브 복원 실패");

const boundary = createInitialState(0);
boundary.resources.energy.grass = D(99);
close(getSecondsUntilNextSettlement(boundary), 5);
simulate(boundary, 10, () => 1);
assert(boundary.pokemon.settled.includes("bulbasaur"), "이벤트 경계 정착 실패");
close(boundary.resources.energy.grass, 111);

const longOffline = createInitialState(0);
simulate(longOffline, 86400, () => 1);
close(longOffline.time.totalElapsedSeconds, 86400);
assert(D(longOffline.resources.energy.grass).gt(0), "장기 오프라인 풀 생산 실패");
assert(D(longOffline.resources.energy.fire).gt(0), "장기 오프라인 불꽃 생산 실패");
assert(D(longOffline.resources.energy.water).gt(0), "장기 오프라인 물 생산 실패");

console.log("PokeTree core tests passed");
