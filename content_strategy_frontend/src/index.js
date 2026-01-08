import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './i18n/i18n';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
