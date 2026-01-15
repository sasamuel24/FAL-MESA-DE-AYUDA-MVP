"use client"
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "../../../lib/auth_context"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Configuración de FastAPI
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'http://localhost:8001/api/v1';
import {
  User,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Building2,
  Store,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  LogOut,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

// Interface para las OTs del técnico (unificada)
interface TechnicianOT {
  id: number;
  folio: string;
  tipo_ot: 'work_order' | 'ot_solicitud';
  asunto: string;
  descripcion: string;
  fecha_creacion: string;
  fecha_programada?: string;
  fecha_completada?: string;
  estado: string;
  etapa: string;
  prioridad: string;
  tecnico_asignado: string;
  observaciones?: string;
  tiempo_estimado?: number;
  tiempo_real?: number;
  materiales_usados?: any;
  request_id?: number;
  solicitud?: {
    zona: string;
    ciudad: string;
    tienda: string;
    categoria: string;
    subcategoria: string;
    cliente_nombre: string;
    cliente_telefono: string;
    cliente_email: string;
    // Campos específicos para B2B comercial
    razon_social?: string;
    sucursal?: string;
    equipos?: string;
    // Campos específicos para Planta San Pedro
    planta?: string;
    activo?: string;
    archivo_adjunto?: {
      nombre: string;
      url: string;
    };
  } | null;
}

export default function MisOrdenesPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<TechnicianOT[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("todas");
  const [vistaActual, setVistaActual] = useState<'tiendas' | 'planta' | 'comercial'>('tiendas');
  
  // Estado para las estadísticas del técnico
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    pendientes: 0,
    completadas: 0,
    canceladas: 0
  });

  // Datos del técnico para el header - reactivo al cambio de usuario
  const [tecnicoData, setTecnicoData] = useState({
    nombre: "",
    apellido: "",
    cargo: "Técnico TTO"
  });

  // Navegación items
  const navigationItems = [
    { name: "MIS ÓRDENES", icon: ClipboardList, href: "/tecnico/mis-ordenes" },
    { name: "MI PERFIL", icon: User, href: "/tecnico/perfil" },
  ];

  const handleNavigation = (href: string) => {
    if (href.startsWith('/ots/')) {
      localStorage.setItem('userType', 'tecnico');
    }
    router.push(href);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Efecto para actualizar los datos del técnico cuando cambie el usuario
  useEffect(() => {
    if (user) {
      setTecnicoData({
        nombre: user.nombre || "",
        apellido: "", // El user type no tiene apellido
        cargo: user.area || "Técnico TTO"
      });
    }
  }, [user]);

  useEffect(() => {
    // Verificar que el usuario sea técnico
    if (user?.rol === 'admin') {
      console.log('🚫 Usuario admin intentando acceder a vista de técnico, redirigiendo...');
      alert('Los administradores no pueden acceder a la vista de técnico. Serás redirigido a la vista de administración.');
      router.push('/ots'); // Redirigir a la vista de administración
      return;
    }
    
    if (user?.email && user?.rol === 'tecnico') {
      fetchOrdenesTecnico();
    }
  }, [user, router]);

  const fetchOrdenesTecnico = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      console.log(`📋 Cargando órdenes para técnico desde FastAPI: ${user.email}`);
      
      const endpoint = `${FASTAPI_BASE_URL}/ots/tecnico/${encodeURIComponent(user.email)}`;
      console.log(`✅ Conectando con FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setOrdenes(result.data);
        
        // Actualizar estadísticas si están disponibles
        if (result.estadisticas) {
          setEstadisticas(result.estadisticas);
        }
        
        console.log(`✅ Cargadas ${result.data.length} órdenes para ${user.email} desde FastAPI`);
        console.log(`📊 Estadísticas:`, result.estadisticas);
      } else {
        console.error('❌ Error en respuesta:', result);
        setOrdenes([]);
        setEstadisticas({ total: 0, pendientes: 0, completadas: 0, canceladas: 0 });
      }
    } catch (error) {
      console.error('❌ Error al cargar órdenes del técnico desde FastAPI:', error);
      setOrdenes([]);
      setEstadisticas({ total: 0, pendientes: 0, completadas: 0, canceladas: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Función para filtrar órdenes
  const ordenesFiltradas = ordenes.filter(orden => {
    const matchSearch = searchTerm === "" || 
      orden.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orden.asunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (orden.solicitud?.tienda && orden.solicitud.tienda.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchEtapa = true;
    if (filtroEtapa !== "todas") {
      const etapaLower = orden.etapa?.toLowerCase();
      if (filtroEtapa === "pendiente") {
        // Pendientes = todo lo que NO sea terminada/completada
        matchEtapa = etapaLower !== 'completada' && etapaLower !== 'terminada';
      } else if (filtroEtapa === "completada") {
        // Completadas = solo las terminadas/completadas
        matchEtapa = etapaLower === 'completada' || etapaLower === 'terminada';
      } else {
        matchEtapa = orden.etapa === filtroEtapa;
      }
    }
    
    return matchSearch && matchEtapa;
  });

  // Debug: mostrar información de filtrado
  console.log(`🔍 Filtro actual: ${filtroEtapa}, Órdenes totales: ${ordenes.length}, Órdenes filtradas: ${ordenesFiltradas.length}`);
  if (ordenes.length > 0) {
    console.log(`📋 Etapas disponibles:`, [...new Set(ordenes.map(o => o.etapa))]);
  }

  // Función para obtener el color de la etapa
  const getEtapaColor = (etapa: string) => {
    switch (etapa?.toLowerCase()) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'terminada':
      case 'completada':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Función para obtener el color de la prioridad
  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad?.toLowerCase()) {
      case 'alta':
        return 'bg-red-100 text-red-800';
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'baja':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 🎯 Función para detectar el tipo de origen de una OT
  const getOrigenOT = (orden: TechnicianOT): 'tiendas' | 'planta' | 'comercial' => {
    if (!orden.solicitud) return 'tiendas'; // Default para OTs sin solicitud
    
    const zona = orden.solicitud.zona?.toLowerCase() || '';
    const categoria = orden.solicitud.categoria?.toLowerCase() || '';
    const subcategoria = orden.solicitud.subcategoria?.toLowerCase() || '';
    
    // Detectar Comercial B2B primero (tiene campos específicos)
    if (orden.solicitud.razon_social && orden.solicitud.sucursal && orden.solicitud.equipos) {
      return 'comercial';
    }
    
    // Detectar Planta San Pedro por varios criterios:
    // 1. Zona contiene "planta"
    // 2. Categoría y subcategoría son "sin especificar" (típico de planta)
    // 3. Zona es "N/A" y tiene categoría sin especificar
    if (zona.includes('planta') || 
        zona.includes('san pedro') ||
        (categoria.includes('sin especificar') && subcategoria.includes('sin especificar')) ||
        (zona === 'n/a' && categoria.includes('sin especificar'))) {
      return 'planta';
    }
    
    // Detectar Comercial B2B por zona (fallback)
    if (zona.includes('inversiones') || zona.includes('boludo') || zona.includes('s.a.s')) {
      return 'comercial';
    }
    
    // Por defecto: Tiendas
    return 'tiendas';
  };

  // 🎯 Función para filtrar órdenes por tipo
  const getOrdenesPorTipo = (tipo: 'tiendas' | 'planta' | 'comercial') => {
    return ordenesFiltradas.filter(orden => getOrigenOT(orden) === tipo);
  };

  // Función para obtener el icono de la etapa
  const getEtapaIcon = (etapa: string) => {
    switch (etapa?.toLowerCase()) {
      case 'pendiente':
        return <Clock className="w-4 h-4" />;
      case 'terminada':
      case 'completada':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelada':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <ClipboardList className="w-4 h-4" />;
    }
  };

  // Estadísticas rápidas - usando datos del endpoint
  const stats = {
    total: estadisticas.total || ordenes.length,
    pendientes: estadisticas.pendientes || ordenes.filter(o => {
      const etapaLower = o.etapa?.toLowerCase();
      return etapaLower !== 'completada' && etapaLower !== 'terminada';
    }).length,
    terminadas: estadisticas.completadas || ordenes.filter(o => {
      const etapaLower = o.etapa?.toLowerCase();
      return etapaLower === 'terminada' || etapaLower === 'completada';
    }).length
  };

  return (
    <ProtectedRoute requiredRole="tecnico">
      <div
        className="min-h-screen text-foreground bg-gray-50 w-full"
        style={{
          backgroundImage: "url('/images/cq2.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "50% 70%",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="min-h-screen w-full bg-black/5">
          {/* Header Navigation */}
          <header
            className="shadow-lg border-b"
            style={{ backgroundColor: "#00B0B2", borderColor: "#00B0B2" }}
          >
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Logo */}
                <div className="flex items-center">
                  <div className="flex items-center">
                    <button 
                      onClick={() => {
                        // Navegar al dashboard correspondiente según el rol
                        if (user?.rol === 'admin') {
                          router.push('/dashboard');
                        } else {
                          router.push('/tecnico');
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <img
                        src="/images/logo.png"
                        alt="Logo"
                        className="h-12 w-auto object-contain cursor-pointer"
                      />
                    </button>
                  </div>
                </div>
                
                {/* Navigation Menu */}
                <nav className="hidden md:block">
                  <div className="ml-30 flex items-baseline space-x-4">
                    {navigationItems.map((item) => (
                      <Button
                        key={item.name}
                        variant="ghost"
                        className={`text-white hover:bg-white/20 px-3 py-2 text-sm font-medium ${
                          item.name === "MIS ÓRDENES" ? "bg-white/30" : ""
                        }`}
                        onClick={() => handleNavigation(item.href)}
                      >
                        <item.icon
                          className="w-4 h-4 mr-2"
                          style={{ color: "#333231" }}
                        />
                        {item.name}
                      </Button>
                    ))}
                  </div>
                </nav>
                
                {/* User Info and Avatar */}
                <div className="flex items-center gap-3">
                  <div className="hidden md:block text-right">
                    <p className="text-white text-sm font-medium">{tecnicoData.nombre} {tecnicoData.apellido}</p>
                    <p className="text-white/80 text-xs">{tecnicoData.cargo}</p>
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
                      <DropdownMenuItem asChild>
                        <Link href="/tecnico/perfil" className="flex items-center py-3 px-4">
                          <User className="mr-2 h-4 w-4" />
                          Mi Perfil
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="py-3 px-4 hover:bg-gray-100 text-red-600 font-medium">
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-7xl mx-auto">
              
              {/* Title Section */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden mb-8">
                <div className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">Mis Órdenes de Trabajo</h1>
                      <p className="text-gray-600">Gestiona tus OTs asignadas</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                    </div>
                    <ClipboardList className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pendientes</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
                
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completadas</p>
                      <p className="text-2xl font-bold text-green-600">{stats.terminadas}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </div>
              </div>

              {/* Pestañas por tipo de origen */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg mb-6">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6" aria-label="Tabs">
                    <button
                      onClick={() => setVistaActual('tiendas')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        vistaActual === 'tiendas'
                          ? 'border-teal-500 text-teal-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Store className="w-4 h-4" />
                        <span>Tiendas ({getOrdenesPorTipo('tiendas').length})</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setVistaActual('planta')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        vistaActual === 'planta'
                          ? 'border-teal-500 text-teal-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4" />
                        <span>Planta San Pedro ({getOrdenesPorTipo('planta').length})</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setVistaActual('comercial')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        vistaActual === 'comercial'
                          ? 'border-teal-500 text-teal-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>Comercial B2B ({getOrdenesPorTipo('comercial').length})</span>
                      </div>
                    </button>
                  </nav>
                </div>
              </div>

              {/* Controles de búsqueda y filtros */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Búsqueda */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Buscar por folio, asunto o tienda..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  {/* Filtro por etapa */}
                  <div className="flex gap-2">
                    <select
                      value={filtroEtapa}
                      onChange={(e) => setFiltroEtapa(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="todas">Todas las etapas</option>
                      <option value="pendiente">Pendientes</option>
                      <option value="completada">Completadas</option>
                    </select>

                    <Button
                      onClick={fetchOrdenesTecnico}
                      variant="outline"
                      className="flex items-center gap-2"
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Lista de órdenes */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
                      <span className="text-gray-600">Cargando órdenes...</span>
                    </div>
                  </div>
                ) : getOrdenesPorTipo(vistaActual).length === 0 ? (
                  <div className="p-8 text-center">
                    <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay órdenes</h3>
                    <p className="text-gray-600">
                      {ordenes.length === 0 
                        ? "No tienes órdenes asignadas en este momento." 
                        : "No se encontraron órdenes que coincidan con los filtros seleccionados."
                      }
                    </p>
                  </div>
                ) : (
                  <div 
                    className="max-h-[calc(100vh-500px)] min-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 transition-colors"
                    style={{
                      scrollBehavior: 'smooth'
                    }}
                  >
                    <div className="p-4 space-y-4">
                      {getOrdenesPorTipo(vistaActual).map((orden) => (
                        <div key={orden.id} className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                          <div className="p-4 sm:p-6">
                            {/* Header de la orden */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                              <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                                <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                                  <ClipboardList className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">OT #{orden.folio}</h3>
                                  <p className="text-sm text-gray-600">{orden.asunto}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEtapaColor(orden.etapa)} flex items-center gap-1`}>
                                  {getEtapaIcon(orden.etapa)}
                                  {orden.etapa}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getPrioridadColor(orden.prioridad)}`}>
                                  {orden.prioridad}
                                </span>
                              </div>
                            </div>

                            {/* Información de la solicitud - Adaptada por tipo */}
                            {orden.solicitud && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                {/* Columna izquierda - Información de ubicación */}
                                <div className="space-y-2">
                                  {vistaActual === 'tiendas' && (
                                    <>
                                      <div className="flex items-center text-sm text-gray-600">
                                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                        <span>{orden.solicitud.zona} - {orden.solicitud.ciudad}</span>
                                      </div>
                                      <div className="flex items-center text-sm text-gray-600">
                                        <Store className="w-4 h-4 mr-2 text-gray-400" />
                                        <span>{orden.solicitud.tienda}</span>
                                      </div>
                                    </>
                                  )}
                                  
                                  {vistaActual === 'planta' && (
                                    <>
                                      <div className="flex items-center text-sm text-gray-600">
                                        <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium">Planta:</span>
                                        <span className="ml-1">{orden.solicitud.planta || orden.solicitud.zona}</span>
                                      </div>
                                      <div className="flex items-center text-sm text-gray-600">
                                        <Store className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium">Activo:</span>
                                        <span className="ml-1">{orden.solicitud.activo || 'Sin especificar'}</span>
                                      </div>
                                    </>
                                  )}
                                  
                                  {vistaActual === 'comercial' && (
                                    <>
                                      <div className="flex items-center text-sm text-gray-600">
                                        <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium">Razón Social:</span>
                                        <span className="ml-1">{orden.solicitud.razon_social || 'N/A'}</span>
                                      </div>
                                      <div className="flex items-center text-sm text-gray-600">
                                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium">Sucursal:</span>
                                        <span className="ml-1">{orden.solicitud.sucursal || 'N/A'}</span>
                                      </div>
                                      <div className="flex items-center text-sm text-gray-600">
                                        <Store className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium">Ciudad:</span>
                                        <span className="ml-1">{orden.solicitud.ciudad}</span>
                                      </div>
                                    </>
                                  )}
                                  
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                                    <span>{orden.solicitud.categoria} - {orden.solicitud.subcategoria}</span>
                                  </div>
                                </div>
                                
                                {/* Columna derecha - Información de contacto y específica */}
                                <div className="space-y-2">
                                  <div className="flex items-center text-sm text-gray-600">
                                    <User className="w-4 h-4 mr-2 text-gray-400" />
                                    <span>{orden.solicitud.cliente_nombre}</span>
                                  </div>
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                    <span>{orden.solicitud.cliente_email}</span>
                                  </div>
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                    <span>{orden.solicitud.cliente_telefono}</span>
                                  </div>
                                  
                                  {/* Información específica por tipo de vista */}
                                  {vistaActual === 'comercial' && (
                                    <div className="pt-2 border-t border-gray-100">
                                      <div className="flex items-center text-sm text-gray-600">
                                        <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium">Equipos:</span>
                                        <span className="ml-1">{orden.solicitud.equipos || orden.solicitud.tienda || 'N/A'}</span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {vistaActual === 'planta' && (
                                    <div className="pt-2 border-t border-gray-100">
                                      <div className="flex items-center text-sm text-gray-600">
                                        <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium">Tipo:</span>
                                        <span className="ml-1">{orden.solicitud.categoria} - {orden.solicitud.subcategoria}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Footer con fecha y acciones */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200">
                              <div className="flex items-center text-sm text-gray-500 mb-2 sm:mb-0">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>Creada: {orden.fecha_creacion}</span>
                              </div>
                              
                              <div className="flex space-x-2">
                                <Link href={`/ots/${orden.folio}`}>
                                  <Button size="sm" className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
                                    Ver Detalle
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
