import { isRecord, readNumber, readString } from '../../../shared/parse/fields';
import { isValidSymbol } from '../domain/Market';
import type { TickerPatch } from '../domain/Ticker';

// 전 종목 시세 스트림 메시지 하나를 읽는다. 형식이 틀리면 버리고 연결은 유지한다 (03-tech-design 4-8).
export function parseTickerStream(text: string): TickerPatch[] {
  const value = parseJson(text);
  if (!Array.isArray(value)) {
    console.warn('시세 스트림 메시지 형식이 아니다');
    return [];
  }
  return value.flatMap((raw: unknown) => toPatch(raw));
}

function parseJson(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    console.warn('시세 스트림 메시지를 JSON 으로 읽을 수 없다');
    return null;
  }
}

// s=기호, c=현재가, P=24시간 등락률(%), q=24시간 거래대금
function toPatch(raw: unknown): TickerPatch[] {
  if (!isRecord(raw)) {
    return [];
  }
  const symbol = readString(raw.s);
  if (symbol === null || !isValidSymbol(symbol)) {
    return [];
  }
  return [patchOf(symbol, raw)];
}

// 받은 값만 담는다. 빠진 필드는 키 자체를 만들지 않는다.
function patchOf(symbol: string, raw: Record<string, unknown>): TickerPatch {
  const lastPrice = readNumber(raw.c);
  const changePercent = readNumber(raw.P);
  const quoteVolume = readNumber(raw.q);
  return {
    symbol,
    ...(lastPrice === null ? {} : { lastPrice }),
    ...(changePercent === null ? {} : { changePercent }),
    ...(quoteVolume === null ? {} : { quoteVolume }),
  };
}
