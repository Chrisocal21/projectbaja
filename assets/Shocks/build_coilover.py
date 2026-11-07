"""SHOCK_001 coilover, rebuilt from the renders in Renderings(1464).zip.
Axis = +Y, origin at the lower (eyelet) mount center. Meters. Separate named nodes so a
sim can slide 'shaft' + 'upper_*' down the body and compress 'spring'."""
import numpy as np, trimesh as tm
from trimesh.transformations import rotation_matrix as R, translation_matrix as T

BLUE=[20,30,170,255]; RED=[150,20,20,255]; GREY=[140,140,145,255]
def col(m,c): m.visual.face_colors=c; return m
def cyl(r,y0,y1,c,s=32): m=tm.creation.cylinder(radius=r,height=y1-y0,sections=s); m.apply_translation([0,(y0+y1)/2,0]); m.apply_transform(np.eye(4)); return col(m,c)
# cylinder() is along Z; rotate so axis is Y
def ycyl(r,y0,y1,c): m=tm.creation.cylinder(radius=r,height=y1-y0,sections=32); m.apply_transform(R(-np.pi/2,[1,0,0])); m.apply_translation([0,(y0+y1)/2,0]); return col(m,c)

def eyelet(y):
    m=tm.creation.annulus(r_min=0.009,r_max=0.022,height=0.016,sections=32)   # axis Z = through-hole
    m.apply_translation([0,y,0]); return col(m,BLUE)

def spring(y0,y1,r=0.036,wire=0.0042,coils=14):
    n=coils*28; t=np.linspace(0,1,n); a=t*coils*2*np.pi
    pts=np.c_[r*np.cos(a), y0+(y1-y0)*t, r*np.sin(a)]
    segs=[]
    for p,q in zip(pts[:-1],pts[1:]):
        v=q-p; L=np.linalg.norm(v)
        c=tm.creation.cylinder(radius=wire,height=L*1.15,sections=8)
        z=np.array([0,0,1.]); ax=np.cross(z,v/L); s=np.linalg.norm(ax)
        M=np.eye(4)
        if s>1e-9: M=R(np.arctan2(s,z@(v/L)),ax/s)
        c.apply_transform(M); c.apply_translation((p+q)/2); segs.append(c)
    return col(tm.util.concatenate(segs),RED)

# lengths (extended): eye-to-eye ~0.50 m
body  = tm.util.concatenate([ycyl(0.022,0.0,0.215,BLUE), eyelet(0.0), ycyl(0.046,0.215,0.225,BLUE)])   # reservoir body + lower spring seat plate at 0.215
body.apply_translation([0,0.0,0]); body=col(body,BLUE)
lower_seat = ycyl(0.050,0.215,0.228,BLUE)
shaft = ycyl(0.0095,0.225,0.44,GREY)
upper_seat = ycyl(0.050,0.427,0.440,BLUE)
top_stub = tm.util.concatenate([ycyl(0.016,0.440,0.485,BLUE), ycyl(0.008,0.485,0.505,BLUE)]); top_stub=col(top_stub,BLUE)
coil = spring(0.228,0.427)

sc=tm.Scene()
for name,g in [('body',body),('lower_seat',lower_seat),('shaft',shaft),('spring',coil),('upper_seat',upper_seat),('upper_mount',top_stub)]:
    sc.add_geometry(g,node_name=name,geom_name=name)
sc.export('SHOCK_001_Coilover.glb'); print('ok',sc.bounds)
