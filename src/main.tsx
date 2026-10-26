import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Expose the Vite runtime for unambiguous browser validation; never mix React and Redact in one tree.
document.documentElement.dataset.miseRuntime = import.meta.env.MODE === 'react' ? 'react' : 'redact';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);