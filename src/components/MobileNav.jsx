'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/booking', label: 'New Booking', icon: '➕' },
  { href: '/custom-booking', label: 'Custom Booking', icon: '📦' },
  { href: '/active-bookings', label: 'Active Rentals', icon: '🔴' },
  { href: '/admin/reservations', label: 'Reservations', icon: '📅' },
  { href: '/vehicles', label: 'Vehicles', icon: '🛵' },
  { href: '/admin/bookings', label: 'All Bookings', icon: '📋' },
  { href: '/customers', label: 'Customers', icon: '👥' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const drawer = open && mounted
    ? createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[100] bg-black/70"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel — full height, attached to viewport */}
          <div
            className="fixed inset-y-0 right-0 z-[110] flex w-full max-w-xs flex-col bg-gray-950 border-l border-gray-700 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">MR</span>
                </div>
                <span className="text-white font-semibold text-lg">Menu</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-gray-300 hover:bg-gray-800"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto overscroll-contain p-3">
              <ul className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium min-h-[48px] ${
                        isActive(item.href)
                          ? 'bg-cyan-600/25 text-cyan-200 border border-cyan-500/40'
                          : 'text-gray-100 hover:bg-gray-800'
                      }`}
                    >
                      <span className="text-xl w-8 text-center shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center w-11 h-11 rounded-lg bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {drawer}
    </>
  );
}