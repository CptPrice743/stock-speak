import {
  AuthError,
  fetchQuotes,
  getAdminPin,
  getDadaKey,
  unlockDeviceWithPin,
} from './api';
import type { GeminiLiveController } from './gemini-live';
import { SpeechController } from './speech';
import {
  loadCachedState,
  setLocalLanguageOverride,
  syncRemoteState,
  updateWatchlistRemote,
} from './state';
import type { Language, QuoteData } from './types';

function vibrateTap(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(55);
  }
}

export function mountDadaApp(root: HTMLElement): void {
  let state = loadCachedState();
  let quotes: Record<string, QuoteData> = {};
  let lastQuoteFetchMs = 0;
  let speakingAllActive = false;
  let tapGeneration = 0;
  let needsAuth = !getDadaKey() && !getAdminPin();
  let statusBanner = '';
  let geminiStatus: 'idle' | 'connecting' | 'listening' | 'working' | 'speaking' | 'error' = 'idle';
  let geminiWorkingDetail = '';
  let geminiError = '';

  const speech = new SpeechController();
  let gemini: GeminiLiveController | null = null;

  const lang = (): Language => state.config.language;

  async function ensureFreshQuotes(force = false): Promise<void> {
    if (needsAuth) return;
    const now = Date.now();
    if (!force && now - lastQuoteFetchMs < 2000 && Object.keys(quotes).length > 0) {
      return;
    }
    try {
      const symbols = state.watchlist.map((s) => s.symbol);
      const fresh = await fetchQuotes(symbols);
      quotes = { ...quotes, ...fresh };
      lastQuoteFetchMs = Date.now();
      statusBanner = '';
      render();
    } catch (err) {
      if (err instanceof AuthError) {
        needsAuth = true;
        render();
      } else {
        statusBanner =
          lang() === 'gu'
            ? 'ભાવ લાવવામાં તકલીફ છે. ફરી પ્રયાસ કરો.'
            : 'भाव लाने में समस्या है। फिर प्रयास करें।';
        render();
      }
    }
  }

  async function handleSpeakAll(): Promise<void> {
    vibrateTap();
    tapGeneration += 1;
    const myGen = tapGeneration;

    if (speakingAllActive || speech.speaking) {
      speakingAllActive = false;
      speech.stop();
      render();
      return;
    }

    if (gemini?.isActive) {
      gemini.stop();
      geminiStatus = 'idle';
    }

    speakingAllActive = true;
    render();
    await ensureFreshQuotes(true);
    if (!speakingAllActive || myGen !== tapGeneration) return;

    await speech.speakAll(state.watchlist, quotes, state.config, lang(), () => {});

    if (myGen === tapGeneration) {
      speakingAllActive = false;
      render();
    }
  }

  function handleLanguageToggle(): void {
    vibrateTap();
    speech.stop();
    speakingAllActive = false;
    const nextLang: Language = lang() === 'gu' ? 'hi' : 'gu';
    state.config.language = nextLang;
    document.documentElement.lang = nextLang;
    setLocalLanguageOverride(nextLang);
    render();
  }

  async function handleGeminiToggle(): Promise<void> {
    vibrateTap();
    speech.stop();
    speakingAllActive = false;

    if (!gemini) {
      const mod = await import('./gemini-live');
      gemini = new mod.GeminiLiveController();
    }

    if (gemini.isActive) {
      gemini.stop();
      geminiStatus = 'idle';
      render();
      return;
    }

    geminiError = '';
    await gemini.start(state.config, lang(), {
      getWatchlist: () => state.watchlist,
      getQuotes: () => quotes,
      onAddStock: async (newStock) => {
        if (state.watchlist.some((s) => s.symbol === newStock.symbol)) return;
        const nextList = [...state.watchlist, newStock];
        state = await updateWatchlistRemote(nextList);
        render();
        void ensureFreshQuotes(true);
      },
      onRemoveStockConfirmed: async (symbol) => {
        const filtered = state.watchlist.filter((s) => s.symbol !== symbol);
        if (filtered.length !== state.watchlist.length) {
          state = await updateWatchlistRemote(filtered);
          render();
        }
      },
      onStatusChange: (status, detail) => {
        if (status === 'closed') {
          geminiStatus = 'idle';
          geminiWorkingDetail = '';
        } else if (status === 'error') {
          geminiStatus = 'error';
          geminiWorkingDetail = '';
          geminiError = detail || 'AI Error';
        } else {
          geminiStatus = status;
          geminiWorkingDetail = status === 'working' && detail ? detail : '';
        }
        render();
      },
    });
  }

  function renderUnlockScreen(): void {
    root.innerHTML = `
      <main class="dada-shell dada-unlock">
        <h1 class="unlock-title">Stock-Speak</h1>
        <p class="unlock-sub" id="unlock-hint">
          કેરગીવર પાસેથી ૬ આંકડાનો પિન નાખો (Enter Caregiver PIN once to activate this phone)
        </p>
        <form id="unlock-form" class="unlock-form">
          <label for="unlock-pin" class="unlock-label">Caregiver PIN</label>
          <input
            id="unlock-pin"
            name="pin"
            type="password"
            inputmode="numeric"
            autocomplete="off"
            aria-describedby="unlock-hint unlock-err"
            required
            class="unlock-input"
            placeholder="••••••"
          />
          <p id="unlock-err" class="unlock-err" role="alert"></p>
          <button type="submit" class="btn-speak-all">ચાલુ કરો / ACTIVATE</button>
        </form>
        <a href="/admin" class="caregiver-link">Caregiver Portal (/admin)</a>
      </main>
    `;

    const form = root.querySelector<HTMLFormElement>('#unlock-form');
    const pinInput = root.querySelector<HTMLInputElement>('#unlock-pin');
    const errEl = root.querySelector<HTMLElement>('#unlock-err');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!pinInput || !errEl) return;
      errEl.textContent = '';
      pinInput.removeAttribute('aria-invalid');
      try {
        await unlockDeviceWithPin(pinInput.value.trim());
        needsAuth = false;
        await bootSync();
      } catch (err) {
        pinInput.setAttribute('aria-invalid', 'true');
        errEl.textContent = err instanceof Error ? err.message : 'Invalid PIN';
        pinInput.focus();
      }
    });
  }

  function render(): void {
    if (needsAuth) {
      renderUnlockScreen();
      return;
    }

    const curLang = lang();
    document.documentElement.lang = curLang;
    document.title = 'Stock-Speak';

    const speakBtnLabel = speakingAllActive
      ? curLang === 'gu'
        ? '⏹️ રોકો (STOP)'
        : '⏹️ रोकें (STOP)'
      : curLang === 'gu'
        ? '🔊 બધા ભાવ બોલો'
        : '🔊 सभी भाव बोलें';

    const aiLabel =
      geminiStatus === 'connecting'
        ? curLang === 'gu'
          ? '⏳ જોડાય છે...'
          : '⏳ जुड़ रहा है...'
        : geminiStatus === 'working'
          ? geminiWorkingDetail ||
            (curLang === 'gu' ? '⏳ શોધું છું...' : '⏳ ढूँढ रहा हूँ...')
          : geminiStatus === 'listening'
            ? curLang === 'gu'
              ? '🎙️ બોલો દાદા... (રોકવા દબાવો)'
              : '🎙️ बोलें दादाजी... (रोकने दबाएं)'
            : geminiStatus === 'speaking'
              ? curLang === 'gu'
                ? '🗣️ સાંભળો... (રોકવા દબાવો)'
                : '🗣️ सुनें... (रोकने दबाएं)'
              : curLang === 'gu'
                ? '🎙️ નવો શેર ઉમેરો / કાઢો'
                : '🎙️ नया शेयर जोड़ें / हटाएं';

    root.innerHTML = `
      <div class="dada-shell">
        ${
          state.config.showLanguageToggle || statusBanner || geminiError
            ? `<header class="dada-header">
                 ${
                   state.config.showLanguageToggle
                     ? `<button type="button" id="btn-lang-toggle" class="btn-lang" aria-label="Switch language Gujarati or Hindi">
                          ${curLang === 'gu' ? 'ગુજરાતી → हिंदी' : 'हिंदी → ગુજરાતી'}
                        </button>`
                     : ''
                 }
                 ${statusBanner ? `<p class="status-banner" role="status">${statusBanner}</p>` : ''}
                 ${geminiError ? `<p class="status-banner status-err" role="alert">${geminiError}</p>` : ''}
               </header>`
            : ''
        }

        <main class="dada-big-buttons">
          <button
            type="button"
            id="btn-speak-all"
            class="btn-speak-all ${speakingAllActive ? 'btn-stop' : ''}"
          >
            ${speakBtnLabel}
          </button>

          ${
            state.config.enableGeminiAssistant
              ? `<button
                   type="button"
                   id="btn-ai-assistant"
                   class="btn-ai ${geminiStatus === 'working' ? 'btn-ai-working' : geminiStatus !== 'idle' && geminiStatus !== 'error' ? 'btn-ai-active' : ''}"
                 >
                   ${aiLabel}
                 </button>`
              : ''
          }
        </main>

        <footer class="caregiver-footer-link">
          <a href="/admin" class="caregiver-link">Caregiver Portal (/admin)</a>
        </footer>
      </div>
    `;

    root.querySelector('#btn-speak-all')?.addEventListener('click', () => {
      void handleSpeakAll();
    });
    root.querySelector('#btn-lang-toggle')?.addEventListener('click', handleLanguageToggle);
    root.querySelector('#btn-ai-assistant')?.addEventListener('click', () => {
      void handleGeminiToggle();
    });
  }

  async function bootSync(): Promise<void> {
    render();
    if (needsAuth) return;
    try {
      const synced = await syncRemoteState(state);
      state = synced.state;
      render();
      await ensureFreshQuotes(true);
    } catch (err) {
      if (err instanceof AuthError) {
        needsAuth = true;
        render();
      }
    }
  }

  // Refresh quotes quietly every 15s while screen is visible
  window.setInterval(() => {
    if (document.visibilityState === 'visible' && !needsAuth && !speakingAllActive) {
      void ensureFreshQuotes(true);
    }
  }, 15_000);

  void bootSync();
}
