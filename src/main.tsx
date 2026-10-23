import "./styles/tokens.css";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// Depois do App, para os ajustes de celular valerem sobre o CSS dos componentes.
import "./styles/responsive.css";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
