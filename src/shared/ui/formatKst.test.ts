import { formatKst, formatKstClock } from './formatKst';

describe('봉 시각 표시', () => {
  it('UTC 00:00 은 한국 시간 09:00 으로 보인다', () => {
    expect(formatKst(Date.UTC(2026, 9, 29, 0, 0))).toContain('09:00');
  });

  it('한국 시간 표기임을 글자로 붙인다', () => {
    expect(formatKst(Date.UTC(2026, 9, 29, 0, 0))).toContain('KST');
  });
});

describe('차트 시간 눈금 표시', () => {
  it('눈금은 한국 시간 시·분만 보인다', () => {
    expect(formatKstClock(Date.UTC(2026, 9, 29, 0, 1))).toBe('09:01');
  });
});
