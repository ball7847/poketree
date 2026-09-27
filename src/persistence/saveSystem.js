import { SAVE_CONFIG } from "../data/gameData.js";
import { createInitialState } from "../state/createInitialState.js";
import { D, Decimal } from "../core/numberSystem.js";

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function mergeSaveShape(defaultValue, savedValue) {
  if (defaultValue instanceof Decimal) return D(savedValue ?? 0);
  if (Array.isArray(defaultValue)) return Array.isArray(savedValue) ? savedValue : [...defaultValue];

  if (isPlainObject(defaultValue)) {
    const savedObject = isPlainObject(savedValue) ? savedValue : {};
    return Object.fromEntries(
      Object.entries(defaultValue).map(([key, value]) => [
        key, mergeSaveShape(value, savedObject[key]),
      ]),
    );
  }
  return savedValue === undefined ? defaultValue : savedValue;
}

function serializeState(value) {
  if (value instanceof Decimal) return value.toString();
  if (Array.isArray(value)) return value.map(serializeState);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, serializeState(child)]));
  }
  return value;
}

function createPayload(state) {
  const payload = serializeState(state);
  payload.saveVersion = SAVE_CONFIG.SAVE_VERSION;
  payload.time.lastUpdateAt = Date.now();
  return payload;
}

export function saveGame(state) {
  localStorage.setItem(SAVE_CONFIG.STORAGE_KEY, JSON.stringify(createPayload(state)));
}

export function migrateSave(rawSave) {
  const defaults = createInitialState();
  if (!rawSave || typeof rawSave !== "object") return defaults;

  // v1/v2의 Number 값과 v3 이후 문자열 Decimal을 동일한 런타임 Decimal로 복원한다.
  const migrated = mergeSaveShape(defaults, rawSave);
  migrated.saveVersion = SAVE_CONFIG.SAVE_VERSION;
  return migrated;
}

export function exportSave(state) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(createPayload(state)))));
}

export function importSave(encodedSave) {
  const decoded = decodeURIComponent(escape(atob(encodedSave.trim())));
  return migrateSave(JSON.parse(decoded));
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
