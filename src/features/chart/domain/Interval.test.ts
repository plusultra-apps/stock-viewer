import { INTERVALS, intervalMs, isInterval } from './Interval';

describe('봉 간격', () => {
  it('간격은 1m 5m 15m 1h 4h 1d 여섯 개뿐이다', () => {
    expect([...INTERVALS]).toEqual(['1m', '5m', '15m', '1h', '4h', '1d']);
  });

  it('15m 봉 하나의 시간 폭은 15분이다', () => {
    expect(intervalMs('15m')).toBe(15 * 60_000);
  });

  it('목록에 없는 간격은 받지 않는다', () => {
    expect(isInterval('3m')).toBe(false);
    expect(isInterval('4h')).toBe(true);
  });
});
