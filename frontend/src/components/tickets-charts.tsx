"use client"

import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Ticket {
  zona: string
  tienda: string
  etapa: string
  categoria: string
}

interface TicketsChartsProps {
  tickets: Ticket[]
}

type DrillDownLevel = "zona" | "tienda" | "categoria"

interface DrillDownState {
  level: DrillDownLevel
  selectedZona: string | null
  selectedTienda: string | null
}

const COLORS = {
  primary: "#00B0B2",      // Color corporativo principal (turquesa)
  secondary: "#0C6659",    // Color corporativo secundario (verde oscuro)
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444"
}

export function TicketsCharts({ tickets }: TicketsChartsProps) {
  // Estado para el drill-down del gráfico de zonas
  const [drillDown, setDrillDown] = useState<DrillDownState>({
    level: "zona",
    selectedZona: null,
    selectedTienda: null
  })

  // Preparar datos según el nivel de drill-down
  const getChartData = () => {
    if (drillDown.level === "zona") {
      // Nivel 1: Mostrar zonas con desglose de pendientes/terminados
      const zonaData: Record<string, { pendientes: number; terminados: number }> = {}
      
      tickets.forEach(ticket => {
        const zona = ticket.zona || "Sin zona"
        if (!zonaData[zona]) {
          zonaData[zona] = { pendientes: 0, terminados: 0 }
        }
        
        // Clasificar como terminado o pendiente
        const esTerminado = ticket.etapa === "Terminada" || ticket.etapa === "Completada" || ticket.etapa === "Cerrada"
        if (esTerminado) {
          zonaData[zona].terminados++
        } else {
          zonaData[zona].pendientes++
        }
      })

      return Object.entries(zonaData)
        .map(([name, data]) => ({ 
          name, 
          pendientes: data.pendientes,
          terminados: data.terminados,
          total: data.pendientes + data.terminados
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8) // Top 8 zonas
    } 
    else if (drillDown.level === "tienda" && drillDown.selectedZona) {
      // Nivel 2: Mostrar tiendas de la zona seleccionada con desglose
      const tiendasEnZona = tickets.filter(t => t.zona === drillDown.selectedZona)
      const tiendaData: Record<string, { pendientes: number; terminados: number }> = {}
      
      tiendasEnZona.forEach(ticket => {
        const tienda = ticket.tienda || "Sin tienda"
        if (!tiendaData[tienda]) {
          tiendaData[tienda] = { pendientes: 0, terminados: 0 }
        }
        
        const esTerminado = ticket.etapa === "Terminada" || ticket.etapa === "Completada" || ticket.etapa === "Cerrada"
        if (esTerminado) {
          tiendaData[tienda].terminados++
        } else {
          tiendaData[tienda].pendientes++
        }
      })

      return Object.entries(tiendaData)
        .map(([name, data]) => ({ 
          name, 
          pendientes: data.pendientes,
          terminados: data.terminados,
          total: data.pendientes + data.terminados
        }))
        .sort((a, b) => b.total - a.total)
    }
    else if (drillDown.level === "categoria" && drillDown.selectedTienda) {
      // Nivel 3: Mostrar categorías de la tienda seleccionada con desglose
      const ticketsEnTienda = tickets.filter(
        t => t.zona === drillDown.selectedZona && t.tienda === drillDown.selectedTienda
      )
      const categoriaData: Record<string, { pendientes: number; terminados: number }> = {}
      
      ticketsEnTienda.forEach(ticket => {
        const categoria = ticket.categoria || "Sin categoría"
        if (!categoriaData[categoria]) {
          categoriaData[categoria] = { pendientes: 0, terminados: 0 }
        }
        
        const esTerminado = ticket.etapa === "Terminada" || ticket.etapa === "Completada" || ticket.etapa === "Cerrada"
        if (esTerminado) {
          categoriaData[categoria].terminados++
        } else {
          categoriaData[categoria].pendientes++
        }
      })

      return Object.entries(categoriaData)
        .map(([name, data]) => ({ 
          name, 
          pendientes: data.pendientes,
          terminados: data.terminados,
          total: data.pendientes + data.terminados
        }))
        .sort((a, b) => b.total - a.total)
    }

    return []
  }

  const chartData = getChartData()

  // Manejador de clics en las barras
  const handleBarClick = (data: any) => {
    if (drillDown.level === "zona") {
      // Navegar a tiendas de la zona
      setDrillDown({
        level: "tienda",
        selectedZona: data.name,
        selectedTienda: null
      })
    } else if (drillDown.level === "tienda") {
      // Navegar a categorías de la tienda
      setDrillDown({
        level: "categoria",
        selectedZona: drillDown.selectedZona,
        selectedTienda: data.name
      })
    }
    // En nivel "categoria" no hay más drill-down
  }

  // Volver al nivel anterior
  const handleGoBack = () => {
    if (drillDown.level === "categoria") {
      setDrillDown({
        level: "tienda",
        selectedZona: drillDown.selectedZona,
        selectedTienda: null
      })
    } else if (drillDown.level === "tienda") {
      setDrillDown({
        level: "zona",
        selectedZona: null,
        selectedTienda: null
      })
    }
  }

  // Obtener título dinámico
  const getChartTitle = () => {
    if (drillDown.level === "zona") {
      return "Tickets por Zona"
    } else if (drillDown.level === "tienda") {
      return `Tiendas en ${drillDown.selectedZona}`
    } else {
      return `Categorías en ${drillDown.selectedTienda}`
    }
  }

  // Preparar datos para gráfica de etapas - Solo 2 categorías: Pendientes y Terminadas
  // Usar la misma lógica que tickets-overview.tsx para consistencia
  const terminadas = tickets.filter(
    t => t.etapa === "Terminada" || t.etapa === "Completada" || t.etapa === "Cerrada"
  ).length
  const pendientes = tickets.length - terminadas
  
  const etapaChartData = [
    {
      name: "Pendientes",
      value: pendientes,
      porcentaje: tickets.length > 0 ? Math.round((pendientes / tickets.length) * 100) : 0,
      color: COLORS.warning
    },
    {
      name: "Terminadas",
      value: terminadas,
      porcentaje: tickets.length > 0 ? Math.round((terminadas / tickets.length) * 100) : 0,
      color: COLORS.primary
    }
  ].filter(item => item.value > 0) // Solo mostrar categorías con valores

  // Preparar datos para gráfica de categorías
  const categoriaData = tickets.reduce((acc: Record<string, number>, ticket) => {
    const categoria = ticket.categoria || "Sin categoría"
    acc[categoria] = (acc[categoria] || 0) + 1
    return acc
  }, {})

  const categoriaChartData = Object.entries(categoriaData)
    .map(([categoria, cantidad]) => ({ categoria, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 6) // Top 6 categorías

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Gráfica de Tickets por Zona (con drill-down interactivo) */}
      <div className="bg-white/90 rounded-lg shadow-md p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">{getChartTitle()}</h3>
          {drillDown.level !== "zona" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoBack}
              className="gap-2 text-gray-700 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver
            </Button>
          )}
        </div>
        
        {/* Breadcrumb para mostrar ruta de navegación */}
        {drillDown.level !== "zona" && (
          <div className="text-sm text-gray-600 mb-3 flex items-center gap-2">
            <span 
              onClick={() => setDrillDown({ level: "zona", selectedZona: null, selectedTienda: null })}
              className="cursor-pointer hover:text-[#00B0B2] hover:underline"
            >
              Zonas
            </span>
            {drillDown.selectedZona && (
              <>
                <span>›</span>
                <span 
                  onClick={() => setDrillDown({ level: "tienda", selectedZona: drillDown.selectedZona, selectedTienda: null })}
                  className={drillDown.level === "categoria" ? "cursor-pointer hover:text-[#00B0B2] hover:underline" : "font-medium text-gray-800"}
                >
                  {drillDown.selectedZona}
                </span>
              </>
            )}
            {drillDown.selectedTienda && (
              <>
                <span>›</span>
                <span className="font-medium text-gray-800">{drillDown.selectedTienda}</span>
              </>
            )}
          </div>
        )}

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              className="text-xs"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis className="text-xs" tick={{ fill: '#6b7280' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              cursor={{ fill: 'rgba(0, 176, 178, 0.1)' }}
              formatter={(value: number, name: string) => {
                const label = name === 'pendientes' ? 'Pendientes' : 'Terminados'
                return [value, label]
              }}
            />
            <Legend 
              wrapperStyle={{
                paddingTop: '10px',
                fontSize: '14px'
              }}
              formatter={(value: string) => {
                return value === 'pendientes' ? 'Pendientes' : 'Terminados'
              }}
            />
            {/* Barra de Terminados (verde turquesa) */}
            <Bar 
              dataKey="terminados" 
              stackId="stack"
              fill={COLORS.primary}
              radius={[8, 8, 0, 0]}
              onClick={handleBarClick}
              cursor={drillDown.level !== "categoria" ? "pointer" : "default"}
            />
            {/* Barra de Pendientes (naranja) */}
            <Bar 
              dataKey="pendientes" 
              stackId="stack"
              fill={COLORS.warning}
              radius={[8, 8, 0, 0]}
              onClick={handleBarClick}
              cursor={drillDown.level !== "categoria" ? "pointer" : "default"}
            />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Indicador visual de interactividad */}
        {drillDown.level !== "categoria" && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Haz clic en una barra para ver más detalles
          </p>
        )}
      </div>

      {/* Gráfica de Tickets por Etapa (Pie Chart) */}
      <div className="bg-white/90 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribución por Etapa</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={etapaChartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius={70}
              dataKey="value"
            >
              {etapaChartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              formatter={(value: number, name: string, props: any) => {
                const porcentaje = props.payload.porcentaje
                return [`${value} tickets (${porcentaje}%)`, name]
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value: string, entry: any) => {
                const item = etapaChartData.find(d => d.name === value)
                return `${value}: ${item?.value || 0} (${item?.porcentaje || 0}%)`
              }}
              wrapperStyle={{
                paddingTop: '10px',
                fontSize: '14px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfica de Tickets por Categoría */}
      <div className="bg-white/90 rounded-lg shadow-md p-6 lg:col-span-3">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Categorías</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoriaChartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" className="text-xs" tick={{ fill: '#6b7280' }} />
            <YAxis 
              dataKey="categoria" 
              type="category" 
              className="text-xs"
              width={150}
              tick={{ fill: '#6b7280' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
            <Bar 
              dataKey="cantidad" 
              fill={COLORS.primary}
              radius={[0, 8, 8, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
