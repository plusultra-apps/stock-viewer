import type { ConnectionStatus } from '../domain/ConnectionStatus';
import { backoffDelay } from '../domain/backoffDelay';
import { type ConnectionEvent, nextConnectionStatus } from '../domain/nextConnectionStatus';

export type SocketLike = Pick<WebSocket, 'onopen' | 'onmessage' | 'onclose' | 'onerror' | 'close'>;

export interface ReconnectingSocketOptions {
  readonly url: string;
  readonly createSocket: (url: string) => SocketLike;
  readonly onMessage: (text: string) => void;
  readonly onStatus: (status: ConnectionStatus) => void;
  readonly silenceMs: number;
  readonly random: () => number;
  // 브라우저의 online·offline 사건이 오는 곳 (보통 window)
  readonly browserEvents: EventTarget;
}

// 끊기면 간격을 늘려 다시 잇고, 메시지가 한동안 없으면 끊긴 것으로 본다.
// 닫은 소켓은 다시 열리지 않는다 (stop 이후).
export class ReconnectingSocket {
  private readonly options: ReconnectingSocketOptions;
  private socket: SocketLike | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private failures = 0;
  private stopped = true;

  constructor(options: ReconnectingSocketOptions) {
    this.options = options;
  }

  start(): void {
    this.stopped = false;
    this.options.browserEvents.addEventListener('online', this.handleOnline);
    this.options.browserEvents.addEventListener('offline', this.handleOffline);
    this.emit({ type: 'connect' });
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.options.browserEvents.removeEventListener('online', this.handleOnline);
    this.options.browserEvents.removeEventListener('offline', this.handleOffline);
    this.clearRetry();
    this.closeSocket();
  }

  // [다시 연결] 버튼: 기다리지 않고 횟수를 처음부터 센다
  retryNow(): void {
    if (this.stopped || this.socket !== null) {
      return;
    }
    this.clearRetry();
    this.failures = 0;
    this.emit({ type: 'connect' });
    this.connect();
  }

  private readonly handleOnline = (): void => {
    if (this.stopped || this.socket !== null) {
      return;
    }
    this.clearRetry();
    this.connect();
  };

  private readonly handleOffline = (): void => {
    this.handleLost();
  };

  private connect(): void {
    const socket = this.options.createSocket(this.options.url);
    this.socket = socket;
    socket.onopen = () => {
      this.emit({ type: 'opened' });
      this.armSilence();
    };
    socket.onmessage = (event) => this.handleMessage(event);
    socket.onclose = () => this.handleLost();
    socket.onerror = () => this.handleLost();
    this.armSilence();
  }

  private handleMessage(event: MessageEvent): void {
    this.failures = 0;
    this.armSilence();
    if (typeof event.data !== 'string') {
      console.warn('문자열이 아닌 메시지를 버렸다');
      return;
    }
    this.options.onMessage(event.data);
  }

  private handleLost(): void {
    if (this.stopped || this.socket === null) {
      return;
    }
    this.closeSocket();
    this.failures += 1;
    this.emit({ type: 'lost', failures: this.failures });
    this.scheduleRetry(backoffDelay(this.failures - 1, this.options.random()));
  }

  private scheduleRetry(waitMs: number): void {
    this.clearRetry();
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, waitMs);
  }

  private armSilence(): void {
    this.clearSilence();
    this.silenceTimer = setTimeout(() => this.handleLost(), this.options.silenceMs);
  }

  private closeSocket(): void {
    this.clearSilence();
    const socket = this.socket;
    if (socket === null) {
      return;
    }
    this.socket = null;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.close();
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private clearSilence(): void {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private emit(event: ConnectionEvent): void {
    this.options.onStatus(nextConnectionStatus(event));
  }
}
