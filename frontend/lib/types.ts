export type MediaAsset = {
  filename: string;
  url: string;
};

export type CaptionWord = {
  id: string;
  native_word: string;
  word: string;
  start: number | null;
  end: number | null;
  score: number | null;
};

export type CaptionSegment = {
  id: string;
  native_text: string;
  text: string;
  start: number | null;
  end: number | null;
  words: CaptionWord[];
};

export type CaptionStyle = {
  template:
    | "standard"
    | "dynamic-highlight"
    | "karaoke-bar"
    | "lower-third"
    | "outline-pop"
    | "focus-word";
  font_family: string;
  font_size: number;
  text_color: string;
  accent_color: string;
  stroke_color: string;
  background_color: string;
  background_opacity: number;
  position_x: number;
  position_y: number;
  alignment: "left" | "center" | "right";
  max_chars_per_line: number;
  line_height: number;
  letter_spacing: number;
  text_transform: "none" | "uppercase" | "lowercase";
};

export type VideoProject = {
  id: string;
  title: string;
  source_language: string;
  writing_system: string;
  refinement_mode: "local" | "ai";
  model: string;
  transliteration_source: string;
  created_at: string;
  updated_at: string;
  video: MediaAsset;
  audio: MediaAsset;
  export_url: string | null;
  subtitle_url: string | null;
  style: CaptionStyle;
  segments: CaptionSegment[];
};

export type ProjectSummary = {
  id: string;
  title: string;
  source_language: string;
  writing_system: string;
  updated_at: string;
  video_url: string;
  export_url: string | null;
};

export type ExportResponse = {
  project_id: string;
  export_url: string;
  filename: string;
};

export type SubtitleExportResponse = {
  project_id: string;
  subtitle_url: string;
  filename: string;
};

export type DeleteResponse = {
  deleted_count: number;
  detail: string;
};
