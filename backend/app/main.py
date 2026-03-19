from __future__ import annotations

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .schemas import DeleteResponse, ExportRequest, ExportResponse, ProjectSummary, ProjectUpdateRequest, SubtitleExportResponse, VideoProject
from .services import cleanup_expired_projects, delete_all_projects, delete_project, export_project, export_subtitles, list_projects, list_system_fonts, load_project, transcribe_upload, update_project


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.3.0",
    description="Online AI caption generation, editing, subtitle export, and burn-in export API.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory=settings.media_root), name="media")


@app.on_event("startup")
def startup_tasks() -> None:
    cleanup_expired_projects()


@app.get(f"{settings.api_prefix}/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get(f"{settings.api_prefix}/projects", response_model=list[ProjectSummary])
def get_projects() -> list[ProjectSummary]:
    return list_projects()


@app.get(f"{settings.api_prefix}/system/fonts", response_model=list[str])
def get_system_fonts() -> list[str]:
    return list_system_fonts()


@app.get(f"{settings.api_prefix}/projects/{{project_id}}", response_model=VideoProject)
def get_project(project_id: str) -> VideoProject:
    return load_project(project_id)


@app.post(f"{settings.api_prefix}/projects/transcribe", response_model=VideoProject)
def create_transcription(
    video: UploadFile = File(...),
    language: str = Form(...),
    writing_system: str = Form("native"),
    refinement_mode: str = Form("standard"),
) -> VideoProject:
    return transcribe_upload(video, language, writing_system, refinement_mode)


@app.put(f"{settings.api_prefix}/projects/{{project_id}}", response_model=VideoProject)
def save_project_state(project_id: str, payload: ProjectUpdateRequest) -> VideoProject:
    return update_project(
        project_id,
        title=payload.title,
        style=payload.style,
        segments=payload.segments,
    )


@app.delete(f"{settings.api_prefix}/projects/{{project_id}}", response_model=DeleteResponse)
def remove_project(project_id: str) -> DeleteResponse:
    return DeleteResponse(**delete_project(project_id))


@app.delete(f"{settings.api_prefix}/projects", response_model=DeleteResponse)
def remove_all_projects() -> DeleteResponse:
    return DeleteResponse(**delete_all_projects())


@app.post(f"{settings.api_prefix}/projects/{{project_id}}/export", response_model=ExportResponse)
def export_project_video(project_id: str, payload: ExportRequest) -> ExportResponse:
    if payload.style is not None or payload.segments is not None:
        update_project(project_id, style=payload.style, segments=payload.segments)
    return export_project(project_id)


@app.post(f"{settings.api_prefix}/projects/{{project_id}}/export-srt", response_model=SubtitleExportResponse)
def export_project_subtitles(project_id: str, payload: ExportRequest) -> SubtitleExportResponse:
    if payload.style is not None or payload.segments is not None:
        update_project(project_id, style=payload.style, segments=payload.segments)
    return export_subtitles(project_id)


if settings.frontend_dist_root.exists():
    @app.get("/", include_in_schema=False)
    def frontend_index() -> FileResponse:
        return FileResponse(settings.frontend_dist_root / "index.html")


    @app.get("/{full_path:path}", include_in_schema=False)
    def frontend_static(full_path: str) -> FileResponse:
        requested_path = settings.frontend_dist_root / full_path
        if requested_path.is_dir():
            requested_path = requested_path / "index.html"
        if requested_path.exists():
            return FileResponse(requested_path)
        return FileResponse(settings.frontend_dist_root / "index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
