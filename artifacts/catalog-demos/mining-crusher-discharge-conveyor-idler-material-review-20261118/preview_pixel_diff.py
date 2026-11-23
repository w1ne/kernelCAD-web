from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops


BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
before_path = BUNDLE / "before" / "crusher-discharge-conveyor.png"
after_path = ROOT / "catalog/kits/mining/previews/crusher-discharge-conveyor.png"
before = Image.open(before_path).convert("RGB")
after = Image.open(after_path).convert("RGB")
if before.size != after.size:
    raise RuntimeError(f"preview dimensions differ: {before.size} vs {after.size}")
diff = ImageChops.difference(before, after)
pixel_count = before.width * before.height
raw = diff.tobytes()
changed_pixels = sum(any(raw[index + channel] for channel in range(3)) for index in range(0, len(raw), 3))
histograms = diff.split()
total_channel_delta = sum(sum(value * count for value, count in enumerate(channel.histogram())) for channel in histograms)
maximum = max(channel.getextrema()[1] for channel in histograms)
report = {
    "before": str(before_path.relative_to(ROOT)),
    "after": str(after_path.relative_to(ROOT)),
    "sizePx": list(before.size),
    "changedPixelFraction": changed_pixels / pixel_count,
    "meanAbsoluteChannelDifference255": total_channel_delta / (pixel_count * 3),
    "maxAbsoluteChannelDifference255": maximum,
    "assessment": "wide default view remains visually similar because the covered belt conceals most carry idlers; use the focused part render to compare the roller finish",
}
(BUNDLE / "verification" / "preview-pixel-diff.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
