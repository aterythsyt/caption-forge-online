from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    app_name: str = "Caption Forge Online"
    api_prefix: str = "/api"
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    storage_root: Path = BASE_DIR / "storage"
    media_root: Path = BASE_DIR / "storage" / "media"
    project_root: Path = BASE_DIR / "storage" / "projects"
    video_root: Path = BASE_DIR / "storage" / "media" / "videos"
    audio_root: Path = BASE_DIR / "storage" / "media" / "audio"
    export_root: Path = BASE_DIR / "storage" / "media" / "exports"
    ass_root: Path = BASE_DIR / "storage" / "ass"
    frontend_dist_root: Path = BASE_DIR.parent / "frontend" / "out"
    max_upload_size_mb: int = 250
    project_retention_hours: int = 0
    online_timestamp_api_url: str = "https://course-demos-whisper-small.hf.space/api/predict/"
    online_large_transcript_space: str = "hf-audio/whisper-large-v3"
    online_space_timeout_seconds: int = 300
    online_transcribe_label: str = "HF Whisper Small"
    online_ai_transcribe_label: str = "HF Whisper Small + HF Whisper Large V3"

    agent_router_base_url: str = "https://noobrouter.azurewebsites.net/v1"
    agent_router_model: str = "gpt-5.2"
    agent_router_token: str | None = None
    agent_router_timeout_seconds: int = 120

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def ensure_directories(self) -> None:
        for directory in (
            self.storage_root,
            self.media_root,
            self.project_root,
            self.video_root,
            self.audio_root,
            self.export_root,
            self.ass_root,
        ):
            directory.mkdir(parents=True, exist_ok=True)

    @property
    def max_upload_size_bytes(self) -> int:
        return max(self.max_upload_size_mb, 1) * 1024 * 1024


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_directories()
    return settings
