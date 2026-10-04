from pathlib import Path
import json
R=Path(__file__).resolve().parent.parent
def patch(rel,old,new):
    p=R/rel;s=p.read_text('utf-8')
    if s.count(old)!=1:raise RuntimeError('Patch anchor mismatch: '+rel+' '+old[:50])
    p.write_text(s.replace(old,new),'utf-8')
patch('build-common/src/systems/instruments/src/EFB/Performance/Performance.tsx',"import React, { useContext } from 'react';","import React, { useContext } from 'react';\nimport { LocalTakeoffPage } from '@localefb/LocalPages';")
patch('build-common/src/systems/instruments/src/EFB/Performance/Performance.tsx','  const tabs: PageLink[] = [',"  const tabs: PageLink[] = [\n    { name: 'Engineering Takeoff', alias: '工程起飞', component: <LocalTakeoffPage engineering /> },\n    { name: 'Local Takeoff', alias: '离线起飞核算（参考）', component: <LocalTakeoffPage /> },")
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

# Keep the upstream landing coefficients unchanged; enforce the documented local scope.
landing='build-common/src/systems/instruments/src/EFB/Performance/Widgets/LandingWidget.tsx'
patch(landing,"import { getAirportMagVar, getRunways } from '../Data/Runways';",
      "import { getAirportMagVar, getRunways } from '../Data/Runways';\nimport { landingInputIssue, landingOutputIssue, LANDING_SCOPE } from '@localefb/performance-guards';")
patch(landing,'    if (!areInputsValid()) return;',
      '''    if (!areInputsValid()) return;
    const issue = landingInputIssue({weight,approachSpeed,windDirection,windMagnitude,runwayHeading,elevation,temperature,slope,pressure,runwayLength,flaps,runwayCondition});
    if (issue) { clearResult(); toast.error(issue); return; }''')
patch(landing,'    dispatch(\n      setLandingValues({\n        maxAutobrakeLandingDist: Math.round(landingDistances.maxAutobrakeDist),',
      '''    const outputIssue = landingOutputIssue(landingDistances);
    if (outputIssue) { clearResult(); toast.error(outputIssue); return; }
    dispatch(
      setLandingValues({
        maxAutobrakeLandingDist: Math.round(landingDistances.maxAutobrakeDist),''')
patch(landing,"                <Label text={t('Performance.Landing.LandingWeight')}>",
      "                <p className=\"text-sm text-theme-highlight\">{LANDING_SCOPE}</p>\n                <Label text={t('Performance.Landing.LandingWeight')}>")

patch('build-common/src/systems/instruments/src/EFB/Dispatch/Dispatch.tsx',
      "import { LocalFlightPage } from '@localefb/LocalPages';",
      "import { LocalFlightPage } from '@localefb/LocalPages';\nimport { LocalWeatherPage } from '@localefb/Resources';")
patch('build-common/src/systems/instruments/src/EFB/Dispatch/Dispatch.tsx',
      "    { name: 'Local Flight', alias: '本地航班', component: <LocalFlightPage /> },",
      "    { name: 'Local Flight', alias: '本地航班', component: <LocalFlightPage /> },\n    { name: 'Local Weather', alias: '天气资料', component: <LocalWeatherPage /> },")
localfiles='build-common/src/systems/instruments/src/EFB/Navigation/Pages/LocalFilesPage/LocalFilesPage.tsx'
patch(localfiles,"import { LocalFileChartUI } from './LocalFileChartUI';",
      "import { LocalFileChartUI } from './LocalFileChartUI';\nimport { LocalChartsPage } from '@localefb/Resources';")
patch(localfiles,'export const LocalFilesPage = () => {',
      'export const LocalFilesPage = () => {\n  if (process.env.VITE_BUILD) return <LocalChartsPage />;')
navigation='build-common/src/systems/instruments/src/EFB/Navigation/Navigation.tsx'
patch(navigation,"import { navigraphCharts } from '../../navigraph';",
      "import { navigraphCharts } from '../../navigraph';\nimport { Redirect, Route } from 'react-router-dom';")
patch(navigation,'        <PageRedirect basePath="/navigation" tabs={navigationTabs} />',
      '        <Route exact path="/navigation"><Redirect to="/navigation/local-files" /></Route>')
patch(navigation,"import { Redirect, Route } from 'react-router-dom';",
      "import { Redirect, Route } from 'react-router-dom';\nimport { LocalChartsPage } from '@localefb/Resources';")
patch(navigation,'component: <PinnedChartUI />','component: process.env.VITE_BUILD ? <LocalChartsPage pinnedOnly /> : <PinnedChartUI />')

ground='build-common/src/systems/instruments/src/EFB/Ground/Ground.tsx'
patch(ground,"import { LocalGroundLink } from '@localefb/LocalPages';",
      "import { LocalGroundLink } from '@localefb/LocalPages';\nimport { LocalSimulationPage } from '@localefb/SimulationPages';")
patch(ground,'component: <ServicesPage />','component: process.env.VITE_BUILD ? <LocalSimulationPage /> : <ServicesPage />')
patch(ground,'component: <PushbackPage />','component: process.env.VITE_BUILD ? <LocalSimulationPage pushback /> : <PushbackPage />')
for component,local in [('Failures','LocalFaultPage'),('Presets','LocalPresetPage')]:
    rel=f'build-common/src/systems/instruments/src/EFB/{component}/{component}.tsx'
    p=R/rel;s=p.read_text('utf-8')
    s=f"import {{ {local} }} from '@localefb/SimulationPages';\n"+s
    anchor=f'export const {component} = () => {{'
    if s.count(anchor)!=1:raise RuntimeError('Missing browser route '+component)
    p.write_text(s.replace(anchor,anchor+f'\n  if (process.env.VITE_BUILD) return <{local} />;'),'utf-8')

# A cleared or rejected landing result must not appear as a zero-metre distance.
for name in ['maxAutobrakeLandingDist','mediumAutobrakeLandingDist','lowAutobrakeLandingDist']:
    p=R/landing;s=p.read_text('utf-8')
    anchor="value={\n                distanceUnit === 'ft'"
    replacement=f"value={{\n                {name} <= 0 ? '—' : distanceUnit === 'ft'"
    if anchor not in s:raise RuntimeError('Missing landing output guard')
    p.write_text(s.replace(anchor,replacement,1),'utf-8')

# Remount the native SVG labels when a result is invalidated; no previous distance remains.
patch(landing,'        <RunwayVisualizationWidget\n',
      '        <RunwayVisualizationWidget\n          key={runwayVisualizationLabels.length ? runwayVisualizationLabels.map(x => x.distance).join(\"-\") : \"empty\"}\n')
patch(landing,'<div className="mt-14 flex flex-row space-x-8">','<div className="mt-4 flex flex-row space-x-8">')
patch(landing,'<div className="flex w-full flex-row divide-x-2 divide-theme-accent overflow-hidden rounded-lg border-2 border-theme-accent">',
      '<div className="flex w-full shrink-0 flex-row divide-x-2 divide-theme-accent overflow-hidden rounded-lg border-2 border-theme-accent">')

fuelpage='build-common/src/systems/instruments/src/EFB/Ground/Pages/Fuel/A330_941/A330Fuel.tsx'
p=R/fuelpage;p.write_text("import { distributeFuel, FUEL_KG_PER_GALLON } from '@localefb/fuel';\n"+p.read_text('utf-8'),'utf-8')
patch(fuelpage,'  const setDesiredFuel = (fuel: number) => {', '''  const setDesiredFuel = (fuel: number) => {
    if (process.env.VITE_BUILD) {
      const allocation = distributeFuel(fuel * FUEL_KG_PER_GALLON);
      setLInnTarget(allocation.inner); setRInnTarget(allocation.inner);
      setLOutTarget(allocation.outer); setROutTarget(allocation.outer);
      setCenterTarget(allocation.center);
      return;
    }''')
