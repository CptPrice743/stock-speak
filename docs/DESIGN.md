# Stock-Speak (`stock-speak`) — UI/UX & Low-Vision Design System

## 1. Core Design Philosophy
**Stock-Speak** is engineered for two extreme constraints:
1. **Severe Vision Loss (Low Vision)**: Dada can only distinguish ultra-bright, high-saturation colors, thick borders, and giant shapes against a pitch-black background. Standard UI cards, subtle grays, small icons, and multi-column layouts are invisible to him.
2. **₹10k Budget Smartphone Hardware**: Entry-level MediaTek/Snapdragon chips with slow GPUs and limited RAM lag on the standard YouTube app. Every pixel rendered by Stock-Speak must cost **zero GPU compositing overhead**.

---

## 2. Performance & Rendering Rules (₹10k Smartphone Budget)

> [!CAUTION]
> **Strictly Banned CSS & DOM Patterns on Dada's View (`/`)**
> - **NO** `backdrop-filter` or `filter: blur(...)` (causes severe frame drops on budget mobile GPUs).
> - **NO** `box-shadow` or `text-shadow` (use solid `4px`–`6px` borders instead).
> - **NO** CSS gradients, animated spinners, or continuous `@keyframes` loops.
> - **NO** external webfont downloads (`@font-face` / Google Fonts) — use native Android system fonts (`system-ui`, `Noto Sans Gujarati`, `Noto Sans Devanagari`, `sans-serif`) for `0ms` text rendering.
> - **NO** nested scroll containers — use a single native document scroll (`window.scrollY`) with oversized touch targets.

---

## 3. Low-Vision Color Palette (AAA+ Contrast on OLED Black)

All colors are tested against pure `#000000` for maximum luminance contrast:

| Role | Hex Code | Contrast vs `#000000` | Visual Usage |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#000000` | — | Pure OLED black background everywhere on `/` |
| **Card Surface** | `#0A0A0A` | — | Stock card interior fill |
| **Primary Action (Speak All)** | `#FFD600` | **14.8 : 1** | Solid Vivid Yellow fill with `#000000` bold text |
| **Positive / Price Up / YES** | `#00E676` | **12.6 : 1** | Solid Emerald Green border & badge when stock is UP |
| **Negative / Price Down / NO** | `#FF5252` | **6.8 : 1** | Solid Coral Red border & badge when stock is DOWN |
| **AI Assistant Button** | `#00E5FF` | **13.3 : 1** | Solid Electric Cyan fill with `#000000` bold text |
| **Primary Text (Stock Name & Price)** | `#FFFFFF` | **21.0 : 1** | Pure White ultra-bold text |
| **Active / Speaking Highlight** | `#FFD600` | **14.8 : 1** | `8px solid #FFD600` outline on the stock currently being spoken |

---

## 4. Typography & Touch Target Scale

- **Font Stack**: `system-ui, -apple-system, "Noto Sans Gujarati", "Noto Sans Devanagari", Roboto, sans-serif`
- **Numeric Alignment**: `font-variant-numeric: tabular-nums` so live numbers never jitter horizontally.
- **Minimum Sizes on Dada's Screen (`/`)**:
  - **Giant "SPEAK ALL" Button Text**: `36px` (`2.25rem`), `font-weight: 900`
  - **Stock Name (`રિલાયન્સ`)**: `34px` (`2.125rem`), `font-weight: 800`, line-height `1.2`
  - **Live Stock Price (`₹1,450`)**: `48px` (`3.0rem`), `font-weight: 900`
  - **Price Change Pill (`▲ ₹15 વધ્યો`)**: `28px` (`1.75rem`), `font-weight: 800`, solid `#00E676` (up) or `#FF5252` (down) background with `#000000` text
  - **Minimum Button / Card Height**: `110px` (`96px` absolute minimum for top utility buttons)
  - **Border Thickness**: `5px solid` default; `8px solid #FFD600` when actively speaking
  - **Vertical Spacing Between Cards**: `20px` solid `#000000` gap to prevent accidental adjacent taps

---

## 5. Dada's Screen Layout (`/`)

```text
+---------------------------------------------------+
| [             ગુજરાતી → हिंदी (optional)           ] |
+---------------------------------------------------+
|                                                   |
|                                                   |
|           [ 🔊 બધા ભાવ બોલો (SPEAK ALL) ]          |
|         Solid #FFD600 Yellow Fill, flex: 1        |
|                                                   |
|                                                   |
+---------------------------------------------------+
|                                                   |
|                                                   |
|        [ 🎙️ નવો શેર ઉમેરો / કાઢો (AI) ]           |
|          Solid #00E5FF Cyan Fill, flex: 1         |
|                                                   |
|                                                   |
+---------------------------------------------------+
|              Caregiver Portal (/admin)            |
+---------------------------------------------------+
```

### 5.1 Tactile & Audio Feedback Rules
1. **Haptic Pulse**: Every tap on any button triggers `navigator.vibrate(55)` immediately.
2. **Active Speaking State**:
   - While "SPEAK ALL" is running, the top yellow button changes text to **`⏹️ રોકો (STOP)`** with a bright `#FF5252` Red background so Dada can stop the voice at any second by tapping the top half of his screen.
3. **100% Conversational Voice Flow**:
   - No stock cards or on-screen confirmation modals are rendered on `/`. The watchlist remains in the backend (`/api/state` + KV) and in `/admin` for caregiver editing and for "SPEAK ALL" and Gemini Live.

---

## 6. Grandson's Remote Caregiver Portal (`/admin`)

The `/admin` route is designed for **you (the grandson)** on your phone or laptop so you can manage Dada's app from 100km away whenever he calls you. It uses a clean, dark, mobile-friendly dashboard UI.

### 6.1 Caregiver Portal Features & Sections
1. **Quick Status & Live Preview Bar**:
   - Shows `Config Version` (e.g., `v12`), last updated timestamp, and a **"Test Speak on My Device"** button so you can hear the exact Gujarati/Hindi phrase Dada hears.
2. **Watchlist Manager (Add / Remove / Reorder)**:
   - Live NSE/BSE search bar (`/api/search?q=...`) that auto-populates English, Gujarati (`nameGu`), and Hindi (`nameHi`) names.
   - Edit the Gujarati/Hindi phonetic spelling of any stock (in case TTS pronounces an acronym weirdly, you can tweak `એલ એન્ડ ટી` right from your phone!).
   - Move stocks Up/Down so Dada's favorite stocks are always at the very top.
   - One-tap delete or "Restore Default Blue-Chip List".
3. **Voice & Price Readout Settings**:
   - **Default Language**: `Gujarati (ગુજરાતી)` vs `Hindi (हिंदी)`
   - **Show Language Toggle on Dada's Screen**: `ON / OFF` (turn `OFF` if Dada accidentally taps the language switch)
   - **Price Rounding Mode**:
     - `Nearest Rupee (₹1450)` — *Recommended for clarity*
     - `Exact Paise / 2 Decimals (₹1450.25 -> 1450 રૂપિયા 25 પૈસા)`
     - `Smart (Round >= ₹100, Exact Paise < ₹100)`
   - **Also Speak Percentage Change (`%`)**: `ON / OFF`
   - **Speech Speed (`speechRate`)**: Slider from `0.6x` (Slow) to `1.1x` (Fast), default `0.85x`.
   - **Pause Between Stocks (`pauseBetweenStocksMs`)**: `500ms` to `2500ms`, default `1200ms`.
   - **TTS Engine Override**: `Auto (Native -> Edge Fallback)` | `Native Web Speech Only` | `Cloudflare Edge TTS Stream Only`.
4. **Gemini Live AI Settings (Future-Proofing)**:
   - **Enable AI Assistant Button on Dada's Screen**: `ON / OFF` (if Gemini acts up or Dada gets confused, you can disable the button remotely in 2 seconds).
   - **Gemini Live Model ID**: Editable text input + preset dropdown (e.g., `models/gemini-2.0-flash-exp`, `models/gemini-2.5-flash-native-audio`, or any future Gemini 3.8 Live Thinking model string) so if Google deprecates an endpoint, you just type the new model name and hit Save—no code deployment needed!
   - **Voice Preset**: `Puck` | `Aoede` | `Kore` | `Charon` | `Fenrir`.
   - **Require Giant Green/Red Confirmation on Stock Removal**: `ON / OFF`.
   - **Silence Auto-Disconnect Timeout**: `15s` / `30s` / `60s`.
5. **Remote Troubleshooting & Setup Links**:
   - **"Copy Dada's One-Tap Setup Link"**: Generates the `https://<domain>/?setup=<DADA_DEVICE_SECRET>` link to send to Dada on WhatsApp.
   - **"Force Refresh Dada's Phone Cache"**: Bumps `configVersion` and clears any stale local state on Dada's next app open.
