"""
Router Users para FastAPI - Sistema Completo de Gestión de Usuarios
Endpoints para CRUD completo de usuarios, compatible con respuestas Flask
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Dict, Any
import logging
from passlib.context import CryptContext
from datetime import datetime
from pydantic import ValidationError

from app.database import get_db
from app.models import User  
from app.schemas import UserCreate, UserUpdate, UserResponse
from app.core.security import get_current_user

# Configurar logging
logger = logging.getLogger(__name__)

# Configurar encriptación de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Crear router con prefijo
router = APIRouter(
    tags=["Users"],
    responses={404: {"description": "Not found"}}
)

def hash_password(password: str) -> str:
    """Hashear contraseña"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verificar contraseña"""
    return pwd_context.verify(plain_password, hashed_password)


@router.get("/tecnicos")
async def get_tecnicos(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obtener técnicos filtrados por área del usuario
    - Usuarios del área TIC: Solo técnicos del área TIC
    - Usuarios del área Mantenimiento: Solo técnicos del área Mantenimiento  
    - Administradores: Todos los técnicos
    Migrado desde Flask - Respuesta compatible 100%
    """
    try:
        logger.info(f"FastAPI: Usuario {current_user.nombre} ({current_user.area}) solicitando lista de técnicos")
        
        # Query base para técnicos activos
        query = db.query(User).filter(User.rol == 'tecnico', User.activo == True)
        
        # 🎯 FILTRADO POR ÁREA DEL USUARIO (igual que solicitudes y OTs)
        if current_user.area and current_user.area.upper() == "TIC":
            # Usuario del área TIC: Solo técnicos del área TIC
            logger.info("🔧 Filtrando técnicos para área TIC")
            query = query.filter(User.area.ilike('%TIC%'))
                         
        elif current_user.area and current_user.area.upper() == "MANTENIMIENTO":
            # Usuario del área Mantenimiento: Solo técnicos del área Mantenimiento
            logger.info("🔨 Filtrando técnicos para área Mantenimiento") 
            query = query.filter(User.area.ilike('%Mantenimiento%'))
        else:
            # Otros usuarios (admin general): Ven todos los técnicos
            logger.info("👑 Usuario administrador - Ver todos los técnicos")
            pass
        
        # Obtener técnicos según filtrado
        tecnicos = query.all()
        
        # Formatear datos igual que en Flask
        tecnicos_data = []
        for tecnico in tecnicos:
            tecnicos_data.append({
                'id': tecnico.id,
                'nombre': tecnico.nombre,
                'email': tecnico.email,
                'area': tecnico.area or 'No asignada',
                'rol': tecnico.rol
            })
        
        # Log de resultado del filtrado
        logger.info(f"✅ Usuario {current_user.nombre} ({current_user.area}) - Devolviendo {len(tecnicos_data)} técnicos filtrados")
        
        # Respuesta idéntica a Flask
        response_data = {
            'success': True,
            'data': tecnicos_data,
            'total': len(tecnicos_data)
        }
        
        return JSONResponse(content=response_data, status_code=200)
        
    except Exception as e:
        logger.error(f"FastAPI: Error al obtener técnicos: {str(e)}")
        error_response = {
            'success': False,
            'error': str(e)
        }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_response
        )


@router.get("/")
async def get_users(
    db: Session = Depends(get_db)
):
    """
    Obtener todos los usuarios del sistema
    """
    try:
        logger.info("FastAPI: Obteniendo lista completa de usuarios")
        
        # Obtener todos los usuarios
        usuarios = db.query(User).all()
        
        # Formatear datos
        usuarios_data = []
        for usuario in usuarios:
            usuarios_data.append({
                'id': usuario.id,
                'nombre': usuario.nombre,
                'email': usuario.email,
                'rol': usuario.rol,
                'area': usuario.area or 'Sin área',
                'activo': usuario.activo,
                'fecha_creacion': usuario.created_at.isoformat() if usuario.created_at else None,
                'fecha_actualizacion': usuario.updated_at.isoformat() if usuario.updated_at else None
            })
        
        response_data = {
            'success': True,
            'data': usuarios_data,
            'total': len(usuarios_data)
        }
        
        logger.info(f"FastAPI: Se encontraron {len(usuarios_data)} usuarios")
        
        return JSONResponse(content=response_data, status_code=200)
        
    except Exception as e:
        logger.error(f"FastAPI: Error al obtener usuarios: {str(e)}")
        error_response = {
            'success': False,
            'error': str(e)
        }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_response
        )


@router.post("/")
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Crear un nuevo usuario
    """
    try:
        logger.info(f"FastAPI: Creando nuevo usuario con datos: {user_data.model_dump(exclude={'password'})}")
        logger.info(f"FastAPI: Email: {user_data.email}, Rol: {user_data.rol}, Password length: {len(user_data.password)}")
        
        # Verificar que el email no esté en uso
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            logger.warning(f"FastAPI: Email ya existe: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={'success': False, 'error': 'El email ya está en uso'}
            )
        
        # Crear nuevo usuario
        hashed_password = hash_password(user_data.password)
        nuevo_usuario = User(
            nombre=user_data.nombre,
            email=user_data.email,
            password_hash=hashed_password,
            rol=user_data.rol,
            area=user_data.area,
            activo=user_data.activo,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        
        # Respuesta formateada
        usuario_creado = {
            'id': nuevo_usuario.id,
            'nombre': nuevo_usuario.nombre,
            'email': nuevo_usuario.email,
            'rol': nuevo_usuario.rol,
            'area': nuevo_usuario.area,
            'activo': nuevo_usuario.activo,
            'fecha_creacion': nuevo_usuario.created_at.isoformat(),
            'fecha_actualizacion': nuevo_usuario.updated_at.isoformat()
        }
        
        response_data = {
            'success': True,
            'message': 'Usuario creado exitosamente',
            'data': usuario_creado
        }
        
        logger.info(f"FastAPI: Usuario creado exitosamente: {nuevo_usuario.email}")
        
        return JSONResponse(content=response_data, status_code=201)
        
    except HTTPException:
        raise
    except IntegrityError as e:
        logger.error(f"FastAPI: Error de integridad en BD: {str(e)}")
        db.rollback()
        error_response = {
            'success': False,
            'error': 'Error de integridad: posible email duplicado o datos inválidos'
        }
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_response
        )
    except ValidationError as e:
        logger.error(f"FastAPI: Error de validación: {str(e)}")
        error_response = {
            'success': False,
            'error': f'Error de validación: {str(e)}'
        }
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=error_response
        )
    except Exception as e:
        logger.error(f"FastAPI: Error al crear usuario: {str(e)}")
        logger.error(f"FastAPI: Tipo de error: {type(e).__name__}")
        db.rollback()
        error_response = {
            'success': False,
            'error': f"Error interno del servidor: {str(e)}"
        }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_response
        )


@router.put("/{user_id}")
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualizar un usuario existente
    """
    try:
        logger.info(f"FastAPI: Actualizando usuario ID: {user_id}")
        
        # Buscar el usuario
        usuario = db.query(User).filter(User.id == user_id).first()
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={'success': False, 'error': 'Usuario no encontrado'}
            )
        
        # Verificar email único si se está cambiando
        if user_data.email and user_data.email != usuario.email:
            existing_user = db.query(User).filter(
                User.email == user_data.email,
                User.id != user_id
            ).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={'success': False, 'error': 'El email ya está en uso'}
                )
        
        # Actualizar campos si se proporcionan
        if user_data.nombre is not None:
            usuario.nombre = user_data.nombre
        if user_data.email is not None:
            usuario.email = user_data.email
        if user_data.rol is not None:
            usuario.rol = user_data.rol
        if user_data.area is not None:
            usuario.area = user_data.area
        if user_data.activo is not None:
            usuario.activo = user_data.activo
        
        usuario.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(usuario)
        
        # Respuesta formateada
        usuario_actualizado = {
            'id': usuario.id,
            'nombre': usuario.nombre,
            'email': usuario.email,
            'rol': usuario.rol,
            'area': usuario.area,
            'activo': usuario.activo,
            'fecha_creacion': usuario.created_at.isoformat() if usuario.created_at else None,
            'fecha_actualizacion': usuario.updated_at.isoformat() if usuario.updated_at else None
        }
        
        response_data = {
            'success': True,
            'message': 'Usuario actualizado exitosamente',
            'data': usuario_actualizado
        }
        
        logger.info(f"FastAPI: Usuario actualizado exitosamente: {usuario.email}")
        
        return JSONResponse(content=response_data, status_code=200)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"FastAPI: Error al actualizar usuario: {str(e)}")
        db.rollback()
        error_response = {
            'success': False,
            'error': str(e)
        }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_response
        )


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Eliminar un usuario físicamente de la base de datos
    """
    try:
        logger.info(f"FastAPI: Eliminando físicamente usuario ID: {user_id}")
        
        # Buscar el usuario
        usuario = db.query(User).filter(User.id == user_id).first()
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={'success': False, 'error': 'Usuario no encontrado'}
            )
        
        # Guardar email para el mensaje
        email_usuario = usuario.email
        
        # Eliminación física - eliminar completamente de la base de datos
        db.delete(usuario)
        db.commit()
        
        response_data = {
            'success': True,
            'message': f'Usuario {email_usuario} eliminado permanentemente'
        }
        
        logger.info(f"FastAPI: Usuario eliminado físicamente: {email_usuario}")
        
        return JSONResponse(content=response_data, status_code=200)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"FastAPI: Error al eliminar usuario: {str(e)}")
        db.rollback()
        error_response = {
            'success': False,
            'error': str(e)
        }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_response
        )


@router.put("/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Alternar el estado activo/inactivo de un usuario
    """
    try:
        logger.info(f"FastAPI: Alternando estado del usuario ID: {user_id}")
        
        # Buscar el usuario
        usuario = db.query(User).filter(User.id == user_id).first()
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={'success': False, 'error': 'Usuario no encontrado'}
            )
        
        # Alternar estado
        usuario.activo = not usuario.activo
        usuario.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(usuario)
        
        status_text = "activado" if usuario.activo else "desactivado"
        response_data = {
            'success': True,
            'message': f'Usuario {status_text} exitosamente',
            'data': {
                'id': usuario.id,
                'email': usuario.email,
                'activo': usuario.activo
            }
        }
        
        logger.info(f"FastAPI: Usuario {status_text}: {usuario.email}")
        
        return JSONResponse(content=response_data, status_code=200)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"FastAPI: Error al alternar estado del usuario: {str(e)}")
        db.rollback()
        error_response = {
            'success': False,
            'error': str(e)
        }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_response
        )
