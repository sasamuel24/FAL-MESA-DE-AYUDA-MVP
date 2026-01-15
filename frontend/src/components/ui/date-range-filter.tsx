"use client"

import * as React from "react"
import { CalendarIcon, X } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DateRangeFilterProps {
  className?: string
  onDateChange?: (dateRange: { from: Date | null; to: Date | null } | undefined) => void
  initialFrom?: Date | null
  initialTo?: Date | null
}

export function DateRangeFilter({ className, onDateChange, initialFrom, initialTo }: DateRangeFilterProps) {
  const [fechaDesde, setFechaDesde] = React.useState<Date | null>(initialFrom || null)
  const [fechaHasta, setFechaHasta] = React.useState<Date | null>(initialTo || null)

  // Sincronizar con valores iniciales cuando cambian
  React.useEffect(() => {
    setFechaDesde(initialFrom || null)
    setFechaHasta(initialTo || null)
  }, [initialFrom, initialTo])

  const handleFromDateChange = (date: Date | null) => {
    setFechaDesde(date)
    onDateChange?.({ from: date, to: fechaHasta })
  }

  const handleToDateChange = (date: Date | null) => {
    setFechaHasta(date)
    onDateChange?.({ from: fechaDesde, to: date })
  }

  const clearFilters = () => {
    setFechaDesde(null)
    setFechaHasta(null)
    onDateChange?.(undefined)
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-5 w-5 text-[#00B0B2]" />
        <span className="text-sm font-medium text-gray-700">Filtrar por fecha de visita:</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        {/* Desde */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Desde</span>
          <DatePicker
            selected={fechaDesde}
            onChange={handleFromDateChange}
            dateFormat="dd/MM/yyyy"
            className="w-40 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00B0B2]/50 focus:border-[#00B0B2] hover:bg-gray-50"
            placeholderText="Seleccionar fecha"
            showYearDropdown
            showMonthDropdown
            dropdownMode="select"
            isClearable
            autoComplete="off"
            popperClassName="calendar-popper"
            popperPlacement="bottom-start"
            shouldCloseOnSelect={true}
            withPortal={true}
          />
        </div>

        {/* Separador */}
        <div className="hidden sm:block">
          <div className="h-px w-4 bg-gray-300" />
        </div>

        {/* Hasta */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Hasta</span>
          <DatePicker
            selected={fechaHasta}
            onChange={handleToDateChange}
            dateFormat="dd/MM/yyyy"
            className="w-40 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00B0B2]/50 focus:border-[#00B0B2] hover:bg-gray-50"
            placeholderText="Seleccionar fecha"
            showYearDropdown
            showMonthDropdown
            dropdownMode="select"
            isClearable
            autoComplete="off"
            minDate={fechaDesde || undefined}
            popperClassName="calendar-popper"
            popperPlacement="bottom-start"
            shouldCloseOnSelect={true}
            withPortal={true}
          />
        </div>

        {/* Botón limpiar filtros */}
        {(fechaDesde || fechaHasta) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-500 hover:text-[#00B0B2] hover:bg-[#00B0B2]/10 transition-colors duration-200"
          >
            <X className="mr-1 h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  )
}
