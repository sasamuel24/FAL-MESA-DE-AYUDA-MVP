/**
 * Utilidades para manejo de fechas con zona horaria de Colombia
 * Equivalente a format_colombia_datetime del backend (email_service.py)
 */

const COLOMBIA_TZ = 'America/Bogota';

/**
 * Formatea una fecha en la zona horaria de Colombia (UTC-5)
 * 
 * @param date - Fecha a formatear (string ISO o Date). Si es null/undefined, usa la fecha actual
 * @param format - Formato de salida. Opciones:
 *   - 'default': "dd/mm/yyyy a las HH:MM" (ej: "06/11/2025 a las 10:30")
 *   - 'short': "dd/mm/yyyy HH:MM" (ej: "06/11/2025 10:30")
 *   - 'long': "dd de Month de yyyy a las HH:MM" (ej: "06 de noviembre de 2025 a las 10:30")
 * @returns Fecha formateada en zona horaria de Colombia
 */
export function formatColombiaDateTime(
  date?: string | Date | null,
  format: 'default' | 'short' | 'long' = 'default'
): string {
  try {
    // Si no hay fecha, usar la actual
    const dateObj = date ? new Date(date) : new Date();
    
    // Verificar que la fecha sea válida
    if (isNaN(dateObj.getTime())) {
      console.error('❌ [formatColombiaDateTime] Fecha inválida:', date);
      return 'Fecha inválida';
    }
    
    // Formatear según el tipo especificado
    switch (format) {
      case 'short':
        // Formato: "dd/mm/yyyy HH:MM"
        return dateObj.toLocaleString('es-CO', {
          timeZone: COLOMBIA_TZ,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).replace(',', '');
      
      case 'long':
        // Formato: "dd de Month de yyyy a las HH:MM"
        const datePart = dateObj.toLocaleDateString('es-CO', {
          timeZone: COLOMBIA_TZ,
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
        const timePart = dateObj.toLocaleTimeString('es-CO', {
          timeZone: COLOMBIA_TZ,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `${datePart} a las ${timePart}`;
      
      case 'default':
      default:
        // Formato: "dd/mm/yyyy a las HH:MM"
        const datePartDefault = dateObj.toLocaleDateString('es-CO', {
          timeZone: COLOMBIA_TZ,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const timePartDefault = dateObj.toLocaleTimeString('es-CO', {
          timeZone: COLOMBIA_TZ,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `${datePartDefault} a las ${timePartDefault}`;
    }
  } catch (error) {
    console.error('❌ [formatColombiaDateTime] Error al formatear fecha:', error, 'Fecha original:', date);
    return 'Error al formatear fecha';
  }
}

/**
 * Obtiene la fecha y hora actual en la zona horaria de Colombia
 * Equivalente a get_colombia_datetime() del backend
 * 
 * @returns Fecha actual formateada en zona horaria de Colombia
 */
export function getColombiaDateTime(format: 'default' | 'short' | 'long' = 'default'): string {
  return formatColombiaDateTime(new Date(), format);
}

/**
 * Convierte una fecha UTC a zona horaria de Colombia y retorna el objeto Date
 * 
 * @param date - Fecha en UTC (string ISO o Date)
 * @returns Objeto Date ajustado a Colombia (para cálculos)
 */
export function toColombiaDate(date: string | Date): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Obtener offset de Colombia (-5 horas = -300 minutos)
  const colombiaOffset = -300;
  const localOffset = dateObj.getTimezoneOffset();
  const diff = localOffset - colombiaOffset;
  
  // Ajustar fecha
  const colombiaDate = new Date(dateObj.getTime() + diff * 60 * 1000);
  return colombiaDate;
}
