import { useEffect, useRef } from 'react';
import type { Candle } from '../domain/Candle';
import { type CandleChartHandle, createCandleChart } from './chartHandle';
import type { ChartSnapshot } from './useCandles';

export interface CandleChartProps {
  readonly snapshot: ChartSnapshot;
  readonly latest: Candle | null;
  readonly pricePlaces: number;
  readonly onHover: (candle: Candle | null) => void;
}

// 전체 다시 그리기는 snapshot 이 바뀔 때만, 봉 하나 갱신은 latest 가 바뀔 때만 한다 (03-tech-design 6절).
// 자릿수가 바뀌면 부모가 key 를 바꿔 새로 만든다.
export function CandleChart({ snapshot, latest, pricePlaces, onHover }: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<CandleChartHandle | null>(null);
  const hoverRef = useRef(onHover);
  useEffect(() => {
    hoverRef.current = onHover;
  });
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return undefined;
    }
    const handle = createCandleChart(container, {
      pricePlaces,
      onHover: (candle) => hoverRef.current(candle),
    });
    handleRef.current = handle;
    return () => {
      handle.dispose();
      handleRef.current = null;
    };
  }, [pricePlaces]);
  useEffect(() => {
    handleRef.current?.setCandles(snapshot.candles);
  }, [snapshot]);
  useEffect(() => {
    if (latest !== null) {
      handleRef.current?.updateCandle(latest);
    }
  }, [latest]);
  return <div ref={containerRef} className="candle-chart" />;
}
