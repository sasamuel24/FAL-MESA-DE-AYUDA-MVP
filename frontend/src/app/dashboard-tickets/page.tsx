"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TicketsOverview } from "@/components/tickets-overview"
import { TicketsCharts } from "@/components/tickets-charts"
import { TicketsTable } from "@/components/tickets-table"
import { TicketsFilters } from "@/components/tickets-filters"
import { BarChart3, TrendingUp, User, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface Ticket {
  id: number
  folio: string
  asunto: string
  zona: string
  ciudad: string
  tienda: string
  planta: string
  activo: string
  categoria: string
  subcategoria: string
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
}

interface DashboardData {
  ots: Ticket[]
  estadisticas: {
    total: number
    pendientes: number
    completadas: number
    tasa_completado: number
  }
  distribuciones: {
    por_zona: Record<string, number>
    por_etapa: Record<string, number>
    por_categoria: Record<string, number>
  }
  filtros: {
    zonas: string[]
    ciudades: string[]
    tiendas: string[]
    etapas: string[]
    categorias: string[]
  }
}

export default function DashboardTicketsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [userData, setUserData] = useState<any>(null)
  const [filters, setFilters] = useState({
    zona: "",
    tienda: "",
    etapa: "",
    categoria: "",
    area: "",
    planta: "",
    activo: "",
    searchTerm: ""
  })

  // Verificar autenticación y cargar datos
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("access_token")
        
        if (!token) {
          router.push("/")
          return
        }

        // Verificar usuario y rol
        const userResponse = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (!userResponse.ok) {
          console.error("Error al verificar usuario:", userResponse.status)
          localStorage.removeItem("access_token")
          router.push("/")
          return
        }

        const userData = await userResponse.json()
        console.log("Usuario autenticado:", userData)
        setUserData(userData)
        
        // Verificar que tenga área permitida para acceder al CQ Performance Dashboard
        const areasPermitidas = ['Jefe de Zona', 'Gerente de Tiendas', 'Mercadeo']
        const tieneAccesoPorArea = userData.area && areasPermitidas.includes(userData.area)
        const esAdmin = userData.rol === 'admin'
        
        if (!esAdmin && !tieneAccesoPorArea) {
          setError(`No tiene permisos para acceder a este dashboard. Su área es: ${userData.area || 'Sin área asignada'}`)
          setLoading(false)
          return
        }

        // Cargar datos del dashboard (endpoint correcto)
        const dashboardResponse = await fetch(
          `${process.env.NEXT_PUBLIC_FASTAPI_API_URL}/dashboard/ots`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        if (!dashboardResponse.ok) {
          const errorData = await dashboardResponse.json().catch(() => ({}))
          console.error("Error del servidor:", dashboardResponse.status, errorData)
          throw new Error(`Error al cargar datos del dashboard: ${dashboardResponse.status} - ${JSON.stringify(errorData)}`)
        }

        const response = await dashboardResponse.json()
        console.log("Respuesta del dashboard:", response)
        setDashboardData(response.data)
        setLoading(false)

      } catch (err) {
        console.error("Error al cargar dashboard:", err)
        setError("Error al cargar datos del dashboard")
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    router.push("/")
  }

  // Filtrar tickets según criterios
  const filteredTickets = useMemo(() => {
    if (!dashboardData) return []

    return dashboardData.ots.filter((ticket) => {
      const matchZona = !filters.zona || filters.zona === "__all__" || ticket.zona === filters.zona
      const matchTienda = !filters.tienda || filters.tienda === "__all__" || ticket.tienda === filters.tienda
      const matchPlanta = !filters.planta || filters.planta === "__all__" || ticket.planta === filters.planta
      const matchActivo = !filters.activo || filters.activo === "__all__" || ticket.activo === filters.activo
      const matchEtapa = !filters.etapa || filters.etapa === "__all__" || ticket.etapa === filters.etapa
      const matchCategoria = !filters.categoria || filters.categoria === "__all__" || ticket.categoria === filters.categoria
      const matchArea = !filters.area || filters.area === "__all__" || ticket.area_responsable === filters.area
      const matchSearch = !filters.searchTerm ||
        ticket.folio.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        ticket.asunto.toLowerCase().includes(filters.searchTerm.toLowerCase())
      
      return matchZona && matchTienda && matchPlanta && matchActivo && matchEtapa && matchCategoria && matchArea && matchSearch
    })
  }, [dashboardData, filters])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00B0B2] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: "url('/images/cq2.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "50% 70%",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}>
        <div className="min-h-screen flex items-center justify-center bg-black/5 w-full">
          <div className="text-center">
            <div className="rounded-full bg-red-100 p-4 mx-auto w-16 h-16 flex items-center justify-center mb-4">
              <BarChart3 className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-[#00B0B2] text-white rounded-md hover:bg-[#0C6659]"
            >
              Ir al login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return null
  }

  return (
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
                <Link href="/dashboard-tickets">
                  <img
                    src="/images/logo.png"
                    alt="Logo"
                    className="h-12 w-auto object-contain cursor-pointer"
                  />
                </Link>
              </div>

              {/* Espacio central - sin navegación */}
              <div className="flex-1"></div>

              {/* User Avatar */}
              <div className="flex items-center space-x-4">
                {/* Mostrar información del usuario */}
                <div className="hidden md:block text-white text-sm">
                  <div className="font-medium">{userData?.nombre || 'Usuario'}</div>
                  <div className="text-white/80 capitalize">{userData?.rol || ''}</div>
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
                      <div className="font-medium">{userData?.nombre || 'Usuario'}</div>
                      <div className="text-sm text-gray-500 break-words word-wrap overflow-wrap-anywhere max-w-full">
                        {userData?.email || ''}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">{userData?.rol || ''}</div>
                    </div>
                    <DropdownMenuSeparator />
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

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black drop-shadow-sm mb-2">CQ Performance Dashboard</h1>
            <p className="text-sm text-gray-600">Análisis centralizado de tickets B2C</p>
          </div>

          {/* KPIs Overview */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-[#00B0B2]" />
              <h2 className="text-lg font-semibold text-gray-800">Métricas principales</h2>
            </div>
            <TicketsOverview tickets={filteredTickets} />
          </section>

          {/* Charts Section */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-[#00B0B2]" />
              <h2 className="text-lg font-semibold text-gray-800">Análisis de tickets</h2>
            </div>
            <TicketsCharts tickets={filteredTickets} />
          </section>

          {/* Filters and Table */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-[#00B0B2]" />
              <h2 className="text-lg font-semibold text-gray-800">Detalle de tickets</h2>
            </div>
            <TicketsFilters 
              filters={filters} 
              setFilters={setFilters} 
              tickets={dashboardData.ots} 
            />
            <TicketsTable tickets={filteredTickets} areaFiltrada={filters.area} />
          </section>
        </main>
      </div>
    </div>
  )
}
