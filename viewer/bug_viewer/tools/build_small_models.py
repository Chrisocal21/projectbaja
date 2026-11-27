"""Build the small workshop GLBs. Run with Python, numpy and trimesh from any directory."""
from pathlib import Path
import math
import numpy as np
import trimesh as tm
from trimesh.visual.material import PBRMaterial

OUT = Path(__file__).resolve().parents[1] / 'public/models'
iron, alloy, bright, rust = '#51595a', '#9ba5a4', '#c4c6bc', '#915639'
rubber, red, blue, green = '#292c2d', '#aa4437', '#406680', '#616d49'
wood, pine, end, kraft = '#aa8055', '#c29a69', '#856243', '#b38d60'
cream, gold = '#e2d6b6', '#bb954e'
parts = {}


def put(mesh, name, color, at, rot=(0, 0, 0)):
    mesh.apply_transform(tm.transformations.euler_matrix(*rot))
    mesh.apply_translation(at)
    parts.setdefault((name, color), []).append(mesh)


def box(name, color, at, size, rot=(0, 0, 0)):
    put(tm.creation.box(size), name, color, at, rot)


def cyl(name, color, at, radius, height, sides=20, axis='y'):
    rot = {'x': (0, math.pi/2, 0), 'y': (-math.pi/2, 0, 0), 'z': (0, 0, 0)}[axis]
    put(tm.creation.cylinder(radius, height, sections=sides), name, color, at, rot)


def ring(name, color, at, outer, inner, height, sides=24, axis='y'):
    rot = {'x': (0, math.pi/2, 0), 'y': (-math.pi/2, 0, 0), 'z': (0, 0, 0)}[axis]
    put(tm.creation.annulus(inner, outer, height, sections=sides), name, color, at, rot)


def rod(name, color, points, radius, sides=12):
    for a, b in zip(points, points[1:]):
        mesh = tm.creation.cylinder(radius, sections=sides, segment=[a,b])
        put(mesh, name, color, (0,0,0))


def panels(name, color, yz, width):
    # Convex cross-section in side elevation, extruded along x.
    vertices = [(x,y,z) for x in [-width/2,width/2] for y,z in yz]
    put(tm.convex.convex_hull(vertices), name, color, (0,0,0))


def save(file, grip=None):
    scene = tm.Scene(base_frame='World')
    for (name,color), meshes in parts.items():
        metallic = .62 if color in (iron, alloy, bright, gold) else .18 if color in (red,blue,green,rust) else 0
        rgb = np.array(list(bytes.fromhex(color[1:]))) / 255
        linear = np.where(rgb <= .04045, rgb/12.92, ((rgb+.055)/1.055)**2.4)
        mat = PBRMaterial(name=name, baseColorFactor=[*np.round(linear*255).astype(int),255],
                          metallicFactor=metallic, roughnessFactor=.45 if metallic else .82)
        mesh = tm.util.concatenate(meshes)
        mesh.visual = tm.visual.TextureVisuals(material=mat)
        scene.add_geometry(mesh, node_name=name, geom_name=name)
    lo, hi = scene.bounds
    scene.apply_translation([-(lo[0]+hi[0])/2,-lo[1],-(lo[2]+hi[2])/2])
    if grip is not None:
        centre = [(lo[0]+hi[0])/2, lo[1], (lo[2]+hi[2])/2]
        scene.metadata['grip'] = (np.asarray(grip) - centre).tolist()
    scene.export(OUT / (file+'.glb'))
    parts.clear()


def drum(color):
    cyl('Shell',color,(0,.43,0),.285,.85,40)
    for y in [.015,.295,.57,.85]:
        ring('RolledHoops',iron if y in [.015,.85] else color,(0,y,0),.299,.281,.019,40)
    cyl('Stripe',cream,(0,.47,0),.286,.065,40)
    for x,r in [(-.15,.032),(.165,.018)]:
        cyl('Bungs',alloy,(x,.862,.034),r,.017,8)
        box('BungSlots',iron,(x,.872,.034),(r,.002,.005))
    for i in range(14):
        a = i*2.4
        box('FootScuffs',rust,(.284*math.sin(a),.031+i%3*.007,.284*math.cos(a)),
            (.025+i%4*.01,.013,.003),(0,a,0))

for color, suffix in [(blue,'Blue'),(green,'Green')]:
    drum(color)
    save('JUNK_Drum'+suffix)

panels('StampedTank',red,[(0,-.16),(0,.16),(.31,.16),(.39,.095),(.36,-.145),(.31,-.16)],.16)
for x in [-.082,.082]:
    for direction in [-1,1]:
        rod('PressedRibs','#8b372d',[(x,.07,-direction*.112),(x,.18,0),(x,.3,direction*.112)],.008)
for x in [-.045,0,.045]:
    rod('Handles',red,[(x,.35,-.13),(x,.43,-.105),(x,.44,.045),(x,.38,.071)],.012)
cyl('FillerCap',iron,(0,.38,.12),.033,.027,12)
save('JUNK_JerryCan')

def crate():
    for i in range(4):
        y=.071+i*.113
        for z in [-.29,.29]: box('FacePlanks'+str(i%2),[wood,pine][i%2],(0,y,z),(.60,.104,.024))
        for x in [-.287,.287]: box('EndPlanks',end,(x,y,0),(.023,.104,.557))
    for x in [-.261,.261]:
        for z in [-.259,.259]: box('CornerPosts',end,(x,.237,z),(.047,.474,.047))
    box('Floor',wood,(0,.012,0),(.572,.024,.57))
    for i in range(5): box('Lid',pine,((i-2)*.119,.48,0),(.115,.023,.59))
    for z in [-.205,.205]:
        box('Lid',pine,(0,.502,z),(.59,.021,.053))
        for x in [-.237,-.119,0,.119,.237]: cyl('LidNails',iron,(x,.514,z),.005,.003,8)
crate()
save('JUNK_Crate')

box('Sump',iron,(0,.075,0),(.48,.15,.26))
box('Casting',rust,(0,.235,0),(.54,.19,.32))
for i in range(4):
    x=(i-1.5)*.13
    ring('Deck',alloy,(x,.339,0),.084,.052,.021,24)
    cyl('Bores',rubber,(x,.332,0),.051,.003)
    for z in [-.14,.14]: cyl('HeadStuds',iron,(x,.344,z),.009,.034)
    for z in [-.163,.163]: cyl('CorePlugs',gold,(x,.23,z),.032,.008,14,'z')
cyl('FlywheelFlange',iron,(-.28,.16,0),.16,.028,24,'x')
cyl('Pulley',iron,(.292,.135,0),.076,.045,20,'x')
save('JUNK_EngineBlock')

# Quantity-dependent materials are separate named pieces so one GLB serves each stack size.
for i in range(3):
    box('Plank'+str(i+1),[wood,pine,end][i],(0,.023+i*.047,i*.014),(.141,.046,1.27-i*.018))
save('MAT_Planks')
for i in range(4):
    x,y=(i%2)*.053,(i//2)*.053
    name='Tube'+str(i+1)
    for dx in [-.023,.023]: box(name,alloy,(x+dx,y+.025,0),(.004,.05,1.10))
    for dy in [.002,.048]: box(name,alloy,(x,y+dy,0),(.042,.004,1.10))
save('MAT_SquareTube')
box('Plate',rust,(0,.01,0),(.36,.018,.27),(0,.20,0))
rod('BentRebar',iron,[(-.31,.034,.07),(-.12,.034,.09),(.19,.039,-.12),(.29,.039,-.1)],.016)
box('AngleWeb',alloy,(0,.062,.016),(.58,.053,.007),(0,-.25,0))
box('AngleFlange',alloy,(0,.04,.036),(.58,.008,.046),(0,-.25,0))
save('MAT_Scrap')

def tray(name, color, w,h,d,t):
    box(name,color,(0,t/2,0),(w,t,d))
    for z in [-1,1]: box(name,color,(0,h/2,z*(d-t)/2),(w,h,t))
    for x in [-1,1]: box(name,color,(x*(w-t)/2,h/2,0),(t,h,d-2*t))
tray('Bin',kraft,.24,.085,.16,.008)
for i in range(8):
    x,z=(i%4-1.5)*.047,(i//4-.5)*.064
    cyl('HexHeads',alloy,(x,.071,z+.019),.014,.012,6,'z')
    cyl('Shanks',iron,(x,.071,z-.002),.007,.032,12,'z')
    ring('Nuts',bright,(x+.012,.063,z-.021),.012,.005,.009,6)
save('MAT_Fasteners')

def carton():
    tray('Walls',kraft,.55,.40,.50,.009)
    for side,name in [(-1,'LeftFlap'),(1,'RightFlap')]:
        box(name,end,(side*.139,.404,0),(.271,.008,.50))
carton()
save('PROP_Carton')
tray('Case',red,.56,.22,.26,.012)
box('Lid',red,(0,.244,0),(.565,.048,.263))
rod('Handle',rubber,[(-.085,.268,0),(-.085,.31,0),(.085,.31,0),(.085,.268,0)],.013)
for x in [-.18,.18]: box('Latches',alloy,(x,.212,.135),(.036,.049,.011))
save('PROP_Toolbox')
for x in [-.35,.35]: box('Cabinet',iron,(x,.485,-.014),(.02,.97,.47))
for y in [.014,.956]: box('Cabinet',iron,(0,y,-.014),(.70,.028,.47))
box('Back',iron,(0,.485,-.241),(.70,.95,.018))
for i in range(4):
    y=.18+i*.214
    name='UpperDrawer' if i==3 else 'Drawers'
    box(name,red,(0,y,.213),(.67,.193,.055))
    box('UpperPull' if i==3 else 'Pulls',alloy,(0,y+.05,.248),(.50,.022,.022))
box('DrawerTray',iron,(0,.743,-.012),(.647,.022,.452))
save('PROP_Drawers')

# Engine parts and service supplies.
def belt(file):
    # Narrow V-belt laid flat in an oval loop.
    mesh=tm.creation.annulus(.094,.105,.014,sections=40)
    mesh.apply_scale([1.55,1,1])
    put(mesh,'Belt',rubber,(0,0,0),(-math.pi/2,0,0))
    save(file)
belt('ENG_FanBelt')
for y in [.015,.082]: cyl('PressedLids',iron,(0,y,0),.12,.016,32)
cyl('FilterPaper',kraft,(0,.05,0),.111,.054,40)
for i in range(32):
    a=i*math.tau/32
    box('Pleats',cream,(.11*math.sin(a),.049,.11*math.cos(a)),(.004,.048,.004),(0,a,0))
cyl('WingNut',bright,(0,.096,0),.012,.013,6)
save('ENG_AirCleaner')
box('FloatBowl',alloy,(.032,.06,0),(.088,.071,.075))
box('BaseFlange',iron,(0,.012,0),(.138,.023,.09))
ring('Venturi',alloy,(-.024,.083,0),.039,.028,.11)
rod('FuelInlet',gold,[(.064,.08,0),(.088,.09,0),(.1,.09,0)],.008)
save('ENG_Carburetor')
for file,body,r,h in [('IgnitionCoil',rubber,.035,.101),('Distributor',rust,.047,.085),('OilFilter',blue,.047,.091)]:
    cyl('Housing',body,(0,h/2,0),r,h)
    cyl('Crimp',alloy,(0,.007,0),r+.002,.009)
    if file=='OilFilter':
        ring('Seal',rubber,(0,h+.003,0),r*.83,r*.65,.006)
        ring('Thread',alloy,(0,h+.004,0),.012,.006,.008)
    else:
        cyl('Tower',rubber,(0,h+.015,0),.015,.032)
        n=4 if file=='Distributor' else 2
        for i in range(n):
            a=i*math.tau/n
            cyl('Terminals',rubber if n==4 else gold,(r*.68*math.cos(a),h+.011,r*.68*math.sin(a)),.008,.025)
    save('ENG_'+file)
for i in range(4):
    x=(i-1.5)*.027
    cyl('Threads',alloy,(x,.012,0),.006,.024)
    cyl('Hex',bright,(x,.028,0),.01,.012,6)
    cyl('Ceramic',cream,(x,.049,0),.007,.031)
    for y in [.042,.048,.054]: cyl('InsulatorRibs',cream,(x,y,0),.0085,.003)
    cyl('Tips',iron,(x,.071,0),.004,.014)
save('ENG_SparkPlugs')
for file in ['Alternator','Starter']:
    r=.066 if file=='Alternator' else .047
    cyl('Motor',alloy if file=='Alternator' else iron,(0,r,0),r,.15,24,'x')
    if file=='Alternator':
        for i in range(14):
            a=i*math.tau/14
            box('VentSlots',iron,(.014,r+.065*math.cos(a),.065*math.sin(a)),(.06,.004,.012),(a,0,0))
        for x in [.084,.10]: cyl('Pulley',iron,(x,r,0),.043,.01,20,'x')
    else:
        cyl('Solenoid',alloy,(0,.117,0),.027,.10,16,'x')
        cyl('Pinion',bright,(.087,r,0),.024,.031,10,'x')
    for x in [-.06,.06]: box('Mounts',alloy,(x,.016,0),(.024,.027,2*r+.02))
    save('ENG_'+file)
for file in ['IntakeManifold','Exhaust','ShockHoops']:
    if file=='IntakeManifold':
        ring('CarbNeck',alloy,(0,.12,0),.03,.021,.066)
        for s in [-1,1]:
            rod('Runners',alloy,[(0,.098,0),(s*.09,.065,0),(s*.21,.066,0),(s*.25,.02,0)],.024)
            box('HeadFlanges',iron,(s*.25,.012,0),(.07,.021,.086))
    elif file=='Exhaust':
        cyl('Silencer',iron,(0,.089,0),.063,.43,20,'x')
        for s in [-1,1]:
            rod('Inlets',rust,[(s*.20,.09,0),(s*.24,.089,-.05),(s*.24,.065,-.12)],.019)
            ring('Tailpipes',alloy,(s*.14,.085,.09),.018,.014,.13,16,'z')
    else:
        for z in [-.065,.065]:
            rod('Hoops',iron,[(-.17,.012,z),(-.12,.22,z),(-.086,.255,z),(.09,.255,z),(.14,.21,z),(.18,.012,z)],.017)
            for x in [-.17,.18]: box('FootPlates',alloy,(x,.009,z),(.072,.018,.071))
    save(('FAB_' if file=='ShockHoops' else 'ENG_')+file)
panels('StampedCover',alloy,[(0,-.068),(0,.068),(.049,.059),(.075,.037),(.075,-.037),(.049,-.059)],.33)
for x in [-.10,0,.10]: box('Stiffeners',iron,(x,.076,0),(.012,.006,.073))
save('ENG_ValveCover')
box('Case',rubber,(0,.105,0),(.30,.21,.18))
box('Lid',iron,(0,.218,0),(.303,.023,.183))
for x,col in [(-.10,red),(.10,rubber)]:
    cyl('Positive' if x<0 else 'Negative',col,(x,.24,.045),.018,.024)
rod('CarryHandle',rubber,[(-.072,.231,0),(-.072,.258,0),(.072,.258,0),(.072,.231,0)],.009)
save('STOCK_Battery')

def jug():
    panels('Bottle',blue,[(0,-.083),(0,.083),(.225,.083),(.266,.04),(.25,-.065),(.212,-.083)],.125)
    rod('MouldedHandle',blue,[(-.045,.221,-.065),(-.045,.287,-.062),(-.045,.287,.014),(-.045,.252,.03)],.014)
    cyl('Cap',gold,(0,.267,.036),.026,.023,16)
    box('Label',cream,(0,.126,.084),(.093,.108,.002))
jug()
save('SUP_Oil')
mesh=tm.creation.icosphere(subdivisions=2,radius=.025)
mesh.apply_scale([1,1.24,1])
put(mesh,'Glass','#d0d4bd',(0,.064,0))
cyl('Base',alloy,(0,.024,0),.019,.036)
for x in [-.01,.01]: box('Contacts',bright,(x,.006,0),(.005,.012,.008))
save('SUP_Bulb')
tray('PatchCase',red,.16,.031,.095,.005)
for x in [-.041,.017]:
    rod('Reamers',alloy,[(x,.018,-.03),(x,.018,.028)],.0025)
    box('Grips',rubber,(x,.019,-.024),(.033,.014,.012))
for x in [.041,.052,.063]: box('Plugs',rust,(x,.014,0),(.006,.007,.065))
save('SUP_PlugKit')
for z in [-.022,.022]:
    rod('SpringArms',iron,[(-.23,.016,z),(-.12,.033,z),(0,.044,z),(.12,.033,z),(.23,.016,z)],.006)
    box('Blades',rubber,(0,.01,z),(.47,.013,.009))
    box('Adapters',rubber,(0,.046,z),(.047,.021,.018))
save('SUP_Wipers')

# Held tools. Preserve a named grip for posing the same asset in first person.
def tool(file,grip):
    # A marker in scene extras survives GLTFLoader and costs no geometry.
    save('TOOL_'+file, grip=grip)

ring('BoxEnd',alloy,(0,.028,0),.028,.017,.011,12,'z')
box('Shank',alloy,(0,.125,0),(.024,.17,.012))
rod('OpenJaw',bright,[(-.036,.252,0),(-.038,.228,0),(-.019,.206,0),(.014,.202,0),(.034,.217,0),(.036,.24,0)],.012,8)
tool('Wrench',(0,.1,0))
box('Chassis',red,(0,.079,0),(.19,.07,.43))
for x in [-.107,.107]:
    for z in [-.15,.15]: cyl('Wheels',rubber,(x,.04,z),.04,.023,16,'x')
rod('LiftArm',iron,[(0,.087,.11),(0,.14,-.12)],.035)
cyl('Saddle',alloy,(0,.155,-.128),.047,.018)
rod('Lever',alloy,[(0,.086,.13),(0,.415,.245)],.011)
rod('Grip',rubber,[(0,.327,.215),(0,.415,.245)],.017)
tool('FloorJack',(0,.37,.228))
for file in ['Grinder','Buffer']:
    cyl('Motor',red,(0,.115,0),.034,.165)
    cyl('Grip',rubber,(0,.039,0),.026,.073)
    for y in [.084,.094,.104]: cyl('VentBands',iron,(0,y,0),.0345,.004)
    box('Gearcase',alloy,(0,.20,0),(.075,.065,.065))
    rod('SideGrip',rubber,[(0,.19,0),(-.095,.186,0)],.014)
    cyl('BackingDisc',iron,(.044,.20,0),.062,.013,28,'x')
    cyl('Abrasive' if file=='Grinder' else 'PolishingPad',rubber if file=='Grinder' else cream,
        (.056,.20,0),.068,.007 if file=='Grinder' else .023,32,'x')
    if file=='Grinder': cyl('SpindleNut',alloy,(.062,.2,0),.013,.008,8,'x')
    tool(file,(0,.065,0))
for file in ['Sprayer','AirChuck']:
    rod('Grip',red,[(0,.018,.03),(0,.115,0)],.021)
    rod('Barrel',alloy,[(0,.124,.022),(0,.13,-.035),(0,.145,-(.15 if file=='Sprayer' else .07))],.013)
    rod('Trigger',iron,[(0,.10,-.016),(0,.074,-.03)],.006)
    cyl('Coupler',gold,(0,.018,.03),.015,.027,8)
    tool(file,(0,.069,.014))
cyl('DialCase',iron,(0,.137,0),.041,.026,28,'z')
cyl('DialFace',cream,(0,.137,.015),.034,.003,28,'z')
for i in range(9):
    a=(i-4)*.53
    box('Ticks',iron,(.028*math.sin(a),.137+.028*math.cos(a),.018),(.002,.006,.001),(0,0,-a))
rod('Needle',red,[(0,.137,.02),(-.013,.154,.02)],.0017)
rod('Stem',alloy,[(0,.018,0),(0,.104,0)],.012)
tool('Gauge',(0,.062,0))
box('Feet',rubber,(0,.012,0),(.19,.024,.105))
cyl('Motor',iron,(0,.067,0),.049,.15,20,'x')
for x in [-.058,-.044,-.03,-.016]: cyl('CoolingFins',alloy,(x,.078,0),.052,.008,20,'x')
rod('Handle',rubber,[(-.06,.08,0),(-.052,.15,0),(.064,.15,0),(.071,.085,0)],.008)
rod('Hose',rubber,[(.077,.084,0),(.10,.052,.015),(.10,.018,.07),(-.068,.018,.073)],.006)
tool('Pump',(0,.15,0))
# Pointed dished shovel blade, socket, ash shaft and D grip.
verts=[(-.12,.27,0),(.12,.27,0),(.115,.13,-.025),(.045,.032,-.05),(0,0,-.055),(-.045,.032,-.05),(-.115,.13,-.025),(0,.17,.023)]
blade=tm.Trimesh(vertices=verts,faces=[(7,i,(i+1)%7) for i in range(7)],process=False)
put(blade,'Blade',iron,(0,0,0))
put(tm.Trimesh(vertices=verts,faces=blade.faces[:,::-1],process=False),'Blade',iron,(0,0,-.002))
rod('Shaft',pine,[(0,.23,.009),(0,.91,.064)],.017)
rod('Socket',alloy,[(0,.18,.006),(0,.36,.019)],.022)
rod('DGrip',rubber,[(0,.90,.064),(-.055,.963,.067),(-.051,1.008,.068),(.051,1.008,.068),(.055,.963,.067),(0,.90,.064)],.013)
tool('Shovel',(0,.71,.047))
for layer in range(2):
    y=layer*.039
    for x in [-.111,0,.111]:
        rod('Rails','#c65a22',[(x,y+.045,-.54),(x,y+.014,-.39),(x,y+.014,.40),(x,y+.045,.54)],.023,8)
    for i in range(13):
        z=(i-6)*.078
        box('CrossRibs','#d6772a',(0,y+.026,z),(.284,.024,.032))
        for x in [-.085,.085]: cyl('Cleats','#dd8638',(x,y+.046,z),.015,.026,4)
tool('TractionBoards',(0,.068,.2))
cyl('PaintBody',cream,(0,.085,0),.032,.16,24)
for y in [.012,.166]: ring('Rims',alloy,(0,y,0),.034,.03,.006)
cyl('Shoulder',alloy,(0,.176,0),.024,.019)
cyl('Nozzle',rubber,(0,.193,0),.010,.018)
tool('SprayCan',(0,.075,0))

# Loose upgrade kits are packed together so their parts fit on a shelf.
for file in ['LIGHT_BumperPods','LIGHT_CubePods','ROOF_RoundLights','LIGHT_RearBar']:
    if file=='LIGHT_RearBar':
        box('Housing',iron,(0,.057,0),(.68,.052,.059))
        box('Lens',red,(0,.057,.031),(.65,.034,.005))
        for x in [-.27,.27]: box('Feet',iron,(x,.021,0),(.035,.041,.048))
    else:
        count=4 if file=='ROOF_RoundLights' else 2
        for i in range(count):
            x=(i-(count-1)/2)*.16
            if file=='LIGHT_CubePods':
                box('Housings',iron,(x,.072,0),(.09,.09,.085))
                box('Lenses',cream,(x,.072,.044),(.075,.075,.005))
            else:
                cyl('Housings',iron,(x,.092,0),.067,.059,24,'z')
                cyl('Lenses',cream,(x,.092,.032),.055,.006,24,'z')
            box('Mounts',alloy,(x,.019,0),(.041,.038,.043))
        if count==4: rod('Crossbar',iron,[(-.26,.014,0),(.26,.014,0)],.014)
    save('KIT_'+file)
for file in ['EMOD_Bore1776','EMOD_Bore2110']:
    for i in range(4):
        x,z=(i%2-.5)*.125,(i//2-.5)*.125
        for j in range(7): ring('CoolingFins',iron,(x,.021+j*.014,z),.061,.043,.007)
        ring('Liners',alloy,(x,.062,z),.05,.043 if file.endswith('1776') else .046,.12)
    save('KIT_'+file)
for file in ['EMOD_DualKadron','EMOD_DualWeber']:
    for x in [-.092,.092]:
        box('FloatBowls',alloy,(x,.048,0),(.108,.086,.084))
        for z in ([-.032,.032] if file.endswith('Weber') else [0]):
            ring('AirHorns',bright,(x,.104,z),.03,.022,.055)
        box('Flanges',iron,(x,.008,0),(.13,.016,.10))
    save('KIT_'+file)
cyl('Coil',blue,(0,.045,0),.039,.09)
cyl('Tower',rubber,(0,.102,0),.013,.028)
box('Module',iron,(.074,.018,0),(.072,.034,.063))
for i in range(2): rod('Leads',red,[(.071,.025,.019),(.098,.016,.06),(.113,.016,.062+i*.01)],.003)
save('KIT_EMOD_Ignition')
panels('Shroud',iron,[(0,-.12),(0,.12),(.16,.117),(.25,.075),(.27,-.048),(.18,-.115)],.48)
box('Cooler',rubber,(.30,.078,0),(.105,.15,.125))
for i in range(7): box('CoolingFins',alloy,(.30,.019+i*.019,0),(.112,.006,.131))
save('KIT_EMOD_Doghouse')
for i in range(4):
    box('Flaps',rubber,(0,.004+i*.009,i*.008),(.22,.008,.29))
    box('Straps',alloy,(0,.01+i*.009,-.124+i*.008),(.22,.005,.016))
save('KIT_GUARD_MudFlaps')
panels('Skid',alloy,[(0,-.44),(0,.29),(.085,.44),(.096,.44),(.012,.285),(.012,-.44)],.63)
for x in [-.24,.24]:
    for z in [-.31,.21]: cyl('Bolts',iron,(x,.032,z),.014,.021,6)
save('KIT_GUARD_SkidPlate')
rod('Mast',iron,[(0,.015,-.49),(0,.019,.49)],.006)
box('Flag','#ca6629',(.063,.019,.40),(.12,.005,.12))
box('Bracket',alloy,(0,.017,-.47),(.064,.034,.054))
save('KIT_ROOF_Antenna')
for file in ['EXH_SidePipes','EXH_Megaphone']:
    for x in [-.083,.083]:
        rod('Inlets',alloy,[(x-.026,.039,-.37),(x,.046,-.29),(x,.051,.13)],.029)
        ring('Outlets',bright,(x,.057,.22),.057 if file.endswith('Megaphone') else .038,.028,.20,24,'z')
        box('Tabs',iron,(x,.022,0),(.084,.017,.045))
    save('KIT_'+file)
for x in [-.093,-.031,.031,.093]:
    points=[(x,.025+.31*math.sin(i*math.pi/10),.34*math.cos(i*math.pi/10)) for i in range(11)]
    rod('Arches',iron,points,.016)
save('KIT_FENDER_ArchTubes')
for z,h in [(-.37,.60),(.35,.53)]:
    rod('Hoops',iron,[(-.36,.02,z),(-.30,h,z),(.30,h,z),(.36,.02,z)],.017)
for side in [-1,1]:
    rod('Rails',iron,[(side*.30,.6,-.37),(side*.30,.53,.35)],.017)
    rod('Sills',iron,[(side*.36,.02,-.37),(side*.36,.02,.35)],.017)
rod('Diagonal',iron,[(-.32,.04,-.37),(.3,.59,-.37)],.016)
save('KIT_ROLL_Cage')
for x in [-.096,.096]:
    box('Tanks',green,(x,.161,0),(.171,.316,.245))
    rod('Handles',iron,[(x,.313,-.072),(x,.368,-.069),(x,.368,.009),(x,.315,.022)],.012)
    cyl('Caps',alloy,(x,.326,.074),.021,.018,12)
box('Carrier',iron,(0,.012,0),(.387,.024,.274))
save('KIT_ROOF_JerryCans')

# A worn, unmounted tire. The revolved section keeps the bead and inner opening visible.
section=[(.18,0),(.245,0),(.303,.013),(.333,.039),(.342,.061),(.342,.153),
         (.331,.181),(.302,.202),(.244,.211),(.18,.211),(.175,.192),(.204,.172),
         (.278,.162),(.289,.143),(.289,.07),(.273,.05),(.201,.035),(.175,.019),(.18,0)]
mesh=tm.creation.revolve(np.array(section),sections=36)
put(mesh,'Carcass',rubber,(0,0,0),(-math.pi/2,0,0))
for i in range(32):
    a=i*math.tau/32
    for side in [-1,1]:
        box('Tread','#363737',(.34*math.sin(a),.107+side*.032,.34*math.cos(a)),
            (.037,.061,.009),(0,a,side*.25))
save('PROP_WornTire')

# Fixed cleanup piles share the materials used for carried salvage.
for i in range(8):
    x,z=(i%3-1)*.27,(i//3-1)*.25
    h=.23+(i%3)*.031
    col=[blue,green,rust][i%3]
    cyl('Tin'+str(i%3),col,(x,h/2,z),.115,h,18)
    ring('TopRims',alloy,(x,h,z),.117,.105,.009,18)
    cyl('PaperBands',cream,(x,h*.57,z),.116,.04,18)
save('YARD_Cans')
for i in range(17):
    x,z=(-.25 if i%2 else .23),.09*math.sin(i)
    box('Bundles'+str(i%3),[kraft,cream,pine][i%3],(x,.018+(i//2)*.032,z),(.43,.031,.53),(0,.076*math.sin(i*2),0))
for x in [-.25,.23]:
    box('Twine',end,(x,.29 if x>.0 else .256,0),(.009,.008,.54))
save('YARD_Papers')
box('Cabinet',cream,(0,.81,0),(.75,1.62,.67))
for y,h in [(.56,1.04),(1.35,.46)]:
    box('Doors','#cfc9b5',(0,y,.356),(.736,h,.056))
    rod('Pulls',alloy,[(-.28,y+.12,.383),(-.28,y+.11,.425),(-.28,y-.09,.425),(-.28,y-.10,.383)],.012)
for x in [-.30,.30]:
    for z in [-.25,.25]: cyl('Feet',iron,(x,.017,z),.025,.034)
for i in range(8): box('Grille',iron,((i-3.5)*.065,.055,.387),(.046,.011,.004))
save('YARD_Fridge')
for i in range(18):
    a=i*2.4
    x,z=math.cos(a),math.sin(a)
    rod('Branches',end,[(x*.11,.054,z*.13),(x*.54,.13+i%4*.053,z*.44),(x*.85,.19+i%5*.081,z*.72)],.014)
    rod('Twigs',wood,[(x*.56,.18+i%4*.04,z*.46),(x*.71+.13,.34+i%4*.068,z*.58)],.009)
save('YARD_Brush')
