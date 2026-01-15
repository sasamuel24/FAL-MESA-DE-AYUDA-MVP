"""Agregar sistema de organizaciones dinamico

Revision ID: add_organizaciones_001
Revises: 
Create Date: 2025-09-28 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_organizaciones_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Crear tabla zonas
    op.create_table('zonas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('codigo', sa.String(length=20), nullable=True),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('activa', sa.Boolean(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre')
    )
    op.create_index(op.f('ix_zonas_id'), 'zonas', ['id'], unique=False)
    
    # Crear tabla ciudades
    op.create_table('ciudades',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('codigo', sa.String(length=20), nullable=True),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('activa', sa.Boolean(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.Column('zona_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['zona_id'], ['zonas.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ciudades_id'), 'ciudades', ['id'], unique=False)
    
    # Crear tabla tiendas
    op.create_table('tiendas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('codigo', sa.String(length=20), nullable=True),
        sa.Column('direccion', sa.String(length=200), nullable=True),
        sa.Column('telefono', sa.String(length=20), nullable=True),
        sa.Column('email', sa.String(length=120), nullable=True),
        sa.Column('activa', sa.Boolean(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.Column('ciudad_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['ciudad_id'], ['ciudades.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tiendas_id'), 'tiendas', ['id'], unique=False)
    
    # Crear tabla categorias
    op.create_table('categorias',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('codigo', sa.String(length=20), nullable=True),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('icono', sa.String(length=50), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('activa', sa.Boolean(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('codigo'),
        sa.UniqueConstraint('nombre')
    )
    op.create_index(op.f('ix_categorias_id'), 'categorias', ['id'], unique=False)
    
    # Crear tabla subcategorias
    op.create_table('subcategorias',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('codigo', sa.String(length=20), nullable=True),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('activa', sa.Boolean(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.Column('categoria_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['categoria_id'], ['categorias.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subcategorias_id'), 'subcategorias', ['id'], unique=False)


def downgrade() -> None:
    # Eliminar tablas en orden inverso por las foreign keys
    op.drop_index(op.f('ix_subcategorias_id'), table_name='subcategorias')
    op.drop_table('subcategorias')
    op.drop_index(op.f('ix_categorias_id'), table_name='categorias')
    op.drop_table('categorias')
    op.drop_index(op.f('ix_tiendas_id'), table_name='tiendas')
    op.drop_table('tiendas')
    op.drop_index(op.f('ix_ciudades_id'), table_name='ciudades')
    op.drop_table('ciudades')
    op.drop_index(op.f('ix_zonas_id'), table_name='zonas')
    op.drop_table('zonas')