// DEV Build Sandbox entry (buildlab.html). The storage guard must be the first import: see storageGuard.js.
import './storageGuard.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../hud.css';   // the game's own HUD / build-menu styles
import './items.js';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);
