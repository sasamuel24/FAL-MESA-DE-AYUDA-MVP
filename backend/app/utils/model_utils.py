"""
Utilidades para FastAPI - Conversión de modelos SQLAlchemy
Funciones helper para convertir modelos a diccionarios JSON
"""
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.inspection import inspect

def model_to_dict(instance: DeclarativeBase, include_relationships: bool = False) -> Dict[str, Any]:
    """
    Convertir instancia de modelo SQLAlchemy a diccionario
    
    Args:
        instance: Instancia del modelo SQLAlchemy
        include_relationships: Si incluir relaciones (por defecto False)
        
    Returns:
        Diccionario con los datos del modelo
    """
    if not instance:
        return {}
    
    # Obtener el inspector del modelo
    mapper = inspect(instance.__class__)
    
    result = {}
    
    # Agregar columnas regulares
    for column in mapper.columns:
        value = getattr(instance, column.name, None)
        
        # Convertir datetime a ISO string
        if isinstance(value, datetime):
            result[column.name] = value.isoformat()
        else:
            result[column.name] = value
    
    # Agregar relaciones si se solicita
    if include_relationships:
        for relationship in mapper.relationships:
            try:
                rel_value = getattr(instance, relationship.key, None)
                if rel_value is not None:
                    if isinstance(rel_value, list):
                        result[relationship.key] = [model_to_dict(item) for item in rel_value]
                    else:
                        result[relationship.key] = model_to_dict(rel_value)
            except:
                # Ignorar relaciones problemáticas
                pass
    
    return result

def b2c_solicitud_to_dict(solicitud, include_full_url: bool = False, base_url: str = "") -> Dict[str, Any]:
    """Convertir solicitud B2C a diccionario con URLs completas"""
    data = model_to_dict(solicitud)
    
    # Agregar campos específicos que pueden no existir
    data.update({
        'folio': solicitud.folio,  # Usar la propiedad folio del modelo
        'motivo_cancelacion': getattr(solicitud, 'motivo_cancelacion', None),
        'archivo_s3_key': getattr(solicitud, 'archivo_s3_key', None),
        'estado': data.get('estado') or 'nueva'
    })
    
    # Ajustar URL del archivo si se solicita
    if include_full_url and data.get('archivo_url') and not data['archivo_url'].startswith('http'):
        data['archivo_url'] = f"{base_url}/static/{data['archivo_url']}"
    
    return data

def ot_solicitud_to_dict(ot_solicitud, include_relationships: bool = False) -> Dict[str, Any]:
    """Convertir OT solicitud a diccionario"""
    data = model_to_dict(ot_solicitud, include_relationships)
    
    # Agregar campos calculados o especiales
    data.update({
        'estado': data.get('estado') or 'Pendiente',
        'etapa': data.get('etapa') or 'Pendiente',
        'prioridad': data.get('prioridad') or 'Media'
    })
    
    return data

def firma_conformidad_to_dict(firma, include_relationships: bool = False) -> Dict[str, Any]:
    """Convertir firma de conformidad a diccionario"""
    data = model_to_dict(firma, include_relationships)
    
    # Ajustes específicos para firmas
    if not data.get('numero_registro'):
        data['numero_registro'] = f"REG-{data.get('id', 0)}"
    
    return data

def work_order_to_dict(work_order, include_relationships: bool = False) -> Dict[str, Any]:
    """Convertir work order a diccionario"""
    data = model_to_dict(work_order, include_relationships)
    
    # Ajustes específicos para work orders
    data.update({
        'estado': data.get('estado') or 'pendiente',
        'prioridad': data.get('prioridad') or 'media'
    })
    
    return data

def user_to_dict(user, include_sensitive: bool = False) -> Dict[str, Any]:
    """Convertir usuario a diccionario"""
    data = model_to_dict(user)
    
    # Remover información sensible por defecto
    if not include_sensitive:
        data.pop('password_hash', None)
    
    # Usar campos de fecha correctos
    if 'created_at' in data:
        data['fecha_creacion'] = data.pop('created_at')
    if 'updated_at' in data:
        data['fecha_actualizacion'] = data.pop('updated_at')
    
    return data

def paginated_response(items: List[Any], total: int, page: int, per_page: int, 
                      converter_func=None, **converter_kwargs) -> Dict[str, Any]:
    """
    Crear respuesta paginada estándar
    
    Args:
        items: Lista de items a paginar
        total: Total de items
        page: Página actual
        per_page: Items por página
        converter_func: Función para convertir cada item
        **converter_kwargs: Argumentos para la función convertidora
    """
    # Convertir items usando la función provista o model_to_dict por defecto
    if converter_func:
        data_items = [converter_func(item, **converter_kwargs) for item in items]
    else:
        data_items = [model_to_dict(item) for item in items]
    
    # Calcular metadatos de paginación
    pages = (total + per_page - 1) // per_page if per_page > 0 else 1
    
    return {
        'success': True,
        'data': data_items,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': pages,
        'has_next': page < pages,
        'has_prev': page > 1
    }
