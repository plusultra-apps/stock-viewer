// 시간은 내부에서 UTC 밀리초로만 다룬다. 화면에 낼 때만 한국 시간으로 바꾼다 (AC5).
const KST_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatKst(epochMs: number): string {
  return `${KST_FORMAT.format(new Date(epochMs))} KST`;
}

const KST_CLOCK_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// 차트 시간 눈금용 짧은 표기 (시·분만)
export function formatKstClock(epochMs: number): string {
  return KST_CLOCK_FORMAT.format(new Date(epochMs));
}
