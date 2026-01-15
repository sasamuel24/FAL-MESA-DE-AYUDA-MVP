"""
Router para gestión de datos B2B (Ciudades, Razones Sociales, Sucursales, Equipos, Categorías)
Sistema dinámico para formularios B2B
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
import logging

from app.database import get_db

# Configurar logging
logger = logging.getLogger(__name__)

# Crear router
router = APIRouter(
    prefix="/organizaciones-b2b",
    tags=["Organizaciones B2B"],
    responses={404: {"description": "Not found"}}
)

# Por ahora, vamos a crear endpoints mock que devuelvan datos de ejemplo
# Estos se pueden reemplazar con modelos reales de base de datos más adelante

@router.get("/ciudades")
async def get_ciudades_b2b(db: Session = Depends(get_db)):
    """Obtener todas las ciudades para B2B"""
    try:
        # Datos mock para ciudades B2B
        ciudades_mock = [
            {"id": 1, "nombre": "Bogotá", "codigo": "BOG", "activa": True},
            {"id": 2, "nombre": "Medellín", "codigo": "MED", "activa": True},
            {"id": 3, "nombre": "Cali", "codigo": "CAL", "activa": True},
            {"id": 4, "nombre": "Barranquilla", "codigo": "BAQ", "activa": True},
            {"id": 5, "nombre": "Cartagena", "codigo": "CTG", "activa": True},
            {"id": 6, "nombre": "Bucaramanga", "codigo": "BUC", "activa": True},
            {"id": 7, "nombre": "Pereira", "codigo": "PER", "activa": True},
            {"id": 8, "nombre": "Manizales", "codigo": "MAN", "activa": True}
        ]
        
        logger.info(f"✅ Devolviendo {len(ciudades_mock)} ciudades B2B")
        return ciudades_mock
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo ciudades B2B: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/razones-sociales")
async def get_razones_sociales(db: Session = Depends(get_db)):
    """Obtener todas las razones sociales"""
    try:
        # Datos mock para razones sociales
        razones_mock = [
            {"id": 1, "nombre": "Corporación Empresarial S.A.S", "codigo": "CORP001", "activa": True},
            {"id": 2, "nombre": "Industrias Colombia Ltda.", "codigo": "INDCOL002", "activa": True},
            {"id": 3, "nombre": "Comercializadora Nacional S.A.", "codigo": "COMNAL003", "activa": True},
            {"id": 4, "nombre": "Tecnología y Servicios S.A.S", "codigo": "TECSER004", "activa": True},
            {"id": 5, "nombre": "Distribuidora Regional Ltda.", "codigo": "DISREG005", "activa": True},
            {"id": 6, "nombre": "Grupo Empresarial Andino S.A.", "codigo": "GRPAND006", "activa": True},
            {"id": 7, "nombre": "Compañía de Servicios Integrales", "codigo": "CSINT007", "activa": True},
            {"id": 8, "nombre": "Manufacturas del Pacífico S.A.S", "codigo": "MANPAC008", "activa": True}
        ]
        
        logger.info(f"✅ Devolviendo {len(razones_mock)} razones sociales")
        return razones_mock
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo razones sociales: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/sucursales")
async def get_sucursales(
    razon_social_id: int = Query(..., description="ID de la razón social"),
    db: Session = Depends(get_db)
):
    """Obtener sucursales por razón social"""
    try:
        # Datos mock para sucursales organizadas por razón social
        sucursales_mock = {
            1: [  # Corporación Empresarial S.A.S
                {"id": 1, "nombre": "Sucursal Centro", "codigo": "CENT001", "razon_social_id": 1, "activa": True},
                {"id": 2, "nombre": "Sucursal Norte", "codigo": "NORT002", "razon_social_id": 1, "activa": True},
                {"id": 3, "nombre": "Sucursal Sur", "codigo": "SUR003", "razon_social_id": 1, "activa": True}
            ],
            2: [  # Industrias Colombia Ltda.
                {"id": 4, "nombre": "Planta Principal", "codigo": "PLAN001", "razon_social_id": 2, "activa": True},
                {"id": 5, "nombre": "Oficina Administrativa", "codigo": "OFIC002", "razon_social_id": 2, "activa": True}
            ],
            3: [  # Comercializadora Nacional S.A.
                {"id": 6, "nombre": "Almacén Central", "codigo": "ALMCEN001", "razon_social_id": 3, "activa": True},
                {"id": 7, "nombre": "Punto de Venta Principal", "codigo": "PVPRIN002", "razon_social_id": 3, "activa": True},
                {"id": 8, "nombre": "Bodega Logística", "codigo": "BODLOG003", "razon_social_id": 3, "activa": True}
            ],
            4: [  # Tecnología y Servicios S.A.S
                {"id": 9, "nombre": "Centro de Datos", "codigo": "CEDAT001", "razon_social_id": 4, "activa": True},
                {"id": 10, "nombre": "Oficina Técnica", "codigo": "OFTEC002", "razon_social_id": 4, "activa": True}
            ],
            5: [  # Distribuidora Regional Ltda.
                {"id": 11, "nombre": "Hub Distribución", "codigo": "HUBDIS001", "razon_social_id": 5, "activa": True},
                {"id": 12, "nombre": "Centro Logístico", "codigo": "CENLOG002", "razon_social_id": 5, "activa": True}
            ],
            6: [  # Grupo Empresarial Andino S.A.
                {"id": 13, "nombre": "Torre Corporativa", "codigo": "TORCOR001", "razon_social_id": 6, "activa": True},
                {"id": 14, "nombre": "Sede Operativa", "codigo": "SEDOPE002", "razon_social_id": 6, "activa": True}
            ],
            7: [  # Compañía de Servicios Integrales
                {"id": 15, "nombre": "Base de Operaciones", "codigo": "BASOPE001", "razon_social_id": 7, "activa": True}
            ],
            8: [  # Manufacturas del Pacífico S.A.S
                {"id": 16, "nombre": "Planta de Producción", "codigo": "PLANPRO001", "razon_social_id": 8, "activa": True},
                {"id": 17, "nombre": "Centro de Calidad", "codigo": "CENCAL002", "razon_social_id": 8, "activa": True}
            ]
        }
        
        sucursales = sucursales_mock.get(razon_social_id, [])
        logger.info(f"✅ Devolviendo {len(sucursales)} sucursales para razón social {razon_social_id}")
        return sucursales
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo sucursales: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/categorias")
async def get_categorias_b2b(db: Session = Depends(get_db)):
    """Obtener todas las categorías para B2B"""
    try:
        # Datos mock para categorías B2B
        categorias_mock = [
            {"id": 1, "nombre": "Hardware", "codigo": "HW001", "activa": True},
            {"id": 2, "nombre": "Software", "codigo": "SW002", "activa": True},
            {"id": 3, "nombre": "Redes y Comunicaciones", "codigo": "RED003", "activa": True},
            {"id": 4, "nombre": "Seguridad Informática", "codigo": "SEC004", "activa": True},
            {"id": 5, "nombre": "Infraestructura", "codigo": "INF005", "activa": True},
            {"id": 6, "nombre": "Soporte Técnico", "codigo": "SUP006", "activa": True},
            {"id": 7, "nombre": "Equipos Industriales", "codigo": "EQI007", "activa": True},
            {"id": 8, "nombre": "Mantenimiento Preventivo", "codigo": "MAN008", "activa": True}
        ]
        
        logger.info(f"✅ Devolviendo {len(categorias_mock)} categorías B2B")
        return categorias_mock
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo categorías B2B: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/subcategorias")
async def get_subcategorias_b2b(
    categoria_id: int = Query(..., description="ID de la categoría"),
    db: Session = Depends(get_db)
):
    """Obtener subcategorías por categoría"""
    try:
        # Datos mock para subcategorías organizadas por categoría
        subcategorias_mock = {
            1: [  # Hardware
                {"id": 1, "nombre": "Computadores", "codigo": "COMP001", "categoria_id": 1, "activa": True},
                {"id": 2, "nombre": "Impresoras", "codigo": "IMP002", "categoria_id": 1, "activa": True},
                {"id": 3, "nombre": "Servidores", "codigo": "SERV003", "categoria_id": 1, "activa": True},
                {"id": 4, "nombre": "Periféricos", "codigo": "PERI004", "categoria_id": 1, "activa": True}
            ],
            2: [  # Software
                {"id": 5, "nombre": "Sistema Operativo", "codigo": "SO005", "categoria_id": 2, "activa": True},
                {"id": 6, "nombre": "Aplicaciones", "codigo": "APP006", "categoria_id": 2, "activa": True},
                {"id": 7, "nombre": "Licencias", "codigo": "LIC007", "categoria_id": 2, "activa": True},
                {"id": 8, "nombre": "Antivirus", "codigo": "AV008", "categoria_id": 2, "activa": True}
            ],
            3: [  # Redes y Comunicaciones
                {"id": 9, "nombre": "Conectividad", "codigo": "CON009", "categoria_id": 3, "activa": True},
                {"id": 10, "nombre": "Telefonía", "codigo": "TEL010", "categoria_id": 3, "activa": True},
                {"id": 11, "nombre": "Wi-Fi", "codigo": "WIFI011", "categoria_id": 3, "activa": True},
                {"id": 12, "nombre": "VPN", "codigo": "VPN012", "categoria_id": 3, "activa": True}
            ],
            4: [  # Seguridad Informática
                {"id": 13, "nombre": "Firewall", "codigo": "FW013", "categoria_id": 4, "activa": True},
                {"id": 14, "nombre": "Accesos", "codigo": "ACC014", "categoria_id": 4, "activa": True},
                {"id": 15, "nombre": "Monitoreo", "codigo": "MON015", "categoria_id": 4, "activa": True}
            ],
            5: [  # Infraestructura
                {"id": 16, "nombre": "Data Center", "codigo": "DC016", "categoria_id": 5, "activa": True},
                {"id": 17, "nombre": "UPS", "codigo": "UPS017", "categoria_id": 5, "activa": True},
                {"id": 18, "nombre": "Climatización", "codigo": "CLIM018", "categoria_id": 5, "activa": True}
            ],
            6: [  # Soporte Técnico
                {"id": 19, "nombre": "Mesa de Ayuda", "codigo": "MESA019", "categoria_id": 6, "activa": True},
                {"id": 20, "nombre": "Soporte Remoto", "codigo": "REM020", "categoria_id": 6, "activa": True},
                {"id": 21, "nombre": "Soporte Presencial", "codigo": "PRES021", "categoria_id": 6, "activa": True}
            ],
            7: [  # Equipos Industriales
                {"id": 22, "nombre": "Maquinaria", "codigo": "MAQ022", "categoria_id": 7, "activa": True},
                {"id": 23, "nombre": "Instrumentación", "codigo": "INST023", "categoria_id": 7, "activa": True},
                {"id": 24, "nombre": "Control Industrial", "codigo": "CTRL024", "categoria_id": 7, "activa": True}
            ],
            8: [  # Mantenimiento Preventivo
                {"id": 25, "nombre": "Rutinas de Mantenimiento", "codigo": "RUT025", "categoria_id": 8, "activa": True},
                {"id": 26, "nombre": "Inspecciones", "codigo": "INSP026", "categoria_id": 8, "activa": True},
                {"id": 27, "nombre": "Calibraciones", "codigo": "CAL027", "categoria_id": 8, "activa": True}
            ]
        }
        
        subcategorias = subcategorias_mock.get(categoria_id, [])
        logger.info(f"✅ Devolviendo {len(subcategorias)} subcategorías para categoría {categoria_id}")
        return subcategorias
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo subcategorías B2B: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/equipos")
async def get_equipos_b2b(
    sucursal_id: int = Query(..., description="ID de la sucursal"),
    db: Session = Depends(get_db)
):
    """Obtener equipos por sucursal"""
    try:
        # Datos mock para equipos organizados por sucursal
        equipos_mock = {
            1: [  # Sucursal Centro
                {"id": 1, "nombre": "Servidor Principal", "codigo": "SRV001", "sucursal_id": 1, "activa": True},
                {"id": 2, "nombre": "Router Cisco", "codigo": "RTR002", "sucursal_id": 1, "activa": True},
                {"id": 3, "nombre": "Switch HP", "codigo": "SW003", "sucursal_id": 1, "activa": True}
            ],
            2: [  # Sucursal Norte
                {"id": 4, "nombre": "PC Estación 1", "codigo": "PC001", "sucursal_id": 2, "activa": True},
                {"id": 5, "nombre": "Impresora Láser", "codigo": "IMP001", "sucursal_id": 2, "activa": True}
            ],
            3: [  # Sucursal Sur
                {"id": 6, "nombre": "Videoconferencia", "codigo": "VC001", "sucursal_id": 3, "activa": True},
                {"id": 7, "nombre": "Proyector", "codigo": "PROY001", "sucursal_id": 3, "activa": True}
            ],
            4: [  # Planta Principal
                {"id": 8, "nombre": "PLC Siemens", "codigo": "PLC001", "sucursal_id": 4, "activa": True},
                {"id": 9, "nombre": "HMI Industrial", "codigo": "HMI001", "sucursal_id": 4, "activa": True},
                {"id": 10, "nombre": "Variador de Frecuencia", "codigo": "VDF001", "sucursal_id": 4, "activa": True}
            ],
            5: [  # Oficina Administrativa
                {"id": 11, "nombre": "Central Telefónica", "codigo": "PBX001", "sucursal_id": 5, "activa": True},
                {"id": 12, "nombre": "UPS 10KVA", "codigo": "UPS001", "sucursal_id": 5, "activa": True}
            ]
            # Se pueden agregar más sucursales según sea necesario
        }
        
        equipos = equipos_mock.get(sucursal_id, [])
        logger.info(f"✅ Devolviendo {len(equipos)} equipos para sucursal {sucursal_id}")
        return equipos
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo equipos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")