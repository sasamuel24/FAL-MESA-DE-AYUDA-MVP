"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import { SolicitudExitosaModal, SolicitudData } from "@/components/SolicitudExitosaModal";

const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || "http://localhost:8000/api/v1";

// Interfaces para el sistema dinámico de ciudades y tiendas
interface Zona {
  id: number;
  nombre: string;
  codigo: string;
}

interface Ciudad {
  id: number;
  nombre: string;
  codigo: string;
  zona_id: number;
}

interface Tienda {
  id: number;
  nombre: string;
  codigo: string;
  ciudad_id: number;
  direccion?: string;
}

// Interface para áreas de logística
interface AreaLogistica {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activa: boolean;
}

export default function FormularioLogistica() {
  // Estados para datos dinámicos de ciudades y tiendas
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [ciudadesOrigen, setCiudadesOrigen] = useState<Ciudad[]>([]);
  const [tiendasOrigen, setTiendasOrigen] = useState<Tienda[]>([]);
  const [ciudadesDestino, setCiudadesDestino] = useState<Ciudad[]>([]);
  const [tiendasDestino, setTiendasDestino] = useState<Tienda[]>([]);
  
  // Estado para áreas de logística dinámicas
  const [areasLogistica, setAreasLogistica] = useState<AreaLogistica[]>([]);
  
  // Estados de carga
  const [loadingData, setLoadingData] = useState(true);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [loadingCiudadesOrigen, setLoadingCiudadesOrigen] = useState(false);
  const [loadingTiendasOrigen, setLoadingTiendasOrigen] = useState(false);
  const [loadingCiudadesDestino, setLoadingCiudadesDestino] = useState(false);
  const [loadingTiendasDestino, setLoadingTiendasDestino] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    // Campos básicos (siempre visibles)
    nombre: "",
    correo: "",
    telefono: "",
    asunto: "",
    descripcion: "",
    
    // Campos de configuración principal
    area: "",
    tipoSolicitud: "",
    tipoCliente: "",
    
    // ORIGEN (solo para Traslado)
    origenTipoCliente: "",
    // Campos Cliente Externo (Origen)
    origenCiudad: "",
    origenDireccion: "",
    origenClienteNombre: "",
    origenNit: "",
    origenPersonaContacto: "",
    origenNumeroContacto: "",
    origenHorarioRecepcion: "",
    origenFechaRequerida: "",
    origenCantidad: "",
    origenPeso: "",
    origenVolumen: "",
    origenValorDeclarado: "",
    // Campos Cliente Interno (Origen)
    origenCiudadInterna: "",
    origenTienda: "",
    
    // DESTINO (para Despacho, Recolección y Traslado)
    destinoTipoCliente: "",
    // Campos Cliente Externo (Destino)
    destinoCiudad: "",
    destinoDireccion: "",
    destinoClienteNombre: "",
    destinoNit: "",
    destinoPersonaContacto: "",
    destinoNumeroContacto: "",
    destinoHorarioRecepcion: "",
    destinoFechaRequerida: "",
    destinoCantidad: "",
    destinoPeso: "",
    destinoVolumen: "",
    destinoValorDeclarado: "",
    // Campos Cliente Interno (Destino)
    destinoCiudadInterna: "",
    destinoTienda: "",
  });
  
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // Estados para el modal de éxito
  const [mostrarModalExito, setMostrarModalExito] = useState(false);
  const [solicitudExitosa, setSolicitudExitosa] = useState<SolicitudData | null>(null);

  // Cargar áreas de logística y zonas al iniciar
  useEffect(() => {
    cargarAreasLogistica();
    cargarZonas();
  }, []);

  const cargarAreasLogistica = async () => {
    try {
      setLoadingAreas(true);
      const response = await fetch(`${FASTAPI_BASE_URL}/logistica/areas`);
      
      if (response.ok) {
        const areas = await response.json();
        setAreasLogistica(areas);
      } else {
        console.error('Error cargando áreas de logística');
        setMessage("Error cargando áreas de logística");
      }
    } catch (error) {
      console.error('Error cargando áreas de logística:', error);
      setMessage("Error de conexión al cargar áreas");
    } finally {
      setLoadingAreas(false);
    }
  };

  // Cargar zonas al iniciar (necesario para obtener ciudades)
  const cargarZonas = async () => {
    try {
      setLoadingData(true);
      const response = await fetch(`${FASTAPI_BASE_URL}/organizaciones/zonas`);
      
      if (response.ok) {
        const zonasData = await response.json();
        setZonas(zonasData);
        
        // Cargar todas las ciudades (sin filtro de zona para cliente interno)
        await cargarTodasLasCiudades();
      }
    } catch (error) {
      console.error('Error cargando zonas:', error);
      setMessage("Error cargando datos del formulario");
    } finally {
      setLoadingData(false);
    }
  };

  const cargarTodasLasCiudades = async () => {
    try {
      const response = await fetch(`${FASTAPI_BASE_URL}/organizaciones/ciudades`);
      
      if (response.ok) {
        const ciudadesData = await response.json();
        // Inicialmente ambas listas tienen todas las ciudades
        setCiudadesOrigen(ciudadesData);
        setCiudadesDestino(ciudadesData);
      }
    } catch (error) {
      console.error('Error cargando ciudades:', error);
    }
  };

  // Manejar cambio de ciudad en ORIGEN (Cliente Interno)
  const handleCiudadOrigenChange = async (ciudadId: string) => {
    setFormData(prev => ({
      ...prev,
      origenCiudadInterna: ciudadId,
      origenTienda: ""
    }));
    
    if (!ciudadId) {
      setTiendasOrigen([]);
      return;
    }

    try {
      setLoadingTiendasOrigen(true);
      const response = await fetch(`${FASTAPI_BASE_URL}/organizaciones/tiendas?ciudad_id=${ciudadId}`);
      
      if (response.ok) {
        const tiendasData = await response.json();
        setTiendasOrigen(tiendasData);
      }
    } catch (error) {
      console.error('Error cargando tiendas origen:', error);
    } finally {
      setLoadingTiendasOrigen(false);
    }
  };

  // Manejar cambio de ciudad en DESTINO (Cliente Interno)
  const handleCiudadDestinoChange = async (ciudadId: string) => {
    setFormData(prev => ({
      ...prev,
      destinoCiudadInterna: ciudadId,
      destinoTienda: ""
    }));
    
    if (!ciudadId) {
      setTiendasDestino([]);
      return;
    }

    try {
      setLoadingTiendasDestino(true);
      const response = await fetch(`${FASTAPI_BASE_URL}/organizaciones/tiendas?ciudad_id=${ciudadId}`);
      
      if (response.ok) {
        const tiendasData = await response.json();
        setTiendasDestino(tiendasData);
      }
    } catch (error) {
      console.error('Error cargando tiendas destino:', error);
    } finally {
      setLoadingTiendasDestino(false);
    }
  };

  // Tipos de solicitud
  const tiposSolicitud = [
    { value: "despacho", label: "Despacho" },
    { value: "recoleccion", label: "Recolección" },
    { value: "traslado", label: "Traslado" },
  ];

  // Tipos de cliente
  const tiposCliente = [
    { value: "interno", label: "Cliente Interno" },
    { value: "externo", label: "Cliente Externo" },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar campos dependientes cuando cambia el tipo de solicitud
    if (field === 'tipoSolicitud') {
      setFormData(prev => ({
        ...prev,
        tipoCliente: "",
        origenTipoCliente: "",
        destinoTipoCliente: "",
        // Limpiar todos los campos de origen y destino
        origenCiudad: "", origenDireccion: "", origenClienteNombre: "", origenNit: "",
        origenPersonaContacto: "", origenNumeroContacto: "", origenHorarioRecepcion: "",
        origenFechaRequerida: "", origenCantidad: "", origenPeso: "", origenVolumen: "",
        origenValorDeclarado: "", origenCiudadInterna: "", origenTienda: "",
        destinoCiudad: "", destinoDireccion: "", destinoClienteNombre: "", destinoNit: "",
        destinoPersonaContacto: "", destinoNumeroContacto: "", destinoHorarioRecepcion: "",
        destinoFechaRequerida: "", destinoCantidad: "", destinoPeso: "", destinoVolumen: "",
        destinoValorDeclarado: "", destinoCiudadInterna: "", destinoTienda: "",
      }));
    }
    
    // Limpiar campos de cliente cuando cambia el tipo de cliente
    if (field === 'tipoCliente' || field === 'origenTipoCliente' || field === 'destinoTipoCliente') {
      const isOrigen = field === 'origenTipoCliente';
      const isDestino = field === 'destinoTipoCliente' || field === 'tipoCliente';
      
      if (isOrigen) {
        setFormData(prev => ({
          ...prev,
          origenCiudad: "", origenDireccion: "", origenClienteNombre: "", origenNit: "",
          origenPersonaContacto: "", origenNumeroContacto: "", origenHorarioRecepcion: "",
          origenFechaRequerida: "", origenCantidad: "", origenPeso: "", origenVolumen: "",
          origenValorDeclarado: "", origenCiudadInterna: "", origenTienda: "",
        }));
        // Limpiar lista de tiendas de origen
        setTiendasOrigen([]);
      }
      
      if (isDestino) {
        setFormData(prev => ({
          ...prev,
          destinoCiudad: "", destinoDireccion: "", destinoClienteNombre: "", destinoNit: "",
          destinoPersonaContacto: "", destinoNumeroContacto: "", destinoHorarioRecepcion: "",
          destinoFechaRequerida: "", destinoCantidad: "", destinoPeso: "", destinoVolumen: "",
          destinoValorDeclarado: "", destinoCiudadInterna: "", destinoTienda: "",
        }));
        // Limpiar lista de tiendas de destino
        setTiendasDestino([]);
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
        setMessage("Solo se permiten archivos de imagen (JPG, PNG, GIF, WEBP)");
        return;
      }
      
      // Validar tamaño (16MB máximo)
      if (file.size > 16 * 1024 * 1024) {
        setMessage("El archivo es muy grande. El tamaño máximo es 16MB");
        return;
      }
      
      setArchivo(file);
      setMessage("");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validar campos básicos
    if (!formData.nombre || !formData.correo || !formData.asunto || !formData.descripcion) {
      setMessage("Por favor complete todos los campos obligatorios básicos");
      return;
    }

    // Validar campos de configuración principal
    if (!formData.area || !formData.tipoSolicitud) {
      setMessage("Debe seleccionar Área y Tipo de Solicitud");
      return;
    }

    // Validar según tipo de solicitud
    if (formData.tipoSolicitud === 'traslado') {
      if (!formData.origenTipoCliente || !formData.destinoTipoCliente) {
        setMessage("Para Traslado debe seleccionar tipo de cliente en Origen y Destino");
        return;
      }
    } else {
      // Despacho o Recolección
      if (!formData.tipoCliente) {
        setMessage("Debe seleccionar el tipo de cliente");
        return;
      }
    }

    if (!archivo) {
      setMessage("Debe adjuntar una foto o imagen");
      return;
    }

    try {
      setLoading(true);
      
      // Preparar datos para enviar (aquí puedes adaptar al endpoint que necesites)
      const solicitudData = new FormData();
      
      // Datos básicos
      solicitudData.append('nombre', formData.nombre);
      solicitudData.append('correo', formData.correo);
      solicitudData.append('telefono', formData.telefono || '');
      solicitudData.append('asunto', formData.asunto);
      solicitudData.append('descripcion', formData.descripcion);
      
      // Datos de logística
      solicitudData.append('area', formData.area);
      solicitudData.append('tipo_solicitud', formData.tipoSolicitud);
      solicitudData.append('tipo_formulario', 'logistica');
      
      // Agregar datos según el tipo de solicitud
      if (formData.tipoSolicitud === 'traslado') {
        solicitudData.append('origen_tipo_cliente', formData.origenTipoCliente);
        solicitudData.append('destino_tipo_cliente', formData.destinoTipoCliente);
        
        // Datos de origen
        if (formData.origenTipoCliente === 'externo') {
          solicitudData.append('origen_ciudad', formData.origenCiudad);
          solicitudData.append('origen_direccion', formData.origenDireccion);
          solicitudData.append('origen_cliente', formData.origenClienteNombre);
          solicitudData.append('origen_nit', formData.origenNit);
          solicitudData.append('origen_persona_contacto', formData.origenPersonaContacto);
          solicitudData.append('origen_numero_contacto', formData.origenNumeroContacto);
          solicitudData.append('origen_horario_recepcion', formData.origenHorarioRecepcion);
          solicitudData.append('origen_fecha_requerida', formData.origenFechaRequerida);
          solicitudData.append('origen_cantidad', formData.origenCantidad);
          solicitudData.append('origen_peso', formData.origenPeso);
          solicitudData.append('origen_volumen', formData.origenVolumen);
          solicitudData.append('origen_valor_declarado', formData.origenValorDeclarado);
        } else {
          solicitudData.append('origen_ciudad', formData.origenCiudadInterna);
          solicitudData.append('origen_tienda', formData.origenTienda);
          solicitudData.append('origen_fecha_requerida', formData.origenFechaRequerida);
          solicitudData.append('origen_cantidad', formData.origenCantidad);
          solicitudData.append('origen_peso', formData.origenPeso);
          solicitudData.append('origen_volumen', formData.origenVolumen);
          solicitudData.append('origen_valor_declarado', formData.origenValorDeclarado);
        }
        
        // Datos de destino
        if (formData.destinoTipoCliente === 'externo') {
          solicitudData.append('destino_ciudad', formData.destinoCiudad);
          solicitudData.append('destino_direccion', formData.destinoDireccion);
          solicitudData.append('destino_cliente', formData.destinoClienteNombre);
          solicitudData.append('destino_nit', formData.destinoNit);
          solicitudData.append('destino_persona_contacto', formData.destinoPersonaContacto);
          solicitudData.append('destino_numero_contacto', formData.destinoNumeroContacto);
          solicitudData.append('destino_horario_recepcion', formData.destinoHorarioRecepcion);
          solicitudData.append('destino_fecha_requerida', formData.destinoFechaRequerida);
          solicitudData.append('destino_cantidad', formData.destinoCantidad);
          solicitudData.append('destino_peso', formData.destinoPeso);
          solicitudData.append('destino_volumen', formData.destinoVolumen);
          solicitudData.append('destino_valor_declarado', formData.destinoValorDeclarado);
        } else {
          solicitudData.append('destino_ciudad', formData.destinoCiudadInterna);
          solicitudData.append('destino_tienda', formData.destinoTienda);
          solicitudData.append('destino_fecha_requerida', formData.destinoFechaRequerida);
          solicitudData.append('destino_cantidad', formData.destinoCantidad);
          solicitudData.append('destino_peso', formData.destinoPeso);
          solicitudData.append('destino_volumen', formData.destinoVolumen);
          solicitudData.append('destino_valor_declarado', formData.destinoValorDeclarado);
        }
      } else {
        // Despacho o Recolección (solo destino)
        solicitudData.append('tipo_cliente', formData.tipoCliente);
        
        if (formData.tipoCliente === 'externo') {
          solicitudData.append('ciudad', formData.destinoCiudad);
          solicitudData.append('direccion', formData.destinoDireccion);
          solicitudData.append('cliente', formData.destinoClienteNombre);
          solicitudData.append('nit', formData.destinoNit);
          solicitudData.append('persona_contacto', formData.destinoPersonaContacto);
          solicitudData.append('numero_contacto', formData.destinoNumeroContacto);
          solicitudData.append('horario_recepcion', formData.destinoHorarioRecepcion);
          solicitudData.append('fecha_requerida', formData.destinoFechaRequerida);
          solicitudData.append('cantidad', formData.destinoCantidad);
          solicitudData.append('peso', formData.destinoPeso);
          solicitudData.append('volumen', formData.destinoVolumen);
          solicitudData.append('valor_declarado', formData.destinoValorDeclarado);
        } else {
          solicitudData.append('ciudad', formData.destinoCiudadInterna);
          solicitudData.append('tienda', formData.destinoTienda);
          solicitudData.append('fecha_requerida', formData.destinoFechaRequerida);
          solicitudData.append('cantidad', formData.destinoCantidad);
          solicitudData.append('peso', formData.destinoPeso);
          solicitudData.append('volumen', formData.destinoVolumen);
          solicitudData.append('valor_declarado', formData.destinoValorDeclarado);
        }
      }

      if (archivo) {
        solicitudData.append('archivo', archivo);
      }

      // Por ahora usar el endpoint de solicitudes genérico
      // Puedes crear un endpoint específico para logística en el futuro
      const response = await fetch(`${FASTAPI_BASE_URL}/solicitudes`, {
        method: 'POST',
        body: solicitudData,
      });

      if (response.ok) {
        const result = await response.json();
        const folio = result.data?.folio || result.folio || result.data?.id || result.id;
        
        const ahora = new Date();
        const fecha = ahora.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        const hora = ahora.toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        const datosModalExito: SolicitudData = {
          id: folio?.toString() || 'Sin número',
          fecha,
          hora,
          asunto: formData.asunto,
          categoria: 'Logística',
          subcategoria: formData.tipoSolicitud.charAt(0).toUpperCase() + formData.tipoSolicitud.slice(1),
          zona: areasLogistica.find(a => String(a.id) === String(formData.area))?.nombre || formData.area,
          ciudad: formData.tipoSolicitud === 'traslado' 
            ? `${formData.origenCiudad || formData.origenCiudadInterna} → ${formData.destinoCiudad || formData.destinoCiudadInterna}`
            : formData.destinoCiudad || formData.destinoCiudadInterna || 'N/A',
          tienda: formData.tipoSolicitud === 'traslado'
            ? `${formData.origenTienda || formData.origenClienteNombre || 'N/A'} → ${formData.destinoTienda || formData.destinoClienteNombre || 'N/A'}`
            : formData.destinoTienda || formData.destinoClienteNombre || 'N/A',
          nombre: formData.nombre,
          correo: formData.correo,
          telefono: formData.telefono,
          descripcion: formData.descripcion,
          nextSteps: 'Su solicitud de logística será revisada por el equipo correspondiente. Recibirá una notificación cuando sea procesada.'
        };

        setSolicitudExitosa(datosModalExito);
        setMostrarModalExito(true);
        
        // Limpiar formulario
        setFormData({
          nombre: "", correo: "", telefono: "", asunto: "", descripcion: "",
          area: "", tipoSolicitud: "", tipoCliente: "",
          origenTipoCliente: "", origenCiudad: "", origenDireccion: "", origenClienteNombre: "",
          origenNit: "", origenPersonaContacto: "", origenNumeroContacto: "", origenHorarioRecepcion: "",
          origenFechaRequerida: "", origenCantidad: "", origenPeso: "", origenVolumen: "", origenValorDeclarado: "",
          origenCiudadInterna: "", origenTienda: "",
          destinoTipoCliente: "", destinoCiudad: "", destinoDireccion: "", destinoClienteNombre: "",
          destinoNit: "", destinoPersonaContacto: "", destinoNumeroContacto: "", destinoHorarioRecepcion: "",
          destinoFechaRequerida: "", destinoCantidad: "", destinoPeso: "", destinoVolumen: "", destinoValorDeclarado: "",
          destinoCiudadInterna: "", destinoTienda: "",
        });
        setArchivo(null);
        setMessage("");
      } else {
        const errorData = await response.json();
        setMessage(`Error: ${errorData.detail || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error enviando solicitud:', error);
      setMessage("Error de conexión. Por favor intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // Determinar qué tipo de cliente usar para renderizar campos
  const tipoClienteActivo = formData.tipoSolicitud === 'traslado' 
    ? { origen: formData.origenTipoCliente, destino: formData.destinoTipoCliente }
    : { destino: formData.tipoCliente };

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
          <CardHeader className="bg-gradient-to-r from-[#00B0B2]/10 to-[#0C6659]/10 border-b border-[#00B0B2]/20">
            <CardTitle className="text-2xl font-bold text-[#333231] text-center">Solicitud Logística</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ============ CAMPOS BÁSICOS ============ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-[#333231] font-medium">
                    Nombre *
                  </Label>
                  <Input 
                    id="nombre" 
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
                    value={formData.asunto}
                    onChange={(e) => handleInputChange('asunto', e.target.value)}
                    required 
                    className="border-[#00B0B2]/30 focus:border-[#00B0B2]" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion" className="text-[#333231] font-medium">
                  Descripción del Producto *
                </Label>
                <Textarea
                  id="descripcion"
                  rows={4}
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange('descripcion', e.target.value)}
                  placeholder="Describe detalladamente el producto que será despachado, recolectado o trasladado..."
                  required
                  className="border-[#00B0B2]/30 focus:border-[#00B0B2] placeholder:text-gray-400 placeholder:italic"
                />
              </div>

              {/* ============ CAMPOS DE CONFIGURACIÓN PRINCIPAL ============ */}
              <div className="border-t border-[#00B0B2]/20 pt-4">
                <h3 className="text-lg font-semibold text-[#333231] mb-4">Configuración de Solicitud</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#333231] font-medium">Área *</Label>
                    <Select 
                      value={formData.area} 
                      onValueChange={(value) => handleInputChange('area', value)}
                      disabled={loadingAreas}
                    >
                      <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                        <SelectValue placeholder={loadingAreas ? "Cargando áreas..." : "-- Seleccione área --"} />
                      </SelectTrigger>
                      <SelectContent>
                        {areasLogistica.map((area) => (
                          <SelectItem key={area.id} value={String(area.id)}>
                            {area.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#333231] font-medium">Tipo de Solicitud *</Label>
                    <Select value={formData.tipoSolicitud} onValueChange={(value) => handleInputChange('tipoSolicitud', value)}>
                      <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                        <SelectValue placeholder="-- Seleccione tipo --" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposSolicitud.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cliente solo visible para Despacho y Recolección */}
                  {formData.tipoSolicitud && formData.tipoSolicitud !== 'traslado' && (
                    <div className="space-y-2">
                      <Label className="text-[#333231] font-medium">Cliente *</Label>
                      <Select value={formData.tipoCliente} onValueChange={(value) => handleInputChange('tipoCliente', value)}>
                        <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                          <SelectValue placeholder="-- Seleccione cliente --" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposCliente.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* ============ SECCIÓN ORIGEN (solo para Traslado) ============ */}
              {formData.tipoSolicitud === 'traslado' && (
                <div className="border-2 border-sky-300 rounded-lg p-4 bg-sky-50/50">
                  <h3 className="text-lg font-semibold text-[#333231] mb-4 flex items-center">
                    <span className="bg-sky-500 text-white px-3 py-1 rounded-md mr-2 text-sm">ORIGEN</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[#333231] font-medium">Tipo de Cliente *</Label>
                        <Select value={formData.origenTipoCliente} onValueChange={(value) => handleInputChange('origenTipoCliente', value)}>
                          <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2] bg-white">
                            <SelectValue placeholder="-- Seleccione --" />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposCliente.map((tipo) => (
                              <SelectItem key={tipo.value} value={tipo.value}>
                                {tipo.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* FRAME CLIENTE EXTERNO - ORIGEN */}
                    {formData.origenTipoCliente === 'externo' && (
                      <div className="border border-[#00B0B2]/30 rounded-lg p-4 bg-white space-y-4">
                        <p className="text-sm font-medium text-[#00B0B2]">Cliente externo</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Ciudad</Label>
                            <Input 
                              value={formData.origenCiudad} 
                              onChange={(e) => handleInputChange('origenCiudad', e.target.value)} 
                              placeholder="Ingrese ciudad"
                              className="border-[#00B0B2]/30 focus:border-[#00B0B2]" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Dirección</Label>
                            <Input value={formData.origenDireccion} onChange={(e) => handleInputChange('origenDireccion', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Cliente</Label>
                            <Input value={formData.origenClienteNombre} onChange={(e) => handleInputChange('origenClienteNombre', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">NIT</Label>
                            <Input value={formData.origenNit} onChange={(e) => handleInputChange('origenNit', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Persona de Contacto</Label>
                            <Input value={formData.origenPersonaContacto} onChange={(e) => handleInputChange('origenPersonaContacto', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Número de contacto</Label>
                            <Input value={formData.origenNumeroContacto} onChange={(e) => handleInputChange('origenNumeroContacto', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Horario de Recepción Permitido</Label>
                            <Input value={formData.origenHorarioRecepcion} onChange={(e) => handleInputChange('origenHorarioRecepcion', e.target.value)} placeholder="Ej: 8:00 AM - 5:00 PM" className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Fecha requerida de despacho</Label>
                            <Input type="date" value={formData.origenFechaRequerida} onChange={(e) => handleInputChange('origenFechaRequerida', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Cantidad</Label>
                            <Input value={formData.origenCantidad} onChange={(e) => handleInputChange('origenCantidad', e.target.value)} placeholder="Ej: 10 unidades" className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Peso</Label>
                            <Input value={formData.origenPeso} onChange={(e) => handleInputChange('origenPeso', e.target.value)} placeholder="Ej: 50 kg" className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Volumen</Label>
                            <Input value={formData.origenVolumen} onChange={(e) => handleInputChange('origenVolumen', e.target.value)} placeholder="Ej: 2 m³" className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[#333231] font-medium">VALOR DECLARADO</Label>
                          <Input value={formData.origenValorDeclarado} onChange={(e) => handleInputChange('origenValorDeclarado', e.target.value)} placeholder="$ 0.00" className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                        </div>
                      </div>
                    )}

                    {/* FRAME CLIENTE INTERNO - ORIGEN */}
                    {formData.origenTipoCliente === 'interno' && (
                      <div className="border border-[#00B0B2]/30 rounded-lg p-4 bg-white space-y-4">
                        <p className="text-sm font-medium text-[#00B0B2]">Cliente interno</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Ciudad</Label>
                            <Select 
                              value={formData.origenCiudadInterna} 
                              onValueChange={handleCiudadOrigenChange}
                              disabled={loadingData || loadingCiudadesOrigen}
                            >
                              <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                                <SelectValue placeholder={loadingData ? "Cargando..." : "Seleccione ciudad"} />
                              </SelectTrigger>
                              <SelectContent>
                                {ciudadesOrigen.map((ciudad) => (
                                  <SelectItem key={ciudad.id} value={ciudad.id.toString()}>
                                    {ciudad.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Tienda</Label>
                            <Select 
                              value={formData.origenTienda} 
                              onValueChange={(value) => handleInputChange('origenTienda', value)}
                              disabled={!formData.origenCiudadInterna || loadingTiendasOrigen}
                            >
                              <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                                <SelectValue placeholder={
                                  !formData.origenCiudadInterna 
                                    ? "Primero seleccione ciudad" 
                                    : loadingTiendasOrigen 
                                    ? "Cargando..." 
                                    : "Seleccione tienda"
                                } />
                              </SelectTrigger>
                              <SelectContent>
                                {tiendasOrigen.map((tienda) => (
                                  <SelectItem key={tienda.id} value={tienda.id.toString()}>
                                    {tienda.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Fecha requerida de despacho</Label>
                            <Input type="date" value={formData.origenFechaRequerida} onChange={(e) => handleInputChange('origenFechaRequerida', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Cantidad</Label>
                            <Input value={formData.origenCantidad} onChange={(e) => handleInputChange('origenCantidad', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Peso</Label>
                            <Input value={formData.origenPeso} onChange={(e) => handleInputChange('origenPeso', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Volumen</Label>
                            <Input value={formData.origenVolumen} onChange={(e) => handleInputChange('origenVolumen', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[#333231] font-medium">VALOR DECLARADO</Label>
                          <Input value={formData.origenValorDeclarado} onChange={(e) => handleInputChange('origenValorDeclarado', e.target.value)} placeholder="$ 0.00" className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============ SECCIÓN DESTINO (para todos los tipos) ============ */}
              {(formData.tipoSolicitud === 'despacho' || formData.tipoSolicitud === 'recoleccion' || formData.tipoSolicitud === 'traslado') && 
               ((formData.tipoSolicitud !== 'traslado' && formData.tipoCliente) || (formData.tipoSolicitud === 'traslado')) && (
                <div className="border-2 border-[#00B0B2] rounded-lg p-4 bg-cyan-50/50">
                  <h3 className="text-lg font-semibold text-[#333231] mb-4 flex items-center">
                    <span className="bg-[#00B0B2] text-white px-3 py-1 rounded-md mr-2 text-sm">DESTINO</span>
                  </h3>
                  
                  <div className="space-y-4">
                    {formData.tipoSolicitud === 'traslado' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[#333231] font-medium">Tipo de Cliente *</Label>
                          <Select value={formData.destinoTipoCliente} onValueChange={(value) => handleInputChange('destinoTipoCliente', value)}>
                            <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2] bg-white">
                              <SelectValue placeholder="-- Seleccione --" />
                            </SelectTrigger>
                            <SelectContent>
                              {tiposCliente.map((tipo) => (
                                <SelectItem key={tipo.value} value={tipo.value}>
                                  {tipo.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* FRAME CLIENTE EXTERNO - DESTINO */}
                    {((formData.tipoSolicitud !== 'traslado' && formData.tipoCliente === 'externo') || 
                      (formData.tipoSolicitud === 'traslado' && formData.destinoTipoCliente === 'externo')) && (
                      <div className="border border-[#00B0B2]/30 rounded-lg p-4 bg-white space-y-4">
                        <p className="text-sm font-medium text-[#00B0B2]">Cliente externo</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Ciudad</Label>
                            <Input 
                              value={formData.destinoCiudad} 
                              onChange={(e) => handleInputChange('destinoCiudad', e.target.value)} 
                              placeholder="Ingrese ciudad"
                              className="border-[#00B0B2]/30 focus:border-[#00B0B2]" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Dirección</Label>
                            <Input value={formData.destinoDireccion} onChange={(e) => handleInputChange('destinoDireccion', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Cliente</Label>
                            <Input value={formData.destinoClienteNombre} onChange={(e) => handleInputChange('destinoClienteNombre', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">NIT</Label>
                            <Input value={formData.destinoNit} onChange={(e) => handleInputChange('destinoNit', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Persona de Contacto</Label>
                            <Input value={formData.destinoPersonaContacto} onChange={(e) => handleInputChange('destinoPersonaContacto', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Número de contacto</Label>
                            <Input value={formData.destinoNumeroContacto} onChange={(e) => handleInputChange('destinoNumeroContacto', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">
                              {formData.tipoSolicitud === 'recoleccion' ? 'Horario de Recolección Permitido' : 'Horario de Recepción Permitido'}
                            </Label>
                            <Input value={formData.destinoHorarioRecepcion} onChange={(e) => handleInputChange('destinoHorarioRecepcion', e.target.value)} placeholder="Ej: 8:00 AM - 5:00 PM" className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">
                              {formData.tipoSolicitud === 'recoleccion' ? 'Fecha requerida de recolección' : 'Fecha requerida de despacho'}
                            </Label>
                            <Input type="date" value={formData.destinoFechaRequerida} onChange={(e) => handleInputChange('destinoFechaRequerida', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Cantidad</Label>
                            <Input value={formData.destinoCantidad} onChange={(e) => handleInputChange('destinoCantidad', e.target.value)} placeholder="Ej: 10 unidades" className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Peso</Label>
                            <Input value={formData.destinoPeso} onChange={(e) => handleInputChange('destinoPeso', e.target.value)} placeholder="Ej: 50 kg" className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Volumen</Label>
                            <Input value={formData.destinoVolumen} onChange={(e) => handleInputChange('destinoVolumen', e.target.value)} placeholder="Ej: 2 m³" className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[#333231] font-medium">VALOR DECLARADO</Label>
                          <Input value={formData.destinoValorDeclarado} onChange={(e) => handleInputChange('destinoValorDeclarado', e.target.value)} placeholder="$ 0.00" className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                        </div>
                      </div>
                    )}

                    {/* FRAME CLIENTE INTERNO - DESTINO */}
                    {((formData.tipoSolicitud !== 'traslado' && formData.tipoCliente === 'interno') || 
                      (formData.tipoSolicitud === 'traslado' && formData.destinoTipoCliente === 'interno')) && (
                      <div className="border border-[#00B0B2]/30 rounded-lg p-4 bg-white space-y-4">
                        <p className="text-sm font-medium text-[#00B0B2]">Cliente interno</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Ciudad</Label>
                            <Select 
                              value={formData.destinoCiudadInterna} 
                              onValueChange={handleCiudadDestinoChange}
                              disabled={loadingData || loadingCiudadesDestino}
                            >
                              <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                                <SelectValue placeholder={loadingData ? "Cargando..." : "Seleccione ciudad"} />
                              </SelectTrigger>
                              <SelectContent>
                                {ciudadesDestino.map((ciudad) => (
                                  <SelectItem key={ciudad.id} value={ciudad.id.toString()}>
                                    {ciudad.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Tienda</Label>
                            <Select 
                              value={formData.destinoTienda} 
                              onValueChange={(value) => handleInputChange('destinoTienda', value)}
                              disabled={!formData.destinoCiudadInterna || loadingTiendasDestino}
                            >
                              <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                                <SelectValue placeholder={
                                  !formData.destinoCiudadInterna 
                                    ? "Primero seleccione ciudad" 
                                    : loadingTiendasDestino 
                                    ? "Cargando..." 
                                    : "Seleccione tienda"
                                } />
                              </SelectTrigger>
                              <SelectContent>
                                {tiendasDestino.map((tienda) => (
                                  <SelectItem key={tienda.id} value={tienda.id.toString()}>
                                    {tienda.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">
                              {formData.tipoSolicitud === 'recoleccion' ? 'Fecha requerida de recolección' : 'Fecha requerida de despacho'}
                            </Label>
                            <Input type="date" value={formData.destinoFechaRequerida} onChange={(e) => handleInputChange('destinoFechaRequerida', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Cantidad</Label>
                            <Input value={formData.destinoCantidad} onChange={(e) => handleInputChange('destinoCantidad', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Peso</Label>
                            <Input value={formData.destinoPeso} onChange={(e) => handleInputChange('destinoPeso', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[#333231] font-medium">Volumen</Label>
                            <Input value={formData.destinoVolumen} onChange={(e) => handleInputChange('destinoVolumen', e.target.value)} className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[#333231] font-medium">VALOR DECLARADO</Label>
                          <Input value={formData.destinoValorDeclarado} onChange={(e) => handleInputChange('destinoValorDeclarado', e.target.value)} placeholder="$ 0.00" className="border-[#00B0B2]/30 focus:border-[#00B0B2]" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============ ARCHIVO ADJUNTO ============ */}
              <div className="space-y-2">
                <Label htmlFor="archivo" className="text-[#333231] font-medium">
                  Archivos adjuntos *
                </Label>
                <div className="flex justify-center">
                  <div className="relative w-full max-w-md">
                    <input
                      id="archivo"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full h-12 border-2 border-[#00B0B2]/30 rounded-lg bg-white text-[#333231] flex items-center justify-center cursor-pointer hover:border-[#00B0B2] transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="bg-[#00B0B2] hover:bg-[#0C6659] text-white px-4 py-2 rounded-md font-medium text-sm transition-colors">
                          Elegir archivo
                        </div>
                        <span className="text-[#333231] text-sm">
                          {archivo ? archivo.name : "Ningún archivo seleccionado"}
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

              {/* ============ MENSAJE Y BOTÓN ============ */}
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
          </CardContent>
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
