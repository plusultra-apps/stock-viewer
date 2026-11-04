import { MESSAGES } from '../../../shared/ui/messages';
import type { ChipKey } from '../domain/pickBanner';

type ChipTone = 'ok' | 'warn' | 'err' | 'muted';

const CHIP_TONE: Readonly<Record<ChipKey, ChipTone>> = {
  live: 'ok',
  connecting: 'muted',
  reconnecting: 'warn',
  rateLimited: 'warn',
  offline: 'err',
  blocked: 'err',
  listFailed: 'err',
  halted: 'err',
  chartFailed: 'err',
};

export interface StatusChipProps {
  readonly chip: ChipKey;
}

// 칩은 색과 글자를 함께 쓴다.
export function StatusChip({ chip }: StatusChipProps) {
  return (
    <span className={`chip c-${CHIP_TONE[chip]}`} role="status">
      {MESSAGES.chip[chip]}
    </span>
  );
}
