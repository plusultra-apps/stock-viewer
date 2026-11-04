// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import type { Banner } from '../domain/pickBanner';
import { StatusBanner } from './StatusBanner';

function renderBanner(banner: Banner | null, handlers = { onReconnect: vi.fn(), onRetryList: vi.fn() }) {
  render(<StatusBanner banner={banner} lastUpdated={null} {...handlers} />);
  return handlers;
}

describe('연결 알림 줄', () => {
  it('차단이면 451 문구가 보이고 자동으로 다시 시도하지 않는다 (AC9)', () => {
    renderBanner({ kind: 'blocked' });
    expect(screen.getByRole('status').textContent).toContain('451');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('요청 제한은 헤더로 읽은 대기 시간이 있을 때만 남은 초를 보인다 (AC21)', () => {
    renderBanner({ kind: 'rateLimited', waitMs: 45_000 });
    expect(screen.getByRole('status').textContent).toContain('남은 대기 약 45초');
  });

  it('끊김이면 다시 연결 버튼이 있고 누르면 다시 연결한다', () => {
    const handlers = renderBanner({ kind: 'offline' });
    fireEvent.click(screen.getByRole('button', { name: '다시 연결' }));
    expect(handlers.onReconnect).toHaveBeenCalledTimes(1);
  });

  it('목록 실패면 다시 시도 버튼이 있고 누르면 목록을 다시 받는다', () => {
    const handlers = renderBanner({ kind: 'listFailed' });
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(handlers.onRetryList).toHaveBeenCalledTimes(1);
  });
});
