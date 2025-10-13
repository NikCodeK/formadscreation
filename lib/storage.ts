const STORAGE_KEY = 'li-campaign-builder-v1';

export interface PersistedState<T> {
  key?: string;
  defaultValue: T;
}

export function loadState<T>(defaultValue: T, key: string = STORAGE_KEY): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return defaultValue;
    }

    return JSON.parse(stored) as T;
  } catch (error) {
    console.error('Failed to load state from localStorage', error);
    return defaultValue;
  }
}

export function saveState<T>(state: T, key: string = STORAGE_KEY) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to persist state to localStorage', error);
  }
}

export function clearState(key: string = STORAGE_KEY) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear stored state', error);
  }
}

export function getStorageKey() {
  return STORAGE_KEY;
}
