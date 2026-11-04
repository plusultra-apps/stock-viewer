// 바이낸스가 요청 제한(429·418)을 걸면 그 엔드포인트만 정해진 시간 동안 막는다.
// 막혀 있는 동안에는 바이낸스로 요청을 보내지 않는다.
export function createBlockGate(now) {
  const blockedUntil = new Map();

  return {
    block(key, ms) {
      blockedUntil.set(key, now() + ms);
    },
    remainingMs(key) {
      const until = blockedUntil.get(key) ?? 0;
      return Math.max(0, until - now());
    },
  };
}
