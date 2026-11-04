import tickerStream from '../../../../fixtures/binance/tickerStream.json';
import { parseTickerStream } from './parseTickerStream';

describe('전 종목 시세 스트림 메시지', () => {
  it('종목마다 받은 값만 담은 갱신을 돌려준다', () => {
    const patches = parseTickerStream(JSON.stringify(tickerStream));
    expect(patches[0]).toEqual({ symbol: 'BTCUSDT', lastPrice: 93420.1, changePercent: 0.44, quoteVolume: 18400100000 });
  });

  it('일부 필드만 온 종목은 그 필드만 담는다', () => {
    const patches = parseTickerStream(JSON.stringify(tickerStream));
    expect(patches.find((patch) => patch.symbol === 'ETHUSDT')).toEqual({ symbol: 'ETHUSDT', lastPrice: 3521 });
  });

  it('형식이 틀린 메시지는 빈 갱신으로 버린다', () => {
    expect(parseTickerStream('{not json')).toEqual([]);
    expect(parseTickerStream('{"foo":1}')).toEqual([]);
  });
});
