import type { StreamHandlers, Unsubscribe } from '../../connection/application/StreamHandlers';
import { KLINE_SILENCE_MS } from '../../connection/domain/connectionTiming';
import { binanceEndpoints } from '../../connection/infrastructure/binanceEndpoints';
import { getJson, type HttpDeps } from '../../connection/infrastructure/binanceHttp';
import {
  ReconnectingSocket,
  type ReconnectingSocketOptions,
  type SocketLike,
} from '../../connection/infrastructure/ReconnectingSocket';
import type { CandleFeed, CandleRange } from '../application/CandleFeed';
import type { Candle } from '../domain/Candle';
import type { LiveCandle } from '../domain/LiveCandle';
import type { Selection } from '../domain/Selection';
import { parseKlines } from './parseKlines';
import { parseKlineStream } from './parseKlineStream';

export interface BinanceCandleFeedDeps {
  readonly http: HttpDeps;
  readonly createSocket: (url: string) => SocketLike;
  readonly browserEvents: EventTarget;
  readonly random: () => number;
}

// 바이낸스 공개 시세로 봉을 받는다. 키·계정은 쓰지 않는다.
export class BinanceCandleFeed implements CandleFeed {
  private readonly deps: BinanceCandleFeedDeps;

  constructor(deps: BinanceCandleFeedDeps) {
    this.deps = deps;
  }

  async loadCandles(selection: Selection, range: CandleRange, signal: AbortSignal): Promise<Candle[]> {
    const url = binanceEndpoints.klines(selection.symbol, selection.interval, range.limit, range.startTime);
    return parseKlines(await getJson(url, this.deps.http, signal));
  }

  watchCandles(selection: Selection, handlers: StreamHandlers<LiveCandle>): Unsubscribe {
    const socket = new ReconnectingSocket(this.socketOptions(selection, handlers));
    socket.start();
    return () => socket.stop();
  }

  private socketOptions(selection: Selection, handlers: StreamHandlers<LiveCandle>): ReconnectingSocketOptions {
    return {
      url: binanceEndpoints.klineStream(selection.symbol, selection.interval),
      createSocket: this.deps.createSocket,
      onMessage: (text) => forwardLive(text, handlers),
      onStatus: handlers.onStatus,
      silenceMs: KLINE_SILENCE_MS,
      random: this.deps.random,
      browserEvents: this.deps.browserEvents,
    };
  }
}

// 형식이 틀린 메시지는 parseKlineStream 이 버린다 (연결은 유지).
function forwardLive(text: string, handlers: StreamHandlers<LiveCandle>): void {
  const live = parseKlineStream(text);
  if (live !== null) {
    handlers.onData(live);
  }
}
