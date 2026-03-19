"use client";

import type { CaptionStyle } from "@/lib/types";
import { TEMPLATE_OPTIONS } from "@/lib/style-presets";

type StylePanelProps = {
  style: CaptionStyle;
  fontOptions: string[];
  isSaving: boolean;
  isExporting: boolean;
  isExportingSrt: boolean;
  onStyleChange: (patch: Partial<CaptionStyle>) => void;
  onSave: () => void;
  onExportSrt: () => void;
  onExport: () => void;
};

function RangeControl({
  label,
  min,
  max,
  step = 1,
  value,
  suffix = "",
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between text-sm font-medium text-slate-200">
        {label}
        <span className="font-mono text-xs text-slate-400">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function StylePanel({
  style,
  fontOptions,
  isSaving,
  isExporting,
  isExportingSrt,
  onStyleChange,
  onSave,
  onExportSrt,
  onExport,
}: StylePanelProps) {
  return (
    <section className="glass-panel flex h-[72vh] flex-col rounded-[1.75rem]">
      <div className="border-b border-white/8 px-5 py-4">
        <p className="text-xs uppercase tracking-[0.32em] text-orange-200">
          Styling
        </p>
        <h3 className="mt-2 text-lg font-semibold text-white">
          Templates and burn-in controls
        </h3>
      </div>

      <div className="caption-scroll flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <div className="grid gap-2">
          <div className="flex items-end justify-between">
            <span className="text-sm font-medium text-slate-200">Templates</span>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
              public-style inspired looks
            </span>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 px-3 py-3 text-xs text-slate-400">
            Switching templates now keeps your chosen font family and font size locked
            instead of resetting them.
          </div>
          <div className="grid gap-2">
            {TEMPLATE_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`rounded-[1.35rem] border p-4 text-left transition ${
                  style.template === item.value
                    ? "border-cyan-400/40 bg-cyan-400/12 text-cyan-100 shadow-[0_18px_40px_rgba(34,211,238,0.12)]"
                    : "border-white/10 bg-white/4 text-slate-300 hover:border-white/20"
                }`}
                onClick={() => onStyleChange({ template: item.value })}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="mt-1 text-xs text-slate-400">{item.description}</div>
                  </div>
                  <div className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    {style.template === item.value ? "active" : "preset"}
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-white/8 bg-slate-950/45 px-3 py-3 text-sm text-slate-200">
                  {item.preview}
                </div>
              </button>
            ))}
          </div>
        </div>

        <label className="grid gap-2">
          <div className="flex items-end justify-between">
            <span className="text-sm font-medium text-slate-200">Font family</span>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {fontOptions.length} available on this PC
            </span>
          </div>
          <select
            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/50"
            value={style.font_family}
            onChange={(event) => onStyleChange({ font_family: event.target.value })}
          >
            {fontOptions.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          <div className="rounded-2xl border border-white/8 bg-white/4 px-3 py-3 text-xs text-slate-400">
            Tip: fonts listed here are pulled from your local Windows install, so
            caption preview and export can use the same families more reliably.
          </div>
        </label>

        <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
          <div className="mb-4 text-sm font-medium text-slate-200">Typography</div>
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <RangeControl
            label="Font size"
            min={16}
            max={120}
            value={style.font_size}
            suffix="px"
            onChange={(value) => onStyleChange({ font_size: value })}
          />
          <input
            type="number"
            min={16}
            max={120}
            value={style.font_size}
            onChange={(event) =>
              onStyleChange({ font_size: Number(event.target.value) || 16 })
            }
            className="w-24 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/50"
          />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
          <RangeControl
            label="Line width"
            min={18}
            max={60}
            value={style.max_chars_per_line}
            suffix="ch"
            onChange={(value) => onStyleChange({ max_chars_per_line: value })}
          />
          <RangeControl
            label="Background opacity"
            min={0}
            max={100}
            value={style.background_opacity}
            suffix="%"
            onChange={(value) => onStyleChange({ background_opacity: value })}
          />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
          <RangeControl
            label="Line height"
            min={1}
            max={1.8}
            step={0.02}
            value={Number(style.line_height.toFixed(2))}
            onChange={(value) => onStyleChange({ line_height: value })}
          />
          <RangeControl
            label="Letter spacing"
            min={-1}
            max={8}
            step={0.2}
            value={Number(style.letter_spacing.toFixed(1))}
            suffix="px"
            onChange={(value) => onStyleChange({ letter_spacing: value })}
          />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
          <div className="mb-4 text-sm font-medium text-slate-200">Color and surface</div>
          <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-200">Text</span>
            <input
              type="color"
              value={style.text_color}
              onChange={(event) => onStyleChange({ text_color: event.target.value })}
              className="h-12 w-full rounded-2xl border border-white/10 bg-transparent"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-200">Accent</span>
            <input
              type="color"
              value={style.accent_color}
              onChange={(event) => onStyleChange({ accent_color: event.target.value })}
              className="h-12 w-full rounded-2xl border border-white/10 bg-transparent"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-200">Stroke</span>
            <input
              type="color"
              value={style.stroke_color}
              onChange={(event) => onStyleChange({ stroke_color: event.target.value })}
              className="h-12 w-full rounded-2xl border border-white/10 bg-transparent"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-200">Background</span>
            <input
              type="color"
              value={style.background_color}
              onChange={(event) =>
                onStyleChange({ background_color: event.target.value })
              }
              className="h-12 w-full rounded-2xl border border-white/10 bg-transparent"
            />
          </label>
        </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
          <div className="mb-4 text-sm font-medium text-slate-200">Positioning</div>
          <div className="grid gap-4 md:grid-cols-2">
          <RangeControl
            label="Horizontal position"
            min={4}
            max={96}
            value={Math.round(style.position_x)}
            suffix="%"
            onChange={(value) => onStyleChange({ position_x: value })}
          />
          <RangeControl
            label="Vertical position"
            min={18}
            max={96}
            value={Math.round(style.position_y)}
            suffix="%"
            onChange={(value) => onStyleChange({ position_y: value })}
          />
          </div>

          <div className="mt-4 grid gap-2">
            <span className="text-sm font-medium text-slate-200">Alignment</span>
            <div className="grid grid-cols-3 gap-2">
              {(["left", "center", "right"] as const).map((alignment) => (
                <button
                  key={alignment}
                  type="button"
                  className={`rounded-2xl border px-3 py-3 text-sm capitalize transition ${
                    style.alignment === alignment
                      ? "border-orange-400/40 bg-orange-400/12 text-orange-100"
                      : "border-white/10 bg-white/4 text-slate-300 hover:border-white/20"
                  }`}
                  onClick={() => onStyleChange({ alignment })}
                >
                  {alignment}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <span className="text-sm font-medium text-slate-200">Text transform</span>
            <div className="grid grid-cols-3 gap-2">
              {(["none", "uppercase", "lowercase"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-2xl border px-3 py-3 text-sm capitalize transition ${
                    style.text_transform === mode
                      ? "border-cyan-400/40 bg-cyan-400/12 text-cyan-100"
                      : "border-white/10 bg-white/4 text-slate-300 hover:border-white/20"
                  }`}
                  onClick={() => onStyleChange({ text_transform: mode })}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 px-5 py-4">
        <div className="grid gap-3">
          <button
            type="button"
            className="w-full rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:border-cyan-400/35 hover:bg-cyan-400/14 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onExportSrt}
            disabled={isExportingSrt}
          >
            {isExportingSrt ? "Exporting SRT..." : "Export SRT"}
          </button>

          <div className="flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            className="flex-1 rounded-full bg-gradient-to-r from-cyan-400 to-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onExport}
            disabled={isExporting}
          >
            {isExporting ? "Exporting..." : "Export video"}
          </button>
          </div>
        </div>
      </div>
    </section>
  );
}
