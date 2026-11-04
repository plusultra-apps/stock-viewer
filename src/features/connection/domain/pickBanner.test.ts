import { FeedError } from './FeedError';
import { pickBanner, pickChip, worseConnection, type BannerInput } from './pickBanner';

const LIVE = { state: 'live' } as const;

function input(overrides: Partial<BannerInput> = {}): BannerInput {
  return { connection: LIVE, listFailed: false, feedFailures: [], halted: false, ...overrides };
}

describe('화면 알림은 우선순위대로 하나만 보인다', () => {
  it('정상 상태에서는 알림이 없다', () => {
    expect(pickBanner(input())).toBeNull();
  });

  it('차단(451)은 요청 제한과 끊김보다 먼저 보인다', () => {
    const banner = pickBanner(
      input({
        connection: { state: 'offline' },
        feedFailures: [
          new FeedError('rateLimited', '대기'),
          new FeedError('blocked', '차단', { status: 451 }),
        ],
      }),
    );
    expect(banner).toEqual({ kind: 'blocked' });
  });

  it('요청 제한은 끊김보다 먼저 보이고 대기 시간을 넘긴다', () => {
    const banner = pickBanner(
      input({
        connection: { state: 'offline' },
        feedFailures: [new FeedError('rateLimited', '대기', { retryAfterMs: 30_000 })],
      }),
    );
    expect(banner).toEqual({ kind: 'rateLimited', waitMs: 30_000 });
  });

  it('6번 실패한 끊김은 재연결 중보다 먼저 보인다', () => {
    expect(pickBanner(input({ connection: { state: 'offline' } }))).toEqual({ kind: 'offline' });
  });

  it('재연결 중에는 몇 번째 시도인지 보인다', () => {
    expect(pickBanner(input({ connection: { state: 'reconnecting', attempt: 3 } }))).toEqual({
      kind: 'reconnecting',
      attempt: 3,
    });
  });

  it('목록을 못 받으면 목록 실패가 보이고, 거래 종료는 가장 뒤다', () => {
    expect(pickBanner(input({ listFailed: true, halted: true }))).toEqual({ kind: 'listFailed' });
    expect(pickBanner(input({ halted: true }))).toEqual({ kind: 'halted' });
  });
});

describe('연결 칩은 알림과 같은 기준으로 고른다', () => {
  it('봉 요청만 실패하면 봉 실패 칩이 보인다', () => {
    expect(pickChip(input(), true)).toBe('chartFailed');
  });

  it('알림이 없고 연결 중이면 연결 중 칩이 보인다', () => {
    expect(pickChip(input({ connection: { state: 'connecting' } }), false)).toBe('connecting');
  });
});

describe('두 연결 중 더 나쁜 쪽을 보여 준다', () => {
  it('차트만 끊겨도 끊김으로 본다', () => {
    expect(worseConnection(LIVE, { state: 'offline' })).toEqual({ state: 'offline' });
  });

  it('둘 다 실시간이면 실시간이다', () => {
    expect(worseConnection(LIVE, LIVE)).toEqual(LIVE);
  });
});
