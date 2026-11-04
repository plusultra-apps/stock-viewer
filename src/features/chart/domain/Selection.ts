import type { Interval } from './Interval';

// 지금 차트에 보이는 종목 + 간격
export interface Selection {
  readonly symbol: string;
  readonly interval: Interval;
}

// 실시간 봉은 지금 고른 종목·간격과 같을 때만 반영한다 (AC15, AC16).
export function acceptsLive(selected: Selection, live: Selection): boolean {
  return selected.symbol === live.symbol && selected.interval === live.interval;
}
