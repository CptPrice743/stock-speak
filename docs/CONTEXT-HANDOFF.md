# Stock-Speak (`stock-speak`) — Session Context Handoff

> [!CAUTION]
> **STRICT RULES FOR ALL AI AGENTS (READ BEFORE TOUCHING THIS FILE)**
> 1. **Trigger-Only Updates**: Do **NOT** update this file automatically during normal coding turns. Update this file **ONLY** when the user explicitly prompts you (e.g., *"update CONTEXT-HANDOFF.md"* or *"wrap up session"*).
> 2. **Anti-Context-Rot Budget (`< 600 Tokens`)**: When updating this file, **OVERWRITE** the state sections below rather than appending endless history logs. Keep the entire file under **600 tokens** so the next agent session can ingest it in 2 seconds without context rot.
> 3. **Decisions Belong in `DECISIONS.md`**: Permanent architectural or product choices must be recorded in [DECISIONS.md](./DECISIONS.md), not buried here.
> 4. **How to Start a New Session**: Any new agent starting work on this repo should read `docs/AGENT.md` first, then this file (`docs/CONTEXT-HANDOFF.md`), and then only the specific sections of `docs/ARCHITECTURE.md` or `docs/DESIGN.md` needed for the current task.

---

## 1. Current Milestone & Status
- **Phase**: Production Deployed & Live via GitHub -> Cloudflare Workers Builds CI/CD.
- **Application Code Status**: All frontend (`src/`), Worker backend (`worker/index.ts`), and docs (`docs/`) are implemented, typechecked, and building cleanly (`npm run typecheck && npm run build`).

## 2. What Was Completed
- **Core App & Worker**: Built full PWA + Cloudflare Worker (`worker/index.ts`) with `STOCK_SPEAK_KV`, Yahoo Finance `.NS`/`.BO` quotes/search, deterministic Gujarati/Hindi TTS (`src/speech.ts`), and `/admin` Caregiver Portal (`src/ui-admin.ts`).
- **Gemini Live Voice Assistant (`src/gemini-live.ts`)**:
  - Default model set to `models/gemini-3.8-live` with natural conversational flow (`ADR-014`).
  - Added `get_live_stock_price`, `add_stock_to_watchlist`, and `remove_stock_from_watchlist` tools (`ADR-012`, `ADR-013`).
- **Dada View Simplification (`src/ui-dada.ts`, `src/styles.css`)**:
  - Removed visible stock watchlist cards and confirmation modals from `/`; replaced with two full-screen action buttons (`#btn-speak-all` and `#btn-ai-assistant`) while keeping watchlist state in KV and `/admin` (`ADR-015`).
- **Cloudflare CI/CD**: Connected GitHub repo to Cloudflare Workers Builds with `STOCK_SPEAK_KV` binding ID in `wrangler.jsonc` and runtime secrets (`GEMINI_API_KEY`, `DADA_DEVICE_SECRET`, `ADMIN_PIN`) in Cloudflare **Runtime variables and secrets**.

## 3. Active Blockers / Open Issues
- None. User is ready to commit and push the latest Dada view simplification (`src/ui-dada.ts`, `src/styles.css`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/CONTEXT-HANDOFF.md`) to trigger auto-deploy.

## 4. Exact Next Steps (If Resuming)
1. If user has not pushed yet, they will commit and `git push` to `main` to trigger Cloudflare Workers auto-deploy.
2. Any future UI/voice tweaks should preserve the zero-GPU-overhead rules in `docs/DESIGN.md` and conversational-only flow in `ADR-013` / `ADR-014`.

## 5. Key Files
- `wrangler.jsonc`, `worker/index.ts`
- `src/ui-dada.ts`, `src/ui-admin.ts`, `src/gemini-live.ts`, `src/speech.ts`, `src/styles.css`
- `docs/AGENT.md`, `docs/DESIGN.md`, `docs/DECISIONS.md` (`ADR-001`–`ADR-015`), `docs/CONTEXT-HANDOFF.md`
