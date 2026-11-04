import { backoffDelay } from './backoffDelay';

describe('재연결 간격', () => {
  it('1초에서 두 배씩 늘어난다', () => {
    const delays = [0, 1, 2, 3].map((attempt) => backoffDelay(attempt, 1));
    expect(delays).toEqual([1000, 2000, 4000, 8000]);
  });

  it('15초를 넘지 않는다', () => {
    expect(backoffDelay(4, 1)).toBe(15_000);
    expect(backoffDelay(20, 1)).toBe(15_000);
  });

  it('무작위 값에 따라 절반에서 전체 사이로 흔들린다', () => {
    expect(backoffDelay(0, 0)).toBe(500);
    expect(backoffDelay(0, 0.5)).toBe(750);
  });
});
