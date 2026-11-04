import { readNumber } from '../../../shared/parse/fields';
import { FeedError } from '../../connection/domain/FeedError';
import type { Candle } from '../domain/Candle';

// 봉 목록 (REST). 한 줄이라도 못 읽으면 전체를 실패로 본다 (데이터가 어긋나면 안 된다).
// 한 줄 순서: 시작 시각, 시가, 고가, 저가, 종가, 거래량 (바이낸스 형식)
export function parseKlines(input: unknown): Candle[] {
  if (!Array.isArray(input)) {
    throw new FeedError('badResponse', '봉 목록 응답 형식이 아니다');
  }
  return input.map((row: unknown) => candleOfRow(row));
}

function candleOfRow(row: unknown): Candle {
  const candle = Array.isArray(row) ? candleFromRow(row) : null;
  if (candle === null) {
    throw new FeedError('badResponse', '봉 한 줄을 읽을 수 없다');
  }
  return candle;
}

function candleFromRow(row: readonly unknown[]): Candle | null {
  const openTime = readNumber(row[0]);
  const open = readNumber(row[1]);
  const high = readNumber(row[2]);
  const low = readNumber(row[3]);
  const close = readNumber(row[4]);
  const volume = readNumber(row[5]);
  if (openTime === null || open === null || high === null || low === null || close === null || volume === null) {
    return null;
  }
  return { openTime, open, high, low, close, volume };
}
