import type { AppConfig, AppState, GeminiSessionInfo, QuoteData, SearchMatch, StockItem } from './types';

const DADA_KEY_STORAGE = 'stock_speak_dada_key';
const ADMIN_PIN_STORAGE = 'stock_speak_admin_pin';

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

export function captureSetupKeyFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const setupKey = params.get('setup');
  if (setupKey && setupKey.trim()) {
    saveDadaKey(setupKey.trim());
    params.delete('setup');
    const cleanQuery = params.toString();
    const nextUrl = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '');
    window.history.replaceState({}, '', nextUrl);
  }
}

export function getDadaKey(): string {
  try {
    return localStorage.getItem(DADA_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function saveDadaKey(key: string): void {
  try {
    localStorage.setItem(DADA_KEY_STORAGE, key);
  } catch {
    // Ignore storage quota errors
  }
  document.cookie = `stock_speak_key=${encodeURIComponent(key)}; path=/; max-age=315360000; SameSite=Lax`;
}

export function getAdminPin(): string {
  try {
    return localStorage.getItem(ADMIN_PIN_STORAGE) || sessionStorage.getItem(ADMIN_PIN_STORAGE) || '';
  } catch {
    return '';
  }
}

export function saveAdminPin(pin: string, remember: boolean): void {
  try {
    if (remember) {
      localStorage.setItem(ADMIN_PIN_STORAGE, pin);
    } else {
      localStorage.removeItem(ADMIN_PIN_STORAGE);
      sessionStorage.setItem(ADMIN_PIN_STORAGE, pin);
    }
  } catch {
    // Ignore
  }
}

export function clearAdminPin(): void {
  try {
    localStorage.removeItem(ADMIN_PIN_STORAGE);
    sessionStorage.removeItem(ADMIN_PIN_STORAGE);
  } catch {
    // Ignore
  }
}

async function apiFetch<T>(
  url: string,
  init: RequestInit = {},
  mode: 'dada' | 'admin' = 'dada'
): Promise<T> {
  const headers = new Headers(init.headers);
  if (mode === 'admin') {
    const pin = getAdminPin();
    if (pin) headers.set('X-Admin-Pin', pin);
  } else {
    const dadaKey = getDadaKey();
    const adminPin = getAdminPin();
    if (dadaKey) headers.set('X-Dada-Key', dadaKey);
    else if (adminPin) headers.set('X-Admin-Pin', adminPin);
  }

  const resp = await fetch(url, { ...init, headers });
  if (resp.status === 401 || resp.status === 403) {
    throw new AuthError(`Auth failed (${resp.status})`);
  }
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    let message = errText || `HTTP ${resp.status}`;
    try {
      const parsed = JSON.parse(errText) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      // Non-JSON error body
    }
    throw new Error(message);
  }
  return (await resp.json()) as T;
}

export async function unlockDeviceWithPin(pin: string): Promise<string> {
  const resp = await fetch('/api/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  if (!resp.ok) {
    const data = (await resp.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || 'Wrong PIN');
  }
  const data = (await resp.json()) as { dadaKey: string };
  saveDadaKey(data.dadaKey);
  return data.dadaKey;
}

export function fetchState(mode: 'dada' | 'admin' = 'dada'): Promise<AppState & { role: string }> {
  return apiFetch('/api/state', { method: 'GET' }, mode);
}

export function saveState(
  payload: { watchlist?: StockItem[]; config?: Partial<AppConfig>; resetDefaults?: boolean; bumpVersion?: boolean },
  mode: 'dada' | 'admin' = 'dada'
): Promise<AppState & { role: string }> {
  return apiFetch(
    '/api/state',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    mode
  );
}

export async function fetchQuotes(symbols: string[]): Promise<Record<string, QuoteData>> {
  if (symbols.length === 0) return {};
  const qs = encodeURIComponent(symbols.join(','));
  const data = await apiFetch<{ quotes: Record<string, QuoteData> }>(`/api/quotes?symbols=${qs}`);
  return data.quotes;
}

export async function searchIndianStocks(query: string): Promise<SearchMatch[]> {
  const data = await apiFetch<{ matches: SearchMatch[] }>(
    `/api/search?q=${encodeURIComponent(query)}`
  );
  return data.matches;
}

export function requestGeminiSession(): Promise<GeminiSessionInfo> {
  return apiFetch('/api/gemini-session', { method: 'POST' });
}

export function fetchSetupLink(): Promise<{ setupPath: string }> {
  return apiFetch('/api/admin/setup-link', { method: 'GET' }, 'admin');
}

export async function fetchTtsAudioUrl(
  lang: 'gu' | 'hi',
  text: string,
  signal?: AbortSignal
): Promise<string> {
  const headers = new Headers();
  const dadaKey = getDadaKey();
  const adminPin = getAdminPin();
  if (dadaKey) headers.set('X-Dada-Key', dadaKey);
  else if (adminPin) headers.set('X-Admin-Pin', adminPin);

  const resp = await fetch(`/api/tts?lang=${lang}&text=${encodeURIComponent(text)}`, {
    headers,
    signal,
  });
  if (!resp.ok) throw new Error('Edge TTS failed');
  const blob = await resp.blob();
  return URL.createObjectURL(blob);
}
