import { isRecord, readNumber, readString } from '../../../shared/parse/fields';
import type { Candle } from '../domain/Candle';
import { type Interval, isInterval } from '../domain/Interval';
import type { LiveCandle } from '../domain/LiveCandle';

// 봉 실시간 메시지 하나를 읽는다. 형식이 틀리면 버리고 연결은 유지한다.
// k.t=시작 시각, k.i=간격, k.o/h/l/c=시·고·저·종, k.v=거래량, k.x=닫힘 여부
export function parseKlineStream(text: string): LiveCandle | null {
  const message = parseJson(text);
  if (!isRecord(message) || !isRecord(message.k)) {
    return null;
  }
  const k = message.k;
  const symbol = readString(message.s);
  const interval = readString(k.i);
  const candle = candleOf(k);
  if (symbol === null || interval === null || !isInterval(interval) || candle === null) {
    console.warn('봉 실시간 메시지 형식이 아니다');
    return null;
  }
  return { symbol, interval: interval as Interval, candle, closed: k.x === true };
}

function parseJson(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    console.warn('봉 실시간 메시지를 JSON 으로 읽을 수 없다');
    return null;
  }
}

function candleOf(k: Record<string, unknown>): Candle | null {
  const openTime = readNumber(k.t);
  const volume = readNumber(k.v);
  const prices = pricesOf(k);
  if (openTime === null || volume === null || prices === null) {
    return null;
  }
  return { openTime, ...prices, volume };
}

function pricesOf(k: Record<string, unknown>): Pick<Candle, 'open' | 'high' | 'low' | 'close'> | null {
  const open = readNumber(k.o);
  const high = readNumber(k.h);
  const low = readNumber(k.l);
  const close = readNumber(k.c);
  if (open === null || high === null || low === null || close === null) {
    return null;
  }
  return { open, high, low, close };
}
