"""
Centralizador de routers para FastAPI
Importa todos los routers y los hace disponibles en una lista
Para usar en fastapi_app.py: for router in all_routers: app.include_router(router)
"""
from app.routers.auth import router as auth_router
from app.routers.b2c import router as b2c_router
from app.routers.work_orders import router as work_orders_router
from app.routers.users import router as users_router
from app.routers.etapas import router as etapas_router
from app.routers.notas import router as notas_router
from app.routers.firmas import router as firmas_router
from app.routers.tecnico_ordenestrabajo import router as tecnico_ots_router

# Lista de todos los routers - PATRÓN ELEGANTE para main.py
all_routers = [
    auth_router,
    b2c_router,
    work_orders_router,
    users_router,
    etapas_router,  # Nuevo router de etapas agregado
    notas_router,   # Nuevo router de notas trazables
    firmas_router,  # Nuevo router de firmas de conformidad
    tecnico_ots_router,  # ✨ Nuevo router de técnicos y órdenes de trabajo
    # Agregar futuros routers aquí:
    # ots_router,
    # organizaciones_router,
    # etc.
]

# Exportar para facilitar importación
__all__ = [
    "all_routers",
    "auth_router",
    "b2c_router",
    "work_orders_router",
    "users_router",
    "etapas_router",
    "notas_router",
    "firmas_router",
    "tecnico_ots_router"
]
