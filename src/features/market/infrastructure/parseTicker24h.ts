import { isRecord, readNumber, readString } from '../../../shared/parse/fields';
import { FeedError } from '../../connection/domain/FeedError';
import { isValidSymbol } from '../domain/Market';
import type { Ticker } from '../domain/Ticker';

// 전 종목 24시간 시세 (REST). 열 때와 재연결 때만 부른다.
export function parseTicker24h(input: unknown): Ticker[] {
  if (!Array.isArray(input)) {
    throw new FeedError('badResponse', '24시간 시세 응답 형식이 아니다');
  }
  return input.flatMap((raw: unknown) => toTicker(raw));
}

function toTicker(raw: unknown): Ticker[] {
  if (!isRecord(raw)) {
    return [];
  }
  const symbol = readString(raw.symbol);
  if (symbol === null || !isValidSymbol(symbol)) {
    return [];
  }
  return [tickerOf(symbol, raw)];
}

function tickerOf(symbol: string, raw: Record<string, unknown>): Ticker {
  return {
    symbol,
    lastPrice: readNumber(raw.lastPrice),
    changePercent: readNumber(raw.priceChangePercent),
    quoteVolume: readNumber(raw.quoteVolume),
  };
}
