// Origin 헤더를 허용 목록과 대조한다.
// 'none': Origin 이 없는 요청(서버끼리·curl 등), 'allowed': 허용된 출처, 'rejected': 그 밖
export function originVerdict(origin, allowedOrigins) {
  if (origin === undefined || origin === '') {
    return 'none';
  }
  return allowedOrigins.includes(origin) ? 'allowed' : 'rejected';
}

export function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}
