"""
Router para el módulo de autogestión - Gestión dinámica de plantas, activos, categorías y subcategorías
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import Planta, Activo, Categoria, Subcategoria, PlantaCategoria, PlantaSubcategoria
from ..schemas import (
    PlantaCreate, PlantaUpdate, PlantaResponse, PlantaConActivos,
    ActivoCreate, ActivoUpdate, ActivoResponse,
    CategoriaCreate, CategoriaUpdate, CategoriaResponse, CategoriaConSubcategorias,
    SubcategoriaCreate, SubcategoriaUpdate, SubcategoriaResponse,
    PlantaCategoriaCreate, PlantaCategoriaUpdate, PlantaCategoriaResponse, PlantaCategoriaConSubcategorias,
    PlantaSubcategoriaCreate, PlantaSubcategoriaUpdate, PlantaSubcategoriaResponse
)
from ..core.security import get_current_active_user
from ..models import User

router = APIRouter(
    prefix="/autogestion",
    tags=["autogestion"],
    responses={404: {"description": "Not found"}},
)

# === ENDPOINTS PARA PLANTAS ===

@router.get("/plantas", response_model=List[PlantaResponse])
async def get_plantas(
    activa: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Obtener lista de plantas"""
    query = db.query(Planta)
    
    if activa is not None:
        query = query.filter(Planta.activa == activa)
    
    plantas = query.offset(skip).limit(limit).all()
    return plantas

@router.get("/plantas/{planta_id}", response_model=PlantaConActivos)
async def get_planta(
    planta_id: int,
    db: Session = Depends(get_db)
):
    """Obtener planta específica con sus activos"""
    planta = db.query(Planta).options(
        joinedload(Planta.activos)
    ).filter(Planta.id == planta_id).first()
    
    if not planta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Planta no encontrada"
        )
    
    return planta

@router.post("/plantas", response_model=PlantaResponse)
async def create_planta(
    planta: PlantaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crear nueva planta"""
    # Verificar que el usuario sea admin
    if current_user.rol != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear plantas"
        )
    
    # Nota: Se permite que múltiples plantas tengan el mismo código
    # Esto es especialmente útil para el código 'MANTENIMIENTO' que puede aplicar a varias plantas
    
    db_planta = Planta(**planta.model_dump())
    db.add(db_planta)
    db.commit()
    db.refresh(db_planta)
    
    return db_planta

@router.put("/plantas/{planta_id}", response_model=PlantaResponse)
async def update_planta(
    planta_id: int,
    planta_update: PlantaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Actualizar planta existente"""
    if current_user.rol != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para actualizar plantas"
        )
    
    db_planta = db.query(Planta).filter(Planta.id == planta_id).first()
    if not db_planta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Planta no encontrada"
        )
    
    # Nota: Se permite que múltiples plantas tengan el mismo código
    # Esto es especialmente útil para el código 'MANTENIMIENTO' que puede aplicar a varias plantas
    
    update_data = planta_update.model_dump(exclude_unset=True)
    update_data['fecha_actualizacion'] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(db_planta, field, value)
    
    db.commit()
    db.refresh(db_planta)
    
    return db_planta

@router.delete("/plantas/{planta_id}")
async def delete_planta(
    planta_id: int,
    permanent: bool = Query(False, description="Eliminación permanente (true) o lógica (false)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Eliminar planta - Lógica (inactiva) o permanente"""
    if current_user.rol != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar plantas"
        )
    
    db_planta = db.query(Planta).filter(Planta.id == planta_id).first()
    if not db_planta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Planta no encontrada"
        )
    
    if permanent:
        # Obtener activos asociados para informar al usuario
        activos_asociados = db.query(Activo).filter(Activo.planta_id == planta_id).all()
        activos_count = len(activos_asociados)
        
        if activos_count > 0:
            # Eliminar todos los activos asociados primero
            for activo in activos_asociados:
                db.delete(activo)
            
            # Luego eliminar la planta
            db.delete(db_planta)
            db.commit()
            return {
                "message": f"Planta eliminada permanentemente junto con {activos_count} activo(s) asociado(s)",
                "activos_eliminados": activos_count
            }
        else:
            # Eliminación permanente sin activos
            db.delete(db_planta)
            db.commit()
            return {"message": "Planta eliminada permanentemente del sistema"}
    else:
        # Eliminación lógica (marcar como inactiva)
        db_planta.activa = False
        db_planta.fecha_actualizacion = datetime.utcnow()
        db.commit()
        return {"message": "Planta marcada como inactiva exitosamente"}

# === ENDPOINTS PARA ACTIVOS ===

@router.get("/activos", response_model=List[ActivoResponse])
async def get_activos(
    planta_id: Optional[int] = None,
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    activo: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Obtener lista de activos"""
    query = db.query(Activo).options(joinedload(Activo.planta))
    
    if planta_id is not None:
        query = query.filter(Activo.planta_id == planta_id)
    
    if tipo:
        query = query.filter(Activo.tipo == tipo)
    
    if estado:
        query = query.filter(Activo.estado == estado)
    
    if activo is not None:
        query = query.filter(Activo.activo == activo)
    
    activos = query.offset(skip).limit(limit).all()
    return activos

@router.get("/plantas/{planta_id}/activos", response_model=List[ActivoResponse])
async def get_activos_by_planta(
    planta_id: int,
    activo: Optional[bool] = True,
    db: Session = Depends(get_db)
):
    """Obtener activos de una planta específica"""
    # Verificar que la planta existe
    planta = db.query(Planta).filter(Planta.id == planta_id).first()
    if not planta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Planta no encontrada"
        )
    
    query = db.query(Activo).options(joinedload(Activo.planta)).filter(Activo.planta_id == planta_id)
    
    if activo is not None:
        query = query.filter(Activo.activo == activo)
    
    activos = query.all()
    return activos

@router.post("/activos", response_model=ActivoResponse)
async def create_activo(
    activo: ActivoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crear nuevo activo"""
    if current_user.rol != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear activos"
        )
    
    # Verificar que la planta existe
    planta = db.query(Planta).filter(Planta.id == activo.planta_id).first()
    if not planta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Planta no encontrada"
        )
    
    db_activo = Activo(**activo.model_dump())
    db.add(db_activo)
    db.commit()
    db.refresh(db_activo)
    
    # Cargar la relación con planta para la respuesta
    db.refresh(db_activo)
    
    return db_activo

@router.put("/activos/{activo_id}", response_model=ActivoResponse)
async def update_activo(
    activo_id: int,
    activo_update: ActivoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Actualizar activo existente"""
    if current_user.rol != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para actualizar activos"
        )
    
    db_activo = db.query(Activo).filter(Activo.id == activo_id).first()
    if not db_activo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activo no encontrado"
        )
    
    # Verificar planta si se está actualizando
    if activo_update.planta_id and activo_update.planta_id != db_activo.planta_id:
        planta = db.query(Planta).filter(Planta.id == activo_update.planta_id).first()
        if not planta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Planta no encontrada"
            )
    
    update_data = activo_update.model_dump(exclude_unset=True)
    update_data['fecha_actualizacion'] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(db_activo, field, value)
    
    db.commit()
    db.refresh(db_activo)
    
    return db_activo

@router.delete("/activos/{activo_id}")
async def delete_activo(
    activo_id: int,
    permanent: bool = Query(False, description="Eliminación permanente (true) o lógica (false)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Eliminar activo - Lógica (inactivo) o permanente"""
    if current_user.rol != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar activos"
        )
    
    db_activo = db.query(Activo).filter(Activo.id == activo_id).first()
    if not db_activo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activo no encontrado"
        )
    
    if permanent:
        # Eliminación permanente
        db.delete(db_activo)
        db.commit()
        return {"message": "Activo eliminado permanentemente del sistema"}
    else:
        # Eliminación lógica (marcar como inactivo)
        db_activo.activo = False
        db_activo.fecha_actualizacion = datetime.utcnow()
        db.commit()
        return {"message": "Activo marcado como inactivo exitosamente"}

# === ENDPOINTS PARA CATEGORÍAS ===

@router.get("/categorias", response_model=List[CategoriaResponse])
async def get_categorias(
    activa: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Obtener lista de categorías"""
    query = db.query(Categoria)
    
    if activa is not None:
        query = query.filter(Categoria.activa == activa)
    
    categorias = query.offset(skip).limit(limit).all()
    return categorias

@router.get("/categorias/{categoria_id}", response_model=CategoriaConSubcategorias)
async def get_categoria(
    categoria_id: int,
    db: Session = Depends(get_db)
):
    """Obtener categoría específica con sus subcategorías"""
    categoria = db.query(Categoria).options(
        joinedload(Categoria.subcategorias)
    ).filter(Categoria.id == categoria_id).first()
    
    if not categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada"
        )
    
    return categoria

@router.post("/categorias", response_model=CategoriaResponse)
async def create_categoria(
    categoria: CategoriaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crear nueva categoría"""
    if current_user.rol != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear categorías"
        )
    
    db_categoria = Categoria(**categoria.model_dump())
    db.add(db_categoria)
    db.commit()
    db.refresh(db_categoria)
    
    return db_categoria

# === ENDPOINTS PARA SUBCATEGORÍAS ===

@router.get("/subcategorias", response_model=List[SubcategoriaResponse])
async def get_subcategorias(
    categoria_id: Optional[int] = None,
    activa: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Obtener lista de subcategorías"""
    query = db.query(Subcategoria).options(joinedload(Subcategoria.categoria))
    
    if categoria_id is not None:
        query = query.filter(Subcategoria.categoria_id == categoria_id)
    
    if activa is not None:
        query = query.filter(Subcategoria.activa == activa)
    
    subcategorias = query.offset(skip).limit(limit).all()
    return subcategorias

@router.get("/categorias/{categoria_id}/subcategorias", response_model=List[SubcategoriaResponse])
async def get_subcategorias_by_categoria(
    categoria_id: int,
    activa: Optional[bool] = True,
    db: Session = Depends(get_db)
):
    """Obtener subcategorías de una categoría específica"""
    # Verificar que la categoría existe
    categoria = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada"
        )
    
    query = db.query(Subcategoria).options(joinedload(Subcategoria.categoria)).filter(Subcategoria.categoria_id == categoria_id)
    
    if activa is not None:
        query = query.filter(Subcategoria.activa == activa)
    
    subcategorias = query.all()
    return subcategorias

@router.post("/subcategorias", response_model=SubcategoriaResponse)
async def create_subcategoria(
    subcategoria: SubcategoriaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crear nueva subcategoría"""
    if current_user.rol != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear subcategorías"
        )
    
    # Verificar que la categoría existe
    categoria = db.query(Categoria).filter(Categoria.id == subcategoria.categoria_id).first()
    if not categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada"
        )
    
    db_subcategoria = Subcategoria(**subcategoria.model_dump())
    db.add(db_subcategoria)
    db.commit()
    db.refresh(db_subcategoria)
    
    return db_subcategoria


# === ENDPOINTS PARA CATEGORÍAS DE PLANTA SAN PEDRO ===

@router.get("/planta-categorias", response_model=List[PlantaCategoriaResponse])
async def get_planta_categorias(
    activa: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Obtener categorías específicas de Planta San Pedro"""
    query = db.query(PlantaCategoria)
    
    if activa is not None:
        query = query.filter(PlantaCategoria.activa == activa)
    
    categorias = query.offset(skip).limit(limit).all()
    return categorias

@router.get("/planta-categorias/{categoria_id}", response_model=PlantaCategoriaConSubcategorias)
async def get_planta_categoria(
    categoria_id: int,
    db: Session = Depends(get_db)
):
    """Obtener categoría de Planta San Pedro con sus subcategorías"""
    categoria = db.query(PlantaCategoria).options(
        joinedload(PlantaCategoria.subcategorias)
    ).filter(PlantaCategoria.id == categoria_id).first()
    
    if not categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría de Planta San Pedro no encontrada"
        )
    
    return categoria

@router.post("/planta-categorias", response_model=PlantaCategoriaResponse)
async def create_planta_categoria(
    categoria: PlantaCategoriaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crear nueva categoría de Planta San Pedro"""
    if current_user.rol not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear categorías de Planta San Pedro"
        )
    
    db_categoria = PlantaCategoria(**categoria.model_dump())
    db.add(db_categoria)
    db.commit()
    db.refresh(db_categoria)
    
    return db_categoria

@router.put("/planta-categorias/{categoria_id}", response_model=PlantaCategoriaResponse)
async def update_planta_categoria(
    categoria_id: int,
    categoria_update: PlantaCategoriaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Actualizar categoría de Planta San Pedro"""
    if current_user.rol not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para actualizar categorías de Planta San Pedro"
        )
    
    db_categoria = db.query(PlantaCategoria).filter(PlantaCategoria.id == categoria_id).first()
    if not db_categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría de Planta San Pedro no encontrada"
        )
    
    update_data = categoria_update.model_dump(exclude_unset=True)
    if update_data:
        update_data['fecha_actualizacion'] = datetime.utcnow()
        for key, value in update_data.items():
            setattr(db_categoria, key, value)
        
        db.commit()
        db.refresh(db_categoria)
    
    return db_categoria

# Endpoint eliminado - duplicado y causa conflictos

# === ENDPOINTS PARA SUBCATEGORÍAS DE PLANTA SAN PEDRO ===

@router.get("/planta-subcategorias", response_model=List[PlantaSubcategoriaResponse])
async def get_planta_subcategorias(
    categoria_id: Optional[int] = None,
    activa: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Obtener subcategorías de Planta San Pedro"""
    query = db.query(PlantaSubcategoria)
    
    if categoria_id is not None:
        query = query.filter(PlantaSubcategoria.categoria_id == categoria_id)
    
    if activa is not None:
        query = query.filter(PlantaSubcategoria.activa == activa)
    
    subcategorias = query.offset(skip).limit(limit).all()
    return subcategorias

@router.get("/planta-subcategorias/{subcategoria_id}", response_model=PlantaSubcategoriaResponse)
async def get_planta_subcategoria(
    subcategoria_id: int,
    db: Session = Depends(get_db)
):
    """Obtener subcategoría específica de Planta San Pedro"""
    subcategoria = db.query(PlantaSubcategoria).filter(
        PlantaSubcategoria.id == subcategoria_id
    ).first()
    
    if not subcategoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategoría de Planta San Pedro no encontrada"
        )
    
    return subcategoria

@router.post("/planta-subcategorias", response_model=PlantaSubcategoriaResponse)
async def create_planta_subcategoria(
    subcategoria: PlantaSubcategoriaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crear nueva subcategoría de Planta San Pedro"""
    if current_user.rol not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear subcategorías de Planta San Pedro"
        )
    
    # Verificar que la categoría de planta existe
    categoria = db.query(PlantaCategoria).filter(PlantaCategoria.id == subcategoria.categoria_id).first()
    if not categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría de Planta San Pedro no encontrada"
        )
    
    db_subcategoria = PlantaSubcategoria(**subcategoria.model_dump())
    db.add(db_subcategoria)
    db.commit()
    db.refresh(db_subcategoria)
    
    return db_subcategoria

# ==================== ENDPOINTS DE ELIMINACIÓN PLANTA SAN PEDRO ====================

@router.delete("/planta-categorias/{categoria_id}")
async def delete_planta_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Eliminar categoría de Planta San Pedro en cascada (elimina también todas sus subcategorías)"""
    if current_user.rol not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar categorías de Planta San Pedro"
        )
    
    # Verificar que la categoría existe
    categoria = db.query(PlantaCategoria).filter(PlantaCategoria.id == categoria_id).first()
    if not categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría de Planta San Pedro no encontrada"
        )
    
    # Contar subcategorías asociadas para información
    subcategorias_count = db.query(PlantaSubcategoria).filter(PlantaSubcategoria.categoria_id == categoria_id).count()
    
    try:
        # Eliminar primero las subcategorías (aunque la FK ya tiene ON DELETE CASCADE)
        db.query(PlantaSubcategoria).filter(PlantaSubcategoria.categoria_id == categoria_id).delete()
        
        # Eliminar la categoría
        db.delete(categoria)
        db.commit()
        
        return {
            "message": f"Categoría '{categoria.nombre}' eliminada exitosamente",
            "subcategorias_eliminadas": subcategorias_count,
            "categoria_eliminada": categoria.nombre
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar la categoría: {str(e)}"
        )

@router.delete("/planta-subcategorias/{subcategoria_id}")
async def delete_planta_subcategoria(
    subcategoria_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Eliminar subcategoría de Planta San Pedro"""
    if current_user.rol not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar subcategorías de Planta San Pedro"
        )
    
    # Verificar que la subcategoría existe
    subcategoria = db.query(PlantaSubcategoria).filter(PlantaSubcategoria.id == subcategoria_id).first()
    if not subcategoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategoría de Planta San Pedro no encontrada"
        )
    
    try:
        subcategoria_nombre = subcategoria.nombre
        db.delete(subcategoria)
        db.commit()
        
        return {
            "message": f"Subcategoría '{subcategoria_nombre}' eliminada exitosamente"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar la subcategoría: {str(e)}"
        )