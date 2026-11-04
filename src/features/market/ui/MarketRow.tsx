import { memo } from 'react';
import { formatChangePercent, formatPrice, formatQuoteVolume, changeTone } from '../../../shared/ui/formatNumber';
import { MESSAGES } from '../../../shared/ui/messages';
import type { MarketEntry } from '../domain/MarketList';
import { pricePlaces } from '../domain/pricePlaces';
import { unitMultiplier } from '../domain/unitMultiplier';

interface MarketRowProps {
  readonly entry: MarketEntry;
  readonly selected: boolean;
  readonly onSelect: (symbol: string) => void;
}

// 값이 같으면 다시 그리지 않는다 (목록이 수백 줄일 때 AC20).
export const MarketRow = memo(function MarketRow({ entry, selected, onSelect }: MarketRowProps) {
  const { market, ticker } = entry;
  const places = pricePlaces(market.tickSize);
  const unitNote = unitMultiplier(market.symbol) === null ? '' : ` · ${MESSAGES.unitNote}`;
  return (
    <button type="button" className="market-row" aria-pressed={selected} onClick={() => onSelect(market.symbol)}>
      <span className="market-row__line">
        <span className="market-row__symbol">{market.symbol}</span>
        <span className="market-row__price">{formatPrice(ticker.lastPrice, places)}</span>
      </span>
      <span className="market-row__line market-row__sub">
        <span>{`${MESSAGES.volumeLabel} ${formatQuoteVolume(ticker.quoteVolume)}${unitNote}`}</span>
        <span className={changeTone(ticker.changePercent)}>{formatChangePercent(ticker.changePercent)}</span>
      </span>
    </button>
  );
});
