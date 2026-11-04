import { useState } from 'react';
import { MESSAGES } from '../../../shared/ui/messages';
import type { ChipKey } from '../../connection/domain/pickBanner';
import type { MarketEntry } from '../../market/domain/MarketList';
import { pricePlaces } from '../../market/domain/pricePlaces';
import { unitMultiplier } from '../../market/domain/unitMultiplier';
import { DEFAULT_PRICE_PLACES } from '../domain/chartSettings';
import type { Candle } from '../domain/Candle';
import type { Interval } from '../domain/Interval';
import { CandleChart } from './CandleChart';
import { CandleInfoLine } from './CandleInfoLine';
import { ChartHeader } from './ChartHeader';
import { IntervalBar } from './IntervalBar';
import type { CandlesView } from './useCandles';

export interface ChartPanelProps {
  readonly symbol: string;
  readonly interval: Interval;
  readonly entry: MarketEntry | undefined;
  readonly chart: CandlesView;
  readonly lastUpdated: number | null;
  readonly chip: ChipKey;
  readonly onIntervalChange: (interval: Interval) => void;
}

// 차트 화면 조립. 상태는 useCandles 가 가지고, 여기는 보여 주기만 한다.
export function ChartPanel(props: ChartPanelProps) {
  const { symbol, interval, entry, chart } = props;
  const places = entry === undefined ? DEFAULT_PRICE_PLACES : pricePlaces(entry.market.tickSize);
  // 마우스가 가리킨 봉은 종목·간격이 바뀌면 자동으로 버린다 (키가 다르면 무시)
  const viewKey = `${symbol}|${interval}`;
  const [hover, setHover] = useState<{ readonly viewKey: string; readonly candle: Candle | null } | null>(null);
  const hovered = hover !== null && hover.viewKey === viewKey ? hover.candle : null;
  const onHover = (candle: Candle | null) => setHover({ viewKey, candle });
  const lastCandle = chart.snapshot.candles.at(-1) ?? null;
  const shown = hovered ?? lastCandle;
  return (
    <div className="chart-panel">
      <ChartHeader
        symbol={symbol}
        isUnitSymbol={unitMultiplier(symbol) !== null}
        price={entry?.ticker.lastPrice ?? null}
        changePercent={entry?.ticker.changePercent ?? null}
        places={places}
        lastUpdated={props.lastUpdated}
        chip={props.chip}
      />
      <IntervalBar value={interval} onChange={props.onIntervalChange} />
      <ChartBody chart={chart} places={places} onHover={onHover} />
      <CandleInfoLine
        candle={shown}
        label={hovered === null ? MESSAGES.lastCandle : MESSAGES.selectedCandle}
        places={places}
      />
      <footer className="chart-foot">
        {MESSAGES.kstNotice} {MESSAGES.tradingViewNotice}{" "}
        <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">tradingview.com</a>
      </footer>
    </div>
  );
}

interface ChartBodyProps {
  readonly chart: CandlesView;
  readonly places: number;
  readonly onHover: (candle: Candle | null) => void;
}

function ChartBody({ chart, places, onHover }: ChartBodyProps) {
  if (chart.status === 'loading') {
    return (
      <div className="chart-message" role="status">
        <p>{MESSAGES.chartLoading}</p>
      </div>
    );
  }
  if (chart.status === 'failed') {
    return (
      <div className="chart-message" role="status">
        <p>{MESSAGES.chartFailed}</p>
        <button type="button" className="btn" onClick={chart.retry}>
          {MESSAGES.retry}
        </button>
      </div>
    );
  }
  return (
    <CandleChart
      key={places}
      snapshot={chart.snapshot}
      latest={chart.latest}
      pricePlaces={places}
      onHover={onHover}
    />
  );
}
