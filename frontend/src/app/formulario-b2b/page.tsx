"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { SolicitudExitosaModal, type SolicitudData } from "@/components/SolicitudExitosaModal"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

// Configuración de FastAPI únicamente
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'http://localhost:8001/api/v1';

// Interfaces para el sistema dinámico B2B
interface Ciudad {
  id: number;
  nombre: string;
  codigo: string;
}

interface RazonSocial {
  id: number;
  nombre: string;
  codigo: string;
}

interface Sucursal {
  id: number;
  nombre: string;
  codigo: string;
  razon_social_id: number;
}

interface Categoria {
  id: number;
  nombre: string;
  codigo: string;
}

interface Subcategoria {
  id: number;
  nombre: string;
  codigo: string;
  categoria_id: number;
}

interface Equipo {
  id: number;
  nombre: string;
  codigo: string;
}

export default function FormularioB2B() {
  const router = useRouter();
  
  // Estados para los datos dinámicos
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [razonesSociales, setRazonesSociales] = useState<RazonSocial[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  
  // Estados de carga
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSucursales, setLoadingSucursales] = useState(false);
  const [loadingSubcategorias, setLoadingSubcategorias] = useState(false);
  
  // Estados para mensajes de datos vacíos
  const [noDataMessages, setNoDataMessages] = useState({
    razonesSociales: "",
    sucursales: "",
    categorias: "",
    subcategorias: "",
    equipos: ""
  });

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    asunto: "",
    descripcion: "",
    ciudad: "",
    razonSocial: "",
    sucursal: "",
    categoria: "",
    subcategoria: "",
    equipo: "",
  });
  
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Estados para la tab Financiera
  const [formDataFinanciera, setFormDataFinanciera] = useState({
    nombre: "",
    correo_electronico: "",
    telefono: "",
    asunto: "",
    nit: "",
    razon_social: "",
    sucursal: "",
    tipo_cliente: "",
    nro_docto_cruce: "",
    valor_total_cop: "",
    descripcion_adicional: "",
  });
  const [archivoFinanciera, setArchivoFinanciera] = useState<File | null>(null);
  const [loadingFinanciera, setLoadingFinanciera] = useState(false);
  const [messageFinanciera, setMessageFinanciera] = useState("");
  const [loadingCartera, setLoadingCartera] = useState(false);
  const [carteraError, setCarteraError] = useState("");
  
  // Estados para el modal de éxito
  const [mostrarModalExito, setMostrarModalExito] = useState(false);
  const [solicitudExitosa, setSolicitudExitosa] = useState<SolicitudData | null>(null);
  
  // Estado para las pestañas
  const [activeTab, setActiveTab] = useState("mantenimiento");

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      setLoadingData(true);
      
      // Cargar ciudades, razones sociales, categorías y equipos en paralelo usando endpoints públicos
      const [ciudadesRes, razonesSocialesRes, categoriasRes, equiposRes] = await Promise.all([
        fetch(`${FASTAPI_BASE_URL}/b2b/public/ciudades`),
        fetch(`${FASTAPI_BASE_URL}/b2b/public/razones-sociales`),
        fetch(`${FASTAPI_BASE_URL}/b2b/public/categorias`),
        fetch(`${FASTAPI_BASE_URL}/b2b/public/equipos`)
      ]);

      if (ciudadesRes.ok) {
        const ciudadesData = await ciudadesRes.json();
        setCiudades(ciudadesData);
      }

      if (razonesSocialesRes.ok) {
        const razonesSocialesData = await razonesSocialesRes.json();
        setRazonesSociales(razonesSocialesData);
      }

      if (categoriasRes.ok) {
        const categoriasData = await categoriasRes.json();
        setCategorias(categoriasData);
      }

      if (equiposRes.ok) {
        const equiposData = await equiposRes.json();
        setEquipos(equiposData);
      }

    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      setMessage("Error cargando los datos del formulario");
    } finally {
      setLoadingData(false);
    }
  };

  // Cargar datos filtrados por ciudad cuando se selecciona una ciudad
  const handleCiudadChange = async (ciudadId: string) => {
    setFormData(prev => ({
      ...prev,
      ciudad: ciudadId,
      razonSocial: "",
      sucursal: "",
      categoria: "",
      subcategoria: "",
      equipo: ""
    }));
    
    // Limpiar mensajes de datos vacíos
    setNoDataMessages({
      razonesSociales: "",
      sucursales: "",
      categorias: "",
      subcategorias: "",
      equipos: ""
    });
    
    if (!ciudadId) {
      setRazonesSociales([]);
      setSucursales([]);
      setCategorias([]);
      setSubcategorias([]);
      setEquipos([]);
      return;
    }

    try {
      setLoadingData(true);
      
      // Cargar razones sociales, categorías y equipos filtrados por ciudad
      const [razonesSocialesRes, categoriasRes, equiposRes] = await Promise.all([
        fetch(`${FASTAPI_BASE_URL}/b2b/public/razones-sociales?ciudad_id=${ciudadId}`),
        fetch(`${FASTAPI_BASE_URL}/b2b/public/categorias?ciudad_id=${ciudadId}`),
        fetch(`${FASTAPI_BASE_URL}/b2b/public/equipos?ciudad_id=${ciudadId}`)
      ]);

      // Procesar razones sociales
      if (razonesSocialesRes.ok) {
        const razonesSocialesData = await razonesSocialesRes.json();
        setRazonesSociales(razonesSocialesData);
        if (razonesSocialesData.length === 0) {
          setNoDataMessages(prev => ({
            ...prev,
            razonesSociales: "No hay razones sociales disponibles para la ciudad seleccionada"
          }));
        }
      } else {
        setRazonesSociales([]);
        setNoDataMessages(prev => ({
          ...prev,
          razonesSociales: "Error al cargar razones sociales. Por favor intente nuevamente."
        }));
      }

      // Procesar categorías
      if (categoriasRes.ok) {
        const categoriasData = await categoriasRes.json();
        setCategorias(categoriasData);
        if (categoriasData.length === 0) {
          setNoDataMessages(prev => ({
            ...prev,
            categorias: "No hay categorías disponibles para la ciudad seleccionada"
          }));
        }
      } else {
        setCategorias([]);
        setNoDataMessages(prev => ({
          ...prev,
          categorias: "Error al cargar categorías. Por favor intente nuevamente."
        }));
      }

      // Procesar equipos
      if (equiposRes.ok) {
        const equiposData = await equiposRes.json();
        setEquipos(equiposData);
        if (equiposData.length === 0) {
          setNoDataMessages(prev => ({
            ...prev,
            equipos: "No hay equipos disponibles para la ciudad seleccionada"
          }));
        }
      } else {
        setEquipos([]);
        setNoDataMessages(prev => ({
          ...prev,
          equipos: "Error al cargar equipos. Por favor intente nuevamente."
        }));
      }

      // Limpiar sucursales y subcategorías ya que dependen de otras selecciones
      setSucursales([]);
      setSubcategorias([]);
      
    } catch (error) {
      console.error('Error cargando datos filtrados por ciudad:', error);
      setMessage("Error de conexión. Por favor intente nuevamente.");
      setRazonesSociales([]);
      setCategorias([]);
      setEquipos([]);
      setNoDataMessages({
        razonesSociales: "Error de conexión al cargar datos",
        sucursales: "",
        categorias: "Error de conexión al cargar datos",
        subcategorias: "",
        equipos: "Error de conexión al cargar datos"
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Cargar sucursales cuando se selecciona una razón social (también filtrado por ciudad)
  const handleRazonSocialChange = async (razonSocialId: string) => {
    setFormData(prev => ({
      ...prev,
      razonSocial: razonSocialId,
      sucursal: ""
    }));
    
    // Limpiar mensaje de sucursales
    setNoDataMessages(prev => ({
      ...prev,
      sucursales: ""
    }));
    
    if (!razonSocialId) {
      setSucursales([]);
      return;
    }

    try {
      setLoadingSucursales(true);
      // Filtrar por razón social Y ciudad si está seleccionada
      const ciudadParam = formData.ciudad ? `&ciudad_id=${formData.ciudad}` : '';
      const response = await fetch(`${FASTAPI_BASE_URL}/b2b/public/sucursales?razon_social_id=${razonSocialId}${ciudadParam}`);
      
      if (response.ok) {
        const sucursalesData = await response.json();
        setSucursales(sucursalesData);
        if (sucursalesData.length === 0) {
          setNoDataMessages(prev => ({
            ...prev,
            sucursales: "No hay sucursales disponibles para la razón social seleccionada"
          }));
        }
      } else {
        setSucursales([]);
        setNoDataMessages(prev => ({
          ...prev,
          sucursales: "Error al cargar sucursales. Por favor intente nuevamente."
        }));
      }
    } catch (error) {
      console.error('Error cargando sucursales:', error);
      setSucursales([]);
      setNoDataMessages(prev => ({
        ...prev,
        sucursales: "Error de conexión al cargar sucursales"
      }));
    } finally {
      setLoadingSucursales(false);
    }
  };

  // Cargar categorías, subcategorías y equipos cuando se selecciona una sucursal
  const handleSucursalChange = async (sucursalId: string) => {
    setFormData(prev => ({
      ...prev,
      sucursal: sucursalId,
      categoria: "",
      subcategoria: "",
      equipo: ""
    }));
    
    // Limpiar mensajes
    setNoDataMessages(prev => ({
      ...prev,
      categorias: "",
      subcategorias: "",
      equipos: ""
    }));
    
    if (!sucursalId) {
      setCategorias([]);
      setSubcategorias([]);
      setEquipos([]);
      return;
    }

    try {
      setLoadingData(true);
      
      // Cargar categorías y equipos filtrados por sucursal
      const [categoriasRes, equiposRes] = await Promise.all([
        fetch(`${FASTAPI_BASE_URL}/b2b/public/categorias?sucursal_id=${sucursalId}`),
        fetch(`${FASTAPI_BASE_URL}/b2b/public/equipos?sucursal_id=${sucursalId}`)
      ]);

      // Procesar categorías
      if (categoriasRes.ok) {
        const categoriasData = await categoriasRes.json();
        setCategorias(categoriasData);
        if (categoriasData.length === 0) {
          setNoDataMessages(prev => ({
            ...prev,
            categorias: "No hay categorías disponibles para la sucursal seleccionada"
          }));
        }
      } else {
        setCategorias([]);
        setNoDataMessages(prev => ({
          ...prev,
          categorias: "Error al cargar categorías. Por favor intente nuevamente."
        }));
      }

      // Procesar equipos
      if (equiposRes.ok) {
        const equiposData = await equiposRes.json();
        setEquipos(equiposData);
        if (equiposData.length === 0) {
          setNoDataMessages(prev => ({
            ...prev,
            equipos: "No hay equipos disponibles para la sucursal seleccionada"
          }));
        }
      } else {
        setEquipos([]);
        setNoDataMessages(prev => ({
          ...prev,
          equipos: "Error al cargar equipos. Por favor intente nuevamente."
        }));
      }

      // Limpiar subcategorías ya que dependen de la categoría
      setSubcategorias([]);
      
    } catch (error) {
      console.error('Error cargando datos filtrados por sucursal:', error);
      setMessage("Error de conexión. Por favor intente nuevamente.");
      setCategorias([]);
      setEquipos([]);
      setNoDataMessages({
        ...noDataMessages,
        categorias: "Error de conexión al cargar categorías",
        equipos: "Error de conexión al cargar equipos"
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Cargar subcategorías cuando se selecciona una categoría
  const handleCategoriaChange = async (categoriaId: string) => {
    setFormData(prev => ({
      ...prev,
      categoria: categoriaId,
      subcategoria: ""
    }));
    
    // Limpiar mensaje de subcategorías
    setNoDataMessages(prev => ({
      ...prev,
      subcategorias: ""
    }));
    
    if (!categoriaId) {
      setSubcategorias([]);
      return;
    }

    try {
      setLoadingSubcategorias(true);
      // Filtrar por categoría Y sucursal si está seleccionada
      const sucursalParam = formData.sucursal ? `&sucursal_id=${formData.sucursal}` : '';
      const response = await fetch(`${FASTAPI_BASE_URL}/b2b/public/subcategorias?categoria_id=${categoriaId}${sucursalParam}`);
      
      if (response.ok) {
        const subcategoriasData = await response.json();
        setSubcategorias(subcategoriasData);
        if (subcategoriasData.length === 0) {
          setNoDataMessages(prev => ({
            ...prev,
            subcategorias: "No hay subcategorías disponibles para la categoría seleccionada"
          }));
        }
      } else {
        setSubcategorias([]);
        setNoDataMessages(prev => ({
          ...prev,
          subcategorias: "Error al cargar subcategorías. Por favor intente nuevamente."
        }));
      }
    } catch (error) {
      console.error('Error cargando subcategorías:', error);
      setSubcategorias([]);
      setNoDataMessages(prev => ({
        ...prev,
        subcategorias: "Error de conexión al cargar subcategorías"
      }));
    } finally {
      setLoadingSubcategorias(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setArchivo(file);
  };

  // Función para manejar cambios en el formulario financiero
  const handleInputChangeFinanciera = (field: string, value: string) => {
    setFormDataFinanciera(prev => ({
      ...prev,
      [field]: value
    }));

    // Si se modifica el número de documento de cruce, buscar datos de cartera
    if (field === 'nro_docto_cruce' && value.trim()) {
      buscarDatosCartera(value.trim());
    } else if (field === 'nro_docto_cruce' && !value.trim()) {
      // Limpiar campos autocompletados si se borra el número de documento
      setFormDataFinanciera(prev => ({
        ...prev,
        nit: "",
        razon_social: "",
        tipo_cliente: ""
      }));
      setCarteraError("");
    }
  };

  const handleFileChangeFinanciera = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setArchivoFinanciera(file);
  };

  // Función para buscar datos de cartera por número de documento de cruce
  const buscarDatosCartera = async (nroDocumento: string) => {
    setLoadingCartera(true);
    setCarteraError("");

    try {
      const response = await fetch(`${FASTAPI_BASE_URL}/cartera/${encodeURIComponent(nroDocumento)}`);
      
      if (response.ok) {
        const carteraData = await response.json();
        
        // Autocompletar campos de facturación
        setFormDataFinanciera(prev => ({
          ...prev,
          nit: carteraData.nit || "",
          razon_social: carteraData.razon_social || "",
          tipo_cliente: carteraData.tipo_cliente || ""
        }));
        
        setCarteraError("");
      } else if (response.status === 404) {
        // No se encontró el documento
        setCarteraError("No se encontró el documento de cruce en el sistema");
        setFormDataFinanciera(prev => ({
          ...prev,
          nit: "",
          razon_social: "",
          tipo_cliente: ""
        }));
      } else {
        const errorData = await response.json();
        setCarteraError(errorData.detail || "Error al consultar datos de cartera");
      }
    } catch (error) {
      console.error('Error buscando datos de cartera:', error);
      setCarteraError("Error de conexión al consultar cartera");
    } finally {
      setLoadingCartera(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación mejorada con información específica sobre campos faltantes
    const camposFaltantes = [];
    if (!formData.nombre?.trim()) camposFaltantes.push('Nombre');
    if (!formData.correo?.trim()) camposFaltantes.push('Correo');
    if (!formData.asunto?.trim()) camposFaltantes.push('Asunto');
    if (!formData.descripcion?.trim()) camposFaltantes.push('Descripción');
    if (!formData.ciudad) camposFaltantes.push('Ciudad');
    if (!formData.razonSocial) camposFaltantes.push('Razón Social');
    if (!formData.sucursal) camposFaltantes.push('Sucursal');
    if (!formData.categoria) camposFaltantes.push('Categoría');
    if (!formData.subcategoria) camposFaltantes.push('Subcategoría');
    if (!formData.equipo) camposFaltantes.push('Equipo');
    
    if (camposFaltantes.length > 0) {
      setMessage(`Por favor complete los siguientes campos obligatorios: ${camposFaltantes.join(', ')}`);
      return;
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.correo)) {
      setMessage("Por favor ingrese un correo electrónico válido");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      console.log('🔍 Datos del formulario antes de enviar:', formData);
      
      // Crear URLSearchParams para query parameters
      const queryParams = new URLSearchParams({
        nombre: formData.nombre || '',
        correo: formData.correo || '',
        telefono: formData.telefono || '',
        asunto: formData.asunto || '',
        descripcion: formData.descripcion || '',
        ciudad: formData.ciudad || '',
        razonSocial: formData.razonSocial || '',
        sucursal: formData.sucursal || '',
        categoria: formData.categoria || '',
        subcategoria: formData.subcategoria || '',
        equipo: formData.equipo || ''
      });

      console.log('📝 Query parameters:', queryParams.toString());

      // Crear FormData solo para el archivo
      const formDataToSend = new FormData();
      if (archivo) {
        console.log('📎 Agregando archivo:', archivo.name);
        formDataToSend.append('archivo', archivo);
      }

      // Crear URL con query parameters
      const url = `${FASTAPI_BASE_URL}/b2b/solicitudes?${queryParams.toString()}`;
      console.log('📤 URL completa:', url);

      const response = await fetch(url, {
        method: 'POST',
        body: archivo ? formDataToSend : undefined, // Solo enviar FormData si hay archivo
      });

      if (response.ok) {
        const result = await response.json();
        
        // Preparar datos para el modal de éxito
        const datosModalExito: SolicitudData = {
          id: result.folio || 'B2B-' + Date.now(),
          fecha: new Date().toLocaleDateString('es-ES'),
          hora: new Date().toLocaleTimeString('es-ES'),
          asunto: formData.asunto,
          categoria: categorias.find(c => c.id.toString() === formData.categoria)?.nombre || 'N/A',
          subcategoria: subcategorias.find(s => s.id.toString() === formData.subcategoria)?.nombre || 'N/A',
          zona: 'Comercial B2B',
          ciudad: ciudades.find(c => c.id.toString() === formData.ciudad)?.nombre || 'N/A',
          tienda: `${razonesSociales.find(r => r.id.toString() === formData.razonSocial)?.nombre || 'N/A'} - ${sucursales.find(s => s.id.toString() === formData.sucursal)?.nombre || 'N/A'}`,
          nombre: formData.nombre,
          correo: formData.correo,
          telefono: formData.telefono,
          descripcion: formData.descripcion
        };

        setSolicitudExitosa(datosModalExito);
        setMostrarModalExito(true);
        
        // Limpiar formulario
        setFormData({
          nombre: "",
          correo: "",
          telefono: "",
          asunto: "",
          descripcion: "",
          ciudad: "",
          razonSocial: "",
          sucursal: "",
          categoria: "",
          subcategoria: "",
          equipo: "",
        });
        setArchivo(null);
        setMessage(""); // Limpiar mensaje previo
      } else {
        const errorData = await response.json();
        // Manejar diferentes tipos de errores de manera más robusta
        let errorMessage = 'Error desconocido';
        
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((err: any) => 
              typeof err === 'string' ? err : err.msg || JSON.stringify(err)
            ).join(', ');
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        setMessage(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error enviando solicitud:', error);
      setMessage("Error de conexión. Por favor intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // Función para enviar formulario financiero
  const handleSubmitFinanciera = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación de campos obligatorios
    const camposFaltantes = [];
    if (!formDataFinanciera.nombre?.trim()) camposFaltantes.push('Nombre');
    if (!formDataFinanciera.correo_electronico?.trim()) camposFaltantes.push('Correo Electrónico');
    if (!formDataFinanciera.telefono?.trim()) camposFaltantes.push('Teléfono');
    if (!formDataFinanciera.asunto?.trim()) camposFaltantes.push('Asunto');
    if (!formDataFinanciera.nit?.trim()) camposFaltantes.push('NIT');
    if (!formDataFinanciera.razon_social?.trim()) camposFaltantes.push('Razón Social');
    if (!formDataFinanciera.sucursal?.trim()) camposFaltantes.push('Sucursal');
    if (!formDataFinanciera.tipo_cliente?.trim()) camposFaltantes.push('Tipo de Cliente');
    if (!formDataFinanciera.nro_docto_cruce?.trim()) camposFaltantes.push('Número de Documento de Cruce');
    if (!formDataFinanciera.valor_total_cop?.trim()) camposFaltantes.push('Valor Total COP');
    
    if (camposFaltantes.length > 0) {
      setMessageFinanciera(`Por favor complete los siguientes campos obligatorios: ${camposFaltantes.join(', ')}`);
      return;
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formDataFinanciera.correo_electronico)) {
      setMessageFinanciera("Por favor ingrese un correo electrónico válido");
      return;
    }

    // Validación de valor numérico
    const valorCOP = parseFloat(formDataFinanciera.valor_total_cop);
    if (isNaN(valorCOP) || valorCOP <= 0) {
      setMessageFinanciera("El valor total debe ser un número mayor a cero");
      return;
    }

    if (!archivoFinanciera) {
      setMessageFinanciera("Por favor adjunte una imagen de la factura");
      return;
    }

    setLoadingFinanciera(true);
    setMessageFinanciera("");

    try {
      console.log('🔍 Datos del formulario financiero antes de enviar:', formDataFinanciera);
      
      // Crear FormData para enviar archivo y datos
      const formDataToSend = new FormData();
      formDataToSend.append('archivo', archivoFinanciera);
      
      // Agregar datos del formulario
      formDataToSend.append('nombre', formDataFinanciera.nombre);
      formDataToSend.append('correo_electronico', formDataFinanciera.correo_electronico);
      formDataToSend.append('telefono', formDataFinanciera.telefono);
      formDataToSend.append('asunto', formDataFinanciera.asunto);
      formDataToSend.append('nit', formDataFinanciera.nit);
      formDataToSend.append('razon_social', formDataFinanciera.razon_social);
      formDataToSend.append('sucursal', formDataFinanciera.sucursal);
      formDataToSend.append('tipo_cliente', formDataFinanciera.tipo_cliente);
      formDataToSend.append('nro_docto_cruce', formDataFinanciera.nro_docto_cruce);
      formDataToSend.append('valor_total_cop', valorCOP.toString());
      if (formDataFinanciera.descripcion_adicional?.trim()) {
        formDataToSend.append('descripcion_adicional', formDataFinanciera.descripcion_adicional);
      }

      const url = `${FASTAPI_BASE_URL}/facturas`;
      console.log('📤 URL de envío financiera:', url);

      const response = await fetch(url, {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        const result = await response.json();
        
        setMessageFinanciera(`✅ Factura registrada exitosamente. ID: ${result.id}`);
        
        // Resetear formulario
        setFormDataFinanciera({
          nombre: "",
          correo_electronico: "",
          telefono: "",
          asunto: "",
          nit: "",
          razon_social: "",
          sucursal: "",
          tipo_cliente: "",
          nro_docto_cruce: "",
          valor_total_cop: "",
          descripcion_adicional: "",
        });
        setArchivoFinanciera(null);
        setCarteraError("");
        
        // Scroll al mensaje de éxito
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      } else {
        const errorData = await response.json();
        let errorMessage = 'Error desconocido';
        
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((err: any) => 
              typeof err === 'string' ? err : err.msg || JSON.stringify(err)
            ).join(', ');
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        setMessageFinanciera(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error enviando factura:', error);
      setMessageFinanciera("Error de conexión. Por favor intente nuevamente.");
    } finally {
      setLoadingFinanciera(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00B0B2] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: "url('/images/cq.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "50% 70%",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="w-full max-w-2xl">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center text-[#00B0B2] hover:text-[#0C6659] transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Link>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-[#00B0B2]/20">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="bg-gradient-to-r from-[#00B0B2]/10 to-[#0C6659]/10 border-b border-[#00B0B2]/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-2xl font-bold text-[#333231]">Solicitud B2B</CardTitle>
                <TabsList className="grid w-full sm:w-auto grid-cols-2 bg-white/80 border border-[#00B0B2]/30">
                  <TabsTrigger 
                    value="mantenimiento" 
                    className="data-[state=active]:bg-[#00B0B2] data-[state=active]:text-white text-[#333231] font-medium"
                  >
                    Mantenimiento
                  </TabsTrigger>
                  <TabsTrigger 
                    value="financiera" 
                    className="data-[state=active]:bg-[#00B0B2] data-[state=active]:text-white text-[#333231] font-medium"
                  >
                    Financiera
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <TabsContent value="mantenimiento" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-[#333231] font-medium">
                    Nombre *
                  </Label>
                  <Input 
                    id="nombre" 
                    name="nombre" 
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    required 
                    className="border-[#00B0B2]/30 focus:border-[#00B0B2]" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correo" className="text-[#333231] font-medium">
                    Correo electrónico *
                  </Label>
                  <Input
                    id="correo"
                    name="correo"
                    type="email"
                    value={formData.correo}
                    onChange={(e) => handleInputChange('correo', e.target.value)}
                    required
                    className="border-[#00B0B2]/30 focus:border-[#00B0B2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono" className="text-[#333231] font-medium">
                    Teléfono
                  </Label>
                  <Input 
                    id="telefono" 
                    name="telefono" 
                    value={formData.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    className="border-[#00B0B2]/30 focus:border-[#00B0B2]" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asunto" className="text-[#333231] font-medium">
                    Asunto *
                  </Label>
                  <Input 
                    id="asunto" 
                    name="asunto" 
                    value={formData.asunto}
                    onChange={(e) => handleInputChange('asunto', e.target.value)}
                    required 
                    className="border-[#00B0B2]/30 focus:border-[#00B0B2]" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion" className="text-[#333231] font-medium">
                  Descripción *
                </Label>
                <Textarea
                  id="descripcion"
                  name="descripcion"
                  rows={4}
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange('descripcion', e.target.value)}
                  required
                  className="border-[#00B0B2]/30 focus:border-[#00B0B2]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#333231] font-medium">Ciudad *</Label>
                  <Select value={formData.ciudad} onValueChange={handleCiudadChange}>
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder="-- Seleccione una ciudad --" />
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

                <div className="space-y-2">
                  <Label className="text-[#333231] font-medium">Razón Social *</Label>
                  <Select value={formData.razonSocial} onValueChange={handleRazonSocialChange} disabled={!formData.ciudad || loadingData}>
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder={!formData.ciudad ? "Seleccione primero una ciudad" : loadingData ? "Cargando..." : "-- Seleccione razón social --"} />
                    </SelectTrigger>
                    <SelectContent>
                      {razonesSociales.length > 0 ? (
                        razonesSociales.map((razon) => (
                          <SelectItem key={razon.id} value={razon.id.toString()}>
                            {razon.nombre}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-3 text-sm text-gray-500 text-center">
                          {noDataMessages.razonesSociales || "No hay razones sociales disponibles"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {noDataMessages.razonesSociales && razonesSociales.length === 0 && formData.ciudad && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ {noDataMessages.razonesSociales}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[#333231] font-medium">Sucursal *</Label>
                  <Select value={formData.sucursal} onValueChange={handleSucursalChange} disabled={!formData.razonSocial || loadingSucursales}>
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder={!formData.razonSocial ? "Seleccione primero una razón social" : loadingSucursales ? "Cargando..." : "-- Seleccione una sucursal --"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sucursales.length > 0 ? (
                        sucursales.map((sucursal) => (
                          <SelectItem key={sucursal.id} value={sucursal.id.toString()}>
                            {sucursal.nombre}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-3 text-sm text-gray-500 text-center">
                          {noDataMessages.sucursales || "No hay sucursales disponibles"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {noDataMessages.sucursales && sucursales.length === 0 && formData.razonSocial && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ {noDataMessages.sucursales}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#333231] font-medium">Categoría *</Label>
                  <Select value={formData.categoria} onValueChange={handleCategoriaChange} disabled={!formData.ciudad || loadingData}>
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder={!formData.ciudad ? "Seleccione primero una ciudad" : loadingData ? "Cargando..." : "-- Seleccione una categoría --"} />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.length > 0 ? (
                        categorias.map((categoria) => (
                          <SelectItem key={categoria.id} value={categoria.id.toString()}>
                            {categoria.nombre}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-3 text-sm text-gray-500 text-center">
                          {noDataMessages.categorias || "No hay categorías disponibles"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {noDataMessages.categorias && categorias.length === 0 && formData.ciudad && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ {noDataMessages.categorias}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[#333231] font-medium">Subcategoría *</Label>
                  <Select value={formData.subcategoria} onValueChange={(value) => handleInputChange('subcategoria', value)} disabled={!formData.categoria || loadingSubcategorias}>
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder={!formData.ciudad ? "Seleccione primero una ciudad" : !formData.categoria ? "Seleccione primero una categoría" : loadingSubcategorias ? "Cargando..." : "-- Seleccione una subcategoría --"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategorias.length > 0 ? (
                        subcategorias.map((subcategoria) => (
                          <SelectItem key={subcategoria.id} value={subcategoria.id.toString()}>
                            {subcategoria.nombre}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-3 text-sm text-gray-500 text-center">
                          {noDataMessages.subcategorias || "No hay subcategorías disponibles"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {noDataMessages.subcategorias && subcategorias.length === 0 && formData.categoria && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ {noDataMessages.subcategorias}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[#333231] font-medium">Equipo *</Label>
                  <Select value={formData.equipo} onValueChange={(value) => handleInputChange('equipo', value)} disabled={!formData.ciudad || loadingData}>
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder={!formData.ciudad ? "Seleccione primero una ciudad" : loadingData ? "Cargando..." : "-- Seleccione un equipo --"} />
                    </SelectTrigger>
                    <SelectContent>
                      {equipos.length > 0 ? (
                        equipos.map((equipo) => (
                          <SelectItem key={equipo.id} value={equipo.id.toString()}>
                            {equipo.nombre}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-3 text-sm text-gray-500 text-center">
                          {noDataMessages.equipos || "No hay equipos disponibles"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {noDataMessages.equipos && equipos.length === 0 && formData.ciudad && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ {noDataMessages.equipos}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="archivo" className="text-[#333231] font-medium">
                  Archivos adjuntos *
                </Label>
                <div className="flex justify-center">
                  <div className="relative w-full max-w-md">
                    <input
                      id="archivo"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div
                      className="
                      w-full h-12
                      border-2 border-[#00B0B2]/30 rounded-lg
                      bg-white text-[#333231]
                      flex items-center justify-center
                      cursor-pointer
                      hover:border-[#00B0B2]
                      transition-colors
                    "
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="
                          bg-[#00B0B2] hover:bg-[#0C6659] 
                          text-white px-4 py-2 rounded-md 
                          font-medium text-sm
                          transition-colors
                        "
                        >
                          Seleccionar archivos
                        </div>
                        <span className="text-[#333231] text-sm">
                          {archivo?.name || "Ningún archivo seleccionado"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {archivo ? (
                  <p className="text-sm text-[#0C6659] mt-2 text-center font-medium">
                    ✅ Archivo seleccionado: {archivo.name}
                  </p>
                ) : (
                  <p className="text-sm text-red-600 mt-2 text-center font-medium">
                    * Es obligatorio adjuntar una foto
                  </p>
                )}
              </div>

              {message && (
                <div className={`p-4 rounded-lg text-center ${
                  message.includes('✅') || message.includes('exitosamente')
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {message}
                </div>
              )}

              <div className="text-center pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#00B0B2] hover:bg-[#0C6659] disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-8 py-2 text-lg font-medium transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ENVIANDO...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      ENVIAR SOLICITUD
                    </>
                  )}
                </Button>
              </div>
            </form>
            </TabsContent>

            <TabsContent value="financiera" className="mt-0">
            <form onSubmit={handleSubmitFinanciera} className="space-y-6 p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nombre-financiera" className="text-[#333231] font-medium">
                      Nombre *
                    </Label>
                    <Input
                      id="nombre-financiera"
                      name="nombre"
                      value={formDataFinanciera.nombre}
                      onChange={(e) => handleInputChangeFinanciera('nombre', e.target.value)}
                      placeholder="Ingrese su nombre completo"
                      className="border-[#00B0B2]/30 focus:border-[#00B0B2]"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="correo-financiera" className="text-[#333231] font-medium">
                      Correo Electrónico *
                    </Label>
                    <Input
                      id="correo-financiera"
                      name="correo_electronico"
                      type="email"
                      value={formDataFinanciera.correo_electronico}
                      onChange={(e) => handleInputChangeFinanciera('correo_electronico', e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="border-[#00B0B2]/30 focus:border-[#00B0B2]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="telefono-financiera" className="text-[#333231] font-medium">
                      Teléfono *
                    </Label>
                    <Input
                      id="telefono-financiera"
                      name="telefono"
                      type="tel"
                      value={formDataFinanciera.telefono}
                      onChange={(e) => handleInputChangeFinanciera('telefono', e.target.value)}
                      placeholder="Ej: 3001234567"
                      className="border-[#00B0B2]/30 focus:border-[#00B0B2]"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asunto-financiera" className="text-[#333231] font-medium">
                      Asunto *
                    </Label>
                    <Input
                      id="asunto-financiera"
                      name="asunto"
                      value={formDataFinanciera.asunto}
                      onChange={(e) => handleInputChangeFinanciera('asunto', e.target.value)}
                      placeholder="Asunto de la factura"
                      className="border-[#00B0B2]/30 focus:border-[#00B0B2]"
                      required
                    />
                  </div>
                </div>

                <div className="border-t border-[#00B0B2]/20 pt-6">
                  <h3 className="text-lg font-semibold text-[#333231] mb-4">Datos de Facturación</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nro-docto-cruce" className="text-[#333231] font-medium">
                        Número de Documento de Cruce *
                      </Label>
                      <div className="relative">
                        <Input
                          id="nro-docto-cruce"
                          name="nro_docto_cruce"
                          value={formDataFinanciera.nro_docto_cruce}
                          onChange={(e) => handleInputChangeFinanciera('nro_docto_cruce', e.target.value)}
                          placeholder="Ingrese el número de documento"
                          className="border-[#00B0B2]/30 focus:border-[#00B0B2]"
                          required
                        />
                        {loadingCartera && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-[#00B0B2]" />
                          </div>
                        )}
                      </div>
                      {carteraError && (
                        <p className="text-xs text-red-600 mt-1">⚠️ {carteraError}</p>
                      )}
                      {formDataFinanciera.nit && !carteraError && (
                        <p className="text-xs text-green-600 mt-1">✅ Datos autocompletados</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sucursal-financiera" className="text-[#333231] font-medium">
                        Sucursal *
                      </Label>
                      <Input
                        id="sucursal-financiera"
                        name="sucursal"
                        value={formDataFinanciera.sucursal}
                        onChange={(e) => handleInputChangeFinanciera('sucursal', e.target.value)}
                        placeholder="Nombre de la sucursal"
                        className="border-[#00B0B2]/30 focus:border-[#00B0B2]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="nit-financiera" className="text-[#333231] font-medium">
                        NIT *
                      </Label>
                      <Input
                        id="nit-financiera"
                        name="nit"
                        value={formDataFinanciera.nit}
                        onChange={(e) => handleInputChangeFinanciera('nit', e.target.value)}
                        placeholder="NIT"
                        className="border-[#00B0B2]/30 focus:border-[#00B0B2] bg-gray-50"
                        disabled={!!formDataFinanciera.nro_docto_cruce.trim()}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="razon-social-financiera" className="text-[#333231] font-medium">
                        Razón Social *
                      </Label>
                      <Input
                        id="razon-social-financiera"
                        name="razon_social"
                        value={formDataFinanciera.razon_social}
                        onChange={(e) => handleInputChangeFinanciera('razon_social', e.target.value)}
                        placeholder="Razón Social"
                        className="border-[#00B0B2]/30 focus:border-[#00B0B2] bg-gray-50"
                        disabled={!!formDataFinanciera.nro_docto_cruce.trim()}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipo-cliente-financiera" className="text-[#333231] font-medium">
                        Tipo de Cliente *
                      </Label>
                      <Input
                        id="tipo-cliente-financiera"
                        name="tipo_cliente"
                        value={formDataFinanciera.tipo_cliente}
                        onChange={(e) => handleInputChangeFinanciera('tipo_cliente', e.target.value)}
                        placeholder="Tipo de Cliente"
                        className="border-[#00B0B2]/30 focus:border-[#00B0B2] bg-gray-50"
                        disabled={!!formDataFinanciera.nro_docto_cruce.trim()}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="valor-total" className="text-[#333231] font-medium">
                      Valor Total COP *
                    </Label>
                    <Input
                      id="valor-total"
                      name="valor_total_cop"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formDataFinanciera.valor_total_cop}
                      onChange={(e) => handleInputChangeFinanciera('valor_total_cop', e.target.value)}
                      placeholder="Ej: 1500000.00"
                      className="border-[#00B0B2]/30 focus:border-[#00B0B2]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion-financiera" className="text-[#333231] font-medium">
                    Descripción Adicional
                  </Label>
                  <Textarea
                    id="descripcion-financiera"
                    name="descripcion_adicional"
                    value={formDataFinanciera.descripcion_adicional}
                    onChange={(e) => handleInputChangeFinanciera('descripcion_adicional', e.target.value)}
                    placeholder="Información adicional sobre la factura (opcional)"
                    className="border-[#00B0B2]/30 focus:border-[#00B0B2] min-h-[100px]"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="archivo-financiera" className="text-[#333231] font-medium">
                    Adjuntar Imagen *
                  </Label>
                  <div className="flex justify-center">
                    <div className="relative w-full max-w-md">
                      <input
                        id="archivo-financiera"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChangeFinanciera}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div
                        className="
                        w-full h-12
                        border-2 border-[#00B0B2]/30 rounded-lg
                        bg-white text-[#333231]
                        flex items-center justify-center
                        cursor-pointer
                        hover:border-[#00B0B2]
                        transition-colors
                      "
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="
                            bg-[#00B0B2] hover:bg-[#0C6659] 
                            text-white px-4 py-2 rounded-md 
                            font-medium text-sm
                            transition-colors
                          "
                          >
                            Seleccionar factura
                          </div>
                          <span className="text-[#333231] text-sm">
                            {archivoFinanciera?.name || "Ninguna factura seleccionada"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {archivoFinanciera ? (
                    <p className="text-sm text-[#0C6659] mt-2 text-center font-medium">
                      ✅ Archivo seleccionado: {archivoFinanciera.name}
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 mt-2 text-center font-medium">
                      * Es obligatorio adjuntar una foto
                    </p>
                  )}
                </div>

                {messageFinanciera && (
                  <div className={`p-4 rounded-lg text-center ${
                    messageFinanciera.includes('✅') || messageFinanciera.includes('exitosamente')
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {messageFinanciera}
                  </div>
                )}

                <div className="text-center pt-4">
                  <Button
                    type="submit"
                    disabled={loadingFinanciera}
                    className="bg-[#00B0B2] hover:bg-[#0C6659] disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-8 py-2 text-lg font-medium transition-colors"
                  >
                    {loadingFinanciera ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ENVIANDO...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        ENVIAR FACTURA
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
            </TabsContent>
          </CardContent>
          </Tabs>
        </Card>

        <div className="text-center mt-4">
          <p className="text-[#333231] text-sm drop-shadow-sm">© 2025 Cafe Quindio. Todos los derechos reservados.</p>
        </div>
      </div>

      {/* Modal de Solicitud Exitosa */}
      {solicitudExitosa && (
        <SolicitudExitosaModal
          open={mostrarModalExito}
          onOpenChange={(open) => {
            setMostrarModalExito(open);
            if (!open) {
              setSolicitudExitosa(null);
            }
          }}
          solicitudData={solicitudExitosa}
        />
      )}
    </div>
  );
}
