// 1000PEPEUSDT 처럼 가격을 1000개 단위로 묶은 종목. 기호 규칙으로만 알 수 있다 (바이낸스 단위 필드 미확인).
const MIN_ZEROS = 3;
const UNIT_PREFIX = new RegExp(`^1(0{${MIN_ZEROS},})(?=[A-Z])`);

export function unitMultiplier(symbol: string): number | null {
  const match = UNIT_PREFIX.exec(symbol);
  if (match === null) {
    return null;
  }
  return Number(`1${match[1]}`);
}
