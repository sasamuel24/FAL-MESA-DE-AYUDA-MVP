"""
Router FastAPI para el módulo financiero B2B
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import Optional
import math
import logging

from app.database import get_db
from app.models import Cartera, Factura, User
from app.schemas import (
    CarteraResponse,
    FacturaCreate,
    FacturaResponse,
    FacturaUpdate,
    FacturasListResponse
)
from app.core.security import get_current_active_user
from app.services.s3_service import upload_file_to_s3

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Financiero"])


# ========================================
# Endpoint 1: GET /api/cartera/{nro_docto_cruce}
# ========================================

@router.get("/cartera/{nro_docto_cruce}", response_model=CarteraResponse)
async def get_cartera_by_documento(
    nro_docto_cruce: str,
    db: Session = Depends(get_db)
):
    """
    Obtener datos de cartera por número de documento de cruce.
    
    Este endpoint es usado por el frontend para autocompletar los datos
    de facturación (nit, razón social, sucursal, tipo_cliente) cuando
    el usuario ingresa el número de documento de cruce.
    
    Args:
        nro_docto_cruce: Número de documento de cruce (único en cartera)
        db: Sesión de base de datos
    
    Returns:
        CarteraResponse: Datos del cliente (nit, razon_social, sucursal, tipo_cliente)
    
    Raises:
        404: Si no se encuentra el documento de cruce
    """
    cartera = db.query(Cartera).filter(
        Cartera.nro_docto_cruce == nro_docto_cruce
    ).first()
    
    if not cartera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró documento de cruce: {nro_docto_cruce}"
        )
    
    return cartera


# ========================================
# Endpoint 2: POST /api/facturas
# ========================================

@router.post("/facturas", response_model=FacturaResponse, status_code=status.HTTP_201_CREATED)
async def create_factura(
    # Campos del formulario como Form data
    nombre: str = Form(...),
    correo_electronico: str = Form(...),
    telefono: str = Form(...),
    asunto: str = Form(...),
    nit: str = Form(...),
    razon_social: str = Form(...),
    sucursal: str = Form(...),
    tipo_cliente: str = Form(...),
    nro_docto_cruce: str = Form(...),
    valor_total_cop: float = Form(...),
    descripcion_adicional: Optional[str] = Form(None),
    # Archivo adjunto (imagen de factura)
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Crear una nueva factura en el módulo financiero B2B.
    
    Los datos de facturación (nit, razon_social, tipo_cliente) son autocompletados 
    en el frontend mediante consulta a /api/cartera/{nro_docto_cruce}.
    
    El archivo adjunto se sube a S3 y se almacena la URL en el campo archivo_url.
    
    Args:
        nombre: Nombre del solicitante
        correo_electronico: Email del solicitante
        telefono: Teléfono del solicitante
        asunto: Asunto de la factura
        nit: NIT del cliente (autocompletado)
        razon_social: Razón social del cliente (autocompletado)
        sucursal: Sucursal del cliente
        tipo_cliente: Tipo de cliente (autocompletado)
        nro_docto_cruce: Número de documento de cruce (llave de búsqueda)
        valor_total_cop: Valor total en COP (debe ser > 0)
        descripcion_adicional: Descripción adicional opcional
        archivo: Imagen de la factura (requerido)
        db: Sesión de base de datos
    
    Returns:
        FacturaResponse: Factura creada con estado='Pendiente' y timestamps
    
    Raises:
        400: Si los datos de validación fallan
        500: Si hay error al subir archivo a S3
    """
    try:
        logger.info(f"📝 Creando factura para {razon_social} - Documento: {nro_docto_cruce}")
        
        # Validar valor total
        if valor_total_cop <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El valor total debe ser mayor a cero"
            )
        
        # Validar formato de email
        if '@' not in correo_electronico or '.' not in correo_electronico:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Correo electrónico inválido"
            )
        
        # Subir archivo a S3
        archivo_url = None
        if archivo:
            try:
                # Usar carpeta 'facturas' en S3
                archivo_url = upload_file_to_s3(archivo, folder="facturas")
                logger.info(f"✅ Archivo subido a S3: {archivo_url}")
            except Exception as e:
                logger.error(f"❌ Error al subir archivo a S3: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error al subir archivo: {str(e)}"
                )
        
        # Crear nueva factura (estado='Pendiente' por defecto en el modelo)
        nueva_factura = Factura(
            nombre=nombre,
            correo_electronico=correo_electronico,
            telefono=telefono,
            asunto=asunto,
            nit=nit,
            razon_social=razon_social,
            sucursal=sucursal,
            tipo_cliente=tipo_cliente,
            nro_docto_cruce=nro_docto_cruce,
            valor_total_cop=valor_total_cop,
            descripcion_adicional=descripcion_adicional,
            archivo_url=archivo_url
        )
        
        db.add(nueva_factura)
        db.commit()
        db.refresh(nueva_factura)
        
        logger.info(f"✅ Factura creada exitosamente - ID: {nueva_factura.id}")
        
        return nueva_factura
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creando factura: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear factura: {str(e)}"
        )


# ========================================
# Endpoint 3: GET /api/facturas
# ========================================

@router.get("/facturas", response_model=FacturasListResponse)
async def get_facturas(
    page: int = Query(1, ge=1, description="Número de página (inicia en 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Tamaño de página (máximo 100)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Listar facturas con paginación.
    
    Retorna una lista de facturas ordenadas por fecha de creación descendente
    (más recientes primero), con metadatos de paginación.
    
    Args:
        page: Número de página (default: 1)
        page_size: Registros por página (default: 20, max: 100)
        db: Sesión de base de datos
        current_user: Usuario autenticado (requerido)
    
    Returns:
        FacturasListResponse: Lista de facturas, total, página actual, total de páginas
    
    Raises:
        401: Si el usuario no está autenticado
    """
    # Total de facturas (para calcular total_pages)
    total_facturas = db.query(Factura).count()
    
    # Calcular offset
    offset = (page - 1) * page_size
    
    # Query con paginación y ordenamiento
    facturas = db.query(Factura).order_by(
        Factura.fecha_creacion.desc()
    ).offset(offset).limit(page_size).all()
    
    # Calcular total de páginas
    total_pages = math.ceil(total_facturas / page_size) if total_facturas > 0 else 1
    
    return FacturasListResponse(
        facturas=facturas,
        total=total_facturas,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


# ========================================
# Endpoint 4: PUT /api/facturas/{id}
# ========================================

@router.put("/facturas/{id}", response_model=FacturaResponse)
async def update_factura_estado(
    id: int,
    factura_update: FacturaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Actualizar el estado de una factura.
    
    Solo permite actualizar el campo 'estado'. Los demás campos de la factura
    son inmutables después de creación.
    
    Estados válidos: 'Pendiente', 'Aprobada', 'Rechazada'
    
    Args:
        id: ID de la factura
        factura_update: Solo campo 'estado' con uno de los valores válidos
        db: Sesión de base de datos
        current_user: Usuario autenticado (requerido)
    
    Returns:
        FacturaResponse: Factura actualizada
    
    Raises:
        400: Si el estado no es válido
        401: Si el usuario no está autenticado
        404: Si la factura no existe
    """
    # Buscar factura
    factura = db.query(Factura).filter(Factura.id == id).first()
    
    if not factura:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Factura con ID {id} no encontrada"
        )
    
    # Actualizar solo el campo estado (la validación ya se hizo en el schema)
    factura.estado = factura_update.estado
    
    db.commit()
    db.refresh(factura)
    
    return factura
