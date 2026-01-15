"""
Servicio de Alertas Semanales de OTs Pendientes
Envía emails dominicales a técnicos con sus OTs pendientes
"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models import OTSolicitud, User
from app.services.email_service import MicrosoftGraphEmailService

logger = logging.getLogger(__name__)

# Etapas consideradas como "pendientes" (no finalizadas)
ETAPAS_PENDIENTES = ['pendiente', 'en_proceso', 'en progreso', 'asignada', 'programada', 'visitada']
# Etapas finalizadas (excluidas de alertas)
ETAPAS_FINALIZADAS = ['terminada', 'completada', 'cerrada', 'cancelada']


class WeeklyAlertsService:
    """Servicio para gestión de alertas semanales de OTs pendientes"""
    
    def __init__(self, db: Session):
        self.db = db
        self.email_service = MicrosoftGraphEmailService()
    
    def get_pending_ots_by_technician(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Obtiene todas las OTs pendientes agrupadas por técnico
        
        Returns:
            Dict con técnico como key y lista de OTs como value
        """
        try:
            # Consultar OTs pendientes (etapas no finalizadas) - CASE INSENSITIVE
            # Usar func.lower() para comparación case-insensitive y filtrar correctamente
            # tanto "Terminada" como "terminada"
            ots_pendientes = self.db.query(OTSolicitud).filter(
                and_(
                    func.lower(OTSolicitud.etapa).notin_([e.lower() for e in ETAPAS_FINALIZADAS]),
                    OTSolicitud.tecnico_asignado.isnot(None),
                    OTSolicitud.tecnico_asignado != ''
                )
            ).all()
            
            logger.info(f"📊 Total OTs pendientes encontradas: {len(ots_pendientes)}")
            
            # Agrupar por técnico
            ots_por_tecnico = {}
            
            for ot in ots_pendientes:
                tecnico_nombre = ot.tecnico_asignado
                
                if tecnico_nombre not in ots_por_tecnico:
                    ots_por_tecnico[tecnico_nombre] = []
                
                # Calcular días transcurridos
                dias_transcurridos = (datetime.utcnow() - ot.fecha_creacion).days if ot.fecha_creacion else 0
                
                # Determinar si es urgente (más de 7 días o prioridad alta)
                es_urgente = dias_transcurridos > 7 or (ot.prioridad and ot.prioridad.lower() == 'alta')
                
                ots_por_tecnico[tecnico_nombre].append({
                    'folio': str(ot.folio),
                    'asunto': ot.asunto,
                    'zona': ot.zona or 'N/A',
                    'ciudad': ot.ciudad or 'N/A',
                    'tienda': ot.tienda or 'N/A',
                    'categoria': ot.categoria or 'N/A',
                    'etapa': ot.etapa,
                    'prioridad': ot.prioridad or 'Media',
                    'fecha_creacion': ot.fecha_creacion.strftime('%d/%m/%Y') if ot.fecha_creacion else 'N/A',
                    'dias_transcurridos': dias_transcurridos,
                    'es_urgente': es_urgente
                })
            
            logger.info(f"👥 OTs agrupadas para {len(ots_por_tecnico)} técnicos")
            
            return ots_por_tecnico
            
        except Exception as e:
            logger.error(f"❌ Error al obtener OTs pendientes: {e}")
            return {}
    
    def get_technician_user(self, technician_name: str) -> Optional[User]:
        """
        Obtiene el usuario técnico completo por su nombre
        
        Args:
            technician_name: Nombre del técnico
        
        Returns:
            Usuario completo o None si no se encuentra
        """
        try:
            # Buscar usuario por nombre (case-insensitive)
            user = self.db.query(User).filter(
                User.nombre.ilike(f"%{technician_name}%")
            ).first()
            
            if user:
                logger.info(f"✅ Usuario encontrado para '{technician_name}': {user.email} (área: {user.area})")
                return user
            else:
                logger.warning(f"⚠️ No se encontró usuario para técnico '{technician_name}'")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error al buscar email de '{technician_name}': {e}")
            return None
    
    def send_individual_alert(self, technician_name: str, ots: List[Dict[str, Any]]) -> bool:
        """
        Envía alerta individual a un técnico con sus OTs pendientes
        
        Args:
            technician_name: Nombre del técnico
            ots: Lista de OTs pendientes del técnico
        
        Returns:
            True si se envió exitosamente, False en caso contrario
        """
        try:
            # Obtener usuario técnico completo
            user = self.get_technician_user(technician_name)
            
            if not user or not user.email:
                logger.warning(f"⚠️ No se puede enviar alerta a '{technician_name}' (sin email)")
                return False
            
            technician_email = user.email
            
            # Contar OTs urgentes
            ots_urgentes = [ot for ot in ots if ot.get('es_urgente', False)]
            total_ots = len(ots)
            total_urgentes = len(ots_urgentes)
            
            # Generar HTML del email
            html_content = self._generate_individual_email_html(
                technician_name, 
                ots, 
                total_ots, 
                total_urgentes
            )
            
            # Asunto del email
            subject = f"🔔 Reporte Semanal: {total_ots} OT{'s' if total_ots != 1 else ''} Pendiente{'s' if total_ots != 1 else ''}"
            
            if total_urgentes > 0:
                subject += f" ({total_urgentes} Urgente{'s' if total_urgentes != 1 else ''})"
            
            # Enviar email
            result = self.email_service.send_email(
                to_email=technician_email,
                subject=subject,
                html_content=html_content
            )
            
            if result:
                logger.info(f"✅ Alerta semanal enviada a {technician_name} ({technician_email}): {total_ots} OTs")
                return True
            else:
                logger.error(f"❌ Fallo al enviar alerta a {technician_name}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error al enviar alerta individual a '{technician_name}': {e}")
            return False
    
    def send_consolidated_summary(self, ots_por_tecnico: Dict[str, List[Dict[str, Any]]]) -> bool:
        """
        Envía resumen consolidado semanal a administradores
        
        Args:
            ots_por_tecnico: Diccionario con OTs agrupadas por técnico
        
        Returns:
            True si se envió exitosamente, False en caso contrario
        """
        try:
            # Separar técnicos por área
            tecnicos_tic = {}
            tecnicos_mantenimiento = {}
            
            for tecnico, ots in ots_por_tecnico.items():
                # Obtener área del técnico desde la base de datos
                usuario = self.get_technician_user(tecnico)
                if usuario and usuario.area:
                    area = usuario.area
                    if 'tic' in area.lower():
                        tecnicos_tic[tecnico] = ots
                        logger.info(f"📋 Técnico '{tecnico}' asignado a TIC (área: {area})")
                    else:
                        tecnicos_mantenimiento[tecnico] = ots
                        logger.info(f"🔧 Técnico '{tecnico}' asignado a Mantenimiento (área: {area})")
                else:
                    # Si no se encuentra el área, asignar a mantenimiento por defecto
                    tecnicos_mantenimiento[tecnico] = ots
                    logger.warning(f"⚠️ Técnico '{tecnico}' asignado a Mantenimiento (sin área definida)")
            
            success_count = 0
            
            # 1. Enviar resumen a Coordinador de Mantenimiento
            if tecnicos_mantenimiento:
                total_tecnicos_mant = len(tecnicos_mantenimiento)
                total_ots_mant = sum(len(ots) for ots in tecnicos_mantenimiento.values())
                total_urgentes_mant = sum(
                    len([ot for ot in ots if ot.get('es_urgente', False)])
                    for ots in tecnicos_mantenimiento.values()
                )
                
                html_content_mant = self._generate_summary_email_html(
                    tecnicos_mantenimiento,
                    total_tecnicos_mant,
                    total_ots_mant,
                    total_urgentes_mant
                )
                
                subject_mant = f"📊 Resumen Semanal - Área Mantenimiento ({total_tecnicos_mant} técnicos, {total_ots_mant} OTs)"
                
                result = self.email_service.send_email(
                    to_email='coordinadormantenimiento@cafequindio.com.co',
                    subject=subject_mant,
                    html_content=html_content_mant
                )
                
                if result:
                    logger.info(f"✅ Resumen de Mantenimiento enviado ({total_tecnicos_mant} técnicos, {total_ots_mant} OTs)")
                    success_count += 1
                else:
                    logger.error(f"❌ Fallo al enviar resumen a coordinadormantenimiento@cafequindio.com.co")
            else:
                logger.info("ℹ️ No hay técnicos de Mantenimiento con OTs pendientes")
            
            # 2. Enviar resumen a Director de TIC
            if tecnicos_tic:
                total_tecnicos_tic = len(tecnicos_tic)
                total_ots_tic = sum(len(ots) for ots in tecnicos_tic.values())
                total_urgentes_tic = sum(
                    len([ot for ot in ots if ot.get('es_urgente', False)])
                    for ots in tecnicos_tic.values()
                )
                
                html_content_tic = self._generate_summary_email_html(
                    tecnicos_tic,
                    total_tecnicos_tic,
                    total_ots_tic,
                    total_urgentes_tic
                )
                
                subject_tic = f"📊 Resumen Semanal - Área TIC ({total_tecnicos_tic} técnicos, {total_ots_tic} OTs)"
                
                result = self.email_service.send_email(
                    to_email='direcciontic@cafequindio.com.co',
                    subject=subject_tic,
                    html_content=html_content_tic
                )
                
                if result:
                    logger.info(f"✅ Resumen de TIC enviado ({total_tecnicos_tic} técnicos, {total_ots_tic} OTs)")
                    success_count += 1
                else:
                    logger.error(f"❌ Fallo al enviar resumen a direcciontic@cafequindio.com.co")
            else:
                logger.info("ℹ️ No hay técnicos de TIC con OTs pendientes")
            
            return success_count > 0
            
        except Exception as e:
            logger.error(f"❌ Error al enviar resumen consolidado: {e}")
            return False
    
    def _generate_individual_email_html(
        self, 
        technician_name: str, 
        ots: List[Dict[str, Any]],
        total_ots: int,
        total_urgentes: int
    ) -> str:
        """
        Genera HTML para email individual de técnico
        
        Args:
            technician_name: Nombre del técnico
            ots: Lista de OTs pendientes
            total_ots: Total de OTs
            total_urgentes: Total de OTs urgentes
        
        Returns:
            HTML del email
        """
        # Ordenar OTs: urgentes primero, luego por fecha de creación
        ots_sorted = sorted(ots, key=lambda x: (not x.get('es_urgente', False), x['fecha_creacion']))
        
        # Generar filas de la tabla
        rows_html = ""
        for ot in ots_sorted:
            # Color de fila según urgencia
            row_bg = "#fff3cd" if ot.get('es_urgente', False) else "#ffffff"
            
            # Badge de prioridad
            prioridad = ot.get('prioridad', 'Media')
            if prioridad.lower() == 'alta':
                badge_color = "#dc3545"
            elif prioridad.lower() == 'media':
                badge_color = "#ffc107"
            else:
                badge_color = "#28a745"
            
            # Indicador de urgencia
            urgencia_icon = "🔴" if ot.get('es_urgente', False) else ""
            
            rows_html += f"""
            <tr style="background-color: {row_bg};">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; color: #00B0B2;">{urgencia_icon} {ot['folio']}</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">{ot['asunto'][:50]}{'...' if len(ot['asunto']) > 50 else ''}</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">{ot['tienda']}</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">{ot['categoria']}</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">
                    <span style="background-color: {badge_color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                        {prioridad}
                    </span>
                </td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">{ot['etapa']}</td>
                <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">{ot['dias_transcurridos']}</td>
            </tr>
            """
        
        # HTML completo
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9;">
            <div style="max-width: 800px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #00B0B2 0%, #0C6659 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">
                        📋 Reporte Semanal de OTs Pendientes
                    </h1>
                    <p style="color: #e0f7f7; margin: 10px 0 0 0; font-size: 14px;">
                        Café Quindío - Sistema de Gestión
                    </p>
                </div>
                
                <!-- Saludo -->
                <div style="padding: 30px;">
                    <h2 style="color: #333231; margin-top: 0;">
                        Hola {technician_name},
                    </h2>
                    <p style="color: #666666; line-height: 1.6; font-size: 16px;">
                        Este es tu reporte semanal de órdenes de trabajo pendientes. A continuación encontrarás el detalle de las <strong>{total_ots} OT{'s' if total_ots != 1 else ''}</strong> que están asignadas a ti y requieren atención.
                    </p>
                    
                    {f'''
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #856404; font-weight: bold;">
                            ⚠️ Tienes {total_urgentes} OT{'s' if total_urgentes != 1 else ''} urgente{'s' if total_urgentes != 1 else ''} (más de 7 días o prioridad alta)
                        </p>
                    </div>
                    ''' if total_urgentes > 0 else ''}
                </div>
                
                <!-- Tabla de OTs -->
                <div style="padding: 0 30px 30px 30px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background-color: #00B0B2; color: white;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #00B0B2;">Folio</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #00B0B2;">Asunto</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #00B0B2;">Tienda</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #00B0B2;">Categoría</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #00B0B2;">Prioridad</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #00B0B2;">Etapa</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #00B0B2;">Días</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows_html}
                        </tbody>
                    </table>
                </div>
                
                <!-- Instrucciones -->
                <div style="padding: 0 30px 30px 30px;">
                    <div style="background-color: #e7f5ff; border-left: 4px solid #0C6659; padding: 15px; border-radius: 4px;">
                        <h3 style="margin-top: 0; color: #0C6659;">📌 Próximos pasos:</h3>
                        <ul style="color: #666666; line-height: 1.8; margin: 10px 0;">
                            <li>Revisa las OTs marcadas como urgentes (🔴) con prioridad</li>
                            <li>Actualiza el estado de las OTs en las que estés trabajando</li>
                            <li>Completa la información de visita y tiempo estimado</li>
                            <li>Contacta al coordinador si necesitas apoyo o tienes preguntas</li>
                        </ul>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
                    <p style="color: #666666; margin: 0; font-size: 12px;">
                        Este es un mensaje automático enviado todos los domingos.<br>
                        Si tienes preguntas, contacta al área de coordinación.
                    </p>
                    <p style="color: #999999; margin: 10px 0 0 0; font-size: 11px;">
                        Café Quindío © {datetime.now().year} - Sistema de Gestión de Mantenimiento
                    </p>
                </div>
                
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _generate_summary_email_html(
        self,
        ots_por_tecnico: Dict[str, List[Dict[str, Any]]],
        total_tecnicos: int,
        total_ots: int,
        total_urgentes: int
    ) -> str:
        """
        Genera HTML para email de resumen consolidado
        
        Args:
            ots_por_tecnico: OTs agrupadas por técnico
            total_tecnicos: Total de técnicos con OTs
            total_ots: Total de OTs pendientes
            total_urgentes: Total de OTs urgentes
        
        Returns:
            HTML del email
        """
        # Generar filas de resumen por técnico
        rows_html = ""
        for tecnico, ots in sorted(ots_por_tecnico.items(), key=lambda x: len(x[1]), reverse=True):
            total_tecnico = len(ots)
            urgentes_tecnico = len([ot for ot in ots if ot.get('es_urgente', False)])
            
            # Color de fila según carga
            if total_tecnico > 10:
                row_bg = "#f8d7da"  # Rojo claro
            elif total_tecnico > 5:
                row_bg = "#fff3cd"  # Amarillo claro
            else:
                row_bg = "#d4edda"  # Verde claro
            
            rows_html += f"""
            <tr style="background-color: {row_bg};">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600; color: #212529;">{tecnico}</td>
                <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center; font-size: 18px; font-weight: bold; color: #00B0B2;">{total_tecnico}</td>
                <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center; font-size: 16px; color: #dc3545; font-weight: bold;">{urgentes_tecnico}</td>
            </tr>
            """
        
        # HTML completo
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9;">
            <div style="max-width: 900px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #008C8E 0%, #0C6659 100%); padding: 40px; text-align: center; border-bottom: 4px solid #00B0B2;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; text-shadow: 0 3px 6px rgba(0,0,0,0.4); font-weight: 700; letter-spacing: -0.5px;">
                        📊 Resumen Semanal - OTs por Técnico
                    </h1>
                    <p style="color: #ffffff; margin: 15px 0 0 0; font-size: 16px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        Café Quindío - Reporte de Distribución
                    </p>
                    <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; font-weight: 500; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        {datetime.now().strftime('%d de %B de %Y')}
                    </p>
                </div>
                
                <!-- Introducción -->
                <div style="padding: 30px;">
                    <p style="color: #495057; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">
                        A continuación encontrarás el detalle de OTs pendientes asignadas a cada técnico, 
                        incluyendo la cantidad total de OTs y cuántas son urgentes (más de 7 días o prioridad alta).
                    </p>
                    
                    <h2 style="color: #212529; border-bottom: 3px solid #00B0B2; padding-bottom: 10px; font-weight: 600;">
                        OTs Pendientes por Técnico
                    </h2>
                    
                    <div style="margin-top: 20px; background-color: #e7f5ff; border-left: 4px solid #0C6659; padding: 15px; border-radius: 4px;">
                        <p style="margin: 0; color: #495057;">
                            <strong style="color: #212529;">💡 Código de colores:</strong>
                            <span style="background-color: #d4edda; color: #155724; padding: 4px 8px; margin: 0 5px; border-radius: 3px; font-weight: 500;">Verde: ≤5 OTs</span>
                            <span style="background-color: #fff3cd; color: #856404; padding: 4px 8px; margin: 0 5px; border-radius: 3px; font-weight: 500;">Amarillo: 6-10 OTs</span>
                            <span style="background-color: #f8d7da; color: #721c24; padding: 4px 8px; margin: 0 5px; border-radius: 3px; font-weight: 500;">Rojo: >10 OTs</span>
                        </p>
                    </div>
                </div>
                
                <!-- Tabla de Técnicos -->
                <div style="padding: 0 30px 30px 30px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background-color: #00B0B2; color: white;">
                                <th style="padding: 15px; text-align: left; border: 1px solid #00B0B2;">Técnico</th>
                                <th style="padding: 15px; text-align: center; border: 1px solid #00B0B2;">Total OTs</th>
                                <th style="padding: 15px; text-align: center; border: 1px solid #00B0B2;">Urgentes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows_html}
                        </tbody>
                    </table>
                </div>
                
                <!-- Recomendaciones -->
                <div style="padding: 0 30px 30px 30px;">
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px;">
                        <h3 style="margin-top: 0; color: #856404;">⚠️ Recomendaciones:</h3>
                        <ul style="color: #856404; line-height: 1.8; margin: 10px 0;">
                            <li>Revisar técnicos con alta carga (>10 OTs) para posible redistribución</li>
                            <li>Priorizar atención de OTs urgentes (más de 7 días pendientes)</li>
                            <li>Realizar seguimiento semanal del avance de cada técnico</li>
                            <li>Validar que todas las OTs tengan fecha de visita y tiempo estimado</li>
                        </ul>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
                    <p style="color: #495057; margin: 0; font-size: 12px;">
                        Este resumen se genera automáticamente todos los domingos.<br>
                        Los técnicos reciben alertas individuales con el detalle de sus OTs.
                    </p>
                    <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 11px;">
                        Café Quindío © {datetime.now().year} - Sistema de Gestión de Mantenimiento
                    </p>
                </div>
                
            </div>
        </body>
        </html>
        """
        
        return html
    
    def execute_weekly_alerts(self) -> Dict[str, Any]:
        """
        Ejecuta el proceso completo de alertas semanales
        
        Returns:
            Dict con resultados de la ejecución
        """
        logger.info("🚀 Iniciando proceso de alertas semanales de OTs pendientes")
        
        start_time = datetime.now()
        
        # Obtener OTs pendientes agrupadas por técnico
        ots_por_tecnico = self.get_pending_ots_by_technician()
        
        if not ots_por_tecnico:
            logger.warning("⚠️ No hay OTs pendientes para enviar alertas")
            return {
                'success': True,
                'tecnicos_alertados': 0,
                'total_ots': 0,
                'resumen_enviado': False,
                'message': 'No hay OTs pendientes'
            }
        
        # Enviar alertas individuales a cada técnico
        tecnicos_exitosos = 0
        tecnicos_fallidos = 0
        
        for tecnico, ots in ots_por_tecnico.items():
            success = self.send_individual_alert(tecnico, ots)
            if success:
                tecnicos_exitosos += 1
            else:
                tecnicos_fallidos += 1
        
        # Enviar resumen consolidado
        resumen_enviado = self.send_consolidated_summary(ots_por_tecnico)
        
        # Estadísticas finales
        total_ots = sum(len(ots) for ots in ots_por_tecnico.values())
        execution_time = (datetime.now() - start_time).total_seconds()
        
        result = {
            'success': True,
            'tecnicos_alertados': tecnicos_exitosos,
            'tecnicos_fallidos': tecnicos_fallidos,
            'total_ots': total_ots,
            'resumen_enviado': resumen_enviado,
            'execution_time_seconds': execution_time
        }
        
        logger.info(f"✅ Proceso de alertas semanales completado en {execution_time:.2f}s")
        logger.info(f"📊 Resultados: {tecnicos_exitosos} técnicos alertados, {total_ots} OTs, resumen enviado: {resumen_enviado}")
        
        return result
