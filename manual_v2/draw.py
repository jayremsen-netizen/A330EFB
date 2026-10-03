"""Small vector drawing vocabulary for technical figures (PDF and SVG)."""
import math,html
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
INK='#17334f';MUTED='#54677a';BLUE='#285f86';TEAL='#177d83';PALE='#edf4f8';LINE='#afc3d2'
class Pen:
    def __init__(self,c,x,y,w,h):self.c=c;self.x=x;self.y=y;self.w=w;self.h=h;self.svg=[]
    def line(self,a,b,color=LINE,dash=False,arrow=False):
        x1,y1=a;x2,y2=b
        self.svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.2"'+(' stroke-dasharray="4 3"' if dash else '')+'/>')
        if self.c:
            self.c.setStrokeColor(HexColor(color));self.c.setLineWidth(.8);self.c.setDash([3,2] if dash else []);self.c.line(self.x+x1,self.y-y1,self.x+x2,self.y-y2);self.c.setDash([])
        if arrow:
            ang=math.atan2(y2-y1,x2-x1)
            for q in [-.5,.5]:self.line((x2-5*math.cos(ang+q),y2-5*math.sin(ang+q)),(x2,y2),color)
    def rect(self,x,y,w,h,fill=PALE,stroke=LINE):
        self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="{fill}" stroke="{stroke}"/>')
        if self.c:self.c.setFillColor(HexColor(fill));self.c.setStrokeColor(HexColor(stroke));self.c.roundRect(self.x+x,self.y-y-h,w,h,3,fill=1,stroke=1)
    def text(self,x,y,t,size=10,color=INK,anchor='middle',bold=False,maxw=None):
        font='CNB' if bold else 'CN'
        limit=maxw if maxw is not None else (min(x,self.w-x)*2-4 if anchor=='middle' else self.w-x-4 if anchor=='start' else x-4)
        widest=max((pdfmetrics.stringWidth(line,font,size) for line in str(t).split('\n')),default=0)
        if widest>limit and limit>0:size=max(6.6,size*limit/widest)
        for j,line in enumerate(str(t).split('\n')):
            yy=y+j*(size+4)
            self.svg.append(f'<text x="{x}" y="{yy}" text-anchor="{anchor}" font-size="{size}" font-family="Microsoft YaHei,Arial,sans-serif" fill="{color}"'+(' font-weight="700"' if bold else '')+'>'+html.escape(line)+'</text>')
            if self.c:
                self.c.setFillColor(HexColor(color));self.c.setFont(font,size)
                xx=self.x+x;fn=self.c.drawCentredString if anchor=='middle' else self.c.drawString if anchor=='start' else self.c.drawRightString
                fn(xx,self.y-yy,line)
    def node(self,x,y,w,h,label):
        self.rect(x,y,w,h);lines=[]
        for raw in str(label).split('\n'):
            line=''
            for char in raw:
                if line and pdfmetrics.stringWidth(line+char,'CNB',9.3)>w-13:lines.append(line);line=char
                else:line+=char
            lines.append(line)
        size=min(9.3,(h-10)/max(1,len(lines))-3)
        self.text(x+w/2,y+h/2-(len(lines)-1)*(size+4)/2+size*.35,'\n'.join(lines),size,bold=True,maxw=w-12)
    def finish(self):return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}"><rect width="100%" height="100%" fill="white"/>'+''.join(self.svg)+'</svg>'

def diagram(c,x,y,w,h,d):
    p=Pen(c,x,y,w,h);k=d['kind'];a=d['items'];links=d.get('links',[])
    if k=='row':
        bw=(w-20*(len(a)-1))/len(a)
        for i,t in enumerate(a):
            p.node(i*(bw+20),4,bw,h-8,t)
            if i<len(a)-1:p.line((i*(bw+20)+bw,h/2),((i+1)*(bw+20),h/2),TEAL,arrow=True)
    elif k=='layers':
        bh=(h-16*(len(a)-1))/len(a)
        for i,t in enumerate(a):
            yy=i*(bh+16);p.node(22,yy,w-44,bh,t)
            if i<len(a)-1:p.line((w/2,yy+bh+2),(w/2,yy+bh+14),TEAL,arrow=True)
    elif k=='pipeline':
        n=len(a);bh=43;bw=(w-30)/3
        for i,t in enumerate(a):
            col=i%3 if i<3 else 2-i%3;row=i//3;xx=col*(bw+15);yy=row*93+18
            p.node(xx,yy,bw,bh,t)
            if i<n-1:
                if i==2:p.line((xx+bw/2,yy+bh),(xx+bw/2,yy+93),TEAL,arrow=True)
                elif row==0:p.line((xx+bw,yy+bh/2),(xx+bw+15,yy+bh/2),TEAL,arrow=True)
                else:p.line((xx,yy+bh/2),(xx-15,yy+bh/2),TEAL,arrow=True)
    elif k=='sequence':
        n=len(a);xs=[(i+.5)*w/n for i in range(n)]
        for i,t in enumerate(a):p.node(xs[i]-w/n*.44,0,w/n*.88,33,t);p.line((xs[i],35),(xs[i],h-4),LINE,dash=True)
        step=(h-56)/max(1,len(links))
        for i,(s,t,label) in enumerate(links):
            yy=51+i*step
            if s==t:
                xx=xs[s];right=min(w-6,xx+27);p.line((xx,yy),(right,yy),TEAL);p.line((right,yy),(right,yy+9),TEAL);p.line((right,yy+9),(xx,yy+9),TEAL,arrow=True);p.text(xx-4 if xx>w*.65 else xx+4,yy-4,label,7.8,anchor='end' if xx>w*.65 else 'start')
            else:p.line((xs[s],yy),(xs[t],yy),TEAL,arrow=True);p.text((xs[s]+xs[t])/2,yy-5,label,8.1)
    elif k=='lanes':
        rh=h/len(a);cw=(w-87)/3
        for i,row in enumerate(a):
            yy=i*rh;p.rect(0,yy,w,rh-5,fill='#f7f9fb');p.text(8,yy+rh/2,row[0],9.3,anchor='start',bold=True)
            for j,t in enumerate(row[1:]):
                xx=87+j*cw;p.node(xx+5,yy+12,cw-17,rh-29,t)
                if j<len(row)-2:p.line((xx+cw-12,yy+rh/2-2),(xx+cw+5,yy+rh/2-2),TEAL,arrow=True)
    elif k=='tree':
        p.node(w*.31,0,w*.38,34,a[0]);branches=a[1:];bw=(w-10*(len(branches)-1))/len(branches)
        p.line((w/2,34),(w/2,54));p.line((bw/2,54),(w-bw/2,54))
        for i,branch in enumerate(branches):
            xx=i*(bw+10);p.line((xx+bw/2,54),(xx+bw/2,67));p.node(xx,67,bw,42,branch[0]);yy=128
            for child in branch[1:]:p.text(xx+bw/2,yy,child,8.2);yy+=24
    elif k=='formula':
        rh=h/len(a)
        for i,(name,formula) in enumerate(a):p.rect(0,i*rh,w,rh-10);p.text(14,i*rh+20,name,9,anchor='start',bold=True);p.text(w/2,i*rh+rh*.66,formula,12,color=BLUE)
    elif k=='plot':
        # Named numerical series, e.g. mass-speed reference curves.
        xs=d['x'];series=d['series'];xmin,xmax=min(xs),max(xs);values=[v for s in series for v in s['y']];ymin=min(values)-3;ymax=max(values)+3
        left,bottom=42,h-32;gw=w-62;gh=h-62
        p.line((left,22),(left,bottom),INK);p.line((left,bottom),(w-10,bottom),INK)
        for tick in range(int(ymin//5*5),int(ymax)+1,5):
            yy=bottom-(tick-ymin)/(ymax-ymin)*gh
            if yy<22 or yy>bottom:continue
            p.line((left,yy),(w-10,yy),'#dce6ec');p.text(left-6,yy+3,str(tick),8,anchor='end')
        for val in xs[::2]:xx=left+(val-xmin)/(xmax-xmin)*gw;p.text(xx,bottom+16,str(val),8)
        for j,s in enumerate(series):
            col=[BLUE,TEAL,'#b47724'][j%3];points=[(left+(u-xmin)/(xmax-xmin)*gw,bottom-(v-ymin)/(ymax-ymin)*gh) for u,v in zip(xs,s['y'])]
            for aa,bb in zip(points,points[1:]):p.line(aa,bb,col)
            p.text(95+j*125,13,s['name'],9,col)
        p.text(w/2,h-1,d.get('xlabel',''),9);p.text(5,14,d.get('ylabel',''),8,anchor='start')
    elif k=='entity':
        n=len(a);cols=2 if n==4 else n;bw=(w-22*(cols-1))/cols;bh=(h-50)/2 if n==4 else h-28;positions=[]
        for i,item in enumerate(a):positions.append(((i%cols)*(bw+22),(i//cols)*(bh+30),bw,bh))
        for s,t,label in links:
            ax,ay,aw,ah=positions[s];bx,by,bw2,bh2=positions[t]
            if ay==by:p.line((ax+(aw if bx>ax else 0),ay+ah/2),(bx+(0 if bx>ax else bw2),by+bh2/2),TEAL,arrow=True)
            else:p.line((ax+aw/2,ay+(ah if by>ay else 0)),(bx+bw2/2,by+(0 if by>ay else bh2)),TEAL,arrow=True)
        for item,(xx,yy,ww,hh) in zip(a,positions):
            p.rect(xx,yy,ww,hh);p.text(xx+ww/2,yy+20,item[0],9.4,bold=True);p.line((xx+5,yy+29),(xx+ww-5,yy+29));
            for j,t in enumerate(item[1:]):p.text(xx+8,yy+49+j*18,t,8.7,anchor='start',maxw=ww-16)
        if links:p.text(w/2,h-3,'；'.join(label for _,_,label in links),8.5,color=MUTED)
    else:
        n=len(a);cols=3 if n>4 else 2;rows=math.ceil(n/cols);bw=min(142,(w-36*(cols-1))/cols);bh=53;gx=(w-bw*cols)/max(1,cols-1);graphh=h-30;gy=(graphh-20-bh*rows)/max(1,rows-1);pos=[]
        if k=='context' and n==5:pos=[(0,0),(w/2-bw/2,graphh/2-bh/2),(w-bw,0),(0,graphh-bh),(w-bw,graphh-bh)]
        else:pos=[((i%cols)*(bw+gx),(i//cols)*(bh+gy)+8) for i in range(n)]
        for li,(s,t,label) in enumerate(links):
            ax,ay=pos[s];bx,by=pos[t];dx=bx-ax;dy=by-ay
            if s==t:
                p.line((ax+bw*.35,ay),(ax+bw*.35,ay-7),TEAL);p.line((ax+bw*.35,ay-7),(ax+bw*.65,ay-7),TEAL);p.line((ax+bw*.65,ay-7),(ax+bw*.65,ay),TEAL,arrow=True)
                continue
            if abs(dx)>abs(dy):start=(ax+(bw if dx>=0 else 0),ay+bh/2);end=(bx+(0 if dx>=0 else bw),by+bh/2)
            else:start=(ax+bw/2,ay+(bh if dy>=0 else 0));end=(bx+bw/2,by+(0 if dy>=0 else bh))
            p.line(start,end,TEAL,arrow=True);mx=(start[0]+end[0])/2;my=(start[1]+end[1])/2;p.rect(mx-5,my-6,10,12,fill='#ffffff',stroke='#ffffff');p.text(mx,my+3,str(li+1),7.5)
        for t,(xx,yy) in zip(a,pos):p.node(xx,yy,bw,bh,t)
        for li,(_,_,label) in enumerate(links):p.text(5+(li%3)*w/3,h-15+(li//3)*12,f'{li+1}  {label}',7.8,anchor='start')
    return p.finish()
