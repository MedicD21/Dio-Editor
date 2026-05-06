from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class ProjectCreate(BaseModel):
    platform: str
    user_prompt: Optional[str] = None
    user_session_id: str


class ProjectResponse(BaseModel):
    id: UUID
    user_session_id: str
    status: str
    platform: str
    user_prompt: Optional[str]
    asset_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    project_id: UUID
    job_id: UUID
    thumbnails: list[str]
