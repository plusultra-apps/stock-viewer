import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { bridgeStream } from '../src/streamBridge.js';

function fakeSocket() {
  const socket = new EventEmitter();
  socket.readyState = 1;
  socket.closed = false;
  socket.sent = [];
  socket.send = (text) => socket.sent.push(text);
  socket.close = () => {
    socket.closed = true;
  };
  return socket;
}

test('바이낸스 메시지는 그대로 클라이언트에 전달한다', () => {
  const client = fakeSocket();
  const upstream = fakeSocket();
  bridgeStream(client, upstream, () => {});
  upstream.emit('message', Buffer.from('{"e":"kline"}'));
  assert.deepEqual(client.sent, ['{"e":"kline"}']);
});

test('클라이언트가 닫으면 바이낸스 연결도 닫고 종료를 한 번만 알린다', () => {
  const client = fakeSocket();
  const upstream = fakeSocket();
  let ended = 0;
  bridgeStream(client, upstream, () => (ended += 1));
  client.emit('close');
  upstream.emit('close');
  assert.equal(upstream.closed, true);
  assert.equal(ended, 1);
});

test('바이낸스 연결이 끊기면 클라이언트 연결도 닫는다', () => {
  const client = fakeSocket();
  const upstream = fakeSocket();
  bridgeStream(client, upstream, () => {});
  upstream.emit('close');
  assert.equal(client.closed, true);
});
