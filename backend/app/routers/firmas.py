"""
Router Firmas de router = APIRouter(
    tags=["Firmas Conformidad"],
    responses={404: {"description": "Not found"}}
)rmidad para FastAPI
Migración completa del endpoint de firmas de conformidad desde Flask API v1/firmas_conformidad.py
Compatibilidad total con respuestas Flask existentes y funcionalidad completa de gestión de firmas
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
import logging

from app.database import get_db
from app.models import FirmaConformidad
from app.utils.model_utils import firma_conformidad_to_dict, paginated_response
from app.services.s3_service import S3Service

# Configurar logging
logger = logging.getLogger(__name__)

async def _procesar_firma_s3(firma_base64: Optional[str], s3_key: str, s3_service: S3Service, tipo_firma: str) -> Optional[str]:
    """
    Procesar firma base64 y subirla a S3
    
    Args:
        firma_base64: Imagen en base64 o None
        s3_key: Clave para almacenar en S3
        s3_service: Instancia del servicio S3
        tipo_firma: 'técnico' o 'cliente' para logging
    
    Returns:
        URL de S3 o None si no hay firma
    """
    try:
        if not firma_base64 or firma_base64 == 'Sin firma':
            logger.info(f"⚠️ No hay firma de {tipo_firma} para subir a S3")
            return None
            
        if not firma_base64.startswith('data:image'):
            logger.warning(f"⚠️ Formato de firma {tipo_firma} inválido - debe ser base64")
            return None
            
        # Extraer datos base64
        import base64
        import io
        header, base64_data = firma_base64.split(',', 1)
        image_data = base64.b64decode(base64_data)
        
        # Crear buffer para subir
        image_buffer = io.BytesIO(image_data)
        
        # Subir a S3
        s3_url = s3_service.upload_file_buffer(
            file_buffer=image_buffer,
            key=s3_key,
            content_type='image/png'
        )
        
        if s3_url:
            logger.info(f"✅ Firma de {tipo_firma} subida a S3: {s3_url[:50]}...")
            return s3_url
        else:
            logger.error(f"❌ Error subiendo firma de {tipo_firma} a S3")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error procesando firma de {tipo_firma}: {str(e)}")
        return None

# Crear router sin prefijo (se maneja en fastapi_app.py)
router = APIRouter(
    tags=["Firmas de Conformidad"],
    responses={404: {"description": "Not found"}}
)

# Pydantic models para validación de entrada
class FirmaConformidadCreate(BaseModel):
    nombre_tecnico: str = Field(..., min_length=1, description="Nombre del técnico")
    nombre_cliente: str = Field(..., min_length=1, description="Nombre del cliente")
    firma_tecnico: Optional[str] = Field(default="Sin firma", description="Firma del técnico en base64 o 'Sin firma'")
    firma_cliente: Optional[str] = Field(default="Sin firma", description="Firma del cliente en base64 o 'Sin firma'")
    fecha_firma: Optional[datetime] = Field(default=None, description="Fecha y hora de la firma")
    ot_id: Optional[int] = Field(default=None, description="ID de la OT asociada")
    observaciones: Optional[str] = Field(default=None, description="Observaciones adicionales")

class FirmaConformidadResponse(BaseModel):
    id: int
    numero_registro: str
    nombre_tecnico: str
    firma_tecnico: str
    nombre_cliente: str
    firma_cliente: str
    fecha_firma: datetime
    fecha_creacion: datetime
    ot_id: Optional[int]
    observaciones: Optional[str]

@router.post("/")
async def crear_firma_conformidad(
    firma_data: FirmaConformidadCreate,
    db: Session = Depends(get_db)
):
    """
    Crear una nueva firma de conformidad
    Migrado de Flask: POST /firmas-conformidad
    """
    try:
        logger.info("🎯 FastAPI: Creando nueva firma de conformidad")
        logger.info(f"📥 Datos recibidos - Técnico: {firma_data.nombre_tecnico}, Cliente: {firma_data.nombre_cliente}")
        
        # Validar campos obligatorios (ya validados por Pydantic, pero logs adicionales)
        nombre_tecnico = firma_data.nombre_tecnico.strip()
        nombre_cliente = firma_data.nombre_cliente.strip()
        
        if not nombre_tecnico:
            logger.warning("⚠️ FastAPI: Nombre del técnico está vacío")
            return JSONResponse(
                status_code=400,
                content={
                    'success': False,
                    'error': 'El nombre del técnico es obligatorio'
                }
            )
        
        if not nombre_cliente:
            logger.warning("⚠️ FastAPI: Nombre del cliente está vacío")
            return JSONResponse(
                status_code=400,
                content={
                    'success': False,
                    'error': 'El nombre del cliente es obligatorio'
                }
            )
        
        # Usar fecha proporcionada o fecha actual
        fecha_firma = firma_data.fecha_firma or datetime.utcnow()
        
        # Generar número de registro único
        numero_registro = f"CONF-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"
        
        # 🌐 PROCESAR Y SUBIR FIRMAS A S3
        s3_service = S3Service()
        firma_tecnico_url = await _procesar_firma_s3(
            firma_data.firma_tecnico, 
            f"firmas/ot_{firma_data.ot_id}_tecnico_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.png",
            s3_service,
            "técnico"
        )
        firma_cliente_url = await _procesar_firma_s3(
            firma_data.firma_cliente, 
            f"firmas/ot_{firma_data.ot_id}_cliente_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.png",
            s3_service,
            "cliente"
        )
        
        # Procesar observaciones
        observaciones = firma_data.observaciones.strip() if firma_data.observaciones else None
        
        logger.info(f"🖊️ FastAPI: Creando firma de conformidad:")
        logger.info(f"   - Técnico: {nombre_tecnico}")
        logger.info(f"   - Cliente: {nombre_cliente}")
        logger.info(f"   - Fecha: {fecha_firma}")
        logger.info(f"   - Número de registro: {numero_registro}")
        logger.info(f"   - OT ID: {firma_data.ot_id}")
        
        # Crear nueva firma de conformidad con URLs de S3
        nueva_firma = FirmaConformidad(
            nombre_tecnico=nombre_tecnico,
            firma_tecnico=firma_tecnico_url or 'Sin firma',  # URL de S3 o 'Sin firma'
            nombre_cliente=nombre_cliente,
            firma_cliente=firma_cliente_url or 'Sin firma',  # URL de S3 o 'Sin firma'
            fecha_firma=fecha_firma,
            numero_registro=numero_registro,
            ot_id=firma_data.ot_id,
            observaciones=observaciones
        )
        
        # Guardar en base de datos
        db.add(nueva_firma)
        db.commit()
        db.refresh(nueva_firma)
        
        logger.info(f"✅ FastAPI: Firma de conformidad guardada con ID: {nueva_firma.id}")
        
        return JSONResponse(
            status_code=201,
            content={
                'success': True,
                'message': 'Firma de conformidad creada exitosamente',
                'data': firma_conformidad_to_dict(nueva_firma)
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al crear firma de conformidad: {str(e)}")
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': str(e)
            }
        )

@router.get("/{numero_registro}")
async def obtener_firma_por_registro(
    numero_registro: str,
    db: Session = Depends(get_db)
):
    """
    Obtener una firma de conformidad por número de registro
    Migrado de Flask: GET /firmas-conformidad/<string:numero_registro>
    """
    try:
        logger.info(f"🔍 FastAPI: Buscando firma con número de registro: {numero_registro}")
        
        firma = db.query(FirmaConformidad).filter(
            FirmaConformidad.numero_registro == numero_registro
        ).first()
        
        if not firma:
            logger.warning(f"⚠️ FastAPI: No se encontró firma con número de registro: {numero_registro}")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'No se encontró firma con número de registro: {numero_registro}'
                }
            )
        
        logger.info(f"✅ FastAPI: Firma encontrada: {firma.nombre_tecnico} - {firma.nombre_cliente}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'data': firma_conformidad_to_dict(firma)
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al obtener firma: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': str(e)
            }
        )

@router.get("/id/{firma_id}")
async def obtener_firma_por_id(
    firma_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtener una firma de conformidad por ID
    Migrado de Flask: GET /firmas-conformidad/<int:firma_id>
    """
    try:
        logger.info(f"🔍 FastAPI: Buscando firma con ID: {firma_id}")
        
        firma = db.query(FirmaConformidad).filter(FirmaConformidad.id == firma_id).first()
        
        if not firma:
            logger.warning(f"⚠️ FastAPI: No se encontró firma con ID: {firma_id}")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'No se encontró firma con ID: {firma_id}'
                }
            )
        
        logger.info(f"✅ FastAPI: Firma encontrada: {firma.nombre_tecnico} - {firma.nombre_cliente}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'data': firma_conformidad_to_dict(firma)
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al obtener firma: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': str(e)
            }
        )

@router.get("/")
async def listar_firmas_conformidad(
    page: int = Query(default=1, ge=1, description="Número de página"),
    per_page: int = Query(default=10, ge=1, le=100, description="Elementos por página"),
    nombre_tecnico: Optional[str] = Query(default=None, description="Filtrar por nombre del técnico"),
    nombre_cliente: Optional[str] = Query(default=None, description="Filtrar por nombre del cliente"),
    fecha_desde: Optional[str] = Query(default=None, description="Filtrar desde fecha (YYYY-MM-DD)"),
    fecha_hasta: Optional[str] = Query(default=None, description="Filtrar hasta fecha (YYYY-MM-DD)"),
    ot_id: Optional[int] = Query(default=None, description="Filtrar por ID de OT"),
    db: Session = Depends(get_db)
):
    """
    Listar todas las firmas de conformidad con paginación y filtros
    Migrado de Flask: GET /firmas-conformidad
    """
    try:
        logger.info("🎯 FastAPI: Listando firmas de conformidad")
        logger.info(f"📋 Parámetros - Página: {page}, Por página: {per_page}")
        logger.info(f"📋 Filtros - Técnico: '{nombre_tecnico}', Cliente: '{nombre_cliente}', OT ID: {ot_id}")
        
        # Construir query base
        query = db.query(FirmaConformidad)
        
        # Aplicar filtros
        if ot_id:
            query = query.filter(FirmaConformidad.ot_id == ot_id)
            
        if nombre_tecnico:
            nombre_tecnico_clean = nombre_tecnico.strip()
            query = query.filter(FirmaConformidad.nombre_tecnico.ilike(f'%{nombre_tecnico_clean}%'))
        
        if nombre_cliente:
            nombre_cliente_clean = nombre_cliente.strip()
            query = query.filter(FirmaConformidad.nombre_cliente.ilike(f'%{nombre_cliente_clean}%'))
        
        if fecha_desde:
            try:
                fecha_desde_dt = datetime.strptime(fecha_desde, '%Y-%m-%d')
                query = query.filter(FirmaConformidad.fecha_firma >= fecha_desde_dt)
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={
                        'success': False,
                        'error': 'Formato de fecha_desde inválido. Use YYYY-MM-DD'
                    }
                )
        
        if fecha_hasta:
            try:
                fecha_hasta_dt = datetime.strptime(fecha_hasta, '%Y-%m-%d')
                # Agregar 23:59:59 para incluir todo el día
                fecha_hasta_dt = fecha_hasta_dt.replace(hour=23, minute=59, second=59)
                query = query.filter(FirmaConformidad.fecha_firma <= fecha_hasta_dt)
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={
                        'success': False,
                        'error': 'Formato de fecha_hasta inválido. Use YYYY-MM-DD'
                    }
                )
        
        # Ordenar por fecha de creación descendente
        query = query.order_by(FirmaConformidad.fecha_creacion.desc())
        
        # Calcular offset para paginación manual
        offset = (page - 1) * per_page
        total = query.count()
        firmas = query.offset(offset).limit(per_page).all()
        
        # Convertir a diccionarios
        firmas_data = [firma_conformidad_to_dict(firma) for firma in firmas]
        
        # Calcular información de paginación
        total_pages = (total + per_page - 1) // per_page  # Redondeo hacia arriba
        has_next = page < total_pages
        has_prev = page > 1
        
        logger.info(f"✅ FastAPI: {len(firmas_data)} firmas encontradas en página {page} de {total_pages}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'data': firmas_data,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': total_pages,
                    'has_next': has_next,
                    'has_prev': has_prev
                },
                'total_firmas': total
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al listar firmas: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': str(e)
            }
        )
