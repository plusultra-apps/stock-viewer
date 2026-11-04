import { CandleSeries } from './CandleSeries';
import { CANDLE_CAP } from './chartSettings';
import type { Candle } from './Candle';

const MINUTE_MS = 60_000;
const START = 1_761_699_600_000;

function candle(index: number, close = 100): Candle {
  return { openTime: START + index * MINUTE_MS, open: 100, high: 110, low: 90, close, volume: 5 };
}

describe('봉 목록', () => {
  it('같은 시작 시각의 봉이 오면 교체하고 개수는 그대로다', () => {
    const series = CandleSeries.fromCandles([candle(0), candle(1)]);
    const updated = series.upsert(candle(1, 123));
    expect(updated.all()).toHaveLength(2);
    expect(updated.last()?.close).toBe(123);
  });

  it('다음 시작 시각의 봉이 오면 뒤에 하나 붙는다', () => {
    const series = CandleSeries.fromCandles([candle(0), candle(1)]);
    const updated = series.upsert(candle(2));
    expect(updated.all().map((item) => item.openTime)).toEqual([candle(0), candle(1), candle(2)].map((item) => item.openTime));
  });

  it('지난 시작 시각의 봉은 무시한다', () => {
    const series = CandleSeries.fromCandles([candle(0), candle(1)]);
    const updated = series.upsert(candle(0, 999));
    expect(updated.all()).toHaveLength(2);
    expect(updated.all()[0]?.close).toBe(100);
  });

  it('상한을 넘으면 가장 오래된 봉부터 버린다', () => {
    const many = Array.from({ length: CANDLE_CAP + 1 }, (_, index) => candle(index));
    const series = CandleSeries.fromCandles(many);
    expect(series.all()).toHaveLength(CANDLE_CAP);
    expect(series.all()[0]?.openTime).toBe(candle(1).openTime);
  });

  it('처음 받은 봉들은 시작 시각 순서로 정리되고 같은 시각은 하나만 남는다', () => {
    const series = CandleSeries.fromCandles([candle(2), candle(0), candle(1), candle(1, 555)]);
    expect(series.all().map((item) => item.openTime)).toEqual([0, 1, 2].map((index) => candle(index).openTime));
    expect(series.all()[1]?.close).toBe(555);
  });

  it('비어 있으면 마지막 봉이 없다', () => {
    expect(CandleSeries.empty().last()).toBeUndefined();
  });
});
