import type { Unsubscribe } from '../../connection/application/StreamHandlers';
import type { ConnectionStatus } from '../../connection/domain/ConnectionStatus';
import { FeedError, toFeedError } from '../../connection/domain/FeedError';
import { MarketList } from '../domain/MarketList';
import { MARKET_REFRESH_MS, TICKER_FLUSH_MS } from '../domain/marketTiming';
import type { TickerPatch } from '../domain/Ticker';
import type { MarketFeed } from './MarketFeed';

export interface MarketCallbacks {
  readonly onLoaded: (list: MarketList) => void;
  readonly onFailed: (error: FeedError) => void;
  readonly onUpdate: (patches: readonly TickerPatch[]) => void;
  readonly onStatus: (status: ConnectionStatus) => void;
  // 거래 종료 확인이 실패하면 알리고, 성공하면 null 로 지운다 (목록 화면은 그대로 둔다)
  readonly onRefreshError: (error: FeedError | null) => void;
}

const noop: Unsubscribe = () => undefined;

// 목록을 받고 실시간 시세를 구독하는 한 번의 세션. stop 하면 구독과 타이머를 모두 정리한다 (AC16).
// 시세는 TICKER_FLUSH_MS 마다 한 번에 넘기고, 거래 종료는 MARKET_REFRESH_MS 마다 확인한다.
export class MarketSession {
  private readonly feed: MarketFeed;
  private readonly callbacks: MarketCallbacks;
  private readonly pending: TickerPatch[] = [];
  private readonly flushTimer: ReturnType<typeof setInterval>;
  private readonly refreshTimer: ReturnType<typeof setInterval>;
  private list: MarketList | null = null;
  private loading = false;
  private watching = false;
  private lostOnce = false;
  private unsubscribe: Unsubscribe = noop;
  private active = true;

  constructor(feed: MarketFeed, callbacks: MarketCallbacks) {
    this.feed = feed;
    this.callbacks = callbacks;
    this.flushTimer = setInterval(() => this.flush(), TICKER_FLUSH_MS);
    this.refreshTimer = setInterval(() => void this.refreshEnded(), MARKET_REFRESH_MS);
    void this.load();
  }

  stop(): void {
    this.active = false;
    clearInterval(this.flushTimer);
    clearInterval(this.refreshTimer);
    this.unsubscribe();
  }

  // 목록 받기. 이미 받는 중이면 새로 보내지 않는다 (03-tech-design 6절 동시성).
  private async load(): Promise<void> {
    if (this.loading || !this.active) {
      return;
    }
    this.loading = true;
    try {
      await this.fetchList();
    } catch (error: unknown) {
      this.reportFailure(error);
    } finally {
      this.loading = false;
    }
  }

  private async fetchList(): Promise<void> {
    const snapshot = await this.feed.loadMarkets();
    if (this.active) {
      this.list = MarketList.fromSnapshot(snapshot.markets, snapshot.tickers);
      this.callbacks.onLoaded(this.list);
      this.watch();
    }
  }

  private reportFailure(error: unknown): void {
    if (this.active) {
      console.warn('종목 목록을 받지 못했다', error);
      this.callbacks.onFailed(toFeedError(error));
    }
  }

  private watch(): void {
    if (this.watching) {
      return;
    }
    this.watching = true;
    this.unsubscribe = this.feed.watchTickers({
      onData: (patches) => {
        this.pending.push(...patches);
      },
      onStatus: (status) => this.handleStatus(status),
    });
  }

  // 끊겼다가 다시 실시간이 되면 목록을 다시 받아 거래대금 순서를 맞춘다 (AC7).
  private handleStatus(status: ConnectionStatus): void {
    this.callbacks.onStatus(status);
    if (status.state === 'reconnecting' || status.state === 'offline') {
      this.lostOnce = true;
    } else if (status.state === 'live' && this.lostOnce) {
      this.lostOnce = false;
      void this.load();
    }
  }

  private async refreshEnded(): Promise<void> {
    if (!this.active || this.list === null) {
      return;
    }
    try {
      const markets = await this.feed.refreshMarkets();
      if (this.active) {
        this.applyTradingSymbols(markets.map((market) => market.symbol));
      }
    } catch (error: unknown) {
      this.reportRefreshFailure(error);
    }
  }

  private reportRefreshFailure(error: unknown): void {
    if (this.active) {
      console.warn('거래 종료 확인에 실패했다', error);
      this.callbacks.onRefreshError(toFeedError(error));
    }
  }

  private applyTradingSymbols(trading: readonly string[]): void {
    const tradingSet = new Set(trading);
    this.callbacks.onRefreshError(null);
    if (this.list === null) {
      return;
    }
    const ended = new Set(this.list.rows().map((entry) => entry.market.symbol).filter((s) => !tradingSet.has(s)));
    if (ended.size > 0) {
      this.list = this.list.withoutSymbols(ended);
      this.callbacks.onLoaded(this.list);
    }
  }

  private flush(): void {
    if (this.active && this.pending.length > 0) {
      this.callbacks.onUpdate(this.pending.splice(0));
    }
  }
}
