'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: '🏠', desc: 'Dashboard' },
  { href: '/booking', label: 'New Booking', icon: '➕', desc: 'Start a rental' },
  { href: '/custom-booking', label: 'Custom Booking', icon: '📦', desc: 'Flat packages' },
  { href: '/active-bookings', label: 'Active Rentals', icon: '🔴', desc: 'Live fleet' },
  { href: '/admin/reservations', label: 'Reservations', icon: '📅', desc: 'Same-day holds' },
  { href: '/vehicles', label: 'Vehicles', icon: '🛵', desc: 'Fleet status' },
  { href: '/admin/bookings', label: 'All Bookings', icon: '📋', desc: 'Reports' },
  { href: '/customers', label: 'Customers', icon: '👥', desc: 'Database' },
  { href: '/settings', label: 'Settings', icon: '⚙️', desc: 'Config' },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);

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

  const drawer =
    open && mounted
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            <div
              className="fixed inset-y-0 right-0 z-[110] flex w-full max-w-[20rem] flex-col bg-gradient-to-b from-gray-900 via-gray-950 to-black border-l border-cyan-500/20 shadow-[0_0_40px_rgba(6,182,212,0.15)]"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              {/* Top brand strip */}
              <div className="relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/30 via-blue-600/20 to-transparent" />
                <div className="relative flex items-center justify-between px-4 py-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                      <span className="text-white font-bold">MR</span>
                    </div>
                    <div>
                      <div className="text-white font-semibold leading-tight">MR Travels</div>
                      <div className="text-cyan-300/80 text-xs">Quick navigation</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition"
                    aria-label="Close menu"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto overscroll-contain p-3">
                <ul className="space-y-1.5">
                  {NAV_ITEMS.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={`group flex items-center gap-3 px-3 py-3 rounded-2xl min-h-[52px] transition-all ${
                            active
                              ? 'bg-gradient-to-r from-cyan-600/40 to-blue-600/30 text-white border border-cyan-400/40 shadow-md shadow-cyan-900/40'
                              : 'text-gray-200 border border-transparent hover:bg-white/5 hover:border-white/10'
                          }`}
                        >
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg shrink-0 ${
                              active
                                ? 'bg-cyan-500/30'
                                : 'bg-gray-800 group-hover:bg-gray-700'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-medium truncate">{item.label}</span>
                            <span className={`block text-xs truncate ${active ? 'text-cyan-100/80' : 'text-gray-500'}`}>
                              {item.desc}
                            </span>
                          </span>
                          {active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="shrink-0 p-4 border-t border-white/10">
                <div className="rounded-xl bg-gradient-to-r from-cyan-900/40 to-blue-900/30 border border-cyan-500/20 px-3 py-2.5 text-center">
                  <div className="text-xs text-gray-400">MR Travels</div>
                  <div className="text-sm text-cyan-200 font-medium">Bike & Scooter Rentals</div>
                </div>
              </div>
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
        className="md:hidden relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/30 text-white shadow-md shadow-cyan-900/20 hover:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
        aria-label="Open menu"
      >
        <span className="absolute inset-0 rounded-xl bg-cyan-400/5" />
        <svg className="w-6 h-6 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {drawer}
    </>
  );
}