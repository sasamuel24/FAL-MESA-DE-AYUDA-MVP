import { useAuth } from "../lib/auth_context"

/**
 * Hook personalizado para determinar la ruta del dashboard según el área del usuario
 */
export const useDashboardRoute = () => {
  const { user } = useAuth()

  const getDashboardRoute = () => {
    // Áreas que tienen acceso al CQ Performance Dashboard
    const areasGerenciales = ['Jefe de Zona', 'Gerente de Tiendas', 'Mercadeo']
    
    // Si el usuario tiene un área gerencial, va al CQ Performance Dashboard
    if (user?.area && areasGerenciales.includes(user.area)) {
      return '/dashboard-tickets'
    }
    
    // Si el usuario es admin y del área TIC, va al Dashboard TIC
    if (user?.rol === 'admin' && user?.area?.toLowerCase() === 'tic') {
      return '/dashboard-tic'
    }
    
    // Para todos los demás usuarios admin, va al dashboard de mantenimiento
    if (user?.rol === 'admin') {
      return '/dashboard'
    }

    // Para técnicos, va a su panel de técnico
    if (user?.rol === 'tecnico') {
      return '/tecnico'
    }

    // Por defecto, dashboard de mantenimiento
    return '/dashboard'
  }

  return {
    dashboardRoute: getDashboardRoute(),
    user
  }
}
