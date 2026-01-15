"""
Router Notas Trazables para FastAPI
Migración de endpoints de notas trazables desde Flask API
Compatibilidad total con respuestas Flask existentes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
import logging

from app.database import get_db
from app.models import OTSolicitud, NotasTrazablesOT, HistorialEtapa, User
from app.core.security import get_current_user

# Configurar logging
logger = logging.getLogger(__name__)

# Pydantic models para validación
class CrearNotaTrazableRequest(BaseModel):
    nota: str = Field(..., min_length=1, description="Contenido de la nota trazable")
    usuario_email: str = Field(..., description="Email del usuario que crea la nota")
    usuario_nombre: str = Field(..., description="Nombre del usuario que crea la nota")
    usuario_rol: str = Field(..., description="Rol del usuario que crea la nota")

class NotaTrazableResponse(BaseModel):
    id: int
    nota: str
    creado_por: str
    nombre_usuario: str
    rol_usuario: str
    fecha_creacion: Optional[datetime]
    ot_folio: int

    class Config:
        from_attributes = True

class EstadisticasNotasResponse(BaseModel):
    total_notas: int
    notas_por_rol: List[Dict[str, Any]]
    notas_por_mes: List[Dict[str, Any]]

# Crear router sin prefijo (se agrega en fastapi_app.py)
router = APIRouter(
    tags=["Notas Trazables"],
    responses={404: {"description": "Not found"}}
)

@router.get("/{folio}/notas-trazables", response_model=None)
async def get_notas_trazables(
    folio: int,
    db: Session = Depends(get_db)
):
    """
    Obtener todas las notas trazables de una OT
    Compatible con Flask: GET /api/ots/{folio}/notas-trazables
    """
    try:
        logger.info(f"📝 FastAPI: Obteniendo notas trazables para OT {folio}")
        
        # Verificar que la OT existe
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        if not ot:
            logger.error(f"❌ FastAPI: OT con folio {folio} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": f"OT con folio {folio} no encontrada"
                }
            )
        
        # Obtener todas las notas trazables ordenadas por fecha de creación
        notas = db.query(NotasTrazablesOT).filter(
            NotasTrazablesOT.ot_folio == folio
        ).order_by(NotasTrazablesOT.fecha_creacion.desc()).all()
        
        # Convertir a diccionarios (simulando el método to_dict() de Flask)
        notas_data = []
        for nota in notas:
            notas_data.append({
                "id": nota.id,
                "nota": nota.nota,
                "creado_por": nota.creado_por,
                "nombre_usuario": nota.nombre_usuario,
                "rol_usuario": nota.rol_usuario,
                "fecha_creacion": nota.fecha_creacion.isoformat() if nota.fecha_creacion else None,
                "ot_folio": nota.ot_folio
            })
        
        logger.info(f"✅ FastAPI: Se encontraron {len(notas_data)} notas trazables para OT {folio}")
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": notas_data,
                "count": len(notas_data)
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error obteniendo notas trazables: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Error interno: {str(e)}"
            }
        )

@router.post("/{folio}/notas-trazables", response_model=None)
async def crear_nota_trazable(
    folio: int,
    nota_data: CrearNotaTrazableRequest,
    db: Session = Depends(get_db)
):
    """
    Crear una nueva nota trazable para una OT
    Compatible con Flask: POST /api/ots/{folio}/notas-trazables
    """
    try:
        logger.info(f"📝 FastAPI: Creando nota trazable para OT {folio} con datos: {nota_data}")
        
        # Verificar que la OT existe
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        if not ot:
            logger.error(f"❌ FastAPI: OT con folio {folio} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": f"OT con folio {folio} no encontrada"
                }
            )
        
        # Validar que la nota no esté vacía (ya validado por Pydantic, pero doble verificación)
        if not nota_data.nota.strip():
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "La nota no puede estar vacía"
                }
            )
        
        # Crear la nueva nota trazable
        nueva_nota = NotasTrazablesOT(
            ot_folio=folio,
            nota=nota_data.nota.strip(),
            creado_por=nota_data.usuario_email,
            nombre_usuario=nota_data.usuario_nombre,
            rol_usuario=nota_data.usuario_rol,
            fecha_creacion=datetime.utcnow()
        )
        
        # Guardar en la base de datos
        db.add(nueva_nota)
        db.flush()  # Para obtener el ID
        
        logger.info(f"✅ FastAPI: Nota trazable creada con ID {nueva_nota.id} para OT {folio}")
        
        # Crear registro en historial de etapa para auditoría
        historial = HistorialEtapa(
            ot_id=ot.id,
            etapa_anterior=ot.etapa,
            etapa_nueva=ot.etapa,  # La etapa no cambia, solo se agrega nota
            usuario_cambio=nota_data.usuario_nombre,
            comentario=f'Nota trazable agregada: {nota_data.nota[:50]}{"..." if len(nota_data.nota) > 50 else ""}',
            fecha_cambio=datetime.utcnow()
        )
        db.add(historial)
        db.commit()
        
        # Convertir a diccionario para respuesta
        nota_response = {
            "id": nueva_nota.id,
            "nota": nueva_nota.nota,
            "creado_por": nueva_nota.creado_por,
            "nombre_usuario": nueva_nota.nombre_usuario,
            "rol_usuario": nueva_nota.rol_usuario,
            "fecha_creacion": nueva_nota.fecha_creacion.isoformat() if nueva_nota.fecha_creacion else None,
            "ot_folio": nueva_nota.ot_folio
        }
        
        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "data": nota_response,
                "message": "Nota trazable creada exitosamente"
            }
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ FastAPI: Error creando nota trazable: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Error interno: {str(e)}"
            }
        )

@router.get("/{folio}/notas-trazables/{nota_id}", response_model=None)
async def get_nota_trazable(
    folio: int,
    nota_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtener una nota trazable específica
    Compatible con Flask: GET /api/ots/{folio}/notas-trazables/{nota_id}
    """
    try:
        logger.info(f"📝 FastAPI: Obteniendo nota trazable {nota_id} para OT {folio}")
        
        nota = db.query(NotasTrazablesOT).filter(
            NotasTrazablesOT.id == nota_id,
            NotasTrazablesOT.ot_folio == folio
        ).first()
        
        if not nota:
            logger.error(f"❌ FastAPI: Nota {nota_id} no encontrada para OT {folio}")
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": f"Nota {nota_id} no encontrada para OT {folio}"
                }
            )
        
        # Convertir a diccionario
        nota_data = {
            "id": nota.id,
            "nota": nota.nota,
            "creado_por": nota.creado_por,
            "nombre_usuario": nota.nombre_usuario,
            "rol_usuario": nota.rol_usuario,
            "fecha_creacion": nota.fecha_creacion.isoformat() if nota.fecha_creacion else None,
            "ot_folio": nota.ot_folio
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": nota_data
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error obteniendo nota trazable: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Error interno: {str(e)}"
            }
        )

@router.delete("/{folio}/notas-trazables/{nota_id}", response_model=None)
async def eliminar_nota_trazable(
    folio: int,
    nota_id: int,
    db: Session = Depends(get_db)
):
    """
    Eliminar una nota trazable específica
    Compatible con Flask: DELETE /api/ots/{folio}/notas-trazables/{nota_id}
    """
    try:
        logger.info(f"🗑️ FastAPI: Eliminando nota trazable {nota_id} de OT {folio}")
        
        # Verificar que la OT existe
        ot = db.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
        if not ot:
            logger.error(f"❌ FastAPI: OT con folio {folio} no encontrada")
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": f"OT con folio {folio} no encontrada"
                }
            )
        
        # Buscar la nota trazable específica
        nota = db.query(NotasTrazablesOT).filter(
            NotasTrazablesOT.id == nota_id,
            NotasTrazablesOT.ot_folio == folio
        ).first()
        
        if not nota:
            logger.error(f"❌ FastAPI: Nota {nota_id} no encontrada para OT {folio}")
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": f"Nota {nota_id} no encontrada para OT {folio}"
                }
            )
        
        # Guardar información de la nota antes de eliminarla (para auditoría)
        nota_info = {
            "id": nota.id,
            "nota": nota.nota,
            "creado_por": nota.creado_por,
            "nombre_usuario": nota.nombre_usuario,
            "rol_usuario": nota.rol_usuario,
            "fecha_creacion": nota.fecha_creacion.isoformat() if nota.fecha_creacion else None
        }
        
        # Eliminar la nota de la base de datos
        db.delete(nota)
        
        # Crear registro en historial de etapa para auditoría
        historial = HistorialEtapa(
            ot_id=ot.id,
            etapa_anterior=ot.etapa,
            etapa_nueva=ot.etapa,  # La etapa no cambia
            usuario_cambio=nota.nombre_usuario,
            comentario=f'Nota trazable eliminada: "{nota.nota[:50]}{"..." if len(nota.nota) > 50 else ""}"',
            fecha_cambio=datetime.utcnow()
        )
        db.add(historial)
        
        # Confirmar cambios
        db.commit()
        
        logger.info(f"✅ FastAPI: Nota trazable {nota_id} eliminada exitosamente de OT {folio}")
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Nota trazable eliminada exitosamente",
                "eliminada": nota_info
            }
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ FastAPI: Error eliminando nota trazable: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Error interno: {str(e)}"
            }
        )

@router.get("/notas-trazables/estadisticas", response_model=None)
async def get_estadisticas_notas_trazables(
    db: Session = Depends(get_db)
):
    """
    Obtener estadísticas de notas trazables
    Compatible con Flask: GET /api/ots/notas-trazables/estadisticas
    """
    try:
        logger.info("📊 FastAPI: Obteniendo estadísticas de notas trazables")
        
        # Conteo total de notas
        total_notas = db.query(NotasTrazablesOT).count()
        
        # Notas por rol
        notas_por_rol = db.query(
            NotasTrazablesOT.rol_usuario,
            func.count(NotasTrazablesOT.id).label('count')
        ).group_by(NotasTrazablesOT.rol_usuario).all()
        
        # Notas por mes (últimos 6 meses)
        fecha_limite = datetime.utcnow() - timedelta(days=180)
        
        notas_recientes = db.query(
            func.date_trunc('month', NotasTrazablesOT.fecha_creacion).label('mes'),
            func.count(NotasTrazablesOT.id).label('count')
        ).filter(
            NotasTrazablesOT.fecha_creacion >= fecha_limite
        ).group_by('mes').order_by('mes').all()
        
        # Formatear respuesta
        estadisticas_data = {
            "total_notas": total_notas,
            "notas_por_rol": [{"rol": rol, "count": count} for rol, count in notas_por_rol],
            "notas_por_mes": [
                {
                    "mes": mes.isoformat() if mes else None, 
                    "count": count
                } for mes, count in notas_recientes
            ]
        }
        
        logger.info(f"✅ FastAPI: Estadísticas obtenidas - Total notas: {total_notas}")
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": estadisticas_data
            }
        )
        
    except Exception as e:
        logger.error(f"❌ FastAPI: Error obteniendo estadísticas: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Error interno: {str(e)}"
            }
        )
