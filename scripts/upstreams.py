"""Fetch pinned Git submodule references using sparse checkouts (no aircraft models)."""
from pathlib import Path
import json,subprocess,sys

ROOT=Path(__file__).resolve().parent.parent
LOCK=json.loads((ROOT/'config/upstreams.json').read_text('utf-8'))

def git(*args,cwd=ROOT,capture=False,check=True):
    return subprocess.run(['git','-c','core.longpaths=true',*args],cwd=cwd,check=check,text=True,encoding='utf-8',stdout=subprocess.PIPE if capture else None,stderr=subprocess.PIPE if capture else None)

def setup():
    for item in LOCK['repositories']:
        target=ROOT/item['path']
        if target.resolve().parent!=(ROOT/'upstream').resolve():raise RuntimeError('Invalid upstream destination')
        if not (target/'.git').exists():
            if target.exists() and any(target.iterdir()):raise RuntimeError(f'{target} is not an empty Git dependency directory')
            target.mkdir(parents=True,exist_ok=True)
            git('init',str(target))
            git('remote','add','origin',item['url'],cwd=target)
        remote=git('remote','get-url','origin',cwd=target,capture=True).stdout.strip()
        if remote.removesuffix('.git')!=item['url'].removesuffix('.git'):raise RuntimeError(f'Unexpected upstream remote: {target}')
        if git('status','--porcelain','--untracked-files=no',cwd=target,capture=True).stdout.strip():
            raise RuntimeError(f'Upstream has local changes; preserve them before updating: {target}')
        git('config','remote.origin.promisor','true',cwd=target)
        git('config','remote.origin.partialclonefilter','blob:none',cwd=target)
        git('sparse-checkout','init','--cone',cwd=target)
        git('sparse-checkout','set',*item['sparsePaths'],cwd=target)
        head=git('rev-parse','--verify','HEAD',cwd=target,capture=True,check=False)
        if head.returncode or head.stdout.strip()!=item['commit']:
            print(f"Fetching {item['name']} @ {item['commit']}",flush=True)
            git('fetch','--depth=1','--filter=blob:none','origin',item['commit'],cwd=target)
        git('checkout','--detach',item['commit'],cwd=target)
        actual=git('rev-parse','HEAD',cwd=target,capture=True).stdout.strip()
        if actual!=item['commit']:raise RuntimeError(f'Commit mismatch: {target}')
        print(f"Verified {item['name']}: {actual}",flush=True)
    nested=git('ls-tree','HEAD','flybywire',cwd=ROOT/'upstream/headwind',capture=True).stdout
    if LOCK['repositories'][1]['commit'] not in nested:raise RuntimeError('FlyByWire pin does not match the Headwind submodule reference')

if __name__=='__main__':
    try:setup()
    except (RuntimeError,subprocess.CalledProcessError) as exc:print(str(exc),file=sys.stderr);sys.exit(1)
