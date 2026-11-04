// 연결 상태. 화면은 state 로 칩과 알림을 고른다 (docs/02-design.md 3장).
export type ConnectionStatus =
  | { readonly state: 'connecting' }
  | { readonly state: 'live' }
  | { readonly state: 'reconnecting'; readonly attempt: number }
  | { readonly state: 'offline' };
