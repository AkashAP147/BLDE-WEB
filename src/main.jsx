import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Maintenance from './Maintenance.jsx'

// Set this to false when the database issue is resolved
const IS_UNDER_MAINTENANCE = false;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {IS_UNDER_MAINTENANCE ? <Maintenance /> : <App />}
  </StrictMode>,
)
