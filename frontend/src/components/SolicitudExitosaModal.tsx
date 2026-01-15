"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon, FileTextIcon, CalendarIcon, ClockIcon, MapPinIcon, TagIcon, UserIcon } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface SolicitudData {
  id: string
  fecha: string
  hora: string
  asunto: string
  categoria: string
  subcategoria: string
  zona: string
  ciudad: string
  tienda: string
  nombre: string
  correo: string
  telefono?: string
  descripcion?: string
  nextSteps?: string
}

interface SolicitudExitosaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  solicitudData: SolicitudData
  onViewSolicitudes?: () => void
}

export function SolicitudExitosaModal({ open, onOpenChange, solicitudData, onViewSolicitudes }: SolicitudExitosaModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(solicitudData.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] gap-6 max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto bg-teal-50">
            <FileTextIcon className="w-8 h-8 text-teal-600" />
          </div>
          <DialogTitle className="text-2xl text-center font-bold text-teal-600">
            ¡Solicitud Enviada Exitosamente!
          </DialogTitle>
          <DialogDescription className="text-center text-base text-gray-600">
            Su solicitud de mantenimiento ha sido registrada correctamente. 
            Guarde el siguiente número de referencia para dar seguimiento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ID Card */}
          <div className="rounded-lg p-6 border-2 bg-teal-50 border-teal-200">
            <p className="text-sm text-gray-600 mb-3 text-center font-medium">Número de Solicitud</p>
            <div className="flex items-center justify-center gap-3">
              <p className="text-4xl font-bold font-mono tracking-wider text-teal-700">
                #{solicitudData.id}
              </p>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="h-10 w-10 shrink-0 bg-transparent border-gray-300 hover:bg-gray-50"
                aria-label="Copiar número de solicitud"
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4 text-teal-600" />
                ) : (
                  <CopyIcon className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-gray-500">
                <CalendarIcon className="h-4 w-4" />
                <p className="text-xs font-medium">Fecha</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{solicitudData.fecha}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-gray-500">
                <ClockIcon className="h-4 w-4" />
                <p className="text-xs font-medium">Hora</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{solicitudData.hora}</p>
            </div>
          </div>

          {/* Información del Solicitante */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <UserIcon className="h-4 w-4" />
              <p className="text-xs font-medium">Información del Solicitante</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">{solicitudData.nombre}</p>
              <p className="text-sm text-gray-600">{solicitudData.correo}</p>
              {solicitudData.telefono && (
                <p className="text-sm text-gray-600">{solicitudData.telefono}</p>
              )}
            </div>
          </div>

          {/* Categoría y Subcategoría */}
          <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg p-3">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 text-gray-500">
                <TagIcon className="h-4 w-4" />
                <p className="text-xs font-medium">Tipo de Servicio</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{solicitudData.categoria}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 text-right">Subcategoría</p>
              <Badge variant="outline" className="bg-white border-gray-300 text-gray-700">
                {solicitudData.subcategoria}
              </Badge>
            </div>
          </div>

          {/* Ubicación */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-gray-500">
              <MapPinIcon className="h-4 w-4" />
              <p className="text-xs font-medium">Ubicación</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-500">Zona</p>
                <p className="font-semibold text-gray-900">{solicitudData.zona}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Ciudad</p>
                <p className="font-semibold text-gray-900">{solicitudData.ciudad}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tienda</p>
                <p className="font-semibold text-gray-900">{solicitudData.tienda}</p>
              </div>
            </div>
          </div>

          {/* Asunto */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-gray-500">Asunto</p>
            <p className="text-sm font-semibold text-gray-900">{solicitudData.asunto}</p>
          </div>

          {/* Descripción */}
          {solicitudData.descripcion && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-gray-500">Descripción</p>
              <p className="text-sm text-gray-700">{solicitudData.descripcion}</p>
            </div>
          )}

          {/* Próximos Pasos */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <p className="text-xs font-medium text-teal-600 mb-2">Próximos Pasos</p>
            <p className="text-sm text-gray-700">
              {solicitudData.nextSteps || 'Su solicitud será revisada por nuestro equipo técnico. Recibirá una notificación cuando sea asignada a un técnico especializado.'}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={handleCopy} 
            className="flex-1 bg-transparent border-gray-300 hover:bg-gray-50"
          >
            {copied ? (
              <>
                <CheckIcon className="mr-2 h-4 w-4 text-teal-600" />
                <span className="text-teal-600">Copiado</span>
              </>
            ) : (
              <>
                <CopyIcon className="mr-2 h-4 w-4 text-gray-500" />
                Copiar Número
              </>
            )}
          </Button>
          {onViewSolicitudes && (
            <Button
              onClick={onViewSolicitudes}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Ver Solicitudes B2B
            </Button>
          )}
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white transition-colors"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
