import type { ConnectionStatus } from './ConnectionStatus';
import { OFFLINE_AFTER_ATTEMPTS } from './connectionTiming';

// 상태 전이는 이 함수 하나에서만 일어난다.
// failures 는 실패가 연속으로 몇 번 났는지 (소켓이 세고 여기로 넘긴다).
export type ConnectionEvent =
  | { readonly type: 'connect' }
  | { readonly type: 'opened' }
  | { readonly type: 'lost'; readonly failures: number };

export function nextConnectionStatus(event: ConnectionEvent): ConnectionStatus {
  if (event.type === 'connect') {
    return { state: 'connecting' };
  }
  if (event.type === 'opened') {
    return { state: 'live' };
  }
  if (event.failures >= OFFLINE_AFTER_ATTEMPTS) {
    return { state: 'offline' };
  }
  return { state: 'reconnecting', attempt: event.failures };
}
