import { useState, useEffect } from 'react';

/**
 * Hook para manejar la hidratación del lado del cliente
 * Evita errores de mismatch entre servidor y cliente
 */
export function useHydration() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
