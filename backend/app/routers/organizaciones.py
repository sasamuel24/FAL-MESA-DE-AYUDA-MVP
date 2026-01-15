"""
Router para gestión de organizaciones (Zonas, Ciudades, Tiendas, Categorías, Subcategorías)
Sistema dinámico para reemplazar valores estáticos en formularios
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import and_, or_
from typing import List, Optional
import logging

from app.database import get_db
from app.models import Zona, Ciudad, Tienda, Categoria, Subcategoria
from app.schemas import (
    # Zona schemas
    ZonaCreate, ZonaUpdate, ZonaResponse, ZonaConCiudades,
    # Ciudad schemas  
    CiudadCreate, CiudadUpdate, CiudadResponse, CiudadConTiendas,
    # Tienda schemas
    TiendaCreate, TiendaUpdate, TiendaResponse,
    # Categoría schemas
    CategoriaCreate, CategoriaUpdate, CategoriaResponse, CategoriaConSubcategorias,
    # Subcategoría schemas
    SubcategoriaCreate, SubcategoriaUpdate, SubcategoriaResponse,
    # Respuestas
    OrganizacionListResponse
)

# Configurar logging
logger = logging.getLogger(__name__)

# Crear router
router = APIRouter(
    tags=["Organizaciones"],
    responses={404: {"description": "Not found"}}
)

# === ENDPOINTS PARA ZONAS ===

@router.get("/zonas", response_model=List[ZonaResponse])
async def get_zonas(
    activa: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Obtener todas las zonas"""
    try:
        query = db.query(Zona)
        
        if activa is not None:
            query = query.filter(Zona.activa == activa)
            
        zonas = query.order_by(Zona.nombre).all()
        
        logger.info(f"✅ Obtenidas {len(zonas)} zonas")
        return zonas
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo zonas: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/zonas/{zona_id}", response_model=ZonaConCiudades)
async def get_zona(zona_id: int, db: Session = Depends(get_db)):
    """Obtener una zona específica con sus ciudades"""
    try:
        zona = db.query(Zona).options(
            selectinload(Zona.ciudades).selectinload(Ciudad.tiendas)
        ).filter(Zona.id == zona_id).first()
        
        if not zona:
            raise HTTPException(status_code=404, detail="Zona no encontrada")
            
        logger.info(f"✅ Zona {zona.nombre} obtenida con {len(zona.ciudades)} ciudades")
        return zona
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo zona {zona_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/zonas", response_model=ZonaResponse)
async def create_zona(zona: ZonaCreate, db: Session = Depends(get_db)):
    """Crear nueva zona"""
    try:
        # Verificar si ya existe una zona con ese nombre
        existing = db.query(Zona).filter(Zona.nombre == zona.nombre).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe una zona con ese nombre")
            
        # Crear nueva zona
        db_zona = Zona(**zona.model_dump())
        db.add(db_zona)
        db.commit()
        db.refresh(db_zona)
        
        logger.info(f"✅ Zona '{db_zona.nombre}' creada exitosamente")
        return db_zona
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creando zona: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/zonas/{zona_id}", response_model=ZonaResponse)
async def update_zona(zona_id: int, zona: ZonaUpdate, db: Session = Depends(get_db)):
    """Actualizar zona existente"""
    try:
        db_zona = db.query(Zona).filter(Zona.id == zona_id).first()
        if not db_zona:
            raise HTTPException(status_code=404, detail="Zona no encontrada")
            
        # Actualizar campos proporcionados
        update_data = zona.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_zona, field, value)
            
        db.commit()
        db.refresh(db_zona)
        
        logger.info(f"✅ Zona '{db_zona.nombre}' actualizada exitosamente")
        return db_zona
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error actualizando zona {zona_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/zonas/{zona_id}")
async def delete_zona(zona_id: int, db: Session = Depends(get_db)):
    """Eliminar zona (DELETE físico)"""
    try:
        db_zona = db.query(Zona).filter(Zona.id == zona_id).first()
        if not db_zona:
            raise HTTPException(status_code=404, detail="Zona no encontrada")
            
        # DELETE físico - eliminar completamente de la base de datos
        zona_nombre = db_zona.nombre
        db.delete(db_zona)
        db.commit()
        
        logger.info(f"✅ Zona '{zona_nombre}' eliminada exitosamente")
        return {"success": True, "message": f"Zona '{zona_nombre}' eliminada"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error eliminando zona {zona_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

# === ENDPOINTS PARA CIUDADES ===

@router.get("/ciudades", response_model=List[CiudadResponse])
async def get_ciudades(
    zona_id: Optional[int] = None,
    activa: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Obtener todas las ciudades, opcionalmente filtradas por zona"""
    try:
        query = db.query(Ciudad).options(selectinload(Ciudad.zona))
        
        if zona_id is not None:
            query = query.filter(Ciudad.zona_id == zona_id)
        if activa is not None:
            query = query.filter(Ciudad.activa == activa)
            
        ciudades = query.order_by(Ciudad.nombre).all()
        
        logger.info(f"✅ Obtenidas {len(ciudades)} ciudades")
        return ciudades
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo ciudades: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/ciudades/{ciudad_id}", response_model=CiudadConTiendas)
async def get_ciudad(ciudad_id: int, db: Session = Depends(get_db)):
    """Obtener una ciudad específica con sus tiendas"""
    try:
        ciudad = db.query(Ciudad).options(
            selectinload(Ciudad.zona),
            selectinload(Ciudad.tiendas)
        ).filter(Ciudad.id == ciudad_id).first()
        
        if not ciudad:
            raise HTTPException(status_code=404, detail="Ciudad no encontrada")
            
        logger.info(f"✅ Ciudad {ciudad.nombre} obtenida con {len(ciudad.tiendas)} tiendas")
        return ciudad
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo ciudad {ciudad_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/ciudades", response_model=CiudadResponse)
async def create_ciudad(ciudad: CiudadCreate, db: Session = Depends(get_db)):
    """Crear nueva ciudad"""
    try:
        # Verificar que la zona exista
        zona = db.query(Zona).filter(Zona.id == ciudad.zona_id).first()
        if not zona:
            raise HTTPException(status_code=400, detail="Zona no encontrada")
            
        # Crear nueva ciudad
        db_ciudad = Ciudad(**ciudad.model_dump())
        db.add(db_ciudad)
        db.commit()
        db.refresh(db_ciudad)
        
        # Cargar relación para respuesta
        db.refresh(db_ciudad)
        
        logger.info(f"✅ Ciudad '{db_ciudad.nombre}' creada exitosamente en zona '{zona.nombre}'")
        return db_ciudad
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creando ciudad: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/ciudades/{ciudad_id}", response_model=CiudadResponse)
async def update_ciudad(ciudad_id: int, ciudad: CiudadUpdate, db: Session = Depends(get_db)):
    """Actualizar ciudad existente"""
    try:
        db_ciudad = db.query(Ciudad).filter(Ciudad.id == ciudad_id).first()
        if not db_ciudad:
            raise HTTPException(status_code=404, detail="Ciudad no encontrada")
            
        # Si se actualiza zona_id, verificar que exista
        update_data = ciudad.model_dump(exclude_unset=True)
        if 'zona_id' in update_data:
            zona = db.query(Zona).filter(Zona.id == update_data['zona_id']).first()
            if not zona:
                raise HTTPException(status_code=400, detail="Zona no encontrada")
                
        # Actualizar campos
        for field, value in update_data.items():
            setattr(db_ciudad, field, value)
            
        db.commit()
        db.refresh(db_ciudad)
        
        logger.info(f"✅ Ciudad '{db_ciudad.nombre}' actualizada exitosamente")
        return db_ciudad
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error actualizando ciudad {ciudad_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/ciudades/{ciudad_id}")
async def delete_ciudad(ciudad_id: int, db: Session = Depends(get_db)):
    """Eliminar ciudad (DELETE físico)"""
    try:
        db_ciudad = db.query(Ciudad).filter(Ciudad.id == ciudad_id).first()
        if not db_ciudad:
            raise HTTPException(status_code=404, detail="Ciudad no encontrada")
            
        # DELETE físico - eliminar completamente de la base de datos
        ciudad_nombre = db_ciudad.nombre
        db.delete(db_ciudad)
        db.commit()
        
        logger.info(f"✅ Ciudad '{ciudad_nombre}' eliminada exitosamente")
        return {"success": True, "message": f"Ciudad '{ciudad_nombre}' eliminada"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error eliminando ciudad {ciudad_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

# === ENDPOINTS PARA TIENDAS ===

@router.get("/tiendas", response_model=List[TiendaResponse])
async def get_tiendas(
    ciudad_id: Optional[int] = None,
    zona_id: Optional[int] = None,
    activa: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Obtener todas las tiendas, opcionalmente filtradas por ciudad o zona"""
    try:
        query = db.query(Tienda).options(
            selectinload(Tienda.ciudad).selectinload(Ciudad.zona)
        )
        
        if ciudad_id is not None:
            query = query.filter(Tienda.ciudad_id == ciudad_id)
        elif zona_id is not None:
            query = query.join(Ciudad).filter(Ciudad.zona_id == zona_id)
            
        if activa is not None:
            query = query.filter(Tienda.activa == activa)
            
        tiendas = query.order_by(Tienda.nombre).all()
        
        logger.info(f"✅ Obtenidas {len(tiendas)} tiendas")
        return tiendas
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo tiendas: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/tiendas/{tienda_id}", response_model=TiendaResponse)
async def get_tienda(tienda_id: int, db: Session = Depends(get_db)):
    """Obtener una tienda específica"""
    try:
        tienda = db.query(Tienda).options(
            selectinload(Tienda.ciudad).selectinload(Ciudad.zona)
        ).filter(Tienda.id == tienda_id).first()
        
        if not tienda:
            raise HTTPException(status_code=404, detail="Tienda no encontrada")
            
        logger.info(f"✅ Tienda {tienda.nombre} obtenida")
        return tienda
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo tienda {tienda_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/tiendas", response_model=TiendaResponse)
async def create_tienda(tienda: TiendaCreate, db: Session = Depends(get_db)):
    """Crear nueva tienda"""
    try:
        # Verificar que la ciudad exista
        ciudad = db.query(Ciudad).filter(Ciudad.id == tienda.ciudad_id).first()
        if not ciudad:
            raise HTTPException(status_code=400, detail="Ciudad no encontrada")
            
        # Crear nueva tienda
        db_tienda = Tienda(**tienda.model_dump())
        db.add(db_tienda)
        db.commit()
        db.refresh(db_tienda)
        
        logger.info(f"✅ Tienda '{db_tienda.nombre}' creada exitosamente en ciudad '{ciudad.nombre}'")
        return db_tienda
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creando tienda: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/tiendas/{tienda_id}", response_model=TiendaResponse)
async def update_tienda(tienda_id: int, tienda: TiendaUpdate, db: Session = Depends(get_db)):
    """Actualizar tienda existente"""
    try:
        db_tienda = db.query(Tienda).filter(Tienda.id == tienda_id).first()
        if not db_tienda:
            raise HTTPException(status_code=404, detail="Tienda no encontrada")
            
        # Si se actualiza ciudad_id, verificar que exista
        update_data = tienda.model_dump(exclude_unset=True)
        if 'ciudad_id' in update_data:
            ciudad = db.query(Ciudad).filter(Ciudad.id == update_data['ciudad_id']).first()
            if not ciudad:
                raise HTTPException(status_code=400, detail="Ciudad no encontrada")
                
        # Actualizar campos
        for field, value in update_data.items():
            setattr(db_tienda, field, value)
            
        db.commit()
        db.refresh(db_tienda)
        
        logger.info(f"✅ Tienda '{db_tienda.nombre}' actualizada exitosamente")
        return db_tienda
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error actualizando tienda {tienda_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/tiendas/{tienda_id}")
async def delete_tienda(tienda_id: int, db: Session = Depends(get_db)):
    """Eliminar tienda (DELETE físico)"""
    try:
        db_tienda = db.query(Tienda).filter(Tienda.id == tienda_id).first()
        if not db_tienda:
            raise HTTPException(status_code=404, detail="Tienda no encontrada")
            
        # DELETE físico - eliminar completamente de la base de datos
        tienda_nombre = db_tienda.nombre
        db.delete(db_tienda)
        db.commit()
        
        logger.info(f"✅ Tienda '{tienda_nombre}' eliminada exitosamente")
        return {"success": True, "message": f"Tienda '{tienda_nombre}' eliminada"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error eliminando tienda {tienda_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

# === ENDPOINTS PARA CATEGORÍAS ===

@router.get("/categorias", response_model=List[CategoriaResponse])
async def get_categorias(
    activa: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Obtener todas las categorías"""
    try:
        query = db.query(Categoria)
        
        if activa is not None:
            query = query.filter(Categoria.activa == activa)
            
        categorias = query.order_by(Categoria.nombre).all()
        
        logger.info(f"✅ Obtenidas {len(categorias)} categorías")
        return categorias
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo categorías: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/categorias/{categoria_id}", response_model=CategoriaConSubcategorias)
async def get_categoria(categoria_id: int, db: Session = Depends(get_db)):
    """Obtener una categoría específica con sus subcategorías"""
    try:
        categoria = db.query(Categoria).options(
            selectinload(Categoria.subcategorias)
        ).filter(Categoria.id == categoria_id).first()
        
        if not categoria:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
            
        logger.info(f"✅ Categoría {categoria.nombre} obtenida con {len(categoria.subcategorias)} subcategorías")
        return categoria
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo categoría {categoria_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/categorias", response_model=CategoriaResponse)
async def create_categoria(categoria: CategoriaCreate, db: Session = Depends(get_db)):
    """Crear nueva categoría"""
    try:
        # Verificar si ya existe una categoría con ese nombre
        existing = db.query(Categoria).filter(Categoria.nombre == categoria.nombre).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre")
            
        # Crear nueva categoría
        db_categoria = Categoria(**categoria.model_dump())
        db.add(db_categoria)
        db.commit()
        db.refresh(db_categoria)
        
        logger.info(f"✅ Categoría '{db_categoria.nombre}' creada exitosamente")
        return db_categoria
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creando categoría: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/categorias/{categoria_id}", response_model=CategoriaResponse)
async def update_categoria(categoria_id: int, categoria: CategoriaUpdate, db: Session = Depends(get_db)):
    """Actualizar categoría existente"""
    try:
        db_categoria = db.query(Categoria).filter(Categoria.id == categoria_id).first()
        if not db_categoria:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
            
        # Actualizar campos proporcionados
        update_data = categoria.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_categoria, field, value)
            
        db.commit()
        db.refresh(db_categoria)
        
        logger.info(f"✅ Categoría '{db_categoria.nombre}' actualizada exitosamente")
        return db_categoria
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error actualizando categoría {categoria_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/categorias/{categoria_id}")
async def delete_categoria(categoria_id: int, db: Session = Depends(get_db)):
    """Eliminar categoría (DELETE físico)"""
    try:
        db_categoria = db.query(Categoria).filter(Categoria.id == categoria_id).first()
        if not db_categoria:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
            
        # DELETE físico - eliminar completamente de la base de datos
        categoria_nombre = db_categoria.nombre
        db.delete(db_categoria)
        db.commit()
        
        logger.info(f"✅ Categoría '{categoria_nombre}' eliminada exitosamente")
        return {"success": True, "message": f"Categoría '{categoria_nombre}' eliminada"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error eliminando categoría {categoria_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

# === ENDPOINTS PARA SUBCATEGORÍAS ===

@router.get("/subcategorias", response_model=List[SubcategoriaResponse])
async def get_subcategorias(
    categoria_id: Optional[int] = None,
    activa: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Obtener todas las subcategorías, opcionalmente filtradas por categoría"""
    try:
        query = db.query(Subcategoria).options(selectinload(Subcategoria.categoria))
        
        if categoria_id is not None:
            query = query.filter(Subcategoria.categoria_id == categoria_id)
        if activa is not None:
            query = query.filter(Subcategoria.activa == activa)
            
        subcategorias = query.order_by(Subcategoria.nombre).all()
        
        logger.info(f"✅ Obtenidas {len(subcategorias)} subcategorías")
        return subcategorias
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo subcategorías: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/subcategorias/{subcategoria_id}", response_model=SubcategoriaResponse)
async def get_subcategoria(subcategoria_id: int, db: Session = Depends(get_db)):
    """Obtener una subcategoría específica"""
    try:
        subcategoria = db.query(Subcategoria).options(
            selectinload(Subcategoria.categoria)
        ).filter(Subcategoria.id == subcategoria_id).first()
        
        if not subcategoria:
            raise HTTPException(status_code=404, detail="Subcategoría no encontrada")
            
        logger.info(f"✅ Subcategoría {subcategoria.nombre} obtenida")
        return subcategoria
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo subcategoría {subcategoria_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/subcategorias", response_model=SubcategoriaResponse)
async def create_subcategoria(subcategoria: SubcategoriaCreate, db: Session = Depends(get_db)):
    """Crear nueva subcategoría"""
    try:
        # Verificar que la categoría exista
        categoria = db.query(Categoria).filter(Categoria.id == subcategoria.categoria_id).first()
        if not categoria:
            raise HTTPException(status_code=400, detail="Categoría no encontrada")
            
        # Crear nueva subcategoría
        db_subcategoria = Subcategoria(**subcategoria.model_dump())
        db.add(db_subcategoria)
        db.commit()
        db.refresh(db_subcategoria)
        
        logger.info(f"✅ Subcategoría '{db_subcategoria.nombre}' creada exitosamente en categoría '{categoria.nombre}'")
        return db_subcategoria
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creando subcategoría: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/subcategorias/{subcategoria_id}", response_model=SubcategoriaResponse)
async def update_subcategoria(subcategoria_id: int, subcategoria: SubcategoriaUpdate, db: Session = Depends(get_db)):
    """Actualizar subcategoría existente"""
    try:
        db_subcategoria = db.query(Subcategoria).filter(Subcategoria.id == subcategoria_id).first()
        if not db_subcategoria:
            raise HTTPException(status_code=404, detail="Subcategoría no encontrada")
            
        # Si se actualiza categoria_id, verificar que exista
        update_data = subcategoria.model_dump(exclude_unset=True)
        if 'categoria_id' in update_data:
            categoria = db.query(Categoria).filter(Categoria.id == update_data['categoria_id']).first()
            if not categoria:
                raise HTTPException(status_code=400, detail="Categoría no encontrada")
                
        # Actualizar campos
        for field, value in update_data.items():
            setattr(db_subcategoria, field, value)
            
        db.commit()
        db.refresh(db_subcategoria)
        
        logger.info(f"✅ Subcategoría '{db_subcategoria.nombre}' actualizada exitosamente")
        return db_subcategoria
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error actualizando subcategoría {subcategoria_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/subcategorias/{subcategoria_id}")
async def delete_subcategoria(subcategoria_id: int, db: Session = Depends(get_db)):
    """Eliminar subcategoría (DELETE físico)"""
    try:
        db_subcategoria = db.query(Subcategoria).filter(Subcategoria.id == subcategoria_id).first()
        if not db_subcategoria:
            raise HTTPException(status_code=404, detail="Subcategoría no encontrada")
            
        # DELETE físico - eliminar completamente de la base de datos
        subcategoria_nombre = db_subcategoria.nombre
        db.delete(db_subcategoria)
        db.commit()
        
        logger.info(f"✅ Subcategoría '{subcategoria_nombre}' eliminada exitosamente")
        return {"success": True, "message": f"Subcategoría '{subcategoria_nombre}' eliminada"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error eliminando subcategoría {subcategoria_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

# === ENDPOINTS DE UTILIDAD ===

@router.get("/estructura-completa")
async def get_estructura_completa(db: Session = Depends(get_db)):
    """Obtener la estructura completa de organizaciones (zonas con ciudades y tiendas, categorías con subcategorías)"""
    try:
        # Obtener zonas con ciudades y tiendas
        zonas = db.query(Zona).options(
            selectinload(Zona.ciudades).selectinload(Ciudad.tiendas)
        ).filter(Zona.activa == True).order_by(Zona.nombre).all()
        
        # Obtener categorías con subcategorías
        categorias = db.query(Categoria).options(
            selectinload(Categoria.subcategorias)
        ).filter(Categoria.activa == True).order_by(Categoria.nombre).all()
        
        # Preparar respuesta
        estructura = {
            "zonas": [
                {
                    "id": zona.id,
                    "nombre": zona.nombre,
                    "codigo": zona.codigo,
                    "ciudades": [
                        {
                            "id": ciudad.id,
                            "nombre": ciudad.nombre,
                            "codigo": ciudad.codigo,
                            "tiendas": [
                                {
                                    "id": tienda.id,
                                    "nombre": tienda.nombre,
                                    "codigo": tienda.codigo,
                                    "direccion": tienda.direccion
                                }
                                for tienda in ciudad.tiendas if tienda.activa
                            ]
                        }
                        for ciudad in zona.ciudades if ciudad.activa
                    ]
                }
                for zona in zonas
            ],
            "categorias": [
                {
                    "id": categoria.id,
                    "nombre": categoria.nombre,
                    "codigo": categoria.codigo,
                    "icono": categoria.icono,
                    "color": categoria.color,
                    "subcategorias": [
                        {
                            "id": subcat.id,
                            "nombre": subcat.nombre,
                            "codigo": subcat.codigo
                        }
                        for subcat in categoria.subcategorias if subcat.activa
                    ]
                }
                for categoria in categorias
            ]
        }
        
        logger.info(f"✅ Estructura completa obtenida: {len(zonas)} zonas, {len(categorias)} categorías")
        return {
            "success": True,
            "data": estructura
        }
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo estructura completa: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")