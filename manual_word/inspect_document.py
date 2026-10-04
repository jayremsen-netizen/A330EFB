"""Inspect rendering structure, export TOC page numbers and native-scale review sheets."""
from pathlib import Path
import json, argparse, re
import pymupdf
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parent;WORK=ROOT.parent

def inspect(directory):
    pdf=next(directory.glob('*.pdf'));doc=pymupdf.open(pdf)
    idx=json.loads((ROOT/'document-index.json').read_text('utf-8'))
    toc=[x for x in doc.get_toc() if x[0]<=2 and x[1] not in ['适用范围','目录']]
    assert len(toc)==len(idx['targets']),(len(toc),len(idx['targets']))
    pages={}
    for actual,target in zip(toc,idx['targets']):
        assert actual[1].replace(' ','')==target[0].replace(' ',''),(actual,target)
        pages[target[1]]=actual[2]
    (directory/'page-map.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2),'utf-8')
    short=[];overflow=[];imagepages=[]
    for n,page in enumerate(doc,1):
        body=[b for b in page.get_text('blocks') if b[1]>45 and b[3]<page.rect.height-45]
        chars=sum(len(b[4].strip()) for b in body)
        if chars<120 and n>1:short.append(dict(page=n,chars=chars,text=' '.join(b[4].replace('\n',' ') for b in body)[:160]))
        for b in body:
            if b[0]<40 or b[2]>page.rect.width-40:overflow.append(dict(page=n,text=b[4][:120],bounds=list(b[:4])))
        if page.get_images():imagepages.append(n)
    report=dict(pages=len(doc),toc_entries=len(toc),figures=idx['figures'],tables=idx['tables'],short_pages=short,text_overflow=overflow)
    (directory/'inspection.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
    sheets=directory/'sheets';sheets.mkdir(exist_ok=True)
    for start in range(1,len(doc)+1,4):
        paths=[directory/f'page-{i}.png' for i in range(start,min(start+4,len(doc)+1))]
        imgs=[Image.open(p).convert('RGB') for p in paths];w,h=imgs[0].size
        # No resizing: every page retains exactly the renderer's pixels.
        out=Image.new('RGB',(w*2+12,h*2+12),'#a6a6a6')
        for i,img in enumerate(imgs):out.paste(img,((i%2)*(w+12),(i//2)*(h+12)))
        out.save(sheets/f'pages-{start:03}-{start+len(imgs)-1:03}.png')
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('directory');args=ap.parse_args();inspect(Path(args.directory))
