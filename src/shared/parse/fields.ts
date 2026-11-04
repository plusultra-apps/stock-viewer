// 바이낸스 응답은 unknown 으로 들어온다. 필드를 안전하게 꺼내는 작은 함수들.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

// 바이낸스는 가격·거래량을 문자열로 준다. 숫자로 바꿀 수 없으면 null.
export function readNumber(value: unknown): number | null {
  const numeric = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof numeric === 'number' && Number.isFinite(numeric) ? numeric : null;
}
