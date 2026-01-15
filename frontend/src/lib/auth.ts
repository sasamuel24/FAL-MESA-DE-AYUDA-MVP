/**
 * Servicio de Autenticación para FastAPI
 * Conecta el frontend Next.js con el backend FastAPI
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://127.0.0.1:8001/api/v1/auth';

// Tipos TypeScript
export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserInfo {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  area?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserInfo;
}

export interface AuthError {
  detail: string;
}

/**
 * Clase para manejar la autenticación con FastAPI
 */
export class AuthService {
  
  /**
   * Realizar login
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error: AuthError = await response.json();
      throw new Error(error.detail || 'Error de autenticación');
    }

    const data: LoginResponse = await response.json();
    
    // Guardar tokens en localStorage
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  }

  /**
   * Obtener información del usuario actual
   */
  static async getCurrentUser(): Promise<UserInfo> {
    const token = this.getAccessToken();
    
    if (!token) {
      throw new Error('No hay token de acceso');
    }

    const response = await fetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expirado, intentar refresh
        await this.refreshToken();
        return this.getCurrentUser(); // Reintentar
      }
      throw new Error('Error obteniendo información del usuario');
    }

    const data = await response.json();
    return data.user;
  }

  /**
   * Renovar token de acceso
   */
  static async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No hay refresh token');
    }

    const response = await fetch(`${API_BASE_URL}/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Refresh token inválido, logout
      this.logout();
      throw new Error('Sesión expirada, por favor inicia sesión nuevamente');
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    
    return data.access_token;
  }

  /**
   * Cerrar sesión
   */
  static async logout(): Promise<void> {
    const token = this.getAccessToken();
    
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        // Ignorar errores de logout del servidor
        console.warn('Error en logout del servidor:', error);
      }
    }

    // Limpiar localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  /**
   * Verificar si el usuario está autenticado
   */
  static isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const user = this.getStoredUser();
    return !!(token && user);
  }

  /**
   * Obtener token de acceso
   */
  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  /**
   * Obtener refresh token
   */
  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  /**
   * Obtener usuario almacenado
   */
  static getStoredUser(): UserInfo | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Hacer petición autenticada a la API
   */
  static async authenticatedFetch(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const token = this.getAccessToken();
    
    if (!token) {
      throw new Error('No hay token de acceso');
    }

    const authOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    };

    let response = await fetch(url, authOptions);
    
    // Si el token expiró, intentar refresh
    if (response.status === 401) {
      try {
        await this.refreshToken();
        // Reintentar con nuevo token
        authOptions.headers = {
          ...authOptions.headers,
          'Authorization': `Bearer ${this.getAccessToken()}`,
        };
        response = await fetch(url, authOptions);
      } catch (error) {
        this.logout();
        throw new Error('Sesión expirada');
      }
    }

    return response;
  }
}

// Hook personalizado para React (opcional)
export function useAuth() {
  return {
    login: AuthService.login,
    logout: AuthService.logout,
    getCurrentUser: AuthService.getCurrentUser,
    isAuthenticated: AuthService.isAuthenticated,
    getUser: AuthService.getStoredUser,
    authenticatedFetch: AuthService.authenticatedFetch,
  };
}
