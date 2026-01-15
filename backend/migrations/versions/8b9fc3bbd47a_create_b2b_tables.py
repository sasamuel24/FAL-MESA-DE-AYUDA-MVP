"""create_b2b_tables

Revision ID: 8b9fc3bbd47a
Revises: add_organizaciones_001
Create Date: 2025-10-07 16:02:30.261510

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b9fc3bbd47a'
down_revision: Union[str, Sequence[str], None] = 'add_organizaciones_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Crear todas las tablas B2B."""
    
    # Tabla B2B Ciudades
    op.create_table('b2b_ciudades',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('codigo', sa.String(length=10), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('activa', sa.Boolean(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre'),
        sa.UniqueConstraint('codigo')
    )
    op.create_index(op.f('ix_b2b_ciudades_id'), 'b2b_ciudades', ['id'], unique=False)
    
    # Tabla B2B Razones Sociales
    op.create_table('b2b_razones_sociales',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=200), nullable=False),
        sa.Column('codigo', sa.String(length=20), nullable=False),
        sa.Column('nit', sa.String(length=20), nullable=True),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('activa', sa.Boolean(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.Column('ciudad_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['ciudad_id'], ['b2b_ciudades.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('codigo')
    )
    op.create_index(op.f('ix_b2b_razones_sociales_id'), 'b2b_razones_sociales', ['id'], unique=False)
    
    # Tabla B2B Sucursales
    op.create_table('b2b_sucursales',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=150), nullable=False),
        sa.Column('codigo', sa.String(length=20), nullable=False),
        sa.Column('direccion', sa.String(length=200), nullable=True),
        sa.Column('telefono', sa.String(length=20), nullable=True),
        sa.Column('activa', sa.Boolean(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.Column('ciudad_id', sa.Integer(), nullable=False),
        sa.Column('razon_social_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['ciudad_id'], ['b2b_ciudades.id'], ),
        sa.ForeignKeyConstraint(['razon_social_id'], ['b2b_razones_sociales.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_b2b_sucursales_id'), 'b2b_sucursales', ['id'], unique=False)
    
    # Tabla B2B Categorías
    op.create_table('b2b_categorias',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('codigo', sa.String(length=20), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('activa', sa.Boolean(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.Column('sucursal_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['sucursal_id'], ['b2b_sucursales.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_b2b_categorias_id'), 'b2b_categorias', ['id'], unique=False)
    
    # Tabla B2B Subcategorías
    op.create_table('b2b_subcategorias',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('codigo', sa.String(length=20), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('activa', sa.Boolean(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.Column('categoria_id', sa.Integer(), nullable=False),
        sa.Column('sucursal_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['categoria_id'], ['b2b_categorias.id'], ),
        sa.ForeignKeyConstraint(['sucursal_id'], ['b2b_sucursales.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_b2b_subcategorias_id'), 'b2b_subcategorias', ['id'], unique=False)
    
    # Tabla B2B Equipos
    op.create_table('b2b_equipos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=150), nullable=False),
        sa.Column('codigo', sa.String(length=30), nullable=False),
        sa.Column('modelo', sa.String(length=100), nullable=True),
        sa.Column('marca', sa.String(length=100), nullable=True),
        sa.Column('numero_serie', sa.String(length=100), nullable=True),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.Column('categoria_id', sa.Integer(), nullable=False),
        sa.Column('subcategoria_id', sa.Integer(), nullable=False),
        sa.Column('sucursal_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['categoria_id'], ['b2b_categorias.id'], ),
        sa.ForeignKeyConstraint(['subcategoria_id'], ['b2b_subcategorias.id'], ),
        sa.ForeignKeyConstraint(['sucursal_id'], ['b2b_sucursales.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_b2b_equipos_id'), 'b2b_equipos', ['id'], unique=False)
    
    # Tabla B2B Solicitudes
    op.create_table('b2b_solicitudes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('folio', sa.String(length=20), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('correo', sa.String(length=120), nullable=False),
        sa.Column('telefono', sa.String(length=20), nullable=True),
        sa.Column('asunto', sa.String(length=200), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=False),
        sa.Column('archivo_nombre', sa.String(length=255), nullable=True),
        sa.Column('archivo_url', sa.String(length=500), nullable=True),
        sa.Column('archivo_s3_key', sa.String(length=255), nullable=True),
        sa.Column('estado', sa.String(length=20), nullable=True),
        sa.Column('motivo_cancelacion', sa.Text(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.Column('ciudad_id', sa.Integer(), nullable=False),
        sa.Column('razon_social_id', sa.Integer(), nullable=False),
        sa.Column('sucursal_id', sa.Integer(), nullable=False),
        sa.Column('categoria_id', sa.Integer(), nullable=False),
        sa.Column('subcategoria_id', sa.Integer(), nullable=False),
        sa.Column('equipo_id', sa.Integer(), nullable=False),
        sa.Column('asignado_a', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['asignado_a'], ['users.id'], ),
        sa.ForeignKeyConstraint(['categoria_id'], ['b2b_categorias.id'], ),
        sa.ForeignKeyConstraint(['ciudad_id'], ['b2b_ciudades.id'], ),
        sa.ForeignKeyConstraint(['equipo_id'], ['b2b_equipos.id'], ),
        sa.ForeignKeyConstraint(['razon_social_id'], ['b2b_razones_sociales.id'], ),
        sa.ForeignKeyConstraint(['subcategoria_id'], ['b2b_subcategorias.id'], ),
        sa.ForeignKeyConstraint(['sucursal_id'], ['b2b_sucursales.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('folio')
    )
    op.create_index(op.f('ix_b2b_solicitudes_id'), 'b2b_solicitudes', ['id'], unique=False)
    op.create_index(op.f('ix_b2b_solicitudes_folio'), 'b2b_solicitudes', ['folio'], unique=False)


def downgrade() -> None:
    """Downgrade schema - Eliminar todas las tablas B2B."""
    
    # Eliminar en orden inverso por las foreign keys
    op.drop_index(op.f('ix_b2b_solicitudes_folio'), table_name='b2b_solicitudes')
    op.drop_index(op.f('ix_b2b_solicitudes_id'), table_name='b2b_solicitudes')
    op.drop_table('b2b_solicitudes')
    
    op.drop_index(op.f('ix_b2b_equipos_id'), table_name='b2b_equipos')
    op.drop_table('b2b_equipos')
    
    op.drop_index(op.f('ix_b2b_subcategorias_id'), table_name='b2b_subcategorias')
    op.drop_table('b2b_subcategorias')
    
    op.drop_index(op.f('ix_b2b_categorias_id'), table_name='b2b_categorias')
    op.drop_table('b2b_categorias')
    
    op.drop_index(op.f('ix_b2b_sucursales_id'), table_name='b2b_sucursales')
    op.drop_table('b2b_sucursales')
    
    op.drop_index(op.f('ix_b2b_razones_sociales_id'), table_name='b2b_razones_sociales')
    op.drop_table('b2b_razones_sociales')
    
    op.drop_index(op.f('ix_b2b_ciudades_id'), table_name='b2b_ciudades')
    op.drop_table('b2b_ciudades')
