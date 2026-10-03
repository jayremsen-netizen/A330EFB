from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent
WORK=ROOT.parent
BOOK=[]
TITLE='A330电子飞行包系统技术方案与操作说明书'
def C(number,title,part):
    c=dict(number=number,title=title,part=part,sections=[]);BOOK.append(c);return c
def S(c,title,*pages,refs=(),scope=''):
    s=dict(title=title,pages=list(pages),refs=list(refs),scope=scope);c['sections'].append(s);return s
def P(title,text='',**kw):
    return dict(title=title,paragraphs=[p.strip() for p in text.strip().split('\n\n') if p.strip()],**kw)
def T(headers,rows,caption=''):
    return dict(headers=headers.split('|'),rows=[r.split('|') for r in rows.strip().split('\n')],caption=caption)
def D(kind,title,items,links=None,**kw):
    return dict(kind=kind,title=title,items=items,links=links or [],**kw)
def IMG(name,caption,crop=None):
    d=D('screen',caption,name)
    if crop:d['crop']=crop
    return d

SOURCES={
'HW':('Headwind A339X 固定源码','https://github.com/headwindsim/aircraft/tree/41eace79ed442696a6361dc72947954c9a6cf5cb'),
'FBW':('FlyByWire 共享组件固定源码','https://github.com/flybywiresim/aircraft/tree/1bf4b8edccf84d0fb83d0eb15e42f2c773e09582'),
'WEB':('Headwind A339X 官方介绍','https://headwindsim.net/a339x.html'),
'PAD':('FlyByWire flyPadOS 3 总览','https://docs.flybywiresim.com/aircraft/common/flypados3/'),
'DIS':('FlyByWire Dispatch 文档','https://docs.flybywiresim.com/aircraft/common/flypados3/dispatch/'),
'GND':('FlyByWire Ground 文档','https://docs.flybywiresim.com/aircraft/common/flypados3/ground/'),
'PERF':('FlyByWire Performance 文档','https://docs.flybywiresim.com/aircraft/common/flypados3/performance/'),
'CHART':('FlyByWire Navigation & Charts 文档','https://docs.flybywiresim.com/aircraft/common/flypados3/charts/'),
'CHK':('FlyByWire Checklists 文档','https://docs.flybywiresim.com/aircraft/common/flypados3/checklists/'),
'FAIL':('FlyByWire Failures 文档','https://docs.flybywiresim.com/aircraft/common/flypados3/failures/'),
'SET':('FlyByWire Settings 文档','https://docs.flybywiresim.com/aircraft/common/flypados3/settings/'),
'SIM':('Microsoft SimVar JavaScript API','https://docs.flightsimulator.com/msfs2024/retail/programming-apis/javascript/simvar.js/'),
'NAV':('Navigraph 开发者接口文档','https://developers.navigraph.com/docs/request-access'),
'AUTH':('Navigraph 身份认证文档','https://developers.navigraph.com/docs/authentication/overview'),
'L-F':('本地航班及计算领域模型','headwind/local-extensions/flight.ts'),
'L-S':('本地状态、原生映射与报告','headwind/local-extensions/state.ts'),
'L-U':('本地业务页面实现','headwind/local-extensions/LocalPages.tsx'),
'L-D':('A339 参考资料包','headwind/local-extensions/data/a339-reference.json'),
'L-H':('浏览器宿主及静态服务','headwind/local-efb/'),
'L-B':('源码叠加及本地集成','setup_overlay.py；integrate_extensions.py；Build-EFB.ps1'),
'L-T':('本地运行检查记录','manual/evidence/；manual/assets/screens/'),
'EFB':('EfbWrapper、Efb 与共享 Store','headwind/build-common/src/systems/instruments/src/EFB/'),
'LAND':('A330941LandingCalculator','headwind/hdw-a339x/src/systems/shared/src/performance/a339x_landing.ts'),
'SPD':('A339 NXSpeeds 源码速度表','headwind/hdw-a339x/src/systems/instruments/src/MCDU/legacy/NXSpeeds.ts'),
'LIC':('Headwind README、GPL 与资源许可','https://github.com/headwindsim/aircraft/blob/41eace79ed442696a6361dc72947954c9a6cf5cb/README.md'),
}
