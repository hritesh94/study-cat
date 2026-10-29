"""Room art in the same 3D style and scale as the cat. Run: python props.py"""
import json, os, math, numpy as np
from PIL import Image, ImageDraw
import render_hd as R
from render_hd import ell, box, cyl, chain, trace, finish, pitchR, yawR
import cat_hd
from cat_hd import BASE

PAL=dict(BASE)
PAL.update(
 tint=[(255,255,255),(228,228,236),(192,192,208)], tintb=[(212,212,222),(188,188,200),(156,156,174)],
 pages=[(255,250,236),(244,234,212),(218,204,182)], pagel=[(226,214,192),(210,196,174),(188,172,152)],
 shelf=[(206,150,104),(184,128,86),(150,100,66)], shelfd=[(170,118,80),(150,100,68),(122,80,56)],
 coin=[(255,214,96),(244,186,62),(206,146,44)], coind=[(232,170,52),(214,148,40),(176,116,32)],
 glass=[(236,248,255),(214,236,250),(188,218,240)], lid=[(196,140,96),(172,118,80),(140,94,64)],
 terra=[(232,140,102),(212,116,84),(178,92,68)], terrad=[(214,120,88),(192,100,72),(160,80,58)],
 soil=[(122,88,70),(104,74,60),(84,58,48)], seed=[(196,150,96),(172,126,78),(140,100,62)],
 stem=[(116,170,96),(96,150,80),(76,124,64)], leaf=[(132,196,110),(108,176,92),(84,148,74)],
 leafv=[(112,174,94),(92,154,78),(72,128,62)], leafp=[(196,204,128),(176,184,108),(150,156,90)],
 leafpv=[(176,186,112),(158,166,96),(134,142,80)], stemp=[(170,180,110),(150,160,94),(128,136,80)],
 petal=[(255,184,206),(246,158,186),(220,132,164)], petalp=[(236,196,200),(222,176,182),(196,152,160)],
 center=[(255,222,110),(246,200,82),(214,170,62)],
)
def frac(x): return x-np.floor(x)
def shade(info,prims):
    P=len(info['bt']); rgb=np.zeros((P,3)); bi=info['bi']; hit=info['hit']
    band=np.where(info['ndl']>0.45,0,np.where(info['ndl']>-0.05,1,2))
    for i in np.unique(bi[hit]):
        p=prims[i]; sel=np.where(bi==i)[0]; q=info['q'][sel]; m=np.array([p['mat']]*len(sel),dtype=object)
        t=p.get('tag')
        if t=='leaf': m[np.abs(q[:,2])<0.13]=p['mat']+'v'
        if t=='coinstack': m[frac(q[:,1]*9)<0.25]='coind'
        if t=='coinfill_top': m[frac(q[:,0]*3.1+q[:,2]*1.7)<0.12]='coind'
        if t=='shelf': m[frac(q[:,0]*5)<0.04]='shelfd'
        if t=='pot': m[(q[:,1]>0.55)&(q[:,1]<0.75)]='terrad'
        if t=='band': pass
        for mm in set(m):
            s=m==mm; rgb[sel[s]]=np.array(PAL[mm])[band[sel][s]]
        top=info['ndl'][sel]>0.82; rgb[sel[top]]=np.minimum(255,rgb[sel[top]]*1.04+6)
    return rgb
def render(prims,yaw=0,**kw):
    info=trace(prims,yaw); return Image.fromarray(finish(shade(info,prims),info,**kw)),info
def layer(prims,yaw,pick):
    info=trace(prims,yaw); h=info['hit']; lay=np.zeros_like(h); lay[h]=[pick(prims[i]) for i in info['bi'][h]]
    return Image.fromarray(finish(shade(info,prims),info,layer=lay))

OUTD='out/room'; os.makedirs(OUTD,exist_ok=True); MAN={}
def save(name,img,note,extra=None,trim=True):
    ox,oy=R.AXf,R.AYf
    if trim and img.getbbox():
        x0,y0,x1,y1=img.getbbox(); x0,y0=max(0,x0-1),max(0,y0-1); x1,y1=min(img.width,x1+1),min(img.height,y1+1)
        img=img.crop((x0,y0,x1,y1)); ox,oy=ox-x0,oy-y0
    img.save(f'{OUTD}/{name}.png',optimize=True)
    d=dict(file=f'room/{name}.png',width=img.width,height=img.height,origin=dict(x=round(ox/img.width,4),y=round(oy/img.height,4)),originPx=dict(x=ox,y=oy),note=note)
    if extra: d.update(extra)
    MAN[name]=d

# ---------------- shelf + books ----------------
R.configure(192,96,40)
shelf=[box([0,-0.9,0],[30,0.9,5.2],mat='shelf',tag='shelf')]
for x in (-22,22):
    shelf.append(box([x,-3.4,-3.2],[0.9,2.6,1.8],mat='shelfd')); shelf.append(box([x,-1.9,-1.0],[0.9,1.0,3.6],mat='shelfd'))
img,_=render(shelf); save('shelf',img,'Wall shelf. Its origin is the middle of the plank\'s top surface: put each book\'s origin on the same point, moved left/right along the shelf.',dict(usableWidthPx=round(56*R.UNIT)))
THICK=[2.4,3.2,4.0,5.0,6.2,7.6]; HOURS=[0,1,3,8,20,50]
R.configure(48,24,40)
for i,t in enumerate(THICK):
    h=12.5-[0,0.6,0,1.0,0.3,0.8][i]; d=8.2
    pr=[box([-t/2+0.18,h/2,0],[0.18,h/2,d/2],mat='tint',tag='cover'),box([t/2-0.18,h/2,0],[0.18,h/2,d/2],mat='tint',tag='cover'),
        box([0,h/2,d/2-0.2],[t/2,h/2,0.2],mat='tint',tag='cover')]
    for yy in (1.6,h-1.6): pr.append(box([0,yy,d/2+0.02],[t/2+0.01,0.35,0.22],mat='tintb',tag='cover'))
    pr.append(box([0,(h-0.5)/2+0.05,-0.2],[t/2-0.3,(h-0.5)/2,d/2-0.3],mat='pages',tag='pages'))
    save(f'book_{i}_cover',layer(pr,0,lambda p:p['tag']=='cover'),f'Book cover for {HOURS[i]}+ hours. Light grey on purpose: setTint(subjectColor) colors it.',dict(hours=HOURS[i],thicknessPx=round(t*R.UNIT,1)))
    save(f'book_{i}_pages',layer(pr,0,lambda p:p['tag']=='pages'),'Page edges for the same book. Draw on top of the cover, NOT tinted.',dict(hours=HOURS[i]))

# ---------------- coin jar ----------------
R.configure(64,32,56)
def jar(f):
    coins=[]
    if f>0:
        top=0.8+f*17.5; hh=(top-0.8)/2
        coins.append(cyl([0,0.8+hh,0],7.3,7.3,hh,mat='coin',tag='coinstack'))
        coins.append(cyl([0,top+0.05,0],7.2,7.2,0.06,mat='coin',tag='coinfill_top'))
        rng=np.random.RandomState(int(f*10)+3)
        for k in range(int(3+f*6)):
            a=rng.rand()*6.28; r=rng.rand()*5.0
            coins.append(cyl([r*math.cos(a),top+0.45,r*math.sin(a)],1.9,1.9,0.32,pitchR(rng.rand()*30-15)@yawR(rng.rand()*90),mat='coin'))
    out=Image.new('RGBA',(R.S,R.S),(0,0,0,0))
    if coins:
        ci,_=render(coins,outer=False); out.alpha_composite(ci)
    g=[cyl([0,9.5,0],8.2,8.2,9.5,mat='glass'),cyl([0,19.6,0],6.6,6.6,1.1,mat='glass')]
    info=trace(g,0); gi=np.array(Image.fromarray(finish(shade(info,g),info)))
    hit=info['hit'].reshape(R.SI,R.SI)
    a=gi[...,3].astype(float)
    inner=np.array(Image.fromarray(hit.astype(np.uint8)*255).resize((R.S,R.S),Image.BOX))>250
    a[inner]=42
    # highlight streaks
    hl=Image.new('L',(R.S,R.S),0); d=ImageDraw.Draw(hl)
    cx,cy=R.project([-5.2,10,6],0); d.line([(cx,cy-16),(cx,cy+12)],fill=170,width=3)
    cx2,cy2=R.project([-2.6,12,7.6],0); d.line([(cx2,cy2-8),(cx2,cy2+3)],fill=120,width=2)
    hlA=np.array(hl).astype(float)
    rgb=gi[...,:3].astype(float); m=hlA>0
    rgb[m]=rgb[m]*(1-hlA[m,None]/255)+255*hlA[m,None]/255; a[m&inner]=np.maximum(a[m&inner],hlA[m&inner])
    gimg=np.dstack([rgb,a]).astype(np.uint8); out.alpha_composite(Image.fromarray(gimg))
    lid=[cyl([0,21.6,0],7.0,7.0,1.0,mat='lid'),cyl([0,22.9,0],5.2,5.2,0.5,mat='lid')]
    li,_=render(lid); out.alpha_composite(li)
    return out
for k in range(11):
    save(f'jar_{k:02d}',jar(k/10),f'Coin jar {k*10}% full (today\'s coins / daily cap). Use the closest level.',dict(fill=k/10))
R.configure(64,32,56)
for k in range(4):
    sp=Image.new('RGBA',(64,64),(0,0,0,0)); d=ImageDraw.Draw(sp)
    for j,(x,y) in enumerate([(14,18),(48,12),(52,40),(10,44),(32,6)]):
        s=[3,6,4,2][(k+j)%4]
        if s>0:
            col=(255,244,170,255); d.line([(x-s,y),(x+s,y)],fill=col,width=2); d.line([(x,y-s),(x,y+s)],fill=col,width=2)
            d.point((x,y),fill=(255,255,255,255))
    save(f'jar_sparkle_{k}',sp,trim=False,note='Sparkle overlay for a full jar. Loop frames 0-3 at about 6 fps on top of jar_10.')

# ---------------- plant ----------------
R.configure(96,48,84)
def leafp(at,v,L,W,mat):
    L,W=L*1.3,W*1.3
    at=np.array(at,float); v=np.array(v,float); e1=v/np.linalg.norm(v); up=np.array([0,1.,0])
    e3=np.cross(e1,up); e3=e3/np.linalg.norm(e3) if np.linalg.norm(e3)>1e-3 else np.array([0,0,1.]); e2=np.cross(e3,e1)
    Rm=np.stack([e1,e2,e3],1); return ell(at+e1*L*0.95,[L,0.5,W],Rm,mat=mat,tag='leaf')
def flower(at,mat):
    at=np.array(at,float); pr=[ell(at+[0,0,0.4],[1.2]*3,mat='center')]
    for k in range(5):
        a=2*math.pi*k/5; pr.append(ell(at+np.array([2.0*math.cos(a),2.0*math.sin(a),0]),[1.6,1.6,1.0],mat=mat))
    return pr
def stemc(p0,p1,p2,mat,r=0.75):
    pts=[]; 
    for t in np.linspace(0,1,14):
        q=(1-t)**2*np.array(p0)+2*(1-t)*t*np.array(p1)+t*t*np.array(p2); pts.append(q)
    return [ell(q,[r]*3,mat=mat) for q in pts]
def plant(stage,droop=False):
    pr=[cyl([0,4.0,0],5.2,5.2,4.0,mat='terra',tag='pot'),cyl([0,8.3,0],6.0,6.0,0.9,mat='terra'),cyl([0,8.9,0],5.3,5.3,0.35,mat='soil')]
    L='leafp' if droop else 'leaf'; St='stemp' if droop else 'stem'; Fl='petalp' if droop else 'petal'
    dv=lambda v:(v[0],v[1]-1.3 if droop else v[1],v[2])
    if stage==0:
        pr.append(ell([0,9.3,0.5],[3.2,1.0,2.6],mat='soil')); pr.append(ell([0.3,10.1,0.8],[1.5,0.8,1.0],mat='seed')); pr.append(ell([0.6,10.9,1.0],[0.55,1.0,0.55],mat=St))
        return pr
    top=9
    if stage>=1:
        h={1:5,2:11,3:13,4:14}[stage]; bend=1.8 if droop else 0
        pr+=stemc([0,top,0],[0.3+bend*0.3,top+h*0.6,0],[0.6+bend,top+h-bend*0.8,0.4],St)
        tip=np.array([0.6+bend,top+h-bend*0.8,0.4])
        sz=1 if stage==1 else 1.25
        pr+=[leafp(tip,dv((1,0.7,0.3)),2.2*sz,1.3*sz,L),leafp(tip,dv((-1,0.6,0.4)),2.2*sz,1.3*sz,L)]
        if stage>=2:
            for j,(hh,sx) in enumerate([(3.0,1),(5.2,-1),(7.0,1)]):
                at=[0.15+hh*0.05,top+hh,0.3]; pr.append(leafp(at,dv((sx,0.35,0.5*(j%2*2-1))),3.2,1.7,L))
        if stage>=3:
            for side,(a,b) in ((1,(6,10)),(-1,(-6,9))):
                p2=[a+side*(1.5 if droop else 0),top+b-(2 if droop else 0),-1.5]
                pr+=stemc([0,top,0],[a*0.4,top+b*0.6,-0.8],p2,St,0.6)
                for (vx,vy,vz) in ((side,0.5,0.4),(side*0.3,0.9,-0.5),(-side*0.4,0.6,0.7)):
                    pr.append(leafp(p2,dv((vx,vy,vz)),3.4,1.8,L))
                pr.append(leafp([a*0.5,top+b*0.5,-0.6],dv((side,0.2,0.8)),3.0,1.6,L))
        if stage>=4:
            pr+=flower(tip+np.array([0,1.8 if not droop else 0.2,0.6]),Fl)
            pr+=flower([6+(1.5 if droop else 0),top+10.8-(2.6 if droop else 0),-0.4],Fl)
            pr+=flower([-6,top+10-(2.4 if droop else 0),-0.2],Fl)
    return pr
NAMES=['seed','sprout','leafy','bushy','blooming']
for s in range(5):
    img,_=render(plant(s),20); save(f'plant_{s}_{NAMES[s]}',img,f'Plant stage {s} ({NAMES[s]}).',dict(stage=s))
    if s>0:
        img,_=render(plant(s,True),20); save(f'plant_{s}_{NAMES[s]}_droopy',img,f'Plant stage {s} after the streak broke (droopy, pale).',dict(stage=s,droopy=True))

# ---------------- tub (matches the bath animations) ----------------
R.configure(128,64,104)
P=dict(cat_hd.__dict__)
tubP=[]; c0=np.array([-1.0,0,0])
tubP.append(cyl(c0+[0,4.8,0],12.5,10.5,4.8,mat='wood',tag='tub',hollow=True)); tubP.append(cyl(c0+[0,0.7,0],12.4,10.4,0.7,mat='woodd'))
for yy in (2.2,7.6): tubP.append(cyl(c0+[0,yy,0],12.9,10.9,0.55,mat='hoop',hollow=True))
tubP.append(cyl(c0+[0,7.4,0],12.2,10.2,0.35,mat='water'))
info=trace(tubP,35)
img=Image.fromarray(finish(cat_hd.shade(info,tubP,'orange'),info))
save('tub',img,trim=False,note='Bath tub. Same frame size and origin as the cat sheets: draw it at the cat\'s scale with origin (0.5, 0.8125) on the tub spot, then the bath_* animations line up exactly. Hide it while bath_in / bath / bath_shake / bath_out play (their frames include the tub).')
json.dump(dict(scaleNote='All room art is drawn at the same scale as the cat sheets: draw it with the same sprite scale as the cat (0.5 in the current game) so sizes match.',items=MAN),open(f'{OUTD}/room.json','w'),indent=2)
print(len(MAN),'images')
