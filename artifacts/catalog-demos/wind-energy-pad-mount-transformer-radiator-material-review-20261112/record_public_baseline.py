#!/usr/bin/env python3
"""Join public-route hashes to the captured five-preview branch ledger."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ledger_path = HERE / "sample-ledger.json"
routes_path = HERE / "public-route-check.json"
ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
routes = json.loads(routes_path.read_text(encoding="utf-8"))
by_id = {item["id"]: item for item in routes["items"]}
for item in ledger["items"]:
    route_item = by_id[item["id"]]
    preview = next(route for route in route_item["routes"] if route["type"] == "preview")
    source = next(route for route in route_item["routes"] if route["type"] == "source")
    detail = next(route for route in route_item["routes"] if route["type"] == "detail")
    item["liveSourceSha256"] = source.get("sha256")
    item["livePreviewSha256"] = preview.get("sha256")
    item["liveSourceMatchesLocal"] = source.get("matchesLocal")
    item["livePreviewMatchesLocal"] = preview.get("matchesLocal")
    item["publicDetailStatus"] = detail["httpStatus"]
    item["publicSourceStatus"] = source["httpStatus"]
    item["publicPreviewStatus"] = preview["httpStatus"]
ledger["publicBaselineCheckedAt"] = routes["checkedAt"]
ledger_path.write_text(json.dumps(ledger, indent=2) + "\n", encoding="utf-8")
print(json.dumps({
    "publicBaselineCheckedAt": routes["checkedAt"],
    "allPublicRoutes200": all(
        route["httpStatus"] == 200
        for item in routes["items"] for route in item["routes"]
    ),
    "allLiveSourcesMatchLocal": all(item["liveSourceMatchesLocal"] for item in ledger["items"]),
    "allLivePreviewsMatchLocal": all(item["livePreviewMatchesLocal"] for item in ledger["items"]),
}, indent=2))
