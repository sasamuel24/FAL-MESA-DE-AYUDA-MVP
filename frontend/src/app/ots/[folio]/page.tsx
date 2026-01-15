"use client"

import React, { useState, useEffect, useRef, use } from 'react'
import { Button } from "@/components/ui/button"
import { useAuth } from "../../../lib/auth_context"
import { useRouter } from 'next/navigation'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu"
import { Users, ClipboardList, FileText, User, Paperclip, MessageSquare, CheckSquare, ArrowLeft, ChevronDown, Check, FileDown, Printer, Edit3, Save, X, Plus, Upload, Camera, Trash2, PenTool, LogOut, Eye, Settings, Clock, History, ArrowRight, Edit2, Palette, AlertCircle, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import FirmaConformidad from "@/components/FirmaConformidad"
import Link from "next/link"

// Configuración de FastAPI únicamente
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'https://b4phy0y28i.execute-api.us-east-2.amazonaws.com/v1';

// Interfaces para TypeScript
interface OTData {
  id?: number;
  folio: number;
  asunto?: string;
  fecha_creacion: string;
  fecha_visita?: string;
  categoria?: string;
  subcategoria?: string;
  zona?: string;
  ciudad?: string;
  tienda?: string;
  planta?: string;
  activo?: string;
  estado?: string;
  etapa?: string;
  prioridad?: string;
  tecnico_asignado?: string;
  solicitud_id?: number;
  notas?: string;
  tipo_mantenimiento?: string;
  tiempo_estimado?: string;
  notas_tecnico?: string;
  tipo_solicitud?: string; // 'B2C' o 'B2B'
  // Campos específicos para OTs comerciales B2B
  razon_social?: string;
  sucursal?: string;
  equipo?: string;
}

interface SolicitudData {
  id: number;
  nombre: string;
  correo: string;
  telefono?: string;
  asunto: string;
  descripcion: string;
  zona?: string;
  ciudad?: string;
  tienda?: string;
  planta?: string;
  activo?: string;
  categoria?: string;
  subcategoria?: string;
  fecha_creacion: string;
  archivo_url?: string;
  archivo_nombre?: string;
  archivo_s3_key?: string;
  // Campos específicos para solicitudes B2B
  razon_social?: string;
  sucursal?: string;
  equipo?: string;
}

interface ArchivoAdjunto {
  id?: number; // ID for deletion (from database)
  nombre: string;
  url: string;
  tipo: string;
  descripcion?: string;
  fecha?: string;
  tamano?: string;
}

interface NotaTecnico {
  texto: string;
  fecha: string;
  tecnico: string;
}

// Interface para notas trazables
interface NotaTrazable {
  id: number;
  nota: string;
  creado_por: string;
  nombre_usuario: string;
  rol_usuario: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

// Interface para etapas
interface Etapa {
  id: number;
  nombre: string;
  descripcion: string;
  color: string;
  orden: number;
  es_final: boolean;
  activa: boolean;
}

// Interface para historial de etapas
interface HistorialEtapa {
  id: number;
  folio: string;
  etapa_anterior: string;
  etapa_nueva: string;
  usuario: string;
  motivo: string;
  fecha_cambio: string;
  color_etapa_anterior?: string;
  color_etapa_nueva?: string;
}

// Funciones de conversión de fecha
const convertirDesdeBackend = (fechaISO: string): string => {
  if (!fechaISO) return "Por programar";
  
  // Si viene en formato ISO (2025-12-18T00:00:00) o YYYY-MM-DD
  const fechaLimpia = fechaISO.split('T')[0]; // 2025-12-18
  const [year, month, day] = fechaLimpia.split('-');
  return `${day}/${month}/${year}`; // 18/12/2025
};

// Función para formatear fecha y hora de las notas de manera clara
const formatearFechaHoraNota = (fechaISO: string): string => {
  if (!fechaISO) return '';
  
  try {
    const fecha = new Date(fechaISO);
    
    // Verificar si la fecha es válida
    if (isNaN(fecha.getTime())) {
      return fechaISO; // Devolver el valor original si no se puede parsear
    }
    
    // Formato: "3 oct 2025, 2:45 PM"
    return fecha.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Bogota'
    });
  } catch (error) {
    console.error('Error al formatear fecha:', error, fechaISO);
    return fechaISO; // Fallback al valor original
  }
};

// Función para obtener tiempo relativo (hace cuanto tiempo)
const obtenerTiempoRelativo = (fechaISO: string): string => {
  if (!fechaISO) return '';
  
  try {
    const fecha = new Date(fechaISO);
    const ahora = new Date();
    const diferencia = ahora.getTime() - fecha.getTime();
    
    // Convertir a minutos, horas, días
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    
    if (minutos < 1) {
      return 'Hace un momento';
    } else if (minutos < 60) {
      return `Hace ${minutos} min`;
    } else if (horas < 24) {
      return `Hace ${horas}h`;
    } else if (dias < 7) {
      return `Hace ${dias}d`;
    } else {
      // Para fechas más antiguas, mostrar la fecha completa
      return formatearFechaHoraNota(fechaISO);
    }
  } catch (error) {
    return formatearFechaHoraNota(fechaISO);
  }
};

const convertirParaInput = (fecha: string): string => {
  if (!fecha || fecha === "Por programar") return "";
  
  // Si está en formato DD/MM/YYYY -> convertir a YYYY-MM-DD para el input
  if (fecha.includes('/')) {
    const [day, month, year] = fecha.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Si ya está en formato YYYY-MM-DD, devolverlo tal como está
  return fecha;
};

const convertirParaBackend = (fecha: string): string => {
  if (!fecha || fecha === "Por programar") return "";
  
  // Si está en formato DD/MM/YYYY -> convertir a YYYY-MM-DD
  if (fecha.includes('/')) {
    const [day, month, year] = fecha.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Si ya está en formato YYYY-MM-DD, devolverlo tal como está
  return fecha;
};

// La propiedad params viene automáticamente en Next.js cuando usamos rutas dinámicas
export default function OTDetailPage({ params }: { params: Promise<{ folio: string }> }) {
  const { folio } = use(params);
  const { user, logout, token, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  // Estados para datos de la API
  const [otData, setOtData] = useState<OTData | null>(null);
  const [solicitudData, setSolicitudData] = useState<SolicitudData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el modal de exportación de PDF
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // Estados para campos editables del técnico
  const [isEditingPrioridad, setIsEditingPrioridad] = useState(false);
  const [isEditingTiempo, setIsEditingTiempo] = useState(false);
  const [isEditingFechaVisita, setIsEditingFechaVisita] = useState(false);
  const [isEditingTipoMantenimiento, setIsEditingTipoMantenimiento] = useState(false);
  const [mostrandoFormularioNota, setMostrandoFormularioNota] = useState(false);
  const [mostrandoFirmaTecnico, setMostrandoFirmaTecnico] = useState(false);
  const [firmaTecnico, setFirmaTecnico] = useState("");
  const [firmaCliente, setFirmaCliente] = useState("");
  const [nombreTecnico, setNombreTecnico] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [firmasKey, setFirmasKey] = useState(0); // Para forzar recarga del componente
  
  // Estados para la animación de guardado
  const [isGuardando, setIsGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  const [mostrarNotificacion, setMostrarNotificacion] = useState(false);
  
  // Estados para notas trazables
  const [notasTrazables, setNotasTrazables] = useState<NotaTrazable[]>([]);
  const [nuevaNotaTrazable, setNuevaNotaTrazable] = useState("");
  const [agregandoNotaTrazable, setAgregandoNotaTrazable] = useState(false);
  const [eliminandoNota, setEliminandoNota] = useState<number | null>(null);
  
  // Estado para selección de nota en PDF
  const [notaSeleccionadaPDF, setNotaSeleccionadaPDF] = useState<number | null>(null);
  
  // Estados para archivos adjuntos y eliminación
  const [eliminandoArchivo, setEliminandoArchivo] = useState<number | null>(null);
  
  // Estados para modales de confirmación de eliminación
  const [modalEliminarNota, setModalEliminarNota] = useState<{visible: boolean, notaId: number, notaTexto: string} | null>(null);
  const [modalEliminarArchivo, setModalEliminarArchivo] = useState<{visible: boolean, archivoId: number, archivoNombre: string} | null>(null);
  
  // Estado para el indicador de subida de archivos
  const [isSubiendoArchivos, setIsSubiendoArchivos] = useState(false);
  
  // Estados para notificación personalizada de archivos subidos
  const [mostrarNotificacionArchivos, setMostrarNotificacionArchivos] = useState(false);
  const [archivosSubidos, setArchivosSubidos] = useState<number>(0);
  
  // Estados para modal de campos faltantes
  const [mostrarModalCamposFaltantes, setMostrarModalCamposFaltantes] = useState(false);
  const [camposFaltantesInfo, setCamposFaltantesInfo] = useState<{folio: string, campos: string[]}>({folio: '', campos: []});
  
  // Estados para los valores editables
  const [prioridadEdit, setPrioridadEdit] = useState("");
  const [tiempoEstimadoEdit, setTiempoEstimadoEdit] = useState("Por definir");
  const [fechaVisitaEdit, setFechaVisitaEdit] = useState("");
  const [tipoMantenimientoEdit, setTipoMantenimientoEdit] = useState("correctivo");
  const [notasTecnico, setNotasTecnico] = useState<string>("");
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<ArchivoAdjunto[]>([]);
  
  // Estados para vista previa de imágenes
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [imagenPrevia, setImagenPrevia] = useState<ArchivoAdjunto | null>(null);
  
  // Referencias para los inputs file
  const fileInputFotosRef = useRef<HTMLInputElement>(null);
  const fileInputDocumentosRef = useRef<HTMLInputElement>(null);
  
  // Referencia para la función de cargar archivos
  const cargarArchivosRef = useRef<(() => Promise<void>) | null>(null);
  
  // Función para formatear fecha sin problemas de zona horaria
  const formatearFechaSinZonaHoraria = (fechaStr: string) => {
    if (!fechaStr || fechaStr === "Por programar") return "Por programar";
    
    // Si la fecha está en formato YYYY-MM-DD, crear la fecha manualmente
    // para evitar problemas de zona horaria y formatear como DD/MM/YYYY
    const [year, month, day] = fechaStr.split('-').map(Number);
    if (year && month && day) {
      // Formatear como DD/MM/YYYY
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    }
    
    return fechaStr;
  };

  // Detectar si el usuario es técnico basado en la URL de origen
  const [esTecnico, setEsTecnico] = useState(false);
  const tecnicoActual = otData?.tecnico_asignado || "Técnico no asignado";
  
  // Helper function para determinar permisos de edición
  const puedeEditar = (campo?: 'todos' | 'tecnico' | 'admin') => {
    // Verificar si tenemos información de usuario válida
    if (!user) {
      // Fallback: usar localStorage para determinar permisos temporalmente (solo en el cliente)
      if (typeof window !== 'undefined') {
        const storedUserType = localStorage.getItem('userType');
        if (storedUserType === 'admin') {
          return true; // Permitir todo para admin desde localStorage
        }
      }
      return false;
    }
    
    // Los administradores pueden editar TODOS los campos siempre
    if (user.rol === 'admin') {
      return true;
    }
    
    // Los técnicos solo pueden editar campos específicos
    if (user.rol === 'tecnico') {
      if (campo === 'tecnico' || campo === 'todos') {
        return true;
      } else if (campo === 'admin') {
        return false;
      }
    }
    
    // Verificar si el rol no está definido pero el usuario existe
    if (user && !user.rol) {
      return true; // Asumir admin si el usuario existe pero no tiene rol
    }
    
    return false;
  };

  // Estados para backend FastAPI únicamente
  const backendUrl = FASTAPI_BASE_URL.replace('/api/v1', '');
  const serverDetected = true;
  
  // Efecto para detectar el tipo de usuario al cargar el componente
  useEffect(() => {
    console.log(`🔍 Detectando tipo de usuario - Rol: ${user?.rol}, Email: ${user?.email}`);
    console.log(`🔍 Usuario completo:`, user);
    
    // Lógica simplificada: Solo basarse en el rol del usuario autenticado
    if (user?.rol === 'admin') {
      setEsTecnico(false);
      localStorage.setItem('userType', 'admin');
      console.log('👨‍💼 ✅ Usuario ADMINISTRADOR detectado - Todos los campos editables HABILITADOS');
    } else if (user?.rol === 'tecnico') {
      setEsTecnico(true);
      localStorage.setItem('userType', 'tecnico');
      console.log('🔧 ✅ Usuario TÉCNICO detectado - Vista con permisos limitados');
    } else if (user) {
      // Si hay usuario pero sin rol definido, asumir admin por defecto
      console.warn(`⚠️ Usuario sin rol definido, asumiendo ADMINISTRADOR por defecto`);
      setEsTecnico(false);
      localStorage.setItem('userType', 'admin');
      console.log('👨‍💼 ✅ Usuario sin rol -> ADMINISTRADOR por defecto - Campos editables HABILITADOS');
    } else {
      // Sin usuario, usar localStorage como fallback
      const storedUserType = localStorage.getItem('userType');
      console.log(`⚠️ Sin usuario activo, usando localStorage: ${storedUserType}`);
      
      if (storedUserType === 'admin') {
        setEsTecnico(false);
        console.log('� Usando ADMINISTRADOR desde localStorage');
      } else {
        // Por defecto, asumir admin para permitir edición
        setEsTecnico(false);
        localStorage.setItem('userType', 'admin');
        console.log('� Sin información válida -> ADMINISTRADOR por defecto');
      }
    }
    
    // Log final del estado después de un pequeño retraso
    setTimeout(() => {
      console.log(`✅ ===== ESTADO FINAL =====`);
      console.log(`✅ Usuario: ${user?.nombre || 'No identificado'}`);
      console.log(`✅ Rol: ${user?.rol || 'sin rol'}`);
      console.log(`✅ esTecnico: ${esTecnico}`);
      console.log(`✅ Puede editar: ${user?.rol === 'admin' ? 'SÍ - TODOS los campos' : user?.rol === 'tecnico' ? 'SÍ - Campos limitados' : 'NO DETERMINADO'}`);
      console.log(`✅ ========================`);
    }, 200);
  }, [user]);
  
  // Estados para etapas dinámicas
  const [etapasDisponibles, setEtapasDisponibles] = useState<string[]>([]);
  const [loadingEtapas, setLoadingEtapas] = useState(true);
  
  // Estados para gestión de etapas
  const [etapasCompletas, setEtapasCompletas] = useState<Etapa[]>([]);
  const [mostrarModalEtapa, setMostrarModalEtapa] = useState(false);
  const [etapaEditando, setEtapaEditando] = useState<Etapa | null>(null);
  const [nuevaEtapa, setNuevaEtapa] = useState({
    nombre: '',
    descripcion: '',
    color: '#3B82F6',
    es_final: false
  });
  
  // Estados para historial de etapas
  const [historialEtapas, setHistorialEtapas] = useState<HistorialEtapa[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [mostrarHistorial, setMostrarHistorial] = useState(true);
  
  // Estados para notificaciones elegantes
  const [notificacion, setNotificacion] = useState<{
    visible: boolean;
    tipo: 'success' | 'error' | 'warning' | 'info';
    titulo: string;
    mensaje: string;
    detalles?: string;
  }>({
    visible: false,
    tipo: 'success',
    titulo: '',
    mensaje: ''
  });

  // Estado para modal de confirmación de eliminación de etapa
  const [modalEliminarEtapa, setModalEliminarEtapa] = useState<{
    visible: boolean;
    etapaId: number;
    etapaNombre: string;
  } | null>(null);
  
  // Estado para manejar la etapa actual de la OT
  const [etapaActual, setEtapaActual] = useState("Cargando...");
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [loadingOT, setLoadingOT] = useState(true);
  
  // Estados para el modal de confirmación de cambio de etapa
  const [mostrarModalCambioEtapa, setMostrarModalCambioEtapa] = useState(false);
  const [cambioEtapaInfo, setCambioEtapaInfo] = useState<{folio: string, etapa: string} | null>(null);
  
  // Referencia para el dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Estados para datos de la solicitud relacionada  
  const [loadingSolicitud, setLoadingSolicitud] = useState(true);

  // Estados para manejo de técnicos y asignación
  const [tecnicos, setTecnicos] = useState<Array<{id: number, nombre: string, email: string}>>([]);
  const [loadingTecnicos, setLoadingTecnicos] = useState(true);
  const [isEditingTecnico, setIsEditingTecnico] = useState(false);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<string>('');
  const [asignandoTecnico, setAsignandoTecnico] = useState(false);
  const [mostrarDropdownTecnico, setMostrarDropdownTecnico] = useState(false);
  const dropdownTecnicoRef = useRef<HTMLDivElement>(null);

  // Función unificada para cargar etapas completas con FastAPI únicamente
  const obtenerEtapas = async () => {
    try {
      setLoadingEtapas(true);
      console.log(`🔄 Cargando etapas desde FastAPI...`);
      
      const endpoint = `${FASTAPI_BASE_URL}/etapas/listar`;
      console.log(`✅ Cargando etapas desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Establecer etapas completas con todos los detalles
          setEtapasCompletas(result.data);
          
          // Extraer nombres de etapas activas ordenados por su orden
          const nombresEtapas = result.data
            .filter((etapa: Etapa) => etapa.activa)
            .sort((a: any, b: any) => a.orden - b.orden)
            .map((etapa: any) => etapa.nombre);
          
          setEtapasDisponibles(nombresEtapas);
          console.log('🏷️ Etapas completas cargadas:', result.data);
          console.log('📋 Etapas disponibles:', nombresEtapas);
        }
      } else {
        console.error('Error al cargar etapas:', response.status);
        // Fallback a etapas por defecto si falla la API
        setEtapasDisponibles(["Arquitectura", "Compra En Sitio", "En Cotización (I/R)", "Terminada"]);
      }
    } catch (error) {
      console.error('Error al obtener etapas:', error);
      // Fallback a etapas por defecto si falla la API
      setEtapasDisponibles(["Arquitectura", "Compra En Sitio", "En Cotización (I/R)", "Terminada"]);
    } finally {
      setLoadingEtapas(false);
    }
  };

  const obtenerHistorialEtapas = async () => {
    try {
      setLoadingHistorial(true);
      console.log(`📚 Obteniendo historial de etapas para OT ${folio} desde FastAPI...`);
      
      const endpoint = `${FASTAPI_BASE_URL}/etapas/ots/${folio}/historial-etapas`;
      console.log(`✅ Cargando historial desde FastAPI: ${endpoint}`);

      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setHistorialEtapas(data.data);
          console.log(`✅ ${data.data.length} cambios de etapa cargados:`, data.data);
        } else {
          console.log('📚 No hay historial de etapas para esta OT');
          setHistorialEtapas([]);
        }
      } else {
        console.error('❌ Error al cargar historial de etapas:', response.status);
        setHistorialEtapas([]);
      }
    } catch (error) {
      console.error('Error al obtener historial de etapas:', error);
      setHistorialEtapas([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const crearEtapa = async (etapa: Omit<Etapa, 'id' | 'orden' | 'activa'>) => {
    try {
      console.log(`🔄 Creando etapa desde FastAPI...`);
      console.log('📋 Datos a enviar:', etapa);
      
      const endpoint = `${FASTAPI_BASE_URL}/etapas`;
      console.log(`✅ Creando etapa desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(etapa),
      });
      
      console.log(`📨 Respuesta HTTP: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Respuesta del servidor:', data);
        
        if (data.success) {
          await obtenerEtapas(); // Recargar la lista
          console.log('✅ Etapa creada exitosamente:', data.data);
          return data.data;
        } else {
          console.error('❌ El servidor respondió con success=false:', data);
          throw new Error(data.error || 'Error desconocido del servidor');
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ Error HTTP ${response.status}:`, errorText);
        throw new Error(`Error HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error al crear etapa:', error);
      throw error;
    }
  };

  const actualizarEtapa = async (id: number, etapa: Partial<Etapa>) => {
    try {
      console.log(`🔄 Actualizando etapa ${id} desde FastAPI...`);
      console.log('📋 Datos a enviar:', etapa);
      
      const endpoint = `${FASTAPI_BASE_URL}/etapas/${id}`;
      console.log(`✅ Actualizando etapa desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(etapa),
      });
      
      console.log(`📨 Respuesta HTTP: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Respuesta del servidor:', data);
        
        if (data.success) {
          await obtenerEtapas(); // Recargar la lista
          console.log('✅ Etapa actualizada exitosamente:', data.data);
          return data.data;
        } else {
          console.error('❌ El servidor respondió con success=false:', data);
          throw new Error(data.error || 'Error desconocido del servidor');
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ Error HTTP ${response.status}:`, errorText);
        throw new Error(`Error HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error al actualizar etapa:', error);
      throw error;
    }
  };

  const eliminarEtapa = async (id: number) => {
    try {
      console.log(`🔄 Eliminando etapa ${id} desde FastAPI...`);
      
      const endpoint = `${FASTAPI_BASE_URL}/etapas/${id}`;
      console.log(`✅ Eliminando etapa desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });
      
      console.log(`📨 Respuesta HTTP: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Respuesta del servidor:', data);
        
        if (data.success) {
          await obtenerEtapas(); // Recargar la lista
          console.log('✅ Etapa eliminada exitosamente');
          return true;
        } else {
          console.error('❌ El servidor respondió con success=false:', data);
          throw new Error(data.error || 'Error desconocido del servidor');
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ Error HTTP ${response.status}:`, errorText);
        throw new Error(`Error HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error al eliminar etapa:', error);
      throw error;
    }
  };

  // Función para abrir el modal de gestión de etapas
  const abrirModalEtapa = (etapa?: Etapa) => {
    if (etapa) {
      setEtapaEditando(etapa);
      setNuevaEtapa({
        nombre: etapa.nombre,
        descripcion: etapa.descripcion,
        color: etapa.color,
        es_final: etapa.es_final
      });
    } else {
      setEtapaEditando(null);
      setNuevaEtapa({
        nombre: '',
        descripcion: '',
        color: '#3B82F6',
        es_final: false
      });
    }
    setMostrarModalEtapa(true);
  };

  // Función para mostrar notificaciones elegantes
  const mostrarNotificacionElegante = (
    tipo: 'success' | 'error' | 'warning' | 'info', 
    titulo: string, 
    mensaje: string, 
    detalles?: string
  ) => {
    setNotificacion({
      visible: true,
      tipo,
      titulo,
      mensaje,
      detalles
    });
    
    // Auto-ocultar la notificación después de 5 segundos para success, 7 para error
    const timeout = tipo === 'success' ? 5000 : 7000;
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, timeout);
  };

  // Función para cerrar notificación manualmente
  const cerrarNotificacion = () => {
    setNotificacion(prev => ({ ...prev, visible: false }));
  };

  // Función para guardar etapa (crear o actualizar)
  const guardarEtapa = async () => {
    try {
      if (etapaEditando) {
        await actualizarEtapa(etapaEditando.id, nuevaEtapa);
      } else {
        await crearEtapa(nuevaEtapa);
      }
      setMostrarModalEtapa(false);
      setEtapaEditando(null);
      setNuevaEtapa({
        nombre: '',
        descripcion: '',
        color: '#3B82F6',
        es_final: false
      });
    } catch (error) {
      console.error('Error al guardar etapa:', error);
    }
  };

  // Función para cargar datos de la solicitud relacionada
  const cargarSolicitudRelacionada = async (solicitudId: number, tipoSolicitud?: string) => {
    try {
      setLoadingSolicitud(true);
      console.log(`🔄 Cargando solicitud ${solicitudId} desde FastAPI...`);
      console.log(`🔍 Tipo de solicitud detectado: ${tipoSolicitud}`);
      
      // Detectar el tipo de solicitud basado en el parámetro o otData.tipo_solicitud
      let endpoint: string;
      if (tipoSolicitud === 'B2B' || otData?.tipo_solicitud === 'B2B') {
        endpoint = `${FASTAPI_BASE_URL}/b2b/solicitudes/${solicitudId}`;
        console.log(`📋 Solicitud B2B detectada, usando endpoint: ${endpoint}`);
      } else {
        endpoint = `${FASTAPI_BASE_URL}/solicitudes/${solicitudId}`;
        console.log(`📋 Solicitud B2C detectada, usando endpoint: ${endpoint}`);
      }
      
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const result = await response.json();
        
        // Para B2B, la respuesta es directa (sin .success/.data)
        if (tipoSolicitud === 'B2B' || otData?.tipo_solicitud === 'B2B') {
          setSolicitudData({
            id: result.id,
            nombre: result.nombre,
            correo: result.correo,
            telefono: result.telefono,
            asunto: result.asunto,
            descripcion: result.descripcion,
            fecha_creacion: result.fecha_creacion,
            archivo_url: result.archivo_url,
            archivo_nombre: result.archivo_nombre,
            // Campos específicos de B2B
            razon_social: result.razon_social?.nombre || 'N/A',
            sucursal: result.sucursal?.nombre || 'N/A',
            equipo: result.equipo?.nombre || 'N/A',
            categoria: result.categoria?.nombre || 'N/A',
            subcategoria: result.subcategoria?.nombre || 'N/A',
            ciudad: result.ciudad?.nombre || 'N/A'
          });
          console.log('📋 Solicitud B2B relacionada cargada exitosamente:', result);
        } else if (result.success && result.data) {
          setSolicitudData(result.data);
          console.log('📋 Solicitud B2C relacionada cargada exitosamente:', result.data);
        } else {
          console.warn('⚠️ Respuesta exitosa pero sin datos válidos:', result);
        }
      } else {
        console.error(`❌ Error HTTP al cargar solicitud relacionada: ${response.status}`);
        const errorText = await response.text();
        console.error('Detalles del error:', errorText);
      }
    } catch (error) {
      console.error('❌ Error al cargar solicitud relacionada:', error);
    } finally {
      setLoadingSolicitud(false);
    }
  };

  // Función para cargar técnicos desde la API
  const cargarTecnicos = async () => {
    if (!backendUrl) return;
    
    try {
      setLoadingTecnicos(true);
      console.log(`🔄 Cargando técnicos desde FastAPI...`);
      
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const endpoint = `${FASTAPI_BASE_URL}/users/tecnicos`;
      console.log(`✅ Cargando técnicos desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setTecnicos(result.data);
          console.log('✅ Técnicos cargados exitosamente:', result.data.length, 'técnicos');
        } else {
          console.warn('⚠️ Respuesta exitosa pero sin datos válidos:', result);
          setTecnicos([]);
        }
      } else {
        console.error(`❌ Error HTTP al cargar técnicos: ${response.status}`);
        setTecnicos([]);
      }
    } catch (error) {
      console.error('❌ Error al cargar técnicos:', error);
      setTecnicos([]);
    } finally {
      setLoadingTecnicos(false);
    }
  };

  // Función para asignar técnico a la OT
  const asignarTecnico = async (tecnicoId: number, tecnicoNombre: string, tecnicoEmail: string) => {
    if (!tecnicoId) {
      mostrarNotificacionElegante('error', 'Error', 'Debe seleccionar un técnico válido');
      return;
    }

    try {
      setAsignandoTecnico(true);
      console.log(`🔄 Asignando técnico ${tecnicoNombre} (ID: ${tecnicoId}) a OT ${folio}...`);
      
      const endpoint = `${FASTAPI_BASE_URL}/ots/${folio}/asignar-tecnico`;
      console.log(`✅ Asignando desde FastAPI: ${endpoint}`);
      
      const payload = {
        tecnico_id: tecnicoId,
        tecnico_nombre: tecnicoNombre,
        tecnico_email: tecnicoEmail
      };
      
      console.log('📋 Enviando datos:', payload);
      
      // Obtener el token de autenticación
      const token = localStorage.getItem('token');
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Actualizar el estado local
          setOtData(prev => prev ? {
            ...prev,
            tecnico_asignado: tecnicoNombre
          } : prev);
          
          // Cerrar el dropdown
          setIsEditingTecnico(false);
          setMostrarDropdownTecnico(false);
          
          // Mostrar notificación de éxito
          mostrarNotificacionElegante(
            'success',
            '✅ Técnico asignado correctamente',
            `El técnico ${tecnicoNombre} ha sido asignado a la OT ${folio} y se ha enviado una notificación por correo.`,
            result.mensaje || 'Asignación completada exitosamente'
          );
          
          console.log('✅ Técnico asignado exitosamente:', result);
        } else {
          throw new Error(result.error || 'Error al asignar técnico');
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ Error HTTP ${response.status}:`, errorText);
        throw new Error(`Error del servidor: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error al asignar técnico:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      mostrarNotificacionElegante(
        'error',
        '❌ Error al asignar técnico',
        `No se pudo asignar el técnico: ${errorMessage}`,
        'Intente nuevamente o verifique su conexión.'
      );
    } finally {
      setAsignandoTecnico(false);
    }
  };

  // Función para manejar el clic fuera del dropdown de técnicos
  const handleClickOutsideTecnico = (event: MouseEvent) => {
    if (dropdownTecnicoRef.current && !dropdownTecnicoRef.current.contains(event.target as Node)) {
      setMostrarDropdownTecnico(false);
      setIsEditingTecnico(false);
    }
  };

  // useEffect para manejar clics fuera del dropdown de técnicos
  useEffect(() => {
    if (mostrarDropdownTecnico) {
      document.addEventListener('mousedown', handleClickOutsideTecnico);
      return () => {
        document.removeEventListener('mousedown', handleClickOutsideTecnico);
      };
    }
  }, [mostrarDropdownTecnico]);

  // Función para cargar firmas existentes desde la API
  const cargarFirmasExistentes = async () => {
    try {
      console.log(`🖊️ Cargando firmas de conformidad para OT ${folio}...`);
      console.log(`🔧 Estados actuales - firmaTecnico: ${firmaTecnico ? 'Tiene valor' : 'Vacío'}, firmaCliente: ${firmaCliente ? 'Tiene valor' : 'Vacío'}`);
      
      const endpoint = `${FASTAPI_BASE_URL}/firmas-conformidad/?ot_id=${otData?.id || folio}`;
      console.log(`✅ Cargando firmas desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          console.log(`✅ ${result.data.length} firma(s) encontrada(s):`, result.data);
          
          // Obtener la firma más reciente
          const firmaReciente = result.data[0];
          
          // Actualizar estados con las firmas desde S3
          if (firmaReciente.firma_tecnico && firmaReciente.firma_tecnico !== 'Sin firma') {
            console.log(`🖊️ Cargando firma técnico desde S3: ${firmaReciente.firma_tecnico.substring(0, 50)}...`);
            setFirmaTecnico(firmaReciente.firma_tecnico); // URL de S3
            console.log(`✅ Estado firmaTecnico actualizado`);
          }
          
          if (firmaReciente.firma_cliente && firmaReciente.firma_cliente !== 'Sin firma') {
            console.log(`🖊️ Cargando firma cliente desde S3: ${firmaReciente.firma_cliente.substring(0, 50)}...`);
            setFirmaCliente(firmaReciente.firma_cliente); // URL de S3
            console.log(`✅ Estado firmaCliente actualizado`);
          }
          
          // Cargar también los nombres
          if (firmaReciente.nombre_tecnico) {
            console.log(`👤 Cargando nombre técnico: ${firmaReciente.nombre_tecnico}`);
            setNombreTecnico(firmaReciente.nombre_tecnico);
          }
          
          if (firmaReciente.nombre_cliente) {
            console.log(`👤 Cargando nombre cliente: ${firmaReciente.nombre_cliente}`);
            setNombreCliente(firmaReciente.nombre_cliente);
          }
          
          console.log(`✅ Firmas cargadas exitosamente desde S3`);
          
          // Forzar recarga del componente FirmaConformidad
          setFirmasKey(prev => prev + 1);
          
          // Log final del estado después de actualizar
          setTimeout(() => {
            console.log(`🔍 Verificación final - firmaTecnico: ${firmaTecnico ? 'Tiene valor' : 'Vacío'}, firmaCliente: ${firmaCliente ? 'Tiene valor' : 'Vacío'}`);
            console.log(`🔍 Verificación nombres - nombreTecnico: ${nombreTecnico || 'Vacío'}, nombreCliente: ${nombreCliente || 'Vacío'}`);
          }, 100);
        } else {
          console.log('📝 No hay firmas de conformidad para esta OT');
        }
      } else {
        console.error('❌ Error al cargar firmas:', response.status);
      }
    } catch (error) {
      console.error('❌ Error al cargar firmas existentes:', error);
    }
  };

  // Función para cargar datos principales de la OT
  const cargarOT = async () => {
    try {
      setLoadingOT(true);
      console.log(`🔄 Cargando OT ${folio} desde FastAPI...`);
      
      const endpoint = `${FASTAPI_BASE_URL}/ots/${folio}`;
      console.log(`✅ Cargando desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setOtData(result.data);
          // Establecer la etapa actual desde los datos del backend
          setEtapaActual(result.data.etapa || result.data.estado || "Os En Curso");
          
          // Cargar las notas del técnico si existen
          setNotasTecnico(result.data.notas || "");
          
          // Establecer valores editables con los datos cargados
          setPrioridadEdit(result.data.prioridad || "Media");
          setTiempoEstimadoEdit(result.data.tiempo_estimado || "Por definir");
          setTipoMantenimientoEdit(result.data.tipo_mantenimiento || "correctivo");
          setFechaVisitaEdit(result.data.fecha_visita || "Por programar");
          
          console.log('📋 OT cargada exitosamente:', result.data);
          console.log('📋 Folio real de la OT:', result.data.folio);
          
          // Cargar datos de la solicitud relacionada solo si existe solicitud_id
          if (result.data.solicitud_id) {
            console.log(`🔍 OT cargada con tipo_solicitud: ${result.data.tipo_solicitud}`);
            await cargarSolicitudRelacionada(result.data.solicitud_id, result.data.tipo_solicitud);
          } else {
            // Para OTs creadas directamente, marcar como cargada sin solicitud
            setLoadingSolicitud(false);
            setSolicitudData(null);
            console.log('📋 OT creada directamente, sin solicitud relacionada');
          }
        } else {
          throw new Error(result.error || 'Datos de OT inválidos');
        }
      } else {
        const errorResult = await response.json();
        throw new Error(errorResult.error || `Error HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error al cargar la OT:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoadingOT(false);
    }
  };

  // Cargar datos de la OT desde el backend
  useEffect(() => {
    // Función para cargar archivos existentes de la OT
    const cargarArchivosExistentes = async () => {
      try {        
        const endpoint = `${FASTAPI_BASE_URL}/ots/${folio}/archivos`;
        console.log(`✅ Cargando archivos desde FastAPI: ${endpoint}`);
        
        // Agregar timestamp para evitar caché
        const timestamp = new Date().getTime();
        const urlCompleta = `${endpoint}?t=${timestamp}`;
        console.log(`📡 URL completa de la petición: ${urlCompleta}`);
        
        const response = await fetch(urlCompleta);
        console.log(`📨 Respuesta HTTP: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Respuesta completa del servidor:', data);
          console.log('📋 Datos de archivos recibidos:', data.data);
          
          if (data.success && data.data && data.data.archivos && data.data.archivos.length > 0) {
            console.log('📁 Procesando archivos:', data.data.archivos);
            
            const archivosFormateados = data.data.archivos.map((archivo: any, index: number) => {
              console.log(`📄 Procesando archivo ${index + 1}:`, archivo);
              
              // Usar URL de S3 si está disponible, sino usar URL local desde /uploads
              const urlArchivo = archivo.s3_url || `${backendUrl}/uploads/${archivo.nombre_guardado}?t=${timestamp}`;
              
              console.log(`🔗 URL del archivo: ${urlArchivo} (S3: ${!!archivo.s3_url})`);
              
              return {
                id: archivo.id, // Include ID for deletion
                nombre: archivo.nombre_original,
                url: urlArchivo,
                tipo: archivo.tipo === 'imagen' ? 'imagen_subida' : 'documento_subida',
                descripcion: `${archivo.tipo === 'imagen' ? 'Imagen' : 'Documento'} - ${(archivo.tamano / 1024 / 1024).toFixed(2)} MB`,
                fecha: archivo.fecha_subida,
                tamano: `${(archivo.tamano / 1024 / 1024).toFixed(2)} MB`
              };
            });
            
            console.log('✅ Archivos formateados:', archivosFormateados);
            console.log(`📊 Total archivos formateados: ${archivosFormateados.length}`);
            
            setArchivosAdjuntos(archivosFormateados);
            console.log('🎉 Estado de archivos actualizado con', archivosFormateados.length, 'archivos');
            
            // Mensaje más visible en consola
            console.log('%c🎯 ARCHIVOS CARGADOS EXITOSAMENTE', 'background: #00B0B2; color: white; padding: 5px; border-radius: 3px;');
            archivosFormateados.forEach((archivo: any, i: number) => {
              console.log(`  ${i + 1}. ${archivo.nombre} (${archivo.tamano})`);
            });
            console.log('%c=================================', 'color: #00B0B2;');
            
          } else {
            console.log('📂 No hay archivos para mostrar');
            setArchivosAdjuntos([]);
          }
        } else {
          console.error(`❌ Error HTTP al cargar archivos: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('❌ Error al cargar archivos existentes:', error);
      }
    };

    // Asignar la función a la referencia para usarla fuera del useEffect
    cargarArchivosRef.current = cargarArchivosExistentes;

    // Función para cargar notas trazables
    const cargarNotasTrazables = async () => {
      try {
        console.log(`📝 Cargando notas trazables para OT ${folio}...`);
        
        const endpoint = `${FASTAPI_BASE_URL}/ots/${folio}/notas-trazables`;
        console.log(`✅ Cargando notas desde FastAPI: ${endpoint}`);
        
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setNotasTrazables(result.data);
            
            // Si hay notas y no hay una selección previa, sugerir la primera nota para mejor experiencia
            if (result.data.length > 0 && !notaSeleccionadaPDF) {
              // No auto-seleccionar, dejar que el usuario elija conscientemente
              console.log(`💡 Sugerencia: ${result.data.length} notas disponibles para selección de PDF`);
            }
            
            console.log(`✅ ${result.data.length} notas trazables cargadas:`, result.data);
          } else {
            console.log('📝 No hay notas trazables para esta OT');
            setNotasTrazables([]);
          }
        } else {
          console.error('❌ Error al cargar notas trazables:', response.status);
          setNotasTrazables([]);
        }
      } catch (error) {
        console.error('❌ Error al cargar notas trazables:', error);
        setNotasTrazables([]);
      }
    };

    // Función para cargar historial de etapas
    const cargarHistorialEtapas = async () => {
      try {
        setLoadingHistorial(true);
        console.log(`📚 Cargando historial de etapas para OT ${folio}...`);
        
        const endpoint = `${FASTAPI_BASE_URL}/etapas/ots/${folio}/historial-etapas`;
        console.log(`✅ Cargando historial desde FastAPI: ${endpoint}`);
        
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setHistorialEtapas(result.data);
            console.log(`✅ ${result.data.length} cambios de etapa cargados:`, result.data);
          } else {
            console.log('📚 No hay historial de etapas para esta OT');
            setHistorialEtapas([]);
          }
        } else {
          console.error('❌ Error al cargar historial de etapas:', response.status);
          setHistorialEtapas([]);
        }
      } catch (error) {
        console.error('❌ Error al cargar historial de etapas:', error);
        setHistorialEtapas([]);
      } finally {
        setLoadingHistorial(false);
      }
    };

    if (folio && backendUrl && serverDetected) {
      cargarOT();
      cargarArchivosExistentes(); // Cargar archivos en el mismo useEffect
      cargarNotasTrazables(); // Cargar notas trazables
      cargarHistorialEtapas(); // Cargar historial de etapas
      cargarFirmasExistentes(); // Cargar firmas de conformidad desde S3
    }
    
    // Cargar etapas al montar el componente (solo cuando el backend esté detectado)
    if (backendUrl && serverDetected) {
      obtenerEtapas(); // Función unificada para cargar etapas
    }
  }, [folio, backendUrl, serverDetected]);

  // Efecto para cargar técnicos cuando se detecte el backend
  useEffect(() => {
    if (backendUrl && serverDetected) {
      cargarTecnicos(); // Cargar lista de técnicos para asignación
    }
  }, [backendUrl, serverDetected]);
  
  // Efecto para actualizar fechaVisitaEdit cuando se cargan los datos de la OT
  useEffect(() => {
    if (otData?.fecha_visita) {
      // Convertir fecha del backend a formato DD/MM/YYYY
      const fechaFormateada = convertirDesdeBackend(otData.fecha_visita);
      setFechaVisitaEdit(fechaFormateada);
    } else if (otData && !fechaVisitaEdit) {
      // Si no hay fecha de visita, usar "Por programar" como fallback
      setFechaVisitaEdit("Por programar");
    }
    
    // Inicializar tipo de mantenimiento desde los datos de la OT
    if (otData?.tipo_mantenimiento) {
      setTipoMantenimientoEdit(otData.tipo_mantenimiento);
    } else if (otData && !tipoMantenimientoEdit) {
      // Si no hay tipo de mantenimiento, usar "correctivo" como fallback
      setTipoMantenimientoEdit("correctivo");
    }
  }, [otData]);
  
  // Usar los datos cargados del backend o los datos mock como fallback
  const currentOtData = otData ? {
    // Datos de la OT
    folio: otData.folio,
    asunto: otData.asunto || (solicitudData?.asunto) || "Cargando...",
    // Si la solicitud es dummy (sistema@ot-directa.com), usar las notas de la OT, sino usar descripción de solicitud
    descripcion: (solicitudData?.correo === 'sistema@ot-directa.com') 
      ? otData.notas || "Sin descripción disponible"
      : solicitudData?.descripcion || otData.notas || "Sin descripción disponible",
    fechaCreacion: new Date(otData.fecha_creacion).toLocaleDateString('es-ES'),
    fechaVisita: fechaVisitaEdit,
    categoria: otData.categoria || solicitudData?.categoria,
    subcategoria: otData.subcategoria || solicitudData?.subcategoria,
    zona: otData.zona || solicitudData?.zona,
    ciudad: otData.ciudad || solicitudData?.ciudad,
    tienda: otData.tienda || solicitudData?.tienda,
    planta: otData.planta || solicitudData?.planta,
    activo: otData.activo || solicitudData?.activo,
    // Campos comerciales B2B
    razon_social: otData.razon_social || solicitudData?.razon_social,
    sucursal: otData.sucursal || solicitudData?.sucursal,
    equipo: otData.equipo || solicitudData?.equipo,
    estatus: otData.estado,
    prioridad: otData.prioridad,
    etapa: otData.etapa || otData.estado || "Cargando...",
    tecnicoAsignado: otData.tecnico_asignado || "Cargando...",
    //telefonoTecnico: "310-555-1234", // Este se puede agregar al modelo OT
    tiempoEstimado: tiempoEstimadoEdit,
    tipoMantenimiento: tipoMantenimientoEdit,
    // Datos del solicitante desde la solicitud B2C o valores por defecto para OTs directas
    solicitante: (solicitudData?.correo === 'sistema@ot-directa.com') 
      ? "Administrador del Sistema"
      : solicitudData?.nombre || (!loadingSolicitud ? "OT Directa" : "Cargando..."),
    contactoSolicitante: (solicitudData?.correo === 'sistema@ot-directa.com')
      ? "Creada directamente por admin"
      : solicitudData?.telefono || solicitudData?.correo || (!loadingSolicitud ? "N/A" : "Cargando..."),
    // Notas del técnico - usando el estado
    notas: notasTecnico,
    // Archivos adjuntos - usando el estado
    archivos: archivosAdjuntos,
    // Firma del técnico y cliente
    firmas: {
      tecnico: firmaTecnico,
      cliente: firmaCliente,
      fechaFirma: "4/9/2025 12:05"
    }
  } : {
    // Datos mock como fallback
    folio: folio,
    asunto: "Cargando...",
    descripcion: "Cargando descripción...",
    fechaCreacion: "Cargando...",
    fechaVisita: "Cargando...",
    categoria: "Cargando...",
    subcategoria: "Cargando...",
    zona: "Cargando...",
    ciudad: "Cargando...",
    tienda: "Cargando...",
    planta: "Cargando...",
    activo: "Cargando...",
    estatus: "Cargando...",
    prioridad: "Cargando...",
    etapa: "Cargando...",
    tecnicoAsignado: "Cargando...",
    tiempoEstimado: tiempoEstimadoEdit,
    solicitante: "Cargando...",
    contactoSolicitante: "Cargando...",
    notas: notasTecnico,
    archivos: archivosAdjuntos,
    firmas: {
      tecnico: firmaTecnico,
      cliente: firmaCliente,
      fechaFirma: "4/9/2025 12:05"
    }
  };

  const navigationItems = [
    { name: "ORGANIZACIONES", icon: Settings, href: "/organizaciones" },
    { name: "OTS", icon: ClipboardList, href: "/ots" },
    { name: "SOLICITUDES", icon: FileText, href: "/solicitudes" },
  ]
  
  const navigationItemsTecnico = [
    { name: "MIS OTS", icon: ClipboardList, href: "/tecnico" },
    { name: "PERFIL", icon: User, href: "/tecnico/perfil" },
  ]

  const handleNavigation = (href: string) => {
    router.push(href);
  }

  const handleLogout = () => {
    logout();
  }
  
  const handleBack = () => {
    // Usar Next.js router en lugar de window.location.href para mantener el contexto
    if (user?.rol === 'tecnico') {
      router.push("/tecnico");
    } else {
      // Por defecto, volver a la vista de administrador
      router.push("/ots");
    }
  }

  // Funciones para manejo de imágenes
  const abrirVistaPrevia = (archivo: ArchivoAdjunto) => {
    setImagenPrevia(archivo);
    setMostrarVistaPrevia(true);
  };

  const cerrarVistaPrevia = () => {
    setMostrarVistaPrevia(false);
    setImagenPrevia(null);
  };
  



  
  // Función para cerrar el modal de exportación
  const closeExportModal = () => {
    setIsExporting(false);
    setExportSuccess(false);
  }
  
  // Funciones para manejar la edición de campos
  const handleSavePrioridad = async () => {
    try {
      console.log(`🔧 Guardando prioridad: ${prioridadEdit}`);
      
      const endpoint = `${FASTAPI_BASE_URL}/ots/${folio}/prioridad`;
      console.log(`✅ Actualizando prioridad desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prioridad: prioridadEdit
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setIsEditingPrioridad(false);
        console.log('✅ Prioridad actualizada exitosamente:', result.data);
        
        // Actualizar los datos locales
        if (otData) {
          setOtData({ ...otData, prioridad: prioridadEdit });
        }
        
        // Mostrar notificación de éxito
        setGuardadoExitoso(true);
        setMostrarNotificacion(true);
        
        // Ocultar notificación después de 3 segundos
        setTimeout(() => {
          setMostrarNotificacion(false);
          setGuardadoExitoso(false);
        }, 3000);
      } else {
        throw new Error(result.error || 'Error al actualizar prioridad');
      }
      
    } catch (error: any) {
      console.error('❌ Error al guardar prioridad:', error);
      alert(`Error al guardar prioridad: ${error.message}`);
    }
  }
  
  const handleSaveTiempo = async () => {
    try {
      console.log(`🔧 Guardando tiempo estimado: ${tiempoEstimadoEdit}`);
      
      const endpoint = `${FASTAPI_BASE_URL}/ots/${folio}/tiempo-estimado`;
      console.log(`✅ Actualizando tiempo estimado desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tiempo_estimado: tiempoEstimadoEdit
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setIsEditingTiempo(false);
        console.log('✅ Tiempo estimado actualizado exitosamente:', result.data);
        
        // Actualizar los datos locales
        if (otData) {
          setOtData({ ...otData, tiempo_estimado: tiempoEstimadoEdit });
        }
        
        // Mostrar notificación de éxito
        setGuardadoExitoso(true);
        setMostrarNotificacion(true);
        
        // Ocultar notificación después de 3 segundos
        setTimeout(() => {
          setMostrarNotificacion(false);
          setGuardadoExitoso(false);
        }, 3000);
      } else {
        throw new Error(result.error || 'Error al actualizar tiempo estimado');
      }
      
    } catch (error: any) {
      console.error('❌ Error al guardar tiempo estimado:', error);
      alert(`Error al guardar tiempo estimado: ${error.message}`);
    }
  }
  
  const handleSaveTipoMantenimiento = async () => {
    try {
      console.log(`🔧 Guardando tipo de mantenimiento: ${tipoMantenimientoEdit}`);
      
      const endpoint = `${FASTAPI_BASE_URL}/ots/${folio}/tipo-mantenimiento`;
      console.log(`✅ Actualizando tipo de mantenimiento desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo_mantenimiento: tipoMantenimientoEdit
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setIsEditingTipoMantenimiento(false);
        console.log('✅ Tipo de mantenimiento actualizado exitosamente:', result.data);
        
        // Actualizar los datos locales
        if (otData) {
          setOtData({ ...otData, tipo_mantenimiento: tipoMantenimientoEdit });
        }
        
        // Mostrar notificación de éxito
        setGuardadoExitoso(true);
        setMostrarNotificacion(true);
        
        // Ocultar notificación después de 3 segundos
        setTimeout(() => {
          setMostrarNotificacion(false);
          setGuardadoExitoso(false);
        }, 3000);
      } else {
        throw new Error(result.error || 'Error al actualizar tipo de mantenimiento');
      }
      
    } catch (error: any) {
      console.error('❌ Error al guardar tipo de mantenimiento:', error);
      alert(`Error al guardar tipo de mantenimiento: ${error.message}`);
    }
  }
  
  // Función para agregar notas trazables
  const handleAgregarNotaTrazable = async () => {
    if (!nuevaNotaTrazable.trim() || !user?.email) {
      alert('No se puede agregar la nota. Verifica que hayas ingresado texto y que tengas sesión activa.');
      return;
    }
    
    try {
      setAgregandoNotaTrazable(true);
      console.log(`📝 Agregando nota trazable: ${nuevaNotaTrazable}`);
      
      const endpoint = `${FASTAPI_BASE_URL}/ots/${folio}/notas-trazables`;
      console.log(`✅ Creando nota desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nota: nuevaNotaTrazable,
          usuario_email: user.email,
          usuario_nombre: user.nombre || user.email,
          usuario_rol: user.rol || 'usuario'
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Nota trazable agregada con éxito');
        
        // Recargar las notas trazables
        await cargarNotasTrazablesActualizar();
        
        // Limpiar formulario
        setNuevaNotaTrazable('');
        setMostrandoFormularioNota(false);
        
        // Mostrar notificación de éxito
        setGuardadoExitoso(true);
        setMostrarNotificacion(true);
        
        setTimeout(() => {
          setMostrarNotificacion(false);
          setGuardadoExitoso(false);
        }, 3000);
        
      } else {
        throw new Error(result.error || 'Error al agregar nota trazable');
      }
      
    } catch (error: any) {
      console.error('❌ Error al agregar nota trazable:', error);
      alert(`Error al agregar la nota: ${error.message}`);
    } finally {
      setAgregandoNotaTrazable(false);
    }
  };

  // Función auxiliar para recargar notas trazables
  const cargarNotasTrazablesActualizar = async () => {
    try {
      console.log(`📝 Recargando notas trazables para OT ${folio}...`);
      
      const endpoint = `${FASTAPI_BASE_URL}/ots/${folio}/notas-trazables`;
      console.log(`✅ Recargando notas desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setNotasTrazables(result.data);
          console.log(`✅ ${result.data.length} notas trazables recargadas`);
        } else {
          setNotasTrazables([]);
        }
      } else {
        console.error('❌ Error al recargar notas trazables:', response.status);
        setNotasTrazables([]);
      }
    } catch (error) {
      console.error('❌ Error al recargar notas trazables:', error);
      setNotasTrazables([]);
    }
  };

  // Función para eliminar nota trazable
  const handleEliminarNotaTrazable = async (notaId: number) => {
    const nota = notasTrazables.find(n => n.id === notaId);
    if (!nota) return;
    
    // Mostrar modal de confirmación elegante
    setModalEliminarNota({
      visible: true,
      notaId: notaId,
      notaTexto: nota.nota.substring(0, 100) + (nota.nota.length > 100 ? '...' : '')
    });
  };

  // Función para confirmar eliminación de nota
  const confirmarEliminarNota = async () => {
    if (!modalEliminarNota) return;

    try {
      setEliminandoNota(modalEliminarNota.notaId);
      setModalEliminarNota(null);
      console.log(`🗑️ Eliminando nota trazable ${modalEliminarNota.notaId}...`);
      const endpoint = `${FASTAPI_BASE_URL}/ots/${folio}/notas-trazables/${modalEliminarNota.notaId}`;
      console.log(`✅ Eliminando nota desde FastAPI: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Nota trazable eliminada con éxito');
        
        // Recargar las notas trazables
        await cargarNotasTrazablesActualizar();
        
        // Mostrar notificación de éxito
        setGuardadoExitoso(true);
        setMostrarNotificacion(true);
        
        setTimeout(() => {
          setMostrarNotificacion(false);
          setGuardadoExitoso(false);
        }, 3000);
        
      } else {
        throw new Error(result.error || 'Error al eliminar nota trazable');
      }
      
    } catch (error: any) {
      console.error('❌ Error al eliminar nota trazable:', error);
      alert(`Error al eliminar la nota: ${error.message}`);
    } finally {
      setEliminandoNota(null);
    }
  };

  // Función para eliminar archivo adjunto
  const handleEliminarArchivo = async (archivoId: number, nombreArchivo: string) => {
    // Mostrar modal de confirmación elegante
    setModalEliminarArchivo({
      visible: true,
      archivoId: archivoId,
      archivoNombre: nombreArchivo
    });
  };

  // Función para confirmar eliminación de archivo
  const confirmarEliminarArchivo = async () => {
    if (!modalEliminarArchivo) return;

    try {
      setEliminandoArchivo(modalEliminarArchivo.archivoId);
      setModalEliminarArchivo(null);
      console.log(`🗑️ Eliminando archivo ${modalEliminarArchivo.archivoId}...`);

      const endpoint = `${FASTAPI_BASE_URL}/ots/${folio}/archivos/${modalEliminarArchivo.archivoId}`;
      console.log(`✅ Eliminando archivo desde FastAPI: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Archivo eliminado con éxito');
        
        // Recargar los archivos adjuntos usando la referencia
        if (cargarArchivosRef.current) {
          await cargarArchivosRef.current();
        }
        
        // Mostrar notificación de éxito
        setGuardadoExitoso(true);
        setMostrarNotificacion(true);
        
        setTimeout(() => {
          setMostrarNotificacion(false);
          setGuardadoExitoso(false);
        }, 3000);
        
      } else {
        throw new Error(result.error || 'Error al eliminar archivo');
      }
      
    } catch (error: any) {
      console.error('❌ Error al eliminar archivo:', error);
      alert(`Error al eliminar el archivo: ${error.message}`);
    } finally {
      setEliminandoArchivo(null);
    }
  };
  
  const handleSaveFechaVisita = async () => {
    try {
      console.log(`🗓️ Guardando fecha de visita: ${fechaVisitaEdit}`);
      
      // Convertir la fecha a formato YYYY-MM-DD para enviar al backend
      let fechaParaEnviar = null;
      if (fechaVisitaEdit && fechaVisitaEdit !== "Por programar") {
        fechaParaEnviar = convertirParaBackend(fechaVisitaEdit);
      }
      
      const endpoint = `${FASTAPI_BASE_URL}/ots/${folio}/fecha-visita`;
      console.log(`✅ Actualizando fecha de visita desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fecha_visita: fechaParaEnviar
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setIsEditingFechaVisita(false);
        console.log('✅ Fecha de visita actualizada exitosamente:', result.data);
        
        // Mostrar notificación de éxito
        setGuardadoExitoso(true);
        setMostrarNotificacion(true);
        
        // Ocultar notificación después de 3 segundos
        setTimeout(() => {
          setMostrarNotificacion(false);
          setGuardadoExitoso(false);
        }, 3000);
      } else {
        throw new Error(result.error || 'Error al actualizar fecha de visita');
      }
      
    } catch (error: any) {
      console.error('❌ Error al guardar fecha de visita:', error);
      alert(`Error al guardar fecha de visita: ${error.message}`);
    }
  }
  
  const handleEliminarFirmaTecnico = () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar tu firma?')) {
      setFirmaTecnico("");
    }
  }
  
  const handleEliminarFirmaCliente = () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar la firma del cliente?')) {
      setFirmaCliente("");
    }
  }
  
  const handleAgregarFirmaTecnico = () => {
    setMostrandoFirmaTecnico(true);
  }
  
  const handleAgregarFirmaCliente = () => {
    setMostrandoFirmaCliente(true);
  }
  

  
  // Referencias para el canvas de firma
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasClienteRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingCliente, setIsDrawingCliente] = useState(false);
  const [mostrandoFirmaCliente, setMostrandoFirmaCliente] = useState(false);
  
  // Funciones para el canvas de firma
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    setIsDrawing(true);
    
    // Para mouse
    if ('clientX' in e) {
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }
    // Para touch
    else if ('touches' in e) {
      e.preventDefault();
      const touch = e.touches[0];
      ctx.beginPath();
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    }
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Para mouse
    if ('clientX' in e) {
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    }
    // Para touch
    else if ('touches' in e) {
      e.preventDefault();
      const touch = e.touches[0];
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      ctx.stroke();
    }
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
  };
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  
  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL('image/png');
    setFirmaTecnico(dataURL);
    setMostrandoFirmaTecnico(false);
    console.log('Firma del técnico guardada');
  };
  
  const cancelSignature = () => {
    setMostrandoFirmaTecnico(false);
    clearCanvas();
  };
  
  // Funciones específicas para firma del cliente
  const startDrawingCliente = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasClienteRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    setIsDrawingCliente(true);
    
    // Para mouse
    if ('clientX' in e) {
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }
    // Para touch
    else if ('touches' in e) {
      e.preventDefault();
      const touch = e.touches[0];
      ctx.beginPath();
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    }
  };
  
  const drawCliente = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingCliente) return;
    
    const canvas = canvasClienteRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Para mouse
    if ('clientX' in e) {
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    }
    // Para touch
    else if ('touches' in e) {
      e.preventDefault();
      const touch = e.touches[0];
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      ctx.stroke();
    }
  };
  
  const stopDrawingCliente = () => {
    setIsDrawingCliente(false);
  };
  
  const clearCanvasCliente = () => {
    const canvas = canvasClienteRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  
  const saveSignatureCliente = () => {
    const canvas = canvasClienteRef.current;
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL('image/png');
    setFirmaCliente(dataURL);
    setMostrandoFirmaCliente(false);
    console.log('Firma del cliente guardada');
  };
  
  const cancelSignatureCliente = () => {
    setMostrandoFirmaCliente(false);
    clearCanvasCliente();
  };

  // Función para exportar PDF usando el servicio directo (mantiene diseño exacto Excel)
  const handleExportPDF = async () => {
    if (!otData) {
      alert('No hay datos de la OT para exportar');
      return;
    }

    setIsExporting(true);

    try {
      console.log('🔄 Iniciando exportación PDF con plantilla Excel...');
      
      // Construir URL con parámetro opcional de nota seleccionada
      let endpoint = `${FASTAPI_BASE_URL}/ots/${folio}/generar-pdf-directo`;
      if (notaSeleccionadaPDF) {
        endpoint += `?nota_id=${notaSeleccionadaPDF}`;
        console.log(`🎯 Nota seleccionada para PDF: ${notaSeleccionadaPDF}`);
      } else {
        console.log('📝 Sin nota específica - incluirá todas las notas');
      }
      
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        let errorMessage = `Error del servidor: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.error || errorMessage;
        } catch {
          // Si no es JSON, usar mensaje de estado HTTP
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Descargar el archivo PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OT_${folio}_CafeQuindio.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      setExportSuccess(true);
      console.log('✅ PDF exportado exitosamente con plantilla Excel');

    } catch (error) {
      console.error('❌ Error al exportar PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`❌ Error al generar PDF: ${errorMessage}`);
    } finally {
      setIsExporting(false);
      // Reset success state after 3 seconds
      setTimeout(() => setExportSuccess(false), 3000);
    }
  };
  
  // Función para manejar el guardado con animación profesional
  const handleGuardarOT = async () => {
    setIsGuardando(true);
    setGuardadoExitoso(false);
    setMostrarNotificacion(false);
    
    try {
      // Simular proceso de guardado (aquí iría la lógica real)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Guardado exitoso
      setIsGuardando(false);
      setGuardadoExitoso(true);
      setMostrarNotificacion(true);
      
      // Ocultar notificación después de 3 segundos
      setTimeout(() => {
        setMostrarNotificacion(false);
        setGuardadoExitoso(false);
      }, 3000);
      
    } catch (error) {
      setIsGuardando(false);
      console.error('Error al guardar:', error);
    }
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔄 handleFileUpload llamado', event);
    console.log('🔍 Estado actual - esTecnico:', esTecnico, 'user?.rol:', user?.rol);
    
    if (!event.target.files || event.target.files.length === 0) {
      console.log('❌ No hay archivos seleccionados');
      return;
    }
    
    const files = Array.from(event.target.files);
    console.log('📁 Archivos seleccionados:', files.length, files.map(f => f.name));
    
    // Activar indicador de carga
    setIsSubiendoArchivos(true);
    
    try {
      // Crear objetos para mostrar inmediatamente en la UI
      const nuevosArchivos = files.map((file: File) => ({
        nombre: file.name,
        url: URL.createObjectURL(file),
        tipo: file.type.startsWith('image/') ? 'imagen_subida' : 'documento_subido',
        descripcion: `${file.type.startsWith('image/') ? 'Imagen' : 'Documento'} subido por técnico - ${(file.size / 1024 / 1024).toFixed(2)} MB`,
        fecha: new Date().toISOString(),
        tamano: `${(file.size / 1024 / 1024).toFixed(2)} MB`
      }));
      
      console.log('✅ Nuevos archivos creados para UI:', nuevosArchivos);
      
      // No actualizar la UI inmediatamente - lo haremos después de subir al servidor
      // const archivosActualizados = [...archivosAdjuntos, ...nuevosArchivos];
      // setArchivosAdjuntos(archivosActualizados);
      // console.log('🎉 UI actualizada con archivos:', archivosActualizados);
      
      // Subir archivos al backend
      try {
        console.log('🚀 Iniciando subida al backend...');
        const resultado = await subirArchivosAlBackend(files);
        console.log('✅ Archivos guardados en backend exitosamente:', resultado);
        
        // Recargar archivos desde el servidor para obtener información actualizada
        console.log('🔄 Recargando archivos desde el servidor...');
        await cargarArchivosRef.current?.();
        
        // Forzar una segunda recarga después de un pequeño delay para asegurar que se muestren
        setTimeout(async () => {
          console.log('🔄 Segunda recarga de archivos...');
          await cargarArchivosRef.current?.();
        }, 1000);
        
        // Mostrar notificación personalizada de éxito
        setArchivosSubidos(files.length);
        setMostrarNotificacionArchivos(true);
        
        // Ocultar notificación después de 4 segundos
        setTimeout(() => {
          setMostrarNotificacionArchivos(false);
        }, 4000);
        
      } catch (errorBackend) {
        console.error('❌ Error al guardar en backend:', errorBackend);
        
        // Mostrar mensaje de error más específico
        let mensajeError = 'Error desconocido al guardar archivos';
        if (errorBackend instanceof Error) {
          mensajeError = errorBackend.message;
        }
        
        alert(`❌ Error al guardar archivos en el servidor:\n${mensajeError}\n\nLos archivos se mantienen temporalmente en la interfaz.`);
        
        // Log adicional para debugging
        console.error('Detalles del error:', {
          error: errorBackend,
          folio: folio,
          userId: user?.id,
          userRole: user?.rol,
          filesCount: files.length,
          fileNames: files.map(f => f.name)
        });
      }
      
      // Resetear el input para permitir seleccionar el mismo archivo nuevamente
      event.target.value = '';
      
    } catch (error) {
      console.error('❌ Error general en handleFileUpload:', error);
      alert('❌ Error inesperado al procesar archivos');
    } finally {
      // Desactivar indicador de carga
      setIsSubiendoArchivos(false);
    }
  };

  // Función para abrir selector de fotos
  const abrirSelectorFotos = () => {
    console.log('🖼️ Abriendo selector de fotos...');
    fileInputFotosRef.current?.click();
  }

  // Función para abrir selector de documentos
  const abrirSelectorDocumentos = () => {
    console.log('📄 Abriendo selector de documentos...');
    fileInputDocumentosRef.current?.click();
  }



  // Función para subir archivos al backend
  const subirArchivosAlBackend = async (archivos: File[]) => {
    try {
      const formData = new FormData();
      
      // Agregar cada archivo al FormData
      archivos.forEach((archivo, index) => {
        formData.append('archivos', archivo);
        console.log(`📎 Agregando archivo ${index + 1}: ${archivo.name} (${archivo.size} bytes)`);
      });
      
      // Agregar información adicional
      formData.append('folio', folio);
      formData.append('tecnico_id', user?.id?.toString() || '');
      
      console.log('📤 Enviando petición al backend...');
      
      // Usar FastAPI únicamente
      const endpoint = `${FASTAPI_BASE_URL}/ots/${folio}/archivos`;
      console.log(`✅ Subiendo archivos a FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(5000), // 5 segundos timeout
      });
      
      console.log(`📨 Respuesta del servidor FastAPI:`, response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error HTTP:', response.status, errorText);
        throw new Error(`Error HTTP ${response.status}: ${errorText}`);
      }
      
      const resultado = await response.json();
      console.log('✅ Respuesta exitosa del backend:', resultado);
      
      return resultado;
    } catch (error) {
      console.error('❌ Error detallado al subir archivos:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('No se puede conectar con el servidor FastAPI. Verifica que el backend esté corriendo en http://localhost:8001');
      }
      throw error;
    }
  }
  
  // Función para manejar el cambio de etapa
  const handleCambioEtapa = async (nuevaEtapa: string) => {
    try {
      console.log(`🔄 Cambiando etapa de OT ${folio} a: ${nuevaEtapa} desde FastAPI...`);
      console.log('📋 Datos a enviar:', { estado: nuevaEtapa });
      
      const endpoint = `${FASTAPI_BASE_URL}/etapas/ots/${folio}/etapa`;
      console.log(`✅ Cambiando etapa desde FastAPI: ${endpoint}`);
      
      // Llamar al endpoint para cambiar la etapa
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado: nuevaEtapa
        })
      });
      
      console.log(`📨 Respuesta HTTP: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({}));
        
        console.log('🔍 DEBUG - Response status:', response.status);
        console.log('🔍 DEBUG - errorResult:', errorResult);
        console.log('🔍 DEBUG - campos_faltantes:', errorResult.campos_faltantes);
        
        // Error 400 con campos faltantes (validación de campos obligatorios)
        if (response.status === 400 && errorResult.campos_faltantes) {
          console.log('✅ Entrando al bloque de modal de campos faltantes');
          setCamposFaltantesInfo({
            folio: folio,
            campos: errorResult.campos_faltantes
          });
          setMostrarModalCamposFaltantes(true);
          setMostrarDropdown(false);
          return; // Salir de la función
        }
        
        // Otros errores
        const errorText = typeof errorResult === 'string' ? errorResult : JSON.stringify(errorResult);
        console.error(`❌ Error HTTP ${response.status}:`, errorText);
        throw new Error(`Error del servidor: ${response.status} - ${errorResult.error || errorText}`);
      }
      
      const result = await response.json();
      console.log('📋 Respuesta del servidor:', result);
      
      if (result.success) {
        // Actualizar el estado local solo si la actualización fue exitosa
        setEtapaActual(nuevaEtapa);
        setMostrarDropdown(false);
        
        console.log('✅ Etapa actualizada exitosamente:', result.data);
        
        // Recargar los datos de la OT desde el backend para asegurar sincronización
        try {
          const reloadEndpoint = `${FASTAPI_BASE_URL}/ots/${folio}`;
          
          console.log(`🔄 Recargando datos de OT desde FastAPI: ${reloadEndpoint}`);
          
          const reloadResponse = await fetch(reloadEndpoint);
          if (reloadResponse.ok) {
            const reloadResult = await reloadResponse.json();
            if (reloadResult.success && reloadResult.data) {
              setOtData(reloadResult.data);
              setEtapaActual(reloadResult.data.estado || nuevaEtapa);
              console.log('🔄 Datos de OT recargados desde el backend');
            }
          }
        } catch (reloadError) {
          console.warn('⚠️ No se pudieron recargar los datos de la OT:', reloadError);
        }
        
        // Recargar el historial de etapas después del cambio
        await obtenerHistorialEtapas();
        
        // Mostrar notificación de éxito
        setGuardadoExitoso(true);
        setMostrarNotificacion(true);
        
        // Ocultar notificación después de 3 segundos
        setTimeout(() => {
          setMostrarNotificacion(false);
          setGuardadoExitoso(false);
        }, 3000);
        
        } else {
          console.error('❌ El servidor respondió con success=false:', result);
          throw new Error(result.message || result.error || 'Error al cambiar la etapa');
        }
        
      } catch (error: any) {
        console.error('❌ Error al cambiar etapa:', error);
        
        // Mostrar notificación de error más informativa
        const errorMessage = error.message || 'Error desconocido';
        mostrarNotificacionElegante(
          'error',
          'Error al cambiar etapa',
          `No se pudo actualizar la etapa de la OT ${folio}`,
          `Detalles: ${errorMessage}`
        );
      }
    };  // Función para mostrar modal de confirmación
  const confirmarCambioEtapa = (nuevaEtapa: string) => {
    // Mostrar modal de confirmación elegante
    setCambioEtapaInfo({
      folio: folio,
      etapa: nuevaEtapa
    });
    setMostrarModalCambioEtapa(true);
  }

  // Funciones para gestión de etapas aca se crea esta ok
  const handleCrearEtapa = async () => {
    // Validar que el nombre no esté vacío
    if (!nuevaEtapa.nombre.trim()) {
      mostrarNotificacionElegante(
        'warning',
        'Campo requerido',
        'El nombre de la etapa es obligatorio',
        'Por favor ingresa un nombre válido para la etapa antes de continuar.'
      );
      return;
    }

    try {
      const endpoint = `${FASTAPI_BASE_URL}/etapas`;
      console.log(`✅ Creando etapa desde FastAPI: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nuevaEtapa),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Etapa creada exitosamente:', result.data);
        setMostrarModalEtapa(false);
        setNuevaEtapa({ nombre: '', descripcion: '', color: '#3B82F6', es_final: false });
        
        // Recargar etapas
        await obtenerEtapas();
        
        // Mostrar notificación elegante
        mostrarNotificacionElegante(
          'success',
          'Etapa creada exitosamente',
          `La etapa "${result.data.nombre}" ha sido agregada al sistema`,
          `Ya puedes usar esta etapa en tus órdenes de trabajo. Orden de prioridad: ${result.data.orden}`
        );
      } else {
        throw new Error(result.error || 'Error al crear la etapa');
      }
    } catch (error: any) {
      console.error('Error al crear etapa:', error);
      mostrarNotificacionElegante(
        'error',
        'Error al crear etapa',
        error.message || 'No se pudo crear la etapa',
        'Verifica que el nombre no esté duplicado y que todos los campos sean válidos.'
      );
    }
  };

  const handleEditarEtapa = async () => {
    if (!etapaEditando) return;
    
    // Validar que el nombre no esté vacío
    if (!nuevaEtapa.nombre.trim()) {
      mostrarNotificacionElegante(
        'warning',
        'Campo requerido',
        'El nombre de la etapa es obligatorio',
        'Por favor ingresa un nombre válido para la etapa antes de continuar.'
      );
      return;
    }
    
    try {
      const endpoint = `${FASTAPI_BASE_URL}/etapas/${etapaEditando.id}`;
      console.log(`✅ Editando etapa desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nuevaEtapa),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Etapa editada exitosamente:', result.data);
        setMostrarModalEtapa(false);
        setEtapaEditando(null);
        setNuevaEtapa({ nombre: '', descripcion: '', color: '#3B82F6', es_final: false });
        
        // Recargar etapas
        await obtenerEtapas();
        
        // Si se editó la etapa actual, actualizar el nombre mostrado
        if (etapaEditando.nombre === etapaActual) {
          setEtapaActual(nuevaEtapa.nombre);
        }
        
        // Mostrar notificación elegante
        mostrarNotificacionElegante(
          'success',
          'Etapa actualizada exitosamente',
          `Los cambios en "${result.data.nombre}" han sido guardados`,
          'La etapa actualizada ya está disponible para usar en las órdenes de trabajo.'
        );
      } else {
        throw new Error(result.error || 'Error al editar la etapa');
      }
    } catch (error: any) {
      console.error('Error al editar etapa:', error);
      mostrarNotificacionElegante(
        'error',
        'Error al actualizar etapa',
        error.message || 'No se pudo actualizar la etapa',
        'Verifica que el nombre no esté duplicado y que todos los campos sean válidos.'
      );
    }
  };

  const handleEliminarEtapa = async (etapaId: number) => {
    const etapa = etapasCompletas.find(e => e.id === etapaId);
    
    // Mostrar modal de confirmación elegante
    setModalEliminarEtapa({
      visible: true,
      etapaId: etapaId,
      etapaNombre: etapa?.nombre || 'Etapa'
    });
  };

  // Función para confirmar la eliminación desde el modal elegante aca se elimina esta ok
  const confirmarEliminarEtapa = async () => {
    if (!modalEliminarEtapa) return;
    
    const etapaId = modalEliminarEtapa.etapaId;
    const etapaNombre = modalEliminarEtapa.etapaNombre;
    
    // Cerrar el modal de confirmación
    setModalEliminarEtapa(null);
    
    try {
      const endpoint = `${FASTAPI_BASE_URL}/etapas/${etapaId}`;
      console.log(`✅ Eliminando etapa desde FastAPI: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Etapa desactivada exitosamente:', result);
        
        // Cerrar automáticamente el modal de etapa si está abierto
        setMostrarModalEtapa(false);
        setEtapaEditando(null);
        setNuevaEtapa({ nombre: '', descripcion: '', color: '#3B82F6', es_final: false });
        
        // Recargar etapas, historial y datos de la OT para refrescar la vista
        await Promise.all([
          obtenerEtapas(),
          obtenerHistorialEtapas(),
          cargarOT() // Recargar los datos de la OT para actualizar el dropdown actual
        ]);
        
        // Mostrar notificación elegante con información de migración
        const tituloNotificacion = 'Etapa desactivada exitosamente';
        const mensajeBase = `La etapa "${etapaNombre}" ha sido desactivada`;
        
        let detallesNotificacion = 'La etapa ya no estará disponible para nuevas órdenes de trabajo.';
        if (result.ots_migradas && result.ots_migradas > 0) {
          detallesNotificacion = `${result.ots_migradas} órdenes de trabajo fueron migradas automáticamente a "${result.etapa_destino}" para mantener la continuidad del proceso.`;
        }
        
        mostrarNotificacionElegante(
          'success',
          tituloNotificacion,
          mensajeBase,
          detallesNotificacion
        );
      } else {
        throw new Error(result.error || 'Error al desactivar la etapa');
      }
    } catch (error: any) {
      console.error('Error al desactivar etapa:', error);
      mostrarNotificacionElegante(
        'error',
        'Error al desactivar etapa',
        error.message || 'No se pudo desactivar la etapa',
        'Por favor intenta nuevamente. Si el problema persiste, contacta al administrador del sistema.'
      );
    }
  };

  // Modificar la función handleCambioEtapa para recargar el historial
  const handleCambioEtapaConHistorial = async (nuevaEtapa: string) => {
    // Cambiar la etapa
    await handleCambioEtapa(nuevaEtapa);
    
    // Recargar el historial de etapas
    await obtenerHistorialEtapas();
  };
  
  // Efecto para cerrar el dropdown cuando se hace clic fuera de él
  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMostrarDropdown(false);
      }
    }
    
    // Añadir el event listener cuando el dropdown está abierto
    if (mostrarDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    // Limpiar el event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mostrarDropdown]);

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
                  <img
                    src="/images/logo.png"
                    alt="Logo"
                    className="h-12 w-auto object-contain"
                  />
                </div>
              </div>

              {/* Navigation Menu */}
              <nav className="hidden md:block">
                <div className="ml-30 flex items-baseline space-x-4">
                  {(esTecnico ? navigationItemsTecnico : navigationItems).map((item) => (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className={`text-white hover:bg-white/20 px-3 py-2 text-sm font-medium ${
                        (esTecnico && item.name === "MIS OTS") || (!esTecnico && item.name === "OTS") ? "bg-white/30" : ""
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
                          onClick={() => router.push('/ajustes')} 
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
        <main className="py-10">
          <div className={`mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300 ${mostrarHistorial ? 'max-w-7xl' : 'max-w-4xl'}`}>
            <div className={`grid gap-8 transition-all duration-300 ${mostrarHistorial ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {/* Contenido Principal */}
              <div className={`${mostrarHistorial ? 'lg:col-span-2' : 'w-full'}`}>
                {/* Breadcrumb and Back Button */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <Button 
                      variant="ghost" 
                      className="text-gray-500 hover:text-gray-700 mr-2"
                      onClick={handleBack}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {esTecnico ? "Volver a Mis OTs" : "Volver a OTs"}
                    </Button>
                    <span className="text-gray-400 mx-2">/</span>
                    <span className="text-gray-900 font-medium">Detalle OT {folio}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    {/* Botón de historial */}
                    <Button
                      variant="outline"
                      className="border-gray-300 text-gray-600 hover:bg-gray-50"
                      onClick={() => setMostrarHistorial(!mostrarHistorial)}
                    >
                      <History className="mr-2 h-4 w-4" />
                      {mostrarHistorial ? 'Ocultar' : 'Ver'} Historial
                    </Button>
                    
                    {/* Botón de exportar PDF con plantilla Excel intacta */}
                    <Button
                      variant="outline"
                      className="border-[#00B0B2] text-[#00B0B2] hover:bg-[#00B0B2]/10"
                      onClick={handleExportPDF}
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00B0B2] mr-2"></div>
                          Generando PDF...
                        </>
                      ) : (
                        <>
                          <FileDown className="mr-2 h-4 w-4" />
                          Exportar PDF
                          {notaSeleccionadaPDF && (
                            <div className="ml-2 flex items-center gap-1">
                              <Eye className="h-3 w-3 text-blue-500" />
                              <span className="text-xs text-blue-600 font-medium">1 nota</span>
                            </div>
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

            {/* OT Card Header */}
            <div className="bg-white shadow-lg rounded-lg mb-8">
              <div className="px-6 py-5 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                      <ClipboardList className="h-6 w-6 mr-2 text-[#00B0B2]" />
                      OT: {currentOtData.folio}
                    </h1>
                    <p className="text-lg mt-1 text-gray-700">{currentOtData.asunto}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border
                      ${currentOtData.estatus === 'Completada' ? 'bg-green-100 text-green-700 border-green-200' : 
                        currentOtData.estatus === 'En progreso' ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                        'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                      {currentOtData.estatus}
                    </span>
                    <span className="text-sm text-gray-500 mt-2">Fecha: {currentOtData.fechaCreacion}</span>
                  </div>
                </div>
              </div>

              {/* OT Details */}
              <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de la OT</h2>
                  <div className="space-y-3">
                    {/* Solo mostrar categoría general si NO es B2B, ya que para B2B se muestra en su sección específica */}
                    {!(otData?.tipo_solicitud === 'B2B' || currentOtData.zona === 'Comercial B2B') && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Categoría</span>
                        <p className="text-gray-900">{currentOtData.categoria} / {currentOtData.subcategoria}</p>
                      </div>
                    )}
                    {/* Campos dinámicos según el tipo de solicitud */}
                    {currentOtData.zona === 'Planta San Pedro' ? (
                      /* Campos para Planta San Pedro */
                      <>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Zona</span>
                          <p className="text-gray-900">{currentOtData.zona || 'Planta San Pedro'}</p>
                        </div>
                        {(currentOtData.planta || currentOtData.activo) ? (
                          <>
                            {currentOtData.planta && (
                              <div>
                                <span className="text-sm font-medium text-gray-500">Planta</span>
                                <p className="text-gray-900">{currentOtData.planta}</p>
                              </div>
                            )}
                            {currentOtData.activo && (
                              <div>
                                <span className="text-sm font-medium text-gray-500">Activo</span>
                                <p className="text-gray-900">{currentOtData.activo}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          /* Si no hay planta/activo, mostrar información de categoría */
                          <div>
                            <span className="text-sm font-medium text-gray-500">Tipo de Solicitud</span>
                            <p className="text-gray-900">Solicitud por Categoría/Subcategoría</p>
                          </div>
                        )}
                      </>
                    ) : otData?.tipo_solicitud === 'B2B' || currentOtData.zona === 'Comercial B2B' ? (
                      /* Campos específicos para OTs Comerciales B2B */
                      <>
                        {/* DEBUG TEMPORAL - REMOVER DESPUÉS */}
                        {console.log('🔍 DEBUG B2B Detection:', {
                          'otData?.tipo_solicitud': otData?.tipo_solicitud,
                          'currentOtData.zona': currentOtData.zona,
                          'condition_result': otData?.tipo_solicitud === 'B2B' || currentOtData.zona === 'Comercial B2B',
                          'solicitudData': solicitudData
                        })}
                        <div>
                          <span className="text-sm font-medium text-gray-500">Tipo de Solicitud</span>
                          <p className="font-medium text-[#00B0B2]">Comercial B2B</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Ciudad</span>
                          <p className="text-gray-900">{solicitudData?.ciudad || currentOtData.ciudad || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Razón Social</span>
                          <p className="text-gray-900">{solicitudData?.razon_social || currentOtData.razon_social || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Sucursal</span>
                          <p className="text-gray-900">{solicitudData?.sucursal || currentOtData.sucursal || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Categoría</span>
                          <p className="text-gray-900">{solicitudData?.categoria || currentOtData.categoria || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Subcategoría</span>
                          <p className="text-gray-900">{solicitudData?.subcategoria || currentOtData.subcategoria || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Equipos</span>
                          <p className="text-gray-900">{solicitudData?.equipo || currentOtData.equipo || 'N/A'}</p>
                        </div>
                      </>
                    ) : (
                      /* Campos para Tiendas B2C */
                      <>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Ubicación</span>
                          <p className="text-gray-900">{currentOtData.zona || 'N/A'} - {currentOtData.ciudad || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Tienda</span>
                          <p className="text-gray-900">{currentOtData.tienda || 'N/A'}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Prioridad</span>
                        {puedeEditar('todos') && !isEditingPrioridad && (
                          <>
                            {/* Debug temporal - remover después */}
                            {console.log('🔍 DEBUG PRIORIDAD: puedeEditar("todos"):', puedeEditar('todos'), 'user?.rol:', user?.rol, 'isEditingPrioridad:', isEditingPrioridad)}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                console.log('📝 Haciendo click en editar prioridad');
                                setIsEditingPrioridad(true);
                              }}
                              className="h-6 w-6 p-0 hover:bg-gray-100"
                            >
                              <Edit3 className="h-3 w-3 text-gray-400" />
                            </Button>
                          </>
                        )}
                      </div>
                      {isEditingPrioridad ? (
                        <div className="flex items-center gap-2 mt-1">
                          <select
                            value={prioridadEdit}
                            onChange={(e) => setPrioridadEdit(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#00B0B2]"
                          >
                            <option value="Alta">Alta</option>
                            <option value="Media">Media</option>
                            <option value="Baja">Baja</option>
                          </select>
                          <Button
                            size="sm"
                            onClick={handleSavePrioridad}
                            className="h-6 w-6 p-0 bg-[#00B0B2] hover:bg-[#009fa0]"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingPrioridad(false)}
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className={`${
                          currentOtData.prioridad === 'Alta' ? 'text-red-600' : 
                          currentOtData.prioridad === 'Media' ? 'text-yellow-600' : 
                          'text-green-600'}`}>
                          {currentOtData.prioridad}
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Tiempo</span>
                        {puedeEditar('todos') && !isEditingTiempo && (
                          <>
                            {/* Debug temporal - remover después */}
                            {console.log('🔍 DEBUG TIEMPO: puedeEditar("todos"):', puedeEditar('todos'), 'user?.rol:', user?.rol, 'isEditingTiempo:', isEditingTiempo)}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                console.log('⏰ Haciendo click en editar tiempo');
                                setIsEditingTiempo(true);
                              }}
                              className="h-6 w-6 p-0 hover:bg-gray-100"
                            >
                              <Edit3 className="h-3 w-3 text-gray-400" />
                            </Button>
                          </>
                        )}
                      </div>
                      {isEditingTiempo ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="text"
                            value={tiempoEstimadoEdit}
                            onChange={(e) => setTiempoEstimadoEdit(e.target.value)}
                            className="text-sm h-8 w-32"
                            placeholder="ej: 2 horas"
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveTiempo}
                            className="h-6 w-6 p-0 bg-[#00B0B2] hover:bg-[#009fa0]"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingTiempo(false)}
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-gray-900">{currentOtData.tiempoEstimado}</p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Tipo de Mantenimiento</span>
                        {puedeEditar('todos') && !isEditingTipoMantenimiento && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingTipoMantenimiento(true)}
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                          >
                            <Edit3 className="h-3 w-3 text-gray-400" />
                          </Button>
                        )}
                      </div>
                      {isEditingTipoMantenimiento ? (
                        <div className="flex items-center gap-2 mt-1">
                          <select
                            value={tipoMantenimientoEdit}
                            onChange={(e) => setTipoMantenimientoEdit(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#00B0B2]"
                          >
                            <option value="correctivo">Correctivo</option>
                            <option value="preventivo">Preventivo</option>
                            <option value="predictivo">Predictivo</option>
                          </select>
                          <Button
                            size="sm"
                            onClick={handleSaveTipoMantenimiento}
                            className="h-6 w-6 p-0 bg-[#00B0B2] hover:bg-[#009fa0]"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingTipoMantenimiento(false)}
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-gray-900 capitalize">{currentOtData.tipoMantenimiento}</p>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Etapa</span>
                      <div className="relative mt-1" ref={dropdownRef}>
                        <div 
                          className="flex items-center justify-between p-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 bg-white"
                          onClick={() => setMostrarDropdown(!mostrarDropdown)}
                        >
                          <span className="text-gray-900 truncate pr-2">{etapaActual}</span>
                          <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        </div>
                        
                        {mostrarDropdown && (
                          <div 
                            className="absolute z-50 w-80 mt-1 bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden"
                            style={{
                              maxHeight: '400px',
                              right: 0
                            }}
                          >
                            {/* Etapas existentes */}
                            <div className="max-h-48 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                              {etapasDisponibles.map((etapa, index) => {
                                const etapaCompleta = etapasCompletas.find(e => e.nombre === etapa);
                                return (
                                  <div 
                                    key={index}
                                    className={`px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between ${etapa === etapaActual ? 'bg-gray-50 text-[#00B0B2] font-medium' : ''}`}
                                    onClick={() => handleCambioEtapaConHistorial(etapa)}
                                  >
                                    <div className="flex items-center">
                                      <div 
                                        className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                                        style={{ backgroundColor: etapaCompleta?.color || '#6B7280' }}
                                      ></div>
                                      <span className="truncate">{etapa}</span>
                                    </div>
                                    {etapa === etapaActual && (
                                      <Check className="h-4 w-4 text-[#00B0B2] ml-2 flex-shrink-0" />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            
                            {/* Separador y opciones de gestión de etapas - Solo para administradores */}
                            {user?.rol === 'admin' && (
                              <>
                                <div className="border-t border-gray-200"></div>
                                
                                {/* Opciones de gestión de etapas */}
                                <div className="py-1">
                                  <div 
                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center text-blue-600"
                                    onClick={() => {
                                      setMostrarDropdown(false);
                                      setNuevaEtapa({ nombre: '', descripcion: '', color: '#3B82F6', es_final: false });
                                      setEtapaEditando(null);
                                      setMostrarModalEtapa(true);
                                    }}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    <span className="text-sm font-medium">Agregar nueva etapa</span>
                                  </div>
                                  
                                  <div 
                                    className="px-3 py-2 hover:bg-green-50 cursor-pointer flex items-center text-green-600"
                                    onClick={() => {
                                      setMostrarDropdown(false);
                                      const etapaActualCompleta = etapasCompletas.find(e => e.nombre === etapaActual);
                                      if (etapaActualCompleta) {
                                        setEtapaEditando(etapaActualCompleta);
                                        setNuevaEtapa({
                                          nombre: etapaActualCompleta.nombre,
                                          descripcion: etapaActualCompleta.descripcion,
                                          color: etapaActualCompleta.color,
                                          es_final: etapaActualCompleta.es_final
                                        });
                                        setMostrarModalEtapa(true);
                                      }
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    <span className="text-sm font-medium">Editar etapa actual</span>
                                  </div>
                                </div>
                              </>
                            )}
                            
                            {/* Separador para historial */}
                            <div className="border-t border-gray-200"></div>
                            
                            {/* Opción de historial */}
                            <div className="py-1">
                              <div 
                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center text-gray-600"
                                onClick={() => {
                                  setMostrarDropdown(false);
                                  setMostrarHistorial(!mostrarHistorial);
                                }}
                              >
                                <History className="h-4 w-4 mr-2" />
                                <span className="text-sm font-medium">
                                  {mostrarHistorial ? 'Ocultar historial' : 'Ver historial de etapas'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Asignación</h2>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Técnico asignado</span>
                        {puedeEditar('admin') && !isEditingTecnico && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingTecnico(true)}
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                            disabled={loadingTecnicos}
                          >
                            <Edit3 className="h-3 w-3 text-gray-400" />
                          </Button>
                        )}
                      </div>
                      
                      {isEditingTecnico ? (
                        <div className="mt-1" ref={dropdownTecnicoRef}>
                          <div className="relative">
                            <div 
                              className="flex items-center justify-between p-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 bg-white"
                              onClick={() => setMostrarDropdownTecnico(!mostrarDropdownTecnico)}
                            >
                              <span className="text-gray-900 truncate pr-2">
                                {loadingTecnicos ? "Cargando técnicos..." : "Seleccionar técnico"}
                              </span>
                              <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            </div>
                            
                            {mostrarDropdownTecnico && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {loadingTecnicos ? (
                                  <div className="px-3 py-2 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00B0B2] mr-2"></div>
                                    <span className="text-sm text-gray-500">Cargando técnicos...</span>
                                  </div>
                                ) : tecnicos.length > 0 ? (
                                  tecnicos.map((tecnico, index) => (
                                    <div 
                                      key={index}
                                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                                      onClick={() => asignarTecnico(tecnico.id, tecnico.nombre, tecnico.email)}
                                    >
                                      <div className="flex items-center">
                                        <Users className="h-4 w-4 text-gray-400 mr-2" />
                                        <div>
                                          <span className="text-sm font-medium text-gray-900">{tecnico.nombre}</span>
                                          <div className="text-xs text-gray-500">{tecnico.email}</div>
                                        </div>
                                      </div>
                                      {asignandoTecnico && (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#00B0B2]"></div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                    No hay técnicos disponibles
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsEditingTecnico(false);
                                setMostrarDropdownTecnico(false);
                              }}
                              className="text-sm px-3 py-1"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-gray-900">
                              {currentOtData.tecnicoAsignado || "Sin técnico asignado"}
                            </span>
                          </div>
                          {user?.rol === 'admin' && (
                            <span className="text-xs text-gray-400 ml-2">
                              (Click para cambiar)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Fecha de visita</span>
                        {puedeEditar('todos') && !isEditingFechaVisita && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingFechaVisita(true)}
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                          >
                            <Edit3 className="h-3 w-3 text-gray-400" />
                          </Button>
                        )}
                      </div>
                      {isEditingFechaVisita ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="date"
                            value={fechaVisitaEdit === "Por programar" ? "" : convertirParaInput(fechaVisitaEdit)}
                            onChange={(e) => {
                              setFechaVisitaEdit(e.target.value);
                            }}
                            className="text-sm h-8 w-40"
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveFechaVisita}
                            className="h-6 w-6 p-0 bg-[#00B0B2] hover:bg-[#009fa0]"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingFechaVisita(false)}
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-gray-900">
                          {formatearFechaSinZonaHoraria(fechaVisitaEdit)}
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Solicitante</span>
                      <p className="text-gray-900">
                        {currentOtData.solicitante === "Cargando..." ? 
                          (solicitudData?.nombre || "Cargando...") : 
                          currentOtData.solicitante}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Contacto solicitante</span>
                      <p className="text-gray-900">
                        {currentOtData.contactoSolicitante === "Cargando..." ? 
                          (solicitudData?.correo || solicitudData?.telefono || "Cargando...") : 
                          currentOtData.contactoSolicitante}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Descripción de la OT */}
              <div className="px-6 py-5 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Descripción</h2>
                <p className="text-gray-700 whitespace-pre-line">{currentOtData.descripcion}</p>
              </div>

              {/* Imagen Original de la Solicitud */}
              {otData?.solicitud_id && (
                <div className="px-6 py-5 border-t border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Camera className="h-5 w-5 mr-2 text-[#00B0B2]" />
                    Imagen Original de la Solicitud
                  </h2>
                  {solicitudData?.archivo_url ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <img
                            src={solicitudData.archivo_url}
                            alt="Imagen original de la solicitud"
                            className="w-32 h-32 object-cover rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => {
                              // Usar la vista previa modal igual que los archivos adjuntos
                              if (solicitudData.archivo_url) {
                                const imagenSolicitud: ArchivoAdjunto = {
                                  nombre: solicitudData.archivo_nombre || 'imagen_solicitud.jpg',
                                  url: solicitudData.archivo_url,
                                  tipo: 'imagen_solicitud_original',
                                  descripcion: 'Imagen adjunta en la solicitud original',
                                  fecha: solicitudData.fecha_creacion
                                };
                                abrirVistaPrevia(imagenSolicitud);
                              }
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Archivo:</span> {solicitudData.archivo_nombre || 'imagen_solicitud.jpg'}
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Subido por:</span> {solicitudData.nombre} ({solicitudData.correo})
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Fecha:</span> {new Date(solicitudData.fecha_creacion).toLocaleDateString('es-ES')}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => {
                              if (solicitudData.archivo_url) {
                                const imagenSolicitud: ArchivoAdjunto = {
                                  nombre: solicitudData.archivo_nombre || 'imagen_solicitud.jpg',
                                  url: solicitudData.archivo_url,
                                  tipo: 'imagen_solicitud_original',
                                  descripcion: 'Imagen adjunta en la solicitud original',
                                  fecha: solicitudData.fecha_creacion
                                };
                                abrirVistaPrevia(imagenSolicitud);
                              }
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Vista previa
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No hay imagen adjunta en la solicitud original</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notas del Técnico */}
              <div className="px-6 py-5 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2 text-[#00B0B2]" />
                    Notas del Técnico
                    <span className="ml-2 text-sm text-gray-500">({notasTrazables.length})</span>
                  </h2>
                  {(esTecnico || user?.rol === 'tecnico' || user?.rol === 'admin') && (
                    <Button
                      onClick={() => setMostrandoFormularioNota(true)}
                      className="bg-[#00B0B2] hover:bg-[#009fa0] text-white text-sm px-3 py-1.5 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Nota
                    </Button>
                  )}
                </div>

                {/* Mensaje informativo sobre selección de notas para PDF */}
                {notasTrazables.length > 0 && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <Eye className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span>
                      Usa el icono <Eye className="h-3 w-3 inline mx-1 text-blue-500" /> para seleccionar una nota específica para el PDF.
                      {notaSeleccionadaPDF && (
                        <span className="ml-2 text-blue-700 font-medium">
                          ✓ Nota seleccionada para PDF
                        </span>
                      )}
                    </span>
                  </div>
                )}


                
                {/* Formulario para nueva nota */}
                {mostrandoFormularioNota && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 border">
                    {/* Mostrar información del usuario que va a agregar la nota */}
                    <div className="flex items-center gap-2 mb-3 p-2 bg-white rounded border-l-4 border-[#00B0B2]">
                      <div className="w-8 h-8 bg-[#00B0B2] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {user?.nombre?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user?.nombre || user?.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user?.rol === 'admin' ? 'Administrador' : 
                           user?.rol === 'tecnico' ? 'Técnico' : 'Usuario'}
                        </div>
                      </div>
                    </div>
                    
                    <Textarea
                      placeholder="Escribe una nueva nota sobre el progreso de la OT..."
                      value={nuevaNotaTrazable}
                      onChange={(e) => setNuevaNotaTrazable(e.target.value)}
                      className="w-full mb-3 resize-none"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleAgregarNotaTrazable}
                        disabled={!nuevaNotaTrazable.trim() || agregandoNotaTrazable}
                        className="bg-[#00B0B2] hover:bg-[#009fa0] text-white text-sm px-4 py-2"
                      >
                        {agregandoNotaTrazable ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-1" />
                            Guardar Nota
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setMostrandoFormularioNota(false);
                          setNuevaNotaTrazable("");
                        }}
                        className="text-sm px-4 py-2"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  {notasTrazables.length > 0 ? (
                    notasTrazables.map((nota) => (
                      <div key={nota.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-start gap-3">
                          {/* Avatar del usuario */}
                          <div className="w-10 h-10 bg-[#00B0B2] rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {nota.nombre_usuario?.charAt(0)?.toUpperCase() || nota.creado_por?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Header con usuario y fecha */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {nota.nombre_usuario || nota.creado_por}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  nota.rol_usuario === 'admin' ? 'bg-red-100 text-red-800' :
                                  nota.rol_usuario === 'tecnico' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {nota.rol_usuario === 'admin' ? 'Admin' :
                                   nota.rol_usuario === 'tecnico' ? 'Técnico' :
                                   'Usuario'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="flex items-center gap-1 text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded-md cursor-help"
                                    title={`Fecha exacta: ${formatearFechaHoraNota(nota.fecha_creacion)}`}
                                  >
                                    <Clock className="h-3 w-3" />
                                    {obtenerTiempoRelativo(nota.fecha_creacion)}
                                  </div>
                                  {/* Indicador de "nueva" para notas recientes (menos de 1 hora) */}
                                  {(() => {
                                    const fecha = new Date(nota.fecha_creacion);
                                    const ahora = new Date();
                                    const diferencia = ahora.getTime() - fecha.getTime();
                                    const horas = Math.floor(diferencia / (1000 * 60 * 60));
                                    return horas < 1 ? (
                                      <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-semibold animate-pulse">
                                        Nueva
                                      </span>
                                    ) : null;
                                  })()}
                                </div>
                                
                                {/* Botón de seleccionar para PDF */}
                                <Button
                                  onClick={() => {
                                    if (notaSeleccionadaPDF === nota.id) {
                                      setNotaSeleccionadaPDF(null);
                                    } else {
                                      setNotaSeleccionadaPDF(nota.id);
                                    }
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className={`p-1 h-7 w-7 transition-all duration-200 ${
                                    notaSeleccionadaPDF === nota.id
                                      ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-400 bg-blue-50 shadow-sm'
                                      : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 border-gray-200'
                                  }`}
                                  title={notaSeleccionadaPDF === nota.id ? 'Click para deseleccionar esta nota del PDF' : 'Click para seleccionar solo esta nota en el PDF'}
                                >
                                  <Eye className={`h-3 w-3 ${notaSeleccionadaPDF === nota.id ? 'fill-current' : ''}`} />
                                </Button>

                                {/* Botón de eliminar para admin/tecnico */}
                                {(user?.rol === 'admin' || (user?.rol === 'tecnico' && nota.creado_por === user?.email)) && (
                                  <Button
                                    onClick={() => handleEliminarNotaTrazable(nota.id)}
                                    disabled={eliminandoNota === nota.id}
                                    variant="outline"
                                    size="sm"
                                    className="p-1 h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                  >
                                    {eliminandoNota === nota.id ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {/* Contenido de la nota */}
                            <div className="text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-3 border-l-4 border-[#00B0B2]">
                              {nota.nota}
                            </div>
                            
                            {/* Información adicional si fue actualizada */}
                            {nota.fecha_actualizacion && nota.fecha_actualizacion !== nota.fecha_creacion && (
                              <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                                <Edit2 className="h-3 w-3" />
                                Editada: {formatearFechaHoraNota(nota.fecha_actualizacion)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No hay notas del técnico para esta OT</p>
                      {puedeEditar('todos') && (
                        <p className="text-sm mt-1">Agrega la primera nota haciendo clic en "Agregar Nota"</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Archivos Adjuntos */}
              <div className="px-6 py-5 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Paperclip className="h-5 w-5 mr-2 text-[#00B0B2]" />
                    Archivos Adjuntos
                  </h2>
                  <div className="flex gap-2">
                    {puedeEditar('todos') && (
                      <>
                        {/* Input oculto para fotos */}
                        <input
                          ref={fileInputFotosRef}
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                        />
                        {/* Input oculto para documentos */}
                        <input
                          ref={fileInputDocumentosRef}
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                        />
                        
                        <Button
                          type="button"
                          onClick={abrirSelectorFotos}
                          disabled={isSubiendoArchivos}
                          className="bg-[#00B0B2] hover:bg-[#009fa0] text-white text-sm px-3 py-1.5 flex items-center gap-2 disabled:opacity-50"
                        >
                          {isSubiendoArchivos ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4" />
                              Subir Fotos
                            </>
                          )}
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          onClick={abrirSelectorDocumentos}
                          disabled={isSubiendoArchivos}
                          className="border-[#00B0B2] text-[#00B0B2] hover:bg-[#00B0B2]/10 text-sm px-3 py-1.5 flex items-center gap-2 disabled:opacity-50"
                        >
                          {isSubiendoArchivos ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00B0B2]"></div>
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Subir Archivos
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {archivosAdjuntos.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <Paperclip className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No hay archivos adjuntos disponibles</p>
                    </div>
                  ) : (
                    archivosAdjuntos.map((archivo, index) => (
                      <div key={index} className="flex items-center p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                          {archivo.tipo === 'imagen_solicitud_original' ? (
                            <Camera className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Paperclip className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {archivo.nombre}
                          </p>
                          <p className="text-xs text-gray-500">
                            {archivo.descripcion || archivo.tipo}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirVistaPrevia(archivo)}
                            className="text-[#00B0B2] hover:bg-[#00B0B2]/10"
                            title="Ver imagen"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Botón de eliminar solo para archivos subidos por técnicos (que tengan ID) y solo para admin/tecnico */}
                          {archivo.id && (user?.rol === 'admin' || user?.rol === 'tecnico') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEliminarArchivo(archivo.id!, archivo.nombre)}
                              disabled={eliminandoArchivo === archivo.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar archivo"
                            >
                              {eliminandoArchivo === archivo.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Firmas de Conformidad */}
              <FirmaConformidad 
                key={`firmas-${firmasKey}`} // Forzar recarga cuando cambien las firmas
                otId={otData?.id || parseInt(folio) || undefined}
                disabled={false} // Temporal: permitir siempre edición para pruebas
                firmaExistente={{
                  firma_tecnico: firmaTecnico || '',
                  firma_cliente: firmaCliente || '',
                  nombre_tecnico: nombreTecnico || '',
                  nombre_cliente: nombreCliente || ''
                }}
                onFirmaGuardada={(firmaData) => {
                  console.log('✅ Firma guardada:', firmaData);
                  console.log('🔄 Recargando firmas después de guardar...');
                  // Recargar las firmas después de un pequeño delay
                  setTimeout(() => {
                    cargarFirmasExistentes();
                  }, 1000);
                }}
              />
            </div>
          </div>
          
          {/* Panel Lateral - Historial de Etapas */}
          {mostrarHistorial && (
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <div className="bg-white shadow-lg rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-[#00B0B2] to-[#008B8D] rounded-t-lg">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Historial de Etapas
                    </h3>
                  </div>
                  
                  <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {loadingHistorial ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B0B2]"></div>
                      </div>
                    ) : historialEtapas.length > 0 ? (
                      <div className="space-y-4">
                        {historialEtapas.map((cambio, index) => (
                          <div 
                            key={cambio.id} 
                            className="relative flex items-start space-x-3 pb-4"
                          >
                            {/* Línea del timeline */}
                            {index < historialEtapas.length - 1 && (
                              <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-200"></div>
                            )}
                            
                            {/* Icono del cambio */}
                            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#00B0B2] text-white text-sm font-semibold flex-shrink-0">
                              <ArrowRight className="h-4 w-4" />
                            </div>
                            
                            {/* Contenido del cambio */}
                            <div className="flex-1 min-w-0">
                              <div className="bg-gray-50 rounded-lg p-3 border overflow-hidden">
                                {/* Cambio de etapa */}
                                <div className="mb-2">
                                  {/* Etapa anterior */}
                                  <div className="flex items-start space-x-2 mb-1">
                                    <div className="flex items-center space-x-1 flex-shrink-0">
                                      <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: cambio.color_etapa_anterior || '#6B7280' }}
                                      ></div>
                                      <span className="text-xs text-gray-500">De:</span>
                                    </div>
                                    <span className="text-sm text-gray-600 break-words historial-text leading-tight">
                                      {cambio.etapa_anterior}
                                    </span>
                                  </div>
                                  
                                  {/* Etapa nueva */}
                                  <div className="flex items-start space-x-2">
                                    <div className="flex items-center space-x-1 flex-shrink-0">
                                      <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: cambio.color_etapa_nueva || '#00B0B2' }}
                                      ></div>
                                      <span className="text-xs text-gray-500">A:</span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 break-words word-wrap leading-tight">
                                      {cambio.etapa_nueva}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Usuario */}
                                <div className="mb-2">
                                  <div className="flex items-start space-x-2">
                                    <User className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs text-gray-500">Usuario: </span>
                                      <span className="text-xs text-gray-700 font-medium break-words word-wrap">
                                        {cambio.usuario}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Motivo/Comentario */}
                                {cambio.motivo && (
                                  <div className="mb-2">
                                    <div className="flex items-start space-x-2">
                                      <MessageSquare className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs text-gray-500">Motivo: </span>
                                        <p className="text-xs text-gray-600 italic break-words word-wrap leading-relaxed">
                                          "{cambio.motivo}"
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Fecha */}
                                <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
                                  <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="text-xs text-gray-400 break-words word-wrap">
                                    {formatearFechaHoraNota(cambio.fecha_cambio)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No hay historial de cambios de etapa</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notificación de Guardado Exitoso */}
      {mostrarNotificacion && guardadoExitoso && (
        <div className="fixed top-6 right-6 z-50 transform transition-all duration-500 ease-out animate-in slide-in-from-right">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-lg shadow-xl border border-green-400/20 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckSquare className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">¡Guardado Exitoso!</h3>
                  <p className="text-xs text-green-100">Los cambios se han guardado correctamente</p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
              
              {/* Barra de progreso animada */}
              <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/60 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        </main>

        {/* Modal de Exportación a PDF */}
        {isExporting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden transform transition-all">
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-center mb-5">
                  {!exportSuccess ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00B0B2] mb-3"></div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Generando Informe Técnico</h3>
                      <p className="text-sm text-gray-600">Por favor espere mientras preparamos su documento...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="bg-[#00B0B2]/10 rounded-full p-3 mb-3">
                        <FileDown className="h-8 w-8 text-[#00B0B2]" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">¡Informe Listo!</h3>
                      <p className="text-sm text-center text-gray-600 mb-4">
                        El informe técnico para la OT {folio} ha sido generado correctamente.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {exportSuccess && (
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
                  <Button
                    className="bg-gray-200 text-gray-700 hover:bg-gray-300 px-4 py-2 rounded-md"
                    onClick={closeExportModal}
                  >
                    Cerrar
                  </Button>
                  <Button
                    className="bg-[#00B0B2] text-white hover:bg-[#009fa0] px-4 py-2 rounded-md flex items-center gap-2"
                    onClick={handleExportPDF}
                  >
                    <FileDown className="h-4 w-4" />
                    Descargar PDF
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Firma Digital */}
        {mostrandoFirmaTecnico && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden transform transition-all">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <PenTool className="h-5 w-5 mr-2 text-[#00B0B2]" />
                  Firmar Digitalmente
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Dibuja tu firma usando el mouse o tu dedo en dispositivos táctiles
                </p>
              </div>
              
              <div className="px-6 py-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full h-48 bg-white border border-gray-200 rounded cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Área de firma - Haz clic y arrastra para firmar
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={clearCanvas}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpiar
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={cancelSignature}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={saveSignature}
                    className="bg-[#00B0B2] text-white hover:bg-[#009fa0] flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Guardar Firma
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Firma Digital del Cliente */}
        {mostrandoFirmaCliente && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden transform transition-all">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <PenTool className="h-5 w-5 mr-2 text-[#00B0B2]" />
                  Firma del Cliente
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Solicita al cliente que dibuje su firma usando el mouse o su dedo en dispositivos táctiles
                </p>
              </div>
              
              <div className="px-6 py-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                  <canvas
                    ref={canvasClienteRef}
                    width={600}
                    height={200}
                    className="w-full h-48 bg-white border border-gray-200 rounded cursor-crosshair touch-none"
                    onMouseDown={startDrawingCliente}
                    onMouseMove={drawCliente}
                    onMouseUp={stopDrawingCliente}
                    onMouseLeave={stopDrawingCliente}
                    onTouchStart={startDrawingCliente}
                    onTouchMove={drawCliente}
                    onTouchEnd={stopDrawingCliente}
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Área de firma del cliente - Haz clic y arrastra para firmar
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={clearCanvasCliente}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpiar
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={cancelSignatureCliente}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={saveSignatureCliente}
                    className="bg-[#00B0B2] text-white hover:bg-[#009fa0] flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Guardar Firma
                  </Button>
                </div>
              </div>
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
                    <CheckSquare className="h-6 w-6 text-green-600" />
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
                    <CheckSquare className="h-8 w-8 text-green-600 animate-pulse" />
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
                          {cambioEtapaInfo.etapa}
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

        {/* Modal de Vista Previa de Imagen */}
        {mostrarVistaPrevia && imagenPrevia && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] w-full">
              {/* Header del Modal */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Camera className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{imagenPrevia.nombre}</h3>
                    <p className="text-sm text-gray-500">{imagenPrevia.descripcion}</p>
                  </div>
                </div>
                <button
                  onClick={cerrarVistaPrevia}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Contenido de la imagen */}
              <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
                <div className="flex justify-center">
                  <img
                    src={imagenPrevia.url.startsWith('http') ? imagenPrevia.url : `${backendUrl}${imagenPrevia.url}`}
                    alt={imagenPrevia.nombre}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    onError={(e) => {
                      console.error('Error al cargar imagen:', imagenPrevia.url);
                      (e.target as HTMLImageElement).src = '/images/image-error.png';
                    }}
                  />
                </div>
              </div>

              {/* Botones del modal */}
              <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <div className="text-sm text-gray-500">
                  {imagenPrevia.fecha && (
                    <span>Subida el: {new Date(imagenPrevia.fecha).toLocaleDateString('es-ES')}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={cerrarVistaPrevia}
                    className="bg-[#00B0B2] hover:bg-[#009fa0]"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notificación Personalizada de Archivos Subidos */}
        {mostrarNotificacionArchivos && (
          <div className="fixed top-6 right-6 z-50 transform transition-all duration-500 ease-out animate-in slide-in-from-right">
            <div className="bg-gradient-to-r from-[#00B0B2] to-[#008B8D] text-white px-6 py-4 rounded-xl shadow-2xl border border-[#00B0B2]/20 backdrop-blur-sm max-w-sm">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-white">¡Excelente!</h3>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-sm text-white/90 font-medium mb-1">
                    {archivosSubidos === 1 
                      ? "Archivo subido exitosamente" 
                      : `${archivosSubidos} archivos subidos exitosamente`
                    }
                  </p>
                  <p className="text-xs text-white/80">
                    {archivosSubidos === 1 
                      ? "Tu imagen está lista" 
                      : "Tus archivos están listos"
                    }
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={() => setMostrarNotificacionArchivos(false)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Barra de progreso con animación del café */}
              <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-white/60 via-white/80 to-white/60 rounded-full animate-pulse"></div>
              </div>
              
              {/* Elementos decorativos del branding */}
              <div className="absolute top-2 right-2 opacity-20">
                <div className="w-6 h-6 rounded-full border-2 border-white/40"></div>
              </div>
              <div className="absolute bottom-2 left-2 opacity-10">
                <div className="w-3 h-3 rounded-full bg-white/60"></div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmación - Eliminar Nota */}
        {modalEliminarNota?.visible && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 opacity-100 animate-in zoom-in-95 fade-in border border-red-100">
              {/* Header del modal */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center">
                  Eliminar Nota
                </h3>
                <p className="text-sm text-gray-600 text-center mt-1">
                  Esta acción es permanente
                </p>
              </div>

              {/* Contenido del modal */}
              <div className="px-6 py-6">
                <div className="text-center space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    ¿Estás seguro de que deseas eliminar esta nota del técnico?
                  </p>
                  
                  {/* Preview de la nota */}
                  <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-[#00B0B2] text-left">
                    <p className="text-sm text-gray-600 italic">
                      "{modalEliminarNota.notaTexto}"
                    </p>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-sm text-red-700">
                      <strong>Advertencia:</strong> Esta acción no se puede deshacer y la nota se eliminará permanentemente del sistema.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer del modal */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl">
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setModalEliminarNota(null)}
                    className="sm:order-1 border-gray-300 text-gray-700 hover:bg-gray-100 px-6 py-2.5 font-medium"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmarEliminarNota}
                    className="sm:order-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2.5 font-medium shadow-lg"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Nota
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmación - Eliminar Archivo */}
        {modalEliminarArchivo?.visible && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 opacity-100 animate-in zoom-in-95 fade-in border border-red-100">
              {/* Header del modal */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center">
                  Eliminar Archivo
                </h3>
                <p className="text-sm text-gray-600 text-center mt-1">
                  Esta acción es permanente
                </p>
              </div>

              {/* Contenido del modal */}
              <div className="px-6 py-6">
                <div className="text-center space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    ¿Estás seguro de que deseas eliminar este archivo adjunto?
                  </p>
                  
                  {/* Preview del archivo */}
                  <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-[#00B0B2]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Paperclip className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900 truncate">
                          {modalEliminarArchivo.archivoNombre}
                        </p>
                        <p className="text-sm text-gray-500">
                          Archivo adjunto
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-sm text-red-700">
                      <strong>Advertencia:</strong> El archivo se eliminará tanto del sistema como del almacenamiento. Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer del modal */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl">
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setModalEliminarArchivo(null)}
                    className="sm:order-1 border-gray-300 text-gray-700 hover:bg-gray-100 px-6 py-2.5 font-medium"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmarEliminarArchivo}
                    className="sm:order-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2.5 font-medium shadow-lg"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Archivo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Gestión de Etapas */}
        {mostrarModalEtapa && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 opacity-100 animate-in zoom-in-95 fade-in">
              {/* Header del modal */}
              <div className="bg-gradient-to-r from-[#00B0B2] to-[#008B8D] px-6 py-4 rounded-t-2xl">
                <h3 className="text-xl font-bold text-white text-center">
                  {etapaEditando ? 'Editar Etapa' : 'Nueva Etapa'}
                </h3>
                <p className="text-sm text-white/80 text-center mt-1">
                  {etapaEditando ? 'Modifica los datos de la etapa' : 'Completa los datos de la nueva etapa'}
                </p>
              </div>

              {/* Contenido del modal */}
              <div className="px-6 py-6 space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la etapa *
                  </label>
                  <Input
                    type="text"
                    value={nuevaEtapa.nombre}
                    onChange={(e) => setNuevaEtapa({ ...nuevaEtapa, nombre: e.target.value })}
                    placeholder="Ej: En revisión"
                    className="w-full"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <Textarea
                    value={nuevaEtapa.descripcion}
                    onChange={(e) => setNuevaEtapa({ ...nuevaEtapa, descripcion: e.target.value })}
                    placeholder="Descripción opcional de la etapa"
                    className="w-full resize-none"
                    rows={3}
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color identificativo
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={nuevaEtapa.color}
                      onChange={(e) => setNuevaEtapa({ ...nuevaEtapa, color: e.target.value })}
                      className="w-12 h-10 rounded-md border border-gray-300 cursor-pointer"
                    />
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={nuevaEtapa.color}
                        onChange={(e) => setNuevaEtapa({ ...nuevaEtapa, color: e.target.value })}
                        placeholder="#3B82F6"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Es Final */}
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nuevaEtapa.es_final}
                      onChange={(e) => setNuevaEtapa({ ...nuevaEtapa, es_final: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      Marcar como etapa final
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Las etapas finales indican que la OT ha sido completada
                  </p>
                </div>
              </div>

              {/* Footer del modal */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMostrarModalEtapa(false);
                    setEtapaEditando(null);
                    setNuevaEtapa({ nombre: '', descripcion: '', color: '#3B82F6', es_final: false });
                  }}
                >
                  Cancelar
                </Button>
                
                <div className="flex space-x-2">
                  {etapaEditando && (
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => handleEliminarEtapa(etapaEditando.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  )}
                  
                  <Button
                    className="bg-[#00B0B2] hover:bg-[#009fa0] text-white"
                    onClick={etapaEditando ? handleEditarEtapa : handleCrearEtapa}
                    disabled={!nuevaEtapa.nombre.trim()}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {etapaEditando ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmación de Eliminación de Etapa */}
        {modalEliminarEtapa && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 opacity-100 animate-in zoom-in-95 fade-in">
              {/* Header del modal */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Confirmar Eliminación
                    </h3>
                    <p className="text-sm text-white/80">
                      Esta acción no se puede deshacer
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenido del modal */}
              <div className="px-6 py-6">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <Trash2 className="h-8 w-8 text-red-600" />
                  </div>
                  
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    ¿Desactivar etapa "{modalEliminarEtapa.etapaNombre}"?
                  </h4>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    Esta etapa será desactivada y ya no estará disponible para nuevas órdenes de trabajo.
                  </p>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center mt-0.5">
                        <ArrowRight className="h-3 w-3 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-yellow-800 mb-1">
                          Migración Automática
                        </h5>
                        <p className="text-xs text-yellow-700">
                          Si hay órdenes de trabajo usando esta etapa, serán migradas automáticamente a <strong>"OT Asignada TCQ"</strong> para mantener la continuidad del proceso.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer del modal */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setModalEliminarEtapa(null)}
                  className="flex-1 mr-3"
                >
                  Cancelar
                </Button>
                
                <Button
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                  onClick={confirmarEliminarEtapa}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Desactivar Etapa
                </Button>
              </div>

              {/* Branding sutil */}
              <div className="px-6 pb-4">
                <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
                  <img
                    src="/images/logo.png"
                    alt="Café Quindío"
                    className="h-3 w-auto opacity-50"
                  />
                  <span>Sistema de Gestión - Café Quindío</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notificación Elegante */}
        {notificacion.visible && (
          <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right duration-300">
            <div className={`
              bg-white shadow-2xl rounded-xl border-l-4 max-w-md w-full
              ${notificacion.tipo === 'success' ? 'border-green-500' : ''}
              ${notificacion.tipo === 'error' ? 'border-red-500' : ''}
              ${notificacion.tipo === 'warning' ? 'border-yellow-500' : ''}
              ${notificacion.tipo === 'info' ? 'border-[#00B0B2]' : ''}
            `}>
              {/* Header de la notificación */}
              <div className={`
                px-4 py-3 rounded-t-xl flex items-center justify-between
                ${notificacion.tipo === 'success' ? 'bg-green-50' : ''}
                ${notificacion.tipo === 'error' ? 'bg-red-50' : ''}
                ${notificacion.tipo === 'warning' ? 'bg-yellow-50' : ''}
                ${notificacion.tipo === 'info' ? 'bg-[#00B0B2]/10' : ''}
              `}>
                <div className="flex items-center space-x-3">
                  {/* Ícono según el tipo */}
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                    ${notificacion.tipo === 'success' ? 'bg-green-100 text-green-600' : ''}
                    ${notificacion.tipo === 'error' ? 'bg-red-100 text-red-600' : ''}
                    ${notificacion.tipo === 'warning' ? 'bg-yellow-100 text-yellow-600' : ''}
                    ${notificacion.tipo === 'info' ? 'bg-[#00B0B2]/20 text-[#00B0B2]' : ''}
                  `}>
                    {notificacion.tipo === 'success' && <Check className="h-4 w-4" />}
                    {notificacion.tipo === 'error' && <X className="h-4 w-4" />}
                    {notificacion.tipo === 'warning' && <ArrowLeft className="h-4 w-4" />}
                    {notificacion.tipo === 'info' && <Settings className="h-4 w-4" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className={`
                      text-sm font-semibold
                      ${notificacion.tipo === 'success' ? 'text-green-800' : ''}
                      ${notificacion.tipo === 'error' ? 'text-red-800' : ''}
                      ${notificacion.tipo === 'warning' ? 'text-yellow-800' : ''}
                      ${notificacion.tipo === 'info' ? 'text-[#00B0B2]' : ''}
                    `}>
                      {notificacion.titulo}
                    </h4>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cerrarNotificacion}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <X className="h-3 w-3 text-gray-400" />
                </Button>
              </div>
              
              {/* Contenido de la notificación */}
              <div className="px-4 pb-4">
                <p className="text-sm text-gray-700 mb-2">
                  {notificacion.mensaje}
                </p>
                
                {notificacion.detalles && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    {notificacion.detalles}
                  </p>
                )}
                
                {/* Branding sutil */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <img
                      src="/images/logo.png"
                      alt="Café Quindío"
                      className="h-4 w-auto opacity-60"
                    />
                    <span className="text-xs text-gray-400 font-medium">
                      Café Quindío
                    </span>
                  </div>
                  
                  <div className={`
                    text-xs font-medium
                    ${notificacion.tipo === 'success' ? 'text-green-600' : ''}
                    ${notificacion.tipo === 'error' ? 'text-red-600' : ''}
                    ${notificacion.tipo === 'warning' ? 'text-yellow-600' : ''}
                    ${notificacion.tipo === 'info' ? 'text-[#00B0B2]' : ''}
                  `}>
                    Sistema de Gestión
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
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
      
      {/* Estilos CSS adicionales para word-wrapping */}
      <style jsx>{`
        .word-wrap {
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
          hyphens: auto;
        }
        
        .historial-text {
          word-wrap: break-word;
          overflow-wrap: anywhere;
          word-break: break-word;
          hyphens: auto;
          max-width: 100%;
        }
      `}</style>
    </div>
  )
}
