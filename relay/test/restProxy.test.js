import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRestProxy } from '../src/restProxy.js';
import { resolveApiRoute } from '../src/routes.js';

// 실제 바이낸스를 부르지 않도록 fetch 를 가짜로 바꾼다. 호출 주소를 기록한다.
function setup(responder) {
  const calls = [];
  let clock = 0;
  const fakeFetch = async (url) => {
    calls.push(String(url));
    return responder(String(url));
  };
  const forward = createRestProxy({ fetch: fakeFetch, now: () => clock });
  return { forward, calls, advance: (ms) => (clock += ms) };
}

const route = (path, query = '') => resolveApiRoute(path, new URLSearchParams(query));
const KLINES = '/api/klines';
const KLINES_QUERY = 'symbol=BTCUSDT&interval=1m&limit=5';

test('거래소 정보는 10초 동안 캐시해서 바이낸스를 다시 부르지 않는다', async () => {
  const { forward, calls, advance } = setup(() => new Response('{"symbols":[]}', { status: 200 }));
  await forward(route('/api/exchangeInfo'));
  advance(9_999);
  const cached = await forward(route('/api/exchangeInfo'));
  assert.equal(cached.status, 200);
  assert.equal(cached.body, '{"symbols":[]}');
  assert.equal(calls.length, 1);
  advance(1);
  await forward(route('/api/exchangeInfo'));
  assert.equal(calls.length, 2);
});

test('24시간 시세는 2초 동안만 캐시한다', async () => {
  const { forward, calls, advance } = setup(() => new Response('[]', { status: 200 }));
  await forward(route('/api/ticker24h'));
  advance(1_999);
  await forward(route('/api/ticker24h'));
  assert.equal(calls.length, 1);
  advance(1);
  await forward(route('/api/ticker24h'));
  assert.equal(calls.length, 2);
  assert.equal(calls[0], 'https://fapi.binance.com/fapi/v1/ticker/24hr');
});

test('봉 목록은 캐시하지 않고 종목·간격·개수를 바이낸스 주소에 넣는다', async () => {
  const { forward, calls } = setup(() => new Response('[]', { status: 200 }));
  await forward(route(KLINES, KLINES_QUERY));
  await forward(route(KLINES, KLINES_QUERY));
  assert.equal(calls.length, 2);
  assert.equal(calls[0], 'https://fapi.binance.com/fapi/v1/klines?symbol=BTCUSDT&interval=1m&limit=5');
});

test('429 응답은 상태와 Retry-After 를 그대로 전달하고 그 엔드포인트만 막는다', async () => {
  let clock = 0;
  let fetchCount = 0;
  const forward = createRestProxy({
    fetch: async () => {
      fetchCount += 1;
      return fetchCount === 1
        ? new Response('{}', { status: 429, headers: { 'Retry-After': '30' } })
        : new Response('[]', { status: 200 });
    },
    now: () => clock,
  });
  const first = await forward(route('/api/ticker24h'));
  assert.equal(first.status, 429);
  assert.equal(first.headers['Retry-After'], '30');

  clock = 29_999;
  const blocked = await forward(route('/api/ticker24h'));
  assert.equal(blocked.status, 503);
  assert.equal(fetchCount, 1);

  const other = await forward(route('/api/exchangeInfo'));
  assert.equal(other.status, 200);
  assert.equal(fetchCount, 2);
});

test('Retry-After 가 없는 418 은 5분 동안 막는다', async () => {
  let clock = 0;
  const forward = createRestProxy({ fetch: async () => new Response('{}', { status: 418 }), now: () => clock });
  const first = await forward(route(KLINES, KLINES_QUERY));
  assert.equal(first.status, 418);
  clock = 299_999;
  assert.equal((await forward(route(KLINES, KLINES_QUERY))).status, 503);
  clock = 300_000;
  assert.equal((await forward(route(KLINES, KLINES_QUERY))).status, 418);
});

test('451 은 그대로 전달하고 요청을 막지는 않는다', async () => {
  const { forward, calls } = setup(() => new Response('{}', { status: 451 }));
  assert.equal((await forward(route('/api/exchangeInfo'))).status, 451);
  assert.equal((await forward(route('/api/exchangeInfo'))).status, 451);
  assert.equal(calls.length, 2);
});

test('바이낸스에 연결하지 못하면 502 를 돌려준다', async () => {
  const forward = createRestProxy({
    fetch: async () => {
      throw new TypeError('fetch failed');
    },
    now: () => 0,
  });
  assert.equal((await forward(route('/api/exchangeInfo'))).status, 502);
});
