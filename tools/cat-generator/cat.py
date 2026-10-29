import numpy as np, math, copy
from render import *

HEAD_R=(9.0,8.4,9.4)
def build(P):
    pr=[]
    # body
    Rb=pitchR(P['bodyPitch'])
    pr.append(ell(P['H'],P['Hr'],Rb,tag='hips'))
    pr.append(ell(P['C'],P['Cr'],pitchR(P['chestPitch']),tag='chest'))
    hc=np.array(P['head'],float)
    neck=(np.array(P['C'])*0.55+hc*0.45)
    pr.append(ell(neck,[4.6,4.8,4.6],tag='chest'))
    # head
    Rh=yawR(P['hyaw'])@pitchR(P['hpitch'])@rollR(P.get('hroll',0))
    def H(v): return hc+Rh@np.array(v,float)
    pr.append(ell(hc,HEAD_R,Rh,tag='head'))
    pr.append(ell(H([6.4,-2.9,0]),[3.7,2.8,4.3],Rh,mat='cream'))
    pr.append(ell(H([9.9,-1.4,0]),[1.0,0.8,1.3],Rh,mat='nose'))
    if P['mouth']=='open':
        pr.append(ell(H([9.0,-4.3,0]),[1.3,1.4,1.8],Rh,mat='mouth'))
    # eyes
    for s in (1,-1):
        e=P['eye']; c=[8.1,0.9,3.9*s]; r=[1.15,2.3,1.6]
        if e=='closed': c=[8.6,0.0,3.9*s]; r=[0.7,0.5,1.7]
        if e=='half': c=[8.4,0.2,3.9*s]; r=[0.95,1.15,1.6]
        if e=='happy': c=[8.6,0.6,3.9*s]; r=[0.7,0.55,1.6]
        if e=='down': c=[8.4,-0.1,3.9*s]; r=[0.95,1.05,1.6]
        if e=='wide': r=[1.2,2.6,1.75]
        pr.append(ell(H(c),r,Rh,mat='eye',tag='eye' if e in('open','wide','half','down') else None))
        if e=='sad':
            pass
        if P.get('glasses'):
            ce=np.array([8.1,0.9,3.9*s]); nrm=ce/np.linalg.norm(ce)
            a1=np.cross(nrm,[0,1,0]); a1/=np.linalg.norm(a1); a2=np.cross(nrm,a1)
            for k in range(14):
                t=2*math.pi*k/14; v=ce+nrm*0.9+2.7*(math.cos(t)*a1+math.sin(t)*a2)
                pr.append(ell(H(v),[0.42]*3,mat='glass'))
    if P.get('glasses'):
        for z in np.linspace(-1.2,1.2,4): pr.append(ell(H([9.0,1.6,z]),[0.4]*3,mat='glass'))
    if P['eye']=='sad':
        for s in (1,-1):
            for k,(x,y,z) in enumerate([(8.1,0.2,2.6),(8.0,0.5,3.6),(7.8,0.9,4.6)]):
                pass
    # ears
    ed=P['earDown']
    for s in (1,-1):
        base=np.array([0.8,6.4,4.9*s]); tip=np.array([0.4,13.2,7.0*s])*(1-ed)+np.array([-4.0,8.0,10.0*s])*ed
        fwd=Rh@np.array([1,0,0.35*s]); fwd/=np.linalg.norm(fwd)
        for e in chain(H(base),H(tip),3.4,0.6,tag='ear',step=0.5):
            e['fwd']=fwd; pr.append(e)
    # legs
    for k,L_ in P['legs'].items():
        J,K,Pw=[np.array(v,float) for v in L_]
        r0=3.0 if k[0]=='b' else 2.6
        pr+=chain(J,K,r0,2.3,tag='leg'); pr+=chain(K,Pw+[0,0.6,0],2.3,2.0,tag='leg')
        pr.append(ell(Pw+[0.9,0,0],[2.8,1.7,2.3],mat='cream'))
    # tail (bezier through 4 pts)
    pts=np.array(P['tail'],float); ts=np.linspace(0,1,22)
    curve=[((1-t)**3)*pts[0]+3*((1-t)**2)*t*pts[1]+3*(1-t)*t*t*pts[2]+t**3*pts[3] for t in ts]
    for i,c in enumerate(curve):
        r=2.4-0.9*i/len(curve); pr.append(ell(c,[r]*3,tag='tail',idx=i,n=len(curve)))
    # props
    pp=P.get('props',{})
    if pp.get('book'):
        bx,by,bz=pp['book']
        pr.append(box([bx,by,bz],[7.4,0.55,5.0],mat='book'))
        pr.append(box([bx-3.7,by+1.0,bz],[3.5,0.6,4.6],pitchR(-6),mat='page',tag='pages'))
        pr.append(box([bx+3.7,by+1.0,bz],[3.5,0.6,4.6],pitchR(6),mat='page',tag='pages'))
        if pp.get('page') is not None:
            th=pp['page']; sp=np.array([bx,by+1.5,bz]); Rp=pitchR(th)
            pr.append(box(sp+Rp@np.array([3.4,0,0]),[3.4,0.18,4.5],Rp,mat='page'))
    if pp.get('bowl'):
        bx,by,bz=pp['bowl']
        pr.append(ell([bx,by,bz],[5.6,2.6,5.6],mat='bowl'))
        pr.append(ell([bx,by+2.1,bz],[4.4,1.0,4.4],mat='food'))
    if pp.get('yarn'):
        x,y,z,spin=pp['yarn']; pr.append(ell([x,y,z],[3.6]*3,mat='yarn',tag='yarn',spin=spin))
    if pp.get('tear') is not None:
        t=pp['tear']; pr.append(ell(H([8.2,-1.2-3.0*t,4.6]),[0.7,1.0,0.7],mat='tear'))
    return pr

STAND=dict(yaw=35,H=[-6,12,0],Hr=[8.2,7,6.6],bodyPitch=0,C=[5,13,0],Cr=[8.2,7.4,6.3],chestPitch=0,
  head=[13.5,21.5,0],hyaw=0,hpitch=0,hroll=0,glasses=False,earDown=0,eye='open',mouth='closed',
  legs=dict(fl=[[7,9,3.5],[7.5,5,3.5],[8,1.7,3.5]],fr=[[7,9,-3.5],[7.5,5,-3.5],[8,1.7,-3.5]],
            bl=[[-8,10,3.8],[-5.5,6,3.8],[-8.5,1.7,3.8]],br=[[-8,10,-3.8],[-5.5,6,-3.8],[-8.5,1.7,-3.8]]),
  tail=[[-13,15,0],[-20,17,0],[-21,26,0],[-17,32,0]],props={})
SIT=dict(yaw=35,H=[-4,8,0],Hr=[8.6,7.6,7.4],bodyPitch=0,C=[1.5,15.5,0],Cr=[8.0,7.6,6.4],chestPitch=60,
  head=[5,27.5,0],hyaw=0,hpitch=0,hroll=0,glasses=False,earDown=0,eye='open',mouth='closed',
  legs=dict(fl=[[4,12,3.3],[5,6,3.3],[5.5,1.7,3.3]],fr=[[4,12,-3.3],[5,6,-3.3],[5.5,1.7,-3.3]],
            bl=[[-5,7,5.6],[-1.5,3.5,6.2],[1.5,1.7,5.6]],br=[[-5,7,-5.6],[-1.5,3.5,-6.2],[1.5,1.7,-5.6]]),
  tail=[[-11,4,0],[-16,1.6,4],[-12,1.6,10],[-4,1.6,11]],props={})
