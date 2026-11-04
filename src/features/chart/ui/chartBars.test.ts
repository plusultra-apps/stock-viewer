import type { Candle } from '../domain/Candle';
import { candleFromBars, epochMsOf, toCandleBar, toChartTime, toVolumeBar } from './chartBars';
import { CHART_THEME } from './chartTheme';

const CANDLE: Candle = {
  openTime: 1761699600000,
  open: 93300,
  high: 93400,
  low: 93250,
  close: 93380.1,
  volume: 120.5,
};

describe('차트 시간은 UTC 초로 넘긴다', () => {
  it('밀리초 시작 시각을 초로 바꾼다', () => {
    expect(toChartTime(CANDLE.openTime)).toBe(1761699600);
  });

  it('차트가 알려 준 초를 밀리초로 되돌린다', () => {
    expect(epochMsOf(toChartTime(CANDLE.openTime))).toBe(CANDLE.openTime);
  });

  it('숫자가 아닌 시간 값은 밀리초로 바꾸지 않는다', () => {
    expect(epochMsOf('2026-10-29')).toBeNull();
  });
});

describe('봉을 차트 값으로 바꾼다', () => {
  it('캔들은 시가·고가·저가·종가를 그대로 옮긴다', () => {
    expect(toCandleBar(CANDLE)).toEqual({
      time: 1761699600,
      open: 93300,
      high: 93400,
      low: 93250,
      close: 93380.1,
    });
  });

  it('종가가 시가 이상이면 거래량 막대는 상승 색이다', () => {
    expect(toVolumeBar(CANDLE).color).toBe(CHART_THEME.volumeUp);
  });

  it('종가가 시가보다 낮으면 거래량 막대는 하락 색이다', () => {
    expect(toVolumeBar({ ...CANDLE, close: 93000 }).color).toBe(CHART_THEME.volumeDown);
  });

  it('십자선이 가리킨 봉 값으로 말풍선 봉을 다시 만든다', () => {
    const bar = toCandleBar(CANDLE);
    expect(candleFromBars(toChartTime(CANDLE.openTime), bar, CANDLE.volume)).toEqual(CANDLE);
  });
});
