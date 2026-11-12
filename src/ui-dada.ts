import {
  AuthError,
  fetchQuotes,
  getAdminPin,
  getDadaKey,
  unlockDeviceWithPin,
} from './api';
import type { GeminiLiveController } from './gemini-live';
import { buildStockAnnouncement, SpeechController } from './speech';
import {
  loadCachedState,
  setLocalLanguageOverride,
  syncRemoteState,
  updateWatchlistRemote,
} from './state';
import type { AppState, Language, QuoteData, StockItem } from './types';

function formatDisplayPrice(price: number, rounding: AppState['config']['priceRounding']): string {
  const useExact = rounding === 'exact_paise' || (rounding === 'smart' && price < 100);
  return useExact
    ? price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(price).toLocaleString('en-IN');
}

function formatDisplayChange(change: number, rounding: AppState['config']['priceRounding']): string {
  const abs = Math.abs(change);
  const useExact =
    rounding === 'exact_paise' ||
    (rounding === 'smart' && abs < 100) ||
    (abs > 0 && Math.round(abs) === 0);
  return useExact
    ? abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(abs).toLocaleString('en-IN');
}

function vibrateTap(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(55);
  }
}

export function mountDadaApp(root: HTMLElement): void {
  let state = loadCachedState();
  let quotes: Record<string, QuoteData> = {};
  let lastQuoteFetchMs = 0;
  let speakingSymbol: string | null = null;
  let speakingAllActive = false;
  let tapGeneration = 0;
  let needsAuth = !getDadaKey() && !getAdminPin();
  let statusBanner = '';
  let geminiStatus: 'idle' | 'connecting' | 'listening' | 'speaking' | 'error' = 'idle';
  let geminiError = '';
  let pendingConfirmResolve: ((ok: boolean) => void) | null = null;
  let pendingConfirmStock: StockItem | null = null;

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

  function showRemoveConfirmDialog(stock: StockItem): Promise<boolean> {
    pendingConfirmStock = stock;
    render();
    const dialog = root.querySelector<HTMLDialogElement>('#confirm-remove-dialog');
    if (!dialog) return Promise.resolve(false);
    if (!dialog.open) {
      dialog.showModal();
    }
    return new Promise((resolve) => {
      pendingConfirmResolve = resolve;
      const onClose = () => {
        dialog.removeEventListener('close', onClose);
        const choice = dialog.returnValue;
        dialog.returnValue = '';
        pendingConfirmStock = null;
        const r = pendingConfirmResolve;
        pendingConfirmResolve = null;
        r?.(choice === 'yes');
        render();
      };
      dialog.addEventListener('close', onClose);
    });
  }

  function resolveConfirmDialogIfOpen(result: boolean): void {
    const dialog = root.querySelector<HTMLDialogElement>('#confirm-remove-dialog');
    if (dialog && dialog.open) {
      dialog.close(result ? 'yes' : 'no');
    } else if (pendingConfirmResolve) {
      const r = pendingConfirmResolve;
      pendingConfirmResolve = null;
      pendingConfirmStock = null;
      r(result);
    }
  }

  async function handleSpeakAll(): Promise<void> {
    vibrateTap();
    tapGeneration += 1;
    const myGen = tapGeneration;

    if (speakingAllActive || speech.speaking) {
      speakingAllActive = false;
      speakingSymbol = null;
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

    await speech.speakAll(state.watchlist, quotes, state.config, lang(), (sym) => {
      if (myGen !== tapGeneration) return;
      speakingSymbol = sym;
      render();
      if (sym) {
        const card = root.querySelector<HTMLElement>(`[data-symbol="${CSS.escape(sym)}"]`);
        card?.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    });

    if (myGen === tapGeneration) {
      speakingAllActive = false;
      speakingSymbol = null;
      render();
    }
  }

  async function handleSpeakCard(stock: StockItem): Promise<void> {
    vibrateTap();
    tapGeneration += 1;
    const myGen = tapGeneration;

    // Immediately cut off any previous card or SPEAK ALL voice before doing anything async
    speech.stop();
    speakingAllActive = false;

    if (gemini?.isActive) {
      gemini.stop();
      geminiStatus = 'idle';
    }

    speakingSymbol = stock.symbol;
    render();

    await ensureFreshQuotes(false);
    if (myGen !== tapGeneration || speakingAllActive) return;

    const quote = quotes[stock.symbol];
    if (quote) {
      const text = buildStockAnnouncement(stock, quote, state.config, lang());
      await speech.speakSingle(text, lang(), state.config);
    }

    if (myGen === tapGeneration && speakingSymbol === stock.symbol && !speakingAllActive) {
      speakingSymbol = null;
      render();
    }
  }

  function handleLanguageToggle(): void {
    vibrateTap();
    speech.stop();
    speakingAllActive = false;
    speakingSymbol = null;
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
    speakingSymbol = null;

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
      onAddStock: async (newStock) => {
        if (state.watchlist.some((s) => s.symbol === newStock.symbol)) return;
        const nextList = [...state.watchlist, newStock];
        state = await updateWatchlistRemote(nextList);
        render();
        void ensureFreshQuotes(true);
      },
      onRequestRemoveStock: (stock) => showRemoveConfirmDialog(stock),
      onRemoveStockConfirmed: async (symbol) => {
        resolveConfirmDialogIfOpen(false);
        const filtered = state.watchlist.filter((s) => s.symbol !== symbol);
        if (filtered.length > 0 && filtered.length !== state.watchlist.length) {
          state = await updateWatchlistRemote(filtered);
          render();
        }
      },
      onStatusChange: (status, detail) => {
        if (status === 'closed') {
          geminiStatus = 'idle';
        } else if (status === 'error') {
          geminiStatus = 'error';
          geminiError = detail || 'AI Error';
        } else {
          geminiStatus = status;
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

    const cardsHtml = state.watchlist
      .map((stock) => {
        const q = quotes[stock.symbol];
        const displayName = curLang === 'gu' ? stock.nameGu : stock.nameHi;
        const shortTicker = stock.symbol.replace(/\.(NS|BO)$/, '');
        const isSpeakingThis = speakingSymbol === stock.symbol;

        let borderClass = 'card-neutral';
        let priceHtml = '<span class="card-price">...</span>';
        let pillHtml = '<span class="card-pill pill-neutral">—</span>';

        if (q) {
          const isUp = q.change > 0.005;
          const isDown = q.change < -0.005;
          borderClass = isUp ? 'card-up' : isDown ? 'card-down' : 'card-neutral';
          const priceStr = formatDisplayPrice(q.regularMarketPrice, state.config.priceRounding);
          const changeStr = formatDisplayChange(q.change, state.config.priceRounding);
          const dirArrow = isUp ? '▲' : isDown ? '▼' : '•';
          const dirWord =
            curLang === 'gu'
              ? isUp
                ? 'વધ્યો'
                : isDown
                  ? 'ઘટ્યો'
                  : 'સ્થિર'
              : isUp
                ? 'बढ़ा'
                : isDown
                  ? 'गिरा'
                  : 'स्थिर';
          const pillClass = isUp ? 'pill-up' : isDown ? 'pill-down' : 'pill-neutral';
          const pctPart =
            state.config.announcePercentChange && (isUp || isDown)
              ? ` (${Math.abs(q.percentChange).toFixed(1)}%)`
              : '';

          priceHtml = `<span class="card-price">₹${priceStr}</span>`;
          pillHtml = `<span class="card-pill ${pillClass}">${dirArrow} ₹${changeStr} ${dirWord}${pctPart}</span>`;
        }

        return `
          <li class="stock-item">
            <button
              type="button"
              class="stock-card ${borderClass} ${isSpeakingThis ? 'card-speaking' : ''}"
              data-symbol="${stock.symbol}"
            >
              <div class="card-top">
                <span class="card-name">${displayName}</span>
                <span class="card-ticker">${shortTicker}</span>
              </div>
              <div class="card-bottom">
                ${priceHtml}
                ${pillHtml}
              </div>
            </button>
          </li>
        `;
      })
      .join('');

    const confirmTitle = pendingConfirmStock
      ? curLang === 'gu'
        ? `${pendingConfirmStock.nameGu} કાઢી નાખવો છે?`
        : `${pendingConfirmStock.nameHi} हटाना है?`
      : '';

    const yesLabel = curLang === 'gu' ? '✅ હા, કાઢી નાખો (YES)' : '✅ हाँ, हटाएं (YES)';
    const noLabel = curLang === 'gu' ? '❌ ના, રહેવા દો (NO)' : '❌ नहीं, रहने दें (NO)';

    root.innerHTML = `
      <div class="dada-shell">
        <header class="dada-header">
          <button
            type="button"
            id="btn-speak-all"
            class="btn-speak-all ${speakingAllActive ? 'btn-stop' : ''}"
          >
            ${speakBtnLabel}
          </button>
          ${
            state.config.showLanguageToggle
              ? `<button type="button" id="btn-lang-toggle" class="btn-lang" aria-label="Switch language Gujarati or Hindi">
                   ${curLang === 'gu' ? 'ગુજરાતી → हिंदी' : 'हिंदी → ગુજરાતી'}
                 </button>`
              : ''
          }
        </header>

        <main class="dada-main">
          ${statusBanner ? `<p class="status-banner" role="status">${statusBanner}</p>` : ''}
          ${geminiError ? `<p class="status-banner status-err" role="alert">${geminiError}</p>` : ''}
          <ul class="stock-list" aria-label="Stock watchlist">
            ${cardsHtml}
          </ul>
          <div class="caregiver-footer-link">
            <a href="/admin" class="caregiver-link">Caregiver Portal (/admin)</a>
          </div>
        </main>

        ${
          state.config.enableGeminiAssistant
            ? `<footer class="dada-footer">
                 <button
                   type="button"
                   id="btn-ai-assistant"
                   class="btn-ai ${geminiStatus !== 'idle' && geminiStatus !== 'error' ? 'btn-ai-active' : ''}"
                 >
                   ${aiLabel}
                 </button>
               </footer>`
            : ''
        }

        <dialog id="confirm-remove-dialog" class="confirm-dialog" aria-labelledby="confirm-remove-title">
          <h1 id="confirm-remove-title" class="confirm-title">${confirmTitle}</h1>
          <form method="dialog" class="confirm-actions">
            <button type="submit" value="yes" class="confirm-yes">${yesLabel}</button>
            <button type="submit" value="no" class="confirm-no" autofocus>${noLabel}</button>
          </form>
        </dialog>
      </div>
    `;

    root.querySelector('#btn-speak-all')?.addEventListener('click', () => {
      void handleSpeakAll();
    });
    root.querySelector('#btn-lang-toggle')?.addEventListener('click', handleLanguageToggle);
    root.querySelector('#btn-ai-assistant')?.addEventListener('click', () => {
      void handleGeminiToggle();
    });

    root.querySelectorAll<HTMLButtonElement>('.stock-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sym = btn.dataset.symbol;
        const found = state.watchlist.find((s) => s.symbol === sym);
        if (found) void handleSpeakCard(found);
      });
    });

    if (pendingConfirmStock) {
      const dlg = root.querySelector<HTMLDialogElement>('#confirm-remove-dialog');
      if (dlg && !dlg.open) dlg.showModal();
    }
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
