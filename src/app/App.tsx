import { useState } from 'react';
import type { CandleFeed } from '../features/chart/application/CandleFeed';
import type { Interval } from '../features/chart/domain/Interval';
import { ChartPanel } from '../features/chart/ui/ChartPanel';
import { useCandles } from '../features/chart/ui/useCandles';
import type { MarketFeed } from '../features/market/application/MarketFeed';
import { MarketPanel } from '../features/market/ui/MarketPanel';
import { useMarkets } from '../features/market/ui/useMarkets';
import type { FeedError } from '../features/connection/domain/FeedError';
import { worseConnection } from '../features/connection/domain/pickBanner';
import { StatusBanner } from '../features/connection/ui/StatusBanner';
import { useConnectionStatus } from '../features/connection/ui/useConnectionStatus';
import { MESSAGES } from '../shared/ui/messages';
import type { AppServices } from './services';
import './layout.css';

const INITIAL_SYMBOL = 'BTCUSDT';
const INITIAL_INTERVAL: Interval = '1m';

export interface AppProps {
  readonly services: AppServices;
}

export function App({ services }: AppProps) {
  return <Screen marketFeed={services.marketFeed} candleFeed={services.candleFeed} />;
}

interface ScreenProps {
  readonly marketFeed: MarketFeed;
  readonly candleFeed: CandleFeed;
}

function Screen({ marketFeed, candleFeed }: ScreenProps) {
  const markets = useMarkets(marketFeed);
  const [symbol, setSymbol] = useState(INITIAL_SYMBOL);
  const [interval, setInterval] = useState<Interval>(INITIAL_INTERVAL);
  const entry = markets.list?.get(symbol);
  // 목록을 받은 뒤 이 종목이 없으면 거래 종료로 본다 (AC18)
  const halted = markets.list !== null && entry === undefined;
  const chart = useCandles(candleFeed, { symbol, interval }, halted);
  const feedFailures = [markets.listFailure, markets.refreshFailure, chart.failure].filter(
    (failure): failure is FeedError => failure !== null,
  );
  const connection = useConnectionStatus(
    {
      connection: worseConnection(markets.connection, chart.connection),
      listFailed: markets.status === 'failed',
      feedFailures,
      halted,
    },
    chart.status === 'failed',
  );
  const lastUpdated = Math.max(markets.lastUpdated ?? 0, chart.lastUpdated ?? 0) || null;
  return (
    <div className="app">
      <header className="app__header">{MESSAGES.appTitle}</header>
      <StatusBanner
        banner={connection.banner}
        lastUpdated={lastUpdated}
        onReconnect={() => {
          markets.reload();
          chart.retry();
        }}
        onRetryList={markets.reload}
      />
      <main className="app__body">
        <section className="app__list" aria-label={MESSAGES.marketListLabel}>
          <MarketPanel
            status={markets.status}
            rows={markets.rows}
            totalCount={markets.list?.rows().length ?? 0}
            query={markets.query}
            selectedSymbol={symbol}
            onQueryChange={markets.setQuery}
            onSelect={setSymbol}
            onRetry={markets.reload}
          />
        </section>
        <section className="app__chart" aria-label={MESSAGES.chartLabel}>
          <ChartPanel
            symbol={symbol}
            interval={interval}
            entry={entry}
            chart={chart}
            lastUpdated={lastUpdated}
            chip={connection.chip}
            onIntervalChange={setInterval}
          />
        </section>
      </main>
      <footer className="app__footer">{MESSAGES.readOnlyNotice}</footer>
    </div>
  );
}
