import type { StreamHandlers, Unsubscribe } from '../../connection/application/StreamHandlers';
import type { Market } from '../domain/Market';
import type { Ticker, TickerPatch } from '../domain/Ticker';

export interface MarketSnapshot {
  readonly markets: readonly Market[];
  readonly tickers: readonly Ticker[];
}

// 종목 목록을 받아오는 경계 (시험에서는 가짜로 바꾼다).
export interface MarketFeed {
  loadMarkets(): Promise<MarketSnapshot>;
  // 거래 중인 종목만 다시 받는다 (거래 종료 확인용, 시세는 받지 않는다)
  refreshMarkets(): Promise<readonly Market[]>;
  watchTickers(handlers: StreamHandlers<readonly TickerPatch[]>): Unsubscribe;
}
