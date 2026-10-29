import numpy as np, math
from render_hd import *

BASE=dict(
 pink=[(252,182,178),(240,156,158),(214,130,138)], nose=[(232,124,134),(214,108,122),(190,92,108)],
 mouth=[(120,52,64)]*3, pupil=[(40,26,34)]*3, eyeline=[(52,34,42)]*3,
 book=[(166,140,196),(144,118,176),(116,92,148)], page=[(255,251,240),(246,236,216),(222,208,188)],
 bowl=[(166,198,160),(144,178,140),(116,150,118)], food=[(200,122,78),(178,102,64),(150,84,54)],
 yarn=[(176,152,210),(154,130,190),(126,104,164)], yarnd=[(140,116,176),(122,98,158),(100,80,136)],
 tear=[(160,212,248)]*3, blush=[(250,170,170),(240,150,154),(220,132,140)], glass=[(72,50,56)]*3, hl=[(255,255,255)]*3,
 # outfits
 beanie=[(232,96,92),(212,76,78),(178,58,66)], beanie2=[(214,80,80),(194,64,68),(162,48,58)],
 knit=[(255,246,236),(240,226,214),(214,196,186)],
 scarf=[(120,184,150),(98,164,132),(76,136,112)], scarf2=[(250,232,170),(236,212,146),(208,182,120)],
 bow=[(240,98,128),(222,78,112),(188,58,92)],
 hoodie=[(150,170,222),(126,148,206),(100,120,178)], hoodie2=[(124,146,204),(104,126,186),(82,102,160)],
 leaf=[(120,178,110),(98,156,92),(76,128,74)], flowerA=[(255,190,206),(246,164,186),(220,138,164)],
 flowerB=[(255,236,150),(246,218,120),(222,190,96)], flowerC=[(255,255,255),(240,240,246),(214,214,226)],
)
BREEDS={
 'orange':dict(name='Orange tabby',fur=[(252,186,122),(240,154,96),(208,118,78)],stripe=[(228,136,82),(210,114,70),(180,94,64)],
   cream=[(255,248,234),(246,228,206),(222,196,180)],iris=[(196,138,62),(176,118,50),(150,98,40)],stripes=True),
 'tuxedo':dict(name='Tuxedo',fur=[(88,84,102),(68,64,82),(50,46,62)],stripe=[(88,84,102),(68,64,82),(50,46,62)],
   cream=[(255,255,255),(238,238,246),(210,212,226)],iris=[(178,206,92),(156,186,74),(128,160,58)],stripes=False),
 'white':dict(name='White',fur=[(255,255,255),(240,240,248),(212,214,230)],stripe=[(255,255,255),(240,240,248),(212,214,230)],
   cream=[(255,255,255),(244,244,250),(218,220,234)],iris=[(120,178,238),(98,156,222),(78,132,200)],stripes=False),
 'calico':dict(name='Calico',fur=[(255,252,246),(244,238,230),(218,208,200)],stripe=[(255,252,246),(244,238,230),(218,208,200)],
   cream=[(255,252,246),(244,238,230),(218,208,200)],patchO=[(250,170,102),(236,144,84),(204,112,68)],
   patchK=[(84,74,78),(66,58,62),(48,42,46)],iris=[(150,196,96),(128,176,80),(104,150,64)],stripes=False,patches=True),
 'siamese':dict(name='Siamese',fur=[(252,242,226),(240,226,206),(214,196,176)],stripe=[(252,242,226),(240,226,206),(214,196,176)],
   cream=[(255,250,240),(244,236,222),(220,208,192)],point=[(126,94,84),(104,78,70),(80,60,56)],
   iris=[(110,170,240),(88,148,224),(68,124,200)],stripes=False,points=True),
}

HEAD_R=(9.0,8.4,9.4)
def build(P,outfit=None):
    pr=[]
    pr.append(ell(P['H'],P['Hr'],pitchR(P['bodyPitch']),tag='hips',body=True))
    pr.append(ell(P['C'],P['Cr'],pitchR(P['chestPitch']),tag='chest',body=True))
    hc=np.array(P['head'],float); C=np.array(P['C'],float)
    neck=C*0.55+hc*0.45
    pr.append(ell(neck,[4.6,4.8,4.6],tag='chest',body=True))
    Rh=yawR(P['hyaw'])@pitchR(P['hpitch'])@rollR(P.get('hroll',0) or 0)
    H=lambda v: hc+Rh@np.array(v,float)
    pr.append(ell(hc,HEAD_R,Rh,tag='head'))
    pr.append(ell(H([6.4,-2.9,0]),[3.7,2.8,4.3],Rh,mat='cream',tag='muzzle'))
    pr.append(ell(H([9.9,-1.4,0]),[1.0,0.8,1.3],Rh,mat='nose'))
    if P['mouth']=='open': pr.append(ell(H([9.0,-4.3,0]),[1.3,1.4,1.8],Rh,mat='mouth'))
    e=P['eye']
    for s in (1,-1):
        c=[8.1,0.9,3.9*s]; r=[1.15,2.3,1.6]
        if e=='closed': c=[8.6,0.0,3.9*s]; r=[0.7,0.5,1.7]
        if e=='half': c=[8.4,0.2,3.9*s]; r=[0.95,1.15,1.6]
        if e=='happy': c=[8.6,0.6,3.9*s]; r=[0.7,0.55,1.6]
        if e=='down': c=[8.4,-0.1,3.9*s]; r=[0.95,1.05,1.6]
        if e=='wide': r=[1.2,2.6,1.75]
        pr.append(ell(H(c),r,Rh,mat='eyeline',tag='eye' if e in('open','wide','half','down') else None))
        if P.get('glasses'):
            ce=np.array([8.1,0.9,3.9*s]); nrm=ce/np.linalg.norm(ce)
            a1=np.cross(nrm,[0,1,0]); a1/=np.linalg.norm(a1); a2=np.cross(nrm,a1)
            for k in range(22):
                t=2*math.pi*k/22; v=ce+nrm*0.9+2.7*(math.cos(t)*a1+math.sin(t)*a2)
                pr.append(ell(H(v),[0.36]*3,mat='glass'))
    if P.get('glasses'):
        for z in np.linspace(-1.2,1.2,6): pr.append(ell(H([9.0,1.6,z]),[0.34]*3,mat='glass'))
    ed=P['earDown']
    for s in (1,-1):
        base=np.array([0.8,6.4,4.9*s]); tip=np.array([0.4,13.2,7.0*s])*(1-ed)+np.array([-4.0,8.0,10.0*s])*ed
        fwd=Rh@np.array([1,0,0.35*s]); fwd/=np.linalg.norm(fwd)
        for q in chain(H(base),H(tip),3.4,0.6,tag='ear',step=0.45):
            q['fwd']=fwd; pr.append(q)
    for k,L_ in P['legs'].items():
        J,K,Pw=[np.array(v,float) for v in L_]
        r0=3.0 if k[0]=='b' else 2.6
        pr+=chain(J,K,r0,2.3,tag='leg',seg='upper',body=True,leg=k); pr+=chain(K,Pw+[0,0.6,0],2.3,2.0,tag='leg',seg='lower',leg=k)
        pr.append(ell(Pw+[0.9,0,0],[2.8,1.7,2.3],mat='cream',tag='paw',leg=k))
    pts=np.array(P['tail'],float); ts=np.linspace(0,1,30)
    curve=[((1-t)**3)*pts[0]+3*((1-t)**2)*t*pts[1]+3*(1-t)*t*t*pts[2]+t**3*pts[3] for t in ts]
    for i,c in enumerate(curve):
        r=2.4-0.9*i/len(curve); pr.append(ell(c,[r]*3,tag='tail',idx=i,n=len(curve)))
    pp=P.get('props') or {}
    if pp.get('book'):
        bx,by,bz=pp['book']
        pr.append(box([bx,by,bz],[7.4,0.55,5.0],mat='book'))
        pr.append(box([bx-3.7,by+1.0,bz],[3.5,0.6,4.6],pitchR(-6),mat='page',tag='pages'))
        pr.append(box([bx+3.7,by+1.0,bz],[3.5,0.6,4.6],pitchR(6),mat='page',tag='pages'))
        if pp.get('page') is not None:
            th=pp['page']; sp=np.array([bx,by+1.5,bz]); Rp=pitchR(th)
            pr.append(box(sp+Rp@np.array([3.4,0,0]),[3.4,0.18,4.5],Rp,mat='page'))
    if pp.get('bowl'):
        bx,by,bz=pp['bowl']; pr.append(ell([bx,by,bz],[5.6,2.6,5.6],mat='bowl')); pr.append(ell([bx,by+2.1,bz],[4.4,1.0,4.4],mat='food'))
    if pp.get('yarn'):
        x,y,z,spin=pp['yarn']; pr.append(ell([x,y,z],[3.6]*3,mat='yarn',tag='yarn',spin=spin))
    if pp.get('tear') is not None:
        t=pp['tear']; pr.append(ell(H([8.2,-1.2-3.0*t,4.6]),[0.7,1.0,0.7],mat='tear'))
    # ---------- outfits ----------
    O_=[]
    if outfit=='beanie':
        O_.append(ell(H([-0.6,2.2,0]),[9.9,9.4,10.3],Rh,mat='beanie',tag='beanie',clip=(0.3,1.01)))
        O_.append(ell(H([-0.6,2.2,0]),[10.5,9.9,10.9],Rh,mat='knit',tag='cuff',clip=(0.28,0.5)))
        O_.append(ell(H([-1.0,12.3,0]),[2.7]*3,mat='knit',tag='pom'))
    elif outfit=='scarf':
        axis=hc-C; axis/=np.linalg.norm(axis); a1=np.cross(axis,[0,0,1.]); a1/=np.linalg.norm(a1); a2=np.cross(axis,a1)
        ctr=C*0.45+hc*0.55-axis*2.2
        for k in range(40):
            t=2*math.pi*k/40; v=ctr+5.6*(math.cos(t)*a1+math.sin(t)*a2)
            O_.append(ell(v,[2.0]*3,mat='scarf' if (k//4)%2==0 else 'scarf2'))
        front=ctr+5.6*a1*np.sign(a1[0] if abs(a1[0])>0.1 else 1)+np.array([0.5,0,3.0])
        for j,q in enumerate(chain(front,front+np.array([1.2,-6.0,1.0]),1.8,1.6,step=0.5)):
            q['mat']='scarf' if (j//3)%2==0 else 'scarf2'; O_.append(q)
    elif outfit=='bow':
        b=np.array([4.2,6.6,4.6])
        Rb=Rh@yawR(-25)@rollR(-30)
        O_.append(ell(H(b),[1.5,1.5,1.5],Rb,mat='bow'))
        O_.append(ell(H(b)+Rb@np.array([0,0.6,2.6]),[1.4,2.2,2.9],Rb,mat='bow'))
        O_.append(ell(H(b)+Rb@np.array([0,0.6,-2.6]),[1.4,2.2,2.9],Rb,mat='bow'))
    elif outfit=='hoodie':
        for p in pr:
            if p.get('body'):
                q=dict(p); q['mat']='hoodie'; q['tag']='hood_body'; q['r']=p['r']*1.04; q['M']=np.diag(1/q['r'])@p['R'].T; O_.append(q)
        O_.append(ell(H([-4.6,0.2,0]),[6.4,7.6,9.8],Rh,mat='hoodie2',tag='hood'))
    elif outfit=='flowers':
        cols=['flowerA','flowerB','flowerC']
        for k in range(16):
            t=2*math.pi*k/16; v=np.array([-0.3+6.9*math.cos(t),6.7+0.6*math.sin(t*2),7.5*math.sin(t)])
            if k%2==0: O_.append(ell(H(v),[2.1]*3,mat=cols[(k//2)%3],tag='flower'))
            else: O_.append(ell(H(v*0.98+[0,-0.3,0]),[1.5,0.9,1.5],Rh,mat='leaf'))
    for q in O_: q['outfit']=True
    return pr+O_

def frac(x): return x-np.floor(x)
def roles(p,q,nq,n,ndl,breed):
    k=len(q); tag=p.get('tag'); r=np.array([p['mat']]*k,dtype=object); B=BREEDS[breed]
    qn=q/(np.linalg.norm(q,axis=1,keepdims=True)+1e-9)
    if tag in ('hips','chest'):
        if B.get('stripes'): r[(qn[:,1]>0.05)&(frac(q[:,0]*2.0+0.3)<0.3)]='stripe'
        r[qn[:,1]<-0.45]='cream'
        if tag=='chest': r[(qn[:,0]>0.4)&(qn[:,1]<0.45)]='cream'
    elif tag=='head':
        if B.get('stripes'): r[(qn[:,1]>0.5)&(qn[:,0]>-0.35)&(np.abs(qn[:,2])<0.5)&(frac(qn[:,2]*4.5+0.5)<0.38)]='stripe'
        r[(qn[:,1]<-0.5)&(qn[:,0]>0.0)]='cream'
        if not B.get('points'):
            bl=(qn[:,0]>0.3)&(((qn[:,1]+0.24)/0.13)**2+((np.abs(qn[:,2])-0.66)/0.15)**2<1)
            r[bl]='blush'
    elif tag=='tail':
        i,nn=p['idx'],p['n']
        if B.get('stripes'):
            if i>nn-6: r[:]='cream'
            elif (i//5)%2==1: r[:]='stripe'
        elif breed=='tuxedo' and i>nn-4: r[:]='cream'
    elif tag=='ear':
        r[(n@p['fwd']>0.3)&(p['idx']<p['n']-2)]='pink'
    elif tag=='eye':
        rr=np.sqrt(qn[:,1]**2*0.7+qn[:,2]**2)
        r[:]='iris'; r[rr<0.5]='pupil'; r[ndl>0.74]='hl'
        r[(qn[:,1]<-0.55)&(rr>=0.5)]='irisd'
    elif tag=='yarn':
        r[frac(qn[:,0]*2+qn[:,1]*1.5+p.get('spin',0))<0.35]='yarnd'
    elif tag in ('beanie',):
        r[frac(qn[:,1]*7)<0.35]='beanie2'
    elif tag=='hood_body':
        r[frac(q[:,0]*1.5+0.2)<0.18]='hoodie2'
    # breed patterns
    if B.get('patches') and tag in ('hips','chest','head','tail','leg','ear') and tag!='muzzle':
        seed={'hips':1.3,'chest':2.1,'head':0.7,'tail':3.3,'leg':4.1,'ear':0.7}[tag]
        if tag=='leg': f=np.full(k,{'fl':-1,'fr':1,'bl':1,'br':-1}[p['leg']]*(0.6 if p['seg']=='upper' else -0.1))
        elif tag=='tail': f=np.full(k,[1.0,1.0,-1.0,0.0][min(3,p['idx']*4//p['n'])])
        else: f=np.sin(qn[:,0]*2.6+seed)*np.sin(qn[:,1]*2.2+seed*1.7)+0.6*np.sin(qn[:,2]*2.9-seed)
        fur=np.isin(r,['fur','stripe'])
        r[fur&(f>0.25)]='patchO'; r[fur&(f<-0.45)]='patchK'
    if B.get('points'):
        if tag=='head': r[(qn[:,0]>0.45)&(r!='pink')]='point'
        if tag=='muzzle': r[:]='point'
        if tag=='ear': r[:]='point'
        if tag=='tail' and p['idx']>6: r[:]='point'
        if tag=='leg' and p.get('seg')=='lower': r[:]='point'
        if tag=='paw': r[:]='point'
    if breed=='tuxedo':
        if tag=='muzzle': r[:]='cream'
        if tag=='head': r[(qn[:,0]>0.55)&(qn[:,1]<-0.1)]='cream'
    return r

def palette(breed):
    B=BREEDS[breed]; pal=dict(BASE)
    for k in ('fur','stripe','cream','patchO','patchK','point'):
        if k in B: pal[k]=B[k]
    pal['iris']=B['iris']; pal['irisd']=[tuple(int(c*0.8) for c in B['iris'][0])]*3
    pal['cream']=B['cream']
    return pal

def shade(info,prims,breed,only=None):
    P=len(info['bt']); rgb=np.zeros((P,3)); pal=palette(breed)
    bi=info['bi']; hit=info['hit']
    band_all=np.where(info['ndl']>0.45,0,np.where(info['ndl']>-0.05,1,2))
    for i in np.unique(bi[hit]):
        p=prims[i]
        if only is not None and not only(p): continue
        sel=np.where(bi==i)[0]
        r=roles(p,info['q'][sel],info['nq'][sel],info['n'][sel],info['ndl'][sel],breed)
        band=band_all[sel]
        for m in set(r):
            mm=r==m; rgb[sel[mm]]=np.array(pal[m])[band[mm]]
        # soft highlight band
        top=(info['ndl'][sel]>0.82)&~np.isin(r,['pupil','hl','eyeline','glass','mouth'])
        rgb[sel[top]]=np.minimum(255,rgb[sel[top]]*1.04+6)
    return rgb
