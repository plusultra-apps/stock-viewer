// 시세 요청 실패의 종류. 화면 문구는 shared/ui/messages 가, 상세는 콘솔 경고가 맡는다.
export const FEED_ERROR_KIND = {
  Blocked: 'blocked',
  RateLimited: 'rateLimited',
  BadResponse: 'badResponse',
  Network: 'network',
  Http: 'http',
} as const;

export type FeedErrorKind = (typeof FEED_ERROR_KIND)[keyof typeof FEED_ERROR_KIND];

interface FeedErrorOptions {
  readonly status?: number;
  // 바이낸스가 알려 준 대기 시간(ms). 헤더를 못 읽었으면 null.
  readonly retryAfterMs?: number | null;
  readonly cause?: unknown;
}

export class FeedError extends Error {
  readonly kind: FeedErrorKind;
  readonly status: number | null;
  readonly retryAfterMs: number | null;

  constructor(kind: FeedErrorKind, message: string, options: FeedErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'FeedError';
    this.kind = kind;
    this.status = options.status ?? null;
    this.retryAfterMs = options.retryAfterMs ?? null;
  }
}

// 어디서 나든 시세 오류는 FeedError 로 맞춘다 (화면 알림이 종류를 본다).
export function toFeedError(error: unknown): FeedError {
  if (error instanceof FeedError) {
    return error;
  }
  return new FeedError('network', '시세 요청 중 알 수 없는 오류', { cause: error });
}
