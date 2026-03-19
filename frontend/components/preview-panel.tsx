"use client";

import { motion } from "framer-motion";
import { Pause, Play, Sparkles } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import WavesurferPlayer from "@wavesurfer/react";
import type WaveSurfer from "wavesurfer.js";

import { mediaUrl } from "@/lib/api";
import type { VideoProject } from "@/lib/types";
import {
  getActiveSegment,
  getActiveWord,
  transformCaptionText,
  wrapCaptionText,
  wrapCaptionWords,
} from "@/lib/utils";

type SeekRequest = {
  time: number;
  nonce: number;
};

type PreviewPanelProps = {
  project: VideoProject;
  currentTime: number;
  onTimeChange: (time: number) => void;
  seekRequest: SeekRequest | null;
};

function sourceBadgeLabel(source: string, writingSystem: string) {
  const normalized = source.toLowerCase();
  if (writingSystem === "native") {
    return "native";
  }
  if (normalized === "external-ai") {
    return "ai enhanced";
  }
  if (normalized === "external-ai-fallback") {
    return "ai fallback";
  }
  if (
    normalized === "fallback" ||
    normalized === "local-rules" ||
    normalized === "rules-based"
  ) {
    return "rules-based";
  }
  return normalized;
}

function hexToRgba(hexColor: string, opacityPercent: number) {
  const normalized = hexColor.replace("#", "");
  const safe = normalized.length === 6 ? normalized : "020617";
  const red = Number.parseInt(safe.slice(0, 2), 16);
  const green = Number.parseInt(safe.slice(2, 4), 16);
  const blue = Number.parseInt(safe.slice(4, 6), 16);
  const alpha = Math.min(Math.max(opacityPercent, 0), 100) / 100;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function VideoOverlay({
  project,
  currentTime,
}: {
  project: VideoProject;
  currentTime: number;
}) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const activeSegment = getActiveSegment(project.segments, currentTime);
  const activeWord = getActiveWord(activeSegment, currentTime);
  const [overlayPosition, setOverlayPosition] = useState<{ left: number; top: number } | null>(null);
  const transformedWords = activeSegment
    ? activeSegment.words.map((word) => ({
        ...word,
        word: transformCaptionText(word.word, project.style.text_transform),
      }))
    : [];
  const wrappedText = activeSegment
    ? wrapCaptionText(
        transformCaptionText(activeSegment.text, project.style.text_transform),
        project.style.max_chars_per_line,
      )
    : [];
  const wrappedWords = activeSegment
    ? wrapCaptionWords(transformedWords, project.style.max_chars_per_line)
    : [];
  const activeDisplayWord = activeWord
    ? transformCaptionText(activeWord.word, project.style.text_transform)
    : null;

  const justifyClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }[project.style.alignment];
  const safeX = Math.min(Math.max(project.style.position_x, 4), 96);
  const safeY = Math.min(Math.max(project.style.position_y, 14), 96);
  const templateMaxWidth = {
    standard: "72ch",
    "dynamic-highlight": "70ch",
    "karaoke-bar": "78ch",
    "lower-third": "84ch",
    "outline-pop": "58ch",
    "focus-word": "66ch",
  }[project.style.template];
  const captionBoxStyle = {
    fontFamily: project.style.font_family,
    fontSize: `${project.style.font_size}px`,
    color: project.style.text_color,
    lineHeight: project.style.line_height,
    letterSpacing: `${project.style.letter_spacing}px`,
    textAlign: project.style.alignment,
    maxWidth: `min(calc(100% - 0.5rem), ${templateMaxWidth})`,
    textShadow:
      project.style.template === "outline-pop"
        ? `0 0 26px ${project.style.stroke_color}, 0 6px 0 ${project.style.stroke_color}`
        : `0 0 18px ${project.style.stroke_color}, 0 4px 0 ${project.style.stroke_color}`,
  } as const;

  const boxBaseClass =
    "border border-white/10 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-md";

  let templateClassName = `${boxBaseClass} rounded-[1.6rem] px-6 py-4`;
  let templateStyle: Record<string, string | number> = {
    backgroundColor: hexToRgba(
      project.style.background_color,
      project.style.background_opacity,
    ),
  };

  if (project.style.template === "karaoke-bar") {
    templateClassName = `${boxBaseClass} rounded-[1.9rem] px-4 py-3`;
    templateStyle = {
      ...templateStyle,
      borderColor: "rgba(255,255,255,0.08)",
    };
  } else if (project.style.template === "lower-third") {
    templateClassName =
      "rounded-[1.4rem] border border-white/10 px-5 py-3 shadow-[0_24px_80px_rgba(2,6,23,0.45)]";
    templateStyle = {
      ...templateStyle,
      backgroundColor: hexToRgba(project.style.background_color, 90),
      borderTop: `2px solid ${project.style.accent_color}`,
    };
  } else if (project.style.template === "outline-pop") {
    templateClassName = "px-2 py-1";
    templateStyle = {
      backgroundColor: "transparent",
    };
  } else if (project.style.template === "focus-word") {
    templateClassName = `${boxBaseClass} rounded-[2rem] px-6 py-5`;
  } else if (project.style.template === "dynamic-highlight") {
    templateClassName = `${boxBaseClass} rounded-[1.8rem] px-5 py-4`;
  }

  const renderWordLines = (mode: "dynamic" | "karaoke" | "focus") => (
    <div className="space-y-2">
      {wrappedWords.map((line, lineIndex) => (
        <div
          key={`line-${lineIndex}`}
          className={`flex flex-wrap gap-x-2 gap-y-1.5 ${justifyClass}`}
        >
          {line.map((word) => {
            const active = activeWord?.id === word.id;
            const completed = (word.end ?? Number.POSITIVE_INFINITY) < currentTime;

            if (mode === "karaoke") {
              return (
                <motion.span
                  key={word.id}
                  animate={{
                    scale: active ? 1.06 : 1,
                    backgroundColor: active
                      ? project.style.accent_color
                      : completed
                        ? hexToRgba(project.style.accent_color, 34)
                        : hexToRgba(project.style.background_color, 28),
                    color: active ? "#04111D" : project.style.text_color,
                    opacity: completed || active ? 1 : 0.88,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="rounded-full border border-white/10 px-2.5 py-1 text-[0.78em] font-semibold shadow-[0_10px_30px_rgba(2,6,23,0.22)]"
                >
                  {word.word}
                </motion.span>
              );
            }

            if (mode === "focus") {
              return (
                <motion.span
                  key={word.id}
                  animate={{
                    scale: active ? 1.18 : 0.96,
                    color: active ? project.style.accent_color : project.style.text_color,
                    opacity: active ? 1 : 0.68,
                    y: active ? -4 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 280, damping: 18 }}
                  className={`font-semibold ${active ? "drop-shadow-[0_10px_20px_rgba(34,211,238,0.28)]" : ""}`}
                >
                  {word.word}
                </motion.span>
              );
            }

            return (
              <motion.span
                key={word.id}
                animate={{
                  scale: active ? 1.08 : 1,
                  color: active ? "#04111D" : project.style.text_color,
                  backgroundColor: active
                    ? project.style.accent_color
                    : "rgba(255,255,255,0.02)",
                  y: active ? -2 : 0,
                }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                className="rounded-[1rem] px-3 py-1 font-semibold"
              >
                {word.word}
              </motion.span>
            );
          })}
        </div>
      ))}
    </div>
  );

  useLayoutEffect(() => {
    if (!activeSegment) {
      return;
    }

    const anchor = anchorRef.current;
    const box = boxRef.current;
    const frame = anchor?.parentElement;

    if (!anchor || !box || !frame) {
      return;
    }

    const computePosition = () => {
      const frameRect = frame.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      const anchorX = (safeX / 100) * frameRect.width;
      const anchorBottom = (safeY / 100) * frameRect.height;

      const desiredLeft =
        project.style.alignment === "left"
          ? anchorX
          : project.style.alignment === "right"
            ? anchorX - boxRect.width
            : anchorX - boxRect.width / 2;

      const horizontalPadding = boxRect.width < frameRect.width - 16 ? 8 : 0;
      const verticalPadding = boxRect.height < frameRect.height - 16 ? 8 : 0;
      const maxLeft = Math.max(frameRect.width - boxRect.width - horizontalPadding, 0);
      const maxTop = Math.max(frameRect.height - boxRect.height - verticalPadding, 0);

      setOverlayPosition({
        left: Math.min(Math.max(desiredLeft, horizontalPadding), maxLeft),
        top: Math.min(Math.max(anchorBottom - boxRect.height, verticalPadding), maxTop),
      });
    };

    computePosition();
    window.addEventListener("resize", computePosition);
    return () => window.removeEventListener("resize", computePosition);
  }, [
    safeX,
    safeY,
    project.style.alignment,
    project.style.font_size,
    project.style.max_chars_per_line,
    project.style.template,
    project.style.text_transform,
    activeSegment,
    activeSegment?.id,
    activeWord?.id,
    activeSegment?.text,
  ]);

  if (!activeSegment) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <div
        ref={anchorRef}
        className="absolute"
        style={{
          left: overlayPosition ? `${overlayPosition.left}px` : `${safeX}%`,
          top: overlayPosition ? `${overlayPosition.top}px` : `${safeY}%`,
          maxWidth: "calc(100% - 1rem)",
        }}
      >
        <motion.div
          ref={boxRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={templateClassName}
          style={{
            ...captionBoxStyle,
            ...templateStyle,
          }}
        >
        {project.style.template === "standard" ? (
          <div className="space-y-2">
            <div
              className="h-1.5 w-16 rounded-full"
              style={{ backgroundColor: hexToRgba(project.style.accent_color, 86) }}
            />
            {wrappedText.map((line, index) => (
              <div key={`standard-${index}`}>{line}</div>
            ))}
          </div>
        ) : null}

        {project.style.template === "dynamic-highlight"
          ? renderWordLines("dynamic")
          : null}

        {project.style.template === "karaoke-bar"
          ? renderWordLines("karaoke")
          : null}

        {project.style.template === "focus-word"
          ? (
              <div className="space-y-3">
                {activeDisplayWord ? (
                  <motion.div
                    animate={{
                      scale: 1.04,
                      color: project.style.accent_color,
                      y: -2,
                    }}
                    transition={{ type: "spring", stiffness: 220, damping: 18 }}
                    className="text-[1.2em] font-black uppercase tracking-[0.06em]"
                  >
                    {activeDisplayWord}
                  </motion.div>
                ) : null}
                <div className="space-y-2 text-[0.68em] opacity-90">
                  {wrappedText.map((line, index) => (
                    <div key={`focus-${index}`}>{line}</div>
                  ))}
                </div>
              </div>
            )
          : null}

        {project.style.template === "lower-third" ? (
          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-1.5 rounded-full"
                style={{ backgroundColor: project.style.accent_color }}
              />
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: project.style.accent_color }}
              />
            </div>
            <div className="space-y-1 text-[0.88em] font-semibold tracking-[0.04em]">
              {wrappedText.map((line, index) => (
                <div key={`lower-third-${index}`}>{line}</div>
              ))}
            </div>
          </div>
        ) : null}

        {project.style.template === "outline-pop" ? (
          <motion.div
            animate={{ scale: activeWord ? 1.015 : 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
            className="space-y-1 font-black uppercase"
          >
            {wrappedText.map((line, index) => (
              <div key={`outline-${index}`}>{line}</div>
            ))}
          </motion.div>
        ) : null}
        </motion.div>
      </div>
    </div>
  );
}

export function PreviewPanel({
  project,
  currentTime,
  onTimeChange,
  seekRequest,
}: PreviewPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!seekRequest || !videoRef.current) {
      return;
    }
    videoRef.current.currentTime = seekRequest.time;
    wavesurferRef.current?.setTime(seekRequest.time);
  }, [seekRequest]);

  useEffect(() => {
    if (!wavesurferRef.current) {
      return;
    }
    const difference = Math.abs(wavesurferRef.current.getCurrentTime() - currentTime);
    if (difference > 0.12) {
      wavesurferRef.current.setTime(currentTime);
    }
  }, [currentTime]);

  const handlePlayToggle = () => {
    if (!videoRef.current) {
      return;
    }
    if (videoRef.current.paused) {
      void videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  return (
    <section className="glass-panel flex h-[72vh] flex-col overflow-hidden rounded-[1.75rem]">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-cyan-200">
            Preview
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            Live caption overlay + timeline
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-200">
            {sourceBadgeLabel(project.transliteration_source, project.writing_system)}
          </span>
          <button
            type="button"
            className="rounded-full border border-white/10 p-3 text-slate-100 transition hover:border-white/20 hover:bg-white/8"
            onClick={handlePlayToggle}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 py-5">
        <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-[1.6rem] border border-white/10 bg-black">
          <video
            ref={videoRef}
            src={mediaUrl(project.video.url)}
            className="h-full w-full object-contain"
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(event) => onTimeChange(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/10" />
          <VideoOverlay project={project} currentTime={currentTime} />
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/60 p-4">
          <div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-300" />
              <span>Waveform timeline</span>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
            </span>
          </div>

          <div className="relative">
            <WavesurferPlayer
              height={110}
              url={mediaUrl(project.audio.url)}
              waveColor="#334155"
              progressColor={project.style.accent_color}
              cursorColor="#f8fafc"
              barWidth={3}
              barGap={2}
              dragToSeek
              normalize
              onReady={(wavesurfer) => {
                wavesurferRef.current = wavesurfer;
              }}
              onInteraction={(_, newTime) => {
                if (videoRef.current) {
                  videoRef.current.currentTime = newTime;
                }
                onTimeChange(newTime);
              }}
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex h-6 items-center gap-1 overflow-hidden">
              {project.segments.map((segment) => {
                const start = segment.start ?? 0;
                const end = segment.end ?? start;
                const left = duration ? (start / duration) * 100 : 0;
                const width = duration ? ((end - start) / duration) * 100 : 0;
                return (
                  <div
                    key={segment.id}
                    className="absolute h-2 rounded-full bg-cyan-400/30"
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 1)}%`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
