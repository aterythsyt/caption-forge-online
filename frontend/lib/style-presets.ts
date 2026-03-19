import type { CaptionStyle } from "@/lib/types";

export const CURATED_FONT_OPTIONS = [
  "Space Grotesk",
  "Bahnschrift",
  "Segoe UI",
  "Aptos",
  "Poppins",
  "Montserrat",
  "Sora",
  "Arial",
  "Arial Black",
  "Impact",
  "Trebuchet MS",
  "Franklin Gothic Medium",
];

export const TEMPLATE_OPTIONS: Array<{
  label: string;
  value: CaptionStyle["template"];
  description: string;
  preview: string;
}> = [
  {
    label: "Classic Subtitle",
    value: "standard",
    description: "Safe two-line subtitle block for general videos",
    preview: "Yeh clean subtitle har video par readable lagti hai",
  },
  {
    label: "Highlight Box",
    value: "dynamic-highlight",
    description: "Current word gets a bright chip for short-form content",
    preview: "Current word yahan pop karke samne aata hai",
  },
  {
    label: "Karaoke Track",
    value: "karaoke-bar",
    description: "Rounded word chips with active-word timing energy",
    preview: "Beat ke saath har lafz ka chip feel aata hai",
  },
  {
    label: "Broadcast Lower Third",
    value: "lower-third",
    description: "Wide anchored strip for explainers, interviews, and promos",
    preview: "News ya explainer type videos ke liye polished strip",
  },
  {
    label: "Punch Outline",
    value: "outline-pop",
    description: "Large outlined text with no heavy caption card",
    preview: "Yeh loud aur direct subtitle punch deta hai",
  },
  {
    label: "Focus Stack",
    value: "focus-word",
    description: "Active word leads the line while the rest stays supportive",
    preview: "Important lafz ko upar laa kar focus banata hai",
  },
];

export function buildTemplatePreset(template: CaptionStyle["template"]): Partial<CaptionStyle> {
  const shared = {
    template,
    background_color: "#020617",
    text_transform: "none" as const,
    letter_spacing: 0,
    line_height: 1.08,
  };

  switch (template) {
    case "standard":
      return {
        ...shared,
        font_size: 44,
        text_color: "#F8FAFC",
        accent_color: "#22D3EE",
        stroke_color: "#020617",
        background_color: "#020617",
        background_opacity: 64,
        position_x: 50,
        position_y: 90,
        alignment: "center",
        max_chars_per_line: 30,
      };
    case "dynamic-highlight":
      return {
        ...shared,
        font_size: 46,
        text_color: "#F8FAFC",
        accent_color: "#FACC15",
        stroke_color: "#020617",
        background_color: "#08111F",
        background_opacity: 74,
        position_x: 50,
        position_y: 88,
        alignment: "center",
        max_chars_per_line: 26,
      };
    case "karaoke-bar":
      return {
        ...shared,
        font_size: 32,
        text_color: "#E5EEF9",
        accent_color: "#2DD4BF",
        stroke_color: "#04111D",
        background_color: "#04111D",
        background_opacity: 90,
        position_x: 50,
        position_y: 91,
        alignment: "center",
        max_chars_per_line: 22,
        line_height: 1.22,
      };
    case "lower-third":
      return {
        ...shared,
        font_size: 36,
        text_color: "#F8FAFC",
        accent_color: "#FB7185",
        stroke_color: "#020617",
        background_color: "#020617",
        background_opacity: 92,
        position_x: 10,
        position_y: 92,
        alignment: "left",
        max_chars_per_line: 28,
        text_transform: "uppercase",
        letter_spacing: 0.6,
        line_height: 1.06,
      };
    case "outline-pop":
      return {
        ...shared,
        font_size: 60,
        text_color: "#F8FAFC",
        accent_color: "#F97316",
        stroke_color: "#020617",
        background_color: "#020617",
        background_opacity: 0,
        position_x: 50,
        position_y: 84,
        alignment: "center",
        max_chars_per_line: 18,
        line_height: 1.01,
      };
    case "focus-word":
      return {
        ...shared,
        font_size: 48,
        text_color: "#E2E8F0",
        accent_color: "#38BDF8",
        stroke_color: "#020617",
        background_color: "#020617",
        background_opacity: 62,
        position_x: 50,
        position_y: 84,
        alignment: "center",
        max_chars_per_line: 24,
        line_height: 1.04,
      };
    default:
      return shared;
  }
}
