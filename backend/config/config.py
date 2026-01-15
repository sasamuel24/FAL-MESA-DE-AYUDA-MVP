import os
from datetime import timedelta

class BaseConfig:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Database
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    
    # PostgreSQL specific settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_timeout': 20,
        'pool_recycle': -1,
        'max_overflow': 0,
        'pool_pre_ping': True,
        'echo': False
    }
    
    # File uploads
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
    
    # API
    API_VERSION = 'v1'
    API_TITLE = 'Café Quindío API'
    API_DESCRIPTION = 'Enterprise Management System API'
    
    # Pagination
    ITEMS_PER_PAGE = 20
    MAX_ITEMS_PER_PAGE = 100
    
    # Security
    BCRYPT_LOG_ROUNDS = 12
    
    # CORS
    CORS_ORIGINS = ['http://localhost:3000']

class DevelopmentConfig(BaseConfig):
    """Development configuration"""
    DEBUG = True
    # Usar PostgreSQL por defecto, con SQLite como fallback solo si no hay PostgreSQL
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://postgres:Samuel22.@localhost:5432/BDCQ'
    SQLALCHEMY_ECHO = True
    
    # SQLite settings (diferentes de PostgreSQL)
    if 'sqlite' in (os.environ.get('DATABASE_URL') or 'sqlite'):
        SQLALCHEMY_ENGINE_OPTIONS = {
            'pool_pre_ping': True,
            'echo': True
        }
    else:
        # PostgreSQL Development settings
        SQLALCHEMY_ENGINE_OPTIONS = {
            'pool_size': 5,
            'pool_timeout': 20,
            'pool_recycle': 300,
            'max_overflow': 5,
            'pool_pre_ping': True,
            'echo': True
        }
    
    # Redis for caching (optional - currently not used)
    # REDIS_URL = os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'
    
    # Email via Microsoft Graph API (configured in services/email_service.py)
    # MAIL_SERVER, MAIL_PORT, etc. not needed - using Graph API instead

class ProductionConfig(BaseConfig):
    """Production configuration"""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://postgres:Samuel22.@localhost:5432/BDCQ'
    
    # PostgreSQL Production settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,
        'pool_timeout': 30,
        'pool_recycle': 3600,
        'max_overflow': 10,
        'pool_pre_ping': True,
        'echo': False
    }
    
    # Services currently not implemented (for future use):
    # Redis, Celery, Email SMTP, Sentry, AWS S3

class StagingConfig(ProductionConfig):
    """Staging configuration - for future use"""
    pass

class TestingConfig(BaseConfig):
    """Testing configuration - for future use"""
    pass

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}