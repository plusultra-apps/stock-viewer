import { test } from 'node:test';
import assert from 'node:assert/strict';
import { originVerdict, corsHeaders } from '../src/cors.js';
import { ALLOWED_ORIGINS } from '../src/config.js';

test('Origin 이 없으면 CORS 판정 없이 통과한다', () => {
  assert.equal(originVerdict(undefined, ALLOWED_ORIGINS), 'none');
});

test('배포 주소와 로컬 개발 주소는 허용한다', () => {
  for (const origin of ['https://stock-viewer-snowy.vercel.app', 'http://localhost:5173', 'http://localhost:4173']) {
    assert.equal(originVerdict(origin, ALLOWED_ORIGINS), 'allowed');
  }
});

test('허용 목록 밖의 출처는 거부한다 (접미사를 붙인 주소 포함)', () => {
  assert.equal(originVerdict('https://evil.example', ALLOWED_ORIGINS), 'rejected');
  assert.equal(originVerdict('https://stock-viewer-snowy.vercel.app.evil.example', ALLOWED_ORIGINS), 'rejected');
  assert.equal(originVerdict('http://localhost:5174', ALLOWED_ORIGINS), 'rejected');
  assert.equal(originVerdict('null', ALLOWED_ORIGINS), 'rejected');
});

test('허용된 출처에는 그 출처만 Access-Control-Allow-Origin 으로 돌려준다', () => {
  const headers = corsHeaders('http://localhost:5173');
  assert.equal(headers['Access-Control-Allow-Origin'], 'http://localhost:5173');
  assert.equal(headers.Vary, 'Origin');
});
