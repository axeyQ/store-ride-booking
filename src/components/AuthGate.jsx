'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/LoginPage';

// Routes that do not require login
const PUBLIC_PATHS = ['/']; // home shows its own login UI

export default function AuthGate({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/api'); // APIs handled separately

  useEffect(() => {
    if (loading || isPublic) return;
    if (!isAuthenticated) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, isPublic, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
          <span className="text-white text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  // Home handles login itself
  if (pathname === '/') {
    return children;
  }

  if (!isAuthenticated) {
    // Brief fallback while redirect runs
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <span className="text-white">Redirecting to login...</span>
      </div>
    );
  }

  return children;
}