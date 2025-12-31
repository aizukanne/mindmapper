import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn('Missing VITE_CLERK_PUBLISHABLE_KEY - auth will be disabled');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {CLERK_PUBLISHABLE_KEY ? (
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
          <App />
        </ClerkProvider>
      ) : (
        <App />
      )}
    </BrowserRouter>
  </StrictMode>
);
