"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";

type PrepareMediaModalProps = {
  open: boolean;
  file: File | null;
  language: string;
  writingSystem: string;
  refinementMode: string;
  onClose: () => void;
  onSubmit: () => void;
  onLanguageChange: (value: string) => void;
  onWritingSystemChange: (value: string) => void;
  onRefinementModeChange: (value: string) => void;
  isBusy: boolean;
};

const languages = [
  { label: "Urdu", value: "urdu" },
  { label: "Hindi", value: "hindi" },
  { label: "English", value: "english" },
];

const writingSystems = [
  { label: "Native Script", value: "native" },
  { label: "Roman Output", value: "roman" },
];

const refinementModes = [
  { label: "AI Enhanced", value: "ai" },
  { label: "Standard", value: "standard" },
];

export function PrepareMediaModal({
  open,
  file,
  language,
  writingSystem,
  refinementMode,
  onClose,
  onSubmit,
  onLanguageChange,
  onWritingSystemChange,
  onRefinementModeChange,
  isBusy,
}: PrepareMediaModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass-panel relative w-full max-w-xl rounded-[2rem] p-8"
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="absolute top-5 right-5 rounded-full border border-white/10 p-2 text-slate-400 transition hover:border-white/20 hover:text-white"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-8 flex items-start gap-4">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">
                  Prepare your media
                </p>
                <h3 className="text-3xl font-semibold text-white">
                  Tune the transcription before we process it
                </h3>
                <p className="text-sm text-slate-400">
                  {file?.name ?? "No file selected yet"}
                </p>
                <p className="text-sm text-slate-500">
                  Select Roman Output to convert Urdu into Roman Urdu and Hindi
                  into Hinglish while preserving the original word timings.
                </p>
                <p className="text-sm text-slate-500">
                  Both modes run online. AI Enhanced adds extra cleanup for
                  better Roman Urdu and Hinglish, while Standard keeps the
                  pass faster.
                </p>
              </div>
            </div>

            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-200">Language</span>
                <select
                  className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/50"
                  value={language}
                  onChange={(event) => onLanguageChange(event.target.value)}
                >
                  {languages.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-200">
                  Writing system
                </span>
                <select
                  className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/50"
                  value={writingSystem}
                  onChange={(event) => onWritingSystemChange(event.target.value)}
                >
                  {writingSystems.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-200">
                  Accuracy mode
                </span>
                <select
                  className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/50"
                  value={refinementMode}
                  onChange={(event) => onRefinementModeChange(event.target.value)}
                >
                  {refinementModes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-gradient-to-r from-cyan-400 to-orange-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy || !file}
                onClick={onSubmit}
              >
                {isBusy ? "Generating..." : "Generate transcription"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
