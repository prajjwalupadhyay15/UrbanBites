import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#FFFCF5',
              color: '#2A0800',
              border: '1.5px solid #EADDCD',
              borderRadius: '1rem',
              fontWeight: 700,
              fontSize: '14px',
              padding: '12px 18px',
              boxShadow: '0 8px 32px rgba(120,1,22,0.08)',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#FFFCF5' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#FFFCF5' },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
