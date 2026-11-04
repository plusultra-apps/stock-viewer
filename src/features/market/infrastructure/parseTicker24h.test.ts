import ticker24hr from '../../../../fixtures/binance/ticker24hr.json';
import { parseTicker24h } from './parseTicker24h';

describe('24시간 시세 응답', () => {
  it('현재가·등락률·거래대금을 숫자로 바꾼다', () => {
    const btc = parseTicker24h(ticker24hr).find((ticker) => ticker.symbol === 'BTCUSDT');
    expect(btc).toEqual({ symbol: 'BTCUSDT', lastPrice: 93412.5, changePercent: 0.44, quoteVolume: 18400000000 });
  });

  it('값이 빠졌으면 그 칸만 비운다', () => {
    const unlisted = parseTicker24h(ticker24hr).find((ticker) => ticker.symbol === 'UNLISTEDUSDT');
    expect(unlisted?.changePercent).toBeNull();
    expect(unlisted?.lastPrice).toBe(1);
  });

  it('본문이 배열이 아니면 오류다', () => {
    expect(() => parseTicker24h({})).toThrow();
  });
});
