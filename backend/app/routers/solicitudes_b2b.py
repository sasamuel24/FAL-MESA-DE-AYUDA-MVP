"""
Router para solicitudes B2B
Manejo de formularios y creación de solicitudes empresariales
"""
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import os
from datetime import datetime

from app.database import get_db

# Configurar logging
logger = logging.getLogger(__name__)

# Crear router
router = APIRouter(
    prefix="/solicitudes-b2b",
    tags=["Solicitudes B2B"],
    responses={404: {"description": "Not found"}}
)

@router.post("/")
async def crear_solicitud_b2b(
    nombre: str = Form(...),
    correo: str = Form(...),
    telefono: str = Form(...),
    asunto: str = Form(...),
    descripcion: str = Form(...),
    ciudad: str = Form(...),
    razonSocial: str = Form(...),
    sucursal: str = Form(...),
    categoria: str = Form(...),
    subcategoria: str = Form(...),
    equipo: Optional[str] = Form(None),
    tipo_formulario: str = Form("b2b"),
    archivos: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db)
):
    """Crear una nueva solicitud B2B"""
    try:
        logger.info(f"📝 Creando nueva solicitud B2B para {nombre} ({correo})")
        
        # Validaciones básicas
        if not all([nombre, correo, telefono, asunto, descripcion, ciudad, razonSocial, sucursal, categoria, subcategoria]):
            raise HTTPException(status_code=400, detail="Todos los campos obligatorios deben ser completados")
        
        # Procesar archivos adjuntos (si los hay)
        archivos_guardados = []
        if archivos and len(archivos) > 0:
            for archivo in archivos:
                if archivo.filename and archivo.filename.strip():
                    try:
                        # Por ahora solo loggeamos los archivos, más adelante se pueden guardar
                        logger.info(f"📎 Archivo recibido: {archivo.filename} ({archivo.content_type})")
                        archivos_guardados.append({
                            "nombre": archivo.filename,
                            "tipo": archivo.content_type,
                            "tamaño": len(await archivo.read())
                        })
                        # Reset para evitar problemas
                        await archivo.seek(0)
                    except Exception as e:
                        logger.warning(f"⚠️ Error procesando archivo {archivo.filename}: {str(e)}")
        
        # Por ahora, simular la creación de la solicitud
        # En una implementación real, aquí se guardaría en la base de datos
        solicitud_mock = {
            "id": 12345,  # ID simulado
            "folio": f"B2B-{datetime.now().strftime('%Y%m%d')}-{12345}",
            "fecha_creacion": datetime.now().isoformat(),
            "nombre": nombre,
            "correo": correo,
            "telefono": telefono,
            "asunto": asunto,
            "descripcion": descripcion,
            "ciudad": ciudad,
            "razon_social": razonSocial,
            "sucursal": sucursal,
            "categoria": categoria,
            "subcategoria": subcategoria,
            "equipo": equipo,
            "tipo_formulario": tipo_formulario,
            "estado": "Pendiente",
            "archivos": archivos_guardados
        }
        
        logger.info(f"✅ Solicitud B2B creada exitosamente - ID: {solicitud_mock['id']}")
        
        return {
            "success": True,
            "message": "Solicitud B2B creada exitosamente",
            "data": solicitud_mock
        }
        
    except HTTPException as he:
        logger.error(f"❌ Error HTTP en solicitud B2B: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"❌ Error interno creando solicitud B2B: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/test")
async def test_b2b():
    """Endpoint de prueba para verificar que el router B2B funciona"""
    return {
        "success": True,
        "message": "Router B2B funcionando correctamente",
        "timestamp": datetime.now().isoformat()
    }