// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MarketList } from '../domain/MarketList';
import { MarketPanel, type MarketPanelProps } from './MarketPanel';

const list = MarketList.fromSnapshot(
  [
    { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', tickSize: '0.10' },
    { symbol: '1000PEPEUSDT', baseAsset: '1000PEPE', quoteAsset: 'USDT', tickSize: '0.00001' },
  ],
  [{ symbol: 'BTCUSDT', lastPrice: 93412.5, changePercent: 0.44, quoteVolume: 18400000000 }],
);

function props(overrides: Partial<MarketPanelProps> = {}): MarketPanelProps {
  return {
    status: 'ready',
    rows: list.rows(),
    totalCount: list.rows().length,
    query: '',
    selectedSymbol: 'BTCUSDT',
    onQueryChange: () => undefined,
    onSelect: () => undefined,
    onRetry: () => undefined,
    ...overrides,
  };
}

describe('종목 목록 화면', () => {
  it('목록을 받는 중에는 불러오는 중이라고 보인다', () => {
    render(<MarketPanel {...props({ status: 'loading', rows: [], totalCount: 0 })} />);
    expect(screen.getByText('종목 목록을 불러오는 중…')).toBeTruthy();
  });

  it('종목을 누르면 그 기호를 고른다', () => {
    const onSelect = vi.fn<(symbol: string) => void>();
    render(<MarketPanel {...props({ onSelect })} />);
    fireEvent.click(screen.getByRole('button', { name: /1000PEPEUSDT/ }));
    expect(onSelect).toHaveBeenCalledWith('1000PEPEUSDT');
  });

  it('검색창에 입력하면 검색어를 알려 준다', () => {
    const onQueryChange = vi.fn<(query: string) => void>();
    render(<MarketPanel {...props({ onQueryChange })} />);
    fireEvent.change(screen.getByLabelText('종목 기호 또는 이름 일부 검색'), { target: { value: 'pepe' } });
    expect(onQueryChange).toHaveBeenCalledWith('pepe');
  });

  it('일치하는 종목이 없으면 검색 결과 없음이 보인다', () => {
    render(<MarketPanel {...props({ query: 'zzzz', rows: [] })} />);
    expect(screen.getByText('검색 결과 없음')).toBeTruthy();
  });

  it('1000배 단위 종목에는 안내가 붙는다', () => {
    render(<MarketPanel {...props()} />);
    expect(screen.getByText(/1000배 단위 종목/)).toBeTruthy();
  });

  it('목록을 못 받으면 다시 시도 버튼이 보이고 누르면 다시 받는다', () => {
    const onRetry = vi.fn<() => void>();
    render(<MarketPanel {...props({ status: 'failed', rows: [], totalCount: 0, onRetry })} />);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
