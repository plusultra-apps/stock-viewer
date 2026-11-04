// 목록 시세 반영 주기. 가격이 매번 바뀌어도 화면은 이 주기로 한 번만 다시 그린다 (03 성능 절).
export const TICKER_FLUSH_MS = 1_000;

// 거래 종료를 알아채는 주기. 목록 연결과 별개로 exchangeInfo 를 다시 받는다 (AC18: 10초 안).
export const MARKET_REFRESH_MS = 10_000;
