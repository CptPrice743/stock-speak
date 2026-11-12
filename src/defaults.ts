import type { AppConfig, StockItem } from './types';

export const DEFAULT_WATCHLIST: StockItem[] = [
  {
    symbol: 'RELIANCE.NS',
    exchange: 'NSE',
    nameEn: 'Reliance Industries',
    nameGu: 'રિલાયન્સ',
    nameHi: 'रिलायंस',
  },
  {
    symbol: 'TCS.NS',
    exchange: 'NSE',
    nameEn: 'TCS',
    nameGu: 'ટીસીએસ',
    nameHi: 'टीसीएस',
  },
  {
    symbol: 'HDFCBANK.NS',
    exchange: 'NSE',
    nameEn: 'HDFC Bank',
    nameGu: 'એચડીએફસી બેંક',
    nameHi: 'एचडीएफसी बैंक',
  },
  {
    symbol: 'SBIN.NS',
    exchange: 'NSE',
    nameEn: 'State Bank of India',
    nameGu: 'એસબીઆઈ બેંક',
    nameHi: 'एसबीआई बैंक',
  },
  {
    symbol: 'TMPV.NS',
    exchange: 'NSE',
    nameEn: 'Tata Motors',
    nameGu: 'ટાટા મોટર્સ',
    nameHi: 'टाटा मोटर्स',
  },
  {
    symbol: 'ITC.NS',
    exchange: 'NSE',
    nameEn: 'ITC',
    nameGu: 'આઈટીસી',
    nameHi: 'आईटीसी',
  },
  {
    symbol: 'LT.NS',
    exchange: 'NSE',
    nameEn: 'Larsen & Toubro',
    nameGu: 'એલ એન્ડ ટી',
    nameHi: 'एल एंड टी',
  },
];

export const DEFAULT_CONFIG: AppConfig = {
  configVersion: 1,
  language: 'gu',
  showLanguageToggle: true,
  priceRounding: 'round',
  announcePercentChange: false,
  speechRate: 0.85,
  pauseBetweenStocksMs: 1200,
  ttsEngine: 'auto',
  enableGeminiAssistant: true,
  geminiModel: 'models/gemini-3.8-live',
  geminiVoiceName: 'Aoede',
  requireRemoveConfirmation: true,
  geminiSilenceTimeoutSec: 60,
  updatedAt: '2026-11-12T00:00:00.000Z',
};
