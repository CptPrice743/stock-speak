import {
  AuthError,
  clearAdminPin,
  fetchSetupLink,
  fetchState,
  getAdminPin,
  saveAdminPin,
  saveState,
  searchIndianStocks,
} from './api';
import { DEFAULT_CONFIG, DEFAULT_WATCHLIST } from './defaults';
import { buildStockAnnouncement, SpeechController } from './speech';
import type { AppConfig, SearchMatch, StockItem } from './types';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function mountAdminApp(root: HTMLElement): void {
  let watchlist: StockItem[] = [...DEFAULT_WATCHLIST];
  let config: AppConfig = { ...DEFAULT_CONFIG };
  let searchResults: SearchMatch[] = [];
  let setupUrl = '';
  let statusMsg = '';
  let errorMsg = '';
  let authenticated = Boolean(getAdminPin());
  const speech = new SpeechController();

  async function loadPortalData(): Promise<void> {
    errorMsg = '';
    try {
      const [remote, setup] = await Promise.all([fetchState('admin'), fetchSetupLink()]);
      watchlist = remote.watchlist;
      config = remote.config;
      setupUrl = `${window.location.origin}${setup.setupPath}`;
      authenticated = true;
      render();
    } catch (err) {
      if (err instanceof AuthError) {
        authenticated = false;
        clearAdminPin();
        errorMsg = 'Invalid Admin PIN. Please sign in again.';
      } else {
        errorMsg = err instanceof Error ? err.message : 'Failed to load portal data.';
      }
      render();
    }
  }

  function renderLogin(): void {
    document.title = 'Caregiver Login | Stock-Speak';
    root.innerHTML = `
      <main class="admin-shell admin-login-wrap">
        <div class="admin-card">
          <h1>Stock-Speak Caregiver Portal</h1>
          <p id="pin-help" class="admin-muted">
            Sign in with your Caregiver Admin PIN to manage Dada's watchlist, voice settings, and Gemini Live model from anywhere.
          </p>
          <form id="admin-login-form" class="admin-form">
            <div class="field-group">
              <label for="admin-pin-input">Admin PIN</label>
              <input
                id="admin-pin-input"
                name="pin"
                type="password"
                inputmode="numeric"
                autocomplete="current-password"
                aria-describedby="pin-help login-err"
                required
              />
            </div>
            <div class="checkbox-row">
              <input id="remember-pin" name="remember" type="checkbox" checked />
              <label for="remember-pin">Remember PIN on this device</label>
            </div>
            <p id="login-err" class="admin-err" role="alert">${escapeHtml(errorMsg)}</p>
            <button type="submit" class="admin-btn-primary">Unlock Caregiver Portal</button>
          </form>
          <div class="admin-back-row">
            <a href="/" class="admin-link">← Back to Dada's Screen</a>
          </div>
        </div>
      </main>
    `;

    const form = root.querySelector<HTMLFormElement>('#admin-login-form');
    const pinInput = root.querySelector<HTMLInputElement>('#admin-pin-input');
    const rememberBox = root.querySelector<HTMLInputElement>('#remember-pin');

    if (errorMsg && pinInput) {
      pinInput.setAttribute('aria-invalid', 'true');
    }

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!pinInput) return;
      saveAdminPin(pinInput.value.trim(), Boolean(rememberBox?.checked));
      await loadPortalData();
    });
  }

  function renderDashboard(): void {
    document.title = 'Caregiver Portal | Stock-Speak';

    const watchlistRows = watchlist
      .map(
        (s, idx) => `
        <li class="wl-row" data-idx="${idx}">
          <div class="wl-head">
            <strong>${escapeHtml(s.symbol)}</strong>
            <span class="wl-ex">${escapeHtml(s.exchange)}</span>
            <div class="wl-actions">
              <button type="button" class="wl-move-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''} aria-label="Move ${escapeHtml(s.nameEn)} up">▲</button>
              <button type="button" class="wl-move-down" data-idx="${idx}" ${idx === watchlist.length - 1 ? 'disabled' : ''} aria-label="Move ${escapeHtml(s.nameEn)} down">▼</button>
              <button type="button" class="wl-remove" data-idx="${idx}" aria-label="Remove ${escapeHtml(s.nameEn)}">✕</button>
            </div>
          </div>
          <div class="wl-inputs">
            <div class="field-group">
              <label for="gu-${idx}">Gujarati Name (spoken)</label>
              <input id="gu-${idx}" type="text" class="wl-name-gu" data-idx="${idx}" value="${escapeHtml(s.nameGu)}" />
            </div>
            <div class="field-group">
              <label for="hi-${idx}">Hindi Name (spoken)</label>
              <input id="hi-${idx}" type="text" class="wl-name-hi" data-idx="${idx}" value="${escapeHtml(s.nameHi)}" />
            </div>
          </div>
        </li>
      `
      )
      .join('');

    const searchHtml = searchResults.length
      ? `<ul class="search-results">
          ${searchResults
            .map(
              (m) => `
            <li class="search-row">
              <div>
                <strong>${escapeHtml(m.symbol)}</strong>
                <span class="admin-muted"> — ${escapeHtml(m.shortname)} (${m.exchange})</span>
              </div>
              <button type="button" class="btn-add-match" data-symbol="${escapeHtml(m.symbol)}" data-name="${escapeHtml(m.shortname)}" data-ex="${m.exchange}">
                + Add
              </button>
            </li>
          `
            )
            .join('')}
         </ul>`
      : '';

    root.innerHTML = `
      <div class="admin-shell">
        <header class="admin-header">
          <div>
            <h1>Stock-Speak Caregiver Portal</h1>
            <p class="admin-muted">Config v${config.configVersion} • Updated ${new Date(config.updatedAt).toLocaleString()}</p>
          </div>
          <div class="header-actions">
            <a href="/" class="admin-btn-secondary">Open Dada's View</a>
            <button type="button" id="btn-admin-logout" class="admin-btn-secondary">Logout</button>
          </div>
        </header>

        <main class="admin-main">
          ${statusMsg ? `<p class="admin-status" role="status">${escapeHtml(statusMsg)}</p>` : ''}
          ${errorMsg ? `<p class="admin-err" role="alert">${escapeHtml(errorMsg)}</p>` : ''}

          <section class="admin-card">
            <h2>1. Dada's Phone Setup & Quick Tools</h2>
            <p class="admin-muted">Send this one-time magic link to Dada's phone on WhatsApp, open it once, and tap "Add to Home Screen". No login required for Dada.</p>
            <div class="setup-row">
              <label for="setup-url-box" class="visually-hidden">Magic Setup URL</label>
              <input id="setup-url-box" type="text" readonly value="${escapeHtml(setupUrl)}" />
              <button type="button" id="btn-copy-setup" class="admin-btn-primary">Copy Link</button>
            </div>
            <div class="tool-buttons">
              <button type="button" id="btn-test-voice" class="admin-btn-secondary">🔊 Test Voice on This Device</button>
              <button type="button" id="btn-force-sync" class="admin-btn-secondary">🔄 Force Cache Refresh on Dada's Phone</button>
            </div>
          </section>

          <section class="admin-card">
            <h2>2. Search & Add Indian Stock (NSE / BSE)</h2>
            <search>
              <form id="stock-search-form" class="search-form">
                <label for="stock-search-input" class="visually-hidden">Search stock name or symbol</label>
                <input id="stock-search-input" type="search" placeholder="Search e.g. Infosys, Tata Steel, Wipro..." minlength="2" required />
                <button type="submit" class="admin-btn-primary">Search</button>
              </form>
            </search>
            ${searchHtml}
          </section>

          <section class="admin-card">
            <div class="card-title-row">
              <h2>3. Watchlist Order & Pronunciation (${watchlist.length}/25)</h2>
              <button type="button" id="btn-reset-defaults" class="admin-btn-danger">Restore Blue-Chips</button>
            </div>
            <p class="admin-muted">Tweak Gujarati or Hindi spelling if the phone's voice mispronounces a company name.</p>
            <ul class="wl-list">
              ${watchlistRows}
            </ul>
          </section>

          <form id="settings-form" class="admin-card">
            <h2>4. Voice, Rounding & AI Settings</h2>

            <fieldset class="admin-fieldset">
              <legend>Default Language</legend>
              <div class="radio-row">
                <input type="radio" id="lang-gu" name="language" value="gu" ${config.language === 'gu' ? 'checked' : ''} />
                <label for="lang-gu">Gujarati (ગુજરાતી)</label>
                <input type="radio" id="lang-hi" name="language" value="hi" ${config.language === 'hi' ? 'checked' : ''} />
                <label for="lang-hi">Hindi (हिंदी)</label>
              </div>
            </fieldset>

            <div class="checkbox-row">
              <input type="checkbox" id="cfg-lang-toggle" ${config.showLanguageToggle ? 'checked' : ''} />
              <label for="cfg-lang-toggle">Show GU/HI language switch button on Dada's screen</label>
            </div>

            <fieldset class="admin-fieldset">
              <legend>Price & Paise Rounding</legend>
              <div class="radio-col">
                <div class="radio-item">
                  <input type="radio" id="round-nearest" name="priceRounding" value="round" ${config.priceRounding === 'round' ? 'checked' : ''} />
                  <label for="round-nearest">Nearest Rupee (₹1450.60 → "1451 રૂપિયા") — Easiest to hear</label>
                </div>
                <div class="radio-item">
                  <input type="radio" id="round-exact" name="priceRounding" value="exact_paise" ${config.priceRounding === 'exact_paise' ? 'checked' : ''} />
                  <label for="round-exact">Exact 2 Decimals / Paise (₹1450.60 → "1450 રૂપિયા 60 પૈસા")</label>
                </div>
                <div class="radio-item">
                  <input type="radio" id="round-smart" name="priceRounding" value="smart" ${config.priceRounding === 'smart' ? 'checked' : ''} />
                  <label for="round-smart">Smart (Round above ₹100, exact paise below ₹100)</label>
                </div>
              </div>
            </fieldset>

            <div class="checkbox-row">
              <input type="checkbox" id="cfg-pct" ${config.announcePercentChange ? 'checked' : ''} />
              <label for="cfg-pct">Also speak percentage (%) change</label>
            </div>

            <div class="field-group">
              <label for="cfg-rate">Speech Speed: <span id="rate-val">${config.speechRate.toFixed(2)}x</span></label>
              <input type="range" id="cfg-rate" min="0.60" max="1.20" step="0.05" value="${config.speechRate}" />
            </div>

            <div class="field-group">
              <label for="cfg-pause">Pause Between Stocks: <span id="pause-val">${config.pauseBetweenStocksMs}ms</span></label>
              <input type="range" id="cfg-pause" min="300" max="2500" step="100" value="${config.pauseBetweenStocksMs}" />
            </div>

            <div class="field-group">
              <label for="cfg-tts">Speech Engine</label>
              <select id="cfg-tts">
                <option value="auto" ${config.ttsEngine === 'auto' ? 'selected' : ''}>Auto (Android Native Voice → Edge Audio Fallback)</option>
                <option value="native_only" ${config.ttsEngine === 'native_only' ? 'selected' : ''}>Native Android Web Speech Only</option>
                <option value="edge_tts_only" ${config.ttsEngine === 'edge_tts_only' ? 'selected' : ''}>Cloudflare Edge Audio Stream Only (Use if phone lacks Gujarati voice)</option>
              </select>
            </div>

            <hr class="admin-divider" />

            <h3>Gemini Live AI Assistant Settings</h3>
            <div class="checkbox-row">
              <input type="checkbox" id="cfg-ai-enable" ${config.enableGeminiAssistant ? 'checked' : ''} />
              <label for="cfg-ai-enable">Show AI Assistant button on Dada's screen</label>
            </div>

            <div class="field-group">
              <label for="cfg-gemini-model">Gemini Live Model ID (Hot-swappable if deprecated)</label>
              <input
                type="text"
                id="cfg-gemini-model"
                list="gemini-model-presets"
                value="${escapeHtml(config.geminiModel)}"
                required
              />
              <datalist id="gemini-model-presets">
                <option value="models/gemini-3.8-live-extended-thinking"></option>
                <option value="models/gemini-3.8-live"></option>
                <option value="models/gemini-3.1-flash-live-preview"></option>
                <option value="models/gemini-2.5-flash-native-audio-preview-12-2025"></option>
              </datalist>
            </div>

            <div class="field-group">
              <label for="cfg-gemini-voice">Gemini Voice Preset</label>
              <select id="cfg-gemini-voice">
                ${['Aoede', 'Puck', 'Kore', 'Charon', 'Fenrir']
                  .map((v) => `<option value="${v}" ${config.geminiVoiceName === v ? 'selected' : ''}>${v}</option>`)
                  .join('')}
              </select>
            </div>

            <div class="checkbox-row">
              <input type="checkbox" id="cfg-confirm-remove" ${config.requireRemoveConfirmation ? 'checked' : ''} />
              <label for="cfg-confirm-remove">Require Giant Green/Red confirmation screen before removing a stock</label>
            </div>

            <div class="field-group">
              <label for="cfg-timeout">Auto-disconnect mic after silence (seconds)</label>
              <input type="number" id="cfg-timeout" min="10" max="180" value="${config.geminiSilenceTimeoutSec}" />
            </div>

            <button type="submit" class="admin-btn-primary admin-save-btn">
              💾 Save All Settings & Sync to Dada's Phone
            </button>
          </form>
        </main>
      </div>
    `;

    bindDashboardEvents();
  }

  function syncWatchlistInputsFromDom(): void {
    root.querySelectorAll<HTMLInputElement>('.wl-name-gu').forEach((inp) => {
      const idx = Number(inp.dataset.idx);
      if (watchlist[idx]) watchlist[idx].nameGu = inp.value.trim() || watchlist[idx].nameEn;
    });
    root.querySelectorAll<HTMLInputElement>('.wl-name-hi').forEach((inp) => {
      const idx = Number(inp.dataset.idx);
      if (watchlist[idx]) watchlist[idx].nameHi = inp.value.trim() || watchlist[idx].nameEn;
    });
  }

  function bindDashboardEvents(): void {
    root.querySelector('#btn-admin-logout')?.addEventListener('click', () => {
      clearAdminPin();
      authenticated = false;
      statusMsg = '';
      errorMsg = '';
      render();
    });

    root.querySelector('#btn-copy-setup')?.addEventListener('click', async () => {
      if (!setupUrl) return;
      await navigator.clipboard?.writeText(setupUrl).catch(() => {});
      statusMsg = 'Magic setup link copied! Send it to Dada via WhatsApp.';
      render();
    });

    root.querySelector('#btn-test-voice')?.addEventListener('click', () => {
      const sampleStock = watchlist[0] || DEFAULT_WATCHLIST[0];
      const text = buildStockAnnouncement(
        sampleStock,
        {
          symbol: sampleStock.symbol,
          regularMarketPrice: 1450.65,
          previousClose: 1435.0,
          change: 15.65,
          percentChange: 1.09,
          marketTime: new Date().toISOString(),
          currency: 'INR',
        },
        config
      );
      void speech.speakSingle(text, config.language, config);
    });

    root.querySelector('#btn-force-sync')?.addEventListener('click', async () => {
      try {
        const res = await saveState({ bumpVersion: true }, 'admin');
        config = res.config;
        statusMsg = `Bumped config to v${config.configVersion}. Dada's phone will auto-sync on next load.`;
        render();
      } catch (err) {
        errorMsg = err instanceof Error ? err.message : 'Failed to force refresh';
        render();
      }
    });

    root.querySelector<HTMLFormElement>('#stock-search-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inp = root.querySelector<HTMLInputElement>('#stock-search-input');
      if (!inp) return;
      try {
        searchResults = await searchIndianStocks(inp.value.trim());
        statusMsg = searchResults.length ? '' : 'No matching NSE/BSE equity stocks found.';
        render();
      } catch (err) {
        errorMsg = err instanceof Error ? err.message : 'Search failed';
        render();
      }
    });

    root.querySelectorAll<HTMLButtonElement>('.btn-add-match').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sym = btn.dataset.symbol || '';
        const name = btn.dataset.name || sym;
        const ex = (btn.dataset.ex === 'BSE' ? 'BSE' : 'NSE') as 'NSE' | 'BSE';
        if (!watchlist.some((w) => w.symbol === sym)) {
          watchlist.push({ symbol: sym, exchange: ex, nameEn: name, nameGu: name, nameHi: name });
          statusMsg = `Added ${sym} to draft list. Click "Save All Settings" below to push to Dada's phone.`;
        }
        searchResults = [];
        render();
      });
    });

    root.querySelectorAll<HTMLButtonElement>('.wl-move-up').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncWatchlistInputsFromDom();
        const i = Number(btn.dataset.idx);
        if (i > 0) {
          [watchlist[i - 1], watchlist[i]] = [watchlist[i], watchlist[i - 1]];
          render();
        }
      });
    });

    root.querySelectorAll<HTMLButtonElement>('.wl-move-down').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncWatchlistInputsFromDom();
        const i = Number(btn.dataset.idx);
        if (i < watchlist.length - 1) {
          [watchlist[i + 1], watchlist[i]] = [watchlist[i], watchlist[i + 1]];
          render();
        }
      });
    });

    root.querySelectorAll<HTMLButtonElement>('.wl-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncWatchlistInputsFromDom();
        const i = Number(btn.dataset.idx);
        if (watchlist.length <= 1) {
          errorMsg = 'Keep at least 1 stock in the watchlist.';
          render();
          return;
        }
        watchlist.splice(i, 1);
        render();
      });
    });

    root.querySelector('#btn-reset-defaults')?.addEventListener('click', async () => {
      try {
        const res = await saveState({ resetDefaults: true }, 'admin');
        watchlist = res.watchlist;
        config = res.config;
        statusMsg = `Restored default Indian Blue-Chip watchlist & settings (v${config.configVersion}).`;
        errorMsg = '';
        render();
      } catch (err) {
        errorMsg = err instanceof Error ? err.message : 'Reset failed';
        render();
      }
    });

    const rateSlider = root.querySelector<HTMLInputElement>('#cfg-rate');
    const rateVal = root.querySelector<HTMLElement>('#rate-val');
    rateSlider?.addEventListener('input', () => {
      if (rateVal) rateVal.textContent = `${Number(rateSlider.value).toFixed(2)}x`;
    });

    const pauseSlider = root.querySelector<HTMLInputElement>('#cfg-pause');
    const pauseVal = root.querySelector<HTMLElement>('#pause-val');
    pauseSlider?.addEventListener('input', () => {
      if (pauseVal) pauseVal.textContent = `${pauseSlider.value}ms`;
    });

    root.querySelector<HTMLFormElement>('#settings-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      syncWatchlistInputsFromDom();
      errorMsg = '';
      statusMsg = '';

      const langChecked = root.querySelector<HTMLInputElement>('input[name="language"]:checked')?.value;
      const roundChecked = root.querySelector<HTMLInputElement>('input[name="priceRounding"]:checked')?.value;

      const nextConfig: Partial<AppConfig> = {
        language: langChecked === 'hi' ? 'hi' : 'gu',
        showLanguageToggle: Boolean(root.querySelector<HTMLInputElement>('#cfg-lang-toggle')?.checked),
        priceRounding:
          roundChecked === 'exact_paise' || roundChecked === 'smart' ? roundChecked : 'round',
        announcePercentChange: Boolean(root.querySelector<HTMLInputElement>('#cfg-pct')?.checked),
        speechRate: Number(root.querySelector<HTMLInputElement>('#cfg-rate')?.value || 0.85),
        pauseBetweenStocksMs: Number(root.querySelector<HTMLInputElement>('#cfg-pause')?.value || 1200),
        ttsEngine: (root.querySelector<HTMLSelectElement>('#cfg-tts')?.value as AppConfig['ttsEngine']) || 'auto',
        enableGeminiAssistant: Boolean(root.querySelector<HTMLInputElement>('#cfg-ai-enable')?.checked),
        geminiModel: root.querySelector<HTMLInputElement>('#cfg-gemini-model')?.value.trim() || DEFAULT_CONFIG.geminiModel,
        geminiVoiceName: root.querySelector<HTMLSelectElement>('#cfg-gemini-voice')?.value || 'Aoede',
        requireRemoveConfirmation: Boolean(root.querySelector<HTMLInputElement>('#cfg-confirm-remove')?.checked),
        geminiSilenceTimeoutSec: Number(root.querySelector<HTMLInputElement>('#cfg-timeout')?.value || 30),
      };

      try {
        const res = await saveState({ watchlist, config: nextConfig }, 'admin');
        watchlist = res.watchlist;
        config = res.config;
        statusMsg = `Saved! Synced v${config.configVersion} to Cloudflare KV.`;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        errorMsg = err instanceof Error ? err.message : 'Save failed';
        render();
      }
    });
  }

  function render(): void {
    if (!authenticated) {
      renderLogin();
    } else {
      renderDashboard();
    }
  }

  if (authenticated) {
    void loadPortalData();
  } else {
    render();
  }
}
