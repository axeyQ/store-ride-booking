'use client'
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const BookingClientPage = dynamic(() => import('@/components/BookingClient'), { ssr: false });

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="text-white p-8 text-center">Loading booking page...</div>}>
      <BookingClientPage />
    </Suspense>
  );
}
