// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import type { AppServices } from './services';
import { App } from './App';

// 목록이 오지 않는 가짜 공급자 (실제 네트워크를 쓰지 않는다)
function fakeServices(): AppServices {
  return {
    marketFeed: {
      loadMarkets: () => new Promise(() => undefined),
      refreshMarkets: () => new Promise(() => undefined),
      watchTickers: () => () => undefined,
    },
    candleFeed: {
      loadCandles: () => new Promise(() => undefined),
      watchCandles: () => () => undefined,
    },
  };
}

describe('화면에는 주문·로그인·키 입력이 없다', () => {
  it('주문 버튼이 없다', () => {
    render(<App services={fakeServices()} />);
    expect(screen.queryByRole('button', { name: /주문|매수|매도/ })).toBeNull();
  });

  it('로그인 버튼이 없다', () => {
    render(<App services={fakeServices()} />);
    expect(screen.queryByRole('button', { name: /로그인/ })).toBeNull();
  });

  it('비밀번호나 API 키를 넣는 칸이 없다', () => {
    const { container } = render(<App services={fakeServices()} />);
    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(screen.queryByLabelText(/API|키/i)).toBeNull();
  });

  it('종목 목록과 차트 두 영역이 있다', () => {
    render(<App services={fakeServices()} />);
    expect(screen.getByRole('region', { name: '종목 목록' })).toBeTruthy();
    expect(screen.getByRole('region', { name: '차트' })).toBeTruthy();
  });
});
