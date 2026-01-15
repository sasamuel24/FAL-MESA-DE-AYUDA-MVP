"""
Router B2B - Gestión completa de entidades B2B con operaciones CRUD
Sistema independiente para formularios B2B con validaciones de integridad referencial
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import os
from datetime import datetime

from ..database import get_db
from ..core.security import get_current_user
from ..models import (
    B2BCiudad, B2BRazonSocial, B2BSucursal, B2BCategoria, 
    B2BSubcategoria, B2BEquipo, B2BSolicitud, User
)
from ..utils.id_generator import obtener_siguiente_id_solicitud, generar_folio_por_tipo
from ..schemas import (
    # Ciudades
    B2BCiudadCreate, B2BCiudadUpdate, B2BCiudadResponse, B2BCiudadConRelaciones,
    # Razones Sociales
    B2BRazonSocialCreate, B2BRazonSocialUpdate, B2BRazonSocialResponse, B2BRazonSocialConSucursales,
    # Sucursales
    B2BSucursalCreate, B2BSucursalUpdate, B2BSucursalResponse, B2BSucursalConCategorias,
    # Categorías
    B2BCategoriaCreate, B2BCategoriaUpdate, B2BCategoriaResponse, B2BCategoriaConSubcategorias,
    # Subcategorías
    B2BSubcategoriaCreate, B2BSubcategoriaUpdate, B2BSubcategoriaResponse, B2BSubcategoriaConEquipos,
    # Equipos
    B2BEquipoCreate, B2BEquipoUpdate, B2BEquipoResponse,
    # Solicitudes
    B2BSolicitudCreate, B2BSolicitudUpdate, B2BSolicitudResponse
)
from ..services.s3_service import S3Service

router = APIRouter()

# ============================================================================
# ENDPOINTS PARA CIUDADES B2B
# ============================================================================

@router.get("/ciudades", response_model=List[B2BCiudadResponse])
async def get_ciudades_b2b(
    activa: Optional[bool] = None,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Obtener lista de ciudades B2B con filtros opcionales"""
    query = db.query(B2BCiudad)
    
    if activa is not None:
        query = query.filter(B2BCiudad.activa == activa)
    
    ciudades = query.offset(offset).limit(limit).all()
    return ciudades

@router.get("/ciudades/{ciudad_id}", response_model=B2BCiudadConRelaciones)
async def get_ciudad_b2b(ciudad_id: int, db: Session = Depends(get_db)):
    """Obtener ciudad B2B específica con relaciones"""
    ciudad = db.query(B2BCiudad).options(
        selectinload(B2BCiudad.razones_sociales),
        selectinload(B2BCiudad.sucursales)
    ).filter(B2BCiudad.id == ciudad_id).first()
    
    if not ciudad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ciudad B2B no encontrada"
        )
    return ciudad

@router.post("/ciudades", response_model=B2BCiudadResponse, status_code=status.HTTP_201_CREATED)
async def create_ciudad_b2b(ciudad: B2BCiudadCreate, db: Session = Depends(get_db)):
    """Crear nueva ciudad B2B con validación de unicidad previa"""
    
    # Paso 1: Revisar nombre y código en B2B
    # Paso 2: Buscar coincidencias dentro de tabla B2B
    existing_nombre = db.query(B2BCiudad).filter(B2BCiudad.nombre == ciudad.nombre).first()
    if existing_nombre:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una ciudad B2B con el nombre '{ciudad.nombre}'"
        )
    
    existing_codigo = db.query(B2BCiudad).filter(B2BCiudad.codigo == ciudad.codigo).first()
    if existing_codigo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una ciudad B2B con el código '{ciudad.codigo}'"
        )
    
    # Paso 3: Validar unicidad antes de guardar datos
    try:
        db_ciudad = B2BCiudad(**ciudad.model_dump())
        db.add(db_ciudad)
        db.commit()
        db.refresh(db_ciudad)
        
        # Validación post-creación (líneas 1-2)
        print(f"✅ Ciudad B2B creada: '{db_ciudad.nombre}' (código: '{db_ciudad.codigo}') - ID: {db_ciudad.id}")
        return db_ciudad
    except IntegrityError as e:
        db.rollback()
        if "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una ciudad B2B con ese nombre o código"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad en los datos"
        )

@router.put("/ciudades/{ciudad_id}", response_model=B2BCiudadResponse)
async def update_ciudad_b2b(
    ciudad_id: int, 
    ciudad_update: B2BCiudadUpdate, 
    db: Session = Depends(get_db)
):
    """Actualizar ciudad B2B existente con validación de unicidad previa"""
    db_ciudad = db.query(B2BCiudad).filter(B2BCiudad.id == ciudad_id).first()
    if not db_ciudad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ciudad B2B no encontrada"
        )
    
    # Paso 1: Revisar nombre y código en B2B
    # Paso 2: Buscar coincidencias dentro de tabla B2B (excluyendo el registro actual)
    update_data = ciudad_update.model_dump(exclude_unset=True)
    
    if 'nombre' in update_data:
        existing_nombre = db.query(B2BCiudad).filter(
            B2BCiudad.nombre == update_data['nombre'],
            B2BCiudad.id != ciudad_id
        ).first()
        if existing_nombre:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una ciudad B2B con el nombre '{update_data['nombre']}'"
            )
    
    if 'codigo' in update_data:
        existing_codigo = db.query(B2BCiudad).filter(
            B2BCiudad.codigo == update_data['codigo'],
            B2BCiudad.id != ciudad_id
        ).first()
        if existing_codigo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una ciudad B2B con el código '{update_data['codigo']}'"
            )
    
    # Paso 3: Validar unicidad antes de guardar datos
    try:
        for field, value in update_data.items():
            setattr(db_ciudad, field, value)
        
        db_ciudad.fecha_actualizacion = datetime.utcnow()
        db.commit()
        db.refresh(db_ciudad)
        
        # Validación post-actualización (líneas 1-2)
        print(f"✅ Ciudad B2B actualizada: '{db_ciudad.nombre}' (código: '{db_ciudad.codigo}') - ID: {db_ciudad.id}")
        return db_ciudad
    except IntegrityError as e:
        db.rollback()
        if "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una ciudad B2B con ese nombre o código"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad en los datos"
        )

@router.delete("/ciudades/{ciudad_id}")
async def delete_ciudad_b2b(ciudad_id: int, db: Session = Depends(get_db)):
    """Eliminar ciudad B2B (solo si no tiene dependientes)"""
    db_ciudad = db.query(B2BCiudad).filter(B2BCiudad.id == ciudad_id).first()
    if not db_ciudad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ciudad B2B no encontrada"
        )
    
    # Verificar si tiene razones sociales o sucursales dependientes
    razones_count = db.query(B2BRazonSocial).filter(B2BRazonSocial.ciudad_id == ciudad_id).count()
    sucursales_count = db.query(B2BSucursal).filter(B2BSucursal.ciudad_id == ciudad_id).count()
    
    if razones_count > 0 or sucursales_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar la ciudad. Tiene {razones_count} razones sociales y {sucursales_count} sucursales dependientes"
        )
    
    try:
        db.delete(db_ciudad)
        db.commit()
        return {"message": "Ciudad B2B eliminada exitosamente"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad al eliminar la ciudad B2B"
        )

# ============================================================================
# ENDPOINTS PARA RAZONES SOCIALES B2B
# ============================================================================

@router.get("/razones-sociales", response_model=List[B2BRazonSocialResponse])
async def get_razones_sociales_b2b(
    ciudad_id: Optional[int] = None,
    activa: Optional[bool] = None,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Obtener lista de razones sociales B2B con filtros opcionales"""
    query = db.query(B2BRazonSocial).options(selectinload(B2BRazonSocial.ciudad))
    
    if ciudad_id:
        query = query.filter(B2BRazonSocial.ciudad_id == ciudad_id)
    if activa is not None:
        query = query.filter(B2BRazonSocial.activa == activa)
    
    razones = query.offset(offset).limit(limit).all()
    return razones

@router.get("/razones-sociales/{razon_id}", response_model=B2BRazonSocialConSucursales)
async def get_razon_social_b2b(razon_id: int, db: Session = Depends(get_db)):
    """Obtener razón social B2B específica con relaciones"""
    razon = db.query(B2BRazonSocial).options(
        selectinload(B2BRazonSocial.ciudad),
        selectinload(B2BRazonSocial.sucursales)
    ).filter(B2BRazonSocial.id == razon_id).first()
    
    if not razon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Razón social B2B no encontrada"
        )
    return razon

@router.post("/razones-sociales", response_model=B2BRazonSocialResponse, status_code=status.HTTP_201_CREATED)
async def create_razon_social_b2b(razon: B2BRazonSocialCreate, db: Session = Depends(get_db)):
    """Crear nueva razón social B2B"""
    # Verificar que la ciudad existe
    ciudad = db.query(B2BCiudad).filter(B2BCiudad.id == razon.ciudad_id).first()
    if not ciudad:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La ciudad especificada no existe"
        )
    
    try:
        db_razon = B2BRazonSocial(**razon.model_dump())
        db.add(db_razon)
        db.commit()
        db.refresh(db_razon)
        return db_razon
    except IntegrityError as e:
        db.rollback()
        if "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una razón social B2B con ese código"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad en los datos"
        )

@router.put("/razones-sociales/{razon_id}", response_model=B2BRazonSocialResponse)
async def update_razon_social_b2b(
    razon_id: int, 
    razon_update: B2BRazonSocialUpdate, 
    db: Session = Depends(get_db)
):
    """Actualizar razón social B2B existente"""
    db_razon = db.query(B2BRazonSocial).filter(B2BRazonSocial.id == razon_id).first()
    if not db_razon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Razón social B2B no encontrada"
        )
    
    # Verificar ciudad si se está actualizando
    update_data = razon_update.model_dump(exclude_unset=True)
    if "ciudad_id" in update_data:
        ciudad = db.query(B2BCiudad).filter(B2BCiudad.id == update_data["ciudad_id"]).first()
        if not ciudad:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La ciudad especificada no existe"
            )
    
    try:
        for field, value in update_data.items():
            setattr(db_razon, field, value)
        
        db_razon.fecha_actualizacion = datetime.utcnow()
        db.commit()
        db.refresh(db_razon)
        return db_razon
    except IntegrityError as e:
        db.rollback()
        if "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una razón social B2B con ese código"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad en los datos"
        )

@router.delete("/razones-sociales/{razon_id}")
async def delete_razon_social_b2b(razon_id: int, db: Session = Depends(get_db)):
    """Eliminar razón social B2B (solo si no tiene dependientes)"""
    db_razon = db.query(B2BRazonSocial).filter(B2BRazonSocial.id == razon_id).first()
    if not db_razon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Razón social B2B no encontrada"
        )
    
    # Verificar si tiene sucursales dependientes
    sucursales_count = db.query(B2BSucursal).filter(B2BSucursal.razon_social_id == razon_id).count()
    
    if sucursales_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar la razón social. Tiene {sucursales_count} sucursales dependientes"
        )
    
    try:
        db.delete(db_razon)
        db.commit()
        return {"message": "Razón social B2B eliminada exitosamente"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad al eliminar la razón social B2B"
        )

# ============================================================================
# ENDPOINTS PARA SUCURSALES B2B
# ============================================================================

@router.get("/sucursales", response_model=List[B2BSucursalResponse])
async def get_sucursales_b2b(
    ciudad_id: Optional[int] = None,
    razon_social_id: Optional[int] = None,
    activa: Optional[bool] = None,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Obtener lista de sucursales B2B con filtros opcionales"""
    query = db.query(B2BSucursal).options(
        selectinload(B2BSucursal.ciudad),
        selectinload(B2BSucursal.razon_social)
    )
    
    if ciudad_id:
        query = query.filter(B2BSucursal.ciudad_id == ciudad_id)
    if razon_social_id:
        query = query.filter(B2BSucursal.razon_social_id == razon_social_id)
    if activa is not None:
        query = query.filter(B2BSucursal.activa == activa)
    
    sucursales = query.offset(offset).limit(limit).all()
    return sucursales

@router.get("/sucursales/{sucursal_id}", response_model=B2BSucursalConCategorias)
async def get_sucursal_b2b(sucursal_id: int, db: Session = Depends(get_db)):
    """Obtener sucursal B2B específica con relaciones"""
    sucursal = db.query(B2BSucursal).options(
        selectinload(B2BSucursal.ciudad),
        selectinload(B2BSucursal.razon_social),
        selectinload(B2BSucursal.categorias)
    ).filter(B2BSucursal.id == sucursal_id).first()
    
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sucursal B2B no encontrada"
        )
    return sucursal

@router.post("/sucursales", response_model=B2BSucursalResponse, status_code=status.HTTP_201_CREATED)
async def create_sucursal_b2b(sucursal: B2BSucursalCreate, db: Session = Depends(get_db)):
    """Crear nueva sucursal B2B"""
    # Verificar que la ciudad y razón social existen
    ciudad = db.query(B2BCiudad).filter(B2BCiudad.id == sucursal.ciudad_id).first()
    if not ciudad:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La ciudad especificada no existe"
        )
    
    razon_social = db.query(B2BRazonSocial).filter(B2BRazonSocial.id == sucursal.razon_social_id).first()
    if not razon_social:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La razón social especificada no existe"
        )
    
    try:
        db_sucursal = B2BSucursal(**sucursal.model_dump())
        db.add(db_sucursal)
        db.commit()
        db.refresh(db_sucursal)
        return db_sucursal
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad en los datos"
        )

@router.put("/sucursales/{sucursal_id}", response_model=B2BSucursalResponse)
async def update_sucursal_b2b(
    sucursal_id: int, 
    sucursal_update: B2BSucursalUpdate, 
    db: Session = Depends(get_db)
):
    """Actualizar sucursal B2B existente"""
    db_sucursal = db.query(B2BSucursal).filter(B2BSucursal.id == sucursal_id).first()
    if not db_sucursal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sucursal B2B no encontrada"
        )
    
    update_data = sucursal_update.model_dump(exclude_unset=True)
    
    # Verificar ciudad si se está actualizando
    if "ciudad_id" in update_data:
        ciudad = db.query(B2BCiudad).filter(B2BCiudad.id == update_data["ciudad_id"]).first()
        if not ciudad:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La ciudad especificada no existe"
            )
    
    # Verificar razón social si se está actualizando
    if "razon_social_id" in update_data:
        razon_social = db.query(B2BRazonSocial).filter(B2BRazonSocial.id == update_data["razon_social_id"]).first()
        if not razon_social:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La razón social especificada no existe"
            )
    
    try:
        for field, value in update_data.items():
            setattr(db_sucursal, field, value)
        
        db_sucursal.fecha_actualizacion = datetime.utcnow()
        db.commit()
        db.refresh(db_sucursal)
        return db_sucursal
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad en los datos"
        )

@router.delete("/sucursales/{sucursal_id}")
async def delete_sucursal_b2b(sucursal_id: int, db: Session = Depends(get_db)):
    """Eliminar sucursal B2B (solo si no tiene dependientes)"""
    db_sucursal = db.query(B2BSucursal).filter(B2BSucursal.id == sucursal_id).first()
    if not db_sucursal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sucursal B2B no encontrada"
        )
    
    # Verificar si tiene categorías dependientes
    categorias_count = db.query(B2BCategoria).filter(B2BCategoria.sucursal_id == sucursal_id).count()
    
    if categorias_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar la sucursal. Tiene {categorias_count} categorías dependientes"
        )
    
    try:
        db.delete(db_sucursal)
        db.commit()
        return {"message": "Sucursal B2B eliminada exitosamente"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad al eliminar la sucursal B2B"
        )

# ============================================================================
# ENDPOINTS PARA CATEGORÍAS B2B
# ============================================================================

@router.get("/categorias", response_model=List[B2BCategoriaResponse])
async def get_categorias_b2b(
    sucursal_id: Optional[int] = None,
    activa: Optional[bool] = None,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener lista de categorías B2B filtradas por área del usuario"""
    print(f"🔍 [B2B Categorías] Usuario: {current_user.nombre} | Área: {current_user.area} | Rol: {current_user.rol}")
    
    query = db.query(B2BCategoria).options(selectinload(B2BCategoria.sucursal))
    
    # Obtener todas las categorías primero para debug
    todas_categorias = query.all()
    print(f"📊 [B2B Categorías] Total categorías en BD: {len(todas_categorias)}")
    for cat in todas_categorias:
        print(f"   - ID: {cat.id} | Nombre: {cat.nombre} | Código: {cat.codigo}")
    
    # Filtrar por área del usuario - solo admin puede ver todas las categorías
    if current_user.rol != 'admin':
        print(f"🚫 [B2B Categorías] Usuario no es admin, aplicando filtros por área")
        if current_user.area and current_user.area.lower() == 'tic':
            print(f"🔧 [B2B Categorías] Filtrando para área TIC - buscando código 'TIC'")
            query = query.filter(B2BCategoria.codigo.ilike('TIC'))
        elif current_user.area and current_user.area.lower() == 'mantenimiento':
            print(f"🔧 [B2B Categorías] Filtrando para área MANTENIMIENTO - buscando código 'MANTENIMIENTO'")
            query = query.filter(B2BCategoria.codigo.ilike('MANTENIMIENTO'))
        else:
            print(f"❌ [B2B Categorías] Usuario sin área TIC/Mantenimiento válida")
            return []
    else:
        print(f"👑 [B2B Categorías] Usuario admin - mostrando todas las categorías")
    
    if sucursal_id:
        query = query.filter(B2BCategoria.sucursal_id == sucursal_id)
    if activa is not None:
        query = query.filter(B2BCategoria.activa == activa)
    
    categorias = query.offset(offset).limit(limit).all()
    print(f"✅ [B2B Categorías] Categorías finales devueltas: {len(categorias)}")
    for cat in categorias:
        print(f"   - Devolviendo: ID: {cat.id} | Nombre: {cat.nombre} | Código: {cat.codigo}")
    
    return categorias

@router.get("/categorias/debug/all")
async def debug_categorias_b2b(db: Session = Depends(get_db)):
    """DEBUG: Obtener todas las categorías B2B sin filtros para verificar datos"""
    categorias = db.query(B2BCategoria).all()
    return {
        "total": len(categorias),
        "categorias": [
            {
                "id": cat.id,
                "nombre": cat.nombre,
                "codigo": cat.codigo,
                "activa": cat.activa,
                "sucursal_id": cat.sucursal_id
            } for cat in categorias
        ]
    }

@router.get("/categorias/{categoria_id}", response_model=B2BCategoriaConSubcategorias)
async def get_categoria_b2b(categoria_id: int, db: Session = Depends(get_db)):
    """Obtener categoría B2B específica con relaciones"""
    categoria = db.query(B2BCategoria).options(
        selectinload(B2BCategoria.sucursal),
        selectinload(B2BCategoria.subcategorias),
        selectinload(B2BCategoria.equipos)
    ).filter(B2BCategoria.id == categoria_id).first()
    
    if not categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría B2B no encontrada"
        )
    return categoria

@router.post("/categorias", response_model=B2BCategoriaResponse, status_code=status.HTTP_201_CREATED)
async def create_categoria_b2b(categoria: B2BCategoriaCreate, db: Session = Depends(get_db)):
    """Crear nueva categoría B2B"""
    # Verificar que la sucursal existe
    sucursal = db.query(B2BSucursal).filter(B2BSucursal.id == categoria.sucursal_id).first()
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La sucursal especificada no existe"
        )
    
    try:
        db_categoria = B2BCategoria(**categoria.model_dump())
        db.add(db_categoria)
        db.commit()
        db.refresh(db_categoria)
        return db_categoria
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad en los datos"
        )

@router.put("/categorias/{categoria_id}", response_model=B2BCategoriaResponse)
async def update_categoria_b2b(
    categoria_id: int, 
    categoria_update: B2BCategoriaUpdate, 
    db: Session = Depends(get_db)
):
    """Actualizar categoría B2B existente"""
    db_categoria = db.query(B2BCategoria).filter(B2BCategoria.id == categoria_id).first()
    if not db_categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría B2B no encontrada"
        )
    
    update_data = categoria_update.model_dump(exclude_unset=True)
    
    # Verificar sucursal si se está actualizando
    if "sucursal_id" in update_data:
        sucursal = db.query(B2BSucursal).filter(B2BSucursal.id == update_data["sucursal_id"]).first()
        if not sucursal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La sucursal especificada no existe"
            )
    
    try:
        for field, value in update_data.items():
            setattr(db_categoria, field, value)
        
        db_categoria.fecha_actualizacion = datetime.utcnow()
        db.commit()
        db.refresh(db_categoria)
        return db_categoria
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad en los datos"
        )

@router.delete("/categorias/{categoria_id}")
async def delete_categoria_b2b(categoria_id: int, db: Session = Depends(get_db)):
    """Eliminar categoría B2B (solo si no tiene dependientes)"""
    db_categoria = db.query(B2BCategoria).filter(B2BCategoria.id == categoria_id).first()
    if not db_categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría B2B no encontrada"
        )
    
    # Verificar si tiene subcategorías o equipos dependientes
    subcategorias_count = db.query(B2BSubcategoria).filter(B2BSubcategoria.categoria_id == categoria_id).count()
    equipos_count = db.query(B2BEquipo).filter(B2BEquipo.categoria_id == categoria_id).count()
    
    if subcategorias_count > 0 or equipos_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar la categoría. Tiene {subcategorias_count} subcategorías y {equipos_count} equipos dependientes"
        )
    
    try:
        db.delete(db_categoria)
        db.commit()
        return {"message": "Categoría B2B eliminada exitosamente"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad al eliminar la categoría B2B"
        )

# ============================================================================
# ENDPOINTS PARA SUBCATEGORÍAS B2B
# ============================================================================

@router.get("/subcategorias", response_model=List[B2BSubcategoriaResponse])
async def get_subcategorias_b2b(
    categoria_id: Optional[int] = None,
    sucursal_id: Optional[int] = None,
    activa: Optional[bool] = None,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener lista de subcategorías B2B filtradas por área del usuario"""
    query = db.query(B2BSubcategoria).options(
        selectinload(B2BSubcategoria.categoria),
        selectinload(B2BSubcategoria.sucursal)
    )
    
    # Filtrar por área del usuario a través de la categoría asociada - solo admin puede ver todas
    if current_user.rol != 'admin':
        if current_user.area and current_user.area.lower() == 'tic':
            query = query.join(B2BCategoria).filter(B2BCategoria.codigo.ilike('TIC'))
        elif current_user.area and current_user.area.lower() == 'mantenimiento':
            query = query.join(B2BCategoria).filter(B2BCategoria.codigo.ilike('MANTENIMIENTO'))
        else:
            # Si el usuario no tiene área TIC o Mantenimiento, no mostrar subcategorías
            return []
    
    if categoria_id:
        query = query.filter(B2BSubcategoria.categoria_id == categoria_id)
    if sucursal_id:
        query = query.filter(B2BSubcategoria.sucursal_id == sucursal_id)
    if activa is not None:
        query = query.filter(B2BSubcategoria.activa == activa)
    
    subcategorias = query.offset(offset).limit(limit).all()
    return subcategorias

@router.get("/subcategorias/{subcategoria_id}", response_model=B2BSubcategoriaConEquipos)
async def get_subcategoria_b2b(subcategoria_id: int, db: Session = Depends(get_db)):
    """Obtener subcategoría B2B específica con relaciones"""
    subcategoria = db.query(B2BSubcategoria).options(
        selectinload(B2BSubcategoria.categoria),
        selectinload(B2BSubcategoria.equipos)
    ).filter(B2BSubcategoria.id == subcategoria_id).first()
    
    if not subcategoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategoría B2B no encontrada"
        )
    return subcategoria

@router.post("/subcategorias", response_model=B2BSubcategoriaResponse, status_code=status.HTTP_201_CREATED)
async def create_subcategoria_b2b(subcategoria: B2BSubcategoriaCreate, db: Session = Depends(get_db)):
    """Crear nueva subcategoría B2B"""
    # Verificar que la categoría y sucursal existen
    categoria = db.query(B2BCategoria).filter(B2BCategoria.id == subcategoria.categoria_id).first()
    if not categoria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La categoría especificada no existe"
        )
    
    sucursal = db.query(B2BSucursal).filter(B2BSucursal.id == subcategoria.sucursal_id).first()
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La sucursal especificada no existe"
        )
    
    try:
        db_subcategoria = B2BSubcategoria(**subcategoria.model_dump())
        db.add(db_subcategoria)
        db.commit()
        db.refresh(db_subcategoria)
        return db_subcategoria
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad en los datos"
        )

@router.put("/subcategorias/{subcategoria_id}", response_model=B2BSubcategoriaResponse)
async def update_subcategoria_b2b(
    subcategoria_id: int, 
    subcategoria_update: B2BSubcategoriaUpdate, 
    db: Session = Depends(get_db)
):
    """Actualizar subcategoría B2B existente"""
    db_subcategoria = db.query(B2BSubcategoria).filter(B2BSubcategoria.id == subcategoria_id).first()
    if not db_subcategoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategoría B2B no encontrada"
        )
    
    update_data = subcategoria_update.model_dump(exclude_unset=True)
    
    # Verificar categoría si se está actualizando
    if "categoria_id" in update_data:
        categoria = db.query(B2BCategoria).filter(B2BCategoria.id == update_data["categoria_id"]).first()
        if not categoria:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La categoría especificada no existe"
            )
    
    # Verificar sucursal si se está actualizando
    if "sucursal_id" in update_data:
        sucursal = db.query(B2BSucursal).filter(B2BSucursal.id == update_data["sucursal_id"]).first()
        if not sucursal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La sucursal especificada no existe"
            )
    
    try:
        for field, value in update_data.items():
            setattr(db_subcategoria, field, value)
        
        db_subcategoria.fecha_actualizacion = datetime.utcnow()
        db.commit()
        db.refresh(db_subcategoria)
        return db_subcategoria
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad en los datos"
        )

@router.delete("/subcategorias/{subcategoria_id}")
async def delete_subcategoria_b2b(subcategoria_id: int, db: Session = Depends(get_db)):
    """Eliminar subcategoría B2B (solo si no tiene dependientes)"""
    db_subcategoria = db.query(B2BSubcategoria).filter(B2BSubcategoria.id == subcategoria_id).first()
    if not db_subcategoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategoría B2B no encontrada"
        )
    
    # Verificar si tiene equipos dependientes
    equipos_count = db.query(B2BEquipo).filter(B2BEquipo.subcategoria_id == subcategoria_id).count()
    
    if equipos_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar la subcategoría. Tiene {equipos_count} equipos dependientes"
        )
    
    try:
        db.delete(db_subcategoria)
        db.commit()
        return {"message": "Subcategoría B2B eliminada exitosamente"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad al eliminar la subcategoría B2B"
        )

# ============================================================================
# ENDPOINTS PARA EQUIPOS B2B
# ============================================================================

@router.get("/equipos", response_model=List[B2BEquipoResponse])
async def get_equipos_b2b(
    categoria_id: Optional[int] = None,
    subcategoria_id: Optional[int] = None,
    sucursal_id: Optional[int] = None,
    activo: Optional[bool] = None,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener lista de equipos B2B filtrados por área del usuario"""
    query = db.query(B2BEquipo).options(
        selectinload(B2BEquipo.categoria),
        selectinload(B2BEquipo.subcategoria)
    )
    
    # Filtrar por área del usuario a través de la categoría asociada - solo admin puede ver todos
    if current_user.rol != 'admin':
        if current_user.area and current_user.area.lower() == 'tic':
            query = query.join(B2BCategoria).filter(B2BCategoria.codigo.ilike('TIC'))
        elif current_user.area and current_user.area.lower() == 'mantenimiento':
            query = query.join(B2BCategoria).filter(B2BCategoria.codigo.ilike('MANTENIMIENTO'))
        else:
            # Si el usuario no tiene área TIC o Mantenimiento, no mostrar equipos
            return []
    
    if categoria_id:
        query = query.filter(B2BEquipo.categoria_id == categoria_id)
    if subcategoria_id:
        query = query.filter(B2BEquipo.subcategoria_id == subcategoria_id)
    if sucursal_id:
        query = query.filter(B2BEquipo.sucursal_id == sucursal_id)
    if activo is not None:
        query = query.filter(B2BEquipo.activo == activo)
    
    equipos = query.offset(offset).limit(limit).all()
    return equipos

@router.get("/equipos/{equipo_id}", response_model=B2BEquipoResponse)
async def get_equipo_b2b(equipo_id: int, db: Session = Depends(get_db)):
    """Obtener equipo B2B específico con relaciones"""
    equipo = db.query(B2BEquipo).options(
        selectinload(B2BEquipo.categoria),
        selectinload(B2BEquipo.subcategoria)
    ).filter(B2BEquipo.id == equipo_id).first()
    
    if not equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo B2B no encontrado"
        )
    return equipo

@router.post("/equipos", response_model=B2BEquipoResponse, status_code=status.HTTP_201_CREATED)
async def create_equipo_b2b(equipo: B2BEquipoCreate, db: Session = Depends(get_db)):
    """Crear nuevo equipo B2B"""
    # Verificar que la categoría, subcategoría y sucursal existen
    categoria = db.query(B2BCategoria).filter(B2BCategoria.id == equipo.categoria_id).first()
    if not categoria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La categoría especificada no existe"
        )
    
    subcategoria = db.query(B2BSubcategoria).filter(B2BSubcategoria.id == equipo.subcategoria_id).first()
    if not subcategoria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La subcategoría especificada no existe"
        )
    
    sucursal = db.query(B2BSucursal).filter(B2BSucursal.id == equipo.sucursal_id).first()
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La sucursal especificada no existe"
        )
    
    try:
        db_equipo = B2BEquipo(**equipo.model_dump())
        db.add(db_equipo)
        db.commit()
        db.refresh(db_equipo)
        return db_equipo
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad en los datos"
        )

@router.put("/equipos/{equipo_id}", response_model=B2BEquipoResponse)
async def update_equipo_b2b(
    equipo_id: int, 
    equipo_update: B2BEquipoUpdate, 
    db: Session = Depends(get_db)
):
    """Actualizar equipo B2B existente"""
    db_equipo = db.query(B2BEquipo).filter(B2BEquipo.id == equipo_id).first()
    if not db_equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo B2B no encontrado"
        )
    
    update_data = equipo_update.model_dump(exclude_unset=True)
    
    # Verificar relaciones si se están actualizando
    if "categoria_id" in update_data:
        categoria = db.query(B2BCategoria).filter(B2BCategoria.id == update_data["categoria_id"]).first()
        if not categoria:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La categoría especificada no existe"
            )
    
    if "subcategoria_id" in update_data:
        subcategoria = db.query(B2BSubcategoria).filter(B2BSubcategoria.id == update_data["subcategoria_id"]).first()
        if not subcategoria:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La subcategoría especificada no existe"
            )
    
    if "sucursal_id" in update_data:
        sucursal = db.query(B2BSucursal).filter(B2BSucursal.id == update_data["sucursal_id"]).first()
        if not sucursal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La sucursal especificada no existe"
            )
    
    try:
        for field, value in update_data.items():
            setattr(db_equipo, field, value)
        
        db_equipo.fecha_actualizacion = datetime.utcnow()
        db.commit()
        db.refresh(db_equipo)
        return db_equipo
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad en los datos"
        )

@router.delete("/equipos/{equipo_id}")
async def delete_equipo_b2b(equipo_id: int, db: Session = Depends(get_db)):
    """Eliminar equipo B2B"""
    db_equipo = db.query(B2BEquipo).filter(B2BEquipo.id == equipo_id).first()
    if not db_equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo B2B no encontrado"
        )
    
    try:
        db.delete(db_equipo)
        db.commit()
        return {"message": "Equipo B2B eliminado exitosamente"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad al eliminar el equipo B2B"
        )

# ============================================================================
# ENDPOINTS PARA SOLICITUDES B2B
# ============================================================================

@router.get("/solicitudes")
async def get_solicitudes_b2b(
    estado: Optional[str] = None,
    ciudad_id: Optional[int] = None,
    razon_social_id: Optional[int] = None,
    limit: int = Query(50, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener lista de solicitudes B2B filtradas por área del usuario
    - Usuarios del área TIC: Solo ven solicitudes asignadas a TIC  
    - Usuarios del área Mantenimiento: Solo ven solicitudes asignadas a Mantenimiento
    - Administradores: Ven todas las solicitudes
    """
    try:
        print(f"🔍 Usuario {current_user.nombre} ({current_user.area}) solicitando solicitudes B2B")
        
        # Query base con relaciones
        query = db.query(B2BSolicitud).options(
            selectinload(B2BSolicitud.ciudad),
            selectinload(B2BSolicitud.razon_social),
            selectinload(B2BSolicitud.sucursal),
            selectinload(B2BSolicitud.categoria),
            selectinload(B2BSolicitud.subcategoria),
            selectinload(B2BSolicitud.equipo)
        )
        
        # 🎯 FILTRADO POR ÁREA DEL USUARIO - Basado en CATEGORÍA de la solicitud
        if current_user.area and current_user.area.upper() == "TIC":
            # Usuario del área TIC: Solo solicitudes con categorías TIC
            print(f"🔧 [B2B Solicitudes] Filtrando para área TIC - Usuario: {current_user.nombre}")
            query = query.join(B2BCategoria, B2BSolicitud.categoria_id == B2BCategoria.id)\
                         .filter(B2BCategoria.codigo.ilike('TIC'))
                         
        elif current_user.area and current_user.area.upper() == "MANTENIMIENTO":
            # Usuario del área Mantenimiento: Solo solicitudes con categorías MANTENIMIENTO  
            print(f"🔨 [B2B Solicitudes] Filtrando para área MANTENIMIENTO - Usuario: {current_user.nombre}")
            query = query.join(B2BCategoria, B2BSolicitud.categoria_id == B2BCategoria.id)\
                         .filter(B2BCategoria.codigo.ilike('MANTENIMIENTO'))
        else:
            # Super Admin (área no es TIC ni MANTENIMIENTO): Ver todas las solicitudes
            print(f"👑 [B2B Solicitudes] Super Admin - Usuario: {current_user.nombre} (área: {current_user.area}) - Mostrando todas las solicitudes")
        
        # Aplicar filtros adicionales
        if estado:
            query = query.filter(B2BSolicitud.estado == estado)
        if ciudad_id:
            query = query.filter(B2BSolicitud.ciudad_id == ciudad_id)
        if razon_social_id:
            query = query.filter(B2BSolicitud.razon_social_id == razon_social_id)
        
        # Obtener resultados ordenados
        solicitudes = query.order_by(B2BSolicitud.fecha_creacion.desc()).offset(offset).limit(limit).all()
        total = query.count()
        
        print(f"✅ Usuario {current_user.nombre} ({current_user.area}) - Devolviendo {len(solicitudes)} solicitudes B2B de {total} totales")
        
        return {
            "success": True,
            "data": solicitudes,
            "total": total,
            "showing_all": limit == 50 and total <= 50,
            "filtered_by_area": current_user.area if current_user.rol != 'admin' else None
        }
        
    except Exception as e:
        print(f"❌ Error al obtener solicitudes B2B: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error interno del servidor al obtener solicitudes B2B"
        )

@router.get("/solicitudes/{solicitud_id}", response_model=B2BSolicitudResponse)
async def get_solicitud_b2b(solicitud_id: int, db: Session = Depends(get_db)):
    """Obtener solicitud B2B específica con todas las relaciones"""
    solicitud = db.query(B2BSolicitud).options(
        selectinload(B2BSolicitud.ciudad),
        selectinload(B2BSolicitud.razon_social),
        selectinload(B2BSolicitud.sucursal),
        selectinload(B2BSolicitud.categoria),
        selectinload(B2BSolicitud.subcategoria),
        selectinload(B2BSolicitud.equipo),
        selectinload(B2BSolicitud.asignado)
    ).filter(B2BSolicitud.id == solicitud_id).first()
    
    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud B2B no encontrada"
        )
    return solicitud

@router.post("/solicitudes", response_model=B2BSolicitudResponse, status_code=status.HTTP_201_CREATED)
async def create_solicitud_b2b(
    nombre: str,
    correo: str,
    telefono: Optional[str] = None,
    asunto: str = "",
    descripcion: str = "",
    ciudad: str = "",
    razonSocial: str = "",
    sucursal: str = "",
    categoria: str = "",
    subcategoria: str = "",
    equipo: str = "",
    archivo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Crear nueva solicitud B2B con validaciones completas"""
    
    # Validar que todas las entidades existan
    ciudad_obj = db.query(B2BCiudad).filter(B2BCiudad.id == int(ciudad)).first() if ciudad else None
    razon_social_obj = db.query(B2BRazonSocial).filter(B2BRazonSocial.id == int(razonSocial)).first() if razonSocial else None
    sucursal_obj = db.query(B2BSucursal).filter(B2BSucursal.id == int(sucursal)).first() if sucursal else None
    categoria_obj = db.query(B2BCategoria).filter(B2BCategoria.id == int(categoria)).first() if categoria else None
    subcategoria_obj = db.query(B2BSubcategoria).filter(B2BSubcategoria.id == int(subcategoria)).first() if subcategoria else None
    equipo_obj = db.query(B2BEquipo).filter(B2BEquipo.id == int(equipo)).first() if equipo else None
    
    # Validaciones de existencia
    if not ciudad_obj:
        raise HTTPException(status_code=400, detail="Ciudad B2B no encontrada")
    if not razon_social_obj:
        raise HTTPException(status_code=400, detail="Razón social B2B no encontrada")
    if not sucursal_obj:
        raise HTTPException(status_code=400, detail="Sucursal B2B no encontrada")
    if not categoria_obj:
        raise HTTPException(status_code=400, detail="Categoría B2B no encontrada")
    if not subcategoria_obj:
        raise HTTPException(status_code=400, detail="Subcategoría B2B no encontrada")
    if not equipo_obj:
        raise HTTPException(status_code=400, detail="Equipo B2B no encontrado")
    
    # Obtener el siguiente ID consecutivo global
    siguiente_id = obtener_siguiente_id_solicitud(db)
    print(f"📊 Generando solicitud B2B con ID consecutivo global: {siguiente_id}")
    
    # Generar folio usando la función utilitaria
    folio = generar_folio_por_tipo("B2B", siguiente_id)
    
    # Procesar archivo si existe
    archivo_nombre = None
    archivo_url = None
    archivo_s3_key = None
    
    if archivo and archivo.size > 0:
        # Validar tipo de archivo
        allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
        if archivo.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Tipo de archivo no permitido. Solo se permiten PDF, JPG y PNG"
            )
        
        # Validar tamaño (10MB máximo)
        if archivo.size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="El archivo es demasiado grande. Máximo 10MB"
            )
        
        try:
            # Generar nombre único para el archivo
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            extension = archivo.filename.split('.')[-1] if '.' in archivo.filename else 'bin'
            s3_key = f"b2b_{timestamp}_{archivo.filename.replace(' ', '_')}"
            
            # Subir a S3
            s3_service = S3Service()
            upload_result = await s3_service.upload_file_async(archivo, folder='b2b', prefix=timestamp)
            
            if upload_result.get('success'):
                archivo_nombre = archivo.filename
                archivo_url = upload_result.get('url')
                archivo_s3_key = upload_result.get('key')
        except Exception as e:
            print(f"Error uploading file to S3: {e}")
            # Continuar sin archivo si falla la subida
            pass
    
    try:
        # Crear solicitud B2B con ID consecutivo global
        solicitud_data = B2BSolicitud(
            id=siguiente_id,  # Usar ID consecutivo global
            folio=folio,
            nombre=nombre,
            correo=correo,
            telefono=telefono,
            asunto=asunto,
            descripcion=descripcion,
            archivo_nombre=archivo_nombre,
            archivo_url=archivo_url,
            archivo_s3_key=archivo_s3_key,
            ciudad_id=int(ciudad),
            razon_social_id=int(razonSocial),
            sucursal_id=int(sucursal),
            categoria_id=int(categoria),
            subcategoria_id=int(subcategoria),
            equipo_id=int(equipo)
        )
        
        db.add(solicitud_data)
        db.commit()
        db.refresh(solicitud_data)
        
        # 🚀 ASIGNACIÓN AUTOMÁTICA POR CATEGORÍA B2B
        from ..services.asignacion_service import obtener_administrador_por_area
        
        try:
            # Obtener código de la categoría B2B para determinar el área
            if categoria_obj and categoria_obj.codigo:
                codigo_upper = categoria_obj.codigo.upper()
                
                if codigo_upper == "TIC":
                    area_objetivo = "TIC"
                    print(f"🔄 Categoría B2B '{categoria_obj.nombre}' (código: '{categoria_obj.codigo}') -> Asignando a área TIC")
                elif codigo_upper == "MANTENIMIENTO":
                    # B2B siempre es Mantenimiento (tiendas/comercial, no Planta)
                    area_objetivo = "Mantenimiento"
                    print(f"🔄 Categoría B2B '{categoria_obj.nombre}' (código: '{categoria_obj.codigo}') -> Asignando a área Mantenimiento")
                else:
                    # Fallback para B2B: siempre Mantenimiento
                    area_objetivo = "Mantenimiento"
                    print(f"🔄 Categoría B2B '{categoria_obj.nombre}' (código: '{categoria_obj.codigo}') -> Código no reconocido, asignando a área Mantenimiento (fallback)")
            else:
                # Fallback para B2B sin código: siempre Mantenimiento
                area_objetivo = "Mantenimiento"
                print(f"🔄 Categoría B2B sin código específico -> Asignando a área Mantenimiento (fallback)")
            
            # Buscar administrador del área objetivo
            administrador_asignado = obtener_administrador_por_area(area_objetivo, db)
            if administrador_asignado:
                solicitud_data.asignado_a = administrador_asignado.id
                db.commit()
                print(f"✅ Solicitud B2B {solicitud_data.folio} asignada automáticamente a {administrador_asignado.nombre} (Área: {administrador_asignado.area})")
            else:
                print(f"⚠️ No se pudo asignar automáticamente la solicitud B2B {solicitud_data.folio}")
        except Exception as asign_error:
            print(f"❌ Error en asignación automática B2B: {asign_error}")
            # No fallar toda la operación por un error de asignación
        
        return solicitud_data
    except Exception as e:
        db.rollback()
        print(f"Error creating B2B solicitud: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error interno del servidor al crear la solicitud"
        )

@router.put("/solicitudes/{solicitud_id}", response_model=B2BSolicitudResponse)
async def update_solicitud_b2b(
    solicitud_id: int,
    solicitud_update: B2BSolicitudUpdate,
    db: Session = Depends(get_db)
):
    """Actualizar solicitud B2B existente"""
    db_solicitud = db.query(B2BSolicitud).filter(B2BSolicitud.id == solicitud_id).first()
    if not db_solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud B2B no encontrada"
        )
    
    try:
        update_data = solicitud_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_solicitud, field, value)
        
        db_solicitud.fecha_actualizacion = datetime.utcnow()
        db.commit()
        db.refresh(db_solicitud)
        return db_solicitud
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad en los datos"
        )

@router.put("/solicitudes/{solicitud_id}/cancelar", response_model=B2BSolicitudResponse)
async def cancelar_solicitud_b2b(
    solicitud_id: int,
    cancel_data: dict,
    db: Session = Depends(get_db)
):
    """
    Cancela una solicitud B2B específica y guarda el motivo de cancelación
    """
    try:
        motivo_cancelacion = cancel_data.get('motivo_cancelacion', '').strip() if cancel_data.get('motivo_cancelacion') else ""
        if not motivo_cancelacion:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='El motivo de cancelación es obligatorio'
            )

        solicitud = db.query(B2BSolicitud).filter(B2BSolicitud.id == solicitud_id).first()
        
        if not solicitud:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f'No se encontró la solicitud B2B con ID {solicitud_id}'
            )

        if solicitud.estado == 'cancelada':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='La solicitud ya está cancelada'
            )
        
        if solicitud.estado == 'completada':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='No se puede cancelar una solicitud completada'
            )

        solicitud.estado = 'cancelada'
        solicitud.motivo_cancelacion = motivo_cancelacion
        solicitud.fecha_actualizacion = datetime.utcnow()

        db.commit()
        db.refresh(solicitud)

        return solicitud
        
    except HTTPException:
        raise
    except Exception as e:
        # Rollback en caso de cualquier error
        db.rollback()
        print(f'❌ Error al cancelar solicitud B2B {solicitud_id}: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

# ============================================================================
# ENDPOINTS PÚBLICOS PARA FORMULARIO B2B (SIN AUTENTICACIÓN)
# ============================================================================

@router.get("/public/ciudades", response_model=List[B2BCiudadResponse])
async def get_ciudades_b2b_public(db: Session = Depends(get_db)):
    """Obtener ciudades B2B para formulario público"""
    ciudades = db.query(B2BCiudad).filter(B2BCiudad.activa == True).all()
    return ciudades

@router.get("/public/razones-sociales", response_model=List[B2BRazonSocialResponse])
async def get_razones_sociales_b2b_public(
    ciudad_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Obtener razones sociales B2B para formulario público, opcionalmente filtradas por ciudad"""
    query = db.query(B2BRazonSocial).options(selectinload(B2BRazonSocial.ciudad)).filter(B2BRazonSocial.activa == True)
    
    if ciudad_id:
        query = query.filter(B2BRazonSocial.ciudad_id == ciudad_id)
        print(f"[B2B Publico] Filtrando razones sociales por ciudad_id: {ciudad_id}")
    
    razones = query.all()
    print(f"[B2B Publico] Razones sociales encontradas: {len(razones)} {'(filtradas por ciudad ' + str(ciudad_id) + ')' if ciudad_id else ''}")
    return razones

@router.get("/public/sucursales", response_model=List[B2BSucursalResponse])
async def get_sucursales_b2b_public(
    ciudad_id: Optional[int] = None,
    razon_social_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Obtener sucursales B2B para formulario público, opcionalmente filtradas por ciudad"""
    query = db.query(B2BSucursal).options(
        selectinload(B2BSucursal.ciudad),
        selectinload(B2BSucursal.razon_social)
    ).filter(B2BSucursal.activa == True)
    
    if ciudad_id:
        query = query.filter(B2BSucursal.ciudad_id == ciudad_id)
        print(f"[B2B Publico] Filtrando sucursales por ciudad_id: {ciudad_id}")
    
    if razon_social_id:
        query = query.filter(B2BSucursal.razon_social_id == razon_social_id)
        print(f"[B2B Publico] Filtrando sucursales por razon_social_id: {razon_social_id}")
    
    sucursales = query.all()
    print(f"[B2B Publico] Sucursales encontradas: {len(sucursales)} (ciudad_id: {ciudad_id}, razon_social_id: {razon_social_id})")
    return sucursales

@router.get("/public/categorias", response_model=List[B2BCategoriaResponse])
async def get_categorias_b2b_public(
    sucursal_id: Optional[int] = None,
    ciudad_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Obtener categorías B2B para formulario público, filtradas por sucursal o ciudad"""
    query = db.query(B2BCategoria).options(selectinload(B2BCategoria.sucursal)).filter(B2BCategoria.activa == True)
    
    # PRIORIDAD 1: Filtrar por sucursal especifica (mas restrictivo)
    if sucursal_id:
        query = query.filter(B2BCategoria.sucursal_id == sucursal_id)
        print(f"[B2B Publico] Filtrando categorias por sucursal_id: {sucursal_id}")
    # PRIORIDAD 2: Filtrar por ciudad (menos restrictivo)
    elif ciudad_id:
        query = query.join(B2BSucursal).filter(B2BSucursal.ciudad_id == ciudad_id)
        print(f"[B2B Publico] Filtrando categorias por ciudad_id: {ciudad_id}")
    
    categorias = query.all()
    print(f"[B2B Publico] Categorias encontradas: {len(categorias)} (sucursal_id: {sucursal_id}, ciudad_id: {ciudad_id})")
    for cat in categorias:
        print(f"  ID: {cat.id}, Nombre: {cat.nombre}, Sucursal: {cat.sucursal_id}")
    return categorias

@router.get("/public/subcategorias", response_model=List[B2BSubcategoriaResponse])
async def get_subcategorias_b2b_public(
    sucursal_id: Optional[int] = None,
    categoria_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Obtener subcategorías B2B para formulario público, filtradas por sucursal y categoría"""
    query = db.query(B2BSubcategoria).options(
        selectinload(B2BSubcategoria.categoria),
        selectinload(B2BSubcategoria.sucursal)
    ).filter(B2BSubcategoria.activa == True)
    
    if sucursal_id:
        query = query.filter(B2BSubcategoria.sucursal_id == sucursal_id)
        print(f"[B2B Publico] Filtrando subcategorias por sucursal_id: {sucursal_id}")
    
    if categoria_id:
        query = query.filter(B2BSubcategoria.categoria_id == categoria_id)
    
    subcategorias = query.all()
    print(f"[B2B Publico] Subcategorias encontradas: {len(subcategorias)} (sucursal_id: {sucursal_id}, categoria_id: {categoria_id})")
    return subcategorias

@router.get("/public/equipos", response_model=List[B2BEquipoResponse])
async def get_equipos_b2b_public(
    sucursal_id: Optional[int] = None,
    ciudad_id: Optional[int] = None,
    categoria_id: Optional[int] = None,
    subcategoria_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Obtener equipos B2B para formulario público, filtrados por sucursal, ciudad, categoría y subcategoría"""
    query = db.query(B2BEquipo).options(
        selectinload(B2BEquipo.categoria),
        selectinload(B2BEquipo.subcategoria),
        selectinload(B2BEquipo.sucursal)
    ).filter(B2BEquipo.activo == True)
    
    # PRIORIDAD 1: Filtrar por sucursal especifica (mas restrictivo)
    if sucursal_id:
        query = query.filter(B2BEquipo.sucursal_id == sucursal_id)
        print(f"[B2B Publico] Filtrando equipos por sucursal_id: {sucursal_id}")
    # PRIORIDAD 2: Filtrar por ciudad (menos restrictivo)
    elif ciudad_id:
        query = query.join(B2BSucursal).filter(B2BSucursal.ciudad_id == ciudad_id)
        print(f"[B2B Publico] Filtrando equipos por ciudad_id: {ciudad_id}")
    
    if categoria_id:
        query = query.filter(B2BEquipo.categoria_id == categoria_id)
    if subcategoria_id:
        query = query.filter(B2BEquipo.subcategoria_id == subcategoria_id)
    
    equipos = query.all()
    print(f"[B2B Publico] Equipos encontrados: {len(equipos)} (sucursal_id: {sucursal_id}, ciudad_id: {ciudad_id}, categoria_id: {categoria_id}, subcategoria_id: {subcategoria_id})")
    return equipos

# ============================================================================
# ENDPOINT PARA OTS COMERCIALES B2B
# ============================================================================

@router.get("/ots")
async def get_ots_comerciales_b2b(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener OTs generadas a partir de solicitudes B2B (comerciales)
    Filtradas por área del usuario para mostrar solo las OTs relevantes
    """
    try:
        print(f"🏢 [OTs Comerciales] Usuario: {current_user.nombre} | Área: {current_user.area}")
        
        # Importar modelos necesarios dentro de la función para evitar imports circulares
        from ..models import OTSolicitud, B2BSolicitud, B2BCategoria
        
        # Query base: OTs que provienen de solicitudes B2B
        query = db.query(OTSolicitud).options(
            selectinload(OTSolicitud.solicitud_b2b)
        ).filter(OTSolicitud.tipo_solicitud == 'B2B')
        
        # Filtrar por área del usuario
        print(f"🔍 [OTs Comerciales] Usuario: {current_user.nombre} | Rol: {current_user.rol} | Área: {current_user.area}")
        
        # CAMBIO: Los usuarios administrativos de área también deben ser filtrados por su área
        # Solo los super-admins sin área específica ven todas las OTs
        if current_user.area:
            area_filtro = current_user.area.upper()
            print(f"🔍 [OTs Comerciales] Aplicando filtro por área: {area_filtro}")
            
            # Join con solicitud B2B y categoría para filtrar por área
            query = query.join(B2BSolicitud, OTSolicitud.solicitud_id == B2BSolicitud.id)\
                         .join(B2BCategoria, B2BSolicitud.categoria_id == B2BCategoria.id)
            
            if area_filtro == 'TIC':
                query = query.filter(B2BCategoria.codigo.ilike('TIC'))
                print(f"🔍 [OTs Comerciales] Filtrando solo categorías TIC")
            elif area_filtro == 'MANTENIMIENTO':
                query = query.filter(B2BCategoria.codigo.ilike('MANTENIMIENTO'))
                print(f"🔍 [OTs Comerciales] Filtrando solo categorías MANTENIMIENTO")
            else:
                # Área no reconocida, no mostrar OTs
                print(f"⚠️ [OTs Comerciales] Área no reconocida: {current_user.area}")
                return {"success": True, "data": [], "total": 0}
        else:
            print(f"👑 [OTs Comerciales] Super-admin sin área específica - Mostrando todas las OTs B2B")
        
        # Contar total
        total = query.count()
        
        # Aplicar paginación
        offset = (page - 1) * per_page
        ots = query.order_by(OTSolicitud.fecha_creacion.desc()).offset(offset).limit(per_page).all()
        
        # Formatear respuesta
        ots_formateadas = []
        for ot in ots:
            # Cargar datos de la solicitud B2B manualmente si es necesario
            solicitud_b2b = db.query(B2BSolicitud).options(
                selectinload(B2BSolicitud.ciudad),
                selectinload(B2BSolicitud.razon_social),
                selectinload(B2BSolicitud.sucursal),
                selectinload(B2BSolicitud.categoria),
                selectinload(B2BSolicitud.subcategoria),
                selectinload(B2BSolicitud.equipo)
            ).filter(B2BSolicitud.id == ot.solicitud_id).first()
            
            ot_data = {
                "id": ot.id,
                "folio": ot.folio,
                "solicitud_id": ot.solicitud_id,
                "tipo_solicitud": ot.tipo_solicitud,
                "fecha_creacion": ot.fecha_creacion,
                "fecha_visita": ot.fecha_visita,
                "fecha_completada": ot.fecha_completada,
                "asunto": ot.asunto,
                "categoria": ot.categoria,
                "subcategoria": ot.subcategoria,
                "zona": ot.zona,
                "ciudad": ot.ciudad,
                "tienda": ot.tienda,
                "tecnico_asignado": ot.tecnico_asignado,
                "etapa": ot.etapa,
                "estado": ot.etapa,  # Alias para compatibilidad
                "prioridad": ot.prioridad,
                "tipo_mantenimiento": ot.tipo_mantenimiento,
                "notas": ot.notas,
                "notas_adicionales": ot.notas,  # Alias para compatibilidad
                "tiempo_estimado": ot.tiempo_estimado,
            }
            
            # Agregar datos específicos de B2B si la solicitud existe
            if solicitud_b2b:
                ot_data.update({
                    "razon_social": {"nombre": solicitud_b2b.razon_social.nombre} if solicitud_b2b.razon_social else None,
                    "sucursal": {"nombre": solicitud_b2b.sucursal.nombre} if solicitud_b2b.sucursal else None,
                    "equipo": {"nombre": solicitud_b2b.equipo.nombre} if solicitud_b2b.equipo else None,
                    "categoria": {"nombre": solicitud_b2b.categoria.nombre} if solicitud_b2b.categoria else None,
                    "subcategoria": {"nombre": solicitud_b2b.subcategoria.nombre} if solicitud_b2b.subcategoria else None,
                    "ciudad": {"nombre": solicitud_b2b.ciudad.nombre} if solicitud_b2b.ciudad else None,
                    "descripcion": solicitud_b2b.descripcion
                })
                
                # Log de debug para mostrar las categorías que se están devolviendo
                categoria_nombre = solicitud_b2b.categoria.nombre if solicitud_b2b.categoria else "Sin categoría"
                categoria_codigo = solicitud_b2b.categoria.codigo if solicitud_b2b.categoria else "Sin código"
                print(f"📋 [OT {ot.folio}] Categoría: {categoria_nombre} | Código: {categoria_codigo}")
            
            ots_formateadas.append(ot_data)
        
        print(f"✅ [OTs Comerciales] Devolviendo {len(ots_formateadas)} OTs de {total} totales para {current_user.nombre}")
        
        return {
            "success": True,
            "data": ots_formateadas,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
        
    except Exception as e:
        print(f"❌ [OTs Comerciales] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error al obtener OTs comerciales"
        )
