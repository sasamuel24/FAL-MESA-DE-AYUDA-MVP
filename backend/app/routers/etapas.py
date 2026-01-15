"""
Router Etapas para FastAPI
Migración completa del endpoint de etapas desde Flask API v1/etapas.py
Compatibilidad total con respuestas Flask existentes y funcionalidad completa de gestión de etapas
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import logging

from app.database import get_db
from app.models import EtapaOT, HistorialEtapa, OTSolicitud, B2CSolicitudes, B2BSolicitud
from app.services.notification_service import NotificationService

# Configurar logging
logger = logging.getLogger(__name__)

# Crear router con prefijo
router = APIRouter(
    tags=["Etapas"],
    responses={404: {"description": "Not found"}}
)

# Pydantic models para validación de entrada
class EtapaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = ""
    color: Optional[str] = "#6B7280"
    es_final: Optional[bool] = False

class EtapaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    color: Optional[str] = None
    orden: Optional[int] = None
    es_final: Optional[bool] = None
    activa: Optional[bool] = None

class CambioEtapa(BaseModel):
    estado: str
    usuario: Optional[str] = "Sistema"
    motivo: Optional[str] = "Cambio de etapa"

class ReordenarEtapas(BaseModel):
    etapas: List[int]


@router.get("/")
async def obtener_etapas(
    db: Session = Depends(get_db)
):
    """
    Obtener todas las etapas disponibles
    Migrado de Flask: GET /etapas
    """
    try:
        logger.info("🔍 FastAPI: Obteniendo etapas disponibles")
        
        etapas = db.query(EtapaOT).filter(
            EtapaOT.activa == True
        ).order_by(EtapaOT.orden).all()
        
        etapas_data = []
        for etapa in etapas:
            etapas_data.append({
                'id': etapa.id,
                'nombre': etapa.nombre,
                'descripcion': etapa.descripcion,
                'color': etapa.color,
                'orden': etapa.orden,
                'es_final': etapa.es_final,
                'activa': etapa.activa
            })
        
        logger.info(f"✅ FastAPI: {len(etapas_data)} etapas obtenidas exitosamente")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'data': etapas_data,
                'message': 'Etapas obtenidas exitosamente'
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al obtener etapas: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error al obtener etapas: {str(e)}'
            }
        )


@router.get("/listar")
async def obtener_etapas_alternativo(
    db: Session = Depends(get_db)
):
    """
    Obtener todas las etapas disponibles - Ruta alternativa
    Solución temporal para problema con ruta raíz
    """
    try:
        logger.info("🔍 FastAPI: Obteniendo etapas disponibles (ruta alternativa)")
        
        etapas = db.query(EtapaOT).filter(
            EtapaOT.activa == True
        ).order_by(EtapaOT.orden).all()
        
        etapas_data = []
        for etapa in etapas:
            etapas_data.append({
                'id': etapa.id,
                'nombre': etapa.nombre,
                'descripcion': etapa.descripcion,
                'color': etapa.color,
                'orden': etapa.orden,
                'es_final': etapa.es_final,
                'activa': etapa.activa
            })
        
        logger.info(f"✅ FastAPI: {len(etapas_data)} etapas obtenidas exitosamente (ruta alternativa)")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'data': etapas_data,
                'message': 'Etapas obtenidas exitosamente'
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al obtener etapas (ruta alternativa): {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error al obtener etapas: {str(e)}'
            }
        )


@router.post("/")
async def crear_etapa(
    etapa: EtapaCreate,
    db: Session = Depends(get_db)
):
    """
    Crear una nueva etapa
    Migrado de Flask: POST /etapas
    """
    try:
        logger.info(f"📝 FastAPI: Creando nueva etapa: {etapa.nombre}")
        
        # Verificar si ya existe una etapa con ese nombre
        etapa_existente = db.query(EtapaOT).filter(
            EtapaOT.nombre == etapa.nombre
        ).first()
        
        if etapa_existente:
            logger.warning(f"⚠️ FastAPI: Etapa '{etapa.nombre}' ya existe")
            return JSONResponse(
                status_code=400,
                content={
                    'success': False,
                    'error': 'Ya existe una etapa con ese nombre'
                }
            )
        
        # Obtener el orden máximo actual
        max_orden = db.query(func.max(EtapaOT.orden)).scalar() or 0
        
        # Crear nueva etapa
        nueva_etapa = EtapaOT(
            nombre=etapa.nombre,
            descripcion=etapa.descripcion,
            color=etapa.color,
            orden=max_orden + 1,
            es_final=etapa.es_final,
            activa=True
        )
        
        db.add(nueva_etapa)
        db.commit()
        db.refresh(nueva_etapa)
        
        logger.info(f"✅ FastAPI: Etapa '{etapa.nombre}' creada exitosamente con ID {nueva_etapa.id}")
        
        return JSONResponse(
            status_code=201,
            content={
                'success': True,
                'data': {
                    'id': nueva_etapa.id,
                    'nombre': nueva_etapa.nombre,
                    'descripcion': nueva_etapa.descripcion,
                    'color': nueva_etapa.color,
                    'orden': nueva_etapa.orden,
                    'es_final': nueva_etapa.es_final,
                    'activa': nueva_etapa.activa
                },
                'message': 'Etapa creada exitosamente'
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al crear etapa: {str(e)}")
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error al crear etapa: {str(e)}'
            }
        )


@router.put("/{etapa_id}")
async def actualizar_etapa(
    etapa_id: int,
    etapa_data: EtapaUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualizar una etapa existente
    Migrado de Flask: PUT /etapas/<int:etapa_id>
    """
    try:
        logger.info(f"📝 FastAPI: Actualizando etapa ID {etapa_id}")
        
        # Buscar la etapa
        etapa = db.query(EtapaOT).filter(EtapaOT.id == etapa_id).first()
        if not etapa:
            logger.warning(f"⚠️ FastAPI: Etapa ID {etapa_id} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': 'Etapa no encontrada'
                }
            )
        
        # Si se está actualizando el nombre, verificar que no exista
        if etapa_data.nombre:
            etapa_existente = db.query(EtapaOT).filter(
                EtapaOT.nombre == etapa_data.nombre,
                EtapaOT.id != etapa_id
            ).first()
            
            if etapa_existente:
                logger.warning(f"⚠️ FastAPI: El nombre '{etapa_data.nombre}' ya existe en otra etapa")
                return JSONResponse(
                    status_code=400,
                    content={
                        'success': False,
                        'error': 'Ya existe una etapa con ese nombre'
                    }
                )
        
        # Actualizar campos
        update_data = etapa_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(etapa, field, value)
        
        etapa.fecha_actualizacion = datetime.utcnow()
        
        db.commit()
        db.refresh(etapa)
        
        logger.info(f"✅ FastAPI: Etapa ID {etapa_id} actualizada exitosamente")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'data': {
                    'id': etapa.id,
                    'nombre': etapa.nombre,
                    'descripcion': etapa.descripcion,
                    'color': etapa.color,
                    'orden': etapa.orden,
                    'es_final': etapa.es_final,
                    'activa': etapa.activa
                },
                'message': 'Etapa actualizada exitosamente'
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al actualizar etapa: {str(e)}")
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error al actualizar etapa: {str(e)}'
            }
        )


@router.delete("/{etapa_id}")
async def eliminar_etapa(
    etapa_id: int,
    db: Session = Depends(get_db)
):
    """
    Eliminar (desactivar) una etapa y migrar OTs a etapa predeterminada
    Migrado de Flask: DELETE /etapas/<int:etapa_id>
    """
    try:
        logger.info(f"🗑️ FastAPI: Eliminando etapa ID {etapa_id}")
        
        # Buscar la etapa
        etapa = db.query(EtapaOT).filter(EtapaOT.id == etapa_id).first()
        if not etapa:
            logger.warning(f"⚠️ FastAPI: Etapa ID {etapa_id} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': 'Etapa no encontrada'
                }
            )
        
        # Buscar OTs que usan esta etapa
        ots_usando_etapa = db.query(OTSolicitud).filter(
            OTSolicitud.etapa == etapa.nombre
        ).all()
        
        etapa_destino = "OT Asignada TCQ"
        
        # Migrar OTs a etapa predeterminada
        if ots_usando_etapa:
            for ot in ots_usando_etapa:
                etapa_anterior = ot.etapa
                ot.etapa = etapa_destino
                ot.estado = etapa_destino
                
                # Crear historial de cambio
                try:
                    historial = HistorialEtapa(
                        ot_id=ot.id,
                        folio=str(ot.folio),
                        etapa_anterior=etapa_anterior,
                        etapa_nueva=etapa_destino,
                        usuario_cambio="Sistema",
                        comentario=f"Migración automática por eliminación de etapa '{etapa.nombre}'",
                        fecha_cambio=datetime.utcnow()
                    )
                    db.add(historial)
                except Exception as hist_error:
                    logger.warning(f"⚠️ FastAPI: Error al crear historial para OT {ot.folio}: {str(hist_error)}")
                    pass
        
        # Desactivar la etapa
        etapa.activa = False
        etapa.fecha_actualizacion = datetime.utcnow()
        
        db.commit()
        
        mensaje = f'Etapa desactivada exitosamente'
        if ots_usando_etapa:
            mensaje += f'. {len(ots_usando_etapa)} OTs fueron migradas automáticamente a "{etapa_destino}"'
        
        logger.info(f"✅ FastAPI: {mensaje}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': mensaje,
                'ots_migradas': len(ots_usando_etapa) if ots_usando_etapa else 0,
                'etapa_destino': etapa_destino
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al eliminar etapa: {str(e)}")
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error al eliminar etapa: {str(e)}'
            }
        )


@router.put("/reordenar")
async def reordenar_etapas(
    reorden: ReordenarEtapas,
    db: Session = Depends(get_db)
):
    """
    Reordenar las etapas
    Migrado de Flask: PUT /etapas/reordenar
    """
    try:
        logger.info(f"🔄 FastAPI: Reordenando {len(reorden.etapas)} etapas")
        
        for index, etapa_id in enumerate(reorden.etapas):
            etapa = db.query(EtapaOT).filter(EtapaOT.id == etapa_id).first()
            if etapa:
                etapa.orden = index + 1
                etapa.fecha_actualizacion = datetime.utcnow()
        
        db.commit()
        
        logger.info("✅ FastAPI: Etapas reordenadas exitosamente")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': 'Etapas reordenadas exitosamente'
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al reordenar etapas: {str(e)}")
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error al reordenar etapas: {str(e)}'
            }
        )


# Endpoints para gestión de OTs - separados lógicamente pero en el mismo router
@router.put("/ots/{folio}/etapa")
async def cambiar_etapa_ot(
    folio: str,
    cambio: CambioEtapa,
    db: Session = Depends(get_db)
):
    """
    Cambiar la etapa de una OT específica
    Migrado de Flask: PUT /ots/<folio>/etapa
    """
    try:
        logger.info(f"🔄 FastAPI: Cambiando etapa de OT {folio} a {cambio.estado}")
        
        # Buscar la OT
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        if not ot:
            logger.warning(f"⚠️ FastAPI: OT con folio {folio} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'OT con folio {folio} no encontrada'
                }
            )
        
        # Verificar que la nueva etapa existe y está activa
        etapa = db.query(EtapaOT).filter(
            EtapaOT.nombre == cambio.estado,
            EtapaOT.activa == True
        ).first()
        
        if not etapa:
            logger.warning(f"⚠️ FastAPI: La etapa '{cambio.estado}' no existe o no está activa")
            return JSONResponse(
                status_code=400,
                content={
                    'success': False,
                    'error': f'La etapa "{cambio.estado}" no existe o no está activa'
                }
            )
        
        # 🔒 VALIDACIÓN: Verificar campos obligatorios para etapas finales
        etapas_finales = ['terminada', 'completada', 'cerrada']
        if cambio.estado.lower() in etapas_finales:
            campos_faltantes = []
            
            if not ot.fecha_visita:
                campos_faltantes.append("Fecha de visita")
            
            if not ot.tiempo_estimado or ot.tiempo_estimado.strip() == "":
                campos_faltantes.append("Tiempo (duración)")
            
            if campos_faltantes:
                logger.warning(f"⚠️ FastAPI: No se puede cerrar OT {folio} - Faltan campos: {', '.join(campos_faltantes)}")
                return JSONResponse(
                    status_code=400,
                    content={
                        'success': False,
                        'error': f'No se puede cerrar la OT. Faltan los siguientes campos obligatorios: {", ".join(campos_faltantes)}',
                        'campos_faltantes': campos_faltantes
                    }
                )
        
        estado_anterior = ot.etapa
        
        # Actualizar la OT
        ot.etapa = cambio.estado
        ot.fecha_actualizacion = datetime.utcnow()
        
        # Crear historial de cambio
        historial = HistorialEtapa(
            ot_id=ot.id,
            etapa_anterior=estado_anterior,
            etapa_nueva=cambio.estado,
            usuario_cambio=cambio.usuario,
            comentario=cambio.motivo,
            fecha_cambio=datetime.utcnow()
        )
        
        db.add(historial)
        
        # Verificar si la etapa anterior era final
        etapa_anterior_obj = db.query(EtapaOT).filter(
            EtapaOT.nombre == estado_anterior
        ).first()
        etapa_anterior_es_final = etapa_anterior_obj and etapa_anterior_obj.es_final
        
        # Actualizar solicitud asociada (B2C o B2B)
        if ot.solicitud_id:
            # Determinar el tipo de solicitud y actualizar correspondientemente
            if ot.tipo_solicitud == 'B2B':
                # Actualizar solicitud B2B
                solicitud_b2b = db.query(B2BSolicitud).filter(
                    B2BSolicitud.id == ot.solicitud_id
                ).first()
                
                if solicitud_b2b:
                    if etapa.es_final:
                        solicitud_b2b.estado = 'completada'
                        solicitud_b2b.fecha_actualizacion = datetime.utcnow()
                        logger.info(f"✅ Solicitud B2B {solicitud_b2b.folio} marcada como completada")
                    elif etapa_anterior_es_final and not etapa.es_final:
                        solicitud_b2b.estado = 'en_proceso'
                        solicitud_b2b.fecha_actualizacion = datetime.utcnow()
                        logger.info(f"🔄 Solicitud B2B {solicitud_b2b.folio} revertida a en_proceso")
            else:
                # Actualizar solicitud B2C (comportamiento original)
                solicitud = db.query(B2CSolicitudes).filter(
                    B2CSolicitudes.id == ot.solicitud_id
                ).first()
                
                if solicitud:
                    if etapa.es_final:
                        solicitud.estado = 'completada'
                        solicitud.fecha_actualizacion = datetime.utcnow()
                        logger.info(f"✅ Solicitud B2C ID {solicitud.id} marcada como completada")
                    elif etapa_anterior_es_final and not etapa.es_final:
                        solicitud.estado = 'pendiente'
                        solicitud.fecha_actualizacion = datetime.utcnow()
                        logger.info(f"🔄 Solicitud B2C ID {solicitud.id} revertida a pendiente")
        
        db.commit()
        
        # Enviar notificación si la OT se completó
        if cambio.estado.lower() in ['terminada', 'completada']:
            try:
                notification_service = NotificationService()
                resultado = notification_service.notify_ot_completion(ot.folio, db_session=db)
                if resultado.get('success'):
                    logger.info(f"📧 FastAPI: Notificación enviada exitosamente para OT {folio} completada")
                else:
                    logger.warning(f"⚠️ FastAPI: Fallo al enviar notificación para OT {folio}: {resultado.get('message')}")
            except Exception as notif_error:
                logger.error(f"❌ FastAPI: Error al enviar notificación: {str(notif_error)}")
                pass
        
        logger.info(f"✅ FastAPI: Etapa de OT {folio} cambiada de '{estado_anterior}' a '{cambio.estado}'")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'data': {
                    'folio': ot.folio,
                    'estado_anterior': estado_anterior,
                    'estado_nuevo': cambio.estado,
                    'fecha_cambio': historial.fecha_cambio.isoformat(),
                    'solicitud_actualizada': ot.solicitud_id is not None and (
                        etapa.es_final or (etapa_anterior_es_final and not etapa.es_final)
                    )
                },
                'message': f'Etapa de OT {folio} cambiada exitosamente de "{estado_anterior}" a "{cambio.estado}"'
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al cambiar etapa de OT {folio}: {str(e)}")
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error al cambiar etapa de OT: {str(e)}'
            }
        )


@router.get("/ots/{folio}/historial-etapas")
async def obtener_historial_etapas(
    folio: str,
    db: Session = Depends(get_db)
):
    """
    Obtener el historial de cambios de etapa de una OT
    Migrado de Flask: GET /ots/<folio>/historial-etapas
    """
    try:
        logger.info(f"🔍 FastAPI: Obteniendo historial de etapas para OT {folio}")
        
        # Buscar la OT
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        if not ot:
            logger.warning(f"⚠️ FastAPI: OT con folio {folio} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'error': f'OT con folio {folio} no encontrada'
                }
            )
        
        # Obtener historial de cambios
        historial = db.query(HistorialEtapa).filter(
            HistorialEtapa.ot_id == ot.id
        ).order_by(HistorialEtapa.fecha_cambio.desc()).all()
        
        historial_data = []
        for cambio in historial:
            historial_data.append({
                'id': cambio.id,
                'folio': str(cambio.ot.folio) if cambio.ot else folio,
                'etapa_anterior': cambio.etapa_anterior or 'Sin etapa',
                'etapa_nueva': cambio.etapa_nueva,
                'usuario': cambio.usuario_cambio or 'Sistema',
                'motivo': cambio.comentario or 'Sin motivo especificado',
                'fecha_cambio': cambio.fecha_cambio.isoformat()
            })
        
        logger.info(f"✅ FastAPI: {len(historial_data)} cambios de etapa encontrados para OT {folio}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'data': historial_data,
                'message': 'Historial de etapas obtenido exitosamente',
                'folio': folio,
                'total_cambios': len(historial_data)
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error al obtener historial de etapas: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': f'Error al obtener historial de etapas: {str(e)}'
            }
        )
