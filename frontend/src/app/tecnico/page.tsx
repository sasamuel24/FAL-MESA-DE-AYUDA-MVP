"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "../../lib/auth_context"
import { useRouter } from 'next/navigation'
import {
  User,
  Building2,
  Wrench,
  FileText,
  ClipboardList,
  Settings,
  LogOut,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

// Configuración de FastAPI únicamente
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'http://localhost:8001/api/v1';

// Interfaces para TypeScript
interface EstadisticasDashboard {
  pendientes: number;
  completadas: number;
}

interface ActividadReciente {
  folio: number;
  asunto: string;
  etapa: string;
  tiempo: string;
  fecha_actualizacion: string | null;
}

interface DashboardData {
  estadisticas: EstadisticasDashboard;
  actividad_reciente: ActividadReciente[];
  tecnico: {
    id: number;
    nombre: string;
    email: string;
    area: string;
  };
}

export default function TecnicoPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  // Estados para datos del dashboard
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del dashboard al montar el componente
  useEffect(() => {
    const cargarDashboardData = async () => {
      if (!user?.email) {
        console.log('⚠️ No hay email de usuario disponible');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log(`📊 Cargando datos del dashboard para: ${user.email}`);
        
        console.log('� Conectando con FastAPI...');
        const response = await fetch(`${FASTAPI_BASE_URL}/ots/dashboard/${user.email}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setDashboardData(result.data);
          console.log('✅ Datos del dashboard cargados desde FastAPI:', result.data);
        } else {
          throw new Error(result.error || 'Error al cargar datos del dashboard');
        }
        
      } catch (error) {
        console.error('❌ Error al cargar dashboard:', error);
        setError(error instanceof Error ? error.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    cargarDashboardData();
  }, [user?.email]);

  const handleLogout = () => {
    console.log("Cerrando sesión...")
    logout();
  }

  const handleNavigation = (href: string) => {
    router.push(href);
  }

  return (
    <ProtectedRoute requiredRole="tecnico">
      <div
        className="min-h-screen text-foreground"
        style={{
          backgroundImage: "url('/images/cq2.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "50% 70%",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="min-h-screen bg-black/5">
          {/* Header */}
          <header
            className="shadow-lg border-b"
            style={{ backgroundColor: "#00B0B2", borderColor: "#00B0B2" }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Logo */}
                <div className="flex items-center">
                  <img
                    src="/images/logo.png"
                    alt="Logo"
                    className="h-12 w-auto object-contain cursor-pointer"
                  />
                </div>

                {/* Navigation */}
                <nav className="hidden md:block">
                  <div className="ml-30 flex items-baseline space-x-4">
                    <Button
                      variant="ghost"
                      className="text-white hover:bg-white/20 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                      onClick={() => handleNavigation("/tecnico/mis-ordenes")}
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      MIS ÓRDENES
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-white hover:bg-white/20 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                      onClick={() => handleNavigation("/tecnico/perfil")}
                    >
                      <User className="mr-2 h-4 w-4" />
                      MI PERFIL
                    </Button>
                  </div>
                </nav>

                {/* User menu */}
                <div className="flex items-center space-x-4">
                  {/* Mostrar información del usuario */}
                  <div className="hidden md:block text-white text-sm">
                    <div className="font-medium">{user?.nombre}</div>
                    <div className="text-white/80">{user?.area}</div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 data-[state=open]:bg-white"
                      >
                        <User className="h-5 w-5" style={{ color: "#333231" }} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 bg-white text-gray-800 shadow-lg rounded-md border border-gray-200"
                    >
                      <div className="px-4 py-2 border-b border-gray-200">
                        <div className="font-medium">{user?.nombre}</div>
                        <div className="text-sm text-gray-500 break-words word-wrap overflow-wrap-anywhere max-w-full">{user?.email}</div>
                        <div className="text-sm text-gray-500 capitalize">{user?.rol}</div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="py-3 px-4 hover:bg-gray-100 text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-red-800 font-medium">Error al cargar datos</p>
                </div>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            )}

            {/* Loading state */}
            {loading && !error && (
              <div className="bg-white/90 rounded-lg shadow-md p-8 mb-6">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00B0B2] mr-3" />
                  <p className="text-gray-600">Cargando datos del dashboard...</p>
                </div>
              </div>
            )}

            {/* Welcome section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2 drop-shadow-lg" style={{ color: "#333231" }}>
                Bienvenido, {user?.nombre}
              </h1>
              <p className="drop-shadow-md text-lg font-medium" style={{ color: "#00B0B2" }}>
                Panel de control técnico - {user?.area}
              </p>
            </div>

            {/* Content - only show when not loading and no error */}
            {!loading && !error && dashboardData && (
            <div>
            {/* Quick stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClipboardList className="h-8 w-8 text-[#00B0B2]" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Órdenes Pendientes</p>
                    {loading ? (
                      <div className="flex items-center">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                        <p className="text-lg text-gray-400">Cargando...</p>
                      </div>
                    ) : (
                      <p className="text-2xl font-semibold text-gray-900">
                        {dashboardData?.estadisticas.pendientes || 0}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Completadas</p>
                    {loading ? (
                      <div className="flex items-center">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                        <p className="text-lg text-gray-400">Cargando...</p>
                      </div>
                    ) : (
                      <p className="text-2xl font-semibold text-gray-900">
                        {dashboardData?.estadisticas.completadas || 0}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mis órdenes */}
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Mis Órdenes de Trabajo</h3>
                  <ClipboardList className="h-6 w-6 text-[#00B0B2]" />
                </div>
                <p className="text-gray-600 mb-4">
                  Ver y gestionar todas las órdenes de trabajo asignadas a tu área.
                </p>
                <Button
                  onClick={() => handleNavigation("/tecnico/mis-ordenes")}
                  className="w-full"
                  style={{ backgroundColor: "#00B0B2", color: "white" }}
                >
                  Ver Órdenes
                </Button>
              </div>

              {/* Perfil */}
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Mi Perfil</h3>
                  <User className="h-6 w-6 text-[#00B0B2]" />
                </div>
                <p className="text-gray-600 mb-4">
                  Actualizar información personal y configuración de cuenta.
                </p>
                <Button
                  onClick={() => handleNavigation("/tecnico/perfil")}
                  variant="outline"
                  className="w-full"
                  style={{ borderColor: "#00B0B2", color: "#00B0B2" }}
                >
                  Ver Perfil
                </Button>
              </div>
            </div>

            {/* Recent activity */}
            <div className="mt-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#00B0B2] mr-3" />
                    <p className="text-gray-600">Cargando actividad reciente...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
                    <p className="text-red-600">Error al cargar la actividad reciente</p>
                    <p className="text-sm text-gray-500 mt-1">{error}</p>
                  </div>
                ) : dashboardData?.actividad_reciente && dashboardData.actividad_reciente.length > 0 ? (
                  <div className="relative">
                    <div 
                      className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
                      style={{
                        scrollBehavior: 'smooth'
                      }}
                    >
                      <div className="space-y-3 pr-2">
                        {dashboardData.actividad_reciente.slice(0, 5).map((actividad, index) => {
                          // Determinar icono y color según la etapa
                          const getIconoEtapa = (etapa: string) => {
                            switch (etapa?.toLowerCase()) {
                              case 'terminada':
                              case 'completada':
                                return <CheckCircle className="h-5 w-5 text-green-500" />;
                              case 'en cotización (i/r)':
                                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
                              case 'pendiente':
                              case 'arquitectura':
                              case 'compra en sitio':
                                return <ClipboardList className="h-5 w-5 text-[#00B0B2]" />;
                              default:
                                return <FileText className="h-5 w-5 text-gray-500" />;
                            }
                          };

                          return (
                            <div key={index} className="flex items-center justify-between py-3 px-2 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  OT-{actividad.folio} - {actividad.asunto}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500">{actividad.tiempo}</span>
                                  <span className="text-xs text-gray-300">•</span>
                                  <span className="text-xs text-gray-600 font-medium">{actividad.etapa}</span>
                                </div>
                              </div>
                              <div className="flex-shrink-0 ml-4">
                                {getIconoEtapa(actividad.etapa)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {dashboardData.actividad_reciente.length > 5 && (
                      <div className="text-center mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Mostrando las 5 actividades más recientes de {dashboardData.actividad_reciente.length} total
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay actividad reciente disponible</p>
                    <p className="text-sm text-gray-400 mt-1">Las órdenes de trabajo aparecerán aquí una vez que empiecen a ser procesadas</p>
                  </div>
                )}
              </div>
            </div>
            </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
