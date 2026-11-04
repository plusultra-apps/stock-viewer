import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTtlCache } from '../src/ttlCache.js';

test('캐시한 값은 유효 시간 안에서는 돌려주고 지나면 버린다', () => {
  let clock = 0;
  const cache = createTtlCache(() => clock);
  cache.set('exchangeInfo', 'body', 10_000);
  clock = 9_999;
  assert.equal(cache.get('exchangeInfo'), 'body');
  clock = 10_000;
  assert.equal(cache.get('exchangeInfo'), undefined);
});

test('없는 키는 undefined 를 돌려준다', () => {
  const cache = createTtlCache(() => 0);
  assert.equal(cache.get('missing'), undefined);
});
