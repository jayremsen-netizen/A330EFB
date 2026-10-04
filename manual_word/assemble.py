"""Assemble an edited, continuously paginated manuscript with selected technical figures."""
from pathlib import Path
import json,re,shutil
from editorial import CHAPTER_OPENINGS,REWRITTEN_BLOCKS,SECTION_ADDITIONS,TABLES,TEXT_REPLACEMENTS,CHAPTER_TITLES
from operations import OPS
from figures import make

ROOT=Path(__file__).resolve().parent;WORK=ROOT.parent
SOURCE=json.loads((WORK/'manual_v2/book-data.json').read_text('utf-8'))

def clean(t):
    for a,b in TEXT_REPLACEMENTS.items():t=t.replace(a,b)
    return t.replace('， ，','，').replace('，，','，').replace('�','').strip()

OMIT_STARTS=('书中的源码分析固定到所列提交','这些记录说明固定软件版本在给定条件下的行为。','操作说明中的异常处理只描述用户可以执行',
 '设计上，聚合视图应保留各自的来源和状态。','当前原生组件与本地扩展通过明确投影保持基本一致。')

def source_figure(c,s,p):return SOURCE['chapters'][c-1]['sections'][s-1]['pages'][p-1]['diagram']

# One relevant engineering drawing in every design section; optional diagrams are explicit.
PLAN={
'1.1':('deployment',1),'1.2':('components',3),'1.3':('dependency',3),
'2.1':('components',2),'2.2':('sequence',1),'2.3':('sequence',3),'2.4':('sequence',3),
'3.1':('deployment',1),'3.2':('state',2),'3.3':('dependency',1),'3.4':('sequence',1),
'4.1':('entity',1),'4.2':('runway',2),'4.3':('entity',1),'4.4':('plot',2),'4.5':('sequence',1),
'5.1':('components',1),'5.2':('sequence',1),'5.3':('sequence',2),'5.4':('sequence',2),'5.5':('entity',3),
'6.1':('screen:dashboard',1),'6.2':('sequence',2),'6.3':('viewport',1),'6.4':('sequence',2),
'7.1':('sequence',2),'7.2':('components',3),'7.3':('sequence',1),'7.4':('sequence',1),
'8.1':('screen:dashboard',1),'8.2':('screen:dispatch-ofp',2),'8.3':('sequence',2),
'9.1':('entity',1),'9.2':('fuel',2),'9.3':('sequence',2),'9.4':('entity',4),
'10.1':('entity',2),'10.2':('waterfall',2),'10.3':('plot',1),'10.4':('wind',2),'10.5':('sequence',2),
'11.1':('tod',1),'11.2':('altitude_speed',2),'11.3':('landing',2),'11.4':('landing_issue',3),
'12.1':('entity',2),'12.2':('geography',3),'12.3':('state',1),
'13.1':('entity',1),'13.2':('sequence',2),'13.3':('sequence',3),
'14.1':('entity',1),'14.2':('sequence',1),'14.3':('sequence',1),
'15.1':('screen:settings',1),'15.2':('screen:settings-realism',2),'15.3':('components',2),
'16.1':('state',3),'16.2':('sequence',1),'16.3':('sequence',3),
'17.1':('sequence',1),'17.2':('dependency',1),'17.3':('sequence',2),
}
CUSTOM_CAPTIONS={
'deployment':'本机部署节点及进程间访问关系','dependency':'固定上游引用与本地构建依赖',
'waterfall':'DEMO330 质量组成及起飞质量计算','wind':'跑道坐标中的风分量分解',
'runway':'声明距离与入口扣减的几何关系','tod':'35 000 ft 至 3 000 ft 的三度下降纵剖面',
'fuel':'原生燃油目标的分段分配曲线','altitude_speed':'地速分段与本次下降高度范围',
'pressure':'标高 1450 ft 时压力高度随 QNH 的变化','landing':'190 t 源码算例的距离组成',
'landing_issue':'重量修正的代码运算与注释量纲比较','geography':'图件配准范围与屏幕坐标方向',
'viewport':'逻辑画布在可用窗口内的等比适配',
}
SECONDARY={'10.3.3':('plot','插值区间与 184.5 t 样例点'),'10.4.1':('pressure','标高 1450 ft 时压力高度随 QNH 的变化'),
           '10.4.3':('runway','TORA TODA ASDA 与使用入口'),'11.4.2':('landing','基准条件下三种自动刹车的距离组成')}
OP_IMAGES={'18.1':[1],'18.2':[1],'18.3':[1],'18.4':[1],'18.5':[1],'18.6':[2],
 '19.1':[1],'19.2':[1],'19.3':[1],'19.4':[2],'19.5':[2],'19.6':[2],
 '20.1':[1],'20.2':[2],'20.3':[1],'20.4':[1,2],'20.5':[1],'20.6':[1,2],
 '21.1':[2],'21.2':[2],'21.3':[1,2],'21.4':[1],'21.5':[2],'21.6':[1,2],
 '22.1':[2],'22.2':[1,2],'22.3':[1],'22.4':[1,2],'22.5':[1],'22.6':[1,2]}

def picture(kind,d,key,caption=None):
    if kind.startswith('screen:'):
        name=kind.split(':',1)[1];p=WORK/'manual/assets/screens'/f'{name}.png'
        if not p.exists():
            matches=list((WORK/'manual/assets/screens').glob(name+'*.png'))
            if matches:p=matches[0]
        if not p.exists():raise FileNotFoundError(p)
        return dict(type='figure',kind='screen',path=str(p.relative_to(WORK)),caption=caption or d['title'])
    p=make(d,key,kind)
    return dict(type='figure',kind=kind,path=str(p.relative_to(WORK)),caption=clean(caption or CUSTOM_CAPTIONS.get(kind,d['title'])))

def build():
    chapters=[]
    for c in SOURCE['chapters']:
        n=c['number'];out=dict(number=n,title=clean(CHAPTER_TITLES.get(n,c['title'])),opening=CHAPTER_OPENINGS[n],sections=[])
        for si,s in enumerate(c['sections'],1):
            sid=f'{n}.{si}';section=dict(id=sid,title=clean(s['title']),scope=clean(s['scope']),refs=s['refs'],blocks=[]);blocks=section['blocks']
            if n>=18:
                intro,steps,note=OPS[sid];blocks.append(dict(type='paragraph',text=intro))
                blocks.append(dict(type='steps',items=steps))
                for pi,p in enumerate(s['pages'],1):
                    if pi not in OP_IMAGES[sid]:continue
                    d=p['diagram'];path=WORK/'manual_v2/assets'/d['asset'];assert path.exists(),path
                    if sid=='18.1':path=WORK/'manual/assets/screens/dashboard-empty.png'
                    blocks.append(dict(type='figure',kind='screen',path=str(path.relative_to(WORK)),caption=clean(d['title']),compact=len(OP_IMAGES[sid])>1))
                blocks.append(dict(type='paragraph',text=note))
            else:
                pk,pp=PLAN[sid]
                for pi,p in enumerate(s['pages'],1):
                    bid=f'{sid}.{pi}';title=clean(p['title']);paras=REWRITTEN_BLOCKS.get(bid,p['paragraphs'])
                    if bid=='17.3.4':continue
                    paras=[clean(t) for t in paras]
                    if bid=='1.3.4':title='文档结构'
                    blocks.append(dict(type='subheading',text=title))
                    for t in paras:
                        if t and not t.startswith(OMIT_STARTS):blocks.append(dict(type='paragraph',text=t))
                    d=p.get('diagram',{})
                    if d.get('kind')=='formula':
                        blocks.append(dict(type='equations',items=[[clean(a),clean(b)] for a,b in d['items']]))
                    if bid in TABLES:blocks.append({**p['table'],'type':'table','caption':title})
                    if pi==pp:
                        caption=d.get('title',title)
                        if pk.startswith('screen:'):caption=title+'的实际界面'
                        blocks.append(picture(pk,d,f'fig-{n:02}-{si:02}',caption=None if pk in CUSTOM_CAPTIONS else caption))
                    if bid in SECONDARY:
                        kind,caption=SECONDARY[bid];blocks.append(picture(kind,d,f'fig-{n:02}-{si:02}-{pi:02}',caption))
                    if p.get('code'):blocks.append(dict(type='code',text=clean(p['code'])))
                for t in SECTION_ADDITIONS.get(sid,[]):blocks.append(dict(type='paragraph',text=t))
            out['sections'].append(section)
        chapters.append(out)
    from demo_chapter import chapter
    chapters.append(chapter(WORK,ROOT))
    sources={k:[v[0],clean(v[1])] for k,v in SOURCE['sources'].items()}
    sources['L-B']=['上游获取与生成脚本','scripts/upstreams.py；scripts/prepare.py；scripts/integrate_extensions.py；Build-EFB.ps1']
    sources['L-D']=['参考模型配置及提取脚本','config/a339-reference-profile.json；scripts/prepare.py；生成文件 local-extensions/data/a339-reference.json']
    sources['L-T']=['本地界面及演示验证','tests/；docs/reproducibility.md；manual/assets/screens/']
    sources['DEMO']=['自动演示控制器及场景','local-efb/presentation/main.ts；bridge.ts；scenarios.ts']
    return dict(title='A330电子飞行包系统技术方案与操作说明书',edition='A330EFB 文档版本 2.0',chapters=chapters,sources=sources)

if __name__=='__main__':
    book=build();(ROOT/'manuscript.json').write_text(json.dumps(book,ensure_ascii=False,indent=2),'utf-8')
    print('Edited manuscript:',len(book['chapters']),'chapters')
