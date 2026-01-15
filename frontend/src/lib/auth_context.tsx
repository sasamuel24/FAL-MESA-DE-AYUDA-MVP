"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Configuración de FastAPI únicamente
const FASTAPI_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'http://127.0.0.1:8001/api/v1',
  loginEndpoint: '/auth/login',
  logoutEndpoint: '/auth/logout',
  meEndpoint: '/auth/me',
  tokenField: 'access_token',
  errorField: 'detail'
};

// Tipos para el contexto de autenticación
export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'tecnico';
  area?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Proveedor del contexto
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Verificar sesión activa - SOLO FASTAPI
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = localStorage.getItem('access_token') || localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          // CARGAR DATOS INMEDIATAMENTE DESDE LOCALSTORAGE
          console.log('⚡ Cargando autenticación desde localStorage...');
          const fallbackUser = JSON.parse(storedUser);
          setUser(fallbackUser);
          setToken(storedToken);
          console.log('✅ Autenticación cargada desde localStorage para:', fallbackUser.nombre);

          // LUEGO verificar con FastAPI en segundo plano (no bloquear UI)
          console.log('🔍 Verificando token con FastAPI en segundo plano...');
          
          try {
            const response = await fetch(`${FASTAPI_CONFIG.baseUrl}${FASTAPI_CONFIG.meEndpoint}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${storedToken}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();
              setUser(data.user || data); // Actualizar con datos frescos del servidor
              console.log('✅ Token válido con FastAPI - datos actualizados');
            } else {
              // Token inválido, limpiar datos
              console.log('❌ Token inválido, limpiando sesión');
              localStorage.removeItem('token');
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user');
              setUser(null);
              setToken(null);
            }
          } catch (error) {
            console.log('⚠️ FastAPI no disponible para verificación, manteniendo datos del localStorage');
          }
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Función de login - SOLO FASTAPI
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setUser(null);
    setToken(null);
    
    try {
      console.log('� Iniciando sesión con FastAPI...');
      
      const response = await fetch(`${FASTAPI_CONFIG.baseUrl}${FASTAPI_CONFIG.loginEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data[FASTAPI_CONFIG.errorField] || 'Error al iniciar sesión';
        throw new Error(errorMessage);
      }

      // Guardar datos del login exitoso
      const accessToken = data[FASTAPI_CONFIG.tokenField];
      const userData = data.user || data;
      
      setUser(userData);
      setToken(accessToken);
      
      // Guardar en localStorage
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // FastAPI también tiene refresh token
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }

      console.log('✅ Login exitoso con FastAPI');

    } catch (error) {
      // Resetear estado en caso de error
      setUser(null);
      setToken(null);
      setIsLoading(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Función de logout - SOLO FASTAPI
  const logout = async () => {
    try {
      const storedToken = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      if (storedToken) {
        // Intentar logout en el servidor FastAPI
        await fetch(`${FASTAPI_CONFIG.baseUrl}${FASTAPI_CONFIG.logoutEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${storedToken}`
          }
        });
      }
    } catch (error) {
      console.warn('Error en logout del servidor:', error);
    } finally {
      // Limpiar estado y localStorage siempre
      setUser(null);
      setToken(null);
      setIsLoading(false); // Importante: resetear loading state
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType'); // Limpiar también userType
      
      // Forzar recarga completa de la página para evitar problemas de estado
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
