"""
FastAPI Main Application - Café Quindío Mesa de Ayuda
Sistema unificado con PostgreSQL y SQLAlchemy
"""
import uvicorn
import os
import logging
from app.fastapi_app import app

# Configurar logging
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    # Configuración de la aplicación
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 8001))
    debug = os.getenv('DEBUG', 'True').lower() == 'true'
    
    logger.info(f"🚀 Iniciando FastAPI en {host}:{port}")
    
    # Configuración de Uvicorn
    config = {
        "host": host,
        "port": port,
        "reload": debug,
        "log_level": "info" if debug else "warning",
        "access_log": debug,
    }
    
    # Mensaje de inicio
    print(f"""
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                    🌟 CAFÉ QUINDÍO - MESA DE AYUDA v2.0 🌟                   ║
    ║                           Sistema FastAPI Unificado                         ║
    ╠══════════════════════════════════════════════════════════════════════════════╣
    ║  🌐 API URL: http://{host}:{port}                                     ║
    ║  📖 Docs:    http://{host}:{port}/docs                               ║
    ║  💚 Health:  http://{host}:{port}/health                             ║
    ║                                                                              ║
    ║  🐘 Database: PostgreSQL                                                     ║
    ║  ⚡ Framework: FastAPI + SQLAlchemy                                           ║
    ║  🔥 Mode: {'Development' if debug else 'Production'}                                                    ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # Iniciar servidor
    uvicorn.run("app.fastapi_app:app", **config)