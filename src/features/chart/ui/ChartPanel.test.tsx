// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import type { CandlesView } from './useCandles';
import { ChartPanel, type ChartPanelProps } from './ChartPanel';
import type { Interval } from '../domain/Interval';

// 차트 라이브러리는 canvas 가 필요해서 시험에서는 가짜 핸들로 바꾼다.
vi.mock('./chartHandle', () => ({
  createCandleChart: () => ({ setCandles: () => undefined, updateCandle: () => undefined, dispose: () => undefined }),
}));

function chartView(overrides: Partial<CandlesView> = {}): CandlesView {
  return {
    status: 'ready',
    snapshot: { candles: [], version: 1 },
    latest: null,
    failure: null,
    connection: { state: 'live' },
    lastUpdated: null,
    retry: () => undefined,
    ...overrides,
  };
}

function props(overrides: Partial<ChartPanelProps> = {}): ChartPanelProps {
  return {
    symbol: 'BTCUSDT',
    interval: '1m',
    entry: undefined,
    chart: chartView(),
    lastUpdated: null,
    chip: 'live',
    onIntervalChange: () => undefined,
    ...overrides,
  };
}

describe('차트 화면 상태', () => {
  it('봉을 불러오는 중이면 로딩 문구가 보인다', () => {
    render(<ChartPanel {...props({ chart: chartView({ status: 'loading' }) })} />);
    expect(screen.getByText('봉을 불러오는 중…')).toBeTruthy();
  });

  it('봉을 못 받으면 문구와 다시 시도 버튼이 보이고, 누르면 다시 받는다', () => {
    const retry = vi.fn<() => void>();
    render(<ChartPanel {...props({ chart: chartView({ status: 'failed', retry }) })} />);
    expect(screen.getByText('이 종목의 봉을 불러오지 못했습니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('차트 화면에는 TradingView 표기가 있다 (라이선스)', () => {
    render(<ChartPanel {...props()} />);
    expect(screen.getByText(/TradingView Lightweight Charts/)).toBeTruthy();
  });

  it('간격 버튼을 누르면 그 간격을 알린다', () => {
    const onIntervalChange = vi.fn<(interval: Interval) => void>();
    render(<ChartPanel {...props({ onIntervalChange })} />);
    fireEvent.click(screen.getByRole('button', { name: '1시간' }));
    expect(onIntervalChange).toHaveBeenCalledWith('1h');
  });
});
