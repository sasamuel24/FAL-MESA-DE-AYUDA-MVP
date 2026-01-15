"""
Router de autenticación para FastAPI
Migración completa desde Flask auth.py
Compatible con formato de respuestas de Flask
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.core.security import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_refresh_token_data
)
from app.schemas import (
    LoginRequest,
    LoginResponse,
    RefreshResponse,
    LogoutResponse,
    UserResponse,
    UserInfo,
    ErrorResponse,
    TokenData
)

# Crear router sin prefijo (se agrega en fastapi_app.py)
router = APIRouter(
    tags=["Authentication"],
    responses={404: {"description": "Not found"}}
)

@router.post("/login", response_model=LoginResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
) -> LoginResponse:
    """
    Autenticar usuario y generar tokens JWT
    Compatible con endpoint Flask POST /auth/login
    """
    # Autenticar usuario
    user = authenticate_user(db, login_data.email, login_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )
    
    # Crear tokens JWT
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    
    # Formatear información del usuario - Compatible con Flask
    user_info = UserInfo(
        id=user.id,
        nombre=user.nombre,
        email=user.email,
        rol=user.rol,
        area=user.area if hasattr(user, 'area') else None
    )
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_info
    )

@router.post("/refresh", response_model=RefreshResponse)
def refresh_token(
    token_data: TokenData = Depends(get_refresh_token_data),
    db: Session = Depends(get_db)
) -> RefreshResponse:
    """
    Renovar token de acceso usando refresh token
    Compatible con endpoint Flask POST /auth/refresh
    """
    # Verificar que el usuario aún existe y está activo
    from app.models import User
    
    user = db.query(User).filter(User.id == token_data.user_id).first()
    
    if not user or not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no válido"
        )
    
    # Crear nuevo access token
    access_token = create_access_token(identity=str(user.id))
    
    return RefreshResponse(access_token=access_token)

@router.post("/logout", response_model=LogoutResponse)
def logout(
    current_user = Depends(get_current_user)
) -> LogoutResponse:
    """
    Cerrar sesión del usuario
    Compatible con endpoint Flask POST /auth/logout
    
    Nota: En JWT stateless, el logout es principalmente del lado cliente
    """
    return LogoutResponse(message="Sesión cerrada exitosamente")

@router.get("/me", response_model=UserInfo)
def get_current_user_info(
    current_user = Depends(get_current_user)
) -> UserInfo:
    """
    Obtener información del usuario actual
    Compatible con endpoint Flask GET /auth/me
    """
    user_info = UserInfo(
        id=current_user.id,
        nombre=current_user.nombre,
        email=current_user.email,
        rol=current_user.rol,
        area=current_user.area if hasattr(current_user, 'area') else None
    )
    
    return user_info

# Endpoint adicional para validar token (útil para frontend)
@router.get("/validate", response_model=Dict[str, Any])
def validate_token(
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Validar token actual y retornar estado
    Endpoint adicional para facilitar validación en frontend
    """
    return {
        "valid": True,
        "user_id": current_user.id,
        "email": current_user.email,
        "rol": current_user.rol
    }
