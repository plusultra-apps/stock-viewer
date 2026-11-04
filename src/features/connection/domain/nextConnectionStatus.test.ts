import { nextConnectionStatus } from './nextConnectionStatus';

describe('연결 상태', () => {
  it('연결을 시작하면 연결 중이다', () => {
    expect(nextConnectionStatus({ type: 'connect' })).toEqual({ state: 'connecting' });
  });

  it('연결이 열리면 실시간이다', () => {
    expect(nextConnectionStatus({ type: 'opened' })).toEqual({ state: 'live' });
  });

  it('끊기면 재연결 중이고 몇 번째 시도인지 보여 준다', () => {
    expect(nextConnectionStatus({ type: 'lost', failures: 1 })).toEqual({ state: 'reconnecting', attempt: 1 });
    expect(nextConnectionStatus({ type: 'lost', failures: 5 })).toEqual({ state: 'reconnecting', attempt: 5 });
  });

  it('6번 실패하면 연결 끊김이 된다', () => {
    expect(nextConnectionStatus({ type: 'lost', failures: 6 })).toEqual({ state: 'offline' });
    expect(nextConnectionStatus({ type: 'lost', failures: 9 })).toEqual({ state: 'offline' });
  });
});
