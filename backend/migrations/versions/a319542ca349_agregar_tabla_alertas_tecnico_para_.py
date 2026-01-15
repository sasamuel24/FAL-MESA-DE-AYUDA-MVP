"""Agregar tabla alertas_tecnico para rastreo de alertas

Revision ID: a319542ca349
Revises: 9211f8c4ef46
Create Date: 2025-10-24 10:42:04.878794

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a319542ca349'
down_revision: Union[str, Sequence[str], None] = '9211f8c4ef46'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Solo crear tabla alertas_tecnico."""
    # Crear tabla alertas_tecnico
    op.create_table('alertas_tecnico',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ot_id', sa.Integer(), nullable=False),
        sa.Column('tecnico_email', sa.String(length=120), nullable=False),
        sa.Column('mensaje', sa.Text(), nullable=False),
        sa.Column('enviado_por', sa.String(length=100), nullable=False),
        sa.Column('fecha_envio', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['ot_id'], ['ot_solicitudes.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alertas_tecnico_id'), 'alertas_tecnico', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema - Solo eliminar tabla alertas_tecnico."""
    # Eliminar tabla alertas_tecnico
    op.drop_index(op.f('ix_alertas_tecnico_id'), table_name='alertas_tecnico')
    op.drop_table('alertas_tecnico')
