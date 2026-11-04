import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createBinanceServices } from './services';

const container = document.getElementById('root');
if (!container) {
  throw new Error('index.html 에 #root 가 없다');
}

createRoot(container).render(
  <StrictMode>
    <App services={createBinanceServices()} />
  </StrictMode>,
);
