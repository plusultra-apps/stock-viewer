import type { CandlestickData, HistogramData, Time, UTCTimestamp } from 'lightweight-charts';
import type { Candle } from '../domain/Candle';
import { CHART_THEME } from './chartTheme';

// 차트 라이브러리와 주고받는 값 변환. 시간은 UTC 초로 넘긴다 (데이터를 9시간 밀지 않는다, AC5).
const MS_PER_SECOND = 1000;

export function toChartTime(openTime: number): UTCTimestamp {
  return Math.floor(openTime / MS_PER_SECOND) as UTCTimestamp;
}

// 차트가 알려 준 시간을 밀리초로 바꾼다. 숫자 시간이 아니면 null.
export function epochMsOf(time: Time): number | null {
  return typeof time === 'number' ? time * MS_PER_SECOND : null;
}

export function toCandleBar(candle: Candle): CandlestickData<UTCTimestamp> {
  return {
    time: toChartTime(candle.openTime),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  };
}

export function toVolumeBar(candle: Candle): HistogramData<UTCTimestamp> {
  return {
    time: toChartTime(candle.openTime),
    value: candle.volume,
    color: candle.close >= candle.open ? CHART_THEME.volumeUp : CHART_THEME.volumeDown,
  };
}

// 십자선이 가리킨 봉의 값으로 Candle 을 다시 만든다 (말풍선용).
export function candleFromBars(time: UTCTimestamp, bar: CandlestickData<Time>, volume: number): Candle {
  return {
    openTime: time * MS_PER_SECOND,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume,
  };
}
