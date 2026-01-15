"""add_tipo_solicitud_to_ot_and_modify_fk

Revision ID: 9211f8c4ef46
Revises: 8b9fc3bbd47a
Create Date: 2025-10-08 14:20:28.007843

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9211f8c4ef46'
down_revision: Union[str, Sequence[str], None] = '8b9fc3bbd47a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop existing foreign key constraint
    op.drop_constraint('ot_solicitudes_solicitud_id_fkey', 'ot_solicitudes', type_='foreignkey')
    
    # Add tipo_solicitud column
    op.add_column('ot_solicitudes', sa.Column('tipo_solicitud', sa.String(), nullable=True))
    
    # Update existing records to mark them as B2C
    op.execute("UPDATE ot_solicitudes SET tipo_solicitud = 'B2C'")
    
    # Make the column not nullable after updating existing records
    op.alter_column('ot_solicitudes', 'tipo_solicitud', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Re-add the foreign key constraint
    op.create_foreign_key('ot_solicitudes_solicitud_id_fkey', 'ot_solicitudes', 'b2c_solicitudes', ['solicitud_id'], ['id'])
    
    # Drop the tipo_solicitud column
    op.drop_column('ot_solicitudes', 'tipo_solicitud')
