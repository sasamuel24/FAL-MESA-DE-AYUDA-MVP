"""create_cartera_and_facturas_tables_for_financial_module

Revision ID: ac1f2d052fff
Revises: d689352cee9c
Create Date: 2025-11-18 18:33:03.461464

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ac1f2d052fff'
down_revision: Union[str, Sequence[str], None] = 'd689352cee9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Crear tabla cartera
    op.create_table(
        'cartera',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nit', sa.String(length=50), nullable=False),
        sa.Column('razon_social', sa.String(length=200), nullable=False),
        sa.Column('sucursal', sa.String(length=100), nullable=False),
        sa.Column('tipo_cliente', sa.String(length=50), nullable=False),
        sa.Column('nro_docto_cruce', sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_cartera_id', 'cartera', ['id'])
    op.create_index('ix_cartera_nro_docto_cruce', 'cartera', ['nro_docto_cruce'], unique=True)
    
    # Crear tabla facturas
    op.create_table(
        'facturas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=200), nullable=False),
        sa.Column('correo_electronico', sa.String(length=200), nullable=False),
        sa.Column('telefono', sa.String(length=50), nullable=False),
        sa.Column('asunto', sa.String(length=300), nullable=False),
        sa.Column('nit', sa.String(length=50), nullable=False),
        sa.Column('razon_social', sa.String(length=200), nullable=False),
        sa.Column('sucursal', sa.String(length=100), nullable=False),
        sa.Column('tipo_cliente', sa.String(length=50), nullable=False),
        sa.Column('nro_docto_cruce', sa.String(length=100), nullable=False),
        sa.Column('valor_total_cop', sa.Float(), nullable=False),
        sa.Column('descripcion_adicional', sa.Text(), nullable=True),
        sa.Column('archivo_url', sa.String(length=500), nullable=True),
        sa.Column('estado', sa.String(length=50), nullable=False, server_default='Pendiente'),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_facturas_id', 'facturas', ['id'])
    op.create_index('ix_facturas_estado', 'facturas', ['estado'])
    op.create_index('ix_facturas_fecha_creacion', 'facturas', ['fecha_creacion'])


def downgrade() -> None:
    """Downgrade schema."""
    # Eliminar índices y tabla facturas
    op.drop_index('ix_facturas_fecha_creacion', table_name='facturas')
    op.drop_index('ix_facturas_estado', table_name='facturas')
    op.drop_index('ix_facturas_id', table_name='facturas')
    op.drop_table('facturas')
    
    # Eliminar índices y tabla cartera
    op.drop_index('ix_cartera_nro_docto_cruce', table_name='cartera')
    op.drop_index('ix_cartera_id', table_name='cartera')
    op.drop_table('cartera')
