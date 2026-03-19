from __future__ import annotations

import json
import os
import subprocess
import sys
import wave
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("WHISPER_MODEL", "small")
os.environ.setdefault("WHISPER_DEVICE", "cpu")
os.environ.setdefault("WHISPER_COMPUTE_TYPE", "int8")
os.environ.setdefault("WHISPER_BATCH_SIZE", "2")

from app.main import app  # noqa: E402
from app.services import build_segments  # noqa: E402


def assets_dir() -> Path:
    return BACKEND_ROOT / "test_assets"


def ensure_test_audio() -> Path:
    output_path = assets_dir() / "paris_pickpocket_story.wav"
    if output_path.exists():
        return output_path
    subprocess.run(
        [".venv\\Scripts\\python.exe", "scripts\\generate_test_audio.py"],
        cwd=BACKEND_ROOT,
        check=True,
    )
    return output_path


def build_video_from_audio(audio_path: Path) -> Path:
    output_path = assets_dir() / "paris_pickpocket_story.mp4"

    with wave.open(str(audio_path), "rb") as wav_file:
        duration = wav_file.getnframes() / wav_file.getframerate()

    command = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=c=#101828:s=1280x720:d={duration}",
        "-i",
        str(audio_path),
        "-shortest",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        str(output_path),
    ]
    subprocess.run(command, check=True, capture_output=True)
    return output_path


def verify_native_to_roman_timestamps() -> dict[str, object]:
    native_segments = [
        {
            "text": "\u092e\u0948\u0902 \u092a\u0947\u0930\u093f\u0938 \u092e\u0947\u0902 \u0925\u093e",
            "start": 0.0,
            "end": 1.7,
            "words": [
                {"word": "\u092e\u0948\u0902", "start": 0.0, "end": 0.4, "score": 0.9},
                {
                    "word": "\u092a\u0947\u0930\u093f\u0938",
                    "start": 0.4,
                    "end": 0.9,
                    "score": 0.9,
                },
                {"word": "\u092e\u0947\u0902", "start": 0.9, "end": 1.2, "score": 0.9},
                {"word": "\u0925\u093e", "start": 1.2, "end": 1.7, "score": 0.9},
            ],
        }
    ]

    expected_times = [
        (word["start"], word["end"])
        for segment in native_segments
        for word in segment["words"]
    ]
    segments, source = build_segments(native_segments, "hi", "roman")
    actual_times = [
        (word.start, word.end)
        for segment in segments
        for word in segment.words
    ]
    assert actual_times == expected_times, "Transliteration changed word timestamps."

    return {
        "transliteration_source": source,
        "native_text": native_segments[0]["text"],
        "roman_text": segments[0].text,
        "timestamps_preserved": actual_times == expected_times,
    }


def main() -> None:
    assets_dir().mkdir(parents=True, exist_ok=True)
    audio_path = ensure_test_audio()
    video_path = build_video_from_audio(audio_path)
    client = TestClient(app)

    with video_path.open("rb") as video_file:
        response = client.post(
            "/api/projects/transcribe",
            files={"video": (video_path.name, video_file, "video/mp4")},
            data={"language": "english", "writing_system": "native"},
        )

    response.raise_for_status()
    project = response.json()
    aligned_words = [
        word
        for segment in project["segments"]
        for word in segment["words"]
        if word["start"] is not None and word["end"] is not None
    ]
    assert aligned_words, "WhisperX returned no aligned word timestamps."

    export_response = client.post(
        f"/api/projects/{project['id']}/export",
        json={},
    )
    export_response.raise_for_status()
    export_payload = export_response.json()

    roman_fixture_result = verify_native_to_roman_timestamps()

    report = {
        "project_id": project["id"],
        "segment_count": len(project["segments"]),
        "aligned_word_count": len(aligned_words),
        "sample_words": aligned_words[:8],
        "export_url": export_payload["export_url"],
        "roman_fixture": roman_fixture_result,
    }
    print(json.dumps(report, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
