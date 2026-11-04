import type { CandleSeries } from './CandleSeries';
import { INITIAL_CANDLE_COUNT, KLINES_MAX_LIMIT } from './chartSettings';
import { type Interval, intervalMs } from './Interval';

export type GapFillPlan =
  | { readonly kind: 'fromLast'; readonly startTime: number; readonly limit: number }
  | { readonly kind: 'reload'; readonly limit: number };

// 재연결 뒤에 맞추는 계획. 마지막 봉부터 다시 받아 진행 중이던 값도 맞춘다.
// 빠진 봉이 한 번에 받을 수 없을 만큼 많으면 최근 봉을 통째로 다시 받는다.
export function planGapFill(series: CandleSeries, nowMs: number, interval: Interval): GapFillPlan {
  const last = series.last();
  if (last === undefined) {
    return { kind: 'reload', limit: INITIAL_CANDLE_COUNT };
  }
  const missing = Math.max(0, Math.floor((nowMs - last.openTime) / intervalMs(interval)));
  const limit = missing + 1;
  if (limit > KLINES_MAX_LIMIT) {
    return { kind: 'reload', limit: INITIAL_CANDLE_COUNT };
  }
  return { kind: 'fromLast', startTime: last.openTime, limit };
}
