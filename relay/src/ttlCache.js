// 키별로 값을 잠깐 보관한다. 시간은 주입된 now() 로 재서 시험에서 바꿀 수 있다.
export function createTtlCache(now) {
  const entries = new Map();

  return {
    get(key) {
      const entry = entries.get(key);
      if (entry === undefined) {
        return undefined;
      }
      if (now() >= entry.expiresAt) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value, ttlMs) {
      entries.set(key, { value, expiresAt: now() + ttlMs });
    },
  };
}
