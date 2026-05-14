import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AppRouter }    from './router/AppRouter'
import { queryClient }  from './lib/queryClient'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#111111',
            color:      '#ffffff',
            border:     '1px solid #222222',
            fontSize:   '14px',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#052e16' },
          },
          error: {
            iconTheme: { primary: '#e60000', secondary: '#3d0000' },
            style: {
              border: '1px solid #e60000',
            },
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
)
