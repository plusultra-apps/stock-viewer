import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiRoute } from '../src/routes.js';

test('허용되지 않은 경로는 404 로 판정한다', () => {
  assert.equal(resolveApiRoute('/api/order', new URLSearchParams()).kind, 'notFound');
  assert.equal(resolveApiRoute('/fapi/v1/klines', new URLSearchParams()).kind, 'notFound');
});

test('잘못된 봉 요청은 400 으로 판정하고 이유를 담는다', () => {
  const route = resolveApiRoute('/api/klines', new URLSearchParams('symbol=../x&interval=1m&limit=5'));
  assert.equal(route.kind, 'badRequest');
  assert.equal(typeof route.message, 'string');
});

test('봉 요청은 검증된 값만 바이낸스 주소에 넣는다 (알 수 없는 인자는 버린다)', () => {
  const route = resolveApiRoute('/api/klines', new URLSearchParams('symbol=BTCUSDT&interval=4h&limit=10&evil=x'));
  assert.equal(route.kind, 'binance');
  assert.equal(route.url, 'https://fapi.binance.com/fapi/v1/klines?symbol=BTCUSDT&interval=4h&limit=10');
});
