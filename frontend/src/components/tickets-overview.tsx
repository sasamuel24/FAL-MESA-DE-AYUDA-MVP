import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle } from "lucide-react"

interface Ticket {
  id: number
  folio: string
  etapa: string
  dias_desde_creacion: number
  fecha_creacion: string
}

interface TicketsOverviewProps {
  tickets: Ticket[]
}

export function TicketsOverview({ tickets }: TicketsOverviewProps) {
  // Calcular métricas
  const totalTickets = tickets.length
  
  // Incluir "Terminada", "Completada" y "Cerrada" como estados completados
  const ticketsCompletados = tickets.filter(
    t => t.etapa === "Terminada" || t.etapa === "Completada" || t.etapa === "Cerrada"
  ).length
  
  // Pendientes = todos los que NO están completados (mismo criterio que el gráfico)
  const ticketsPendientes = totalTickets - ticketsCompletados
  
  // Calcular tiempo promedio de resolución
  const ticketsConTiempo = tickets.filter(t => t.dias_desde_creacion > 0)
  const tiempoPromedio = ticketsConTiempo.length > 0
    ? Math.round(ticketsConTiempo.reduce((sum, t) => sum + t.dias_desde_creacion, 0) / ticketsConTiempo.length)
    : 0
  
  // Calcular efectividad global (tasa de completado)
  const efectividadGlobal = totalTickets > 0 
    ? Math.round((ticketsCompletados / totalTickets) * 100) 
    : 0
  
  const metricas = [
    {
      titulo: "Total de Tickets",
      valor: totalTickets,
      icono: AlertCircle,
      colorIcono: "text-blue-500",
      bgIcono: "bg-blue-50",
      descripcion: "Tickets en el sistema"
    },
    {
      titulo: "Pendientes",
      valor: ticketsPendientes,
      icono: Clock,
      colorIcono: "text-orange-500",
      bgIcono: "bg-orange-50",
      descripcion: "En proceso o por iniciar"
    },
    {
      titulo: "Completados",
      valor: ticketsCompletados,
      icono: CheckCircle2,
      colorIcono: "text-green-500",
      bgIcono: "bg-green-50",
      descripcion: `${efectividadGlobal}% de efectividad`,
      tendencia: efectividadGlobal >= 70 ? "up" : efectividadGlobal >= 40 ? "neutral" : "down"
    },
    {
      titulo: "Tiempo Promedio",
      valor: `${tiempoPromedio}d`,
      icono: Clock,
      colorIcono: "text-purple-500",
      bgIcono: "bg-purple-50",
      descripcion: "Días desde creación"
    }
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metricas.map((metrica, index) => {
        const Icon = metrica.icono
        return (
          <div 
            key={index}
            className="bg-white/90 rounded-lg shadow-md p-6 border-l-4 hover:transform hover:scale-105 transition-transform"
            style={{ 
              borderColor: metrica.colorIcono.includes('blue') ? '#3B82F6' :
                          metrica.colorIcono.includes('orange') ? '#F97316' :
                          metrica.colorIcono.includes('green') ? '#10B981' :
                          metrica.colorIcono.includes('red') ? '#EF4444' :
                          '#A855F7'
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600">{metrica.titulo}</p>
                <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>
                  {metrica.valor}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {metrica.tendencia === "up" && (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  )}
                  {metrica.tendencia === "down" && (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <p className={`text-sm ${
                    metrica.tendencia === 'up' 
                      ? 'text-green-600' 
                      : metrica.tendencia === 'down'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}>
                    {metrica.descripcion}
                  </p>
                </div>
              </div>
              <div className={`p-3 rounded-full ${metrica.bgIcono}`}>
                <Icon className={`h-6 w-6 ${metrica.colorIcono}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
