import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyTextSize, getTextSize } from './lib/textSize.js'

// Apply the saved text size before the first paint, so the page doesn't jump.
applyTextSize(getTextSize())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
