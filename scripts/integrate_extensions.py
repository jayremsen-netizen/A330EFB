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

# Do not overlay engineering CG points onto an unrelated upstream envelope.
payload='build-common/src/systems/instruments/src/EFB/Ground/Pages/Payload/WideBody/A339Payload.tsx'
p=R/payload;p.write_text("import { GroundBalanceSummary } from '@localefb/GroundBalanceSummary';\n"+p.read_text('utf-8'),'utf-8')
patch(payload,'            <ChartWidget\n', '            {process.env.VITE_BUILD ? <GroundBalanceSummary /> : <ChartWidget\n')
patch(payload,'              zfw={boardingStarted ? Math.round(zfw) : Math.round(zfwDesired)}\n            />', '              zfw={boardingStarted ? Math.round(zfw) : Math.round(zfwDesired)}\n            />}')
elements='build-common/src/systems/instruments/src/EFB/Ground/Pages/Payload/PayloadElements.tsx'
p=R/elements;p.write_text("import { LocalCGValue } from '@localefb/GroundBalanceSummary';\n"+p.read_text('utf-8'),'utf-8')
for planned,old in [(True,'<PayloadPercentUnitDisplay value={displayZfw ? desiredZfwCgMac : desiredGwCgMac} />'),(False,'<PayloadPercentUnitDisplay value={displayZfw ? zfwCgMac : gwCgMac} />')]:
    patch(elements,old,'{process.env.VITE_BUILD ? <LocalCGValue '+('planned ' if planned else '')+'zeroFuel={displayZfw} /> : '+old+'}')

patch(elements, "              displayZfw\n                ? `${t('Ground.Payload.TT.MaxZFWCG')}", "              process.env.VITE_BUILD ? '工程站位及重心包线请在配载重心页复核，未采用上游认证限制。' : displayZfw\n                ? `${t('Ground.Payload.TT.MaxZFWCG')}")

# Engineering planning pages are independent extensions; upstream remains a pinned reference.
for area in ['Performance','Dispatch','Ground']:
    rel=f'build-common/src/systems/instruments/src/EFB/{area}/{area}.tsx'
    p=R/rel
    p.write_text("import { PlanningPage } from '@localefb/PlanningPages';\n"+p.read_text('utf-8'),'utf-8')
patch('build-common/src/systems/instruments/src/EFB/Performance/Performance.tsx',
      '  const tabs: PageLink[] = [',
      "  const tabs: PageLink[] = [\n    { name: 'Engineering Landing', alias: '工程着陆', component: <PlanningPage view=\"landing\" /> },")
patch('build-common/src/systems/instruments/src/EFB/Dispatch/Dispatch.tsx',
      '  const tabs: PageLink[] = [',
      "  const tabs: PageLink[] = [\n    { name: 'Engineering Plan', alias: '综合工程计划', component: <PlanningPage /> },\n    { name: 'Fuel Plan', alias: '航路燃油', component: <PlanningPage view=\"fuel\" /> },")
patch('build-common/src/systems/instruments/src/EFB/Ground/Ground.tsx',
      '  const tabs: PageLink[] = [',
      "  const tabs: PageLink[] = [\n    { name: 'Loading Balance', alias: '配载重心', component: <PlanningPage view=\"loading\" /> },")

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

# Invalidate landing output at the state boundary, including async OFP/weather updates.
# This covers every input writer instead of relying on individual field handlers.
patch('build-common/src/systems/instruments/src/EFB/Store/features/performance.ts',
      '    setLandingValues: (state, action: PayloadAction<Partial<TPerformanceLanding>>) => {',
      '''    setLandingValues: (state, action: PayloadAction<Partial<TPerformanceLanding>>) => {
      if (process.env.VITE_BUILD) {
        const inputs = ['icao','availableRunways','selectedRunwayIndex','runwayHeading','runwayLength','elevation','slope','windDirection','windMagnitude','windEntry','temperature','pressure','weight','overweightProcedure','approachSpeed','flaps','runwayCondition','reverseThrust','autoland'];
        if (inputs.some(key => Object.prototype.hasOwnProperty.call(action.payload,key) && !Object.is(state.landing[key],action.payload[key]))) {
          state.landing.maxAutobrakeLandingDist = 0;
          state.landing.mediumAutobrakeLandingDist = 0;
          state.landing.lowAutobrakeLandingDist = 0;
          state.landing.runwayVisualizationLabels = [];
          state.landing.displayedRunwayLength = 0;
        }
      }''')
patch(landing,'    if (!areInputsValid()) return;',
      '    if (!areInputsValid()) { clearResult(); return; }')
patch(landing,"  const [weightUnit, setWeightUnit] = usePersistentProperty('EFB_PREFERRED_WEIGHT_UNIT', usingMetric ? 'kg' : 'lb');",
      '''  const [weightUnit, setWeightUnit] = usePersistentProperty('EFB_PREFERRED_WEIGHT_UNIT', usingMetric ? 'kg' : 'lb');
  useEffect(() => { clearResult(); }, [temperatureUnit, pressureUnit, distanceUnit, weightUnit]);''')
patch(landing,'  const syncValuesWithApiMetar = async (icao: string): Promise<void> => {',
      '  const syncValuesWithApiMetar = async (icao: string): Promise<void> => {\n    clearResult();')
patch(landing,'  const syncValuesWithOfp = async () => {',
      '  const syncValuesWithOfp = async () => {\n    clearResult();')

# A separate local command unloads the current cabin without changing the confirmed plan.
payload='build-common/src/systems/instruments/src/EFB/Ground/Pages/Payload/WideBody/A339Payload.tsx'
patch(payload,'          onConfirm={() => {\n            setTargetPax(0);',
      '''          onConfirm={() => {
            if (process.env.VITE_BUILD) {
              try { (window as any).__LOCAL_RUNTIME__.command('deboard'); }
              catch (e) { window.dispatchEvent(new CustomEvent('local-runtime-error', {detail: (e as Error).message})); }
              return;
            }
            setTargetPax(0);''')
payload_controls='build-common/src/systems/instruments/src/EFB/Ground/Pages/Payload/PayloadElements.tsx'
patch(payload_controls,'        onClick={() => setBoardingStarted(!boardingStarted)}',
      '''        aria-label={process.env.VITE_BUILD ? (boardingStarted ? '停止当前登机或下客' : '按计划登机') : undefined}
        onClick={() => setBoardingStarted(!boardingStarted)}''')
patch(payload_controls,'        onClick={() => handleDeboarding()}',
      '''        aria-label={process.env.VITE_BUILD ? '下客并卸载' : undefined}
        onClick={() => handleDeboarding()}''')
patch(payload,'  const remainingTimeString = () => {',
      "  const remainingTimeString = () => {\n    if (process.env.VITE_BUILD) return '本地演示约 3 秒，实际进度见上方回执';")

# Browser capability routes keep unsupported integrations out of the operating UI.
for rel,component,local in [
 ('Settings/Settings.tsx','Settings','LocalSettingsPage'),
 ('ATC/ATC.tsx','ATC','UnavailableCapability'),
]:
    rel='build-common/src/systems/instruments/src/EFB/'+rel
    p=R/rel;s=p.read_text('utf-8')
    s=f"import {{ {local} }} from '@localefb/CapabilityPages';\n"+s
    anchor=f'export const {component} = () => {{'
    kind=' kind="atc"' if component=='ATC' else ' kind="charts"' if component=='NavigraphPage' else ''
    if s.count(anchor)!=1:raise RuntimeError('Missing capability route '+component)
    p.write_text(s.replace(anchor,anchor+f'\n  if (process.env.VITE_BUILD) return <{local}{kind} />;'),'utf-8')
navigraph='build-common/src/systems/instruments/src/EFB/Navigation/Pages/NavigraphPage/NavigraphPage.tsx'
patch(navigraph,"import React from 'react';","import React from 'react';\nimport { UnavailableCapability } from '@localefb/CapabilityPages';")
patch(navigraph,'export const NavigraphPage = () => (',
      'export const NavigraphPage = () => process.env.VITE_BUILD ? <UnavailableCapability kind="charts" /> : (')
patch(navigation,"    navigationTabs[0].alias = t('NavigationAndCharts.Navigraph.Title');",
      "    navigationTabs[0].alias = process.env.VITE_BUILD ? '外部航图（未接入）' : t('NavigationAndCharts.Navigraph.Title');")
dashboard='build-common/src/systems/instruments/src/EFB/Dashboard/Dashboard.tsx'
patch(dashboard,"import React from 'react';","import React from 'react';\nimport { LocalCapabilityLink } from '@localefb/CapabilityPages';")
patch(dashboard,'export const Dashboard = () => (\n  <div className="flex w-full space-x-8">',
      'export const Dashboard = () => (\n  <div>{process.env.VITE_BUILD && <LocalCapabilityLink />}<div className="flex w-full space-x-8">')
patch(dashboard,'    <RemindersWidget />\n  </div>','    <RemindersWidget />\n  </div></div>')

# The global quick panel must not offer simulator actions or a SimBridge switch.
quick='build-common/src/systems/instruments/src/EFB/StatusBar/QuickControls.tsx'
patch(quick,'  return (\n    <>\n      <div\n        className="absolute left-0 top-0 z-30 h-screen w-screen bg-theme-body opacity-70"',
      '''  if (process.env.VITE_BUILD) return <>
    <div className="absolute left-0 top-0 z-30 h-screen w-screen bg-theme-body opacity-70" onMouseDown={() => setShowQuickControlsPane(false)} />
    <div className="absolute z-40 rounded-md border border-theme-secondary bg-theme-accent p-6" style={{top:'40px',right:'50px',width:'520px'}} data-testid="local-quick-controls">
      <h2>本地快捷操作</h2><p className="my-3">未连接飞行模拟器。主题、语言与键盘可在本地设置调整。</p>
      <div className="flex flex-wrap gap-4"><button onClick={() => { setShowQuickControlsPane(false); history.push('/settings'); }}>功能与设置</button><button onClick={handleSleep}>休眠 EFB</button><button onClick={handlePower}>关闭 EFB</button><button onClick={() => setShowQuickControlsPane(false)}>关闭面板</button></div>
    </div></>;
  return (
    <>
      <div
        className="absolute left-0 top-0 z-30 h-screen w-screen bg-theme-body opacity-70"''')
statusbar='build-common/src/systems/instruments/src/EFB/StatusBar/StatusBar.tsx'
patch(statusbar,"import { QuickControls } from './QuickControls';", "import { QuickControls } from './QuickControls';\nimport { ScenarioStatus } from '@localefb/ScenarioStatus';")
patch(statusbar,'<p>{`${dayName} ${monthName} ${dayOfMonth}`}</p>','<p>{`${dayName} ${monthName} ${dayOfMonth}`}<ScenarioStatus /></p>')
patch(statusbar,"text={simBridgeConnected ? t('StatusBar.TT.ConnectedToLocalApi') : t('StatusBar.TT.DisconnectedFromLocalApi')}",
      "text={process.env.VITE_BUILD ? '本地演示 · 外部服务未接入' : simBridgeConnected ? t('StatusBar.TT.ConnectedToLocalApi') : t('StatusBar.TT.DisconnectedFromLocalApi')}")
patch(statusbar,'{!!showStatusBarFlightProgress && data !== initialState.data && (',
      "{!!showStatusBarFlightProgress && data !== initialState.data && (!process.env.VITE_BUILD || (Number.isFinite(Number.parseInt(schedOut,10)) && Number.isFinite(Number.parseInt(schedIn,10)))) && (")
