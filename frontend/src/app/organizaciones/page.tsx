'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth_context';
import { ProtectedRoute } from '@/components/protected-route';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { useDashboardRoute } from '@/hooks/useDashboardRoute';
import {
  User,
  Building2,
  Users,
  Activity,
  FileText,
  ClipboardList,
  CheckCircle,
  Clock,
  Calendar,
  TrendingUp,
  BarChart2,
  Wrench,
  Settings,
  Percent,
  Timer,
  LogOut,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Package
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Configuración de FastAPI únicamente
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'http://localhost:8000/api/v1';

// Interfaces para los tipos de datos
interface Zona {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activa: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface Ciudad {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activa: boolean;
  zona_id: number;
  zona?: Zona;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface Tienda {
  id: number;
  nombre: string;
  codigo: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  activa: boolean;
  ciudad_id: number;
  ciudad?: Ciudad;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface Categoria {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  icono?: string;
  color: string;
  activa: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface Subcategoria {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activa: boolean;
  categoria_id: number;
  categoria?: Categoria;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface Planta {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activa: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface Activo {
  id: number;
  nombre: string;
  codigo: string;
  tipo: string;
  descripcion?: string;
  activo: boolean;
  planta_id: number;
  planta?: Planta;
  categoria_id: number;
  categoria?: Categoria;
  subcategoria_id: number;
  subcategoria?: Subcategoria;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

// Interfaces específicas para B2B
interface CiudadB2B {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activa: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface RazonSocial {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activa: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface Sucursal {
  id: number;
  nombre: string;
  codigo: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  activa: boolean;
  razon_social_id: number;
  razon_social?: RazonSocial;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface SucursalB2B {
  id: number;
  nombre: string;
  codigo: string;
  direccion?: string;
  telefono?: string;
  activa: boolean;
  ciudad_id: number;
  razon_social_id: number;
  ciudad?: CiudadB2B;
  razon_social?: RazonSocial;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface CategoriaB2B {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activa: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface SubcategoriaB2B {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activa: boolean;
  categoria_id: number;
  sucursal_id: number;
  categoria?: CategoriaB2B;
  sucursal?: SucursalB2B;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface Equipo {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface EquipoB2B {
  id: number;
  nombre: string;
  codigo: string;
  modelo?: string;
  marca?: string;
  numero_serie?: string;
  descripcion?: string;
  activo: boolean;
  categoria_id: number;
  subcategoria_id: number;
  sucursal_id: number;
  categoria?: CategoriaB2B;
  subcategoria?: SubcategoriaB2B;
  sucursal?: SucursalB2B;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

// Interface para Áreas de Logística
interface AreaLogistica {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activa: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export default function OrganizacionesPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { dashboardRoute } = useDashboardRoute();
  
  // Estados para los diferentes tipos de datos
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  
  // Estados específicos para Planta San Pedro
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [activos, setActivos] = useState<Activo[]>([]);
  const [plantaCategorias, setPlantaCategorias] = useState<Categoria[]>([]);
  const [plantaSubcategorias, setPlantaSubcategorias] = useState<Subcategoria[]>([]);
  
  // Estados específicos para B2B
  const [ciudadesB2B, setCiudadesB2B] = useState<CiudadB2B[]>([]);
  const [razonesSociales, setRazonesSociales] = useState<RazonSocial[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalesB2B, setSucursalesB2B] = useState<SucursalB2B[]>([]);
  const [categoriasB2B, setCategoriasB2B] = useState<CategoriaB2B[]>([]);
  const [subcategoriasB2B, setSubcategoriasB2B] = useState<SubcategoriaB2B[]>([]);
  const [equipos, setEquipos] = useState<EquipoB2B[]>([]);
  
  // Estados específicos para Áreas de Logística
  const [areasLogistica, setAreasLogistica] = useState<AreaLogistica[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('zonas');
  
  // Estados para modos de autogestión
  const [autoManagementMode, setAutoManagementMode] = useState<'b2c' | 'planta-san-pedro' | 'b2b' | 'logistica'>('b2c');
  
  // Estados para modal y formularios
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  
  // Estados para formularios
  const [formData, setFormData] = useState<any>({});
  
  // Estados para modal de confirmación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState<'first' | 'final'>('first');
  const [deleteInfo, setDeleteInfo] = useState<{
    type: string;
    item: any;
    message: string;
    details: string[];
    isPermanent?: boolean;
    activosAsociados?: number;
    hasAssociatedAssets?: boolean;
  } | null>(null);

  const navigationItems = [
    { name: "ORGANIZACIONES", icon: Users, href: "/organizaciones" },
    { name: "OTS", icon: ClipboardList, href: "/ots" },
    { name: "SOLICITUDES", icon: FileText, href: "/solicitudes" },
  ]

  // Helper function para determinar si el usuario puede editar
  const puedeEditar = () => {
    const areaLower = user?.area?.toLowerCase() || '';
    return areaLower === 'mantenimiento' || areaLower === 'mantenimiento planta' || areaLower === 'tic';
  };

  // Funciones de filtrado
  const filterData = (data: any[], searchTerm: string) => {
    if (!searchTerm.trim()) return data;
    
    const term = searchTerm.toLowerCase();
    return data.filter(item => {
      return (
        item.nombre?.toLowerCase().includes(term) ||
        item.codigo?.toLowerCase().includes(term) ||
        item.descripcion?.toLowerCase().includes(term) ||
        item.direccion?.toLowerCase().includes(term) ||
        item.telefono?.toLowerCase().includes(term) ||
        item.email?.toLowerCase().includes(term)
      );
    });
  };

  // Datos filtrados
  const filteredZonas = filterData(zonas, searchTerm);
  const filteredCiudades = filterData(ciudades, searchTerm);
  const filteredTiendas = filterData(tiendas, searchTerm);
  const filteredCategorias = filterData(categorias, searchTerm);
  const filteredSubcategorias = filterData(subcategorias, searchTerm);
  const filteredPlantas = filterData(plantas, searchTerm);
  const filteredActivos = filterData(activos, searchTerm);
  const filteredPlantaCategorias = filterData(plantaCategorias, searchTerm);
  const filteredPlantaSubcategorias = filterData(plantaSubcategorias, searchTerm);
  
  // Filtros específicos para B2B
  const filteredCiudadesB2B = filterData(ciudadesB2B, searchTerm);
  const filteredRazonesSociales = filterData(razonesSociales, searchTerm);
  const filteredSucursales = filterData(sucursales, searchTerm);
  const filteredSucursalesB2B = filterData(sucursalesB2B, searchTerm);
  const filteredCategoriasB2B = filterData(categoriasB2B, searchTerm);
  const filteredSubcategoriasB2B = filterData(subcategoriasB2B, searchTerm);
  const filteredEquipos = filterData(equipos, searchTerm);
  
  // Filtros específicos para Áreas de Logística
  const filteredAreasLogistica = filterData(areasLogistica, searchTerm);

  const handleNavigation = (href: string) => {
    router.push(href);
  }

  const handleLogout = () => {
    console.log("Cerrando sesión...")
    logout();
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  // Efecto para resetear activeTab cuando cambie el modo de autogestión
  useEffect(() => {
    if (autoManagementMode === 'planta-san-pedro') {
      setActiveTab('plantas');
    } else if (autoManagementMode === 'b2b') {
      setActiveTab('ciudades');
    } else if (autoManagementMode === 'logistica') {
      setActiveTab('áreas');
    } else {
      setActiveTab('zonas');
    }
  }, [autoManagementMode]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando datos de organizaciones desde FastAPI...');
      
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      // Cargar todos los tipos de datos en paralelo
      const promises = [
        fetch(`${FASTAPI_BASE_URL}/organizaciones/zonas`, {
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        }),
        fetch(`${FASTAPI_BASE_URL}/organizaciones/ciudades`, {
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        }),
        fetch(`${FASTAPI_BASE_URL}/organizaciones/tiendas`, {
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        }),
        fetch(`${FASTAPI_BASE_URL}/organizaciones/categorias`, {
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        }),
        fetch(`${FASTAPI_BASE_URL}/organizaciones/subcategorias`, {
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        })
      ];

      // Agregar llamadas para plantas y activos si el usuario es de mantenimiento o TIC
      if (puedeEditar()) {
        promises.push(
          fetch(`${FASTAPI_BASE_URL}/autogestion/plantas`, {
            headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
          }),
          fetch(`${FASTAPI_BASE_URL}/autogestion/activos`, {
            headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
          }),
          fetch(`${FASTAPI_BASE_URL}/autogestion/planta-categorias?activa=true`, {
            headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
          }),
          fetch(`${FASTAPI_BASE_URL}/autogestion/planta-subcategorias?activa=true`, {
            headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
          })
        );
      }

      // Agregar llamadas para B2B
      promises.push(
        fetch(`${FASTAPI_BASE_URL}/b2b/ciudades`, {
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        }),
        fetch(`${FASTAPI_BASE_URL}/b2b/razones-sociales`, {
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        }),
        fetch(`${FASTAPI_BASE_URL}/b2b/sucursales`, {
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        }),
        fetch(`${FASTAPI_BASE_URL}/b2b/categorias`, {
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        }).then(res => {
          console.log('🌐 Estado respuesta categorías B2B:', res.status);
          if (!res.ok) {
            console.error('❌ Error al cargar categorías B2B:', res.statusText);
          }
          return res;
        }),
        fetch(`${FASTAPI_BASE_URL}/b2b/subcategorias`, {
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        }),
        fetch(`${FASTAPI_BASE_URL}/b2b/equipos`, {
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        })
      );

      // Agregar llamada para Áreas Logística
      promises.push(
        fetch(`${FASTAPI_BASE_URL}/logistica/areas`, {
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        })
      );

      const responses = await Promise.all(promises);
      const [zonasRes, ciudadesRes, tiendasRes, categoriasRes, subcategoriasRes, ...extraResponses] = responses;
      
      // Manejar respuestas adicionales para usuarios de mantenimiento y B2B
      let plantasRes, activosRes, plantaCategoriasRes, plantaSubcategoriasRes;
      let ciudadesB2BRes, razonesSocialesRes, sucursalesRes, categoriasB2BRes, subcategoriasB2BRes, equiposRes;
      let areasLogisticaRes;
      
      let responseIndex = 0;
      if (puedeEditar()) {
        [plantasRes, activosRes, plantaCategoriasRes, plantaSubcategoriasRes] = extraResponses.slice(responseIndex, responseIndex + 4);
        responseIndex += 4;
      }
      
      // Las respuestas B2B están seguidas de Áreas Logística
      [ciudadesB2BRes, razonesSocialesRes, sucursalesRes, categoriasB2BRes, subcategoriasB2BRes, equiposRes, areasLogisticaRes] = extraResponses.slice(responseIndex, responseIndex + 7);
      
      if (zonasRes.ok) {
        const zonasData = await zonasRes.json();
        setZonas(zonasData);
      }
      
      if (ciudadesRes.ok) {
        const ciudadesData = await ciudadesRes.json();
        setCiudades(ciudadesData);
      }
      
      if (tiendasRes.ok) {
        const tiendasData = await tiendasRes.json();
        setTiendas(tiendasData);
      }
      
      if (categoriasRes.ok) {
        const categoriasData = await categoriasRes.json();
        setCategorias(categoriasData);
      }
      
      if (subcategoriasRes.ok) {
        const subcategoriasData = await subcategoriasRes.json();
        setSubcategorias(subcategoriasData);
      }

      // Manejar respuestas de plantas y activos si están disponibles
      if (plantasRes && plantasRes.ok) {
        const plantasData = await plantasRes.json();
        setPlantas(plantasData);
      }

      if (activosRes && activosRes.ok) {
        const activosData = await activosRes.json();
        setActivos(activosData);
      }

      // Manejar categorías específicas de Planta San Pedro
      if (plantaCategoriasRes && plantaCategoriasRes.ok) {
        const plantaCategoriasData = await plantaCategoriasRes.json();
        console.log('🔄 Actualizando categorías de Planta San Pedro:', plantaCategoriasData.length);
        setPlantaCategorias(plantaCategoriasData);
      }

      if (plantaSubcategoriasRes && plantaSubcategoriasRes.ok) {
        const plantaSubcategoriasData = await plantaSubcategoriasRes.json();
        console.log('🔄 Actualizando subcategorías de Planta San Pedro:', plantaSubcategoriasData.length);
        setPlantaSubcategorias(plantaSubcategoriasData);
      }

      // Manejar respuestas B2B
      if (ciudadesB2BRes && ciudadesB2BRes.ok) {
        const ciudadesB2BData = await ciudadesB2BRes.json();
        console.log('🔄 Actualizando ciudades B2B:', ciudadesB2BData.length);
        setCiudadesB2B(ciudadesB2BData);
      }

      if (razonesSocialesRes && razonesSocialesRes.ok) {
        const razonesSocialesData = await razonesSocialesRes.json();
        console.log('🔄 Actualizando razones sociales B2B:', razonesSocialesData.length);
        setRazonesSociales(razonesSocialesData);
      }

      if (sucursalesRes && sucursalesRes.ok) {
        const sucursalesData = await sucursalesRes.json();
        console.log('🔄 Actualizando sucursales B2B:', sucursalesData.length);
        setSucursalesB2B(sucursalesData);
      }

      if (categoriasB2BRes && categoriasB2BRes.ok) {
        const categoriasB2BData = await categoriasB2BRes.json();
        console.log('🔄 Actualizando categorías B2B:', categoriasB2BData.length);
        console.log('📋 Categorías B2B recibidas:', categoriasB2BData.map((cat: any) => ({ 
          id: cat.id, 
          nombre: cat.nombre, 
          codigo: cat.codigo 
        })));
        setCategoriasB2B(categoriasB2BData);
      }

      if (subcategoriasB2BRes && subcategoriasB2BRes.ok) {
        const subcategoriasB2BData = await subcategoriasB2BRes.json();
        console.log('🔄 Actualizando subcategorías B2B:', subcategoriasB2BData.length);
        setSubcategoriasB2B(subcategoriasB2BData);
      }

      if (equiposRes && equiposRes.ok) {
        const equiposData = await equiposRes.json();
        console.log('🔄 Actualizando equipos B2B:', equiposData.length);
        setEquipos(equiposData);
      }

      // Manejar respuesta de Áreas Logística
      if (areasLogisticaRes && areasLogisticaRes.ok) {
        const areasLogisticaData = await areasLogisticaRes.json();
        console.log('🔄 Actualizando áreas de logística:', areasLogisticaData.length);
        setAreasLogistica(areasLogisticaData);
      }
      
      console.log('✅ Datos cargados exitosamente');
    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🚨 FastAPI no está disponible. Verifica que esté ejecutándose en puerto 8000 o que la conexión a EC2 esté activa');
      }
    } finally {
      setLoading(false);
    }
  };

  // Funciones CRUD
  const createItem = async (type: string, data: any) => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const endpoints: { [key: string]: string } = {
        'zonas': '/organizaciones/zonas',
        'ciudades': autoManagementMode === 'b2b' ? '/b2b/ciudades' : '/organizaciones/ciudades',
        'tiendas': '/organizaciones/tiendas',
        'categorías': autoManagementMode === 'planta-san-pedro' ? '/autogestion/planta-categorias' : 
                     autoManagementMode === 'b2b' ? '/b2b/categorias' : '/organizaciones/categorias',
        'subcategorías': autoManagementMode === 'planta-san-pedro' ? '/autogestion/planta-subcategorias' : 
                        autoManagementMode === 'b2b' ? '/b2b/subcategorias' : '/organizaciones/subcategorias',
        'plantas': '/autogestion/plantas',
        'activos': '/autogestion/activos',
        'razones-sociales': '/b2b/razones-sociales',
        'sucursales': '/b2b/sucursales',
        'equipos': '/b2b/equipos',
        'áreas': '/logistica/areas',
        // Endpoints específicos B2B para creación con sufijos -b2b
        'ciudades-b2b': '/b2b/ciudades',
        'categorias-b2b': '/b2b/categorias',
        'subcategorias-b2b': '/b2b/subcategorias'
      };

      const response = await fetch(`${FASTAPI_BASE_URL}${endpoints[type]}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        console.log(`✅ ${type.slice(0, -1)} creado exitosamente`);
        await fetchAllData(); // Recargar datos
        setModalOpen(false);
        setFormData({});
      } else {
        // Intentar parsear el error del backend
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
          console.error(`❌ Error al crear ${type.slice(0, -1)}:`, errorData);
        } catch (parseError) {
          console.error(`❌ Error al crear ${type.slice(0, -1)} (${response.status}):`, response.statusText);
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error(`❌ Error al crear ${type.slice(0, -1)}:`, error);
      alert(`Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const updateItem = async (type: string, id: number, data: any) => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const endpoints: { [key: string]: string } = {
        'zonas': '/organizaciones/zonas',
        'ciudades': autoManagementMode === 'b2b' ? '/b2b/ciudades' : '/organizaciones/ciudades',
        'tiendas': '/organizaciones/tiendas',
        'categorías': autoManagementMode === 'planta-san-pedro' ? '/autogestion/planta-categorias' : 
                     autoManagementMode === 'b2b' ? '/b2b/categorias' : '/organizaciones/categorias',
        'subcategorías': autoManagementMode === 'planta-san-pedro' ? '/autogestion/planta-subcategorias' : 
                        autoManagementMode === 'b2b' ? '/b2b/subcategorias' : '/organizaciones/subcategorias',
        'plantas': '/autogestion/plantas',
        'activos': '/autogestion/activos',
        'razones-sociales': '/b2b/razones-sociales',
        'sucursales': '/b2b/sucursales',
        'equipos': '/b2b/equipos',
        'áreas': '/logistica/areas',
        // Endpoints específicos B2B para actualización con sufijos -b2b
        'ciudades-b2b': '/b2b/ciudades',
        'categorias-b2b': '/b2b/categorias',
        'subcategorias-b2b': '/b2b/subcategorias'
      };

      const response = await fetch(`${FASTAPI_BASE_URL}${endpoints[type]}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        console.log(`✅ ${type.slice(0, -1)} actualizado exitosamente`);
        await fetchAllData(); // Recargar datos
        setModalOpen(false);
        setFormData({});
        setEditMode(false);
        setCurrentItem(null);
      } else {
        // Intentar parsear el error del backend
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
          console.error(`❌ Error al actualizar ${type.slice(0, -1)}:`, errorData);
        } catch (parseError) {
          console.error(`❌ Error al actualizar ${type.slice(0, -1)} (${response.status}):`, response.statusText);
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error(`❌ Error al actualizar ${type.slice(0, -1)}:`, error);
      alert(`Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const deleteItem = async (type: string, id: number, permanent: boolean = false) => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const endpoints: { [key: string]: string } = {
        'zonas': '/organizaciones/zonas',
        'ciudades': autoManagementMode === 'b2b' ? '/b2b/ciudades' : '/organizaciones/ciudades',
        'tiendas': '/organizaciones/tiendas',
        'categorías': autoManagementMode === 'planta-san-pedro' ? '/autogestion/planta-categorias' : 
                     autoManagementMode === 'b2b' ? '/b2b/categorias' : '/organizaciones/categorias',
        'subcategorías': autoManagementMode === 'planta-san-pedro' ? '/autogestion/planta-subcategorias' : 
                        autoManagementMode === 'b2b' ? '/b2b/subcategorias' : '/organizaciones/subcategorias',
        'plantas': '/autogestion/plantas',
        'activos': '/autogestion/activos',
        'razones-sociales': '/b2b/razones-sociales',
        'sucursales': '/b2b/sucursales',
        'equipos': '/b2b/equipos',
        'áreas': '/logistica/areas',
        // Endpoints específicos B2B para eliminación con sufijos -b2b
        'ciudades-b2b': '/b2b/ciudades',
        'categorias-b2b': '/b2b/categorias',
        'subcategorias-b2b': '/b2b/subcategorias'
      };
      
      // Para Planta San Pedro, todas las eliminaciones son permanentes (plantas, activos, categorías y subcategorías)
      const isPermanentDelete = autoManagementMode === 'planta-san-pedro' && 
                                ['plantas', 'activos', 'categorías', 'subcategorías'].includes(type);
      
      // Solo plantas y activos necesitan el parámetro ?permanent=true
      // Las categorías y subcategorías de Planta San Pedro usan endpoints específicos que eliminan permanentemente
      const needsPermanentParam = isPermanentDelete && ['plantas', 'activos'].includes(type);
      const url = `${FASTAPI_BASE_URL}${endpoints[type]}/${id}${needsPermanentParam ? '?permanent=true' : ''}`;
      
      // Debug logs
      console.log('🔍 DELETE DEBUG:', {
        type,
        id,
        permanent,
        autoManagementMode,
        isPermanentDelete,
        needsPermanentParam,
        endpoint: endpoints[type],
        finalUrl: url
      });
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (response.ok) {
        // Manejar respuestas sin contenido (204 No Content) - común en soft deletes
        let result: any = {};
        
        if (response.status !== 204 && response.headers.get('content-length') !== '0') {
          try {
            result = await response.json();
          } catch (e) {
            // Si no hay JSON, continuar con objeto vacío
            console.log('ℹ️ Respuesta sin contenido JSON (probablemente 204 No Content)');
          }
        }
        
        console.log(`✅ ${isPermanentDelete ? 'Eliminación permanente' : 'Eliminación lógica'} exitosa${result.message ? ': ' + result.message : ''}`);
        
        // Mostrar mensaje específico si se eliminaron activos en cascada
        if (result.activos_eliminados && result.activos_eliminados > 0) {
          alert(`✅ Eliminación completada: Se eliminó la planta y ${result.activos_eliminados} activo(s) asociado(s) permanentemente.`);
        }
        
        console.log('🔄 Recargando datos después de la eliminación...');
        await fetchAllData();
      } else {
        const errorData = await response.json();
        console.error(`❌ Error al eliminar ${type.slice(0, -1)}:`, errorData);
        
        // Mostrar error específico para validaciones de integridad
        if (response.status === 400) {
          let errorMessage = errorData.detail || 'Error desconocido';
          
          // Mensajes específicos para errores B2B
          if (errorMessage.includes('razones sociales') || errorMessage.includes('sucursales')) {
            alert(`❌ No se puede eliminar: ${errorMessage}\n\n💡 Sugerencia: Elimine primero las entidades dependientes.`);
          } else if (errorMessage.includes('categorías') || errorMessage.includes('subcategorías')) {
            alert(`❌ No se puede eliminar: ${errorMessage}\n\n💡 Sugerencia: Elimine primero las categorías y equipos asociados.`);
          } else if (errorMessage.includes('activo(s) asociado(s)')) {
            alert(`❌ No se puede eliminar: ${errorMessage}`);
          } else {
            alert(`❌ No se puede eliminar: ${errorMessage}`);
          }
        } else {
          alert(`❌ Error al eliminar: ${errorData.detail || 'Error desconocido'}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error al eliminar ${type.slice(0, -1)}:`, error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editMode && currentItem) {
      await updateItem(activeTab, currentItem.id, formData);
    } else {
      await createItem(activeTab, formData);
    }
  };

  const openCreateModal = () => {
    setEditMode(false);
    setCurrentItem(null);
    
    // Inicializar formulario según el tipo activo
    const initialData: { [key: string]: any } = {
      'zonas': { nombre: '', codigo: '', descripcion: '', activa: true },
      'ciudades': { nombre: '', codigo: '', descripcion: '', activa: true, zona_id: 0 },
      'tiendas': { nombre: '', codigo: '', direccion: '', telefono: '', email: '', activa: true, ciudad_id: 0 },
      'categorías': autoManagementMode === 'b2b' 
        ? { nombre: '', codigo: '', descripcion: '', activa: true, sucursal_id: 0 }
        : { nombre: '', codigo: '', descripcion: '', icono: '', color: '#3B82F6', activa: true },
      'subcategorías': { nombre: '', codigo: '', descripcion: '', activa: true, categoria_id: 0 },
      'plantas': { nombre: '', codigo: '', descripcion: '', activa: true },
      'activos': autoManagementMode === 'planta-san-pedro' 
        ? { nombre: '', codigo: '', tipo: '', descripcion: '', activo: true, planta_id: 0 }
        : { nombre: '', codigo: '', tipo: '', descripcion: '', activo: true, planta_id: 0, categoria_id: 0, subcategoria_id: 0 },
      // Entidades B2B
      'razones-sociales': { nombre: '', codigo: '', descripcion: '', activa: true, ciudad_id: 0 },
      'sucursales': { nombre: '', codigo: '', direccion: '', telefono: '', activa: true, ciudad_id: 0, razon_social_id: 0 },
      'equipos': { nombre: '', codigo: '', modelo: '', marca: '', numero_serie: '', descripcion: '', activo: true, categoria_id: 0, subcategoria_id: 0, sucursal_id: 0 },
      // Entidades Logística
      'áreas': { nombre: '', codigo: '', descripcion: '', activa: true }
    };
    
    setFormData(initialData[activeTab] || {});
    setModalOpen(true);
  };

  const openDeleteModal = (type: string, item: any) => {
    // Determinar si es eliminación permanente (Planta San Pedro) o lógica (B2C)
    const isPermanentDelete = autoManagementMode === 'planta-san-pedro' && 
                             ['plantas', 'activos', 'categorías', 'subcategorías'].includes(type);
    
    // Para plantas en modo permanente, obtener activos asociados
    let activosAsociados: Activo[] = [];
    if (type === 'plantas' && isPermanentDelete) {
      activosAsociados = activos.filter(activo => activo.planta_id === item.id);
    }
    
    const messages: { [key: string]: { message: string, details: string[] } } = {
      'zonas': {
        message: `¿Está seguro de eliminar la zona "${item.nombre}"?`,
        details: [
          'Se eliminarán todas las ciudades asociadas',
          'Se eliminarán todas las tiendas de estas ciudades',
          'Se perderá el historial de órdenes de trabajo'
        ]
      },
      'ciudades': {
        message: `¿Está seguro de eliminar la ciudad "${item.nombre}"?`,
        details: [
          'Se eliminarán todas las tiendas de esta ciudad',
          'Se perderá el historial de órdenes de trabajo',
          `Zona: ${zonas.find(z => z.id === item.zona_id)?.nombre || 'N/A'}`
        ]
      },
      'tiendas': {
        message: `¿Está seguro de eliminar la tienda "${item.nombre}"?`,
        details: [
          `Ubicación: ${ciudades.find(c => c.id === item.ciudad_id)?.nombre || 'N/A'}`,
          'Se perderá el historial de órdenes de trabajo',
          'Se eliminarán los datos de contacto y dirección'
        ]
      },
      'categorías': {
        message: autoManagementMode === 'planta-san-pedro'
          ? `⚠️ ELIMINACIÓN PERMANENTE: ¿Está seguro de eliminar completamente la categoría "${item.nombre}" de Planta San Pedro?`
          : `¿Está seguro de eliminar la categoría "${item.nombre}"?`,
        details: autoManagementMode === 'planta-san-pedro' ? [
          '🚨 ESTA ACCIÓN ES IRREVERSIBLE',
          'La categoría será eliminada completamente del sistema de Planta San Pedro',
          'Se eliminarán TODAS las subcategorías asociadas de forma permanente',
          `⚠️ Subcategorías que se eliminarán: ${(plantaSubcategorias || []).filter(sub => sub.categoria_id === item.id).length}`,
          ...(plantaSubcategorias || []).filter(sub => sub.categoria_id === item.id).map(sub => `• ${sub.nombre}`),
          'No se podrá recuperar ningún dato de esta categoría ni sus subcategorías',
          'Afectará formularios específicos de Planta San Pedro'
        ] : [
          'Se eliminarán todas las subcategorías asociadas',
          'Se perderá el historial de servicios relacionados',
          'Afectará la clasificación de futuras órdenes'
        ]
      },
      'subcategorías': {
        message: autoManagementMode === 'planta-san-pedro'
          ? `⚠️ ELIMINACIÓN PERMANENTE: ¿Está seguro de eliminar completamente la subcategoría "${item.nombre}" de Planta San Pedro?`
          : `¿Está seguro de eliminar la subcategoría "${item.nombre}"?`,
        details: autoManagementMode === 'planta-san-pedro' ? [
          '🚨 ESTA ACCIÓN ES IRREVERSIBLE',
          'La subcategoría será eliminada completamente del sistema de Planta San Pedro',
          `Categoría padre: ${(plantaCategorias || []).find(c => c.id === item.categoria_id)?.nombre || 'N/A'}`,
          'No se podrá recuperar ningún dato de esta subcategoría',
          'Afectará formularios específicos de Planta San Pedro'
        ] : [
          `Categoría padre: ${categorias.find(c => c.id === item.categoria_id)?.nombre || 'N/A'}`,
          'Se perderá el historial de servicios específicos',
          'Afectará la clasificación detallada de órdenes'
        ]
      },
      'plantas': {
        message: isPermanentDelete 
          ? `⚠️ ELIMINACIÓN PERMANENTE: ¿Está seguro de eliminar completamente la planta "${item.nombre}"?`
          : `¿Está seguro de desactivar la planta "${item.nombre}"?`,
        details: isPermanentDelete ? [
          '🚨 ESTA ACCIÓN ES IRREVERSIBLE',
          'La planta será eliminada completamente del sistema',
          'No se podrá recuperar ningún dato de esta planta',
          ...(activosAsociados.length > 0 ? [
            `⚠️ TAMBIÉN SE ELIMINARÁN ${activosAsociados.length} ACTIVO(S) ASOCIADO(S):`,
            ...activosAsociados.map(activo => `• ${activo.nombre} (${activo.codigo || 'Sin código'})`),
            '🚨 TODOS ESTOS ACTIVOS SERÁN ELIMINADOS PERMANENTEMENTE'
          ] : ['✅ Esta planta no tiene activos asociados']),
          'Afectará formularios y reportes históricos'
        ] : [
          'La planta será marcada como inactiva',
          'Los activos asociados permanecerán',
          'Se puede reactivar posteriormente',
          'Los datos históricos se conservan'
        ]
      },
      'activos': {
        message: isPermanentDelete
          ? `⚠️ ELIMINACIÓN PERMANENTE: ¿Está seguro de eliminar completamente el activo "${item.nombre}"?`
          : `¿Está seguro de desactivar el activo "${item.nombre}"?`,
        details: isPermanentDelete ? [
          '🚨 ESTA ACCIÓN ES IRREVERSIBLE',
          'El activo será eliminado completamente del sistema',
          'No se podrá recuperar ningún dato de este activo',
          `Planta: ${plantas.find(p => p.id === item.planta_id)?.nombre || 'N/A'}`,
          'Afectará formularios y reportes históricos'
        ] : [
          'El activo será marcado como inactivo',
          'Se puede reactivar posteriormente',
          'Los datos históricos se conservan',
          `Planta: ${plantas.find(p => p.id === item.planta_id)?.nombre || 'N/A'}`
        ]
      },
      // Entidades B2B
      'razones-sociales': {
        message: `¿Está seguro de eliminar la razón social "${item.nombre}"?`,
        details: [
          'Se eliminarán todas las sucursales asociadas',
          'Se perderán los datos de contacto y dirección',
          `Ciudad: ${ciudadesB2B.find(c => c.id === item.ciudad_id)?.nombre || 'N/A'}`,
          'Afectará formularios B2B existentes'
        ]
      },
      'sucursales': {
        message: `¿Está seguro de eliminar la sucursal "${item.nombre}"?`,
        details: [
          'Se eliminarán todas las categorías asociadas a esta sucursal',
          'Se perderán todos los equipos de esta sucursal',
          `Razón Social: ${razonesSociales.find(r => r.id === item.razon_social_id)?.nombre || 'N/A'}`,
          `Ciudad: ${ciudadesB2B.find(c => c.id === item.ciudad_id)?.nombre || 'N/A'}`,
          'Afectará formularios B2B existentes'
        ]
      },
      'equipos': {
        message: `¿Está seguro de eliminar el equipo "${item.nombre}"?`,
        details: [
          `Categoría: ${categoriasB2B.find(c => c.id === item.categoria_id)?.nombre || 'N/A'}`,
          `Subcategoría: ${subcategoriasB2B.find(s => s.id === item.subcategoria_id)?.nombre || 'N/A'}`,
          `Sucursal: ${sucursales.find(s => s.id === item.sucursal_id)?.nombre || 'N/A'}`,
          `Modelo: ${item.modelo || 'N/A'}`,
          `Marca: ${item.marca || 'N/A'}`,
          'Afectará formularios B2B existentes'
        ]
      },
      // Entidades Logística
      'áreas': {
        message: `¿Está seguro de eliminar el área "${item.nombre}"?`,
        details: [
          'El área será marcada como inactiva',
          'No aparecerá en el formulario de logística',
          'Se puede reactivar posteriormente',
          'Los datos históricos se conservan'
        ]
      }
    };

    setDeleteInfo({
      type,
      item,
      message: messages[type]?.message || `¿Eliminar ${type.slice(0, -1)}?`,
      details: messages[type]?.details || [],
      isPermanent: isPermanentDelete,
      activosAsociados: activosAsociados.length,
      hasAssociatedAssets: activosAsociados.length > 0
    });
    setConfirmationStep('first');
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteInfo) return;

    console.log('🔍 CONFIRM DELETE DEBUG:', {
      deleteInfo,
      confirmationStep,
      autoManagementMode
    });

    // Si es eliminación permanente de planta con activos asociados, requerir doble confirmación
    if (deleteInfo.isPermanent && deleteInfo.hasAssociatedAssets && confirmationStep === 'first') {
      console.log('🔄 Requiere doble confirmación para planta con activos');
      setConfirmationStep('final');
      return;
    }

    // Si es eliminación de categoría de Planta San Pedro con subcategorías, requerir doble confirmación
    if (autoManagementMode === 'planta-san-pedro' && 
        deleteInfo.type === 'categorías' && 
        confirmationStep === 'first') {
      const subcategoriasCount = (plantaSubcategorias || []).filter(sub => sub.categoria_id === deleteInfo.item.id).length;
      console.log('🔄 Categoría de Planta San Pedro - subcategorías:', subcategoriasCount);
      if (subcategoriasCount > 0) {
        console.log('🔄 Requiere doble confirmación para categoría con subcategorías');
        setConfirmationStep('final');
        return;
      }
    }

    // Proceder con la eliminación
    console.log('✅ Procediendo con eliminación:', {
      type: deleteInfo.type,
      id: deleteInfo.item.id,
      isPermanent: deleteInfo.isPermanent
    });
    await deleteItem(deleteInfo.type, deleteInfo.item.id, deleteInfo.isPermanent || false);
    setDeleteModalOpen(false);
    setDeleteInfo(null);
    setConfirmationStep('first');
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activa':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactiva':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'mantenimiento':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'Sede Principal':
        return 'bg-gradient-to-r from-[#00B0B2] to-blue-600 text-white';
      case 'Sucursal':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'División':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <ProtectedRoute>
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

              {/* Navigation Menu */}
              <nav className="hidden md:block">
                <div className="ml-30 flex items-baseline space-x-4">
                  {navigationItems.map((item) => (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className={`text-white hover:bg-white/20 px-3 py-2 text-sm font-medium ${
                        item.name === "ORGANIZACIONES" ? "bg-white/30" : ""
                      }`}
                      onClick={() => handleNavigation(item.href)}
                    >
                      <div className="flex items-center">
                        <item.icon
                          className="w-4 h-4 mr-2"
                          style={{ color: "#333231" }} // Negro elegante
                        />
                        {item.name}
                      </div>
                    </Button>
                  ))}
                </div>
              </nav>

              {/* User Avatar */}
              <div className="flex items-center space-x-4">
                {/* Mostrar información del usuario */}
                <div className="hidden md:block text-white text-sm">
                  <div className="font-medium">{user?.nombre}</div>
                  <div className="text-white/80">{user?.area}</div>
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
                      <div className="font-medium">{user?.nombre}</div>
                      <div className="text-sm text-gray-500 break-words word-wrap overflow-wrap-anywhere max-w-full">{user?.email}</div>
                      <div className="text-sm text-gray-500 capitalize">{user?.rol}</div>
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

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black drop-shadow-sm">Gestión de Organizaciones</h1>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Zonas */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:transform hover:scale-105 transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Zonas</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>{zonas.length}</p>
                  <p className="text-sm mt-2 text-blue-600 flex items-center">
                    <Building2 className="w-4 h-4 mr-1" /> Activas: {zonas.filter(z => z.activa).length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Building2 className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Total Ciudades */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:transform hover:scale-105 transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Ciudades</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>{ciudades.length}</p>
                  <p className="text-sm mt-2 text-green-600 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" /> Activas: {ciudades.filter(c => c.activa).length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <Building2 className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </div>

            {/* Total Tiendas */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-[#00B0B2] hover:transform hover:scale-105 transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tiendas</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>{tiendas.length}</p>
                  <p className="text-sm mt-2 flex items-center" style={{ color: "#00B0B2" }}>
                    <Users className="w-4 h-4 mr-1" /> Locales: {tiendas.filter(t => t.activa).length}
                  </p>
                </div>
                <div className="p-3 rounded-full" style={{ backgroundColor: "#E6F7F7" }}>
                  <Users className="w-6 h-6" style={{ color: "#00B0B2" }} />
                </div>
              </div>
            </div>

            {/* Total Categorías */}
            <div className="bg-white/90 rounded-lg shadow-md p-6 border-l-4 border-purple-500 hover:transform hover:scale-105 transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">Categorías de Servicio</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: "#00B0B2" }}>{categorias.length}</p>
                  <p className="text-sm mt-2 text-purple-600 flex items-center">
                    <Settings className="w-4 h-4 mr-1" /> Subcategorías: {subcategorias.length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <Settings className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="bg-white/90 rounded-lg shadow-md p-6 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar organizaciones..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Admin Interface */}
          <div className="bg-white/90 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Administrar Organización</h3>
              {/* Botón Nuevo - Para usuarios de mantenimiento y TIC */}
              {puedeEditar() && (
                <Button 
                  onClick={openCreateModal}
                  style={{ backgroundColor: "#00B0B2", color: "white" }}
                  className="hover:opacity-90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo {activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1)}
                </Button>
              )}
            </div>

            {/* Barra de Modos de Autogestión - Para usuarios de mantenimiento y TIC */}
            {puedeEditar() && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Modos de Autogestión</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setAutoManagementMode('b2c')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      autoManagementMode === 'b2c'
                        ? 'bg-[#00B0B2] text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    B2C
                  </button>
                  <button
                    onClick={() => setAutoManagementMode('planta-san-pedro')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      autoManagementMode === 'planta-san-pedro'
                        ? 'bg-[#00B0B2] text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Planta San Pedro
                  </button>
                  <button
                    onClick={() => setAutoManagementMode('b2b')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      autoManagementMode === 'b2b'
                        ? 'bg-[#00B0B2] text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    B2B
                  </button>
                  <button
                    onClick={() => setAutoManagementMode('logistica')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      autoManagementMode === 'logistica'
                        ? 'bg-[#00B0B2] text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Logística
                  </button>
                </div>
                
                {/* Descripción del modo actual */}
                <div className="mt-3 text-sm text-gray-600">
                  {autoManagementMode === 'b2c' && (
                    <p>Modo B2C: Gestión de solicitudes de clientes externos con formulario web.</p>
                  )}
                  {autoManagementMode === 'planta-san-pedro' && (
                    <div>
                      <p className="font-medium">Modo Planta San Pedro: Autogestión interna</p>
                      <p className="text-xs mt-1">Gestiona plantas y activos con filtros por Planta, Activo, Categoría y Subcategoría para facilitar la creación de solicitudes internas.</p>
                    </div>
                  )}
                  {autoManagementMode === 'b2b' && (
                    <div>
                      <p className="font-medium">Modo B2B: Gestión empresarial</p>
                      <p className="text-xs mt-1">Gestiona ciudades, razones sociales, sucursales, categorías, subcategorías y equipos para facilitar las solicitudes empresariales.</p>
                    </div>
                  )}
                  {autoManagementMode === 'logistica' && (
                    <div>
                      <p className="font-medium">Modo Logística: Gestión de servicios logísticos</p>
                      <p className="text-xs mt-1">Gestiona áreas de logística para facilitar las solicitudes de despacho, recolección y traslado.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {autoManagementMode === 'planta-san-pedro' ? (
                  // Pestañas para modo Planta San Pedro
                  ['Plantas', 'Activos', 'Categorías', 'Subcategorías'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab.toLowerCase())}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.toLowerCase()
                          ? 'border-[#00B0B2] text-[#00B0B2]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))
                ) : autoManagementMode === 'b2b' ? (
                  // Pestañas para modo B2B
                  ['Ciudades', 'Razones Sociales', 'Sucursales', 'Categorías', 'Subcategorías', 'Equipos'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.toLowerCase().replace(' ', '-')
                          ? 'border-[#00B0B2] text-[#00B0B2]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))
                ) : autoManagementMode === 'logistica' ? (
                  // Pestañas para modo Logística
                  ['Áreas'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab.toLowerCase())}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.toLowerCase()
                          ? 'border-[#00B0B2] text-[#00B0B2]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))
                ) : (
                  // Pestañas para modo B2C (predeterminado)
                  ['Zonas', 'Ciudades', 'Tiendas', 'Categorías', 'Subcategorías'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab.toLowerCase())}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.toLowerCase()
                          ? 'border-[#00B0B2] text-[#00B0B2]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))
                )}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {activeTab === 'zonas' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredZonas.length > 0 ? (
                      filteredZonas.map((zona) => (
                        <tr key={zona.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{zona.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{zona.nombre}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                zona.activa
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {zona.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2">
                              {/* Botones de edición - Solo para usuarios de mantenimiento */}
                              {puedeEditar() && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => {
                                    setEditMode(true);
                                    setCurrentItem(zona);
                                    setFormData(zona);
                                    setModalOpen(true);
                                  }}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                    openDeleteModal('zonas', zona);
                                  }}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {/* Mensaje para usuarios TIC */}
                              {!puedeEditar() && (
                                <span className="text-sm text-gray-500 italic">Solo visualización</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron zonas</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'ciudades' && autoManagementMode !== 'b2b' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Zona</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCiudades.length > 0 ? (
                      filteredCiudades.map((ciudad) => (
                        <tr key={ciudad.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{ciudad.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{ciudad.nombre}</td>
                          <td className="p-3 text-gray-600">{zonas.find(z => z.id === ciudad.zona_id)?.nombre}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                ciudad.activa
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {ciudad.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2">
                              {/* Botones de edición - Solo para usuarios de mantenimiento */}
                              {puedeEditar() && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => {
                                    setEditMode(true);
                                    setCurrentItem(ciudad);
                                    setFormData(ciudad);
                                    setModalOpen(true);
                                  }}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                    openDeleteModal('ciudades', ciudad);
                                  }}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {/* Mensaje para usuarios TIC */}
                              {!puedeEditar() && (
                                <span className="text-sm text-gray-500 italic">Solo visualización</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron ciudades</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'tiendas' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Ciudad</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTiendas.length > 0 ? (
                      filteredTiendas.map((tienda) => (
                        <tr key={tienda.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{tienda.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{tienda.nombre}</td>
                          <td className="p-3 text-gray-600">{ciudades.find(c => c.id === tienda.ciudad_id)?.nombre}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                tienda.activa
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {tienda.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditMode(true);
                                setCurrentItem(tienda);
                                setFormData(tienda);
                                setModalOpen(true);
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                openDeleteModal('tiendas', tienda);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron tiendas</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'categorías' && autoManagementMode !== 'b2b' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(autoManagementMode === 'planta-san-pedro' ? filteredPlantaCategorias : filteredCategorias).length > 0 ? (
                      (autoManagementMode === 'planta-san-pedro' ? filteredPlantaCategorias : filteredCategorias).map((categoria) => (
                        <tr key={categoria.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{categoria.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{categoria.nombre}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                categoria.activa
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {categoria.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditMode(true);
                                setCurrentItem(categoria);
                                setFormData(categoria);
                                setModalOpen(true);
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                openDeleteModal('categorías', categoria);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron categorías</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'subcategorías' && autoManagementMode !== 'b2b' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Categoría</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(autoManagementMode === 'planta-san-pedro' ? filteredPlantaSubcategorias : filteredSubcategorias).length > 0 ? (
                      (autoManagementMode === 'planta-san-pedro' ? filteredPlantaSubcategorias : filteredSubcategorias).map((subcategoria) => (
                        <tr key={subcategoria.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{subcategoria.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{subcategoria.nombre}</td>
                          <td className="p-3 text-gray-600">{(autoManagementMode === 'planta-san-pedro' ? plantaCategorias : categorias).find(c => c.id === subcategoria.categoria_id)?.nombre}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                subcategoria.activa
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {subcategoria.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditMode(true);
                                setCurrentItem(subcategoria);
                                setFormData(subcategoria);
                                setModalOpen(true);
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                openDeleteModal('subcategorías', subcategoria);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron subcategorías</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'áreas-logística' && autoManagementMode !== 'b2b' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Código</th>
                      <th className="text-left p-3 font-medium text-gray-700">Descripción</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAreasLogistica.length > 0 ? (
                      filteredAreasLogistica.map((area) => (
                        <tr key={area.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{area.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{area.nombre}</td>
                          <td className="p-3 text-gray-600">{area.codigo}</td>
                          <td className="p-3 text-gray-600">{area.descripcion || 'N/A'}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                area.activa
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {area.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="p-3">
                            {puedeEditar() && (
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => {
                                  setEditMode(true);
                                  setCurrentItem(area);
                                  setFormData(area);
                                  setModalOpen(true);
                                }}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                  openDeleteModal('áreas-logística', area);
                                }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron áreas de logística</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'plantas' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Código</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlantas.length > 0 ? (
                      filteredPlantas.map((planta) => (
                        <tr key={planta.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{planta.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{planta.nombre}</td>
                          <td className="p-3 text-gray-600">{planta.codigo}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                planta.activa
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {planta.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditMode(true);
                                setCurrentItem(planta);
                                setFormData(planta);
                                setModalOpen(true);
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                openDeleteModal('plantas', planta);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron plantas</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'activos' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Código</th>
                      <th className="text-left p-3 font-medium text-gray-700">Planta</th>
                      <th className="text-left p-3 font-medium text-gray-700">Categoría</th>
                      <th className="text-left p-3 font-medium text-gray-700">Subcategoría</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivos.length > 0 ? (
                      filteredActivos.map((activo) => (
                        <tr key={activo.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{activo.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{activo.nombre}</td>
                          <td className="p-3 text-gray-600">{activo.codigo}</td>
                          <td className="p-3 text-gray-600">{plantas.find(p => p.id === activo.planta_id)?.nombre}</td>
                          <td className="p-3 text-gray-600">{categorias.find(c => c.id === activo.categoria_id)?.nombre}</td>
                          <td className="p-3 text-gray-600">{subcategorias.find(s => s.id === activo.subcategoria_id)?.nombre}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                activo.activo
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {activo.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditMode(true);
                                setCurrentItem(activo);
                                setFormData(activo);
                                setModalOpen(true);
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                openDeleteModal('activos', activo);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron activos</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* Tablas específicas para B2B */}
              {activeTab === 'ciudades' && autoManagementMode === 'b2b' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Código</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCiudadesB2B.length > 0 ? (
                      filteredCiudadesB2B.map((ciudad) => (
                        <tr key={ciudad.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{ciudad.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{ciudad.nombre}</td>
                          <td className="p-3 text-gray-600">{ciudad.codigo}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                ciudad.activa
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {ciudad.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditMode(true);
                                setCurrentItem(ciudad);
                                setFormData(ciudad);
                                setModalOpen(true);
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                openDeleteModal('ciudades-b2b', ciudad);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron ciudades B2B</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'razones-sociales' && autoManagementMode === 'b2b' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Código</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRazonesSociales.length > 0 ? (
                      filteredRazonesSociales.map((razonSocial) => (
                        <tr key={razonSocial.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{razonSocial.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{razonSocial.nombre}</td>
                          <td className="p-3 text-gray-600">{razonSocial.codigo}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                razonSocial.activa
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {razonSocial.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditMode(true);
                                setCurrentItem(razonSocial);
                                setFormData(razonSocial);
                                setModalOpen(true);
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                openDeleteModal('razones-sociales', razonSocial);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron razones sociales</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'sucursales' && autoManagementMode === 'b2b' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Código</th>
                      <th className="text-left p-3 font-medium text-gray-700">Razón Social</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSucursalesB2B.length > 0 ? (
                      filteredSucursalesB2B.map((sucursal) => (
                        <tr key={sucursal.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{sucursal.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{sucursal.nombre}</td>
                          <td className="p-3 text-gray-600">{sucursal.codigo}</td>
                          <td className="p-3 text-gray-600">{sucursal.razon_social?.nombre || 'N/A'}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                sucursal.activa
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {sucursal.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditMode(true);
                                setCurrentItem(sucursal);
                                setFormData(sucursal);
                                setModalOpen(true);
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                openDeleteModal('sucursales', sucursal);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron sucursales</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'categorías' && autoManagementMode === 'b2b' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Código</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategoriasB2B.length > 0 ? (
                      filteredCategoriasB2B.map((categoria) => (
                        <tr key={categoria.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{categoria.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{categoria.nombre}</td>
                          <td className="p-3 text-gray-600">{categoria.codigo}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                categoria.activa
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {categoria.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditMode(true);
                                setCurrentItem(categoria);
                                setFormData(categoria);
                                setModalOpen(true);
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                openDeleteModal('categorias-b2b', categoria);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron categorías B2B</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'subcategorías' && autoManagementMode === 'b2b' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Código</th>
                      <th className="text-left p-3 font-medium text-gray-700">Categoría</th>
                      <th className="text-left p-3 font-medium text-gray-700">Sucursal</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubcategoriasB2B.length > 0 ? (
                      filteredSubcategoriasB2B.map((subcategoria) => (
                        <tr key={subcategoria.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{subcategoria.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{subcategoria.nombre}</td>
                          <td className="p-3 text-gray-600">{subcategoria.codigo}</td>
                          <td className="p-3 text-gray-600">{subcategoria.categoria?.nombre || 'N/A'}</td>
                          <td className="p-3 text-gray-600">{subcategoria.sucursal?.nombre || 'N/A'}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                subcategoria.activa
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {subcategoria.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditMode(true);
                                setCurrentItem(subcategoria);
                                setFormData(subcategoria);
                                setModalOpen(true);
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                openDeleteModal('subcategorias-b2b', subcategoria);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron subcategorías B2B</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'equipos' && autoManagementMode === 'b2b' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Código</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEquipos.length > 0 ? (
                      filteredEquipos.map((equipo) => (
                        <tr key={equipo.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{equipo.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{equipo.nombre}</td>
                          <td className="p-3 text-gray-600">{equipo.codigo}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                equipo.activo
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {equipo.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditMode(true);
                                setCurrentItem(equipo);
                                setFormData(equipo);
                                setModalOpen(true);
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                openDeleteModal('equipos', equipo);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron equipos</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'áreas' && autoManagementMode === 'logistica' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">ID</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Código</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAreasLogistica.length > 0 ? (
                      filteredAreasLogistica.map((area) => (
                        <tr key={area.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">{area.id}</td>
                          <td className="p-3 font-medium" style={{ color: "#00B0B2" }}>{area.nombre}</td>
                          <td className="p-3 text-gray-600">{area.codigo}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                area.activa
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {area.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="p-3">
                            {puedeEditar() && (
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => {
                                  setEditMode(true);
                                  setCurrentItem(area);
                                  setFormData(area);
                                  setModalOpen(true);
                                }}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                  openDeleteModal('áreas', area);
                                }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No se encontraron áreas de logística</p>
                            <p className="text-sm">Intenta con otros términos de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>

    {/* Modal de Confirmación de Eliminación */}
    {deleteModalOpen && deleteInfo && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-0 w-full max-w-md mx-4 shadow-2xl overflow-hidden">
          {/* Header con branding corporativo - Color dinámico según tipo de eliminación */}
          <div className={`px-6 py-4 text-white ${deleteInfo.isPermanent ? 'bg-red-600' : 'bg-[#00B0B2]'}`}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                {deleteInfo.isPermanent ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Building2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">CAFÉ QUINDÍO</h3>
                <p className="text-sm opacity-90">
                  {deleteInfo.isPermanent ? 'ELIMINACIÓN PERMANENTE' : 'Sistema de Gestión'}
                </p>
              </div>
            </div>
          </div>

          {/* Contenido del modal */}
          <div className="p-6">
            {/* Icono de advertencia */}
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                deleteInfo.isPermanent ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                <AlertTriangle className={`w-8 h-8 ${
                  deleteInfo.isPermanent ? 'text-red-600' : 'text-yellow-600'
                }`} />
              </div>
            </div>

              {/* Mensaje principal */}
            <div className="text-center mb-6">
              <h4 className={`text-xl font-bold mb-2 ${
                deleteInfo.isPermanent || (autoManagementMode === 'planta-san-pedro' && deleteInfo.type === 'categorías') ? 'text-red-800' : 'text-gray-800'
              }`}>
                {confirmationStep === 'final' && deleteInfo.hasAssociatedAssets
                  ? '🚨 CONFIRMACIÓN FINAL REQUERIDA'
                  : confirmationStep === 'final' && autoManagementMode === 'planta-san-pedro' && deleteInfo.type === 'categorías'
                  ? '🚨 CONFIRMACIÓN FINAL - ELIMINACIÓN EN CASCADA'
                  : deleteInfo.isPermanent || (autoManagementMode === 'planta-san-pedro' && ['categorías', 'subcategorías'].includes(deleteInfo.type)) ? 'CONFIRMACIÓN CRÍTICA' : 'Confirmar Eliminación'}
              </h4>
              <p className="text-gray-600 mb-4">
                {confirmationStep === 'final' && deleteInfo.hasAssociatedAssets
                  ? `Confirme que entiende que se eliminarán PERMANENTEMENTE la planta "${deleteInfo.item.nombre}" y TODOS sus ${deleteInfo.activosAsociados} activos asociados. Esta acción NO se puede deshacer.`
                  : confirmationStep === 'final' && autoManagementMode === 'planta-san-pedro' && deleteInfo.type === 'categorías'
                  ? `Confirme que entiende que se eliminará PERMANENTEMENTE la categoría "${deleteInfo.item.nombre}" y TODAS sus subcategorías asociadas. Esta acción NO se puede deshacer.`
                  : deleteInfo.message}
              </p>
            </div>            {/* Detalles de la eliminación */}
            <div className={`border rounded-lg p-4 mb-6 ${
              deleteInfo.isPermanent 
                ? 'bg-red-50 border-red-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <p className={`text-sm font-semibold mb-2 ${
                deleteInfo.isPermanent ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {deleteInfo.isPermanent ? '🚨 ADVERTENCIA CRÍTICA:' : '⚠️ Esta acción:'}
              </p>
              <ul className={`text-sm space-y-1 ${
                deleteInfo.isPermanent ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {deleteInfo.details.map((detail, index) => (
                  <li key={index} className="flex items-start">
                    <span className={`mr-2 ${
                      deleteInfo.isPermanent ? 'text-red-500' : 'text-yellow-500'
                    }`}>•</span>
                    {detail}
                  </li>
                ))}
              </ul>
              {deleteInfo.isPermanent && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <p className="text-sm font-bold text-red-800 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Esta acción NO se puede deshacer
                  </p>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteInfo(null);
                  setConfirmationStep('first');
                }}
                variant="outline"
                className="flex-1 border-gray-300 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              {(() => {
                // Determinar si necesita doble confirmación
                const needsDoubleConfirmation = 
                  (confirmationStep === 'first' && deleteInfo.hasAssociatedAssets && deleteInfo.isPermanent) || 
                  (confirmationStep === 'first' && autoManagementMode === 'planta-san-pedro' && deleteInfo.type === 'categorías' && (plantaSubcategorias || []).filter(sub => sub.categoria_id === deleteInfo.item.id).length > 0);
                
                if (needsDoubleConfirmation) {
                  return (
                    <Button
                      onClick={() => {
                        console.log('🔄 Botón CONTINUAR presionado');
                        setConfirmationStep('final');
                      }}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      CONTINUAR
                    </Button>
                  );
                } else {
                  return (
                    <Button
                      onClick={() => {
                        console.log('🔄 Botón ELIMINAR presionado');
                        confirmDelete();
                      }}
                      className={`flex-1 text-white ${
                        confirmationStep === 'final' || deleteInfo.isPermanent || (autoManagementMode === 'planta-san-pedro' && ['categorías', 'subcategorías'].includes(deleteInfo.type))
                          ? 'bg-red-700 hover:bg-red-800' 
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {confirmationStep === 'final' 
                        ? 'SÍ, ELIMINAR TODO PERMANENTEMENTE'
                        : deleteInfo.isPermanent || (autoManagementMode === 'planta-san-pedro' && ['categorías', 'subcategorías'].includes(deleteInfo.type)) ? 'ELIMINAR PERMANENTEMENTE' : 'Eliminar'}
                    </Button>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Modal para Crear/Editar */}
    {modalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {editMode ? 'Editar' : 'Crear'} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1)}
            </h3>
            <Button
              onClick={() => setModalOpen(false)}
              variant="outline"
              size="sm"
            >
              ×
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campos comunes */}
            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre || ''}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={formData.codigo || ''}
                onChange={(e) => setFormData({...formData, codigo: e.target.value})}
              />
            </div>

            {/* Campo Tipo solo para Activos */}
            {activeTab === 'activos' && (
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Input
                  id="tipo"
                  value={formData.tipo || ''}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  placeholder="e.g. Maquinaria, Herramienta, Vehículo..."
                  required
                />
              </div>
            )}

            {/* Campos específicos según el tipo */}
            {activeTab === 'ciudades' && autoManagementMode !== 'b2b' && (
              <div>
                <Label htmlFor="zona_id">Zona *</Label>
                <Select
                  value={formData.zona_id?.toString() || ''}
                  onValueChange={(value) => setFormData({...formData, zona_id: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar zona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {zonas.map((zona) => (
                      <SelectItem key={zona.id} value={zona.id.toString()}>
                        {zona.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {activeTab === 'tiendas' && (
              <>
                <div>
                  <Label htmlFor="ciudad_id">Ciudad *</Label>
                  <Select
                    value={formData.ciudad_id?.toString() || ''}
                    onValueChange={(value) => setFormData({...formData, ciudad_id: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar ciudad..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ciudades.map((ciudad) => (
                        <SelectItem key={ciudad.id} value={ciudad.id.toString()}>
                          {ciudad.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion || ''}
                    onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono || ''}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </>
            )}

            {activeTab === 'categorías' && autoManagementMode !== 'b2b' && (
              <>
                <div>
                  <Label htmlFor="icono">Icono</Label>
                  <Input
                    id="icono"
                    value={formData.icono || ''}
                    onChange={(e) => setFormData({...formData, icono: e.target.value})}
                    placeholder="e.g. wrench, computer, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color || '#3B82F6'}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                  />
                </div>
              </>
            )}

            {activeTab === 'subcategorías' && autoManagementMode !== 'b2b' && (
              <div>
                <Label htmlFor="categoria_id">Categoría *</Label>
                <Select
                  value={formData.categoria_id?.toString() || ''}
                  onValueChange={(value) => setFormData({...formData, categoria_id: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(autoManagementMode === 'planta-san-pedro' ? plantaCategorias : categorias).map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id.toString()}>
                        {categoria.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Modal específico para Categorías B2B */}
            {activeTab === 'categorías' && autoManagementMode === 'b2b' && (
              <div>
                <Label htmlFor="sucursal_id">Sucursal B2B *</Label>
                <Select
                  value={formData.sucursal_id?.toString() || ''}
                  onValueChange={(value) => setFormData({...formData, sucursal_id: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal B2B..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sucursalesB2B.map((sucursal) => (
                      <SelectItem key={sucursal.id} value={sucursal.id.toString()}>
                        {sucursal.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Modal específico para Subcategorías B2B */}
            {activeTab === 'subcategorías' && autoManagementMode === 'b2b' && (
              <>
                <div>
                  <Label htmlFor="categoria_id">Categoría B2B *</Label>
                  <Select
                    value={formData.categoria_id?.toString() || ''}
                    onValueChange={(value) => setFormData({...formData, categoria_id: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría B2B..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriasB2B.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id.toString()}>
                          {categoria.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sucursal_id">Sucursal B2B *</Label>
                  <Select
                    value={formData.sucursal_id?.toString() || ''}
                    onValueChange={(value) => setFormData({...formData, sucursal_id: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sucursal B2B..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sucursalesB2B.map((sucursal) => (
                        <SelectItem key={sucursal.id} value={sucursal.id.toString()}>
                          {sucursal.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Modal específico para Razones Sociales B2B */}
            {activeTab === 'razones-sociales' && autoManagementMode === 'b2b' && (
              <div>
                <Label htmlFor="ciudad_id">Ciudad B2B *</Label>
                <Select
                  value={formData.ciudad_id?.toString() || ''}
                  onValueChange={(value) => setFormData({...formData, ciudad_id: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ciudad B2B..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ciudadesB2B.map((ciudad) => (
                      <SelectItem key={ciudad.id} value={ciudad.id.toString()}>
                        {ciudad.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Modal específico para Sucursales B2B */}
            {activeTab === 'sucursales' && autoManagementMode === 'b2b' && (
              <>
                <div>
                  <Label htmlFor="ciudad_id">Ciudad B2B *</Label>
                  <Select
                    value={formData.ciudad_id?.toString() || ''}
                    onValueChange={(value) => setFormData({...formData, ciudad_id: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar ciudad B2B..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ciudadesB2B.map((ciudad) => (
                        <SelectItem key={ciudad.id} value={ciudad.id.toString()}>
                          {ciudad.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="razon_social_id">Razón Social B2B *</Label>
                  <Select
                    value={formData.razon_social_id?.toString() || ''}
                    onValueChange={(value) => setFormData({...formData, razon_social_id: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar razón social B2B..." />
                    </SelectTrigger>
                    <SelectContent>
                      {razonesSociales.map((razon) => (
                        <SelectItem key={razon.id} value={razon.id.toString()}>
                          {razon.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion || ''}
                    onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono || ''}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  />
                </div>
              </>
            )}

            {/* Modal específico para Equipos B2B */}
            {activeTab === 'equipos' && autoManagementMode === 'b2b' && (
              <>
                <div>
                  <Label htmlFor="categoria_id">Categoría B2B *</Label>
                  <Select
                    value={formData.categoria_id?.toString() || ''}
                    onValueChange={(value) => setFormData({...formData, categoria_id: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría B2B..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriasB2B.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id.toString()}>
                          {categoria.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subcategoria_id">Subcategoría B2B *</Label>
                  <Select
                    value={formData.subcategoria_id?.toString() || ''}
                    onValueChange={(value) => setFormData({...formData, subcategoria_id: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar subcategoría B2B..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategoriasB2B.map((subcategoria) => (
                        <SelectItem key={subcategoria.id} value={subcategoria.id.toString()}>
                          {subcategoria.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sucursal_id">Sucursal B2B *</Label>
                  <Select
                    value={formData.sucursal_id?.toString() || ''}
                    onValueChange={(value) => setFormData({...formData, sucursal_id: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sucursal B2B..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sucursalesB2B.map((sucursal) => (
                        <SelectItem key={sucursal.id} value={sucursal.id.toString()}>
                          {sucursal.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input
                    id="modelo"
                    value={formData.modelo || ''}
                    onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    value={formData.marca || ''}
                    onChange={(e) => setFormData({...formData, marca: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="numero_serie">Número de Serie</Label>
                  <Input
                    id="numero_serie"
                    value={formData.numero_serie || ''}
                    onChange={(e) => setFormData({...formData, numero_serie: e.target.value})}
                  />
                </div>
              </>
            )}

            {/* Formulario específico para Áreas de Logística */}
            {activeTab === 'áreas' && autoManagementMode === 'logistica' && (
              <>
                <div>
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Input
                    id="descripcion"
                    value={formData.descripcion || ''}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    placeholder="Descripción del área de logística..."
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="activa"
                    checked={formData.activa !== undefined ? formData.activa : true}
                    onChange={(e) => setFormData({...formData, activa: e.target.checked})}
                    className="w-4 h-4 text-[#00B0B2] border-gray-300 rounded focus:ring-[#00B0B2]"
                  />
                  <Label htmlFor="activa" className="cursor-pointer">Activa</Label>
                </div>
              </>
            )}

            {/* Formulario específico para Activos */}
            {activeTab === 'activos' && (
              <>
                <div>
                  <Label htmlFor="planta_id">Planta *</Label>
                  <Select
                    value={formData.planta_id?.toString() || ''}
                    onValueChange={(value) => setFormData({...formData, planta_id: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar planta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {plantas.map((planta) => (
                        <SelectItem key={planta.id} value={planta.id.toString()}>
                          {planta.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Solo mostrar categoría y subcategoría si NO estamos en modo Planta San Pedro */}
                {autoManagementMode !== 'planta-san-pedro' && (
                  <>
                    <div>
                      <Label htmlFor="categoria_id">Categoría *</Label>
                      <Select
                        value={formData.categoria_id?.toString() || ''}
                        onValueChange={(value) => setFormData({...formData, categoria_id: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.map((categoria) => (
                            <SelectItem key={categoria.id} value={categoria.id.toString()}>
                              {categoria.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="subcategoria_id">Subcategoría *</Label>
                      <Select
                        value={formData.subcategoria_id?.toString() || ''}
                        onValueChange={(value) => setFormData({...formData, subcategoria_id: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar subcategoría..." />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategorias
                            .filter(sub => !formData.categoria_id || sub.categoria_id === formData.categoria_id)
                            .map((subcategoria) => (
                            <SelectItem key={subcategoria.id} value={subcategoria.id.toString()}>
                              {subcategoria.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Descripción para todos excepto tiendas (que ya tiene dirección) */}
            {activeTab !== 'tiendas' && (
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  rows={3}
                />
              </div>
            )}

            {/* Estado activo/inactivo */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={activeTab === 'activos' ? 'activo' : 'activa'}
                checked={activeTab === 'activos' ? (formData.activo !== false) : (formData.activa !== false)}
                onChange={(e) => {
                  if (activeTab === 'activos') {
                    setFormData({...formData, activo: e.target.checked});
                  } else {
                    setFormData({...formData, activa: e.target.checked});
                  }
                }}
              />
              <Label htmlFor={activeTab === 'activos' ? 'activo' : 'activa'}>Activo</Label>
            </div>

            {/* Botones */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 text-white hover:opacity-90"
                style={{ backgroundColor: "#00B0B2" }}
              >
                {editMode ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )}

    </ProtectedRoute>
  );
}
