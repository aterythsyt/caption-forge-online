import type {
  DeleteResponse,
  ExportResponse,
  ProjectSummary,
  SubtitleExportResponse,
  VideoProject,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.trim() || "/api";

async function expectJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Request failed.");
  }
  return (await response.json()) as T;
}

export function mediaUrl(relativeUrl: string) {
  if (!relativeUrl) {
    return "";
  }
  if (relativeUrl.startsWith("http")) {
    return relativeUrl;
  }
  return relativeUrl;
}

export async function fetchProjects() {
  const response = await fetch(`${API_BASE}/projects`, { cache: "no-store" });
  return expectJson<ProjectSummary[]>(response);
}

export async function fetchSystemFonts() {
  const response = await fetch(`${API_BASE}/system/fonts`, { cache: "no-store" });
  return expectJson<string[]>(response);
}

export async function fetchProject(projectId: string) {
  const response = await fetch(`${API_BASE}/projects/${projectId}`, {
    cache: "no-store",
  });
  return expectJson<VideoProject>(response);
}

export async function transcribeVideo(
  file: File,
  language: string,
  writingSystem: string,
  refinementMode: string,
) {
  const formData = new FormData();
  formData.append("video", file);
  formData.append("language", language);
  formData.append("writing_system", writingSystem);
  formData.append("refinement_mode", refinementMode);

  const response = await fetch(`${API_BASE}/projects/transcribe`, {
    method: "POST",
    body: formData,
  });
  return expectJson<VideoProject>(response);
}

export async function saveProject(project: VideoProject) {
  const response = await fetch(`${API_BASE}/projects/${project.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: project.title,
      style: project.style,
      segments: project.segments,
    }),
  });
  return expectJson<VideoProject>(response);
}

export async function exportProject(project: VideoProject) {
  const response = await fetch(`${API_BASE}/projects/${project.id}/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      style: project.style,
      segments: project.segments,
    }),
  });
  return expectJson<ExportResponse>(response);
}

export async function exportProjectSrt(project: VideoProject) {
  const response = await fetch(`${API_BASE}/projects/${project.id}/export-srt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      style: project.style,
      segments: project.segments,
    }),
  });
  return expectJson<SubtitleExportResponse>(response);
}

export async function deleteProject(projectId: string) {
  const response = await fetch(`${API_BASE}/projects/${projectId}`, {
    method: "DELETE",
  });
  return expectJson<DeleteResponse>(response);
}

export async function deleteAllProjects() {
  const response = await fetch(`${API_BASE}/projects`, {
    method: "DELETE",
  });
  return expectJson<DeleteResponse>(response);
}
