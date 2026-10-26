import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import '@fontsource-variable/archivo/wdth.css';
import { App } from './App';
import { preloadPublicPage } from './lib/publicPages';
import './styles/tokens.css';
import './styles/global.css';
import './styles/scenes.css';

// A data router (instead of <BrowserRouter>) so the admin editor can block navigation with unsaved changes.
const router = createBrowserRouter([{
  path: '*', element: <App />,
  // Wait for the destination's JS and CSS before committing navigation. The current page stays in place;
  // on a direct visit the hidden server content remains until the complete layout can mount.
  loader: async ({ request }) => { await preloadPublicPage(new URL(request.url).pathname); return null; },
  hydrateFallbackElement: null,
}]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
