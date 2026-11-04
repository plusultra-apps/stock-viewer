import { CandleSeries } from './CandleSeries';
import { planGapFill } from './planGapFill';
import type { Candle } from './Candle';

const MINUTE_MS = 60_000;
const LAST_OPEN = 1_761_699_600_000;

function candleAt(openTime: number, close: number): Candle {
  return { openTime, open: 1, high: 2, low: 0, close, volume: 3 };
}

describe('끊긴 동안 봉 채우기', () => {
  it('끊긴 동안의 봉을 받아 합치면 시작 시각이 1분씩 이어진다', () => {
    const series = CandleSeries.fromCandles([candleAt(LAST_OPEN, 1)]);
    const now = LAST_OPEN + 3 * MINUTE_MS + 1000;
    const plan = planGapFill(series, now, '1m');
    expect(plan).toEqual({ kind: 'fromLast', startTime: LAST_OPEN, limit: 4 });

    const received = [0, 1, 2, 3].map((index) => candleAt(LAST_OPEN + index * MINUTE_MS, 2));
    const merged = series.merge(received);
    const openTimes = merged.all().map((item) => item.openTime);
    const gaps = openTimes.slice(1).map((time, index) => time - (openTimes[index] ?? 0));
    expect(gaps.every((gap) => gap === MINUTE_MS)).toBe(true);
    expect(merged.all()).toHaveLength(4);
  });

  it('빠진 봉이 한 번에 받을 수 있는 수보다 많으면 최근 500개를 다시 받는다', () => {
    const series = CandleSeries.fromCandles([candleAt(LAST_OPEN, 1)]);
    const now = LAST_OPEN + 2000 * MINUTE_MS;
    expect(planGapFill(series, now, '1m')).toEqual({ kind: 'reload', limit: 500 });
  });

  it('봉이 하나도 없으면 최근 500개를 받는다', () => {
    expect(planGapFill(CandleSeries.empty(), LAST_OPEN, '1m')).toEqual({ kind: 'reload', limit: 500 });
  });
});
