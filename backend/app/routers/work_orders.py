"""
Router Work Orders para FastAPI
Migración de endpoints críticos desde Flask API v1/work_orders.py
Compatibilidad total con respuestas Flask existentes
"""
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func, and_
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import logging
import os
from pathlib import Path

from app.database import get_db
from app.models import OTSolicitud, B2CSolicitudes, HistorialEtapa, ArchivosAdjuntosOT, NotasTrazablesOT, FirmaConformidad, B2BSolicitud  # Modelos FastAPI
from app.schemas import DashboardStatsResponse, TiposMantenimiento, ActividadReciente
from app.core.security import get_current_user
from app.services.email_service import send_technician_assignment_email
from app.services.notification_service import NotificationService
from app.services.s3_service import S3Service
from app.services.excel_direct_pdf_service import ExcelDirectPDFService

# Configurar logging
logger = logging.getLogger(__name__)

# Configurar S3 service
s3_service = S3Service()

# Dependency para S3Service
def get_s3_service() -> S3Service:
    """Dependency injection para S3Service"""
    return s3_service

# Pydantic models para validación
class CrearOTDirectaRequest(BaseModel):
    categoria: str
    subcategoria: str
    zona: str
    ciudad: str
    tienda: str
    tecnico_asignado: str
    descripcion: str
    asunto: Optional[str] = None
    estado: Optional[str] = "Ot Asignada Tcq"
    prioridad: Optional[str] = "Media"
    tipo_mantenimiento: Optional[str] = "correctivo"
    observaciones: Optional[str] = ""
    fecha_programada: Optional[str] = None

# Configurar logging
logger = logging.getLogger(__name__)


# Crear router sin prefijo (se agrega en fastapi_app.py)
router = APIRouter(
    tags=["Work Orders"],
    responses={404: {"description": "Not found"}}
)


@router.get("/dashboard-stats", response_model=None)
async def get_dashboard_stats(
    db: Session = Depends(get_db)
    # current_user: dict = Depends(get_current_user)  # Comentado temporalmente para testing
):
    """
    Obtener estadísticas para el dashboard
    Endpoint compatible con Flask - Respuesta idéntica
    """
    try:
        # 1. Total OTs recibidas globalmente
        total_ots = db.query(func.count(OTSolicitud.id)).scalar()
        
        # 2. OTs pendientes (no cerradas/completadas)
        ots_pendientes = db.query(func.count(OTSolicitud.id)).filter(
            ~OTSolicitud.etapa.in_(['cerrada', 'completada', 'finalizada', 'terminada', 'Terminada'])
        ).scalar()
        
        # 3. OTs cerradas para calcular efectividad
        ots_cerradas = db.query(func.count(OTSolicitud.id)).filter(
            OTSolicitud.etapa.in_(['cerrada', 'completada', 'finalizada', 'terminada', 'Terminada'])
        ).scalar()
        
        # Calcular efectividad de cierre
        efectividad_cierre = (ots_cerradas / total_ots * 100) if total_ots > 0 else 0
        
        # 4. Distribución de tipos de mantenimiento
        # Usar el nuevo campo tipo_mantenimiento con comparaciones exactas
        ots_preventivo = db.query(func.count(OTSolicitud.id)).filter(
            or_(
                OTSolicitud.tipo_mantenimiento.ilike('preventivo'),
                OTSolicitud.tipo_mantenimiento.ilike('Preventivo')
            )
        ).scalar()
        
        ots_correctivo = db.query(func.count(OTSolicitud.id)).filter(
            or_(
                OTSolicitud.tipo_mantenimiento.ilike('correctivo'),
                OTSolicitud.tipo_mantenimiento.ilike('Correctivo')
            )
        ).scalar()
        
        ots_predictivo = db.query(func.count(OTSolicitud.id)).filter(
            or_(
                OTSolicitud.tipo_mantenimiento.ilike('predictivo'),
                OTSolicitud.tipo_mantenimiento.ilike('Predictivo')
            )
        ).scalar()
        
        # Si no hay datos en tipo_mantenimiento, usar fallback en categoria/subcategoria
        if ots_preventivo == 0 and ots_correctivo == 0 and ots_predictivo == 0:
            ots_preventivo = db.query(func.count(OTSolicitud.id)).filter(
                or_(
                    OTSolicitud.categoria.ilike('%preventivo%'),
                    OTSolicitud.subcategoria.ilike('%preventivo%'),
                    OTSolicitud.asunto.ilike('%preventivo%'),
                    OTSolicitud.subcategoria.ilike('%mantenimiento%')
                )
            ).scalar()
            
            ots_correctivo = db.query(func.count(OTSolicitud.id)).filter(
                or_(
                    OTSolicitud.categoria.ilike('%correctivo%'),
                    OTSolicitud.subcategoria.ilike('%correctivo%'),
                    OTSolicitud.asunto.ilike('%correctivo%'),
                    OTSolicitud.subcategoria.ilike('%reparaci%')
                )
            ).scalar()
        
        # Calcular porcentajes (combinando correctivo + predictivo como "otros")
        total_tipos = ots_preventivo + ots_correctivo + ots_predictivo
        porcentaje_preventivo = (ots_preventivo / total_tipos * 100) if total_tipos > 0 else 0
        porcentaje_correctivo = ((ots_correctivo + ots_predictivo) / total_tipos * 100) if total_tipos > 0 else 0
        
        # 5. Actividades recientes (últimas 5 OTs más recientes)
        actividades_recientes = db.query(OTSolicitud).order_by(
            OTSolicitud.fecha_creacion.desc()
        ).limit(5).all()
        
        actividades_data = []
        for ot in actividades_recientes:
            actividades_data.append({
                'folio': ot.folio,
                'tienda': ot.tienda or 'N/A',
                'tipo': ot.tipo_mantenimiento or ot.categoria or ot.subcategoria or 'General',
                'tecnico': ot.tecnico_asignado or 'Sin asignar',
                'estado': ot.etapa or 'Pendiente'
            })
        
        # RESPUESTA COMPATIBLE CON FLASK - Estructura exacta
        response_data = {
            'totalOTs': total_ots,
            'otsPendientes': ots_pendientes,
            'efectividadCierre': round(efectividad_cierre, 1),
            'tiposMantenimiento': {
                'preventivo': ots_preventivo,
                'correctivo': ots_correctivo,
                'predictivo': ots_predictivo,
                'porcentajePreventivo': round(porcentaje_preventivo, 1),
                'porcentajeCorrectivo': round(porcentaje_correctivo, 1)
            },
            'actividadesRecientes': actividades_data
        }
        
        return JSONResponse(content=response_data, status_code=200)
        
    except Exception as e:
        error_response = {
            'success': False,
            'error': f'Error al obtener estadísticas: {str(e)}'
        }
        return JSONResponse(content=error_response, status_code=500)


@router.get("/dashboard-tic-stats", response_model=None)
async def get_dashboard_tic_stats(
    db: Session = Depends(get_db)
    # current_user: dict = Depends(get_current_user)  # Comentado temporalmente para testing
):
    """
    Dashboard TIC - Datos reales desde OTs TIC
    Muestra información de OTs de las 4 categorías TIC oficiales:
    - EQUIPOS TIC, INTERNET, OFFICE - CORREO ELECTRONICO, SIESA
    KPIs específicos para el área TIC únicamente basados en OTs activas
    """
    try:
        # Filtro base: OTs con las 4 categorías TIC oficiales de la organización
        filtro_tic_ots = or_(
            OTSolicitud.categoria.ilike('%EQUIPOS TIC%'),           # EQUIPOS TIC
            OTSolicitud.categoria.ilike('%INTERNET%'),              # INTERNET
            OTSolicitud.categoria.ilike('%OFFICE%'),                # OFFICE - CORREO ELECTRONICO
            OTSolicitud.categoria.ilike('%SIESA%')                  # SIESA
        )
        
        # 1. Total Tickets Recibidos = Solo OTs TIC
        total_tickets = db.query(func.count(OTSolicitud.id)).filter(filtro_tic_ots).scalar()
        
        # 2. Tickets Pendientes = OTs TIC no cerradas/completadas
        # Estados cerrados para OTs: Ot Cerrada, Finalizada, Completada, etc.
        estados_cerrados_ots = [
            'Ot Cerrada', 'Finalizada', 'Completada', 'Terminada', 'Cerrada', 
            'Resuelta', 'finalizada', 'completada', 'terminada', 'cerrada', 'resuelta'
        ]
        
        tickets_pendientes = db.query(func.count(OTSolicitud.id)).filter(
            filtro_tic_ots,
            ~OTSolicitud.etapa.in_(estados_cerrados_ots)
        ).scalar()
        
        # 3. Efectividad de Cierre = (OTs TIC cerradas / Total OTs TIC) * 100
        tickets_cerrados = db.query(func.count(OTSolicitud.id)).filter(
            filtro_tic_ots,
            OTSolicitud.etapa.in_(estados_cerrados_ots)
        ).scalar()
        
        efectividad_cierre = (tickets_cerrados / total_tickets * 100) if total_tickets > 0 else 0
        
        # 4. Tiempo Promedio de Resolución (en horas) para OTs cerradas
        ots_cerradas_con_fechas = db.query(
            OTSolicitud.fecha_creacion,
            OTSolicitud.fecha_completada
        ).filter(
            filtro_tic_ots,
            OTSolicitud.etapa.in_(estados_cerrados_ots),
            OTSolicitud.fecha_creacion.isnot(None),
            OTSolicitud.fecha_completada.isnot(None)
        ).all()
        
        tiempo_promedio_resolucion = 0
        if ots_cerradas_con_fechas:
            tiempos_resolucion = []
            for ot in ots_cerradas_con_fechas:
                if ot.fecha_creacion and ot.fecha_completada:
                    # Calcular diferencia en horas
                    diferencia = ot.fecha_completada - ot.fecha_creacion
                    horas = diferencia.total_seconds() / 3600  # Convertir a horas
                    tiempos_resolucion.append(horas)
            
            if tiempos_resolucion:
                tiempo_promedio_resolucion = sum(tiempos_resolucion) / len(tiempos_resolucion)
        else:
            # Si no hay OTs cerradas, usar fecha_actualizacion como aproximación
            ots_con_fechas_actualizacion = db.query(
                OTSolicitud.fecha_creacion,
                OTSolicitud.fecha_actualizacion
            ).filter(
                filtro_tic_ots,
                OTSolicitud.fecha_creacion.isnot(None),
                OTSolicitud.fecha_actualizacion.isnot(None)
            ).all()
            
            if ots_con_fechas_actualizacion:
                tiempos_resolucion = []
                for ot in ots_con_fechas_actualizacion:
                    diferencia = ot.fecha_actualizacion - ot.fecha_creacion
                    horas = diferencia.total_seconds() / 3600  # Convertir a horas
                    tiempos_resolucion.append(horas)
                
                if tiempos_resolucion:
                    tiempo_promedio_resolucion = sum(tiempos_resolucion) / len(tiempos_resolucion)
            else:
                tiempo_promedio_resolucion = 2.5  # 2.5 horas como estimado para TIC
        
        # 5. Tickets por Categoría - Categorías TIC específicas de la organización
        # Categorías TIC establecidas: EQUIPOS TIC, INTERNET, OFFICE - CORREO ELECTRONICO, SIESA
        
        # Obtener conteo por categoría principal (no subcategoría)
        categorias_tic_reales = db.query(
            OTSolicitud.categoria,
            func.count(OTSolicitud.id).label('cantidad')
        ).filter(
            filtro_tic_ots,
            OTSolicitud.categoria.isnot(None)
        ).group_by(OTSolicitud.categoria).all()
        
        # Inicializar las 4 categorías TIC oficiales con 0
        tickets_por_categoria = {
            'equipos_tic': 0,           # EQUIPOS TIC
            'internet': 0,              # INTERNET  
            'office_correo': 0,         # OFFICE - CORREO ELECTRONICO
            'siesa': 0                  # SIESA
        }
        
        # Mapear las categorías de la BD a las categorías del frontend
        for categoria_db in categorias_tic_reales:
            categoria_nombre = (categoria_db.categoria or '').upper().strip()
            cantidad = categoria_db.cantidad
            
            if 'EQUIPOS TIC' in categoria_nombre or 'EQUIPOS_TIC' in categoria_nombre:
                tickets_por_categoria['equipos_tic'] += cantidad
            elif 'INTERNET' in categoria_nombre:
                tickets_por_categoria['internet'] += cantidad
            elif 'OFFICE' in categoria_nombre and 'CORREO' in categoria_nombre:
                tickets_por_categoria['office_correo'] += cantidad
            elif 'SIESA' in categoria_nombre:
                tickets_por_categoria['siesa'] += cantidad
            else:
                # Log para categorías no mapeadas
                logger.info(f"Categoría TIC no mapeada: '{categoria_nombre}' con {cantidad} tickets")
        
        # 6. Actividades Recientes TIC (últimas 5 OTs TIC más recientes)
        actividades_recientes = db.query(OTSolicitud).filter(
            filtro_tic_ots
        ).order_by(OTSolicitud.fecha_creacion.desc()).limit(5).all()
        
        actividades_data = []
        for ot in actividades_recientes:
            # Determinar categoría específica basada en la categoría principal TIC
            categoria_nombre = (ot.categoria or "").upper().strip()
            categoria = "Otros"
            
            if 'EQUIPOS TIC' in categoria_nombre:
                categoria = "Equipos TIC"
            elif 'INTERNET' in categoria_nombre:
                categoria = "Internet"
            elif 'OFFICE' in categoria_nombre and 'CORREO' in categoria_nombre:
                categoria = "Office - Correo"
            elif 'SIESA' in categoria_nombre:
                categoria = "Siesa"
            else:
                # Fallback basado en subcategoría para casos no mapeados
                subcategoria_nombre = (ot.subcategoria or "").lower()
                if any(term in subcategoria_nombre for term in ['computador', 'celular', 'hardware', 'equipo']):
                    categoria = "Equipos TIC"
                elif any(term in subcategoria_nombre for term in ['wifi', 'internet', 'red']):
                    categoria = "Internet"
            
            actividades_data.append({
                'folio': f'OT-{ot.folio}',  # Usar el folio real de la OT
                'tienda': ot.tienda or 'N/A',
                'categoria': categoria,
                'tecnico': ot.tecnico_asignado or 'Sin asignar',
                'estado': ot.etapa or 'Pendiente'  # Usar etapa en lugar de estado
            })
        
        # RESPUESTA PARA DASHBOARD TIC CON DATOS REALES
        response_data = {
            'totalTickets': total_tickets,
            'ticketsPendientes': tickets_pendientes,
            'efectividadCierre': round(efectividad_cierre, 1),
            'tiempoPromedioResolucion': round(tiempo_promedio_resolucion, 1),
            'ticketsPorCategoria': tickets_por_categoria,
            'actividadesRecientes': actividades_data
        }
        
        return JSONResponse(content=response_data, status_code=200)
        
    except Exception as e:
        logger.error(f"Error al obtener estadísticas del dashboard TIC: {str(e)}")
        error_response = {
            'success': False,
            'error': f'Error al obtener estadísticas TIC: {str(e)}'
        }
        return JSONResponse(content=error_response, status_code=500)


@router.get("/dashboard-mantenimiento-stats", response_model=None)
async def get_dashboard_mantenimiento_stats(
    db: Session = Depends(get_db)
):
    """
    Dashboard Mantenimiento - Datos filtrados para área de mantenimiento
    Muestra solo OTs de tiendas (B2C) asignadas al área de mantenimiento
    Excluye solicitudes de Planta San Pedro
    """
    try:
        from app.models import User
        
        logger.info("🔧 Obteniendo estadísticas de dashboard para Mantenimiento")
        
        # Filtro para OTs de mantenimiento de tiendas únicamente
        # 1. OTs que provienen de solicitudes B2C (tiendas)
        # 2. Asignadas a usuarios del área de mantenimiento
        filtro_mantenimiento_tiendas = db.query(OTSolicitud).join(
            B2CSolicitudes, OTSolicitud.solicitud_id == B2CSolicitudes.id, isouter=True
        ).join(
            User, B2CSolicitudes.asignado_a == User.id, isouter=True
        ).filter(
            and_(
                # Solo solicitudes de tiendas (B2C)
                or_(
                    B2CSolicitudes.tipo_formulario == 'b2c',
                    B2CSolicitudes.tipo_formulario.is_(None),  # Para OTs sin solicitud asociada
                    and_(
                        B2CSolicitudes.zona != 'Planta San Pedro',
                        B2CSolicitudes.zona.isnot(None)
                    )
                ),
                # Solo asignadas a área de mantenimiento
                User.area.ilike('%Mantenimiento%')
            )
        )
        
        # 1. Total OTs de mantenimiento de tiendas
        total_ots = filtro_mantenimiento_tiendas.count()
        
        # 2. OTs pendientes (no cerradas/completadas)
        estados_cerrados = [
            'Ot Cerrada', 'Finalizada', 'Completada', 'Terminada', 'Cerrada'
        ]
        ots_pendientes = filtro_mantenimiento_tiendas.filter(
            ~OTSolicitud.etapa.in_(estados_cerrados)
        ).count()
        
        # 3. Efectividad de cierre
        efectividad_cierre = ((total_ots - ots_pendientes) / total_ots * 100) if total_ots > 0 else 0
        
        # 4. Tipos de mantenimiento
        ots_preventivo = filtro_mantenimiento_tiendas.filter(
            OTSolicitud.tipo_mantenimiento.ilike('%preventivo%')
        ).count()
        ots_correctivo = filtro_mantenimiento_tiendas.filter(
            OTSolicitud.tipo_mantenimiento.ilike('%correctivo%')
        ).count()
        ots_predictivo = filtro_mantenimiento_tiendas.filter(
            OTSolicitud.tipo_mantenimiento.ilike('%predictivo%')
        ).count()
        
        # Calcular porcentajes
        total_tipos = ots_preventivo + ots_correctivo + ots_predictivo
        porcentaje_preventivo = (ots_preventivo / total_tipos * 100) if total_tipos > 0 else 0
        porcentaje_correctivo = ((ots_correctivo + ots_predictivo) / total_tipos * 100) if total_tipos > 0 else 0
        
        # 5. Actividades recientes - SOLO TIENDAS DE MANTENIMIENTO
        actividades_recientes = filtro_mantenimiento_tiendas.order_by(
            OTSolicitud.fecha_creacion.desc()
        ).limit(5).all()
        
        actividades_data = []
        for ot in actividades_recientes:
            actividades_data.append({
                'folio': ot.folio,
                'tienda': ot.tienda or 'N/A',
                'tipo': ot.tipo_mantenimiento or ot.categoria or ot.subcategoria or 'General',
                'tecnico': ot.tecnico_asignado or 'Sin asignar',
                'estado': ot.etapa or 'Pendiente'
            })
        
        logger.info(f"✅ Dashboard Mantenimiento: {total_ots} OTs totales, {len(actividades_data)} actividades recientes de tiendas")
        
        # RESPUESTA PARA DASHBOARD MANTENIMIENTO
        response_data = {
            'totalOTs': total_ots,
            'otsPendientes': ots_pendientes,
            'efectividadCierre': round(efectividad_cierre, 1),
            'tiposMantenimiento': {
                'preventivo': ots_preventivo,
                'correctivo': ots_correctivo,
                'predictivo': ots_predictivo,
                'porcentajePreventivo': round(porcentaje_preventivo, 1),
                'porcentajeCorrectivo': round(porcentaje_correctivo, 1)
            },
            'actividadesRecientes': actividades_data
        }
        
        return JSONResponse(content=response_data, status_code=200)
        
    except Exception as e:
        logger.error(f"Error al obtener estadísticas del dashboard Mantenimiento: {str(e)}")
        error_response = {
            'success': False,
            'error': f'Error al obtener estadísticas Mantenimiento: {str(e)}'
        }
        return JSONResponse(content=error_response, status_code=500)


@router.get("/by-solicitud/{solicitud_id}")
async def obtener_ot_por_solicitud(
    solicitud_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtener OT por ID de solicitud
    Migrado desde Flask - Compatible con frontend de solicitudes
    """
    try:
        logger.info(f"FastAPI: Buscando OT para solicitud ID: {solicitud_id}")
        
        # Buscar la OT que corresponde a esta solicitud
        ot = db.query(OTSolicitud).filter(OTSolicitud.solicitud_id == solicitud_id).first()
        
        if not ot:
            logger.warning(f"FastAPI: No se encontró OT para la solicitud {solicitud_id}")
            error_response = {
                'success': False,
                'error': f'No se encontró OT para la solicitud {solicitud_id}'
            }
            raise HTTPException(status_code=404, detail=error_response)
        
        # Estructura de respuesta idéntica a Flask para mantener compatibilidad
        ot_data = {
            'id': ot.id,
            'folio': ot.folio,  # Este es el folio real de la OT (1900, 1901, etc.)
            'solicitud_origen_id': ot.solicitud_id,
            'fecha_creacion': ot.fecha_creacion.isoformat() if ot.fecha_creacion else None,
            'asunto': ot.asunto,
            'categoria': ot.categoria,
            'subcategoria': ot.subcategoria,
            'zona': ot.zona,
            'ciudad': ot.ciudad,
            'tienda': ot.tienda,
            'tecnico_asignado': ot.tecnico_asignado,
            'etapa': ot.etapa,
            'prioridad': ot.prioridad,
            'notas': ot.notas,
            'fecha_actualizacion': ot.fecha_actualizacion.isoformat() if ot.fecha_actualizacion else None,
            'fecha_completada': ot.fecha_completada.isoformat() if ot.fecha_completada else None
        }
        
        response_data = {
            'success': True,
            'data': ot_data
        }
        
        logger.info(f"FastAPI: OT encontrada exitosamente - Folio {ot.folio} para solicitud {solicitud_id}")
        
        return JSONResponse(content=response_data, status_code=200)
        
    except HTTPException:
        # Re-raise HTTPException para mantener el status code correcto
        raise
    except Exception as e:
        logger.error(f"FastAPI: Error al obtener OT por solicitud {solicitud_id}: {str(e)}")
        error_response = {
            'success': False,
            'error': str(e)
        }
        raise HTTPException(status_code=500, detail=error_response)


@router.post("/crear")
async def crear_ot(
    request_data: dict,
    db: Session = Depends(get_db)
):
    """
    Crear nueva orden de trabajo desde una solicitud
    Migrado desde Flask - Compatible con frontend de generar-ot
    """    
    try:
        logger.info(f"FastAPI: Creando nueva OT con datos: {request_data}")
        
        # Validación de datos
        if not request_data:
            error_response = {
                'success': False,
                'error': 'No se proporcionaron datos'
            }
            raise HTTPException(status_code=400, detail=error_response)
        
        # Validar campos requeridos
        required_fields = ['solicitud_id', 'tecnico_asignado', 'prioridad']
        for field in required_fields:
            if field not in request_data:
                error_response = {
                    'success': False,
                    'error': f'Campo requerido: {field}'
                }
                raise HTTPException(status_code=400, detail=error_response)
        
        # Verificar que la solicitud existe (buscar en B2C y B2B)
        from app.models import B2CSolicitudes, B2BSolicitud, OTSolicitud
        solicitud = None
        es_solicitud_b2b = False
        
        # Primero buscar en B2C
        solicitud = db.query(B2CSolicitudes).filter(B2CSolicitudes.id == request_data['solicitud_id']).first()
        
        # Si no se encuentra en B2C, buscar en B2B
        if not solicitud:
            solicitud = db.query(B2BSolicitud).filter(B2BSolicitud.id == request_data['solicitud_id']).first()
            if solicitud:
                es_solicitud_b2b = True
        
        if not solicitud:
            logger.warning(f"FastAPI: Solicitud {request_data['solicitud_id']} no encontrada en B2C ni B2B")
            error_response = {
                'success': False,
                'error': 'Solicitud no encontrada'
            }
            raise HTTPException(status_code=404, detail=error_response)
        
        tipo_solicitud = "B2B" if es_solicitud_b2b else "B2C"
        logger.info(f"FastAPI: Solicitud {tipo_solicitud} encontrada - {solicitud.asunto}")
        
        # Verificar que no exista ya una OT para esta solicitud
        ot_existente = db.query(OTSolicitud).filter(OTSolicitud.solicitud_id == request_data['solicitud_id']).first()
        if ot_existente:
            logger.warning(f"FastAPI: Ya existe OT {ot_existente.folio} para solicitud {request_data['solicitud_id']}")
            error_response = {
                'success': False,
                'error': f'Ya existe una OT con folio {ot_existente.folio} para esta solicitud'
            }
            raise HTTPException(status_code=400, detail=error_response)
        
        # Generar folio único para la OT (entero empezando desde 1900)
        try:
            # Buscar la última OT por folio (ahora es entero)
            last_ot = db.query(OTSolicitud).order_by(OTSolicitud.folio.desc()).first()
            
            logger.info(f"FastAPI: last_ot = {last_ot}")
            if last_ot:
                logger.info(f"FastAPI: last_ot.folio = {last_ot.folio}, tipo = {type(last_ot.folio)}")
            
            if last_ot and last_ot.folio and last_ot.folio >= 1900:
                folio_number = last_ot.folio + 1
                logger.info(f"FastAPI: Incrementando folio: {last_ot.folio} + 1 = {folio_number}")
            else:
                # Primera OT o no hay OTs con folio >= 1900, empezar en 1900
                folio_number = 1900
                logger.info(f"FastAPI: Usando folio inicial: {folio_number}")
                
        except Exception as e:
            # En caso de error, empezar en 1900
            folio_number = 1900
            logger.error(f"FastAPI: Error al generar folio: {e}, usando folio_number: {folio_number}")
        
        logger.info(f"FastAPI: Generando OT con folio: {folio_number}")
        
        # Crear la orden de trabajo en la base de datos con mapeo de campos
        if es_solicitud_b2b:
            # Mapeo para solicitudes B2B - Extraer valores primitivos de objetos SQLAlchemy
            nueva_ot = OTSolicitud(
                folio=folio_number,  # Ahora es un entero
                solicitud_id=request_data['solicitud_id'],
                tipo_solicitud='B2B',  # Identificador para solicitudes B2B
                asunto=solicitud.asunto or 'Solicitud B2B',
                categoria=solicitud.categoria.nombre if solicitud.categoria else 'Sin categoría',
                subcategoria=solicitud.subcategoria.nombre if solicitud.subcategoria else 'Sin subcategoría',
                zona=solicitud.razon_social.nombre if solicitud.razon_social else 'Sin razón social',
                ciudad=solicitud.ciudad.nombre if solicitud.ciudad else 'Sin ciudad',
                tienda=solicitud.sucursal.nombre if solicitud.sucursal else 'Sin sucursal',
                tecnico_asignado=request_data['tecnico_asignado'],
                prioridad=request_data['prioridad'],
                notas=request_data.get('notas', ''),
                etapa='Pendiente'
            )
        else:
            # Mapeo para solicitudes B2C
            nueva_ot = OTSolicitud(
                folio=folio_number,  # Ahora es un entero
                solicitud_id=request_data['solicitud_id'],
                tipo_solicitud='B2C',  # Identificador para solicitudes B2C
                asunto=solicitud.asunto,
                categoria=solicitud.categoria,
                subcategoria=solicitud.subcategoria,
                zona=solicitud.zona,
                ciudad=solicitud.ciudad,
                tienda=solicitud.tienda,
                tecnico_asignado=request_data['tecnico_asignado'],
                prioridad=request_data['prioridad'],
                notas=request_data.get('notas', ''),
                etapa='Pendiente'
            )
        
        # Guardar en la base de datos
        db.add(nueva_ot)
        
        # Actualizar el estado de la solicitud original
        solicitud.estado = 'en_proceso'
        
        db.commit()
        
        logger.info(f"FastAPI: OT {nueva_ot.folio} creada exitosamente")
        
        # Verificar configuración de email antes de enviar
        import os
        email_vars = {
            'TENANT_ID': bool(os.getenv('TENANT_ID')),
            'CLIENT_ID': bool(os.getenv('CLIENT_ID')), 
            'CLIENT_SECRET': bool(os.getenv('CLIENT_SECRET')),
            'FROM_EMAIL': bool(os.getenv('FROM_EMAIL'))
        }
        logger.info(f"FastAPI: 🔧 Variables de entorno de email: {email_vars}")
        
        # Enviar notificación automática al técnico asignado
        print(f"🔥 FastAPI: INICIANDO PROCESO DE EMAIL - Técnico: {request_data['tecnico_asignado']}")
        
        try:
            logger.info(f"FastAPI: 🔄 Iniciando envío de email al técnico {request_data['tecnico_asignado']}")
            print(f"📧 FastAPI: Intentando enviar email al técnico {request_data['tecnico_asignado']}")
            
            # Obtener el técnico desde la base de datos por ID, email o nombre
            from app.models import User
            tecnico_asignado_value = request_data['tecnico_asignado']
            tecnico = None
            tecnico_nombre = None
            tecnico_email = None
            
            print(f"🔍 FastAPI: Valor recibido para técnico: {tecnico_asignado_value} (tipo: {type(tecnico_asignado_value)})")
            
            # Estrategia 1: Intentar buscar por ID si es numérico
            if isinstance(tecnico_asignado_value, int) or (isinstance(tecnico_asignado_value, str) and tecnico_asignado_value.isdigit()):
                print(f"🔢 FastAPI: Buscando técnico por ID: {tecnico_asignado_value}")
                tecnico = db.query(User).filter(
                    User.id == int(tecnico_asignado_value),
                    User.rol == 'tecnico'
                ).first()
                if tecnico:
                    print(f"✅ FastAPI: Técnico encontrado por ID - {tecnico.nombre} ({tecnico.email})")
            
            # Estrategia 2: Si no se encontró por ID y parece email, buscar por email
            if not tecnico and '@' in str(tecnico_asignado_value):
                print(f"📧 FastAPI: Buscando técnico por email: {tecnico_asignado_value}")
                tecnico = db.query(User).filter(
                    User.email == str(tecnico_asignado_value),
                    User.rol == 'tecnico'
                ).first()
                if tecnico:
                    print(f"✅ FastAPI: Técnico encontrado por email - {tecnico.nombre} ({tecnico.email})")
            
            # Estrategia 3: Si no se encontró, buscar por nombre
            if not tecnico:
                print(f"👤 FastAPI: Buscando técnico por nombre: {tecnico_asignado_value}")
                tecnico = db.query(User).filter(
                    User.nombre == str(tecnico_asignado_value),
                    User.rol == 'tecnico'
                ).first()
                if tecnico:
                    print(f"✅ FastAPI: Técnico encontrado por nombre - {tecnico.nombre} ({tecnico.email})")
            
            # Asignar valores finales
            if tecnico and tecnico.email:
                tecnico_nombre = tecnico.nombre
                tecnico_email = tecnico.email
                print(f"🎯 FastAPI: Datos finales - Nombre: {tecnico_nombre}, Email: {tecnico_email}")
                logger.info(f"FastAPI: 👤 Técnico resuelto - {tecnico_nombre} ({tecnico_email})")
            else:
                # Fallback: si parece email, usarlo directamente
                if '@' in str(tecnico_asignado_value):
                    tecnico_nombre = str(tecnico_asignado_value).split('@')[0]  # Parte antes del @
                    tecnico_email = str(tecnico_asignado_value)
                    print(f"⚠️ FastAPI: Usando como email directo: {tecnico_email}")
                    logger.warning(f"FastAPI: ⚠️ Técnico no encontrado en BD, usando email directo: {tecnico_email}")
                else:
                    print(f"❌ FastAPI: No se puede determinar email para: {tecnico_asignado_value}")
                    logger.error(f"FastAPI: ❌ No se puede determinar email para técnico: {tecnico_asignado_value}")
                    tecnico_nombre = str(tecnico_asignado_value)
                    tecnico_email = None
            
            # Preparar datos para el email
            ubicacion = f"{solicitud.zona or 'N/A'}"
            if solicitud.ciudad:
                ubicacion += f" - {solicitud.ciudad}"
            if solicitud.tienda:
                ubicacion += f" - {solicitud.tienda}"
            
            print(f"📍 FastAPI: Ubicación preparada: {ubicacion}")
            print(f"📋 FastAPI: Datos del email:")
            print(f"   - Folio: {folio_number}")
            print(f"   - Cliente: {solicitud.nombre}")
            print(f"   - Descripción: {solicitud.asunto}")
            print(f"   - Prioridad: {request_data['prioridad']}")
            print(f"   - Email destinatario: {tecnico_email}")  # ✅ VERIFICAR EMAIL
            print(f"   - Nombre técnico: {tecnico_nombre}")
            
            # Solo enviar email si se pudo determinar un email válido
            if tecnico_email and '@' in tecnico_email:
                print(f"📤 FastAPI: LLAMANDO A send_technician_assignment_email...")
                
                resultado_email = send_technician_assignment_email(
                    to_email=tecnico_email,  # ✅ USAR EMAIL CORRECTO, NO NOMBRE
                    technician_name=tecnico_nombre or tecnico_email.split('@')[0],
                    folio=str(folio_number),
                    client_name=solicitud.nombre,
                    description=solicitud.asunto,
                    priority=request_data['prioridad'],
                    location=ubicacion
                )
                
                print(f"📬 FastAPI: RESULTADO DEL EMAIL: {resultado_email}")
                
                if resultado_email and resultado_email.get('success'):
                    print(f"✅ FastAPI: EMAIL ENVIADO EXITOSAMENTE!")
                    logger.info(f"FastAPI: ✅ Email enviado exitosamente al técnico {tecnico_email}")
                else:
                    error_msg = resultado_email.get('message', 'Respuesta vacía') if resultado_email else 'Sin respuesta'
                    print(f"❌ FastAPI: ERROR AL ENVIAR EMAIL: {error_msg}")
                    print(f"🔍 FastAPI: Respuesta completa: {resultado_email}")
                    logger.error(f"FastAPI: ❌ Error al enviar email: {error_msg}")
            else:
                print(f"⚠️ FastAPI: NO SE ENVIÓ EMAIL - Email no válido: {tecnico_email}")
                logger.warning(f"FastAPI: ⚠️ No se envió email - Email no válido o no determinado: {tecnico_email}")
                
        except Exception as email_error:
            print(f"💥 FastAPI: EXCEPCIÓN AL ENVIAR EMAIL: {str(email_error)}")
            print(f"🔍 FastAPI: Tipo de error: {type(email_error)}")
            
            import traceback
            traceback_str = traceback.format_exc()
            print(f"📋 FastAPI: Traceback completo:\n{traceback_str}")
            
            logger.error(f"FastAPI: 💥 Excepción enviando email al técnico: {str(email_error)}")
            logger.error(f"FastAPI: 🔍 Tipo de error: {type(email_error)}")
            logger.error(f"FastAPI: 📋 Traceback: {traceback_str}")
            # No fallar la creación de OT si falla la notificación por email
        
        print(f"🏁 FastAPI: PROCESO DE EMAIL TERMINADO")
        
        # Respuesta compatible con Flask
        response_data = {
            'success': True,
            'message': 'Orden de trabajo creada exitosamente',
            'data': {
                'id': nueva_ot.id,
                'folio': nueva_ot.folio,
                'solicitud_origen_id': nueva_ot.solicitud_id,
                'fecha_creacion': nueva_ot.fecha_creacion.isoformat(),
                'asunto': nueva_ot.asunto,
                'categoria': nueva_ot.categoria,
                'subcategoria': nueva_ot.subcategoria,
                'zona': nueva_ot.zona,
                'ciudad': nueva_ot.ciudad,
                'tienda': nueva_ot.tienda,
                'tecnico_asignado': nueva_ot.tecnico_asignado,
                'etapa': nueva_ot.etapa,
                'prioridad': nueva_ot.prioridad,
                'notas': nueva_ot.notas
            }
        }
        
        return JSONResponse(content=response_data, status_code=201)
        
    except HTTPException:
        # Re-raise HTTPException para mantener el status code correcto
        raise
    except Exception as e:
        # Rollback en caso de error
        db.rollback()
        logger.error(f"FastAPI: Error al crear OT: {str(e)}")
        error_response = {
            'success': False,
            'error': str(e)
        }
        raise HTTPException(status_code=500, detail=error_response)


@router.get("/", response_model=None)
@router.get("", response_model=None)  # Ruta adicional sin barra final
async def obtener_todas_las_ots(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obtener todas las órdenes de trabajo filtradas por área del usuario con paginación
    - Usuarios del área TIC: Solo ven OTs de solicitudes asignadas a TIC
    - Usuarios del área Mantenimiento: Solo ven OTs de solicitudes asignadas a Mantenimiento  
    - Administradores: Ven todas las OTs
    
    Parámetros:
    - page: Número de página (default: 1)
    - per_page: Elementos por página (default: 20, usar 0 para obtener todos)
    
    Migrado desde Flask - Compatible con frontend existente
    Endpoint: GET /ots/?page=1&per_page=20
    """
    try:
        from app.models import User
        
        logger.info(f"🔍 Usuario {current_user.nombre} ({current_user.area}) solicitando lista de OTs")
        
        # Query base ordenado por fecha (más recientes primero)  
        query = db.query(OTSolicitud).order_by(OTSolicitud.fecha_creacion.desc())
        
        # 🎯 FILTRADO POR ÁREA DEL USUARIO (igual que las solicitudes)
        if current_user.area and current_user.area.upper() == "TIC":
            # Usuario del área TIC: Solo OTs de solicitudes asignadas a usuarios del área TIC  
            logger.info("🔧 Filtrando OTs para área TIC")
            query = query.join(B2CSolicitudes, OTSolicitud.solicitud_id == B2CSolicitudes.id, isouter=True)\
                         .join(User, B2CSolicitudes.asignado_a == User.id, isouter=True)\
                         .filter(User.area.ilike('%TIC%'))
                         
        elif current_user.area and current_user.area.upper() == "MANTENIMIENTO":
            # Usuario del área Mantenimiento: Solo OTs de solicitudes asignadas a usuarios del área Mantenimiento
            logger.info("🔨 Filtrando OTs para área Mantenimiento") 
            query = query.join(B2CSolicitudes, OTSolicitud.solicitud_id == B2CSolicitudes.id, isouter=True)\
                         .join(User, B2CSolicitudes.asignado_a == User.id, isouter=True)\
                         .filter(User.area.ilike('%Mantenimiento%'))
        else:
            # Otros usuarios (admin general): Ven todas las OTs
            logger.info("👑 Usuario administrador - Ver todas las OTs")
            pass
        
        # Calcular paginación
        if per_page == 0:
            # Si per_page=0, devolver todas las OTs (compatibilidad con solicitudes)
            ots = query.all()
            total_count = len(ots)
            paginated_ots = ots
        else:
            # Obtener total de registros
            total_count = query.count()
            
            # Aplicar paginación
            offset = (page - 1) * per_page
            paginated_ots = query.offset(offset).limit(per_page).all()
        
        ots_data = []
        for ot in paginated_ots:
            # Verificar si tiene archivos adjuntos y obtener información de la solicitud original
            tiene_archivos = False
            tipo_formulario = 'b2c'  # Default
            planta = None
            activo = None
            
            if ot.solicitud_id:
                solicitud = db.query(B2CSolicitudes).get(ot.solicitud_id)
                if solicitud:
                    tiene_archivos = solicitud.archivo_url and solicitud.archivo_nombre
                    tipo_formulario = solicitud.tipo_formulario or 'b2c'
                    planta = solicitud.planta
                    activo = solicitud.activo
            
            # Formatear datos de la OT
            ot_data = {
                'id': ot.id,
                'folio': ot.folio,
                'solicitud_origen_id': ot.solicitud_id,
                'fecha_creacion': ot.fecha_creacion.isoformat() if ot.fecha_creacion else None,
                'fecha_visita': ot.fecha_visita.strftime('%d/%m/%Y') if ot.fecha_visita else None,
                'asunto': ot.asunto,
                'categoria': ot.categoria,
                'subcategoria': ot.subcategoria,
                'zona': ot.zona,
                'ciudad': ot.ciudad,
                'tienda': ot.tienda,
                'planta': planta,
                'activo': activo,
                'tipo_formulario': tipo_formulario,
                'tecnico_asignado': ot.tecnico_asignado,
                'etapa': ot.etapa,
                'prioridad': ot.prioridad,
                'notas': ot.notas,
                'fecha_actualizacion': ot.fecha_actualizacion.isoformat() if ot.fecha_actualizacion else None,
                'fecha_completada': ot.fecha_completada.isoformat() if ot.fecha_completada else None,
                'tiene_archivos_adjuntos': tiene_archivos
            }
            ots_data.append(ot_data)
        
        # Calcular metadatos de paginación
        total_pages = (total_count + per_page - 1) // per_page if per_page > 0 else 1
        has_prev = page > 1 if per_page > 0 else False
        has_next = page < total_pages if per_page > 0 else False
        
        # Log de resultado del filtrado
        logger.info(f"✅ Usuario {current_user.nombre} ({current_user.area}) - Página {page}/{total_pages}, {len(ots_data)} OTs de {total_count} totales")
        
        # Respuesta compatible con Flask + metadatos de paginación
        response_data = {
            'success': True,
            'data': ots_data,
            'total': total_count,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages,
            'has_prev': has_prev,
            'has_next': has_next
        }
        
        return JSONResponse(content=response_data, status_code=200)
        
    except Exception as e:
        logger.error(f"FastAPI: Error al obtener OTs: {str(e)}")
        error_response = {
            'success': False,
            'error': str(e)
        }
        raise HTTPException(status_code=500, detail=error_response)


@router.post("/crear-directa")
async def crear_ot_directa(
    ot_data: CrearOTDirectaRequest,
    db: Session = Depends(get_db)
    # current_user: dict = Depends(get_current_user)  # Comentado temporalmente para testing
):
    """
    Crear una nueva orden de trabajo directamente sin solicitud previa
    Migrado de Flask: POST /api/ots/crear-directa
    """
    try:
        logger.info(f"📝 FastAPI: Creando nueva OT directa")
        logger.info(f"📝 FastAPI: Datos recibidos: {ot_data.dict()}")
        
        # Generar folio único para la OT
        try:
            last_ot = db.query(OTSolicitud).order_by(OTSolicitud.folio.desc()).first()
            
            if last_ot and last_ot.folio and last_ot.folio >= 1900:
                folio_number = last_ot.folio + 1
            else:
                folio_number = 1900
            
            logger.info(f"🔍 FastAPI: Generando nuevo folio: {folio_number}")
            
        except Exception as e:
            logger.error(f"❌ FastAPI: Error al generar folio: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={
                    'success': False,
                    'error': f'Error al generar folio: {str(e)}'
                }
            )

        try:
            # Primero, crear o encontrar una solicitud B2C dummy para OTs directas
            solicitud_dummy = db.query(B2CSolicitudes).filter(
                B2CSolicitudes.correo == 'sistema@ot-directa.com'
            ).first()
            
            if not solicitud_dummy:
                solicitud_dummy = B2CSolicitudes(
                    nombre='Sistema - OT Directa',
                    correo='sistema@ot-directa.com',
                    telefono='000-000-0000',
                    asunto='OT creada directamente por administrador',
                    descripcion='Esta es una solicitud dummy para OTs creadas directamente',
                    zona=ot_data.zona,
                    ciudad=ot_data.ciudad,
                    tienda=ot_data.tienda,
                    categoria=ot_data.categoria,
                    subcategoria=ot_data.subcategoria,
                    estado='completada'
                )
                db.add(solicitud_dummy)
                db.flush()  # Para obtener el ID
            
            # Procesar fecha programada si existe
            fecha_visita = None
            if ot_data.fecha_programada:
                try:
                    fecha_visita = datetime.strptime(ot_data.fecha_programada, '%Y-%m-%d')
                except ValueError:
                    logger.warning(f"⚠️ FastAPI: Formato de fecha inválido: {ot_data.fecha_programada}")
            
            # Crear la nueva OT
            nueva_ot = OTSolicitud(
                folio=folio_number,
                asunto=ot_data.asunto or (ot_data.descripcion[:50] + '...' if len(ot_data.descripcion) > 50 else ot_data.descripcion),
                fecha_creacion=datetime.utcnow(),
                categoria=ot_data.categoria,
                subcategoria=ot_data.subcategoria,
                zona=ot_data.zona,
                ciudad=ot_data.ciudad,
                tienda=ot_data.tienda,
                etapa=ot_data.estado,  # Usar 'etapa' en lugar de 'estado'
                prioridad=ot_data.prioridad,
                tipo_mantenimiento=ot_data.tipo_mantenimiento,
                tecnico_asignado=ot_data.tecnico_asignado,
                notas=f"Descripción: {ot_data.descripcion}\nObservaciones: {ot_data.observaciones}",
                fecha_visita=fecha_visita,
                solicitud_id=solicitud_dummy.id
            )
            
            # Intentar guardar en la base de datos
            db.add(nueva_ot)
            db.commit()
            db.refresh(nueva_ot)
            
            logger.info(f"✅ FastAPI: OT creada exitosamente con folio: {folio_number}")
            
            # Enviar notificación por email al técnico asignado (igual que en crear_ot)
            try:
                print(f"📧 FastAPI OT Directa: Iniciando proceso de notificación por email...")
                print(f"   - Técnico asignado: {ot_data.tecnico_asignado}")
                
                # Determinar email del técnico usando la misma lógica que crear_ot
                tecnico_email = None
                tecnico_nombre = ot_data.tecnico_asignado
                
                # Lista de técnicos conocidos con sus emails
                tecnicos_conocidos = {
                    'Samuel Sanchez': 'samuel.sanchez@cafequindio.com',
                    'Carlos Rodriguez': 'carlos.rodriguez@cafequindio.com', 
                    'Ana Martinez': 'ana.martinez@cafequindio.com',
                    'Luis Gomez': 'luis.gomez@cafequindio.com',
                    'Maria Torres': 'maria.torres@cafequindio.com'
                }
                
                # Si el técnico está en la lista conocida, usar ese email
                if ot_data.tecnico_asignado in tecnicos_conocidos:
                    tecnico_email = tecnicos_conocidos[ot_data.tecnico_asignado]
                    print(f"✅ FastAPI: Técnico encontrado en lista conocida - Email: {tecnico_email}")
                elif '@' in ot_data.tecnico_asignado:
                    # Si ya es un email
                    tecnico_email = ot_data.tecnico_asignado
                    tecnico_nombre = ot_data.tecnico_asignado.split('@')[0]
                    print(f"✅ FastAPI: Técnico ya es un email - Email: {tecnico_email}")
                else:
                    # Generar email basado en el nombre
                    nombre_partes = ot_data.tecnico_asignado.lower().replace(' ', '.').replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u')
                    tecnico_email = f"{nombre_partes}@cafequindio.com"
                    print(f"✅ FastAPI: Email generado para técnico - Email: {tecnico_email}")
                
                # Preparar datos para el email
                ubicacion = f"{ot_data.tienda}, {ot_data.ciudad} - {ot_data.zona}"
                
                print(f"📋 FastAPI: Datos para envío de email:")
                print(f"   - Folio: {folio_number}")
                print(f"   - Cliente: Sistema - OT Directa")
                print(f"   - Descripción: {ot_data.descripcion}")
                print(f"   - Prioridad: {ot_data.prioridad}")
                print(f"   - Email destinatario: {tecnico_email}")
                print(f"   - Nombre técnico: {tecnico_nombre}")
                
                # Solo enviar email si se pudo determinar un email válido
                if tecnico_email and '@' in tecnico_email:
                    print(f"📤 FastAPI OT Directa: LLAMANDO A send_technician_assignment_email...")
                    
                    resultado_email = send_technician_assignment_email(
                        to_email=tecnico_email,
                        technician_name=tecnico_nombre or tecnico_email.split('@')[0],
                        folio=str(folio_number),
                        client_name="Sistema - OT Directa",
                        description=ot_data.descripcion,
                        priority=ot_data.prioridad,
                        location=ubicacion
                    )
                    
                    print(f"📬 FastAPI OT Directa: RESULTADO DEL EMAIL: {resultado_email}")
                    
                    if resultado_email and resultado_email.get('success'):
                        print(f"✅ FastAPI OT Directa: EMAIL ENVIADO EXITOSAMENTE!")
                        logger.info(f"FastAPI: ✅ Email enviado exitosamente al técnico {tecnico_email}")
                    else:
                        error_msg = resultado_email.get('message', 'Respuesta vacía') if resultado_email else 'Sin respuesta'
                        print(f"❌ FastAPI OT Directa: ERROR AL ENVIAR EMAIL: {error_msg}")
                        print(f"🔍 FastAPI OT Directa: Respuesta completa: {resultado_email}")
                        logger.error(f"FastAPI: ❌ Error al enviar email: {error_msg}")
                else:
                    print(f"⚠️ FastAPI OT Directa: NO SE ENVIÓ EMAIL - Email no válido: {tecnico_email}")
                    logger.warning(f"FastAPI: ⚠️ No se envió email - Email no válido: {tecnico_email}")
                    
            except Exception as email_error:
                print(f"💥 FastAPI OT Directa: EXCEPCIÓN AL ENVIAR EMAIL: {str(email_error)}")
                print(f"🔍 FastAPI OT Directa: Tipo de error: {type(email_error)}")
                
                import traceback
                traceback_str = traceback.format_exc()
                print(f"📋 FastAPI OT Directa: Traceback completo:\n{traceback_str}")
                
                logger.error(f"FastAPI: 💥 Excepción enviando email al técnico: {str(email_error)}")
                logger.error(f"FastAPI: 🔍 Tipo de error: {type(email_error)}")
                logger.error(f"FastAPI: 📋 Traceback: {traceback_str}")
                # No fallar la creación de OT si falla la notificación por email
            
            print(f"🏁 FastAPI OT Directa: PROCESO DE EMAIL TERMINADO")
            
            # Respuesta compatible con Flask
            response_data = {
                'success': True,
                'message': 'Orden de trabajo creada exitosamente',
                'data': {
                    'folio': folio_number,
                    'asunto': nueva_ot.asunto,
                    'categoria': nueva_ot.categoria,
                    'subcategoria': nueva_ot.subcategoria,
                    'zona': nueva_ot.zona,
                    'ciudad': nueva_ot.ciudad,
                    'tienda': nueva_ot.tienda,
                    'tecnico_asignado': nueva_ot.tecnico_asignado,
                    'etapa': nueva_ot.etapa,
                    'prioridad': nueva_ot.prioridad,
                    'tipo_mantenimiento': nueva_ot.tipo_mantenimiento,
                    'notas': nueva_ot.notas,
                    'fecha_creacion': nueva_ot.fecha_creacion.isoformat(),
                    'fecha_visita': nueva_ot.fecha_visita.isoformat() if nueva_ot.fecha_visita else None
                }
            }
            
            return JSONResponse(content=response_data, status_code=201)
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ FastAPI: Error al guardar OT en base de datos: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={
                    'success': False,
                    'error': f'Error al guardar en base de datos: {str(e)}'
                }
            )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error general al crear OT: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno del servidor: {str(e)}'
            }
        )


@router.delete("/delete/{folio}")
async def eliminar_ot(
    folio: str,
    db: Session = Depends(get_db)
    # current_user: dict = Depends(get_current_user)  # Comentado temporalmente para testing
):
    """
    Eliminar una orden de trabajo por folio
    Migrado de Flask: DELETE /api/ots/delete/{folio}
    """
    try:
        logger.info(f"🗑️ FastAPI: Intentando eliminar OT con folio: {folio}")
        
        # Buscar la OT por folio
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        
        if not ot:
            logger.warning(f"❌ FastAPI: OT con folio {folio} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'Orden de trabajo con folio {folio} no encontrada'
                }
            )
        
        logger.info(f"✅ FastAPI: OT encontrada: ID={ot.id}, Folio={ot.folio}")
        
        try:
            # Restaurar el estado de la solicitud original a pendiente
            if ot.solicitud_id:
                solicitud = db.query(B2CSolicitudes).get(ot.solicitud_id)
                if solicitud:
                    solicitud.estado = 'pendiente'
                    logger.info(f"📝 FastAPI: Solicitud {ot.solicitud_id} restaurada a estado pendiente")
            
            # 1. Eliminar primero los archivos adjuntos relacionados
            archivos_adjuntos = db.query(ArchivosAdjuntosOT).filter(
                ArchivosAdjuntosOT.ot_id == ot.id
            ).all()
            
            for archivo in archivos_adjuntos:
                # Opcional: eliminar también del S3 si tienes configurado
                # s3_service.delete_file(archivo.s3_key)
                db.delete(archivo)
            
            logger.info(f"🗑️ FastAPI: Eliminados {len(archivos_adjuntos)} archivos adjuntos")
            
            # 2. Eliminar registros de historial de etapas relacionados
            historial_records = db.query(HistorialEtapa).filter(
                HistorialEtapa.ot_id == ot.id
            ).all()
            
            for historial in historial_records:
                db.delete(historial)
            
            logger.info(f"🗑️ FastAPI: Eliminados {len(historial_records)} registros de historial de etapas")
            
            # 3. Eliminar notas trazables relacionadas
            notas_trazables = db.query(NotasTrazablesOT).filter(
                NotasTrazablesOT.ot_folio == ot.folio  # Usar ot_folio en lugar de ot_id
            ).all()
            
            for nota in notas_trazables:
                db.delete(nota)
            
            logger.info(f"🗑️ FastAPI: Eliminadas {len(notas_trazables)} notas trazables")
            
            # 4. Eliminar firmas de conformidad relacionadas
            firmas = db.query(FirmaConformidad).filter(
                FirmaConformidad.ot_id == ot.id
            ).all()
            
            for firma in firmas:
                db.delete(firma)
            
            logger.info(f"🗑️ FastAPI: Eliminadas {len(firmas)} firmas de conformidad")
            
            # 5. Finalmente, eliminar la OT
            db.delete(ot)
            db.commit()
            
            logger.info(f"✅ FastAPI: OT {folio} eliminada exitosamente")
            
            # Respuesta compatible con Flask
            return JSONResponse(
                status_code=200,
                content={
                    'success': True,
                    'message': f'Orden de trabajo {folio} eliminada exitosamente'
                }
            )
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ FastAPI: Error al eliminar OT {folio}: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={
                    'success': False,
                    'error': f'Error interno del servidor: {str(e)}'
                }
            )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error general al eliminar OT {folio}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno del servidor: {str(e)}'
            }
        )


@router.get("/{folio}")
async def obtener_ot_por_folio(
    folio: int,
    db: Session = Depends(get_db)
):
    """
    Obtener OT por folio con archivos adjuntos
    Migrado desde Flask - Endpoint: /<int:folio>
    Compatible con frontend existente
    """
    logger.info(f"🔥 FastAPI: Función obtener_ot_por_folio ejecutada: folio {folio}")
    
    try:
        # Buscar la OT por folio
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        
        if not ot:
            logger.warning(f"❌ FastAPI: No se encontró OT con folio {folio}")
            error_response = {
                'success': False,
                'error': f'No se encontró OT con folio {folio}',
                'FUNCION_REEMPLAZADA': True
            }
            raise HTTPException(status_code=404, detail=error_response)
        
        logger.info(f"✅ FastAPI: OT encontrada: {ot.asunto}, solicitud_id: {ot.solicitud_id}")
        
        # Obtener archivos adjuntos de la solicitud original
        archivos_adjuntos = []
        
        if ot.solicitud_id:
            solicitud = db.query(B2CSolicitudes).filter(B2CSolicitudes.id == ot.solicitud_id).first()
            if solicitud and solicitud.archivo_url and solicitud.archivo_nombre:
                archivos_adjuntos.append({
                    'nombre': solicitud.archivo_nombre,
                    'url': solicitud.archivo_url,
                    'tipo': 'imagen_solicitud_original',
                    'descripcion': 'Imagen adjunta en la solicitud original'
                })
                logger.info(f"✅ FastAPI: Archivo adjunto agregado: {solicitud.archivo_nombre}")
            else:
                logger.info(f"⚠️ FastAPI: Solicitud sin archivos adjuntos")
        else:
            logger.info(f"⚠️ FastAPI: OT {folio} no tiene solicitud_id asociado")
        
        # 📎 OBTENER ARCHIVOS ADJUNTOS SUBIDOS POR TÉCNICOS
        archivos_bd = db.query(ArchivosAdjuntosOT).filter(
            ArchivosAdjuntosOT.ot_id == ot.id
        ).order_by(ArchivosAdjuntosOT.fecha_subida.desc()).all()
        
        for archivo_bd in archivos_bd:
            archivos_adjuntos.append({
                'id': archivo_bd.id,  # 🔥 ID necesario para eliminación
                'nombre': archivo_bd.nombre_original,
                'url': getattr(archivo_bd, 's3_url', None) or archivo_bd.nombre_guardado,
                'tipo': archivo_bd.tipo_archivo,
                'descripcion': archivo_bd.descripcion or f'Subido por {archivo_bd.subido_por}',
                'fecha': archivo_bd.fecha_subida.isoformat() if archivo_bd.fecha_subida else None,
                'tamano': archivo_bd.tamaño_archivo
            })
        
        logger.info(f"✅ FastAPI: Total archivos adjuntos: {len(archivos_adjuntos)} (solicitud + técnicos)")
        
        # Estructura de respuesta idéntica a Flask para mantener compatibilidad
        ot_data = {
            'id': ot.id,
            'folio': ot.folio,
            'solicitud_id': ot.solicitud_id,
            'tipo_solicitud': ot.tipo_solicitud,  # 🔥 Campo agregado para identificar B2B vs B2C
            'fecha_creacion': ot.fecha_creacion.isoformat() if ot.fecha_creacion else None,
            'fecha_visita': ot.fecha_visita.isoformat() if ot.fecha_visita else None,
            'asunto': ot.asunto,
            'categoria': ot.categoria,
            'subcategoria': ot.subcategoria,
            'zona': ot.zona,
            'ciudad': ot.ciudad,
            'tienda': ot.tienda,
            'tecnico_asignado': ot.tecnico_asignado,
            'estado': ot.etapa,
            'etapa': ot.etapa,
            'prioridad': ot.prioridad,
            'tipo_mantenimiento': ot.tipo_mantenimiento,
            'tiempo_estimado': ot.tiempo_estimado,
            'notas': ot.notas,
            'fecha_actualizacion': ot.fecha_actualizacion.isoformat() if ot.fecha_actualizacion else None,
            'fecha_completada': ot.fecha_completada.isoformat() if ot.fecha_completada else None,
            'archivos_adjuntos': archivos_adjuntos
        }
        
        response_data = {
            'success': True,
            'data': ot_data,
            'FUNCION_REEMPLAZADA': True,
            'archivos_encontrados': len(archivos_adjuntos)
        }
        
        logger.info(f"📤 FastAPI: Enviando respuesta con {len(archivos_adjuntos)} archivos adjuntos")
        
        return JSONResponse(content=response_data, status_code=200)
        
    except HTTPException:
        # Re-raise HTTPException para mantener el status code correcto
        raise
        
    except Exception as e:
        logger.error(f"💥 FastAPI: Error en obtener_ot_por_folio: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': str(e),
                'FUNCION_REEMPLAZADA': True
            }
        )


@router.get("/{folio}/archivos")
async def listar_archivos_ot(folio: int, db: Session = Depends(get_db)):
    """
    Listar archivos adjuntos de una OT desde la base de datos
    Migrado desde Flask - Funcionalidad idéntica
    """
    try:
        logger.info(f"📁 FastAPI: Listando archivos para OT {folio}")
        
        # Verificar que la OT existe
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        if not ot:
            logger.warning(f"❌ FastAPI: OT con folio {folio} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'OT con folio {folio} no encontrada'
                }
            )
        
        # Obtener archivos desde la base de datos
        archivos_bd = db.query(ArchivosAdjuntosOT).filter(
            ArchivosAdjuntosOT.ot_id == ot.id
        ).order_by(ArchivosAdjuntosOT.fecha_subida.desc()).all()
        
        archivos_info = []
        
        for archivo_bd in archivos_bd:
            # Para archivos en S3, verificamos que tengan s3_url
            archivo_existe = hasattr(archivo_bd, 's3_url') and archivo_bd.s3_url is not None
            
            archivo_info = {
                'id': archivo_bd.id,
                'nombre_original': archivo_bd.nombre_original,
                'nombre_guardado': archivo_bd.nombre_guardado,
                'tamano': archivo_bd.tamaño_archivo,
                'fecha_subida': archivo_bd.fecha_subida.isoformat() if archivo_bd.fecha_subida else None,
                'tipo': archivo_bd.tipo_archivo,
                'subido_por': archivo_bd.subido_por,
                'descripcion': archivo_bd.descripcion,
                'archivo_existe': archivo_existe,
                's3_url': getattr(archivo_bd, 's3_url', None),  # URL de S3 si existe
                's3_key': getattr(archivo_bd, 's3_key', None)   # Clave S3 si existe
            }
            
            archivos_info.append(archivo_info)
        
        logger.info(f"✅ FastAPI: Encontrados {len(archivos_info)} archivos para OT {folio}")
        
        # Log detallado de cada archivo
        for i, archivo in enumerate(archivos_info):
            logger.debug(f"📄 Archivo {i+1}: {archivo['nombre_original']} - Existe: {archivo['archivo_existe']}")
        
        response_data = {
            'success': True,
            'data': {
                'folio': folio,
                'archivos': archivos_info,
                'total_archivos': len(archivos_info)
            }
        }
        
        logger.info(f"📤 FastAPI: Enviando respuesta con {len(archivos_info)} archivos")
        
        return JSONResponse(content=response_data, status_code=200)
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al listar archivos de OT {folio}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno del servidor: {str(e)}'
            }
        )

# ===============================================================
# ENDPOINT PARA ACTUALIZAR PRIORIDAD
# ===============================================================

class ActualizarPrioridadRequest(BaseModel):
    prioridad: str

@router.put("/{folio}/prioridad")
async def actualizar_prioridad(
    folio: str,
    prioridad_data: ActualizarPrioridadRequest,
    db: Session = Depends(get_db)
):
    """
    Actualizar la prioridad de una OT
    Migrado de Flask: PUT /api/ots/{folio}/prioridad
    """
    try:
        logger.info(f"🔧 FastAPI: Actualizando prioridad de OT {folio} a: {prioridad_data.prioridad}")
        
        # Buscar la OT
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        if not ot:
            logger.error(f"❌ FastAPI: OT con folio {folio} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'OT con folio {folio} no encontrada'
                }
            )
        
        # Validar prioridad
        prioridades_validas = ['Alta', 'Media', 'Baja']
        if prioridad_data.prioridad not in prioridades_validas:
            logger.error(f"❌ FastAPI: Prioridad inválida: {prioridad_data.prioridad}")
            return JSONResponse(
                status_code=400,
                content={
                    'success': False,
                    'error': f'Prioridad inválida. Valores válidos: {", ".join(prioridades_validas)}'
                }
            )
        
        # Actualizar la prioridad
        prioridad_anterior = ot.prioridad
        ot.prioridad = prioridad_data.prioridad
        ot.fecha_actualizacion = datetime.utcnow()
        
        # Registrar en el historial
        historial = HistorialEtapa(
            ot_id=ot.id,
            etapa_anterior=ot.etapa,
            etapa_nueva=ot.etapa,  # La etapa no cambia, solo la prioridad
            usuario_cambio='Técnico',
            comentario=f'Prioridad cambiada de {prioridad_anterior} a {prioridad_data.prioridad}',
            fecha_cambio=datetime.utcnow()
        )
        db.add(historial)
        
        # Guardar cambios
        db.commit()
        
        logger.info(f"✅ FastAPI: Prioridad actualizada para OT {folio}: {ot.prioridad}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': f'Prioridad actualizada para OT {folio}',
                'data': {
                    'folio': ot.folio,
                    'prioridad': ot.prioridad,
                    'fecha_actualizacion': ot.fecha_actualizacion.isoformat()
                }
            }
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ FastAPI: Error al actualizar prioridad para OT {folio}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno del servidor: {str(e)}'
            }
        )

# ===============================================================
# ENDPOINT PARA ACTUALIZAR TIEMPO ESTIMADO
# ===============================================================

class ActualizarTiempoEstimadoRequest(BaseModel):
    tiempo_estimado: str

@router.put("/{folio}/tiempo-estimado")
async def actualizar_tiempo_estimado(
    folio: str,
    tiempo_data: ActualizarTiempoEstimadoRequest,
    db: Session = Depends(get_db)
):
    """
    Actualizar el tiempo estimado de una OT
    """
    try:
        logger.info(f"🔧 FastAPI: Actualizando tiempo estimado de OT {folio} a: {tiempo_data.tiempo_estimado}")
        
        # Buscar la OT
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        if not ot:
            logger.error(f"❌ FastAPI: OT con folio {folio} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'OT con folio {folio} no encontrada'
                }
            )
        
        # Guardar tiempo anterior para el historial
        tiempo_anterior = ot.tiempo_estimado or 'No especificado'
        
        # Actualizar el tiempo estimado
        ot.tiempo_estimado = tiempo_data.tiempo_estimado
        ot.fecha_actualizacion = datetime.utcnow()
        
        # Registrar en el historial
        historial = HistorialEtapa(
            ot_id=ot.id,
            etapa_anterior=ot.etapa,
            etapa_nueva=ot.etapa,  # La etapa no cambia, solo el tiempo
            usuario_cambio='Técnico',
            comentario=f'Tiempo estimado cambiado de "{tiempo_anterior}" a "{tiempo_data.tiempo_estimado}"',
            fecha_cambio=datetime.utcnow()
        )
        db.add(historial)
        
        # Guardar cambios
        db.commit()
        
        logger.info(f"✅ FastAPI: Tiempo estimado actualizado para OT {folio}: {ot.tiempo_estimado}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': f'Tiempo estimado actualizado para OT {folio}',
                'data': {
                    'folio': ot.folio,
                    'tiempo_estimado': ot.tiempo_estimado,
                    'fecha_actualizacion': ot.fecha_actualizacion.isoformat()
                }
            }
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ FastAPI: Error al actualizar tiempo estimado para OT {folio}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno del servidor: {str(e)}'
            }
        )

# ===============================================================
# ENDPOINT PARA ACTUALIZAR FECHA DE VISITA
# ===============================================================

class ActualizarFechaVisitaRequest(BaseModel):
    fecha_visita: Optional[str] = None

@router.put("/{folio}/fecha-visita")
async def actualizar_fecha_visita(
    folio: str,
    fecha_data: ActualizarFechaVisitaRequest,
    db: Session = Depends(get_db)
):
    """
    Actualizar la fecha de visita de una OT
    Migrado de Flask: PUT /api/ots/{folio}/fecha-visita
    """
    try:
        logger.info(f"📅 FastAPI: Actualizando fecha de visita para OT {folio}")
        
        # Buscar la OT
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        if not ot:
            logger.error(f"❌ FastAPI: OT con folio {folio} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'OT con folio {folio} no encontrada'
                }
            )
        
        # Convertir la fecha del frontend al formato de base de datos
        fecha_str = fecha_data.fecha_visita
        if fecha_str and fecha_str != "Por programar":
            try:
                # Intentar diferentes formatos de fecha
                try:
                    # Formato ISO (YYYY-MM-DD)
                    ot.fecha_visita = datetime.strptime(fecha_str, '%Y-%m-%d')
                except ValueError:
                    try:
                        # Formato DD/MM/YYYY
                        ot.fecha_visita = datetime.strptime(fecha_str, '%d/%m/%Y')
                    except ValueError:
                        # Formato MM/DD/YYYY
                        ot.fecha_visita = datetime.strptime(fecha_str, '%m/%d/%Y')
            except ValueError:
                logger.error(f"❌ FastAPI: Formato de fecha inválido: {fecha_str}")
                return JSONResponse(
                    status_code=400,
                    content={
                        'success': False,
                        'error': 'Formato de fecha inválido. Use YYYY-MM-DD, DD/MM/YYYY o MM/DD/YYYY'
                    }
                )
        else:
            ot.fecha_visita = None
        
        # Registrar en el historial
        fecha_anterior_str = ot.fecha_visita.strftime('%Y-%m-%d') if ot.fecha_visita else 'No programada'
        historial = HistorialEtapa(
            ot_id=ot.id,
            etapa_anterior=ot.etapa,
            etapa_nueva=ot.etapa,  # La etapa no cambia, solo la fecha
            usuario_cambio='Técnico',
            comentario=f'Fecha de visita actualizada a {fecha_str}',
            fecha_cambio=datetime.utcnow()
        )
        db.add(historial)
        
        # Actualizar la fecha de modificación
        ot.fecha_actualizacion = datetime.utcnow()
        
        # Guardar cambios
        db.commit()
        
        logger.info(f"✅ FastAPI: Fecha de visita actualizada para OT {folio}: {ot.fecha_visita}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': f'Fecha de visita actualizada para OT {folio}',
                'data': {
                    'folio': ot.folio,
                    'fecha_visita': ot.fecha_visita.isoformat() if ot.fecha_visita else None,
                    'fecha_actualizacion': ot.fecha_actualizacion.isoformat()
                }
            }
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ FastAPI: Error al actualizar fecha de visita para OT {folio}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno del servidor: {str(e)}'
            }
        )


# ===============================================================
# ENDPOINT PARA ACTUALIZAR TIPO DE MANTENIMIENTO
# ===============================================================

class ActualizarTipoMantenimientoRequest(BaseModel):
    tipo_mantenimiento: str

@router.put("/{folio}/tipo-mantenimiento")
async def actualizar_tipo_mantenimiento(
    folio: str,
    tipo_data: ActualizarTipoMantenimientoRequest,
    db: Session = Depends(get_db)
):
    """
    Actualizar el tipo de mantenimiento de una OT
    Migrado de Flask: PUT /api/ots/{folio}/tipo-mantenimiento
    """
    try:
        logger.info(f"🔧 FastAPI: Actualizando tipo de mantenimiento para OT {folio}")
        
        # Buscar la OT
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        if not ot:
            logger.error(f"❌ FastAPI: OT con folio {folio} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'OT con folio {folio} no encontrada'
                }
            )
        
        # Validar tipo de mantenimiento
        tipo_mantenimiento = tipo_data.tipo_mantenimiento.lower()
        tipos_validos = ['correctivo', 'preventivo', 'predictivo']
        
        if tipo_mantenimiento not in tipos_validos:
            logger.error(f"❌ FastAPI: Tipo de mantenimiento inválido: {tipo_mantenimiento}")
            return JSONResponse(
                status_code=400,
                content={
                    'success': False,
                    'error': f'Tipo de mantenimiento inválido. Valores válidos: {", ".join(tipos_validos)}'
                }
            )
        
        # Actualizar el tipo de mantenimiento
        tipo_anterior = ot.tipo_mantenimiento or 'No especificado'
        ot.tipo_mantenimiento = tipo_mantenimiento
        
        # Registrar en el historial
        historial = HistorialEtapa(
            ot_id=ot.id,
            etapa_anterior=ot.etapa,
            etapa_nueva=ot.etapa,  # La etapa no cambia, solo el tipo
            usuario_cambio='Técnico',
            comentario=f'Tipo de mantenimiento cambiado de "{tipo_anterior}" a "{tipo_mantenimiento}"',
            fecha_cambio=datetime.utcnow()
        )
        db.add(historial)
        
        # Actualizar la fecha de modificación
        ot.fecha_actualizacion = datetime.utcnow()
        
        # Guardar cambios
        db.commit()
        
        logger.info(f"✅ FastAPI: Tipo de mantenimiento actualizado para OT {folio}: {ot.tipo_mantenimiento}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': f'Tipo de mantenimiento actualizado para OT {folio}',
                'data': {
                    'folio': ot.folio,
                    'tipo_mantenimiento': ot.tipo_mantenimiento,
                    'fecha_actualizacion': ot.fecha_actualizacion.isoformat()
                }
            }
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ FastAPI: Error al actualizar tipo de mantenimiento para OT {folio}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno del servidor: {str(e)}'
            }
        )


# ===============================================================
# ENDPOINT PARA ASIGNAR TÉCNICO
# ===============================================================

class AsignarTecnicoRequest(BaseModel):
    tecnico_id: int
    tecnico_nombre: str
    tecnico_email: str

@router.put("/{folio}/asignar-tecnico")
async def asignar_tecnico(
    folio: str,
    tecnico_data: AsignarTecnicoRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Asignar técnico a una OT
    Solo accesible por administradores
    """
    try:
        logger.info(f"👤 FastAPI: Asignando técnico para OT {folio}")
        
        # Verificar que el usuario es admin
        if current_user.rol != 'admin':
            logger.error(f"❌ FastAPI: Usuario sin permisos para asignar técnico")
            return JSONResponse(
                status_code=403,
                content={
                    'success': False,
                    'error': 'No tienes permisos para asignar técnicos'
                }
            )
        
        # Buscar la OT
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        if not ot:
            logger.error(f"❌ FastAPI: OT con folio {folio} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'OT con folio {folio} no encontrada'
                }
            )
        
        # Actualizar técnico asignado
        tecnico_anterior = ot.tecnico_asignado or 'Sin técnico asignado'
        ot.tecnico_asignado = tecnico_data.tecnico_nombre
        
        # Registrar en el historial
        historial = HistorialEtapa(
            ot_id=ot.id,
            etapa_anterior=ot.etapa,
            etapa_nueva=ot.etapa,  # La etapa no cambia, solo el técnico
            usuario_cambio=current_user.nombre or current_user.email,
            comentario=f'Técnico asignado cambiado de "{tecnico_anterior}" a "{tecnico_data.tecnico_nombre}" (ID: {tecnico_data.tecnico_id})',
            fecha_cambio=datetime.utcnow()
        )
        db.add(historial)
        
        # Actualizar la fecha de modificación
        ot.fecha_actualizacion = datetime.utcnow()
        
        # Guardar cambios
        db.commit()
        
        logger.info(f"✅ FastAPI: Técnico asignado para OT {folio}: {tecnico_data.tecnico_nombre}")
        
        # Enviar notificación por email
        try:
            logger.info(f"📧 FastAPI: ==> INICIANDO PROCESO DE EMAIL <==")
            logger.info(f"📧 FastAPI: OT ID: {ot.id}")
            logger.info(f"📧 FastAPI: Técnico: {tecnico_data.tecnico_nombre}")
            logger.info(f"📧 FastAPI: Email técnico: {tecnico_data.tecnico_email}")
            
            notification_service = NotificationService()
            logger.info(f"📧 FastAPI: Servicio de notificación creado correctamente")
            
            resultado = notification_service.notify_technician_assignment(ot.id)
            logger.info(f"📧 FastAPI: Resultado completo del servicio: {resultado}")
            
            if resultado.get('success'):
                logger.info(f"🎉 FastAPI: EMAIL ENVIADO EXITOSAMENTE a {tecnico_data.tecnico_email}")
            else:
                logger.error(f"❌ FastAPI: ERROR EN ENVÍO DE EMAIL: {resultado.get('message')}")
                
        except Exception as email_error:
            logger.error(f"💥 FastAPI: EXCEPCIÓN EN ENVÍO DE EMAIL: {str(email_error)}")
            logger.error(f"💥 FastAPI: Tipo de error: {type(email_error).__name__}")
            import traceback
            logger.error(f"💥 FastAPI: Stack trace: {traceback.format_exc()}")
            # No fallar la asignación por un error de email
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': f'Técnico asignado correctamente para OT {folio}',
                'data': {
                    'folio': ot.folio,
                    'tecnico_asignado': ot.tecnico_asignado,
                    'fecha_actualizacion': ot.fecha_actualizacion.isoformat()
                }
            }
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ FastAPI: Error al asignar técnico para OT {folio}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno del servidor: {str(e)}'
            }
        )


# ===== ENDPOINTS PARA ARCHIVOS ADJUNTOS =====

@router.post("/{folio}/archivos")
async def subir_archivos_ot(
    folio: int,
    archivos: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """Subir archivos adjuntos a una OT - FastAPI"""
    try:
        logger.info(f"📤 FastAPI: === INICIO SUBIDA DE ARCHIVOS ===")
        logger.info(f"📤 FastAPI: Folio recibido: {folio}")
        logger.info(f"📤 FastAPI: Archivos recibidos: {len(archivos)}")
        
        # Verificar que la OT existe
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        if not ot:
            logger.error(f"❌ FastAPI: OT con folio {folio} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'OT con folio {folio} no encontrada'
                }
            )
        
        logger.info(f"✅ FastAPI: OT encontrada: {ot.folio}")
        
        # Verificar que se enviaron archivos válidos
        if not archivos or all(archivo.filename == '' for archivo in archivos):
            logger.error("❌ FastAPI: Lista de archivos vacía o sin nombres")
            return JSONResponse(
                status_code=400,
                content={
                    'success': False,
                    'error': 'No se seleccionaron archivos válidos'
                }
            )
        
        archivos_guardados = []
        
        for archivo in archivos:
            if archivo and archivo.filename != '':
                # Leer el contenido del archivo
                contenido = await archivo.read()
                
                # Crear un objeto tipo File para el S3Service (compatible con Flask)
                import io
                
                class FileObj:
                    def __init__(self, filename, content, mimetype):
                        self.filename = filename
                        self.mimetype = mimetype
                        # Crear un BytesIO para que tenga métodos como seek()
                        self._stream = io.BytesIO(content)
                    
                    def read(self, size=-1):
                        return self._stream.read(size)
                    
                    def seek(self, position, whence=0):
                        return self._stream.seek(position, whence)
                    
                    def tell(self):
                        return self._stream.tell()
                    
                    def close(self):
                        return self._stream.close()
                
                file_obj = FileObj(archivo.filename, contenido, archivo.content_type)
                
                # Subir archivo a S3
                upload_result = s3_service.upload_file(file_obj, folder='ots', prefix=f'ot_{folio}')
                
                if upload_result['success']:
                    # Determinar el tipo de archivo
                    tipo_archivo = 'imagen' if archivo.content_type and archivo.content_type.startswith('image/') else 'documento'
                    
                    # Guardar en la base de datos con URLs de S3
                    archivo_bd = ArchivosAdjuntosOT(
                        ot_id=ot.id,
                        nombre_original=upload_result['original_filename'],
                        nombre_guardado=upload_result['filename'],
                        s3_url=upload_result['url'],
                        s3_key=upload_result['key'],
                        tipo_archivo=tipo_archivo,
                        tamaño_archivo=upload_result['size'],
                        subido_por='Técnico',  # Aquí podrías obtener el email del usuario logueado
                        descripcion=f'Archivo subido por técnico a S3 - FastAPI'
                    )
                    
                    db.add(archivo_bd)
                    
                    archivo_info = {
                        'id': None,  # Se asignará después del commit
                        'nombre_original': upload_result['original_filename'],
                        'nombre_guardado': upload_result['filename'],
                        's3_url': upload_result['url'],
                        's3_key': upload_result['key'],
                        'tipo': tipo_archivo,
                        'tamano': upload_result['size'],
                        'mime_type': archivo.content_type,
                        'fecha_subida': datetime.now().isoformat()
                    }
                    
                    archivos_guardados.append(archivo_info)
                    logger.info(f"✅ FastAPI: Archivo subido a S3: {upload_result['filename']}")
                else:
                    logger.error(f"❌ FastAPI: Error subiendo archivo {archivo.filename}: {upload_result['error']}")
                    return JSONResponse(
                        status_code=400,
                        content={
                            'success': False,
                            'error': f'Error subiendo archivo {archivo.filename}: {upload_result["error"]}'
                        }
                    )
        
        # Hacer commit de los archivos en la base de datos
        db.commit()
        
        # Actualizar los IDs de los archivos después del commit
        archivos_bd = (
            db.query(ArchivosAdjuntosOT)
            .filter(ArchivosAdjuntosOT.ot_id == ot.id)
            .order_by(ArchivosAdjuntosOT.fecha_subida.desc())
            .limit(len(archivos_guardados))
            .all()
        )
        
        for i, archivo_bd in enumerate(reversed(archivos_bd)):
            if i < len(archivos_guardados):
                archivos_guardados[i]['id'] = archivo_bd.id
        
        # Registrar en el historial
        historial = HistorialEtapa(
            ot_id=ot.id,
            etapa_anterior=ot.etapa,
            etapa_nueva=ot.etapa,  # La etapa no cambia
            usuario_cambio='Técnico',
            comentario=f'Archivos adjuntados vía FastAPI: {", ".join([a["nombre_original"] for a in archivos_guardados])}',
            fecha_cambio=datetime.utcnow()
        )
        db.add(historial)
        db.commit()
        
        logger.info(f"✅ FastAPI: {len(archivos_guardados)} archivos subidos exitosamente para OT {folio} y guardados en BD")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': f'{len(archivos_guardados)} archivos subidos exitosamente',
                'data': {
                    'folio': folio,
                    'archivos': archivos_guardados,
                    'total_archivos': len(archivos_guardados)
                }
            }
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ FastAPI: Error interno del servidor en subida de archivos: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error interno del servidor: {str(e)}'
            }
        )


@router.delete("/{folio}/archivos/{archivo_id}")
async def eliminar_archivo_adjunto(
    folio: str,
    archivo_id: int,
    db: Session = Depends(get_db),
    s3_service: S3Service = Depends(get_s3_service)
):
    """
    🗑️ Eliminar archivo adjunto individual de una OT
    
    Args:
        folio: Número de folio de la OT
        archivo_id: ID del archivo a eliminar
        db: Sesión de base de datos
        s3_service: Servicio S3 para eliminación de archivos
        
    Returns:
        JSONResponse: Confirmación de eliminación
        
    Migrado de Flask: DELETE /api/ots/{folio}/archivos/{archivo_id}
    """
    try:
        logger.info(f"🗑️ FastAPI: Eliminando archivo {archivo_id} de OT {folio}")
        
        # Verificar que la OT existe
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        if not ot:
            logger.error(f"❌ FastAPI: OT {folio} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'OT {folio} no encontrada'
                }
            )
        
        # Buscar el archivo adjunto
        archivo = db.query(ArchivosAdjuntosOT).filter(
            ArchivosAdjuntosOT.id == archivo_id,
            ArchivosAdjuntosOT.ot_id == ot.id
        ).first()
        
        if not archivo:
            logger.error(f"❌ FastAPI: Archivo {archivo_id} no encontrado para OT {folio}")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'Archivo {archivo_id} no encontrado'
                }
            )
        
        archivo_nombre = archivo.nombre_original
        s3_key = archivo.s3_key
        
        # Eliminar de S3 si el servicio está disponible y hay clave S3
        if s3_service and s3_key:
            try:
                await s3_service.delete_file(s3_key)
                logger.info(f"✅ FastAPI: Archivo eliminado de S3: {s3_key}")
            except Exception as s3_error:
                logger.warning(f"⚠️ FastAPI: Error al eliminar de S3 {s3_key}: {str(s3_error)}")
                # Continuar con la eliminación de BD aunque falle S3
        
        # Eliminar de la base de datos
        db.delete(archivo)
        db.commit()
        
        logger.info(f"✅ FastAPI: Archivo {archivo_nombre} eliminado exitosamente de OT {folio}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': f'Archivo {archivo_nombre} eliminado exitosamente',
                'data': {
                    'folio': folio,
                    'archivo_id': archivo_id,
                    'archivo_nombre': archivo_nombre
                }
            }
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ FastAPI: Error eliminando archivo {archivo_id} de OT {folio}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error al eliminar archivo: {str(e)}'
            }
        )


@router.get("/{folio}/generar-pdf")
async def generar_pdf_ot(
    folio: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Generar PDF de OT usando template Excel
    Endpoint: /api/v1/ots/{folio}/generar-pdf
    """
    logger.info(f"FastAPI: Generando PDF para OT {folio}")
    
    try:
        # Buscar la OT
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        
        if not ot:
            logger.warning(f"FastAPI: OT {folio} no encontrada para generar PDF")
            raise HTTPException(
                status_code=404,
                detail={'success': False, 'error': f'OT {folio} no encontrada'}
            )
        
        # Obtener datos de la solicitud relacionada si existe
        solicitud_data = None
        if ot.solicitud_id:
            if ot.tipo_solicitud == 'B2B':
                solicitud = db.query(B2BSolicitud).filter(B2BSolicitud.id == ot.solicitud_id).first()
            else:
                solicitud = db.query(B2CSolicitudes).filter(B2CSolicitudes.id == ot.solicitud_id).first()
            
            if solicitud:
                solicitud_data = {
                    'nombre': getattr(solicitud, 'nombre', 'Cliente no especificado'),
                    'correo': getattr(solicitud, 'correo', 'Sin correo'),
                    'telefono': getattr(solicitud, 'telefono', 'Sin teléfono'),
                    'descripcion': getattr(solicitud, 'descripcion', 'Sin descripción'),
                    'archivo_url': getattr(solicitud, 'archivo_url', None),
                    # Campos específicos para B2B
                    'razon_social': getattr(solicitud, 'razon_social', {}).get('nombre', '') if hasattr(solicitud, 'razon_social') and solicitud.razon_social else '',
                    'sucursal': getattr(solicitud, 'sucursal', {}).get('nombre', '') if hasattr(solicitud, 'sucursal') and solicitud.sucursal else '',
                    'equipo': getattr(solicitud, 'equipo', {}).get('nombre', '') if hasattr(solicitud, 'equipo') and solicitud.equipo else ''
                }
        
        # Preparar datos mapeados usando servicio directo con reglas de Planta San Pedro
        datos_ot_mapeados = mapear_datos_ot_para_servicio_directo(ot, solicitud_data, db)
        
        # Usar el nuevo generador con metodología Excel completa
        import os
        from pathlib import Path
        template_path = Path(__file__).parent.parent / "templates" / "FO-MT-006 Orden de trabajo de mantenimiento v1.xlsx"
        pdf_generator = ExcelDirectPDFService(str(template_path), s3_service=s3, db_session=db)
        pdf_buffer = pdf_generator.generar_pdf_directo(datos_ot_mapeados, folio)
        
        if not pdf_buffer:
            raise HTTPException(
                status_code=500,
                detail={'success': False, 'error': 'Error al generar PDF'}
            )
        
        logger.info(f"FastAPI: PDF generado exitosamente para OT {folio}")
        
        # Retornar el PDF como respuesta
        import io
        
        pdf_buffer.seek(0)
        
        return StreamingResponse(
            io.BytesIO(pdf_buffer.read()),
            media_type='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="OT_{folio}_Mantenimiento.pdf"'
            }
        )
        
    except Exception as e:
        logger.error(f"FastAPI: Error generando PDF para OT {folio}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={'success': False, 'error': f'Error generando PDF: {str(e)}'}
        )


@router.get("/{folio}/generar-pdf-directo")
async def generar_pdf_ot_directo(
    folio: int,
    nota_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Generar PDF de OT manteniendo diseño exacto del Excel original
    Usa LibreOffice headless para conversión nativa
    Endpoint: /api/v1/ots/{folio}/generar-pdf-directo
    """
    logger.info(f"Generando PDF directo para OT {folio} manteniendo diseño original")
    
    try:
        # Buscar la OT con todas las relaciones cargadas
        ot = db.query(OTSolicitud).options(
            joinedload(OTSolicitud.archivos),
            joinedload(OTSolicitud.solicitud_b2c),
            joinedload(OTSolicitud.solicitud_b2b)
        ).filter(OTSolicitud.folio == folio).first()
        
        if not ot:
            logger.warning(f"OT {folio} no encontrada para generar PDF")
            raise HTTPException(
                status_code=404,
                detail={'success': False, 'error': f'OT {folio} no encontrada'}
            )
        
        # 🔍 DEBUG: Verificar datos de planta disponibles
        logger.info(f"🔍 DEBUG OT {folio}:")
        logger.info(f"  - tipo_solicitud: {ot.tipo_solicitud}")
        logger.info(f"  - solicitud_id: {ot.solicitud_id}")
        logger.info(f"  - solicitud_b2c disponible: {ot.solicitud_b2c is not None}")
        if ot.solicitud_b2c:
            logger.info(f"  - tipo_formulario B2C: {getattr(ot.solicitud_b2c, 'tipo_formulario', 'NO DISPONIBLE')}")
            logger.info(f"  - planta B2C: {getattr(ot.solicitud_b2c, 'planta', 'NO DISPONIBLE')}")
            logger.info(f"  - activo B2C: {getattr(ot.solicitud_b2c, 'activo', 'NO DISPONIBLE')}")
            logger.info(f"  - categoria B2C: {getattr(ot.solicitud_b2c, 'categoria', 'NO DISPONIBLE')}")
            logger.info(f"  - subcategoria B2C: {getattr(ot.solicitud_b2c, 'subcategoria', 'NO DISPONIBLE')}")
        
        # Obtener datos de la solicitud relacionada usando las relaciones ya cargadas
        solicitud_data = None
        solicitud = None
        
        # Usar las relaciones ya cargadas con joinedload
        if ot.tipo_solicitud == 'B2B' and ot.solicitud_b2b:
            solicitud = ot.solicitud_b2b
        elif ot.tipo_solicitud == 'B2C' and ot.solicitud_b2c:
            solicitud = ot.solicitud_b2c
            
            if solicitud:
                solicitud_data = {
                    'nombre': getattr(solicitud, 'nombre', 'Cliente no especificado'),
                    'correo': getattr(solicitud, 'correo', 'Sin correo'),
                    'telefono': getattr(solicitud, 'telefono', 'Sin teléfono'),
                    'descripcion': getattr(solicitud, 'descripcion', 'Sin descripción'),
                    'archivo_url': getattr(solicitud, 'archivo_url', None),
                    # Campos específicos para B2B
                    'razon_social': getattr(solicitud, 'razon_social', {}).get('nombre', '') if hasattr(solicitud, 'razon_social') and solicitud.razon_social else '',
                    'sucursal': getattr(solicitud, 'sucursal', {}).get('nombre', '') if hasattr(solicitud, 'sucursal') and solicitud.sucursal else '',
                    'equipo': getattr(solicitud, 'equipo', {}).get('nombre', '') if hasattr(solicitud, 'equipo') and solicitud.equipo else ''
                }
        
        # Preparar datos para el servicio directo
        datos_ot_directo = mapear_datos_ot_para_servicio_directo(ot, solicitud_data, db, nota_id)
        
        # LOG ESPECÍFICO PARA DEBUGGEAR NOTAS
        logger.info(f"🔍 DEBUG - Notas del técnico en datos_ot_directo: '{datos_ot_directo.get('notas_tecnico', 'NO ENCONTRADO')}'")
        
        # 🎯 LOG ESPECÍFICO PARA DEBUG DE TIPO SOLICITUD
        logger.info(f"🎯 DEBUG FINAL - Tipo solicitud enviado al PDF: '{datos_ot_directo.get('tipo_solicitud', 'NO ENCONTRADO')}'")
        logger.info(f"🎯 DEBUG FINAL - Categoría enviada al PDF: '{datos_ot_directo.get('categoria', 'NO ENCONTRADO')}'")
        logger.info(f"🎯 DEBUG FINAL - Subcategoría enviada al PDF: '{datos_ot_directo.get('subcategoria', 'NO ENCONTRADO')}'")
        logger.info(f"🎯 DEBUG FINAL - Zona enviada al PDF: '{datos_ot_directo.get('zona_planta_tienda', 'NO ENCONTRADO')}'")
        
        logger.info(f"🔍 DEBUG - Datos completos: {datos_ot_directo}")
        
        # Usar el servicio de PDF directo que mantiene diseño exacto (pasando S3 service y DB session)
        pdf_service = ExcelDirectPDFService(s3_service=s3_service, db_session=db)
        
        # Verificar que LibreOffice esté disponible
        if not pdf_service.verificar_libreoffice():
            raise HTTPException(
                status_code=500,
                detail={'success': False, 'error': 'LibreOffice no está disponible en el servidor'}
            )
        
        # Generar PDF manteniendo diseño exacto
        pdf_content = pdf_service.generar_pdf_directo(datos_ot_directo, folio)
        
        if not pdf_content:
            raise HTTPException(
                status_code=500,
                detail={'success': False, 'error': 'Error al generar PDF'}
            )
        
        logger.info(f"PDF directo generado exitosamente para OT {folio}")
        
        # Retornar el PDF como respuesta
        import io
        
        return StreamingResponse(
            io.BytesIO(pdf_content),
            media_type='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="OT_{folio}_Mantenimiento_Original.pdf"'
            }
        )
        
    except Exception as e:
        logger.error(f"Error generando PDF directo para OT {folio}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={'success': False, 'error': f'Error generando PDF: {str(e)}'}
        )


def obtener_notas_trazables(ot: OTSolicitud, db: Session = None, nota_id: Optional[int] = None) -> str:
    """
    Obtiene las notas trazables del técnico para una OT específica con información del autor
    
    Args:
        nota_id: Si se proporciona, solo retorna la nota con este ID específico
    """
    try:
        if not db:
            logger.warning(f"⚠️ No hay sesión de DB disponible para obtener notas trazables de OT {ot.folio}")
            return ot.notas or ""  # Fallback al campo original
        
        # Obtener notas trazables ordenadas por fecha de creación
        query = db.query(NotasTrazablesOT).filter(
            NotasTrazablesOT.ot_folio == ot.folio
        )
        
        # Si se especifica una nota específica, filtrar por ID
        if nota_id is not None:
            query = query.filter(NotasTrazablesOT.id == nota_id)
            logger.info(f"🎯 Filtrando por nota específica ID: {nota_id}")
        
        notas_trazables = query.order_by(NotasTrazablesOT.fecha_creacion.asc()).all()
        
        if not notas_trazables:
            logger.info(f"⚠️ No se encontraron notas trazables para OT {ot.folio}")
            return ot.notas or ""  # Fallback al campo original
        
        # Concatenar todas las notas trazables con información del autor
        notas_list = []
        for nota in notas_trazables:
            if hasattr(nota, 'nota') and nota.nota and nota.nota.strip():
                # Determinar quién hizo la nota
                autor = ""
                if nota.creado_por and nota.creado_por.strip():
                    autor = nota.creado_por.strip()
                elif nota.nombre_usuario and nota.nombre_usuario.strip():
                    autor = nota.nombre_usuario.strip()
                else:
                    autor = "Usuario desconocido"
                
                # Agregar fecha si está disponible
                fecha_str = ""
                if nota.fecha_creacion:
                    try:
                        fecha_str = f" ({nota.fecha_creacion.strftime('%d/%m/%Y %H:%M')})"
                    except:
                        fecha_str = ""
                
                # Formatear la nota con autor y fecha
                nota_formateada = f"• {nota.nota.strip()}\n  └─ Por: {autor}{fecha_str}"
                notas_list.append(nota_formateada)
        
        if notas_list:
            resultado = "\n\n".join(notas_list)  # Doble salto para separar mejor las notas
            logger.info(f"✅ Obtenidas {len(notas_list)} notas trazables para OT {ot.folio}")
            logger.info(f"🔍 DEBUG - Notas trazables obtenidas: '{resultado[:150]}...' (primeros 150 chars)")
            return resultado
        else:
            logger.info(f"⚠️ No se encontraron notas con contenido para OT {ot.folio}")
            return ot.notas or ""  # Fallback al campo original
            
    except Exception as e:
        logger.error(f"❌ Error obteniendo notas trazables para OT {ot.folio}: {str(e)}")
        return ot.notas or ""  # Fallback al campo original


def mapear_datos_ot_para_servicio_directo(ot: OTSolicitud, solicitud_data: dict = None, db: Session = None, nota_id: Optional[int] = None) -> dict:
    """
    Mapea los datos de una OT al formato JSON requerido para el ExcelDirectPDFService
    Sigue exactamente el formato especificado en los requerimientos
    
    Args:
        nota_id: Si se proporciona, solo incluirá esta nota específica en lugar de todas las notas
    """
    try:
        logger.info(f"🔍 DEBUG MAPEO - Iniciando mapeo para OT {ot.folio}")
        logger.info(f"🔍 DEBUG MAPEO - OT zona: '{ot.zona}'")
        logger.info(f"🔍 DEBUG MAPEO - OT tipo_solicitud: '{ot.tipo_solicitud}'")
        logger.info(f"🔍 DEBUG MAPEO - OT tiene solicitud_b2c: {ot.solicitud_b2c is not None}")
        
        if ot.solicitud_b2c:
            logger.info(f"🔍 DEBUG MAPEO - Solicitud B2C tipo_formulario: '{ot.solicitud_b2c.tipo_formulario}'")
            logger.info(f"🔍 DEBUG MAPEO - Solicitud B2C planta: '{ot.solicitud_b2c.planta}'")
            logger.info(f"🔍 DEBUG MAPEO - Solicitud B2C activo: '{ot.solicitud_b2c.activo}'")
        
        # Fecha actual para exportación
        fecha_exportacion = datetime.now().strftime('%d/%m/%Y')
        
        # Función auxiliar para formatear fechas
        def formatear_fecha(fecha):
            if fecha:
                return fecha.strftime('%d/%m/%Y') if hasattr(fecha, 'strftime') else str(fecha)
            return None
        
        # 🏭 Obtener datos específicos desde las solicitudes originales
        datos_planta = {}
        datos_b2b = {}
        
        # Obtener datos de Planta San Pedro (B2C)
        if ot.tipo_solicitud == 'B2C' and ot.solicitud_b2c:
            solicitud_b2c = ot.solicitud_b2c
            if solicitud_b2c.tipo_formulario == 'planta_san_pedro':
                datos_planta = {
                    'planta': solicitud_b2c.planta or "",
                    'activo': solicitud_b2c.activo or "",
                    'zona': solicitud_b2c.zona or "",
                    'categoria_original': solicitud_b2c.categoria or "",
                    'subcategoria_original': solicitud_b2c.subcategoria or ""
                }
                logger.info(f"🏭 Datos Planta San Pedro obtenidos de solicitud: {datos_planta}")
        
        # Obtener datos de Comercial B2B
        elif ot.tipo_solicitud == 'B2B' and ot.solicitud_b2b:
            solicitud_b2b = ot.solicitud_b2b
            datos_b2b = {
                'ciudad': solicitud_b2b.ciudad.nombre if solicitud_b2b.ciudad else "",
                'razon_social': solicitud_b2b.razon_social.nombre if solicitud_b2b.razon_social else "",
                'sucursal': solicitud_b2b.sucursal.nombre if solicitud_b2b.sucursal else "",
                'categoria': solicitud_b2b.categoria.nombre if solicitud_b2b.categoria else "",
                'subcategoria': solicitud_b2b.subcategoria.nombre if solicitud_b2b.subcategoria else "",
                'equipo': solicitud_b2b.equipo.nombre if solicitud_b2b.equipo else ""
            }
            logger.info(f"🏢 Datos Comercial B2B obtenidos de solicitud: {datos_b2b}")
        
        # Determinar zona/planta/tienda según prioridad especificada
        zona_planta_tienda = ""
        logger.info(f"🔍 DEBUG ZONA - ot.tienda: '{ot.tienda}'")
        logger.info(f"🔍 DEBUG ZONA - datos_planta disponible: {bool(datos_planta)}")
        logger.info(f"🔍 DEBUG ZONA - datos_b2b disponible: {bool(datos_b2b)}")
        
        if ot.tienda and ot.tienda not in ['N/A', 'Sin especificar', '', None]:
            zona_planta_tienda = ot.tienda
            logger.info(f"🔍 DEBUG ZONA - Usando ot.tienda: '{zona_planta_tienda}'")
        elif datos_planta.get('planta'):
            # Para Planta San Pedro, combinar planta y activo
            zona_planta_tienda = datos_planta['planta']
            logger.info(f"🔍 DEBUG ZONA - Asignando planta: '{zona_planta_tienda}'")
            if datos_planta.get('activo'):
                zona_planta_tienda += f" - {datos_planta['activo']}"
                logger.info(f"🔍 DEBUG ZONA - Combinando con activo: '{zona_planta_tienda}'")
            logger.info(f"🏭 Usando planta + activo de solicitud: {zona_planta_tienda}")
        elif datos_b2b.get('razon_social'):
            # Para Comercial B2B, combinar razón social y sucursal
            zona_planta_tienda = datos_b2b['razon_social']
            if datos_b2b.get('sucursal'):
                zona_planta_tienda += f" - {datos_b2b['sucursal']}"
            logger.info(f"🏢 Usando razón social + sucursal de B2B: {zona_planta_tienda}")
        elif ot.zona:
            zona_planta_tienda = ot.zona
            logger.info(f"🔍 DEBUG ZONA - Usando ot.zona: '{zona_planta_tienda}'")
        else:
            zona_planta_tienda = ""
            logger.info(f"🔍 DEBUG ZONA - Sin datos disponibles, usando vacío")
        
        logger.info(f"🔍 DEBUG ZONA - Valor final zona_planta_tienda: '{zona_planta_tienda}'")
        
        # 🏭 Aplicar reglas específicas para diferentes tipos de solicitud
        es_planta_san_pedro = (
            ot.zona == 'Planta San Pedro' or 
            datos_planta.get('planta') or
            (ot.tipo_solicitud and 'planta' in ot.tipo_solicitud.lower()) or
            (ot.solicitud_b2c and ot.solicitud_b2c.tipo_formulario == 'planta_san_pedro')
        )
        
        es_comercial_b2b = (ot.tipo_solicitud == 'B2B' and ot.solicitud_b2b is not None)
        
        ciudad_final = ot.ciudad or ""
        categoria_final = ot.categoria or ""
        subcategoria_final = ot.subcategoria or ""
        
        if es_planta_san_pedro:
            logger.info(f"🏭 Aplicando reglas específicas de Planta San Pedro para OT {ot.folio}")
            # Ciudad siempre Armenia para Planta San Pedro
            ciudad_final = "Armenia"
            # Categoría siempre "Activos" para Planta San Pedro
            categoria_final = "Activos"
            # Para Planta San Pedro, la subcategoría debe ser el ACTIVO
            if datos_planta.get('activo'):
                subcategoria_final = datos_planta['activo']
                logger.info(f"🏭 Usando ACTIVO como subcategoría: {subcategoria_final}")
            elif datos_planta.get('subcategoria_original'):
                subcategoria_final = datos_planta['subcategoria_original']
                logger.info(f"🏭 Usando subcategoría de solicitud: {subcategoria_final}")
            # Advertencias si faltan datos específicos de planta
            if not subcategoria_final:
                logger.warning(f"⚠️ CAMPO FALTANTE: Subcategoría/Activo no disponible para OT Planta San Pedro {ot.folio}")
            if not zona_planta_tienda:
                logger.warning(f"⚠️ CAMPO FALTANTE: Zona/Planta no disponible para OT Planta San Pedro {ot.folio}")
        elif es_comercial_b2b:
            logger.info(f"🏢 Aplicando reglas específicas de Comercial B2B para OT {ot.folio}")
            # Para Comercial B2B, usar ciudad desde la solicitud B2B
            if datos_b2b.get('ciudad'):
                ciudad_final = datos_b2b['ciudad']
                logger.info(f"🏢 Usando ciudad de solicitud B2B: {ciudad_final}")
            
            # Para Comercial B2B, usar categoría desde la solicitud B2B
            if datos_b2b.get('categoria'):
                categoria_final = datos_b2b['categoria']
                logger.info(f"🏢 Usando categoría de solicitud B2B: {categoria_final}")
            
            # Para Comercial B2B, usar subcategoría desde la solicitud B2B  
            if datos_b2b.get('subcategoria'):
                subcategoria_final = datos_b2b['subcategoria']
                logger.info(f"🏢 Usando subcategoría de solicitud B2B: {subcategoria_final}")
            
            # Advertencias si faltan datos específicos de B2B
            if not subcategoria_final:
                logger.warning(f"⚠️ CAMPO FALTANTE: Subcategoría no disponible para OT Comercial B2B {ot.folio}")
            if not zona_planta_tienda:
                logger.warning(f"⚠️ CAMPO FALTANTE: Razón Social/Sucursal no disponible para OT Comercial B2B {ot.folio}")
            if not ciudad_final:
                logger.warning(f"⚠️ CAMPO FALTANTE: Ciudad no disponible para OT Comercial B2B {ot.folio}")
        else:
            # Advertencias para OTs normales si faltan datos
            if not ciudad_final:
                logger.warning(f"⚠️ CAMPO FALTANTE: Ciudad no disponible para OT {ot.folio}")
            if not categoria_final:
                logger.warning(f"⚠️ CAMPO FALTANTE: Categoría no disponible para OT {ot.folio}")
            if not subcategoria_final:
                logger.warning(f"⚠️ CAMPO FALTANTE: Subcategoría no disponible para OT {ot.folio}")
        
        # 🔍 DEBUG: Mostrar valores finales calculados
        logger.info(f"🎯 DEBUG MAPEO - VALORES FINALES CALCULADOS:")
        logger.info(f"   📍 zona_planta_tienda: '{zona_planta_tienda}'")
        logger.info(f"   🏙️ ciudad_final: '{ciudad_final}'")
        logger.info(f"   📂 categoria_final: '{categoria_final}'")
        logger.info(f"   🏷️ subcategoria_final: '{subcategoria_final}'")
        logger.info(f"   🏭 es_planta_san_pedro: {es_planta_san_pedro}")
        logger.info(f"   🏢 es_comercial_b2b: {es_comercial_b2b}")
        
        # Calcular tipo de solicitud final
        if es_comercial_b2b:
            tipo_solicitud_final = 'Comercial B2B'
        elif es_planta_san_pedro:
            tipo_solicitud_final = 'Planta San Pedro'
        else:
            tipo_solicitud_final = 'Solicitud B2C'
        
        logger.info(f"   📋 tipo_solicitud_final: '{tipo_solicitud_final}'")
        
        # Obtener datos de la solicitud original según el tipo
        solicitante = ""
        contacto_solicitante = ""
        descripcion = ""
        imagen_original = ""
        archivos_adjuntos = []
        
        logger.info(f"🔍 Mapeando datos para OT {ot.folio} - Tipo: {ot.tipo_solicitud}")
        logger.info(f"📎 Archivos adjuntos disponibles: {len(ot.archivos) if hasattr(ot, 'archivos') and ot.archivos else 0}")
        
        if ot.tipo_solicitud == 'B2C' and ot.solicitud_b2c:
            solicitud = ot.solicitud_b2c
            solicitante = solicitud.nombre or ""
            contacto_solicitante = f"{solicitud.correo or ''} - {solicitud.telefono or ''}".strip(' -')
            descripcion = solicitud.descripcion or ""
            imagen_original = solicitud.archivo_url or ""
            
            logger.info(f"🖼️ Imagen original B2C: {imagen_original}")
            # La imagen original ya se maneja por separado, no agregar a archivos_adjuntos
                
        elif ot.tipo_solicitud == 'B2B' and ot.solicitud_b2b:
            solicitud = ot.solicitud_b2b
            solicitante = solicitud.nombre or ""
            contacto_solicitante = f"{solicitud.correo or ''} - {solicitud.telefono or ''}".strip(' -')
            descripcion = solicitud.descripcion or ""
            imagen_original = solicitud.archivo_url or ""
            
            logger.info(f"🖼️ Imagen original B2B: {imagen_original}")
            # La imagen original de B2B ya se maneja por separado, no agregar a archivos_adjuntos
        else:
            # OT sin solicitud asociada (creada manualmente)
            logger.info(f"⚠️ OT {ot.folio} no tiene solicitud B2C/B2B asociada")
            solicitante = "Cliente no especificado"
            contacto_solicitante = "Sin contacto especificado"
            descripcion = "Sin descripción de solicitud original"
            imagen_original = ""
        
        # Obtener archivos adjuntos REALES de la tabla ArchivosAdjuntosOT
        # Estos son archivos adicionales subidos después de crear la OT, NO la imagen original
        if hasattr(ot, 'archivos') and ot.archivos:
            logger.info(f"📎 Procesando {len(ot.archivos)} archivos adjuntos encontrados")
            for i, archivo in enumerate(ot.archivos):
                archivo_url = archivo.s3_url or archivo.ruta_archivo
                archivo_nombre = archivo.nombre_original or archivo.nombre_guardado or f"archivo_adjunto_{i+1}"
                
                logger.info(f"  📄 Archivo {i+1}: {archivo_nombre}")
                logger.info(f"    URL: {archivo_url}")
                logger.info(f"    ¿Es imagen original?: {archivo_url == imagen_original}")
                
                # Solo agregar archivos que son diferentes a la imagen original
                if archivo_url and archivo_url != imagen_original:
                    archivos_adjuntos.append({
                        "nombre": archivo_nombre,
                        "url": archivo_url  # ✅ Usar URL completa de S3
                    })
                    logger.info(f"    ✅ Agregado a archivos_adjuntos con URL: {archivo_url}")
                else:
                    logger.info(f"    ❌ Omitido (es imagen original o URL vacía)")
        else:
            logger.info("📎 No hay archivos adjuntos en esta OT")
        
        # Usar datos de solicitud_data si se proporciona (para compatibilidad)
        if solicitud_data:
            if 'nombre' in solicitud_data and not solicitante:
                solicitante = solicitud_data['nombre']
            if 'correo' in solicitud_data or 'telefono' in solicitud_data:
                contacto_solicitante = f"{solicitud_data.get('correo', '')} - {solicitud_data.get('telefono', '')}".strip(' -')
            if 'descripcion' in solicitud_data and not descripcion:
                descripcion = solicitud_data['descripcion']
        
        # Los archivos adjuntos ya se procesaron arriba
        
        # Log de resumen antes de generar PDF
        logger.info(f"📋 RESUMEN PARA OT {ot.folio}:")
        logger.info(f"  🏭 Es Planta San Pedro: {'✅ Sí' if es_planta_san_pedro else '❌ No'}")
        logger.info(f"  � Es Comercial B2B: {'✅ Sí' if es_comercial_b2b else '❌ No'}")
        logger.info(f"  �🌍 Zona/Planta/Tienda: '{zona_planta_tienda}' {'(DATOS DESDE EL BACKEND)' if zona_planta_tienda else '(VACÍO - CAMPO FALTANTE)'}")
        
        if es_planta_san_pedro:
            logger.info(f"  🏙️ Ciudad: '{ciudad_final}' (Armenia - Regla Planta SP)")
            logger.info(f"  📂 Categoría: '{categoria_final}' (Activos - Regla Planta SP)")
        elif es_comercial_b2b:
            logger.info(f"  🏙️ Ciudad: '{ciudad_final}' (Desde solicitud B2B)")
            logger.info(f"  📂 Categoría: '{categoria_final}' (Desde solicitud B2B)")
        else:
            logger.info(f"  🏙️ Ciudad: '{ciudad_final}' (Original)")
            logger.info(f"  📂 Categoría: '{categoria_final}' (Original)")
        
        logger.info(f"  🏷️ Subcategoría: '{subcategoria_final}' {'(DATOS DESDE EL BACKEND)' if subcategoria_final else '(VACÍO - CAMPO FALTANTE)'}")
        logger.info(f"  📋 Tipo Solicitud: '{tipo_solicitud_final}'")
        logger.info(f"  🖼️ Imagen original: {'✅ Sí' if imagen_original else '❌ No'} - {imagen_original}")
        logger.info(f"  📎 Archivos adjuntos: {len(archivos_adjuntos)} archivos")
        for i, archivo in enumerate(archivos_adjuntos):
            logger.info(f"    {i+1}. {archivo['nombre']} - {archivo['url']}")
        
        # Estructura JSON exacta según especificación
        datos_json = {
            "titulo": ot.asunto or "",
            "id": str(ot.id),  # Usar ot.id (DB ID) para consultas de firmas
            "folio": str(ot.folio),  # Mantener folio para display
            "fecha": fecha_exportacion,
            "estado": ot.etapa or "",
            "categoria": categoria_final,
            "subcategoria": subcategoria_final,
            "zona_planta_tienda": zona_planta_tienda,
            "ciudad": ciudad_final,
            "prioridad": ot.prioridad or "",
            "tipo_solicitud": tipo_solicitud_final,
            "tipo_mantenimiento": ot.tipo_mantenimiento or "",
            "tiempo_estimado_horas": ot.tiempo_estimado or "",
            "etapa": ot.etapa or "",
            "asignacion": {
                "tecnico_asignado": ot.tecnico_asignado if ot.tecnico_asignado and ot.tecnico_asignado != "Por asignar" else None,
                "fecha_visita": formatear_fecha(ot.fecha_visita)
            },
            "solicitante": solicitante,
            "contacto_solicitante": contacto_solicitante,
            "descripcion": descripcion,
            "imagen_original": imagen_original,
            "notas_tecnico": obtener_notas_trazables(ot, db, nota_id),
            "archivos_adjuntos": archivos_adjuntos
        }
        
        logger.info(f"Datos JSON mapeados exitosamente para OT {ot.folio}")
        logger.info(f"Campos incluidos: {list(datos_json.keys())}")
        
        return datos_json
        
    except Exception as e:
        logger.error(f"Error mapeando datos para servicio directo: {str(e)}")
        # Retornar estructura mínima válida en caso de error
        return {
            "titulo": f"OT #{ot.folio if ot else 'Unknown'}",
            "id": str(ot.id if ot else '0'),  # Usar ot.id para consultas de firmas
            "folio": str(ot.folio if ot else '0'),  # Mantener folio para display
            "fecha": datetime.now().strftime('%d/%m/%Y'),
            "estado": "",
            "categoria": "",
            "subcategoria": "",
            "zona_planta_tienda": "",
            "ciudad": "",
            "prioridad": "",
            "tipo_solicitud": "",
            "tipo_mantenimiento": "",
            "tiempo_estimado_horas": "",
            "etapa": "",
            "asignacion": {
                "tecnico_asignado": None,
                "fecha_visita": None
            },
            "solicitante": "",
            "contacto_solicitante": "",
            "descripcion": "",
            "imagen_original": "",
            "notas_tecnico": "",
            "archivos_adjuntos": []
        }


def mapear_datos_ot_excel(ot: OTSolicitud, solicitud_data: dict = None) -> dict:
    """
    Mapear datos de OT a estructura del template Excel
    """
    try:
        # Función auxiliar para formatear fechas
        def formatear_fecha(fecha):
            if fecha:
                return fecha.strftime('%d/%m/%Y') if hasattr(fecha, 'strftime') else str(fecha)
            return 'No especificada'
        
        # Determinar ubicación según tipo de solicitud
        ubicacion = ""
        if ot.tipo_solicitud == 'B2B':
            # Para solicitudes comerciales B2B
            ubicacion = ot.planta if ot.planta else 'Sin planta especificada'
        else:
            # Para solicitudes B2C (tiendas)
            ubicacion = f"{ot.zona or 'Sin zona'}"
            if ot.tienda:
                ubicacion += f" - {ot.tienda}"
        
        # Mapeo completo según análisis del Excel
        excel_mapping = {
            # Campos fijos según especificación
            "CÓDIGO": f"FO-MT-006-{ot.folio}",
            "VERSIÓN": "1.0",
            "FECHA": formatear_fecha(datetime.now()),
            
            # Campos principales
            "Título": ot.asunto or 'Sin asunto especificado',
            "ID": str(ot.folio),
            "Fecha": formatear_fecha(ot.fecha_creacion),
            "Estado": ot.etapa or 'Pendiente',
            
            # Información de clasificación
            "Categoría": ot.categoria or 'Sin categoría',
            "Subcategoría": ot.subcategoria or 'Sin subcategoría',
            "Zona / Planta / Tienda": ubicacion,
            "Ciudad": ot.ciudad or 'Sin ciudad',
            
            # Configuración de trabajo
            "Prioridad": ot.prioridad or 'Media',
            "Tipo de Solicitud": 'Comercial B2B' if ot.tipo_solicitud == 'B2B' else 'Solicitud B2C',
            "Tipo de Mantenimiento": ot.tipo_mantenimiento or 'Correctivo',
            "Tiempo estimado (h)": ot.tiempo_estimado or 'Por definir',
            "Etapa": ot.etapa or 'Pendiente',
            
            # Asignación
            "Técnico asignado": ot.tecnico_asignado or 'Sin asignar',
            "Fecha de visita": formatear_fecha(ot.fecha_visita) if ot.fecha_visita else 'Por programar',
            
            # Información del solicitante
            "Solicitante": solicitud_data.get('razon_social') if ot.tipo_solicitud == 'B2B' and solicitud_data and solicitud_data.get('razon_social') else (solicitud_data.get('nombre') if solicitud_data else 'Cliente no especificado'),
            "Contacto solicitante": solicitud_data.get('correo') or solicitud_data.get('telefono') if solicitud_data else 'Sin contacto',
            
            # Descripción del trabajo
            "Descripción": solicitud_data.get('descripcion') if solicitud_data else (ot.notas or 'Sin descripción disponible'),
            
            # Campos adicionales para B2B
            "Sucursal": solicitud_data.get('sucursal') if ot.tipo_solicitud == 'B2B' and solicitud_data else '',
            "Equipo": solicitud_data.get('equipo') if ot.tipo_solicitud == 'B2B' and solicitud_data else '',
            
            # Imagen original (si existe)
            "Imagen Original de la Solicitud": solicitud_data.get('archivo_url') if solicitud_data else None
        }
        
        logger.info(f"📋 FastAPI: Datos mapeados para Excel - OT {ot.folio}")
        return excel_mapping
        
    except Exception as e:
        logger.error(f"FastAPI: Error mapeando datos OT {ot.folio}: {str(e)}")
        raise


def mapear_datos_ot_nueva_metodologia(ot: OTSolicitud, solicitud_data: dict = None) -> dict:
    """
    Mapear datos de OT para la nueva metodología Excel con nombres de rango
    """
    try:
        # Función auxiliar para formatear fechas
        def formatear_fecha(fecha):
            if fecha:
                return fecha.strftime('%Y-%m-%d') if hasattr(fecha, 'strftime') else str(fecha)
            return 'No especificada'
        
        # Determinar ubicación según tipo de solicitud
        ubicacion = ""
        if ot.tipo_solicitud == 'B2B':
            ubicacion = ot.planta if ot.planta else 'Sin planta especificada'
        else:
            ubicacion = f"{ot.zona or 'Sin zona'}"
            if ot.tienda:
                ubicacion += f" - {ot.tienda}"
        
        # Mapeo optimizado para la nueva metodología
        datos_metodologia = {
            # Campos de identificación
            'folio': ot.folio,
            'titulo': ot.asunto or 'Sin asunto especificado',
            'fecha_creacion': formatear_fecha(ot.fecha_creacion),
            'estado': ot.etapa or 'Pendiente',
            
            # Clasificación - Usar valores procesados con reglas de Planta San Pedro
            'categoria': categoria_final or 'Sin categoría',
            'subcategoria': subcategoria_final or 'Sin subcategoría',
            'zona_planta_tienda': zona_planta_tienda or 'Sin ubicación',
            'ciudad': ciudad_final or 'Sin ciudad',
            
            # Configuración
            'prioridad': ot.prioridad or 'Media',
            'tipo_solicitud': 'Comercial B2B' if ot.tipo_solicitud == 'B2B' else ('Planta San Pedro' if es_planta_san_pedro else 'Solicitud B2C'),
            'tipo_mantenimiento': ot.tipo_mantenimiento or 'Correctivo',
            'tiempo_estimado': ot.tiempo_estimado or 'Por definir',
            'etapa': ot.etapa or 'Pendiente',
            
            # Asignación
            'tecnico_asignado': ot.tecnico_asignado or 'Sin asignar',
            'fecha_visita': formatear_fecha(ot.fecha_visita) if ot.fecha_visita else 'Por programar',
            
            # Solicitante
            'solicitante': (
                solicitud_data.get('razon_social') if ot.tipo_solicitud == 'B2B' and solicitud_data and solicitud_data.get('razon_social') 
                else (solicitud_data.get('nombre') if solicitud_data else 'Cliente no especificado')
            ),
            'contacto_solicitante': (
                solicitud_data.get('correo') or solicitud_data.get('telefono') if solicitud_data else 'Sin contacto'
            ),
            
            # Descripción
            'descripcion': (
                solicitud_data.get('descripcion') if solicitud_data 
                else (ot.notas or 'Sin descripción disponible')
            ),
            
            # Campos B2B adicionales
            'sucursal': solicitud_data.get('sucursal') if ot.tipo_solicitud == 'B2B' and solicitud_data else '',
            'equipo': solicitud_data.get('equipo') if ot.tipo_solicitud == 'B2B' and solicitud_data else '',
            
            # Archivos
            'archivo_url': solicitud_data.get('archivo_url') if solicitud_data else None
        }
        
        logger.info(f"FastAPI: Datos mapeados para nueva metodologia - OT {ot.folio}")
        return datos_metodologia
        
    except Exception as e:
        logger.error(f"FastAPI: Error mapeando datos nueva metodologia OT {ot.folio}: {str(e)}")


@router.get("/descargar-archivo/{filename}")
async def descargar_archivo_adjunto(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint para descargar archivos adjuntos de las OTs
    """
    try:
        logger.info(f"Solicitud de descarga de archivo: {filename}")
        
        # Directorio de uploads
        uploads_dir = Path(__file__).parent.parent.parent / "uploads"
        
        # Buscar el archivo en diferentes subdirectorios
        posibles_rutas = [
            uploads_dir / filename,  # Directorio raíz de uploads
            uploads_dir / "ots" / filename,  # Subdirectorio ots
        ]
        
        # Primero intentar buscar localmente para compatibilidad
        # También buscar en subdirectorios por folio si el nombre tiene formato específico
        if "_" in filename:
            partes = filename.split("_")
            if len(partes) >= 2 and partes[1].isdigit():
                folio = partes[1] 
                posibles_rutas.append(uploads_dir / "ots" / folio / filename)
        
        archivo_encontrado = None
        for ruta in posibles_rutas:
            if ruta.exists() and ruta.is_file():
                archivo_encontrado = ruta
                logger.info(f"Archivo encontrado localmente en: {archivo_encontrado}")
                break
        
        # Si no se encuentra localmente, intentar desde S3
        if not archivo_encontrado:
            logger.info(f"Archivo no encontrado localmente, intentando desde S3: {filename}")
            
            # Construir las claves S3 posibles
            s3_keys_to_try = [
                f"images/{filename}",  # Ubicación principal
                f"uploads/{filename}",
                f"b2c/{filename}",
                f"ots/{filename}",
                filename  # Sin prefijo
            ]
            
            download_result = None
            s3_key_used = None
            
            for s3_key in s3_keys_to_try:
                logger.info(f"Intentando descargar desde S3: {s3_key}")
                result = s3_service.download_file_from_s3(s3_key)
                if result['success']:
                    download_result = result
                    s3_key_used = s3_key
                    logger.info(f"Archivo encontrado en S3: {s3_key}")
                    break
            
            if not download_result or not download_result['success']:
                logger.error(f"Archivo no encontrado ni localmente ni en S3: {filename}")
                raise HTTPException(
                    status_code=404, 
                    detail=f"Archivo no encontrado: {filename}"
                )
            
            # Procesar descarga desde S3
            extension = Path(filename).suffix.lower()
            content_types = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg', 
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.xls': 'application/vnd.ms-excel',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.txt': 'text/plain'
            }
            
            media_type = download_result.get('content_type', content_types.get(extension, 'application/octet-stream'))
            
            logger.info(f"Descargando archivo desde S3: {s3_key_used} (tipo: {media_type})")
            
            from io import BytesIO
            return StreamingResponse(
                BytesIO(download_result['content']),
                media_type=media_type,
                headers={
                    "Content-Disposition": f"attachment; filename={download_result['filename']}"
                }
            )
        
        # Procesar descarga local (compatibilidad hacia atrás)
        extension = archivo_encontrado.suffix.lower()
        content_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg', 
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain'
        }
        
        media_type = content_types.get(extension, 'application/octet-stream')
        
        logger.info(f"Descargando archivo local: {archivo_encontrado} (tipo: {media_type})")
        
        return FileResponse(
            path=str(archivo_encontrado),
            media_type=media_type,
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error descargando archivo {filename}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error interno descargando archivo: {str(e)}"
        )
