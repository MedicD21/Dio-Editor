import uuid
from sqlalchemy import Column, String, Text, Float, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from db import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    steps = Column(JSON, default=list, nullable=False)
    output_url = Column(String(2048), nullable=True)
    error_message = Column(Text, nullable=True)
    render_duration_seconds = Column(Float, nullable=True)
