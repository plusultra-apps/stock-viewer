import { unitMultiplier } from './unitMultiplier';

describe('1000배 단위 종목', () => {
  it('1000PEPEUSDT 는 1000배 단위다', () => {
    expect(unitMultiplier('1000PEPEUSDT')).toBe(1000);
  });

  it('1000000MOGUSDT 는 100만 배 단위다', () => {
    expect(unitMultiplier('1000000MOGUSDT')).toBe(1_000_000);
  });

  it('BTCUSDT 는 해당 없다', () => {
    expect(unitMultiplier('BTCUSDT')).toBeNull();
  });

  it('0 이 세 개보다 적으면 해당 없다', () => {
    expect(unitMultiplier('100ABCUSDT')).toBeNull();
  });
});
