// 요청 제한 상태. blockedUntil 이 지나기 전에는 어떤 REST 요청도 보내지 않는다 (AC21).
export class RateLimit {
  private blockedUntil = 0;

  blockFor(now: number, waitMs: number): void {
    this.blockedUntil = now + waitMs;
  }

  remainingMs(now: number): number {
    return Math.max(0, this.blockedUntil - now);
  }
}
