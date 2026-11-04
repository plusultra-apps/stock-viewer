import { createBinanceEndpoints } from './binanceEndpoints';

const RELAY = 'https://binance-relay.example.com';

describe('바이낸스 주소 (중계 주소가 없을 때: 직접 연결)', () => {
  const direct = createBinanceEndpoints(undefined);

  it('종목 목록과 24시간 시세는 바이낸스 공개 주소를 쓴다', () => {
    expect(direct.exchangeInfo).toBe('https://fapi.binance.com/fapi/v1/exchangeInfo');
    expect(direct.ticker24hr).toBe('https://fapi.binance.com/fapi/v1/ticker/24hr');
  });

  it('종목 스트림과 봉 스트림은 바이낸스 WebSocket 주소를 쓴다', () => {
    expect(direct.marketStream).toBe('wss://fstream.binance.com/ws/!ticker@arr');
    expect(direct.klineStream('BTCUSDT', '1m')).toBe('wss://fstream.binance.com/ws/btcusdt@kline_1m');
  });

  it('빈 문자열이나 공백만 있는 중계 주소는 없는 것으로 본다', () => {
    expect(createBinanceEndpoints('  ').exchangeInfo).toBe('https://fapi.binance.com/fapi/v1/exchangeInfo');
  });
});

describe('바이낸스 주소 (중계 주소가 있을 때: 중계 서버 경유)', () => {
  const relay = createBinanceEndpoints(`${RELAY}/`);

  it('REST 는 중계 서버의 /api 경로로 바뀌고, 끝의 / 는 무시한다', () => {
    expect(relay.exchangeInfo).toBe(`${RELAY}/api/exchangeInfo`);
    expect(relay.ticker24hr).toBe(`${RELAY}/api/ticker24h`);
  });

  it('봉 요청은 종목·간격·개수를 쿼리로 붙이고, 시작 시각이 있으면 함께 붙인다', () => {
    expect(relay.klines('BTCUSDT', '1m', 500)).toBe(`${RELAY}/api/klines?symbol=BTCUSDT&interval=1m&limit=500`);
    expect(relay.klines('BTCUSDT', '1m', 4, 1761699600000)).toContain('startTime=1761699600000');
  });

  it('WebSocket 은 https 를 wss 로 바꾸고 /ws?stream= 으로 연결한다', () => {
    expect(relay.marketStream).toBe('wss://binance-relay.example.com/ws?stream=%21ticker%40arr');
    expect(relay.klineStream('BTCUSDT', '1m')).toBe(
      'wss://binance-relay.example.com/ws?stream=btcusdt%40kline_1m',
    );
  });

  it('로컬 중계(http)는 ws 주소로 바꾼다', () => {
    expect(createBinanceEndpoints('http://localhost:8080').klineStream('ETHUSDT', '5m')).toBe(
      'ws://localhost:8080/ws?stream=ethusdt%40kline_5m',
    );
  });
});
