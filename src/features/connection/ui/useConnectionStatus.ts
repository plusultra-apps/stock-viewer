import { useMemo } from 'react';
import { type Banner, type BannerInput, type ChipKey, pickBanner, pickChip } from '../domain/pickBanner';

export interface ConnectionView {
  readonly banner: Banner | null;
  readonly chip: ChipKey;
}

// 목록·차트 상태를 합쳐 알림 줄과 칩을 한 번에 고른다.
export function useConnectionStatus(input: BannerInput, chartFailed: boolean): ConnectionView {
  return useMemo(() => ({ banner: pickBanner(input), chip: pickChip(input, chartFailed) }), [input, chartFailed]);
}
