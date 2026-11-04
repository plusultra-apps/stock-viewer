import { MESSAGES } from './messages';

const PERCENT_DIGITS = 2;
const COMPACT_FORMAT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

// 가격은 바이낸스 가격 단위 자릿수로 고정한다 (AC8, AC15)
export function formatPrice(value: number | null, places: number): string {
  if (value === null) {
    return MESSAGES.noValue;
  }
  return value.toLocaleString('en-US', { minimumFractionDigits: places, maximumFractionDigits: places });
}

export function formatChangePercent(value: number | null): string {
  if (value === null) {
    return MESSAGES.noValue;
  }
  const arrow = value < 0 ? '▼' : '▲';
  const sign = value < 0 ? '' : '+';
  return `${arrow} ${sign}${value.toFixed(PERCENT_DIGITS)}%`;
}

export function changeTone(value: number | null): 'value-up' | 'value-down' | 'value-none' {
  if (value === null) {
    return 'value-none';
  }
  return value < 0 ? 'value-down' : 'value-up';
}

export function formatQuoteVolume(value: number | null): string {
  if (value === null) {
    return MESSAGES.noValue;
  }
  return `$${COMPACT_FORMAT.format(value)}`;
}
