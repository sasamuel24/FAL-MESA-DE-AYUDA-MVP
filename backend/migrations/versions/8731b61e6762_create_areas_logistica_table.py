"""create_areas_logistica_table

Revision ID: 8731b61e6762
Revises: dbf831d6653f
Create Date: 2025-11-09 11:47:38.691158

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision: str = '8731b61e6762'
down_revision: Union[str, Sequence[str], None] = 'dbf831d6653f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Crear tabla areas_logistica y datos iniciales."""
    
    # Crear tabla areas_logistica
    op.create_table(
        'areas_logistica',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('codigo', sa.String(length=50), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('activa', sa.Boolean(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre'),
        sa.UniqueConstraint('codigo')
    )
    
    # Crear índice en id
    op.create_index(op.f('ix_areas_logistica_id'), 'areas_logistica', ['id'], unique=False)
    
    # Insertar datos iniciales (las 3 áreas de logística actuales)
    areas_logistica_table = sa.table(
        'areas_logistica',
        sa.column('nombre', sa.String),
        sa.column('codigo', sa.String),
        sa.column('descripcion', sa.Text),
        sa.column('activa', sa.Boolean),
        sa.column('fecha_creacion', sa.DateTime),
        sa.column('fecha_actualizacion', sa.DateTime)
    )
    
    now = datetime.utcnow()
    
    op.bulk_insert(
        areas_logistica_table,
        [
            {
                'nombre': 'Logística Comercial',
                'codigo': 'logistica_comercial',
                'descripcion': 'Área de logística para operaciones comerciales',
                'activa': True,
                'fecha_creacion': now,
                'fecha_actualizacion': now
            },
            {
                'nombre': 'Logística Producción',
                'codigo': 'logistica_produccion',
                'descripcion': 'Área de logística para producción',
                'activa': True,
                'fecha_creacion': now,
                'fecha_actualizacion': now
            },
            {
                'nombre': 'Logística Distribución',
                'codigo': 'logistica_distribucion',
                'descripcion': 'Área de logística para distribución',
                'activa': True,
                'fecha_creacion': now,
                'fecha_actualizacion': now
            }
        ]
    )


def downgrade() -> None:
    """Eliminar tabla areas_logistica."""
    op.drop_index(op.f('ix_areas_logistica_id'), table_name='areas_logistica')
    op.drop_table('areas_logistica')
