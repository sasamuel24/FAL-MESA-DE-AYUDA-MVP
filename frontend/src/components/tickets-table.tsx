"use client"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Building2, Tag } from "lucide-react"
import { OTDetailModal } from "@/components/ot-detail-modal"

interface Ticket {
  id: number
  folio: string
  asunto: string
  zona: string
  ciudad: string
  tienda: string
  categoria: string
  etapa: string
  prioridad: string
  tecnico_asignado: string
  area_responsable: string
  fecha_creacion: string
  dias_desde_creacion: number
  // Campos específicos de planta
  planta?: string
  activo?: string
}

interface TicketsTableProps {
  tickets: Ticket[]
  areaFiltrada?: string  // Para saber si se está filtrando por Mantenimiento Planta
}

const ETAPA_COLORS: Record<string, string> = {
  "Pendiente": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "En proceso": "bg-blue-100 text-blue-800 border-blue-300",
  "Completada": "bg-green-100 text-green-800 border-green-300",
  "Cerrada": "bg-gray-100 text-gray-800 border-gray-300",
  "Cancelada": "bg-red-100 text-red-800 border-red-300"
}

const PRIORIDAD_COLORS: Record<string, string> = {
  "Baja": "bg-gray-100 text-gray-700",
  "Media": "bg-blue-100 text-blue-700",
  "Alta": "bg-orange-100 text-orange-700",
  "Crítica": "bg-red-100 text-red-700"
}

export function TicketsTable({ tickets, areaFiltrada }: TicketsTableProps) {
  const [selectedOtId, setSelectedOtId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Determinar si estamos en modo Mantenimiento Planta
  const esMantenimientoPlanta = areaFiltrada === "Mantenimiento Planta"

  const handleRowClick = (ticketId: number) => {
    setSelectedOtId(ticketId)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedOtId(null)
  }

  const formatFecha = (fecha: string) => {
    try {
      const date = new Date(fecha)
      return date.toLocaleDateString("es-MX", {
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    } catch {
      return "N/A"
    }
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white/90 rounded-lg shadow-md p-12">
        <div className="text-center text-gray-600">
          <p className="text-lg font-medium">No se encontraron tickets</p>
          <p className="text-sm mt-2">Intenta ajustar los filtros de búsqueda</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/90 rounded-lg shadow-md overflow-hidden">
      {/* Contenedor principal con altura fija y scroll siempre visible */}
      <style jsx>{`
        .scroll-container::-webkit-scrollbar {
          width: 14px;
          height: 14px;
        }
        .scroll-container::-webkit-scrollbar-track {
          background: #f3f4f6;
        }
        .scroll-container::-webkit-scrollbar-thumb {
          background: #9ca3af;
          border-radius: 7px;
          border: 2px solid #f3f4f6;
        }
        .scroll-container::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
        .scroll-container::-webkit-scrollbar-corner {
          background: #f3f4f6;
        }
      `}</style>
      <div 
        className="scroll-container overflow-scroll"
        style={{
          maxHeight: '600px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#9ca3af #f3f4f6'
        }}
      >
        <table className="w-full" style={{ minWidth: '1400px' }}>
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            <tr className="border-b-2 border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 whitespace-nowrap">
                Folio
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50" style={{ minWidth: '250px' }}>
                Asunto
              </th>
              
              {/* Columnas adaptativas según área */}
              {esMantenimientoPlanta ? (
                <>
                  {/* Columnas específicas para Mantenimiento Planta */}
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50" style={{ minWidth: '150px' }}>
                    Área
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50" style={{ minWidth: '150px' }}>
                    Activo
                  </th>
                </>
              ) : (
                <>
                  {/* Columnas estándar para otras áreas */}
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50" style={{ minWidth: '180px' }}>
                    Ubicación
                  </th>
                </>
              )}
              
              {/* Columnas comunes */}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50" style={{ minWidth: '150px' }}>
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 whitespace-nowrap">
                Etapa
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 whitespace-nowrap">
                Prioridad
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50" style={{ minWidth: '180px' }}>
                Técnico
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 whitespace-nowrap">
                Fecha
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 whitespace-nowrap">
                Días
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {tickets.map((ticket) => (
              <tr 
                key={ticket.id}
                onClick={() => handleRowClick(ticket.id)}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {/* Folio */}
                <td className="px-6 py-4 font-mono font-medium text-[#00B0B2] whitespace-nowrap">
                  {ticket.folio}
                </td>

                {/* Asunto */}
                <td className="px-6 py-4">
                  <div className="line-clamp-2" title={ticket.asunto}>
                    {ticket.asunto}
                  </div>
                </td>

                {/* Columnas adaptativas según área */}
                {esMantenimientoPlanta ? (
                  <>
                    {/* Área (Planta) */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Building2 className="h-4 w-4 text-gray-600" />
                        <span className="text-gray-900 font-medium">
                          {ticket.planta || 'Sin especificar'}
                        </span>
                      </div>
                    </td>

                    {/* Activo */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Tag className="h-4 w-4 text-gray-600" />
                        <span className="text-gray-900">
                          {ticket.activo || 'Sin especificar'}
                        </span>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    {/* Ubicación estándar */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span className="text-xs">{ticket.zona}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <Building2 className="h-3 w-3" />
                          <span className="text-xs" title={ticket.tienda}>
                            {ticket.tienda}
                          </span>
                        </div>
                      </div>
                    </td>
                  </>
                )}

                {/* Categoría (común) */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 text-sm">
                    <Tag className="h-3 w-3 text-gray-600" />
                    <span title={ticket.categoria}>
                      {ticket.categoria}
                    </span>
                  </div>
                </td>

                {/* Etapa */}
                <td className="px-6 py-4">
                  <Badge 
                    variant="outline"
                    className={ETAPA_COLORS[ticket.etapa] || "bg-gray-100 text-gray-800"}
                  >
                    {ticket.etapa}
                  </Badge>
                </td>

                {/* Prioridad */}
                <td className="px-6 py-4">
                  <Badge 
                    variant="secondary"
                    className={PRIORIDAD_COLORS[ticket.prioridad] || "bg-gray-100 text-gray-700"}
                  >
                    {ticket.prioridad}
                  </Badge>
                </td>

                {/* Técnico */}
                <td className="px-6 py-4 text-sm">
                  <div title={ticket.tecnico_asignado}>
                    {ticket.tecnico_asignado}
                  </div>
                </td>

                {/* Fecha */}
                <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                  {formatFecha(ticket.fecha_creacion)}
                </td>

                {/* Días desde creación */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3 text-gray-600" />
                    <span className={`text-sm font-medium ${
                      ticket.dias_desde_creacion > 7 
                        ? 'text-red-600' 
                        : ticket.dias_desde_creacion > 3 
                        ? 'text-orange-600' 
                        : 'text-gray-600'
                    }`}>
                      {ticket.dias_desde_creacion}d
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumen al pie de tabla */}
      <div className="border-t bg-muted/30 px-6 py-3">
        <p className="text-sm text-gray-600">
          Mostrando <span className="font-medium text-gray-900">{tickets.length}</span> ticket{tickets.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Modal de Detalle */}
      <OTDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        otId={selectedOtId}
      />
    </div>
  )
}
