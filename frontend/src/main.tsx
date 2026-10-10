import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import '@fontsource-variable/archivo/wdth.css';
import { App } from './App';
import './styles/tokens.css';
import './styles/global.css';
import './styles/scenes.css';

// A data router (instead of <BrowserRouter>) so the admin editor can block navigation with unsaved changes.
const router = createBrowserRouter([{ path: '*', element: <App /> }]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
