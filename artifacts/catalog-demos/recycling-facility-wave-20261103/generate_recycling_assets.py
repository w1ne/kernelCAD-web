#!/usr/bin/env python3
"""Generate the original low-poly recycling-facility catalog wave."""

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT_ID = "recycling-facility"
KIT = ROOT / "catalog" / "kits" / KIT_ID
KIT.mkdir(parents=True, exist_ok=True)


def B(name, x, y, z, w, d, h):
    return ("box", name, x, y, z, w, d, h)


def C(name, x, y, z, h, r, segments=10):
    return ("cylinder", name, x, y, z, h, r, segments)


def CY(name, x, y, z, h, r, segments=10):
    return ("cylinder-y", name, x, y, z, h, r, segments)


ASSETS = []


def add(section, entries):
    for asset_id, title in entries:
        ASSETS.append((asset_id, title, section))


add("containers", [
    ("open-top-roll-off-skip", "Open-top roll-off skip"),
    ("enclosed-roll-off-container", "Enclosed roll-off container"),
    ("front-load-material-hopper", "Front-load material hopper"),
    ("walking-floor-trailer", "Walking-floor trailer"),
    ("tipping-floor-bin", "Tipping-floor bin"),
    ("scrap-steel-stillage", "Scrap-steel stillage"),
    ("cardboard-bale-cage", "Cardboard bale cage"),
    ("glass-cullet-skip", "Glass cullet skip"),
    ("e-waste-pallet-box", "E-waste pallet box"),
    ("battery-quarantine-drum", "Battery quarantine drum"),
    ("aerosol-can-safety-drum", "Aerosol-can safety drum"),
    ("textile-donation-cage", "Textile donation cage"),
    ("reusable-pallet-stillage", "Reusable pallet stillage"),
    ("paper-bale-transport-frame", "Paper bale transport frame"),
    ("wire-mesh-recycling-cage", "Wire-mesh recycling cage"),
    ("trommel-residue-bin", "Trommel residue bin"),
    ("leachate-sump-tank", "Leachate sump tank"),
    ("liquid-waste-ibc-tank", "Liquid waste IBC tank"),
    ("grease-trap-tank", "Grease-trap tank"),
    ("compactor-bag-frame", "Compactor bag frame"),
    ("mobile-sort-bin", "Mobile sort bin"),
    ("sample-material-tote", "Sample material tote"),
    ("reject-load-container", "Reject-load container"),
    ("front-load-dumpster-lid", "Front-load container lid"),
    ("waste-cart-tipping-frame", "Waste-cart tipping frame"),
])

add("reception", [
    ("weighbridge-deck", "Weighbridge deck"),
    ("weighbridge-approach-ramp", "Weighbridge approach ramp"),
    ("weighbridge-kiosk", "Weighbridge kiosk"),
    ("driver-check-in-booth", "Driver check-in booth"),
    ("vehicle-barrier-gate", "Vehicle barrier gate"),
    ("recovery-site-traffic-light", "Recovery-site traffic light"),
    ("inbound-message-board", "Inbound message board"),
    ("public-dropoff-canopy", "Public drop-off canopy"),
    ("battery-dropoff-cabinet", "Battery drop-off cabinet"),
    ("used-oil-dropoff-tank", "Used-oil drop-off tank"),
    ("household-hazardous-waste-cabinet", "Household hazardous-waste cabinet"),
    ("tyre-dropoff-rack", "Tyre drop-off rack"),
    ("waste-inspection-platform", "Waste inspection platform"),
    ("truck-wheel-wash", "Truck wheel-wash station"),
    ("underbody-wash-arch", "Underbody wash arch"),
    ("turntable-vehicle-scale", "Turntable vehicle scale"),
    ("inbound-camera-mast", "Inbound camera mast"),
    ("site-boundary-gate", "Site boundary gate"),
    ("public-scale-display", "Public scale display"),
    ("load-ticket-printer-pedestal", "Load-ticket printer pedestal"),
])

add("sorting", [
    ("infeed-hopper", "Infeed hopper"),
    ("mrf-apron-feeder", "MRF apron feeder"),
    ("metering-drum-feeder", "Metering drum feeder"),
    ("picking-line-conveyor", "Picking-line conveyor"),
    ("inclined-belt-conveyor", "Inclined belt conveyor"),
    ("overband-magnet-separator", "Overband magnet separator"),
    ("magnetic-drum-separator", "Magnetic drum separator"),
    ("eddy-current-separator", "Eddy-current separator"),
    ("recycling-trommel-screen", "Recycling trommel screen"),
    ("star-screen", "Star screen"),
    ("ballistic-separator", "Ballistic separator"),
    ("optical-sorter-arch", "Optical sorter arch"),
    ("near-infrared-sorter", "Near-infrared sorter"),
    ("color-sorter-camera", "Color-sorter camera"),
    ("air-classifier", "Air classifier"),
    ("glass-breaker-screen", "Glass breaker screen"),
    ("fines-screen", "Fines screen"),
    ("disc-screen", "Disc screen"),
    ("vibrating-grizzly", "Vibrating grizzly"),
    ("feed-spreader", "Feed spreader"),
    ("manual-sort-platform", "Manual sorting platform"),
    ("cross-belt-sorter", "Cross-belt sorter"),
    ("conveyor-transfer-chute", "Conveyor transfer chute"),
    ("conveyor-transfer-tower", "Conveyor transfer tower"),
    ("roller-conveyor-section", "Roller conveyor section"),
    ("belt-conveyor-head", "Belt conveyor head section"),
    ("belt-conveyor-tail", "Belt conveyor tail section"),
    ("merge-conveyor-junction", "Merge conveyor junction"),
    ("belt-scale-frame", "Belt scale frame"),
    ("belt-cleaner-blade", "Belt cleaner blade"),
    ("belt-cover-hood", "Belt cover hood"),
    ("dust-extraction-hood", "Dust extraction hood"),
    ("magnet-cleanout-drum", "Magnet clean-out drum"),
    ("reject-diverter-gate", "Reject diverter gate"),
    ("picking-booth-module", "Picking booth module"),
])

add("baling", [
    ("vertical-baler", "Vertical baler"),
    ("horizontal-baler", "Horizontal baler"),
    ("two-ram-baler", "Two-ram baler"),
    ("baler-wire-tier", "Baler wire tier"),
    ("bale-ejector", "Bale ejector"),
    ("recovered-bale-wrapper", "Recovered-material bale wrapper"),
    ("bale-weighing-platform", "Bale weighing platform"),
    ("bale-stack", "Recovered-material bale stack"),
    ("bale-breaking-shaft", "Bale-breaking shaft"),
    ("primary-shredder", "Primary shredder"),
    ("twin-shaft-shredder", "Twin-shaft shredder"),
    ("granulator", "Granulator"),
    ("bag-opener", "Bag opener"),
    ("glass-crusher", "Glass crusher"),
    ("can-densifier", "Can densifier"),
    ("plastic-film-compactor", "Plastic-film compactor"),
    ("cardboard-compactor", "Cardboard compactor"),
    ("stationary-compactor", "Stationary compactor"),
    ("mobile-compactor", "Mobile compactor"),
    ("hydraulic-power-pack", "Hydraulic power pack"),
    ("shredder-feed-ram", "Shredder feed ram"),
    ("dust-collector-filter", "Dust collector filter"),
    ("baghouse-collector", "Baghouse collector"),
    ("material-chipper", "Material chipper"),
    ("product-pelletizer", "Recovered-material pelletizer"),
])

add("glass-plastics", [
    ("glass-washer-trommel", "Glass washer trommel"),
    ("cullet-storage-silo", "Cullet storage silo"),
    ("optical-color-sorter", "Optical color sorter"),
    ("bottle-cleaning-line", "Bottle cleaning line"),
    ("bottle-crusher", "Bottle crusher"),
    ("cullet-feed-hopper", "Cullet feed hopper"),
    ("glass-washing-tank", "Glass washing tank"),
    ("glass-dryer", "Glass dryer"),
    ("glass-screening-deck", "Glass screening deck"),
    ("glass-loadout-silo", "Glass load-out silo"),
    ("plastic-wash-basin", "Plastic wash basin"),
    ("friction-washer", "Friction washer"),
    ("float-sink-separator", "Float-sink separator"),
    ("film-wringer", "Plastic film wringer"),
    ("plastic-flake-dryer", "Plastic flake dryer"),
    ("plastic-flake-silo", "Plastic flake silo"),
    ("pelletizer-extruder", "Pelletizer extruder"),
    ("recovered-plastic-bagger", "Recovered-plastic bagger"),
])

add("organics", [
    ("green-waste-shredder", "Green-waste shredder"),
    ("compost-trommel-screen", "Compost trommel screen"),
    ("windrow-turner", "Windrow turner"),
    ("compost-aeration-header", "Compost aeration header"),
    ("in-vessel-composter", "In-vessel composter"),
    ("food-waste-depackager", "Food-waste depackager"),
    ("anaerobic-digester-tank", "Anaerobic digester tank"),
    ("digestate-separator", "Digestate separator"),
    ("compost-curing-bay", "Compost curing bay"),
    ("biofilter-bed", "Biofilter bed"),
    ("biogas-flare-stack", "Biogas flare stack"),
    ("biogas-holder", "Biogas holder"),
    ("leachate-recirculation-pump", "Leachate recirculation pump"),
    ("compost-bagging-machine", "Compost bagging machine"),
    ("garden-waste-tipping-floor", "Garden-waste tipping floor"),
])

add("residuals", [
    ("landfill-gas-wellhead", "Landfill gas wellhead"),
    ("gas-collection-riser", "Gas collection riser"),
    ("landfill-gas-flare", "Landfill gas flare"),
    ("leachate-well", "Leachate well"),
    ("landfill-liner-roll", "Landfill liner roll"),
    ("geomembrane-welder", "Geomembrane welder"),
    ("survey-gas-monitor", "Survey gas monitor"),
    ("stormwater-settling-basin", "Stormwater settling basin"),
    ("litter-fence-panel", "Litter fence panel"),
    ("litter-control-cannon", "Litter control cannon"),
    ("dust-suppression-mist-cannon", "Dust-suppression mist cannon"),
    ("wheel-wash-reclaim-tank", "Wheel-wash reclaim tank"),
    ("residue-loadout-chute", "Residue load-out chute"),
    ("cover-soil-spreader", "Cover-soil spreader"),
    ("landfill-monitoring-pedestal", "Landfill monitoring pedestal"),
])


PALETTE = {
    "containers": ["#4f7080", "#60766f", "#707b86", "#806d5d", "#687b55"],
    "reception": ["#47758a", "#6c7882", "#7b6f56", "#55766b", "#5d6985"],
    "sorting": ["#61727c", "#8b754b", "#506c68", "#75656d", "#566d83"],
    "baling": ["#5f7380", "#6b7756", "#7d6752", "#566d6d", "#766078"],
    "glass-plastics": ["#4a7980", "#5f7484", "#647b66", "#77715b", "#5e6982"],
    "organics": ["#5e7759", "#71804f", "#587a70", "#82714c", "#636e5b"],
    "residuals": ["#64757a", "#6e775d", "#7c6955", "#5c6c7b", "#65765e"],
}


def wheels(width, depth, z, radius=95, axle=90):
    x = width / 2 - radius
    return [
        CY("left-wheel", -x, depth / 2 + axle, z, axle, radius),
        CY("right-wheel", x, depth / 2 + axle, z, axle, radius),
        CY("left-wheel-far", -x, -depth / 2 + axle, z, axle, radius),
        CY("right-wheel-far", x, -depth / 2 + axle, z, axle, radius),
    ]


def container_parts(asset_id, n):
    w, d, h = 1180 + (n % 4) * 90, 820 + (n % 3) * 80, 920 + (n % 5) * 70
    style = n % 6
    if style == 0:
        parts = [B("floor-pan", 0, 0, 0, w, d, 70), B("front-wall", 0, -d / 2 + 38, 70, w, 76, h - 70), B("rear-wall", 0, d / 2 - 38, 70, w, 76, h - 70), B("left-wall", -w / 2 + 38, 0, 70, 76, d - 120, h - 70), B("right-wall", w / 2 - 38, 0, 70, 76, d - 120, h - 70), B("front-rim", 0, -d / 2 + 20, h, w + 30, 45, 48), B("rear-rim", 0, d / 2 - 20, h, w + 30, 45, 48), B("side-rib-left", -w / 2 + 80, 0, 140, 50, d - 170, h - 160), B("side-rib-right", w / 2 - 80, 0, 140, 50, d - 170, h - 160)]
    elif style == 1:
        parts = [B("pallet-base", 0, 0, 0, w, d, 95), B("corner-post-left-front", -w / 2 + 45, -d / 2 + 45, 95, 70, 70, h - 95), B("corner-post-right-front", w / 2 - 45, -d / 2 + 45, 95, 70, 70, h - 95), B("corner-post-left-back", -w / 2 + 45, d / 2 - 45, 95, 70, 70, h - 95), B("corner-post-right-back", w / 2 - 45, d / 2 - 45, 95, 70, 70, h - 95)]
        for row in range(3):
            z = 210 + row * ((h - 300) / 3)
            parts.extend([B(f"front-rail-{row + 1}", 0, -d / 2 + 48, z, w - 90, 35, 35), B(f"rear-rail-{row + 1}", 0, d / 2 - 48, z, w - 90, 35, 35)])
        parts.extend([B("side-rail-left", -w / 2 + 48, 0, 210, 35, d - 95, 35), B("side-rail-right", w / 2 - 48, 0, 210, 35, d - 95, 35), C("corner-cap-a", -w / 2 + 45, -d / 2 + 45, h, 45, 44), C("corner-cap-b", w / 2 - 45, d / 2 - 45, h, 45, 44)])
    elif style == 2:
        parts = [B("skid-left", -w / 3, 0, 0, 90, d, 100), B("skid-right", w / 3, 0, 0, 90, d, 100), C("main-vessel", 0, 0, 100, h, min(w, d) * 0.34, 12), C("top-collar", 0, 0, h + 80, 70, min(w, d) * 0.37, 12), C("access-neck", 0, 0, h + 150, 100, 140, 10), C("drain-stub", w * 0.29, 0, 210, 180, 48, 8), B("level-gauge", w * 0.36, -d * 0.16, 250, 65, 40, h * 0.52)]
    elif style == 3:
        parts = [B("base-skids", 0, 0, 0, w, d, 100), B("body", 0, 0, 100, w - 80, d - 80, h - 100), B("top-cover", 0, 0, h, w + 20, d + 20, 65), B("access-panel", 0, -d / 2 - 25, h * 0.54, w * 0.46, 35, h * 0.42), B("handle-left", -w * 0.34, -d / 2 - 60, h * 0.55, 120, 45, 130), B("handle-right", w * 0.34, -d / 2 - 60, h * 0.55, 120, 45, 130)]
        parts.extend(wheels(w, d, 105, 72, 70))
    elif style == 4:
        parts = [B("tipping-base", 0, 0, 0, w, d, 100), B("hopper-front", 0, -d / 2 + 60, 100, w, 120, h - 110), B("hopper-back", 0, d / 2 - 55, 100, w, 110, h - 110), B("hopper-left", -w / 2 + 60, 0, 100, 120, d - 150, h - 110), B("hopper-right", w / 2 - 60, 0, 100, 120, d - 150, h - 110), B("front-lip", 0, -d / 2 - 20, h, w + 30, 75, 75), C("pivot-left", -w / 2 - 45, 0, 160, 180, 65), C("pivot-right", w / 2 + 45, 0, 160, 180, 65), B("fork-pocket-left", -w / 3, 0, 0, 110, d * 0.72, 90), B("fork-pocket-right", w / 3, 0, 0, 110, d * 0.72, 90)]
    else:
        parts = [B("cart-body", 0, 0, 80, w * 0.78, d * 0.75, h * 0.72), B("front-lip", 0, -d * 0.42, h * 0.72, w * 0.82, 60, 85), B("push-handle-left", -w * 0.34, d * 0.35, 80, 65, 65, h * 0.6), B("push-handle-right", w * 0.34, d * 0.35, 80, 65, 65, h * 0.6), B("handle-grip", 0, d * 0.35, h * 0.64, w * 0.73, 70, 65)]
        parts.extend(wheels(w * 0.75, d * 0.7, 76, 76, 64))
    return parts


def vessel_parts(asset_id, n):
    w, d, h = 850 + (n % 4) * 100, 760 + (n % 3) * 110, 1250 + (n % 5) * 120
    if "ibc" in asset_id:
        parts = [B("pallet-skid", 0, 0, 0, w, d, 120), B("inner-tank", 0, 0, 120, w * 0.78, d * 0.78, h * 0.72), B("top-cap", 0, 0, h * 0.72 + 120, w * 0.82, d * 0.82, 65), C("fill-neck", 0, 0, h * 0.72 + 185, 110, 90)]
        for xside in (-1, 1):
            for yside in (-1, 1):
                parts.append(B(f"cage-post-{xside}-{yside}", xside * w * 0.44, yside * d * 0.44, 120, 48, 48, h * 0.72))
        for level in range(3):
            z = 220 + level * (h * 0.72 / 3)
            parts.extend([B(f"cage-rail-front-{level}", 0, -d * 0.43, z, w * 0.84, 35, 30), B(f"cage-rail-back-{level}", 0, d * 0.43, z, w * 0.84, 35, 30)])
        parts.extend([B("valve-guard", 0, -d * 0.46, 150, 250, 55, 170), C("outlet-valve", 0, -d * 0.49, 145, 90, 48)])
        return parts
    if "well" in asset_id:
        return [B("surface-pad", 0, 0, 0, w * 1.2, d * 1.2, 90), C("well-casing", 0, 0, 90, h * 0.7, w * 0.31, 12), C("head-collar", 0, 0, h * 0.7 + 90, 95, w * 0.36, 12), B("instrument-bridge", 0, 0, h * 0.7 + 185, w * 0.7, 95, 75), C("sampling-port", w * 0.3, 0, 160, 280, 35), C("valve-wheel", -w * 0.28, -d * 0.3, 170, 55, 125), B("protective-post-left", -w * 0.49, 0, 0, 70, 70, 500), B("protective-post-right", w * 0.49, 0, 0, 70, 70, 500)]
    if "drum" in asset_id:
        return [B("spill-pallet", 0, 0, 0, w * 1.05, d * 1.05, 120), C("drum-body", 0, 0, 120, h, min(w, d) * 0.36, 12), C("top-rim", 0, 0, h + 120, 55, min(w, d) * 0.38, 12), C("bung-a", -w * 0.12, 0, h + 180, 70, 45), C("bung-b", w * 0.12, 0, h + 180, 70, 32), B("label-band", 0, -d * 0.36, h * 0.56, w * 0.48, 34, 110), C("pallet-foot-left", -w * 0.34, 0, 0, 95, 48), C("pallet-foot-right", w * 0.34, 0, 0, 95, 48)]
    parts = [B("tank-foot-left-front", -w * 0.32, -d * 0.32, 0, 100, 100, 250), B("tank-foot-right-front", w * 0.32, -d * 0.32, 0, 100, 100, 250), B("tank-foot-left-back", -w * 0.32, d * 0.32, 0, 100, 100, 250), B("tank-foot-right-back", w * 0.32, d * 0.32, 0, 100, 100, 250)]
    parts.extend([C("vessel-shell", 0, 0, 220, h, w * 0.4, 12), C("top-flange", 0, 0, h + 220, 70, w * 0.43, 12), C("roof-cap", 0, 0, h + 290, 160, w * 0.37, 12), C("manway", 0, 0, h + 450, 110, 125), C("vent-stack", w * 0.26, 0, h + 420, 260, 42), B("access-ladder", w * 0.43, 0, 220, 65, 70, h * 0.82), B("outlet-pipe", w * 0.34, -d * 0.34, 240, 180, 100, 130), C("drain-valve", w * 0.36, -d * 0.36, 180, 120, 42), CY("side-nozzle", w * 0.39, d * 0.3, h * 0.47, 180, 58)])
    if "silo" in asset_id or "holder" in asset_id or "digester" in asset_id:
        parts.extend([C("conical-discharge", 0, 0, 100, 180, w * 0.26, 12), B("outlet-neck", 0, 0, 0, 170, 170, 100)])
    return parts


def reception_parts(asset_id, n):
    w, d, h = 1050 + (n % 4) * 170, 620 + (n % 3) * 110, 1050 + (n % 5) * 110
    if "turntable" in asset_id:
        return [B("scale-foundation", 0, 0, 0, 2700, 2700, 110), C("rotating-weigh-deck", 0, 0, 110, 150, 1020, 16), B("approach-ramp-front", 0, -1680, 0, 2150, 720, 120), B("approach-ramp-back", 0, 1680, 0, 2150, 720, 120), B("deck-edge-left", -1160, 0, 90, 70, 2220, 110), B("deck-edge-right", 1160, 0, 90, 70, 2220, 110), B("control-pedestal", 1430, -880, 0, 180, 180, 760), B("scale-display", 1430, -880, 760, 520, 250, 290), C("load-cell-front-left", -860, -860, 35, 90, 68), C("load-cell-front-right", 860, -860, 35, 90, 68), C("load-cell-back-left", -860, 860, 35, 90, 68), C("load-cell-back-right", 860, 860, 35, 90, 68)]
    if "weighbridge-deck" in asset_id:
        return [B("scale-deck", 0, 0, 150, 5000, 2800, 210), B("side-beam-left", -2300, 0, 50, 180, 2700, 160), B("side-beam-right", 2300, 0, 50, 180, 2700, 160), B("approach-pad-front", 0, -1550, 0, 5200, 700, 150), B("approach-pad-back", 0, 1550, 0, 5200, 700, 150), C("load-cell-a", -1850, -950, 0, 150, 90), C("load-cell-b", 1850, -950, 0, 150, 90), C("load-cell-c", -1850, 950, 0, 150, 90), C("load-cell-d", 1850, 950, 0, 150, 90)]
    if "ramp" in asset_id:
        return [B("ramp-apron", 0, 0, 0, 3000, 1300, 120), B("ramp-surface", 0, 0, 120, 2800, 1150, 260), B("side-curb-left", -1430, 0, 0, 100, 1350, 380), B("side-curb-right", 1430, 0, 0, 100, 1350, 380), B("transition-plate", 0, -690, 100, 2820, 160, 60), B("ground-anchor-left", -1200, 520, 0, 180, 180, 130), B("ground-anchor-right", 1200, 520, 0, 180, 180, 130), C("roller-left", -1250, -650, 0, 95, 54), C("roller-right", 1250, -650, 0, 95, 54)]
    if "gate" in asset_id:
        return [B("control-pedestal", -w / 2 + 160, 0, 0, 320, 460, h * 0.62), B("counterweight-box", -w / 2 + 160, 0, h * 0.62, 360, 500, 120), B("boom-arm", 220, 0, h * 0.67, w, 90, 90), B("boom-tip", w / 2 + 210, 0, h * 0.67, 110, 115, 110), B("photo-eye-post", w / 2 + 180, -d / 2, 0, 75, 75, h * 0.54), C("beacon", -w / 2 + 160, -200, h * 0.62, 110, 54), C("hinge-drum", -w / 2 + 320, 0, h * 0.63, 130, 70)]
    if "light" in asset_id or "mast" in asset_id or "pedestal" in asset_id or "display" in asset_id or "printer" in asset_id:
        return [B("mounting-plinth", 0, 0, 0, 520, 420, 120), B("pedestal-column", 0, 0, 120, 180, 180, h * 0.58), B("equipment-head", 0, -40, h * 0.58 + 120, w * 0.52, 210, 340), B("sun-hood", 0, -160, h * 0.58 + 460, w * 0.56, 330, 55), B("service-door", 0, -155, h * 0.58 + 180, w * 0.37, 35, 190), B("antenna", w * 0.23, 40, h * 0.58 + 460, 20, 20, 260), C("warning-beacon", -w * 0.23, -80, h * 0.58 + 430, 115, 55), C("cable-gland", 0, 95, 130, 115, 30)]
    if "platform" in asset_id:
        return [B("platform-deck", 0, 0, 620, w * 1.5, d * 1.3, 100), B("front-apron", 0, -d * 0.62, 390, w * 1.45, 70, 230), B("rear-rail", 0, d * 0.61, 720, w * 1.38, 55, 50), B("left-post", -w * 0.68, d * 0.48, 0, 70, 70, 700), B("right-post", w * 0.68, d * 0.48, 0, 70, 70, 700), B("cross-brace", 0, 0, 250, 70, d, 55), C("level-foot-left", -w * 0.64, -d * 0.55, 0, 100, 38), C("level-foot-right", w * 0.64, -d * 0.55, 0, 100, 38)]
    if "canopy" in asset_id:
        return [B("roof-slab", 0, 0, h, w * 1.45, d * 1.35, 110), B("roof-fascia-front", 0, -d * 0.68, h - 110, w * 1.45, 70, 180), B("roof-fascia-back", 0, d * 0.68, h - 110, w * 1.45, 70, 180), B("post-left-front", -w * 0.58, -d * 0.54, 0, 110, 110, h - 110), B("post-right-front", w * 0.58, -d * 0.54, 0, 110, 110, h - 110), B("post-left-back", -w * 0.58, d * 0.54, 0, 110, 110, h - 110), B("post-right-back", w * 0.58, d * 0.54, 0, 110, 110, h - 110), C("roof-drain", w * 0.67, d * 0.62, 0, h, 28)]
    if "wash" in asset_id:
        return [B("wash-pad", 0, 0, 0, w * 1.7, d * 1.25, 140), B("arch-left-leg", -w * 0.58, 0, 140, 130, 140, h - 140), B("arch-right-leg", w * 0.58, 0, 140, 130, 140, h - 140), B("arch-header", 0, 0, h - 120, 150, d * 1.2, 160), B("spray-manifold", 0, 0, h - 290, 100, d * 0.9, 65), C("spray-nozzle-a", -w * 0.4, -d * 0.4, h - 350, 130, 25), C("spray-nozzle-b", 0, -d * 0.4, h - 350, 130, 25), C("spray-nozzle-c", w * 0.4, -d * 0.4, h - 350, 130, 25)]
    if "booth" in asset_id or "kiosk" in asset_id or "booth" in asset_id or "check-in" in asset_id:
        return [B("floor-skid", 0, 0, 0, w, d, 90), B("rear-wall", 0, d / 2 - 40, 90, w, 80, h - 90), B("left-wall", -w / 2 + 40, 0, 90, 80, d - 80, h - 90), B("right-wall", w / 2 - 40, 0, 90, 80, d - 80, h - 90), B("front-counter", 0, -d / 2 + 70, 90, w, 140, h * 0.38), B("roof", 0, 0, h - 50, w + 100, d + 100, 100), B("window-header", 0, -d / 2 + 75, h * 0.72, w * 0.72, 45, 55), B("service-panel", 0, -d / 2 + 55, h * 0.51, w * 0.54, 40, h * 0.22), C("corner-beacon", w * 0.38, -d * 0.38, h - 160, 100, 45)]
    return [B("foundation", 0, 0, 0, w * 1.2, d * 1.1, 100), B("equipment-body", 0, 0, 100, w, d, h * 0.58), B("top-panel", 0, 0, h * 0.58 + 100, w * 1.05, d * 1.05, 80), B("screen-face", 0, -d / 2 - 25, h * 0.43, w * 0.46, 35, h * 0.32), B("button-panel", w * 0.33, -d / 2 - 30, 160, w * 0.18, 40, 210), C("mount-foot-a", -w * 0.35, d * 0.34, 0, 100, 45), C("mount-foot-b", w * 0.35, d * 0.34, 0, 100, 45), CY("side-grip", -w * 0.54, 80, h * 0.35, 110, 32)]


def conveyor_parts(asset_id, n):
    w, length = 680 + (n % 4) * 100, 1500 + (n % 5) * 260
    high = 580 + (n % 4) * 135
    low = 210 + (n % 3) * 55
    if "arch" in asset_id or "sorter" in asset_id or "camera" in asset_id:
        return [B("belt-frame", 0, 0, 0, w, length, 180), B("belt-surface", 0, 0, 180, w * 0.86, length * 0.95, 55), B("support-left-front", -w * 0.42, -length * 0.38, 0, 65, 65, 500), B("support-right-front", w * 0.42, -length * 0.38, 0, 65, 65, 500), B("support-left-back", -w * 0.42, length * 0.38, 0, 65, 65, 500), B("support-right-back", w * 0.42, length * 0.38, 0, 65, 65, 500), B("sensor-arch-left", -w * 0.58, 0, 500, 85, 100, 850), B("sensor-arch-right", w * 0.58, 0, 500, 85, 100, 850), B("sensor-bridge", 0, 0, 1280, w * 1.28, 110, 95), B("camera-pod-a", -w * 0.25, 0, 1350, 160, 150, 150), B("camera-pod-b", w * 0.25, 0, 1350, 160, 150, 150), C("indicator", 0, -length * 0.35, 1250, 95, 42)]
    if "trommel" in asset_id or "drum" in asset_id:
        return [B("base-rail-left", -w * 0.45, 0, 0, 100, length, 150), B("base-rail-right", w * 0.45, 0, 0, 100, length, 150), B("feed-hopper", 0, -length * 0.48, 150, w, 420, 620), CY("screen-drum", 0, length * 0.35, 520, length * 0.62, w * 0.38, 12), CY("drive-ring-front", 0, -length * 0.08, 520, 115, w * 0.43, 12), CY("drive-ring-back", 0, length * 0.44, 520, 115, w * 0.43, 12), B("discharge-chute", 0, length * 0.48, 150, w * 0.72, 380, 380), C("drive-motor", w * 0.5, length * 0.12, 270, 400, 130)]
    if "screen" in asset_id or "separator" in asset_id or "grizzly" in asset_id or "spreader" in asset_id:
        parts = [B("support-rail-left", -w * 0.48, 0, 0, 90, length, 170), B("support-rail-right", w * 0.48, 0, 0, 90, length, 170), B("screen-bed", 0, 0, low, w * 0.88, length * 0.82, 130), B("feed-hopper", 0, -length * 0.46, high * 0.32, w * 0.82, 350, high * 0.54), B("oversize-chute", 0, length * 0.47, high * 0.36, w * 0.78, 360, 260), B("side-guard-left", -w * 0.4, 0, low + 130, 55, length * 0.8, 180), B("side-guard-right", w * 0.4, 0, low + 130, 55, length * 0.8, 180), C("vibrator-left", -w * 0.25, 0, low + 260, 220, 85), C("vibrator-right", w * 0.25, 0, low + 260, 220, 85)]
        for roller in range(4):
            parts.append(CY(f"support-roller-{roller + 1}", 0, -length * 0.34 + roller * (length * 0.22), 110, 90, 75))
        return parts
    if "hood" in asset_id or "chute" in asset_id or "tower" in asset_id or "gate" in asset_id:
        return [B("support-frame-left", -w * 0.52, 0, 0, 95, length * 0.88, high), B("support-frame-right", w * 0.52, 0, 0, 95, length * 0.88, high), B("upper-crossbeam", 0, 0, high, w * 1.15, 125, 100), B("material-channel", 0, 0, high * 0.52, w * 0.75, length * 0.72, 170), B("inspection-hood", 0, -length * 0.12, high + 100, w * 0.9, length * 0.38, 240), B("discharge-transition", 0, length * 0.42, high * 0.32, w * 0.62, 340, high * 0.6), B("access-ladder", w * 0.6, length * 0.2, 0, 75, 80, high * 0.9), CY("idler", 0, -length * 0.34, w * 0.47 + 25, 95, w * 0.47)]
    # Conveyor section: the raised tail gives the deck a clear process-line silhouette.
    return [B("base-left", -w * 0.48, 0, 0, 95, length, 150), B("base-right", w * 0.48, 0, 0, 95, length, 150), B("belt-deck", 0, 0, low, w * 0.88, length * 0.9, 115), B("belt-surface", 0, 0, low + 115, w * 0.8, length * 0.88, 55), B("side-rail-left", -w * 0.42, 0, low + 170, 55, length * 0.86, 105), B("side-rail-right", w * 0.42, 0, low + 170, 55, length * 0.86, 105), B("tail-support-left", -w * 0.34, -length * 0.36, 150, 65, 65, high - 150), B("tail-support-right", w * 0.34, -length * 0.36, 150, 65, 65, high - 150), B("head-support-left", -w * 0.34, length * 0.36, 150, 65, 65, low - 80), B("head-support-right", w * 0.34, length * 0.36, 150, 65, 65, low - 80), CY("head-roller", 0, length * 0.47, max(low + 100, w * 0.42 + 25), 90, w * 0.42), CY("tail-roller", 0, -length * 0.45, max(high * 0.42, w * 0.42 + 25), 90, w * 0.42), B("feed-chute", 0, -length * 0.5, high * 0.55, w * 0.88, 200, 260), C("drive-motor", w * 0.58, length * 0.4, 180, 260, 90)]


def machine_parts(asset_id, n):
    w, d, h = 1050 + (n % 5) * 130, 850 + (n % 3) * 140, 1250 + (n % 4) * 150
    if "baler" in asset_id or "compactor" in asset_id or "densifier" in asset_id or "ram" in asset_id:
        return [B("base-skid", 0, 0, 0, w, d, 125), B("press-chamber", 0, 0, 125, w * 0.82, d * 0.78, h * 0.7), B("front-door-frame", 0, -d * 0.43, 160, w * 0.68, 110, h * 0.54), B("press-plate", 0, -d * 0.26, h * 0.55, w * 0.64, 210, 160), B("upper-gantry", 0, 0, h * 0.78, w * 0.96, d * 0.9, 160), B("discharge-floor", 0, -d * 0.48, 110, w * 0.58, 190, 120), B("control-cabinet", w * 0.56, 0, 0, 300, 360, h * 0.6), CY("hydraulic-cylinder", 0, d * 0.24, h * 0.73, 280, 115), C("pressure-gauge", w * 0.53, -d * 0.22, h * 0.56, 120, 45)]
    if "shredder" in asset_id or "crusher" in asset_id or "granulator" in asset_id or "chipper" in asset_id or "opener" in asset_id or "breaking" in asset_id:
        return [B("base-frame", 0, 0, 0, w, d, 170), B("cutting-housing", 0, 0, 170, w * 0.8, d * 0.7, h * 0.56), B("feed-hopper-front", 0, -d * 0.42, h * 0.56, w * 0.88, d * 0.32, h * 0.4), B("feed-lip", 0, -d * 0.55, h * 0.55, w * 0.9, 130, 85), B("discharge-chute", 0, d * 0.42, 170, w * 0.62, d * 0.24, h * 0.35), CY("cutting-shaft-a", -w * 0.2, 0, h * 0.34, d * 0.58, 95, 12), CY("cutting-shaft-b", w * 0.2, 0, h * 0.34, d * 0.58, 95, 12), B("side-service-panel", w * 0.42, 0, h * 0.28, 75, d * 0.44, h * 0.36), C("drive-motor", w * 0.57, d * 0.26, 210, 330, 135), C("warning-beacon", -w * 0.38, -d * 0.3, h * 0.84, 105, 45)]
    if "washer" in asset_id or "dryer" in asset_id or "wringer" in asset_id or "depackager" in asset_id:
        return [B("wash-frame-left", -w * 0.42, 0, 0, 85, d, h * 0.55), B("wash-frame-right", w * 0.42, 0, 0, 85, d, h * 0.55), B("process-tank", 0, 0, 240, w * 0.7, d * 0.74, h * 0.38), B("top-cover", 0, 0, h * 0.62, w * 0.78, d * 0.8, 90), B("feed-hopper", 0, -d * 0.45, h * 0.68, w * 0.5, 260, 350), B("outlet-chute", 0, d * 0.43, 140, w * 0.48, 270, 380), CY("agitation-drum", 0, 0, h * 0.38, d * 0.65, w * 0.3, 12), C("pump", w * 0.52, -d * 0.25, 0, 330, 110), B("pipe-run", w * 0.49, 0, h * 0.48, 100, 120, h * 0.4)]
    if "collector" in asset_id or "filter" in asset_id or "baghouse" in asset_id:
        parts = [B("service-base", 0, 0, 0, w, d, 110), B("filter-cabinet", 0, 0, 110, w * 0.85, d * 0.76, h * 0.72), B("access-door-left", -w * 0.22, -d * 0.42, 220, w * 0.34, 65, h * 0.45), B("access-door-right", w * 0.22, -d * 0.42, 220, w * 0.34, 65, h * 0.45), B("inlet-duct", 0, -d * 0.57, h * 0.68, w * 0.38, 240, 280), B("outlet-duct", 0, d * 0.55, h * 0.76, w * 0.32, 250, 360), B("support-leg-left", -w * 0.3, d * 0.3, 0, 85, 85, 350), B("support-leg-right", w * 0.3, d * 0.3, 0, 85, 85, 350)]
        for row in range(4):
            parts.append(C(f"filter-canister-{row + 1}", -w * 0.34 + row * (w * 0.22), d * 0.08, h * 0.82, 300, 70))
        return parts
    return [B("base-frame", 0, 0, 0, w, d, 140), B("machine-body", 0, 0, 140, w * 0.82, d * 0.78, h * 0.68), B("front-access-door", 0, -d * 0.42, 220, w * 0.52, 60, h * 0.44), B("feed-chute", 0, -d * 0.54, h * 0.54, w * 0.72, 260, h * 0.35), B("outlet-chute", 0, d * 0.5, 160, w * 0.46, 210, h * 0.36), B("service-panel", w * 0.5, 0, h * 0.28, 75, d * 0.4, h * 0.34), B("control-pedestal", w * 0.58, -d * 0.3, 0, 240, 260, h * 0.56), C("drive-drum", -w * 0.55, 0, h * 0.42, 370, 120), CY("transfer-roller", 0, -d * 0.38, w * 0.36 + 25, 100, w * 0.36)]


def bale_stack_parts():
    parts = []
    positions = [
        (-370, -260, 0), (370, -260, 0), (-370, 260, 0), (370, 260, 0),
        (-370, 0, 420), (370, 0, 420),
    ]
    for index, (x, y, z) in enumerate(positions, start=1):
        parts.append(B(f"bale-{index}", x, y, z, 700, 500, 420))
        parts.append(B(f"binding-band-{index}", x, y - 253, z + 120, 710, 28, 42))
    return parts


def residual_parts(asset_id, n):
    w, d, h = 760 + (n % 4) * 120, 620 + (n % 3) * 110, 1250 + (n % 5) * 120
    if "flare" in asset_id or "riser" in asset_id or "wellhead" in asset_id:
        return [B("mounting-pad", 0, 0, 0, w, d, 120), C("riser-pipe", 0, 0, 120, h * 0.7, 95, 10), C("flare-stack", 0, 0, h * 0.8, h * 0.28, 145, 10), B("service-box", w * 0.35, -d * 0.34, 150, 240, 210, 380), C("valve-wheel", 0, -d * 0.34, 260, 50, 150), CY("horizontal-connection", 0, d * 0.34, 180, 320, 55)]
    if "fence" in asset_id:
        return [B("bottom-rail", 0, 0, 80, w, 80, 80), B("top-rail", 0, 0, h - 80, w, 80, 80), B("left-post", -w * 0.48, 0, 0, 90, 90, h), B("right-post", w * 0.48, 0, 0, 90, 90, h)] + [B(f"mesh-bar-{i + 1}", -w * 0.36 + i * (w * 0.24), 0, 120, 35, 45, h - 240) for i in range(4)] + [B("foot-left", -w * 0.48, 0, 0, 180, 260, 100), B("foot-right", w * 0.48, 0, 0, 180, 260, 100)]
    if "basin" in asset_id:
        return [B("basin-floor", 0, 0, 0, w * 1.5, d * 1.4, 100), B("front-berm", 0, -d * 0.63, 100, w * 1.5, 160, h * 0.55), B("back-berm", 0, d * 0.63, 100, w * 1.5, 160, h * 0.55), B("left-berm", -w * 0.7, 0, 100, 160, d * 1.2, h * 0.55), B("right-berm", w * 0.7, 0, 100, 160, d * 1.2, h * 0.55), B("walkway", 0, -d * 0.35, h * 0.42, w * 1.2, 140, 60), C("sample-pipe", w * 0.5, 0, 0, h, 38), C("level-gauge", -w * 0.55, 0, 120, h * 0.72, 45)]
    if "cannon" in asset_id:
        return [B("mobile-chassis", 0, 0, 0, w, d, 120), B("turntable", 0, 0, 120, 350, 350, 120), B("elevation-frame-left", -170, 0, 240, 65, 65, h * 0.34), B("elevation-frame-right", 170, 0, 240, 65, 65, h * 0.34), CY("spray-barrel", 0, 0, h * 0.42, w * 0.72, 105), C("fan-hub", 0, -d * 0.26, h * 0.42, 170, 145), C("fan-ring", 0, -d * 0.26, h * 0.42, 90, 220), C("wheel-left", -w * 0.35, d * 0.4, 0, 180, 75), C("wheel-right", w * 0.35, d * 0.4, 0, 180, 75)]
    if "roll" in asset_id:
        return [B("roll-cradle-left", -w * 0.36, 0, 0, 110, d * 0.8, h * 0.5), B("roll-cradle-right", w * 0.36, 0, 0, 110, d * 0.8, h * 0.5), CY("liner-roll", 0, 0, h * 0.48, w * 0.66, h * 0.4, 12), C("end-core-left", -w * 0.36, 0, h * 0.48, 90, 110), C("end-core-right", w * 0.36, 0, h * 0.48, 90, 110), B("loose-liner", 0, -d * 0.35, 0, w * 0.8, 160, 55), B("pull-bar", 0, -d * 0.37, 55, w * 0.82, 60, 65)]
    return [B("concrete-plinth", 0, 0, 0, w, d, 110), B("equipment-cabinet", 0, 0, 110, w * 0.72, d * 0.64, h * 0.54), B("display-face", 0, -d * 0.34, h * 0.39, w * 0.44, 55, h * 0.22), B("sensor-mast", w * 0.3, d * 0.25, 110, 80, 80, h * 0.74), B("weather-hood", 0, 0, h * 0.7, w * 0.9, d * 0.8, 80), C("sensor-dish", w * 0.3, d * 0.25, h * 0.88, 140, 90), C("sample-port", -w * 0.3, -d * 0.34, 150, 100, 28), CY("service-handle", w * 0.4, -d * 0.39, h * 0.3, 100, 28)]


def parts_for(asset_id, section, index):
    if section == "containers":
        if any(word in asset_id for word in ("tank", "silo", "drum", "well")):
            return vessel_parts(asset_id, index)
        return container_parts(asset_id, index)
    if section == "reception":
        if "tank" in asset_id:
            return vessel_parts(asset_id, index)
        return reception_parts(asset_id, index)
    if section == "sorting":
        return conveyor_parts(asset_id, index)
    if section == "baling":
        if "bale-stack" in asset_id:
            return bale_stack_parts()
        return machine_parts(asset_id, index)
    if section == "glass-plastics":
        if any(word in asset_id for word in ("silo", "tank")):
            return vessel_parts(asset_id, index + 2)
        if any(word in asset_id for word in ("sorter", "line", "screen", "trommel")):
            return conveyor_parts(asset_id, index + 2)
        return machine_parts(asset_id, index + 3)
    if section == "organics":
        if "flare" in asset_id or "wellhead" in asset_id:
            return residual_parts(asset_id, index + 1)
        if any(word in asset_id for word in ("tank", "holder", "vessel", "digester")):
            return vessel_parts(asset_id, index + 1)
        if "bay" in asset_id or "header" in asset_id:
            return container_parts(asset_id, index + 1)
        if "screen" in asset_id or "turner" in asset_id:
            return conveyor_parts(asset_id, index + 2)
        return machine_parts(asset_id, index + 5)
    if any(word in asset_id for word in ("tank", "well")):
        return vessel_parts(asset_id, index)
    if any(word in asset_id for word in ("chute", "spreader", "welder")):
        return machine_parts(asset_id, index)
    return residual_parts(asset_id, index)


def render(asset, index):
    asset_id, title, section = asset
    palette = PALETTE[section]
    default_color = palette[index % len(palette)]
    parts = parts_for(asset_id, section, index)
    tags = ["recycling", "materials recovery", "waste management", section.replace("-", " "), "low poly", "scene prop"]
    description = (
        f"{title} as original low-poly scene equipment for a recycling and materials-recovery facility. "
        "Visualization geometry only. Knobs: overall scale and asset color."
    )
    lines = [
        "// SPDX-License-Identifier: CC0-1.0",
        "// Original low-poly recycling-facility scene prop, millimetres, Z up.",
        "",
        "meta({",
        f"  name: {json.dumps(asset_id)},",
        "  license: 'CC0-1.0',",
        f"  title: {json.dumps(title)},",
        f"  description: {json.dumps(description)},",
        f"  tags: {json.dumps(tags)},",
        f"  kit: {json.dumps(KIT_ID)},",
        "  category: 'prop',",
        "  origin: 'base',",
        "  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],",
        "  triangleBudget: 1800,",
        "});",
        "",
        "const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });",
        f"const color = param('color', {json.dumps(default_color)}, {{ label: 'Asset color' }});",
        "const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);",
    ]
    if any(part[0] == "cylinder" for part in parts):
        lines.append("const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);")
    if any(part[0] == "cylinder-y" for part in parts):
        lines.append("const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);")
    lines.extend(["", f"const p = assembly({json.dumps(asset_id)});"])
    for part in parts:
        if part[0] == "box":
            _, name, x, y, z, w, d, h = part
            shape = f"b({x},{y},{z},{w},{d},{h})"
        elif part[0] == "cylinder-y":
            _, name, x, y, z, h, r, segments = part
            shape = f"cy({x},{y},{z},{h},{r},{segments})"
        else:
            _, name, x, y, z, h, r, segments = part
            shape = f"c({x},{y},{z},{h},{r},{segments})"
        lines.append(f"p.part({json.dumps(name)}, {shape}.color(color));")
    lines.extend(["", "return p.model();", ""])
    return "\n".join(lines)


ids = [asset[0] for asset in ASSETS]
if len(ASSETS) != 153 or len(ids) != len(set(ids)):
    raise SystemExit(f"recycling-facility wave must contain 153 unique assets; found {len(ASSETS)}")
if not all(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", asset_id) for asset_id in ids):
    raise SystemExit("asset ids must use lowercase kebab-case")

for source in KIT.glob("*.kcad.ts"):
    if source.stem not in set(ids):
        source.unlink()

for index, asset in enumerate(ASSETS):
    (KIT / f"{asset[0]}.kcad.ts").write_text(render(asset, index))

(KIT / "kit.json").write_text(
    json.dumps(
        {
            "title": "Recycling facility",
            "description": "Original low-poly scene props for material reception, sorting, recovery, organics processing, and residual management, with editable scale and color controls.",
        },
        indent=2,
    )
    + "\n"
)
print(f"generated {len(ASSETS)} recycling-facility assets")
