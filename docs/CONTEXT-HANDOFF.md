# DadaBav (દાદાભાવ) — Session Context Handoff

> [!CAUTION]
> **STRICT RULES FOR ALL AI AGENTS (READ BEFORE TOUCHING THIS FILE)**
> 1. **Trigger-Only Updates**: Do **NOT** update this file automatically during normal coding turns. Update this file **ONLY** when the user explicitly prompts you (e.g., *"update CONTEXT-HANDOFF.md"* or *"wrap up session"*).
> 2. **Anti-Context-Rot Budget (`< 600 Tokens`)**: When updating this file, **OVERWRITE** the state sections below rather than appending endless history logs. Keep the entire file under **600 tokens** so the next agent session can ingest it in 2 seconds without context rot.
> 3. **Decisions Belong in `DECISIONS.md`**: Permanent architectural or product choices must be recorded in [DECISIONS.md](./DECISIONS.md), not buried here.
> 4. **How to Start a New Session**: Any new agent starting work on this repo should read `docs/AGENT.md` first, then this file (`docs/CONTEXT-HANDOFF.md`), and then only the specific sections of `docs/ARCHITECTURE.md` or `docs/DESIGN.md` needed for the current task.

---

## 1. Current Milestone & Status
- **Phase**: Phase 1 Complete (Architecture, Low-Vision Design System, Remote Caregiver Portal Specs, Security Model, and Documentation).
- **Application Code Status**: Ready to begin **Phase 2 (Project Scaffolding & Implementation)** using the exact file blueprint in [ARCHITECTURE.md](./ARCHITECTURE.md).

## 2. What Was Just Completed
- Created `.gitignore` tailored for Vite + Vanilla TypeScript + Cloudflare Wrangler.
- Created `docs/AGENT.md` (`< 500` tokens) as the high-speed agent router and guardrail contract.
- Created `docs/ARCHITECTURE.md` with full specs for the Cloudflare Worker endpoints (`/api/quotes`, `/api/search`, `/api/state`, `/api/tts`, `/api/gemini-session`), `DADABAV_KV` schemas, deterministic Gujarati/Hindi TTS formatting (rounded vs. exact paise), Gemini Live tool declarations, and magic-link security.
- Created `docs/DESIGN.md` detailing the low-vision AAA+ color palette (`#000000`, `#FFD600`, `#00E676`, `#FF5252`, `#00E5FF`), ₹10k smartphone GPU/CPU performance rules, Dada's `/` view, and the Grandson's `/admin` Remote Caregiver Portal.
- Created `docs/DECISIONS.md` capturing `ADR-001` through `ADR-009`.

## 3. Active Blockers / Open Issues
- None. All product, UX, security, and architectural questions are resolved.

## 4. Exact Next Steps for Next Session (Implementation Order)
1. **Scaffold Project Configs**: Create `package.json`, `tsconfig.json`, `vite.config.ts`, `wrangler.jsonc` (with `DADABAV_KV` binding), and `.dev.vars.example`.
2. **Build Cloudflare Worker Backend (`worker/index.ts`)**:
   - Implement `X-Dada-Key` / `X-Admin-Pin` auth middleware + per-IP rate limiter.
   - Implement `GET/PUT /api/state`, `GET /api/quotes` (Yahoo Finance v8 `.NS`/`.BO`), `GET /api/search`, `GET /api/tts` (Google Translate TTS proxy fallback), and `POST /api/gemini-session`.
3. **Build Core Frontend Modules (`src/`)**:
   - `src/types.ts`, `src/defaults.ts` (7 Indian blue-chip stocks with Gujarati & Hindi names + default `AppConfig`), `src/api.ts`, and `src/state.ts`.
   - `src/speech.ts` (deterministic Gujarati/Hindi readout supporting `round`, `exact_paise`, and `smart` rounding + `/api/tts` fallback).
4. **Build Dada's High-Contrast View (`src/ui-dada.ts` & `src/styles.css`)** + **Gemini Live Client (`src/gemini-live.ts`)** with the Giant GREEN/RED removal confirmation modal.
5. **Build Grandson's Caregiver Portal (`src/ui-admin.ts`)** at `/admin` (remote watchlist editor, paise rounding toggle, speech speed slider, editable Gemini Live model string, and magic setup link generator).
6. **PWA & Verification**: Add `public/manifest.webmanifest`, `public/sw.js`, run `npm run build`, and verify gzipped bundle is `< 10KB`.

## 5. Files Modified in Last Session
- `.gitignore`
- `docs/AGENT.md`
- `docs/ARCHITECTURE.md`
- `docs/DESIGN.md`
- `docs/DECISIONS.md`
- `docs/CONTEXT-HANDOFF.md`
