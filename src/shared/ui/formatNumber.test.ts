import { changeTone, formatChangePercent, formatPrice, formatQuoteVolume } from './formatNumber';

describe('숫자 표시', () => {
  it('가격은 가격 단위 자릿수로 고정한다', () => {
    expect(formatPrice(93412.5, 2)).toBe('93,412.50');
    expect(formatPrice(0.01234, 5)).toBe('0.01234');
  });

  it('값이 없으면 대시로 보인다', () => {
    expect(formatPrice(null, 2)).toBe('--');
    expect(formatChangePercent(null)).toBe('--');
  });

  it('등락률은 기호와 부호를 함께 보인다', () => {
    expect(formatChangePercent(0.44)).toBe('▲ +0.44%');
    expect(formatChangePercent(-1.12)).toBe('▼ -1.12%');
    expect(changeTone(-1.12)).toBe('value-down');
  });

  it('거래대금은 달러 약식으로 보인다', () => {
    expect(formatQuoteVolume(18_400_000_000)).toBe('$18.4B');
  });
});
