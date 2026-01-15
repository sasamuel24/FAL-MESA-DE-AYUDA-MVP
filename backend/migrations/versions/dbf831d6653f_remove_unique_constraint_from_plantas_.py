"""remove_unique_constraint_from_plantas_codigo

Revision ID: dbf831d6653f
Revises: a319542ca349
Create Date: 2025-10-31 15:16:12.217025

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dbf831d6653f'
down_revision: Union[str, Sequence[str], None] = 'a319542ca349'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop unique constraint from plantas.codigo to allow multiple plantas with the same code
    # This is especially useful for 'MANTENIMIENTO' code which can apply to multiple plantas
    op.drop_constraint('plantas_codigo_key', 'plantas', type_='unique')


def downgrade() -> None:
    """Downgrade schema."""
    # Restore unique constraint on plantas.codigo
    op.create_unique_constraint('plantas_codigo_key', 'plantas', ['codigo'])
