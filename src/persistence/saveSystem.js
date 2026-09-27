import { SAVE_CONFIG } from "../data/gameData.js";
import { createInitialState } from "../state/createInitialState.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeSaveShape(defaultValue, savedValue) {
  if (Array.isArray(defaultValue)) {
    return Array.isArray(savedValue) ? savedValue : [...defaultValue];
  }

  if (isPlainObject(defaultValue)) {
    const savedObject = isPlainObject(savedValue) ? savedValue : {};
    return Object.fromEntries(
      Object.entries(defaultValue).map(([key, value]) => [
        key,
        mergeSaveShape(value, savedObject[key]),
      ]),
    );
  }

  return savedValue === undefined ? defaultValue : savedValue;
}

export function saveGame(state) {
  const payload = {
    ...state,
    saveVersion: SAVE_CONFIG.SAVE_VERSION,
    time: { ...state.time, lastUpdateAt: Date.now() },
  };
  localStorage.setItem(SAVE_CONFIG.STORAGE_KEY, JSON.stringify(payload));
}

export function migrateSave(rawSave) {
  const defaults = createInitialState();

  if (!rawSave || typeof rawSave !== "object") return defaults;

  // v1 -> v2: 새 필드가 추가되어도 기존 진행도를 보존하며 기본 상태로 보충한다.
  const migrated = mergeSaveShape(defaults, rawSave);
  migrated.saveVersion = SAVE_CONFIG.SAVE_VERSION;
  return migrated;
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_CONFIG.STORAGE_KEY);
  if (!raw) return createInitialState();

  try {
    return migrateSave(JSON.parse(raw));
  } catch (error) {
    console.error("세이브 불러오기 실패:", error);
    return createInitialState();
  }
}

export function resetSave() {
  localStorage.removeItem(SAVE_CONFIG.STORAGE_KEY);
}
