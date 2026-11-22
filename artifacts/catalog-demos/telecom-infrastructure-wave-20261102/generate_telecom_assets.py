#!/usr/bin/env python3
"""Generate original low-poly telecom infrastructure props for kernelCAD."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT_ID = 'telecom-infrastructure'
KIT = ROOT / 'catalog' / 'kits' / KIT_ID
KIT.mkdir(parents=True, exist_ok=True)
for stale in KIT.glob('*.kcad.ts'):
    stale.unlink()

# B parts take a base Z and are emitted around the box center. C parts are
# vertical cylinders whose Z value is their base. All dimensions are mm.
def B(name, x, y, z, w, d, h):
    return ('b', name, x, y, z, w, d, h)
def C(name, x, y, z, h, r, sides=8):
    return ('c', name, x, y, z, h, r, sides)

ASSETS = [
# Site cabinets and shelters
('cell-site-cabinet','Cell site cabinet','Outdoor base-station cabinet with raised roof, split access doors, plinth and vent banks.','#71818a',[B('cabinet',0,0,90,900,620,1450),B('roof',0,0,1540,960,680,70),B('left-door',-220,-318,120,420,18,1180),B('right-door',220,-318,120,420,18,1180),B('vent-1',0,-331,330,180,16,80),B('vent-2',0,-331,480,180,16,80),B('plinth',0,0,30,940,660,60)]),
('battery-backup-cabinet','Battery backup cabinet','Compact backup-power enclosure with double front doors, cable entry hood and bottom plinth.','#586b73',[B('body',0,0,100,1100,720,1150),B('top',0,0,1285,1150,770,70),B('door-left',-275,-370,120,520,22,980),B('door-right',275,-370,120,520,22,980),B('intake',0,-388,320,160,14,90),B('plinth',0,0,30,1140,760,60)]),
('fiber-distribution-cabinet','Fiber distribution cabinet','Street-side fiber distribution cabinet with hinged-looking front, lock and cable plinth.','#6b8077',[B('body',0,0,70,620,430,920),B('hood',0,0,1010,670,480,60),B('door',0,-222,90,540,16,760),C('lock',195,-238,600,28,18),B('lower-skirt',0,0,25,660,470,50)]),
('outdoor-network-cabinet','Outdoor network cabinet','Tall weatherproof network enclosure with sloped rain cap, side louvers and raised feet.','#77838a',[B('body',0,0,100,780,600,1500),B('cap',0,0,1640,860,680,100),B('side-louver-a',-402,0,560,18,300,260),B('side-louver-b',-402,0,880,18,300,260),B('door',0,-308,130,650,18,1280),B('foot-left',-290,0,25,100,120,50),B('foot-right',290,0,25,100,120,50)]),
('telecom-equipment-shelter','Telecom equipment shelter','Small site shelter with two access doors, vent panels, corner posts and a broad roof.','#6a7779',[B('floor',0,0,45,2600,2100,90),B('rear',0,1000,1270,2500,70,2380),B('left',-1215,0,1270,70,2000,2380),B('right',1215,0,1270,70,2000,2380),B('roof',0,0,2490,2750,2250,130),B('door-a',-500,-1040,160,800,24,2050),B('door-b',500,-1040,160,800,24,2050)]),
('pole-mount-radio-cabinet','Pole mount radio cabinet','Compact pole-mounted radio enclosure with strap brackets, lid and front service panel.','#6d7b82',[B('box',0,0,90,540,360,780),B('lid',0,0,510,580,400,60),B('panel',0,-190,100,420,18,580),B('strap-upper',0,210,350,620,46,60),B('strap-lower',0,210,180,620,46,60),C('lock',160,-214,310,24,16)]),
('rooftop-network-cabinet','Rooftop network cabinet','Low rooftop radio cabinet with raised curb, hinged lid and side ventilation slots.','#7b837d',[B('curb',0,0,30,1250,850,60),B('body',0,0,390,1150,750,660),B('lid',0,0,750,1210,810,60),B('front-panel',0,-383,400,860,18,500),B('vent-left',-350,-397,400,130,12,210),B('vent-right',350,-397,400,130,12,210)]),
('microwave-backhaul-shelter','Microwave backhaul shelter','Narrow field shelter for radio backhaul equipment with door, roof lip and wall vents.','#596a72',[B('base',0,0,35,1600,1250,70),B('shell',0,0,1120,1500,1150,2100),B('roof',0,0,2200,1680,1320,100),B('door',0,-581,180,650,20,1700),B('vent',520,-592,1400,280,18,190),B('step',0,-700,50,780,260,100)]),
# Masts and supports
('rooftop-tripod-mast','Rooftop tripod mast','Short rooftop antenna mast on three splayed legs with a round base plate and collar.','#626c70',[C('base',0,0,0,35,270),C('mast',0,0,35,1300,42),B('leg-front',0,-90,25,36,180,780),B('leg-left',-100,70,25,36,180,780),B('leg-right',100,70,25,36,180,780),C('collar',0,0,870,42,65)]),
('monopole-mast','Monopole antenna mast','Freestanding tapered-looking monopole with base flange, access rung strip and top mounting plate.','#7b8487',[C('base',0,0,0,50,240),C('shaft-lower',0,0,50,950,92),C('shaft-upper',0,0,1000,1050,68),B('access-strip',85,0,450,18,22,800),C('top-plate',0,0,2050,30,130)]),
('lattice-mast-section','Lattice mast section','Square lattice mast segment with four corner legs, diagonal braces and end flanges.','#70797c',[B('leg-a',-220,-220,35,42,42,1100),B('leg-b',220,-220,35,42,42,1100),B('leg-c',-220,220,35,42,42,1100),B('leg-d',220,220,35,42,42,1100),B('cross-x1',0,-220,300,480,38,38),B('cross-x2',0,220,300,480,38,38),B('brace-a',-115,-220,510,30,30,700),B('flange',0,0,0,560,560,45)]),
('guy-wire-mast-anchor','Guyed mast anchor set','Three-point guy-wire anchor layout with a central mast stub and ground cleat blocks.','#747b70',[C('mast',0,0,0,820,45),C('base',0,0,0,32,180),B('anchor-a',-660,-380,15,180,180,30),B('anchor-b',660,-380,15,180,180,30),B('anchor-c',0,760,15,180,180,30),B('guy-a',-330,-190,420,22,22,650),B('guy-b',330,-190,420,22,22,650),B('guy-c',0,380,420,22,22,650)]),
('mast-extension-section','Mast extension section','Tubular mast extension with overlap sleeve, cap plate and paired mounting tabs.','#737c80',[C('tube',0,0,0,1150,48),C('sleeve',0,0,0,240,67),C('cap',0,0,1130,35,70),B('tab-left',-80,0,300,28,90,150),B('tab-right',80,0,300,28,90,150)]),
('parapet-mast-clamp','Parapet mast clamp','Parapet clamp frame with twin jaws, vertical mast socket and tightening blocks.','#73797a',[B('base',0,0,30,500,320,60),B('jaw-left',-220,0,230,60,300,400),B('jaw-right',220,0,230,60,300,400),C('socket',0,0,60,500,82),B('cross-bolt',0,0,400,450,45,45),B('pad-left',-220,0,10,120,340,20),B('pad-right',220,0,10,120,340,20)]),
('wall-mast-bracket','Wall mast stand-off bracket','Wall stand-off bracket with backplate, two arms, mast clamps and bolt heads.','#687278',[B('backplate',0,0,450,300,60,900),B('arm-upper',0,-220,780,90,460,80),B('arm-lower',0,-220,350,90,460,80),C('clamp-upper',0,-220,800,100,85),C('clamp-lower',0,-220,370,100,85),B('gusset-a',0,-90,610,40,300,330),B('gusset-b',0,-90,390,40,300,330)]),
('mast-outrigger-frame','Mast outrigger frame','Rooftop outrigger frame with two ballast rails, cross members and a central mast socket.','#657179',[B('rail-left',-460,0,35,100,1700,70),B('rail-right',460,0,35,100,1700,70),B('cross-front',0,-720,90,1020,100,100),B('cross-rear',0,720,90,1020,100,100),C('socket',0,0,100,430,88),B('brace-left',-230,0,230,40,120,350),B('brace-right',230,0,230,40,120,350)]),
('antenna-sector-frame','Sector antenna frame','Triangular sector panel support frame with three vertical rails and top and bottom braces.','#677177',[B('rail-a',-190,0,40,36,65,1100),B('rail-b',0,0,40,36,65,1100),B('rail-c',190,0,40,36,65,1100),B('top',0,0,1130,500,100,60),B('bottom',0,0,45,500,100,60),B('mount-arm',0,170,500,65,400,65),B('clamp',0,380,500,180,70,80)]),
# Antennas and radio equipment
('sector-panel-antenna','Sector panel antenna','Slim panel antenna with shallow radome, rear mounting rail and connector block.','#e2e4dc',[B('radome',0,0,620,260,130,1240),B('top-cap',0,0,1260,270,145,40),B('bottom-cap',0,0,0,270,145,40),B('rear-rail',0,78,600,55,44,1120),B('connector',0,110,80,150,75,90)]),
('dual-sector-panel-array','Dual sector panel array','Pair of side-by-side sector panels on a shared rear rail with clamp brackets.','#d9ddd7',[B('panel-left',-180,0,600,280,120,1200),B('panel-right',180,0,600,280,120,1200),B('back-rail',0,75,600,44,50,1320),B('clamp-upper',0,220,930,400,42,60),B('clamp-lower',0,220,330,400,42,60),B('connector-left',-180,-68,80,80,25,90),B('connector-right',180,-68,80,80,25,90)]),
('microwave-dish-antenna','Microwave dish antenna','Compact parabolic-looking dish on an offset bracket with feed arm and rear mount.','#cfd5d6',[C('dish-rim',0,0,430,80,420),B('dish-face',0,-18,470,720,35,720),B('feed-arm',0,-270,480,55,430,55),C('feed',0,-475,450,130,72),B('mount-post',0,120,80,80,100,500),B('base',0,120,35,320,280,70)]),
('yagi-radio-antenna','Yagi radio antenna','Directional Yagi antenna with a boom, reflector and four short director elements.','#7b8483',[B('boom',0,0,500,1050,42,42),B('reflector',-440,0,300,35,42,420),B('driven',-150,0,250,35,42,360),B('director-a',160,0,320,30,38,250),B('director-b',390,0,360,30,38,180),C('mast-clamp',0,0,420,85,68)]),
('omnidirectional-whip-antenna','Omnidirectional whip antenna','Short omnidirectional whip aerial with base puck and stepped connector collar.','#454c50',[C('base',0,0,0,45,95),C('collar',0,0,45,50,65),C('whip',0,0,95,950,20),C('tip',0,0,1045,30,26)]),
('gnss-timing-antenna','GNSS timing antenna','Compact timing antenna puck on a short pole with a broad weather cap.','#dedfd5',[C('base',0,0,0,55,100),C('pole',0,0,55,300,24),C('puck',0,0,355,100,145),C('cap',0,0,455,35,155)]),
('remote-radio-unit','Remote radio unit','Outdoor radio unit with finned body, upper mounting ears and two lower connectors.','#777d7c',[B('body',0,0,420,340,220,820),B('top-ear-left',-130,0,850,80,260,80),B('top-ear-right',130,0,850,80,260,80),B('fin-a',-220,0,400,30,180,700),B('fin-b',220,0,400,30,180,700),C('connector-a',-80,-125,30,80,32),C('connector-b',80,-125,30,80,32)]),
('radome-cylinder','Cylindrical antenna radome','Smooth cylindrical radome with rounded-looking cap rings and a narrow mounting foot.','#d8dad4',[C('foot',0,0,0,80,120),C('shell',0,0,80,1050,110),C('cap',0,0,1130,60,118),C('collar',0,0,150,36,116)]),
('rooftop-microwave-dish','Rooftop microwave dish','Medium rooftop microwave dish with upright post, offset arm and compact feed horn.','#c7cdcf',[C('dish-rim',0,0,750,70,360),B('dish',0,-20,790,620,30,620),B('arm',0,-240,710,45,400,45),C('feed-horn',0,-430,690,115,68),C('post',0,80,0,720,45),B('foot',0,80,25,280,260,50)]),
# Fiber distribution and closure equipment
('fiber-terminal-box','Fiber terminal box','Wall-mounted fiber terminal enclosure with weather hood, door seam and cable glands.','#89927e',[B('body',0,0,210,460,170,420),B('hood',0,0,440,500,210,45),B('door',0,-90,225,390,16,340),C('gland-left',-130,0,0,75,25),C('gland-right',130,0,0,75,25),C('latch',150,-108,270,24,14)]),
('fiber-splice-closure','Fiber splice closure','Inline fiber splice closure with tapered ends, raised center lid and two cable ports.','#667a60',[C('shell',0,0,80,460,145),C('lid',0,0,505,40,155),C('port-left',0,-160,230,90,62),C('port-right',0,160,230,90,62),B('mount-foot-left',-120,0,20,90,300,40),B('mount-foot-right',120,0,20,90,300,40)]),
('fiber-dome-closure','Fiber dome closure','Vertical dome splice enclosure with a domed-looking cap, lower collar and four cable ports.','#68785d',[C('base',0,0,0,90,170),C('body',0,0,90,560,140),C('dome',0,0,650,140,155),C('port-a',-105,-105,20,80,42),C('port-b',105,-105,20,80,42),C('port-c',-105,105,20,80,42),C('port-d',105,105,20,80,42)]),
('pedestal-fiber-terminal','Pedestal fiber terminal','Slim ground pedestal with removable cap, service door and two conduit entries.','#707d72',[B('base',0,0,25,430,360,50),B('pedestal',0,0,390,350,280,730),B('cap',0,0,780,400,330,50),B('door',0,-145,390,240,18,520),C('conduit-a',-100,0,0,220,34),C('conduit-b',100,0,0,220,34)]),
('fiber-drop-terminal','Fiber drop terminal','Small multiport drop terminal with six connector caps and a shallow rain hood.','#8b927e',[B('case',0,0,110,430,180,220),B('hood',0,0,245,470,220,45),B('face',0,-96,130,370,14,150),*[C(f'port-{i}',-135+i*54,-110,38,45,18) for i in range(6)]]),
('fiber-handhole-cover','Fiber handhole cover','Rectangular fiber handhole lid with raised rim, lift slots and a small network marker.','#747873',[B('rim',0,0,25,900,600,50),B('lid',0,0,65,820,520,40),B('slot-left',-280,-5,90,110,38,16),B('slot-right',280,-5,90,110,38,16),B('marker',0,0,95,150,95,18)]),
('optical-patch-panel','Optical patch panel','Rack-width optical patch panel with two connector rows and rack ears.','#555e61',[B('panel',0,0,120,480,180,240),B('ear-left',-270,0,120,60,190,280),B('ear-right',270,0,120,60,190,280),*[C(f'port-{row}-{i}',-170+i*68,-96,50+row*120,38,17) for row in range(2) for i in range(5)]]),
('fiber-coil-reel','Fiber slack storage reel','Compact fiber slack reel with twin flanges, center hub and four cross spokes.','#687c65',[C('flange-front',0,-100,100,30,250),C('flange-back',0,100,100,30,250),C('hub',0,0,100,220,78),*[B(f'spoke-{i}',0,0,100,34,190,24) for i in range(4)]]),
('fiber-service-loop-rack','Fiber service loop rack','Wall rack for fiber service loops with four broad retaining fingers and a backplate.','#626e62',[B('backplate',0,0,300,400,45,600),C('loop-left',0,-170,100,40,190),C('loop-right',0,170,100,40,190),*[B(f'finger-{i}',0,-220+i*145,320,80,100,480) for i in range(4)]]),
# Cable routes, trays and penetrations
('cable-ladder-section','Cable ladder section','Straight cable ladder tray with twin rails and six evenly spaced rungs.','#747c7e',[B('rail-left',0,-230,40,1500,45,70),B('rail-right',0,230,40,1500,45,70),*[B(f'rung-{i}',-600+i*240,0,40,45,500,45) for i in range(6)]]),
('cable-tray-elbow','Cable tray elbow','Right-angle cable tray elbow with raised side rails and corner floor panels.','#747c7e',[B('run-a',-280,0,30,940,320,50),B('run-b',280,280,30,320,940,50),B('rail-a1',-280,-165,80,940,35,100),B('rail-a2',-280,165,80,940,35,100),B('rail-b1',115,280,80,35,940,100),B('rail-b2',445,280,80,35,940,100)]),
('conduit-riser-frame','Conduit riser frame','Wall-mounted riser frame with three vertical conduits, stand-off brackets and top bridge.','#707b7e',[*[C(f'conduit-{i}',-210+i*210,0,0,1300,40) for i in range(3)],B('bridge-top',0,90,1140,620,120,70),B('bridge-bottom',0,90,250,620,120,70),B('stand-off-a',0,80,530,700,55,55),B('stand-off-b',0,80,950,700,55,55)]),
('waveguide-bridge','Waveguide bridge tray','Raised rooftop waveguide bridge with two support frames and a broad crossing tray.','#70777a',[B('tray',0,0,550,1800,420,65),B('rail-left',0,-215,630,1800,30,95),B('rail-right',0,215,630,1800,30,95),*[B(f'leg-{x}-{y}',x,y,30,65,65,500) for x in (-700,700) for y in (-155,155)],B('cross-a',-700,0,100,60,420,90),B('cross-b',700,0,100,60,420,90)]),
('cable-entry-gland-plate','Cable entry gland plate','Rectangular entry plate with four raised cable glands and corner bolt heads.','#6c7273',[B('plate',0,0,25,680,420,50),*[C(f'gland-{i}',-230+i*150,0,50,120,48) for i in range(4)],*[C(f'bolt-{x}-{y}',x,y,50,18,16) for x in (-290,290) for y in (-160,160)]]),
('roof-penetration-seal','Roof cable penetration seal','Low roof cable penetration boot with a rectangular base, collar and capped conduit.','#555c5a',[B('base',0,0,25,420,360,50),C('boot',0,0,50,160,145),C('collar',0,0,210,55,115),C('conduit',0,0,265,420,52),C('cap',0,0,685,35,70)]),
('cable-splice-pit-frame','Cable splice pit frame','Square access pit frame with thick rim, inset lid and paired lifting recesses.','#717571',[B('outer-rim',0,0,35,850,850,70),B('lid',0,0,80,700,700,35),B('slot-left',-210,0,105,90,36,14),B('slot-right',210,0,105,90,36,14),B('inner-lip',0,0,105,620,620,18)]),
('cable-support-hanger','Cable support hanger','Two-hole wall plate with a projecting U-shaped cable support and end lips.','#6b7478',[B('backplate',0,0,330,360,45,660),B('arm-left',-170,-190,330,40,380,40),B('arm-right',170,-190,330,40,380,40),B('crossbar',0,-380,330,380,40,40),B('lip-left',-170,-360,380,40,40,100),B('lip-right',170,-360,380,40,40,100)]),
('split-cable-duct','Split cable duct','Low split-duct cable cover with two channel shells and a bridging lid strip.','#8a866e',[B('base-a',-145,0,25,260,480,50),B('base-b',145,0,25,260,480,50),B('lid-a',-145,0,80,260,480,45),B('lid-b',145,0,80,260,480,45),B('center-join',0,0,80,28,500,55)]),
# Power, bonding and site identification
('telecom-warning-sign','Telecom warning sign','Site warning placard on two short posts with a broad rectangular sign panel.','#d6a848',[B('panel',0,0,950,800,45,600),*[B(f'post-{x}',x,0,30,55,55,900) for x in (-300,300)],B('foot-left',-300,0,20,180,180,40),B('foot-right',300,0,20,180,180,40)]),
('rf-hazard-marker','RF hazard marker','Compact RF exposure marker on a post with a raised diamond-like center plate.','#d3aa37',[B('post',0,0,25,55,55,800),B('plate',0,0,690,450,40,360),B('center',0,-26,690,250,18,200),B('foot',0,0,25,200,200,50)]),
('site-id-placard','Site identification placard','Small site identification plate with a raised frame, two posts and bolted feet.','#63737c',[B('plate',0,0,720,760,40,380),B('inset',0,-24,720,650,14,270),*[B(f'post-{x}',x,0,30,42,42,620) for x in (-280,280)],*[C(f'bolt-{x}',x,-30,810,18,15) for x in (-320,320)]]),
('grounding-bar','Grounding busbar','Wall-mounted bonding bar with a thick base rail and six rounded-looking terminal posts.','#b17c38',[B('rail',0,0,130,850,95,90),B('insulator-left',-350,0,45,100,130,90),B('insulator-right',350,0,45,100,130,90),*[C(f'terminal-{i}',-300+i*120,0,175,90,24) for i in range(6)]]),
('grounding-rod-kit','Grounding rod set','Three vertical grounding rods with top clamps and a short bonding strap.','#8b7655',[*[C(f'rod-{i}',-300+i*300,0,0,1200,24) for i in range(3)],*[C(f'clamp-{i}',-300+i*300,0,1050,55,42) for i in range(3)],B('bonding-bar',0,0,1125,760,45,45)]),
('lightning-air-terminal','Lightning protection air terminal','Tapered-looking lightning rod on a broad rooftop base plate with a collar.','#737b80',[B('base',0,0,25,360,360,50),C('mast',0,0,50,850,35),C('collar',0,0,870,55,58),C('tip',0,0,925,240,14)]),
('surge-protector-enclosure','Surge protection enclosure','Compact surge protection box with a front cover, conduit entry and top cap.','#7b817b',[B('body',0,0,190,390,210,380),B('lid',0,-112,195,350,18,330),B('cap',0,0,400,420,240,45),C('conduit',0,0,0,180,40),C('latch',125,-130,240,24,15)]),
('equipment-fan-panel','Equipment fan panel','Ventilation panel with twin circular fan shrouds and four mounting tabs.','#687277',[B('panel',0,0,350,780,90,700),C('fan-a',-190,-55,180,300,145),C('fan-b',190,-55,180,300,145),*[B(f'tab-{i}',x,y,340,90,90,45) for i,(x,y) in enumerate([(-360,-70),(360,-70),(-360,70),(360,70)])]]),
('remote-power-shelf','Remote power shelf','Rack power shelf with two module faces, handles and a raised top lip.','#626b70',[B('shelf',0,0,170,680,360,340),B('top',0,0,360,700,380,40),B('module-left',-160,-188,185,280,18,220),B('module-right',160,-188,185,280,18,220),B('handle-left',-220,-220,185,45,30,130),B('handle-right',220,-220,185,45,30,130)]),
('weatherproof-junction-box','Weatherproof junction box','Small sealed junction box with screw-down lid, raised lip and three cable entries.','#8a9085',[B('base',0,0,75,340,240,150),B('lid',0,0,175,360,260,45),*[C(f'entry-{i}',-110+i*110,0,0,95,28) for i in range(3)],*[C(f'screw-{x}-{y}',x,y,200,18,12) for x in (-145,145) for y in (-95,95)]]),
('fiber-route-marker','Fiber route marker','Low ground route marker with tapered post, broad cap and square footing.','#d5b242',[B('foot',0,0,25,250,250,50),B('post',0,0,245,95,95,390),B('cap',0,0,470,210,210,60),B('face',0,-54,260,55,18,180)]),
('telecom-cable-marker-post','Telecom cable marker post','Narrow marker post with a ribbed cap, tag plate and buried-end indicator band.','#cb9e38',[B('post',0,0,300,80,80,600),B('cap',0,0,630,120,120,60),B('tag',0,-50,410,110,22,120),B('band',0,0,140,100,100,35),B('foot',0,0,20,190,190,40)]),
]

if len(ASSETS) != 56:
    raise SystemExit(f'expected 56 assets, got {len(ASSETS)}')


def render_asset(asset):
    asset_id, title, description, color, parts = asset
    uses_box = any(part[0] == 'b' for part in parts)
    uses_cylinder = any(part[0] == 'c' for part in parts)
    min_z = min(part[4] for part in parts)
    lines = [
        '// SPDX-License-Identifier: CC0-1.0',
        '// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.',
        '', 'meta({', f'  name: {json.dumps(asset_id)},', "  license: 'CC0-1.0',",
        f'  title: {json.dumps(title)},',
        f'  description: {json.dumps(description + " Knobs: overall scale and asset color.")},',
        "  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],",
        f"  kit: '{KIT_ID}',", "  category: 'prop',", "  origin: 'base',",
        "  compat: ['telecom', 'network', 'infrastructure', 'industrial'],", '  triangleBudget: 2200,', '});', '',
        "const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });",
        f"const color = param('color', {json.dumps(color)}, {{ label: 'Asset color' }});",
    ]
    if uses_box:
        lines.append('const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);')
    if uses_cylinder:
        lines.append('const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);')
    lines += ['', f'const p = assembly({json.dumps(asset_id)});']
    for part in parts:
        if part[0] == 'b':
            _, name, x, y, z, w, d, h = part
            lines.append(f'p.part({json.dumps(name)}, b({x}, {y}, {z - min_z}, {w}, {d}, {h}).color(color));')
        else:
            _, name, x, y, z, h, r, sides = part
            lines.append(f'p.part({json.dumps(name)}, c({x}, {y}, {z - min_z}, {h}, {r}, {sides}).color(color));')
    lines += ['', 'return p.model();', '']
    return '\n'.join(lines)

for asset in ASSETS:
    (KIT / f'{asset[0]}.kcad.ts').write_text(render_asset(asset))
(KIT / 'kit.json').write_text(json.dumps({'title':'Telecom infrastructure','description':'Original low-poly communications-site, rooftop, radio and fiber-network equipment props with editable scale and color controls.'}, indent=2) + '\n')
print(f'generated {len(ASSETS)} telecom assets')
