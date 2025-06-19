'use client';
import { theme } from '@/lib/theme';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function ThemedLayout({ children, title, subtitle, showHeader = true }) {
  return (
    <div className={theme.backgrounds.primary}>
      {showHeader && (
        <header className={theme.layout.header}>
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Link href="/" className="flex items-center space-x-4">
                  <div className={`${theme.components.icon.small} ${theme.colors.primary.cyan.bg}`}>
                    <span className="text-white font-bold text-sm">MR</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">MR Travels</h1>
                    <p className="text-gray-400 text-sm">Rental Management System</p>
                  </div>
                </Link>
              </div>
              <Badge variant="outline" className={theme.colors.primary.cyan.badge}>
                Bike & Scooter Rentals
              </Badge>
            </div>
          </div>
        </header>
      )}
      
      <main className="min-h-screen">
        {(title || subtitle) && (
          <div className="text-center py-12">
            {title && <h2 className={theme.typography.hero}>{title}</h2>}
            {subtitle && <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}