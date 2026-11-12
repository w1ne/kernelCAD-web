#!/usr/bin/env python3
"""Capture public preview/source/detail routes as the pre-change baseline."""
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HERE = Path(__file__).resolve().parent
ORIGIN = "https://kernelcad.com"
ASSETS = [
    ("wind-energy", "blade-root-protector"),
    ("wind-energy", "cable-entry-boot"),
    ("wind-energy", "nacelle-transport-frame"),
    ("wind-energy", "wind-farm-meter-pedestal"),
    ("wind-energy", "wind-farm-pad-mount-transformer"),
]


def fetch(url: str) -> tuple[int, bytes]:
    request = Request(url, headers={"User-Agent": "kernelCAD-catalog-review/1.0"})
    try:
        with urlopen(request, timeout=30) as response:
            return response.status, response.read()
    except HTTPError as error:
        return error.code, error.read()
    except URLError as error:
        raise RuntimeError(f"GET {url} failed: {error}") from error


baseline = HERE / "live-baseline"
baseline.mkdir(parents=True, exist_ok=True)
items = []
for kit, asset in ASSETS:
    routes = [
        ("preview", f"{ORIGIN}/assets/{kit}-{asset}.png", f"{asset}.png"),
        ("source", f"{ORIGIN}/assets/{kit}-{asset}.kcad.ts", f"{asset}.kcad.ts"),
        ("detail", f"{ORIGIN}/catalog/{kit}/{asset}/", f"{asset}.html"),
    ]
    route_records = []
    for route_type, url, file_name in routes:
        status, body = fetch(url)
        record = {"type": route_type, "url": url, "httpStatus": status}
        if status == 200:
            (baseline / file_name).write_bytes(body)
            record["savedAs"] = file_name
            record["sha256"] = sha256(body).hexdigest()
            record["bytes"] = len(body)
            local_name = file_name if route_type != "detail" else None
            if local_name is not None:
                local_path = HERE / "sample" / local_name
                if local_path.is_file():
                    record["localSha256"] = sha256(local_path.read_bytes()).hexdigest()
                    record["matchesLocal"] = record["sha256"] == record["localSha256"]
        route_records.append(record)
    items.append({"kit": kit, "id": asset, "routes": route_records})

record = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "origin": ORIGIN,
    "branchDeployment": "not deployed",
    "items": items,
}
(HERE / "public-route-check.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps(record, indent=2))
