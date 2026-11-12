# Stock-Speak (`stock-speak`) — Agent Router

> **Token Budget**: Keep this file `< 500 tokens`. Do NOT add long explanations here; route to the specific doc in `docs/`.

## 1. Mission & Persona
**Stock-Speak** is an ultra-lightweight, zero-lag Progressive Web App (PWA) on Cloudflare Workers + KV built for **Dada (Grandpa)**, who has severe vision loss and uses a budget ₹10k Android smartphone, with a remote caregiver portal for his grandson living 100km away.

## 2. Hard Guardrails (NEVER Violate)
1. **Zero-Framework Frontend**: Use Vanilla TypeScript + Vite + CSS only (`< 10KB` gzipped bundle). No React/Vue/Tailwind runtime overhead.
2. **Zero Hallucination in Price Readout**: Core "Fetch & Speak" MUST use deterministic templates + Web Speech API (`gu-IN` / `hi-IN`) + Worker TTS fallback. **NEVER** use an LLM to read or calculate stock prices.
3. **Low-Vision Ergonomics**: Pure `#000000` background, `#FFD600` / `#00E676` / `#FF5252` high-contrast fills, `>= 28px` bold typography, `>= 96px` touch targets, `6px` solid borders, haptic feedback, zero animations/blurs/shadows.
4. **Foolproof Gemini Live Assistant**: Isolated to an on-demand bottom button. Uses strict tool calling (`search_indian_stock`, `add_stock_to_watchlist`, `propose_remove_stock`), requires Giant GREEN/RED confirmation before removing any stock, and auto-disconnects after 30s of silence.
5. **Zero-Friction Security**: Protect `/api/*` via a one-time URL provisioning secret (`/?setup=<SECRET>`) stored in `localStorage` (`X-Dada-Key` header) so bots cannot abuse free quotas while Dada never sees a login screen.
6. **Remote Caregiver Portal (`/admin`)**: All app settings (paise rounding, speech rate, language, Gemini model string, watchlist, remote reset) live in Cloudflare KV (`config:main` & `watchlist:main`) so changes from `/admin` take effect on Dada's phone automatically.

## 3. Documentation Router
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Stack, Cloudflare Worker endpoints, KV schema, Yahoo Finance NSE/BSE proxy, deterministic TTS pipeline, Gemini Live WebSocket protocol, security model, and implementation blueprint.
- **[DESIGN.md](./DESIGN.md)** — Low-vision color palette, typography, touch targets, Dada's main screen vs. Grandson's `/admin` Caregiver Portal UI specs, and ₹10k phone performance rules.
- **[DECISIONS.md](./DECISIONS.md)** — Chronological ADR log of every product and architectural decision. Update whenever a new decision is made.
- **[CONTEXT-HANDOFF.md](./CONTEXT-HANDOFF.md)** — Session handoff state. **NEVER update unless explicitly prompted by the user at the end of a session.**
