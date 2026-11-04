// 바이낸스 주소는 이 파일에만 둔다. 주소 체계가 바뀌면 여기만 고친다.
// VITE_RELAY_URL 이 있으면 중계 서버(relay/)를 거치고, 없으면 바이낸스를 직접 부른다 (로컬 개발용).

const DIRECT_REST_BASE = 'https://fapi.binance.com';
const DIRECT_WS_BASE = 'wss://fstream.binance.com';

const DIRECT_PATHS = {
  exchangeInfo: '/fapi/v1/exchangeInfo',
  ticker24hr: '/fapi/v1/ticker/24hr',
  klines: '/fapi/v1/klines',
} as const;

// 중계 서버의 경로 (relay/src/routes.js 와 같아야 한다)
const RELAY_PATHS = {
  exchangeInfo: '/api/exchangeInfo',
  ticker24hr: '/api/ticker24h',
  klines: '/api/klines',
} as const;

export interface BinanceEndpoints {
  readonly exchangeInfo: string;
  readonly ticker24hr: string;
  readonly marketStream: string;
  klines(symbol: string, interval: string, limit: number, startTime?: number): string;
  klineStream(symbol: string, interval: string): string;
}

// 중계 주소가 비어 있으면 직접 모드다.
export function createBinanceEndpoints(relayUrl: string | undefined): BinanceEndpoints {
  const relay = normalizeRelayUrl(relayUrl);
  return relay === null ? directEndpoints() : relayEndpoints(relay);
}

export const binanceEndpoints: BinanceEndpoints = createBinanceEndpoints(import.meta.env.VITE_RELAY_URL);

function normalizeRelayUrl(raw: string | undefined): string | null {
  const trimmed = (raw ?? '').trim().replace(/\/+$/, '');
  return trimmed === '' ? null : trimmed;
}

function directEndpoints(): BinanceEndpoints {
  return {
    exchangeInfo: `${DIRECT_REST_BASE}${DIRECT_PATHS.exchangeInfo}`,
    ticker24hr: `${DIRECT_REST_BASE}${DIRECT_PATHS.ticker24hr}`,
    marketStream: `${DIRECT_WS_BASE}/ws/!ticker@arr`,
    klines: (symbol, interval, limit, startTime) =>
      `${DIRECT_REST_BASE}${DIRECT_PATHS.klines}?${klinesQuery(symbol, interval, limit, startTime)}`,
    klineStream: (symbol, interval) => `${DIRECT_WS_BASE}/ws/${symbol.toLowerCase()}@kline_${interval}`,
  };
}

function relayEndpoints(relay: string): BinanceEndpoints {
  const wsBase = toWebSocketBase(relay);
  return {
    exchangeInfo: `${relay}${RELAY_PATHS.exchangeInfo}`,
    ticker24hr: `${relay}${RELAY_PATHS.ticker24hr}`,
    marketStream: relayStreamUrl(wsBase, '!ticker@arr'),
    klines: (symbol, interval, limit, startTime) =>
      `${relay}${RELAY_PATHS.klines}?${klinesQuery(symbol, interval, limit, startTime)}`,
    klineStream: (symbol, interval) => relayStreamUrl(wsBase, `${symbol.toLowerCase()}@kline_${interval}`),
  };
}

function klinesQuery(symbol: string, interval: string, limit: number, startTime?: number): string {
  const params: Record<string, string> = { symbol, interval, limit: String(limit) };
  if (startTime !== undefined) {
    params.startTime = String(startTime);
  }
  return new URLSearchParams(params).toString();
}

function relayStreamUrl(wsBase: string, stream: string): string {
  return `${wsBase}/ws?${new URLSearchParams({ stream }).toString()}`;
}

function toWebSocketBase(relay: string): string {
  return relay.replace(/^http/, 'ws');
}
