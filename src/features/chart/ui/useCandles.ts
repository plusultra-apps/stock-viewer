import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { patchWith } from '../../../shared/ui/patchState';
import type { ConnectionStatus } from '../../connection/domain/ConnectionStatus';
import type { FeedError } from '../../connection/domain/FeedError';
import type { CandleFeed } from '../application/CandleFeed';
import { type CandleCallbacks, CandleSession } from '../application/CandleSession';
import type { Candle } from '../domain/Candle';
import type { Selection } from '../domain/Selection';

export type ChartStatus = 'loading' | 'ready' | 'failed' | 'halted';

// 차트에 그릴 봉 전체. version 이 바뀔 때만 차트 전체를 다시 그린다.
export interface ChartSnapshot {
  readonly candles: readonly Candle[];
  readonly version: number;
}

export interface CandlesView {
  readonly status: ChartStatus;
  readonly snapshot: ChartSnapshot;
  readonly latest: Candle | null;
  readonly failure: FeedError | null;
  readonly connection: ConnectionStatus;
  readonly lastUpdated: number | null;
  retry(): void;
}

interface CandleState {
  // 종목과 간격이 같으면 거래 종료 뒤에도 마지막 봉을 남긴다
  readonly key: string;
  readonly status: ChartStatus;
  readonly snapshot: ChartSnapshot;
  readonly latest: Candle | null;
  readonly failure: FeedError | null;
  readonly connection: ConnectionStatus;
  readonly lastUpdated: number | null;
}

const NO_SNAPSHOT: ChartSnapshot = { candles: [], version: 0 };
const INITIAL_STATE: CandleState = {
  key: '',
  status: 'loading',
  snapshot: NO_SNAPSHOT,
  latest: null,
  failure: null,
  connection: { state: 'connecting' },
  lastUpdated: null,
};
const noop = (): void => undefined;

// 차트 화면의 상태. 받기·구독은 CandleSession 이 맡고, 여기는 상태를 React 에 올린다.
// halted 면 구독을 열지 않는다. 종목·간격이 바뀌면 이전 봉은 지운다 (AC15).
export function useCandles(feed: CandleFeed, selection: Selection, halted: boolean): CandlesView {
  const [retryCount, setRetryCount] = useState(0);
  const [state, setState] = useState<CandleState>(INITIAL_STATE);
  const { symbol, interval } = selection;
  useEffect(
    () => startCandles(feed, { symbol, interval }, halted, setState),
    [feed, symbol, interval, halted, retryCount],
  );
  return { ...state, retry: () => setRetryCount((count) => count + 1) };
}

function startCandles(
  feed: CandleFeed,
  selection: Selection,
  halted: boolean,
  setState: Dispatch<SetStateAction<CandleState>>,
): () => void {
  const key = `${selection.symbol}|${selection.interval}`;
  patchWith(setState)((previous) => beginState(previous, key, halted));
  if (halted) {
    return noop;
  }
  const session = new CandleSession(feed, selection, toCallbacks(setState), Date.now);
  return () => session.stop();
}

function beginState(previous: CandleState, key: string, halted: boolean): Partial<CandleState> {
  const sameKey = previous.key === key;
  return {
    key,
    status: halted ? 'halted' : 'loading',
    snapshot: sameKey ? previous.snapshot : { candles: [], version: previous.snapshot.version + 1 },
    latest: null,
    failure: null,
  };
}

function loadedState(previous: CandleState, candles: readonly Candle[]): Partial<CandleState> {
  return {
    status: 'ready',
    latest: null,
    failure: null,
    snapshot: { candles, version: previous.snapshot.version + 1 },
    lastUpdated: Date.now(),
  };
}

function toCallbacks(setState: Dispatch<SetStateAction<CandleState>>): CandleCallbacks {
  const patch = patchWith(setState);
  return {
    onLoaded: (candles) => patch((previous) => loadedState(previous, candles)),
    onLive: (candle) => patch(() => ({ latest: candle, lastUpdated: Date.now() })),
    onFailed: (failure) => patch(() => ({ status: 'failed', failure })),
    onStatus: (connection) => patch(() => ({ connection })),
  };
}
