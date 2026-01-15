"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "../../lib/auth_context"
import { useRouter } from 'next/navigation'
import { useDashboardRoute } from "@/hooks/useDashboardRoute"
import {
  User,
  Building2,
  Users,
  Activity,
  FileText,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  TrendingUp,
  BarChart2,
  Wrench,
  Settings,
  Percent,
  Timer,
  LogOut,
  Monitor,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export default function Dashboard() {
  const [selectedDropdown, setSelectedDropdown] = useState("Mis Órdenes De Trabajo")
  const { user, logout } = useAuth();
  const router = useRouter();
  const { dashboardRoute } = useDashboardRoute();

  // Estados para los datos del dashboard
  const [dashboardData, setDashboardData] = useState({
    totalOTs: 0,
    otsPendientes: 0,
    efectividadCierre: 0,
    tiposMantenimiento: {
      preventivo: 0,
      correctivo: 0,
      porcentajePreventivo: 0,
      porcentajeCorrectivo: 0,
      porcentajePredictivo: 0,
    },
    actividadesRecientes: []
  });
  const [loading, setLoading] = useState(true);

  // Función para obtener los datos del dashboard desde FastAPI únicamente
  const fetchDashboardData = async () => {
    try {
      // Verificar que el usuario esté autenticado
      const storedToken = localStorage.getItem("access_token") || localStorage.getItem("token");
      if (!user || !storedToken) {
        console.error("Usuario no autenticado o token faltante");
        setLoading(false);
        return;
      }

      setLoading(true);
      
      // Conectar únicamente con FastAPI
      const API_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'http://localhost:8001/api/v1';
      
      // Determinar endpoint según área del usuario
      const areaLower = user?.area?.toLowerCase() || '';
      let endpoint = `${API_URL}/ots/dashboard-stats`; // Default general
      if (areaLower === 'mantenimiento' || areaLower === 'mantenimiento planta') {
        endpoint = `${API_URL}/ots/dashboard-mantenimiento-stats`;
        console.log("🔧 Cargando datos del dashboard de Mantenimiento desde FastAPI...");
      } else if (areaLower === 'tic') {
        endpoint = `${API_URL}/ots/dashboard-tic-stats`;
        console.log("💻 Cargando datos del dashboard de TIC desde FastAPI...");
      } else {
        console.log("🔐 Cargando datos del dashboard general desde FastAPI...");
      }
      
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${storedToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
        console.log("✅ Datos del dashboard cargados desde FastAPI:", data);
      } else {
        console.error("❌ Error al obtener datos del dashboard:", response.status, response.statusText);
        // Si el token es inválido, redirigir al login
        if (response.status === 401 || response.status === 422) {
          console.log("🔐 Token inválido, redirigiendo al login");
          logout();
        } else {
          throw new Error(`Error del servidor: ${response.status}`);
        }
      }

    } catch (error) {
      console.error("❌ Error al conectar con FastAPI:", error);
      // Mostrar mensaje de error más específico
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error("🚨 FastAPI no está disponible. Verifique que esté ejecutándose en puerto 8001");
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente, solo cuando el usuario esté disponible
  useEffect(() => {
    if (user && (localStorage.getItem("access_token") || localStorage.getItem("token"))) {
      fetchDashboardData();
    } else if (user) {
      // Si hay usuario pero no token, usar datos vacíos para evitar pantalla en blanco
      setLoading(false);
    }
  }, [user]); // Dependencia en user para ejecutar cuando esté disponible

  const navigationItems = [
    { name: "ORGANIZACIONES", icon: Settings, href: "/organizaciones" },
    { name: "OTS", icon: ClipboardList, href: "/ots" },
    { name: "SOLICITUDES", icon: FileText, href: "/solicitudes" },
  ]

  const handleNavigation = (href: string) => {
    router.push(href);
  }

  const handleLogout = () => {
    logout();
  }

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00B0B2] mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
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
      {/* Overlay para mejorar contraste */}
      <div className="min-h-screen bg-black/5">
        {/* Header Navigation */}
        <header
          className="shadow-lg border-b"
          style={{ backgroundColor: "#00B0B2", borderColor: "#00B0B2" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center">
                <Link href={dashboardRoute}>
                  <img
                    src="/images/logo.png"
                    alt="Logo"
                    className="h-12 w-auto object-contain cursor-pointer"
                  />
                </Link>
              </div>

              {/* Navigation Menu */}
              <nav className="hidden md:block">
                <div className="ml-30 flex items-baseline space-x-4">
                  {navigationItems.map((item) => (
                    <Button
                      key={item.name}
                      asChild
                      variant="ghost"
                      className={`text-white hover:bg-white/20 px-3 py-2 text-sm font-medium ${
                        item.name === "DASHBOARD" ? "bg-white/30" : ""
                      }`}
                    >
                      <Link href={item.href} className="flex items-center">
                        <item.icon
                          className="w-4 h-4 mr-2"
                          style={{ color: "#333231" }} // Negro elegante
                        />
                        {item.name}
                      </Link>
                    </Button>
                  ))}
                </div>
              </nav>

              {/* User Avatar */}
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
                    {user?.rol === 'admin' && (
                      <>
                        <DropdownMenuItem 
                          onClick={() => router.push('/ajustes')} 
                          className="py-3 px-4 hover:bg-gray-100 text-gray-700"
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Ajustes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
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

        {/* Dashboard Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Dashboard Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black drop-shadow-sm">Dashboard de Mantenimiento</h1>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* KPI 1 - Total OTs Recibidas */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:transform hover:scale-105 transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total OTs Recibidas</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>
                    {loading ? "..." : dashboardData.totalOTs}
                  </p>
                  <p className="text-sm mt-2 text-blue-500 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" /> Total global
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <ClipboardList className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>

            {/* KPI 2 - OTs Pendientes */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-yellow-500 hover:transform hover:scale-105 transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">OTs Pendientes</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>
                    {loading ? "..." : dashboardData.otsPendientes}
                  </p>
                  <p className="text-sm mt-2 text-yellow-600 flex items-center">
                    <Clock className="w-4 h-4 mr-1" /> Requieren atención
                  </p>
                </div>
                <div className="p-3 rounded-full bg-yellow-100">
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* KPI 3 - Efectividad de Cierre */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:transform hover:scale-105 transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Efectividad de Cierre</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>
                    {loading ? "..." : `${dashboardData.efectividadCierre.toFixed(1)}%`}
                  </p>
                  <p className="text-sm mt-2 text-green-500 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" /> Cerradas vs Recibidas
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </div>

            {/* KPI 4 - Distribución de Tipos */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-purple-500 hover:transform hover:scale-105 transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Mantenimiento Preventivo</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>
                    {loading ? "..." : `${dashboardData.tiposMantenimiento.porcentajePreventivo.toFixed(1)}%`}
                  </p>
                  <p className="text-sm mt-2 text-purple-600 flex items-center">
                    <Settings className="w-4 h-4 mr-1" /> 
                    {!loading && `${dashboardData.tiposMantenimiento.preventivo} preventivo | ${dashboardData.tiposMantenimiento.correctivo} correctivo`}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <Settings className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts & Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Column 1: Maintenance Types Chart */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 lg:col-span-1">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Tipos de Mantenimiento</h2>
              
              {/* Preventive Maintenance */}
              <div className="relative pt-1 mb-6">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                      Preventivo
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-green-600">
                      {loading ? "..." : `${dashboardData.tiposMantenimiento.porcentajePreventivo.toFixed(1)}%`}
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-3 mb-1 text-xs flex rounded bg-green-200">
                  <div 
                    style={{ width: `${dashboardData.tiposMantenimiento.porcentajePreventivo}%` }} 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {loading ? "..." : dashboardData.tiposMantenimiento.preventivo} órdenes de trabajo
                </p>
              </div>
              
              {/* Corrective Maintenance */}
              <div className="relative pt-1 mb-6">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">
                      Correctivo
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-red-600">
                      {loading ? "..." : `${dashboardData.tiposMantenimiento.porcentajeCorrectivo.toFixed(1)}%`}
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-3 mb-1 text-xs flex rounded bg-red-200">
                  <div 
                    style={{ width: `${dashboardData.tiposMantenimiento.porcentajeCorrectivo}%` }} 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500"
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {loading ? "..." : dashboardData.tiposMantenimiento.correctivo} órdenes de trabajo
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-600">
                <div className="flex items-center justify-center">
                  <Clock className="w-4 h-4 mr-2 text-gray-500" />
                  <span>Total de OTs registradas: {loading ? "..." : dashboardData.totalOTs}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Recent Activities Table */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Actividades Recientes</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Últimas 5 actividades</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/ots')}
                  >
                    Ver todas
                  </Button>
                </div>
              </div>
              
              {/* Contenedor con scroll vertical para la tabla */}
              <div className="relative">
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="dashboard-table-container max-h-80 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Folio</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tienda</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Técnico</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#00B0B2] mr-2"></div>
                                Cargando actividades recientes...
                              </div>
                            </td>
                          </tr>
                        ) : dashboardData.actividadesRecientes.length > 0 ? (
                          dashboardData.actividadesRecientes.map((actividad: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{actividad.folio}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{actividad.tienda}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{actividad.tipo}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{actividad.tecnico}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  actividad.estado === 'En proceso' ? 'bg-blue-100 text-blue-800' :
                                  actividad.estado === 'Programado' ? 'bg-yellow-100 text-yellow-800' :
                                  actividad.estado === 'Urgente' ? 'bg-red-100 text-red-800' :
                                  actividad.estado === 'Completado' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {actividad.estado}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                              <div className="flex flex-col items-center">
                                <ClipboardList className="h-8 w-8 text-gray-300 mb-2" />
                                <span>No hay actividades recientes</span>
                                <span className="text-xs text-gray-400 mt-1">Las actividades aparecerán aquí cuando se registren nuevas OTs</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Indicador de scroll si hay más de 3 registros */}
                {!loading && dashboardData.actividadesRecientes.length > 3 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent h-4 pointer-events-none rounded-b-lg"></div>
                )}
                
                {/* Footer con información */}
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                  <span>
                    {loading ? "Cargando..." : `Mostrando ${dashboardData.actividadesRecientes.length} de ${dashboardData.actividadesRecientes.length} actividades recientes`}
                  </span>
                  {!loading && dashboardData.actividadesRecientes.length > 0 && (
                    <span>Última actualización: {new Date().toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sección de Accesos Rápidos */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Accesos Rápidos</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Tarjeta Ver Solicitudes */}
              <div 
                className="bg-white/90 rounded-lg shadow-lg p-6 border-l-4 border-[#00B0B2] hover:transform hover:scale-105 transition-transform cursor-pointer"
                onClick={() => router.push('/solicitudes')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Ver Solicitudes</h3>
                    <p className="text-sm text-gray-600 mb-4">Consulta todas las solicitudes recibidas</p>
                    <Button 
                      className="bg-[#00B0B2] hover:bg-[#0C6659] text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/solicitudes');
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Ver Solicitudes
                    </Button>
                  </div>
                  <div className="p-3 rounded-full bg-[#00B0B2]/10">
                    <FileText className="w-8 h-8 text-[#00B0B2]" />
                  </div>
                </div>
              </div>

              {/* Tarjeta Crear Solicitud */}
              <div 
                className="bg-white/90 rounded-lg shadow-lg p-6 border-l-4 border-green-500 hover:transform hover:scale-105 transition-transform cursor-pointer"
                onClick={() => router.push('/formulario-b2c')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Nueva Solicitud B2C</h3>
                    <p className="text-sm text-gray-600 mb-4">Crea una nueva solicitud de servicio al cliente</p>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/formulario-b2c');
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Crear Solicitud B2C
                    </Button>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <FileText className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Tarjeta Planta San Pedro */}
              <div 
                className="bg-white/90 rounded-lg shadow-lg p-6 border-l-4 border-orange-500 hover:transform hover:scale-105 transition-transform cursor-pointer"
                onClick={() => router.push('/formulario-planta-san-pedro')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Planta San Pedro</h3>
                    <p className="text-sm text-gray-600 mb-4">Solicitudes específicas para la planta de producción</p>
                    <Button 
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/formulario-planta-san-pedro');
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Crear Solicitud Planta
                    </Button>
                  </div>
                  <div className="p-3 rounded-full bg-orange-100">
                    <FileText className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Tarjeta OTs */}
              <div 
                className="bg-white/90 rounded-lg shadow-lg p-6 border-l-4 border-blue-500 hover:transform hover:scale-105 transition-transform cursor-pointer"
                onClick={() => router.push('/ots')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Órdenes de Trabajo</h3>
                    <p className="text-sm text-gray-600 mb-4">Gestiona las órdenes de trabajo</p>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/ots');
                      }}
                    >
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Ver OTs
                    </Button>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <ClipboardList className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  )
}
