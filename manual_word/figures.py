"""Engineering illustrations for the Word manual. SVG masters remain editable."""
from pathlib import Path
import math, textwrap,unicodedata
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Rectangle, Circle, FancyArrowPatch, FancyBboxPatch, Polygon, Arc
import numpy as np

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'figures';OUT.mkdir(exist_ok=True)
FONT=Path('C:/Windows/Fonts/msyh.ttc')
if FONT.exists():font_manager.fontManager.addfont(str(FONT))
plt.rcParams.update({'font.family':'Microsoft YaHei','font.size':10.5,'axes.unicode_minus':False,
                     'svg.fonttype':'none','savefig.facecolor':'white','axes.spines.top':False,'axes.spines.right':False})
BLUE='#234f78';GRAY='#66717c';LIGHT='#f1f4f6';BLACK='#171c20';TEAL='#2d7169';ORANGE='#a46520'

def wrap(t,n=19):
    lines=[]
    for line in str(t).split('\n'):
        buf='';width=0
        for token in __import__('re').findall(r'[A-Za-z0-9_./:+-]+|.',line):
            w=sum(1 if unicodedata.east_asian_width(c) in 'WF' else .52 for c in token)
            if buf and width+w>n:lines.append(buf.rstrip());buf='';width=0
            buf+=token;width+=w
        lines.append(buf.rstrip())
    return '\n'.join(lines)

def canvas(h=3.7):
    fig,ax=plt.subplots(figsize=(7.1,h));fig.subplots_adjust(left=.035,right=.965,top=.97,bottom=.045)
    ax.set(xlim=(0,100),ylim=(0,100));ax.axis('off');return fig,ax

def box(ax,x,y,w,h,label='',size=10.2,fill='white',rounded=False):
    p=FancyBboxPatch((x,y),w,h,boxstyle='round,pad=0,rounding_size=2',lw=.85,fc=fill,ec=BLACK) if rounded else Rectangle((x,y),w,h,lw=.85,fc=fill,ec=BLACK)
    ax.add_patch(p)
    if label:ax.text(x+w/2,y+h/2,wrap(label,max(7,int(w*.45))),ha='center',va='center',fontsize=size,color=BLACK)

def arrow(ax,a,b,label='',curve=0,style='->',color=BLACK,label_offset=(0,3)):
    ax.add_patch(FancyArrowPatch(a,b,arrowstyle=style,mutation_scale=9,lw=.85,color=color,connectionstyle=f'arc3,rad={curve}'))
    if label:ax.text((a[0]+b[0])/2+label_offset[0],(a[1]+b[1])/2+label_offset[1],wrap(label,14),ha='center',va='bottom',fontsize=9,color=color,bbox=dict(fc='white',ec='none',pad=1.2))

def save(fig,key):
    png=OUT/(key+'.png');svg=OUT/(key+'.svg')
    fig.savefig(png,dpi=210);fig.savefig(svg);plt.close(fig)
    svg.write_text('\n'.join(line.rstrip() for line in svg.read_text('utf-8').splitlines())+'\n','utf-8')
    return png

def connect_nodes(ax,nodes,a,b,label):
    """Route relations through the gaps, including diagonal and skipped-row edges."""
    x1,y1,w1,h1=nodes[a];x2,y2,w2,h2=nodes[b]
    if abs(y1-y2)<1:
        s=1 if x2>x1 else -1;arrow(ax,(x1+s*w1/2,y1),(x2-s*w2/2,y2),label);return
    if abs(x1-x2)<1 and abs(y1-y2)<max(h1,h2)*2.6:
        s=1 if y2>y1 else -1;arrow(ax,(x1,y1+s*h1/2),(x2,y2-s*h2/2),label,label_offset=(10,-2));return
    if abs(x1-x2)<1:
        s=1 if x1<50 else -1;g=50
        pts=[(x1+s*w1/2,y1),(g,y1),(g,y2),(x2+s*w2/2,y2)]
        labelpos=(g+2,(y1+y2)/2+2)
    else:
        s=1 if y2>y1 else -1;a1=y1+s*h1/2;b1=y2-s*h2/2;g=(a1+b1)/2
        pts=[(x1,a1),(x1,g),(x2,g),(x2,b1)];labelpos=((x1+x2)/2,g+2)
    ax.plot([p[0] for p in pts[:-1]],[p[1] for p in pts[:-1]],c=BLACK,lw=.85)
    arrow(ax,pts[-2],pts[-1]);ax.text(*labelpos,wrap(label,12),fontsize=8.8,ha='center',va='bottom',bbox=dict(fc='white',ec='none',pad=.6))

def sequence(d,key):
    actors=d['items'];links=d.get('links',[]);n=len(actors)
    fig,ax=canvas(max(3.7,1.35+.47*len(links)))
    xs=np.linspace(12,88,n);w=min(20,70/max(1,n-1))
    for x,label in zip(xs,actors):
        box(ax,x-w/2,87,w,11,str(label).replace('\n',' '),9.5,LIGHT)
        ax.plot([x,x],[5,87],ls=(0,(4,3)),lw=.7,color=GRAY)
    for i,(a,b,label) in enumerate(links):
        y=79-i*(69/max(1,len(links)));x1,x2=xs[a],xs[b]
        if a==b:
            side=-1 if a==n-1 else 1
            ax.plot([x1,x1+side*6,x1+side*6],[y,y,y-4],c=BLACK,lw=.85)
            arrow(ax,(x1+side*6,y-4),(x1,y-4))
            ax.text(x1-side*2,y+2,wrap(label,25),fontsize=9.1,va='bottom',ha='right' if side<0 else 'left')
        else:
            ax.add_patch(Rectangle((x2-1,y-4),2,6,ec=GRAY,fc='#e3e9ee',lw=.6))
            arrow(ax,(x1,y),(x2,y),label,label_offset=(0,2))
    return save(fig,key)

def entity(d,key):
    items=d['items'];n=len(items);cols=2 if n<=4 else 3;rows=math.ceil(n/cols)
    fig,ax=canvas(1.9*rows+.4);centers=[];w=36 if cols==2 else 26;h=36 if rows==2 else 65
    for i,item in enumerate(items):
        data=item if isinstance(item,list) else str(item).split('\n')
        x=4+(i%cols)*(56 if cols==2 else 33);y=56-(i//cols)*48 if rows>1 else 18
        box(ax,x,y,w,h,fill='white');ax.add_patch(Rectangle((x,y+h-10),w,10,fc=LIGHT,ec=BLACK,lw=.8))
        ax.text(x+w/2,y+h-5,wrap(data[0],16 if cols==2 else 11),ha='center',va='center',fontsize=10.5,fontweight='bold')
        detail='\n'.join('+ '+str(v).replace('\n',' ') for v in data[1:]) or '结构与关联见正文'
        ax.text(x+2,y+h-14,wrap(detail,16 if cols==2 else 11),va='top',fontsize=9.4,linespacing=1.6)
        centers.append((x+w/2,y+h/2,w,h))
    for a,b,label in d.get('links',[]):
        if a>=n or b>=n:continue
        connect_nodes(ax,centers,a,b,label)
    return save(fig,key)

def state(d,key):
    items=d['items'];n=len(items);fig,ax=canvas(3.7)
    pos=([(15,50),(50,84),(50,50),(50,16),(85,50)] if n==5 else [(20,77),(76,77),(20,24),(76,24),(48,50),(48,7)])[:n]
    if key=='fig-03-02':pos=[(15,84),(52,84),(85,50),(52,16),(15,50)]
    half=13 if n==5 else 17
    for (x,y),label in zip(pos,items):box(ax,x-half,y-8,half*2,16,label,9.7,LIGHT,True)
    ax.add_patch(Circle((3,94),1.1,color=BLACK));arrow(ax,(4,94),(pos[0][0],pos[0][1]+9))
    for a,b,label in d.get('links',[]):
        if a>=n or b>=n:continue
        x1,y1=pos[a];x2,y2=pos[b]
        dx,dy=x2-x1,y2-y1
        if a==b:continue
        scale1=min(half/abs(dx) if dx else 100,8/abs(dy) if dy else 100)
        A=(x1+dx*scale1,y1+dy*scale1);B=(x2-dx*scale1,y2-dy*scale1)
        reverse=any(aa==b and bb==a for aa,bb,_ in d.get('links',[]))
        arrow(ax,A,B,label,curve=.15 if reverse else 0,label_offset=(0,4 if a<b else -6))
    return save(fig,key)

def plot(d,key):
    fig,ax=plt.subplots(figsize=(7.1,3.8));fig.subplots_adjust(left=.12,right=.97,top=.94,bottom=.19)
    for i,s in enumerate(d['series']):ax.plot(d['x'],s['y'],marker=['o','s','^'][i%3],ms=4,lw=1.35,color=[BLUE,TEAL,ORANGE][i%3],label=s['name'])
    ax.set_xlabel(d.get('xlabel',''));ax.set_ylabel(d.get('ylabel',''));ax.grid(alpha=.22,lw=.6)
    ax.legend(fontsize=9.1,frameon=False,loc='best');return save(fig,key)

def dependency(key):
    fig,ax=canvas(4.3)
    box(ax,3,70,42,24,'Headwind aircraft\n41eace79ed44\nhdw-common / hdw-a339x',10.4)
    box(ax,55,70,42,24,'FlyByWire aircraft\n1bf4b8edccf8\nfbw-common / fbw-a32nx',10.4)
    box(ax,26,38,48,20,'A330EFB 生成目录\nbuild-common / build-a339x',11,LIGHT)
    box(ax,3,3,41,20,'本地源码\nlocal-efb / local-extensions',10.4)
    box(ax,58,3,39,20,'静态产物\nlocal-efb/dist',10.8)
    arrow(ax,(24,70),(39,58),'固定引用');arrow(ax,(76,70),(61,58),'固定引用')
    arrow(ax,(44,13),(58,13),'Vite 构建');arrow(ax,(66,38),(77,23),'模块解析')
    ax.text(5,51,'补丁在生成目录应用',fontsize=9.2,color=GRAY)
    return save(fig,key)

def deployment(key,extended=False):
    fig,ax=canvas(4.3)
    ax.add_patch(Rectangle((2,3),96,94,ec=BLACK,fc='white',lw=1.15))
    ax.text(5,92,'«device»  本地工作站',fontsize=11.5,fontweight='bold')
    box(ax,7,53,39,29,'«executionEnvironment»\n浏览器\nReact EFB / 演示控制台',10.2,LIGHT)
    box(ax,60,56,32,23,'«process»\nNode 静态服务\n127.0.0.1:9697 / 9698',9.7)
    box(ax,7,10,39,20,'«storage» localStorage\n普通航班键 / 演示前缀',10)
    box(ax,60,10,32,20,'«artifact» dist\n脚本 / 配置 / 字体',10)
    arrow(ax,(46,68),(60,68),'HTTP',label_offset=(0,3));arrow(ax,(27,53),(27,30),'读写',label_offset=(9,0));arrow(ax,(76,56),(76,30),'读取文件',label_offset=(12,0))
    return save(fig,key)

def components(d,key):
    # Explicit positions preserve every dependency without crossing another component.
    layouts={
      'fig-01-02':[(15,72),(50,72),(85,72),(15,25),(50,25),(85,25)],
      'fig-02-01':[(14,50),(46,50),(85,83),(46,88),(85,50),(85,17)],
      'fig-05-01':[(14,50),(48,50),(85,84),(85,50),(85,16),(45,16)],
      'fig-07-02':[(85,76),(85,23),(28,23),(15,76),(50,76)],
      'fig-15-03':[(14,70),(50,85),(50,48),(85,65),(50,15)],
    }
    if key in layouts:
        fig,ax=canvas(4.2);positions=layouts[key];w=24;h=18
        for (x,y),item in zip(positions,d['items']):
            box(ax,x-w/2,y-h/2,w,h,str(item),9.5,LIGHT)
            ax.add_patch(Rectangle((x+w/2-4,y+h/2-4),3,2,fc='white',ec=BLACK,lw=.6))
        for a,b,label in d.get('links',[]):
            x1,y1=positions[a];x2,y2=positions[b];dx=x2-x1;dy=y2-y1
            if key=='fig-15-03':label={(1,3):'文件服务',(2,3):'地面状态',(4,3):'航班计划'}.get((a,b),label)
            if key=='fig-01-02' and (a,b)==(0,2):
                ax.plot([x1,x1,x2],[y1+h/2,94,94],c=BLACK,lw=.85);arrow(ax,(x2,94),(x2,y2+h/2))
                ax.text(50,95,label,ha='center',va='bottom',fontsize=9);continue
            scale=min((w/2)/abs(dx) if dx else 100,(h/2)/abs(dy) if dy else 100)
            A=(x1+scale*dx,y1+scale*dy);B=(x2-scale*dx,y2-scale*dy)
            offset=(0,3) if abs(dy)<10 else ((-8 if abs(dx)<5 else 0),3)
            if key=='fig-02-01' and (a,b)==(0,1):offset=(0,12)
            arrow(ax,A,B,label,label_offset=offset)
        return save(fig,key)
    items=d['items'];n=min(len(items),8);fig,ax=canvas(4.2 if n>4 else 3.5)
    cols=2;w=37;h=17;rows=math.ceil(n/cols);dy=84/max(rows,1);positions=[]
    for i,item in enumerate(items[:n]):
        x=5+(i%2)*54;y=89-h-(i//2)*dy
        label='\n'.join(map(str,item)) if isinstance(item,list) else str(item)
        box(ax,x,y,w,h,label,10.1,LIGHT)
        ax.add_patch(Rectangle((x+w-6,y+h-5),4,3,fc='white',ec=BLACK,lw=.65))
        positions.append((x+w/2,y+h/2,w,h))
    for k,(a,b,label) in enumerate(d.get('links',[])):
        if a>=n or b>=n or a==b:continue
        connect_nodes(ax,positions,a,b,label)
    return save(fig,key)

def waterfall(key):
    fig,ax=plt.subplots(figsize=(7.1,3.8));fig.subplots_adjust(left=.12,right=.98,bottom=.22,top=.92)
    labels=['运行空重','旅客','行李','货物','停机坪燃油','滑行耗油','TOW'];values=[127,20,6,2,30,-.5,184.5]
    bottom=0
    for i,v in enumerate(values):
        base=0 if i==6 else bottom;top=v if i==6 else bottom+v
        ax.bar(i,abs(v),bottom=min(base,top),width=.66,color=BLUE if i in (0,6) else TEAL if v>=0 else ORANGE)
        ax.text(i,max(base,top)+4,f'{v:g}' if i!=5 else '−0.5',ha='center',fontsize=10)
        if i<6:bottom=top;ax.plot([i+.33,i+.67],[top,top],c=GRAY,lw=.65,ls='--')
    ax.set_xticks(range(7),labels);ax.set_ylabel('质量 / t');ax.set_ylim(0,210);ax.grid(axis='y',alpha=.2);return save(fig,key)

def wind(key):
    fig,ax=canvas(4.1)
    origin=(34,23);end=(74,76);east=(74,23)
    arrow(ax,(8,23),(94,23),'跑道纵轴',label_offset=(29,-8));arrow(ax,(34,5),(34,93),'侧向',label_offset=(-10,14))
    arrow(ax,origin,end,'风矢量 V',color=BLUE,label_offset=(12,0),style='-|>')
    ax.plot([74,74],[23,76],ls='--',lw=1,color=GRAY);ax.plot([34,74],[76,76],ls='--',lw=1,color=GRAY)
    ax.add_patch(Arc(origin,27,27,theta1=0,theta2=53,lw=.9,color=BLACK));ax.text(49,32,'Δψ',fontsize=12)
    ax.text(56,15,'V cos(Δψ)',ha='center',fontsize=11);ax.text(78,48,'V sin(Δψ)',fontsize=11)
    ax.text(4,0,'差角 = 风向 − 跑道航向；分量符号按源码约定解释',fontsize=9.5,color=GRAY)
    return save(fig,key)

def runway(key):
    fig,ax=canvas(3.6)
    ax.add_patch(Rectangle((7,43),71,16,fc='#dce1e5',ec=BLACK,lw=.8));ax.plot([10,76],[51,51],ls=(0,(5,3)),c='white',lw=2)
    ax.add_patch(Rectangle((78,43),11,16,fc='white',ec=GRAY,hatch='///',lw=.7));ax.text(83.5,65,'停止道',fontsize=9,ha='center')
    for y,end,label in [(89,78,'TORA'),(76,96,'TODA'),(27,89,'ASDA')]:arrow(ax,(7,y),(end,y),label,style='<->',label_offset=(0,2))
    arrow(ax,(25,9),(78,9),'有效 TORA = TORA − 入口扣减',style='<->',label_offset=(0,2))
    ax.plot([25,25],[3,62],ls='--',c=ORANGE,lw=.9);ax.text(25,66,'使用入口',fontsize=9,ha='center',color=ORANGE)
    return save(fig,key)

def tod(key):
    fig,ax=plt.subplots(figsize=(7.1,3.8));fig.subplots_adjust(left=.13,right=.97,bottom=.18,top=.92)
    d=32000*.3048/math.tan(math.radians(3))/1852
    ax.plot([0,d],[35000,3000],color=BLUE,lw=1.6);ax.plot([0,d],[3000,3000],color=GRAY,lw=.7,ls='--')
    ax.scatter([0,d],[35000,3000],c=BLUE,s=26);ax.annotate('35 000 ft',xy=(0,35000),xytext=(8,33500),fontsize=10)
    ax.annotate('3 000 ft',xy=(d,3000),xytext=(d-26,6500),fontsize=10)
    ax.text(50,22500,'下降角 3°\n高度差 32 000 ft',ha='center',fontsize=10.5)
    ax.text(50,1200,f'水平距离 {d:.1f} NM',ha='center',fontsize=10)
    ax.set(xlim=(-4,110),ylim=(0,39000),xlabel='距下降起点的水平距离 / NM',ylabel='高度 / ft');ax.grid(alpha=.2)
    return save(fig,key)

def fuel(key):
    fig,axs=plt.subplots(1,2,figsize=(7.1,3.6));fig.subplots_adjust(left=.10,right=.98,bottom=.23,top=.91,wspace=.31)
    def values(v):
        if v<=2960:return v/2,0,0
        if v<=4888:return 1480,(v-2960)/2,0
        if v<=24118:return 1480+(v-4888)/2,964,0
        return 11095,964,min(v-24118,12625)
    for ax,maximum in zip(axs,[11000,36743]):
        x=sorted(set([*np.linspace(0,maximum,160),*[t for t in [2960,4888,24118,36743] if t<=maximum]]))
        ys=np.array([values(v) for v in x])
        for i,label in enumerate(['单侧内油箱','单侧外油箱','中央油箱']):ax.plot(x,ys[:,i],label=label,color=[BLUE,TEAL,ORANGE][i],lw=1.3)
        ax.set_xlabel('总目标体积 / US gal');ax.grid(alpha=.2);ax.tick_params(labelsize=8)
    axs[0].set_ylabel('单箱目标 / US gal');axs[0].legend(frameon=False,fontsize=8.6)
    axs[0].axvline(30000/3.039,c=GRAY,lw=.8,ls='--');axs[0].text(6900,4700,'30 t 样例',fontsize=9)
    return save(fig,key)

def altitude_speed(key):
    fig,ax=plt.subplots(figsize=(7.1,3.7));fig.subplots_adjust(left=.13,right=.97,bottom=.2,top=.94)
    ax.step([0,10000,35000],[250,400,400],where='post',c=BLUE,lw=1.5);ax.axvspan(3000,10000,alpha=.1,color=TEAL);ax.axvspan(10000,35000,alpha=.1,color=BLUE)
    ax.axvline(3000,c=GRAY,ls='--',lw=.8);ax.axhline(367.1875,c=ORANGE,ls='--',lw=1)
    ax.text(17000,373,'高度加权 367.1875 kt',fontsize=10,color=ORANGE)
    ax.set(xlabel='高度 / ft',ylabel='地速 / kt',ylim=(200,440));ax.grid(alpha=.15);return save(fig,key)

def pressure(key):
    fig,ax=plt.subplots(figsize=(7.1,3.6));fig.subplots_adjust(left=.13,right=.97,bottom=.2,top=.94)
    q=np.linspace(800,1100,200);hp=1450+145442.15*(1-(q/1013.25)**.190263)
    ax.plot(q,hp,c=BLUE,lw=1.5);ax.scatter([1013.25],[1450],c=TEAL,s=25);ax.annotate('1013.25 hPa → 1450 ft',(1013.25,1450),xytext=(825,650),arrowprops=dict(arrowstyle='-',color=GRAY,lw=.7),fontsize=10)
    ax.set(xlabel='QNH / hPa',ylabel='压力高度 / ft');ax.grid(alpha=.2);return save(fig,key)

def landing(key,discrepancy=False):
    fig,ax=plt.subplots(figsize=(7.1,3.6));fig.subplots_adjust(left=.14,right=.97,bottom=.2,top=.94)
    if discrepancy:
        masses=np.array([190,195,200]);ax.plot(masses,(masses-190)*170,'o-',c=BLUE,label='当前代码 170 × Δt');ax.plot(masses,(masses-190)*17,'s--',c=ORANGE,label='注释每 10 t 的字面换算')
        ax.set(xlabel='着陆质量 / t',ylabel='重量项修正 / m');ax.legend(frameon=False,fontsize=9)
    else:
        labels=['MAX','MEDIUM','LOW'];base=np.array([1310,1670,2220]);corr=np.array([56,70,91]);tot=(base+corr)*1.15
        ax.bar(labels,base,color=BLUE,label='基准距离')
        ax.bar(labels,corr,bottom=base,color=TEAL,label='速度修正');ax.bar(labels,tot-base-corr,bottom=base+corr,color='#c0cbd5',label='15% 系数增量')
        for i,v in enumerate(tot):ax.text(i,v+50,f'{v:.2f} m',ha='center',fontsize=10)
        ax.set(ylabel='距离 / m',ylim=(0,3100));ax.legend(frameon=False,fontsize=9,loc='upper left')
    ax.grid(axis='y',alpha=.2);return save(fig,key)

def geography(key):
    fig,ax=canvas(3.8);box(ax,13,15,67,71)
    arrow(ax,(13,86),(91,86),'x 像素向右',label_offset=(0,4));arrow(ax,(13,86),(13,5),'y 像素向下',label_offset=(-4,0))
    ax.plot([13,56],[42,42],ls='--',lw=.7,c=GRAY);ax.plot([56,56],[42,86],ls='--',lw=.7,c=GRAY);ax.scatter([56],[42],c=BLUE,s=30)
    ax.text(59,43,'飞机位置\n(lon, lat)',fontsize=10);ax.text(14,91,'lonMin / latMax',fontsize=9);ax.text(62,7,'lonMax / latMin',fontsize=9)
    ax.text(23,22,'地理配准范围 boundingBox',fontsize=10,color=GRAY);return save(fig,key)

def viewport(key):
    fig,ax=canvas(3.5);box(ax,4,9,92,80,fill=LIGHT);box(ax,21,13,59,72,fill='white')
    ax.text(50,60,'逻辑画布\n1430 × 1000',ha='center',fontsize=13)
    ax.text(50,41,'s = min(W / 1430, H / 1000)',ha='center',fontsize=11,color=BLUE)
    ax.text(50,29,'居中显示  内容尺寸乘以 s',ha='center',fontsize=10)
    ax.text(5,94,'可用窗口 W × H',fontsize=10);return save(fig,key)

CUSTOM={'deployment':deployment,'dependency':dependency,'waterfall':waterfall,'wind':wind,'runway':runway,'tod':tod,
        'fuel':fuel,'altitude_speed':altitude_speed,'pressure':pressure,'landing':landing,'landing_issue':lambda k:landing(k,True),
        'geography':geography,'viewport':viewport}

def make(d,key,kind=None):
    k=kind or d['kind']
    if k in CUSTOM:return CUSTOM[k](key)
    return {'sequence':sequence,'entity':entity,'state':state,'plot':plot}.get(k,components)(d,key)
