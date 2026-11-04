// 바이낸스 응답에 나오는 값과 그 기본 설정. 샘플(fixtures/binance) 기준이며 실제 값은 미확인 (03-tech-design 4-8).
export const TRADING_STATUS = 'TRADING';
export const PERPETUAL_CONTRACT = 'PERPETUAL';


export const HTTP_STATUS = {
  Blocked: 451,
  RateLimited: 429,
  IpBanned: 418,
} as const;

// Retry-After 헤더를 읽지 못했을 때 기다리는 기본 시간
export const RATE_LIMIT_DEFAULT_MS = 60_000;
export const IP_BAN_DEFAULT_MS = 300_000;

export const PRICE_FILTER = 'PRICE_FILTER';
