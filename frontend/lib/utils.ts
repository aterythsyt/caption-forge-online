import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { CaptionSegment, CaptionWord } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(value: number | null) {
  const safeValue = Math.max(value ?? 0, 0);
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  const milliseconds = Math.floor((safeValue % 1) * 1000);
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}

export function segmentTextFromWords(words: CaptionWord[]) {
  return words.reduce((text, word) => {
    const token = word.word.trim();
    if (!token) {
      return text;
    }
    if (!text) {
      return token;
    }
    if (/^[.,!?;:%)\]}]+$/.test(token)) {
      return `${text}${token}`;
    }
    return `${text} ${token}`;
  }, "");
}

export function transformCaptionText(
  value: string,
  textTransform: "none" | "uppercase" | "lowercase",
) {
  if (textTransform === "uppercase") {
    return value.toUpperCase();
  }
  if (textTransform === "lowercase") {
    return value.toLowerCase();
  }
  return value;
}

export function wrapCaptionText(text: string, maxCharsPerLine: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export function wrapCaptionWords(words: CaptionWord[], maxCharsPerLine: number) {
  const lines: CaptionWord[][] = [];
  let currentLine: CaptionWord[] = [];
  let currentLength = 0;

  for (const word of words) {
    const token = word.word.trim();
    const tokenLength = token.length || 1;
    const projectedLength = currentLine.length
      ? currentLength + 1 + tokenLength
      : tokenLength;

    if (projectedLength > maxCharsPerLine && currentLine.length) {
      lines.push(currentLine);
      currentLine = [word];
      currentLength = tokenLength;
    } else {
      currentLine.push(word);
      currentLength = projectedLength;
    }
  }

  if (currentLine.length) {
    lines.push(currentLine);
  }

  return lines;
}

export function getActiveSegment(segments: CaptionSegment[], currentTime: number) {
  return (
    segments.find(
      (segment) =>
        segment.start !== null &&
        segment.end !== null &&
        currentTime >= segment.start &&
        currentTime <= segment.end,
    ) ?? null
  );
}

export function getActiveWord(segment: CaptionSegment | null, currentTime: number) {
  if (!segment) {
    return null;
  }
  return (
    segment.words.find(
      (word) =>
        word.start !== null &&
        word.end !== null &&
        currentTime >= word.start &&
        currentTime <= word.end,
    ) ?? null
  );
}
