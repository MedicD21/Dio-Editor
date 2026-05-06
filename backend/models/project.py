import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from db import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_session_id = Column(String(255), nullable=False)
    status = Column(
        SAEnum(
            "pending", "analyzing", "planning", "processing",
            "rendering", "complete", "failed",
            name="project_status"
        ),
        default="pending",
        nullable=False,
    )
    platform = Column(
        SAEnum(
            "tiktok", "reels", "youtube_shorts", "twitter", "linkedin",
            name="platform_type"
        ),
        nullable=False,
    )
    user_prompt = Column(Text, nullable=True)
    asset_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
