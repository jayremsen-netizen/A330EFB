from pathlib import Path
import json
R=Path(__file__).resolve().parent.parent
def patch(rel,old,new):
    p=R/rel;s=p.read_text('utf-8')
    if s.count(old)!=1:raise RuntimeError('Patch anchor mismatch: '+rel+' '+old[:50])
    p.write_text(s.replace(old,new),'utf-8')
patch('build-common/src/systems/instruments/src/EFB/Performance/Performance.tsx',"import React, { useContext } from 'react';","import React, { useContext } from 'react';\nimport { LocalTakeoffPage } from '@localefb/LocalPages';")
patch('build-common/src/systems/instruments/src/EFB/Performance/Performance.tsx','  const tabs: PageLink[] = [',"  const tabs: PageLink[] = [\n    { name: 'Local Takeoff', alias: '离线起飞核算', component: <LocalTakeoffPage /> },")
patch('build-common/src/systems/instruments/src/EFB/Dispatch/Dispatch.tsx',"import React from 'react';","import React from 'react';\nimport { LocalFlightPage } from '@localefb/LocalPages';")
patch('build-common/src/systems/instruments/src/EFB/Dispatch/Dispatch.tsx','  const tabs: PageLink[] = [',"  const tabs: PageLink[] = [\n    { name: 'Local Flight', alias: '本地航班', component: <LocalFlightPage /> },")
patch('build-common/src/systems/instruments/src/EFB/Ground/Ground.tsx',"import React from 'react';","import React from 'react';\nimport { LocalGroundLink } from '@localefb/LocalPages';")
patch('build-common/src/systems/instruments/src/EFB/Ground/Ground.tsx','      <PageRedirect basePath="/ground"', '      <LocalGroundLink />\n      <PageRedirect basePath="/ground"')
patch('build-common/src/systems/instruments/src/EFB/Ground/Ground.tsx','<div className="transform-gpu">','<div className="transform-gpu lf-ground-page">')
patch('build-common/src/systems/instruments/src/EFB/Dashboard/Widgets/FlightWidget.tsx','  const fetchData = async () => {',"  const fetchData = async () => {\n    if (process.env.VITE_BUILD) { history.push('/dispatch/local-flight'); return; }")
# A first visit materializes the already-confirmed plan into native station/tank
# targets. Only this synchronous auto-fill is a plan sync, not a user change.
patch('build-common/src/systems/instruments/src/EFB/Ground/Pages/Payload/WideBody/A339Payload.tsx',
      '      setSimBriefValues();\n      dispatch(setPayloadImported(true));',
      '      if (process.env.VITE_BUILD) (window as any).__LOCAL_EFB__.syncPlan(() => setSimBriefValues());\n      else setSimBriefValues();\n      dispatch(setPayloadImported(true));')
patch('build-common/src/systems/instruments/src/EFB/Ground/Pages/Fuel/A330_941/A330Fuel.tsx',
      '      handleFuelAutoFill();\n      dispatch(setFuelImported(true));',
      '      if (process.env.VITE_BUILD) (window as any).__LOCAL_EFB__.syncPlan(() => handleFuelAutoFill());\n      else handleFuelAutoFill();\n      dispatch(setFuelImported(true));')
L=R/'build-common/src/systems/instruments/src/EFB/Localization/data'
for lang in ['zh-CN','zh-Hans-CN','en']:
    lp=L/(lang+'.json')
    if not lp.exists():continue
    d=json.loads(lp.read_text('utf-8'))
    try:
        d['Dashboard']['YourFlight']['ImportSimBriefData']='编辑本地航班' if lang!='en' else 'Edit local flight'
        d['Dashboard']['YourFlight']['SimBriefDataNotYetLoaded']='尚未确认本地航班' if lang!='en' else 'No local flight confirmed'
        d['Ground']['Fuel']['TT']['FillBlockFuelFromSimBrief']='使用本地计划燃油'
        d['Ground']['Payload']['TT']['FillPayloadFromSimbrief']='使用本地计划载荷'
    except KeyError:pass
    lp.write_text(json.dumps(d,ensure_ascii=False),'utf-8')
print('Local flight and offline reference calculation integrated into native EFB routes.')
