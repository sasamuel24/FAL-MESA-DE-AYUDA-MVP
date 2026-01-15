"""
Router Técnicos - Órdenes de Trabajo para FastAPI
Migración completa de endpoints específicos para técnicos desde Flask
Incluye dashboard, estadísticas y gestión de OTs para técnicos
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime, timezone, timedelta
import logging

from app.database import get_db
from app.models import OTSolicitud, User, HistorialEtapa, NotasTrazablesOT, WorkOrder, B2CSolicitudes, B2BSolicitud

# Configurar logging
logger = logging.getLogger(__name__)

# Crear router sin prefijo (se agrega en fastapi_app.py)
router = APIRouter(
    tags=["Técnicos - Órdenes de Trabajo"],
    responses={404: {"description": "Not found"}}
)

# Pydantic models para validación de entrada
class EstadisticasDashboard(BaseModel):
    pendientes: int = Field(description="Número de OTs pendientes")
    completadas: int = Field(description="Número de OTs completadas")

class ActividadReciente(BaseModel):
    folio: int = Field(description="Folio de la OT")
    asunto: str = Field(description="Asunto de la OT")
    etapa: str = Field(description="Etapa actual de la OT")
    tiempo: str = Field(description="Tiempo transcurrido desde creación")
    fecha_actualizacion: Optional[str] = Field(description="Fecha de última actualización")
    fecha_creacion: Optional[str] = Field(description="Fecha de creación")

class TecnicoInfo(BaseModel):
    id: int = Field(description="ID del técnico")
    nombre: str = Field(description="Nombre del técnico")
    email: str = Field(description="Email del técnico")
    area: str = Field(description="Área del técnico")

class DashboardTecnicoResponse(BaseModel):
    estadisticas: EstadisticasDashboard
    actividad_reciente: List[ActividadReciente]
    tecnico: TecnicoInfo

# Funciones utilitarias
def calcular_tiempo_transcurrido(fecha_creacion: datetime) -> str:
    """Calcular el tiempo transcurrido desde la creación de una OT"""
    if not fecha_creacion:
        return "Recién creada"
    
    now = datetime.now(timezone.utc)
    
    # Asegurar que fecha_creacion tenga timezone
    if fecha_creacion.tzinfo is None:
        fecha_creacion_utc = fecha_creacion.replace(tzinfo=timezone.utc)
    else:
        fecha_creacion_utc = fecha_creacion
    
    tiempo_transcurrido = now - fecha_creacion_utc
    
    if tiempo_transcurrido.days > 0:
        return f"hace {tiempo_transcurrido.days} día{'s' if tiempo_transcurrido.days > 1 else ''}"
    elif tiempo_transcurrido.seconds > 3600:
        horas = tiempo_transcurrido.seconds // 3600
        return f"hace {horas} hora{'s' if horas > 1 else ''}"
    else:
        minutos = max(1, tiempo_transcurrido.seconds // 60)
        return f"hace {minutos} minuto{'s' if minutos > 1 else ''}"

def buscar_tecnico_por_email(db: Session, tecnico_email: str) -> Optional[User]:
    """Buscar técnico por email con fallback a búsqueda similar"""
    # Búsqueda exacta primero
    tecnico = db.query(User).filter_by(email=tecnico_email, rol='tecnico').first()
    
    if not tecnico:
        # Búsqueda por email similar (sin dominios comunes)
        email_base = tecnico_email.replace('@gmail.com', '').replace('@hotmail.com', '').replace('@outlook.com', '')
        tecnico = db.query(User).filter(
            User.email.like(f'%{email_base}%'),
            User.rol == 'tecnico'
        ).first()
    
    return tecnico

# ==========================================
# ENDPOINTS PRINCIPALES
# ==========================================

@router.get("/dashboard/{tecnico_email}", response_model=None)
async def get_tecnico_dashboard_stats(
    tecnico_email: str,
    db: Session = Depends(get_db)
):
    """
    Obtener estadísticas del dashboard para un técnico específico
    Migrado de Flask: GET /api/ots/dashboard/{tecnico_email}
    """
    try:
        logger.info(f"📊 FastAPI: Obteniendo estadísticas del dashboard para técnico: {tecnico_email}")
        
        # Buscar el usuario técnico por email
        tecnico = buscar_tecnico_por_email(db, tecnico_email)
        
        if not tecnico:
            logger.warning(f"⚠️ FastAPI: Técnico no encontrado con email: {tecnico_email}")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'Técnico no encontrado con email: {tecnico_email}'
                }
            )
        
        logger.info(f"✅ FastAPI: Técnico encontrado: {tecnico.nombre} (ID: {tecnico.id})")
        
        # Contar OTs por estado para este técnico
        # Buscar por nombre del técnico en el campo tecnico_asignado
        
        # COMPLETADAS: Solo las que están terminadas
        completadas = db.query(OTSolicitud).filter(
            OTSolicitud.tecnico_asignado.like(f'%{tecnico.nombre}%'),
            OTSolicitud.etapa.in_(['Terminada', 'Completada', 'Finalizada'])
        ).count()
        
        # PENDIENTES: Todas las que NO están terminadas
        pendientes = db.query(OTSolicitud).filter(
            OTSolicitud.tecnico_asignado.like(f'%{tecnico.nombre}%'),
            ~OTSolicitud.etapa.in_(['Terminada', 'Completada', 'Finalizada'])
        ).count()
        
        # Debug: obtener todas las etapas únicas para este técnico
        etapas_existentes = db.query(OTSolicitud.etapa).filter(
            OTSolicitud.tecnico_asignado.like(f'%{tecnico.nombre}%')
        ).distinct().all()
        etapas_list = [etapa[0] for etapa in etapas_existentes if etapa[0]]
        
        logger.info(f"🔍 FastAPI: Etapas existentes para {tecnico.nombre}: {etapas_list}")
        logger.info(f"📈 FastAPI: Estadísticas - Pendientes: {pendientes}, Completadas: {completadas}")
        
        # Obtener actividad reciente (últimas 10 OTs ordenadas por fecha de creación)
        ots_recientes = db.query(OTSolicitud).filter(
            OTSolicitud.tecnico_asignado.like(f'%{tecnico.nombre}%')
        ).order_by(OTSolicitud.fecha_creacion.desc()).limit(10).all()
        
        logger.info(f"📋 FastAPI: Total OTs encontradas para {tecnico.nombre}: {len(ots_recientes)}")
        
        # Procesar actividad reciente
        actividad_reciente = []
        for ot in ots_recientes:
            tiempo_str = calcular_tiempo_transcurrido(ot.fecha_creacion)
            
            actividad_reciente.append({
                'folio': ot.folio,
                'asunto': ot.asunto or 'Sin asunto',
                'etapa': ot.etapa or 'Pendiente',
                'tiempo': tiempo_str,
                'fecha_actualizacion': ot.fecha_actualizacion.isoformat() if ot.fecha_actualizacion else None,
                'fecha_creacion': ot.fecha_creacion.isoformat() if ot.fecha_creacion else None
            })
        
        logger.info(f"📋 FastAPI: Actividad reciente procesada: {len(actividad_reciente)} elementos")
        
        # Construir respuesta
        response_data = {
            'success': True,
            'data': {
                'estadisticas': {
                    'pendientes': pendientes,
                    'completadas': completadas
                },
                'actividad_reciente': actividad_reciente,
                'tecnico': {
                    'id': tecnico.id,
                    'nombre': tecnico.nombre,
                    'email': tecnico.email,
                    'area': tecnico.area or 'Sin área'
                }
            }
        }
        
        return JSONResponse(
            status_code=200,
            content=response_data
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al obtener estadísticas del dashboard: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno del servidor: {str(e)}'
            }
        )

@router.get("/debug/etapas/{tecnico_email}", response_model=None)
async def debug_etapas_tecnico(
    tecnico_email: str,
    db: Session = Depends(get_db)
):
    """
    Debug: Ver todas las etapas y OTs de un técnico
    Migrado de Flask: GET /api/ots/debug/etapas/{tecnico_email}
    """
    try:
        logger.info(f"🔍 FastAPI Debug: Revisando etapas para técnico: {tecnico_email}")
        
        # Buscar el usuario técnico por email
        tecnico = buscar_tecnico_por_email(db, tecnico_email)
        
        if not tecnico:
            logger.warning(f"⚠️ FastAPI Debug: Técnico no encontrado: {tecnico_email}")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'Técnico no encontrado: {tecnico_email}'
                }
            )
        
        # Obtener TODAS las OTs del técnico
        todas_ots = db.query(OTSolicitud).filter(
            OTSolicitud.tecnico_asignado.like(f'%{tecnico.nombre}%')
        ).all()
        
        # Analizar etapas únicas
        etapas_unicas = {}
        ots_detalle = []
        
        for ot in todas_ots:
            etapa = ot.etapa or 'Sin etapa'
            if etapa not in etapas_unicas:
                etapas_unicas[etapa] = 0
            etapas_unicas[etapa] += 1
            
            ots_detalle.append({
                'folio': ot.folio,
                'asunto': ot.asunto,
                'etapa': etapa,
                'fecha_creacion': ot.fecha_creacion.isoformat() if ot.fecha_creacion else None
            })
        
        logger.info(f"✅ FastAPI Debug: Análisis completado para {tecnico.nombre}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'data': {
                    'tecnico': {
                        'nombre': tecnico.nombre,
                        'email': tecnico.email
                    },
                    'total_ots': len(todas_ots),
                    'etapas_unicas': etapas_unicas,
                    'ots_detalle': ots_detalle
                }
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI Debug: Error en debug etapas: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error: {str(e)}'
            }
        )

@router.get("/tecnico/{tecnico_email}", response_model=None)
async def obtener_todas_ots_tecnico(
    tecnico_email: str,
    db: Session = Depends(get_db)
):
    """
    ENDPOINT PRINCIPAL - Obtener TODAS las OTs asignadas a un técnico específico
    Incluye tanto WorkOrder como OTSolicitud (migrado completamente desde Flask)
    También funciona como endpoint de dashboard cuando se necesitan estadísticas completas
    """
    try:
        logger.info(f"🔍 FastAPI: Obteniendo TODAS las OTs para técnico: {tecnico_email}")
        
        # Buscar el usuario técnico por email
        tecnico = buscar_tecnico_por_email(db, tecnico_email)
        
        if not tecnico:
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': 'Técnico no encontrado'
                }
            )
        
        todas_ots = []
        
        # 1. Obtener WorkOrders asignadas (sistema de work_orders tradicional)
        work_orders = db.query(WorkOrder).filter_by(assigned_to=tecnico.id).order_by(WorkOrder.fecha_creacion.desc()).all()
        logger.info(f"📋 FastAPI: WorkOrders encontradas: {len(work_orders)}")
        
        for wo in work_orders:
            todas_ots.append({
                'id': wo.id,
                'folio': wo.folio,
                'tipo_ot': 'work_order',
                'asunto': wo.titulo,
                'descripcion': wo.descripcion,
                'fecha_creacion': wo.fecha_creacion.strftime('%Y-%m-%d %H:%M:%S') if wo.fecha_creacion else None,
                'fecha_programada': wo.fecha_programada.strftime('%Y-%m-%d %H:%M:%S') if wo.fecha_programada else None,
                'fecha_completada': wo.fecha_completada.strftime('%Y-%m-%d %H:%M:%S') if wo.fecha_completada else None,
                'estado': wo.estado,
                'etapa': wo.estado,
                'prioridad': wo.prioridad,
                'tecnico_asignado': tecnico.nombre,
                'observaciones': wo.observaciones,
                'tiempo_estimado': wo.tiempo_estimado,
                'tiempo_real': wo.tiempo_real,
                'materiales_usados': wo.materiales_usados,
                'solicitud': None,  # WorkOrders pueden no tener solicitud asociada
                'request_id': wo.request_id
            })
        
        # 2. Obtener OTSolicitudes asignadas (sistema nuevo de OTs desde solicitudes B2C)
        # Buscar por nombre del técnico usando múltiples estrategias
        
        # Estrategia 1: Buscar por nombre completo
        ot_solicitudes_nombre = db.query(OTSolicitud).filter(
            OTSolicitud.tecnico_asignado.ilike(f'%{tecnico.nombre}%')
        ).all()
        
        # Estrategia 2: Buscar por email (en caso de que esté guardado el email)
        ot_solicitudes_email = db.query(OTSolicitud).filter(
            OTSolicitud.tecnico_asignado.ilike(f'%{tecnico.email}%')
        ).all()
        
        # Estrategia 3: Buscar por partes del nombre (nombre o apellido)
        nombre_partes = tecnico.nombre.split()
        ot_solicitudes_partes = []
        for parte in nombre_partes:
            if len(parte) > 2:  # Solo buscar partes de más de 2 caracteres
                ots_parte = db.query(OTSolicitud).filter(
                    OTSolicitud.tecnico_asignado.ilike(f'%{parte}%')
                ).all()
                ot_solicitudes_partes.extend(ots_parte)
        
        # Combinar resultados y eliminar duplicados
        ot_solicitudes_ids = set()
        ot_solicitudes = []
        
        for ots_list in [ot_solicitudes_nombre, ot_solicitudes_email, ot_solicitudes_partes]:
            for ots in ots_list:
                if ots.id not in ot_solicitudes_ids:
                    ot_solicitudes_ids.add(ots.id)
                    ot_solicitudes.append(ots)
        
        # Ordenar por fecha de creación
        ot_solicitudes.sort(key=lambda x: x.fecha_creacion or datetime.min, reverse=True)
        
        logger.info(f"📋 FastAPI: OTSolicitudes encontradas para {tecnico.nombre} ({tecnico.email}): {len(ot_solicitudes)}")
        
        if len(ot_solicitudes) == 0:
            logger.info("🔍 FastAPI: DEBUG - No se encontraron OTs para este técnico")
        else:
            logger.info("✅ FastAPI: OTs encontradas:")
            for ot_found in ot_solicitudes[:5]:  # Solo mostrar las primeras 5 para no spam
                logger.info(f"     - Folio {ot_found.folio}: '{ot_found.tecnico_asignado}'")
        
        for ots in ot_solicitudes:
            # Obtener información de la solicitud (B2C o B2B)
            solicitud_info = None
            if ots.solicitud_id:
                # Verificar si es B2B o B2C según el tipo_solicitud
                if ots.tipo_solicitud == 'B2B':
                    # Es una solicitud B2B
                    solicitud_b2b = db.query(B2BSolicitud).get(ots.solicitud_id)
                    if solicitud_b2b:
                        solicitud_info = {
                            'zona': ots.zona,  # En B2B, zona contiene la razón social
                            'ciudad': ots.ciudad,
                            'tienda': ots.tienda,  # En B2B, tienda contiene la sucursal
                            'categoria': ots.categoria,
                            'subcategoria': ots.subcategoria,
                            'cliente_nombre': solicitud_b2b.nombre,
                            'cliente_telefono': solicitud_b2b.telefono,
                            'cliente_email': solicitud_b2b.correo,
                            # Campos específicos B2B
                            'razon_social': ots.zona,  # La razón social se guarda en zona
                            'sucursal': ots.tienda,    # La sucursal se guarda en tienda
                            'equipos': solicitud_b2b.equipo.nombre if solicitud_b2b.equipo else 'N/A',
                            'archivo_adjunto': {
                                'nombre': solicitud_b2b.archivo_nombre,
                                'url': solicitud_b2b.archivo_url
                            } if solicitud_b2b.archivo_nombre and solicitud_b2b.archivo_url else None
                        }
                else:
                    # Es una solicitud B2C tradicional
                    solicitud = db.query(B2CSolicitudes).get(ots.solicitud_id)
                    if solicitud:
                        solicitud_info = {
                            'zona': solicitud.zona,
                            'ciudad': solicitud.ciudad,
                            'tienda': solicitud.tienda,
                            'categoria': solicitud.categoria,
                            'subcategoria': solicitud.subcategoria,
                            'cliente_nombre': solicitud.nombre,
                            'cliente_telefono': solicitud.telefono,
                            'cliente_email': solicitud.correo,
                            # Campos específicos para Planta San Pedro
                            'planta': solicitud.planta if solicitud.planta else None,
                            'activo': solicitud.activo if solicitud.activo else None,
                            'archivo_adjunto': {
                                'nombre': solicitud.archivo_nombre,
                                'url': solicitud.archivo_url
                            } if solicitud.archivo_nombre and solicitud.archivo_url else None
                        }
            
            todas_ots.append({
                'id': ots.id,
                'folio': str(ots.folio),  # Convertir a string para consistencia
                'tipo_ot': 'ot_solicitud',
                'asunto': ots.asunto,
                'descripcion': f"Categoría: {ots.categoria} | Subcategoría: {ots.subcategoria}",
                'fecha_creacion': ots.fecha_creacion.strftime('%Y-%m-%d %H:%M:%S') if ots.fecha_creacion else None,
                'fecha_programada': None,  # OTSolicitud no tiene fecha programada
                'fecha_visita': ots.fecha_visita.strftime('%Y-%m-%d %H:%M:%S') if ots.fecha_visita else None,
                'fecha_completada': ots.fecha_completada.strftime('%Y-%m-%d %H:%M:%S') if ots.fecha_completada else None,
                'estado': ots.etapa,
                'etapa': ots.etapa,
                'prioridad': ots.prioridad,
                'tecnico_asignado': ots.tecnico_asignado,
                'observaciones': ots.notas,
                'tiempo_estimado': None,
                'tiempo_real': None,
                'materiales_usados': None,
                'solicitud': solicitud_info,
                'request_id': None
            })
        
        # Ordenar todas las OTs por fecha de creación (más recientes primero)
        todas_ots.sort(key=lambda x: x['fecha_creacion'] or '1900-01-01', reverse=True)
        
        # Calcular estadísticas
        total_ots = len(todas_ots)
        pendientes = len([ot for ot in todas_ots if ot['estado'].lower() in ['pendiente', 'asignada']])
        en_proceso = len([ot for ot in todas_ots if ot['estado'].lower() in ['en_proceso', 'en proceso', 'en progreso']])
        completadas = len([ot for ot in todas_ots if ot['estado'].lower() in ['completada', 'terminada', 'finalizada']])
        canceladas = len([ot for ot in todas_ots if ot['estado'].lower() in ['cancelada']])
        
        estadisticas = {
            'total': total_ots,
            'pendientes': pendientes,
            'en_proceso': en_proceso,
            'completadas': completadas,
            'canceladas': canceladas,
            'work_orders': len(work_orders),
            'ot_solicitudes': len(ot_solicitudes)
        }
        
        logger.info(f"📊 FastAPI: Estadísticas para {tecnico.nombre}: Total={total_ots}, Pendientes={pendientes}, En Proceso={en_proceso}, Completadas={completadas}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'data': todas_ots,
                'estadisticas': estadisticas,
                'tecnico': {
                    'id': tecnico.id,
                    'nombre': tecnico.nombre,
                    'email': tecnico.email,
                    'area': tecnico.area
                },
                'total_encontradas': total_ots,
                'mensaje': f'Se encontraron {total_ots} OTs asignadas a {tecnico.nombre}'
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al obtener OTs del técnico {tecnico_email}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno del servidor: {str(e)}'
            }
        )

@router.get("/estadisticas-tecnico/{tecnico_email}", response_model=None)
async def obtener_estadisticas_tecnico(
    tecnico_email: str,
    db: Session = Depends(get_db)
):
    """
    Obtener estadísticas completas de un técnico
    Migrado de Flask: GET /api/ots/estadisticas-tecnico/{tecnico_email}
    """
    try:
        logger.info(f"📊 FastAPI: Obteniendo estadísticas completas para técnico: {tecnico_email}")
        
        # Buscar el técnico
        tecnico = buscar_tecnico_por_email(db, tecnico_email)
        
        if not tecnico:
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'Técnico no encontrado: {tecnico_email}'
                }
            )
        
        # Estadísticas de OTSolicitud
        total_ot_solicitudes = db.query(OTSolicitud).filter(
            OTSolicitud.tecnico_asignado.ilike(f'%{tecnico.nombre}%')
        ).count()
        
        ots_pendientes = db.query(OTSolicitud).filter(
            OTSolicitud.tecnico_asignado.ilike(f'%{tecnico.nombre}%'),
            OTSolicitud.etapa.ilike('%pendiente%')
        ).count()
        
        ots_en_proceso = db.query(OTSolicitud).filter(
            OTSolicitud.tecnico_asignado.ilike(f'%{tecnico.nombre}%'),
            OTSolicitud.etapa.ilike('%proceso%')
        ).count()
        
        ots_completadas = db.query(OTSolicitud).filter(
            OTSolicitud.tecnico_asignado.ilike(f'%{tecnico.nombre}%'),
            OTSolicitud.etapa.ilike('%completada%')
        ).count()
        
        # Estadísticas por tipo de mantenimiento
        preventivo = db.query(OTSolicitud).filter(
            OTSolicitud.tecnico_asignado.ilike(f'%{tecnico.nombre}%'),
            OTSolicitud.tipo_mantenimiento.ilike('%preventivo%')
        ).count()
        
        correctivo = db.query(OTSolicitud).filter(
            OTSolicitud.tecnico_asignado.ilike(f'%{tecnico.nombre}%'),
            OTSolicitud.tipo_mantenimiento.ilike('%correctivo%')
        ).count()
        
        predictivo = db.query(OTSolicitud).filter(
            OTSolicitud.tecnico_asignado.ilike(f'%{tecnico.nombre}%'),
            OTSolicitud.tipo_mantenimiento.ilike('%predictivo%')
        ).count()
        
        # Calcular porcentajes
        total_tipos = preventivo + correctivo + predictivo
        porcentaje_preventivo = (preventivo / total_tipos * 100) if total_tipos > 0 else 0
        porcentaje_correctivo = (correctivo / total_tipos * 100) if total_tipos > 0 else 0
        porcentaje_predictivo = (predictivo / total_tipos * 100) if total_tipos > 0 else 0
        
        estadisticas = {
            'total': total_ot_solicitudes,
            'pendientes': ots_pendientes,
            'en_proceso': ots_en_proceso,
            'completadas': ots_completadas,
            'tipos_mantenimiento': {
                'preventivo': preventivo,
                'correctivo': correctivo,
                'predictivo': predictivo,
                'porcentaje_preventivo': round(porcentaje_preventivo, 1),
                'porcentaje_correctivo': round(porcentaje_correctivo, 1),
                'porcentaje_predictivo': round(porcentaje_predictivo, 1)
            }
        }
        
        logger.info(f"✅ FastAPI: Estadísticas completas obtenidas para {tecnico.nombre}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'data': estadisticas,
                'tecnico': {
                    'nombre': tecnico.nombre,
                    'email': tecnico.email,
                    'area': tecnico.area
                }
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al obtener estadísticas del técnico: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno: {str(e)}'
            }
        )

# ==========================================
# ENDPOINTS ADICIONALES ÚTILES
# ==========================================

@router.get("/tecnicos/activos", response_model=None)
async def listar_tecnicos_activos(
    db: Session = Depends(get_db)
):
    """
    Listar todos los técnicos activos en el sistema
    Nuevo endpoint útil para FastAPI
    """
    try:
        logger.info("👥 FastAPI: Listando técnicos activos")
        
        # Obtener todos los técnicos
        tecnicos = db.query(User).filter(User.rol == 'tecnico').all()
        
        tecnicos_data = []
        for tecnico in tecnicos:
            # Contar OTs asignadas a cada técnico
            total_ots = db.query(OTSolicitud).filter(
                OTSolicitud.tecnico_asignado.like(f'%{tecnico.nombre}%')
            ).count()
            
            pendientes = db.query(OTSolicitud).filter(
                OTSolicitud.tecnico_asignado.like(f'%{tecnico.nombre}%'),
                ~OTSolicitud.etapa.in_(['Terminada', 'Completada', 'Finalizada'])
            ).count()
            
            tecnicos_data.append({
                'id': tecnico.id,
                'nombre': tecnico.nombre,
                'email': tecnico.email,
                'area': tecnico.area or 'Sin área',
                'total_ots': total_ots,
                'ots_pendientes': pendientes,
                'fecha_creacion': tecnico.fecha_creacion.isoformat() if hasattr(tecnico, 'fecha_creacion') and tecnico.fecha_creacion else None
            })
        
        logger.info(f"✅ FastAPI: {len(tecnicos_data)} técnicos activos encontrados")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'data': tecnicos_data,
                'total_tecnicos': len(tecnicos_data)
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error listando técnicos activos: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno: {str(e)}'
            }
        )

@router.get("/resumen-general", response_model=None)
async def get_resumen_general_tecnicos(
    db: Session = Depends(get_db)
):
    """
    Obtener resumen general de todos los técnicos y sus OTs
    Nuevo endpoint útil para administradores
    """
    try:
        logger.info("📊 FastAPI: Generando resumen general de técnicos")
        
        # Estadísticas globales
        total_ots = db.query(OTSolicitud).count()
        ots_con_tecnico = db.query(OTSolicitud).filter(
            OTSolicitud.tecnico_asignado.isnot(None),
            OTSolicitud.tecnico_asignado != ''
        ).count()
        ots_sin_tecnico = total_ots - ots_con_tecnico
        
        # Obtener todos los técnicos y sus estadísticas
        tecnicos = db.query(User).filter(User.rol == 'tecnico').all()
        
        tecnicos_resumen = []
        for tecnico in tecnicos:
            total_tecnico = db.query(OTSolicitud).filter(
                OTSolicitud.tecnico_asignado.like(f'%{tecnico.nombre}%')
            ).count()
            
            pendientes_tecnico = db.query(OTSolicitud).filter(
                OTSolicitud.tecnico_asignado.like(f'%{tecnico.nombre}%'),
                ~OTSolicitud.etapa.in_(['Terminada', 'Completada', 'Finalizada'])
            ).count()
            
            completadas_tecnico = total_tecnico - pendientes_tecnico
            
            tecnicos_resumen.append({
                'tecnico': tecnico.nombre,
                'email': tecnico.email,
                'area': tecnico.area,
                'total_ots': total_tecnico,
                'pendientes': pendientes_tecnico,
                'completadas': completadas_tecnico,
                'porcentaje_carga': round((total_tecnico / total_ots * 100), 1) if total_ots > 0 else 0
            })
        
        # Ordenar por carga de trabajo
        tecnicos_resumen.sort(key=lambda x: x['total_ots'], reverse=True)
        
        resumen_general = {
            'estadisticas_globales': {
                'total_ots_sistema': total_ots,
                'ots_con_tecnico_asignado': ots_con_tecnico,
                'ots_sin_tecnico_asignado': ots_sin_tecnico,
                'total_tecnicos': len(tecnicos)
            },
            'tecnicos_resumen': tecnicos_resumen,
            'fecha_generacion': datetime.utcnow().isoformat()
        }
        
        logger.info(f"✅ FastAPI: Resumen general generado con {len(tecnicos)} técnicos")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'data': resumen_general
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error generando resumen general: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno: {str(e)}'
            }
        )
