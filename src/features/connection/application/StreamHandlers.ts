import type { ConnectionStatus } from '../domain/ConnectionStatus';

export type Unsubscribe = () => void;

// 실시간 흐름을 받는 쪽이 넘기는 두 콜백. 데이터와 연결 상태를 따로 받는다.
export interface StreamHandlers<T> {
  readonly onData: (data: T) => void;
  readonly onStatus: (status: ConnectionStatus) => void;
}
