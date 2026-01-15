"""remove_unique_constraint_from_areas_logistica_codigo

Revision ID: d689352cee9c
Revises: 8731b61e6762
Create Date: 2025-11-09 12:25:47.912251

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd689352cee9c'
down_revision: Union[str, Sequence[str], None] = '8731b61e6762'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop unique constraint from areas_logistica.codigo to allow multiple areas with the same code
    # This is especially useful for 'LOGISTICA' code which can apply to multiple areas
    op.drop_constraint('areas_logistica_codigo_key', 'areas_logistica', type_='unique')


def downgrade() -> None:
    """Downgrade schema."""
    # Restore unique constraint on areas_logistica.codigo
    op.create_unique_constraint('areas_logistica_codigo_key', 'areas_logistica', ['codigo'])
