"use client";

import { Film, UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { cn } from "@/lib/utils";

type UploadDropzoneProps = {
  onSelectFile: (file: File) => void;
  isBusy: boolean;
};

export function UploadDropzone({ onSelectFile, isBusy }: UploadDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
    },
    disabled: isBusy,
    maxFiles: 1,
    onDropAccepted: (files) => {
      const [file] = files;
      if (file) {
        onSelectFile(file);
      }
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "glass-panel panel-grid group relative overflow-hidden rounded-[2rem] border px-8 py-14 transition-all duration-300",
        isDragActive && "border-cyan-400/70 bg-cyan-400/10 shadow-[0_0_80px_rgba(34,211,238,0.18)]",
        isBusy && "cursor-progress opacity-80",
      )}
    >
      <input {...getInputProps()} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_35%)] opacity-80" />
      <div className="relative flex flex-col items-center gap-5 text-center">
        <div className="flex h-18 w-18 items-center justify-center rounded-full border border-white/10 bg-white/5 text-cyan-300">
          {isDragActive ? <Film className="h-8 w-8" /> : <UploadCloud className="h-8 w-8" />}
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Drop your footage and build captions locally
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-300">
          Upload MP4 or MOV, generate accurate online captions with AI cleanup,
            convert Hindi and Urdu into Roman script, then edit and export everything
            on your own machine.
          </p>
        </div>
        <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-200">
          {isBusy ? "Processing..." : "Drop video or click to browse"}
        </div>
      </div>
    </div>
  );
}
