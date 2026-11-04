import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBlockGate } from '../src/blockGate.js';

test('차단한 엔드포인트는 차단 시간이 끝날 때까지 남은 시간을 알려 준다', () => {
  let clock = 1_000;
  const gate = createBlockGate(() => clock);
  gate.block('ticker24h', 30_000);
  clock = 11_000;
  assert.equal(gate.remainingMs('ticker24h'), 20_000);
  clock = 31_000;
  assert.equal(gate.remainingMs('ticker24h'), 0);
});

test('한 엔드포인트를 차단해도 다른 엔드포인트는 막히지 않는다', () => {
  const gate = createBlockGate(() => 0);
  gate.block('klines', 60_000);
  assert.equal(gate.remainingMs('exchangeInfo'), 0);
});
