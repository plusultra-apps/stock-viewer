import { formatKst } from '../../../shared/ui/formatKst';
import { formatPrice } from '../../../shared/ui/formatNumber';
import { MESSAGES } from '../../../shared/ui/messages';
import type { Candle } from '../domain/Candle';

export interface CandleInfoLineProps {
  readonly candle: Candle | null;
  readonly label: string;
  readonly places: number;
}

// 봉 값을 글자로 보여 준다. 차트에 마우스를 올리면 그 봉으로 바뀐다 (말풍선 자리).
export function CandleInfoLine({ candle, label, places }: CandleInfoLineProps) {
  if (candle === null) {
    return <div className="candle-info num">{MESSAGES.noValue}</div>;
  }
  return (
    <div className="candle-info num">
      <span className="candle-info__label">{label}</span>
      <span>{formatKst(candle.openTime)}</span>
      <span>
        {MESSAGES.candleOpen} {formatPrice(candle.open, places)}
      </span>
      <span>
        {MESSAGES.candleHigh} {formatPrice(candle.high, places)}
      </span>
      <span>
        {MESSAGES.candleLow} {formatPrice(candle.low, places)}
      </span>
      <span>
        {MESSAGES.candleClose} {formatPrice(candle.close, places)}
      </span>
      <span>
        {MESSAGES.candleVolume} {candle.volume.toLocaleString('en-US', { maximumFractionDigits: 3 })}
      </span>
    </div>
  );
}
