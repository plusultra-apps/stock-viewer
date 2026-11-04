import { BACKOFF_BASE_MS, BACKOFF_MAX_MS } from './connectionTiming';

const GROWTH_FACTOR = 2;
// 무작위로 절반에서 전체 사이 간격을 고른다 (여러 탭이 한꺼번에 몰리지 않게)
const MIN_SHARE = 0.5;

// attempt 는 0부터 센다. random 은 0 이상 1 미만 (시험에서 고정값을 넣는다).
export function backoffDelay(attempt: number, random: number): number {
  const exponential = Math.min(BACKOFF_BASE_MS * GROWTH_FACTOR ** attempt, BACKOFF_MAX_MS);
  return exponential * (MIN_SHARE + random * MIN_SHARE);
}
