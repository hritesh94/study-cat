import numpy as np, math
S=128; SS=2; SI=S*SS                      # final size, supersample, internal size
UNIT=2.44                                 # final pixels per model unit
AXf,AYf=64,104                            # final anchor (feet)
SC=UNIT*SS; AXi,AYi=AXf*SS,AYf*SS
PHI=math.radians(22)
R_=np.array([1,0,0.]); U_=np.array([0,math.cos(PHI),-math.sin(PHI)]); B_=np.array([0,math.sin(PHI),math.cos(PHI)])
def _grid():
    global O
    ys,xs=np.mgrid[0:SI,0:SI]
    O=((((xs+0.5-AXi)/SC)[...,None]*R_+((AYi-(ys+0.5))/SC)[...,None]*U_+400*B_)).reshape(-1,3)
_grid()
def configure(size,ax,ay):
    global S,SI,AXf,AYf,AXi,AYi
    S=size; SI=S*SS; AXf,AYf=ax,ay; AXi,AYi=AXf*SS,AYf*SS; _grid()
D=-B_
LW=np.array([-0.3,0.78,0.6]); LW/=np.linalg.norm(LW)

def yawR(a):
    a=math.radians(a); c,s=math.cos(a),math.sin(a); return np.array([[c,0,-s],[0,1,0],[s,0,c]])
def pitchR(a):
    a=math.radians(a); c,s=math.cos(a),math.sin(a); return np.array([[c,-s,0],[s,c,0],[0,0,1]])
def rollR(a):
    a=math.radians(a); c,s=math.cos(a),math.sin(a); return np.array([[1,0,0],[0,c,-s],[0,s,c]])

def ell(c,r,R=None,mat='fur',tag=None,**kw):
    R=np.eye(3) if R is None else R
    r=np.array(r,float); return dict(k='e',c=np.array(c,float),r=r,M=np.diag(1/r)@R.T,R=R,mat=mat,tag=tag,**kw)
def box(c,h,R=None,mat='page',tag=None,**kw):
    R=np.eye(3) if R is None else R
    return dict(k='b',c=np.array(c,float),h=np.array(h,float),R=R,mat=mat,tag=tag,**kw)
def cyl(c,rx,rz,h,R=None,mat='fur',tag=None,hollow=False,**kw):
    R=np.eye(3) if R is None else R
    return dict(k='c',c=np.array(c,float),rx=rx,rz=rz,h=h,R=R,mat=mat,tag=tag,hollow=hollow,r=np.array([rx,h,rz],float),**kw)
def chain(p0,p1,r0,r1,mat='fur',tag=None,step=0.55,**kw):
    p0=np.array(p0,float); p1=np.array(p1,float); n=max(2,int(np.linalg.norm(p1-p0)/step)+1)
    return [ell(p0+(p1-p0)*i/(n-1),[r0+(r1-r0)*i/(n-1)]*3,mat=mat,tag=tag,idx=i,n=n,**kw) for i in range(n)]

def project(p,yaw):
    w=yawR(yaw)@np.array(p,float); return AXf+UNIT*(w@R_), AYf-UNIT*(w@U_)

def trace(prims,yaw):
    Ry=yawR(yaw); o=O@Ry; d=D@Ry; L=LW@Ry
    P=SI*SI; bt=np.full(P,np.inf); bi=np.full(P,-1)
    for i,p in enumerate(prims):
        w=Ry@p['c']; cx=AXi+SC*(w@R_); cy=AYi-SC*(w@U_)
        rad=SC*(p['r'].max() if p['k']=='e' else (np.linalg.norm(p['r']) if p['k']=='c' else np.linalg.norm(p['h'])))+3
        x0,x1=max(0,int(cx-rad)),min(SI,int(cx+rad)+1); y0,y1=max(0,int(cy-rad)),min(SI,int(cy+rad)+1)
        if x0>=x1 or y0>=y1: continue
        sub=(np.arange(y0,y1)[:,None]*SI+np.arange(x0,x1)[None,:]).ravel()
        os_=o[sub]
        if p['k']=='e':
            M=p['M']; Mo=(os_-p['c'])@M.T; Md=M@d
            A=Md@Md; Bq=2*(Mo@Md); C=(Mo*Mo).sum(1)-1; disc=Bq*Bq-4*A*C
            ok=disc>=0; sq=np.sqrt(np.where(ok,disc,0))
            t1=(-Bq-sq)/(2*A); t=np.where(ok,t1,np.inf)
            if 'clip' in p:
                lo,hi=p['clip']; t2=(-Bq+sq)/(2*A)
                y1_=(Mo[:,1]+t1*Md[1]); y2_=(Mo[:,1]+t2*Md[1])   # unit-space y (axis 1 of R)
                c1=ok&(y1_>=lo)&(y1_<=hi); c2=ok&(y2_>=lo)&(y2_<=hi)
                t=np.where(c1,t1,np.where(c2,t2,np.inf))
        elif p['k']=='c':
            q0=(os_-p['c'])@p['R']; qd=d@p['R']; rx,rz,hh=p['rx'],p['rz'],p['h']
            X0,Z0=q0[:,0]/rx,q0[:,2]/rz; DX,DZ=qd[0]/rx,qd[2]/rz
            A=DX*DX+DZ*DZ; Bq=2*(X0*DX+Z0*DZ); C=X0*X0+Z0*Z0-1; disc=Bq*Bq-4*A*C
            ok=disc>=0; sq=np.sqrt(np.where(ok,disc,0))
            t1=(-Bq-sq)/(2*A); t2=(-Bq+sq)/(2*A)
            y1=q0[:,1]+t1*qd[1]; y2=q0[:,1]+t2*qd[1]
            v1=ok&(np.abs(y1)<=hh); v2=ok&(np.abs(y2)<=hh)
            cands=[np.where(v1,t1,np.inf)]
            def cap(yv):
                with np.errstate(divide='ignore',invalid='ignore'):
                    tt=(yv-q0[:,1])/qd[1]
                inside=(X0+tt*DX)**2+(Z0+tt*DZ)**2<=1
                return np.where(inside&np.isfinite(tt),tt,np.inf)
            if p['hollow']:
                cands+= [np.where(v2,t2,np.inf), cap(-hh)]
            else:
                cands+= [cap(hh), cap(-hh)]
            t=np.minimum.reduce(cands)
        else:
            q0=(os_-p['c'])@p['R']; qd=d@p['R']; h=p['h']
            with np.errstate(divide='ignore',invalid='ignore'):
                ta=(-h-q0)/qd; tb=(h-q0)/qd
            lo=np.minimum(ta,tb); hi=np.maximum(ta,tb)
            for a in range(3):
                if abs(qd[a])<1e-9:
                    inside=np.abs(q0[:,a])<=h[a]; lo[:,a]=np.where(inside,-np.inf,np.inf); hi[:,a]=np.where(inside,np.inf,-np.inf)
            tmin=lo.max(1); tmax=hi.min(1); t=np.where(tmin<=tmax,tmin,np.inf)
        better=t<bt[sub]; bt[sub[better]]=t[better]; bi[sub[better]]=i
    hit=bi>=0
    info=dict(bt=bt,bi=bi,hit=hit,q=np.zeros((P,3)),nq=np.zeros((P,3)),n=np.zeros((P,3)),ndl=np.zeros(P))
    for i in np.unique(bi[hit]):
        p=prims[i]; sel=np.where(bi==i)[0]; ph=o[sel]+bt[sel,None]*d
        if p['k']=='e':
            q=(ph-p['c'])@p['M'].T; n=q@p['M']; nq=q.copy()
            if 'clip' in p:   # inside of a clipped shell: flip normal
                inner=(n@d)>0; n[inner]*=-1
        elif p['k']=='c':
            ql=(ph-p['c'])@p['R']; rx,rz,hh=p['rx'],p['rz'],p['h']
            capm=np.abs(np.abs(ql[:,1])-hh)<1e-3*max(1,hh)+1e-4
            nl=np.stack([ql[:,0]/rx**2,np.zeros(len(sel)),ql[:,2]/rz**2],1)
            nl[capm]=np.stack([np.zeros(capm.sum()),np.sign(ql[capm,1]),np.zeros(capm.sum())],1)
            n=nl@p['R'].T; n[(n@d)>0]*=-1
            q=np.stack([ql[:,0]/rx,ql[:,1]/hh,ql[:,2]/rz],1); nq=nl
        else:
            q=(ph-p['c'])@p['R']; ax=np.abs(q/p['h']).argmax(1); nq=np.zeros_like(q)
            nq[np.arange(len(sel)),ax]=np.sign(q[np.arange(len(sel)),ax]); n=nq@p['R'].T; q=q/p['h']
        n/=np.linalg.norm(n,axis=1,keepdims=True)+1e-9
        info['q'][sel]=q; info['nq'][sel]=nq; info['n'][sel]=n; info['ndl'][sel]=n@L
    return info

def shifts(r):
    return [(dy,dx) for dy in range(-r,r+1) for dx in range(-r,r+1) if (dy or dx) and dy*dy+dx*dx<=r*r+0.5]
def shift(a,dy,dx,fill):
    out=np.full_like(a,fill)
    ys0=slice(max(dy,0),SI+min(dy,0)); ys1=slice(max(-dy,0),SI+min(-dy,0))
    xs0=slice(max(dx,0),SI+min(dx,0)); xs1=slice(max(-dx,0),SI+min(-dx,0))
    out[ys1,xs1]=a[ys0,xs0]; return out

OUT=np.array([70,44,48]); INNER=np.array([122,72,62])
def finish(rgb,info,layer=None,outer=True,inner=True):
    """rgb: (P,3) float. layer: bool mask (P,) of pixels that belong to the output layer (None = everything)."""
    hit=info['hit'].reshape(SI,SI); depth=np.where(info['hit'],info['bt'],np.inf).reshape(SI,SI)
    img=rgb.reshape(SI,SI,3).copy(); alpha=hit.astype(float)
    lay=hit if layer is None else layer.reshape(SI,SI)
    # inner lines (depth jumps), 2px internal
    with np.errstate(invalid='ignore'):
        for dy,dx in (shifts(1) if inner else []):
            nd=shift(depth,dy,dx,np.inf); nh=shift(hit,dy,dx,False)
            e=hit&nh&(depth-nd>2.6); img[e]=INNER
    if layer is not None:
        for dy,dx in shifts(2):
            nl=shift(lay,dy,dx,False); e=lay&~nl&hit
            # layer pixel next to non-layer pixel -> edge line
            img[e]=OUT
    # outer outline (3px internal)
    ring=np.zeros_like(hit)
    for dy,dx in (shifts(3) if outer else []):
        ring|=shift(lay,dy,dx,False)
    ring&=~hit
    img[ring]=OUT
    a=(lay|ring).astype(float)
    # downsample with premultiplied alpha
    pm=img*a[...,None]
    pm=pm.reshape(S,SS,S,SS,3).mean((1,3)); a2=a.reshape(S,SS,S,SS).mean((1,3))
    rgb2=np.where(a2[...,None]>0,pm/np.maximum(a2[...,None],1e-6),0)
    out=np.zeros((S,S,4),np.uint8); out[...,:3]=np.clip(rgb2,0,255); out[...,3]=np.clip(a2*255,0,255)
    return out
