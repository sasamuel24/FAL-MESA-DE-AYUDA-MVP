/**
 * Hook para formularios B2C con FastAPI únicamente
 * Configuración simplificada para backend FastAPI
 */
import { useState } from 'react';

// Configuración de FastAPI
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'http://localhost:8001/api/v1';

interface BackendConfig {
  baseUrl: string;
  b2cEndpoint: string;
}

const BACKEND_CONFIG: BackendConfig = {
  baseUrl: FASTAPI_BASE_URL,
  b2cEndpoint: '/solicitudes/b2c'
};

export const useBackendDetection = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // URL del endpoint B2C con FastAPI
  const backendUrl = `${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.b2cEndpoint}`;

  // Función para enviar formulario B2C con FastAPI únicamente
  const submitB2CForm = async (formData: FormData) => {
    if (isSubmitting) {
      throw new Error('Formulario en proceso de envío...');
    }

    setIsSubmitting(true);
    
    try {
      console.log(`📡 Enviando formulario B2C a FastAPI: ${backendUrl}`);
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        body: formData // FormData se envía tal como está
      });

      if (!response.ok) {
        throw new Error(`Error del servidor FastAPI: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Formulario B2C enviado exitosamente a FastAPI');
      return response;
      
    } catch (error) {
      console.error('❌ Error al enviar formulario B2C a FastAPI:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    activeBackend: 'fastapi' as const,
    backendUrl,
    isDetecting: false, // Ya no hay detección
    isSubmitting,
    submitB2CForm
  };
};
