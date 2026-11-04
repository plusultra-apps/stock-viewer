import type { Market } from './Market';
import { emptyTicker, mergeTicker, type Ticker, type TickerPatch } from './Ticker';

export interface MarketEntry {
  readonly market: Market;
  readonly ticker: Ticker;
}

// 목록은 받은 시점의 거래대금 순서를 지킨다. 실시간 값은 값만 바꾸고 순서는 바꾸지 않는다 (02 질문 2의 A).
// 다시 정렬하는 길은 fromSnapshot 을 새로 부르는 것뿐이다 (재연결 때).
export class MarketList {
  private readonly entries: readonly MarketEntry[];
  private readonly bySymbol: ReadonlyMap<string, MarketEntry>;

  private constructor(entries: readonly MarketEntry[]) {
    this.entries = entries;
    this.bySymbol = new Map(entries.map((entry) => [entry.market.symbol, entry] as const));
  }

  static fromSnapshot(markets: readonly Market[], tickers: readonly Ticker[]): MarketList {
    const tickerBySymbol = new Map(tickers.map((ticker) => [ticker.symbol, ticker] as const));
    const entries = uniqueBySymbol(markets).map((market) => ({
      market,
      ticker: tickerBySymbol.get(market.symbol) ?? emptyTicker(market.symbol),
    }));
    return new MarketList(entries.sort(byQuoteVolumeDesc));
  }

  rows(): readonly MarketEntry[] {
    return this.entries;
  }

  get(symbol: string): MarketEntry | undefined {
    return this.bySymbol.get(symbol);
  }

  has(symbol: string): boolean {
    return this.bySymbol.has(symbol);
  }

  // 거래가 끝난 종목을 뺀다. 나머지 순서는 그대로 둔다.
  withoutSymbols(symbols: ReadonlySet<string>): MarketList {
    const kept = this.entries.filter((entry) => !symbols.has(entry.market.symbol));
    return kept.length === this.entries.length ? this : new MarketList(kept);
  }

  applyPatches(patches: readonly TickerPatch[]): MarketList {
    const changed = new Map<string, Ticker>();
    for (const patch of patches) {
      const entry = this.bySymbol.get(patch.symbol);
      if (entry !== undefined) {
        changed.set(patch.symbol, mergeTicker(changed.get(patch.symbol) ?? entry.ticker, patch));
      }
    }
    if (changed.size === 0) {
      return this;
    }
    return new MarketList(this.entries.map((entry) => withChangedTicker(entry, changed)));
  }
}

function uniqueBySymbol(markets: readonly Market[]): Market[] {
  const seen = new Set<string>();
  const unique: Market[] = [];
  for (const market of markets) {
    if (!seen.has(market.symbol)) {
      seen.add(market.symbol);
      unique.push(market);
    }
  }
  return unique;
}

function byQuoteVolumeDesc(a: MarketEntry, b: MarketEntry): number {
  const volumeDiff = (b.ticker.quoteVolume ?? 0) - (a.ticker.quoteVolume ?? 0);
  if (volumeDiff !== 0) {
    return volumeDiff;
  }
  return a.market.symbol < b.market.symbol ? -1 : Number(a.market.symbol > b.market.symbol);
}

function withChangedTicker(entry: MarketEntry, changed: ReadonlyMap<string, Ticker>): MarketEntry {
  const ticker = changed.get(entry.market.symbol);
  return ticker === undefined ? entry : { market: entry.market, ticker };
}
