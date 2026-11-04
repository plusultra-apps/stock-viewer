import type { Unsubscribe } from '../../connection/application/StreamHandlers';
import type { ConnectionStatus } from '../../connection/domain/ConnectionStatus';
import { type FeedError, toFeedError } from '../../connection/domain/FeedError';
import type { Candle } from '../domain/Candle';
import { CandleSeries } from '../domain/CandleSeries';
import { CANDLE_CAP, INITIAL_CANDLE_COUNT } from '../domain/chartSettings';
import type { LiveCandle } from '../domain/LiveCandle';
import { planGapFill } from '../domain/planGapFill';
import { acceptsLive, type Selection } from '../domain/Selection';
import type { CandleFeed, CandleRange } from './CandleFeed';

export interface CandleCallbacks {
  // 봉 목록 전체를 다시 그린다 (처음 받기, 빠진 봉 채우기, 상한에서 봉이 밀려날 때)
  readonly onLoaded: (candles: readonly Candle[]) => void;
  // 봉 하나를 갱신한다 (진행 중 봉 움직임, 봉 닫힘)
  readonly onLive: (candle: Candle) => void;
  readonly onFailed: (error: FeedError) => void;
  readonly onStatus: (status: ConnectionStatus) => void;
}

const noop: Unsubscribe = () => undefined;

// 한 종목·간격을 보는 동안의 봉 흐름: 처음 받기 → 실시간 구독 → 재연결 때 빠진 봉 채우기.
// stop 하면 진행 중 요청을 끊고 구독을 닫는다. 멈춘 뒤 도착한 응답·메시지는 버린다 (AC15, AC16).
export class CandleSession {
  private readonly feed: CandleFeed;
  private readonly selection: Selection;
  private readonly callbacks: CandleCallbacks;
  private readonly now: () => number;
  private readonly controller = new AbortController();
  private series = CandleSeries.empty();
  private unsubscribe: Unsubscribe = noop;
  private active = true;
  private lostOnce = false;

  constructor(feed: CandleFeed, selection: Selection, callbacks: CandleCallbacks, now: () => number) {
    this.feed = feed;
    this.selection = selection;
    this.callbacks = callbacks;
    this.now = now;
    void this.start();
  }

  stop(): void {
    this.active = false;
    this.controller.abort();
    this.unsubscribe();
  }

  private async start(): Promise<void> {
    const candles = await this.fetchCandles({ limit: INITIAL_CANDLE_COUNT });
    if (candles !== null) {
      this.replaceAll(CandleSeries.fromCandles(candles));
      this.watch();
    }
  }

  // 응답이 없거나 멈춘 뒤면 null. 실패는 여기서 알린다.
  private async fetchCandles(range: CandleRange): Promise<readonly Candle[] | null> {
    try {
      const candles = await this.feed.loadCandles(this.selection, range, this.controller.signal);
      return this.active ? candles : null;
    } catch (error: unknown) {
      if (this.active) {
        console.warn('봉을 받지 못했다', error);
        this.callbacks.onFailed(toFeedError(error));
      }
      return null;
    }
  }

  private replaceAll(series: CandleSeries): void {
    this.series = series;
    this.callbacks.onLoaded(series.all());
  }

  private watch(): void {
    this.unsubscribe = this.feed.watchCandles(this.selection, {
      onData: (live) => this.applyLive(live),
      onStatus: (status) => this.handleStatus(status),
    });
  }

  private applyLive(live: LiveCandle): void {
    if (!this.active || !acceptsLive(this.selection, live)) {
      return;
    }
    const previous = this.series;
    const next = previous.upsert(live.candle);
    if (next === previous) {
      return;
    }
    this.series = next;
    this.notifyLive(previous, next, live.candle);
  }

  // 상한에서 오래된 봉이 밀려나면 차트 전체를 다시 그린다 (메모리 일정, AC11)
  private notifyLive(previous: CandleSeries, next: CandleSeries, candle: Candle): void {
    const shifted = previous.all().length >= CANDLE_CAP && next.last()?.openTime !== previous.last()?.openTime;
    if (shifted) {
      this.callbacks.onLoaded(next.all());
    } else {
      this.callbacks.onLive(candle);
    }
  }

  private handleStatus(status: ConnectionStatus): void {
    if (!this.active) {
      return;
    }
    this.callbacks.onStatus(status);
    if (status.state === 'reconnecting' || status.state === 'offline') {
      this.lostOnce = true;
    } else if (status.state === 'live' && this.lostOnce) {
      this.lostOnce = false;
      void this.fillGap();
    }
  }

  // 끊긴 동안의 봉을 마지막 봉부터 다시 받아 맞춘다 (AC7).
  private async fillGap(): Promise<void> {
    const plan = planGapFill(this.series, this.now(), this.selection.interval);
    const range: CandleRange =
      plan.kind === 'fromLast' ? { startTime: plan.startTime, limit: plan.limit } : { limit: plan.limit };
    const candles = await this.fetchCandles(range);
    if (candles === null) {
      return;
    }
    this.replaceAll(plan.kind === 'reload' ? CandleSeries.fromCandles(candles) : this.series.merge(candles));
  }
}
