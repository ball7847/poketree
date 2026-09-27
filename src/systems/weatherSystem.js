import { WEATHER, WEATHER_CONFIG } from "../data/weatherData.js";

export function getCurrentWeather(state) {
  return state.weather.current ? WEATHER[state.weather.current] ?? null : null;
}

export function updateWeatherDuration(state, deltaSeconds) {
  if (!state.weather.current) return;

  state.weather.remainingSeconds = Math.max(
    0,
    state.weather.remainingSeconds - deltaSeconds,
  );

  if (state.weather.remainingSeconds <= 0) {
    state.weather.current = null;
    state.weather.remainingSeconds = 0;
  }
}

export function rollWeatherAtNewDay(state, random = Math.random) {
  if (random() >= WEATHER_CONFIG.CHANGE_CHANCE) return false;

  const unlocked = state.weather.unlocked ?? WEATHER_CONFIG.initiallyUnlocked;
  if (unlocked.length === 0) return false;

  const index = Math.floor(random() * unlocked.length);
  state.weather.current = unlocked[index];
  state.weather.remainingSeconds = WEATHER_CONFIG.DURATION_SECONDS;
  return true;
}
