import { ReconnectingSocket, type SocketLike } from './ReconnectingSocket';
import type { ConnectionStatus } from '../domain/ConnectionStatus';

class FakeSocket implements SocketLike {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  close(): void {
    this.closed = true;
  }

  open(): void {
    this.onopen?.(new Event('open'));
  }

  message(data: string): void {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  fail(): void {
    this.onclose?.(new CloseEvent('close'));
  }
}

function setup(options: { silenceMs?: number } = {}) {
  const sockets: FakeSocket[] = [];
  const statuses: ConnectionStatus[] = [];
  const messages: string[] = [];
  const browser = new EventTarget();
  const socket = new ReconnectingSocket({
    url: 'wss://example.test/ws',
    createSocket: () => {
      const fake = new FakeSocket();
      sockets.push(fake);
      return fake;
    },
    onMessage: (text) => messages.push(text),
    onStatus: (status) => statuses.push(status),
    silenceMs: options.silenceMs ?? 4000,
    random: () => 1,
    browserEvents: browser,
  });
  return { socket, sockets, statuses, messages, browser };
}

describe('재연결 소켓', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('연결이 열리면 실시간 상태가 된다', () => {
    const { socket, sockets, statuses } = setup();
    socket.start();
    sockets[0]?.open();
    expect(statuses.at(-1)).toEqual({ state: 'live' });
  });

  it('끊기면 1초 뒤 다시 연결한다', () => {
    const { socket, sockets } = setup();
    socket.start();
    sockets[0]?.open();
    sockets[0]?.fail();
    vi.advanceTimersByTime(999);
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);
  });

  it('첫 메시지를 받으면 재연결 간격이 처음으로 돌아간다', () => {
    const { socket, sockets } = setup();
    socket.start();
    sockets[0]?.fail();
    vi.advanceTimersByTime(1000);
    sockets[1]?.open();
    sockets[1]?.message('{}');
    sockets[1]?.fail();
    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(3);
  });

  it('메시지를 받으면 그 내용을 넘긴다', () => {
    const { socket, sockets, messages } = setup();
    socket.start();
    sockets[0]?.open();
    sockets[0]?.message('hello');
    expect(messages).toEqual(['hello']);
  });

  it('6번 실패하면 연결 끊김이 되고 재시도는 계속한다', () => {
    const { socket, sockets, statuses } = setup();
    socket.start();
    sockets[0]?.fail();
    for (let i = 0; i < 6; i += 1) {
      vi.advanceTimersByTime(15_000);
      sockets.at(-1)?.fail();
    }
    expect(statuses.at(-1)).toEqual({ state: 'offline' });
    const before = sockets.length;
    vi.advanceTimersByTime(15_000);
    expect(sockets.length).toBe(before + 1);
  });

  it('브라우저가 오프라인이 되면 즉시 재연결 상태로 바뀐다', () => {
    const { socket, sockets, statuses, browser } = setup();
    socket.start();
    sockets[0]?.open();
    browser.dispatchEvent(new Event('offline'));
    expect(sockets[0]?.closed).toBe(true);
    expect(statuses.at(-1)).toEqual({ state: 'reconnecting', attempt: 1 });
  });

  it('브라우저가 다시 온라인이 되면 기다리지 않고 바로 연결한다', () => {
    const { socket, sockets, browser } = setup();
    socket.start();
    sockets[0]?.fail();
    browser.dispatchEvent(new Event('online'));
    expect(sockets).toHaveLength(2);
  });

  it('메시지가 silenceMs 동안 없으면 끊긴 것으로 본다', () => {
    const { socket, sockets, statuses } = setup({ silenceMs: 4000 });
    socket.start();
    sockets[0]?.open();
    vi.advanceTimersByTime(4000);
    expect(sockets[0]?.closed).toBe(true);
    expect(statuses.at(-1)).toEqual({ state: 'reconnecting', attempt: 1 });
  });

  it('멈추면 소켓을 닫고 다시 열지 않는다', () => {
    const { socket, sockets, browser } = setup();
    socket.start();
    sockets[0]?.open();
    socket.stop();
    expect(sockets[0]?.closed).toBe(true);
    sockets[0]?.fail();
    browser.dispatchEvent(new Event('online'));
    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(1);
  });

  it('차트 연결은 한 번에 하나만 열려 있다 (닫힌 소켓이 다시 열리지 않는다)', () => {
    const { socket, sockets } = setup();
    socket.start();
    sockets[0]?.open();
    sockets[0]?.fail();
    sockets[0]?.fail();
    vi.advanceTimersByTime(1000);
    expect(sockets.filter((s) => !s.closed)).toHaveLength(1);
  });
});
