#!/usr/bin/env python3
"""Build a local shipyard gallery from indexed sources and rendered previews."""
import html
import json
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
index = json.loads((ROOT / "catalog" / "index.json").read_text(encoding="utf-8"))
assets = [row for row in index["assets"] if row["kit"] == "shipyard"]
if len(assets) != 70 or any(not row["preview"] for row in assets):
    raise SystemExit("build the index after rendering all 70 shipyard previews first")
variant_audit = json.loads((BUNDLE / "parameter-variant-audit.json").read_text(encoding="utf-8"))
if not variant_audit.get("passed"):
    raise SystemExit("the scale-1.2 parameter mesh audit must pass before creating the demo")
featured = [
    "shipyard-block-transporter", "hull-block-fabrication-jig", "floating-drydock-pontoon-module",
    "hull-block-paint-booth", "plate-rolling-machine", "ship-lift-cradle",
    "shipyard-block-spreader-beam", "portable-weld-fume-extractor",
]
assets_by_id = {row["id"]: row for row in assets}
if not set(featured).issubset(assets_by_id):
    raise SystemExit("missing a featured asset from the shipyard catalog")
groups = [
    "Yard and dock operations", "Plate and block fabrication", "Outfitting and yard services",
    "Surface preparation and coating", "Block and material movement", "Inspection and refit support",
]
gallery = []
for row in assets:
    group = next((tag for tag in row["tags"] if tag in groups), "")
    gallery.append({
        "id": row["id"], "title": row["title"], "description": row["description"], "group": group,
        "preview": f"../../../catalog/kits/{row['kit']}/previews/{row['id']}.png",
        "triangles": row["stats"]["triangles"], "budget": row["triangleBudget"],
        "materials": row["stats"]["materials"], "sizeM": row["stats"]["sizeM"],
        "params": [{"name": p["name"], "label": p.get("label", p["name"]), "default": p["default"]} for p in row["params"]],
        "license": row["license"],
    })
data = json.dumps(gallery, ensure_ascii=True).replace("</", "<\\/")
featured_data = json.dumps(featured)
variant_data = json.dumps(variant_audit, ensure_ascii=True)
variant_path = "shipyard-block-transporter-scale-1.2.png"
if not (BUNDLE / variant_path).is_file():
    raise SystemExit("generate the parameter-variant mesh preview first")
title = html.escape("Shipyard · kernelCAD catalog wave")
page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
*{{box-sizing:border-box}} body{{margin:0;background:#e9ece9;color:#1b2827;font:15px/1.45 Inter,Arial,sans-serif}}
header{{padding:22px 34px;background:#18312f;color:#eef2ed;display:flex;justify-content:space-between;align-items:center}}
h1{{font:500 25px Georgia,serif;margin:0}} .eyebrow{{font:11px monospace;letter-spacing:.12em;text-transform:uppercase;color:#d3ad66}}
.local{{font:12px monospace;border:1px solid #8d9b94;padding:7px 10px;border-radius:4px}}
main{{max-width:1320px;margin:0 auto;padding:22px 34px 40px}} .summary{{display:flex;gap:10px;margin:0 0 18px}}
.metric{{background:#fff;border:1px solid #d3dbd5;padding:10px 14px;min-width:145px;border-radius:5px}}
.metric b{{display:block;font:20px Georgia,serif}} .metric span{{font-size:11px;color:#64716c}}
.workflow{{display:grid;grid-template-columns:1fr 1.2fr;gap:20px;align-items:start}}
.browser,.detail{{background:#fff;border:1px solid #d3dbd5;border-radius:6px;padding:16px}}
.filters{{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:13px}} button{{font:12px monospace;color:#364642;background:#f1f3f0;border:1px solid #cfd8d2;padding:7px 9px;border-radius:4px;cursor:pointer}}
button.active,button:hover{{background:#375651;color:#fff;border-color:#375651}}
.tiles{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;max-height:590px;overflow:auto;padding-right:3px}}
.tile{{display:block;text-align:left;padding:0;background:#f8f9f7;border:1px solid #d8ddd8;border-radius:5px;overflow:hidden;color:#1b2927}}
.tile img{{display:block;width:100%;aspect-ratio:1;object-fit:contain;background:#e4e9e7}}
.tile span{{display:block;padding:7px;font:11px/1.35 monospace;min-height:42px}}
.detail{{position:sticky;top:16px}} .detail h2{{font:500 24px Georgia,serif;margin:0 0 7px}}
.detail p{{color:#5a6863;margin:0 0 12px}} .preview{{width:100%;height:350px;object-fit:contain;background:#e4e9e7;border:1px solid #d3dbd5;border-radius:4px}}
.meta{{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}} .chip{{background:#f1f3f0;border:1px solid #d8ded9;border-radius:3px;padding:5px 8px;font:11px monospace}}
.variant{{display:flex;gap:7px;margin:10px 0}} .variant button{{padding:8px 10px}}
.paramline{{margin-top:11px;padding-top:10px;border-top:1px solid #e0e5e1;font:12px monospace;color:#475750}}
footer{{margin-top:20px;color:#68736e;font:11px monospace;display:flex;justify-content:space-between}}
@media(max-width:900px){{.workflow{{grid-template-columns:1fr}}.detail{{position:static}}}}
</style></head><body>
<header><div><div class="eyebrow">Native kernelCAD assets · CC0 1.0</div><h1>Shipyard</h1></div><div class="local">LOCAL PREVIEW · NOT DEPLOYED</div></header>
<main><section class="summary"><div class="metric"><b>70</b><span>assets in this kit</span></div><div class="metric"><b>6</b><span>shipyard work zones</span></div><div class="metric"><b>1,800</b><span>triangle ceiling per asset</span></div></section>
<section class="workflow"><div class="browser"><div class="eyebrow" style="color:#5b6963;margin-bottom:9px">Browse the shipyard</div><div class="filters" id="filters"></div><div class="tiles" id="tiles"></div></div>
<div class="detail"><div class="eyebrow" style="color:#5b6963">Catalog preview</div><h2 id="title"></h2><p id="description"></p><img class="preview" id="preview" alt="Generated asset preview">
<div class="meta" id="meta"></div><div class="variant"><button id="defaultVariant" class="active">Default mesh · scale 1.00</button><button id="scaleVariant">Generated mesh · scale 1.20</button></div>
<div class="paramline" id="params"></div></div></section>
<footer><span>Generated index → source-backed mesh → rendered preview</span><span>Local software validation only · no operational acceptance claim</span></footer></main>
<script>
const assets={data}; const featured={featured_data}; const variantAudit={variant_data}; const variantUrl="{variant_path}";
const categories=["All zones",...{json.dumps(groups)}]; const filters=document.getElementById("filters");
let current=assets.find(a=>a.id==="shipyard-block-transporter");
function boundsText(bounds){{return "bounds "+bounds.map(v=>Math.round(v*1000)).join(" × ")+" mm"}}
function renderMeta(a,bounds=a.sizeM){{const meta=document.getElementById("meta");meta.innerHTML="";[a.triangles+" triangles",a.materials+" material",a.license,"budget "+a.budget,boundsText(bounds)].forEach(t=>{{const e=document.createElement("span");e.className="chip";e.textContent=t;meta.append(e)}})}}
function selectAsset(a){{current=a;document.getElementById("title").textContent=a.title;document.getElementById("description").textContent=a.description;document.getElementById("preview").src=a.preview;document.getElementById("preview").alt=a.title+" generated mesh preview";renderMeta(a);document.getElementById("params").textContent="Parameters · "+a.params.map(p=>p.label+" (default "+p.default+")").join(" · ");document.getElementById("defaultVariant").classList.add("active");document.getElementById("scaleVariant").classList.remove("active");document.getElementById("scaleVariant").disabled=a.id!=="shipyard-block-transporter"}}
function showTiles(group="All zones"){{document.querySelectorAll(".tile").forEach(e=>e.hidden=group!=="All zones"&&e.dataset.group!==group);document.querySelectorAll(".filter").forEach(e=>e.classList.toggle("active",e.dataset.group===group))}}
categories.forEach(group=>{{const b=document.createElement("button");b.className="filter";b.dataset.group=group;b.textContent=group;b.onclick=()=>showTiles(group);filters.append(b)}});
const displayAssets=[...assets].sort((a,b)=>{{const ai=featured.indexOf(a.id),bi=featured.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi)}});
displayAssets.forEach(a=>{{const b=document.createElement("button");b.className="tile";b.dataset.id=a.id;b.dataset.group=a.group;b.onclick=()=>selectAsset(a);const im=document.createElement("img");im.src=a.preview;im.alt="";im.loading="lazy";const label=document.createElement("span");label.textContent=a.title;b.append(im,label);document.getElementById("tiles").append(b)}});
showTiles("All zones");selectAsset(current);
document.getElementById("defaultVariant").onclick=()=>{{document.getElementById("preview").src=current.preview;renderMeta(current);document.getElementById("defaultVariant").classList.add("active");document.getElementById("scaleVariant").classList.remove("active")}};
document.getElementById("scaleVariant").onclick=()=>{{if(current.id!=="shipyard-block-transporter")return;document.getElementById("preview").src=variantUrl;renderMeta(current,variantAudit.variantBoundsM);document.getElementById("scaleVariant").classList.add("active");document.getElementById("defaultVariant").classList.remove("active")}};
</script></body></html>'''
target = BUNDLE / "shipyard-demo.html"
target.write_text(page, encoding="utf-8")
print(f"wrote {target.relative_to(ROOT)} with {len(assets)} catalog cards")
