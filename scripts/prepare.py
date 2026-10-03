"""Build temporary source overlays from read-only upstream Git references."""
from pathlib import Path
import shutil,json,re,runpy,sys
from upstreams import ROOT,LOCK,setup

def reset_generated(relative):
    allowed={'build-common','build-a339x','local-efb/public'}
    if relative not in allowed:raise RuntimeError('Unexpected generated directory')
    target=ROOT/relative
    if target.is_symlink() or target.resolve()!=ROOT.resolve()/relative:raise RuntimeError('Generated directory escaped project root')
    if target.exists():shutil.rmtree(target)
    target.mkdir(parents=True)

def merge(source,destination):
    if not source.is_dir():raise RuntimeError(f'Missing upstream source: {source}')
    shutil.copytree(source,destination,dirs_exist_ok=True)

def replace_once(path,old,new):
    value=path.read_text('utf-8')
    if value.count(old)!=1:raise RuntimeError(f'Pinned-source patch does not match: {path.name}')
    path.write_text(value.replace(old,new),'utf-8')

def prepare():
    setup()
    for name in ['build-common','build-a339x','local-efb/public']:reset_generated(name)
    h=ROOT/'upstream/headwind';f=ROOT/'upstream/flybywire';p=ROOT/'local-efb/public'
    for source in [f/'fbw-common',h/'hdw-common',h/'hdw-a339x-common']:merge(source,ROOT/'build-common')
    for name in ['systems','localization']:
        merge(f/'fbw-a32nx/src'/name,ROOT/'build-a339x/src'/name)
        merge(h/'hdw-a339x/src'/name,ROOT/'build-a339x/src'/name)
    merge(h/'hdw-a339x/src/base/headwindsim-aircraft-a330-900/config',p/'VFS/config')
    fonts=f/'fbw-a32nx/src/base/flybywire-aircraft-a320-neo/html_ui/Fonts/fbw-a32nx'
    if fonts.exists():merge(fonts,p/'Fonts/A339X')
    merge(f/'fbw-a32nx/src/fonts',p/'Fonts/A339X')
    languages=ROOT/'build-common/src/systems/instruments/src/EFB/Localization/data'
    for source in (languages/'Headwind').glob('*.json'):
        old=json.loads((languages/source.name).read_text('utf-8')) if (languages/source.name).exists() else {}
        old.update(json.loads(source.read_text('utf-8')))
        (languages/source.name).write_text(json.dumps(old,ensure_ascii=False),'utf-8')
    (p/'Data').mkdir();(p/'Data/a339x_hashes.json').write_text('{}','utf-8')
    info={'built':'2026-10-04','ref':'A330EFB','sha':LOCK['repositories'][0]['commit'],'actor':'A330EFB local build','version':'A330EFB 1.0.0','pretty_release_name':'A330EFB browser demonstration','event_name':'local-browser-build'}
    for name in ['a339x_build_info.json','a339x_build_info','VFS/a339x_build_info.json']:(p/name).write_text(json.dumps(info),'utf-8')
    replace_once(ROOT/'build-common/src/systems/shared/src/failures/index.ts','export { FailuresOrchestrator, FailureDefinition }','export { FailuresOrchestrator, type FailureDefinition }')
    replace_once(ROOT/'build-common/src/systems/shared/src/checklists/ChecklistProvider.ts','      response\n        .text()','      return response\n        .text()')
    efb=ROOT/'build-common/src/systems/instruments/src/EFB/Efb.tsx'
    replace_once(efb,'  const history = useHistory();','  const history = useHistory();\n  if (process.env.VITE_BUILD) (window as any).__EFB_NAVIGATE = (route: string) => history.push(route);')
    replace_once(efb,'  const [powerState, setPowerState] = useState<PowerStates>(PowerStates.SHUTOFF);','''  const [powerState, setPowerState] = useState<PowerStates>(PowerStates.SHUTOFF);
  useEffect(() => {
    if (!process.env.VITE_BUILD) return;
    setPowerState(PowerStates.LOADING);
    const startup = window.setTimeout(() => setPowerState(PowerStates.LOADED), 2500);
    return () => window.clearTimeout(startup);
  }, []);''')
    replace_once(efb,'      return <div className="h-screen w-screen" onClick={offToLoaded} />;','''      if (process.env.VITE_BUILD) {
        return <div className="local-wake-screen h-screen w-screen">
          <h1>Headwind A330 EFB</h1>
          <p>{powerState === PowerStates.STANDBY ? '平板已休眠' : '平板已关机'}</p>
          <button type="button" onClick={offToLoaded}>
            {powerState === PowerStates.STANDBY ? '唤醒 EFB' : '开启 EFB'}
          </button>
        </div>;
      }
      return <div className="h-screen w-screen" onClick={offToLoaded} />;''')
    runpy.run_path(str(ROOT/'scripts/integrate_extensions.py'))
    profile=json.loads((ROOT/'config/a339-reference-profile.json').read_text('utf-8'))
    source=h/'hdw-a339x/src/systems/instruments/src/MCDU/legacy/NXSpeeds.ts'
    table=source.read_text('utf-8').split('const vs =')[0]
    values=[int(v) for v in re.findall(r'\(\) => (\d+)',table)]
    if len(values)!=39:raise RuntimeError('Pinned V2 source table has an unexpected shape')
    profile['v2']={str(i+1):values[i*13:(i+1)*13] for i in range(3)}
    data=ROOT/'local-extensions/data';data.mkdir(exist_ok=True)
    (data/'a339-reference.json').write_text(json.dumps(profile,ensure_ascii=False,indent=2),'utf-8')
    print('Prepared generated overlays and reference data. Upstream checkouts remain unchanged.',flush=True)

if __name__=='__main__':prepare()
