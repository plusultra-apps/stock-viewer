import klineStream from '../../../../fixtures/binance/klineStream.json';
import { parseKlineStream } from './parseKlineStream';

describe('봉 실시간 메시지', () => {
  it('종목·간격과 진행 중 봉의 값을 담는다', () => {
    const live = parseKlineStream(JSON.stringify(klineStream));
    expect(live).toEqual({
      symbol: 'BTCUSDT',
      interval: '1m',
      candle: {
        openTime: 1_761_699_780_000,
        open: 93310.5,
        high: 93360,
        low: 93300,
        close: 93345,
        volume: 70,
      },
      closed: false,
    });
  });

  it('형식이 틀린 메시지는 버린다', () => {
    expect(parseKlineStream('{not json')).toBeNull();
    expect(parseKlineStream('{"e":"kline","s":"BTCUSDT","k":{"i":"3m"}}')).toBeNull();
  });
});
