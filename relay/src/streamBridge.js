import { WS_OPEN } from './config.js';

// 클라이언트 연결과 바이낸스 연결을 이어 준다. 한쪽이 끊기면 다른 쪽도 닫는다.
// onEnd 는 두 연결 중 어느 쪽이 끊기든 한 번만 부른다 (동시 연결 수를 세는 데 쓴다).
export function bridgeStream(client, upstream, onEnd) {
  let ended = false;
  const finish = () => {
    if (!ended) {
      ended = true;
      onEnd();
    }
  };

  upstream.on('message', (data) => {
    if (client.readyState === WS_OPEN) {
      client.send(data.toString());
    }
  });
  upstream.on('close', () => {
    closeQuietly(client);
    finish();
  });
  upstream.on('error', () => closeQuietly(client));

  client.on('close', () => {
    closeQuietly(upstream);
    finish();
  });
  client.on('error', () => closeQuietly(upstream));
}

function closeQuietly(socket) {
  try {
    socket.close();
  } catch {
    // 이미 닫히는 중이면 무시한다
  }
}
