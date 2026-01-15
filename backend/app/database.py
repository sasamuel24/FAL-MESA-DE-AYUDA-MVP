"""
Configuración de base de datos para FastAPI con PostgreSQL
Sistema unificado con SQLAlchemy - Configuración dual local/producción
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
from typing import Generator
import logging
import os
import sys

# Agregar path de config para importar utilidades
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'config'))

try:
    from env_config import get_database_url, is_local_environment
except ImportError:
    # Fallback si no se puede importar
    from dotenv import load_dotenv
    load_dotenv()
    def get_database_url():
        return os.getenv('DATABASE_URL', 'postgresql://postgres:Samuel22.@localhost:5432/BDCQ')
    def is_local_environment():
        return 'localhost' in get_database_url()

# Logger
logger = logging.getLogger(__name__)

# Configuración de PostgreSQL usando sistema dual
DATABASE_URL = get_database_url()

# Configuración del engine con optimizaciones para PostgreSQL
def create_database_engine():
    """Crear engine de base de datos optimizado para PostgreSQL"""
    
    # Configuración diferente según entorno
    if is_local_environment():
        engine_kwargs = {
            "pool_pre_ping": True,      # Verificar conexiones antes de usar
            "pool_recycle": 1800,       # Reciclar conexiones cada 30 minutos (local)
            "pool_size": 5,             # 5 conexiones en el pool (local)
            "max_overflow": 10,         # Hasta 10 conexiones adicionales (local)
            "echo": True,               # Debug SQL habilitado para desarrollo
            "pool_timeout": 10,         # Timeout más corto para local
        }
    else:
        engine_kwargs = {
            "pool_pre_ping": True,      # Verificar conexiones antes de usar
            "pool_recycle": 300,        # Reciclar conexiones cada 5 minutos
            "pool_size": 10,            # 10 conexiones en el pool
            "max_overflow": 20,         # Hasta 20 conexiones adicionales
            "echo": False,              # Sin debug SQL en producción
            "pool_timeout": 30,         # Timeout para obtener conexión del pool
        }
    
    engine = create_engine(DATABASE_URL, **engine_kwargs)
    logger.info(f"� PostgreSQL engine configurado: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'local'}")
    return engine

# Crear engine
engine = create_database_engine()

# Session maker
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Importar Base desde modelsFastapi
from app.models import Base

def create_tables():
    """
    Crear todas las tablas en la base de datos
    Solo usar en desarrollo - En producción usar Alembic
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tablas creadas exitosamente")
    except Exception as e:
        logger.error(f"❌ Error creando tablas: {e}")
        raise e

def drop_tables():
    """
    Eliminar todas las tablas (usar con cuidado)
    Solo para desarrollo/testing
    """
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("�️ Tablas eliminadas exitosamente")
    except Exception as e:
        logger.error(f"❌ Error eliminando tablas: {e}")
        raise e

# Dependency para FastAPI endpoints
def get_db() -> Generator[Session, None, None]:
    """
    Dependency para obtener sesión de base de datos
    Usar con Depends() en endpoints de FastAPI
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"❌ Error en sesión de base de datos: {e}")
        db.rollback()
        raise
    finally:
        db.close()

# Context manager para operaciones fuera de endpoints
@contextmanager
def get_db_context():
    """
    Context manager para operaciones de base de datos
    Útil para scripts, background tasks, etc.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"❌ Error en context manager de BD: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def get_db_session():
    """
    Obtener sesión directa (recordar cerrar manualmente)
    """
    return SessionLocal()

def check_database_connection() -> dict:
    """
    Verificar conexión a PostgreSQL
    Retorna información del estado de la conexión
    """
    try:
        with engine.connect() as connection:
            from sqlalchemy import text
            result = connection.execute(text("SELECT version()"))
            version_info = result.fetchone()[0]
            version = version_info.split()[1] if version_info else "unknown"
            
            logger.info("✅ Conexión a PostgreSQL exitosa")
            return {
                "status": "healthy",
                "type": "postgresql", 
                "version": version,
                "pool_size": engine.pool.size(),
                "connected": True
            }
            
    except Exception as e:
        logger.error(f"❌ Error conectando a PostgreSQL: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "connected": False
        }

# Clase helper para operaciones comunes
class DatabaseOperations:
    """Operaciones comunes de base de datos con SQLAlchemy"""
    
    @staticmethod
    def create_with_commit(db: Session, model_instance):
        """Crear registro y hacer commit"""
        try:
            db.add(model_instance)
            db.commit()
            db.refresh(model_instance)
            logger.debug(f"✅ {model_instance.__class__.__name__} creado")
            return model_instance
        except Exception as e:
            logger.error(f"❌ Error creando {model_instance.__class__.__name__}: {e}")
            db.rollback()
            raise
    
    @staticmethod
    def update_with_commit(db: Session, model_instance, **kwargs):
        """Actualizar registro y hacer commit"""
        try:
            for key, value in kwargs.items():
                if hasattr(model_instance, key):
                    setattr(model_instance, key, value)
            db.commit()
            db.refresh(model_instance)
            logger.debug(f"✅ {model_instance.__class__.__name__} actualizado")
            return model_instance
        except Exception as e:
            logger.error(f"❌ Error actualizando {model_instance.__class__.__name__}: {e}")
            db.rollback()
            raise
    
    @staticmethod
    def delete_with_commit(db: Session, model_instance):
        """Eliminar registro y hacer commit"""
        try:
            db.delete(model_instance)
            db.commit()
            logger.debug(f"✅ {model_instance.__class__.__name__} eliminado")
            return True
        except Exception as e:
            logger.error(f"❌ Error eliminando {model_instance.__class__.__name__}: {e}")
            db.rollback()
            raise

# Configurar logging en desarrollo
if os.getenv('DEBUG', 'False').lower() == 'true':
    logging.basicConfig()
    logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
    logger.info("🔍 Logging de SQLAlchemy habilitado")

logger.info("🚀 Base de datos FastAPI configurada con PostgreSQL")
