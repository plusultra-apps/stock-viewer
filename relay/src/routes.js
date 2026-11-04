import { parseKlinesQuery } from './allowlist.js';
import {
  BINANCE_REST_BASE,
  EXCHANGE_INFO_TTL_MS,
  TICKER_24H_TTL_MS,
} from './config.js';

// 이 서버가 받는 경로 하나당 바이낸스 주소 하나. 허용 목록 밖은 모두 notFound 다.
// 결과 종류:
//   notFound            → 404
//   badRequest          → 400 (message 에 이유)
//   binance             → 바이낸스로 보낸다 (key: 요청 제한 단위, ttlMs: 캐시 시간, 0 이면 캐시 안 함)
export function resolveApiRoute(pathname, searchParams) {
  if (pathname === '/api/exchangeInfo') {
    return binance('exchangeInfo', `${BINANCE_REST_BASE}/fapi/v1/exchangeInfo`, EXCHANGE_INFO_TTL_MS);
  }
  if (pathname === '/api/ticker24h') {
    return binance('ticker24h', `${BINANCE_REST_BASE}/fapi/v1/ticker/24hr`, TICKER_24H_TTL_MS);
  }
  if (pathname === '/api/klines') {
    return resolveKlines(searchParams);
  }
  return { kind: 'notFound' };
}

function resolveKlines(searchParams) {
  const parsed = parseKlinesQuery(searchParams);
  if (!parsed.ok) {
    return { kind: 'badRequest', message: parsed.message };
  }
  const { symbol, interval, limit, startTime } = parsed.value;
  const query = new URLSearchParams({ symbol, interval, limit: String(limit) });
  if (startTime !== undefined) {
    query.set('startTime', String(startTime));
  }
  return binance('klines', `${BINANCE_REST_BASE}/fapi/v1/klines?${query.toString()}`, 0);
}

function binance(key, url, ttlMs) {
  return { kind: 'binance', key, url, ttlMs };
}
