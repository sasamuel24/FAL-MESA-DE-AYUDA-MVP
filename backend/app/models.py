"""
Modelos SQLAlchemy para FastAPI - Compatibles con BD existente
Ajustados para coincidir con la estructura actual de PostgreSQL
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, foreign
from datetime import datetime

Base = declarative_base()

class User(Base):
    """Modelo de usuarios - Compatible con estructura existente"""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(20), nullable=False)  # 'admin', 'tecnico', 'jefe_zona', 'gerente_tiendas', 'mercadeo'
    area = Column(String(100))
    activo = Column(Boolean, default=True)
    # Usar nombres compatibles con BD existente
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones - eliminar la problemática por ahora
    work_orders_created = relationship("WorkOrder", foreign_keys="WorkOrder.created_by", back_populates="creator")
    work_orders_assigned = relationship("WorkOrder", foreign_keys="WorkOrder.assigned_to", back_populates="assignee")
    # notas_trazables = relationship("NotasTrazablesOT", back_populates="usuario") # Comentar hasta arreglar FK
    
    def __repr__(self):
        return f'<User {self.email}>'

class B2CSolicitudes(Base):
    """Solicitudes B2C - Compatible con estructura existente"""
    __tablename__ = 'b2c_solicitudes'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    correo = Column(String(120), nullable=False)
    telefono = Column(String(20))
    asunto = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=False)
    
    # Campos existentes en BD
    zona = Column(String(50), nullable=False)  # NOT NULL en BD actual
    ciudad = Column(String(50), nullable=False)  # NOT NULL en BD actual
    tienda = Column(String(100), nullable=False)  # NOT NULL en BD actual
    categoria = Column(String(50), nullable=False)  # NOT NULL en BD actual
    subcategoria = Column(String(50), nullable=False)  # NOT NULL en BD actual
    
    archivo_nombre = Column(String(255))
    archivo_url = Column(String(500))
    estado = Column(String(20), default='nueva')
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Campos que existen en BD actual
    motivo_cancelacion = Column(Text)
    archivo_s3_key = Column(String(255))
    
    # Campo para identificar el tipo de formulario
    tipo_formulario = Column(String(50), default='b2c')
    
    # Campos específicos para Planta San Pedro
    planta = Column(String(100), nullable=True)
    activo = Column(String(100), nullable=True)
    
    # Campo para asignación automática
    asignado_a = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Relaciones
    ots = relationship("OTSolicitud", 
                      primaryjoin="and_(B2CSolicitudes.id == foreign(OTSolicitud.solicitud_id), OTSolicitud.tipo_solicitud == 'B2C')",
                      back_populates="solicitud_b2c",
                      overlaps="solicitud_b2b,ots")
    asignado = relationship("User", foreign_keys=[asignado_a])
    
    @property
    def folio(self):
        """Generar folio basado en ID para compatibilidad con frontend"""
        return f"B2C-{self.id:05d}" if self.id else None
    
    def to_dict(self, include_full_url=False, base_url=""):
        """Convertir solicitud a diccionario para respuestas JSON"""
        return {
            'id': self.id,
            'folio': self.folio,
            'nombre': self.nombre,
            'correo': self.correo,
            'telefono': self.telefono,
            'asunto': self.asunto,
            'descripcion': self.descripcion,
            'zona': self.zona,
            'ciudad': self.ciudad,
            'tienda': self.tienda,
            'categoria': self.categoria,
            'subcategoria': self.subcategoria,
            'estado': self.estado,
            'archivo_nombre': self.archivo_nombre,
            'archivo_url': self.archivo_url if include_full_url and self.archivo_url else self.archivo_url,
            'motivo_cancelacion': self.motivo_cancelacion,
            'tipo_formulario': self.tipo_formulario,
            'planta': self.planta,
            'activo': self.activo,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'fecha_actualizacion': self.fecha_actualizacion.isoformat() if self.fecha_actualizacion else None,
            'asignado_a': self.asignado_a
        }
    
    def __repr__(self):
        return f'<B2CSolicitudes {self.folio} - {self.asunto}>'

class EtapaOT(Base):
    """Etapas OT - Compatible con estructura existente"""
    __tablename__ = 'etapas_ot'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)
    descripcion = Column(Text)
    color = Column(String(7), default='#3B82F6')  # Mantener longitud de BD existente
    orden = Column(Integer, default=0)
    es_final = Column(Boolean, default=False)
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    
    # Campos existentes en BD
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    icono = Column(String(50))
    
    def __repr__(self):
        return f'<EtapaOT {self.nombre}>'

class OTSolicitud(Base):
    """Órdenes de Trabajo - Compatible con estructura existente"""
    __tablename__ = 'ot_solicitudes'
    
    id = Column(Integer, primary_key=True, index=True)
    folio = Column(Integer, unique=True, nullable=False, index=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_visita = Column(DateTime)
    fecha_completada = Column(DateTime)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Información básica
    asunto = Column(String(200), nullable=False)
    categoria = Column(String(100))
    subcategoria = Column(String(100))
    zona = Column(String(100))
    ciudad = Column(String(100))
    tienda = Column(String(100))
    
    # Estado y asignación - Compatible con BD existente
    tecnico_asignado = Column(String(200), nullable=False)  # NOT NULL en BD actual
    etapa = Column(String(50), default='Pendiente')
    prioridad = Column(String(20), default='Media')
    tipo_mantenimiento = Column(String(50), default='correctivo')
    tiempo_estimado = Column(String(100))
    notas = Column(Text)
    
    # Relaciones - Soporta tanto B2C como B2B
    solicitud_id = Column(Integer, nullable=False)  # ID de la solicitud (B2C o B2B)
    tipo_solicitud = Column(String(10), default='B2C')  # 'B2C' o 'B2B' para identificar el tipo
    
    # Relaciones separadas para B2C y B2B
    solicitud_b2c = relationship("B2CSolicitudes", 
                                primaryjoin="and_(foreign(OTSolicitud.solicitud_id) == B2CSolicitudes.id, OTSolicitud.tipo_solicitud == 'B2C')",
                                back_populates="ots", viewonly=True)
    solicitud_b2b = relationship("B2BSolicitud", 
                                primaryjoin="and_(foreign(OTSolicitud.solicitud_id) == B2BSolicitud.id, OTSolicitud.tipo_solicitud == 'B2B')",
                                back_populates="ots", viewonly=True)
    
    archivos = relationship("ArchivosAdjuntosOT", back_populates="ot")
    notas_trazables = relationship("NotasTrazablesOT", back_populates="ot")
    historial_etapas = relationship("HistorialEtapa", back_populates="ot")
    firmas = relationship("FirmaConformidad", back_populates="ot")
    alertas = relationship("AlertaTecnico", back_populates="ot")
    
    def __repr__(self):
        return f'<OTSolicitud {self.folio} - {self.asunto}>'

class WorkOrder(Base):
    """Órdenes de trabajo - Compatible con estructura existente"""
    __tablename__ = 'work_orders'
    
    id = Column(Integer, primary_key=True, index=True)
    folio = Column(String(50), unique=True, nullable=False, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=False)
    estado = Column(String(20), default='pendiente')
    prioridad = Column(String(20), default='media')
    
    # Fechas
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_programada = Column(DateTime)
    fecha_completada = Column(DateTime)
    
    # Asignación
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    assigned_to = Column(Integer, ForeignKey('users.id'))
    
    # Campos adicionales - Compatible con BD existente
    request_id = Column(Integer)  # Sin FK por compatibilidad
    observaciones = Column(Text)
    tiempo_estimado = Column(Integer)  # En minutos
    tiempo_real = Column(Integer)  # En minutos
    materiales_usados = Column(JSON)  # JSON como en BD actual
    
    # Relaciones
    creator = relationship("User", foreign_keys=[created_by], back_populates="work_orders_created")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="work_orders_assigned")
    
    def __repr__(self):
        return f'<WorkOrder {self.folio} - {self.titulo}>'

class HistorialEtapa(Base):
    """Historial de etapas - Compatible con estructura existente"""
    __tablename__ = 'historial_etapas'
    
    id = Column(Integer, primary_key=True, index=True)
    ot_id = Column(Integer, ForeignKey('ot_solicitudes.id'), nullable=False)
    etapa_anterior = Column(String(100))  # Mantener longitud de BD existente
    etapa_nueva = Column(String(100), nullable=False)  # Mantener longitud de BD existente
    usuario_cambio = Column(String(200), nullable=False)  # Mantener longitud de BD existente
    comentario = Column(Text)
    fecha_cambio = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    ot = relationship("OTSolicitud", back_populates="historial_etapas")
    
    def __repr__(self):
        return f'<HistorialEtapa OT:{self.ot_id} {self.etapa_anterior}->{self.etapa_nueva}>'

class NotasTrazablesOT(Base):
    """Notas trazables - Compatible con estructura existente"""
    __tablename__ = 'notas_trazables_ot'
    
    id = Column(Integer, primary_key=True, index=True)
    nota = Column(Text, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    
    # Campos existentes en BD actual (usar ot_folio en lugar de ot_id)
    ot_folio = Column(Integer, ForeignKey('ot_solicitudes.folio'), nullable=False)
    nombre_usuario = Column(String(100), nullable=False)
    rol_usuario = Column(String(20))
    creado_por = Column(String(120))
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones usando el folio
    ot = relationship("OTSolicitud", foreign_keys=[ot_folio], primaryjoin="NotasTrazablesOT.ot_folio==OTSolicitud.folio")
    
    def __repr__(self):
        return f'<NotaTrazable OT:{self.ot_folio} por {self.creado_por}>'

class ArchivosAdjuntosOT(Base):
    """Archivos adjuntos - Compatible con estructura existente"""
    __tablename__ = 'archivos_adjuntos_ot'
    
    id = Column(Integer, primary_key=True, index=True)
    ot_id = Column(Integer, ForeignKey('ot_solicitudes.id'), nullable=False)
    nombre_original = Column(String(255), nullable=False)
    tipo_archivo = Column(String(100))
    fecha_subida = Column(DateTime, default=datetime.utcnow)
    
    # Campos existentes en BD actual
    ruta_archivo = Column(String(500))
    s3_key = Column(String(500))
    s3_url = Column(String(500))
    descripcion = Column(Text)
    nombre_guardado = Column(String(255))
    tamaño_archivo = Column(Integer)
    nombre_tecnico = Column(String(100))
    subido_por = Column(String(200))
    
    # Relaciones
    ot = relationship("OTSolicitud", back_populates="archivos")
    
    def __repr__(self):
        return f'<ArchivoAdjunto {self.nombre_original} - OT:{self.ot_id}>'

class FirmaConformidad(Base):
    """Firmas de conformidad - Compatible con estructura existente"""
    __tablename__ = 'firmas_conformidad'
    
    id = Column(Integer, primary_key=True, index=True)
    ot_id = Column(Integer, ForeignKey('ot_solicitudes.id'), nullable=False)
    fecha_firma = Column(DateTime, default=datetime.utcnow)
    
    # Campos existentes en BD actual
    numero_registro = Column(String(50), unique=True)
    nombre_cliente = Column(String(100))
    nombre_tecnico = Column(String(100))
    firma_cliente = Column(Text)
    firma_tecnico = Column(Text)
    observaciones = Column(Text)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    ot = relationship("OTSolicitud", back_populates="firmas")
    
    def __repr__(self):
        return f'<FirmaConformidad {self.numero_registro} - OT:{self.ot_id}>'

class Request(Base):
    """Solicitudes tradicionales - Compatible con estructura existente"""
    __tablename__ = 'requests'
    
    id = Column(Integer, primary_key=True, index=True)
    folio = Column(String(50), unique=True, nullable=False, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=False)
    estado = Column(String(20), default='pendiente')
    prioridad = Column(String(20), default='media')
    
    # Foreign keys
    organization_id = Column(Integer, nullable=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Fechas
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_vencimiento = Column(DateTime)
    fecha_completada = Column(DateTime)
    
    # Campos existentes en BD actual
    cliente_nombre = Column(String(100))
    cliente_correo = Column(String(120))
    cliente_telefono = Column(String(20))
    zona = Column(String(50))
    ciudad = Column(String(50))
    tienda = Column(String(100))
    categoria = Column(String(50))
    subcategoria = Column(String(50))
    etapa = Column(String(50))
    observaciones = Column(Text)
    archivos = Column(Text)
    
    def __repr__(self):
        return f'<Request {self.folio} - {self.titulo}>'


# Nuevos modelos para el sistema dinámico de organizaciones
class Zona(Base):
    """Modelo para zonas geográficas"""
    __tablename__ = 'zonas'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)
    codigo = Column(String(20), unique=True)  # Código opcional para identificación
    descripcion = Column(Text)
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    ciudades = relationship("Ciudad", back_populates="zona", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Zona {self.nombre}>'


class Ciudad(Base):
    """Modelo para ciudades dentro de zonas"""
    __tablename__ = 'ciudades'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    codigo = Column(String(20))
    descripcion = Column(Text)
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    zona_id = Column(Integer, ForeignKey('zonas.id'), nullable=False)
    
    # Relaciones
    zona = relationship("Zona", back_populates="ciudades")
    tiendas = relationship("Tienda", back_populates="ciudad", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Ciudad {self.nombre} - {self.zona.nombre if self.zona else "Sin zona"}>'


class Tienda(Base):
    """Modelo para tiendas/locales dentro de ciudades"""
    __tablename__ = 'tiendas'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    codigo = Column(String(20))
    direccion = Column(String(200))
    telefono = Column(String(20))
    email = Column(String(120))
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    ciudad_id = Column(Integer, ForeignKey('ciudades.id'), nullable=False)
    
    # Relaciones
    ciudad = relationship("Ciudad", back_populates="tiendas")
    
    def __repr__(self):
        return f'<Tienda {self.nombre} - {self.ciudad.nombre if self.ciudad else "Sin ciudad"}>'


class Categoria(Base):
    """Modelo para categorías de servicios"""
    __tablename__ = 'categorias'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)
    codigo = Column(String(20), unique=True)
    descripcion = Column(Text)
    icono = Column(String(50))  # Para FontAwesome o similar
    color = Column(String(7), default='#3B82F6')  # Color hex
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    subcategorias = relationship("Subcategoria", back_populates="categoria", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Categoria {self.nombre}>'


class Subcategoria(Base):
    """Modelo para subcategorías de servicios"""
    __tablename__ = 'subcategorias'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    codigo = Column(String(20))
    descripcion = Column(Text)
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    categoria_id = Column(Integer, ForeignKey('categorias.id'), nullable=False)
    
    # Relaciones
    categoria = relationship("Categoria", back_populates="subcategorias")
    
    def __repr__(self):
        return f'<Subcategoria {self.nombre} - {self.categoria.nombre if self.categoria else "Sin categoría"}>'


class Planta(Base):
    """Modelo para plantas de producción"""
    __tablename__ = 'plantas'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    codigo = Column(String(20), nullable=False)  # Permitir códigos duplicados (ej: MANTENIMIENTO)
    descripcion = Column(Text)
    ubicacion = Column(String(200))
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    activos = relationship("Activo", back_populates="planta", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Planta {self.nombre} ({self.codigo})>'


class Activo(Base):
    """Modelo para activos de plantas - Solo campos básicos existentes"""
    __tablename__ = 'activos'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    codigo = Column(String(50))
    tipo = Column(String, nullable=False)  # Campo requerido por la BD
    descripcion = Column(Text)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys - solo planta_id que sabemos que existe
    planta_id = Column(Integer, ForeignKey('plantas.id'), nullable=False)
    
    # Relaciones
    planta = relationship("Planta", back_populates="activos")
    
    def __repr__(self):
        return f'<Activo {self.nombre} - {self.planta.nombre if self.planta else "Sin planta"}>'

# === MODELOS ESPECÍFICOS PARA PLANTA SAN PEDRO ===

class PlantaCategoria(Base):
    """Categorías específicas para Planta San Pedro"""
    __tablename__ = 'planta_categorias'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    codigo = Column(String(50))
    descripcion = Column(Text)
    icono = Column(String(50))  # Icono para la UI
    color = Column(String(7), default='#3B82F6')  # Color hex para la UI
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    subcategorias = relationship("PlantaSubcategoria", back_populates="categoria", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<PlantaCategoria {self.nombre}>'

class PlantaSubcategoria(Base):
    """Subcategorías específicas para Planta San Pedro"""
    __tablename__ = 'planta_subcategorias'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    codigo = Column(String(50))
    descripcion = Column(Text)
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    categoria_id = Column(Integer, ForeignKey('planta_categorias.id'), nullable=False)
    
    # Relaciones
    categoria = relationship("PlantaCategoria", back_populates="subcategorias")
    
    def __repr__(self):
        return f'<PlantaSubcategoria {self.nombre} - {self.categoria.nombre if self.categoria else "Sin categoría"}>'


# ============================================================================
# MODELOS B2B - Sistema independiente para formularios B2B
# ============================================================================

class B2BCiudad(Base):
    """Ciudades específicas para formularios B2B"""
    __tablename__ = 'b2b_ciudades'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)
    codigo = Column(String(10), nullable=False, unique=True)
    descripcion = Column(Text)
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    razones_sociales = relationship("B2BRazonSocial", back_populates="ciudad", cascade="all, delete-orphan")
    sucursales = relationship("B2BSucursal", back_populates="ciudad", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<B2BCiudad {self.nombre} ({self.codigo})>'

class B2BRazonSocial(Base):
    """Razones Sociales específicas para formularios B2B"""
    __tablename__ = 'b2b_razones_sociales'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    codigo = Column(String(20), nullable=False, unique=True)
    nit = Column(String(20))
    descripcion = Column(Text)
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    ciudad_id = Column(Integer, ForeignKey('b2b_ciudades.id'), nullable=False)
    
    # Relaciones
    ciudad = relationship("B2BCiudad", back_populates="razones_sociales")
    sucursales = relationship("B2BSucursal", back_populates="razon_social", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<B2BRazonSocial {self.nombre} - {self.ciudad.nombre if self.ciudad else "Sin ciudad"}>'

class B2BSucursal(Base):
    """Sucursales específicas para formularios B2B"""
    __tablename__ = 'b2b_sucursales'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    codigo = Column(String(20), nullable=False)
    direccion = Column(String(200))
    telefono = Column(String(20))
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    ciudad_id = Column(Integer, ForeignKey('b2b_ciudades.id'), nullable=False)
    razon_social_id = Column(Integer, ForeignKey('b2b_razones_sociales.id'), nullable=False)
    
    # Relaciones
    ciudad = relationship("B2BCiudad", back_populates="sucursales")
    razon_social = relationship("B2BRazonSocial", back_populates="sucursales")
    categorias = relationship("B2BCategoria", back_populates="sucursal", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<B2BSucursal {self.nombre} - {self.razon_social.nombre if self.razon_social else "Sin razón social"}>'

class B2BCategoria(Base):
    """Categorías específicas para formularios B2B"""
    __tablename__ = 'b2b_categorias'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    codigo = Column(String(20), nullable=False)
    descripcion = Column(Text)
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    sucursal_id = Column(Integer, ForeignKey('b2b_sucursales.id'), nullable=False)
    
    # Relaciones
    sucursal = relationship("B2BSucursal", back_populates="categorias")
    subcategorias = relationship("B2BSubcategoria", back_populates="categoria", cascade="all, delete-orphan")
    equipos = relationship("B2BEquipo", back_populates="categoria", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<B2BCategoria {self.nombre} - {self.sucursal.nombre if self.sucursal else "Sin sucursal"}>'

class B2BSubcategoria(Base):
    """Subcategorías específicas para formularios B2B"""
    __tablename__ = 'b2b_subcategorias'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    codigo = Column(String(20), nullable=False)
    descripcion = Column(Text)
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    categoria_id = Column(Integer, ForeignKey('b2b_categorias.id'), nullable=False)
    sucursal_id = Column(Integer, ForeignKey('b2b_sucursales.id'), nullable=False)
    
    # Relaciones
    categoria = relationship("B2BCategoria", back_populates="subcategorias")
    sucursal = relationship("B2BSucursal")
    equipos = relationship("B2BEquipo", back_populates="subcategoria", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<B2BSubcategoria {self.nombre} - {self.categoria.nombre if self.categoria else "Sin categoría"}>'

class B2BEquipo(Base):
    """Equipos específicos para formularios B2B"""
    __tablename__ = 'b2b_equipos'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    codigo = Column(String(30), nullable=False)
    modelo = Column(String(100))
    marca = Column(String(100))
    numero_serie = Column(String(100))
    descripcion = Column(Text)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    categoria_id = Column(Integer, ForeignKey('b2b_categorias.id'), nullable=False)
    subcategoria_id = Column(Integer, ForeignKey('b2b_subcategorias.id'), nullable=False)
    sucursal_id = Column(Integer, ForeignKey('b2b_sucursales.id'), nullable=False)
    
    # Relaciones
    categoria = relationship("B2BCategoria", back_populates="equipos")
    subcategoria = relationship("B2BSubcategoria", back_populates="equipos")
    sucursal = relationship("B2BSucursal")
    
    def __repr__(self):
        return f'<B2BEquipo {self.nombre} - {self.subcategoria.nombre if self.subcategoria else "Sin subcategoría"}>'

class B2BSolicitud(Base):
    """Solicitudes específicas para formularios B2B"""
    __tablename__ = 'b2b_solicitudes'
    
    id = Column(Integer, primary_key=True, index=True)
    folio = Column(String(20), unique=True, nullable=False, index=True)
    
    # Información del solicitante
    nombre = Column(String(100), nullable=False)
    correo = Column(String(120), nullable=False)
    telefono = Column(String(20))
    
    # Información de la solicitud
    asunto = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=False)
    
    # Archivos adjuntos
    archivo_nombre = Column(String(255))
    archivo_url = Column(String(500))
    archivo_s3_key = Column(String(255))
    
    # Estado y seguimiento
    estado = Column(String(20), default='nueva')  # nueva, en_proceso, completada, cancelada
    motivo_cancelacion = Column(Text)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys - Referencias a las entidades B2B
    ciudad_id = Column(Integer, ForeignKey('b2b_ciudades.id'), nullable=False)
    razon_social_id = Column(Integer, ForeignKey('b2b_razones_sociales.id'), nullable=False)
    sucursal_id = Column(Integer, ForeignKey('b2b_sucursales.id'), nullable=False)
    categoria_id = Column(Integer, ForeignKey('b2b_categorias.id'), nullable=False)
    subcategoria_id = Column(Integer, ForeignKey('b2b_subcategorias.id'), nullable=False)
    equipo_id = Column(Integer, ForeignKey('b2b_equipos.id'), nullable=False)
    
    # Asignación
    asignado_a = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Relaciones
    ciudad = relationship("B2BCiudad")
    razon_social = relationship("B2BRazonSocial")
    sucursal = relationship("B2BSucursal")
    categoria = relationship("B2BCategoria")
    subcategoria = relationship("B2BSubcategoria")
    equipo = relationship("B2BEquipo")
    asignado = relationship("User", foreign_keys=[asignado_a])
    ots = relationship("OTSolicitud", 
                      primaryjoin="and_(B2BSolicitud.id == foreign(OTSolicitud.solicitud_id), OTSolicitud.tipo_solicitud == 'B2B')",
                      back_populates="solicitud_b2b",
                      overlaps="solicitud_b2c,ots")
    
    def to_dict(self, include_full_url=False, base_url=""):
        """Convertir solicitud B2B a diccionario para respuestas JSON"""
        return {
            'id': self.id,
            'folio': self.folio,
            'nombre': self.nombre,
            'correo': self.correo,
            'telefono': self.telefono,
            'asunto': self.asunto,
            'descripcion': self.descripcion,
            'estado': self.estado,
            'archivo_nombre': self.archivo_nombre,
            'archivo_url': self.archivo_url if include_full_url and self.archivo_url else self.archivo_url,
            'motivo_cancelacion': self.motivo_cancelacion,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'fecha_actualizacion': self.fecha_actualizacion.isoformat() if self.fecha_actualizacion else None,
            'asignado_a': self.asignado_a,
            # Información relacionada
            'ciudad': self.ciudad.nombre if self.ciudad else None,
            'razon_social': self.razon_social.nombre if self.razon_social else None,
            'sucursal': self.sucursal.nombre if self.sucursal else None,
            'categoria': self.categoria.nombre if self.categoria else None,
            'subcategoria': self.subcategoria.nombre if self.subcategoria else None,
            'equipo': self.equipo.nombre if self.equipo else None
        }
    
    def __repr__(self):
        return f'<B2BSolicitud {self.folio} - {self.asunto}>'


class AlertaTecnico(Base):
    """Modelo para rastrear alertas enviadas a técnicos"""
    __tablename__ = 'alertas_tecnico'
    
    id = Column(Integer, primary_key=True, index=True)
    ot_id = Column(Integer, ForeignKey('ot_solicitudes.id'), nullable=False)
    tecnico_email = Column(String(120), nullable=False)
    mensaje = Column(Text, nullable=False)
    enviado_por = Column(String(100), nullable=False)  # Usuario que envió la alerta
    fecha_envio = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relaciones
    ot = relationship("OTSolicitud", back_populates="alertas")
    
    def __repr__(self):
        return f'<AlertaTecnico OT:{self.ot_id} - {self.fecha_envio}>'


class AreaLogistica(Base):
    """Modelo para áreas de logística gestionables"""
    __tablename__ = 'areas_logistica'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)
    codigo = Column(String(50), nullable=False)  # Removido unique=True para permitir códigos duplicados
    descripcion = Column(Text)
    activa = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<AreaLogistica {self.nombre} ({self.codigo})>'


class Cartera(Base):
    """Modelo para documentos de cartera (consulta de clientes B2B)"""
    __tablename__ = 'cartera'
    
    id = Column(Integer, primary_key=True, index=True)
    nit = Column(String(50), nullable=False)
    razon_social = Column(String(200), nullable=False)
    sucursal = Column(String(100), nullable=False)
    tipo_cliente = Column(String(50), nullable=False)  # 'B2B', 'B2C'
    nro_docto_cruce = Column(String(100), unique=True, index=True, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Cartera {self.razon_social} - {self.nro_docto_cruce}>'


class Factura(Base):
    """Modelo para facturas del módulo financiero B2B"""
    __tablename__ = 'facturas'
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Datos del solicitante
    nombre = Column(String(200), nullable=False)
    correo_electronico = Column(String(150), nullable=False)
    telefono = Column(String(50), nullable=False)
    asunto = Column(String(300), nullable=False)
    
    # Datos de facturación (autocompletados desde Cartera)
    nit = Column(String(50), nullable=False)
    razon_social = Column(String(200), nullable=False)
    sucursal = Column(String(100), nullable=False)
    tipo_cliente = Column(String(50), nullable=False)
    nro_docto_cruce = Column(String(100), nullable=False, index=True)
    
    # Datos financieros
    valor_total_cop = Column(Float, nullable=False)
    descripcion_adicional = Column(Text)  # Opcional
    archivo_url = Column(String(500))  # Opcional - URL de archivo en S3
    
    # Estado y trazabilidad
    estado = Column(String(50), default='Pendiente')  # 'Pendiente' | 'Aprobada' | 'Rechazada'
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Factura {self.id} - {self.razon_social} - ${self.valor_total_cop} - {self.estado}>'

