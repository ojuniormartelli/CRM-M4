
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

console.log("Index.tsx starting...");

// Monitoramento de erros globais para evitar tela branca silenciosa
window.onerror = (message, source, lineno, colno, error) => {
  console.error("ERRO GLOBAL CAPTURADO:", message, error);
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = `
      <div style="height: 100vh; display: flex; align-items: center; justify-center: center; font-family: sans-serif; padding: 20px; background: #fff1f2;">
        <div style="max-width: 500px; text-align: center;">
          <h1 style="color: #be123c;">Oops! Ocorreu um erro de carregamento</h1>
          <p style="color: #4b5563;">O aplicativo não pôde ser iniciado. Isso geralmente ocorre devido a variáveis de ambiente ausentes ou erro de script.</p>
          <div style="background: #1f2937; color: #6ee7b7; padding: 15px; border-radius: 8px; text-align: left; font-family: monospace; font-size: 12px; margin: 20px 0;">
            ${message}
          </div>
          <button onclick="window.location.reload()" style="background: #2563eb; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Tentar Novamente</button>
        </div>
      </div>
    `;
  }
};

import AppProviders from './providers/AppProviders';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>
);
