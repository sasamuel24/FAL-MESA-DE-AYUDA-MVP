"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { 
  FileText, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Tag, 
  Calendar,
  Clock,
  Download,
  Loader2,
  AlertCircle,
  Bell,
  Send
} from "lucide-react"

interface OTDetalle {
  id: number
  folio: string
  asunto: string
  etapa: string
  prioridad: string
  tecnico_asignado: string
  area_responsable: string
  tipo_mantenimiento: string
  fecha_creacion: string
  fecha_visita: string | null
  fecha_completada: string | null
  dias_desde_creacion: number
  notas: string | null
  solicitante: {
    nombre: string
    correo: string
    telefono: string
  }
  ubicacion: {
    zona: string
    ciudad: string
    tienda: string
    planta: string
    activo: string
  }
  categoria: string
  subcategoria: string
  descripcion: string
  archivo: {
    nombre: string
    url: string
    s3_key: string
  } | null
}

interface OTDetailModalProps {
  isOpen: boolean
  onClose: () => void
  otId: number | null
}

const ETAPA_COLORS: Record<string, string> = {
  "Pendiente": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "En proceso": "bg-blue-100 text-blue-800 border-blue-300",
  "Completada": "bg-green-100 text-green-800 border-green-300",
  "Terminada": "bg-green-100 text-green-800 border-green-300",
  "Cerrada": "bg-gray-100 text-gray-800 border-gray-300",
  "Cancelada": "bg-red-100 text-red-800 border-red-300"
}

const PRIORIDAD_COLORS: Record<string, string> = {
  "Baja": "bg-gray-100 text-gray-700",
  "Media": "bg-blue-100 text-blue-700",
  "Alta": "bg-orange-100 text-orange-700",
  "Crítica": "bg-red-100 text-red-700"
}

export function OTDetailModal({ isOpen, onClose, otId }: OTDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<OTDetalle | null>(null)
  
  // Estados para el envío de alerta
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [mensajeAlerta, setMensajeAlerta] = useState("")
  const [enviandoAlerta, setEnviandoAlerta] = useState(false)
  const [alertaError, setAlertaError] = useState<string | null>(null)
  const [alertaExito, setAlertaExito] = useState(false)

  useEffect(() => {
    if (isOpen && otId) {
      fetchDetalleOT()
      // Resetear estados de alerta al abrir
      setShowAlertForm(false)
      setMensajeAlerta("")
      setAlertaError(null)
      setAlertaExito(false)
    }
  }, [isOpen, otId])

  const fetchDetalleOT = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        throw new Error("No hay token de autenticación")
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FASTAPI_API_URL}/dashboard/ots/${otId}/detalle`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Error al cargar el detalle: ${response.status}`)
      }

      const data = await response.json()
      setDetalle(data.data)
    } catch (err) {
      console.error("Error al cargar detalle de OT:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return "No especificada"
    try {
      const date = new Date(fecha)
      return date.toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch {
      return "Fecha inválida"
    }
  }

  const handleDownloadFile = () => {
    if (detalle?.archivo?.url) {
      window.open(detalle.archivo.url, '_blank')
    }
  }

  const handleEnviarAlerta = async () => {
    if (!mensajeAlerta.trim()) {
      setAlertaError("Por favor ingrese un mensaje para la alerta")
      return
    }

    if (mensajeAlerta.length > 500) {
      setAlertaError("El mensaje no debe exceder 500 caracteres")
      return
    }

    setEnviandoAlerta(true)
    setAlertaError(null)

    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        throw new Error("No hay token de autenticación")
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FASTAPI_API_URL}/dashboard/ots/${otId}/enviar-alerta`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ mensaje: mensajeAlerta.trim() })
        }
      )

      const data = await response.json()

      // Verificar si es un mensaje informativo (límite diario alcanzado)
      if (data.tipo === 'info' && data.success === false) {
        // Mostrar mensaje informativo en lugar de error
        setAlertaError(data.message)
        return
      }

      if (!response.ok) {
        throw new Error(data.detail || `Error al enviar alerta: ${response.status}`)
      }

      // Éxito
      setAlertaExito(true)
      setMensajeAlerta("")
      setShowAlertForm(false)
      
      // Ocultar mensaje de éxito después de 5 segundos
      setTimeout(() => {
        setAlertaExito(false)
      }, 5000)

    } catch (err) {
      console.error("Error al enviar alerta:", err)
      setAlertaError(err instanceof Error ? err.message : "Error desconocido al enviar alerta")
    } finally {
      setEnviandoAlerta(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#00B0B2]">
            Detalle de Orden de Trabajo
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Información completa de la solicitud y su seguimiento
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#00B0B2]" />
            <span className="ml-3 text-gray-600">Cargando detalle...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!loading && !error && detalle && (
          <div className="space-y-6">
            {/* Encabezado con Folio y Estado */}
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <p className="text-sm text-gray-500">Folio</p>
                <p className="text-2xl font-bold text-gray-900">{detalle.folio}</p>
              </div>
              <div className="flex gap-2">
                <Badge className={`${ETAPA_COLORS[detalle.etapa] || 'bg-gray-100 text-gray-800'} border px-3 py-1`}>
                  {detalle.etapa}
                </Badge>
                <Badge className={PRIORIDAD_COLORS[detalle.prioridad] || 'bg-gray-100'}>
                  {detalle.prioridad}
                </Badge>
              </div>
            </div>

            {/* Información General */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#00B0B2]" />
                Información General
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Asunto</p>
                  <p className="text-base font-medium text-gray-900">{detalle.asunto}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Técnico Asignado</p>
                    <p className="text-base text-gray-900">{detalle.tecnico_asignado}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Área Responsable</p>
                    <p className="text-base text-gray-900">{detalle.area_responsable}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Datos del Solicitante */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-[#00B0B2]" />
                Datos del Solicitante
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Nombre</p>
                    <p className="text-base font-medium text-gray-900">{detalle.solicitante.nombre}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Email</p>
                    <p className="text-base text-gray-900 break-all">{detalle.solicitante.correo}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Teléfono</p>
                    <p className="text-base text-gray-900">{detalle.solicitante.telefono}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ubicación - Adaptativa según área */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#00B0B2]" />
                {detalle.area_responsable === "Mantenimiento Planta" ? "Área y Activo" : "Ubicación"}
              </h3>
              {detalle.area_responsable === "Mantenimiento Planta" ? (
                // Vista para Mantenimiento Planta
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Planta</p>
                    <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#00B0B2]" />
                      {detalle.ubicacion.planta || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Activo</p>
                    <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-[#00B0B2]" />
                      {detalle.ubicacion.activo || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Ciudad</p>
                    <p className="text-base text-gray-900">{detalle.ubicacion.ciudad}</p>
                  </div>
                </div>
              ) : (
                // Vista para otras áreas (Zona, Ciudad, Tienda)
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Zona</p>
                    <p className="text-base font-semibold text-gray-900">{detalle.ubicacion.zona}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Ciudad</p>
                    <p className="text-base text-gray-900">{detalle.ubicacion.ciudad}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Tienda</p>
                    <p className="text-base text-gray-900">{detalle.ubicacion.tienda}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Categorización */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="h-5 w-5 text-[#00B0B2]" />
                Categorización
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Categoría</p>
                  <p className="text-base font-semibold text-gray-900">{detalle.categoria}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Subcategoría</p>
                  <p className="text-base text-gray-900">{detalle.subcategoria}</p>
                </div>
              </div>
            </div>

            {/* Descripción del Problema */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[#00B0B2]" />
                Descripción del Problema
              </h3>
              <p className="text-base text-gray-900 whitespace-pre-wrap leading-relaxed">{detalle.descripcion}</p>
            </div>

            {/* Fechas */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#00B0B2]" />
                Fechas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Fecha de Creación</p>
                  <p className="text-base text-gray-900">{formatFecha(detalle.fecha_creacion)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Días Transcurridos</p>
                  <p className="text-base font-semibold text-gray-900 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {detalle.dias_desde_creacion} días
                  </p>
                </div>
                {detalle.fecha_visita && (
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Fecha de Visita</p>
                    <p className="text-base text-gray-900">{formatFecha(detalle.fecha_visita)}</p>
                  </div>
                )}
                {detalle.fecha_completada && (
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Fecha de Completado</p>
                    <p className="text-base text-gray-900">{formatFecha(detalle.fecha_completada)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Archivo Adjunto */}
            {detalle.archivo && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#00B0B2]" />
                  Archivo Adjunto
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Archivo original de la solicitud</p>
                    <p className="text-base font-medium text-gray-900">{detalle.archivo.nombre}</p>
                  </div>
                  <Button
                    onClick={handleDownloadFile}
                    className="bg-[#00B0B2] hover:bg-[#008a8c] text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </div>
            )}

            {/* Notas Adicionales */}
            {detalle.notas && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Notas Adicionales</h3>
                <p className="text-base text-gray-900 whitespace-pre-wrap leading-relaxed">{detalle.notas}</p>
              </div>
            )}

            {/* Sección de Alerta al Técnico */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-5 border border-orange-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-600" />
                  Enviar Alerta al Técnico
                </h3>
                {!showAlertForm && (
                  <Button
                    onClick={() => setShowAlertForm(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    size="sm"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Nueva Alerta
                  </Button>
                )}
              </div>

              {alertaExito && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-green-800 font-medium">
                    ✓ Alerta enviada exitosamente al técnico {detalle.tecnico_asignado}
                  </p>
                </div>
              )}

              {showAlertForm && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Mensaje personalizado para {detalle.tecnico_asignado}
                    </label>
                    <Textarea
                      value={mensajeAlerta}
                      onChange={(e) => setMensajeAlerta(e.target.value)}
                      placeholder="Escriba un mensaje urgente para el técnico (máx. 500 caracteres)..."
                      className="min-h-[100px] border-orange-200 focus:border-orange-400 focus:ring-orange-400"
                      maxLength={500}
                      disabled={enviandoAlerta}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {mensajeAlerta.length}/500 caracteres
                    </p>
                  </div>

                  {alertaError && (
                    <div className={`flex items-start gap-2 p-3 rounded-lg border ${
                      alertaError.includes('espera hasta mañana') || alertaError.includes('Ya se envió una alerta hoy')
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <AlertCircle className={`h-4 w-4 flex-shrink-0 ${
                        alertaError.includes('espera hasta mañana') || alertaError.includes('Ya se envió una alerta hoy')
                          ? 'text-blue-600'
                          : 'text-red-600'
                      }`} />
                      <div className="flex-1">
                        <p className={`text-sm font-semibold mb-1 ${
                          alertaError.includes('espera hasta mañana') || alertaError.includes('Ya se envió una alerta hoy')
                            ? 'text-blue-800'
                            : 'text-red-800'
                        }`}>
                          {alertaError.includes('espera hasta mañana') || alertaError.includes('Ya se envió una alerta hoy')
                            ? '📅 Límite diario alcanzado'
                            : 'Error'
                          }
                        </p>
                        <p className={`text-sm ${
                          alertaError.includes('espera hasta mañana') || alertaError.includes('Ya se envió una alerta hoy')
                            ? 'text-blue-700'
                            : 'text-red-700'
                        }`}>{alertaError}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleEnviarAlerta}
                      disabled={enviandoAlerta || !mensajeAlerta.trim()}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {enviandoAlerta ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Alerta
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAlertForm(false)
                        setMensajeAlerta("")
                        setAlertaError(null)
                      }}
                      variant="outline"
                      disabled={enviandoAlerta}
                    >
                      Cancelar
                    </Button>
                  </div>

                  <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="font-medium mb-1">Límite de alertas:</p>
                    <p>Solo se puede enviar 1 alerta por día para esta orden de trabajo.</p>
                  </div>
                </div>
              )}

              {!showAlertForm && !alertaExito && (
                <p className="text-sm text-gray-600">
                  Envíe una notificación urgente por correo electrónico al técnico asignado.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer con botón de cerrar */}
        <div className="flex justify-end pt-4 border-t mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-300"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
