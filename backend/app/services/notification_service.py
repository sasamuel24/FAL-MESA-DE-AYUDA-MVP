"""
Servicio de notificaciones para manejar cambios de estado en solicitudes
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.models import OTSolicitud
from app.services.email_service import email_service

# Importaciones compatibles con FastAPI y Flask
try:
    # FastAPI database session
    from app.database import SessionLocal
    USING_FASTAPI = True
    print("🚀 NotificationService: Usando FastAPI database session")
except ImportError:
    # Flask database session (fallback)
    from app import db
    USING_FASTAPI = False
    print("🌶️ NotificationService: Usando Flask database session")

logger = logging.getLogger(__name__)

class NotificationService:
    """
    Servicio que maneja las notificaciones automáticas basadas en cambios de estado
    """
    
    def __init__(self):
        self.email_service = email_service
    
    def notify_status_change(self, solicitud_id: int, new_status: str, old_status: Optional[str] = None) -> Dict[str, Any]:
        """
        Procesa notificaciones cuando cambia el estado de una solicitud
        
        Args:
            solicitud_id (int): ID de la solicitud
            new_status (str): Nuevo estado
            old_status (str, optional): Estado anterior
            
        Returns:
            dict: Resultado de la operación
        """
        try:
            # Buscar la solicitud en la base de datos
            solicitud = OTSolicitud.query.get(solicitud_id)
            if not solicitud:
                return {
                    'success': False,
                    'message': f'Solicitud con ID {solicitud_id} no encontrada'
                }
            
            # Log del cambio de estado
            logger.info(f"Procesando cambio de estado: {old_status} -> {new_status} para solicitud {solicitud_id}")
            
            # Determinar qué tipo de notificación enviar
            if new_status.lower() == 'completada':
                return self._send_completion_notification(solicitud)
            elif new_status.lower() == 'en_proceso':
                return self._send_progress_notification(solicitud)
            elif new_status.lower() == 'cancelada':
                return self._send_cancellation_notification(solicitud)
            else:
                logger.info(f"No hay notificación configurada para el estado: {new_status}")
                return {
                    'success': True,
                    'message': f'No se requiere notificación para el estado: {new_status}'
                }
                
        except Exception as e:
            error_msg = f"Error procesando notificación de cambio de estado: {e}"
            logger.error(error_msg)
            return {
                'success': False,
                'message': error_msg
            }
    
    def _send_completion_notification(self, solicitud: OTSolicitud) -> Dict[str, Any]:
        """
        Envía notificación de solicitud completada
        
        Args:
            solicitud (OTSolicitud): La solicitud completada
            
        Returns:
            dict: Resultado de la operación
        """
        try:
            # Verificar que tenemos los datos necesarios
            if not solicitud.email:
                return {
                    'success': False,
                    'message': f'La solicitud {solicitud.id} no tiene email registrado'
                }
            
            # Preparar los datos para el correo
            user_name = solicitud.nombre or "Cliente"
            asunto = solicitud.asunto or "Solicitud de servicio"
            folio = solicitud.folio if hasattr(solicitud, 'folio') else f"SOL-{solicitud.id}"
            fecha_completado = datetime.now().strftime("%d/%m/%Y a las %H:%M")
            
            # Enviar el correo de completado
            result = self.email_service.send_completion_notification(
                to_email=solicitud.email,
                user_name=user_name,
                asunto=asunto,
                folio=folio,
                fecha_completado=fecha_completado
            )
            
            if result['success']:
                logger.info(f"Correo de completado enviado exitosamente a {solicitud.email} para solicitud {solicitud.id}")
            else:
                logger.error(f"Error enviando correo de completado: {result['message']}")
            
            return result
            
        except Exception as e:
            error_msg = f"Error enviando notificación de completado: {e}"
            logger.error(error_msg)
            return {
                'success': False,
                'message': error_msg
            }
    
    def _send_progress_notification(self, solicitud: OTSolicitud) -> Dict[str, Any]:
        """
        Envía notificación de solicitud en progreso (para futuro uso)
        
        Args:
            solicitud (OTSolicitud): La solicitud en progreso
            
        Returns:
            dict: Resultado de la operación
        """
        # Por ahora, solo registramos el evento
        logger.info(f"Solicitud {solicitud.id} cambió a 'En Proceso' - Notificación de progreso no implementada aún")
        return {
            'success': True,
            'message': 'Notificación de progreso registrada (no implementada aún)'
        }
    
    def _send_cancellation_notification(self, solicitud: OTSolicitud) -> Dict[str, Any]:
        """
        Envía notificación de solicitud cancelada (para futuro uso)
        
        Args:
            solicitud (OTSolicitud): La solicitud cancelada
            
        Returns:
            dict: Resultado de la operación
        """
        # Por ahora, solo registramos el evento
        logger.info(f"Solicitud {solicitud.id} cambió a 'Cancelada' - Notificación de cancelación no implementada aún")
        return {
            'success': True,
            'message': 'Notificación de cancelación registrada (no implementada aún)'
        }
    
    def update_solicitud_status(self, solicitud_id: int, new_status: str) -> Dict[str, Any]:
        """
        Actualiza el estado de una solicitud y dispara las notificaciones correspondientes
        
        Args:
            solicitud_id (int): ID de la solicitud
            new_status (str): Nuevo estado
            
        Returns:
            dict: Resultado de la operación completa
        """
        try:
            # Buscar la solicitud
            solicitud = OTSolicitud.query.get(solicitud_id)
            if not solicitud:
                return {
                    'success': False,
                    'message': f'Solicitud con ID {solicitud_id} no encontrada'
                }
            
            # Guardar el estado anterior
            old_status = solicitud.status if hasattr(solicitud, 'status') else None
            
            # Actualizar el estado en la base de datos
            if hasattr(solicitud, 'status'):
                solicitud.status = new_status
            
            # Actualizar fecha de modificación
            if hasattr(solicitud, 'updated_at'):
                solicitud.updated_at = datetime.utcnow()
            
            # Si es completada, actualizar fecha de completado
            if new_status.lower() == 'completada' and hasattr(solicitud, 'fecha_completado'):
                solicitud.fecha_completado = datetime.utcnow()
            
            # Guardar cambios en la base de datos - compatible con FastAPI y Flask
            if USING_FASTAPI:
                # FastAPI - usar session local
                session = SessionLocal()
                try:
                    session.add(solicitud)
                    session.commit()
                    session.refresh(solicitud)
                    print("✅ FastAPI: Estado actualizado y guardado en base de datos")
                finally:
                    session.close()
            else:
                # Flask - usar db.session tradicional
                db.session.commit()
                print("✅ Flask: Estado actualizado y guardado en base de datos")
            
            # Enviar notificación
            notification_result = self.notify_status_change(solicitud_id, new_status, old_status)
            
            return {
                'success': True,
                'message': f'Estado actualizado a {new_status} para solicitud {solicitud_id}',
                'notification_result': notification_result
            }
            
        except Exception as e:
            # Rollback compatible con FastAPI y Flask
            if USING_FASTAPI:
                # FastAPI - manejar rollback si session está disponible
                try:
                    if 'session' in locals():
                        session.rollback()
                        session.close()
                    print("🔄 FastAPI: Rollback ejecutado")
                except:
                    pass
            else:
                # Flask - rollback tradicional
                db.session.rollback()
                print("🔄 Flask: Rollback ejecutado")
                
            error_msg = f"Error actualizando estado de solicitud: {e}"
            logger.error(error_msg)
            return {
                'success': False,
                'message': error_msg
            }
    
    def get_solicitudes_by_status(self, status: str) -> List[Dict[str, Any]]:
        """
        Obtiene todas las solicitudes con un estado específico
        
        Args:
            status (str): Estado a buscar
            
        Returns:
            list: Lista de solicitudes con el estado especificado
        """
        try:
            if hasattr(OTSolicitud, 'status'):
                solicitudes = OTSolicitud.query.filter_by(status=status).all()
            else:
                # Si no hay campo status, devolver lista vacía
                solicitudes = []
            
            result = []
            for solicitud in solicitudes:
                result.append({
                    'id': solicitud.id,
                    'folio': getattr(solicitud, 'folio', f"SOL-{solicitud.id}"),
                    'asunto': solicitud.asunto,
                    'email': solicitud.email,
                    'nombre': solicitud.nombre,
                    'status': getattr(solicitud, 'status', 'unknown'),
                    'created_at': solicitud.created_at.isoformat() if hasattr(solicitud, 'created_at') else None
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error obteniendo solicitudes por estado: {e}")
            return []

    def notify_ot_completion(self, folio: str, db_session=None) -> Dict[str, Any]:
        """
        Envía notificación por email cuando una OT es marcada como completada
        Compatible con Flask y FastAPI
        
        Args:
            folio (str): Folio de la OT
            db_session: Sesión de base de datos (para FastAPI) - opcional
            
        Returns:
            dict: Resultado de la operación
        """
        try:
            # Buscar la OT por folio - compatible con Flask y FastAPI
            if db_session:
                # FastAPI - usar sesión proporcionada
                ot = db_session.query(OTSolicitud).filter(OTSolicitud.folio == folio).first()
            else:
                # Flask - usar query tradicional
                ot = OTSolicitud.query.filter_by(folio=folio).first()
                
            if not ot:
                return {
                    'success': False,
                    'message': f'OT con folio {folio} no encontrada'
                }
            
            # Buscar la solicitud relacionada
            if not ot.solicitud_id:
                return {
                    'success': False,
                    'message': f'OT {folio} no tiene solicitud relacionada'
                }
            
            from app.models import B2CSolicitudes
            
            # Buscar solicitud - compatible con Flask y FastAPI
            if db_session:
                # FastAPI - usar sesión proporcionada
                solicitud = db_session.query(B2CSolicitudes).filter(B2CSolicitudes.id == ot.solicitud_id).first()
            else:
                # Flask - usar query tradicional
                solicitud = B2CSolicitudes.query.get(ot.solicitud_id)
                
            if not solicitud:
                return {
                    'success': False,
                    'message': f'Solicitud relacionada a OT {folio} no encontrada'
                }
            
            # Preparar datos para el email
            fecha_completado = datetime.now().strftime('%d de %B de %Y')
            
            # Enviar el email
            resultado = self.email_service.send_completion_notification(
                to_email=solicitud.correo,
                user_name=solicitud.nombre,
                asunto=solicitud.asunto or f'Solicitud {folio}',
                folio=str(folio),  # Convertir folio a string
                fecha_completado=fecha_completado
            )
            
            if resultado.get('success'):
                logger.info(f"✅ Email de completación enviado exitosamente para OT {folio}")
            else:
                logger.error(f"❌ Error al enviar email para OT {folio}: {resultado.get('message')}")
            
            return resultado
            
        except Exception as e:
            logger.error(f"Error en notify_ot_completion para OT {folio}: {str(e)}")
            return {
                'success': False,
                'message': f'Error al procesar notificación: {str(e)}'
            }

    def notify_technician_assignment(self, ot_id: int) -> Dict[str, Any]:
        """
        Envía notificación por email cuando se asigna una OT a un técnico
        Compatible con Flask y FastAPI
        
        Args:
            ot_id (int): ID de la orden de trabajo
            
        Returns:
            dict: Resultado de la operación
        """
        session = None
        try:
            logger.info(f"🔔 NOTIFICACIÓN: ==> INICIO PROCESO DE ASIGNACIÓN <==")
            logger.info(f"🔔 NOTIFICACIÓN: OT ID recibido: {ot_id}")
            
            # Buscar la OT por ID - compatible con Flask y FastAPI
            ot = None
            if USING_FASTAPI:
                session = SessionLocal()
                ot = session.query(OTSolicitud).filter(OTSolicitud.id == ot_id).first()
                logger.info("🚀 FastAPI: Usando session local para consultar OT")
            else:
                # Flask - usar query tradicional
                ot = OTSolicitud.query.get(ot_id)
                logger.info("🌶️ Flask: Usando query tradicional para consultar OT")
            
            if not ot:
                logger.error(f"❌ NOTIFICACIÓN: OT con ID {ot_id} NO ENCONTRADA")
                return {
                    'success': False,
                    'message': f'OT con ID {ot_id} no encontrada'
                }
            
            logger.info(f"✅ NOTIFICACIÓN: OT encontrada - Folio: {ot.folio}")
            
            # Verificar que tenga técnico asignado
            if not ot.tecnico_asignado:
                logger.error(f"❌ NOTIFICACIÓN: OT {ot.folio} no tiene técnico asignado")
                return {
                    'success': False,
                    'message': 'OT no tiene técnico asignado'
                }
            
            logger.info(f"✅ NOTIFICACIÓN: Técnico asignado: {ot.tecnico_asignado}")
            
            # Buscar solicitud - compatible con Flask y FastAPI
            solicitud = None
            client_name = "Cliente no especificado"
            if ot.solicitud_id:
                from app.models import B2CSolicitudes
                if USING_FASTAPI:
                    # FastAPI - usar session local
                    solicitud = session.query(B2CSolicitudes).filter(B2CSolicitudes.id == ot.solicitud_id).first()
                    logger.info("🚀 FastAPI: Usando session local para consultar solicitud")
                else:
                    # Flask - usar query tradicional
                    solicitud = B2CSolicitudes.query.get(ot.solicitud_id)
                    logger.info("🌶️ Flask: Usando query tradicional para consultar solicitud")
                
                if solicitud:
                    client_name = solicitud.nombre or "Cliente no especificado"
                    logger.info(f"✅ NOTIFICACIÓN: Solicitud encontrada - Cliente: {client_name}")
            
            # Buscar el técnico por nombre - compatible con Flask y FastAPI
            from app.models import User
            tecnico = None
            if USING_FASTAPI:
                # FastAPI - usar session local
                tecnico = session.query(User).filter(
                    User.nombre == ot.tecnico_asignado,
                    User.rol == 'tecnico'
                ).first()
                logger.info("🚀 FastAPI: Usando session local para consultar técnico")
            else:
                # Flask - usar query tradicional
                tecnico = User.query.filter(
                    User.nombre == ot.tecnico_asignado,
                    User.rol == 'tecnico'
                ).first()
                logger.info("🌶️ Flask: Usando query tradicional para consultar técnico")
            
            if not tecnico:
                logger.error(f"❌ NOTIFICACIÓN: Técnico '{ot.tecnico_asignado}' NO ENCONTRADO en la base de datos")
                return {
                    'success': False,
                    'message': f'Técnico "{ot.tecnico_asignado}" no encontrado en el sistema'
                }
            
            logger.info(f"✅ NOTIFICACIÓN: Técnico encontrado en DB - Email: {tecnico.email}")
            
            # Verificar que el técnico tenga email
            if not tecnico.email:
                logger.error(f"❌ NOTIFICACIÓN: El técnico {tecnico.nombre} NO TIENE EMAIL configurado")
                return {
                    'success': False,
                    'message': f'El técnico {tecnico.nombre} no tiene email configurado'
                }
            
            # Preparar ubicación
            location = None
            if ot.tienda and ot.ciudad:
                location = f"{ot.tienda}, {ot.ciudad}"
            elif ot.ciudad:
                location = ot.ciudad
            elif ot.zona:
                location = ot.zona
            
            logger.info(f"📍 NOTIFICACIÓN: Ubicación: {location}")
            logger.info(f"📧 NOTIFICACIÓN: ==> ENVIANDO EMAIL <==")
            
            # Enviar el email usando la función global
            from app.services.email_service import send_technician_assignment_email
            resultado = send_technician_assignment_email(
                to_email=tecnico.email,
                technician_name=tecnico.nombre,
                folio=str(ot.folio),
                client_name=client_name,
                description=ot.asunto or "Sin descripción",
                priority=ot.prioridad or "Normal",
                location=location
            )
            
            logger.info(f"📧 NOTIFICACIÓN: Resultado del email service: {resultado}")
            
            if resultado.get('success'):
                logger.info(f"🎉 NOTIFICACIÓN: EMAIL ENVIADO EXITOSAMENTE al técnico {tecnico.nombre} para OT {ot.folio}")
                return {
                    'success': True,
                    'message': f'Notificación enviada a {tecnico.nombre} ({tecnico.email})',
                    'technician': tecnico.nombre,
                    'email': tecnico.email,
                    'folio': ot.folio
                }
            else:
                logger.error(f"💥 NOTIFICACIÓN: ERROR AL ENVIAR EMAIL para OT {ot.folio}: {resultado.get('message')}")
                return {
                    'success': False,
                    'message': f'Error al enviar email: {resultado.get("error", "Error desconocido")}'
                }
            
        except Exception as e:
            logger.error(f"💥 NOTIFICACIÓN: EXCEPCIÓN en notify_technician_assignment para OT ID {ot_id}: {str(e)}")
            import traceback
            logger.error(f"💥 NOTIFICACIÓN: Stack trace: {traceback.format_exc()}")
            return {
                'success': False,
                'message': f'Error al procesar notificación: {str(e)}'
            }
        finally:
            # Cerrar session si es FastAPI
            if USING_FASTAPI and session:
                try:
                    session.close()
                    logger.info("🚀 FastAPI: Session cerrada correctamente")
                except:
                    pass


# Instancia global del servicio de notificaciones
notification_service = NotificationService()


# Funciones globales para usar el servicio
def notify_status_change(solicitud_id: int, new_status: str, old_status: Optional[str] = None) -> Dict[str, Any]:
    """
    Función global para notificar cambios de estado
    
    Args:
        solicitud_id (int): ID de la solicitud
        new_status (str): Nuevo estado
        old_status (str, optional): Estado anterior
        
    Returns:
        dict: Resultado de la operación
    """
    return notification_service.notify_status_change(solicitud_id, new_status, old_status)


def update_solicitud_status(solicitud_id: int, new_status: str) -> Dict[str, Any]:
    """
    Función global para actualizar estado y enviar notificaciones
    
    Args:
        solicitud_id (int): ID de la solicitud
        new_status (str): Nuevo estado
        
    Returns:
        dict: Resultado de la operación
    """
    return notification_service.update_solicitud_status(solicitud_id, new_status)


def send_completion_email(to_email: str, user_name: str, asunto: str, folio: str, fecha_completado: Optional[str] = None) -> Dict[str, Any]:
    """
    Función global para enviar correo de completado directamente
    
    Args:
        to_email (str): Correo del usuario
        user_name (str): Nombre del usuario
        asunto (str): Asunto de la solicitud
        folio (str): Folio de la solicitud
        fecha_completado (str, optional): Fecha de completado
        
    Returns:
        dict: Resultado de la operación
    """
    return email_service.send_completion_notification(to_email, user_name, asunto, folio, fecha_completado)


# Instancia global del servicio de notificaciones
notification_service = NotificationService()
