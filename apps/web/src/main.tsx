import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import './index.css';
import App from './App';
import { loadFonts } from './fonts';
import { createWebPlatform } from './platform';
import { routes } from './routes';

void loadFonts();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

// Module level: the provider reads the platform once, and the router lives as long as the page.
const platform = createWebPlatform();
const router = createBrowserRouter(routes);

createRoot(rootElement).render(
  <StrictMode>
    <App platform={platform} router={router} />
  </StrictMode>,
);
