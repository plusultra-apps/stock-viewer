import type { CandleFeed } from '../features/chart/application/CandleFeed';
import { BinanceCandleFeed, type BinanceCandleFeedDeps } from '../features/chart/infrastructure/BinanceCandleFeed';
import type { MarketFeed } from '../features/market/application/MarketFeed';
import { BinanceMarketFeed } from '../features/market/infrastructure/BinanceMarketFeed';
import { RateLimit } from '../features/connection/domain/RateLimit';
import type { HttpDeps } from '../features/connection/infrastructure/binanceHttp';

// 화면이 쓰는 시세 공급자 묶음. 조립은 여기서만 한다 (composition root).
export interface AppServices {
  readonly marketFeed: MarketFeed;
  readonly candleFeed: CandleFeed;
}

export function createBinanceServices(): AppServices {
  const shared = sharedDeps();
  return {
    marketFeed: new BinanceMarketFeed(shared),
    candleFeed: new BinanceCandleFeed(shared),
  };
}

// 요청 제한 상태는 목록과 차트가 함께 써야 한다 (IP 단위 제한)
function sharedDeps(): BinanceCandleFeedDeps {
  const http: HttpDeps = {
    fetch: (url, init) => fetch(url, init),
    now: () => Date.now(),
    gate: new RateLimit(),
  };
  return {
    http,
    createSocket: (url: string) => new WebSocket(url),
    browserEvents: window,
    random: Math.random,
  };
}
