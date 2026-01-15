"""
FastAPI Application Factory
Sistema unificado sin dependencias de Flask
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os

from app.database import create_tables, check_database_connection

# Logger
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events para FastAPI"""
    # Startup
    logger.info("🚀 FastAPI iniciando...")
    
    # Verificar conexión a PostgreSQL
    db_status = check_database_connection()
    if db_status["connected"]:
        logger.info(f"✅ Conectado a PostgreSQL: {db_status['version']}")
    else:
        logger.error(f"❌ Error conectando a PostgreSQL: {db_status['error']}")
    
    # Crear tablas en desarrollo (usar Alembic en producción)
    if os.getenv('ENVIRONMENT', 'development') == 'development':
        try:
            create_tables()
            logger.info("✅ Tablas sincronizadas")
        except Exception as e:
            logger.warning(f"⚠️ Error creando tablas: {e}")
    
    yield
    
    # Shutdown
    logger.info("⏹️ FastAPI cerrando...")

def create_fastapi_app() -> FastAPI:
    """
    Factory para crear aplicación FastAPI
    Sistema completamente independiente de Flask
    """
    
    # Configurar aplicación
    app = FastAPI(
        title="Café Quindío - Mesa de Ayuda API",
        description="API FastAPI con PostgreSQL - Sistema unificado",
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
        redirect_slashes=False  # SOLUCIÓN: Desactivar redirects automáticos
    )
    
    # Configurar CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",  # Frontend Next.js
            "http://127.0.0.1:3000",
            "https://main.d1sk1l0el2e2wp.amplifyapp.com",  # AWS Amplify 
            "https://*.amplifyapp.com",  # Otros deploys de Amplify
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    
    # Importar y registrar routers
    register_fastapi_routers(app)
    
    # Registrar endpoints de salud
    register_health_endpoints(app)
    
    logger.info("🔧 FastAPI configurada correctamente")
    return app

def register_fastapi_routers(app: FastAPI):
    """Registrar todos los routers de FastAPI"""
    
    # Router de autenticación
    from app.routers.auth import router as auth_router
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["Autenticación"])
    
    # Router de usuarios
    from app.routers.users import router as users_router
    app.include_router(users_router, prefix="/api/v1/users", tags=["Usuarios"])
    
    # Router de solicitudes B2C
    from app.routers.b2c import router as b2c_router
    app.include_router(b2c_router, prefix="/api/v1/solicitudes", tags=["Solicitudes B2C"])
    
    # Router de órdenes de trabajo
    from app.routers.work_orders import router as work_orders_router
    app.include_router(work_orders_router, prefix="/api/v1/ots", tags=["Órdenes de Trabajo"])
    
    # Router para técnicos
    from app.routers.tecnico_ordenestrabajo import router as tecnico_router
    app.include_router(tecnico_router, prefix="/api/v1/ots", tags=["Técnico - OTs"])
    
    # Router de etapas
    from app.routers.etapas import router as etapas_router
    app.include_router(etapas_router, prefix="/api/v1/etapas", tags=["Etapas"])
    
    # Router de notas
    from app.routers.notas import router as notas_router
    app.include_router(notas_router, prefix="/api/v1/ots", tags=["Notas Trazables"])
    
    # Router de firmas
    from app.routers.firmas import router as firmas_router
    app.include_router(firmas_router, prefix="/api/v1/firmas-conformidad", tags=["Firmas de Conformidad"])
    
    # Router de organizaciones (nuevo)
    from app.routers.organizaciones import router as organizaciones_router
    app.include_router(organizaciones_router, prefix="/api/v1/organizaciones", tags=["Organizaciones"])
    
    # Router de autogestión (nuevo)
    from app.routers.autogestion import router as autogestion_router
    app.include_router(autogestion_router, prefix="/api/v1", tags=["Autogestión"])
    
    # Router de logística (áreas de logística)
    from app.routers.logistica import router as logistica_router
    app.include_router(logistica_router, prefix="/api/v1", tags=["Logística"])
    
    # Router de módulo financiero B2B
    from app.routers.financiero import router as financiero_router
    app.include_router(financiero_router, tags=["Financiero"])
    
    # Router B2B completo (reemplaza organizaciones y solicitudes B2B)
    from app.routers.b2b import router as b2b_router
    app.include_router(b2b_router, prefix="/api/v1/b2b", tags=["B2B - Sistema Completo"])
    
    # Router de Dashboard OTs (para roles gerenciales)
    from app.routers.dashboard_ots import router as dashboard_router
    app.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["Dashboard OTs"])
    
    logger.info("✅ Todos los routers registrados con prefijo /api/v1")

def register_health_endpoints(app: FastAPI):
    """Registrar endpoints de salud y estado"""
    
    @app.get("/health", tags=["Sistema"])
    async def health_check():
        """Endpoint de verificación de salud"""
        db_status = check_database_connection()
        return {
            "status": "healthy" if db_status["connected"] else "unhealthy",
            "version": "2.0.0",
            "database": db_status,
            "system": "FastAPI + PostgreSQL"
        }
    
    @app.get("/", tags=["Sistema"])
    async def root():
        """Endpoint raíz"""
        return {
            "message": "Café Quindío - Mesa de Ayuda API v2.0",
            "docs": "/docs",
            "health": "/health",
            "system": "FastAPI + PostgreSQL + SQLAlchemy"
        }

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Crear instancia de la aplicación
app = create_fastapi_app()
