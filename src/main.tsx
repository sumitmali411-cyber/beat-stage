import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center p-8"><div className="max-w-md"><h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1><p className="text-slate-400">An unexpected error occurred. Please refresh the page.</p></div></div>}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
