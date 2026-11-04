import { pricePlaces } from './pricePlaces';

describe('가격 표시 자릿수', () => {
  it('가격 단위 0.00001 이면 소수 5자리다', () => {
    expect(pricePlaces('0.00001')).toBe(5);
  });

  it('가격 단위 0.10 이면 소수 1자리다 (뒤의 0 은 세지 않는다)', () => {
    expect(pricePlaces('0.10')).toBe(1);
  });

  it('가격 단위가 정수면 소수 0자리다', () => {
    expect(pricePlaces('1')).toBe(0);
    expect(pricePlaces('100')).toBe(0);
  });
});
