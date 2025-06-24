'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useCallback } from 'react';

export const useApiRequest = () => {
  const { apiCall } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  return { request, loading, error, setError };
};