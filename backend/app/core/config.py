"""
Configuración central de FastAPI
Variables de entorno y configuraciones globales
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, List
import os
from functools import lru_cache

class Settings(BaseSettings):
    """Configuración principal de FastAPI"""
    
    # Información de la aplicación
    APP_NAME: str = "Café Quindío FastAPI"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"  # Importante aca tenemos el prefijo base de los routers
    API_TITLE: str = "Café Quindío API"
    API_DESCRIPTION: str = "Enterprise Management System API - FastAPI"
    
    # Configuración de entorno
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Base de datos - MISMA configuración que Flask
    DATABASE_URL: str = "postgresql://postgres:Samuel22.@localhost:5432/BDCQ"
    
    # Configuración de seguridad - Compatible con Flask
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_SECRET_KEY: str = "jwt-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 días

    # Pool de conexiones 
    DB_POOL_SIZE: int = 10 # Máximo 10 conexiones simultáneas
    DB_POOL_TIMEOUT: int = 20  # Tiempo de espera para obtener conexión del pool
    DB_POOL_RECYCLE: int = 300 # Tiempo para reciclar conexiones
    DB_MAX_OVERFLOW: int = 5 # Máximo 5 conexiones adicionales
    DB_POOL_PRE_PING: bool = True  # Habilitar verificación previa de conexiones
    DB_ECHO: bool = True  # Solo en desarrollo
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000", # Frontend Next.js
        "http://localhost:8000", # Backend FastAPI local
        "http://127.0.0.1:3000", # Frontend Next.js alternate
        "http://127.0.0.1:8000", # Backend FastAPI alternate
        "http://localhost:3001",  # Agregar puerto alternativo
        "http://127.0.0.1:3001"   # Agregar puerto alternativo
    ]
    
    # Configuración de archivos
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 16 * 1024 * 1024  # 16MB (como Flask)
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "pdf", "doc", "docx"]
    
    # Paginación - Compatible con Flask
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # Configuración de logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Configuración de seguridad adicional
    BCRYPT_LOG_ROUNDS: int = 12
    
    # Variables de Microsoft Graph API para correos (desde .env)
    TENANT_ID: Optional[str] = None
    CLIENT_ID: Optional[str] = None
    CLIENT_SECRET: Optional[str] = None
    FROM_EMAIL: Optional[str] = None
    
    @field_validator("DATABASE_URL", mode="before") # Verificar antes de asignar
    @classmethod
    def assemble_db_connection(cls, v):
        """Validar y construir URL de base de datos"""
        if isinstance(v, str) and v:
            return v
        
        # Fallback usando variables individuales si no hay DATABASE_URL
        db_user = os.getenv("POSTGRES_USER", "postgres")
        db_pass = os.getenv("POSTGRES_PASSWORD", "Samuel22.")
        db_host = os.getenv("POSTGRES_HOST", "localhost")
        db_port = os.getenv("POSTGRES_PORT", "5432")
        db_name = os.getenv("POSTGRES_DB", "BDCQ")
        
        return f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}" # Si no existe en .env retorna la URL completa
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignorar variables extra del .env


class DevelopmentSettings(Settings):
    """Configuración para desarrollo"""
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"
    ENVIRONMENT: str = "development"
    DB_ECHO: bool = True
    
    # Pool settings para desarrollo (como Flask)
    DB_POOL_SIZE: int = 5
    DB_POOL_TIMEOUT: int = 20
    DB_POOL_RECYCLE: int = 300
    DB_MAX_OVERFLOW: int = 5


class ProductionSettings(Settings):
    """Configuración para producción"""
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    ENVIRONMENT: str = "production"
    DB_ECHO: bool = False
    
    # Pool settings para producción (como Flask)
    DB_POOL_SIZE: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    DB_MAX_OVERFLOW: int = 10
    
    # En producción, estos valores DEBEN venir de variables de entorno
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE-ME")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "CHANGE-ME")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v):
        if v == "CHANGE-ME" or len(v) < 32:
            raise ValueError("SECRET_KEY debe ser configurada en producción")
        return v
    
    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret_key(cls, v):
        if v == "CHANGE-ME" or len(v) < 32:
            raise ValueError("JWT_SECRET_KEY debe ser configurada en producción")
        return v


class TestingSettings(Settings):
    """Configuración para testing"""
    DEBUG: bool = True
    ENVIRONMENT: str = "testing"
    DATABASE_URL: str = "sqlite:///./test.db"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 5  # Tokens más cortos para testing


@lru_cache()
def get_settings() -> Settings:
    """
    Obtener configuración basada en el entorno.
    Compatible con Flask config
    """
    environment = os.getenv("ENVIRONMENT", "development").lower()
    
    if environment == "production":
        return ProductionSettings()
    elif environment == "testing":
        return TestingSettings()
    else:
        return DevelopmentSettings()


# Instancia global de configuración
settings = get_settings()

# Función helper para recargar configuración
def reload_settings():
    """Recargar configuración (limpia el cache)"""
    get_settings.cache_clear()
    global settings
    settings = get_settings()
    return settings
