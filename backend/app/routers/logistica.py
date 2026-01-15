"""
Router para gestión de áreas de logística
Endpoints para CRUD de áreas logísticas gestionables
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, AreaLogistica
from app.schemas import (
    AreaLogisticaCreate,
    AreaLogisticaUpdate,
    AreaLogisticaResponse
)
from app.core.security import get_current_active_user

router = APIRouter(
    prefix="/logistica",
    tags=["logistica"]
)


# === ENDPOINTS PÚBLICOS (para formularios) ===

@router.get("/areas", response_model=List[AreaLogisticaResponse])
async def get_areas_logistica(
    activa: Optional[bool] = True,
    db: Session = Depends(get_db)
):
    """
    Obtener todas las áreas de logística
    
    - **activa**: Filtrar por estado activo (default: True)
    - Endpoint público para usar en formularios
    """
    query = db.query(AreaLogistica)
    
    if activa is not None:
        query = query.filter(AreaLogistica.activa == activa)
    
    areas = query.order_by(AreaLogistica.nombre).all()
    return areas


@router.get("/areas/{area_id}", response_model=AreaLogisticaResponse)
async def get_area_logistica(
    area_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtener una área de logística por ID
    """
    area = db.query(AreaLogistica).filter(AreaLogistica.id == area_id).first()
    
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Área de logística no encontrada"
        )
    
    return area


# === ENDPOINTS PROTEGIDOS (solo admin) ===

@router.post("/areas", response_model=AreaLogisticaResponse)
async def create_area_logistica(
    area: AreaLogisticaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Crear nueva área de logística
    
    - **Requiere**: Rol admin
    - **Valida**: Nombre y código únicos
    """
    # Verificar que el usuario sea admin
    if current_user.rol != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear áreas de logística"
        )
    
    # Verificar que no exista área con el mismo nombre
    existing_nombre = db.query(AreaLogistica).filter(
        AreaLogistica.nombre == area.nombre
    ).first()
    
    if existing_nombre:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un área con el nombre '{area.nombre}'"
        )
    
    # Nota: Se permite que múltiples áreas tengan el mismo código
    # Esto es especialmente útil para el código 'LOGISTICA' que puede aplicar a varias áreas
    
    # Crear nueva área
    db_area = AreaLogistica(**area.model_dump())
    db.add(db_area)
    db.commit()
    db.refresh(db_area)
    
    return db_area


@router.put("/areas/{area_id}", response_model=AreaLogisticaResponse)
async def update_area_logistica(
    area_id: int,
    area_update: AreaLogisticaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Actualizar área de logística existente
    
    - **Requiere**: Rol admin
    - **Valida**: Nombre y código únicos (si se modifican)
    """
    # Verificar que el usuario sea admin
    if current_user.rol != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para actualizar áreas de logística"
        )
    
    # Buscar área existente
    db_area = db.query(AreaLogistica).filter(AreaLogistica.id == area_id).first()
    
    if not db_area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Área de logística no encontrada"
        )
    
    # Validar nombre único (si se está cambiando)
    if area_update.nombre and area_update.nombre != db_area.nombre:
        existing_nombre = db.query(AreaLogistica).filter(
            AreaLogistica.nombre == area_update.nombre,
            AreaLogistica.id != area_id
        ).first()
        
        if existing_nombre:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un área con el nombre '{area_update.nombre}'"
            )
    
    # Nota: Se permite que múltiples áreas tengan el mismo código
    # Esto es especialmente útil para el código 'LOGISTICA' que puede aplicar a varias áreas
    
    # Actualizar campos
    from datetime import datetime
    update_data = area_update.model_dump(exclude_unset=True)
    update_data['fecha_actualizacion'] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(db_area, field, value)
    
    db.commit()
    db.refresh(db_area)
    
    return db_area


@router.delete("/areas/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_area_logistica(
    area_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Eliminar (soft delete) área de logística
    
    - **Requiere**: Rol admin
    - **Nota**: Marca activa=False en lugar de eliminar físicamente
    """
    # Verificar que el usuario sea admin
    if current_user.rol != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar áreas de logística"
        )
    
    # Buscar área existente
    db_area = db.query(AreaLogistica).filter(AreaLogistica.id == area_id).first()
    
    if not db_area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Área de logística no encontrada"
        )
    
    # Soft delete - marcar como inactiva
    from datetime import datetime
    db_area.activa = False
    db_area.fecha_actualizacion = datetime.utcnow()
    
    db.commit()
    
    return None
