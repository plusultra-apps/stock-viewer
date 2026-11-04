import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKlinesQuery, isAllowedStream } from '../src/allowlist.js';

test('종목 기호는 대문자와 숫자 2~30자만 받는다', () => {
  assert.equal(parseKlinesQuery(new URLSearchParams('symbol=BTCUSDT&interval=1m&limit=5')).ok, true);
  assert.equal(parseKlinesQuery(new URLSearchParams('symbol=B&interval=1m&limit=5')).ok, false);
  assert.equal(parseKlinesQuery(new URLSearchParams('symbol=../x&interval=1m&limit=5')).ok, false);
  assert.equal(parseKlinesQuery(new URLSearchParams('symbol=btcusdt&interval=1m&limit=5')).ok, false);
});

test('봉 간격은 1m 5m 15m 1h 4h 1d 여섯 가지만 받는다', () => {
  for (const interval of ['1m', '5m', '15m', '1h', '4h', '1d']) {
    assert.equal(parseKlinesQuery(new URLSearchParams(`symbol=BTCUSDT&interval=${interval}&limit=5`)).ok, true);
  }
  assert.equal(parseKlinesQuery(new URLSearchParams('symbol=BTCUSDT&interval=2m&limit=5')).ok, false);
  assert.equal(parseKlinesQuery(new URLSearchParams('symbol=BTCUSDT&interval=1M&limit=5')).ok, false);
});

test('개수는 1에서 1500 사이의 정수만 받는다', () => {
  const withLimit = (limit) => parseKlinesQuery(new URLSearchParams(`symbol=BTCUSDT&interval=1m&limit=${limit}`));
  assert.equal(withLimit(1).ok, true);
  assert.equal(withLimit(1500).ok, true);
  assert.equal(withLimit(0).ok, false);
  assert.equal(withLimit(1501).ok, false);
  assert.equal(withLimit('1.5').ok, false);
  assert.equal(withLimit('abc').ok, false);
  assert.equal(withLimit('').ok, false);
});

test('시작 시각은 있으면 숫자여야 하고 없어도 된다', () => {
  const ok = parseKlinesQuery(new URLSearchParams('symbol=BTCUSDT&interval=1m&limit=4&startTime=1761699600000'));
  assert.equal(ok.value.startTime, 1761699600000);
  const none = parseKlinesQuery(new URLSearchParams('symbol=BTCUSDT&interval=1m&limit=4'));
  assert.equal(none.value.startTime, undefined);
  assert.equal(parseKlinesQuery(new URLSearchParams('symbol=BTCUSDT&interval=1m&limit=4&startTime=x')).ok, false);
});

test('차트 스트림은 소문자 종목과 허용된 간격만 받는다', () => {
  assert.equal(isAllowedStream('btcusdt@kline_1m'), true);
  assert.equal(isAllowedStream('btcusdt@kline_2m'), false);
  assert.equal(isAllowedStream('BTCUSDT@kline_1m'), false);
  assert.equal(isAllowedStream('../x@kline_1m'), false);
});

test('시장 스트림은 !ticker@arr 하나만 받는다', () => {
  assert.equal(isAllowedStream('!ticker@arr'), true);
  assert.equal(isAllowedStream('!ticker@all'), false);
  assert.equal(isAllowedStream(null), false);
  assert.equal(isAllowedStream(''), false);
});
