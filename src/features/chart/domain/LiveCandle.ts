import type { Candle } from './Candle';
import type { Interval } from './Interval';

// 실시간 메시지 하나: 어느 종목·간격의 봉인지, 그 봉이 닫혔는지 (닫히지 않았으면 진행 중 봉).
export interface LiveCandle {
  readonly symbol: string;
  readonly interval: Interval;
  readonly candle: Candle;
  readonly closed: boolean;
}
