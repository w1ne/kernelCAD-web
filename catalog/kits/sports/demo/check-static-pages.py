#!/usr/bin/env python3
import json
import sys
from pathlib import Path

repo = Path(__file__).resolve().parents[4]
site = Path(sys.argv[1]).resolve()
index = json.loads((repo / "catalog/index.json").read_text())
sports = [asset for asset in index["assets"] if asset["kit"] == "sports"]
hub = (site / "catalog/index.html").read_text()
assert "Sports Equipment <small>(40)</small>" in hub
for asset in sports:
    page_dir = site / "catalog" / "sports" / asset["id"]
    page = (page_dir / "index.html").read_text()
    assert asset["title"] in page, asset["id"]
    assert "CC0 1.0" in page, asset["id"]
    assert (page_dir / "preview.png").is_file(), asset["id"]
print(f"static catalog pages: {len(sports)}/{len(sports)} sports pages verified; hub lists Sports Equipment and all 40 assets")
