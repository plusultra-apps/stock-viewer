import { MarketList } from './MarketList';
import type { Market } from './Market';
import type { Ticker } from './Ticker';

function market(symbol: string): Market {
  return { symbol, baseAsset: symbol.replace('USDT', ''), quoteAsset: 'USDT', tickSize: '0.1' };
}

function ticker(symbol: string, quoteVolume: number | null, lastPrice: number | null = 1): Ticker {
  return { symbol, lastPrice, changePercent: 0, quoteVolume };
}

function symbolsOf(list: MarketList): string[] {
  return list.rows().map((entry) => entry.market.symbol);
}

describe('종목 목록', () => {
  it('24시간 거래대금이 큰 순서로 나온다', () => {
    const list = MarketList.fromSnapshot(
      [market('AAAUSDT'), market('BBBUSDT'), market('CCCUSDT')],
      [ticker('AAAUSDT', 10), ticker('BBBUSDT', 30), ticker('CCCUSDT', 20)],
    );
    expect(symbolsOf(list)).toEqual(['BBBUSDT', 'CCCUSDT', 'AAAUSDT']);
  });

  it('거래대금이 같으면 기호 순서다', () => {
    const list = MarketList.fromSnapshot(
      [market('ZZZUSDT'), market('AAAUSDT')],
      [ticker('ZZZUSDT', 5), ticker('AAAUSDT', 5)],
    );
    expect(symbolsOf(list)).toEqual(['AAAUSDT', 'ZZZUSDT']);
  });

  it('같은 기호가 두 번 오면 한 줄만 남는다', () => {
    const list = MarketList.fromSnapshot([market('AAAUSDT'), market('AAAUSDT')], []);
    expect(symbolsOf(list)).toEqual(['AAAUSDT']);
  });

  it('실시간 시세가 와도 목록 순서는 바뀌지 않고 값만 바뀐다', () => {
    const list = MarketList.fromSnapshot(
      [market('AAAUSDT'), market('BBBUSDT')],
      [ticker('AAAUSDT', 10, 1), ticker('BBBUSDT', 30, 2)],
    );
    const updated = list.applyPatches([{ symbol: 'AAAUSDT', quoteVolume: 999, lastPrice: 7 }]);
    expect(symbolsOf(updated)).toEqual(['BBBUSDT', 'AAAUSDT']);
    expect(updated.get('AAAUSDT')?.ticker.lastPrice).toBe(7);
    expect(updated.get('AAAUSDT')?.ticker.quoteVolume).toBe(999);
  });

  it('목록에 없는 기호의 시세는 무시한다', () => {
    const list = MarketList.fromSnapshot([market('AAAUSDT')], []);
    const updated = list.applyPatches([{ symbol: 'NOTLISTEDUSDT', lastPrice: 1 }]);
    expect(symbolsOf(updated)).toEqual(['AAAUSDT']);
    expect(updated.has('NOTLISTEDUSDT')).toBe(false);
  });

  it('시세가 일부 필드만 와도 기존 값은 남는다', () => {
    const list = MarketList.fromSnapshot([market('AAAUSDT')], [ticker('AAAUSDT', 10, 1)]);
    const updated = list.applyPatches([{ symbol: 'AAAUSDT', lastPrice: 5 }]);
    expect(updated.get('AAAUSDT')?.ticker).toEqual({ symbol: 'AAAUSDT', lastPrice: 5, changePercent: 0, quoteVolume: 10 });
  });
});

describe('거래가 끝난 종목 빼기', () => {
  it('빠진 종목만 목록에서 사라지고 나머지 순서는 그대로다', () => {
    const list = MarketList.fromSnapshot(
      [market('AAAUSDT'), market('BBBUSDT'), market('CCCUSDT')],
      [ticker('AAAUSDT', 300), ticker('BBBUSDT', 200), ticker('CCCUSDT', 100)],
    );
    const trimmed = list.withoutSymbols(new Set(['BBBUSDT']));
    expect(symbolsOf(trimmed)).toEqual(['AAAUSDT', 'CCCUSDT']);
    expect(trimmed.has('BBBUSDT')).toBe(false);
  });
});
