import { type SetStateAction, type Dispatch, useEffect, useMemo, useState } from 'react';
import { patchWith } from '../../../shared/ui/patchState';
import type { ConnectionStatus } from '../../connection/domain/ConnectionStatus';
import type { FeedError } from '../../connection/domain/FeedError';
import type { MarketFeed } from '../application/MarketFeed';
import { type MarketCallbacks, MarketSession } from '../application/MarketSession';
import { type MarketEntry, MarketList } from '../domain/MarketList';
import { searchMarkets } from '../domain/searchMarkets';

export type MarketsStatus = 'loading' | 'ready' | 'failed';

export interface MarketsView {
  readonly status: MarketsStatus;
  readonly list: MarketList | null;
  readonly rows: readonly MarketEntry[];
  readonly query: string;
  readonly connection: ConnectionStatus;
  readonly lastUpdated: number | null;
  // 목록을 못 받았을 때의 오류 (알림 줄이 종류를 본다)
  readonly listFailure: FeedError | null;
  // 거래 종료 확인이 실패했을 때의 오류 (목록은 그대로 보인다)
  readonly refreshFailure: FeedError | null;
  setQuery(query: string): void;
  reload(): void;
}

interface MarketState {
  readonly status: MarketsStatus;
  readonly list: MarketList | null;
  readonly connection: ConnectionStatus;
  readonly lastUpdated: number | null;
  readonly listFailure: FeedError | null;
  readonly refreshFailure: FeedError | null;
}

const INITIAL_STATE: MarketState = {
  status: 'loading',
  list: null,
  connection: { state: 'connecting' },
  lastUpdated: null,
  listFailure: null,
  refreshFailure: null,
};

// 목록 화면의 상태. 받기·구독은 MarketSession 이 맡고, 여기는 상태를 React 에 올린다.
export function useMarkets(feed: MarketFeed): MarketsView {
  const [query, setQuery] = useState('');
  const live = useMarketLive(feed);
  const rows = useSearchRows(live.list, query);
  return { ...live, rows, query, setQuery };
}

function useMarketLive(feed: MarketFeed): MarketState & { reload(): void } {
  const [reloadCount, setReloadCount] = useState(0);
  const state = useMarketState(feed, reloadCount);
  return { ...state, reload: () => setReloadCount((count) => count + 1) };
}

function useMarketState(feed: MarketFeed, reloadCount: number): MarketState {
  const [state, setState] = useState<MarketState>(INITIAL_STATE);
  useEffect(() => startSession(feed, setState), [feed, reloadCount]);
  return state;
}

function useSearchRows(list: MarketList | null, query: string): readonly MarketEntry[] {
  return useMemo(() => (list === null ? [] : searchMarkets(list.rows(), query)), [list, query]);
}

function startSession(feed: MarketFeed, setState: Dispatch<SetStateAction<MarketState>>): () => void {
  patchWith(setState)(() => ({ status: 'loading' }));
  const session = new MarketSession(feed, toCallbacks(setState));
  return () => session.stop();
}

function toCallbacks(setState: Dispatch<SetStateAction<MarketState>>): MarketCallbacks {
  const patch = patchWith(setState);
  return {
    onLoaded: (loaded) =>
      patch(() => ({ list: loaded, status: 'ready', listFailure: null, lastUpdated: Date.now() })),
    onFailed: (error) => patch(() => ({ status: 'failed', listFailure: error })),
    onUpdate: (patches) =>
      patch((previous) => ({ list: previous.list?.applyPatches(patches) ?? null, lastUpdated: Date.now() })),
    onStatus: (connection) => patch(() => ({ connection })),
    onRefreshError: (refreshFailure) => patch(() => ({ refreshFailure })),
  };
}
