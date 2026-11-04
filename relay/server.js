// 중계 서버 진입점. Render 가 PORT 를 정해 준다.
// 로직은 src/ 에 있고 여기서는 조립과 시작만 한다.
import http from 'node:http';
import { createApp } from './src/app.js';

const DEFAULT_PORT = 8080;
const port = Number(process.env.PORT ?? DEFAULT_PORT);

const app = createApp({ fetch: globalThis.fetch, now: () => Date.now() });
const server = http.createServer(app.handleHttp);
server.on('upgrade', app.handleUpgrade);

server.listen(port, () => {
  console.log(`중계 서버 시작: 포트 ${port}`);
});
