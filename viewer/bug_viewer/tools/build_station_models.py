"""Station assets. Run from repo root with numpy and trimesh installed."""
exec(open('viewer/bug_viewer/tools/build_small_models.py').read().split('for color, suffix')[0])

def frame(w,d,h):
    for x in [-w/2+.055,w/2-.055]:
        for z in [-d/2+.055,d/2-.055]:
            box('Frame',iron,(x,h/2,z),(.055,h,.055))
            box('Feet',rubber,(x,.012,z),(.073,.024,.073))
    for z in [-d/2+.055,d/2-.055]:
        box('Stretchers',iron,(0,.24,z),(w-.08,.045,.045))

frame(.85,.60,.84)
for i in range(4): box('TopPlanks',wood,(0,.875,(i-1.5)*.145),(.91,.065,.141))
box('ClampingPlate',alloy,(.2,.917,0),(.28,.018,.29))
cyl('Motor',red,(.19,.96,0),.035,.2,20,'z')
cyl('CuttingDisc',iron,(.19,.985,.13),.065,.008,32,'z')
rod('ToolGrip',rubber,[(.19,.97,0),(.075,.97,0)],.016)
save('SHOP_GrinderStation')

frame(1.30,.80,.86)
# Slats leave visible welding-fixture slots in the tabletop.
for i in range(7): box('TableSlats',iron,((i-3)*.18,.89,0),(.165,.06,.84))
for z in [-.35,.35]: box('LowerShelf',iron,(0,.25,z),(1.16,.025,.11))
rod('GroundLead',rubber,[(-.58,.85,.3),(-.64,.4,.32),(-.4,.07,.36),(-.15,.06,.39)],.009)
save('SHOP_WeldingTable')

frame(.48,.66,.64)
box('LowerTray',iron,(0,.12,0),(.48,.03,.66))
box('MachineTray',iron,(0,.66,0),(.48,.028,.66))
for x in [-.24,.24]:
    for z in [-.25,.25]: cyl('Wheels',rubber,(x,.06,z),.06,.03,16,'x')
box('WelderCase',blue,(0,.82,-.04),(.38,.29,.47))
for x in [-.195,.195]:
    for i in range(8): box('VentSlots',rubber,(x,.80,-.19+i*.04),(.002,.07,.017))
for x in [-.08,.08]: cyl('ControlKnobs',rubber,(x,.88,.205),.026,.021,16,'z')
rod('PushHandle',iron,[(-.22,.65,-.29),(-.22,.97,-.32),(.22,.97,-.32),(.22,.65,-.29)],.015)
rod('TorchLead',rubber,[(.08,.73,.21),(.22,.56,.30),(.20,.25,.32),(.02,.19,.32),(-.18,.36,.31),(-.2,.64,.29)],.011)
rod('Torch',iron,[(-.2,.64,.29),(-.22,.75,.29),(-.19,.78,.29)],.013)
save('SHOP_WelderCart')

frame(.95,.72,.75)
box('SawBody',red,(0,.74,0),(.68,.32,.53))
box('Table',alloy,(0,.93,0),(1.02,.045,.78))
cyl('Blade',bright,(-.12,.965,0),.125,.008,40,'x')
for i in range(24):
    a=i*math.tau/24
    box('Teeth',iron,(-.12,.965+.126*math.cos(a),.126*math.sin(a)),(.011,.013,.014),(a,0,0))
box('RivingKnife',iron,(-.12,1.01,-.19),(.008,.14,.033))
box('Fence',iron,(.26,.98,0),(.055,.07,.83))
for z in [-.38,.38]: box('FenceRails',iron,(0,.95,z),(1.1,.038,.035))
cyl('HeightWheel',rubber,(0,.76,.29),.065,.022,20,'z')
cyl('Switch',red,(-.25,.84,.286),.022,.015,12,'z')
save('SHOP_TableSawStation')

box('Base',iron,(0,.02,0),(.63,.04,.63))
box('Pedestal',blue,(0,.45,0),(.15,.85,.15))
box('DiePlate',iron,(0,.89,0),(.53,.06,.40))
cyl('BendingDie',alloy,(0,.95,0),.112,.057,32)
ring('DieGroove',iron,(0,.95,0),.115,.097,.013,32)
cyl('Follower',iron,(.19,.95,.055),.045,.063,20)
rod('Lever',red,[(0,.925,0),(-.28,.925,.12),(-.63,.925,.27)],.02)
rod('HandleGrip',rubber,[(-.48,.925,.205),(-.63,.925,.27)],.026)
save('SHOP_TubeBenderStation')

# Old equipment has rust, missing controls, a loose lead and dull finishes.
box('TransformerCase',rust,(0,.34,0),(.44,.52,.45))
for x in [-.23,.23]: cyl('Wheels',rubber,(x,.09,-.12),.09,.04,18,'x')
box('DeadPanel',iron,(0,.39,.233),(.32,.27,.015))
ring('MissingDial',rubber,(-.07,.43,.25),.03,.02,.012,16,'z')
rod('FrayedLead',rubber,[(.12,.2,.24),(.26,.07,.32),(.33,.02,.36)],.009)
# Opaque low-poly cloth spans the top and folds down the case.
verts=[]
for y,z,w in [(.13,-.265,.31),(.61,-.24,.29),(.66,0,.28),(.61,.24,.29),(.16,.28,.32)]:
    verts.extend([(-w,y-.02,z),(-w*.6,y+.015,z),(0,y,z),(w*.6,y+.02,z),(w,y-.025,z)])
faces=[]
for j in range(4):
    for i in range(4):
        a=j*5+i
        faces.extend([(a,a+5,a+1),(a+1,a+5,a+6)])
mesh=tm.Trimesh(vertices=verts,faces=faces,process=False)
put(mesh,'Tarp',green,(0,0,0))
put(tm.Trimesh(vertices=verts,faces=np.array(faces)[:,::-1],process=False),'Tarp',green,(0,-.002,0))
save('SHOP_OldWelderTarped')
box('Base',iron,(0,.025,0),(.30,.05,.23))
cyl('Motor',rust,(0,.15,0),.095,.24,24,'x')
cyl('Spindle',alloy,(0,.15,0),.014,.45,12,'x')
cyl('WornWheel',iron,(-.18,.15,0),.117,.041,28,'x')
ring('BrokenGuard',rust,(-.198,.15,0),.124,.104,.022,24,'x')
box('LooseToolRest',rust,(.18,.059,.11),(.08,.01,.08),(0,.4,.2))
save('SHOP_OldGrinder')
cyl('Tank',rust,(0,.26,0),.21,.80,28,'x')
for x in [-.30,.30]:
    for z in [-.13,.13]: box('Feet',iron,(x,.05,z),(.065,.10,.065))
box('MotorPlate',iron,(0,.46,0),(.55,.035,.25))
cyl('DeadMotor',iron,(-.15,.55,0),.075,.23,20,'x')
for y in [.51,.54,.57,.60]: box('PumpFins',alloy,(.17,y,0),(.13,.012,.14))
ring('Flywheel',iron,(.28,.55,0),.12,.084,.022,24,'x')
rod('DisconnectedHose',rubber,[(.28,.41,.10),(.38,.22,.19),(.28,.02,.26),(-.04,.02,.25)],.009)
cyl('DeadGauge',cream,(.12,.69,.02),.031,.02,20,'z')
save('SHOP_OldCompressor')
