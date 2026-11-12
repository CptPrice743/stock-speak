import { DEFAULT_CONFIG, DEFAULT_WATCHLIST } from './defaults';
import { fetchState, saveState } from './api';
import type { AppConfig, AppState, StockItem } from './types';

const LS_WATCHLIST = 'stock_speak_watchlist_v1';
const LS_CONFIG = 'stock_speak_config_v1';
const LS_LANG_OVERRIDE = 'stock_speak_lang_override';

export function loadCachedState(): AppState {
  let watchlist = DEFAULT_WATCHLIST;
  let config = { ...DEFAULT_CONFIG };

  try {
    const rawW = localStorage.getItem(LS_WATCHLIST);
    if (rawW) {
      const parsed = JSON.parse(rawW) as StockItem[];
      if (Array.isArray(parsed) && parsed.length > 0) watchlist = parsed;
    }
    const rawC = localStorage.getItem(LS_CONFIG);
    if (rawC) {
      config = { ...DEFAULT_CONFIG, ...(JSON.parse(rawC) as Partial<AppConfig>) };
    }
    const langOverride = localStorage.getItem(LS_LANG_OVERRIDE);
    if (langOverride === 'gu' || langOverride === 'hi') {
      config.language = langOverride;
    }
  } catch {
    // Fallback to defaults if localStorage is corrupted
  }

  return { watchlist, config };
}

export function persistLocalState(state: AppState): void {
  try {
    localStorage.setItem(LS_WATCHLIST, JSON.stringify(state.watchlist));
    localStorage.setItem(LS_CONFIG, JSON.stringify(state.config));
  } catch {
    // Ignore storage quota errors
  }
}

export function setLocalLanguageOverride(lang: 'gu' | 'hi'): void {
  try {
    localStorage.setItem(LS_LANG_OVERRIDE, lang);
  } catch {
    // Ignore
  }
}

export function clearLocalLanguageOverride(): void {
  try {
    localStorage.removeItem(LS_LANG_OVERRIDE);
  } catch {
    // Ignore
  }
}

export async function syncRemoteState(cached: AppState): Promise<{
  state: AppState;
  versionChanged: boolean;
}> {
  const remote = await fetchState('dada');
  const versionChanged = remote.config.configVersion !== cached.config.configVersion;

  // If Grandson bumped configVersion from /admin, clear Dada's local language override so remote config wins
  if (versionChanged) {
    clearLocalLanguageOverride();
  } else {
    const langOverride = localStorage.getItem(LS_LANG_OVERRIDE);
    if (langOverride === 'gu' || langOverride === 'hi') {
      remote.config.language = langOverride;
    }
  }

  const nextState: AppState = {
    watchlist: remote.watchlist,
    config: remote.config,
  };
  persistLocalState(nextState);
  return { state: nextState, versionChanged };
}

export async function updateWatchlistRemote(watchlist: StockItem[]): Promise<AppState> {
  const updated = await saveState({ watchlist }, 'dada');
  const next: AppState = { watchlist: updated.watchlist, config: updated.config };
  persistLocalState(next);
  return next;
}
