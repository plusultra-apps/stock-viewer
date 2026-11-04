import { FeedError } from '../domain/FeedError';
import { RateLimit } from '../domain/RateLimit';
import { binanceEndpoints } from './binanceEndpoints';
import { getJson, type HttpDeps } from './binanceHttp';

const URL_TEXT = binanceEndpoints.exchangeInfo;

function respond(status: number, body: unknown = {}, headers: Record<string, string> = {}): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(text, { status, headers });
}

function makeDeps(responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }
  let clock = 0;
  const gate = new RateLimit();
  const deps: HttpDeps = {
    fetch: fetchMock,
    now: () => clock,
    gate,
  };
  return { deps, fetchMock, setClock: (ms: number) => (clock = ms) };
}

async function failureOf(promise: Promise<unknown>): Promise<FeedError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof FeedError) {
      return error;
    }
    throw error;
  }
  throw new Error('오류가 나야 하는데 성공했다');
}

describe('바이낸스 요청', () => {
  it('정상 응답의 본문을 그대로 돌려준다', async () => {
    const { deps } = makeDeps([respond(200, { symbols: [] })]);
    await expect(getJson(URL_TEXT, deps)).resolves.toEqual({ symbols: [] });
  });

  it('요청에는 계정 정보를 붙이지 않는다', async () => {
    const { deps, fetchMock } = makeDeps([respond(200, [])]);
    await getJson(URL_TEXT, deps);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: 'omit' });
  });

  it('451 응답은 차단으로 분류하고 다시 요청하지 않는다', async () => {
    const { deps, fetchMock } = makeDeps([respond(451)]);
    const error = await failureOf(getJson(URL_TEXT, deps));
    expect(error.kind).toBe('blocked');
    expect(error.status).toBe(451);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('429 를 받으면 기본 60초 동안 새 요청을 보내지 않는다', async () => {
    const { deps, fetchMock, setClock } = makeDeps([respond(429), respond(200, [])]);
    const first = await failureOf(getJson(URL_TEXT, deps));
    expect(first.kind).toBe('rateLimited');
    expect(first.retryAfterMs).toBeNull();

    setClock(59_999);
    const waiting = await failureOf(getJson(URL_TEXT, deps));
    expect(waiting.kind).toBe('rateLimited');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    setClock(60_000);
    await expect(getJson(URL_TEXT, deps)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('Retry-After 헤더를 읽을 수 있으면 그 초만큼 기다리고 남은 시간을 알려 준다', async () => {
    const { deps, setClock } = makeDeps([respond(429, {}, { 'Retry-After': '30' })]);
    const first = await failureOf(getJson(URL_TEXT, deps));
    expect(first.retryAfterMs).toBe(30_000);

    setClock(10_000);
    const waiting = await failureOf(getJson(URL_TEXT, deps));
    expect(waiting.retryAfterMs).toBe(20_000);
  });

  it('418 은 IP 차단으로 보고 기본 5분 동안 기다린다', async () => {
    const { deps, setClock } = makeDeps([respond(418), respond(200, [])]);
    await failureOf(getJson(URL_TEXT, deps));

    setClock(299_999);
    expect((await failureOf(getJson(URL_TEXT, deps))).kind).toBe('rateLimited');

    setClock(300_000);
    await expect(getJson(URL_TEXT, deps)).resolves.toEqual([]);
  });

  it('그 밖의 실패 코드는 http 오류로 상태 코드를 담는다', async () => {
    const { deps } = makeDeps([respond(400)]);
    const error = await failureOf(getJson(URL_TEXT, deps));
    expect(error.kind).toBe('http');
    expect(error.status).toBe(400);
  });

  it('네트워크가 끊기면 network 오류다', async () => {
    const { deps, fetchMock } = makeDeps([]);
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const error = await failureOf(getJson(URL_TEXT, deps));
    expect(error.kind).toBe('network');
  });

  it('JSON 이 아닌 본문은 badResponse 오류다', async () => {
    const { deps } = makeDeps([respond(200, 'not json')]);
    const error = await failureOf(getJson(URL_TEXT, deps));
    expect(error.kind).toBe('badResponse');
  });
});
