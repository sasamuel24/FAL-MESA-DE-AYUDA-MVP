/**
 * Custom React hooks for Café Quindío Enterprise
 */

import { useState, useEffect, useCallback } from 'react';

// Export hydration hook
export { useHydration } from './useHydration';

/**
 * Hook for API calls with loading, error, and data state
 */
export function useAPI<T>(endpoint: string, options?: RequestInit) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await window.fetch(`${process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'http://localhost:8001/api/v1'}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data || result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [endpoint, options]);

  return { data, loading, error, fetch };
}

/**
 * Hook for pagination
 */
export function usePagination(initialPage = 1, initialPerPage = 20) {
  const [page, setPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / perPage);

  const nextPage = useCallback(() => {
    setPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage(prev => Math.max(prev - 1, 1));
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.min(Math.max(newPage, 1), totalPages));
  }, [totalPages]);

  return {
    page,
    perPage,
    total,
    totalPages,
    setPage,
    setPerPage,
    setTotal,
    nextPage,
    prevPage,
    goToPage,
  };
}

/**
 * Hook for local storage
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      }
      return initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}

/**
 * Hook for debouncing values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
