import type { Candle } from './Candle';
import { CANDLE_CAP } from './chartSettings';

// 시작 시각 오름차순, 중복 없음. 상한을 넘으면 오래된 것부터 버린다.
// 바꿀 때마다 새 목록을 돌려준다 (이전 값을 들고 있는 쪽이 잘못 보지 않게).
export class CandleSeries {
  private readonly candles: readonly Candle[];

  private constructor(candles: readonly Candle[]) {
    this.candles = candles;
  }

  static empty(): CandleSeries {
    return new CandleSeries([]);
  }

  // 처음 받은 봉들. 같은 시작 시각이 여러 번 오면 뒤의 것이 이긴다.
  static fromCandles(input: readonly Candle[]): CandleSeries {
    const byTime = new Map<number, Candle>();
    for (const candle of input) {
      byTime.set(candle.openTime, candle);
    }
    const sorted = [...byTime.values()].sort((a, b) => a.openTime - b.openTime);
    return new CandleSeries(capped(sorted));
  }

  all(): readonly Candle[] {
    return this.candles;
  }

  last(): Candle | undefined {
    return this.candles.at(-1);
  }

  // 같은 시작 시각이면 교체, 더 늦으면 뒤에 붙이고, 더 이르면 무시한다 (AC4).
  upsert(candle: Candle): CandleSeries {
    const last = this.last();
    if (last === undefined || candle.openTime > last.openTime) {
      return new CandleSeries(capped([...this.candles, candle]));
    }
    if (candle.openTime === last.openTime) {
      return new CandleSeries([...this.candles.slice(0, -1), candle]);
    }
    return this;
  }

  merge(candles: readonly Candle[]): CandleSeries {
    return candles.reduce<CandleSeries>((series, candle) => series.upsert(candle), this);
  }
}

function capped(candles: readonly Candle[]): readonly Candle[] {
  return candles.slice(-CANDLE_CAP);
}
