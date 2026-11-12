import { fetchTtsAudioUrl } from './api';
import type { AppConfig, Language, PriceRounding, QuoteData, StockItem } from './types';

function formatMoney(amount: number, lang: Language, mode: PriceRounding, forceExactIfSub1 = false): string {
  const abs = Math.abs(amount);
  const useExact =
    mode === 'exact_paise' ||
    (mode === 'smart' && abs < 100) ||
    (forceExactIfSub1 && abs > 0 && Math.round(abs) === 0);

  const unitRupee = lang === 'gu' ? 'રૂપિયા' : 'रुपये';
  const unitPaise = lang === 'gu' ? 'પૈસા' : 'पैसे';

  if (!useExact) {
    return `${Math.round(abs)} ${unitRupee}`;
  }

  const fixed = abs.toFixed(2);
  const [rsStr, psStr] = fixed.split('.');
  const paise = Number(psStr);
  if (paise === 0) {
    return `${Number(rsStr)} ${unitRupee}`;
  }
  return `${Number(rsStr)} ${unitRupee} ${paise} ${unitPaise}`;
}

export function buildStockAnnouncement(
  stock: StockItem,
  quote: QuoteData,
  config: AppConfig,
  langOverride?: Language
): string {
  const lang = langOverride ?? config.language;
  const name = lang === 'gu' ? stock.nameGu : stock.nameHi;
  const priceText = formatMoney(quote.regularMarketPrice, lang, config.priceRounding);

  const isZero = Math.abs(quote.change) < 0.005;
  const isUp = quote.change > 0;
  const changeText = formatMoney(quote.change, lang, config.priceRounding, true);

  let sentence = '';
  if (lang === 'gu') {
    if (isZero) {
      sentence = `${name}, ભાવ ${priceText}, કોઈ ફેરફાર નથી.`;
    } else if (isUp) {
      sentence = `${name}, ભાવ ${priceText}, ${changeText} વધ્યો.`;
    } else {
      sentence = `${name}, ભાવ ${priceText}, ${changeText} ઘટ્યો.`;
    }
    if (config.announcePercentChange && !isZero) {
      const pct = Math.abs(quote.percentChange).toFixed(1);
      sentence += ` ${pct} ટકા ${isUp ? 'વધારો' : 'ઘટાડો'}.`;
    }
  } else {
    if (isZero) {
      sentence = `${name}, भाव ${priceText}, कोई बदलाव नहीं.`;
    } else if (isUp) {
      sentence = `${name}, भाव ${priceText}, ${changeText} बढ़ा.`;
    } else {
      sentence = `${name}, भाव ${priceText}, ${changeText} गिरा.`;
    }
    if (config.announcePercentChange && !isZero) {
      const pct = Math.abs(quote.percentChange).toFixed(1);
      sentence += ` ${pct} प्रतिशत ${isUp ? 'तेज़ी' : 'गिरावट'}.`;
    }
  }

  return sentence;
}

export class SpeechController {
  private isSpeaking = false;
  private generation = 0;
  private activeAudio: HTMLAudioElement | null = null;
  private activeObjectUrl: string | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private pendingTimer: number | null = null;
  private safetyTimer: number | null = null;
  private ttsAbort: AbortController | null = null;
  private resolveCurrent: (() => void) | null = null;

  public get speaking(): boolean {
    return this.isSpeaking;
  }

  public stop(): void {
    this.generation += 1;
    this.isSpeaking = false;

    if (this.pendingTimer !== null) {
      window.clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    if (this.safetyTimer !== null) {
      window.clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
    if (this.ttsAbort) {
      this.ttsAbort.abort();
      this.ttsAbort = null;
    }

    if (this.activeUtterance) {
      this.activeUtterance.onend = null;
      this.activeUtterance.onerror = null;
      this.activeUtterance = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (this.activeAudio) {
      this.activeAudio.onended = null;
      this.activeAudio.onerror = null;
      this.activeAudio.pause();
      this.activeAudio.src = '';
      this.activeAudio = null;
    }
    if (this.activeObjectUrl) {
      URL.revokeObjectURL(this.activeObjectUrl);
      this.activeObjectUrl = null;
    }
    if (this.resolveCurrent) {
      const r = this.resolveCurrent;
      this.resolveCurrent = null;
      r();
    }
  }

  private findNativeVoice(lang: Language): SpeechSynthesisVoice | null {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const prefix = lang === 'gu' ? 'gu' : 'hi';
    return (
      voices.find((v) => v.lang.toLowerCase().startsWith(`${prefix}-in`)) ??
      voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ??
      null
    );
  }

  private speakNative(text: string, lang: Language, rate: number, gen: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window) || gen !== this.generation) {
        if (gen !== this.generation) resolve();
        else reject(new Error('Web Speech API unavailable'));
        return;
      }

      window.speechSynthesis.cancel();
      this.resolveCurrent = resolve;

      this.safetyTimer = window.setTimeout(() => {
        this.safetyTimer = null;
        if (this.resolveCurrent === resolve) {
          this.resolveCurrent = null;
          resolve();
        }
      }, 15_000);

      // Brief tick after cancel() prevents Android Chrome Web Speech lockups
      this.pendingTimer = window.setTimeout(() => {
        this.pendingTimer = null;
        if (gen !== this.generation) {
          if (this.safetyTimer !== null) {
            window.clearTimeout(this.safetyTimer);
            this.safetyTimer = null;
          }
          if (this.resolveCurrent === resolve) {
            this.resolveCurrent = null;
          }
          resolve();
          return;
        }

        const utt = new SpeechSynthesisUtterance(text);
        this.activeUtterance = utt;
        utt.lang = lang === 'gu' ? 'gu-IN' : 'hi-IN';
        utt.rate = rate;
        utt.pitch = 1.0;

        const voice = this.findNativeVoice(lang);
        if (voice) utt.voice = voice;

        utt.onend = () => {
          if (this.safetyTimer !== null) {
            window.clearTimeout(this.safetyTimer);
            this.safetyTimer = null;
          }
          this.activeUtterance = null;
          if (this.resolveCurrent === resolve) {
            this.resolveCurrent = null;
            resolve();
          }
        };
        utt.onerror = () => {
          if (this.safetyTimer !== null) {
            window.clearTimeout(this.safetyTimer);
            this.safetyTimer = null;
          }
          this.activeUtterance = null;
          if (this.resolveCurrent === resolve) {
            this.resolveCurrent = null;
            if (gen !== this.generation) resolve();
            else reject(new Error('Native TTS error'));
          }
        };

        window.speechSynthesis.speak(utt);
      }, 60);
    });
  }

  private async speakEdgeAudio(text: string, lang: Language, rate: number, gen: number): Promise<void> {
    if (gen !== this.generation) return;

    const controller = new AbortController();
    this.ttsAbort = controller;

    const objectUrl = await fetchTtsAudioUrl(lang, text, controller.signal);
    if (this.ttsAbort === controller) {
      this.ttsAbort = null;
    }

    if (gen !== this.generation) {
      URL.revokeObjectURL(objectUrl);
      return;
    }

    this.activeObjectUrl = objectUrl;
    const audio = new Audio(objectUrl);
    audio.playbackRate = Math.min(1.25, Math.max(0.7, rate / 0.85));
    this.activeAudio = audio;

    await new Promise<void>((resolve) => {
      this.resolveCurrent = resolve;
      const done = () => {
        if (this.activeObjectUrl === objectUrl) {
          URL.revokeObjectURL(objectUrl);
          this.activeObjectUrl = null;
        }
        if (this.activeAudio === audio) {
          this.activeAudio = null;
        }
        if (this.resolveCurrent === resolve) {
          this.resolveCurrent = null;
          resolve();
        }
      };
      audio.onended = done;
      audio.onerror = done;
      audio.play().catch(done);
    });
  }

  public async speakSingle(text: string, lang: Language, config: AppConfig): Promise<void> {
    this.stop();
    const gen = this.generation;
    this.isSpeaking = true;

    try {
      await this.speakLine(text, lang, config, gen);
    } finally {
      if (gen === this.generation) {
        this.isSpeaking = false;
      }
    }
  }

  private async speakLine(text: string, lang: Language, config: AppConfig, gen: number): Promise<void> {
    if (gen !== this.generation) return;

    const hasNativeVoice = this.findNativeVoice(lang) !== null;
    const shouldUseEdge =
      config.ttsEngine === 'edge_tts_only' ||
      (config.ttsEngine === 'auto' && !hasNativeVoice);

    if (!shouldUseEdge) {
      try {
        await this.speakNative(text, lang, config.speechRate, gen);
        return;
      } catch {
        if (config.ttsEngine === 'native_only' || gen !== this.generation) return;
      }
    }

    try {
      await this.speakEdgeAudio(text, lang, config.speechRate, gen);
    } catch {
      if (config.ttsEngine !== 'edge_tts_only' && gen === this.generation) {
        await this.speakNative(text, lang, config.speechRate, gen).catch(() => {});
      }
    }
  }

  public async speakAll(
    stocks: StockItem[],
    quotes: Record<string, QuoteData>,
    config: AppConfig,
    lang: Language,
    onHighlight: (symbol: string | null) => void
  ): Promise<void> {
    this.stop();
    const gen = this.generation;
    this.isSpeaking = true;

    try {
      for (let i = 0; i < stocks.length; i += 1) {
        if (gen !== this.generation) break;
        const stock = stocks[i];
        const quote = quotes[stock.symbol];
        if (!quote) continue;

        onHighlight(stock.symbol);
        const text = buildStockAnnouncement(stock, quote, config, lang);
        await this.speakLine(text, lang, config, gen);

        if (gen !== this.generation) break;
        if (i < stocks.length - 1) {
          await new Promise<void>((r) => {
            this.resolveCurrent = () => {
              if (this.pendingTimer !== null) {
                window.clearTimeout(this.pendingTimer);
                this.pendingTimer = null;
              }
              r();
            };
            this.pendingTimer = window.setTimeout(() => {
              this.pendingTimer = null;
              if (this.resolveCurrent) this.resolveCurrent = null;
              r();
            }, config.pauseBetweenStocksMs);
          });
        }
      }
    } finally {
      if (gen === this.generation) {
        this.isSpeaking = false;
        onHighlight(null);
      }
    }
  }
}
