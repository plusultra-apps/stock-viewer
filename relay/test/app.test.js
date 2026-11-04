import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { WebSocket } from 'ws';
import { createApp } from '../src/app.js';

const ALLOWED = 'http://localhost:5173';

// 실제 HTTP·WebSocket 서버를 임시 포트로 띄운다. 바이낸스 호출은 가짜로 바꾼다.
async function startRelay(options = {}) {
  const upstreams = [];
  const app = createApp({
    fetch: async () => new Response('[]', { status: 200 }),
    now: () => 0,
    openUpstream: () => {
      const upstream = new EventEmitter();
      upstream.closed = false;
      upstream.close = () => {
        upstream.closed = true;
      };
      upstreams.push(upstream);
      return upstream;
    },
    ...options,
  });
  const server = http.createServer(app.handleHttp);
  server.on('upgrade', app.handleUpgrade);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const close = () =>
    new Promise((resolve) => {
      server.closeAllConnections();
      server.close(resolve);
    });
  return { base: `http://127.0.0.1:${port}`, wsBase: `ws://127.0.0.1:${port}`, upstreams, close };
}

async function withRelay(options, body) {
  const relay = await startRelay(options);
  try {
    await body(relay);
  } finally {
    await relay.close();
  }
}

async function waitFor(check) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('기다린 조건이 되지 않았다');
}

test('헬스 체크는 200 과 ok 를 돌려준다', async () => {
  await withRelay({}, async ({ base }) => {
    const response = await fetch(`${base}/healthz`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
});

test('잘못된 봉 요청은 400 이고 바이낸스를 부르지 않는다', async () => {
  let calls = 0;
  const countingFetch = async () => {
    calls += 1;
    return new Response('[]', { status: 200 });
  };
  await withRelay({ fetch: countingFetch }, async ({ base }) => {
    const response = await fetch(`${base}/api/klines?symbol=../x&interval=1m&limit=5`);
    assert.equal(response.status, 400);
  });
  assert.equal(calls, 0);
});

test('허용되지 않은 경로는 404 다', async () => {
  await withRelay({}, async ({ base }) => {
    assert.equal((await fetch(`${base}/api/order`)).status, 404);
  });
});

test('허용되지 않은 출처는 403 으로 거부한다', async () => {
  await withRelay({}, async ({ base }) => {
    const response = await fetch(`${base}/healthz`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(response.status, 403);
  });
});

test('허용된 출처에는 Access-Control-Allow-Origin 을 붙이고, 미리 요청(OPTIONS)에도 응답한다', async () => {
  await withRelay({}, async ({ base }) => {
    const response = await fetch(`${base}/api/exchangeInfo`, { method: 'OPTIONS', headers: { Origin: ALLOWED } });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), ALLOWED);
  });
});

test('바이낸스 응답 상태와 Retry-After 를 그대로 전달한다', async () => {
  const limited = async () => new Response('{}', { status: 429, headers: { 'Retry-After': '12' } });
  await withRelay({ fetch: limited }, async ({ base }) => {
    const response = await fetch(`${base}/api/exchangeInfo`);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '12');
  });
});

test('차트 스트림은 바이낸스 스트림과 이어지고, 클라이언트가 닫으면 바이낸스 연결도 닫힌다', async () => {
  await withRelay({}, async ({ wsBase, upstreams }) => {
    const client = new WebSocket(`${wsBase}/ws?stream=btcusdt@kline_1m`);
    const received = new Promise((resolve) => client.on('message', (data) => resolve(data.toString())));
    await new Promise((resolve) => client.on('open', resolve));
    await waitFor(() => upstreams.length === 1);
    upstreams[0].emit('message', Buffer.from('{"k":1}'));
    assert.equal(await received, '{"k":1}');
    client.close();
    await waitFor(() => upstreams[0].closed);
  });
});

test('허용되지 않은 스트림 이름은 연결 전에 400 으로 거부한다', async () => {
  await withRelay({}, async ({ wsBase }) => {
    const client = new WebSocket(`${wsBase}/ws?stream=btcusdt@depth`);
    const error = await new Promise((resolve) => client.on('error', resolve));
    assert.match(error.message, /400/);
  });
});

test('동시 연결 상한을 넘으면 503 으로 거부한다', async () => {
  await withRelay({ maxStreamClients: 0 }, async ({ wsBase }) => {
    const client = new WebSocket(`${wsBase}/ws?stream=!ticker@arr`);
    const error = await new Promise((resolve) => client.on('error', resolve));
    assert.match(error.message, /503/);
  });
});
