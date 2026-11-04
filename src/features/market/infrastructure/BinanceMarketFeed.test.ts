import exchangeInfo from '../../../../fixtures/binance/exchangeInfo.json';
import ticker24hr from '../../../../fixtures/binance/ticker24hr.json';
import tickerStream from '../../../../fixtures/binance/tickerStream.json';
import { RateLimit } from '../../connection/domain/RateLimit';
import { BinanceMarketFeed } from './BinanceMarketFeed';

class FakeSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close(): void {
    this.onclose = null;
  }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

function feedWith(fetchMock: typeof fetch, sockets: FakeSocket[] = []): BinanceMarketFeed {
  return new BinanceMarketFeed({
    http: { fetch: fetchMock, now: () => 0, gate: new RateLimit() },
    createSocket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    browserEvents: new EventTarget(),
    random: () => 1,
  });
}

describe('바이낸스 종목 목록 공급', () => {
  it('종목 정보와 24시간 시세를 함께 받는다', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      return jsonResponse(url.includes('exchangeInfo') ? exchangeInfo : ticker24hr);
    });
    const snapshot = await feedWith(fetchMock).loadMarkets();
    expect(snapshot.markets.map((market) => market.symbol)).toEqual(['BTCUSDT', 'ETHUSDT', '1000PEPEUSDT']);
    expect(snapshot.tickers).toHaveLength(ticker24hr.length);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('시세 스트림 메시지를 갱신 묶음으로 넘긴다', () => {
    const sockets: FakeSocket[] = [];
    const received: number[] = [];
    const feed = feedWith(vi.fn<typeof fetch>(), sockets);
    const unsubscribe = feed.watchTickers({
      onData: (patches) => received.push(patches.length),
      onStatus: () => undefined,
    });
    sockets[0]?.onopen?.(new Event('open'));
    sockets[0]?.onmessage?.(new MessageEvent('message', { data: JSON.stringify(tickerStream) }));
    unsubscribe();
    expect(received).toEqual([tickerStream.length]);
  });
});

describe('거래 종료 확인은 종목 정보만 다시 받는다', () => {
  it('거래 중이 아니게 된 종목은 다시 받은 목록에서 빠진다 (AC18)', async () => {
    const changed = {
      ...exchangeInfo,
      symbols: exchangeInfo.symbols.map((item) => (item.symbol === 'BTCUSDT' ? { ...item, status: 'BREAK' } : item)),
    };
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(changed));
    const markets = await feedWith(fetchMock).refreshMarkets();
    expect(markets.map((market) => market.symbol)).not.toContain('BTCUSDT');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
