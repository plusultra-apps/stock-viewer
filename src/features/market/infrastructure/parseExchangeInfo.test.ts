import exchangeInfo from '../../../../fixtures/binance/exchangeInfo.json';
import { parseExchangeInfo } from './parseExchangeInfo';

function symbolsOf(input: unknown): string[] {
  return parseExchangeInfo(input).map((market) => market.symbol);
}

describe('종목 정보 응답', () => {
  it('거래 중인 무기한 종목만 목록에 들어간다', () => {
    expect(symbolsOf(exchangeInfo)).toEqual(['BTCUSDT', 'ETHUSDT', '1000PEPEUSDT']);
  });

  it('모르는 상태 값의 종목은 목록에서 뺀다', () => {
    expect(symbolsOf(exchangeInfo)).not.toContain('NEWSTATEUSDT');
    expect(symbolsOf(exchangeInfo)).not.toContain('OLDCOINUSDT');
  });

  it('필드가 빠진 종목은 건너뛰고 나머지는 보인다', () => {
    expect(symbolsOf(exchangeInfo)).toContain('BTCUSDT');
    expect(symbolsOf(exchangeInfo)).not.toContain('NOSTATUSUSDT');
  });

  it('응답에 새 종목이 추가되면 코드 수정 없이 목록에 나온다', () => {
    const extended = {
      symbols: [
        ...exchangeInfo.symbols,
        {
          symbol: 'SOMENEWUSDT',
          contractType: 'PERPETUAL',
          status: 'TRADING',
          baseAsset: 'SOMENEW',
          quoteAsset: 'USDT',
          filters: [{ filterType: 'PRICE_FILTER', tickSize: '0.001' }],
        },
      ],
    };
    expect(symbolsOf(extended)).toContain('SOMENEWUSDT');
  });

  it('종목 정보 본문이 객체가 아니면 오류다', () => {
    expect(() => parseExchangeInfo('nope')).toThrow();
  });

  it('가격 단위를 함께 가져온다', () => {
    const pepe = parseExchangeInfo(exchangeInfo).find((market) => market.symbol === '1000PEPEUSDT');
    expect(pepe?.tickSize).toBe('0.00001');
  });
});
