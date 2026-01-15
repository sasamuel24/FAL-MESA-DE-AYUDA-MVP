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
  FileText,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  TrendingUp,
  BarChart2,
  Monitor,
  Settings,
  Percent,
  Timer,
  LogOut,
  Wifi,
  Shield,
  HardDrive,
  Smartphone,
  PieChart,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export default function DashboardTIC() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { dashboardRoute } = useDashboardRoute();

  // Definir tipos para los datos del dashboard TIC
  interface ActividadReciente {
    folio: string;
    tienda: string;
    categoria: string;
    tecnico: string;
    estado: string;
  }

  interface DashboardTICData {
    totalTickets: number;
    ticketsPendientes: number;
    efectividadCierre: number;
    tiempoPromedioResolucion: number;
    ticketsPorCategoria: {
      equipos_tic: number;
      internet: number;
      office_correo: number;
      siesa: number;
    };
    actividadesRecientes: ActividadReciente[];
  }

  // Estados para los datos del dashboard TIC
  const [dashboardData, setDashboardData] = useState<DashboardTICData>({
    totalTickets: 0,
    ticketsPendientes: 0,
    efectividadCierre: 0,
    tiempoPromedioResolucion: 0,
    ticketsPorCategoria: {
      equipos_tic: 0,
      internet: 0,
      office_correo: 0,
      siesa: 0,
    },
    actividadesRecientes: []
  });
  const [loading, setLoading] = useState(true);

  // Función para obtener los datos del dashboard TIC desde FastAPI
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
      
      // Conectar con FastAPI
      const API_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'https://b4phy0y28i.execute-api.us-east-2.amazonaws.com/v1/api/v1';
      console.log("🔐 Cargando datos del dashboard TIC desde FastAPI...");
      const response = await fetch(`${API_URL}/ots/dashboard-tic-stats`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${storedToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
        console.log("✅ Datos del dashboard TIC cargados desde FastAPI:", data);
      } else {
        console.error("❌ Error al obtener datos del dashboard TIC:", response.status, response.statusText);
        // Si el token es inválido, redirigir al login
        if (response.status === 401 || response.status === 422) {
          console.log("🔐 Token inválido, redirigiendo al login");
          logout();
        } else {
          // Si el endpoint no existe aún, usar datos de prueba
          console.log("📊 Usando datos de prueba para el dashboard TIC");
          setDashboardData({
            totalTickets: 156,
            ticketsPendientes: 23,
            efectividadCierre: 87.5,
            tiempoPromedioResolucion: 4.2,
            ticketsPorCategoria: {
              equipos_tic: 45,
              internet: 28,
              office_correo: 32,
              siesa: 13,
            },
            actividadesRecientes: [
              { folio: "TIC-2024-001", tienda: "Mall Plaza", categoria: "Hardware", tecnico: "Juan Pérez", estado: "En proceso" },
              { folio: "TIC-2024-002", tienda: "Centro Comercial", categoria: "Software", tecnico: "María García", estado: "Completado" },
              { folio: "TIC-2024-003", tienda: "Unicentro", categoria: "Red", tecnico: "Carlos López", estado: "Pendiente" },
              { folio: "TIC-2024-004", tienda: "Portal del Quindío", categoria: "Acceso", tecnico: "Ana Martínez", estado: "En proceso" },
              { folio: "TIC-2024-005", tienda: "La 14", categoria: "Hardware", tecnico: "Luis Rodríguez", estado: "Urgente" },
            ]
          });
        }
      }

    } catch (error) {
      console.error("❌ Error al conectar con FastAPI:", error);
      // Usar datos de prueba en caso de error
      console.log("📊 Usando datos de prueba debido a error de conexión");
      setDashboardData({
        totalTickets: 156,
        ticketsPendientes: 23,
        efectividadCierre: 87.5,
        tiempoPromedioResolucion: 4.2,
        ticketsPorCategoria: {
          equipos_tic: 45,
          internet: 28,
          office_correo: 32,
          siesa: 13,
        },
        actividadesRecientes: [
          { folio: "TIC-2024-001", tienda: "Mall Plaza", categoria: "Hardware", tecnico: "Juan Pérez", estado: "En proceso" },
          { folio: "TIC-2024-002", tienda: "Centro Comercial", categoria: "Software", tecnico: "María García", estado: "Completado" },
          { folio: "TIC-2024-003", tienda: "Unicentro", categoria: "Red", tecnico: "Carlos López", estado: "Pendiente" },
          { folio: "TIC-2024-004", tienda: "Portal del Quindío", categoria: "Acceso", tecnico: "Ana Martínez", estado: "En proceso" },
          { folio: "TIC-2024-005", tienda: "La 14", categoria: "Hardware", tecnico: "Luis Rodríguez", estado: "Urgente" },
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente, solo cuando el usuario esté disponible
  useEffect(() => {
    if (user && (localStorage.getItem("access_token") || localStorage.getItem("token"))) {
      fetchDashboardData();
    } else if (user) {
      // Si hay usuario pero no token, usar datos de prueba para evitar pantalla en blanco
      setLoading(false);
    }
  }, [user]);

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

  // Función para obtener el icono según la categoría
  const getCategoryIcon = (categoria: string) => {
    switch (categoria.toLowerCase()) {
      case 'hardware':
        return <HardDrive className="w-4 h-4" />;
      case 'software':
        return <Monitor className="w-4 h-4" />;
      case 'red':
        return <Wifi className="w-4 h-4" />;
      case 'acceso':
        return <Shield className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  // Función para obtener el color según la categoría
  const getCategoryColor = (categoria: string) => {
    switch (categoria.toLowerCase()) {
      case 'hardware':
        return 'text-blue-600 bg-blue-100';
      case 'software':
        return 'text-green-600 bg-green-100';
      case 'red':
        return 'text-purple-600 bg-purple-100';
      case 'acceso':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00B0B2] mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando dashboard TIC...</p>
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
                        item.name === "DASHBOARD TIC" ? "bg-white/30" : ""
                      }`}
                    >
                      <Link href={item.href} className="flex items-center">
                        <item.icon
                          className="w-4 h-4 mr-2"
                          style={{ color: "#333231" }}
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
            <h1 className="text-3xl font-bold text-black drop-shadow-sm">Dashboard de TIC</h1>
            <p className="text-gray-600 mt-2">Panel de control para el área de Tecnologías de la Información</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* KPI 1 - Total Tickets Recibidos */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:transform hover:scale-105 transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tickets Recibidos</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>
                    {loading ? "..." : dashboardData.totalTickets}
                  </p>
                  <p className="text-sm mt-2 text-blue-500 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" /> Incidentes reportados
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <ClipboardList className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>

            {/* KPI 2 - Tickets Pendientes */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-yellow-500 hover:transform hover:scale-105 transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tickets Pendientes</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>
                    {loading ? "..." : dashboardData.ticketsPendientes}
                  </p>
                  <p className="text-sm mt-2 text-yellow-600 flex items-center">
                    <Clock className="w-4 h-4 mr-1" /> Requieren atención
                  </p>
                </div>
                <div className="p-3 rounded-full bg-yellow-100">
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
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
                    <CheckCircle className="w-4 h-4 mr-1" /> Cerrados vs Recibidos
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </div>

            {/* KPI 4 - Tiempo Promedio de Resolución */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-purple-500 hover:transform hover:scale-105 transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tiempo Promedio Resolución</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>
                    {loading ? "..." : `${dashboardData.tiempoPromedioResolucion.toFixed(1)}h`}
                  </p>
                  <p className="text-sm mt-2 text-purple-600 flex items-center">
                    <Timer className="w-4 h-4 mr-1" /> Horas promedio
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <Timer className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts & Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Column 1: Tickets by Category Chart */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 lg:col-span-1">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
                <PieChart className="w-5 h-5 mr-2" />
                Tickets por Categoría
              </h2>
              
              {/* Equipos TIC */}
              <div className="relative pt-1 mb-4">
                <div className="flex mb-2 items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xs font-semibold py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200 flex items-center">
                      <HardDrive className="w-3 h-3 mr-1" />
                      Equipos TIC
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {loading ? "..." : dashboardData.ticketsPorCategoria.equipos_tic || 0}
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-blue-200">
                  <div 
                    style={{ width: `${((dashboardData.ticketsPorCategoria.equipos_tic || 0) / dashboardData.totalTickets) * 100}%` }} 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                  ></div>
                </div>
              </div>
              
              {/* Internet */}
              <div className="relative pt-1 mb-4">
                <div className="flex mb-2 items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xs font-semibold py-1 px-2 uppercase rounded-full text-green-600 bg-green-200 flex items-center">
                      <Wifi className="w-3 h-3 mr-1" />
                      Internet
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-green-600">
                      {loading ? "..." : dashboardData.ticketsPorCategoria.internet || 0}
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-green-200">
                  <div 
                    style={{ width: `${((dashboardData.ticketsPorCategoria.internet || 0) / dashboardData.totalTickets) * 100}%` }} 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
                  ></div>
                </div>
              </div>

              {/* Office - Correo */}
              <div className="relative pt-1 mb-4">
                <div className="flex mb-2 items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xs font-semibold py-1 px-2 uppercase rounded-full text-purple-600 bg-purple-200 flex items-center">
                      <Monitor className="w-3 h-3 mr-1" />
                      Office - Correo
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-purple-600">
                      {loading ? "..." : dashboardData.ticketsPorCategoria.office_correo || 0}
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-purple-200">
                  <div 
                    style={{ width: `${((dashboardData.ticketsPorCategoria.office_correo || 0) / dashboardData.totalTickets) * 100}%` }} 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500"
                  ></div>
                </div>
              </div>

              {/* Siesa */}
              <div className="relative pt-1 mb-6">
                <div className="flex mb-2 items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xs font-semibold py-1 px-2 uppercase rounded-full text-orange-600 bg-orange-200 flex items-center">
                      <Settings className="w-3 h-3 mr-1" />
                      Siesa
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-orange-600">
                      {loading ? "..." : dashboardData.ticketsPorCategoria.siesa || 0}
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-orange-200">
                  <div 
                    style={{ width: `${((dashboardData.ticketsPorCategoria.siesa || 0) / dashboardData.totalTickets) * 100}%` }} 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-orange-500"
                  ></div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-600">
                <div className="flex items-center justify-center">
                  <Monitor className="w-4 h-4 mr-2 text-gray-500" />
                  <span>Total de tickets: {loading ? "..." : dashboardData.totalTickets}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Recent Activities Table */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Actividades Recientes TIC</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Últimos 5 tickets</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/ots')}
                  >
                    Ver todos
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
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
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(actividad.categoria)} flex items-center w-fit`}>
                                  {getCategoryIcon(actividad.categoria)}
                                  <span className="ml-1">{actividad.categoria}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{actividad.tecnico}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  actividad.estado === 'En proceso' ? 'bg-blue-100 text-blue-800' :
                                  actividad.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
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
                                <Monitor className="h-8 w-8 text-gray-300 mb-2" />
                                <span>No hay actividades recientes</span>
                                <span className="text-xs text-gray-400 mt-1">Los tickets aparecerán aquí cuando se registren nuevos incidentes</span>
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

          {/* Sección de Accesos Rápidos TIC */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Accesos Rápidos TIC</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Tarjeta Ver Incidentes TIC */}
              <div 
                className="bg-white/90 rounded-lg shadow-lg p-6 border-l-4 border-[#00B0B2] hover:transform hover:scale-105 transition-transform cursor-pointer"
                onClick={() => router.push('/solicitudes')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Ver Incidentes TIC</h3>
                    <p className="text-sm text-gray-600 mb-4">Consulta todos los tickets de soporte técnico</p>
                    <Button 
                      className="bg-[#00B0B2] hover:bg-[#0C6659] text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/solicitudes');
                      }}
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      Ver Incidentes
                    </Button>
                  </div>
                  <div className="p-3 rounded-full bg-[#00B0B2]/10">
                    <Monitor className="w-8 h-8 text-[#00B0B2]" />
                  </div>
                </div>
              </div>

              {/* Tarjeta Nuevo Ticket TIC */}
              <div 
                className="bg-white/90 rounded-lg shadow-lg p-6 border-l-4 border-green-500 hover:transform hover:scale-105 transition-transform cursor-pointer"
                onClick={() => router.push('/formulario-b2c')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Nuevo Ticket B2C</h3>
                    <p className="text-sm text-gray-600 mb-4">Reporta un nuevo incidente de soporte técnico</p>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/formulario-b2c');
                      }}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Crear Ticket B2C
                    </Button>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <AlertTriangle className="w-8 h-8 text-green-600" />
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
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Crear Solicitud Planta
                    </Button>
                  </div>
                  <div className="p-3 rounded-full bg-orange-100">
                    <AlertTriangle className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Tarjeta Gestión de OTs TIC */}
              <div 
                className="bg-white/90 rounded-lg shadow-lg p-6 border-l-4 border-blue-500 hover:transform hover:scale-105 transition-transform cursor-pointer"
                onClick={() => router.push('/ots')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Órdenes de Trabajo TIC</h3>
                    <p className="text-sm text-gray-600 mb-4">Gestiona las órdenes de trabajo de TIC</p>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/ots');
                      }}
                    >
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Ver OTs TIC
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
