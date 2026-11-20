import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@joshmarinacci/tooltheme/tooltheme.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
