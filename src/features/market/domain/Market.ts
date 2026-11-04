// 종목 하나. 거래 중인 USDⓈ-M 무기한 선물만 Market 이 된다 (infrastructure 에서 거른다).
export interface Market {
  readonly symbol: string;
  readonly baseAsset: string;
  readonly quoteAsset: string;
  // 가격이 움직이는 최소 폭 (문자열 그대로). 표시 자릿수를 정한다.
  readonly tickSize: string;
}

const SYMBOL_PATTERN = /^[A-Z0-9]{2,30}$/;

export function isValidSymbol(value: string): boolean {
  return SYMBOL_PATTERN.test(value);
}
