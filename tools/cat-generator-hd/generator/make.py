"""Builds every sprite sheet: one per breed, plus one overlay sheet per outfit.
Run: pip install numpy pillow   then   python make.py"""
import json, os, numpy as np
from PIL import Image, ImageDraw
from cat_hd import *
from poses import A, FPS, LOOP, NOTE

OUTFITS=['beanie','scarf','bow','hoodie','flowers']
names=list(A); COLS=max(len(v) for v in A.values()); ROWS=len(names)
os.makedirs('out/breeds',exist_ok=True); os.makedirs('out/outfits',exist_ok=True); os.makedirs('out/gif',exist_ok=True)
sheets={b:Image.new('RGBA',(COLS*S,ROWS*S),(0,0,0,0)) for b in BREEDS}
osheets={o:Image.new('RGBA',(COLS*S,ROWS*S),(0,0,0,0)) for o in OUTFITS}

ZG=[(0,0),(1,0),(2,0),(3,0),(2,1),(1,2),(0,3),(1,3),(2,3),(3,3)]
def zzz(img,P):
    if 'zzz' not in P: return
    hx,hy=project(np.array(P['head'])+[0,9,0],P['yaw']); t=P['zzz']; d=ImageDraw.Draw(img)
    for j in range(3):
        k=(t//2+j)%3
        if j<=k:
            ox,oy=hx+12+j*8,hy-10-j*10-2*k; sz=[5,6,7][j]
            d.line([(ox,oy),(ox+sz,oy),(ox,oy+sz),(ox+sz,oy+sz)],fill=(74,46,48,255),width=2)

for r,n in enumerate(names):
    for c,P in enumerate(A[n]):
        y=P['yaw']; base=build(P); ib=trace(base,y)
        for b in BREEDS:
            im=Image.fromarray(finish(shade(ib,base,b),ib)); zzz(im,P); sheets[b].alpha_composite(im,(c*S,r*S))
        for o in OUTFITS:
            pr=build(P,o); io=trace(pr,y)
            lay=np.zeros_like(io['hit']); h=io['hit']; lay[h]=[pr[i].get('outfit',False) for i in io['bi'][h]]
            im=Image.fromarray(finish(shade(io,pr,'orange',only=lambda p:p.get('outfit')),io,layer=lay)); osheets[o].alpha_composite(im,(c*S,r*S))
    print(n,flush=True)

meta=dict(frameWidth=S,frameHeight=S,framesPerRow=COLS,origin=dict(x=AXf/S,y=AYf/S),
  facing='three-quarter right; flipX for left',deskTopY=round(project([16.5,12.5,0],35)[1]),
  breeds={b:dict(image=f'breeds/{b}.png',name=BREEDS[b]['name']) for b in BREEDS},
  outfits={o:dict(image=f'outfits/{o}.png') for o in OUTFITS},
  animations={n:dict(start=r*COLS,frames=len(A[n]),fps=FPS[n],loop=n in LOOP,note=NOTE[n]) for r,n in enumerate(names)})
for b,sh in sheets.items(): sh.save(f'out/breeds/{b}.png',optimize=True)
for o,sh in osheets.items(): sh.save(f'out/outfits/{o}.png',optimize=True)
json.dump(meta,open('out/study-cat.json','w'),indent=2)
print('done',meta['deskTopY'])
