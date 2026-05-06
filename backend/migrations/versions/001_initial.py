"""initial tables

Revision ID: 001_initial
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE project_status AS ENUM (
                'pending','analyzing','planning','processing',
                'rendering','complete','failed'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE platform_type AS ENUM (
                'tiktok','reels','youtube_shorts','twitter','linkedin'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_session_id", sa.String(255), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "pending", "analyzing", "planning", "processing",
                "rendering", "complete", "failed",
                name="project_status", create_type=False
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "platform",
            postgresql.ENUM(
                "tiktok", "reels", "youtube_shorts", "twitter", "linkedin",
                name="platform_type", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("user_prompt", sa.Text, nullable=True),
        sa.Column("asset_count", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id"),
            nullable=False,
        ),
        sa.Column("steps", postgresql.JSON, nullable=False, server_default="[]"),
        sa.Column("output_url", sa.String(2048), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("render_duration_seconds", sa.Float, nullable=True),
    )


def downgrade() -> None:
    op.drop_table("jobs")
    op.drop_table("projects")
    op.execute("DROP TYPE IF EXISTS project_status")
    op.execute("DROP TYPE IF EXISTS platform_type")
