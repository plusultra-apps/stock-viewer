import { RateLimit } from './RateLimit';

describe('요청 제한', () => {
  it('대기 시간이 끝나기 전에는 남은 시간이 남아 있다', () => {
    const limit = new RateLimit();
    limit.blockFor(1000, 60_000);
    expect(limit.remainingMs(1000)).toBe(60_000);
    expect(limit.remainingMs(30_999)).toBe(30_001);
  });

  it('대기 시간이 지나면 남은 시간은 0이다', () => {
    const limit = new RateLimit();
    limit.blockFor(1000, 60_000);
    expect(limit.remainingMs(61_000)).toBe(0);
    expect(limit.remainingMs(99_999_999)).toBe(0);
  });

  it('차단이 없으면 남은 시간은 0이다', () => {
    expect(new RateLimit().remainingMs(5)).toBe(0);
  });
});
