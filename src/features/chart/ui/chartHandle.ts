import {
  type CandlestickData,
  CandlestickSeries,
  createChart,
  type HistogramData,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts';
import { formatKst, formatKstClock } from '../../../shared/ui/formatKst';
import type { Candle } from '../domain/Candle';
import { candleFromBars, epochMsOf, toCandleBar, toVolumeBar } from './chartBars';
import { CHART_THEME } from './chartTheme';

// 차트 라이브러리를 직접 만지는 곳은 이 파일 하나다. 화면 컴포넌트는 이 핸들만 쓴다.
export interface CandleChartHandle {
  setCandles(candles: readonly Candle[]): void;
  updateCandle(candle: Candle): void;
  dispose(): void;
}

export interface CandleChartOptions {
  readonly pricePlaces: number;
  readonly onHover: (candle: Candle | null) => void;
}

const DECIMAL_BASE = 10;
const VOLUME_TOP_MARGIN = 0.8;

export function createCandleChart(container: HTMLElement, options: CandleChartOptions): CandleChartHandle {
  const chart = createChart(container, chartOptions());
  const candles = chart.addSeries(CandlestickSeries, candleSeriesOptions(options.pricePlaces));
  const volumes = chart.addSeries(HistogramSeries, volumeSeriesOptions());
  volumes.priceScale().applyOptions({ scaleMargins: { top: VOLUME_TOP_MARGIN, bottom: 0 } });
  chart.subscribeCrosshairMove((param) => options.onHover(hoveredCandle(param, candles, volumes)));
  return handleOf(chart, candles, volumes);
}

function handleOf(
  chart: IChartApi,
  candles: ISeriesApi<'Candlestick'>,
  volumes: ISeriesApi<'Histogram'>,
): CandleChartHandle {
  return {
    setCandles: (list) => setAll(candles, volumes, list),
    updateCandle: (candle) => updateOne(candles, volumes, candle),
    dispose: () => chart.remove(),
  };
}

function setAll(candles: ISeriesApi<'Candlestick'>, volumes: ISeriesApi<'Histogram'>, list: readonly Candle[]): void {
  candles.setData(list.map((candle) => toCandleBar(candle)));
  volumes.setData(list.map((candle) => toVolumeBar(candle)));
}

function updateOne(candles: ISeriesApi<'Candlestick'>, volumes: ISeriesApi<'Histogram'>, candle: Candle): void {
  candles.update(toCandleBar(candle));
  volumes.update(toVolumeBar(candle));
}

function chartOptions() {
  return {
    autoSize: true,
    layout: { background: { color: 'transparent' }, textColor: CHART_THEME.text, attributionLogo: true },
    grid: { vertLines: { color: CHART_THEME.grid }, horzLines: { color: CHART_THEME.grid } },
    localization: { timeFormatter: (time: Time) => kstLabel(time, formatKst) },
    timeScale: { timeVisible: true, tickMarkFormatter: (time: Time) => kstLabel(time, formatKstClock) },
  };
}

function candleSeriesOptions(pricePlaces: number) {
  return {
    upColor: CHART_THEME.up,
    downColor: CHART_THEME.down,
    wickUpColor: CHART_THEME.up,
    wickDownColor: CHART_THEME.down,
    borderVisible: false,
    priceFormat: { type: 'price' as const, precision: pricePlaces, minMove: 1 / DECIMAL_BASE ** pricePlaces },
  };
}

function volumeSeriesOptions() {
  return {
    priceFormat: { type: 'volume' as const },
    priceScaleId: 'volume',
    lastValueVisible: false,
    priceLineVisible: false,
  };
}

function kstLabel(time: Time, format: (epochMs: number) => string): string {
  const epochMs = epochMsOf(time);
  return epochMs === null ? '' : format(epochMs);
}

function hoveredCandle(
  param: MouseEventParams<Time>,
  candles: ISeriesApi<'Candlestick'>,
  volumes: ISeriesApi<'Histogram'>,
): Candle | null {
  const { time } = param;
  if (typeof time !== 'number') {
    return null;
  }
  const bar = param.seriesData.get(candles) as CandlestickData<Time> | undefined;
  const volume = param.seriesData.get(volumes) as HistogramData<Time> | undefined;
  return bar === undefined || volume === undefined ? null : candleFromBars(time, bar, volume.value);
}
