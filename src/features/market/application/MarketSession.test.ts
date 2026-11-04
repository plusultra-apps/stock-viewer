import type { ConnectionStatus } from '../../connection/domain/ConnectionStatus';
import type { FeedError } from '../../connection/domain/FeedError';
import type { StreamHandlers } from '../../connection/application/StreamHandlers';
import type { Market } from '../domain/Market';
import type { MarketList } from '../domain/MarketList';
import { MARKET_REFRESH_MS } from '../domain/marketTiming';
import type { TickerPatch } from '../domain/Ticker';
import type { MarketFeed } from './MarketFeed';
import { type MarketCallbacks, MarketSession } from './MarketSession';

function market(symbol: string): Market {
  return { symbol, baseAsset: symbol.replace('USDT', ''), quoteAsset: 'USDT', tickSize: '0.1' };
}

interface Recorder {
  readonly callbacks: MarketCallbacks;
  readonly loaded: MarketList[];
  readonly refreshErrors: (FeedError | null)[];
  readonly statuses: ConnectionStatus[];
}

function recorder(): Recorder {
  const loaded: MarketList[] = [];
  const refreshErrors: (FeedError | null)[] = [];
  const statuses: ConnectionStatus[] = [];
  return {
    loaded,
    refreshErrors,
    statuses,
    callbacks: {
      onLoaded: (list) => loaded.push(list),
      onFailed: () => undefined,
      onUpdate: () => undefined,
      onStatus: (status) => statuses.push(status),
      onRefreshError: (error) => refreshErrors.push(error),
    },
  };
}

// 가짜 종목 공급자. 거래 종료는 refreshed 목록을 바꿔서 흉내 낸다.
function fakeFeed(refreshed: { current: Market[] }) {
  let handlers: StreamHandlers<readonly TickerPatch[]> | null = null;
  const loadCount = { value: 0 };
  const feed: MarketFeed = {
    loadMarkets: async () => {
      loadCount.value += 1;
      return { markets: [market('BTCUSDT'), market('ETHUSDT')], tickers: [] };
    },
    refreshMarkets: async () => refreshed.current,
    watchTickers: (next) => {
      handlers = next;
      return () => undefined;
    },
  };
  return { feed, loadCount, sendStatus: (status: ConnectionStatus) => handlers?.onStatus(status) };
}

describe('종목 목록 세션', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('거래가 끝난 종목은 10초 안에 목록에서 빠진다 (AC18)', async () => {
    vi.useFakeTimers();
    const refreshed = { current: [market('ETHUSDT')] };
    const log = recorder();
    const session = new MarketSession(fakeFeed(refreshed).feed, log.callbacks);
    await vi.advanceTimersByTimeAsync(MARKET_REFRESH_MS);
    expect(log.loaded.at(-1)?.get('BTCUSDT')).toBeUndefined();
    expect(log.loaded.at(-1)?.get('ETHUSDT')).toBeDefined();
    session.stop();
  });

  it('거래 종료 확인이 실패하면 알리고, 목록은 그대로 둔다', async () => {
    vi.useFakeTimers();
    const feed: MarketFeed = {
      loadMarkets: async () => ({ markets: [market('BTCUSDT')], tickers: [] }),
      refreshMarkets: async () => Promise.reject(new Error('막힘')),
      watchTickers: () => () => undefined,
    };
    const log = recorder();
    const session = new MarketSession(feed, log.callbacks);
    await vi.advanceTimersByTimeAsync(MARKET_REFRESH_MS);
    expect(log.refreshErrors.at(-1)?.kind).toBe('network');
    expect(log.loaded).toHaveLength(1);
    session.stop();
  });

  it('끊겼다가 다시 실시간이 되면 목록을 다시 받아 맞춘다 (AC7)', async () => {
    vi.useFakeTimers();
    const fake = fakeFeed({ current: [] });
    const log = recorder();
    const session = new MarketSession(fake.feed, log.callbacks);
    await vi.advanceTimersByTimeAsync(0);
    fake.sendStatus({ state: 'reconnecting', attempt: 1 });
    fake.sendStatus({ state: 'live' });
    await vi.advanceTimersByTimeAsync(0);
    expect(fake.loadCount.value).toBe(2);
    session.stop();
  });
});
