import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './components/App'
import { queryClient } from './services'
import './styles/global.css'

const root = document.getElementById('root')

if (!root) {
    throw new Error('Root element not found')
}

createRoot(root).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </StrictMode>
)
