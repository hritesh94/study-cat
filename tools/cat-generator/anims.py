import json, os, copy, math
import numpy as np
from PIL import Image, ImageDraw
from cat import *

def lerp(a,b,t):
    num=lambda v:isinstance(v,(int,float)) and not isinstance(v,bool)
    if num(a) and num(b): return a+(b-a)*t
    if isinstance(a,list) and isinstance(b,list) and len(a)==len(b): return [lerp(x,y,t) for x,y in zip(a,b)]
    if isinstance(a,dict) and isinstance(b,dict):
        ks=set(a)|set(b); return {k:(lerp(a[k],b[k],t) if k in a and k in b else (b.get(k) if t>=0.5 else a.get(k))) for k in ks}
    return b if t>=0.5 else a
def ease(t): return t*t*(3-2*t)
def trans(a,b,n,props=None):
    out=[]
    for i in range(1,n+1):
        p=lerp(a,b,ease(i/n))
        if props is not None: p['props']=copy.deepcopy(props)
        out.append(p)
    return out
def mod(base,**kw):
    p=copy.deepcopy(base); p.update(copy.deepcopy(kw)); return p
def legset(p,k,J=None,K=None,Pw=None):
    L=p['legs'][k]
    if J is not None: L[0]=list(J)
    if K is not None: L[1]=list(K)
    if Pw is not None: L[2]=list(Pw)

A={}; EXTRA={}
# ---- idle ----
A['idle']=[]
for i in range(8):
    s=math.sin(2*math.pi*i/8); p=copy.deepcopy(STAND)
    p['tail'][3][2]+=2.5*s; p['tail'][2][2]+=1.2*s
    p['Hr'][1]+=0.25*s; p['Cr'][1]+=0.25*s; p['hyaw']=4*math.sin(2*math.pi*i/8+1)
    if i==5: p['eye']='closed'
    A['idle'].append(p)
# ---- walk ----
A['walk']=[]
ph0=dict(fl=0,br=0,fr=math.pi,bl=math.pi)
for i in range(8):
    ph=2*math.pi*i/8; p=copy.deepcopy(STAND)
    for k,off in ph0.items():
        J,K,Pw=[np.array(v,float) for v in STAND['legs'][k]]
        q=ph+off; Pn=Pw+np.array([3.4*math.sin(q),2.4*max(0,math.cos(q)),0])
        Kn=K+(Pn-Pw)*0.5+np.array([0,0.6*max(0,math.cos(q)),0])
        legset(p,k,K=Kn,Pw=Pn)
    bob=0.7*math.cos(2*ph)
    for key in ('H','C','head'): p[key][1]+=bob
    for k in p['legs']: p['legs'][k][0][1]+=bob
    p['tail'][3][2]+=2*math.sin(ph); p['tail'][2][2]+=1*math.sin(ph); p['hpitch']=1.5*math.cos(2*ph)
    A['walk'].append(p)
# ---- turn around (standing, right -> left through facing you) ----
A['turn_around']=[]
for i in range(1,8):
    t=ease(i/7); p=copy.deepcopy(STAND); p['yaw']=35+110*t
    p['hyaw']=18*math.sin(math.pi*t)
    st=math.sin(math.pi*t*2)
    for k,sg in (('fl',1),('br',1),('fr',-1),('bl',-1)):
        p['legs'][k][2][1]+=max(0,sg*st)*1.6; p['legs'][k][1][1]+=max(0,sg*st)*0.6
    p['tail'][3][2]+=3*math.sin(math.pi*t)
    A['turn_around'].append(p)
# ---- sitting ----
A['sit_down']=trans(STAND,SIT,6)
A['sit_idle']=[]
for i in range(8):
    s=math.sin(2*math.pi*i/8); p=copy.deepcopy(SIT)
    p['tail'][3][0]+=1.4*s; p['tail'][3][1]+=0.8*max(0,s); p['Cr'][1]+=0.25*s
    if i==5: p['eye']='closed'
    A['sit_idle'].append(p)
A['stand_up']=list(reversed([STAND]+A['sit_down'][:-1]))
A['look_at_you']=[]
for i,(hy,e) in enumerate([(12,'open'),(28,'open'),(42,'open'),(50,'open'),(50,'closed'),(50,'open'),(50,'happy'),(40,'open'),(22,'open'),(6,'open')]):
    p=copy.deepcopy(SIT); p['hyaw']=hy; p['eye']=e; p['hroll']=-8*math.sin(math.pi*i/9)
    A['look_at_you'].append(p)
FRONT=mod(SIT,yaw=90)
A['turn_front']=trans(SIT,FRONT,5)
A['sit_front']=[]
for i in range(8):
    s=math.sin(2*math.pi*i/8); p=copy.deepcopy(FRONT)
    p['tail'][3][0]+=1.6*s; p['hroll']=4*s; p['Cr'][1]+=0.25*s
    if i==6: p['eye']='closed'
    A['sit_front'].append(p)
A['meow']=[]
for i,(m,e,r) in enumerate([('closed','open',0),('open','happy',-6),('open','happy',-10),('open','happy',-8),('closed','happy',-4),('closed','open',0)]):
    p=copy.deepcopy(FRONT); p['mouth']=m; p['eye']=e; p['hroll']=r; p['hpitch']=6 if m=='open' else 0
    A['meow'].append(p)
A['turn_back']=list(reversed([SIT]+A['turn_front'][:-1]))
# ---- studying ----
BOOK=dict(book=[16.5,12,0])
READ=mod(SIT,C=[3,15.5,0],chestPitch=45,head=[9,26.5,0],hpitch=-18,eye='down',glasses=True,props=BOOK)
legset(READ,'fl',J=[6,13.5,3.3],K=[9.5,13,3.7],Pw=[12.5,13.6,3.4])
legset(READ,'fr',J=[6,13.5,-3.3],K=[9.5,13,-3.7],Pw=[12.5,13.6,-3.4])
SITB=mod(SIT,props=BOOK,glasses=True)
A['read_start']=trans(SITB,READ,5,props=BOOK)
A['read']=[]
for i in range(8):
    s=math.sin(2*math.pi*i/8); p=copy.deepcopy(READ)
    p['hyaw']=7*s; p['tail'][3][0]+=1.2*s
    if i==6: p['eye']='closed'
    A['read'].append(p)
A['page_turn']=[]
for i,th in enumerate([0,25,60,95,130,160,180,180]):
    p=copy.deepcopy(READ); p['props']=dict(book=BOOK['book'],page=th)
    sp=np.array([16.5,13.5,0]); tip=sp+pitchR(th)@np.array([5.6,0,1.5])
    if 0<i<6:
        legset(p,'fl',Pw=list(tip+[-0.9,0.4,1.4]),K=[10.5,15+1.5*math.sin(math.pi*i/6),3.9])
    if i in (2,3,4): p['eye']='open'; p['hpitch']=-10
    A['page_turn'].append(p)
A['read_end']=list(reversed([SITB]+A['read_start'][:-1]))
# ---- sleep ----
SLEEP=mod(SIT,H=[-2,6.2,0],Hr=[9.2,6.2,7.4],C=[6.5,6.5,-0.5],Cr=[7.6,5.8,6.2],chestPitch=0,
  head=[11.5,9.8,3],hyaw=62,hpitch=2,hroll=10,eye='closed',
  tail=[[-10,5,0],[-13,1.6,8],[0,1.6,12],[9,1.6,10]])
legset(SLEEP,'fl',J=[9,5,3],K=[12,3,3.2],Pw=[14,1.7,3.6]); legset(SLEEP,'fr',J=[9,5,-3],K=[12,3,-3.2],Pw=[14,1.7,-1.5])
legset(SLEEP,'bl',J=[-4,5,4.6],K=[-1,3,5],Pw=[1,1.7,4.8]); legset(SLEEP,'br',J=[-4,5,-4.6],K=[-1,3,-5],Pw=[1,1.7,-4.8])
A['sleep_down']=trans(SIT,SLEEP,7)
A['sleep']=[]
for i in range(6):
    s=math.sin(2*math.pi*i/6); p=copy.deepcopy(SLEEP); p['Hr'][1]+=0.35*s; p['Cr'][1]+=0.3*s; p['zzz']=i
    A['sleep'].append(p)
A['wake_up']=list(reversed([SIT]+A['sleep_down'][:-1]))
# ---- eat ----
EAT=mod(STAND,C=[5,11,0],chestPitch=-14,head=[16,11.5,0],hpitch=-26,hyaw=25,eye='happy',props=dict(bowl=[18.5,2.6,0]))
legset(EAT,'fl',J=[7,8,3.5],K=[8,4.6,3.6]); legset(EAT,'fr',J=[7,8,-3.5],K=[8,4.6,-3.6])
A['eat']=[]
for i in range(8):
    s=math.sin(2*math.pi*i/4); p=copy.deepcopy(EAT); p['head'][1]+=0.8*s; p['hpitch']+=4*s
    p['tail'][3][2]+=2.2*math.sin(2*math.pi*i/8)
    A['eat'].append(p)
# ---- sad ----
SAD=mod(SIT,head=[4.5,25.5,0],hpitch=-20,earDown=1,eye='half',tail=[[-11,4,0],[-17,1.6,1],[-21,1.6,3],[-24,1.6,4]])
A['sad']=[]
for i in range(8):
    p=copy.deepcopy(SAD); p['props']=dict(tear=i/7); p['hroll']=3*math.sin(2*math.pi*i/8)
    if i==4: p['eye']='closed'
    A['sad'].append(p)
# ---- play ----
CROUCH=mod(STAND,H=[-6,11.5,0],bodyPitch=6,C=[5,9.5,0],chestPitch=-10,head=[14.5,16.5,0],hpitch=-10,eye='wide',
  tail=[[-13,14,0],[-19,20,0],[-15,26,2],[-19,31,0]],props=dict(yarn=[21,3.6,3,0]))
legset(CROUCH,'fl',J=[7,7,3.5],K=[8.5,4,3.6]); legset(CROUCH,'fr',J=[7,7,-3.5],K=[8.5,4,-3.6])
A['play']=[]
path=[(8,1.7),(11,6),(15,10),(19,6.5),(17,2.6),(13,1.7),(9,1.7),(8,1.7)]
for i,(x,y) in enumerate(path):
    p=copy.deepcopy(CROUCH); legset(p,'fl',Pw=[x,y,3.6],K=[(7+x)/2+1,(7+y)/2+1.5,3.8])
    p['props']=dict(yarn=[21+[0,0,0,1.2,2,1.5,0.8,0][i],3.6,3,i*0.3])
    p['tail'][3][2]+=2.5*math.sin(math.pi*i/4); p['H'][1]+=0.6*math.sin(math.pi*i/4)
    if i in (3,4): p['eye']='happy'
    A['play'].append(p)
# ---- jump ----
LAUNCH=mod(STAND,bodyPitch=18,chestPitch=22,H=[-6,13,0],C=[5,17,0],head=[14,26,0],hpitch=10,eye='wide',
  tail=[[-13,14,0],[-19,10,0],[-23,9,0],[-27,10,0]])
legset(LAUNCH,'bl',K=[-12,7,3.8],Pw=[-17,3,3.8]); legset(LAUNCH,'br',K=[-12,7,-3.8],Pw=[-17,3,-3.8])
legset(LAUNCH,'fl',J=[8,13,3.5],K=[12,15,3.5],Pw=[15,18,3.5]); legset(LAUNCH,'fr',J=[8,13,-3.5],K=[12,15,-3.5],Pw=[15,18,-3.5])
TUCK=mod(STAND,H=[-5,13,0],C=[5,14,0],head=[13,22,0],eye='wide')
for k,s in (('fl',3.5),('fr',-3.5)): legset(TUCK,k,K=[9,8,s],Pw=[7,6,s])
for k,s in (('bl',3.8),('br',-3.8)): legset(TUCK,k,K=[-3,7,s],Pw=[-7,6,s])
LAND=mod(CROUCH,props={},eye='open')
A['jump']=[mod(CROUCH,props={},eye='open'),LAUNCH,TUCK,STAND,LAND,STAND]

FPS=dict(idle=6,walk=10,turn_around=12,sit_down=12,sit_idle=5,stand_up=12,look_at_you=8,turn_front=12,sit_front=5,
  meow=9,turn_back=12,read_start=10,read=4,page_turn=12,read_end=10,sleep_down=10,sleep=3,wake_up=10,eat=8,sad=5,play=12,jump=12)
LOOP={'idle','walk','sit_idle','sit_front','read','sleep','eat','sad','play'}
NOTE=dict(idle='standing, breathing, small head turns, blink',walk='walk cycle, three-quarter view facing right (flip for left)',
 turn_around='turns from facing right to facing left, through facing you; then flip the sprite and keep walking',
 sit_down='stand -> sit',sit_idle='sitting loop',stand_up='sit -> stand',look_at_you='sitting, turns its head to look at you, blinks, smiles, looks back',
 turn_front='sitting, turns its whole body to face you',sit_front='sitting facing you',meow='facing you, meows (on click)',
 turn_back='facing you -> back to three-quarter sit',read_start='sit -> paws on the book (book and glasses included)',
 read='reading loop',page_turn='paw flips a page',read_end='paws off book -> sit',sleep_down='sit -> curl up',sleep='curled up, breathing, zzz',
 wake_up='curled -> sit',eat='eating from a bowl',sad='ears down, a tear rolls',play='bats a yarn ball',jump='crouch, leap, tuck, land (move the sprite in the engine)')

ZG=[(0,0),(1,0),(2,0),(3,0),(2,1),(1,2),(0,3),(1,3),(2,3),(3,3)]
def overlay(img,P):
    if 'zzz' in P:
        hx,hy=project(np.array(P['head'])+[0,9,0],P['yaw']); t=P['zzz']; d=ImageDraw.Draw(img)
        for j in range(3):
            k=(t//2+j)%3
            if j<=k:
                ox,oy=hx+7+j*4,hy-6-j*5-k
                for a,b in ZG: d.point((round(ox+a),round(oy+b)),fill=(74,46,48,255))
    return img

os.makedirs('out/gif',exist_ok=True)
names=list(A); maxf=max(len(v) for v in A.values())
sheet=Image.new('RGBA',(maxf*S,len(names)*S),(0,0,0,0))
meta=dict(image='study-cat.png',frameWidth=S,frameHeight=S,framesPerRow=maxf,
  origin=dict(x=AX/S,y=AY/S,note='feet touch this point; use sprite.setOrigin(x, y)'),
  deskTopY=round(project([16.5,12.5,0],35)[1]),facing='three-quarter right; flipX for left',animations={})
for r,n in enumerate(names):
    frames=[overlay(Image.fromarray(render(build(P),P['yaw'])),P) for P in A[n]]
    for c,f in enumerate(frames): sheet.alpha_composite(f,(c*S,r*S))
    meta['animations'][n]=dict(start=r*maxf,frames=len(frames),fps=FPS[n],loop=n in LOOP,note=NOTE[n])
    big=[]
    for f in frames:
        bg=Image.new('RGBA',(S,S),(246,233,211,255)); bg.alpha_composite(f)
        big.append(bg.resize((S*5,S*5),Image.NEAREST).convert('P',palette=Image.ADAPTIVE,colors=128))
    big[0].save(f'out/gif/{n}.gif',save_all=True,append_images=big[1:],duration=int(1000/FPS[n]),loop=0)
    print(n,len(frames))
sheet.save('out/study-cat.png'); json.dump(meta,open('out/study-cat.json','w'),indent=2)
prev=Image.new('RGBA',sheet.size,(246,233,211,255)); prev.alpha_composite(sheet)
prev.resize((sheet.width*3,sheet.height*3),Image.NEAREST).save('out/preview_x3.png')
print(sheet.size, meta['deskTopY'])
