import { requestGeminiSession, searchIndianStocks } from './api';
import type { AppConfig, Language, StockItem } from './types';

export interface GeminiLiveCallbacks {
  getWatchlist: () => StockItem[];
  onAddStock: (stock: StockItem) => Promise<void>;
  onRequestRemoveStock: (stock: StockItem) => Promise<boolean>;
  onRemoveStockConfirmed: (symbol: string) => Promise<void>;
  onStatusChange: (status: 'connecting' | 'listening' | 'speaking' | 'closed' | 'error', detail?: string) => void;
}

const SYSTEM_PROMPT = `You are a warm, respectful, patient Gujarati and Hindi voice assistant helping "Dada" (an elderly grandfather with severe vision loss) manage his Indian stock watchlist.
RULES:
1. Speak ONLY in simple, clear Gujarati or Hindi (matching the language Dada speaks to you). Address him respectfully as "દાદા" or "दादाजी".
2. Keep every reply short (1 to 2 brief sentences). Speak slowly and clearly.
3. NEVER state, guess, or read stock prices! Your ONLY job is adding or removing stocks from his list. If he asks for prices, politely tell him to tap the big yellow button at the top of his screen.
4. To add a stock, ALWAYS call "search_indian_stock" first so you get the exact NSE (.NS) or BSE (.BO) symbol, then call "add_stock_to_watchlist" with accurate Gujarati (nameGu) and Hindi (nameHi) phonetic spellings.
5. To remove a stock, ALWAYS call "propose_remove_stock" first. Wait for Dada's confirmation before saying it is removed.`;

const TOOL_DECLARATIONS = [
  {
    name: 'search_indian_stock',
    description: 'Search Indian NSE/BSE equity stocks by company name or ticker.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Company name in English, e.g. Tata Steel, Infosys, Wipro' },
      },
      required: ['query'],
    },
  },
  {
    name: 'add_stock_to_watchlist',
    description: 'Add a verified NSE (.NS) or BSE (.BO) stock to Dada watchlist.',
    parameters: {
      type: 'OBJECT',
      properties: {
        symbol: { type: 'STRING', description: 'Exact ticker ending in .NS or .BO' },
        nameEn: { type: 'STRING', description: 'Short English name' },
        nameGu: { type: 'STRING', description: 'Phonetic Gujarati name in Gujarati script' },
        nameHi: { type: 'STRING', description: 'Phonetic Hindi name in Devanagari script' },
      },
      required: ['symbol', 'nameEn', 'nameGu', 'nameHi'],
    },
  },
  {
    name: 'propose_remove_stock',
    description: 'Propose removing a stock from Dada watchlist. Triggers a Giant Yes/No screen confirmation.',
    parameters: {
      type: 'OBJECT',
      properties: {
        symbol: { type: 'STRING', description: 'Exact ticker from current watchlist' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'confirm_remove_stock',
    description: 'Complete removal of a stock after Dada verbally says Yes / હા કાઢી નાખો.',
    parameters: {
      type: 'OBJECT',
      properties: {
        symbol: { type: 'STRING', description: 'Exact ticker being removed' },
      },
      required: ['symbol'],
    },
  },
];

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
  private scriptNode: ScriptProcessorNode | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private silenceTimer: number | null = null;
  private silenceTimeoutMs = 30_000;
  private active = false;
  private pendingRemovalSymbol: string | null = null;
  private activeCallbacks: GeminiLiveCallbacks | null = null;

  public get isActive(): boolean {
    return this.active;
  }

  public async start(config: AppConfig, lang: Language, callbacks: GeminiLiveCallbacks): Promise<void> {
    if (this.active) {
      this.stop(callbacks);
      return;
    }

    this.active = true;
    this.activeCallbacks = callbacks;
    callbacks.onStatusChange('connecting');

    try {
      const session = await requestGeminiSession();
      this.silenceTimeoutMs = (session.silenceTimeoutSec || config.geminiSilenceTimeoutSec || 30) * 1000;

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone not supported in this browser.');
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.inputCtx = new AudioContext({ sampleRate: 16000 });
      this.outputCtx = new AudioContext({ sampleRate: 24000 });
      this.nextPlayTime = this.outputCtx.currentTime;

      const ws = new WebSocket(session.wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        const listSummary = callbacks
          .getWatchlist()
          .map((s) => `${s.symbol} (${s.nameEn})`)
          .join(', ');

        const modelId = session.model.startsWith('models/')
          ? session.model
          : `models/${session.model}`;

        const setupPayload = {
          setup: {
            model: modelId,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: session.voiceName || 'Aoede',
                  },
                },
              },
            },
            systemInstruction: {
              parts: [
                {
                  text: `${SYSTEM_PROMPT}\nPreferred language right now: ${lang === 'gu' ? 'Gujarati' : 'Hindi'}.\nDada's current watchlist: ${listSummary}`,
                },
              ],
            },
            tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
          },
        };
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
          if ('setupComplete' in msg) {
            callbacks.onStatusChange('listening');
            this.startMicStreaming();
            this.resetSilenceTimer(callbacks);
            // Prompt Gemini to greet Dada warmly right away
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
                              ? 'દાદાએ માઈક ચાલુ કર્યું છે. એકદમ ટૂંકમાં પૂછો કે કયો શેર ઉમેરવો કે કાઢવો છે.'
                              : 'दादाजी ने माइक चालू किया है। बहुत संक्षेप में पूछें कि कौन सा शेयर जोड़ना या हटाना है।',
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

          if (serverContent?.turnComplete) {
            callbacks.onStatusChange('listening');
          }

          const toolCall = msg.toolCall as
            | { functionCalls?: Array<{ id: string; name: string; args?: Record<string, unknown> }> }
            | undefined;
          if (toolCall?.functionCalls?.length) {
            await this.handleToolCalls(toolCall.functionCalls, config, callbacks);
          }
        } catch {
          // Ignore malformed frames
        }
      };

      ws.onerror = () => {
        callbacks.onStatusChange('error', 'Gemini Live connection error.');
        this.stop(callbacks, false);
      };

      ws.onclose = () => {
        if (this.active) {
          this.stop(callbacks, true);
        }
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to start AI Assistant.';
      callbacks.onStatusChange('error', msg);
      this.stop(callbacks, false);
    }
  }

  private startMicStreaming(): void {
    if (!this.inputCtx || !this.micStream || !this.ws) return;
    const source = this.inputCtx.createMediaStreamSource(this.micStream);
    // ScriptProcessorNode works reliably across low-end ₹10k Android WebViews without external worker files
    const processor = this.inputCtx.createScriptProcessor(4096, 1, 1);
    this.scriptNode = processor;

    processor.onaudioprocess = (e) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);

      // Simple energy check to reset silence timer only when voice activity occurs
      let energy = 0;
      for (let i = 0; i < input.length; i += 16) {
        energy += Math.abs(input[i]);
      }
      if (energy / (input.length / 16) > 0.015) {
        this.resetSilenceTimer();
      }

      const b64 = float32ToBase64Pcm16(input);
      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: b64 }],
          },
        })
      );
    };

    source.connect(processor);
    processor.connect(this.inputCtx.destination);
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

  private async handleToolCalls(
    calls: Array<{ id: string; name: string; args?: Record<string, unknown> }>,
    config: AppConfig,
    callbacks: GeminiLiveCallbacks
  ): Promise<void> {
    const responses: Array<{ id: string; name: string; response: Record<string, unknown> }> = [];

    for (const call of calls) {
      const args = call.args ?? {};
      if (call.name === 'search_indian_stock') {
        const query = String(args.query ?? '').trim();
        try {
          const matches = await searchIndianStocks(query);
          responses.push({ id: call.id, name: call.name, response: { matches } });
        } catch {
          responses.push({ id: call.id, name: call.name, response: { matches: [], error: 'Search failed' } });
        }
      } else if (call.name === 'add_stock_to_watchlist') {
        const symbol = String(args.symbol ?? '').trim().toUpperCase();
        if (!/^[A-Z0-9.&-]{1,20}\.(NS|BO)$/.test(symbol)) {
          responses.push({
            id: call.id,
            name: call.name,
            response: { status: 'error', message: 'Symbol must be a valid .NS or .BO ticker from search_indian_stock.' },
          });
          continue;
        }
        const stock: StockItem = {
          symbol,
          exchange: symbol.endsWith('.BO') ? 'BSE' : 'NSE',
          nameEn: String(args.nameEn || symbol),
          nameGu: String(args.nameGu || args.nameEn || symbol),
          nameHi: String(args.nameHi || args.nameEn || symbol),
        };
        await callbacks.onAddStock(stock);
        responses.push({ id: call.id, name: call.name, response: { status: 'added', symbol } });
      } else if (call.name === 'propose_remove_stock') {
        const symbol = String(args.symbol ?? '').trim().toUpperCase();
        const found = callbacks.getWatchlist().find((s) => s.symbol === symbol);
        if (!found) {
          responses.push({ id: call.id, name: call.name, response: { status: 'not_found' } });
          continue;
        }
        if (!config.requireRemoveConfirmation) {
          await callbacks.onRemoveStockConfirmed(symbol);
          responses.push({ id: call.id, name: call.name, response: { status: 'removed', symbol } });
          continue;
        }
        this.pendingRemovalSymbol = symbol;
        // Open giant GREEN/RED dialog asynchronously; also allow verbal confirm_remove_stock
        void callbacks.onRequestRemoveStock(found).then((confirmed) => {
          if (confirmed && this.pendingRemovalSymbol === symbol) {
            this.pendingRemovalSymbol = null;
            void callbacks.onRemoveStockConfirmed(symbol);
          } else if (!confirmed && this.pendingRemovalSymbol === symbol) {
            this.pendingRemovalSymbol = null;
          }
        });
        responses.push({
          id: call.id,
          name: call.name,
          response: {
            status: 'awaiting_confirmation',
            message: 'Confirmation screen shown to Dada. Ask him if he is sure, or let him tap the big Green YES / Red NO button.',
          },
        });
      } else if (call.name === 'confirm_remove_stock') {
        const symbol = String(args.symbol ?? this.pendingRemovalSymbol ?? '').trim().toUpperCase();
        this.pendingRemovalSymbol = null;
        await callbacks.onRemoveStockConfirmed(symbol);
        responses.push({ id: call.id, name: call.name, response: { status: 'removed', symbol } });
      }
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN && responses.length > 0) {
      this.ws.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
    }
  }

  private resetSilenceTimer(callbacks?: GeminiLiveCallbacks): void {
    if (this.silenceTimer !== null) {
      window.clearTimeout(this.silenceTimer);
    }
    const cb = callbacks ?? this.activeCallbacks ?? undefined;
    this.silenceTimer = window.setTimeout(() => {
      this.stop(cb);
    }, this.silenceTimeoutMs);
  }

  public stop(callbacks?: GeminiLiveCallbacks, notifyClosed = true): void {
    this.active = false;
    const cb = callbacks ?? this.activeCallbacks ?? undefined;
    this.activeCallbacks = null;
    if (this.silenceTimer !== null) {
      window.clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.stopAudioPlayback();
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
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
      cb.onStatusChange('closed');
    }
  }
}
