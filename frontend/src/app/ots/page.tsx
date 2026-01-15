    "use client"
import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "../../lib/auth_context"
import { useHydration } from "@/hooks"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import "@/styles/resizable-tables.css"
import { DateRangeFilter } from "@/components/ui/date-range-filter"
import { useRouter, useSearchParams } from "next/navigation"
import { useDashboardRoute } from "@/hooks/useDashboardRoute"
import { useResizableColumns } from "@/hooks/useResizableColumns"

// Configuración de FastAPI - Usar variable de entorno
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'http://localhost:8000/api/v1';
console.log('🔍 DEBUG OTS - FASTAPI_BASE_URL:', FASTAPI_BASE_URL);
console.log('🔍 DEBUG OTS - process.env.NEXT_PUBLIC_FASTAPI_API_URL:', process.env.NEXT_PUBLIC_FASTAPI_API_URL);

// Interfaces para datos dinámicos de organizaciones
interface Zona {
  id: number;
  nombre: string;
  activa: boolean;
}

interface Ciudad {
  id: number;
  nombre: string;
  zona_id: number;
  activa: boolean;
}

interface Tienda {
  id: number;
  nombre: string;
  ciudad_id: number;
  activa: boolean;
}

interface Categoria {
  id: number;
  nombre: string;
  activa: boolean;
}

interface Subcategoria {
  id: number;
  nombre: string;
  categoria_id: number;
  activa: boolean;
}

interface OrganizacionesData {
  zonas: Zona[];
  ciudades: Ciudad[];
  tiendas: Tienda[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
}
import {
  User,
  Building2,
  Users,
  Activity,
  FileText,
  ClipboardList,
  Search,
  ChevronDown,
  Check,
  Trash2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  LogOut,
  Download,
  Settings,
  Store,
  MapPin,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

// Interfaces para TypeScript
interface OTData {
  fechaCreacion: string;
  fechaVisita: string; // Nueva fecha para filtrar por fecha de visita
  folio: string;
  asunto: string;
  categoria: string;
  subcategoria: string;
  zona: string;
  ciudad: string;
  tienda: string;
  planta?: string;
  activo?: string;
  tipo_formulario?: string;
  tecnicoAsignado: string;
  etapa: string;
  usuario: string;
  descripcion: string;
  prioridad: string;
  tipoMantenimiento?: string;
  observaciones?: string;
  // Propiedades comerciales B2B
  razon_social?: string;
  sucursal?: string;
  equipos?: string;
}

interface CambioEtapaInfo {
  mostrar: boolean;
  folio: string;
  etapaAnterior: string;
  etapaNueva: string;
}

interface NuevaOTForm {
  categoria: string;
  subcategoria: string;
  zona: string;
  ciudad: string;
  tienda: string;
  tecnico: string;
  tipoMantenimiento: string;
  prioridad: string;
  fechaProgramada: string;
  descripcion: string;
  observaciones: string;
}

export default function OTs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const isClient = useHydration();
  const { dashboardRoute } = useDashboardRoute();
  const [searchTerm, setSearchTerm] = useState("");
  const [fechaDesde, setFechaDesde] = useState<Date | null>(new Date(2025, 0, 1)); // 01/01/2025
  const [fechaHasta, setFechaHasta] = useState<Date | null>(new Date(2025, 11, 31)); // 31/12/2025
  const [otConDropdownAbierto, setOtConDropdownAbierto] = useState<number | null>(null);
  
  // Estados para el modal de eliminación
  const [otAEliminar, setOtAEliminar] = useState<OTData | null>(null);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [eliminacionExitosa, setEliminacionExitosa] = useState(false);
  
  // Estados para el modal de confirmación de cambio de etapa
  const [mostrarModalCambioEtapa, setMostrarModalCambioEtapa] = useState(false);
  const [cambioEtapaInfo, setCambioEtapaInfo] = useState<CambioEtapaInfo | null>(null);
  
  // Estados para el modal de campos faltantes
  const [mostrarModalCamposFaltantes, setMostrarModalCamposFaltantes] = useState(false);
  const [camposFaltantesInfo, setCamposFaltantesInfo] = useState<{folio: string, campos: string[]}>({folio: '', campos: []});
  
  // Estados para el modal de creación de OT
  const [mostrarModalCrearOT, setMostrarModalCrearOT] = useState(false);
  const [creandoOT, setCreandoOT] = useState(false);
  const [otCreada, setOtCreada] = useState(false);
  
  // Estados para los datos del formulario de nueva OT
  const [nuevaOT, setNuevaOT] = useState<NuevaOTForm>({
    categoria: "",
    subcategoria: "",
    zona: "",
    ciudad: "",
    tienda: "",
    tecnico: "",
    tipoMantenimiento: "Correctivo",
    prioridad: "Media",
    fechaProgramada: "",
    descripcion: "",
    observaciones: ""
  });

  // Configuración del hook para columnas redimensionables
  const {
    columnWidths,
    getColumnStyle,
    ResizeHandle,
    tableRef,
    isResizing,
    resetColumns
  } = useResizableColumns({
    initialWidths: {
      fechaCreacion: 130,
      fechaVisita: 130,
      folio: 90,
      asunto: 180,
      categoria: 120,
      subcategoria: 150,
      zona: 100,
      ciudad: 110,
      tienda: 130,
      planta: 120,
      activo: 140,
      razon_social: 140,
      sucursal: 130,
      equipos: 130,
      tecnico: 130,
      etapa: 110,
      acciones: 100
    },
    minWidth: 70,
    maxWidth: 350,
    storageKey: 'ots-table-columns'
  });

  // Funciones para manejar cambios en los selects dependientes
  const handleZonaChange = (value: string) => {
    setNuevaOT({
      ...nuevaOT,
      zona: value,
      ciudad: "",
      tienda: ""
    });
  };

  const handleCiudadChange = (value: string) => {
    setNuevaOT({
      ...nuevaOT,
      ciudad: value,
      tienda: ""
    });
  };

  const handleCategoriaChange = (value: string) => {
    setNuevaOT({
      ...nuevaOT,
      categoria: value,
      subcategoria: ""
    });
  };

  // Funciones auxiliares para filtrar datos dinámicos
  const getCiudadesPorZona = (zonaNombre: string) => {
    const zona = organizacionesData.zonas.find(z => z.nombre === zonaNombre);
    if (!zona) return [];
    return organizacionesData.ciudades.filter(c => c.zona_id === zona.id);
  };

  const getTiendasPorCiudad = (ciudadNombre: string) => {
    const ciudad = organizacionesData.ciudades.find(c => c.nombre === ciudadNombre);
    if (!ciudad) return [];
    return organizacionesData.tiendas.filter(t => t.ciudad_id === ciudad.id);
  };

  const getSubcategoriasPorCategoria = (categoriaNombre: string) => {
    const categoria = organizacionesData.categorias.find(c => c.nombre === categoriaNombre);
    if (!categoria) return [];
    return organizacionesData.subcategorias.filter(s => s.categoria_id === categoria.id);
  };
  
  // Referencia para los dropdowns
  const dropdownRefs = useRef<{[key: number]: HTMLElement | null}>({});

  // Estados para datos dinámicos de organizaciones
  const [organizacionesData, setOrganizacionesData] = useState<OrganizacionesData>({
    zonas: [],
    ciudades: [],
    tiendas: [],
    categorias: [],
    subcategorias: []
  });
  
  // Estado para controlar si están cargando los datos de organizaciones
  const [cargandoOrganizaciones, setCargandoOrganizaciones] = useState(false);

  // Estados individuales para las listas dinámicas
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);

  // Estados para las OTs y técnicos
  const [otsData, setOtsData] = useState<OTData[]>([]);
  const [otsTiendas, setOtsTiendas] = useState<OTData[]>([]);
  const [otsPlantaSP, setOtsPlantaSP] = useState<OTData[]>([]);
  const [otsComercial, setOtsComercial] = useState<OTData[]>([]);
  const [vistaActual, setVistaActual] = useState<'general' | 'planta-san-pedro' | 'comercial'>('general');
  const [tecnicos, setTecnicos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Estados para paginación independiente por vista
  const [paginaActualTiendas, setPaginaActualTiendas] = useState(1);
  const [paginaActualPlantaSP, setPaginaActualPlantaSP] = useState(1);
  const [paginaActualComercial, setPaginaActualComercial] = useState(1);
  const [elementosPorPagina] = useState(20);
  
  // Metadatos de paginación por vista
  const [totalElementosTiendas, setTotalElementosTiendas] = useState(0);
  const [totalPaginasTiendas, setTotalPaginasTiendas] = useState(0);
  const [totalElementosPlantaSP, setTotalElementosPlantaSP] = useState(0);
  const [totalPaginasPlantaSP, setTotalPaginasPlantaSP] = useState(0);
  const [totalElementosComercial, setTotalElementosComercial] = useState(0);
  const [totalPaginasComercial, setTotalPaginasComercial] = useState(0);

  // Cargar técnicos desde FastAPI
  const cargarTecnicos = async () => {
    try {
      console.log('🔄 Cargando técnicos desde FastAPI...');
      
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const endpoint = `${FASTAPI_BASE_URL}/users/tecnicos`;
      
      console.log('📍 Endpoint técnicos:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (response.ok) {
        const resultado = await response.json();
        console.log('✅ Response técnicos:', resultado);
        
        if (resultado.success) {
          // Formatear los técnicos para que muestren nombre completo
          const tecnicosFormateados = resultado.data.map((tecnico: any) => ({
            id: tecnico.id,
            nombre: tecnico.nombre,
            email: tecnico.email,
            displayName: `${tecnico.nombre} - ${tecnico.email}`
          }));
          setTecnicos(tecnicosFormateados);
          console.log('✅ Técnicos cargados:', tecnicosFormateados);
        } else {
          console.error('❌ Error al cargar técnicos:', resultado.message);
          setTecnicos([]);
        }
      } else {
        console.error('❌ Error HTTP al cargar técnicos:', response.status, response.statusText);
        if (response.status === 401 || response.status === 422) {
          logout();
        }
        setTecnicos([]);
      }
    } catch (error) {
      console.error('❌ Error al conectar con FastAPI para técnicos:', error);
      setTecnicos([]);
    }
  };

  // Función para cargar datos de organizaciones desde el backend
  const fetchOrganizacionesData = async () => {
    setCargandoOrganizaciones(true);
    try {
      console.log('🔄 Cargando datos de organizaciones...');
      console.log('📡 FASTAPI_BASE_URL:', FASTAPI_BASE_URL);

      // Preparar headers para las peticiones
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // Realizar todas las peticiones en paralelo
      const [zonasRes, ciudadesRes, tiendasRes, categoriasRes, subcategoriasRes] = await Promise.all([
        fetch(`${FASTAPI_BASE_URL}/organizaciones/zonas`, { headers }),
        fetch(`${FASTAPI_BASE_URL}/organizaciones/ciudades`, { headers }),
        fetch(`${FASTAPI_BASE_URL}/organizaciones/tiendas`, { headers }),
        fetch(`${FASTAPI_BASE_URL}/organizaciones/categorias`, { headers }),
        fetch(`${FASTAPI_BASE_URL}/organizaciones/subcategorias`, { headers })
      ]);

      console.log('📡 Respuestas recibidas:', {
        zonas: zonasRes.status,
        ciudades: ciudadesRes.status,
        tiendas: tiendasRes.status,  
        categorias: categoriasRes.status,
        subcategorias: subcategoriasRes.status
      });

      // Variables para almacenar los datos procesados
      let zonasActivas: Zona[] = [];
      let ciudadesActivas: Ciudad[] = [];
      let tiendasActivas: Tienda[] = [];
      let categoriasActivas: Categoria[] = [];
      let subcategoriasActivas: Subcategoria[] = [];

      // Procesar zonas
      if (zonasRes.ok) {
        const zonasData = await zonasRes.json();
        console.log('📍 Zonas response RAW:', zonasData);
        console.log('📍 Tipo de datos recibidos:', typeof zonasData, Array.isArray(zonasData));
        
        // Manejar tanto formato {success: true, data: [...]} como array directo
        let zonasArray = [];
        if (zonasData.success && Array.isArray(zonasData.data)) {
          // Formato con success/data
          zonasArray = zonasData.data;
        } else if (Array.isArray(zonasData)) {
          // Array directo
          zonasArray = zonasData;
        } else {
          console.error('❌ Formato incorrecto en zonas response:', zonasData);
        }
        
        if (zonasArray.length > 0) {
          zonasActivas = zonasArray.filter((z: Zona) => z.activa);
          console.log('📍 Zonas activas filtradas:', zonasActivas);
          setZonas(zonasActivas);
        }
      } else {
        console.error('❌ Error en request zonas:', zonasRes.status, zonasRes.statusText);
      }

      // Procesar ciudades
      if (ciudadesRes.ok) {
        const ciudadesData = await ciudadesRes.json();
        console.log('🏙️ Ciudades response:', ciudadesData);
        
        // Manejar tanto formato {success: true, data: [...]} como array directo
        let ciudadesArray = [];
        if (ciudadesData.success && Array.isArray(ciudadesData.data)) {
          ciudadesArray = ciudadesData.data;
        } else if (Array.isArray(ciudadesData)) {
          ciudadesArray = ciudadesData;
        }
        
        if (ciudadesArray.length > 0) {
          ciudadesActivas = ciudadesArray.filter((c: Ciudad) => c.activa);
          console.log('🏙️ Ciudades activas:', ciudadesActivas);
          setCiudades(ciudadesActivas);
        }
      }

      // Procesar tiendas
      if (tiendasRes.ok) {
        const tiendasData = await tiendasRes.json();
        console.log('🏪 Tiendas response:', tiendasData);
        
        // Manejar tanto formato {success: true, data: [...]} como array directo
        let tiendasArray = [];
        if (tiendasData.success && Array.isArray(tiendasData.data)) {
          tiendasArray = tiendasData.data;
        } else if (Array.isArray(tiendasData)) {
          tiendasArray = tiendasData;
        }
        
        if (tiendasArray.length > 0) {
          tiendasActivas = tiendasArray.filter((t: Tienda) => t.activa);
          console.log('🏪 Tiendas activas:', tiendasActivas);
          setTiendas(tiendasActivas);
        }
      }

      // Procesar categorías
      if (categoriasRes.ok) {
        const categoriasData = await categoriasRes.json();
        console.log('📂 Categorías response RAW:', categoriasData);
        console.log('📂 Tipo de datos recibidos:', typeof categoriasData, Array.isArray(categoriasData));
        
        // Manejar tanto formato {success: true, data: [...]} como array directo
        let categoriasArray = [];
        if (categoriasData.success && Array.isArray(categoriasData.data)) {
          // Formato con success/data
          categoriasArray = categoriasData.data;
        } else if (Array.isArray(categoriasData)) {
          // Array directo
          categoriasArray = categoriasData;
        } else {
          console.error('❌ Formato incorrecto en categorías response:', categoriasData);
        }
        
        if (categoriasArray.length > 0) {
          categoriasActivas = categoriasArray.filter((c: Categoria) => c.activa);
          console.log('📂 Categorías activas filtradas:', categoriasActivas);
          console.log('📂 Primera categoría:', categoriasActivas[0]);
          setCategorias(categoriasActivas);
        }
      } else {
        console.error('❌ Error en request categorías:', categoriasRes.status, categoriasRes.statusText);
      }

      // Procesar subcategorías
      if (subcategoriasRes.ok) {
        const subcategoriasData = await subcategoriasRes.json();
        console.log('📁 Subcategorías response:', subcategoriasData);
        
        // Manejar tanto formato {success: true, data: [...]} como array directo
        let subcategoriasArray = [];
        if (subcategoriasData.success && Array.isArray(subcategoriasData.data)) {
          subcategoriasArray = subcategoriasData.data;
        } else if (Array.isArray(subcategoriasData)) {
          subcategoriasArray = subcategoriasData;
        }
        
        if (subcategoriasArray.length > 0) {
          subcategoriasActivas = subcategoriasArray.filter((s: Subcategoria) => s.activa);
          console.log('📁 Subcategorías activas:', subcategoriasActivas);
          setSubcategorias(subcategoriasActivas);
        }
      }

      // Actualizar el estado organizacionesData para el modal
      const nuevosOrganizacionesData = {
        zonas: zonasActivas,
        ciudades: ciudadesActivas,
        tiendas: tiendasActivas,
        categorias: categoriasActivas,
        subcategorias: subcategoriasActivas
      };
      
      console.log('📦 Datos preparados para organizacionesData:', {
        zonasLength: nuevosOrganizacionesData.zonas.length,
        ciudadesLength: nuevosOrganizacionesData.ciudades.length,
        tiendasLength: nuevosOrganizacionesData.tiendas.length,
        categoriasLength: nuevosOrganizacionesData.categorias.length,
        subcategoriasLength: nuevosOrganizacionesData.subcategorias.length,
        primeraCategoria: nuevosOrganizacionesData.categorias[0],
        primeraZona: nuevosOrganizacionesData.zonas[0]
      });
      setOrganizacionesData(nuevosOrganizacionesData);

      // Verificar que los datos se asignaron correctamente
      setTimeout(() => {
        console.log('🔍 Verificación post-asignación organizacionesData:', {
          categoriasLength: nuevosOrganizacionesData.categorias.length,
          zonasLength: nuevosOrganizacionesData.zonas.length,
          sample: nuevosOrganizacionesData.categorias[0]
        });
      }, 100);

      console.log('✅ Todos los datos de organizaciones procesados y organizacionesData actualizado');

    } catch (error) {
      console.error('❌ Error al cargar datos de organizaciones:', error);
      setZonas([]);
      setCiudades([]);
      setTiendas([]);
      setCategorias([]);
      setSubcategorias([]);
      // Limpiar también organizacionesData
      setOrganizacionesData({
        zonas: [],
        ciudades: [],
        tiendas: [],
        categorias: [],
        subcategorias: []
      });
    } finally {
      setCargandoOrganizaciones(false);
    }
  };

  // Cargar OTs para vista de Tiendas
  const cargarOTsTiendas = async (pagina: number = paginaActualTiendas) => {
    try {
      setLoading(true);
      console.log(`🔄 Cargando OTs Tiendas - Página ${pagina}...`);
      
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      // Por ahora cargamos todas las OTs y luego filtramos (mejoraremos esto después)
      const endpoint = `${FASTAPI_BASE_URL}/ots?page=1&per_page=0`; // per_page=0 para obtener todas
      
      console.log('� DEBUG CRÍTICO - FASTAPI_BASE_URL:', FASTAPI_BASE_URL);
      console.log('🚨 DEBUG CRÍTICO - endpoint completo:', endpoint);
      console.log('�📡 Endpoint OTs Tiendas:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response OTs Tiendas:', data);
        
        // Formatear todas las OTs
        const todasOtsFormateadas = (data.data || []).map((ot: any) => ({
          fechaCreacion: ot.fecha || formatearFechaConsistente(ot.fecha_creacion),
          fechaVisita: ot.fecha_visita || 'Por programar',
          folio: ot.folio,
          asunto: ot.asunto || 'Sin asunto',
          categoria: ot.categoria || 'Sin categoría',
          subcategoria: ot.subcategoria || 'Sin subcategoría',
          zona: ot.zona || 'Sin zona',
          ciudad: ot.ciudad || 'Sin ciudad',
          tienda: ot.tienda || 'Sin tienda',
          planta: ot.planta || '',
          activo: ot.activo || '',
          tipo_formulario: ot.tipo_formulario || 'b2c',
          tecnicoAsignado: ot.tecnico_asignado || 'Sin asignar',
          etapa: ot.etapa || 'Pendiente',
          usuario: 'Usuario', // Este campo se puede obtener de la solicitud si es necesario
          descripcion: ot.notas_adicionales || 'Sin descripción',
          prioridad: ot.prioridad || 'media'
        }));
        
        // 🎯 FILTRAR OTs DE TIENDAS
        const otsTiendasCompletas = todasOtsFormateadas.filter((ot: any) => 
          ot.tipo_formulario === 'b2c' || (ot.zona !== 'Planta San Pedro' && ot.zona && ot.ciudad && ot.tienda)
        );
        
        // Aplicar paginación del lado del cliente para Tiendas
        const totalTiendas = otsTiendasCompletas.length;
        const indiceInicio = (pagina - 1) * elementosPorPagina;
        const indiceFin = indiceInicio + elementosPorPagina;
        const otsTiendasPaginadas = otsTiendasCompletas.slice(indiceInicio, indiceFin);
        
        // Actualizar metadatos de paginación para Tiendas
        setTotalElementosTiendas(totalTiendas);
        setTotalPaginasTiendas(Math.ceil(totalTiendas / elementosPorPagina));
        setPaginaActualTiendas(pagina);
        
        console.log(`✅ OTs Tiendas - Página ${pagina}, Total: ${totalTiendas}, Mostrando: ${otsTiendasPaginadas.length}`);
        
        setOtsTiendas(otsTiendasPaginadas);
      } else {
        console.error('❌ Error HTTP al cargar OTs:', response.status, response.statusText);
        if (response.status === 401 || response.status === 422) {
          logout();
        }
        setError('Error al cargar las OTs');
        setOtsData([]);
      }
    } catch (error) {
      console.error('❌ Error al conectar con FastAPI para OTs:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido al cargar OTs');
      setOtsData([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar OTs para vista de Planta San Pedro
  const cargarOTsPlantaSP = async (pagina: number = paginaActualPlantaSP) => {
    try {
      setLoading(true);
      console.log(`🔄 Cargando OTs Planta San Pedro - Página ${pagina}...`);
      
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const endpoint = `${FASTAPI_BASE_URL}/ots?page=1&per_page=0`; // per_page=0 para obtener todas
      
      console.log('📡 Endpoint OTs Planta SP:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response OTs Planta SP:', data);
        
        // Formatear todas las OTs
        const todasOtsFormateadas = (data.data || []).map((ot: any) => ({
          fechaCreacion: ot.fecha || formatearFechaConsistente(ot.fecha_creacion),
          fechaVisita: ot.fecha_visita || 'Por programar',
          folio: ot.folio,
          asunto: ot.asunto || 'Sin asunto',
          categoria: ot.categoria || 'Sin categoría',
          subcategoria: ot.subcategoria || 'Sin subcategoría',
          zona: ot.zona || 'Sin zona',
          ciudad: ot.ciudad || 'Sin ciudad',
          tienda: ot.tienda || 'Sin tienda',
          planta: ot.planta || '',
          activo: ot.activo || '',
          tipo_formulario: ot.tipo_formulario || 'b2c',
          tecnicoAsignado: ot.tecnico_asignado || 'Sin asignar',
          etapa: ot.etapa || 'Pendiente',
          usuario: 'Usuario',
          descripcion: ot.notas_adicionales || 'Sin descripción',
          prioridad: ot.prioridad || 'media'
        }));
        
        // 🎯 FILTRAR OTs DE PLANTA SAN PEDRO
        const otsPlantaCompletas = todasOtsFormateadas.filter((ot: any) => 
          ot.tipo_formulario === 'planta_san_pedro' || ot.zona === 'Planta San Pedro' || (ot.planta || ot.activo)
        );
        
        // Aplicar paginación del lado del cliente para Planta SP
        const totalPlanta = otsPlantaCompletas.length;
        const indiceInicio = (pagina - 1) * elementosPorPagina;
        const indiceFin = indiceInicio + elementosPorPagina;
        const otsPlantaPaginadas = otsPlantaCompletas.slice(indiceInicio, indiceFin);
        
        // Actualizar metadatos de paginación para Planta SP
        setTotalElementosPlantaSP(totalPlanta);
        setTotalPaginasPlantaSP(Math.ceil(totalPlanta / elementosPorPagina));
        setPaginaActualPlantaSP(pagina);
        
        console.log(`✅ OTs Planta SP - Página ${pagina}, Total: ${totalPlanta}, Mostrando: ${otsPlantaPaginadas.length}`);
        
        setOtsPlantaSP(otsPlantaPaginadas);
      } else {
        console.error('❌ Error HTTP al cargar OTs Planta SP:', response.status, response.statusText);
        if (response.status === 401 || response.status === 422) {
          logout();
        }
        setError('Error al cargar las OTs de Planta San Pedro');
        setOtsPlantaSP([]);
      }
    } catch (error) {
      console.error('❌ Error al conectar con FastAPI para OTs Planta SP:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido al cargar OTs Planta SP');
      setOtsPlantaSP([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar OTs Comerciales
  const cargarOTsComercial = async (pagina: number = paginaActualComercial) => {
    try {
      setLoading(true);
      console.log(`🔄 Cargando OTs Comerciales - Página ${pagina}...`);
      
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const endpoint = `${FASTAPI_BASE_URL}/b2b/ots?page=1&per_page=0`; // per_page=0 para obtener todas
      
      console.log('📡 Endpoint OTs Comerciales:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response OTs Comerciales:', data);
        
        // Formatear todas las OTs comerciales
        const otsComerciales = (data.data || data || []).map((ot: any) => ({
          fechaCreacion: ot.fecha || formatearFechaConsistente(ot.fecha_creacion),
          fechaVisita: ot.fecha_visita || 'Por programar',
          folio: ot.folio,
          asunto: ot.asunto || 'Sin asunto',
          categoria: ot.categoria?.nombre || 'Sin categoría',
          subcategoria: ot.subcategoria?.nombre || 'Sin subcategoría',
          ciudad: ot.ciudad?.nombre || 'Sin ciudad',
          razon_social: ot.razon_social?.nombre || 'Sin razón social',
          sucursal: ot.sucursal?.nombre || 'Sin sucursal',
          equipos: ot.equipo?.nombre || 'Sin equipo',
          tipo_formulario: 'b2b',
          tecnicoAsignado: ot.tecnico_asignado || 'Sin asignar',
          etapa: ot.etapa || 'Pendiente',
          usuario: 'Usuario',
          descripcion: ot.notas_adicionales || 'Sin descripción',
          prioridad: ot.prioridad || 'media'
        }));
        
        // Aplicar paginación del lado del cliente para Comerciales
        const totalComercial = otsComerciales.length;
        const indiceInicio = (pagina - 1) * elementosPorPagina;
        const indiceFin = indiceInicio + elementosPorPagina;
        const otsComercialPaginadas = otsComerciales.slice(indiceInicio, indiceFin);
        
        // Actualizar metadatos de paginación para Comerciales
        setTotalElementosComercial(totalComercial);
        setTotalPaginasComercial(Math.ceil(totalComercial / elementosPorPagina));
        setPaginaActualComercial(pagina);
        
        console.log(`✅ OTs Comerciales - Página ${pagina}, Total: ${totalComercial}, Mostrando: ${otsComercialPaginadas.length}`);
        
        setOtsComercial(otsComercialPaginadas);
      } else {
        console.error('❌ Error HTTP al cargar OTs Comerciales:', response.status, response.statusText);
        if (response.status === 401 || response.status === 422) {
          logout();
        }
        setError('Error al cargar las OTs Comerciales');
        setOtsComercial([]);
      }
    } catch (error) {
      console.error('❌ Error al conectar con FastAPI para OTs Comerciales:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido al cargar OTs Comerciales');
      setOtsComercial([]);
    } finally {
      setLoading(false);
    }
  };

  // Estados para controlar carga inicial
  const [cargaInicialCompleta, setCargaInicialCompleta] = useState(false);

  // Función unificada para cargar todas las OTs y separarlas
  const cargarTodasLasOTs = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando todas las OTs...');
      
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
      
      // Cargar OTs B2C y Planta San Pedro
      const endpoint = `${FASTAPI_BASE_URL}/ots?page=1&per_page=0`; // per_page=0 para obtener todas
      
      console.log('🚨🚨🚨 ESTA ES LA LLAMADA PROBLEMÁTICA 🚨🚨🚨');
      console.log('🚨 FASTAPI_BASE_URL EN cargarTodasLasOTs:', FASTAPI_BASE_URL);
      console.log('🚨 endpoint FINAL EN cargarTodasLasOTs:', endpoint);
      const response = await fetch(endpoint, { method: 'GET', headers });

      // Cargar OTs comerciales B2B
      const endpointB2B = `${FASTAPI_BASE_URL}/b2b/ots`;
      const responseB2B = await fetch(endpointB2B, { method: 'GET', headers });
      
      let todasOtsFormateadas: any[] = [];
      let otsComerciales: any[] = [];

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response OTs B2C/Planta:', data);
        
        // Formatear OTs B2C y Planta San Pedro
        todasOtsFormateadas = (data.data || []).map((ot: any) => ({
          fechaCreacion: ot.fecha || formatearFechaConsistente(ot.fecha_creacion),
          fechaVisita: ot.fecha_visita || 'Por programar',
          folio: ot.folio,
          asunto: ot.asunto || 'Sin asunto',
          categoria: ot.categoria || 'Sin categoría',
          subcategoria: ot.subcategoria || 'Sin subcategoría',
          zona: ot.zona || 'Sin zona',
          ciudad: ot.ciudad || 'Sin ciudad',
          tienda: ot.tienda || 'Sin tienda',
          planta: ot.planta || '',
          activo: ot.activo || '',
          tipo_formulario: ot.tipo_formulario || 'b2c',
          tecnicoAsignado: ot.tecnico_asignado || 'Sin asignar',
          etapa: ot.etapa || 'Pendiente',
          usuario: 'Usuario',
          descripcion: ot.notas_adicionales || 'Sin descripción',
          prioridad: ot.prioridad || 'media'
        }));
      }

      // Procesar OTs comerciales B2B
      if (responseB2B.ok) {
        const dataB2B = await responseB2B.json();
        console.log('✅ Response OTs comerciales B2B:', dataB2B);
        
        otsComerciales = (dataB2B.data || []).map((ot: any) => ({
          fechaCreacion: formatearFechaConsistente(ot.fecha_creacion),
          fechaVisita: ot.fecha_visita || 'Por programar',
          folio: ot.folio,
          asunto: ot.asunto || 'Sin asunto',
          categoria: ot.categoria?.nombre || 'Sin categoría',
          subcategoria: ot.subcategoria?.nombre || 'Sin subcategoría',
          zona: 'Comercial B2B',
          ciudad: ot.ciudad?.nombre || 'Sin ciudad',
          tienda: '', // No aplica para B2B
          planta: '', // No aplica para B2B
          activo: '', // No aplica para B2B
          razon_social: ot.razon_social?.nombre || 'N/A',
          sucursal: ot.sucursal?.nombre || 'N/A',
          equipos: ot.equipo?.nombre || 'N/A',
          tipo_formulario: 'comercial',
          tecnicoAsignado: ot.tecnico_asignado || 'Sin asignar',
          etapa: ot.etapa || 'Pendiente',
          usuario: 'Usuario',
          descripcion: ot.descripcion || 'Sin descripción',
          prioridad: ot.prioridad || 'media'
        }));
        setOtsComercial(otsComerciales);
        console.log(`✅ OTs comerciales cargadas: ${otsComerciales.length}`);
      } else {
        setOtsComercial([]);
        console.log('⚠️ No se pudieron cargar OTs comerciales o no existen');
      }

      if (response.ok) {
        // Guardar todas las OTs B2C/Planta para uso global
        setOtsData(todasOtsFormateadas);
        
        // Aplicar paginación separada
        aplicarPaginacionTiendas(todasOtsFormateadas, paginaActualTiendas);
        aplicarPaginacionPlantaSP(todasOtsFormateadas, paginaActualPlantaSP);
        aplicarPaginacionComercial(otsComerciales, paginaActualComercial);
        
        return todasOtsFormateadas;
      } else {
        console.error('❌ Error HTTP al cargar OTs:', response.status, response.statusText);
        if (response.status === 401 || response.status === 422) {
          logout();
        }
        setError('Error al cargar las OTs');
        return [];
      }
    } catch (error) {
      console.error('❌ Error al conectar con FastAPI:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido al cargar OTs');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Función para aplicar paginación a Tiendas
  const aplicarPaginacionTiendas = (todasOts: any[], pagina: number) => {
    const otsTiendasCompletas = todasOts.filter((ot: any) => 
      ot.tipo_formulario === 'b2c' || (ot.zona !== 'Planta San Pedro' && ot.zona && ot.ciudad && ot.tienda)
    );
    
    const totalTiendas = otsTiendasCompletas.length;
    const indiceInicio = (pagina - 1) * elementosPorPagina;
    const indiceFin = indiceInicio + elementosPorPagina;
    const otsTiendasPaginadas = otsTiendasCompletas.slice(indiceInicio, indiceFin);
    
    setTotalElementosTiendas(totalTiendas);
    setTotalPaginasTiendas(Math.ceil(totalTiendas / elementosPorPagina));
    setPaginaActualTiendas(pagina);
    setOtsTiendas(otsTiendasPaginadas);
    
    console.log(`✅ Tiendas - Página ${pagina}, Total: ${totalTiendas}, Mostrando: ${otsTiendasPaginadas.length}`);
  };

  // Función para aplicar paginación a Planta San Pedro
  const aplicarPaginacionPlantaSP = (todasOts: any[], pagina: number) => {
    const otsPlantaCompletas = todasOts.filter((ot: any) => 
      ot.tipo_formulario === 'planta_san_pedro' || ot.zona === 'Planta San Pedro' || (ot.planta || ot.activo)
    );
    
    const totalPlanta = otsPlantaCompletas.length;
    const indiceInicio = (pagina - 1) * elementosPorPagina;
    const indiceFin = indiceInicio + elementosPorPagina;
    const otsPlantaPaginadas = otsPlantaCompletas.slice(indiceInicio, indiceFin);
    
    setTotalElementosPlantaSP(totalPlanta);
    setTotalPaginasPlantaSP(Math.ceil(totalPlanta / elementosPorPagina));
    setPaginaActualPlantaSP(pagina);
    setOtsPlantaSP(otsPlantaPaginadas);
    
    console.log(`✅ Planta SP - Página ${pagina}, Total: ${totalPlanta}, Mostrando: ${otsPlantaPaginadas.length}`);
  };

  // Función para aplicar paginación a Comercial
  const aplicarPaginacionComercial = (otsComerciales: any[], pagina: number) => {
    const totalComercial = otsComerciales.length;
    const indiceInicio = (pagina - 1) * elementosPorPagina;
    const indiceFin = indiceInicio + elementosPorPagina;
    const otsComercialPaginadas = otsComerciales.slice(indiceInicio, indiceFin);
    
    setTotalElementosComercial(totalComercial);
    setTotalPaginasComercial(Math.ceil(totalComercial / elementosPorPagina));
    setPaginaActualComercial(pagina);
    // No necesitamos setOtsComercial aquí porque ya se hace en la función principal
    
    console.log(`✅ Comercial - Página ${pagina}, Total: ${totalComercial}, Mostrando: ${otsComercialPaginadas.length}`);
  };

  // Cargar datos iniciales
  useEffect(() => {
    // Solo ejecutar en el cliente después de la hidratación
    if (!isClient) return;
    
    const cargarDatosIniciales = async () => {
      try {
        console.log('🚀 Iniciando carga de datos...');
        await cargarTecnicos();
        await cargarTodasLasOTs();
        await fetchOrganizacionesData();
        setCargaInicialCompleta(true);
        console.log('✅ Carga inicial completada');
      } catch (error) {
        console.error('❌ Error en carga inicial:', error);
      }
    };
    
    cargarDatosIniciales();
  }, [isClient]);

  // Leer parámetros de URL para establecer vista inicial
  useEffect(() => {
    const vista = searchParams.get('vista');
    if (vista === 'comercial') {
      setVistaActual('comercial');
    } else if (vista === 'planta-san-pedro') {
      setVistaActual('planta-san-pedro');
    } else if (vista === 'general') {
      setVistaActual('general');
    }
  }, [searchParams]);

  // Recargar OTs Tiendas cuando cambie la página (después de carga inicial)
  useEffect(() => {
    if (cargaInicialCompleta && otsData.length > 0) {
      console.log(`🔄 Cambio de página Tiendas: ${paginaActualTiendas}`);
      aplicarPaginacionTiendas(otsData, paginaActualTiendas);
    }
  }, [paginaActualTiendas, cargaInicialCompleta, otsData]);

  // Recargar OTs Planta SP cuando cambie la página (después de carga inicial)
  useEffect(() => {
    if (cargaInicialCompleta && otsData.length > 0) {
      console.log(`🔄 Cambio de página Planta SP: ${paginaActualPlantaSP}`);
      aplicarPaginacionPlantaSP(otsData, paginaActualPlantaSP);
    }
  }, [paginaActualPlantaSP, cargaInicialCompleta, otsData]);

  // Debug: Observar cambios en organizacionesData
  useEffect(() => {
    console.log('🔍 organizacionesData actualizado:', {
      zonas: organizacionesData.zonas.length,
      ciudades: organizacionesData.ciudades.length,
      tiendas: organizacionesData.tiendas.length,
      categorias: organizacionesData.categorias.length,
      subcategorias: organizacionesData.subcategorias.length,
      data: organizacionesData
    });
  }, [organizacionesData]);

  // Función para formatear fecha de manera consistente (evita hidratación)
  const formatearFechaConsistente = (fechaStr: string) => {
    if (!fechaStr) return '';
    try {
      // Si ya está en formato DD/MM/YYYY, devolverla tal como está
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaStr)) {
        return fechaStr;
      }
      // Si es un timestamp o fecha ISO, convertirla
      const fecha = new Date(fechaStr);
      if (isNaN(fecha.getTime())) return fechaStr;
      
      const dia = fecha.getDate().toString().padStart(2, '0');
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const año = fecha.getFullYear();
      return `${dia}/${mes}/${año}`;
    } catch {
      return fechaStr;
    }
  };

  // Función para convertir Date a string DD/MM/YYYY
  const dateToString = (date: Date | null): string => {
    if (!date) return "";
    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const año = date.getFullYear();
    return `${dia}/${mes}/${año}`;
  };

  // Función para convertir string de fecha a objeto Date
  const parseDate = (dateStr: string) => {
    // Si es formato DD/MM/YYYY
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    // Si es formato ISO (YYYY-MM-DDTHH:mm:ss), usar directamente
    if (dateStr.includes('T') || dateStr.includes('-')) {
      return new Date(dateStr);
    }
    // Fallback: intentar parsear como fecha
    return new Date(dateStr);
  };

  // Función para verificar si una fecha está dentro del rango
  const isDateInRange = (dateStr: string) => {
    if (!fechaDesde || !fechaHasta) return true;
    
    const date = parseDate(dateStr);
    
    return date >= fechaDesde && date <= fechaHasta;
  };

  // 🎯 SELECCIONAR DATASET SEGÚN VISTA ACTUAL
  const getOTsParaVistaActual = () => {
    if (vistaActual === 'planta-san-pedro') {
      return otsPlantaSP;
    } else if (vistaActual === 'comercial') {
      return otsComercial;
    } else {
      return otsTiendas;
    }
  };

  // Filtrado por búsqueda y fechas
  const filteredOTs = getOTsParaVistaActual().filter(ot => {
    // Primero filtramos por el término de búsqueda
    const searchLower = searchTerm.toLowerCase();
    const matchesSearchTerm = !searchTerm || (
      ot.asunto.toLowerCase().includes(searchLower) ||
      String(ot.folio).toLowerCase().includes(searchLower) ||
      (ot.tienda || '').toLowerCase().includes(searchLower) ||
      (ot.planta || '').toLowerCase().includes(searchLower) ||
      (ot.activo || '').toLowerCase().includes(searchLower) ||
      ot.tecnicoAsignado.toLowerCase().includes(searchLower) ||
      ot.categoria.toLowerCase().includes(searchLower) ||
      ot.subcategoria.toLowerCase().includes(searchLower) ||
      ot.zona.toLowerCase().includes(searchLower) ||
      ot.ciudad.toLowerCase().includes(searchLower) ||
      ot.etapa.toLowerCase().includes(searchLower)
    );
    
    // Luego verificamos si está en el rango de fechas (usando fecha de visita)
    // Si no hay fecha de visita programada, incluir en resultados
    let matchesDateRange = true;
    if (ot.fechaVisita && ot.fechaVisita !== 'Por programar') {
      matchesDateRange = isDateInRange(ot.fechaVisita);
    }
    
    // Debe cumplir ambas condiciones
    return matchesSearchTerm && matchesDateRange;
  });

  const navigationItems = [
    { name: "ORGANIZACIONES", icon: Settings, href: "/organizaciones" },
    { name: "OTS", icon: ClipboardList, href: "/ots" },
    { name: "SOLICITUDES", icon: FileText, href: "/solicitudes" },
  ]
  
  // Establecer el tipo de usuario cuando se carga la página del admin
  useEffect(() => {
    localStorage.setItem('userType', 'admin');
  }, []);

  const handleNavigation = (href: string) => {
    // Si está navegando a una OT, marcar que viene del admin
    if (href.startsWith('/ots/')) {
      localStorage.setItem('userType', 'admin');
    }
    router.push(href);
  }

  const handleLogout = () => {
    logout();
  }
  
  // Función para manejar el cambio de etapa
  const handleCambioEtapa = async (index: number, nuevaEtapa: string, event: React.MouseEvent) => {
    // Detener la propagación para evitar que se navegue al detalle de la OT
    event.stopPropagation();
    
    try {
      const otActual = otsData[index];
      console.log(`🔄 Cambiando etapa de OT ${otActual.folio} a: ${nuevaEtapa}`);
      
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const endpoint = `${FASTAPI_BASE_URL}/etapas/ots/${otActual.folio}/etapa`;
      
      console.log('📡 Endpoint cambio etapa:', endpoint);
      
      // Llamar al endpoint para cambiar la etapa
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          estado: nuevaEtapa
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          // Actualizar el estado local solo si la actualización fue exitosa
          const nuevasOTs = [...otsData];
          nuevasOTs[index].etapa = nuevaEtapa;
          setOtsData(nuevasOTs);
          
          console.log('✅ Etapa actualizada exitosamente:', result.data);
          
          // Mostrar modal de confirmación elegante
          setCambioEtapaInfo({
            mostrar: true,
            folio: otActual.folio,
            etapaAnterior: otActual.etapa,
            etapaNueva: nuevaEtapa
          });
          setMostrarModalCambioEtapa(true);
        } else {
          console.error('❌ Error en respuesta del servidor:', result.message);
          alert(`Error al cambiar la etapa: ${result.message}`);
        }
      } else {
        const errorResult = await response.json().catch(() => ({}));
        
        console.log('🔍 DEBUG - Response status:', response.status);
        console.log('🔍 DEBUG - errorResult:', errorResult);
        console.log('🔍 DEBUG - campos_faltantes:', errorResult.campos_faltantes);
        console.log('🔍 DEBUG - Condición:', response.status === 400 && errorResult.campos_faltantes);
        
        // Error 400 con campos faltantes (validación de campos obligatorios)
        if (response.status === 400 && errorResult.campos_faltantes) {
          console.log('✅ Entrando al bloque de modal de campos faltantes');
          setCamposFaltantesInfo({
            folio: otActual.folio,
            campos: errorResult.campos_faltantes
          });
          setMostrarModalCamposFaltantes(true);
          // NO ejecutar el else - salir aquí
        } else if (response.status === 401 || response.status === 422) {
          logout();
        } else if (response.status !== 400) {
          // Solo mostrar alert si NO es error 400 (para evitar mostrar alert cuando hay modal)
          const errorMsg = errorResult.error || `Error del servidor: ${response.status}`;
          console.error('❌ Error HTTP al cambiar etapa:', response.status, response.statusText);
          alert(`Error al cambiar la etapa: ${errorMsg}`);
        }
      }
      
    } catch (error: any) {
      console.error('❌ Error al cambiar etapa:', error);
      // No mostrar alert si ya se mostró el modal de campos faltantes
      if (!mostrarModalCamposFaltantes) {
        alert(`Error al cambiar la etapa: ${error.message}`);
      }
    } finally {
      // Cerrar el dropdown
      setOtConDropdownAbierto(null);
    }
  }
  
  // Función para manejar el clic en el selector de etapa
  const toggleDropdown = (index: number, event: React.MouseEvent) => {
    // Detener la propagación para evitar que se navegue al detalle de la OT
    event.stopPropagation();
    
    // Si ya está abierto, cerrarlo; si no, abrirlo
    if (otConDropdownAbierto === index) {
      setOtConDropdownAbierto(null);
    } else {
      setOtConDropdownAbierto(index);
    }
  }
  
  // Efecto para cerrar el dropdown cuando se hace clic fuera de él
  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (otConDropdownAbierto !== null &&
          dropdownRefs.current[otConDropdownAbierto] &&
          !dropdownRefs.current[otConDropdownAbierto]?.contains(event.target as Node)) {
        setOtConDropdownAbierto(null);
      }
    }
    
    // Añadir el event listener cuando hay un dropdown abierto
    if (otConDropdownAbierto !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    // Limpiar el event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [otConDropdownAbierto]);

  // Funciones para manejar la eliminación de OTs
  const handleEliminarOT = async () => {
    if (!otAEliminar) return;
    
    setEliminando(true);
    
    try {
      console.log(`🗑️ Eliminando OT: ${otAEliminar.folio}`);
      
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const endpoint = `${FASTAPI_BASE_URL}/ots/delete/${otAEliminar.folio}`;
      
      console.log('📡 Endpoint eliminar OT:', endpoint);
      
      // Llamar al endpoint para eliminar
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      console.log(`📡 Response status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Response eliminar OT:', result);
        
        if (result.success) {
          console.log(`✅ OT ${otAEliminar.folio} eliminada exitosamente`);
          
          // Eliminar la OT de todos los estados
          setOtsData(otsData.filter(ot => ot.folio !== otAEliminar.folio));
          setOtsTiendas(otsTiendas.filter(ot => ot.folio !== otAEliminar.folio));
          setOtsPlantaSP(otsPlantaSP.filter(ot => ot.folio !== otAEliminar.folio));
          
          setEliminando(false);
          setEliminacionExitosa(true);
          
          // Cerrar modal después de mostrar éxito
          setTimeout(() => {
            setMostrarModalEliminar(false);
            setOtAEliminar(null);
            setEliminacionExitosa(false);
          }, 1500);
        } else {
          console.error('❌ Error en respuesta del servidor:', result.message);
          throw new Error(result.error || result.message || 'Error al eliminar la OT');
        }
      } else {
        console.error(`❌ Error HTTP al eliminar OT: ${response.status}`);
        if (response.status === 401 || response.status === 422) {
          logout();
        }
        const errorText = await response.text();
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
      }
      
    } catch (error) {
      setEliminando(false);
      console.error('❌ Error al eliminar:', error);
      
      let errorMessage = 'Error desconocido';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Si es un error de red (Failed to fetch), proporcionar un mensaje más claro
      if (errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Error de conexión con el servidor. Verifique que el backend esté ejecutándose.';
      }
      
      alert(`Error al eliminar la OT: ${errorMessage}`);
    }
  };

  const confirmarEliminacionOT = (ot: any) => {
    setOtAEliminar(ot);
    setMostrarModalEliminar(true);
  };

  const cancelarEliminacionOT = () => {
    setMostrarModalEliminar(false);
    setOtAEliminar(null);
    setEliminando(false);
    setEliminacionExitosa(false);
  };
  
  // Funciones para manejar la creación de OT
  const handleCrearOT = async () => {
    // Validaciones básicas
    if (!nuevaOT.categoria || !nuevaOT.subcategoria || !nuevaOT.zona || 
        !nuevaOT.ciudad || !nuevaOT.tienda || !nuevaOT.tecnico || 
        !nuevaOT.descripcion) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    setCreandoOT(true);
    
    try {
      console.log('📝 Creando nueva OT con datos:', nuevaOT);
      
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const endpoint = `${FASTAPI_BASE_URL}/ots/crear-directa`;
      
      console.log('📡 Endpoint crear OT:', endpoint);
      
      // Llamar a la API FastAPI para crear la OT
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          categoria: nuevaOT.categoria,
          subcategoria: nuevaOT.subcategoria,
          zona: nuevaOT.zona,
          ciudad: nuevaOT.ciudad,
          tienda: nuevaOT.tienda,
          tecnico_asignado: nuevaOT.tecnico,
          tipo_mantenimiento: nuevaOT.tipoMantenimiento || "Correctivo",
          prioridad: nuevaOT.prioridad || "Media",
          fecha_programada: nuevaOT.fechaProgramada || null,
          descripcion: nuevaOT.descripcion,
          observaciones: nuevaOT.observaciones || "",
          asunto: nuevaOT.descripcion || "Nueva OT de mantenimiento",
          estado: "Ot Asignada Tcq"
        })
      });

      if (response.ok) {
        const resultado = await response.json();
        console.log('✅ Response crear OT:', resultado);
        
        if (resultado.success) {
          console.log('✅ OT creada exitosamente:', resultado.data);
          
          // Crear la nueva OT para mostrar en la tabla con el formato correcto
          const fechaCreacion = formatearFechaConsistente(new Date().toISOString());
          
          const nuevaOTCreada = {
            fechaCreacion: fechaCreacion,
            fechaVisita: nuevaOT.fechaProgramada ? formatearFechaConsistente(nuevaOT.fechaProgramada) : 'Por programar',
            folio: resultado.data.folio.toString(),
            asunto: resultado.data.asunto || nuevaOT.descripcion,
            categoria: nuevaOT.categoria,
            subcategoria: nuevaOT.subcategoria,
            zona: nuevaOT.zona,
            ciudad: nuevaOT.ciudad,
            tienda: nuevaOT.tienda,
            usuario: "Sistema",
            descripcion: nuevaOT.descripcion,
            tecnicoAsignado: nuevaOT.tecnico,
            etapa: "Ot Asignada Tcq",
            tipoMantenimiento: nuevaOT.tipoMantenimiento || "Correctivo",
            prioridad: nuevaOT.prioridad || "Media",
            observaciones: nuevaOT.observaciones || ""
          };
          
          // Agregar al inicio de la lista para que aparezca inmediatamente
          setOtsData([nuevaOTCreada, ...otsData]);
          
          setCreandoOT(false);
          setOtCreada(true);
          
          // Cerrar modal después de mostrar éxito
          setTimeout(() => {
            setMostrarModalCrearOT(false);
            setOtCreada(false);
            // Limpiar formulario
            setNuevaOT({
              categoria: "",
              subcategoria: "",
              zona: "",
              ciudad: "",
              tienda: "",
              tecnico: "",
              tipoMantenimiento: "Correctivo",
              prioridad: "Media",
              fechaProgramada: "",
              descripcion: "",
              observaciones: ""
            });
          }, 1500);
          
        } else {
          console.error('❌ Error en respuesta del servidor:', resultado.message);
          throw new Error(resultado.message || 'Error al crear la OT');
        }
      } else {
        console.error('❌ Error HTTP al crear OT:', response.status, response.statusText);
        if (response.status === 401 || response.status === 422) {
          logout();
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }
      
    } catch (error) {
      setCreandoOT(false);
      console.error('❌ Error al crear OT:', error);
      alert('Error al crear la OT: ' + (error as Error).message);
    }
  };

  // Función para abrir el modal de creación de OT
  const openCrearOTModal = async () => {
    console.log('🔄 Abriendo modal de crear OT y cargando datos...');
    setMostrarModalCrearOT(true);
    // Cargar datos frescos de organizaciones al abrir el modal
    await fetchOrganizacionesData();
  };

  const cancelarCreacionOT = () => {
    setMostrarModalCrearOT(false);
    setOtCreada(false);
    // Limpiar formulario
    setNuevaOT({
      categoria: "",
      subcategoria: "",
      zona: "",
      ciudad: "",
      tienda: "",
      tecnico: "",
      tipoMantenimiento: "",
      prioridad: "",
      fechaProgramada: "",
      descripcion: "",
      observaciones: ""
    });
  };

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
                  <button
                    onClick={() => {
                      router.push(dashboardRoute);
                    }}
                    className="focus:outline-none"
                  >
                    <img
                      src="/images/logo.png"
                      alt="Logo"
                      className="h-12 w-auto object-contain cursor-pointer"
                    />
                  </button>
                </div>
              </div>
              {/* Navigation Menu */}
              <nav className="hidden md:block">
                <div className="ml-30 flex items-baseline space-x-4">
                  {navigationItems.map((item) => (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className={`text-white hover:bg-white/20 px-3 py-2 text-sm font-medium ${
                        item.name === "OTS" ? "bg-white/30" : ""
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
                          onClick={() => handleNavigation('/ajustes')} 
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

        {/* Contenido Principal */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <div className="flex flex-col mb-4 md:mb-0">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Órdenes de Trabajo (OTs)</h1>
                
                {/* Botones de Vista - Solo para áreas TIC y Mantenimiento */}
                {isClient && (user?.area?.toLowerCase() === 'tic' || user?.area?.toLowerCase() === 'mantenimiento' || user?.area?.toLowerCase() === 'mantenimiento planta') && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">
                      {user?.area?.toLowerCase() === 'tic' ? 'Vista TIC:' : 'Vista Mantenimiento:'}
                    </span>
                    <div className="flex bg-white/80 backdrop-blur-md rounded-xl p-1.5 shadow-lg border border-gray-200/50">
                      <Button
                        variant={vistaActual === 'general' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setVistaActual('general')}
                        className={`flex items-center px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                          vistaActual === 'general'
                            ? 'bg-gradient-to-r from-[#00B0B2] to-[#0C6659] text-white shadow-md transform scale-105 hover:shadow-lg'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                        }`}
                        title={user?.area?.toLowerCase() === 'tic' ? 
                          'OTs de tiendas asignadas al área de TIC' : 
                          'OTs de tiendas asignadas al área de Mantenimiento'
                        }
                      >
                        <Store className="w-4 h-4 mr-2" />
                        Tiendas ({otsTiendas.length})
                      </Button>
                      <Button
                        variant={vistaActual === 'planta-san-pedro' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setVistaActual('planta-san-pedro')}
                        className={`flex items-center px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                          vistaActual === 'planta-san-pedro'
                            ? 'bg-gradient-to-r from-[#00B0B2] to-[#0C6659] text-white shadow-md transform scale-105 hover:shadow-lg'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                        }`}
                        title="Todas las OTs de Planta San Pedro (compartidas entre TIC y Mantenimiento)"
                      >
                        <Building2 className="w-4 h-4 mr-2" />
                        Planta San Pedro ({otsPlantaSP.length})
                      </Button>
                      <Button
                        variant={vistaActual === 'comercial' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setVistaActual('comercial');
                          if (otsComercial.length === 0) cargarOTsComercial();
                        }}
                        className={`flex items-center px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                          vistaActual === 'comercial'
                            ? 'bg-gradient-to-r from-[#00B0B2] to-[#0C6659] text-white shadow-md transform scale-105 hover:shadow-lg'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                        }`}
                        title="OTs comerciales B2B"
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Comercial ({otsComercial.length})
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="w-full md:w-80 relative group">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-[#00B0B2] group-hover:text-[#0C6659] transition-colors duration-300" />
                  <Input
                    type="text"
                    placeholder="Buscar por folio, asunto, tienda, técnico..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-4 py-3 w-full bg-white/80 backdrop-blur-md border-2 border-[#00B0B2]/60 rounded-xl shadow-lg hover:shadow-xl hover:border-[#00B0B2] focus:shadow-xl focus:border-[#00B0B2] focus:ring-2 focus:ring-[#00B0B2]/30 transition-all duration-300 text-sm placeholder:text-gray-400"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                      title="Limpiar búsqueda"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filtro de fechas */}
            <div className="mb-4">
              <DateRangeFilter
                initialFrom={fechaDesde}
                initialTo={fechaHasta}
                onDateChange={(dateRange: { from: Date | null; to: Date | null } | undefined) => {
                  setFechaDesde(dateRange?.from || null);
                  setFechaHasta(dateRange?.to || null);
                }}
              />
            </div>
            
            {/* Botones de Acción */}
            <div className="mb-4 flex justify-end items-center">
              <div className="flex gap-3">
                {/* Botón Crear OT */}
                <Button
                  onClick={() => openCrearOTModal()}
                  className="bg-gradient-to-r from-[#00B0B2] to-[#00A0A0] hover:from-[#009B9D] hover:to-[#008B8B] text-white px-6 py-2 rounded-xl font-medium shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105 flex items-center gap-2 border-0 focus:ring-2 focus:ring-[#00B0B2]/50 focus:ring-offset-2"
                >
                  <Plus className="h-5 w-5" />
                  Crear Nueva OT
                </Button>
              </div>
            </div>
          </div>

          {/* Tabla de OTs */}
          <div className="bg-white shadow overflow-hidden border-b border-gray-200 rounded-lg">
            <div className="overflow-y-auto max-h-[85vh] relative table-scroll-container">
              <table ref={tableRef} className="w-full divide-y divide-gray-200 table-with-separators subtle-separators" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('fechaCreacion')}>
                      Fecha Creación
                      <ResizeHandle columnKey="fechaCreacion" />
                    </th>
                    <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('fechaVisita')}>
                      Fecha Visita
                      <ResizeHandle columnKey="fechaVisita" />
                    </th>
                    <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('folio')}>
                      Folio
                      <ResizeHandle columnKey="folio" />
                    </th>
                    <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('asunto')}>
                      Asunto
                      <ResizeHandle columnKey="asunto" />
                    </th>
                    <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('categoria')}>
                      Categoría
                      <ResizeHandle columnKey="categoria" />
                    </th>
                    <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('subcategoria')}>
                      Subcategoría
                      <ResizeHandle columnKey="subcategoria" />
                    </th>
                    {/* Columnas dinámicas según vista */}
                    {vistaActual === 'planta-san-pedro' ? (
                      <>
                        <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('planta')}>
                          Planta
                          <ResizeHandle columnKey="planta" />
                        </th>
                        <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('activo')}>
                          Activo
                          <ResizeHandle columnKey="activo" />
                        </th>
                      </>
                    ) : vistaActual === 'comercial' ? (
                      <>
                        <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('ciudad')}>
                          Ciudad
                          <ResizeHandle columnKey="ciudad" />
                        </th>
                        <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('razon_social')}>
                          Razón Social
                          <ResizeHandle columnKey="razon_social" />
                        </th>
                        <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('sucursal')}>
                          Sucursal
                          <ResizeHandle columnKey="sucursal" />
                        </th>
                        <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('categoria')}>
                          Categoría
                          <ResizeHandle columnKey="categoria" />
                        </th>
                        <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('subcategoria')}>
                          Subcategoría
                          <ResizeHandle columnKey="subcategoria" />
                        </th>
                        <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('equipos')}>
                          Equipos
                          <ResizeHandle columnKey="equipos" />
                        </th>
                      </>
                    ) : (
                      <>
                        <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('zona')}>
                          Zona
                          <ResizeHandle columnKey="zona" />
                        </th>
                        <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('ciudad')}>
                          Ciudad
                          <ResizeHandle columnKey="ciudad" />
                        </th>
                        <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('tienda')}>
                          Tienda
                          <ResizeHandle columnKey="tienda" />
                        </th>
                      </>
                    )}
                    <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('tecnico')}>
                      Técnico
                      <ResizeHandle columnKey="tecnico" />
                    </th>
                    <th scope="col" className="relative px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('etapa')}>
                      Etapa
                      <ResizeHandle columnKey="etapa" />
                    </th>
                    <th scope="col" className="relative px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider group resizable-header" style={getColumnStyle('acciones')}>
                      Acciones
                      <ResizeHandle columnKey="acciones" />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOTs.map((ot, index) => (
                    <tr 
                      key={index} 
                      className="hover:bg-gray-50 cursor-pointer group resizable-row"
                      onClick={() => handleNavigation(`/ots/${ot.folio}`)}
                    >
                      <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('fechaCreacion')} title={isClient ? ot.fechaCreacion : ''}>
                        <div className="cell-content">
                          {isClient ? ot.fechaCreacion : ''}
                        </div>
                      </td>
                      <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('fechaVisita')} title={isClient ? ot.fechaVisita : ''}>
                        <div className={`cell-content ${ot.fechaVisita === 'Por programar' ? 'text-orange-600 italic' : 'text-gray-700'}`}>
                          {isClient ? ot.fechaVisita : ''}
                        </div>
                      </td>
                      <td className="resizable-cell text-sm font-medium text-[#00B0B2]" style={getColumnStyle('folio')} title={ot.folio}>
                        <div className="cell-content font-semibold">
                          {ot.folio}
                        </div>
                      </td>
                      <td className="resizable-cell-expandable text-sm text-gray-900" style={getColumnStyle('asunto')} title={ot.asunto}>
                        <div className="cell-content">
                          {ot.asunto}
                        </div>
                      </td>
                      <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('categoria')} title={ot.categoria}>
                        <div className="cell-content">
                          {ot.categoria}
                        </div>
                      </td>
                      <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('subcategoria')} title={ot.subcategoria}>
                        <div className="cell-content">
                          {ot.subcategoria}
                        </div>
                      </td>
                      {/* Celdas dinámicas según vista */}
                      {vistaActual === 'planta-san-pedro' ? (
                        <>
                          <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('planta')} title={ot.planta || 'Sin planta'}>
                            <div className="cell-content">
                              {ot.planta || 'Sin planta'}
                            </div>
                          </td>
                          <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('activo')} title={ot.activo || 'Sin activo'}>
                            <div className="cell-content">
                              {ot.activo || 'Sin activo'}
                            </div>
                          </td>
                        </>
                      ) : vistaActual === 'comercial' ? (
                        <>
                          <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('ciudad')} title={ot.ciudad}>
                            <div className="cell-content">
                              {ot.ciudad}
                            </div>
                          </td>
                          <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('razon_social')} title={ot.razon_social}>
                            <div className="cell-content">
                              {ot.razon_social}
                            </div>
                          </td>
                          <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('sucursal')} title={ot.sucursal}>
                            <div className="cell-content">
                              {ot.sucursal}
                            </div>
                          </td>
                          <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('categoria')} title={ot.categoria}>
                            <div className="cell-content">
                              {ot.categoria}
                            </div>
                          </td>
                          <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('subcategoria')} title={ot.subcategoria}>
                            <div className="cell-content">
                              {ot.subcategoria}
                            </div>
                          </td>
                          <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('equipos')} title={ot.equipos}>
                            <div className="cell-content">
                              {ot.equipos}
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('zona')} title={ot.zona}>
                            <div className="cell-content">
                              {ot.zona}
                            </div>
                          </td>
                          <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('ciudad')} title={ot.ciudad}>
                            <div className="cell-content">
                              {ot.ciudad}
                            </div>
                          </td>
                          <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('tienda')} title={ot.tienda}>
                            <div className="cell-content">
                              {ot.tienda}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="resizable-cell text-sm text-gray-500" style={getColumnStyle('tecnico')} title={ot.tecnicoAsignado}>
                        <div className="cell-content">
                          {ot.tecnicoAsignado}
                        </div>
                      </td>
                      <td className="resizable-cell text-sm" style={getColumnStyle('etapa')}>
                        <div className={`inline-flex items-center justify-center px-2 py-1 rounded-full border text-center w-full ${
                          ot.etapa === 'Terminada' 
                            ? 'bg-green-50 border-green-200 text-green-800' 
                            : ot.etapa === 'Os En Curso'
                            ? 'bg-blue-50 border-blue-200 text-blue-800'
                            : 'bg-gray-50 border-gray-200 text-gray-800'
                        }`} title={ot.etapa}>
                          <span className="text-xs font-medium cell-content">
                            {ot.etapa}
                          </span>
                        </div>
                      </td>
                      <td 
                        className="resizable-cell text-center" 
                        style={getColumnStyle('acciones')}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                      >
                        <div className="flex items-center justify-center gap-1 w-full">
                          {/* Botón Eliminar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              e.preventDefault();
                              confirmarEliminacionOT(ot);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-50 hover:text-red-600 h-7 w-7 p-0 rounded-full z-10 relative flex-shrink-0"
                            title="Eliminar OT"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Controles de paginación dinámicos por vista */}
            {vistaActual === 'general' && totalPaginasTiendas > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Mostrando {((paginaActualTiendas - 1) * elementosPorPagina) + 1} - {Math.min(paginaActualTiendas * elementosPorPagina, totalElementosTiendas)} de {totalElementosTiendas} OTs de Tiendas
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActualTiendas(1)}
                    disabled={paginaActualTiendas === 1}
                    className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Primera
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    className="min-w-[2.5rem] h-10 px-4 bg-[#00B0B2] hover:bg-[#0C6659] text-white font-medium rounded-lg shadow-sm"
                  >
                    {paginaActualTiendas}
                  </Button>
                  
                  {totalPaginasTiendas > 1 && (
                    <span className="text-gray-400 text-sm px-1">...</span>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActualTiendas(paginaActualTiendas + 1)}
                    disabled={paginaActualTiendas === totalPaginasTiendas}
                    className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
            
            {/* Controles de paginación para vista de Planta San Pedro */}
            {vistaActual === 'planta-san-pedro' && totalPaginasPlantaSP > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Mostrando {((paginaActualPlantaSP - 1) * elementosPorPagina) + 1} - {Math.min(paginaActualPlantaSP * elementosPorPagina, totalElementosPlantaSP)} de {totalElementosPlantaSP} OTs de Planta San Pedro
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActualPlantaSP(1)}
                    disabled={paginaActualPlantaSP === 1}
                    className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Primera
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    className="min-w-[2.5rem] h-10 px-4 bg-[#00B0B2] hover:bg-[#0C6659] text-white font-medium rounded-lg shadow-sm"
                  >
                    {paginaActualPlantaSP}
                  </Button>
                  
                  {totalPaginasPlantaSP > 1 && (
                    <span className="text-gray-400 text-sm px-1">...</span>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActualPlantaSP(paginaActualPlantaSP + 1)}
                    disabled={paginaActualPlantaSP === totalPaginasPlantaSP}
                    className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}

            {/* Controles de paginación para vista Comercial */}
            {vistaActual === 'comercial' && totalPaginasComercial > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Mostrando {((paginaActualComercial - 1) * elementosPorPagina) + 1} - {Math.min(paginaActualComercial * elementosPorPagina, totalElementosComercial)} de {totalElementosComercial} OTs Comerciales
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActualComercial(1)}
                    disabled={paginaActualComercial === 1}
                    className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Primera
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    className="min-w-[2.5rem] h-10 px-4 bg-[#00B0B2] hover:bg-[#0C6659] text-white font-medium rounded-lg shadow-sm"
                  >
                    {paginaActualComercial}
                  </Button>
                  
                  {totalPaginasComercial > 1 && (
                    <span className="text-gray-400 text-sm px-1">...</span>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActualComercial(paginaActualComercial + 1)}
                    disabled={paginaActualComercial === totalPaginasComercial}
                    className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Modal de Eliminación Elegante para OTs */}
        {mostrarModalEliminar && otAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-300">
              {/* Header del Modal */}
              <div className="relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 px-6 py-6">
                <div className="absolute inset-0 bg-red-600/20"></div>
                <div className="relative flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-white">Confirmar Eliminación</h3>
                    <p className="text-red-100 text-sm">Esta acción no se puede deshacer</p>
                  </div>
                </div>
              </div>

              {/* Contenido del Modal */}
              <div className="px-6 py-6">
                {!eliminando && !eliminacionExitosa && (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-gray-800 text-sm">
                        ¿Estás seguro de que deseas eliminar la OT{' '}
                        <span className="font-semibold text-red-600">"{otAEliminar.asunto}"</span>?
                      </p>
                      <p className="text-gray-600 text-xs mt-2">
                        Folio: {otAEliminar.folio} • {otAEliminar.fechaCreacion}
                      </p>
                    </div>
                  </div>
                )}

                {eliminando && (
                  <div className="flex flex-col items-center py-6">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-red-200 border-t-red-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 w-12 h-12 border-2 border-red-100 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-gray-600 mt-4 text-sm">Eliminando OT...</p>
                  </div>
                )}

                {eliminacionExitosa && (
                  <div className="flex flex-col items-center py-6">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">¡Eliminación Exitosa!</h4>
                    <p className="text-gray-600 text-sm text-center">
                      La OT ha sido eliminada correctamente
                    </p>
                  </div>
                )}
              </div>

              {/* Botones del Modal */}
              {!eliminando && !eliminacionExitosa && (
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={cancelarEliminacionOT}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 px-4 py-2"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleEliminarOT}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 flex items-center gap-2 shadow-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Creación de OT */}
        {mostrarModalCrearOT && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100 animate-in zoom-in-95 fade-in">
              {/* Header del Modal */}
              <div className="bg-gradient-to-r from-cyan-50 to-cyan-100 border-b border-cyan-200 px-6 py-4 rounded-t-2xl sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Plus className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Crear Nueva OT</h3>
                      <p className="text-sm text-gray-600">Complete los datos para generar la orden de trabajo</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelarCreacionOT}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Contenido del Modal */}
              {!creandoOT && !otCreada && (
                <div className="px-6 py-6">
                  <div className="space-y-6">
                    {/* Información del Activo */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                        Información del Activo
                        <span className="text-sm text-gray-500 font-normal ml-2">* Campos obligatorios</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Categoría <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={nuevaOT.categoria}
                            onChange={(e) => handleCategoriaChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Seleccionar categoría</option>
                            {cargandoOrganizaciones && (
                              <option disabled>Cargando categorías...</option>
                            )}
                            {!cargandoOrganizaciones && organizacionesData.categorias.length === 0 && (
                              <option disabled>No hay categorías disponibles</option>
                            )}
                            {organizacionesData.categorias.map((categoria) => (
                              <option key={categoria.id} value={categoria.nombre}>
                                {categoria.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subcategoría <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={nuevaOT.subcategoria}
                            onChange={(e) => setNuevaOT({...nuevaOT, subcategoria: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            disabled={!nuevaOT.categoria}
                            required
                          >
                            <option value="">Seleccionar subcategoría</option>
                            {getSubcategoriasPorCategoria(nuevaOT.categoria).map((subcategoria) => (
                              <option key={subcategoria.id} value={subcategoria.nombre}>
                                {subcategoria.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Ubicación */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Ubicación</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Zona <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={nuevaOT.zona}
                            onChange={(e) => handleZonaChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Seleccionar zona</option>
                            {cargandoOrganizaciones && (
                              <option disabled>Cargando zonas...</option>
                            )}
                            {!cargandoOrganizaciones && organizacionesData.zonas.length === 0 && (
                              <option disabled>No hay zonas disponibles</option>
                            )}
                            {organizacionesData.zonas.map((zona) => (
                              <option key={zona.id} value={zona.nombre}>
                                {zona.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ciudad <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={nuevaOT.ciudad}
                            onChange={(e) => handleCiudadChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            disabled={!nuevaOT.zona}
                            required
                          >
                            <option value="">Seleccionar ciudad</option>
                            {getCiudadesPorZona(nuevaOT.zona).map((ciudad) => (
                              <option key={ciudad.id} value={ciudad.nombre}>
                                {ciudad.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tienda <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={nuevaOT.tienda}
                            onChange={(e) => setNuevaOT({...nuevaOT, tienda: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            disabled={!nuevaOT.ciudad}
                            required
                          >
                            <option value="">Seleccionar tienda</option>
                            {getTiendasPorCiudad(nuevaOT.ciudad).map((tienda) => (
                              <option key={tienda.id} value={tienda.nombre}>
                                {tienda.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Técnico <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={nuevaOT.tecnico}
                            onChange={(e) => setNuevaOT({...nuevaOT, tecnico: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Seleccionar técnico</option>
                            {tecnicos.map((tecnico: any) => (
                              <option key={tecnico.id} value={tecnico.nombre}>
                                {tecnico.displayName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Información de la OT */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Información de la OT</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Mantenimiento</label>
                          <select
                            value={nuevaOT.tipoMantenimiento}
                            onChange={(e) => setNuevaOT({...nuevaOT, tipoMantenimiento: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Correctivo">Correctivo</option>
                            <option value="Preventivo">Preventivo</option>
                            <option value="Predictivo">Predictivo</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Prioridad</label>
                          <select
                            value={nuevaOT.prioridad}
                            onChange={(e) => setNuevaOT({...nuevaOT, prioridad: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Baja">Baja</option>
                            <option value="Media">Media</option>
                            <option value="Alta">Alta</option>
                            <option value="Crítica">Crítica</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Programada</label>
                          <Input
                            type="date"
                            value={nuevaOT.fechaProgramada}
                            onChange={(e) => setNuevaOT({...nuevaOT, fechaProgramada: e.target.value})}
                            className="w-full"
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Descripción y Observaciones */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Descripción del Trabajo <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={nuevaOT.descripcion}
                          onChange={(e) => setNuevaOT({...nuevaOT, descripcion: e.target.value})}
                          placeholder="Describa el trabajo a realizar..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
                        <textarea
                          value={nuevaOT.observaciones}
                          onChange={(e) => setNuevaOT({...nuevaOT, observaciones: e.target.value})}
                          placeholder="Observaciones adicionales (opcional)..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Estado de Creación */}
              {creandoOT && (
                <div className="px-6 py-12">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Creando OT...</h4>
                    <p className="text-gray-600 text-sm">Por favor espere mientras se genera la orden de trabajo</p>
                    <div className="flex justify-center space-x-1 mt-4">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Estado de Éxito */}
              {otCreada && (
                <div className="px-6 py-12">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600 animate-pulse" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">¡OT Creada Exitosamente!</h4>
                    <p className="text-gray-600 text-sm">La orden de trabajo ha sido generada correctamente</p>
                  </div>
                </div>
              )}

              {/* Botones del Modal */}
              {!creandoOT && !otCreada && (
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
                  <Button
                    variant="outline"
                    onClick={cancelarCreacionOT}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 px-4 py-2"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCrearOT}
                    className="bg-gradient-to-r from-[#00B0B2] to-[#00A0A0] hover:from-[#009B9D] hover:to-[#008B8B] text-white px-6 py-2 flex items-center gap-2 shadow-lg rounded-lg font-medium transition-all duration-300 hover:shadow-xl transform hover:scale-105 border-0 focus:ring-2 focus:ring-[#00B0B2]/50 focus:ring-offset-2"
                  >
                    <Plus className="h-4 w-4" />
                    Crear OT
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Confirmación de Cambio de Etapa */}
        {mostrarModalCambioEtapa && cambioEtapaInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 opacity-100 animate-in zoom-in-95 fade-in">
              {/* Header del Modal */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">¡Etapa Actualizada!</h3>
                    <p className="text-sm text-gray-600">Cambio realizado exitosamente</p>
                  </div>
                </div>
              </div>

              {/* Contenido del Modal */}
              <div className="px-6 py-6">
                <div className="text-center space-y-4">
                  {/* Animación de éxito */}
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600 animate-pulse" />
                  </div>
                  
                  {/* Mensaje principal */}
                  <div className="space-y-2">
                    <h4 className="text-lg font-medium text-gray-900">Actualización Completada</h4>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">OT:</span> {cambioEtapaInfo.folio}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Nueva Etapa:</span> 
                        <span className="ml-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          {cambioEtapaInfo.etapaNueva}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Indicadores decorativos */}
                  <div className="flex justify-center space-x-1 mt-4">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>

              {/* Botón de confirmación */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl">
                <Button
                  onClick={() => {
                    setMostrarModalCambioEtapa(false);
                    setCambioEtapaInfo(null);
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 rounded-xl font-medium shadow-lg transition-all duration-200 hover:shadow-xl transform hover:scale-105"
                >
                  ¡Perfecto!
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Campos Faltantes - UX Mejorado */}
        {mostrarModalCamposFaltantes && camposFaltantesInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 opacity-100 animate-in zoom-in-95 fade-in">
              {/* Header del Modal */}
              <div className="bg-gradient-to-r from-[#E6F7F7] to-[#CCF0F0] border-b border-[#00B0B2] px-4 sm:px-6 py-4 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="bg-[#CCF0F0] p-2 rounded-full flex-shrink-0">
                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-[#00B0B2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">No se puede cerrar la OT</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Campos obligatorios faltantes</p>
                  </div>
                </div>
              </div>

              {/* Contenido del Modal */}
              <div className="px-4 sm:px-6 py-6">
                <div className="space-y-4">
                  {/* Animación de alerta */}
                  <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-[#CCF0F0] rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-[#00B0B2] animate-pulse" />
                  </div>
                  
                  {/* Mensaje principal */}
                  <div className="space-y-3">
                    <h4 className="text-base sm:text-lg font-medium text-gray-900 text-center">Completa la información requerida</h4>
                    
                    {/* Información de la OT */}
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200">
                      <p className="text-xs sm:text-sm text-gray-600 mb-3">
                        <span className="font-medium">OT:</span> 
                        <span className="ml-2 px-2 py-1 bg-[#CCF0F0] text-[#00B0B2] rounded-full text-xs font-medium">
                          {camposFaltantesInfo.folio}
                        </span>
                      </p>
                      
                      {/* Lista de campos faltantes */}
                      <div className="mt-3">
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Faltan los siguientes campos:</p>
                        <ul className="space-y-2">
                          {camposFaltantesInfo.campos.map((campo, index) => (
                            <li key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                              <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 bg-[#00B0B2] rounded-full"></span>
                              <span className="flex-1 text-gray-700">
                                <span className="font-medium text-[#00B0B2]">{campo}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Mensaje de instrucción */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                      <div className="flex gap-2">
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-blue-800">
                          Por favor, completa estos campos obligatorios antes de cerrar la orden de trabajo.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Indicadores decorativos */}
                  <div className="flex justify-center space-x-1 mt-4">
                    <div className="w-2 h-2 bg-[#00B0B2] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#00B0B2] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-[#00B0B2] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>

              {/* Botón de confirmación */}
              <div className="bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-4 rounded-b-2xl">
                <Button
                  onClick={() => {
                    setMostrarModalCamposFaltantes(false);
                    setCamposFaltantesInfo({folio: '', campos: []});
                  }}
                  className="w-full bg-gradient-to-r from-[#00B0B2] to-[#008C8E] hover:from-[#008C8E] hover:to-[#006B6D] text-white py-2.5 sm:py-3 rounded-xl font-medium shadow-lg transition-all duration-200 hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
                >
                  Entendido, completar campos
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
