import { FeedError } from '../domain/FeedError';
import type { RateLimit } from '../domain/RateLimit';
import { HTTP_STATUS, IP_BAN_DEFAULT_MS, RATE_LIMIT_DEFAULT_MS } from './binanceValues';

export interface HttpDeps {
  readonly fetch: typeof fetch;
  readonly now: () => number;
  readonly gate: RateLimit;
}

const MS_PER_SECOND = 1000;
const REQUEST_TIMEOUT_SECONDS = 10;
// 응답이 멈춰도 "불러오는 중"에 영원히 머물지 않도록 요청마다 시간 제한을 둔다.
const REQUEST_TIMEOUT_MS = REQUEST_TIMEOUT_SECONDS * MS_PER_SECOND;

// 모든 REST 요청이 지나는 한 곳. 대기 중이면 네트워크에 나가지 않는다 (AC21).
export async function getJson(url: string, deps: HttpDeps, signal?: AbortSignal): Promise<unknown> {
  const waitLeft = deps.gate.remainingMs(deps.now());
  if (waitLeft > 0) {
    throw new FeedError('rateLimited', '요청 제한 대기 중', { retryAfterMs: waitLeft });
  }
  const response = await sendRequest(url, deps, signal);
  if (!response.ok) {
    throw failureFor(response, deps);
  }
  return readBody(response);
}

async function sendRequest(url: string, deps: HttpDeps, signal?: AbortSignal): Promise<Response> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  try {
    return await deps.fetch(url, { credentials: 'omit', signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  } catch (cause) {
    // 호출한 쪽이 취소한 것이면 그대로 전달하고, 시간 제한·네트워크 실패는 화면 상태로 바꾼다.
    if (signal?.aborted) {
      throw cause;
    }
    throw new FeedError('network', '네트워크 요청 실패', { cause });
  }
}

function failureFor(response: Response, deps: HttpDeps): FeedError {
  const { status } = response;
  if (status === HTTP_STATUS.Blocked) {
    return new FeedError('blocked', '이 지역·네트워크에서 시세를 받을 수 없음', { status });
  }
  if (status === HTTP_STATUS.RateLimited || status === HTTP_STATUS.IpBanned) {
    return rateLimitFailure(response, deps);
  }
  return new FeedError('http', `HTTP 오류 ${status}`, { status });
}

function rateLimitFailure(response: Response, deps: HttpDeps): FeedError {
  const headerMs = readRetryAfterMs(response.headers.get('Retry-After'));
  const defaultMs = response.status === HTTP_STATUS.IpBanned ? IP_BAN_DEFAULT_MS : RATE_LIMIT_DEFAULT_MS;
  deps.gate.blockFor(deps.now(), headerMs ?? defaultMs);
  return new FeedError('rateLimited', `요청 제한 (HTTP ${response.status})`, {
    status: response.status,
    retryAfterMs: headerMs,
  });
}

function readRetryAfterMs(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') {
    return null;
  }
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * MS_PER_SECOND : null;
}

async function readBody(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    const value: unknown = JSON.parse(text);
    return value;
  } catch (cause) {
    throw new FeedError('badResponse', '응답 본문을 JSON 으로 읽을 수 없음', { cause });
  }
}
