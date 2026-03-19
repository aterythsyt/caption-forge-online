from __future__ import annotations

import base64
import json
import os
import re
import shutil
import threading
import uuid
from collections.abc import Iterable
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request

import ffmpeg
from fastapi import HTTPException, UploadFile
from gradio_client import Client, handle_file
from uroman import Uroman

from .config import get_settings
from .schemas import CaptionSegment, CaptionStyle, CaptionWord, ExportResponse, MediaAsset, ProjectSummary, SubtitleExportResponse, VideoProject

try:
    from indic_transliteration import sanscript
except ImportError:  # pragma: no cover
    sanscript = None


settings = get_settings()

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".m4v"}
LANGUAGE_ALIASES = {
    "english": "en",
    "en": "en",
    "hindi": "hi",
    "hi": "hi",
    "urdu": "ur",
    "ur": "ur",
}
WRITING_SYSTEM_ALIASES = {
    "native": "native",
    "native script": "native",
    "roman": "roman",
    "roman urdu": "roman",
    "roman/hinglish": "roman",
    "hinglish": "roman",
}
REFINEMENT_MODE_ALIASES = {
    "standard": "local",
    "fast": "local",
    "local": "local",
    "without-ai": "local",
    "without ai": "local",
    "no-ai": "local",
    "no ai": "local",
    "ai": "ai",
    "agentrouter": "ai",
    "agentrouter-ai": "ai",
    "agent router": "ai",
}
UROMAN_LANGUAGE_CODES = {"en": "eng", "hi": "hin", "ur": "urd"}
PUNCTUATION_ONLY_RE = re.compile(r"^[^\w]+$", re.UNICODE)
LATIN_TEXT_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9'._-]*$")
MULTISPACE_RE = re.compile(r"\s+")
TIMESTAMP_LINE_RE = re.compile(
    r"^\[(?P<start>\d{2}:\d{2}(?::\d{2})?\.\d{3}) -> (?P<end>\d{2}:\d{2}(?::\d{2})?\.\d{3})\]\s*(?P<text>.+?)\s*$"
)
NON_WORD_CHARS_RE = re.compile(r"[^\w]+", re.UNICODE)
NO_LEADING_SPACE = set(".,!?;:%)]}'\"")
NO_TRAILING_SPACE = set("([{/'\"")

SHARED_ROMAN_OVERRIDES = {
    "widdiw": "video",
    "vidiyo": "video",
    "wizh": "visa",
    "shiyer": "share",
    "laik": "like",
    "sbskrayb": "subscribe",
    "sabskrayb": "subscribe",
    "kamint": "comment",
    "chynl": "channel",
    "link": "link",
}
NATIVE_ROMAN_OVERRIDES = {
    "ur": {
        "آپ": "aap",
        "آفس": "office",
        "آفیس": "office",
        "اپنے": "apnay",
        "اپ": "up",
        "اپلائی": "apply",
        "اپروگ": "approve",
        "ان": "in",
        "اگر": "agar",
        "اس": "is",
        "اور": "aur",
        "اوپر": "upar",
        "امبیسی": "embassy",
        "اماؤنٹ": "amount",
        "ایسا": "aisa",
        "ایسی": "aisi",
        "ایسے": "aisay",
        "اینا": "itna",
        "باہر": "bahar",
        "بات": "baat",
        "باقی": "baqi",
        "بعد": "baad",
        "بندہ": "banda",
        "بندے": "banday",
        "بھی": "bhi",
        "بیس": "bees",
        "بیٹھا": "baitha",
        "پچاس": "pachaas",
        "پچیس": "pachees",
        "پاکستان": "pakistan",
        "پیسے": "paise",
        "پہ": "pe",
        "پیہ": "pay",
        "پر": "par",
        "تاکہ": "taake",
        "تیار": "tayyar",
        "ٹائز": "ties",
        "تھے": "thay",
        "تھی": "thi",
        "تھوڑا": "thora",
        "تھوڑے": "thoray",
        "ٹھیک": "theek",
        "تک": "tak",
        "تو": "to",
        "جو": "jo",
        "جاننے": "jaanay",
        "جب": "jab",
        "جگہ": "jagah",
        "جیسے": "jaise",
        "جتنے": "jitnay",
        "جن": "jin",
        "چاہیے": "chahiye",
        "چکے": "chukay",
        "چیز": "cheez",
        "چیزوں": "cheezon",
        "چلی": "chali",
        "خرچہ": "kharcha",
        "خدارہ": "khudara",
        "خود": "khud",
        "دس": "das",
        "دن": "din",
        "دی": "di",
        "دیا": "diya",
        "دے": "de",
        "دیئے": "diye",
        "ڈاکومنٹیشن": "documentation",
        "ڈیل": "deal",
        "ڈن": "done",
        "روپیہ": "rupay",
        "ریلیٹیو": "relative",
        "رہے": "rahay",
        "ساتھ": "saath",
        "سین": "scene",
        "سکیم": "scheme",
        "سیکنڈ": "second",
        "سیٹ": "set",
        "سے": "se",
        "طرح": "tarah",
        "فارم": "form",
        "فرض": "farz",
        "فلانے": "falaanay",
        "کام": "kaam",
        "کہ": "ke",
        "کہا": "kaha",
        "کنٹری": "country",
        "کرتا": "karta",
        "کرتے": "kartay",
        "کرنا": "karna",
        "کر": "kar",
        "کسی": "kisi",
        "کلائنٹ": "client",
        "کچھی": "kuch",
        "کچھ": "kuch",
        "کو": "ko",
        "کوئی": "koi",
        "کونٹیکٹ": "contact",
        "کی": "ki",
        "کیس": "case",
        "کیسے": "kaisay",
        "کہتے": "kehtay",
        "کے": "ke",
        "گے": "gay",
        "گیا": "gaya",
        "گئے": "gaye",
        "لاکھ": "lakh",
        "لوگ": "log",
        "لوگوں": "logon",
        "لگ": "lag",
        "لیے": "liye",
        "ماننے": "maangnay",
        "مانگے": "maangay",
        "میں": "mein",
        "میرا": "mera",
        "میری": "meri",
        "میرے": "meray",
        "مطلب": "matlab",
        "نا": "na",
        "نمبر": "number",
        "نہیں": "nahi",
        "نے": "ne",
        "نیچے": "neechay",
        "والا": "wala",
        "والی": "wali",
        "وائنڈ": "mind",
        "ویڈیو": "video",
        "ویزا": "visa",
        "وہ": "woh",
        "وزیٹ": "visit",
        "وہاں": "wahan",
        "ہفتے": "haftay",
        "ہم": "hum",
        "ہمیشہ": "hamesha",
        "ہوم": "home",
        "ہوتی": "hoti",
        "ہے": "hai",
        "ہیں": "hain",
        "ہو": "ho",
        "ہوں": "hoon",
        "ہوئی": "hui",
        "ہوئے": "huay",
        "ہوتا": "hota",
        "ہوگا": "hoga",
        "انہوں": "unhon",
        "یہ": "yeh",
        "یار": "yaar",
        "یا": "ya",
        "آ": "aa",
        "آتے": "aatay",
        "ایک": "aik",
        "دو": "do",
        "کیا": "kya",
        "کریں": "karein",
        "پندر": "pandrah",
        "پھوڑ": "fraud",
        "شروع": "shuru",
    },
    "hi": {
        "यह": "yeh",
        "वीडियो": "video",
        "शेयर": "share",
        "करें": "karein",
    },
}
LANGUAGE_ROMAN_OVERRIDES = {
    "ur": {
        "ih": "yeh",
        "dw": "do",
        "tchizwn": "cheezon",
        "kye": "ke",
        "awpr": "upar",
        "ap": "aap",
        "kw": "ko",
        "mlta": "milta",
        "hye": "hai",
        "awr": "aur",
        "khdarh": "khudara",
        "as": "is",
        "ziadh": "zyada",
        "sye": "se",
        "krin": "karein",
        "takh": "taake",
        "baqi": "baqi",
        "lwg": "log",
        "jw": "jo",
        "wh": "woh",
        "ktchh": "kuch",
        "sikh": "seekh",
        "skin": "sakein",
        "khwd": "khud",
        "an": "in",
        "jisye": "jaise",
        "lwgwn": "logon",
        "ntcha": "bacha",
    },
    "hi": {
        "ye": "yeh",
        "vidiyo": "video",
        "shayar": "share",
        "kren": "karein",
        "zyada": "zyada",
    },
}
AI_REFINED_ROMAN_NORMALIZATION = {
    "ur": {
        "ap": "aap",
        "tm": "tum",
        "ye": "yeh",
        "wo": "woh",
        "han": "hain",
        "ha": "hai",
    },
    "hi": {
        "ap": "aap",
        "ye": "yeh",
    },
}
TRAILING_NASAL_RE = re.compile(r"([aeiou])m\b")
MONEY_AMOUNT_TOKENS = {
    "aik",
    "ek",
    "do",
    "das",
    "bees",
    "pachees",
    "pachaas",
    "pandrah",
    "sau",
    "hazaar",
    "lakh",
}
URDU_ROMAN_CLEANUP_PATTERNS = [
    (re.compile(r"^nhin$|^nhi$|^nhi$"), "nahi"),
    (re.compile(r"^thye$"), "thay"),
    (re.compile(r"^kr$"), "kar"),
    (re.compile(r"^tw$"), "to"),
    (re.compile(r"^ph$"), "pe"),
    (re.compile(r"^b'd$"), "baad"),
    (re.compile(r"^iar$"), "yaar"),
    (re.compile(r"^min$"), "mein"),
    (re.compile(r"^miri$"), "meri"),
    (re.compile(r"^mira$"), "mera"),
    (re.compile(r"^mirye$"), "meray"),
    (re.compile(r"^hftye$"), "haftay"),
    (re.compile(r"^rwpih$"), "rupay"),
    (re.compile(r"^pisye$"), "paise"),
    (re.compile(r"^pchas$"), "pachaas"),
    (re.compile(r"^pchis$"), "pachees"),
    (re.compile(r"^shrw'?$"), "shuru"),
    (re.compile(r"^kwyei$"), "koi"),
    (re.compile(r"^ddil$"), "deal"),
    (re.compile(r"^jb$"), "jab"),
    (re.compile(r"^pr$"), "par"),
    (re.compile(r"^lg$"), "lag"),
    (re.compile(r"^tk$"), "tak"),
    (re.compile(r"^diyeye$|^diyee$"), "diye"),
    (re.compile(r"^mtlb$"), "matlab"),
    (re.compile(r"^isye$"), "aisay"),
    (re.compile(r"^amawntt$"), "amount"),
    (re.compile(r"^chkye$"), "chukay"),
    (re.compile(r"^wzitt$"), "visit"),
    (re.compile(r"^sitt$"), "set"),
    (re.compile(r"^wayendd$"), "mind"),
    (re.compile(r"^klayentt$"), "client"),
    (re.compile(r"^agr$"), "agar"),
    (re.compile(r"^phwrr$"), "fraud"),
    (re.compile(r"^khtye$"), "kehtay"),
    (re.compile(r"^ttayez$"), "ties"),
    (re.compile(r"^mannye$"), "maangnay"),
    (re.compile(r"^jtnye$"), "jitnay"),
    (re.compile(r"^atye$"), "aatay"),
    (re.compile(r"^gyeye$"), "gaye"),
    (re.compile(r"^hm$"), "hum"),
    (re.compile(r"^whan$"), "wahan"),
    (re.compile(r"^afis$"), "office"),
    (re.compile(r"^krnye$"), "karnay"),
    (re.compile(r"^thwrra$"), "thora"),
    (re.compile(r"^bndye$"), "banday"),
    (re.compile(r"^ia$"), "ya"),
    (re.compile(r"^jn$"), "jin"),
]

UROMAN_LOCK = threading.Lock()
UROMAN_INSTANCE: Uroman | None = None
SPACE_CLIENT_LOCK = threading.Lock()
SPACE_CLIENT_CACHE: dict[str, Client] = {}


try:  # pragma: no cover
    import winreg
except ImportError:  # pragma: no cover
    winreg = None


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def project_path(project_id: str) -> Path:
    return settings.project_root / f"{project_id}.json"


def build_media_asset(path: Path) -> MediaAsset:
    relative_path = path.relative_to(settings.media_root).as_posix()
    return MediaAsset(filename=path.name, url=f"/media/{relative_path}")


def save_project(project: VideoProject) -> VideoProject:
    payload = project.model_dump(mode="json")
    project_path(project.id).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return project


def remove_path(path: Path) -> None:
    if path.exists():
        path.unlink()


def delete_project_files(project: VideoProject) -> None:
    remove_path(project_path(project.id))

    for asset_url in (project.video.url, project.audio.url, project.export_url, project.subtitle_url):
        if not asset_url:
            continue
        asset_path = settings.media_root / asset_url.removeprefix("/media/")
        remove_path(asset_path)

    for extra_path in settings.ass_root.glob(f"{project.id}*"):
        remove_path(extra_path)

    for extra_path in settings.export_root.glob(f"{project.id}*"):
        remove_path(extra_path)


def cleanup_expired_projects() -> None:
    if settings.project_retention_hours <= 0:
        return

    cutoff = utc_now() - timedelta(hours=settings.project_retention_hours)
    for item in settings.project_root.glob("*.json"):
        try:
            project = VideoProject.model_validate_json(item.read_text(encoding="utf-8"))
        except Exception:
            continue
        if project.updated_at <= cutoff:
            delete_project_files(project)


def load_project(project_id: str) -> VideoProject:
    path = project_path(project_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Project not found.")
    return VideoProject.model_validate_json(path.read_text(encoding="utf-8"))


def list_projects() -> list[ProjectSummary]:
    cleanup_expired_projects()
    projects: list[ProjectSummary] = []
    for item in settings.project_root.glob("*.json"):
        project = VideoProject.model_validate_json(item.read_text(encoding="utf-8"))
        projects.append(
            ProjectSummary(
                id=project.id,
                title=project.title,
                source_language=project.source_language,
                writing_system=project.writing_system,
                updated_at=project.updated_at,
                video_url=project.video.url,
                export_url=project.export_url,
            )
        )
    return sorted(projects, key=lambda project: project.updated_at, reverse=True)


def normalize_font_family_name(name: str) -> str:
    normalized = re.sub(r"\s+\((TrueType|OpenType|All res)\)$", "", name, flags=re.IGNORECASE)
    normalized = re.sub(r"\s+\d+pt\b", "", normalized, flags=re.IGNORECASE)
    normalized = normalized.replace("-", " ")
    normalized = re.sub(
        r"\s+(Bold Italic|Bold|Italic|Light Italic|Light|Semibold|SemiBold|Regular|ExtraBold|ExtraLight|Medium|Black|Thin|Semilight|Variable)$",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = normalized.split("&")[0].strip()
    normalized = normalized.replace("  ", " ").strip()
    return normalized


def list_system_fonts() -> list[str]:
    font_names: dict[str, str] = {}
    known_single_word_fonts = {
        "Arial",
        "Assistant",
        "Bahnschrift",
        "Calibri",
        "Cambria",
        "Candara",
        "Consolas",
        "Constantia",
        "Corbel",
        "Courier",
        "Ebrima",
        "Gabriola",
        "Gadugi",
        "Georgia",
        "Impact",
        "Ink",
        "Inter",
        "Jost",
        "Malgun",
        "Nirmala",
        "Roboto",
        "Tahoma",
        "Verdana",
        "Sylfaen",
        "Symbol",
        "Webdings",
        "Wingdings",
    }

    def add_font_name(raw_name: str) -> None:
        normalized = normalize_font_family_name(raw_name)
        if not normalized:
            return
        if "," in normalized:
            return
        if re.fullmatch(r"[a-z0-9_-]+", normalized):
            return
        if " " not in normalized and normalized not in known_single_word_fonts:
            return
        key = normalized.casefold()
        font_names.setdefault(key, normalized)

    if os.name == "nt" and winreg is not None:
        registry_paths = [
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts"),
            (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts"),
        ]
        for root, path in registry_paths:
            try:
                key = winreg.OpenKey(root, path)
            except OSError:
                continue

            try:
                index = 0
                while True:
                    value_name, _, _ = winreg.EnumValue(key, index)
                    add_font_name(value_name)
                    index += 1
            except OSError:
                pass
            finally:
                key.Close()

    fonts_dir = Path("C:/Windows/Fonts")
    if fonts_dir.exists():
        for file in fonts_dir.iterdir():
            if file.suffix.lower() not in {".ttf", ".otf", ".ttc"}:
                continue
            add_font_name(file.stem.replace("_", " "))

    preferred_fonts = [
        "Bahnschrift",
        "Segoe UI",
        "Aptos",
        "Arial",
        "Arial Black",
        "Calibri",
        "Cambria",
        "Candara",
        "Consolas",
        "Corbel",
        "Franklin Gothic Medium",
        "Gabriola",
        "Georgia",
        "Impact",
        "Jost",
        "Leelawadee UI",
        "Montserrat",
        "Poppins",
        "Roboto",
        "Sora",
        "Tahoma",
        "Times New Roman",
        "Trebuchet MS",
        "Verdana",
    ]
    available_fonts = set(font_names.values())
    ranked_fonts = [font for font in preferred_fonts if font in available_fonts]
    remainder = sorted(font for font in available_fonts if font not in ranked_fonts)
    return ranked_fonts + remainder


def normalize_language(raw_language: str) -> str:
    normalized = raw_language.strip().lower()
    if normalized not in LANGUAGE_ALIASES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported language. Use English, Hindi, or Urdu.",
        )
    return LANGUAGE_ALIASES[normalized]


def normalize_writing_system(raw_writing_system: str) -> str:
    normalized = raw_writing_system.strip().lower()
    if normalized not in WRITING_SYSTEM_ALIASES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported writing system. Use Native Script or Roman/Hinglish.",
        )
    return WRITING_SYSTEM_ALIASES[normalized]


def normalize_refinement_mode(raw_refinement_mode: str) -> str:
    normalized = raw_refinement_mode.strip().lower()
    if normalized not in REFINEMENT_MODE_ALIASES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported refinement mode. Use standard or ai.",
        )
    return REFINEMENT_MODE_ALIASES[normalized]


def ensure_ffmpeg() -> None:
    if shutil.which("ffmpeg") is None:
        raise HTTPException(
            status_code=500,
            detail="FFmpeg was not found on PATH. Install FFmpeg locally first.",
        )


def ensure_supported_extension(filename: str | None) -> str:
    extension = Path(filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload MP4, MOV, MKV, WEBM, or M4V.",
        )
    return extension


def save_upload(upload: UploadFile, destination: Path) -> None:
    total_written = 0
    chunk_size = 1024 * 1024
    with destination.open("wb") as output_file:
        while True:
            chunk = upload.file.read(chunk_size)
            if not chunk:
                break
            total_written += len(chunk)
            if total_written > settings.max_upload_size_bytes:
                output_file.close()
                remove_path(destination)
                raise HTTPException(
                    status_code=413,
                    detail=f"Upload too large. Maximum size is {settings.max_upload_size_mb} MB.",
                )
            output_file.write(chunk)


def extract_audio(video_path: Path, audio_path: Path) -> None:
    try:
        (
            ffmpeg
            .input(str(video_path))
            .output(
                str(audio_path),
                acodec="pcm_s16le",
                ar=16000,
                ac=1,
                vn=None,
            )
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
    except ffmpeg.Error as exc:
        stderr = exc.stderr.decode("utf-8", errors="ignore") if exc.stderr else "Unknown FFmpeg error."
        raise HTTPException(
            status_code=500,
            detail=f"FFmpeg failed while extracting audio: {stderr.strip()}",
        ) from exc


def get_space_client(space_id: str) -> Client:
    with SPACE_CLIENT_LOCK:
        client = SPACE_CLIENT_CACHE.get(space_id)
        if client is None:
            client = Client(space_id, verbose=False)
            SPACE_CLIENT_CACHE[space_id] = client
        return client


def encode_audio_data_url(audio_path: Path) -> str:
    payload = base64.b64encode(audio_path.read_bytes()).decode("ascii")
    return f"data:audio/wav;base64,{payload}"


def request_timed_transcript(audio_path: Path) -> str:
    payload = json.dumps(
        {
            "data": [
                {
                    "name": audio_path.name,
                    "data": encode_audio_data_url(audio_path),
                    "size": audio_path.stat().st_size,
                    "is_file": False,
                    "orig_name": audio_path.name,
                },
                "transcribe",
                True,
            ]
        }
    ).encode("utf-8")
    request = urllib_request.Request(
        settings.online_timestamp_api_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib_request.urlopen(request, timeout=settings.online_space_timeout_seconds) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise HTTPException(
            status_code=502,
            detail=f"Timed transcript provider failed: {detail or exc.reason}",
        ) from exc
    except urllib_error.URLError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Timed transcript provider could not be reached: {exc.reason}",
        ) from exc

    items = data.get("data") or []
    transcript = items[0] if items else ""
    if not isinstance(transcript, str) or not transcript.strip():
        raise HTTPException(
            status_code=502,
            detail="Timed transcript provider returned an empty transcript.",
        )
    return transcript.strip()


def request_full_transcript(audio_path: Path) -> str:
    try:
        client = get_space_client(settings.online_large_transcript_space)
        result = client.predict(
            handle_file(str(audio_path)),
            "transcribe",
            api_name="/transcribe_1",
        )
    except Exception:
        return ""

    if isinstance(result, str):
        return result.strip()
    return ""


def parse_timecode(value: str) -> float:
    parts = value.split(":")
    if len(parts) == 2:
        minutes, seconds = parts
        return (int(minutes) * 60) + float(seconds)
    if len(parts) == 3:
        hours, minutes, seconds = parts
        return (int(hours) * 3600) + (int(minutes) * 60) + float(seconds)
    raise ValueError(f"Unsupported timestamp format: {value}")


def parse_timed_segments(raw_transcript: str) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    for index, line in enumerate(raw_transcript.splitlines()):
        match = TIMESTAMP_LINE_RE.match(line.strip())
        if not match:
            continue
        text = match.group("text").strip()
        if not text:
            continue
        start = parse_timecode(match.group("start"))
        end = parse_timecode(match.group("end"))
        segments.append(
            {
                "id": f"remote_{index:04d}",
                "start": start,
                "end": max(end, start),
                "text": text,
            }
        )
    return segments


def allocate_words_for_segment(
    segment_id: str,
    text: str,
    start: float,
    end: float,
) -> list[dict[str, Any]]:
    tokens = text.split()
    if not tokens:
        return []

    duration = max(end - start, 0.0)
    if len(tokens) == 1 or duration == 0.0:
        return [
            {
                "id": f"{segment_id}_word_0000",
                "word": tokens[0],
                "start": start,
                "end": end,
                "score": None,
            }
        ]

    weights = [max(len(NON_WORD_CHARS_RE.sub("", token)), 1) for token in tokens]
    total_weight = sum(weights)
    elapsed = start
    words: list[dict[str, Any]] = []

    for index, token in enumerate(tokens):
        if index == len(tokens) - 1:
            token_end = end
        else:
            token_end = start + (duration * (sum(weights[: index + 1]) / total_weight))
        words.append(
            {
                "id": f"{segment_id}_word_{index:04d}",
                "word": token,
                "start": elapsed,
                "end": token_end,
                "score": None,
            }
        )
        elapsed = token_end

    return words


def replace_segment_texts_with_full_transcript(
    timed_segments: list[dict[str, Any]],
    full_transcript: str,
) -> list[dict[str, Any]]:
    full_tokens = full_transcript.split()
    if not full_tokens:
        return timed_segments

    weights = [max(len(segment.get("text", "").split()), 1) for segment in timed_segments]
    total_weight = sum(weights) or len(timed_segments) or 1
    total_tokens = len(full_tokens)
    token_cursor = 0
    weight_cursor = 0
    updated_segments: list[dict[str, Any]] = []

    for index, segment in enumerate(timed_segments):
        if index == len(timed_segments) - 1:
            assigned_tokens = full_tokens[token_cursor:]
        else:
            weight_cursor += weights[index]
            ideal_end = round((weight_cursor / total_weight) * total_tokens)
            min_end = token_cursor + 1
            max_end = total_tokens - (len(timed_segments) - index - 1)
            token_end = min(max(ideal_end, min_end), max_end)
            assigned_tokens = full_tokens[token_cursor:token_end]
            token_cursor = token_end

        fallback_tokens = segment.get("text", "").split()
        updated_segments.append(
            {
                **segment,
                "text": " ".join(assigned_tokens or fallback_tokens).strip(),
            }
        )

    return updated_segments


def build_online_transcription_result(
    audio_path: Path,
    refinement_mode: str,
) -> tuple[dict[str, Any], str]:
    timed_transcript = request_timed_transcript(audio_path)
    timed_segments = parse_timed_segments(timed_transcript)
    if not timed_segments:
        raise HTTPException(
            status_code=502,
            detail="Online transcript provider returned no timed segments.",
        )

    model_label = settings.online_transcribe_label
    if refinement_mode == "ai":
        full_transcript = request_full_transcript(audio_path)
        if full_transcript:
            timed_segments = replace_segment_texts_with_full_transcript(
                timed_segments,
                full_transcript,
            )
            model_label = settings.online_ai_transcribe_label

    segments: list[dict[str, Any]] = []
    for index, segment in enumerate(timed_segments):
        segment_id = f"seg_{index:04d}"
        start = float(segment.get("start") or 0.0)
        end = float(segment.get("end") or start)
        text = (segment.get("text") or "").strip()
        segments.append(
            {
                "start": start,
                "end": end,
                "text": text,
                "words": allocate_words_for_segment(segment_id, text, start, end),
            }
        )

    return {"segments": segments}, model_label


def get_uroman() -> Uroman:
    global UROMAN_INSTANCE
    with UROMAN_LOCK:
        if UROMAN_INSTANCE is None:
            UROMAN_INSTANCE = Uroman()
        return UROMAN_INSTANCE


def normalize_token_spacing(token: str) -> str:
    return MULTISPACE_RE.sub("-", token.strip())


def native_word_override(token: str, language_code: str) -> str | None:
    return NATIVE_ROMAN_OVERRIDES.get(language_code, {}).get(token.strip())


def apply_roman_overrides(romanized: str, language_code: str) -> str:
    normalized = normalize_token_spacing(romanized).lower()
    if not normalized:
        return normalized

    override = SHARED_ROMAN_OVERRIDES.get(normalized)
    if override:
        return override

    language_overrides = LANGUAGE_ROMAN_OVERRIDES.get(language_code, {})
    override = language_overrides.get(normalized)
    if override:
        return override

    cleaned = TRAILING_NASAL_RE.sub(r"\1n", normalized)
    if language_code == "ur":
        cleaned = cleaned.replace("tch", "ch")
        cleaned = cleaned.replace("'", "")
        cleaned = re.sub(r"\bih\b", "yeh", cleaned)
        cleaned = re.sub(r"\bhye\b", "hai", cleaned)
        cleaned = re.sub(r"\bkw\b", "ko", cleaned)
        cleaned = re.sub(r"\bsye\b", "se", cleaned)
        for pattern, replacement in URDU_ROMAN_CLEANUP_PATTERNS:
            cleaned = pattern.sub(replacement, cleaned)
    return cleaned


def fallback_transliterate_token(token: str, language_code: str) -> str:
    stripped = token.strip()
    if not stripped or PUNCTUATION_ONLY_RE.fullmatch(stripped) or LATIN_TEXT_RE.fullmatch(stripped):
        return stripped

    override = native_word_override(stripped, language_code)
    if override:
        return override

    romanized = get_uroman().romanize_string(
        stripped,
        lcode=UROMAN_LANGUAGE_CODES.get(language_code),
    )
    if not romanized and language_code == "hi" and sanscript is not None:
        try:
            romanized = sanscript.transliterate(
                stripped,
                sanscript.DEVANAGARI,
                sanscript.ITRANS,
            )
        except Exception:
            romanized = ""

    romanized = apply_roman_overrides(romanized, language_code)
    return romanized or stripped


def apply_contextual_overrides(
    native_tokens: list[str],
    display_tokens: list[str],
    language_code: str,
) -> list[str]:
    if language_code != "ur":
        return display_tokens

    adjusted = display_tokens[:]
    for index, native_token in enumerate(native_tokens):
        previous_native = native_tokens[index - 1] if index > 0 else ""
        next_native = native_tokens[index + 1] if index + 1 < len(native_tokens) else ""
        previous_display = adjusted[index - 1] if index > 0 else ""
        next_display = adjusted[index + 1] if index + 1 < len(adjusted) else ""

        if native_token == "بیس" and previous_native == "ڈن":
            adjusted[index] = "base"
        elif native_token == "ہار" and (
            previous_display in MONEY_AMOUNT_TOKENS
            or next_display in MONEY_AMOUNT_TOKENS
            or next_native == "پیہ"
        ):
            adjusted[index] = "hazaar"
        elif native_token == "پیہ" and previous_display in (MONEY_AMOUNT_TOKENS | {"hazaar", "lakh"}):
            adjusted[index] = "rupay"
        elif native_token == "میں" and next_native in {"نے", "ہوں"}:
            adjusted[index] = "main"
        elif native_token == "کیس" and next_native == "آ":
            adjusted[index] = "case"
        elif native_token == "روپیہ" and previous_native == "لاکھ":
            adjusted[index] = "rupay"
        elif native_token == "سیٹ" and next_native == "اپ":
            adjusted[index] = "set"
        elif native_token == "اپ" and previous_native == "سیٹ":
            adjusted[index] = "up"
        elif native_token == "وائنڈ" and previous_native == "اپنا":
            adjusted[index] = "mind"

    return adjusted


def normalize_ai_refined_word(word: str, language_code: str) -> str:
    stripped = word.strip()
    if not stripped:
        return stripped
    preferred = AI_REFINED_ROMAN_NORMALIZATION.get(language_code, {}).get(stripped.lower())
    return preferred or stripped


def transliterate_tokens(tokens: list[str], language_code: str) -> tuple[list[str], str]:
    transliterated = [fallback_transliterate_token(token, language_code) for token in tokens]
    return apply_contextual_overrides(tokens, transliterated, language_code), "rules-based"


def chunk_list(items: list[dict[str, Any]], size: int) -> Iterable[list[dict[str, Any]]]:
    for index in range(0, len(items), size):
        yield items[index:index + size]


def extract_json_payload(raw_text: str) -> dict[str, Any]:
    decoder = json.JSONDecoder()
    for index, character in enumerate(raw_text):
        if character != "{":
            continue
        try:
            payload, _ = decoder.raw_decode(raw_text[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict):
            return payload
    raise ValueError("No JSON object was found in the AI response.")


def agentrouter_chat_completion(messages: list[dict[str, str]]) -> str:
    if not settings.agent_router_token:
        raise HTTPException(
            status_code=422,
            detail="AI mode is selected but the external AI token is not configured on the backend.",
        )

    payload = json.dumps(
        {
            "model": settings.agent_router_model,
            "temperature": 0.1,
            "messages": messages,
        }
    ).encode("utf-8")
    request = urllib_request.Request(
        f"{settings.agent_router_base_url.rstrip('/')}/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {settings.agent_router_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib_request.urlopen(request, timeout=settings.agent_router_timeout_seconds) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise HTTPException(
            status_code=502,
            detail=f"External AI request failed: {detail or exc.reason}",
        ) from exc
    except urllib_error.URLError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"External AI provider could not be reached: {exc.reason}",
        ) from exc

    choices = data.get("choices") or []
    if not choices:
        raise HTTPException(status_code=502, detail="External AI provider returned no choices.")

    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts = [item.get("text", "") for item in content if isinstance(item, dict)]
        joined = "".join(text_parts).strip()
        if joined:
            return joined

    raise HTTPException(status_code=502, detail="External AI provider returned an empty message.")


def refine_batches_with_agentrouter(
    segment_payloads: list[dict[str, Any]],
    language_code: str,
) -> tuple[list[list[str]], str]:
    refined_batches: list[list[str]] = []
    fallback_used = False
    language_label = "Roman Urdu" if language_code == "ur" else "Hinglish"

    for batch in chunk_list(segment_payloads, 8):
        system_prompt = (
            "You are a caption refinement engine. "
            f"Convert each segment into natural {language_label} while preserving meaning. "
            "Every `words` array item is one timestamped token. "
            "You must return the exact same number of tokens for each segment. "
            "Do not merge words, do not split words, do not change order, and do not add commentary. "
            "If uncertain, keep the provided candidate token. "
            "Prefer natural, readable Roman spellings such as: aap, yeh, woh, nahi, karein, taake, zyada, khudara, video, visa, share. "
            "Do not over-shorten common words like `aap` into `ap`."
        )
        user_prompt = json.dumps(
            {
                "instructions": {
                    "return_shape": {"segments": [{"id": "same-as-input", "words": ["same-token-count-as-input"]}]},
                    "must_keep_token_count_exact": True,
                    "must_keep_segment_order": True,
                    "must_output_json_only": True,
                },
                "segments": batch,
            },
            ensure_ascii=False,
        )

        try:
            raw_response = agentrouter_chat_completion(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ]
            )
            payload = extract_json_payload(raw_response)
        except HTTPException:
            fallback_used = True
            refined_batches.extend(item["candidate_words"] for item in batch)
            continue
        except Exception:
            payload = {}

        items = payload.get("segments")
        if not isinstance(items, list):
            fallback_used = True
            refined_batches.extend(item["candidate_words"] for item in batch)
            continue

        items_by_id = {
            item.get("id"): item.get("words")
            for item in items
            if isinstance(item, dict)
        }

        for item in batch:
            candidate_words = item["candidate_words"]
            refined_words = items_by_id.get(item["id"])
            if (
                not isinstance(refined_words, list)
                or len(refined_words) != len(candidate_words)
                or any(
                    not isinstance(word, str)
                    or not word.strip()
                    or " " in word.strip()
                    or "\n" in word
                    for word in refined_words
                )
            ):
                fallback_used = True
                refined_batches.append(candidate_words)
                continue
            refined_batches.append(
                [normalize_ai_refined_word(word, language_code) for word in refined_words]
            )

    if fallback_used:
        return refined_batches, "external-ai-fallback"
    return refined_batches, "external-ai"


def stitch_words(words: list[str]) -> str:
    stitched = ""
    for word in words:
        token = word.strip()
        if not token:
            continue
        if not stitched:
            stitched = token
            continue
        if token[0] in NO_LEADING_SPACE:
            stitched += token
        elif stitched[-1] in NO_TRAILING_SPACE:
            stitched += token
        else:
            stitched += f" {token}"
    return stitched


def build_segments(
    aligned_segments: list[dict[str, Any]],
    language_code: str,
    writing_system: str,
    refinement_mode: str,
) -> tuple[list[CaptionSegment], str]:
    native_tokens: list[str] = []
    segment_native_batches: list[list[str]] = []
    for segment in aligned_segments:
        segment_words: list[str] = []
        for raw_word in segment.get("words", []):
            native_word = (raw_word.get("word") or "").strip()
            native_tokens.append(native_word)
            segment_words.append(native_word)
        segment_native_batches.append(segment_words)

    display_tokens = native_tokens
    transliteration_source = "native"
    if writing_system == "roman" and language_code in {"hi", "ur"}:
        display_tokens, transliteration_source = transliterate_tokens(native_tokens, language_code)
        if refinement_mode == "ai":
            local_iter = iter(display_tokens)
            segment_payloads: list[dict[str, Any]] = []
            for segment_index, segment in enumerate(aligned_segments):
                candidate_words = [
                    next(local_iter, native_word)
                    for native_word in segment_native_batches[segment_index]
                ]
                segment_payloads.append(
                    {
                        "id": f"seg_{segment_index:04d}",
                        "native_text": (segment.get("text") or "").strip(),
                        "native_words": segment_native_batches[segment_index],
                        "candidate_words": candidate_words,
                    }
                )
            refined_batches, transliteration_source = refine_batches_with_agentrouter(
                segment_payloads,
                language_code,
            )
            display_tokens = [
                word
                for batch in refined_batches
                for word in batch
            ]

    display_iter = iter(display_tokens)
    payload_segments: list[CaptionSegment] = []
    for segment_index, segment in enumerate(aligned_segments):
        words: list[CaptionWord] = []
        for word_index, raw_word in enumerate(segment.get("words", [])):
            native_word = (raw_word.get("word") or "").strip()
            display_word = next(display_iter, native_word)
            words.append(
                CaptionWord(
                    id=f"word_{segment_index:04d}_{word_index:04d}",
                    native_word=native_word,
                    word=display_word,
                    start=raw_word.get("start"),
                    end=raw_word.get("end"),
                    score=raw_word.get("score"),
                )
            )

        native_text = (segment.get("text") or "").strip()
        display_text = stitch_words([word.word for word in words]) if words else native_text
        payload_segments.append(
            CaptionSegment(
                id=f"seg_{segment_index:04d}",
                native_text=native_text,
                text=display_text,
                start=segment.get("start"),
                end=segment.get("end"),
                words=words,
            )
        )

    return payload_segments, transliteration_source


def transcribe_upload(
    upload: UploadFile,
    language: str,
    writing_system: str,
    refinement_mode: str = "standard",
) -> VideoProject:
    cleanup_expired_projects()
    ensure_ffmpeg()
    language_code = normalize_language(language)
    writing_system_mode = normalize_writing_system(writing_system)
    normalized_refinement_mode = normalize_refinement_mode(refinement_mode)
    extension = ensure_supported_extension(upload.filename)

    project_id = uuid.uuid4().hex
    title = Path(upload.filename or project_id).stem
    video_path = settings.video_root / f"{project_id}{extension}"
    audio_path = settings.audio_root / f"{project_id}.wav"

    try:
        save_upload(upload, video_path)
        extract_audio(video_path, audio_path)
        aligned_result, model_label = build_online_transcription_result(
            audio_path,
            normalized_refinement_mode,
        )
        segments, transliteration_source = build_segments(
            aligned_result.get("segments", []),
            language_code,
            writing_system_mode,
            normalized_refinement_mode,
        )
    finally:
        upload.file.close()

    timestamp = utc_now()
    project = VideoProject(
        id=project_id,
        title=title,
        source_language=language_code,
        writing_system=writing_system_mode,
        refinement_mode=normalized_refinement_mode,
        model=model_label,
        transliteration_source=transliteration_source,
        created_at=timestamp,
        updated_at=timestamp,
        video=build_media_asset(video_path),
        audio=build_media_asset(audio_path),
        segments=segments,
    )
    return save_project(project)


def update_project(
    project_id: str,
    title: str | None = None,
    style: CaptionStyle | None = None,
    segments: list[CaptionSegment] | None = None,
) -> VideoProject:
    project = load_project(project_id)
    if title is not None:
        project.title = title
    if style is not None:
        project.style = style
    if segments is not None:
        project.segments = segments
    project.updated_at = utc_now()
    return save_project(project)


def delete_project(project_id: str) -> dict[str, Any]:
    project = load_project(project_id)
    delete_project_files(project)

    return {
        "deleted_count": 1,
        "detail": f"Deleted project {project.title}.",
    }


def delete_all_projects() -> dict[str, Any]:
    deleted_count = len(list(settings.project_root.glob("*.json")))

    for root in (
        settings.project_root,
        settings.video_root,
        settings.audio_root,
        settings.export_root,
        settings.ass_root,
    ):
        for item in root.glob("*"):
            if item.is_file():
                item.unlink()

    return {
        "deleted_count": deleted_count,
        "detail": "Deleted all saved projects.",
    }


def ass_timestamp(seconds: float | None) -> str:
    total = max(float(seconds or 0.0), 0.0)
    hours = int(total // 3600)
    minutes = int((total % 3600) // 60)
    secs = total % 60
    return f"{hours}:{minutes:02d}:{secs:05.2f}"


def srt_timestamp(seconds: float | None) -> str:
    total_ms = max(int(round(float(seconds or 0.0) * 1000)), 0)
    hours = total_ms // 3_600_000
    minutes = (total_ms % 3_600_000) // 60_000
    secs = (total_ms % 60_000) // 1000
    milliseconds = total_ms % 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"


def ass_alpha_prefix(opacity_percent: float) -> str:
    clamped = max(0.0, min(float(opacity_percent), 100.0))
    alpha = round(255 * (1 - (clamped / 100.0)))
    return f"{alpha:02X}"


def ass_color(hex_color: str, alpha_prefix: str = "00") -> str:
    color = hex_color.lstrip("#")
    if len(color) != 6:
        color = "FFFFFF"
    rr = color[0:2]
    gg = color[2:4]
    bb = color[4:6]
    return f"&H{alpha_prefix}{bb}{gg}{rr}&"


def ass_escape(text: str) -> str:
    return (
        text.replace("\\", r"\\")
        .replace("{", "(")
        .replace("}", ")")
        .replace("\n", r"\N")
    )


def apply_text_transform(text: str, transform: str) -> str:
    if transform == "uppercase":
        return text.upper()
    if transform == "lowercase":
        return text.lower()
    return text


def wrap_caption_text(text: str, max_chars_per_line: int) -> str:
    words = text.split()
    if not words:
        return text

    lines: list[str] = []
    current_line = ""
    for word in words:
        next_line = f"{current_line} {word}".strip()
        if len(next_line) > max_chars_per_line and current_line:
            lines.append(current_line)
            current_line = word
        else:
            current_line = next_line

    if current_line:
        lines.append(current_line)

    return r"\N".join(lines)


def wrap_srt_text(text: str, max_chars_per_line: int) -> str:
    return wrap_caption_text(text, max_chars_per_line).replace(r"\N", "\n")


def video_dimensions(video_path: Path) -> tuple[int, int]:
    metadata = ffmpeg.probe(str(video_path))
    stream = next(
        (item for item in metadata["streams"] if item.get("codec_type") == "video"),
        None,
    )
    if stream is None:
        return 1920, 1080
    return int(stream.get("width", 1920)), int(stream.get("height", 1080))


def ass_alignment(alignment: str) -> int:
    return {"left": 1, "center": 2, "right": 3}.get(alignment, 2)


def build_dialogue_text(segment: CaptionSegment, style: CaptionStyle, x: int, y: int) -> str:
    base_prefix = f"{{\\pos({x},{y})}}"
    transformed_text = apply_text_transform(segment.text, style.text_transform)
    wrapped_text = wrap_caption_text(transformed_text, style.max_chars_per_line)

    if style.template in {"standard", "lower-third", "outline-pop"} or not segment.words:
        return base_prefix + ass_escape(wrapped_text)

    fragments: list[str] = [base_prefix]
    current_line_length = 0
    for word in segment.words:
        display_word = apply_text_transform(word.word, style.text_transform).strip()
        if not display_word:
            continue

        projected_length = current_line_length + (1 if current_line_length else 0) + len(display_word)
        if projected_length > style.max_chars_per_line and current_line_length:
            fragments.append(r"\N")
            current_line_length = 0

        duration = max(1, int(round(((word.end or 0.0) - (word.start or 0.0)) * 100)))
        fragments.append(f"{{\\kf{duration}}}{ass_escape(display_word)} ")
        current_line_length = current_line_length + len(display_word) + (1 if current_line_length else 0)

    return "".join(fragments).strip()


def write_ass_file(project: VideoProject) -> Path:
    video_path = settings.media_root / project.video.url.removeprefix("/media/")
    width, height = video_dimensions(video_path)
    x = int((project.style.position_x / 100.0) * width)
    y = int((project.style.position_y / 100.0) * height)
    ass_path = settings.ass_root / f"{project.id}.ass"
    border_style = 1 if project.style.template == "outline-pop" else 3
    outline = 5 if project.style.template == "outline-pop" else 3
    shadow = 0 if project.style.template in {"lower-third", "outline-pop"} else 1
    back_opacity = 0 if project.style.template == "outline-pop" else project.style.background_opacity

    header = "\n".join(
        [
            "[Script Info]",
            "ScriptType: v4.00+",
            f"PlayResX: {width}",
            f"PlayResY: {height}",
            "",
            "[V4+ Styles]",
            "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
            (
                "Style: Caption,"
                f"{project.style.font_family},"
                f"{project.style.font_size},"
                f"{ass_color(project.style.text_color)},"
                f"{ass_color(project.style.accent_color)},"
                f"{ass_color(project.style.stroke_color)},"
                f"{ass_color(project.style.background_color, ass_alpha_prefix(back_opacity))},"
                "1,0,0,0,100,100,"
                f"{project.style.letter_spacing},0,"
                f"{border_style},{outline},{shadow},"
                f"{ass_alignment(project.style.alignment)},40,40,40,1"
            ),
            "",
            "[Events]",
            "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
        ]
    )

    lines = [header]
    for segment in project.segments:
        if segment.start is None or segment.end is None:
            continue
        lines.append(
            f"Dialogue: 0,{ass_timestamp(segment.start)},{ass_timestamp(segment.end)},Caption,,0,0,0,,{build_dialogue_text(segment, project.style, x, y)}"
        )

    ass_path.write_text("\n".join(lines), encoding="utf-8")
    return ass_path


def write_srt_file(project: VideoProject) -> Path:
    srt_path = settings.export_root / f"{project.id}-captions.srt"
    lines: list[str] = []

    for index, segment in enumerate(project.segments, start=1):
        if segment.start is None or segment.end is None:
            continue
        transformed_text = apply_text_transform(segment.text, project.style.text_transform)
        wrapped_text = wrap_srt_text(transformed_text, project.style.max_chars_per_line)
        lines.extend(
            [
                str(index),
                f"{srt_timestamp(segment.start)} --> {srt_timestamp(segment.end)}",
                wrapped_text,
                "",
            ]
        )

    srt_path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")
    return srt_path


def ffmpeg_subtitles_path(path: Path) -> str:
    escaped = path.resolve().as_posix().replace(":", "\\:")
    return escaped.replace("'", "\\'")


def export_project(project_id: str) -> ExportResponse:
    project = load_project(project_id)
    video_path = settings.media_root / project.video.url.removeprefix("/media/")
    output_path = settings.export_root / f"{project.id}-captioned.mp4"
    ass_path = write_ass_file(project)
    subtitles_filter = f"subtitles='{ffmpeg_subtitles_path(ass_path)}'"

    try:
        (
            ffmpeg
            .input(str(video_path))
            .output(
                str(output_path),
                vf=subtitles_filter,
                vcodec="libx264",
                acodec="aac",
                movflags="+faststart",
            )
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
    except ffmpeg.Error as exc:
        stderr = exc.stderr.decode("utf-8", errors="ignore") if exc.stderr else "Unknown FFmpeg error."
        raise HTTPException(
            status_code=500,
            detail=f"FFmpeg failed while exporting captions: {stderr.strip()}",
        ) from exc

    project.export_url = build_media_asset(output_path).url
    project.updated_at = utc_now()
    save_project(project)
    return ExportResponse(
        project_id=project.id,
        export_url=project.export_url,
        filename=output_path.name,
    )


def export_subtitles(project_id: str) -> SubtitleExportResponse:
    project = load_project(project_id)
    srt_path = write_srt_file(project)
    project.subtitle_url = build_media_asset(srt_path).url
    project.updated_at = utc_now()
    save_project(project)
    return SubtitleExportResponse(
        project_id=project.id,
        subtitle_url=project.subtitle_url,
        filename=srt_path.name,
    )
