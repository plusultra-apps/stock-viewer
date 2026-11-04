import type { MarketEntry } from './MarketList';

// 기호에 검색어가 포함되면 일치 (대소문자 무관). 검색어가 비었으면 전체 목록 (PR/FAQ 열린 질문 3).
export function searchMarkets(entries: readonly MarketEntry[], query: string): MarketEntry[] {
  const needle = query.trim().toUpperCase();
  if (needle === '') {
    return [...entries];
  }
  return entries.filter((entry) => entry.market.symbol.includes(needle));
}
