// Keeps the previous drawing safe while an AI draft or blank canvas replaces it.
// The editor autosaves the scene on unload, so a restore is done in two steps: set a flag and reload, then copy the stash
// back into the real keys before the editor mounts (applyPendingRestore).

const ELEMENTS_KEY = "excalidraw"; // STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS in ../app_constants.ts
const STATE_KEY = "excalidraw-state"; // STORAGE_KEYS.LOCAL_STORAGE_APP_STATE
const STASH_ELEMENTS = "kovaforge:previous:elements";
const STASH_STATE = "kovaforge:previous:state";
const RESTORE_FLAG = "kovaforge:restore";

function hasElements(raw: string | null) {
  if (!raw) {
    return false;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

export function hasSavedDrawing(): boolean {
  try {
    return hasElements(localStorage.getItem(ELEMENTS_KEY));
  } catch {
    return false;
  }
}

export function stashCurrentDrawing(): void {
  try {
    const elements = localStorage.getItem(ELEMENTS_KEY);
    if (!hasElements(elements)) {
      return;
    }
    localStorage.setItem(STASH_ELEMENTS, elements as string);
    const state = localStorage.getItem(STATE_KEY);
    if (state === null) {
      localStorage.removeItem(STASH_STATE);
    } else {
      localStorage.setItem(STASH_STATE, state);
    }
  } catch {
    // private window or full storage: nothing to keep
  }
}

export function hasStash(): boolean {
  try {
    return hasElements(localStorage.getItem(STASH_ELEMENTS));
  } catch {
    return false;
  }
}

export function requestRestore(): void {
  try {
    sessionStorage.setItem(RESTORE_FLAG, "1");
  } catch {
    return;
  }
  location.reload();
}

export function applyPendingRestore(): void {
  try {
    if (sessionStorage.getItem(RESTORE_FLAG) !== "1") {
      return;
    }
    sessionStorage.removeItem(RESTORE_FLAG);
    const elements = localStorage.getItem(STASH_ELEMENTS);
    if (!hasElements(elements)) {
      return;
    }
    localStorage.setItem(ELEMENTS_KEY, elements as string);
    const state = localStorage.getItem(STASH_STATE);
    if (state !== null) {
      localStorage.setItem(STATE_KEY, state);
    }
  } catch {
    // nothing to do
  }
}
