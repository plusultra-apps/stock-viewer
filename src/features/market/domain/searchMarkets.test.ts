import { MarketList } from './MarketList';
import { searchMarkets } from './searchMarkets';
import type { Market } from './Market';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', '1000PEPEUSDT'];
// 거래대금이 모두 0 이라 기호 순서(ASCII)로 정렬된다
const SORTED = ['1000PEPEUSDT', 'BTCUSDT', 'ETHUSDT'];
const LIST = MarketList.fromSnapshot(
  SYMBOLS.map((symbol): Market => ({ symbol, baseAsset: symbol, quoteAsset: 'USDT', tickSize: '0.1' })),
  [],
);

function found(query: string): string[] {
  return searchMarkets(LIST.rows(), query).map((entry) => entry.market.symbol);
}

describe('종목 검색', () => {
  it('pepe 로 찾으면 1000PEPEUSDT 가 나온다', () => {
    expect(found('pepe')).toEqual(['1000PEPEUSDT']);
  });

  it('대소문자를 가리지 않는다', () => {
    expect(found('BtC')).toEqual(['BTCUSDT']);
  });

  it('일치하는 종목이 없으면 빈 결과다', () => {
    expect(found('zzzz')).toEqual([]);
  });

  it('검색어가 비었거나 공백뿐이면 전체 목록이다', () => {
    expect(found('')).toEqual(SORTED);
    expect(found('   ')).toEqual(SORTED);
  });

  it('검색 결과도 목록 순서를 따른다', () => {
    expect(found('USDT')).toEqual(SORTED);
  });
});
