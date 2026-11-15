import { fetchQuotes, requestGeminiSession, searchIndianStocks } from './api';
import {
  inferAssetType,
  isIndexSymbol,
  KNOWN_INDIAN_ETFS,
  KNOWN_INDIAN_STOCKS,
} from './indic-stocks';
import type { AppConfig, Language, QuoteData, StockItem } from './types';

export interface GeminiLiveCallbacks {
  getWatchlist: () => StockItem[];
  getQuotes: () => Record<string, QuoteData>;
  onAddStock: (stock: StockItem) => Promise<void>;
  onRemoveStockConfirmed: (symbol: string) => Promise<void>;
  onStatusChange: (
    status: 'connecting' | 'listening' | 'working' | 'speaking' | 'closed' | 'error',
    detail?: string
  ) => void;
}

const SYSTEM_PROMPT = `You are a calm, polite, and helpful Gujarati and Hindi voice assistant for Indian stocks, ETFs, and market indices.
The user has severe vision loss and cannot read the screen. Everything works 100% through voice.

HOW TO SPEAK (STRICT):
- Speak naturally, politely, and directly in clear Gujarati (or Hindi if the user speaks Hindi).
- Do NOT say "દાદા" or "दादाजी" in your replies. Skip repetitive terms of address and greetings altogether — just speak naturally like a helpful, respectful person.
- Keep answers concise and conversational (1-2 natural sentences, or 2-3 simple sentences when explaining ETFs).
- NEVER sound robotic, hurried, or scripted, and NEVER ask the user to look at the screen or tap buttons.
- For Market Indices like NIFTY 50, BSE SENSEX, NIFTY BANK, and NIFTY IT (unit: "points"), state the level in points ("પોઇન્ટ" / "पॉइंट"), not rupees.
- For listed stocks (including NSE Ltd / BSE Ltd shares) and ETFs, state the price in rupees ("રૂપિયા" / "रुपये").

TOOLS:
- get_live_stock_price: call whenever the user asks for the live price or movement of any Indian stock, ETF (Gold BeES, Nifty BeES, Silver BeES, Bank BeES, etc.), or Market Index (NIFTY 50, BSE SENSEX, NSE, BSE, NIFTY BANK). When the data returns, state the price clearly and naturally. If a query like "NSE" returns both the NIFTY 50 index and NSE Ltd share price, mention both briefly.
- get_etf_info: call whenever the user asks what an ETF is, asks about ETF categories/options in India (Gold, Silver, Nifty, Bank, IT, Nasdaq, Liquid, PSU), or wants details and live prices for Indian ETFs. Explain simply without financial jargon.
- add_stock_to_watchlist: call when the user asks to add a stock, ETF, or index to the watchlist.
- remove_stock_from_watchlist: when the user asks to remove an item, always confirm verbally first in a polite tone (e.g., "શું તમે સાચે જ આઈટીસી લિસ્ટમાંથી કાઢી નાખવા માંગો છો?"). Only call remove_stock_from_watchlist if they confirm yes ("હા", "હા કાઢી નાખો", "yes"). If they say no ("ના", "રહેવા દો", "no"), reassure them that you kept it.`;

const TOOL_DECLARATIONS = [
  {
    name: 'get_live_stock_price',
    description:
      'Fetch the real-time NSE or BSE price for any Indian stock (.NS/.BO), Indian ETF (e.g. NIFTYBEES, GOLDBEES, SILVERBEES, BANKBEES), or Indian Market Index (NIFTY 50, BSE SENSEX, NIFTY BANK, NIFTY IT, NSE, BSE).',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description:
            'Company, ETF, or index name/symbol in English (e.g., NIFTY 50, BSE SENSEX, NSE, Wipro, Gold BeES, Nifty BeES, Reliance)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_etf_info',
    description:
      'Explain what Indian ETFs are and return verified Indian ETFs (Nifty, Gold, Silver, Bank, IT, Pharma, Liquid, Nasdaq 100, CPSE) along with what they track and their live prices.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Optional ETF name or category (e.g., gold, silver, nifty, bank, it, liquid, nasdaq, all)',
        },
      },
    },
  },
  {
    name: 'add_stock_to_watchlist',
    description: 'Add a verified NSE (.NS), BSE (.BO), ETF, or Indian index (^NSEI, ^BSESN) to the watchlist.',
    parameters: {
      type: 'OBJECT',
      properties: {
        symbol: { type: 'STRING', description: 'Exact ticker ending in .NS or .BO, or index like ^NSEI or ^BSESN' },
        nameEn: { type: 'STRING', description: 'Short English display name, e.g. NIFTY 50, Gold BeES ETF, Wipro' },
      },
      required: ['symbol', 'nameEn'],
    },
  },
  {
    name: 'remove_stock_from_watchlist',
    description: 'Remove a stock, ETF, or index from the watchlist after the user verbally confirms.',
    parameters: {
      type: 'OBJECT',
      properties: {
        symbol: { type: 'STRING', description: 'Exact ticker being removed, e.g. ITC.NS or ^NSEI' },
      },
      required: ['symbol'],
    },
  },
];

const WORKLET_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      this.port.postMessage(input[0].slice());
    }
    return true;
  }
}
registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;

function downsampleTo16k(input: Float32Array, sourceRate: number): Float32Array {
  if (Math.abs(sourceRate - 16000) < 100) return input;
  const ratio = sourceRate / 16000;
  const newLength = Math.max(1, Math.floor(input.length / ratio));
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j += 1) {
      sum += input[j];
      count += 1;
    }
    result[i] = count > 0 ? sum / count : input[start];
  }
  return result;
}

function float32ToBase64Pcm16(float32: Float32Array): string {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i += 1) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToPcm16Float32(base64: string): Float32Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const out = new Float32Array(new ArrayBuffer((bytes.length / 2) * 4));
  for (let i = 0; i < out.length; i += 1) {
    out[i] = view.getInt16(i * 2, true) / 32768;
  }
  return out;
}

export class GeminiLiveController {
  private ws: WebSocket | null = null;
  private micStream: MediaStream | null = null;
  private inputCtx: AudioContext | null = null;
  private outputCtx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private muteGain: GainNode | null = null;
  private pcmQueue: Float32Array[] = [];
  private pcmQueueLen = 0;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private silenceTimer: number | null = null;
  private setupTimeoutTimer: number | null = null;
  private playbackStatusTimer: number | null = null;
  private setupCompleted = false;
  private silenceTimeoutMs = 60_000;
  private active = false;
  private activeCallbacks: GeminiLiveCallbacks | null = null;

  public get isActive(): boolean {
    return this.active;
  }

  private isModelSpeaking(): boolean {
    if (!this.outputCtx) return false;
    return this.nextPlayTime > this.outputCtx.currentTime + 0.08;
  }

  private getRemainingPlaybackMs(): number {
    if (!this.outputCtx) return 0;
    return Math.max(0, Math.round((this.nextPlayTime - this.outputCtx.currentTime) * 1000));
  }

  public async start(config: AppConfig, lang: Language, callbacks: GeminiLiveCallbacks): Promise<void> {
    if (this.active) {
      this.stop(callbacks);
      return;
    }

    this.active = true;
    this.setupCompleted = false;
    this.activeCallbacks = callbacks;
    callbacks.onStatusChange('connecting');

    try {
      const session = await requestGeminiSession();
      this.silenceTimeoutMs = (session.silenceTimeoutSec || config.geminiSilenceTimeoutSec || 60) * 1000;

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone requires HTTPS or localhost.');
      }

      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (micErr) {
        const msg = micErr instanceof Error ? micErr.message : 'Microphone permission denied';
        throw new Error(`Mic error: ${msg}`);
      }

      this.inputCtx = new AudioContext();
      this.outputCtx = new AudioContext({ sampleRate: 24000 });
      if (this.inputCtx.state === 'suspended') await this.inputCtx.resume();
      if (this.outputCtx.state === 'suspended') await this.outputCtx.resume();
      this.nextPlayTime = this.outputCtx.currentTime;

      // Prefer models/gemini-3.8-live for natural, ultra-fast real-time voice
      let modelId = session.model || config.geminiModel || 'models/gemini-3.8-live';
      if (!modelId.startsWith('models/')) modelId = `models/${modelId}`;

      this.setupTimeoutTimer = window.setTimeout(() => {
        if (this.active && !this.setupCompleted) {
          callbacks.onStatusChange(
            'error',
            `Connection timed out for ${modelId}. Check GEMINI_API_KEY in .dev.vars.`
          );
          this.stop(callbacks, false);
        }
      }, 10_000);

      const ws = new WebSocket(session.wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        const currentQuotes = callbacks.getQuotes();
        const listSummary = callbacks
          .getWatchlist()
          .map((s) => {
            const q = currentQuotes[s.symbol];
            if (!q) return `${s.symbol} (${s.nameEn})`;
            const isIndex = s.assetType === 'index' || isIndexSymbol(s.symbol);
            const prefix = isIndex ? '' : '₹';
            const suffix = isIndex ? ' pts' : '';
            const dir =
              q.change >= 0
                ? `up ${prefix}${q.change}${suffix}`
                : `down ${prefix}${Math.abs(q.change)}${suffix}`;
            return `${s.symbol} (${s.nameEn}: ${prefix}${q.regularMarketPrice}${suffix}, ${dir})`;
          })
          .join('; ');

        const generationConfig: Record<string, unknown> = {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: session.voiceName || 'Aoede',
              },
            },
          },
        };

        if (modelId.toLowerCase().includes('thinking')) {
          generationConfig.thinkingConfig = { thinkingLevel: 'LOW' };
        }

        const setupPayload = {
          setup: {
            model: modelId,
            generationConfig,
            systemInstruction: {
              parts: [
                {
                  text: `${SYSTEM_PROMPT}\nLanguage: ${lang === 'gu' ? 'Gujarati' : 'Hindi'}.\nCurrent watchlist: ${listSummary}`,
                },
              ],
            },
            tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
          },
        };
        console.log('[GeminiLive] connected, sending setup payload for', modelId);
        ws.send(JSON.stringify(setupPayload));
      };

      ws.onmessage = async (event) => {
        let rawText = '';
        if (typeof event.data === 'string') {
          rawText = event.data;
        } else if (event.data instanceof Blob) {
          rawText = await event.data.text();
        }
        if (!rawText) return;

        try {
          const msg = JSON.parse(rawText) as Record<string, unknown>;

          if (msg.error && typeof msg.error === 'object') {
            const errObj = msg.error as { message?: string };
            callbacks.onStatusChange('error', errObj.message || 'Gemini Live error');
            this.stop(callbacks, false);
            return;
          }

          if ('setupComplete' in msg) {
            this.setupCompleted = true;
            if (this.setupTimeoutTimer !== null) {
              window.clearTimeout(this.setupTimeoutTimer);
              this.setupTimeoutTimer = null;
            }
            callbacks.onStatusChange('listening');
            await this.startMicStreaming();
            this.resetSilenceTimer(callbacks);

            // Natural, polite initial prompt without repetitive "Dada" address
            ws.send(
              JSON.stringify({
                clientContent: {
                  turns: [
                    {
                      role: 'user',
                      parts: [
                        {
                          text:
                            lang === 'gu'
                              ? 'યુઝરે વાત કરવા માઈક ચાલુ કર્યું છે. "દાદા" કે કોઈ નામ બોલ્યા વગર સહજતાથી અને ટૂંકમાં પૂછો: "નમસ્તે, કયા શેર, ઈટીએફ કે માર્કેટ વિશે જાણવું છે?"'
                              : 'यूज़र ने बात करने के लिए माइक चालू किया है। "दादा" या कोई संबोधन बोले बिना सहजता से और संक्षेप में पूछें: "नमस्ते, किस शेयर, ईटीएफ या मार्केट के बारे में जानना है?"',
                        },
                      ],
                    },
                  ],
                  turnComplete: true,
                },
              })
            );
            return;
          }

          const serverContent = msg.serverContent as
            | {
                interrupted?: boolean;
                modelTurn?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
                turnComplete?: boolean;
              }
            | undefined;

          if (serverContent?.interrupted) {
            this.stopAudioPlayback();
          }

          if (serverContent?.modelTurn?.parts) {
            for (const part of serverContent.modelTurn.parts) {
              if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/pcm')) {
                callbacks.onStatusChange('speaking');
                this.resetSilenceTimer(callbacks);
                this.playPcmChunk(part.inlineData.data);
              }
            }
          }

          // Check for native tool calls
          const toolCall = msg.toolCall as
            | { functionCalls?: Array<{ id: string; name: string; args?: Record<string, unknown> }> }
            | undefined;

          let functionCalls = toolCall?.functionCalls;
          if (!functionCalls && serverContent?.modelTurn?.parts) {
            const partsCalls: Array<{ id: string; name: string; args?: Record<string, unknown> }> = [];
            for (const p of serverContent.modelTurn.parts) {
              const fc = (p as Record<string, unknown>).functionCall as
                | { id?: string; name: string; args?: Record<string, unknown> }
                | undefined;
              if (fc && fc.name) {
                partsCalls.push({ id: fc.id || 'live_call', name: fc.name, args: fc.args });
              }
            }
            if (partsCalls.length > 0) functionCalls = partsCalls;
          }

          if (functionCalls && functionCalls.length > 0) {
            console.log('[GeminiLive] tool requested by AI:', functionCalls);
            await this.handleToolCalls(functionCalls, lang, callbacks);
          }

          if (serverContent?.turnComplete) {
            this.scheduleListeningAfterPlayback(callbacks);
          }
        } catch {
          // Ignore malformed frames
        }
      };

      ws.onerror = () => {
        callbacks.onStatusChange('error', 'Gemini Live connection error. Check network or API key.');
        this.stop(callbacks, false);
      };

      ws.onclose = (ev) => {
        console.log('[GeminiLive] closed:', ev.code, ev.reason);
        if (!this.active) return;
        if (!this.setupCompleted || (ev.code !== 1000 && ev.code !== 1005)) {
          const reason = ev.reason ? `: ${ev.reason}` : '';
          callbacks.onStatusChange(
            'error',
            `Gemini Live closed (${ev.code}${reason}). Check API key or Model in /admin.`
          );
          this.stop(callbacks, false);
        } else {
          this.stop(callbacks, true);
        }
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to start AI Assistant.';
      callbacks.onStatusChange('error', msg);
      this.stop(callbacks, false);
    }
  }

  private scheduleListeningAfterPlayback(callbacks: GeminiLiveCallbacks): void {
    if (this.playbackStatusTimer !== null) {
      window.clearTimeout(this.playbackStatusTimer);
    }
    const waitMs = this.getRemainingPlaybackMs();
    if (waitMs <= 60) {
      callbacks.onStatusChange('listening');
      return;
    }
    this.playbackStatusTimer = window.setTimeout(() => {
      this.playbackStatusTimer = null;
      if (this.active) {
        callbacks.onStatusChange('listening');
      }
    }, waitMs);
  }

  private buildQuoteOutput(q: QuoteData, displayName: string): Record<string, unknown> {
    const assetType = inferAssetType(q.symbol, q.instrumentType);
    const isIndex = assetType === 'index';
    const direction = q.change > 0.005 ? 'up' : q.change < -0.005 ? 'down' : 'unchanged';
    const knownEtf = KNOWN_INDIAN_ETFS.find((e) => e.symbol === q.symbol);

    return {
      found: true,
      symbol: q.symbol,
      name: displayName || q.shortName || q.symbol,
      assetType,
      unit: isIndex ? 'points' : 'rupees',
      ...(isIndex
        ? {
            pricePoints: q.regularMarketPrice,
            changePoints: Number(Math.abs(q.change).toFixed(2)),
          }
        : {
            priceRupees: q.regularMarketPrice,
            changeRupees: Number(Math.abs(q.change).toFixed(2)),
          }),
      percentChange: Number(Math.abs(q.percentChange).toFixed(2)),
      direction,
      previousClose: q.previousClose,
      ...(q.dayHigh !== undefined ? { dayHigh: q.dayHigh } : {}),
      ...(q.dayLow !== undefined ? { dayLow: q.dayLow } : {}),
      ...(q.fiftyTwoWeekHigh !== undefined ? { fiftyTwoWeekHigh: q.fiftyTwoWeekHigh } : {}),
      ...(q.fiftyTwoWeekLow !== undefined ? { fiftyTwoWeekLow: q.fiftyTwoWeekLow } : {}),
      ...(knownEtf ? { etfCategory: knownEtf.category, tracks: knownEtf.tracks } : {}),
    };
  }

  private async handleToolCalls(
    calls: Array<{ id: string; name: string; args?: Record<string, unknown> }>,
    lang: Language,
    callbacks: GeminiLiveCallbacks
  ): Promise<void> {
    callbacks.onStatusChange('working', lang === 'gu' ? '⏳ ભાવ લાવું છું...' : '⏳ भाव ला रहा हूँ...');

    const responses: Array<{
      id: string;
      name?: string;
      response: { output: Record<string, unknown> };
    }> = [];

    for (const call of calls) {
      const args = call.args ?? {};
      if (call.name === 'get_live_stock_price') {
        const query = String(args.query ?? '').trim();
        try {
          // Handle ambiguous exchange names ("NSE", "BSE") by returning both the benchmark index and the listed exchange share
          if (/^(\^?nse|national stock exchange|એનએસઈ|एनएसई)$/i.test(query)) {
            const quoteMap = await fetchQuotes(['^NSEI', 'NSE.BO']);
            const idxQ = quoteMap['^NSEI'];
            const eqQ = quoteMap['NSE.BO'];
            responses.push({
              id: call.id,
              name: call.name,
              response: {
                output: {
                  found: Boolean(idxQ || eqQ),
                  note: 'NSE refers to the National Stock Exchange; its benchmark market index is NIFTY 50 (^NSEI) and its listed company share is NSE.BO.',
                  ...(idxQ ? { nifty50Index: this.buildQuoteOutput(idxQ, 'NIFTY 50 (NSE Benchmark Index)') } : {}),
                  ...(eqQ ? { nseListedShare: this.buildQuoteOutput(eqQ, 'National Stock Exchange of India Ltd (Listed Share)') } : {}),
                },
              },
            });
            continue;
          }

          if (/^(\^?bse|bombay stock exchange|બીએસઈ|बीएसई)$/i.test(query)) {
            const quoteMap = await fetchQuotes(['^BSESN', 'BSE.NS']);
            const idxQ = quoteMap['^BSESN'];
            const eqQ = quoteMap['BSE.NS'];
            responses.push({
              id: call.id,
              name: call.name,
              response: {
                output: {
                  found: Boolean(idxQ || eqQ),
                  note: 'BSE refers to the Bombay Stock Exchange; its benchmark market index is BSE SENSEX (^BSESN) and its listed company share is BSE.NS.',
                  ...(idxQ ? { sensexIndex: this.buildQuoteOutput(idxQ, 'S&P BSE SENSEX (BSE Benchmark Index)') } : {}),
                  ...(eqQ ? { bseListedShare: this.buildQuoteOutput(eqQ, 'BSE Limited (Listed Share)') } : {}),
                },
              },
            });
            continue;
          }

          let targetSymbol = '';
          let companyName = query;
          const qLower = query.toLowerCase();

          // 1. Check Known Indian ETFs, Indices & Stocks (exact/pattern match first to avoid substring collisions like "nse" in "sensex")
          const hit = KNOWN_INDIAN_STOCKS.find(
            (k) =>
              k.pattern.test(query) ||
              k.nameEn.toLowerCase() === qLower ||
              k.symbol.toLowerCase() === qLower
          );
          if (hit) {
            targetSymbol = hit.symbol;
            companyName = hit.nameEn;
          }

          // 2. Check watchlist
          if (!targetSymbol) {
            const wl = callbacks.getWatchlist();
            const inWl = wl.find(
              (s) =>
                s.symbol.toLowerCase() === qLower ||
                s.nameEn.toLowerCase() === qLower ||
                (qLower.length >= 4 && s.nameEn.toLowerCase().includes(qLower)) ||
                s.nameGu.includes(query) ||
                s.nameHi.includes(query)
            );
            if (inWl) {
              targetSymbol = inWl.symbol;
              companyName = inWl.nameEn;
            }
          }

          // 3. Fallback to Yahoo Search (now includes EQUITY, ETF, and Indian INDEX)
          if (!targetSymbol) {
            const matches = await searchIndianStocks(query);
            const preferred = matches.find((m) => m.symbol.endsWith('.NS') || m.symbol.startsWith('^')) ?? matches[0];
            if (preferred) {
              targetSymbol = preferred.symbol;
              companyName = preferred.shortname || preferred.symbol;
            }
          }

          if (!targetSymbol) {
            responses.push({
              id: call.id,
              name: call.name,
              response: { output: { found: false, message: `No Indian stock, ETF, or index found for ${query}` } },
            });
            continue;
          }

          const quoteMap = await fetchQuotes([targetSymbol]);
          const q = quoteMap[targetSymbol];
          if (!q) {
            responses.push({
              id: call.id,
              name: call.name,
              response: { output: { found: false, symbol: targetSymbol, message: 'Quote currently unavailable' } },
            });
            continue;
          }

          responses.push({
            id: call.id,
            name: call.name,
            response: { output: this.buildQuoteOutput(q, companyName) },
          });
        } catch {
          responses.push({
            id: call.id,
            name: call.name,
            response: { output: { found: false, error: 'Lookup failed' } },
          });
        }
      } else if (call.name === 'get_etf_info') {
        const query = String(args.query ?? '').trim().toLowerCase();
        try {
          let matching =
            query && query !== 'all' && query !== 'overview'
              ? KNOWN_INDIAN_ETFS.filter(
                  (e) =>
                    e.pattern.test(query) ||
                    e.nameEn.toLowerCase().includes(query) ||
                    (e.category ?? '').toLowerCase().includes(query) ||
                    (e.tracks ?? '').toLowerCase().includes(query)
                )
              : [];

          if (matching.length === 0) {
            const featuredSymbols = new Set([
              'NIFTYBEES.NS',
              'GOLDBEES.NS',
              'SILVERBEES.NS',
              'BANKBEES.NS',
              'LIQUIDBEES.NS',
            ]);
            matching = KNOWN_INDIAN_ETFS.filter((e) => featuredSymbols.has(e.symbol));
          } else {
            matching = matching.slice(0, 5);
          }

          const symbols = matching.map((e) => e.symbol);
          const quoteMap = await fetchQuotes(symbols);
          const etfs = matching.map((e) => {
            const q = quoteMap[e.symbol];
            return {
              symbol: e.symbol,
              name: e.nameEn,
              category: e.category,
              tracks: e.tracks,
              ...(q ? this.buildQuoteOutput(q, e.nameEn) : { priceAvailable: false }),
            };
          });

          responses.push({
            id: call.id,
            name: call.name,
            response: {
              output: {
                whatIsEtf:
                  'An ETF (Exchange Traded Fund) is a ready-made basket of shares, gold, silver, or overnight debt that trades on NSE/BSE like a normal share at low cost.',
                etfs,
              },
            },
          });
        } catch {
          responses.push({
            id: call.id,
            name: call.name,
            response: {
              output: {
                whatIsEtf:
                  'An ETF (Exchange Traded Fund) is a basket of shares, gold, or silver traded on NSE/BSE like a regular share.',
                etfs: KNOWN_INDIAN_ETFS.slice(0, 5).map((e) => ({
                  symbol: e.symbol,
                  name: e.nameEn,
                  category: e.category,
                  tracks: e.tracks,
                })),
              },
            },
          });
        }
      } else if (call.name === 'add_stock_to_watchlist') {
        const rawSymbol = String(args.symbol ?? '').trim().toUpperCase();
        let targetSymbol = rawSymbol;
        let companyName = String(args.nameEn ?? rawSymbol);

        if (!targetSymbol.endsWith('.NS') && !targetSymbol.endsWith('.BO') && !targetSymbol.startsWith('^')) {
          const hit = KNOWN_INDIAN_STOCKS.find(
            (k) => k.pattern.test(targetSymbol) || k.nameEn.toLowerCase() === companyName.toLowerCase()
          );
          if (hit) {
            targetSymbol = hit.symbol;
            companyName = hit.nameEn;
          }
        }

        const hit = KNOWN_INDIAN_STOCKS.find((k) => k.symbol === targetSymbol);
        const stock: StockItem = {
          symbol: targetSymbol,
          exchange: hit?.exchange ?? (targetSymbol.endsWith('.BO') || targetSymbol === '^BSESN' ? 'BSE' : 'NSE'),
          assetType: hit?.assetType ?? inferAssetType(targetSymbol),
          nameEn: companyName || hit?.nameEn || targetSymbol,
          nameGu: hit?.nameGu || companyName || targetSymbol,
          nameHi: hit?.nameHi || companyName || targetSymbol,
        };

        await callbacks.onAddStock(stock);
        responses.push({
          id: call.id,
          name: call.name,
          response: { output: { status: 'added', symbol: stock.symbol, companyName: stock.nameEn } },
        });
      } else if (call.name === 'remove_stock_from_watchlist') {
        const symbol = String(args.symbol ?? '').trim().toUpperCase();
        const found = callbacks
          .getWatchlist()
          .find((s) => s.symbol === symbol || s.nameEn.toLowerCase().includes(symbol.toLowerCase()));
        const targetSymbol = found ? found.symbol : symbol;
        await callbacks.onRemoveStockConfirmed(targetSymbol);
        responses.push({
          id: call.id,
          name: call.name,
          response: { output: { status: 'removed', symbol: targetSymbol, companyName: found?.nameEn || targetSymbol } },
        });
      }
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN && responses.length > 0) {
      console.log('[GeminiLive] returning tool response:', responses);
      this.ws.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
    }
  }

  private pushAudioSamples(rawSamples: Float32Array): void {
    if (!this.inputCtx || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const downsampled = downsampleTo16k(rawSamples, this.inputCtx.sampleRate);
    this.pcmQueue.push(downsampled);
    this.pcmQueueLen += downsampled.length;

    // Send ~200ms frames (3200 samples at 16kHz)
    if (this.pcmQueueLen < 3200) return;

    const combined = new Float32Array(this.pcmQueueLen);
    let offset = 0;
    for (const chunk of this.pcmQueue) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    this.pcmQueue = [];
    this.pcmQueueLen = 0;

    let energy = 0;
    for (let i = 0; i < combined.length; i += 16) {
      energy += Math.abs(combined[i]);
    }
    const avgLevel = energy / (combined.length / 16);
    if (avgLevel > 0.008) {
      this.resetSilenceTimer();
    }

    // Acoustic Echo Suppression:
    // If Gemini is actively speaking through the phone/laptop speakers, mute the mic samples
    // so Gemini doesn't hear itself and get stuck in a chattering loop.
    // If the user speaks loudly (barge-in > 0.15), let it through.
    if (this.isModelSpeaking() && avgLevel < 0.15) {
      return;
    }

    const b64 = float32ToBase64Pcm16(combined);
    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          audio: {
            mimeType: 'audio/pcm;rate=16000',
            data: b64,
          },
        },
      })
    );
  }

  private async startMicStreaming(): Promise<void> {
    if (!this.inputCtx || !this.micStream || !this.ws) return;
    const source = this.inputCtx.createMediaStreamSource(this.micStream);
    const muteGain = this.inputCtx.createGain();
    muteGain.gain.value = 0;
    this.muteGain = muteGain;

    if (this.inputCtx.audioWorklet) {
      try {
        const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        await this.inputCtx.audioWorklet.addModule(workletUrl);
        URL.revokeObjectURL(workletUrl);

        const node = new AudioWorkletNode(this.inputCtx, 'pcm-capture-processor');
        this.workletNode = node;
        node.port.onmessage = (ev) => {
          this.pushAudioSamples(ev.data as Float32Array);
        };
        source.connect(node);
        node.connect(muteGain);
        muteGain.connect(this.inputCtx.destination);
        return;
      } catch {
        // Fallback to ScriptProcessorNode
      }
    }

    const processor = this.inputCtx.createScriptProcessor(4096, 1, 1);
    this.scriptNode = processor;
    processor.onaudioprocess = (e) => {
      this.pushAudioSamples(e.inputBuffer.getChannelData(0));
    };
    source.connect(processor);
    processor.connect(muteGain);
    muteGain.connect(this.inputCtx.destination);
  }

  private playPcmChunk(base64Data: string): void {
    if (!this.outputCtx) return;
    if (this.outputCtx.state === 'suspended') {
      void this.outputCtx.resume();
    }
    const samples = base64ToPcm16Float32(base64Data);
    const audioBuffer = this.outputCtx.createBuffer(1, samples.length, 24000);
    audioBuffer.copyToChannel(samples, 0);

    const src = this.outputCtx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(this.outputCtx.destination);

    const startAt = Math.max(this.outputCtx.currentTime, this.nextPlayTime);
    src.start(startAt);
    this.nextPlayTime = startAt + audioBuffer.duration;
    this.activeSources.push(src);
    src.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== src);
    };
  }

  private stopAudioPlayback(): void {
    for (const s of this.activeSources) {
      try {
        s.stop();
      } catch {
        // Ignore
      }
    }
    this.activeSources = [];
    if (this.outputCtx) {
      this.nextPlayTime = this.outputCtx.currentTime;
    }
  }

  private resetSilenceTimer(callbacks?: GeminiLiveCallbacks): void {
    if (this.silenceTimer !== null) {
      window.clearTimeout(this.silenceTimer);
    }
    const cb = callbacks ?? this.activeCallbacks ?? undefined;
    this.silenceTimer = window.setTimeout(() => {
      this.stop(cb, true, 'timeout');
    }, this.silenceTimeoutMs);
  }

  public stop(callbacks?: GeminiLiveCallbacks, notifyClosed = true, closeReason?: string): void {
    this.active = false;
    this.setupCompleted = false;
    const cb = callbacks ?? this.activeCallbacks ?? undefined;
    this.activeCallbacks = null;
    this.pcmQueue = [];
    this.pcmQueueLen = 0;

    if (this.playbackStatusTimer !== null) {
      window.clearTimeout(this.playbackStatusTimer);
      this.playbackStatusTimer = null;
    }
    if (this.setupTimeoutTimer !== null) {
      window.clearTimeout(this.setupTimeoutTimer);
      this.setupTimeoutTimer = null;
    }
    if (this.silenceTimer !== null) {
      window.clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.stopAudioPlayback();
    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.scriptNode) {
      this.scriptNode.onaudioprocess = null;
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
    if (this.muteGain) {
      this.muteGain.disconnect();
      this.muteGain = null;
    }
    if (this.micStream) {
      for (const track of this.micStream.getTracks()) {
        track.stop();
      }
      this.micStream = null;
    }
    if (this.inputCtx) {
      void this.inputCtx.close();
      this.inputCtx = null;
    }
    if (this.outputCtx) {
      void this.outputCtx.close();
      this.outputCtx = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }
    if (notifyClosed && cb) {
      cb.onStatusChange('closed', closeReason);
    }
  }
}
