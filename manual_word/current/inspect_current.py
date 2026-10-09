"""Check PDF geometry and create native-size review sheets without shrinking pages."""
from pathlib import Path
import argparse,json,hashlib
import pdfplumber
from pypdf import PdfReader
from PIL import Image
ROOT=Path(__file__).resolve().parent;BASE=ROOT.parent
def inspect(directory):
 pdf=next(directory.glob('*.pdf'));reader=PdfReader(pdf);idx=json.loads((BASE/'document-index.json').read_text('utf-8'))
 entries=[]
 def visit(items,level=1):
  for item in items:
   if isinstance(item,list):visit(item,level+1)
   elif level<=2 and item.title not in ['适用范围','目录']:entries.append((item.title,reader.get_destination_page_number(item)+1))
 visit(reader.outline)
 assert len(entries)==len(idx['targets']),(len(entries),len(idx['targets']))
 page_map={}
 for (label,page),(expected,anchor,_) in zip(entries,idx['targets']):
  assert label.replace(' ','')==expected.replace(' ',''),(label,expected)
  page_map[anchor]=page
 (directory/'page-map.json').write_text(json.dumps(page_map,ensure_ascii=False,indent=2),'utf-8')
 overflow=[];short=[];page_data=[]
 with pdfplumber.open(pdf) as doc:
  for i,page in enumerate(doc.pages,1):
   words=[w for w in page.extract_words() if w['top']>45 and w['bottom']<page.height-45]
   text=page.extract_text() or '';chars=sum(len(w['text']) for w in words)
   page_data.append({'page':i,'chars':chars,'text':text})
   if i>1 and chars<100:short.append({'page':i,'chars':chars,'text':text[:180]})
   for w in words:
    if w['x0']<35 or w['x1']>page.width-35:overflow.append({'page':i,'text':w['text'],'x0':w['x0'],'x1':w['x1']})
 report={'pages':len(reader.pages),'toc_entries':len(entries),'figures':idx['figures'],'tables':idx['tables'],'short_pages':short,'text_overflow':overflow}
 (directory/'inspection.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
 (directory/'page-text.json').write_text(json.dumps(page_data,ensure_ascii=False,indent=2),'utf-8')
 sheets=directory/'sheets';sheets.mkdir(exist_ok=True)
 for start in range(1,len(reader.pages)+1,4):
  paths=[directory/f'page-{i}.png' for i in range(start,min(start+4,len(reader.pages)+1))];imgs=[Image.open(p).convert('RGB') for p in paths];w,h=imgs[0].size
  out=Image.new('RGB',(2*w+12,2*h+12),'#aaaaaa')
  for i,img in enumerate(imgs):out.paste(img,((i%2)*(w+12),(i//2)*(h+12)))
  out.save(sheets/f'pages-{start:03}-{start+len(imgs)-1:03}.png')
 print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('directory');a=p.parse_args();inspect(Path(a.directory))
