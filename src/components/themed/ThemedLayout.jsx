'use client';
import { theme } from '@/lib/theme';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import MobileNav from '@/components/MobileNav';

export function ThemedLayout({ children, title, subtitle, showHeader = true }) {
  return (
    <div className={theme.backgrounds.primary}>
      {showHeader && (
        <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-black/70 backdrop-blur-xl shadow-lg shadow-black/40">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-3.5">
            <div className="flex items-center justify-between gap-2">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0 group">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-xl bg-cyan-400/30 blur-md group-hover:bg-cyan-400/40 transition" />
                  <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                    <span className="text-white font-bold text-sm sm:text-lg">MR</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl font-bold text-white truncate tracking-tight">
                    MR Travels
                  </h1>
                  <p className="text-cyan-400/70 text-[10px] sm:text-xs hidden sm:block font-medium tracking-wide uppercase">
                    Rental Management
                  </p>
                </div>
              </Link>

              {/* Right side */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <Badge
                  variant="outline"
                  className="hidden sm:inline-flex border-cyan-500/40 text-cyan-300 bg-cyan-500/10"
                >
                  Bike & Scooter Rentals
                </Badge>
                <MobileNav />
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="min-h-screen">
        {(title || subtitle) && (
          <div className="text-center py-8 sm:py-12 px-4">
            {title && <h2 className={theme.typography.hero}>{title}</h2>}
            {subtitle && (
              <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-3 sm:mt-4`}>
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}