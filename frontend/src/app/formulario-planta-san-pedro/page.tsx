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

// Interfaces para los datos
interface Planta {
  id: number;
  nombre: string;
  codigo: string;
  activa?: boolean;
}

interface Activo {
  id: number;
  nombre: string;
  codigo: string;
  planta_id: number;
  activo?: boolean;
}

interface Categoria {
  id: number;
  nombre: string;
  codigo: string;
  activa?: boolean;
}

interface Subcategoria {
  id: number;
  nombre: string;
  codigo: string;
  categoria_id: number;
  activa?: boolean;
}

export default function FormularioPlantaSanPedro() {
  // Estados para los datos dinámicos
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [activos, setActivos] = useState<Activo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  
  // Estados de carga
  const [loadingPlantas, setLoadingPlantas] = useState(true);
  const [loadingActivos, setLoadingActivos] = useState(false);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [loadingSubcategorias, setLoadingSubcategorias] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    asunto: "",
    descripcion: "",
    planta: "",
    activo: "",
    categoria: "",
    subcategoria: "",
  });


  
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // Estado para controlar si el campo descripción ha sido tocado
  const [descripcionTouched, setDescripcionTouched] = useState(false);
  
  // Estados para el modal de éxito
  const [mostrarModalExito, setMostrarModalExito] = useState(false);
  const [solicitudExitosa, setSolicitudExitosa] = useState<SolicitudData | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      setLoadingPlantas(true);
      setLoadingCategorias(true);
      
      // Cargar plantas desde el endpoint dinámico
      try {
        const plantasRes = await fetch(`${FASTAPI_BASE_URL}/autogestion/plantas`);
        if (plantasRes.ok) {
          const plantasData = await plantasRes.json();
          // Filtrar solo plantas activas
          const plantasActivas = plantasData.filter((planta: Planta) => planta.activa !== false);
          setPlantas(plantasActivas);
          console.log('✅ Plantas cargadas:', plantasActivas.length);
        } else {
          console.error('Error cargando plantas:', plantasRes.status);
        }
      } catch (error) {
        console.error('Error en fetch plantas:', error);
      } finally {
        setLoadingPlantas(false);
      }
      
      // Cargar categorías específicas de Planta San Pedro
      try {
        const categoriasRes = await fetch(`${FASTAPI_BASE_URL}/autogestion/planta-categorias`);
        if (categoriasRes.ok) {
          const categoriasData = await categoriasRes.json();
          // Filtrar solo categorías activas
          const categoriasActivas = categoriasData.filter((categoria: Categoria) => categoria.activa !== false);
          setCategorias(categoriasActivas);
          console.log('✅ Categorías de Planta San Pedro cargadas:', categoriasActivas.length);
        } else {
          console.error('Error cargando categorías de Planta San Pedro:', categoriasRes.status);
        }
      } catch (error) {
        console.error('Error en fetch categorías de Planta San Pedro:', error);
      } finally {
        setLoadingCategorias(false);
      }

    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      setMessage("Error cargando los datos del formulario");
    }
  };

  // Cargar activos cuando se selecciona una planta
  const handlePlantaChange = async (plantaId: string) => {
    setFormData(prev => ({
      ...prev,
      planta: plantaId,
      activo: "" // Solo limpiar activo para cargar los nuevos
    }));
    
    if (!plantaId) {
      setActivos([]);
      return;
    }

    try {
      setLoadingActivos(true);
      
      // Cargar activos desde el endpoint dinámico
      const activosRes = await fetch(`${FASTAPI_BASE_URL}/autogestion/activos`);
      if (activosRes.ok) {
        const activosData = await activosRes.json();
        // Filtrar activos por planta y que estén activos
        const activosFiltrados = activosData.filter((activo: Activo) => 
          activo.planta_id.toString() === plantaId && activo.activo !== false
        );
        setActivos(activosFiltrados);
        console.log(`✅ Activos cargados para planta ${plantaId}:`, activosFiltrados.length);
      } else {
        console.error('Error cargando activos:', activosRes.status);
        setActivos([]);
      }
      
    } catch (error) {
      console.error('Error cargando activos:', error);
      setMessage("Error cargando los activos");
      setActivos([]);
    } finally {
      setLoadingActivos(false);
    }
  };

  // Cargar subcategorías cuando se selecciona una categoría
  const handleCategoriaChange = async (categoriaId: string) => {
    setFormData(prev => ({
      ...prev,
      categoria: categoriaId,
      subcategoria: "" // Solo limpiar subcategoría para cargar las nuevas
    }));
    
    if (!categoriaId) {
      setSubcategorias([]);
      return;
    }

    try {
      setLoadingSubcategorias(true);
      const response = await fetch(`${FASTAPI_BASE_URL}/autogestion/planta-subcategorias`);
      
      if (response.ok) {
        const subcategoriasData = await response.json();
        // Filtrar subcategorías por categoría y que estén activas
        const subcategoriasFiltradas = subcategoriasData.filter((subcategoria: Subcategoria) => 
          subcategoria.categoria_id.toString() === categoriaId && subcategoria.activa !== false
        );
        setSubcategorias(subcategoriasFiltradas);
        console.log(`✅ Subcategorías de Planta San Pedro cargadas para categoría ${categoriaId}:`, subcategoriasFiltradas.length);
      } else {
        console.error('Error cargando subcategorías de Planta San Pedro:', response.status);
        setSubcategorias([]);
      }
    } catch (error) {
      console.error('Error cargando subcategorías de Planta San Pedro:', error);
      setSubcategorias([]);
    } finally {
      setLoadingSubcategorias(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field === 'planta') {
      handlePlantaChange(value as string);
    } else if (field === 'categoria') {
      handleCategoriaChange(value as string);
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0]; // Solo tomar el primer archivo
    
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
    setMessage(""); // Limpiar mensaje de error
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validar campos básicos
    if (!formData.nombre || !formData.correo || !formData.asunto || !formData.descripcion) {
      setMessage("Por favor complete todos los campos obligatorios básicos");
      return;
    }

    // Validar que se haya seleccionado al menos una planta
    if (!formData.planta) {
      setMessage("Debe seleccionar una planta");
      return;
    }

    if (!archivo) {
      setMessage("Debe adjuntar una foto o imagen");
      return;
    }

    try {
      setLoading(true);
      
      // Obtener nombres en lugar de IDs para la compatibilidad con el backend actual
      const plantaSeleccionada = plantas.find(p => p.id.toString() === formData.planta);
      const activoSeleccionado = activos.find(a => a.id.toString() === formData.activo);
      const categoriaSeleccionada = categorias.find(c => c.id.toString() === formData.categoria);
      const subcategoriaSeleccionada = subcategorias.find(s => s.id.toString() === formData.subcategoria);

      const solicitudData = new FormData();
      
      // Datos básicos
      solicitudData.append('nombre', formData.nombre);
      solicitudData.append('correo', formData.correo);
      solicitudData.append('telefono', formData.telefono || '');
      solicitudData.append('asunto', formData.asunto);
      solicitudData.append('descripcion', formData.descripcion);
      
      // Datos específicos de planta
      solicitudData.append('planta', plantaSeleccionada?.nombre || '');
      solicitudData.append('activo', activoSeleccionado?.nombre || '');
      solicitudData.append('categoria', categoriaSeleccionada?.nombre || '');
      solicitudData.append('subcategoria', subcategoriaSeleccionada?.nombre || '');
      
      // Agregar tipo de formulario para diferenciar en el backend
      solicitudData.append('tipo_formulario', 'planta_san_pedro');

      // Agregar archivo con el nombre correcto para Planta San Pedro
      // El backend espera archivo_0, archivo_1, etc. para múltiples archivos
      if (archivo) {
        solicitudData.append('archivo_0', archivo);
      }

      // Por ahora usar el mismo endpoint, luego se puede crear uno específico
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
          zona: 'Planta San Pedro', // Usar zona como planta para compatibilidad
          ciudad: plantaSeleccionada?.nombre || 'Sin planta',
          tienda: activoSeleccionado?.nombre || 'Sin activo', // Usar tienda para mostrar activo
          nombre: formData.nombre,
          correo: formData.correo,
          telefono: formData.telefono,
          descripcion: formData.descripcion,
          nextSteps: 'Su solicitud de Planta San Pedro será revisada por el equipo de producción. Recibirá una notificación cuando sea asignada a un técnico especializado.'
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
          planta: "",
          activo: "",
          categoria: "",
          subcategoria: "",
        });
        setArchivo(null);
        setActivos([]);
        setSubcategorias([]);
        setDescripcionTouched(false); // Resetear estado del placeholder
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

  if (loadingPlantas && loadingCategorias) {
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
            <CardTitle className="text-2xl font-bold text-[#333231] text-center">Solicitud Planta San Pedro</CardTitle>
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
                  placeholder={!descripcionTouched && !formData.descripcion ? 
                    "Si selecciona una categoría, ya sea de Mantenimiento (MTTO) o TIC, por favor indique el origen: administrativo planta, administrativo producción o desde el CEDI, para ubicar mejor su solicitud." : 
                    ""}
                  onChange={(e) => {
                    handleInputChange('descripcion', e.target.value);
                    if (!descripcionTouched) {
                      setDescripcionTouched(true);
                    }
                  }}
                  onFocus={() => {
                    if (!descripcionTouched) {
                      setDescripcionTouched(true);
                    }
                  }}
                  required
                  className="border-[#00B0B2]/30 focus:border-[#00B0B2] placeholder:text-gray-400 placeholder:text-sm placeholder:font-light placeholder:italic"
                />
              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#333231] font-medium">
                    Área *
                  </Label>
                  <Select 
                    value={formData.planta} 
                    onValueChange={handlePlantaChange} 
                    disabled={loadingPlantas}
                  >
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder={
                        loadingPlantas ? "Cargando plantas..." : "-- Seleccione una planta --"
                      } />
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

                <div className="space-y-2">
                  <Label className="text-[#333231] font-medium">
                    Activo
                  </Label>
                  <Select 
                    value={formData.activo} 
                    onValueChange={(value) => handleInputChange('activo', value)} 
                    disabled={!formData.planta || loadingActivos}
                  >
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder={
                        loadingActivos ? "Cargando activos..." : 
                        !formData.planta ? "Seleccione primero una planta" : 
                        "Seleccione un activo"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {activos.map((activo) => (
                        <SelectItem key={activo.id} value={activo.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{activo.nombre}</span>
                            {activo.codigo && <span className="text-xs text-gray-500">Código: {activo.codigo}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#333231] font-medium">
                    Categoría
                  </Label>
                  <Select 
                    value={formData.categoria} 
                    onValueChange={handleCategoriaChange} 
                    disabled={loadingCategorias}
                  >
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder={
                        loadingCategorias ? "Cargando categorías..." : "-- Seleccione una categoría --"
                      } />
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
                  <Label className="text-[#333231] font-medium">
                    Subcategoría
                  </Label>
                  <Select 
                    value={formData.subcategoria} 
                    onValueChange={(value) => handleInputChange('subcategoria', value)} 
                    disabled={!formData.categoria || loadingSubcategorias}
                  >
                    <SelectTrigger className="border-[#00B0B2]/30 focus:border-[#00B0B2]">
                      <SelectValue placeholder={
                        loadingSubcategorias ? "Cargando..." : 
                        !formData.categoria ? "Seleccione primero una categoría" : 
                        "-- Seleccione una subcategoría --"
                      } />
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
