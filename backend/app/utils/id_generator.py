"""
Utilidad para generar IDs consecutivos globales entre todas las tablas de solicitudes
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

def obtener_siguiente_id_solicitud(db: Session) -> int:
    """
    Obtiene el siguiente ID consecutivo considerando todas las tablas de solicitudes
    
    Args:
        db: Sesión de la base de datos
        
    Returns:
        int: Siguiente ID consecutivo global
    """
    try:
        # Consultar el máximo ID de todas las tablas de solicitudes
        query = text("""
        SELECT GREATEST(
            COALESCE((SELECT MAX(id) FROM b2c_solicitudes), 0),
            COALESCE((SELECT MAX(id) FROM b2b_solicitudes), 0)
        ) as max_id
        """)
        
        result = db.execute(query).fetchone()
        max_id = result.max_id if result and result.max_id else 0
        
        # Retornar el siguiente ID
        return max_id + 1
        
    except Exception as e:
        print(f"Error obteniendo siguiente ID: {e}")
        # En caso de error, retornar un ID por defecto
        return 1

def generar_folio_por_tipo(tipo_solicitud: str, id_solicitud: int) -> str:
    """
    Genera el folio basado en el tipo de solicitud y el ID
    
    Args:
        tipo_solicitud: Tipo de solicitud ('B2C', 'B2B', 'PLANTA')
        id_solicitud: ID de la solicitud
        
    Returns:
        str: Folio generado
    """
    prefijos = {
        'B2C': 'B2C',
        'B2B': 'B2B', 
        'PLANTA': 'PSP'  # Planta San Pedro
    }
    
    prefijo = prefijos.get(tipo_solicitud, 'SOL')
    return f"{prefijo}-{id_solicitud:05d}"