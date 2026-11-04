// 봉 하나. 시작 시각(UTC ms)으로 식별한다. 가격·거래량은 숫자로 바뀐 유한값만 든다.
export interface Candle {
  readonly openTime: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}
