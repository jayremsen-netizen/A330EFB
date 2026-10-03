import './simulator-shim';
function resize(){
  const banner=document.getElementById('dev-banner')!;
  const scale=Math.max(0.05,Math.min(document.documentElement.clientWidth/1430,(innerHeight-banner.offsetHeight)/1000));
  document.documentElement.style.fontSize='16px';
  document.getElementById('MSFS_REACT_MOUNT')!.style.transform=`scale(${scale})`;
  const instrument=document.getElementById('instrument')!;
  instrument.style.width=`${1430*scale}px`;
  instrument.style.height=`${1000*scale}px`;
}
resize();window.addEventListener('resize',resize);
const button=document.createElement('button');button.textContent='载入演示航班';button.title='载入固定的本地虚构航班样例';button.style.cssText='float:right;pointer-events:auto;color:#f5a623;background:transparent;border:0;cursor:pointer';button.onclick=()=>(window as any).__LOAD_DEMO_FLIGHT__?.();document.getElementById('dev-banner')!.appendChild(button);
new ResizeObserver(resize).observe(document.getElementById('dev-banner')!);
import('../build-a339x/src/systems/instruments/src/EFB/index.tsx').then(async()=>{
  await import('./demo-flight');
  const local=await import('../local-extensions/state');local.initializeLocal();
  if(new URLSearchParams(location.search).get('demo-session')==='1') await import('./presentation/bridge');
  setTimeout(()=>{
    window.dispatchEvent(new Event('AceInitialized'));
    document.getElementById('boot-status')?.remove();
  },100);
}).catch(e=>{
  console.error(e);
  document.getElementById('boot-status')?.remove();
  const error=document.createElement('pre');error.id='boot-error';
  error.textContent='EFB 启动失败，请刷新页面。\n'+(e.stack||e.message||String(e));
  document.getElementById('MSFS_REACT_MOUNT')!.replaceChildren(error);
});
