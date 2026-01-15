"""
Servicio para asignación automática de solicitudes por área y zona
"""
from sqlalchemy.orm import Session
from app.models import User, Categoria, PlantaCategoria
from app.database import get_db
import logging

logger = logging.getLogger(__name__)

def normalizar_nombre_tienda(tienda: str) -> str:
    """
    Normaliza el nombre de una tienda para búsqueda consistente
    - Convierte a mayúsculas
    - Elimina espacios extras
    - Elimina caracteres especiales comunes
    """
    if not tienda:
        return ""
    
    # Convertir a mayúsculas y eliminar espacios al inicio/final
    normalizado = tienda.strip().upper()
    
    # Eliminar múltiples espacios consecutivos
    import re
    normalizado = re.sub(r'\s+', ' ', normalizado)
    
    return normalizado

# 🌎 MAPEO DE ZONAS A USUARIOS ESPECÍFICOS
# Prioridad 1: Asignación por zona geográfica (solo para MANTENIMIENTO)
ASIGNACION_POR_ZONA = {
    "COSTA": "tecnicotiendascosta@cafequindio.com.co",  # Lyvan Taborda (ID 7)
    "CENTRO": "tecnicotiendascentro@cafequindio.com.co",  # Jeisson Cruz (ID 4)
    "MEDELLIN": "galvandiego66@gmail.com",  # Diego Andres Restrepo (ID 38)
    "EJE CAFETERO": "tecnicotiendasejecafetero2@cafequindio.com.co",  # Luis Sabogal (ID 6)
    "CALI": "tecnicotiendasejecafetero@cafequindio.com.co",  # Juan Falla (ID 2)
}

# 🏪 MAPEO DE TIENDAS ESPECÍFICAS PARA ZONA QUINDÍO
# La zona QUINDÍO requiere enrutamiento a nivel de tienda
ASIGNACION_QUINDIO_POR_TIENDA = {
    # Tiendas asignadas a Juan Falla (ID 2)
    "AEROPUERTO EDEN": "tecnicotiendasejecafetero@cafequindio.com.co",
    "MALL PARAISO": "tecnicotiendasejecafetero@cafequindio.com.co",
    "TAMBO EL EDEN": "tecnicotiendasejecafetero@cafequindio.com.co",
    "FABRICA SAN PEDRO": "tecnicotiendasejecafetero@cafequindio.com.co",
    
    # Tienda por defecto: Kevin Trejos (ID 5) para todas las demás tiendas del Quindío
    "__default__": "tecnicotiendasquindio@cafequindio.com.co"
}

# 🏢 MAPEO DE TIENDAS ESPECÍFICAS PARA ZONA CENTRO (BOGOTÁ)
# La zona CENTRO requiere enrutamiento a nivel de tienda
# ⚠️ IMPORTANTE: Nombres según base de datos (después de normalización)
ASIGNACION_BOGOTA_POR_TIENDA = {
    # Tiendas asignadas a Jeison Cruz (ID 4)
    "PLAZA BOLIVAR BOGOTA": "tecnicotiendascentro@cafequindio.com.co",  # ID: 50
    "BACATA": "tecnicotiendascentro@cafequindio.com.co",  # ID: 45
    "I LATINA": "tecnicotiendascentro@cafequindio.com.co",  # ID: 56
    "NOGALES": "tecnicotiendascentro@cafequindio.com.co",  # ID: 46
    "TORRE 90": "tecnicotiendascentro@cafequindio.com.co",  # ID: 66
    "PLAZA CENTRAL": "tecnicotiendascentro@cafequindio.com.co",  # ID: 48, 49 (duplicado)
    "TUNJA VIVA": "tecnicotiendascentro@cafequindio.com.co",  # Tunja (no aparece en JSON)
    "TUNJA UNICENTRO": "tecnicotiendascentro@cafequindio.com.co",  # Tunja (no aparece en JSON)
    "PLAZA SOL": "tecnicotiendascentro@cafequindio.com.co",  # ID: 73
    "PLAZA ESTRELLA": "tecnicotiendascentro@cafequindio.com.co",  # ID: 78
    
    # Tiendas asignadas a José Luis (ID 43)
    "PLAZA IMPERIAL": "josealan0808@gmail.com",  # ID: 55
    "TITAN PLAZA": "josealan0808@gmail.com",  # ID: 54
    "USAQUEN": "josealan0808@gmail.com",  # ID: 47
    "AEROPUERTO EL DORADO": "josealan0808@gmail.com",  # ID: 44 (nombre exacto de BD)
    "UNICENTRO BOGOTÁ": "josealan0808@gmail.com",  # ID: 57 (con acento)
    "UNICENTRO BOGOTA": "josealan0808@gmail.com",  # ID: 57 (sin acento, por compatibilidad)
    "PLAZA CLARO BOGOTA": "josealan0808@gmail.com",  # ID: 51 (nombre exacto de BD)
    "OFIC BAVARIA": "josealan0808@gmail.com",  # ID: 52 (nombre exacto de BD)
    "EL EDEN BOGOTÁ": "josealan0808@gmail.com",  # ID: 74 (con acento)
    "EL EDEN BOGOTA": "josealan0808@gmail.com",  # ID: 74 (sin acento, por compatibilidad)
    "NUESTRO BOGOTA": "josealan0808@gmail.com",  # ID: 77
    "SANTAFE": "josealan0808@gmail.com",  # ID: 53 (nombre exacto de BD, sin espacio)
    "SANTA FE": "josealan0808@gmail.com",  # ID: 53 (variante con espacio)
    
    # Tienda por defecto: Jeison Cruz para otras tiendas de Bogotá
    "__default__": "tecnicotiendascentro@cafequindio.com.co"
}

def asignar_por_zona(zona: str, db: Session, tienda: str = None) -> User:
    """
    Asigna solicitud a un usuario específico basado en la zona geográfica
    
    Para la zona QUINDÍO, utiliza enrutamiento a nivel de tienda:
    - Tiendas específicas (Aeropuerto Eden, Mall Paraiso, etc.) → Juan Falla
    - Otras tiendas → Kevin Trejos (default)
    
    Para la zona CENTRO (Bogotá), utiliza enrutamiento a nivel de tienda:
    - Tiendas de Jeison Cruz (Plaza Bolívar, Bacatá, etc.) → Jeison Cruz
    - Tiendas de José Luis (Plaza Imperial, Titán Plaza, etc.) → José Luis
    - Otras tiendas → Jeison Cruz (default)
    
    Para otras zonas, usa asignación directa por zona
    
    Args:
        zona: Nombre de la zona (ej: "COSTA", "CALI", "QUINDÍO", "CENTRO", etc.)
        db: Sesión de base de datos
        tienda: Nombre de la tienda (opcional, usado para zona QUINDÍO y CENTRO)
    
    Returns:
        User: Usuario asignado o None si no hay mapeo para esa zona
    """
    if not zona:
        logger.info("⚠️ No se proporcionó zona para asignación")
        return None
    
    # Normalizar zona a mayúsculas para comparación
    zona_upper = zona.upper().strip()
    
    # 🏪 CASO ESPECIAL: ZONA QUINDÍO - Enrutamiento por tienda
    if zona_upper == "QUINDÍO":
        logger.info(f"🏪 Zona QUINDÍO detectada - Enrutamiento por tienda")
        
        if tienda:
            # Normalizar nombre de tienda
            tienda_normalizada = normalizar_nombre_tienda(tienda)
            logger.info(f"   Tienda recibida: '{tienda_normalizada}'")
            
            # Buscar tienda específica en mapeo
            email_usuario = ASIGNACION_QUINDIO_POR_TIENDA.get(tienda_normalizada)
            
            if email_usuario:
                logger.info(f"   ✅ Tienda '{tienda_normalizada}' mapeada a email específico")
            else:
                # Usar técnico por defecto (Kevin Trejos)
                email_usuario = ASIGNACION_QUINDIO_POR_TIENDA.get("__default__")
                logger.info(f"   ℹ️ Tienda '{tienda_normalizada}' no está en lista específica, usando técnico por defecto")
        else:
            # Sin tienda especificada, usar técnico por defecto
            email_usuario = ASIGNACION_QUINDIO_POR_TIENDA.get("__default__")
            logger.info(f"   ⚠️ No se especificó tienda para zona QUINDÍO, usando técnico por defecto")
        
        # Buscar usuario por email
        try:
            usuario = db.query(User).filter(
                User.email == email_usuario,
                User.activo == True
            ).first()
            
            if usuario:
                logger.info(f"   ✅ Usuario encontrado para QUINDÍO: {usuario.nombre} ({email_usuario})")
                return usuario
            else:
                logger.warning(f"   ⚠️ Email '{email_usuario}' configurado pero usuario no encontrado o inactivo")
                return None
                
        except Exception as e:
            logger.error(f"   ❌ Error buscando usuario para QUINDÍO: {e}")
            return None
    
    # 🏢 CASO ESPECIAL: ZONA CENTRO (BOGOTÁ) - Enrutamiento por tienda
    if zona_upper == "CENTRO":
        logger.info(f"🏢 Zona CENTRO (Bogotá) detectada - Enrutamiento por tienda")
        
        if tienda:
            # Normalizar nombre de tienda
            tienda_normalizada = normalizar_nombre_tienda(tienda)
            logger.info(f"   Tienda original: '{tienda}'")
            logger.info(f"   Tienda normalizada: '{tienda_normalizada}'")
            
            # 🐛 DEBUG: Mostrar todas las claves del diccionario para comparar
            logger.info(f"   🔍 DEBUG - Tiendas disponibles en diccionario: {list(ASIGNACION_BOGOTA_POR_TIENDA.keys())}")
            
            # Buscar tienda específica en mapeo
            email_usuario = ASIGNACION_BOGOTA_POR_TIENDA.get(tienda_normalizada)
            
            if email_usuario:
                logger.info(f"   ✅ Tienda '{tienda_normalizada}' mapeada a email específico: {email_usuario}")
            else:
                # Usar técnico por defecto (Jeison Cruz)
                email_usuario = ASIGNACION_BOGOTA_POR_TIENDA.get("__default__")
                logger.info(f"   ℹ️ Tienda '{tienda_normalizada}' no está en lista específica, usando técnico por defecto: {email_usuario}")
        else:
            # Sin tienda especificada, usar técnico por defecto
            email_usuario = ASIGNACION_BOGOTA_POR_TIENDA.get("__default__")
            logger.info(f"   ⚠️ No se especificó tienda para zona CENTRO, usando técnico por defecto")
        
        # Buscar usuario por email
        try:
            usuario = db.query(User).filter(
                User.email == email_usuario,
                User.activo == True
            ).first()
            
            if usuario:
                logger.info(f"   ✅ Usuario encontrado para CENTRO: {usuario.nombre} ({email_usuario})")
                return usuario
            else:
                logger.warning(f"   ⚠️ Email '{email_usuario}' configurado pero usuario no encontrado o inactivo")
                return None
                
        except Exception as e:
            logger.error(f"   ❌ Error buscando usuario para CENTRO: {e}")
            return None
    
    # 🌎 OTRAS ZONAS: Enrutamiento simple por zona
    email_asignado = ASIGNACION_POR_ZONA.get(zona_upper)
    
    if not email_asignado:
        logger.info(f"ℹ️ Zona '{zona}' no tiene asignación específica configurada")
        return None
    
    # Buscar usuario por email
    try:
        usuario = db.query(User).filter(
            User.email == email_asignado,
            User.activo == True
        ).first()
        
        if usuario:
            logger.info(f"✅ Usuario asignado por zona '{zona}': {usuario.nombre} ({usuario.email})")
            return usuario
        else:
            logger.warning(f"⚠️ Email '{email_asignado}' configurado para zona '{zona}' pero usuario no encontrado o inactivo")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error buscando usuario para zona '{zona}': {e}")
        return None

def obtener_administrador_por_area(area: str, db: Session) -> User:
    """
    Obtiene el primer administrador disponible del área especificada
    Búsqueda exacta del área
    """
    try:
        # Buscar administrador activo del área especificada (búsqueda exacta case-insensitive)
        admin = db.query(User).filter(
            User.rol == 'admin',
            User.area.ilike(area),  # Búsqueda exacta case-insensitive
            User.activo == True
        ).first()
        
        if admin:
            logger.info(f"✅ Administrador encontrado para área '{area}': {admin.nombre} ({admin.email})")
            return admin
        else:
            logger.warning(f"⚠️ No se encontró administrador para área '{area}'")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error buscando administrador para área '{area}': {e}")
        return None

def asignar_solicitud_por_categoria(categoria_nombre: str, db: Session, zona: str = None, tienda: str = None) -> User:
    """
    Asigna una solicitud al usuario correcto según PRIORIDADES:
    
    PRIORIDAD 1: Zona geográfica (solo para categorías de MANTENIMIENTO)
    - Si zona está en ASIGNACION_POR_ZONA Y categoría es MANTENIMIENTO → Asignar a técnico de zona
    - Para zona QUINDÍO: Considera también la tienda para enrutamiento específico
    - Si categoría es TIC → Ignorar zona, asignar a admin TIC
    
    PRIORIDAD 2 (Fallback): Código de categoría
    - Si el código de la categoría es "TIC" → Administrador área TIC
    - Si el código de la categoría es "MANTENIMIENTO" → Administrador área Mantenimiento
    - Todas las demás (sin código específico) → Administrador área Mantenimiento (fallback)
    
    Args:
        categoria_nombre: Nombre de la categoría
        db: Sesión de base de datos
        zona: (Opcional) Zona geográfica para asignación prioritaria
        tienda: (Opcional) Tienda específica (usado para zona QUINDÍO)
    
    Returns:
        User: Usuario asignado
    """
    try:
        # 🔍 PRIMERO: Determinar el código de la categoría para decidir si usar zona
        categoria = None
        codigo_categoria = None
        
        if categoria_nombre:
            # Buscar en categorías normales
            categoria = db.query(Categoria).filter(
                Categoria.nombre == categoria_nombre
            ).first()
            
            # Si no se encuentra, buscar en categorías de Planta San Pedro
            if not categoria:
                categoria = db.query(PlantaCategoria).filter(
                    PlantaCategoria.nombre == categoria_nombre
                ).first()
            
            # Obtener código de la categoría
            if categoria and categoria.codigo:
                codigo_categoria = categoria.codigo.upper()
                logger.info(f"� Categoría '{categoria_nombre}' tiene código: '{codigo_categoria}'")
        
        # 🌎 PRIORIDAD 1: Asignar por zona SOLO si es categoría de MANTENIMIENTO
        if zona and codigo_categoria == "MANTENIMIENTO":
            logger.info(f"📍 Categoría MANTENIMIENTO detectada - Asignando por zona '{zona}'...")
            if tienda:
                logger.info(f"   🏪 Tienda especificada: '{tienda}'")
            usuario_zona = asignar_por_zona(zona, db, tienda)
            if usuario_zona:
                logger.info(f"✅ Usuario asignado por zona: {usuario_zona.nombre} ({usuario_zona.email})")
                return usuario_zona
            else:
                logger.info(f"ℹ️ No hay asignación específica para zona '{zona}', usando asignación por categoría (fallback)")
        elif zona and codigo_categoria == "TIC":
            logger.info(f"🔧 Categoría TIC detectada - Ignorando zona, asignando a área TIC")
            # No usar asignación por zona para TIC, saltar a PRIORIDAD 2
        elif zona and not codigo_categoria:
            logger.info(f"ℹ️ Categoría sin código específico - Usando asignación por zona como fallback")
            usuario_zona = asignar_por_zona(zona, db, tienda)
            if usuario_zona:
                logger.info(f"✅ Usuario asignado por zona (fallback): {usuario_zona.nombre} ({usuario_zona.email})")
                return usuario_zona
        
        # 🏷️ PRIORIDAD 2 (Fallback): Asignar por código de categoría
        
        # Determinar tipo de categoría para logging y área destino
        tipo_categoria = ""
        es_planta = False
        if categoria:
            if hasattr(categoria, '__tablename__'):
                if categoria.__tablename__ == 'planta_categorias':
                    tipo_categoria = " [Planta San Pedro]"
                    es_planta = True
                else:
                    tipo_categoria = " [Normal]"
        
        # Determinar área según el código específico de la categoría
        if categoria and categoria.codigo:
            codigo_upper = categoria.codigo.upper()
            
            if codigo_upper == "TIC":
                # ⚠️ CAMBIO: NO asignar automáticamente categorías TIC
                # Retornar None para que sea asignación MANUAL
                logger.info(f"� Categoría '{categoria_nombre}'{tipo_categoria} (código: TIC) -> ASIGNACIÓN MANUAL (no automática)")
                return None
            elif codigo_upper == "MANTENIMIENTO":
                # TODAS las solicitudes con código MANTENIMIENTO van a área "Mantenimiento"
                # (sin importar si son de Planta San Pedro o tiendas)
                area_objetivo = "Mantenimiento"
                logger.info(f"🔄 Categoría '{categoria_nombre}'{tipo_categoria} (código: '{categoria.codigo}') -> Asignando a área Mantenimiento")
            else:
                # Fallback para códigos no reconocidos: asignar a Mantenimiento
                area_objetivo = "Mantenimiento"
                logger.info(f"🔄 Categoría '{categoria_nombre}'{tipo_categoria} (código: '{categoria.codigo}') -> Código no reconocido, asignando a área Mantenimiento (fallback)")
        else:
            # Fallback para categorías sin código: asignar a Mantenimiento
            area_objetivo = "Mantenimiento"
            codigo_mostrar = categoria.codigo if categoria and categoria.codigo else "N/A"
            logger.info(f"🔄 Categoría '{categoria_nombre}'{tipo_categoria} (código: '{codigo_mostrar}') -> Sin código específico, asignando a área Mantenimiento (fallback)")
        
        # Buscar administrador del área objetivo
        administrador = obtener_administrador_por_area(area_objetivo, db)
        
        if administrador:
            logger.info(f"✅ Solicitud asignada a: {administrador.nombre} (Área: {administrador.area})")
            return administrador
        else:
            # Fallback: buscar cualquier administrador activo
            logger.warning(f"⚠️ Fallback: Buscando cualquier administrador activo")
            fallback_admin = db.query(User).filter(
                User.rol == 'admin',
                User.activo == True
            ).first()
            
            if fallback_admin:
                logger.info(f"✅ Administrador fallback asignado: {fallback_admin.nombre}")
                return fallback_admin
            else:
                logger.error(f"❌ No hay administradores activos disponibles")
                return None
                
    except Exception as e:
        logger.error(f"❌ Error en asignación automática: {e}")
        return None

def listar_administradores_por_area(db: Session) -> dict:
    """
    Lista todos los administradores agrupados por área (para debugging)
    """
    try:
        admins = db.query(User).filter(
            User.rol == 'admin',
            User.activo == True
        ).all()
        
        areas = {}
        for admin in admins:
            area = admin.area or "Sin área"
            if area not in areas:
                areas[area] = []
            areas[area].append({
                'id': admin.id,
                'nombre': admin.nombre,
                'email': admin.email
            })
        
        return areas
        
    except Exception as e:
        logger.error(f"❌ Error listando administradores: {e}")
        return {}