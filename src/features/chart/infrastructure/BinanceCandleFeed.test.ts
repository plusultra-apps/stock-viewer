import klineStream from '../../../../fixtures/binance/klineStream.json';
import klines from '../../../../fixtures/binance/klines.json';
import { RateLimit } from '../../connection/domain/RateLimit';
import { binanceEndpoints } from '../../connection/infrastructure/binanceEndpoints';
import type { Selection } from '../domain/Selection';
import { BinanceCandleFeed } from './BinanceCandleFeed';

class FakeSocket {
  url = '';
  closed = false;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close(): void {
    this.closed = true;
  }
}

const SELECTION: Selection = { symbol: 'BTCUSDT', interval: '1m' };

function feedWith(fetchMock: typeof fetch, sockets: FakeSocket[] = []): BinanceCandleFeed {
  return new BinanceCandleFeed({
    http: { fetch: fetchMock, now: () => 0, gate: new RateLimit() },
    createSocket: (url) => {
      const socket = new FakeSocket();
      socket.url = url;
      sockets.push(socket);
      return socket;
    },
    browserEvents: new EventTarget(),
    random: () => 1,
  });
}

function klinesResponse(): Response {
  return new Response(JSON.stringify(klines), { status: 200 });
}

describe('바이낸스 봉 공급 (REST)', () => {
  it('종목·간격·개수를 주소에 넣어 최근 봉을 받는다', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => klinesResponse());
    const candles = await feedWith(fetchMock).loadCandles(SELECTION, { limit: 500 }, new AbortController().signal);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('symbol=BTCUSDT');
    expect(url).toContain('interval=1m');
    expect(url).toContain('limit=500');
    expect(candles).toHaveLength(klines.length);
  });

  it('빠진 봉을 채울 때는 시작 시각을 함께 준다', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => klinesResponse());
    await feedWith(fetchMock).loadCandles(SELECTION, { limit: 4, startTime: 1761699600000 }, new AbortController().signal);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('startTime=1761699600000');
  });

  it('요청에 멈춤 신호를 실어 보내서 버린 요청은 끊을 수 있다', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => klinesResponse());
    const controller = new AbortController();
    await feedWith(fetchMock).loadCandles(SELECTION, { limit: 500 }, controller.signal);
    const sent = fetchMock.mock.calls[0]?.[1]?.signal;
    controller.abort();
    expect(sent?.aborted).toBe(true);
  });
});

describe('바이낸스 봉 공급 (실시간)', () => {
  it('차트 주소는 종목과 간격으로 만든 봉 스트림이다', () => {
    const sockets: FakeSocket[] = [];
    feedWith(vi.fn<typeof fetch>(), sockets).watchCandles(SELECTION, {
      onData: () => undefined,
      onStatus: () => undefined,
    });
    expect(sockets[0]?.url).toBe(binanceEndpoints.klineStream('BTCUSDT', '1m'));
  });

  it('봉 메시지를 받으면 그 봉을 넘긴다', () => {
    const sockets: FakeSocket[] = [];
    const received: string[] = [];
    feedWith(vi.fn<typeof fetch>(), sockets).watchCandles(SELECTION, {
      onData: (live) => received.push(live.symbol),
      onStatus: () => undefined,
    });
    sockets[0]?.onopen?.(new Event('open'));
    sockets[0]?.onmessage?.(new MessageEvent('message', { data: JSON.stringify(klineStream) }));
    expect(received).toEqual(['BTCUSDT']);
  });

  it('구독을 끊으면 소켓을 닫는다', () => {
    const sockets: FakeSocket[] = [];
    const unsubscribe = feedWith(vi.fn<typeof fetch>(), sockets).watchCandles(SELECTION, {
      onData: () => undefined,
      onStatus: () => undefined,
    });
    unsubscribe();
    expect(sockets[0]?.closed).toBe(true);
  });
});
