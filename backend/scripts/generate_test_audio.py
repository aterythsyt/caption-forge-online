from __future__ import annotations

from pathlib import Path

import pyttsx3


STORY = (
    "On my second night in Paris, a pickpocket brushed past me near the Metro. "
    "I noticed the zipper on my backpack move, so I stopped, smiled, and asked him "
    "in a loud voice whether he was looking for the Eiffel Tower. "
    "The surprise froze him for a second. I stepped aside, moved my passport into my "
    "inside pocket, and he disappeared into the crowd before touching anything valuable."
)


def main() -> None:
    assets_dir = Path(__file__).resolve().parents[1] / "test_assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    output_path = assets_dir / "paris_pickpocket_story.wav"

    engine = pyttsx3.init()
    engine.setProperty("rate", 168)
    engine.save_to_file(STORY, str(output_path))
    engine.runAndWait()

    print(output_path)


if __name__ == "__main__":
    main()
