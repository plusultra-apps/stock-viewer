import { acceptsLive } from './Selection';

describe('실시간 봉 반영 범위', () => {
  it('지금 고른 종목과 간격이 같은 봉만 반영한다', () => {
    const selected = { symbol: 'BTCUSDT', interval: '1m' } as const;
    expect(acceptsLive(selected, { symbol: 'BTCUSDT', interval: '1m' })).toBe(true);
  });

  it('다른 종목의 실시간 봉은 반영하지 않는다', () => {
    const selected = { symbol: 'BTCUSDT', interval: '1m' } as const;
    expect(acceptsLive(selected, { symbol: 'ETHUSDT', interval: '1m' })).toBe(false);
  });

  it('다른 간격의 실시간 봉은 반영하지 않는다', () => {
    const selected = { symbol: 'BTCUSDT', interval: '1m' } as const;
    expect(acceptsLive(selected, { symbol: 'BTCUSDT', interval: '5m' })).toBe(false);
  });
});
