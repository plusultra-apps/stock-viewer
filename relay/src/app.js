import { WebSocket, WebSocketServer } from 'ws';
import { isAllowedStream } from './allowlist.js';
import { corsHeaders, originVerdict } from './cors.js';
import { BINANCE_WS_BASE, ALLOWED_ORIGINS, MAX_STREAM_CLIENTS } from './config.js';
import { createRestProxy } from './restProxy.js';
import { resolveApiRoute } from './routes.js';
import { bridgeStream } from './streamBridge.js';

const STATUS_TEXT = {
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  503: 'Service Unavailable',
};

// HTTP 요청과 WebSocket 연결을 처리하는 조립점. 바이낸스 호출 수단은 주입받는다 (시험용).
export function createApp({
  fetch,
  now,
  allowedOrigins = ALLOWED_ORIGINS,
  openUpstream = (url) => new WebSocket(url),
  maxStreamClients = MAX_STREAM_CLIENTS,
}) {
  const forward = createRestProxy({ fetch, now });
  const wss = new WebSocketServer({ noServer: true });
  let activeStreams = 0;

  async function handleHttp(req, res) {
    try {
      await route(req, res);
    } catch {
      sendJson(res, 500, { error: '중계 서버 내부 오류' }, {});
    }
  }

  async function route(req, res) {
    const verdict = originVerdict(req.headers.origin, allowedOrigins);
    if (verdict === 'rejected') {
      return sendJson(res, 403, { error: '허용되지 않은 출처입니다' }, {});
    }
    const cors = verdict === 'allowed' ? corsHeaders(req.headers.origin) : {};
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      return res.end();
    }
    if (req.method !== 'GET') {
      return sendJson(res, 405, { error: 'GET 만 지원합니다' }, cors);
    }
    const url = new URL(req.url ?? '/', 'http://relay.internal');
    if (url.pathname === '/healthz') {
      return sendJson(res, 200, { ok: true }, cors);
    }
    const apiRoute = resolveApiRoute(url.pathname, url.searchParams);
    if (apiRoute.kind === 'notFound') {
      return sendJson(res, 404, { error: '없는 경로입니다' }, cors);
    }
    if (apiRoute.kind === 'badRequest') {
      return sendJson(res, 400, { error: apiRoute.message }, cors);
    }
    const result = await forward(apiRoute);
    res.writeHead(result.status, { ...result.headers, ...cors });
    return res.end(result.body);
  }

  function handleUpgrade(req, socket, head) {
    const url = new URL(req.url ?? '/', 'http://relay.internal');
    if (url.pathname !== '/ws') {
      return rejectUpgrade(socket, 404);
    }
    if (originVerdict(req.headers.origin, allowedOrigins) === 'rejected') {
      return rejectUpgrade(socket, 403);
    }
    const stream = url.searchParams.get('stream');
    if (!isAllowedStream(stream)) {
      return rejectUpgrade(socket, 400);
    }
    if (activeStreams >= maxStreamClients) {
      return rejectUpgrade(socket, 503);
    }
    wss.handleUpgrade(req, socket, head, (client) => {
      activeStreams += 1;
      const upstream = openUpstream(`${BINANCE_WS_BASE}/ws/${stream}`);
      bridgeStream(client, upstream, () => {
        activeStreams -= 1;
      });
    });
  }

  return { handleHttp, handleUpgrade };
}

function sendJson(res, status, value, headers) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(value));
}

function rejectUpgrade(socket, status) {
  socket.write(`HTTP/1.1 ${status} ${STATUS_TEXT[status]}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}
