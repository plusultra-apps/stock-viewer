const TRAILING_ZEROS = /0+$/;

// 가격 단위(tickSize) 에서 소수 자릿수를 구한다. "0.10" 은 1자리, "0.00001" 은 5자리.
export function pricePlaces(tickSize: string): number {
  const [, fraction = ''] = tickSize.split('.');
  return fraction.replace(TRAILING_ZEROS, '').length;
}
