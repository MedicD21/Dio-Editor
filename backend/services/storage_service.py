import asyncio
import os
import uuid
from pathlib import Path
from typing import Optional
import aioboto3
from botocore.exceptions import ClientError
from config import get_settings

settings = get_settings()


class StorageService:
    def __init__(self):
        self.bucket = settings.s3_bucket_name
        self.public_url = settings.s3_public_url.rstrip("/")
        self._session = None

    def _get_session(self):
        if self._session is None:
            self._session = aioboto3.Session()
        return self._session

    def _client_kwargs(self) -> dict:
        kwargs: dict = {
            "service_name": "s3",
            "aws_access_key_id": settings.s3_access_key_id,
            "aws_secret_access_key": settings.s3_secret_access_key,
        }
        if settings.s3_endpoint_url:
            kwargs["endpoint_url"] = settings.s3_endpoint_url
        return kwargs

    async def upload_file(
        self,
        local_path: str,
        remote_key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        session = self._get_session()
        async with session.client(**self._client_kwargs()) as s3:
            with open(local_path, "rb") as f:
                await s3.put_object(
                    Bucket=self.bucket,
                    Key=remote_key,
                    Body=f,
                    ContentType=content_type,
                )
        return self._public_url(remote_key)

    async def upload_bytes(
        self,
        data: bytes,
        remote_key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        session = self._get_session()
        async with session.client(**self._client_kwargs()) as s3:
            await s3.put_object(
                Bucket=self.bucket,
                Key=remote_key,
                Body=data,
                ContentType=content_type,
            )
        return self._public_url(remote_key)

    async def download_file(self, remote_key: str, local_path: str) -> None:
        session = self._get_session()
        async with session.client(**self._client_kwargs()) as s3:
            await s3.download_file(self.bucket, remote_key, local_path)

    async def get_signed_url(self, remote_key: str, expires_in: int = 3600) -> str:
        session = self._get_session()
        async with session.client(**self._client_kwargs()) as s3:
            url = await s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": remote_key},
                ExpiresIn=expires_in,
            )
        return url

    async def delete_file(self, remote_key: str) -> None:
        session = self._get_session()
        async with session.client(**self._client_kwargs()) as s3:
            await s3.delete_object(Bucket=self.bucket, Key=remote_key)

    async def file_exists(self, remote_key: str) -> bool:
        session = self._get_session()
        async with session.client(**self._client_kwargs()) as s3:
            try:
                await s3.head_object(Bucket=self.bucket, Key=remote_key)
                return True
            except ClientError:
                return False

    def _public_url(self, remote_key: str) -> str:
        if self.public_url:
            return f"{self.public_url}/{remote_key}"
        return remote_key

    def remote_key_for_asset(self, project_id: str, filename: str) -> str:
        return f"projects/{project_id}/assets/{filename}"

    def remote_key_for_thumbnail(self, project_id: str, filename: str) -> str:
        return f"projects/{project_id}/thumbnails/{filename}"

    def remote_key_for_output(self, project_id: str) -> str:
        return f"projects/{project_id}/output/final.mp4"

    async def ensure_bucket_exists(self) -> None:
        session = self._get_session()
        async with session.client(**self._client_kwargs()) as s3:
            try:
                await s3.head_bucket(Bucket=self.bucket)
            except ClientError:
                await s3.create_bucket(Bucket=self.bucket)


storage_service = StorageService()
