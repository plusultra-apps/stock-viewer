import { isRecord, readString } from '../../../shared/parse/fields';
import { FeedError } from '../../connection/domain/FeedError';
import { PERPETUAL_CONTRACT, PRICE_FILTER, TRADING_STATUS } from '../../connection/infrastructure/binanceValues';
import { isValidSymbol, type Market } from '../domain/Market';

// 종목 하나를 읽은 결과. 조용히 뺄 것과 경고할 것을 나눈다.
type Outcome =
  | { readonly kind: 'market'; readonly market: Market }
  | { readonly kind: 'notTrading' }
  | { readonly kind: 'broken' };

interface RequiredFields {
  readonly symbol: string;
  readonly status: string;
  readonly contract: string;
  readonly baseAsset: string;
  readonly quoteAsset: string;
  readonly tickSize: string;
}

// 거래 중인 무기한 종목만 돌려준다. 모르는 상태 값은 거래 중이 아닌 것으로 본다.
export function parseExchangeInfo(input: unknown): Market[] {
  if (!isRecord(input) || !Array.isArray(input.symbols)) {
    throw new FeedError('badResponse', '종목 정보 응답 형식이 아니다');
  }
  const outcomes = input.symbols.map(toOutcome);
  const brokenCount = outcomes.filter((outcome) => outcome.kind === 'broken').length;
  if (brokenCount > 0) {
    console.warn(`필드가 빠진 종목 ${brokenCount}개를 건너뛰었다`);
  }
  return outcomes.flatMap((outcome) => (outcome.kind === 'market' ? [outcome.market] : []));
}

function toOutcome(raw: unknown): Outcome {
  if (!isRecord(raw)) {
    return { kind: 'broken' };
  }
  const fields = readRequiredFields(raw);
  return fields === null ? { kind: 'broken' } : outcomeOf(fields);
}

function outcomeOf(fields: RequiredFields): Outcome {
  if (fields.contract !== PERPETUAL_CONTRACT || fields.status !== TRADING_STATUS) {
    return { kind: 'notTrading' };
  }
  if (!isValidSymbol(fields.symbol)) {
    return { kind: 'broken' };
  }
  return { kind: 'market', market: marketOf(fields) };
}

function marketOf(fields: RequiredFields): Market {
  return {
    symbol: fields.symbol,
    baseAsset: fields.baseAsset,
    quoteAsset: fields.quoteAsset,
    tickSize: fields.tickSize,
  };
}

function readRequiredFields(raw: Record<string, unknown>): RequiredFields | null {
  const symbol = readString(raw.symbol);
  const status = readString(raw.status);
  const contract = readString(raw.contractType);
  const baseAsset = readString(raw.baseAsset);
  const quoteAsset = readString(raw.quoteAsset);
  const tickSize = readTickSize(raw.filters);
  if (symbol === null || status === null || contract === null) {
    return null;
  }
  if (baseAsset === null || quoteAsset === null || tickSize === null) {
    return null;
  }
  return { symbol, status, contract, baseAsset, quoteAsset, tickSize };
}

function readTickSize(filters: unknown): string | null {
  if (!Array.isArray(filters)) {
    return null;
  }
  const priceFilter: unknown = filters.find(isPriceFilter);
  return isRecord(priceFilter) ? readString(priceFilter.tickSize) : null;
}

function isPriceFilter(filter: unknown): boolean {
  return isRecord(filter) && filter.filterType === PRICE_FILTER;
}
