import type { ConnectionStatus } from './ConnectionStatus';
import { FEED_ERROR_KIND, type FeedError } from './FeedError';

// 화면 위쪽 알림 하나. 여러 개가 겹치면 pickBanner 가 우선순위로 하나만 고른다.
export type Banner =
  | { readonly kind: 'blocked' }
  | { readonly kind: 'rateLimited'; readonly waitMs: number | null }
  | { readonly kind: 'offline' }
  | { readonly kind: 'reconnecting'; readonly attempt: number }
  | { readonly kind: 'listFailed' }
  | { readonly kind: 'halted' };

export type ChipKey = Banner['kind'] | 'chartFailed' | 'live' | 'connecting';

export interface BannerInput {
  readonly connection: ConnectionStatus;
  readonly listFailed: boolean;
  readonly feedFailures: readonly FeedError[];
  readonly halted: boolean;
}

// 우선순위: 차단 > 요청 제한 > 끊김 > 재연결 중 > 목록 실패 > 거래 종료 (03-tech-design 4-6)
export function pickBanner(input: BannerInput): Banner | null {
  return failureBanner(input.feedFailures) ?? connectionBanner(input.connection) ?? listBanner(input);
}

function failureBanner(failures: readonly FeedError[]): Banner | null {
  if (failures.some((failure) => failure.kind === FEED_ERROR_KIND.Blocked)) {
    return { kind: 'blocked' };
  }
  const limited = failures.find((failure) => failure.kind === FEED_ERROR_KIND.RateLimited);
  return limited === undefined ? null : { kind: 'rateLimited', waitMs: limited.retryAfterMs };
}

function listBanner(input: BannerInput): Banner | null {
  if (input.listFailed) {
    return { kind: 'listFailed' };
  }
  return input.halted ? { kind: 'halted' } : null;
}

// 칩은 알림과 같은 우선순위를 따르고, 알림이 없으면 봉 실패 또는 연결 상태를 보인다.
export function pickChip(input: BannerInput, chartFailed: boolean): ChipKey {
  const banner = pickBanner(input);
  if (banner !== null) {
    return banner.kind;
  }
  if (chartFailed) {
    return 'chartFailed';
  }
  return input.connection.state === 'live' ? 'live' : 'connecting';
}

const CONNECTION_RANK: Readonly<Record<ConnectionStatus['state'], number>> = {
  live: 0,
  connecting: 1,
  reconnecting: 2,
  offline: 3,
};

// 목록 연결과 차트 연결 중 더 나쁜 쪽을 보여 준다.
export function worseConnection(a: ConnectionStatus, b: ConnectionStatus): ConnectionStatus {
  return CONNECTION_RANK[a.state] >= CONNECTION_RANK[b.state] ? a : b;
}

function connectionBanner(connection: ConnectionStatus): Banner | null {
  if (connection.state === 'offline') {
    return { kind: 'offline' };
  }
  if (connection.state === 'reconnecting') {
    return { kind: 'reconnecting', attempt: connection.attempt };
  }
  return null;
}
