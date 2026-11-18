#!/usr/bin/env python3
"""Generate original low-poly space exploration props for kernelCAD."""
import json
import math
import re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]; KIT_ID='space-exploration'; KIT=ROOT/'catalog/kits'/KIT_ID; KIT.mkdir(parents=True,exist_ok=True)
for stale in KIT.glob('*.kcad.ts'): stale.unlink()
def B(n,x,y,z,w,d,h): return ('b',n,x,y,z,w,d,h)
def C(n,x,y,z,h,r,s=8): return ('c',n,x,y,z,h,r,s)
ASSETS=[
('lunar-habitat-module','Lunar habitat module','Compact cylindrical surface habitat with a domed cap, four corner supports, a framed entry hatch and a forward porthole.','#d97835',[C('body',0,0,80,820,360,10),C('roof',0,0,900,100,390,10),B('hatch',0,-355,200,300,28,500),B('viewport',0,-377,610,130,24,100),*[B(f'leg-{x}-{y}',x,y,0,90,90,130) for x in(-250,250) for y in(-250,250)]]),
('airlock-hatch','Airlock hatch','Circular pressure-door prop with an outer rim, central disk, handle and locking lugs.','#737c7d',[C('rim',0,0,40,55,360,12),C('door',0,0,95,40,300,12),B('handle',0,-315,135,140,25,42),*[C(f'lug-{i}',x,y,95,65,34) for i,(x,y) in enumerate([(0,-340),(240,-240),(340,0),(240,240),(0,340),(-240,240),(-340,0),(-240,-240)])]]),
('habitat-corridor-section','Habitat corridor section','Short cylindrical pressure corridor with two raised seam rings and floor skids.','#9d9a8d',[C('tube',0,0,80,560,290,10),C('ring-a',0,0,60,70,330,10),C('ring-b',0,0,590,70,330,10),B('skid-left',0,-220,0,620,80,80),B('skid-right',0,220,0,620,80,80)]),
('cargo-airlock-pod','Cargo airlock pod','Small cargo transfer pod with rounded-looking shell, wide hatch and side grab rails.','#b5aa8e',[C('pod',0,0,50,650,280,10),C('cap',0,0,700,65,290,10),B('hatch',0,-278,180,330,24,350),B('rail-left',-130,-340,160,28,45,470),B('rail-right',130,-340,160,28,45,470)]),
('emergency-shelter-pod','Emergency shelter pod','Low emergency shelter capsule with raised end caps, foot pads and a top handle rail.','#c98c52',[B('shell',0,0,80,1100,650,600),B('top',0,0,680,950,520,80),C('end-a',-475,0,380,600,240),C('end-b',475,0,380,600,240),B('handle',0,0,820,500,55,35),*[B(f'foot-{x}',x,0,0,150,240,80) for x in(-350,350)]]),
('surface-storage-shed','Surface storage shed','Boxy field storage module with double doors, roof lip and raised corner feet.','#8b8174',[B('body',0,0,100,1200,900,1500),B('roof',0,0,1600,1300,1000,80),B('door-left',-270,-460,140,500,24,1250),B('door-right',270,-460,140,500,24,1250),*[B(f'foot-{x}-{y}',x,y,0,120,120,100) for x in(-500,500) for y in(-350,350)]]),
('inflatable-habitat-frame','Inflatable habitat frame','Inflatable habitat shell represented by a broad drum, end collars and an external rib frame.','#a7a59a',[C('shell',0,0,70,900,410,10),C('collar-a',0,0,40,90,450,10),C('collar-b',0,0,910,90,450,10),*[B(f'rib-{i}',-330+i*220,0,70,42,840,860) for i in range(4)]]),
('pressurized-tunnel-collar','Pressurized tunnel collar','Circular tunnel connection ring with broad flange, inner lip and four bolt bosses.','#7c8585',[C('flange',0,0,20,85,410,12),C('inner-lip',0,0,105,45,340,12),*[C(f'bolt-{i}',x,y,20,70,28) for i,(x,y) in enumerate([(0,-370),(370,0),(0,370),(-370,0)])]]),
('lunar-rover-chassis','Lunar rover chassis','Six-wheel lunar rover with a raised equipment bay, paired rocker links, exposed suspension and a forward navigation camera.','#e87832',[B('deck',0,0,430,1150,700,100),B('equipment-bay',0,25,530,500,420,210),B('instrument-cover',0,25,740,560,480,34),C('camera-mast',0,0,774,230,28,8),B('front-bumper',0,-390,310,1250,80,80),B('rear-rail',0,390,360,1100,45,110),*[B(f'rocker-{side}',side*560,0,210,55,570,55) for side in(-1,1)],*[B(f'suspension-{side}-{y}',side*520,y,220,230,45,45) for side in(-1,1) for y in(-250,0,250)],*[C(f'wheel-{side}-{y}',side*640,y,180,150,180,12) for side in(-1,1) for y in(-250,0,250)],B('navigation-camera',0,-410,455,150,85,95)]),
('rover-wheel-assembly','Rover wheel assembly','Oversized low-pressure rover wheel with a broad tire, inset hub and twelve separated traction bars around the circumference.','#55595b',[C('tire',0,0,300,170,300,12),C('hub',0,0,300,50,110,10),*[B(f'tread-{i}',0,0,10,62,100,190) for i in range(12)]]),
('rover-seat','Rover operator seat','Simple rover seat with bucket base, raised back, arm rests and central pedestal.','#6c716e',[B('cushion',0,0,510,420,420,130),B('back',0,190,800,420,110,560),B('arm-left',-245,20,650,70,390,70),B('arm-right',245,20,650,70,390,70),C('pedestal',0,0,130,310,95),B('foot',0,0,70,360,320,60)]),
('sample-trailer-cart','Sample trailer cart','Low two-wheel sample trailer with a raised cargo bed, drawbar, retaining rails and wheels on a shared axle.','#8d8064',[B('bed',0,0,290,950,720,100),*[B(f'rail-{i}',-430+i*215,0,390,38,720,100) for i in range(5)],B('drawbar',0,-520,190,90,520,70),*[C(f'wheel-{side}',0,side*390,210,120,210,12) for side in(-1,1)]]),
('rover-tool-rack','Rover tool rack','Open rack with three long tool channels, end stops and four mounting feet.','#6c7475',[B('base',0,0,80,880,420,90),*[B(f'channel-{i}',0,-140+i*140,170,760,54,70) for i in range(3)],B('end-left',-400,0,220,50,460,250),B('end-right',400,0,220,50,460,250),*[B(f'foot-{x}',x,0,0,100,120,80) for x in(-340,340)]]),
('rover-charging-dock','Rover charging dock','Low charging dock with guide rails, raised connector post and two anchor pads.','#58676b',[B('base',0,0,60,1150,700,120),B('guide-left',0,-280,130,1050,70,90),B('guide-right',0,280,130,1050,70,90),C('post',0,250,180,540,95),B('connector',0,180,650,180,160,120),*[B(f'anchor-{x}',x,0,0,120,180,60) for x in(-460,460)]]),
('rover-dust-shield','Rover dust shield','Pair of broad rover wheel shields with short mounting struts and protective edge lips.','#a69c83',[B('shield-left',-380,0,300,420,65,700),B('shield-right',380,0,300,420,65,700),*[B(f'strut-{x}-{y}',x,y,60,55,55,440) for x in(-380,380) for y in(-80,80)],B('lip-left',-380,-40,650,440,35,55),B('lip-right',380,-40,650,440,35,55)]),
('landing-gear-pod','Landing gear pod','Landing leg pod with a tapered-looking strut, broad footplate and two brace arms.','#777b78',[C('strut',0,0,80,700,90),B('foot',0,0,25,440,440,50),B('brace-left',-110,0,300,40,90,520),B('brace-right',110,0,300,40,90,520),C('collar',0,0,630,65,135)]),
('orbital-communication-dish','Orbital communication dish','Compact satellite with a forward-tilted reflector, projecting feed horn, support arm and two solar-panel wings.','#d97835',[B('bus',0,0,220,420,420,440),C('dish',0,-520,650,60,320,12),B('arm',0,-330,420,60,400,50),C('feed',0,-790,780,100,48,10),B('panel-left',-520,0,260,560,40,400),B('panel-right',520,0,260,560,40,400)]),
('satellite-bus','Satellite bus','Rectangular satellite bus with corner rails, top sensor block and two side panel mounts.','#aaa99c',[B('bus',0,0,220,700,600,600),B('top-sensor',0,0,540,260,260,100),*[B(f'corner-{x}-{y}',x,y,190,40,40,660) for x in(-320,320) for y in(-270,270)],B('panel-mount-left',-430,0,300,180,60,80),B('panel-mount-right',430,0,300,180,60,80)]),
('satellite-solar-wing','Satellite solar wing','Deployable satellite panel wing with a central spine and three framed panel sections.','#46556a',[B('spine',0,0,35,90,1100,70),*[B(f'panel-{i}',0,-360+i*360,100,620,300,28) for i in range(3)],*[B(f'crossbar-{i}',0,-360+i*360,55,650,38,30) for i in range(4)]]),
('surface-antenna-mast','Surface antenna mast','Short surface mast with tripod feet, a crossbar and two small vertical aerials.','#747c7b',[C('mast',0,0,0,1350,38),B('crossbar',0,0,1040,650,45,45),*[C(f'aerial-{i}',x,0,1085,420,18) for i,x in enumerate((-250,250))],*[B(f'foot-{i}',x,y,0,240,70,45) for i,(x,y) in enumerate([(0,-190),(-165,95),(165,95)])]]),
('relay-beacon','Relay beacon','Standalone relay beacon with a capped post, indicator box and four low anchor tabs.','#dfb84d',[B('base',0,0,30,320,320,60),C('post',0,0,60,720,55),B('beacon',0,0,810,260,260,220),B('cap',0,0,930,300,300,40),*[B(f'anchor-{i}',x,y,0,70,70,30) for i,(x,y) in enumerate([(120,120),(-120,120),(120,-120),(-120,-120)])]]),
('tracking-antenna-dish','Tracking antenna dish','Small tracking dish with a pedestal, offset feed arm and rotating-looking azimuth plate.','#b4b8b3',[C('base',0,0,0,60,210),C('pedestal',0,0,60,360,72),C('turntable',0,0,420,60,150),C('dish',0,-190,650,55,260),B('arm',0,-120,610,50,240,50),C('feed',0,-385,590,90,55)]),
('power-distribution-unit','Surface power distribution unit','Field power distribution box with two outlet panels, cable entries and raised roof.','#7a8179',[B('body',0,0,150,660,480,300),B('roof',0,0,330,700,520,60),B('panel-left',-150,-248,180,210,18,190),B('panel-right',150,-248,180,210,18,190),*[C(f'gland-{i}',-180+i*180,0,0,95,32) for i in range(3)]]),
('surface-battery-bank','Surface battery bank','Four-cell battery bank on a skid frame with vent caps and lifting rails.','#777c76',[B('skid-left',0,-230,35,1080,80,70),B('skid-right',0,230,35,1080,80,70),*[B(f'cell-{i}',-390+i*260,0,110,230,420,560) for i in range(4)],*[C(f'cap-{i}',-390+i*260,0,670,36,38) for i in range(4)]]),
('sample-canister','Regolith sample canister','Sealed cylindrical sample canister with lid band, side grip and a flat foot ring.','#b39b70',[C('body',0,0,40,420,180),C('lid',0,0,460,55,195),C('rim',0,0,20,35,190),B('handle',0,-205,270,150,35,55)]),
('core-sampler','Core sampler tool','Long core sampler with a pointed-looking barrel, top grip and lower cutting collar.','#8d8b7d',[C('barrel',0,0,100,700,62),C('collar',0,0,100,55,95),C('tip',0,0,800,170,36),B('grip-left',-90,0,560,45,45,230),B('grip-right',90,0,560,45,45,230),B('cross-handle',0,0,790,300,45,45)]),
('regolith-sieve','Regolith sieve tray','Shallow field sieve tray with raised rim, crossed support legs and a central mesh panel.','#a69878',[B('mesh',0,0,500,640,480,24),*[B(f'rim-{i}',-240+i*160,0,540,24,500,65) for i in range(4)],B('rim-side-a',0,-230,540,640,24,65),B('rim-side-b',0,230,540,640,24,65),*[B(f'leg-{x}',x,0,250,55,55,500) for x in(-220,220)]]),
('geological-hammer','Geological sampling hammer','Compact geology hammer with a broad head, tapered handle and pommel block.','#777a77',[B('head',0,0,560,380,120,125),B('pick',-230,0,560,140,90,65),B('handle',0,0,260,95,95,520),B('grip',0,0,50,120,120,180),B('pommel',0,0,0,140,140,60)]),
('spectrometer-case','Field spectrometer case','Rugged instrument case with lid seam, carry handle and two front latches.','#68746e',[B('case',0,0,90,720,500,180),B('lid',0,0,270,720,500,180),B('handle',0,-260,390,200,40,70),*[B(f'latch-{x}',x,-260,210,60,35,85) for x in(-210,210)],B('foot',0,0,0,760,540,40)]),
('science-instrument-tripod','Science instrument tripod','Field instrument tripod with a short mast, mounting head and three splayed legs.','#85887f',[C('mast',0,0,80,520,38),C('head',0,0,600,100,125),*[B(f'leg-{i}',x,y,0,40,50,650) for i,(x,y) in enumerate([(0,-150),(-130,75),(130,75)])],B('mount',0,0,690,260,180,60)]),
('seismic-sensor','Surface seismic sensor','Low seismic sensor puck with a raised cover, three feet and cable connector.','#7c8178',[C('foot',0,0,0,45,170),C('body',0,0,45,200,135),C('cap',0,0,245,45,150),*[B(f'foot-{i}',x,y,0,65,65,60) for i,(x,y) in enumerate([(110,0),(-55,95),(-55,-95)])],C('port',0,-140,80,80,30)]),
('sample-drill-head','Rock sample drill head','Compact drill head with a stepped barrel, mounting collar and rectangular drive block.','#777e7a',[C('barrel',0,0,100,450,95),C('collar',0,0,100,70,130),C('bit',0,0,550,260,42),B('drive',0,130,270,300,220,240),B('mount',0,0,0,430,370,80)]),
('equipment-locker','Field equipment locker','Tall equipment locker with double doors, top lip and four compact feet.','#8c887a',[B('body',0,0,100,800,500,1450),B('top',0,0,1550,860,560,70),B('door-left',-195,-260,140,370,18,1240),B('door-right',195,-260,140,370,18,1240),*[B(f'foot-{x}',x,0,0,100,100,100) for x in(-300,300)]]),
('oxygen-cylinder-rack','Oxygen cylinder rack','Two-cylinder service rack with retaining hoops, bottom tray and lifting bar.','#8c9b99',[B('tray',0,0,35,620,300,70),*[C(f'cylinder-{i}',-150+i*300,0,105,820,110) for i in range(2)],B('top-bar',0,0,960,650,50,55),B('back',0,100,480,600,35,780),*[B(f'foot-{x}',x,0,0,90,100,70) for x in(-270,270)]]),
('field-tool-chest','Field tool chest','Low tool chest with a hinged-looking lid, front drawer line and side grab handles.','#716c5e',[B('base',0,0,80,780,500,160),B('lid',0,0,250,820,540,180),B('drawer',0,-258,115,550,20,90),B('handle-left',-440,0,180,65,130,160),B('handle-right',440,0,180,65,130,160),B('latch',0,-280,265,100,30,65)]),
('science-worktable','Field science worktable','Compact science worktable with a broad deck, four legs, lower shelf and instrument rail.','#817663',[B('top',0,0,760,1100,700,70),B('shelf',0,0,300,900,520,50),*[B(f'leg-{x}-{y}',x,y,0,70,70,760) for x in(-470,470) for y in(-270,270)],B('rail',0,310,900,1000,45,60)]),
('specimen-tray','Geology specimen tray','Shallow specimen tray divided into six sample cells with reinforced corner blocks.','#aa9d7d',[B('base',0,0,30,780,520,60),*[B(f'divider-x-{i}',-180+i*180,0,100,24,480,80) for i in range(3)],B('divider-y-a',0,-120,100,760,24,80),B('divider-y-b',0,120,100,760,24,80),*[B(f'corner-{i}',x,y,0,60,60,35) for i,(x,y) in enumerate([(-360,-230),(360,-230),(-360,230),(360,230)])]]),
('payload-container','Instrument payload container','Square instrument payload canister with lid rim, corner rails and a recessed front panel.','#8b8067',[B('body',0,0,100,760,760,900),B('lid',0,0,1000,820,820,100),*[B(f'corner-{x}-{y}',x,y,120,45,45,900) for x in(-330,330) for y in(-330,330)],B('panel',0,-390,350,430,20,350)]),
('transport-sled','Surface cargo sled','Low cargo sled with twin runners, cross braces and a raised tow loop.','#8b7a5e',[B('runner-left',0,-250,25,1250,80,50),B('runner-right',0,250,25,1250,80,50),*[B(f'cross-{i}',-440+i*290,0,90,80,560,80) for i in range(4)],B('deck',0,0,150,1050,510,40),C('tow-loop',0,-670,60,100,38)]),
('landing-pad-marker','Landing zone marker','Low landing-zone marker with a broad base plate and raised guide posts at each corner.','#bd9750',[B('plate',0,0,25,1200,1200,50),*[B(f'post-{x}-{y}',x,y,50,70,70,370) for x in(-460,460) for y in(-460,460)],B('center',0,0,55,320,320,20)]),
('survey-flag','Survey flag marker','Survey marker pole with a triangular flag panel, pointed cap and round base plate.','#d1b648',[C('base',0,0,0,35,105),C('pole',0,0,35,1050,24),B('flag',0,0,790,300,30,220),C('cap',0,0,1085,45,36)]),
('surface-cable-bridge','Surface cable bridge','Low protective cable bridge with paired ramps, central cover and side guard lips.','#817d6e',[B('cover',0,0,85,720,420,130),B('ramp-left',-490,0,35,360,420,70),B('ramp-right',490,0,35,360,420,70),B('lip-left',0,-215,150,720,30,70),B('lip-right',0,215,150,720,30,70)]),
('dust-protection-screen','Dust protection screen','Portable low dust screen with three panels, side rails and broad floor skids.','#89877e',[*[B(f'panel-{i}',-360+i*360,0,390,320,45,780) for i in range(3)],B('top-rail',0,0,800,1080,65,55),B('bottom-rail',0,0,15,1080,65,30),B('skid-left',-360,0,0,180,500,50),B('skid-right',360,0,0,180,500,50)]),
('equipment-stanchion','Equipment stanchion','Short equipment stanchion with a weighted foot, post and rectangular mounting head.','#727875',[B('foot',0,0,20,300,300,40),C('post',0,0,40,720,35),B('head',0,0,800,240,180,140),B('cap',0,0,875,270,205,25)]),
('surface-sensor-post','Surface sensor post','Short instrument post with twin sensor boxes, a crossbar and three support feet.','#7b8079',[C('mast',0,0,0,1000,36),B('sensor-a',0,0,740,270,220,180),B('sensor-b',0,0,450,190,180,140),B('crossbar',0,0,600,500,40,40),*[B(f'foot-{i}',x,y,0,200,70,40) for i,(x,y) in enumerate([(0,-130),(-112,65),(112,65)])]]),
('field-lamp','Portable field lamp','Compact field lamp with a square base, upright stem and broad rectangular lamp head.','#c0a56c',[B('base',0,0,25,260,260,50),C('stem',0,0,50,430,28),B('neck',0,0,470,100,100,80),B('head',0,0,640,320,180,250),B('lens',0,-95,640,250,20,170)]),
('robotic-arm-pedestal','Instrument arm pedestal','Static instrument-arm pedestal with a broad base, two block links and a tool-end mount.','#797e79',[B('base',0,0,35,520,520,70),C('turntable',0,0,70,90,180),B('lower-link',0,0,330,180,180,460),B('upper-link',160,0,670,480,150,150),C('joint',380,0,700,180,85),B('tool-mount',520,0,720,160,180,100)]),
('sample-cassette','Sample cassette carrier','Stackable sample cassette with four open cell blocks and a raised handle ridge.','#9b9078',[B('base',0,0,25,720,500,50),*[B(f'cell-{i}',-240+i*160,0,60,140,400,90) for i in range(4)],B('handle',0,0,170,520,55,45),B('end-left',-350,0,70,40,520,110),B('end-right',350,0,70,40,520,110)]),
('drill-core-tube-rack','Core tube rack','Portable core-tube rack with four parallel channels and broad end plates.','#8f8a7a',[B('base',0,0,40,820,620,80),*[C(f'tube-{i}',-270+i*180,0,120,570,48) for i in range(4)],B('end-left',-380,0,210,60,650,300),B('end-right',380,0,210,60,650,300)]),
('surface-utility-cart','Surface utility cart','Small four-wheel utility cart with a raised deck, push handle and low-profile tires outside the frame.','#89806b',[B('deck',0,0,360,900,600,70),B('handle',0,250,760,760,50,50),*[B(f'handle-post-{x}',x,250,430,55,55,620) for x in(-330,330)],*[C(f'wheel-{x}-{y}',x,y,235,90,95,10) for x in(-330,330) for y in(-330,330)]]),
('habitat-spares-crate','Habitat spares crate','Stackable spares crate with reinforced corner rails, lid seam and side hand slots.','#9a8a68',[B('body',0,0,80,800,650,520),B('lid',0,0,620,840,690,70),*[B(f'corner-{x}-{y}',x,y,90,70,70,570) for x in(-340,340) for y in(-265,265)],B('slot-left',-405,-10,310,18,210,80),B('slot-right',405,-10,310,18,210,80)]),
('portable-science-console','Portable science console','Field console with tilted-looking display housing, top rail and four low mounting feet.','#66716e',[B('base',0,0,40,650,500,80),B('body',0,0,250,600,420,360),B('screen',0,-215,510,390,18,190),B('hood',0,-150,620,500,120,45),*[B(f'foot-{x}-{y}',x,y,0,90,90,40) for x in(-250,250) for y in(-180,180)]]),
]
if len(ASSETS)!=52: raise SystemExit(f'expected 52 assets, got {len(ASSETS)}')
MATERIALS = {
    'paint': ('#9aa09a', 'Painted shell'),
    'aluminum': ('#b6bdbe', 'Bare aluminum'),
    'rubber': ('#34383a', 'Rubber'),
    'glass': ('#548b9a', 'Optical glass'),
    'solarCell': ('#304d70', 'Solar cells'),
    'fabric': ('#b4aa8c', 'Insulating fabric'),
    'warningAmber': ('#d9aa36', 'Warning amber'),
    'reflector': ('#eef1f1', 'Reflective aluminum'),
}
ROLE_ORDER = ['paint', 'aluminum', 'rubber', 'glass', 'solarCell', 'fabric', 'warningAmber', 'reflector']
METAL_PART = re.compile(r'(rim|ring|lug|rail|mount|brace|strut|mast|antenna|bar|tube|collar|skid|runner|cross|post|handle|connector|bolt|joint|arm|hinge|cap|gland|pedestal|pole|pick|latch|foot|leg|rocker|suspension|chute|hub|feed|cover|hatch)', re.I)
GLASS_PART = re.compile(r'(lens|screen|sensor|camera|display|beacon|indicator|viewport)', re.I)

def material_for(aid, name):
    low = name.lower()
    if 'wheel' in low or 'tire' in low or 'tread' in low or 'grip' in low:
        return 'rubber'
    if aid == 'satellite-solar-wing' and 'panel' in low:
        return 'solarCell'
    if aid == 'orbital-communication-dish' and 'panel-' in low:
        return 'solarCell'
    if GLASS_PART.search(low):
        return 'glass'
    if low == 'dish' and ('antenna' in aid or 'communication' in aid):
        return 'reflector'
    if aid == 'inflatable-habitat-frame' and 'shell' in low:
        return 'fabric'
    if low == 'flag' or 'inflatable' in low:
        return 'fabric'
    if 'marker' in aid and low == 'center':
        return 'warningAmber'
    if METAL_PART.search(low):
        return 'aluminum'
    return 'paint'

def chamfered_box_source(include_basic, include_rotation):
    source = [
        'const octRect = (w: number, d: number, c: number) => path().moveTo(-w/2+c,-d/2).lineTo(w/2-c,-d/2).lineTo(w/2,-d/2+c).lineTo(w/2,d/2-c).lineTo(w/2-c,d/2).lineTo(-w/2+c,d/2).lineTo(-w/2,d/2-c).lineTo(-w/2,-d/2+c).close();',
        'const boxShape = (w: number, d: number, h: number) => {',
        '  const bevel = Math.min(w,d,h) * 0.06;',
        '  const levels = [-h/2,-h/2+bevel,h/2-bevel,h/2];',
        '  const insets = [bevel,0,0,bevel];',
        '  const profiles = levels.map((_,i) => octRect(w-2*insets[i],d-2*insets[i],Math.min(w-2*insets[i],d-2*insets[i])*0.06));',
        "  return profiles[0].loft(profiles.slice(1), { planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })), ruled: true });",
        '};',
    ]
    if include_basic:
        source.append('const b = (x: number,y: number,z: number,w: number,d: number,h: number) => boxShape(w,d,h).translate(x,y,z+h/2).scale(scale);')
    if include_rotation:
        source.append('const br = (x: number,y: number,z: number,w: number,d: number,h: number,rx=0,ry=0) => boxShape(w,d,h).rotateX(rx).rotateY(ry).translate(x,y,z+h/2).scale(scale);')
    return source

def cylinder_source(aid, parts):
    names = [part[1] for part in parts if part[0]=='c']
    has_dish = 'dish' in names
    has_wheels = any(name in ('tire','hub') or 'wheel' in name for name in names)
    has_x_wheels = aid == 'lunar-rover-chassis' and has_wheels
    has_y_wheels = has_wheels and not has_x_wheels
    has_plain_cylinder = any(name != 'dish' and not (name in ('tire','hub') or 'wheel' in name) for name in names)
    source = [
        'const ngon = (r: number,n: number) => { let p = path().moveTo(r,0); for (let k=1;k<n;k++) { const a=2*Math.PI*k/n; p=p.lineTo(r*Math.cos(a),r*Math.sin(a)); } return p.close(); };',
        'const cylShape = (h: number,r: number,n=8) => {',
        '  const levels = [0,h*0.08,h*0.92,h]; const radii = [r*0.86,r,r,r*0.86];',
        '  const profiles = levels.map((_,i) => ngon(radii[i],n));',
        "  return profiles[0].loft(profiles.slice(1), { planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })), ruled: true });",
        '};',
    ]
    if has_plain_cylinder:
        source.append('const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylShape(h,r,n).translate(x,y,z).scale(scale);')
    if has_y_wheels:
        source.append('const wheelY = (x: number,y: number,z: number,w: number,r: number,n=12) => cylShape(w,r,n).translate(0,0,-w/2).rotateX(90).translate(x,y,z).scale(scale);')
    if has_x_wheels:
        source.append('const wheelX = (x: number,y: number,z: number,w: number,r: number,n=12) => cylShape(w,r,n).translate(0,0,-w/2).rotateY(90).translate(x,y,z).scale(scale);')
    if has_dish:
        source += [
            'const dishShape = (h: number,r: number,n=12) => {',
            '  const levels = [0,h*0.16,h*0.62,h]; const radii = [r*0.16,r*0.48,r*0.82,r];',
            '  const profiles = levels.map((_,i) => ngon(radii[i],n));',
            "  return profiles[0].loft(profiles.slice(1), { planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })), ruled: true });",
            '};',
            'const dish = (x: number,y: number,z: number,h: number,r: number,n=12) => dishShape(h,r,n).rotateX(55).translate(x,y,z).scale(scale);',
        ]
    return source

def box_rotation(aid, name):
    low = name.lower()
    if aid == 'dust-protection-screen' and low.startswith('panel-'):
        return (0, (int(low.rsplit('-',1)[1])-1)*7)
    if aid == 'field-tool-chest' and low == 'lid': return (4, 0)
    if aid == 'geological-hammer' and low == 'handle': return (0, 12)
    if aid == 'geological-hammer' and low == 'pick': return (0, -12)
    if aid == 'lunar-rover-chassis' and low.startswith('suspension-'):
        match = re.match(r'suspension-(-?\d+)-', low)
        side = -1 if match and match.group(1) == '-1' else 1
        return (0, side*11)
    if aid == 'orbital-communication-dish' and low == 'arm': return (-24, 0)
    if aid == 'portable-science-console' and low in ('screen','hood'): return (-12, 0)
    if aid == 'regolith-sieve' and low.startswith('leg-'):
        return (0, -10 if low.endswith('-220') else 10)
    if aid == 'surface-cable-bridge' and low.startswith('ramp-'):
        return (0, -18 if low.endswith('left') else 18)
    if aid == 'spectrometer-case' and low == 'lid': return (5, 0)
    if aid == 'surface-storage-shed' and low == 'roof': return (0, 2)
    return None

def render(a):
    aid,title,desc,color,parts=a
    def rotated_box_min_z(w,d,h,rx,ry):
        bevel=min(w,d,h)*0.06
        levels=[-h/2,-h/2+bevel,h/2-bevel,h/2]
        insets=[bevel,0,0,bevel]
        x_angle,y_angle=math.radians(rx),math.radians(ry)
        candidates=[]
        for z,inset in zip(levels,insets):
            width,depth=w-2*inset,d-2*inset
            corner=min(width,depth)*0.06
            profile=[(-width/2+corner,-depth/2),(width/2-corner,-depth/2),(width/2,-depth/2+corner),(width/2,depth/2-corner),(width/2-corner,depth/2),(-width/2+corner,depth/2),(-width/2,depth/2-corner),(-width/2,-depth/2+corner)]
            for x,y in profile:
                after_x=y*math.sin(x_angle)+z*math.cos(x_angle)
                candidates.append(-x*math.sin(y_angle)+after_x*math.cos(y_angle))
        return min(candidates)
    def lower_z(part):
        if part[0]=='c' and part[1]=='dish':
            return part[4]-part[6]*math.sin(math.radians(55))
        if part[0]=='c' and ('wheel' in part[1] or part[1] in ('tire','hub')):
            vertical_angle=0 if aid=='lunar-rover-chassis' else math.pi/2
            support=max(math.cos(2*math.pi*k/part[7]-vertical_angle) for k in range(part[7]))
            return part[4]-part[6]*support
        if aid=='rover-wheel-assembly' and part[0]=='b' and part[1].startswith('tread-'):
            return -34
        if part[0]=='b':
            rotation=box_rotation(aid,part[1])
            if rotation is not None:
                _,name,x,y,z,w,d,h=part
                return z+h/2+rotated_box_min_z(w,d,h,*rotation)
        return part[4]
    minz=min(lower_z(p) for p in parts)
    hasb=any(p[0]=='b' for p in parts); hasc=any(p[0]=='c' for p in parts)
    part_names=[p[1] for p in parts]
    part_roles=[material_for(aid,name) for name in part_names]
    if len(set(part_roles)) < 2:
        target = next((i for i,name in enumerate(part_names) if name.lower() in ('body','base','deck','bed','shell','case','head','door')), 0)
        part_roles[target] = 'paint' if part_roles[target] != 'paint' else 'aluminum'
    roles=[role for role in ROLE_ORDER if role in set(part_roles)]
    if len(roles)>4:
        kept=roles[:4]
        part_roles=[role if role in kept else 'aluminum' for role in part_roles]
        roles=kept
    defaults={role:(color if role=='paint' else MATERIALS[role][0]) for role in roles}
    budget_estimate=sum(60 if p[0]=='b' else max(64,p[-1]*8) for p in parts)
    triangle_budget=max(300,math.ceil(budget_estimate*1.4+80))
    color_knobs=', '.join(roles)
    out=[
        '// SPDX-License-Identifier: CC0-1.0',
        f'// {title}: {desc} Stylized visualization geometry in millimetres, Z up.',
        '', 'meta({', f'  name: {json.dumps(aid)},', "  license: 'CC0-1.0',", f'  title: {json.dumps(title)},',
        f'  description: {json.dumps(desc+" Material controls: "+color_knobs+"; named lunarDust and highVisibility presets.")},',
        "  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],", f"  kit: '{KIT_ID}',", "  category: 'prop',", "  origin: 'base',", "  compat: ['space', 'science', 'exploration', 'scene'],", f'  triangleBudget: {triangle_budget},',
        '});', '', "const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });"
    ]
    for role in roles:
        out.append(f"const {role} = param('{role}', {json.dumps(defaults[role])}, {{ label: {json.dumps(MATERIALS[role][1])} }});")
    lunar={role:({'paint':'#c9c3b5','aluminum':'#c3c5c3','rubber':'#514d44','glass':'#7b9ba0','solarCell':'#52647b','fabric':'#d0c7a9','warningAmber':'#d3bd82','reflector':'#f5f6f4'}[role]) for role in roles}
    visible={role:({'paint':'#d86e35','aluminum':'#d8b255','rubber':'#34383a','glass':'#63a9b8','solarCell':'#244267','fabric':'#d7c98f','warningAmber':'#f0b72f','reflector':'#dce9ee'}[role]) for role in roles}
    out+=['','presets({',f'  lunarDust: {json.dumps(lunar)},',f'  highVisibility: {json.dumps(visible)},','});']
    out+=['']
    needs_br=aid=='rover-wheel-assembly' or any(box_rotation(aid,name) is not None for name in part_names)
    needs_b=any(not (aid=='rover-wheel-assembly' and name.startswith('tread-')) for q,name in zip(parts,part_names) if q[0]=='b')
    if hasb: out+=chamfered_box_source(needs_b,needs_br)
    if hasc: out+=cylinder_source(aid,parts)
    out+=['',f'const p = assembly({json.dumps(aid)});']
    tread_count=sum(1 for q in parts if q[0]=='b' and q[1].startswith('tread-'))
    for q,role in zip(parts,part_roles):
        if q[0]=='b':
            _,name,x,y,z,w,d,h=q
            if aid=='rover-wheel-assembly' and name.startswith('tread-'):
                i=int(name.rsplit('-',1)[1]); angle=360*i/tread_count; rad=math.radians(angle)
                cx=320*math.sin(rad); cz=300+320*math.cos(rad)
                expr=f'br({cx:.3f},0,{cz-14-minz:.3f},150,170,28,0,{angle:.3f})'
            else:
                rotation=box_rotation(aid,name)
                expr=(f'br({x},{y},{z-minz},{w},{d},{h},{rotation[0]},{rotation[1]})' if rotation else f'b({x},{y},{z-minz},{w},{d},{h})')
            out.append(f'p.part({json.dumps(name)},{expr}.color({role}));')
        else:
            _,name,x,y,z,h,r,n=q
            if name=='dish': expr=f'dish({x},{y},{z-minz},{h},{r},{n})'
            elif (name in ('tire','hub') or 'wheel' in name) and aid=='lunar-rover-chassis': expr=f'wheelX({x},{y},{z-minz},{h},{r},{n})'
            elif name in ('tire','hub') or 'wheel' in name: expr=f'wheelY({x},{y},{z-minz},{h},{r},{n})'
            else: expr=f'c({x},{y},{z-minz},{h},{r},{n})'
            out.append(f'p.part({json.dumps(name)},{expr}.color({role}));')
    out+=['','return p.model();','']
    return '\n'.join(out)
for a in ASSETS: (KIT/f'{a[0]}.kcad.ts').write_text(render(a))
(KIT/'kit.json').write_text(json.dumps({'title':'Space exploration','description':'Stylized lunar habitat, rover, spacecraft support and field science props with editable scale, material-specific colors and named appearance presets.'},indent=2)+'\n')
print(f'generated {len(ASSETS)} space exploration assets')
