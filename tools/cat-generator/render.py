import numpy as np, math
S=64; AX,AY=32,52; SCALE=1.22
PHI=math.radians(22)
R_=np.array([1,0,0.]); U_=np.array([0,math.cos(PHI),-math.sin(PHI)]); B_=np.array([0,math.sin(PHI),math.cos(PHI)])
ys,xs=np.mgrid[0:S,0:S]
O=(((xs+0.5-AX)/SCALE)[...,None]*R_+((AY-(ys+0.5))/SCALE)[...,None]*U_+300*B_).reshape(-1,3)
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
    r=np.array(r,float); return dict(k='e',c=np.array(c,float),M=np.diag(1/r)@R.T,R=R,mat=mat,tag=tag,**kw)
def box(c,h,R=None,mat='page',tag=None,**kw):
    R=np.eye(3) if R is None else R
    return dict(k='b',c=np.array(c,float),h=np.array(h,float),R=R,mat=mat,tag=tag,**kw)
def chain(p0,p1,r0,r1,mat='fur',tag=None,step=0.6,**kw):
    p0=np.array(p0,float); p1=np.array(p1,float); n=max(2,int(np.linalg.norm(p1-p0)/step)+1)
    return [ell(p0+(p1-p0)*i/(n-1),[r0+(r1-r0)*i/(n-1)]*3,mat=mat,tag=tag,idx=i,n=n,**kw) for i in range(n)]

PAL=dict(
 fur=[(252,186,122),(240,154,96),(208,118,78)],
 stripe=[(228,136,82),(210,114,70),(180,94,64)],
 cream=[(255,248,234),(246,228,206),(222,196,180)],
 pink=[(252,180,176),(240,154,156),(214,128,136)],
 nose=[(232,124,134),(214,108,122),(190,92,108)],
 eye=[(52,34,42)]*3, mouth=[(120,52,64)]*3,
 book=[(166,140,196),(144,118,176),(116,92,148)],
 page=[(255,251,240),(246,236,216),(222,208,188)],
 bowl=[(166,198,160),(144,178,140),(116,150,118)],
 food=[(200,122,78),(178,102,64),(150,84,54)],
 yarn=[(176,152,210),(154,130,190),(126,104,164)],
 yarnd=[(140,116,176),(122,98,158),(100,80,136)],
 tear=[(160,212,248)]*3, glass=[(72,50,56)]*3,
)
OUT=np.array([74,46,48]); INNER=np.array([128,74,62])

def render(prims,yaw):
    Ry=yawR(yaw); o=O@Ry; d=D@Ry; L=LW@Ry   # world->local (Ry orthonormal: v_local = Ry^T v -> v@Ry)
    N=len(prims); P=S*S
    T=np.full((N,P),np.inf)
    for i,p in enumerate(prims):
        if p['k']=='e':
            M=p['M']; Mo=(o-p['c'])@M.T; Md=M@d
            A=Md@Md; Bq=2*(Mo@Md); C=(Mo*Mo).sum(1)-1; disc=Bq*Bq-4*A*C
            ok=disc>=0; t=np.full(P,np.inf); t[ok]=(-Bq[ok]-np.sqrt(disc[ok]))/(2*A); T[i]=t
        else:
            q0=(o-p['c'])@p['R']; qd=d@p['R']; h=p['h']
            with np.errstate(divide='ignore',invalid='ignore'):
                t1=(-h-q0)/qd; t2=(h-q0)/qd
            t1=np.nan_to_num(t1,nan=-np.inf,posinf=np.inf,neginf=-np.inf); t2=np.nan_to_num(t2,nan=np.inf,posinf=np.inf,neginf=-np.inf)
            # handle parallel axes
            par=np.abs(qd)<1e-9
            for a in range(3):
                if par[a]:
                    inside=np.abs(q0[:,a])<=h[a]; t1[:,a]=np.where(inside,-np.inf,np.inf); t2[:,a]=np.where(inside,np.inf,-np.inf)
            tmin=np.minimum(t1,t2).max(1); tmax=np.maximum(t1,t2).min(1)
            t=np.where(tmin<=tmax,tmin,np.inf); T[i]=t
    idx=T.argmin(0); tbest=T[idx,np.arange(P)]; hit=np.isfinite(tbest)
    img=np.zeros((P,4),np.uint8); depth=np.where(hit,tbest,np.inf)
    for i,p in enumerate(prims):
        sel=np.where(hit&(idx==i))[0]
        if len(sel)==0: continue
        ph=o[sel]+tbest[sel,None]*d
        if p['k']=='e':
            q=(ph-p['c'])@p['M'].T; n=q@p['M']; nq=q
        else:
            q=(ph-p['c'])@p['R']; ax=np.abs(q/p['h']).argmax(1); nq=np.zeros_like(q)
            nq[np.arange(len(sel)),ax]=np.sign(q[np.arange(len(sel)),ax]); n=nq@p['R'].T; q=q/p['h']
        n/=np.linalg.norm(n,axis=1,keepdims=True)+1e-9
        ndl=n@L
        band=np.where(ndl>0.45,0,np.where(ndl>-0.05,1,2))
        mats=shade(p,q,nq,n,ndl,band)
        cols=np.zeros((len(sel),3))
        for m in set(mats):
            if m=='__hl': cols[mats==m]=(255,255,255); continue
            pal=np.array(PAL[m]); mm=mats==m; cols[mm]=pal[band[mm]]
        img[sel,:3]=cols; img[sel,3]=255
    img=img.reshape(S,S,4); depth=depth.reshape(S,S); hitm=hit.reshape(S,S)
    out=img.copy()
    # inner lines: depth jumps
    for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)):
        nd=np.full_like(depth,np.inf); nh=np.zeros_like(hitm)
        ys0=slice(max(dy,0),S+min(dy,0)); ys1=slice(max(-dy,0),S+min(-dy,0))
        xs0=slice(max(dx,0),S+min(dx,0)); xs1=slice(max(-dx,0),S+min(-dx,0))
        nd[ys1,xs1]=depth[ys0,xs0]; nh[ys1,xs1]=hitm[ys0,xs0]
        with np.errstate(invalid='ignore'): edge=hitm&nh&(depth-nd>2.8)
        out[edge,:3]=INNER
    # outer outline
    m=hitm; dil=np.zeros_like(m)
    dil[1:,:]|=m[:-1,:]; dil[:-1,:]|=m[1:,:]; dil[:,1:]|=m[:,:-1]; dil[:,:-1]|=m[:,1:]
    ring=dil&~m; out[ring,:3]=OUT; out[ring,3]=255
    return out

def frac(x): return x-np.floor(x)
def shade(p,q,nq,n,ndl,band):
    k=len(q); tag=p.get('tag'); mat=np.array([p['mat']]*k,dtype=object)
    if tag in ('hips','chest'):
        qn=q/ (np.linalg.norm(q,axis=1,keepdims=True)+1e-9)
        st=(qn[:,1]>0.05)&(frac(q[:,0]*2.0+0.3)<0.3)
        mat[st]='stripe'
        mat[qn[:,1]<-0.45]='cream'
        if tag=='chest': mat[(qn[:,0]>0.4)&(qn[:,1]<0.45)]='cream'
    elif tag=='head':
        qn=q/(np.linalg.norm(q,axis=1,keepdims=True)+1e-9)
        st=(qn[:,1]>0.5)&(qn[:,0]>-0.35)&(np.abs(qn[:,2])<0.5)&(frac(qn[:,2]*4.5+0.5)<0.38)
        mat[st]='stripe'
        mat[(qn[:,1]<-0.5)&(qn[:,0]>0.0)]='cream'
        bl=(qn[:,0]>0.42)&(qn[:,1]>-0.42)&(qn[:,1]<0.02)&(np.abs(qn[:,2])>0.52)
        mat[bl]='pink'
    elif tag=='tail':
        i,nn=p['idx'],p['n']
        if i>nn-5: mat[:]='cream'
        elif (i//4)%2==1: mat[:]='stripe'
    elif tag=='ear':
        fwd=p['fwd']; inner=(n@fwd>0.3)&(p['idx']<p['n']-2)
        mat[inner]='pink'
    elif tag=='eye':
        hl=(ndl>0.72); mat[hl]='__hl'
    elif tag=='yarn':
        qn=q/(np.linalg.norm(q,axis=1,keepdims=True)+1e-9)
        mat[frac(qn[:,0]*2+qn[:,1]*1.5+p.get('spin',0))<0.35]='yarnd'
    elif tag=='pages':
        mat[(frac(q[:,0]*3)<0.12)&(nq[:,1]>0.5)]='page'
    return mat

def project(p,yaw):
    w=yawR(yaw)@np.array(p,float)
    return AX+SCALE*(w@R_), AY-SCALE*(w@U_)
