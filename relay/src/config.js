// 중계 서버의 고정 설정. 바이낸스 주소와 허용 목록은 여기 한 곳에만 둔다.

export const BINANCE_REST_BASE = 'https://fapi.binance.com';
export const BINANCE_WS_BASE = 'wss://fstream.binance.com';

// 브라우저가 이 서버를 부를 수 있는 출처. 그 밖의 출처는 403 으로 거부한다.
export const ALLOWED_ORIGINS = Object.freeze([
  'https://stock-viewer-snowy.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]);

export const KLINE_INTERVALS = Object.freeze(['1m', '5m', '15m', '1h', '4h', '1d']);
export const KLINE_LIMIT_MIN = 1;
export const KLINE_LIMIT_MAX = 1500;

// 바이낸스 호출 결과를 잠깐 보관하는 시간 (요청 한도를 아끼기 위해)
export const EXCHANGE_INFO_TTL_MS = 10_000;
export const TICKER_24H_TTL_MS = 2_000;

// 바이낸스가 Retry-After 를 주지 않았을 때 막아 둘 시간 (앱의 기본값과 같다)
export const RATE_LIMIT_DEFAULT_MS = Object.freeze({ 429: 60_000, 418: 300_000 });
export const UPSTREAM_TIMEOUT_MS = 10_000;

export const MAX_STREAM_CLIENTS = 50;

// WebSocket.OPEN 값 (ws 패키지와 같다)
export const WS_OPEN = 1;

export const SYMBOL_PATTERN = /^[A-Z0-9]{2,30}$/;
