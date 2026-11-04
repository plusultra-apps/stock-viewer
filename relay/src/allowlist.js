import {
  KLINE_INTERVALS,
  KLINE_LIMIT_MAX,
  KLINE_LIMIT_MIN,
  SYMBOL_PATTERN,
} from './config.js';

const DIGITS_PATTERN = /^\d+$/;
const MAX_START_TIME_DIGITS = 15;
const KLINE_INTERVAL_ALTERNATION = KLINE_INTERVALS.join('|');
const KLINE_STREAM_PATTERN = new RegExp(`^[a-z0-9]{2,30}@kline_(?:${KLINE_INTERVAL_ALTERNATION})$`);
const MARKET_STREAM = '!ticker@arr';

// 봉 요청 인자를 검사한다. 통과한 값만 쓰고, 그 밖의 인자는 버린다.
export function parseKlinesQuery(params) {
  const symbol = params.get('symbol') ?? '';
  const interval = params.get('interval') ?? '';
  const limitText = params.get('limit') ?? '';
  const startText = params.get('startTime');

  if (!SYMBOL_PATTERN.test(symbol)) {
    return invalid('symbol 은 대문자와 숫자 2~30자여야 합니다');
  }
  if (!KLINE_INTERVALS.includes(interval)) {
    return invalid('interval 은 1m 5m 15m 1h 4h 1d 중 하나여야 합니다');
  }
  const limit = parseLimit(limitText);
  if (limit === null) {
    return invalid(`limit 은 ${KLINE_LIMIT_MIN}~${KLINE_LIMIT_MAX} 사이의 정수여야 합니다`);
  }
  if (startText !== null && !isDigits(startText, MAX_START_TIME_DIGITS)) {
    return invalid('startTime 은 밀리초 숫자여야 합니다');
  }
  const startTime = startText === null ? undefined : Number(startText);
  return { ok: true, value: { symbol, interval, limit, startTime } };
}

// 차트 스트림(소문자 종목@kline_간격) 또는 시장 스트림(!ticker@arr)만 허용한다.
export function isAllowedStream(name) {
  if (typeof name !== 'string') {
    return false;
  }
  return name === MARKET_STREAM || KLINE_STREAM_PATTERN.test(name);
}

function invalid(message) {
  return { ok: false, message };
}

function parseLimit(text) {
  if (!DIGITS_PATTERN.test(text)) {
    return null;
  }
  const limit = Number(text);
  return limit >= KLINE_LIMIT_MIN && limit <= KLINE_LIMIT_MAX ? limit : null;
}

function isDigits(text, maxLength) {
  return DIGITS_PATTERN.test(text) && text.length <= maxLength;
}
