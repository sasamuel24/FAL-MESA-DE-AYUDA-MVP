"use client"
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/protected-route"
import {
  User,
  ClipboardList,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  Settings,
  Camera,
  Star,
  Clock,
  CheckCircle2,
  TrendingUp,
  Shield,
  Wrench,
  RefreshCw
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useAuth } from "../../../lib/auth_context"

// Configuración de FastAPI únicamente
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'http://localhost:8001/api/v1';

export default function PerfilTecnico() {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  // Estados para el loading
  const [loading, setLoading] = useState(true);
  
  // Estado para las estadísticas del técnico
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    pendientes: 0,
    completadas: 0,
    canceladas: 0
  });
  
  // Datos del técnico (desde la base de datos)
  const [tecnicoData, setTecnicoData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    cargo: "Técnico TTO",
    especialidades: [],
    fechaIngreso: "",
    ubicacion: "",
    bio: "",
    avatar: "/images/avatar-placeholder.jpg"
  });
  
  // Estados temporales para edición (mantenemos solo para avatar)
  const [tempData, setTempData] = useState(tecnicoData);
  
  // Establecer el tipo de usuario y cargar datos
  useEffect(() => {
    localStorage.setItem('userType', 'tecnico');
    if (user?.email) {
      fetchTecnicoData();
    }
  }, [user?.email]);

  // Función para obtener los datos del técnico desde la base de datos
  const fetchTecnicoData = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      console.log(`👤 Cargando datos del técnico desde FastAPI: ${user.email}`);
      
      // Cargar estadísticas del técnico con FastAPI únicamente
      try {
        const dashboardEndpoint = `${FASTAPI_BASE_URL}/ots/dashboard/${encodeURIComponent(user.email)}`;
        
        console.log(`✅ Cargando estadísticas desde FastAPI: ${dashboardEndpoint}`);
        
        const statsResponse = await fetch(dashboardEndpoint);
        const statsResult = await statsResponse.json();
        
        if (statsResult.success && statsResult.data?.estadisticas) {
          setEstadisticas({
            total: statsResult.data.estadisticas.pendientes + statsResult.data.estadisticas.completadas,
            pendientes: statsResult.data.estadisticas.pendientes,
            completadas: statsResult.data.estadisticas.completadas,
            canceladas: 0 // Por ahora no tenemos este dato
          });
          console.log(`📊 Estadísticas cargadas desde FastAPI:`, statsResult.data.estadisticas);
        } else {
          console.warn('❌ No se pudieron cargar las estadísticas del dashboard');
        }
      } catch (statsError) {
        console.error('❌ Error al cargar estadísticas del dashboard:', statsError);
        
        // Intentar cargar desde el endpoint alternativo de técnico
        try {
          const tecnicoEndpoint = `${FASTAPI_BASE_URL}/ots/tecnico/${encodeURIComponent(user.email)}`;
          
          console.log(`🔄 Intentando con endpoint alternativo: ${tecnicoEndpoint}`);
          const ordersResponse = await fetch(tecnicoEndpoint);
          const ordersResult = await ordersResponse.json();
          
          if (ordersResult.success && ordersResult.estadisticas) {
            setEstadisticas({
              total: ordersResult.estadisticas.total || 0,
              pendientes: ordersResult.estadisticas.pendientes || 0,
              completadas: ordersResult.estadisticas.completadas || 0,
              canceladas: ordersResult.estadisticas.canceladas || 0
            });
            console.log(`📊 Estadísticas alternativas cargadas desde FastAPI:`, ordersResult.estadisticas);
          } else if (ordersResult.success && ordersResult.data) {
            // Si los datos vienen como array, calcular manualmente
            const ordenes = ordersResult.data;
            const completadas = ordenes.filter((o: any) => 
              o.etapa?.toLowerCase() === 'completada' || 
              o.etapa?.toLowerCase() === 'terminada' ||
              o.estado?.toLowerCase() === 'completada' ||
              o.estado?.toLowerCase() === 'terminada'
            ).length;
            const pendientes = ordenes.filter((o: any) => 
              (o.etapa?.toLowerCase() !== 'completada' && o.etapa?.toLowerCase() !== 'terminada') ||
              (o.estado?.toLowerCase() !== 'completada' && o.estado?.toLowerCase() !== 'terminada')
            ).length;
            
            setEstadisticas({
              total: ordenes.length,
              pendientes: pendientes,
              completadas: completadas,
              canceladas: 0
            });
            console.log(`📊 Estadísticas calculadas manualmente desde FastAPI: Total: ${ordenes.length}, Pendientes: ${pendientes}, Completadas: ${completadas}`);
          }
        } catch (alternativeError) {
          console.error('❌ Error al cargar estadísticas alternativas:', alternativeError);
          // En caso de error, establecer estadísticas vacías
          setEstadisticas({
            total: 0,
            pendientes: 0,
            completadas: 0,
            canceladas: 0
          });
        }
      }
      
      // Por ahora usamos los datos del usuario del contexto de auth
      // En el futuro se puede extender para obtener más información específica del técnico
      setTecnicoData({
        nombre: user.nombre || "",
        apellido: "", // Campo no disponible en User type
        email: user.email || "",
        telefono: "", // Campo no disponible en User type
        cargo: user.area || "Técnico TTO",
        especialidades: [], // Eliminamos las especialidades hardcodeadas
        fechaIngreso: "", // Campo no disponible en User type
        ubicacion: "", // Campo no disponible en User type
        bio: "Técnico especializado en mantenimiento de equipos de café.",
        avatar: "/images/avatar-placeholder.jpg"
      });
      
      console.log(`✅ Datos del técnico cargados para: ${user.nombre || user.email}`);
    } catch (error) {
      console.error('❌ Error al cargar datos del técnico:', error);
      // En caso de error, usar datos del contexto de auth
      setTecnicoData(prev => ({
        ...prev,
        nombre: user.nombre || "",
        apellido: "", // Campo no disponible en User type
        email: user.email || "",
        cargo: user.area || "Técnico TTO"
      }));
    } finally {
      setLoading(false);
    }
  };

  const navigationItems = [
    { name: "MIS ÓRDENES", icon: ClipboardList, href: "/tecnico/mis-ordenes" },
    { name: "MI PERFIL", icon: User, href: "/tecnico/perfil" },
  ]

  const handleNavigation = (href: string) => {
    if (href.startsWith('/ots/')) {
      localStorage.setItem('userType', 'tecnico');
    }
    router.push(href);
  }

  const handleLogout = () => {
    logout();
    router.push("/");
  }
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // En una implementación real, aquí se subiría la imagen
      console.log('Imagen seleccionada:', file.name);
      // Simulamos la actualización con una URL placeholder
      setTecnicoData({...tecnicoData, avatar: URL.createObjectURL(file)});
    }
  };

  // Mostrar loading mientras se cargan los datos
  if (loading) {
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
          <div className="min-h-screen w-full bg-black/5 flex items-center justify-center">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-teal-500 mx-auto mb-4" />
              <span className="text-gray-600">Cargando perfil del técnico...</span>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

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
                        item.name === "MI PERFIL" ? "bg-white/30" : ""
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
                <div className="hidden md:block text-right min-w-0 max-w-48">
                  <p className="text-white text-sm font-medium break-words word-wrap overflow-wrap-anywhere">{tecnicoData.nombre} {tecnicoData.apellido}</p>
                  <p className="text-white/80 text-xs break-words word-wrap overflow-wrap-anywhere">{tecnicoData.cargo}</p>
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
                    {user?.email && (
                      <div className="px-4 py-2 border-b border-gray-100">
                        <div className="text-sm text-gray-500 break-words word-wrap overflow-wrap-anywhere max-w-full">{user?.email}</div>
                      </div>
                    )}
                    <DropdownMenuItem onClick={handleLogout} className="py-3 px-4 hover:bg-gray-100 text-red-600 font-medium">Cerrar Sesión</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-6xl mx-auto">
            
            {/* Header del Perfil */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
              {/* Banner superior con gradiente */}
              <div 
                className="h-32 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #00B0B2 0%, #00999B 50%, #008B8D 100%)"
                }}
              >
                {/* Patrón de texto de fondo mejorado */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -top-4 -left-8 text-white/30 text-8xl font-black transform -rotate-12 select-none">
                    TÉCNICO
                  </div>
                  <div className="absolute top-8 right-4 text-white/20 text-6xl font-black transform rotate-12 select-none">
                    PRO
                  </div>
                  <div className="absolute bottom-4 left-1/3 text-white/25 text-5xl font-black transform -rotate-6 select-none">
                    EXPERT
                  </div>
                </div>
                
                {/* Elementos decorativos geométricos */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-16 -translate-y-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full transform -translate-x-12 translate-y-12"></div>
                  <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/5 rounded-full"></div>
                </div>
                
                {/* Líneas decorativas */}
                <div className="absolute inset-0">
                  <div className="absolute top-4 left-1/4 w-20 h-0.5 bg-white/20 transform -rotate-45"></div>
                  <div className="absolute bottom-6 right-1/3 w-16 h-0.5 bg-white/15 transform rotate-45"></div>
                  <div className="absolute top-1/2 left-12 w-12 h-0.5 bg-white/20 transform rotate-12"></div>
                </div>
                
                {/* Overlay principal */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/5"></div>
              </div>
              
              {/* Información del perfil */}
              <div className="px-6 pb-6 relative">
                <div className="flex flex-col md:flex-row items-center md:items-center gap-6 -mt-16">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
                      <img 
                        src={tecnicoData.avatar} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NCA2NEMzNCA2NCA2NCA0MCA2NCA0MEM2NCA0MCA5NCA2NCA4NCA2NFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTY0IDEwNEM3Ni40MzM0IDEwNCA4Ni41IDkzLjkzMzQgODYuNSA4MS41Qzg2LjUgNjkuMDY2NiA3Ni40MzM0IDU5IDY0IDU5QzUxLjU2NjYgNTkgNDEuNSA2OS4wNjY2IDQxLjUgODEuNUM0MS41IDkzLjkzMzQgNTEuNTY2NiAxMDQgNjQgMTA0WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K";
                        }}
                      />
                    </div>
                    {/* Botón para cambiar foto */}
                    <label className="absolute bottom-0 right-0 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="w-10 h-10 bg-[#00B0B2] hover:bg-[#009fa0] rounded-full flex items-center justify-center shadow-lg transition-colors">
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                    </label>
                  </div>
                </div>
                
                {/* Información básica en una sección separada con fondo blanco */}
                <div className="mt-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-6">
                  <div className="text-center md:text-left">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">{tecnicoData.nombre} {tecnicoData.apellido}</h2>
                    <p className="text-xl text-[#00B0B2] font-semibold mb-3">{tecnicoData.cargo}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                      {tecnicoData.ubicacion && (
                        <div className="flex items-center text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                          <span className="text-sm font-medium">{tecnicoData.ubicacion}</span>
                        </div>
                      )}
                      {tecnicoData.fechaIngreso && (
                        <div className="flex items-center text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium">Desde {tecnicoData.fechaIngreso}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Accesos Rápidos */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Wrench className="h-6 w-6 text-[#00B0B2] mr-2" />
                Accesos Rápidos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button
                  onClick={() => handleNavigation('/tecnico/mis-ordenes')}
                  className="bg-gradient-to-r from-[#00B0B2] to-cyan-500 hover:from-[#00B0B2]/90 hover:to-cyan-600 text-white p-6 h-auto flex flex-col items-center space-y-3 rounded-lg"
                >
                  <ClipboardList className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-semibold">Mis Órdenes</div>
                    <div className="text-sm opacity-90">Ver órdenes asignadas</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleNavigation('/tecnico')}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white p-6 h-auto flex flex-col items-center space-y-3 rounded-lg"
                >
                  <TrendingUp className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-semibold">Panel Principal</div>
                    <div className="text-sm opacity-90">Tablero de bienvenida</div>
                  </div>
                </Button>
                
                <div className="bg-gray-50 p-6 rounded-lg flex flex-col items-center space-y-3 opacity-60">
                  <Calendar className="h-8 w-8 text-gray-400" />
                  <div className="text-center">
                    <div className="font-semibold text-gray-600">Calendario</div>
                    <div className="text-sm text-gray-500">Próximamente</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid de contenido */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Columna izquierda - Información personal */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Información Personal */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <User className="h-6 w-6 text-[#00B0B2] mr-2" />
                      <h3 className="text-xl font-bold text-gray-900">Información Personal</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Nombre Completo</label>
                        <p className="text-gray-900 font-medium">{tecnicoData.nombre} {tecnicoData.apellido}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Cargo</label>
                        <p className="text-gray-900 font-medium">{tecnicoData.cargo}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Biografía</label>
                      <p className="text-gray-900">{tecnicoData.bio}</p>
                    </div>
                  </div>
                </div>

                {/* Información de Contacto */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <Mail className="h-6 w-6 text-[#00B0B2] mr-2" />
                      <h3 className="text-xl font-bold text-gray-900">Información de Contacto</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-3" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="text-gray-900 font-medium break-words word-wrap overflow-wrap-anywhere max-w-full">{tecnicoData.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna derecha - Estadísticas y logros */}
              <div className="space-y-6">
                
                {/* Estadísticas */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <TrendingUp className="h-6 w-6 text-[#00B0B2] mr-2" />
                      <h3 className="text-xl font-bold text-gray-900">Estadísticas</h3>
                    </div>
                    <Button
                      onClick={fetchTecnicoData}
                      variant="outline"
                      size="sm"
                      className="border-[#00B0B2] text-[#00B0B2] hover:bg-[#00B0B2]/10"
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                  </div>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-[#00B0B2] mr-2" />
                      <span className="text-gray-600">Cargando estadísticas...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                          <span className="text-sm text-green-800">OTs Completadas</span>
                        </div>
                        <span className="text-xl font-bold text-green-600">{estadisticas.completadas}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                          <span className="text-sm text-yellow-800">OTs Pendientes</span>
                        </div>
                        <span className="text-xl font-bold text-yellow-600">{estadisticas.pendientes}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <TrendingUp className="h-5 w-5 text-gray-600 mr-2" />
                          <span className="text-sm text-gray-800">Total OTs</span>
                        </div>
                        <span className="text-xl font-bold text-gray-600">{estadisticas.total}</span>
                      </div>
                      
                      {/* Indicador de datos en tiempo real */}
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-center text-xs text-gray-500">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          Datos actualizados desde la base de datos
                        </div>
                      </div>
                    </div>
                  )}
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
