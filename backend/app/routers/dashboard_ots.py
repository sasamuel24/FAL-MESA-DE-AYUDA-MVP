"""
Router Dashboard OTs - Sistema de visualización para roles gerenciales
Endpoints para Jefe de Zona, Gerente de Tiendas y Mercadeo
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, case, distinct
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

from app.database import get_db
from app.models import OTSolicitud, B2CSolicitudes, User
from app.core.security import get_current_user
from app.schemas import EnviarAlertaRequest

# Configurar logging
logger = logging.getLogger(__name__)

# Crear router
router = APIRouter(
    tags=["Dashboard OTs"],
    responses={404: {"description": "Not found"}}
)


@router.get("/ots")
async def get_dashboard_ots(
    zona: Optional[str] = Query(None, description="Filtrar por zona"),
    ciudad: Optional[str] = Query(None, description="Filtrar por ciudad"),
    tienda: Optional[str] = Query(None, description="Filtrar por tienda"),
    etapa: Optional[str] = Query(None, description="Filtrar por etapa"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoría"),
    search: Optional[str] = Query(None, description="Buscar por folio o asunto"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener todas las OTs de solicitudes B2C para dashboard interactivo
    Accesible para roles: jefe_zona, gerente_tiendas, mercadeo
    """
    try:
        # Validar que el usuario tenga un rol permitido
        roles_permitidos = ['admin', 'jefe_zona', 'gerente_tiendas', 'mercadeo']
        if current_user.rol not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para acceder a este dashboard"
            )
        
        logger.info(f"Usuario {current_user.nombre} ({current_user.rol}) accediendo a dashboard OTs")
        
        # Query base: OTs que vienen de solicitudes B2C
        query = db.query(OTSolicitud).filter(OTSolicitud.tipo_solicitud == 'B2C')
        
        # Aplicar filtros dinámicos
        if zona:
            query = query.filter(OTSolicitud.zona == zona)
        if ciudad:
            query = query.filter(OTSolicitud.ciudad == ciudad)
        if tienda:
            query = query.filter(OTSolicitud.tienda == tienda)
        if etapa:
            query = query.filter(OTSolicitud.etapa == etapa)
        if categoria:
            query = query.filter(OTSolicitud.categoria == categoria)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (OTSolicitud.folio.cast(db.String).like(search_pattern)) |
                (OTSolicitud.asunto.ilike(search_pattern))
            )
        
        # Obtener todas las OTs
        ots = query.order_by(OTSolicitud.fecha_creacion.desc()).all()
        
        # Formatear datos para el frontend
        ots_data = []
        for ot in ots:
            # Calcular días desde creación
            dias_desde_creacion = 0
            if ot.fecha_creacion:
                dias_desde_creacion = (datetime.utcnow() - ot.fecha_creacion).days
            
            # Obtener el área del técnico asignado
            area_responsable = 'Sin asignar'
            if ot.tecnico_asignado and ot.tecnico_asignado != 'Sin asignar':
                # Buscar el técnico por nombre para obtener su área
                tecnico = db.query(User).filter(User.nombre == ot.tecnico_asignado).first()
                if tecnico and tecnico.area:
                    area_responsable = tecnico.area
            
            # Obtener datos adicionales de la solicitud B2C (planta, activo)
            planta = None
            activo = None
            if ot.solicitud_id and ot.tipo_solicitud == 'B2C':
                solicitud = db.query(B2CSolicitudes).filter(B2CSolicitudes.id == ot.solicitud_id).first()
                if solicitud:
                    planta = solicitud.planta
                    activo = solicitud.activo
            
            ots_data.append({
                'id': ot.id,
                'folio': str(ot.folio),
                'asunto': ot.asunto,
                'zona': ot.zona or 'Sin zona',
                'ciudad': ot.ciudad or 'Sin ciudad',
                'tienda': ot.tienda or 'Sin tienda',
                'categoria': ot.categoria or 'Sin categoría',
                'subcategoria': ot.subcategoria or 'Sin subcategoría',
                'etapa': ot.etapa or 'Pendiente',
                'prioridad': ot.prioridad or 'Media',
                'tecnico_asignado': ot.tecnico_asignado or 'Sin asignar',
                'area_responsable': area_responsable,
                'tipo_mantenimiento': ot.tipo_mantenimiento or 'correctivo',
                'planta': planta,
                'activo': activo,
                'fecha_creacion': ot.fecha_creacion.isoformat() if ot.fecha_creacion else None,
                'fecha_visita': ot.fecha_visita.isoformat() if ot.fecha_visita else None,
                'fecha_completada': ot.fecha_completada.isoformat() if ot.fecha_completada else None,
                'dias_desde_creacion': dias_desde_creacion,
                'notas': ot.notas
            })
        
        # Calcular estadísticas generales
        total_ots = len(ots_data)
        ots_pendientes = len([ot for ot in ots_data if ot['etapa'] in ['Pendiente', 'En proceso']])
        ots_completadas = len([ot for ot in ots_data if ot['etapa'] in ['Completada', 'Cerrada']])
        
        # Calcular distribución por zona
        distribucion_zona = {}
        for ot in ots_data:
            zona_name = ot['zona']
            distribucion_zona[zona_name] = distribucion_zona.get(zona_name, 0) + 1
        
        # Calcular distribución por etapa
        distribucion_etapa = {}
        for ot in ots_data:
            etapa_name = ot['etapa']
            distribucion_etapa[etapa_name] = distribucion_etapa.get(etapa_name, 0) + 1
        
        # Calcular distribución por categoría
        distribucion_categoria = {}
        for ot in ots_data:
            categoria_name = ot['categoria']
            distribucion_categoria[categoria_name] = distribucion_categoria.get(categoria_name, 0) + 1
        
        # Obtener valores únicos para filtros
        zonas_unicas = sorted(list(set([ot['zona'] for ot in ots_data if ot['zona']])))
        ciudades_unicas = sorted(list(set([ot['ciudad'] for ot in ots_data if ot['ciudad']])))
        tiendas_unicas = sorted(list(set([ot['tienda'] for ot in ots_data if ot['tienda']])))
        etapas_unicas = sorted(list(set([ot['etapa'] for ot in ots_data if ot['etapa']])))
        categorias_unicas = sorted(list(set([ot['categoria'] for ot in ots_data if ot['categoria']])))
        
        response_data = {
            'success': True,
            'data': {
                'ots': ots_data,
                'estadisticas': {
                    'total': total_ots,
                    'pendientes': ots_pendientes,
                    'completadas': ots_completadas,
                    'tasa_completado': round((ots_completadas / total_ots * 100) if total_ots > 0 else 0, 1)
                },
                'distribuciones': {
                    'por_zona': distribucion_zona,
                    'por_etapa': distribucion_etapa,
                    'por_categoria': distribucion_categoria
                },
                'filtros': {
                    'zonas': zonas_unicas,
                    'ciudades': ciudades_unicas,
                    'tiendas': tiendas_unicas,
                    'etapas': etapas_unicas,
                    'categorias': categorias_unicas
                }
            }
        }
        
        logger.info(f"Dashboard OTs: {total_ots} registros devueltos para {current_user.nombre}")
        
        return JSONResponse(content=response_data, status_code=200)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener OTs para dashboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'success': False, 'error': str(e)}
        )


@router.get("/ots-stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener estadísticas resumidas del dashboard
    """
    try:
        # Validar rol
        roles_permitidos = ['admin', 'jefe_zona', 'gerente_tiendas', 'mercadeo']
        if current_user.rol not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para acceder a estas estadísticas"
            )
        
        # Contar OTs B2C por estado
        total_ots = db.query(func.count(OTSolicitud.id)).filter(
            OTSolicitud.tipo_solicitud == 'B2C'
        ).scalar()
        
        pendientes = db.query(func.count(OTSolicitud.id)).filter(
            OTSolicitud.tipo_solicitud == 'B2C',
            OTSolicitud.etapa.in_(['Pendiente', 'En proceso'])
        ).scalar()
        
        completadas = db.query(func.count(OTSolicitud.id)).filter(
            OTSolicitud.tipo_solicitud == 'B2C',
            OTSolicitud.etapa.in_(['Completada', 'Cerrada'])
        ).scalar()
        
        response_data = {
            'success': True,
            'data': {
                'total_ots': total_ots,
                'pendientes': pendientes,
                'completadas': completadas,
                'efectividad_cierre': round((completadas / total_ots * 100) if total_ots > 0 else 0, 1)
            }
        }
        
        return JSONResponse(content=response_data, status_code=200)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener estadísticas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'success': False, 'error': str(e)}
        )


@router.get("/ots/{ot_id}/detalle")
async def get_ot_detalle(
    ot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener detalle completo de una OT incluyendo datos del solicitante
    """
    try:
        # Validar rol
        roles_permitidos = ['admin', 'jefe_zona', 'gerente_tiendas', 'mercadeo']
        if current_user.rol not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para ver este detalle"
            )
        
        # Buscar la OT
        ot = db.query(OTSolicitud).filter(
            OTSolicitud.id == ot_id,
            OTSolicitud.tipo_solicitud == 'B2C'
        ).first()
        
        if not ot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="OT no encontrada"
            )
        
        # Buscar la solicitud B2C asociada
        solicitud = db.query(B2CSolicitudes).filter(
            B2CSolicitudes.id == ot.solicitud_id
        ).first()
        
        if not solicitud:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Solicitud asociada no encontrada"
            )
        
        # Obtener el área del técnico asignado
        area_responsable = 'Sin asignar'
        if ot.tecnico_asignado and ot.tecnico_asignado != 'Sin asignar':
            tecnico = db.query(User).filter(User.nombre == ot.tecnico_asignado).first()
            if tecnico and tecnico.area:
                area_responsable = tecnico.area
        
        # Calcular días desde creación
        dias_desde_creacion = 0
        if ot.fecha_creacion:
            dias_desde_creacion = (datetime.utcnow() - ot.fecha_creacion).days
        
        # Construir respuesta completa
        detalle = {
            # Datos de la OT
            'id': ot.id,
            'folio': str(ot.folio),
            'asunto': ot.asunto,
            'etapa': ot.etapa or 'Pendiente',
            'prioridad': ot.prioridad or 'Media',
            'tecnico_asignado': ot.tecnico_asignado or 'Sin asignar',
            'area_responsable': area_responsable,
            'tipo_mantenimiento': ot.tipo_mantenimiento or 'correctivo',
            'fecha_creacion': ot.fecha_creacion.isoformat() if ot.fecha_creacion else None,
            'fecha_visita': ot.fecha_visita.isoformat() if ot.fecha_visita else None,
            'fecha_completada': ot.fecha_completada.isoformat() if ot.fecha_completada else None,
            'dias_desde_creacion': dias_desde_creacion,
            'notas': ot.notas,
            
            # Datos del solicitante (de la solicitud B2C)
            'solicitante': {
                'nombre': solicitud.nombre,
                'correo': solicitud.correo,
                'telefono': solicitud.telefono or 'No proporcionado'
            },
            
            # Datos de ubicación
            'ubicacion': {
                'zona': ot.zona or solicitud.zona or 'Sin zona',
                'ciudad': ot.ciudad or solicitud.ciudad or 'Sin ciudad',
                'tienda': ot.tienda or solicitud.tienda or 'Sin tienda',
                'planta': solicitud.planta or 'N/A',
                'activo': solicitud.activo or 'N/A'
            },
            
            # Categorización
            'categoria': ot.categoria or solicitud.categoria or 'Sin categoría',
            'subcategoria': ot.subcategoria or solicitud.subcategoria or 'Sin subcategoría',
            
            # Descripción del problema
            'descripcion': solicitud.descripcion,
            
            # Archivo adjunto
            'archivo': {
                'nombre': solicitud.archivo_nombre,
                'url': solicitud.archivo_url,
                's3_key': solicitud.archivo_s3_key
            } if solicitud.archivo_nombre else None
        }
        
        logger.info(f"Detalle de OT {ot_id} solicitado por {current_user.nombre}")
        
        return JSONResponse(content={
            'success': True,
            'data': detalle
        }, status_code=200)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener detalle de OT {ot_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'success': False, 'error': str(e)}
        )


@router.post("/ots/{ot_id}/enviar-alerta")
async def enviar_alerta_tecnico(
    ot_id: int,
    request: EnviarAlertaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Enviar alerta urgente personalizada al técnico asignado a una OT
    Límite: 1 alerta por día por OT
    Accesible para roles: admin, jefe_zona, gerente_tiendas, mercadeo
    """
    try:
        # Validar permisos
        roles_permitidos = ['admin', 'jefe_zona', 'gerente_tiendas', 'mercadeo']
        if current_user.rol not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para enviar alertas"
            )
        
        logger.info(f"Usuario {current_user.nombre} intenta enviar alerta para OT {ot_id}")
        
        # Buscar la OT
        ot = db.query(OTSolicitud).filter(OTSolicitud.id == ot_id).first()
        if not ot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="OT no encontrada"
            )
        
        # Verificar que tenga técnico asignado
        if not ot.tecnico_asignado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta OT no tiene técnico asignado"
            )
        
        # Buscar el técnico en la base de datos
        tecnico = db.query(User).filter(
            User.nombre == ot.tecnico_asignado,
            User.rol == 'tecnico'
        ).first()
        
        if not tecnico:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Técnico '{ot.tecnico_asignado}' no encontrado en el sistema"
            )
        
        if not tecnico.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El técnico {tecnico.nombre} no tiene email configurado"
            )
        
        # Validar límite de 1 alerta por día
        from app.models import AlertaTecnico
        hoy_inicio = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        hoy_fin = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
        
        alerta_existente = db.query(AlertaTecnico).filter(
            AlertaTecnico.ot_id == ot_id,
            AlertaTecnico.fecha_envio >= hoy_inicio,
            AlertaTecnico.fecha_envio <= hoy_fin
        ).first()
        
        if alerta_existente:
            # Retornar mensaje informativo en lugar de error
            return {
                'success': False,
                'message': 'Ya se envió una alerta hoy para esta OT. Por favor espera hasta mañana para enviar otra alerta.',
                'tipo': 'info',
                'detalles': {
                    'fecha_envio': alerta_existente.fecha_envio.strftime('%d/%m/%Y a las %H:%M'),
                    'enviado_por': alerta_existente.enviado_por,
                    'proxima_alerta_disponible': (hoy_inicio + timedelta(days=1)).strftime('%d/%m/%Y')
                }
            }
        
        # Preparar datos para el email
        solicitud = None
        client_name = None
        if ot.solicitud_id and ot.tipo_solicitud == 'B2C':
            solicitud = db.query(B2CSolicitudes).filter(B2CSolicitudes.id == ot.solicitud_id).first()
            if solicitud:
                client_name = solicitud.nombre
        # Obtener ubicación de la OT
        location = None
        if ot.tienda and ot.ciudad:
            location = f"{ot.tienda}, {ot.ciudad}"
        elif ot.ciudad:
            location = ot.ciudad
        elif ot.zona:
            location = ot.zona
        
        # Obtener área responsable del técnico asignado
        area_responsable = tecnico.area if tecnico.area else None
        
        # Obtener zona de la OT para CC del jefe de zona
        zona_ot = ot.zona if ot.zona else None
        
        # Enviar el email de alerta
        from app.services.email_service import send_technician_alert_email
        resultado_email = send_technician_alert_email(
            to_email=tecnico.email,
            technician_name=tecnico.nombre,
            folio=str(ot.folio),
            mensaje_personalizado=request.mensaje,
            enviado_por=current_user.nombre,
            client_name=client_name,
            location=location,
            area_responsable=area_responsable,
            zona=zona_ot  # ← NUEVO: pasar zona para CC del jefe de zona
        )
        
        if not resultado_email.get('success'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al enviar email: {resultado_email.get('message', 'Error desconocido')}"
            )
        
        # Registrar la alerta en la base de datos
        nueva_alerta = AlertaTecnico(
            ot_id=ot_id,
            tecnico_email=tecnico.email,
            mensaje=request.mensaje,
            enviado_por=current_user.nombre,
            fecha_envio=datetime.now()
        )
        
        db.add(nueva_alerta)
        db.commit()
        db.refresh(nueva_alerta)
        
        logger.info(f"✅ Alerta enviada exitosamente para OT {ot.folio} al técnico {tecnico.nombre}")
        
        return {
            'success': True,
            'message': f'Alerta enviada exitosamente a {tecnico.nombre}',
            'data': {
                'ot_folio': ot.folio,
                'tecnico': tecnico.nombre,
                'email': tecnico.email,
                'fecha_envio': nueva_alerta.fecha_envio.strftime('%d/%m/%Y %H:%M'),
                'enviado_por': current_user.nombre
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al enviar alerta para OT {ot_id}: {str(e)}")
        import traceback
        logger.error(f"Stack trace: {traceback.format_exc()}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'success': False, 'error': str(e)}
        )

