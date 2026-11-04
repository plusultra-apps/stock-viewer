// 차트 라이브러리는 CSS 변수를 읽지 못해서 색 값을 여기에 한 번 더 적는다. 값은 shared/ui/tokens.css 와 같다.
export const CHART_THEME = {
  up: '#0ecb81',
  down: '#f6465d',
  volumeUp: 'rgba(14, 203, 129, 0.5)',
  volumeDown: 'rgba(246, 70, 93, 0.5)',
  text: '#848e9c',
  grid: '#2b3139',
} as const;
