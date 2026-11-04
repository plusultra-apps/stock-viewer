import { createBlockGate } from './blockGate.js';
import { createTtlCache } from './ttlCache.js';
import { RATE_LIMIT_DEFAULT_MS, UPSTREAM_TIMEOUT_MS } from './config.js';

const MS_PER_SECOND = 1000;
const RATE_LIMIT_STATUSES = new Set([429, 418]);
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

// binance 종류 경로(routes.js)를 바이낸스에 보내고 결과를 그대로 돌려준다.
// 반환: { status, headers, body } — 호출한 쪽이 응답으로 쓴다.
export function createRestProxy({ fetch, now }) {
  const cache = createTtlCache(now);
  const gate = createBlockGate(now);

  return async function forward(route) {
    const waitMs = gate.remainingMs(route.key);
    if (waitMs > 0) {
      return blockedResponse(waitMs);
    }
    const cached = route.ttlMs > 0 ? cache.get(route.url) : undefined;
    if (cached !== undefined) {
      return cached;
    }
    const upstream = await requestUpstream(fetch, route.url);
    if (upstream === null) {
      return jsonResponse(502, { error: '바이낸스에 연결하지 못했습니다' });
    }
    const result = await toResult(upstream, route, gate);
    if (result.status === 200 && route.ttlMs > 0) {
      cache.set(route.url, result, route.ttlMs);
    }
    return result;
  };
}

async function requestUpstream(fetch, url) {
  try {
    return await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
}

async function toResult(upstream, route, gate) {
  const body = await upstream.text();
  const headers = { ...JSON_HEADERS };
  if (RATE_LIMIT_STATUSES.has(upstream.status)) {
    const headerValue = upstream.headers.get('retry-after');
    const waitMs = parseRetryAfterMs(headerValue) ?? RATE_LIMIT_DEFAULT_MS[upstream.status];
    gate.block(route.key, waitMs);
    headers['Retry-After'] = headerValue ?? String(Math.ceil(waitMs / MS_PER_SECOND));
  }
  return { status: upstream.status, headers, body };
}

function blockedResponse(waitMs) {
  return {
    status: 503,
    headers: { ...JSON_HEADERS, 'Retry-After': String(Math.ceil(waitMs / MS_PER_SECOND)) },
    body: JSON.stringify({ error: '바이낸스 요청 제한 대기 중입니다' }),
  };
}

function jsonResponse(status, value) {
  return { status, headers: { ...JSON_HEADERS }, body: JSON.stringify(value) };
}

function parseRetryAfterMs(raw) {
  if (raw === null || raw.trim() === '') {
    return null;
  }
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * MS_PER_SECOND : null;
}
