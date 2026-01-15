"""
Servicio de correo electrónico usando Microsoft Graph API
"""
import os
import requests
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging
from pathlib import Path
import pytz

# Cargar variables de entorno si no están disponibles
from dotenv import load_dotenv
if not os.getenv('TENANT_ID'):
    env_path = Path(__file__).parent.parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"🔧 Email Service: Variables cargadas desde {env_path}")

logger = logging.getLogger(__name__)

# Zona horaria de Colombia
COLOMBIA_TZ = pytz.timezone("America/Bogota")

# Mapeo de zonas a correos de jefes de zona
# NOTA: Las zonas en BD están en MAYÚSCULAS, pero el sistema es case-insensitive
JEFES_ZONA = {
    "COSTA": "jefezonacosta@cafequindio.com.co",
    "CALI": "administradorcali@cafequindio.com.co",
    "CENTRO": "jefedezonatiendascentro@cafequindio.com.co",
    "EJE CAFETERO": "jefedezonaejecafetero@cafequindio.com.co",
    "MEDELLIN": "jefezonamedellin@cafequindio.com.co",
    "QUINDÍO": "jefedezonaquindio@cafequindio.com.co"
}

def get_jefe_zona_email(zona: Optional[str]) -> Optional[str]:
    """
    Obtiene el email del jefe de zona correspondiente
    
    Args:
        zona: Nombre de la zona (case-insensitive)
    
    Returns:
        str: Email del jefe de zona o None si no existe
    """
    if not zona:
        logger.warning("⚠️ get_jefe_zona_email: zona es None o vacío")
        return None
    
    zona_key = zona.strip()
    
    # Buscar en el diccionario (case-insensitive)
    # Primero intentar coincidencia exacta
    email = JEFES_ZONA.get(zona_key)
    
    # Si no hay coincidencia exacta, buscar ignorando mayúsculas/minúsculas
    if not email:
        zona_lower = zona_key.lower()
        for key, value in JEFES_ZONA.items():
            if key.lower() == zona_lower:
                email = value
                logger.info(f"✅ Zona encontrada (case-insensitive): '{zona_key}' → '{key}'")
                break
    
    if not email:
        logger.warning(f"⚠️ get_jefe_zona_email: Zona '{zona_key}' no encontrada en el mapeo de jefes de zona")
        logger.info(f"📋 Zonas disponibles: {', '.join(JEFES_ZONA.keys())}")
    else:
        logger.info(f"✅ Jefe de zona encontrado para '{zona_key}': {email}")
    
    return email

def get_colombia_datetime() -> datetime:
    """
    Obtiene la fecha y hora actual en la zona horaria de Colombia (UTC-5)
    
    Returns:
        datetime: Fecha y hora actual en Colombia
    """
    return datetime.now(COLOMBIA_TZ)

def format_colombia_datetime(dt: Optional[datetime] = None, format_str: str = "%d/%m/%Y a las %H:%M") -> str:
    """
    Formatea una fecha en la zona horaria de Colombia
    
    Args:
        dt: datetime a formatear (si es None, usa la fecha actual)
        format_str: formato de salida (por defecto: "dd/mm/yyyy a las HH:MM")
    
    Returns:
        str: Fecha formateada
    """
    if dt is None:
        dt = get_colombia_datetime()
    elif dt.tzinfo is None:
        # Si no tiene zona horaria, asume UTC y convierte a Colombia
        dt = pytz.UTC.localize(dt).astimezone(COLOMBIA_TZ)
    elif dt.tzinfo != COLOMBIA_TZ:
        # Si tiene otra zona horaria, convertir a Colombia
        dt = dt.astimezone(COLOMBIA_TZ)
    
    return dt.strftime(format_str)

class MicrosoftGraphEmailService:
    """Servicio para enviar correos electrónicos usando Microsoft Graph API"""
    
    def __init__(self):
        self.tenant_id = os.getenv('TENANT_ID')
        self.client_id = os.getenv('CLIENT_ID')
        self.client_secret = os.getenv('CLIENT_SECRET')
        self.from_email = os.getenv('FROM_EMAIL')
        
        # Verificar si las variables están configuradas
        self.is_configured = all([self.tenant_id, self.client_id, self.client_secret, self.from_email])
        
        if not self.is_configured:
            logger.warning("Variables de entorno de Microsoft Graph no configuradas. El servicio de correo estará deshabilitado.")
            logger.warning("Variables faltantes:")
            if not self.tenant_id:
                logger.warning("  - TENANT_ID")
            if not self.client_id:
                logger.warning("  - CLIENT_ID") 
            if not self.client_secret:
                logger.warning("  - CLIENT_SECRET")
            if not self.from_email:
                logger.warning("  - FROM_EMAIL")
    
    def _get_access_token(self) -> Optional[str]:
        """
        Obtiene un access token de Microsoft Graph
        
        Returns:
            str: Access token o None si hay error
        """
        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'scope': 'https://graph.microsoft.com/.default',
            'grant_type': 'client_credentials'
        }
        
        try:
            response = requests.post(token_url, headers=headers, data=data, timeout=30)
            response.raise_for_status()
            
            token_data = response.json()
            return token_data.get('access_token')
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error obteniendo access token: {e}")
            return None
        except Exception as e:
            logger.error(f"Error inesperado obteniendo token: {e}")
            return None
    
    def send_email(self, 
                   to_email: str, 
                   subject: str, 
                   html_content: str, 
                   plain_content: Optional[str] = None,
                   cc_emails: Optional[list] = None) -> Dict[str, Any]:
        """
        Envía un correo electrónico usando Microsoft Graph API
        
        Args:
            to_email (str): Dirección de correo del destinatario
            subject (str): Asunto del correo
            html_content (str): Contenido HTML del correo
            plain_content (str, optional): Contenido en texto plano
            cc_emails (list, optional): Lista de correos para enviar en CC
            
        Returns:
            dict: Resultado de la operación con 'success' y 'message'
        """
        # Verificar si el servicio está configurado
        if not self.is_configured:
            return {
                'success': False,
                'message': 'Servicio de correo no configurado. Variables de entorno de Microsoft Graph faltantes.'
            }
        
        try:
            # Obtener access token
            access_token = self._get_access_token()
            if not access_token:
                return {
                    'success': False,
                    'message': 'No se pudo obtener el access token de Microsoft'
                }
            
            # Configurar headers para la petición de envío
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Preparar el payload del correo
            email_payload = {
                "message": {
                    "subject": subject,
                    "body": {
                        "contentType": "HTML",
                        "content": html_content
                    },
                    "toRecipients": [
                        {
                            "emailAddress": {
                                "address": to_email
                            }
                        }
                    ]
                }
            }
            
            # Si se proporciona contenido en texto plano, agregarlo
            if plain_content:
                email_payload["message"]["body"]["contentType"] = "Text"
                email_payload["message"]["body"]["content"] = plain_content
            
            # Agregar CC (Con Copia) si se proporcionan correos
            if cc_emails and isinstance(cc_emails, list) and len(cc_emails) > 0:
                email_payload["message"]["ccRecipients"] = [
                    {
                        "emailAddress": {
                            "address": cc_email
                        }
                    }
                    for cc_email in cc_emails if cc_email  # Filtrar emails vacíos o None
                ]
                logger.info(f"CC agregados: {', '.join(cc_emails)}")
            
            # URL para enviar el correo
            send_mail_url = f"https://graph.microsoft.com/v1.0/users/{self.from_email}/sendMail"
            
            # Enviar el correo
            response = requests.post(send_mail_url, headers=headers, json=email_payload, timeout=30)
            response.raise_for_status()
            
            logger.info(f"Correo enviado exitosamente a {to_email}")
            return {
                'success': True,
                'message': f'Correo enviado exitosamente a {to_email}'
            }
            
        except requests.exceptions.HTTPError as e:
            error_msg = f"Error HTTP al enviar correo: {e.response.status_code} - {e.response.text}"
            logger.error(error_msg)
            return {
                'success': False,
                'message': error_msg
            }
        except requests.exceptions.RequestException as e:
            error_msg = f"Error de conexión al enviar correo: {e}"
            logger.error(error_msg)
            return {
                'success': False,
                'message': error_msg
            }
        except Exception as e:
            error_msg = f"Error inesperado al enviar correo: {e}"
            logger.error(error_msg)
            return {
                'success': False,
                'message': error_msg
            }
    
    def send_b2c_confirmation(self, to_email: str, user_name: str, asunto: str, folio: Optional[str] = None) -> Dict[str, Any]:
        """
        Envía un correo de confirmación específico para formularios B2C
        
        Args:
            to_email (str): Correo del usuario
            user_name (str): Nombre del usuario
            asunto (str): Asunto de la solicitud B2C
            folio (str, optional): Folio de la solicitud
            
        Returns:
            dict: Resultado de la operación
        """
        # Extraer solo el número del folio (parte final después del último guión)
        numero_solicitud = ""
        if folio:
            # Dividir por guiones y tomar la última parte (el número)
            partes = folio.split('-')
            if len(partes) >= 3:
                numero_solicitud = f" #{partes[-1]}"
        
        subject = f"Confirmación de Solicitud{numero_solicitud} - Café Quindío"
        
        # Contenido HTML personalizado para B2C
        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirmación de Solicitud</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }}
                .email-container {{
                    background-color: white;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }}
                .header {{
                    background: linear-gradient(135deg, #00B0B2, #0C6659);
                    color: white;
                    padding: 20px;
                    text-align: center;
                }}
                .content {{
                    background: #ffffff;
                    padding: 0;
                }}
                .greeting-section {{
                    background: transparent;
                    padding: 15px 25px 10px 25px;
                    margin: 0;
                }}
                .details-section {{
                    padding: 0 25px 25px 25px;
                }}
                .highlight-box {{
                    background: #e8f4f8;
                    border-left: 4px solid #00B0B2;
                    padding: 12px;
                    margin: 12px 0;
                }}
                .status-badge {{
                    background: #00B0B2;
                    color: white;
                    padding: 6px 12px;
                    border-radius: 15px;
                    font-size: 13px;
                    font-weight: bold;
                    display: inline-block;
                    margin: 5px 0;
                }}
                .footer {{
                    text-align: center;
                    color: #666;
                    font-size: 13px;
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #e0e0e0;
                }}
                .contact-info {{
                    background: #fff;
                    padding: 12px;
                    border-radius: 5px;
                    margin: 10px 0;
                    border: 1px solid #e0e0e0;
                }}
            </style>
        </head>
        <body>
                <div class="content">
                    <div class="greeting-section">
                        <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #333;">Hola {user_name},</h2>
                        <p style="margin: 0 0 5px 0;">Tu solicitud ha sido recibida correctamente y nuestro equipo ya está trabajando en ella.</p>
                    </div>
                    
                    <div class="details-section">
                
                <div class="highlight-box">
                    <h3 style="margin-top: 0; color: #00B0B2;">Detalles de tu solicitud:</h3>
                    <p><strong>Asunto:</strong> {asunto}</p>
                    {f'<p><strong>Folio:</strong> {folio}</p>' if folio else ''}
                    <p><strong>Fecha:</strong> {format_colombia_datetime()}</p>
                    <span class="status-badge">En proceso</span>
                </div>
                
                <h3>¿Qué sigue ahora?</h3>
                <ul style="line-height: 1.8;">
                    <li><strong>Revisión:</strong> Nuestro equipo revisará tu solicitud</li>
                    <li><strong>Contacto:</strong> Te contactaremos en las próximas 24-48 horas</li>
                    <li><strong>Resolución:</strong> Trabajaremos para resolver tu solicitud rápidamente</li>
                    <li><strong>Seguimiento:</strong> Recibirás actualizaciones por correo</li>
                </ul>
                
                <div class="contact-info">
                    <h4 style="margin-top: 0; color: #00B0B2;">¿Necesitas ayuda inmediata?</h4>
                    <p style="margin-bottom: 0;">Si tu solicitud es urgente, puedes contactarnos:</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> plannermantenimiento@cafequindio.com.co</p>
                    <p style="margin: 5px 0;"><strong>Teléfono:</strong> 310 2072 260</p>
                </div>
                
                <p>Gracias por confiar en nuestro equipo. Estamos aquí para ayudarte.</p>
                    </div>
                
                <div class="footer">
                    <p>Este correo fue enviado automáticamente - No responder</p>
                    <p style="font-size: 12px; color: #999;">
                        © 2025 Café Quindío. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)

    def send_completion_notification(self, to_email: str, user_name: str, asunto: str, folio: str, fecha_completado: Optional[str] = None) -> Dict[str, Any]:
        """
        Envía un correo de notificación cuando se completa una solicitud
        
        Args:
            to_email (str): Correo del usuario
            user_name (str): Nombre del usuario
            asunto (str): Asunto de la solicitud completada
            folio (str): Folio de la solicitud
            fecha_completado (str, optional): Fecha de completado, si no se proporciona usa la actual
            
        Returns:
            dict: Resultado de la operación
        """
        # Incluir el folio directamente en el asunto
        if folio:
            subject = f"Solicitud #{folio} Completada - Café Quindío"
        else:
            subject = "Solicitud Completada - Café Quindío"
        
        # Usar fecha proporcionada o fecha actual
        if not fecha_completado:
            fecha_completado = format_colombia_datetime()
        
        # Contenido HTML personalizado para notificación de completado
        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Solicitud Completada</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }}
                .email-container {{
                    background-color: white;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }}
                .header {{
                    background: linear-gradient(135deg, #28a745, #20c997);
                    color: white;
                    padding: 20px;
                    text-align: center;
                }}
                .content {{
                    background: #ffffff;
                    padding: 0;
                }}
                .greeting-section {{
                    background: transparent;
                    padding: 15px 25px 10px 25px;
                    margin: 0;
                }}
                .details-section {{
                    padding: 0 25px 25px 25px;
                }}
                .highlight-box {{
                    background: #d4edda;
                    border-left: 4px solid #28a745;
                    padding: 12px;
                    margin: 12px 0;
                }}
                .status-badge {{
                    background: #28a745;
                    color: white;
                    padding: 6px 12px;
                    border-radius: 15px;
                    font-size: 13px;
                    font-weight: bold;
                    display: inline-block;
                    margin: 5px 0;
                }}
                .footer {{
                    text-align: center;
                    color: #666;
                    font-size: 13px;
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #e0e0e0;
                }}
                .success-icon {{
                    font-size: 48px;
                    margin-bottom: 10px;
                }}
                .contact-info {{
                    background: #f8f9fa;
                    padding: 12px;
                    border-radius: 5px;
                    margin: 10px 0;
                    border: 1px solid #e9ecef;
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <div class="success-icon">✅</div>
                    <h1 style="margin: 5px 0; font-size: 24px; font-weight: bold;">¡Solicitud Completada!</h1>
                    <p style="margin: 0; font-size: 16px; opacity: 0.9;">Café Quindío</p>
                </div>
                <div class="content">
                    <div class="greeting-section">
                        <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #333;">Hola {user_name},</h2>
                        <p style="margin: 0 0 5px 0;">¡Excelentes noticias! Tu solicitud ha sido completada exitosamente por nuestro equipo.</p>
                    </div>
                    
                    <div class="details-section">
                        <div class="highlight-box">
                            <h3 style="margin-top: 0; color: #28a745;">Resumen de la solicitud:</h3>
                            <p><strong>Asunto:</strong> {asunto}</p>
                            <p><strong>Folio:</strong> {folio}</p>
                            <p><strong>Fecha de finalización:</strong> {fecha_completado}</p>
                            <span class="status-badge">Completada</span>
                        </div>
                        
                        <h3>¿Qué significa esto?</h3>
                        <ul style="line-height: 1.8;">
                            <li><strong>✅ Resuelto:</strong> Tu solicitud ha sido procesada y resuelta</li>
                            <li><strong>📋 Caso cerrado:</strong> No se requieren acciones adicionales</li>
                            <li><strong>📧 Confirmación:</strong> Este correo sirve como comprobante de finalización</li>
                            <li><strong>🔄 Disponibilidad:</strong> Estamos listos para ayudarte con nuevas solicitudes</li>
                        </ul>
                        
                        <div class="contact-info">
                            <h4 style="margin-top: 0; color: #28a745;">¿Tienes otra consulta?</h4>
                            <p style="margin-bottom: 0;">Si necesitas realizar una nueva solicitud o tienes preguntas:</p>
                            <p style="margin: 5px 0;"><strong>Email:</strong> plannermantenimiento@cafequindio.com.co</p>
                            <p style="margin: 5px 0;"><strong>Teléfono:</strong> 310 2072 260</p>
                        </div>
                        
                        <p>Gracias por confiar en <strong>Café Quindío</strong>. Fue un placer ayudarte y esperamos poder servirte nuevamente en el futuro.</p>
                    </div>
                    
                    <div class="footer">
                        <p><strong>Café Quindío</strong> - Calidad y Servicio de Excelencia</p>
                        <p>Este correo fue enviado automáticamente - No responder</p>
                        <p style="font-size: 12px; color: #999;">
                            © 2025 Café Quindío. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)

    def send_registration_confirmation(self, to_email: str, user_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Envía un correo de confirmación de registro
        
        Args:
            to_email (str): Correo del usuario registrado
            user_name (str, optional): Nombre del usuario
            
        Returns:
            dict: Resultado de la operación
        """
        subject = "Confirmación de registro - Café Quindío"
        
        # Contenido HTML personalizado
        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirmación de Registro</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #00B0B2, #0C6659);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                }}
                .coffee-icon {{
                    font-size: 48px;
                    margin-bottom: 10px;
                }}
                .btn {{
                    display: inline-block;
                    background: #00B0B2;
                    color: white;
                    padding: 12px 25px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                    margin-top: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="coffee-icon">☕</div>
                <h1>¡Bienvenido a Café Quindío!</h1>
            </div>
            <div class="content">
                <h2>Gracias por tu registro{f", {user_name}" if user_name else ""}</h2>
                <p>Tu solicitud ha sido recibida correctamente y está siendo procesada por nuestro equipo.</p>
                
                <p><strong>¿Qué sigue?</strong></p>
                <ul>
                    <li>✅ Tu solicitud está en cola de procesamiento</li>
                    <li>📧 Recibirás actualizaciones por correo electrónico</li>
                    <li>⏰ Nuestro equipo se pondrá en contacto contigo pronto</li>
                </ul>
                
                <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                
                <div class="footer">
                    <p>Este correo fue enviado automáticamente desde el sistema de Café Quindío</p>
                    <p>Fecha: {format_colombia_datetime(format_str="%d/%m/%Y %H:%M")}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)

    def send_technician_assignment_notification(self, to_email: str, technician_name: str, folio: str, 
                                               client_name: str, description: str, priority: str = "Normal", 
                                               location: str = None) -> Dict[str, Any]:
        """
        Envía un correo de notificación de asignación de OT a técnico
        
        Args:
            to_email (str): Correo del técnico asignado
            technician_name (str): Nombre del técnico
            folio (str): Folio de la OT
            client_name (str): Nombre del cliente
            description (str): Descripción de la OT
            priority (str): Prioridad de la OT
            location (str): Ubicación/área de la OT
            
        Returns:
            dict: Resultado de la operación
        """
        subject = f"Nueva OT Asignada - Folio: {folio}"
        
        # Determinar color de prioridad
        priority_color = {
            'Alta': '#dc3545',
            'Media': '#fd7e14', 
            'Normal': '#28a745',
            'Baja': '#6c757d'
        }.get(priority, '#28a745')
        
        # Contenido HTML personalizado
        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nueva OT Asignada</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }}
                .container {{
                    background-color: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }}
                .header {{
                    background: linear-gradient(135deg, #007bff, #0056b3);
                    color: white;
                    padding: 20px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                }}
                .content {{
                    padding: 30px;
                }}
                .ot-details {{
                    background-color: #f8f9fa;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    border-left: 4px solid #007bff;
                }}
                .detail-row {{
                    display: flex;
                    justify-content: space-between;
                    margin: 10px 0;
                    padding: 8px 0;
                    border-bottom: 1px solid #e9ecef;
                }}
                .detail-label {{
                    font-weight: bold;
                    color: #495057;
                }}
                .detail-value {{
                    color: #212529;
                }}
                .priority-badge {{
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    color: white;
                    font-weight: bold;
                    background-color: {priority_color};
                }}
                .action-section {{
                    background-color: #e3f2fd;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                }}
                .btn {{
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #007bff;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    margin: 10px;
                }}
                .footer {{
                    background-color: #f8f9fa;
                    padding: 15px;
                    text-align: center;
                    font-size: 12px;
                    color: #6c757d;
                    border-top: 1px solid #dee2e6;
                }}
                .alert {{
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 15px 0;
                }}
            </style>
        </head>
        <body>
                <div class="content">
                    <h2>Hola {technician_name},</h2>
                    <p>Se te ha asignado una nueva Orden de Trabajo para su atención.</p>
                    
                    <div class="ot-details">
                        <h3>Detalles de la OT</h3>
                        <div class="detail-row">
                            <span class="detail-label">Folio:</span>
                            <span class="detail-value"><strong>{folio}</strong></span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Cliente:</span>
                            <span class="detail-value">{client_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Prioridad:</span>
                            <span class="detail-value"><span class="priority-badge">{priority}</span></span>
                        </div>
                        {f'<div class="detail-row"><span class="detail-label">Ubicación:</span><span class="detail-value">{location}</span></div>' if location else ''}
                        <div class="detail-row">
                            <span class="detail-label">Descripción:</span>
                            <span class="detail-value">{description}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Fecha de Asignación:</span>
                            <span class="detail-value">{format_colombia_datetime(format_str="%d/%m/%Y %H:%M")}</span>
                        </div>
                    </div>
                    
                    <div class="alert">
                        <strong>Importante:</strong> Revisa los detalles de la OT y contacta al cliente para coordinar el servicio.
                    </div>
                    
                    <div class="action-section">
                        <h3>Próximos Pasos</h3>
                        <p>Accede al sistema para ver todos los detalles de la OT y gestionar tu trabajo:</p>
                        <ul style="text-align: left; display: inline-block;">
                            <li>Revisar información completa de la OT</li>
                            <li>Contactar al cliente para coordinar</li>
                            <li>Actualizar estado de progreso</li>
                            <li>Completar la OT cuando termine</li>
                        </ul>
                    </div>
                    
                    <p><strong>Recuerda:</strong> Es importante mantener una comunicación fluida con el cliente y actualizar el estado de la OT regularmente.</p>
                </div>
                <div class="footer">
                    <p>Este correo fue enviado automáticamente desde el sistema de Café Quindío</p>
                    <p>Fecha: {format_colombia_datetime(format_str="%d/%m/%Y %H:%M")}</p>
                    <p>OT: {folio} | Técnico: {technician_name}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)

    def send_technician_alert(self, to_email: str, technician_name: str, folio: str, 
                             mensaje_personalizado: str, enviado_por: str,
                             client_name: str = None, location: str = None,
                             area_responsable: str = None, zona: str = None) -> Dict[str, Any]:
        """
        Envía una alerta urgente personalizada a un técnico
        
        Args:
            to_email (str): Correo del técnico
            technician_name (str): Nombre del técnico
            folio (str): Folio de la OT
            mensaje_personalizado (str): Mensaje personalizado de alerta
            enviado_por (str): Nombre de quien envía la alerta
            client_name (str, optional): Nombre del cliente
            location (str, optional): Ubicación de la OT
            area_responsable (str, optional): Área responsable (TIC o Mantenimiento) para determinar CC
            zona (str, optional): Zona para agregar jefe de zona en CC
            
        Returns:
            dict: Resultado de la operación
        """
        subject = f"⚠️ ALERTA URGENTE - OT {folio}"
        
        # Determinar CC según el área responsable
        cc_emails = []
        if area_responsable:
            area_lower = area_responsable.lower()
            if 'mantenimiento' in area_lower:
                cc_emails.append('coordinadormantenimiento@cafequindio.com.co')
                logger.info(f"CC agregado para área Mantenimiento: coordinadormantenimiento@cafequindio.com.co")
            elif 'tic' in area_lower:
                cc_emails.append('direcciontic@cafequindio.com.co')
                logger.info(f"CC agregado para área TIC: direcciontic@cafequindio.com.co")
        
        # Agregar CC del jefe de zona (si existe)
        if zona and zona != "Planta San Pedro":
            logger.info(f"🔍 Buscando jefe de zona para alerta: '{zona}'")
            jefe_zona_email = get_jefe_zona_email(zona)
            if jefe_zona_email and jefe_zona_email not in cc_emails:
                cc_emails.append(jefe_zona_email)
                logger.info(f"📧 Agregando jefe de zona '{zona}' en CC de alerta: {jefe_zona_email}")
            else:
                logger.warning(f"⚠️ No se encontró jefe de zona para '{zona}' en alerta")
        
        logger.info(f"📋 CC Emails en alerta: {cc_emails if cc_emails else 'NINGUNO'}")
        
        # Fecha y hora actual en Colombia
        fecha_alerta = format_colombia_datetime(format_str='%d de %B de %Y a las %H:%M')
        
        # Contenido HTML personalizado con énfasis en urgencia
        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Alerta Urgente - OT {folio}</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }}
                .container {{
                    background-color: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                    overflow: hidden;
                    border: 3px solid #dc3545;
                }}
                .header {{
                    background: linear-gradient(135deg, #dc3545, #c82333);
                    color: white;
                    padding: 25px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }}
                .alert-icon {{
                    font-size: 32px;
                    animation: pulse 1.5s infinite;
                }}
                @keyframes pulse {{
                    0%, 100% {{ transform: scale(1); }}
                    50% {{ transform: scale(1.1); }}
                }}
                .content {{
                    padding: 30px;
                }}
                .greeting {{
                    font-size: 18px;
                    color: #212529;
                    margin-bottom: 20px;
                }}
                .alert-box {{
                    background: linear-gradient(135deg, #fff3cd, #ffe69c);
                    border-left: 5px solid #ffc107;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }}
                .mensaje-personalizado {{
                    background-color: white;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    border-left: 4px solid #dc3545;
                    font-size: 16px;
                    line-height: 1.8;
                    color: #212529;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }}
                .ot-details {{
                    background-color: #f8f9fa;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }}
                .detail-row {{
                    display: flex;
                    justify-content: space-between;
                    margin: 10px 0;
                    padding: 8px 0;
                    border-bottom: 1px solid #e9ecef;
                }}
                .detail-label {{
                    font-weight: bold;
                    color: #495057;
                }}
                .detail-value {{
                    color: #212529;
                    font-weight: 600;
                }}
                .urgente-badge {{
                    display: inline-block;
                    padding: 6px 12px;
                    border-radius: 4px;
                    color: white;
                    font-weight: bold;
                    background-color: #dc3545;
                    animation: pulse 1.5s infinite;
                }}
                .action-section {{
                    background: linear-gradient(135deg, #fff3cd, #ffe69c);
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                    border: 2px solid #ffc107;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    color: #6c757d;
                    font-size: 14px;
                    background-color: #f8f9fa;
                }}
                .signature {{
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 2px solid #dee2e6;
                    font-style: italic;
                    color: #6c757d;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <!-- Header con alerta -->
                <div class="header">
                    <h1>
                        <span class="alert-icon">⚠️</span>
                        ALERTA URGENTE
                    </h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px;">Orden de Trabajo: {folio}</p>
                </div>
                
                <!-- Contenido -->
                <div class="content">
                    <div class="greeting">
                        Hola <strong>{technician_name}</strong>,
                    </div>
                    
                    <!-- Box de alerta -->
                    <div class="alert-box">
                        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #856404;">
                            🔔 Se ha generado una alerta urgente para la OT <strong>{folio}</strong>
                        </p>
                        <p style="margin: 10px 0 0 0; color: #856404;">
                            <strong>Fecha de alerta:</strong> {fecha_alerta}
                        </p>
                    </div>
                    
                    <!-- Mensaje personalizado -->
                    <div class="mensaje-personalizado">
                        <h3 style="margin-top: 0; color: #dc3545;">Mensaje del supervisor:</h3>
                        <p style="margin: 10px 0; white-space: pre-wrap;">{mensaje_personalizado}</p>
                        <div class="signature">
                            — {enviado_por}
                        </div>
                    </div>
                    
                    <!-- Detalles de la OT -->
                    <div class="ot-details">
                        <h3 style="margin-top: 0; color: #495057;">Detalles de la Orden de Trabajo</h3>
                        <div class="detail-row">
                            <span class="detail-label"> Folio:</span>
                            <span class="detail-value">{folio}</span>
                        </div>
                        {"<div class='detail-row'><span class='detail-label'> Cliente:</span><span class='detail-value'>" + client_name + "</span></div>" if client_name else ""}
                        {"<div class='detail-row'><span class='detail-label'> Ubicación:</span><span class='detail-value'>" + location + "</span></div>" if location else ""}
                        <div class="detail-row">
                            <span class="detail-label"> Estado:</span>
                            <span class="urgente-badge">REQUIERE ATENCIÓN URGENTE</span>
                        </div>
                    </div>
                    
                    <!-- Acción requerida -->
                    <div class="action-section">
                        <h3 style="margin-top: 0; color: #856404;"> Acción Requerida</h3>
                        <p style="margin: 10px 0; font-size: 16px; color: #856404;">
                            Por favor, atiende esta solicitud con <strong>máxima prioridad</strong> y 
                            actualiza el estado de la orden de trabajo lo antes posible.
                        </p>
                        <p style="margin: 15px 0 0 0; font-size: 14px; color: #856404;">
                            Si necesitas asistencia o tienes preguntas, contacta inmediatamente con tu supervisor.
                        </p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="footer">
                    <p style="margin: 5px 0;">
                        <strong>Café Quindío - Sistema de Gestión de Órdenes de Trabajo</strong>
                    </p>
                    <p style="margin: 5px 0; font-size: 12px;">
                        Este es un correo automático de alerta. Por favor no respondas a este mensaje.
                    </p>
                    <p style="margin: 5px 0; font-size: 12px;">
                        Para cualquier consulta, contacta con tu supervisor directo.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content, cc_emails=cc_emails)


# Instancia global del servicio de correo
email_service = MicrosoftGraphEmailService()


def send_mail(to_email: str, subject: str, html_content: str, plain_content: Optional[str] = None) -> Dict[str, Any]:
    """
    Función global para enviar correos - Interfaz simplificada
    
    Args:
        to_email (str): Dirección de correo del destinatario
        subject (str): Asunto del correo
        html_content (str): Contenido HTML del correo
        plain_content (str, optional): Contenido en texto plano
        
    Returns:
        dict: Resultado de la operación
    """
    return email_service.send_email(to_email, subject, html_content, plain_content)


def send_b2c_email(to_email: str, user_name: str, asunto: str, folio: Optional[str] = None) -> Dict[str, Any]:
    """
    Función global para enviar correo de confirmación B2C
    
    Args:
        to_email (str): Correo del usuario
        user_name (str): Nombre del usuario  
        asunto (str): Asunto de la solicitud B2C
        folio (str, optional): Folio de la solicitud
        
    Returns:
        dict: Resultado de la operación
    """
    return email_service.send_b2c_confirmation(to_email, user_name, asunto, folio)


def send_registration_email(to_email: str, user_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Función global para enviar correo de confirmación de registro
    
    Args:
        to_email (str): Correo del usuario registrado
        user_name (str, optional): Nombre del usuario
        
    Returns:
        dict: Resultado de la operación
    """
    return email_service.send_registration_confirmation(to_email, user_name)


def send_completion_email(to_email: str, user_name: str, asunto: str, folio: str, fecha_completado: Optional[str] = None) -> Dict[str, Any]:
    """
    Función global para enviar correo de solicitud completada
    
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


def send_technician_assignment_email(to_email: str, technician_name: str, folio: str, 
                                    client_name: str, description: str, priority: str = "Normal", 
                                    location: str = None) -> Dict[str, Any]:
    """
    Función global para enviar correo de asignación de OT a técnico
    
    Args:
        to_email (str): Correo del técnico asignado
        technician_name (str): Nombre del técnico
        folio (str): Folio de la OT
        client_name (str): Nombre del cliente
        description (str): Descripción de la OT
        priority (str): Prioridad de la OT
        location (str): Ubicación/área de la OT
        
    Returns:
        dict: Resultado de la operación
    """
    return email_service.send_technician_assignment_notification(
        to_email, technician_name, folio, client_name, description, priority, location
    )


def send_technician_alert_email(to_email: str, technician_name: str, folio: str, 
                               mensaje_personalizado: str, enviado_por: str,
                               client_name: str = None, location: str = None,
                               area_responsable: str = None, zona: str = None) -> Dict[str, Any]:
    """
    Función global para enviar alerta urgente personalizada a técnico
    
    Args:
        to_email (str): Correo del técnico
        technician_name (str): Nombre del técnico
        folio (str): Folio de la OT
        mensaje_personalizado (str): Mensaje personalizado de alerta
        enviado_por (str): Nombre de quien envía la alerta
        client_name (str, optional): Nombre del cliente
        location (str, optional): Ubicación de la OT
        area_responsable (str, optional): Área responsable (TIC o Mantenimiento) para determinar CC
        zona (str, optional): Zona para agregar jefe de zona en CC
        
    Returns:
        dict: Resultado de la operación
    """
    return email_service.send_technician_alert(
        to_email, technician_name, folio, mensaje_personalizado, enviado_por, 
        client_name, location, area_responsable, zona
    )

