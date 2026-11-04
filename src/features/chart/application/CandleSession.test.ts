import type { StreamHandlers } from '../../connection/application/StreamHandlers';
import type { ConnectionStatus } from '../../connection/domain/ConnectionStatus';
import type { Candle } from '../domain/Candle';
import type { LiveCandle } from '../domain/LiveCandle';
import type { Selection } from '../domain/Selection';
import type { CandleFeed, CandleRange } from './CandleFeed';
import { CandleSession, type CandleCallbacks } from './CandleSession';

const SELECTION: Selection = { symbol: 'BTCUSDT', interval: '1m' };
const MINUTE_MS = 60_000;
const START = Date.UTC(2026, 9, 29, 0, 0);

function candle(openTime: number, close = 100): Candle {
  return { openTime, open: 100, high: 110, low: 90, close, volume: 5 };
}

function live(openTime: number, overrides: Partial<LiveCandle> = {}): LiveCandle {
  return { symbol: 'BTCUSDT', interval: '1m', candle: candle(openTime), closed: false, ...overrides };
}

interface PendingRequest {
  readonly range: CandleRange;
  readonly signal: AbortSignal;
  resolve(candles: Candle[]): void;
}

// 가짜 봉 공급자: 요청과 구독을 기록하고, 테스트가 응답을 직접 고른다.
function fakeFeed() {
  const requests: PendingRequest[] = [];
  const watchers: { handlers: StreamHandlers<LiveCandle> }[] = [];
  const feed: CandleFeed = {
    loadCandles: (_selection, range, signal) =>
      new Promise<Candle[]>((resolve) => {
        requests.push({ range, signal, resolve });
      }),
    watchCandles: (_selection, handlers) => {
      const watcher = { handlers };
      watchers.push(watcher);
      return () => {
        watchers.splice(watchers.indexOf(watcher), 1);
      };
    },
  };
  return { feed, requests, watchers };
}

function recorder() {
  const loaded: Candle[][] = [];
  const lives: Candle[] = [];
  const statuses: ConnectionStatus[] = [];
  const callbacks: CandleCallbacks = {
    onLoaded: (candles) => loaded.push([...candles]),
    onLive: (candle) => lives.push(candle),
    onFailed: () => undefined,
    onStatus: (status) => statuses.push(status),
  };
  return { callbacks, loaded, lives, statuses };
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('차트 봉 흐름', () => {
  it('처음 받은 봉을 차트에 전부 그린다 (AC1)', async () => {
    const { feed, requests } = fakeFeed();
    const log = recorder();
    new CandleSession(feed, SELECTION, log.callbacks, () => START);
    requests[0]?.resolve([candle(START), candle(START + MINUTE_MS)]);
    await settle();
    expect(log.loaded).toHaveLength(1);
    expect(log.loaded[0]?.map((c) => c.openTime)).toEqual([START, START + MINUTE_MS]);
  });

  it('같은 시작 시각의 실시간 봉은 바꾸고, 다음 시각의 봉은 뒤에 붙는다 (AC4)', async () => {
    const { feed, requests, watchers } = fakeFeed();
    const log = recorder();
    new CandleSession(feed, SELECTION, log.callbacks, () => START);
    requests[0]?.resolve([candle(START)]);
    await settle();
    watchers[0]?.handlers.onData(live(START, { candle: candle(START, 111) }));
    watchers[0]?.handlers.onData(live(START + MINUTE_MS));
    expect(log.lives.map((c) => [c.openTime, c.close])).toEqual([
      [START, 111],
      [START + MINUTE_MS, 100],
    ]);
  });

  it('다른 간격의 실시간 봉은 그리지 않는다 (AC15)', async () => {
    const { feed, requests, watchers } = fakeFeed();
    const log = recorder();
    new CandleSession(feed, SELECTION, log.callbacks, () => START);
    requests[0]?.resolve([candle(START)]);
    await settle();
    watchers[0]?.handlers.onData(live(START + MINUTE_MS, { interval: '5m' }));
    expect(log.lives).toEqual([]);
  });
});

describe('종목을 바꾸면 이전 흐름은 버린다', () => {
  it('멈춘 뒤 늦게 온 이전 종목 응답은 그리지 않고, 요청도 끊는다 (AC15)', async () => {
    const { feed, requests } = fakeFeed();
    const log = recorder();
    const session = new CandleSession(feed, SELECTION, log.callbacks, () => START);
    session.stop();
    requests[0]?.resolve([candle(START)]);
    await settle();
    expect(log.loaded).toEqual([]);
    expect(requests[0]?.signal.aborted).toBe(true);
  });

  it('열린 차트 구독은 종목을 10번 바꿔도 1개뿐이다 (AC16)', async () => {
    const { feed, requests, watchers } = fakeFeed();
    const log = recorder();
    for (let index = 0; index < 10; index += 1) {
      const session = new CandleSession(feed, SELECTION, log.callbacks, () => START);
      requests[index]?.resolve([candle(START)]);
      await settle();
      if (index < 9) {
        session.stop();
      }
    }
    expect(watchers).toHaveLength(1);
  });
});

describe('재연결 뒤 빠진 봉 채우기', () => {
  it('끊긴 동안의 봉을 마지막 봉부터 다시 받아 잇는다 (AC7)', async () => {
    const { feed, requests, watchers } = fakeFeed();
    const log = recorder();
    new CandleSession(feed, SELECTION, log.callbacks, () => START + 3 * MINUTE_MS);
    requests[0]?.resolve([candle(START)]);
    await settle();
    watchers[0]?.handlers.onStatus({ state: 'reconnecting', attempt: 1 });
    watchers[0]?.handlers.onStatus({ state: 'live' });
    expect(requests[1]?.range).toEqual({ startTime: START, limit: 4 });
    requests[1]?.resolve([candle(START), candle(START + MINUTE_MS)]);
    await settle();
    expect(log.loaded.at(-1)?.map((c) => c.openTime)).toEqual([START, START + MINUTE_MS]);
  });

  it('처음 연결될 때는 빠진 봉을 다시 받지 않는다', async () => {
    const { feed, requests, watchers } = fakeFeed();
    const log = recorder();
    new CandleSession(feed, SELECTION, log.callbacks, () => START);
    requests[0]?.resolve([candle(START)]);
    await settle();
    watchers[0]?.handlers.onStatus({ state: 'connecting' });
    watchers[0]?.handlers.onStatus({ state: 'live' });
    expect(requests).toHaveLength(1);
  });
});
