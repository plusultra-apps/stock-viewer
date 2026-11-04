import type { Dispatch, SetStateAction } from 'react';

// 상태 한 덩어리에서 바뀌는 조각만 덮어쓴다. 목록·차트 화면의 콜백이 같은 모양으로 쓴다.
export function patchWith<S>(setState: Dispatch<SetStateAction<S>>) {
  return (change: (previous: S) => Partial<S>): void =>
    setState((previous) => ({ ...previous, ...change(previous) }));
}
