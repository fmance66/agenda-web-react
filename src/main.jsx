import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

// Estilos Mantine
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import './index.css';
import App from './App';
import { theme } from './theme';
import { queryClient } from './api/queries';
import { registrarServiceWorker } from './serviceWorker';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Notifications position="top-right" />
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>
);

registrarServiceWorker();
