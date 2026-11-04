import { formatChangePercent, changeTone, formatPrice } from '../../../shared/ui/formatNumber';
import { formatKst } from '../../../shared/ui/formatKst';
import { MESSAGES } from '../../../shared/ui/messages';
import type { ChipKey } from '../../connection/domain/pickBanner';
import { StatusChip } from '../../connection/ui/StatusChip';

export interface ChartHeaderProps {
  readonly symbol: string;
  readonly isUnitSymbol: boolean;
  readonly price: number | null;
  readonly changePercent: number | null;
  readonly places: number;
  readonly lastUpdated: number | null;
  readonly chip: ChipKey;
}

export function ChartHeader(props: ChartHeaderProps) {
  const stamp = props.lastUpdated === null ? MESSAGES.noValue : formatKst(props.lastUpdated);
  return (
    <header className="chart-head">
      <div className="chart-head__row">
        <h1 className="chart-head__symbol">{props.symbol}</h1>
        <span className="tag">{MESSAGES.instrumentTag}</span>
        {props.isUnitSymbol ? <span className="tag">· {MESSAGES.unitNote}</span> : null}
        <StatusChip chip={props.chip} />
      </div>
      <div className="chart-head__price-row">
        <div className="chart-head__price num">{formatPrice(props.price, props.places)}</div>
        <div className={`chart-head__change num ${changeTone(props.changePercent)}`}>
          {formatChangePercent(props.changePercent)}
        </div>
        <div className="chart-head__stamp num">
          {MESSAGES.lastUpdated} {stamp}
        </div>
      </div>
    </header>
  );
}
