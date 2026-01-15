"use client"

import { useAuth } from '../lib/auth_context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'tecnico';
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  redirectTo = '/' 
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Solo redirigir si NO está cargando y definitivamente no está autenticado
    if (!isLoading) {
      // Si no hay user pero hay datos en localStorage, dar tiempo para que se cargue
      if (!user && typeof window !== 'undefined') {
        const hasStoredAuth = localStorage.getItem('access_token') && localStorage.getItem('user');
        if (hasStoredAuth) {
          return; // No redirigir aún, esperar a que se cargue
        }
      }

      if (!isAuthenticated) {
        // No autenticado, redirigir al login
        router.push(redirectTo);
        return;
      }

      if (requiredRole && user?.rol !== requiredRole) {
        // No tiene el rol requerido, redirigir según el rol
        if (user?.rol === 'tecnico') {
          router.push('/tecnico');
        } else if (user?.rol === 'admin') {
          router.push('/dashboard');
        } else {
          router.push('/');
        }
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, requiredRole, redirectTo, router]);

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00B0B2] mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado o no tiene el rol correcto, mostrar loading en lugar de null
  // (la redirección se maneja en useEffect)
  if (!isAuthenticated || (requiredRole && user?.rol !== requiredRole && user?.rol !== 'admin')) {
    // Verificar si hay datos en localStorage para evitar pantalla en blanco después del login
    if (typeof window !== 'undefined') {
      const hasStoredAuth = localStorage.getItem('access_token') && localStorage.getItem('user');
      if (hasStoredAuth) {
        // Mostrar loading mientras se procesa la autenticación
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00B0B2] mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando...</p>
            </div>
          </div>
        );
      }
    }
    return null;
  }

  // Usuario autenticado y con permisos correctos
  return <>{children}</>;
};
