# Stock-Speak (`stock-speak`) — Architectural & Product Decisions Log

> **Rule for All Agents**: This file is the permanent memory of every product, design, and engineering decision taken across all sessions. Whenever the user makes a new choice or changes direction, append a new `ADR-XXX` entry below with the date, context, decision, and consequences. Never delete past entries; mark superseded entries as `[SUPERSEDED by ADR-YYY]`.

---

## ADR-001: Project Naming — "DadaBav (દાદાભાવ)" [SUPERSEDED by ADR-010]
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: The repository started with a placeholder name (`stock-speak`). We wanted a warm, memorable, culturally resonant name tailored for an Indian Gujarati grandpa.
- **Decision**: Name the application **DadaBav (દાદાભાવ)** — combining *Dada* (દાદા = Paternal Grandfather) and *Bhav* (ભાવ = Market Price / Stock Rate in Gujarati & Hindi, as well as affection/respect).
- **Consequences**: PWA title, home screen icon label, and documentation use `DadaBav (દાદાભાવ)`.

---

## ADR-002: Target Stock Market & Free Live Price Source
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: Dada tracks Indian stocks in ₹ INR, and the entire project must stay 100% free of cost while fetching prices down to the exact second.
- **Decision**: Target **Indian Stock Markets (NSE `.NS` and BSE `.BO`)** in `₹ INR`. Use a Cloudflare Worker edge proxy querying Yahoo Finance's `v8/finance/chart` (for live prices) and `v1/finance/search` (for ticker lookup) with `Cache-Control: public, max-age=1`.
- **Consequences**: Zero API subscription cost, sub-second edge response, no CORS issues in the browser, and guaranteed `.NS` / `.BO` symbol validation.

---

## ADR-003: Strict Separation of "Fetch & Speak" vs. Gemini Live AI
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: LLMs can hallucinate numbers or misread prices, which is unacceptable when speaking stock prices to an elderly low-vision user. Furthermore, running a live WebSocket for simple price readout wastes battery and CPU on a ₹10k smartphone.
- **Decision**:
  1. **Core "Fetch & Speak"**: 100% deterministic string templates in Gujarati (`gu-IN`) and Hindi (`hi-IN`) spoken via native `window.speechSynthesis` (with a Cloudflare Worker `/api/tts` audio stream fallback if the phone lacks a local Gujarati voice pack). Zero LLM involvement.
  2. **Gemini Live Thinking Assistant**: Triggered **only** when Dada taps the bottom AI Assistant button (`નવો શેર ઉમેરો / કાઢો`), restricted strictly to tool calls (`search_indian_stock`, `add_stock_to_watchlist`, `propose_remove_stock`).
- **Consequences**: Zero possibility of hallucinated stock prices; instant 0-lag voice output on tap.

---

## ADR-004: Low-Vision Hybrid Main Screen Layout
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: Dada has severe vision loss and can only see bright colors and giant buttons against a dark background.
- **Decision**: Use a pure `#000000` background with:
  1. A **Giant Top "SPEAK ALL" (`બધા ભાવ બોલો`) Button** (`#FFD600` vivid yellow fill, `#000000` text) that reads the entire watchlist sequentially (and turns into a giant Red **STOP** button while speaking).
  2. **Individual Giant High-Contrast Stock Cards** (`#00E676` green border when up, `#FF5252` red border when down) below it so tapping any single card immediately reads just that stock.
  3. A pinned bottom **AI Assistant Button** (`#00E5FF` electric cyan fill).
- **Consequences**: Dada can either listen to everything with one top tap or tap a specific card without complex navigation.

---

## ADR-005: Default Language (Gujarati + Hindi Toggle) & Spoken Format
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: Dada is a native Gujarati speaker who also understands Hindi. Overloading the audio readout with too many metrics (open, high, low, volume) causes cognitive fatigue.
- **Decision**:
  - Default language is **Gujarati (`gu`)**, with an optional 1-tap toggle to **Hindi (`hi`)**.
  - Spoken format announces **Stock Name + Current Price + Rupee Increase/Decrease** (e.g., *"રિલાયન્સ, ભાવ 1450 રૂપિયા, 15 રૂપિયા વધ્યો"*).
  - Price rounding (nearest rupee vs. exact paise/2 decimals) and optional percentage announcement are configurable remotely by the grandson in `/admin`.
- **Consequences**: Clear, natural, 3-second spoken summaries per stock.

---

## ADR-006: Foolproof Stock Removal Confirmation & 30s Auto-Disconnect
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: During a voice conversation with Gemini Live, background noise or speech misrecognition could accidentally delete one of Dada's stocks, or leave the microphone open indefinitely.
- **Decision**:
  - Removing a stock requires either explicit verbal confirmation or tapping a full-screen **Giant GREEN (`હા, કાઢી નાખો` / YES) / Giant RED (`ના, રહેવા દો` / NO)** confirmation overlay.
  - Gemini Live automatically disconnects after **30 seconds of silence** (configurable in `/admin`) or upon completing the requested watchlist edit.
- **Consequences**: Prevents accidental stock deletions and prevents battery/CPU drain.

---

## ADR-007: Zero-Framework Vanilla TypeScript Stack & Starter Blue-Chip Watchlist
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: Dada's ₹10k smartphone lags even on the basic YouTube app. Heavy JS frameworks add unnecessary parse/hydration/VDOM overhead.
- **Decision**:
  - Build the frontend with **Zero-Framework Vanilla TypeScript + Vite + Pure CSS** (`< 10KB` gzipped bundle), deployed alongside the API on a single Cloudflare Worker with Static Assets.
  - Seed the default watchlist with 7 Indian blue-chip stocks: **Reliance (`RELIANCE.NS`), TCS (`TCS.NS`), HDFC Bank (`HDFCBANK.NS`), SBI (`SBIN.NS`), Tata Motors (`TMPV.NS`), ITC (`ITC.NS`), and L&T (`LT.NS`)**.
- **Consequences**: Instantaneous cold boot (`< 50ms` JS execution) and 60fps scrolling on budget hardware.

---

## ADR-008: Remote Caregiver Portal (`/admin`) & Fine-Tuning Settings
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: The grandson lives ~100km away from Dada. If Dada wants a setting changed (e.g., speaking exact paise vs. rounded rupees, speech speed, adding/fixing a stock, or if Google deprecates a Gemini Live model ID), the grandson needs to fix it remotely without touching Dada's phone or redeploying code.
- **Decision**:
  - Build a dedicated **Caregiver Portal & Settings page at `/admin`** backed by Cloudflare KV (`config:main` and `watchlist:main`).
  - Include remote controls for: Watchlist items & Gujarati/Hindi phonetic spellings, Price Rounding (`round` / `exact_paise` / `smart`), Percentage readout toggle, Speech Rate (`0.6x`–`1.1x`), TTS Engine override (`auto` / `native_only` / `edge_tts_only`), Gemini Live enable/disable switch, **editable Gemini Live Model ID**, and a `configVersion` counter that forces Dada's phone to sync fresh settings on boot.
- **Consequences**: 100% remote maintainability from anywhere via `/admin`.

---

## ADR-009: Zero-Friction Security Against Bots & Scrapers
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: The app uses free tiers (Cloudflare Workers/KV + Google AI Studio). Publicly exposed endpoints could be abused by random bots or web scrapers, exhausting free quotas. However, Dada cannot be asked to log in or remember passwords.
- **Decision**:
  1. **Magic Setup Link for Dada (`/?setup=<DADA_DEVICE_SECRET>`)**: Opened once during initial setup (or via WhatsApp link), persists `X-Dada-Key` in `localStorage` + a 10-year cookie, and strips the query string from the URL. Dada never sees a login screen.
  2. **Caregiver PIN (`ADMIN_PIN`) for `/admin`**: Protects all settings changes and acts as an emergency 1-step unlock code on Dada's phone if his browser storage is ever wiped.
  3. **Edge Rate Limiting**: Per-IP rate limiting inside the Cloudflare Worker (`60 req/min` for quotes, `10 req/min` for Gemini session, `5 failed auths/10min` lockout).
- **Consequences**: Protects free-tier quotas from bots and scrapers with zero daily friction for Dada.

---

## ADR-010: Rename Project to "stock-speak" (Stock-Speak)
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: User requested reverting/keeping the project name as `stock-speak` across the codebase, docs, and Cloudflare deployment.
- **Decision**: Rename the application, Cloudflare Worker, KV binding (`STOCK_SPEAK_KV`), and PWA title back to **Stock-Speak (`stock-speak`)**.
- **Consequences**: Supersedes `ADR-001`. All configs, manifests, and docs use `stock-speak` / `Stock-Speak`.

---

## ADR-011: English Stock Display Names
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: Maintaining custom Gujarati/Hindi display translations for every stock added via search or voice is unnecessary overhead.
- **Decision**: Display all stock names on `/` and in `/admin` in **English (`nameEn`)**, with a single English display name field per stock in `/admin`.
- **Consequences**: Simpler watchlist management and zero manual translation burden when adding new stocks.

---

## ADR-012: Gemini Live On-Demand Live Price Lookup Tool (`get_live_stock_price`)
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: Dada may ask Gemini Live for the current price of any Indian stock (even ones not on his watchlist). Allowing Gemini to guess from memory would risk hallucinations.
- **Decision**: Add a strict `get_live_stock_price` tool in `src/gemini-live.ts` that resolves the ticker via `/api/search`, fetches the exact real-time NSE/BSE quote via `/api/quotes`, and returns verified numbers for Gemini to speak in Gujarati or Hindi.
- **Consequences**: Dada can ask for any stock's live price conversationally without hallucinated numbers.

---

## ADR-013: 100% Conversational Voice Confirmation for Stock Removal
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: Dada has severe vision loss and cannot read the screen or see modal buttons. Displaying an on-screen dialog asking him to press Green YES / Red NO breaks the accessibility and voice-first experience.
- **Decision**: Remove on-screen modal dialogs from the voice flow. Stock removal is handled 100% conversationally through Gemini Live: Gemini Live verbally asks Dada for confirmation (*"દાદા, શું તમે સાચે જ [Stock] તમારા લિસ્ટમાંથી કાઢી નાખવા માંગો છો? હા કે ના બોલો"*), listens for his verbal reply, and either removes the stock upon verbal affirmation ("હા" / "yes") or keeps it upon rejection ("ના" / "no") with warm spoken confirmation.
- **Consequences**: Zero screen dependency for Dada; complete voice autonomy for visually impaired users.

---

## ADR-014: Native Gemini Live (`models/gemini-3.8-live`) & Removal of Synthetic Script/Chime Bridges
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: Attempting to force `gemini-3.8-live-extended-thinking` with synthetic text-turn injections, repeating 1.8-second chimes, and browser TTS fallbacks caused chaos: robotic hardcoded phrases, audio feedback loops, double-speaking, and WebSocket socket reset errors.
- **Decision**: Use `models/gemini-3.8-live` as the default model. It natively handles real-time audio-to-audio dialogue and dispatches tools (`get_live_stock_price`, `add_stock_to_watchlist`, `remove_stock_from_watchlist`) in <1 second. Strip out repeating chimes, hardcoded script injection prompts, and browser TTS fallbacks. Mute mic during model audio playback to prevent acoustic echo loops.
- **Consequences**: Restores warm, human, unscripted conversational flow where decisions and price lookups happen naturally through dialogue.

---

## ADR-015: Two Full-Screen Action Buttons on Dada View (No Watchlist Cards)
- **Date**: 2026-11-12
- **Status**: Accepted
- **Context**: Dada has severe vision loss and cannot read individual stock cards on screen. Rendering the watchlist on `/` added visual clutter and took screen space away from the two primary voice controls.
- **Decision**: Remove the stock watchlist cards from `/` (`src/ui-dada.ts`) and expand `#btn-speak-all` and `#btn-ai-assistant` (`flex: 1` each inside `.dada-big-buttons`) to fill the entire viewport. Keep `state.watchlist` and quote syncing in the backend, Dada's audio state, and the `/admin` portal.
- **Consequences**: Supersedes the card-based layout in `ADR-004`. Dada has two unmistakable half-screen touch targets while caregivers still manage the watchlist in `/admin`.
