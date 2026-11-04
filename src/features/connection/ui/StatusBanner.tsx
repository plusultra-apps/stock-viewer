import { formatKst } from '../../../shared/ui/formatKst';
import { MESSAGES } from '../../../shared/ui/messages';
import type { Banner } from '../domain/pickBanner';

const MS_PER_SECOND = 1000;

export interface StatusBannerProps {
  readonly banner: Banner | null;
  readonly lastUpdated: number | null;
  readonly onReconnect: () => void;
  readonly onRetryList: () => void;
}

// 화면 위쪽 알림 줄. 글자로 알리고, 색은 보조로만 쓴다 (02-design 5절).
export function StatusBanner({ banner, lastUpdated, onReconnect, onRetryList }: StatusBannerProps) {
  if (banner === null) {
    return null;
  }
  const tone = banner.kind === 'rateLimited' || banner.kind === 'reconnecting' ? 'b-warn' : 'b-err';
  return (
    <div className={`banner ${tone}`} role="status">
      <span>{bannerText(banner, lastUpdated)}</span>
      {banner.kind === 'offline' ? <ActionButton label={MESSAGES.reconnect} onClick={onReconnect} /> : null}
      {banner.kind === 'listFailed' ? <ActionButton label={MESSAGES.retry} onClick={onRetryList} /> : null}
    </div>
  );
}

function ActionButton({ label, onClick }: { readonly label: string; readonly onClick: () => void }) {
  return (
    <button type="button" className="btn" onClick={onClick}>
      {label}
    </button>
  );
}

function bannerText(banner: Banner, lastUpdated: number | null): string {
  const lastValue = MESSAGES.banner.lastValueAt(lastUpdated === null ? MESSAGES.noValue : formatKst(lastUpdated));
  switch (banner.kind) {
    case 'blocked':
      return MESSAGES.banner.blocked;
    case 'rateLimited':
      return rateLimitedText(banner.waitMs);
    case 'offline':
      return `${MESSAGES.banner.offline} ${lastValue}`;
    case 'reconnecting':
      return `${MESSAGES.banner.reconnecting(banner.attempt)} ${lastValue}`;
    case 'listFailed':
      return MESSAGES.banner.listFailed;
    case 'halted':
      return MESSAGES.banner.halted;
  }
}

// 대기 시간을 헤더로 읽었을 때만 남은 초를 붙인다 (AC21)
function rateLimitedText(waitMs: number | null): string {
  const base = MESSAGES.banner.rateLimited;
  return waitMs === null ? base : `${base} ${MESSAGES.banner.rateLimitedWait(Math.ceil(waitMs / MS_PER_SECOND))}`;
}
