export type Exchange = 'NSE' | 'BSE';
export type Language = 'gu' | 'hi';
export type PriceRounding = 'round' | 'exact_paise' | 'smart';
export type TtsEngine = 'auto' | 'native_only' | 'edge_tts_only';

export interface StockItem {
  symbol: string;
  exchange: Exchange;
  nameEn: string;
  nameGu: string;
  nameHi: string;
}

export interface AppConfig {
  configVersion: number;
  language: Language;
  showLanguageToggle: boolean;
  priceRounding: PriceRounding;
  announcePercentChange: boolean;
  speechRate: number;
  pauseBetweenStocksMs: number;
  ttsEngine: TtsEngine;
  enableGeminiAssistant: boolean;
  geminiModel: string;
  geminiVoiceName: string;
  requireRemoveConfirmation: boolean;
  geminiSilenceTimeoutSec: number;
  updatedAt: string;
}

export interface AppState {
  watchlist: StockItem[];
  config: AppConfig;
}

export interface QuoteData {
  symbol: string;
  regularMarketPrice: number;
  previousClose: number;
  change: number;
  percentChange: number;
  marketTime: string;
  currency: string;
}

export interface SearchMatch {
  symbol: string;
  shortname: string;
  exchange: Exchange;
}

export interface GeminiSessionInfo {
  wsUrl: string;
  model: string;
  voiceName: string;
  silenceTimeoutSec: number;
}
