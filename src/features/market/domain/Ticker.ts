// 시세. 값이 아직 없거나 빠졌으면 null (화면에서는 "--").
export interface Ticker {
  readonly symbol: string;
  readonly lastPrice: number | null;
  readonly changePercent: number | null;
  readonly quoteVolume: number | null;
}

// 스트림은 바뀐 값만 올 수 있어서 있는 필드만 담는다.
export interface TickerPatch {
  readonly symbol: string;
  readonly lastPrice?: number;
  readonly changePercent?: number;
  readonly quoteVolume?: number;
}

export function emptyTicker(symbol: string): Ticker {
  return { symbol, lastPrice: null, changePercent: null, quoteVolume: null };
}

export function mergeTicker(base: Ticker, patch: TickerPatch): Ticker {
  return {
    symbol: base.symbol,
    lastPrice: patch.lastPrice ?? base.lastPrice,
    changePercent: patch.changePercent ?? base.changePercent,
    quoteVolume: patch.quoteVolume ?? base.quoteVolume,
  };
}
