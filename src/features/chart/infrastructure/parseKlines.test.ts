import klines from '../../../../fixtures/binance/klines.json';
import { parseKlines } from './parseKlines';

describe('봉 목록 응답', () => {
  it('각 줄을 시작 시각과 숫자 가격·거래량으로 바꾼다', () => {
    const candles = parseKlines(klines);
    expect(candles).toHaveLength(4);
    expect(candles[0]).toEqual({
      openTime: 1_761_699_600_000,
      open: 93300,
      high: 93400,
      low: 93250,
      close: 93380.1,
      volume: 120.5,
    });
  });

  it('줄 하나라도 읽을 수 없으면 오류다', () => {
    expect(() => parseKlines([[1, 'x', 2, 3, 4, 5]])).toThrow();
  });

  it('본문이 배열이 아니면 오류다', () => {
    expect(() => parseKlines({})).toThrow();
  });
});
