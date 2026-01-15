"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

interface Ticket {
  zona: string
  ciudad: string
  tienda: string
  etapa: string
  categoria: string
  area_responsable: string
  planta: string
  activo: string
}

interface Filters {
  zona: string
  tienda: string
  etapa: string
  categoria: string
  area: string
  searchTerm: string
  planta: string
  activo: string
}

interface TicketsFiltersProps {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  tickets: Ticket[]
}

export function TicketsFilters({ filters, setFilters, tickets }: TicketsFiltersProps) {
  // Determinar si estamos en modo Mantenimiento Planta
  const esMantenimientoPlanta = filters.area === "Mantenimiento Planta"
  
  // PASO 1: Filtrar tickets base considerando ÁREA primero
  const ticketsFiltradosPorArea = tickets.filter(t => {
    // Si hay área seleccionada, filtrar por área
    if (filters.area && filters.area !== "__all__") {
      return t.area_responsable === filters.area
    }
    return true
  })
  
  // PASO 2: Obtener zonas únicas considerando el área seleccionada
  const zonasUnicas = Array.from(
    new Set(ticketsFiltradosPorArea.map(t => t.zona).filter(Boolean))
  ).sort()
  
  // PASO 3: Filtrar tickets para opciones dinámicas (área + zona + tienda)
  const ticketsFiltradosParaOpciones = ticketsFiltradosPorArea.filter(t => {
    // Si hay zona seleccionada, filtrar por zona
    if (filters.zona && filters.zona !== "__all__" && t.zona !== filters.zona) {
      return false
    }
    // Si hay tienda seleccionada, filtrar también por tienda
    if (filters.tienda && filters.tienda !== "__all__" && t.tienda !== filters.tienda) {
      return false
    }
    return true
  })
  
  // PASO 4: Obtener tiendas considerando área y zona
  const tiendasUnicas = Array.from(
    new Set(
      ticketsFiltradosPorArea
        .filter(t => t.tienda && (!filters.zona || filters.zona === "__all__" || t.zona === filters.zona))
        .map(t => t.tienda)
    )
  ).sort()
  
  // PASO 5: Obtener etapas y categorías de tickets filtrados
  const etapasUnicas = Array.from(
    new Set(ticketsFiltradosParaOpciones.map(t => t.etapa).filter(Boolean))
  ).sort()
  
  const categoriasUnicas = Array.from(
    new Set(ticketsFiltradosParaOpciones.map(t => t.categoria).filter(Boolean))
  ).sort()

  // Obtener plantas y activos únicos (solo para Mantenimiento Planta)
  const plantasUnicas = Array.from(
    new Set(ticketsFiltradosPorArea.map(t => t.planta).filter(Boolean))
  ).sort()
  
  const activosUnicos = Array.from(
    new Set(
      ticketsFiltradosPorArea
        .filter(t => t.activo && (!filters.planta || filters.planta === "__all__" || t.planta === filters.planta))
        .map(t => t.activo)
    )
  ).sort()

  // PASO 6: Obtener áreas considerando zona/tienda seleccionada (cascada inversa)
  const ticketsFiltradosParaAreas = tickets.filter(t => {
    if (filters.zona && filters.zona !== "__all__" && t.zona !== filters.zona) {
      return false
    }
    if (filters.tienda && filters.tienda !== "__all__" && t.tienda !== filters.tienda) {
      return false
    }
    return true
  })
  
  const areasUnicas = Array.from(
    new Set(ticketsFiltradosParaAreas.map(t => t.area_responsable).filter(Boolean))
  ).sort()

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Manejar cambio de área y resetear zona, tienda, etapa y categoría
  const handleAreaChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      area: value,
      zona: "",      // Resetear zona al cambiar área
      tienda: "",    // Resetear tienda al cambiar área
      planta: "",    // Resetear planta al cambiar área
      activo: "",    // Resetear activo al cambiar área
      etapa: "",     // Resetear etapa al cambiar área
      categoria: ""  // Resetear categoría al cambiar área
    }))
  }

  // Manejar cambio de planta y resetear activo
  const handlePlantaChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      planta: value,
      activo: "", // Resetear activo al cambiar planta
      etapa: "",  // Resetear etapa al cambiar planta
      categoria: "" // Resetear categoría al cambiar planta
    }))
  }
  
  // Manejar cambio de activo y resetear etapa y categoría
  const handleActivoChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      activo: value,
      etapa: "",  // Resetear etapa al cambiar activo
      categoria: "" // Resetear categoría al cambiar activo
    }))
  }

  // Manejar cambio de zona y resetear tienda, etapa y categoría
  const handleZonaChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      zona: value,
      tienda: "", // Resetear tienda al cambiar zona
      etapa: "",  // Resetear etapa al cambiar zona
      categoria: "" // Resetear categoría al cambiar zona
    }))
  }
  
  // Manejar cambio de tienda y resetear etapa y categoría
  const handleTiendaChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      tienda: value,
      etapa: "",  // Resetear etapa al cambiar tienda
      categoria: "" // Resetear categoría al cambiar tienda
    }))
  }

  const handleClearFilters = () => {
    setFilters({
      zona: "",
      tienda: "",
      etapa: "",
      categoria: "",
      area: "",
      searchTerm: "",
      planta: "",
      activo: ""
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== "")

  return (
    <div className="bg-white/90 rounded-lg shadow-md p-6 mb-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Búsqueda por texto */}
        <div className="lg:col-span-2">
          <Label htmlFor="search" className="text-sm font-medium text-gray-700">
            Buscar
          </Label>
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="search"
              placeholder="Folio o asunto..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
              className="pl-9 border-gray-300 focus:border-[#00B0B2] focus:ring-[#00B0B2]"
            />
          </div>
        </div>

          {/* Filtro por Área Responsable - PRIMERO */}
          <div>
            <Label htmlFor="area" className="text-sm font-medium text-gray-700">
              Área
            </Label>
            <Select
              value={filters.area}
              onValueChange={handleAreaChange}
            >
              <SelectTrigger id="area" className="mt-1.5 border-gray-300 focus:border-[#00B0B2] focus:ring-[#00B0B2]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las áreas</SelectItem>
                {areasUnicas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtros adaptativos según área */}
          {esMantenimientoPlanta ? (
            <>
              {/* Filtro por Planta (Área de Mantenimiento Planta) */}
              <div>
                <Label htmlFor="planta" className="text-sm font-medium text-gray-700">
                  Planta
                </Label>
                <Select
                  value={filters.planta}
                  onValueChange={handlePlantaChange}
                >
                  <SelectTrigger id="planta" className="mt-1.5 border-gray-300 focus:border-[#00B0B2] focus:ring-[#00B0B2]">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas las plantas</SelectItem>
                    {plantasUnicas.map((planta) => (
                      <SelectItem key={planta} value={planta}>
                        {planta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Activo */}
              <div>
                <Label htmlFor="activo" className="text-sm font-medium text-gray-700">
                  Activo
                </Label>
                <Select
                  value={filters.activo}
                  onValueChange={handleActivoChange}
                  disabled={!filters.planta || filters.planta === "__all__"}
                >
                  <SelectTrigger id="activo" className="mt-1.5 border-gray-300 focus:border-[#00B0B2] focus:ring-[#00B0B2] disabled:opacity-50 disabled:cursor-not-allowed">
                    <SelectValue placeholder={
                      !filters.planta || filters.planta === "__all__" 
                        ? "Seleccione primero una planta" 
                        : "Todos"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos los activos</SelectItem>
                    {activosUnicos.map((activo) => (
                      <SelectItem key={activo} value={activo}>
                        {activo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              {/* Filtro por Zona */}
              <div>
                <Label htmlFor="zona" className="text-sm font-medium text-gray-700">
                  Zona
                </Label>
                <Select
                  value={filters.zona}
                  onValueChange={handleZonaChange}
                >
                  <SelectTrigger id="zona" className="mt-1.5 border-gray-300 focus:border-[#00B0B2] focus:ring-[#00B0B2]">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas las zonas</SelectItem>
                    {zonasUnicas.map((zona) => (
                      <SelectItem key={zona} value={zona}>
                        {zona}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Tienda */}
              <div>
                <Label htmlFor="tienda" className="text-sm font-medium text-gray-700">
                  Tienda
                </Label>
                <Select
                  value={filters.tienda}
                  onValueChange={handleTiendaChange}
                  disabled={!filters.zona || filters.zona === "__all__"}
                >
                  <SelectTrigger id="tienda" className="mt-1.5 border-gray-300 focus:border-[#00B0B2] focus:ring-[#00B0B2] disabled:opacity-50 disabled:cursor-not-allowed">
                    <SelectValue placeholder={
                      !filters.zona || filters.zona === "__all__" 
                        ? "Seleccione primero una zona" 
                        : "Todas"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas las tiendas</SelectItem>
                    {tiendasUnicas.map((tienda) => (
                      <SelectItem key={tienda} value={tienda}>
                        {tienda}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Filtro por Etapa */}
          <div>
            <Label htmlFor="etapa" className="text-sm font-medium text-gray-700">
              Etapa
            </Label>
            <Select
              value={filters.etapa}
              onValueChange={(value) => handleFilterChange("etapa", value)}
            >
              <SelectTrigger id="etapa" className="mt-1.5 border-gray-300 focus:border-[#00B0B2] focus:ring-[#00B0B2]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las etapas</SelectItem>
                {etapasUnicas.map((etapa) => (
                  <SelectItem key={etapa} value={etapa}>
                    {etapa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Categoría */}
          <div>
            <Label htmlFor="categoria" className="text-sm font-medium text-gray-700">
              Categoría
            </Label>
            <Select
              value={filters.categoria}
              onValueChange={(value) => handleFilterChange("categoria", value)}
            >
              <SelectTrigger id="categoria" className="mt-1.5 border-gray-300 focus:border-[#00B0B2] focus:ring-[#00B0B2]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las categorías</SelectItem>
                {categoriasUnicas.map((categoria) => (
                  <SelectItem key={categoria} value={categoria}>
                    {categoria}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

      {/* Botón limpiar filtros */}
      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  )
}
