import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'react-hot-toast'

import { AuthProvider } from '@contexts/AuthContext'
import { ThemeProvider } from '@contexts/ThemeContext'
import { NotificationProvider } from '@contexts/NotificationContext'
import { CartProvider } from '@contexts/CartContext'
import { BranchProvider } from '@contexts/BranchContext'

import { queryClient } from '@api/config/queryClient'
import { AppTheme } from './constants/theme'
import { AppRoutes } from '@routes/AppRoutes'
import { SiteDialogProvider } from '@components/common'

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <BranchProvider>
                <CartProvider>
                  <NotificationProvider>
                    <SiteDialogProvider>
                      <AppRoutes />
                      <Toaster
                        position="top-right"
                        toastOptions={{
                          duration: 4000,
                          style: {
                            background: AppTheme.colors.text,
                            color: AppTheme.colors.textInverse
                          }
                        }}
                      />
                    </SiteDialogProvider>
                  </NotificationProvider>
                </CartProvider>
              </BranchProvider>
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  )
}

export default App
