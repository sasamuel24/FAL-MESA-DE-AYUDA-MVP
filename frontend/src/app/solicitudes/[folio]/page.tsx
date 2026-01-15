
"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "../../../lib/auth_context"
import { formatColombiaDateTime } from "@/lib/date-utils"
import {
  User,
  Building2,
  Users,
  Activity,
  FileText,
  ClipboardList,
  ImageIcon,
  Eye,
  Loader,
  X,
  Settings,
  LogOut,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useParams, useRouter } from "next/navigation"

// Configuración de FastAPI únicamente
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'https://b4phy0y28i.execute-api.us-east-2.amazonaws.com/v1';

interface Solicitud {
  id: number
  nombre: string
  correo: string
  telefono?: string
  asunto: string
  descripcion: string
  zona?: string
  ciudad?: string
  tienda?: string
  categoria?: string
  subcategoria?: string
  equipo?: string
  planta?: string
  activo?: string
  archivo_nombre?: string
  archivo_url?: string
  estado?: string
  motivo_cancelacion?: string
  fecha_creacion: string
  fecha_actualizacion?: string
}

export default function DetalleSolicitud() {
  const params = useParams();
  const router = useRouter();
  const folio = params?.folio as string || "";
  const { user, logout } = useAuth();
  
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [folioOT, setFolioOT] = useState<number | null>(null);
  const [loadingOT, setLoadingOT] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Detectar si estamos en el cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Cargar datos de la solicitud
  useEffect(() => {
    console.log('🔍 Iniciando carga de solicitud para folio:', folio);
    
    const cargarSolicitud = async () => {
      try {
        setLoading(true);
        setError('');
        console.log('🔄 Comenzando carga de solicitud...');
        
        console.log("🚀 Cargando solicitud desde FastAPI...");
        const response = await fetch(`${FASTAPI_BASE_URL}/solicitudes/${folio}`);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Solicitud recibida desde FastAPI:', result);
          
          if (result.success && result.data) {
            console.log('📁 Datos de solicitud FastAPI:', result.data);
            console.log('📎 URL del archivo:', result.data.archivo_url);
            console.log('📄 Nombre del archivo:', result.data.archivo_nombre);
            setSolicitud(result.data);
            
            // Después de cargar la solicitud, intentar cargar el folio de la OT
            cargarFolioOT(folio);
            console.log('✅ Solicitud cargada exitosamente desde FastAPI');
          } else {
            throw new Error(result.message || 'Error al cargar solicitud');
          }
        } else {
          throw new Error(`Error del servidor: ${response.status}`);
        }
        
      } catch (error) {
        console.error('❌ Error al cargar solicitud:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar la solicitud';
        console.error('📋 Detalles del error:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
        console.log('🏁 Proceso de carga completado');
      }
    };

    if (folio) {
      cargarSolicitud();
    }
  }, [folio]);

  // Función para cargar el folio de la OT asociada a esta solicitud
  const cargarFolioOT = async (solicitudId: string) => {
    try {
      setLoadingOT(true);
      
      console.log("🚀 Cargando folio OT desde FastAPI...");
      const response = await fetch(`${FASTAPI_BASE_URL}/ots/by-solicitud/${solicitudId}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setFolioOT(result.data.folio);
          console.log('📋 Folio de OT cargado desde FastAPI:', result.data.folio);
        }
      } else {
        // Si no hay OT, es normal, no es un error
        console.log('ℹ️ No hay OT creada para esta solicitud aún');
      }
      
    } catch (error) {
      console.log('ℹ️ No se pudo cargar folio OT, probablemente no existe aún');
    } finally {
      setLoadingOT(false);
    }
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return 'N/A';
    
    // Usar la utilidad centralizada de formateo de fechas
    // Equivalente a format_colombia_datetime() del backend
    return formatColombiaDateTime(fecha, 'default');
  }

  // Función para detectar el origen de la solicitud
  const detectarOrigen = (solicitud: Solicitud) => {
    const tieneePlantaYActivo = solicitud.planta && solicitud.activo;
    const tieneCategoriaYSubcategoria = solicitud.categoria && solicitud.subcategoria;
    const tieneEquipo = solicitud.equipo;
    
    if (tieneePlantaYActivo) {
      return 'planta-activo';
    } else if (tieneCategoriaYSubcategoria || tieneEquipo) {
      return 'categoria-subcategoria';
    } else {
      return 'sin-origen';
    }
  }

  // Función para renderizar los campos dinámicamente según el origen
  const renderizarCamposEspecificos = (solicitud: Solicitud, origen: string) => {
    if (origen === 'planta-activo') {
      return (
        <>
          <div><span className="font-semibold text-gray-700">Planta:</span> <span className="text-gray-600">{solicitud.planta}</span></div>
          <div><span className="font-semibold text-gray-700">Activo:</span> <span className="text-gray-600">{solicitud.activo}</span></div>
        </>
      );
    } else if (origen === 'categoria-subcategoria') {
      return (
        <>
          <div><span className="font-semibold text-gray-700">Categoría:</span> <span className="text-gray-600 capitalize">{solicitud.categoria}</span></div>
          <div><span className="font-semibold text-gray-700">Subcategoría:</span> <span className="text-gray-600">{solicitud.subcategoria}</span></div>
          {solicitud.equipo && (
            <div><span className="font-semibold text-gray-700">Equipo:</span> <span className="text-gray-600">{solicitud.equipo}</span></div>
          )}
        </>
      );
    } else {
      return (
        <div className="col-span-2 text-center py-4">
          <span className="text-gray-500 italic">Información no disponible</span>
        </div>
      );
    }
  }

  const abrirImagen = (url: string) => {
    console.log('🔗 Abriendo archivo:', url);
    
    // Verificar si es una imagen para mostrar en modal o abrir en nueva ventana
    const fileName = url.split('/').pop() || '';
    const isImage = fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/);
    
    if (isImage) {
      setSelectedImage(url);
    } else {
      // Para PDFs y otros archivos, abrir en nueva ventana
      window.open(url, '_blank');
    }
  }

  const cerrarImagen = () => {
    setSelectedImage(null)
  }

  const navigationItems = [
    { name: "ORGANIZACIONES", icon: Settings, href: "/organizaciones" },
    { name: "OTS", icon: ClipboardList, href: "/ots" },
    { name: "SOLICITUDES", icon: FileText, href: "/solicitudes" },
  ]

  const handleNavigation = (href: string) => {
    console.log(`🧭 Navegando a: ${href}`);
    try {
      router.push(href);
    } catch (error) {
      console.error('❌ Error al navegar:', error);
    }
  }

  const handleLogout = () => {
    console.log('🚪 Cerrando sesión...');
    logout();
  }

  return (
    <div
      className="min-h-screen text-foreground bg-gray-50"
      style={{
        backgroundImage: "url('/images/cq2.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "50% 70%",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
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
                <div className="flex items-center">
                  <a href="/dashboard">
                    <img
                      src="/images/logo.png"
                      alt="Logo"
                      className="h-12 w-auto object-contain cursor-pointer"
                    />
                  </a>
                </div>
              </div>
              {/* Navigation Menu - Desktop */}
              <nav className="hidden md:block">
                <div className="ml-30 flex items-baseline space-x-4">
                  {navigationItems.map((item) => (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className={`text-white hover:bg-white/20 px-3 py-2 text-sm font-medium ${
                        item.name === "SOLICITUDES" ? "bg-white/30" : ""
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

              {/* Navigation Menu - Mobile */}
              <nav className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="text-white hover:bg-white/20 p-2"
                    >
                      <Settings className="h-5 w-5" style={{ color: "#333231" }} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-white text-gray-800 shadow-lg rounded-md border border-gray-200"
                  >
                    {navigationItems.map((item) => (
                      <DropdownMenuItem 
                        key={item.name}
                        onClick={() => handleNavigation(item.href)} 
                        className="py-3 px-4 hover:bg-gray-100 cursor-pointer"
                      >
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
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
                      <div className="text-sm text-gray-500 break-words word-wrap overflow-wrap-anywhere max-w-full">{isClient && user ? user.email : ''}</div>
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

        {/* Título y acciones */}
        <main className="w-full max-w-4xl mx-auto px-4 py-6">
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader className="w-8 h-8 animate-spin text-[#00B0B2]" />
              <span className="ml-2 text-gray-600">Cargando solicitud...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <h2 className="text-xl font-bold text-red-800 mb-2">Error al cargar solicitud</h2>
              <p className="text-red-600">{error}</p>
              <Button 
                onClick={() => window.location.href = '/solicitudes'}
                className="mt-4 bg-[#00B0B2] hover:bg-[#0C6659] text-white"
              >
                Volver a solicitudes
              </Button>
            </div>
          ) : solicitud ? (
            <>
              <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 md:mb-0">
                  {solicitud.asunto} - {folioOT ? `Folio-${folioOT}` : loadingOT ? 'Cargando folio...' : `ID: ${solicitud.id}`}
                </h1>
                <div className="flex gap-2">
                  <Button 
                    className="bg-white border border-[#00B0B2] text-black hover:bg-[#e6f7f7] px-4 py-2 rounded-md text-sm font-semibold transition-colors"
                    onClick={() => window.location.href = '/solicitudes'}
                  >
                    ← Volver a solicitudes
                  </Button>
                  {/* Solo mostrar el botón "Generar OT" si NO existe un folio de OT y la solicitud NO está cancelada */}
                  {!folioOT && !loadingOT && (
                    solicitud.estado === 'cancelada' ? (
                      <Button 
                        disabled
                        className="bg-gray-400 border border-gray-400 text-gray-600 px-4 py-2 rounded-md text-sm font-semibold cursor-not-allowed opacity-50"
                        title="No se puede generar OT para solicitudes canceladas"
                      >
                        Generar OT (Bloqueado)
                      </Button>
                    ) : (
                      <Button 
                        className="bg-[#00B0B2] border border-[#00B0B2] text-white hover:bg-[#0C6659] px-4 py-2 rounded-md text-sm font-semibold transition-colors"
                        onClick={() => window.location.href = `/solicitudes/${folio}/generar-ot`}
                      >
                        Generar OT
                      </Button>
                    )
                  )}
                  {/* Mostrar indicador cuando ya existe una OT */}
                  {folioOT && (
                    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      OT ya generada: Folio-{folioOT}
                    </div>
                  )}
                </div>
              </div>

              {/* Información General */}
              <section className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#00B0B2]" />
                  Información General
                </h2>
                {(() => {
                  const origen = detectarOrigen(solicitud);
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div><span className="font-semibold text-gray-700">Nombre del solicitante:</span> <span className="text-gray-600">{solicitud.nombre}</span></div>
                        <div><span className="font-semibold text-gray-700">Email:</span> <span className="text-gray-600">{solicitud.correo}</span></div>
                        {solicitud.telefono && (
                          <div><span className="font-semibold text-gray-700">Teléfono:</span> <span className="text-gray-600">{solicitud.telefono}</span></div>
                        )}
                        <div><span className="font-semibold text-gray-700">Fecha de creación:</span> <span className="text-gray-600">{formatFecha(solicitud.fecha_creacion)}</span></div>
                        
                        {/* Campos dinámicos específicos del origen - Primera columna */}
                        {origen === 'planta-activo' && (
                          <>
                            <div><span className="font-semibold text-gray-700">Planta:</span> <span className="text-gray-600">{solicitud.planta}</span></div>
                            <div><span className="font-semibold text-gray-700">Activo:</span> <span className="text-gray-600">{solicitud.activo}</span></div>
                          </>
                        )}
                        {origen === 'categoria-subcategoria' && (
                          <>
                            <div><span className="font-semibold text-gray-700">Categoría:</span> <span className="text-gray-600 capitalize">{solicitud.categoria}</span></div>
                            <div><span className="font-semibold text-gray-700">Subcategoría:</span> <span className="text-gray-600">{solicitud.subcategoria}</span></div>
                            {solicitud.equipo && (
                              <div><span className="font-semibold text-gray-700">Equipo:</span> <span className="text-gray-600">{solicitud.equipo}</span></div>
                            )}
                          </>
                        )}
                        
                        {/* Campos adicionales existentes - Solo si corresponden */}
                        {solicitud.zona && (
                          <div><span className="font-semibold text-gray-700">Zona:</span> <span className="text-gray-600 capitalize">{solicitud.zona}</span></div>
                        )}
                        {solicitud.ciudad && (
                          <div><span className="font-semibold text-gray-700">Ciudad:</span> <span className="text-gray-600 capitalize">{solicitud.ciudad}</span></div>
                        )}
                        {solicitud.tienda && (
                          <div><span className="font-semibold text-gray-700">Tienda:</span> <span className="text-gray-600">{solicitud.tienda}</span></div>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div><span className="font-semibold text-gray-700">Estado:</span> 
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                            solicitud.estado === 'completada' || solicitud.estado === 'terminada' ? 'bg-green-100 text-green-700 border border-green-200' :
                            solicitud.estado === 'cancelada' ? 'bg-red-100 text-red-700 border border-red-200' :
                            solicitud.estado === 'en_proceso' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {solicitud.estado || 'pendiente'}
                          </span>
                        </div>
                        <div><span className="font-semibold text-gray-700">Folio OT:</span> <span className="text-[#00B0B2] font-medium">{folioOT ? `Folio-${folioOT}` : loadingOT ? 'Cargando...' : 'Sin OT'}</span></div>
                        
                        {/* Mensaje para solicitudes sin origen identificable */}
                        {origen === 'sin-origen' && (
                          <div className="col-span-2 text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="text-gray-500 italic">
                              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                              <p>Información no disponible</p>
                              <p className="text-xs mt-1">Los campos específicos del origen no están definidos</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                
                {/* Descripción */}
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-700 mb-2">Descripción del problema:</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <p className="text-gray-700 leading-relaxed">{solicitud.descripcion}</p>
                  </div>
                </div>

                {/* Motivo de Cancelación - Solo mostrar si la solicitud está cancelada */}
                {solicitud.estado === 'cancelada' && solicitud.motivo_cancelacion && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                      <X className="w-4 h-4" />
                      Motivo de Cancelación:
                    </h3>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-red-800 leading-relaxed">{solicitud.motivo_cancelacion}</p>
                    </div>
                  </div>
                )}
              </section>

              {/* Archivos Adjuntos */}
              <section className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#00B0B2]" />
                  Archivos Adjuntos
                </h2>
                
                {solicitud.archivo_url ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">Nombre del Archivo</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">Adjuntado por</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">Fecha de creación</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-[#00B0B2]" />
                                <span className="text-[#00B0B2] font-medium">{solicitud.archivo_nombre}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{solicitud.nombre}</td>
                            <td className="px-4 py-3 text-gray-600">{formatFecha(solicitud.fecha_creacion)}</td>
                            <td className="px-4 py-3">
                              <Button
                                onClick={(e) => {
                                  e.preventDefault();
                                  console.log('🖱️ Botón Ver clickeado - URL:', solicitud.archivo_url);
                                  abrirImagen(solicitud.archivo_url!);
                                }}
                                size="sm"
                                className="bg-[#00B0B2] hover:bg-[#0C6659] text-white"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Preview de la imagen - solo para imágenes */}
                    {solicitud.archivo_url && solicitud.archivo_nombre && (
                      solicitud.archivo_nombre.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-medium text-gray-700 mb-3">Vista previa:</h3>
                          <div className="flex justify-center">
                            <img
                              src={solicitud.archivo_url}
                              alt={`Imagen de la solicitud ${solicitud.id}`}
                              className="max-w-md max-h-64 object-contain rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow border"
                              onClick={() => abrirImagen(solicitud.archivo_url!)}
                              onError={(e) => {
                                console.error('❌ Error al cargar imagen:', solicitud.archivo_url);
                                console.error('❌ Error details:', e);
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = `
                                  <div class="text-red-600 text-center p-4">
                                    <p>Error al cargar la imagen</p>
                                    <p class="text-sm">URL: ${solicitud.archivo_url}</p>
                                    <button onclick="window.open('${solicitud.archivo_url}', '_blank')" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
                                      Abrir enlace directo
                                    </button>
                                  </div>
                                `;
                              }}
                              onLoad={() => {
                                console.log('✅ Imagen cargada correctamente:', solicitud.archivo_url);
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-medium text-gray-700 mb-3">Archivo adjunto:</h3>
                          <p className="text-sm text-gray-600">
                            Este tipo de archivo no se puede previsualizar. Use el botón "Ver" para abrirlo.
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500">No hay archivos adjuntos en esta solicitud</p>
                  </div>
                )}
              </section>

              {/* Modal para ver imagen completa */}
              {selectedImage && (
                <div 
                  className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                  onClick={cerrarImagen}
                >
                  <div className="relative max-w-5xl max-h-full">
                    <img
                      src={selectedImage}
                      alt="Imagen ampliada"
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                    <Button
                      onClick={cerrarImagen}
                      className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white"
                      size="sm"
                    >
                      ✕ Cerrar
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </main>
      </div>
    </div>
  )
}
