import { DEFAULT_CONFIG, DEFAULT_WATCHLIST } from '../src/defaults';
import type { AppConfig, QuoteData, SearchMatch, StockItem } from '../src/types';

export interface Env {
  STOCK_SPEAK_KV: KVNamespace;
  ASSETS: Fetcher;
  GEMINI_API_KEY: string;
  DADA_DEVICE_SECRET: string;
  ADMIN_PIN: string;
}

type AuthRole = 'admin' | 'dada' | null;

const KV_WATCHLIST_KEY = 'watchlist:main';
const KV_CONFIG_KEY = 'config:main';
const TICKER_PATTERN = /^[A-Z0-9.&-]{1,20}\.(NS|BO)$/;

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

function isRateLimited(bucketKey: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = rateBuckets.get(bucketKey);
  if (!existing || now > existing.resetAt) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return false;
  }
  existing.count += 1;
  return existing.count > limit;
}

function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

function getAuthRole(request: Request, env: Env): AuthRole {
  const adminPin = request.headers.get('X-Admin-Pin');
  if (env.ADMIN_PIN && safeEqual(adminPin, env.ADMIN_PIN)) {
    return 'admin';
  }
  const dadaHeader = request.headers.get('X-Dada-Key');
  const dadaCookie = parseCookie(request.headers.get('Cookie'), 'stock_speak_key');
  const dadaCandidate = dadaHeader || dadaCookie;
  if (env.DADA_DEVICE_SECRET && safeEqual(dadaCandidate, env.DADA_DEVICE_SECRET)) {
    return 'dada';
  }
  return null;
}

function jsonResponse(body: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

async function readStateFromKV(env: Env): Promise<{ watchlist: StockItem[]; config: AppConfig }> {
  const [rawWatchlist, rawConfig] = await Promise.all([
    env.STOCK_SPEAK_KV.get<StockItem[]>(KV_WATCHLIST_KEY, 'json'),
    env.STOCK_SPEAK_KV.get<AppConfig>(KV_CONFIG_KEY, 'json'),
  ]);

  let watchlist = rawWatchlist;
  let config = rawConfig;
  const writes: Promise<void>[] = [];

  if (!Array.isArray(watchlist) || watchlist.length === 0) {
    watchlist = DEFAULT_WATCHLIST;
    writes.push(env.STOCK_SPEAK_KV.put(KV_WATCHLIST_KEY, JSON.stringify(watchlist)));
  }

  if (!config || typeof config.configVersion !== 'number') {
    config = { ...DEFAULT_CONFIG };
    writes.push(env.STOCK_SPEAK_KV.put(KV_CONFIG_KEY, JSON.stringify(config)));
  } else {
    config = { ...DEFAULT_CONFIG, ...config };
  }

  if (writes.length > 0) {
    await Promise.all(writes);
  }

  return { watchlist, config };
}

function sanitizeWatchlist(input: unknown): StockItem[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 25) {
    return null;
  }
  const seen = new Set<string>();
  const clean: StockItem[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const symbol = typeof item.symbol === 'string' ? item.symbol.trim().toUpperCase() : '';
    if (!TICKER_PATTERN.test(symbol) || seen.has(symbol)) continue;
    seen.add(symbol);

    const exchange = symbol.endsWith('.BO') ? 'BSE' : 'NSE';
    const nameEn = typeof item.nameEn === 'string' && item.nameEn.trim() ? item.nameEn.trim().slice(0, 60) : symbol;
    const nameGu = typeof item.nameGu === 'string' && item.nameGu.trim() ? item.nameGu.trim().slice(0, 60) : nameEn;
    const nameHi = typeof item.nameHi === 'string' && item.nameHi.trim() ? item.nameHi.trim().slice(0, 60) : nameEn;

    clean.push({ symbol, exchange, nameEn, nameGu, nameHi });
  }

  return clean.length > 0 ? clean : null;
}

function mergeConfig(current: AppConfig, patch: Record<string, unknown>): AppConfig {
  const next: AppConfig = {
    ...current,
    configVersion: current.configVersion + 1,
    updatedAt: new Date().toISOString(),
  };

  if (patch.language === 'gu' || patch.language === 'hi') next.language = patch.language;
  if (typeof patch.showLanguageToggle === 'boolean') next.showLanguageToggle = patch.showLanguageToggle;
  if (patch.priceRounding === 'round' || patch.priceRounding === 'exact_paise' || patch.priceRounding === 'smart') {
    next.priceRounding = patch.priceRounding;
  }
  if (typeof patch.announcePercentChange === 'boolean') next.announcePercentChange = patch.announcePercentChange;
  if (typeof patch.speechRate === 'number' && patch.speechRate >= 0.5 && patch.speechRate <= 1.4) {
    next.speechRate = Number(patch.speechRate.toFixed(2));
  }
  if (typeof patch.pauseBetweenStocksMs === 'number' && patch.pauseBetweenStocksMs >= 200 && patch.pauseBetweenStocksMs <= 4000) {
    next.pauseBetweenStocksMs = Math.round(patch.pauseBetweenStocksMs);
  }
  if (patch.ttsEngine === 'auto' || patch.ttsEngine === 'native_only' || patch.ttsEngine === 'edge_tts_only') {
    next.ttsEngine = patch.ttsEngine;
  }
  if (typeof patch.enableGeminiAssistant === 'boolean') next.enableGeminiAssistant = patch.enableGeminiAssistant;
  if (typeof patch.geminiModel === 'string' && patch.geminiModel.trim().length > 3) {
    next.geminiModel = patch.geminiModel.trim().slice(0, 120);
  }
  if (typeof patch.geminiVoiceName === 'string' && patch.geminiVoiceName.trim().length > 1) {
    next.geminiVoiceName = patch.geminiVoiceName.trim().slice(0, 40);
  }
  if (typeof patch.requireRemoveConfirmation === 'boolean') {
    next.requireRemoveConfirmation = patch.requireRemoveConfirmation;
  }
  if (typeof patch.geminiSilenceTimeoutSec === 'number' && patch.geminiSilenceTimeoutSec >= 10 && patch.geminiSilenceTimeoutSec <= 180) {
    next.geminiSilenceTimeoutSec = Math.round(patch.geminiSilenceTimeoutSec);
  }

  return next;
}

async function fetchYahooQuote(symbol: string): Promise<QuoteData | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
      Accept: 'application/json',
    },
  });
  if (!resp.ok) return null;

  const data = (await resp.json()) as {
    chart?: {
      result?: Array<{
        meta?: {
          symbol?: string;
          currency?: string;
          regularMarketPrice?: number;
          chartPreviousClose?: number;
          previousClose?: number;
          regularMarketTime?: number;
        };
      }>;
    };
  };

  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta || typeof meta.regularMarketPrice !== 'number') return null;

  const price = meta.regularMarketPrice;
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - previousClose;
  const percentChange = previousClose > 0 ? (change / previousClose) * 100 : 0;

  return {
    symbol: meta.symbol ?? symbol,
    regularMarketPrice: Number(price.toFixed(2)),
    previousClose: Number(previousClose.toFixed(2)),
    change: Number(change.toFixed(2)),
    percentChange: Number(percentChange.toFixed(2)),
    marketTime: meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString(),
    currency: meta.currency ?? 'INR',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

    if (!path.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    // Emergency PIN unlock endpoint (rate-limited heavily to prevent brute force)
    if (path === '/api/unlock' && request.method === 'POST') {
      if (isRateLimited(`unlock:${clientIp}`, 5, 10 * 60 * 1000)) {
        return jsonResponse({ error: 'Too many attempts. Wait 10 minutes.' }, 429);
      }
      try {
        const body = (await request.json()) as { pin?: string };
        if (env.ADMIN_PIN && safeEqual(body.pin?.trim(), env.ADMIN_PIN)) {
          return jsonResponse({
            ok: true,
            dadaKey: env.DADA_DEVICE_SECRET,
          });
        }
      } catch {
        return jsonResponse({ error: 'Invalid JSON payload' }, 400);
      }
      return jsonResponse({ error: 'Invalid Caregiver PIN' }, 401);
    }

    // Strict authentication check for all other /api/* routes
    if (isRateLimited(`authfail_check:${clientIp}`, 1000, 60_000)) {
      return jsonResponse({ error: 'Rate limit exceeded' }, 429);
    }

    const role = getAuthRole(request, env);
    if (!role) {
      if (isRateLimited(`authfail:${clientIp}`, 8, 10 * 60 * 1000)) {
        return jsonResponse({ error: 'Too many unauthorized requests' }, 429);
      }
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    if (path === '/api/state' && request.method === 'GET') {
      const state = await readStateFromKV(env);
      return jsonResponse({ ...state, role }, 200, { 'Cache-Control': 'no-store' });
    }

    if (path === '/api/state' && request.method === 'PUT') {
      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
      }

      const current = await readStateFromKV(env);
      let nextWatchlist = current.watchlist;
      let nextConfig = current.config;
      const writes: Promise<void>[] = [];

      if (body.resetDefaults === true) {
        if (role !== 'admin') return jsonResponse({ error: 'Admin PIN required' }, 403);
        nextWatchlist = DEFAULT_WATCHLIST;
        nextConfig = {
          ...DEFAULT_CONFIG,
          configVersion: current.config.configVersion + 1,
          updatedAt: new Date().toISOString(),
        };
        writes.push(env.STOCK_SPEAK_KV.put(KV_WATCHLIST_KEY, JSON.stringify(nextWatchlist)));
        writes.push(env.STOCK_SPEAK_KV.put(KV_CONFIG_KEY, JSON.stringify(nextConfig)));
      } else {
        if ('watchlist' in body) {
          const cleanList = sanitizeWatchlist(body.watchlist);
          if (!cleanList) {
            return jsonResponse({ error: 'Invalid watchlist (1-25 valid .NS/.BO symbols required)' }, 400);
          }
          nextWatchlist = cleanList;
          writes.push(env.STOCK_SPEAK_KV.put(KV_WATCHLIST_KEY, JSON.stringify(nextWatchlist)));
        }

        if ('config' in body && body.config && typeof body.config === 'object') {
          if (role !== 'admin') {
            return jsonResponse({ error: 'Admin PIN required to change settings' }, 403);
          }
          nextConfig = mergeConfig(current.config, body.config as Record<string, unknown>);
          writes.push(env.STOCK_SPEAK_KV.put(KV_CONFIG_KEY, JSON.stringify(nextConfig)));
        } else if (body.bumpVersion === true) {
          if (role !== 'admin') return jsonResponse({ error: 'Admin PIN required' }, 403);
          nextConfig = {
            ...current.config,
            configVersion: current.config.configVersion + 1,
            updatedAt: new Date().toISOString(),
          };
          writes.push(env.STOCK_SPEAK_KV.put(KV_CONFIG_KEY, JSON.stringify(nextConfig)));
        }
      }

      if (writes.length > 0) {
        await Promise.all(writes);
      }

      return jsonResponse({ watchlist: nextWatchlist, config: nextConfig, role }, 200, {
        'Cache-Control': 'no-store',
      });
    }

    if (path === '/api/quotes' && request.method === 'GET') {
      if (isRateLimited(`quotes:${clientIp}`, 60, 60_000)) {
        return jsonResponse({ error: 'Quote rate limit exceeded' }, 429);
      }
      const rawSymbols = url.searchParams.get('symbols') ?? '';
      const symbols = rawSymbols
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s) => TICKER_PATTERN.test(s))
        .slice(0, 25);

      if (symbols.length === 0) {
        return jsonResponse({ error: 'Provide valid ?symbols=RELIANCE.NS,TCS.NS' }, 400);
      }

      const results = await Promise.all(symbols.map((sym) => fetchYahooQuote(sym)));
      const quotes: Record<string, QuoteData> = {};
      for (const q of results) {
        if (q) quotes[q.symbol] = q;
      }

      return jsonResponse(
        { quotes, fetchedAt: new Date().toISOString() },
        200,
        { 'Cache-Control': 'public, max-age=1' }
      );
    }

    if (path === '/api/search' && request.method === 'GET') {
      if (isRateLimited(`search:${clientIp}`, 30, 60_000)) {
        return jsonResponse({ error: 'Search rate limit exceeded' }, 429);
      }
      const q = (url.searchParams.get('q') ?? '').trim();
      if (q.length < 2 || q.length > 50) {
        return jsonResponse({ matches: [] });
      }

      const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0`;
      const resp = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
          Accept: 'application/json',
        },
      });
      if (!resp.ok) {
        return jsonResponse({ matches: [] }, 502);
      }

      const data = (await resp.json()) as {
        quotes?: Array<{
          symbol?: string;
          shortname?: string;
          longname?: string;
          exchange?: string;
          quoteType?: string;
        }>;
      };

      const matches: SearchMatch[] = [];
      for (const item of data.quotes ?? []) {
        const sym = (item.symbol ?? '').toUpperCase();
        if (!TICKER_PATTERN.test(sym)) continue;
        if (item.quoteType && item.quoteType !== 'EQUITY') continue;
        matches.push({
          symbol: sym,
          shortname: item.shortname || item.longname || sym,
          exchange: sym.endsWith('.BO') ? 'BSE' : 'NSE',
        });
        if (matches.length >= 6) break;
      }

      return jsonResponse({ matches }, 200, { 'Cache-Control': 'public, max-age=60' });
    }

    if (path === '/api/tts' && request.method === 'GET') {
      if (isRateLimited(`tts:${clientIp}`, 60, 60_000)) {
        return jsonResponse({ error: 'TTS rate limit exceeded' }, 429);
      }
      const lang = url.searchParams.get('lang') === 'hi' ? 'hi' : 'gu';
      const text = (url.searchParams.get('text') ?? '').trim();
      if (!text || text.length > 300) {
        return jsonResponse({ error: 'Text must be 1-300 characters' }, 400);
      }

      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;
      const resp = await fetch(ttsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
          Referer: 'https://translate.google.com/',
        },
      });
      if (!resp.ok) {
        return jsonResponse({ error: 'Upstream TTS unavailable' }, 502);
      }

      return new Response(resp.body, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=120',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    if (path === '/api/gemini-session' && request.method === 'POST') {
      if (isRateLimited(`gemini:${clientIp}`, 10, 60_000)) {
        return jsonResponse({ error: 'Gemini session rate limit exceeded' }, 429);
      }
      const { config } = await readStateFromKV(env);
      if (!config.enableGeminiAssistant) {
        return jsonResponse({ error: 'AI Assistant is currently disabled by caregiver.' }, 403);
      }
      if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY.startsWith('REPLACE_WITH_')) {
        return jsonResponse({ error: 'GEMINI_API_KEY is not configured yet.' }, 503);
      }

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
      return jsonResponse(
        {
          wsUrl,
          model: config.geminiModel,
          voiceName: config.geminiVoiceName,
          silenceTimeoutSec: config.geminiSilenceTimeoutSec,
        },
        200,
        { 'Cache-Control': 'no-store' }
      );
    }

    if (path === '/api/admin/setup-link' && request.method === 'GET') {
      if (role !== 'admin') {
        return jsonResponse({ error: 'Admin PIN required' }, 403);
      }
      return jsonResponse({
        setupPath: `/?setup=${encodeURIComponent(env.DADA_DEVICE_SECRET)}`,
      });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
};
