from pathlib import Path
import sys,importlib,json,html,re,os
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph,Table,TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor,white
from reportlab.lib.utils import ImageReader
from reportlab.lib import textsplit
from reportlab.platypus import paragraph as paragraph_module
from PIL import Image
from model import *
from draw import diagram,INK,PALE,LINE,MUTED
for f in sorted(ROOT.glob('ch[0-9]*.py')):importlib.import_module(f.stem)
pdfmetrics.registerFont(TTFont('CN',os.environ.get('EFB_CN_FONT','C:/Windows/Fonts/msyh.ttc'),subfontIndex=0))
pdfmetrics.registerFont(TTFont('CNB',os.environ.get('EFB_CN_BOLD_FONT','C:/Windows/Fonts/msyhbd.ttc'),subfontIndex=0))
W,H=595.2756,841.8898;M=48;CW=W-2*M;AUDIT=[];FIGURES=[];MD=[];WEB=[]
ASSET=ROOT/'assets';ASSET.mkdir(exist_ok=True)
# Extend ReportLab's Japanese line-start rules to full-width Chinese punctuation.
textsplit.ALL_CANNOT_START+='，；：！？）》」』】〕〗〙〛”’'
paragraph_module.ALL_CANNOT_START=textsplit.ALL_CANNOT_START
def clean(t):return str(t).replace('—','-').replace('–','-').replace('‑','-')
def esc(t):return html.escape(clean(t)).replace('\n','<br/>')
def style(size=11.1,bold=False,color=INK,leading=None):return ParagraphStyle('s',fontName='CNB' if bold else 'CN',fontSize=size,leading=leading or size*1.73,textColor=HexColor(color),wordWrap='CJK')
def par(t,width,size=11.1,bold=False,color=INK):
    z=Paragraph(esc(t),style(size,bold,color));z.wrap(width,3000);return z
def make_table(t,size):
    n=len(t['headers']);widths=t.get('widths',[CW/n]*n)
    if n==3:widths=t.get('widths',[CW*.24,CW*.34,CW*.42])
    rows=[[par(z,w-15,size-1.4,True) for z,w in zip(t['headers'],widths)]]
    rows += [[par(z,w-15,size-1.4) for z,w in zip(r,widths)] for r in t['rows']]
    tb=Table(rows,colWidths=widths)
    pad=3 if t.get('compact') else 6
    tb.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),HexColor('#dfeaf1')),('ROWBACKGROUNDS',(0,1),(-1,-1),[white,HexColor('#f4f7f9')]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7.5),('RIGHTPADDING',(0,0),(-1,-1),7.5),('TOPPADDING',(0,0),(-1,-1),pad),('BOTTOMPADDING',(0,0),(-1,-1),pad),('LINEBELOW',(0,0),(-1,0),.7,HexColor(LINE)),('LINEBELOW',(0,1),(-1,-1),.3,HexColor(LINE))]))
    return tb
def imagepath(name):
    p=Path(name)
    if p.is_absolute():return p
    if (WORK/p).is_file():return WORK/p
    return (WORK/'manual/assets/screens'/name).with_suffix('.png')
def screen_image(d):
    im=Image.open(imagepath(d['items']))
    if d.get('crop'):im=im.crop(d['crop'])
    return im
def figure_height(d):
    if d.get('height'):return d['height']
    if d['kind']=='layers':
        node_height=40 if any('\n' in t for t in d['items']) else 34
        return max(180,len(d['items'])*node_height+(len(d['items'])-1)*16)
    if d['kind']=='entity' and len(d['items'])==4:return 220
    if d['kind']=='screen':
        im=screen_image(d);return min(360,CW*im.height/im.width)
    return {'layers':180,'tree':190,'sequence':210,'entity':190,'plot':210,'context':190,'lanes':180,'formula':130}.get(d['kind'],180)
def blocks(p,size,figscale=1):
    out=[]
    for s in p.get('paragraphs',[]):
        z=par(s,CW,size);out.append(('para',z,z.height+11))
    if p.get('diagram'):
        d=p['diagram'];fh=figure_height(d)*figscale;cap=par(d['title'],CW,8.6,color=MUTED);out.append(('figure',(d,cap),fh+cap.height+20))
    if p.get('table'):
        t=p['table'];z=make_table(t,size);_,h=z.wrap(CW,3000);out.append(('table',z,h+14))
    if p.get('code'):
        z=par(p['code'],CW-22,9.1);out.append(('code',z,z.height+25))
    if p.get('note'):
        z=par(p['note'],CW-22,9.6,color=MUTED);out.append(('note',z,z.height+26))
    return out
def page(c,ch,s,p,num,local_index,section_index):
    label=f"{ch['number']}.{section_index} {s['title']}";p['page']=num
    c.setFillColor(HexColor(MUTED));c.setFont('CN',8);c.drawString(M,H-30,clean(ch['part']+('  / 扩展设计' if s.get('scope') else '')));c.drawRightString(W-M,H-30,clean(f"第 {ch['number']} 章  {ch['title']}"))
    y=H-59
    title=par(label,CW,16,True);title.drawOn(c,M,y-title.height);y-=title.height+9
    subtitle=par(p['title'],CW,12.2,True);subtitle.drawOn(c,M,y-subtitle.height);y-=subtitle.height+15
    found=None
    for size,fs in [(11.3,1),(11,1),(10.7,.93),(10.4,.87)]:
        items=blocks(p,size,fs)
        if sum(z[2] for z in items)<=y-55:found=(size,fs,items);break
    if found is None:raise RuntimeError(f'Page {num} overflows: {label} / {p["title"]}; height {sum(z[2] for z in items):.1f}, available {y-55:.1f}')
    size,fs,items=found;figs=0
    for kind,obj,h in items:
        if kind=='para':obj.drawOn(c,M,y-obj.height)
        elif kind=='table':obj.drawOn(c,M,y-(h-14))
        elif kind in ['code','note']:
            c.setFillColor(HexColor('#f2f6f8'));c.roundRect(M,y-h+8,CW,h-8,4,fill=1,stroke=0);obj.drawOn(c,M+11,y-12-obj.height)
        else:
            d,cap=obj;fh=figure_height(d)*fs;figs+=1;fid=f"fig-{ch['number']:02d}-{section_index:02d}-{local_index:02d}"
            if d['kind']=='screen':
                im=screen_image(d);iw=min(CW,fh*im.width/im.height);c.drawImage(ImageReader(im),M+(CW-iw)/2,y-fh,width=iw,height=fh);outname=fid+'.png';target=ASSET/outname
                im.save(target)
            else:
                svg=diagram(c,M,y,CW,fh,d);outname=fid+'.svg';(ASSET/outname).write_text(svg,'utf-8')
            cap=par(f'图 {ch["number"]}-{section_index}-{local_index}  '+d['title'],CW,8.6,color=MUTED);cap.drawOn(c,M,y-fh-8-cap.height);d['asset']=outname;FIGURES.append(dict(id=fid,title=d['title'],page=num,kind=d['kind']));
        y-=h
    c.setFillColor(HexColor(MUTED));c.setFont('CN',7.1);c.drawString(M,41,'本节依据：'+'、'.join('['+r+']' for r in s['refs'])+'  ·  资料索引见附录')
    c.setFont('CN',8);c.drawString(M,27,'A330 EFB  |  技术方案与操作说明书  |  V2.0');c.drawRightString(W-M,27,f'{num} / 300')
    c.bookmarkPage(f'p{num}');
    if local_index==1:c.addOutlineEntry(label,f'p{num}',1)
    AUDIT.append(dict(page=num,chapter=ch['number'],section=section_index,title=p['title'],bottom=round(y,1),font=size,figures=figs,characters=sum(len(t) for t in p['paragraphs'])));c.showPage()
def export():
    from editable import export_full
    from front import AUX
    export_full(BOOK,AUX,SOURCES,TITLE,ROOT)

def main():
    preview='--preview' in sys.argv
    dest=WORK/('tmp/pdfs/v2-design-preview.pdf' if preview else 'output/pdf/A330电子飞行包系统技术方案与操作说明书_重写版.pdf');dest.parent.mkdir(parents=True,exist_ok=True)
    c=canvas.Canvas(str(dest),pagesize=(W,H));c.setTitle(TITLE);c.setAuthor('');c.setSubject('系统总体设计、模块详细设计、关键技术与操作手册')
    n=11
    if not preview:
        from front import front,appendix
        front(c,BOOK)
    for ch in BOOK:
        c.bookmarkPage('chapter'+str(ch['number']));c.addOutlineEntry(f'{ch["number"]} {ch["title"]}','chapter'+str(ch['number']),0)
        for i,s in enumerate(ch['sections'],1):
            assert any(p.get('diagram') for p in s['pages']),f'No figure in {ch["number"]}.{i}'
            for j,p in enumerate(s['pages'],1):page(c,ch,s,p,n,j,i);n+=1
    if not preview:
        assert n==291,f'Expected 280 body pages, got {n-11}'
        appendix(c,BOOK,n)
    c.save();(ROOT/'layout-audit.json').write_text(json.dumps(AUDIT,ensure_ascii=False,indent=2),'utf-8');(ROOT/'figures.json').write_text(json.dumps(FIGURES,ensure_ascii=False,indent=2),'utf-8');(ROOT/'book-data.json').write_text(json.dumps(dict(title=TITLE,chapters=BOOK,sources=SOURCES),ensure_ascii=False,indent=2),'utf-8');export();print(str(dest));print('Body pages:',n-11)
if __name__=='__main__':main()
