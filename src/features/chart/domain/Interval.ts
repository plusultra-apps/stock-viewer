// 봉 간격. 여섯 개뿐이다 (PR/FAQ AC2).
export const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

export type Interval = (typeof INTERVALS)[number];

const MINUTE_MS = 60_000;
const FIVE_MINUTES_MS = 300_000;
const FIFTEEN_MINUTES_MS = 900_000;
const HOUR_MS = 3_600_000;
const FOUR_HOURS_MS = 14_400_000;
const DAY_MS = 86_400_000;

const INTERVAL_MS: Readonly<Record<Interval, number>> = {
  '1m': MINUTE_MS,
  '5m': FIVE_MINUTES_MS,
  '15m': FIFTEEN_MINUTES_MS,
  '1h': HOUR_MS,
  '4h': FOUR_HOURS_MS,
  '1d': DAY_MS,
};

export function isInterval(value: string): value is Interval {
  return (INTERVALS as readonly string[]).includes(value);
}

export function intervalMs(interval: Interval): number {
  return INTERVAL_MS[interval];
}
