// 연결 시간 설정. 시험에서 줄일 수 있게 한곳에 모았다 (코딩 원칙 4절).
export const BACKOFF_BASE_MS = 1_000;
export const BACKOFF_MAX_MS = 15_000;
export const OFFLINE_AFTER_ATTEMPTS = 6;

// 목록 연결은 4초 동안 메시지가 없으면 끊긴 것으로 본다 (T002 측정 전 기본값)
export const TICKER_SILENCE_MS = 4_000;
// 차트 연결은 한산한 종목도 있으니 길게 둔다
export const KLINE_SILENCE_MS = 60_000;
