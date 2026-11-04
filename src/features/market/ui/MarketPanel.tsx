import { MESSAGES } from '../../../shared/ui/messages';
import type { MarketEntry } from '../domain/MarketList';
import { MarketRow } from './MarketRow';
import { SearchBox } from './SearchBox';
import type { MarketsStatus } from './useMarkets';

export interface MarketPanelProps {
  readonly status: MarketsStatus;
  readonly rows: readonly MarketEntry[];
  readonly totalCount: number;
  readonly query: string;
  readonly selectedSymbol: string;
  readonly onQueryChange: (query: string) => void;
  readonly onSelect: (symbol: string) => void;
  readonly onRetry: () => void;
}

export function MarketPanel(props: MarketPanelProps) {
  return (
    <div className="market-panel">
      <SearchBox value={props.query} disabled={props.status !== 'ready'} onChange={props.onQueryChange} />
      <MarketBody {...props} />
    </div>
  );
}

function MarketBody(props: MarketPanelProps) {
  if (props.status === 'loading') {
    return <p role="status">{MESSAGES.marketLoading}</p>;
  }
  if (props.status === 'failed') {
    return (
      <div role="status">
        <p>{MESSAGES.marketFailed}</p>
        <button type="button" onClick={props.onRetry}>
          {MESSAGES.retry}
        </button>
      </div>
    );
  }
  if (props.totalCount === 0) {
    return <p role="status">{MESSAGES.marketEmpty}</p>;
  }
  if (props.rows.length === 0) {
    return (
      <div role="status">
        <p>{MESSAGES.noSearchResult}</p>
        <p>{MESSAGES.noSearchResultHint}</p>
      </div>
    );
  }
  return (
    <ul className="market-list" aria-label={MESSAGES.marketListLabel}>
      {props.rows.map((entry) => (
        <li key={entry.market.symbol}>
          <MarketRow
            entry={entry}
            selected={entry.market.symbol === props.selectedSymbol}
            onSelect={props.onSelect}
          />
        </li>
      ))}
    </ul>
  );
}
