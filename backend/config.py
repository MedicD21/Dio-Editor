from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    anthropic_api_key: str = ""

    s3_endpoint_url: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_bucket_name: str = "dio-editor-media"
    s3_public_url: str = ""

    database_url: str = ""  # Set in .env — see .env.example for Supabase format
    redis_url: str = "redis://redis:6379/0"

    pixabay_api_key: str = ""
    freesound_api_key: str = ""

    next_public_api_url: str = "http://localhost:8000"
    remotion_server_url: str = "http://remotion:3001"

    session_secret: str = "changeme"
    max_upload_files: int = 30
    max_upload_size_mb: int = 500

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
