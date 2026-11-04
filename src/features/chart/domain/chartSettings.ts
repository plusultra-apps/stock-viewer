// 차트 설정. 시험에서 줄일 수 있게 한곳에 모았다 (코딩 원칙 4절).

// 처음 열 때와 빠진 봉을 다시 받을 때 받는 봉 수 (AC1: 최근 500개)
export const INITIAL_CANDLE_COUNT = 500;

// 한 번에 받을 수 있는 봉 수 (바이낸스 문서 기준으로 알려진 값, 미확인: 03-tech-design 4-8)
export const KLINES_MAX_LIMIT = 1500;

// 화면에 들고 있는 봉 상한 (AC11: 1시간 이상 켜 둬도 메모리가 일정)
export const CANDLE_CAP = 2000;

// 가격 단위를 아직 못 읽었을 때 쓰는 표시 자릿수 (보통 종목은 2자리)
export const DEFAULT_PRICE_PLACES = 2;
