from pydantic import BaseModel
from typing import Optional, Any
from uuid import UUID


class JobStep(BaseModel):
    name: str
    status: str  # pending | active | complete | failed
    progress: int  # 0-100
    message: str


class JobResponse(BaseModel):
    id: UUID
    project_id: UUID
    steps: list[Any]
    output_url: Optional[str]
    error_message: Optional[str]
    render_duration_seconds: Optional[float]

    model_config = {"from_attributes": True}
