"""
Utilidades de seguridad y autenticación para FastAPI
JWT tokens, hashing de contraseñas, y dependencies de autorización
Compatible con Flask JWT Extended

Es un sistema de autenticación basado en tokens JWT, para mi app fastapi,
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from werkzeug.security import check_password_hash
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.schemas import TokenData

# Configurar contexto de contraseñas para bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuración de autenticación Bearer
bearer_scheme = HTTPBearer()

def create_access_token(identity: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crear token de acceso JWT
    
    Args:
        identity: ID del usuario como string
        expires_delta: Tiempo de expiración personalizado
    
    Returns:
        Token JWT como string
    """
    to_encode = {"sub": identity}
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt

def create_refresh_token(identity: str) -> str:
    """
    Crear token de refresh JWT
    
    Args:
        identity: ID del usuario como string
    
    Returns:
        Refresh token JWT como string
    """
    to_encode = {"sub": identity, "type": "refresh"}
    expire = datetime.utcnow() + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> Optional[TokenData]:
    """
    Verificar y decodificar token JWT
    
    Args:
        token: Token JWT a verificar
        token_type: Tipo de token ("access" o "refresh")
    
    Returns:
        TokenData si el token es válido, None si no
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # Para refresh tokens, verificar tipo
        if token_type == "refresh" and payload.get("type") != "refresh":
            return None
        
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            return None
        
        user_id = int(user_id_str)
        token_data = TokenData(user_id=user_id)
        return token_data
        
    except (JWTError, ValueError):
        return None

def get_current_user_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> TokenData:
    """
    Dependency para obtener token de usuario actual
    Extraerlo del header Authorization
    
    Args:
        credentials: Credenciales Bearer del header
    
    Returns:
        TokenData del usuario actual
    
    Raises:
        HTTPException: Si el token es inválido
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_token(credentials.credentials)
    
    if token_data is None:
        raise credentials_exception
    
    return token_data

def get_current_user(
    token_data: TokenData = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """
    Dependency para obtener usuario actual completo desde base de datos
    
    Args:
        token_data: Datos del token validado
        db: Sesión de base de datos
    
    Returns:
        Usuario completo desde base de datos
    
    Raises:
        HTTPException: Si el usuario no existe o está inactivo
    """
    from app.models import User
    
    user = db.query(User).filter(User.id == token_data.user_id).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user"
        )
    
    # Debug log para entender qué usuario está accediendo
    print(f"🔐 [Auth] Usuario autenticado: ID={user.id} | Nombre={user.nombre} | Área={user.area} | Rol={user.rol}")
    
    return user

def get_current_active_user(
    current_user: dict = Depends(get_current_user)
):
    """
    Dependency para obtener usuario actual activo
    Alias de get_current_user para compatibilidad con autogestion router
    """
    return current_user

def authenticate_user(db: Session, email: str, password: str):
    """
    Autenticar usuario con email y contraseña
    
    Args:
        db: Sesión de base de datos
        email: Email del usuario
        password: Contraseña plana
    
    Returns:
        Usuario si las credenciales son válidas, False si no
    """
    from app.models import User
    
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        return False
    
    # 🔧 SOPORTE DUAL: bcrypt (moderno) + Werkzeug (legacy Flask)
    password_valid = False
    
    # Intento 1: Verificar con bcrypt (hashes modernos FastAPI)
    try:
        if pwd_context.verify(password, user.password_hash):
            password_valid = True
            print(f"✅ Auth success for {email} using bcrypt")
    except Exception as e:
        # Si bcrypt falla, intentar con Werkzeug (hashes legacy Flask)
        print(f"🔄 bcrypt failed for {email}, trying Werkzeug: {e}")
        pass
    
    # Intento 2: Verificar con Werkzeug (hashes legacy Flask pbkdf2:sha256)
    if not password_valid:
        try:
            if check_password_hash(user.password_hash, password):
                password_valid = True
                print(f"✅ Auth success for {email} using Werkzeug (legacy)")
        except Exception as e:
            print(f"❌ Werkzeug also failed for {email}: {e}")
            pass
    
    if not password_valid:
        print(f"❌ Auth failed for {email}: Password mismatch")
        return False
    
    if not user.activo:
        print(f"⚠️ Auth blocked for {email}: User inactive")
        return False
    
    return user

# Dependency para verificar refresh token
def get_refresh_token_data(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> TokenData:
    """
    Dependency para verificar refresh token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_token(credentials.credentials, token_type="refresh")
    
    if token_data is None:
        raise credentials_exception
    
    return token_data
