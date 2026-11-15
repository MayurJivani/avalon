import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';
import { armSound } from './sound.ts';

armSound();
createRoot(document.getElementById('root')!).render(<App />);
