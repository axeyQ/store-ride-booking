// src/app/layout.js
import './globals.css'
import { BusinessErrorBoundary } from '@/components/BusinessErrorBoundary'
import { AuthProvider } from '@/contexts/AuthContext'
import DynamicTitle from '@/components/DynamicTitle'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import AuthGate from '@/components/AuthGate'

// Fallback only — DynamicTitle overwrites after settings load
export const metadata = {
  title: 'MR Travels',
  description: 'Bike and scooter rental management',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen font-sans">
        <BusinessErrorBoundary>
          <AuthProvider>
          <AuthGate>
            <DynamicTitle />
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </AuthGate>
          </AuthProvider>
        </BusinessErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}