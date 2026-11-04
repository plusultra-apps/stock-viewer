import { MESSAGES } from '../../../shared/ui/messages';
import { INTERVALS, type Interval } from '../domain/Interval';

const INTERVAL_LABELS: Readonly<Record<Interval, string>> = {
  '1m': '1분',
  '5m': '5분',
  '15m': '15분',
  '1h': '1시간',
  '4h': '4시간',
  '1d': '1일',
};

export interface IntervalBarProps {
  readonly value: Interval;
  readonly onChange: (interval: Interval) => void;
}

// 눌린 간격은 글자로도 알린다 (aria-pressed).
export function IntervalBar({ value, onChange }: IntervalBarProps) {
  return (
    <nav className="toolbar" aria-label={MESSAGES.intervalGroupLabel}>
      {INTERVALS.map((interval) => (
        <button
          key={interval}
          type="button"
          className="tf"
          aria-pressed={interval === value}
          onClick={() => onChange(interval)}
        >
          {INTERVAL_LABELS[interval]}
        </button>
      ))}
    </nav>
  );
}
