import { SAVE_CONFIG } from "../data/gameData.js";
import { createInitialState } from "../state/createInitialState.js";

export function saveGame(state) {
  const payload = {
    ...state,
    saveVersion: SAVE_CONFIG.SAVE_VERSION,
    time: {
      ...state.time,
      lastUpdateAt: Date.now(),
    },
  };

  localStorage.setItem(SAVE_CONFIG.STORAGE_KEY, JSON.stringify(payload));
}

function migrateSave(rawSave) {
  if (!rawSave || typeof rawSave !== "object") {
    return createInitialState();
  }

  if (rawSave.saveVersion === SAVE_CONFIG.SAVE_VERSION) {
    return rawSave;
  }

  // 향후 saveVersion별 마이그레이션을 이곳에 순차적으로 추가한다.
  return createInitialState();
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
