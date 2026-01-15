"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { SolicitudExitosaModal, type SolicitudData } from "@/components/SolicitudExitosaModal"

// Configuración de FastAPI únicamente
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'http://localhost:8001/api/v1';

// Interfaces para el sistema dinámico
interface Zona {
  id: number;
  nombre: string;
  codigo: string;
  ciudades?: Ciudad[];
}

interface Ciudad {
  id: number;
  nombre: string;
  codigo: string;
  zona_id: number;
  tiendas?: Tienda[];
}

interface Tienda {
  id: number;
  nombre: string;
  codigo: string;
  ciudad_id: number;
  direccion?: string;
}

interface Categoria {
  id: number;
  nombre: string;
  codigo: string;
  subcategorias?: Subcategoria[];
}

interface Subcategoria {
  id: number;
  nombre: string;
  codigo: string;
  categoria_id: number;
}

export default function FormularioB2C() {
  // Estados para los datos dinámicos
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  
  // Estados de carga
  const [loadingData, setLoadingData] = useState(true);
  const [loadingCiudades, setLoadingCiudades] = useState(false);
  const [loadingTiendas, setLoadingTiendas] = useState(false);
  const [loadingSubcategorias, setLoadingSubcategorias] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    asunto: "",
    descripcion: "",
    zona: "",
    ciudad: "",
    tienda: "",
    categoria: "",
    subcategoria: "",
  });
  
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // Estados para el modal de éxito
  const [mostrarModalExito, setMostrarModalExito] = useState(false);
  const [solicitudExitosa, setSolicitudExitosa] = useState<SolicitudData | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      setLoadingData(true);
      
      // Cargar zonas y categorías en paralelo
      const [zonasRes, categoriasRes] = await Promise.all([
        fetch(`${FASTAPI_BASE_URL}/organizaciones/zonas`),
        fetch(`${FASTAPI_BASE_URL}/organizaciones/categorias`)
      ]);

      if (zonasRes.ok) {
        const zonasData = await zonasRes.json();
        setZonas(zonasData);
      }

      if (categoriasRes.ok) {
        const categoriasData = await categoriasRes.json();
        setCategorias(categoriasData);
      }

    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      setMessage("Error cargando los datos del formulario");
    } finally {
      setLoadingData(false);
    }
  };

  // Cargar ciudades cuando se selecciona una zona
  const handleZonaChange = async (zonaId: string) => {
    setFormData(prev => ({
      ...prev,
      zona: zonaId,
      ciudad: "",
      tienda: ""
    }));
    
    if (!zonaId) {
      setCiudades([]);
      setTiendas([]);
      return;
    }

    try {
      setLoadingCiudades(true);
      const response = await fetch(`${FASTAPI_BASE_URL}/organizaciones/ciudades?zona_id=${zonaId}`);
      
      if (response.ok) {
        const ciudadesData = await response.json();
        setCiudades(ciudadesData);
        setTiendas([]); // Limpiar tiendas
      }
    } catch (error) {
      console.error('Error cargando ciudades:', error);
    } finally {
      setLoadingCiudades(false);
    }
  };

  // Cargar tiendas cuando se selecciona una ciudad
  const handleCiudadChange = async (ciudadId: string) => {
    setFormData(prev => ({
      ...prev,
      ciudad: ciudadId,
      tienda: ""
    }));
    
    if (!ciudadId) {
      setTiendas([]);
      return;
    }

    try {
      setLoadingTiendas(true);
      const response = await fetch(`${FASTAPI_BASE_URL}/organizaciones/tiendas?ciudad_id=${ciudadId}`);
      
      if (response.ok) {
        const tiendasData = await response.json();
        setTiendas(tiendasData);
      }
    } catch (error) {
      console.error('Error cargando tiendas:', error);
    } finally {
      setLoadingTiendas(false);
    }
  };

  // Cargar subcategorías cuando se selecciona una categoría
  const handleCategoriaChange = async (categoriaId: string) => {
    setFormData(prev => ({
      ...prev,
      categoria: categoriaId,
      subcategoria: ""
    }));
    
    if (!categoriaId) {
      setSubcategorias([]);
      return;
    }

    try {
      setLoadingSubcategorias(true);
      const response = await fetch(`${FASTAPI_BASE_URL}/organizaciones/subcategorias?categoria_id=${categoriaId}`);
      
      if (response.ok) {
        const subcategoriasData = await response.json();
        setSubcategorias(subcategoriasData);
      }
    } catch (error) {
      console.error('Error cargando subcategorías:', error);
    } finally {
      setLoadingSubcategorias(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setArchivo(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validar campos obligatorios básicos
    if (!formData.nombre || !formData.correo || !formData.asunto || !formData.descripcion) {
      setMessage("Por favor complete todos los campos obligatorios básicos");
      return;
    }

    // Validar campos de ubicación obligatorios
    if (!formData.zona || !formData.ciudad || !formData.tienda) {
      setMessage("Por favor complete todos los campos de ubicación: Zona, Ciudad y Tienda");
      return;
    }

    // Validar campos de categorización obligatorios
    if (!formData.categoria || !formData.subcategoria) {
      setMessage("Por favor complete los campos de Categoría y Subcategoría");
      return;
    }

    // Validar archivo obligatorio
    if (!archivo) {
      setMessage("Por favor adjunte una foto o imagen");
      return;
    }

    try {
      setLoading(true);
      
      // Obtener nombres en lugar de IDs para la compatibilidad con el backend actual
      const zonaSeleccionada = zonas.find(z => z.id.toString() === formData.zona);
      const ciudadSeleccionada = ciudades.find(c => c.id.toString() === formData.ciudad);
      const tiendaSeleccionada = tiendas.find(t => t.id.toString() === formData.tienda);
      const categoriaSeleccionada = categorias.find(c => c.id.toString() === formData.categoria);
      const subcategoriaSeleccionada = subcategorias.find(s => s.id.toString() === formData.subcategoria);

      const solicitudData = new FormData();
      
      // Datos básicos
      solicitudData.append('nombre', formData.nombre);
      solicitudData.append('correo', formData.correo);
      solicitudData.append('telefono', formData.telefono || '');
      solicitudData.append('asunto', formData.asunto);
      solicitudData.append('descripcion', formData.descripcion);
      
      // Datos de ubicación y categoría (usando nombres para compatibilidad)
      solicitudData.append('zona', zonaSeleccionada?.nombre || '');
      solicitudData.append('ciudad', ciudadSeleccionada?.nombre || '');
      solicitudData.append('tienda', tiendaSeleccionada?.nombre || '');
      solicitudData.append('categoria', categoriaSeleccionada?.nombre || '');
      solicitudData.append('subcategoria', subcategoriaSeleccionada?.nombre || '');

      if (archivo) {
        solicitudData.append('archivo', archivo);
      }

      const response = await fetch(`${FASTAPI_BASE_URL}/solicitudes`, {
        method: 'POST',
        body: solicitudData,
      });

      if (response.ok) {
        const result = await response.json();
        const folio = result.data?.folio || result.folio || result.data?.id || result.id;
        
        // Crear fecha y hora actual
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

        // Preparar datos para el modal
        const datosModalExito: SolicitudData = {
          id: folio?.toString() || 'Sin número',
          fecha,
          hora,
          asunto: formData.asunto,
          categoria: categoriaSeleccionada?.nombre || 'Sin categoría',
          subcategoria: subcategoriaSeleccionada?.nombre || 'Sin subcategoría',
          zona: zonaSeleccionada?.nombre || 'Sin zona',
          ciudad: ciudadSeleccionada?.nombre || 'Sin ciudad',
          tienda: tiendaSeleccionada?.nombre || 'Sin tienda',
          nombre: formData.nombre,
          correo: formData.correo,
          telefono: formData.telefono,
          descripcion: formData.descripcion,
          nextSteps: 'Su solicitud será revisada por nuestro equipo técnico. Recibirá una notificación cuando sea asignada a un técnico especializado.'
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
          zona: "",
          ciudad: "",
          tienda: "",
          categoria: "",
          subcategoria: "",
        });
        setArchivo(null);
        setMessage(""); // Limpiar mensaje previo
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
          <CardHeader className="bg-gradient-to-r from-[#00B0B2]/10 to-[#0C6659]/10 border-b border-[#00B0B2]/20">
            <CardTitle className="text-2xl font-bold text-[#333231] text-center">Solicitud B2C</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
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
                  <Label className="text-[#333231] font-medium">Zona *</Label>
                  <Select value={formData.zona} onValueChange={handleZonaChange} required>
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder="-- Seleccione una zona --" />
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

                <div className="space-y-2">
                  <Label className="text-[#333231] font-medium">Ciudad *</Label>
                  <Select value={formData.ciudad} onValueChange={handleCiudadChange} disabled={!formData.zona || loadingCiudades} required>
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder={loadingCiudades ? "Cargando..." : "-- Seleccione una ciudad --"} />
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
                  <Label className="text-[#333231] font-medium">Tienda *</Label>
                  <Select value={formData.tienda} onValueChange={(value) => handleInputChange('tienda', value)} disabled={!formData.ciudad || loadingTiendas} required>
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder={loadingTiendas ? "Cargando..." : "-- Seleccione una tienda --"} />
                    </SelectTrigger>
                    <SelectContent>
                      {tiendas.map((tienda) => (
                        <SelectItem key={tienda.id} value={tienda.id.toString()}>
                          {tienda.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#333231] font-medium">Categoría *</Label>
                  <Select value={formData.categoria} onValueChange={handleCategoriaChange} required>
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder="-- Seleccione una categoría --" />
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

                <div className="space-y-2">
                  <Label className="text-[#333231] font-medium">Subcategoría *</Label>
                  <Select value={formData.subcategoria} onValueChange={(value) => handleInputChange('subcategoria', value)} disabled={!formData.categoria || loadingSubcategorias} required>
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder={loadingSubcategorias ? "Cargando..." : "-- Seleccione una subcategoría --"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategorias.map((subcategoria) => (
                        <SelectItem key={subcategoria.id} value={subcategoria.id.toString()}>
                          {subcategoria.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      accept="image/*"
                      onChange={handleFileChange}
                      required
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div
                      className={`
                      w-full h-12
                      border-2 ${archivo ? 'border-[#0C6659]' : 'border-[#00B0B2]/30'} rounded-lg
                      bg-white text-[#333231]
                      flex items-center justify-center
                      cursor-pointer
                      hover:border-[#00B0B2]
                      transition-colors
                    `}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`
                          ${archivo ? 'bg-[#0C6659]' : 'bg-[#00B0B2]'} hover:bg-[#0C6659] 
                          text-white px-4 py-2 rounded-md 
                          font-medium text-sm
                          transition-colors
                        `}
                        >
                          {archivo ? 'Cambiar archivo' : 'Elegir archivo'}
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
