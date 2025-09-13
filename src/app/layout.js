// src/app/layout.js
import './globals.css'
import { BusinessErrorBoundary } from '@/components/BusinessErrorBoundary'
import ServiceRegistry from '@/lib/serviceRegistry'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
export const metadata = {
  title: 'MR Travels - Bike Rental System',
  description: 'Digital bike and scooter rental management system with enhanced pricing engine',
}

// 🚀 NEW: Service initialization component
function ServiceInitializer({ children }) {
  // Services are auto-initialized when imported, but we can add explicit initialization here if needed
  return children;
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen font-sans">
        {/* 🚀 NEW: Top-level error boundary for entire app */}
        <BusinessErrorBoundary>
          <ServiceInitializer>
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </ServiceInitializer>
        </BusinessErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}