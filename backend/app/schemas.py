"""
Esquemas Pydantic para FastAPI - Sistema unificado
Modelos de validación y serialización completos
"""
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime

# Esquema base con configuración actualizada
class BaseSchema(BaseModel):
    """Esquema base con configuración común para Pydantic V2"""
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

# === ESQUEMAS DE AUTENTICACIÓN ===
class LoginRequest(BaseModel):
    """Esquema para solicitud de login"""
    email: EmailStr
    password: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

class UserBase(BaseSchema):
    """Esquema base para usuarios"""
    nombre: str
    email: EmailStr
    rol: str
    area: Optional[str] = None
    activo: bool = True

class UserCreate(UserBase):
    """Esquema para crear usuario"""
    password: str
    
    @field_validator('rol')
    @classmethod
    def validate_rol(cls, v):
        valid_roles = ['admin', 'tecnico', 'jefe_zona', 'gerente_tiendas', 'mercadeo']
        if v not in valid_roles:
            raise ValueError(f'Rol must be one of: {valid_roles}')
        return v
    
    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

class UserUpdate(BaseModel):
    """Esquema para actualizar usuario"""
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    rol: Optional[str] = None
    area: Optional[str] = None
    activo: Optional[bool] = None
    
    @field_validator('rol')
    @classmethod
    def validate_rol(cls, v):
        if v is not None:
            valid_roles = ['admin', 'tecnico', 'jefe_zona', 'gerente_tiendas', 'mercadeo']
            if v not in valid_roles:
                raise ValueError(f'Rol must be one of: {valid_roles}')
        return v

class UserResponse(UserBase):
    """Esquema de respuesta para usuarios"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

class UserInfo(BaseModel):
    """Esquema para información básica del usuario"""
    id: int
    nombre: str
    email: str
    rol: str
    area: Optional[str] = None

class LoginResponse(BaseModel):
    """Esquema para respuesta de login"""
    access_token: str
    refresh_token: str
    user: UserInfo

class RefreshResponse(BaseModel):
    """Esquema para respuesta de refresh token"""
    access_token: str

class LogoutResponse(BaseModel):
    """Esquema para respuesta de logout"""
    message: str

class TokenData(BaseModel):
    """Esquema para datos del token"""
    user_id: Optional[int] = None
    email: Optional[str] = None

# === ESQUEMAS B2C SOLICITUDES ===
class B2CSolicitudesBase(BaseSchema):
    """Esquema base para solicitudes B2C"""
    nombre: str
    correo: EmailStr
    telefono: Optional[str] = None
    zona: Optional[str] = None
    ciudad: Optional[str] = None
    tienda: Optional[str] = None
    categoria: Optional[str] = None
    subcategoria: Optional[str] = None
    asunto: str
    descripcion: str
    estado: str = 'nueva'
    prioridad: str = 'media'
    
    # Campos específicos para Planta San Pedro
    tipo_formulario: Optional[str] = 'b2c'
    planta: Optional[str] = None
    activo: Optional[str] = None

class B2CSolicitudesCreate(B2CSolicitudesBase):
    """Esquema para crear solicitud B2C"""
    archivo_nombre: Optional[str] = None
    archivo_url: Optional[str] = None

class B2CSolicitudesUpdate(BaseModel):
    """Esquema para actualizar solicitud B2C"""
    estado: Optional[str] = None
    prioridad: Optional[str] = None

class B2CSolicitudesResponse(B2CSolicitudesBase):
    """Esquema de respuesta para solicitudes B2C"""
    id: int
    folio: str
    archivo_nombre: Optional[str] = None
    archivo_url: Optional[str] = None
    fecha_creacion: datetime
    fecha_actualizacion: datetime

# === ESQUEMAS ETAPAS OT ===
class EtapaOTBase(BaseSchema):
    """Esquema base para etapas OT"""
    nombre: str
    descripcion: Optional[str] = None
    color: str = '#3B82F6'
    orden: int = 0
    es_final: bool = False
    activa: bool = True

class EtapaOTCreate(EtapaOTBase):
    """Esquema para crear etapa OT"""
    pass

class EtapaOTResponse(EtapaOTBase):
    """Esquema de respuesta para etapas OT"""
    id: int
    fecha_creacion: datetime

# === ESQUEMAS OT SOLICITUDES ===
class OTSolicitudBase(BaseSchema):
    """Esquema base para órdenes de trabajo"""
    asunto: str
    categoria: Optional[str] = None
    subcategoria: Optional[str] = None
    zona: Optional[str] = None
    ciudad: Optional[str] = None
    tienda: Optional[str] = None
    tecnico_asignado: Optional[str] = None
    etapa: str = 'Pendiente'
    estado: str = 'Pendiente'
    prioridad: str = 'Media'
    tipo_mantenimiento: str = 'correctivo'
    tiempo_estimado: Optional[str] = None
    notas: Optional[str] = None

class OTSolicitudCreate(OTSolicitudBase):
    """Esquema para crear OT"""
    solicitud_id: Optional[int] = None

class OTSolicitudUpdate(BaseModel):
    """Esquema para actualizar OT"""
    fecha_visita: Optional[datetime] = None
    etapa: Optional[str] = None
    estado: Optional[str] = None
    prioridad: Optional[str] = None
    tiempo_estimado: Optional[str] = None
    notas: Optional[str] = None
    fecha_completada: Optional[datetime] = None

class OTSolicitudResponse(OTSolicitudBase):
    """Esquema de respuesta para OTs"""
    id: int
    folio: int
    fecha_creacion: datetime
    fecha_visita: Optional[datetime] = None
    fecha_completada: Optional[datetime] = None
    fecha_actualizacion: datetime
    solicitud_id: Optional[int] = None

# === ESQUEMAS WORK ORDERS ===
class WorkOrderBase(BaseSchema):
    """Esquema base para work orders"""
    titulo: str
    descripcion: str
    estado: str = 'pendiente'
    prioridad: str = 'media'
    fecha_programada: Optional[datetime] = None
    observaciones: Optional[str] = None
    tiempo_estimado: Optional[int] = None
    materiales_usados: Optional[str] = None

class WorkOrderCreate(WorkOrderBase):
    """Esquema para crear work order"""
    assigned_to: Optional[int] = None
    request_id: Optional[int] = None

class WorkOrderUpdate(BaseModel):
    """Esquema para actualizar work order"""
    estado: Optional[str] = None
    fecha_completada: Optional[datetime] = None
    tiempo_real: Optional[int] = None
    observaciones: Optional[str] = None

class WorkOrderResponse(WorkOrderBase):
    """Esquema de respuesta para work orders"""
    id: int
    folio: str
    created_by: int
    assigned_to: Optional[int] = None
    fecha_creacion: datetime
    fecha_completada: Optional[datetime] = None
    fecha_actualizacion: datetime

# === ESQUEMAS NOTAS TRAZABLES ===
class NotasTrazablesBase(BaseSchema):
    """Esquema base para notas trazables"""
    nota: str
    usuario_email: str
    usuario_nombre: str
    usuario_rol: Optional[str] = None

class NotasTrazablesCreate(NotasTrazablesBase):
    """Esquema para crear nota trazable"""
    ot_id: int
    usuario_id: Optional[int] = None

class NotasTrazablesResponse(NotasTrazablesBase):
    """Esquema de respuesta para notas trazables"""
    id: int
    ot_id: int
    usuario_id: Optional[int] = None
    fecha_creacion: datetime

# === ESQUEMAS ARCHIVOS ADJUNTOS ===
class ArchivosAdjuntosBase(BaseSchema):
    """Esquema base para archivos adjuntos"""
    nombre_archivo: str
    nombre_original: str
    tipo_archivo: Optional[str] = None
    tamano_archivo: Optional[int] = None
    url_archivo: Optional[str] = None
    tipo_adjunto: str = 'general'
    subido_por: Optional[str] = None

class ArchivosAdjuntosCreate(ArchivosAdjuntosBase):
    """Esquema para crear archivo adjunto"""
    ot_id: int

class ArchivosAdjuntosResponse(ArchivosAdjuntosBase):
    """Esquema de respuesta para archivos adjuntos"""
    id: int
    ot_id: int
    fecha_subida: datetime

# === ESQUEMAS FIRMAS ===
class FirmaConformidadBase(BaseSchema):
    """Esquema base para firmas de conformidad"""
    tipo_firma: str  # 'tecnico' o 'cliente'
    firma_data: Optional[str] = None  # Base64
    nombre_firmante: Optional[str] = None
    cargo_firmante: Optional[str] = None

class FirmaConformidadCreate(FirmaConformidadBase):
    """Esquema para crear firma"""
    ot_id: int

class FirmaConformidadResponse(FirmaConformidadBase):
    """Esquema de respuesta para firmas"""
    id: int
    ot_id: int
    fecha_firma: datetime

# === ESQUEMAS DE REQUESTS ===
class RequestBase(BaseSchema):
    """Esquema base para requests"""
    titulo: str
    descripcion: str
    estado: str = 'pendiente'
    prioridad: str = 'media'
    organization_id: Optional[int] = None
    fecha_vencimiento: Optional[datetime] = None

class RequestCreate(RequestBase):
    """Esquema para crear request"""
    pass

class RequestUpdate(BaseModel):
    """Esquema para actualizar request"""
    estado: Optional[str] = None
    fecha_completada: Optional[datetime] = None

class RequestResponse(RequestBase):
    """Esquema de respuesta para requests"""
    id: int
    folio: str
    created_by: int
    fecha_creacion: datetime
    fecha_completada: Optional[datetime] = None
    fecha_actualizacion: datetime

# === ESQUEMAS ESPECIALES PARA ENDPOINTS ===
class ActualizarPrioridadRequest(BaseModel):
    """Esquema para actualizar prioridad de OT"""
    prioridad: str
    
    @field_validator('prioridad')
    @classmethod
    def validate_prioridad(cls, v):
        allowed_values = ['Baja', 'Media', 'Alta', 'Crítica']
        if v not in allowed_values:
            raise ValueError(f'Prioridad debe ser una de: {", ".join(allowed_values)}')
        return v

class TiempoEstimadoRequest(BaseModel):
    """Esquema para actualizar tiempo estimado"""
    tiempo_estimado: str

class HistorialEtapaResponse(BaseModel):
    """Esquema para historial de etapas"""
    id: int
    ot_id: int
    etapa_anterior: Optional[str] = None
    etapa_nueva: str
    usuario_cambio: str
    comentario: Optional[str] = None
    fecha_cambio: datetime

# === ESQUEMAS DE RESPUESTA GENERALES ===
class SuccessResponse(BaseModel):
    """Esquema de respuesta exitosa"""
    success: bool = True
    message: str
    data: Optional[dict] = None

class ErrorResponse(BaseModel):
    """Esquema de respuesta de error"""
    success: bool = False
    error: str
    details: Optional[str] = None

class PaginatedResponse(BaseModel):
    """Esquema para respuestas paginadas"""
    items: List[dict]
    total: int
    page: int
    size: int
    pages: int

class ErrorResponse(BaseModel):
    """Esquema para respuestas de error - Compatible con Flask"""
    error: str

# Esquemas internos para JWT
class TokenData(BaseModel):
    """Esquema para datos del token"""
    user_id: Optional[int] = None
    email: Optional[str] = None

# === ESQUEMAS B2C ===

class B2CSolicitudCreate(BaseModel):
    """Esquema para crear solicitud B2C"""
    nombre: str
    correo: EmailStr
    telefono: Optional[str] = None
    asunto: str
    descripcion: str
    zona: Optional[str] = None
    ciudad: Optional[str] = None
    tienda: Optional[str] = None
    categoria: Optional[str] = None
    subcategoria: Optional[str] = None
    
    # Campos específicos para Planta San Pedro
    tipo_formulario: Optional[str] = 'b2c'
    planta: Optional[str] = None
    activo: Optional[str] = None

class B2CSolicitudData(BaseModel):
    """Esquema para datos de solicitud B2C"""
    id: int
    nombre: str
    correo: str
    telefono: Optional[str] = None
    asunto: str
    descripcion: str
    zona: Optional[str] = None
    ciudad: Optional[str] = None
    tienda: Optional[str] = None
    categoria: Optional[str] = None
    subcategoria: Optional[str] = None
    archivo_nombre: Optional[str] = None
    archivo_url: Optional[str] = None
    archivo_s3_key: Optional[str] = None
    estado: str
    motivo_cancelacion: Optional[str] = None
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    tipo_formulario: Optional[str] = 'b2c'
    planta: Optional[str] = None
    activo: Optional[str] = None

class B2CSolicitudResponse(BaseModel):
    """Esquema para respuesta de solicitud B2C individual"""
    success: bool
    data: B2CSolicitudData
    message: Optional[str] = None

class B2CSolicitudListResponse(BaseModel):
    """Esquema para respuesta de lista de solicitudes B2C"""
    success: bool
    data: List[dict]  # Simplificar a dict básico
    total: int
    page: int
    per_page: int
    pages: int

class B2CCancelRequest(BaseModel):
    """Esquema para cancelar solicitud B2C"""
    motivo_cancelacion: str

class EnviarAlertaRequest(BaseModel):
    """Esquema para enviar alerta a técnico"""
    mensaje: str
    
    @field_validator('mensaje')
    @classmethod
    def validate_mensaje(cls, v):
        v = v.strip()
        if len(v) < 1:
            raise ValueError('El mensaje no puede estar vacío')
        if len(v) > 500:
            raise ValueError('El mensaje no debe exceder 500 caracteres')
        return v

class StandardResponse(BaseModel):
    """Esquema para respuestas estándar"""
    success: bool
    message: str
    data: Optional[dict] = None  # Simplificar a dict básico


# === ESQUEMAS WORK ORDERS / OTS ===

class TiposMantenimiento(BaseModel):
    """Esquema para tipos de mantenimiento en dashboard"""
    preventivo: int
    correctivo: int
    predictivo: int
    porcentajePreventivo: float
    porcentajeCorrectivo: float

class ActividadReciente(BaseModel):
    """Esquema para actividad reciente en dashboard"""
    folio: int
    tienda: str
    tipo: str
    tecnico: str
    estado: str

class DashboardStats(BaseModel):
    """Esquema para estadísticas del dashboard"""
    totalOTs: int
    otsPendientes: int
    efectividadCierre: float
    tiposMantenimiento: TiposMantenimiento
    actividadesRecientes: List[ActividadReciente]

class DashboardStatsResponse(BaseModel):
    """Esquema para respuesta de estadísticas del dashboard"""
    success: bool = True
    data: DashboardStats
    
    # Compatibilidad con respuesta Flask (campos directos)
    totalOTs: int
    otsPendientes: int
    efectividadCierre: float
    tiposMantenimiento: TiposMantenimiento
    actividadesRecientes: List[ActividadReciente]


# === ESQUEMAS PARA SISTEMA DE ORGANIZACIONES ===

# Schemas para Zonas
class ZonaBase(BaseSchema):
    """Esquema base para zonas"""
    nombre: str
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    activa: bool = True

class ZonaCreate(ZonaBase):
    """Esquema para crear zona"""
    pass

class ZonaUpdate(BaseModel):
    """Esquema para actualizar zona"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None

class ZonaResponse(ZonaBase):
    """Esquema de respuesta para zonas"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

# Schemas para Ciudades  
class CiudadBase(BaseSchema):
    """Esquema base para ciudades"""
    nombre: str
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    activa: bool = True
    zona_id: int

class CiudadCreate(CiudadBase):
    """Esquema para crear ciudad"""
    pass

class CiudadUpdate(BaseModel):
    """Esquema para actualizar ciudad"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None
    zona_id: Optional[int] = None

class CiudadResponse(CiudadBase):
    """Esquema de respuesta para ciudades"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    zona: ZonaResponse

# Schemas para Tiendas
class TiendaBase(BaseSchema):
    """Esquema base para tiendas"""
    nombre: str
    codigo: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    activa: bool = True
    ciudad_id: int

class TiendaCreate(TiendaBase):
    """Esquema para crear tienda"""
    pass

class TiendaUpdate(BaseModel):
    """Esquema para actualizar tienda"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    activa: Optional[bool] = None
    ciudad_id: Optional[int] = None

class TiendaResponse(TiendaBase):
    """Esquema de respuesta para tiendas"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    ciudad: CiudadResponse

# Schemas para Categorías
class CategoriaBase(BaseSchema):
    """Esquema base para categorías"""
    nombre: str
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    icono: Optional[str] = None
    color: str = "#3B82F6"
    activa: bool = True

class CategoriaCreate(CategoriaBase):
    """Esquema para crear categoría"""
    pass

class CategoriaUpdate(BaseModel):
    """Esquema para actualizar categoría"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    icono: Optional[str] = None
    color: Optional[str] = None
    activa: Optional[bool] = None

class CategoriaResponse(CategoriaBase):
    """Esquema de respuesta para categorías"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

# Schemas para Subcategorías
class SubcategoriaBase(BaseSchema):
    """Esquema base para subcategorías"""
    nombre: str
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    activa: bool = True
    categoria_id: int

class SubcategoriaCreate(SubcategoriaBase):
    """Esquema para crear subcategoría"""
    pass

class SubcategoriaUpdate(BaseModel):
    """Esquema para actualizar subcategoría"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None
    categoria_id: Optional[int] = None

class SubcategoriaResponse(SubcategoriaBase):
    """Esquema de respuesta para subcategorías"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    categoria: CategoriaResponse

# Schemas con relaciones completas (para respuestas detalladas)
class ZonaConCiudades(ZonaResponse):
    """Zona con sus ciudades"""
    ciudades: List[CiudadResponse] = []

class CiudadConTiendas(CiudadResponse):
    """Ciudad con sus tiendas"""
    tiendas: List[TiendaResponse] = []

class CategoriaConSubcategorias(CategoriaResponse):
    """Categoría con sus subcategorías"""
    subcategorias: List[SubcategoriaResponse] = []

# Schemas para respuestas de listado
class OrganizacionListResponse(BaseModel):
    """Respuesta para listados de organizaciones"""
    success: bool = True
    data: List[dict]
    total: int
    page: int
    per_page: int

# === ESQUEMAS PARA PLANTAS ===
class PlantaBase(BaseSchema):
    """Esquema base para plantas"""
    nombre: str
    codigo: str
    descripcion: Optional[str] = None
    ubicacion: Optional[str] = None
    activa: bool = True

class PlantaCreate(PlantaBase):
    """Esquema para crear planta"""
    pass

class PlantaUpdate(BaseModel):
    """Esquema para actualizar planta"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    ubicacion: Optional[str] = None
    activa: Optional[bool] = None

class PlantaResponse(PlantaBase):
    """Esquema de respuesta para plantas"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

# === ESQUEMAS PARA ACTIVOS ===
class ActivoBase(BaseSchema):
    """Esquema base para activos - Solo campos básicos"""
    nombre: str
    codigo: Optional[str] = None
    tipo: str  # Campo requerido por la BD
    descripcion: Optional[str] = None
    activo: bool = True
    planta_id: int

class ActivoCreate(ActivoBase):
    """Esquema para crear activo"""
    pass

class ActivoUpdate(BaseModel):
    """Esquema para actualizar activo - Solo campos básicos"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    tipo: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None
    planta_id: Optional[int] = None

class ActivoResponse(ActivoBase):
    """Esquema de respuesta para activos - Solo campos básicos"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    planta: Optional[PlantaResponse] = None

# Schemas con relaciones completas
class PlantaConActivos(PlantaResponse):
    """Planta con sus activos"""
    activos: List[ActivoResponse] = []

# === ESQUEMAS PARA PLANTA SAN PEDRO CATEGORÍAS ===

class PlantaCategoriaBase(BaseSchema):
    """Esquema base para categorías de Planta San Pedro"""
    nombre: str
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    icono: Optional[str] = None
    color: str = '#3B82F6'
    activa: bool = True

class PlantaCategoriaCreate(PlantaCategoriaBase):
    """Esquema para crear categoría de Planta San Pedro"""
    pass

class PlantaCategoriaUpdate(BaseModel):
    """Esquema para actualizar categoría de Planta San Pedro"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    icono: Optional[str] = None
    color: Optional[str] = None
    activa: Optional[bool] = None

class PlantaCategoriaResponse(PlantaCategoriaBase):
    """Esquema de respuesta para categorías de Planta San Pedro"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

# === ESQUEMAS PARA PLANTA SAN PEDRO SUBCATEGORÍAS ===

class PlantaSubcategoriaBase(BaseSchema):
    """Esquema base para subcategorías de Planta San Pedro"""
    nombre: str
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    activa: bool = True
    categoria_id: int

class PlantaSubcategoriaCreate(PlantaSubcategoriaBase):
    """Esquema para crear subcategoría de Planta San Pedro"""
    pass

class PlantaSubcategoriaUpdate(BaseModel):
    """Esquema para actualizar subcategoría de Planta San Pedro"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None
    categoria_id: Optional[int] = None

class PlantaSubcategoriaResponse(PlantaSubcategoriaBase):
    """Esquema de respuesta para subcategorías de Planta San Pedro"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    categoria: Optional[PlantaCategoriaResponse] = None

# === ESQUEMAS CON RELACIONES PARA PLANTA SAN PEDRO ===

class PlantaCategoriaConSubcategorias(PlantaCategoriaResponse):
    """Categoría de Planta San Pedro con sus subcategorías"""
    subcategorias: List[PlantaSubcategoriaResponse] = []


# ============================================================================
# ESQUEMAS B2B - Sistema independiente para formularios B2B
# ============================================================================

# === ESQUEMAS PARA B2B CIUDADES ===

class B2BCiudadBase(BaseSchema):
    """Esquema base para ciudades B2B"""
    nombre: str
    codigo: str
    descripcion: Optional[str] = None
    activa: bool = True

class B2BCiudadCreate(B2BCiudadBase):
    """Esquema para crear ciudad B2B"""
    pass

class B2BCiudadUpdate(BaseModel):
    """Esquema para actualizar ciudad B2B"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None

class B2BCiudadResponse(B2BCiudadBase):
    """Esquema de respuesta para ciudades B2B"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

# === ESQUEMAS PARA B2B RAZONES SOCIALES ===

class B2BRazonSocialBase(BaseSchema):
    """Esquema base para razones sociales B2B"""
    nombre: str
    codigo: str
    nit: Optional[str] = None
    descripcion: Optional[str] = None
    activa: bool = True
    ciudad_id: int

class B2BRazonSocialCreate(B2BRazonSocialBase):
    """Esquema para crear razón social B2B"""
    pass

class B2BRazonSocialUpdate(BaseModel):
    """Esquema para actualizar razón social B2B"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    nit: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None
    ciudad_id: Optional[int] = None

class B2BRazonSocialResponse(B2BRazonSocialBase):
    """Esquema de respuesta para razones sociales B2B"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    ciudad: Optional[B2BCiudadResponse] = None

# === ESQUEMAS PARA B2B SUCURSALES ===

class B2BSucursalBase(BaseSchema):
    """Esquema base para sucursales B2B"""
    nombre: str
    codigo: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    activa: bool = True
    ciudad_id: int
    razon_social_id: int

class B2BSucursalCreate(B2BSucursalBase):
    """Esquema para crear sucursal B2B"""
    pass

class B2BSucursalUpdate(BaseModel):
    """Esquema para actualizar sucursal B2B"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    activa: Optional[bool] = None
    ciudad_id: Optional[int] = None
    razon_social_id: Optional[int] = None

class B2BSucursalResponse(B2BSucursalBase):
    """Esquema de respuesta para sucursales B2B"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    ciudad: Optional[B2BCiudadResponse] = None
    razon_social: Optional[B2BRazonSocialResponse] = None

# === ESQUEMAS PARA B2B CATEGORÍAS ===

class B2BCategoriaBase(BaseSchema):
    """Esquema base para categorías B2B"""
    nombre: str
    codigo: str
    descripcion: Optional[str] = None
    activa: bool = True
    sucursal_id: int

class B2BCategoriaCreate(B2BCategoriaBase):
    """Esquema para crear categoría B2B"""
    pass

class B2BCategoriaUpdate(BaseModel):
    """Esquema para actualizar categoría B2B"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None
    sucursal_id: Optional[int] = None

class B2BCategoriaResponse(B2BCategoriaBase):
    """Esquema de respuesta para categorías B2B"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    sucursal: Optional[B2BSucursalResponse] = None

# === ESQUEMAS PARA B2B SUBCATEGORÍAS ===

class B2BSubcategoriaBase(BaseSchema):
    """Esquema base para subcategorías B2B"""
    nombre: str
    codigo: str
    descripcion: Optional[str] = None
    activa: bool = True
    categoria_id: int
    sucursal_id: int

class B2BSubcategoriaCreate(B2BSubcategoriaBase):
    """Esquema para crear subcategoría B2B"""
    pass

class B2BSubcategoriaUpdate(BaseModel):
    """Esquema para actualizar subcategoría B2B"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None
    categoria_id: Optional[int] = None
    sucursal_id: Optional[int] = None

class B2BSubcategoriaResponse(B2BSubcategoriaBase):
    """Esquema de respuesta para subcategorías B2B"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    categoria: Optional[B2BCategoriaResponse] = None
    sucursal: Optional[B2BSucursalResponse] = None

# === ESQUEMAS PARA B2B EQUIPOS ===

class B2BEquipoBase(BaseSchema):
    """Esquema base para equipos B2B"""
    nombre: str
    codigo: str
    modelo: Optional[str] = None
    marca: Optional[str] = None
    numero_serie: Optional[str] = None
    descripcion: Optional[str] = None
    activo: bool = True
    categoria_id: int
    subcategoria_id: int
    sucursal_id: int

class B2BEquipoCreate(B2BEquipoBase):
    """Esquema para crear equipo B2B"""
    pass

class B2BEquipoUpdate(BaseModel):
    """Esquema para actualizar equipo B2B"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    modelo: Optional[str] = None
    marca: Optional[str] = None
    numero_serie: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None
    categoria_id: Optional[int] = None
    subcategoria_id: Optional[int] = None
    sucursal_id: Optional[int] = None

class B2BEquipoResponse(B2BEquipoBase):
    """Esquema de respuesta para equipos B2B"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    categoria: Optional[B2BCategoriaResponse] = None
    subcategoria: Optional[B2BSubcategoriaResponse] = None

# === ESQUEMAS PARA B2B SOLICITUDES ===

class B2BSolicitudBase(BaseSchema):
    """Esquema base para solicitudes B2B"""
    nombre: str
    correo: EmailStr
    telefono: Optional[str] = None
    asunto: str
    descripcion: str
    ciudad_id: int
    razon_social_id: int
    sucursal_id: int
    categoria_id: int
    subcategoria_id: int
    equipo_id: int

class B2BSolicitudCreate(B2BSolicitudBase):
    """Esquema para crear solicitud B2B"""
    pass

class B2BSolicitudUpdate(BaseModel):
    """Esquema para actualizar solicitud B2B"""
    nombre: Optional[str] = None
    correo: Optional[EmailStr] = None
    telefono: Optional[str] = None
    asunto: Optional[str] = None
    descripcion: Optional[str] = None
    estado: Optional[str] = None
    motivo_cancelacion: Optional[str] = None
    asignado_a: Optional[int] = None

class B2BSolicitudResponse(B2BSolicitudBase):
    """Esquema de respuesta para solicitudes B2B"""
    id: int
    folio: str
    estado: str
    archivo_nombre: Optional[str] = None
    archivo_url: Optional[str] = None
    motivo_cancelacion: Optional[str] = None
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    asignado_a: Optional[int] = None
    
    # Información relacionada
    ciudad: Optional[B2BCiudadResponse] = None
    razon_social: Optional[B2BRazonSocialResponse] = None
    sucursal: Optional[B2BSucursalResponse] = None
    categoria: Optional[B2BCategoriaResponse] = None
    subcategoria: Optional[B2BSubcategoriaResponse] = None
    equipo: Optional[B2BEquipoResponse] = None

# === ESQUEMAS CON RELACIONES JERÁRQUICAS B2B ===

class B2BCiudadConRelaciones(B2BCiudadResponse):
    """Ciudad B2B con sus razones sociales y sucursales"""
    razones_sociales: List[B2BRazonSocialResponse] = []
    sucursales: List[B2BSucursalResponse] = []

class B2BRazonSocialConSucursales(B2BRazonSocialResponse):
    """Razón social B2B con sus sucursales"""
    sucursales: List[B2BSucursalResponse] = []

class B2BSucursalConCategorias(B2BSucursalResponse):
    """Sucursal B2B con sus categorías"""
    categorias: List[B2BCategoriaResponse] = []

class B2BCategoriaConSubcategorias(B2BCategoriaResponse):
    """Categoría B2B con sus subcategorías y equipos"""
    subcategorias: List[B2BSubcategoriaResponse] = []
    equipos: List[B2BEquipoResponse] = []

class B2BSubcategoriaConEquipos(B2BSubcategoriaResponse):
    """Subcategoría B2B con sus equipos"""
    equipos: List[B2BEquipoResponse] = []


# === ESQUEMAS PARA ÁREAS DE LOGÍSTICA ===

class AreaLogisticaBase(BaseSchema):
    """Esquema base para áreas de logística"""
    nombre: str
    codigo: str
    descripcion: Optional[str] = None
    activa: bool = True

class AreaLogisticaCreate(AreaLogisticaBase):
    """Esquema para crear área de logística"""
    pass

class AreaLogisticaUpdate(BaseModel):
    """Esquema para actualizar área de logística"""
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None

class AreaLogisticaResponse(AreaLogisticaBase):
    """Esquema de respuesta para áreas de logística"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None


# === ESQUEMAS PARA MÓDULO FINANCIERO B2B ===

class CarteraResponse(BaseSchema):
    """Schema de respuesta para consulta de cartera"""
    nit: str
    razon_social: str
    sucursal: str
    tipo_cliente: str


class FacturaCreate(BaseModel):
    """Schema para crear una nueva factura"""
    # Datos del solicitante
    nombre: str
    correo_electronico: EmailStr
    telefono: str
    asunto: str
    
    # Datos de facturación (desde Cartera)
    nit: str
    razon_social: str
    sucursal: str
    tipo_cliente: str
    nro_docto_cruce: str
    
    # Datos financieros
    valor_total_cop: float
    descripcion_adicional: Optional[str] = None
    archivo_url: Optional[str] = None
    
    @field_validator('valor_total_cop')
    @classmethod
    def validate_valor_positivo(cls, v):
        if v <= 0:
            raise ValueError('El valor total debe ser mayor a cero')
        return v


class FacturaResponse(BaseSchema):
    """Schema de respuesta para una factura"""
    id: int
    
    # Datos del solicitante
    nombre: str
    correo_electronico: str
    telefono: str
    asunto: str
    
    # Datos de facturación
    nit: str
    razon_social: str
    sucursal: str
    tipo_cliente: str
    nro_docto_cruce: str
    
    # Datos financieros
    valor_total_cop: float
    descripcion_adicional: Optional[str]
    archivo_url: Optional[str]
    
    # Estado y trazabilidad
    estado: str
    fecha_creacion: datetime
    fecha_actualizacion: datetime


class FacturaUpdate(BaseModel):
    """Schema para actualizar el estado de una factura"""
    estado: str
    
    @field_validator('estado')
    @classmethod
    def validate_estado(cls, v):
        estados_validos = ['Pendiente', 'Aprobada', 'Rechazada']
        if v not in estados_validos:
            raise ValueError(f'Estado debe ser uno de: {", ".join(estados_validos)}')
        return v


class FacturasListResponse(BaseSchema):
    """Schema de respuesta para lista de facturas con paginación"""
    facturas: List[FacturaResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
