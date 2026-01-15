"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "../../lib/auth_context"
import { useHydration } from "@/hooks"
import { useDashboardRoute } from "@/hooks/useDashboardRoute"
import { useResizableColumns } from "@/hooks/useResizableColumns"
import "@/styles/resizable-tables.css"

// Configuración de FastAPI únicamente
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'https://b4phy0y28i.execute-api.us-east-2.amazonaws.com/v1';

// Tipo para las solicitudes B2C
interface B2CSolicitud {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  asunto: string;
  descripcion: string;
  zona: string;
  ciudad: string;
  tienda: string;
  categoria: string;
  subcategoria: string;
  archivo_nombre?: string;
  archivo_url?: string;
  estado: string;
  motivo_cancelacion?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

// Tipo para las solicitudes de Planta San Pedro
interface PlantaSanPedroSolicitud {
  id: number;
  nombre: string;
  correo: string;
  telefono?: string;
  asunto: string;
  descripcion: string;
  planta: string;
  activo: string;
  categoria: string;
  subcategoria: string;
  archivo_nombre?: string;
  archivo_url?: string;
  estado: string;
  motivo_cancelacion?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  tipo_formulario?: string; // Para identificar el tipo
}

// Tipo para las solicitudes comerciales B2B
interface ComercialSolicitud {
  id: number;
  folio: string;
  nombre: string;
  correo: string;
  telefono?: string;
  asunto: string;
  descripcion: string;
  ciudad: string;
  razon_social: string;
  sucursal: string;
  categoria: string;
  subcategoria: string;
  equipo: string;
  archivo_nombre?: string;
  archivo_url?: string;
  estado: string;
  motivo_cancelacion?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

import {
  User,
  Activity,
  FileText,
  ClipboardList,
  CheckCircle,
  Clock,
  LogOut,
  Search,
  Eye,
  Settings,
  X,
  AlertTriangle,
  Store,
  Building2,
  MapPin,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export default function SolicitudesPage() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClient = useHydration();
  const { dashboardRoute } = useDashboardRoute();
  
  // Debug logs
  console.log('📋 SolicitudesPage - Estado:', {
    user: user?.nombre,
    isClient,
    localStorage: typeof window !== 'undefined' ? {
      hasToken: !!localStorage.getItem('access_token'),
      hasUser: !!localStorage.getItem('user')
    } : 'no window'
  });

  const [solicitudes, setSolicitudes] = useState<B2CSolicitud[]>([]);
  const [solicitudesPlantaSP, setSolicitudesPlantaSP] = useState<PlantaSanPedroSolicitud[]>([]);
  const [solicitudesComercial, setSolicitudesComercial] = useState<ComercialSolicitud[]>([]);
  const [vistaActual, setVistaActual] = useState<'general' | 'planta-san-pedro' | 'comercial'>('general');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  
  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina] = useState(20);
  const [totalElementos, setTotalElementos] = useState(0);
  
  // Estados para el modal de cancelación
  const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false);
  const [solicitudACancelar, setSolicitudACancelar] = useState<B2CSolicitud | PlantaSanPedroSolicitud | ComercialSolicitud | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [cancelacionExitosa, setCancelacionExitosa] = useState(false);

  // Configuración del hook para columnas redimensionables
  const {
    columnWidths,
    getColumnStyle,
    ResizeHandle,
    tableRef,
    isResizing,
    resetColumns
  } = useResizableColumns({
    initialWidths: vistaActual === 'planta-san-pedro' ? {
      id: 70,
      creado: 130,
      asunto: 220,
      categoria: 130,
      subcategoria: 150,
      planta: 120,
      activo: 140,
      estado: 110,
      acciones: 100
    } : {
      id: 70,
      creado: 130,
      asunto: 220,
      categoria: 130,
      subcategoria: 150,
      zona: 100,
      ciudad: 110,
      tienda: 130,
      estado: 110,
      acciones: 100
    },
    minWidth: 60,
    maxWidth: 350,
    storageKey: vistaActual === 'planta-san-pedro' ? 'solicitudes-planta-sp-columns' : 'solicitudes-table-columns'
  });

  const navigationItems = [
    { name: "ORGANIZACIONES", icon: Settings, href: "/organizaciones" },
    { name: "OTS", icon: ClipboardList, href: "/ots" },
    { name: "SOLICITUDES", icon: FileText, href: "/solicitudes" },
  ]

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  // Leer parámetros de URL para establecer vista inicial
  useEffect(() => {
    const vista = searchParams.get('vista');
    if (vista === 'comercial') {
      setVistaActual('comercial');
    } else if (vista === 'planta-san-pedro') {
      setVistaActual('planta-san-pedro');
    } else if (vista === 'general') {
      setVistaActual('general');
    }
  }, [searchParams]);

  // Resetear página cuando cambien los filtros o la vista
  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, filtroEstado, vistaActual]);

  // TEMPORAL: Cambio automático de vista deshabilitado para debugging
  // useEffect(() => {
  //   // Solo para usuarios de mantenimiento que pueden ver ambas vistas
  //   if (user?.area?.toLowerCase() === 'mantenimiento' && solicitudesPlantaSP.length > 0) {
  //     // Si estamos en vista general y hay solicitudes de Planta San Pedro, 
  //     // verificar si la más reciente es muy nueva (menos de 30 segundos)
  //     if (vistaActual === 'general') {
  //       const solicitudMasReciente = solicitudesPlantaSP.sort((a, b) => b.id - a.id)[0];
  //       if (solicitudMasReciente && solicitudMasReciente.fecha_creacion) {
  //         const fechaCreacion = new Date(solicitudMasReciente.fecha_creacion);
  //         const ahora = new Date();
  //         const diferenciaTiempo = ahora.getTime() - fechaCreacion.getTime();
          
  //         // Si la solicitud fue creada hace menos de 30 segundos, cambiar vista
  //         if (diferenciaTiempo < 30000) {
  //           console.log('🔄 Cambiando a vista Planta San Pedro por nueva solicitud');
  //           setVistaActual('planta-san-pedro');
  //         }
  //       }
  //     }
  //   }
  // }, [solicitudesPlantaSP.length, user?.area, vistaActual]);

  const fetchSolicitudes = async () => {
    try {
      setRefreshing(true);
      
      console.log("🚀 Cargando TODAS las solicitudes desde FastAPI...");
      console.log("🔑 Token disponible:", !!token);
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Cargar solicitudes B2C y Planta San Pedro
      const response = await fetch(`${FASTAPI_BASE_URL}/solicitudes?per_page=0`, {
        headers
      });

      // Cargar solicitudes comerciales B2B
      const responseB2B = await fetch(`${FASTAPI_BASE_URL}/b2b/solicitudes`, {
        headers
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Datos B2C/Planta recibidos desde FastAPI:', result);
        
        if (result.success && Array.isArray(result.data)) {
          // Separar solicitudes por tipo Y área del usuario
          const solicitudesGenerales: B2CSolicitud[] = [];
          const solicitudesPlanta: PlantaSanPedroSolicitud[] = [];
          
          result.data.forEach((solicitud: any) => {
            console.log(`🔍 Clasificando solicitud ID ${solicitud.id}:`, {
              tipo_formulario: solicitud.tipo_formulario,
              categoria: solicitud.categoria,
              asignado_a: solicitud.asignado_a,
              area_usuario: user?.area
            });
            
            // Nota: El backend ya filtra las solicitudes por área del usuario
            // Aquí solo separamos por tipo de formulario
            if (solicitud.tipo_formulario === 'planta_san_pedro') {
              solicitudesPlanta.push(solicitud as PlantaSanPedroSolicitud);
            } else {
              solicitudesGenerales.push(solicitud as B2CSolicitud);
            }
          });
          
          setSolicitudes(solicitudesGenerales);
          setSolicitudesPlantaSP(solicitudesPlanta);
          
          console.log(`✅ Solicitudes generales: ${solicitudesGenerales.length}`);
          console.log(`✅ Solicitudes Planta San Pedro: ${solicitudesPlanta.length}`);
          
          if (result.showing_all) {
            console.log("🎯 Mostrando TODAS las solicitudes sin paginación");
          }
        } else {
          setSolicitudes([]);
          setSolicitudesPlantaSP([]);
        }
      } else {
        console.error("❌ Error en FastAPI:", response.status, response.statusText);
        setSolicitudes([]);
        setSolicitudesPlantaSP([]);
      }

      // Procesar solicitudes comerciales B2B
      if (responseB2B.ok) {
        const resultB2B = await responseB2B.json();
        console.log('✅ Datos comerciales B2B recibidos:', resultB2B);
        
        if (resultB2B.success && Array.isArray(resultB2B.data)) {
          const solicitudesComerciales: ComercialSolicitud[] = resultB2B.data.map((solicitud: any) => ({
            id: solicitud.id,
            folio: solicitud.folio,
            nombre: solicitud.nombre,
            correo: solicitud.correo,
            telefono: solicitud.telefono,
            asunto: solicitud.asunto,
            descripcion: solicitud.descripcion,
            ciudad: solicitud.ciudad?.nombre || 'N/A',
            razon_social: solicitud.razon_social?.nombre || 'N/A',
            sucursal: solicitud.sucursal?.nombre || 'N/A',
            categoria: solicitud.categoria?.nombre || 'N/A',
            subcategoria: solicitud.subcategoria?.nombre || 'N/A',
            equipo: solicitud.equipo?.nombre || 'N/A',
            archivo_nombre: solicitud.archivo_nombre,
            archivo_url: solicitud.archivo_url,
            estado: solicitud.estado,
            motivo_cancelacion: solicitud.motivo_cancelacion,
            fecha_creacion: solicitud.fecha_creacion,
            fecha_actualizacion: solicitud.fecha_actualizacion
          }));
          
          setSolicitudesComercial(solicitudesComerciales);
          console.log(`✅ Solicitudes comerciales: ${solicitudesComerciales.length}`);
        } else {
          setSolicitudesComercial([]);
        }
      } else {
        console.error("❌ Error al cargar solicitudes B2B:", responseB2B.status);
        setSolicitudesComercial([]);
      }

    } catch (error) {
      console.error('❌ Error al conectar con FastAPI:', error);
      setSolicitudes([]);
      setSolicitudesPlantaSP([]);
      setSolicitudesComercial([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Función para detectar el origen de una solicitud
  const getOrigenSolicitud = (solicitud: B2CSolicitud | PlantaSanPedroSolicitud | ComercialSolicitud): 'tiendas' | 'planta' | 'comercial' => {
    // Si tiene campo razon_social, es comercial
    if ('razon_social' in solicitud) {
      return 'comercial';
    }
    // Si tiene campo planta, es de planta San Pedro
    if ('planta' in solicitud) {
      return 'planta';
    }
    // Por defecto, es de tiendas
    return 'tiendas';
  };

  // Función para obtener solicitudes por tipo
  const getSolicitudesPorTipo = (tipo: 'tiendas' | 'planta' | 'comercial') => {
    if (tipo === 'tiendas') {
      return Array.isArray(solicitudes) && solicitudes.length > 0 
        ? [...solicitudes].sort((a, b) => b.id - a.id)
        : [];
    }
    if (tipo === 'planta') {
      return Array.isArray(solicitudesPlantaSP) && solicitudesPlantaSP.length > 0 
        ? [...solicitudesPlantaSP].sort((a, b) => b.id - a.id)
        : [];
    }
    if (tipo === 'comercial') {
      return Array.isArray(solicitudesComercial) && solicitudesComercial.length > 0
        ? [...solicitudesComercial].sort((a, b) => b.id - a.id)
        : [];
    }
    return [];
  };

  // Datos ordenados por ID descendente (más recientes primero)
  const solicitudesDisplay = vistaActual === 'planta-san-pedro' 
    ? getSolicitudesPorTipo('planta')
    : vistaActual === 'comercial'
    ? getSolicitudesPorTipo('comercial')
    : getSolicitudesPorTipo('tiendas');

  const filteredSolicitudes = solicitudesDisplay.filter(solicitud => {
    // Filtro por término de búsqueda - adaptado para todas las vistas
    const matchesSearch = (solicitud.id && solicitud.id.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
      (solicitud.asunto && solicitud.asunto.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (solicitud.categoria && solicitud.categoria.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (solicitud.subcategoria && solicitud.subcategoria.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (solicitud.nombre && solicitud.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      // Campos específicos para vista general
      (vistaActual === 'general' && 'zona' in solicitud && solicitud.zona && solicitud.zona.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vistaActual === 'general' && 'ciudad' in solicitud && solicitud.ciudad && solicitud.ciudad.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vistaActual === 'general' && 'tienda' in solicitud && solicitud.tienda && solicitud.tienda.toLowerCase().includes(searchTerm.toLowerCase())) ||
      // Campos específicos para Planta San Pedro
      (vistaActual === 'planta-san-pedro' && 'planta' in solicitud && solicitud.planta && solicitud.planta.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vistaActual === 'planta-san-pedro' && 'activo' in solicitud && solicitud.activo && solicitud.activo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      // Campos específicos para comercial
      (vistaActual === 'comercial' && 'folio' in solicitud && solicitud.folio && solicitud.folio.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vistaActual === 'comercial' && 'ciudad' in solicitud && solicitud.ciudad && solicitud.ciudad.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vistaActual === 'comercial' && 'razon_social' in solicitud && solicitud.razon_social && solicitud.razon_social.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vistaActual === 'comercial' && 'sucursal' in solicitud && solicitud.sucursal && solicitud.sucursal.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vistaActual === 'comercial' && 'categoria' in solicitud && solicitud.categoria && solicitud.categoria.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vistaActual === 'comercial' && 'subcategoria' in solicitud && solicitud.subcategoria && solicitud.subcategoria.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vistaActual === 'comercial' && 'equipo' in solicitud && solicitud.equipo && solicitud.equipo.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtro por estado
    const matchesEstado = filtroEstado === "todos" || 
      (filtroEstado === "pendiente" && (solicitud.estado === "pendiente" || !solicitud.estado)) ||
      (filtroEstado === "en_proceso" && (solicitud.estado === "en_proceso" || solicitud.estado === "En Proceso" || solicitud.estado === "en proceso" || solicitud.estado === "proceso")) ||
      (filtroEstado === "completada" && (solicitud.estado === "completada" || solicitud.estado === "terminada")) ||
      (filtroEstado === "cancelada" && solicitud.estado === "cancelada");

    return matchesSearch && matchesEstado;
  });

  // Actualizar total de elementos y resetear página si es necesario
  React.useEffect(() => {
    setTotalElementos(filteredSolicitudes.length);
    const totalPaginas = Math.ceil(filteredSolicitudes.length / elementosPorPagina);
    if (paginaActual > totalPaginas && totalPaginas > 0) {
      setPaginaActual(1);
    }
  }, [filteredSolicitudes.length, elementosPorPagina, paginaActual]);

  // Aplicar paginación
  const indiceInicio = (paginaActual - 1) * elementosPorPagina;
  const indiceFin = indiceInicio + elementosPorPagina;
  const solicitudesPaginadas = filteredSolicitudes.slice(indiceInicio, indiceFin);

  // Cálculos de paginación
  const totalPaginas = Math.ceil(filteredSolicitudes.length / elementosPorPagina);
  const hayPaginaAnterior = paginaActual > 1;
  const hayPaginaSiguiente = paginaActual < totalPaginas;

  // Funciones para manejar la cancelación de solicitudes
  const confirmarCancelacionSolicitud = (solicitud: B2CSolicitud | PlantaSanPedroSolicitud | ComercialSolicitud) => {
    setSolicitudACancelar(solicitud);
    setMostrarModalCancelar(true);
  };

  const cancelarCancelacionSolicitud = () => {
    setMostrarModalCancelar(false);
    setSolicitudACancelar(null);
    setMotivoCancelacion("");
    setCancelando(false);
    setCancelacionExitosa(false);
  };

  const handleCancelarSolicitud = async () => {
    if (!solicitudACancelar || !motivoCancelacion.trim()) {
      alert('Por favor ingrese el motivo de cancelación');
      return;
    }

    setCancelando(true);

    try {
      console.log("🚀 Cancelando solicitud desde FastAPI...");
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      // Determinar el endpoint según el tipo de solicitud
      // Una solicitud es B2B/comercial si tiene folio Y viene de la lista de solicitudesComercial
      const esComercialB2B = solicitudesComercial.some(s => s.id === solicitudACancelar.id);
      const cancelEndpoint = esComercialB2B 
        ? `${FASTAPI_BASE_URL}/b2b/solicitudes/${solicitudACancelar.id}/cancelar`
        : `${FASTAPI_BASE_URL}/solicitudes/id/${solicitudACancelar.id}/cancelar`;
      
      const response = await fetch(cancelEndpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          motivo_cancelacion: motivoCancelacion.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }

      const resultado = await response.json();
      console.log("✅ Solicitud cancelada desde FastAPI:", resultado);

      if (resultado && resultado.success) {
        // Actualizar la solicitud en el estado local según el tipo
        if (esComercialB2B) {
          setSolicitudesComercial(prevSolicitudes => 
            prevSolicitudes.map(s => 
              s.id === solicitudACancelar.id 
                ? { ...s, estado: 'cancelada' }
                : s
            )
          );
        } else {
          setSolicitudes(prevSolicitudes => 
            prevSolicitudes.map(s => 
              s.id === solicitudACancelar.id 
                ? { ...s, estado: 'cancelada' }
                : s
            )
          );

          setSolicitudesPlantaSP(prevSolicitudes => 
            prevSolicitudes.map(s => 
              s.id === solicitudACancelar.id 
                ? { ...s, estado: 'cancelada' }
                : s
            )
          );
        }

        setCancelando(false);
        setCancelacionExitosa(true);

        // Cerrar modal después de mostrar éxito
        setTimeout(() => {
          cancelarCancelacionSolicitud();
        }, 2000);

      } else {
        throw new Error(resultado?.message || 'Error al cancelar la solicitud');
      }

    } catch (error) {
      setCancelando(false);
      console.error('❌ Error al cancelar solicitud:', error);
      alert('Error al cancelar la solicitud: ' + (error as Error).message);
    }
  };

  return (
    <ProtectedRoute redirectTo="/login">
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
                        item.name === "SOLICITUDES" ? "bg-white/30" : ""
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
                  <div className="font-medium">{isClient && user ? user.nombre : ''}</div>
                  <div className="text-white/80">{isClient && user ? user.area : ''}</div>
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
                      <div className="font-medium">{isClient && user ? user.nombre : ''}</div>
                      <div className="text-sm text-gray-500 break-all max-w-[200px]">{isClient && user ? user.email : ''}</div>
                      <div className="text-sm text-gray-500 capitalize">{isClient && user ? user.rol : ''}</div>
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
                    <DropdownMenuItem onClick={() => logout()} className="py-3 px-4 hover:bg-gray-100 text-red-600">
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Title */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-black drop-shadow-sm">Gestión de Solicitudes</h1>
              
              {/* Toggle de Vista - Diferenciado por área del usuario */}
              {(user?.area?.toLowerCase() === 'mantenimiento' || user?.area?.toLowerCase() === 'mantenimiento planta' || user?.area?.toLowerCase() === 'tic' || user?.rol === 'admin') && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-semibold text-gray-700">
                    {user?.rol === 'admin' ? 'Vista Administrativa:' : 
                     user?.area?.toLowerCase() === 'tic' ? 'Vista TIC:' : 'Vista Mantenimiento:'}
                  </span>
                  <div className="flex bg-white/80 backdrop-blur-md rounded-xl p-1.5 shadow-lg border border-gray-200/50">
                    <Button
                      variant={vistaActual === 'general' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setVistaActual('general')}
                      className={`flex items-center px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                        vistaActual === 'general'
                          ? 'bg-gradient-to-r from-[#00B0B2] to-[#0C6659] text-white shadow-md transform scale-105 hover:shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                      }`}
                      title={user?.rol === 'admin' ? 
                        'Todas las solicitudes de tiendas del sistema' :
                        user?.area?.toLowerCase() === 'tic' ? 
                        'Solicitudes de tiendas asignadas al área de TIC' : 
                        'Solicitudes de tiendas asignadas al área de Mantenimiento'
                      }
                    >
                      <Store className="w-4 h-4 mr-2" />
                      Tiendas ({solicitudes.length})
                    </Button>
                    <Button
                      variant={vistaActual === 'planta-san-pedro' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setVistaActual('planta-san-pedro')}
                      className={`flex items-center px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                        vistaActual === 'planta-san-pedro'
                          ? 'bg-gradient-to-r from-[#00B0B2] to-[#0C6659] text-white shadow-md transform scale-105 hover:shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                      }`}
                      title={user?.rol === 'admin' ? 
                        'Todas las solicitudes de Planta San Pedro' :
                        'Todas las solicitudes de Planta San Pedro (compartidas entre TIC y Mantenimiento)'
                      }
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Planta San Pedro ({solicitudesPlantaSP.length})
                    </Button>
                    <Button
                      variant={vistaActual === 'comercial' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setVistaActual('comercial')}
                      className={`flex items-center px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                        vistaActual === 'comercial'
                          ? 'bg-gradient-to-r from-[#00B0B2] to-[#0C6659] text-white shadow-md transform scale-105 hover:shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                      }`}
                      title="Solicitudes comerciales B2B"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Comercial ({solicitudesComercial.length})
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Solicitudes */}
            <div 
              onClick={() => setFiltroEstado("todos")}
              className={`bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:transform hover:scale-105 transition-all duration-200 cursor-pointer hover:shadow-lg ${
                filtroEstado === "todos" ? "ring-2 ring-blue-400 bg-blue-50/90" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Solicitudes</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>{solicitudesDisplay.length}</p>
                  <p className="text-sm mt-2 text-blue-600 flex items-center">
                    <FileText className="w-4 h-4 mr-1" /> En el sistema
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Solicitudes Pendientes */}
            <div 
              onClick={() => setFiltroEstado("pendiente")}
              className={`bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-yellow-500 hover:transform hover:scale-105 transition-all duration-200 cursor-pointer hover:shadow-lg ${
                filtroEstado === "pendiente" ? "ring-2 ring-yellow-400 bg-yellow-50/90" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Solicitudes Pendientes</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>
                    {solicitudesDisplay.filter(s => s.estado === 'pendiente').length}
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

            {/* Solicitudes en Proceso */}
            <div 
              onClick={() => setFiltroEstado("en_proceso")}
              className={`bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-orange-500 hover:transform hover:scale-105 transition-all duration-200 cursor-pointer hover:shadow-lg ${
                filtroEstado === "en_proceso" ? "ring-2 ring-orange-400 bg-orange-50/90" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">En Proceso</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>
                    {solicitudesDisplay.filter(s => s.estado === 'en_proceso' || s.estado === 'En Proceso' || s.estado === 'en proceso' || s.estado === 'proceso').length}
                  </p>
                  <p className="text-sm mt-2 text-orange-600 flex items-center">
                    <Settings className="w-4 h-4 mr-1" /> En ejecución
                  </p>
                </div>
                <div className="p-3 rounded-full bg-orange-100">
                  <Settings className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </div>
            
            {/* Solicitudes Completadas */}
            <div 
              onClick={() => setFiltroEstado("completada")}
              className={`bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:transform hover:scale-105 transition-all duration-200 cursor-pointer hover:shadow-lg ${
                filtroEstado === "completada" ? "ring-2 ring-green-400 bg-green-50/90" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Terminadas</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>
                    {solicitudesDisplay.filter(s => s.estado === 'completada' || s.estado === 'terminada').length}
                  </p>
                  <p className="text-sm mt-2 text-green-600 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" /> Finalizadas
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="bg-white/90 rounded-lg shadow-md p-6 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md group">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-[#00B0B2] group-hover:text-[#0C6659] transition-colors duration-300" />
                    <input
                      type="text"
                      placeholder="Buscar solicitudes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 pr-10 py-3 w-full bg-white/80 backdrop-blur-md border-2 border-[#00B0B2]/60 rounded-xl shadow-lg hover:shadow-xl hover:border-[#00B0B2] focus:shadow-xl focus:border-[#00B0B2] focus:ring-2 focus:ring-[#00B0B2]/30 transition-all duration-300 text-sm placeholder:text-gray-400"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                        title="Limpiar búsqueda"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={fetchSolicitudes}
                  disabled={refreshing}
                  className={`
                    flex items-center gap-2 px-6 py-2 rounded-lg font-medium
                    transition-all duration-300 ease-in-out transform
                    ${refreshing 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-[#00B0B2] to-[#00A0A0] hover:from-[#009B9D] hover:to-[#008B8B] text-white shadow-lg hover:shadow-xl hover:scale-105'
                    }
                    border-0 focus:ring-2 focus:ring-[#00B0B2]/50 focus:ring-offset-2
                  `}
                >
                  {refreshing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Activity className={`w-4 h-4 transition-transform duration-300 ${refreshing ? 'animate-pulse' : 'group-hover:rotate-180'}`} />
                      Actualizar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Solicitudes Table */}
          <div className="bg-white/90 rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Lista de Solicitudes 
                    {vistaActual === 'planta-san-pedro' && user?.area && (
                      <span className="text-[#00B0B2] ml-2">
                        - Planta San Pedro ({user.area})
                      </span>
                    )}
                    {vistaActual === 'general' && user?.area && (
                      <span className="text-[#00B0B2] ml-2">
                        - {user.area === 'TIC' ? 'TIC General' : user.area}
                      </span>
                    )}
                    {vistaActual === 'comercial' && (
                      <span className="text-[#00B0B2] ml-2">
                        - Comercial B2B
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {vistaActual === 'planta-san-pedro' 
                      ? `Solicitudes de Planta San Pedro asignadas al área de ${user?.area || 'tu área'}`
                      : vistaActual === 'comercial'
                      ? 'Solicitudes comerciales del formulario B2B'
                      : `Solicitudes generales asignadas al área de ${user?.area || 'tu área'}`
                    }
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {filteredSolicitudes.length} de {solicitudesDisplay.length} solicitudes
                  {searchTerm && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      Filtrado: "{searchTerm}"
                    </span>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B0B2]"></div>
                <p className="mt-4 text-gray-600">Cargando solicitudes...</p>
              </div>
            ) : filteredSolicitudes.length > 0 ? (
              <div className="overflow-x-auto">
                {/* Contenedor con altura fija y scroll vertical */}
                <div className="max-h-[600px] overflow-y-auto border-t border-gray-200 table-scroll-container scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <table ref={tableRef} className="w-full table-with-separators subtle-separators" style={{ tableLayout: 'fixed' }}>
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('id')}>
                          ID
                          <ResizeHandle columnKey="id" />
                        </th>
                        <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('creado')}>
                          Creado
                          <ResizeHandle columnKey="creado" />
                        </th>
                        <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('asunto')}>
                          Asunto
                          <ResizeHandle columnKey="asunto" />
                        </th>
                        <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('categoria')}>
                          Categoría
                          <ResizeHandle columnKey="categoria" />
                        </th>
                        <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('subcategoria')}>
                          Subcategoría
                          <ResizeHandle columnKey="subcategoria" />
                        </th>
                        
                        {/* Columnas específicas para vista general */}
                        {vistaActual === 'general' && (
                          <>
                            <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('zona')}>
                              Zona
                              <ResizeHandle columnKey="zona" />
                            </th>
                            <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('ciudad')}>
                              Ciudad
                              <ResizeHandle columnKey="ciudad" />
                            </th>
                            <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('tienda')}>
                              Tienda
                              <ResizeHandle columnKey="tienda" />
                            </th>
                          </>
                        )}

                        {/* Columnas específicas para Planta San Pedro */}
                        {vistaActual === 'planta-san-pedro' && (
                          <>
                            <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('planta')}>
                              Planta
                              <ResizeHandle columnKey="planta" />
                            </th>
                            <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('activo')}>
                              Activo
                              <ResizeHandle columnKey="activo" />
                            </th>
                          </>
                        )}

                        {/* Columnas específicas para Comercial */}
                        {vistaActual === 'comercial' && (
                          <>
                            <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('ciudad')}>
                              Ciudad
                              <ResizeHandle columnKey="ciudad" />
                            </th>
                            <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('razon_social')}>
                              Razón Social
                              <ResizeHandle columnKey="razon_social" />
                            </th>
                            <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('sucursal')}>
                              Sucursal
                              <ResizeHandle columnKey="sucursal" />
                            </th>
                            <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('categoria')}>
                              Categoría
                              <ResizeHandle columnKey="categoria" />
                            </th>
                            <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('subcategoria')}>
                              Subcategoría
                              <ResizeHandle columnKey="subcategoria" />
                            </th>
                            <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('equipos')}>
                              Equipos
                              <ResizeHandle columnKey="equipos" />
                            </th>
                          </>
                        )}

                        <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('estado')}>
                          Estado
                          <ResizeHandle columnKey="estado" />
                        </th>
                        <th className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 group resizable-header" style={getColumnStyle('acciones')}>
                          Acciones
                          <ResizeHandle columnKey="acciones" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {solicitudesPaginadas.map((solicitud, index) => (
                      <tr key={solicitud.id || index} className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer resizable-row"
                          onClick={() => window.location.href = `/solicitudes/${solicitud.id}`}>
                        <td className="resizable-cell text-sm font-medium text-[#00B0B2]" style={getColumnStyle('id')} title={solicitud.id?.toString() || 'N/A'}>
                          <div className="cell-content font-semibold">
                            {solicitud.id || 'N/A'}
                          </div>
                        </td>
                        <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('creado')} title={solicitud.fecha_creacion ? new Date(solicitud.fecha_creacion).toLocaleDateString('es-CO') : 'N/A'}>
                          <div className="cell-content">
                            {solicitud.fecha_creacion ? new Date(solicitud.fecha_creacion).toLocaleDateString('es-CO') : 'N/A'}
                          </div>
                        </td>
                        <td className="resizable-cell-expandable text-sm text-gray-900" style={getColumnStyle('asunto')} title={solicitud.asunto || 'No disponible'}>
                          <div className="cell-content">
                            {solicitud.asunto || 'No disponible'}
                          </div>
                        </td>
                        <td className="resizable-cell text-sm text-gray-900" style={getColumnStyle('categoria')} title={solicitud.categoria || 'No disponible'}>
                          <div className="cell-content">
                            {solicitud.categoria || 'No disponible'}
                          </div>
                        </td>
                        <td className="resizable-cell text-sm text-gray-900" style={getColumnStyle('subcategoria')} title={solicitud.subcategoria || 'No disponible'}>
                          <div className="cell-content">
                            {solicitud.subcategoria || 'No disponible'}
                          </div>
                        </td>
                        
                        {/* Columnas específicas para vista general */}
                        {vistaActual === 'general' && (
                          <>
                            <td className="resizable-cell text-sm text-gray-900" style={getColumnStyle('zona')} title={('zona' in solicitud ? solicitud.zona : '') || 'No disponible'}>
                              <div className="cell-content">
                                {('zona' in solicitud ? solicitud.zona : '') || 'No disponible'}
                              </div>
                            </td>
                            <td className="resizable-cell text-sm text-gray-900" style={getColumnStyle('ciudad')} title={('ciudad' in solicitud ? solicitud.ciudad : '') || 'No disponible'}>
                              <div className="cell-content">
                                {('ciudad' in solicitud ? solicitud.ciudad : '') || 'No disponible'}
                              </div>
                            </td>
                            <td className="resizable-cell text-sm text-gray-900" style={getColumnStyle('tienda')} title={('tienda' in solicitud ? solicitud.tienda : '') || 'No disponible'}>
                              <div className="cell-content">
                                {('tienda' in solicitud ? solicitud.tienda : '') || 'No disponible'}
                              </div>
                            </td>
                          </>
                        )}

                        {/* Columnas específicas para Planta San Pedro */}
                        {vistaActual === 'planta-san-pedro' && (
                          <>
                            <td className="resizable-cell text-sm text-gray-900" style={getColumnStyle('planta')} title={((solicitud as any).planta) || 'No disponible'}>
                              <div className="cell-content">
                                {((solicitud as any).planta) || 'No disponible'}
                              </div>
                            </td>
                            <td className="resizable-cell text-sm text-gray-900" style={getColumnStyle('activo')} title={((solicitud as any).activo) || 'No disponible'}>
                              <div className="cell-content">
                                {((solicitud as any).activo) || 'No disponible'}
                              </div>
                            </td>
                          </>
                        )}

                        {/* Columnas específicas para Comercial */}
                        {vistaActual === 'comercial' && (
                          <>
                            <td className="resizable-cell text-sm text-gray-900" style={getColumnStyle('ciudad')} title={((solicitud as any).ciudad) || 'No disponible'}>
                              <div className="cell-content">
                                {((solicitud as any).ciudad) || 'No disponible'}
                              </div>
                            </td>
                            <td className="resizable-cell text-sm text-gray-900" style={getColumnStyle('razon_social')} title={((solicitud as any).razon_social) || 'No disponible'}>
                              <div className="cell-content">
                                {((solicitud as any).razon_social) || 'No disponible'}
                              </div>
                            </td>
                            <td className="resizable-cell text-sm text-gray-900" style={getColumnStyle('sucursal')} title={((solicitud as any).sucursal) || 'No disponible'}>
                              <div className="cell-content">
                                {((solicitud as any).sucursal) || 'No disponible'}
                              </div>
                            </td>
                            <td className="resizable-cell text-sm text-gray-900" style={getColumnStyle('categoria')} title={((solicitud as any).categoria) || 'No disponible'}>
                              <div className="cell-content">
                                {((solicitud as any).categoria) || 'No disponible'}
                              </div>
                            </td>
                            <td className="resizable-cell text-sm text-gray-900" style={getColumnStyle('subcategoria')} title={((solicitud as any).subcategoria) || 'No disponible'}>
                              <div className="cell-content">
                                {((solicitud as any).subcategoria) || 'No disponible'}
                              </div>
                            </td>
                            <td className="resizable-cell text-sm text-gray-900" style={getColumnStyle('equipos')} title={((solicitud as any).equipo) || 'No disponible'}>
                              <div className="cell-content">
                                {((solicitud as any).equipo) || 'No disponible'}
                              </div>
                            </td>
                          </>
                        )}
                        <td className="resizable-cell text-sm" style={getColumnStyle('estado')}>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium w-full justify-center ${
                            solicitud.estado === 'completada' || solicitud.estado === 'terminada' ? 'bg-green-100 text-green-700 border border-green-200' :
                            solicitud.estado === 'cancelada' ? 'bg-red-100 text-red-700 border border-red-200' :
                            solicitud.estado === 'en_proceso' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`} title={solicitud.estado || 'pendiente'}>
                            <div className="cell-content text-center">
                              {solicitud.estado || 'pendiente'}
                            </div>
                          </span>
                        </td>
                        <td className="resizable-cell text-sm font-medium" style={getColumnStyle('acciones')}>
                          <div className="flex items-center justify-center gap-1 w-full">
                            {/* Botón Ver Detalle */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-7 w-7 p-0 rounded-full flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/solicitudes/${solicitud.id}`;
                              }}
                              title="Ver detalle"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            
                            {/* Botón Cancelar - Solo mostrar si no está cancelada o completada */}
                            {solicitud.estado !== 'cancelada' && solicitud.estado !== 'completada' && solicitud.estado !== 'terminada' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 h-7 w-7 p-0 rounded-full flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmarCancelacionSolicitud(solicitud);
                                }}
                                title="Cancelar solicitud"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Controles de paginación */}
                {totalPaginas > 1 && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-700">
                      <span>
                        Mostrando {indiceInicio + 1} - {Math.min(indiceFin, filteredSolicitudes.length)} de {filteredSolicitudes.length} solicitudes
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaginaActual(1)}
                        disabled={!hayPaginaAnterior}
                        className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Primera
                      </Button>
                      
                      <Button
                        variant="default"
                        size="sm"
                        className="min-w-[2.5rem] h-10 px-4 bg-[#00B0B2] hover:bg-[#0C6659] text-white font-medium rounded-lg shadow-sm"
                      >
                        {paginaActual}
                      </Button>
                      
                      {totalPaginas > 1 && (
                        <span className="text-gray-400 text-sm px-1">...</span>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaginaActual(paginaActual + 1)}
                        disabled={!hayPaginaSiguiente}
                        className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay solicitudes</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'No se encontraron solicitudes que coincidan con tu búsqueda' : 'Aún no se han registrado solicitudes en el sistema'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal de Cancelación de Solicitud */}
      {mostrarModalCancelar && solicitudACancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-300">
            {/* Header del Modal */}
            <div className="relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 px-6 py-6">
              <div className="absolute inset-0 bg-red-600/20"></div>
              <div className="relative flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-white">Cancelar Solicitud</h3>
                  <p className="text-red-100 text-sm">Esta acción cambiará el estado de la solicitud</p>
                </div>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="px-6 py-6">
              {!cancelando && !cancelacionExitosa && (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-gray-800 text-sm mb-2">
                      ¿Estás seguro de que deseas cancelar la solicitud{' '}
                      <span className="font-semibold text-red-600">"{solicitudACancelar.asunto}"</span>?
                    </p>
                    <p className="text-gray-600 text-xs">
                      ID: {solicitudACancelar.id} • Creada: {solicitudACancelar.fecha_creacion ? new Date(solicitudACancelar.fecha_creacion).toLocaleDateString('es-CO') : 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo de cancelación <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={motivoCancelacion}
                      onChange={(e) => setMotivoCancelacion(e.target.value)}
                      placeholder="Ingrese el motivo por el cual se cancela la solicitud..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 resize-none"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Este motivo quedará registrado en el historial de la solicitud</p>
                  </div>
                </div>
              )}

              {cancelando && (
                <div className="flex flex-col items-center py-6">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-red-200 border-t-red-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-12 h-12 border-2 border-red-100 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-gray-600 mt-4 text-sm">Cancelando solicitud...</p>
                </div>
              )}

              {cancelacionExitosa && (
                <div className="flex flex-col items-center py-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">¡Solicitud Cancelada!</h4>
                  <p className="text-gray-600 text-sm text-center">
                    La solicitud ha sido cancelada correctamente
                  </p>
                </div>
              )}
            </div>

            {/* Botones del Modal */}
            {!cancelando && !cancelacionExitosa && (
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={cancelarCancelacionSolicitud}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100 px-4 py-2"
                >
                  Cerrar
                </Button>
                <Button
                  onClick={handleCancelarSolicitud}
                  disabled={!motivoCancelacion.trim()}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-4 w-4" />
                  Cancelar Solicitud
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}
