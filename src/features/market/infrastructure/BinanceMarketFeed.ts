import type { StreamHandlers, Unsubscribe } from '../../connection/application/StreamHandlers';
import { TICKER_SILENCE_MS } from '../../connection/domain/connectionTiming';
import { binanceEndpoints } from '../../connection/infrastructure/binanceEndpoints';
import { getJson, type HttpDeps } from '../../connection/infrastructure/binanceHttp';
import { ReconnectingSocket, type SocketLike } from '../../connection/infrastructure/ReconnectingSocket';
import type { MarketFeed, MarketSnapshot } from '../application/MarketFeed';
import type { Market } from '../domain/Market';
import type { TickerPatch } from '../domain/Ticker';
import { parseExchangeInfo } from './parseExchangeInfo';
import { parseTicker24h } from './parseTicker24h';
import { parseTickerStream } from './parseTickerStream';

export interface BinanceMarketFeedDeps {
  readonly http: HttpDeps;
  readonly createSocket: (url: string) => SocketLike;
  readonly browserEvents: EventTarget;
  readonly random: () => number;
}

// 바이낸스 공개 시세로 종목 목록을 받는다. 키·계정은 쓰지 않는다.
export class BinanceMarketFeed implements MarketFeed {
  private readonly deps: BinanceMarketFeedDeps;

  constructor(deps: BinanceMarketFeedDeps) {
    this.deps = deps;
  }

  async loadMarkets(): Promise<MarketSnapshot> {
    const [info, tickers] = await Promise.all([
      getJson(binanceEndpoints.exchangeInfo, this.deps.http),
      getJson(binanceEndpoints.ticker24hr, this.deps.http),
    ]);
    return { markets: parseExchangeInfo(info), tickers: parseTicker24h(tickers) };
  }

  async refreshMarkets(): Promise<readonly Market[]> {
    return parseExchangeInfo(await getJson(binanceEndpoints.exchangeInfo, this.deps.http));
  }

  watchTickers(handlers: StreamHandlers<readonly TickerPatch[]>): Unsubscribe {
    const socket = new ReconnectingSocket({
      url: binanceEndpoints.marketStream,
      createSocket: this.deps.createSocket,
      onMessage: (text) => handlers.onData(parseTickerStream(text)),
      onStatus: handlers.onStatus,
      silenceMs: TICKER_SILENCE_MS,
      random: this.deps.random,
      browserEvents: this.deps.browserEvents,
    });
    socket.start();
    return () => socket.stop();
  }
}
