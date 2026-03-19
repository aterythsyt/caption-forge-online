"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { Film, Languages, LoaderCircle, Trash2, WandSparkles } from "lucide-react";

import {
  fetchProject,
  fetchProjects,
  fetchSystemFonts,
  deleteAllProjects,
  deleteProject,
  exportProject,
  exportProjectSrt,
  saveProject,
  transcribeVideo,
} from "@/lib/api";
import { buildTemplatePreset, CURATED_FONT_OPTIONS } from "@/lib/style-presets";
import type { CaptionStyle, ProjectSummary, VideoProject } from "@/lib/types";
import { segmentTextFromWords } from "@/lib/utils";
import { PrepareMediaModal } from "@/components/prepare-media-modal";
import { PreviewPanel } from "@/components/preview-panel";
import { StylePanel } from "@/components/style-panel";
import { TranscriptPanel } from "@/components/transcript-panel";
import { UploadDropzone } from "@/components/upload-dropzone";

type SeekRequest = {
  time: number;
  nonce: number;
};

export function EditorApp() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProject, setActiveProject] = useState<VideoProject | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("urdu");
  const [writingSystem, setWritingSystem] = useState("roman");
  const [refinementMode, setRefinementMode] = useState("ai");
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingSrt, setIsExportingSrt] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekRequest, setSeekRequest] = useState<SeekRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fontOptions, setFontOptions] = useState<string[]>(CURATED_FONT_OPTIONS);

  const refreshProjects = useCallback(async (focusProjectId?: string) => {
    const summaries = await fetchProjects();
    setProjects(summaries);

    const targetProjectId = focusProjectId ?? summaries[0]?.id ?? null;

    if (!targetProjectId) {
      setActiveProject(null);
      return;
    }

    const fullProject = await fetchProject(targetProjectId);
    startTransition(() => {
      setActiveProject(fullProject);
    });
  }, []);

  useEffect(() => {
    const boot = async () => {
      try {
        const [_, fonts] = await Promise.all([
          refreshProjects(),
          fetchSystemFonts().catch(() => CURATED_FONT_OPTIONS),
        ]);
        setFontOptions(Array.from(new Set([...CURATED_FONT_OPTIONS, ...fonts])));
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : "Failed to load saved projects.",
        );
      } finally {
        setIsLoadingProjects(false);
      }
    };

    void boot();
  }, [refreshProjects]);

  const openPrepareModal = (file: File) => {
    setPendingFile(file);
    setModalOpen(true);
  };

  const handleGenerate = async () => {
    if (!pendingFile) {
      return;
    }
    setIsGenerating(true);
    setNotice(null);
    try {
      const project = await transcribeVideo(
        pendingFile,
        language,
        writingSystem,
        refinementMode,
      );
      setActiveProject(project);
      setModalOpen(false);
      setPendingFile(null);
      setCurrentTime(0);
      await refreshProjects(project.id);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Transcription failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectProject = async (projectId: string) => {
    setNotice(null);
    try {
      const project = await fetchProject(projectId);
      setActiveProject(project);
      setCurrentTime(0);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Failed to load project.",
      );
    }
  };

  const handleWordChange = (segmentId: string, wordId: string, value: string) => {
    setActiveProject((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        segments: current.segments.map((segment) => {
          if (segment.id !== segmentId) {
            return segment;
          }
          const words = segment.words.map((word) =>
            word.id === wordId ? { ...word, word: value } : word,
          );
          return {
            ...segment,
            words,
            text: segmentTextFromWords(words),
          };
        }),
      };
    });
  };

  const handleSegmentTextChange = (segmentId: string, value: string) => {
    setActiveProject((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        segments: current.segments.map((segment) =>
          segment.id === segmentId
            ? {
                ...segment,
                text: value,
              }
            : segment,
        ),
      };
    });
  };

  const handleStyleChange = (patch: Partial<CaptionStyle>) => {
    setActiveProject((current) =>
      current
        ? (() => {
            const nextStyle = patch.template
              ? {
                  ...current.style,
                  ...buildTemplatePreset(patch.template),
                  font_family: current.style.font_family,
                  font_size: current.style.font_size,
                  line_height: current.style.line_height,
                  letter_spacing: current.style.letter_spacing,
                  ...patch,
                }
              : {
                  ...current.style,
                  ...patch,
                };

            return {
              ...current,
              style: nextStyle,
            };
          })()
        : current,
    );
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    setSeekRequest({ time, nonce: Date.now() });
  };

  const handleSave = async () => {
    if (!activeProject) {
      return;
    }
    setIsSaving(true);
    setNotice(null);
    try {
      const savedProject = await saveProject(activeProject);
      setActiveProject(savedProject);
      await refreshProjects(savedProject.id);
      setNotice("Project saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (!activeProject) {
      return;
    }
    setIsExporting(true);
    setNotice(null);
    try {
      const savedProject = await saveProject(activeProject);
      const exported = await exportProject(savedProject);
      const refreshed = await fetchProject(savedProject.id);
      setActiveProject(refreshed);
      await refreshProjects(savedProject.id);
      setNotice(`Export ready: ${exported.filename}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSrt = async () => {
    if (!activeProject) {
      return;
    }
    setIsExportingSrt(true);
    setNotice(null);
    try {
      const savedProject = await saveProject(activeProject);
      const exported = await exportProjectSrt(savedProject);
      const refreshed = await fetchProject(savedProject.id);
      setActiveProject(refreshed);
      await refreshProjects(savedProject.id);
      setNotice(`SRT ready: ${exported.filename}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "SRT export failed.");
    } finally {
      setIsExportingSrt(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const target = projects.find((project) => project.id === projectId);
    if (!target) {
      return;
    }
    const confirmed = window.confirm(`Delete "${target.title}" and its media files?`);
    if (!confirmed) {
      return;
    }

    setDeletingProjectId(projectId);
    setNotice(null);
    try {
      const result = await deleteProject(projectId);
      if (activeProject?.id === projectId) {
        setActiveProject(null);
      }
      await refreshProjects(activeProject?.id === projectId ? undefined : activeProject?.id);
      setNotice(result.detail);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleDeleteAllProjects = async () => {
    if (!projects.length) {
      return;
    }
    const confirmed = window.confirm("Delete all saved projects and media files?");
    if (!confirmed) {
      return;
    }

    setIsClearingAll(true);
    setNotice(null);
    try {
      const result = await deleteAllProjects();
      setActiveProject(null);
      setProjects([]);
      setCurrentTime(0);
      setSeekRequest(null);
      setNotice(result.detail);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Clear all failed.");
    } finally {
      setIsClearingAll(false);
    }
  };

  const hasActiveProject = Boolean(activeProject);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-8 px-5 py-8 lg:px-8">
      <section
        className={`grid gap-6 ${
          hasActiveProject ? "xl:grid-cols-[1.15fr_0.85fr]" : "xl:grid-cols-[1.3fr_0.7fr]"
        }`}
      >
        <div className="space-y-5">
          <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/15 bg-cyan-400/8 px-4 py-2 text-xs uppercase tracking-[0.32em] text-cyan-100">
            <WandSparkles className="h-4 w-4" />
            Caption Forge Online
          </div>

          <div className="max-w-4xl space-y-4">
            <h1
              className={`font-semibold tracking-tight text-white ${
                hasActiveProject ? "text-3xl md:text-5xl" : "text-4xl md:text-6xl"
              }`}
            >
              Online AI captions with a real editor, waveform timeline, and Roman
              Urdu or Hinglish output.
            </h1>
            <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              Upload a video, generate Roman Urdu or Hinglish captions with an
              online speech pipeline, fine-tune each word, preview animated caption
              templates, and export a hard-burned MP4.
            </p>
            {activeProject ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.25rem] border border-white/8 bg-white/4 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    Language
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {activeProject.source_language.toUpperCase()}
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-white/8 bg-white/4 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    Writing
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {activeProject.writing_system}
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-white/8 bg-white/4 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    Active look
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {activeProject.style.template}
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-white/8 bg-white/4 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    Accuracy mode
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {activeProject.refinement_mode === "ai"
                      ? "AI enhanced"
                      : "standard"}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-orange-200">
                Live pipeline
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Upload to editor in one pass
              </h2>
            </div>
            <LoaderCircle
              className={`h-5 w-5 text-cyan-300 ${
                isGenerating || isLoadingProjects ? "animate-spin" : ""
              }`}
            />
          </div>

          <div className="mt-6 grid gap-4 text-sm text-slate-300">
            <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
              <div className="flex items-center gap-3">
                <Film className="h-4 w-4 text-cyan-300" />
                Video upload and waveform timeline
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
              <div className="flex items-center gap-3">
                <Languages className="h-4 w-4 text-orange-300" />
                Online transcription with optional AI cleanup
              </div>
            </div>
          </div>
        </div>
      </section>

      <UploadDropzone onSelectFile={openPrepareModal} isBusy={isGenerating} />

      {notice ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1.8fr]">
        <div className="glass-panel rounded-[1.75rem] p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-200">
                Recent videos
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Jump back into saved projects
              </h2>
            </div>
            <button
              type="button"
              className="rounded-full border border-red-400/20 bg-red-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-red-100 transition hover:border-red-400/40 hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!projects.length || isClearingAll}
              onClick={() => void handleDeleteAllProjects()}
            >
              {isClearingAll ? "Clearing..." : "Clear all"}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`rounded-[1.4rem] border p-4 transition ${
                  activeProject?.id === project.id
                    ? "border-cyan-400/40 bg-cyan-400/10"
                    : "border-white/8 bg-white/4 hover:border-white/16 hover:bg-white/6"
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-slate-300">
                    {project.source_language} / {project.writing_system}
                  </span>
                  <div className="flex items-center gap-2">
                    {project.export_url ? (
                      <span className="text-[10px] uppercase tracking-[0.24em] text-orange-200">
                        exported
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:border-red-400/40 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={deletingProjectId === project.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteProject(project.id);
                      }}
                      aria-label={`Delete ${project.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => void handleSelectProject(project.id)}
                >
                  <h3 className="text-lg font-semibold text-white">{project.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Updated {new Date(project.updated_at).toLocaleString()}
                  </p>
                </button>
              </div>
            ))}

            {!projects.length && !isLoadingProjects ? (
              <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/4 p-5 text-sm text-slate-400">
                No saved projects yet. Upload a video to start your caption editor.
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-panel rounded-[1.75rem] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-orange-200">
                Active session
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {activeProject?.title ?? "Choose a project to edit"}
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {activeProject?.subtitle_url ? (
                <a
                  href={`http://127.0.0.1:8000${activeProject.subtitle_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-cyan-100"
                >
                  Open SRT
                </a>
              ) : null}
              {activeProject?.export_url ? (
                <a
                  href={`http://127.0.0.1:8000${activeProject.export_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-orange-100"
                >
                  Open export
                </a>
              ) : null}
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            {activeProject
              ? "Edit Roman Urdu or Hinglish text, preview the animated overlay, then save or export the caption-burned video."
              : "The editor workspace will appear here as soon as a transcription is ready."}
          </p>
        </div>
      </section>

      {activeProject ? (
        <section className="grid gap-5 xl:grid-cols-[1.06fr_1.55fr_0.92fr]">
          <TranscriptPanel
            project={activeProject}
            currentTime={currentTime}
            onSeek={handleSeek}
            onSegmentTextChange={handleSegmentTextChange}
            onWordChange={handleWordChange}
          />
          <PreviewPanel
            project={activeProject}
            currentTime={currentTime}
            seekRequest={seekRequest}
            onTimeChange={setCurrentTime}
          />
          <StylePanel
            style={activeProject.style}
            fontOptions={fontOptions}
            isSaving={isSaving}
            isExporting={isExporting}
            isExportingSrt={isExportingSrt}
            onStyleChange={handleStyleChange}
            onSave={() => void handleSave()}
            onExportSrt={() => void handleExportSrt()}
            onExport={() => void handleExport()}
          />
        </section>
      ) : null}

      <PrepareMediaModal
        open={modalOpen}
        file={pendingFile}
        language={language}
        writingSystem={writingSystem}
        refinementMode={refinementMode}
        isBusy={isGenerating}
        onClose={() => setModalOpen(false)}
        onSubmit={() => void handleGenerate()}
        onLanguageChange={setLanguage}
        onWritingSystemChange={setWritingSystem}
        onRefinementModeChange={setRefinementMode}
      />
    </main>
  );
}
