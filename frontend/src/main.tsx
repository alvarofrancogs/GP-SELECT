import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter-tight';
import '@fontsource-variable/inter';
import { App } from './App';
import { LanguageProvider } from './i18n/LanguageProvider';
import './styles/tokens.css';
import './styles/global.css';
import './styles/scenes.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
