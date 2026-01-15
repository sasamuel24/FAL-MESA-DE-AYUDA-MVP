"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PenTool, Trash2, Save, X, User, UserCheck } from "lucide-react"

// Configuración de FastAPI
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'http://localhost:8001/api/v1';

interface FirmaConformidadProps {
  otId?: number;
  onFirmaGuardada?: (firmaData: any) => void;
  firmaExistente?: any;
  disabled?: boolean;
}

export default function FirmaConformidad({ 
  otId, 
  onFirmaGuardada, 
  firmaExistente,
  disabled = false 
}: FirmaConformidadProps) {
  console.log('🔧 FirmaConformidad montado con:', { otId, disabled, firmaExistente });
  
  // Estados para los datos de la firma
  const [nombreTecnico, setNombreTecnico] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  
  // Estados para las firmas
  const [firmaTecnico, setFirmaTecnico] = useState('');
  const [firmaCliente, setFirmaCliente] = useState('');
  
  // Estados para los modales de firma
  const [mostrandoModalTecnico, setMostrandoModalTecnico] = useState(false);
  const [mostrandoModalCliente, setMostrandoModalCliente] = useState(false);
  
  // Estados para el canvas
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Estados para guardar
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  
  // Estados para cargar firmas existentes
  const [cargandoFirmas, setCargandoFirmas] = useState(false);
  const [firmasExistentes, setFirmasExistentes] = useState<any[]>([]);

  // Efecto para cargar firmas al montar el componente
  useEffect(() => {
    console.log('🔧 FirmaConformidad useEffect:', { otId, firmaExistente });
    if (otId) {
      console.log('🔄 FirmaConformidad: Cargando firmas desde API...');
      cargarFirmasExistentes();
    }
  }, [otId]);

  const cargarFirmasExistentes = async () => {
    console.log('🔄 FirmaConformidad: Cargando firmas existentes desde FastAPI para OT:', otId);
    setCargandoFirmas(true);
    try {
      const endpoint = `${FASTAPI_BASE_URL}/firmas-conformidad/?ot_id=${otId}`;
      console.log(`✅ FirmaConformidad: Cargando desde FastAPI: ${endpoint}`);
      
      const response = await fetch(endpoint);
      console.log('🔄 FirmaConformidad: Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔄 FirmaConformidad: Resultado completo:', result);
        
        if (result.success && result.data.length > 0) {
          console.log('✅ FirmaConformidad: Firmas encontradas:', result.data.length);
          setFirmasExistentes(result.data);
          
          // Cargar la primera firma encontrada
          const primeraFirma = result.data[0];
          console.log('📋 FirmaConformidad: Datos de la primera firma:');
          console.log(`   - nombre_tecnico: "${primeraFirma.nombre_tecnico || 'VACÍO'}"`);
          console.log(`   - nombre_cliente: "${primeraFirma.nombre_cliente || 'VACÍO'}"`);
          console.log(`   - firma_tecnico: ${primeraFirma.firma_tecnico ? `URL S3 (${primeraFirma.firma_tecnico.length} chars)` : 'VACÍO'}`);
          console.log(`   - firma_cliente: ${primeraFirma.firma_cliente ? `URL S3 (${primeraFirma.firma_cliente.length} chars)` : 'VACÍO'}`);
          
          // Actualizar estados
          setNombreTecnico(primeraFirma.nombre_tecnico || '');
          setNombreCliente(primeraFirma.nombre_cliente || '');
          setFirmaTecnico(primeraFirma.firma_tecnico || '');
          setFirmaCliente(primeraFirma.firma_cliente || '');
          
          console.log('✅ FirmaConformidad: Estados actualizados correctamente');
        } else {
          console.log('ℹ️ No se encontraron firmas para esta OT');
          setFirmasExistentes([]);
          // Limpiar estados si no hay firmas
          setNombreTecnico('');
          setNombreCliente('');
          setFirmaTecnico('');
          setFirmaCliente('');
        }
      } else {
        console.error('❌ Error en respuesta FastAPI:', response.status);
        const errorText = await response.text();
        console.error('📄 Texto de error:', errorText);
      }
    } catch (error) {
      console.error('❌ Error al cargar firmas existentes desde FastAPI:', error);
    } finally {
      setCargandoFirmas(false);
    }
  };

  // Funciones del canvas
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
    
    let x, y;
    if (e.type === 'mousedown') {
      const mouseEvent = e as React.MouseEvent<HTMLCanvasElement>;
      x = mouseEvent.clientX - rect.left;
      y = mouseEvent.clientY - rect.top;
    } else {
      const touchEvent = e as React.TouchEvent<HTMLCanvasElement>;
      x = touchEvent.touches[0].clientX - rect.left;
      y = touchEvent.touches[0].clientY - rect.top;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let x, y;
    if (e.type === 'mousemove') {
      const mouseEvent = e as React.MouseEvent<HTMLCanvasElement>;
      x = mouseEvent.clientX - rect.left;
      y = mouseEvent.clientY - rect.top;
    } else {
      const touchEvent = e as React.TouchEvent<HTMLCanvasElement>;
      x = touchEvent.touches[0].clientX - rect.left;
      y = touchEvent.touches[0].clientY - rect.top;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
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

  const guardarFirmaTecnico = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL('image/png');
    setFirmaTecnico(dataURL);
    setMostrandoModalTecnico(false);
    clearCanvas();
  };

  const guardarFirmaCliente = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL('image/png');
    setFirmaCliente(dataURL);
    setMostrandoModalCliente(false);
    clearCanvas();
  };

  const abrirModalTecnico = () => {
    if (disabled) return;
    setMostrandoModalTecnico(true);
  };

  const abrirModalCliente = () => {
    if (disabled) return;
    setMostrandoModalCliente(true);
  };

  const cerrarModal = () => {
    setMostrandoModalTecnico(false);
    setMostrandoModalCliente(false);
    clearCanvas();
  };

  const eliminarFirmaTecnico = () => {
    if (disabled) return;
    if (window.confirm('¿Estás seguro de que deseas eliminar la firma del técnico?')) {
      setFirmaTecnico('Sin firma');
    }
  };

  const eliminarFirmaCliente = () => {
    if (disabled) return;
    if (window.confirm('¿Estás seguro de que deseas eliminar la firma del cliente?')) {
      setFirmaCliente('Sin firma');
    }
  };

  const guardarFirmaConformidad = async () => {
    console.log('🔵 FirmaConformidad: ¡FUNCIÓN GUARDAR LLAMADA!');
    console.log('🔵 FirmaConformidad: nombreTecnico:', `"${nombreTecnico}"`);
    console.log('🔵 FirmaConformidad: nombreCliente:', `"${nombreCliente}"`);
    
    // Validaciones
    if (!nombreTecnico.trim()) {
      console.log('❌ FirmaConformidad: Nombre técnico vacío');
      alert('El nombre del técnico es obligatorio');
      return;
    }
    
    if (!nombreCliente.trim()) {
      console.log('❌ FirmaConformidad: Nombre cliente vacío');
      alert('El nombre del cliente es obligatorio');
      return;
    }
    
    console.log('✅ FirmaConformidad: Validaciones pasadas, procediendo con FastAPI...');

    setGuardando(true);
    
    try {
      const firmaData = {
        nombre_tecnico: nombreTecnico.trim(),
        nombre_cliente: nombreCliente.trim(),
        firma_tecnico: firmaTecnico || 'Sin firma',
        firma_cliente: firmaCliente || 'Sin firma',
        fecha_firma: new Date().toISOString(),
        ot_id: otId || null
      };

      console.log('🖊️ FirmaConformidad: Enviando datos de firma:', firmaData);
      
      const endpoint = `${FASTAPI_BASE_URL}/firmas-conformidad/`;
      console.log(`🖊️ FirmaConformidad: Guardando en FastAPI: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(firmaData)
      });

      console.log('📊 FirmaConformidad: Response status:', response.status);
      console.log('📊 FirmaConformidad: Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ FirmaConformidad: Error response:', errorText);
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ FirmaConformidad: Result:', result);
      
      if (result.success) {
        setGuardadoExitoso(true);
        setTimeout(() => setGuardadoExitoso(false), 2000);
        
        // Recargar firmas existentes para mostrar la nueva firma guardada
        await cargarFirmasExistentes();
        
        if (onFirmaGuardada) {
          onFirmaGuardada(result.data);
        }
        
        console.log('✅ FirmaConformidad: Firma de conformidad guardada en FastAPI:', result.data);
      } else {
        throw new Error(result.error || 'Error al guardar firma');
      }
      
    } catch (error) {
      console.error('❌ FirmaConformidad: Error al guardar firma en FastAPI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al guardar la firma de conformidad: ${errorMessage}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="px-6 py-5 border-t border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <UserCheck className="h-5 w-5 mr-2 text-[#00B0B2]" />
          Firmas de Conformidad
          {cargandoFirmas && (
            <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-[#00B0B2]"></div>
          )}
        </h2>
        
        <div className="flex items-center gap-3">
          {firmasExistentes.length > 0 && (
            <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
              ✓ {firmasExistentes.length} firma(s) registrada(s)
            </span>
          )}
          
          {!disabled && (
            <Button
              onClick={() => {
                console.log('🟡 BOTÓN CLICKED!');
                console.log('🟡 Estado del botón - guardando:', guardando);
                console.log('🟡 Estado del botón - nombreTecnico:', `"${nombreTecnico}"`);
                console.log('🟡 Estado del botón - nombreCliente:', `"${nombreCliente}"`);
                console.log('🟡 Estado del botón - disabled:', guardando || !nombreTecnico.trim() || !nombreCliente.trim());
                guardarFirmaConformidad();
              }}
              disabled={guardando || !nombreTecnico.trim() || !nombreCliente.trim()}
              className={`
                transition-all duration-300
                ${guardadoExitoso 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-[#00B0B2] hover:bg-[#009fa0]'
                }
              `}
            >
              {guardando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : guardadoExitoso ? (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  ¡Guardado!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Firmas
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Campos de nombres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="h-4 w-4 inline mr-1" />
            Nombre del Técnico *
          </label>
          <Input
            value={nombreTecnico}
            onChange={(e) => setNombreTecnico(e.target.value)}
            placeholder="Ingrese el nombre completo del técnico"
            disabled={disabled}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="h-4 w-4 inline mr-1" />
            Nombre del Cliente *
          </label>
          <Input
            value={nombreCliente}
            onChange={(e) => setNombreCliente(e.target.value)}
            placeholder="Ingrese el nombre completo del cliente"
            disabled={disabled}
            className="w-full"
          />
        </div>
      </div>

      {/* Firmas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Firma del Técnico */}
        <div className="border border-gray-200 rounded-md shadow-sm bg-white">
          <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 flex items-center justify-between">
            <p className="font-medium text-gray-700">Firma del Técnico:</p>
            {!disabled && (
              <div className="flex gap-1">
                {firmaTecnico && firmaTecnico !== 'Sin firma' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={eliminarFirmaTecnico}
                    className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                    title="Eliminar firma"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={abrirModalTecnico}
                  className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600"
                  title="Agregar/Editar firma"
                >
                  <PenTool className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="p-6 flex justify-center items-center min-h-[200px]">
            {firmaTecnico && firmaTecnico !== 'Sin firma' ? (
              <img 
                src={firmaTecnico} 
                alt="Firma del técnico" 
                className="max-h-40 max-w-full object-contain"
              />
            ) : (
              <p className="text-gray-400 italic">Sin firma</p>
            )}
          </div>
          <div className="border-t border-gray-100 px-4 py-3 text-center bg-gray-50">
            <p className="text-sm font-medium text-gray-700">
              {nombreTecnico || 'Nombre del técnico'}
            </p>
          </div>
        </div>

        {/* Firma del Cliente */}
        <div className="border border-gray-200 rounded-md shadow-sm bg-white">
          <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 flex items-center justify-between">
            <p className="font-medium text-gray-700">Firma del Cliente:</p>
            {!disabled && (
              <div className="flex gap-1">
                {firmaCliente && firmaCliente !== 'Sin firma' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={eliminarFirmaCliente}
                    className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                    title="Eliminar firma del cliente"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={abrirModalCliente}
                  className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600"
                  title="Agregar/Editar firma del cliente"
                >
                  <PenTool className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="p-6 flex justify-center items-center min-h-[200px]">
            {firmaCliente && firmaCliente !== 'Sin firma' ? (
              <img 
                src={firmaCliente} 
                alt="Firma del cliente" 
                className="max-h-40 max-w-full object-contain"
              />
            ) : (
              <p className="text-gray-400 italic">Sin firma</p>
            )}
          </div>
          <div className="border-t border-gray-100 px-4 py-3 text-center bg-gray-50">
            <p className="text-sm font-medium text-gray-700">
              {nombreCliente || 'Nombre del cliente'}
            </p>
          </div>
        </div>
      </div>

      {/* Modal para firma del técnico */}
      {mostrandoModalTecnico && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold mb-4">Firma del Técnico</h3>
            
            <div className="border border-gray-300 rounded-lg mb-4">
              <canvas
                ref={canvasRef}
                width={500}
                height={300}
                className="w-full h-auto cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={clearCanvas}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={cerrarModal}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={guardarFirmaTecnico}
                  className="bg-[#00B0B2] hover:bg-[#009fa0]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Firma
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para firma del cliente */}
      {mostrandoModalCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold mb-4">Firma del Cliente</h3>
            
            <div className="border border-gray-300 rounded-lg mb-4">
              <canvas
                ref={canvasRef}
                width={500}
                height={300}
                className="w-full h-auto cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={clearCanvas}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={cerrarModal}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={guardarFirmaCliente}
                  className="bg-[#00B0B2] hover:bg-[#009fa0]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Firma
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
