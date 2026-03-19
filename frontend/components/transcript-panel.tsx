"use client";

import type { CaptionSegment, VideoProject } from "@/lib/types";
import { cn, formatTimestamp } from "@/lib/utils";

type TranscriptPanelProps = {
  project: VideoProject;
  currentTime: number;
  onSeek: (time: number) => void;
  onSegmentTextChange: (segmentId: string, value: string) => void;
  onWordChange: (segmentId: string, wordId: string, value: string) => void;
};

function isSegmentActive(segment: CaptionSegment, currentTime: number) {
  if (segment.start === null || segment.end === null) {
    return false;
  }
  return currentTime >= segment.start && currentTime <= segment.end;
}

export function TranscriptPanel({
  project,
  currentTime,
  onSeek,
  onSegmentTextChange,
  onWordChange,
}: TranscriptPanelProps) {
  return (
    <section className="glass-panel caption-scroll flex h-[72vh] flex-col overflow-hidden rounded-[1.75rem]">
      <div className="border-b border-white/8 px-5 py-4">
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-200">
          Transcript
        </p>
        <h3 className="mt-2 text-lg font-semibold text-white">
          Edit lines and timing-safe words
        </h3>
      </div>

      <div className="caption-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {project.segments.map((segment) => {
          const active = isSegmentActive(segment, currentTime);
          return (
            <div
              key={segment.id}
              className={cn(
                "w-full rounded-[1.4rem] border px-4 py-4 transition",
                active
                  ? "border-cyan-400/40 bg-cyan-400/10 shadow-[0_18px_36px_rgba(34,211,238,0.12)]"
                  : "border-white/8 bg-white/4 hover:border-white/16 hover:bg-white/6",
              )}
            >
              <button
                type="button"
                className="mb-3 flex w-full items-center justify-between gap-3 text-left"
                onClick={() => onSeek(segment.start ?? 0)}
              >
                <div className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">
                  {formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}
                </div>
                {active ? (
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-cyan-200">
                    live
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    seek
                  </span>
                )}
              </button>

              <div className="grid gap-3">
                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    Caption line
                  </span>
                  <textarea
                    value={segment.text}
                    rows={2}
                    onChange={(event) =>
                      onSegmentTextChange(segment.id, event.target.value)
                    }
                    className="resize-none rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/40"
                  />
                </label>

                <div className="rounded-2xl border border-white/8 bg-slate-950/35 px-3 py-3">
                  <div className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-400">
                    Native reference
                  </div>
                  <p className="text-sm leading-6 text-slate-300">{segment.native_text}</p>
                </div>

                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-400">
                    Word-level edit
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {segment.words.map((word) => (
                      <input
                        key={word.id}
                        value={word.word}
                        onChange={(event) =>
                          onWordChange(segment.id, word.id, event.target.value)
                        }
                        className="min-w-[5rem] rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/40"
                        title={word.native_word}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
