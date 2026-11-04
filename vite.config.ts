import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 서버는 React 가 인라인 스크립트를 넣으므로 CSP 의 script-src 에 인라인 허용을 더한다.
// 배포(빌드) 결과물에는 적용하지 않는다 — index.html 의 CSP 가 그대로 간다.
const CSP_SCRIPT_SELF = "script-src 'self';";
const CSP_SCRIPT_DEV = "script-src 'self' 'unsafe-inline';";

function devCsp(): Plugin {
  return {
    name: 'dev-csp',
    apply: 'serve',
    transformIndexHtml: (html) => html.replace(CSP_SCRIPT_SELF, CSP_SCRIPT_DEV),
  };
}

export default defineConfig({
  plugins: [react(), devCsp()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: true,
  },
});
