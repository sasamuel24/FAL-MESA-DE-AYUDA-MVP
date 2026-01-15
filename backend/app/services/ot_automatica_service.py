"""
Servicio para creación automática de Órdenes de Trabajo (OT)

Este servicio crea automáticamente OTs para solicitudes de zonas específicas
que requieren respuesta inmediata y envía notificación por email al técnico.

Autor: Sistema CafeQuindio
Fecha: 2025-11-04
"""

from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models import OTSolicitud, B2CSolicitudes, User
from app.services.notification_service import notification_service
import logging

logger = logging.getLogger(__name__)

# Configuración: Zonas que requieren creación automática de OT
ZONAS_CON_OT_AUTOMATICA = ["COSTA", "CENTRO", "MEDELLIN", "EJE CAFETERO", "CALI", "QUINDÍO"]


def debe_crear_ot_automatica(zona: str) -> bool:
    """
    Verifica si una zona requiere creación automática de OT
    
    Args:
        zona: Nombre de la zona (ej: "COSTA", "CENTRO", etc.)
    
    Returns:
        bool: True si la zona requiere OT automática, False en caso contrario
    """
    if not zona:
        return False
    
    zona_upper = zona.upper().strip()
    return zona_upper in ZONAS_CON_OT_AUTOMATICA


def generar_folio_ot(db: Session) -> int:
    """
    Genera el siguiente número de folio consecutivo para una OT
    
    Args:
        db: Sesión de base de datos
    
    Returns:
        int: Siguiente número de folio consecutivo
    """
    try:
        # Obtener el último folio registrado
        ultima_ot = db.query(OTSolicitud).order_by(OTSolicitud.folio.desc()).first()
        
        if ultima_ot and ultima_ot.folio:
            # Extraer número del folio (puede ser string o int)
            try:
                ultimo_numero = int(ultima_ot.folio)
                siguiente_folio = ultimo_numero + 1
            except ValueError:
                # Si el folio no es numérico, empezar desde 2000
                logger.warning(f"⚠️ Folio no numérico encontrado: {ultima_ot.folio}. Iniciando desde 2000")
                siguiente_folio = 2000
        else:
            # Si no hay OTs, empezar desde 2000
            siguiente_folio = 2000
        
        logger.info(f"📋 Folio generado: {siguiente_folio}")
        return siguiente_folio
        
    except Exception as e:
        logger.error(f"❌ Error al generar folio: {e}")
        # En caso de error, usar timestamp como fallback
        fallback_folio = int(datetime.now().strftime("%Y%m%d%H%M"))
        logger.warning(f"⚠️ Usando folio fallback basado en timestamp: {fallback_folio}")
        return fallback_folio


def crear_ot_automatica(
    solicitud_id: int,
    tecnico_id: int,
    db: Session
) -> Tuple[bool, Optional[OTSolicitud], Optional[str]]:
    """
    Crea automáticamente una Orden de Trabajo para una solicitud
    y envía notificación por email al técnico asignado
    
    Args:
        solicitud_id: ID de la solicitud B2C
        tecnico_id: ID del técnico asignado
        db: Sesión de base de datos
    
    Returns:
        Tuple[bool, Optional[OTSolicitud], Optional[str]]:
            - bool: True si la OT fue creada exitosamente, False en caso contrario
            - OTSolicitud: Objeto OT creado (o None si falló)
            - str: Mensaje de error (o None si fue exitoso)
    """
    try:
        logger.info(f"🔧 Iniciando creación automática de OT para solicitud {solicitud_id}")
        
        # 1. Verificar que la solicitud existe
        solicitud = db.query(B2CSolicitudes).filter(B2CSolicitudes.id == solicitud_id).first()
        if not solicitud:
            error_msg = f"Solicitud {solicitud_id} no encontrada"
            logger.error(f"❌ {error_msg}")
            return False, None, error_msg
        
        # 2. Verificar que el técnico existe
        tecnico = db.query(User).filter(User.id == tecnico_id).first()
        if not tecnico:
            error_msg = f"Técnico {tecnico_id} no encontrado"
            logger.error(f"❌ {error_msg}")
            return False, None, error_msg
        
        # 3. Verificar que el técnico está activo
        if not tecnico.activo:
            error_msg = f"Técnico {tecnico.nombre} está inactivo"
            logger.error(f"❌ {error_msg}")
            return False, None, error_msg
        
        # 4. Verificar si la zona requiere OT automática
        if not debe_crear_ot_automatica(solicitud.zona):
            logger.info(f"ℹ️ Zona '{solicitud.zona}' no requiere OT automática")
            return False, None, "Zona no requiere OT automática"
        
        # 5. Generar folio consecutivo
        folio = generar_folio_ot(db)
        logger.info(f"📋 Folio asignado: {folio}")
        
        # 6. Crear la OT con datos de la solicitud
        # IMPORTANTE: Solo usar campos que existen en el modelo OTSolicitud
        nueva_ot = OTSolicitud(
            folio=folio,  # Es Integer, no String
            tipo_solicitud='B2C',
            solicitud_id=solicitud_id,
            
            # Ubicación
            zona=solicitud.zona,
            ciudad=solicitud.ciudad,
            tienda=solicitud.tienda,
            
            # Categorización
            categoria=solicitud.categoria,
            subcategoria=solicitud.subcategoria,
            
            # Descripción
            asunto=solicitud.asunto or f"Solicitud {solicitud.zona} - {solicitud.categoria}",
            
            # Asignación
            tecnico_asignado=tecnico.nombre,
            
            # Estado (campos del modelo OTSolicitud)
            etapa='Pendiente',
            prioridad='media',
            tipo_mantenimiento='correctivo',
            
            # Notas con información del solicitante
            notas=f"OT generada automáticamente desde solicitud Zona {solicitud.zona}\n" +
                  f"Solicitante: {solicitud.nombre}\n" +
                  f"Email: {solicitud.correo}\n" +
                  f"Teléfono: {solicitud.telefono}\n" +
                  f"Descripción: {solicitud.descripcion or 'Sin descripción'}",
            
            # Auditoría
            fecha_creacion=datetime.utcnow()
        )
        
        # 7. Guardar en base de datos
        db.add(nueva_ot)
        db.commit()
        db.refresh(nueva_ot)
        
        logger.info(f"✅ OT {folio} creada exitosamente para solicitud {solicitud_id}")
        logger.info(f"   - Técnico asignado: {tecnico.nombre} (ID: {tecnico_id})")
        logger.info(f"   - Zona: {solicitud.zona}")
        logger.info(f"   - Categoría: {solicitud.categoria}")
        logger.info(f"   - Etapa: {nueva_ot.etapa}")
        
        # 8. 📧 ENVIAR NOTIFICACIÓN AL TÉCNICO
        if tecnico.email:
            try:
                logger.info(f"📧 Enviando notificación de asignación al técnico {tecnico.nombre}")
                
                # Usar el servicio de notificación con el ID de la OT
                resultado_email = notification_service.notify_technician_assignment(nueva_ot.id)
                
                if resultado_email.get('success'):
                    logger.info(f"✅ Email de notificación enviado exitosamente a {tecnico.email}")
                else:
                    logger.warning(f"⚠️ No se pudo enviar email: {resultado_email.get('message')}")
                    
            except Exception as email_error:
                logger.error(f"❌ Error al enviar email de notificación: {email_error}")
                # No falla la creación de OT si el email falla
        else:
            logger.warning(f"⚠️ Técnico {tecnico.nombre} no tiene email configurado")
        
        return True, nueva_ot, None
        
    except Exception as e:
        db.rollback()
        error_msg = f"Error al crear OT automática: {str(e)}"
        logger.error(f"❌ {error_msg}", exc_info=True)
        return False, None, error_msg


def verificar_ot_creada(solicitud_id: int, db: Session) -> Optional[OTSolicitud]:
    """
    Verifica si ya existe una OT para una solicitud
    
    Args:
        solicitud_id: ID de la solicitud B2C
        db: Sesión de base de datos
    
    Returns:
        Optional[OTSolicitud]: OT existente o None si no existe
    """
    try:
        ot_existente = db.query(OTSolicitud).filter(
            OTSolicitud.solicitud_id == solicitud_id,
            OTSolicitud.tipo_solicitud == 'B2C'
        ).first()
        
        if ot_existente:
            logger.info(f"ℹ️ Ya existe OT {ot_existente.folio} para solicitud {solicitud_id}")
        
        return ot_existente
        
    except Exception as e:
        logger.error(f"❌ Error al verificar OT existente: {e}")
        return None
