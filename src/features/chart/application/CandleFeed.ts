import type { StreamHandlers, Unsubscribe } from '../../connection/application/StreamHandlers';
import type { Candle } from '../domain/Candle';
import type { LiveCandle } from '../domain/LiveCandle';
import type { Selection } from '../domain/Selection';

// 몇 개를 어디서부터 받을지. startTime 이 없으면 최근 봉부터 limit 개.
export interface CandleRange {
  readonly limit: number;
  readonly startTime?: number;
}

// 봉을 받아오는 경계 (시험에서는 가짜로 바꾼다).
export interface CandleFeed {
  loadCandles(selection: Selection, range: CandleRange, signal: AbortSignal): Promise<Candle[]>;
  watchCandles(selection: Selection, handlers: StreamHandlers<LiveCandle>): Unsubscribe;
}
