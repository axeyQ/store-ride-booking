'use client';
import { useEffect } from 'react';

export default function DynamicTitle() {
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (!data.success || !data.settings) return;

        const s = data.settings;
        // Prefer branch name (IISER / SPA), then business name
        const branch = (s.branchName || '').trim();
        const business = (s.businessName || 'MR Travels').trim();
        const title = branch
        ? `${branch} · ${business}`
        : business;

        document.title = title;
      } catch (e) {
        console.error('DynamicTitle:', e);
      }
    };

    load();
  }, []);

  return null;
}