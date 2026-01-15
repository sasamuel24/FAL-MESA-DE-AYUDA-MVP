"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  User,
  ClipboardList,
  CheckCircle2,
  Loader,
  ImageIcon,
  FileText,
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
import { useAuth } from "../../../../lib/auth_context"

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
  archivo?: string
  archivo_url?: string
  fecha_creacion: string
  fecha_actualizacion?: string
}

interface Tecnico {
  id: number
  nombre: string
  email: string
  area: string
  rol: string
}

export default function GenerarOT() {
  const params = useParams()
  const folio = Array.isArray(params.folio) ? params.folio[0] : params.folio
  const router = useRouter()
  const { user, logout, token } = useAuth()
  const [isClient, setIsClient] = useState(false)

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState("")
  const [prioridad, setPrioridad] = useState("media")
  const [notas, setNotas] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Efecto para seguridad de hidratación
  useEffect(() => {
    setIsClient(true)
  }, [])

  const formatFecha = (fechaStr: string) => {
    if (!fechaStr) return 'Fecha no disponible'
    
    try {
      const fecha = new Date(fechaStr)
      if (isNaN(fecha.getTime())) {
        return 'Fecha inválida'
      }
      
      return fecha.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Fecha inválida'
    }
  }

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true)
        
        console.log('🚀 Cargando datos desde FastAPI...');
        
        // Variables para almacenar datos temporalmente
        let solicitudCargada = null;
        
        // Cargar solicitud
        const resSolicitud = await fetch(`${FASTAPI_BASE_URL}/solicitudes/${folio}`)
        if (resSolicitud.ok) {
          const dataSolicitud = await resSolicitud.json()
          solicitudCargada = dataSolicitud.data || null;
          setSolicitud(solicitudCargada)
          console.log('✅ Solicitud cargada desde FastAPI');
        } else {
          throw new Error('Error al cargar la solicitud')
        }

        // Cargar técnicos con autenticación
        console.log('🔐 Token disponible:', token ? 'SÍ' : 'NO');
        console.log('👤 Usuario actual:', user?.email, user?.rol);
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('✅ Headers con autorización configurados');
        } else {
          console.warn('⚠️ Token no disponible - puede causar error 403');
        }

        console.log('🔗 Llamando endpoint:', `${FASTAPI_BASE_URL}/users/tecnicos`);
        const resTecnicos = await fetch(`${FASTAPI_BASE_URL}/users/tecnicos`, {
          headers
        })
        console.log('📡 Respuesta técnicos status:', resTecnicos.status);
        if (resTecnicos.ok) {
          const dataTecnicos = await resTecnicos.json()
          console.log('📊 Respuesta técnicos raw:', dataTecnicos);
          let tecnicosData = dataTecnicos.data || []
          console.log('👥 Técnicos extraídos:', tecnicosData);
          
          // 🎯 FILTRAR TÉCNICOS PARA PLANTA SAN PEDRO
          // Si la solicitud es de Planta San Pedro, mostrar técnicos de áreas relevantes
          if (solicitudCargada?.zona === 'Planta San Pedro') {
            const tecnicosOriginales = tecnicosData.length;
            tecnicosData = tecnicosData.filter((tecnico: Tecnico) => 
              tecnico.area && (
                tecnico.area.toLowerCase().includes('mantenimiento') ||
                tecnico.area.toLowerCase().includes('planta') ||
                tecnico.area.toLowerCase().includes('tic') ||  // TIC puede manejar solicitudes de planta
                tecnico.area.toLowerCase().includes('soporte')
              )
            )
            console.log(`🏭 Filtrado aplicado para Planta San Pedro: ${tecnicosOriginales} -> ${tecnicosData.length} técnicos de áreas relevantes (Mantenimiento/Planta/TIC/Soporte)`);
          } else {
            console.log(`🏪 Solicitud de Tiendas - mostrando todos los técnicos: ${tecnicosData.length}`);
          }
          
          console.log('🔄 A punto de establecer técnicos en el estado:', tecnicosData);
          setTecnicos(tecnicosData)
          console.log('✅ Técnicos cargados desde FastAPI con filtrado por área');
        } else {
          console.error('❌ Error en respuesta de técnicos:', resTecnicos.status, resTecnicos.statusText);
          const errorText = await resTecnicos.text();
          console.error('📄 Texto de error:', errorText);
          throw new Error(`Error al cargar técnicos: ${resTecnicos.status} ${resTecnicos.statusText}`)
        }

      } catch (err) {
        console.error('💥 Error en cargarDatos:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    if (folio) {
      cargarDatos()
    }
  }, [folio, token])

  const handleAsignarTecnico = async () => {
    if (!tecnicoSeleccionado || !solicitud) {
      return
    }

    try {
      const tecnico = tecnicos.find(t => t.id.toString() === tecnicoSeleccionado)
      if (!tecnico) {
        throw new Error('Técnico no encontrado')
      }

      const requestBody = {
        solicitud_id: solicitud.id,
        tecnico_asignado: tecnico.nombre,
        tecnico_email: tecnico.email,
        prioridad,
        notas,
        estado: 'pendiente'
      };

      console.log('� Creando OT con FastAPI...');
      const response = await fetch(`${FASTAPI_BASE_URL}/ots/crear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        console.log('✅ OT creada exitosamente con FastAPI');
        setShowConfirmation(true);
      } else {
        throw new Error('Error al crear la OT');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar técnico')
    }
  }

  const handleConfirmationClose = () => {
    setShowConfirmation(false)
    window.location.href = '/ots'
  }

  const navigationItems = [
    { name: "ORGANIZACIONES", icon: Settings, href: "/organizaciones" },
    { name: "OTS", icon: ClipboardList, href: "/ots" },
    { name: "SOLICITUDES", icon: FileText, href: "/solicitudes" },
  ]

  const handleNavigation = (href: string) => {
    window.location.href = href
  }

  // Log para debug del estado actual
  console.log('🎯 Estado actual del componente:');
  console.log('  - Loading:', loading);
  console.log('  - Error:', error);
  console.log('  - Técnicos array length:', tecnicos.length);
  console.log('  - Técnicos array:', tecnicos);
  console.log('  - Solicitud:', solicitud?.id);

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
        <header
          className="shadow-lg border-b"
          style={{ backgroundColor: "#00B0B2", borderColor: "#00B0B2" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
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
              <nav className="hidden md:block">
                <div className="ml-30 flex items-baseline space-x-4">
                  {navigationItems.map((item) => (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className="text-white hover:bg-white/20 px-3 py-2 text-sm font-medium"
                      onClick={() => handleNavigation(item.href)}
                    >
                      <item.icon className="w-4 h-4 mr-2" style={{ color: "#333231" }} />
                      {item.name}
                    </Button>
                  ))}
                </div>
              </nav>
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
                    <DropdownMenuItem onClick={logout} className="py-3 px-4 hover:bg-gray-100 text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full max-w-2xl mx-auto px-4 py-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader className="w-8 h-8 animate-spin text-[#00B0B2]" />
              <span className="ml-2 text-gray-600">Cargando datos de la solicitud...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <h2 className="text-xl font-bold text-red-800 mb-2">Error al cargar datos</h2>
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
              <div className="mb-4 flex flex-col">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
                  Generar OT - {solicitud.asunto}
                </h1>
                <p className="text-gray-600">Folio: {folio}</p>
              </div>

              <section className="bg-white rounded-lg shadow p-6 mb-4 border">
                <h2 className="font-semibold text-gray-700 mb-4">Información Básica</h2>
                <div className="flex flex-col gap-3 text-sm">
                  <div><span className="font-semibold">Descripción:</span> {solicitud.descripcion}</div>
                  <div><span className="font-semibold">Zona:</span> {solicitud.zona || 'No especificada'}</div>
                  <div><span className="font-semibold">Ciudad:</span> {solicitud.ciudad || 'No especificada'}</div>
                  <div><span className="font-semibold">Tienda:</span> {solicitud.tienda || 'No especificada'}</div>
                  <div><span className="font-semibold">Categoría:</span> {solicitud.categoria || 'No especificada'}</div>
                  <div><span className="font-semibold">Subcategoría:</span> {solicitud.subcategoria || 'No especificada'}</div>
                  {solicitud.equipo && (
                    <div><span className="font-semibold">Equipo:</span> {solicitud.equipo}</div>
                  )}
                  <div><span className="font-semibold">Solicitante:</span> {solicitud.nombre}</div>
                  <div><span className="font-semibold">Email:</span> {solicitud.correo}</div>
                  {solicitud.telefono && (
                    <div><span className="font-semibold">Teléfono:</span> {solicitud.telefono}</div>
                  )}
                  <div><span className="font-semibold">Fecha de creación:</span> {formatFecha(solicitud.fecha_creacion)}</div>
                </div>
              </section>

              <section className="bg-white rounded-lg shadow p-6 mb-4 border">
                <h2 className="font-semibold text-gray-700 mb-4">Archivos Adjuntos</h2>
                
                {solicitud.archivo_url ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">Nombre del Archivo</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">Adjuntado por</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">Fecha de creación</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-[#00B0B2]" />
                                <span className="text-[#00B0B2] font-medium">{solicitud.archivo}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{solicitud.nombre}</td>
                            <td className="px-4 py-3 text-gray-600">{formatFecha(solicitud.fecha_creacion)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-700 mb-3">Vista previa:</h3>
                      <div className="flex justify-center">
                        <img
                          src={solicitud.archivo_url}
                          alt={`Imagen de la solicitud ${solicitud.id}`}
                          className="max-w-md max-h-64 object-contain rounded-lg shadow-md border"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500">No hay archivos adjuntos en esta solicitud</p>
                  </div>
                )}
              </section>

              <section className="bg-white rounded-lg shadow p-6 border">
                <h2 className="font-semibold text-gray-700 mb-4">Asignación de Técnico</h2>
                
                <div className="mb-5">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Seleccione un Técnico:
                  </label>
                  <select 
                    value={tecnicoSeleccionado}
                    onChange={(e) => setTecnicoSeleccionado(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00B0B2] focus:border-transparent"
                  >
                    <option value="">-- Seleccione un técnico --</option>
                    {tecnicos.map((tecnico) => (
                      <option key={tecnico.id} value={tecnico.id}>
                        {tecnico.nombre} - {tecnico.area}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-5">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Prioridad:
                  </label>
                  <select 
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00B0B2] focus:border-transparent"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>

                <div className="mb-5">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Notas adicionales (opcional):
                  </label>
                  <textarea 
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={3}
                    placeholder="Instrucciones específicas para el técnico..."
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00B0B2] focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    className="bg-gray-200 text-gray-700 hover:bg-gray-300 px-4 py-2 rounded-md"
                    onClick={() => window.location.href = `/solicitudes/${folio}`}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    className="bg-[#00B0B2] text-white hover:bg-[#009fa0] px-4 py-2 rounded-md"
                    onClick={handleAsignarTecnico}
                    disabled={!tecnicoSeleccionado}
                  >
                    Asignar Técnico y Generar OT
                  </Button>
                </div>
              </section>
            </>
          ) : null}

          {showConfirmation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 overflow-hidden">
                <div className="bg-[#00B0B2]/10 p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#00B0B2]/20 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-[#00B0B2]" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">¡Asignación Exitosa!</h3>
                  <p className="text-sm text-gray-600">Se ha generado una nueva Orden de Trabajo</p>
                </div>
                <div className="p-4 bg-gray-50">
                  <Button 
                    onClick={handleConfirmationClose}
                    className="w-full bg-[#00B0B2] text-white hover:bg-[#009fa0] py-2 rounded-md"
                  >
                    Ir a OTS
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
