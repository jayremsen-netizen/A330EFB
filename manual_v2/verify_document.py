"""Structural, text-boundary and raster verification of the rewritten book."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import json,subprocess,hashlib,collections,sys,os,shutil
from PIL import Image,ImageDraw,ImageFont
from pypdf import PdfReader
import pdfplumber
ROOT=Path(__file__).resolve().parent;WORK=ROOT.parent
PDF=WORK/'output/pdf/A330电子飞行包系统技术方案与操作说明书_重写版.pdf'
poppler=os.environ.get('PDFTOPPM') or shutil.which('pdftoppm')
if not poppler:raise SystemExit('Install Poppler and add pdftoppm to PATH, or set PDFTOPPM to its full path.')
POP=Path(poppler)
OUT=WORK/'tmp/pdfs/v2-full';OUT.mkdir(parents=True,exist_ok=True)
EVID=ROOT/'evidence';EVID.mkdir(exist_ok=True)
data=json.loads((ROOT/'book-data.json').read_text('utf-8'));chapters=data['chapters'];sections=[s for c in chapters for s in c['sections']]
reader=PdfReader(PDF);assert len(reader.pages)==300
assert len(chapters)==22 and len(sections)==93
assert all(any(p.get('diagram') for p in s['pages']) for s in sections)
ops=[s for c in chapters if c['number']>=18 for s in c['sections']]
op_pages=[p for s in ops for p in s['pages']]
assert len(ops)==30 and len(op_pages)==60
assert all(p.get('diagram',{}).get('kind')=='screen' for p in op_pages)
assert all(r in data['sources'] for s in sections for r in s['refs'])
texts=[p.extract_text() or '' for p in reader.pages]
assert all(f'{i} / 300' in t for i,t in enumerate(texts,1))
assert all(len(t)>100 for t in texts)
paras=[t for s in sections for p in s['pages'] for t in p['paragraphs']]
duplicate=[dict(count=v,text=k) for k,v in collections.Counter(paras).items() if v>1 and len(k)>45]
assert not duplicate,duplicate
for s in sections:
 for p in s['pages']:
  d=p.get('diagram')
  if d:assert (ROOT/'assets'/d['asset']).exists()
report=dict(pages=300,chapters=22,sections=93,operation_sections=30,operation_pages=60,all_sections_illustrated=True,all_operation_sections_real_screenshots=True,duplicate_long_paragraphs=duplicate,total_extracted_characters=sum(map(len,texts)),sha256=hashlib.sha256(PDF.read_bytes()).hexdigest())
(EVID/'structure.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
print('Structure PASS: 300 pages, 93 illustrated sections, 30 screenshot operation sections',flush=True)

def bounds():
 bad=[];small=[]
 with pdfplumber.open(PDF) as doc:
  for i,p in enumerate(doc.pages,1):
   for ch in p.chars:
    if ch.get('text','').strip() and (ch['x0']<23 or ch['x1']>p.width-23 or ch['top']<14 or ch['bottom']>p.height-15):
     bad.append(dict(page=i,text=ch['text'],x0=round(ch['x0'],2),x1=round(ch['x1'],2),top=round(ch['top'],2),bottom=round(ch['bottom'],2)))
    if ch.get('text','').strip() and ch.get('size',10)<6.5:small.append(dict(page=i,text=ch['text'],size=ch['size']))
   if i%75==0:print('Text bounds checked',i,flush=True)
 (EVID/'text-bounds.json').write_text(json.dumps(dict(outside_page_content=bad,small_glyphs=small,status='PASS' if not bad and not small else 'REVIEW'),ensure_ascii=False,indent=2),'utf-8')
 return 'bounds',len(bad),len(small)

def render_range(start,end):
 cmd=[str(POP),'-f',str(start),'-l',str(end),'-r','90','-png',str(PDF),str(OUT/'page')]
 subprocess.run(cmd,check=True,capture_output=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 print(f'Rendered {start}-{end}',flush=True)
 return 'render',start,end

with ThreadPoolExecutor(max_workers=5) as ex:
 jobs=[ex.submit(bounds)]+[ex.submit(render_range,s,min(300,s+49)) for s in range(1,301,50)]
 for job in as_completed(jobs):print(job.result(),flush=True)

files=sorted(OUT.glob('page-*.png'));assert len(files)==300
try:font=ImageFont.truetype(os.environ.get('EFB_MONO_FONT','C:/Windows/Fonts/consola.ttf'),17)
except OSError:font=ImageFont.load_default(size=17)
for start in range(0,300,16):
 sheet=Image.new('RGB',(1280,1872),'#e9eef2');draw=ImageDraw.Draw(sheet)
 for j,f in enumerate(files[start:start+16]):
  im=Image.open(f).convert('RGB');im.thumbnail((308,436));x=(j%4)*320+6;y=(j//4)*468+27
  sheet.paste(im,(x,y));draw.text((x,y-23),str(start+j+1),fill='#17334f',font=font)
 sheet.save(OUT/f'contact-{start//16+1:02d}.jpg',quality=88)
report.update(rendered_pages=300,contact_sheets=19,visual_review='pending')
(EVID/'structure.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
print('All render artifacts ready',flush=True)
