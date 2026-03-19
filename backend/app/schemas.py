from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class MediaAsset(BaseModel):
    filename: str
    url: str


class CaptionWord(BaseModel):
    id: str
    native_word: str
    word: str
    start: float | None = None
    end: float | None = None
    score: float | None = None


class CaptionSegment(BaseModel):
    id: str
    native_text: str
    text: str
    start: float | None = None
    end: float | None = None
    words: list[CaptionWord] = Field(default_factory=list)


class CaptionStyle(BaseModel):
    template: Literal[
        "standard",
        "dynamic-highlight",
        "karaoke-bar",
        "lower-third",
        "outline-pop",
        "focus-word",
    ] = "dynamic-highlight"
    font_family: str = "Space Grotesk"
    font_size: int = 56
    text_color: str = "#F8FAFC"
    accent_color: str = "#22D3EE"
    stroke_color: str = "#020617"
    background_color: str = "#020617"
    background_opacity: int = 68
    position_x: float = 50.0
    position_y: float = 82.0
    alignment: Literal["left", "center", "right"] = "center"
    max_chars_per_line: int = 42
    line_height: float = 1.12
    letter_spacing: float = 0.0
    text_transform: Literal["none", "uppercase", "lowercase"] = "none"


class VideoProject(BaseModel):
    id: str
    title: str
    source_language: str
    writing_system: str
    refinement_mode: Literal["local", "ai"] = "local"
    model: str
    transliteration_source: str = "native"
    created_at: datetime
    updated_at: datetime
    video: MediaAsset
    audio: MediaAsset
    export_url: str | None = None
    subtitle_url: str | None = None
    style: CaptionStyle = Field(default_factory=CaptionStyle)
    segments: list[CaptionSegment] = Field(default_factory=list)


class ProjectSummary(BaseModel):
    id: str
    title: str
    source_language: str
    writing_system: str
    updated_at: datetime
    video_url: str
    export_url: str | None = None


class ProjectUpdateRequest(BaseModel):
    title: str | None = None
    style: CaptionStyle | None = None
    segments: list[CaptionSegment] | None = None


class ExportRequest(BaseModel):
    style: CaptionStyle | None = None
    segments: list[CaptionSegment] | None = None


class ExportResponse(BaseModel):
    project_id: str
    export_url: str
    filename: str


class SubtitleExportResponse(BaseModel):
    project_id: str
    subtitle_url: str
    filename: str


class DeleteResponse(BaseModel):
    deleted_count: int = 1
    detail: str
